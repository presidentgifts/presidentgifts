import {Locale} from "@/lib/i18n-config";

export interface Branch {
    countryCode: string;
    lat: number;
    lng: number;
    name: Record<Locale, string>;
}

export const branches: Branch[] = [
    {
        countryCode: "UZ",
        lat: 41.2667445,
        lng: 69.2483314,
        name: {
            uz: "O‘zbekiston, Toshkent, Kichik halqa yo'li, 2/A",
            ru: "Узбекистан, Ташкент, Малая кольцевая дорога, 2/A",
            en: "Uzbekistan, Tashkent, Small Ring Road, 2/A",
            az: "Özbəkistan, Daşkənd, Kiçik dairəvi yol, 2/A",
            tj: "Ӯзбекистон, Тошкент, ҳалқаи хурди роҳ, 2/A",
        },
    },
    {
        countryCode: "UZ",
        lat: 41.30834,
        lng: 69.269253,
        name: {
            uz: "O‘zbekiston, Toshkent, TSUM, Islam Karimov ko'chasi, 17",
            ru: "Узбекистан, Ташкент, ЦУМ, улица Ислама Каримова, 17",
            en: "Uzbekistan, Tashkent, TSUM, Islam Karimov Street, 17",
            az: "Özbəkistan, Daşkənd, TSUM, İslam Kərimov küçəsi, 17",
            tj: "Ӯзбекистон, Тошкент, ЦУМ, кӯчаи Ислом Каримов, 17",
        },
    },
    {
        countryCode: "UZ",
        lat: 39.664527,
        lng: 66.960616,
        name: {
            uz: "O‘zbekiston, Samarqand",
            ru: "Узбекистан, Самарканд",
            en: "Uzbekistan, Samarkand",
            az: "Özbəkistan, Səmərqənd",
            tj: "Ӯзбекистон, Самарқанд",
        },
    },
    {
        countryCode: "TJ",
        lat: 38.57212240653411,
        lng: 68.78859694232835,
        name: {
            uz: "Tojikiston, Dushanbe, Rudakiy ko‘chasi, 55/1",
            ru: "Таджикистан, Душанбе, Рудаки, 55/1",
            en: "Tajikistan, Dushanbe, Rudaki Street, 55/1",
            az: "Tacikistan, Düşənbə, Rudaki küçəsi, 55/1",
            tj: "Тоҷикистон, Душанбе, кӯчаи Рӯдакӣ, 55/1",
        },
    },
    {
        countryCode: "AZ",
        lat: 40.372974,
        lng: 49.853148,
        name: {
            uz: "Ozarbayjon, Boku",
            ru: "Азербайджан, Баку",
            en: "Azerbaijan, Baku",
            az: "Azərbaycan, Bakı",
            tj: "Озарбойҷон, Боку",
        },
    },
];

/** All branches, the given country's branches first. */
export function branchesForCountry(countryCode: string, list: Branch[] = branches): Branch[] {
    const own = list.filter((b) => b.countryCode === countryCode);
    const others = list.filter((b) => b.countryCode !== countryCode);
    return [...own, ...others];
}

/** Branches of the given country, or all branches if it has none. */
export function ownBranches(countryCode: string, list: Branch[] = branches): Branch[] {
    const own = list.filter((b) => b.countryCode === countryCode);
    return own.length ? own : list;
}
