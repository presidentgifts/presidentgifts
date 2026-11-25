import "server-only";

import {revalidatePath} from "next/cache";
import {z, ZodTypeAny} from "zod";
import {ForbiddenError} from "@/server/auth/access";

/**
 * Error codes an admin action can return. The client shows the matching text
 * from the admin dictionary (`errors.<code>`).
 */
export type ActionErrorCode =
    | "forbidden"
    | "invalid"
    | "exists"
    | "inUse"
    | "notFound"
    | "noLanguages"
    | "tooManyLanguages"
    | "noCurrencies"
    | "defaultMissing"
    | "rateRequired"
    | "self"
    | "superAdminTarget"
    | "otherCountries"
    | "needsPublish"
    | "nameRequired"
    | "storage"
    | "server";

export type ActionResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; error: ActionErrorCode; field?: string };

/** Thrown inside an action to return an error code to the client. */
export class ActionError extends Error {
    constructor(public code: ActionErrorCode, public field?: string) {
        super(code);
        this.name = "ActionError";
    }
}

/** Parses input with a zod schema, or throws `invalid` naming the first bad field. */
export function parseInput<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
    const result = schema.safeParse(input);
    if (!result.success) {
        const path = result.error.issues[0]?.path.join(".");
        throw new ActionError("invalid", path || undefined);
    }
    return result.data;
}

function pgCode(error: unknown): string | undefined {
    const e = error as { code?: unknown; cause?: { code?: unknown } };
    const code = e?.code ?? e?.cause?.code;
    return typeof code === "string" ? code : undefined;
}

/**
 * Runs an admin action and turns failures into error codes, so server actions
 * never throw to the client. Revalidates the admin panel after a success.
 */
export async function runAction<T = void>(
    fn: () => Promise<T>,
    options: { revalidate?: boolean } = {},
): Promise<ActionResult<T>> {
    try {
        const data = await fn();
        // Read-only actions (search, upload URLs) skip this so the page isn't refreshed.
        if (options.revalidate !== false) revalidatePath("/admin", "layout");
        return {ok: true, data};
    } catch (error) {
        if (error instanceof ActionError) return {ok: false, error: error.code, field: error.field};
        if (error instanceof ForbiddenError) return {ok: false, error: "forbidden"};
        // Postgres: unique_violation / foreign_key_violation
        const code = pgCode(error);
        if (code === "23505") return {ok: false, error: "exists"};
        if (code === "23503") return {ok: false, error: "inUse"};
        // redirect() and notFound() throw special errors that Next.js must see.
        if (error instanceof Error && "digest" in error && String(error.digest).startsWith("NEXT_")) throw error;
        console.error("Admin action failed:", error);
        return {ok: false, error: "server"};
    }
}
