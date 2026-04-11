"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#FAFAF5",
          color: "#1C1917",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ padding: 40, textAlign: "center", maxWidth: 480 }}>
          <h2 style={{ color: "#2D6A4F", marginBottom: 12 }}>
            Etwas ist schiefgelaufen
          </h2>
          <p style={{ color: "#57534E", lineHeight: 1.6 }}>
            Der Fehler wurde automatisch gemeldet. Bitte versuche es erneut.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              background: "#2D6A4F",
              color: "white",
              border: "none",
              borderRadius: 50,
              padding: "12px 32px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Nochmal versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
