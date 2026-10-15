(function () {
  'use strict';

  var THEME_STORAGE_KEY = 'gaza-market-dashboard-theme';
  var PROFILE_STORAGE_KEY = 'gmDashboardProfile';
  var OPEN_STORAGE_KEY = 'gmDashboardOpenStatus';
  var PRICES_HOURS_STORAGE_KEY = 'gmDashboardPricesHours';
  var SERVICES_STORAGE_KEY = 'gmDashboardServices';
  var SUBSCRIBERS_STORAGE_KEY = 'gmDashboardSubscribers';
  var SUBSCRIPTION_REQUESTS_STORAGE_KEY = 'gmDashboardSubscriptionRequests';
  var TABLES_STORAGE_KEY = 'gmDashboardTables';
  var RESERVATIONS_STORAGE_KEY = 'gmDashboardReservations';
  var RESERVATIONS_CREATED_KEY = 'gmDashboardReservationsCreated';
  var ADS_STORAGE_KEY = 'gmDashboardAds';
  var MENU_CATEGORIES_STORAGE_KEY = 'gmDashboardMenuCategories';
  var MENU_ITEMS_STORAGE_KEY = 'gmDashboardMenuItems';
  var PRODUCT_CATEGORIES_STORAGE_KEY = 'gmDashboardProductCategories';
  var PRODUCT_ITEMS_STORAGE_KEY = 'gmDashboardProductItems';
  var STORE_SERVICE_CATEGORIES_STORAGE_KEY = 'gmDashboardStoreServiceCategories';
  var STORE_SERVICE_ITEMS_STORAGE_KEY = 'gmDashboardStoreServiceItems';
  var NOTIFICATIONS_STORAGE_KEY = 'gmDashboardNotifications';
  var NOTIFICATIONS_MAX = 30;
  var VISITS_STORAGE_KEY = 'gmDashboardVisits';

  var PUBLIC_BASE_URL = 'https://gazaprice.com';

  var CURRENT_SCRIPT_URL = document.currentScript ? document.currentScript.src : null;
  var PARTIALS_BASE_URL = CURRENT_SCRIPT_URL
    ? new URL('../dashboard-users/partials/', CURRENT_SCRIPT_URL).href
    : null;

  var DASHBOARD_USERS_BASE_URL = CURRENT_SCRIPT_URL
    ? new URL('../dashboard-users/', CURRENT_SCRIPT_URL).href
    : null;
  var LOGO_URL = CURRENT_SCRIPT_URL
    ? new URL('../assets/img/logo.gazamarket.2.png', CURRENT_SCRIPT_URL).href
    : '../assets/img/logo.gazamarket.2.png';
  var PROFILE_PAGE_URL = DASHBOARD_USERS_BASE_URL
    ? new URL('profile.html', DASHBOARD_USERS_BASE_URL).href
    : 'profile.html';
  var PACKAGES_PAGE_URL = DASHBOARD_USERS_BASE_URL
    ? new URL('packages.html', DASHBOARD_USERS_BASE_URL).href
    : 'packages.html';

  var PARTIAL_CACHE_PREFIX = 'gmPartial:';

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
        'تعذّر تحديد مسار الجزء (' + filename + '). تأكد أن usere-dashboard.js محمّل عبر وسم &lt;script src="..."&gt; عادي.' +
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

  function ensureMobileNavHost() {
    var host = document.getElementById('mobile-nav-slot');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mobile-nav-slot';
      document.body.appendChild(host);
    }
    return host;
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

  var STORE_SUBCATEGORY_KEY = 'gm-store-subcategory';

  function getTypeLabelWithSubCategory(typeLabel) {
    var config = getStoreTypeConfig();
    if (!config || config.id !== 'store') return typeLabel;
    var subLabel = null;
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.getStoreSubcategoryLabel === 'function') {
      subLabel = window.GMStoreTypeConfig.getStoreSubcategoryLabel();
    }
    if (!subLabel) {
      try {
        subLabel = localStorage.getItem(STORE_SUBCATEGORY_KEY);
      } catch (e) {}
    }
    if (subLabel) return typeLabel + ' — ' + subLabel;
    return typeLabel;
  }

  function navItemAttrs(item) {
    var attrs = '';
    var page = safePage(item.page);
    if (page) attrs += ' data-page="' + page + '"';
    var action = safeAction(item.action);
    if (action) attrs += ' data-action="' + action + '"';
    return attrs;
  }

  function renderSidebarNav() {
    var config = getStoreTypeConfig();
    if (!config) return;
    var nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    var html = config.sidebar.map(function (item) {
      var badge = item.badge ? '<span class="nav-item-badge">' + escapeHtml(item.badge) + '</span>' : '';
      return (
        '<a href="' + escapeHtml(safeHref(item.href)) + '" class="nav-item"' + navItemAttrs(item) + '>' +
          '<span class="nav-item-icon"><i data-lucide="' + safeIcon(item.icon) + '" class="icon"></i></span>' +
          '<span class="nav-item-text">' +
            '<span class="nav-item-label">' + escapeHtml(item.label) + '</span>' +
            '<span class="label-sub">' + escapeHtml(item.sub) + '</span>' +
          '</span>' +
          badge +
          '<i data-lucide="chevron-left" class="icon nav-item-chevron"></i>' +
        '</a>'
      );
    }).join('');

    nav.innerHTML = html;
  }

  function renderMobileNav() {
    var config = getStoreTypeConfig();
    if (!config) return;
    var nav = document.getElementById('mobile-bottom-nav');
    if (!nav) return;

    var moreBtn = nav.querySelector('[data-action="open-mobile-more"]');
    var moreBtnHTML = moreBtn ? moreBtn.outerHTML : '';

    var itemsHTML = config.mobileNav.map(function (item) {
      var badge = item.badge ? '<span class="mobile-nav-badge"></span>' : '';
      return (
        '<a href="' + escapeHtml(safeHref(item.href)) + '" class="mobile-nav-item"' + navItemAttrs(item) + '>' +
          '<i data-lucide="' + safeIcon(item.icon) + '" class="icon"></i>' +
          '<span>' + escapeHtml(item.label) + '</span>' +
          badge +
        '</a>'
      );
    }).join('');

    nav.innerHTML = itemsHTML + moreBtnHTML;
  }

  function navItemKey(item) {
    return item.page || item.action || item.href;
  }

  var MOBILE_MORE_LOGOUT_ONLY = true;

  function renderMobileMore() {
    var config = getStoreTypeConfig();
    if (!config || !Array.isArray(config.sidebar)) return;
    var body = document.querySelector('.mobile-more-body');
    if (!body) return;

    var logoutRow = body.querySelector('[data-action="logout"]');
    var logoutHTML = logoutRow ? logoutRow.outerHTML : '';

    var mobileNavKeys = (config.mobileNav || []).map(navItemKey);
    var moreItems = MOBILE_MORE_LOGOUT_ONLY ? [] : config.sidebar.filter(function (item) {
      return mobileNavKeys.indexOf(navItemKey(item)) === -1;
    });

    var itemsHTML = moreItems.map(function (item) {
      return (
        '<a href="' + escapeHtml(safeHref(item.href)) + '" class="mobile-more-row"' + navItemAttrs(item) + '>' +
          '<div class="mobile-more-row-icon-wrap">' +
            '<i data-lucide="' + safeIcon(item.icon) + '" class="icon"></i>' +
          '</div>' +
          '<div class="mobile-more-row-text">' +
            '<div class="mobile-more-row-title">' + escapeHtml(item.label) + '</div>' +
            '<div class="mobile-more-row-sub">' + escapeHtml(item.sub) + '</div>' +
          '</div>' +
          '<i data-lucide="chevron-left" class="icon mobile-more-chevron"></i>' +
        '</a>'
      );
    }).join('');

    body.innerHTML = itemsHTML + logoutHTML;
  }

  function renderDashboardQuickCards() {
    var config = getStoreTypeConfig();
    if (!config || !Array.isArray(config.dashboardCards)) return;
    var grid = document.getElementById('dashboard-quick-grid');
    if (!grid) return;

    var html = config.dashboardCards.map(function (item) {
      var inner =
        '<div class="icon-wrap"><i data-lucide="' + safeIcon(item.icon) + '" class="icon"></i></div>' +
        '<div>' +
          '<div class="title">' + escapeHtml(item.label) + '</div>' +
          '<div class="sub">' + escapeHtml(item.sub) + '</div>' +
        '</div>';
      var cardAction = safeAction(item.action);
      if (cardAction) {
        return '<div class="card quick-card" data-action="' + cardAction + '">' + inner + '</div>';
      }
      return '<a href="' + escapeHtml(safeHref(item.href)) + '" class="card quick-card">' + inner + '</a>';
    }).join('');

    grid.innerHTML = html;
  }

  function applyStoreTypeLabel() {
    var config = getStoreTypeConfig();
    if (!config) return;
    document.querySelectorAll('[data-store-type-label]').forEach(function (el) {
      el.textContent = config.label;
    });
  }

  function applyStoreTypePageCopy() {
    var config = getStoreTypeConfig();
    if (!config || !config.pageCopy) return;
    document.querySelectorAll('[data-store-type-copy]').forEach(function (el) {
      var key = el.getAttribute('data-store-type-copy');
      var text = config.pageCopy[key];
      if (text) el.textContent = text;
    });
    if (config.pageCopy.profileTitle && document.body.getAttribute('data-page') === 'profile') {
      document.title = config.pageCopy.profileTitle + ' — سوق غزة';
    }
  }

  function markActiveNavItem() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    document.querySelectorAll('.nav-item[data-page]').forEach(function (el) {
      if (el.getAttribute('data-page') === page) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
    document.querySelectorAll('.mobile-nav-item[data-page]').forEach(function (el) {
      if (el.getAttribute('data-page') === page) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  function wireDrawer() {
    var panel = document.querySelector('.side-panel');
    var scrim = document.querySelector('.scrim');
    var openBtn = document.querySelector('[data-action="open-sidebar"]');
    var closeBtn = document.querySelector('[data-action="close-sidebar"]');
    if (!panel) return;

    function open() {
      panel.classList.add('open');
      if (scrim) scrim.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('visible');
      document.body.style.overflow = '';
    }

    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  function closeSidebarDrawerIfNeeded() {
    var panel = document.querySelector('.side-panel');
    if (!panel || !panel.classList.contains('open')) return;
    var scrim = document.querySelector('.scrim');
    panel.classList.remove('open');
    if (scrim) scrim.classList.remove('visible');
    document.body.style.overflow = '';
  }

  function wireMobileMoreSheet() {
    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-mobile-more"]');
      if (openTrigger) {
        e.preventDefault();
        openMobileMoreSheet();
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-mobile-more"]');
      if (closeTrigger) {
        closeMobileMoreSheet();
        return;
      }
      var scrim = document.getElementById('mobile-more-scrim');
      if (scrim && e.target === scrim) {
        closeMobileMoreSheet();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobileMoreSheet();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) closeMobileMoreSheet();
    });
  }

  function openMobileMoreSheet() {
    var sheet = document.getElementById('mobile-more-sheet');
    var scrim = document.getElementById('mobile-more-scrim');
    if (!sheet) return;
    sheet.classList.add('open');
    if (scrim) scrim.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMoreSheet() {
    var sheet = document.getElementById('mobile-more-sheet');
    var scrim = document.getElementById('mobile-more-scrim');
    if (!sheet || !sheet.classList.contains('open')) return;
    sheet.classList.remove('open');
    if (scrim) scrim.classList.remove('open');
    document.body.style.overflow = '';
  }

  function wireSwitches() {
    document.querySelectorAll('.switch:not([data-action="toggle-open"])').forEach(function (el) {
      el.addEventListener('click', function () {
        el.classList.toggle('on');
      });
      el.setAttribute('role', 'switch');
      el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  function applyTheme(theme) {
    var isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    var toggleBtn = document.querySelector('[data-action="toggle-theme"]');
    if (toggleBtn) {
      var icon = toggleBtn.querySelector('[data-lucide]');
      if (icon) {
        var newIconName = isDark ? 'sun' : 'moon';
        icon.setAttribute('data-lucide', newIconName);
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      }
      toggleBtn.setAttribute('aria-label', isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي');
    }
  }

  function wireThemeToggle() {
    var stored = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (err) {}
    var initialTheme = stored === 'dark' ? 'dark' : 'light';
    applyTheme(initialTheme);

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="toggle-theme"]');
      if (!btn) return;
      var isDark = document.body.classList.contains('dark-mode');
      var nextTheme = isDark ? 'light' : 'dark';
      applyTheme(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (err) { handleStorageError(err); }
    });
  }

  function wireTopnavAccountLink() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="go-to-profile"]');
      if (!btn) return;
      window.location.href = PROFILE_PAGE_URL;
    });
  }

  var iconsQueued = false;

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

  var FREE_PLAN_CHIP_LABEL = 'مجانية';

  function getCurrentPlanId() {
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.getCurrentPlan === 'function') {
      return window.GMStoreTypeConfig.getCurrentPlan();
    }
    return 'free';
  }

  function getCurrentPlanView() {
    var config = getStoreTypeConfig();
    var pkgs = config && config.packages ? config.packages : null;
    if (getCurrentPlanId() === 'paid' && pkgs && pkgs.paid) {
      return {
        id: 'paid',
        name: pkgs.paid.name,
        chipLabel: pkgs.paid.name,
        heroLabel: pkgs.paid.badge || ('باقة ' + pkgs.paid.name)
      };
    }
    return {
      id: 'free',
      name: pkgs && pkgs.free ? pkgs.free.name : 'مجاني',
      chipLabel: FREE_PLAN_CHIP_LABEL,
      heroLabel: 'باقة ' + FREE_PLAN_CHIP_LABEL
    };
  }

  var GAZA_TZ = 'Asia/Gaza';
  var GAZA_LAT = 31.5;
  var GAZA_LNG = 34.45;

  var PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var PRAYER_LABELS = {
    fajr: 'الفجر',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء'
  };

  function degToRad(d) { return (d * Math.PI) / 180; }
  function radToDeg(r) { return (r * 180) / Math.PI; }

  function fixAngle(angle) {
    angle = angle - 360 * Math.floor(angle / 360);
    return angle < 0 ? angle + 360 : angle;
  }

  function fixHour(hour) {
    hour = hour - 24 * Math.floor(hour / 24);
    return hour < 0 ? hour + 24 : hour;
  }

  function julianDate(year, month, day) {
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    var A = Math.floor(year / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * Math.sin(degToRad(g)) + 0.02 * Math.sin(degToRad(2 * g)));
    var e = 23.439 - 0.00000036 * D;

    var RA = radToDeg(Math.atan2(Math.cos(degToRad(e)) * Math.sin(degToRad(L)), Math.cos(degToRad(L)))) / 15;
    RA = fixHour(RA);

    var eqt = q / 15 - RA;
    var decl = radToDeg(Math.asin(Math.sin(degToRad(e)) * Math.sin(degToRad(L))));

    return { declination: decl, equation: eqt };
  }

  function hourAngle(angleDeg, lat, decl) {
    var latR = degToRad(lat);
    var declR = degToRad(decl);
    var cosH =
      (-Math.sin(degToRad(angleDeg)) - Math.sin(latR) * Math.sin(declR)) /
      (Math.cos(latR) * Math.cos(declR));
    cosH = Math.max(-1, Math.min(1, cosH));
    return radToDeg(Math.acos(cosH)) / 15;
  }

  function asrHourAngle(shadowFactor, lat, decl) {
    var latR = degToRad(lat);
    var declR = degToRad(decl);
    var angleDeg = -radToDeg(Math.atan(1 / (shadowFactor + Math.tan(Math.abs(latR - declR)))));
    return hourAngle(angleDeg, lat, decl);
  }

  function getPrayerTimesForDay(year, month, day, lat, lng, tzOffsetHours) {
    var jd = julianDate(year, month, day) - lng / (15 * 24);
    var sun = sunPosition(jd);
    var decl = sun.declination;
    var eqt = sun.equation;

    var dhuhr = fixHour(12 - eqt + tzOffsetHours - lng / 15);

    var fajrAngle = 18;
    var ishaAngle = 17;

    return {
      fajr: fixHour(dhuhr - hourAngle(fajrAngle, lat, decl)),
      sunrise: fixHour(dhuhr - hourAngle(0.833, lat, decl)),
      dhuhr: dhuhr,
      asr: fixHour(dhuhr + asrHourAngle(1, lat, decl)),
      maghrib: fixHour(dhuhr + hourAngle(0.833, lat, decl)),
      isha: fixHour(dhuhr + hourAngle(ishaAngle, lat, decl))
    };
  }

  function getUtcOffsetHours(date, timeZone) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    var parts = dtf.formatToParts(date).reduce(function (acc, p) {
      acc[p.type] = p.value;
      return acc;
    }, {});
    var hour = parts.hour === '24' ? 0 : Number(parts.hour);
    var asUtcMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
      Number(parts.second)
    );
    var rawOffset = (asUtcMs - date.getTime()) / 3600000;
    return Math.round(rawOffset * 60) / 60;
  }

  function getDateParts(date, timeZone) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    var parts = dtf.formatToParts(date).reduce(function (acc, p) {
      acc[p.type] = p.value;
      return acc;
    }, {});
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
  }

  function gazaDecimalHourToUtcMs(year, month, day, decimalHour, tzOffsetHours) {
    return Date.UTC(year, month - 1, day, 0, 0, 0) + (decimalHour - tzOffsetHours) * 3600000;
  }

  function formatRemaining(ms) {
    var totalMinutes = Math.max(0, Math.round(ms / 60000));
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    if (hours <= 0) return 'بعد ' + minutes + ' دقيقة';
    if (minutes <= 0) return 'بعد ' + hours + ' ساعة';
    return 'بعد ' + hours + ' ساعة و' + minutes + ' دقيقة';
  }

  function findNextPrayer(now) {
    var offset = getUtcOffsetHours(now, GAZA_TZ);
    var todayParts = getDateParts(now, GAZA_TZ);
    var todayTimes = getPrayerTimesForDay(todayParts.year, todayParts.month, todayParts.day, GAZA_LAT, GAZA_LNG, offset);

    for (var i = 0; i < PRAYER_ORDER.length; i++) {
      var key = PRAYER_ORDER[i];
      var ms = gazaDecimalHourToUtcMs(todayParts.year, todayParts.month, todayParts.day, todayTimes[key], offset);
      if (ms > now.getTime()) {
        return { key: key, name: PRAYER_LABELS[key], ms: ms };
      }
    }

    var tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    var tOffset = getUtcOffsetHours(tomorrow, GAZA_TZ);
    var tParts = getDateParts(tomorrow, GAZA_TZ);
    var tTimes = getPrayerTimesForDay(tParts.year, tParts.month, tParts.day, GAZA_LAT, GAZA_LNG, tOffset);
    var fajrMs = gazaDecimalHourToUtcMs(tParts.year, tParts.month, tParts.day, tTimes.fajr, tOffset);
    return { key: 'fajr', name: PRAYER_LABELS.fajr, ms: fajrMs };
  }

  function updateAzanPill() {
    var textEl = document.getElementById('hero-azan-text');
    if (!textEl) return;
    try {
      var now = new Date();
      var next = findNextPrayer(now);
      textEl.textContent = 'أذان ' + next.name + ' ' + formatRemaining(next.ms - now.getTime());
    } catch (err) {
      textEl.textContent = 'تعذّر حساب موعد الأذان';
      console.error('Azan countdown error:', err);
    }
  }

  function updateHeroDateLine() {
    var el = document.getElementById('hero-date-line');
    if (!el) return;
    try {
      var now = new Date();

      var weekday = new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', timeZone: GAZA_TZ }).format(now);
      var gDay = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', timeZone: GAZA_TZ }).format(now);
      var gMonth = new Intl.DateTimeFormat('ar-u-nu-latn', { month: 'long', timeZone: GAZA_TZ }).format(now);

      var hijriParts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: GAZA_TZ
      })
        .formatToParts(now)
        .reduce(function (acc, p) {
          acc[p.type] = p.value;
          return acc;
        }, {});

      el.textContent =
        weekday + '، ' + gDay + ' ' + gMonth + ' · ' + hijriParts.day + ' ' + hijriParts.month + ' ' + hijriParts.year;
    } catch (err) {
      console.error('Hero date line error:', err);
    }
  }

  function updateHeroPlanChip() {
    var el = document.getElementById('hero-plan-chip');
    if (el) el.textContent = getCurrentPlanView().heroLabel;
  }

  var LIMIT_NOUNS = {
    menuItems: 'أصناف',
    menuCategories: 'تصنيفات',
    products: 'منتجات',
    productCategories: 'تصنيفات',
    ads: 'إعلانات',
    services: 'خدمات',
    serviceCategories: 'تصنيفات',
    tables: 'طاولات',
    reservations: 'حجوزات',
    discountedProducts: 'منتجات بخصم'
  };

  var LOCKED_FEATURE_LABELS = {
    qrCode: 'كود QR',
    shareWhatsapp: 'المشاركة عبر واتساب',
    cardPayment: 'إظهار الدفع بالبطاقة للزوار',
    whatsappOrder: 'استقبال الطلبات عبر واتساب',
    installments: 'خدمة التقسيط'
  };

  var SERVICE_LOCKED_FEATURE = {
    card_payment: 'cardPayment',
    'payment_methods-tow': 'cardPayment',
    whatsapp_order: 'whatsappOrder',
    installments: 'installments'
  };

  function getServiceLockedFeatureKey(serviceId) {
    return SERVICE_LOCKED_FEATURE[serviceId] || null;
  }

  function isServiceLocked(serviceId) {
    var featureKey = getServiceLockedFeatureKey(serviceId);
    return !!featureKey && isFeatureLockedForPlan(featureKey);
  }

  var LOCK_OVERLAY_TEXT = 'متاحة في الباقة المدفوعة';

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

  function getPlanLimitStatus(limitKey, usedCount) {
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.getLimitStatus === 'function') {
      return window.GMStoreTypeConfig.getLimitStatus(limitKey, usedCount);
    }
    return { plan: 'free', limit: null, used: usedCount, remaining: null, unlimited: true, canAdd: true };
  }

  function isFeatureLockedForPlan(featureKey) {
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.isFeatureLocked === 'function') {
      return window.GMStoreTypeConfig.isFeatureLocked(featureKey);
    }
    return false;
  }

  function goToPackagesPage() {
    window.location.href = PACKAGES_PAGE_URL;
  }

  function openUpgradeModal(opts) {
    opts = opts || {};
    var title;
    var message;

    if (opts.limitKey) {
      var noun = LIMIT_NOUNS[opts.limitKey] || 'عناصر';
      title = 'تجاوزت حد الباقة المجانية';
      message = 'وصلت للحد الأقصى في الباقة المجانية (' + opts.limit + ' ' + noun + '). ' +
        'اشترك بالباقة المدفوعة لإضافة ' + noun + ' أكثر.';
      if (opts.limitKey === 'discountedProducts') {
        message = 'وصلت للحد الأقصى للخصومات في الباقة المجانية (' + opts.limit + ' منتجات). ' +
          'اشترك بالباقة المدفوعة لتفعيل الخصم على منتجات أكثر.';
      }
    } else {
      var label = LOCKED_FEATURE_LABELS[opts.featureKey];
      title = 'ميزة للباقة المدفوعة';
      message = (label ? 'ميزة «' + escapeHtml(label) + '»' : 'هذه الميزة') +
        ' متاحة في الباقة المدفوعة فقط. اشترك بالباقة المدفوعة لتفعيلها.';
    }

    openConfirmModal({
      icon: 'lock',
      danger: false,
      title: title,
      message: message,
      confirmLabel: 'اشترك بالباقة المدفوعة',
      cancelLabel: 'إغلاق',
      onConfirm: goToPackagesPage
    });
  }

  function guardPlanLimit(limitKey, usedCount) {
    var status = getPlanLimitStatus(limitKey, usedCount);
    if (status.canAdd) return true;
    openUpgradeModal({ limitKey: limitKey, limit: status.limit });
    return false;
  }

  function initLockedFeatures() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-locked-feature]');
      if (!trigger) return;
      var featureKey = trigger.getAttribute('data-locked-feature');
      if (!isFeatureLockedForPlan(featureKey)) return;
      e.preventDefault();
      e.stopPropagation();
      openUpgradeModal({ featureKey: featureKey });
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var trigger = e.target.closest && e.target.closest('[data-lock-overlay].is-locked');
      if (!trigger) return;
      e.preventDefault();
      openUpgradeModal({ featureKey: trigger.getAttribute('data-locked-feature') });
    });
  }

  function applyLockedFeaturesToUI() {
    document.querySelectorAll('[data-locked-feature]').forEach(function (el) {
      var locked = isFeatureLockedForPlan(el.getAttribute('data-locked-feature'));
      el.classList.toggle('is-locked', locked);
      if (!el.hasAttribute('data-lock-overlay')) return;

      var overlay = el.querySelector('.feature-lock-overlay');
      if (locked && !overlay) {
        overlay = document.createElement('div');
        overlay.className = 'feature-lock-overlay';
        overlay.innerHTML =
          '<span class="feature-lock-chip">' +
            '<i data-lucide="lock" class="icon"></i>' +
            '<span>' + LOCK_OVERLAY_TEXT + '</span>' +
          '</span>';
        el.appendChild(overlay);
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
      } else if (!locked && overlay) {
        el.removeChild(overlay);
        el.removeAttribute('role');
        el.removeAttribute('tabindex');
      }
    });
  }

  function applyCurrentPlanToUI() {
    var view = getCurrentPlanView();
    updateHeroPlanChip();

    var sidebarChip = document.querySelector('.plan-mini-chip');
    if (sidebarChip) sidebarChip.textContent = view.chipLabel;

    var sidebarName = document.querySelector('.plan-mini-name');
    if (sidebarName) sidebarName.textContent = view.name;

    var mobileChip = document.querySelector('.mobile-plan-label .plan-chip');
    if (mobileChip) mobileChip.textContent = view.name;

    var isPaid = view.id === 'paid';
    var sidebarDesc = document.querySelector('.plan-mini-desc');
    if (sidebarDesc) sidebarDesc.style.display = isPaid ? 'none' : '';
    var sidebarUpgradeBtn = document.querySelector('.plan-mini-btn');
    if (sidebarUpgradeBtn) sidebarUpgradeBtn.style.display = isPaid ? 'none' : '';
    var mobileUpgrade = document.querySelector('.mobile-plan-upgrade');
    if (mobileUpgrade) mobileUpgrade.style.display = isPaid ? 'none' : '';
  }

  function initHeroDynamicInfo() {
    updateHeroDateLine();
    updateHeroPlanChip();
    updateAzanPill();
    setInterval(function () {
      updateHeroDateLine();
      updateAzanPill();
    }, 60 * 1000);
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

  function getStoredOpenStatus() {
    try {
      var v = localStorage.getItem(scopedKey(OPEN_STORAGE_KEY));
      if (v === null) return true;
      return v === 'true';
    } catch (err) {
      return true;
    }
  }

  function setStoredOpenStatus(isOpen) {
    try {
      localStorage.setItem(scopedKey(OPEN_STORAGE_KEY), isOpen ? 'true' : 'false');
    } catch (err) { handleStorageError(err); }
  }

  function getStoredPricesHours() {
    try {
      var raw = localStorage.getItem(scopedKey(PRICES_HOURS_STORAGE_KEY));
      return parseStoredObject(raw);
    } catch (err) {
      return null;
    }
  }

  function setStoredPricesHours(data) {
    try {
      localStorage.setItem(scopedKey(PRICES_HOURS_STORAGE_KEY), JSON.stringify(data));
    } catch (err) { handleStorageError(err); }
  }

  function getStoredServices() {
    try {
      var raw = localStorage.getItem(scopedKey(SERVICES_STORAGE_KEY));
      return parseStoredObject(raw);
    } catch (err) {
      return null;
    }
  }

  function setStoredServices(data) {
    try {
      localStorage.setItem(scopedKey(SERVICES_STORAGE_KEY), JSON.stringify(data));
    } catch (err) { handleStorageError(err); }
  }

  function getStoredSubscribers() {
    try {
      var raw = localStorage.getItem(scopedKey(SUBSCRIBERS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredSubscribers(list) {
    try {
      localStorage.setItem(scopedKey(SUBSCRIBERS_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateSubscriberId() {
    return window.GM_ID.generate('sub');
  }

  function getStoredSubscriptionRequests() {
    try {
      var raw = localStorage.getItem(scopedKey(SUBSCRIPTION_REQUESTS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredSubscriptionRequests(list) {
    try {
      localStorage.setItem(scopedKey(SUBSCRIPTION_REQUESTS_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateRequestId() {
    return window.GM_ID.generate('req');
  }

  function findSubscriptionRequestById(id) {
    var list = getStoredSubscriptionRequests();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function gmSubmitSubscriptionRequest(data) {
    data = data || {};
    var name = (data.name || '').toString().trim();
    var whatsapp = (data.whatsapp || '').toString().trim();
    if (!name) throw new Error('gmSubmitSubscriptionRequest: name is required');
    if (!whatsapp) throw new Error('gmSubmitSubscriptionRequest: whatsapp is required');

    var request = {
      id: generateRequestId(),
      name: name,
      countryCode: (data.countryCode || '970').toString().trim(),
      whatsapp: whatsapp,
      duration: ['day', 'week', 'month'].indexOf(data.duration) !== -1 ? data.duration : 'month',
      note: (data.note || '').toString().trim(),
      createdAt: Date.now()
    };

    var list = getStoredSubscriptionRequests();
    list.unshift(request);
    setStoredSubscriptionRequests(list);

    if (typeof window.renderSubscriptionRequestsPage === 'function') {
      window.renderSubscriptionRequestsPage();
    }

    return request;
  }

  window.gmSubmitSubscriptionRequest = gmSubmitSubscriptionRequest;

  function formatRequestDateTime(timestamp) {
    try {
      return new Intl.DateTimeFormat('ar', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: GAZA_TZ
      }).format(new Date(timestamp));
    } catch (err) {
      return new Date(timestamp).toLocaleString();
    }
  }

  function renderSubscriptionRequestsPage() {
    var tbody = document.getElementById('req-table-body');
    var cardsWrap = document.getElementById('req-cards-wrap');
    var dataWrap = document.getElementById('req-data-wrap');
    var emptyState = document.getElementById('req-empty-state');
    if (!tbody) return;

    var list = getStoredSubscriptionRequests();

    var rowsHtml = '';
    var cardsHtml = '';

    list.forEach(function (req) {
      var whatsappDisplay = '+' + (req.countryCode || '970') + req.whatsapp;
      var avatarLetter = escapeHtml((req.name || '').trim().charAt(0) || '؟');
      var durationLabel = DURATION_LABELS[req.duration] || req.duration;
      var dateLabel = formatRequestDateTime(req.createdAt);

      rowsHtml +=
        '<tr>' +
          '<td><div class="flex gap-12">' +
              '<div class="avatar">' + avatarLetter + '</div>' +
              '<div>' +
                '<div style="font-weight:700;display:flex;align-items:center;gap:6px;">' +
                  escapeHtml(req.name) +
                  '<span class="badge amber">جديد</span>' +
                '</div>' +
                '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' +
                  (req.note ? escapeHtml(req.note) : 'لا يوجد') +
                '</div>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td><div class="flex gap-8">' +
              '<i data-lucide="message-circle" class="icon" style="color:var(--db-text-tertiary);"></i>' +
              '<span class="mono">' + escapeHtml(whatsappDisplay) + '</span>' +
            '</div></td>' +
          '<td>' + durationLabel + '</td>' +
          '<td class="mono" style="direction:ltr;text-align:right;">' + dateLabel + '</td>' +
          '<td>' +
            '<div class="flex gap-8">' +
              '<button type="button" class="btn btn-primary btn-sm" data-action="approve-request" data-id="' + escapeHtml(req.id) + '">موافقة</button>' +
              '<button type="button" class="btn btn-danger btn-sm" data-action="reject-request" data-id="' + escapeHtml(req.id) + '">رفض</button>' +
            '</div>' +
          '</td>' +
        '</tr>';

      cardsHtml +=
        '<div class="sub-card" data-id="' + escapeHtml(req.id) + '">' +
          '<div class="sub-card-top">' +
            '<span class="badge amber">جديد</span>' +
            '<div class="sub-card-name">' + escapeHtml(req.name) + '</div>' +
          '</div>' +
          '<div class="sub-card-row mono">' +
            '<i data-lucide="message-circle" class="icon"></i>' +
            '<span>' + escapeHtml(whatsappDisplay) + '</span>' +
          '</div>' +
          '<div class="sub-card-row">' + durationLabel + ' \u00b7 ' + dateLabel + '</div>' +
          (req.note ? '<div class="sub-card-note">' + escapeHtml(req.note) + '</div>' : '') +
          '<div class="sub-card-actions" style="grid-template-columns:repeat(2,1fr);">' +
            '<button type="button" class="btn btn-primary btn-sm" data-action="approve-request" data-id="' + escapeHtml(req.id) + '">' +
              '<i data-lucide="check" class="icon"></i> موافقة' +
            '</button>' +
            '<button type="button" class="btn btn-danger btn-sm" data-action="reject-request" data-id="' + escapeHtml(req.id) + '">' +
              '<i data-lucide="x" class="icon"></i> رفض' +
            '</button>' +
          '</div>' +
        '</div>';
    });

    tbody.innerHTML = rowsHtml;
    if (cardsWrap) cardsWrap.innerHTML = cardsHtml;

    if (dataWrap && emptyState) {
      var hasRequests = list.length > 0;
      dataWrap.style.display = hasRequests ? '' : 'none';
      emptyState.style.display = hasRequests ? 'none' : '';
    }

    updateSubscriptionRequestsNavBadge(list.length);

    bootIcons();
  }

  window.renderSubscriptionRequestsPage = renderSubscriptionRequestsPage;

  function updateSubscriptionRequestsNavBadge(count) {
    document.querySelectorAll('.nav-item[data-page="subscription-requests"] .nav-item-badge, .mobile-nav-item[data-page="subscription-requests"] .mobile-nav-badge').forEach(function (el) {
      el.remove();
    });
    if (!count) return;

    var navItem = document.querySelector('.nav-item[data-page="subscription-requests"]');
    if (navItem) {
      var badge = document.createElement('span');
      badge.className = 'nav-item-badge';
      badge.textContent = String(count);
      navItem.appendChild(badge);
    }

    var mobileNavItem = document.querySelector('.mobile-nav-item[data-page="subscription-requests"]');
    if (mobileNavItem) {
      var dot = document.createElement('span');
      dot.className = 'mobile-nav-badge';
      mobileNavItem.appendChild(dot);
    }
  }

  function initSubscriptionRequestActions() {
    document.addEventListener('click', function (e) {
      var approveBtn = e.target.closest && e.target.closest('[data-action="approve-request"]');
      if (approveBtn) {
        var idToApprove = approveBtn.getAttribute('data-id');
        var reqToApprove = findSubscriptionRequestById(idToApprove);
        if (!reqToApprove) return;

        openConfirmModal({
          icon: 'thumbs-up',
          danger: false,
          title: 'الموافقة على الطلب؟',
          message: 'رح يتم إضافة «<strong>' + escapeHtml(reqToApprove.name) + '</strong>» كمشترك نشط.',
          confirmLabel: 'موافقة وإضافة',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var subscribers = getStoredSubscribers();
            subscribers.push({
              id: generateSubscriberId(),
              name: reqToApprove.name,
              countryCode: reqToApprove.countryCode || '970',
              whatsapp: reqToApprove.whatsapp,
              duration: reqToApprove.duration || 'month',
              amount: 0,
              startDate: getTodayISODate(),
              note: reqToApprove.note || '',
              stopped: false
            });
            setStoredSubscribers(subscribers);

            var remainingRequests = getStoredSubscriptionRequests().filter(function (r) {
              return r.id !== idToApprove;
            });
            setStoredSubscriptionRequests(remainingRequests);

            renderSubscriptionRequestsPage();
            if (typeof window.renderSubscribersPage === 'function') {
              window.renderSubscribersPage();
            }

            showToast('تمت الموافقة وإضافة المشترك', { icon: 'user-check' });
          }
        });
        return;
      }

      var rejectBtn = e.target.closest && e.target.closest('[data-action="reject-request"]');
      if (rejectBtn) {
        var idToReject = rejectBtn.getAttribute('data-id');
        var reqToReject = findSubscriptionRequestById(idToReject);
        var nameHtml = reqToReject ? '<strong>' + escapeHtml(reqToReject.name) + '</strong>' : 'هذا الطلب';

        openConfirmModal({
          icon: 'x',
          danger: true,
          title: 'رفض الطلب؟',
          message: 'رح يتم حذف طلب «' + nameHtml + '» نهائياً.',
          confirmLabel: 'رفض وحذف',
          cancelLabel: 'تراجع',
          onConfirm: function () {
            var remaining = getStoredSubscriptionRequests().filter(function (r) {
              return r.id !== idToReject;
            });
            setStoredSubscriptionRequests(remaining);
            renderSubscriptionRequestsPage();
            showToast('تم رفض الطلب', { icon: 'x', danger: true });
          }
        });
        return;
      }
    });
  }

  function getStoredTables() {
    try {
      var raw = localStorage.getItem(scopedKey(TABLES_STORAGE_KEY));
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function setStoredTables(list) {
    try {
      localStorage.setItem(scopedKey(TABLES_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateTableId() {
    return window.GM_ID.generate('tbl');
  }

  function findTableById(id) {
    var list = getStoredTables();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function gmGetTables() {
    return getStoredTables().map(function (t) {
      return { id: t.id, name: t.name, seats: t.seats, status: t.status };
    });
  }

  window.gmGetTables = gmGetTables;

  function gmGetAvailableTables() {
    return gmGetTables().filter(function (t) {
      return t.status !== 'occupied';
    });
  }

  window.gmGetAvailableTables = gmGetAvailableTables;

  function renderTablesPage() {
    var tbody = document.getElementById('tbl-table-body');
    var cardsWrap = document.getElementById('tbl-cards-wrap');
    var dataWrap = document.getElementById('tbl-data-wrap');
    var emptyState = document.getElementById('tbl-empty-state');
    var statTotalEl = document.getElementById('tbl-stat-total');
    var statAvailableEl = document.getElementById('tbl-stat-available');
    var statOccupiedEl = document.getElementById('tbl-stat-occupied');
    if (!tbody) return;

    var list = getStoredTables();
    var availableCount = 0;
    var occupiedCount = 0;

    var rowsHtml = '';
    var cardsHtml = '';

    list.forEach(function (table) {
      var isOccupied = table.status === 'occupied';
      if (isOccupied) { occupiedCount++; } else { availableCount++; }

      var statusBadge = isOccupied
        ? '<span class="badge red"><span>\u25cf</span> مستخدمة</span>'
        : '<span class="badge green"><span>\u25cf</span> متاحة</span>';

      var seatsLabel = table.seats ? (table.seats + ' كرسي') : '\u2014';
      var toggleIcon = isOccupied ? 'check-circle' : 'ban';
      var toggleLabel = isOccupied ? 'وضع كمتاحة' : 'وضع كمستخدمة';

      rowsHtml +=
        '<tr' + (isOccupied ? ' class="is-unavailable"' : '') + '>' +
          '<td><div style="font-weight:700;">' + escapeHtml(table.name) + '</div></td>' +
          '<td>' + seatsLabel + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' +
            '<div class="flex gap-8">' +
              '<button type="button" class="icon-btn" data-action="toggle-table-status" data-id="' + escapeHtml(table.id) + '" aria-label="' + toggleLabel + '" title="' + toggleLabel + '"><i data-lucide="' + toggleIcon + '" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="edit-table" data-id="' + escapeHtml(table.id) + '" aria-label="تعديل" title="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="delete-table" data-id="' + escapeHtml(table.id) + '" aria-label="حذف" title="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
            '</div>' +
          '</td>' +
        '</tr>';

      cardsHtml +=
        '<div class="sub-card" data-id="' + escapeHtml(table.id) + '">' +
          '<div class="sub-card-top">' +
            statusBadge +
            '<div class="sub-card-name">' + escapeHtml(table.name) + '</div>' +
          '</div>' +
          '<div class="sub-card-row">عدد الكراسي: ' + seatsLabel + '</div>' +
          '<div class="sub-card-actions" style="grid-template-columns:repeat(3,1fr);">' +
            '<button type="button" class="btn btn-sm btn-ghost" data-action="toggle-table-status" data-id="' + escapeHtml(table.id) + '">' +
              '<i data-lucide="' + toggleIcon + '" class="icon"></i> ' + (isOccupied ? 'إتاحة' : 'إشغال') +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-action="edit-table" data-id="' + escapeHtml(table.id) + '">' +
              '<i data-lucide="pencil" class="icon"></i> تعديل' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-danger" data-action="delete-table" data-id="' + escapeHtml(table.id) + '">' +
              '<i data-lucide="trash-2" class="icon"></i> حذف' +
            '</button>' +
          '</div>' +
        '</div>';
    });

    tbody.innerHTML = rowsHtml;
    if (cardsWrap) cardsWrap.innerHTML = cardsHtml;

    if (statTotalEl) statTotalEl.textContent = String(list.length);
    if (statAvailableEl) statAvailableEl.textContent = String(availableCount);
    if (statOccupiedEl) statOccupiedEl.textContent = String(occupiedCount);

    var tablesUsageEl = document.getElementById('tbl-usage-counter');
    if (tablesUsageEl) {
      var tablesUsage = getPlanLimitStatus('tables', list.length);
      if (tablesUsage.unlimited) {
        tablesUsageEl.style.display = 'none';
      } else {
        tablesUsageEl.textContent = tablesUsage.used + ' من ' + tablesUsage.limit + ' ' + LIMIT_NOUNS.tables +
          (tablesUsage.canAdd ? '' : ' — وصلت للحد الأقصى');
        tablesUsageEl.style.display = '';
      }
    }

    if (dataWrap && emptyState) {
      var hasTables = list.length > 0;
      dataWrap.style.display = hasTables ? '' : 'none';
      emptyState.style.display = hasTables ? 'none' : '';
    }

    applyLockedFeaturesToUI();
    bootIcons();
  }

  window.renderTablesPage = renderTablesPage;

  function parseTableSeats(value) {
    var seats = parseInt(value, 10);
    return seats >= 1 ? seats : null;
  }

  function initTableAddPanel() {
    var panel = document.getElementById('tep-panel');
    var scrim = document.getElementById('tep-scrim');
    if (!panel) return;

    var titleEl = document.getElementById('tep-title');
    var subtitleEl = document.getElementById('tep-subtitle');
    var nameInput = document.getElementById('tep-name');
    var seatsInput = document.getElementById('tep-seats');
    var statusGroup = document.getElementById('tep-status-group');
    var saveBtn = document.getElementById('tep-save-btn');
    var saveBtnLabel = saveBtn ? saveBtn.innerHTML : '';

    var selectedStatus = 'available';
    var editingId = null;

    function setStatus(value) {
      selectedStatus = value;
      if (!statusGroup) return;
      statusGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
      });
    }

    function resetForm() {
      if (nameInput) nameInput.value = '';
      if (seatsInput) seatsInput.value = '';
      setStatus('available');
    }

    function fillFormFromTable(table) {
      if (nameInput) nameInput.value = table.name || '';
      if (seatsInput) seatsInput.value = table.seats != null ? table.seats : '';
      setStatus(table.status === 'occupied' ? 'occupied' : 'available');
    }

    function open(tableToEdit) {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();

      editingId = tableToEdit ? tableToEdit.id : null;

      if (tableToEdit) {
        fillFormFromTable(tableToEdit);
        if (titleEl) titleEl.textContent = 'تعديل الطاولة';
        if (subtitleEl) subtitleEl.textContent = 'تحديث بيانات ' + (tableToEdit.name || 'الطاولة');
        if (saveBtn) saveBtn.innerHTML = '<i data-lucide="check" class="icon"></i> حفظ التعديلات';
      } else {
        resetForm();
        if (titleEl) titleEl.textContent = 'طاولة جديدة';
        if (subtitleEl) subtitleEl.textContent = 'أضف طاولة جديدة لنشاطك';
        if (saveBtn) saveBtn.innerHTML = saveBtnLabel;
      }

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (nameInput) nameInput.focus();
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      editingId = null;
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-table-add"]');
      if (openTrigger) {
        e.preventDefault();
        if (guardPlanLimit('tables', getStoredTables().length)) open(null);
        return;
      }
      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-table"]');
      if (editTrigger) {
        e.preventDefault();
        var tableToEdit = findTableById(editTrigger.getAttribute('data-id'));
        if (tableToEdit) open(tableToEdit);
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-table-add"]');
      if (closeTrigger) {
        close();
        return;
      }
      var statusBtn = e.target.closest && e.target.closest('#tep-status-group .seg-btn');
      if (statusBtn) setStatus(statusBtn.getAttribute('data-value'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var list = getStoredTables();

        if (editingId) {
          var name = nameInput ? nameInput.value.trim() : '';
          if (!name) { if (nameInput) nameInput.focus(); return; }
          var idx = -1;
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === editingId) { idx = i; break; }
          }
          if (idx !== -1) {
            list[idx].name = name;
            list[idx].seats = seatsInput ? parseTableSeats(seatsInput.value) : null;
            list[idx].status = selectedStatus;
          }
          setStoredTables(list);
          close();
          renderTablesPage();
          showToast('تم حفظ تعديلات الطاولة', { icon: 'check-circle' });
          return;
        }

        var singleName = nameInput ? nameInput.value.trim() : '';
        if (!singleName) { if (nameInput) nameInput.focus(); return; }
        if (!guardPlanLimit('tables', list.length)) return;
        list.push({
          id: generateTableId(),
          name: singleName,
          seats: seatsInput ? parseTableSeats(seatsInput.value) : null,
          status: selectedStatus
        });
        setStoredTables(list);
        close();
        renderTablesPage();
        showToast('تمت إضافة الطاولة', { icon: 'check-circle' });
      });
    }
  }

  function initTableActions() {
    document.addEventListener('click', function (e) {
      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-table-status"]');
      if (toggleBtn) {
        var idToToggle = toggleBtn.getAttribute('data-id');
        var listForToggle = getStoredTables();
        var nowOccupied = false;
        for (var i = 0; i < listForToggle.length; i++) {
          if (listForToggle[i].id === idToToggle) {
            listForToggle[i].status = listForToggle[i].status === 'occupied' ? 'available' : 'occupied';
            nowOccupied = listForToggle[i].status === 'occupied';
            break;
          }
        }
        setStoredTables(listForToggle);
        renderTablesPage();
        showToast(nowOccupied ? 'تم وضع الطاولة كمستخدمة' : 'تم وضع الطاولة كمتاحة', {
          icon: nowOccupied ? 'ban' : 'check-circle',
          danger: nowOccupied
        });
        return;
      }

      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-table"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        var tableToDelete = findTableById(idToDelete);
        var nameHtml = tableToDelete ? '<strong>' + escapeHtml(tableToDelete.name) + '</strong>' : 'هذه الطاولة';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف الطاولة؟',
          message: 'سيتم حذف «' + nameHtml + '» نهائياً.',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var listAfterDelete = getStoredTables().filter(function (t) {
              return t.id !== idToDelete;
            });
            setStoredTables(listAfterDelete);
            renderTablesPage();
          }
        });
        return;
      }
    });
  }

  function getStoredReservations() {
    try {
      var raw = localStorage.getItem(scopedKey(RESERVATIONS_STORAGE_KEY));
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function setStoredReservations(list) {
    try {
      localStorage.setItem(scopedKey(RESERVATIONS_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateReservationId() {
    return window.GM_ID.generate('res');
  }

  function findReservationById(id) {
    var list = getStoredReservations();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function formatReservationDateTime(value) {
    try {
      var d = new Date(value);
      if (isNaN(d.getTime())) return escapeHtml(String(value));
      return new Intl.DateTimeFormat('ar', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: GAZA_TZ
      }).format(d);
    } catch (err) {
      return escapeHtml(String(value));
    }
  }

  function buildReservationStatusBadge(status) {
    if (status === 'confirmed') return '<span class="badge green"><span>\u25cf</span> مؤكدة</span>';
    if (status === 'cancelled') return '<span class="badge gray"><span>\u25cf</span> ملغاة</span>';
    return '<span class="badge amber"><span>\u25cf</span> قيد الانتظار</span>';
  }

  function getReservationsCreatedCount() {
    var stored = 0;
    try {
      stored = parseInt(localStorage.getItem(scopedKey(RESERVATIONS_CREATED_KEY)), 10) || 0;
    } catch (e) { }
    return Math.max(stored, getStoredReservations().length);
  }

  function setReservationsCreatedCount(count) {
    try {
      localStorage.setItem(scopedKey(RESERVATIONS_CREATED_KEY), String(count));
    } catch (e) { }
  }

  function gmGetReservationLimitStatus() {
    return getPlanLimitStatus('reservations', getReservationsCreatedCount());
  }

  window.gmGetReservationLimitStatus = gmGetReservationLimitStatus;

  function gmSubmitTableReservation(data) {
    data = data || {};
    if (!gmGetReservationLimitStatus().canAdd) {
      var limitError = new Error('gmSubmitTableReservation: reservation limit reached for the current plan');
      limitError.code = 'RESERVATION_LIMIT_REACHED';
      throw limitError;
    }
    var name = (data.name || '').toString().trim().slice(0, 80);
    var whatsapp = (data.whatsapp || '').toString().replace(/\s+/g, '').slice(0, 20);
    if (!name) throw new Error('gmSubmitTableReservation: name is required');
    if (!whatsapp) throw new Error('gmSubmitTableReservation: whatsapp is required');

    var reservation = {
      id: generateReservationId(),
      name: name,
      countryCode: (data.countryCode || '970').toString().trim(),
      whatsapp: whatsapp,
      datetime: (data.datetime || '').toString().trim(),
      peopleCount: parseInt(data.peopleCount, 10) >= 1 ? parseInt(data.peopleCount, 10) : null,
      tableId: data.tableId || null,
      note: (data.note || '').toString().trim().slice(0, 300),
      status: 'pending',
      createdAt: Date.now()
    };

    var list = getStoredReservations();
    var createdCount = getReservationsCreatedCount();
    list.unshift(reservation);
    setStoredReservations(list);
    setReservationsCreatedCount(createdCount + 1);

    addNotification({
      icon: 'calendar-check',
      title: 'وصلك طلب حجز جديد',
      sub: name
    });

    if (typeof window.renderReservationsPage === 'function') {
      window.renderReservationsPage();
    }

    return reservation;
  }

  window.gmSubmitTableReservation = gmSubmitTableReservation;

  function renderReservationsPage() {
    var tbody = document.getElementById('res-table-body');
    var cardsWrap = document.getElementById('res-cards-wrap');
    var dataWrap = document.getElementById('res-data-wrap');
    var emptyState = document.getElementById('res-empty-state');
    var searchInput = document.getElementById('res-search-input');
    var searchClearBtn = document.getElementById('res-search-clear');
    var searchEmptyState = document.getElementById('res-search-empty');
    var tableCard = document.getElementById('res-table-card');
    var statPendingEl = document.getElementById('res-stat-pending');
    var statConfirmedEl = document.getElementById('res-stat-confirmed');
    var statTotalEl = document.getElementById('res-stat-total');

    var list = getStoredReservations();
    var pendingCount = 0;
    var confirmedCount = 0;

    list.forEach(function (res) {
      if (res.status === 'pending') pendingCount++;
      if (res.status === 'confirmed') confirmedCount++;
    });

    updateReservationsNavBadge(pendingCount);

    if (!tbody) return;

    var tablesById = {};
    getStoredTables().forEach(function (tb) { tablesById[tb.id] = tb; });

    var searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (searchClearBtn) searchClearBtn.style.display = searchQuery ? '' : 'none';

    var visibleList = searchQuery
      ? list.filter(function (res) { return (res.name || '').toLowerCase().indexOf(searchQuery) !== -1; })
      : list;

    var rowsHtml = '';
    var cardsHtml = '';

    visibleList.forEach(function (res) {
      var whatsappDisplay = '+' + (res.countryCode || '970') + res.whatsapp;
      var avatarLetter = escapeHtml((res.name || '').trim().charAt(0) || '؟');
      var statusBadge = buildReservationStatusBadge(res.status);
      var dateLabel = res.datetime ? formatReservationDateTime(res.datetime) : '\u2014';
      var table = res.tableId ? (tablesById[res.tableId] || null) : null;
      var tableLabel = table ? escapeHtml(table.name) : (res.tableId ? 'طاولة محذوفة' : 'بدون تحديد');
      var peopleLine = res.peopleCount ? (escapeHtml(String(res.peopleCount)) + ' أشخاص') : '';

      var rowActionsHtml = '';
      var cardActionsHtml = '';
      if (res.status === 'pending') {
        rowActionsHtml =
          '<button type="button" class="btn btn-primary btn-sm" data-action="confirm-reservation" data-id="' + escapeHtml(res.id) + '">تأكيد</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-action="cancel-reservation" data-id="' + escapeHtml(res.id) + '">إلغاء</button>';
        cardActionsHtml =
          '<button type="button" class="btn btn-sm btn-primary" data-action="confirm-reservation" data-id="' + escapeHtml(res.id) + '">' +
            '<i data-lucide="check" class="icon"></i> تأكيد' +
          '</button>' +
          '<button type="button" class="btn btn-sm btn-danger" data-action="cancel-reservation" data-id="' + escapeHtml(res.id) + '">' +
            '<i data-lucide="x" class="icon"></i> إلغاء' +
          '</button>';
      } else if (res.status === 'confirmed') {
        rowActionsHtml =
          '<button type="button" class="btn btn-danger btn-sm" data-action="cancel-reservation" data-id="' + escapeHtml(res.id) + '">إلغاء الحجز</button>';
        cardActionsHtml =
          '<button type="button" class="btn btn-sm btn-danger" data-action="cancel-reservation" data-id="' + escapeHtml(res.id) + '">' +
            '<i data-lucide="x" class="icon"></i> إلغاء الحجز' +
          '</button>';
      } else {
        rowActionsHtml =
          '<button type="button" class="icon-btn" data-action="delete-reservation" data-id="' + escapeHtml(res.id) + '" aria-label="حذف" title="حذف"><i data-lucide="trash-2" class="icon"></i></button>';
        cardActionsHtml =
          '<button type="button" class="btn btn-sm btn-ghost" data-action="delete-reservation" data-id="' + escapeHtml(res.id) + '">' +
            '<i data-lucide="trash-2" class="icon"></i> حذف' +
          '</button>';
      }

      rowsHtml +=
        '<tr>' +
          '<td><div class="flex gap-12">' +
              '<div class="avatar">' + avatarLetter + '</div>' +
              '<div>' +
                '<div style="font-weight:700;">' + escapeHtml(res.name) + '</div>' +
                (peopleLine ? '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' + peopleLine + '</div>' : '') +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td><div class="flex gap-8">' +
              '<i data-lucide="message-circle" class="icon" style="color:var(--db-text-tertiary);"></i>' +
              '<span class="mono">' + escapeHtml(whatsappDisplay) + '</span>' +
            '</div></td>' +
          '<td class="mono" style="direction:ltr;text-align:right;">' + dateLabel + '</td>' +
          '<td>' + tableLabel + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td><div class="flex gap-8">' + rowActionsHtml + '</div></td>' +
        '</tr>';

      cardsHtml +=
        '<div class="sub-card" data-id="' + escapeHtml(res.id) + '">' +
          '<div class="sub-card-top">' +
            statusBadge +
            '<div class="sub-card-name">' + escapeHtml(res.name) + '</div>' +
          '</div>' +
          '<div class="sub-card-row mono">' +
            '<i data-lucide="message-circle" class="icon"></i>' +
            '<span>' + escapeHtml(whatsappDisplay) + '</span>' +
          '</div>' +
          '<div class="sub-card-row">' + dateLabel + ' \u00b7 ' + tableLabel + (peopleLine ? ' \u00b7 ' + peopleLine : '') + '</div>' +
          (res.note ? '<div class="sub-card-note">' + escapeHtml(res.note) + '</div>' : '') +
          '<div class="sub-card-actions" style="grid-template-columns:repeat(' + (res.status === 'pending' ? 2 : 1) + ',1fr);">' +
            cardActionsHtml +
          '</div>' +
        '</div>';
    });

    tbody.innerHTML = rowsHtml;
    if (cardsWrap) cardsWrap.innerHTML = cardsHtml;

    if (statPendingEl) statPendingEl.textContent = String(pendingCount);
    if (statConfirmedEl) statConfirmedEl.textContent = String(confirmedCount);
    if (statTotalEl) statTotalEl.textContent = String(list.length);

    var reservationsUsageEl = document.getElementById('res-usage-counter');
    if (reservationsUsageEl) {
      var reservationsUsage = gmGetReservationLimitStatus();
      if (reservationsUsage.unlimited) {
        reservationsUsageEl.style.display = 'none';
      } else {
        reservationsUsageEl.textContent = reservationsUsage.used + ' من ' + reservationsUsage.limit + ' ' + LIMIT_NOUNS.reservations +
          (reservationsUsage.canAdd ? '' : ' — وصلت للحد الأقصى');
        reservationsUsageEl.style.display = '';
      }
    }

    if (dataWrap && emptyState) {
      var hasReservations = list.length > 0;
      dataWrap.style.display = hasReservations ? '' : 'none';
      emptyState.style.display = hasReservations ? 'none' : '';
    }

    if (list.length > 0) {
      var hasVisibleResults = visibleList.length > 0;
      if (tableCard) tableCard.style.display = hasVisibleResults ? '' : 'none';
      if (cardsWrap) cardsWrap.style.display = hasVisibleResults ? '' : 'none';
      if (searchEmptyState) searchEmptyState.style.display = hasVisibleResults ? 'none' : '';
    } else if (searchEmptyState) {
      searchEmptyState.style.display = 'none';
    }

    bootIcons();
  }

  window.renderReservationsPage = renderReservationsPage;

  function initReservationsSearch() {
    var searchInput = document.getElementById('res-search-input');
    var searchClearBtn = document.getElementById('res-search-clear');
    if (!searchInput) return;

    searchInput.addEventListener('input', debounce(function () {
      renderReservationsPage();
    }, 150));

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', function () {
        searchInput.value = '';
        renderReservationsPage();
        searchInput.focus();
      });
    }
  }

  function updateReservationsNavBadge(count) {
    document.querySelectorAll('.nav-item[data-page="reservations"] .nav-item-badge, .mobile-nav-item[data-page="reservations"] .mobile-nav-badge').forEach(function (el) {
      el.remove();
    });
    if (!count) return;

    var navItem = document.querySelector('.nav-item[data-page="reservations"]');
    if (navItem) {
      var badge = document.createElement('span');
      badge.className = 'nav-item-badge';
      badge.textContent = String(count);
      navItem.appendChild(badge);
    }

    var mobileNavItem = document.querySelector('.mobile-nav-item[data-page="reservations"]');
    if (mobileNavItem) {
      var dot = document.createElement('span');
      dot.className = 'mobile-nav-badge';
      mobileNavItem.appendChild(dot);
    }
  }

  function initReservationActions() {
    document.addEventListener('click', function (e) {
      var confirmBtn = e.target.closest && e.target.closest('[data-action="confirm-reservation"]');
      if (confirmBtn) {
        var idToConfirm = confirmBtn.getAttribute('data-id');
        var resToConfirm = findReservationById(idToConfirm);
        if (!resToConfirm) return;

        openConfirmModal({
          icon: 'calendar-check',
          danger: false,
          title: 'تأكيد الحجز؟',
          message: 'رح يتم تأكيد حجز «<strong>' + escapeHtml(resToConfirm.name) + '</strong>»' +
            (resToConfirm.tableId ? ' وتصير الطاولة مستخدمة تلقائياً.' : '.'),
          confirmLabel: 'تأكيد الحجز',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var reservations = getStoredReservations();
            for (var i = 0; i < reservations.length; i++) {
              if (reservations[i].id === idToConfirm) {
                reservations[i].status = 'confirmed';
                break;
              }
            }
            setStoredReservations(reservations);

            if (resToConfirm.tableId) {
              var tables = getStoredTables();
              for (var j = 0; j < tables.length; j++) {
                if (tables[j].id === resToConfirm.tableId) {
                  tables[j].status = 'occupied';
                  break;
                }
              }
              setStoredTables(tables);
              if (typeof window.renderTablesPage === 'function') window.renderTablesPage();
            }

            renderReservationsPage();
            showToast('تم تأكيد الحجز', { icon: 'calendar-check' });
          }
        });
        return;
      }

      var cancelBtn = e.target.closest && e.target.closest('[data-action="cancel-reservation"]');
      if (cancelBtn) {
        var idToCancel = cancelBtn.getAttribute('data-id');
        var resToCancel = findReservationById(idToCancel);
        var nameHtml = resToCancel ? '<strong>' + escapeHtml(resToCancel.name) + '</strong>' : 'هذا الحجز';
        var wasConfirmed = !!(resToCancel && resToCancel.status === 'confirmed');

        openConfirmModal({
          icon: 'x',
          danger: true,
          title: 'إلغاء الحجز؟',
          message: 'سيتم إلغاء حجز «' + nameHtml + '»' +
            (wasConfirmed && resToCancel.tableId ? ' وتصير الطاولة متاحة من جديد.' : '.'),
          confirmLabel: 'إلغاء الحجز',
          cancelLabel: 'تراجع',
          onConfirm: function () {
            var reservations = getStoredReservations();
            for (var i = 0; i < reservations.length; i++) {
              if (reservations[i].id === idToCancel) {
                reservations[i].status = 'cancelled';
                break;
              }
            }
            setStoredReservations(reservations);

            if (wasConfirmed && resToCancel.tableId) {
              var tables = getStoredTables();
              for (var j = 0; j < tables.length; j++) {
                if (tables[j].id === resToCancel.tableId) {
                  tables[j].status = 'available';
                  break;
                }
              }
              setStoredTables(tables);
              if (typeof window.renderTablesPage === 'function') window.renderTablesPage();
            }

            renderReservationsPage();
            showToast('تم إلغاء الحجز', { icon: 'x', danger: true });
          }
        });
        return;
      }

      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-reservation"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف الحجز؟',
          message: 'سيتم حذف هذا الطلب نهائياً من السجل.',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredReservations().filter(function (r) {
              return r.id !== idToDelete;
            });
            setStoredReservations(remaining);
            renderReservationsPage();
          }
        });
        return;
      }
    });
  }

  function setContactRow(rowId, iconName, value, hrefBuilder) {
    var row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';

    if (value) {
      var a = document.createElement('a');
      a.className = 'mono';
      a.textContent = value;
      var href = hrefBuilder ? hrefBuilder(value) : null;
      if (href) {
        a.href = href;
        if (href.indexOf('http') === 0) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
      }
      row.appendChild(a);
    } else {
      var span = document.createElement('span');
      span.className = 'mono text-muted';
      span.textContent = '—';
      row.appendChild(span);
    }

    var icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    icon.className = 'icon contact-icon';
    row.appendChild(icon);
  }

  function applyProfileSubText(profile) {
    var typeConfig = getStoreTypeConfig();
    var typeLabel = typeConfig ? typeConfig.label : 'مساحة عمل';
    var regionText = (profile && profile.regionLabel) || 'لم تحدد المنطقة بعد';
    var text = regionText + ' · ' + getTypeLabelWithSubCategory(typeLabel);
    var topbarSub = document.getElementById('profile-sub-text');
    if (topbarSub) topbarSub.textContent = text;
    var pageSub = document.getElementById('profile-page-sub');
    if (pageSub) pageSub.textContent = text;
  }

  function setAvatarElement(el, image, text, useLogo) {
    if (!el) return;
    el.classList.remove('avatar--logo');
    el.style.backgroundColor = '';
    if (image) {
      el.style.backgroundImage = toCssUrl(image);
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = '';
      el.textContent = '';
      return;
    }
    if (useLogo) {
      el.classList.add('avatar--logo');
      el.style.backgroundImage = 'url("' + LOGO_URL + '")';
      el.style.backgroundSize = '68%';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundColor = '#ffffff';
      el.textContent = '';
      return;
    }
    el.style.backgroundImage = '';
    el.style.backgroundSize = '';
    el.style.backgroundPosition = '';
    el.style.backgroundRepeat = '';
    el.textContent = text;
  }

  function applyIdentityToUI(profile) {
    var hasName = !!(profile && profile.name);
    var displayName = hasName ? profile.name : getFallbackName();
    var avatarText = hasName ? (Array.from(profile.name.trim())[0] || getFallbackAvatarLetter()) : getFallbackAvatarLetter();
    var image = profile && profile.image ? profile.image : null;

    ['hero-user-name', 'profile-name-text', 'udTopnavUsername'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = displayName;
    });
    setAvatarElement(document.getElementById('profile-avatar-letter'), image, avatarText, false);
    setAvatarElement(document.querySelector('.ud-topnav-avatar'), image, avatarText, false);
  }

  function applyProfileToUI(profile) {
    applyProfileSubText(profile);
    applyIdentityToUI(profile);
    if (!profile) {
      var emptyProfileName = document.getElementById('profile-page-name');
      if (emptyProfileName) emptyProfileName.textContent = getFallbackName();
      return;
    }

    var emptyBox = document.getElementById('location-empty');
    var filledBox = document.getElementById('location-filled');
    var hasLocation = isValidCoordinate(profile.lat, -90, 90) && isValidCoordinate(profile.lng, -180, 180);
    if (emptyBox && filledBox) {
      emptyBox.style.display = hasLocation ? 'none' : '';
      filledBox.style.display = hasLocation ? '' : 'none';
    }

    var ppAvatar = document.getElementById('profile-page-avatar');
    if (ppAvatar) {
      if (profile.image) {
        ppAvatar.style.backgroundImage = toCssUrl(profile.image);
        ppAvatar.textContent = '';
      } else {
        ppAvatar.style.backgroundImage = '';
        ppAvatar.textContent = (profile.name || getFallbackAvatarLetter()).trim().charAt(0) || getFallbackAvatarLetter();
      }
    }

    var ppName = document.getElementById('profile-page-name');
    if (ppName) ppName.textContent = profile.name || getFallbackName();

    var ppAddress = document.getElementById('profile-address-value');
    if (ppAddress) ppAddress.textContent = profile.address || '—';

    setContactRow('profile-phone-row', 'phone', profile.phone, function (v) {
      return 'tel:' + v.replace(/\s+/g, '');
    });
    setContactRow('profile-whatsapp-row', 'message-circle', profile.whatsapp, function (v) {
      return 'https://wa.me/' + v.replace(/[^0-9]/g, '');
    });

    var mapLink = document.getElementById('profile-map-link');
    var mapEmptyText = document.getElementById('profile-map-empty-text');
    if (mapLink && mapEmptyText) {
      if (hasLocation) {
        mapLink.href = 'https://www.google.com/maps?q=' + profile.lat + ',' + profile.lng;
        mapLink.style.display = '';
        mapEmptyText.style.display = 'none';
      } else {
        mapLink.style.display = 'none';
        mapEmptyText.style.display = '';
      }
    }

    var publicLinkEl = document.getElementById('profile-public-link');
    if (publicLinkEl) publicLinkEl.textContent = getPublicUrl(profile);

    bootIcons();
  }

  function applyOpenStatusToUI(isOpen) {
    document.querySelectorAll('[data-action="toggle-open"]').forEach(function (el) {
      el.classList.toggle('on', isOpen);
    });

    var pill = document.getElementById('hero-status-pill');
    var pillText = document.getElementById('hero-status-text');
    if (pill && pillText) {
      pill.classList.toggle('closed', !isOpen);
      pillText.textContent = isOpen ? 'مفتوح' : 'مغلق حالياً';
    }

    var profilePill = document.getElementById('profile-status-pill');
    var profilePillText = document.getElementById('profile-status-text');
    if (profilePill && profilePillText) {
      profilePill.classList.toggle('closed', !isOpen);
      profilePillText.textContent = isOpen ? 'مفتوح' : 'مغلق حالياً';
    }

    document.querySelectorAll('.js-open-status-title').forEach(function (el) {
      el.textContent = isOpen ? 'مساحة مفتوحة' : 'مساحة مغلقة';
    });
    document.querySelectorAll('.js-open-status-sub').forEach(function (el) {
      el.textContent = isOpen ? 'الزبائن يستطيعون الطلب الآن' : 'غير متاح لاستقبال الطلبات حالياً';
    });
  }

  function toVisitCount(value) {
    var n = parseInt(value, 10);
    return n > 0 ? n : 0;
  }

  function getStoredVisits() {
    var visits = { today: 0, week: 0, total: 0 };
    try {
      var data = parseStoredObject(localStorage.getItem(scopedKey(VISITS_STORAGE_KEY)));
      if (data) {
        visits.today = toVisitCount(data.today);
        visits.week = toVisitCount(data.week);
        visits.total = toVisitCount(data.total);
      }
    } catch (err) {}
    return visits;
  }

  function applyVisitsToUI() {
    var visits = getStoredVisits();
    [
      ['.js-visits-today', visits.today],
      ['.js-visits-week', visits.week],
      ['.js-visits-total', visits.total]
    ].forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        el.textContent = String(pair[1]);
      });
    });
  }

  function initOpenStatusToggle() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-action="toggle-open"]');
      if (!el) return;
      var next = !getStoredOpenStatus();
      setStoredOpenStatus(next);
      applyOpenStatusToUI(next);
    });
  }

  function initProfilePageExtras() {
    var copyBtn = document.getElementById('profile-copy-link-btn');
    var linkEl = document.getElementById('profile-public-link');
    if (!copyBtn) return;

    var originalHTML = copyBtn.innerHTML;
    var resetTimer = null;

    function showCopied() {
      showToast('تم نسخ الرابط', { icon: 'check', duration: 2000 });
      copyBtn.innerHTML = '<i data-lucide="check" class="icon"></i> تم النسخ';
      bootIcons();
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        copyBtn.innerHTML = originalHTML;
        bootIcons();
      }, 1500);
    }

    copyBtn.addEventListener('click', function () {
      var linkText = linkEl ? linkEl.textContent : '';
      if (!linkText) return;

      copyText(linkText).then(showCopied, function () {
        showToast('تعذّر نسخ الرابط', { icon: 'x', danger: true });
      });
    });
  }

  function initCopyLinkButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="copy-public-link"]');
      if (!btn) return;

      var profile = getStoredProfile();
      if (!profile) {
        showToast('احفظ بيانات مساحتك أولاً', { icon: 'info', danger: true });
        return;
      }

      copyText(getPublicUrl(profile)).then(function () {
        showToast('تم نسخ الرابط', { icon: 'check', duration: 2000 });
      }, function () {
        showToast('تعذّر نسخ الرابط', { icon: 'x', danger: true });
      });
    });
  }

  function initProfileEditPanel() {
    var panel = document.getElementById('pep-panel');
    var scrim = document.getElementById('pep-scrim');
    if (!panel) return;

    var nameInput = document.getElementById('pep-name');
    var regionSelect = document.getElementById('pep-region');
    var addressInput = document.getElementById('pep-address');
    var phoneInput = document.getElementById('pep-phone');
    var whatsappInput = document.getElementById('pep-whatsapp');
    var avatarPreview = document.getElementById('pep-avatar-preview');
    var imageInput = document.getElementById('pep-image-input');
    var uploadTriggerBtn = document.getElementById('pep-upload-btn');
    var mapBox = document.getElementById('pep-map');
    var mapPin = document.getElementById('pep-map-pin');
    var coordsStatus = document.getElementById('pep-coords-status');
    var coordsValue = document.getElementById('pep-coords-value');
    var useLocationBtn = document.getElementById('pep-use-my-location');
    var saveBtn = document.getElementById('pep-save-btn');

    var pendingImageDataUrl = null;
    var pendingLat = null;
    var pendingLng = null;

    function updatePinDisplay() {
      if (pendingLat === null || pendingLng === null) {
        mapPin.style.display = 'none';
        coordsStatus.textContent = 'أو انقر على الخريطة لتحديد الموقع';
        coordsStatus.classList.remove('pep-set');
        coordsValue.textContent = '';
        return;
      }
      coordsStatus.textContent = 'تم';
      coordsStatus.classList.add('pep-set');
      coordsValue.textContent = pendingLat.toFixed(5) + ', ' + pendingLng.toFixed(5);
    }

    function setPinFromRelative(relX, relY) {
      var lngRange = 0.06;
      var latRange = 0.05;
      pendingLng = GAZA_LNG - lngRange / 2 + relX * lngRange;
      pendingLat = GAZA_LAT + latRange / 2 - relY * latRange;
      mapPin.style.left = (relX * 100) + '%';
      mapPin.style.top = (relY * 100) + '%';
      mapPin.style.display = 'block';
      updatePinDisplay();
    }

    function open() {
      var profile = getStoredProfile() || {};
      if (nameInput) nameInput.value = profile.name || '';
      if (regionSelect) regionSelect.value = profile.region || '';
      if (addressInput) addressInput.value = profile.address || '';
      if (phoneInput) phoneInput.value = profile.phone || '';
      if (whatsappInput) whatsappInput.value = profile.whatsapp || '';

      pendingImageDataUrl = profile.image || null;
      pendingLat = isValidCoordinate(profile.lat, -90, 90) ? profile.lat : null;
      pendingLng = isValidCoordinate(profile.lng, -180, 180) ? profile.lng : null;

      if (pendingImageDataUrl) {
        avatarPreview.style.backgroundImage = toCssUrl(pendingImageDataUrl);
        avatarPreview.textContent = '';
      } else {
        avatarPreview.style.backgroundImage = '';
        avatarPreview.textContent = (profile.name || getFallbackAvatarLetter()).trim().charAt(0);
      }

      updatePinDisplay();

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-profile-edit"]');
      if (openTrigger) {
        closeMobileMoreSheet();
        open();
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-profile-edit"]');
      if (closeTrigger) {
        close();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (mapBox) {
      mapBox.addEventListener('click', function (e) {
        var rect = mapBox.getBoundingClientRect();
        var relX = (e.clientX - rect.left) / rect.width;
        var relY = (e.clientY - rect.top) / rect.height;
        relX = Math.max(0, Math.min(1, relX));
        relY = Math.max(0, Math.min(1, relY));
        setPinFromRelative(relX, relY);
      });
    }

    if (useLocationBtn) {
      useLocationBtn.addEventListener('click', function () {
        if (!navigator.geolocation) return;
        coordsStatus.textContent = 'جارِ تحديد موقعك…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          pendingLat = pos.coords.latitude;
          pendingLng = pos.coords.longitude;
          mapPin.style.left = '50%';
          mapPin.style.top = '50%';
          mapPin.style.display = 'block';
          updatePinDisplay();
        }, function () {
          coordsStatus.textContent = 'تعذّر تحديد موقعك';
          coordsStatus.classList.remove('pep-set');
        });
      });
    }

    if (imageInput) {
      imageInput.addEventListener('change', function () {
        var file = imageInput.files && imageInput.files[0];
        if (!file) return;
        compressImageFile(file, 480, 0.85, function (dataUrl) {
          pendingImageDataUrl = dataUrl;
          avatarPreview.style.backgroundImage = toCssUrl(pendingImageDataUrl);
          avatarPreview.textContent = '';
        });
      });
    }

    if (uploadTriggerBtn && imageInput) {
      uploadTriggerBtn.addEventListener('click', function () {
        imageInput.click();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var regionLabel = '';
        if (regionSelect && regionSelect.selectedIndex >= 0) {
          var opt = regionSelect.options[regionSelect.selectedIndex];
          if (opt && opt.value) regionLabel = opt.textContent;
        }
        var profile = Object.assign({}, getStoredProfile() || {}, {
          name: nameInput ? nameInput.value.trim() : '',
          region: regionSelect ? regionSelect.value : '',
          regionLabel: regionLabel,
          address: addressInput ? addressInput.value.trim() : '',
          phone: phoneInput ? phoneInput.value.trim() : '',
          whatsapp: whatsappInput ? whatsappInput.value.trim() : '',
          image: pendingImageDataUrl,
          lat: pendingLat,
          lng: pendingLng
        });
        setStoredProfile(profile);
        applyProfileToUI(profile);
        close();
      });
    }
  }

  function initPricesHoursEditPanel() {
    var panel = document.getElementById('phe-panel');
    var scrim = document.getElementById('phe-scrim');
    if (!panel) return;

    var priceHourInput = document.getElementById('phe-price-hour');
    var priceHalfDayInput = document.getElementById('phe-price-half-day');
    var priceFullDayInput = document.getElementById('phe-price-full-day');
    var priceWeekInput = document.getElementById('phe-price-week');
    var priceMonthInput = document.getElementById('phe-price-month');
    var openTimeInput = document.getElementById('phe-open-time');
    var closeTimeInput = document.getElementById('phe-close-time');
    var seatsTotalInput = document.getElementById('phe-seats-total');
    var seatsAvailableInput = document.getElementById('phe-seats-available');
    var saveBtn = document.getElementById('phe-save-btn');

    function open() {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();

      var data = getStoredPricesHours() || {};
      if (priceHourInput) priceHourInput.value = data.priceHour != null ? data.priceHour : '';
      if (priceHalfDayInput) priceHalfDayInput.value = data.priceHalfDay != null ? data.priceHalfDay : '';
      if (priceFullDayInput) priceFullDayInput.value = data.priceFullDay != null ? data.priceFullDay : '';
      if (priceWeekInput) priceWeekInput.value = data.priceWeek != null ? data.priceWeek : '';
      if (priceMonthInput) priceMonthInput.value = data.priceMonth != null ? data.priceMonth : '';
      if (openTimeInput) openTimeInput.value = data.openTime || '';
      if (closeTimeInput) closeTimeInput.value = data.closeTime || '';
      if (seatsTotalInput) seatsTotalInput.value = data.seatsTotal != null ? data.seatsTotal : '';
      if (seatsAvailableInput) seatsAvailableInput.value = data.seatsAvailable != null ? data.seatsAvailable : '';

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-prices-edit"]');
      if (openTrigger) {
        e.preventDefault();
        open();
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-prices-edit"]');
      if (closeTrigger) {
        close();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var data = {
          priceHour: priceHourInput && priceHourInput.value !== '' ? Number(priceHourInput.value) : null,
          priceHalfDay: priceHalfDayInput && priceHalfDayInput.value !== '' ? Number(priceHalfDayInput.value) : null,
          priceFullDay: priceFullDayInput && priceFullDayInput.value !== '' ? Number(priceFullDayInput.value) : null,
          priceWeek: priceWeekInput && priceWeekInput.value !== '' ? Number(priceWeekInput.value) : null,
          priceMonth: priceMonthInput && priceMonthInput.value !== '' ? Number(priceMonthInput.value) : null,
          openTime: openTimeInput ? openTimeInput.value : '',
          closeTime: closeTimeInput ? closeTimeInput.value : '',
          seatsTotal: seatsTotalInput && seatsTotalInput.value !== '' ? Number(seatsTotalInput.value) : null,
          seatsAvailable: seatsAvailableInput && seatsAvailableInput.value !== '' ? Number(seatsAvailableInput.value) : null
        };
        setStoredPricesHours(data);
        close();
      });
    }
  }

  function getCurrentTypeServices() {
    var config = getStoreTypeConfig();
    return (config && Array.isArray(config.services)) ? config.services : [];
  }

  function renderServiceRows() {
    var container = document.getElementById('sve-rows');
    if (!container) return;
    var services = getCurrentTypeServices();
    container.innerHTML = services.map(function (svc) {
      var lockedKey = getServiceLockedFeatureKey(svc.id);
      var locked = isServiceLocked(svc.id);
      var iconHtml = svc.icon
        ? '<div class="sve-row-icon"><i data-lucide="' + safeIcon(svc.icon) + '" class="icon"></i></div>'
        : '';
      return (
        '<div class="sve-row">' +
          iconHtml +
          '<div class="switch" id="sve-switch-' + escapeHtml(svc.id) + '"' + (locked ? ' data-locked-feature="' + escapeHtml(lockedKey) + '"' : '') + '></div>' +
          '<span class="sve-row-label">' + escapeHtml(svc.label) + (locked ? ' <i data-lucide="lock" class="icon" style="width:14px;height:14px;vertical-align:middle;"></i>' : '') + '</span>' +
          '<input type="text" id="sve-details-' + escapeHtml(svc.id) + '" class="sve-details-input" placeholder="' + (locked ? LOCK_OVERLAY_TEXT : 'تفاصيل إضافية (اختياري)...') + '"' + (locked ? ' disabled' : '') + '>' +
        '</div>'
      );
    }).join('');

    container.querySelectorAll('.switch').forEach(function (el) {
      el.setAttribute('role', 'switch');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', function () {
        el.classList.toggle('on');
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  function initServicesEditPanel() {
    var panel = document.getElementById('sve-panel');
    var scrim = document.getElementById('sve-scrim');
    if (!panel) return;

    var saveBtn = document.getElementById('sve-save-btn');

    function open() {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();

      renderServiceRows();
      var services = getCurrentTypeServices();
      var data = getStoredServices() || {};
      services.forEach(function (svc) {
        var switchEl = document.getElementById('sve-switch-' + svc.id);
        var detailsInput = document.getElementById('sve-details-' + svc.id);
        var entry = data[svc.id] || {};
        var lockedSvc = isServiceLocked(svc.id);
        if (switchEl) switchEl.classList.toggle('on', !lockedSvc && !!entry.enabled);
        if (detailsInput) detailsInput.value = lockedSvc ? '' : (entry.details || '');
      });
      applyLockedFeaturesToUI();
      bootIcons();

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-services-edit"]');
      if (openTrigger) {
        e.preventDefault();
        open();
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-services-edit"]');
      if (closeTrigger) {
        close();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var services = getCurrentTypeServices();
        var data = {};
        services.forEach(function (svc) {
          var switchEl = document.getElementById('sve-switch-' + svc.id);
          var detailsInput = document.getElementById('sve-details-' + svc.id);
          data[svc.id] = {
            enabled: !!(switchEl && switchEl.classList.contains('on')),
            details: detailsInput ? detailsInput.value.trim() : ''
          };
        });
        setStoredServices(data);
        close();
      });
    }
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

  var DURATION_LABELS = { day: 'يومي', week: 'أسبوعي', month: 'شهري' };

  function computeSubscriberExpiryDate(subscriber) {
    var start = parseISODate(subscriber.startDate);
    if (subscriber.duration === 'day') return addDaysToDate(start, 1);
    if (subscriber.duration === 'week') return addDaysToDate(start, 7);
    return addMonthsToDate(start, 1);
  }

  function isSubscriberExpired(subscriber) {
    var expiry = computeSubscriberExpiryDate(subscriber);
    var today = parseISODate(getTodayISODate());
    return expiry.getTime() < today.getTime();
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

  var IMAGE_MAX_FILE_BYTES = 10 * 1024 * 1024;
  var IMAGE_ALLOWED_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;

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

  var storageErrorShownAt = 0;

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

  function initLogoutAction() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="logout"]');
      if (!btn) return;
      if (!window.GMAuth || typeof window.GMAuth.logout !== 'function') return;

      e.preventDefault();
      e.stopPropagation();

      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();

      openConfirmModal({
        icon: 'log-out',
        danger: true,
        title: 'تسجيل الخروج؟',
        message: 'هل أنت متأكد أنك تريد تسجيل الخروج من لوحة التحكم؟',
        confirmLabel: 'تسجيل الخروج',
        cancelLabel: 'إلغاء',
        onConfirm: function () {
          window.GMAuth.logout();
        }
      });
    }, true);
  }

  function findSubscriberById(id) {
    var list = getStoredSubscribers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function buildSubscriberStatusBadge(sub, expired) {
    if (sub.stopped) return '<span class="badge gray"><span>\u25cf</span> متوقف</span>';
    if (expired) return '<span class="badge red"><span>\u25cf</span> منتهي</span>';
    return '<span class="badge green"><span>\u25cf</span> نشط</span>';
  }

  function renderSubscribersPage() {
    var tbody = document.getElementById('sub-table-body');
    var cardsWrap = document.getElementById('sub-cards-wrap');
    var dataWrap = document.getElementById('sub-data-wrap');
    var emptyState = document.getElementById('sub-empty-state');
    var statExpiredEl = document.getElementById('sub-stat-expired');
    var statActiveEl = document.getElementById('sub-stat-active');
    var statTotalEl = document.getElementById('sub-stat-total');
    if (!tbody) return;

    var list = getStoredSubscribers();
    var expiredCount = 0;
    var activeCount = 0;

    var rowsHtml = '';
    var cardsHtml = '';

    list.forEach(function (sub) {
      var startDate = parseISODate(sub.startDate);
      var expiryDate = computeSubscriberExpiryDate(sub);
      var expired = isSubscriberExpired(sub);

      if (sub.stopped) {
      } else if (expired) {
        expiredCount++;
      } else {
        activeCount++;
      }

      var statusBadge = buildSubscriberStatusBadge(sub, expired);
      var whatsappDisplay = '+' + (sub.countryCode || '970') + sub.whatsapp;
      var avatarLetter = escapeHtml((sub.name || '').trim().charAt(0) || '؟');
      var todayForDiff = parseISODate(getTodayISODate());
      var diffDays = Math.round((expiryDate.getTime() - todayForDiff.getTime()) / 86400000);
      var remainingLine = diffDays >= 0
        ? 'متبقي ' + diffDays + ' يوم'
        : 'منتهي منذ ' + Math.abs(diffDays) + ' يوم';
      var durationLabel = DURATION_LABELS[sub.duration] || sub.duration;

      rowsHtml +=
        '<tr>' +
          '<td><div class="flex gap-12">' +
              '<div class="avatar">' + avatarLetter + '</div>' +
              '<div>' +
                '<div style="font-weight:700;">' + escapeHtml(sub.name) + '</div>' +
                (sub.note ? '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' + escapeHtml(sub.note) + '</div>' : '') +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td><div class="flex gap-8">' +
              '<i data-lucide="message-circle" class="icon" style="color:var(--db-text-tertiary);"></i>' +
              '<span class="mono">' + escapeHtml(whatsappDisplay) + '</span>' +
            '</div></td>' +
          '<td>' + durationLabel + '</td>' +
          '<td>' +
              '<div>' + formatDisplayDate(expiryDate) + '</div>' +
              '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' + remainingLine + '</div>' +
            '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' +
            '<div class="flex gap-8">' +
              '<button type="button" class="icon-btn" data-action="delete-subscriber" data-id="' + escapeHtml(sub.id) + '" aria-label="حذف" title="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="stop-subscriber" data-id="' + escapeHtml(sub.id) + '" aria-label="إيقاف" title="إيقاف"><i data-lucide="ban" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="renew-subscriber" data-id="' + escapeHtml(sub.id) + '" aria-label="تجديد" title="تجديد"><i data-lucide="refresh-cw" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="edit-subscriber" data-id="' + escapeHtml(sub.id) + '" aria-label="تعديل" title="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
            '</div>' +
          '</td>' +
        '</tr>';

      cardsHtml +=
        '<div class="sub-card" data-id="' + escapeHtml(sub.id) + '">' +
          '<div class="sub-card-top">' +
            statusBadge +
            '<div class="sub-card-name">' + escapeHtml(sub.name) + '</div>' +
          '</div>' +
          '<div class="sub-card-row mono">' +
            '<i data-lucide="message-circle" class="icon"></i>' +
            '<span>' + escapeHtml(whatsappDisplay) + '</span>' +
          '</div>' +
          '<div class="sub-card-row">' +
            durationLabel + ' \u00b7 ' + formatDisplayDate(startDate) + ' \u2190 ' + formatDisplayDate(expiryDate) +
          '</div>' +
          (sub.note ? '<div class="sub-card-note">' + escapeHtml(sub.note) + '</div>' : '') +
          '<div class="sub-card-actions">' +
            '<button type="button" class="btn btn-sm btn-danger" data-action="delete-subscriber" data-id="' + escapeHtml(sub.id) + '">' +
              '<i data-lucide="trash-2" class="icon"></i> حذف' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-action="stop-subscriber" data-id="' + escapeHtml(sub.id) + '">' +
              '<i data-lucide="ban" class="icon"></i> إلغاء' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-action="edit-subscriber" data-id="' + escapeHtml(sub.id) + '">' +
              '<i data-lucide="pencil" class="icon"></i> تعديل' +
            '</button>' +
          '</div>' +
          '<button type="button" class="btn btn-primary sub-card-renew" data-action="renew-subscriber" data-id="' + escapeHtml(sub.id) + '">' +
            '<i data-lucide="refresh-cw" class="icon"></i> تجديد' +
          '</button>' +
        '</div>';
    });

    tbody.innerHTML = rowsHtml;
    if (cardsWrap) cardsWrap.innerHTML = cardsHtml;

    if (statExpiredEl) statExpiredEl.textContent = String(expiredCount);
    if (statActiveEl) statActiveEl.textContent = String(activeCount);
    if (statTotalEl) statTotalEl.textContent = String(list.length);

    if (dataWrap && emptyState) {
      var hasSubscribers = list.length > 0;
      dataWrap.style.display = hasSubscribers ? '' : 'none';
      emptyState.style.display = hasSubscribers ? 'none' : '';
    }

    bootIcons();
  }

  window.renderSubscribersPage = renderSubscribersPage;

  function initSubscriberAddPanel() {
    var panel = document.getElementById('sap-panel');
    var scrim = document.getElementById('sap-scrim');
    if (!panel) return;

    var titleEl = document.getElementById('sap-title');
    var subtitleEl = document.getElementById('sap-subtitle');
    var nameInput = document.getElementById('sap-name');
    var whatsappInput = document.getElementById('sap-whatsapp');
    var countryCodeBtn = document.getElementById('sap-country-code');
    var countryCodeLabel = countryCodeBtn ? countryCodeBtn.querySelector('.phone-cc-text') : null;
    var durationGroup = document.getElementById('sap-duration-group');
    var amountInput = document.getElementById('sap-amount');
    var startDateInput = document.getElementById('sap-start-date');
    var noteInput = document.getElementById('sap-note');
    var saveBtn = document.getElementById('sap-save-btn');
    var saveBtnLabel = saveBtn ? saveBtn.innerHTML : '';

    var selectedDuration = 'month';
    var editingId = null;

    function getCountryCode() {
      return (countryCodeBtn && countryCodeBtn.getAttribute('data-value')) || '970';
    }

    function setCountryCode(value) {
      if (!countryCodeBtn) return;
      var code = String(value || '970');
      countryCodeBtn.setAttribute('data-value', code);
      if (countryCodeLabel) countryCodeLabel.textContent = '+' + code;
      countryCodeBtn.setAttribute('aria-label', 'مفتاح الدولة +' + code + ' — اضغط للتبديل');
    }

    if (countryCodeBtn) {
      countryCodeBtn.addEventListener('click', function () {
        setCountryCode(getCountryCode() === '970' ? '972' : '970');
        if (whatsappInput) whatsappInput.focus();
      });
    }

    function setDuration(value) {
      selectedDuration = value;
      if (!durationGroup) return;
      durationGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
      });
    }

    function resetForm() {
      if (nameInput) nameInput.value = '';
      if (whatsappInput) whatsappInput.value = '';
      setCountryCode('970');
      if (amountInput) amountInput.value = '';
      if (noteInput) noteInput.value = '';
      if (startDateInput) startDateInput.value = getTodayISODate();
      setDuration('month');
    }

    function fillFormFromSubscriber(sub) {
      if (nameInput) nameInput.value = sub.name || '';
      if (whatsappInput) whatsappInput.value = sub.whatsapp || '';
      setCountryCode(sub.countryCode || '970');
      if (amountInput) amountInput.value = sub.amount != null ? sub.amount : '';
      if (noteInput) noteInput.value = sub.note || '';
      if (startDateInput) startDateInput.value = sub.startDate || getTodayISODate();
      setDuration(sub.duration || 'month');
    }

    function open(subscriberToEdit) {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();

      editingId = subscriberToEdit ? subscriberToEdit.id : null;

      if (subscriberToEdit) {
        fillFormFromSubscriber(subscriberToEdit);
        if (titleEl) titleEl.textContent = 'تعديل مشترك';
        if (subtitleEl) subtitleEl.textContent = 'تحديث بيانات اشتراك ' + (subscriberToEdit.name || '');
        if (saveBtn) saveBtn.innerHTML = '<i data-lucide="check" class="icon"></i> حفظ التعديلات';
      } else {
        resetForm();
        if (titleEl) titleEl.textContent = 'إضافة مشترك';
        if (subtitleEl) subtitleEl.textContent = 'أدخل بيانات المشترك الجديد';
        if (saveBtn) saveBtn.innerHTML = saveBtnLabel;
      }

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (nameInput) nameInput.focus();
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      editingId = null;
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-subscriber-add"]');
      if (openTrigger) {
        e.preventDefault();
        open(null);
        return;
      }
      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-subscriber"]');
      if (editTrigger) {
        e.preventDefault();
        var subToEdit = findSubscriberById(editTrigger.getAttribute('data-id'));
        if (subToEdit) open(subToEdit);
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-subscriber-add"]');
      if (closeTrigger) {
        close();
        return;
      }
      var segBtn = e.target.closest && e.target.closest('#sap-duration-group .seg-btn');
      if (segBtn) setDuration(segBtn.getAttribute('data-value'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var name = nameInput ? nameInput.value.trim() : '';
        var whatsapp = whatsappInput ? whatsappInput.value.trim() : '';

        if (!name) { if (nameInput) nameInput.focus(); return; }
        if (!whatsapp) { if (whatsappInput) whatsappInput.focus(); return; }

        var list = getStoredSubscribers();

        if (editingId) {
          var idx = -1;
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === editingId) { idx = i; break; }
          }
          if (idx !== -1) {
            list[idx].name = name;
            list[idx].countryCode = getCountryCode();
            list[idx].whatsapp = whatsapp;
            list[idx].duration = selectedDuration;
            list[idx].amount = amountInput && amountInput.value !== '' ? Number(amountInput.value) : 0;
            list[idx].startDate = startDateInput && startDateInput.value ? startDateInput.value : getTodayISODate();
            list[idx].note = noteInput ? noteInput.value.trim() : '';
          }
        } else {
          var subscriber = {
            id: generateSubscriberId(),
            name: name,
            countryCode: getCountryCode(),
            whatsapp: whatsapp,
            duration: selectedDuration,
            amount: amountInput && amountInput.value !== '' ? Number(amountInput.value) : 0,
            startDate: startDateInput && startDateInput.value ? startDateInput.value : getTodayISODate(),
            note: noteInput ? noteInput.value.trim() : '',
            stopped: false
          };
          list.push(subscriber);
        }

        setStoredSubscribers(list);

        close();

        if (typeof window.renderSubscribersPage === 'function') {
          window.renderSubscribersPage();
        }
      });
    }
  }

  function initSubscriberActions() {
    document.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-subscriber"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        var subToDelete = findSubscriberById(idToDelete);
        var nameHtml = subToDelete ? '<strong>' + escapeHtml(subToDelete.name) + '</strong>' : 'هذا المشترك';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف المشترك؟',
          message: 'سيتم حذف «' + nameHtml + '» نهائياً',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var listAfterDelete = getStoredSubscribers().filter(function (s) {
              return s.id !== idToDelete;
            });
            setStoredSubscribers(listAfterDelete);
            renderSubscribersPage();
          }
        });
        return;
      }

      var stopBtn = e.target.closest && e.target.closest('[data-action="stop-subscriber"]');
      if (stopBtn) {
        var idToStop = stopBtn.getAttribute('data-id');
        var listForStop = getStoredSubscribers();
        var nowStopped = false;
        for (var i = 0; i < listForStop.length; i++) {
          if (listForStop[i].id === idToStop) {
            listForStop[i].stopped = !listForStop[i].stopped;
            nowStopped = listForStop[i].stopped;
            break;
          }
        }
        setStoredSubscribers(listForStop);
        renderSubscribersPage();
        showToast(nowStopped ? 'تم إلغاء الاشتراك' : 'تم إعادة تفعيل الاشتراك', {
          icon: nowStopped ? 'ban' : 'check-circle',
          danger: nowStopped
        });
        return;
      }

      var renewBtn = e.target.closest && e.target.closest('[data-action="renew-subscriber"]');
      if (renewBtn) {
        var idToRenew = renewBtn.getAttribute('data-id');
        var listForRenew = getStoredSubscribers();
        for (var j = 0; j < listForRenew.length; j++) {
          if (listForRenew[j].id === idToRenew) {
            listForRenew[j].startDate = getTodayISODate();
            listForRenew[j].stopped = false;
            break;
          }
        }
        setStoredSubscribers(listForRenew);
        renderSubscribersPage();
        showToast('تم تجديد الاشتراك', { icon: 'refresh-cw' });
        return;
      }
    });
  }

  var AD_TYPE_LABELS = { activity: 'فعالية', workshop: 'ورشة', job: 'وظيفة', offer: 'عرض' };
  var DEFAULT_AD_TYPES = ['activity', 'workshop', 'job', 'offer'];

  function getAllowedAdTypes() {
    var config = getStoreTypeConfig();
    if (config && Array.isArray(config.adTypes) && config.adTypes.length) return config.adTypes;
    return DEFAULT_AD_TYPES;
  }

  function getAdOptions() {
    var config = getStoreTypeConfig();
    return (config && config.adOptions) || {};
  }

  function formatAdPrice(value) {
    var n = Number(value);
    if (!isFinite(n)) return '';
    return String(Math.round(n * 100) / 100) + ' ₪';
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

  function getAdsStorageKey() {
    return scopedKey(ADS_STORAGE_KEY);
  }

  function getStoredAds() {
    try {
      var raw = localStorage.getItem(getAdsStorageKey());
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function setStoredAds(list) {
    try {
      localStorage.setItem(getAdsStorageKey(), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateAdId() {
    return window.GM_ID.generate('ad');
  }

  function getStoredNotifications() {
    try {
      var raw = localStorage.getItem(scopedKey(NOTIFICATIONS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredNotifications(list) {
    try {
      localStorage.setItem(scopedKey(NOTIFICATIONS_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateNotificationId() {
    return window.GM_ID.generate('notif');
  }

  function addNotification(data) {
    var list = getStoredNotifications();
    list.unshift({
      id: generateNotificationId(),
      icon: safeIcon(data.icon, 'bell'),
      title: data.title || '',
      sub: data.sub || '',
      createdAt: Date.now(),
      read: false
    });
    if (list.length > NOTIFICATIONS_MAX) list = list.slice(0, NOTIFICATIONS_MAX);
    setStoredNotifications(list);
    renderNotifications();
  }

  function formatNotifTime(ts) {
    var diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return 'الآن';
    var diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return 'قبل ' + diffMin + ' دقيقة';
    var diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return 'قبل ' + diffHour + ' ساعة';
    var diffDay = Math.floor(diffHour / 24);
    return 'قبل ' + diffDay + ' يوم';
  }

  function renderNotifications() {
    var body = document.getElementById('notifPanelBody');
    var dot = document.getElementById('notifDot');
    if (!body) return;

    var list = getStoredNotifications();
    var hasUnread = list.some(function (n) { return !n.read; });
    if (dot) dot.classList.toggle('show', hasUnread);

    if (!list.length) {
      body.innerHTML = '<div class="notif-empty">ما في إشعارات جديدة</div>';
      return;
    }

    body.innerHTML = list.map(function (n) {
      return (
        '<div class="notif-row' + (n.read ? '' : ' unread') + '">' +
          '<div class="notif-row-icon-wrap">' +
            '<i data-lucide="' + safeIcon(n.icon, 'bell') + '" class="icon"></i>' +
          '</div>' +
          '<div class="notif-row-text">' +
            '<div class="notif-row-title">' + escapeHtml(n.title) + '</div>' +
            (n.sub ? '<div class="notif-row-sub">' + escapeHtml(n.sub) + '</div>' : '') +
            '<div class="notif-row-time">' + formatNotifTime(n.createdAt) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    bootIcons();
  }

  function markAllNotificationsRead() {
    var list = getStoredNotifications();
    var changed = false;
    list.forEach(function (n) {
      if (!n.read) { n.read = true; changed = true; }
    });
    if (changed) {
      setStoredNotifications(list);
      var dot = document.getElementById('notifDot');
      if (dot) dot.classList.remove('show');
    }
  }

  function openNotifPanel() {
    var panel = document.getElementById('notifPanel');
    if (!panel) return;
    panel.classList.add('open');
    setTimeout(markAllNotificationsRead, 900);
  }

  function closeNotifPanel() {
    var panel = document.getElementById('notifPanel');
    if (panel) panel.classList.remove('open');
  }

  function wireNotifications() {
    document.addEventListener('click', function (e) {
      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-notifications"]');
      if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        var panel = document.getElementById('notifPanel');
        if (panel && panel.classList.contains('open')) {
          closeNotifPanel();
        } else {
          openNotifPanel();
        }
        return;
      }

      var clearBtn = e.target.closest && e.target.closest('[data-action="clear-notifications"]');
      if (clearBtn) {
        e.preventDefault();
        setStoredNotifications([]);
        renderNotifications();
        return;
      }

      var panelEl = document.getElementById('notifPanel');
      var wrapEl = document.querySelector('.ud-notif-wrap');
      if (panelEl && panelEl.classList.contains('open') && wrapEl && !wrapEl.contains(e.target)) {
        closeNotifPanel();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNotifPanel();
    });
  }

  function findAdById(id) {
    var list = getStoredAds();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function formatAdDate(iso) {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric', timeZone: GAZA_TZ }).format(parseISODate(iso));
    } catch (err) {
      return iso;
    }
  }

  function buildAdStatusBadge(ad) {
    return ad.hidden
      ? '<span class="badge gray"><span>\u25cf</span> مخفي</span>'
      : '<span class="badge green"><span>\u25cf</span> ظاهر</span>';
  }

  function checkAdExpiryNotifications() {
    if (!getAdOptions().expiryNotice) return;
    var list = getStoredAds();
    var today = parseISODate(getTodayISODate()).getTime();
    var changed = false;
    list.forEach(function (ad) {
      if (ad.type !== 'offer' || !ad.date || ad.expiryNotified) return;
      if (parseISODate(ad.date).getTime() >= today) return;
      ad.expiryNotified = true;
      changed = true;
      addNotification({
        icon: 'calendar-x',
        title: 'انتهى موعد العرض',
        sub: ad.title
      });
    });
    if (changed) setStoredAds(list);
  }

  function buildAdOfferPriceHtml(ad) {
    if (ad.type !== 'offer' || ad.priceBefore == null || ad.priceAfter == null) return '';
    return '<div style="font-size:13px;font-weight:700;">' +
      '<span style="text-decoration:line-through;color:var(--db-text-tertiary);font-weight:400;">' + escapeHtml(formatAdPrice(ad.priceBefore)) + '</span>' +
      ' ← ' + escapeHtml(formatAdPrice(ad.priceAfter)) +
    '</div>';
  }

  function renderAdsPage() {
    var tbody = document.getElementById('ads-table-body');
    var dataWrap = document.getElementById('ads-data-wrap');
    var emptyState = document.getElementById('ads-empty-state');
    if (!tbody) return;

    var list = getStoredAds();
    var rowsHtml = '';

    list.forEach(function (ad) {
      var typeLabel = AD_TYPE_LABELS[ad.type] || ad.type;

      rowsHtml +=
        '<tr>' +
          '<td>' +
            '<div style="font-weight:700;">' + escapeHtml(ad.title) + '</div>' +
            buildAdOfferPriceHtml(ad) +
            (ad.details ? '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' + escapeHtml(ad.details) + '</div>' : '') +
            (safeExternalUrl(ad.link) ? '<div><a href="' + escapeHtml(safeExternalUrl(ad.link)) + '" target="_blank" rel="noopener noreferrer" class="mono" style="font-size:12px;">' + escapeHtml(safeExternalUrl(ad.link)) + '</a></div>' : '') +
          '</td>' +
          '<td>' + escapeHtml(typeLabel) + '</td>' +
          '<td class="mono">' + formatAdDate(ad.date) + '</td>' +
          '<td>' + buildAdStatusBadge(ad) + '</td>' +
          '<td>' +
            '<div class="flex gap-8">' +
              '<button type="button" class="btn btn-danger btn-sm" data-action="delete-ad" data-id="' + escapeHtml(ad.id) + '">حذف</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-action="toggle-ad-visibility" data-id="' + escapeHtml(ad.id) + '">' + (ad.hidden ? 'إظهار' : 'إخفاء') + '</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-action="edit-ad" data-id="' + escapeHtml(ad.id) + '">تعديل</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
    });

    tbody.innerHTML = rowsHtml;

    if (dataWrap && emptyState) {
      var hasAds = list.length > 0;
      dataWrap.style.display = hasAds ? '' : 'none';
      emptyState.style.display = hasAds ? 'none' : '';
    }

    bootIcons();
  }

  window.renderAdsPage = renderAdsPage;

  function initAdAddPanel() {
    var panel = document.getElementById('ade-panel');
    var scrim = document.getElementById('ade-scrim');
    if (!panel) return;

    var titleEl = document.getElementById('ade-title');
    var typeGroup = document.getElementById('ade-type-group');
    var titleInput = document.getElementById('ade-ad-title');
    var detailsInput = document.getElementById('ade-details');
    var dateInput = document.getElementById('ade-date');
    var linkInput = document.getElementById('ade-link');
    var offerFields = document.getElementById('ade-offer-fields');
    var priceBeforeInput = document.getElementById('ade-price-before');
    var priceAfterInput = document.getElementById('ade-price-after');
    var linkField = document.getElementById('ade-link-field');
    var linkLabel = document.getElementById('ade-link-label');
    var dateLabel = document.getElementById('ade-date-label');
    var saveBtn = document.getElementById('ade-save-btn');

    var selectedType = 'activity';
    var editingId = null;

    function applyAllowedAdTypes() {
      var allowed = getAllowedAdTypes();
      if (typeGroup) {
        typeGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
          var isAllowed = allowed.indexOf(btn.getAttribute('data-value')) !== -1;
          btn.style.display = isAllowed ? '' : 'none';
        });
      }
      return allowed;
    }

    var allowedAdTypes = applyAllowedAdTypes();

    function applyTypeFields() {
      var opts = getAdOptions();
      var showPrices = !!opts.offerPrices && selectedType === 'offer';
      var showLink = !opts.linkOnlyForJob || selectedType === 'job';
      if (offerFields) offerFields.style.display = showPrices ? '' : 'none';
      if (linkField) linkField.style.display = showLink ? '' : 'none';
      if (linkLabel) linkLabel.textContent = (opts.linkOnlyForJob && selectedType === 'job') ? 'رابط فورم التقديم — اختياري' : 'رابط — اختياري';
      if (dateLabel) dateLabel.textContent = showPrices ? 'تاريخ انتهاء العرض — اختياري' : 'التاريخ — اختياري';
    }

    function setType(value) {
      selectedType = value;
      applyTypeFields();
      if (!typeGroup) return;
      typeGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
      });
    }

    function resetForm() {
      if (titleInput) titleInput.value = '';
      if (detailsInput) detailsInput.value = '';
      if (dateInput) dateInput.value = '';
      if (linkInput) linkInput.value = '';
      if (priceBeforeInput) priceBeforeInput.value = '';
      if (priceAfterInput) priceAfterInput.value = '';
      setType(allowedAdTypes[0] || 'activity');
    }

    function fillFormFromAd(ad) {
      if (titleInput) titleInput.value = ad.title || '';
      if (detailsInput) detailsInput.value = ad.details || '';
      if (dateInput) dateInput.value = ad.date || '';
      if (linkInput) linkInput.value = ad.link || '';
      if (priceBeforeInput) priceBeforeInput.value = ad.priceBefore == null ? '' : ad.priceBefore;
      if (priceAfterInput) priceAfterInput.value = ad.priceAfter == null ? '' : ad.priceAfter;
      setType((ad.type && allowedAdTypes.indexOf(ad.type) !== -1) ? ad.type : (allowedAdTypes[0] || 'activity'));
    }

    function open(adToEdit) {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();

      editingId = adToEdit ? adToEdit.id : null;

      if (adToEdit) {
        fillFormFromAd(adToEdit);
        if (titleEl) titleEl.textContent = 'تعديل إعلان';
      } else {
        resetForm();
        if (titleEl) titleEl.textContent = 'إعلان جديد';
      }

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (titleInput) titleInput.focus();
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      editingId = null;
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-ad-add"]');
      if (openTrigger) {
        e.preventDefault();
        if (guardPlanLimit('ads', getStoredAds().length)) open(null);
        return;
      }
      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-ad"]');
      if (editTrigger) {
        e.preventDefault();
        var adToEdit = findAdById(editTrigger.getAttribute('data-id'));
        if (adToEdit) open(adToEdit);
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-ad-add"]');
      if (closeTrigger) {
        close();
        return;
      }
      var segBtn = e.target.closest && e.target.closest('#ade-type-group .seg-btn');
      if (segBtn) setType(segBtn.getAttribute('data-value'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var title = titleInput ? titleInput.value.trim() : '';
        if (!title) { if (titleInput) titleInput.focus(); return; }

        var opts = getAdOptions();
        var withPrices = !!opts.offerPrices && selectedType === 'offer';
        var priceBefore = null;
        var priceAfter = null;
        if (withPrices) {
          priceBefore = priceBeforeInput && priceBeforeInput.value !== '' ? Number(priceBeforeInput.value) : null;
          priceAfter = priceAfterInput && priceAfterInput.value !== '' ? Number(priceAfterInput.value) : null;
          if (priceBefore == null || !isFinite(priceBefore) || priceBefore < 0) { if (priceBeforeInput) priceBeforeInput.focus(); return; }
          if (priceAfter == null || !isFinite(priceAfter) || priceAfter < 0) { if (priceAfterInput) priceAfterInput.focus(); return; }
          if (priceAfter >= priceBefore) {
            showToast('السعر بعد العرض لازم يكون أقل من السعر قبله', { icon: 'circle-alert', danger: true });
            if (priceAfterInput) priceAfterInput.focus();
            return;
          }
        }
        var linkValue = (linkInput && (!opts.linkOnlyForJob || selectedType === 'job')) ? linkInput.value.trim() : '';

        var list = getStoredAds();

        if (!editingId && !guardPlanLimit('ads', list.length)) return;

        if (editingId) {
          var idx = -1;
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === editingId) { idx = i; break; }
          }
          if (idx !== -1) {
            list[idx].type = selectedType;
            list[idx].title = title;
            list[idx].details = detailsInput ? detailsInput.value.trim() : '';
            var newDate = dateInput ? dateInput.value : '';
            if (list[idx].date !== newDate) list[idx].expiryNotified = false;
            list[idx].date = newDate;
            list[idx].link = linkValue;
            list[idx].priceBefore = priceBefore;
            list[idx].priceAfter = priceAfter;
          }
        } else {
          list.unshift({
            id: generateAdId(),
            type: selectedType,
            title: title,
            details: detailsInput ? detailsInput.value.trim() : '',
            date: dateInput ? dateInput.value : '',
            link: linkValue,
            priceBefore: priceBefore,
            priceAfter: priceAfter,
            hidden: false,
            createdAt: Date.now()
          });
          addNotification({
            icon: 'megaphone',
            title: 'تمت إضافة إعلان جديد',
            sub: title
          });
        }

        setStoredAds(list);

        if (!editingId && opts.limitNotice) {
          var usage = getPlanLimitStatus('ads', list.length);
          if (!usage.unlimited && usage.used >= usage.limit) {
            addNotification({
              icon: 'triangle-alert',
              title: 'وصلت للحد الأقصى للإعلانات المجانية (' + usage.limit + ')',
              sub: 'اشترك بالباقة المدفوعة لنشر إعلانات أكثر'
            });
          }
        }

        close();
        renderAdsPage();
      });
    }
  }

  function initAdActions() {
    document.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-ad"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        var adToDelete = findAdById(idToDelete);
        var nameHtml = adToDelete ? '<strong>' + escapeHtml(adToDelete.title) + '</strong>' : 'هذا الإعلان';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف الإعلان؟',
          message: 'سيتم حذف «' + nameHtml + '» نهائياً',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var listAfterDelete = getStoredAds().filter(function (a) {
              return a.id !== idToDelete;
            });
            setStoredAds(listAfterDelete);
            renderAdsPage();
            showToast('تم حذف الإعلان', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }

      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-ad-visibility"]');
      if (toggleBtn) {
        var idToToggle = toggleBtn.getAttribute('data-id');
        var listForToggle = getStoredAds();
        var nowHidden = false;
        for (var i = 0; i < listForToggle.length; i++) {
          if (listForToggle[i].id === idToToggle) {
            listForToggle[i].hidden = !listForToggle[i].hidden;
            nowHidden = listForToggle[i].hidden;
            break;
          }
        }
        setStoredAds(listForToggle);
        renderAdsPage();
        showToast(nowHidden ? 'تم إخفاء الإعلان' : 'تم إظهار الإعلان', {
          icon: nowHidden ? 'eye-off' : 'eye',
          danger: nowHidden
        });
        return;
      }
    });
  }

  function getStoredMenuCategories() {
    try {
      var raw = localStorage.getItem(scopedKey(MENU_CATEGORIES_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredMenuCategories(list) {
    try {
      localStorage.setItem(scopedKey(MENU_CATEGORIES_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function getStoredMenuItems() {
    try {
      var raw = localStorage.getItem(scopedKey(MENU_ITEMS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredMenuItems(list) {
    try {
      localStorage.setItem(scopedKey(MENU_ITEMS_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateMenuCategoryId() {
    return window.GM_ID.generate('mc');
  }

  function generateMenuItemId() {
    return window.GM_ID.generate('mi');
  }

  function findMenuCategoryById(id) {
    var list = getStoredMenuCategories();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findMenuItemById(id) {
    var list = getStoredMenuItems();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function menuCategoryLabel(categoryId) {
    var cat = categoryId ? findMenuCategoryById(categoryId) : null;
    return cat ? cat.name : 'بدون تصنيف';
  }

  function countItemsInCategory(categoryId) {
    return getStoredMenuItems().filter(function (it) { return it.categoryId === categoryId; }).length;
  }

  var menuEditingCategoryId = null;

  function renderMenuCategoryList() {
    var list = document.getElementById('mcp-list');
    var empty = document.getElementById('mcp-empty');
    if (!list) return;

    var categories = getStoredMenuCategories();

    if (!categories.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      bootIcons();
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = categories.map(function (cat) {
      var itemsCount = countItemsInCategory(cat.id);

      if (cat.id === menuEditingCategoryId) {
        return (
          '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
            '<input type="text" id="mcp-rename-' + escapeHtml(cat.id) + '" value="' + escapeHtml(cat.name) + '" style="flex:1;">' +
            '<div class="flex gap-8">' +
              '<button type="button" class="icon-btn" data-action="save-menu-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حفظ"><i data-lucide="check" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="cancel-edit-menu-category" aria-label="إلغاء"><i data-lucide="x" class="icon"></i></button>' +
            '</div>' +
          '</div>'
        );
      }

      return (
        '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
          '<div class="title">' + escapeHtml(cat.name) + '</div>' +
          '<div class="flex gap-8">' +
            '<span class="badge gray">' + itemsCount + ' صنف</span>' +
            '<button type="button" class="icon-btn" data-action="edit-menu-category" data-id="' + escapeHtml(cat.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
            '<button type="button" class="icon-btn" data-action="delete-menu-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    bootIcons();
  }

  function renderMenuCategorySelectOptions() {
    var select = document.getElementById('mie-category');
    if (!select) return;
    var current = select.value;
    var categories = getStoredMenuCategories();

    select.innerHTML = '<option value="">بدون تصنيف</option>' + categories.map(function (cat) {
      return '<option value="' + escapeHtml(cat.id) + '">' + escapeHtml(cat.name) + '</option>';
    }).join('');

    if (categories.some(function (c) { return c.id === current; })) select.value = current;
  }

  function initMenuCategoryPanel() {
    var panel = document.getElementById('mcp-panel');
    var scrim = document.getElementById('mcp-scrim');
    if (!panel) return;

    var newNameInput = document.getElementById('mcp-new-name');
    var addBtn = document.getElementById('mcp-add-btn');

    function open() {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      menuEditingCategoryId = null;
      renderMenuCategoryList();

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (newNameInput) { newNameInput.value = ''; newNameInput.focus(); }
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      menuEditingCategoryId = null;
    }

    function addCategory() {
      var name = newNameInput ? newNameInput.value.trim() : '';
      if (!name) { if (newNameInput) newNameInput.focus(); return; }

      var list = getStoredMenuCategories();
      if (!guardPlanLimit('menuCategories', list.length)) return;
      list.push({ id: generateMenuCategoryId(), name: name, createdAt: Date.now() });
      setStoredMenuCategories(list);

      if (newNameInput) newNameInput.value = '';
      renderMenuCategoryList();
      renderMenuCategorySelectOptions();
      renderMenuPage();
      showToast('تمت إضافة التصنيف', { icon: 'folder-plus' });
    }

    if (addBtn) addBtn.addEventListener('click', addCategory);
    if (newNameInput) {
      newNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
      });
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-menu-category-panel"]');
      if (openTrigger) { e.preventDefault(); open(); return; }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-menu-category-panel"]');
      if (closeTrigger) { close(); return; }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-menu-category"]');
      if (editTrigger) {
        menuEditingCategoryId = editTrigger.getAttribute('data-id');
        renderMenuCategoryList();
        var input = document.getElementById('mcp-rename-' + menuEditingCategoryId);
        if (input) { input.focus(); input.select(); }
        return;
      }

      var cancelTrigger = e.target.closest && e.target.closest('[data-action="cancel-edit-menu-category"]');
      if (cancelTrigger) { menuEditingCategoryId = null; renderMenuCategoryList(); return; }

      var saveTrigger = e.target.closest && e.target.closest('[data-action="save-menu-category"]');
      if (saveTrigger) {
        var id = saveTrigger.getAttribute('data-id');
        var input2 = document.getElementById('mcp-rename-' + id);
        var newName = input2 ? input2.value.trim() : '';
        if (!newName) { if (input2) input2.focus(); return; }

        var list2 = getStoredMenuCategories();
        for (var i = 0; i < list2.length; i++) {
          if (list2[i].id === id) { list2[i].name = newName; break; }
        }
        setStoredMenuCategories(list2);

        menuEditingCategoryId = null;
        renderMenuCategoryList();
        renderMenuCategorySelectOptions();
        renderMenuPage();
        showToast('تم تعديل التصنيف', { icon: 'pencil' });
        return;
      }

      var deleteTrigger = e.target.closest && e.target.closest('[data-action="delete-menu-category"]');
      if (deleteTrigger) {
        var delId = deleteTrigger.getAttribute('data-id');
        var cat = findMenuCategoryById(delId);
        var itemsCount = countItemsInCategory(delId);
        var name = cat ? cat.name : 'هذا التصنيف';

        var message = 'سيتم حذف «<strong>' + escapeHtml(name) + '</strong>» نهائياً';
        if (itemsCount > 0) {
          message += '. الأصناف المرتبطة به (' + itemsCount + ') هتتحول تلقائياً لـ«بدون تصنيف» ومش هتتحذف.';
        }

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف التصنيف؟',
          message: message,
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredMenuCategories().filter(function (c) { return c.id !== delId; });
            setStoredMenuCategories(remaining);

            var items = getStoredMenuItems();
            var touched = false;
            items.forEach(function (it) {
              if (it.categoryId === delId) { it.categoryId = ''; touched = true; }
            });
            if (touched) setStoredMenuItems(items);

            renderMenuCategoryList();
            renderMenuCategorySelectOptions();
            renderMenuPage();
            showToast('تم حذف التصنيف', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });
  }

  function buildMenuStatusBadge(item) {
    return item.available !== false
      ? '<span class="badge green">متاح</span>'
      : '<span class="badge gray">غير متاح</span>';
  }

  var menuSearchTerm = '';

  function renderMenuPage() {
    var tbody = document.getElementById('menu-table-body');
    var dataWrap = document.getElementById('menu-data-wrap');
    var emptyState = document.getElementById('menu-empty-state');
    if (!tbody) return;

    var items = getStoredMenuItems();
    var categories = getStoredMenuCategories();

    var totalEl = document.getElementById('menu-stat-total');
    var availableEl = document.getElementById('menu-stat-available');
    var categoriesEl = document.getElementById('menu-stat-categories');
    var unavailableEl = document.getElementById('menu-stat-unavailable');
    if (totalEl) totalEl.textContent = items.length;
    if (availableEl) availableEl.textContent = items.filter(function (it) { return it.available !== false; }).length;
    if (categoriesEl) categoriesEl.textContent = categories.length;
    var catBtnCount = document.getElementById('menu-cat-btn-count');
    if (catBtnCount) catBtnCount.textContent = categories.length;
    if (unavailableEl) unavailableEl.textContent = items.filter(function (it) { return it.available === false; }).length;

    var usageEl = document.getElementById('menu-usage-counter');
    if (usageEl) {
      var usage = getPlanLimitStatus('menuItems', items.length);
      if (usage.unlimited) {
        usageEl.style.display = 'none';
      } else {
        usageEl.textContent = usage.used + ' من ' + usage.limit + ' ' + LIMIT_NOUNS.menuItems +
          (usage.canAdd ? '' : ' — وصلت للحد الأقصى');
        usageEl.style.display = '';
      }
    }

    var term = menuSearchTerm.trim().toLowerCase();
    var visibleItems = term
      ? items.filter(function (it) {
          return (it.name || '').toLowerCase().indexOf(term) !== -1 ||
                 menuCategoryLabel(it.categoryId).toLowerCase().indexOf(term) !== -1;
        })
      : items;

    if (!visibleItems.length && term && items.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--db-text-tertiary);padding:24px;">لا توجد نتائج مطابقة لبحثك</td></tr>';
    } else {
      tbody.innerHTML = visibleItems.map(function (item) {
        var thumb = safeImageSrc(item.image)
          ? '<img src="' + escapeHtml(safeImageSrc(item.image)) + '" class="menu-item-thumb" alt="">'
          : '<span class="menu-item-thumb" style="display:inline-flex;align-items:center;justify-content:center;"><i data-lucide="utensils" class="icon"></i></span>';

        var priceValue = (item.price !== '' && item.price != null && !isNaN(Number(item.price)))
          ? Number(item.price).toFixed(2)
          : null;
        var priceHtml = priceValue !== null
          ? '<span class="menu-price"><b>' + priceValue + '</b><i>₪</i></span>'
          : '<span class="menu-price menu-price--none"><b>—</b></span>';

        return (
          '<tr' + (item.available === false ? ' class="is-unavailable"' : '') + '>' +
            '<td class="menu-td-name" data-label="الصنف"><div class="menu-item-name-cell">' + thumb + '<span>' + escapeHtml(item.name) + '</span></div></td>' +
            '<td class="menu-td-cat" data-label="التصنيف"><span class="menu-cat-chip">' + escapeHtml(menuCategoryLabel(item.categoryId)) + '</span></td>' +
            '<td class="menu-td-price" data-label="السعر">' + priceHtml + '</td>' +
            '<td class="menu-td-status" data-label="الحالة">' + buildMenuStatusBadge(item) + '</td>' +
            '<td class="menu-td-actions">' +
              '<button type="button" class="icon-btn" data-action="toggle-menu-item-availability" data-id="' + escapeHtml(item.id) + '" aria-label="' + (item.available !== false ? 'وضع كغير متاح' : 'وضع كمتاح') + '">' +
                '<i data-lucide="' + (item.available !== false ? 'eye' : 'eye-off') + '" class="icon"></i>' +
              '</button>' +
              '<button type="button" class="icon-btn" data-action="edit-menu-item" data-id="' + escapeHtml(item.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="delete-menu-item" data-id="' + escapeHtml(item.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
            '</td>' +
          '</tr>'
        );
      }).join('');
    }

    if (dataWrap && emptyState) {
      var hasItems = items.length > 0;
      dataWrap.style.display = hasItems ? '' : 'none';
      emptyState.style.display = hasItems ? 'none' : '';
    }

    bootIcons();
  }

  window.renderMenuPage = renderMenuPage;

  function initMenuSearch() {
    var input = document.getElementById('menu-search-input');
    if (!input) return;
    input.addEventListener('input', debounce(function () {
      menuSearchTerm = input.value || '';
      renderMenuPage();
    }, 150));
  }

  function initMenuItemEditPanel() {
    var panel = document.getElementById('mie-panel');
    var scrim = document.getElementById('mie-scrim');
    if (!panel) return;

    var titleEl = document.getElementById('mie-title');
    var nameInput = document.getElementById('mie-name');
    var categorySelect = document.getElementById('mie-category');
    var priceInput = document.getElementById('mie-price');
    var statusGroup = document.getElementById('mie-status-group');
    var imageInput = document.getElementById('mie-image-input');
    var uploadBtn = document.getElementById('mie-upload-btn');
    var removeImageBtn = document.getElementById('mie-remove-image-btn');
    var preview = document.getElementById('mie-image-preview');
    var saveBtn = document.getElementById('mie-save-btn');

    var editingId = null;
    var selectedStatus = 'available';
    var pendingImage = null;

    function setStatus(value) {
      selectedStatus = value;
      if (!statusGroup) return;
      statusGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
      });
    }

    function setPreview(imageUrl) {
      pendingImage = imageUrl || null;
      if (!preview) return;
      if (pendingImage) {
        preview.style.backgroundImage = toCssUrl(pendingImage);
        preview.innerHTML = '';
        if (removeImageBtn) removeImageBtn.style.display = '';
      } else {
        preview.style.backgroundImage = '';
        preview.innerHTML = '<i data-lucide="utensils" class="icon"></i>';
        if (removeImageBtn) removeImageBtn.style.display = 'none';
        bootIcons();
      }
    }

    function resetForm() {
      if (nameInput) nameInput.value = '';
      if (priceInput) priceInput.value = '';
      if (categorySelect) categorySelect.value = '';
      setStatus('available');
      setPreview(null);
    }

    function fillFormFromItem(item) {
      if (nameInput) nameInput.value = item.name || '';
      if (priceInput) priceInput.value = item.price != null ? item.price : '';
      if (categorySelect) categorySelect.value = item.categoryId || '';
      setStatus(item.available === false ? 'unavailable' : 'available');
      setPreview(item.image || null);
    }

    function open(itemToEdit) {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      renderMenuCategorySelectOptions();

      editingId = itemToEdit ? itemToEdit.id : null;

      if (itemToEdit) {
        fillFormFromItem(itemToEdit);
        if (titleEl) titleEl.textContent = 'تعديل صنف';
      } else {
        resetForm();
        if (titleEl) titleEl.textContent = 'صنف جديد';
      }

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (nameInput) nameInput.focus();
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      editingId = null;
    }

    if (uploadBtn && imageInput) {
      uploadBtn.addEventListener('click', function () { imageInput.click(); });
    }
    if (imageInput) {
      imageInput.addEventListener('change', function () {
        var file = imageInput.files && imageInput.files[0];
        if (!file) return;
        compressImageFile(file, 720, 0.8, setPreview);
      });
    }
    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', function () {
        setPreview(null);
        if (imageInput) imageInput.value = '';
      });
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-menu-item-add"]');
      if (openTrigger) {
        e.preventDefault();
        if (guardPlanLimit('menuItems', getStoredMenuItems().length)) open(null);
        return;
      }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-menu-item"]');
      if (editTrigger) {
        e.preventDefault();
        var itemToEdit = findMenuItemById(editTrigger.getAttribute('data-id'));
        if (itemToEdit) open(itemToEdit);
        return;
      }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-menu-item-add"]');
      if (closeTrigger) { close(); return; }

      var segBtn = e.target.closest && e.target.closest('#mie-status-group .seg-btn');
      if (segBtn) setStatus(segBtn.getAttribute('data-value'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { if (nameInput) nameInput.focus(); return; }

        var priceRaw = priceInput ? priceInput.value : '';
        var price = priceRaw !== '' ? Number(priceRaw) : null;

        var list = getStoredMenuItems();

        if (!editingId && !guardPlanLimit('menuItems', list.length)) return;

        if (editingId) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === editingId) {
              list[i].name = name;
              list[i].categoryId = categorySelect ? categorySelect.value : '';
              list[i].price = price;
              list[i].available = selectedStatus === 'available';
              list[i].image = pendingImage;
              break;
            }
          }
        } else {
          list.unshift({
            id: generateMenuItemId(),
            name: name,
            categoryId: categorySelect ? categorySelect.value : '',
            price: price,
            available: selectedStatus === 'available',
            image: pendingImage,
            createdAt: Date.now()
          });
        }

        setStoredMenuItems(list);
        close();
        renderMenuPage();
        showToast(editingId ? 'تم تعديل الصنف' : 'تمت إضافة الصنف', { icon: 'utensils' });
      });
    }
  }

  function initMenuItemActions() {
    document.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-menu-item"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        var itemToDelete = findMenuItemById(idToDelete);
        var nameHtml = itemToDelete ? '<strong>' + escapeHtml(itemToDelete.name) + '</strong>' : 'هذا الصنف';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف الصنف؟',
          message: 'سيتم حذف «' + nameHtml + '» نهائياً من المنيو',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredMenuItems().filter(function (it) { return it.id !== idToDelete; });
            setStoredMenuItems(remaining);
            renderMenuPage();
            showToast('تم حذف الصنف', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }

      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-menu-item-availability"]');
      if (toggleBtn) {
        var idToToggle = toggleBtn.getAttribute('data-id');
        var list = getStoredMenuItems();
        var nowAvailable = true;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === idToToggle) {
            list[i].available = list[i].available === false;
            nowAvailable = list[i].available;
            break;
          }
        }
        setStoredMenuItems(list);
        renderMenuPage();
        showToast(nowAvailable ? 'الصنف صار متاح' : 'الصنف صار غير متاح', {
          icon: nowAvailable ? 'eye' : 'eye-off',
          danger: !nowAvailable
        });
        return;
      }
    });
  }

  function getStoredProductCategories() {
    try {
      var raw = localStorage.getItem(scopedKey(PRODUCT_CATEGORIES_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredProductCategories(list) {
    try {
      localStorage.setItem(scopedKey(PRODUCT_CATEGORIES_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function getStoredProductItems() {
    try {
      var raw = localStorage.getItem(scopedKey(PRODUCT_ITEMS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredProductItems(list) {
    try {
      localStorage.setItem(scopedKey(PRODUCT_ITEMS_STORAGE_KEY), JSON.stringify(list));
      return true;
    } catch (err) {
      return false;
    }
  }

  function storeHasDiscounts() {
    var config = getStoreTypeConfig();
    return !!(config && config.hasDiscounts);
  }

  function storeHasProductField(fieldKey) {
    var config = getStoreTypeConfig();
    return !!(config && Array.isArray(config.productFields) && config.productFields.indexOf(fieldKey) !== -1);
  }

  function storeHasServiceField(fieldKey) {
    var config = getStoreTypeConfig();
    return !!(config && Array.isArray(config.serviceFields) && config.serviceFields.indexOf(fieldKey) !== -1);
  }

  function getExtraFieldDefs(kind) {
    var config = getStoreTypeConfig();
    var list = config && config[kind === 'service' ? 'serviceExtraFields' : 'productExtraFields'];
    return Array.isArray(list) ? list : [];
  }

  function renderExtraFields(container, prefix, defs, values) {
    if (!container) return;
    var saved = values || {};
    container.innerHTML = defs.map(function (def) {
      var id = prefix + '-x-' + def.key;
      var value = saved[def.key] != null ? String(saved[def.key]) : '';
      var control;
      if (def.type === 'choice') {
        control = '<select id="' + id + '" data-extra-key="' + def.key + '"><option value="">غير محدد</option>' +
          (def.options || []).map(function (opt) {
            return '<option value="' + escapeHtml(opt) + '"' + (opt === value ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
          }).join('') + '</select>';
      } else {
        control = '<input type="text" id="' + id + '" data-extra-key="' + def.key + '" maxlength="' + (def.maxLength || 40) + '" placeholder="' + escapeHtml(def.placeholder || '') + '" value="' + escapeHtml(value) + '">';
      }
      return '<div class="field"><label for="' + id + '">' + escapeHtml(def.label) + '</label>' + control + '</div>';
    }).join('');
  }

  function readExtraFields(container, defs) {
    var result = {};
    if (!container) return result;
    defs.forEach(function (def) {
      var el = container.querySelector('[data-extra-key="' + def.key + '"]');
      var value = el ? String(el.value || '').trim() : '';
      if (value) result[def.key] = value;
    });
    return result;
  }

  function formatExtraFields(defs, extra) {
    if (!extra) return [];
    var parts = [];
    defs.forEach(function (def) {
      if (extra[def.key]) parts.push(escapeHtml(def.label) + ': ' + escapeHtml(extra[def.key]));
    });
    return parts;
  }

  function extraFieldsMatch(term, defs, extra) {
    if (!extra) return false;
    return defs.some(function (def) {
      return String(extra[def.key] || '').toLowerCase().indexOf(term) !== -1;
    });
  }

  function countDiscountedProducts(excludeId) {
    return getStoredProductItems().filter(function (it) {
      return it.discount === true && it.id !== excludeId;
    }).length;
  }

  function generateProductCategoryId() {
    return window.GM_ID.generate('pc');
  }

  function generateProductItemId() {
    return window.GM_ID.generate('pi');
  }

  function findProductCategoryById(id) {
    var list = getStoredProductCategories();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findProductItemById(id) {
    var list = getStoredProductItems();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function productCategoryLabel(categoryId) {
    var cat = categoryId ? findProductCategoryById(categoryId) : null;
    return cat ? cat.name : 'بدون تصنيف';
  }

  function countItemsInProductCategory(categoryId) {
    return getStoredProductItems().filter(function (it) { return it.categoryId === categoryId; }).length;
  }

  var productEditingCategoryId = null;

  function renderProductCategorySuggestions() {
    var wrap = document.getElementById('pcp-suggestions');
    var box = document.getElementById('pcp-suggestions-list');
    if (!wrap || !box) return;

    var config = getStoreTypeConfig();
    var suggested = (config && Array.isArray(config.suggestedCategories)) ? config.suggestedCategories : [];

    var nameInput = document.getElementById('pcp-new-name');
    if (nameInput && suggested.length) nameInput.placeholder = 'مثال: ' + suggested[0];

    var existing = getStoredProductCategories().map(function (cat) {
      return String(cat.name || '').trim();
    });
    var remaining = suggested.filter(function (name) { return existing.indexOf(name) === -1; });

    if (!remaining.length) {
      wrap.style.display = 'none';
      box.innerHTML = '';
      return;
    }

    box.innerHTML = remaining.map(function (name) {
      return '<button type="button" class="btn btn-ghost btn-sm" data-action="add-product-category-suggestion" data-name="' + escapeHtml(name) + '">' +
        '<i data-lucide="plus" class="icon"></i> ' + escapeHtml(name) +
      '</button>';
    }).join('');
    wrap.style.display = '';
    bootIcons();
  }

  function renderProductCategoryList() {
    var list = document.getElementById('pcp-list');
    var empty = document.getElementById('pcp-empty');
    if (!list) return;

    renderProductCategorySuggestions();

    var categories = getStoredProductCategories();

    if (!categories.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      bootIcons();
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = categories.map(function (cat) {
      var itemsCount = countItemsInProductCategory(cat.id);

      if (cat.id === productEditingCategoryId) {
        return (
          '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
            '<input type="text" id="pcp-rename-' + escapeHtml(cat.id) + '" value="' + escapeHtml(cat.name) + '" style="flex:1;">' +
            '<div class="flex gap-8">' +
              '<button type="button" class="icon-btn" data-action="save-product-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حفظ"><i data-lucide="check" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="cancel-edit-product-category" aria-label="إلغاء"><i data-lucide="x" class="icon"></i></button>' +
            '</div>' +
          '</div>'
        );
      }

      return (
        '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
          '<div class="title">' + escapeHtml(cat.name) + '</div>' +
          '<div class="flex gap-8">' +
            '<span class="badge gray">' + itemsCount + ' منتج</span>' +
            '<button type="button" class="icon-btn" data-action="edit-product-category" data-id="' + escapeHtml(cat.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
            '<button type="button" class="icon-btn" data-action="delete-product-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    bootIcons();
  }

  function renderProductCategorySelectOptions() {
    var select = document.getElementById('pie-category');
    if (!select) return;
    var current = select.value;
    var categories = getStoredProductCategories();

    select.innerHTML = '<option value="">بدون تصنيف</option>' + categories.map(function (cat) {
      return '<option value="' + escapeHtml(cat.id) + '">' + escapeHtml(cat.name) + '</option>';
    }).join('');

    if (categories.some(function (c) { return c.id === current; })) select.value = current;
  }

  function initProductCategoryPanel() {
    var panel = document.getElementById('pcp-panel');
    var scrim = document.getElementById('pcp-scrim');
    if (!panel) return;

    var newNameInput = document.getElementById('pcp-new-name');
    var addBtn = document.getElementById('pcp-add-btn');

    function open() {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      productEditingCategoryId = null;
      renderProductCategoryList();

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (newNameInput) { newNameInput.value = ''; newNameInput.focus(); }
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      productEditingCategoryId = null;
    }

    function addCategory() {
      var name = newNameInput ? newNameInput.value.trim() : '';
      if (!name) { if (newNameInput) newNameInput.focus(); return; }

      var list = getStoredProductCategories();
      if (!guardPlanLimit('productCategories', list.length)) return;
      list.push({ id: generateProductCategoryId(), name: name, createdAt: Date.now() });
      setStoredProductCategories(list);

      if (newNameInput) newNameInput.value = '';
      renderProductCategoryList();
      renderProductCategorySelectOptions();
      renderProductsPage();
      showToast('تمت إضافة التصنيف', { icon: 'folder-plus' });
    }

    if (addBtn) addBtn.addEventListener('click', addCategory);
    if (newNameInput) {
      newNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
      });
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-product-category-panel"]');
      if (openTrigger) { e.preventDefault(); open(); return; }

      var suggestionTrigger = e.target.closest && e.target.closest('[data-action="add-product-category-suggestion"]');
      if (suggestionTrigger) {
        e.preventDefault();
        var suggestedName = (suggestionTrigger.getAttribute('data-name') || '').trim();
        if (!suggestedName) return;

        var suggestedList = getStoredProductCategories();
        if (!guardPlanLimit('productCategories', suggestedList.length)) return;
        suggestedList.push({ id: generateProductCategoryId(), name: suggestedName, createdAt: Date.now() });
        setStoredProductCategories(suggestedList);

        renderProductCategoryList();
        renderProductCategorySelectOptions();
        renderProductsPage();
        showToast('تمت إضافة التصنيف', { icon: 'folder-plus' });
        return;
      }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-product-category-panel"]');
      if (closeTrigger) { close(); return; }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-product-category"]');
      if (editTrigger) {
        productEditingCategoryId = editTrigger.getAttribute('data-id');
        renderProductCategoryList();
        var input = document.getElementById('pcp-rename-' + productEditingCategoryId);
        if (input) { input.focus(); input.select(); }
        return;
      }

      var cancelTrigger = e.target.closest && e.target.closest('[data-action="cancel-edit-product-category"]');
      if (cancelTrigger) { productEditingCategoryId = null; renderProductCategoryList(); return; }

      var saveTrigger = e.target.closest && e.target.closest('[data-action="save-product-category"]');
      if (saveTrigger) {
        var id = saveTrigger.getAttribute('data-id');
        var input2 = document.getElementById('pcp-rename-' + id);
        var newName = input2 ? input2.value.trim() : '';
        if (!newName) { if (input2) input2.focus(); return; }

        var list2 = getStoredProductCategories();
        for (var i = 0; i < list2.length; i++) {
          if (list2[i].id === id) { list2[i].name = newName; break; }
        }
        setStoredProductCategories(list2);

        productEditingCategoryId = null;
        renderProductCategoryList();
        renderProductCategorySelectOptions();
        renderProductsPage();
        return;
      }

      var delTrigger = e.target.closest && e.target.closest('[data-action="delete-product-category"]');
      if (delTrigger) {
        var delId = delTrigger.getAttribute('data-id');
        var cat = findProductCategoryById(delId);
        var itemsCount = countItemsInProductCategory(delId);
        var message = itemsCount > 0
          ? 'سيتم حذف التصنيف «' + escapeHtml(cat ? cat.name : '') + '»، و' + itemsCount + ' منتج بداخله هيرجعوا «بدون تصنيف»'
          : 'سيتم حذف التصنيف «' + escapeHtml(cat ? cat.name : '') + '» نهائياً';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف التصنيف؟',
          message: message,
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredProductCategories().filter(function (c) { return c.id !== delId; });
            setStoredProductCategories(remaining);

            var items = getStoredProductItems();
            var touched = false;
            items.forEach(function (it) {
              if (it.categoryId === delId) { it.categoryId = ''; touched = true; }
            });
            if (touched) setStoredProductItems(items);

            renderProductCategoryList();
            renderProductCategorySelectOptions();
            renderProductsPage();
            showToast('تم حذف التصنيف', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });
  }

  function buildProductStatusBadge(item) {
    return item.available !== false
      ? '<span class="badge green">متاح</span>'
      : '<span class="badge gray">غير متاح</span>';
  }

  var productSearchTerm = '';

  function renderProductsPage() {
    var tbody = document.getElementById('product-table-body');
    var dataWrap = document.getElementById('product-data-wrap');
    var emptyState = document.getElementById('product-empty-state');
    if (!tbody) return;

    var items = getStoredProductItems();
    var categories = getStoredProductCategories();

    var totalEl = document.getElementById('product-stat-total');
    var availableEl = document.getElementById('product-stat-available');
    var categoriesEl = document.getElementById('product-stat-categories');
    var unavailableEl = document.getElementById('product-stat-unavailable');
    if (totalEl) totalEl.textContent = items.length;
    if (availableEl) availableEl.textContent = items.filter(function (it) { return it.available !== false; }).length;
    if (categoriesEl) categoriesEl.textContent = categories.length;
    var catBtnCount = document.getElementById('product-cat-btn-count');
    if (catBtnCount) catBtnCount.textContent = categories.length;
    if (unavailableEl) unavailableEl.textContent = items.filter(function (it) { return it.available === false; }).length;

    var usageEl = document.getElementById('product-usage-counter');
    if (usageEl) {
      var usage = getPlanLimitStatus('products', items.length);
      if (usage.unlimited) {
        usageEl.style.display = 'none';
      } else {
        usageEl.textContent = usage.used + ' من ' + usage.limit + ' ' + LIMIT_NOUNS.products +
          (usage.canAdd ? '' : ' — وصلت للحد الأقصى');
        usageEl.style.display = '';
      }
    }

    var term = productSearchTerm.trim().toLowerCase();
    var visibleItems = term
      ? items.filter(function (it) {
          return (it.name || '').toLowerCase().indexOf(term) !== -1 ||
                 productCategoryLabel(it.categoryId).toLowerCase().indexOf(term) !== -1 ||
                 (storeHasProductField('brand') && (it.brand || '').toLowerCase().indexOf(term) !== -1) ||
                 (storeHasProductField('color') && (it.color || '').toLowerCase().indexOf(term) !== -1) ||
                 (storeHasProductField('material') && (it.material || '').toLowerCase().indexOf(term) !== -1) ||
                 extraFieldsMatch(term, getExtraFieldDefs('product'), it.extra);
        })
      : items;

    if (!visibleItems.length && term && items.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--db-text-tertiary);padding:24px;">لا توجد نتائج مطابقة لبحثك</td></tr>';
    } else {
      tbody.innerHTML = visibleItems.map(function (item) {
        var thumb = safeImageSrc(item.image)
          ? '<img src="' + escapeHtml(safeImageSrc(item.image)) + '" class="menu-item-thumb" alt="">'
          : '<span class="menu-item-thumb" style="display:inline-flex;align-items:center;justify-content:center;"><i data-lucide="package" class="icon"></i></span>';

        var priceValue = (item.price !== '' && item.price != null && !isNaN(Number(item.price)))
          ? Number(item.price).toFixed(2)
          : null;
        var sizeChip = (storeHasProductField('size') && item.size)
          ? ' <span class="menu-cat-chip">مقاس ' + escapeHtml(item.size) + '</span>'
          : '';
        var detailsLine = (storeHasProductField('details') && item.details)
          ? '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' + escapeHtml(item.details) + '</div>'
          : '';
        var attrParts = [];
        if (storeHasProductField('brand') && item.brand) attrParts.push('الماركة: ' + escapeHtml(item.brand));
        if (storeHasProductField('material') && item.material) attrParts.push('الخامة: ' + escapeHtml(item.material));
        if (storeHasProductField('color') && item.color) attrParts.push('اللون: ' + escapeHtml(item.color));
        formatExtraFields(getExtraFieldDefs('product'), item.extra).forEach(function (part) { attrParts.push(part); });
        var attrsLine = attrParts.length
          ? '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' + attrParts.join(' · ') + '</div>'
          : '';
        var discountBadge = (storeHasDiscounts() && item.discount === true)
          ? ' <span class="badge red">خصم</span>'
          : '';
        var priceHtml = priceValue !== null
          ? '<span class="menu-price"><b>' + priceValue + '</b><i>₪</i></span>'
          : '<span class="menu-price menu-price--none"><b>—</b></span>';

        return (
          '<tr' + (item.available === false ? ' class="is-unavailable"' : '') + '>' +
            '<td class="menu-td-name" data-label="المنتج"><div class="menu-item-name-cell">' + thumb + '<span>' + escapeHtml(item.name) + detailsLine + attrsLine + '</span></div></td>' +
            '<td class="menu-td-cat" data-label="التصنيف"><span class="menu-cat-chip">' + escapeHtml(productCategoryLabel(item.categoryId)) + '</span>' + sizeChip + '</td>' +
            '<td class="menu-td-price" data-label="السعر">' + priceHtml + '</td>' +
            '<td class="menu-td-status" data-label="الحالة">' + buildProductStatusBadge(item) + discountBadge + '</td>' +
            '<td class="menu-td-actions">' +
              '<button type="button" class="icon-btn" data-action="toggle-product-item-availability" data-id="' + escapeHtml(item.id) + '" aria-label="' + (item.available !== false ? 'وضع كغير متاح' : 'وضع كمتاح') + '">' +
                '<i data-lucide="' + (item.available !== false ? 'eye' : 'eye-off') + '" class="icon"></i>' +
              '</button>' +
              '<button type="button" class="icon-btn" data-action="edit-product-item" data-id="' + escapeHtml(item.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="delete-product-item" data-id="' + escapeHtml(item.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
            '</td>' +
          '</tr>'
        );
      }).join('');
    }

    if (dataWrap && emptyState) {
      var hasItems = items.length > 0;
      dataWrap.style.display = hasItems ? '' : 'none';
      emptyState.style.display = hasItems ? 'none' : '';
    }

    bootIcons();
  }

  window.renderProductsPage = renderProductsPage;

  function initProductSearch() {
    var input = document.getElementById('product-search-input');
    if (!input) return;
    input.addEventListener('input', debounce(function () {
      productSearchTerm = input.value || '';
      renderProductsPage();
    }, 150));
  }

  function initProductItemEditPanel() {
    var panel = document.getElementById('pie-panel');
    var scrim = document.getElementById('pie-scrim');
    if (!panel) return;

    var titleEl = document.getElementById('pie-title');
    var nameInput = document.getElementById('pie-name');
    var categorySelect = document.getElementById('pie-category');
    var priceInput = document.getElementById('pie-price');
    var statusGroup = document.getElementById('pie-status-group');
    var sizeField = document.getElementById('pie-size-field');
    var sizeInput = document.getElementById('pie-size');
    var detailsField = document.getElementById('pie-details-field');
    var detailsInput = document.getElementById('pie-details');
    var brandField = document.getElementById('pie-brand-field');
    var brandInput = document.getElementById('pie-brand');
    var colorField = document.getElementById('pie-color-field');
    var colorInput = document.getElementById('pie-color');
    var materialField = document.getElementById('pie-material-field');
    var materialInput = document.getElementById('pie-material');
    var extraContainer = document.getElementById('pie-extra-fields');
    var discountField = document.getElementById('pie-discount-field');
    var discountGroup = document.getElementById('pie-discount-group');
    var imageInput = document.getElementById('pie-image-input');
    var uploadBtn = document.getElementById('pie-upload-btn');
    var removeImageBtn = document.getElementById('pie-remove-image-btn');
    var preview = document.getElementById('pie-image-preview');
    var saveBtn = document.getElementById('pie-save-btn');

    var editingId = null;
    var selectedStatus = 'available';
    var selectedDiscount = false;
    var pendingImage = null;

    function setStatus(value) {
      selectedStatus = value;
      if (!statusGroup) return;
      statusGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
      });
    }

    function setDiscount(isOn) {
      selectedDiscount = !!isOn;
      if (!discountGroup) return;
      discountGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', (btn.getAttribute('data-value') === 'discount') === selectedDiscount);
      });
    }

    function canEnableDiscount() {
      var status = getPlanLimitStatus('discountedProducts', countDiscountedProducts(editingId));
      if (status.canAdd) return true;
      openUpgradeModal({ limitKey: 'discountedProducts', limit: status.limit });
      return false;
    }

    function applyFieldVisibility() {
      if (sizeField) sizeField.style.display = storeHasProductField('size') ? '' : 'none';
      if (discountField) discountField.style.display = storeHasDiscounts() ? '' : 'none';
      if (detailsField) detailsField.style.display = storeHasProductField('details') ? '' : 'none';
      if (brandField) brandField.style.display = storeHasProductField('brand') ? '' : 'none';
      if (colorField) colorField.style.display = storeHasProductField('color') ? '' : 'none';
      if (materialField) materialField.style.display = storeHasProductField('material') ? '' : 'none';
      applyFieldHints();
    }

    function applyFieldHints() {
      var config = getStoreTypeConfig();
      var hints = (config && config.productHints) || {};
      var pairs = [
        [nameInput, 'name'],
        [detailsInput, 'details'],
        [sizeInput, 'size'],
        [brandInput, 'brand'],
        [colorInput, 'color'],
        [materialInput, 'material']
      ];
      pairs.forEach(function (pair) {
        if (pair[0] && hints[pair[1]]) pair[0].placeholder = hints[pair[1]];
      });
    }

    function setPreview(imageUrl) {
      pendingImage = imageUrl || null;
      if (!preview) return;
      if (pendingImage) {
        preview.style.backgroundImage = toCssUrl(pendingImage);
        preview.innerHTML = '';
        if (removeImageBtn) removeImageBtn.style.display = '';
      } else {
        preview.style.backgroundImage = '';
        preview.innerHTML = '<i data-lucide="package" class="icon"></i>';
        if (removeImageBtn) removeImageBtn.style.display = 'none';
        bootIcons();
      }
    }

    function resetForm() {
      if (nameInput) nameInput.value = '';
      if (priceInput) priceInput.value = '';
      if (sizeInput) sizeInput.value = '';
      if (detailsInput) detailsInput.value = '';
      if (brandInput) brandInput.value = '';
      if (colorInput) colorInput.value = '';
      if (materialInput) materialInput.value = '';
      if (categorySelect) categorySelect.value = '';
      setStatus('available');
      setDiscount(false);
      setPreview(null);
    }

    function fillFormFromItem(item) {
      if (nameInput) nameInput.value = item.name || '';
      if (priceInput) priceInput.value = item.price != null ? item.price : '';
      if (sizeInput) sizeInput.value = item.size || '';
      if (detailsInput) detailsInput.value = item.details || '';
      if (brandInput) brandInput.value = item.brand || '';
      if (colorInput) colorInput.value = item.color || '';
      if (materialInput) materialInput.value = item.material || '';
      if (categorySelect) categorySelect.value = item.categoryId || '';
      setStatus(item.available === false ? 'unavailable' : 'available');
      setDiscount(item.discount === true);
      setPreview(item.image || null);
    }

    function open(itemToEdit) {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      renderProductCategorySelectOptions();
      applyFieldVisibility();
      renderExtraFields(extraContainer, 'pie', getExtraFieldDefs('product'), itemToEdit ? itemToEdit.extra : null);

      editingId = itemToEdit ? itemToEdit.id : null;

      if (itemToEdit) {
        fillFormFromItem(itemToEdit);
        if (titleEl) titleEl.textContent = 'تعديل منتج';
      } else {
        resetForm();
        if (titleEl) titleEl.textContent = 'منتج جديد';
      }

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (nameInput) nameInput.focus();
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      editingId = null;
    }

    if (uploadBtn && imageInput) {
      uploadBtn.addEventListener('click', function () { imageInput.click(); });
    }
    if (imageInput) {
      imageInput.addEventListener('change', function () {
        var file = imageInput.files && imageInput.files[0];
        if (!file) return;
        compressImageFile(file, 720, 0.8, setPreview);
      });
    }
    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', function () {
        setPreview(null);
        if (imageInput) imageInput.value = '';
      });
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-product-item-add"]');
      if (openTrigger) {
        e.preventDefault();
        if (guardPlanLimit('products', getStoredProductItems().length)) open(null);
        return;
      }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-product-item"]');
      if (editTrigger) {
        e.preventDefault();
        var itemToEdit = findProductItemById(editTrigger.getAttribute('data-id'));
        if (itemToEdit) open(itemToEdit);
        return;
      }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-product-item-add"]');
      if (closeTrigger) { close(); return; }

      var segBtn = e.target.closest && e.target.closest('#pie-status-group .seg-btn');
      if (segBtn) setStatus(segBtn.getAttribute('data-value'));

      var discountBtn = e.target.closest && e.target.closest('#pie-discount-group .seg-btn');
      if (discountBtn) {
        var wantsDiscount = discountBtn.getAttribute('data-value') === 'discount';
        if (wantsDiscount && !selectedDiscount && !canEnableDiscount()) return;
        setDiscount(wantsDiscount);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { if (nameInput) nameInput.focus(); return; }

        var priceRaw = priceInput ? priceInput.value : '';
        var price = priceRaw !== '' ? Number(priceRaw) : null;

        var list = getStoredProductItems();

        if (!editingId && !guardPlanLimit('products', list.length)) return;

        var withDetailsField = storeHasProductField('details');
        var details = (withDetailsField && detailsInput) ? detailsInput.value.trim() : '';
        var withDiscountFields = storeHasDiscounts();
        var withSizeField = storeHasProductField('size');
        var withBrandField = storeHasProductField('brand');
        var withColorField = storeHasProductField('color');
        var withMaterialField = storeHasProductField('material');
        var size = (withSizeField && sizeInput) ? sizeInput.value.trim() : '';
        var brand = (withBrandField && brandInput) ? brandInput.value.trim() : '';
        var color = (withColorField && colorInput) ? colorInput.value.trim() : '';
        var material = (withMaterialField && materialInput) ? materialInput.value.trim() : '';
        var extraDefs = getExtraFieldDefs('product');
        var extra = extraDefs.length ? readExtraFields(extraContainer, extraDefs) : null;
        if (withDiscountFields && selectedDiscount && !canEnableDiscount()) {
          setDiscount(false);
          return;
        }

        if (editingId) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === editingId) {
              list[i].name = name;
              list[i].categoryId = categorySelect ? categorySelect.value : '';
              list[i].price = price;
              list[i].available = selectedStatus === 'available';
              list[i].image = pendingImage;
              if (withDetailsField) list[i].details = details;
              if (withSizeField) list[i].size = size;
              if (withBrandField) list[i].brand = brand;
              if (withColorField) list[i].color = color;
              if (withMaterialField) list[i].material = material;
              if (extra) list[i].extra = extra;
              if (withDiscountFields) list[i].discount = selectedDiscount;
              break;
            }
          }
        } else {
          var newItem = {
            id: generateProductItemId(),
            name: name,
            categoryId: categorySelect ? categorySelect.value : '',
            price: price,
            available: selectedStatus === 'available',
            image: pendingImage,
            createdAt: Date.now()
          };
          if (withDetailsField) newItem.details = details;
          if (withSizeField) newItem.size = size;
          if (withBrandField) newItem.brand = brand;
          if (withColorField) newItem.color = color;
          if (withMaterialField) newItem.material = material;
          if (extra) newItem.extra = extra;
          if (withDiscountFields) newItem.discount = selectedDiscount;
          list.unshift(newItem);
        }

        if (!setStoredProductItems(list)) {
          showToast('تعذر حفظ المنتج، مساحة التخزين ممتلئة', { icon: 'circle-alert', danger: true });
          return;
        }
        close();
        renderProductsPage();
        showToast(editingId ? 'تم تعديل المنتج' : 'تمت إضافة المنتج', { icon: 'package' });
      });
    }
  }

  function initProductItemActions() {
    document.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-product-item"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        var itemToDelete = findProductItemById(idToDelete);
        var nameHtml = itemToDelete ? '<strong>' + escapeHtml(itemToDelete.name) + '</strong>' : 'هذا المنتج';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف المنتج؟',
          message: 'سيتم حذف «' + nameHtml + '» نهائياً من قائمة منتجاتك',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredProductItems().filter(function (it) { return it.id !== idToDelete; });
            setStoredProductItems(remaining);
            renderProductsPage();
            showToast('تم حذف المنتج', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }

      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-product-item-availability"]');
      if (toggleBtn) {
        var idToToggle = toggleBtn.getAttribute('data-id');
        var list = getStoredProductItems();
        var nowAvailable = true;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === idToToggle) {
            list[i].available = list[i].available === false;
            nowAvailable = list[i].available;
            break;
          }
        }
        setStoredProductItems(list);
        renderProductsPage();
        showToast(nowAvailable ? 'المنتج صار متاح' : 'المنتج صار غير متاح', {
          icon: nowAvailable ? 'eye' : 'eye-off',
          danger: !nowAvailable
        });
        return;
      }
    });
  }

  var SERVICE_SUGGESTION_ICONS = {
    installation: 'wrench',
    warranty: 'shield-check',
    card_payment: 'credit-card',
    gift_wrap: 'package-check',
    exchange_return: 'rotate-ccw',
    size_exchange: 'ruler',
    alteration: 'scissors',
    whatsapp_order: 'message-circle',
    fitting: 'ruler',
    home_measurement: 'house',
    fabric_supply: 'swatch-book',
    urgent_service: 'zap',
    delivery: 'truck'
  };

  function getStoredServiceCategories() {
    try {
      var raw = localStorage.getItem(scopedKey(STORE_SERVICE_CATEGORIES_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredServiceCategories(list) {
    try {
      localStorage.setItem(scopedKey(STORE_SERVICE_CATEGORIES_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function getStoredServiceItems() {
    try {
      var raw = localStorage.getItem(scopedKey(STORE_SERVICE_ITEMS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredServiceItems(list) {
    try {
      localStorage.setItem(scopedKey(STORE_SERVICE_ITEMS_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateServiceCategoryId() {
    return window.GM_ID.generate('svcc');
  }

  function generateServiceItemId() {
    return window.GM_ID.generate('svci');
  }

  function findServiceCategoryById(id) {
    var list = getStoredServiceCategories();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findServiceItemById(id) {
    var list = getStoredServiceItems();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function serviceCategoryLabel(categoryId) {
    var cat = categoryId ? findServiceCategoryById(categoryId) : null;
    return cat ? cat.name : 'بدون تصنيف';
  }

  function countItemsInServiceCategory(categoryId) {
    return getStoredServiceItems().filter(function (it) { return it.categoryId === categoryId; }).length;
  }

  var serviceEditingCategoryId = null;

  function renderServiceCategoryList() {
    var list = document.getElementById('scp-list');
    var empty = document.getElementById('scp-empty');
    if (!list) return;

    var categories = getStoredServiceCategories();

    if (!categories.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      bootIcons();
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = categories.map(function (cat) {
      var itemsCount = countItemsInServiceCategory(cat.id);

      if (cat.id === serviceEditingCategoryId) {
        return (
          '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
            '<input type="text" id="scp-rename-' + escapeHtml(cat.id) + '" value="' + escapeHtml(cat.name) + '" style="flex:1;">' +
            '<div class="flex gap-8">' +
              '<button type="button" class="icon-btn" data-action="save-service-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حفظ"><i data-lucide="check" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="cancel-edit-service-category" aria-label="إلغاء"><i data-lucide="x" class="icon"></i></button>' +
            '</div>' +
          '</div>'
        );
      }

      return (
        '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
          '<div class="title">' + escapeHtml(cat.name) + '</div>' +
          '<div class="flex gap-8">' +
            '<span class="badge gray">' + itemsCount + ' خدمة</span>' +
            '<button type="button" class="icon-btn" data-action="edit-service-category" data-id="' + escapeHtml(cat.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
            '<button type="button" class="icon-btn" data-action="delete-service-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    bootIcons();
  }

  function renderServiceCategorySelectOptions() {
    var select = document.getElementById('sie-category');
    if (!select) return;
    var current = select.value;
    var categories = getStoredServiceCategories();

    select.innerHTML = '<option value="">بدون تصنيف</option>' + categories.map(function (cat) {
      return '<option value="' + escapeHtml(cat.id) + '">' + escapeHtml(cat.name) + '</option>';
    }).join('');

    if (categories.some(function (c) { return c.id === current; })) select.value = current;
  }

  function initServiceCategoryPanel() {
    var panel = document.getElementById('scp-panel');
    var scrim = document.getElementById('scp-scrim');
    if (!panel) return;

    var newNameInput = document.getElementById('scp-new-name');
    var addBtn = document.getElementById('scp-add-btn');

    function open() {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      serviceEditingCategoryId = null;
      renderServiceCategoryList();

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (newNameInput) { newNameInput.value = ''; newNameInput.focus(); }
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      serviceEditingCategoryId = null;
    }

    function addCategory() {
      var name = newNameInput ? newNameInput.value.trim() : '';
      if (!name) { if (newNameInput) newNameInput.focus(); return; }

      var list = getStoredServiceCategories();
      if (!guardPlanLimit('serviceCategories', list.length)) return;
      list.push({ id: generateServiceCategoryId(), name: name, createdAt: Date.now() });
      setStoredServiceCategories(list);

      if (newNameInput) newNameInput.value = '';
      renderServiceCategoryList();
      renderServiceCategorySelectOptions();
      renderServicesPage();
      showToast('تمت إضافة التصنيف', { icon: 'folder-plus' });
    }

    if (addBtn) addBtn.addEventListener('click', addCategory);
    if (newNameInput) {
      newNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
      });
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-service-category-panel"]');
      if (openTrigger) { e.preventDefault(); open(); return; }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-service-category-panel"]');
      if (closeTrigger) { close(); return; }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-service-category"]');
      if (editTrigger) {
        serviceEditingCategoryId = editTrigger.getAttribute('data-id');
        renderServiceCategoryList();
        var input = document.getElementById('scp-rename-' + serviceEditingCategoryId);
        if (input) { input.focus(); input.select(); }
        return;
      }

      var cancelTrigger = e.target.closest && e.target.closest('[data-action="cancel-edit-service-category"]');
      if (cancelTrigger) { serviceEditingCategoryId = null; renderServiceCategoryList(); return; }

      var saveTrigger = e.target.closest && e.target.closest('[data-action="save-service-category"]');
      if (saveTrigger) {
        var id = saveTrigger.getAttribute('data-id');
        var input2 = document.getElementById('scp-rename-' + id);
        var newName = input2 ? input2.value.trim() : '';
        if (!newName) { if (input2) input2.focus(); return; }

        var list2 = getStoredServiceCategories();
        for (var i = 0; i < list2.length; i++) {
          if (list2[i].id === id) { list2[i].name = newName; break; }
        }
        setStoredServiceCategories(list2);

        serviceEditingCategoryId = null;
        renderServiceCategoryList();
        renderServiceCategorySelectOptions();
        renderServicesPage();
        return;
      }

      var delTrigger = e.target.closest && e.target.closest('[data-action="delete-service-category"]');
      if (delTrigger) {
        var delId = delTrigger.getAttribute('data-id');
        var cat = findServiceCategoryById(delId);
        var itemsCount = countItemsInServiceCategory(delId);
        var message = itemsCount > 0
          ? 'سيتم حذف التصنيف «' + escapeHtml(cat ? cat.name : '') + '»، و' + itemsCount + ' خدمة بداخله هترجع «بدون تصنيف»'
          : 'سيتم حذف التصنيف «' + escapeHtml(cat ? cat.name : '') + '» نهائياً';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف التصنيف؟',
          message: message,
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredServiceCategories().filter(function (c) { return c.id !== delId; });
            setStoredServiceCategories(remaining);

            var items = getStoredServiceItems();
            var touched = false;
            items.forEach(function (it) {
              if (it.categoryId === delId) { it.categoryId = ''; touched = true; }
            });
            if (touched) setStoredServiceItems(items);

            renderServiceCategoryList();
            renderServiceCategorySelectOptions();
            renderServicesPage();
            showToast('تم حذف التصنيف', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });
  }

  function isCardPaymentServiceName(name) {
    return /دفع.{0,8}بطاق|visa|فيزا|mastercard|ماستر/i.test(name || '');
  }

  function isWhatsappOrderServiceName(name) {
    var hasWhatsappOrderService = getCurrentTypeServices().some(function (svc) {
      return svc.id === 'whatsapp_order';
    });
    if (!hasWhatsappOrderService) return false;
    return /(طلب|اطلب).{0,12}(واتس|وتس|whatsapp)|(واتس|وتس|whatsapp).{0,12}طلب/i.test(name || '');
  }

  function getLockedFeatureForServiceName(name) {
    if (isCardPaymentServiceName(name)) return 'cardPayment';
    if (isWhatsappOrderServiceName(name)) return 'whatsappOrder';
    return null;
  }

  function getServiceSuggestionSource() {
    var config = getStoreTypeConfig();
    if (config && Array.isArray(config.serviceSuggestions) && config.serviceSuggestions.length) {
      return { list: config.serviceSuggestions, fromConfig: true };
    }
    return { list: getCurrentTypeServices(), fromConfig: false };
  }

  function renderServiceSuggestions() {
    var grid = document.getElementById('service-suggestions-grid');
    var title = document.getElementById('service-suggestions-title');
    if (!grid) return;

    var existingNames = getStoredServiceItems().map(function (it) {
      return (it.name || '').trim().toLowerCase();
    });

    var suggestionSource = getServiceSuggestionSource();
    var suggestions = suggestionSource.list.filter(function (svc) {
      return existingNames.indexOf((svc.label || '').trim().toLowerCase()) === -1;
    });

    if (!suggestions.length) {
      grid.innerHTML = '';
      if (title) title.style.display = 'none';
      return;
    }
    if (title) title.style.display = '';

    grid.innerHTML = suggestions.map(function (svc) {
      var lockedFeatureKey = getServiceLockedFeatureKey(svc.id);
      var isLocked = isServiceLocked(svc.id);
      var icon = isLocked ? 'lock' : (SERVICE_SUGGESTION_ICONS[svc.id] || (suggestionSource.fromConfig && svc.icon) || 'sparkles');
      var lockAttr = lockedFeatureKey ? ' data-locked-feature="' + escapeHtml(lockedFeatureKey) + '"' : '';
      return (
        '<button type="button" class="card quick-card" data-action="add-service-suggestion" data-name="' + escapeHtml(svc.label) + '"' + lockAttr + ' ' +
          'style="width:100%;text-align:right;font:inherit;color:inherit;">' +
          '<div class="icon-wrap"><i data-lucide="' + safeIcon(icon, 'sparkles') + '" class="icon"></i></div>' +
          '<div><div class="title">' + escapeHtml(svc.label) + '</div><div class="sub">' + (isLocked ? LOCK_OVERLAY_TEXT : 'اضغط للإضافة') + '</div></div>' +
        '</button>'
      );
    }).join('');

    applyLockedFeaturesToUI();
    bootIcons();
  }

  var serviceSearchTerm = '';

  function renderServicesPage() {
    var tbody = document.getElementById('service-table-body');
    var dataWrap = document.getElementById('service-data-wrap');
    var emptyState = document.getElementById('service-empty-state');
    if (!tbody) return;

    var items = getStoredServiceItems();
    var categories = getStoredServiceCategories();

    var totalEl = document.getElementById('service-stat-total');
    var categoriesEl = document.getElementById('service-stat-categories');
    if (totalEl) totalEl.textContent = items.length;
    if (categoriesEl) categoriesEl.textContent = categories.length;
    var catBtnCount = document.getElementById('service-cat-btn-count');
    if (catBtnCount) catBtnCount.textContent = categories.length;

    var usageEl = document.getElementById('service-usage-counter');
    if (usageEl) {
      var usage = getPlanLimitStatus('services', items.length);
      if (usage.unlimited) {
        usageEl.style.display = 'none';
      } else {
        usageEl.textContent = usage.used + ' من ' + usage.limit + ' ' + LIMIT_NOUNS.services +
          (usage.canAdd ? '' : ' — وصلت للحد الأقصى');
        usageEl.style.display = '';
      }
    }

    var term = serviceSearchTerm.trim().toLowerCase();
    var visibleItems = term
      ? items.filter(function (it) {
          return (it.name || '').toLowerCase().indexOf(term) !== -1 ||
                 (it.description || '').toLowerCase().indexOf(term) !== -1 ||
                 serviceCategoryLabel(it.categoryId).toLowerCase().indexOf(term) !== -1 ||
                 extraFieldsMatch(term, getExtraFieldDefs('service'), it.extra);
        })
      : items;

    if (!visibleItems.length && term && items.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--db-text-tertiary);padding:24px;">لا توجد نتائج مطابقة لبحثك</td></tr>';
    } else {
      tbody.innerHTML = visibleItems.map(function (item) {
        var priceValue = (item.price !== '' && item.price != null && !isNaN(Number(item.price)))
          ? Number(item.price).toFixed(2)
          : null;
        var priceHtml = priceValue !== null
          ? '<span class="menu-price"><b>' + priceValue + '</b><i>₪</i></span>'
          : '<span class="menu-price menu-price--none"><b>—</b></span>';

        var descHtml = item.description
          ? '<div class="sub" style="margin-top:2px;">' + escapeHtml(item.description) + '</div>'
          : '';
        if (storeHasServiceField('duration') && item.duration) {
          descHtml += '<div class="sub" style="margin-top:2px;">مدة التنفيذ: ' + escapeHtml(item.duration) + '</div>';
        }
        var serviceExtraParts = formatExtraFields(getExtraFieldDefs('service'), item.extra);
        if (serviceExtraParts.length) {
          descHtml += '<div class="sub" style="margin-top:2px;">' + serviceExtraParts.join(' · ') + '</div>';
        }
        if (storeHasServiceField('priceFrom') && item.priceFrom === true && priceValue !== null) {
          priceHtml = '<span class="menu-price"><small style="color:var(--db-text-tertiary);margin-inline-end:4px;">يبدأ من</small><b>' + priceValue + '</b><i>₪</i></span>';
        }

        return (
          '<tr>' +
            '<td class="menu-td-name" data-label="الخدمة"><div class="menu-item-name-cell"><span>' + escapeHtml(item.name) + '</span></div>' + descHtml + '</td>' +
            '<td class="menu-td-cat" data-label="التصنيف"><span class="menu-cat-chip">' + escapeHtml(serviceCategoryLabel(item.categoryId)) + '</span></td>' +
            '<td class="menu-td-price" data-label="السعر">' + priceHtml + '</td>' +
            '<td class="menu-td-actions">' +
              '<button type="button" class="icon-btn" data-action="edit-service-item" data-id="' + escapeHtml(item.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="delete-service-item" data-id="' + escapeHtml(item.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
            '</td>' +
          '</tr>'
        );
      }).join('');
    }

    if (dataWrap && emptyState) {
      var hasItems = items.length > 0;
      dataWrap.style.display = hasItems ? '' : 'none';
      emptyState.style.display = hasItems ? 'none' : '';
    }

    renderServiceSuggestions();
    bootIcons();
  }

  window.renderServicesPage = renderServicesPage;

  function initServiceSearch() {
    var input = document.getElementById('service-search-input');
    if (!input) return;
    input.addEventListener('input', debounce(function () {
      serviceSearchTerm = input.value || '';
      renderServicesPage();
    }, 150));
  }

  function initServiceItemEditPanel() {
    var panel = document.getElementById('sie-panel');
    var scrim = document.getElementById('sie-scrim');
    if (!panel) return;

    var titleEl = document.getElementById('sie-title');
    var nameInput = document.getElementById('sie-name');
    var descInput = document.getElementById('sie-description');
    var categorySelect = document.getElementById('sie-category');
    var priceInput = document.getElementById('sie-price');
    var durationField = document.getElementById('sie-duration-field');
    var durationInput = document.getElementById('sie-duration');
    var extraContainer = document.getElementById('sie-extra-fields');
    var priceModeField = document.getElementById('sie-price-mode-field');
    var priceModeGroup = document.getElementById('sie-price-mode-group');
    var saveBtn = document.getElementById('sie-save-btn');

    var editingId = null;
    var selectedPriceFrom = false;

    function setPriceFrom(isOn) {
      selectedPriceFrom = !!isOn;
      if (!priceModeGroup) return;
      priceModeGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', (btn.getAttribute('data-value') === 'from') === selectedPriceFrom);
      });
    }

    function applyServiceFieldVisibility() {
      if (durationField) durationField.style.display = storeHasServiceField('duration') ? '' : 'none';
      if (priceModeField) priceModeField.style.display = storeHasServiceField('priceFrom') ? '' : 'none';
    }

    function resetForm() {
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      if (priceInput) priceInput.value = '';
      if (categorySelect) categorySelect.value = '';
      if (durationInput) durationInput.value = '';
      setPriceFrom(false);
    }

    function fillFormFromItem(item) {
      if (nameInput) nameInput.value = item.name || '';
      if (descInput) descInput.value = item.description || '';
      if (priceInput) priceInput.value = item.price != null ? item.price : '';
      if (categorySelect) categorySelect.value = item.categoryId || '';
      if (durationInput) durationInput.value = item.duration || '';
      setPriceFrom(item.priceFrom === true);
    }

    function open(itemToEdit) {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      renderServiceCategorySelectOptions();
      applyServiceFieldVisibility();
      renderExtraFields(extraContainer, 'sie', getExtraFieldDefs('service'), itemToEdit ? itemToEdit.extra : null);

      editingId = itemToEdit ? itemToEdit.id : null;

      if (itemToEdit) {
        fillFormFromItem(itemToEdit);
        if (titleEl) titleEl.textContent = 'تعديل خدمة';
      } else {
        resetForm();
        if (titleEl) titleEl.textContent = 'خدمة جديدة';
      }

      panel.classList.add('open');
      if (scrim) scrim.classList.add('open');
      document.body.style.overflow = 'hidden';
      bootIcons();
      if (nameInput) nameInput.focus();
    }

    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('open');
      document.body.style.overflow = '';
      editingId = null;
    }

    document.addEventListener('click', function (e) {
      var suggestTrigger = e.target.closest && e.target.closest('[data-action="add-service-suggestion"]');
      if (suggestTrigger) {
        e.preventDefault();
        if (guardPlanLimit('services', getStoredServiceItems().length)) {
          open(null);
          if (nameInput) nameInput.value = suggestTrigger.getAttribute('data-name') || '';
        }
        return;
      }

      var openTrigger = e.target.closest && e.target.closest('[data-action="open-service-item-add"]');
      if (openTrigger) {
        e.preventDefault();
        if (guardPlanLimit('services', getStoredServiceItems().length)) open(null);
        return;
      }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-service-item"]');
      if (editTrigger) {
        e.preventDefault();
        var itemToEdit = findServiceItemById(editTrigger.getAttribute('data-id'));
        if (itemToEdit) open(itemToEdit);
        return;
      }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-service-item-add"]');
      if (closeTrigger) { close(); return; }

      var priceModeBtn = e.target.closest && e.target.closest('#sie-price-mode-group .seg-btn');
      if (priceModeBtn) setPriceFrom(priceModeBtn.getAttribute('data-value') === 'from');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { if (nameInput) nameInput.focus(); return; }

        var priceRaw = priceInput ? priceInput.value : '';
        var price = priceRaw !== '' ? Number(priceRaw) : null;
        var description = descInput ? descInput.value.trim() : '';
        var withDurationField = storeHasServiceField('duration');
        var withPriceFromField = storeHasServiceField('priceFrom');
        var duration = (withDurationField && durationInput) ? durationInput.value.trim() : '';
        var extraDefs = getExtraFieldDefs('service');
        var extra = extraDefs.length ? readExtraFields(extraContainer, extraDefs) : null;

        var lockedFeatureForName = getLockedFeatureForServiceName(name);
        if (lockedFeatureForName && isFeatureLockedForPlan(lockedFeatureForName)) {
          openUpgradeModal({ featureKey: lockedFeatureForName });
          return;
        }

        var list = getStoredServiceItems();

        if (!editingId && !guardPlanLimit('services', list.length)) return;

        if (editingId) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === editingId) {
              list[i].name = name;
              list[i].description = description;
              list[i].categoryId = categorySelect ? categorySelect.value : '';
              list[i].price = price;
              if (withDurationField) list[i].duration = duration;
              if (withPriceFromField) list[i].priceFrom = selectedPriceFrom;
              if (extra) list[i].extra = extra;
              break;
            }
          }
        } else {
          var newService = {
            id: generateServiceItemId(),
            name: name,
            description: description,
            categoryId: categorySelect ? categorySelect.value : '',
            price: price,
            createdAt: Date.now()
          };
          if (withDurationField) newService.duration = duration;
          if (withPriceFromField) newService.priceFrom = selectedPriceFrom;
          if (extra) newService.extra = extra;
          list.unshift(newService);
        }

        setStoredServiceItems(list);
        close();
        renderServicesPage();
        showToast(editingId ? 'تم تعديل الخدمة' : 'تمت إضافة الخدمة', { icon: 'wrench' });
      });
    }
  }

  function initServiceItemActions() {
    document.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-service-item"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        var itemToDelete = findServiceItemById(idToDelete);
        var nameHtml = itemToDelete ? '<strong>' + escapeHtml(itemToDelete.name) + '</strong>' : 'هذه الخدمة';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف الخدمة؟',
          message: 'سيتم حذف «' + nameHtml + '» نهائياً من قائمة خدماتك',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredServiceItems().filter(function (it) { return it.id !== idToDelete; });
            setStoredServiceItems(remaining);
            renderServicesPage();
            showToast('تم حذف الخدمة', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }
    });
  }

  function packagesFeatureLi(text, on) {
    var mark = on
      ? '<span class="pkg-feature-mark" aria-hidden="true"><i data-lucide="check" class="icon"></i></span>'
      : '<span class="pkg-feature-mark" aria-hidden="true"><i data-lucide="x" class="icon"></i></span>';
    var srOnly = on ? '' : '<span class="pkg-sr-only">غير متاح: </span>';
    return (
      '<li class="pkg-feature' + (on ? '' : ' pkg-feature--off') + '">' +
        mark +
        '<span>' + srOnly + text + '</span>' +
      '</li>'
    );
  }

  function renderPackagesPage() {
    var config = getStoreTypeConfig();
    if (!config || !config.packages) return;
    var grid = document.getElementById('pkg-grid');
    if (!grid) return;

    var pkgs = config.packages;
    var free = pkgs.free;
    var paid = pkgs.paid;
    var planView = getCurrentPlanView();
    var isPaidPlan = planView.id === 'paid';

    var subtitle = document.getElementById('pkg-page-subtitle');
    if (subtitle && pkgs.pageSubtitle) subtitle.textContent = pkgs.pageSubtitle;

    var currentName = document.getElementById('pkg-current-name');
    if (currentName) currentName.textContent = planView.name;
    var currentChip = document.getElementById('pkg-current-chip');
    if (currentChip) currentChip.textContent = planView.name;

    var freeFeaturesHTML = free.features.map(function (f) {
      return packagesFeatureLi(f.label, f.on);
    }).join('');

    var paidFeaturesHTML = paid.features.map(function (label) {
      return packagesFeatureLi(label, true);
    }).join('');

    var badgeHTML = paid.badge ? '<span class="pkg-badge">' + paid.badge + '</span>' : '';

    var currentPlanButtonHTML =
      '<button type="button" class="btn pkg-btn pkg-btn--current" disabled>' +
        '<i data-lucide="check" class="icon"></i> باقتك الحالية' +
      '</button>';

    var freeActionHTML = isPaidPlan ? '' : currentPlanButtonHTML;

    var paidActionHTML = isPaidPlan ? currentPlanButtonHTML : (
      '<button type="button" class="btn btn-primary pkg-btn" data-action="select-package" data-plan="' + escapeHtml(paid.id) + '" aria-expanded="false" aria-controls="pkg-pay">' +
        '<span class="pkg-swap">' +
          '<span class="pkg-swap-item">' + paid.buttonLabel + '</span>' +
          '<span class="pkg-swap-item pkg-swap-item--alt" aria-hidden="true"><i data-lucide="check" class="icon"></i> تم الاختيار</span>' +
        '</span>' +
      '</button>' +
      '<div class="pkg-pay" id="pkg-pay" role="region" aria-label="خطوات إتمام الاشتراك">' +
        '<div class="pkg-pay-inner">' +
          '<div class="pkg-pay-body">' +
            '<div class="pkg-pay-box">' +
              '<div class="pkg-pay-step">' +
                '<span class="pkg-pay-step-no" aria-hidden="true">1</span>' +
                '<span>حوّل المبلغ عبر بنك فلسطين (باسم كريم وائل ابو عويمر)</span>' +
              '</div>' +
              '<div class="pkg-pay-number-row">' +
                '<span class="pkg-pay-number" data-bank-number>0592194533</span>' +
                '<button type="button" class="btn btn-sm pkg-copy" data-action="copy-bank-number">' +
                  '<span class="pkg-swap">' +
                    '<span class="pkg-swap-item"><i data-lucide="copy" class="icon"></i> نسخ</span>' +
                    '<span class="pkg-swap-item pkg-swap-item--alt" aria-hidden="true"><i data-lucide="check" class="icon"></i> تم النسخ</span>' +
                  '</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div class="pkg-pay-box">' +
              '<div class="pkg-pay-step">' +
                '<span class="pkg-pay-step-no" aria-hidden="true">2</span>' +
                '<span>أرسل إشعار التحويل للتأكيد</span>' +
              '</div>' +
              '<a class="btn pkg-wa-btn" href="https://wa.me/qr/JJQK3CTIZA5YJ1" target="_blank" rel="noopener" data-whatsapp="970567359920" data-message="' + paid.whatsappMessage + '" data-entity-name-label="' + (pkgs.entityNameLabel || 'الاسم') + '">' +
                '<i data-lucide="message-circle" class="icon"></i> إرسال عبر واتساب' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<span class="pkg-sr-only" role="status" aria-live="polite" id="pkg-status"></span>'
    );

    grid.innerHTML =
      '<article class="card pkg-card" aria-labelledby="pkg-free-name">' +
        '<div class="pkg-eyebrow">' + free.eyebrow + '</div>' +
        '<h2 class="pkg-name" id="pkg-free-name">' + escapeHtml(free.name) + '</h2>' +
        '<p class="pkg-desc">' + free.desc + '</p>' +
        '<div class="pkg-price">' +
          '<span class="pkg-price-amount">' + free.price + '</span>' +
          '<span class="pkg-price-currency">₪</span>' +
        '</div>' +
        '<ul class="pkg-features">' + freeFeaturesHTML + '</ul>' +
        freeActionHTML +
      '</article>' +
      '<article class="card pkg-card pkg-card--featured" aria-labelledby="pkg-paid-name">' +
        badgeHTML +
        '<div class="pkg-eyebrow">' + paid.eyebrow + '</div>' +
        '<h2 class="pkg-name" id="pkg-paid-name">' + escapeHtml(paid.name) + '</h2>' +
        '<p class="pkg-desc">' + paid.desc + '</p>' +
        '<div class="pkg-price">' +
          '<span class="pkg-price-amount pkg-price-amount--accent">' + paid.price + '</span>' +
          '<span class="pkg-price-currency">₪</span>' +
          '<span class="pkg-price-period">/ شهر</span>' +
        '</div>' +
        '<ul class="pkg-features">' + paidFeaturesHTML + '</ul>' +
        paidActionHTML +
      '</article>';

    bootIcons();
  }

  function initPackagesPage() {
    renderPackagesPage();

    var pay = document.getElementById('pkg-pay');
    if (!pay) return;

    var card = document.querySelector('.pkg-card--featured');
    var status = document.getElementById('pkg-status');
    var copyTimer = null;
    var scrollTimer = null;

    function prefersReducedMotion() {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function setSwapped(btn, on) {
      var items = btn.querySelectorAll('.pkg-swap-item');
      btn.classList.toggle('is-swapped', on);
      if (items.length === 2) {
        items[0].setAttribute('aria-hidden', on ? 'true' : 'false');
        items[1].setAttribute('aria-hidden', on ? 'false' : 'true');
      }
    }

    function getWorkspaceName() {
      var profile = getStoredProfile();
      return profile && profile.name ? String(profile.name).trim() : '';
    }

    function buildWhatsappLink(link) {
      var phone = link.getAttribute('data-whatsapp');
      var message = link.getAttribute('data-message') || '';
      var workspaceName = getWorkspaceName();
      var entityNameLabel = link.getAttribute('data-entity-name-label') || 'اسم المساحة';
      if (workspaceName) message += '\n' + entityNameLabel + ': ' + workspaceName;
      link.setAttribute('href', 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message));
    }

    function buildWhatsappLinks() {
      document.querySelectorAll('[data-whatsapp]').forEach(buildWhatsappLink);
    }

    function selectPackage(btn) {
      setSwapped(btn, true);
      btn.setAttribute('aria-expanded', 'true');
      if (card) card.classList.add('is-active');
      pay.classList.add('is-open');
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(function () {
        pay.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'nearest'
        });
      }, 380);
    }

    function deselectPackage(btn) {
      window.clearTimeout(scrollTimer);
      setSwapped(btn, false);
      btn.setAttribute('aria-expanded', 'false');
      if (card) card.classList.remove('is-active');
      pay.classList.remove('is-open');
    }

    function copyNumber(btn) {
      var source = document.querySelector('[data-bank-number]');
      if (!source) return;
      copyText(source.textContent.trim()).then(function () {
        setSwapped(btn, true);
        if (status) status.textContent = 'تم نسخ الرقم';
        window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(function () {
          setSwapped(btn, false);
          if (status) status.textContent = '';
        }, 1800);
      }).catch(function () {
        if (status) status.textContent = 'تعذر نسخ الرقم';
      });
    }

    document.addEventListener('click', function (e) {
      var waLink = e.target.closest && e.target.closest('[data-whatsapp]');
      if (waLink) buildWhatsappLink(waLink);

      var selectBtn = e.target.closest && e.target.closest('[data-action="select-package"]');
      if (selectBtn) {
        if (selectBtn.getAttribute('aria-expanded') === 'true') {
          deselectPackage(selectBtn);
        } else {
          selectPackage(selectBtn);
        }
        return;
      }
      var copyBtn = e.target.closest && e.target.closest('[data-action="copy-bank-number"]');
      if (copyBtn) {
        copyNumber(copyBtn);
      }
    });

    buildWhatsappLinks();
  }

  var SHARED_PAGES = ['dashboard', 'packages', 'profile'];

  function isPageAllowedForType(page) {
    if (!page || SHARED_PAGES.indexOf(page) !== -1) return true;
    var config = getStoreTypeConfig();
    if (!config) return true;
    var lists = [config.sidebar, config.mobileNav, config.dashboardCards];
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i] || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j] && list[j].page === page) return true;
      }
    }
    return false;
  }

  function guardPageForStoreType() {
    var page = document.body.getAttribute('data-page');
    if (isPageAllowedForType(page)) return true;
    window.location.replace('dashboard.html');
    return false;
  }

  var SAVE_DELAY_MS = 550;

  function initSaveButtonDelay() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('button[id$="-save-btn"]');
      if (!btn || btn.disabled) return;
      if (btn.getAttribute('data-save-passed') === '1') {
        btn.removeAttribute('data-save-passed');
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (btn.classList.contains('is-saving')) return;
      btn.classList.add('is-saving');
      btn.setAttribute('aria-busy', 'true');
      window.setTimeout(function () {
        btn.classList.remove('is-saving');
        btn.removeAttribute('aria-busy');
        btn.setAttribute('data-save-passed', '1');
        btn.click();
        btn.removeAttribute('data-save-passed');
      }, SAVE_DELAY_MS);
    }, true);
  }

  function buildQrCanvas(text, size) {
    if (typeof window.qrcode !== 'function') return null;
    var qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var count = qr.getModuleCount();
    var margin = 2;
    var cell = Math.max(1, Math.floor(size / (count + margin * 2)));
    var total = cell * (count + margin * 2);
    var canvas = document.createElement('canvas');
    canvas.width = total;
    canvas.height = total;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, total, total);
    ctx.fillStyle = '#1f3f9e';
    for (var r = 0; r < count; r++) {
      for (var col = 0; col < count; col++) {
        if (qr.isDark(r, col)) ctx.fillRect((col + margin) * cell, (r + margin) * cell, cell, cell);
      }
    }
    return canvas;
  }

  function closeQrModal() {
    var root = document.getElementById('qr-modal');
    if (root && root.parentNode) root.parentNode.removeChild(root);
    document.removeEventListener('keydown', onQrModalKeydown);
  }

  function onQrModalKeydown(e) {
    if (e.key === 'Escape') closeQrModal();
  }

  function openQrModal() {
    closeQrModal();
    var profile = getStoredProfile();
    var url = getPublicUrl(profile);
    var name = (profile && profile.name) || getFallbackName();
    var canvas = null;
    try {
      canvas = buildQrCanvas(url, 480);
    } catch (err) {
      canvas = null;
    }

    var root = document.createElement('div');
    root.className = 'qr-modal';
    root.id = 'qr-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'كود QR');
    root.innerHTML =
      '<div class="qr-modal-card">' +
        '<button type="button" class="icon-btn qr-modal-close" data-qr-close aria-label="إغلاق"><i data-lucide="x" class="icon"></i></button>' +
        '<h3 class="qr-modal-title">كود QR</h3>' +
        '<p class="qr-modal-sub">يوجّه كل من يمسحه إلى صفحة ' + escapeHtml(name) + ' في المنصة.</p>' +
        '<div class="qr-modal-code" data-qr-slot></div>' +
        '<div class="qr-modal-url" dir="ltr">' + escapeHtml(url) + '</div>' +
        '<div class="qr-modal-actions">' +
          '<button type="button" class="btn btn-primary" data-qr-share><i data-lucide="share-2" class="icon"></i> مشاركة</button>' +
          '<button type="button" class="btn btn-ghost" data-qr-download><i data-lucide="download" class="icon"></i> تحميل</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    var slot = root.querySelector('[data-qr-slot]');
    if (canvas) {
      canvas.className = 'qr-modal-canvas';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'كود QR');
      slot.appendChild(canvas);
    } else {
      slot.textContent = 'تعذّر إنشاء الكود حالياً.';
      root.querySelector('[data-qr-download]').disabled = true;
    }

    root.addEventListener('click', function (e) {
      if (e.target === root || (e.target.closest && e.target.closest('[data-qr-close]'))) {
        closeQrModal();
        return;
      }
      if (e.target.closest && e.target.closest('[data-qr-share]')) {
        if (navigator.share) {
          navigator.share({ title: name, url: url }).catch(function () {});
        } else {
          copyText(url).then(function () {
            showToast('تم نسخ الرابط');
          }, function () {
            showToast('تعذّر نسخ الرابط', { danger: true, icon: 'x-circle' });
          });
        }
        return;
      }
      if (e.target.closest && e.target.closest('[data-qr-download]') && canvas) {
        var link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'qr-code.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
    document.addEventListener('keydown', onQrModalKeydown);
    bootIcons();
    var closeBtn = root.querySelector('[data-qr-close]');
    if (closeBtn) closeBtn.focus();
  }

  function initQrAction() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-action="open-qr"]');
      if (!trigger) return;
      e.preventDefault();
      openQrModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var trigger = e.target.closest && e.target.closest('[data-action="open-qr"][role="button"]');
      if (!trigger) return;
      e.preventDefault();
      if (isFeatureLockedForPlan('qrCode')) {
        openUpgradeModal({ featureKey: 'qrCode' });
      } else {
        openQrModal();
      }
    });
  }

  async function init() {
    if (window.GMAuth && typeof window.GMAuth.whenReady === 'function') {
      if (!(await window.GMAuth.whenReady())) return;
    }
    if (!guardPageForStoreType()) return;
    initHeroDynamicInfo();
    ensureMobileNavHost();
    await Promise.all([
      loadPartial('#topnav-slot', 'topnav.html'),
      loadPartial('#sidebar-slot', 'sidebar.html'),
      loadPartial('#topbar-slot', 'topbar.html'),
      loadPartial('#profile-edit-slot', 'profile-edit-panel.html'),
      loadPartial('#prices-edit-slot', 'prices-hours-edit-panel.html'),
      loadPartial('#services-edit-slot', 'services-edit-panel.html'),
      loadPartial('#subscriber-add-slot', 'subscriber-add-panel.html'),
      loadPartial('#ad-edit-slot', 'ad-edit-panel.html'),
      loadPartial('#menu-category-slot', 'menu-category-panel.html'),
      loadPartial('#menu-item-edit-slot', 'menu-item-edit-panel.html'),
      loadPartial('#table-edit-slot', 'table-edit-panel.html'),
      loadPartial('#product-category-slot', 'product-category-panel.html'),
      loadPartial('#product-item-edit-slot', 'product-item-edit-panel.html'),
      loadPartial('#service-category-slot', 'service-category-panel.html'),
      loadPartial('#service-item-edit-slot', 'service-item-edit-panel.html'),
      loadPartial('#mobile-nav-slot', 'mobile-nav.html')
    ]);
    renderSidebarNav();
    renderMobileNav();
    renderMobileMore();
    renderDashboardQuickCards();
    applyStoreTypeLabel();
    applyStoreTypePageCopy();
    applyCurrentPlanToUI();
    applyLockedFeaturesToUI();
    markActiveNavItem();
    wireDrawer();
    wireSwitches();
    wireThemeToggle();
    wireTopnavAccountLink();
    wireMobileMoreSheet();
    wireNotifications();
    renderNotifications();
    checkAdExpiryNotifications();
    initLogoutAction();
    applyProfileToUI(getStoredProfile());
    applyOpenStatusToUI(getStoredOpenStatus());
    applyVisitsToUI();
    renderSubscribersPage();
    renderSubscriptionRequestsPage();
    renderTablesPage();
    renderReservationsPage();
    renderAdsPage();
    initProfileEditPanel();
    initPricesHoursEditPanel();
    initServicesEditPanel();
    initSubscriberAddPanel();
    initSubscriberActions();
    initSubscriptionRequestActions();
    initTableAddPanel();
    initTableActions();
    initReservationActions();
    initReservationsSearch();
    initAdAddPanel();
    initAdActions();
    renderMenuPage();
    initMenuCategoryPanel();
    initMenuItemEditPanel();
    initMenuItemActions();
    initMenuSearch();
    renderProductsPage();
    initProductCategoryPanel();
    initProductItemEditPanel();
    initProductItemActions();
    initProductSearch();
    renderServicesPage();
    initServiceCategoryPanel();
    initServiceItemEditPanel();
    initServiceItemActions();
    initServiceSearch();
    initOpenStatusToggle();
    initProfilePageExtras();
    initCopyLinkButtons();
    initPackagesPage();
    initLockedFeatures();
    initQrAction();
    initSaveButtonDelay();
    bootIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();