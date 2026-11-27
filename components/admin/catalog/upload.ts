"use client";

import {registerMediaAction, requestUploadAction} from "@/app/admin/catalog-actions";
import type {ActionResult} from "@/server/admin-action";
import type {MediaView} from "@/server/services/catalog/common";
import {compressForUpload, type CompressProgress} from "./compress";

export const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/avif,image/svg+xml";

function readImageSize(file: File): Promise<{ width: number | null; height: number | null }> {
    if (!file.type.startsWith("image/")) return Promise.resolve({width: null, height: null});
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            resolve({width: img.naturalWidth || null, height: img.naturalHeight || null});
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            resolve({width: null, height: null});
            URL.revokeObjectURL(url);
        };
        img.src = url;
    });
}

/**
 * Compresses the file in the browser (see compress.ts), uploads it straight to storage
 * (signed R2 URL, or the local dev endpoint) and registers it in the media library.
 */
export async function uploadMedia(
    countryCode: string,
    original: File,
    onCompressProgress?: CompressProgress,
): Promise<ActionResult<MediaView>> {
    const file = await compressForUpload(original, onCompressProgress);
    const prepared = await requestUploadAction(countryCode, {contentType: file.type, size: file.size});
    if (!prepared.ok) return prepared;

    const response = await fetch(prepared.data.uploadUrl, {
        method: "PUT",
        headers: {"Content-Type": file.type},
        body: file,
    });
    if (!response.ok) return {ok: false, error: "server"};

    const {width, height} = await readImageSize(file);
    return registerMediaAction(countryCode, {
        key: prepared.data.key,
        contentType: file.type,
        size: file.size,
        width,
        height,
        originalName: original.name.slice(0, 255),
    });
}
