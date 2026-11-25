import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function NewProductService() {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/product/by_locale?language=${langCode}&countryCode=${countryCode}`, []);
}
