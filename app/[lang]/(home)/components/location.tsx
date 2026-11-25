"use client";

import dynamic from "next/dynamic";
import React, {useEffect, useState} from "react";
import {SectionTitle} from "@/components/ui/sectionTitle";
import IconComponent from "@/components/icon/icon-view";
// import {getAllLanguage} from "@/service/navbar-service/lang.service";
// import {getAllCountry} from "@/service/navbar-service/country.service";
import {getLocation} from "@/service/home-service/location.service";
import {branchesForCountry} from "@/constants/branches";
import {useBranches} from "@/hooks/use-branches";
import {getClientCountryCode} from "@/lib/locale-context-client";
import {Locale} from "@/lib/i18n-config";

const MapComponent = dynamic(
    () => import("@/components/shared/map-component/map-component"),
    {
        ssr: false,
    }
);


interface LocationProps {
    dictionary: {
        location: {
            title: string;
            text: string
        };
    }
    lang: Locale
}

interface LocationType {
    "location.text": string
    "location.title": string
}




export default function LocationPage({dictionary, lang}: LocationProps) {
    const [selectedPosition, setSelectedPosition] = useState<
        [number, number] | null
    >(null);
    const [location, setLocation] = useState<{ text: string; title: string }>({text: "", title: ""});
    const allBranches = useBranches();
    const [countryCode, setCountryCode] = useState("UZ");
    const branchList = branchesForCountry(countryCode, allBranches);

    const handleGoTo = (lat: number, lng: number) => {
        setSelectedPosition([lat, lng]);
    };

    useEffect(() => {
        const fetchLocation = async () => {
            const data: LocationType = await getLocation();
            setLocation({text: data["location.text"], title: data["location.title"]});
        };
        setCountryCode(getClientCountryCode());
        fetchLocation().catch(() => undefined);


    }, []);
    return (
        <div className="w-full h-auto flex flex-col gap-4 overflow-x-hidden container">
            <div className="w-full max-w-[1200px] m-auto ">
                <SectionTitle text={dictionary.location.title || location.title}/>
            </div>

            <div className="w-full max-w-[1200px] h-[400px] m-auto rounded-md overflow-hidden">
                <MapComponent lang={lang} selectedPosition={selectedPosition}/>
            </div>

            <div className="w-full max-w-[1200px] m-auto mt-3 flex flex-col gap-[20px]">
                <h3 className="text-primary text-xl font-medium  capitalize">
                    {dictionary.location.text || location.text}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[#5C5F6A] w-full max-w-5xl">
                    {branchList.map((branch, index) => (
                        <button
                            key={index}
                            onClick={() => handleGoTo(branch.lat, branch.lng)}
                            className="flex items-center font-inter text-[12px] px-2 transition cursor-pointer"
                        >
                            <IconComponent name="mapLocation"/>
                            {branch.name[lang]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}