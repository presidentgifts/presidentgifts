"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {getClientCountryCode} from "@/lib/locale-context-client";

export const getAllLanguage = async () => {
    return fetcherClient(`/api/v1/language/all_active_by_country?countryCode=${getClientCountryCode()}`);
};
