import {LangType} from "@/interface/lang/lang-type";
export function formatDate(dateString: string, lang: LangType) {
    const locales: Record<string, string> = {
        uz: "uz-UZ",
        ru: "ru-RU",
        en: "en-US",
        tj: "tg-TJ", 
        az: "az-AZ", 
    };

    return new Date(dateString).toLocaleString(locales[lang], {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
