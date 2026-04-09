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

      await supabase.from("ea_users").upsert(
        {
          clerk_id: userId,
          email,
          name: fullName,
          image_url: user.imageUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_id" }
      );
    }
  } catch {
    // Non-fatal — profile save should still proceed
  }

  const profileData = {
    user_id: userId,
    ...body,
  };

  const { error } = await supabase
    .from("ea_profiles")
    .upsert(profileData, { onConflict: "user_id" });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
