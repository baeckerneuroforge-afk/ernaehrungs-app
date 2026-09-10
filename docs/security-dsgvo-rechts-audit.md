# Nutriva-AI Security, DSGVO und Rechts-Audit

Stand: 2026-05-14. Kein Ersatz fuer Rechtsberatung; rechtliche Punkte bitte mit Anwalt/DSB final pruefen.

## Executive Summary

Nutriva-AI hat bereits eine solide technische Basis: Clerk-Auth ist serverseitig eingebunden, die meisten personenbezogenen Tabellen werden per `user_id` gefiltert, Stripe- und Clerk-Webhooks pruefen Signaturen, Premium-Gates sind fuer die teuersten KI-Funktionen serverseitig vorhanden, Export und Account-Loeschung existieren.

Launch-blockend sind aus meiner Sicht aber drei Gruppen: Datenschutz-Nachweise fuer Gesundheitsdaten und Drittlandtransfers, Verbraucherrecht/Kuedigungsbutton, sowie einige technische Datenschutz- und Autorisierungsrisiken. Besonders kritisch sind die nicht granular/nicht nachweisbar genug dokumentierte Einwilligung, der Widerspruch zwischen PostHog-Banner und Datenschutzerklaerung, ein Ziel-PATCH mit unvalidiertem Body-Spread, einjaehrige Supabase-Signed-URLs fuer Essensfotos und die fehlende sichtbare DSFA/TIA/AVV-Dokumentation.

## Bereich 1: Security-Audit

### S1 - Unvalidierter Ziel-PATCH kann Systemfelder veraendern

- **Schweregrad:** Hoch
- **Quellen:** `app/api/tracker/ziele/[id]/route.ts:20-30`
- **Finding:** `PATCH` liest `body = await request.json()` und schreibt `update({ ...body, updated_at: ... })`. Da die Route mit Service-Role laeuft, ist TypeScript/RLS kein Schutz. Ein Nutzer kann bei einer eigenen Ziel-Zeile potentiell Felder wie `user_id`, `created_at`, Statusfelder oder spaetere Spalten manipulieren.
- **Empfehlung:** Zod-Schema wie bei Gewicht/Tagebuch einfuehren, nur erlaubte Felder explizit schreiben, `user_id`, `id`, `created_at`, `updated_at` serverseitig sperren.
- **Verantwortlich:** Selbst loesbar.

### S2 - Foto-Signed-URLs sind 1 Jahr gueltig und werden als URL gespeichert

- **Schweregrad:** Hoch
- **Quellen:** `app/api/food-log/analyze/route.ts:413-417`, `lib/validations.ts:85-91`, `app/api/tagebuch/route.ts:78-82`
- **Finding:** Food-Fotos liegen im privaten Bucket, aber die App erzeugt Signed URLs mit `60 * 60 * 24 * 365` und speichert/transportiert `photo_url`. Bei Link-Leak ist das Foto lange abrufbar; Fotos koennen Gesundheits-/Lebensstilinformationen offenbaren.
- **Empfehlung:** Nur `photo_path` speichern, Signed URLs kurzlebig on demand erzeugen (z.B. 5-15 Minuten), Download/Anzeige-Endpoint mit Auth + Ownership, alte `photo_url` migrieren.
- **Verantwortlich:** Selbst loesbar; DSB fuer Speicherdauer/Datenschutztext.

### S3 - Rate-Limiting faellt in Produktion offen aus

- **Schweregrad:** Hoch
- **Quellen:** `lib/rate-limit.ts:4-11`, `lib/rate-limit.ts:109-123`
- **Finding:** Wenn Upstash fehlt oder ausfaellt, gibt `checkRateLimit` immer `{ success: true }` zurueck. Das ist fuer lokale Entwicklung angenehm, aber bei KI-/Stripe-/Support-Endpunkten ein Kosten- und Abuse-Risiko.
- **Empfehlung:** In `NODE_ENV=production` fail-closed oder zumindest harte In-Memory/Edge-Fallback-Limits pro User/IP. Startup-Check fuer Upstash-Env in Produktion.
- **Verantwortlich:** Selbst loesbar.

### S4 - Premium-Gate fuer gespeicherte Ernaehrungsplaene ist nicht konsistent

