import Link from "next/link";
import {ChevronRight, Mail, Phone} from "lucide-react";
import {countriesWithPermission, requireAdmin} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {getAdminTexts} from "@/server/admin-locale";
import {listCountries} from "@/server/services/countries";
import {listCurrencies, listLanguages} from "@/server/services/reference";
import {Card, PageHeader, StatusBadge} from "@/components/admin/kit";
import {format} from "@/lib/admin-i18n";
import {CreateCountryButton} from "./create-country";

export const metadata = {title: "Countries"};

export default async function CountriesPage() {
    const ctx = await requireAdmin();
    const texts = await getAdminTexts();
    const t = texts.countriesPage;
    const isSuper = ctx.user.isSuperAdmin;

    const codes = await countriesWithPermission(ctx, PERMISSIONS.countrySettings);
    const [countries, languages, currencies] = await Promise.all([
        listCountries(isSuper ? undefined : codes),
        isSuper ? listLanguages() : Promise.resolve([]),
        isSuper ? listCurrencies() : Promise.resolve([]),
    ]);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={t.subtitle}>
                {isSuper && (
                    <CreateCountryButton
                        texts={texts}
                        languages={languages.filter((l) => l.isActive).map((l) => ({code: l.code, label: l.nativeName}))}
                        currencies={currencies.map((c) => ({code: c.code, label: c.name}))}
                    />
                )}
            </PageHeader>

            {countries.length === 0 && (
                <Card className="p-10 text-center text-sm text-neutral-500">{t.empty}</Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {countries.map((country) => (
                    <Link
                        key={country.code}
                        href={`/admin/countries/${country.code}`}
                        className="group flex flex-col rounded-lg border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="flex size-10 items-center justify-center rounded-md bg-neutral-100 font-mono text-sm font-semibold">
                                    {country.code}
                                </span>
                                <div>
                                    <p className="font-semibold">{country.name}</p>
                                    <p className="text-xs text-neutral-500">{format(t.staffCount, {count: country.staff})}</p>
                                </div>
                            </div>
                            <StatusBadge active={country.isActive} texts={texts}/>
                        </div>

                        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <dt className="text-xs text-neutral-500">{texts.countryPage.languages}</dt>
                                <dd className="mt-1 font-mono text-xs uppercase">
                                    {country.languages.map((code) => (
                                        <span key={code} className={code === country.defaultLanguageCode ? "font-bold" : "text-neutral-600"}>
                                            {code}{" "}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-neutral-500">{texts.countryPage.currencies}</dt>
                                <dd className="mt-1 font-mono text-xs">
                                    {country.currencies.map((code) => (
                                        <span key={code} className={code === country.defaultCurrencyCode ? "font-bold" : "text-neutral-600"}>
                                            {code}{" "}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-5 flex items-end justify-between gap-3 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
                            <div className="space-y-1">
                                {country.phone && <p className="flex items-center gap-1.5"><Phone className="size-3"/>{country.phone}</p>}
                                {country.email && <p className="flex items-center gap-1.5"><Mail className="size-3"/>{country.email}</p>}
                            </div>
                            <span className="flex items-center gap-1 font-medium text-neutral-900">
                                {t.settings}
                                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5"/>
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
