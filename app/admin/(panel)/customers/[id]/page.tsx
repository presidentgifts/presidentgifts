import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, Mail, Phone} from "lucide-react";
import {getSalesContext} from "@/server/services/sales/context";
import {getCustomer} from "@/server/services/sales/customers";
import {listOrders} from "@/server/services/sales/orders";
import {Card, EmptyRow, td, th, theadClass} from "@/components/admin/kit";
import {OrderStatusBadge} from "@/components/admin/order-status-badge";
import {formatMoney, fromUsd} from "@/lib/money";
import {CustomerBlockButton} from "./block-button";

export const metadata = {title: "Customer"};

export default async function CustomerPage({params}: { params: Promise<{ id: string }> }) {
    const {id} = await params;
    const {texts, country, locale} = await getSalesContext();
    if (!country) notFound();
    const customer = await getCustomer(id, [country.code]);
    if (!customer) notFound();
    const t = texts.customersPage;
    const orders = await listOrders([country.code], {customerId: customer.id});

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
                    <ArrowLeft className="size-4"/>
                    {t.back}
                </Link>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight">{customer.fullName}</h1>
                        {!customer.isActive && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{t.blocked}</span>}
                    </div>
                    {country.canManage && (
                        <CustomerBlockButton key={String(customer.isActive)} texts={texts} id={customer.id} name={customer.fullName} isActive={customer.isActive}/>
                    )}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-neutral-600">
                    <span className="flex items-center gap-1.5"><Mail className="size-4 text-neutral-400"/>{customer.email}</span>
                    {customer.phone && <span className="flex items-center gap-1.5"><Phone className="size-4 text-neutral-400"/>{customer.phone}</span>}
                    <span className="text-neutral-400">{t.registered}: {customer.createdAt.toLocaleDateString(locale)}</span>
                    {customer.googleLinked && <span className="text-neutral-400">{t.google}</span>}
                </div>
            </div>

            <Card className="overflow-hidden">
                <h2 className="border-b border-neutral-200 px-5 py-4 font-semibold">{t.ordersTitle} ({orders.total})</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{texts.ordersPage.number}</th>
                            <th className={th}>{texts.ordersPage.date}</th>
                            <th className={`${th} text-right`}>{texts.ordersPage.total}</th>
                            <th className={th}>{texts.fields.status}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {orders.rows.length === 0 && <EmptyRow colSpan={4} text={texts.ordersPage.empty}/>}
                        {orders.rows.map((o) => (
                            <tr key={o.id} className="hover:bg-neutral-50/60">
                                <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold hover:underline">#{o.id}</Link></td>
                                <td className={`${td} text-neutral-500`}>{new Date(o.createdAt).toLocaleString(locale, {dateStyle: "medium", timeStyle: "short"})}</td>
                                <td className={`${td} text-right tabular-nums`}>{formatMoney(fromUsd(o.totalUsd, o.rateToUsd), o.currencyCode, locale)}</td>
                                <td className={td}><OrderStatusBadge status={o.status} texts={texts}/></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
