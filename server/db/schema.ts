import {sql} from "drizzle-orm";
import {
    AnyPgColumn,
    bigserial,
    boolean,
    char,
    index,
    integer,
    jsonb,
    numeric,
    pgEnum,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow().$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ */
/* Reference data: languages, currencies, countries                    */
/* ------------------------------------------------------------------ */

/** All languages the system knows. Managed by the super admin. */
export const languages = pgTable("languages", {
    /** ISO 639-1 code, e.g. "uz", "ru", "tg". */
    code: varchar("code", {length: 8}).primaryKey(),
    /** Name in English, e.g. "Uzbek". */
    name: varchar("name", {length: 64}).notNull(),
    /** Name in the language itself, e.g. "O'zbekcha". Shown in the language switcher. */
    nativeName: varchar("native_name", {length: 64}).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
});

export const symbolPosition = pgEnum("symbol_position", ["before", "after"]);

export const currencies = pgTable("currencies", {
    /** ISO 4217 code, e.g. "UZS". */
    code: char("code", {length: 3}).primaryKey(),
    name: varchar("name", {length: 64}).notNull(),
    symbol: varchar("symbol", {length: 8}).notNull(),
    symbolPosition: symbolPosition("symbol_position").notNull().default("after"),
    /** Digits after the decimal point shown in prices. */
    decimals: integer("decimals").notNull().default(0),
    ...timestamps,
});

/** Countries where President sells. Each has its own content, prices and staff. */
export const countries = pgTable("countries", {
    /** ISO 3166-1 alpha-2 code, e.g. "UZ". */
    code: char("code", {length: 2}).primaryKey(),
    name: varchar("name", {length: 64}).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    defaultLanguageCode: varchar("default_language_code", {length: 8})
        .notNull()
        .references(() => languages.code),
    defaultCurrencyCode: char("default_currency_code", {length: 3})
        .notNull()
        .references(() => currencies.code),
    phone: varchar("phone", {length: 32}),
    email: varchar("email", {length: 128}),
    ...timestamps,
});

/** Languages enabled in a country (2–4 per country), chosen by the country admin. */
export const countryLanguages = pgTable(
    "country_languages",
    {
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        languageCode: varchar("language_code", {length: 8})
            .notNull()
            .references(() => languages.code, {onDelete: "restrict"}),
        sortOrder: integer("sort_order").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
    },
    (t) => [primaryKey({columns: [t.countryCode, t.languageCode]})],
);

/** Currencies offered in a country, with the exchange rate set by the country admin. */
export const countryCurrencies = pgTable(
    "country_currencies",
    {
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        currencyCode: char("currency_code", {length: 3})
            .notNull()
            .references(() => currencies.code, {onDelete: "restrict"}),
        /** How many units of this currency equal 1 USD. Null until the admin sets it. */
        rateToUsd: numeric("rate_to_usd", {precision: 18, scale: 6}),
        sortOrder: integer("sort_order").notNull().default(0),
        isActive: boolean("is_active").notNull().default(true),
        updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow().$onUpdate(() => new Date()),
    },
    (t) => [primaryKey({columns: [t.countryCode, t.currencyCode]})],
);

/* ------------------------------------------------------------------ */
/* Admin users, roles and access                                       */
/* ------------------------------------------------------------------ */

/** A role is a named set of permissions (see server/auth/permissions.ts). */
export const roles = pgTable("roles", {
    key: varchar("key", {length: 32}).primaryKey(),
    name: varchar("name", {length: 64}).notNull(),
    description: text("description"),
    permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
    /** System roles are created by the seed and can't be deleted. */
    isSystem: boolean("is_system").notNull().default(false),
    ...timestamps,
});

export const adminUsers = pgTable(
    "admin_users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        email: varchar("email", {length: 255}).notNull(),
        fullName: varchar("full_name", {length: 128}).notNull(),
        passwordHash: text("password_hash").notNull(),
        /** Super admins manage every country and the whole system. */
        isSuperAdmin: boolean("is_super_admin").notNull().default(false),
        isActive: boolean("is_active").notNull().default(true),
        /** Preferred admin panel language. */
        uiLanguage: varchar("ui_language", {length: 8}).notNull().default("uz"),
        failedLoginCount: integer("failed_login_count").notNull().default(0),
        lockedUntil: timestamp("locked_until", {withTimezone: true}),
        lastLoginAt: timestamp("last_login_at", {withTimezone: true}),
        createdById: uuid("created_by_id"),
        ...timestamps,
    },
    (t) => [uniqueIndex("admin_users_email_idx").on(sql`lower(${t.email})`)],
);

