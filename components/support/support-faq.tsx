"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PLAN_CREDITS } from "@/lib/plans";

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Wie funktioniert das Credit-System?",
    answer: `Jede Chat-Nachricht kostet 1 Credit, ein kompletter Ernährungsplan 5 Credits und ein Wochenreview 4 Credits. Im Free-Plan bekommst du ${PLAN_CREDITS.free} Credits, im Basis-Plan ${PLAN_CREDITS.pro} und im Premium-Plan ${PLAN_CREDITS.pro_plus} pro Monat. Ungenutzte Abo-Credits verfallen am Monatsende — zusätzlich gekaufte Top-up-Credits bleiben erhalten.`,
  },
  {
    question: "Wie kann ich mein Abo kündigen?",
    answer:
      "Du kannst dein Abo jederzeit in deinem Profil unter „Einstellungen“ kündigen — oder schreib uns eine kurze Nachricht an kontakt@nutriva-ai.de. Dein Zugang bleibt bis zum Ende des bezahlten Zeitraums aktiv, danach wechselst du automatisch in den Free-Plan.",
  },
  {
    question: "Wie lösche ich meinen Account?",
    answer:
      "Im Profil findest du unter „Gefahrenbereich“ die Option, deinen Account vollständig zu löschen. Damit werden alle deine Daten (Profil, Tagebuch, Chats, Pläne) unwiderruflich entfernt. Ein Export deiner Daten ist vor der Löschung möglich.",
  },
  {
    question: "Warum kann ich keinen Ernährungsplan erstellen?",
    answer:
      "Personalisierte Ernährungspläne sind ab dem Basis-Plan verfügbar. Im Free-Plan kannst du den Chat, das Tagebuch und den Tracker kostenlos nutzen. Upgrade jederzeit über die Pricing-Seite, um Pläne und Wochenreview freizuschalten.",
  },
  {
    question: "Wie kann ich meine Einwilligung widerrufen?",
    answer:
      "Deine KI- und Review-Einwilligungen kannst du jederzeit in deinem Profil unter „Einstellungen“ widerrufen. Nach dem Widerruf verarbeiten wir keine neuen Daten mehr mit der KI. Bereits erstellte Chats bleiben bestehen, bis du sie oder deinen Account löschst.",
  },
  {
    question: "Ersetzt die App eine ärztliche Beratung?",
    answer:
      "Nein. Die App ist eine Ergänzung, kein Ersatz. Sie gibt allgemeine Ernährungsempfehlungen basierend auf geprüftem Wissen. Bei Krankheiten, Beschwerden oder medizinischen Fragen wende dich bitte immer an deinen Arzt oder deine Ärztin.",
  },
];

export function SupportFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      {FAQ_ITEMS.map((item, i) => {
        const open = openIndex === i;
        return (
          <div
            key={item.question}
            className="border-b border-border last:border-b-0"
          >
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex items-center justify-between gap-4 w-full px-5 py-4 text-left group"
            >
              <span className="text-sm sm:text-[15px] font-medium text-ink group-hover:text-primary transition-colors">
                {item.question}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-ink-faint flex-shrink-0 transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                open ? "max-h-96" : "max-h-0"
              }`}
            >
              <p className="px-5 pb-4 text-sm text-ink-muted leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
