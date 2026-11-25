import "server-only";

import {cookies} from "next/headers";
import {
    COOKIE_NAMES,
    defaultCountryCode,
    fallbackCurrency,
    getCountryConfig,
    Locale,
    normalizeLocale,
    parseCountryCookie,
    parseCurrencyCookie,
} from "@/lib/i18n-config";

export interface LocaleContext {
    lang: Locale;
    /** Upper-case language code, as the backend expects it (e.g. "UZ"). */
    langCode: string;
    countryCode: string;
    countryName: string;
    currencyCode: string;
}

/** Reads language / country / currency for the current request from cookies (set by middleware). */
export async function getLocaleContext(): Promise<LocaleContext> {
    const store = await cookies();

    const lang = normalizeLocale(store.get(COOKIE_NAMES.lang)?.value);
    const country = parseCountryCookie(store.get(COOKIE_NAMES.country)?.value);
    const countryCode = country?.code ?? defaultCountryCode;
    const currency =
        parseCurrencyCookie(store.get(COOKIE_NAMES.currency)?.value) ??
        getCountryConfig(countryCode)?.currency ??
        fallbackCurrency;

    return {
        lang,
        langCode: lang.toUpperCase(),
        countryCode,
        countryName: country?.name ?? getCountryConfig(countryCode)?.name ?? countryCode,
        currencyCode: currency.code,
    };
}
