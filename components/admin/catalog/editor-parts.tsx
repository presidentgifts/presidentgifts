"use client";

import {useState} from "react";
import {Archive, Eye, Lock, RotateCcw, Save, Send} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import type {ContentStatus} from "@/server/db/schema";

export interface TranslationValue {
    languageCode: string;
    name: string;
    description: string;
}

export interface LanguageInfo {
    code: string;
    nativeName: string;
}

/** Fills in an entry for each country language, keeping what is already there. */
export function initTranslations(
    languages: LanguageInfo[],
    existing: { languageCode: string; name: string; description: string | null }[] = [],
): TranslationValue[] {
    return languages.map((l) => {
        const found = existing.find((t) => t.languageCode === l.code);
        return {languageCode: l.code, name: found?.name ?? "", description: found?.description ?? ""};
    });
}

/** Name (and optionally description) per language, one tab per language. The first language is the main one. */
export function TranslationsEditor({texts, languages, value, onChange, withDescription = true, disabled, invalidLanguage}: {
    texts: AdminDictionary;
    languages: LanguageInfo[];
    value: TranslationValue[];
    onChange: (value: TranslationValue[]) => void;
    withDescription?: boolean;
    disabled?: boolean;
    /** Language whose name the server reported missing. */
    invalidLanguage?: string;
}) {
    const [active, setActive] = useState(languages[0]?.code ?? "");
    const current = value.find((t) => t.languageCode === active);
    const mainCode = languages[0]?.code;

    const update = (patch: Partial<TranslationValue>) =>
        onChange(value.map((t) => (t.languageCode === active ? {...t, ...patch} : t)));

    return (
        <div className="space-y-3">
            <div role="tablist" className="flex flex-wrap gap-1 border-b border-neutral-200">
                {languages.map((language) => {
                    const filled = Boolean(value.find((t) => t.languageCode === language.code)?.name.trim());
                    const isMain = language.code === mainCode;
                    return (
                        <button
                            key={language.code}
                            type="button"
                            role="tab"
                            aria-selected={active === language.code}
                            onClick={() => setActive(language.code)}
                            className={cn(
                                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors",
                                active === language.code ? "border-primary font-medium text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800",
                            )}
                        >
                            {language.nativeName}
                            <span
                                title={filled ? undefined : isMain ? texts.catalog.required : texts.catalog.missing}
                                className={cn(
                                    "size-1.5 rounded-full",
                                    filled ? "bg-emerald-500" : isMain || invalidLanguage === language.code ? "bg-red-500" : "bg-neutral-300",
                                )}
                            />
                        </button>
                    );
                })}
            </div>

            {current && (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label htmlFor={`tr-name-${active}`} className="text-sm font-medium">
                            {texts.catalog.name}
                            {active === mainCode && <span className="ml-1 text-xs font-normal text-neutral-400">({texts.catalog.required})</span>}
                        </label>
                        <Input
                            id={`tr-name-${active}`}
                            value={current.name}
                            onChange={(e) => update({name: e.target.value})}
                            disabled={disabled}
                            maxLength={200}
                            aria-invalid={invalidLanguage === active}
                        />
                    </div>
                    {withDescription && (
                        <div className="space-y-1.5">
                            <label htmlFor={`tr-desc-${active}`} className="text-sm font-medium">{texts.catalog.description}</label>
                            <Textarea
                                id={`tr-desc-${active}`}
                                value={current.description}
                                onChange={(e) => update({description: e.target.value})}
                                disabled={disabled}
                                rows={6}
                                maxLength={20000}
                            />
                        </div>
                    )}
                </div>
            )}
            <p className="text-xs text-neutral-500">{format(texts.catalog.translationsHint, {lang: languages[0]?.nativeName ?? ""})}</p>
        </div>
    );
}

const STATUS_STYLES: Record<ContentStatus, string> = {
    draft: "bg-neutral-100 text-neutral-600",
    review: "bg-amber-50 text-amber-700",
    published: "bg-emerald-50 text-emerald-700",
    archived: "bg-neutral-100 text-neutral-400 line-through decoration-neutral-300",
};

const STATUS_DOTS: Record<ContentStatus, string> = {
    draft: "bg-neutral-400",
    review: "bg-amber-500",
    published: "bg-emerald-500",
    archived: "bg-neutral-300",
};

export function ContentStatusBadge({status, texts}: { status: ContentStatus; texts: AdminDictionary }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
            <span className={cn("size-1.5 rounded-full", STATUS_DOTS[status])}/>
            {texts.status[status]}
        </span>
    );
}

/** Whether the person may change an item in this status (mirrors the server rule). */
export function isLocked(status: ContentStatus | null, canPublish: boolean) {
    return !canPublish && status !== null && status !== "draft" && status !== "review";
}

/**
 * The save buttons of an editor. Each button saves the form with a target status:
 * editors can save a draft or send to review; publishers can also publish, take
 * back to draft and archive.
 */
export function WorkflowBar({texts, status, canPublish, pending, onSave}: {
    texts: AdminDictionary;
    /** Current status; null for a new item. */
    status: ContentStatus | null;
    canPublish: boolean;
    pending: boolean;
    onSave: (status: ContentStatus) => void;
}) {
    const t = texts.catalog;

    if (isLocked(status, canPublish)) {
        return (
            <p className="flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
                <Lock className="size-4 shrink-0"/>
                {t.lockedNote}
            </p>
        );
    }

    const buttons: { status: ContentStatus; label: string; icon: typeof Save; primary?: boolean }[] = [];
    if (canPublish) {
        if (status === "published") {
            buttons.push({status: "published", label: texts.actions.save, icon: Save, primary: true});
            buttons.push({status: "draft", label: t.unpublish, icon: RotateCcw});
            buttons.push({status: "archived", label: t.archive, icon: Archive});
        } else {
            buttons.push({status: "published", label: t.publish, icon: Eye, primary: true});
            buttons.push({status: status === "archived" ? "archived" : status ?? "draft", label: status === "archived" ? texts.actions.save : t.saveDraft, icon: Save});
            if (status !== null && status !== "archived") buttons.push({status: "archived", label: t.archive, icon: Archive});
        }
    } else {
        buttons.push({status: "review", label: t.sendToReview, icon: Send, primary: true});
        buttons.push({status: "draft", label: t.saveDraft, icon: Save});
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {buttons.map((b) => (
                    <Button
                        key={`${b.status}-${b.label}`}
                        type="button"
                        size="lg"
                        variant={b.primary ? "default" : "outline"}
                        disabled={pending}
                        onClick={() => onSave(b.status)}
                    >
                        <b.icon className="size-4"/>
                        {b.label}
                    </Button>
                ))}
            </div>
            {!canPublish && <p className="text-xs text-neutral-500">{t.editorNote}</p>}
        </div>
    );
}