- **Schweregrad:** Mittel bis Hoch
- **Quellen:** `app/api/ernaehrungsplan/generieren/route.ts:353-370`, aber `app/api/ernaehrungsplan/route.ts:34-76`
- **Finding:** Generierung ist serverseitig gated, Speichern beliebiger `planData` aber nicht. Ein Free-User kann keine KI-Generierung nutzen, aber potentiell Plan-Daten ueber den Save-Endpoint erzeugen.
- **Empfehlung:** `POST /api/ernaehrungsplan` ebenfalls mit `getUserPlan`/`hasFeatureAccess(plan, "plan")`, Rate-Limit und ggf. Herkunft/Status pruefen.
- **Verantwortlich:** Selbst loesbar.

### S5 - KI-Bild im Chat hat keine Magic-Byte-Pruefung

- **Schweregrad:** Mittel
- **Quellen:** `lib/validations.ts:43-48`, `app/api/chat/route.ts:853-864`; positiv dagegen `app/api/food-log/analyze/route.ts:211-274`
- **Finding:** Fotoanalyse prueft MIME, Groesse und Magic Bytes. Chat-Bild akzeptiert base64 + `mediaType` per Zod, prueft aber nicht, ob die Bytes wirklich JPEG/PNG/WebP sind.
- **Empfehlung:** Gemeinsamen Bildvalidator extrahieren; base64 decodieren, Groesse nach Decode begrenzen, Magic Bytes pruefen.
- **Verantwortlich:** Selbst loesbar.

### S6 - CSRF/Origin-Schutz nicht explizit fuer State-Change-Routes

- **Schweregrad:** Mittel
- **Quellen:** Beispiele: `app/api/user/delete/route.ts:7-127`, `app/api/billing/cancel/route.ts:6-47`, `app/api/stripe/checkout/route.ts:11-80`
- **Finding:** Die App verlaesst sich auf Clerk-Cookie-Verhalten und JSON/fetch. Ein eigener Origin-Check/CSRF-Token ist nicht sichtbar. Besonders kritisch sind Account-Loeschung, Abo-Kuendigung, Checkout/Topup.
- **Empfehlung:** Middleware/Helper fuer `Origin`/`Sec-Fetch-Site` auf same-origin bei allen mutierenden Nicht-Webhook-Routen; optional CSRF-Token fuer destruktive Aktionen.
- **Verantwortlich:** Selbst loesbar.

### S7 - RLS-Endzustand muss in Produktion verifiziert werden

- **Schweregrad:** Hoch, falls `migration_rls_reactivate.sql` nicht angewendet ist
- **Quellen:** `lib/supabase/server.ts:4-13`, `supabase/migration_complete.sql:132-142`, `supabase/migration_rls_reactivate.sql:19-185`
- **Finding:** Server nutzt Service-Role und manuelle Filter. Es gibt eine RLS-Reaktivierungs-Migration, aber auch aeltere Migrationen deaktivieren RLS. Ob Produktion wirklich den Defense-in-Depth-Zustand hat, ist aus Code allein nicht beweisbar.
- **Empfehlung:** Supabase-Produktionsschema pruefen: RLS aktiv fuer alle personenbezogenen Tabellen; Storage Policies fuer `food-photos`; Service-Role nur serverseitig. CI-Migrationstest oder SQL-Audit-Skript.
- **Verantwortlich:** Selbst loesbar.

### S8 - Logging/Sentry enthalten zu viele Gesundheits-/User-Bezuege

- **Schweregrad:** Mittel bis Hoch
- **Quellen:** `app/api/food-log/analyze/route.ts:117-128`, `app/api/food-log/analyze/route.ts:372-375`, `app/api/chat/route.ts:711-720`, `app/api/ernaehrungsplan/generieren/route.ts:637-640`
- **Finding:** Es werden `userId`, Query-Ausschnitte, Modell-/Analysefehler und Stacks geloggt. Bei Gesundheitsdaten sollte Logging maximal minimiert werden.
- **Empfehlung:** Pseudonyme Request-ID statt Clerk-ID, keine Prompt-/Antwortausschnitte, Sentry `beforeSend` Scrubbing, Log-Retention dokumentieren.
- **Verantwortlich:** Selbst loesbar; DSB prueft TOM.

