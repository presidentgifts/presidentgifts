import "server-only";

import {headers} from "next/headers";
import {getDb, schema} from "@/server/db/client";

export interface AuditEntry {
    userId: string | null;
    action: string;
    countryCode?: string | null;
    entityType?: string;
    entityId?: string | number;
    changes?: unknown;
}

/** Records an admin action in the audit log. Never throws: logging must not break the action. */
export async function logAudit(entry: AuditEntry) {
    try {
        const h = await headers();
        const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64) || null;
        await getDb().insert(schema.auditLogs).values({
            userId: entry.userId,
            action: entry.action,
            countryCode: entry.countryCode ?? null,
            entityType: entry.entityType,
            entityId: entry.entityId === undefined ? undefined : String(entry.entityId),
            changes: entry.changes ?? null,
            ip,
        });
    } catch (error) {
        console.error("Audit log failed:", error);
    }
}
