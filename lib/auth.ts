import {signIn} from "next-auth/react";
import {getClientCountryCode} from "@/lib/locale-context-client";
import {getCountryConfig} from "@/lib/i18n-config";

export async function createUserAndSignIn({
    email,
    password,
    fullName,
}: {
    email: string;
    password: string;
    fullName: string;
}): Promise<{ success: boolean; error?: "register" | "login" | "network" }> {
    const countryCode = getClientCountryCode();

    try {
        const res = await fetch("/api/backend/clients/form/create", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            cache: "no-store",
            body: JSON.stringify({
                client_email: email,
                client_password: password,
                client_full_name: fullName,
                country: {
                    countryCode,
                    countryName: getCountryConfig(countryCode)?.name ?? countryCode,
                },
            }),
        });

        if (!res.ok) return {success: false, error: "register"};

        const loginRes = await signIn("credentials", {email, password, redirect: false});
        return loginRes?.ok ? {success: true} : {success: false, error: "login"};
    } catch (err) {
        console.error("Registration error:", err);
        return {success: false, error: "network"};
    }
}
