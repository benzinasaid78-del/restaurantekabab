// Service worker for Doner Kebab Lahori — makes the site installable as an app
// and (once Firebase Cloud Messaging is wired up) able to show push notifications.
//
// Bump this version string whenever you want returning visitors to pick up a fresh
// copy of the cached page instead of an old one.
const CACHE_NAME = "doner-lahori-shell-v1";
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
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html"))
    );
  }
});

// ---- Push notifications ----
// This fires when a push message arrives (sent later via Firebase Cloud Messaging
// from a Cloud Function, e.g. when an order's status changes).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Doner Kebab Lahori", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Doner Kebab Lahori";
  const options = {
    body: data.body || "",
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: data.url || "./",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clicking the notification focuses an open tab if there is one, otherwise opens a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
