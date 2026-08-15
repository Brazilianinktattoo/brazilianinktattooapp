// Minimal service worker — just enough for "Add to Home Screen" installability.
// Deliberately does NOT cache app pages or API calls: this app shows live,
// per-user data (agenda, permissions), so serving stale cached responses
// would be actively wrong. Revisit with a real caching strategy once there's
// content worth working offline.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
