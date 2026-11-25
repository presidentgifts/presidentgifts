"use server";

import {requirePermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {logAudit} from "@/server/audit";
import {ActionError, ActionResult, runAction} from "@/server/admin-action";
import {deletePageEntry, savePageEntries} from "@/server/services/content/pages";
import {deleteNews, NewsInput, saveNews} from "@/server/services/content/news";
import {BranchInput, deleteBranch, saveBranch} from "@/server/services/content/branches";

function assertCountry(code: string) {
    if (!/^[A-Z]{2}$/.test(code)) throw new ActionError("invalid");
}

export interface PageEntryForm {
    key: string;
    type: "text" | "media";
    info?: string | null;
    values: Record<string, string>;
    mediaIds: string[];
}

export async function savePageEntriesAction(countryCode: string, pageKey: string, entries: PageEntryForm[]): Promise<ActionResult> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.contentEdit, countryCode);
        await savePageEntries(ctx, countryCode, {pageKey, entries});
        await logAudit({
            userId: ctx.user.id,
            countryCode,
            action: "page.save",
            entityType: "page",
            entityId: pageKey,
            changes: {keys: entries.map((e) => e.key)},
        });
    });
}

export async function deletePageEntryAction(countryCode: string, pageKey: string, key: string): Promise<ActionResult> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.contentEdit, countryCode);
        await deletePageEntry(ctx, countryCode, pageKey, key);
        await logAudit({userId: ctx.user.id, countryCode, action: "page.delete_key", entityType: "page", entityId: pageKey, changes: {key}});
    });
}

export async function saveNewsAction(countryCode: string, id: number | null, input: NewsInput): Promise<ActionResult<number>> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.contentEdit, countryCode);
        const savedId = await saveNews(ctx, countryCode, id, input);
        await logAudit({
            userId: ctx.user.id,
            countryCode,
            action: id === null ? "news.create" : "news.update",
            entityType: "news",
            entityId: savedId,
            changes: input,
        });
        return savedId;
    });
}

export async function deleteNewsAction(countryCode: string, id: number): Promise<ActionResult> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.contentEdit, countryCode);
        await deleteNews(ctx, countryCode, id);
        await logAudit({userId: ctx.user.id, countryCode, action: "news.delete", entityType: "news", entityId: id});
    });
}

export async function saveBranchAction(countryCode: string, id: number | null, input: BranchInput): Promise<ActionResult<number>> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.contentEdit, countryCode);
        const savedId = await saveBranch(ctx, countryCode, id, input);
        await logAudit({
            userId: ctx.user.id,
            countryCode,
            action: id === null ? "branch.create" : "branch.update",
            entityType: "branch",
            entityId: savedId,
            changes: input,
        });
        return savedId;
    });
}

export async function deleteBranchAction(countryCode: string, id: number): Promise<ActionResult> {
    return runAction(async () => {
        assertCountry(countryCode);
        const ctx = await requirePermission(PERMISSIONS.contentEdit, countryCode);
        await deleteBranch(ctx, countryCode, id);
        await logAudit({userId: ctx.user.id, countryCode, action: "branch.delete", entityType: "branch", entityId: id});
    });
}
