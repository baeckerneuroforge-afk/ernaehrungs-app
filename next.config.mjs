import { withSentryConfig } from "@sentry/nextjs";

// CSP temporarily removed due to pre-launch blocking issues. Re-enable post-launch with proper debugging.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },
  async headers() {
    return [
      {
        // SW braucht eigene Cache-/Scope-Header — und keine restriktive CSP.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Security-Header auf alle anderen Routes (außer sw.js).
        source: "/:path((?!sw\\.js$).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "hephaistos-systems",
  project: "ernaehrungsapp",
});
