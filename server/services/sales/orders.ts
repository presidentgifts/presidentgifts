import "server-only";

import {and, asc, count, desc, eq, ilike, inArray, or, SQL, sql} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import {hasPermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import type {AdminContext} from "@/server/auth/session";
import type {OrderStatus} from "@/server/db/schema";
import {getMediaViews, pickName} from "@/server/services/catalog/common";

export const ORDER_STATUSES = ["new", "confirmed", "in_progress", "shipped", "completed", "cancelled"] as const satisfies readonly OrderStatus[];
export const ORDERS_PAGE_SIZE = 25;

export interface OrderFilters {
    status?: OrderStatus;
    q?: string;
    page?: number;
    customerId?: string;
}

function escapeLike(q: string) {
    return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function listOrders(countryCodes: string[], filters: OrderFilters) {
    const db = getDb();
    if (countryCodes.length === 0) return {rows: [], total: 0, page: 1, pageSize: ORDERS_PAGE_SIZE};
    const page = Math.max(1, filters.page ?? 1);
    const where: SQL[] = [inArray(schema.orders.countryCode, countryCodes)];
    if (filters.status) where.push(eq(schema.orders.status, filters.status));
    if (filters.customerId) where.push(eq(schema.orders.customerId, filters.customerId));
    const q = filters.q?.trim();
    if (q) {
        const pattern = escapeLike(q);
        const digits = q.replace(/\D/g, "");
        const conditions = [ilike(schema.orders.contactName, pattern), ilike(schema.orders.phone, pattern)];
        if (digits.length >= 4) conditions.push(sql`regexp_replace(${schema.orders.phone}, '\\D', '', 'g') like ${`%${digits}%`}`);
        if (/^#?\d{1,9}$/.test(q)) conditions.push(eq(schema.orders.id, Number(q.replace("#", ""))));
        where.push(or(...conditions)!);
    }
    const condition = and(...where);

    const [rows, [{value: total}]] = await Promise.all([
        db
            .select()
            .from(schema.orders)
            .where(condition)
            .orderBy(desc(schema.orders.createdAt), desc(schema.orders.id))
            .limit(ORDERS_PAGE_SIZE)
            .offset((page - 1) * ORDERS_PAGE_SIZE),
        db.select({value: count()}).from(schema.orders).where(condition),
    ]);
    const ids = rows.map((r) => r.id);
    const itemCounts = ids.length
        ? await db
            .select({orderId: schema.orderItems.orderId, value: sql<number>`sum(${schema.orderItems.quantity})`})
            .from(schema.orderItems)
            .where(inArray(schema.orderItems.orderId, ids))
            .groupBy(schema.orderItems.orderId)
        : [];

    return {
        rows: rows.map((o) => ({
            id: o.id,
            countryCode: o.countryCode,
            status: o.status,
            contactName: o.contactName,
            phone: o.phone,
            customerId: o.customerId,
            totalUsd: o.totalUsd,
            currencyCode: o.currencyCode,
            rateToUsd: o.rateToUsd,
            items: Number(itemCounts.find((c) => c.orderId === o.id)?.value ?? 0),
            createdAt: o.createdAt.toISOString(),
        })),
        total: Number(total),
        page,
        pageSize: ORDERS_PAGE_SIZE,
    };
}

export async function countOrdersByStatus(countryCodes: string[]) {
    if (countryCodes.length === 0) return {} as Partial<Record<OrderStatus, number>>;
    const rows = await getDb()
        .select({status: schema.orders.status, value: count()})
        .from(schema.orders)
        .where(inArray(schema.orders.countryCode, countryCodes))
        .groupBy(schema.orders.status);
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.value)])) as Partial<Record<OrderStatus, number>>;
}

