'use strict';

/*
 * Gaza Market - shops data layer (window.GMShops)
 *
 * Same pattern as js/prices-api.js: one place talks to the backend, the pages never fetch directly.
 *
 * ---------------------------------------------------------------------------
 * LARAVEL CONTRACT (what the backend must return)
 * ---------------------------------------------------------------------------
 *   GET /api/places?type=&region=&open=&cursor=&limit=
 *
 *   type    optional  restaurant | cafe        (restaurant-cafe places match BOTH values)
 *   region  optional  region code, e.g. Nuseirat, DeirBalah, KhanYunis (see REGIONS below)
 *   open    optional  1  -> only places whose is_open is true
 *   cursor  optional  opaque string returned as next_cursor by the previous page
 *   limit   optional  page size (default 12, backend caps it, e.g. 24)
 *
 *   200 JSON:
 *   {
 *     "data": [
 *       {
 *         "id": 17,                        // required
 *         "slug": "al-asema",              // optional, used in the link: shop.html?id=<slug|id>
 *         "name_ar": "العاصمة",
 *         "name_en": "Al Asema",           // at least one of name_ar / name_en is required
 *         "type": "cafe",                  // restaurant | cafe | restaurant-cafe
 *         "region": "Nuseirat",            // region code
 *         "address": "Near Al-Razi Medical Complex",   // optional
 *         "image_url": "https://.../x.webp",           // optional (null -> placeholder)
 *         "is_open": true,                 // manual open/closed switch of the owner
 *         "whatsapp": "972599123456",      // optional, digits only, international format without "+" (hides the WhatsApp button when empty)
 *         "has_menu": true                 // optional, shows the Menu button (page: shop.html?id=<slug|id>#menu)
 *       }
 *     ],
 *     "next_cursor": "opaque-or-null",
 *     "has_more": true,
 *     "total": 48                          // optional
 *   }
 *
 *   Errors: 401/419 unauthorized, 403 forbidden, 404 not_found, 422 validation, 429 rate_limited, 5xx server.
 *   Backend notes: paginate with a cursor, index (type, region, is_open), return only the columns above,
 *   cache the public list in Redis and clear it when a place or its open/closed status changes.
 * ---------------------------------------------------------------------------
 * Mock data is used ONLY on local hosts (window.GM_ENV.isMockAllowed()), exactly like prices-api.js.
 * Test modes on local hosts: ?gm_test=empty | error | slow
 */
