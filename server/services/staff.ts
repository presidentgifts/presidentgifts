import "server-only";

import {randomBytes} from "node:crypto";
import {and, asc, eq, inArray, ne, sql} from "drizzle-orm";
import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import {hasPermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {hashPassword, MIN_PASSWORD_LENGTH} from "@/server/auth/password";
import {destroyAllSessionsOf} from "@/server/auth/session";
import type {AdminContext} from "@/server/auth/session";

const email = z.string().trim().toLowerCase().max(255).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
const fullName = z.string().trim().min(2).max(128);
const password = z
    .string()
    .max(128)
    .refine((v) => v === "" || v.length >= MIN_PASSWORD_LENGTH)
    .optional();

export const staffCreateInput = z.discriminatedUnion("kind", [
    z.object({kind: z.literal("country"), email, fullName, password, roleKey: z.string().min(1).max(32)}),
    z.object({kind: z.literal("super"), email, fullName, password}),
]);

export const staffProfileInput = z.object({fullName, isActive: z.boolean()});

export function generatePassword() {
    return randomBytes(12).toString("base64url");
}

export async function listRoles() {
    return getDb()
        .select({key: schema.roles.key, name: schema.roles.name, description: schema.roles.description})
        .from(schema.roles)
        .orderBy(asc(schema.roles.name));
}

/** Staff of a country, with the other countries each person works in. */
export async function listCountryStaff(countryCode: string) {
    const db = getDb();
    const rows = await db
        .select({
            id: schema.adminUsers.id,
            email: schema.adminUsers.email,
            fullName: schema.adminUsers.fullName,
            isActive: schema.adminUsers.isActive,
            lastLoginAt: schema.adminUsers.lastLoginAt,
            createdAt: schema.adminUsers.createdAt,
            roleKey: schema.adminMemberships.roleKey,
        })
        .from(schema.adminMemberships)
        .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.adminMemberships.userId))
        .where(eq(schema.adminMemberships.countryCode, countryCode))
        .orderBy(asc(schema.adminUsers.fullName));

    const ids = rows.map((r) => r.id);
    const elsewhere = ids.length
        ? await db
            .select({userId: schema.adminMemberships.userId, countryCode: schema.adminMemberships.countryCode})
            .from(schema.adminMemberships)
            .where(and(inArray(schema.adminMemberships.userId, ids), ne(schema.adminMemberships.countryCode, countryCode)))
        : [];

    return rows.map((row) => ({
        ...row,
        otherCountries: elsewhere.filter((e) => e.userId === row.id).map((e) => e.countryCode),
    }));
}

export async function listSuperAdmins() {
    return getDb()
        .select({
            id: schema.adminUsers.id,
            email: schema.adminUsers.email,
            fullName: schema.adminUsers.fullName,
            isActive: schema.adminUsers.isActive,
            lastLoginAt: schema.adminUsers.lastLoginAt,
            createdAt: schema.adminUsers.createdAt,
        })
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.isSuperAdmin, true))
        .orderBy(asc(schema.adminUsers.fullName));
}

async function getTarget(userId: string) {
    if (!z.string().uuid().safeParse(userId).success) throw new ActionError("notFound");
    const db = getDb();
    const [user] = await db
        .select({id: schema.adminUsers.id, isSuperAdmin: schema.adminUsers.isSuperAdmin})
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.id, userId));
    if (!user) throw new ActionError("notFound");
    const memberships = await db
        .select({countryCode: schema.adminMemberships.countryCode})
        .from(schema.adminMemberships)
        .where(eq(schema.adminMemberships.userId, userId));
    return {...user, countries: memberships.map((m) => m.countryCode)};
}

/**
 * Checks that the actor may change the person's account itself (name, status, password).
 * A country admin may do that only for people who work in their countries alone,
 * so one country can't lock out the staff of another.
 */
async function assertCanManageAccount(ctx: AdminContext, userId: string) {
    if (userId === ctx.user.id) throw new ActionError("self");
    const target = await getTarget(userId);
    if (ctx.user.isSuperAdmin) return target;
    if (target.isSuperAdmin) throw new ActionError("superAdminTarget");
    if (target.countries.length === 0) throw new ActionError("forbidden");
    if (!target.countries.every((c) => hasPermission(ctx, PERMISSIONS.usersManage, c))) {
        throw new ActionError("otherCountries");
    }
    return target;
}

/** Checks that the actor may change the person's role in `countryCode`. */
async function assertCanManageMembership(ctx: AdminContext, userId: string, countryCode: string) {
    if (userId === ctx.user.id) throw new ActionError("self");
    const target = await getTarget(userId);
    if (target.isSuperAdmin && !ctx.user.isSuperAdmin) throw new ActionError("superAdminTarget");
    if (!hasPermission(ctx, PERMISSIONS.usersManage, countryCode)) throw new ActionError("forbidden");
    return target;
}

