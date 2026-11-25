export const i18n = {
    defaultLocale: "uz",
    locales: ["en", "uz", "ru", "tj", "az"],
} as const;

export type Locale = (typeof i18n)["locales"][number];

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (i18n.locales as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
    const lower = typeof value === "string" ? value.toLowerCase() : value;
    return isLocale(lower) ? lower : i18n.defaultLocale;
}

/* ------------------------------------------------------------------ */
/* Country configuration                                               */
/* ------------------------------------------------------------------ */

export interface CurrencyCookie {
    code: string;
    name?: string;
}

export interface CountryCookie {
    code: string;
    name: string;
}

export interface CountryConfig {
    code: string;
    name: string;
    /** Language the site opens in for visitors from this country. */
    locale: Locale;
    /** Currency the site opens in for visitors from this country. */
    currency: CurrencyCookie;
}

/**
 * Countries where President has branches. A visitor from one of these
 * countries gets the site in that country's language and currency, and all
 * backend data (prices, content, images) is requested for that country.
 */
export const countries: Record<string, CountryConfig> = {
    UZ: {code: "UZ", name: "Uzbekistan", locale: "uz", currency: {code: "UZS", name: "Uzbek Sum"}},
    TJ: {code: "TJ", name: "Tajikistan", locale: "tj", currency: {code: "TJS", name: "Tajik Somoni"}},
    AZ: {code: "AZ", name: "Azerbaijan", locale: "az", currency: {code: "AZN", name: "Azerbaijani Manat"}},
};

export const defaultCountryCode = "UZ";

/** Currency used for visitors from countries without a branch. */
export const fallbackCurrency: CurrencyCookie = {code: "USD", name: "US Dollar"};

export function getCountryConfig(code: string | null | undefined): CountryConfig | undefined {
    return code ? countries[code.toUpperCase()] : undefined;
}

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const COOKIE_NAMES = {
    lang: "lang",
    country: "country",
    currency: "currency",
} as const;

export function parseCountryCookie(raw: string | null | undefined): CountryCookie | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.code === "string" && parsed.code) {
            return {code: parsed.code.toUpperCase(), name: String(parsed.name ?? parsed.code)};
        }
    } catch {
        // ignore malformed cookie
    }
    return null;
}

export function parseCurrencyCookie(raw: string | null | undefined): CurrencyCookie | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.code === "string" && parsed.code) {
            return {code: parsed.code.toUpperCase(), name: parsed.name};
        }
    } catch {
        // ignore malformed cookie
    }
    return null;
}
