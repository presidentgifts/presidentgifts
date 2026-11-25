type MessageType = "Contact Us" | "Booking" | "Support";

interface SendTelegramMessageOptions {
    type: MessageType;
    fields: Record<string, string | boolean>;
}

/** Sends a form submission to the team's Telegram chat (through the server). */
export const sendTelegramMessage = async ({type, fields}: SendTelegramMessageOptions): Promise<boolean> => {
    try {
        const response = await fetch("/api/telegram", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({type, fields}),
        });
        const res = await response.json().catch(() => ({ok: false}));
        return Boolean(res.ok);
    } catch (error) {
        console.error("Telegram error:", error);
        return false;
    }
};
