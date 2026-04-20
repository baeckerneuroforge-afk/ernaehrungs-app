import { requireOnboardedUser } from "@/lib/auth-guard";

// Server Component guard — redirects to /sign-in if not authed or
// /onboarding if consents are incomplete. /home itself is a client component.
export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardedUser();
  return <>{children}</>;
}
