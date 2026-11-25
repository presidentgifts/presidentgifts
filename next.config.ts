/** Images uploaded through the new admin panel are served from R2 (see .env.example). */
function r2ImagePatterns() {
    try {
        const url = new URL(process.env.R2_PUBLIC_URL ?? "");
        return [{protocol: url.protocol.replace(":", "") as "http" | "https", hostname: url.hostname}];
    } catch {
        return [];
    }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    // experimental: {
    //     appDir: true,
    // },
    // Lets a check build run next to a running dev server (which uses .next).
    distDir: process.env.NEXT_DIST_DIR || ".next",
    output: 'standalone',
    images: {
        domains: [
            "www.facebook.com",
            "mc.yandex.ru",
            "admin.presidentgift.com",
        ],
        remotePatterns: r2ImagePatterns(),
    },
};

module.exports = nextConfig;
