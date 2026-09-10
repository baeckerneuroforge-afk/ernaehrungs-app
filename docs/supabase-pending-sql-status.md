# Nutriva Pending-SQL — Status 2026-09-10

Live-Schema war in dieser Session **nicht** pruefbar. Quelle fuer den Host:
`.env.local` und `supabase/audit_rls_storage.sql` → Projekt
`mdwavlbypkvkaxysoerc`.

## Was geprueft wurde

| Check | Ergebnis |
|---|---|
| DNS `mdwavlbypkvkaxysoerc.supabase.co` | NXDOMAIN (auch ueber 8.8.8.8) |
| Dashboard `/project/mdwavlbypkvkaxysoerc` | SPA laedt, redirect auf Sign-in |
| Supabase CLI (eingeloggter Account) | Projekt **nicht** in den Orgs; sichtbar nur `action-layer-staging` und ein Gmail-Projekt |
| Vercel MCP | anderer Account, kein Zugriff auf `ernaehrungs-app` Env |
| Session-Log 2026-02-11 | bestaetigt: dieser Ref war damals das aktive Nutriva-Projekt |

Ohne Login in genau diesem Projekt bleibt der Ist-Stand in der Datenbank unbelegt.

## Was der Code / das Juni-Audit sagen

Das ist **kein** Live-Beweis, nur die beste vorliegende Spur.

| Artefakt | Datei | Juni-Tracker / Repo | Live 2026-09-10 |
|---|---|---|---|
| Combined (usage, cron_state, grant-RPCs, Teil-RLS) | `supabase/migration_nutriva_pending_combined.sql` | lag uncommitted im Working Tree, nie als angewandt markiert | unbekannt, sehr wahrscheinlich **nicht** live |
| Credit-Split (`sub_deducted` / `topup_deducted`) | `supabase/migration_deduct_credits_split.sql` | neu in der Bugfix-Welle, 2026-09-10 erst committed | unbekannt, sehr wahrscheinlich **nicht** live |
| HNSW auf `ea_documents.embedding` | `supabase/migration_documents_hnsw_index.sql` | 11.06.2026: „Migration von dir auszufuehren“ | unbekannt, zuletzt **offen** |
| RLS-/Storage-Audit | `supabase/audit_rls_storage.sql` | 11.06.2026: „von dir in Nutriva auszufuehren“ | unbekannt, zuletzt **offen** |

Foto-Signed-URL-Migration (A3) stand im Juni-Tracker als angewandt. Das betrifft nicht die vier Punkte oben.

## Was du ausfuehren musst, sobald das Projekt wieder da ist

Reihenfolge im SQL-Editor:

1. `supabase/verify_pending_migrations.sql` (nur lesen) — zeigt, was fehlt
2. Falls Combined-Objekte fehlen: `supabase/migration_nutriva_pending_combined.sql`
3. Falls `deduct_credits_atomic` kein `sub_deducted` hat: `supabase/migration_deduct_credits_split.sql`
4. Falls kein HNSW-Index: `supabase/migration_documents_hnsw_index.sql`
5. `supabase/audit_rls_storage.sql` — RLS und `food-photos` privat?

Neues leeres Projekt: alle vier Schritte noetig, plus die aelteren Basis-Migrationen unter `supabase/`.

## Offen fuer den Goal-Abschluss

Ein Lauf von `verify_pending_migrations.sql` gegen das lebende Nutriva-Projekt
(nach Dashboard-Login oder neuer Project-URL).
