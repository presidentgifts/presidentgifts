"use client";

import {FormEvent, useState} from "react";
import {Pencil, Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Card, ConfirmDialog, EmptyRow, Field, PageHeader, SubmitButton, td, th, theadClass, useAdminAction} from "@/components/admin/kit";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import {createCurrencyAction, deleteCurrencyAction, updateCurrencyAction} from "./actions";

interface CurrencyRow {
    code: string;
    name: string;
    symbol: string;
    symbolPosition: "before" | "after";
    decimals: number;
    countries: number;
}

/** How a price looks in this currency, e.g. "1 250 000 so'm" or "$1,250.00". */
export function formatSample(c: Pick<CurrencyRow, "symbol" | "symbolPosition" | "decimals">, amount = 1250000) {
    const number = amount.toLocaleString("ru-RU", {minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals});
    return c.symbolPosition === "before" ? `${c.symbol}${number}` : `${number} ${c.symbol}`;
}

export function CurrenciesManager({texts, currencies}: { texts: AdminDictionary; currencies: CurrencyRow[] }) {
    const t = texts.currenciesPage;
    const [editing, setEditing] = useState<CurrencyRow | "new" | null>(null);
    const [deleting, setDeleting] = useState<CurrencyRow | null>(null);
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
                            <th className={th}>{texts.fields.example}</th>
                            <th className={th}>{texts.fields.usage}</th>
                            <th className={th}/>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                        {currencies.length === 0 && <EmptyRow colSpan={5} text={t.empty}/>}
                        {currencies.map((currency) => (
                            <tr key={currency.code} className="hover:bg-neutral-50/60">
                                <td className={td}><span className="font-mono text-xs font-semibold">{currency.code}</span></td>
                                <td className={`${td} font-medium`}>{currency.name}</td>
                                <td className={`${td} tabular-nums text-neutral-600`}>{formatSample(currency)}</td>
                                <td className={`${td} text-neutral-500`}>
                                    {currency.countries > 0 ? format(texts.fields.countriesCount, {count: currency.countries}) : "—"}
                                </td>
                                <td className={`${td} text-right`}>
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" aria-label={texts.actions.edit} onClick={() => setEditing(currency)}>
                                            <Pencil className="size-4"/>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={texts.actions.delete}
                                            disabled={currency.countries > 0}
                                            title={currency.countries > 0 ? texts.errors.inUse : undefined}
                                            onClick={() => setDeleting(currency)}
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

            <CurrencyDialog key={editing === "new" ? "new" : editing?.code} texts={texts} value={editing} onClose={() => setEditing(null)}/>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={format(t.deleteTitle, {name: deleting?.code ?? ""})}
                description={t.deleteText}
                confirmLabel={texts.actions.delete}
                texts={texts}
                onConfirm={async () => {
                    if (!deleting) return;
                    const result = await run(() => deleteCurrencyAction(deleting.code));
                    if (result.ok) setDeleting(null);
                }}
            />
        </div>
    );
}

function CurrencyDialog({texts, value, onClose}: {
    texts: AdminDictionary;
    value: CurrencyRow | "new" | null;
    onClose: () => void;
}) {
    const t = texts.currenciesPage;
    const isNew = value === "new";
    const initial = value && value !== "new" ? value : null;
    const [form, setForm] = useState({
        code: initial?.code ?? "",
        name: initial?.name ?? "",
        symbol: initial?.symbol ?? "",
        symbolPosition: initial?.symbolPosition ?? ("after" as "before" | "after"),
        decimals: initial?.decimals ?? 2,
    });
    const {run, pending, errorField} = useAdminAction(texts);

    async function submit(event: FormEvent) {
        event.preventDefault();
        const result = isNew
            ? await run(() => createCurrencyAction(form), {success: texts.actions.saved})
            : await run(() => updateCurrencyAction(form.code, form), {success: texts.actions.saved});
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

                    <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
                        <Field label={texts.fields.code} htmlFor="cur-code" error={errorField === "code"}>
                            <Input
                                id="cur-code"
                                value={form.code}
                                onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})}
                                disabled={!isNew}
                                required
                                maxLength={3}
                                placeholder="UZS"
                                className="font-mono"
                                aria-invalid={errorField === "code"}
                            />
                        </Field>
                        <Field label={texts.fields.nameEn} htmlFor="cur-name" error={errorField === "name"}>
                            <Input
                                id="cur-name"
                                value={form.name}
                                onChange={(e) => setForm({...form, name: e.target.value})}
                                required
                                maxLength={64}
                                placeholder="Uzbek Sum"
                                aria-invalid={errorField === "name"}
                            />
                        </Field>
                    </div>
                    {isNew && <p className="-mt-3 text-xs text-neutral-500">{t.codeHint}</p>}

                    <div className="grid gap-5 sm:grid-cols-3">
                        <Field label={texts.fields.symbol} htmlFor="cur-symbol" error={errorField === "symbol"}>
                            <Input
                                id="cur-symbol"
                                value={form.symbol}
                                onChange={(e) => setForm({...form, symbol: e.target.value})}
                                required
                                maxLength={8}
                                placeholder="so'm"
                                aria-invalid={errorField === "symbol"}
                            />
                        </Field>
                        <Field label={texts.fields.symbolPosition}>
                            <Select
                                value={form.symbolPosition}
                                onValueChange={(v) => setForm({...form, symbolPosition: v as "before" | "after"})}
                            >
                                <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="before">{texts.fields.before}</SelectItem>
                                    <SelectItem value="after">{texts.fields.after}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={texts.fields.decimals} htmlFor="cur-decimals" error={errorField === "decimals"}>
                            <Input
                                id="cur-decimals"
                                type="number"
                                min={0}
                                max={4}
                                value={form.decimals}
                                onChange={(e) => setForm({...form, decimals: Number(e.target.value)})}
                                required
                            />
                        </Field>
                    </div>

                    <div className="rounded-md bg-neutral-50 px-3 py-2.5 text-sm">
                        <span className="text-neutral-500">{texts.fields.example}: </span>
                        <span className="font-medium tabular-nums">{formatSample(form)}</span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" size="lg" onClick={onClose}>{texts.actions.cancel}</Button>
                        <SubmitButton pending={pending}>{isNew ? texts.actions.create : texts.actions.save}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
