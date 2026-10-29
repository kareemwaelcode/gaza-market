'use strict';

(function () {
const DEFAULTS = {
USE_MOCK: true,
API_BASE: '/api',
TIMEOUT_MS: 15000,
CREDENTIALS: 'same-origin',
RETRY: 1,
};

const CONFIG = Object.assign({}, DEFAULTS, window.GM_CONFIG || {});
const USE_MOCK = window.GM_ENV.isMockAllowed();
const API_BASE = String(CONFIG.API_BASE).replace(/\/+$/, '');

const CACHE_KEY = 'gm_shops_cache_v5';
const LEGACY_CACHE_KEYS = ['gm_shops_cache_v2', 'gm_shops_cache_v3', 'gm_shops_cache_v4'];
const CACHE_MAX_KEYS = 12;
const CACHE_MAX_ITEMS = 24;
const FRESH_MS = 60 * 1000;
const STALE_MS = 15 * 60 * 1000;
const MEMORY_MAX = 60;
const DETAIL_TTL_MS = 60 * 1000;
const DETAIL_MAX = 80;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

const GAZA_TZ = 'Asia/Gaza';
const BOOK_MAX_DAYS = 30;
const BOOK_MAX_PEOPLE = 10;
const BOOK_COUNTRY_CODES = ['970', '972'];
const BOOK_NATIONAL_RE = /^5[0-9]{8}$/;
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SLUG_RE = /^[a-z0-9-]{1,80}$/i;
const SUB_MAX_DAYS = 60;
const SUB_DURATIONS = ['day', 'week', 'month'];
const SUB_STORAGE_KEY = 'gmDashboardSubscriptionRequests:workspace';
const SUB_STORAGE_MAX = 200;
const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const SERVICE_ID_RE = /^[a-z][a-z_]{0,31}$/;

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

const PLACE_TYPES = ['restaurant', 'cafe', 'restaurant-cafe', 'workspace', 'store'];
const STORE_TYPE = 'store';
const FILTER_TYPES = PLACE_TYPES;

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

function GMShopsError(code, message, status, errors, reason) {
const err = new Error(message || code);
err.name = 'GMShopsError';
err.code = code;
err.status = status || 0;
err.errors = errors || null;
err.reason = typeof reason === 'string' ? reason : '';
return err;
}

const BOOK_ERROR_FIELDS = {
name: 'name',
countryCode: 'phone',
whatsapp: 'phone',
phone: 'phone',
datetime: 'date',
date: 'date',
startDate: 'date',
duration: 'duration',
time: 'time',
peopleCount: 'people',
people: 'people',
tableId: 'table',
table: 'table',
};

function normalizeServerErrors(raw) {
if (!raw || typeof raw !== 'object') return null;
const out = {};
Object.keys(raw).forEach((key) => {
    const field = BOOK_ERROR_FIELDS[key];
    let value = raw[key];
    if (Array.isArray(value)) value = value[0];
    // Accept the booking keys (book.err*) and the workspace subscription keys (ws.err*) only.
    if (!field || typeof value !== 'string' || !/^(book|ws)\.err[A-Za-z]+$/.test(value)) return;
    const target = key === 'datetime' && value === 'book.errTime' ? 'time' : field;
    if (!out[target]) out[target] = value;
});
return Object.keys(out).length ? out : null;
}

function codeFromStatus(status) {
if (status === 401 || status === 419) return 'unauthorized';
if (status === 403) return 'forbidden';
if (status === 404) return 'not_found';
if (status === 409) return 'conflict';
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
const raw = String(value).trim();
if (!/^\+?[\d\s\-()]+$/.test(raw)) return '';
const digits = raw.replace(/\D/g, '');
return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

function normalizePlace(raw) {
if (!raw || raw.id === undefined || raw.id === null || raw.id === '') return null;

const nameAr = typeof raw.name_ar === 'string' ? raw.name_ar.trim() : '';
const nameEn = typeof raw.name_en === 'string' ? raw.name_en.trim() : '';
if (!nameAr && !nameEn) return null;

const rawType = typeof raw.type === 'string' ? raw.type.trim().toLowerCase() : '';
if (!rawType) return null;
const type = PLACE_TYPES.indexOf(rawType) === -1 ? STORE_TYPE : rawType;

const text = (v) => (typeof v === 'string' ? v.trim() : '');
const address = text(raw.address) || text(raw.address_ar) || text(raw.address_en);
const addressAr = text(raw.address_ar);
const addressEn = text(raw.address_en);
const categoryAr = text(raw.category_ar);
const categoryEn = text(raw.category_en);

const idText = String(raw.id);
const slugText = text(raw.slug);
const slug = SLUG_RE.test(slugText) ? slugText : null;
const ref = slug || (SLUG_RE.test(idText) ? idText : null);

return {
    id: idText,
    slug: slug,
    ref: ref,
    name_ar: nameAr,
    name_en: nameEn,
    type,
    region: normalizeRegion(raw.region) || '',
    address: address,
    address_ar: addressAr || address || addressEn,
    address_en: addressEn || address || addressAr,
    category_ar: categoryAr || categoryEn,
    category_en: categoryEn || categoryAr,
    image_url: safeImageUrl(raw.image_url),
    image_thumb: safeImageUrl(raw.image_thumb_url || raw.image_thumb),
    is_open: raw.is_open === true || raw.is_open === 1 || raw.is_open === '1',
    whatsapp: normalizePhone(raw.whatsapp),
    phone: normalizePhone(raw.phone),
    has_menu: raw.has_menu === true || raw.has_menu === 1 || raw.has_menu === '1',
    booking_available: !(raw.booking_available === false || raw.booking_available === 0 || raw.booking_available === '0'),
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

async function request(path, init) {
const opts = init || {};
const headers = buildHeaders();
let body;
if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
}
const controller = typeof AbortController === 'function' ? new AbortController() : null;
let timedOut = false;
const timer = controller ? setTimeout(() => { timedOut = true; controller.abort(); }, CONFIG.TIMEOUT_MS) : null;

let res;
try {
    res = await fetch(API_BASE + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: body,
    credentials: CONFIG.CREDENTIALS,
    signal: controller ? controller.signal : undefined,
    });
} catch (err) {
    if (timedOut) throw GMShopsError('timeout', 'Request timed out');
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
    const errors = res.status === 422 ? normalizeServerErrors(json && json.errors) : null;
    throw GMShopsError(codeFromStatus(res.status), message, res.status, errors, json && json.code);
}

if (json === null) throw GMShopsError('invalid_response', 'Empty or invalid JSON response', res.status);
return json;
}

function isRetryable(err) {
return err.code === 'network' || err.code === 'timeout' || (err.code === 'server' && err.status >= 500);
}

async function requestWithRetry(path) {
let attempt = 0;
for (;;) {
    try {
    return await request(path);
    } catch (err) {
    if (attempt >= CONFIG.RETRY || !isRetryable(err)) throw err;
    attempt += 1;
    await delay(300 + Math.random() * 500 * attempt);
    }
}
}

function apiFetchPage(params) {
const query = new URLSearchParams();
if (params.type) query.set('type', params.type);
if (params.region) query.set('region', params.region);
if (params.open) query.set('open', '1');
if (params.cursor) query.set('cursor', params.cursor);
query.set('limit', String(params.limit));
return requestWithRetry('/places?' + query.toString());
}

const MOCK_PLACES = [
{ id: 1, slug: 'batikha', name_ar: 'بطيخة', name_en: 'Batikha', type: 'restaurant', region: 'Nuseirat', address_ar: 'مفترق ابو صرار', address_en: 'Abu Sarar Junction', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000001', has_menu: true },
{ id: 2, slug: 'al-asema', name_ar: 'العاصمة', name_en: 'Al Asema', type: 'cafe', region: 'Nuseirat', address_ar: 'بجانب مجمع الرازي الطبي', address_en: 'Next to Al-Razi Medical Complex', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000002', has_menu: true },
{ id: 3, slug: 'roof-cafe', name_ar: 'الرووف', name_en: 'Roof Cafe', type: 'restaurant', region: 'Nuseirat', address: 'الشارع الرئيسي', image_url: null, is_open: false, whatsapp: '972590000003', has_menu: true },
{ id: 4, slug: 'jeneen', name_ar: 'جنين', name_en: 'Jeneen', type: 'restaurant', region: 'DeirBalah', address: 'وسط المدينة', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000004', has_menu: true },
{ id: 5, slug: 'sama-cafe', name_ar: 'سما كافيه', name_en: 'Sama Cafe', type: 'cafe', region: 'DeirBalah', address: 'قرب الكورنيش', image_url: null, is_open: false, whatsapp: '972590000005', has_menu: true },
{ id: 6, slug: 'saada-shafout', name_ar: 'السعادة شفاعوط', name_en: "Al-Sa'ada Shaf'out", type: 'restaurant-cafe', region: 'Nuseirat', address: 'مفترق النصيرات', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000006', has_menu: true },
{ id: 7, slug: 'bahr-restaurant', name_ar: 'مطعم البحر', name_en: 'Al Bahr Restaurant', type: 'restaurant', region: 'Alrimal', address: 'شارع الوحدة', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000007', has_menu: true },
{ id: 8, slug: 'qahwa-w-kteb', name_ar: 'قهوة وكتاب', name_en: 'Coffee & Books', type: 'cafe', region: 'Alrimal', address: 'قرب الجامعة', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000008', has_menu: true },
{ id: 9, slug: 'tal-hawa-grill', name_ar: 'مشويات تل الهوا', name_en: 'Tal Al-Hawa Grill', type: 'restaurant', region: 'TalHawa', address: 'الشارع العام', image_url: null, is_open: false, whatsapp: '972590000009', has_menu: false },
{ id: 10, slug: 'khan-yunis-mandi', name_ar: 'مندي خان يونس', name_en: 'Khan Yunis Mandi', type: 'restaurant', region: 'KhanYunis', address: 'قرب دوار الأمم', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000010', has_menu: true },
{ id: 11, slug: 'rafah-sweets', name_ar: 'حلويات رفح', name_en: 'Rafah Sweets', type: 'cafe', region: 'Rafah', address: 'السوق القديم', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000011', has_menu: true },
{ id: 12, slug: 'mawasi-kitchen', name_ar: 'مطبخ المواصي', name_en: 'Mawasi Kitchen', type: 'restaurant-cafe', region: 'MawasiKhanYunis', address: 'شارع البحر', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000012', has_menu: true },
{ id: 13, slug: 'jabalia-shawarma', name_ar: 'شاورما جباليا', name_en: 'Jabalia Shawarma', type: 'restaurant', region: 'Jabalia', address: 'دوار الصفطاوي', image_url: null, is_open: false, whatsapp: '972590000013', has_menu: false },
{ id: 14, slug: 'beit-lahia-cafe', name_ar: 'كافيه بيت لاهيا', name_en: 'Beit Lahia Cafe', type: 'cafe', region: 'BeitLahia', address: 'الشارع الرئيسي', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000014', has_menu: true },
{ id: 15, slug: 'work-corner', name_ar: 'ركن العمل', name_en: 'Work Corner', type: 'workspace', region: 'Alrimal', address: 'قرب الجامعة', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000015', has_menu: false },
{ id: 18, slug: 'vibe-hub', name_ar: 'فايب هب', name_en: 'Vibe Hub', type: 'workspace', region: 'Alrimal', address_ar: 'عمارة كاظم، الطابق الثاني', address_en: 'Kazem Building, 2nd floor', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000018', has_menu: false },
{ id: 17, slug: 'al-nour-clothes', name_ar: 'ملابس النور', name_en: 'Al Nour Clothing', type: 'store', category_ar: 'ملابس', category_en: 'Clothing', region: 'KhanYunis', address_ar: 'السوق الرئيسي', address_en: 'Main Market', image_url: null, is_open: true, whatsapp: '972590000017', has_menu: false },
{ id: 19, slug: 'al-shifa-clinic', name_ar: 'عيادة الشفاء', name_en: 'Al Shifa Clinic', type: 'store', category_ar: 'عيادة وطب', category_en: 'Clinic & Medicine', region: 'KhanYunis', address_ar: 'شارع الجلاء', address_en: 'Al Jalaa Street', image_url: 'assets/img/demo.webp', is_open: true, whatsapp: '972590000019', has_menu: false },
{ id: 16, slug: 'al-amal-market', name_ar: 'سوبرماركت الأمل', name_en: 'Al Amal Supermarket', type: 'store', category_ar: 'سوبرماركت', category_en: 'Supermarket', region: 'Nuseirat', address: 'الشارع الرئيسي', image_url: 'assets/img/demo.webp', is_open: false, whatsapp: '972590000016', has_menu: false },
];

const MENU_FREE_LIMITS = { categories: 5, items: 10 };
const MENU_ATTR_KEYS = ['unit', 'brand', 'size', 'color', 'season', 'age_group', 'gender'];
const MENU_ATTR_MAX = 8;
const MENU_ATTR_VALUE_MAX = 40;
const MENU_DETAILS_MAX = 160;

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
    const extra = row[4] || {};
    items.push({ id: categoryId + '-' + (ri + 1), categoryId, name: row[0], price: row[1], image: extra.noImage === true ? null : mockItemImage(), available: row[2] !== false, discount: row[3] === true, details: extra.details || '', attributes: extra.attributes || [] });
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
'al-amal-market': mockMenu('paid', [
    ['فواكه', [['خوخ', 16], ['بطيخ', 7], ['شمام', 8, true, true], ['انجاص', 15], ['كيوي', 16], ['ليمون', 9], ['أفوكادو', 12]]],
    ['تسالي', [['شيبس تاكس', 3], ['كراكر مالح', 1.5, true, true], ['شيبس جبنة', 2], ['شيبس قرطيس', 3], ['شيبس ستاكس', 8], ['شيبس بونكي', 3, false]]],
    ['مخللات', [['مخلل خيار مواسم 1 كغ', 16], ['فلفل أحمر 660 غ', 18], ['فلفل أحمر 350 غ', 10, true, true], ['فلفل أصفر 660 غ', 12]]],
]),
'al-shifa-clinic': mockMenu('paid', [
    ['الخدمات المتاحة', [['كشفية', null], ['تحاليل مخبرية', null], ['أشعة', null], ['تطعيمات', null]]],
]),
'al-nour-clothes': mockMenu('free', [
    ['قمصان', [
    ['قميص قطن رجالي', 60, true, false, { details: 'قطن 100% بقصة عادية', attributes: [{ key: 'brand', value: 'النور' }, { key: 'size', value: 'M - XL' }, { key: 'color', value: 'أبيض' }, { key: 'season', value: 'صيفي' }] }],
    ['قميص كلاسيك', 85, true, true, { details: 'قماش ناعم مناسب للدوام والمناسبات', attributes: [{ key: 'brand', value: 'النور' }, { key: 'size', value: 'L - XXL' }, { key: 'color', value: 'سماوي' }] }],
    ]],
    ['بناطيل', [
    ['بنطلون جينز', 90, true, false, { details: 'جينز مرن بقصة مستقيمة', attributes: [{ key: 'brand', value: 'دنم برو' }, { key: 'size', value: '30 - 38' }, { key: 'color', value: 'أزرق غامق' }] }],
    ['بنطلون قماش', 75, false, false, { details: 'قماش قطني خفيف', attributes: [{ key: 'size', value: '32 - 40' }, { key: 'color', value: 'رمادي' }, { key: 'season', value: 'صيفي' }] }],
    ]],
    ['ملابس أطفال', [
    ['بيجامة أطفال', 35, true, false, { details: 'قطن ناعم بدون خياطات خشنة', attributes: [{ key: 'size', value: '4 - 8' }, { key: 'age_group', value: '2 - 6 سنوات' }, { key: 'color', value: 'أزرق' }] }],
    ['طقم أطفال صيفي', 45, true, true, { attributes: [{ key: 'age_group', value: '1 - 4 سنوات' }, { key: 'season', value: 'صيفي' }], noImage: true }],
    ]],
    ['أحذية', [
    ['حذاء رياضي', 120, true, false, { details: 'نعل طبي مريح للمشي', attributes: [{ key: 'brand', value: 'سبورت لاين' }, { key: 'size', value: '40 - 45' }, { key: 'color', value: 'أسود' }] }],
    ['صندل جلد', 65, true, false, { attributes: [{ key: 'size', value: '39 - 44' }, { key: 'color', value: 'بني' }, { key: 'season', value: 'صيفي' }] }],
    ]],
    ['جاكيتات', [
    ['جاكيت شتوي', 150, true, true, { details: 'بطانة داخلية دافئة ومقاوم للمطر', attributes: [{ key: 'brand', value: 'النور' }, { key: 'size', value: 'M - XXL' }, { key: 'color', value: 'كحلي' }, { key: 'season', value: 'شتوي' }] }],
    ['جاكيت جلد', 220, true, false, { attributes: [{ key: 'size', value: 'L - XL' }, { key: 'color', value: 'أسود' }, { key: 'season', value: 'شتوي' }] }],
    ]],
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
return { data: Object.assign({ phone: raw.whatsapp }, raw, mode === 'closed' ? { booking_available: false } : {}) };
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

function cleanMenuText(value, max) {
if (typeof value === 'number' && isFinite(value)) value = String(value);
if (typeof value !== 'string') return '';
const v = value.replace(/\s+/g, ' ').trim();
return v.length > max ? v.slice(0, max).trim() : v;
}

function normalizeItemAttributes(list) {
if (!Array.isArray(list)) return [];
const seen = new Set();
const out = [];
for (let i = 0; i < list.length && out.length < MENU_ATTR_MAX; i += 1) {
    const a = list[i];
    if (!a || typeof a !== 'object') continue;
    const key = typeof a.key === 'string' ? a.key.trim().toLowerCase() : '';
    if (MENU_ATTR_KEYS.indexOf(key) === -1 || seen.has(key)) continue;
    const value = cleanMenuText(a.value, MENU_ATTR_VALUE_MAX);
    if (!value) continue;
    seen.add(key);
    out.push({ key: key, value: value });
}
return out;
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
        discount: it.discount === true || it.discount === 1 || it.discount === '1',
        details: cleanMenuText(it.details, MENU_DETAILS_MAX),
        attributes: normalizeItemAttributes(it.attributes),
    };
    });
return { categories, items };
}

const detailCache = new Map();
const detailInflight = new Map();

function memoDetail(key, loader) {
if (USE_MOCK && getTestMode()) return loader();

const hit = detailCache.get(key);
if (hit && Date.now() - hit.savedAt < DETAIL_TTL_MS) return Promise.resolve(hit.json);

let pending = detailInflight.get(key);
if (!pending) {
    pending = loader()
    .then((json) => {
        detailCache.set(key, { savedAt: Date.now(), json: json });
        while (detailCache.size > DETAIL_MAX) detailCache.delete(detailCache.keys().next().value);
        return json;
    })
    .finally(() => { detailInflight.delete(key); });
    detailInflight.set(key, pending);
}
return pending;
}

function safeSlug(slug) {
return typeof slug === 'string' && SLUG_RE.test(slug) ? slug : '';
}

async function getPlace(slug) {
const clean = safeSlug(slug);
if (!clean) throw GMShopsError('not_found', 'Place not found', 404);
const json = await memoDetail('place:' + clean, () => (USE_MOCK ? mockGetPlace(clean) : requestWithRetry('/places/' + encodeURIComponent(clean))));
const place = normalizePlace(json && json.data);
if (!place) throw GMShopsError('invalid_response', 'Invalid place response');
return place;
}

async function getMenu(slug) {
const clean = safeSlug(slug);
if (!clean) throw GMShopsError('not_found', 'Place not found', 404);
const json = await memoDetail('menu:' + clean, () => (USE_MOCK ? mockGetMenu(clean) : requestWithRetry('/places/' + encodeURIComponent(clean) + '/menu')));
return normalizeMenu(json);
}

const MOCK_TABLES = {
'jeneen': [
    { id: 'jn-1', name: 'طاولة 1', seats: 2, status: 'available' },
    { id: 'jn-2', name: 'طاولة 2', seats: 4, status: 'available' },
    { id: 'jn-3', name: 'طاولة 3', seats: 4, status: 'occupied' },
    { id: 'jn-4', name: 'طاولة 4', seats: 6, status: 'available' },
    { id: 'jn-5', name: 'طاولة VIP', seats: 8, status: 'available' },
],
'al-asema': [
    { id: 'as-1', name: 'طاولة 1', seats: 2, status: 'available' },
    { id: 'as-2', name: 'طاولة 2', seats: 4, status: 'available' },
    { id: 'as-3', name: 'الجلسة الخارجية', seats: 6, status: 'available' },
],
'saada-shafout': [
    { id: 'sa-1', name: 'طاولة 1', seats: 4, status: 'available' },
    { id: 'sa-2', name: 'طاولة 2', seats: 4, status: 'occupied' },
],
};

async function mockGetTables(slug) {
const mode = getTestMode();
await delay(mode === 'slow' ? 2500 : 300);
if (mode === 'error') throw GMShopsError('server', 'Mock server error', 500);
return { data: MOCK_TABLES[slug] || [] };
}

async function mockSubmitReservation(slug, payload) {
const mode = getTestMode();
await delay(mode === 'slow' ? 2500 : 700);
if (mode === 'error') throw GMShopsError('server', 'Mock server error', 500);
if (mode === 'limit') throw GMShopsError('forbidden', 'Plan limit reached', 403, null, 'plan_limit_reached');
if (mode === 'invalid') {
    throw GMShopsError('validation', 'Invalid reservation', 422, normalizeServerErrors({ name: 'book.errName', whatsapp: 'book.errWhatsapp', peopleCount: 'book.errPeople' }));
}
const table = (MOCK_TABLES[slug] || []).find((t) => t.id === payload.tableId);
if (mode === 'taken' || !table || table.status === 'occupied') throw GMShopsError('conflict', 'Table is not available', 409, null, 'table_unavailable');
return { data: { id: 'mock-' + Date.now().toString(36), status: 'pending' } };
}

function normalizeTables(json) {
const data = json && json.data;
if (!Array.isArray(data)) throw GMShopsError('invalid_response', 'Invalid tables response');
return data
    .filter((t) => t && t.id !== undefined && t.id !== null && SAFE_ID_RE.test(String(t.id)) && typeof t.name === 'string' && t.name.trim() && t.status !== 'occupied')
    .map((t) => {
    const seats = Math.floor(Number(t.seats));
    return { id: String(t.id), name: t.name.trim().slice(0, 40), seats: isFinite(seats) && seats > 0 ? seats : null };
    });
}

function gazaParts(ms) {
try {
    const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: GAZA_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    }).formatToParts(new Date(ms));
    const o = {};
    parts.forEach((p) => { if (p.type !== 'literal') o[p.type] = Number(p.value); });
    if (isFinite(o.year) && isFinite(o.hour)) return o;
} catch (err) {
}
const d = new Date(ms);
return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
}

function gazaOffsetMs(ms) {
const p = gazaParts(ms);
return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

function gazaInstant(dateStr, timeStr) {
const d = dateStr.split('-').map(Number);
const t = timeStr.split(':').map(Number);
const guess = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]);
const first = guess - gazaOffsetMs(guess);
return guess - gazaOffsetMs(first);
}

function pad2(n) {
return n < 10 ? '0' + n : String(n);
}

function gazaDateString(ms) {
const p = gazaParts(ms);
return p.year + '-' + pad2(p.month) + '-' + pad2(p.day);
}

function isRealDate(value) {
const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
if (!m) return false;
const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

function reservationWindow() {
const now = Date.now();
return { min: gazaDateString(now), max: gazaDateString(now + BOOK_MAX_DAYS * 86400000) };
}

function validateReservation(raw) {
const src = raw || {};
const errors = {};

const name = String(src.name || '').replace(/\s+/g, ' ').trim();
if (name.length < 2 || name.length > 80) errors.name = 'book.errName';

const code = BOOK_COUNTRY_CODES.indexOf(String(src.countryCode)) !== -1 ? String(src.countryCode) : '970';
let digits = String(src.phone || '').replace(/\D/g, '');
if (digits.indexOf('00') === 0) digits = digits.slice(2);
if (digits.indexOf(code) === 0 && digits.length === code.length + 9) digits = digits.slice(code.length);
else if (digits.charAt(0) === '0') digits = digits.slice(1);
if (!BOOK_NATIONAL_RE.test(digits)) errors.phone = 'book.errWhatsapp';

const date = String(src.date || '');
const time = String(src.time || '');
const dateOk = isRealDate(date);
const timeOk = /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time);
if (!dateOk) errors.date = 'book.errDate';
if (!timeOk) errors.time = 'book.errTime';

let instant = null;
if (dateOk && timeOk) {
    const win = reservationWindow();
    instant = gazaInstant(date, time);
    if (date < win.min) errors.date = 'book.errPast';
    else if (date > win.max) errors.date = 'book.errFar';
    else if (instant <= Date.now()) errors.time = 'book.errPast';
}

const peopleRaw = String(src.peopleCount === undefined || src.peopleCount === null ? '' : src.peopleCount)
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 1632))
    .trim();
const peopleCount = /^[0-9]{1,2}$/.test(peopleRaw) ? Number(peopleRaw) : 0;
if (peopleCount < 1 || peopleCount > BOOK_MAX_PEOPLE) errors.people = 'book.errPeople';

const tableId = String(src.tableId || '');
if (!SAFE_ID_RE.test(tableId)) errors.table = 'book.errTable';

if (Object.keys(errors).length) return { errors: errors, payload: null };

return {
    errors: null,
    payload: {
    name: name,
    countryCode: code,
    whatsapp: digits,
    datetime: new Date(instant).toISOString(),
    peopleCount: peopleCount,
    tableId: tableId,
    note: String(src.note || '').trim().slice(0, 300),
    },
};
}

async function getTables(slug) {
const clean = safeSlug(slug);
if (!clean) throw GMShopsError('not_found', 'Place not found', 404);
const json = await memoDetail('tables:' + clean, () => (USE_MOCK ? mockGetTables(clean) : requestWithRetry('/places/' + encodeURIComponent(clean) + '/tables')));
return normalizeTables(json);
}

async function submitReservation(slug, raw) {
const clean = safeSlug(slug);
if (!clean) throw GMShopsError('not_found', 'Place not found', 404);
const result = validateReservation(raw);
if (result.errors) throw GMShopsError('validation', 'Invalid reservation', 422, result.errors);
try {
    const json = USE_MOCK
    ? await mockSubmitReservation(clean, result.payload)
    : await request('/places/' + encodeURIComponent(clean) + '/reservations', { method: 'POST', body: result.payload });
    const data = json && json.data;
    return { id: data && data.id !== undefined && data.id !== null ? String(data.id) : '', status: 'pending' };
} catch (err) {
    if (err && err.reason === 'plan_limit_reached') detailCache.delete('place:' + clean);
    throw err;
} finally {
    detailCache.delete('tables:' + clean);
}
}

const MOCK_WORKSPACES = {
'vibe-hub': {
    plan: 'paid',
    pricesHours: { priceHour: 5, priceHalfDay: 20, priceFullDay: 35, priceWeek: 150, priceMonth: 500, openTime: '08:00', closeTime: '20:00', seatsTotal: 100, seatsAvailable: 42 },
    services: {
    drinks: { enabled: true, details: 'موجود كافي كورنر بأسعار رمزية جدا' },
    electricity: { enabled: true, details: 'متواصلة دون انقطاع أبدا' },
    printing: { enabled: true, details: 'طباعة باسعار رمزية' },
    wifi: { enabled: true, details: 'انترنت فائق السرعة' },
    screens: { enabled: true, details: 'موجود في قاعات الاجتماعات' },
    private_rooms: { enabled: true, details: 'غرف منفصلة من شخص الى 8 اشخاص' },
    },
},
'work-corner': {
    plan: 'free',
    pricesHours: { priceHour: 4, priceHalfDay: null, priceFullDay: 25, priceWeek: null, priceMonth: 300, openTime: '09:00', closeTime: '21:00', seatsTotal: 30, seatsAvailable: 10 },
    services: {
    wifi: { enabled: true, details: '' },
    electricity: { enabled: true, details: '' },
    printing: { enabled: false, details: '' },
    },
},
};

// MOCK ONLY. The real backend returns `plan` inside the workspace response of each place.
// Here the owner's real plan lives in the dashboard (localStorage 'gm-store-plan'), and it
// applies ONLY to the demo workspace the mock owner owns (GM_ENV.mockOwnerSlug), so one
// owner's plan never leaks onto another workspace. Anything else is 'free' (the default).
const MOCK_OWNER_PLAN_KEY = 'gm-store-plan';

function mockWorkspacePlan(slug) {
if (slug === window.GM_ENV.mockOwnerSlug) {
    try {
    return localStorage.getItem(MOCK_OWNER_PLAN_KEY) === 'paid' ? 'paid' : 'free';
    } catch (err) {
    return 'free';
    }
}
const ws = MOCK_WORKSPACES[slug];
return ws && ws.plan === 'paid' ? 'paid' : 'free';
}

async function mockGetWorkspace(slug) {
const mode = getTestMode();
await delay(mode === 'slow' ? 2500 : 250);
if (mode === 'error') throw GMShopsError('server', 'Mock server error', 500);
const ws = MOCK_WORKSPACES[slug];
const plan = mockWorkspacePlan(slug);
if (!ws || mode === 'empty') return { data: { plan: plan, pricesHours: {}, services: {} } };
return { data: Object.assign({}, ws, { plan: plan }) };
}

function optionalNumber(value) {
if (value === null || value === undefined || value === '') return null;
const n = Number(value);
return isFinite(n) && n >= 0 ? n : null;
}

function normalizeWorkspace(json) {
const data = json && json.data;
if (!data || typeof data !== 'object') throw GMShopsError('invalid_response', 'Invalid workspace response');
const ph = data.pricesHours && typeof data.pricesHours === 'object' ? data.pricesHours : {};
const rawServices = data.services && typeof data.services === 'object' ? data.services : {};
const time = (v) => (typeof v === 'string' && TIME_RE.test(v) ? v : '');
const seatsTotal = optionalNumber(ph.seatsTotal);
const seatsAvailable = optionalNumber(ph.seatsAvailable);

const services = Object.keys(rawServices)
    .filter((id) => SERVICE_ID_RE.test(id) && rawServices[id] && rawServices[id].enabled === true)
    .map((id) => ({
    id: id,
    details: typeof rawServices[id].details === 'string' ? rawServices[id].details.trim().slice(0, 120) : '',
    }));

return {
    plan: data.plan === 'paid' ? 'paid' : 'free',
    prices: {
    hour: optionalNumber(ph.priceHour),
    halfDay: optionalNumber(ph.priceHalfDay),
    day: optionalNumber(ph.priceFullDay),
    week: optionalNumber(ph.priceWeek),
    month: optionalNumber(ph.priceMonth),
    },
    hours: { open: time(ph.openTime), close: time(ph.closeTime) },
    seats: { total: seatsTotal === null ? null : Math.floor(seatsTotal), available: seatsAvailable === null ? null : Math.floor(seatsAvailable) },
    services: services,
};
}

async function getWorkspace(slug) {
const clean = safeSlug(slug);
if (!clean) throw GMShopsError('not_found', 'Place not found', 404);
const json = await memoDetail('workspace:' + clean, () => (USE_MOCK ? mockGetWorkspace(clean) : requestWithRetry('/places/' + encodeURIComponent(clean) + '/workspace')));
return normalizeWorkspace(json);
}

function subscriptionWindow() {
const now = Date.now();
return { min: gazaDateString(now), max: gazaDateString(now + SUB_MAX_DAYS * 86400000) };
}

function validateSubscriptionRequest(raw) {
const src = raw || {};
const errors = {};

const name = String(src.name || '').replace(/\s+/g, ' ').trim();
if (name.length < 2 || name.length > 80) errors.name = 'ws.errName';

const code = BOOK_COUNTRY_CODES.indexOf(String(src.countryCode)) !== -1 ? String(src.countryCode) : '970';
let digits = String(src.phone || '').replace(/\D/g, '');
if (digits.indexOf('00') === 0) digits = digits.slice(2);
if (digits.indexOf(code) === 0 && digits.length === code.length + 9) digits = digits.slice(code.length);
else if (digits.charAt(0) === '0') digits = digits.slice(1);
if (!BOOK_NATIONAL_RE.test(digits)) errors.phone = 'ws.errWhatsapp';

const duration = String(src.duration || '');
if (SUB_DURATIONS.indexOf(duration) === -1) errors.duration = 'ws.errDuration';

const date = String(src.date || '');
if (!isRealDate(date)) {
    errors.date = 'ws.errDate';
} else {
    const win = subscriptionWindow();
    if (date < win.min) errors.date = 'ws.errPast';
    else if (date > win.max) errors.date = 'ws.errFar';
}

if (Object.keys(errors).length) return { errors: errors, payload: null };

return {
    errors: null,
    payload: {
    name: name,
    countryCode: code,
    whatsapp: digits,
    duration: duration,
    startDate: date,
    note: String(src.note || '').trim().slice(0, 300),
    },
};
}

function mockSaveSubscriptionRequest(slug, payload) {
try {
    const raw = localStorage.getItem(SUB_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const record = {
    id: window.GM_ID.generate('req'),
    slug: slug,
    name: payload.name,
    countryCode: payload.countryCode,
    whatsapp: payload.whatsapp,
    duration: payload.duration,
    startDate: payload.startDate,
    note: payload.note,
    createdAt: Date.now(),
    };
    list.unshift(record);
    localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(list.slice(0, SUB_STORAGE_MAX)));
    return record.id;
} catch (err) {
    // Do not pretend the request was saved: the visitor must see an error, not a fake success.
    throw GMShopsError('server', 'Could not save the mock request', 500);
}
}

async function mockSubmitSubscriptionRequest(slug, payload) {
const mode = getTestMode();
await delay(mode === 'slow' ? 2500 : 700);
if (mode === 'error') throw GMShopsError('server', 'Mock server error', 500);
// Same rule the backend enforces: only a workspace on the paid plan accepts requests.
if (mode === 'limit' || mockWorkspacePlan(slug) !== 'paid') {
    throw GMShopsError('forbidden', 'Plan does not allow requests', 403, null, 'plan_not_allowed');
}
return { data: { id: mockSaveSubscriptionRequest(slug, payload), status: 'pending' } };
}

async function submitSubscriptionRequest(slug, raw) {
const clean = safeSlug(slug);
if (!clean) throw GMShopsError('not_found', 'Place not found', 404);
const result = validateSubscriptionRequest(raw);
if (result.errors) throw GMShopsError('validation', 'Invalid subscription request', 422, result.errors);
const json = USE_MOCK
    ? await mockSubmitSubscriptionRequest(clean, result.payload)
    : await request('/places/' + encodeURIComponent(clean) + '/subscription-requests', { method: 'POST', body: result.payload });
const data = json && json.data;
return { id: data && data.id !== undefined && data.id !== null ? String(data.id) : '', status: 'pending' };
}

function mockMatches(place, params) {
if (params.type) {
    const t = params.type;
    const ok = t === place.type || (place.type === 'restaurant-cafe' && (t === 'restaurant' || t === 'cafe'));
    if (!ok) return false;
}
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

const memory = new Map();
const inflight = new Map();

function cleanParams(params) {
const p = params || {};
return {
    type: FILTER_TYPES.indexOf(p.type) !== -1 ? p.type : null,
    region: p.region ? normalizeRegion(p.region) : null,
    open: !!p.open,
    cursor: p.cursor ? String(p.cursor) : null,
    limit: Math.max(1, Math.min(Number(p.limit) || DEFAULT_LIMIT, MAX_LIMIT)),
};
}

function pageKey(c) {
return [c.type || '', c.region || '', c.open ? 1 : 0, c.cursor || '', c.limit].join('|');
}

function readPersisted(key) {
const cache = readJson(CACHE_KEY, {});
const entry = cache && cache[key];
if (!entry || !Array.isArray(entry.items)) return null;
return {
    savedAt: Number(entry.savedAt) || 0,
    page: {
    items: entry.items.map(normalizePlace).filter(Boolean),
    nextCursor: entry.nextCursor || null,
    hasMore: !!entry.hasMore && !!entry.nextCursor,
    total: typeof entry.total === 'number' ? entry.total : null,
    },
};
}

function writePersisted(key, page) {
const cache = readJson(CACHE_KEY, {});
cache[key] = {
    savedAt: Date.now(),
    items: page.items.slice(0, CACHE_MAX_ITEMS),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
};

const keys = Object.keys(cache);
if (keys.length > CACHE_MAX_KEYS) {
    keys
    .sort((a, b) => (cache[a].savedAt || 0) - (cache[b].savedAt || 0))
    .slice(0, keys.length - CACHE_MAX_KEYS)
    .forEach((oldKey) => { delete cache[oldKey]; });
}

writeJson(CACHE_KEY, cache);
}

function lookup(key, firstPage) {
const hit = memory.get(key);
if (hit) {
    memory.delete(key);
    memory.set(key, hit);
    return hit;
}
if (!firstPage) return null;
const stored = readPersisted(key);
if (stored) memory.set(key, stored);
return stored;
}

function remember(key, page, firstPage) {
memory.set(key, { savedAt: Date.now(), page: page });
while (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value);
if (firstPage) writePersisted(key, page);
}

function peekPage(params) {
if (USE_MOCK && getTestMode()) return null;
const clean = cleanParams(params);
const hit = lookup(pageKey(clean), !clean.cursor);
if (!hit || Date.now() - hit.savedAt > STALE_MS) return null;
return { page: hit.page, fresh: Date.now() - hit.savedAt < FRESH_MS };
}

function withSignal(promise, signal) {
if (!signal) return promise;
return new Promise((resolve, reject) => {
    if (signal.aborted) {
    reject(GMShopsError('aborted', 'Request aborted'));
    return;
    }
    const onAbort = () => reject(GMShopsError('aborted', 'Request aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
    (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
    (err) => { signal.removeEventListener('abort', onAbort); reject(err); }
    );
});
}

async function fetchPage(params, options) {
const opts = options || {};
const clean = cleanParams(params);
const key = pageKey(clean);
const firstPage = !clean.cursor;
const bypass = USE_MOCK && !!getTestMode();

if (!bypass && !opts.refresh) {
    const hit = lookup(key, firstPage);
    if (hit && Date.now() - hit.savedAt < FRESH_MS) return hit.page;
}

let pending = bypass ? null : inflight.get(key);
if (!pending) {
    pending = (USE_MOCK ? mockFetchPage(clean) : apiFetchPage(clean)).then((json) => {
    const page = normalizePage(json);
    if (!bypass) remember(key, page, firstPage);
    return page;
    });
    if (!bypass) {
    inflight.set(key, pending);
    const done = () => { inflight.delete(key); };
    pending.then(done, done);
    }
}

try {
    return await withSignal(pending, opts.signal);
} catch (err) {
    if (err && err.code !== 'aborted' && !bypass) {
    const stale = lookup(key, firstPage);
    if (stale && Date.now() - stale.savedAt <= STALE_MS) return Object.assign({}, stale.page, { stale: true });
    }
    throw err;
}
}

function clearCache() {
memory.clear();
detailCache.clear();
try {
    localStorage.removeItem(CACHE_KEY);
} catch (err) {
    console.error('shops cache clear failed:', err);
}
}

LEGACY_CACHE_KEYS.forEach((key) => {
try {
    localStorage.removeItem(key);
} catch (err) {
}
});

window.GMShops = {
isMock: USE_MOCK,
defaultLimit: DEFAULT_LIMIT,
filterTypes: FILTER_TYPES,
normalizeRegion,
fetchPage,
peekPage,
clearCache,
getPlace,
getMenu,
getTables,
submitReservation,
validateReservation,
reservationWindow,
getWorkspace,
submitSubscriptionRequest,
validateSubscriptionRequest,
subscriptionWindow,
};
})();