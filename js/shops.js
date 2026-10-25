'use strict';

/*
 * Gaza Market - shops page (shops.html)
 *
 * The cards are plain HTML (one Bootstrap column per shop, marked with data-shop + data-* fields).
 * This script only adds behaviour on top of them: filters, favourites and the AR/EN shop names.
 *
 * Filters (combinable): type (all / restaurant / cafe) + region + "open only". The "All" chip resets everything.
 * The filter state lives in the URL with the same query names the backend will use:
 *   shops.html?type=cafe&region=Nuseirat&open=1
 * Later Laravel reads the same query string and renders only the matching cards; this script then just
 * keeps the controls in sync (the card data-* fields stay the same).
 *
 * Load order: translations.js, i18n.js, shops.js, main.js ...
 */
(function () {
  var list = document.getElementById('shopsGrid');
  if (!list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll('[data-shop]'));
  var stateBox = document.getElementById('shopsState');
  var stateTitle = document.getElementById('shopsStateTitle');
  var stateSub = document.getElementById('shopsStateSub');
  var typeBtn = document.getElementById('shopsTypeBtn');
  var typeLabel = document.getElementById('shopsTypeLabel');
  var regionBtn = document.getElementById('shopsRegionBtn');
  var regionLabel = document.getElementById('shopsRegionLabel');
  var allChip = document.querySelector('[data-shops-all]');
  var openChip = document.querySelector('[data-shops-open]');
  var typeItems = Array.prototype.slice.call(document.querySelectorAll('[data-shops-type]'));
  var regionItems = Array.prototype.slice.call(document.querySelectorAll('[data-shops-region]'));

  // filterable types -> label of the filter
  var TYPE_FILTERS = {
    'restaurant': 'shops.filterRestaurants',
    'cafe': 'shops.filterCafes'
  };

  var FAV_KEY = 'gm_shops_favs_v1';

  // type: 'all' | 'restaurant' | 'cafe'     region: 'all' | region code     open: boolean
  var state = { type: 'all', region: 'all', open: false };

  function t(key) {
    return typeof i18n !== 'undefined' && i18n.t ? i18n.t(key) : key;
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar';
  }

  function isRegionCode(code) {
    return regionItems.some(function (item) { return item.dataset.shopsRegion === code; });
  }

  /* ------------------------------ URL <-> state ------------------------------ */

  function readUrl() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (err) {
      return;
    }
    var type = params.get('type');
    var region = params.get('region');
    if (TYPE_FILTERS[type]) state.type = type;
    if (region && region !== 'all' && isRegionCode(region)) state.region = region;
    state.open = params.get('open') === '1';
  }

  function writeUrl() {
    var params = new URLSearchParams();
    if (state.type !== 'all') params.set('type', state.type);
    if (state.region !== 'all') params.set('region', state.region);
    if (state.open) params.set('open', '1');
    var query = params.toString();
    try {
      history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    } catch (err) {
      /* history can be blocked (file://, sandbox): filters still work */
    }
  }

  /* ------------------------------ favourites (browser only for now) ------------------------------ */

  function readFavs() {
    try {
      var raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw.map(String) : []);
    } catch (err) {
      return new Set();
    }
  }

  function saveFavs() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs)));
    } catch (err) {
      console.error('shops favourites storage failed:', err);
    }
  }

  var favs = readFavs();

  function paintFav(btn, on) {
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', t(on ? 'shops.favRemove' : 'shops.favAdd'));
  }

  function paintFavs() {
    cards.forEach(function (card) {
      var btn = card.querySelector('[data-role="fav"]');
      if (btn) paintFav(btn, favs.has(card.dataset.id));
    });
  }

  /* ------------------------------ rendering ------------------------------ */

  function matches(card) {
    var type = card.dataset.type;
    if (state.type !== 'all' && type !== state.type && type !== 'restaurant-cafe') return false;
    if (state.region !== 'all' && card.dataset.region !== state.region) return false;
    if (state.open && card.dataset.open !== '1') return false;
    return true;
  }

  function showEmpty(show) {
    if (!show) {
      stateBox.hidden = true;
      return;
    }
    stateTitle.textContent = t('shops.empty');
    stateSub.textContent = t('shops.emptySub');
    stateBox.hidden = false;
  }

  function renderCards() {
    var visible = 0;
    cards.forEach(function (card) {
      var show = matches(card);
      card.hidden = !show;
      if (show) visible++;
    });
    showEmpty(visible === 0);
  }

  // shop names come in both languages from the server (data-name-ar / data-name-en)
  function paintNames() {
    var lang = currentLang();
    cards.forEach(function (card) {
      var link = card.querySelector('[data-name-ar]');
      if (!link) return;
      var name = lang === 'ar' ? link.dataset.nameAr || link.dataset.nameEn : link.dataset.nameEn || link.dataset.nameAr;
      link.textContent = name;
    });
  }

  function syncFilterUI() {
    var isAll = state.type === 'all' && state.region === 'all' && !state.open;
    allChip.classList.toggle('is-active', isAll);
    allChip.setAttribute('aria-pressed', isAll ? 'true' : 'false');

    openChip.classList.toggle('is-active', state.open);
    openChip.setAttribute('aria-pressed', state.open ? 'true' : 'false');

    typeItems.forEach(function (item) {
      var on = item.dataset.shopsType === state.type;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    regionItems.forEach(function (item) {
      var on = item.dataset.shopsRegion === state.region;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    var typeActive = state.type !== 'all';
    typeBtn.classList.toggle('is-active', typeActive);
    typeLabel.textContent = typeActive ? t(TYPE_FILTERS[state.type]) : t('shops.filterCategory');

    var regionActive = state.region !== 'all';
    regionBtn.classList.toggle('is-active', regionActive);
    regionLabel.textContent = regionActive ? t(state.region) : t('AllRegions');
  }

  /* ------------------------------ events ------------------------------ */

  // patch: any of { type, region, open }. Re-renders only when something really changed.
  function apply(patch) {
    var changed = false;
    Object.keys(patch).forEach(function (key) {
      if (state[key] !== patch[key]) {
        state[key] = patch[key];
        changed = true;
      }
    });
    if (!changed) return;
    syncFilterUI();
    renderCards();
    writeUrl();
  }

  // one delegated listener for every filter control (chips, dropdown items, sidebar types)
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-shops-all],[data-shops-type],[data-shops-open],[data-shops-region]');
    if (!el) return;

    if (el.hasAttribute('data-shops-all')) {
      apply({ type: 'all', region: 'all', open: false });
    } else if (el.hasAttribute('data-shops-open')) {
      apply({ open: !state.open });
    } else if (el.hasAttribute('data-shops-type')) {
      var type = el.dataset.shopsType;
      if (type !== 'all' && !TYPE_FILTERS[type]) return;
      // sidebar shortcuts toggle: a second click on the active type clears it
      var toggle = el.classList.contains('shops-popular__item') && type === state.type;
      apply({ type: toggle ? 'all' : type });
    } else {
      var region = el.dataset.shopsRegion;
      if (region !== 'all' && !isRegionCode(region)) return;
      apply({ region: region });
    }
  });

  list.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-role="fav"]');
    if (!btn) return;
    var id = btn.closest('[data-shop]').dataset.id;
    var on = !favs.has(id);
    if (on) favs.add(id);
    else favs.delete(id);
    saveFavs();
    paintFav(btn, on);
  });

  // Language switch: i18n.js translates every data-i18n text; this refreshes what it does not know about
  var lastLang = currentLang();
  new MutationObserver(function () {
    var lang = currentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    paintNames();
    paintFavs();
    syncFilterUI();
    if (!stateBox.hidden) showEmpty(true);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  readUrl();
  paintNames();
  paintFavs();
  syncFilterUI();
  renderCards();
})();