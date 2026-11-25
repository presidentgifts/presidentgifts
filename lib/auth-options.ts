import type {NextAuthOptions} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import {getBackendAuthHeader, getBackendBaseUrl} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";
import {isLocalDataSource} from "@/server/storefront/source";

type ServerData = {
    id: string;
    full_name: string;
    email: string;
    country: {
        countryCode: string;
        countryName: string;
    };
    created_at?: string;
    updated_at?: string;
};

declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            serverData?: ServerData;
            authType?: "google" | "custom";
        };
    }

    interface User {
        serverData?: ServerData;
        authType?: "google" | "custom";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        serverData?: ServerData;
        authType?: "google" | "custom";
    }
}

/** Visitor's country, as stored in the cookie set by middleware. */
async function currentCountry() {
    const {countryCode, countryName} = await getLocaleContext();
    return {countryCode, countryName};
}

async function loginOrCreate(body: Record<string, unknown>): Promise<ServerData | null> {
    if (isLocalDataSource()) {
        const {loginOrCreateCustomer} = await import("@/server/services/sales/site-customers");
        return loginOrCreateCustomer({...body, country: await currentCountry()});
    }
    try {
        const response = await fetch(`${getBackendBaseUrl()}/api/v1/clients/google/login_or_create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: getBackendAuthHeader(),
            },
            cache: "no-store",
            body: JSON.stringify({...body, country: await currentCountry()}),
            signal: AbortSignal.timeout(10000),
        });
        return response.ok ? ((await response.json()) as ServerData) : null;
    } catch (error) {
        console.error("[auth] backend login failed:", error instanceof Error ? error.message : error);
        return null;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {label: "Email", type: "text"},
                password: {label: "Password", type: "password"},
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                try {
                    const serverData = await loginOrCreate({
                        client_email: credentials.email,
                        password: credentials.password,
                    });
                    if (!serverData) return null;
                    return {
                        id: serverData.id,
                        email: serverData.email,
                        name: serverData.full_name,
                        serverData,
                        authType: "custom",
                    };
                } catch (error) {
                    console.error("Authorize error:", error);
                    return null;
                }
            },
        }),
    ],

    callbacks: {
        async signIn({user, account}) {
            if (account?.provider !== "google") return true;
            if (!user.email || !user.name) return false;
            try {
                const serverData = await loginOrCreate({
                    client_email: user.email,
                    client_full_name: user.name,
                });
                if (!serverData) return false;
                user.serverData = serverData;
                user.authType = "google";
                return true;
            } catch {
                return false;
            }
        },

        async jwt({token, user}) {
            if (user?.serverData) token.serverData = user.serverData;
            if (user?.authType) token.authType = user.authType;
            return token;
        },

        async session({session, token}) {
            if (token.serverData) session.user.serverData = token.serverData;
            if (token.authType) session.user.authType = token.authType;
            return session;
        },
    },

    session: {
        strategy: "jwt",
    },

    pages: {
        signIn: "/auth/sign-in",
    },
};
