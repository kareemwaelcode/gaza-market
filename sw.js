const CACHE_PREFIX = 'gm-';
const CACHE_VERSION = 'gm-v29';
const SCOPE = self.registration.scope;

const PRECACHE = [
  'index.html',
  'home.html',
  'places.html',
  'menu.html',
  'profile.html',
  'add-store.html',
  'guide.html',
  'css/vendor/bootstrap.min.css',
  'css/main.css',
  'css/prices.css',
  'js/vendor/bootstrap.bundle.min.js',
  'js/gm-core.js',
  'js/boot.js',
  'js/region-guard.js',
  'js/translations.js',
  'js/i18n.js',
  'js/main.js',
  'js/auth.js',
  'js/offline.js',
  'js/home.js',
  'js/places.js',
  'js/places-api.js',
  'js/menu.js',
  'js/booking.js',
  'js/workspace.js',
  'js/exchange-rates.js',
  'js/prices-api.js',
  'js/profile.js',
  'js/add-store.js',
  'js/add-store-api.js',
  'js/regions-api.js',
  'js/guide.js',
  'assets/fonts/cairo-arabic-400-normal.woff2',
  'assets/fonts/cairo-arabic-600-normal.woff2',
  'assets/fonts/cairo-arabic-700-normal.woff2',
  'assets/fonts/cairo-latin-400-normal.woff2',
  'assets/fonts/cairo-latin-600-normal.woff2',
  'assets/fonts/cairo-latin-700-normal.woff2',
  'assets/img/logo.gazamarket.png',
  'assets/img/place-placeholder.svg.webp',
  'assets/img/ps.svg',
  'assets/img/us.svg'
];

const NAVIGATION_TIMEOUT = 4000;

const BYPASS_PATHS = ['/api/', '/test/'];

const NETWORK_FIRST_PATHS = [
  '/dashboard-users/',
  '/js/dashboard/',
  '/css/user-dashboard.css',
  '/js/store-type-config.js',
  '/js/clinic-appointments.js'
];

const DASHBOARD_PRECACHE = [
  'dashboard-users/dashboard.html',
  'dashboard-users/ads.html',
  'dashboard-users/appointments.html',
  'dashboard-users/dashboard-menu.html',
  'dashboard-users/packages.html',
  'dashboard-users/prices.html',
  'dashboard-users/dashboard-profile.html',
  'dashboard-users/reservations.html',
  'dashboard-users/services.html',
  'dashboard-users/subscribers.html',
  'dashboard-users/subscription-requests.html',
  'dashboard-users/tables.html',
  'dashboard-users/auth/auth-api.js',
  'dashboard-users/auth/auth-guard.js',
  'dashboard-users/partials/ad-edit-panel.html',
  'dashboard-users/partials/apt-hours-edit-panel.html',
  'dashboard-users/partials/drawer.html',
  'dashboard-users/partials/menu-category-panel.html',
  'dashboard-users/partials/menu-item-edit-panel.html',
  'dashboard-users/partials/mobile-nav.html',
  'dashboard-users/partials/prices-hours-edit-panel.html',
  'dashboard-users/partials/product-category-panel.html',
  'dashboard-users/partials/product-item-edit-panel.html',
  'dashboard-users/partials/profile-edit-panel.html',
  'dashboard-users/partials/reviews.html',
  'dashboard-users/partials/service-category-panel.html',
  'dashboard-users/partials/service-item-edit-panel.html',
  'dashboard-users/partials/services-edit-panel.html',
  'dashboard-users/partials/settings.html',
  'dashboard-users/partials/sidebar.html',
  'dashboard-users/partials/subscriber-add-panel.html',
  'dashboard-users/partials/table-edit-panel.html',
  'dashboard-users/partials/topbar.html',
  'dashboard-users/partials/topnav.html',
  'css/user-dashboard.css',
  'js/gm-core.js',
  'js/store-type-config.js',
  'js/clinic-appointments.js',
  'js/vendor/lucide.min.js',
  'js/vendor/qrcode.js',
  'js/dashboard/core.js',
  'js/dashboard/shell.js',
  'js/dashboard/page-runner.js',
  'js/dashboard/common.js',
  'js/dashboard/booking-api.js',
  'js/dashboard/pages/ads.js',
  'js/dashboard/pages/dashboard.js',
  'js/dashboard/pages/extra-fields.js',
  'js/dashboard/pages/dashboard-menu.js',
  'js/dashboard/pages/packages.js',
  'js/dashboard/pages/prices.js',
  'js/dashboard/pages/reservations.js',
  'js/dashboard/pages/services.js',
  'js/dashboard/pages/subscribers.js',
  'js/dashboard/pages/tables.js',
  'assets/img/logo.gazamarket.png',
  'assets/img/logo.gazamarket.dark.png'
];

async function cleanResponse(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

async function precacheAll() {
  const cache = await caches.open(CACHE_VERSION);
  await Promise.all(
    PRECACHE.map(async (path) => {
      const url = new URL(path, SCOPE).href;
      const response = await fetch(new Request(url, { cache: 'reload' }));
      if (!response.ok) throw new Error('precache failed (' + response.status + '): ' + url);
      await cache.put(url, await cleanResponse(response));
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAll().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isHandled(url) {
  if (url.origin !== self.location.origin) return false;
  return !BYPASS_PATHS.some((part) => url.pathname.indexOf(part) !== -1);
}

async function store(request, response) {
  if (response && response.ok && response.type === 'basic') {
    try {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, await cleanResponse(response.clone()));
    } catch (err) {
    }
  }
  return response;
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_VERSION);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT);
  try {
    const response = await fetch(request, { signal: controller.signal });
    return await store(request, response);
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (isNetworkFirst(new URL(request.url))) {
      const dashboard = await cache.match(new URL('dashboard-users/dashboard.html', SCOPE).href);
      if (dashboard) return dashboard;
    }
    const fallback = await cache.match(new URL('index.html', SCOPE).href);
    if (fallback) return fallback;
    return Response.error();
  } finally {
    clearTimeout(timer);
  }
}

function isNetworkFirst(url) {
  return NETWORK_FIRST_PATHS.some((part) => url.pathname.indexOf(part) !== -1);
}

async function handleNetworkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT);
  try {
    const response = await fetch(request, { signal: controller.signal });
    return await store(request, response);
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || Response.error();
  } finally {
    clearTimeout(timer);
  }
}

async function precacheDashboard() {
  const cache = await caches.open(CACHE_VERSION);
  await Promise.all(
    DASHBOARD_PRECACHE.map(async (path) => {
      try {
        const url = new URL(path, SCOPE).href;
        if (await cache.match(url)) return;
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (response.ok) await cache.put(url, await cleanResponse(response));
      } catch (err) {
      }
    })
  );
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'gm-precache-dashboard') return;
  event.waitUntil(precacheDashboard());
});

async function handleAsset(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request, { ignoreSearch: true });

  const network = fetch(request)
    .then((response) => store(request, response))
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
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
  if (isNetworkFirst(url)) {
    event.respondWith(handleNetworkFirst(request));
    return;
  }
  event.respondWith(handleAsset(event));
});