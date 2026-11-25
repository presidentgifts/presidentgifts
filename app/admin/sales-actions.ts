"use server";

import {requireAdmin} from "@/server/auth/access";
import {logAudit} from "@/server/audit";
import {ActionError, ActionResult, runAction} from "@/server/admin-action";
import type {OrderStatus} from "@/server/db/schema";
import {updateOrder} from "@/server/services/sales/orders";
import {setCustomerActive} from "@/server/services/sales/customers";
import {setInquiryStatus} from "@/server/services/sales/inquiries";

export async function updateOrderAction(id: number, input: { status: OrderStatus; note: string }): Promise<ActionResult> {
    return runAction(async () => {
        if (!Number.isInteger(id)) throw new ActionError("invalid");
        const ctx = await requireAdmin();
        const result = await updateOrder(ctx, id, input);
        if (result.changed) {
            await logAudit({
                userId: ctx.user.id,
                countryCode: result.order.countryCode,
                action: result.from !== result.to ? "order.status" : "order.note",
                entityType: "order",
                entityId: id,
                changes: {from: result.from, to: result.to, note: input.note || undefined},
            });
        }
    });
}

export async function setCustomerActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireAdmin();
        await setCustomerActive(ctx, id, isActive);
        await logAudit({userId: ctx.user.id, action: isActive ? "customer.unblock" : "customer.block", entityType: "customer", entityId: id});
    });
}

export async function setInquiryStatusAction(id: number, status: "new" | "done"): Promise<ActionResult> {
    return runAction(async () => {
        if (!Number.isInteger(id) || (status !== "new" && status !== "done")) throw new ActionError("invalid");
        const ctx = await requireAdmin();
        const row = await setInquiryStatus(ctx, id, status);
        await logAudit({userId: ctx.user.id, countryCode: row.countryCode, action: `inquiry.${status}`, entityType: "inquiry", entityId: id});
    });
}
