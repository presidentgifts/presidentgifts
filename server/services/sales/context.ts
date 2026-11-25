import "server-only";

import {ForbiddenError, getAccessibleCountries, getActiveCountryCode, hasPermission, requireAdmin} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {getAdminLanguage} from "@/server/admin-locale";
import {getAdminDictionary} from "@/lib/admin-i18n";

/** The person and the country for sales pages (orders, customers, inquiries). */
export async function getSalesContext(countryCode?: string) {
    const ctx = await requireAdmin();
    const lang = await getAdminLanguage();
    const texts = getAdminDictionary(lang);
    const code = countryCode ?? (await getActiveCountryCode(ctx));
    if (!code) return {ctx, lang, texts, country: null};
    if (!hasPermission(ctx, PERMISSIONS.ordersView, code)) throw new ForbiddenError();
    const countries = await getAccessibleCountries(ctx);
    return {
        ctx,
        lang,
        texts,
        locale: lang === "en" ? "en-GB" : lang === "ru" ? "ru-RU" : "uz-UZ",
        country: {
            code,
            name: countries.find((c) => c.code === code)?.name ?? code,
            canManage: hasPermission(ctx, PERMISSIONS.ordersManage, code),
        },
    };
}