/** Gives a user a role in one country. A user may work in several countries. */
export const adminMemberships = pgTable(
    "admin_memberships",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => adminUsers.id, {onDelete: "cascade"}),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        roleKey: varchar("role_key", {length: 32})
            .notNull()
            .references(() => roles.key, {onDelete: "restrict"}),
        ...timestamps,
    },
    (t) => [uniqueIndex("admin_memberships_user_country_idx").on(t.userId, t.countryCode)],
);

export const adminSessions = pgTable(
    "admin_sessions",
    {
        /** SHA-256 of the session token; the token itself is only in the user's cookie. */
        id: varchar("id", {length: 64}).primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => adminUsers.id, {onDelete: "cascade"}),
        expiresAt: timestamp("expires_at", {withTimezone: true}).notNull(),
        ip: varchar("ip", {length: 64}),
        userAgent: text("user_agent"),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [index("admin_sessions_user_idx").on(t.userId)],
);

/** Who changed what and when. */
export const auditLogs = pgTable(
    "audit_logs",
    {
        id: bigserial("id", {mode: "number"}).primaryKey(),
        userId: uuid("user_id").references(() => adminUsers.id, {onDelete: "set null"}),
        countryCode: char("country_code", {length: 2}),
        action: varchar("action", {length: 64}).notNull(),
        entityType: varchar("entity_type", {length: 64}),
        entityId: varchar("entity_id", {length: 128}),
        changes: jsonb("changes"),
        ip: varchar("ip", {length: 64}),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [
        index("audit_logs_created_idx").on(t.createdAt),
        index("audit_logs_country_idx").on(t.countryCode, t.createdAt),
        index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    ],
);

/* ------------------------------------------------------------------ */
/* Media library                                                       */
/* ------------------------------------------------------------------ */

/** An uploaded image or video. Files live in R2 (or a local folder in development). */
export const media = pgTable(
    "media",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        /** Storage key, e.g. "media/UZ/3f0c….webp". */
        key: varchar("key", {length: 255}).notNull(),
        contentType: varchar("content_type", {length: 64}).notNull(),
        size: integer("size").notNull(),
        width: integer("width"),
        height: integer("height"),
        originalName: varchar("original_name", {length: 255}),
        /** Path on the old backend, kept for the data migration. */
        legacyPath: varchar("legacy_path", {length: 512}),
        createdById: uuid("created_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [uniqueIndex("media_key_idx").on(t.key), index("media_country_idx").on(t.countryCode, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Catalog: categories, products, collections                          */
/* ------------------------------------------------------------------ */

/**
 * Lifecycle of catalog items. Content managers create drafts and send them to
 * review; people with the publish permission put them on the site.
 */
export const contentStatus = pgEnum("content_status", ["draft", "review", "published", "archived"]);
export type ContentStatus = (typeof contentStatus.enumValues)[number];

export const categories = pgTable(
    "categories",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        parentId: integer("parent_id").references((): AnyPgColumn => categories.id, {onDelete: "set null"}),
        status: contentStatus("status").notNull().default("draft"),
        sortOrder: integer("sort_order").notNull().default(0),
        imageId: uuid("image_id").references(() => media.id, {onDelete: "set null"}),
        legacyId: integer("legacy_id"),
        createdById: uuid("created_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        updatedById: uuid("updated_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        ...timestamps,
    },
    (t) => [
        index("categories_country_idx").on(t.countryCode, t.parentId, t.sortOrder),
        uniqueIndex("categories_legacy_idx").on(t.countryCode, t.legacyId),
    ],
);

export const categoryTranslations = pgTable(
    "category_translations",
    {
        categoryId: integer("category_id")
            .notNull()
            .references(() => categories.id, {onDelete: "cascade"}),
        languageCode: varchar("language_code", {length: 8})
            .notNull()
            .references(() => languages.code, {onDelete: "restrict"}),
        name: varchar("name", {length: 160}).notNull(),
        description: text("description"),
    },
    (t) => [primaryKey({columns: [t.categoryId, t.languageCode]})],
);

export const products = pgTable(
    "products",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        categoryId: integer("category_id").references(() => categories.id, {onDelete: "set null"}),
        sku: varchar("sku", {length: 64}).notNull(),
        /** Base price in USD. Shown in other currencies using the country's rates. Null = "price on request". */
        priceUsd: numeric("price_usd", {precision: 12, scale: 2}),
        /** Units in the warehouse. Null = not tracked. */
        stock: integer("stock"),
        isNew: boolean("is_new").notNull().default(false),
        /** Shown on the home page. */
        isFeatured: boolean("is_featured").notNull().default(false),
        status: contentStatus("status").notNull().default("draft"),
        sortOrder: integer("sort_order").notNull().default(0),
        publishedAt: timestamp("published_at", {withTimezone: true}),
        legacyId: integer("legacy_id"),
        createdById: uuid("created_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        updatedById: uuid("updated_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        ...timestamps,
    },
    (t) => [
        uniqueIndex("products_sku_idx").on(t.countryCode, sql`lower(${t.sku})`),
        uniqueIndex("products_legacy_idx").on(t.countryCode, t.legacyId),
        index("products_list_idx").on(t.countryCode, t.status, t.updatedAt),
        index("products_category_idx").on(t.categoryId),
    ],
);

export const productTranslations = pgTable(
    "product_translations",
    {
        productId: integer("product_id")
            .notNull()
            .references(() => products.id, {onDelete: "cascade"}),
        languageCode: varchar("language_code", {length: 8})
            .notNull()
            .references(() => languages.code, {onDelete: "restrict"}),
        name: varchar("name", {length: 200}).notNull(),
        description: text("description"),
    },
    (t) => [primaryKey({columns: [t.productId, t.languageCode]})],
);

export const productMedia = pgTable(
    "product_media",
    {
        productId: integer("product_id")
            .notNull()
            .references(() => products.id, {onDelete: "cascade"}),
        mediaId: uuid("media_id")
            .notNull()
            .references(() => media.id, {onDelete: "cascade"}),
        sortOrder: integer("sort_order").notNull().default(0),
    },
    (t) => [primaryKey({columns: [t.productId, t.mediaId]})],
);

export const collections = pgTable(
    "collections",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        status: contentStatus("status").notNull().default("draft"),
        sortOrder: integer("sort_order").notNull().default(0),
        imageId: uuid("image_id").references(() => media.id, {onDelete: "set null"}),
        legacyId: integer("legacy_id"),
        createdById: uuid("created_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        updatedById: uuid("updated_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        ...timestamps,
    },
    (t) => [
        index("collections_country_idx").on(t.countryCode, t.sortOrder),
        uniqueIndex("collections_legacy_idx").on(t.countryCode, t.legacyId),
    ],
);

export const collectionTranslations = pgTable(
    "collection_translations",
    {
        collectionId: integer("collection_id")
            .notNull()
            .references(() => collections.id, {onDelete: "cascade"}),
        languageCode: varchar("language_code", {length: 8})
            .notNull()
            .references(() => languages.code, {onDelete: "restrict"}),
        name: varchar("name", {length: 160}).notNull(),
        description: text("description"),
    },
    (t) => [primaryKey({columns: [t.collectionId, t.languageCode]})],
);

export const collectionProducts = pgTable(
    "collection_products",
    {
        collectionId: integer("collection_id")
            .notNull()
            .references(() => collections.id, {onDelete: "cascade"}),
        productId: integer("product_id")
            .notNull()
            .references(() => products.id, {onDelete: "cascade"}),
        sortOrder: integer("sort_order").notNull().default(0),
    },
    (t) => [primaryKey({columns: [t.collectionId, t.productId]}), index("collection_products_product_idx").on(t.productId)],
);

/* ------------------------------------------------------------------ */
/* Content: page entries, news, branches                               */
/* ------------------------------------------------------------------ */

export const pageEntryType = pgEnum("page_entry_type", ["text", "media"]);

/**
 * A piece of a site page, addressed by page key and entry key, e.g. HOME /
 * "showcase.title". Text entries have a value per language; media entries have
 * an ordered list of images or videos. The site reads a page as a key → value map.
 */
export const pageEntries = pgTable(
    "page_entries",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        pageKey: varchar("page_key", {length: 64}).notNull(),
        key: varchar("key", {length: 128}).notNull(),
        type: pageEntryType("type").notNull().default("text"),
        /** Note for admins: where the text appears. */
        info: varchar("info", {length: 255}),
        sortOrder: integer("sort_order").notNull().default(0),
        updatedById: uuid("updated_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        ...timestamps,
    },
    (t) => [uniqueIndex("page_entries_key_idx").on(t.countryCode, t.pageKey, t.key)],
);

export const pageEntryTranslations = pgTable(
    "page_entry_translations",
    {
        entryId: integer("entry_id")
            .notNull()
            .references(() => pageEntries.id, {onDelete: "cascade"}),
        languageCode: varchar("language_code", {length: 8})
            .notNull()
            .references(() => languages.code, {onDelete: "restrict"}),
        value: text("value").notNull(),
    },
    (t) => [primaryKey({columns: [t.entryId, t.languageCode]})],
);

export const pageEntryMedia = pgTable(
    "page_entry_media",
    {
        entryId: integer("entry_id")
            .notNull()
            .references(() => pageEntries.id, {onDelete: "cascade"}),
        mediaId: uuid("media_id")
            .notNull()
            .references(() => media.id, {onDelete: "cascade"}),
        sortOrder: integer("sort_order").notNull().default(0),
    },
    (t) => [primaryKey({columns: [t.entryId, t.mediaId]})],
);

export const news = pgTable(
    "news",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        status: contentStatus("status").notNull().default("draft"),
        /** Card image in lists. */
        imageId: uuid("image_id").references(() => media.id, {onDelete: "set null"}),
        /** Large image on the news page. */
        pageImageId: uuid("page_image_id").references(() => media.id, {onDelete: "set null"}),
        instagramLink: varchar("instagram_link", {length: 512}),
        viewCount: integer("view_count").notNull().default(0),
        /** Date shown on the site; set when first published if empty. */
        publishedAt: timestamp("published_at", {withTimezone: true}),
        legacyId: integer("legacy_id"),
        createdById: uuid("created_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        updatedById: uuid("updated_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        ...timestamps,
    },
    (t) => [
        index("news_list_idx").on(t.countryCode, t.status, t.publishedAt),
        uniqueIndex("news_legacy_idx").on(t.countryCode, t.legacyId),
    ],
);

export const newsTranslations = pgTable(
    "news_translations",
    {
        newsId: integer("news_id")
            .notNull()
            .references(() => news.id, {onDelete: "cascade"}),
        languageCode: varchar("language_code", {length: 8})
            .notNull()
            .references(() => languages.code, {onDelete: "restrict"}),
        title: varchar("title", {length: 255}).notNull(),
        description: text("description"),
    },
    (t) => [primaryKey({columns: [t.newsId, t.languageCode]})],
);

/** Showrooms shown on the map. */
export const branches = pgTable(
    "branches",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        latitude: numeric("latitude", {precision: 10, scale: 7}).notNull(),
        longitude: numeric("longitude", {precision: 10, scale: 7}).notNull(),
        phone: varchar("phone", {length: 32}),
        isActive: boolean("is_active").notNull().default(true),
        sortOrder: integer("sort_order").notNull().default(0),
        updatedById: uuid("updated_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        ...timestamps,
    },
    (t) => [index("branches_country_idx").on(t.countryCode, t.sortOrder)],
);

export const branchTranslations = pgTable(
    "branch_translations",
    {
        branchId: integer("branch_id")
            .notNull()
            .references(() => branches.id, {onDelete: "cascade"}),
        languageCode: varchar("language_code", {length: 8})
            .notNull()
            .references(() => languages.code, {onDelete: "restrict"}),
        /** Address line shown on the site, e.g. "Tashkent, TSUM, Islam Karimov Street, 17". */
        address: varchar("address", {length: 255}).notNull(),
        workingHours: varchar("working_hours", {length: 128}),
    },
    (t) => [primaryKey({columns: [t.branchId, t.languageCode]})],
);

/** Short product videos on the home page ("Product videos"), each optionally linking to a post (e.g. an Instagram reel). */
export const productVideos = pgTable(
    "product_videos",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        videoId: uuid("video_id")
            .notNull()
            .references(() => media.id, {onDelete: "restrict"}),
        link: varchar("link", {length: 500}),
        isActive: boolean("is_active").notNull().default(true),
        sortOrder: integer("sort_order").notNull().default(0),
        updatedById: uuid("updated_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        ...timestamps,
    },
    (t) => [index("product_videos_country_idx").on(t.countryCode, t.sortOrder)],
);

/* ------------------------------------------------------------------ */
/* Sales: customers, orders, inquiries                                 */
/* ------------------------------------------------------------------ */

/** Site visitors with an account (email + password, or Google). */
export const customers = pgTable(
    "customers",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        /** Country where the account was created. */
        countryCode: char("country_code", {length: 2}).references(() => countries.code, {onDelete: "set null"}),
        email: varchar("email", {length: 255}).notNull(),
        fullName: varchar("full_name", {length: 128}).notNull(),
        phone: varchar("phone", {length: 32}),
        /** Null for accounts that only sign in with Google. */
        passwordHash: text("password_hash"),
        googleLinked: boolean("google_linked").notNull().default(false),
        isActive: boolean("is_active").notNull().default(true),
        lastLoginAt: timestamp("last_login_at", {withTimezone: true}),
        legacyId: varchar("legacy_id", {length: 64}),
        ...timestamps,
    },
    (t) => [
        uniqueIndex("customers_email_idx").on(sql`lower(${t.email})`),
        uniqueIndex("customers_legacy_idx").on(t.legacyId),
        index("customers_country_idx").on(t.countryCode, t.createdAt),
    ],
);

export const orderStatus = pgEnum("order_status", ["new", "confirmed", "in_progress", "shipped", "completed", "cancelled"]);
export type OrderStatus = (typeof orderStatus.enumValues)[number];

export const orders = pgTable(
    "orders",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "restrict"}),
        customerId: uuid("customer_id").references(() => customers.id, {onDelete: "set null"}),
        status: orderStatus("status").notNull().default("new"),
        contactName: varchar("contact_name", {length: 160}).notNull(),
        phone: varchar("phone", {length: 32}).notNull(),
        secondPhone: varchar("second_phone", {length: 32}),
        email: varchar("email", {length: 255}),
        address: text("address"),
        latitude: numeric("latitude", {precision: 10, scale: 7}),
        longitude: numeric("longitude", {precision: 10, scale: 7}),
        comment: text("comment"),
        /** Currency the visitor saw, and its rate at the time of the order. */
        currencyCode: char("currency_code", {length: 3}).notNull().default("USD"),
        rateToUsd: numeric("rate_to_usd", {precision: 18, scale: 6}).notNull().default("1"),
        totalUsd: numeric("total_usd", {precision: 14, scale: 2}).notNull(),
        legacyId: integer("legacy_id"),
        ...timestamps,
    },
    (t) => [
        index("orders_list_idx").on(t.countryCode, t.status, t.createdAt),
        index("orders_customer_idx").on(t.customerId, t.createdAt),
        uniqueIndex("orders_legacy_idx").on(t.countryCode, t.legacyId),
    ],
);

