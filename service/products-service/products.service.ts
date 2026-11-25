import "server-only";

import {fetcherOr} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";

// Keep in sync with CATEGORY_PAGE_SIZE in category-products-client.service.ts
export const PRODUCTS_PAGE_SIZE = 12;

export function categoryProductsUrl(categoryId: number, langCode: string, countryCode: string, page = 0) {
    return `/api/v1/category/product_page_by_category_id_and_locale?categoryId=${categoryId}&languageCode=${langCode}&countryCode=${countryCode}&page=${page}&size=${PRODUCTS_PAGE_SIZE}`;
}

export async function ProductChildService(categoryId: number, page = 0) {
    const {langCode, countryCode} = await getLocaleContext();
    return fetcherOr<unknown>(categoryProductsUrl(categoryId, langCode, countryCode, page), {data: [], totalElements: 0});
}
