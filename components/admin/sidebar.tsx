"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {
    BadgeDollarSign,
    Boxes,
    FileText,
    FolderTree,
    Globe2,
    History,
    Images,
    LayoutDashboard,
    Languages,
    LucideIcon,
    MessageSquare,
    MapPin,
    Clapperboard,
    Newspaper,
    Package,
    ShieldCheck,
    ShoppingBag,
    Type,
    Users,
    UsersRound,
} from "lucide-react";
import {cn} from "@/lib/utils";
import FooterLogoIcon from "@/components/icon/footerLogoIcon";
import type {AdminDictionary} from "@/lib/admin-i18n";
import {NAV_GROUPS, NavItem, NavItemKey} from "./nav-config";

const ICONS: Record<NavItemKey, LucideIcon> = {
    dashboard: LayoutDashboard,
    products: Package,
    categories: FolderTree,
    collections: Boxes,
    banners: Images,
    news: Newspaper,
    pages: FileText,
    uiTexts: Type,
    branches: MapPin,
    productVideos: Clapperboard,
    orders: ShoppingBag,
    customers: UsersRound,
    inquiries: MessageSquare,
    countries: Globe2,
    languages: Languages,
    currencies: BadgeDollarSign,
    staff: Users,
    roles: ShieldCheck,
    audit: History,
};

interface SidebarProps {
    items: NavItem[];
    texts: AdminDictionary;
    onNavigate?: () => void;
}

export function AdminSidebar({items, texts, onNavigate}: SidebarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-5">
                <Link href="/admin" onClick={onNavigate} className="[&_svg]:h-7 [&_svg]:w-auto">
                    <FooterLogoIcon/>
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
                {NAV_GROUPS.map((group) => {
                    const groupItems = items.filter((item) => item.group === group);
                    if (groupItems.length === 0) return null;

                    return (
                        <div key={group} className="mb-5">
                            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                                {texts.nav.groups[group]}
                            </p>
                            <ul className="space-y-0.5">
                                {groupItems.map((item) => {
                                    const Icon = ICONS[item.key];
                                    const label = texts.nav.items[item.key];
                                    const base = "flex items-center gap-3 rounded-md px-3 py-2 text-sm";

                                    if (!item.available) {
                                        return (
                                            <li key={item.key}>
                                                <span className={cn(base, "cursor-default text-neutral-400")} aria-disabled>
                                                    <Icon className="size-4 shrink-0"/>
                                                    <span className="flex-1 truncate">{label}</span>
                                                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                                                        {texts.common.soon}
                                                    </span>
                                                </span>
                                            </li>
                                        );
                                    }

                                    const active = isActive(item.href);
                                    return (
                                        <li key={item.key}>
                                            <Link
                                                href={item.href}
                                                onClick={onNavigate}
                                                aria-current={active ? "page" : undefined}
                                                className={cn(
                                                    base,
                                                    "font-medium transition-colors",
                                                    active
                                                        ? "bg-primary text-white"
                                                        : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
                                                )}
                                            >
                                                <Icon className="size-4 shrink-0"/>
                                                <span className="truncate">{label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
            </nav>
        </div>
    );
}
