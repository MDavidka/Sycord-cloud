"use strict";

// Bump this whenever the app shell changes so installed PWAs fetch current styles.
const CACHE_NAME = "airshell-static-v13";
const STATIC_ASSETS = [
  "/assets/app.css",
  "/assets/app.js",
  "/assets/home.js?v=native-12",
  "/assets/home-reference.css?v=13",
  "/assets/ios-chat-refinement.css?v=mobile-ergonomics-3",
  "/assets/sidebar-modern.css?v=1",
  "/assets/sidebar-modern.js?v=1",
  "/assets/favicon.svg",
  "/assets/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("airshell-static-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache navigation, authenticated HTML, APIs, login/logout, or terminal traffic.
  if (request.mode === "navigate" || url.pathname.startsWith("/api/") ||
      url.pathname === "/login" || url.pathname === "/logout" || url.pathname === "/ws") return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: "no-cache" });
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
      }
    })());
  }
});
