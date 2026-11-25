"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {getClientLocaleContext} from "@/lib/locale-context-client";

export const getLocation = async () => {
    const {langCode, countryCode} = getClientLocaleContext();
    return fetcherClient(`/api/v1/translations/page/LOCATION?language=${langCode}&country=${countryCode}`);
};
