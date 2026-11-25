import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {NextRequest, NextResponse} from "next/server";
import {getAdminContext} from "@/server/auth/session";
import {hasPermission} from "@/server/auth/access";
import {PERMISSIONS} from "@/server/auth/permissions";
import {getStorageMode, isAllowedType, localPathFor, maxSizeFor, MEDIA_KEY_PATTERN} from "@/server/storage/media-storage";

/**
 * Development-only stand-in for R2: receives the file body the browser would
 * otherwise PUT to a signed R2 URL and writes it to public/dev-uploads.
 */
export async function PUT(request: NextRequest, {params}: { params: Promise<{ key: string[] }> }) {
    if (getStorageMode() !== "local") return new NextResponse("Not found", {status: 404});

    const ctx = await getAdminContext();
    if (!ctx) return new NextResponse("Unauthorized", {status: 401});

    const key = (await params).key.join("/");
    if (!MEDIA_KEY_PATTERN.test(key)) return new NextResponse("Invalid key", {status: 400});

    const countryCode = key.split("/")[1];
    if (!hasPermission(ctx, PERMISSIONS.catalogEdit, countryCode) && !hasPermission(ctx, PERMISSIONS.contentEdit, countryCode)) {
        return new NextResponse("Forbidden", {status: 403});
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!isAllowedType(contentType)) return new NextResponse("Unsupported type", {status: 415});

    const body = Buffer.from(await request.arrayBuffer());
    if (body.length === 0 || body.length > maxSizeFor(contentType)) return new NextResponse("Too large", {status: 413});

    const file = localPathFor(key);
    await mkdir(path.dirname(file), {recursive: true});
    try {
        await writeFile(file, body, {flag: "wx"}); // never overwrite
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") return new NextResponse("Already exists", {status: 409});
        throw error;
    }
    return new NextResponse(null, {status: 200});
}
