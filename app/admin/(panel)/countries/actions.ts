"use server";

import {requirePermission, requireSuperAdmin} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {logAudit} from "@/server/audit";
import {ActionResult, runAction} from "@/server/admin-action";
import {
    createCountry,
    saveCountryCurrencies,
    saveCountryLanguages,
    setCountryActive,
    updateCountryGeneral,
} from "@/server/services/countries";

export interface CountryGeneralForm {
    name: string;
    phone: string;
    email: string;
}

export interface CountryCreateForm extends CountryGeneralForm {
    code: string;
    defaultLanguageCode: string;
    defaultCurrencyCode: string;
}

export interface CountryLanguagesForm {
    defaultLanguageCode: string;
    languages: { code: string; isActive: boolean }[];
}

export interface CountryCurrenciesForm {
    defaultCurrencyCode: string;
    currencies: { code: string; isActive: boolean; rateToUsd: string | null }[];
}

export async function createCountryAction(input: CountryCreateForm): Promise<ActionResult<string>> {
    return runAction(async () => {
        const ctx = await requireSuperAdmin();
        const data = await createCountry(input);
        await logAudit({userId: ctx.user.id, countryCode: data.code, action: "country.create", entityType: "country", entityId: data.code, changes: data});
        return data.code;
    });
}

export async function updateCountryGeneralAction(code: string, input: CountryGeneralForm): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requirePermission(PERMISSIONS.countrySettings, code);
        const data = await updateCountryGeneral(code, input);
        await logAudit({userId: ctx.user.id, countryCode: code, action: "country.update", entityType: "country", entityId: code, changes: data});
    });
}

export async function setCountryActiveAction(code: string, isActive: boolean): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requireSuperAdmin();
        await setCountryActive(code, isActive);
        await logAudit({
            userId: ctx.user.id,
            countryCode: code,
            action: isActive ? "country.activate" : "country.deactivate",
            entityType: "country",
            entityId: code,
        });
    });
}

export async function saveCountryLanguagesAction(code: string, input: CountryLanguagesForm): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requirePermission(PERMISSIONS.countrySettings, code);
        const data = await saveCountryLanguages(code, input);
        await logAudit({userId: ctx.user.id, countryCode: code, action: "country.languages", entityType: "country", entityId: code, changes: data});
    });
}

export async function saveCountryCurrenciesAction(code: string, input: CountryCurrenciesForm): Promise<ActionResult> {
    return runAction(async () => {
        const ctx = await requirePermission(PERMISSIONS.countrySettings, code);
        const data = await saveCountryCurrencies(code, input);
        await logAudit({userId: ctx.user.id, countryCode: code, action: "country.currencies", entityType: "country", entityId: code, changes: data});
    });
}
