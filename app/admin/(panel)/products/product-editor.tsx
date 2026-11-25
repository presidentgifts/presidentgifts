"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft, Lock, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Card, ConfirmDialog, Field, ToggleRow, useAdminAction} from "@/components/admin/kit";
import {GalleryField} from "@/components/admin/catalog/media-fields";
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
import {deleteProductAction, saveProductAction} from "@/app/admin/catalog-actions";

export interface ProductEditorValue {
    id: number;
    sku: string;
    categoryId: number | null;
    priceUsd: string | null;
    stock: number | null;
    isNew: boolean;
    isFeatured: boolean;
    status: ContentStatus;
    translations: { languageCode: string; name: string; description: string | null }[];
    media: MediaView[];
}

export function ProductEditor({texts, country, categories, product}: {
    texts: AdminDictionary;
    country: CatalogCountry;
    categories: { id: number; name: string; depth: number }[];
    product: ProductEditorValue | null;
}) {
    const t = texts.productsPage;
    const router = useRouter();
    const [translations, setTranslations] = useState<TranslationValue[]>(() => initTranslations(country.languages, product?.translations));
    const [sku, setSku] = useState(product?.sku ?? "");
    const [categoryId, setCategoryId] = useState<number | null>(product?.categoryId ?? null);
    const [priceUsd, setPriceUsd] = useState(product?.priceUsd ? String(Number(product.priceUsd)) : "");
    const [stock, setStock] = useState(product?.stock === null || product?.stock === undefined ? "" : String(product.stock));
    const [isNew, setIsNew] = useState(product?.isNew ?? false);
    const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
    const [media, setMedia] = useState<MediaView[]>(product?.media ?? []);
    const [deleting, setDeleting] = useState(false);
    const {run, pending, errorField} = useAdminAction(texts);

    const locked = isLocked(product?.status ?? null, country.canPublish);
    const title = translations.find((tr) => tr.languageCode === country.defaultLanguageCode)?.name || product?.sku || t.createTitle;

    async function save(status: ContentStatus) {
        const input = {
            sku,
            categoryId,
            // Sent only by people who may change prices; the server ignores it from others anyway.
            ...(country.canEditPrices ? {priceUsd: priceUsd.trim().replace(",", ".") || null} : {}),
            stock: stock.trim() === "" ? null : Math.max(0, Math.floor(Number(stock))),
            isNew,
            isFeatured,
            status,
            translations,
            mediaIds: media.map((m) => m.id),
        };
        const result = await run(() => saveProductAction(country.code, product?.id ?? null, input), {success: texts.actions.saved});
        if (result.ok && !product) router.replace(`/admin/products/${result.data}`);
        if (result.ok && product) router.refresh();
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
                    <ArrowLeft className="size-4"/>
                    {texts.nav.items.products}
                </Link>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        {product && <ContentStatusBadge status={product.status} texts={texts}/>}
                    </div>
                    {product && !locked && (
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

                    <Card className="p-5">
                        <h2 className="mb-4 font-semibold">{texts.catalog.images}</h2>
                        <GalleryField texts={texts} countryCode={country.code} value={media} onChange={setMedia} disabled={locked}/>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <WorkflowBar texts={texts} status={product?.status ?? null} canPublish={country.canPublish} pending={pending} onSave={save}/>
                    </Card>

                    <Card className="space-y-5 p-5">
                        <h2 className="font-semibold">{t.details}</h2>
                        <Field label={t.sku} htmlFor="p-sku" hint={t.skuHint} error={errorField === "sku"}>
                            <Input
                                id="p-sku"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                disabled={locked}
                                maxLength={64}
                                className="font-mono"
                                aria-invalid={errorField === "sku"}
                            />
                        </Field>
                        <Field label={t.category} error={errorField === "categoryId"}>
                            <Select
                                value={categoryId === null ? "none" : String(categoryId)}
                                onValueChange={(v) => setCategoryId(v === "none" ? null : Number(v))}
                                disabled={locked}
                            >
                                <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t.noCategory}</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            <span style={{paddingLeft: c.depth * 12}}>{c.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        {country.canEditPrices ? (
                            <Field label={t.price} htmlFor="p-price" hint={t.priceHint} error={errorField === "priceUsd"}>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">$</span>
                                    <Input
                                        id="p-price"
                                        inputMode="decimal"
                                        value={priceUsd}
                                        onChange={(e) => setPriceUsd(e.target.value)}
                                        disabled={locked}
                                        placeholder="0.00"
                                        className="pl-7 tabular-nums"
                                        aria-invalid={errorField === "priceUsd"}
                                    />
                                </div>
                            </Field>
                        ) : (
                            <p className="flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                                <Lock className="size-3.5"/>
                                {t.priceHidden}
                            </p>
                        )}
                        <Field label={t.stock} htmlFor="p-stock" hint={t.stockHint} error={errorField === "stock"}>
                            <Input
                                id="p-stock"
                                type="number"
                                min={0}
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                disabled={locked}
                                className="tabular-nums"
                            />
                        </Field>
                    </Card>

                    <Card className="space-y-3 p-5">
                        <h2 className="font-semibold">{t.flags}</h2>
                        <ToggleRow label={t.isNew} hint={t.isNewHint} checked={isNew} onChange={setIsNew} disabled={locked}/>
                        <ToggleRow label={t.isFeatured} hint={t.isFeaturedHint} checked={isFeatured} onChange={setIsFeatured} disabled={locked}/>
                    </Card>
                </div>
            </div>

            {product && (
                <ConfirmDialog
                    open={deleting}
                    onOpenChange={setDeleting}
                    title={format(t.deleteTitle, {name: title})}
                    description={t.deleteText}
                    confirmLabel={texts.actions.delete}
                    texts={texts}
                    onConfirm={async () => {
                        const result = await run(() => deleteProductAction(country.code, product.id), {success: texts.actions.saved});
                        if (result.ok) router.replace("/admin/products");
                    }}
                />
            )}
        </div>
    );
}
