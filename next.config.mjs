import { withSentryConfig } from "@sentry/nextjs";

// CSP runs in Report-Only first: it surfaces violations (browser console /
// report endpoint) WITHOUT breaking anything, so we can tune the allowlist
// before switching the header to the enforcing "Content-Security-Policy".
// Flip to enforcing by setting CSP_ENFORCE=true in the environment — same
// allowlist for both modes, no edit to this file needed.
const cspPolicy = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval' needed for now (inline theme/SW-boot scripts,
  // Clerk). Tighten with nonces before enforcing.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://img.clerk.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://eu.i.posthog.com https://eu-assets.i.posthog.com",
  "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Default: Report-Only. Set CSP_ENFORCE=true to emit the enforcing header.
const cspEnforce = process.env.CSP_ENFORCE === "true";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: cspEnforce
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only",
    value: cspPolicy,
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://eu-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
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
