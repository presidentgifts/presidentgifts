"use client";

import {FormEvent, ReactNode, useState} from "react";
import {ArrowDown, ArrowUp, Power, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Card, ConfirmDialog, Field, SubmitButton, Switch, useAdminAction} from "@/components/admin/kit";
import {cn} from "@/lib/utils";
import {format, type AdminDictionary} from "@/lib/admin-i18n";
import {
    saveCountryCurrenciesAction,
    saveCountryLanguagesAction,
    setCountryActiveAction,
    updateCountryGeneralAction,
} from "../actions";

interface CountryInfo {
    code: string;
    name: string;
    phone: string;
    email: string;
    isActive: boolean;
    defaultLanguageCode: string;
    defaultCurrencyCode: string;
}

interface LanguageOption {
    code: string;
    name: string;
    nativeName: string;
    isActive: boolean;
}

interface CurrencyOption {
    code: string;
    name: string;
    symbol: string;
}

interface Props {
    texts: AdminDictionary;
    canToggle: boolean;
    maxLanguages: number;
    country: CountryInfo;
    languages: { code: string; isActive: boolean }[];
    currencies: { code: string; isActive: boolean; rateToUsd: string | null }[];
    languageOptions: LanguageOption[];
    currencyOptions: CurrencyOption[];
}

export function CountrySettings(props: Props) {
    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
            <div className="space-y-6">
                <LanguagesSection {...props}/>
                <CurrenciesSection {...props}/>
            </div>
            <div className="space-y-6">
                <GeneralSection {...props}/>
                <VisibilitySection {...props}/>
            </div>
        </div>
    );
}

function SectionHeader({title, hint, children}: { title: string; hint?: string; children?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
            <div>
                <h2 className="font-semibold">{title}</h2>
                {hint && <p className="mt-0.5 text-sm text-neutral-500">{hint}</p>}
            </div>
            {children}
        </div>
    );
}

function move<T>(list: T[], index: number, delta: number): T[] {
    const target = index + delta;
    if (target < 0 || target >= list.length) return list;
    const copy = [...list];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy;
}

function RowControls({texts, index, count, onMove, onRemove, removable}: {
    texts: AdminDictionary;
    index: number;
    count: number;
    onMove: (delta: number) => void;
    onRemove: () => void;
    removable: boolean;
}) {
    return (
        <div className="flex items-center">
            <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => onMove(-1)} aria-label={texts.actions.moveUp}>
                <ArrowUp className="size-4"/>
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={texts.actions.moveDown}>
                <ArrowDown className="size-4"/>
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-neutral-400 hover:text-red-600"
                disabled={!removable}
                onClick={onRemove}
                aria-label={texts.actions.remove}
            >
                <X className="size-4"/>
            </Button>
        </div>
    );
}