### S9 - Admin-Dokumentenupload ohne Groessenlimit/Magic-Byte-Schutz

- **Schweregrad:** Mittel
- **Quellen:** `app/api/documents/route.ts:53-136`
- **Finding:** Admin-only, aber PDF/DOCX werden ohne explizites Groessenlimit geparst und embeddings erzeugt. Risiko: Kosten-Spikes, Parser-DoS, ungewollte sensitive Dokumente in RAG.
- **Empfehlung:** Max. Dateigroesse, Seitencount/Chunklimit, MIME/Magic-Byte, Rate-Limit, explizite Admin-Warnung "keine personenbezogenen Daten hochladen".
- **Verantwortlich:** Selbst loesbar.

### S10 - Positive Security-Befunde

- **Schweregrad:** Niedrig/positiv
- **Quellen:** `middleware.ts:5-18`, `app/api/webhooks/stripe/route.ts:17-26`, `app/api/webhooks/clerk/route.ts:45-59`, `app/api/tagebuch/[id]/route.ts:25-29`, `app/api/tagebuch/from-plan/route.ts:91-96`
- **Finding:** Clerk-Middleware schuetzt Nicht-Public-Routes; Stripe/Clerk-Signaturen sind korrekt roh verifiziert; viele CRUD-Routen filtern nach `user_id`; Fotoanalyse hat gute MIME/Magic-Byte/Size-Pruefung.
- **Empfehlung:** Patterns vereinheitlichen und als helper/lint checklist erzwingen.
- **Verantwortlich:** Selbst loesbar.

## Bereich 2: DSGVO-Compliance

### D1 - Explizite Einwilligung ist vorhanden, aber nicht nachweisbar genug

- **Schweregrad:** Kritisch fuer Launch
- **Quellen:** `components/onboarding/onboarding-wizard.tsx:581-669`, `lib/consent.ts:13-27`, `app/api/profile/consent/route.ts:21-40`
- **Finding:** KI-Einwilligung wird als Boolean `ki_consent` geprueft; AGB-Zeitstempel existiert. Es fehlen sichtbar: `ki_consent_at`, `withdrawn_at`, Consent-Version, Privacy-Version, konkrete Prozessorkategorien, IP/User-Agent optional, granularer Scope.
- **Empfehlung:** Consent-Ledger-Tabelle einfuehren: `type`, `granted`, `version`, `text_hash`, `processors`, `timestamp`, `source`. Bestehende Booleans als Cache weiterfuehren.
- **Verantwortlich:** Selbst loesbar fuer Technik; DSB noetig.

### D2 - Einwilligung ist zu grob fuer verschiedene KI-Verarbeitungen

- **Schweregrad:** Hoch
- **Quellen:** `lib/consent.ts:3-11`, KI-Routen `app/api/chat/route.ts:374-380`, `app/api/food-log/analyze/route.ts:150-157`, `app/api/tagebuch/import/route.ts:32-35`, `lib/monthly-report.ts:338-341`
- **Finding:** Eine KI-Einwilligung deckt Chat, Fotoanalyse, CSV-Import, Wochencheck, Monatsreport, OpenAI Embeddings und Anthropic ab. Bei Gesundheitsdaten sollte sie spezifisch und granular sein, zumindest getrennt nach "KI-Chat/Plan", "Fotoanalyse", "CSV-Import", "automatische Reports/Emails", "Qualitaetssicherung".
- **Empfehlung:** Granulare Toggles plus Feature-Gating nach Scope; UI erklaert Empfaenger, Zweck, Freiwilligkeit und Folgen des Widerrufs.
- **Verantwortlich:** DSB + selbst loesbar.

### D3 - Datenschutzerklaerung widerspricht Code bei PostHog/Cookies

