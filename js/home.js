'use strict';

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

const REGION_STORAGE_KEY = 'gmSelectedArea';

function getSavedRegion() {
  try {
    return localStorage.getItem(REGION_STORAGE_KEY);
  } catch (err) {
    return null;
  }
}

let userRegion = normalizeRegion(window.GM_SELECTED_REGION) || normalizeRegion(getSavedRegion());

let activeFilter = userRegion ? 'nearby' : 'all';
let activeCategory = 'all';

const GM_API = {
  hero: '/api/hero',
};

const PRICE_PAGE_SIZE = 10;
const PRICE_LOAD_TIMEOUT_MS = 15000;
const POINTS_LOAD_TIMEOUT_MS = 15000;
const HERO_LOAD_TIMEOUT_MS = 8000;
const MAX_ANIMATED_CARDS = 12;
const PRICE_TIME_REFRESH_MS = 60000;

const priceState = {
  items: [],
  nextCursor: null,
  hasMore: false,
  loading: false,
  requestId: 0,
  fromCache: false,
  savedAt: null,
  view: 'loading',
  emptyKey: 'prices.empty',
  errorKey: 'prices.errorTitle',
};

const pendingVotes = new Set();

function tr(key, fallback) {
  if (typeof i18n !== 'undefined' && typeof i18n.t === 'function') {
    const value = i18n.t(key);
    if (value && value !== key) return value;
  }
  return fallback || key;
}

