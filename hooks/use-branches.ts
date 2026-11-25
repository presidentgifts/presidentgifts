"use client";

import {useEffect, useState} from "react";
import {Branch, branches as staticBranches} from "@/constants/branches";
import {fetcherClient} from "@/lib/fetcher-client";

let cache: Promise<Branch[] | null> | undefined;

/**
 * Branches managed in the admin panel. Until they load (or if the backend
 * doesn't provide them), the built-in list is used.
 */
export function useBranches(): Branch[] {
    const [list, setList] = useState<Branch[]>(staticBranches);

    useEffect(() => {
        cache ??= fetcherClient("/api/v1/branches/all").then(
            (data) => (Array.isArray(data) && data.length > 0 ? (data as Branch[]) : null),
            () => null,
        );
        let active = true;
        cache.then((data) => {
            if (active && data) setList(data);
        });
        return () => {
            active = false;
        };
    }, []);

    return list;
}
