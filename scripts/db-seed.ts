/**
 * Fills the database with the starting reference data. Safe to run again:
 * existing rows are kept, system roles get their current permissions.
 *
 *   npm run db:seed
 */
import "./env";
import {sql} from "drizzle-orm";
import {getDb, schema} from "../server/db/client";
import {SYSTEM_ROLE_DEFINITIONS} from "../server/auth/permissions";

const LANGUAGES = [
    {code: "uz", name: "Uzbek", nativeName: "O'zbekcha"},
    {code: "ru", name: "Russian", nativeName: "Русский"},
    {code: "en", name: "English", nativeName: "English"},
    // ISO 639-1 code of Tajik is "tg" ("tj" is the country code).
    {code: "tg", name: "Tajik", nativeName: "Тоҷикӣ"},
    {code: "az", name: "Azerbaijani", nativeName: "Azərbaycanca"},
];

const CURRENCIES = [
    {code: "UZS", name: "Uzbek Sum", symbol: "so'm", symbolPosition: "after" as const, decimals: 0},
    {code: "TJS", name: "Tajik Somoni", symbol: "SM", symbolPosition: "after" as const, decimals: 2},
    {code: "AZN", name: "Azerbaijani Manat", symbol: "₼", symbolPosition: "after" as const, decimals: 2},
    {code: "USD", name: "US Dollar", symbol: "$", symbolPosition: "before" as const, decimals: 2},
];

const COUNTRIES = [
    {code: "UZ", name: "Uzbekistan", defaultLanguageCode: "uz", defaultCurrencyCode: "UZS", phone: "+998 71 203 05 00", languages: ["uz", "ru", "en"]},
    {code: "TJ", name: "Tajikistan", defaultLanguageCode: "tg", defaultCurrencyCode: "TJS", phone: null, languages: ["tg", "ru", "en"]},
    {code: "AZ", name: "Azerbaijan", defaultLanguageCode: "az", defaultCurrencyCode: "AZN", phone: null, languages: ["az", "ru", "en"]},
];

async function main() {
    const db = getDb();

    await db.insert(schema.languages).values(LANGUAGES).onConflictDoNothing();
    await db.insert(schema.currencies).values(CURRENCIES).onConflictDoNothing();

    for (const {languages, ...country} of COUNTRIES) {
        await db.insert(schema.countries).values(country).onConflictDoNothing();
        await db
            .insert(schema.countryLanguages)
            .values(languages.map((languageCode, sortOrder) => ({countryCode: country.code, languageCode, sortOrder})))
            .onConflictDoNothing();
        await db
            .insert(schema.countryCurrencies)
            .values([
                {countryCode: country.code, currencyCode: country.defaultCurrencyCode, sortOrder: 0},
                {countryCode: country.code, currencyCode: "USD", sortOrder: 1, rateToUsd: "1"},
            ])
            .onConflictDoNothing();
    }

    for (const role of SYSTEM_ROLE_DEFINITIONS) {
        await db
            .insert(schema.roles)
            .values({...role, isSystem: true})
            .onConflictDoUpdate({
                target: schema.roles.key,
                set: {permissions: sql`excluded.permissions`, isSystem: true},
            });
    }

    console.log(`Seeded ${LANGUAGES.length} languages, ${CURRENCIES.length} currencies, ${COUNTRIES.length} countries, ${SYSTEM_ROLE_DEFINITIONS.length} roles.`);
    console.log("Create the first super admin with: npm run admin:create -- --email you@example.com --name \"Your Name\"");

    await globalThis.__presidentDbPool?.end();
}

main().catch(async (error) => {
    console.error(error);
    await globalThis.__presidentDbPool?.end();
    process.exit(1);
});
