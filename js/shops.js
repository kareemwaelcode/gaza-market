'use strict';

/*
 * Gaza Market - shops page (shops.html)
 * Lists places as cards. Data comes ONLY from window.GMShops (js/shops-api.js), never directly from fetch().
 * Filters: All / Restaurants / Cafes / Open only (single choice) + a region dropdown.
 * Load order: translations.js, i18n.js, shops-api.js, shops.js, main.js ...
 */
(function () {
  var api = window.GMShops;
  var grid = document.getElementById('shopsGrid');
  if (!api || !grid) return;

  var stateBox = document.getElementById('shopsState');
  var stateTitle = document.getElementById('shopsStateTitle');
  var stateSub = document.getElementById('shopsStateSub');
  var stateRetry = document.getElementById('shopsRetry');
  var stateAdd = document.getElementById('shopsAdd');
  var moreWrap = document.getElementById('shopsMoreWrap');
  var moreBtn = document.getElementById('shopsLoadMore');
  var moreError = document.getElementById('shopsMoreError');
  var regionBtn = document.getElementById('shopsRegionBtn');
  var regionLabel = document.getElementById('shopsRegionLabel');
  var cardTemplate = document.getElementById('shopCardTemplate');
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-shops-filter]'));
  var regionItems = Array.prototype.slice.call(document.querySelectorAll('[data-shops-region]'));

  var TYPE_KEYS = {
    'restaurant': 'typeRestaurant',
    'cafe': 'typeCafe',
    'restaurant-cafe': 'typeRestCafe'
  };

  // filter: 'all' | 'restaurant' | 'cafe' | 'open'     region: 'all' | region code
  var state = {
    filter: 'all',
    region: 'all',
    items: [],
    cursor: null,
    hasMore: false,
    loading: false,
    requestId: 0
  };

  function t(key) {
    return typeof i18n !== 'undefined' && i18n.t ? i18n.t(key) : key;
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar';
  }

  function placeName(place) {
    if (currentLang() === 'ar') return place.name_ar || place.name_en;
    return place.name_en || place.name_ar;
  }

  function buildParams(cursor) {
    return {
      type: state.filter === 'restaurant' || state.filter === 'cafe' ? state.filter : null,
      region: state.region === 'all' ? null : state.region,
      open: state.filter === 'open',
      cursor: cursor || null,
      limit: api.defaultLimit
    };
  }

  function cacheKey() {
    return state.filter + '|' + state.region;
  }

  /* ------------------------------ rendering ------------------------------ */

  function buildCard(place) {
    var node = cardTemplate.content.firstElementChild.cloneNode(true);
    var name = placeName(place);

    node.href = 'shop.html?id=' + encodeURIComponent(place.slug || place.id);
    node.setAttribute('aria-label', name);

    var img = node.querySelector('[data-role="image"]');
    if (place.image_url) {
      img.src = place.image_url;
      img.alt = '';
    } else {
      img.remove();
    }

    var status = node.querySelector('[data-role="status"]');
    status.textContent = t(place.is_open ? 'stores.open' : 'stores.closed');
    status.classList.add(place.is_open ? 'is-open' : 'is-closed');

    node.querySelector('[data-role="type"]').textContent = t(TYPE_KEYS[place.type] || place.type);
    node.querySelector('[data-role="name"]').textContent = name;

    var where = [];
    if (place.region) where.push(t(place.region));
    if (place.address) where.push(place.address);
    node.querySelector('[data-role="where"]').textContent = where.join(' · ');

    return node;
  }

  function renderList() {
    var frag = document.createDocumentFragment();
    state.items.forEach(function (place) { frag.appendChild(buildCard(place)); });
    grid.replaceChildren(frag);
    grid.hidden = state.items.length === 0;
    moreWrap.hidden = !state.hasMore;
  }

  function renderSkeleton(count) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var card = document.createElement('div');
      card.className = 'shops-card is-skeleton';
      card.setAttribute('aria-hidden', 'true');
      var media = document.createElement('div');
      media.className = 'shops-card__media gm-skel';
      var body = document.createElement('div');
      body.className = 'shops-card__body';
      var l1 = document.createElement('span');
      l1.className = 'gm-skel shops-skel-line';
      var l2 = document.createElement('span');
      l2.className = 'gm-skel shops-skel-line shops-skel-line--short';
      body.appendChild(l1);
      body.appendChild(l2);
      card.appendChild(media);
      card.appendChild(body);
      frag.appendChild(card);
    }
    grid.hidden = false;
    grid.replaceChildren(frag);
  }

  function showState(kind) {
    // kind: 'empty' | 'error' | null
    if (!kind) {
      stateBox.hidden = true;
      return;
    }
    var isError = kind === 'error';
    stateTitle.textContent = t(isError ? 'shops.errorTitle' : 'shops.empty');
    stateSub.textContent = isError ? '' : t('shops.emptySub');
    stateSub.hidden = isError;
    stateRetry.hidden = !isError;
    stateAdd.hidden = isError;
    stateBox.dataset.kind = kind;
    stateBox.hidden = false;
  }

  function syncFilterUI() {
    chips.forEach(function (chip) {
      var on = chip.dataset.shopsFilter === state.filter;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    regionItems.forEach(function (item) {
      var on = item.dataset.shopsRegion === state.region;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    var regionActive = state.region !== 'all';
    regionBtn.classList.toggle('is-active', regionActive);
    regionLabel.textContent = regionActive ? t(state.region) : t('shops.regionBtn');
  }

  /* ------------------------------ loading ------------------------------ */

  async function load(reset) {
    var myId = ++state.requestId;
    state.loading = true;
    grid.setAttribute('aria-busy', 'true');
    moreError.hidden = true;

    if (reset) {
      state.items = [];
      state.cursor = null;
      state.hasMore = false;
      moreWrap.hidden = true;
      showState(null);
      renderSkeleton(6);
    } else {
      moreBtn.disabled = true;
    }

    try {
      var page = await api.fetchPage(buildParams(reset ? null : state.cursor));
      if (myId !== state.requestId) return;

      state.items = reset ? page.items : state.items.concat(page.items);
      state.cursor = page.nextCursor;
      state.hasMore = page.hasMore;
      renderList();

      if (reset) {
        api.writeCache(cacheKey(), state.items);
        showState(state.items.length === 0 ? 'empty' : null);
      }
    } catch (err) {
      if (myId !== state.requestId) return;

      if (reset) {
        var cached = api.readCache(cacheKey());
        if (cached && cached.items.length) {
          state.items = cached.items;
          state.hasMore = false;
          renderList();
          showState(null);
        } else {
          grid.replaceChildren();
          grid.hidden = true;
          showState('error');
        }
      } else {
        moreError.hidden = false;
      }
    } finally {
      if (myId === state.requestId) {
        state.loading = false;
        grid.setAttribute('aria-busy', 'false');
        moreBtn.disabled = false;
      }
    }
  }

  /* ------------------------------ events ------------------------------ */

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var next = chip.dataset.shopsFilter;
      if (next === state.filter) return;
      state.filter = next;
      syncFilterUI();
      load(true);
    });
  });

  regionItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var next = item.dataset.shopsRegion;
      if (next !== 'all' && !api.normalizeRegion(next)) return;
      if (next === state.region) return;
      state.region = next;
      syncFilterUI();
      load(true);
    });
  });

  moreBtn.addEventListener('click', function () {
    if (state.loading || !state.hasMore) return;
    load(false);
  });

  stateRetry.addEventListener('click', function () {
    if (!state.loading) load(true);
  });

  // Language switch: re-render from memory (no new request), labels come from translations.js
  var lastLang = currentLang();
  new MutationObserver(function () {
    var lang = currentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    syncFilterUI();
    if (state.items.length) renderList();
    if (!stateBox.hidden) showState(stateBox.dataset.kind);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  syncFilterUI();
  load(true);
})();