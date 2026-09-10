import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "zmobadwgoqcwkryefciq.supabase.co";

const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self'`,
  `object-src 'none'`,
  // Next.js injecte des scripts inline (bootstrap, flight). 'unsafe-inline' requis
  // sans nonce sur les routes statiques ; 'unsafe-eval' pour le dev/HMR.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com data:`,
  `img-src 'self' data: blob: https://${supabaseHost}`,
  `media-src 'self' https://${supabaseHost}`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `upgrade-insecure-requests`,
].join("; ");

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
