import "server-only";

import {and, count, desc, eq, exists, ilike, inArray, or, SQL, sql} from "drizzle-orm";
import {getDb, schema} from "@/server/db/client";
import {ActionError} from "@/server/admin-action";
import {hasPermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import type {AdminContext} from "@/server/auth/session";

export const CUSTOMERS_PAGE_SIZE = 25;

/** Customers registered in one of the countries, or who ordered there. */
function inCountries(countryCodes: string[]): SQL {
    return or(
        inArray(schema.customers.countryCode, countryCodes),
        exists(
            getDb()
                .select({one: sql`1`})
                .from(schema.orders)
                .where(and(eq(schema.orders.customerId, schema.customers.id), inArray(schema.orders.countryCode, countryCodes))),
        ),
    )!;
}

export async function listCustomers(countryCodes: string[], q: string, page = 1) {
    const db = getDb();
    if (countryCodes.length === 0) return {rows: [], total: 0, page: 1, pageSize: CUSTOMERS_PAGE_SIZE};
    const where: SQL[] = [inCountries(countryCodes)];
    const query = q.trim();
    if (query) {
        const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        where.push(or(ilike(schema.customers.fullName, pattern), ilike(schema.customers.email, pattern), ilike(schema.customers.phone, pattern))!);
    }
    const condition = and(...where);
    const [rows, [{value: total}]] = await Promise.all([
        db
            .select()
            .from(schema.customers)
            .where(condition)
            .orderBy(desc(schema.customers.createdAt))
            .limit(CUSTOMERS_PAGE_SIZE)
            .offset((Math.max(1, page) - 1) * CUSTOMERS_PAGE_SIZE),
        db.select({value: count()}).from(schema.customers).where(condition),
    ]);
    const ids = rows.map((r) => r.id);
    const stats = ids.length
        ? await db
            .select({customerId: schema.orders.customerId, orders: count(), totalUsd: sql<string>`coalesce(sum(${schema.orders.totalUsd}), 0)`})
            .from(schema.orders)
            .where(and(inArray(schema.orders.customerId, ids), inArray(schema.orders.countryCode, countryCodes)))
            .groupBy(schema.orders.customerId)
        : [];

    return {
        rows: rows.map((c) => {
            const s = stats.find((x) => x.customerId === c.id);
            return {
                id: c.id,
                fullName: c.fullName,
                email: c.email,
                phone: c.phone,
                countryCode: c.countryCode,
                isActive: c.isActive,
                googleLinked: c.googleLinked,
                orders: Number(s?.orders ?? 0),
                totalUsd: s?.totalUsd ?? "0",
                createdAt: c.createdAt.toISOString(),
            };
        }),
        total: Number(total),
        page: Math.max(1, page),
        pageSize: CUSTOMERS_PAGE_SIZE,
    };
}

export async function getCustomer(id: string, countryCodes: string[]) {
    if (!/^[0-9a-f-]{36}$/.test(id) || countryCodes.length === 0) return null;
    const [row] = await getDb()
        .select()
        .from(schema.customers)
        .where(and(eq(schema.customers.id, id), inCountries(countryCodes)));
    return row ?? null;
}

/** Blocks or unblocks signing in on the site. Needs the orders permission in a country the customer belongs to. */
export async function setCustomerActive(ctx: AdminContext, id: string, isActive: boolean) {
    const db = getDb();
    const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, id));
    if (!customer) throw new ActionError("notFound");
    const orderCountries = await db
        .selectDistinct({code: schema.orders.countryCode})
        .from(schema.orders)
        .where(eq(schema.orders.customerId, id));
    const related = new Set([customer.countryCode, ...orderCountries.map((o) => o.code)].filter((c): c is string => Boolean(c)));
    if (![...related].some((c) => hasPermission(ctx, PERMISSIONS.ordersManage, c)) && !ctx.user.isSuperAdmin) {
        throw new ActionError("forbidden");
    }
    await db.update(schema.customers).set({isActive}).where(eq(schema.customers.id, id));
}
