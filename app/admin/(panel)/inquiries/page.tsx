import Link from "next/link";
import {Phone} from "lucide-react";
import {getSalesContext} from "@/server/services/sales/context";
import {listInquiries} from "@/server/services/sales/inquiries";
import {Card, PageHeader} from "@/components/admin/kit";
import {format} from "@/lib/admin-i18n";
import {cn} from "@/lib/utils";
import {InquiryToggle} from "./inquiry-toggle";

export const metadata = {title: "Inquiries"};

export default async function InquiriesPage({searchParams}: { searchParams: Promise<{ status?: string }> }) {
    const {texts, country, locale} = await getSalesContext();
    const t = texts.inquiriesPage;
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={t.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }
    const status = (await searchParams).status === "done" ? "done" : "new";
    const {rows, counts} = await listInquiries([country.code], status);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}/>
            <div className="flex gap-1 border-b border-neutral-200">
                {(["new", "done"] as const).map((s) => (
                    <Link
                        key={s}
                        href={`/admin/inquiries?status=${s}`}
                        className={cn(
                            "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm",
                            s === status ? "border-primary font-medium text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800",
                        )}
                    >
                        {s === "new" ? t.statusNew : t.statusDone}
                        <span className={cn("rounded-full px-1.5 text-xs tabular-nums", s === "new" && counts.new > 0 ? "bg-blue-100 text-blue-800" : "bg-neutral-100 text-neutral-500")}>
                            {counts[s]}
                        </span>
                    </Link>
                ))}
            </div>

            {rows.length === 0 && <Card className="p-10 text-center text-sm text-neutral-500">{t.empty}</Card>}
            <div className="space-y-3">
                {rows.map((row) => (
                    <Card key={row.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <p className="font-semibold">{row.name}</p>
                                <a href={`tel:${row.phone}`} className="flex items-center gap-1 text-sm text-neutral-700 hover:underline">
                                    <Phone className="size-3.5"/>{row.phone}
                                </a>
                                {row.source && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">{row.source}</span>}
                            </div>
                            {row.message && <p className="whitespace-pre-wrap text-sm text-neutral-700">{row.message}</p>}
                            <p className="text-xs text-neutral-400">
                                {new Date(row.createdAt).toLocaleString(locale, {dateStyle: "medium", timeStyle: "short"})}
                                {row.status === "done" && row.handledAt && (
                                    <> · ✓ {format(t.handled, {name: row.handledBy ?? "—", date: new Date(row.handledAt).toLocaleString(locale, {dateStyle: "short", timeStyle: "short"})})}</>
                                )}
                            </p>
                        </div>
                        {country.canManage && <InquiryToggle texts={texts} id={row.id} status={row.status}/>}
                    </Card>
                ))}
            </div>
        </div>
    );
}
