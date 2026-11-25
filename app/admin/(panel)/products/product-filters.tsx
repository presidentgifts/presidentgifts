"use client";

import {useEffect, useState, useTransition} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {Loader2, Search} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import type {AdminDictionary} from "@/lib/admin-i18n";

export function ProductFilters({texts, q, category, categories}: {
    texts: AdminDictionary;
    q: string;
    category: string;
    categories: { id: number; name: string }[];
}) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [search, setSearch] = useState(q);
    const [pending, startTransition] = useTransition();

    const navigate = (patch: Record<string, string>) => {
        const next = new URLSearchParams(params.toString());
        for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        next.delete("page");
        startTransition(() => router.replace(`${pathname}?${next.toString()}`));
    };

    // Search as you type, with a short pause.
    useEffect(() => {
        if (search === q) return;
        const timer = setTimeout(() => navigate({q: search.trim()}), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate changes every render
    }, [search]);

    return (
        <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"/>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={texts.catalog.search} className="h-10 bg-white pl-9"/>
                {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-neutral-400"/>}
            </div>
            <Select value={category || "all"} onValueChange={(v) => navigate({category: v === "all" ? "" : v})}>
                <SelectTrigger className="h-10 w-full bg-white sm:w-64"><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{texts.catalog.all}</SelectItem>
                    <SelectItem value="none">{texts.productsPage.noCategory}</SelectItem>
                    {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
