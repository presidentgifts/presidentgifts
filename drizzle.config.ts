import {config} from "dotenv";
import {defineConfig} from "drizzle-kit";

config({path: [".env.local", ".env"], quiet: true});

export default defineConfig({
    dialect: "postgresql",
    schema: "./server/db/schema.ts",
    out: "./server/db/migrations",
    casing: "snake_case",
    dbCredentials: {
        url: process.env.DATABASE_URL ?? "",
    },
    strict: true,
    verbose: true,
});
