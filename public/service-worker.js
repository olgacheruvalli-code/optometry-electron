// Service Worker for Optometry PWA
const CACHE_NAME = "optometry-pwa-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Let network handle all API requests directly without caching
  if (event.request.url.includes("/api/") || event.request.method !== "GET") {
    return;
  }
  const url = new URL(event.request.url);
  // Page loads and version.json must always come fresh from the server,
  // so a newly deployed version is picked up immediately.
  if (event.request.mode === "navigate" || url.pathname.endsWith("/version.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => caches.match(event.request))
    );
    return;
  }
  // Network first with cache fallback for PWA installability & offline reliability
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
