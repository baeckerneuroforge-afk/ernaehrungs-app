import { requireOnboardedUser } from "@/lib/auth-guard";

// Single guard for /tracker, /tracker/gewicht, /tracker/ziele,
// /tracker/wochencheck — blocks unauthed and partially-onboarded users.
export default async function TrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardedUser();
  return <>{children}</>;
}