- **Schweregrad:** Hoch
- **Quellen:** `components/cookie-banner.tsx:86-119`, `components/posthog-provider.tsx:14-36`, `app/(marketing)/datenschutz/page.tsx:196-233`, `app/(marketing)/datenschutz/page.tsx:305-311`
- **Finding:** Banner macht Opt-in fuer PostHog. Datenschutzerklaerung nennt PostHog aber teils berechtigtes Interesse und behauptet unter "Cookies", es gebe keine Tracking-/Analyse-Cookies. PostHog nutzt localStorage/Events; Session Replay ist nicht aktiviert, aber nur Inputs maskiert waere bei Aktivierung nicht genug.
- **Empfehlung:** Rechtsgrundlage auf Einwilligung umstellen oder Banner/Legitimate-Interest sauber begruenden; Cookies/LocalStorage/Analytics korrekt beschreiben; PostHog Session Replay deaktiviert lassen oder `maskTextSelector: "*"`, `blockSelector` fuer sensible Bereiche.
- **Verantwortlich:** DSB + selbst loesbar.

### D4 - Drittlandtransfer-/AVV-/TIA-Nachweise sind nicht sichtbar

- **Schweregrad:** Kritisch fuer Launch mit Gesundheitsdaten
- **Quellen:** `app/(marketing)/datenschutz/page.tsx:117-193`
- **Finding:** Die Datenschutzerklaerung behauptet SCCs und AVVs mit allen Dienstleistern. Im Repo gibt es keine Nachweis-/Registerdatei. Fuer USA-Anbieter plus Gesundheitsdaten braucht ihr DPA/AVV, SCC/DPF-Bewertung und TIA.
- **Empfehlung:** Vendor-Register pflegen: Anbieter, Rolle, Datenkategorien, Region, DPA-Link/Datum, SCC/DPF, Subprocessor, TOM, Retention, TIA-Ergebnis.
- **Verantwortlich:** DSB + Anwalt noetig.

### D5 - Datenschutzerklaerung enthaelt falsche/unklare Anthropic-Retention

- **Schweregrad:** Hoch
- **Quellen:** `components/onboarding/onboarding-wizard.tsx:745`, `app/(marketing)/datenschutz/page.tsx:120-131`
- **Finding:** Onboarding spricht von Loeschung nach 7 Tagen. Anthropic dokumentiert fuer API-Nutzer Standardloeschung von Inputs/Outputs innerhalb von 30 Tagen, mit Ausnahmen fuer Policy-/Legal-Faelle. Die Datenschutzerklaerung nennt keine konkrete Frist.
- **Empfehlung:** Text auf aktuelle Anthropic-API-Retention korrigieren; Zero Data Retention oder HIPAA-ready/BAA pruefen, auch wenn HIPAA rechtlich nicht DSGVO ersetzt.
- **Verantwortlich:** DSB + selbst loesbar.

### D6 - Betroffenenrechte sind teilweise implementiert, aber Export/Loeschung sind unvollstaendig

- **Schweregrad:** Hoch
- **Quellen:** Export `app/api/user/export/route.ts:32-89`; Loeschung `app/api/user/delete/route.ts:82-110`; Inactive-Cron `app/api/cron/inactive-accounts/route.ts:149-159`
- **Finding:** Export umfasst Profil, Tagebuch, Gewicht, Plaene, Ziele, Chats, Credits. Es fehlen sichtbar z.B. `ea_users` Consent-/Billing-Metadaten, Settings, Support-Tickets, Monthly Reports, Admin-Audit-Eintraege, Onboarding-Tour, Foto-Binaries/Pfade. Loeschroute loescht mehr, aber setzt trotz DB-Fehlern fort. Inactive-Cron loescht weniger Tabellen als manuelle Loeschung.
- **Empfehlung:** Einheitliche Data Map; Export/Deletion aus derselben Tabelleliste generieren; Fehler bei personenbezogenen Loeschungen nicht stillschweigend ignorieren, sondern Retry/DSAR-Queue.
- **Verantwortlich:** Selbst loesbar; DSB prueft Vollstaendigkeit.

### D7 - Minderjaehrigenregel ist inkonsistent

