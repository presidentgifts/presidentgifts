import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function SummerCollectionService(id: number) {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/collections/by_id_and_locale_with_media_and_products?collectionId=${id}&languageCode=${langCode}&country_code=${countryCode}`, null);
}
