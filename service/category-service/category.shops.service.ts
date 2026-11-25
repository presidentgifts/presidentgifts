import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function CategoryChildServiceUZ(categoryId: number) {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/category/by_id_and_locale_with_media?categoryId=${categoryId}&languageCode=${langCode}&countryCode=${countryCode}&withChildren=true`, null);
}
