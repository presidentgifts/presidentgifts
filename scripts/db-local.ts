/**
 * Local Postgres for development, without installing Postgres or Docker.
 * Runs PGlite (Postgres compiled to WASM) and serves it over the Postgres
 * protocol, so the app connects to it like to any Postgres server.
 *
 *   npm run db:local
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5433/postgres
 *
 * Data is kept in ./.local-db (or LOCAL_DB_DIR) between runs; LOCAL_DB_PORT changes the port. Only one connection at a time.
 */
import {PGlite} from "@electric-sql/pglite";
import {PGLiteSocketServer} from "@electric-sql/pglite-socket";

const PORT = Number(process.env.LOCAL_DB_PORT ?? 5433);
const DATA_DIR = process.env.LOCAL_DB_DIR ?? "./.local-db";

async function main() {
    const db = await PGlite.create(DATA_DIR);
    const server = new PGLiteSocketServer({db, port: PORT, host: "127.0.0.1"});
    await server.start();
    console.log(`Local Postgres is running on postgres://postgres:postgres@localhost:${PORT}/postgres`);

    const shutdown = async () => {
        await server.stop();
        await db.close();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
