import Cookies from "js-cookie";
import {
    COOKIE_MAX_AGE,
    COOKIE_NAMES,
    CountryConfig,
    CurrencyCookie,
    defaultCountryCode,
    fallbackCurrency,
    getCountryConfig,
    Locale,
    normalizeLocale,
    parseCountryCookie,
    parseCurrencyCookie,
} from "@/lib/i18n-config";

const cookieOptions = {expires: COOKIE_MAX_AGE / 86400, path: "/", sameSite: "lax" as const};

export function getClientLocale(): Locale {
    return normalizeLocale(Cookies.get(COOKIE_NAMES.lang));
}

export function getClientCountryCode(): string {
    return parseCountryCookie(Cookies.get(COOKIE_NAMES.country))?.code ?? defaultCountryCode;
}

export function getClientCurrency(): CurrencyCookie {
    return (
        parseCurrencyCookie(Cookies.get(COOKIE_NAMES.currency)) ??
        getCountryConfig(getClientCountryCode())?.currency ??
        fallbackCurrency
    );
}

export function getClientLocaleContext() {
    const lang = getClientLocale();
    return {
        lang,
        langCode: lang.toUpperCase(),
        countryCode: getClientCountryCode(),
        currencyCode: getClientCurrency().code,
    };
}

export function setLangCookie(lang: Locale) {
    Cookies.set(COOKIE_NAMES.lang, lang, cookieOptions);
}

export function setCurrencyCookie(currency: CurrencyCookie) {
    Cookies.set(COOKIE_NAMES.currency, JSON.stringify(currency), cookieOptions);
}

export function setCountryCookie(country: { code: string; name: string }) {
    Cookies.set(COOKIE_NAMES.country, JSON.stringify(country), cookieOptions);
}

/**
 * Switches the whole site to another country: country cookie, that country's
 * currency and language. Returns the locale the page should be opened in.
 */
export function applyCountry(country: { code: string; name: string }): Locale | null {
    setCountryCookie(country);
    const config: CountryConfig | undefined = getCountryConfig(country.code);
    if (!config) return null;
    setCurrencyCookie(config.currency);
    setLangCookie(config.locale);
    return config.locale;
}
