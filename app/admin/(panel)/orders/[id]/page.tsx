import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, ExternalLink, Mail, MapPin, MessageSquare, Package, Phone, User} from "lucide-react";
import {getSalesContext} from "@/server/services/sales/context";
import {getAdminLanguage} from "@/server/admin-locale";
import {getOrderDetail} from "@/server/services/sales/orders";
import {Card, td, th, theadClass} from "@/components/admin/kit";
import {OrderStatusBadge} from "@/components/admin/order-status-badge";
import {format} from "@/lib/admin-i18n";
import {formatMoney, fromUsd} from "@/lib/money";
import {OrderManager} from "./order-manager";

export async function generateMetadata({params}: { params: Promise<{ id: string }> }) {
    return {title: `Order #${(await params).id}`};
}

export default async function OrderPage({params}: { params: Promise<{ id: string }> }) {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) notFound();

    const detail = await getOrderDetail(id, await getAdminLanguage());
    if (!detail) notFound();
    const {order, items, events, customer} = detail;
    const {texts, country, locale} = await getSalesContext(order.countryCode);
    if (!country) notFound();
    const t = texts.ordersPage;

    const local = (usd: string | number) => formatMoney(fromUsd(usd, order.rateToUsd), order.currencyCode, locale);
    const date = (iso: string | Date) => new Date(iso).toLocaleString(locale, {dateStyle: "medium", timeStyle: "short"});

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
                    <ArrowLeft className="size-4"/>
                    {t.back}
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h1 className="font-mono text-2xl font-semibold tracking-tight">#{order.id}</h1>
                    <OrderStatusBadge status={order.status} texts={texts}/>
                    <span className="text-sm text-neutral-500">{date(order.createdAt)} · {country.name}</span>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
                <div className="space-y-6">
                    <Card className="overflow-hidden">
                        <h2 className="border-b border-neutral-200 px-5 py-4 font-semibold">{t.products}</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={theadClass}>
                                <tr>
                                    <th className={th}>{texts.catalog.name}</th>
                                    <th className={`${th} text-right`}>{t.price}</th>
                                    <th className={`${th} text-right`}>{t.quantity}</th>
                                    <th className={`${th} text-right`}>{t.sum}</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td className={td}>
                                            <div className="flex items-center gap-3">
                                                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100">
                                                    {item.thumbnail ? (
                                                        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                                                        <img src={item.thumbnail} alt="" className="size-full object-cover"/>
                                                    ) : (
                                                        <Package className="size-4 text-neutral-400"/>
                                                    )}
                                                </span>
                                                <div>
                                                    {item.productId ? (
                                                        <Link href={`/admin/products/${item.productId}`} className="font-medium hover:underline">{item.name}</Link>
                                                    ) : (
                                                        <span className="font-medium">{item.name} <span className="text-xs font-normal text-neutral-400">({t.removedProduct})</span></span>
                                                    )}
                                                    <p className="font-mono text-xs text-neutral-500">{item.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{local(item.unitPriceUsd)}</td>
                                        <td className={`${td} text-right tabular-nums`}>{item.quantity}</td>
                                        <td className={`${td} whitespace-nowrap text-right font-medium tabular-nums`}>
                                            {local(Number(item.unitPriceUsd) * item.quantity)}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                                <tfoot>
                                <tr className="border-t border-neutral-200 bg-neutral-50">
                                    <td className={`${td} font-semibold`} colSpan={3}>{t.total}</td>
                                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                                        <span className="block text-base font-semibold">{local(order.totalUsd)}</span>
                                        {order.currencyCode !== "USD" && <span className="block text-xs text-neutral-500">{formatMoney(order.totalUsd, "USD")}</span>}
                                    </td>
                                </tr>
                                </tfoot>
                            </table>
                        </div>
                        {order.currencyCode !== "USD" && (
                            <p className="border-t border-neutral-200 px-5 py-3 text-xs text-neutral-500">
                                {format(t.rateNote, {rate: Number(order.rateToUsd).toLocaleString(locale), currency: order.currencyCode})}
                            </p>
                        )}
                    </Card>

                    <Card className="p-5">
                        <h2 className="mb-4 font-semibold">{t.history}</h2>
                        <ol className="space-y-4">
                            {events.map((event) => (
                                <li key={event.id} className="flex gap-3 text-sm">
                                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-neutral-300"/>
                                    <div className="min-w-0">
                                        <p>
                                            {event.fromStatus && event.toStatus
                                                ? format(t.changed, {from: texts.orderStatus[event.fromStatus], to: texts.orderStatus[event.toStatus]})
                                                : !event.fromStatus && event.toStatus === "new" && !event.userName
                                                    ? t.created
                                                    : null}
                                        </p>
                                        {event.note && <p className="whitespace-pre-wrap text-neutral-700">{event.note}</p>}
                                        <p className="text-xs text-neutral-400">{event.userName ?? t.system} · {date(event.createdAt)}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <h2 className="mb-4 font-semibold">{t.manage}</h2>
                        {country.canManage ? (
                            <OrderManager key={`${order.status}-${events.length}`} texts={texts} orderId={order.id} status={order.status}/>
                        ) : (
                            <p className="text-sm text-neutral-500">{t.viewOnly}</p>
                        )}
                    </Card>

                    <Card className="space-y-4 p-5 text-sm">
                        <h2 className="font-semibold">{t.contact}</h2>
                        <p className="flex items-center gap-2"><User className="size-4 text-neutral-400"/>{order.contactName}</p>
                        <p className="flex items-center gap-2"><Phone className="size-4 text-neutral-400"/><a href={`tel:${order.phone}`} className="hover:underline">{order.phone}</a></p>
                        {order.secondPhone && (
                            <p className="flex items-center gap-2"><Phone className="size-4 text-neutral-400"/><a href={`tel:${order.secondPhone}`} className="hover:underline">{order.secondPhone}</a> <span className="text-xs text-neutral-400">({t.secondPhone})</span></p>
                        )}
                        {order.email && <p className="flex items-center gap-2"><Mail className="size-4 text-neutral-400"/>{order.email}</p>}
                        {(order.address || order.latitude) && (
                            <div className="flex gap-2">
                                <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-400"/>
                                <div>
                                    <p className="text-xs text-neutral-500">{t.address}</p>
                                    <p>{order.address}</p>
                                    {order.latitude && order.longitude && (
                                        <a href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-600 hover:underline">
                                            {t.openMap} <ExternalLink className="size-3"/>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                        {order.comment && (
                            <div className="flex gap-2">
                                <MessageSquare className="mt-0.5 size-4 shrink-0 text-neutral-400"/>
                                <p className="whitespace-pre-wrap">{order.comment}</p>
                            </div>
                        )}
                        <div className="border-t border-neutral-100 pt-4">
                            <p className="text-xs text-neutral-500">{t.account}</p>
                            {customer ? (
                                <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:underline">{customer.fullName} · {customer.email}</Link>
                            ) : (
                                <p className="text-neutral-500">{t.guest}</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