async function assertRoleExists(roleKey: string) {
    const [role] = await getDb().select({key: schema.roles.key}).from(schema.roles).where(eq(schema.roles.key, roleKey));
    if (!role) throw new ActionError("invalid", "roleKey");
}

export interface CreateStaffResult {
    userId: string;
    /** Shown once to the person who created the account. Null when an existing account was added. */
    password: string | null;
    /** The email belonged to an existing account, which was given access to this country. */
    existing: boolean;
}

/**
 * Creates an account, or gives an existing account a role in the country.
 * `countryCode` is required for country staff and ignored for super admins.
 */
export async function createStaff(ctx: AdminContext, countryCode: string | null, input: unknown): Promise<CreateStaffResult> {
    const data = parseInput(staffCreateInput, input);
    const db = getDb();

    if (data.kind === "super" && !ctx.user.isSuperAdmin) throw new ActionError("forbidden");
    if (data.kind === "country") {
        if (!countryCode || !hasPermission(ctx, PERMISSIONS.usersManage, countryCode)) throw new ActionError("forbidden");
        await assertRoleExists(data.roleKey);
    }

    const [existing] = await db
        .select({id: schema.adminUsers.id, isSuperAdmin: schema.adminUsers.isSuperAdmin})
        .from(schema.adminUsers)
        .where(sql`lower(${schema.adminUsers.email}) = ${data.email}`);

    if (existing) {
        if (data.kind === "super" || existing.isSuperAdmin) throw new ActionError("exists", "email");
        const [already] = await db
            .select({id: schema.adminMemberships.id})
            .from(schema.adminMemberships)
            .where(and(eq(schema.adminMemberships.userId, existing.id), eq(schema.adminMemberships.countryCode, countryCode!)));
        if (already) throw new ActionError("exists", "email");

        await db.insert(schema.adminMemberships).values({userId: existing.id, countryCode: countryCode!, roleKey: data.roleKey});
        return {userId: existing.id, password: null, existing: true};
    }

    const plain = data.password || generatePassword();
    const passwordHash = await hashPassword(plain);

    const userId = await db.transaction(async (tx) => {
        const [user] = await tx
            .insert(schema.adminUsers)
            .values({
                email: data.email,
                fullName: data.fullName,
                passwordHash,
                isSuperAdmin: data.kind === "super",
                uiLanguage: ctx.user.uiLanguage,
                createdById: ctx.user.id,
            })
            .returning({id: schema.adminUsers.id});
        if (data.kind === "country") {
            await tx.insert(schema.adminMemberships).values({userId: user.id, countryCode: countryCode!, roleKey: data.roleKey});
        }
        return user.id;
    });

    // Only return a password the creator didn't type themselves.
    return {userId, password: data.password ? null : plain, existing: false};
}

export async function updateStaffProfile(ctx: AdminContext, userId: string, input: unknown) {
    const data = parseInput(staffProfileInput, input);
    await assertCanManageAccount(ctx, userId);
    await getDb().update(schema.adminUsers).set(data).where(eq(schema.adminUsers.id, userId));
    if (!data.isActive) await destroyAllSessionsOf(userId);
    return data;
}

export async function setStaffRole(ctx: AdminContext, userId: string, countryCode: string, roleKey: string) {
    await assertCanManageMembership(ctx, userId, countryCode);
    await assertRoleExists(roleKey);
    const [row] = await getDb()
        .update(schema.adminMemberships)
        .set({roleKey})
        .where(and(eq(schema.adminMemberships.userId, userId), eq(schema.adminMemberships.countryCode, countryCode)))
        .returning({id: schema.adminMemberships.id});
    if (!row) throw new ActionError("notFound");
}

export async function removeStaffFromCountry(ctx: AdminContext, userId: string, countryCode: string) {
    await assertCanManageMembership(ctx, userId, countryCode);
    const [row] = await getDb()
        .delete(schema.adminMemberships)
        .where(and(eq(schema.adminMemberships.userId, userId), eq(schema.adminMemberships.countryCode, countryCode)))
        .returning({id: schema.adminMemberships.id});
    if (!row) throw new ActionError("notFound");
}

/** Sets a new random password and signs the person out everywhere. Returns the password to show once. */
export async function resetStaffPassword(ctx: AdminContext, userId: string) {
    await assertCanManageAccount(ctx, userId);
    const plain = generatePassword();
    await getDb()
        .update(schema.adminUsers)
        .set({passwordHash: await hashPassword(plain), failedLoginCount: 0, lockedUntil: null})
        .where(eq(schema.adminUsers.id, userId));
    await destroyAllSessionsOf(userId);
    return plain;
}
