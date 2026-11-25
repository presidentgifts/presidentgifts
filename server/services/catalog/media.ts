import "server-only";

import {z} from "zod";
import {getDb, schema} from "@/server/db/client";
import {ActionError, parseInput} from "@/server/admin-action";
import type {AdminContext} from "@/server/auth/session";
import {
    getStorageMode,
    isAllowedType,
    maxSizeFor,
    MEDIA_KEY_PATTERN,
    mediaUrl,
    prepareUpload,
    storedFileExists,
} from "@/server/storage/media-storage";
import type {MediaView} from "./common";

const uploadRequest = z.object({
    contentType: z.string().max(64),
    size: z.number().int().positive(),
});

export async function requestUpload(countryCode: string, input: unknown) {
    const {contentType, size} = parseInput(uploadRequest, input);
    if (!getStorageMode()) throw new ActionError("storage");
    if (!isAllowedType(contentType) || size > maxSizeFor(contentType)) throw new ActionError("invalid", "file");
    return prepareUpload(countryCode, contentType, size);
}

const registerInput = z.object({
    key: z.string().regex(MEDIA_KEY_PATTERN),
    contentType: z.string().max(64),
    size: z.number().int().positive(),
    width: z.number().int().positive().max(20000).nullable(),
    height: z.number().int().positive().max(20000).nullable(),
    originalName: z.string().max(255).nullable(),
});

/** Records a file the browser has just uploaded. */
export async function registerMedia(ctx: AdminContext, countryCode: string, input: unknown): Promise<MediaView> {
    const data = parseInput(registerInput, input);
    if (!data.key.startsWith(`media/${countryCode}/`)) throw new ActionError("forbidden");
    if (!isAllowedType(data.contentType) || data.size > maxSizeFor(data.contentType)) throw new ActionError("invalid", "file");
    if (!(await storedFileExists(data.key))) throw new ActionError("notFound");

    const [row] = await getDb()
        .insert(schema.media)
        .values({...data, countryCode, createdById: ctx.user.id})
        .returning();
    return {id: row.id, url: mediaUrl(row.key), contentType: row.contentType, width: row.width, height: row.height};
}