function DefaultRadio({checked, onChange, label, disabled}: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
    return (
        <label className={cn("flex items-center gap-1.5 text-xs", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
            <input type="radio" checked={checked} onChange={onChange} disabled={disabled} className="size-3.5 accent-[var(--color-primary)]"/>
            <span className={cn(checked ? "font-semibold text-neutral-900" : "text-neutral-500")}>{label}</span>
        </label>
    );
}

function SaveBar({texts, dirty, pending}: { texts: AdminDictionary; dirty: boolean; pending: boolean }) {
    return (
        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50/60 px-5 py-3">
            {dirty && <span className="text-xs text-amber-700">{texts.countryPage.unsaved}</span>}
            <SubmitButton pending={pending} className={cn(!dirty && "pointer-events-none opacity-50")}>
                {texts.actions.save}
            </SubmitButton>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function LanguagesSection({texts, country, languages, languageOptions, maxLanguages}: Props) {
    const t = texts.countryPage;
    const [list, setList] = useState(languages);
    const [defaultCode, setDefaultCode] = useState(country.defaultLanguageCode);
    const {run, pending} = useAdminAction(texts);

    const initial = JSON.stringify({languages, d: country.defaultLanguageCode});
    const dirty = JSON.stringify({languages: list, d: defaultCode}) !== initial;
    const byCode = new Map(languageOptions.map((l) => [l.code, l]));
    const addable = languageOptions.filter((l) => l.isActive && !list.some((x) => x.code === l.code));

    async function submit(event: FormEvent) {
        event.preventDefault();
        await run(() => saveCountryLanguagesAction(country.code, {defaultLanguageCode: defaultCode, languages: list}), {success: texts.actions.saved});
    }

    return (
        <Card>
            <form onSubmit={submit}>
                <SectionHeader title={t.languages} hint={format(t.languagesHint, {max: maxLanguages})}>
                    <Select
                        value=""
                        disabled={addable.length === 0 || list.length >= maxLanguages}
                        onValueChange={(code) => setList([...list, {code, isActive: true}])}
                    >
                        <SelectTrigger className="h-9 w-48"><SelectValue placeholder={`+ ${t.addLanguage}`}/></SelectTrigger>
                        <SelectContent>
                            {addable.map((l) => (
                                <SelectItem key={l.code} value={l.code}>
                                    <span className="font-mono text-xs text-neutral-400">{l.code}</span>
                                    {l.nativeName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </SectionHeader>

                <ul className="divide-y divide-neutral-100">
                    {list.map((item, index) => {
                        const option = byCode.get(item.code);
                        const isDefault = item.code === defaultCode;
                        return (
                            <li key={item.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                                <span className="w-5 text-center text-xs tabular-nums text-neutral-400">{index + 1}</span>
                                <span className="w-10 font-mono text-xs uppercase">{item.code}</span>
                                <div className="min-w-32 flex-1">
                                    <p className={cn("text-sm font-medium", !item.isActive && "text-neutral-400")}>{option?.nativeName ?? item.code}</p>
                                    <p className="text-xs text-neutral-500">{option?.name}</p>
                                </div>
                                <DefaultRadio
                                    label={t.main}
                                    checked={isDefault}
                                    disabled={!item.isActive}
                                    onChange={() => setDefaultCode(item.code)}
                                />
                                <Switch
                                    label={texts.common.active}
                                    checked={item.isActive}
                                    disabled={isDefault}
                                    onChange={(isActive) => setList(list.map((x) => (x.code === item.code ? {...x, isActive} : x)))}
                                />
                                <RowControls
                                    texts={texts}
                                    index={index}
                                    count={list.length}
                                    removable={!isDefault}
                                    onMove={(delta) => setList(move(list, index, delta))}
                                    onRemove={() => setList(list.filter((x) => x.code !== item.code))}
                                />
                            </li>
                        );
                    })}
                </ul>

                <SaveBar texts={texts} dirty={dirty} pending={pending}/>
            </form>
        </Card>
    );
}

/* ------------------------------------------------------------------ */

function CurrenciesSection({texts, country, currencies, currencyOptions}: Props) {
    const t = texts.countryPage;
    const [list, setList] = useState(currencies);
    const [defaultCode, setDefaultCode] = useState(country.defaultCurrencyCode);
    const {run, pending} = useAdminAction(texts);

    const initial = JSON.stringify({currencies, d: country.defaultCurrencyCode});
    const dirty = JSON.stringify({currencies: list, d: defaultCode}) !== initial;
    const byCode = new Map(currencyOptions.map((c) => [c.code, c]));
    const addable = currencyOptions.filter((c) => !list.some((x) => x.code === c.code));

    async function submit(event: FormEvent) {
        event.preventDefault();
        const currenciesInput = list.map((c) => ({...c, rateToUsd: c.rateToUsd?.trim().replace(",", ".") || null}));
        const result = await run(
            () => saveCountryCurrenciesAction(country.code, {defaultCurrencyCode: defaultCode, currencies: currenciesInput}),
            {success: texts.actions.saved},
        );
        // Match the server's form ("12500.50" → "12500.5") so the form isn't left looking unsaved.
        if (result.ok) {
            setList(currenciesInput.map((c) => ({...c, rateToUsd: c.rateToUsd === null ? null : String(Number(c.rateToUsd))})));
        }
    }

    return (
        <Card>
            <form onSubmit={submit}>
                <SectionHeader title={t.currencies} hint={t.currenciesHint}>
                    <Select
                        value=""
                        disabled={addable.length === 0}
                        onValueChange={(code) => setList([...list, {code, isActive: true, rateToUsd: code === "USD" ? "1" : null}])}
                    >
                        <SelectTrigger className="h-9 w-48"><SelectValue placeholder={`+ ${t.addCurrency}`}/></SelectTrigger>
                        <SelectContent>
                            {addable.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                    <span className="font-mono text-xs text-neutral-400">{c.code}</span>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </SectionHeader>

                <ul className="divide-y divide-neutral-100">
                    {list.map((item, index) => {
                        const option = byCode.get(item.code);
                        const isDefault = item.code === defaultCode;
                        const isUsd = item.code === "USD";
                        const missing = item.isActive && !isUsd && !item.rateToUsd?.trim();
                        return (
                            <li key={item.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                                <span className="w-5 text-center text-xs tabular-nums text-neutral-400">{index + 1}</span>
                                <span className="w-10 font-mono text-xs font-semibold">{item.code}</span>
                                <div className="min-w-28 flex-1">
                                    <p className={cn("text-sm font-medium", !item.isActive && "text-neutral-400")}>{option?.name ?? item.code}</p>
                                    <p className="text-xs text-neutral-500">{option?.symbol}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="whitespace-nowrap text-xs text-neutral-500">{texts.fields.rate}</span>
                                    {isUsd ? (
                                        <span className="w-32 text-sm text-neutral-500">1 <span className="text-xs">({t.usdBase})</span></span>
                                    ) : (
                                        <Input
                                            inputMode="decimal"
                                            value={item.rateToUsd ?? ""}
                                            placeholder={t.rateMissing}
                                            onChange={(e) =>
                                                setList(list.map((x) => (x.code === item.code ? {...x, rateToUsd: e.target.value} : x)))
                                            }
                                            aria-invalid={missing}
                                            className={cn("h-8 w-32 tabular-nums", missing && "border-amber-400")}
                                        />
                                    )}
                                </div>
                                <DefaultRadio label={t.main} checked={isDefault} disabled={!item.isActive} onChange={() => setDefaultCode(item.code)}/>
                                <Switch
                                    label={texts.common.active}
                                    checked={item.isActive}
                                    disabled={isDefault}
                                    onChange={(isActive) => setList(list.map((x) => (x.code === item.code ? {...x, isActive} : x)))}
                                />
                                <RowControls
                                    texts={texts}
                                    index={index}
                                    count={list.length}
                                    removable={!isDefault}
                                    onMove={(delta) => setList(move(list, index, delta))}
                                    onRemove={() => setList(list.filter((x) => x.code !== item.code))}
                                />
                            </li>
                        );
                    })}
                </ul>

                <SaveBar texts={texts} dirty={dirty} pending={pending}/>
            </form>
        </Card>
    );
}

/* ------------------------------------------------------------------ */

function GeneralSection({texts, country}: Props) {
    const t = texts.countryPage;
    const initial = {name: country.name, phone: country.phone, email: country.email};
    const [form, setForm] = useState(initial);
    const {run, pending, errorField} = useAdminAction(texts);
    const dirty = JSON.stringify(form) !== JSON.stringify(initial);

    async function submit(event: FormEvent) {
        event.preventDefault();
        await run(() => updateCountryGeneralAction(country.code, form), {success: texts.actions.saved});
    }

    return (
        <Card>
            <form onSubmit={submit}>
                <SectionHeader title={t.general} hint={t.generalHint}/>
                <div className="space-y-4 p-5">
                    <Field label={texts.fields.name} htmlFor="c-name" error={errorField === "name"}>
                        <Input id="c-name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required maxLength={64}/>
                    </Field>
                    <Field label={texts.fields.phone} htmlFor="c-phone" error={errorField === "phone"}>
                        <Input id="c-phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} maxLength={32} placeholder="+998 71 000 00 00"/>
                    </Field>
                    <Field label={texts.fields.email} htmlFor="c-email" error={errorField === "email"}>
                        <Input
                            id="c-email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({...form, email: e.target.value})}
                            maxLength={128}
                            aria-invalid={errorField === "email"}
                        />
                    </Field>
                </div>
                <SaveBar texts={texts} dirty={dirty} pending={pending}/>
            </form>
        </Card>
    );
}

function VisibilitySection({texts, country, canToggle}: Props) {
    const t = texts.countryPage;
    const [confirming, setConfirming] = useState(false);
    const {run, pending} = useAdminAction(texts);

    const toggle = (isActive: boolean) => run(() => setCountryActiveAction(country.code, isActive), {success: texts.actions.saved});

    return (
        <Card>
            <SectionHeader title={t.visibility}/>
            <div className="space-y-4 p-5">
                <div className="flex gap-3">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", country.isActive ? "bg-emerald-500" : "bg-neutral-400")}/>
                    <p className="text-sm text-neutral-600">{country.isActive ? t.visibleText : t.hiddenText}</p>
                </div>
                {canToggle && (
                    <Button
                        type="button"
                        size="lg"
                        variant={country.isActive ? "outline" : "default"}
                        disabled={pending}
                        className="w-full"
                        onClick={() => (country.isActive ? setConfirming(true) : toggle(true))}
                    >
                        <Power className="size-4"/>
                        {country.isActive ? t.turnOff : t.turnOn}
                    </Button>
                )}
            </div>

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={format(t.turnOffTitle, {name: country.name})}
                description={t.turnOffText}
                confirmLabel={t.turnOff}
                texts={texts}
                onConfirm={async () => {
                    const result = await toggle(false);
                    if (result.ok) setConfirming(false);
                }}
            />
        </Card>
    );
}
