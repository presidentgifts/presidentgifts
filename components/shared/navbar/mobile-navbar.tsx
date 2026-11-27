"use client";
import React, {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import CustomTabs from "../tabs/custom-tabs";
import {FooterLogo} from "@/components/ui/logo";
import IconComponent from "@/components/icon/icon-view";
import DiscoverModalContent from "../modalContents/discoverModal";
import ChangeLangModal from "../modalContents/changeLangModal";
import {CountryType, LanguageType} from "@/interface/language&country-type/language-type";
import ShopModalContent from "../modalContents/shopModal";
import {Category} from "@/interface/category-type/category-interface";
import {CurrencyType} from "@/interface/currency-type/currency-type";
import {navbarLinks} from "@/constants/navbar";
import {Locale} from "@/lib/i18n-config";

interface MobileNavbarProps {
    lang: Locale;
    languages: LanguageType[];
    county: CountryType[];
    currency: CurrencyType[] | undefined;
    category: Category[];
}

const [shopLink, discoverLink] = navbarLinks;

const MobileNavbar = ({lang, languages, county, currency, category}: MobileNavbarProps) => {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => setMounted(true), []);

    // Close when a link in the menu navigates somewhere.
    useEffect(() => setOpen(false), [pathname]);

    // While open: the page behind doesn't scroll, and Escape closes the menu.
    useEffect(() => {
        if (!open) return;
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const panel = (
        <div className={`fixed inset-0 z-[70] md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
            {/* Backdrop: darkens and blurs the page; a tap on it closes the menu. */}
            <div
                onClick={() => setOpen(false)}
                className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
            />
            <aside
                role="dialog"
                aria-modal="true"
                className={`absolute right-0 top-0 flex h-[100dvh] w-[88vw] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 p-5">
                    <FooterLogo/>
                    <IconComponent onClick={() => setOpen(false)} name="close"/>
                </div>
                {/* Only this part scrolls, however many sections are expanded. */}
                <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 pb-10">
                    <CustomTabs
                        identifier="min-w-[140px]"
                        tabs={[
                            {
                                value: "shops",
                                label: shopLink.name,
                                content: <ShopModalContent lang={lang} category={category}/>,
                            },
                            {
                                value: "discover",
                                label: discoverLink.name,
                                content: <DiscoverModalContent lang={lang}/>,
                            },
                        ]}
                        lang={lang}
                    />
                    <ChangeLangModal lang={lang} languages={languages} county={county} currency={currency}/>
                </div>
            </aside>
        </div>
    );

    return (
        <div className="bg-white p-5 md:hidden w-screen">
            <div className="flex justify-between items-center">
                <FooterLogo/>
                <IconComponent onClick={() => setOpen(true)} name="burger"/>
            </div>
            {mounted && createPortal(panel, document.body)}
        </div>
    );
};

export default MobileNavbar;
