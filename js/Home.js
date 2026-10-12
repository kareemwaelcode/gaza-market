'use strict';

/*
 * Region catalog (single source of truth for the frontend)
 * ---------------------------------------------------------------------
 * code  : the stable identifier. It equals the data-i18n key used in the
 *         navbar dropdown, and it is what the backend should store/accept
 *         (e.g. GET /api/prices?region=Maghazi).
 * value : the value used by the "Add price" form (data-value on
 *         .npw-region-btn). It differs from `code` for some regions.
 *
 * normalizeRegion() accepts either form (any case, spaces/dashes ignored)
 * and always returns the `code`, so cards, dropdown, saved region and the
 * add-price form can never silently disagree.
 */
const GM_REGIONS = [
  { code: 'Nuseirat',          value: 'Nuseirat',          group: 'central' },
  { code: 'Breij',             value: 'Breij',             group: 'central' },
  { code: 'Maghazi',           value: 'Maghazi',           group: 'central' },
  { code: 'Zawayda',           value: 'Zawayda',           group: 'central' },
  { code: 'DeirBalah',         value: 'Deir al-Balah',     group: 'central' },
  { code: 'KhanYunis',         value: 'Khan Yunis',        group: 'south' },
  { code: 'Rafah',             value: 'Rafah',             group: 'south' },
  { code: 'MawasiKhanYunis',   value: 'Mawasi Khan Yunis', group: 'south' },
  { code: 'MawasiQarara',      value: 'Mawasi al-Qarara',  group: 'south' },
  { code: 'Alrimal',           value: 'Alrimal',           group: 'north' },
  { code: 'Alshaati',          value: 'Alshaati',          group: 'north' },
  { code: 'SheikhRadwan',      value: 'Sheikh Radwan',     group: 'north' },
  { code: 'Saftawi',           value: 'Saftawi',           group: 'north' },
  { code: 'BeitHanoun',        value: 'Beit Hanoun',       group: 'north' },
  { code: 'BeitLahia',         value: 'Beit Lahia',        group: 'north' },
  { code: 'TalHawa',           value: 'Tal Al-Hawa',       group: 'north' },
  { code: 'Jabalia',           value: 'Jabalia',           group: 'north' },
];

const GM_REGION_LOOKUP = (() => {
  const squash = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const map = new Map();
  GM_REGIONS.forEach(r => {
    map.set(squash(r.code), r.code);
    map.set(squash(r.value), r.code);
  });
  return { squash, map };
})();

function normalizeRegion(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  return GM_REGION_LOOKUP.map.get(GM_REGION_LOOKUP.squash(raw)) || null;
}

const REGION_STORAGE_KEY = 'gmSelectedArea'; // نفس المفتاح اللي يستخدمه region-guard.js وباقي الصفحات

function getSavedRegion() {
  try {
    return localStorage.getItem(REGION_STORAGE_KEY);
  } catch (err) {
    return null;
  }
}

let userRegion = normalizeRegion(window.GM_SELECTED_REGION) || normalizeRegion(getSavedRegion());
// "منطقتي" هي الافتراضية إذا المنطقة معروفة، وإلا "الكل"
let activeFilter = userRegion ? 'nearby' : 'all';

/*
 * Backend endpoints
 * ---------------------------------------------------------------------
 * Hero section: one request returns everything the hero needs.
 * Expected response (GET /api/hero):
 * {
 *   "section": { ...one row of the hero_section table (same column names)... },
 *   "stats":   { "products": 375, "prices": 2356, "listings": 100, "places": 35 },
 *   "ticker":  [ { "name_ar": "قهوة", "name_en": "Coffee", "price": 24 }, ... ]
 * }
 * Any part may be missing: whatever is missing keeps the static HTML value.
 */
const GM_API = {
  hero: '/api/hero',
};

function cardMatchesFilter(card) {
  if (activeFilter === 'nearby' && userRegion) {
    return normalizeRegion(card.dataset.region) === userRegion;
  }
  return true;
}

// أقصى عدد كروت نشغّل عليها الأنيميشن (الباقي يظهر مباشرة بدون حركة)
const MAX_ANIMATED_CARDS = 12;

