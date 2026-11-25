import "server-only";

import {asc, eq, inArray} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";

/** A country shows its site in at most this many languages. */
export const MAX_COUNTRY_LANGUAGES = 4;

const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .transform((v) => v || null)
        .nullable()
        .optional();

export const countryGeneralInput = z.object({
    name: z.string().trim().min(2).max(64),
    phone: optionalText(32),
    email: z
        .string()
        .trim()
        .max(128)
        .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))
        .transform((v) => v || null)
        .nullable()
        .optional(),
});

export const countryCreateInput = countryGeneralInput.extend({
    code: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    defaultLanguageCode: z.string().min(2).max(8),
    defaultCurrencyCode: z.string().length(3),
});

export const countryLanguagesInput = z.object({
    defaultLanguageCode: z.string().min(2).max(8),
    languages: z
        .array(z.object({code: z.string().min(2).max(8), isActive: z.boolean()}))
        .min(1)
        .max(MAX_COUNTRY_LANGUAGES),
});

const rate = z
    .string()
    .trim()
    .regex(/^\d{1,12}(\.\d{1,6})?$/)
    .refine((v) => Number(v) > 0)
    .nullable();

export const countryCurrenciesInput = z.object({
    defaultCurrencyCode: z.string().length(3),
    currencies: z
        .array(z.object({code: z.string().length(3), isActive: z.boolean(), rateToUsd: rate}))
        .min(1)
        .max(10),
});

function assertUnique(codes: string[]) {
    if (new Set(codes).size !== codes.length) throw new ActionError("invalid");
}

/** Countries with their enabled languages and currencies, ordered by name. */
export async function listCountries(codes?: string[]) {
    const db = getDb();
    if (codes && codes.length === 0) return [];

    const countries = await db
        .select()
        .from(schema.countries)
        .where(codes ? inArray(schema.countries.code, codes) : undefined)
        .orderBy(asc(schema.countries.name));
    const ids = countries.map((c) => c.code);
    if (ids.length === 0) return [];

    const [languages, currencies, staff] = await Promise.all([
        db
            .select({countryCode: schema.countryLanguages.countryCode, code: schema.countryLanguages.languageCode})
            .from(schema.countryLanguages)
            .where(inArray(schema.countryLanguages.countryCode, ids))
            .orderBy(asc(schema.countryLanguages.sortOrder)),
        db
            .select({countryCode: schema.countryCurrencies.countryCode, code: schema.countryCurrencies.currencyCode})
            .from(schema.countryCurrencies)
            .where(inArray(schema.countryCurrencies.countryCode, ids))
            .orderBy(asc(schema.countryCurrencies.sortOrder)),
        db
            .select({countryCode: schema.adminMemberships.countryCode})
            .from(schema.adminMemberships)
            .where(inArray(schema.adminMemberships.countryCode, ids)),
    ]);

    return countries.map((country) => ({
        ...country,
        languages: languages.filter((l) => l.countryCode === country.code).map((l) => l.code),
        currencies: currencies.filter((c) => c.countryCode === country.code).map((c) => c.code),
        staff: staff.filter((s) => s.countryCode === country.code).length,
    }));
}

/** One country with its full language and currency settings, or null. */
export async function getCountryDetail(code: string) {
    const db = getDb();
    const [country] = await db.select().from(schema.countries).where(eq(schema.countries.code, code));
    if (!country) return null;

    const [languages, currencies] = await Promise.all([
        db
            .select({
                code: schema.countryLanguages.languageCode,
                isActive: schema.countryLanguages.isActive,
                name: schema.languages.name,
                nativeName: schema.languages.nativeName,
            })
            .from(schema.countryLanguages)
            .innerJoin(schema.languages, eq(schema.languages.code, schema.countryLanguages.languageCode))
            .where(eq(schema.countryLanguages.countryCode, code))
            .orderBy(asc(schema.countryLanguages.sortOrder)),
        db
            .select({
                code: schema.countryCurrencies.currencyCode,
                isActive: schema.countryCurrencies.isActive,
                rateToUsd: schema.countryCurrencies.rateToUsd,
                name: schema.currencies.name,
                symbol: schema.currencies.symbol,
            })
            .from(schema.countryCurrencies)
            .innerJoin(schema.currencies, eq(schema.currencies.code, schema.countryCurrencies.currencyCode))
            .where(eq(schema.countryCurrencies.countryCode, code))
            .orderBy(asc(schema.countryCurrencies.sortOrder)),
    ]);

    return {country, languages, currencies};
}

