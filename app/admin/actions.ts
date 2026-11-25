"use server";

import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {eq} from "drizzle-orm";
import {authenticateAdmin} from "@/server/auth/login";
import {createAdminSession, destroyAdminSession, getAdminContext} from "@/server/auth/session";
import {ADMIN_COUNTRY_COOKIE, hasCountryAccess} from "@/server/auth/access";
import {logAudit} from "@/server/audit";
import {getDb, schema} from "@/server/db/client";
import {ADMIN_LANG_COOKIE, isAdminLanguage} from "@/lib/admin-i18n";

export type LoginState = { error?: "required" | "invalid" | "locked" | "inactive" | "server"; email?: string };

const YEAR = 60 * 60 * 24 * 365;

/** Only allow redirects back into the admin panel. */
function safeNext(next: FormDataEntryValue | null): string {
    return typeof next === "string" && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) return {error: "required", email};

    let result;
    try {
        result = await authenticateAdmin(email, password);
    } catch (error) {
        console.error("Admin login failed:", error);
        return {error: "server", email};
    }

    if (!result.ok) return {error: result.error, email};

    await createAdminSession(result.userId);
    await logAudit({userId: result.userId, action: "auth.login"});
    redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
    const ctx = await getAdminContext();
    await destroyAdminSession();
    if (ctx) await logAudit({userId: ctx.user.id, action: "auth.logout"});
    redirect("/admin/login");
}

export async function setActiveCountryAction(countryCode: string) {
    const ctx = await getAdminContext();
    if (!ctx || !/^[A-Z]{2}$/.test(countryCode) || !hasCountryAccess(ctx, countryCode)) return;

    (await cookies()).set(ADMIN_COUNTRY_COOKIE, countryCode, {
        httpOnly: true,
        sameSite: "lax",
        path: "/admin",
        maxAge: YEAR,
        secure: process.env.NODE_ENV === "production",
    });
    revalidatePath("/admin", "layout");
}

export async function setAdminLanguageAction(lang: string) {
    if (!isAdminLanguage(lang)) return;

    (await cookies()).set(ADMIN_LANG_COOKIE, lang, {sameSite: "lax", path: "/admin", maxAge: YEAR});

    const ctx = await getAdminContext();
    if (ctx) {
        await getDb().update(schema.adminUsers).set({uiLanguage: lang}).where(eq(schema.adminUsers.id, ctx.user.id));
    }
    revalidatePath("/admin", "layout");
}
