"use client";
import React, {useEffect, useRef, useState} from "react";
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
    const [open, setOpen] = useState<boolean>(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    return (
        <div className="bg-white p-5 md:hidden w-screen" ref={mobileMenuRef}>
            <div className="flex justify-between items-center">
                <FooterLogo/>
                <IconComponent onClick={() => setOpen(!open)} name={open ? "close" : "burger"}/>
            </div>

            {open && (
                <div className="mt-4 space-y-6">
                    <CustomTabs
                        identifier="min-w-[168px]"
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
            )}
        </div>
    );
};

export default MobileNavbar;
