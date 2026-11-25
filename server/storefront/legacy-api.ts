import "server-only";

import {and, asc, eq} from "drizzle-orm";
import {getDb, schema} from "@/server/db/client";
import type {MediaView} from "@/server/services/catalog/common";
import {ActionError} from "@/server/admin-action";
import {createSiteOrder, listCustomerOrders} from "@/server/services/sales/orders";
import {getActiveCustomer, getLatestCustomerLogo, loginOrCreateCustomer, registerCustomer} from "@/server/services/sales/site-customers";
import {
    CountryInfo,
    findCategory,
    getCategoryProducts,
    getCategoryTree,
    getCollections,
    getCountry,
    getCountryCurrencies,
    getLatestProducts,
    getProduct,
    resolveLanguage,
    searchSiteProducts,
    SiteCategory,
    SiteCurrency,
    SiteProduct,
    toSiteLocale,
} from "./catalog";
import {countNewsView, getPageEntriesForSite, getSiteBranches, getSiteNews, pageAsMap} from "./content";

/**
 * The old backend's API (`/api/v1/...`), answered from the new database. The
 * site's pages and components keep working unchanged when the data source is
 * switched to "local". Only the endpoints the site uses are implemented, with
 * the same response shapes.
 */

export interface LegacyRequest {
    method: "GET" | "POST";
    /** Path after /api/v1, e.g. "/product/by_id_and_locale". */
    path: string;
    query: URLSearchParams;
    body?: unknown;
    /** Signed-in site customer (from the session), if any. */
    customerId?: string | null;
    /** Visitor's site locale and currency (from headers/cookies). */
    locale?: string;
    currencyCode?: string;
    /** Visitor's country (from the cookie), used when the request doesn't say. */
    countryCode?: string;
}

export interface LegacyResponse {
    status: number;
    body: unknown;
}

const ok = (body: unknown): LegacyResponse => ({status: 200, body});
const notFound = (): LegacyResponse => ({status: 404, body: {error: "Not found"}});
const badRequest = (): LegacyResponse => ({status: 400, body: {error: "Bad request"}});

/* ------------------------------------------------------------------ */
/* Shapes of the old API                                               */
/* ------------------------------------------------------------------ */

/** File path as the site uses it: it prefixes NEXT_PUBLIC_ADMIN_URL unless the path is absolute (see lib/media-src). */
export function legacyPath(media: MediaView) {
    return media.url;
}

function legacyMedia(media: MediaView, order: number, ownerType: string, ownerId: number) {
    const fileName = media.url.split("/").pop() ?? "";
    const isVideo = media.contentType.startsWith("video/");
    return {
        id: media.id,
        fileName,
        originalFileName: fileName,
        filePath: legacyPath(media),
        fileSize: 0,
        pendingUpload: null,
        contentType: media.contentType,
        mediaType: isVideo ? "VIDEO" : "IMAGE",
        mediaUsageType: "GALLERY",
        uploadedAt: null,
        updatedAt: null,
        metaData: {type: isVideo ? "video" : "image", order, width: media.width, height: media.height},
        ownerType,
        ownerId,
        accessLevel: "PUBLIC",
        image: !isVideo,
        video: isVideo,
    };
}

function legacyCurrency(c: SiteCurrency) {
    return {
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        symbol_position: c.symbolPosition === "before" ? "BEFORE" : "AFTER",
        symbol_space: c.symbolPosition === "after",
        price: c.rateToUsd,
        default_currency: c.isDefault,
    };
}

function convert(priceUsd: number, c: SiteCurrency) {
    const factor = 10 ** c.decimals;
    return Math.round(priceUsd * c.rateToUsd * factor) / factor;
}

