import "server-only";

import {desc, eq, sql} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {hashPassword, verifyAgainstDummy, verifyPassword} from "@/server/auth/password";
import {mediaUrl, storeFile} from "@/server/storage/media-storage";

/** Account data the site keeps in its session (same shape the old backend returned). */
export interface CustomerSessionData {
    id: string;
    full_name: string;
    email: string;
    country: { countryCode: string; countryName: string };
    created_at: string;
    updated_at: string;
}

async function toSessionData(customer: typeof schema.customers.$inferSelect): Promise<CustomerSessionData> {
    let countryName = customer.countryCode ?? "";
    if (customer.countryCode) {
        const [c] = await getDb().select({name: schema.countries.name}).from(schema.countries).where(eq(schema.countries.code, customer.countryCode));
        countryName = c?.name ?? countryName;
    }
    return {
        id: customer.id,
        full_name: customer.fullName,
        email: customer.email,
        country: {countryCode: customer.countryCode ?? "", countryName},
        created_at: customer.createdAt.toISOString(),
        updated_at: customer.updatedAt.toISOString(),
    };
}

async function findByEmail(email: string) {
    const [row] = await getDb()
        .select()
        .from(schema.customers)
        .where(sql`lower(${schema.customers.email}) = ${email.trim().toLowerCase()}`);
    return row ?? null;
}

async function validCountry(code: string | undefined) {
    if (!code || !/^[A-Z]{2}$/.test(code)) return null;
    const [row] = await getDb().select({code: schema.countries.code}).from(schema.countries).where(eq(schema.countries.code, code));
    return row?.code ?? null;
}

const email = z.string().trim().toLowerCase().max(255).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);

const registerInput = z.object({
    client_email: email,
    client_password: z.string().min(4).max(100),
    client_full_name: z.string().trim().min(1).max(128),
    country: z.object({countryCode: z.string().optional()}).partial().optional(),
});

export type RegisterResult = { ok: true; data: CustomerSessionData } | { ok: false; status: 400 | 409 };

/** Sign-up form of the site. */
export async function registerCustomer(input: unknown): Promise<RegisterResult> {
    const parsed = registerInput.safeParse(input);
    if (!parsed.success) return {ok: false, status: 400};
    const data = parsed.data;

    const existing = await findByEmail(data.client_email);
    // An account created through Google may add a password once.
    if (existing && existing.passwordHash) return {ok: false, status: 409};

    const passwordHash = await hashPassword(data.client_password);
    if (existing) {
        const [row] = await getDb().update(schema.customers).set({passwordHash}).where(eq(schema.customers.id, existing.id)).returning();
        return {ok: true, data: await toSessionData(row)};
    }
    const [row] = await getDb()
        .insert(schema.customers)
        .values({
            email: data.client_email,
            fullName: data.client_full_name,
            passwordHash,
            countryCode: await validCountry(data.country?.countryCode?.toUpperCase()),
        })
        .returning();
    return {ok: true, data: await toSessionData(row)};
}

const loginInput = z.object({
    client_email: email,
    password: z.string().max(100).optional(),
    client_full_name: z.string().trim().max(128).optional(),
    country: z.object({countryCode: z.string().optional()}).partial().optional(),
});

/**
 * Sign-in of the site. With a password it checks the password. Without one it
 * is a Google sign-in (the caller has verified the Google account): the
 * account is found or created.
 */
export async function loginOrCreateCustomer(input: unknown): Promise<CustomerSessionData | null> {
    const parsed = loginInput.safeParse(input);
    if (!parsed.success) return null;
    const data = parsed.data;
    const db = getDb();
    const existing = await findByEmail(data.client_email);

    if (data.password !== undefined) {
        if (!existing?.passwordHash) {
            await verifyAgainstDummy(data.password);
            return null;
        }
        if (!(await verifyPassword(data.password, existing.passwordHash)) || !existing.isActive) return null;
        const [row] = await db.update(schema.customers).set({lastLoginAt: new Date()}).where(eq(schema.customers.id, existing.id)).returning();
        return toSessionData(row);
    }

    if (existing) {
        if (!existing.isActive) return null;
        const [row] = await db
            .update(schema.customers)
            .set({googleLinked: true, lastLoginAt: new Date()})
            .where(eq(schema.customers.id, existing.id))
            .returning();
        return toSessionData(row);
    }
    const [row] = await db
        .insert(schema.customers)
        .values({
            email: data.client_email,
            fullName: data.client_full_name || data.client_email,
            googleLinked: true,
            lastLoginAt: new Date(),
            countryCode: await validCountry(data.country?.countryCode?.toUpperCase()),
        })
        .returning();
    return toSessionData(row);
}

export async function getActiveCustomer(id: string | null | undefined) {
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
    const [row] = await getDb().select().from(schema.customers).where(eq(schema.customers.id, id));
    return row?.isActive ? row : null;
}

/* ------------------------------------------------------------------ */
/* B2B logos                                                           */
/* ------------------------------------------------------------------ */

export async function saveCustomerLogo(customerId: string, countryCode: string, png: Buffer) {
    const key = await storeFile(countryCode, "image/png", png);
    const db = getDb();
    const [media] = await db
        .insert(schema.media)
        .values({countryCode, key, contentType: "image/png", size: png.length, originalName: "b2b-logo.png"})
        .returning();
    await db.insert(schema.customerLogos).values({customerId, mediaId: media.id});
    return media;
}

export async function getLatestCustomerLogo(customerId: string) {
    const [row] = await getDb()
        .select({key: schema.media.key, id: schema.media.id, createdAt: schema.customerLogos.createdAt})
        .from(schema.customerLogos)
        .innerJoin(schema.media, eq(schema.media.id, schema.customerLogos.mediaId))
        .where(eq(schema.customerLogos.customerId, customerId))
        .orderBy(desc(schema.customerLogos.createdAt))
        .limit(1);
    return row ? {id: row.id, url: mediaUrl(row.key), createdAt: row.createdAt} : null;
}
