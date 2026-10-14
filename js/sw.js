const CACHE_VERSION = 'gm-v2';
const SCOPE = self.registration.scope;

const PRECACHE = [
  'index.html',
  'home.html',
  'profile.html',
  'add-store.html',
  'guide.html',
  'css/vendor/bootstrap.min.css',
  'css/frameworkG.css',
  'css/main.css',
  'css/prices.css',
  'js/vendor/bootstrap.bundle.min.js',
  'js/vendor/lucide.min.js',
  'js/region-guard.js',
  'js/translations.js',
  'js/i18n.js',
  'js/main.js',
  'js/auth.js',
  'js/offline.js',
  'js/home.js',
  'js/exchange-rates.js',
  'js/prices-api.js',
  'js/profile.js',
  'js/add-store.js',
  'js/guide.js',
  'assets/fonts/cairo-arabic-400-normal.woff2',
  'assets/fonts/cairo-arabic-600-normal.woff2',
  'assets/fonts/cairo-arabic-700-normal.woff2',
  'assets/fonts/cairo-latin-400-normal.woff2',
  'assets/fonts/cairo-latin-600-normal.woff2',
  'assets/fonts/cairo-latin-700-normal.woff2',
  'assets/img/logo.gazamarket.png',
  'assets/img/ps.svg',
  'assets/img/us.svg'
];

const NAVIGATION_TIMEOUT = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(PRECACHE.map((path) => cache.add(new Request(path, { cache: 'reload' }))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isHandled(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if (path.indexOf('/api/') !== -1) return false;
  if (path.indexOf('/dashboard-users/') !== -1) return false;
  if (path.indexOf('/test/') !== -1) return false;
  return true;
}

async function store(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    return await store(request, response);
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const fallback = await cache.match(new URL('index.html', SCOPE).href);
    if (fallback) return fallback;
    return Response.error();
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request).then((response) => store(request, response)).catch(() => null);
  if (cached) {
    network.catch(() => null);
    return cached;
  }
  const response = await network;
  return response || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!isHandled(url)) return;
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  event.respondWith(handleAsset(request));
});