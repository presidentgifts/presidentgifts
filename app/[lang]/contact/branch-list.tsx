"use client";

import {useEffect, useState} from "react";
import {branchesForCountry} from "@/constants/branches";
import {useBranches} from "@/hooks/use-branches";
import {getClientCountryCode} from "@/lib/locale-context-client";
import {Locale} from "@/lib/i18n-config";

/** All branches (the visitor's country first), the same list the branch map shows. */
export function BranchList({lang}: { lang: Locale }) {
    const allBranches = useBranches();
    const [countryCode, setCountryCode] = useState("UZ");

    useEffect(() => {
        setCountryCode(getClientCountryCode());
    }, []);

    return (
        <ul className="list-disc pl-5 text-primary text-sm leading-tight">
            {branchesForCountry(countryCode, allBranches).map((branch) => (
                <li key={`${branch.lat},${branch.lng}`}>{branch.name[lang]}</li>
            ))}
        </ul>
    );
}
