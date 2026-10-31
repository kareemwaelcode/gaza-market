'use strict';

(function () {
  const section = document.getElementById('marketDetails');
  if (!section) return;

  const api = window.GMMarket;
  const skeleton = document.getElementById('marketDetailsSkeleton');
  const body = document.getElementById('marketDetailsBody');
  const stateBox = document.getElementById('marketDetailsState');
  const stateTitle = document.getElementById('marketDetailsStateTitle');
  const stateSub = document.getElementById('marketDetailsStateSub');
  const retryBtn = document.getElementById('marketDetailsRetry');
  const backLink = document.getElementById('marketBack');
  const pending = document.getElementById('marketPending');
  const galleryEl = document.getElementById('marketGallery');
  const stage = document.getElementById('marketStage');
  const stageImg = document.getElementById('marketStageImg');
  const placeholder = document.getElementById('marketPh');
  const placeholderText = document.getElementById('marketPhText');
  const thumbs = document.getElementById('marketThumbs');
  const prevBtn = document.getElementById('marketPrev');
  const nextBtn = document.getElementById('marketNext');
  const counter = document.getElementById('marketCounter');
  const condEl = document.getElementById('marketCond');
  const catEl = document.getElementById('marketCat');
  const titleEl = document.getElementById('marketDetailsTitle');
  const amountEl = document.getElementById('marketAmount');
  const negoEl = document.getElementById('marketNego');
  const regionEl = document.getElementById('marketRegion');
  const postedEl = document.getElementById('marketPosted');
  const callBtn = document.getElementById('marketCall');
  const callNum = document.getElementById('marketCallNum');
  const waBtn = document.getElementById('marketWa');
  const saveBtn = document.getElementById('marketSave');
  const saveText = document.getElementById('marketSaveText');
  const shareBtn = document.getElementById('marketShare');
  const descEl = document.getElementById('marketDesc');
  const sellerAvatar = document.getElementById('marketSellerAvatar');
  const sellerName = document.getElementById('marketSellerName');
  const sellerSince = document.getElementById('marketSellerSince');
  const similarSection = document.getElementById('marketSimilar');
  const similarGrid = document.getElementById('marketSimilarGrid');
  const toast = document.getElementById('marketToast');

  const LIST_PAGE = 'market.html';
  const DETAILS_PAGE = 'market-details.html';
  const ID_RE = /^[\w-]{1,64}$/;
  const SIMILAR_LIMIT = 8;
  const SWIPE_PX = 40;
  const TOAST_MS = 2400;
  const MONTH_SECONDS = 30 * 86400;
  const DEFAULT_COUNTRY_CODE = '970';

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

  const SVG_OPEN = '<svg class="places-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  const ICONS = {
    pin: SVG_OPEN + '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: SVG_OPEN + '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    image: SVG_OPEN + '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
    placeholder: SVG_OPEN.replace('width="14" height="14"', 'width="40" height="40"').replace('stroke-width="2"', 'stroke-width="1.5"') + '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
  };

  const iconTpl = document.createElement('template');
  const iconCache = {};
  const itemOf = new WeakMap();
  const gallery = { images: [], index: 0 };
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  let item = null;
  let similarItems = [];
  let loadSeq = 0;
  let stateKind = null;
  let toastTimer = 0;
  let swipe = null;

  function t(key) {
    return typeof i18n !== 'undefined' && i18n.t ? i18n.t(key) : key;
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar';
  }

  function isRtl() {
    return currentLang() === 'ar';
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

  function requireAuth(action) {
    if (typeof gmRequireAuthThenRun === 'function') gmRequireAuthThenRun(action);
    else action();
  }

  function regionName(code) {
    const translated = typeof i18n !== 'undefined' ? i18n.t(code) : code;
    if (translated !== code) return translated;
    if (!window.GMRegions) return code;
    return window.GMRegions.label(code, currentLang());
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
    const rtf = new Intl.RelativeTimeFormat(currentLang(), { numeric: 'auto' });
    if (abs < 60) return rtf.format(0, 'second');
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < MONTH_SECONDS) return rtf.format(Math.round(diff / 86400), 'day');
    return new Date(ms).toLocaleDateString(currentLang());
  }

  function monthYear(iso) {
    const ms = Date.parse(iso);
    if (!isFinite(ms)) return '';
    return new Date(ms).toLocaleDateString(currentLang(), { year: 'numeric', month: 'long' });
  }

  function phoneHref(raw) {
    const value = String(raw || '').replace(/[^\d+]/g, '');
    return value.replace(/\+/g, '').length >= 9 ? 'tel:' + value : '';
  }

  function whatsappDigits(raw) {
    let digits = String(raw || '').replace(/\D/g, '');
    if (digits.indexOf('00') === 0) digits = digits.slice(2);
    else if (digits.charAt(0) === '0') digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
    return digits.length >= 9 && digits.length <= 15 ? digits : '';
  }

  function paintTexts(root) {
    root.querySelectorAll('[data-t]').forEach(function (node) {
      node.textContent = t(node.dataset.t);
    });
  }

  function showToast(key) {
    toast.textContent = t(key);
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, TOAST_MS);
  }

  function setView(view) {
    skeleton.hidden = view !== 'loading';
    body.hidden = view !== 'content';
    stateBox.hidden = view !== 'state';
    section.setAttribute('aria-busy', view === 'loading' ? 'true' : 'false');
    if (view !== 'content') similarSection.hidden = true;
  }

  function paintState() {
    if (!stateKind) return;
    const missing = stateKind === 'notfound';
    stateTitle.textContent = t(missing ? 'marketDetails.notFoundTitle' : 'marketDetails.errorTitle');
    stateSub.textContent = t(missing ? 'marketDetails.notFoundSub' : 'marketDetails.errorSub');
    retryBtn.hidden = missing;
  }

  function showState(kind) {
    stateKind = kind;
    paintState();
    setView('state');
  }

  function stepGallery(direction) {
    const total = gallery.images.length;
    if (total < 2) return;
    showImage(gallery.index + direction);
  }

  function showImage(index) {
    const total = gallery.images.length;
    if (!total) {
      stageImg.hidden = true;
      stageImg.removeAttribute('src');
      placeholderText.textContent = t('marketDetails.noPhotos');
      placeholder.hidden = false;
      stage.classList.remove('is-loading');
      return;
    }

    gallery.index = ((index % total) + total) % total;
    placeholder.hidden = true;
    stageImg.hidden = false;
    stage.classList.add('is-loading');
    stageImg.alt = item ? item.title : '';
    stageImg.src = gallery.images[gallery.index];

    Array.prototype.forEach.call(thumbs.children, function (thumb, i) {
      const on = i === gallery.index;
      thumb.classList.toggle('is-active', on);
      if (on) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });

    paintCounter();

    if (total > 1) {
      const upcoming = new Image();
      upcoming.src = gallery.images[(gallery.index + 1) % total];
    }
  }

  function paintCounter() {
    const total = gallery.images.length;
    counter.textContent = (gallery.index + 1) + ' / ' + total;
    counter.setAttribute('aria-label', t('marketDetails.photoOf').replace('{n}', String(gallery.index + 1)).replace('{total}', String(total)));
  }

  function paintGalleryLabels() {
    galleryEl.setAttribute('aria-label', t('marketDetails.gallery'));
    prevBtn.setAttribute('aria-label', t('marketDetails.prev'));
    nextBtn.setAttribute('aria-label', t('marketDetails.next'));
    Array.prototype.forEach.call(thumbs.children, function (thumb, i) {
      thumb.setAttribute('aria-label', t('marketDetails.thumb').replace('{n}', String(i + 1)));
    });
    if (!gallery.images.length) placeholderText.textContent = t('marketDetails.noPhotos');
    if (gallery.images.length > 1) paintCounter();
  }

  function setupGallery(images) {
    gallery.images = images;
    gallery.index = 0;
    thumbs.replaceChildren();

    const many = images.length > 1;
    galleryEl.classList.toggle('is-single', !many);
    thumbs.hidden = !many;
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;
    counter.hidden = !many;

    if (many) {
      const frag = document.createDocumentFragment();
      images.forEach(function (src, i) {
        const thumb = el('button', 'market-gallery__thumb');
        thumb.type = 'button';
        thumb.dataset.index = String(i);
        const img = el('img', 'market-gallery__thumb-img');
        img.alt = '';
        img.width = 84;
        img.height = 63;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = src;
        thumb.appendChild(img);
        frag.appendChild(thumb);
      });
      thumbs.appendChild(frag);
    }

    paintGalleryLabels();
    showImage(0);
  }

  function paintSave() {
    const on = !!(item && item.is_saved);
    saveBtn.classList.toggle('is-on', on);
    saveBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    saveText.textContent = t(on ? 'marketDetails.saved' : 'marketDetails.save');
  }

  function paintContact() {
    const tel = phoneHref(item.phone);
    callBtn.hidden = !tel;
    if (tel) {
      callBtn.href = tel;
      callNum.textContent = item.phone;
    }

    const digits = whatsappDigits(item.whatsapp);
    waBtn.hidden = !digits;
    if (digits) {
      const text = t('marketDetails.waMessage').replace('{title}', item.title);
      waBtn.href = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
    }
  }

  function paintSeller() {
    const name = item.seller && item.seller.name ? item.seller.name : t('marketDetails.sellerFallback');
    sellerName.textContent = name;
    sellerAvatar.replaceChildren();
    const avatarUrl = item.seller ? item.seller.avatar : null;
    if (avatarUrl) {
      const img = el('img', 'market-seller__img');
      img.alt = '';
      img.width = 44;
      img.height = 44;
      img.decoding = 'async';
      img.addEventListener('error', function () {
        img.remove();
        sellerAvatar.textContent = Array.from(name)[0] || '';
      }, { once: true });
      img.src = avatarUrl;
      sellerAvatar.appendChild(img);
    } else {
      sellerAvatar.textContent = Array.from(name)[0] || '';
    }

    const since = item.seller ? monthYear(item.seller.member_since) : '';
    sellerSince.hidden = !since;
    sellerSince.textContent = since ? t('marketDetails.memberSince').replace('{date}', since) : '';
  }

  function paint() {
    if (!item) return;

    paintTexts(body);

    condEl.className = 'market-details__cond market-cond--' + item.condition;
    condEl.textContent = t(CONDITION_KEYS[item.condition] || CONDITION_KEYS['new']);
    catEl.textContent = t(CATEGORY_KEYS[item.category] || CATEGORY_KEYS.other);
    titleEl.textContent = item.title;

    if (item.price === null) {
      amountEl.textContent = t('market.noPrice');
      amountEl.classList.add('market-details__amount--none');
    } else {
      amountEl.textContent = formatPrice(item.price);
      amountEl.classList.remove('market-details__amount--none');
    }
    negoEl.hidden = !item.negotiable;

    const regionText = item.region ? regionName(item.region) : '';
    regionEl.parentNode.hidden = !regionText;
    regionEl.textContent = regionText;

    const stamp = item.approved_at || item.created_at;
    postedEl.parentNode.hidden = !stamp;
    if (stamp) {
      postedEl.textContent = relativeTime(stamp);
      postedEl.title = new Date(stamp).toLocaleString(currentLang());
    }

    descEl.textContent = item.description;
    pending.hidden = item.status !== 'pending';
    paintContact();
    paintSeller();
    paintSave();
    paintGalleryLabels();
    document.title = t('marketDetails.docTitle').replace('{title}', item.title);
  }

  function render() {
    const isPending = item.status === 'pending';
    saveBtn.hidden = isPending;
    shareBtn.hidden = isPending;
    paint();
    setupGallery(item.images);
  }

  function createSimilarCard(entry) {
    const col = el('div', 'col-12 col-sm-6 col-lg-4 col-xxl-3');
    col.setAttribute('data-listing', '');
    itemOf.set(col, entry);

    const article = el('article', 'places-card market-card');
    const media = el('div', 'places-card__media market-card__media');
    const ph = el('span', 'market-card__ph');
    ph.appendChild(icon('placeholder'));
    media.appendChild(ph);

    if (entry.images.length) {
      const img = el('img', 'places-card__img');
      img.alt = '';
      img.width = 400;
      img.height = 250;
      img.loading = 'lazy';
      img.decoding = 'async';
      media.classList.add('is-loading');
      img.addEventListener('load', function () { media.classList.remove('is-loading'); }, { once: true });
      img.addEventListener('error', function () {
        media.classList.remove('is-loading');
        img.remove();
      }, { once: true });
      img.src = entry.images[0];
      media.appendChild(img);
    }

    const cond = el('span', 'places-card__status market-cond market-cond--' + entry.condition);
    cond.dataset.t = CONDITION_KEYS[entry.condition] || CONDITION_KEYS['new'];
    media.appendChild(cond);

    if (entry.images.length > 1) {
      const count = el('span', 'market-card__count');
      count.setAttribute('data-role', 'count');
      count.appendChild(icon('image'));
      count.appendChild(document.createTextNode(String(entry.images.length)));
      media.appendChild(count);
    }

    const cardBody = el('div', 'places-card__body');
    const category = el('span', 'places-card__type');
    category.setAttribute('data-role', 'cat');

    const heading = el('h3', 'places-card__name');
    const link = el('a', 'places-card__link');
    link.href = DETAILS_PAGE + '?id=' + encodeURIComponent(entry.listing_id);
    link.textContent = entry.title;
    heading.appendChild(link);

    const price = el('p', 'market-card__price');
    const amount = el('span', 'market-card__amount');
    amount.setAttribute('data-role', 'amount');
    price.appendChild(amount);
    if (entry.negotiable) {
      const nego = el('span', 'market-card__nego');
      nego.dataset.t = 'addListing.negotiable';
      price.appendChild(nego);
    }

    const meta = el('div', 'market-card__meta');
    ['where:pin', 'when:clock'].forEach(function (pair) {
      const parts = pair.split(':');
      const node = el('span', 'market-card__meta-item');
      node.setAttribute('data-role', parts[0]);
      node.appendChild(icon(parts[1]));
      node.appendChild(document.createElement('span'));
      meta.appendChild(node);
    });

    cardBody.appendChild(category);
    cardBody.appendChild(heading);
    cardBody.appendChild(price);
    cardBody.appendChild(meta);
    article.appendChild(media);
    article.appendChild(cardBody);
    col.appendChild(article);
    paintSimilarCard(col);
    return col;
  }

  function paintSimilarCard(col) {
    const entry = itemOf.get(col);
    if (!entry) return;

    paintTexts(col);
    col.querySelector('[data-role="cat"]').textContent = t(CATEGORY_KEYS[entry.category] || CATEGORY_KEYS.other);

    const amount = col.querySelector('[data-role="amount"]');
    amount.classList.toggle('market-card__amount--none', entry.price === null);
    amount.textContent = entry.price === null ? t('market.noPrice') : formatPrice(entry.price);

    const regionText = entry.region ? regionName(entry.region) : '';
    const where = col.querySelector('[data-role="where"]');
    where.hidden = !regionText;
    where.querySelector('span').textContent = regionText;

    const stamp = entry.approved_at || entry.created_at;
    const when = col.querySelector('[data-role="when"]');
    when.hidden = !stamp;
    if (stamp) {
      when.querySelector('span').textContent = relativeTime(stamp);
      when.title = new Date(stamp).toLocaleString(currentLang());
    }

    const count = col.querySelector('[data-role="count"]');
    if (count) count.setAttribute('aria-label', t('market.photos').replace('{n}', String(entry.images.length)));
  }

  function renderSimilar() {
    similarGrid.replaceChildren();
    similarSection.hidden = !similarItems.length;
    if (!similarItems.length) return;
    const frag = document.createDocumentFragment();
    similarItems.forEach(function (entry) {
      frag.appendChild(createSimilarCard(entry));
    });
    similarGrid.appendChild(frag);
  }

  function loadSimilar(seq) {
    api.fetchSimilar(item.listing_id, SIMILAR_LIMIT).then(function (result) {
      if (seq !== loadSeq) return;
      similarItems = Array.isArray(result) ? result : [];
      renderSimilar();
    }).catch(function () {
      if (seq !== loadSeq) return;
      similarItems = [];
      similarSection.hidden = true;
    });
  }

  function getId() {
    try {
      return new URLSearchParams(window.location.search).get('id') || '';
    } catch (err) {
      return '';
    }
  }

  function load() {
    const seq = ++loadSeq;
    const id = getId();
    item = null;
    similarItems = [];
    similarGrid.replaceChildren();

    if (!ID_RE.test(id)) {
      showState('notfound');
      return;
    }
    if (!api) {
      showState('error');
      return;
    }

    setView('loading');
    api.fetchOne(id).then(function (data) {
      if (seq !== loadSeq) return;
      item = data;
      render();
      setView('content');
      if (item.status === 'approved') loadSimilar(seq);
    }).catch(function (err) {
      if (seq !== loadSeq) return;
      showState(err && err.code === 'not_found' ? 'notfound' : 'error');
    });
  }

  function toggleSave() {
    if (!item || !api || saveBtn.disabled) return;

    requireAuth(function () {
      const next = !item.is_saved;
      saveBtn.disabled = true;
      item.is_saved = next;
      paintSave();

      api.setSaved(item.listing_id, next).then(function (result) {
        item.is_saved = result.saved;
        paintSave();
      }).catch(function (err) {
        item.is_saved = !next;
        paintSave();
        if (err && err.code === 'unauthorized') requireAuth(function () {});
      }).then(function () {
        saveBtn.disabled = false;
      });
    });
  }

  function shareUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('id', item.listing_id);
    return url.toString();
  }

  function copyLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showToast('marketDetails.copied');
      }, function () {
        showToast('marketDetails.shareFailed');
      });
    } else {
      showToast('marketDetails.shareFailed');
    }
  }

  function share() {
    if (!item) return;
    const url = shareUrl();
    if (navigator.share) {
      navigator.share({ title: item.title, url: url }).catch(function (err) {
        if (err && err.name !== 'AbortError') copyLink(url);
      });
    } else {
      copyLink(url);
    }
  }

  function directionFor(forward) {
    const base = forward ? 1 : -1;
    return isRtl() ? -base : base;
  }

  prevBtn.addEventListener('click', function () { stepGallery(-1); });
  nextBtn.addEventListener('click', function () { stepGallery(1); });

  thumbs.addEventListener('click', function (e) {
    const thumb = e.target.closest('.market-gallery__thumb');
    if (!thumb) return;
    showImage(Number(thumb.dataset.index));
  });

  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') stepGallery(directionFor(true));
    else if (e.key === 'ArrowLeft') stepGallery(directionFor(false));
    else return;
    e.preventDefault();
  });

  stage.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary || e.target.closest('.market-gallery__nav')) return;
    swipe = { x: e.clientX, y: e.clientY };
  });

  stage.addEventListener('pointerup', function (e) {
    if (!swipe || !e.isPrimary) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    stepGallery(directionFor(dx > 0));
  });

  stage.addEventListener('pointercancel', function () { swipe = null; });

  stageImg.addEventListener('load', function () {
    stage.classList.remove('is-loading');
  });

  stageImg.addEventListener('error', function () {
    stage.classList.remove('is-loading');
    stageImg.hidden = true;
    placeholderText.textContent = t('marketDetails.imageFailed');
    placeholder.hidden = false;
  });

  saveBtn.addEventListener('click', toggleSave);
  shareBtn.addEventListener('click', share);
  retryBtn.addEventListener('click', load);

  backLink.addEventListener('click', function (e) {
    if (window.history.length < 2 || !document.referrer) return;
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin && ref.pathname.slice(-LIST_PAGE.length - 1) === '/' + LIST_PAGE) {
        e.preventDefault();
        window.history.back();
      }
    } catch (err) {
      return;
    }
  });

  let lastLang = currentLang();
  new MutationObserver(function () {
    const lang = currentLang();
    if (lang === lastLang) return;
    lastLang = lang;
    paintState();
    if (item) paint();
    Array.prototype.forEach.call(similarGrid.children, paintSimilarCard);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  function boot() {
    load();
  }

  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();