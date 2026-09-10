# Nutriva-AI — Performance- & Security-Findings (Plan)

Stand: 2026-06-11. Solo-Analyse. Ursprünglich reiner Maßnahmenplan; wird seit
2026-06-11 schrittweise umgesetzt (Status-Tracker unten).
Ergänzt das bestehende `docs/security-dsgvo-rechts-audit.md` (2026-05-14) um eine
technische Performance-Sicht und um Befunde, die seither dazugekommen sind
(npm-Advisories, Bundle/Rendering, DB-Indizes, LLM-Kosten).

## Umsetzungs-Status (Tracker)

Workflow: pro Punkt eigener Git-Worktree + Branch → Build/Lint grün → Commit →
Gate (Smoke-Test bei Auth/Payment, sonst direkt) → Merge `--no-ff` nach `main`.

| Punkt | Status | Commit(s) |
|---|---|---|
| **A1** Clerk-Auth-Bypass + Dep-Advisories | ✅ gemergt (main) | `f5f669e` → merge `d23ece5` |
| **A2** Rate-Limit fail-closed (In-Memory-Fallback) | ✅ gemergt (main) | `d75f1fc` → merge `dc30eba` |
| **A3** Foto-Signed-URLs kurzlebig | ✅ gemergt (main) | `864cb6a` → merge `ff1b87d` (Migration angewandt) |
| **A4** Plan-Speichern gaten + JSON-Limit | ✅ gemergt (main) | `191a5dd` → merge |
| **A5** Bildvalidator (Magic Bytes) Chat | ✅ gemergt (main) | `420b2e8` → merge |
| **A6** CSRF/Origin-Schutz | ✅ gemergt (main) | `6561d78` → merge |
| **A8** Log-Scrubbing/Pseudonymisierung | ✅ gemergt (main) | `9882fc6` → merge |
| **A10** Admin-Doc-Upload-Limit | ✅ gemergt (main) | `5872235` → merge |
| **A7** RLS-/Storage-Audit-Skript | ✅ geliefert (`supabase/audit_rls_storage.sql`) | `40e026e` — von dir in Nutriva auszuführen |
| A9 CSP enforce + Nonces | ⏳ offen | — |
| Next.js 15/16 Major-Upgrade (Rest A1) | ⏳ offen (eigenes Projekt) | — |
| **P1** Anthropic Prompt-Caching | ✅ gemergt (main) | `0c20d78` → merge |
| **P3** HNSW-Vektor-Index | ✅ gemergt (`migration_documents_hnsw_index.sql`) | `6a23c86` — Migration von dir auszuführen |
| P4 force-dynamic vom Root-Layout | ⏳ offen | — |
| **P7** Fonts via next/font | ✅ gemergt (main) | `85a8309` → merge |
| **P8** images.remotePatterns | ✅ gemergt (main) | `5ba713e` → merge |
| **P12** recharts lazy-load | ✅ gemergt (main) | `4eb82ae` (gewicht 400→288 KB; reports/usage offen) |
| **P9** Rollen-/Plan-Lookups memoisieren | ✅ gemergt (main) | `51ec965` → merge |
| **P10** /api/credits-Fan-out dedup | ✅ gemergt (main) | `30d35b5` → merge |
| **P14** touchLastActive drosseln | ✅ gemergt (main) | `bb1a452` → merge |
| übrige Punkte (A9, P2, P4, P5, P6, P11, P13, P15, Next) | ⏳ offen | — |

Jeder Befund: **Schweregrad/Impact**, **Quelle (Datei:Zeile)**, **Maßnahme**, **Aufwand**.

---

## Executive Summary

Die Plattform ist architektonisch sauber: Clerk-Auth serverseitig, Zod-Validierung
auf den meisten Routen, atomare Credit-RPCs mit Fallback, Webhook-Signaturprüfung,
Refund-Logik bei LLM-Fehlern, gute Bild-Magic-Byte-Prüfung in der Foto-Analyse.

Die drei größten Hebel:

