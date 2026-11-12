// Service worker for Doner Kebab Lahori — makes the site installable as an app.
//
// Bump this version string whenever you want returning visitors to pick up a fresh
// copy of the cached page instead of an old one.
const CACHE_NAME = "doner-lahori-shell-v2";
const APP_SHELL = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Network-first for the page itself (so menu/price updates always show when online),
// falling back to the cached shell only when there's no connection at all.
self.addEventListener("fetch", (event) => {
  // El panel de administración (admin.html) es una página aparte: el service worker no la
  // toca nunca (ni la guarda en caché ni la sustituye por la web de clientes si no hay conexión).
  if (new URL(event.request.url).pathname.endsWith("/admin.html")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html"))
    );
  }
});
