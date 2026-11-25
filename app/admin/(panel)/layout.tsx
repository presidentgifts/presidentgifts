import React from "react";
import {requireAdmin, getAccessibleCountries, getActiveCountryCode, hasPermission} from "@/server/auth/access";
import {getAdminLanguage} from "@/server/admin-locale";
import {getAdminDictionary} from "@/lib/admin-i18n";
import {AdminShell} from "@/components/admin/admin-shell";
import {NAV_ITEMS} from "@/components/admin/nav-config";

export default async function AdminPanelLayout({children}: { children: React.ReactNode }) {
    const ctx = await requireAdmin();
    const language = await getAdminLanguage();
    const texts = getAdminDictionary(language);

    const countries = await getAccessibleCountries(ctx);
    const activeCountry = await getActiveCountryCode(ctx);

    const navItems = NAV_ITEMS.filter((item) => {
        if (item.superAdminOnly) return ctx.user.isSuperAdmin;
        if (!item.permission) return true;
        return activeCountry !== null && hasPermission(ctx, item.permission, activeCountry);
    });

    const roleKey = ctx.user.isSuperAdmin
        ? "super_admin"
        : ctx.memberships.find((m) => m.countryCode === activeCountry)?.roleKey;
    const roleLabel = roleKey ? (texts.roles[roleKey] ?? roleKey) : "";

    return (
        <AdminShell
            texts={texts}
            language={language}
            navItems={navItems}
            user={{fullName: ctx.user.fullName, email: ctx.user.email, roleLabel}}
            countries={countries.map(({code, name}) => ({code, name}))}
            activeCountry={activeCountry}
        >
            {children}
        </AdminShell>
    );
}
