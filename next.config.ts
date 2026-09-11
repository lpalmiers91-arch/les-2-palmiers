import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "zmobadwgoqcwkryefciq.supabase.co";

// SEC-03 : la Content-Security-Policy n'est PLUS définie ici (valeur figée,
// incompatible avec un nonce par requête). Elle est générée dans
// `src/proxy.ts` avec un nonce unique + 'strict-dynamic', sans 'unsafe-inline'
// ni 'unsafe-eval' en production (voir ce fichier pour le détail). Les
// en-têtes ci-dessous restent statiques : ils s'appliquent aussi aux assets
// exclus du proxy (fichiers avec extension, _next/static…).
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
        ],
      },
    ];
  },
};

export default nextConfig;
