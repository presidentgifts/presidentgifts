/**
 * Copies catalog and content from the old backend (api.presidentgift.com) into
 * the new database, through the same API the site uses. Safe to run again:
 * rows are matched by their old ids and updated.
 *
 *   npm run migrate:legacy                      # all countries in the database
 *   npm run migrate:legacy -- --countries UZ,TJ
 *   npm run migrate:legacy -- --skip-media      # don't download images
 *
 * Reads: LEGACY_API_URL (default: BASE_URL + "/api/v1"), BASIC_ADMIN / BASIC_PASSWORD,
 * LEGACY_MEDIA_URL (default: NEXT_PUBLIC_ADMIN_URL) for downloading files.
 *
 * Old ids are kept as the new ids of products, categories, collections and news,
 * so links like /detail/123 keep working.
 *
 * Customers and orders are not available through the site API; they need a
 * database export of the old backend.
 */
import "./env";
import {parseArgs} from "node:util";
import {and, eq, inArray, sql} from "drizzle-orm";
import {getDb, schema} from "../server/db/client";
import {EXTENSIONS, getStorageMode, storeFile} from "../server/storage/media-storage";
import {PAGE_REGISTRY} from "../lib/page-registry";

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const {values: args} = parseArgs({
    options: {
        countries: {type: "string"},
        "skip-media": {type: "boolean", default: false},
        pages: {type: "string"},
    },
});

const API = (process.env.LEGACY_API_URL ?? `${process.env.BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/v1`).replace(/\/$/, "");
const MEDIA_BASE = (process.env.LEGACY_MEDIA_URL ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? "").replace(/\/$/, "");
const USER = process.env.BASIC_ADMIN ?? process.env.NEXT_PUBLIC_BASIC_ADMIN;
const PASSWORD = process.env.BASIC_PASSWORD ?? process.env.NEXT_PUBLIC_BASIC_PASSWORD;
const SKIP_MEDIA = Boolean(args["skip-media"]);

const db = getDb();
const stats = {categories: 0, products: 0, collections: 0, news: 0, pageEntries: 0, media: 0, mediaFailed: 0};

/* ------------------------------------------------------------------ */
/* Old API                                                             */
/* ------------------------------------------------------------------ */

interface LegacyMedia {
    filePath?: string | null;
    originalFileName?: string | null;
    contentType?: string | null;
    metaData?: { order?: number | null; width?: number | null; height?: number | null } | null;
}

async function get<T>(path: string): Promise<T | null> {
    const headers: Record<string, string> = {"Content-Type": "application/json"};
    if (USER && PASSWORD) headers.Authorization = `Basic ${Buffer.from(`${USER}:${PASSWORD}`).toString("base64")}`;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(`${API}${path}`, {headers});
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const text = await res.text();
            return text ? (JSON.parse(text) as T) : null;
        } catch (error) {
            if (attempt === 3) {
                console.warn(`  ! ${path}: ${(error as Error).message}`);
                return null;
            }
            await new Promise((r) => setTimeout(r, 500 * attempt));
        }
    }
    return null;
}

/** "tj" on the site is "tg" in the database. */
const siteLocale = (dbCode: string) => (dbCode === "tg" ? "TJ" : dbCode.toUpperCase());

function asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    const v = value as { data?: unknown; content?: unknown } | null;
    if (Array.isArray(v?.data)) return v.data as T[];
    if (Array.isArray(v?.content)) return v.content as T[];
    return [];
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

const CONTENT_TYPES: Record<string, string> = Object.fromEntries(Object.entries(EXTENSIONS).map(([type, ext]) => [ext, type]));
CONTENT_TYPES.jpeg = "image/jpeg";

/** Downloads an old file into storage once per country; returns the media id. */
async function importMedia(countryCode: string, file: LegacyMedia | null | undefined): Promise<string | null> {
    const path = file?.filePath;
    if (!path || SKIP_MEDIA) return null;

    const [existing] = await db
        .select({id: schema.media.id})
        .from(schema.media)
        .where(and(eq(schema.media.countryCode, countryCode), eq(schema.media.legacyPath, path)));
    if (existing) return existing.id;

    try {
        const url = /^https?:\/\//.test(path) ? path : `${MEDIA_BASE}${path}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        const body = Buffer.from(await res.arrayBuffer());
        const ext = path.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
        const headerType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
        const contentType = EXTENSIONS[headerType] ? headerType : file?.contentType && EXTENSIONS[file.contentType] ? file.contentType : CONTENT_TYPES[ext];
        if (!contentType) throw new Error(`unknown type ${headerType || ext}`);

        const key = await storeFile(countryCode, contentType, body);
        const [row] = await db
            .insert(schema.media)
            .values({
                countryCode,
                key,
                contentType,
                size: body.length,
                width: file?.metaData?.width ?? null,
                height: file?.metaData?.height ?? null,
                originalName: file?.originalFileName?.slice(0, 255) ?? null,
                legacyPath: path.slice(0, 512),
            })
            .returning({id: schema.media.id});
        stats.media++;
        return row.id;
    } catch (error) {
        stats.mediaFailed++;
        console.warn(`  ! media ${path}: ${(error as Error).message}`);
        return null;
    }
}

