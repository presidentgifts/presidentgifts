"use client";

import {FormEvent, useRef, useState} from "react";
import {ArrowDown, ArrowUp, ExternalLink, Film, Loader2, Pencil, Plus, Trash2} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Card, ConfirmDialog, Field, PageHeader, StatusBadge, SubmitButton, ToggleRow, useAdminAction} from "@/components/admin/kit";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import type {CatalogCountry} from "@/server/services/catalog/context";
import type {MediaView} from "@/server/services/catalog/common";
import type {ProductVideoView} from "@/server/services/content/product-videos";
import {deleteProductVideoAction, moveProductVideoAction, saveProductVideoAction} from "@/app/admin/content-actions";
import {uploadMedia} from "@/components/admin/catalog/upload";

const ACCEPT_VIDEOS = "video/mp4,video/webm";

export function ProductVideosManager({texts, country, videos}: {
    texts: AdminDictionary;
    country: CatalogCountry;
    videos: ProductVideoView[];
}) {
    const t = texts.productVideosPage;
    const [editing, setEditing] = useState<ProductVideoView | "new" | null>(null);
    const [deleting, setDeleting] = useState<ProductVideoView | null>(null);
    const {run, pending} = useAdminAction(texts);
    const readOnly = !country.canPublish;

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={format(t.subtitle, {country: country.name})}>
                {!readOnly && (
                    <Button size="lg" onClick={() => setEditing("new")}>
                        <Plus className="size-4"/>
                        {t.add}
                    </Button>
                )}
            </PageHeader>
            {readOnly && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{t.readOnly}</p>}

            {videos.length === 0 ? (
                <Card className="p-10 text-center text-sm text-neutral-500">{t.empty}</Card>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {videos.map((item, index) => (
                        <Card key={item.id} className="flex flex-col overflow-hidden">
                            <div className="relative aspect-[9/16] bg-neutral-900">
                                {item.video ? (
                                    <video
                                        src={item.video.url}
                                        muted
                                        playsInline
                                        loop
                                        preload="metadata"
                                        className="size-full object-cover"
                                        onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.pause();
                                            e.currentTarget.currentTime = 0;
                                        }}
                                    />
                                ) : (
                                    <div className="flex size-full items-center justify-center text-neutral-500"><Film className="size-8"/></div>
                                )}
                                <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">{index + 1}</span>
                                <span className="absolute right-2 top-2"><StatusBadge active={item.isActive} texts={texts}/></span>
                            </div>
                            <div className="flex flex-1 flex-col gap-2 p-3">
                                {item.link ? (
                                    <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate text-xs text-neutral-600 hover:underline">
                                        <ExternalLink className="size-3 shrink-0"/>
                                        <span className="truncate">{item.link.replace(/^https?:\/\/(www\.)?/, "")}</span>
                                    </a>
                                ) : (
                                    <span className="text-xs text-neutral-400">{t.noLink}</span>
                                )}
                                {!readOnly && (
                                    <div className="mt-auto flex justify-between">
                                        <div className="flex">
                                            <Button variant="ghost" size="icon" aria-label={t.moveUp} title={t.moveUp} disabled={pending || index === 0}
                                                    onClick={() => run(() => moveProductVideoAction(country.code, item.id, -1))}>
                                                <ArrowUp className="size-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" aria-label={t.moveDown} title={t.moveDown} disabled={pending || index === videos.length - 1}
                                                    onClick={() => run(() => moveProductVideoAction(country.code, item.id, 1))}>
                                                <ArrowDown className="size-4"/>
                                            </Button>
                                        </div>
                                        <div className="flex">
                                            <Button variant="ghost" size="icon" aria-label={texts.actions.edit} onClick={() => setEditing(item)}>
                                                <Pencil className="size-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" aria-label={texts.actions.delete} onClick={() => setDeleting(item)} className="text-red-600 hover:text-red-700">
                                                <Trash2 className="size-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {editing && (
                <VideoDialog
                    key={editing === "new" ? "new" : editing.id}
                    texts={texts}
                    country={country}
                    item={editing === "new" ? null : editing}
                    nextOrder={videos.length}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={t.deleteTitle}
                description={t.deleteText}
                confirmLabel={texts.actions.delete}
                texts={texts}
                onConfirm={async () => {
                    if (!deleting) return;
                    const result = await run(() => deleteProductVideoAction(country.code, deleting.id), {success: texts.actions.saved});
                    if (result.ok) setDeleting(null);
                }}
            />
        </div>
    );
}

function VideoDialog({texts, country, item, nextOrder, onClose}: {
    texts: AdminDictionary;
    country: CatalogCountry;
    item: ProductVideoView | null;
    nextOrder: number;
    onClose: () => void;
}) {
    const t = texts.productVideosPage;
    const [video, setVideo] = useState<MediaView | null>(item?.video ?? null);
    const [link, setLink] = useState(item?.link ?? "");
    const [isActive, setIsActive] = useState(item?.isActive ?? true);
    const [uploading, setUploading] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const {run, pending, errorField} = useAdminAction(texts);
    const linkInvalid = link.trim() !== "" && !/^https?:\/\/\S+$/i.test(link.trim());

    async function pickFile(file: File) {
        setUploading(true);
        const result = await uploadMedia(country.code, file).catch(() => ({ok: false as const, error: "server" as const}));
        setUploading(false);
        if (result.ok) setVideo(result.data);
        else toast.error(`${texts.catalog.uploadFailed}: ${file.name}`, {description: texts.errors[result.error] ?? texts.errors.server});
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!video) {
            toast.error(t.videoRequired);
            return;
        }
        if (linkInvalid) return;
        const result = await run(
            () => saveProductVideoAction(country.code, item?.id ?? null, {
                videoId: video.id,
                link: link.trim(),
                isActive,
                sortOrder: item?.sortOrder ?? nextOrder,
            }),
            {success: texts.actions.saved},
        );
        if (result.ok) onClose();
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{item ? t.editTitle : t.createTitle}</DialogTitle>
                        <DialogDescription className="sr-only">{t.subtitle}</DialogDescription>
                    </DialogHeader>

                    <Field label={t.video} htmlFor="video-file" hint={t.videoHint} error={errorField === "video" || errorField === "media"}>
                        <div className="flex items-start gap-4">
                            <div className="flex aspect-[9/16] w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-900">
                                {uploading ? (
                                    <Loader2 className="size-5 animate-spin text-neutral-400"/>
                                ) : video ? (
                                    <video src={video.url} muted playsInline autoPlay loop className="size-full object-cover"/>
                                ) : (
                                    <Film className="size-6 text-neutral-500"/>
                                )}
                            </div>
                            <Button id="video-file" type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
                                {uploading ? texts.catalog.uploading : video ? texts.catalog.replace : texts.catalog.upload}
                            </Button>
                            <input
                                ref={fileInput}
                                type="file"
                                accept={ACCEPT_VIDEOS}
                                hidden
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (file) void pickFile(file);
                                }}
                            />
                        </div>
                    </Field>

                    <Field label={t.link} htmlFor="video-link" hint={t.linkHint} error={linkInvalid || errorField === "link"}>
                        <Input
                            id="video-link"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            maxLength={500}
                            placeholder="https://www.instagram.com/reel/…"
                            aria-invalid={linkInvalid}
                        />
                    </Field>

                    <ToggleRow label={texts.common.active} checked={isActive} onChange={setIsActive}/>

                    <DialogFooter>
                        <Button type="button" variant="outline" size="lg" onClick={onClose}>{texts.actions.cancel}</Button>
                        <SubmitButton pending={pending || uploading}>{item ? texts.actions.save : texts.actions.create}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
