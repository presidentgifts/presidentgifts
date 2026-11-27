import {PERMISSIONS, Permission} from "@/server/auth/permissions";
import type {AdminDictionary} from "@/lib/admin-i18n";

export type NavGroupKey = keyof AdminDictionary["nav"]["groups"];
export type NavItemKey = keyof AdminDictionary["nav"]["items"];

export interface NavItem {
    key: NavItemKey;
    href: string;
    group: NavGroupKey;
    /** Needed in the active country to see the item. */
    permission?: Permission;
    /** Only super admins see it. */
    superAdminOnly?: boolean;
    /** False until the section is built; shown greyed out with a "Soon" badge. */
    available: boolean;
}

export const NAV_GROUPS: NavGroupKey[] = ["main", "catalog", "content", "sales", "settings"];

export const NAV_ITEMS: NavItem[] = [
    {key: "dashboard", href: "/admin", group: "main", available: true},

    {key: "products", href: "/admin/products", group: "catalog", permission: PERMISSIONS.catalogEdit, available: true},
    {key: "categories", href: "/admin/categories", group: "catalog", permission: PERMISSIONS.catalogEdit, available: true},
    {key: "collections", href: "/admin/collections", group: "catalog", permission: PERMISSIONS.catalogEdit, available: true},

    {key: "news", href: "/admin/news", group: "content", permission: PERMISSIONS.contentEdit, available: true},
    {key: "uiTexts", href: "/admin/ui-texts", group: "content", permission: PERMISSIONS.contentEdit, available: true},
    {key: "branches", href: "/admin/branches", group: "content", permission: PERMISSIONS.contentEdit, available: true},
    {key: "productVideos", href: "/admin/product-videos", group: "content", permission: PERMISSIONS.contentEdit, available: true},

    {key: "orders", href: "/admin/orders", group: "sales", permission: PERMISSIONS.ordersView, available: true},
    {key: "inquiries", href: "/admin/inquiries", group: "sales", permission: PERMISSIONS.ordersView, available: true},
    {key: "customers", href: "/admin/customers", group: "sales", permission: PERMISSIONS.ordersView, available: true},

    {key: "countries", href: "/admin/countries", group: "settings", permission: PERMISSIONS.countrySettings, available: true},
    {key: "languages", href: "/admin/languages", group: "settings", superAdminOnly: true, available: true},
    {key: "currencies", href: "/admin/currencies", group: "settings", superAdminOnly: true, available: true},
    {key: "staff", href: "/admin/staff", group: "settings", permission: PERMISSIONS.usersManage, available: true},
    {key: "roles", href: "/admin/roles", group: "settings", superAdminOnly: true, available: false},
    {key: "audit", href: "/admin/audit", group: "settings", permission: PERMISSIONS.auditView, available: false},
];
