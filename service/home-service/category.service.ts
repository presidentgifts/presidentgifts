import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function CategoryService() {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/category/root_by_locale_with_media?languageCode=${langCode}&countryCode=${countryCode}`, []);
}
