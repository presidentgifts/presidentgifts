"use client";

import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {Plus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Field, SubmitButton, useAdminAction} from "@/components/admin/kit";
import type {AdminDictionary} from "@/lib/admin-i18n";
import {createCountryAction} from "./actions";

interface Option {
    code: string;
    label: string;
}

const EMPTY = {code: "", name: "", phone: "", email: "", defaultLanguageCode: "", defaultCurrencyCode: ""};

export function CreateCountryButton({texts, languages, currencies}: {
    texts: AdminDictionary;
    languages: Option[];
    currencies: Option[];
}) {
    const t = texts.countriesPage;
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const {run, pending, errorField} = useAdminAction(texts);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const result = await run(() => createCountryAction(form), {success: texts.actions.saved});
        if (result.ok) {
            setOpen(false);
            setForm(EMPTY);
            router.push(`/admin/countries/${result.data}`);
        }
    }

    return (
        <>
            <Button size="lg" onClick={() => setOpen(true)}>
                <Plus className="size-4"/>
                {t.add}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <form onSubmit={submit} className="space-y-5">
                        <DialogHeader>
                            <DialogTitle>{t.createTitle}</DialogTitle>
                            <DialogDescription>{t.createHint}</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-5 sm:grid-cols-[7rem_1fr]">
                            <Field label={texts.fields.code} htmlFor="country-code" error={errorField === "code"}>
                                <Input
                                    id="country-code"
                                    value={form.code}
                                    onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})}
                                    required
                                    maxLength={2}
                                    placeholder="KZ"
                                    className="font-mono"
                                    aria-invalid={errorField === "code"}
                                />
                            </Field>
                            <Field label={texts.fields.name} htmlFor="country-name" error={errorField === "name"}>
                                <Input
                                    id="country-name"
                                    value={form.name}
                                    onChange={(e) => setForm({...form, name: e.target.value})}
                                    required
                                    maxLength={64}
                                    placeholder="Kazakhstan"
                                    aria-invalid={errorField === "name"}
                                />
                            </Field>
                        </div>
                        <p className="-mt-3 text-xs text-neutral-500">{t.codeHint}</p>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label={t.defaultLanguage} error={errorField === "defaultLanguageCode"}>
                                <Select value={form.defaultLanguageCode} onValueChange={(v) => setForm({...form, defaultLanguageCode: v})}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="—"/></SelectTrigger>
                                    <SelectContent>
                                        {languages.map((l) => (
                                            <SelectItem key={l.code} value={l.code}>
                                                <span className="font-mono text-xs text-neutral-400">{l.code}</span>
                                                {l.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label={t.defaultCurrency} error={errorField === "defaultCurrencyCode"}>
                                <Select value={form.defaultCurrencyCode} onValueChange={(v) => setForm({...form, defaultCurrencyCode: v})}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="—"/></SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                <span className="font-mono text-xs text-neutral-400">{c.code}</span>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label={texts.fields.phone} htmlFor="country-phone">
                                <Input id="country-phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} maxLength={32}/>
                            </Field>
                            <Field label={texts.fields.email} htmlFor="country-email" error={errorField === "email"}>
                                <Input
                                    id="country-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({...form, email: e.target.value})}
                                    maxLength={128}
                                    aria-invalid={errorField === "email"}
                                />
                            </Field>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>{texts.actions.cancel}</Button>
                            <SubmitButton pending={pending}>{texts.actions.create}</SubmitButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