export async function getOrderDetail(id: number, lang: string) {
    const db = getDb();
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    if (!order) return null;

    const [items, events, customer] = await Promise.all([
        db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id)).orderBy(asc(schema.orderItems.id)),
        db
            .select({
                id: schema.orderEvents.id,
                fromStatus: schema.orderEvents.fromStatus,
                toStatus: schema.orderEvents.toStatus,
                note: schema.orderEvents.note,
                createdAt: schema.orderEvents.createdAt,
                userName: schema.adminUsers.fullName,
            })
            .from(schema.orderEvents)
            .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.orderEvents.userId))
            .where(eq(schema.orderEvents.orderId, id))
            .orderBy(desc(schema.orderEvents.createdAt), desc(schema.orderEvents.id)),
        order.customerId
            ? db
                .select({id: schema.customers.id, fullName: schema.customers.fullName, email: schema.customers.email})
                .from(schema.customers)
                .where(eq(schema.customers.id, order.customerId))
                .then((r) => r[0] ?? null)
            : Promise.resolve(null),
    ]);

    // Current product names and first images, for the products that still exist.
    const productIds = items.map((i) => i.productId).filter((v): v is number => v !== null);
    const [names, firstMedia] = productIds.length
        ? await Promise.all([
            db
                .select({productId: schema.productTranslations.productId, languageCode: schema.productTranslations.languageCode, name: schema.productTranslations.name})
                .from(schema.productTranslations)
                .where(inArray(schema.productTranslations.productId, productIds)),
            db
                .selectDistinctOn([schema.productMedia.productId], {productId: schema.productMedia.productId, mediaId: schema.productMedia.mediaId})
                .from(schema.productMedia)
                .where(inArray(schema.productMedia.productId, productIds))
                .orderBy(schema.productMedia.productId, asc(schema.productMedia.sortOrder)),
        ])
        : [[], []];
    const thumbs = await getMediaViews(firstMedia.map((m) => m.mediaId));

    return {
        order,
        customer,
        items: items.map((item) => {
            const mediaId = firstMedia.find((m) => m.productId === item.productId)?.mediaId;
            const current = names.filter((n) => n.productId === item.productId);
            return {
                ...item,
                name: current.length ? pickName(current, lang) : item.name,
                thumbnail: mediaId ? thumbs.get(mediaId)?.url ?? null : null,
            };
        }),
        events: events.map((e) => ({...e, createdAt: e.createdAt.toISOString()})),
    };
}

const updateInput = z.object({
    status: z.enum(ORDER_STATUSES),
    note: z.string().trim().max(2000).optional().default(""),
});

/** Changes the order status and/or adds a note. Both are recorded in the order history. */
export async function updateOrder(ctx: AdminContext, id: number, input: unknown) {
    const data = parseInput(updateInput, input);
    const db = getDb();
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    if (!order) throw new ActionError("notFound");
    if (!hasPermission(ctx, PERMISSIONS.ordersManage, order.countryCode)) throw new ActionError("forbidden");

    const statusChanged = data.status !== order.status;
    if (!statusChanged && !data.note) return {order, changed: false};

    await db.transaction(async (tx) => {
        if (statusChanged) await tx.update(schema.orders).set({status: data.status}).where(eq(schema.orders.id, id));
        await tx.insert(schema.orderEvents).values({
            orderId: id,
            fromStatus: statusChanged ? order.status : null,
            toStatus: statusChanged ? data.status : null,
            note: data.note || null,
            userId: ctx.user.id,
        });
    });
    return {order, changed: true, from: order.status, to: data.status};
}

/* ------------------------------------------------------------------ */
/* Orders from the site                                                */
/* ------------------------------------------------------------------ */

const siteOrderInput = z.object({
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    customerId: z.string().uuid().nullable(),
    contactName: z.string().trim().min(1).max(160),
    phone: z.string().trim().min(5).max(32),
    secondPhone: z.string().trim().max(32).optional().transform((v) => v || null),
    address: z.string().trim().max(1000).optional().transform((v) => v || null),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    comment: z.string().trim().max(2000).optional().transform((v) => v || null),
    currencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
    items: z
        .array(z.object({productId: z.number().int().positive(), quantity: z.number().int().min(1).max(1000)}))
        .min(1)
        .max(100),
});

