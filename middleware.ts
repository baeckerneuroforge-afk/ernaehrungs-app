import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddleware } from "@/lib/supabase/middleware";

const publicRoutes = ["/", "/login", "/auth/callback", "/api/", "/blog"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const { supabase, supabaseResponse } = createSupabaseMiddleware(request);
    await supabase.auth.getUser();
    return supabaseResponse;
  }

  // Protected routes: check auth
  const { supabase, supabaseResponse } = createSupabaseMiddleware(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin routes: check role
  if (pathname.startsWith("/admin")) {
    const { data: roleData } = await supabase
      .from("ea_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1);

    if (roleData?.[0]?.role !== "admin") {
      return NextResponse.redirect(new URL("/chat", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
