import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function NewsService(newsId: number) {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/news/by_id_and_locale_with_media?news_id=${newsId}&languageCode=${langCode}&countryCode=${countryCode}`, null);
}