function applyPriceFilter({ animate = false } = {}) {
  const container = document.getElementById('priceList');
  const emptyState = document.getElementById('priceEmptyState');
  if (!container) return;

  const cards = container.querySelectorAll('[data-role="card"]');
  const newlyShown = [];
  let visibleCount = 0;

  // مرحلة الكتابة فقط: بدون أي قراءة للأبعاد، ونكتب بس لما القيمة تتغير
  cards.forEach(card => {
    const matches = cardMatchesFilter(card);
    if (matches) visibleCount += 1;

    if (card.hidden === matches) {
      if (matches && animate) newlyShown.push(card);
      card.hidden = !matches;
    }
  });

  if (emptyState) emptyState.hidden = visibleCount !== 0;

  if (!animate || !newlyShown.length) return;

  const toAnimate = newlyShown.slice(0, MAX_ANIMATED_CARDS);
  toAnimate.forEach((card, i) => {
    card.style.setProperty('--i', i);
    card.classList.remove('is-entering');
  });

  void container.offsetWidth; // reflow واحد فقط لكل الكروت (بدل reflow لكل كرت)

  toAnimate.forEach(card => {
    card.classList.add('is-entering');
    card.addEventListener('animationend', () => card.classList.remove('is-entering'), { once: true });
  });
}

