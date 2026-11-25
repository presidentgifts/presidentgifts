import {en, type AdminDictionary} from "./en";
import {ru} from "./ru";
import {uz} from "./uz";

export type {AdminDictionary};

export const ADMIN_LANGUAGES = [
    {code: "uz", label: "O'zbekcha"},
    {code: "ru", label: "Русский"},
    {code: "en", label: "English"},
] as const;

export type AdminLanguage = (typeof ADMIN_LANGUAGES)[number]["code"];

export const ADMIN_LANG_COOKIE = "admin_lang";

const dictionaries: Record<AdminLanguage, AdminDictionary> = {uz, ru, en};

export function isAdminLanguage(value: unknown): value is AdminLanguage {
    return typeof value === "string" && value in dictionaries;
}

export function getAdminDictionary(lang: unknown): AdminDictionary {
    return dictionaries[isAdminLanguage(lang) ? lang : "uz"];
}

export function format(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
