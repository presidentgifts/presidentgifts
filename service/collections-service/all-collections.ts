import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function CollectionService() {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/collections/by_locale_with_media_and_products?languageCode=${langCode}&country_code=${countryCode}`, []);
}
