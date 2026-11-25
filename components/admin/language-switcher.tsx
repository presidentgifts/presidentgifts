"use client";

import {useTransition} from "react";
import {Check, Languages} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {ADMIN_LANGUAGES, AdminLanguage} from "@/lib/admin-i18n";
import {setAdminLanguageAction} from "@/app/admin/actions";

export function AdminLanguageSwitcher({current, label}: { current: AdminLanguage; label?: string }) {
    const [pending, startTransition] = useTransition();
    const currentLabel = ADMIN_LANGUAGES.find((l) => l.code === current)?.label;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={label}
                disabled={pending}
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            >
                <Languages className="size-4"/>
                <span className="hidden sm:inline">{currentLabel}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
                {ADMIN_LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onSelect={() => startTransition(() => setAdminLanguageAction(lang.code))}
                        className="justify-between"
                    >
                        {lang.label}
                        {lang.code === current && <Check className="size-4"/>}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
