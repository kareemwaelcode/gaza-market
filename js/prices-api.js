'use strict';

(function () {
const DEFAULTS = {
USE_MOCK: true,
API_BASE: '/api',
TIMEOUT_MS: 15000,
CREDENTIALS: 'same-origin',
CSRF_URL: '/sanctum/csrf-cookie',
};

const CONFIG = Object.assign({}, DEFAULTS, window.GM_CONFIG || {});
const USE_MOCK = window.GM_ENV.isMockAllowed();
const API_BASE = String(CONFIG.API_BASE).replace(/\/+$/, '');

const CACHE_KEY = 'gm_prices_cache_v1';
const CACHE_MAX_KEYS = 12;
const CACHE_MAX_ITEMS = 30;
const MOCK_VOTES_KEY = 'gm_mock_votes_v1';
const MOCK_REMOVED_KEY = 'gm_mock_removed_v1';
const MAX_REPORTS = 3;

const CATEGORY_ALIASES = {
'fuel': 'fuel-combustibles',
'oils-fats': 'oils-grease',
'carbonated-drinks': 'soft-drinks',
'baby-supplies': 'diapers-baby',
};

function GMPricesError(code, message, status, errors) {
const err = new Error(message || code);
err.name = 'GMPricesError';
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

function normalizeCategory(slug) {
if (slug === null || slug === undefined || slug === '') return null;
const key = String(slug).trim().toLowerCase();
return CATEGORY_ALIASES[key] || key;
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
    console.error('prices storage failed:', err);
}
}

function toCount(value) {
const num = Math.floor(Number(value));
return isFinite(num) && num > 0 ? num : 0;
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

function normalizeItem(raw) {
if (!raw || raw.price_id === undefined || raw.price_id === null || raw.price_id === '') return null;

const price = Number(raw.price);
if (!isFinite(price) || price < 0) return null;

const nameAr = typeof raw.product_name_ar === 'string' ? raw.product_name_ar.trim() : '';
const nameEn = typeof raw.product_name_en === 'string' ? raw.product_name_en.trim() : '';
if (!nameAr && !nameEn) return null;

const createdAt = raw.created_at ? new Date(raw.created_at) : null;
const quantity = Number(raw.quantity);
const vote = raw.my_vote === 'confirm' || raw.my_vote === 'report' ? raw.my_vote : null;

return {
    price_id: String(raw.price_id),
    product_id: raw.product_id === undefined ? null : raw.product_id,
    product_name_ar: nameAr,
    product_name_en: nameEn,
    quantity: isFinite(quantity) && quantity > 0 ? quantity : null,
    unit: typeof raw.unit === 'string' && raw.unit ? raw.unit : null,
    store_name: typeof raw.store_name === 'string' ? raw.store_name.trim() : '',
    region: typeof raw.region === 'string' ? raw.region : '',
    category: normalizeCategory(raw.category),
    price,
    created_at: createdAt && !isNaN(createdAt.getTime()) ? createdAt.toISOString() : null,
    confirm_count: toCount(raw.confirm_count),
    report_count: toCount(raw.report_count),
    my_vote: vote,
};
}

function normalizePage(json) {
if (!json || !Array.isArray(json.data)) {
    throw GMPricesError('invalid_response', 'Invalid prices response');
}

const meta = json.meta && typeof json.meta === 'object' ? json.meta : {};
const nextCursor = json.next_cursor || meta.next_cursor || null;
const hasMoreFlag = json.has_more !== undefined ? json.has_more : meta.has_more;

return {
    items: json.data.map(normalizeItem).filter(Boolean),
    nextCursor: nextCursor,
    hasMore: (hasMoreFlag === undefined ? true : !!hasMoreFlag) && !!nextCursor,
};
}

function normalizeVoteResult(json) {
if (json && json.data && typeof json.data === 'object' && !Array.isArray(json.data)) json = json.data;
if (!json || typeof json !== 'object') {
    throw GMPricesError('invalid_response', 'Invalid vote response');
}

const vote = json.my_vote === 'confirm' || json.my_vote === 'report' ? json.my_vote : null;
return {
    my_vote: vote,
    confirm_count: toCount(json.confirm_count),
    report_count: toCount(json.report_count),
    removed: !!json.removed,
};
}

function getXsrfToken() {
const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
return match ? decodeURIComponent(match[1]) : null;
}

function buildHeaders(hasBody) {
const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
};

const lang = document.documentElement.getAttribute('lang');
if (lang) headers['Accept-Language'] = lang;
if (hasBody) headers['Content-Type'] = 'application/json';

const xsrf = getXsrfToken();
if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;

return headers;
}

let csrfPromise = null;

function ensureCsrfCookie() {
if (getXsrfToken()) return Promise.resolve();
if (!csrfPromise) {
    csrfPromise = fetch(CONFIG.CSRF_URL, {
    method: 'GET',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: CONFIG.CREDENTIALS,
    }).then(() => undefined, () => undefined).then(() => { csrfPromise = null; });
}
return csrfPromise;
}

async function request(method, path, body) {
if (method !== 'GET') await ensureCsrfCookie();
const controller = typeof AbortController === 'function' ? new AbortController() : null;
const timer = controller ? setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS) : null;

let res;
try {
    res = await fetch(API_BASE + path, {
    method,
    headers: buildHeaders(body !== undefined),
    credentials: CONFIG.CREDENTIALS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: controller ? controller.signal : undefined,
    });
} catch (err) {
    if (err && err.name === 'AbortError') throw GMPricesError('timeout', 'Request timed out');
    throw GMPricesError('network', 'Network error');
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
    throw GMPricesError(codeFromStatus(res.status), message, res.status, json && json.errors);
}

if (json === null) throw GMPricesError('invalid_response', 'Empty or invalid JSON response', res.status);
return json;
}

function apiFetchPage(params) {
const query = new URLSearchParams();
if (params.region) query.set('region', params.region);
if (params.category) query.set('category', params.category);
if (params.cursor) query.set('cursor', params.cursor);
query.set('limit', String(params.limit));

return request('GET', '/prices?' + query.toString());
}

function apiVote(priceId, vote) {
return request('POST', '/prices/' + encodeURIComponent(priceId) + '/vote', { vote });
}

const MOCK_BASE_TIME = Math.floor(Date.now() / 60000) * 60000;

const MOCK_ROWS = [
{
    price_id: 1,
    product_id: 101,
    product_name_en: 'White sugar',
    product_name_ar: 'سكر أبيض',
    quantity: 1,
    unit: 'kg',
    store_name: 'بقالة أبو محمد',
    region: 'Nuseirat',
    category: 'sugars',
    price: 8,
    created_at: new Date(MOCK_BASE_TIME - 3 * 60000).toISOString(),
    base_confirm: 5,
    base_report: 0,
},
];

function withMockVote(row, votes) {
const vote = votes[String(row.price_id)] || null;
return {
    price_id: row.price_id,
    product_id: row.product_id,
    product_name_en: row.product_name_en,
    product_name_ar: row.product_name_ar,
    quantity: row.quantity,
    unit: row.unit,
    store_name: row.store_name,
    region: row.region,
    category: row.category,
    price: row.price,
    created_at: row.created_at,
    confirm_count: row.base_confirm + (vote === 'confirm' ? 1 : 0),
    report_count: row.base_report + (vote === 'report' ? 1 : 0),
    my_vote: vote,
};
}

function compareNewestFirst(a, b) {
if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
return b.price_id - a.price_id;
}

function encodeCursor(row) {
return `${row.created_at}|${row.price_id}`;
}

function decodeCursor(cursor) {
const index = String(cursor).lastIndexOf('|');
if (index < 1) return null;
return { created_at: cursor.slice(0, index), price_id: Number(cursor.slice(index + 1)) };
}

async function mockFetchPage(params) {
const mode = getTestMode();
await delay(mode === 'slow' ? 3000 : 300);
if (navigator.onLine === false || mode === 'error') throw GMPricesError('network', 'mock network error');
if (mode === 'empty') return { data: [], next_cursor: null, has_more: false };

const votes = readJson(MOCK_VOTES_KEY, {});
const removed = readJson(MOCK_REMOVED_KEY, []);

let rows = MOCK_ROWS.filter((row) => removed.indexOf(String(row.price_id)) === -1);
if (params.region) rows = rows.filter((row) => row.region === params.region);
if (params.category) rows = rows.filter((row) => row.category === params.category);
rows.sort(compareNewestFirst);

const cursor = params.cursor ? decodeCursor(params.cursor) : null;
if (cursor) {
    rows = rows.filter((row) => row.created_at < cursor.created_at ||
    (row.created_at === cursor.created_at && row.price_id < cursor.price_id));
}

const pageRows = rows.slice(0, params.limit);
const hasMore = rows.length > params.limit;

return {
    data: pageRows.map((row) => withMockVote(row, votes)),
    next_cursor: hasMore ? encodeCursor(pageRows[pageRows.length - 1]) : null,
    has_more: hasMore,
};
}

async function mockVote(priceId, vote) {
const mode = getTestMode();
await delay(250);
if (navigator.onLine === false || mode === 'votefail') throw GMPricesError('network', 'mock vote error');

const row = MOCK_ROWS.find((item) => String(item.price_id) === String(priceId));
if (!row) throw GMPricesError('not_found', 'Price not found', 404);

const votes = readJson(MOCK_VOTES_KEY, {});
if (vote) votes[String(priceId)] = vote;
else delete votes[String(priceId)];
writeJson(MOCK_VOTES_KEY, votes);

const result = withMockVote(row, votes);
const removedNow = result.report_count > MAX_REPORTS;

if (removedNow) {
    const removed = readJson(MOCK_REMOVED_KEY, []);
    removed.push(String(priceId));
    writeJson(MOCK_REMOVED_KEY, removed);
}

return {
    price_id: result.price_id,
    my_vote: result.my_vote,
    confirm_count: result.confirm_count,
    report_count: result.report_count,
    removed: removedNow,
};
}

async function fetchPage(params) {
const json = USE_MOCK ? await mockFetchPage(params) : await apiFetchPage(params);
return normalizePage(json);
}

async function vote(priceId, value) {
const json = USE_MOCK ? await mockVote(priceId, value) : await apiVote(priceId, value);
return normalizeVoteResult(json);
}

function readCache(key) {
const cache = readJson(CACHE_KEY, {});
const entry = cache && cache[key];
if (!entry || !Array.isArray(entry.items)) return null;
return {
    items: entry.items.map(normalizeItem).filter(Boolean),
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

window.GMPrices = {
isMock: USE_MOCK,
maxReports: MAX_REPORTS,
normalizeCategory,
fetchPage,
vote,
readCache,
writeCache,
};
})();