(function () {
const DEFAULTS = {
USE_MOCK: true,
API_BASE: '/api',
TIMEOUT_MS: 15000,
CREDENTIALS: 'same-origin',
};

const CONFIG = Object.assign({}, DEFAULTS, window.GM_CONFIG || {});
const USE_MOCK = window.GM_ENV.isMockAllowed();
const API_BASE = String(CONFIG.API_BASE).replace(/\/+$/, '');

const CACHE_KEY = 'gm_shops_cache_v2';
const CACHE_MAX_KEYS = 12;
const CACHE_MAX_ITEMS = 24;
const DEFAULT_LIMIT = 12;

// Same region codes/values as js/home.js (GM_REGIONS). Kept here so the shops page does not need home.js.
const REGIONS = [
{ code: 'Nuseirat', value: 'Nuseirat' },
{ code: 'Breij', value: 'Breij' },
{ code: 'Maghazi', value: 'Maghazi' },
{ code: 'Zawayda', value: 'Zawayda' },
{ code: 'DeirBalah', value: 'Deir al-Balah' },
{ code: 'KhanYunis', value: 'Khan Yunis' },
{ code: 'Rafah', value: 'Rafah' },
{ code: 'MawasiKhanYunis', value: 'Mawasi Khan Yunis' },
{ code: 'MawasiQarara', value: 'Mawasi al-Qarara' },
{ code: 'Alrimal', value: 'Alrimal' },
{ code: 'Alshaati', value: 'Alshaati' },
{ code: 'SheikhRadwan', value: 'Sheikh Radwan' },
{ code: 'Saftawi', value: 'Saftawi' },
{ code: 'BeitHanoun', value: 'Beit Hanoun' },
{ code: 'BeitLahia', value: 'Beit Lahia' },
{ code: 'TalHawa', value: 'Tal Al-Hawa' },
{ code: 'Jabalia', value: 'Jabalia' },
];

const PLACE_TYPES = ['restaurant', 'cafe', 'restaurant-cafe'];

const regionLookup = (function () {
const squash = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const map = new Map();
REGIONS.forEach((r) => {
    map.set(squash(r.code), r.code);
    map.set(squash(r.value), r.code);
});
return { squash, map };
})();

function normalizeRegion(raw) {
if (raw === null || raw === undefined || raw === '') return null;
return regionLookup.map.get(regionLookup.squash(raw)) || null;
}

function GMShopsError(code, message, status, errors) {
const err = new Error(message || code);
err.name = 'GMShopsError';
err.code = code;
err.status = status || 0;
err.errors = errors || null;
return err;
}

function codeFromStatus(status) {
if (status === 401 || status === 419) return 'unauthorized';
if (status === 403) return 'forbidden';
if (status === 404) return 'not_found';
if (status === 422) return 'validation';
if (status === 429) return 'rate_limited';
return 'server';
}

function readJson(key, fallback) {
try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
} catch (err) {
    return fallback;
}
}

function writeJson(key, value) {
try {
    localStorage.setItem(key, JSON.stringify(value));
} catch (err) {
    console.error('shops storage failed:', err);
}
}

function delay(ms) {
return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTestMode() {
try {
    return new URLSearchParams(window.location.search).get('gm_test') || '';
} catch (err) {
    return '';
}
}

// Only https, same-site absolute/relative paths and small inline images are accepted as image sources.
function safeImageUrl(value) {
if (typeof value !== 'string') return null;
const v = value.trim();
if (!v) return null;
if (/^https:\/\//i.test(v)) return v;
if (/^\/(?!\/)/.test(v)) return v;
if (/^assets\//.test(v)) return v;
if (/^data:image\/(png|jpe?g|webp);base64,/i.test(v)) return v;
return null;
}

// WhatsApp number: digits only (10-15), used to build https://wa.me/<digits>. Anything else is dropped.
function normalizePhone(value) {
if (value === null || value === undefined) return '';
const digits = String(value).replace(/\D/g, '');
return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

function normalizePlace(raw) {
if (!raw || raw.id === undefined || raw.id === null || raw.id === '') return null;

const nameAr = typeof raw.name_ar === 'string' ? raw.name_ar.trim() : '';
const nameEn = typeof raw.name_en === 'string' ? raw.name_en.trim() : '';
if (!nameAr && !nameEn) return null;

const type = typeof raw.type === 'string' ? raw.type.trim().toLowerCase() : '';
if (PLACE_TYPES.indexOf(type) === -1) return null;

return {
    id: String(raw.id),
    slug: typeof raw.slug === 'string' && raw.slug.trim() ? raw.slug.trim() : null,
    name_ar: nameAr,
    name_en: nameEn,
    type,
    region: normalizeRegion(raw.region) || '',
    address: typeof raw.address === 'string' ? raw.address.trim() : '',
    image_url: safeImageUrl(raw.image_url),
    is_open: raw.is_open === true || raw.is_open === 1 || raw.is_open === '1',
    whatsapp: normalizePhone(raw.whatsapp),
    has_menu: raw.has_menu === true || raw.has_menu === 1 || raw.has_menu === '1',
};
}

function normalizePage(json) {
if (!json || !Array.isArray(json.data)) {
    throw GMShopsError('invalid_response', 'Invalid shops response');
}

const meta = json.meta && typeof json.meta === 'object' ? json.meta : {};
const nextCursor = json.next_cursor || meta.next_cursor || null;
const hasMoreFlag = json.has_more !== undefined ? json.has_more : meta.has_more;
const rawTotal = json.total !== undefined ? json.total : meta.total;
const total = rawTotal === undefined || rawTotal === null || rawTotal === '' ? NaN : Number(rawTotal);

return {
    items: json.data.map(normalizePlace).filter(Boolean),
    nextCursor: nextCursor,
    hasMore: (hasMoreFlag === undefined ? true : !!hasMoreFlag) && !!nextCursor,
    total: isFinite(total) && total >= 0 ? Math.floor(total) : null,
};
}

/* ------------------------------ real API ------------------------------ */

function getXsrfToken() {
const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
return match ? decodeURIComponent(match[1]) : null;
}

function buildHeaders() {
const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
};
const lang = document.documentElement.getAttribute('lang');
if (lang) headers['Accept-Language'] = lang;
const xsrf = getXsrfToken();
if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
return headers;
}

async function request(path) {
const controller = typeof AbortController === 'function' ? new AbortController() : null;
const timer = controller ? setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS) : null;

let res;
try {
    res = await fetch(API_BASE + path, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: CONFIG.CREDENTIALS,
    signal: controller ? controller.signal : undefined,
    });
} catch (err) {
    if (err && err.name === 'AbortError') throw GMShopsError('timeout', 'Request timed out');
    throw GMShopsError('network', 'Network error');
} finally {
    if (timer) clearTimeout(timer);
}

let json = null;
try {
    json = await res.json();
} catch (err) {
    json = null;
}

if (!res.ok) {
    const message = json && typeof json.message === 'string' ? json.message : 'HTTP ' + res.status;
    throw GMShopsError(codeFromStatus(res.status), message, res.status, json && json.errors);
}

if (json === null) throw GMShopsError('invalid_response', 'Empty or invalid JSON response', res.status);
return json;
}

function apiFetchPage(params) {
const query = new URLSearchParams();
if (params.type) query.set('type', params.type);
if (params.region) query.set('region', params.region);
if (params.open) query.set('open', '1');
if (params.cursor) query.set('cursor', params.cursor);
query.set('limit', String(params.limit));
return request('/places?' + query.toString());
}

/* ------------------------------ local mock ------------------------------ */

const MOCK_PLACES = [
{ id: 1, slug: 'batikha', name_ar: 'بطيخة', name_en: 'Batikha', type: 'restaurant', region: 'Nuseirat', address: 'شارع الشهداء', image_url: null, is_open: true, whatsapp: '972590000001', has_menu: true },
{ id: 2, slug: 'al-asema', name_ar: 'العاصمة', name_en: 'Al Asema', type: 'cafe', region: 'Nuseirat', address: 'بجانب مجمع الرازي الطبي', image_url: null, is_open: true, whatsapp: '972590000002', has_menu: true },
{ id: 3, slug: 'roof-cafe', name_ar: 'الرووف', name_en: 'Roof Cafe', type: 'restaurant', region: 'Nuseirat', address: 'الشارع الرئيسي', image_url: null, is_open: false, whatsapp: '972590000003', has_menu: true },
{ id: 4, slug: 'jeneen', name_ar: 'جنين', name_en: 'Jeneen', type: 'restaurant', region: 'DeirBalah', address: 'وسط المدينة', image_url: null, is_open: true, whatsapp: '972590000004', has_menu: true },
{ id: 5, slug: 'sama-cafe', name_ar: 'سما كافيه', name_en: 'Sama Cafe', type: 'cafe', region: 'DeirBalah', address: 'قرب الكورنيش', image_url: null, is_open: false, whatsapp: '972590000005', has_menu: true },
{ id: 6, slug: 'saada-shafout', name_ar: 'السعادة شفاعوط', name_en: "Al-Sa'ada Shaf'out", type: 'restaurant-cafe', region: 'Nuseirat', address: 'مفرق النصيرات', image_url: null, is_open: true, whatsapp: '972590000006', has_menu: true },
{ id: 7, slug: 'bahr-restaurant', name_ar: 'مطعم البحر', name_en: 'Al Bahr Restaurant', type: 'restaurant', region: 'Alrimal', address: 'شارع الوحدة', image_url: null, is_open: true, whatsapp: '972590000007', has_menu: true },
{ id: 8, slug: 'qahwa-w-kteb', name_ar: 'قهوة وكتاب', name_en: 'Coffee & Books', type: 'cafe', region: 'Alrimal', address: 'قرب الجامعة', image_url: null, is_open: true, whatsapp: '972590000008', has_menu: true },
{ id: 9, slug: 'tal-hawa-grill', name_ar: 'مشويات تل الهوا', name_en: 'Tal Al-Hawa Grill', type: 'restaurant', region: 'TalHawa', address: 'الشارع العام', image_url: null, is_open: false, whatsapp: '972590000009', has_menu: false },
{ id: 10, slug: 'khan-yunis-mandi', name_ar: 'مندي خان يونس', name_en: 'Khan Yunis Mandi', type: 'restaurant', region: 'KhanYunis', address: 'قرب دوار الأمم', image_url: null, is_open: true, whatsapp: '972590000010', has_menu: true },
{ id: 11, slug: 'rafah-sweets', name_ar: 'حلويات رفح', name_en: 'Rafah Sweets', type: 'cafe', region: 'Rafah', address: 'السوق القديم', image_url: null, is_open: true, whatsapp: '972590000011', has_menu: true },
{ id: 12, slug: 'mawasi-kitchen', name_ar: 'مطبخ المواصي', name_en: 'Mawasi Kitchen', type: 'restaurant-cafe', region: 'MawasiKhanYunis', address: 'شارع البحر', image_url: null, is_open: true, whatsapp: '972590000012', has_menu: true },
{ id: 13, slug: 'jabalia-shawarma', name_ar: 'شاورما جباليا', name_en: 'Jabalia Shawarma', type: 'restaurant', region: 'Jabalia', address: 'دوار الصفطاوي', image_url: null, is_open: false, whatsapp: '972590000013', has_menu: false },
{ id: 14, slug: 'beit-lahia-cafe', name_ar: 'كافيه بيت لاهيا', name_en: 'Beit Lahia Cafe', type: 'cafe', region: 'BeitLahia', address: 'الشارع الرئيسي', image_url: null, is_open: true, whatsapp: '972590000014', has_menu: true },
];

function mockMatches(place, params) {
if (params.type === 'restaurant' && place.type !== 'restaurant' && place.type !== 'restaurant-cafe') return false;
if (params.type === 'cafe' && place.type !== 'cafe' && place.type !== 'restaurant-cafe') return false;
if (params.region && place.region !== params.region) return false;
if (params.open && !place.is_open) return false;
return true;
}

async function mockFetchPage(params) {
const mode = getTestMode();
await delay(mode === 'slow' ? 2500 : 350);
if (mode === 'error') throw GMShopsError('server', 'Mock server error', 500);
if (mode === 'empty') return { data: [], next_cursor: null, has_more: false, total: 0 };

const rows = MOCK_PLACES.filter((p) => mockMatches(p, params));
const offset = params.cursor ? Math.max(0, Number(params.cursor) || 0) : 0;
const pageRows = rows.slice(offset, offset + params.limit);
const hasMore = offset + params.limit < rows.length;

return {
    data: pageRows,
    next_cursor: hasMore ? String(offset + params.limit) : null,
    has_more: hasMore,
    total: rows.length,
};
}

/* ------------------------------ public API ------------------------------ */

// params: { type: 'restaurant'|'cafe'|null, region: code|null, open: boolean, cursor: string|null, limit: number }
async function fetchPage(params) {
const clean = {
    type: params && (params.type === 'restaurant' || params.type === 'cafe') ? params.type : null,
    region: params && params.region ? normalizeRegion(params.region) : null,
    open: !!(params && params.open),
    cursor: params && params.cursor ? String(params.cursor) : null,
    limit: Math.max(1, Math.min(Number(params && params.limit) || DEFAULT_LIMIT, 24)),
};
const json = USE_MOCK ? await mockFetchPage(clean) : await apiFetchPage(clean);
return normalizePage(json);
}

function readCache(key) {
const cache = readJson(CACHE_KEY, {});
const entry = cache && cache[key];
if (!entry || !Array.isArray(entry.items)) return null;
return {
    items: entry.items.map(normalizePlace).filter(Boolean),
    savedAt: Number(entry.savedAt) || null,
};
}

function writeCache(key, items) {
const cache = readJson(CACHE_KEY, {});
cache[key] = { savedAt: Date.now(), items: items.slice(0, CACHE_MAX_ITEMS) };

const keys = Object.keys(cache);
if (keys.length > CACHE_MAX_KEYS) {
    keys
    .sort((a, b) => (cache[a].savedAt || 0) - (cache[b].savedAt || 0))
    .slice(0, keys.length - CACHE_MAX_KEYS)
    .forEach((oldKey) => { delete cache[oldKey]; });
}

writeJson(CACHE_KEY, cache);
}

window.GMShops = {
isMock: USE_MOCK,
defaultLimit: DEFAULT_LIMIT,
normalizeRegion,
fetchPage,
readCache,
writeCache,
};
})();