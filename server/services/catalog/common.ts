import "server-only";

import {and, asc, eq, inArray} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError} from "@/server/admin-action";
import {hasPermission} from "@/server/auth/access";
import {Permission, PERMISSIONS} from "@/server/auth/permissions";
import type {AdminContext} from "@/server/auth/session";
import type {ContentStatus} from "@/server/db/schema";
import {mediaUrl} from "@/server/storage/media-storage";

export const CONTENT_STATUSES = ["draft", "review", "published", "archived"] as const satisfies readonly ContentStatus[];

/** Statuses a person without the publish permission may work with. */
const EDITOR_STATUSES: ContentStatus[] = ["draft", "review"];

export interface Workflow {
    edit: Permission;
    publish: Permission;
}

export const CATALOG_WORKFLOW: Workflow = {edit: PERMISSIONS.catalogEdit, publish: PERMISSIONS.catalogPublish};
export const CONTENT_WORKFLOW: Workflow = {edit: PERMISSIONS.contentEdit, publish: PERMISSIONS.contentPublish};

export function canPublish(ctx: AdminContext, countryCode: string, workflow = CATALOG_WORKFLOW) {
    return hasPermission(ctx, workflow.publish, countryCode);
}

/**
 * Checks that the person may change an item that currently has `current`
 * status and give it `next` status. Editors only touch drafts and items in review;
 * putting things on the site (or taking them off) needs the publish permission.
 */
export function assertCanChange(
    ctx: AdminContext,
    countryCode: string,
    current: ContentStatus | null,
    next: ContentStatus,
    workflow = CATALOG_WORKFLOW,
) {
    if (!hasPermission(ctx, workflow.edit, countryCode)) throw new ActionError("forbidden");
    if (canPublish(ctx, countryCode, workflow)) return;
    if (current !== null && !EDITOR_STATUSES.includes(current)) throw new ActionError("needsPublish");
    if (!EDITOR_STATUSES.includes(next)) throw new ActionError("needsPublish");
}

/** Languages enabled in the country, default first. */
export async function getCountryLanguages(countryCode: string) {
    const db = getDb();
    const [country] = await db
        .select({defaultLanguageCode: schema.countries.defaultLanguageCode})
        .from(schema.countries)
        .where(eq(schema.countries.code, countryCode));
    if (!country) throw new ActionError("notFound");

    const rows = await db
        .select({code: schema.languages.code, nativeName: schema.languages.nativeName})
        .from(schema.countryLanguages)
        .innerJoin(schema.languages, eq(schema.languages.code, schema.countryLanguages.languageCode))
        .where(eq(schema.countryLanguages.countryCode, countryCode))
        .orderBy(asc(schema.countryLanguages.sortOrder));

    const sorted = [
        ...rows.filter((r) => r.code === country.defaultLanguageCode),
        ...rows.filter((r) => r.code !== country.defaultLanguageCode),
    ];
    return {defaultLanguageCode: country.defaultLanguageCode, languages: sorted};
}

export const translationsInput = (nameMax: number) =>
    z
        .array(
            z.object({
                languageCode: z.string().min(2).max(8),
                name: z.string().trim().max(nameMax),
                description: z.string().trim().max(20000).optional().default(""),
            }),
        )
        .max(10);

export type TranslationInput = { languageCode: string; name: string; description?: string };

/**
 * Keeps translations for the country's languages that have a name, and requires
 * one in the country's main language.
 */
export async function cleanTranslations(countryCode: string, input: TranslationInput[]) {
    const {defaultLanguageCode, languages} = await getCountryLanguages(countryCode);
    const allowed = new Set(languages.map((l) => l.code));
    const rows = input
        .filter((t) => allowed.has(t.languageCode) && t.name.trim() !== "")
        .map((t) => ({languageCode: t.languageCode, name: t.name.trim(), description: t.description?.trim() || null}));
    if (new Set(rows.map((r) => r.languageCode)).size !== rows.length) throw new ActionError("invalid", "translations");
    if (!rows.some((r) => r.languageCode === defaultLanguageCode)) throw new ActionError("nameRequired", `name.${defaultLanguageCode}`);
    return rows;
}

/** Checks that all media ids exist and belong to the country. */
export async function assertCountryMedia(countryCode: string, ids: string[]) {
    if (ids.length === 0) return;
    if (!ids.every((id) => z.string().uuid().safeParse(id).success)) throw new ActionError("invalid", "media");
    const rows = await getDb()
        .select({id: schema.media.id})
        .from(schema.media)
        .where(and(inArray(schema.media.id, ids), eq(schema.media.countryCode, countryCode)));
    if (rows.length !== new Set(ids).size) throw new ActionError("invalid", "media");
}

export interface MediaView {
    id: string;
    url: string;
    contentType: string;
    width: number | null;
    height: number | null;
}

export async function getMediaViews(ids: (string | null)[]): Promise<Map<string, MediaView>> {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (unique.length === 0) return new Map();
    const rows = await getDb().select().from(schema.media).where(inArray(schema.media.id, unique));
    return new Map(
        rows.map((m) => [m.id, {id: m.id, url: mediaUrl(m.key), contentType: m.contentType, width: m.width, height: m.height}]),
    );
}

/** Picks the name in `lang`, else the first one available. */
export function pickName(translations: { languageCode: string; name: string }[], lang: string) {
    return translations.find((t) => t.languageCode === lang)?.name ?? translations[0]?.name ?? "";
}
