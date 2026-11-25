import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function BusinesGiftsService() {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/translations/page/BusinesGifts_US?language=${langCode}&country=${countryCode}`, {});
}
