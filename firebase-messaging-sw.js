// This file MUST live at the root of the site (same folder as index.html) and be
// reachable at exactly /firebase-messaging-sw.js — the browser looks for it there.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Same config as index.html — the service worker runs separately from the page,
// so it needs its own copy to talk to the same Firebase project.
firebase.initializeApp({
  apiKey: "AIzaSyAZ9wZVHGjxzgyYaolaS9f5fmjQZpEYRgw",
  authDomain: "restaurante-5294c.firebaseapp.com",
  projectId: "restaurante-5294c",
  storageBucket: "restaurante-5294c.firebasestorage.app",
  messagingSenderId: "1066258853411",
  appId: "1:1066258853411:web:394e9948bdb2d631874b96"
});

const messaging = firebase.messaging();

// Fires when a push notification arrives while the site is closed, the tab is in the
// background, or the phone is locked — this is what lets the admin get the sound/alert
// without keeping the orders panel open all the time.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "🔔 Nuevo pedido";
  const options = {
    body: (payload.notification && payload.notification.body) || "Toca para ver el pedido",
    icon: (payload.notification && payload.notification.icon) || undefined,
    data: payload.data || {},
    tag: "new-order", // stacks/replaces instead of piling up duplicate notifications
    renotify: true
  };
  self.registration.showNotification(title, options);
});

// Opens (or focuses) the site when the admin taps the notification.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
