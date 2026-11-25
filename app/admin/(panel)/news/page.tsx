import Link from "next/link";
import {Eye, Newspaper, Plus} from "lucide-react";
import {getCatalogContext} from "@/server/services/catalog/context";
import {CONTENT_WORKFLOW} from "@/server/services/catalog/common";
import {listNews, NEWS_PAGE_SIZE} from "@/server/services/content/news";
import {Card, EmptyRow, PageHeader, td, th, theadClass} from "@/components/admin/kit";
import {ContentStatusBadge} from "@/components/admin/catalog/editor-parts";
import {Button} from "@/components/ui/button";
import {format} from "@/lib/admin-i18n";
import {cn} from "@/lib/utils";

export const metadata = {title: "News"};

export default async function NewsListPage({searchParams}: { searchParams: Promise<{ page?: string }> }) {
    const {texts, lang, country} = await getCatalogContext(undefined, CONTENT_WORKFLOW);
    const t = texts.newsPage;
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={t.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }

    const page = Math.max(1, Number((await searchParams).page) || 1);
    const {rows, total} = await listNews(country.code, lang, page);
    const locale = lang === "en" ? "en-GB" : lang === "ru" ? "ru-RU" : "uz-UZ";
    const from = total === 0 ? 0 : (page - 1) * NEWS_PAGE_SIZE + 1;
    const to = Math.min(total, page * NEWS_PAGE_SIZE);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}>
                <Button size="lg" asChild>
                    <Link href="/admin/news/new">
                        <Plus className="size-4"/>
                        {t.add}
                    </Link>
                </Button>
            </PageHeader>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{t.newsTitle}</th>
                            <th className={th}>{t.date}</th>
                            <th className={`${th} text-right`}>{t.views}</th>
                            <th className={th}>{texts.catalog.statusLabel}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {rows.length === 0 && <EmptyRow colSpan={4} text={t.empty}/>}
                        {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-neutral-50/60">
                                <td className={td}>
                                    <Link href={`/admin/news/${row.id}`} className="flex items-center gap-3">
                                        <span className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100">
                                            {row.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                                                <img src={row.image} alt="" className="size-full object-cover"/>
                                            ) : (
                                                <Newspaper className="size-4 text-neutral-400"/>
                                            )}
                                        </span>
                                        <span className="line-clamp-2 font-medium hover:underline">{row.title || `#${row.id}`}</span>
                                    </Link>
                                </td>
                                <td className={`${td} whitespace-nowrap text-neutral-500`}>
                                    {row.publishedAt ? new Date(row.publishedAt).toLocaleDateString(locale) : "—"}
                                </td>
                                <td className={`${td} text-right tabular-nums text-neutral-500`}>
                                    <span className="inline-flex items-center gap-1"><Eye className="size-3.5"/>{row.viewCount}</span>
                                </td>
                                <td className={td}><ContentStatusBadge status={row.status} texts={texts}/></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                {total > NEWS_PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 text-sm">
                        <span className="text-neutral-500">{format(texts.catalog.pageOf, {from, to, total})}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild className={cn(page <= 1 && "pointer-events-none opacity-50")}>
                                <Link href={`/admin/news?page=${page - 1}`}>{texts.catalog.prev}</Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild className={cn(to >= total && "pointer-events-none opacity-50")}>
                                <Link href={`/admin/news?page=${page + 1}`}>{texts.catalog.next}</Link>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