export type SiteOrderInput = z.input<typeof siteOrderInput>;

/**
 * Creates an order placed on the site. Prices are taken from the catalog, never
 * from the browser; only published products of the order's country can be ordered.
 */
export async function createSiteOrder(input: unknown) {
    const data = parseInput(siteOrderInput, input);
    const db = getDb();

    const merged = new Map<number, number>();
    for (const item of data.items) merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    const ids = [...merged.keys()];

    const [country] = await db
        .select({defaultLanguageCode: schema.countries.defaultLanguageCode})
        .from(schema.countries)
        .where(and(eq(schema.countries.code, data.countryCode), eq(schema.countries.isActive, true)));
    if (!country) throw new ActionError("invalid", "countryCode");

    const products = await db
        .select({id: schema.products.id, sku: schema.products.sku, priceUsd: schema.products.priceUsd})
        .from(schema.products)
        .where(and(inArray(schema.products.id, ids), eq(schema.products.countryCode, data.countryCode), eq(schema.products.status, "published")));
    if (products.length !== ids.length) throw new ActionError("invalid", "items");

    const names = await db
        .select({productId: schema.productTranslations.productId, languageCode: schema.productTranslations.languageCode, name: schema.productTranslations.name})
        .from(schema.productTranslations)
        .where(inArray(schema.productTranslations.productId, ids));

    // The rate of the currency the visitor chose, if the country offers it.
    let currencyCode = "USD";
    let rateToUsd = "1";
    if (data.currencyCode && data.currencyCode !== "USD") {
        const [rate] = await db
            .select({rate: schema.countryCurrencies.rateToUsd})
            .from(schema.countryCurrencies)
            .where(and(
                eq(schema.countryCurrencies.countryCode, data.countryCode),
                eq(schema.countryCurrencies.currencyCode, data.currencyCode),
                eq(schema.countryCurrencies.isActive, true),
            ));
        if (rate?.rate) {
            currencyCode = data.currencyCode;
            rateToUsd = rate.rate;
        }
    }

    const lines = products.map((p) => ({
        productId: p.id,
        sku: p.sku,
        name: pickName(names.filter((n) => n.productId === p.id), country.defaultLanguageCode) || p.sku,
        quantity: merged.get(p.id)!,
        unitPriceUsd: p.priceUsd ?? "0",
    }));
    // Sum in cents to avoid floating point drift.
    const totalCents = lines.reduce((sum, l) => sum + Math.round(Number(l.unitPriceUsd) * 100) * l.quantity, 0);

    return db.transaction(async (tx) => {
        const [order] = await tx
            .insert(schema.orders)
            .values({
                countryCode: data.countryCode,
                customerId: data.customerId,
                contactName: data.contactName,
                phone: data.phone,
                secondPhone: data.secondPhone,
                address: data.address,
                latitude: data.latitude == null ? null : String(data.latitude),
                longitude: data.longitude == null ? null : String(data.longitude),
                comment: data.comment,
                currencyCode,
                rateToUsd,
                totalUsd: (totalCents / 100).toFixed(2),
            })
            .returning();
        await tx.insert(schema.orderItems).values(lines.map((l) => ({...l, orderId: order.id})));
        await tx.insert(schema.orderEvents).values({orderId: order.id, toStatus: "new", note: null, userId: null});
        return {order, lines};
    });
}

/** Orders of a customer, newest first (for the "My orders" page of the site). */
export async function listCustomerOrders(customerId: string, page = 0, size = 10) {
    const db = getDb();
    const where = eq(schema.orders.customerId, customerId);
    const [rows, [{value: total}]] = await Promise.all([
        db.select().from(schema.orders).where(where).orderBy(desc(schema.orders.createdAt)).limit(size).offset(page * size),
        db.select({value: count()}).from(schema.orders).where(where),
    ]);
    const ids = rows.map((r) => r.id);
    const items = ids.length ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)) : [];
    return {rows, items, total: Number(total)};
}
