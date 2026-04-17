import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Datenschutzerklärung – Ernährungsberatung",
  description:
    "Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
};

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-bg">
      <Navbar />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <header className="mb-12">
            <Link
              href="/"
              className="text-sm text-warm-muted hover:text-primary transition inline-flex items-center gap-1 mb-6"
            >
              ← Zurück zur Startseite
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-warm-dark mb-3">
              Datenschutzerklärung
            </h1>
            <div className="h-1 w-16 bg-sage rounded-full" />
            <p className="text-sm text-warm-muted mt-4">
              Stand: April 2026
            </p>
          </header>

          <div className="space-y-10 text-warm-text">
            <Section title="Verantwortliche Stelle">
              <p>
                André Bäcker
                <br />
                Hephaistos Systems
                <br />
                Alicenstraße 48
                <br />
                35390 Gießen
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:kontakt@nutriva-ai.de"
                  className="text-primary hover:underline"
                >
                  kontakt@nutriva-ai.de
                </a>
              </p>
            </Section>

            <Section title="Welche Daten wir erheben">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Registrierungsdaten:</strong> E-Mail, Name (über
                  Clerk, USA, EU-Standardvertragsklauseln)
                </li>
                <li>
                  <strong>Profildaten:</strong> Alter, Geschlecht, Größe,
                  Gewicht, Allergien, Krankheiten, Ernährungsform
                </li>
                <li>
                  <strong>Nutzungsdaten:</strong> Ernährungstagebuch,
                  Gewichtsverlauf, Chat-Verläufe, Ernährungspläne, Ziele
                </li>
                <li>
                  <strong>Zahlungsdaten:</strong> über Stripe (USA,
                  EU-Standardvertragsklauseln) — wir speichern keine
                  Kreditkartendaten
                </li>
                <li>
                  <strong>Technische Daten:</strong> IP-Adresse, Browser,
                  Geräteinformationen (über Vercel)
                </li>
              </ul>
            </Section>

            <Section title="Zweck der Verarbeitung">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Bereitstellung personalisierter Ernährungsempfehlungen mittels
                  KI
                </li>
                <li>
                  KI-basierte Analyse von Gesundheitsdaten zur Erstellung von
                  Ernährungsplänen und Wochenreviews
                </li>
                <li>
                  Qualitätssicherung durch Einsicht ausgewählter Gespräche (nur
                  mit gesonderter Einwilligung)
                </li>
                <li>Zahlungsabwicklung</li>
              </ul>
            </Section>

            <Section title="Rechtsgrundlagen">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für die
                  KI-Verarbeitung von Gesundheitsdaten
                </li>
                <li>
                  Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) für die
                  Bereitstellung des Dienstes
                </li>
                <li>
                  Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung) für
                  Gesundheitsdaten
                </li>
              </ul>
            </Section>

            <Section title="Drittanbieter und Datenübermittlung in Drittländer">
              <ul className="list-disc pl-5 space-y-3">
                <li>
                  <strong>Anthropic (Claude API, USA):</strong> Anonymisierte
                  Gesundheitsdaten (ohne Name, E-Mail) werden zur KI-gestützten
                  Ernährungsberatung übermittelt. EU-Standardvertragsklauseln.
                  API-Daten werden nicht für KI-Training verwendet.
                </li>
                <li>
                  <strong>Anthropic Claude Vision (USA):</strong> Fotos von
                  Mahlzeiten werden über Claude Vision analysiert, um
                  Kaloriengehalt und Nährwerte zu schätzen. Es gelten die
                  gleichen EU-Standardvertragsklauseln wie für die
                  Chat-Verarbeitung. Bilder werden nicht für KI-Training
                  verwendet.
                </li>
                <li>
                  <strong>OpenAI (Embedding API, USA):</strong> User-Nachrichten
                  und Profilmerkmale werden für die Vektor-Suche in der
                  Wissensbasis verarbeitet. EU-Standardvertragsklauseln.
                </li>
                <li>
                  <strong>Clerk (USA):</strong> Authentifizierung. Speichert
                  E-Mail, Name, Login-History. EU-Standardvertragsklauseln.
                </li>
                <li>
                  <strong>Stripe (USA):</strong> Zahlungsabwicklung. Speichert
                  Zahlungsdaten. EU-Standardvertragsklauseln.
                </li>
                <li>
                  <strong>Supabase (EU, Frankfurt):</strong> Datenbankhosting.
                  Alle Nutzerdaten werden in der EU gespeichert.
                </li>
                <li>
                  <strong>Supabase Storage (EU, Frankfurt):</strong> Fotos von
                  Mahlzeiten werden in einem privaten, verschlüsselten Bucket
                  innerhalb der EU gespeichert und sind ausschließlich für den
                  jeweiligen Nutzer zugänglich. Bei Kontolöschung werden sie
                  automatisch mit entfernt.
                </li>
                <li>
                  <strong>Resend (USA):</strong> Versand transaktionaler
                  E-Mails (Willkommen, Abo-Bestätigung, Credit-Warnungen,
                  Erinnerungen, Monatsberichte, Account-Löschung).
                  Verarbeitet werden nur E-Mail-Adresse und Versandzeitpunkt.
                  EU-Standardvertragsklauseln.
                </li>
                <li>
                  <strong>Vercel (USA):</strong> Hosting. Speichert
                  Request-Logs. EU-Standardvertragsklauseln.
                </li>
                <li>
                  <strong>Upstash (USA):</strong> Redis-basiertes Rate-Limiting
                  zum Schutz vor Missbrauch. Gespeichert werden ausschließlich
                  die User-ID und Zeitstempel der Anfragen für maximal 24
                  Stunden. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
                  (berechtigtes Interesse an Missbrauchsschutz).
                  EU-Standardvertragsklauseln.
                </li>
                <li>
                  <strong>Sentry (Functional Software, Inc., USA):</strong>{" "}
                  Error-Monitoring. Bei Fehlern werden technische Metadaten
                  (Fehlertyp, Zeitstempel, betroffene Komponente, anonymisierte
                  User-ID) übertragen — keine Inhalte deiner Ernährungsdaten,
                  Nachrichten oder Fotos. Rechtsgrundlage: Art. 6 Abs. 1 lit. f
                  DSGVO (berechtigtes Interesse an Stabilität und
                  Sicherheit der App). EU-Standardvertragsklauseln.
                </li>
              </ul>
              <p className="mt-4 text-sm text-ink-muted">
                <strong>Auftragsverarbeitung (Art. 28 DSGVO):</strong> Mit allen
                Dienstleistern, die personenbezogene Daten in unserem Auftrag
                verarbeiten, haben wir Auftragsverarbeitungsverträge nach
                Art. 28 DSGVO abgeschlossen. Dies betrifft insbesondere Clerk,
                Supabase, Anthropic, OpenAI, Vercel, Stripe, Resend, Upstash
                und Sentry.
              </p>
            </Section>

            <Section title="Minderjährige">
              <p>
                Unsere Dienste richten sich an Personen ab 16 Jahren. Für
                Nutzer zwischen 13 und 15 Jahren ist die Einwilligung der
                Erziehungsberechtigten erforderlich (Art. 8 DSGVO). Nutzer
                unter 13 Jahren dürfen Nutriva-AI nicht nutzen. Sollten wir
                Kenntnis davon erlangen, dass ein Konto ohne erforderliche
                Einwilligung von einem Kind unter 16 Jahren angelegt wurde,
                löschen wir es unverzüglich.
              </p>
            </Section>

            <Section title="Speicherdauer">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Profil-, Nutzungs- und Chat-Daten: Solange der Account besteht
                </li>
                <li>
                  Fotos von Mahlzeiten: Solange der Account besteht. Bei
                  Kontolöschung werden sie innerhalb von 30 Tagen aus dem
                  Supabase Storage entfernt.
                </li>
                <li>
                  Bei Kontolöschung: Alle personenbezogenen Daten — inklusive
                  Fotos im Storage — werden innerhalb von 30 Tagen gelöscht.
                </li>
                <li>
                  Zahlungsdaten bei Stripe: Gemäß gesetzlicher
                  Aufbewahrungsfristen (6–10 Jahre)
                </li>
                <li>
                  Accounts die länger als 12 Monate inaktiv sind, werden nach
                  vorheriger Benachrichtigung automatisch gelöscht.
                </li>
              </ul>
            </Section>

            <Section title="Cookies">
              <p>
                Wir verwenden ausschließlich technisch notwendige Cookies für
                die Authentifizierung (Clerk Session-Cookie). Es werden keine
                Tracking-Cookies, Analyse-Cookies oder Marketing-Cookies
                eingesetzt.
              </p>
            </Section>

            <Section title="Ihre Rechte">
              <ul className="list-disc pl-5 space-y-2">
                <li>Auskunft (Art. 15 DSGVO)</li>
                <li>Berichtigung (Art. 16 DSGVO)</li>
                <li>
                  Löschung (Art. 17 DSGVO) — in der App unter Einstellungen
                  möglich
                </li>
                <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                <li>
                  Datenübertragbarkeit (Art. 20 DSGVO) — Export-Funktion in der
                  App unter Einstellungen
                </li>
                <li>Widerspruch (Art. 21 DSGVO)</li>
                <li>
                  Widerruf der Einwilligung jederzeit ohne Angabe von Gründen
                </li>
                <li>
                  Beschwerderecht bei der zuständigen Aufsichtsbehörde:
                  <br />
                  Der Hessische Beauftragte für Datenschutz und
                  Informationsfreiheit
                  <br />
                  Postfach 3163, 65021 Wiesbaden
                </li>
              </ul>
            </Section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-warm-dark mb-3">{title}</h2>
      <div className="text-sm leading-relaxed text-warm-text">{children}</div>
    </section>
  );
}
