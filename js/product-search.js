'use strict';

/*
* بحث المنتجات مع Debouncing لكل حقل بحث.
*
* الحقول المستهدفة:
*   1) بحث الناف بار:                 input.search-input
*   2) حقل المنتج في مودال إضافة سعر:  #productSearch
*
* كل حقل إله مؤقّته وطلبه الخاص: الطلب ما بنطلع إلا بعد ما المستخدم يوقف كتابة
* DELAY_MS، والطلب القديم بينلغي لو بدأ طلب جديد، وأي رد متأخر بيتجاهل.
* الباك إند: GET /api/products/search?q=...  (عام، بدون تسجيل دخول، المعتمد فقط)
*/
(function () {
var CONFIG = Object.assign({ API_BASE: '/api', TIMEOUT_MS: 15000, CREDENTIALS: 'same-origin' }, window.GM_CONFIG || {});
var API_BASE = String(CONFIG.API_BASE).replace(/\/+$/, '');
var USE_MOCK = !!(window.GM_ENV && window.GM_ENV.isMockAllowed());

var DELAY_MS = 350;
var MIN_CHARS = 2;   // نفس حد الباك إند (min:2)
var MAX_CHARS = 50;  // نفس حد الباك إند (max:50)
var MAX_ITEMS = 8;

var TARGETS = [
{ selector: 'input.search-input', pickFills: false },
{ selector: '#productSearch', pickFills: true },
];

var MOCK_ROWS = [
{ id: 1, name_ar: 'سكر أبيض', name_en: 'White sugar', quantity: '1.00', price: '8.00', store_name: 'بقالة أبو محمد', area: { name_ar: 'النصيرات' } },
{ id: 2, name_ar: 'أرز مصري', name_en: 'Egyptian rice', quantity: '1.00', price: '6.50', store_name: 'سوبرماركت الأمل', area: { name_ar: 'الرمال' } },
{ id: 3, name_ar: 'زيت دوار الشمس', name_en: 'Sunflower oil', quantity: '1.00', price: '14.00', store_name: 'بقالة الشروق', area: { name_ar: 'الشجاعية' } },
];

// ---------- debounce ----------
function debounce(fn, wait) {
var timer = null;
function debounced() {
    var ctx = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
    timer = null;
    fn.apply(ctx, args);
    }, wait);
}
debounced.cancel = function () {
    clearTimeout(timer);
    timer = null;
};
return debounced;
}

// ---------- اللغة والنصوص ----------
function isEnglish() {
return document.documentElement.lang === 'en';
}

function text(ar, en) {
return isEnglish() ? en : ar;
}

function pickName(item) {
var ar = item.name_ar;
var en = item.name_en;
return (isEnglish() ? en || ar : ar || en) || '';
}

// ---------- الطلب ----------
function mockSearch(q) {
var needle = q.toLowerCase();
var rows = MOCK_ROWS.filter(function (row) {
    return (row.name_ar || '').toLowerCase().indexOf(needle) !== -1 ||
    (row.name_en || '').toLowerCase().indexOf(needle) !== -1;
});
return new Promise(function (resolve) { setTimeout(function () { resolve(rows); }, 150); });
}

function apiSearch(q, signal) {
var timeoutController = typeof AbortController === 'function' ? new AbortController() : null;
var timer = timeoutController ? setTimeout(function () { timeoutController.abort(); }, CONFIG.TIMEOUT_MS) : null;

// لو المستخدم كتب حرف جديد (signal) أو انتهت المهلة، الطلب بينلغي
if (signal && timeoutController) {
    signal.addEventListener('abort', function () { timeoutController.abort(); });
}

return fetch(API_BASE + '/products/search?q=' + encodeURIComponent(q), {
    method: 'GET',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: CONFIG.CREDENTIALS,
    signal: timeoutController ? timeoutController.signal : undefined,
})
    .then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
    })
    .then(function (json) {
    return json && Array.isArray(json.data) ? json.data : [];
    })
    .then(
    function (rows) { if (timer) clearTimeout(timer); return rows; },
    function (err) { if (timer) clearTimeout(timer); throw err; }
    );
}

// ---------- الستايل (مرة وحدة) ----------
function injectStyles() {
if (document.getElementById('gm-psearch-style')) return;
var style = document.createElement('style');
style.id = 'gm-psearch-style';
style.textContent =
    '.gm-psearch-list{position:absolute;top:calc(100% + 4px);inset-inline:0;z-index:1080;margin:0;padding:4px;list-style:none;' +
    'background:#fff;color:#212529;border:1px solid rgba(0,0,0,.12);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);' +
    'max-height:320px;overflow-y:auto;text-align:start}' +
    '.gm-psearch-item{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:8px;cursor:pointer}' +
    '.gm-psearch-item:hover,.gm-psearch-item[aria-selected="true"]{background:rgba(0,0,0,.06)}' +
    '.gm-psearch-name{font-weight:600}' +
    '.gm-psearch-meta{font-size:.82em;opacity:.75}' +
    '.gm-psearch-empty{padding:10px;font-size:.9em;opacity:.75;cursor:default}' +
    'body.dark-mode .gm-psearch-list{background:#1f2328;color:#e6e6e6;border-color:rgba(255,255,255,.14)}' +
    'body.dark-mode .gm-psearch-item:hover,body.dark-mode .gm-psearch-item[aria-selected="true"]{background:rgba(255,255,255,.08)}';
document.head.appendChild(style);
}

