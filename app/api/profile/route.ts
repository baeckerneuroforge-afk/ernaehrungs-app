import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  return new Response(JSON.stringify(data?.[0] || null), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json();
  const supabase = createSupabaseAdmin();

  // Strip meta flags out of the body so they don't land in ea_profiles
  // (which has no matching columns and would reject the upsert).
  const { agb_accepted, ...profileBody } = body as {
    agb_accepted?: boolean;
    [k: string]: unknown;
  };
  const agbAcceptedAt =
    agb_accepted === true ? new Date().toISOString() : null;

  // Self-heal ea_users: ensure a row exists for this Clerk user even if the
  // Clerk webhook never fired. Pull email/name/image from Clerk directly.
  try {
    const user = await currentUser();
    if (user) {
      const email =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ||
        user.emailAddresses[0]?.emailAddress ||
        "";
      const fullName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        (body?.name as string | undefined) ||
        null;

      // Zwei-Query-Pattern: credits_subscription nur beim INSERT setzen,
      // sonst würden bezahlende User auf 15 zurückgesetzt.
      const { data: existing, error: selectError } = await supabase
        .from("ea_users")
        .select("clerk_id")
        .eq("clerk_id", userId)
        .maybeSingle();

      if (selectError) {
        console.error("[profile POST] ea_users self-heal failed", {
          stage: "select",
          code: selectError.code,
          message: selectError.message,
          details: selectError.details,
        });
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from("ea_users")
          .update({
            email,
            name: fullName,
            image_url: user.imageUrl || null,
            updated_at: new Date().toISOString(),
            // Only stamp on first acceptance — don't overwrite an earlier
            // timestamp on subsequent profile edits.
            ...(agbAcceptedAt ? { agb_accepted_at: agbAcceptedAt } : {}),
          })
          .eq("clerk_id", userId);

        if (updateError) {
          console.error("[profile POST] ea_users self-heal failed", {
            stage: "update",
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
          });
        }
      } else {
        const { error: insertError } = await supabase.from("ea_users").insert({
          clerk_id: userId,
          email,
          name: fullName,
          image_url: user.imageUrl || null,
          subscription_plan: "free",
          credits_subscription: 15,
          credits_topup: 0,
          updated_at: new Date().toISOString(),
          agb_accepted_at: agbAcceptedAt,
        });

        if (insertError) {
          console.error("[profile POST] ea_users self-heal failed", {
            stage: "insert",
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
          });
        }
      }
    }
  } catch (e) {
    console.error("[profile POST] ea_users self-heal threw", e);
    // Non-fatal — profile save should still proceed
  }

  const profileData = {
    user_id: userId,
    ...profileBody,
  };

  const { error } = await supabase
    .from("ea_profiles")
    .upsert(profileData, { onConflict: "user_id" });

  if (error) {
    console.error("[profile POST] upsert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
