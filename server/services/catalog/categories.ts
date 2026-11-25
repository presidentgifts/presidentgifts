import "server-only";

import {and, asc, count, eq, inArray} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import type {AdminContext} from "@/server/auth/session";
import type {ContentStatus} from "@/server/db/schema";
import {
    assertCanChange,
    assertCountryMedia,
    cleanTranslations,
    CONTENT_STATUSES,
    getMediaViews,
    MediaView,
    translationsInput,
} from "./common";

export const categoryInput = z.object({
    parentId: z.number().int().positive().nullable(),
    status: z.enum(CONTENT_STATUSES),
    sortOrder: z.number().int().min(0).max(100000),
    imageId: z.string().uuid().nullable(),
    translations: translationsInput(160),
});

export type CategoryInput = z.input<typeof categoryInput>;

export interface CategoryView {
    id: number;
    parentId: number | null;
    status: ContentStatus;
    sortOrder: number;
    image: MediaView | null;
    translations: { languageCode: string; name: string; description: string | null }[];
    products: number;
}

/** All categories of a country, flat, ordered for display (parents before children). */
export async function listCategories(countryCode: string): Promise<CategoryView[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.countryCode, countryCode))
        .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.id));
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const [translations, productCounts, images] = await Promise.all([
        db.select().from(schema.categoryTranslations).where(inArray(schema.categoryTranslations.categoryId, ids)),
        db
            .select({categoryId: schema.products.categoryId, value: count()})
            .from(schema.products)
            .where(inArray(schema.products.categoryId, ids))
            .groupBy(schema.products.categoryId),
        getMediaViews(rows.map((r) => r.imageId)),
    ]);
    const counts = new Map(productCounts.map((c) => [c.categoryId, Number(c.value)]));

    return rows.map((row) => ({
        id: row.id,
        parentId: row.parentId,
        status: row.status,
        sortOrder: row.sortOrder,
        image: row.imageId ? images.get(row.imageId) ?? null : null,
        translations: translations
            .filter((t) => t.categoryId === row.id)
            .map(({languageCode, name, description}) => ({languageCode, name, description})),
        products: counts.get(row.id) ?? 0,
    }));
}

async function getCategory(countryCode: string, id: number) {
    const [row] = await getDb()
        .select()
        .from(schema.categories)
        .where(and(eq(schema.categories.id, id), eq(schema.categories.countryCode, countryCode)));
    if (!row) throw new ActionError("notFound");
    return row;
}

/** The parent must be in the same country and must not be the category itself or one of its descendants. */
async function assertValidParent(countryCode: string, id: number | null, parentId: number | null) {
    if (parentId === null) return;
    const all = await getDb()
        .select({id: schema.categories.id, parentId: schema.categories.parentId})
        .from(schema.categories)
        .where(eq(schema.categories.countryCode, countryCode));
    const byId = new Map(all.map((c) => [c.id, c.parentId]));
    if (!byId.has(parentId)) throw new ActionError("invalid", "parentId");

    let cursor: number | null = parentId;
    for (let depth = 0; cursor !== null && depth < 100; depth++) {
        if (cursor === id) throw new ActionError("invalid", "parentId");
        cursor = byId.get(cursor) ?? null;
    }
}

export async function createCategory(ctx: AdminContext, countryCode: string, input: unknown) {
    const data = parseInput(categoryInput, input);
    assertCanChange(ctx, countryCode, null, data.status);
    await assertValidParent(countryCode, null, data.parentId);
    if (data.imageId) await assertCountryMedia(countryCode, [data.imageId]);
    const translations = await cleanTranslations(countryCode, data.translations);

    return getDb().transaction(async (tx) => {
        const [row] = await tx
            .insert(schema.categories)
            .values({
                countryCode,
                parentId: data.parentId,
                status: data.status,
                sortOrder: data.sortOrder,
                imageId: data.imageId,
                createdById: ctx.user.id,
                updatedById: ctx.user.id,
            })
            .returning({id: schema.categories.id});
        await tx.insert(schema.categoryTranslations).values(translations.map((t) => ({...t, categoryId: row.id})));
        return row.id;
    });
}

export async function updateCategory(ctx: AdminContext, countryCode: string, id: number, input: unknown) {
    const data = parseInput(categoryInput, input);
    const current = await getCategory(countryCode, id);
    assertCanChange(ctx, countryCode, current.status, data.status);
    await assertValidParent(countryCode, id, data.parentId);
    if (data.imageId) await assertCountryMedia(countryCode, [data.imageId]);
    const translations = await cleanTranslations(countryCode, data.translations);

    await getDb().transaction(async (tx) => {
        await tx
            .update(schema.categories)
            .set({
                parentId: data.parentId,
                status: data.status,
                sortOrder: data.sortOrder,
                imageId: data.imageId,
                updatedById: ctx.user.id,
            })
            .where(eq(schema.categories.id, id));
        await tx.delete(schema.categoryTranslations).where(eq(schema.categoryTranslations.categoryId, id));
        await tx.insert(schema.categoryTranslations).values(translations.map((t) => ({...t, categoryId: id})));
    });
}

/** Deletes a category. Its subcategories move up to its parent; its products are left without a category. */
export async function deleteCategory(ctx: AdminContext, countryCode: string, id: number) {
    const current = await getCategory(countryCode, id);
    assertCanChange(ctx, countryCode, current.status, current.status);

    await getDb().transaction(async (tx) => {
        await tx
            .update(schema.categories)
            .set({parentId: current.parentId})
            .where(eq(schema.categories.parentId, id));
        await tx.delete(schema.categories).where(eq(schema.categories.id, id));
    });
}