- **Schweregrad:** Hoch
- **Quellen:** AGB `app/(marketing)/agb/page.tsx:47-62`; Datenschutz `app/(marketing)/datenschutz/page.tsx:268-277`; UI `components/onboarding/onboarding-wizard.tsx:77-83`; Schema `lib/validations.ts:10-13`
- **Finding:** Rechtstexte nennen Nutzung ab 16 bzw. 13-15 mit Elternzustimmung. UI erlaubt ab 13, Server-Schema sogar ab 10. Es gibt keinen Elternzustimmungsprozess.
- **Empfehlung:** Entweder Mindestalter technisch auf 16 setzen oder verifizierbaren Guardian-Consent bauen. Fuer Gesundheitsdaten empfehle ich konservativ 16+.
- **Verantwortlich:** Selbst loesbar; Anwalt/DSB noetig.

### D8 - DSFA sehr wahrscheinlich erforderlich

- **Schweregrad:** Kritisch fuer Launch
- **Quellen:** Gesundheitsdaten in `lib/validations.ts:10-29`, KI-Profiltransfer `app/api/ernaehrungsplan/generieren/route.ts:409-431`, Chat-/Behavior-Kontext `app/api/chat/route.ts:754-779`
- **Finding:** Besondere Kategorien personenbezogener Daten (Art. 9), KI-Profiling, Drittlandtransfers und potenziell vulnerable Nutzergruppen sprechen stark fuer Datenschutz-Folgenabschaetzung nach Art. 35 DSGVO.
- **Empfehlung:** DSFA vor Launch dokumentieren: Zwecke, Notwendigkeit, Risiken, Massnahmen, Restrisiko, ggf. Konsultation Aufsichtsbehoerde.
- **Verantwortlich:** DSB noetig.

## Bereich 3: KI-spezifische Compliance

### K1 - Umfang der an KI-Anbieter gesendeten Gesundheitsdaten ist gross

- **Schweregrad:** Hoch
- **Quellen:** Plan `app/api/ernaehrungsplan/generieren/route.ts:409-431`, Chat `app/api/chat/route.ts:757-779`, Wochencheck `app/api/tracker/wochencheck/route.ts:72-83`, Wochen-Coaching `app/api/cron/weekly-coaching/route.ts:56-109`, Foto `app/api/food-log/analyze/route.ts:333-351`
- **Finding:** Alter, Geschlecht, Groesse, Gewicht, Ziele, Allergien, Krankheiten, Tagebuch, Gewicht, Ziele, Fotos und teilweise Name im Weekly-Coaching-Prompt werden an Anthropic/OpenAI gesendet. "Anonymisiert" ist hier nur "ohne E-Mail/Name" und nicht voll anonym; bei seltenen Krankheits-/Profilkombinationen bleibt es personenbezogen/pseudonym.
- **Empfehlung:** Datenminimierung pro Feature; Name nie in KI-Systemprompt, Begruessung nachgelagert lokal einsetzen; separate OpenAI-Embedding-Einwilligung; Prompt-Data-Map in Datenschutzerklaerung.
- **Verantwortlich:** Selbst loesbar + DSB.

### K2 - EU AI Act: wahrscheinlich Transparenz-/Limited-Risk, aber MDR kann kippen

- **Schweregrad:** Mittel bis Hoch
- **Quellen:** KI-Badge `components/chat/chat-client.tsx:662-666`, Marketing/AGB `app/(marketing)/agb/page.tsx:83-94`, AI Act Quellen unten
- **Finding:** Als allgemeine Ernaehrungs-App ist Nutriva vermutlich ein KI-System mit Transparenzpflichten, nicht automatisch High-Risk. Wenn die Zweckbestimmung aber Richtung Diabetes-/Krankheitsmanagement, Therapie oder medizinische Entscheidungsunterstuetzung geht, koennen MDR und AI-Act-High-Risk greifen.
- **Empfehlung:** Intended Purpose schriftlich festlegen: Lifestyle/Wellness/Ernaehrungsbildung, keine Diagnose/Therapie. Disease-spezifische Empfehlungen nur mit Arztverweis oder menschlicher qualifizierter Freigabe. AI-Output sichtbar als KI kennzeichnen.
- **Verantwortlich:** Anwalt fuer MDR/AI-Act-Klassifizierung; selbst loesbar fuer UI.

### K3 - KI-Disclaimer existiert, aber nicht ueberall als User-facing Pflichttext

