"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { branchesForCountry } from "@/constants/branches";
import { useBranches } from "@/hooks/use-branches";
import { getClientCountryCode } from "@/lib/locale-context-client";
import { Locale } from "@/lib/i18n-config";

const addressLabel: Record<Locale, string> = {
  uz: "Manzil",
  ru: "Адрес",
  en: "Address",
  tj: "Суроға",
  az: "Ünvan",
};

const MapComponent = dynamic(
  () => import("@/components/shared/map-component/map-component"),
  {
    ssr: false,
  }
);

const DiscoverMap = ({ lang }: { lang: Locale }) => {
  const allBranches = useBranches();
    const [countryCode, setCountryCode] = useState("UZ");
    const branchList = branchesForCountry(countryCode, allBranches);

  useEffect(() => {
    setCountryCode(getClientCountryCode());
  }, []);

  const [selectedPosition, setSelectedPosition] = useState<
    [number, number] | null
  >(null);

  const handleGoTo = (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
  };
  return (
    <div>
      <div className="w-full max-w-[1200px] h-[544px] mt-[130px] rounded-md overflow-hidden">
        <MapComponent lang={lang} selectedPosition={selectedPosition} />
      </div>
      <div className="flex flex-col gap-5 mt-5">
        <p className="font-medium text-xl">{addressLabel[lang]}</p>
        <div className="flex items-center gap-1.5">
          <div className="w-full mt-3 flex flex-col gap-[20px]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[#5C5F6A] w-full max-w-[1000px]">
              {branchList.map((branch, index) => (
                <button
                  key={index}
                  onClick={() => handleGoTo(branch.lat, branch.lng)}
                  className="flex items-center font-inter text-[12px] px-2 transition cursor-pointer"
                >
                  {branch.name[lang]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoverMap;
