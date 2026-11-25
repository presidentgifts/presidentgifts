import {notFound} from "next/navigation";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {requirePermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {getAdminTexts} from "@/server/admin-locale";
import {getCountryDetail, MAX_COUNTRY_LANGUAGES} from "@/server/services/countries";
import {listCurrencies, listLanguages} from "@/server/services/reference";
import {StatusBadge} from "@/components/admin/kit";
import {CountrySettings} from "./country-settings";

export async function generateMetadata({params}: { params: Promise<{ code: string }> }) {
    return {title: (await params).code.toUpperCase()};
}

export default async function CountryPage({params}: { params: Promise<{ code: string }> }) {
    const code = (await params).code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) notFound();

    const ctx = await requirePermission(PERMISSIONS.countrySettings, code);
    const [texts, detail, languages, currencies] = await Promise.all([
        getAdminTexts(),
        getCountryDetail(code),
        listLanguages(),
        listCurrencies(),
    ]);
    if (!detail) notFound();
    const {country} = detail;

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/countries" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
                    <ArrowLeft className="size-4"/>
                    {texts.nav.items.countries}
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-neutral-900 font-mono text-sm font-semibold text-white">
                        {country.code}
                    </span>
                    <h1 className="text-2xl font-semibold tracking-tight">{country.name}</h1>
                    <StatusBadge active={country.isActive} texts={texts}/>
                </div>
            </div>

            <CountrySettings
                texts={texts}
                canToggle={ctx.user.isSuperAdmin}
                maxLanguages={MAX_COUNTRY_LANGUAGES}
                country={{
                    code: country.code,
                    name: country.name,
                    phone: country.phone ?? "",
                    email: country.email ?? "",
                    isActive: country.isActive,
                    defaultLanguageCode: country.defaultLanguageCode,
                    defaultCurrencyCode: country.defaultCurrencyCode,
                }}
                languages={detail.languages.map(({code, isActive}) => ({code, isActive}))}
                currencies={detail.currencies.map(({code, isActive, rateToUsd}) => ({
                    code,
                    isActive,
                    rateToUsd: rateToUsd === null ? null : String(Number(rateToUsd)),
                }))}
                languageOptions={languages.map((l) => ({code: l.code, name: l.name, nativeName: l.nativeName, isActive: l.isActive}))}
                currencyOptions={currencies.map((c) => ({code: c.code, name: c.name, symbol: c.symbol}))}
            />
        </div>
    );
}