1. **Sicherheit:** Veraltete Abhängigkeiten mit **kritischen** Advisories — allen voran
   ein Clerk-Advisory *„Middleware-based route protection bypass"*. Die gesamte
   Routenabsicherung hängt an `clerkMiddleware` → das ist potenziell der gefährlichste
   Einzelpunkt und mit `npm audit fix` lösbar.
2. **Performance/Kosten:** Kein Anthropic **Prompt-Caching** trotz ~10 KB statischem
   System-Prompt pro Chat-Request, dazu pro Chat bis zu **3 sequentielle** OpenAI-
   Embedding-Calls und **fehlender Vektor-Index** auf `ea_documents`. Zusammen die
   größten Latenz- und Kostentreiber.
3. **Frontend:** `force-dynamic` auf dem Root-Layout + eine **2 244-Zeilen Client-
   Landingpage** + ~11 MB Hero-Videos + Google-Fonts per CSS-`@import` ruinieren
   First-Load/LCP der öffentlichen Seiten ohne funktionalen Grund.

Positiv und bereits erledigt: Der im Mai-Audit als „Hoch" markierte Befund **S1
(unvalidierter Ziel-PATCH)** ist gefixt — `app/api/tracker/ziele/[id]/route.ts:24`
nutzt jetzt `zieleUpdateSchema`.

---

# TEIL A — Security-Findings

## A1 — Kritische npm-Advisories (Clerk Route-Bypass, Next.js) — **KRITISCH**

- **Quelle:** `npm audit --omit=dev` → 16 Vulnerabilities (2 kritisch, 7 hoch).
  - `@clerk/nextjs` **critical**: *Middleware-based route protection bypass*
    (GHSA-vqx2-fgx2-5wq9) + *authorization bypass when combining organization/
    billing/reverification* (GHSA-w24r-5266-9c3c).
  - `next@14.2.35` **high**: 14 Advisories — u.a. Middleware/Proxy-Bypass,
    Cache-Poisoning, SSRF über WebSocket-Upgrades, mehrere DoS (Server Components,
    Image-Optimizer), CSP-Nonce-XSS.
  - Weitere: `protobufjs` (Prototype-Injection/DoS), `@xmldom/xmldom`, `js-cookie`,
    `fast-uri` (Path-Traversal), `ws`, `uuid`/`svix`/`resend`-Kette.
- **Warum kritisch:** Die komplette Autorisierung der App basiert auf
  `clerkMiddleware` + `auth.protect()` (`middleware.ts:36-40`). Ein Middleware-
  Bypass in Clerk trifft damit *jede* geschützte Route gleichzeitig.
- **Maßnahme:**
  1. `npm audit fix` (Clerk/protobufjs/uuid/js-cookie/fast-uri/ws sind ohne
     Breaking Change fixbar).
  2. Next.js 14.2.35 → aktuellste **14.2.x** Patch-Linie heben (innerhalb von 14,
     kein 16er-Sprung nötig; `next@16` wäre Breaking).
  3. CI-Gate: `npm audit --omit=dev --audit-level=high` im Build, damit neue
     kritische Advisories den Deploy blocken.
- **Aufwand:** Niedrig (Stunden). **Höchste Priorität.**

## A2 — Rate-Limiting fällt in Produktion offen aus — **HOCH**

- **Quelle:** `lib/rate-limit.ts:7-12, 122-140, 141-157`.
- **Finding:** Ohne Upstash-Env (oder bei Redis-Ausfall) gibt `checkRateLimit`
  immer `{ success: true }` zurück. Es wird zwar via Sentry/`console.error`
  gewarnt, aber alle KI-/Stripe-/Support-Limits sind dann faktisch aus → Kosten-
  und Abuse-Risiko (Claude Vision/Opus sind teuer).
- **Maßnahme:** In `NODE_ENV=production` **fail-closed** wenn Upstash gar nicht
  konfiguriert ist (Startup-Check, der den Boot verweigert statt still zu
  deaktivieren). Bei *transientem* Redis-Ausfall optional ein konservativer
  In-Memory-Fallback pro Instanz statt komplett offen.
