import {NextRequest, NextResponse} from "next/server";
import {getLocaleContext} from "@/lib/locale-context";
import {isLocalDataSource} from "@/server/storefront/source";

const TYPES = ["Contact Us", "Booking", "Support"];
const MAX_FIELDS = 20;
const MAX_VALUE_LENGTH = 2000;

function formatLabel(key: string) {
    return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

const NAME_FIELDS = ["fullName", "username", "name"];

/** Keeps the request in the admin panel ("Inquiries") when the site runs on the new system. */
async function saveInquiry(type: string, entries: [string, unknown][], countryCode: string) {
    if (!isLocalDataSource()) return false;
    const value = (keys: string[]) => String(entries.find(([k]) => keys.includes(k))?.[1] ?? "").trim();
    const name = value(NAME_FIELDS);
    const phone = value(["phone"]);
    if (!name || !phone) return false;
    const message = entries
        .filter(([k, v]) => ![...NAME_FIELDS, "phone"].includes(k) && v !== "" && v !== false)
        .map(([k, v]) => `${formatLabel(k)}: ${typeof v === "boolean" ? "Yes" : String(v).slice(0, MAX_VALUE_LENGTH)}`)
        .join("\n");
    try {
        const {createSiteInquiry} = await import("@/server/services/sales/inquiries");
        await createSiteInquiry({countryCode, name: name.slice(0, 160), phone: phone.slice(0, 32), message, source: type});
        return true;
    } catch (error) {
        console.error("Saving inquiry failed:", error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    const token = process.env.TELEGRAM_BOT_TOKEN ?? process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID ?? process.env.NEXT_PUBLIC_TELEGRAM_CHAT_BOT;

    const body = await request.json().catch(() => null);
    const type = body?.type;
    const fields = body?.fields;

    if (!TYPES.includes(type) || !fields || typeof fields !== "object") {
        return NextResponse.json({ok: false, error: "Invalid request"}, {status: 400});
    }

    const entries = Object.entries(fields as Record<string, unknown>).slice(0, MAX_FIELDS);
    if (entries.some(([, v]) => !["string", "boolean", "number"].includes(typeof v))) {
        return NextResponse.json({ok: false, error: "Invalid fields"}, {status: 400});
    }

    const {countryName, countryCode, lang} = await getLocaleContext();
    const saved = await saveInquiry(type, entries, countryCode);
    if (!token || !chatId) return NextResponse.json({ok: saved}, {status: saved ? 200 : 500});

    const lines = entries.map(([key, value]) => {
        const text = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value).slice(0, MAX_VALUE_LENGTH);
        return `🔹 ${formatLabel(key)}: ${text}`;
    });
    lines.push(`🌍 Country: ${countryName}`, `🗣 Language: ${lang}`);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({chat_id: chatId, text: `📩 ${type} Request\n\n${lines.join("\n")}`}),
    });
    const data = await res.json().catch(() => ({ok: false}));

    // A saved request isn't lost even if Telegram is down.
    const delivered = Boolean(data.ok) || saved;
    return NextResponse.json({ok: delivered}, {status: delivered ? 200 : 502});
}
