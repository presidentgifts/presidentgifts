import "server-only";

import {and, count, desc, eq, inArray} from "drizzle-orm";
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
    CONTENT_WORKFLOW,
    getMediaViews,
    pickName,
    translationsInput,
} from "@/server/services/catalog/common";

export const NEWS_PAGE_SIZE = 20;

export const newsInput = z.object({
    status: z.enum(CONTENT_STATUSES),
    imageId: z.string().uuid().nullable(),
    pageImageId: z.string().uuid().nullable(),
    instagramLink: z
        .string()
        .trim()
        .max(512)
        .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v))
        .transform((v) => v || null),
    /** yyyy-mm-dd, or empty to use the date of publishing. */
    publishedAt: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v))
        .transform((v) => (v ? new Date(`${v}T09:00:00Z`) : null)),
    /** `name` is the title of the news item. */
    translations: translationsInput(255),
});

export type NewsInput = z.input<typeof newsInput>;

export async function listNews(countryCode: string, lang: string, page = 1) {
    const db = getDb();
    const where = eq(schema.news.countryCode, countryCode);
    const [rows, [{value: total}]] = await Promise.all([
        db
            .select()
            .from(schema.news)
            .where(where)
            .orderBy(desc(schema.news.publishedAt), desc(schema.news.id))
            .limit(NEWS_PAGE_SIZE)
            .offset((Math.max(1, page) - 1) * NEWS_PAGE_SIZE),
        db.select({value: count()}).from(schema.news).where(where),
    ]);
    const ids = rows.map((r) => r.id);
    const [titles, images] = await Promise.all([
        ids.length
            ? db
                .select({newsId: schema.newsTranslations.newsId, languageCode: schema.newsTranslations.languageCode, name: schema.newsTranslations.title})
                .from(schema.newsTranslations)
                .where(inArray(schema.newsTranslations.newsId, ids))
            : Promise.resolve([]),
        getMediaViews(rows.map((r) => r.imageId)),
    ]);

    return {
        total: Number(total),
        rows: rows.map((row) => ({
            id: row.id,
            title: pickName(titles.filter((t) => t.newsId === row.id), lang),
            status: row.status,
            image: row.imageId ? images.get(row.imageId)?.url ?? null : null,
            publishedAt: row.publishedAt?.toISOString() ?? null,
            viewCount: row.viewCount,
            updatedAt: row.updatedAt.toISOString(),
        })),
    };
}

export async function getNewsDetail(id: number) {
    const db = getDb();
    const [item] = await db.select().from(schema.news).where(eq(schema.news.id, id));
    if (!item) return null;
    const [translations, images] = await Promise.all([
        db.select().from(schema.newsTranslations).where(eq(schema.newsTranslations.newsId, id)),
        getMediaViews([item.imageId, item.pageImageId]),
    ]);
    return {
        item,
        image: item.imageId ? images.get(item.imageId) ?? null : null,
        pageImage: item.pageImageId ? images.get(item.pageImageId) ?? null : null,
        translations: translations.map((t) => ({languageCode: t.languageCode, name: t.title, description: t.description})),
    };
}

async function getOwn(countryCode: string, id: number) {
    const [row] = await getDb()
        .select()
        .from(schema.news)
        .where(and(eq(schema.news.id, id), eq(schema.news.countryCode, countryCode)));
    if (!row) throw new ActionError("notFound");
    return row;
}

function publishDate(status: ContentStatus, requested: Date | null, current: Date | null) {
    if (requested) return requested;
    if (status === "published") return current ?? new Date();
    return current;
}

export async function saveNews(ctx: AdminContext, countryCode: string, id: number | null, input: unknown) {
    const data = parseInput(newsInput, input);
    const current = id === null ? null : await getOwn(countryCode, id);
    assertCanChange(ctx, countryCode, current?.status ?? null, data.status, CONTENT_WORKFLOW);
    await assertCountryMedia(countryCode, [data.imageId, data.pageImageId].filter((v): v is string => Boolean(v)));
    const translations = (await cleanTranslations(countryCode, data.translations)).map((t) => ({
        languageCode: t.languageCode,
        title: t.name,
        description: t.description,
    }));

    const values = {
        status: data.status,
        imageId: data.imageId,
        pageImageId: data.pageImageId,
        instagramLink: data.instagramLink,
        publishedAt: publishDate(data.status, data.publishedAt, current?.publishedAt ?? null),
        updatedById: ctx.user.id,
    };

    return getDb().transaction(async (tx) => {
        let newsId = id;
        if (newsId === null) {
            const [row] = await tx
                .insert(schema.news)
                .values({...values, countryCode, createdById: ctx.user.id})
                .returning({id: schema.news.id});
            newsId = row.id;
        } else {
            await tx.update(schema.news).set(values).where(eq(schema.news.id, newsId));
            await tx.delete(schema.newsTranslations).where(eq(schema.newsTranslations.newsId, newsId));
        }
        await tx.insert(schema.newsTranslations).values(translations.map((t) => ({...t, newsId: newsId!})));
        return newsId;
    });
}

export async function deleteNews(ctx: AdminContext, countryCode: string, id: number) {
    const current = await getOwn(countryCode, id);
    assertCanChange(ctx, countryCode, current.status, current.status, CONTENT_WORKFLOW);
    await getDb().delete(schema.news).where(eq(schema.news.id, id));
}
