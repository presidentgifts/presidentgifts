'use client';

import React, {useEffect, useState} from "react";
import {Check} from "lucide-react";
import {usePathname, useRouter} from "next/navigation";
import LocaleSwitcher from "@/components/shared/locale-switcher/locale-switcher";
import IconComponent from "@/components/icon/icon-view";
import {CountryType, LanguageType} from "@/interface/language&country-type/language-type";
import {CurrencyType} from "@/interface/currency-type/currency-type";
import {isLocale, Locale} from "@/lib/i18n-config";
import {
    applyCountry,
    getClientCountryCode,
    getClientCurrency,
    setCurrencyCookie,
} from "@/lib/locale-context-client";

const translations: Record<"changeLanguage" | "selectLocation" | "changeCurrency", Record<Locale, string>> = {
    changeLanguage: {
        uz: "Tilni o'zgartirish",
        ru: "Изменить язык",
        en: "Change language",
        tj: "Иваз кардани забон",
        az: "Dili dəyiş",
    },
    selectLocation: {
        uz: "Boshqa davlatni tanlang",
        ru: "Выберите другую страну",
        en: "Select another country",
        tj: "Кишвари дигарро интихоб кунед",
        az: "Başqa ölkə seçin",
    },
    changeCurrency: {
        uz: "Valyutani o'zgartirish",
        ru: "Изменить валюту",
        en: "Change currency",
        tj: "Иваз кардани асъор",
        az: "Valyutanı dəyiş",
    },
};

type Section = "language" | "country" | "currency";

const ChangeLangModal = ({lang, languages, county, currency}: {
    lang: Locale,
    languages: LanguageType[],
    county: CountryType[],
    currency: CurrencyType[] | undefined
}) => {
    const [activeCountry, setActiveCountry] = useState<string | null>(null);
    const [activeCurrency, setActiveCurrency] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [openSection, setOpenSection] = useState<Section | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        setActiveCountry(getClientCountryCode());
        setActiveCurrency(getClientCurrency().code);

        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // The currency list is loaded asynchronously and may reset the cookie.
    useEffect(() => {
        setActiveCurrency(getClientCurrency().code);
    }, [currency]);

    /** Switches the site to another country: its language, currency and content. */
    const handleCountryChange = (name: string, code: string) => {
        if (code === activeCountry) return;
        const locale = applyCountry({name, code});
        setActiveCountry(code);

        const segments = pathname.split("/");
        if (locale && isLocale(segments[1])) segments[1] = locale;
        // Full reload: navbar data (languages, currencies, categories) depends on the country.
        window.location.href = segments.join("/") || "/";
    };

    const handleCurrencyChange = (name: string, code: string) => {
        setCurrencyCookie({name, code});
        setActiveCurrency(code);
        router.refresh();
    };

    const toggle = (section: Section) => setOpenSection(openSection === section ? null : section);
    const isOpen = (section: Section) => !isMobile || openSection === section;

    const header = (section: Section, text: string) => (
        <h2 onClick={() => toggle(section)} className={`mb-5 ${isMobile ? "flex items-center justify-between" : ""}`}>
            {text}
            {isMobile && <IconComponent name={openSection === section ? "chevronUp" : "chevronDown"}/>}
        </h2>
    );

    return (
        <div className="flex flex-col gap-14 h-full text-primary text-base font-medium leading-normal">
            <div>
                {header("language", translations.changeLanguage[lang])}
                {isOpen("language") && <LocaleSwitcher languages={languages}/>}
            </div>

            <div>
                {header("country", translations.selectLocation[lang])}
                {isOpen("country") && (
                    <ul className="flex flex-col w-full gap-7">
                        {county.map((element) => (
                            <li
                                key={element.id}
                                onClick={() => handleCountryChange(element.name, element.code)}
                                className="px-4 md:px-0 md:w-[220px] flex items-center justify-between cursor-pointer"
                            >
                                {element.name}
                                <span>{activeCountry === element.code && <Check/>}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                {header("currency", translations.changeCurrency[lang])}
                {isOpen("currency") && (
                    <ul className="flex flex-col w-full gap-7">
                        {currency?.map((element) => (
                            <li
                                key={element.code}
                                onClick={() => handleCurrencyChange(element.name, element.code)}
                                className="px-4 md:px-0 md:w-[220px] flex items-center justify-between cursor-pointer"
                            >
                                {element.name} ({element.code})
                                <span>{activeCurrency === element.code && <Check/>}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ChangeLangModal;
