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
    page = await GMPrices.fetchPage({ region: query.region, category: query.category, cursor: null, limit: PRICE_PAGE_SIZE });
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

  track.querySelectorAll('[aria-hidden="true"]').forEach(clone => clone.remove());

  const sourceItems = Array.from(track.querySelectorAll('[data-ticker-item]'));
  if (!sourceItems.length) return;

  track.style.opacity = '0';

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

    initHeroTicker();
    return;
  }

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
  loadPrices();
  initCategoryCarousel();
  initHeroLangWatcher();
  loadHero();
  initHeroTickerPdfButton();
  initPointsCard();
});