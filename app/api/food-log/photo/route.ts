import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Liefert ein Essensfoto aus dem privaten food-photos-Bucket aus, indem es eine
// KURZLEBIGE Signed-URL erzeugt und per 302 dorthin weiterleitet. Ersetzt die
// frueheren 1-Jahr-Signed-URLs (DSGVO/Leak-Risiko bei Gesundheitsfotos).
// Einbindung im Client: <img src="/api/food-log/photo?path=...">, der Browser
// folgt dem Redirect automatisch.
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 600; // 10 Minuten

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "missing_path" }, { status: 400 });
  }

  // Ownership + Traversal-Schutz: Der Pfad MUSS mit dem (sanitisierten)
  // User-Prefix beginnen, mit dem die Analyse-Route hochlaedt
  // (<safeUserId>/<datum>/<uuid>.jpg). So kann niemand fremde Fotos abrufen.
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!path.startsWith(`${safeUserId}/`) || path.includes("..")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("food-photos")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // 302 + no-store: nach Ablauf der TTL holt der Browser automatisch eine
  // frische URL, statt eine abgelaufene Redirect-Ziel-URL zu cachen.
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": "private, no-store",
    },
  });
}
