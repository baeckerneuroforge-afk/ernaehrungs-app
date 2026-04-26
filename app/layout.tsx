import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { deDE } from "@clerk/localizations";
import { CookieBanner } from "@/components/cookie-banner";
import { CreditWarning } from "@/components/credit-warning";
import { PageTransition } from "@/components/layout/page-transition";
import { Toaster } from "sonner";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

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
    <html lang="de">
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
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
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
