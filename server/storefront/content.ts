import "server-only";

import {and, asc, desc, eq, inArray, sql} from "drizzle-orm";
import {getDb, schema} from "@/server/db/client";
import {getMediaViews, MediaView} from "@/server/services/catalog/common";
import {CountryInfo, pickTranslation} from "./catalog";

export interface SitePageEntry {
    key: string;
    type: "text" | "media";
    info: string | null;
    order: number;
    /** Value per language (text entries). */
    values: Record<string, string>;
    media: MediaView[];
    createdAt: Date;
    updatedAt: Date;
}

export async function getPageEntriesForSite(country: CountryInfo, pageKey: string): Promise<SitePageEntry[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.pageEntries)
        .where(and(eq(schema.pageEntries.countryCode, country.code), eq(schema.pageEntries.pageKey, pageKey)))
        .orderBy(asc(schema.pageEntries.sortOrder));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [translations, links] = await Promise.all([
        db.select().from(schema.pageEntryTranslations).where(inArray(schema.pageEntryTranslations.entryId, ids)),
        db.select().from(schema.pageEntryMedia).where(inArray(schema.pageEntryMedia.entryId, ids)).orderBy(asc(schema.pageEntryMedia.sortOrder)),
    ]);
    const media = await getMediaViews(links.map((l) => l.mediaId));
    return rows.map((row) => ({
        key: row.key,
        type: row.type,
        info: row.info,
        order: row.sortOrder,
        values: Object.fromEntries(translations.filter((t) => t.entryId === row.id).map((t) => [t.languageCode, t.value])),
        media: links.filter((l) => l.entryId === row.id).map((l) => media.get(l.mediaId)).filter((m): m is MediaView => Boolean(m)),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }));
}

/** A page as key → text in one language (falling back to the main language). Media entries give the first file. */
export function pageAsMap(entries: SitePageEntry[], lang: string, fallback: string, mediaPath: (m: MediaView) => string) {
    const map: Record<string, string> = {};
    for (const entry of entries) {
        if (entry.type === "media") {
            if (entry.media[0]) map[entry.key] = mediaPath(entry.media[0]);
        } else {
            const value = entry.values[lang] ?? entry.values[fallback] ?? Object.values(entry.values)[0];
            if (value !== undefined) map[entry.key] = value;
        }
    }
    return map;
}

/* ------------------------------------------------------------------ */
/* News                                                                */
/* ------------------------------------------------------------------ */

export async function getSiteNews(country: CountryInfo, lang: string, onlyId?: number) {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.news)
        .where(and(eq(schema.news.countryCode, country.code), eq(schema.news.status, "published"), onlyId ? eq(schema.news.id, onlyId) : undefined))
        .orderBy(desc(schema.news.publishedAt), desc(schema.news.id))
        .limit(onlyId ? 1 : 100);
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [translations, images] = await Promise.all([
        db.select().from(schema.newsTranslations).where(inArray(schema.newsTranslations.newsId, ids)),
        getMediaViews(rows.flatMap((r) => [r.imageId, r.pageImageId])),
    ]);
    return rows.map((row) => {
        const own = translations.filter((t) => t.newsId === row.id);
        const tr = pickTranslation(own, lang, country.defaultLanguageCode);
        return {
            ...row,
            title: tr?.title ?? "",
            description: tr?.description ?? "",
            translations: own,
            image: row.imageId ? images.get(row.imageId) ?? null : null,
            pageImage: row.pageImageId ? images.get(row.pageImageId) ?? null : null,
        };
    });
}

export async function countNewsView(id: number) {
    await getDb().update(schema.news).set({viewCount: sql`${schema.news.viewCount} + 1`}).where(eq(schema.news.id, id));
}

/* ------------------------------------------------------------------ */
/* Branches                                                            */
/* ------------------------------------------------------------------ */

export async function getSiteBranches(country: CountryInfo) {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.branches)
        .where(and(eq(schema.branches.countryCode, country.code), eq(schema.branches.isActive, true)))
        .orderBy(asc(schema.branches.sortOrder), asc(schema.branches.id));
    if (rows.length === 0) return [];
    const translations = await db
        .select()
        .from(schema.branchTranslations)
        .where(inArray(schema.branchTranslations.branchId, rows.map((r) => r.id)));
    return rows.map((row) => ({
        id: row.id,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        phone: row.phone,
        translations: translations.filter((t) => t.branchId === row.id),
    }));
}
