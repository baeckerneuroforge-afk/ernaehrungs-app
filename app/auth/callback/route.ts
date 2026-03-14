import { NextResponse } from "next/server";

// Clerk handles OAuth callbacks internally – this route is a legacy redirect
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/chat`);
}