export const orderItems = pgTable(
    "order_items",
    {
        id: serial("id").primaryKey(),
        orderId: integer("order_id")
            .notNull()
            .references(() => orders.id, {onDelete: "cascade"}),
        productId: integer("product_id").references(() => products.id, {onDelete: "set null"}),
        /** Copied from the product when ordered, so the order stays readable if the product changes. */
        sku: varchar("sku", {length: 64}).notNull(),
        name: varchar("name", {length: 200}).notNull(),
        quantity: integer("quantity").notNull(),
        unitPriceUsd: numeric("unit_price_usd", {precision: 12, scale: 2}).notNull(),
    },
    (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Status changes and notes on an order. */
export const orderEvents = pgTable(
    "order_events",
    {
        id: bigserial("id", {mode: "number"}).primaryKey(),
        orderId: integer("order_id")
            .notNull()
            .references(() => orders.id, {onDelete: "cascade"}),
        fromStatus: orderStatus("from_status"),
        toStatus: orderStatus("to_status"),
        note: text("note"),
        userId: uuid("user_id").references(() => adminUsers.id, {onDelete: "set null"}),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

/** Logos customers upload on the B2B page to preview branded gifts. The newest one is shown. */
export const customerLogos = pgTable(
    "customer_logos",
    {
        id: serial("id").primaryKey(),
        customerId: uuid("customer_id")
            .notNull()
            .references(() => customers.id, {onDelete: "cascade"}),
        mediaId: uuid("media_id")
            .notNull()
            .references(() => media.id, {onDelete: "cascade"}),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [index("customer_logos_customer_idx").on(t.customerId, t.createdAt)],
);

export const inquiryStatus = pgEnum("inquiry_status", ["new", "done"]);

/** Requests from the site's contact / support forms. */
export const inquiries = pgTable(
    "inquiries",
    {
        id: serial("id").primaryKey(),
        countryCode: char("country_code", {length: 2})
            .notNull()
            .references(() => countries.code, {onDelete: "cascade"}),
        name: varchar("name", {length: 160}).notNull(),
        phone: varchar("phone", {length: 32}).notNull(),
        message: text("message"),
        /** Where the form was sent from, e.g. "support". */
        source: varchar("source", {length: 64}),
        status: inquiryStatus("status").notNull().default("new"),
        handledById: uuid("handled_by_id").references(() => adminUsers.id, {onDelete: "set null"}),
        handledAt: timestamp("handled_at", {withTimezone: true}),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [index("inquiries_list_idx").on(t.countryCode, t.status, t.createdAt)],
);

export type Language = typeof languages.$inferSelect;
export type Currency = typeof currencies.$inferSelect;
export type Country = typeof countries.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminMembership = typeof adminMemberships.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type PageEntry = typeof pageEntries.$inferSelect;
export type News = typeof news.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
