// Posture Tracker — minimal service worker.
// Strategy:
//   - Network-first for navigation / HTML so deploys propagate immediately.
//   - Stale-while-revalidate for static assets (JS/CSS/SVG/manifest) served from
//     the same origin.
//   - Never cache anything cross-origin (Supabase API calls go straight to network).

const VERSION = 'posture-v1';
const SHELL = [
  './',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // never intercept cross-origin

  // Navigation requests → network-first, fall back to cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy).catch(() => {}));
        return res;
      }).catch(() => caches.match(req).then((m) => m || caches.match('./')))
    );
    return;
  }

  // Other same-origin GETs → stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy).catch(() => {}));
        }
        return res;
      }).catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
