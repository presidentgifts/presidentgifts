"use server";

import {getActiveCountryCode, requireAdmin} from "@/server/auth/access";
import {logAudit} from "@/server/audit";
import {ActionError, ActionResult, runAction} from "@/server/admin-action";
import {
    createStaff,
    CreateStaffResult,
    removeStaffFromCountry,
    resetStaffPassword,
    setStaffRole,
    updateStaffProfile,
} from "@/server/services/staff";

export type StaffCreateForm =
    | { kind: "country"; email: string; fullName: string; password: string; roleKey: string }
    | { kind: "super"; email: string; fullName: string; password: string };

/** Country staff actions always work on the country chosen in the top bar. */
async function activeCountry() {
    const ctx = await requireAdmin();
    const countryCode = await getActiveCountryCode(ctx);
    return {ctx, countryCode};
}

export async function createStaffAction(input: StaffCreateForm): Promise<ActionResult<CreateStaffResult>> {
    return runAction(async () => {
        const {ctx, countryCode} = await activeCountry();
        const forCountry = input.kind === "country" ? countryCode : null;
        const result = await createStaff(ctx, forCountry, input);
        await logAudit({
            userId: ctx.user.id,
            countryCode: forCountry,
            action: result.existing ? "staff.add_existing" : "staff.create",
            entityType: "admin_user",
            entityId: result.userId,
            changes: {
                email: input.email,
                fullName: input.fullName,
                kind: input.kind,
                roleKey: input.kind === "country" ? input.roleKey : undefined,
            },
        });
        return result;
    });
}

export async function updateStaffProfileAction(
    userId: string,
    input: { fullName: string; isActive: boolean },
): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireAdmin();
        const data = await updateStaffProfile(ctx, userId, input);
        await logAudit({userId: ctx.user.id, action: "staff.update", entityType: "admin_user", entityId: userId, changes: data});
    });
}

export async function setStaffRoleAction(userId: string, roleKey: string): Promise<ActionResult> {
    return runAction(async () => {
        const {ctx, countryCode} = await activeCountry();
        if (!countryCode) throw new ActionError("forbidden");
        await setStaffRole(ctx, userId, countryCode, roleKey);
        await logAudit({userId: ctx.user.id, countryCode, action: "staff.role", entityType: "admin_user", entityId: userId, changes: {roleKey}});
    });
}

export async function removeStaffFromCountryAction(userId: string): Promise<ActionResult> {
    return runAction(async () => {
        const {ctx, countryCode} = await activeCountry();
        if (!countryCode) throw new ActionError("forbidden");
        await removeStaffFromCountry(ctx, userId, countryCode);
        await logAudit({userId: ctx.user.id, countryCode, action: "staff.remove", entityType: "admin_user", entityId: userId});
    });
}

export async function resetStaffPasswordAction(userId: string): Promise<ActionResult<string>> {
    return runAction(async () => {
        const ctx = await requireAdmin();
        const password = await resetStaffPassword(ctx, userId);
        await logAudit({userId: ctx.user.id, action: "staff.reset_password", entityType: "admin_user", entityId: userId});
        return password;
    });
}
