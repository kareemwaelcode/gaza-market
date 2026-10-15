/*
 * Gaza Market - dashboard core (shared by every dashboard page).
 * Constants, storage helpers, partial loader, safe-HTML/URL helpers, toast and confirm modal, icons.
 * Everything is exposed on window.GMDash. Moved verbatim from the former js/usere-dashboard.js.
 */
(function () {
  'use strict';

  var GM = window.GMDash = window.GMDash || {};

  var PROFILE_STORAGE_KEY = 'gmDashboardProfile';
  var PUBLIC_BASE_URL = 'https://gazaprice.com';
  var CURRENT_SCRIPT_URL = document.currentScript ? document.currentScript.src : null;
  var PARTIALS_BASE_URL = CURRENT_SCRIPT_URL
    ? new URL('../../dashboard-users/partials/', CURRENT_SCRIPT_URL).href
    : null;
  var DASHBOARD_USERS_BASE_URL = CURRENT_SCRIPT_URL
    ? new URL('../../dashboard-users/', CURRENT_SCRIPT_URL).href
    : null;
  var LOGO_URL = CURRENT_SCRIPT_URL
    ? new URL('../../assets/img/logo.gazamarket.2.png', CURRENT_SCRIPT_URL).href
    : '../../assets/img/logo.gazamarket.2.png';
  var PROFILE_PAGE_URL = DASHBOARD_USERS_BASE_URL
    ? new URL('profile.html', DASHBOARD_USERS_BASE_URL).href
    : 'profile.html';
  var PACKAGES_PAGE_URL = DASHBOARD_USERS_BASE_URL
    ? new URL('packages.html', DASHBOARD_USERS_BASE_URL).href
    : 'packages.html';
  var PARTIAL_CACHE_PREFIX = 'gmPartial:';
  var iconsQueued = false;
  var GAZA_TZ = 'Asia/Gaza';
  var IMAGE_MAX_FILE_BYTES = 10 * 1024 * 1024;
  var IMAGE_ALLOWED_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;
  var storageErrorShownAt = 0;

  function readPartialCache(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function writePartialCache(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (err) {}
  }

  async function loadPartial(selector, filename) {
    var host = document.querySelector(selector);
    if (!host) return;
    if (!PARTIALS_BASE_URL) {
      host.innerHTML =
        '<div style="padding:14px;font-size:12.5px;color:#d93025;">' +
        'تعذّر تحديد مسار الجزء (' + filename + '). تأكد أن core.js محمّل عبر وسم &lt;script src="..."&gt; عادي.' +
        '</div>';
      return;
    }
    var url = new URL(filename, PARTIALS_BASE_URL).href;
    var cacheKey = PARTIAL_CACHE_PREFIX + url;
    var cached = readPartialCache(cacheKey);
    if (cached !== null) {
      host.innerHTML = cached;
      fetch(url, { credentials: 'same-origin' })
        .then(function (res) { return res.ok ? res.text() : null; })
        .then(function (text) {
          if (text !== null && text !== cached) writePartialCache(cacheKey, text);
        })
        .catch(function () {});
      return;
    }
    try {
      var res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var html = await res.text();
      host.innerHTML = html;
      writePartialCache(cacheKey, html);
    } catch (err) {
      host.innerHTML =
        '<div style="padding:14px;font-size:12.5px;color:#d93025;">' +
        'تعذّر تحميل الجزء (' + url + '). تأكد من تشغيل الموقع عبر خادم ويب وليس مباشرة من الملفات.' +
        '</div>';
      console.error('Failed to load partial:', url, err);
    }
  }

  function getStoreTypeConfig() {
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.getConfig === 'function') {
      return window.GMStoreTypeConfig.getConfig();
    }
    return null;
  }

  function getFallbackAvatarLetter() {
    var config = getStoreTypeConfig();
    return (config && config.fallbackAvatarLetter) || 'م';
  }

  function getFallbackName() {
    var config = getStoreTypeConfig();
    return (config && config.pageCopy && config.pageCopy.fallbackName) || 'نشاطي';
  }

  function bootIcons() {
    if (iconsQueued) return;
    iconsQueued = true;
    Promise.resolve().then(function () {
      iconsQueued = false;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });
  }

  function encodeCompressedCanvas(canvas, quality) {
    var webp = canvas.toDataURL('image/webp', quality);
    if (webp.indexOf('data:image/webp') === 0) return webp;
    var ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  function compressImageFile(file, maxSide, quality, onDone) {
    if (!file || !IMAGE_ALLOWED_TYPES.test(file.type || '')) {
      showToast('صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP أو GIF', { danger: true, icon: 'alert-triangle' });
      return;
    }
    if (file.size > IMAGE_MAX_FILE_BYTES) {
      showToast('حجم الصورة كبير. الحد الأقصى 10 ميجابايت', { danger: true, icon: 'alert-triangle' });
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      showToast('تعذّر قراءة الصورة', { danger: true, icon: 'alert-triangle' });
    };
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        onDone(encodeCompressedCanvas(canvas, quality));
      };
      img.onerror = function () {
        showToast('ملف الصورة تالف أو غير مدعوم', { danger: true, icon: 'alert-triangle' });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function getStoredProfile() {
    try {
      var raw = localStorage.getItem(scopedKey(PROFILE_STORAGE_KEY));
      return parseStoredObject(raw);
    } catch (err) {
      return null;
    }
  }

  function setStoredProfile(profile) {
    try {
      localStorage.setItem(scopedKey(PROFILE_STORAGE_KEY), JSON.stringify(profile));
    } catch (err) { handleStorageError(err); }
  }

  function getPublicUrl(profile) {
    profile = profile || {};
    if (profile.publicUrl) return String(profile.publicUrl);
    if (profile.slug) return PUBLIC_BASE_URL + '/' + encodeURIComponent(profile.slug);
    var slugSource = (profile.name || getFallbackName()).trim();
    return PUBLIC_BASE_URL + '/' + encodeURIComponent(slugSource);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      var ok = false;
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand('copy');
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(area);
      if (ok) {
        resolve();
      } else {
        reject();
      }
    });
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function getTodayISODate() {
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  }

  function parseISODate(iso) {
    var parts = iso.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function addDaysToDate(date, days) {
    var d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function addMonthsToDate(date, months) {
    var d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function formatDisplayDate(date) {
    try {
      return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric', timeZone: GAZA_TZ }).format(date);
    } catch (err) {
      return date.toLocaleDateString();
    }
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function safeIcon(name, fallback) {
    var cfg = window.GMStoreTypeConfig;
    if (cfg && typeof cfg.safeIcon === 'function') return cfg.safeIcon(name, fallback);
    return 'sparkles';
  }

  function safePage(page) {
    var cfg = window.GMStoreTypeConfig;
    return cfg && typeof cfg.isAllowedPage === 'function' && cfg.isAllowedPage(page) ? page : '';
  }

  function safeAction(action) {
    var cfg = window.GMStoreTypeConfig;
    return cfg && typeof cfg.isAllowedAction === 'function' && cfg.isAllowedAction(action) ? action : '';
  }

  function safeHref(href) {
    var cfg = window.GMStoreTypeConfig;
    return cfg && typeof cfg.safeHref === 'function' ? cfg.safeHref(href) : '#';
  }

  function safeExternalUrl(url) {
    var value = String(url == null ? '' : url).trim();
    if (!/^https?:\/\//i.test(value)) return '';
    try {
      var parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch (err) {
      return '';
    }
  }

  function safeImageSrc(src) {
    var value = String(src == null ? '' : src).trim();
    if (!value) return '';
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+\/=]+$/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
    if (/^\/\//.test(value)) return '';
    return value;
  }

  function toCssUrl(src) {
    var safe = safeImageSrc(src);
    if (!safe) return '';
    return 'url("' + safe.replace(/["\\\r\n()]/g, function (ch) { return encodeURIComponent(ch); }) + '")';
  }

  function isValidCoordinate(value, min, max) {
    return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
  }

  function parseStoredArray(raw) {
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  function parseStoredObject(raw) {
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  }

  function handleStorageError(err) {
    var now = Date.now();
    if (now - storageErrorShownAt < 4000) return;
    storageErrorShownAt = now;
    var quota = err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    showToast(quota ? 'تعذّر الحفظ: مساحة التخزين ممتلئة، قلّل حجم الصور أو احذف بيانات قديمة' : 'تعذّر حفظ التغييرات', { danger: true, icon: 'alert-triangle' });
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var ctx = this;
      var args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function ensureToastContainer() {
    var el = document.getElementById('gm-toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gm-toast-container';
      el.className = 'gm-toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(message, options) {
    options = options || {};
    var container = ensureToastContainer();
    var toast = document.createElement('div');
    toast.className = 'gm-toast' + (options.danger ? ' gm-toast--danger' : '');
    toast.innerHTML =
      '<i data-lucide="' + safeIcon(options.icon, 'check-circle') + '" class="icon"></i>' +
      '<span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);
    bootIcons();

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, options.duration || 2600);
  }

  function ensureConfirmModalRoot() {
    var root = document.getElementById('gm-confirm-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'gm-confirm-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function openConfirmModal(opts) {
    opts = opts || {};
    var root = ensureConfirmModalRoot();
    var isDanger = opts.danger !== false;

    root.innerHTML =
      '<div class="gm-confirm-overlay" id="gm-confirm-overlay">' +
        '<div class="gm-confirm-modal" role="alertdialog" aria-modal="true">' +
          '<div class="gm-confirm-icon' + (isDanger ? ' danger' : '') + '">' +
            '<i data-lucide="' + safeIcon(opts.icon, 'trash-2') + '" class="icon"></i>' +
          '</div>' +
          '<div class="gm-confirm-title">' + escapeHtml(opts.title || '') + '</div>' +
          (opts.message ? '<div class="gm-confirm-message">' + opts.message + '</div>' : '') +
          '<div class="gm-confirm-actions">' +
            '<button type="button" class="btn ' + (isDanger ? 'btn-danger' : 'btn-primary') + '" id="gm-confirm-ok">' +
              escapeHtml(opts.confirmLabel || 'تأكيد') +
            '</button>' +
            '<button type="button" class="btn btn-ghost" id="gm-confirm-cancel">' +
              escapeHtml(opts.cancelLabel || 'إلغاء') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    bootIcons();

    var overlay = document.getElementById('gm-confirm-overlay');
    var previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    function close() {
      root.innerHTML = '';
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeydown);
    }

    document.addEventListener('keydown', onKeydown);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    document.getElementById('gm-confirm-cancel').addEventListener('click', close);
    document.getElementById('gm-confirm-ok').addEventListener('click', function () {
      close();
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
    });

    requestAnimationFrame(function () {
      overlay.classList.add('open');
    });
  }

  function getStorageScope() {
    var scope = 'default';
    var config = getStoreTypeConfig();
    if (config && config.id) {
      scope = config.id;
      if (config.id === 'store') {
        var subId = null;
        if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.getStoreSubcategoryId === 'function') {
          subId = window.GMStoreTypeConfig.getStoreSubcategoryId();
        }
        scope += ':' + (subId || 'general');
      }
    }
    return scope;
  }

  function scopedKey(baseKey) {
    return baseKey + ':' + getStorageScope();
  }

  // ---- exports ----
  GM.PROFILE_STORAGE_KEY = PROFILE_STORAGE_KEY;
  GM.PUBLIC_BASE_URL = PUBLIC_BASE_URL;
  GM.CURRENT_SCRIPT_URL = CURRENT_SCRIPT_URL;
  GM.PARTIALS_BASE_URL = PARTIALS_BASE_URL;
  GM.DASHBOARD_USERS_BASE_URL = DASHBOARD_USERS_BASE_URL;
  GM.LOGO_URL = LOGO_URL;
  GM.PROFILE_PAGE_URL = PROFILE_PAGE_URL;
  GM.PACKAGES_PAGE_URL = PACKAGES_PAGE_URL;
  GM.PARTIAL_CACHE_PREFIX = PARTIAL_CACHE_PREFIX;
  GM.readPartialCache = readPartialCache;
  GM.writePartialCache = writePartialCache;
  GM.loadPartial = loadPartial;
  GM.getStoreTypeConfig = getStoreTypeConfig;
  GM.getFallbackAvatarLetter = getFallbackAvatarLetter;
  GM.getFallbackName = getFallbackName;
  GM.bootIcons = bootIcons;
  GM.GAZA_TZ = GAZA_TZ;
  GM.encodeCompressedCanvas = encodeCompressedCanvas;
  GM.compressImageFile = compressImageFile;
  GM.getStoredProfile = getStoredProfile;
  GM.setStoredProfile = setStoredProfile;
  GM.getPublicUrl = getPublicUrl;
  GM.copyText = copyText;
  GM.pad2 = pad2;
  GM.getTodayISODate = getTodayISODate;
  GM.parseISODate = parseISODate;
  GM.addDaysToDate = addDaysToDate;
  GM.addMonthsToDate = addMonthsToDate;
  GM.formatDisplayDate = formatDisplayDate;
  GM.escapeHtml = escapeHtml;
  GM.safeIcon = safeIcon;
  GM.safePage = safePage;
  GM.safeAction = safeAction;
  GM.safeHref = safeHref;
  GM.safeExternalUrl = safeExternalUrl;
  GM.safeImageSrc = safeImageSrc;
  GM.toCssUrl = toCssUrl;
  GM.isValidCoordinate = isValidCoordinate;
  GM.IMAGE_MAX_FILE_BYTES = IMAGE_MAX_FILE_BYTES;
  GM.IMAGE_ALLOWED_TYPES = IMAGE_ALLOWED_TYPES;
  GM.parseStoredArray = parseStoredArray;
  GM.parseStoredObject = parseStoredObject;
  GM.handleStorageError = handleStorageError;
  GM.debounce = debounce;
  GM.ensureToastContainer = ensureToastContainer;
  GM.showToast = showToast;
  GM.ensureConfirmModalRoot = ensureConfirmModalRoot;
  GM.openConfirmModal = openConfirmModal;
  GM.getStorageScope = getStorageScope;
  GM.scopedKey = scopedKey;
})();