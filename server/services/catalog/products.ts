import "server-only";

import {and, asc, count, desc, eq, ilike, inArray, or, SQL, sql} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import {hasPermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import type {AdminContext} from "@/server/auth/session";
import type {ContentStatus} from "@/server/db/schema";
import {
    assertCanChange,
    assertCountryMedia,
    cleanTranslations,
    CONTENT_STATUSES,
    getMediaViews,
    MediaView,
    pickName,
    translationsInput,
} from "./common";

export const PRODUCTS_PAGE_SIZE = 20;

const price = z
    .string()
    .trim()
    .regex(/^\d{1,10}(\.\d{1,2})?$/)
    .nullable();

export const productInput = z.object({
    sku: z.string().trim().min(1).max(64).regex(/^[\w.\-/ ]+$/),
    categoryId: z.number().int().positive().nullable(),
    priceUsd: price.optional(),
    stock: z.number().int().min(0).max(10_000_000).nullable(),
    isNew: z.boolean(),
    isFeatured: z.boolean(),
    status: z.enum(CONTENT_STATUSES),
    translations: translationsInput(200),
    mediaIds: z.array(z.string().uuid()).max(30),
});

export type ProductInput = z.input<typeof productInput>;

export interface ProductListFilters {
    q?: string;
    status?: ContentStatus;
    categoryId?: number | "none";
    page?: number;
}

export interface ProductListRow {
    id: number;
    sku: string;
    name: string;
    status: ContentStatus;
    priceUsd: string | null;
    stock: number | null;
    isNew: boolean;
    isFeatured: boolean;
    categoryId: number | null;
    thumbnail: string | null;
    updatedAt: string;
}

export async function listProducts(countryCode: string, lang: string, filters: ProductListFilters) {
    const db = getDb();
    const page = Math.max(1, filters.page ?? 1);
    const where: SQL[] = [eq(schema.products.countryCode, countryCode)];

    if (filters.status) where.push(eq(schema.products.status, filters.status));
    if (filters.categoryId === "none") where.push(sql`${schema.products.categoryId} is null`);
    else if (filters.categoryId) where.push(eq(schema.products.categoryId, filters.categoryId));

    const q = filters.q?.trim();
    if (q) {
        const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        const matching = db
            .select({id: schema.productTranslations.productId})
            .from(schema.productTranslations)
            .where(ilike(schema.productTranslations.name, pattern));
        where.push(or(ilike(schema.products.sku, pattern), inArray(schema.products.id, matching))!);
    }

    const condition = and(...where);
    const [rows, [{value: total}]] = await Promise.all([
        db
            .select()
            .from(schema.products)
            .where(condition)
            .orderBy(desc(schema.products.updatedAt), desc(schema.products.id))
            .limit(PRODUCTS_PAGE_SIZE)
            .offset((page - 1) * PRODUCTS_PAGE_SIZE),
        db.select({value: count()}).from(schema.products).where(condition),
    ]);

    const ids = rows.map((r) => r.id);
    const [translations, firstMedia] = ids.length
        ? await Promise.all([
            db
                .select({productId: schema.productTranslations.productId, languageCode: schema.productTranslations.languageCode, name: schema.productTranslations.name})
                .from(schema.productTranslations)
                .where(inArray(schema.productTranslations.productId, ids)),
            db
                .selectDistinctOn([schema.productMedia.productId], {productId: schema.productMedia.productId, mediaId: schema.productMedia.mediaId})
                .from(schema.productMedia)
                .where(inArray(schema.productMedia.productId, ids))
                .orderBy(schema.productMedia.productId, asc(schema.productMedia.sortOrder)),
        ])
        : [[], []];
    const media = await getMediaViews(firstMedia.map((m) => m.mediaId));

    const list: ProductListRow[] = rows.map((row) => {
        const mediaId = firstMedia.find((m) => m.productId === row.id)?.mediaId;
        return {
            id: row.id,
            sku: row.sku,
            name: pickName(translations.filter((t) => t.productId === row.id), lang),
            status: row.status,
            priceUsd: row.priceUsd,
            stock: row.stock,
            isNew: row.isNew,
            isFeatured: row.isFeatured,
            categoryId: row.categoryId,
            thumbnail: mediaId ? media.get(mediaId)?.url ?? null : null,
            updatedAt: row.updatedAt.toISOString(),
        };
    });

    return {rows: list, total: Number(total), page, pageSize: PRODUCTS_PAGE_SIZE};
}

/** Counts by status, for the filter tabs. */
export async function countProductsByStatus(countryCode: string) {
    const rows = await getDb()
        .select({status: schema.products.status, value: count()})
        .from(schema.products)
        .where(eq(schema.products.countryCode, countryCode))
        .groupBy(schema.products.status);
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.value)])) as Partial<Record<ContentStatus, number>>;
}

export async function getProductDetail(id: number) {
    const db = getDb();
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, id));
    if (!product) return null;

    const [translations, mediaRows] = await Promise.all([
        db.select().from(schema.productTranslations).where(eq(schema.productTranslations.productId, id)),
        db
            .select({mediaId: schema.productMedia.mediaId})
            .from(schema.productMedia)
            .where(eq(schema.productMedia.productId, id))
            .orderBy(asc(schema.productMedia.sortOrder)),
    ]);
    const media = await getMediaViews(mediaRows.map((m) => m.mediaId));

    return {
        product,
        translations: translations.map(({languageCode, name, description}) => ({languageCode, name, description})),
        media: mediaRows.map((m) => media.get(m.mediaId)).filter((m): m is MediaView => Boolean(m)),
    };
}

