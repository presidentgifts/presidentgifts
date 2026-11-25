/**
 * Creates a super admin (or resets the password of an existing one).
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is read from ADMIN_PASSWORD, or a strong one is generated and printed.
 */
import "./env";
import {randomBytes} from "node:crypto";
import {parseArgs} from "node:util";
import {sql} from "drizzle-orm";
import {getDb, schema} from "../server/db/client";
import {hashPassword, MIN_PASSWORD_LENGTH} from "../server/auth/password";

async function main() {
    const {values} = parseArgs({
        options: {
            email: {type: "string"},
            name: {type: "string"},
        },
    });

    const email = values.email?.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error('Usage: npm run admin:create -- --email you@example.com --name "Your Name"');
    }

    const generated = !process.env.ADMIN_PASSWORD;
    const password = process.env.ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const db = getDb();
    const passwordHash = await hashPassword(password);
    const [existing] = await db
        .select({id: schema.adminUsers.id})
        .from(schema.adminUsers)
        .where(sql`lower(${schema.adminUsers.email}) = ${email}`);

    if (existing) {
        await db
            .update(schema.adminUsers)
            .set({passwordHash, isSuperAdmin: true, isActive: true, failedLoginCount: 0, lockedUntil: null})
            .where(sql`${schema.adminUsers.id} = ${existing.id}`);
        await db.delete(schema.adminSessions).where(sql`${schema.adminSessions.userId} = ${existing.id}`);
        console.log(`Updated super admin ${email}.`);
    } else {
        await db.insert(schema.adminUsers).values({
            email,
            fullName: values.name?.trim() || email,
            passwordHash,
            isSuperAdmin: true,
        });
        console.log(`Created super admin ${email}.`);
    }

    if (generated) console.log(`Password: ${password}\nSave it now — it is not stored anywhere in plain text.`);

    await globalThis.__presidentDbPool?.end();
}

main().catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await globalThis.__presidentDbPool?.end();
    process.exit(1);
});
