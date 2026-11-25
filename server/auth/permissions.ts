/**
 * Everything an admin user can be allowed to do. Roles (stored in the `roles`
 * table) are sets of these permissions, so new roles can be created without
 * code changes. Super admins have every permission in every country.
 */
export const PERMISSIONS = {
    /** Enable languages and currencies in the country, set exchange rates and contacts. */
    countrySettings: "country.settings",
    /** Add, edit and remove staff of the country. */
    usersManage: "users.manage",
    /** Create and edit products, categories and collections (as drafts). */
    catalogEdit: "catalog.edit",
    /** Publish catalog changes to the site. */
    catalogPublish: "catalog.publish",
    /** Change product prices. */
    pricesEdit: "prices.edit",
    /** Create and edit pages, news, banners, interface texts (as drafts). */
    contentEdit: "content.edit",
    /** Publish content changes to the site. */
    contentPublish: "content.publish",
    ordersView: "orders.view",
    /** Change order status, add notes. */
    ordersManage: "orders.manage",
    auditView: "audit.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/** Actions only super admins can do, regardless of roles. */
export const SUPER_ADMIN_ONLY = {
    countriesManage: "countries.manage",
    languagesManage: "languages.manage",
    currenciesManage: "currencies.manage",
    rolesManage: "roles.manage",
} as const;

export const SYSTEM_ROLES = {
    countryAdmin: "country_admin",
    contentManager: "content_manager",
    orderOperator: "order_operator",
} as const;

export const SYSTEM_ROLE_DEFINITIONS: {
    key: string;
    name: string;
    description: string;
    permissions: Permission[];
}[] = [
    {
        key: SYSTEM_ROLES.countryAdmin,
        name: "Country admin",
        description: "Manages a country: languages, currencies, prices, content, orders and staff.",
        permissions: ALL_PERMISSIONS,
    },
    {
        key: SYSTEM_ROLES.contentManager,
        name: "Content manager",
        description: "Adds products, texts and images. Changes go live after the country admin approves them.",
        permissions: [PERMISSIONS.catalogEdit, PERMISSIONS.contentEdit],
    },
    {
        key: SYSTEM_ROLES.orderOperator,
        name: "Order operator",
        description: "Processes orders: views them and changes their status.",
        permissions: [PERMISSIONS.ordersView, PERMISSIONS.ordersManage],
    },
];
