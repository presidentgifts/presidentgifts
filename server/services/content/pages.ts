import "server-only";

import {and, asc, count, eq, inArray} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import {hasPermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import type {AdminContext} from "@/server/auth/session";
import {assertCountryMedia, getCountryLanguages, getMediaViews, MediaView} from "@/server/services/catalog/common";
import {ENTRY_KEY_PATTERN, PAGE_KEY_PATTERN, PAGE_REGISTRY, registryPage} from "@/lib/page-registry";

/** Page texts go live as soon as they are saved, so changing them needs the publish permission. */
export function assertCanEditPages(ctx: AdminContext, countryCode: string) {
    if (!hasPermission(ctx, PERMISSIONS.contentPublish, countryCode)) throw new ActionError("forbidden");
}

export interface PageEntryView {
    /** Null for a key the site expects but nobody has filled in yet. */
    id: number | null;
    key: string;
    type: "text" | "media";
    multiline: boolean;
    info: string | null;
    /** From the list of keys the site reads (can't be deleted, only emptied). */
    known: boolean;
    values: Record<string, string>;
    media: MediaView[];
}

/** Page keys with the number of filled entries, known pages first. */
export async function listPages(countryCode: string) {
    const rows = await getDb()
        .select({pageKey: schema.pageEntries.pageKey, value: count()})
        .from(schema.pageEntries)
        .where(eq(schema.pageEntries.countryCode, countryCode))
        .groupBy(schema.pageEntries.pageKey);
    const counts = new Map(rows.map((r) => [r.pageKey, Number(r.value)]));
    const known = PAGE_REGISTRY.map((p) => ({key: p.key, known: true, entries: counts.get(p.key) ?? 0, expected: p.entries.length}));
    const custom = rows
        .filter((r) => !registryPage(r.pageKey))
        .map((r) => ({key: r.pageKey, known: false, entries: Number(r.value), expected: 0}))
        .sort((a, b) => a.key.localeCompare(b.key));
    return [...known, ...custom];
}

export async function getPageEntries(countryCode: string, pageKey: string): Promise<PageEntryView[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.pageEntries)
        .where(and(eq(schema.pageEntries.countryCode, countryCode), eq(schema.pageEntries.pageKey, pageKey)))
        .orderBy(asc(schema.pageEntries.sortOrder), asc(schema.pageEntries.key));
    const ids = rows.map((r) => r.id);

    const [translations, mediaLinks] = ids.length
        ? await Promise.all([
            db.select().from(schema.pageEntryTranslations).where(inArray(schema.pageEntryTranslations.entryId, ids)),
            db
                .select()
                .from(schema.pageEntryMedia)
                .where(inArray(schema.pageEntryMedia.entryId, ids))
                .orderBy(asc(schema.pageEntryMedia.sortOrder)),
        ])
        : [[], []];
    const mediaViews = await getMediaViews(mediaLinks.map((m) => m.mediaId));

    const registry = registryPage(pageKey)?.entries ?? [];
    const byKey = new Map(rows.map((r) => [r.key, r]));

    const toView = (key: string): PageEntryView => {
        const row = byKey.get(key);
        const known = registry.find((e) => e.key === key);
        return {
            id: row?.id ?? null,
            key,
            type: row?.type ?? known?.type ?? "text",
            multiline: known?.multiline ?? false,
            info: row?.info ?? null,
            known: Boolean(known),
            values: Object.fromEntries(translations.filter((t) => t.entryId === row?.id).map((t) => [t.languageCode, t.value])),
            media: mediaLinks
                .filter((m) => m.entryId === row?.id)
                .map((m) => mediaViews.get(m.mediaId))
                .filter((m): m is MediaView => Boolean(m)),
        };
    };

    // Known keys in their documented order, then any extra keys added by admins.
    const knownKeys = registry.map((e) => e.key);
    const extraKeys = rows.map((r) => r.key).filter((k) => !knownKeys.includes(k));
    return [...knownKeys, ...extraKeys].map(toView);
}

const entryInput = z.object({
    key: z.string().regex(ENTRY_KEY_PATTERN),
    type: z.enum(["text", "media"]),
    info: z.string().trim().max(255).nullable().optional(),
    values: z.record(z.string().min(2).max(8), z.string().max(20000)),
    mediaIds: z.array(z.string().uuid()).max(30),
});

const saveInput = z.object({
    pageKey: z.string().regex(PAGE_KEY_PATTERN),
    entries: z.array(entryInput).min(1).max(200),
});

/** Creates or updates the given entries of a page. Empty text values are removed. */
export async function savePageEntries(ctx: AdminContext, countryCode: string, input: unknown) {
    const data = parseInput(saveInput, input);
    assertCanEditPages(ctx, countryCode);

    const keys = data.entries.map((e) => e.key);
    if (new Set(keys).size !== keys.length) throw new ActionError("invalid", "key");
    const {languages} = await getCountryLanguages(countryCode);
    const allowed = new Set(languages.map((l) => l.code));
    await assertCountryMedia(countryCode, data.entries.flatMap((e) => e.mediaIds));

    await getDb().transaction(async (tx) => {
        for (const [index, entry] of data.entries.entries()) {
            const known = registryPage(data.pageKey)?.entries.find((e) => e.key === entry.key);
            const type = known?.type ?? entry.type;
            const [row] = await tx
                .insert(schema.pageEntries)
                .values({
                    countryCode,
                    pageKey: data.pageKey,
                    key: entry.key,
                    type,
                    info: entry.info ?? null,
                    sortOrder: known ? (registryPage(data.pageKey)?.entries.indexOf(known) ?? index) : 1000 + index,
                    updatedById: ctx.user.id,
                })
                .onConflictDoUpdate({
                    target: [schema.pageEntries.countryCode, schema.pageEntries.pageKey, schema.pageEntries.key],
                    set: {type, info: entry.info ?? null, updatedById: ctx.user.id, updatedAt: new Date()},
                })
                .returning({id: schema.pageEntries.id});

            await tx.delete(schema.pageEntryTranslations).where(eq(schema.pageEntryTranslations.entryId, row.id));
            const values = Object.entries(entry.values)
                .filter(([lang, value]) => allowed.has(lang) && value.trim() !== "")
                .map(([languageCode, value]) => ({entryId: row.id, languageCode, value}));
            if (type === "text" && values.length) await tx.insert(schema.pageEntryTranslations).values(values);

            await tx.delete(schema.pageEntryMedia).where(eq(schema.pageEntryMedia.entryId, row.id));
            if (type === "media" && entry.mediaIds.length) {
                await tx
                    .insert(schema.pageEntryMedia)
                    .values(entry.mediaIds.map((mediaId, sortOrder) => ({entryId: row.id, mediaId, sortOrder})));
            }
        }
    });
    return data;
}

export async function deletePageEntry(ctx: AdminContext, countryCode: string, pageKey: string, key: string) {
    assertCanEditPages(ctx, countryCode);
    if (registryPage(pageKey)?.entries.some((e) => e.key === key)) throw new ActionError("inUse");
    const [row] = await getDb()
        .delete(schema.pageEntries)
        .where(and(eq(schema.pageEntries.countryCode, countryCode), eq(schema.pageEntries.pageKey, pageKey), eq(schema.pageEntries.key, key)))
        .returning({id: schema.pageEntries.id});
    if (!row) throw new ActionError("notFound");
}
