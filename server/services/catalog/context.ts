import "server-only";

import {ForbiddenError, getAccessibleCountries, getActiveCountryCode, hasPermission, requireAdmin} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {getAdminLanguage} from "@/server/admin-locale";
import {getAdminDictionary} from "@/lib/admin-i18n";
import {CATALOG_WORKFLOW, getCountryLanguages, Workflow} from "./common";

/**
 * Everything a catalog or content page needs about the person and the country
 * they work in. `countryCode` defaults to the country chosen in the top bar;
 * pages of a single item pass the item's own country. `country` is null when no
 * country is available.
 */
export async function getCatalogContext(countryCode?: string, workflow: Workflow = CATALOG_WORKFLOW) {
    const ctx = await requireAdmin();
    const lang = await getAdminLanguage();
    const texts = getAdminDictionary(lang);

    const code = countryCode ?? (await getActiveCountryCode(ctx));
    if (!code) return {ctx, lang, texts, country: null};
    if (!hasPermission(ctx, workflow.edit, code)) throw new ForbiddenError();

    const [countries, {defaultLanguageCode, languages}] = await Promise.all([getAccessibleCountries(ctx), getCountryLanguages(code)]);

    return {
        ctx,
        lang,
        texts,
        country: {
            code,
            name: countries.find((c) => c.code === code)?.name ?? code,
            defaultLanguageCode,
            languages,
            canPublish: hasPermission(ctx, workflow.publish, code),
            canEditPrices: hasPermission(ctx, PERMISSIONS.pricesEdit, code),
        },
    };
}

export type CatalogCountry = NonNullable<Awaited<ReturnType<typeof getCatalogContext>>["country"]>;
