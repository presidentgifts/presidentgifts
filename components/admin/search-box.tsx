"use client";

import {useEffect, useState, useTransition} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {Loader2, Search} from "lucide-react";
import {Input} from "@/components/ui/input";

/** Search field that keeps its value in the `q` URL parameter (resets the page). */
export function SearchBox({placeholder, initial}: { placeholder: string; initial: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [value, setValue] = useState(initial);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        if (value === initial) return;
        const timer = setTimeout(() => {
            const next = new URLSearchParams(params.toString());
            if (value.trim()) next.set("q", value.trim());
            else next.delete("q");
            next.delete("page");
            startTransition(() => router.replace(`${pathname}?${next.toString()}`));
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
    }, [value]);

    return (
        <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"/>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="h-10 bg-white pl-9"/>
            {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-neutral-400"/>}
        </div>
    );
}
