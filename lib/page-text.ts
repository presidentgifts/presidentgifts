/**
 * Page texts come from the admin panel (Page texts). Any key left empty there
 * falls back to the site's built-in translation, so a section is never blank.
 */
export function withFallbackTexts<T extends { [K in keyof T]: string }>(
    fromAdmin: Partial<Record<keyof T, unknown>> | null | undefined,
    fallback: T,
): T {
    const result = {...fromAdmin} as Record<string, unknown>;
    for (const [key, value] of Object.entries(fallback)) {
        const own = fromAdmin?.[key as keyof T];
        result[key] = typeof own === "string" && own.trim() ? own : value;
    }
    return result as T;
}
