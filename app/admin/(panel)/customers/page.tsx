import Link from "next/link";
import {getSalesContext} from "@/server/services/sales/context";
import {listCustomers} from "@/server/services/sales/customers";
import {Card, EmptyRow, PageHeader, td, th, theadClass} from "@/components/admin/kit";
import {SearchBox} from "@/components/admin/search-box";
import {Button} from "@/components/ui/button";
import {format} from "@/lib/admin-i18n";
import {formatMoney} from "@/lib/money";
import {cn} from "@/lib/utils";

export const metadata = {title: "Customers"};

export default async function CustomersPage({searchParams}: { searchParams: Promise<{ q?: string; page?: string }> }) {
    const {texts, country, locale} = await getSalesContext();
    const t = texts.customersPage;
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={t.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }
    const params = await searchParams;
    const q = params.q?.slice(0, 100) ?? "";
    const result = await listCustomers([country.code], q, Math.max(1, Number(params.page) || 1));
    const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
    const to = Math.min(result.total, result.page * result.pageSize);
    const href = (page: number) => `/admin/customers?${new URLSearchParams({...(q ? {q} : {}), page: String(page)})}`;

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}/>
            <SearchBox placeholder={t.search} initial={q}/>
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{texts.fields.fullName}</th>
                            <th className={th}>{texts.fields.phone}</th>
                            <th className={`${th} text-right`}>{t.orders}</th>
                            <th className={`${th} text-right`}>{t.spent}</th>
                            <th className={th}>{t.registered}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {result.rows.length === 0 && <EmptyRow colSpan={5} text={t.empty}/>}
                        {result.rows.map((c) => (
                            <tr key={c.id} className="hover:bg-neutral-50/60">
                                <td className={td}>
                                    <Link href={`/admin/customers/${c.id}`} className="block">
                                        <span className="flex items-center gap-2 font-medium hover:underline">
                                            {c.fullName}
                                            {c.googleLinked && <span className="rounded bg-neutral-100 px-1 text-[10px] font-normal text-neutral-500">{t.google}</span>}
                                            {!c.isActive && <span className="rounded bg-red-50 px-1 text-[10px] font-normal text-red-700">{t.blocked}</span>}
                                        </span>
                                        <span className="block text-xs text-neutral-500">{c.email}</span>
                                    </Link>
                                </td>
                                <td className={`${td} whitespace-nowrap text-neutral-600`}>{c.phone ?? "—"}</td>
                                <td className={`${td} text-right tabular-nums`}>{c.orders}</td>
                                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{c.orders ? formatMoney(c.totalUsd, "USD") : "—"}</td>
                                <td className={`${td} whitespace-nowrap text-neutral-500`}>{new Date(c.createdAt).toLocaleDateString(locale)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                {result.total > result.pageSize && (
                    <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 text-sm">
                        <span className="text-neutral-500">{format(texts.catalog.pageOf, {from, to, total: result.total})}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild className={cn(result.page <= 1 && "pointer-events-none opacity-50")}>
                                <Link href={href(result.page - 1)}>{texts.catalog.prev}</Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild className={cn(to >= result.total && "pointer-events-none opacity-50")}>
                                <Link href={href(result.page + 1)}>{texts.catalog.next}</Link>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
