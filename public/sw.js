/* Les 2 Palmiers — service worker minimal.
   Objectif : installabilité PWA + repli hors-ligne, SANS jamais casser une
   navigation en ligne. */
const CACHE = "l2p-v4";

// Sur l'ancien domaine Vercel, le SW se désinstalle (tout passe sur le domaine
// de marque). Évite un SW orphelin qui servirait des pages cassées.
if (self.location.hostname.endsWith(".vercel.app")) {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", async () => {
    await self.registration.unregister();
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.navigate(c.url));
  });
} else {

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add("/").catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // On ne touche qu'au GET same-origin. Jamais l'auth, l'API, les données RSC.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes("/_next/data")
  ) {
    return;
  }

  // Navigations : réseau d'abord. En cas d'échec réseau réel (hors-ligne),
  // on renvoie une page de secours — JAMAIS une réponse vide.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/");
        if (cached) return cached;
        return new Response(
          "<!doctype html><meta charset=utf-8><title>Hors ligne</title>" +
            "<body style='font:16px system-ui;padding:40px;text-align:center'>" +
            "<p>Connexion perdue.</p><button onclick='location.reload()'>Réessayer</button>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }),
    );
    return;
  }

  // Images optimisées Next : cache d'abord (sans bloquer si erreur).
  if (url.pathname.startsWith("/_next/image")) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => Response.error());
      }),
    );
  }
});

} // fin du bloc "domaine de marque"
