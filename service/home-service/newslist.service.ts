import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function NewsListService() {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/news/by_locale?languageCode=${langCode}&countryCode=${countryCode}&withMedia=true`, []);
}
