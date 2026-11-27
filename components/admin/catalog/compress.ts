"use client";

/**
 * Shrinks images and videos in the browser before they are uploaded, so storage and
 * page weight stay small and large camera files fit the upload limits.
 * Whenever compression fails or doesn't help, the original file is used.
 */

const IMAGE_MAX_SIDE = 2560;
const IMAGE_QUALITY = 0.82;
/** Small images (logos, icons) are left as they are. */
const IMAGE_SKIP_BELOW = 300 * 1024;

const VIDEO_MAX_SIDE = 1920;
const VIDEO_BITRATE = 2_500_000;
const VIDEO_SKIP_BELOW = 4 * 1024 * 1024;

export type CompressProgress = (percent: number) => void;

function renamed(name: string, extension: string) {
    const base = name.replace(/\.[^.]+$/, "");
    return `${base}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<File> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file; // SVG, AVIF: keep
    try {
        const bitmap = await createImageBitmap(file, {imageOrientation: "from-image"});
        const longest = Math.max(bitmap.width, bitmap.height);
        if (file.size < IMAGE_SKIP_BELOW && longest <= IMAGE_MAX_SIDE) {
            bitmap.close();
            return file;
        }
        const scale = Math.min(1, IMAGE_MAX_SIDE / longest);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const blob = await canvasToBlob(canvas, "image/webp", IMAGE_QUALITY);
        if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
        return new File([blob], renamed(file.name, "webp"), {type: "image/webp"});
    } catch {
        return file;
    }
}

function pickVideoMime(): { recorder: string; base: "video/mp4" | "video/webm" } | null {
    if (typeof MediaRecorder === "undefined") return null;
    const candidates: [string, "video/mp4" | "video/webm"][] = [
        ["video/mp4;codecs=avc1.640028", "video/mp4"],
        ["video/mp4;codecs=avc1", "video/mp4"],
        ["video/mp4", "video/mp4"],
        ["video/webm;codecs=vp9", "video/webm"],
        ["video/webm;codecs=vp8", "video/webm"],
        ["video/webm", "video/webm"],
    ];
    const found = candidates.find(([mime]) => MediaRecorder.isTypeSupported(mime));
    return found ? {recorder: found[0], base: found[1]} : null;
}

/**
 * Re-encodes a video by playing it into a canvas and recording that at a lower bitrate.
 * Takes about as long as the video plays. The sound is dropped: site videos play muted.
 */
export async function compressVideo(file: File, onProgress?: CompressProgress): Promise<File> {
    if (!file.type.startsWith("video/") || file.size < VIDEO_SKIP_BELOW) return file;
    const mime = pickVideoMime();
    if (!mime) return file;

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    try {
        await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error("Cannot read the video"));
        });
        const duration = video.duration;
        if (!Number.isFinite(duration) || duration <= 0) return file;
        // Already lighter than what we would produce (e.g. an exported reel): re-encoding can't help.
        const currentBitrate = (file.size * 8) / duration;
        if (currentBitrate <= VIDEO_BITRATE * 1.2) return file;

        const scale = Math.min(1, VIDEO_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement("canvas");
        // Encoders want even dimensions.
        canvas.width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
        canvas.height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, {mimeType: mime.recorder, videoBitsPerSecond: VIDEO_BITRATE});
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
        };
        const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

        let running = true;
        const draw = () => {
            if (!running) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));
            if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(draw);
            else requestAnimationFrame(draw);
        };

        recorder.start(1000);
        await video.play();
        draw();
        await new Promise<void>((resolve, reject) => {
            video.onended = () => resolve();
            video.onerror = () => reject(new Error("Playback failed"));
        });
        running = false;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        recorder.stop();
        await stopped;
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunks, {type: mime.base});
        onProgress?.(100);
        if (blob.size === 0 || blob.size >= file.size) return file;
        return new File([blob], renamed(file.name, mime.base === "video/mp4" ? "mp4" : "webm"), {type: mime.base});
    } catch (error) {
        console.warn("[compress] video kept as is:", error);
        return file;
    } finally {
        video.pause();
        video.removeAttribute("src");
        URL.revokeObjectURL(url);
    }
}

export async function compressForUpload(file: File, onProgress?: CompressProgress): Promise<File> {
    if (file.type.startsWith("image/")) return compressImage(file);
    if (file.type.startsWith("video/")) return compressVideo(file, onProgress);
    return file;
}