function withTimeout(promise, ms) {
  let timer = null;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Request timed out');
      err.code = 'timeout';
      reject(err);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function priceEl(id) {
  return document.getElementById(id);
}

function priceLocale() {
  return getCurrentLang() === 'ar' ? 'ar-EG' : 'en-GB';
}

function announcePrice(message) {
  const sr = priceEl('priceSr');
  if (!sr) return;
  sr.textContent = '';
  setTimeout(() => { sr.textContent = message; }, 50);
}

function getPriceQuery() {
  const region = activeFilter === 'nearby' ? userRegion : null;
  const category = activeCategory === 'all' ? null : GMPrices.normalizeCategory(activeCategory);
  return { region, category };
}

function priceQueryKey(query) {
  return `${query.region || 'all'}|${query.category || 'all'}`;
}

function formatRelativeTime(date) {
  const diffSec = Math.min(0, Math.round((date.getTime() - Date.now()) / 1000));
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(priceLocale(), { numeric: 'auto' });

  if (abs < 45) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');

  return date.toLocaleDateString(priceLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPriceValue(value) {
  return String(+Number(value).toFixed(2));
}

function formatProductSize(item) {
  if (!item.quantity || !item.unit) return '';
  return `${+item.quantity.toFixed(2)} ${tr(`prices.unitShort.${item.unit}`, item.unit)}`;
}

function setVoteButtonLabel(button, key, fallback, count) {
  const label = tr(key, fallback);
  button.setAttribute('aria-label', count > 0 ? `${label} (${count})` : label);
  button.title = label;
}

function setVoteCount(el, count) {
  if (!el) return;
  el.textContent = String(count);
  el.hidden = !(count > 0);
}

function applyCardVote(card, item) {
  const confirmBtn = card.querySelector('[data-role="confirm-btn"]');
  const flagBtn = card.querySelector('[data-role="flag-btn"]');
  if (!confirmBtn || !flagBtn) return;

  confirmBtn.classList.toggle('is-confirmed', item.my_vote === 'confirm');
  flagBtn.classList.toggle('is-flagged', item.my_vote === 'report');
  confirmBtn.setAttribute('aria-pressed', String(item.my_vote === 'confirm'));
  flagBtn.setAttribute('aria-pressed', String(item.my_vote === 'report'));

  card.dataset.vote = item.my_vote || '';
  card.dataset.confirmCount = String(item.confirm_count);
  card.dataset.reportCount = String(item.report_count);

  setVoteButtonLabel(confirmBtn, 'prices.confirmLabel', 'Confirm price', item.confirm_count);
  setVoteButtonLabel(flagBtn, 'prices.reportLabel', 'Report price', item.report_count);
  setVoteCount(card.querySelector('[data-role="confirm-count"]'), item.confirm_count);
  setVoteCount(card.querySelector('[data-role="flag-count"]'), item.report_count);
}

function fillPriceCard(card, item) {
  const lang = getCurrentLang();
  const name = lang === 'ar'
    ? (item.product_name_ar || item.product_name_en)
    : (item.product_name_en || item.product_name_ar);

  card.querySelector('[data-role="name-text"]').textContent = name;

  const sizeEl = card.querySelector('[data-role="size"]');
  const size = formatProductSize(item);
  sizeEl.textContent = size;
  sizeEl.hidden = !size;

  const regionName = item.region ? tr(item.region, item.region) : '';
  card.querySelector('[data-role="store"]').textContent = [regionName, item.store_name].filter(Boolean).join(' - ');

  const timeEl = card.querySelector('[data-role="time"]');
  if (item.created_at) {
    const date = new Date(item.created_at);
    timeEl.dateTime = date.toISOString();
    timeEl.title = date.toLocaleString(priceLocale());
    timeEl.textContent = formatRelativeTime(date);
  } else {
    timeEl.removeAttribute('datetime');
    timeEl.textContent = '';
  }

  card.querySelector('[data-role="price"]').textContent = formatPriceValue(item.price);
  applyCardVote(card, item);
}

function createPriceCard(item) {
  const template = priceEl('priceCardTemplate');
  if (!template) return null;

  const card = template.content.firstElementChild.cloneNode(true);
  card.id = `price-${item.price_id}`;
  card.dataset.priceId = item.price_id;
  if (item.product_id !== null && item.product_id !== undefined) card.dataset.productId = String(item.product_id);
  card.dataset.region = item.region || '';
  card.dataset.category = item.category || '';
  card.querySelector('[data-role="confirm-btn"]').dataset.id = item.price_id;
  card.querySelector('[data-role="flag-btn"]').dataset.id = item.price_id;

  fillPriceCard(card, item);
  return card;
}

function syncVoteButtons() {
  const offline = navigator.onLine === false;

  document.querySelectorAll('#priceList [data-role="card"]').forEach(card => {
    const pending = pendingVotes.has(card.dataset.priceId);
    card.setAttribute('aria-busy', String(pending));
    card.querySelectorAll('[data-role="confirm-btn"], [data-role="flag-btn"]').forEach(button => {
      button.disabled = offline || pending;
    });
  });
}

function formatSavedTime(timestamp) {
  return timestamp ? formatRelativeTime(new Date(timestamp)) : '';
}

function updatePriceControls() {
  const more = priceEl('priceMoreBtn');
  if (more) {
    const canLoadMore = priceState.view === 'list' && priceState.hasMore && !priceState.fromCache && navigator.onLine !== false;
    more.hidden = !canLoadMore;
    more.disabled = priceState.loading;
    more.classList.toggle('is-loading', priceState.loading);
  }

  const note = priceEl('priceOfflineNote');
  if (note) {
    const show = priceState.fromCache && priceState.view === 'list';
    note.hidden = !show;
    if (show) {
      note.textContent = tr('prices.offlineNote', 'You are offline. Showing the list saved {time}.')
        .replace('{time}', formatSavedTime(priceState.savedAt));
    }
  }

  syncVoteButtons();
}

function setPriceView(view) {
  priceState.view = view;

  const list = priceEl('priceList');
  const skeleton = priceEl('priceSkeleton');
  const error = priceEl('priceError');
  const empty = priceEl('priceEmptyState');

  if (skeleton) skeleton.hidden = view !== 'loading';
  if (list) {
    list.hidden = view !== 'list';
    list.setAttribute('aria-busy', String(view === 'loading'));
  }
  if (error) error.hidden = view !== 'error';
  if (empty) empty.hidden = view !== 'empty';

  updatePriceControls();
}

function emptyMessageKey(query) {
  if (activeFilter === 'nearby' && !userRegion) return 'prices.emptyNoRegion';
  if (query.region && query.category) return 'prices.emptyAreaCategory';
  if (query.category) return 'prices.emptyCategory';
  if (query.region) return 'prices.empty';
  return 'prices.emptyAll';
}

function showPriceEmpty(query) {
  priceState.emptyKey = emptyMessageKey(query);

  const empty = priceEl('priceEmptyState');
  if (empty) empty.textContent = tr(priceState.emptyKey, '');

  setPriceView('empty');
  announcePrice(tr(priceState.emptyKey, ''));
}

function showPriceError(key) {
  priceState.errorKey = key || 'prices.errorTitle';

  const text = priceEl('priceErrorText');
  if (text) text.textContent = tr(priceState.errorKey, '');

  setPriceView('error');
  announcePrice(tr(priceState.errorKey, ''));
}

function renderPriceItems(items, { append = false, animate = false } = {}) {
  const list = priceEl('priceList');
  if (!list) return;

  if (!append) list.replaceChildren();

  const fragment = document.createDocumentFragment();
  let animated = 0;

  items.forEach(item => {
    const card = createPriceCard(item);
    if (!card) return;

    if (animate && animated < MAX_ANIMATED_CARDS) {
      card.style.setProperty('--i', animated);
      card.classList.add('is-entering');
      card.addEventListener('animationend', () => card.classList.remove('is-entering'), { once: true });
      animated += 1;
    }

    fragment.appendChild(card);
  });

  list.appendChild(fragment);
  syncVoteButtons();
}

function persistPriceCache() {
  if (typeof GMPrices === 'undefined') return;
  GMPrices.writeCache(priceQueryKey(getPriceQuery()), priceState.items);
}

async function loadPrices() {
  const query = getPriceQuery();
  const requestId = ++priceState.requestId;

  priceState.items = [];
  priceState.nextCursor = null;
  priceState.hasMore = false;
  priceState.fromCache = false;
  priceState.savedAt = null;
  priceState.loading = true;

  if (typeof GMPrices === 'undefined') {
    priceState.loading = false;
    showPriceError();
    return;
  }

  if (activeFilter === 'nearby' && !userRegion) {
    priceState.loading = false;
    showPriceEmpty(query);
    return;
  }

  setPriceView('loading');

  let page;

  try {
    page = await withTimeout(
      GMPrices.fetchPage({ region: query.region, category: query.category, cursor: null, limit: PRICE_PAGE_SIZE }),
      PRICE_LOAD_TIMEOUT_MS
    );
  } catch (err) {
    if (requestId !== priceState.requestId) return;
    console.error('loadPrices failed:', err);
    priceState.loading = false;

    const cached = GMPrices.readCache(priceQueryKey(query));
    if (cached && cached.items.length) {
      priceState.items = cached.items;
      priceState.fromCache = true;
      priceState.savedAt = cached.savedAt;
      renderPriceItems(priceState.items, { animate: true });
      setPriceView('list');
      return;
    }

    showPriceError(navigator.onLine === false ? 'prices.offlineNoCache' : 'prices.errorTitle');
    return;
  }

  if (requestId !== priceState.requestId) return;

  priceState.loading = false;
  priceState.items = page.items;
  priceState.nextCursor = page.nextCursor;
  priceState.hasMore = page.hasMore;
  GMPrices.writeCache(priceQueryKey(query), page.items);

  if (!page.items.length) {
    showPriceEmpty(query);
    return;
  }

  renderPriceItems(page.items, { animate: true });
  setPriceView('list');
}

async function loadMorePrices() {
  if (priceState.loading || !priceState.hasMore || !priceState.nextCursor) return;

  const query = getPriceQuery();
  const requestId = priceState.requestId;

  priceState.loading = true;
  updatePriceControls();

  try {
    const page = await GMPrices.fetchPage({
      region: query.region,
      category: query.category,
      cursor: priceState.nextCursor,
      limit: PRICE_PAGE_SIZE,
    });

    if (requestId !== priceState.requestId) return;

    const known = new Set(priceState.items.map(item => item.price_id));
    const fresh = page.items.filter(item => !known.has(item.price_id));

    priceState.items = priceState.items.concat(fresh);
    priceState.nextCursor = page.nextCursor;
    priceState.hasMore = page.hasMore;

    renderPriceItems(fresh, { append: true, animate: true });
    persistPriceCache();
  } catch (err) {
    if (requestId === priceState.requestId) {
      console.error('loadMorePrices failed:', err);
      announcePrice(tr('prices.loadMoreFailed', 'Could not load more prices. Please try again.'));
    }
  } finally {
    if (requestId === priceState.requestId) {
      priceState.loading = false;
      updatePriceControls();
    }
  }
}

function findPriceItem(priceId) {
  return priceState.items.find(item => item.price_id === String(priceId)) || null;
}

function refreshCardVote(item) {
  const card = priceEl(`price-${item.price_id}`);
  if (card) applyCardVote(card, item);
  syncVoteButtons();
}

function applyVoteLocally(item, next) {
  if (item.my_vote === 'confirm') item.confirm_count = Math.max(0, item.confirm_count - 1);
  if (item.my_vote === 'report') item.report_count = Math.max(0, item.report_count - 1);
  if (next === 'confirm') item.confirm_count += 1;
  if (next === 'report') item.report_count += 1;
  item.my_vote = next;
}

function removePriceItem(priceId) {
  priceState.items = priceState.items.filter(item => item.price_id !== String(priceId));

  const card = priceEl(`price-${priceId}`);
  if (card) card.remove();

  if (!priceState.items.length) {
    if (priceState.hasMore) loadPrices();
    else showPriceEmpty(getPriceQuery());
    return;
  }

  persistPriceCache();
}

async function submitPriceVote(priceId, kind) {
  const item = findPriceItem(priceId);
  if (!item || pendingVotes.has(item.price_id)) return;

  const previous = {
    my_vote: item.my_vote,
    confirm_count: item.confirm_count,
    report_count: item.report_count,
  };
  const next = item.my_vote === kind ? null : kind;

  applyVoteLocally(item, next);
  pendingVotes.add(item.price_id);
  refreshCardVote(item);

  let result;

  try {
    result = await GMPrices.vote(item.price_id, next);
  } catch (err) {
    console.error('vote failed:', err);
    Object.assign(item, previous);
    pendingVotes.delete(item.price_id);
    refreshCardVote(item);
    announcePrice(tr('prices.voteFailed', 'Could not save your vote. Please try again.'));
    return;
  }

  pendingVotes.delete(item.price_id);
  document.dispatchEvent(new CustomEvent('gmPointsChanged'));

  if (result.removed) {
    removePriceItem(item.price_id);
    announcePrice(tr('prices.removed', 'This price was removed after being reported.'));
    return;
  }

  item.my_vote = result.my_vote;
  item.confirm_count = result.confirm_count;
  item.report_count = result.report_count;
  refreshCardVote(item);
  persistPriceCache();
}

function requirePriceAuth(action) {
  if (typeof gmIsLoggedIn === 'function' && gmIsLoggedIn()) {
    action();
    return;
  }

  if (typeof gmRequireAuthThenRun === 'function' && document.getElementById('authOverlay')) {
    gmRequireAuthThenRun(action);
  }
}

function handlePriceVote(priceId, kind) {
  if (navigator.onLine === false) {
    announcePrice(tr('prices.offlineVote', 'Voting needs an internet connection.'));
    return;
  }

  requirePriceAuth(() => submitPriceVote(priceId, kind));
}

function rerenderPriceList() {
  if (priceState.view === 'list') {
    renderPriceItems(priceState.items);
  } else if (priceState.view === 'empty') {
    const empty = priceEl('priceEmptyState');
    if (empty) empty.textContent = tr(priceState.emptyKey, '');
  } else if (priceState.view === 'error') {
    const text = priceEl('priceErrorText');
    if (text) text.textContent = tr(priceState.errorKey, '');
  }

  updatePriceControls();
}

function refreshPriceTimes() {
  document.querySelectorAll('#priceList time[data-role="time"][datetime]').forEach(el => {
    const date = new Date(el.getAttribute('datetime'));
    if (!isNaN(date.getTime())) el.textContent = formatRelativeTime(date);
  });
}

function setCategory(next) {
  if (next === activeCategory) return;
  activeCategory = next;
  loadPrices();
}

function initPriceListEvents() {
  const list = priceEl('priceList');
  if (!list) return;

  list.addEventListener('click', e => {
    const confirmBtn = e.target.closest('[data-role="confirm-btn"]');
    const flagBtn = e.target.closest('[data-role="flag-btn"]');
    const button = confirmBtn || flagBtn;
    if (!button || button.disabled) return;

    const priceId = button.dataset.id;
    if (!priceId) return;

    handlePriceVote(priceId, confirmBtn ? 'confirm' : 'report');
  });

  const moreBtn = priceEl('priceMoreBtn');
  if (moreBtn) moreBtn.addEventListener('click', loadMorePrices);

  const retryBtn = priceEl('priceRetryBtn');
  if (retryBtn) retryBtn.addEventListener('click', loadPrices);

  const track = priceEl('catTrack');
  if (track) {
    track.addEventListener('click', e => {
      const pill = e.target.closest('.cat-pill');
      if (pill) setCategory(pill.dataset.category || 'all');
    });
  }

  window.addEventListener('offline', updatePriceControls);
  window.addEventListener('online', () => {
    updatePriceControls();
    if (priceState.fromCache || priceState.view === 'error') loadPrices();
  });

  let lastLang = getCurrentLang();
  new MutationObserver(() => {
    const lang = getCurrentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    rerenderPriceList();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  document.addEventListener('gmRegionChanged', () => {
    const saved = normalizeRegion(getSavedRegion());
    if (!saved || saved === userRegion) return;

    userRegion = saved;
    setRegionLabels(saved, tr(saved, saved));
    if (activeFilter === 'nearby') loadPrices();
  });

  setInterval(refreshPriceTimes, PRICE_TIME_REFRESH_MS);
}

function setFilter(next, force = false) {
  const changed = next !== activeFilter;
  activeFilter = next;
  syncFilterButtons();
  moveFilterPill();
  if (changed || force) loadPrices();
}

function selectRegion(rawKey, regionLabel, { silent = false } = {}) {
  const regionKey = normalizeRegion(rawKey);
  if (!regionKey) return;

  const unchanged = regionKey === userRegion && activeFilter === 'nearby';
  userRegion = regionKey;

  try {
    localStorage.setItem(REGION_STORAGE_KEY, regionKey);
  } catch (err) {
    console.error('save region failed:', err);
  }

  setRegionLabels(regionKey, regionLabel);

  if (unchanged) return;

  if (!silent) setFilter('nearby', true);
}

function syncFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(b => {
    const on = (b.dataset.filter || 'all') === activeFilter;
    b.classList.toggle('is-active', on);
    if (on) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  });
}

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

    requestAnimationFrame(() => requestAnimationFrame(() => group.classList.add('is-ready')));
  }
}

function initFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter || 'all'));
  });

  syncFilterButtons();
  moveFilterPill();

  window.addEventListener('load', moveFilterPill, { passive: true });
  window.addEventListener('resize', moveFilterPill, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveFilterPill);

  new MutationObserver(() => requestAnimationFrame(moveFilterPill))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
}