// ---------- ربط حقل واحد ----------
var uid = 0;

function attach(input, opts) {
if (!input || input.dataset.gmPsearch === '1') return;
input.dataset.gmPsearch = '1';

var host = input.parentElement;
if (!host) return;
if (window.getComputedStyle(host).position === 'static') host.style.position = 'relative';

var list = document.createElement('ul');
list.className = 'gm-psearch-list';
list.id = 'gm-psearch-' + (++uid);
list.setAttribute('role', 'listbox');
list.hidden = true;
host.appendChild(list);

input.setAttribute('aria-autocomplete', 'list');
input.setAttribute('aria-controls', list.id);
input.setAttribute('aria-expanded', 'false');

var controller = null;
var seq = 0; // رقم آخر طلب: أي رد برقم أقدم بيتجاهل

function hide() {
    list.hidden = true;
    list.textContent = '';
    input.setAttribute('aria-expanded', 'false');
}

function cancelPending() {
    seq++;
    if (controller) {
    controller.abort();
    controller = null;
    }
}

function render(rows) {
    list.textContent = '';

    if (!rows.length) {
    var empty = document.createElement('li');
    empty.className = 'gm-psearch-empty';
    empty.textContent = text('ما في نتائج', 'No results');
    list.appendChild(empty);
    }

    rows.slice(0, MAX_ITEMS).forEach(function (item) {
    var li = document.createElement('li');
    li.className = 'gm-psearch-item';
    li.setAttribute('role', 'option');
    li.dataset.name = pickName(item);

    var name = document.createElement('span');
    name.className = 'gm-psearch-name';
    name.textContent = pickName(item);
    li.appendChild(name);

    var meta = [];
    if (item.price !== undefined && item.price !== null) meta.push('₪' + Number(item.price).toFixed(2));
    if (item.store_name) meta.push(item.store_name);
    if (item.area) meta.push(isEnglish() ? item.area.name_en || item.area.name_ar : item.area.name_ar || item.area.name_en);

    var metaEl = document.createElement('span');
    metaEl.className = 'gm-psearch-meta';
    metaEl.textContent = meta.filter(Boolean).join(' • ');
    li.appendChild(metaEl);

    list.appendChild(li);
    });

    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
}

function run() {
    var q = input.value.trim();
    if (q.length < MIN_CHARS) {
    hide();
    return;
    }
    q = q.slice(0, MAX_CHARS);

    // ألغي الطلب السابق لهاد الحقل بس (باقي الحقول مش متأثرة)
    cancelPending();
    var mine = seq;
    controller = typeof AbortController === 'function' ? new AbortController() : null;

    var request = USE_MOCK ? mockSearch(q) : apiSearch(q, controller ? controller.signal : undefined);

    request.then(
    function (rows) {
        if (mine !== seq) return;
        controller = null;
        render(rows);
    },
    function (err) {
        if (mine !== seq) return;
        controller = null;
        if (err && err.name === 'AbortError') return;
        hide(); // خطأ شبكة أو سيرفر: القائمة بتختفي بدون رسالة مزعجة
    }
    );
}

var debouncedRun = debounce(run, DELAY_MS);

input.addEventListener('input', function () {
    if (input.value.trim().length < MIN_CHARS) {
    debouncedRun.cancel();
    cancelPending();
    hide();
    return;
    }
    debouncedRun();
});

input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
    debouncedRun.cancel();
    cancelPending();
    hide();
    }
});

// mousedown (مش click) عشان الـ blur ما يخفي القائمة قبل الاختيار
list.addEventListener('mousedown', function (e) {
    var li = e.target.closest ? e.target.closest('.gm-psearch-item') : null;
    if (!li) return;
    e.preventDefault();
    if (opts.pickFills) {
    debouncedRun.cancel();
    cancelPending();
    input.value = li.dataset.name || '';
    }
    hide();
});

document.addEventListener('mousedown', function (e) {
    if (!host.contains(e.target)) hide();
});

input.addEventListener('blur', function () {
    setTimeout(function () {
    if (document.activeElement !== input) hide();
    }, 150);
});
}

function init() {
injectStyles();
TARGETS.forEach(function (target) {
    Array.prototype.forEach.call(document.querySelectorAll(target.selector), function (input) {
    attach(input, target);
    });
});
}

window.GMProductSearch = { debounce: debounce, init: init };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();