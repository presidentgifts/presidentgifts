"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {getClientLocaleContext} from "@/lib/locale-context-client";

export const getNewProducts = async () => {
    const {langCode, countryCode} = getClientLocaleContext();
    return fetcherClient(`/api/v1/product/by_locale?language=${langCode}&countryCode=${countryCode}`);
};