export async function createCountry(input: unknown) {
    const data = parseInput(countryCreateInput, input);
    const db = getDb();

    await db.transaction(async (tx) => {
        await tx.insert(schema.countries).values({...data, isActive: false});
        await tx
            .insert(schema.countryLanguages)
            .values({countryCode: data.code, languageCode: data.defaultLanguageCode, sortOrder: 0});
        await tx.insert(schema.countryCurrencies).values({
            countryCode: data.code,
            currencyCode: data.defaultCurrencyCode,
            sortOrder: 0,
            rateToUsd: data.defaultCurrencyCode === "USD" ? "1" : null,
        });
    });
    return data;
}

export async function updateCountryGeneral(code: string, input: unknown) {
    const data = parseInput(countryGeneralInput, input);
    const [row] = await getDb()
        .update(schema.countries)
        .set(data)
        .where(eq(schema.countries.code, code))
        .returning({code: schema.countries.code});
    if (!row) throw new ActionError("notFound");
    return data;
}

/** Turns the country's site on or off. An active country needs exchange rates for all its active currencies. */
export async function setCountryActive(code: string, isActive: boolean) {
    const db = getDb();
    if (isActive) {
        const detail = await getCountryDetail(code);
        if (!detail) throw new ActionError("notFound");
        if (detail.currencies.some((c) => c.isActive && !c.rateToUsd)) throw new ActionError("rateRequired");
    }
    const [row] = await db
        .update(schema.countries)
        .set({isActive})
        .where(eq(schema.countries.code, code))
        .returning({code: schema.countries.code});
    if (!row) throw new ActionError("notFound");
}

/** Replaces the country's language list. Order in the list is the order on the site. */
export async function saveCountryLanguages(code: string, input: unknown) {
    const data = parseInput(countryLanguagesInput, input);
    const codes = data.languages.map((l) => l.code);
    assertUnique(codes);

    const active = data.languages.filter((l) => l.isActive);
    if (active.length === 0) throw new ActionError("noLanguages");
    if (!active.some((l) => l.code === data.defaultLanguageCode)) throw new ActionError("defaultMissing");

    const db = getDb();
    const known = await db
        .select({code: schema.languages.code, isActive: schema.languages.isActive})
        .from(schema.languages)
        .where(inArray(schema.languages.code, codes));
    if (known.length !== codes.length) throw new ActionError("invalid");

    await db.transaction(async (tx) => {
        const [country] = await tx
            .update(schema.countries)
            .set({defaultLanguageCode: data.defaultLanguageCode})
            .where(eq(schema.countries.code, code))
            .returning({code: schema.countries.code});
        if (!country) throw new ActionError("notFound");

        await tx.delete(schema.countryLanguages).where(eq(schema.countryLanguages.countryCode, code));
        await tx.insert(schema.countryLanguages).values(
            data.languages.map((l, sortOrder) => ({
                countryCode: code,
                languageCode: l.code,
                isActive: l.isActive,
                sortOrder,
            })),
        );
    });
    return data;
}

/** Replaces the country's currency list and exchange rates. */
export async function saveCountryCurrencies(code: string, input: unknown) {
    const data = parseInput(countryCurrenciesInput, input);
    const codes = data.currencies.map((c) => c.code);
    assertUnique(codes);

    const active = data.currencies.filter((c) => c.isActive);
    if (active.length === 0) throw new ActionError("noCurrencies");
    if (!active.some((c) => c.code === data.defaultCurrencyCode)) throw new ActionError("defaultMissing");

    const db = getDb();
    const [country] = await db
        .select({isActive: schema.countries.isActive})
        .from(schema.countries)
        .where(eq(schema.countries.code, code));
    if (!country) throw new ActionError("notFound");

    // USD is the base: its rate is always 1.
    const currencies = data.currencies.map((c) => ({...c, rateToUsd: c.code === "USD" ? "1" : c.rateToUsd}));
    // A live site can't show prices in a currency without a rate.
    if (country.isActive && currencies.some((c) => c.isActive && !c.rateToUsd)) {
        throw new ActionError("rateRequired");
    }

    const known = await db
        .select({code: schema.currencies.code})
        .from(schema.currencies)
        .where(inArray(schema.currencies.code, codes));
    if (known.length !== codes.length) throw new ActionError("invalid");

    await db.transaction(async (tx) => {
        await tx
            .update(schema.countries)
            .set({defaultCurrencyCode: data.defaultCurrencyCode})
            .where(eq(schema.countries.code, code));
        await tx.delete(schema.countryCurrencies).where(eq(schema.countryCurrencies.countryCode, code));
        await tx.insert(schema.countryCurrencies).values(
            currencies.map((c, sortOrder) => ({
                countryCode: code,
                currencyCode: c.code,
                isActive: c.isActive,
                rateToUsd: c.rateToUsd,
                sortOrder,
            })),
        );
    });
    return {...data, currencies};
}
