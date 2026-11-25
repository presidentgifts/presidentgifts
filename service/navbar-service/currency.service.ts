"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {CurrencyType} from "@/interface/currency-type/currency-type";
import {getClientCountryCode, getClientCurrency, setCurrencyCookie} from "@/lib/locale-context-client";

/**
 * Currencies available in the visitor's country. If the currently selected
 * currency isn't offered there, switches to the country's default currency.
 * Returns `changed: true` when the cookie was updated (page data must be refreshed).
 */
export const getAllCurrency = async (): Promise<{ currencies: CurrencyType[]; changed: boolean }> => {
    const currencies: CurrencyType[] = (await fetcherClient(
        `/api/v1/currency/by_country?countryCode=${getClientCountryCode()}`
    )) ?? [];

    const selected = getClientCurrency();
    const isAvailable = currencies.some((c) => c.code === selected.code);
    const defaultCurrency = currencies.find((c) => c.default_currency) ?? currencies[0];

    if (!isAvailable && defaultCurrency) {
        setCurrencyCookie({code: defaultCurrency.code, name: defaultCurrency.name});
        return {currencies, changed: true};
    }

    return {currencies, changed: false};
};
