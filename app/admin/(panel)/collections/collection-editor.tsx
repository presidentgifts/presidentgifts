"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowDown, ArrowLeft, ArrowUp, Check, Loader2, Package, Plus, Search, Trash2, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card, ConfirmDialog, Field, useAdminAction} from "@/components/admin/kit";
import {ImageField} from "@/components/admin/catalog/media-fields";
import {
    ContentStatusBadge,
    initTranslations,
    isLocked,
    TranslationsEditor,
    TranslationValue,
    WorkflowBar,
} from "@/components/admin/catalog/editor-parts";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import type {ContentStatus} from "@/server/db/schema";
import type {CatalogCountry} from "@/server/services/catalog/context";
import type {MediaView} from "@/server/services/catalog/common";
import {deleteCollectionAction, saveCollectionAction, searchProductsAction} from "@/app/admin/catalog-actions";

export interface PickedProduct {
    id: number;
    sku: string;
    name: string;
    thumbnail: string | null;
    status: ContentStatus;
}

export interface CollectionEditorValue {
    id: number;
    status: ContentStatus;
    sortOrder: number;
    image: MediaView | null;
    translations: { languageCode: string; name: string; description: string | null }[];
    products: PickedProduct[];
}

export function CollectionEditor({texts, country, collection}: {
    texts: AdminDictionary;
    country: CatalogCountry;
    collection: CollectionEditorValue | null;
}) {
    const t = texts.collectionsPage;
    const router = useRouter();
    const [translations, setTranslations] = useState<TranslationValue[]>(() => initTranslations(country.languages, collection?.translations));
    const [image, setImage] = useState<MediaView | null>(collection?.image ?? null);
    const [sortOrder, setSortOrder] = useState(collection?.sortOrder ?? 0);
    const [products, setProducts] = useState<PickedProduct[]>(collection?.products ?? []);
    const [deleting, setDeleting] = useState(false);
    const {run, pending, errorField} = useAdminAction(texts);

    const locked = isLocked(collection?.status ?? null, country.canPublish);
    const title = translations.find((tr) => tr.languageCode === country.defaultLanguageCode)?.name || t.createTitle;

    const move = (index: number, delta: number) => {
        const target = index + delta;
        if (target < 0 || target >= products.length) return;
        const copy = [...products];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        setProducts(copy);
    };

    async function save(status: ContentStatus) {
        const result = await run(
            () => saveCollectionAction(country.code, collection?.id ?? null, {
                status,
                sortOrder,
                imageId: image?.id ?? null,
                translations,
                productIds: products.map((p) => p.id),
            }),
            {success: texts.actions.saved},
        );
        if (result.ok && !collection) router.replace(`/admin/collections/${result.data}`);
        if (result.ok && collection) router.refresh();
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/collections" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
                    <ArrowLeft className="size-4"/>
                    {texts.nav.items.collections}
                </Link>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        {collection && <ContentStatusBadge status={collection.status} texts={texts}/>}
                    </div>
                    {collection && !locked && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleting(true)}>
                            <Trash2 className="size-4"/>
                            {texts.actions.delete}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
                <div className="space-y-6">
                    <Card className="p-5">
                        <h2 className="mb-4 font-semibold">{texts.catalog.translations}</h2>
                        <TranslationsEditor
                            texts={texts}
                            languages={country.languages}
                            value={translations}
                            onChange={setTranslations}
                            disabled={locked}
                            invalidLanguage={errorField?.startsWith("name.") ? errorField.slice(5) : undefined}
                        />
                    </Card>

                    <Card>
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
                            <div>
                                <h2 className="font-semibold">{t.products} <span className="text-sm font-normal text-neutral-400">({products.length})</span></h2>
                                <p className="text-sm text-neutral-500">{t.productsHint}</p>
                            </div>
                        </div>
                        {!locked && (
                            <div className="border-b border-neutral-200 p-4">
                                <ProductPicker
                                    texts={texts}
                                    countryCode={country.code}
                                    selected={new Set(products.map((p) => p.id))}
                                    onPick={(p) => setProducts((list) => (list.some((x) => x.id === p.id) ? list : [...list, p]))}
                                />
                            </div>
                        )}
                        <ul className="divide-y divide-neutral-100">
                            {products.map((p, index) => (
                                <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                                    <span className="w-5 text-center text-xs tabular-nums text-neutral-400">{index + 1}</span>
                                    <Thumb url={p.thumbnail}/>
                                    <div className="min-w-0 flex-1">
                                        <Link href={`/admin/products/${p.id}`} className="block truncate text-sm font-medium hover:underline">{p.name || p.sku}</Link>
                                        <span className="font-mono text-xs text-neutral-500">{p.sku}</span>
                                    </div>
                                    <ContentStatusBadge status={p.status} texts={texts}/>
                                    {!locked && (
                                        <div className="flex">
                                            <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label={texts.actions.moveUp}>
                                                <ArrowUp className="size-4"/>
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === products.length - 1} onClick={() => move(index, 1)} aria-label={texts.actions.moveDown}>
                                                <ArrowDown className="size-4"/>
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="size-8 text-neutral-400 hover:text-red-600" onClick={() => setProducts(products.filter((x) => x.id !== p.id))} aria-label={texts.actions.remove}>
                                                <X className="size-4"/>
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <WorkflowBar texts={texts} status={collection?.status ?? null} canPublish={country.canPublish} pending={pending} onSave={save}/>
                    </Card>
                    <Card className="space-y-5 p-5">
                        <Field label={t.cover}>
                            <ImageField texts={texts} countryCode={country.code} value={image} onChange={setImage} disabled={locked}/>
                        </Field>
                        <Field label={texts.catalog.sortOrder} htmlFor="col-order" hint={texts.catalog.sortOrderHint}>
                            <Input
                                id="col-order"
                                type="number"
                                min={0}
                                value={sortOrder}
                                onChange={(e) => setSortOrder(Math.max(0, Number(e.target.value) || 0))}
                                disabled={locked}
                            />
                        </Field>
                    </Card>
                </div>
            </div>

            {collection && (
                <ConfirmDialog
                    open={deleting}
                    onOpenChange={setDeleting}
                    title={format(t.deleteTitle, {name: title})}
                    description={t.deleteText}
                    confirmLabel={texts.actions.delete}
                    texts={texts}
                    onConfirm={async () => {
                        const result = await run(() => deleteCollectionAction(country.code, collection.id), {success: texts.actions.saved});
                        if (result.ok) router.replace("/admin/collections");
                    }}
                />
            )}
        </div>
    );
}

function Thumb({url}: { url: string | null }) {
    return (
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
            {url ? <img src={url} alt="" className="size-full object-cover"/> : <Package className="size-4 text-neutral-400"/>}
        </span>
    );
}

function ProductPicker({texts, countryCode, selected, onPick}: {
    texts: AdminDictionary;
    countryCode: string;
    selected: Set<number>;
    onPick: (product: PickedProduct) => void;
}) {
    const t = texts.collectionsPage;
    const [q, setQ] = useState("");
    const [results, setResults] = useState<PickedProduct[] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const query = q.trim();
        if (!query) {
            setResults(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            const result = await searchProductsAction(countryCode, query).catch(() => null);
            if (!cancelled) {
                setResults(result?.ok ? result.data : []);
                setLoading(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [q, countryCode]);

    return (
        <div className="space-y-2">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"/>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchProducts} className="pl-9"/>
                {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-neutral-400"/>}
            </div>
            {results && (
                <ul className="max-h-72 divide-y divide-neutral-100 overflow-y-auto rounded-md border border-neutral-200">
                    {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-neutral-500">{t.noResults}</li>}
                    {results.map((p) => {
                        const added = selected.has(p.id);
                        return (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    disabled={added}
                                    onClick={() => onPick(p)}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 disabled:cursor-default disabled:opacity-60"
                                >
                                    <Thumb url={p.thumbnail}/>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium">{p.name || p.sku}</span>
                                        <span className="font-mono text-xs text-neutral-500">{p.sku}</span>
                                    </span>
                                    {added ? (
                                        <span className="flex items-center gap-1 text-xs text-emerald-700"><Check className="size-3.5"/>{t.added}</span>
                                    ) : (
                                        <Plus className="size-4 text-neutral-400"/>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
