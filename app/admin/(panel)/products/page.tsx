import Link from "next/link";
import {Package, Plus} from "lucide-react";
import {getCatalogContext} from "@/server/services/catalog/context";
import {countProductsByStatus, listProducts} from "@/server/services/catalog/products";
import {listCategories} from "@/server/services/catalog/categories";
import {CONTENT_STATUSES} from "@/server/services/catalog/common";
import type {ContentStatus} from "@/server/db/schema";
import {Card, EmptyRow, PageHeader, td, th, theadClass} from "@/components/admin/kit";
import {ContentStatusBadge} from "@/components/admin/catalog/editor-parts";
import {Button} from "@/components/ui/button";
import {format} from "@/lib/admin-i18n";
import {cn} from "@/lib/utils";
import {ProductFilters} from "./product-filters";

export const metadata = {title: "Products"};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({searchParams}: { searchParams: SearchParams }) {
    const {texts, lang, country} = await getCatalogContext();
    const t = texts.productsPage;
    if (!country) {
        return (
            <div className="space-y-6">
                <PageHeader title={t.title}/>
                <Card className="p-10 text-center text-sm text-neutral-500">{texts.catalog.noCountry}</Card>
            </div>
        );
    }

    const params = await searchParams;
    const q = one(params.q)?.slice(0, 100) ?? "";
    const statusParam = one(params.status);
    const status = (CONTENT_STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as ContentStatus) : undefined;
    const categoryParam = one(params.category);
    const categoryId = categoryParam === "none" ? "none" : Number(categoryParam) > 0 ? Number(categoryParam) : undefined;
    const page = Math.max(1, Number(one(params.page)) || 1);

    const [result, counts, categories] = await Promise.all([
        listProducts(country.code, lang, {q, status, categoryId, page}),
        countProductsByStatus(country.code),
        listCategories(country.code),
    ]);
    const categoryName = new Map(
        categories.map((c) => [c.id, c.translations.find((tr) => tr.languageCode === lang)?.name ?? c.translations[0]?.name ?? `#${c.id}`]),
    );
    const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

    const query = (patch: Record<string, string | number | undefined>) => {
        const next = new URLSearchParams();
        const merged = {q: q || undefined, status, category: categoryParam, page: undefined as number | undefined, ...patch};
        for (const [key, value] of Object.entries(merged)) if (value !== undefined && value !== "") next.set(key, String(value));
        const s = next.toString();
        return s ? `/admin/products?${s}` : "/admin/products";
    };

    const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
    const to = Math.min(result.total, result.page * result.pageSize);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}>
                <Button size="lg" asChild>
                    <Link href="/admin/products/new">
                        <Plus className="size-4"/>
                        {t.add}
                    </Link>
                </Button>
            </PageHeader>

            <div className="flex flex-wrap gap-1 border-b border-neutral-200">
                {[undefined, ...CONTENT_STATUSES].map((s) => {
                    const active = s === status;
                    const n = s ? counts[s] ?? 0 : total;
                    return (
                        <Link
                            key={s ?? "all"}
                            href={query({status: s, page: undefined})}
                            className={cn(
                                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm",
                                active ? "border-primary font-medium text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800",
                            )}
                        >
                            {s ? texts.status[s] : texts.catalog.all}
                            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", s === "review" && n > 0 ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-500")}>
                                {n}
                            </span>
                        </Link>
                    );
                })}
            </div>

            <ProductFilters
                texts={texts}
                q={q}
                category={categoryParam ?? ""}
                categories={categories.map((c) => ({id: c.id, name: categoryName.get(c.id) ?? ""}))}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{texts.catalog.name}</th>
                            <th className={th}>{t.category}</th>
                            {country.canEditPrices && <th className={`${th} text-right`}>{t.price}</th>}
                            <th className={`${th} text-right`}>{t.stock}</th>
                            <th className={th}>{texts.catalog.statusLabel}</th>
                            <th className={th}>{texts.catalog.updated}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {result.rows.length === 0 && <EmptyRow colSpan={6} text={t.empty}/>}
                        {result.rows.map((p) => (
                            <tr key={p.id} className="hover:bg-neutral-50/60">
                                <td className={td}>
                                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                                        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100">
                                            {p.thumbnail ? (
                                                // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                                                <img src={p.thumbnail} alt="" className="size-full object-cover"/>
                                            ) : (
                                                <Package className="size-4 text-neutral-400"/>
                                            )}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium hover:underline">{p.name || p.sku}</span>
                                            <span className="flex items-center gap-2 text-xs text-neutral-500">
                                                <span className="font-mono">{p.sku}</span>
                                                {p.isNew && <span className="rounded bg-blue-50 px-1 text-blue-700">{t.isNew}</span>}
                                                {p.isFeatured && <span className="rounded bg-violet-50 px-1 text-violet-700">{t.isFeatured}</span>}
                                            </span>
                                        </span>
                                    </Link>
                                </td>
                                <td className={`${td} text-neutral-600`}>{p.categoryId ? categoryName.get(p.categoryId) ?? "—" : "—"}</td>
                                {country.canEditPrices && (
                                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                                        {p.priceUsd ? `$${Number(p.priceUsd).toLocaleString("en-US", {minimumFractionDigits: 2})}` : <span className="text-neutral-400">{t.priceOnRequest}</span>}
                                    </td>
                                )}
                                <td className={`${td} text-right tabular-nums text-neutral-600`}>{p.stock ?? "—"}</td>
                                <td className={td}><ContentStatusBadge status={p.status} texts={texts}/></td>
                                <td className={`${td} whitespace-nowrap text-neutral-500`}>
                                    {new Date(p.updatedAt).toLocaleDateString(lang === "en" ? "en-GB" : lang === "ru" ? "ru-RU" : "uz-UZ")}
                                </td>
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
                                <Link href={query({page: result.page - 1})}>{texts.catalog.prev}</Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild className={cn(to >= result.total && "pointer-events-none opacity-50")}>
                                <Link href={query({page: result.page + 1})}>{texts.catalog.next}</Link>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
