// No "server-only" marker: also used by scripts (e.g. scripts/migrate-legacy.ts). Never import from client code.
import {randomUUID} from "node:crypto";
import path from "node:path";
import {
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    createUploadUrl,
    deleteFile,
    isStorageConfigured,
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
    publicUrl,
    putObject,
} from "@/server/storage/r2";

/**
 * Where uploaded files go. R2 when it is configured; otherwise, in development
 * only, a local folder (public/dev-uploads) so the admin panel works without
 * cloud credentials.
 */
export type StorageMode = "r2" | "local";

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "dev-uploads");
const LOCAL_PUBLIC_PREFIX = "/dev-uploads";

export const EXTENSIONS: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
};

/** Keys always look like "media/UZ/<uuid>.<ext>". */
export const MEDIA_KEY_PATTERN = /^media\/[A-Z]{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif|svg|mp4|webm)$/;

export function getStorageMode(): StorageMode | null {
    if (isStorageConfigured()) return "r2";
    if (process.env.NODE_ENV !== "production") return "local";
    return null;
}

export function isAllowedType(contentType: string) {
    return [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(contentType as never);
}

export function maxSizeFor(contentType: string) {
    return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(contentType) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

/** Public URL of a stored file, for the admin panel and the site. */
export function mediaUrl(key: string): string {
    return getStorageMode() === "r2" ? publicUrl(key) : `${LOCAL_PUBLIC_PREFIX}/${key}`;
}

export interface PreparedUpload {
    key: string;
    /** The browser PUTs the file body here with the given Content-Type. */
    uploadUrl: string;
}

/** Reserves a key for a new file and returns where the browser should upload it. */
export async function prepareUpload(countryCode: string, contentType: string, size: number): Promise<PreparedUpload> {
    const mode = getStorageMode();
    if (!mode) throw new Error("Storage is not configured");
    if (!isAllowedType(contentType)) throw new Error("Unsupported file type");
    if (size <= 0 || size > maxSizeFor(contentType)) throw new Error("File is too large");

    if (mode === "r2") {
        const {key, uploadUrl} = await createUploadUrl(`media/${countryCode}`, contentType, size);
        return {key, uploadUrl};
    }
    const key = `media/${countryCode}/${randomUUID()}.${EXTENSIONS[contentType]}`;
    return {key, uploadUrl: `/api/admin/media/local/${key}`};
}

export function localPathFor(key: string) {
    if (!MEDIA_KEY_PATTERN.test(key)) throw new Error("Invalid key");
    return path.join(LOCAL_UPLOAD_DIR, ...key.split("/"));
}

/** Removes a stored file. Missing files are ignored. */
export async function removeStoredFile(key: string) {
    if (getStorageMode() === "r2") {
        await deleteFile(key);
        return;
    }
    const {rm} = await import("node:fs/promises");
    await rm(localPathFor(key), {force: true});
}

/** Whether the uploaded file really exists (checked before it is registered). */
export async function storedFileExists(key: string): Promise<boolean> {
    if (getStorageMode() === "r2") return true; // The signed URL only accepts the exact type and size we allowed.
    const {stat} = await import("node:fs/promises");
    try {
        return (await stat(localPathFor(key))).isFile();
    } catch {
        return false;
    }
}

/** Stores a file the server has in memory and returns its key. */
export async function storeFile(countryCode: string, contentType: string, body: Buffer): Promise<string> {
    const mode = getStorageMode();
    if (!mode) throw new Error("Storage is not configured");
    if (!isAllowedType(contentType)) throw new Error("Unsupported file type");
    if (body.length === 0 || body.length > maxSizeFor(contentType)) throw new Error("File is too large");

    const key = `media/${countryCode}/${randomUUID()}.${EXTENSIONS[contentType]}`;
    if (mode === "r2") {
        await putObject(key, body, contentType);
    } else {
        const {mkdir, writeFile} = await import("node:fs/promises");
        const file = localPathFor(key);
        await mkdir(path.dirname(file), {recursive: true});
        await writeFile(file, body);
    }
    return key;
}
