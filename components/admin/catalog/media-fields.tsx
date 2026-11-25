"use client";

import {useRef, useState} from "react";
import {ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import type {AdminDictionary} from "@/lib/admin-i18n";
import type {MediaView} from "@/server/services/catalog/common";
import {ACCEPT_IMAGES, uploadMedia} from "./upload";

function useUploader(texts: AdminDictionary, countryCode: string) {
    const [uploading, setUploading] = useState(0);

    async function upload(files: File[]): Promise<MediaView[]> {
        setUploading((n) => n + files.length);
        const done: MediaView[] = [];
        for (const file of files) {
            const result = await uploadMedia(countryCode, file).catch(() => ({ok: false as const, error: "server" as const}));
            if (result.ok) done.push(result.data);
            else toast.error(`${texts.catalog.uploadFailed}: ${file.name}`, {description: texts.errors[result.error] ?? texts.errors.server});
            setUploading((n) => n - 1);
        }
        return done;
    }

    return {upload, uploading: uploading > 0};
}

/** One image (category or collection cover). */
export function ImageField({texts, countryCode, value, onChange, disabled}: {
    texts: AdminDictionary;
    countryCode: string;
    value: MediaView | null;
    onChange: (value: MediaView | null) => void;
    disabled?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const {upload, uploading} = useUploader(texts, countryCode);

    return (
        <div className="flex items-center gap-4">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                {uploading ? (
                    <Loader2 className="size-5 animate-spin text-neutral-400"/>
                ) : value ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
                    <img src={value.url} alt="" className="size-full object-cover"/>
                ) : (
                    <ImagePlus className="size-6 text-neutral-300"/>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} onClick={() => input.current?.click()}>
                    {uploading ? texts.catalog.uploading : value ? texts.catalog.replace : texts.catalog.upload}
                </Button>
                {value && (
                    <Button type="button" variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => onChange(null)} className="text-red-600">
                        {texts.actions.remove}
                    </Button>
                )}
            </div>
            <input
                ref={input}
                type="file"
                accept={ACCEPT_IMAGES}
                hidden
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const [media] = await upload([file]);
                    if (media) onChange(media);
                }}
            />
        </div>
    );
}

/** An ordered set of images (product gallery). The first one is the main image. */
export function GalleryField({texts, countryCode, value, onChange, disabled}: {
    texts: AdminDictionary;
    countryCode: string;
    value: MediaView[];
    onChange: (value: MediaView[]) => void;
    disabled?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const {upload, uploading} = useUploader(texts, countryCode);

    const move = (index: number, delta: number) => {
        const target = index + delta;
        if (target < 0 || target >= value.length) return;
        const copy = [...value];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        onChange(copy);
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {value.map((media, index) => (
                    <div key={media.id} className={cn("group relative aspect-square overflow-hidden rounded-md border bg-neutral-50", index === 0 ? "border-primary ring-1 ring-primary" : "border-neutral-200")}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file */}
                        <img src={media.url} alt="" className="size-full object-cover"/>
                        {index === 0 && (
                            <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
                                <Star className="size-3"/>
                            </span>
                        )}
                        {!disabled && (
                            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                <div className="flex gap-1">
                                    <IconButton label={texts.actions.moveUp} disabled={index === 0} onClick={() => move(index, -1)}><ArrowLeft className="size-3.5"/></IconButton>
                                    <IconButton label={texts.actions.moveDown} disabled={index === value.length - 1} onClick={() => move(index, 1)}><ArrowRight className="size-3.5"/></IconButton>
                                    {index !== 0 && (
                                        <IconButton label={texts.catalog.makeMain} onClick={() => onChange([media, ...value.filter((m) => m.id !== media.id)])}>
                                            <Star className="size-3.5"/>
                                        </IconButton>
                                    )}
                                </div>
                                <IconButton label={texts.actions.remove} onClick={() => onChange(value.filter((m) => m.id !== media.id))}><X className="size-3.5"/></IconButton>
                            </div>
                        )}
                    </div>
                ))}
                {!disabled && (
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => input.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 text-sm text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                    >
                        {uploading ? <Loader2 className="size-5 animate-spin"/> : <ImagePlus className="size-5"/>}
                        {uploading ? texts.catalog.uploading : texts.catalog.upload}
                    </button>
                )}
            </div>
            <p className="text-xs text-neutral-500">{texts.catalog.imagesHint}</p>
            <input
                ref={input}
                type="file"
                accept={ACCEPT_IMAGES}
                multiple
                hidden
                onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length === 0) return;
                    const added = await upload(files);
                    if (added.length) onChange([...value, ...added]);
                }}
            />
        </div>
    );
}

function IconButton({label, onClick, disabled, children}: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className="flex size-6 items-center justify-center rounded bg-white/90 text-neutral-800 hover:bg-white disabled:opacity-40"
        >
            {children}
        </button>
    );
}
