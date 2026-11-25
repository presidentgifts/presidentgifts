"use server";

import {requireSuperAdmin} from "@/server/auth/access";
import {logAudit} from "@/server/audit";
import {ActionResult, runAction} from "@/server/admin-action";
import {createLanguage, deleteLanguage, LanguageInput, updateLanguage} from "@/server/services/reference";

export async function createLanguageAction(input: LanguageInput): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireSuperAdmin();
        const data = await createLanguage(input);
        await logAudit({userId: ctx.user.id, action: "language.create", entityType: "language", entityId: data.code, changes: data});
    });
}

export async function updateLanguageAction(code: string, input: Omit<LanguageInput, "code">): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireSuperAdmin();
        const data = await updateLanguage(code, input);
        await logAudit({userId: ctx.user.id, action: "language.update", entityType: "language", entityId: code, changes: data});
    });
}

export async function deleteLanguageAction(code: string): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireSuperAdmin();
        const row = await deleteLanguage(code);
        await logAudit({userId: ctx.user.id, action: "language.delete", entityType: "language", entityId: code, changes: row});
    });
}
