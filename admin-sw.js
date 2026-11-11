// Service worker del panel Admin: abre rápido y permite instalar como app.
// Los datos (Firestore / ImgBB) siempre van directos a la red.
const CACHE = "admin-shell-v1";
const SHELL = ["./admin.html", "./admin-manifest.json", "./admin-icon-192.png", "./admin-icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Firebase, ImgBB, fuentes: red directa
  // Red primero (siempre la última versión del admin), caché si no hay conexión
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./admin.html")))
  );
});
