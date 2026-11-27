"use client";

import {usePathname, useRouter} from "next/navigation";
import {useEffect, useState, useTransition} from "react";
import Cookies from "js-cookie";
import {isLocale} from "@/lib/i18n-config";
import {setLangCookie} from "@/lib/locale-context-client";
import {Check, Loader2} from "lucide-react";
import {LanguageType} from "@/interface/language&country-type/language-type";

interface Props {
    languages: LanguageType[];
}

export default function LocaleSwitcher({languages}: Props) {
    const pathName = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [activeLocale, setActiveLocale] = useState<string>("");

    const normalizedLanguages = languages.map((lang) => ({
        ...lang,
        code: lang.code.toLowerCase(),
    }));

    useEffect(() => {
        const cookieLocale = Cookies.get("lang")?.toLowerCase();
        if (isLocale(cookieLocale)) {
            setActiveLocale(cookieLocale);
        } else {
            const segments = pathName.split("/");
            const urlLocale = segments[1]?.toLowerCase();
            if (isLocale(urlLocale)) {
                setActiveLocale(urlLocale);
                setLangCookie(urlLocale);
            }
        }
    }, [pathName]);

    const redirectedPathName = (locale: string) => {
        const segments: string[] = pathName.split("/");
        segments[1] = locale;
        return segments.join("/");
    };

    const handleLocaleChange = (locale: string) => {
        const lower = locale.toLowerCase();
        if (!isLocale(lower) || lower === activeLocale) return;
        setLangCookie(lower);
        setActiveLocale(lower);
        // Client-side navigation instead of a full reload: the current page stays on screen
        // until the page in the new language is ready, and the scroll position is kept.
        startTransition(() => {
            router.push(redirectedPathName(lower) + window.location.search, {scroll: false});
        });
    };

    return (
        <ul className="flex flex-col w-full gap-7">
            {normalizedLanguages.map((lang) => (
                <li
                    key={lang.code}
                    onClick={() => handleLocaleChange(lang.code)}
                    className="text-primary px-4 md:px-0 md:w-[220px] text-base font-normal leading-normal flex items-center justify-between cursor-pointer hover:text-zinc-500 transition"
                >
                    {lang.name} ({lang.code})
                    <span>
                        {activeLocale === lang.code &&
                            (isPending ? <Loader2 size={18} className="animate-spin"/> : <Check size={18}/>)}
                    </span>
                </li>
            ))}
        </ul>
    );
}