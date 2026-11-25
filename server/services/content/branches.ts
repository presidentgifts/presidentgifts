import "server-only";

import {and, asc, eq, inArray} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import type {AdminContext} from "@/server/auth/session";
import {getCountryLanguages} from "@/server/services/catalog/common";
import {assertCanEditPages} from "./pages";

const coordinate = (max: number) => z.number().min(-max).max(max);

export const branchInput = z.object({
    latitude: coordinate(90),
    longitude: coordinate(180),
    phone: z.string().trim().max(32).transform((v) => v || null),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(100000),
    translations: z
        .array(
            z.object({
                languageCode: z.string().min(2).max(8),
                address: z.string().trim().max(255),
                workingHours: z.string().trim().max(128).optional().default(""),
            }),
        )
        .max(10),
});

export type BranchInput = z.input<typeof branchInput>;

export async function listBranches(countryCode: string) {
    const db = getDb();
    const rows = await db
        .select()
        .from(schema.branches)
        .where(eq(schema.branches.countryCode, countryCode))
        .orderBy(asc(schema.branches.sortOrder), asc(schema.branches.id));
    const ids = rows.map((r) => r.id);
    const translations = ids.length
        ? await db.select().from(schema.branchTranslations).where(inArray(schema.branchTranslations.branchId, ids))
        : [];
    return rows.map((row) => ({
        id: row.id,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        phone: row.phone,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        translations: translations
            .filter((t) => t.branchId === row.id)
            .map((t) => ({languageCode: t.languageCode, address: t.address, workingHours: t.workingHours})),
    }));
}

export type BranchView = Awaited<ReturnType<typeof listBranches>>[number];

/** Branches are shown on the site right away, so they are edited by people who can publish content. */
export async function saveBranch(ctx: AdminContext, countryCode: string, id: number | null, input: unknown) {
    const data = parseInput(branchInput, input);
    assertCanEditPages(ctx, countryCode);

    const {defaultLanguageCode, languages} = await getCountryLanguages(countryCode);
    const allowed = new Set(languages.map((l) => l.code));
    const translations = data.translations
        .filter((t) => allowed.has(t.languageCode) && t.address !== "")
        .map((t) => ({languageCode: t.languageCode, address: t.address, workingHours: t.workingHours || null}));
    if (!translations.some((t) => t.languageCode === defaultLanguageCode)) {
        throw new ActionError("nameRequired", `name.${defaultLanguageCode}`);
    }

    const values = {
        latitude: String(data.latitude),
        longitude: String(data.longitude),
        phone: data.phone,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedById: ctx.user.id,
    };

    return getDb().transaction(async (tx) => {
        let branchId = id;
        if (branchId === null) {
            const [row] = await tx.insert(schema.branches).values({...values, countryCode}).returning({id: schema.branches.id});
            branchId = row.id;
        } else {
            const [row] = await tx
                .update(schema.branches)
                .set(values)
                .where(and(eq(schema.branches.id, branchId), eq(schema.branches.countryCode, countryCode)))
                .returning({id: schema.branches.id});
            if (!row) throw new ActionError("notFound");
            await tx.delete(schema.branchTranslations).where(eq(schema.branchTranslations.branchId, branchId));
        }
        await tx.insert(schema.branchTranslations).values(translations.map((t) => ({...t, branchId: branchId!})));
        return branchId;
    });
}

export async function deleteBranch(ctx: AdminContext, countryCode: string, id: number) {
    assertCanEditPages(ctx, countryCode);
    const [row] = await getDb()
        .delete(schema.branches)
        .where(and(eq(schema.branches.id, id), eq(schema.branches.countryCode, countryCode)))
        .returning({id: schema.branches.id});
    if (!row) throw new ActionError("notFound");
}
