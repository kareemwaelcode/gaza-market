'use strict';

(function () {
  const list = document.getElementById('placesGrid');
  if (!list) return;

  const api = window.GMPlaces;
  const skeleton = document.getElementById('placesSkeleton');
  const stateBox = document.getElementById('placesState');
  const stateTitle = document.getElementById('placesStateTitle');
  const stateSub = document.getElementById('placesStateSub');
  const resetBtn = document.getElementById('placesReset');
  const retryBtn = document.getElementById('placesRetry');
  const addBtn = document.getElementById('placesAdd');
  const countEl = document.getElementById('placesCount');
  const typeBtn = document.getElementById('placesTypeBtn');
  const typeLabel = document.getElementById('placesTypeLabel');
  const regionBtn = document.getElementById('placesRegionBtn');
  const regionLabel = document.getElementById('placesRegionLabel');
  const allChip = document.querySelector('[data-places-all]');
  const openChip = document.querySelector('[data-places-open]');
  const moreWrap = document.getElementById('placesMore');
  const moreBtn = document.getElementById('placesMoreBtn');
  const moreLabel = document.getElementById('placesMoreLabel');
  const clearChip = document.getElementById('placesClear');
  const typeItems = Array.from(document.querySelectorAll('[data-places-type]'));
  const regionMenu = document.getElementById('placesRegionMenu');

  function renderRegionMenu() {
    if (!regionMenu || !window.GMRegions) return;
    const lang = typeof i18n !== 'undefined' ? i18n.getLang() : 'ar';
    const known = function (key) { return typeof i18n !== 'undefined' && i18n.t(key) !== key; };
    const frag = document.createDocumentFragment();

    function addItem(value, key, text) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dropdown-item';
      btn.setAttribute('data-places-region', value);
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

  renderRegionMenu();

  const regionItems = Array.from(document.querySelectorAll('[data-places-region]'));

  function regionName(code) {
    const translated = typeof i18n !== 'undefined' ? i18n.t(code) : code;
    if (translated !== code) return translated;
    if (!window.GMRegions) return code;
    return window.GMRegions.label(code, currentLang());
  }

  const TYPE_FILTERS = {
    'restaurant': 'places.filterRestaurants',
    'cafe': 'places.filterCafes',
    'restaurant-cafe': 'typeRestCafe',
    'workspace': 'places.filterWorkspaces',
    'store': 'places.filterStores'
  };

  const TYPE_LABELS = {
    'restaurant': 'typeRestaurant',
    'cafe': 'typeCafe',
    'restaurant-cafe': 'typeRestCafe',
    'workspace': 'typeCowork',
    'store': 'typeStore'
  };

  const ICONS = {
    heart: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>',
    pin: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    wa: '<svg class="places-icon" width="16" height="16" aria-hidden="true" focusable="false"><use href="#gm-i-whatsapp"/></svg>',
    book: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>',
    tag: '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>'
  };

  const FAV_KEY = 'gm_places_favs_v1';
  const LEGACY_FAV_KEY = 'gm_shops_favs_v1';
  const EAGER_COUNT = 4;
  const STAGGER_MS = 60;
  const STAGGER_MAX = 8;
  const PAGE_SIZE = api && api.defaultLimit ? api.defaultLimit : 12;

  const state = { type: 'all', region: 'all', open: false };
  const view = { nextCursor: null, hasMore: false, total: null };
  const placeOf = new WeakMap();
  const rendered = new Set();
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const iconTpl = document.createElement('template');
  const iconCache = {};

  let items = [];
  let seq = 0;
  let controller = null;
  let busyMore = false;
  let extraPages = 0;
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

  function isTypeFilter(type) {
    return Object.prototype.hasOwnProperty.call(TYPE_FILTERS, type);
  }

  function isRegionCode(code) {
    return regionItems.some(function (item) { return item.dataset.placesRegion === code; });
  }

  function toRegionCode(raw) {
    if (!raw) return null;
    const code = typeof window.gmNormalizeRegionKey === 'function' ? window.gmNormalizeRegionKey(raw) : raw;
    return isRegionCode(code) ? code : null;
  }

  function savedRegion() {
    let raw = '';
    try {
      raw = typeof window.gmGetSelectedArea === 'function'
        ? window.gmGetSelectedArea()
        : (localStorage.getItem('gmSelectedArea') || '');
    } catch (err) {
      raw = '';
    }
    return toRegionCode(raw);
  }

  function hasActiveFilters() {
    return state.type !== 'all' || state.region !== 'all' || state.open;
  }

  function readUrl() {
    const saved = savedRegion();
    if (saved) state.region = saved;

    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (err) {
      return;
    }
    const LEGACY_STORE_TYPES = ['supermarket', 'pharmacy', 'misc'];
    const rawType = params.get('type');
    const type = LEGACY_STORE_TYPES.indexOf(rawType) !== -1 ? 'store' : rawType;
    const region = params.get('region');
    const areaCode = toRegionCode(params.get('area'));
    if (type && isTypeFilter(type)) state.type = type;
    if (areaCode) state.region = areaCode;
    else if (region === 'all') state.region = 'all';
    else if (region && isRegionCode(region)) state.region = region;
    state.open = params.get('open') === '1';
  }

  function writeUrl() {
    const params = new URLSearchParams();
    if (state.type !== 'all') params.set('type', state.type);
    if (state.region !== 'all') params.set('region', state.region);
    else if (savedRegion()) params.set('region', 'all');
    if (state.open) params.set('open', '1');
    const query = params.toString();
    try {
      history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    } catch (err) {
      console.error('places url sync failed:', err);
    }
  }

  function readFavs() {
    try {
      let stored = localStorage.getItem(FAV_KEY);
      if (stored === null) {
        const legacy = localStorage.getItem(LEGACY_FAV_KEY);
        if (legacy !== null) {
          stored = legacy;
          localStorage.setItem(FAV_KEY, legacy);
          localStorage.removeItem(LEGACY_FAV_KEY);
        }
      }
      const raw = JSON.parse(stored || '[]');
      return new Set(Array.isArray(raw) ? raw.map(String) : []);
    } catch (err) {
      return new Set();
    }
  }

  function saveFavs() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs)));
    } catch (err) {
      console.error('places favourites storage failed:', err);
    }
  }

  const favs = readFavs();

  function paintFav(btn, on) {
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', t(on ? 'places.favRemove' : 'places.favAdd'));
  }

  function placeName(place) {
    return currentLang() === 'ar' ? place.name_ar || place.name_en : place.name_en || place.name_ar;
  }

  function placeAddress(place) {
    return currentLang() === 'ar' ? place.address_ar : place.address_en;
  }

  function paintTexts(root) {
    root.querySelectorAll('[data-t]').forEach(function (node) {
      node.textContent = t(node.dataset.t);
    });
  }

  function paintCard(col) {
    const place = placeOf.get(col);
    if (!place) return;

    col.querySelector('.places-card__link').textContent = placeName(place);
    paintTexts(col);

    if (place.type === 'store') {
      const categoryText = currentLang() === 'ar' ? place.category_ar : place.category_en;
      if (categoryText) col.querySelector('.places-card__type').textContent = categoryText;
    }

    const regionText = place.region ? regionName(place.region) : '';
    const address = placeAddress(place);
    const sep = currentLang() === 'ar' ? '، ' : ', ';
    col.querySelector('.places-card__region').textContent = regionText;
    col.querySelector('.places-card__addr').textContent = address ? (regionText ? sep : '') + address : '';

    const where = col.querySelector('.places-card__where');
    where.hidden = !regionText && !address;
    where.title = [regionText, address].filter(Boolean).join(sep);

    paintFav(col.querySelector('[data-role="fav"]'), favs.has(place.id));
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

  function actionLink(className, href, iconName, key, external) {
    const link = el('a', 'places-btn ' + className);
    link.href = href;
    if (external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.appendChild(icon(iconName));
    const label = document.createElement('span');
    label.dataset.t = key;
    link.appendChild(label);
    return link;
  }

  function createCard(place, index) {
    const col = el('div', 'col-12 col-sm-6 col-lg-4 col-xxl-3');
    col.setAttribute('data-place', '');
    col.dataset.id = place.id;
    col.dataset.slug = place.slug || '';
    col.dataset.type = place.type;
    col.dataset.region = place.region;
    col.dataset.open = place.is_open ? '1' : '0';
    placeOf.set(col, place);

    const article = el('article', 'places-card');

    const media = el('div', 'places-card__media');
    const src = place.image_thumb || place.image_url;
    if (src) media.appendChild(createImage(src, media, index));

    const status = el('span', 'places-card__status ' + (place.is_open ? 'is-open' : 'is-closed'));
    status.dataset.t = place.is_open ? 'stores.open' : 'stores.closed';
    media.appendChild(status);

    const fav = el('button', 'places-card__fav');
    fav.type = 'button';
    fav.setAttribute('data-role', 'fav');
    fav.appendChild(icon('heart'));
    media.appendChild(fav);

    const body = el('div', 'places-card__body');

    const type = el('span', 'places-card__type');
    type.dataset.t = TYPE_LABELS[place.type] || 'typeStore';

    const ref = place.ref ? encodeURIComponent(place.ref) : '';
    const row = el('div', 'places-card__row');
    const heading = el('h2', 'places-card__name');
    const link = el('a', 'places-card__link');
    if (ref) link.href = 'menu.html?id=' + ref;
    heading.appendChild(link);

    const where = el('p', 'places-card__where');
    where.appendChild(icon('pin'));
    const whereText = el('span', 'places-card__where-text');
    whereText.appendChild(el('span', 'places-card__region'));
    whereText.appendChild(el('span', 'places-card__addr'));
    where.appendChild(whereText);

    row.appendChild(heading);
    row.appendChild(where);

    const actions = el('div', 'places-card__actions');
    if (place.whatsapp) {
      actions.appendChild(actionLink('places-btn--wa', 'https://wa.me/' + place.whatsapp, 'wa', 'places.whatsapp', true));
    }
    if (ref) {
      if (place.type === 'store') {
        actions.appendChild(actionLink('places-btn--menu', 'menu.html?id=' + ref + '#menu', 'tag', 'places.products', false));
      } else if (place.has_menu) {
        actions.appendChild(actionLink('places-btn--menu', 'menu.html?id=' + ref + '#menu', 'book', 'places.menu', false));
      } else {
        actions.appendChild(actionLink('places-btn--menu', 'menu.html?id=' + ref, 'tag', 'places.prices', false));
      }
    }

    body.appendChild(type);
    body.appendChild(row);
    body.appendChild(actions);
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

  function showEmpty() {
    panel = 'empty';
    const categoryEmpty = state.type !== 'all' && state.region === 'all' && !state.open;
    stateTitle.textContent = t(categoryEmpty ? 'places.emptyCategory' : 'places.empty');
    stateSub.textContent = t(categoryEmpty ? 'places.emptyCategorySub' : 'places.emptySub');
    stateSub.hidden = false;
    if (resetBtn) resetBtn.hidden = !hasActiveFilters();
    if (retryBtn) retryBtn.hidden = true;
    if (addBtn) addBtn.hidden = false;
    stateBox.hidden = false;
  }

  function showError() {
    panel = 'error';
    stateTitle.textContent = t('places.errorTitle');
    stateSub.textContent = '';
    stateSub.hidden = true;
    if (resetBtn) resetBtn.hidden = true;
    if (addBtn) addBtn.hidden = true;
    if (retryBtn) retryBtn.hidden = false;
    stateBox.hidden = false;
    countEl.textContent = '';
    if (moreWrap) moreWrap.hidden = true;
  }

  function repaintPanel() {
    if (panel === 'empty') showEmpty();
    else if (panel === 'error') showError();
  }

  function paintCount() {
    if (!countEl) return;
    const n = view.total !== null ? String(view.total) : items.length + (view.hasMore ? '+' : '');
    countEl.textContent = t('places.count').replace('{n}', n);
  }

  function paintMore() {
    if (!moreWrap) return;
    moreWrap.hidden = !view.hasMore || panel === 'error';
    if (moreWrap.hidden) return;
    if (moreFailed) {
      moreLabel.textContent = t('places.loadMoreFailed');
      return;
    }
    const remaining = view.total !== null ? Math.max(0, view.total - items.length) : 0;
    moreLabel.textContent = remaining > 0 ? t('places.showMore').replace('{n}', String(remaining)) : t('places.loadMore');
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

  function appendItems(places) {
    const frag = document.createDocumentFragment();
    const fresh = [];
    places.forEach(function (place) {
      if (rendered.has(place.id)) return;
      rendered.add(place.id);
      items.push(place);
      const col = createCard(place, items.length - 1);
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
    if (items.length === 0) showEmpty();
    else hidePanel();
    paintCount();
    paintMore();
  }

  function replaceItems(page, animate) {
    clearGrid();
    const fresh = appendItems(page.items);
    updateView(page);
    if (animate) playEnter(fresh);
  }

  function signature(places) {
    return places.map(function (p) {
      return [p.id, p.type, p.region, p.name_ar, p.name_en, p.address_ar, p.address_en,
        p.image_thumb, p.image_url, p.is_open, p.whatsapp, p.has_menu, p.category_ar, p.category_en].join('~');
    }).join('|');
  }

  function queryFor(cursor) {
    return {
      type: state.type === 'all' ? null : state.type,
      region: state.region === 'all' ? null : state.region,
      open: state.open,
      cursor: cursor || null,
      limit: PAGE_SIZE
    };
  }

  function newController() {
    controller = typeof AbortController === 'function' ? new AbortController() : null;
    return controller;
  }

  function cancelPending() {
    if (controller) controller.abort();
    controller = null;
    busyMore = false;
    moreFailed = false;
    extraPages = 0;
    if (moreBtn) moreBtn.disabled = false;
  }

  function isAborted(err) {
    return !!err && err.code === 'aborted';
  }

  function revalidate(query, mine) {
    api.fetchPage(query, { refresh: true }).then(function (page) {
      if (mine !== seq) return;
      if (extraPages > 0) return;
      if (items.length === page.items.length && signature(items) === signature(page.items)) {
        updateView(page);
        return;
      }
      replaceItems(page, false);
    }).catch(function () {});
  }

  function reload() {
    seq += 1;
    const mine = seq;
    cancelPending();
    hidePanel();

    if (!api) {
      clearGrid();
      setLoading(false);
      showError();
      return;
    }

    const query = queryFor(null);
    const hit = api.peekPage(query);
    if (hit) {
      setLoading(false);
      replaceItems(hit.page, true);
      if (!hit.fresh) revalidate(query, mine);
      return;
    }

    clearGrid();
    view.nextCursor = null;
    view.hasMore = false;
    view.total = null;
    countEl.textContent = '';
    if (moreWrap) moreWrap.hidden = true;
    setLoading(true);

    const ctl = newController();
    api.fetchPage(query, { signal: ctl ? ctl.signal : undefined }).then(function (page) {
      if (mine !== seq) return;
      setLoading(false);
      replaceItems(page, true);
    }).catch(function (err) {
      if (mine !== seq || isAborted(err)) return;
      setLoading(false);
      showError();
    });
  }

  function loadMore() {
    if (busyMore || !view.hasMore || !api) return;
    busyMore = true;
    moreFailed = false;
    moreBtn.disabled = true;
    paintMore();

    const mine = seq;
    const ctl = newController();
    api.fetchPage(queryFor(view.nextCursor), { signal: ctl ? ctl.signal : undefined }).then(function (page) {
      if (mine !== seq) return;
      const fresh = appendItems(page.items);
      extraPages += 1;
      updateView(page);
      playEnter(fresh);
      const link = fresh.length ? fresh[0].querySelector('.places-card__link') : null;
      if (link) link.focus({ preventScroll: true });
    }).catch(function (err) {
      if (mine !== seq || isAborted(err)) return;
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

    if (clearChip) clearChip.hidden = isAll;

    openChip.classList.toggle('is-active', state.open);
    openChip.setAttribute('aria-pressed', state.open ? 'true' : 'false');

    typeItems.forEach(function (item) {
      const on = item.dataset.placesType === state.type;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    regionItems.forEach(function (item) {
      const on = item.dataset.placesRegion === state.region;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    const typeActive = state.type !== 'all';
    typeBtn.classList.toggle('is-active', typeActive);
    typeLabel.textContent = typeActive ? t(TYPE_FILTERS[state.type]) : t('places.filterCategory');

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

  document.addEventListener('click', function (e) {
    const target = e.target.closest('[data-places-all],[data-places-type],[data-places-open],[data-places-region]');
    if (!target) return;

    if (target.hasAttribute('data-places-all')) {
      apply({ type: 'all', region: 'all', open: false });
    } else if (target.hasAttribute('data-places-open')) {
      apply({ open: !state.open });
    } else if (target.hasAttribute('data-places-type')) {
      const type = target.dataset.placesType;
      if (type !== 'all' && !isTypeFilter(type)) return;
      const toggle = target.classList.contains('places-popular__item') && type === state.type;
      apply({ type: toggle ? 'all' : type });
    } else {
      const region = target.dataset.placesRegion;
      if (region !== 'all' && !isRegionCode(region)) return;
      apply({ region: region });
    }
  });

  if (moreBtn) moreBtn.addEventListener('click', loadMore);
  if (retryBtn) retryBtn.addEventListener('click', reload);

  list.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-role="fav"]');
    if (!btn) return;
    const id = btn.closest('[data-place]').dataset.id;
    const on = !favs.has(id);
    if (on) favs.add(id);
    else favs.delete(id);
    saveFavs();
    paintFav(btn, on);
  });

  list.addEventListener('animationend', function (e) {
    if (e.target.classList && e.target.classList.contains('is-entering')) {
      e.target.classList.remove('is-entering');
    }
  });

  let lastLang = currentLang();
  new MutationObserver(function () {
    const lang = currentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    Array.prototype.forEach.call(list.children, paintCard);
    syncFilterUI();
    paintCount();
    paintMore();
    repaintPanel();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  window.GMPlacesUI = { setLoading: setLoading };

  function boot() {
    readUrl();
    syncFilterUI();
    reload();
  }

  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();