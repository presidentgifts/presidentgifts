import "server-only";

import {cookies} from "next/headers";
import {ADMIN_LANG_COOKIE, AdminLanguage, getAdminDictionary, isAdminLanguage} from "@/lib/admin-i18n";
import {getAdminContext} from "@/server/auth/session";

/** Admin panel language: the user's saved choice, else the cookie, else Uzbek. */
export async function getAdminLanguage(): Promise<AdminLanguage> {
    const ctx = await getAdminContext();
    if (ctx && isAdminLanguage(ctx.user.uiLanguage)) return ctx.user.uiLanguage;
    const fromCookie = (await cookies()).get(ADMIN_LANG_COOKIE)?.value;
    return isAdminLanguage(fromCookie) ? fromCookie : "uz";
}

export async function getAdminTexts() {
    return getAdminDictionary(await getAdminLanguage());
}
