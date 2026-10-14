// sw.js — لازم يكون بجذر الموقع (جنب index.html) عشان يغطي كل الصفحات
// كل مرة بتغير فيها أي ملف من PRECACHE (أو أي ملف CSS/JS/صورة/خط بالموقع) غيّر رقم CACHE_VERSION
// مثال: 'gm-v4' → 'gm-v5'. المتصفح بيلقط التغيير تلقائياً، وبيحمّل النسخة الجديدة ويمسح القديمة.

const CACHE_PREFIX = 'gm-';
const CACHE_VERSION = 'gm-v4';
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

// المسارات اللي الـ SW ما بيلمسها أبداً (داشبورد، API، تجارب)
const BYPASS_PATHS = ['/api/', '/dashboard-users/', '/test/'];

// بعض الاستضافات بتحوّل home.html إلى /home. المتصفح بيرفض يعرض استجابة "redirected"
// لطلب تنقل، فبنحوّلها لاستجابة عادية قبل ما نخزنها بالكاش
async function cleanResponse(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// تحميل كل ملفات PRECACHE: إذا فشل أي ملف بيفشل التثبيت كله
// وبهالحالة النسخة القديمة (والكاش القديم) بتضل شغالة، والمتصفح بيعيد المحاولة لاحقاً
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
      // امتلاء التخزين أو خطأ مؤقت: ما بنكسر الاستجابة الأصلية
    }
  }
  return response;
}

// الصفحات: الشبكة أولاً (بمهلة 4 ثواني) وبعدها الكاش، وبآخر شي index.html
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
    const fallback = await cache.match(new URL('index.html', SCOPE).href);
    if (fallback) return fallback;
    return Response.error();
  } finally {
    clearTimeout(timer);
  }
}

// الملفات (CSS/JS/خطوط/صور): من الكاش فوراً، وبنحدّثها بالخلفية للزيارة الجاية
async function handleAsset(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request, { ignoreSearch: true });

  const network = fetch(request)
    .then((response) => store(request, response))
    .catch(() => null);

  if (cached) {
    // waitUntil: يخلي الـ SW شغال لحد ما يخلص تحديث الخلفية
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
  event.respondWith(handleAsset(event));
});