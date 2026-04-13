import Link from "next/link";
import { Leaf, Instagram, Linkedin, Mail } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1C1917] text-stone-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10">
        {/* Top: logo + columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2 pr-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-serif text-xl tracking-tight flex items-baseline">
                <span className="font-bold text-white">Nutriva</span>
                <span className="font-normal text-sage">-AI</span>
              </span>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed max-w-xs mb-5">
              Fundierte Ernährungsberatung — personalisiert für dich, kuratiert
              von einer studierten Ernährungswissenschaftlerin.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white transition"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white transition"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="mailto:kontakt@nutriva-ai.de"
                aria-label="Email"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white transition"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <FooterColumn
            title="Produkt"
            links={[
              { href: "/chat", label: "Chat" },
              { href: "/ernaehrungsplan", label: "Ernährungsplan" },
              { href: "/tagebuch", label: "Tagebuch" },
              { href: "/tracker", label: "Tracker" },
              { href: "/blog", label: "Blog" },
            ]}
          />

          <FooterColumn
            title="Rechtliches"
            links={[
              { href: "/impressum", label: "Impressum" },
              { href: "/datenschutz", label: "Datenschutz" },
              { href: "/agb", label: "AGB" },
            ]}
          />

          <FooterColumn
            title="Support"
            links={[
              { href: "/support", label: "Hilfe & Kontakt" },
              { href: "/#faq", label: "Häufige Fragen" },
              { href: "mailto:kontakt@nutriva-ai.de", label: "kontakt@nutriva-ai.de" },
            ]}
          />
        </div>

        {/* Bottom strip */}
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-500">
            © {year} Nutriva-AI · Made with 🌱 in Deutschland
          </p>
          <p className="text-[11px] text-stone-600 text-center sm:text-right max-w-md leading-relaxed">
            Diese App ersetzt keine ärztliche Beratung. Bei gesundheitlichen
            Beschwerden wende dich bitte an deinen Arzt oder deine Ärztin.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-white tracking-wider uppercase mb-4">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-stone-400 hover:text-white transition"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
