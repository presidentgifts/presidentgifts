"use client";

import {getClientCurrency, getClientLocale} from "@/lib/locale-context-client";

/**
 * Client-side request to the backend. Goes through the `/api/backend` proxy so
 * that backend credentials never reach the browser.
 *
 * @param url backend path starting with `/api/v1/...`
 */
export const fetcherClient = async (url: string, options: RequestInit = {}, currencyOverride?: string) => {
    const path = url.replace(/^\/api\/v1/, "");

    const res = await fetch(`/api/backend${path}`, {
        ...options,
        method: options.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept-Language": getClientLocale(),
            currencyCode: currencyOverride || getClientCurrency().code,
            ...(options.headers || {}),
        },
        cache: "no-store",
    });

    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
};
