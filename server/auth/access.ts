import "server-only";

import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {asc, eq} from "drizzle-orm";
import {getDb, schema} from "@/server/db/client";
import {AdminContext, getAdminContext} from "@/server/auth/session";
import {Permission} from "@/server/auth/permissions";

export const ADMIN_COUNTRY_COOKIE = "admin_country";

export class ForbiddenError extends Error {
    constructor(message = "Forbidden") {
        super(message);
        this.name = "ForbiddenError";
    }
}

/** Whether the user may do `permission` in `countryCode`. */
export function hasPermission(ctx: AdminContext, permission: Permission, countryCode: string): boolean {
    if (ctx.user.isSuperAdmin) return true;
    return ctx.memberships.some((m) => m.countryCode === countryCode && m.permissions.includes(permission));
}

export function hasCountryAccess(ctx: AdminContext, countryCode: string): boolean {
    return ctx.user.isSuperAdmin || ctx.memberships.some((m) => m.countryCode === countryCode);
}

/** Countries the user can open in the admin panel. */
export async function getAccessibleCountries(ctx: AdminContext) {
    const all = await getDb()
        .select({code: schema.countries.code, name: schema.countries.name, isActive: schema.countries.isActive})
        .from(schema.countries)
        .orderBy(asc(schema.countries.name));
    return ctx.user.isSuperAdmin ? all : all.filter((c) => hasCountryAccess(ctx, c.code));
}

/** The country the admin is currently working in (chosen in the top bar). */
export async function getActiveCountryCode(ctx: AdminContext): Promise<string | null> {
    const accessible = await getAccessibleCountries(ctx);
    const fromCookie = (await cookies()).get(ADMIN_COUNTRY_COOKIE)?.value;
    if (fromCookie && accessible.some((c) => c.code === fromCookie)) return fromCookie;
    return accessible[0]?.code ?? null;
}

/** The signed-in admin, or a redirect to the login page. */
export async function requireAdmin(): Promise<AdminContext> {
    const ctx = await getAdminContext();
    if (!ctx) redirect("/admin/login");
    return ctx;
}

export async function requireSuperAdmin(): Promise<AdminContext> {
    const ctx = await requireAdmin();
    if (!ctx.user.isSuperAdmin) throw new ForbiddenError();
    return ctx;
}

export async function requirePermission(permission: Permission, countryCode: string): Promise<AdminContext> {
    const ctx = await requireAdmin();
    if (!hasPermission(ctx, permission, countryCode)) throw new ForbiddenError();
    return ctx;
}

/** Country codes for which the user has `permission`. */
export async function countriesWithPermission(ctx: AdminContext, permission: Permission): Promise<string[]> {
    if (ctx.user.isSuperAdmin) {
        const rows = await getDb().select({code: schema.countries.code}).from(schema.countries);
        return rows.map((r) => r.code);
    }
    return ctx.memberships.filter((m) => m.permissions.includes(permission)).map((m) => m.countryCode);
}

export async function isCountryActive(code: string) {
    const [row] = await getDb()
        .select({isActive: schema.countries.isActive})
        .from(schema.countries)
        .where(eq(schema.countries.code, code));
    return Boolean(row?.isActive);
}
