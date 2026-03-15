/**
 * Property Lens Service Worker
 *
 * Strategies (PRD §7, Ticket 0010):
 *  - Install:     pre-cache app shell (/, /manifest.json)
 *  - /assets/**:  cache-first — hashed bundles never change, serve from cache
 *  - Navigation:  network-first → cached / (SPA fallback for offline cold start)
 *  - Other GET:   network-first → cache fallback
 *  - Non-GET:     pass through (no caching for mutations)
 */

const CACHE_NAME = 'pl-shell-v1';
const PRECACHE   = ['/', '/manifest.json'];

// ─── Install: pre-cache the app shell ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: remove stale caches ─────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests (don't intercept Supabase / Anthropic calls)
  if (url.origin !== self.location.origin) return;

  // /assets/** — cache-first (content-hashed, immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests — network-first with SPA fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNav(request));
    return;
  }

  // Everything else — network-first with cache fallback
  event.respondWith(networkFirst(request));
});

// ─── Strategy helpers ───────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || new Response('Offline', { status: 503 });
  }
}

async function networkFirstNav(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // SPA fallback — serve cached / so React Router handles the route
    return (
      (await caches.match(request)) ||
      (await caches.match('/'))     ||
      new Response('Offline', { status: 503 })
    );
  }
}
