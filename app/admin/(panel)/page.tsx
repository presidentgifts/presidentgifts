import Link from "next/link";
import {AlertTriangle, BadgeDollarSign, CheckCircle2, ChevronRight, Globe2, Languages, Users} from "lucide-react";
import {getAccessibleCountries, getActiveCountryCode, requireAdmin} from "@/server/auth/access";
import {getAdminTexts} from "@/server/admin-locale";
import {getAttentionItems, getDashboardData} from "@/server/services/dashboard";
import {format} from "@/lib/admin-i18n";
import {cn} from "@/lib/utils";

export const metadata = {title: "Dashboard"};

export default async function AdminDashboardPage() {
    const ctx = await requireAdmin();
    const t = await getAdminTexts();
    const accessible = await getAccessibleCountries(ctx);
    const {countries, stats} = await getDashboardData(ctx, accessible.map((c) => c.code));
    const activeCountry = await getActiveCountryCode(ctx);
    const attention = await getAttentionItems(ctx, activeCountry);
    const activeName = accessible.find((c) => c.code === activeCountry)?.name ?? "";

    const statCards = [
        {label: t.dashboard.stats.countries, value: stats.countries, icon: Globe2},
        {label: t.dashboard.stats.languages, value: stats.languages, icon: Languages},
        {label: t.dashboard.stats.currencies, value: stats.currencies, icon: BadgeDollarSign},
        {label: t.dashboard.stats.staff, value: stats.staff, icon: Users},
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    {format(t.dashboard.welcome, {name: ctx.user.fullName.split(" ")[0]})}
                </h1>
                <p className="mt-1 text-sm text-neutral-500">{t.dashboard.subtitle}</p>
            </div>

            {countries.length === 0 && (
                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertTriangle className="size-5 shrink-0"/>
                    <p>{t.dashboard.noCountry}</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map(({label, value, icon: Icon}) => (
                    <div key={label} className="rounded-lg border border-neutral-200 bg-white p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-neutral-500">{label}</p>
                            <Icon className="size-4 text-neutral-400"/>
                        </div>
                        <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                {countries.length > 0 && (
                    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white xl:col-span-2">
                        <h2 className="border-b border-neutral-200 px-5 py-4 font-semibold">{t.dashboard.countriesTitle}</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                                <tr>
                                    <th className="px-5 py-3 font-medium">{t.dashboard.columns.country}</th>
                                    <th className="px-5 py-3 font-medium">{t.dashboard.columns.languages}</th>
                                    <th className="px-5 py-3 font-medium">{t.dashboard.columns.currencies}</th>
                                    <th className="px-5 py-3 font-medium">{t.dashboard.columns.status}</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                {countries.map((country) => (
                                    <tr key={country.code} className="align-top">
                                        <td className="px-5 py-4">
                                            <p className="font-medium">{country.name}</p>
                                            <p className="font-mono text-xs text-neutral-400">{country.code}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {country.languages.map((l) => (
                                                    <span
                                                        key={l.code}
                                                        title={l.isDefault ? t.common.default : undefined}
                                                        className={cn(
                                                            "rounded-md border px-2 py-0.5 text-xs",
                                                            l.isDefault
                                                                ? "border-primary bg-primary text-white"
                                                                : "border-neutral-200 text-neutral-700",
                                                        )}
                                                    >
                                                        {l.nativeName}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-1">
                                                {country.currencies.map((c) => (
                                                    <p key={c.code} className="text-xs">
                                                        <span className={cn("font-mono", c.isDefault && "font-semibold")}>{c.code}</span>
                                                        <span className="text-neutral-400">
                                                            {" · "}
                                                            {c.code === "USD"
                                                                ? "1 USD"
                                                                : c.rateToUsd
                                                                    ? `1 USD = ${Number(c.rateToUsd).toLocaleString("en-US")} ${c.code}`
                                                                    : `${t.common.notSet}`}
                                                        </span>
                                                    </p>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                                                    country.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500",
                                                )}
                                            >
                                                <span className={cn("size-1.5 rounded-full", country.isActive ? "bg-emerald-500" : "bg-neutral-400")}/>
                                                {country.isActive ? t.common.active : t.common.inactive}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <section className="rounded-lg border border-neutral-200 bg-white p-5">
                    <h2 className="font-semibold">{t.dashboard.attentionTitle}</h2>
                    {activeName && <p className="text-xs text-neutral-500">{activeName}</p>}
                    <ul className="mt-4 space-y-1">
                        {attention.map((item) => (
                            <li key={item.key}>
                                <Link href={item.href} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-neutral-50">
                                    <span className="text-neutral-700">{t.dashboard.attention[item.key]}</span>
                                    <span className="flex items-center gap-1">
                                        <span className={cn(
                                            "min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
                                            item.count > 0 ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-400",
                                        )}>{item.count}</span>
                                        <ChevronRight className="size-4 text-neutral-300"/>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    {attention.every((item) => item.count === 0) && (
                        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
                            <CheckCircle2 className="size-4"/>
                            {t.dashboard.allClear}
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}