async function assertCategory(countryCode: string, categoryId: number | null) {
    if (categoryId === null) return;
    const [row] = await getDb()
        .select({id: schema.categories.id})
        .from(schema.categories)
        .where(and(eq(schema.categories.id, categoryId), eq(schema.categories.countryCode, countryCode)));
    if (!row) throw new ActionError("invalid", "categoryId");
}

async function getOwnProduct(countryCode: string, id: number) {
    const [row] = await getDb()
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.id, id), eq(schema.products.countryCode, countryCode)));
    if (!row) throw new ActionError("notFound");
    return row;
}

async function assertSkuFree(countryCode: string, sku: string, exceptId: number | null) {
    const [row] = await getDb()
        .select({id: schema.products.id})
        .from(schema.products)
        .where(and(eq(schema.products.countryCode, countryCode), sql`lower(${schema.products.sku}) = ${sku.toLowerCase()}`));
    if (row && row.id !== exceptId) throw new ActionError("exists", "sku");
}

export async function createProduct(ctx: AdminContext, countryCode: string, input: unknown) {
    const data = parseInput(productInput, input);
    assertCanChange(ctx, countryCode, null, data.status);
    await Promise.all([
        assertCategory(countryCode, data.categoryId),
        assertCountryMedia(countryCode, data.mediaIds),
        assertSkuFree(countryCode, data.sku, null),
    ]);
    const translations = await cleanTranslations(countryCode, data.translations);
    const canPrice = hasPermission(ctx, PERMISSIONS.pricesEdit, countryCode);

    return getDb().transaction(async (tx) => {
        const [row] = await tx
            .insert(schema.products)
            .values({
                countryCode,
                sku: data.sku,
                categoryId: data.categoryId,
                priceUsd: canPrice ? data.priceUsd ?? null : null,
                stock: data.stock,
                isNew: data.isNew,
                isFeatured: data.isFeatured,
                status: data.status,
                publishedAt: data.status === "published" ? new Date() : null,
                createdById: ctx.user.id,
                updatedById: ctx.user.id,
            })
            .returning({id: schema.products.id});
        await tx.insert(schema.productTranslations).values(translations.map((t) => ({...t, productId: row.id})));
        if (data.mediaIds.length) {
            await tx.insert(schema.productMedia).values(data.mediaIds.map((mediaId, sortOrder) => ({productId: row.id, mediaId, sortOrder})));
        }
        return row.id;
    });
}

export async function updateProduct(ctx: AdminContext, countryCode: string, id: number, input: unknown) {
    const data = parseInput(productInput, input);
    const current = await getOwnProduct(countryCode, id);
    assertCanChange(ctx, countryCode, current.status, data.status);
    await Promise.all([
        assertCategory(countryCode, data.categoryId),
        assertCountryMedia(countryCode, data.mediaIds),
        assertSkuFree(countryCode, data.sku, id),
    ]);
    const translations = await cleanTranslations(countryCode, data.translations);
    // People without the prices permission never change the price, whatever they send.
    const canPrice = hasPermission(ctx, PERMISSIONS.pricesEdit, countryCode);

    await getDb().transaction(async (tx) => {
        await tx
            .update(schema.products)
            .set({
                sku: data.sku,
                categoryId: data.categoryId,
                priceUsd: canPrice && data.priceUsd !== undefined ? data.priceUsd : current.priceUsd,
                stock: data.stock,
                isNew: data.isNew,
                isFeatured: data.isFeatured,
                status: data.status,
                publishedAt: data.status === "published" && current.status !== "published" ? new Date() : current.publishedAt,
                updatedById: ctx.user.id,
            })
            .where(eq(schema.products.id, id));
        await tx.delete(schema.productTranslations).where(eq(schema.productTranslations.productId, id));
        await tx.insert(schema.productTranslations).values(translations.map((t) => ({...t, productId: id})));
        await tx.delete(schema.productMedia).where(eq(schema.productMedia.productId, id));
        if (data.mediaIds.length) {
            await tx.insert(schema.productMedia).values(data.mediaIds.map((mediaId, sortOrder) => ({productId: id, mediaId, sortOrder})));
        }
    });
}

/** Changes only the status, e.g. "send to review" or "publish" from the list. */
export async function setProductStatus(ctx: AdminContext, countryCode: string, id: number, status: ContentStatus) {
    if (!(CONTENT_STATUSES as readonly string[]).includes(status)) throw new ActionError("invalid");
    const current = await getOwnProduct(countryCode, id);
    assertCanChange(ctx, countryCode, current.status, status);
    await getDb()
        .update(schema.products)
        .set({
            status,
            publishedAt: status === "published" && current.status !== "published" ? new Date() : current.publishedAt,
            updatedById: ctx.user.id,
        })
        .where(eq(schema.products.id, id));
    return current.status;
}

export async function deleteProduct(ctx: AdminContext, countryCode: string, id: number) {
    const current = await getOwnProduct(countryCode, id);
    assertCanChange(ctx, countryCode, current.status, current.status);
    await getDb().delete(schema.products).where(eq(schema.products.id, id));
    return current;
}

/** Quick search for pickers (e.g. adding products to a collection). */
export async function searchProducts(countryCode: string, lang: string, q: string, limit = 20) {
    const result = await listProducts(countryCode, lang, {q});
    return result.rows.slice(0, limit).map(({id, sku, name, thumbnail, status}) => ({id, sku, name, thumbnail, status}));
}
