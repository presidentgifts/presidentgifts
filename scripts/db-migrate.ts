import "./env";
import {migrate} from "drizzle-orm/node-postgres/migrator";
import {getDb} from "../server/db/client";

async function main() {
    console.log("Applying migrations...");
    await migrate(getDb(), {migrationsFolder: "./server/db/migrations"});
    console.log("Migrations applied.");
    await globalThis.__presidentDbPool?.end();
}

main().catch(async (error) => {
    console.error(error);
    await globalThis.__presidentDbPool?.end();
    process.exit(1);
});