- **Aufwand:** Niedrig.

## A3 — Foto-Signed-URLs 1 Jahr gültig — **HOCH** (aus Mai-Audit S2, **nicht** behoben)

- **Quelle:** `app/api/food-log/analyze/route.ts:443` (`createSignedUrl(path, 60*60*24*365)`),
  gespeichert via `photo_url` (`lib/validations.ts:86-97`).
- **Finding:** Essensfotos (Gesundheits-/Lebensstildaten, Art. 9 DSGVO) sind bei
  Link-Leak ein Jahr lang abrufbar. Die URL wird zusätzlich in der DB persistiert.
- **Maßnahme:** Nur `photo_path` speichern (Feld existiert bereits im Response,
  Zeile 460), Signed URLs **on-demand** kurzlebig (5–15 min) über einen
  Auth+Ownership-geschützten Endpoint erzeugen; Alt-Daten migrieren.
- **Aufwand:** Mittel.

## A4 — Plan-Speichern ohne Feature-Gate/Rate-Limit + unbeschränktes JSON — **MITTEL-HOCH**

- **Quelle:** `app/api/ernaehrungsplan/route.ts:34-77`. Schema
  `planData: z.record(z.string(), z.unknown())` (Zeile 6-9).
- **Finding:** Generierung ist serverseitig gegated (`generieren/route.ts`), das
  **Speichern** beliebiger `planData` aber nicht: kein `hasFeatureAccess`, kein
  Rate-Limit, keine Größenbegrenzung. Ein Free-User kann beliebig große,
  beliebig viele JSON-Blobs in `ea_meal_plans` ablegen (Storage-/Cost-Abuse,
  und Free-Nutzung eines Premium-Artefakts).
- **Maßnahme:** `getUserPlan` + `hasFeatureAccess(plan, "plan")` analog zur
  Generierung; Rate-Limit (`planLimiter` existiert bereits); `planData` strikt
  typisieren statt `z.unknown()` + Größen-/Tiefenlimit.
- **Aufwand:** Niedrig-Mittel.

## A5 — Chat-Bild ohne Magic-Byte-Prüfung — **MITTEL** (Mai-Audit S5, offen)

- **Quelle:** `lib/validations.ts:40-46` (nur `base64`-String ≤15 MB + `mediaType`-
  Enum), Verwendung `app/api/chat/route.ts:919-934`. Gegenbeispiel (vorbildlich):
  `app/api/food-log/analyze/route.ts:259-284`.
- **Finding:** Der Chat-Bildpfad prüft nicht, ob die Bytes wirklich JPEG/PNG/WebP
  sind, und hält bis zu ~11 MB base64 pro Request im Speicher. Inkonsistent zur
  Foto-Analyse, die Magic Bytes prüft.
- **Maßnahme:** Gemeinsamen Bildvalidator (`lib/image-validate.ts`) extrahieren:
  base64 dekodieren, Größe **nach** Decode begrenzen, Magic Bytes prüfen — von
  Chat und Foto-Analyse gemeinsam nutzen.
- **Aufwand:** Niedrig.

## A6 — Kein CSRF-/Origin-Schutz auf mutierenden Routen — **MITTEL** (Mai-Audit S6, offen)

- **Quelle:** u.a. `app/api/user/delete/route.ts:8`, `app/api/billing/cancel/route.ts`,
  `app/api/stripe/checkout/route.ts:11`, `app/api/stripe/topup/route.ts`.
- **Finding:** Schutz beruht allein auf Clerk-Cookieverhalten. Kein expliziter
  `Origin`/`Sec-Fetch-Site`-Check, kein CSRF-Token — besonders heikel bei
  Kontolöschung, Kündigung, Checkout/Top-up.
- **Maßnahme:** Zentraler Helper (oder Middleware-Erweiterung), der bei allen
  mutierenden Nicht-Webhook-Routen Same-Origin via `Origin`/`Sec-Fetch-Site`
  erzwingt; für destruktive Aktionen zusätzlich Bestätigungs-Token.
