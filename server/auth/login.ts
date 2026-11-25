import "server-only";

import {eq, sql} from "drizzle-orm";
import {getDb, schema} from "@/server/db/client";
import {verifyAgainstDummy, verifyPassword} from "@/server/auth/password";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type LoginResult =
    | { ok: true; userId: string }
    | { ok: false; error: "invalid" | "locked" | "inactive" };

/** Checks email and password. Locks the account for a while after repeated failures. */
export async function authenticateAdmin(email: string, password: string): Promise<LoginResult> {
    const db = getDb();
    const normalized = email.trim().toLowerCase();

    const [user] = await db
        .select()
        .from(schema.adminUsers)
        .where(sql`lower(${schema.adminUsers.email}) = ${normalized}`)
        .limit(1);

    if (!user) {
        await verifyAgainstDummy(password);
        return {ok: false, error: "invalid"};
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
        return {ok: false, error: "locked"};
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
        const failed = user.failedLoginCount + 1;
        const lock = failed >= MAX_FAILED_ATTEMPTS;
        await db
            .update(schema.adminUsers)
            .set({
                failedLoginCount: lock ? 0 : failed,
                lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : user.lockedUntil,
            })
            .where(eq(schema.adminUsers.id, user.id));
        return {ok: false, error: lock ? "locked" : "invalid"};
    }

    // Checked after the password so an attacker can't probe which accounts are disabled.
    if (!user.isActive) return {ok: false, error: "inactive"};

    await db
        .update(schema.adminUsers)
        .set({failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date()})
        .where(eq(schema.adminUsers.id, user.id));

    return {ok: true, userId: user.id};
}
