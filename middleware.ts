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
