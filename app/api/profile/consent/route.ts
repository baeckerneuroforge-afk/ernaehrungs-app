import { auth, currentUser } from "@clerk/nextjs/server";
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
    // Self-healing UPSERT: wenn der Clerk-Webhook den ea_users-Row nie erstellt
    // hat, muss der INSERT alle NOT-NULL Spalten (insbesondere email) mitgeben,
    // sonst schlägt er fehl. Email/Name holen wir direkt aus Clerk.
    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses?.find(
        (e) => e.id === clerkUser?.primaryEmailAddressId
      )?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress ||
      "";
    const fullName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      null;

    // Zwei-Query-Pattern: credits_subscription nur beim INSERT setzen,
    // sonst würden bezahlende User auf 15 zurückgesetzt.
    const { data: existing } = await supabase
      .from("ea_users")
      .select("clerk_id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const { error } = existing
      ? await supabase
          .from("ea_users")
          .update({
            email,
            name: fullName,
            image_url: clerkUser?.imageUrl || null,
            ki_consent: consent,
            updated_at: new Date().toISOString(),
          })
          .eq("clerk_id", userId)
      : await supabase.from("ea_users").insert({
          clerk_id: userId,
          email,
          name: fullName,
          image_url: clerkUser?.imageUrl || null,
          subscription_plan: "free",
          credits_subscription: 15,
          credits_topup: 0,
          ki_consent: consent,
          updated_at: new Date().toISOString(),
        });

    if (error) {
      console.error("ki_consent upsert error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        clerk_id: userId,
        has_email: !!email,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("ea_profiles")
    .update({ review_consent: consent })
    .eq("user_id", userId);

  if (error) {
    console.error("review_consent update error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      clerk_id: userId,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
