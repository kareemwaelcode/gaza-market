'use strict';

(function () {
  var list = document.getElementById('shopsGrid');
  if (!list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll('[data-shop]'));
  var skeleton = document.getElementById('shopsSkeleton');
  var stateBox = document.getElementById('shopsState');
  var stateTitle = document.getElementById('shopsStateTitle');
  var stateSub = document.getElementById('shopsStateSub');
  var resetBtn = document.getElementById('shopsReset');
  var addBtn = document.getElementById('shopsAdd');
  var countEl = document.getElementById('shopsCount');
  var typeBtn = document.getElementById('shopsTypeBtn');
  var typeLabel = document.getElementById('shopsTypeLabel');
  var regionBtn = document.getElementById('shopsRegionBtn');
  var regionLabel = document.getElementById('shopsRegionLabel');
  var allChip = document.querySelector('[data-shops-all]');
  var openChip = document.querySelector('[data-shops-open]');
  var clearChip = document.getElementById('shopsClear');
  var typeItems = Array.prototype.slice.call(document.querySelectorAll('[data-shops-type]'));
  var regionItems = Array.prototype.slice.call(document.querySelectorAll('[data-shops-region]'));

  var TYPE_FILTERS = {
    'restaurant': 'shops.filterRestaurants',
    'cafe': 'shops.filterCafes',
    'restaurant-cafe': 'typeRestCafe',
    'workspace': 'shops.filterWorkspaces',
    'supermarket': 'shops.filterSupermarkets',
    'pharmacy': 'shops.filterPharmacy',
    'misc': 'shops.filterMisc'
  };

  var FAV_KEY = 'gm_shops_favs_v1';
  var FALLBACK_IMG = 'assets/img/shop-placeholder.svg';
  var EAGER_COUNT = 4;
  var LOAD_TIMEOUT_MS = 1500;
  var STAGGER_MS = 60;
  var STAGGER_MAX = 8;

  var state = { type: 'all', region: 'all', open: false };
  var visibleCount = cards.length;
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function t(key) {
    return typeof i18n !== 'undefined' && i18n.t ? i18n.t(key) : key;
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar';
  }

  function isTypeFilter(type) {
    return Object.prototype.hasOwnProperty.call(TYPE_FILTERS, type);
  }

  function isRegionCode(code) {
    return regionItems.some(function (item) { return item.dataset.shopsRegion === code; });
  }

  function toRegionCode(raw) {
    if (!raw) return null;
    var code = typeof window.gmNormalizeRegionKey === 'function' ? window.gmNormalizeRegionKey(raw) : raw;
    return isRegionCode(code) ? code : null;
  }

  function savedRegion() {
    var raw = '';
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
    var saved = savedRegion();
    if (saved) state.region = saved;

    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (err) {
      return;
    }
    var type = params.get('type');
    var region = params.get('region');
    var areaCode = toRegionCode(params.get('area'));
    if (type && isTypeFilter(type)) state.type = type;
    if (areaCode) state.region = areaCode;
    else if (region === 'all') state.region = 'all';
    else if (region && isRegionCode(region)) state.region = region;
    state.open = params.get('open') === '1';
  }

  function writeUrl() {
    var params = new URLSearchParams();
    if (state.type !== 'all') params.set('type', state.type);
    if (state.region !== 'all') params.set('region', state.region);
    else if (savedRegion()) params.set('region', 'all');
    if (state.open) params.set('open', '1');
    var query = params.toString();
    try {
      history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    } catch (err) {
      console.error('shops url sync failed:', err);
    }
  }

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

  function typeMatches(cardType) {
    if (state.type === 'misc') return true;
    if (cardType === state.type) return true;
    return cardType === 'restaurant-cafe' && (state.type === 'restaurant' || state.type === 'cafe');
  }

  function matches(card) {
    if (state.type !== 'all' && !typeMatches(card.dataset.type)) return false;
    if (state.region !== 'all' && card.dataset.region !== state.region) return false;
    if (state.open && card.dataset.open !== '1') return false;
    return true;
  }

  function paintCount() {
    if (!countEl) return;
    countEl.textContent = t('shops.count').replace('{n}', String(visibleCount));
  }

  function categoryHasShops() {
    return cards.some(function (card) { return typeMatches(card.dataset.type); });
  }

  function showEmpty(show) {
    if (!show) {
      stateBox.hidden = true;
      return;
    }
    var categoryEmpty = state.type !== 'all' && !categoryHasShops();
    stateTitle.textContent = t(categoryEmpty ? 'shops.emptyCategory' : 'shops.empty');
    stateSub.textContent = t(categoryEmpty ? 'shops.emptyCategorySub' : 'shops.emptySub');
    if (resetBtn) resetBtn.hidden = !hasActiveFilters();
    if (addBtn) addBtn.hidden = false;
    stateBox.hidden = false;
  }

  function playEnter(shown) {
    if (reduceMotion.matches) return;
    shown.forEach(function (card, index) {
      card.classList.remove('is-entering');
      card.style.setProperty('--enter-delay', Math.min(index, STAGGER_MAX) * STAGGER_MS + 'ms');
    });
    void list.offsetWidth;
    shown.forEach(function (card) { card.classList.add('is-entering'); });
  }

  function renderCards(animate) {
    var shown = [];
    cards.forEach(function (card) {
      var show = matches(card);
      card.hidden = !show;
      if (show) shown.push(card);
    });
    visibleCount = shown.length;
    paintCount();
    showEmpty(visibleCount === 0);
    if (animate) playEnter(shown);
  }

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
    var isAll = !hasActiveFilters();
    allChip.classList.toggle('is-active', isAll);
    allChip.setAttribute('aria-pressed', isAll ? 'true' : 'false');

    if (clearChip) clearChip.hidden = isAll;

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
    renderCards(true);
    writeUrl();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-shops-all],[data-shops-type],[data-shops-open],[data-shops-region]');
    if (!el) return;

    if (el.hasAttribute('data-shops-all')) {
      apply({ type: 'all', region: 'all', open: false });
    } else if (el.hasAttribute('data-shops-open')) {
      apply({ open: !state.open });
    } else if (el.hasAttribute('data-shops-type')) {
      var type = el.dataset.shopsType;
      if (type !== 'all' && !isTypeFilter(type)) return;
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

  list.addEventListener('animationend', function (e) {
    if (e.target.classList && e.target.classList.contains('is-entering')) {
      e.target.classList.remove('is-entering');
    }
  });

  function watchImage(img) {
    var media = img.closest('.shops-card__media');
    if (!media) return;

    function settle() {
      media.classList.remove('is-loading');
    }

    function fallback() {
      if (img.getAttribute('src') !== FALLBACK_IMG) {
        img.src = FALLBACK_IMG;
      } else {
        settle();
      }
    }

    img.addEventListener('load', settle);
    img.addEventListener('error', fallback);

    if (!img.complete) {
      media.classList.add('is-loading');
    } else if (img.naturalWidth === 0) {
      fallback();
    }
  }

  function setLoading(on) {
    if (on) list.setAttribute('aria-busy', 'true');
    else list.removeAttribute('aria-busy');
    if (skeleton) skeleton.hidden = !on;
  }

  function whenFirstImagesSettle(done) {
    var pending = cards.slice(0, EAGER_COUNT)
      .map(function (card) { return card.querySelector('.shops-card__img'); })
      .filter(function (img) { return img && !img.complete; });

    var finished = false;
    var left = pending.length;

    function finish() {
      if (finished) return;
      finished = true;
      done();
    }

    function step() {
      left -= 1;
      if (left <= 0) finish();
    }

    if (!left) {
      finish();
      return;
    }

    pending.forEach(function (img) {
      img.addEventListener('load', step, { once: true });
      img.addEventListener('error', step, { once: true });
    });
    window.setTimeout(finish, LOAD_TIMEOUT_MS);
  }

  var lastLang = currentLang();
  new MutationObserver(function () {
    var lang = currentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    paintNames();
    paintFavs();
    syncFilterUI();
    paintCount();
    if (!stateBox.hidden) showEmpty(true);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  window.GMShopsUI = { setLoading: setLoading };

  function boot() {
    readUrl();
    paintNames();
    paintFavs();
    syncFilterUI();
    renderCards(false);

    cards.forEach(function (card) {
      var img = card.querySelector('.shops-card__img');
      if (img) watchImage(img);
    });

    whenFirstImagesSettle(function () {
      setLoading(false);
      renderCards(true);
    });
  }

  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();