function setRegionLabels(regionKey, regionLabel) {

  const labelText = document.getElementById('areaLabelText');
  if (labelText) {
    labelText.dataset.i18n = regionKey;
    if (regionLabel) labelText.textContent = regionLabel;
  }

  const nearbyBtn = document.querySelector('.filter-btn[data-filter="nearby"]');
  if (nearbyBtn) {
    const target = nearbyBtn.querySelector('[data-i18n]') || nearbyBtn.querySelector('span') || nearbyBtn;
    target.dataset.i18n = regionKey;
    if (regionLabel) target.textContent = regionLabel;
    moveFilterPill();
  }
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

let heroData = null;

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
const HERO_TICKER_MIN_DURATION_S = 12;

let heroTickerSource = [];
let heroTickerBuiltWidth = 0;
let heroTickerObserverBound = false;
let heroTickerPauseBound = false;

function buildHeroTicker(track) {
  const viewport = track.parentElement;
  if (!viewport || !heroTickerSource.length) return false;

  const viewWidth = viewport.clientWidth;
  if (!viewWidth) return false;

  track.replaceChildren(...heroTickerSource.map(item => item.cloneNode(true)));

  const setWidth = track.scrollWidth;
  if (!setWidth) return false;

  const repeats = Math.max(1, Math.ceil(viewWidth / setWidth));
  const fragment = document.createDocumentFragment();

  for (let half = 0; half < 2; half += 1) {
    for (let copy = 0; copy < repeats; copy += 1) {
      heroTickerSource.forEach(item => {
        const clone = item.cloneNode(true);
        if (half === 1 || copy > 0) clone.setAttribute('aria-hidden', 'true');
        fragment.appendChild(clone);
      });
    }
  }

  track.replaceChildren(fragment);

  const halfWidth = track.scrollWidth / 2;
  if (!halfWidth) return false;

  const duration = Math.max(halfWidth / HERO_TICKER_SPEED_PX_S, HERO_TICKER_MIN_DURATION_S);
  track.style.setProperty('--ticker-duration', `${duration}s`);
  track.style.transition = 'opacity .3s ease';
  track.style.opacity = '1';

  heroTickerBuiltWidth = viewWidth;
  return true;
}

function rebuildHeroTicker(force = false) {
  const track = document.getElementById('heroTickerTrack');
  if (!track || !heroTickerSource.length) return;

  const viewport = track.parentElement;
  const width = viewport ? viewport.clientWidth : 0;

  if (!force && width && width === heroTickerBuiltWidth) return;

  if (!buildHeroTicker(track)) heroTickerBuiltWidth = 0;
}

function bindHeroTickerObservers(track) {
  if (!heroTickerObserverBound) {
    heroTickerObserverBound = true;

    let frame = null;
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = null; rebuildHeroTicker(); });
    };

    if (typeof ResizeObserver === 'function' && track.parentElement) {
      new ResizeObserver(schedule).observe(track.parentElement);
    }

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    window.addEventListener('load', schedule, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  }

  if (!heroTickerPauseBound && track.parentElement) {
    heroTickerPauseBound = true;
    const viewport = track.parentElement;
    const pause = () => track.classList.add('is-paused');
    const resume = () => track.classList.remove('is-paused');

    viewport.addEventListener('pointerdown', pause, { passive: true });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => viewport.addEventListener(type, resume, { passive: true }));
  }
}

