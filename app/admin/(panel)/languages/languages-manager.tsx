"use client";

import {FormEvent, useState} from "react";
import {Pencil, Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {
    Card,
    ConfirmDialog,
    EmptyRow,
    Field,
    PageHeader,
    StatusBadge,
    SubmitButton,
    td,
    th,
    theadClass,
    ToggleRow,
    useAdminAction,
} from "@/components/admin/kit";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import {createLanguageAction, deleteLanguageAction, updateLanguageAction} from "./actions";

interface LanguageRow {
    code: string;
    name: string;
    nativeName: string;
    isActive: boolean;
    countries: number;
}

export function LanguagesManager({texts, languages}: { texts: AdminDictionary; languages: LanguageRow[] }) {
    const t = texts.languagesPage;
    const [editing, setEditing] = useState<LanguageRow | "new" | null>(null);
    const [deleting, setDeleting] = useState<LanguageRow | null>(null);
    const {run} = useAdminAction(texts);

    return (
        <div className="space-y-6">
            <PageHeader title={t.title} subtitle={t.subtitle}>
                <Button size="lg" onClick={() => setEditing("new")}>
                    <Plus className="size-4"/>
                    {t.add}
                </Button>
            </PageHeader>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className={theadClass}>
                        <tr>
                            <th className={th}>{texts.fields.code}</th>
                            <th className={th}>{texts.fields.name}</th>
                            <th className={th}>{texts.fields.nativeName}</th>
                            <th className={th}>{texts.fields.usage}</th>
                            <th className={th}>{texts.fields.status}</th>
                            <th className={th}/>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {languages.length === 0 && <EmptyRow colSpan={6} text={t.empty}/>}
                        {languages.map((language) => (
                            <tr key={language.code} className="hover:bg-neutral-50/60">
                                <td className={td}><span className="font-mono text-xs">{language.code}</span></td>
                                <td className={`${td} font-medium`}>{language.name}</td>
                                <td className={td}>{language.nativeName}</td>
                                <td className={`${td} text-neutral-500`}>
                                    {language.countries > 0 ? format(texts.fields.countriesCount, {count: language.countries}) : "—"}
                                </td>
                                <td className={td}><StatusBadge active={language.isActive} texts={texts}/></td>
                                <td className={`${td} text-right`}>
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" aria-label={texts.actions.edit} onClick={() => setEditing(language)}>
                                            <Pencil className="size-4"/>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={texts.actions.delete}
                                            disabled={language.countries > 0}
                                            title={language.countries > 0 ? texts.errors.inUse : undefined}
                                            onClick={() => setDeleting(language)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="size-4"/>
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <LanguageDialog key={editing === "new" ? "new" : editing?.code} texts={texts} value={editing} onClose={() => setEditing(null)}/>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={format(t.deleteTitle, {name: deleting?.name ?? ""})}
                description={t.deleteText}
                confirmLabel={texts.actions.delete}
                texts={texts}
                onConfirm={async () => {
                    if (!deleting) return;
                    const result = await run(() => deleteLanguageAction(deleting.code));
                    if (result.ok) setDeleting(null);
                }}
            />
        </div>
    );
}

function LanguageDialog({texts, value, onClose}: {
    texts: AdminDictionary;
    value: LanguageRow | "new" | null;
    onClose: () => void;
}) {
    const t = texts.languagesPage;
    const isNew = value === "new";
    const initial = value && value !== "new" ? value : null;
    const [form, setForm] = useState({
        code: initial?.code ?? "",
        name: initial?.name ?? "",
        nativeName: initial?.nativeName ?? "",
        isActive: initial?.isActive ?? true,
    });
    const {run, pending, errorField} = useAdminAction(texts);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const result = isNew
            ? await run(() => createLanguageAction(form), {success: texts.actions.saved})
            : await run(() => updateLanguageAction(form.code, form), {success: texts.actions.saved});
        if (result.ok) onClose();
    }

    return (
        <Dialog open={value !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{isNew ? t.add : t.editTitle}</DialogTitle>
                        <DialogDescription className="sr-only">{t.subtitle}</DialogDescription>
                    </DialogHeader>

                    <Field label={texts.fields.code} htmlFor="lang-code" hint={t.codeHint} error={errorField === "code"}>
                        <Input
                            id="lang-code"
                            value={form.code}
                            onChange={(e) => setForm({...form, code: e.target.value.toLowerCase()})}
                            disabled={!isNew}
                            required
                            maxLength={8}
                            className="font-mono"
                            aria-invalid={errorField === "code"}
                        />
                    </Field>
                    <Field label={texts.fields.nameEn} htmlFor="lang-name" error={errorField === "name"}>
                        <Input
                            id="lang-name"
                            value={form.name}
                            onChange={(e) => setForm({...form, name: e.target.value})}
                            required
                            maxLength={64}
                            placeholder="Uzbek"
                            aria-invalid={errorField === "name"}
                        />
                    </Field>
                    <Field label={texts.fields.nativeName} htmlFor="lang-native" hint={t.nativeHint} error={errorField === "nativeName"}>
                        <Input
                            id="lang-native"
                            value={form.nativeName}
                            onChange={(e) => setForm({...form, nativeName: e.target.value})}
                            required
                            maxLength={64}
                            placeholder="O'zbekcha"
                            aria-invalid={errorField === "nativeName"}
                        />
                    </Field>
                    <ToggleRow
                        label={texts.common.active}
                        hint={t.activeHint}
                        checked={form.isActive}
                        onChange={(isActive) => setForm({...form, isActive})}
                    />

                    <DialogFooter>
                        <Button type="button" variant="outline" size="lg" onClick={onClose}>{texts.actions.cancel}</Button>
                        <SubmitButton pending={pending}>{isNew ? texts.actions.create : texts.actions.save}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
