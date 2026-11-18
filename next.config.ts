import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow HMR/RSC requests when the app is opened via the LAN URL
  // printed by `next dev` (e.g. http://192.168.1.4:3000 from a phone).
  allowedDevOrigins: ["192.168.*.*", "*.local"],
  experimental: {
    serverActions: {
      // Admin setup uploads are compressed client-side; keep headroom for
      // multipart overhead and larger phone photos.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
