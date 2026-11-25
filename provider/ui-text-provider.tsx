"use client";

import {createContext, ReactNode, useContext} from "react";
import type en from "@/locales/en.json";

export type UiTexts = (typeof en)["ui"];

const UiTextContext = createContext<UiTexts | null>(null);

/** Gives client components the interface texts of the current language. */
export function UiTextProvider({texts, children}: { texts: UiTexts; children: ReactNode }) {
    return <UiTextContext.Provider value={texts}>{children}</UiTextContext.Provider>;
}

export function useUiText(): UiTexts {
    const texts = useContext(UiTextContext);
    if (!texts) throw new Error("useUiText must be used inside UiTextProvider");
    return texts;
}

/** Replaces `{name}` placeholders: formatText("Items: {count}", {count: 3}). */
export function formatText(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
