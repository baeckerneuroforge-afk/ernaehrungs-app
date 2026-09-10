# Pricing-Analyse und Kostenmodell fuer Nutriva-AI

Stand der Analyse: 2026-05-15  
Gewuenschter Report-Dateiname: `pricing-analyse-2026-05-14.md`

## Executive Summary

**Kurzfazit:** Mit den aktuell offiziell veroeffentlichten API-Preisen ist die aktuelle Preisstruktur **nicht durch API-Kosten allein verlustgefaehrdet**. Die API-Kosten pro User sind deutlich niedriger als die Abo-Preise. Der Verdacht "wir machen wegen Claude/OpenAI API-Kosten Verlust" bestaetigt sich in der Baseline nicht.

**Aber:** Es gibt klare Kosten- und Operationsrisiken im Code:

1. **ALARM: `/api/tracker/wochencheck` ist aktuell unlimitiert, nicht plan-gated und zieht keine Credits ab.** Jeder eingeloggte User kann Sonnet-Wochenchecks beliebig oft starten.
2. **ALARM: CSV-Import ist Premium-only, aber ohne Credit-Abzug und mit sehr grosser Dateiobergrenze.** Besser: deterministisch parsen und LLM nur fuer Header-Mapping/Samples nutzen.
3. **ALARM: Janine-Direkt ist nicht API-, sondern Human-Cost-getrieben.** Bei 49,99 EUR funktioniert Pro+ nur, wenn Janine-Direkt hart begrenzt wird.
4. Monatsreport und Weekly Coaching sind nicht credit-basiert, aber cron-gesteuert und Premium-only. Das ist kalkulierbar, sollte aber in Usage-Logs sichtbar werden.
5. Es gibt keine persistente Token-/Kosten-Tabelle. Nur die Plan-Generierung loggt Output-Tokens in Vercel-Logs.

**Empfehlung:** Pricing nicht panisch anheben. Zuerst Credit-Luecken schliessen, Usage-Logging bauen, Plan-Credits fuer 7-Tage-Plaene anpassen und Pro+ klar als begrenztes Human-Coaching-Angebot definieren.

## Verwendete Preisannahmen

### Offizielle Baseline

Die Aufgabenstellung nennt fuer Anthropic teilweise andere Preise. Die aktuellen offiziellen Anthropic-Docs listen fuer die im Code verwendeten Modellfamilien:

| Modell | Input USD / 1M Tokens | Output USD / 1M Tokens | Hinweis |
|---|---:|---:|---|
| Claude Sonnet 4.6 | 3,00 | 15,00 | entspricht Aufgabenstellung |
| Claude Opus 4.7 | 5,00 | 25,00 | Aufgabenstellung nennt 15/75; das waere 3x teurer |
| Claude Haiku 4.5 | 1,00 | 5,00 | Aufgabenstellung nennt 0,80/4,00; das ist eher Haiku 3.5 |
| OpenAI `text-embedding-3-small` | 0,02 | - | pro 1M Input-Tokens |

Wechselkurs: ECB am 2026-05-15: **1 EUR = 1,1702 USD**, also **1 USD = 0,8546 EUR**.

Quellen:

- Anthropic Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic Vision Tokenisierung: https://platform.claude.com/docs/en/build-with-claude/vision
- OpenAI `text-embedding-3-small`: https://developers.openai.com/api/docs/models/text-embedding-3-small
- ECB Wechselkurs: https://data.ecb.europa.eu/currency-converter

### Sensitivitaet

Falls eure tatsaechliche Rechnung Opus 4.7 mit 15/75 USD abrechnet, muessen alle Opus-Positionen in diesem Dokument mit **3x** multipliziert werden. Sonnet-Plaene bleiben unveraendert. Falls Fast Mode genutzt wird, waere Opus laut Anthropic mit **6x** Standardpreis zu rechnen; im Code ist Fast Mode aber nicht aktiviert.

## Phase 1: Bestand aus dem Code

### Plaene, Preise und Credits

Quelle: `lib/plans.ts`

| Interner Plan | Produktlabel | Preis / Monat | Credits / Monat | Kommentar |
|---|---|---:|---:|---|
| `free` | Free | 0,00 EUR | 15 | nur Chat, Tagebuch, Tracker |
| `pro` | Basis | 15,99 EUR | 60 | Chat, Plan, Review, Einkaufsliste |
| `pro_plus` | Premium | 49,99 EUR | 250 | alle KI-Features inkl. Foto, Smart Log, Monatsreport, Janine-Direkt |

