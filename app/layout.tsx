import type { Metadata, Viewport } from "next";
import { DM_Sans, Lora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { deDE } from "@clerk/localizations";
import { CookieBanner } from "@/components/cookie-banner";
import { CreditWarning } from "@/components/credit-warning";
import { PageTransition } from "@/components/layout/page-transition";
import { Toaster } from "sonner";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

// Self-hosted Fonts via next/font (P7) — kein render-blockierender Google-CDN-
// @import mehr, kein externer Request, kein Layout-Shift. Exponiert als
// CSS-Variablen, die globals.css + tailwind.config referenzieren.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nutriva-AI – Deine persönliche KI-Ernährungsberaterin",
  description:
    "Nutriva-AI: Personalisierte Ernährungsberatung mit KI. Basierend auf dem Wissen einer Ernährungswissenschaftlerin.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Nutriva-AI – Deine persönliche KI-Ernährungsberaterin",
    description:
      "Personalisierte Ernährungsberatung mit KI. Basierend auf dem Wissen einer Ernährungswissenschaftlerin.",
    url: "https://www.nutriva-ai.de",
    siteName: "Nutriva-AI",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nutriva-AI – KI-Ernährungsberatung",
    description: "Personalisierte Ernährungsberatung mit KI.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nutriva-AI",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2D6A4F",
};

export const dynamic = "force-dynamic";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shell = (
    <html lang="de" className={`${dmSans.variable} ${lora.variable}`}>
      <head>
        {/* Theme boot — run before paint to avoid flash of wrong theme.
            Reads 'theme' from localStorage ('light' | 'dark' | 'system'),
            falls back to 'system' which honors prefers-color-scheme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <PostHogProvider>
        <CreditWarning />
        <PageTransition>{children}</PageTransition>
        <CookieBanner />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
            },
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            // Der Query-String erzwingt einen Byte-Unterschied, wenn sich
            // die Version ändert → Browser holt sw.js neu und installiert
            // die aktuelle Variante (Auth-Hardening v3) sofort, statt auf
            // den nächsten Tab-Close zu warten. Der SW liegt physisch
            // weiterhin auf /sw.js; der ?v wird vom Server ignoriert, aber
            // vom Browser für die SW-Identität ausgewertet.
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js?v=3').then(function(r){r.update()}).catch(function(){})}`,
          }}
        />
        </PostHogProvider>
      </body>
    </html>
  );

  if (!clerkKey) {
    return shell;
  }

  return <ClerkProvider localization={deDE}>{shell}</ClerkProvider>;
}