- **Aufwand:** Mittel.

## A7 — RLS-Wirksamkeit faktisch fraglich (Schema-Drift Clerk↔Supabase) — **HOCH zu verifizieren**

- **Quelle:** `lib/supabase/server.ts:10-15` (Service-Role überall),
  `supabase/migration.sql:74-92` (`ea_conversations.user_id uuid REFERENCES
  auth.users` + Policy `auth.uid() = user_id`), vs. `supabase/migration_rls_reactivate.sql`
  (nutzt `clerk_user_id()` aus JWT-`sub`).
- **Finding:** Zwei Probleme überlagern sich:
  1. Die App nutzt durchgängig den **Service-Role-Key**, der RLS **komplett
     bypassed**. RLS ist damit reine Defense-in-Depth — *wenn* sie greift.
  2. Die ursprünglichen Policies vergleichen `auth.uid()` (Supabase-UUID) mit
     `user_id`, das aber Clerk-Text-IDs (`user_…`) enthält. Diese Policies können
     **nie** matchen. Die Reaktivierungs-Migration repariert das über JWT-`sub` —
     aber nur, wenn (a) sie in Prod angewandt ist und (b) jemals ein Clerk-JWT an
     Supabase durchgereicht würde (passiert bei Service-Role nicht).
- **Maßnahme:** Produktions-Schema auditieren (RLS aktiv? welche Policy-Variante?),
  Storage-Policies für `food-photos` prüfen, `ea_documents`-Policy
  *„Anyone can read USING (true)"* (`migration.sql:58-60`) bewerten (bei
  Anon-Key-Nutzung wäre die komplette Wissensbasis öffentlich lesbar). SQL-Audit-
  Skript in CI.
- **Aufwand:** Mittel (DB-Audit).

## A8 — Klartext-Logging von userId/Query/Gesundheitskontext — **MITTEL-HOCH** (Mai-Audit S8, offen)

- **Quelle:** `app/api/chat/route.ts:772-781` (loggt `userId`, `query.slice(0,80)`,
  `healthKeyword`), `food-log/analyze/route.ts:124-128, 447`, diverse
  `console.error(..., userId)`.
- **Finding:** Der Sentry-Scrubber (`lib/sentry-scrub.ts`) ist gut, greift aber
  **nur für Sentry**. `console.*` landet ungefiltert in den Vercel-Logs —
  inkl. Clerk-ID + Suchbegriff + erkanntem Gesundheits-Keyword (Art. 9).
- **Maßnahme:** Pseudonyme Request-ID statt Clerk-ID in Logs; keine Query-/
  Keyword-Ausschnitte in Prod (hinter `NODE_ENV`-Guard oder Debug-Flag);
  Log-Retention dokumentieren.
- **Aufwand:** Niedrig-Mittel.

## A9 — CSP standardmäßig nur Report-Only + `unsafe-inline`/`unsafe-eval` — **MITTEL**

- **Quelle:** `next.config.mjs:8-37`.
- **Finding:** CSP läuft per Default als `Content-Security-Policy-Report-Only`
  (Enforce nur via `CSP_ENFORCE=true`). Selbst beim Enforcen erlaubt `script-src`
  `'unsafe-inline'` **und** `'unsafe-eval'` → XSS-Schutz weitgehend wirkungslos.
- **Maßnahme:** Nonce-basierte Script-CSP (Inline-Theme-/SW-Boot-Skripte aus
  `app/layout.tsx:62-93` über Nonce statt `unsafe-inline`), `unsafe-eval`
  entfernen (prüfen, ob Clerk es real braucht), dann auf Enforce schalten.
- **Aufwand:** Mittel.

## A10 — Admin-Dokumentenupload: kein Seiten-/Chunk-Limit — **NIEDRIG-MITTEL** (Mai-Audit S9)

- **Quelle:** `app/api/documents/route.ts:51-136`. Größenlimit (10 MB) ist da
  (Zeile 17, 63), aber kein Seiten-/Chunkanzahl-Limit und kein Rate-Limit.
