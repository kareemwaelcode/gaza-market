'use strict';

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

const PLACE_TYPES = ['restaurant', 'cafe', 'restaurant-cafe', 'workspace', 'supermarket'];

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
    phone: normalizePhone(raw.phone),
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

const MOCK_PLACES = [
{ id: 1, slug: 'batikha', name_ar: 'بطيخة', name_en: 'Batikha', type: 'restaurant', region: 'Nuseirat', address: 'شارع الشهداء', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000001', has_menu: true },
{ id: 2, slug: 'al-asema', name_ar: 'العاصمة', name_en: 'Al Asema', type: 'cafe', region: 'Nuseirat', address: 'بجانب مجمع الرازي الطبي', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000002', has_menu: true },
{ id: 3, slug: 'roof-cafe', name_ar: 'الرووف', name_en: 'Roof Cafe', type: 'restaurant', region: 'Nuseirat', address: 'الشارع الرئيسي', image_url: 'assets/img/demo/demo.webp', is_open: false, whatsapp: '972590000003', has_menu: true },
{ id: 4, slug: 'jeneen', name_ar: 'جنين', name_en: 'Jeneen', type: 'restaurant', region: 'DeirBalah', address: 'وسط المدينة', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000004', has_menu: true },
{ id: 5, slug: 'sama-cafe', name_ar: 'سما كافيه', name_en: 'Sama Cafe', type: 'cafe', region: 'DeirBalah', address: 'قرب الكورنيش', image_url: 'assets/img/demo/demo.webp', is_open: false, whatsapp: '972590000005', has_menu: true },
{ id: 6, slug: 'saada-shafout', name_ar: 'السعادة شفاعوط', name_en: "Al-Sa'ada Shaf'out", type: 'restaurant-cafe', region: 'Nuseirat', address: 'مفرق النصيرات', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000006', has_menu: true },
{ id: 7, slug: 'bahr-restaurant', name_ar: 'مطعم البحر', name_en: 'Al Bahr Restaurant', type: 'restaurant', region: 'Alrimal', address: 'شارع الوحدة', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000007', has_menu: true },
{ id: 8, slug: 'qahwa-w-kteb', name_ar: 'قهوة وكتاب', name_en: 'Coffee & Books', type: 'cafe', region: 'Alrimal', address: 'قرب الجامعة', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000008', has_menu: true },
{ id: 9, slug: 'tal-hawa-grill', name_ar: 'مشويات تل الهوا', name_en: 'Tal Al-Hawa Grill', type: 'restaurant', region: 'TalHawa', address: 'الشارع العام', image_url: 'assets/img/demo/demo.webp', is_open: false, whatsapp: '972590000009', has_menu: false },
{ id: 10, slug: 'khan-yunis-mandi', name_ar: 'مندي خان يونس', name_en: 'Khan Yunis Mandi', type: 'restaurant', region: 'KhanYunis', address: 'قرب دوار الأمم', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000010', has_menu: true },
{ id: 11, slug: 'rafah-sweets', name_ar: 'حلويات رفح', name_en: 'Rafah Sweets', type: 'cafe', region: 'Rafah', address: 'السوق القديم', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000011', has_menu: true },
{ id: 12, slug: 'mawasi-kitchen', name_ar: 'مطبخ المواصي', name_en: 'Mawasi Kitchen', type: 'restaurant-cafe', region: 'MawasiKhanYunis', address: 'شارع البحر', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000012', has_menu: true },
{ id: 13, slug: 'jabalia-shawarma', name_ar: 'شاورما جباليا', name_en: 'Jabalia Shawarma', type: 'restaurant', region: 'Jabalia', address: 'دوار الصفطاوي', image_url: 'assets/img/demo/demo.webp', is_open: false, whatsapp: '972590000013', has_menu: false },
{ id: 14, slug: 'beit-lahia-cafe', name_ar: 'كافيه بيت لاهيا', name_en: 'Beit Lahia Cafe', type: 'cafe', region: 'BeitLahia', address: 'الشارع الرئيسي', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000014', has_menu: true },
{ id: 15, slug: 'work-corner', name_ar: 'ركن العمل', name_en: 'Work Corner', type: 'workspace', region: 'Alrimal', address: 'قرب الجامعة', image_url: 'assets/img/demo/demo.webp', is_open: true, whatsapp: '972590000015', has_menu: false },
{ id: 16, slug: 'al-amal-market', name_ar: 'سوبرماركت الأمل', name_en: 'Al Amal Supermarket', type: 'supermarket', region: 'Nuseirat', address: 'الشارع الرئيسي', image_url: 'assets/img/demo/demo.webp', is_open: false, whatsapp: '972590000016', has_menu: false },
];

const MENU_FREE_LIMITS = { categories: 5, items: 10 };

// TEMP: one demo image used for every shop and every item, for the look only.
// Real images come from the API (image_url for shops, item.image for items).
function mockItemImage() {
return 'assets/img/demo.webp';
}

function mockMenu(plan, groups) {
const categories = [];
const items = [];
groups.forEach((group, gi) => {
    const categoryId = 'c' + (gi + 1);
    categories.push({ id: categoryId, name: group[0] });
    group[1].forEach((row, ri) => {
    items.push({ id: categoryId + '-' + (ri + 1), categoryId, name: row[0], price: row[1], image: mockItemImage(), available: row[2] !== false });
    });
});
return { plan, categories, items };
}

const MOCK_MENUS = {
'jeneen': mockMenu('paid', [
    ['الشاورما (دجاج)', [['أساور العروس', 50], ['المنظوم أفندي', 50], ['المنظومة خانم', 45], ['حمص بالشاورما', 40], ['شاورما اسطنبولي', 45], ['شاورما سوري', 45], ['شاورما صاروخ', 50], ['صفيحة شاورما', 50], ['فتة شاورما', 45], ['فرشوحة دبل', 32], ['فرشوحة دبل دبل', 38], ['فرشوحة دبل لحمة', 37], ['فرشوحة عادي', 30]]],
    ['البيتزا', [['بيتزا خضار', 25], ['بيتزا ذرة', 25], ['بيتزا شاورما', 50], ['بيتزا مارغريتا', 20], ['بيتزا مشروم', 25], ['شطورة', 55, false]]],
    ['السلطات', [['بطاطا', 10], ['ذرة بالمايونيز', 10], ['سلطة تركية', 10], ['كريم ثوم', 10], ['كول سلو', 10], ['ملفوف أحمر', 10]]],
    ['الحلويات', [['آيس كيك', 15], ['براونيز', 15], ['بفاريا', 15], ['تشيز كيك بأنواعه', 15], ['تيراميسو', 15], ['حلاوة الجبن', 15], ['كيك بأنواعه', 12], ['مفروكة بالقشطة', 15], ['موس شوكليت', 15]]],
    ['العصائر', [['أفوكادو بالقشطة والمكسرات', 20], ['أناناس', 12], ['برتقال', 12], ['كوكتيل فواكه', 15], ['ليمون بالنعناع', 12]]],
    ['المشروبات الساخنة', [['قهوة', 7], ['نسكافيه', 7]]],
]),
'al-asema': mockMenu('free', [
    ['المشروبات الساخنة', [['إسبريسو', 8], ['أمريكانو', 9], ['كابتشينو', 12], ['لاتيه', 13], ['شاي', 5]]],
    ['المشروبات الباردة', [['آيس لاتيه', 14], ['آيس موكا', 15], ['فرابيه', 16]]],
    ['العصائر', [['برتقال', 10], ['ليمون بالنعناع', 10], ['فراولة', 12]]],
    ['الحلويات', [['كيك شوكولاتة', 14], ['تشيز كيك', 15], ['وافل', 16]]],
    ['الساندويتشات', [['ساندويتش جبنة', 12], ['ساندويتش دجاج', 15]]],
    ['الأراجيل', [['أرجيلة تفاحتين', 25], ['أرجيلة نعنع', 25]]],
]),
'saada-shafout': mockMenu('paid', [
    ['الوجبات', [['شفاعوط بالدجاج', 28], ['شفاعوط باللحمة', 32], ['وجبة عائلية', 90]]],
    ['المشروبات', [['قهوة عربية', 6], ['شاي بالنعناع', 5], ['عصير ليمون', 10]]],
]),
};

function mockApplyPlan(menu) {
if (menu.plan === 'paid') return menu;
const categories = menu.categories.slice(0, MENU_FREE_LIMITS.categories);
const kept = new Set(categories.map((c) => c.id));
const items = menu.items
    .filter((it) => it.categoryId === null || kept.has(it.categoryId))
    .slice(0, MENU_FREE_LIMITS.items);
return { plan: menu.plan, categories, items };
}

async function mockGetPlace(slug) {
const mode = getTestMode();
await delay(mode === 'slow' ? 2500 : 250);
if (mode === 'error') throw GMShopsError('server', 'Mock server error', 500);
const raw = MOCK_PLACES.find((p) => p.slug === slug);
if (!raw) throw GMShopsError('not_found', 'Place not found', 404);
return { data: Object.assign({ phone: raw.whatsapp }, raw) };
}

async function mockGetMenu(slug) {
const mode = getTestMode();
await delay(mode === 'slow' ? 2500 : 250);
if (mode === 'error') throw GMShopsError('server', 'Mock server error', 500);
const menu = MOCK_MENUS[slug];
if (!menu || mode === 'empty') return { data: { categories: [], items: [] } };
const visible = mockApplyPlan(menu);
return { data: { categories: visible.categories, items: visible.items } };
}

function normalizeMenu(json) {
const data = json && json.data;
if (!data || !Array.isArray(data.categories) || !Array.isArray(data.items)) {
    throw GMShopsError('invalid_response', 'Invalid menu response');
}
const categories = data.categories
    .filter((c) => c && c.id !== undefined && c.id !== null && typeof c.name === 'string' && c.name.trim())
    .map((c) => ({ id: String(c.id), name: c.name.trim() }));
const items = data.items
    .filter((it) => it && it.id !== undefined && it.id !== null && typeof it.name === 'string' && it.name.trim() && it.hidden !== true)
    .map((it) => {
    const price = Number(it.price);
    return {
        id: String(it.id),
        categoryId: it.categoryId === undefined || it.categoryId === null || it.categoryId === '' ? null : String(it.categoryId),
        name: it.name.trim(),
        price: it.price === null || it.price === undefined || it.price === '' || !isFinite(price) || price < 0 ? null : price,
        image: safeImageUrl(it.image),
        available: it.available !== false,
    };
    });
return { categories, items };
}

async function getPlace(slug) {
const safeSlug = typeof slug === 'string' && /^[a-z0-9-]{1,80}$/i.test(slug) ? slug : '';
if (!safeSlug) throw GMShopsError('not_found', 'Place not found', 404);
const json = USE_MOCK ? await mockGetPlace(safeSlug) : await request('/places/' + encodeURIComponent(safeSlug));
const place = normalizePlace(json && json.data);
if (!place) throw GMShopsError('invalid_response', 'Invalid place response');
return place;
}

async function getMenu(slug) {
const safeSlug = typeof slug === 'string' && /^[a-z0-9-]{1,80}$/i.test(slug) ? slug : '';
if (!safeSlug) throw GMShopsError('not_found', 'Place not found', 404);
const json = USE_MOCK ? await mockGetMenu(safeSlug) : await request('/places/' + encodeURIComponent(safeSlug) + '/menu');
return normalizeMenu(json);
}

function mockMatches(place, params) {
if (params.type === 'restaurant' && place.type !== 'restaurant' && place.type !== 'restaurant-cafe') return false;
if (params.type === 'cafe' && place.type !== 'cafe' && place.type !== 'restaurant-cafe') return false;
if (params.type === 'workspace' && place.type !== 'workspace') return false;
if (params.type === 'supermarket' && place.type !== 'supermarket') return false;
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

async function fetchPage(params) {
const clean = {
    type: params && PLACE_TYPES.indexOf(params.type) !== -1 && params.type !== 'restaurant-cafe' ? params.type : null,
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
getPlace,
getMenu,
readCache,
writeCache,
};
})();