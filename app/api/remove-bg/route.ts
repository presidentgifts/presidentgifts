import {NextRequest, NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth-options";
import {getBackendAuthHeader, getBackendBaseUrl} from "@/lib/fetcher";
import {getLocaleContext} from "@/lib/locale-context";
import {isLocalDataSource} from "@/server/storefront/source";

const MAX_SIZE = 3 * 1024 * 1024;

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userID = session?.user?.serverData?.id;
    if (!userID) {
        return NextResponse.json({error: "User not authenticated"}, {status: 401});
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({error: "No file uploaded"}, {status: 400});
    }
    if (file.size > MAX_SIZE) {
        return NextResponse.json({error: "File is too large"}, {status: 413});
    }

    const apiKey = process.env.REMOVE_BG_API_KEY ?? process.env.NEXT_PUBLIC_REMOVE_BG;
    if (!apiKey) return NextResponse.json({error: "Service unavailable"}, {status: 500});

    try {
        const removeBgFormData = new FormData();
        removeBgFormData.append("size", "auto");
        removeBgFormData.append("image_file", new Blob([await file.arrayBuffer()]), file.name);

        const removeResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {"X-Api-Key": apiKey},
            body: removeBgFormData,
        });

        if (!removeResponse.ok) {
            return NextResponse.json({error: await removeResponse.text()}, {status: removeResponse.status});
        }

        const resultBuffer = await removeResponse.arrayBuffer();

        if (isLocalDataSource()) {
            const {getActiveCustomer, saveCustomerLogo} = await import("@/server/services/sales/site-customers");
            const customer = await getActiveCustomer(userID);
            if (!customer) return NextResponse.json({error: "User not authenticated"}, {status: 401});
            const {countryCode} = await getLocaleContext();
            await saveCustomerLogo(customer.id, customer.countryCode ?? countryCode, Buffer.from(resultBuffer));
            return new NextResponse(Buffer.from(resultBuffer), {status: 200, headers: {"Content-Type": "image/png"}});
        }

        const uploadFormData = new FormData();
        uploadFormData.append("clientId", userID);
        uploadFormData.append("file", new File([resultBuffer], "no-bg.png", {type: "image/png"}));

        const uploadResponse = await fetch(`${getBackendBaseUrl()}/api/v1/b2b/upload`, {
            method: "POST",
            headers: {Authorization: getBackendAuthHeader(), accept: "*/*"},
            body: uploadFormData,
        });

        if (!uploadResponse.ok) {
            return NextResponse.json({error: await uploadResponse.text()}, {status: uploadResponse.status});
        }

        return new NextResponse(Buffer.from(resultBuffer), {
            status: 200,
            headers: {"Content-Type": "image/png"},
        });
    } catch (error) {
        console.error("RemoveBG or Upload error:", error);
        return NextResponse.json({error: "Internal Server Error"}, {status: 500});
    }
}