- **Schweregrad:** Mittel
- **Quellen:** Prompt `app/api/chat/route.ts:86-106`, AGB `app/(marketing)/agb/page.tsx:83-94`, Footer `components/layout/footer.tsx:93`, Wochencheck `app/api/tracker/wochencheck/route.ts:36`
- **Finding:** Es gibt gute Prompt-Regeln gegen medizinische Beratung. Aber rechtlich zaehlt auch, was Nutzer sehen: Plan, Fotoanalyse, Smart Log, Monatsreport und Emails sollten klar "KI-Schaetzung/keine medizinische Beratung" tragen.
- **Empfehlung:** Einheitliches `MedicalDisclaimer`/`AiDisclosure` in allen KI-Output-Komponenten und Emails.
- **Verantwortlich:** Selbst loesbar; Anwalt prueft Formulierung.

### K4 - Art. 22 DSGVO wahrscheinlich nicht direkt, aber menschliche Eskalation sollte Free-Usern offenstehen

- **Schweregrad:** Mittel
- **Quellen:** Premium-Gate Janine `lib/feature-gates.ts:27-34`, Chat-Hinweise `app/api/chat/route.ts:281`, Support-FAQ `components/support/support-faq.tsx:35`
- **Finding:** Die App trifft eher Empfehlungen als rechtlich bindende Entscheidungen. Trotzdem koennen personalisierte Ernaehrungsempfehlungen fuer Gesundheitsdaten praktisch erheblich wirken. Nur Premium hat Janine direkt.
- **Empfehlung:** Kostenloser Support-/Beschwerdeweg fuer KI-Fehler und Gesundheitseskalation; "menschliche Ueberpruefung" fuer kritische AI-Incidents dokumentieren.
- **Verantwortlich:** DSB + Anwalt; UI selbst loesbar.

## Bereich 4: Weitere rechtliche Bestimmungen Deutschland

### R1 - Impressum nutzt veraltete Normen

- **Schweregrad:** Mittel
- **Quellen:** `app/(marketing)/impressum/page.tsx:5-8`, `app/(marketing)/impressum/page.tsx:30-31`, `app/(marketing)/impressum/page.tsx:66-76`
- **Finding:** Text nennt `§ 5 TMG` und `§ 55 Abs. 2 RStV`. Seit 2024 ist fuer Anbieterkennzeichnung regelmaessig § 5 DDG relevant; fuer journalistisch-redaktionelle Inhalte eher § 18 MStV.
- **Empfehlung:** Impressum mit Anwalt aktualisieren: § 5 DDG, ggf. § 18 Abs. 2 MStV, Unternehmensform/Vertretung, Aufsichtsbehoerde falls erlaubnispflichtig, Berufsangaben falls Janine als regulierte Fachperson auftritt.
- **Verantwortlich:** Anwalt noetig.

### R2 - Kuedigungsbutton nach § 312k BGB ist wahrscheinlich nicht ausreichend

- **Schweregrad:** Kritisch fuer Launch mit Online-Abo
- **Quellen:** App-Kuendigung `components/billing/billing-client.tsx:158-178`, AGB `app/(marketing)/agb/page.tsx:116-146`, Billing hinter Login `app/billing/page.tsx:11-21`
- **Finding:** Es gibt eine Abo-Kuendigung in der eingeloggten Billing-Seite, aber keinen sichtbar leicht erreichbaren zweistufigen Kuedigungsbutton ("Vertraege hier kuendigen" + Bestaetigungsseite) auf der Website. § 312k BGB sieht bei Verstoessen sehr harte Folgen vor: Verbraucher koennen dann jederzeit und ohne Frist kuendigen.
- **Empfehlung:** Oeffentliche `/kuendigung`-Route mit gesetzlicher Button-Beschriftung und Bestaetigungsseite bauen; Auth optional ueber E-Mail/Stripe-Customer-Identifikation; Eingangsbestaetigung per E-Mail.
- **Verantwortlich:** Selbst loesbar technisch; Anwalt prueft Flow.

### R3 - Widerrufsbelehrung ist zu duenn fuer Paid Digital Service

