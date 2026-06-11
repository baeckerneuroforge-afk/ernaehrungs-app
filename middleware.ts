import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/blog(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth-callback(.*)",
  "/login(.*)",
  "/onboarding(.*)",
  "/impressum(.*)",
  "/datenschutz(.*)",
  "/tools/(.*)",
  "/api/webhooks/(.*)",
  // /api/auth/check must be public — it's polled by /auth-callback and the
  // onboarding session-gate specifically to detect the "cookie not yet
  // propagated" state. If this route runs through auth.protect() then Clerk's
  // handshake-redirect breaks the JSON contract and the poller spins forever.
  "/api/auth/check",
]);

// CSRF/Origin-Schutz: mutierende API-Requests (POST/PUT/PATCH/DELETE) sollen nur
// vom eigenen Origin kommen. Webhooks (signatur-verifiziert) und Cron (Bearer)
// sind ausgenommen, da sie legitim ohne Browser-Origin eintreffen.
function isStateChangingApiRequest(req: NextRequest): boolean {
  const method = req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/api/")) return false;
  if (path.startsWith("/api/webhooks/") || path.startsWith("/api/cron/")) return false;
  return true;
}

function blockedByOriginCheck(req: NextRequest): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) {
    // Nur eindeutige Cross-Site-Requests blocken (klassischer CSRF). same-origin,
    // same-site und none (direkte Navigation) bleiben erlaubt.
    return secFetchSite === "cross-site";
  }
  // Älterer Client ohne Sec-Fetch-Site: Origin gegen Host prüfen, falls
  // vorhanden. Fehlt der Origin (z.B. Server-Call), nicht blocken.
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.headers.get("host");
  } catch {
    return true;
  }
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // Clerk keys MUST be configured in Production. Skipping auth would leave
  // every protected API route wide open — treat as a server misconfiguration.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Server misconfigured", { status: 500 });
    }
    // Dev only: log loudly and skip so local tinkering still works.
    console.warn("[middleware] Clerk keys missing — auth disabled (dev only)");
    return NextResponse.next();
  }

  // CSRF/Origin-Schutz vor der Auth-Prüfung — Defense-in-Depth zusätzlich zu
  // SameSite-Cookies, für alle mutierenden Nicht-Webhook/Cron-API-Routen.
  if (isStateChangingApiRequest(request) && blockedByOriginCheck(request)) {
    return NextResponse.json(
      { error: "forbidden", message: "Cross-Origin-Request blockiert." },
      { status: 403 }
    );
  }

  return clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  })(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|js|json|webmanifest)$).*)",
  ],
};
