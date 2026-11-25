import "server-only";

import {and, asc, desc, eq, ilike, inArray, or, sql} from "drizzle-orm";
import {getDb, schema} from "@/server/db/client";
import {getMediaViews, MediaView} from "@/server/services/catalog/common";

/**
 * Read side of the site: only published, active data of one country, in one
 * language (falling back to the country's main language).
 */

/** Site locale ("tj") → language code in the database ("tg"). */
export function toDbLanguage(locale: string | null | undefined) {
    const lower = (locale ?? "").toLowerCase();
    return lower === "tj" ? "tg" : lower;
}

/** Database language code → site locale. */
export function toSiteLocale(code: string) {
    return code === "tg" ? "tj" : code;
}

export interface CountryInfo {
    code: string;
    name: string;
    defaultLanguageCode: string;
    defaultCurrencyCode: string;
    languages: string[];
}

export async function getCountry(code: string | null | undefined): Promise<CountryInfo | null> {
    const upper = (code ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) return null;
    const db = getDb();
    const [country] = await db
        .select()
        .from(schema.countries)
        .where(and(eq(schema.countries.code, upper), eq(schema.countries.isActive, true)));
    if (!country) return null;
    const languages = await db
        .select({code: schema.countryLanguages.languageCode})
        .from(schema.countryLanguages)
        .where(and(eq(schema.countryLanguages.countryCode, upper), eq(schema.countryLanguages.isActive, true)))
        .orderBy(asc(schema.countryLanguages.sortOrder));
    return {
        code: country.code,
        name: country.name,
        defaultLanguageCode: country.defaultLanguageCode,
        defaultCurrencyCode: country.defaultCurrencyCode,
        languages: languages.map((l) => l.code),
    };
}

/** Requested language if the country has it, else the country's main language. */
export function resolveLanguage(country: CountryInfo, requested: string | null | undefined) {
    const code = toDbLanguage(requested);
    return country.languages.includes(code) ? code : country.defaultLanguageCode;
}

/** Picks the translation in `lang`, falling back to `fallback`, then to any. */
export function pickTranslation<T extends { languageCode: string }>(rows: T[], lang: string, fallback: string): T | undefined {
    return rows.find((r) => r.languageCode === lang) ?? rows.find((r) => r.languageCode === fallback) ?? rows[0];
}

/* ------------------------------------------------------------------ */
/* Currencies                                                          */
/* ------------------------------------------------------------------ */

export interface SiteCurrency {
    code: string;
    name: string;
    symbol: string;
    symbolPosition: "before" | "after";
    decimals: number;
    rateToUsd: number;
    isDefault: boolean;
}

export async function getCountryCurrencies(country: CountryInfo): Promise<SiteCurrency[]> {
    const rows = await getDb()
        .select({
            code: schema.currencies.code,
            name: schema.currencies.name,
            symbol: schema.currencies.symbol,
            symbolPosition: schema.currencies.symbolPosition,
            decimals: schema.currencies.decimals,
            rateToUsd: schema.countryCurrencies.rateToUsd,
        })
        .from(schema.countryCurrencies)
        .innerJoin(schema.currencies, eq(schema.currencies.code, schema.countryCurrencies.currencyCode))
        .where(and(eq(schema.countryCurrencies.countryCode, country.code), eq(schema.countryCurrencies.isActive, true)))
        .orderBy(asc(schema.countryCurrencies.sortOrder));
    return rows
        .filter((r) => r.code === "USD" || r.rateToUsd !== null)
        .map((r) => ({
            ...r,
            rateToUsd: r.code === "USD" ? 1 : Number(r.rateToUsd),
            isDefault: r.code === country.defaultCurrencyCode,
        }));
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export interface SiteCategory {
    id: number;
    parentId: number | null;
    name: string;
    description: string;
    image: MediaView | null;
    translations: { languageCode: string; name: string; description: string | null }[];
    children: SiteCategory[];
}

export async function getCategoryTree(country: CountryInfo, lang: string): Promise<SiteCategory[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.categories)
        .where(and(eq(schema.categories.countryCode, country.code), eq(schema.categories.status, "published")))
        .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.id));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [translations, images] = await Promise.all([
        db.select().from(schema.categoryTranslations).where(inArray(schema.categoryTranslations.categoryId, ids)),
        getMediaViews(rows.map((r) => r.imageId)),
    ]);

    const nodes = new Map<number, SiteCategory>(
        rows.map((row) => {
            const own = translations.filter((t) => t.categoryId === row.id);
            const tr = pickTranslation(own, lang, country.defaultLanguageCode);
            return [row.id, {
                id: row.id,
                parentId: row.parentId,
                name: tr?.name ?? "",
                description: tr?.description ?? "",
                image: row.imageId ? images.get(row.imageId) ?? null : null,
                translations: own.map(({languageCode, name, description}) => ({languageCode, name, description})),
                children: [],
            }];
        }),
    );
    const roots: SiteCategory[] = [];
    for (const row of rows) {
        const node = nodes.get(row.id)!;
        const parent = row.parentId !== null ? nodes.get(row.parentId) : undefined;
        // A child of an unpublished category is shown at the top level.
        if (parent) parent.children.push(node);
        else roots.push(node);
    }
    return roots;
}

export function findCategory(tree: SiteCategory[], id: number): SiteCategory | null {
    for (const node of tree) {
        if (node.id === id) return node;
        const found = findCategory(node.children, id);
        if (found) return found;
    }
    return null;
}