function initHeroTicker() {
  const track = document.getElementById('heroTickerTrack');
  if (!track) return;

  const items = Array.from(track.querySelectorAll('[data-ticker-item]:not([aria-hidden="true"])'));
  if (!items.length) return;

  heroTickerSource = items.map(item => item.cloneNode(true));
  heroTickerBuiltWidth = 0;

  bindHeroTickerObservers(track);

  requestAnimationFrame(() => requestAnimationFrame(() => rebuildHeroTicker(true)));
}

function renderHeroTicker(items) {
  const track = document.getElementById('heroTickerTrack');
  const ticker = document.getElementById('heroTicker');
  if (!track || !Array.isArray(items)) return;

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

function finishHeroLoading() {
  ['heroStats', 'heroTicker'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-loading');
  });
}

async function loadHero() {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), HERO_LOAD_TIMEOUT_MS) : null;

  try {
    const res = await fetch(GM_API.hero, {
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    heroData = await res.json();
  } catch (err) {
    console.error('loadHero failed:', err);

    finishHeroLoading();
    initHeroTicker();
    return;
  } finally {
    if (timer) clearTimeout(timer);
  }

  finishHeroLoading();
  renderHero();
}

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

(function () {
const DEFAULTS = {
USE_MOCK: true,
API_BASE: '/api',
TIMEOUT_MS: 15000,
CREDENTIALS: 'same-origin',
TOKEN_KEY: 'gm_token',
getToken: null,
MOCK_DELAY_MS: 250,
};

const CONFIG = Object.assign({}, DEFAULTS, window.GM_CONFIG || {});
const USE_MOCK = !!CONFIG.USE_MOCK;
const API_BASE = String(CONFIG.API_BASE).replace(/\/+$/, '');

const CACHE_KEY = 'gm_points_cache_v1';
const MOCK_POINTS_KEY = 'gm_mock_points_v1';
const USER_STORAGE_KEY = 'user';
const RULE_KEYS = ['addPrice', 'confirmPrice', 'reportPrice', 'addStore', 'postListing'];

function GMPointsError(code, message, status) {
const err = new Error(message || code);
err.name = 'GMPointsError';
err.code = code;
err.status = status || 0;
return err;
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
    console.error('points storage failed:', err);
}
}

function delay(ms) {
return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPoints(value) {
const num = Math.floor(Number(value));
return isFinite(num) && num > 0 ? num : 0;
}

function safeAvatarUrl(value) {
if (typeof value !== 'string') return null;
const url = value.trim();
if (!url) return null;
if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
if (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) return url;
return null;
}

function getCurrentOwner() {
const user = readJson(USER_STORAGE_KEY, null);
return user && user.phone ? String(user.phone) : 'guest';
}

function normalizeEntry(raw) {
if (!raw || raw.id === undefined || raw.id === null || raw.id === '') return null;

const name = typeof raw.name === 'string' ? raw.name.trim() : '';
if (!name) return null;

return {
    id: String(raw.id),
    name,
    points: toPoints(raw.points),
    avatarUrl: safeAvatarUrl(raw.avatar_url !== undefined ? raw.avatar_url : raw.avatarUrl),
};
}

function normalizeUser(raw) {
const entry = normalizeEntry(raw);
if (!entry) return null;

const rank = Math.floor(Number(raw.weekly_rank));
const weekly = raw.weekly_points === undefined || raw.weekly_points === null ? NaN : Number(raw.weekly_points);

entry.weeklyRank = isFinite(rank) && rank > 0 ? rank : null;
entry.weeklyPoints = isFinite(weekly) && weekly >= 0 ? Math.floor(weekly) : null;
return entry;
}

function normalizeRules(raw) {
if (!Array.isArray(raw)) return [];

return raw
    .filter((rule) => rule && RULE_KEYS.indexOf(rule.key) !== -1 && isFinite(Number(rule.points)))
    .map((rule) => ({ key: rule.key, points: Math.floor(Number(rule.points)) }));
}

function normalizeSummary(raw) {
if (!raw || typeof raw !== 'object') throw GMPointsError('invalid_response', 'Bad points payload');

return {
    user: normalizeUser(raw.user),
    leaderboard: (Array.isArray(raw.leaderboard) ? raw.leaderboard : []).map(normalizeEntry).filter(Boolean),
    rules: normalizeRules(raw.rules),
};
}

function writeCache(summary) {
writeJson(CACHE_KEY, { owner: getCurrentOwner(), savedAt: Date.now(), data: summary });
}

function readCache() {
const cached = readJson(CACHE_KEY, null);
if (!cached || !cached.data || cached.owner !== getCurrentOwner()) return null;

try {
    return { data: normalizeSummary(cached.data), savedAt: cached.savedAt || null };
} catch (err) {
    return null;
}
}

function getXsrfToken() {
const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
return match ? decodeURIComponent(match[1]) : null;
}

function getBearerToken() {
try {
    if (typeof CONFIG.getToken === 'function') return CONFIG.getToken() || null;
    return localStorage.getItem(CONFIG.TOKEN_KEY) || null;
} catch (err) {
    return null;
}
}

function buildHeaders() {
const headers = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
const xsrf = getXsrfToken();
const token = getBearerToken();
if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
if (token) headers.Authorization = `Bearer ${token}`;
return headers;
}

async function requestSummary() {
const controller = typeof AbortController === 'function' ? new AbortController() : null;
const timer = controller ? setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS) : null;

let res;
try {
    res = await fetch(`${API_BASE}/points`, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: CONFIG.CREDENTIALS,
    signal: controller ? controller.signal : undefined,
    });
} catch (err) {
    throw GMPointsError(err && err.name === 'AbortError' ? 'timeout' : 'network', 'Points request failed', 0);
} finally {
    if (timer) clearTimeout(timer);
}

if (!res.ok) {
    throw GMPointsError(res.status === 401 || res.status === 419 ? 'unauthorized' : 'server', `HTTP ${res.status}`, res.status);
}

let json;
try {
    json = await res.json();
} catch (err) {
    throw GMPointsError('invalid_response', 'Points response is not JSON', res.status);
}

return json;
}

const MOCK_LEADERBOARD = [
{ id: 'm1', name: 'أحمد خليل', points: 95 },
{ id: 'm2', name: 'ليلى حسونة', points: 72 },
{ id: 'm3', name: 'محمد النجار', points: 58 },
{ id: 'm4', name: 'Rania Abu Shamala', points: 41 },
{ id: 'm5', name: 'يوسف البيوك', points: 33 },
];

const MOCK_RULES = [
{ key: 'addPrice', points: 10 },
{ key: 'confirmPrice', points: 2 },
{ key: 'reportPrice', points: 1 },
{ key: 'addStore', points: 15 },
{ key: 'postListing', points: 5 },
];

function buildMockSummary() {
const stored = readJson(USER_STORAGE_KEY, null);
const loggedIn = !!(stored && stored.phone && stored.name);
const total = toPoints(readJson(MOCK_POINTS_KEY, 0));

const user = loggedIn
    ? { id: String(stored.phone), name: stored.name, points: total, avatar_url: stored.avatar || null }
    : null;

const leaderboard = MOCK_LEADERBOARD.slice();
if (user && total > 0) leaderboard.push({ id: user.id, name: user.name, points: total, avatar_url: user.avatar_url });
leaderboard.sort((a, b) => b.points - a.points);

return { user, leaderboard, rules: MOCK_RULES };
}

async function fetchSummary() {
let raw;

if (USE_MOCK) {
    await delay(CONFIG.MOCK_DELAY_MS);
    raw = buildMockSummary();
} else {
    raw = await requestSummary();
}

const summary = normalizeSummary(raw);
writeCache(summary);
return summary;
}

window.GMPoints = {
fetchSummary,
readCache,
};
})();

