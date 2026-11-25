import {NextRequest, NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth-options";
import {getBackendAuthHeader, getBackendBaseUrl} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";
import {isLocalDataSource} from "@/server/storefront/source";

/**
 * Proxy for browser requests to the backend. The backend is protected with
 * basic auth, so the browser must never call it directly. Only the endpoints
 * listed here can be reached; endpoints with personal data are checked against
 * the signed-in user.
 */

type Rule = {
    method: "GET" | "POST";
    path: RegExp;
    /** Query parameter that must equal the signed-in user's id. */
    ownerParam?: string;
    /** Body field that is overwritten with the signed-in user's id. */
    ownerBodyField?: string;
};

const RULES: Rule[] = [
    {method: "GET", path: /^\/category\/root_by_locale$/},
    {method: "GET", path: /^\/category\/product_page_by_category_id_and_locale$/},
    {method: "GET", path: /^\/translations\/page\/[A-Za-z_]+$/},
    {method: "GET", path: /^\/country\/all$/},
    {method: "GET", path: /^\/currency\/by_country$/},
    {method: "GET", path: /^\/language\/all_active_by_country$/},
    {method: "GET", path: /^\/product\/(by_locale|by_id_and_locale|page_by_locale_and_name)$/},
    {method: "GET", path: /^\/branches\/all$/},
    {method: "GET", path: /^\/orders\/by_customer_id$/, ownerParam: "customerId"},
    {method: "GET", path: /^\/b2b\/by_client_id$/, ownerParam: "clientId"},
    {method: "POST", path: /^\/orders\/create$/, ownerBodyField: "customerId"},
    {method: "POST", path: /^\/clients\/form\/create$/},
];

async function handle(request: NextRequest, params: Promise<{ path: string[] }>) {
    const {path} = await params;
    const backendPath = "/" + path.map(encodeURIComponent).join("/");
    const method = request.method as Rule["method"];

    const rule = RULES.find((r) => r.method === method && r.path.test(backendPath));
    if (!rule) return NextResponse.json({error: "Not found"}, {status: 404});

    const search = new URLSearchParams(request.nextUrl.searchParams);
    let body: string | undefined;

    if (rule.ownerParam || rule.ownerBodyField) {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.serverData?.id;

        if (rule.ownerParam) {
            if (!userId) return NextResponse.json({error: "Unauthorized"}, {status: 401});
            search.set(rule.ownerParam, userId);
        }

        if (rule.ownerBodyField) {
            const json = await request.json().catch(() => null);
            if (!json || typeof json !== "object") {
                return NextResponse.json({error: "Invalid body"}, {status: 400});
            }
            json[rule.ownerBodyField] = userId ?? null;
            body = JSON.stringify(json);
        }
    } else if (method === "POST") {
        body = await request.text();
    }

    const {lang, currencyCode, countryCode} = await getLocaleContext();

    if (isLocalDataSource()) {
        const session = rule.ownerParam || rule.ownerBodyField ? await getServerSession(authOptions) : null;
        const {handleLegacyRequest} = await import("@/server/storefront/legacy-api");
        let json: unknown;
        try {
            json = body ? JSON.parse(body) : undefined;
        } catch {
            return NextResponse.json({error: "Invalid body"}, {status: 400});
        }
        const result = await handleLegacyRequest({
            method,
            path: backendPath,
            query: search,
            body: json,
            customerId: session?.user?.serverData?.id ?? null,
            locale: request.headers.get("accept-language") ?? lang,
            currencyCode: request.headers.get("currencycode") ?? currencyCode,
            countryCode,
        });
        return NextResponse.json(result.body, {status: result.status});
    }

    const query = search.toString();

    let res: Response;
    try {
        res = await fetch(`${getBackendBaseUrl()}/api/v1${backendPath}${query ? `?${query}` : ""}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: getBackendAuthHeader(),
                "Accept-Language": request.headers.get("accept-language") ?? lang,
                currencyCode: request.headers.get("currencycode") ?? currencyCode,
            },
            body,
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
        });
    } catch (error) {
        console.error(`[backend proxy] ${method} ${backendPath} failed:`, error instanceof Error ? error.message : error);
        return NextResponse.json({error: "Backend unavailable"}, {status: 502});
    }

    return new NextResponse(await res.arrayBuffer(), {
        status: res.status,
        headers: {"Content-Type": res.headers.get("content-type") ?? "application/json"},
    });
}

export async function GET(request: NextRequest, {params}: { params: Promise<{ path: string[] }> }) {
    return handle(request, params);
}

export async function POST(request: NextRequest, {params}: { params: Promise<{ path: string[] }> }) {
    return handle(request, params);
}