- **Schweregrad:** Hoch
- **Quellen:** `app/(marketing)/agb/page.tsx:148-165`
- **Finding:** Widerrufsrecht wird kurz genannt, aber Muster-Widerrufsformular, Folgen des Widerrufs, digitale Inhalte/Dienstleistungsbeginn, Zahlungserstattung, Kontaktwege und Checkbox fuer "sofortiger Leistungsbeginn/Verlust des Widerrufsrechts" sind nicht sichtbar.
- **Empfehlung:** Checkout-/AGB-Widerrufsbelehrung nach Art. 246a EGBGB anwaltlich erstellen; Stripe Checkout um erforderliche Hinweise/Checkboxen ergaenzen.
- **Verantwortlich:** Anwalt noetig.

### R4 - HWG/UWG-Risiken durch Gesundheits- und Abnehmkommunikation

- **Schweregrad:** Mittel bis Hoch
- **Quellen:** Landing `app/page.tsx:171-183`, `app/page.tsx:668-681`, `app/page.tsx:2078-2090`; AGB Disclaimer `app/(marketing)/agb/page.tsx:83-94`
- **Finding:** Die App spricht von "KI-Ernaehrungsberaterin", "persoenlichen Empfehlungen", Defiziten und Gesundheitswarnungen. Solange keine Heilung/Linderung/Diagnose beworben wird, ist es eher beherrschbar. Krankheitsspezifisches Marketing ("Diabetes") und garantierte Abnehmerfolge waeren riskant.
- **Empfehlung:** Keine Erfolgsversprechen ("du nimmst ab"), keine krankheitsbezogenen Heilversprechen, keine Vorher/Nachher-Logik, Yazio-Vergleiche nur sachlich nachpruefbar.
- **Verantwortlich:** Anwalt noetig fuer Claim-Review.

### R5 - MDR-Grenzfall bei Krankheiten/Diabetes

- **Schweregrad:** Hoch, falls Disease-Management beworben oder gebaut wird
- **Quellen:** Krankheitsfeld `components/onboarding/onboarding-wizard.tsx:535-545`, Chat-Regeln `app/api/chat/route.ts:86-106`, Marketingdocs `docs/go-to-market-strategie.html:379-398`
- **Finding:** Kalorien-/Lifestyle-Tracker ist meist kein Medizinprodukt. Sobald Nutriva fuer Diagnose, Praevention, Ueberwachung, Vorhersage, Prognose, Behandlung oder Linderung von Krankheiten bestimmt ist, kann Software unter MDR Art. 2 fallen.
- **Empfehlung:** Intended Purpose/Claims auditieren; Krankheitsthemen nicht als Produktversprechen verwenden; Diabetes/Essstoerungen nur als Sicherheitskontext mit Arztverweis.
- **Verantwortlich:** MDR-Anwalt/Regulatory Consultant noetig.

### R6 - Janines Rolle braucht rechtliche Klarheit

- **Schweregrad:** Hoch
- **Quellen:** Premium-Feature `lib/feature-gates.ts:27-34`, Direktnachrichten `components/chat/direct-message-panel.tsx:90-161`, AGB `app/(marketing)/agb/page.tsx:65-80`
- **Finding:** "Ernaehrungswissenschaftlerin" ist plausibel fuer allgemeine Ernaehrungsberatung. Bei Krankheiten kann die Grenze zu Ernaehrungstherapie/Heilkunde relevant werden. Berufshaftpflicht und klare Leistungsbeschreibung sind nicht sichtbar.
- **Empfehlung:** Qualifikation, Leistungsumfang, Ausschluss von Therapie/Diagnose, Eskalationsprozess und Berufshaftpflicht klaeren.
- **Verantwortlich:** Anwalt + Versicherungsmakler; Janine/Betreiber.

## Top-10-Prioritaeten

1. **DSFA/TIA/AVV-Dokumentation vor Launch** fuer Gesundheitsdaten + KI + USA-Transfers.
2. **Consent-Ledger und granulare KI-Einwilligungen** statt nur Boolean.
3. **Kuedigungsbutton nach § 312k BGB** oeffentlich und zweistufig umsetzen.
4. **PostHog/Cookie/Datenschutz-Widersprueche** korrigieren.
5. **Foto-Signed-URLs auf kurzlebige On-Demand-URLs umstellen**.
6. **Unvalidierte Ziel-PATCH/POST-Routen fixen**.
7. **Minderjaehrigenregel technisch und rechtlich vereinheitlichen**.
8. **RLS-/Storage-Policies in Produktion verifizieren**.
9. **Anthropic/OpenAI-Retention und Drittlandtransfertexte korrigieren**.
10. **MDR/HWG/UWG-Claim-Review fuer Krankheit, Abnehmen und Janine-Beratung**.

