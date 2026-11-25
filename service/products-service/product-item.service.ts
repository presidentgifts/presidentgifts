"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {getClientLocaleContext} from "@/lib/locale-context-client";

export const getProductDetail = async (productId: string | number) => {
    const {langCode, countryCode} = getClientLocaleContext();
    return fetcherClient(`/api/v1/product/by_id_and_locale?productId=${productId}&language=${langCode}&countryCode=${countryCode}`);
};
