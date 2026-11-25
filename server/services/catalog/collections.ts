import "server-only";

import {and, asc, count, eq, inArray} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import type {AdminContext} from "@/server/auth/session";
import {
    assertCanChange,
    assertCountryMedia,
    cleanTranslations,
    CONTENT_STATUSES,
    getMediaViews,
    pickName,
    translationsInput,
} from "./common";

export const collectionInput = z.object({
    status: z.enum(CONTENT_STATUSES),
    sortOrder: z.number().int().min(0).max(100000),
    imageId: z.string().uuid().nullable(),
    translations: translationsInput(160),
    productIds: z.array(z.number().int().positive()).max(500),
});

export type CollectionInput = z.input<typeof collectionInput>;

export async function listCollections(countryCode: string, lang: string) {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.collections)
        .where(eq(schema.collections.countryCode, countryCode))
        .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.id));
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const [translations, counts, images] = await Promise.all([
        db
            .select({collectionId: schema.collectionTranslations.collectionId, languageCode: schema.collectionTranslations.languageCode, name: schema.collectionTranslations.name})
            .from(schema.collectionTranslations)
            .where(inArray(schema.collectionTranslations.collectionId, ids)),
        db
            .select({collectionId: schema.collectionProducts.collectionId, value: count()})
            .from(schema.collectionProducts)
            .where(inArray(schema.collectionProducts.collectionId, ids))
            .groupBy(schema.collectionProducts.collectionId),
        getMediaViews(rows.map((r) => r.imageId)),
    ]);

    return rows.map((row) => ({
        id: row.id,
        name: pickName(translations.filter((t) => t.collectionId === row.id), lang),
        status: row.status,
        sortOrder: row.sortOrder,
        image: row.imageId ? images.get(row.imageId)?.url ?? null : null,
        products: Number(counts.find((c) => c.collectionId === row.id)?.value ?? 0),
        updatedAt: row.updatedAt.toISOString(),
    }));
}

export async function getCollectionDetail(id: number, lang: string) {
    const db = getDb();
    const [collection] = await db.select().from(schema.collections).where(eq(schema.collections.id, id));
    if (!collection) return null;

    const [translations, items, images] = await Promise.all([
        db.select().from(schema.collectionTranslations).where(eq(schema.collectionTranslations.collectionId, id)),
        db
            .select({id: schema.products.id, sku: schema.products.sku, status: schema.products.status})
            .from(schema.collectionProducts)
            .innerJoin(schema.products, eq(schema.products.id, schema.collectionProducts.productId))
            .where(eq(schema.collectionProducts.collectionId, id))
            .orderBy(asc(schema.collectionProducts.sortOrder)),
        getMediaViews([collection.imageId]),
    ]);

    const productIds = items.map((p) => p.id);
    const [names, firstMedia] = productIds.length
        ? await Promise.all([
            db
                .select({productId: schema.productTranslations.productId, languageCode: schema.productTranslations.languageCode, name: schema.productTranslations.name})
                .from(schema.productTranslations)
                .where(inArray(schema.productTranslations.productId, productIds)),
            db
                .selectDistinctOn([schema.productMedia.productId], {productId: schema.productMedia.productId, mediaId: schema.productMedia.mediaId})
                .from(schema.productMedia)
                .where(inArray(schema.productMedia.productId, productIds))
                .orderBy(schema.productMedia.productId, asc(schema.productMedia.sortOrder)),
        ])
        : [[], []];
    const thumbs = await getMediaViews(firstMedia.map((m) => m.mediaId));

    return {
        collection,
        image: collection.imageId ? images.get(collection.imageId) ?? null : null,
        translations: translations.map(({languageCode, name, description}) => ({languageCode, name, description})),
        products: items.map((p) => {
            const mediaId = firstMedia.find((m) => m.productId === p.id)?.mediaId;
            return {
                ...p,
                name: pickName(names.filter((n) => n.productId === p.id), lang),
                thumbnail: mediaId ? thumbs.get(mediaId)?.url ?? null : null,
            };
        }),
    };
}

async function assertCountryProducts(countryCode: string, ids: number[]) {
    if (ids.length === 0) return;
    if (new Set(ids).size !== ids.length) throw new ActionError("invalid", "productIds");
    const rows = await getDb()
        .select({id: schema.products.id})
        .from(schema.products)
        .where(and(inArray(schema.products.id, ids), eq(schema.products.countryCode, countryCode)));
    if (rows.length !== ids.length) throw new ActionError("invalid", "productIds");
}

async function getOwnCollection(countryCode: string, id: number) {
    const [row] = await getDb()
        .select()
        .from(schema.collections)
        .where(and(eq(schema.collections.id, id), eq(schema.collections.countryCode, countryCode)));
    if (!row) throw new ActionError("notFound");
    return row;
}

export async function createCollection(ctx: AdminContext, countryCode: string, input: unknown) {
    const data = parseInput(collectionInput, input);
    assertCanChange(ctx, countryCode, null, data.status);
    await assertCountryProducts(countryCode, data.productIds);
    if (data.imageId) await assertCountryMedia(countryCode, [data.imageId]);
    const translations = await cleanTranslations(countryCode, data.translations);

    return getDb().transaction(async (tx) => {
        const [row] = await tx
            .insert(schema.collections)
            .values({
                countryCode,
                status: data.status,
                sortOrder: data.sortOrder,
                imageId: data.imageId,
                createdById: ctx.user.id,
                updatedById: ctx.user.id,
            })
            .returning({id: schema.collections.id});
        await tx.insert(schema.collectionTranslations).values(translations.map((t) => ({...t, collectionId: row.id})));
        if (data.productIds.length) {
            await tx
                .insert(schema.collectionProducts)
                .values(data.productIds.map((productId, sortOrder) => ({collectionId: row.id, productId, sortOrder})));
        }
        return row.id;
    });
}

export async function updateCollection(ctx: AdminContext, countryCode: string, id: number, input: unknown) {
    const data = parseInput(collectionInput, input);
    const current = await getOwnCollection(countryCode, id);
    assertCanChange(ctx, countryCode, current.status, data.status);
    await assertCountryProducts(countryCode, data.productIds);
    if (data.imageId) await assertCountryMedia(countryCode, [data.imageId]);
    const translations = await cleanTranslations(countryCode, data.translations);

    await getDb().transaction(async (tx) => {
        await tx
            .update(schema.collections)
            .set({status: data.status, sortOrder: data.sortOrder, imageId: data.imageId, updatedById: ctx.user.id})
            .where(eq(schema.collections.id, id));
        await tx.delete(schema.collectionTranslations).where(eq(schema.collectionTranslations.collectionId, id));
        await tx.insert(schema.collectionTranslations).values(translations.map((t) => ({...t, collectionId: id})));
        await tx.delete(schema.collectionProducts).where(eq(schema.collectionProducts.collectionId, id));
        if (data.productIds.length) {
            await tx
                .insert(schema.collectionProducts)
                .values(data.productIds.map((productId, sortOrder) => ({collectionId: id, productId, sortOrder})));
        }
    });
}

export async function deleteCollection(ctx: AdminContext, countryCode: string, id: number) {
    const current = await getOwnCollection(countryCode, id);
    assertCanChange(ctx, countryCode, current.status, current.status);
    await getDb().delete(schema.collections).where(eq(schema.collections.id, id));
}
