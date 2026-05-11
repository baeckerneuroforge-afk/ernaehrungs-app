// v3 — Auth-Flow-Härtung.
//
// Vorgeschichte:
//   v1: Network-first für Navigation. Hat Clerks Sign-up-Handshake gestört
//       und einen Reload-Loop ausgelöst, weil der SW Set-Cookie + Redirect-
//       Antworten nicht zuverlässig durchgereicht hat.
//   v2: Navigation-Requests werden komplett ignoriert (Browser nativ).
//       Hat den Loop für neue User behoben. ABER: User mit v1 im Browser
//       müssen den SW erst updaten — der erste Sign-up-Versuch nach dem
//       Deployment läuft ggf. noch unter v1.
//   v3 (jetzt): Belt-and-Suspenders.
//       - skipWaiting + clients.claim räumen den alten SW sofort weg
//         (statt erst beim nächsten Tab-Close zu greifen).
//       - Beim Activate werden ALLE alten Caches gelöscht (auch v1, v2).
//       - Explizite Skip-Liste für alle Auth-/Onboarding-Pfade, falls
//         jemals ein Same-Origin-fetch dorthin geht, der nicht "navigate"
//         mode ist (z.B. prefetch, RSC payloads).
//       - Cross-Origin Requests (Clerk, PostHog) sowieso nicht intercepten.

const CACHE_NAME = "ea-app-v3";

const AUTH_PATHS = [
  "/sign-in",
  "/sign-up",
  "/auth-callback",
  "/onboarding",
];

function isAuthPath(url) {
  try {
    const u = new URL(url);
    return AUTH_PATHS.some((p) => u.pathname === p || u.pathname.startsWith(p + "/"));
  } catch {
    return false;
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Alte Caches (ea-app-v1, ea-app-v2, anonymous) komplett räumen,
      // damit kein veralteter Asset-Build noch im Browser sitzt.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Cross-origin → nicht anfassen (Clerk-CDN, PostHog, Anthropic, Supabase…).
  if (new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Non-GET und API-/Auth-API-Routen → nicht anfassen.
  if (
    req.method !== "GET" ||
    req.url.includes("/api/") ||
    req.url.includes("/auth/")
  ) {
    return;
  }

  // Navigation-Requests bleiben dem Browser überlassen — Intercepten
  // bricht Clerks Set-Cookie + Redirect-Flow (Reload-Loop in v1).
  if (req.mode === "navigate") {
    return;
  }

  // Belt-and-Suspenders: selbst Non-Navigation-Requests auf Auth-Pfade
  // (RSC-Payloads, Prefetches) gehen direkt ans Netzwerk, ohne Cache.
  if (isAuthPath(req.url)) {
    return;
  }

  // Stale-while-revalidate für Assets.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetching = fetch(req)
        .then((response) => {
          // Nur erfolgreiche, vollständige Responses cachen.
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetching;
    })
  );
});
