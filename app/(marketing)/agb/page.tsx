import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "AGB – Ernährungsberatung",
  description:
    "Allgemeine Nutzungsbedingungen für die Ernährungsberatungs-App.",
};

export default function AgbPage() {
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
              Nutzungsbedingungen
            </h1>
            <div className="h-1 w-16 bg-sage rounded-full" />
            <p className="text-sm text-warm-muted mt-4">
              Ernährungsberatung by Janine · Stand: April 2026
            </p>
          </header>

          <div className="space-y-10 text-warm-text">
            <Section title="§ 1 Geltungsbereich">
              <p>
                Diese Nutzungsbedingungen gelten für die Nutzung der
                Ernährungsberatungs-App („App&ldquo;), betrieben von André
                Bäcker, Hephaistos Systems, Alicenstraße 48, 35390 Gießen
                („Betreiber&ldquo;).
              </p>
              <p className="mt-2">
                Mit der Registrierung akzeptiert der Nutzer diese
                Nutzungsbedingungen.
              </p>
            </Section>

            <Section title="§ 2 Leistungsbeschreibung">
              <p>
                Die App bietet KI-gestützte Ernährungsberatung auf Basis einer
                von einer studierten Ernährungswissenschaftlerin kuratierten
                Wissensbasis. Die Leistungen umfassen je nach gewähltem Plan:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>KI-Chat für Ernährungsfragen</li>
                <li>Personalisierte Ernährungspläne</li>
                <li>Wöchentliche KI-Reviews</li>
                <li>Ernährungstagebuch und Gewichtstracking</li>
                <li>
                  Direktnachrichten an die Ernährungswissenschaftlerin (nur
                  Premium)
                </li>
              </ul>
            </Section>

            <Section title="§ 3 Keine medizinische Beratung">
              <p>
                Die App bietet keine medizinische Beratung, Diagnose oder
                Therapie. Die KI-gestützten Empfehlungen ersetzen nicht die
                Beratung durch einen Arzt, Heilpraktiker oder zugelassenen
                Ernährungstherapeuten. Bei gesundheitlichen Beschwerden,
                Erkrankungen oder Essstörungen ist stets ärztlicher Rat
                einzuholen. Der Betreiber haftet nicht für gesundheitliche
                Folgen, die aus der Umsetzung von KI-generierten Empfehlungen
                entstehen.
              </p>
            </Section>

            <Section title="§ 4 Credit-System">
              <p>Die App nutzt ein Credit-basiertes Nutzungssystem:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  Jede Aktion (Chat, Ernährungsplan, Wochenreview) verbraucht
                  eine definierte Anzahl Credits.
                </li>
                <li>
                  Die monatlich im Abo enthaltenen Credits verfallen am Ende des
                  jeweiligen Abrechnungszeitraums und werden nicht in den
                  Folgemonat übertragen.
                </li>
                <li>Separat erworbene Credit-Top-Ups verfallen nicht.</li>
                <li>
                  Die aktuellen Credit-Kosten pro Aktion und die im jeweiligen
                  Plan enthaltenen Credits sind auf der Pricing-Seite einsehbar.
                </li>
              </ul>
            </Section>

            <Section title="§ 5 Abonnement und Kündigung">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Abonnements werden monatlich abgerechnet und verlängern sich
                  automatisch.
                </li>
                <li>
                  Die Kündigung ist jederzeit zum Ende des laufenden
                  Abrechnungszeitraums möglich.
                </li>
                <li>
                  Nach Kündigung bleibt der Zugang bis zum Ende des bezahlten
                  Zeitraums bestehen.
                </li>
                <li>
                  Die Kündigung erfolgt über die Profileinstellungen in der App
                  oder per E-Mail an{" "}
                  <a
                    href="mailto:kontakt@nutriva-ai.de"
                    className="text-primary hover:underline"
                  >
                    kontakt@nutriva-ai.de
                  </a>
                  .
                </li>
                <li>
                  Bei Kündigung verfallen nicht genutzte Abo-Credits. Separat
                  gekaufte Top-Up-Credits bleiben erhalten.
                </li>
              </ul>
            </Section>

            <Section title="§ 6 Widerrufsrecht">
              <p>
                Als Verbraucher haben Sie das Recht, binnen vierzehn Tagen ohne
                Angabe von Gründen diesen Vertrag zu widerrufen. Die
                Widerrufsfrist beträgt vierzehn Tage ab dem Tag des
                Vertragsschlusses. Um Ihr Widerrufsrecht auszuüben, müssen Sie
                uns (André Bäcker, Hephaistos Systems, Alicenstraße 48, 35390
                Gießen,{" "}
                <a
                  href="mailto:kontakt@nutriva-ai.de"
                  className="text-primary hover:underline"
                >
                  kontakt@nutriva-ai.de
                </a>
                ) mittels einer eindeutigen Erklärung über Ihren Entschluss,
                diesen Vertrag zu widerrufen, informieren.
              </p>
            </Section>

            <Section title="§ 7 Verfügbarkeit">
              <p>
                Der Betreiber bemüht sich um eine möglichst unterbrechungsfreie
                Verfügbarkeit der App. Ein Anspruch auf ständige Verfügbarkeit
                besteht nicht. Wartungsarbeiten, technische Störungen oder
                höhere Gewalt können zu vorübergehenden Einschränkungen führen.
              </p>
            </Section>

            <Section title="§ 8 Haftungsbeschränkung">
              <p>
                Der Betreiber haftet unbeschränkt für Vorsatz und grobe
                Fahrlässigkeit. Für leichte Fahrlässigkeit haftet der Betreiber
                nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf
                den vorhersehbaren, vertragstypischen Schaden. Die Haftung für
                Datenverlust wird auf den typischen Wiederherstellungsaufwand
                beschränkt, der bei regelmäßiger Datensicherung eingetreten
                wäre. Diese Beschränkungen gelten nicht für Schäden aus der
                Verletzung des Lebens, des Körpers oder der Gesundheit.
              </p>
            </Section>

            <Section title="§ 9 Datenschutz">
              <p>
                Die Erhebung und Verarbeitung personenbezogener Daten erfolgt
                gemäß unserer{" "}
                <Link href="/datenschutz" className="text-primary hover:underline">
                  Datenschutzerklärung
                </Link>
                .
              </p>
            </Section>

            <Section title="§ 10 Änderungen der Nutzungsbedingungen">
              <p>
                Der Betreiber behält sich vor, diese Nutzungsbedingungen mit
                angemessener Ankündigungsfrist zu ändern. Nutzer werden per
                E-Mail über Änderungen informiert. Bei Widerspruch steht dem
                Nutzer ein Sonderkündigungsrecht zu.
              </p>
            </Section>

            <Section title="§ 11 Schlussbestimmungen">
              <p>
                Es gilt das Recht der Bundesrepublik Deutschland. Ist der Nutzer
                Verbraucher, gelten zusätzlich die zwingenden
                Verbraucherschutzbestimmungen des Staates, in dem der Nutzer
                seinen gewöhnlichen Aufenthalt hat. Sollten einzelne
                Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen
                Bestimmungen unberührt.
              </p>
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
