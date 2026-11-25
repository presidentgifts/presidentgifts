import {drizzle, NodePgDatabase} from "drizzle-orm/node-postgres";
import {Pool} from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

declare global {
    // Reuse the pool across hot reloads in development and across invocations on Vercel.
    // eslint-disable-next-line no-var -- `declare global` needs var
    var __presidentDbPool: Pool | undefined;
}

function createPool() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");

    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
    return new Pool({
        connectionString,
        // Neon requires TLS; the local PGlite server doesn't support it.
        ssl: isLocal ? false : {rejectUnauthorized: true},
        max: isLocal ? 1 : 5,
        idleTimeoutMillis: 10_000,
    });
}

function getPool(): Pool {
    globalThis.__presidentDbPool ??= createPool();
    return globalThis.__presidentDbPool;
}

let instance: Database | undefined;

/** Drizzle database. The connection is opened on first use. */
export function getDb(): Database {
    instance ??= drizzle(getPool(), {schema, casing: "snake_case"});
    return instance;
}

export {schema};
