"use client";

import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {Image as ImageIcon, Plus, Trash2, Type} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Card, ConfirmDialog, Field, SubmitButton, useAdminAction} from "@/components/admin/kit";
import {GalleryField} from "@/components/admin/catalog/media-fields";
import {cn} from "@/lib/utils";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import {ENTRY_KEY_PATTERN, PAGE_KEY_PATTERN} from "@/lib/page-registry";
import type {CatalogCountry} from "@/server/services/catalog/context";
import type {PageEntryView} from "@/server/services/content/pages";
import {deletePageEntryAction, savePageEntriesAction} from "@/app/admin/content-actions";

type EntryState = PageEntryView & { dirty: boolean };

export function PageEditor({texts, country, pageKey, entries: initial}: {
    texts: AdminDictionary;
    country: CatalogCountry;
    pageKey: string;
    entries: PageEntryView[];
}) {
    const t = texts.pagesPage;
    const [entries, setEntries] = useState<EntryState[]>(() => initial.map((e) => ({...e, dirty: false})));
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState<EntryState | null>(null);
    const {run, pending} = useAdminAction(texts);
    const readOnly = !country.canPublish;
    const mainLanguage = country.languages[0];
    const dirtyCount = entries.filter((e) => e.dirty).length;

    const update = (key: string, patch: Partial<EntryState>) =>
        setEntries((list) => list.map((e) => (e.key === key ? {...e, ...patch, dirty: true} : e)));

    async function save() {
        const changed = entries.filter((e) => e.dirty);
        if (changed.length === 0) return;
        const result = await run(
            () => savePageEntriesAction(country.code, pageKey, changed.map((e) => ({
                key: e.key,
                type: e.type,
                info: e.info,
                values: e.values,
                mediaIds: e.media.map((m) => m.id),
            }))),
            {success: texts.actions.saved},
        );
        if (result.ok) setEntries((list) => list.map((e) => ({...e, dirty: false})));
    }

    return (
        <div className="space-y-4 pb-20">
            {readOnly && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{t.readOnly}</p>}

            {entries.length === 0 && <Card className="p-10 text-center text-sm text-neutral-500">{t.empty}</Card>}

            {entries.map((entry) => (
                <Card key={entry.key} className={cn("p-5", entry.dirty && "border-amber-300")}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {entry.type === "media" ? <ImageIcon className="size-4 text-neutral-400"/> : <Type className="size-4 text-neutral-400"/>}
                            <code className="font-mono text-sm font-medium">{entry.key}</code>
                            {entry.info && <span className="text-xs text-neutral-500">· {entry.info}</span>}
                        </div>
                        {!entry.known && !readOnly && entry.id !== null && (
                            <Button variant="ghost" size="icon" className="size-8 text-neutral-400 hover:text-red-600" aria-label={texts.actions.delete} onClick={() => setDeleting(entry)}>
                                <Trash2 className="size-4"/>
                            </Button>
                        )}
                    </div>

                    {entry.type === "media" ? (
                        <GalleryField
                            texts={texts}
                            countryCode={country.code}
                            value={entry.media}
                            onChange={(media) => update(entry.key, {media})}
                            disabled={readOnly}
                        />
                    ) : (
                        <div className={cn("grid gap-4", country.languages.length > 1 && "md:grid-cols-2", country.languages.length > 2 && "xl:grid-cols-3")}>
                            {country.languages.map((language, index) => {
                                const value = entry.values[language.code] ?? "";
                                const props = {
                                    id: `${entry.key}-${language.code}`,
                                    value,
                                    disabled: readOnly,
                                    placeholder: index > 0 ? format(t.fallback, {lang: mainLanguage?.nativeName ?? ""}) : undefined,
                                    onChange: (e: { target: { value: string } }) =>
                                        update(entry.key, {values: {...entry.values, [language.code]: e.target.value}}),
                                };
                                return (
                                    <div key={language.code} className="space-y-1.5">
                                        <label htmlFor={props.id} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                                            {language.nativeName}
                                            {index === 0 && <span className="text-neutral-400">({texts.catalog.required})</span>}
                                        </label>
                                        {entry.multiline || value.length > 80 ? <Textarea rows={4} {...props}/> : <Input {...props}/>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            ))}

            {!readOnly && (
                <Button variant="outline" size="lg" onClick={() => setAdding(true)}>
                    <Plus className="size-4"/>
                    {t.addKey}
                </Button>
            )}

            {!readOnly && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur lg:left-64">
                    <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4 py-3 sm:px-6 lg:px-8">
                        {dirtyCount > 0 && <span className="text-sm text-amber-700">{format(t.unsaved, {count: dirtyCount})}</span>}
                        <Button size="lg" disabled={pending || dirtyCount === 0} onClick={save}>
                            {pending ? texts.actions.saving : texts.actions.save}
                        </Button>
                    </div>
                </div>
            )}

            <AddKeyDialog
                texts={texts}
                open={adding}
                pageName={t.names[pageKey] ?? pageKey}
                existing={new Set(entries.map((e) => e.key))}
                onClose={() => setAdding(false)}
                onAdd={(key, type) => {
                    setEntries((list) => [...list, {id: null, key, type, multiline: false, info: null, known: false, values: {}, media: [], dirty: true}]);
                    setAdding(false);
                }}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={format(t.deleteKeyTitle, {key: deleting?.key ?? ""})}
                description={t.deleteKeyText}
                confirmLabel={texts.actions.delete}
                texts={texts}
                onConfirm={async () => {
                    if (!deleting) return;
                    const result = await run(() => deletePageEntryAction(country.code, pageKey, deleting.key), {success: texts.actions.saved});
                    if (result.ok) {
                        setEntries((list) => list.filter((e) => e.key !== deleting.key));
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

function AddKeyDialog({texts, open, pageName, existing, onClose, onAdd}: {
    texts: AdminDictionary;
    open: boolean;
    pageName: string;
    existing: Set<string>;
    onClose: () => void;
    onAdd: (key: string, type: "text" | "media") => void;
}) {
    const t = texts.pagesPage;
    const [key, setKey] = useState("");
    const [type, setType] = useState<"text" | "media">("text");
    const valid = ENTRY_KEY_PATTERN.test(key) && !existing.has(key);

    function submit(event: FormEvent) {
        event.preventDefault();
        if (!valid) return;
        onAdd(key, type);
        setKey("");
        setType("text");
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{format(t.addKeyTitle, {page: pageName})}</DialogTitle>
                        <DialogDescription>{t.keyHint}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
                        <Field label={t.key} htmlFor="new-key" error={key !== "" && !valid}>
                            <Input id="new-key" value={key} onChange={(e) => setKey(e.target.value.trim())} className="font-mono" autoFocus aria-invalid={key !== "" && !valid}/>
                        </Field>
                        <Field label={`${t.typeText} / ${t.typeMedia}`}>
                            <Select value={type} onValueChange={(v) => setType(v as "text" | "media")}>
                                <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">{t.typeText}</SelectItem>
                                    <SelectItem value="media">{t.typeMedia}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" size="lg" onClick={onClose}>{texts.actions.cancel}</Button>
                        <SubmitButton pending={false}>{texts.actions.add}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** Opens a page that isn't in the list yet, by its key. */
export function OtherPageForm({texts}: { texts: AdminDictionary }) {
    const t = texts.pagesPage;
    const router = useRouter();
    const [key, setKey] = useState("");
    const valid = PAGE_KEY_PATTERN.test(key);

    return (
        <Card className="p-5">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (valid) router.push(`/admin/ui-texts?page=${encodeURIComponent(key)}`);
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
                <div className="flex-1">
                    <Field label={t.otherPage} htmlFor="other-page" hint={t.otherPageHint}>
                        <Input id="other-page" value={key} onChange={(e) => setKey(e.target.value.trim())} className="font-mono" placeholder="PAGE_KEY"/>
                    </Field>
                </div>
                <Button type="submit" size="lg" variant="outline" disabled={!valid} className="sm:mb-6">{t.open}</Button>
            </form>
        </Card>
    );
}
