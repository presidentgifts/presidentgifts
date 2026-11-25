// No "server-only" marker: also used by scripts (e.g. scripts/migrate-legacy.ts). Never import from client code.
import {randomUUID} from "node:crypto";
import {DeleteObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

/**
 * Image and file storage on Cloudflare R2 (S3 compatible). Files are uploaded
 * straight from the browser with a short-lived signed URL, so large images
 * never pass through our server functions.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"] as const;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
};

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not set`);
    return value;
}

let client: S3Client | undefined;

function getClient(): S3Client {
    client ??= new S3Client({
        region: "auto",
        endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
            secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
        },
    });
    return client;
}

export function isStorageConfigured(): boolean {
    return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"].every(
        (name) => Boolean(process.env[name]),
    );
}

/** Public URL of a stored file. */
export function publicUrl(key: string): string {
    return `${requireEnv("R2_PUBLIC_URL").replace(/\/$/, "")}/${key}`;
}

/**
 * Creates a signed URL the browser can PUT the file to.
 * @param folder logical folder, e.g. "products/UZ"
 */
export async function createUploadUrl(folder: string, contentType: string, size: number) {
    const isImage = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType);
    const isVideo = (ALLOWED_VIDEO_TYPES as readonly string[]).includes(contentType);
    if (!isImage && !isVideo) throw new Error("Unsupported file type");
    if (size > (isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) throw new Error("File is too large");

    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
    const key = `${safeFolder}/${randomUUID()}.${EXTENSIONS[contentType]}`;

    const uploadUrl = await getSignedUrl(
        getClient(),
        new PutObjectCommand({
            Bucket: requireEnv("R2_BUCKET"),
            Key: key,
            ContentType: contentType,
            ContentLength: size,
            CacheControl: "public, max-age=31536000, immutable",
        }),
        {expiresIn: 300},
    );

    return {key, uploadUrl, publicUrl: publicUrl(key)};
}

/** Uploads a file from the server (for files the server itself produces, e.g. processed images). */
export async function putObject(key: string, body: Buffer, contentType: string) {
    await getClient().send(
        new PutObjectCommand({
            Bucket: requireEnv("R2_BUCKET"),
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
        }),
    );
}

export async function deleteFile(key: string) {
    await getClient().send(new DeleteObjectCommand({Bucket: requireEnv("R2_BUCKET"), Key: key}));
}
