import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function ProductDetailService(productId: number) {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/product/by_id_and_locale?productId=${productId}&language=${langCode}&countryCode=${countryCode}`, null);
}
