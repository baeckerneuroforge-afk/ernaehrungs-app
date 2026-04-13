// HTML email templates. All in the Nutriva brand: sage green #2D6A4F, warm
// off-white background #FAFAF5, pill-shaped CTA buttons, DM Sans-ish stack.
// Keep markup inline-style only — many mail clients strip <style> blocks.

const HEADER = `
  <div style="background-color: #2D6A4F; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <span style="color: white; font-size: 20px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">🌿 Nutriva-AI</span>
  </div>
`;

const FOOTER = `
  <div style="padding: 16px; text-align: center; color: #A8A29E; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <p style="margin: 4px 0;">Nutriva-AI · Hephaistos Systems · Alicenstraße 48 · 35390 Gießen</p>
    <p style="margin: 4px 0;"><a href="https://www.nutriva-ai.de/datenschutz" style="color: #A8A29E;">Datenschutz</a> · <a href="https://www.nutriva-ai.de/impressum" style="color: #A8A29E;">Impressum</a></p>
  </div>
`;

function wrap(content: string): string {
  return `
    <div style="max-width: 560px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FAFAF5; border-radius: 12px; overflow: hidden; border: 1px solid #E7E5E4;">
      ${HEADER}
      <div style="padding: 32px 24px;">
        ${content}
      </div>
      ${FOOTER}
    </div>
  `;
}

function button(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${href}" style="display: inline-block; background: #2D6A4F; color: white; padding: 12px 32px; border-radius: 50px; text-decoration: none; font-weight: 600;">${label}</a>
    </div>
  `;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export const emailTemplates = {
  welcome: (name: string): EmailTemplate => ({
    subject: "Willkommen bei Nutriva! 🌿",
    html: wrap(`
      <h2 style="color: #1C1917; margin: 0 0 16px;">Hallo ${name}!</h2>
      <p style="color: #57534E; line-height: 1.6;">Schön, dass du dabei bist. Deine persönliche Ernährungsberatung wartet auf dich.</p>
      <p style="color: #57534E; line-height: 1.6;">Du hast <strong>15 kostenlose Credits</strong> zum Ausprobieren. Starte jetzt mit deiner ersten Frage im Chat.</p>
      ${button("https://www.nutriva-ai.de/chat", "Zum Chat →")}
      <p style="color: #A8A29E; font-size: 13px;">Du hast dich mit dieser E-Mail-Adresse registriert. Falls das nicht du warst, kontaktiere uns unter kontakt@nutriva-ai.de.</p>
    `),
  }),

  subscriptionConfirmed: (
    name: string,
    plan: string,
    price: string
  ): EmailTemplate => ({
    subject: `Dein ${plan}-Plan ist aktiv! 🎉`,
    html: wrap(`
      <h2 style="color: #1C1917; margin: 0 0 16px;">Hallo ${name}!</h2>
      <p style="color: #57534E; line-height: 1.6;">Dein <strong>${plan}-Plan</strong> (${price}/Monat) ist jetzt aktiv.</p>
      <p style="color: #57534E; line-height: 1.6;">Du hast jetzt Zugriff auf alle ${plan}-Features. Viel Spaß!</p>
      ${button("https://www.nutriva-ai.de/billing", "Abo verwalten →")}
    `),
  }),

  subscriptionCancelled: (name: string, endDate: string): EmailTemplate => ({
    subject: "Dein Abo wurde gekündigt",
    html: wrap(`
      <h2 style="color: #1C1917; margin: 0 0 16px;">Hallo ${name},</h2>
      <p style="color: #57534E; line-height: 1.6;">Dein Abo wurde gekündigt. Du hast noch bis zum <strong>${endDate}</strong> Zugriff auf alle Features.</p>
      <p style="color: #57534E; line-height: 1.6;">Danach wechselst du automatisch auf den kostenlosen Plan (15 Credits/Monat).</p>
      <p style="color: #57534E; line-height: 1.6;">Du kannst jederzeit wieder upgraden.</p>
    `),
  }),

  creditsLow: (name: string, remaining: number): EmailTemplate => ({
    subject: `Nur noch ${remaining} Credits übrig`,
    html: wrap(`
      <h2 style="color: #1C1917; margin: 0 0 16px;">Hallo ${name},</h2>
      <p style="color: #57534E; line-height: 1.6;">Du hast nur noch <strong>${remaining} Credits</strong> übrig.</p>
      <p style="color: #57534E; line-height: 1.6;">Damit du weiterhin Fragen stellen und Pläne erstellen kannst, lade Credits nach oder upgrade deinen Plan.</p>
      ${button("https://www.nutriva-ai.de/billing", "Credits nachkaufen →")}
    `),
  }),

  inactiveWarning: (name: string): EmailTemplate => ({
    subject: "Wir vermissen dich! 🌿",
    html: wrap(`
      <h2 style="color: #1C1917; margin: 0 0 16px;">Hallo ${name},</h2>
      <p style="color: #57534E; line-height: 1.6;">Du warst seit fast einem Jahr nicht mehr aktiv. Dein Account und alle Daten werden in 30 Tagen automatisch gelöscht.</p>
      <p style="color: #57534E; line-height: 1.6;">Möchtest du deinen Account behalten? Melde dich einfach einmal an:</p>
      ${button("https://www.nutriva-ai.de/chat", "Jetzt anmelden →")}
      <p style="color: #A8A29E; font-size: 13px;">Falls du deinen Account löschen möchtest, musst du nichts tun — er wird automatisch entfernt.</p>
    `),
  }),

  accountDeleted: (name: string): EmailTemplate => ({
    subject: "Dein Account wurde gelöscht",
    html: wrap(`
      <h2 style="color: #1C1917; margin: 0 0 16px;">Hallo ${name},</h2>
      <p style="color: #57534E; line-height: 1.6;">Dein Account und alle zugehörigen Daten wurden gelöscht.</p>
      <p style="color: #57534E; line-height: 1.6;">Wir hoffen, die App hat dir geholfen. Falls du zurückkommen möchtest, kannst du dich jederzeit neu registrieren.</p>
      <p style="color: #57534E; line-height: 1.6;">Alles Gute! 🌿</p>
    `),
  }),

  weeklyReviewReminder: (name: string): EmailTemplate => ({
    subject: "Dein Wochenrückblick wartet! 📊",
    html: wrap(`
      <h2 style="color: #1C1917; margin: 0 0 16px;">Hallo ${name},</h2>
      <p style="color: #57534E; line-height: 1.6;">Es ist Sonntag — Zeit für deinen Wochenrückblick! Die KI analysiert deine Woche und gibt dir Tipps für die nächste.</p>
      ${button("https://www.nutriva-ai.de/chat", "Review starten →")}
    `),
  }),

  monthlyReportReady: (name: string, month: string): EmailTemplate => ({
    subject: `Dein Monatsreport für ${month} ist da! 📈`,
    html: wrap(`
      <h2 style="color: #1C1917; margin: 0 0 16px;">Hallo ${name},</h2>
      <p style="color: #57534E; line-height: 1.6;">Dein persönlicher Fortschrittsreport für <strong>${month}</strong> ist fertig. Gewichtsverlauf, Ernährungsanalyse und Empfehlungen warten auf dich.</p>
      ${button("https://www.nutriva-ai.de/reports", "Report ansehen →")}
    `),
  }),
};