const GM_POINTS_LEADERBOARD_LIMIT = 5;

const GM_LEVELS = [
  { key: 'beginner', min: 0, max: 50, label: 'points.tierBeginner', fallback: 'Beginner', className: 'points-tier--bronze' },
  { key: 'active', min: 50, max: 150, label: 'points.tierActive', fallback: 'Active', className: 'points-tier--silver' },
  { key: 'expert', min: 150, max: 400, label: 'points.tierExpert', fallback: 'Expert', className: 'points-tier--gold' },
  { key: 'legend', min: 400, max: null, label: 'points.tierLegend', fallback: 'Legend', className: 'points-tier--legend' },
];

let pointsGuestIcon = null;

const pointsState = {
  data: null,
  fromCache: false,
  requestId: 0,
  view: 'loading',
};

function gmGetLevel(points) {
  return GM_LEVELS.find(l => points >= l.min && (l.max === null || points < l.max)) || GM_LEVELS[0];
}

function gmFormatPoints(value) {
  return Number(value).toLocaleString('en-US');
}

function gmInitials(name) {
  return Array.from((name || '').trim())[0]?.toUpperCase() || '?';
}

function gmShortName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${Array.from(parts[parts.length - 1])[0]}.`;
}

function gmLocalUser() {
  if (typeof gmIsLoggedIn !== 'function' || !gmIsLoggedIn()) return null;

  try {
    const stored = JSON.parse(localStorage.getItem('user') || 'null');
    if (!stored || !stored.name) return null;
    return { id: String(stored.phone), name: stored.name, points: null, avatarUrl: null };
  } catch (err) {
    return null;
  }
}

function gmSetTierIcon(level) {
  const iconContainer = document.getElementById('userLevelIcon');
  const iconsTemplate = document.getElementById('pointsTierIconsTemplate');
  if (!iconContainer || !iconsTemplate) return;

  iconContainer.replaceChildren();
  const iconSvg = iconsTemplate.content.querySelector(`svg[data-tier="${level.key}"]`);
  if (iconSvg) iconContainer.appendChild(iconSvg.cloneNode(true));
}

function gmFillAvatar(container, name, avatarUrl, guestIcon) {
  container.replaceChildren();
  container.setAttribute('aria-hidden', 'true');

  if (!name && guestIcon) {
    container.append(...guestIcon.map(node => node.cloneNode(true)));
  } else if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = '';
    img.addEventListener('error', () => {
      container.replaceChildren(document.createTextNode(gmInitials(name)));
    }, { once: true });
    container.appendChild(img);
  } else {
    container.textContent = gmInitials(name);
  }
}

function setPointsView(view) {
  pointsState.view = view;

  const skeleton = document.getElementById('pointsLeaderboardSkeleton');
  const list = document.getElementById('pointsLeaderboardList');
  const error = document.getElementById('pointsError');

  if (skeleton) skeleton.hidden = view !== 'loading';
  if (list) {
    list.hidden = view !== 'ready';
    list.setAttribute('aria-busy', String(view === 'loading'));
  }
  if (error) error.hidden = view !== 'error';

  const summary = document.getElementById('pointsSummary');
  if (summary) summary.classList.toggle('is-loading', view === 'loading');

  const note = document.getElementById('pointsNote');
  if (note) {
    const show = view === 'ready' && pointsState.fromCache;
    note.hidden = !show;
    if (show) note.textContent = tr('points.offlineNote', 'Showing the last saved points.');
  }
}

function gmRenderUserCard(user, { statusHint = '' } = {}) {
  const nameEl = document.getElementById('pointsUserName');
  const valueEl = document.getElementById('userPointsValue');
  const avatarEl = document.getElementById('pointsAvatar');
  const badgeEl = document.getElementById('userLevelBadge');
  const textEl = document.getElementById('userLevelText');
  const barEl = document.getElementById('pointsProgressBar');
  const trackEl = document.getElementById('pointsProgressTrack');
  const hintEl = document.getElementById('pointsNextLevelHint');

  if (!nameEl || !valueEl || !avatarEl || !badgeEl || !textEl || !barEl || !trackEl || !hintEl) return;

  [nameEl, textEl, hintEl].forEach(el => el.removeAttribute('data-i18n'));

  if (!pointsGuestIcon) pointsGuestIcon = Array.from(avatarEl.childNodes);

  const hasPoints = !!user && Number.isFinite(user.points);
  const points = hasPoints ? user.points : 0;
  const level = gmGetLevel(points);

  nameEl.textContent = user ? user.name : tr('points.guest', 'Guest');
  nameEl.title = nameEl.textContent;
  valueEl.textContent = hasPoints || !user ? gmFormatPoints(points) : '—';

  gmFillAvatar(avatarEl, user && user.name, user && user.avatarUrl, pointsGuestIcon);

  badgeEl.className = `points-tier ${level.className}`;
  badgeEl.hidden = !!user && !hasPoints;
  textEl.textContent = tr(level.label, level.fallback);
  gmSetTierIcon(level);

  const pct = !hasPoints || level.max === null
    ? (hasPoints ? 100 : 0)
    : Math.min(100, Math.max(0, Math.round(((points - level.min) / (level.max - level.min)) * 100)));

  let hint;
  if (!user) hint = tr('points.hintLogin', 'Log in to start earning points');
  else if (!hasPoints) hint = statusHint;
  else if (level.max === null) hint = tr('points.hintMax', 'You have reached the highest level');
  else hint = tr('points.hintRemaining', 'You need {count} more points to reach the next level')
    .replace('{count}', gmFormatPoints(level.max - points));

  barEl.style.width = `${pct}%`;
  trackEl.setAttribute('aria-label', tr('points.progressLabel', 'Progress to next level'));
  trackEl.setAttribute('aria-valuenow', pct);
  trackEl.setAttribute('aria-valuetext', hint ? `${pct}% - ${hint}` : `${pct}%`);
  hintEl.textContent = hint;
}

function gmRenderPointRules(rules) {
  if (!Array.isArray(rules)) return;

  rules.forEach(rule => {
    const el = document.querySelector(`[data-points-rule="${rule.key}"]`);
    if (el) el.textContent = `+${rule.points}`;
  });
}

function gmBuildLeaderboardRow(template, entry, rank, isMe) {
  const row = template.content.firstElementChild.cloneNode(true);

  if (isMe) row.classList.add('points-leaderboard__row--me');

  const rankEl = row.querySelector('[data-role="rank"]');
  rankEl.textContent = rank;
  if (rank <= 3) rankEl.classList.add(`points-rank--${rank}`);

  const displayName = isMe ? entry.name : gmShortName(entry.name);
  gmFillAvatar(row.querySelector('[data-role="avatar"]'), entry.name, entry.avatarUrl);

  const nameEl = row.querySelector('[data-role="name"]');
  nameEl.dir = 'auto';
  nameEl.textContent = displayName;
  nameEl.title = displayName;

  if (isMe) {
    const you = document.createElement('span');
    you.className = 'points-you';
    you.textContent = tr('points.you', 'You');
    nameEl.append(' ', you);
  }

  row.querySelector('[data-role="count"]').prepend(document.createTextNode(`${gmFormatPoints(entry.points)} `));
  return row;
}

function gmRenderLeaderboard(data) {
  const listEl = document.getElementById('pointsLeaderboardList');
  const rowTemplate = document.getElementById('leaderboardRowTemplate');
  if (!listEl || !rowTemplate) return;

  const currentUser = data.user;
  const currentUserId = currentUser ? currentUser.id : null;
  const sorted = data.leaderboard.slice().sort((a, b) => b.points - a.points);
  const top = sorted.slice(0, GM_POINTS_LEADERBOARD_LIMIT);

  listEl.replaceChildren();

  if (!top.length) {
    const empty = document.createElement('p');
    empty.className = 'points-leaderboard__empty';
    empty.textContent = tr('points.leaderboardEmpty', 'No top contributors yet');
    listEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  top.forEach((entry, index) => {
    fragment.appendChild(gmBuildLeaderboardRow(rowTemplate, entry, index + 1, entry.id === currentUserId));
  });

  const inTop = top.some(entry => entry.id === currentUserId);
  if (currentUser && !inTop && currentUser.weeklyRank && currentUser.weeklyPoints !== null) {
    const gap = document.createElement('div');
    gap.className = 'points-leaderboard__gap';
    gap.setAttribute('aria-hidden', 'true');
    fragment.appendChild(gap);

    fragment.appendChild(gmBuildLeaderboardRow(
      rowTemplate,
      { name: currentUser.name, avatarUrl: currentUser.avatarUrl, points: currentUser.weeklyPoints },
      currentUser.weeklyRank,
      true
    ));
  }

  listEl.appendChild(fragment);
}

function renderPoints() {
  const data = pointsState.data;
  if (!data) return;

  gmRenderUserCard(data.user);
  gmRenderPointRules(data.rules);
  gmRenderLeaderboard(data);
  setPointsView('ready');
}

function refreshPointsTexts() {
  if (pointsState.data) {
    renderPoints();
    return;
  }

  gmRenderUserCard(gmLocalUser(), {
    statusHint: pointsState.view === 'error' ? tr('points.errorTitle', 'Could not load points') : '',
  });
}

async function initPointsCard() {
  const requestId = ++pointsState.requestId;

  if (!pointsState.data) {
    gmRenderUserCard(gmLocalUser());
    setPointsView('loading');
  }

  let data;
  let fromCache = false;

  try {
    if (typeof GMPoints === 'undefined') throw new Error('GMPoints is not loaded');
    data = await withTimeout(GMPoints.fetchSummary(), POINTS_LOAD_TIMEOUT_MS);
  } catch (err) {
    if (requestId !== pointsState.requestId) return;
    console.error('initPointsCard failed:', err);

    const cached = typeof GMPoints !== 'undefined' ? GMPoints.readCache() : null;

    if (!cached) {
      pointsState.data = null;
      gmRenderUserCard(gmLocalUser(), { statusHint: tr('points.errorTitle', 'Could not load points') });
      setPointsView('error');
      return;
    }

    data = cached.data;
    fromCache = true;
  }

  if (requestId !== pointsState.requestId) return;

  pointsState.data = data;
  pointsState.fromCache = fromCache;
  renderPoints();
}

function resetPointsCard() {
  pointsState.data = null;
  pointsState.fromCache = false;
  initPointsCard();
}

function initPointsEvents() {
  const retryBtn = document.getElementById('pointsRetryBtn');
  if (retryBtn) retryBtn.addEventListener('click', initPointsCard);

  document.addEventListener('gmUserLoggedIn', resetPointsCard);
  document.addEventListener('gmUserLoggedOut', resetPointsCard);
  document.addEventListener('gmPointsChanged', initPointsCard);

  window.addEventListener('storage', e => {
    if (e.key === 'user') resetPointsCard();
  });

  window.addEventListener('online', () => {
    if (pointsState.fromCache || pointsState.view === 'error') initPointsCard();
  });

  let lastLang = getCurrentLang();
  new MutationObserver(() => {
    const lang = getCurrentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    refreshPointsTexts();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

window.initPointsCard = initPointsCard;

function safeInit(step) {
  try {
    const result = step();
    if (result && typeof result.catch === 'function') {
      result.catch(err => console.error(`${step.name} failed:`, err));
    }
  } catch (err) {
    console.error(`${step.name} failed:`, err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  [
    initPriceListEvents,
    initFilterButtons,
    initRegionDropdown,
    loadPrices,
    initCategoryCarousel,
    initHeroLangWatcher,
    loadHero,
    initHeroTickerPdfButton,
    initPointsCard,
    initPointsEvents,
  ].forEach(safeInit);
});