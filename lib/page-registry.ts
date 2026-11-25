/**
 * Pages of the site whose texts and images are edited in the admin panel, and
 * the keys the site reads from each one. Admins can add more keys; these are
 * listed even when empty so it is clear what the site expects.
 */
export interface RegistryEntry {
    key: string;
    type: "text" | "media";
    /** Long texts get a bigger input. */
    multiline?: boolean;
}

export interface RegistryPage {
    key: string;
    entries: RegistryEntry[];
}

const text = (key: string, multiline = false): RegistryEntry => ({key, type: "text", multiline});
const media = (key: string): RegistryEntry => ({key, type: "media"});

export const PAGE_REGISTRY: RegistryPage[] = [
    {
        key: "HOME",
        entries: [
            media("showcase.image"),
            text("showcase.title"),
            text("showcase.description", true),
            text("showcase.button"),
            text("category.title"),
            text("collections.title"),
            text("collections.newArrival"),
            text("news.title"),
            text("news.newArrival"),
            text("product.videos.title"),
        ],
    },
    {
        key: "ABOUT_US",
        entries: [
            text("about.title"),
            text("about.subtitle"),
            text("about.description", true),
            text("about.btn"),
            text("about.imageAlt"),
            media("about.image"),
        ],
    },
    {
        key: "FOOTER",
        entries: [
            text("footer.description", true),
            text("footer.company"),
            text("footer.support"),
            text("footer.new.products"),
            text("footer.social"),
            text("footer.payments"),
            text("footer.signup"),
            text("footer.copyright"),
        ],
    },
    {
        key: "LOCATION",
        entries: [text("location.title"), text("location.text", true)],
    },
    {
        key: "SUPPORT",
        entries: [
            text("support.title"),
            text("support.form.intro", true),
            text("form.name.label"),
            text("form.name.placeholder"),
            text("form.phone.label"),
            text("form.phone.placeholder"),
            text("form.submit"),
            text("form.messages.success"),
            text("form.messages.error"),
            text("form.messages.serverError"),
            text("form.messages.required"),
            text("form.messages.min"),
            text("form.messages.max"),
            text("form.messages.invalid"),
        ],
    },
    {key: "CORPORATE_GIFTS", entries: []},
    {key: "BusinesGifts_US", entries: []},
];

export const PAGE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,63}$/;
export const ENTRY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-]{0,127}$/;

export function registryPage(pageKey: string) {
    return PAGE_REGISTRY.find((p) => p.key === pageKey);
}
