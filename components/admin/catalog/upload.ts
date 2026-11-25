"use client";

import {registerMediaAction, requestUploadAction} from "@/app/admin/catalog-actions";
import type {ActionResult} from "@/server/admin-action";
import type {MediaView} from "@/server/services/catalog/common";

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
 * Uploads a file straight to storage (signed R2 URL, or the local dev endpoint)
 * and registers it in the media library.
 */
export async function uploadMedia(countryCode: string, file: File): Promise<ActionResult<MediaView>> {
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
        originalName: file.name.slice(0, 255),
    });
}
