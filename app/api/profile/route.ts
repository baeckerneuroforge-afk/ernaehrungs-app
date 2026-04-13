import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";
import { validateBody, profileSchema } from "@/lib/validations";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdmin>;

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

  const rawBody = await request.json();
  const validation = validateBody(profileSchema, rawBody);
  if (!validation.success) {
    console.error("[profile POST] Validation failed:", validation.error, "Body:", JSON.stringify(rawBody));
    return new Response(
      JSON.stringify({ error: "invalid_input", message: validation.error, details: validation.error }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const body = validation.data;
  const supabase = createSupabaseAdmin();

  // Strip meta flags out of the body so they don't land in ea_profiles
  // (which has no matching columns and would reject the upsert).
  const { agb_accepted, ...profileBody } = body;
  const agbAcceptedAt =
    agb_accepted === true ? new Date().toISOString() : null;
  console.log("[profile POST]", {
    userId,
    agb_accepted,
    agbAcceptedAt,
    onboarding_done: profileBody.onboarding_done,
  });

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
        .select("clerk_id, agb_accepted_at")
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
        // Stamp agb_accepted_at when the request brings a fresh acceptance
        // AND the DB doesn't already have one (first-acceptance rule).
        // This guards against the case where another code path (e.g. the
        // consent endpoint or a Clerk webhook) created the row earlier
        // without a timestamp.
        const shouldStampAgb =
          !!agbAcceptedAt && !existing.agb_accepted_at;
        const { error: updateError } = await supabase
          .from("ea_users")
          .update({
            email,
            name: fullName,
            image_url: user.imageUrl || null,
            updated_at: new Date().toISOString(),
            ...(shouldStampAgb ? { agb_accepted_at: agbAcceptedAt } : {}),
          })
          .eq("clerk_id", userId);

        console.log("[profile POST] ea_users update", {
          userId,
          stamped_agb: shouldStampAgb,
          already_had_agb: !!existing.agb_accepted_at,
        });

        if (updateError) {
          console.error("[profile POST] ea_users self-heal failed", {
            stage: "update",
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
          });
        }
      } else {
        // Duplicate-account detection: if another ea_users row with the same
        // email exists under a different clerk_id, the user likely re-registered
        // via a different auth method. Merge the old account's data into the new
        // one before creating the ea_users row.
        //
        // Safety gate: only trust the email match if Clerk has verified it —
        // otherwise an attacker could claim another user's data by signing up
        // with an unverified mirror email.
        const primaryEmailObj = user.emailAddresses.find(
          (e) => e.id === user.primaryEmailAddressId,
        );
        const emailVerified =
          primaryEmailObj?.verification?.status === "verified";

        let duplicate: {
          clerk_id: string;
          subscription_plan: string | null;
          subscription_status: string | null;
          subscription_period_end: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          credits_subscription: number | null;
          credits_topup: number | null;
        } | null = null;

        if (email && emailVerified) {
          const { data: dup } = await supabase
            .from("ea_users")
            .select(
              "clerk_id, subscription_plan, subscription_status, subscription_period_end, stripe_customer_id, stripe_subscription_id, credits_subscription, credits_topup",
            )
            .eq("email", email)
            .neq("clerk_id", userId)
            .maybeSingle();

          if (dup) {
            console.warn("[profile POST] DUPLICATE EMAIL DETECTED", {
              newClerkId: userId,
              existingClerkId: dup.clerk_id,
              email,
            });
            duplicate = dup;
          }
        }

        // Preserve the old account's paid subscription + credits so a
        // re-registration doesn't silently downgrade a paying user.
        const insertPayload = {
          clerk_id: userId,
          email,
          name: fullName,
          image_url: user.imageUrl || null,
          subscription_plan: duplicate?.subscription_plan ?? "free",
          subscription_status: duplicate?.subscription_status ?? "none",
          subscription_period_end: duplicate?.subscription_period_end ?? null,
          stripe_customer_id: duplicate?.stripe_customer_id ?? null,
          stripe_subscription_id: duplicate?.stripe_subscription_id ?? null,
          credits_subscription: duplicate?.credits_subscription ?? 15,
          credits_topup: duplicate?.credits_topup ?? 0,
          updated_at: new Date().toISOString(),
          agb_accepted_at: agbAcceptedAt,
        };

        const { error: insertError } = await supabase
          .from("ea_users")
          .insert(insertPayload);

        if (insertError) {
          console.error("[profile POST] ea_users self-heal failed", {
            stage: "insert",
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
          });
        } else {
          console.log("[profile POST] ea_users insert ok", {
            userId,
            stamped_agb: !!agbAcceptedAt,
          });
        }
        if (!insertError && duplicate) {
          // Only migrate after the new ea_users row was created successfully.
          await mergeAccountData(supabase, duplicate.clerk_id, userId, email);
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

/**
 * Re-points all per-user data rows from `oldId` to `newId` when a duplicate
 * email was detected. Runs only after the new ea_users row was inserted.
 * Each table is updated independently — partial failures are logged but do
 * not abort the merge, so as much data as possible reaches the new account.
 */
async function mergeAccountData(
  supabase: SupabaseAdminClient,
  oldId: string,
  newId: string,
  email: string,
): Promise<void> {
  const userDataTables = [
    "ea_conversations",
    "ea_food_log",
    "ea_weight_logs",
    "ea_meal_plans",
    "ea_ziele",
    "ea_credit_transactions",
    "ea_feedback",
  ];

  for (const table of userDataTables) {
    const { error } = await supabase
      .from(table)
      .update({ user_id: newId })
      .eq("user_id", oldId);
    if (error) {
      console.error("[profile POST] merge table failed", {
        table,
        code: error.code,
        message: error.message,
      });
    }
  }

  // Admin role transfer — if the old account had one, move it to the new
  // clerk_id. Email was Clerk-verified before we reached this path.
  const { data: oldRole } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", oldId)
    .maybeSingle();

  if (oldRole) {
    await supabase
      .from("ea_user_roles")
      .upsert(
        { user_id: newId, role: oldRole.role },
        { onConflict: "user_id" },
      );
    await supabase.from("ea_user_roles").delete().eq("user_id", oldId);
  }

  // Move the old profile to the new clerk_id if the new user doesn't have
  // one yet. This happens before the POST handler's own ea_profiles upsert,
  // so the form input will overwrite the merged profile with the latest data.
  const { data: newProfile } = await supabase
    .from("ea_profiles")
    .select("user_id")
    .eq("user_id", newId)
    .maybeSingle();
  if (!newProfile) {
    await supabase
      .from("ea_profiles")
      .update({ user_id: newId })
      .eq("user_id", oldId);
  }

  // Free the old email so the unique scent doesn't trip future lookups and
  // clearly mark the row as merged.
  await supabase
    .from("ea_users")
    .update({ email: `${email}_merged_${oldId}` })
    .eq("clerk_id", oldId);

  await logAdminAction({
    adminId: "system",
    action: "account_merged",
    resourceType: "user",
    resourceId: newId,
    targetUserId: oldId,
    metadata: { email, reason: "duplicate_email" },
  });

  console.log("[profile POST] Account merged", { oldId, newId, email });
}
