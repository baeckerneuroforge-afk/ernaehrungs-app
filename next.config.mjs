import { withSentryConfig } from "@sentry/nextjs";

// Content Security Policy — erlaubt nur die Drittanbieter, die wir tatsächlich nutzen.
// 'unsafe-inline' im script-src ist leider nötig für Next.js' inline runtime chunks
// und den theme-boot/sw-register snippet in app/layout.tsx.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://js.stripe.com https://*.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.supabase.co https://*.supabase.in https://api.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://*.upstash.io wss://*.supabase.co https://api.anthropic.com",
  "frame-src 'self' https://*.clerk.com https://js.stripe.com https://hooks.stripe.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
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
