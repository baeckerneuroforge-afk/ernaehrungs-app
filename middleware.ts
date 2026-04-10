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
  "/impressum(.*)",
  "/datenschutz(.*)",
  "/tools/(.*)",
  "/api/webhooks/(.*)",
]);

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // If Clerk keys are not configured, skip auth entirely
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
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
