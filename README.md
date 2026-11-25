# President Business Gifts

Storefront and admin panel for President Business Gifts. Branches are in Uzbekistan, Tajikistan and Azerbaijan.
The site opens in the visitor's country: its language, its currency and its content.

- **Storefront:** `app/[lang]`
- **Admin panel:** `app/admin`. It is served at `/admin`.
- **Backend logic:** `server/`. This holds the database schema, auth, roles and services.
- **Stack:** Next.js 15 · Neon Postgres + Drizzle ORM · Cloudflare R2 for images · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
```

### Database

**Option A: local database.** You don't need Postgres or Docker installed.

```bash
npm run db:local             # keep this running in a separate terminal
# LOCAL_DB_DIR / LOCAL_DB_PORT choose another data folder / port
# in .env.local:
# DATABASE_URL=postgres://postgres:postgres@localhost:5433/postgres
```

**Option B: Neon.**
1. Create a project at [neon.com](https://neon.com). Choose the region **Frankfurt (aws-eu-central-1)**.
2. Copy the **pooled** connection string.
3. Put it into `DATABASE_URL` in `.env.local`.

Then create the tables and the starting data:

```bash
npm run db:migrate           # create / update tables
npm run db:seed              # countries, languages, currencies, roles
npm run admin:create -- --email you@company.com --name "Your Name"
```

`admin:create` prints a generated password. You can also set `ADMIN_PASSWORD` to choose one.

```bash
npm run dev
```

- Storefront: http://localhost:3000
- Admin panel: http://localhost:3000/admin

### Changing the database schema

1. Edit `server/db/schema.ts`.
2. Run `npm run db:generate`. This writes a new SQL migration to `server/db/migrations/`.
3. Commit the migration.
4. Run `npm run db:migrate` on every environment.

`npm run db:studio` opens a browser UI for the data.

## Admin roles

| Role | Can do |
|---|---|
| Super admin | Everything, in every country. Adds countries, system languages, roles and country admins. |
| Country admin | Everything in their country: its languages, currencies and rates, prices, content, orders and staff. |
| Content manager | Adds products, texts and images. These changes go live after a country admin approves them. Cannot change prices. |
| Order operator | Views orders and changes their status, handles inquiries, can block a customer's site account. |

A role is a set of permissions. The permissions are defined in `server/auth/permissions.ts`, and the roles are stored in the `roles` table.

Every admin action is written to `audit_logs`. After 5 failed logins, the account is locked for 15 minutes.

Page texts and branches go live as soon as they are saved, so only people who can publish content may change them.

## Moving the site to the new system

The site's pages still call the old backend's API paths (`/api/v1/...`), but the answers now come from this app's
own database (`server/storefront/legacy-api.ts`). This is the default; the old backend is no longer contacted.

1. Fill the new database: `npm run migrate:legacy`. This copies categories, products, collections, news,
   page texts and images from the old backend, while it is still reachable. It keeps the old ids, so links like
   `/detail/123` keep working. You can run it again; it updates what it copied before. Use `--countries UZ,TJ`
   to choose countries and `--skip-media` to copy without images.
2. In the admin panel, check every country: languages, currencies and **exchange rates**, branches, and
   turn the country on.

Orders and sign-ups are saved in the new database, and form requests appear under **Inquiries**.
`STOREFRONT_DATA_SOURCE=legacy` points the site back to the old backend; it is kept only until the copy is done.

Customers and orders of the old backend are not available through its API. Moving them needs a database
export from the old backend.

If a section's data can't be loaded, that section shows empty instead of breaking the page
(`fetcherOr` in `lib/fetcher.ts`).

## Deployment (Vercel)

- Set the Vercel function region to **Frankfurt (`fra1`)**. This keeps the site close to the Neon database.
- Set all variables from `.env.example` in the Vercel project settings.
- Run `npm run db:migrate` against the production database before deploying a release that contains a new migration.
