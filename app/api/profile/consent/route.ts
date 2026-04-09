import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const body = await request.json();
  const { consent, type } = body;

  if (typeof consent !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // type === "ki" → ea_users.ki_consent
  // type === "review" (or undefined for backwards compat) → ea_profiles.review_consent
  if (type === "ki") {
    // Upsert so the consent is recorded even if the Clerk webhook never created
    // the ea_users row (self-healing — prevents silent no-op UPDATEs).
    const { error } = await supabase
      .from("ea_users")
      .upsert(
        {
          clerk_id: userId,
          ki_consent: consent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("ea_profiles")
    .update({ review_consent: consent })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
