import "server-only";

import {asc, count, eq} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";

/* ------------------------------------------------------------------ */
/* Languages                                                           */
/* ------------------------------------------------------------------ */

export const languageInput = z.object({
    code: z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(-[a-z0-9]{2,4})?$/),
    name: z.string().trim().min(2).max(64),
    nativeName: z.string().trim().min(1).max(64),
    isActive: z.boolean(),
});

export type LanguageInput = z.input<typeof languageInput>;

/** All languages with the number of countries using each one. */
export async function listLanguages() {
    const db = getDb();
    const [rows, usage] = await Promise.all([
        db.select().from(schema.languages).orderBy(asc(schema.languages.name)),
        db
            .select({code: schema.countryLanguages.languageCode, value: count()})
            .from(schema.countryLanguages)
            .groupBy(schema.countryLanguages.languageCode),
    ]);
    const used = new Map(usage.map((u) => [u.code, Number(u.value)]));
    return rows.map((row) => ({...row, countries: used.get(row.code) ?? 0}));
}

export async function createLanguage(input: unknown) {
    const data = parseInput(languageInput, input);
    await getDb().insert(schema.languages).values(data);
    return data;
}

export async function updateLanguage(code: string, input: unknown) {
    const data = parseInput(languageInput.omit({code: true}), input);
    const [row] = await getDb()
        .update(schema.languages)
        .set(data)
        .where(eq(schema.languages.code, code))
        .returning({code: schema.languages.code});
    if (!row) throw new ActionError("notFound");
    return data;
}

export async function deleteLanguage(code: string) {
    const db = getDb();
    const [{value: defaults}] = await db
        .select({value: count()})
        .from(schema.countries)
        .where(eq(schema.countries.defaultLanguageCode, code));
    const [{value: enabled}] = await db
        .select({value: count()})
        .from(schema.countryLanguages)
        .where(eq(schema.countryLanguages.languageCode, code));
    if (Number(defaults) > 0 || Number(enabled) > 0) throw new ActionError("inUse");

    const [row] = await db.delete(schema.languages).where(eq(schema.languages.code, code)).returning();
    if (!row) throw new ActionError("notFound");
    return row;
}

/* ------------------------------------------------------------------ */
/* Currencies                                                          */
/* ------------------------------------------------------------------ */

export const currencyInput = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    name: z.string().trim().min(2).max(64),
    symbol: z.string().trim().min(1).max(8),
    symbolPosition: z.enum(["before", "after"]),
    decimals: z.coerce.number().int().min(0).max(4),
});

export type CurrencyInput = z.input<typeof currencyInput>;

export async function listCurrencies() {
    const db = getDb();
    const [rows, usage] = await Promise.all([
        db.select().from(schema.currencies).orderBy(asc(schema.currencies.code)),
        db
            .select({code: schema.countryCurrencies.currencyCode, value: count()})
            .from(schema.countryCurrencies)
            .groupBy(schema.countryCurrencies.currencyCode),
    ]);
    const used = new Map(usage.map((u) => [u.code, Number(u.value)]));
    return rows.map((row) => ({...row, countries: used.get(row.code) ?? 0}));
}

export async function createCurrency(input: unknown) {
    const data = parseInput(currencyInput, input);
    await getDb().insert(schema.currencies).values(data);
    return data;
}

export async function updateCurrency(code: string, input: unknown) {
    const data = parseInput(currencyInput.omit({code: true}), input);
    const [row] = await getDb()
        .update(schema.currencies)
        .set(data)
        .where(eq(schema.currencies.code, code))
        .returning({code: schema.currencies.code});
    if (!row) throw new ActionError("notFound");
    return data;
}

export async function deleteCurrency(code: string) {
    const db = getDb();
    const [{value: defaults}] = await db
        .select({value: count()})
        .from(schema.countries)
        .where(eq(schema.countries.defaultCurrencyCode, code));
    const [{value: enabled}] = await db
        .select({value: count()})
        .from(schema.countryCurrencies)
        .where(eq(schema.countryCurrencies.currencyCode, code));
    if (Number(defaults) > 0 || Number(enabled) > 0) throw new ActionError("inUse");

    const [row] = await db.delete(schema.currencies).where(eq(schema.currencies.code, code)).returning();
    if (!row) throw new ActionError("notFound");
    return row;
}
