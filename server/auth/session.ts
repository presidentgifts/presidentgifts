import "server-only";

import {createHash, randomBytes} from "node:crypto";
import {cache} from "react";
import {cookies, headers} from "next/headers";
import {and, eq, gt, lt} from "drizzle-orm";
import {getDb, schema} from "@/server/db/client";
import {ALL_PERMISSIONS, Permission} from "@/server/auth/permissions";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminMembershipInfo {
    countryCode: string;
    roleKey: string;
    roleName: string;
    permissions: Permission[];
}

export interface AdminContext {
    sessionId: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        isSuperAdmin: boolean;
        uiLanguage: string;
    };
    /** Countries the user works in, with their role there. Empty for super admins (they have all). */
    memberships: AdminMembershipInfo[];
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

async function requestMeta() {
    const h = await headers();
    return {
        ip: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64) || null,
        userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
    };
}

/** Starts a session for the user and sets the session cookie. Call from a server action. */
export async function createAdminSession(userId: string) {
    const db = getDb();
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const {ip, userAgent} = await requestMeta();

    // Housekeeping: drop this user's expired sessions.
    await db
        .delete(schema.adminSessions)
        .where(and(eq(schema.adminSessions.userId, userId), lt(schema.adminSessions.expiresAt, new Date())));

    await db.insert(schema.adminSessions).values({id: hashToken(token), userId, expiresAt, ip, userAgent});

    (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
    });
}

/** Ends the current session. Call from a server action. */
export async function destroyAdminSession() {
    const store = await cookies();
    const token = store.get(ADMIN_SESSION_COOKIE)?.value;
    if (token) {
        await getDb().delete(schema.adminSessions).where(eq(schema.adminSessions.id, hashToken(token)));
    }
    store.delete(ADMIN_SESSION_COOKIE);
}

/** Ends every session of a user, e.g. when they are deactivated or their password changes. */
export async function destroyAllSessionsOf(userId: string) {
    await getDb().delete(schema.adminSessions).where(eq(schema.adminSessions.userId, userId));
}

/** The signed-in admin for this request, or null. Cached per request. */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
    const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return null;

    const db = getDb();
    const sessionId = hashToken(token);

    const [row] = await db
        .select({
            sessionId: schema.adminSessions.id,
            id: schema.adminUsers.id,
            email: schema.adminUsers.email,
            fullName: schema.adminUsers.fullName,
            isSuperAdmin: schema.adminUsers.isSuperAdmin,
            isActive: schema.adminUsers.isActive,
            uiLanguage: schema.adminUsers.uiLanguage,
        })
        .from(schema.adminSessions)
        .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.adminSessions.userId))
        .where(and(eq(schema.adminSessions.id, sessionId), gt(schema.adminSessions.expiresAt, new Date())))
        .limit(1);

    if (!row || !row.isActive) return null;

    const memberships = row.isSuperAdmin
        ? []
        : await db
            .select({
                countryCode: schema.adminMemberships.countryCode,
                roleKey: schema.adminMemberships.roleKey,
                roleName: schema.roles.name,
                permissions: schema.roles.permissions,
            })
            .from(schema.adminMemberships)
            .innerJoin(schema.roles, eq(schema.roles.key, schema.adminMemberships.roleKey))
            .where(eq(schema.adminMemberships.userId, row.id));

    return {
        sessionId: row.sessionId,
        user: {
            id: row.id,
            email: row.email,
            fullName: row.fullName,
            isSuperAdmin: row.isSuperAdmin,
            uiLanguage: row.uiLanguage,
        },
        memberships: memberships.map((m) => ({
            ...m,
            permissions: m.permissions.filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(p)),
        })),
    };
});