async function importMediaList(countryCode: string, files: LegacyMedia[] | null | undefined) {
    const sorted = [...(files ?? [])].sort((a, b) => (a.metaData?.order ?? 0) - (b.metaData?.order ?? 0));
    const ids: string[] = [];
    for (const file of sorted) {
        const id = await importMedia(countryCode, file);
        if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

interface LegacyCategory {
    id: number;
    parentId?: number | null;
    name?: string;
    description?: string;
    children?: LegacyCategory[] | null;
    mediaFiles?: LegacyMedia[];
}

interface LegacyProduct {
    id: number;
    sku?: string;
    name?: string;
    description?: string;
    basePriceToUSD?: number | null;
    meta?: { ware_house_count?: number | null; _new_product?: boolean; _frontal_page?: boolean } | null;
    media?: LegacyMedia[];
}

/** Language whose texts the site shows when a translation is missing. */
let mainLanguage = "";

/**
 * The old API answers a missing translation with the main-language text. Such
 * copies aren't real translations: storing them would hide that the text still
 * needs translating, so they are dropped (the site falls back the same way).
 */
function dropFallbacks<T extends { languageCode: string }>(rows: T[], same: (a: T, b: T) => boolean): T[] {
    const main = rows.find((r) => r.languageCode === mainLanguage);
    if (!main) return rows;
    return rows.filter((r) => r === main || !same(r, main));
}

async function upsertTranslations<T extends Record<string, unknown>>(
    table: typeof schema.categoryTranslations | typeof schema.productTranslations | typeof schema.collectionTranslations | typeof schema.newsTranslations,
    idColumn: "categoryId" | "productId" | "collectionId" | "newsId",
    id: number,
    rows: T[],
) {
    rows = dropFallbacks(rows as (T & { languageCode: string })[], (a, b) =>
        JSON.stringify({...a, languageCode: ""}) === JSON.stringify({...b, languageCode: ""}));
    if (rows.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- one helper for four similar tables
    const t = table as any;
    await db.delete(t).where(eq(t[idColumn], id));
    await db.insert(t).values(rows.map((r) => ({...r, [idColumn]: id})));
}

async function importCategories(countryCode: string, languages: string[]) {
    // Category → its data per language, and parent links.
    const perLanguage = new Map<number, Map<string, LegacyCategory>>();
    const parents = new Map<number, number | null>();
    const depth = new Map<number, number>();

    async function walk(nodes: LegacyCategory[], lang: string, parentId: number | null, level: number) {
        for (const node of nodes) {
            if (!perLanguage.has(node.id)) perLanguage.set(node.id, new Map());
            perLanguage.get(node.id)!.set(lang, node);
            parents.set(node.id, parentId);
            depth.set(node.id, level);
            let children = node.children ?? null;
            if (!children) {
                const full = await get<LegacyCategory>(`/category/by_id_and_locale_with_media?categoryId=${node.id}&languageCode=${siteLocale(lang)}&countryCode=${countryCode}&withChildren=true`);
                children = full?.children ?? [];
            }
            await walk(children, lang, node.id, level + 1);
        }
    }

    for (const lang of languages) {
        const roots = asArray<LegacyCategory>(await get(`/category/root_by_locale_with_media?languageCode=${siteLocale(lang)}&countryCode=${countryCode}`));
        await walk(roots, lang, null, 0);
    }

    // Parents first, so the parent rows exist.
    const ids = [...perLanguage.keys()].sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0));
    for (const [index, id] of ids.entries()) {
        const versions = perLanguage.get(id)!;
        const any = [...versions.values()][0];
        const imageId = (await importMediaList(countryCode, any.mediaFiles))[0] ?? null;
        const parentId = parents.get(id) ?? null;
        await db
            .insert(schema.categories)
            .values({id, countryCode, parentId, status: "published", sortOrder: index, imageId, legacyId: id})
            .onConflictDoUpdate({target: schema.categories.id, set: {parentId, status: "published", sortOrder: index, imageId, legacyId: id}});
        await upsertTranslations(
            schema.categoryTranslations,
            "categoryId",
            id,
            [...versions.entries()]
                .filter(([, c]) => c.name)
                .map(([languageCode, c]) => ({languageCode, name: c.name!.slice(0, 160), description: c.description || null})),
        );
        stats.categories++;
    }
    return {ids, depth};
}

async function importProducts(countryCode: string, languages: string[], categoryIds: number[], depth: Map<number, number>) {
    const productCategory = new Map<number, number>();
    const found = new Set<number>();

    // Products by category, so each product gets its (deepest) category.
    for (const categoryId of categoryIds) {
        for (let page = 0; page < 1000; page++) {
            const rows = asArray<LegacyProduct>(await get(`/category/product_page_by_category_id_and_locale?categoryId=${categoryId}&languageCode=${siteLocale(languages[0])}&countryCode=${countryCode}&page=${page}&size=100`));
            for (const p of rows) {
                found.add(p.id);
                const current = productCategory.get(p.id);
                if (current === undefined || (depth.get(categoryId) ?? 0) > (depth.get(current) ?? 0)) productCategory.set(p.id, categoryId);
            }
            if (rows.length < 100) break;
        }
    }
    // Plus products not in any category.
    for (const p of asArray<LegacyProduct>(await get(`/product/by_locale?language=${siteLocale(languages[0])}&countryCode=${countryCode}`))) found.add(p.id);

    for (const id of [...found].sort((a, b) => a - b)) {
        const versions = new Map<string, LegacyProduct>();
        for (const lang of languages) {
            const p = await get<LegacyProduct>(`/product/by_id_and_locale?productId=${id}&language=${siteLocale(lang)}&countryCode=${countryCode}`);
            if (p) versions.set(lang, p);
        }
        const base = [...versions.values()][0];
        if (!base) continue;
        const values = {
            countryCode,
            categoryId: productCategory.get(id) ?? null,
            sku: (base.sku || `LEGACY-${id}`).slice(0, 64),
            priceUsd: base.basePriceToUSD != null ? Number(base.basePriceToUSD).toFixed(2) : null,
            stock: base.meta?.ware_house_count ?? null,
            isNew: Boolean(base.meta?._new_product),
            isFeatured: Boolean(base.meta?._frontal_page),
            status: "published" as const,
            publishedAt: new Date(),
            legacyId: id,
        };
        try {
            await db.insert(schema.products).values({id, ...values}).onConflictDoUpdate({target: schema.products.id, set: values});
        } catch (error) {
            // Duplicate SKU in the old data: keep the product, make the SKU unique.
            if ((error as { cause?: { code?: string } }).cause?.code !== "23505") throw error;
            const unique = {...values, sku: `${values.sku}-${id}`.slice(0, 64)};
            await db.insert(schema.products).values({id, ...unique}).onConflictDoUpdate({target: schema.products.id, set: unique});
        }
        await upsertTranslations(
            schema.productTranslations,
            "productId",
            id,
            [...versions.entries()]
                .filter(([, p]) => p.name)
                .map(([languageCode, p]) => ({languageCode, name: p.name!.slice(0, 200), description: p.description || null})),
        );
        const mediaIds = await importMediaList(countryCode, base.media);
        await db.delete(schema.productMedia).where(eq(schema.productMedia.productId, id));
        if (mediaIds.length) await db.insert(schema.productMedia).values(mediaIds.map((mediaId, sortOrder) => ({productId: id, mediaId, sortOrder})));
        stats.products++;
    }
}

interface LegacyCollection {
    id: number;
    name?: string;
    description?: string;
    mediaFiles?: LegacyMedia[];
    products?: { id: number }[];
}

async function importCollections(countryCode: string, languages: string[]) {
    const perLanguage = new Map<number, Map<string, LegacyCollection>>();
    for (const lang of languages) {
        for (const c of asArray<LegacyCollection>(await get(`/collections/by_locale_with_media_and_products?languageCode=${siteLocale(lang)}&country_code=${countryCode}`))) {
            if (!perLanguage.has(c.id)) perLanguage.set(c.id, new Map());
            perLanguage.get(c.id)!.set(lang, c);
        }
    }
    for (const [index, [id, versions]] of [...perLanguage.entries()].entries()) {
        const base = [...versions.values()][0];
        const imageId = (await importMediaList(countryCode, base.mediaFiles))[0] ?? null;
        await db
            .insert(schema.collections)
            .values({id, countryCode, status: "published", sortOrder: index, imageId, legacyId: id})
            .onConflictDoUpdate({target: schema.collections.id, set: {status: "published", sortOrder: index, imageId, legacyId: id}});
        await upsertTranslations(
            schema.collectionTranslations,
            "collectionId",
            id,
            [...versions.entries()]
                .filter(([, c]) => c.name)
                .map(([languageCode, c]) => ({languageCode, name: c.name!.slice(0, 160), description: c.description || null})),
        );
        const productIds = [...new Set((base.products ?? []).map((p) => p.id))];
        const existing = productIds.length
            ? await db.select({id: schema.products.id}).from(schema.products).where(and(eq(schema.products.countryCode, countryCode), inArray(schema.products.id, productIds)))
            : [];
        const known = new Set(existing.map((p) => p.id));
        await db.delete(schema.collectionProducts).where(eq(schema.collectionProducts.collectionId, id));
        const links = productIds.filter((p) => known.has(p)).map((productId, sortOrder) => ({collectionId: id, productId, sortOrder}));
        if (links.length) await db.insert(schema.collectionProducts).values(links);
        stats.collections++;
    }
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

interface LegacyNews {
    id: number;
    title?: string;
    description?: string;
    image?: LegacyMedia | null;
    image_page?: LegacyMedia | null;
    instagramLink?: string | null;
    showCount?: number | null;
    publishedAt?: string | null;
}

async function importNews(countryCode: string, languages: string[]) {
    const perLanguage = new Map<number, Map<string, LegacyNews>>();
    for (const lang of languages) {
        for (const n of asArray<LegacyNews>(await get(`/news/by_locale?languageCode=${siteLocale(lang)}&countryCode=${countryCode}&withMedia=true`))) {
            if (!perLanguage.has(n.id)) perLanguage.set(n.id, new Map());
            perLanguage.get(n.id)!.set(lang, n);
        }
    }
    for (const [id, versions] of perLanguage) {
        const base = [...versions.values()][0];
        const imageId = await importMedia(countryCode, base.image);
        const pageImageId = base.image_page?.filePath === base.image?.filePath ? imageId : await importMedia(countryCode, base.image_page);
        const values = {
            countryCode,
            status: "published" as const,
            imageId,
            pageImageId,
            instagramLink: base.instagramLink?.slice(0, 512) || null,
            viewCount: base.showCount ?? 0,
            publishedAt: base.publishedAt ? new Date(base.publishedAt) : new Date(),
            legacyId: id,
        };
        await db.insert(schema.news).values({id, ...values}).onConflictDoUpdate({target: schema.news.id, set: values});
        await upsertTranslations(
            schema.newsTranslations,
            "newsId",
            id,
            [...versions.entries()]
                .filter(([, n]) => n.title)
                .map(([languageCode, n]) => ({languageCode, title: n.title!.slice(0, 255), description: n.description || null})),
        );
        stats.news++;
    }
}

interface LegacyPageItem {
    key: string;
    contentType?: string;
    info?: string;
    order?: number;
    mediaFiles?: LegacyMedia[];
}

async function upsertPageEntry(countryCode: string, pageKey: string, key: string, type: "text" | "media", sortOrder: number, info: string | null) {
    const [row] = await db
        .insert(schema.pageEntries)
        .values({countryCode, pageKey, key, type, sortOrder, info})
        .onConflictDoUpdate({
            target: [schema.pageEntries.countryCode, schema.pageEntries.pageKey, schema.pageEntries.key],
            set: {type, info, updatedAt: new Date()},
        })
        .returning({id: schema.pageEntries.id});
    return row.id;
}

async function importPages(countryCode: string, languages: string[]) {
    const pageKeys = [...new Set([...PAGE_REGISTRY.map((p) => p.key), ...(args.pages?.split(",").map((p) => p.trim()).filter(Boolean) ?? [])])];

    for (const pageKey of pageKeys) {
        const registry = PAGE_REGISTRY.find((p) => p.key === pageKey)?.entries ?? [];
        const mediaKeys = new Set(registry.filter((e) => e.type === "media").map((e) => e.key));

        // Images and videos of the page.
        const items = asArray<LegacyPageItem>(await get(`/translations/page/translation?pageKey=${pageKey}&countryCode=${countryCode}`));
        for (const item of items.filter((i) => i.contentType === "MEDIA" && i.mediaFiles?.length)) {
            const id = await upsertPageEntry(countryCode, pageKey, item.key.slice(0, 128), "media", item.order ?? 0, item.info?.slice(0, 255) || null);
            const mediaIds = await importMediaList(countryCode, item.mediaFiles);
            await db.delete(schema.pageEntryMedia).where(eq(schema.pageEntryMedia.entryId, id));
            if (mediaIds.length) await db.insert(schema.pageEntryMedia).values(mediaIds.map((mediaId, sortOrder) => ({entryId: id, mediaId, sortOrder})));
            mediaKeys.add(item.key);
            stats.pageEntries++;
        }

        // Texts, per language.
        const texts = new Map<string, Map<string, string>>();
        for (const lang of languages) {
            const map = await get<Record<string, unknown>>(`/translations/page/${pageKey}?language=${siteLocale(lang)}&country=${countryCode}`);
            for (const [key, value] of Object.entries(map ?? {})) {
                if (typeof value !== "string" || value.trim() === "" || mediaKeys.has(key)) continue;
                if (!texts.has(key)) texts.set(key, new Map());
                texts.get(key)!.set(lang, value);
            }
        }
        for (const [key, values] of texts) {
            if (!/^[A-Za-z0-9][A-Za-z0-9_.\-]{0,127}$/.test(key)) continue;
            const main = values.get(mainLanguage);
            if (main !== undefined) for (const [lang, value] of values) if (lang !== mainLanguage && value === main) values.delete(lang);
            const order = registry.findIndex((e) => e.key === key);
            const id = await upsertPageEntry(countryCode, pageKey, key, "text", order >= 0 ? order : 1000, null);
            await db.delete(schema.pageEntryTranslations).where(eq(schema.pageEntryTranslations.entryId, id));
            await db.insert(schema.pageEntryTranslations).values([...values].map(([languageCode, value]) => ({entryId: id, languageCode, value})));
            stats.pageEntries++;
        }
    }
}

/* ------------------------------------------------------------------ */

async function main() {
    if (!API.startsWith("http")) throw new Error("Set LEGACY_API_URL or BASE_URL to the old backend.");
    if (!SKIP_MEDIA && !getStorageMode()) throw new Error("File storage isn't configured (R2_* variables). Use --skip-media to copy without images.");
    if (!SKIP_MEDIA && !MEDIA_BASE) console.warn("LEGACY_MEDIA_URL / NEXT_PUBLIC_ADMIN_URL is not set: relative image paths can't be downloaded.");

    const all = await db.select({code: schema.countries.code}).from(schema.countries);
    const wanted = args.countries?.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    const countries = all.map((c) => c.code).filter((c) => !wanted || wanted.includes(c));

    for (const countryCode of countries) {
        const languages = (
            await db
                .select({code: schema.countryLanguages.languageCode})
                .from(schema.countryLanguages)
                .where(eq(schema.countryLanguages.countryCode, countryCode))
                .orderBy(schema.countryLanguages.sortOrder)
        ).map((l) => l.code);
        if (languages.length === 0) continue;
        const [country] = await db.select({lang: schema.countries.defaultLanguageCode}).from(schema.countries).where(eq(schema.countries.code, countryCode));
        mainLanguage = country.lang;
        // Main language first, so its texts are the reference.
        languages.sort((a, b) => (a === mainLanguage ? -1 : b === mainLanguage ? 1 : 0));
        console.log(`\n${countryCode} (${languages.join(", ")})`);

        const {ids, depth} = await importCategories(countryCode, languages);
        console.log(`  categories: ${ids.length}`);
        await importProducts(countryCode, languages, ids, depth);
        console.log(`  products: ${stats.products}`);
        await importCollections(countryCode, languages);
        await importNews(countryCode, languages);
        await importPages(countryCode, languages);
    }

    // Ids were copied from the old system: move the counters past them.
    for (const table of ["categories", "products", "collections", "news"]) {
        await db.execute(sql.raw(`select setval(pg_get_serial_sequence('${table}', 'id'), greatest((select coalesce(max(id), 0) from ${table}), 1))`));
    }

    console.log("\nDone:", stats);
    await globalThis.__presidentDbPool?.end();
}

main().catch(async (error) => {
    console.error(error);
    await globalThis.__presidentDbPool?.end();
    process.exit(1);
});
