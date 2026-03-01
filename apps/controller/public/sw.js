const version = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_VERSION = `flimflam-${version}`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = ["/", "/play"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response?.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, { ignoreSearch } = {}) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, ignoreSearch ? { ignoreSearch: true } : undefined);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API requests: network-first.
  if (url.pathname.startsWith("/api")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Next.js build assets: network-first to avoid serving stale bundles across deploys.
  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // Fingerprinted assets: cache-first.
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ico)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigations: network-first; if offline, ignore querystring so deep-links like
  // `/?code=ABCD` can fall back to cached `/`.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request, RUNTIME_CACHE);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match(request, { ignoreSearch: true });
          return cached || (await cache.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else: network-first.
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});
