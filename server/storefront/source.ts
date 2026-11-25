/**
 * Where the site reads its data from:
 * - "local" (default): this app's own database (see server/storefront/legacy-api.ts);
 * - "legacy": the old backend at BASE_URL. Kept only until its data is copied with `npm run migrate:legacy`.
 */
export function isLocalDataSource() {
    return process.env.STOREFRONT_DATA_SOURCE !== "legacy";
}
