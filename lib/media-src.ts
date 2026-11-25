/**
 * URL of an image or video from the backend. The old backend returns paths
 * relative to NEXT_PUBLIC_ADMIN_URL ("/uploads/x.png"); the new system returns
 * full URLs (R2) or "/dev-uploads/..." paths in development.
 */
export function mediaSrc(path: string | { src: string } | null | undefined): string {
    if (!path) return "";
    if (typeof path !== "string") return path.src; // a bundled (static) image
    if (/^https?:\/\//.test(path) || path.startsWith("/dev-uploads/")) return path;
    return `${process.env.NEXT_PUBLIC_ADMIN_URL ?? ""}${path}`;
}
