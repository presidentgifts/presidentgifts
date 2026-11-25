import "server-only";

import {and, asc, count, countDistinct, eq, inArray} from "drizzle-orm";
import {hasPermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {getDb, schema} from "@/server/db/client";
import type {AdminContext} from "@/server/auth/session";

export interface DashboardCountry {
    code: string;
    name: string;
    isActive: boolean;
    languages: { code: string; nativeName: string; isDefault: boolean }[];
    currencies: { code: string; isDefault: boolean; rateToUsd: string | null }[];
}

/** Overview of the countries the user can see. */
export async function getDashboardData(ctx: AdminContext, countryCodes: string[]) {
    const db = getDb();
    if (countryCodes.length === 0) {
        return {countries: [] as DashboardCountry[], stats: {countries: 0, languages: 0, currencies: 0, staff: 0}};
    }

    const [countries, languageRows, currencyRows] = await Promise.all([
        db.select().from(schema.countries).where(inArray(schema.countries.code, countryCodes)).orderBy(asc(schema.countries.name)),
        db
            .select({
                countryCode: schema.countryLanguages.countryCode,
                code: schema.languages.code,
                nativeName: schema.languages.nativeName,
                sortOrder: schema.countryLanguages.sortOrder,
            })
            .from(schema.countryLanguages)
            .innerJoin(schema.languages, eq(schema.languages.code, schema.countryLanguages.languageCode))
            .where(inArray(schema.countryLanguages.countryCode, countryCodes))
            .orderBy(asc(schema.countryLanguages.sortOrder)),
        db
            .select({
                countryCode: schema.countryCurrencies.countryCode,
                code: schema.countryCurrencies.currencyCode,
                rateToUsd: schema.countryCurrencies.rateToUsd,
                sortOrder: schema.countryCurrencies.sortOrder,
            })
            .from(schema.countryCurrencies)
            .where(inArray(schema.countryCurrencies.countryCode, countryCodes))
            .orderBy(asc(schema.countryCurrencies.sortOrder)),
    ]);

    const staffQuery = ctx.user.isSuperAdmin
        ? db.select({value: countDistinct(schema.adminUsers.id)}).from(schema.adminUsers)
        : db
            .select({value: countDistinct(schema.adminMemberships.userId)})
            .from(schema.adminMemberships)
            .where(inArray(schema.adminMemberships.countryCode, countryCodes));
    const [{value: staff}] = await staffQuery;

    const result: DashboardCountry[] = countries.map((country) => ({
        code: country.code,
        name: country.name,
        isActive: country.isActive,
        languages: languageRows
            .filter((l) => l.countryCode === country.code)
            .map((l) => ({code: l.code, nativeName: l.nativeName, isDefault: l.code === country.defaultLanguageCode})),
        currencies: currencyRows
            .filter((c) => c.countryCode === country.code)
            .map((c) => ({code: c.code, isDefault: c.code === country.defaultCurrencyCode, rateToUsd: c.rateToUsd})),
    }));

    return {
        countries: result,
        stats: {
            countries: result.length,
            languages: new Set(languageRows.map((l) => l.code)).size,
            currencies: new Set(currencyRows.map((c) => c.code)).size,
            staff: Number(staff),
        },
    };
}

export interface AttentionItem {
    key: "newOrders" | "newInquiries" | "productsInReview" | "newsInReview";
    count: number;
    href: string;
}

/** Things in the active country that someone should act on, for the people who can act on them. */
export async function getAttentionItems(ctx: AdminContext, countryCode: string | null): Promise<AttentionItem[]> {
    if (!countryCode) return [];
    const db = getDb();
    const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(ctx, p, countryCode);
    const queries: Promise<AttentionItem>[] = [];

    if (can(PERMISSIONS.ordersView)) {
        queries.push(
            db.select({value: count()}).from(schema.orders)
                .where(and(eq(schema.orders.countryCode, countryCode), eq(schema.orders.status, "new")))
                .then(([r]) => ({key: "newOrders" as const, count: Number(r.value), href: "/admin/orders?status=new"})),
            db.select({value: count()}).from(schema.inquiries)
                .where(and(eq(schema.inquiries.countryCode, countryCode), eq(schema.inquiries.status, "new")))
                .then(([r]) => ({key: "newInquiries" as const, count: Number(r.value), href: "/admin/inquiries"})),
        );
    }
    if (can(PERMISSIONS.catalogPublish)) {
        queries.push(
            db.select({value: count()}).from(schema.products)
                .where(and(eq(schema.products.countryCode, countryCode), eq(schema.products.status, "review")))
                .then(([r]) => ({key: "productsInReview" as const, count: Number(r.value), href: "/admin/products?status=review"})),
        );
    }
    if (can(PERMISSIONS.contentPublish)) {
        queries.push(
            db.select({value: count()}).from(schema.news)
                .where(and(eq(schema.news.countryCode, countryCode), eq(schema.news.status, "review")))
                .then(([r]) => ({key: "newsInReview" as const, count: Number(r.value), href: "/admin/news"})),
        );
    }
    return Promise.all(queries);
}
