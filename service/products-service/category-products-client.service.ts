"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {getClientLocaleContext} from "@/lib/locale-context-client";

export const CATEGORY_PAGE_SIZE = 12;

export const getCategoryProductsPage = async (categoryId: number, page: number) => {
    const {langCode, countryCode} = getClientLocaleContext();
    return fetcherClient(`/api/v1/category/product_page_by_category_id_and_locale?categoryId=${categoryId}&languageCode=${langCode}&countryCode=${countryCode}&page=${page}&size=${CATEGORY_PAGE_SIZE}`);
};