- **Finding:** Admin-only, daher niedrig. Eine riesige (aber <10 MB) PDF kann
  hunderte Embeddings = Kosten-Spike erzeugen; sequentielle Schleife (s. P9).
- **Maßnahme:** Chunk-Obergrenze + Warnhinweis „keine personenbezogenen Daten".
- **Aufwand:** Niedrig.

---

# TEIL B — Performance-Findings

## P1 — Kein Anthropic Prompt-Caching — **HOCH (Kosten + Latenz)**

- **Quelle:** `app/api/chat/route.ts:961-966` und `:1428-1435`,
  `food-log/analyze/route.ts:345-364`, `cron/weekly-coaching/route.ts:107-130`.
  `lib/usage-logging.ts:41-43` trackt `cacheReadTokens`/`cacheWriteTokens` — gesetzt
  wird `cache_control` aber **nirgends**.
- **Finding:** Der Chat-`SYSTEM_PROMPT` ist ~10 KB statischer Text und wird bei
  **jedem** Request voll als Input-Token abgerechnet. Review-Prompt ist noch
  größer. Mit Anthropic `cache_control: {type:"ephemeral"}` auf dem statischen
  Prompt-Präfix sinken die Input-Kosten dieses Präfixes um ~90 % bei Cache-Hit
  (5-Min-TTL) — bei aktiven Nutzern ein großer Hebel.
- **Maßnahme:** Statisches Prompt-Präfix als eigener System-Block mit
  `cache_control` markieren; dynamische Teile (Profil, RAG, Verlauf) danach.
  Gilt für Chat, Review, Foto-Analyse, Weekly-Coaching.
- **Aufwand:** Niedrig. **Bestes Kosten/Nutzen-Verhältnis.**

## P2 — RAG: bis zu 3 sequentielle Embedding-Calls pro Chat — **HOCH (Latenz)**

- **Quelle:** `app/api/chat/route.ts:682-767` (`runRagSearch` initial → ggf.
  `enrichedQuery` → ggf. `combinedQuery`, jeweils awaited nacheinander).
- **Finding:** Jeder Embedding-Call ist ein OpenAI-Roundtrip **vor** dem ersten
  Anthropic-Token. Im ungünstigen Fall 3× hintereinander → mehrere hundert ms bis
  >1 s zusätzliche Time-to-first-token auf jeder Nachricht.
- **Maßnahme:** (a) Enriched-/Contextual-Suche nur starten, wenn die erste Suche
  schwach ist (ist teils so), aber die beiden Zusatzvarianten **parallel** statt
  sequentiell; (b) `text-embedding-3-small`-Ergebnisse für identische Query kurz
  cachen; (c) optional: erste Antwort streamen und RAG-Verfeinerung nur bei Bedarf.
- **Aufwand:** Mittel.

## P3 — Fehlender Vektor-Index auf `ea_documents` — **HOCH (Latenz, skaliert mit KB-Größe)**

- **Quelle:** `supabase/migration.sql:46-54, 102-130`. `embedding vector(1536)`,
  aber **kein** `ivfflat`/`hnsw`-Index (grep über alle Migrationen: keiner).
  `ea_match_documents` macht `ORDER BY embedding <=> query_embedding` → Full Scan.
- **Finding:** Jede RAG-Suche scannt **alle** Dokument-Chunks linear. Bei kleiner
  Wissensbasis unkritisch, skaliert aber linear mit jedem hochgeladenen Dokument —
  und RAG läuft in Chat, Review und Weekly-Coaching.
- **Maßnahme:**
  `CREATE INDEX ON ea_documents USING hnsw (embedding vector_cosine_ops);`
  (oder `ivfflat … WITH (lists=…)`), danach `ANALYZE`.
- **Aufwand:** Niedrig (eine Migration).

## P4 — `force-dynamic` auf dem Root-Layout — **HOCH (kill switch für statische Optimierung)**