function legacyProduct(p: SiteProduct, country: CountryInfo, currencies: SiteCurrency[], currencyCode?: string) {
    const usd = p.priceUsd ?? 0;
    const prices = currencies.map((c) => ({currency: legacyCurrency(c), price: convert(usd, c)}));
    const selected =
        currencies.find((c) => c.code === currencyCode?.toUpperCase()) ?? currencies.find((c) => c.isDefault) ?? currencies[0];
    return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        basePriceToUSD: usd,
        country: {name: country.name, code: country.code},
        locale_price: selected ? {currency: legacyCurrency(selected), price: convert(usd, selected)} : null,
        prices,
        meta: {id: p.id, favorite: false, ware_house_count: p.stock ?? 0, _new_product: p.isNew, _frontal_page: p.isFeatured},
        media: p.media.map((m, i) => legacyMedia(m, i + 1, "PRODUCT", p.id)),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    };
}

function legacyCategory(c: SiteCategory, withChildren: boolean): unknown {
    return {
        id: c.id,
        parentId: c.parentId,
        name: c.name,
        description: c.description,
        translation: c.translations.map((t) => ({name: t.name, description: t.description ?? "", code: toSiteLocale(t.languageCode).toUpperCase()})),
        children: withChildren ? c.children.map((child) => legacyCategory(child, true)) : null,
        mediaFiles: c.image ? [legacyMedia(c.image, 1, "CATEGORY", c.id)] : [],
    };
}

function page<T>(rows: T[], total: number, pageIndex: number, size: number) {
    // Both Spring-style ("content") and the site's own ("data") field names.
    return {
        data: rows,
        content: rows,
        totalElements: total,
        totalPages: Math.ceil(total / size),
        number: pageIndex,
        size,
        last: (pageIndex + 1) * size >= total,
    };
}

const LEGACY_ORDER_STATUS: Record<string, string> = {
    new: "NEW",
    confirmed: "CONFIRMED",
    in_progress: "IN_PROGRESS",
    shipped: "SHIPPED",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
};

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

function int(value: string | null, fallback = 0) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : fallback;
}

async function countryFrom(req: LegacyRequest, ...params: string[]) {
    for (const p of params) {
        const value = req.query.get(p);
        if (value) return getCountry(value);
    }
    return getCountry(req.countryCode);
}

function languageFrom(req: LegacyRequest, country: CountryInfo, ...params: string[]) {
    for (const p of params) {
        const value = req.query.get(p);
        if (value) return resolveLanguage(country, value);
    }
    return resolveLanguage(country, req.locale);
}

type Handler = (req: LegacyRequest, match: RegExpMatchArray) => Promise<LegacyResponse>;

