"use client";

import {ReactNode, useState, useTransition} from "react";
import {Globe2, LogOut, Menu} from "lucide-react";
import {Sheet, SheetContent, SheetTitle} from "@/components/ui/sheet";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {logoutAction, setActiveCountryAction} from "@/app/admin/actions";
import type {AdminDictionary, AdminLanguage} from "@/lib/admin-i18n";
import {AdminSidebar} from "./sidebar";
import {AdminLanguageSwitcher} from "./language-switcher";
import {NavItem} from "./nav-config";

export interface ShellUser {
    fullName: string;
    email: string;
    roleLabel: string;
}

interface AdminShellProps {
    children: ReactNode;
    texts: AdminDictionary;
    language: AdminLanguage;
    navItems: NavItem[];
    user: ShellUser;
    countries: { code: string; name: string }[];
    activeCountry: string | null;
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export function AdminShell({children, texts, language, navItems, user, countries, activeCountry}: AdminShellProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [switching, startTransition] = useTransition();

    return (
        <div className="min-h-screen">
            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-neutral-200 bg-white lg:block">
                <AdminSidebar items={navItems} texts={texts}/>
            </aside>

            {/* Mobile sidebar */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="left" className="w-72 p-0">
                    <SheetTitle className="sr-only">{texts.common.appName}</SheetTitle>
                    <AdminSidebar items={navItems} texts={texts} onNavigate={() => setMenuOpen(false)}/>
                </SheetContent>
            </Sheet>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur sm:px-6">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        aria-label={texts.topbar.openMenu}
                        className="-ml-1 rounded-md p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
                    >
                        <Menu className="size-5"/>
                    </button>

                    {countries.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Globe2 className="hidden size-4 text-neutral-400 sm:block"/>
                            <Select
                                value={activeCountry ?? undefined}
                                disabled={switching || countries.length === 1}
                                onValueChange={(code) => startTransition(() => setActiveCountryAction(code))}
                            >
                                <SelectTrigger aria-label={texts.topbar.country} className="h-9 min-w-44 bg-white">
                                    <SelectValue placeholder={texts.topbar.country}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {countries.map((country) => (
                                        <SelectItem key={country.code} value={country.code}>
                                            <span className="font-mono text-xs text-neutral-400">{country.code}</span>
                                            {country.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                        <AdminLanguageSwitcher current={language} label={texts.topbar.language}/>

                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-3 rounded-md py-1.5 pl-1.5 pr-2 hover:bg-neutral-100">
                                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                                    {initials(user.fullName)}
                                </span>
                                <span className="hidden text-left md:block">
                                    <span className="block text-sm font-medium leading-tight">{user.fullName}</span>
                                    <span className="block text-xs text-neutral-500 leading-tight">{user.roleLabel}</span>
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel className="font-normal">
                                    <p className="text-sm font-medium">{user.fullName}</p>
                                    <p className="truncate text-xs text-neutral-500">{user.email}</p>
                                    <p className="mt-1 text-xs text-neutral-500">{user.roleLabel}</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator/>
                                <form action={logoutAction}>
                                    <DropdownMenuItem asChild className="text-red-600 focus:text-red-700">
                                        <button type="submit" className="w-full">
                                            <LogOut className="size-4"/>
                                            {texts.common.logout}
                                        </button>
                                    </DropdownMenuItem>
                                </form>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
