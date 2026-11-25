import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

export async function getshowCaseData() {
    const {countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(`/api/v1/translations/page/translation?pageKey=HOME&countryCode=${countryCode}`, []);
}
