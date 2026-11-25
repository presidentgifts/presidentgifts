import "../globals.css";
import "./admin.css";
import React from "react";
import {Metadata} from "next";
import localFont from "next/font/local";
import {Toaster} from "@/components/ui/sonner";
import {getAdminLanguage} from "@/server/admin-locale";

const manrope = localFont({
    src: "../fonts/manrope-variable.ttf",
    variable: "--font-manrope",
});

export const metadata: Metadata = {
    title: {default: "President Admin", template: "%s · President Admin"},
    robots: {index: false, follow: false},
    icons: {icon: "/favicon.svg"},
};

export const dynamic = "force-dynamic";

export default async function AdminRootLayout({children}: { children: React.ReactNode }) {
    const lang = await getAdminLanguage();

    return (
        <html lang={lang}>
        <body className={`${manrope.className} admin-root bg-neutral-50 text-neutral-900 antialiased`}>
        {children}
        <Toaster position="top-center"/>
        </body>
        </html>
    );
}