## Was Muss Sofort / Launch-Blocker

- DSFA starten und dokumentieren.
- AVV/DPA/SCC/TIA fuer Anthropic, OpenAI, Clerk, Vercel, Stripe, Supabase, Resend, PostHog, Upstash, Sentry nachweisen.
- Consent-Ledger + granulare Einwilligung zumindest fuer KI/Fotos/Reports.
- Kuedigungsbutton und Widerrufsbelehrung anwaltlich sauber.
- `tracker/ziele` Runtime-Validation fixen.
- Signed-URL-Laufzeit fuer Fotos drastisch reduzieren.
- Datenschutzerklaerung und Cookie-Banner widerspruchsfrei machen.
- Mindestalter serverseitig korrekt erzwingen.

## 1-3 Monate

- Vollstaendige Data Map + DSAR-Export/Deletion coverage.
- Log-/Sentry-Scrubbing und Retention Policy.
- Origin/CSRF-Helper fuer mutierende Endpoints.
- RLS/Storage-Policy-CI-Check.
- Vendor Register und TOM-Dokumentation.
- Einheitliche AI-/Medical-Disclaimer in App und Emails.
- Incident-Response-Prozess fuer Datenpannen nach Art. 33/34 DSGVO.

## 6-12 Monate

- Externer Penetrationstest.
- AI-Governance: Model evals, Prompt-/Output-Audits, Human-review workflow.
- DSB-Jahresreview, TIA-Refresh, Vendor-Subprocessor-Monitoring.
- MDR/AI-Act Re-Klassifizierung bei neuen Disease-Features.
- Cyber-/Berufshaftpflicht ueberpruefen.

## Geschaetzte externe Kosten

- Datenschutzanwalt/IT-Recht Launchpaket: ca. 2.000-8.000 EUR.
- Externer DSB oder Datenschutzberater: ca. 150-500 EUR/Monat; DSFA-Projekt ca. 1.500-6.000 EUR.
- TIA/AVV/Vendor-Register Unterstuetzung: ca. 1.000-4.000 EUR.
- Verbraucherrecht/AGB/Widerruf/Kuedigungsbutton: ca. 1.000-4.000 EUR.
- HWG/UWG/MDR-Claim-Review: ca. 1.500-7.500 EUR; MDR-Klassifizierungsgutachten ca. 3.000-15.000 EUR.
- Penetrationstest Web-App: ca. 3.000-10.000 EUR.
- Berufs-/Cyberhaftpflicht: grob 300-2.500 EUR/Jahr, je nach Deckung und Gesundheitsbezug.

## Rechtliche Quellen

- DSGVO: Verordnung (EU) 2016/679, u.a. Art. 6, 7, 9, 13-22, 28, 35, 44 ff.: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EU AI Act: Verordnung (EU) 2024/1689 und EU-Kommission AI-Act-Uebersicht: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- AI Act Explorer, Art. 6, 8-15, 26, 27, 50: https://ai-act-service-desk.ec.europa.eu/en/ai-act-explorer
- DDG § 5 Anbieterkennzeichnung: https://www.gesetze-im-internet.de/ddg/BJNR0950B0024.html
- BGB § 312k Kuedigungsbutton: https://www.gesetze-im-internet.de/bgb/__312k.html
- MDR Verordnung (EU) 2017/745, Art. 2 Medizinproduktdefinition: https://eur-lex.europa.eu/eli/reg/2017/745/oj
- HWG § 11 und irrefuehrende Gesundheitswerbung im HWG: https://www.gesetze-im-internet.de/heilmwerbg/__11.html
- Anthropic API Retention/ZDR: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention und https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
- Clerk DPA: https://clerk.com/legal/dpa
- Vercel DPA: https://vercel.com/legal/dpa
- PostHog Session Replay Privacy Controls: https://www.mintlify.com/PostHog/posthog/products/session-replay
