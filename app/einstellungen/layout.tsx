import { requireOnboardedUser } from "@/lib/auth-guard";

// Guard for /einstellungen and /einstellungen/import. The import sub-page is
// a client component so the check lives in the shared layout.
export default async function EinstellungenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardedUser();
  return <>{children}</>;
}