async function postVote(productId, vote) {
  try {
    await fetch(`/api/prices/${productId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote }),
    });
  } catch (err) {
    console.error('postVote failed:', err);
  }
}

const VOTE_STORAGE_PREFIX = 'gm_price_vote_';

function getStoredVote(productId) {
  try {
    return localStorage.getItem(`${VOTE_STORAGE_PREFIX}${productId}`);
  } catch (err) {
    return null;
  }
}

function setStoredVote(productId, vote) {
  try {
    if (vote) {
      localStorage.setItem(`${VOTE_STORAGE_PREFIX}${productId}`, vote);
    } else {
      localStorage.removeItem(`${VOTE_STORAGE_PREFIX}${productId}`);
    }
  } catch (err) {
    console.error('setStoredVote failed:', err);
  }
}

function applyCardVote(card, vote) {
  const confirmBtn = card.querySelector('[data-role="confirm-btn"]');
  const flagBtn = card.querySelector('[data-role="flag-btn"]');
  if (!confirmBtn || !flagBtn) return;

  confirmBtn.classList.toggle('is-confirmed', vote === 'correct');
  flagBtn.classList.toggle('is-flagged', vote === 'report');

  card.dataset.vote = vote || '';
}

function initCardVoteState(card) {
  applyCardVote(card, getStoredVote(card.dataset.productId));
}

function setCardVote(card, vote) {
  applyCardVote(card, vote);
  setStoredVote(card.dataset.productId, vote);
}

function handleConfirm(id) {
  const card = document.getElementById(`price-${id}`);
  if (!card) return;

  const nextVote = card.dataset.vote === 'correct' ? null : 'correct';
  setCardVote(card, nextVote);
  postVote(id, nextVote);
}

function handleFlag(id) {
  const card = document.getElementById(`price-${id}`);
  if (!card) return;

  const nextVote = card.dataset.vote === 'report' ? null : 'report';
  setCardVote(card, nextVote);
  postVote(id, nextVote);
}

function initPriceListEvents() {
  const container = document.getElementById('priceList');
  if (!container) return;

  container.querySelectorAll('[data-role="card"]').forEach(initCardVoteState);

  container.addEventListener('click', e => {
    const confirmBtn = e.target.closest('[data-role="confirm-btn"]');
    const flagBtn = e.target.closest('[data-role="flag-btn"]');

    if (confirmBtn) {
      const id = parseInt(confirmBtn.dataset.id, 10);
      if (!isNaN(id)) handleConfirm(id);
    }

    if (flagBtn) {
      const id = parseInt(flagBtn.dataset.id, 10);
      if (!isNaN(id)) handleFlag(id);
    }
  });
}

function syncFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(b => {
    const on = (b.dataset.filter || 'all') === activeFilter;
    b.classList.toggle('is-active', on);
    if (on) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  });
}

// الخلفية الخضراء المنزلقة
function moveFilterPill() {
  const active = document.querySelector('.filter-btn.is-active');
  if (!active) return;

  const group = active.parentElement;
  group.classList.add('gm-pill-group');
  group.style.setProperty('--pill-x', `${active.offsetLeft}px`);
  group.style.setProperty('--pill-y', `${active.offsetTop}px`);
  group.style.setProperty('--pill-w', `${active.offsetWidth}px`);
  group.style.setProperty('--pill-h', `${active.offsetHeight}px`);

  if (!group.classList.contains('has-pill')) {
    group.classList.add('has-pill');
    // نفعّل الـ transition بعد أول وضع، عشان ما ينزلق عند فتح الصفحة
    requestAnimationFrame(() => requestAnimationFrame(() => group.classList.add('is-ready')));
  }
}

function setFilter(next) {
  activeFilter = next;
  syncFilterButtons();
  moveFilterPill();
  applyPriceFilter({ animate: true });
}

function initFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter || 'all'));
  });

  syncFilterButtons();
  moveFilterPill();

  // الأبعاد ممكن تتغير بعد تحميل الخطوط أو تغيير اللغة/الاتجاه
  window.addEventListener('load', moveFilterPill, { passive: true });
  window.addEventListener('resize', moveFilterPill, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveFilterPill);

  new MutationObserver(() => requestAnimationFrame(moveFilterPill))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
}

function setRegionLabels(regionKey, regionLabel) {
  // نحط المفتاح في data-i18n عشان النص يتترجم لحاله عند تغيير اللغة
  const labelText = document.getElementById('areaLabelText');
  if (labelText) {
    labelText.dataset.i18n = regionKey;
    if (regionLabel) labelText.textContent = regionLabel;
  }

  // اسم المنطقة على زر "منطقتي"
  const nearbyBtn = document.querySelector('.filter-btn[data-filter="nearby"]');
  if (nearbyBtn) {
    const target = nearbyBtn.querySelector('[data-i18n]') || nearbyBtn.querySelector('span') || nearbyBtn;
    target.dataset.i18n = regionKey;
    if (regionLabel) target.textContent = regionLabel;
    moveFilterPill(); // العرض ممكن يتغير حسب طول اسم المنطقة
  }
}

function selectRegion(rawKey, regionLabel, { silent = false } = {}) {
  const regionKey = normalizeRegion(rawKey) || rawKey;
  const unchanged = regionKey === userRegion && activeFilter === 'nearby';
  userRegion = regionKey;

  try {
    localStorage.setItem(REGION_STORAGE_KEY, regionKey);
  } catch (err) {
    console.error('save region failed:', err);
  }

  setRegionLabels(regionKey, regionLabel);

  // نفس المنطقة ونفس الفلتر: ما في شي نعيد رسمه
  if (unchanged) return;

  // إذا اختار المستخدم منطقة، نعرض له "منطقتي" مباشرة
  if (!silent) setFilter('nearby');
}

function initRegionDropdown() {
  if (userRegion) {
    const preselectedLink = document.querySelector(`.dropdown-menu a[data-i18n="${userRegion}"]`);
    if (preselectedLink) selectRegion(userRegion, preselectedLink.textContent.trim(), { silent: true });
  }

  document.querySelectorAll('.dropdown-menu [data-i18n]').forEach(link => {
    if (!link.closest('.dropdown-header') && link.tagName === 'A') {
      link.addEventListener('click', e => {
        e.preventDefault();
        selectRegion(link.dataset.i18n, link.textContent.trim());

        const dropdownEl = document.getElementById('selectedAreaLabel');
        if (dropdownEl) bootstrap.Dropdown.getInstance(dropdownEl)?.hide();
      });
    }
  });

  document.querySelectorAll('.region-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const sub = toggle.nextElementSibling;
      if (!sub) return;

      const isOpen = sub.style.display !== 'none';
      sub.style.display = isOpen ? 'none' : 'block';

      const arrow = toggle.querySelector('.arrow');
      if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
    });
  });
}

function initCategoryCarousel() {
  const track = document.getElementById('catTrack');
  const btnPrev = document.getElementById('catPrev');
  const btnNext = document.getElementById('catNext');
  if (!track || !btnPrev || !btnNext) return;

  const viewport = track.closest('.cat-nav__viewport');
  if (!viewport) return;

  const STEP = 200;
  let offset = 0;
  let rafId = null;

  const isRTL = () => document.documentElement.dir === 'rtl';
  const getMaxOffset = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

  function applyOffset(raw) {
    offset = Math.max(0, Math.min(raw, getMaxOffset()));

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      track.style.transform = isRTL() ? `translateX(${offset}px)` : `translateX(${-offset}px)`;
      btnPrev.disabled = offset <= 0;
      btnNext.disabled = offset >= getMaxOffset();
    });
  }

  btnPrev.addEventListener('click', () => applyOffset(offset - STEP));
  btnNext.addEventListener('click', () => applyOffset(offset + STEP));

  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') applyOffset(offset - STEP);
    if (e.key === 'ArrowLeft') applyOffset(offset + STEP);
  });

  let touchStartX = 0;
  viewport.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  viewport.addEventListener('touchend', e => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) applyOffset(offset + (isRTL() ? -delta : delta));
  }, { passive: true });

  track.addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    e.preventDefault();

    track.querySelectorAll('.cat-pill').forEach(p => {
      p.classList.remove('is-active');
      p.removeAttribute('aria-current');
    });

    pill.classList.add('is-active');
    pill.setAttribute('aria-current', 'page');
  });

  // Recompute on resize (viewport size changes) and on full load
  // (fonts/images can shift scrollWidth after DOMContentLoaded fires).
  window.addEventListener('resize', () => applyOffset(offset), { passive: true });
  window.addEventListener('load', () => applyOffset(offset), { passive: true });
  applyOffset(0);
}

function updateHeroDatetime() {
  const lang = document.documentElement.lang || 'ar';
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const now = new Date();

  const dayEl = document.getElementById('heroDay');
  const timeEl = document.getElementById('heroTime');

  if (dayEl) {
    dayEl.textContent = now.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }
}

/*
 * Hero section (data from the backend)
 * ---------------------------------------------------------------------
 * - Texts   : come from the hero_section table (one row, ar + en columns).
 * - Numbers : the four stat boxes (products, prices, listings, places).
 * - Ticker  : latest price per product ("today's prices").
 *
 * Everything is fetched with ONE request (GM_API.hero) and stored in
 * heroData. When the language changes (the <html lang> attribute), the
 * hero is re-rendered from heroData without a new request.
 *
 * If the request fails, the static markup in home.html stays as a
 * fallback and the ticker animation still runs on it.
 */

let heroData = null;

// Maps each hero text element to its column prefix in hero_section.
// The real column is `${prefix}_ar` or `${prefix}_en`.
const HERO_TEXT_MAP = [
  { selector: '[data-i18n="hero.eyebrow"]',         column: 'hero_section_eyebrow' },
  { selector: '[data-i18n="hero.welcome"]',         column: 'hero_section_title' },
  { selector: '[data-i18n="hero.Live-prices"]',     column: 'hero_section_subtitle' },
  { selector: '#heroLocation',                      column: 'hero_section_location' },
  { selector: '.stat-box:nth-child(1) .stat-box__label', column: 'hero_section_products_label' },
  { selector: '.stat-box:nth-child(2) .stat-box__label', column: 'hero_section_prices_label' },
  { selector: '.stat-box:nth-child(3) .stat-box__label', column: 'hero_section_listings_label' },
  { selector: '.stat-box:nth-child(4) .stat-box__label', column: 'hero_section_places_label' },
  { selector: '#heroTicker .hero-ticker__label span',    column: 'hero_section_ticker_label' },
];

// Order of the stat boxes in the HTML.
const HERO_STAT_KEYS = ['products', 'prices', 'listings', 'places'];

function getCurrentLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'ar';
}

function formatTickerPrice(value) {
  const num = Number(value);
  if (!isFinite(num)) return '';
  return `₪${+num.toFixed(2)}`;
}

function renderHeroTexts(section) {
  if (!section) return;
  const lang = getCurrentLang();

  HERO_TEXT_MAP.forEach(({ selector, column }) => {
    const el = document.querySelector(selector);
    if (!el) return;

    const value = section[`${column}_${lang}`];
    if (typeof value !== 'string' || !value.trim()) return;

    // The text now belongs to the backend, so i18n.js must not overwrite it.
    el.removeAttribute('data-i18n');
    el.textContent = value;
  });

  const ticker = document.getElementById('heroTicker');
  const tickerLabel = section[`hero_section_ticker_label_${lang}`];
  if (ticker && tickerLabel) ticker.setAttribute('aria-label', tickerLabel);
}

function renderHeroStats(stats) {
  if (!stats) return;
  const boxes = document.querySelectorAll('.hero__stats .stat-box__num');

  HERO_STAT_KEYS.forEach((key, index) => {
    const el = boxes[index];
    const value = Number(stats[key]);
    if (el && isFinite(value)) el.textContent = value;
  });
}

const HERO_TICKER_SPEED_PX_S = 32;
let heroTickerResizeBound = false;

function setHeroTickerSpeed(track) {
  const halfWidth = track.scrollWidth / 2;
  if (!halfWidth) return false;
  const duration = Math.max(halfWidth / HERO_TICKER_SPEED_PX_S, 12);
  track.style.setProperty('--ticker-duration', `${duration}s`);
  return true;
}

function initHeroTicker() {
  const track = document.getElementById('heroTickerTrack');
  if (!track) return;

  // Only the originals: clones from a previous run are dropped first,
  // so this function is safe to call again after a re-render.
  track.querySelectorAll('[aria-hidden="true"]').forEach(clone => clone.remove());

  const sourceItems = Array.from(track.querySelectorAll('[data-ticker-item]'));
  if (!sourceItems.length) return;

  track.style.opacity = '0';

  // Duplicate the items once so the CSS marquee animation can loop
  // seamlessly. The duplicates are marked aria-hidden so screen readers
  // don't announce the same report twice.
  const fragment = document.createDocumentFragment();
  sourceItems.forEach(item => {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    fragment.appendChild(clone);
  });
  track.appendChild(fragment);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (setHeroTickerSpeed(track)) {
      track.style.transition = 'opacity .3s ease';
      track.style.opacity = '1';
    }
  }));

  if (!heroTickerResizeBound) {
    heroTickerResizeBound = true;
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const current = document.getElementById('heroTickerTrack');
        if (current) setHeroTickerSpeed(current);
      }, 200);
    }, { passive: true });
  }
}

function renderHeroTicker(items) {
  const track = document.getElementById('heroTickerTrack');
  const ticker = document.getElementById('heroTicker');
  if (!track || !Array.isArray(items)) return;

  // The API answered but there are no prices: hide the strip.
  if (!items.length) {
    if (ticker) ticker.style.display = 'none';
    return;
  }
  if (ticker) ticker.style.display = '';

  const lang = getCurrentLang();
  const fragment = document.createDocumentFragment();

  items.forEach(entry => {
    const priceText = formatTickerPrice(entry.price);
    const nameText = entry[`name_${lang}`] || entry.name_ar || entry.name_en || '';
    if (!nameText || !priceText) return;

    const item = document.createElement('span');
    item.className = 'hero-ticker__item';
    item.setAttribute('data-ticker-item', '');

    const name = document.createElement('span');
    name.className = 'hero-ticker__item-name';
    name.textContent = nameText;

    const badge = document.createElement('span');
    badge.className = 'hero-ticker__badge';
    badge.textContent = priceText;

    item.append(name, badge);
    fragment.appendChild(item);
  });

  track.replaceChildren(fragment);
  initHeroTicker();
}

function renderHero() {
  if (!heroData) return;
  renderHeroTexts(heroData.section);
  renderHeroStats(heroData.stats);
  renderHeroTicker(heroData.ticker);
}

async function loadHero() {
  try {
    const res = await fetch(GM_API.hero, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    heroData = await res.json();
  } catch (err) {
    console.error('loadHero failed:', err);
    // Fallback: keep the static HTML and just run the ticker animation on it.
    initHeroTicker();
    return;
  }

  renderHero();
}

// Re-render the hero when the language changes (no new request).
function initHeroLangWatcher() {
  let lastLang = getCurrentLang();

  new MutationObserver(() => {
    const lang = getCurrentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    renderHero();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

function buildHeroTickerPrintArea() {
  const track = document.getElementById('heroTickerTrack');
  const labelEl = document.querySelector('#heroTicker .hero-ticker__label span');

  const root = document.createElement('div');
  root.id = 'heroTickerPrintArea';

  const heading = document.createElement('h1');
  heading.textContent = labelEl ? labelEl.textContent.trim() : '';

  const dateLine = document.createElement('p');
  dateLine.className = 'hero-ticker-print__date';
  const lang = document.documentElement.lang || 'ar';
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  dateLine.textContent = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const list = document.createElement('ul');

  // Only use the original (non-duplicated) items for the printable
  // report, so nothing is listed twice.
  const items = track
    ? Array.from(track.querySelectorAll('[data-ticker-item]:not([aria-hidden="true"])'))
    : [];

  items.forEach(item => {
    const nameEl = item.querySelector('.hero-ticker__item-name');
    const badgeEl = item.querySelector('.hero-ticker__badge');

    const li = document.createElement('li');

    const name = document.createElement('span');
    name.textContent = nameEl ? nameEl.textContent.trim() : '';

    const count = document.createElement('b');
    count.textContent = badgeEl ? badgeEl.textContent.trim() : '';

    li.append(name, count);
    list.appendChild(li);
  });

  root.append(heading, dateLine, list);
  return root;
}

function exportHeroTickerPdf() {
  const existing = document.getElementById('heroTickerPrintArea');
  if (existing) existing.remove();

  document.body.appendChild(buildHeroTickerPrintArea());
  document.body.classList.add('is-printing-ticker');
  window.print();
}

window.addEventListener('afterprint', () => {
  document.body.classList.remove('is-printing-ticker');
  const printRoot = document.getElementById('heroTickerPrintArea');
  if (printRoot) printRoot.remove();
});

function initHeroTickerPdfButton() {
  const btn = document.getElementById('heroTickerPdfBtn');
  if (!btn) return;
  btn.addEventListener('click', () => exportHeroTickerPdf());
}

if (!window._heroDatetimeStarted) {
  window._heroDatetimeStarted = true;
  updateHeroDatetime();
  setInterval(updateHeroDatetime, 1000);
}

const GM_LEVELS = [
  { key: 'beginner', min: 0, max: 50, label: 'points.tierBeginner', fallback: 'مبتدئ', className: 'points-tier--bronze' },
  { key: 'active', min: 50, max: 150, label: 'points.tierActive', fallback: 'نشيط', className: 'points-tier--silver' },
  { key: 'expert', min: 150, max: 400, label: 'points.tierExpert', fallback: 'خبير', className: 'points-tier--gold' },
  { key: 'legend', min: 400, max: null, label: 'points.tierLegend', fallback: 'أسطورة', className: 'points-tier--legend' },
];

const GM_MOCK_STATE = {
  auth: {
    isLoggedIn: true,
  },
  currentUser: {
    id: 'u2',
    name: 'سارة أبو دلال',
    points: 410,
    avatarUrl: null,
  },
  leaderboard: [
    { id: 'u2', name: 'سارة أبو دلال', points: 410 },


  ],
};

async function gmFetchPointsData() {
  return Promise.resolve(GM_MOCK_STATE);
}

function gmGetLevel(points) {
  return GM_LEVELS.find(l => points >= l.min && (l.max === null || points < l.max)) || GM_LEVELS[0];
}

function gmTranslate(key, fallback) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    const value = window.i18n.t(key);
    if (value && value !== key) return value;
  }
  return fallback;
}

function gmInitials(name) {
  return (name || '').trim().charAt(0).toUpperCase() || '؟';
}

function gmSetTierIcon(level) {
  const iconContainer = document.getElementById('userLevelIcon');
  const iconsTemplate = document.getElementById('pointsTierIconsTemplate');
  if (!iconContainer || !iconsTemplate) return;

  iconContainer.replaceChildren();
  const iconSvg = iconsTemplate.content.querySelector(`svg[data-tier="${level.key}"]`);
  if (iconSvg) iconContainer.appendChild(iconSvg.cloneNode(true));
}

function gmRenderUserCard(user) {
  const nameEl = document.getElementById('pointsUserName');
  const valueEl = document.getElementById('userPointsValue');
  const avatarEl = document.getElementById('pointsAvatar');
  const badgeEl = document.getElementById('userLevelBadge');
  const textEl = document.getElementById('userLevelText');
  const barEl = document.getElementById('pointsProgressBar');
  const trackEl = document.getElementById('pointsProgressTrack');
  const hintEl = document.getElementById('pointsNextLevelHint');

  if (!nameEl || !valueEl || !avatarEl || !badgeEl || !textEl || !barEl || !trackEl || !hintEl) return;

  const points = user ? (user.points || 0) : 0;
  const level = gmGetLevel(points);

  nameEl.textContent = user ? user.name : gmTranslate('points.guest', 'ضيف');
  valueEl.textContent = points;

  avatarEl.replaceChildren();
  if (user && user.avatarUrl) {
    const img = document.createElement('img');
    img.src = user.avatarUrl;
    img.alt = '';
    avatarEl.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = gmInitials(user && user.name);
    avatarEl.appendChild(span);
  }

  badgeEl.className = `points-tier ${level.className}`;
  textEl.textContent = gmTranslate(level.label, level.fallback);
  gmSetTierIcon(level);

  const rangeEnd = level.max === null ? points : level.max;
  const pct = level.max === null
    ? 100
    : Math.min(100, Math.max(0, Math.round(((points - level.min) / (rangeEnd - level.min)) * 100)));

  barEl.style.width = `${pct}%`;
  trackEl.setAttribute('aria-valuenow', pct);

  hintEl.textContent = !user
    ? gmTranslate('points.hintLogin', 'سجّل دخول عشان تبلش تجمع نقاط')
    : level.max === null
      ? gmTranslate('points.hintMax', 'وصلت لأعلى مستوى 🎉')
      : gmTranslate('points.hintRemaining', 'محتاج {count} نقطة عشان توصل للمستوى الجاي').replace('{count}', level.max - points);
}

function gmRenderLeaderboard(entries, currentUserId) {
  const listEl = document.getElementById('pointsLeaderboardList');
  const rowTemplate = document.getElementById('leaderboardRowTemplate');
  if (!listEl || !rowTemplate) return;

  const sorted = (entries || []).slice().sort((a, b) => b.points - a.points);
  listEl.replaceChildren();

  if (!sorted.length) {
    const empty = document.createElement('p');
    empty.className = 'points-leaderboard__empty';
    empty.textContent = gmTranslate('points.leaderboardEmpty', 'لا يوجد متصدرين بعد');
    listEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  sorted.forEach((entry, index) => {
    const rank = index + 1;
    const row = rowTemplate.content.firstElementChild.cloneNode(true);

    if (entry.id === currentUserId) row.classList.add('points-leaderboard__row--me');

    const rankEl = row.querySelector('[data-role="rank"]');
    rankEl.textContent = rank;
    if (rank <= 3) rankEl.classList.add(`points-rank--${rank}`);

    const avatarEl = row.querySelector('[data-role="avatar"]');
    avatarEl.replaceChildren();
    if (entry.avatarUrl) {
      const img = document.createElement('img');
      img.src = entry.avatarUrl;
      img.alt = '';
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = gmInitials(entry.name);
    }

    row.querySelector('[data-role="name"]').textContent = entry.name;

    const countEl = row.querySelector('[data-role="count"]');
    countEl.prepend(document.createTextNode(`${entry.points} `));

    fragment.appendChild(row);
  });

  listEl.appendChild(fragment);
}

async function initPointsCard() {
  let data;

  try {
    data = await gmFetchPointsData();
  } catch (err) {
    console.error('gmFetchPointsData failed:', err);
    data = { auth: { isLoggedIn: false }, currentUser: null, leaderboard: [] };
  }

  const isLoggedIn = !!(data.auth && data.auth.isLoggedIn);
  const user = isLoggedIn ? data.currentUser : null;

  gmRenderUserCard(user);
  gmRenderLeaderboard(data.leaderboard, user ? user.id : null);
}

window.initPointsCard = initPointsCard;

document.addEventListener('DOMContentLoaded', () => {
  initPriceListEvents();
  initFilterButtons();
  initRegionDropdown();
  applyPriceFilter();
  initCategoryCarousel();
  initHeroLangWatcher();
  loadHero();
  initHeroTickerPdfButton();
  initPointsCard();
});