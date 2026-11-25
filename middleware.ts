import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {match as matchLocale} from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import {
    COOKIE_MAX_AGE,
    COOKIE_NAMES,
    CountryConfig,
    countries,
    defaultCountryCode,
    fallbackCurrency,
    getCountryConfig,
    i18n,
    isLocale,
    Locale,
    normalizeLocale,
    parseCountryCookie,
} from "./lib/i18n-config";

const PUBLIC_FILE = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|pdf|mp4|webm|webmanifest|json|txt|xml|woff2?|ttf|otf|js|css|map)$/i;

/** Locale from the browser's Accept-Language header. */
function negotiateLocale(request: NextRequest): Locale {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => (headers[key] = value));
    const languages = new Negotiator({headers}).languages([...i18n.locales]);
    try {
        return matchLocale(languages, [...i18n.locales], i18n.defaultLocale) as Locale;
    } catch {
        return i18n.defaultLocale;
    }
}

function isPrivateIp(ip: string): boolean {
    return (
        ip === "::1" ||
        ip.startsWith("127.") ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
        ip.startsWith("fc") ||
        ip.startsWith("fd") ||
        ip.startsWith("fe80")
    );
}

/** ISO country code of the visitor, or null when it can't be determined. */
async function detectCountry(request: NextRequest): Promise<string | null> {
    // 1. Country header from a CDN / proxy (Cloudflare, Vercel, nginx geoip).
    const headerCountry =
        request.headers.get("cf-ipcountry") ??
        request.headers.get("x-vercel-ip-country") ??
        request.headers.get("x-country-code");
    if (headerCountry && /^[A-Za-z]{2}$/.test(headerCountry) && headerCountry.toUpperCase() !== "XX") {
        return headerCountry.toUpperCase();
    }

    // 2. Look up the visitor's IP.
    const ip = (
        request.headers.get("x-forwarded-for")?.split(",")[0] ??
        request.headers.get("x-real-ip") ??
        ""
    ).trim();
    if (!ip || isPrivateIp(ip)) return null;

    try {
        const token = process.env.IPINFO_TOKEN ? `?token=${process.env.IPINFO_TOKEN}` : "";
        const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/country${token}`, {
            signal: AbortSignal.timeout(1500),
        });
        if (!res.ok) return null;
        const code = (await res.text()).trim().toUpperCase();
        return /^[A-Z]{2}$/.test(code) ? code : null;
    } catch {
        return null;
    }
}

type CookieValues = Partial<Record<(typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES], string>>;

function countryCookies(config: CountryConfig, currency = config.currency): CookieValues {
    return {
        [COOKIE_NAMES.country]: JSON.stringify({code: config.code, name: config.name}),
        [COOKIE_NAMES.currency]: JSON.stringify(currency),
    };
}

function setCookies(response: NextResponse, values: CookieValues) {
    for (const [name, value] of Object.entries(values)) {
        if (value === undefined) continue;
        response.cookies.set(name, value, {path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax"});
    }
}

/**
 * Admin panel: no language/country handling. Without a session cookie, go to
 * the login page. The session itself is validated by the admin layout.
 */
function adminMiddleware(request: NextRequest) {
    const {pathname} = request.nextUrl;
    const isLogin = pathname === "/admin/login";

    if (!isLogin && !request.cookies.get("admin_session")) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
        return NextResponse.redirect(url);
    }

    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "same-origin");
    return response;
}

export async function middleware(request: NextRequest) {
    const {pathname, searchParams} = request.nextUrl;

    if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

    if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminMiddleware(request);

    const segments = pathname.split("/");
    const pathLocale = isLocale(segments[1]) ? (segments[1] as Locale) : undefined;
    const restPath = pathLocale ? "/" + segments.slice(2).join("/") : pathname;

    const cookies: CookieValues = {};
    let locale: Locale | undefined = pathLocale;

    // Manual override, useful for testing: ?country=TJ
    const forcedCountry = getCountryConfig(searchParams.get("country"));

    if (forcedCountry) {
        Object.assign(cookies, countryCookies(forcedCountry));
        locale = forcedCountry.locale;
    } else if (!parseCountryCookie(request.cookies.get(COOKIE_NAMES.country)?.value)) {
        // First visit: detect the country and open the site in its language and currency.
        const detected = await detectCountry(request);
        const config = getCountryConfig(detected);

        if (config) {
            Object.assign(cookies, countryCookies(config));
            locale ??= config.locale;
        } else {
            // Country without a branch: show the default country's catalogue,
            // in the browser's language and in USD.
            Object.assign(cookies, countryCookies(countries[defaultCountryCode], fallbackCurrency));
            locale ??= negotiateLocale(request);
        }
    }

    if (!locale) {
        const cookieLocale = request.cookies.get(COOKIE_NAMES.lang)?.value;
        const country = parseCountryCookie(request.cookies.get(COOKIE_NAMES.country)?.value);
        locale = isLocale(cookieLocale)
            ? cookieLocale
            : getCountryConfig(country?.code)?.locale ?? normalizeLocale(negotiateLocale(request));
    }

    cookies[COOKIE_NAMES.lang] = locale;

    if (locale !== pathLocale || forcedCountry) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${restPath === "/" ? "" : restPath}`;
        url.searchParams.delete("country");
        const response = NextResponse.redirect(url);
        setCookies(response, cookies);
        return response;
    }

    // Make freshly set cookies visible to server components rendering this request.
    for (const [name, value] of Object.entries(cookies)) {
        if (value !== undefined) request.cookies.set(name, value);
    }
    const response = NextResponse.next({request: {headers: request.headers}});
    setCookies(response, cookies);
    return response;
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
