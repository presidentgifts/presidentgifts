"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {getClientLocaleContext} from "@/lib/locale-context-client";

export const getCategoryModal = async () => {
    const {langCode, countryCode} = getClientLocaleContext();
    return fetcherClient(`/api/v1/category/root_by_locale?languageCode=${langCode}&countryCode=${countryCode}`);
};
