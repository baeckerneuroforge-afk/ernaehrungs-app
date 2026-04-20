import { requireOnboardedUser } from "@/lib/auth-guard";

// Guard for /ernaehrungsplan and /ernaehrungsplan/[id]. The page itself is
// a client component, so the onboarding check has to live in a layout.
export default async function ErnaehrungsplanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardedUser();
  return <>{children}</>;
}