- **Quelle:** `app/layout.tsx:47` (`export const dynamic = "force-dynamic"`).
- **Finding:** Erzwingt SSR für die **gesamte** App — inkl. Marketing-Landing,
  Blog, Tools, Impressum/Datenschutz. Diese Seiten könnten statisch/ISR vom CDN
  kommen; stattdessen wird jede Anfrage serverseitig gerendert. Schlechter TTFB,
  keine CDN-Cache-Hits, unnötige Funktionsaufrufe/Kosten.
- **Maßnahme:** `force-dynamic` vom Layout entfernen; nur die wirklich dynamischen
  **Seiten** (Dashboard etc.) markieren — diese haben es ohnehin bereits einzeln
  (`app/home/page.tsx:…`, `app/chat/page.tsx:8`, etc.). Marketing/Blog/Tools auf
  static/ISR.
- **Aufwand:** Niedrig-Mittel (Regressionstest der Auth-geschützten Seiten nötig).

## P5 — Landingpage ist 2 244-Zeilen-„use client"-Monolith — **HOCH (LCP/TBT/SEO)**

- **Quelle:** `app/page.tsx:1` (`"use client"`), 2 244 Zeilen, importiert ~35
  lucide-Icons + `PLAN_CREDITS`.
- **Finding:** Die wichtigste öffentliche Seite ist vollständig client-gerendert.
  Großes JS-Bundle, schlechter LCP/TBT auf Mobil, schwächere SEO. Der Großteil ist
  statisches Marketing, das als Server Component ausgeliefert werden könnte.
- **Maßnahme:** In Server Component umbauen; nur die wirklich interaktiven Inseln
  (Hero-Video-Logik, FAQ-Accordion, Preis-Toggle) als kleine `"use client"`-
  Komponenten extrahieren. Statisch prerendern.
- **Aufwand:** Hoch (Refactor), aber großer Effekt.

## P6 — ~11 MB Hero-Videos, autoplay — **HOCH (LCP/Bandbreite Mobil)**

- **Quelle:** `public/videos/nutriva-landing-hero-v2.mp4` (7,9 MB),
  `public/ernaehrungsapp-demo.mp4` (2,9 MB); Einbindung `app/page.tsx:202-244`
  (`autoPlay`, `preload="metadata"`).
- **Finding:** `preload="metadata"` ist gut, aber Autoplay zieht das Video sofort.
  7,9 MB auf der Landingpage = massiver LCP-/Datenhit auf Mobil.
- **Maßnahme:** Video komprimieren (H.264/H.265 + VP9/AV1-Variante, Zielbitrate
  prüfen), echtes Poster-Frame (statt SVG), Lazy-Start erst im Viewport (Logik
  existiert via `videoContainerRef` — sicherstellen, dass nichts vorab lädt), oder
  auf Streaming/CDN-Transcode (Mux/Cloudflare Stream) auslagern.
- **Aufwand:** Niedrig-Mittel.

## P7 — Google Fonts per CSS-`@import` (render-blocking) — **MITTEL (FCP/CLS)**

- **Quelle:** `app/globals.css:5`
  (`@import url('https://fonts.googleapis.com/css2?family=DM+Sans…&family=Lora…')`).
- **Finding:** Render-blockierender Import + zusätzlicher DNS/Connect zu Google
  (auch ein DSGVO-Drittland-Aspekt). Im Repo liegen bereits self-hosted Fonts
  (`app/fonts/GeistVF.woff`), genutzt wird aber die Google-CDN.
- **Maßnahme:** Auf `next/font` (self-hosted, automatisch preloaded, `font-display`
  gesetzt, kein externer Request, kein CLS) umstellen — für DM Sans + Lora.
- **Aufwand:** Niedrig.

## P8 — `next/image` ohne `images.remotePatterns` — **MITTEL (Funktion + Last)**

- **Quelle:** `components/profil/profil-form.tsx:255` (`<Image src={imageUrl}>` mit
  remote Clerk/Supabase-URL); `next.config.mjs` hat **keinen** `images`-Block.