Top-ups aus `app/api/stripe/topup/route.ts`:

| Paket | Credits | Preis | Preis / Credit |
|---|---:|---:|---:|
| small | 15 | 2,99 EUR | 0,199 EUR |
| medium | 40 | 5,99 EUR | 0,150 EUR |
| large | 100 | 11,99 EUR | 0,120 EUR |

Top-ups sind selbst beim teuersten normalen Credit-Use-Case profitabel. Ein 7-Tage-Plan kostet in der Baseline ca. 0,205 EUR bei 5 Credits, also ca. 0,041 EUR pro Credit.

### Credit-Kosten pro Aktion

Quelle: `lib/plans.ts`

| Aktion | Credits | Code-Kommentar | Status |
|---|---:|---|---|
| Chat Free/Basis | 1 | Haiku | aktiv |
| Chat Premium/Admin | 2 | Sonnet | aktiv |
| Chat mit Bild | 3 | Kommentar sagt Opus Vision | aktiv, Premium-only |
| Plan-Generierung | 5 | Sonnet | aktiv |
| Wochenreview | 4 | Opus | aktiv ueber Chat-Review |
| Foto-Analyse | 3 | Opus Vision | aktiv, Premium-only |
| Monatsreport | 7 | Opus | **Konstante existiert, aber Cron zieht keine Credits ab** |
| Smart Log | 2 | Haiku | aktiv, Premium-only |

### Feature-Gates

Quelle: `lib/feature-gates.ts`

| Feature | Free | Basis (`pro`) | Premium (`pro_plus`) |
|---|:---:|:---:|:---:|
| Chat | ja | ja | ja |
| Tagebuch | ja | ja | ja |
| Tracker | ja | ja | ja |
| Plan | nein | ja | ja |
| Review | nein | ja | ja |
| Einkaufsliste | nein | ja | ja |
| Janine-Direkt | nein | nein | ja |
| Foto-Tracking | nein | nein | ja |
| Chat-Bild | nein | nein | ja |
| Monatsreport | nein | nein | ja |
| Barcode-Scanner | nein | nein | ja |
| CSV-Import | nein | nein | ja |
| Smart Log | nein | nein | ja |

Wichtige Korrektur zur Beispielannahme in der Aufgabenstellung: **Free-User koennen im aktuellen Code keine Smart Logs, Foto-Analysen oder Plaene nutzen.** Free-Credits koennen praktisch nur fuer Chat verbraucht werden.

### Plan-Limits

Quelle: `app/api/ernaehrungsplan/generieren/route.ts`

| Plan | Max. Tage pro Plan |
|---|---:|
| Free | 1 laut Codepfad, aber Feature-Gate blockt Plan vorher |
| Basis | 3 |
| Premium | 7 |

Der Credit-Preis ist trotzdem immer 5 Credits. Dadurch subventioniert Premium lange 7-Tage-Plaene staerker als kurze Plaene.

## API-Inventar pro Route

| Route / Modul | Aktion | Modell | Max Tokens | OpenAI Embedding | Credits | Gate |
|---|---|---|---:|:---:|---:|---|
| `app/api/chat/route.ts` | Chat Free/Basis | `claude-haiku-4-5-20251001` | 1.500 | ja, RAG | 1 | Chat |
| `app/api/chat/route.ts` | Chat Premium | `claude-sonnet-4-6` | 1.500 | ja, RAG | 2 | Chat |
| `app/api/chat/route.ts` | Chat mit Bild | `claude-opus-4-7` | 1.500 | ja, RAG | 3 | Premium |
| `app/api/chat/route.ts` | Chat-seitige Plan-Intent-Antwort | `claude-sonnet-4-6` | 3.000 | ja, RAG | 5 | Basis |
| `app/api/chat/route.ts` | Chat-seitiges Wochenreview | `claude-opus-4-7` | 1.500 / 2.500 | ja, RAG | 4 | Basis |
| `app/api/food-log/analyze/route.ts` | Foto-Analyse | `claude-opus-4-7` | 1.500 | nein | 3 | Premium |
| `app/api/ernaehrungsplan/generieren/route.ts` | 1/3/7-Tage-Plan | `claude-sonnet-4-6` | 4.000 / 10.000 / 20.000 | ja | 5 | Basis |
| `app/api/tagebuch/smart-log/route.ts` | Smart Log | `claude-haiku-4-5-20251001` | 2.000 | nein | 2 | Premium |
| `app/api/tagebuch/import/route.ts` | CSV-Import Preview | `claude-haiku-4-5-20251001` | 16.000 | nein | 0 | Premium |
| `app/api/tracker/wochencheck/route.ts` | Tracker-Wochencheck | `claude-sonnet-4-6` | 1.000 | nein | 0 | **nur Auth, kein Plan-Gate** |
| `lib/monthly-report.ts` | Monatsreport | `claude-opus-4-7` | 2.500 | nein | 0 im Cron | Premium-Cron |
| `app/api/cron/weekly-coaching/route.ts` | Weekly Coaching Email | `claude-haiku-4-5-20251001` | 800 | nein | 0 | Premium-Cron |
| `app/api/documents/route.ts` | Admin-Dokument-Ingest | `text-embedding-3-small` | - | ja | 0 | Admin |
| `app/api/admin/fragen/aufnehmen/route.ts` | Admin-QA-Ingest | `text-embedding-3-small` | - | ja | 0 | Admin |
| `app/api/admin/blog/[id]/publish/route.ts` | Blog in Wissensbasis | `text-embedding-3-small` | - | ja | 0 | Admin |

