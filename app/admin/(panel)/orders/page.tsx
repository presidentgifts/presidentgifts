import Link from "next/link";
import {getSalesContext} from "@/server/services/sales/context";
import {countOrdersByStatus, listOrders, ORDER_STATUSES} from "@/server/services/sales/orders";
import type {OrderStatus} from "@/server/db/schema";
import {Card, EmptyRow, PageHeader, td, th, theadClass} from "@/components/admin/kit";
import {SearchBox} from "@/components/admin/search-box";
import {OrderStatusBadge} from "@/components/admin/order-status-badge";
import {Button} from "@/components/ui/button";
import {format} from "@/lib/admin-i18n";
import {formatMoney, fromUsd} from "@/lib/money";
import {cn} from "@/lib/utils";

export const metadata = {title: "Orders"};

type Params = Promise<{ status?: string; q?: string; page?: string }>;

export default async function OrdersPage({searchParams}: { searchParams: Params }) {
    const {texts, country, locale} = await getSalesContext();
    const t = texts.ordersPage;
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={t.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }

    const params = await searchParams;
    const status = (ORDER_STATUSES as readonly string[]).includes(params.status ?? "") ? (params.status as OrderStatus) : undefined;
    const q = params.q?.slice(0, 100) ?? "";
    const page = Math.max(1, Number(params.page) || 1);
    const [result, counts] = await Promise.all([
        listOrders([country.code], {status, q, page}),
        countOrdersByStatus([country.code]),
    ]);
    const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);

    const href = (patch: Record<string, string | number | undefined>) => {
        const next = new URLSearchParams();
        const merged = {status, q: q || undefined, page: undefined as number | undefined, ...patch};
        for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") next.set(k, String(v));
        const s = next.toString();
        return s ? `/admin/orders?${s}` : "/admin/orders";
    };
    const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
    const to = Math.min(result.total, result.page * result.pageSize);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}/>

            <div className="flex flex-wrap gap-1 border-b border-neutral-200">
                {[undefined, ...ORDER_STATUSES].map((s) => {
                    const n = s ? counts[s] ?? 0 : total;
                    return (
                        <Link
                            key={s ?? "all"}
                            href={href({status: s})}
                            className={cn(
                                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm",
                                s === status ? "border-primary font-medium text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800",
                            )}
                        >
                            {s ? texts.orderStatus[s] : texts.catalog.all}
                            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", s === "new" && n > 0 ? "bg-blue-100 text-blue-800" : "bg-neutral-100 text-neutral-500")}>{n}</span>
                        </Link>
                    );
                })}
            </div>

            <SearchBox placeholder={t.search} initial={q}/>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{t.number}</th>
                            <th className={th}>{t.date}</th>
                            <th className={th}>{t.customer}</th>
                            <th className={`${th} text-right`}>{t.items}</th>
                            <th className={`${th} text-right`}>{t.total}</th>
                            <th className={th}>{texts.fields.status}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {result.rows.length === 0 && <EmptyRow colSpan={6} text={t.empty}/>}
                        {result.rows.map((o) => (
                            <tr key={o.id} className="hover:bg-neutral-50/60">
                                <td className={td}>
                                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold hover:underline">#{o.id}</Link>
                                </td>
                                <td className={`${td} whitespace-nowrap text-neutral-500`}>
                                    {new Date(o.createdAt).toLocaleString(locale, {dateStyle: "medium", timeStyle: "short"})}
                                </td>
                                <td className={td}>
                                    <Link href={`/admin/orders/${o.id}`} className="block">
                                        <span className="block font-medium">{o.contactName}</span>
                                        <span className="block text-xs text-neutral-500">{o.phone}</span>
                                    </Link>
                                </td>
                                <td className={`${td} text-right tabular-nums text-neutral-600`}>{o.items}</td>
                                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                                    <span className="block font-medium">{formatMoney(fromUsd(o.totalUsd, o.rateToUsd), o.currencyCode, locale)}</span>
                                    {o.currencyCode !== "USD" && <span className="block text-xs text-neutral-400">{formatMoney(o.totalUsd, "USD")}</span>}
                                </td>
                                <td className={td}><OrderStatusBadge status={o.status} texts={texts}/></td>
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
                                <Link href={href({page: result.page - 1})}>{texts.catalog.prev}</Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild className={cn(to >= result.total && "pointer-events-none opacity-50")}>
                                <Link href={href({page: result.page + 1})}>{texts.catalog.next}</Link>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