- **Finding:** In Next 14 wirft `next/image` mit nicht-konfiguriertem Remote-Host
  einen Runtime-Fehler („hostname not configured"). Entweder ist das Avatar-Bild
  defekt oder es fällt auf ungeoptimierte Auslieferung zurück.
- **Maßnahme:** `images.remotePatterns` für `img.clerk.com` und
  `*.supabase.co/storage` ergänzen; sonst bewusst `unoptimized` setzen.
- **Aufwand:** Niedrig.

## P9 — Mehrfaches Rollen-/Plan-Lookup pro Request (kein Request-Memo) — **MITTEL (DB-Last/Latenz)**

- **Quelle:** Chat-Request fragt `ea_user_roles`/`ea_users` mehrfach:
  `getUserPlan` (`lib/feature-gates-server.ts:13-26` — 2 Queries),
  `isAdminUser` (`lib/credits.ts:39-47`), erneut in `deductCredits` (`:78`) und
  `refundCredits` (`:179`), plus `isAdminUser` für den RAG-Marker
  (`app/api/chat/route.ts:949`).
- **Finding:** Die Rollen-/User-Tabellen werden pro Chat-Request 3–5× separat
  gelesen. Redundante Roundtrips auf dem Hot-Path.
- **Maßnahme:** `getUserPlan`/`isAdminUser` pro Request memoisieren (React
  `cache()` oder den einmal ermittelten Plan/Admin-Status durch die Aufrufkette
  reichen statt in `deduct/refundCredits` neu zu laden).
- **Aufwand:** Mittel.

## P10 — `/api/credits` 3× parallel auf der Chat-Seite — **MITTEL (DB-Last)**

- **Quelle:** Unabhängige Mounts rufen alle `/api/credits`:
  `components/chat/chat-client.tsx:126`, `components/credit-warning.tsx:30`,
  `components/layout/navbar-shell.tsx:108`. Jeder Call macht `auth()` +
  `isAdminUser()` + `getCredits()` (je 1–2 DB-Queries).
- **Finding:** Beim Laden der Chat-Seite ≥3 identische Credit-Requests = mehrfach
  Auth + DB für denselben Wert.
- **Maßnahme:** Credits/Plan einmal serverseitig in der Page laden und via Props/
  Context an Navbar/Warning/Chat geben; Client-Refresh nur ereignisgesteuert
  (nach Verbrauch) statt pro Komponente.
- **Aufwand:** Mittel.

## P11 — Home-Dashboard: Client-Fetch statt Server Component — **MITTEL (Roundtrip + Auth-Overhead)**

- **Quelle:** `app/home/page.tsx:1` (`"use client"`) ruft `/api/home`
  (`app/api/home/route.ts:17-79`, 10 parallele Queries).
- **Finding:** Die Queries sind brav parallelisiert, aber der Umweg Client →
  `/api/home` → DB kostet einen zusätzlichen Roundtrip + erneute Auth gegenüber
  einem direkten Server-Component-Fetch. Einige Queries sind kombinierbar
  (heute+Woche Food-Log in einer Abfrage).
- **Maßnahme:** `/home` als Server Component, Daten direkt laden; ggf. mit
  Streaming/Suspense für die KPI-Karten.
- **Aufwand:** Mittel.

## P12 — recharts nicht code-split — **MITTEL (Bundle)**

- **Quelle:** `components/tracker/weight-chart.tsx:14`,
  `components/reports/reports-client.tsx:21`,
  `components/admin/usage-cost-chart.tsx:11`.
- **Finding:** recharts (~150 KB+ gz) wird statisch importiert. Nutzer ohne
  Chart-Ansicht zahlen das im Bundle.
- **Maßnahme:** Chart-Komponenten via `next/dynamic(..., { ssr:false })` lazy
  laden (Muster existiert bereits beim Scanner, `app/scanner/page.tsx:8-12`).
- **Aufwand:** Niedrig.

## P13 — Sessions-Fallback lädt alle Conversations in den Speicher — **NIEDRIG-MITTEL**

- **Quelle:** `app/api/chat/sessions/route.ts:36-60` (Fallback ohne View:
  `select(...).order(...)` über **alle** Conversations, dann In-Memory-Gruppierung).
- **Finding:** Greift nur, wenn die `ea_conversation_sessions`-View fehlt — dann
  aber unbeschränkt (wächst mit Verlaufslänge des Users).
- **Maßnahme:** Sicherstellen, dass die View in Prod existiert (sonst Limit/
  Pagination auf den Fallback).
- **Aufwand:** Niedrig.

## P14 — `touchLastActive` schreibt bei jeder KI-Anfrage — **NIEDRIG**

- **Quelle:** `lib/last-active.ts:10-22`, aufgerufen in `chat/route.ts:441` und
  `ernaehrungsplan/generieren`.
- **Finding:** Fire-and-forget-`UPDATE` auf `ea_users` pro Nachricht. Funktional ok,
  aber unnötige Schreiblast; der Inactive-Cron braucht keine Minutengenauigkeit.
- **Maßnahme:** Auf z.B. 1×/Stunde drosseln (nur schreiben, wenn `last_active_at`
  älter als 1 h).
- **Aufwand:** Niedrig.

## P15 — Sequentielles Embedding im Dokument-Ingest — **NIEDRIG (Admin-only)**

- **Quelle:** `app/api/documents/route.ts:104-136` (for-Schleife, jedes Chunk
  einzeln awaited).
- **Finding:** OpenAI-Embeddings unterstützen Batch-Arrays; die Schleife
  serialisiert sie. Nur Admin-Upload, daher niedrig.
- **Maßnahme:** Chunks in Batches (z.B. 50er) als Array an `embeddings.create`
  geben.
- **Aufwand:** Niedrig.

---

# Priorisierte Roadmap

### Sofort (Tage, hoher Impact, niedriger Aufwand)
1. **A1** `npm audit fix` + Next 14.2.x-Patch + Audit-CI-Gate. *(Sicherheit, kritisch)*
2. **P1** Anthropic Prompt-Caching auf statische Prompt-Präfixe. *(Kosten/Latenz)*
3. **P3** HNSW-Index auf `ea_documents.embedding`. *(RAG-Latenz)*
4. **A2** Rate-Limiting in Prod fail-closed. *(Abuse/Kosten)*
5. **P4** `force-dynamic` vom Root-Layout entfernen. *(öffentliche Seiten)*
6. **P7** Fonts auf `next/font`. **P8** `images.remotePatterns`. **P12** recharts lazy.

### Kurzfristig (1–3 Wochen)
7. **A3** Signed-URLs kurzlebig + on-demand. *(DSGVO/Sicherheit)*
8. **A4** Plan-Speichern gaten + JSON begrenzen.
9. **A5** Gemeinsamer Bildvalidator (Magic Bytes) für Chat.
10. **P2** RAG-Embedding-Calls parallelisieren/cachen.
11. **P9/P10** Rollen-/Plan-/Credits-Lookups memoisieren bzw. zentralisieren.
12. **A8** Log-Scrubbing/Pseudonymisierung in Prod.

### Mittelfristig (1–3 Monate)
13. **A7** RLS-/Storage-Policy-Audit in Prod + CI-Check (Schema-Drift Clerk↔Supabase).
14. **A6** Origin/CSRF-Helper für mutierende Routen.
15. **A9** Nonce-basierte CSP, `unsafe-eval` entfernen, auf Enforce schalten.
16. **P5** Landingpage in Server Component umbauen. **P6** Video-Pipeline.
17. **P11** `/home` als Server Component.
18. Rest: **A10, P13, P14, P15**.

---

## Mess-Empfehlung (vor/nach)
- **Lighthouse/PageSpeed** auf `/` (Landing) und `/home` — LCP, TBT, JS-Bytes.
- **Anthropic-Usage** über `ea_ai_usage` (`cache_read_tokens` vor/nach P1).
- **Supabase**: `get_advisors` (Security + Performance) + `EXPLAIN ANALYZE` auf
  `ea_match_documents` vor/nach P3.
- **Vercel Analytics**: TTFB öffentliche Routen vor/nach P4.