const ROUTES: { method: "GET" | "POST"; path: RegExp; handler: Handler }[] = [
    /* ---------- reference data ---------- */
    {
        method: "GET",
        path: /^\/country\/all$/,
        handler: async () => {
            const rows = await getDb()
                .select({code: schema.countries.code, name: schema.countries.name})
                .from(schema.countries)
                .where(eq(schema.countries.isActive, true))
                .orderBy(asc(schema.countries.name));
            const fallback = (process.env.DEFAULT_COUNTRY ?? "UZ").toUpperCase();
            return ok(rows.map((c, i) => ({id: i + 1, name: c.name, code: c.code, defaultCountry: c.code === fallback})));
        },
    },
    {
        method: "GET",
        path: /^\/currency\/by_country$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            if (!country) return ok([]);
            return ok((await getCountryCurrencies(country)).map(legacyCurrency));
        },
    },
    {
        method: "GET",
        path: /^\/language\/all_active_by_country$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            if (!country) return ok([]);
            const rows = await getDb()
                .select({code: schema.languages.code, nativeName: schema.languages.nativeName})
                .from(schema.countryLanguages)
                .innerJoin(schema.languages, eq(schema.languages.code, schema.countryLanguages.languageCode))
                .where(and(eq(schema.countryLanguages.countryCode, country.code), eq(schema.countryLanguages.isActive, true), eq(schema.languages.isActive, true)))
                .orderBy(asc(schema.countryLanguages.sortOrder));
            return ok(rows.map((l) => ({
                code: toSiteLocale(l.code).toUpperCase(),
                name: l.nativeName,
                active: true,
                defaultLanguage: l.code === country.defaultLanguageCode,
            })));
        },
    },

    /* ---------- categories ---------- */
    {
        method: "GET",
        path: /^\/category\/root_by_locale(_with_media)?$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            if (!country) return ok([]);
            const tree = await getCategoryTree(country, languageFrom(req, country, "languageCode"));
            return ok(tree.map((c) => legacyCategory(c, true)));
        },
    },
    {
        method: "GET",
        path: /^\/category\/by_id_and_locale_with_media$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            if (!country) return notFound();
            const tree = await getCategoryTree(country, languageFrom(req, country, "languageCode"));
            const node = findCategory(tree, int(req.query.get("categoryId"), -1));
            if (!node) return notFound();
            return ok(legacyCategory(node, req.query.get("withChildren") === "true"));
        },
    },
    {
        method: "GET",
        path: /^\/category\/product_page_by_category_id_and_locale$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            const pageIndex = int(req.query.get("page"));
            const size = Math.min(100, Math.max(1, int(req.query.get("size"), 12)));
            if (!country) return ok(page([], 0, pageIndex, size));
            const lang = languageFrom(req, country, "languageCode");
            const [{rows, total}, currencies] = await Promise.all([
                getCategoryProducts(country, lang, int(req.query.get("categoryId"), -1), pageIndex, size),
                getCountryCurrencies(country),
            ]);
            return ok(page(rows.map((p) => legacyProduct(p, country, currencies, req.currencyCode)), total, pageIndex, size));
        },
    },

    /* ---------- products ---------- */
    {
        method: "GET",
        path: /^\/product\/by_locale$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            if (!country) return ok([]);
            const lang = languageFrom(req, country, "language");
            const [rows, currencies] = await Promise.all([getLatestProducts(country, lang), getCountryCurrencies(country)]);
            return ok(rows.map((p) => legacyProduct(p, country, currencies, req.currencyCode)));
        },
    },
    {
        method: "GET",
        path: /^\/product\/by_id_and_locale$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            if (!country) return notFound();
            const lang = languageFrom(req, country, "language");
            const [product, currencies] = await Promise.all([
                getProduct(country, lang, int(req.query.get("productId"), -1)),
                getCountryCurrencies(country),
            ]);
            return product ? ok(legacyProduct(product, country, currencies, req.currencyCode)) : notFound();
        },
    },
    {
        method: "GET",
        path: /^\/product\/page_by_locale_and_name$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            const pageIndex = int(req.query.get("page"));
            const size = Math.min(50, Math.max(1, int(req.query.get("size"), 10)));
            const name = (req.query.get("name") ?? "").slice(0, 100);
            if (!country || !name.trim()) return ok(page([], 0, pageIndex, size));
            const lang = languageFrom(req, country, "language");
            const [{rows, total}, currencies] = await Promise.all([
                searchSiteProducts(country, lang, name, pageIndex, size),
                getCountryCurrencies(country),
            ]);
            return ok(page(rows.map((p) => legacyProduct(p, country, currencies, req.currencyCode)), total, pageIndex, size));
        },
    },

    /* ---------- collections ---------- */
    {
        method: "GET",
        path: /^\/collections\/(by_locale_with_media_and_products|by_id_and_locale_with_media_and_products)$/,
        handler: async (req, match) => {
            const country = await countryFrom(req, "country_code", "countryCode");
            const single = match[1].startsWith("by_id");
            if (!country) return single ? notFound() : ok([]);
            const lang = languageFrom(req, country, "languageCode");
            const [collections, currencies] = await Promise.all([
                getCollections(country, lang, single ? int(req.query.get("collectionId"), -1) : undefined),
                getCountryCurrencies(country),
            ]);
            const shaped = collections.map((c) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                is_main_page: true,
                country: {name: country.name, code: country.code},
                mediaFiles: c.image ? [legacyMedia(c.image, 1, "COLLECTION", c.id)] : [],
                translations: c.translations.map((t) => ({name: t.name, description: t.description ?? "", code: toSiteLocale(t.languageCode).toUpperCase()})),
                products: c.products.map((p) => legacyProduct(p, country, currencies, req.currencyCode)),
            }));
            if (single) return shaped[0] ? ok(shaped[0]) : notFound();
            return ok(shaped);
        },
    },

    /* ---------- news ---------- */
    {
        method: "GET",
        path: /^\/news\/(by_locale|by_id_and_locale_with_media)$/,
        handler: async (req, match) => {
            const country = await countryFrom(req, "countryCode");
            const single = match[1] !== "by_locale";
            if (!country) return single ? notFound() : ok([]);
            const lang = languageFrom(req, country, "languageCode");
            const id = single ? int(req.query.get("news_id"), -1) : undefined;
            const items = await getSiteNews(country, lang, id);
            const shaped = items.map((n, index) => ({
                id: n.id,
                countryDto: {id: 1, name: country.name, code: country.code, defaultCountry: false},
                title: n.title,
                description: n.description,
                image: n.image ? legacyMedia(n.image, 1, "NEWS", n.id) : null,
                image_page: n.pageImage ? legacyMedia(n.pageImage, 2, "NEWS", n.id) : n.image ? legacyMedia(n.image, 1, "NEWS", n.id) : null,
                instagramLink: n.instagramLink ?? "",
                showCount: n.viewCount,
                publishedAt: n.publishedAt?.toISOString() ?? null,
                translations: n.translations.map((t) => ({
                    id: index,
                    title: t.title,
                    description: t.description ?? "",
                    language: toSiteLocale(t.languageCode).toUpperCase(),
                })),
            }));
            if (single) {
                if (!shaped[0]) return notFound();
                await countNewsView(shaped[0].id);
                return ok(shaped[0]);
            }
            return ok(shaped);
        },
    },

    /* ---------- page texts ---------- */
    {
        method: "GET",
        path: /^\/translations\/page\/translation$/,
        handler: async (req) => {
            const country = await countryFrom(req, "countryCode");
            const pageKey = req.query.get("pageKey") ?? "";
            if (!country || !/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(pageKey)) return ok([]);
            const entries = await getPageEntriesForSite(country, pageKey);
            return ok(entries.map((e) => {
                const mediaFiles = e.media.map((m, i) => legacyMedia(m, i + 1, "TRANSLATION", e.order));
                return {
                    key: e.key,
                    contentType: e.type === "media" ? "MEDIA" : "TEXT",
                    countryCode: country.code,
                    info: e.info ?? "",
                    order: e.order,
                    languageContents: Object.fromEntries(Object.entries(e.values).map(([l, v]) => [toSiteLocale(l).toUpperCase(), v])),
                    mediaFiles,
                    previewImage: mediaFiles[0] ?? null,
                    createdAt: e.createdAt.toISOString(),
                    updatedAt: e.updatedAt.toISOString(),
                };
            }));
        },
    },
    {
        method: "GET",
        path: /^\/translations\/page\/([A-Za-z][A-Za-z0-9_]{1,63})$/,
        handler: async (req, match) => {
            const country = await countryFrom(req, "country", "countryCode");
            if (!country) return ok({});
            const lang = languageFrom(req, country, "language");
            const entries = await getPageEntriesForSite(country, match[1]);
            return ok(pageAsMap(entries, lang, country.defaultLanguageCode, legacyPath));
        },
    },

    /* ---------- branches (new endpoint; the old backend didn't have it) ---------- */
    {
        method: "GET",
        path: /^\/branches\/all$/,
        handler: async () => {
            const countries = await getDb()
                .select({code: schema.countries.code})
                .from(schema.countries)
                .where(eq(schema.countries.isActive, true))
                .orderBy(asc(schema.countries.name));
            const result = [];
            for (const {code} of countries) {
                const country = await getCountry(code);
                if (!country) continue;
                for (const b of await getSiteBranches(country)) {
                    const name: Record<string, string> = {};
                    for (const t of b.translations) name[toSiteLocale(t.languageCode)] = t.address;
                    const fallback = name[toSiteLocale(country.defaultLanguageCode)] ?? Object.values(name)[0] ?? "";
                    for (const locale of ["uz", "ru", "en", "tj", "az"]) name[locale] ??= fallback;
                    result.push({countryCode: country.code, lat: b.latitude, lng: b.longitude, phone: b.phone, name});
                }
            }
            return ok(result);
        },
    },

    /* ---------- customers ---------- */
    {
        method: "POST",
        path: /^\/clients\/form\/create$/,
        handler: async (req) => {
            const result = await registerCustomer(req.body);
            return result.ok ? ok(result.data) : {status: result.status, body: {error: result.status === 409 ? "Email already registered" : "Invalid data"}};
        },
    },
    {
        method: "POST",
        path: /^\/clients\/google\/login_or_create$/,
        handler: async (req) => {
            const data = await loginOrCreateCustomer(req.body);
            return data ? ok(data) : {status: 401, body: {error: "Invalid credentials"}};
        },
    },
    {
        method: "GET",
        path: /^\/b2b\/by_client_id$/,
        handler: async (req) => {
            const logo = req.customerId ? await getLatestCustomerLogo(req.customerId) : null;
            return ok(logo ? {id: logo.id, media_file: {filePath: logo.url}, createdAt: logo.createdAt.toISOString()} : {});
        },
    },

    /* ---------- orders ---------- */
    {
        method: "POST",
        path: /^\/orders\/create$/,
        handler: async (req) => {
            const body = (req.body ?? {}) as {
                client_first_phone?: string;
                client_second_phone?: string;
                client_full_name?: string;
                comment?: string;
                address?: { countryCode?: string; location?: string; latitude?: number; longitude?: number };
                items?: { productId?: number; quantity?: number }[];
            };
            const customer = await getActiveCustomer(req.customerId);
            try {
                const {order} = await createSiteOrder({
                    countryCode: (body.address?.countryCode ?? req.countryCode ?? "").toUpperCase(),
                    customerId: customer?.id ?? null,
                    contactName: body.client_full_name ?? "",
                    phone: body.client_first_phone ?? "",
                    secondPhone: body.client_second_phone ?? "",
                    address: body.address?.location ?? "",
                    latitude: typeof body.address?.latitude === "number" ? body.address.latitude : null,
                    longitude: typeof body.address?.longitude === "number" ? body.address.longitude : null,
                    comment: body.comment ?? "",
                    currencyCode: req.currencyCode?.toUpperCase(),
                    items: (body.items ?? []).map((i) => ({productId: Number(i.productId), quantity: Number(i.quantity)})),
                });
                return ok({id: order.id, status: LEGACY_ORDER_STATUS[order.status], totalAmount: Number(order.totalUsd), createdAt: order.createdAt.toISOString()});
            } catch (error) {
                if (error instanceof ActionError) return badRequest();
                throw error;
            }
        },
    },
    {
        method: "GET",
        path: /^\/orders\/by_customer_id$/,
        handler: async (req) => {
            const pageIndex = int(req.query.get("page"));
            const size = Math.min(50, Math.max(1, int(req.query.get("size"), 10)));
            if (!req.customerId) return ok(page([], 0, pageIndex, size));
            const {rows, items, total} = await listCustomerOrders(req.customerId, pageIndex, size);
            return ok(page(rows.map((o) => ({
                id: String(o.id),
                customerId: o.customerId,
                status: LEGACY_ORDER_STATUS[o.status],
                firstPhoneNumber: o.phone,
                secondPhoneNumber: o.secondPhone ?? "",
                address: {id: String(o.id), location: o.address ?? "", latitude: Number(o.latitude ?? 0), longitude: Number(o.longitude ?? 0)},
                totalAmount: Number(o.totalUsd),
                items: items.filter((i) => i.orderId === o.id).map((i) => ({
                    id: String(i.id),
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: Number(i.unitPriceUsd),
                    totalPrice: Number(i.unitPriceUsd) * i.quantity,
                })),
                createdAt: o.createdAt.toISOString(),
                updatedAt: o.updatedAt.toISOString(),
            })), total, pageIndex, size));
        },
    },
];

/** Answers one request of the old API from the new database. */
export async function handleLegacyRequest(req: LegacyRequest): Promise<LegacyResponse> {
    const path = req.path.replace(/\/+$/, "");
    for (const route of ROUTES) {
        if (route.method !== req.method) continue;
        const match = path.match(route.path);
        if (match) return route.handler(req, match);
    }
    return notFound();
}