function collectIds(node: SiteCategory): number[] {
    return [node.id, ...node.children.flatMap(collectIds)];
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export interface SiteProduct {
    id: number;
    sku: string;
    name: string;
    description: string;
    priceUsd: number | null;
    stock: number | null;
    isNew: boolean;
    isFeatured: boolean;
    categoryId: number | null;
    media: MediaView[];
    createdAt: Date;
    updatedAt: Date;
}

const publishedIn = (countryCode: string) =>
    and(eq(schema.products.countryCode, countryCode), eq(schema.products.status, "published"));

async function hydrateProducts(country: CountryInfo, lang: string, rows: (typeof schema.products.$inferSelect)[]): Promise<SiteProduct[]> {
    if (rows.length === 0) return [];
    const db = getDb();
    const ids = rows.map((r) => r.id);
    const [translations, links] = await Promise.all([
        db.select().from(schema.productTranslations).where(inArray(schema.productTranslations.productId, ids)),
        db.select().from(schema.productMedia).where(inArray(schema.productMedia.productId, ids)).orderBy(asc(schema.productMedia.sortOrder)),
    ]);
    const media = await getMediaViews(links.map((l) => l.mediaId));
    return rows.map((row) => {
        const tr = pickTranslation(translations.filter((t) => t.productId === row.id), lang, country.defaultLanguageCode);
        return {
            id: row.id,
            sku: row.sku,
            name: tr?.name ?? row.sku,
            description: tr?.description ?? "",
            priceUsd: row.priceUsd === null ? null : Number(row.priceUsd),
            stock: row.stock,
            isNew: row.isNew,
            isFeatured: row.isFeatured,
            categoryId: row.categoryId,
            media: links.filter((l) => l.productId === row.id).map((l) => media.get(l.mediaId)).filter((m): m is MediaView => Boolean(m)),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    });
}

export async function getProduct(country: CountryInfo, lang: string, id: number) {
    const [row] = await getDb().select().from(schema.products).where(and(eq(schema.products.id, id), publishedIn(country.code)));
    if (!row) return null;
    return (await hydrateProducts(country, lang, [row]))[0];
}

/** Latest published products (the site filters "new" and home page ones from this list). */
export async function getLatestProducts(country: CountryInfo, lang: string, limit = 200) {
    const rows = await getDb()
        .select()
        .from(schema.products)
        .where(publishedIn(country.code))
        .orderBy(asc(schema.products.sortOrder), desc(schema.products.publishedAt), desc(schema.products.id))
        .limit(limit);
    return hydrateProducts(country, lang, rows);
}

/** Products of a category and its subcategories, one page at a time. */
export async function getCategoryProducts(country: CountryInfo, lang: string, categoryId: number, page: number, size: number) {
    const tree = await getCategoryTree(country, lang);
    const node = findCategory(tree, categoryId);
    if (!node) return {rows: [] as SiteProduct[], total: 0};
    const condition = and(publishedIn(country.code), inArray(schema.products.categoryId, collectIds(node)));
    const db = getDb();
    const [rows, [{value}]] = await Promise.all([
        db
            .select()
            .from(schema.products)
            .where(condition)
            .orderBy(asc(schema.products.sortOrder), desc(schema.products.publishedAt), desc(schema.products.id))
            .limit(size)
            .offset(page * size),
        db.select({value: sql<number>`count(*)`}).from(schema.products).where(condition),
    ]);
    return {rows: await hydrateProducts(country, lang, rows), total: Number(value)};
}

export async function searchSiteProducts(country: CountryInfo, lang: string, q: string, page: number, size: number) {
    const db = getDb();
    const pattern = `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const matching = db
        .select({id: schema.productTranslations.productId})
        .from(schema.productTranslations)
        .where(ilike(schema.productTranslations.name, pattern));
    const condition = and(publishedIn(country.code), or(ilike(schema.products.sku, pattern), inArray(schema.products.id, matching)));
    const [rows, [{value}]] = await Promise.all([
        db.select().from(schema.products).where(condition).orderBy(desc(schema.products.publishedAt)).limit(size).offset(page * size),
        db.select({value: sql<number>`count(*)`}).from(schema.products).where(condition),
    ]);
    return {rows: await hydrateProducts(country, lang, rows), total: Number(value)};
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export async function getCollections(country: CountryInfo, lang: string, onlyId?: number) {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.collections)
        .where(and(
            eq(schema.collections.countryCode, country.code),
            eq(schema.collections.status, "published"),
            onlyId ? eq(schema.collections.id, onlyId) : undefined,
        ))
        .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.id));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [translations, links, images] = await Promise.all([
        db.select().from(schema.collectionTranslations).where(inArray(schema.collectionTranslations.collectionId, ids)),
        db
            .select({collectionId: schema.collectionProducts.collectionId, product: schema.products})
            .from(schema.collectionProducts)
            .innerJoin(schema.products, eq(schema.products.id, schema.collectionProducts.productId))
            .where(and(inArray(schema.collectionProducts.collectionId, ids), eq(schema.products.status, "published")))
            .orderBy(asc(schema.collectionProducts.sortOrder)),
        getMediaViews(rows.map((r) => r.imageId)),
    ]);
    const products = await hydrateProducts(country, lang, [...new Map(links.map((l) => [l.product.id, l.product])).values()]);
    const byId = new Map(products.map((p) => [p.id, p]));

    return rows.map((row) => {
        const own = translations.filter((t) => t.collectionId === row.id);
        const tr = pickTranslation(own, lang, country.defaultLanguageCode);
        return {
            id: row.id,
            name: tr?.name ?? "",
            description: tr?.description ?? "",
            image: row.imageId ? images.get(row.imageId) ?? null : null,
            translations: own,
            products: links.filter((l) => l.collectionId === row.id).map((l) => byId.get(l.product.id)!).filter(Boolean),
        };
    });
}
