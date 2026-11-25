"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {getClientLocaleContext} from "@/lib/locale-context-client";

export const getSearchProducts = async (productName: string) => {
    const {langCode, countryCode} = getClientLocaleContext();
    return fetcherClient(`/api/v1/product/page_by_locale_and_name?countryCode=${countryCode}&language=${langCode}&name=${encodeURIComponent(productName)}&page=0&size=10`);
};
