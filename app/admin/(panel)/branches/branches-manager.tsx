"use client";

import {FormEvent, useState} from "react";
import {ExternalLink, MapPin, Pencil, Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Card, ConfirmDialog, EmptyRow, Field, PageHeader, StatusBadge, SubmitButton, td, th, theadClass, ToggleRow, useAdminAction} from "@/components/admin/kit";
import {cn} from "@/lib/utils";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import type {CatalogCountry} from "@/server/services/catalog/context";
import type {BranchView} from "@/server/services/content/branches";
import {deleteBranchAction, saveBranchAction} from "@/app/admin/content-actions";

function addressOf(branch: BranchView, lang: string) {
    return branch.translations.find((t) => t.languageCode === lang)?.address ?? branch.translations[0]?.address ?? `#${branch.id}`;
}

function parseCoordinates(value: string): { latitude: number; longitude: number } | null {
    const match = value.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!match) return null;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? {latitude, longitude} : null;
}

const mapLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

export function BranchesManager({texts, country, branches}: { texts: AdminDictionary; country: CatalogCountry; branches: BranchView[] }) {
    const t = texts.branchesPage;
    const [editing, setEditing] = useState<BranchView | "new" | null>(null);
    const [deleting, setDeleting] = useState<BranchView | null>(null);
    const {run} = useAdminAction(texts);
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

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{t.address}</th>
                            <th className={th}>{texts.fields.phone}</th>
                            <th className={th}>{t.coordinates}</th>
                            <th className={th}>{texts.fields.status}</th>
                            <th className={th}/>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {branches.length === 0 && <EmptyRow colSpan={5} text={t.empty}/>}
                        {branches.map((branch) => (
                            <tr key={branch.id} className="hover:bg-neutral-50/60">
                                <td className={td}>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="size-4 shrink-0 text-neutral-400"/>
                                        <div>
                                            <p className="font-medium">{addressOf(branch, country.defaultLanguageCode)}</p>
                                            {branch.translations[0]?.workingHours && <p className="text-xs text-neutral-500">{branch.translations[0].workingHours}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className={`${td} whitespace-nowrap text-neutral-600`}>{branch.phone ?? "—"}</td>
                                <td className={td}>
                                    <a href={mapLink(branch.latitude, branch.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-neutral-600 hover:underline">
                                        {branch.latitude.toFixed(5)}, {branch.longitude.toFixed(5)}
                                        <ExternalLink className="size-3"/>
                                    </a>
                                </td>
                                <td className={td}><StatusBadge active={branch.isActive} texts={texts}/></td>
                                <td className={`${td} text-right`}>
                                    {!readOnly && (
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" aria-label={texts.actions.edit} onClick={() => setEditing(branch)}>
                                                <Pencil className="size-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" aria-label={texts.actions.delete} onClick={() => setDeleting(branch)} className="text-red-600 hover:text-red-700">
                                                <Trash2 className="size-4"/>
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {editing && (
                <BranchDialog
                    key={editing === "new" ? "new" : editing.id}
                    texts={texts}
                    country={country}
                    branch={editing === "new" ? null : editing}
                    nextOrder={branches.length}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={format(t.deleteTitle, {name: deleting ? addressOf(deleting, country.defaultLanguageCode) : ""})}
                description={t.deleteText}
                confirmLabel={texts.actions.delete}
                texts={texts}
                onConfirm={async () => {
                    if (!deleting) return;
                    const result = await run(() => deleteBranchAction(country.code, deleting.id), {success: texts.actions.saved});
                    if (result.ok) setDeleting(null);
                }}
            />
        </div>
    );
}

function BranchDialog({texts, country, branch, nextOrder, onClose}: {
    texts: AdminDictionary;
    country: CatalogCountry;
    branch: BranchView | null;
    nextOrder: number;
    onClose: () => void;
}) {
    const t = texts.branchesPage;
    const [translations, setTranslations] = useState(() =>
        country.languages.map((l) => {
            const found = branch?.translations.find((tr) => tr.languageCode === l.code);
            return {languageCode: l.code, address: found?.address ?? "", workingHours: found?.workingHours ?? ""};
        }),
    );
    const [coordinates, setCoordinates] = useState(branch ? `${branch.latitude}, ${branch.longitude}` : "");
    const [phone, setPhone] = useState(branch?.phone ?? "");
    const [isActive, setIsActive] = useState(branch?.isActive ?? true);
    const [sortOrder, setSortOrder] = useState(branch?.sortOrder ?? nextOrder);
    const {run, pending, errorField} = useAdminAction(texts);
    const parsed = parseCoordinates(coordinates);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!parsed) return;
        const result = await run(
            () => saveBranchAction(country.code, branch?.id ?? null, {...parsed, phone, isActive, sortOrder, translations}),
            {success: texts.actions.saved},
        );
        if (result.ok) onClose();
    }

    const setTr = (code: string, patch: Partial<(typeof translations)[number]>) =>
        setTranslations((list) => list.map((tr) => (tr.languageCode === code ? {...tr, ...patch} : tr)));

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{branch ? t.editTitle : t.createTitle}</DialogTitle>
                        <DialogDescription className="sr-only">{t.subtitle}</DialogDescription>
                    </DialogHeader>

                    {country.languages.map((language, index) => {
                        const tr = translations.find((x) => x.languageCode === language.code)!;
                        const invalid = errorField === `name.${language.code}`;
                        return (
                            <div key={language.code} className="grid gap-3 rounded-md border border-neutral-200 p-3 sm:grid-cols-[1fr_10rem]">
                                <Field label={`${t.address} · ${language.nativeName}${index === 0 ? ` (${texts.catalog.required})` : ""}`} htmlFor={`addr-${language.code}`} error={invalid}>
                                    <Input id={`addr-${language.code}`} value={tr.address} onChange={(e) => setTr(language.code, {address: e.target.value})} maxLength={255} aria-invalid={invalid}/>
                                </Field>
                                <Field label={t.workingHours} htmlFor={`hours-${language.code}`}>
                                    <Input id={`hours-${language.code}`} value={tr.workingHours} onChange={(e) => setTr(language.code, {workingHours: e.target.value})} maxLength={128} placeholder="10:00–20:00"/>
                                </Field>
                            </div>
                        );
                    })}

                    <Field label={t.coordinates} htmlFor="branch-coords" hint={t.coordinatesHint} error={coordinates !== "" && !parsed}>
                        <div className="flex gap-2">
                            <Input
                                id="branch-coords"
                                value={coordinates}
                                onChange={(e) => setCoordinates(e.target.value)}
                                required
                                className={cn("font-mono", coordinates !== "" && !parsed && "border-red-400")}
                                placeholder="41.30834, 69.269253"
                            />
                            {parsed && (
                                <Button type="button" variant="outline" size="lg" asChild>
                                    <a href={mapLink(parsed.latitude, parsed.longitude)} target="_blank" rel="noreferrer">
                                        <ExternalLink className="size-4"/>
                                        {t.openMap}
                                    </a>
                                </Button>
                            )}
                        </div>
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
                        <Field label={texts.fields.phone} htmlFor="branch-phone">
                            <Input id="branch-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="+998 71 000 00 00"/>
                        </Field>
                        <Field label={texts.catalog.sortOrder} htmlFor="branch-order">
                            <Input id="branch-order" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Math.max(0, Number(e.target.value) || 0))}/>
                        </Field>
                    </div>
                    <ToggleRow label={texts.common.active} checked={isActive} onChange={setIsActive}/>

                    <DialogFooter>
                        <Button type="button" variant="outline" size="lg" onClick={onClose}>{texts.actions.cancel}</Button>
                        <SubmitButton pending={pending}>{branch ? texts.actions.save : texts.actions.create}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
