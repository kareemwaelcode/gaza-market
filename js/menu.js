'use strict';

(function () {
  var root = document.getElementById('shopPage');
  if (!root) return;

  var api = window.GMShops;

  var headEl = document.getElementById('shopHead');
  var avatarEl = document.getElementById('shopAvatar');
  var nameEl = document.getElementById('shopName');
  var statusEl = document.getElementById('shopStatus');
  var statusTextEl = document.getElementById('shopStatusText');
  var whereEl = document.getElementById('shopWhere');
  var whereTextEl = document.getElementById('shopWhereText');
  var waBtn = document.getElementById('shopWa');
  var callBtn = document.getElementById('shopCall');
  var skeletonEl = document.getElementById('shopSkeleton');
  var stateEl = document.getElementById('shopState');
  var stateTitleEl = document.getElementById('shopStateTitle');
  var stateSubEl = document.getElementById('shopStateSub');
  var retryBtn = document.getElementById('shopRetry');
  var menuSection = document.getElementById('menu');
  var toolbarEl = document.getElementById('shopToolbar');
  var searchEl = document.getElementById('shopSearch');
  var gridEl = document.getElementById('shopMenuGrid');
  var emptyEl = document.getElementById('shopMenuEmpty');
  var emptyTitleEl = document.getElementById('shopMenuEmptyTitle');
  var emptySubEl = document.getElementById('shopMenuEmptySub');

  var FOOD_TYPES = ['restaurant', 'cafe', 'restaurant-cafe'];
  var SLUG_RE = /^[a-z0-9-]{1,80}$/i;
  var SEARCH_DELAY_MS = 120;

  var ICONS = {
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>'
  };

  var state = { place: null, menu: null, term: '', searchTimer: 0 };
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function t(key) {
    return typeof i18n !== 'undefined' && i18n.t ? i18n.t(key) : key;
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar';
  }

  function icon(name, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'shops-icon');
    svg.setAttribute('width', String(size || 18));
    svg.setAttribute('height', String(size || 18));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = ICONS[name] || ICONS.utensils;
    return svg;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function isFood(place) {
    return !!place && FOOD_TYPES.indexOf(place.type) !== -1;
  }

  function itemIconName() {
    return state.place && state.place.type === 'cafe' ? 'coffee' : 'utensils';
  }

  function placeName(place) {
    var ar = place.name_ar;
    var en = place.name_en;
    return currentLang() === 'ar' ? ar || en : en || ar;
  }

  function formatPrice(value) {
    return Number(value).toFixed(2);
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
  }

  function slugFromUrl() {
    try {
      var id = new URLSearchParams(window.location.search).get('id');
      return id && SLUG_RE.test(id) ? id : '';
    } catch (err) {
      return '';
    }
  }

  function show(node, on) {
    if (node) node.hidden = !on;
  }

  function setLoading(on) {
    if (on) root.setAttribute('aria-busy', 'true');
    else root.removeAttribute('aria-busy');
    show(skeletonEl, on);
  }

  function showState(titleKey, subKey, canRetry) {
    stateTitleEl.textContent = t(titleKey);
    stateSubEl.textContent = t(subKey);
    show(retryBtn, !!canRetry);
    show(stateEl, true);
    stateEl.dataset.titleKey = titleKey;
    stateEl.dataset.subKey = subKey;
  }

  function hideAll() {
    show(headEl, false);
    show(stateEl, false);
    show(menuSection, false);
  }

  function renderHead() {
    var place = state.place;
    if (!place) return;
    var name = placeName(place);
    nameEl.textContent = name;
    document.title = name + ' | ' + t('shop.siteName');

    avatarEl.textContent = '';
    if (place.image_url) {
      var img = document.createElement('img');
      img.src = place.image_url;
      img.alt = '';
      img.width = 72;
      img.height = 72;
      img.decoding = 'async';
      img.addEventListener('error', function () {
        avatarEl.textContent = '';
        avatarEl.appendChild(icon(itemIconName(), 30));
      });
      avatarEl.appendChild(img);
    } else {
      avatarEl.appendChild(icon(itemIconName(), 30));
    }

    statusEl.classList.toggle('is-open', place.is_open);
    statusEl.classList.toggle('is-closed', !place.is_open);
    statusTextEl.textContent = t(place.is_open ? 'shop.openNow' : 'stores.closed');

    var parts = [];
    if (place.region) parts.push(t(place.region));
    var address = currentLang() === 'ar' ? place.address_ar : place.address_en;
    if (address) parts.push(address);
    whereTextEl.textContent = parts.join(' · ');
    show(whereEl, parts.length > 0);

    if (place.whatsapp) {
      waBtn.href = 'https://wa.me/' + place.whatsapp;
      show(waBtn, true);
    } else {
      show(waBtn, false);
    }
    if (place.phone) {
      callBtn.href = 'tel:+' + place.phone;
      show(callBtn, true);
    } else {
      show(callBtn, false);
    }
    show(headEl, true);
  }

  function groupMenu() {
    var menu = state.menu;
    var tokens = normalizeText(state.term).split(/\s+/).filter(Boolean);
    var groups = menu.categories.map(function (cat) {
      return { id: cat.id, name: cat.name, items: [] };
    });
    var byId = {};
    groups.forEach(function (g) { byId[g.id] = g; });
    var other = { id: '_other', name: t('shop.otherItems'), items: [] };

    menu.items.forEach(function (item) {
      var group = item.categoryId && byId[item.categoryId] ? byId[item.categoryId] : other;
      if (tokens.length) {
        var haystack = normalizeText(item.name + ' ' + group.name);
        for (var i = 0; i < tokens.length; i++) {
          if (haystack.indexOf(tokens[i]) === -1) return;
        }
      }
      group.items.push(item);
    });
    groups.push(other);
    return groups.filter(function (g) { return g.items.length > 0; });
  }

  function itemImageSources(item) {
    var list = [];
    if (item.image) list.push(item.image);
    if (state.place && state.place.image_url && state.place.image_url !== item.image) list.push(state.place.image_url);
    return list;
  }

  function fillThumb(thumb, sources) {
    var src = sources.shift();
    thumb.textContent = '';
    if (!src) {
      thumb.classList.add('is-empty');
      return;
    }
    var img = document.createElement('img');
    img.alt = '';
    img.width = 64;
    img.height = 64;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', function () { fillThumb(thumb, sources); });
    img.src = src;
    thumb.appendChild(img);
  }

  function buildItem(item) {
    var row = el('li', 'shop-item' + (item.available ? '' : ' is-unavailable'));
    var thumb = el('span', 'shop-item__thumb');
    fillThumb(thumb, itemImageSources(item));
    row.appendChild(thumb);

    var info = el('span', 'shop-item__info');
    info.appendChild(el('span', 'shop-item__name', item.name));
    if (!item.available) info.appendChild(el('span', 'shop-item__badge', t('shop.unavailable')));
    row.appendChild(info);

    if (item.price !== null) {
      var price = el('span', 'shop-item__price');
      price.setAttribute('dir', 'ltr');
      price.appendChild(document.createTextNode(formatPrice(item.price) + ' '));
      price.appendChild(el('span', 'shop-item__cur', '₪'));
      row.appendChild(price);
    }
    return row;
  }

  function renderMenu() {
    if (!state.menu) return;
    var hasAny = state.menu.items.length > 0;
    var groups = hasAny ? groupMenu() : [];

    gridEl.textContent = '';
    show(toolbarEl, hasAny);

    if (!hasAny) {
      emptyTitleEl.textContent = t('shop.noMenu');
      emptySubEl.textContent = t('shop.noMenuSub');
      show(emptyEl, true);
      show(gridEl, false);
      return;
    }

    if (!groups.length) {
      emptyTitleEl.textContent = t('shop.noResults');
      emptySubEl.textContent = t('shop.noResultsSub');
      show(emptyEl, true);
      show(gridEl, false);
      return;
    }

    show(emptyEl, false);
    show(gridEl, true);

    groups.forEach(function (group) {
      var section = el('section', 'shop-cat');
      section.id = 'shop-cat-' + group.id;
      section.dataset.cat = group.id;
      section.appendChild(el('h2', 'shop-cat__title', group.name));
      var list = el('ul', 'shop-cat__list');
      group.items.forEach(function (item) { list.appendChild(buildItem(item)); });
      section.appendChild(list);
      gridEl.appendChild(section);
    });
  }

  function renderPlaceholderForType() {
    state.menu = { categories: [], items: [] };
    show(menuSection, true);
    show(toolbarEl, false);
    show(gridEl, false);
    emptyTitleEl.textContent = t('shop.soonTitle');
    emptySubEl.textContent = t('shop.soonSub');
    show(emptyEl, true);
  }

  function load() {
    var slug = slugFromUrl();
    hideAll();
    if (!slug) {
      setLoading(false);
      showState('shop.notFound', 'shop.notFoundSub', false);
      return;
    }
    if (!api || typeof api.getPlace !== 'function') {
      setLoading(false);
      showState('shop.loadError', 'shop.loadErrorSub', true);
      return;
    }

    setLoading(true);
    api.getPlace(slug).then(function (place) {
      state.place = place;
      if (!isFood(place)) return null;
      if (!place.has_menu) return { categories: [], items: [] };
      return api.getMenu(slug);
    }).then(function (menu) {
      setLoading(false);
      renderHead();
      if (menu) {
        state.menu = menu;
        show(menuSection, true);
        renderMenu();
      } else {
        renderPlaceholderForType();
      }
    }).catch(function (err) {
      setLoading(false);
      hideAll();
      if (err && err.code === 'not_found') showState('shop.notFound', 'shop.notFoundSub', false);
      else showState('shop.loadError', 'shop.loadErrorSub', true);
    });
  }

  searchEl.addEventListener('input', function () {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(function () {
      state.term = searchEl.value || '';
      renderMenu();
    }, SEARCH_DELAY_MS);
  });

  retryBtn.addEventListener('click', load);

  var lastLang = currentLang();
  new MutationObserver(function () {
    var lang = currentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    if (state.place) renderHead();
    if (state.menu && isFood(state.place)) renderMenu();
    if (!stateEl.hidden && stateEl.dataset.titleKey) {
      stateTitleEl.textContent = t(stateEl.dataset.titleKey);
      stateSubEl.textContent = t(stateEl.dataset.subKey);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  if (document.readyState === 'complete') load();
  else document.addEventListener('DOMContentLoaded', load);
})();