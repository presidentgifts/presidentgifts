"use client";

import {useMemo, useState} from "react";
import {CornerDownRight, FolderTree, Pencil, Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Card, ConfirmDialog, EmptyRow, Field, PageHeader, td, th, theadClass, useAdminAction} from "@/components/admin/kit";
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
import type {CategoryView} from "@/server/services/catalog/categories";
import type {CatalogCountry} from "@/server/services/catalog/context";
import type {MediaView} from "@/server/services/catalog/common";
import {deleteCategoryAction, saveCategoryAction} from "@/app/admin/catalog-actions";
import {buildCategoryTree, descendantIds, type TreeRow as CategoryTreeRow} from "@/lib/category-tree";

type TreeRow = CategoryTreeRow<CategoryView>;

type Editing = { category: CategoryView | null; parentId: number | null };

export function CategoriesManager({texts, country, categories}: {
    texts: AdminDictionary;
    country: CatalogCountry;
    categories: CategoryView[];
}) {
    const t = texts.categoriesPage;
    const tree = useMemo(() => buildCategoryTree(categories, country.defaultLanguageCode), [categories, country.defaultLanguageCode]);
    const [editing, setEditing] = useState<Editing | null>(null);
    const [deleting, setDeleting] = useState<TreeRow | null>(null);
    const {run} = useAdminAction(texts);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}>
                <Button size="lg" onClick={() => setEditing({category: null, parentId: null})}>
                    <Plus className="size-4"/>
                    {t.add}
                </Button>
            </PageHeader>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{texts.catalog.name}</th>
                            <th className={th}>{t.products}</th>
                            <th className={th}>{texts.catalog.sortOrder}</th>
                            <th className={th}>{texts.catalog.statusLabel}</th>
                            <th className={th}/>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {tree.length === 0 && <EmptyRow colSpan={5} text={t.empty}/>}
                        {tree.map((row) => {
                            const locked = isLocked(row.category.status, country.canPublish);
                            return (
                                <tr key={row.category.id} className="hover:bg-neutral-50/60">
                                    <td className={td}>
                                        <div className="flex items-center gap-3" style={{paddingLeft: row.depth * 24}}>
                                            {row.depth > 0 && <CornerDownRight className="size-4 shrink-0 text-neutral-300"/>}
                                            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100">
                                                {row.category.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                                                    <img src={row.category.image.url} alt="" className="size-full object-cover"/>
                                                ) : (
                                                    <FolderTree className="size-4 text-neutral-400"/>
                                                )}
                                            </span>
                                            <span className="font-medium">{row.name}</span>
                                        </div>
                                    </td>
                                    <td className={`${td} tabular-nums text-neutral-500`}>{row.category.products}</td>
                                    <td className={`${td} tabular-nums text-neutral-500`}>{row.category.sortOrder}</td>
                                    <td className={td}><ContentStatusBadge status={row.category.status} texts={texts}/></td>
                                    <td className={`${td} text-right`}>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" title={t.addChild} aria-label={t.addChild} onClick={() => setEditing({category: null, parentId: row.category.id})}>
                                                <Plus className="size-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" aria-label={texts.actions.edit} onClick={() => setEditing({category: row.category, parentId: row.category.parentId})}>
                                                <Pencil className="size-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={texts.actions.delete}
                                                disabled={locked}
                                                onClick={() => setDeleting(row)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="size-4"/>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {editing && (
                <CategoryDialog
                    key={editing.category?.id ?? `new-${editing.parentId}`}
                    texts={texts}
                    country={country}
                    categories={categories}
                    tree={tree}
                    editing={editing}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={format(t.deleteTitle, {name: deleting?.name ?? ""})}
                description={t.deleteText}
                confirmLabel={texts.actions.delete}
                texts={texts}
                onConfirm={async () => {
                    if (!deleting) return;
                    const result = await run(() => deleteCategoryAction(country.code, deleting.category.id), {success: texts.actions.saved});
                    if (result.ok) setDeleting(null);
                }}
            />
        </div>
    );
}

function CategoryDialog({texts, country, categories, tree, editing, onClose}: {
    texts: AdminDictionary;
    country: CatalogCountry;
    categories: CategoryView[];
    tree: TreeRow[];
    editing: Editing;
    onClose: () => void;
}) {
    const t = texts.categoriesPage;
    const existing = editing.category;
    const [translations, setTranslations] = useState<TranslationValue[]>(() => initTranslations(country.languages, existing?.translations));
    const [parentId, setParentId] = useState<number | null>(editing.parentId);
    const [sortOrder, setSortOrder] = useState(existing?.sortOrder ?? 0);
    const [image, setImage] = useState<MediaView | null>(existing?.image ?? null);
    const {run, pending, errorField} = useAdminAction(texts);

    const locked = isLocked(existing?.status ?? null, country.canPublish);
    const excluded = existing ? descendantIds(categories, existing.id) : new Set<number>();
    const parentOptions = tree.filter((row) => !excluded.has(row.category.id));

    async function save(status: ContentStatus) {
        const result = await run(
            () => saveCategoryAction(country.code, existing?.id ?? null, {
                parentId,
                status,
                sortOrder,
                imageId: image?.id ?? null,
                translations,
            }),
            {success: texts.actions.saved},
        );
        if (result.ok) onClose();
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        {existing ? t.editTitle : t.createTitle}
                        {existing && <ContentStatusBadge status={existing.status} texts={texts}/>}
                    </DialogTitle>
                    <DialogDescription className="sr-only">{t.subtitle}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <TranslationsEditor
                        texts={texts}
                        languages={country.languages}
                        value={translations}
                        onChange={setTranslations}
                        disabled={locked}
                        invalidLanguage={errorField?.startsWith("name.") ? errorField.slice(5) : undefined}
                    />

                    <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
                        <Field label={t.parent} error={errorField === "parentId"}>
                            <Select
                                value={parentId === null ? "none" : String(parentId)}
                                onValueChange={(v) => setParentId(v === "none" ? null : Number(v))}
                                disabled={locked}
                            >
                                <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t.noParent}</SelectItem>
                                    {parentOptions.map((row) => (
                                        <SelectItem key={row.category.id} value={String(row.category.id)}>
                                            <span style={{paddingLeft: row.depth * 12}}>{row.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={texts.catalog.sortOrder} htmlFor="cat-order" hint={texts.catalog.sortOrderHint}>
                            <Input
                                id="cat-order"
                                type="number"
                                min={0}
                                value={sortOrder}
                                onChange={(e) => setSortOrder(Math.max(0, Number(e.target.value) || 0))}
                                disabled={locked}
                            />
                        </Field>
                    </div>

                    <Field label={texts.catalog.image}>
                        <ImageField texts={texts} countryCode={country.code} value={image} onChange={setImage} disabled={locked}/>
                    </Field>

                    <div className="border-t border-neutral-200 pt-5">
                        <WorkflowBar texts={texts} status={existing?.status ?? null} canPublish={country.canPublish} pending={pending} onSave={save}/>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
