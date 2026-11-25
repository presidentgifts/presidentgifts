import "server-only";

import {and, count, desc, eq, inArray, SQL} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import {hasPermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import type {AdminContext} from "@/server/auth/session";

export const INQUIRIES_PAGE_SIZE = 30;

export async function listInquiries(countryCodes: string[], status: "new" | "done" | undefined, page = 1) {
    const db = getDb();
    if (countryCodes.length === 0) return {rows: [], total: 0, counts: {new: 0, done: 0}};
    const where: SQL[] = [inArray(schema.inquiries.countryCode, countryCodes)];
    if (status) where.push(eq(schema.inquiries.status, status));
    const [rows, [{value: total}], counts] = await Promise.all([
        db
            .select({
                id: schema.inquiries.id,
                countryCode: schema.inquiries.countryCode,
                name: schema.inquiries.name,
                phone: schema.inquiries.phone,
                message: schema.inquiries.message,
                source: schema.inquiries.source,
                status: schema.inquiries.status,
                createdAt: schema.inquiries.createdAt,
                handledAt: schema.inquiries.handledAt,
                handledBy: schema.adminUsers.fullName,
            })
            .from(schema.inquiries)
            .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.inquiries.handledById))
            .where(and(...where))
            .orderBy(desc(schema.inquiries.createdAt))
            .limit(INQUIRIES_PAGE_SIZE)
            .offset((Math.max(1, page) - 1) * INQUIRIES_PAGE_SIZE),
        db.select({value: count()}).from(schema.inquiries).where(and(...where)),
        db
            .select({status: schema.inquiries.status, value: count()})
            .from(schema.inquiries)
            .where(inArray(schema.inquiries.countryCode, countryCodes))
            .groupBy(schema.inquiries.status),
    ]);
    return {
        rows: rows.map((r) => ({...r, createdAt: r.createdAt.toISOString(), handledAt: r.handledAt?.toISOString() ?? null})),
        total: Number(total),
        counts: {
            new: Number(counts.find((c) => c.status === "new")?.value ?? 0),
            done: Number(counts.find((c) => c.status === "done")?.value ?? 0),
        },
    };
}

export async function setInquiryStatus(ctx: AdminContext, id: number, status: "new" | "done") {
    const db = getDb();
    const [row] = await db.select().from(schema.inquiries).where(eq(schema.inquiries.id, id));
    if (!row) throw new ActionError("notFound");
    if (!hasPermission(ctx, PERMISSIONS.ordersManage, row.countryCode)) throw new ActionError("forbidden");
    await db
        .update(schema.inquiries)
        .set(status === "done" ? {status, handledById: ctx.user.id, handledAt: new Date()} : {status, handledById: null, handledAt: null})
        .where(eq(schema.inquiries.id, id));
    return row;
}

const siteInquiryInput = z.object({
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().min(5).max(32),
    message: z.string().trim().max(4000).optional().transform((v) => v || null),
    source: z.string().trim().max(64).optional().transform((v) => v || null),
});

/** Saves a request sent from a form on the site. */
export async function createSiteInquiry(input: unknown) {
    const data = parseInput(siteInquiryInput, input);
    const [row] = await getDb().insert(schema.inquiries).values(data).returning({id: schema.inquiries.id});
    return row.id;
}
