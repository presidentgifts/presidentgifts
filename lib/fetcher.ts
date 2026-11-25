import "server-only";

import {getLocaleContext} from "@/lib/locale-context";
import {isLocalDataSource} from "@/server/storefront/source";

export type FetchHeaders = HeadersInit;

/** The old backend can hang instead of failing; give up after this long. */
const BACKEND_TIMEOUT_MS = 8000;

export function getBackendAuthHeader(): string {
    const user = process.env.BASIC_ADMIN ?? process.env.NEXT_PUBLIC_BASIC_ADMIN;
    const password = process.env.BASIC_PASSWORD ?? process.env.NEXT_PUBLIC_BASIC_PASSWORD;
    if (!user || !password) throw new Error("Missing backend basic auth credentials");
    return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

export function getBackendBaseUrl(): string {
    const url = process.env.BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
    if (!url) throw new Error("Missing NEXT_PUBLIC_BASE_URL");
    return url;
}

/** Server-side GET to the backend with the visitor's language and currency. */
export async function fetcher<T = unknown>(url: string, headers?: FetchHeaders): Promise<T> {
    const {lang, currencyCode, countryCode} = await getLocaleContext();

    if (isLocalDataSource()) {
        // Answered from this app's database, without an HTTP round trip.
        const {handleLegacyRequest} = await import("@/server/storefront/legacy-api");
        const parsed = new URL(url, "http://local");
        const result = await handleLegacyRequest({
            method: "GET",
            path: parsed.pathname.replace(/^\/api\/v1/, ""),
            query: parsed.searchParams,
            locale: lang,
            currencyCode,
            countryCode,
        });
        if (result.status >= 400) throw new Error(`Request failed: ${result.status}`);
        return result.body as T;
    }

    const res = await fetch(`${getBackendBaseUrl()}${url}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: getBackendAuthHeader(),
            "Accept-Language": lang,
            currencyCode,
            ...headers,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });

    if (!res.ok) {
        const message = await res.text().catch(() => "Something went wrong");
        throw new Error(message);
    }

    return (await res.json()) as T;
}

/**
 * Like `fetcher`, but returns `fallback` when the request fails, so one broken
 * section (or an unreachable backend) never takes the whole page down.
 */
export async function fetcherOr<T>(url: string, fallback: T): Promise<T> {
    try {
        const data = await fetcher<T>(url);
        if (data == null) return fallback;
        // A list section must get a list, whatever the backend sent.
        if (Array.isArray(fallback) && !Array.isArray(data)) return fallback;
        return data;
    } catch (error) {
        console.error(`[fetcher] ${url.split("?")[0]} failed:`, error instanceof Error ? error.message : error);
        return fallback;
    }
}