## Logging-Bestand

Es gibt **keine persistente API-Usage-Tabelle** fuer Token, Kosten oder Modellnutzung.

Vorhanden:

- `ea_credit_transactions`: Credits, aber keine Tokens / Modellkosten.
- Plan-Generierung loggt in Vercel-Logs `outputTokens`, `stopReason`, `maxTokens`, `contentLength`.
- Chat-Streaming liest aktuell keine finalen Usage-Daten aus den Stream-Events.
- Non-streaming Calls (`messages.create`) koennten `response.usage` loggen, tun es aber aktuell nicht.
- OpenAI Embeddings koennten `usage.total_tokens` loggen, tun es aber aktuell nicht.

Empfehlung: `ea_ai_usage` einbauen mit `user_id`, `plan`, `endpoint`, `action`, `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `image_tokens_estimate`, `embedding_tokens`, `cost_usd`, `cost_eur`, `credits_charged`, `request_id`, `created_at`.

## Phase 2: Kosten pro Aktion

Token-Schaetzungen sind konservativ-realistisch. Ohne echte Usage-Logs sind sie aus Promptgroessen, RAG-Kontext, `max_tokens`, typischen JSON-Antworten und Anthropic Vision-Tokenisierung abgeleitet.

| Aktion | Modell | Input Tokens | Output Tokens | Zusatzcall | Kosten USD | Kosten EUR | Credits | EUR / Credit |
|---|---|---:|---:|---|---:|---:|---:|---:|
| Smart Log | Haiku 4.5 | 1.300 | 350 | - | 0,0031 | 0,0026 | 2 | 0,0013 |
| Foto-Analyse | Opus 4.7 Vision | 3.700 inkl. Bild | 250 | Supabase Storage | 0,0248 | 0,0212 | 3 | 0,0071 |
| Chat Free/Basis | Haiku 4.5 | 6.000 | 600 | 1 Embedding | 0,0090 | 0,0077 | 1 | 0,0077 |
| Chat Premium | Sonnet 4.6 | 6.000 | 600 | 1 Embedding | 0,0270 | 0,0231 | 2 | 0,0115 |
| Chat mit Bild | Opus 4.7 Vision | 8.500 inkl. Bild | 700 | 1 Embedding | 0,0600 | 0,0513 | 3 | 0,0171 |
| 1-Tage-Plan | Sonnet 4.6 | 7.000 | 2.500 | 1 Embedding | 0,0585 | 0,0500 | 5 | 0,0100 |
| 3-Tage-Plan | Sonnet 4.6 | 8.500 | 7.000 | 1 Embedding | 0,1305 | 0,1115 | 5 | 0,0223 |
| 7-Tage-Plan | Sonnet 4.6 | 10.000 | 14.000 | 1 Embedding | 0,2400 | 0,2051 | 5 | 0,0410 |
| Wochenreview Basis | Opus 4.7 | 10.000 | 1.200 | 1 Embedding | 0,0800 | 0,0684 | 4 | 0,0171 |
| Wochenreview Premium | Opus 4.7 | 14.000 | 2.200 | 1 Embedding | 0,1250 | 0,1068 | 4 | 0,0267 |
| Monatsreport | Opus 4.7 | 4.000 | 1.200 | - | 0,0500 | 0,0427 | 0 im Cron | - |
| Tracker-Wochencheck | Sonnet 4.6 | 4.500 | 700 | - | 0,0240 | 0,0205 | 0 | - |
| Weekly Coaching | Haiku 4.5 | 2.000 | 400 | Resend Email | 0,0040 | 0,0034 | 0 | - |
| CSV-Import typisch | Haiku 4.5 | 6.000 | 2.500 | - | 0,0185 | 0,0158 | 0 | - |
| Embedding klein | OpenAI | 250 | - | - | 0,000005 | 0,000004 | - | - |
| Embedding Chunk/Admin | OpenAI | 1.500 | - | - | 0,000030 | 0,000026 | - | - |

### Wichtige Kosteninterpretation

- **OpenAI Embeddings sind praktisch nicht der Kostentreiber.** Selbst 100.000 Chat-RAG-Suchen mit 250 Tokens kosten nur ca. 0,43 EUR.
- **7-Tage-Plaene sind der teuerste normale Credit-Use-Case**, weil Output-Tokens dominieren.
- **Opus-Vision ist teurer als Haiku/Sonnet, aber bei einzelnen Bildern immer noch klein**. Bei 20 Fotoanalysen/Monat sind das ca. 0,42 EUR API-Kosten.
- **Unlimitierte Sonnet-Endpunkte ohne Credits sind gefaehrlicher als Premium-Fotos**, weil sie von Free-Usern missbraucht werden koennen.

## Fix- und Plattformkosten

Nicht vollstaendig im Code auslesbar; folgende Annahmen basieren auf offiziellen Preislisten und konservativer Reserve.

| Kostenblock | Annahme | Monatlich | Kommentar |
|---|---:|---:|---|
| Supabase Pro | 25 USD | ca. 21,36 EUR | 100 GB Storage inkl.; Fotos sind anfangs unkritisch |
| Vercel Pro | 20 USD | ca. 17,09 EUR | Annahme fuer Production; Hobby waere 0 |
| Resend | Free bis 3.000 Emails, Pro 20 USD | 0 bis 17,09 EUR | bei 100 Usern vermutlich Free ausreichend |
| Stripe Payments | 1,5% + 0,25 EUR | variable | EEA-Karten in Deutschland |
| Stripe Billing | 0,7% Billing-Volumen | variable | falls Stripe Billing pay-as-you-go greift |
| Supabase Storage Fotos | ca. 0,5 MB pro Foto | nahe 0 | 20 Fotos/User/Monat = 10 MB/User/Monat |
| Open Food Facts | kostenlos | 0 | Barcode-Scanner nutzt freie API mit 24h Next-Cache |
| Upstash/Sentry/PostHog | nicht aus Env ableitbar | Reserve | je nach Plan |

Quellen:

- Supabase Pricing: https://supabase.com/pricing
- Supabase Storage Pricing: https://supabase.com/docs/guides/storage/pricing
- Vercel Pricing: https://vercel.com/pricing
- Resend Pricing: https://resend.com/pricing
- Stripe Deutschland: https://stripe.com/en-de/pricing

## Phase 3: Nutzungs-Szenarien

### A. Free-User

Aktueller Code:

- 15 Credits/Monat
- Nur Chat, Tagebuch, Tracker
- Keine Plaene, keine Reviews, keine Fotos, kein Smart Log, kein CSV
- Chat kostet 1 Credit und laeuft auf Haiku

| Szenario | Aktionen | API-Kosten / Monat |
|---|---|---:|
| Realistisch leicht | 5 Chat-Nachrichten | 0,04 EUR |
| Realistisch aktiv | 10 Chat-Nachrichten | 0,08 EUR |
| Credit-Max | 15 Chat-Nachrichten | 0,12 EUR |
| Risiko: plus 4x Tracker-Wochencheck | 15 Chat + 4 uncredited Sonnet-Wochenchecks | 0,20 EUR |

**Free ist nicht das API-Margenproblem**, solange teure KI-Features gated bleiben. 15 Free-Credits kosten maximal ca. 0,12 EUR API. Ein Basis-User kann nach API und Payment-Gebuehren theoretisch sehr viele Free-User querfinanzieren.

Empfehlung: Free-Credits nicht aus Kostengrund drastisch senken. Wenn ihr reduzieren wollt, dann aus Conversion-/Produktstrategie, nicht wegen API-Verlust.

### B. Basis-User (`pro`, 15,99 EUR)

Code-Realitaet:

- 60 Credits/Monat
- Haiku-Chat
- Plaene bis 3 Tage
- Wochenreview
- keine Fotos, kein Smart Log, kein Premium-Chat, kein CSV

Realistisches Power-Profil:

| Aktion | Menge | Credits | API-Kosten |
|---|---:|---:|---:|
| Chat Haiku | 20 | 20 | 0,15 EUR |
| 3-Tage-Plan | 4 | 20 | 0,45 EUR |
| Wochenreview Basis | 4 | 16 | 0,27 EUR |
| Summe | - | 56 | 0,87 EUR |

Deckungsbeitrag:

| Position | Betrag |
|---|---:|
| Umsatz | 15,99 EUR |
| API-Kosten | -0,87 EUR |
| Stripe Payments ca. 1,5% + 0,25 | -0,49 EUR |
| Stripe Billing 0,7% optional | -0,11 EUR |
| Deckungsbeitrag vor Shared Infra | ca. 14,52 EUR |

Basis ist sehr profitabel. Das Risiko ist eher Produktpositionierung: 15,99 EUR liegt ueber Yazio/Lifesum-Jahresplan-Aequivalenten, aber mit KI-Plan/Review ist es plausibel.

### C. Premium / Pro+ User (`pro_plus`, 49,99 EUR)

Code-Realitaet:

- 250 Credits/Monat
- Sonnet-Chat
- 7-Tage-Plaene
- Fotoanalyse, Chat-Bild, Smart Log, Barcode, CSV, Monatsreport, Janine-Direkt
- Monatsreport und Weekly Coaching laufen ohne Credit-Abzug
- Janine-Direkt verursacht keine API-Kosten, aber menschliche Arbeitszeit

Realistisches Power-Profil:

| Aktion | Menge | Credits | API-Kosten |
|---|---:|---:|---:|
| Smart Log | 30 | 60 | 0,08 EUR |
| Foto-Analyse | 20 | 60 | 0,42 EUR |
| Premium Chat | 49 | 98 | 1,13 EUR |
| Chat mit Bild | 4 | 12 | 0,21 EUR |
| 7-Tage-Plan | 3 | 15 | 0,62 EUR |
| Wochenreview Premium | 1 | 4 | 0,11 EUR |
| Monatsreport Cron | 1 | 0 | 0,04 EUR |
| Weekly Coaching | 4 | 0 | 0,01 EUR |
| CSV-Import typisch | 1 | 0 | 0,02 EUR |
| Summe | - | 249 | 2,63 EUR |

Deckungsbeitrag ohne Human-Cost:

| Position | Betrag |
|---|---:|
| Umsatz | 49,99 EUR |
| API-Kosten | -2,63 EUR |
| Stripe Payments ca. 1,5% + 0,25 | -1,00 EUR |
| Stripe Billing 0,7% optional | -0,35 EUR |
| Deckungsbeitrag vor Shared Infra und Janine | ca. 46,01 EUR |

**Janine-Direkt-Break-even:** Bei angenommenen internen Kosten von 60 EUR/Stunde bleiben nach API/Payment grob 45 EUR. Das sind ca. 45 Minuten Janine-Zeit pro Premium-User und Monat vor sonstigen Gemeinkosten. Realistisch sollte Pro+ daher maximal ca. **20-30 Minuten Janine-Zeit pro Monat** enthalten, wenn Marge fuer Support, Akquise, Steuern und Produktentwicklung bleiben soll.

Empfehlung: Janine-Direkt nicht als unbegrenzten Chat verkaufen. Besser: "2 direkte Fragen pro Monat" oder "asynchrones Feedback innerhalb von 24-48h, fair use, max. X Threads".

## Phase 4: Gesamtmodell fuer 100 User

Annahme wie in der Aufgabenstellung:

- 75 Free
- 20 Basis
- 5 Premium

### Umsatz

| Plan | User | Preis | Umsatz |
|---|---:|---:|---:|
| Free | 75 | 0,00 EUR | 0,00 EUR |
| Basis | 20 | 15,99 EUR | 319,80 EUR |
| Premium | 5 | 49,99 EUR | 249,95 EUR |
| Gesamt | 100 | - | 569,75 EUR |

### Kosten Baseline

| Kostenblock | Betrag |
|---|---:|
| Free API: 75 x 0,12 EUR | 8,69 EUR |
| Basis API: 20 x 0,87 EUR | 17,48 EUR |
| Premium API: 5 x 2,63 EUR | 13,12 EUR |
| API gesamt | 39,28 EUR |
| Stripe Payments + Billing | 18,78 EUR |
| Plattform-Reserve bei 100 Usern | 63,00 EUR |
| Kosten gesamt | 121,07 EUR |
| Deckungsbeitrag | 448,68 EUR |
| Marge | 78,8% |

**Kein API-Margen-Alarm** in der Baseline.

### Worst-Case innerhalb des Credit-Systems

| Plan | Worst Case | API-Kosten / User |
|---|---|---:|
| Free | 15 Haiku-Chats | 0,12 EUR |
| Basis | 12 x 3-Tage-Plan | 1,34 EUR |
| Premium | 50 x 7-Tage-Plan | 10,25 EUR |

Selbst dieser Credit-Max-Worst-Case bleibt bei aktuellen offiziellen Preisen positiv. Der Premium-User haette dann immer noch grob 38 EUR vor Shared Infra und Human-Cost.

### Echter Worst-Case ausserhalb des Credit-Systems

| Risiko | Warum gefaehrlich | Sofortmassnahme |
|---|---|---|
| Tracker-Wochencheck | Free/User kann Sonnet ohne Credits wiederholt starten | Plan-Gate + Credit-Abzug + Rate-Limit |
| CSV-Import | kein Credit-Abzug, grosse Dateien, max 16k Output | 3-5 Credits, Token-/Zeilenlimit, deterministischer Parser |
| Janine-Direkt | unbegrenzte Human-Arbeit moeglich | monatliche Frage-/Thread-Limits |
| Monatsreport | Credit-Konstante ungenutzt | bewusst als inkludierten Premium-Cron behandeln und loggen |
| Weekly Coaching | Premium-Cron ohne Credits | loggen, batchen, ggf. Haiku beibehalten |

## Phase 5: Benchmarking

Oeffentliche Consumer-Tracking-Apps liegen typischerweise niedriger als Nutriva-AI Basis, bieten aber auch weniger personalisierte KI-Ausgabe:

| Anbieter | Typische Positionierung | Preisniveau grob |
|---|---|---|
| Yazio | Kalorientracker, Freemium, PRO oft Jahresabo/Promos | ca. 5-7 EUR/Monat aequivalent, stark schwankend |
| Lifesum | Tracker, Plaene, Rezepte | ca. 7-10 USD/EUR monatlich, Jahresangebote niedriger |
| MyFitnessPal | grosser Tracker, Premium | ca. 10-20 USD/Monat je Region/Billing |
| Noom | psychologisches Coaching / Habit-Programm | ca. 50-70 USD/Monat bei Monatsplan, Jahresplaene niedriger |
| Oviva | erstattete Versorgung | fuer User oft 0 EUR, Kosten liegen bei Kasse |

Interpretation:

- **Basis 15,99 EUR** ist teuer fuer einen reinen Tracker, aber vertretbar fuer KI-Plan + Review.
- **Premium 49,99 EUR** ist nicht mit Yazio/Lifesum zu vergleichen. Das muss wie "AI + menschliche Ernaehrungsberatung light" positioniert werden.
- Pro+ funktioniert nur, wenn Janine-Direkt sichtbar wertvoll und gleichzeitig operativ begrenzt ist.

## Pricing- und Credit-Empfehlungen

### 1. Free Credits

**Empfehlung:** Free bei 10-15 Credits lassen, aber KI-Features eng halten.

Optionen:

| Option | API-Auswirkung | Conversion-Auswirkung |
|---|---:|---|
| Free 15 Credits behalten | max ca. 0,12 EUR/User | beste Aktivierung |
| Free auf 10 Credits senken | spart nur ca. 0,04 EUR/User | etwas mehr Upgrade-Druck |
| Free auf 5 Credits senken | spart nur ca. 0,08 EUR/User | Risiko: zu wenig Aha-Moment |
| Free ohne KI | spart minimal mehr | schlechter Produkttest |

Kostenlogisch lohnt sich eine aggressive Free-Kuerzung nicht. Besser: Free als Chat-Demo behalten, aber keine teuren Features oeffnen.

### 2. Basis-Preis

**Empfehlung:** Launch-Preis 15,99 EUR behalten oder auf 19,99 EUR testen, aber nicht aus API-Kostendruck.

Basis hat sehr hohe Marge. Eine Preiserhoehung sollte nur passieren, wenn Positionierung und Zahlungsbereitschaft es tragen. Ein sinnvoller Test:

- Monthly: 15,99 EUR oder 19,99 EUR
- Annual: 149-179 EUR/Jahr
- Messaging: "KI-Ernaehrungsplan + Wochenreview", nicht "Kalorientracker"

### 3. Premium / Pro+

**Empfehlung:** 49,99 EUR ist API-seitig sicher, aber nur mit klaren Janine-Limits.

Moegliche bessere Tier-Architektur:

| Tier | Preis | Credits | Enthalten |
|---|---:|---:|---|
| Free | 0 EUR | 10-15 | Chat-Demo, manuelles Tagebuch, Tracker |
| Basis | 15,99-19,99 EUR | 60 | Haiku-Chat, 3-Tage-Plaene, Wochenreview |
| Premium AI | 29,99-34,99 EUR | 150 | Sonnet-Chat, Smart Log, Foto, 7-Tage-Plan, Monatsreport |
| Janine+ | 49,99-69,99 EUR | 250 | Premium AI + 2 direkte Janine-Fragen/Monat |

Das trennt API-Kosten von Human-Cost und verhindert, dass ein einzelner Heavy-Coaching-User die Marge zerstoert.

### 4. Credit-Anpassung pro Aktion

Aktuelle 5 Credits fuer jeden Plan sind zu grob.

Empfohlene Staffel:

| Aktion | Aktuell | Empfehlung |
|---|---:|---:|
| Chat Free/Basis | 1 | 1 |
| Premium Chat | 2 | 2 |
| Smart Log | 2 | 1-2 |
| Foto-Analyse | 3 | 3 |
| Chat mit Bild | 3 | 4 |
| 1-Tage-Plan | 5 | 3 |
| 3-Tage-Plan | 5 | 5 |
| 7-Tage-Plan | 5 | 8-10 |
| Wochenreview | 4 | 4 |
| Monatsreport | 7 | 0 wenn inkludierter Premium-Cron, sonst 7 bei manueller Generierung |
| CSV-Import | 0 | 3-5 |
| Tracker-Wochencheck | 0 | 3-4 oder Feature entfernen zugunsten Chat-Review |

### 5. Modell-Optimierung

Quick Wins:

1. **Tracker-Wochencheck absichern:** Feature-Gate `review`, `deductCredits(CREDIT_COSTS.review)`, `trackerLimiter` oder eigener Limiter.
2. **CSV-Import umbauen:** Lokaler Parser fuer bekannte CSV-Formate; LLM nur fuer Header-Mapping und 10-20 Beispielzeilen.
3. **Vision downsamplen:** Fuer Essensfotos reicht meist 1092px lange Kante. Opus 4.7 kann sonst bis ca. 4.784 Bildtokens nutzen.
4. **Fotoanalyse auf Sonnet/Haiku Vision testen:** Opus ist nicht zwingend noetig fuer einfache Kalorien-/Makro-Schaetzung.
5. **Prompt Caching fuer Chat/Review/Plan:** Statische System-Prompts sind lang. Cache-Reads kosten bei Anthropic nur 10% des normalen Inputpreises.
6. **Review-Kontext komprimieren:** Aktiver Plan wird im Chat-Review potentiell als volles JSON gesendet. Besser: Tages-/Makro-/Abweichungszusammenfassung.
7. **Plan-Output modularisieren:** 7-Tage-Plan erst kompakt generieren, Rezepte bei Klick nachgenerieren. Spart Output-Tokens und reduziert Truncation.
8. **Usage-Logging bauen:** Ohne echte Tokenzahlen bleibt Pricing zu sehr Schaetzung.

## 12-Monats-Forecast

Annahmen:

- Verteilung konstant: 75% Free, 20% Basis, 5% Premium.
- Free nutzt alle 15 Chat-Credits.
- Basis nutzt realistisches Power-Profil aus Phase 3.
- Premium nutzt realistisches Power-Profil aus Phase 3.
- Payment: Stripe Payments + optional Stripe Billing.
- Plattform-Reserve: 55 EUR Basis + 0,08 EUR/User + 30 EUR Sprung ab 900 Usern.
- Keine VAT-, Steuer-, Akquise-, Refund- oder Janine-Human-Costs enthalten.

| Monat | User | Free | Basis | Premium | Umsatz | API | Payment | Plattform | Deckungsbeitrag | Marge |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 75 | 20 | 5 | 570 EUR | 39 EUR | 19 EUR | 63 EUR | 449 EUR | 78,8% |
| 2 | 150 | 113 | 30 | 7 | 830 EUR | 58 EUR | 28 EUR | 67 EUR | 677 EUR | 81,7% |
| 3 | 220 | 165 | 44 | 11 | 1.253 EUR | 86 EUR | 41 EUR | 73 EUR | 1.053 EUR | 84,0% |
| 4 | 300 | 225 | 60 | 15 | 1.709 EUR | 118 EUR | 56 EUR | 79 EUR | 1.456 EUR | 85,2% |
| 5 | 400 | 300 | 80 | 20 | 2.279 EUR | 157 EUR | 75 EUR | 87 EUR | 1.960 EUR | 86,0% |
| 6 | 520 | 390 | 104 | 26 | 2.963 EUR | 204 EUR | 98 EUR | 97 EUR | 2.564 EUR | 86,5% |
| 7 | 650 | 488 | 130 | 32 | 3.678 EUR | 254 EUR | 121 EUR | 107 EUR | 3.196 EUR | 86,9% |
| 8 | 780 | 585 | 156 | 39 | 4.444 EUR | 306 EUR | 147 EUR | 117 EUR | 3.874 EUR | 87,2% |
| 9 | 900 | 675 | 180 | 45 | 5.128 EUR | 354 EUR | 169 EUR | 157 EUR | 4.448 EUR | 86,7% |
| 10 | 1.000 | 750 | 200 | 50 | 5.698 EUR | 393 EUR | 188 EUR | 165 EUR | 4.952 EUR | 86,9% |
| 11 | 1.100 | 825 | 220 | 55 | 6.267 EUR | 432 EUR | 207 EUR | 173 EUR | 5.456 EUR | 87,0% |
| 12 | 1.200 | 900 | 240 | 60 | 6.837 EUR | 471 EUR | 225 EUR | 181 EUR | 5.959 EUR | 87,2% |

### Forecast-Interpretation

Die Marge skaliert gut, weil die teuersten AI-Aktionen immer noch Cent-Betraege kosten. Das Modell kippt nicht wegen LLM-Kosten, sondern wegen:

- unbegrenzter menschlicher Beratung,
- unkontrollierten uncredited Endpunkten,
- fehlender Observability,
- und potenzieller Akquise-/Refund-/Support-Kosten, die hier nicht enthalten sind.

## Konkrete Prioritaeten

### Sofort diese Woche

1. `/api/tracker/wochencheck` mit Basis-Gate, Credit-Abzug und Rate-Limit versehen.
2. CSV-Import mit Credit-Abzug und hartem Token-/Zeilenlimit versehen.
3. Logging fuer alle Anthropic/OpenAI-Calls einfuehren.
4. Model-/Credit-Beschreibungen korrigieren: Foto und Chat-Bild nutzen Opus, nicht Sonnet.
5. Janine-Direkt in Produkttext und Backend operational begrenzen.

### Naechster Sprint

1. Credit-Staffel fuer 1/3/7-Tage-Plaene umsetzen.
2. Prompt Caching fuer Chat und Plan evaluieren.
3. Fotoanalyse A/B mit Sonnet oder Haiku Vision testen.
4. Review-Kontext zusammenfassen statt grosse JSON-Bloecke zu senden.
5. Admin-Dashboard fuer `cost_eur`, `credits_charged`, `cost_per_credit`, `cost_per_plan` bauen.

### Pricing-Entscheidung

Meine Empfehlung:

- Free: 15 Credits vorerst behalten.
- Basis: 15,99 EUR fuer Launch behalten; spaeter 19,99 EUR testen.
- Premium: 49,99 EUR nur mit Janine-Limit. Alternativ Premium AI fuer 29,99-34,99 EUR und Janine+ fuer 59-69 EUR.
- 7-Tage-Plan auf 8-10 Credits setzen.
- CSV und Tracker-Wochencheck nie kostenlos/uncredited lassen.

## Endfazit

**Kein ALARM wegen API-Margen bei der aktuellen offiziellen Preisbasis.**  
**ALARM wegen uncredited Sonnet/Haiku-Endpunkten und unlimitierter Human-Cost.**

Nutriva-AI kann mit der aktuellen Abo-Logik profitabel sein. Die naechste Arbeit sollte nicht "Preise hoch" sein, sondern "Kostenkontrolle sauber machen": jede KI-Aktion loggen, jede user-ausgeloeste KI-Aktion entweder gaten oder bepreisen, und Janine-Direkt als knappes Premium-Gut modellieren.
