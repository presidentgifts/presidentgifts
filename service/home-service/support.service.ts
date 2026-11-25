"use client";

import {fetcherClient} from "@/lib/fetcher-client";
import {getClientLocaleContext} from "@/lib/locale-context-client";

export interface SupportFormTranslation {
    "form.name.label": string;
    "form.messages.required": string;
    "form.messages.max": string;
    "form.messages.invalid": string;
    "form.submit": string;
    "form.phone.label": string;
    "support.form.intro": string;
    "form.messages.success": string;
    "support.title": string;
    "form.messages.error": string;
    "form.messages.min": string;
    "form.messages.serverError": string;
    "form.phone.placeholder": string;
    "form.name.placeholder": string;
}

export const getSupport = async () => {
    const {langCode, countryCode} = getClientLocaleContext();
    return fetcherClient(`/api/v1/translations/page/SUPPORT?language=${langCode}&country=${countryCode}`);
};
