import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Delete all user-owned rows. CASCADE handles most child rows via ea_profiles,
  // but we explicitly clear every table to be safe (and because not all tables
  // necessarily cascade).
  const userOwnedTables = [
    "ea_food_log",
    "ea_weight_logs",
    "ea_messages",
    "ea_conversations",
    "ea_meal_plans",
    "ea_ziele",
    "ea_credit_transactions",
    "ea_feedback",
    "ea_profiles",
  ] as const;

  for (const table of userOwnedTables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      // Continue on error – we still want to delete the account record.
      console.error(`[user/delete] failed to clear ${table}:`, error.message);
    }
  }

  // Finally remove the ea_users record
  const { error: userErr } = await supabase
    .from("ea_users")
    .delete()
    .eq("clerk_id", userId);
  if (userErr) {
    console.error("[user/delete] failed to clear ea_users:", userErr.message);
  }

  // Delete the Clerk account itself
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch (err) {
    console.error("[user/delete] failed to delete Clerk user:", err);
    return NextResponse.json(
      { error: "Konto-Daten gelöscht, aber Clerk-Account konnte nicht entfernt werden. Bitte Support kontaktieren." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
