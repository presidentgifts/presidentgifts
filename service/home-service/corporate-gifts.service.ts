import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function CorporateService() {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/translations/page/CORPORATE_GIFTS?language=${langCode}&country=${countryCode}`, {});
}
