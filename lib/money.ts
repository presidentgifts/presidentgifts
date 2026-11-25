/** "1 250 000 UZS", "$1,250.00". Amounts are strings or numbers in the given currency. */
export function formatMoney(amount: string | number, currencyCode: string, locale = "ru-RU") {
    const value = Number(amount);
    if (currencyCode === "USD") {
        return `$${value.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
    const decimals = Number.isInteger(value) || value >= 1000 ? 0 : 2;
    return `${value.toLocaleString(locale, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})} ${currencyCode}`;
}

/** Converts a USD amount with a rate "units per 1 USD". */
export function fromUsd(amountUsd: string | number, rateToUsd: string | number) {
    return Number(amountUsd) * Number(rateToUsd);
}
