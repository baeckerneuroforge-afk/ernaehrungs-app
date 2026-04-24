import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Impressum – Nutriva-AI",
  description: "Impressum und rechtliche Angaben gemäß § 5 TMG.",
};

export default function ImpressumPage() {
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
              Impressum
            </h1>
            <div className="h-1 w-16 bg-sage rounded-full" />
          </header>

          <div className="prose-legal space-y-10 text-warm-text">
            <Section title="Angaben gemäß § 5 TMG">
              <p>
                André Bäcker
                <br />
                Nutriva-AI
                <br />
                Hopstener Straße 25
                <br />
                49479 Ibbenbüren
                <br />
                Deutschland
              </p>
            </Section>

            <Section title="Kontakt">
              <p>
                Telefon: +49 (0) 176 21878801
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

            <Section title="Umsatzsteuer">
              <p>
                Steuernummer: 020 803 04663
                <br />
                Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE459461407
              </p>
            </Section>

            <Section title="Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV">
              <p>
                André Bäcker
                <br />
                Hopstener Straße 25
                <br />
                49479 Ibbenbüren
                <br />
                Deutschland
              </p>
            </Section>

            <Section title="Haftung für Inhalte">
              <p>
                Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt.
                Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
                können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter
                sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen
                Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8
                bis 10 TMG sind wir als Diensteanbieter jedoch nicht
                verpflichtet, übermittelte oder gespeicherte fremde
                Informationen zu überwachen oder nach Umständen zu forschen,
                die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
            </Section>

            <Section title="Haftung für Links">
              <p>
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf
                deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
                diese fremden Inhalte auch keine Gewähr übernehmen. Für die
                Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
                oder Betreiber der Seiten verantwortlich.
              </p>
            </Section>

            <Section title="Urheberrecht">
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
                diesen Seiten unterliegen dem deutschen Urheberrecht. Die
                Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
                Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
                schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
            </Section>

            <Section title="Streitschlichtung">
              <p>
                Die Europäische Kommission stellt eine Plattform zur
                Online-Streitbeilegung (OS) bereit:{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                .
                <br />
                Wir sind nicht bereit oder verpflichtet, an
                Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
                teilzunehmen.
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
