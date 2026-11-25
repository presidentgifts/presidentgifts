"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft, Trash2} from "lucide-react";
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
import {deleteNewsAction, saveNewsAction} from "@/app/admin/content-actions";

export interface NewsEditorValue {
    id: number;
    status: ContentStatus;
    image: MediaView | null;
    pageImage: MediaView | null;
    instagramLink: string | null;
    publishedAt: string | null;
    translations: { languageCode: string; name: string; description: string | null }[];
}

export function NewsEditor({texts, country, item}: { texts: AdminDictionary; country: CatalogCountry; item: NewsEditorValue | null }) {
    const t = texts.newsPage;
    const router = useRouter();
    const [translations, setTranslations] = useState<TranslationValue[]>(() => initTranslations(country.languages, item?.translations));
    const [image, setImage] = useState<MediaView | null>(item?.image ?? null);
    const [pageImage, setPageImage] = useState<MediaView | null>(item?.pageImage ?? null);
    const [instagramLink, setInstagramLink] = useState(item?.instagramLink ?? "");
    const [publishedAt, setPublishedAt] = useState(item?.publishedAt?.slice(0, 10) ?? "");
    const [deleting, setDeleting] = useState(false);
    const {run, pending, errorField} = useAdminAction(texts);

    const locked = isLocked(item?.status ?? null, country.canPublish);
    const title = translations.find((tr) => tr.languageCode === country.defaultLanguageCode)?.name || t.createTitle;

    async function save(status: ContentStatus) {
        const result = await run(
            () => saveNewsAction(country.code, item?.id ?? null, {
                status,
                imageId: image?.id ?? null,
                pageImageId: pageImage?.id ?? null,
                instagramLink,
                publishedAt,
                translations,
            }),
            {success: texts.actions.saved},
        );
        if (result.ok && !item) router.replace(`/admin/news/${result.data}`);
        if (result.ok && item) router.refresh();
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/news" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
                    <ArrowLeft className="size-4"/>
                    {texts.nav.items.news}
                </Link>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        {item && <ContentStatusBadge status={item.status} texts={texts}/>}
                    </div>
                    {item && !locked && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleting(true)}>
                            <Trash2 className="size-4"/>
                            {texts.actions.delete}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
                <Card className="p-5">
                    <h2 className="mb-4 font-semibold">{t.newsTitle} / {t.text}</h2>
                    <TranslationsEditor
                        texts={{...texts, catalog: {...texts.catalog, name: t.newsTitle, description: t.text}}}
                        languages={country.languages}
                        value={translations}
                        onChange={setTranslations}
                        disabled={locked}
                        invalidLanguage={errorField?.startsWith("name.") ? errorField.slice(5) : undefined}
                    />
                </Card>

                <div className="space-y-6">
                    <Card className="p-5">
                        <WorkflowBar texts={texts} status={item?.status ?? null} canPublish={country.canPublish} pending={pending} onSave={save}/>
                    </Card>
                    <Card className="space-y-5 p-5">
                        <Field label={t.cardImage} hint={t.cardImageHint}>
                            <ImageField texts={texts} countryCode={country.code} value={image} onChange={setImage} disabled={locked}/>
                        </Field>
                        <Field label={t.pageImage} hint={t.pageImageHint}>
                            <ImageField texts={texts} countryCode={country.code} value={pageImage} onChange={setPageImage} disabled={locked}/>
                        </Field>
                        <Field label={t.date} htmlFor="news-date" hint={t.dateHint} error={errorField === "publishedAt"}>
                            <Input id="news-date" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} disabled={locked}/>
                        </Field>
                        <Field label={t.instagram} htmlFor="news-insta" error={errorField === "instagramLink"}>
                            <Input
                                id="news-insta"
                                type="url"
                                value={instagramLink}
                                onChange={(e) => setInstagramLink(e.target.value)}
                                disabled={locked}
                                placeholder="https://www.instagram.com/p/..."
                                aria-invalid={errorField === "instagramLink"}
                            />
                        </Field>
                    </Card>
                </div>
            </div>

            {item && (
                <ConfirmDialog
                    open={deleting}
                    onOpenChange={setDeleting}
                    title={format(t.deleteTitle, {name: title})}
                    description={t.deleteText}
                    confirmLabel={texts.actions.delete}
                    texts={texts}
                    onConfirm={async () => {
                        const result = await run(() => deleteNewsAction(country.code, item.id), {success: texts.actions.saved});
                        if (result.ok) router.replace("/admin/news");
                    }}
                />
            )}
        </div>
    );
}
