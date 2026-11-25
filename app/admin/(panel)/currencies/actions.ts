"use server";

import {requireSuperAdmin} from "@/server/auth/access";
import {logAudit} from "@/server/audit";
import {ActionResult, runAction} from "@/server/admin-action";
import {createCurrency, CurrencyInput, deleteCurrency, updateCurrency} from "@/server/services/reference";

export async function createCurrencyAction(input: CurrencyInput): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireSuperAdmin();
        const data = await createCurrency(input);
        await logAudit({userId: ctx.user.id, action: "currency.create", entityType: "currency", entityId: data.code, changes: data});
    });
}

export async function updateCurrencyAction(code: string, input: Omit<CurrencyInput, "code">): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireSuperAdmin();
        const data = await updateCurrency(code, input);
        await logAudit({userId: ctx.user.id, action: "currency.update", entityType: "currency", entityId: code, changes: data});
    });
}

export async function deleteCurrencyAction(code: string): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireSuperAdmin();
        const row = await deleteCurrency(code);
        await logAudit({userId: ctx.user.id, action: "currency.delete", entityType: "currency", entityId: code, changes: row});
    });
}
