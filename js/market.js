'use strict';

(function () {
  const list = document.getElementById('marketGrid');
  if (!list) return;

  const api = window.GMMarket;
  const skeleton = document.getElementById('marketSkeleton');
  const stateBox = document.getElementById('marketState');
  const stateTitle = document.getElementById('marketStateTitle');
  const stateSub = document.getElementById('marketStateSub');
  const resetBtn = document.getElementById('marketReset');
  const browseBtn = document.getElementById('marketBrowse');
  const stateAddBtn = document.getElementById('marketStateAdd');
  const loginBtn = document.getElementById('marketLogin');
  const retryBtn = document.getElementById('marketRetry');
  const addBtn = document.getElementById('marketAdd');
  const countEl = document.getElementById('marketCount');
  const categoryBtn = document.getElementById('marketCategoryBtn');
  const categoryLabel = document.getElementById('marketCategoryLabel');
  const conditionBtn = document.getElementById('marketConditionBtn');
  const conditionLabel = document.getElementById('marketConditionLabel');
  const regionBtn = document.getElementById('marketRegionBtn');
  const regionLabel = document.getElementById('marketRegionLabel');
  const regionMenu = document.getElementById('marketRegionMenu');
  const allChip = document.getElementById('marketAll');
  const clearChip = document.getElementById('marketClear');
  const moreWrap = document.getElementById('marketMore');
  const moreBtn = document.getElementById('marketMoreBtn');
  const moreLabel = document.getElementById('marketMoreLabel');
  const tabsGroup = document.getElementById('marketTabs');
  const filtersBar = document.getElementById('marketFilters');
  const tabs = Array.from(document.querySelectorAll('[data-market-tab]'));
  const categoryItems = Array.from(document.querySelectorAll('[data-market-category]'));
  const conditionItems = Array.from(document.querySelectorAll('[data-market-condition]'));

  const DETAILS_PAGE = 'market-details.html';
  const PAGE_SIZE = 12;
  const EAGER_COUNT = 4;
  const STAGGER_MS = 60;
  const STAGGER_MAX = 8;
  const MONTH_SECONDS = 30 * 86400;

  const CATEGORY_KEYS = {
    electronics: 'addListing.electronics',
    clothing: 'addListing.clothing',
    furniture: 'addListing.furniture',
    food: 'addListing.food',
    books: 'addListing.books',
    tools: 'addListing.tools',
    toys: 'addListing.toys',
    other: 'addListing.other'
  };

  const CONDITION_KEYS = {
    'new': 'addListing.new',
    'used': 'addListing.used',
    'urgent': 'addListing.urgent'
  };

  const ICONS = {
    heart: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>',
    pin: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    image: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
    placeholder: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
  };

  const state = { tab: 'all', region: 'all', category: 'all', condition: 'all' };
  const view = { nextCursor: null, hasMore: false, total: null };
  const itemOf = new WeakMap();
  const rendered = new Set();
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const iconTpl = document.createElement('template');
  const iconCache = {};

  let items = [];
  let seq = 0;
  let busyMore = false;
  let moreFailed = false;
  let panel = null;

  function t(key) {
    return typeof i18n !== 'undefined' && i18n.t ? i18n.t(key) : key;
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar';
  }

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function icon(name) {
    if (!iconCache[name]) {
      iconTpl.innerHTML = ICONS[name];
      iconCache[name] = iconTpl.content.firstElementChild;
    }
    return iconCache[name].cloneNode(true);
  }

  function isLoggedIn() {
    return typeof gmIsLoggedIn === 'function' ? gmIsLoggedIn() : false;
  }

  function requireAuth(action) {
    if (typeof gmRequireAuthThenRun === 'function') gmRequireAuthThenRun(action);
    else action();
  }

  function isCategory(code) {
    return !!api && api.categories.indexOf(code) !== -1;
  }

  function isCondition(code) {
    return !!api && api.conditions.indexOf(code) !== -1;
  }

  function regionItems() {
    return Array.from(document.querySelectorAll('[data-market-region]'));
  }

  function isRegionCode(code) {
    return regionItems().some(function (item) { return item.dataset.marketRegion === code; });
  }

  function regionName(code) {
    const translated = typeof i18n !== 'undefined' ? i18n.t(code) : code;
    if (translated !== code) return translated;
    if (!window.GMRegions) return code;
    return window.GMRegions.label(code, currentLang());
  }

  function renderRegionMenu() {
    if (!regionMenu || !window.GMRegions) return;
    const lang = currentLang();
    const known = function (key) { return typeof i18n !== 'undefined' && i18n.t(key) !== key; };
    const frag = document.createDocumentFragment();

    function addItem(value, key, text) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dropdown-item';
      btn.setAttribute('data-market-region', value);
      if (known(key)) btn.setAttribute('data-i18n', key);
      btn.textContent = text;
      li.appendChild(btn);
      frag.appendChild(li);
    }

    addItem('all', 'AllRegions', 'All regions');
    const divider = document.createElement('li');
    const hr = document.createElement('hr');
    hr.className = 'dropdown-divider';
    divider.appendChild(hr);
    frag.appendChild(divider);

    window.GMRegions.grouped().forEach(function (entry) {
      const li = document.createElement('li');
      const h = document.createElement('h6');
      h.className = 'dropdown-header';
      h.setAttribute('data-i18n', entry.group.i18n);
      h.textContent = entry.group.i18n;
      li.appendChild(h);
      frag.appendChild(li);
      entry.regions.forEach(function (r) {
        addItem(r.code, r.code, lang === 'en' ? r.name_en : r.name_ar);
      });
    });

    regionMenu.textContent = '';
    regionMenu.appendChild(frag);
  }

  function hasActiveFilters() {
    return state.region !== 'all' || state.category !== 'all' || state.condition !== 'all';
  }

  function readUrl() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (err) {
      return;
    }
    if (params.get('tab') === 'saved' && isLoggedIn()) state.tab = 'saved';
    const region = params.get('region');
    const category = params.get('category');
    const condition = params.get('condition');
    if (region && isRegionCode(region)) state.region = region;
    if (category && isCategory(category)) state.category = category;
    if (condition && isCondition(condition)) state.condition = condition;
  }

  function writeUrl() {
    const params = new URLSearchParams();
    if (state.tab === 'saved') params.set('tab', 'saved');
    if (state.region !== 'all') params.set('region', state.region);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.condition !== 'all') params.set('condition', state.condition);
    const query = params.toString();
    try {
      history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    } catch (err) {
      console.error('market url sync failed:', err);
    }
  }

  function localeTag() {
    return currentLang() === 'en' ? 'en' : 'ar';
  }

  function formatPrice(value) {
    const num = Number(value);
    if (!isFinite(num)) return '';
    return '\u20AA' + (+num.toFixed(2)).toLocaleString('en-US');
  }

  function relativeTime(iso) {
    const ms = Date.parse(iso);
    if (!isFinite(ms)) return '';
    const diff = Math.min(0, Math.round((ms - Date.now()) / 1000));
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(localeTag(), { numeric: 'auto' });
    if (abs < 60) return rtf.format(0, 'second');
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < MONTH_SECONDS) return rtf.format(Math.round(diff / 86400), 'day');
    return new Date(ms).toLocaleDateString(localeTag());
  }

  function paintTexts(root) {
    root.querySelectorAll('[data-t]').forEach(function (node) {
      node.textContent = t(node.dataset.t);
    });
  }

  function paintFav(btn, on) {
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', t(on ? 'market.saveRemove' : 'market.saveAdd'));
  }

  function paintCard(col) {
    const item = itemOf.get(col);
    if (!item) return;

    paintTexts(col);
    col.querySelector('[data-role="cat"]').textContent = t(CATEGORY_KEYS[item.category] || CATEGORY_KEYS.other);

    const amount = col.querySelector('[data-role="amount"]');
    if (item.price === null) {
      amount.textContent = t('market.noPrice');
    } else {
      amount.textContent = formatPrice(item.price);
    }

    const regionText = item.region ? regionName(item.region) : '';
    const where = col.querySelector('[data-role="where"]');
    where.hidden = !regionText;
    where.querySelector('span').textContent = regionText;

    const stamp = item.approved_at || item.created_at;
    const when = col.querySelector('[data-role="when"]');
    when.hidden = !stamp;
    if (stamp) {
      when.querySelector('span').textContent = relativeTime(stamp);
      when.title = new Date(stamp).toLocaleString(localeTag());
    }

    const count = col.querySelector('[data-role="count"]');
    if (count) count.setAttribute('aria-label', t('market.photos').replace('{n}', String(item.images.length)));

    paintFav(col.querySelector('[data-role="fav"]'), item.is_saved);
  }

  function createImage(src, media, index) {
    const img = document.createElement('img');
    img.className = 'places-card__img';
    img.alt = '';
    img.width = 400;
    img.height = 250;
    img.decoding = 'async';
    img.loading = index < EAGER_COUNT ? 'eager' : 'lazy';
    if (index === 0) img.setAttribute('fetchpriority', 'high');

    media.classList.add('is-loading');
    img.addEventListener('load', function () {
      media.classList.remove('is-loading');
    }, { once: true });
    img.addEventListener('error', function () {
      media.classList.remove('is-loading');
      img.remove();
    }, { once: true });
    img.src = src;
    return img;
  }

  function metaItem(role, iconName) {
    const node = el('span', 'market-card__meta-item');
    node.setAttribute('data-role', role);
    node.appendChild(icon(iconName));
    node.appendChild(document.createElement('span'));
    return node;
  }

  function createCard(item, index) {
    const col = el('div', 'col-12 col-sm-6 col-lg-4 col-xxl-3');
    col.setAttribute('data-listing', '');
    col.dataset.id = item.listing_id;
    itemOf.set(col, item);

    const article = el('article', 'places-card market-card');

    const media = el('div', 'places-card__media market-card__media');
    const placeholder = el('span', 'market-card__ph');
    placeholder.appendChild(icon('placeholder'));
    media.appendChild(placeholder);
    if (item.images.length) media.appendChild(createImage(item.images[0], media, index));

    const condition = el('span', 'places-card__status market-cond market-cond--' + item.condition);
    condition.dataset.t = CONDITION_KEYS[item.condition] || CONDITION_KEYS['new'];
    media.appendChild(condition);

    const fav = el('button', 'places-card__fav');
    fav.type = 'button';
    fav.setAttribute('data-role', 'fav');
    fav.appendChild(icon('heart'));
    media.appendChild(fav);

    if (item.images.length > 1) {
      const count = el('span', 'market-card__count');
      count.setAttribute('data-role', 'count');
      count.appendChild(icon('image'));
      count.appendChild(document.createTextNode(String(item.images.length)));
      media.appendChild(count);
    }

    const body = el('div', 'places-card__body');

    const category = el('span', 'places-card__type');
    category.setAttribute('data-role', 'cat');

    const heading = el('h2', 'places-card__name');
    const link = el('a', 'places-card__link');
    link.href = DETAILS_PAGE + '?id=' + encodeURIComponent(item.listing_id);
    link.textContent = item.title;
    heading.appendChild(link);

    const price = el('p', 'market-card__price');
    const amount = el('span', 'market-card__amount' + (item.price === null ? ' market-card__amount--none' : ''));
    amount.setAttribute('data-role', 'amount');
    price.appendChild(amount);
    if (item.negotiable) {
      const nego = el('span', 'market-card__nego');
      nego.dataset.t = 'addListing.negotiable';
      price.appendChild(nego);
    }

    const meta = el('div', 'market-card__meta');
    meta.appendChild(metaItem('where', 'pin'));
    meta.appendChild(metaItem('when', 'clock'));

    body.appendChild(category);
    body.appendChild(heading);
    body.appendChild(price);
    body.appendChild(meta);
    article.appendChild(media);
    article.appendChild(body);
    col.appendChild(article);

    paintCard(col);
    return col;
  }

  function setLoading(on) {
    if (on) list.setAttribute('aria-busy', 'true');
    else list.removeAttribute('aria-busy');
    if (skeleton) skeleton.hidden = !on;
  }

  function hidePanel() {
    panel = null;
    stateBox.hidden = true;
  }

  function showPanel(kind) {
    panel = kind;
    const filtered = hasActiveFilters();
    const show = { reset: false, browse: false, add: false, login: false, retry: false };
    let title = '';
    let sub = '';

    if (kind === 'error') {
      title = t('market.errorTitle');
      show.retry = true;
    } else if (kind === 'login') {
      title = t('market.loginTitle');
      sub = t('market.loginSub');
      show.login = true;
    } else if (state.tab === 'saved' && !filtered) {
      title = t('market.emptySaved');
      sub = t('market.emptySavedSub');
      show.browse = true;
    } else if (filtered) {
      title = t('market.emptyFiltered');
      sub = t('market.emptyFilteredSub');
      show.reset = true;
    } else {
      title = t('market.empty');
      sub = t('market.emptySub');
      show.add = true;
    }

    stateTitle.textContent = title;
    stateSub.textContent = sub;
    stateSub.hidden = !sub;
    resetBtn.hidden = !show.reset;
    browseBtn.hidden = !show.browse;
    stateAddBtn.hidden = !show.add;
    loginBtn.hidden = !show.login;
    retryBtn.hidden = !show.retry;
    stateBox.hidden = false;

    if (kind !== 'empty') {
      countEl.textContent = '';
      moreWrap.hidden = true;
    }
  }

  function paintCount() {
    const n = view.total !== null ? String(view.total) : items.length + (view.hasMore ? '+' : '');
    countEl.textContent = t('market.count').replace('{n}', n);
  }

  function paintMore() {
    moreWrap.hidden = !view.hasMore || panel === 'error' || panel === 'login';
    if (moreWrap.hidden) return;
    if (moreFailed) {
      moreLabel.textContent = t('market.loadMoreFailed');
      return;
    }
    const remaining = view.total !== null ? Math.max(0, view.total - items.length) : 0;
    moreLabel.textContent = remaining > 0 ? t('market.showMore').replace('{n}', String(remaining)) : t('market.loadMore');
  }

  function playEnter(cols) {
    if (reduceMotion.matches || !cols.length) return;
    cols.forEach(function (col, index) {
      col.classList.remove('is-entering');
      col.style.setProperty('--enter-delay', Math.min(index, STAGGER_MAX) * STAGGER_MS + 'ms');
    });
    void list.offsetWidth;
    cols.forEach(function (col) { col.classList.add('is-entering'); });
  }

  function clearGrid() {
    list.replaceChildren();
    items = [];
    rendered.clear();
  }

  function appendItems(listings) {
    const frag = document.createDocumentFragment();
    const fresh = [];
    listings.forEach(function (item) {
      if (rendered.has(item.listing_id)) return;
      rendered.add(item.listing_id);
      items.push(item);
      const col = createCard(item, items.length - 1);
      frag.appendChild(col);
      fresh.push(col);
    });
    list.appendChild(frag);
    return fresh;
  }

  function updateView(page) {
    view.nextCursor = page.nextCursor;
    view.hasMore = page.hasMore;
    view.total = page.total;
    moreFailed = false;
    if (items.length === 0) showPanel('empty');
    else hidePanel();
    paintCount();
    paintMore();
  }

  function queryFor(cursor) {
    return {
      region: state.region === 'all' ? null : state.region,
      category: state.category === 'all' ? null : state.category,
      condition: state.condition === 'all' ? null : state.condition,
      saved: state.tab === 'saved',
      cursor: cursor || null,
      limit: PAGE_SIZE
    };
  }

  function handleLoadError(err) {
    if (err && err.code === 'unauthorized' && state.tab === 'saved') showPanel('login');
    else showPanel('error');
  }

  function reload() {
    seq += 1;
    const mine = seq;
    busyMore = false;
    moreFailed = false;
    moreBtn.disabled = false;
    hidePanel();
    clearGrid();
    view.nextCursor = null;
    view.hasMore = false;
    view.total = null;
    countEl.textContent = '';
    moreWrap.hidden = true;

    if (!api) {
      setLoading(false);
      showPanel('error');
      return;
    }

    setLoading(true);
    api.fetchPage(queryFor(null)).then(function (page) {
      if (mine !== seq) return;
      setLoading(false);
      const fresh = appendItems(page.items);
      updateView(page);
      playEnter(fresh);
    }).catch(function (err) {
      if (mine !== seq) return;
      setLoading(false);
      handleLoadError(err);
    });
  }

  function loadMore() {
    if (busyMore || !view.hasMore || !api) return;
    busyMore = true;
    moreFailed = false;
    moreBtn.disabled = true;
    paintMore();

    const mine = seq;
    api.fetchPage(queryFor(view.nextCursor)).then(function (page) {
      if (mine !== seq) return;
      const fresh = appendItems(page.items);
      updateView(page);
      playEnter(fresh);
      const link = fresh.length ? fresh[0].querySelector('.places-card__link') : null;
      if (link) link.focus({ preventScroll: true });
    }).catch(function (err) {
      if (mine !== seq) return;
      if (err && err.code === 'unauthorized' && state.tab === 'saved') {
        showPanel('login');
        return;
      }
      moreFailed = true;
      paintMore();
    }).then(function () {
      if (mine !== seq) return;
      busyMore = false;
      moreBtn.disabled = false;
    });
  }

  function syncFilterUI() {
    const isAll = !hasActiveFilters();
    allChip.classList.toggle('is-active', isAll);
    allChip.setAttribute('aria-pressed', isAll ? 'true' : 'false');
    clearChip.hidden = isAll;
    clearChip.setAttribute('aria-label', t('market.clearFilters'));
    if (tabsGroup) tabsGroup.setAttribute('aria-label', t('market.sections'));
    if (filtersBar) filtersBar.setAttribute('aria-label', t('market.filters'));

    tabs.forEach(function (tab) {
      const on = tab.dataset.marketTab === state.tab;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    categoryItems.forEach(function (item) {
      const on = item.dataset.marketCategory === state.category;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    conditionItems.forEach(function (item) {
      const on = item.dataset.marketCondition === state.condition;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    regionItems().forEach(function (item) {
      const on = item.dataset.marketRegion === state.region;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    const categoryActive = state.category !== 'all';
    categoryBtn.classList.toggle('is-active', categoryActive);
    categoryLabel.textContent = categoryActive ? t(CATEGORY_KEYS[state.category]) : t('market.filterCategory');

    const conditionActive = state.condition !== 'all';
    conditionBtn.classList.toggle('is-active', conditionActive);
    conditionLabel.textContent = conditionActive ? t(CONDITION_KEYS[state.condition]) : t('market.filterCondition');

    const regionActive = state.region !== 'all';
    regionBtn.classList.toggle('is-active', regionActive);
    regionLabel.textContent = regionActive ? regionName(state.region) : t('AllRegions');
  }

  function apply(patch) {
    let changed = false;
    Object.keys(patch).forEach(function (key) {
      if (state[key] !== patch[key]) {
        state[key] = patch[key];
        changed = true;
      }
    });
    if (!changed) return;
    syncFilterUI();
    reload();
    writeUrl();
  }

  function openAddListing() {
    const modal = document.getElementById('addListingModal');
    if (!modal || typeof bootstrap === 'undefined') return;
    bootstrap.Modal.getOrCreateInstance(modal).show();
  }

  function removeCard(col) {
    const item = itemOf.get(col);
    if (item) {
      const at = items.indexOf(item);
      if (at !== -1) items.splice(at, 1);
      rendered.delete(item.listing_id);
    }
    col.remove();
    if (view.total !== null && view.total > 0) view.total -= 1;
    if (items.length === 0 && view.hasMore) {
      loadMore();
      return;
    }
    if (items.length === 0) showPanel('empty');
    paintCount();
    paintMore();
  }

  function toggleSave(col, btn) {
    const item = itemOf.get(col);
    if (!item || !api || btn.disabled) return;

    requireAuth(function () {
      const next = !item.is_saved;
      btn.disabled = true;
      item.is_saved = next;
      paintFav(btn, next);

      api.setSaved(item.listing_id, next).then(function (result) {
        item.is_saved = result.saved;
        paintFav(btn, result.saved);
        if (state.tab === 'saved' && !result.saved) removeCard(col);
      }).catch(function (err) {
        item.is_saved = !next;
        paintFav(btn, !next);
        if (err && err.code === 'unauthorized') requireAuth(function () {});
      }).then(function () {
        btn.disabled = false;
      });
    });
  }

  document.addEventListener('click', function (e) {
    const target = e.target.closest('[data-market-all],[data-market-tab],[data-market-category],[data-market-condition],[data-market-region]');
    if (!target) return;

    if (target.hasAttribute('data-market-all')) {
      apply({ region: 'all', category: 'all', condition: 'all' });
    } else if (target.hasAttribute('data-market-tab')) {
      const tab = target.dataset.marketTab;
      if (tab === 'saved') requireAuth(function () { apply({ tab: 'saved' }); });
      else apply({ tab: 'all' });
    } else if (target.hasAttribute('data-market-category')) {
      const category = target.dataset.marketCategory;
      if (category !== 'all' && !isCategory(category)) return;
      apply({ category: category });
    } else if (target.hasAttribute('data-market-condition')) {
      const condition = target.dataset.marketCondition;
      if (condition !== 'all' && !isCondition(condition)) return;
      apply({ condition: condition });
    } else {
      const region = target.dataset.marketRegion;
      if (region !== 'all' && !isRegionCode(region)) return;
      apply({ region: region });
    }
  });

  list.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-role="fav"]');
    if (!btn) return;
    toggleSave(btn.closest('[data-listing]'), btn);
  });

  list.addEventListener('animationend', function (e) {
    if (e.target.classList && e.target.classList.contains('is-entering')) {
      e.target.classList.remove('is-entering');
    }
  });

  moreBtn.addEventListener('click', loadMore);
  retryBtn.addEventListener('click', reload);
  addBtn.addEventListener('click', openAddListing);
  stateAddBtn.addEventListener('click', openAddListing);
  resetBtn.addEventListener('click', function () {
    apply({ region: 'all', category: 'all', condition: 'all' });
  });
  browseBtn.addEventListener('click', function () {
    apply({ tab: 'all' });
  });
  loginBtn.addEventListener('click', function () {
    requireAuth(reload);
  });

  let lastLang = currentLang();
  new MutationObserver(function () {
    const lang = currentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    Array.prototype.forEach.call(list.children, paintCard);
    syncFilterUI();
    if (panel === 'empty' || panel === 'error' || panel === 'login') showPanel(panel);
    if (items.length) paintCount();
    paintMore();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  function boot() {
    renderRegionMenu();
    readUrl();
    syncFilterUI();
    reload();
  }

  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();