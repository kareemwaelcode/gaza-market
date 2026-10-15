(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var getStoreTypeConfig = GM.getStoreTypeConfig;
  var getFallbackAvatarLetter = GM.getFallbackAvatarLetter;
  var closeSidebarDrawerIfNeeded = GM.closeSidebarDrawerIfNeeded;
  var closeMobileMoreSheet = GM.closeMobileMoreSheet;
  var bootIcons = GM.bootIcons;
  var getServiceLockedFeatureKey = GM.getServiceLockedFeatureKey;
  var isServiceLocked = GM.isServiceLocked;
  var LOCK_OVERLAY_TEXT = GM.LOCK_OVERLAY_TEXT;
  var compressImageFile = GM.compressImageFile;
  var applyLockedFeaturesToUI = GM.applyLockedFeaturesToUI;
  var getStoredProfile = GM.getStoredProfile;
  var setStoredProfile = GM.setStoredProfile;
  var getPublicUrl = GM.getPublicUrl;
  var copyText = GM.copyText;
  var updateReservationsNavBadge = GM.updateReservationsNavBadge;
  var applyProfileToUI = GM.applyProfileToUI;
  var getTodayISODate = GM.getTodayISODate;
  var parseISODate = GM.parseISODate;
  var escapeHtml = GM.escapeHtml;
  var safeIcon = GM.safeIcon;
  var toCssUrl = GM.toCssUrl;
  var isValidCoordinate = GM.isValidCoordinate;
  var parseStoredObject = GM.parseStoredObject;
  var handleStorageError = GM.handleStorageError;
  var showToast = GM.showToast;
  var scopedKey = GM.scopedKey;
  var addNotification = GM.addNotification;
  var GAZA_LAT = GM.GAZA_LAT;
  var GAZA_LNG = GM.GAZA_LNG;

  var PRICES_HOURS_STORAGE_KEY = 'gmDashboardPricesHours';
  var SERVICES_STORAGE_KEY = 'gmDashboardServices';
  var TABLES_STORAGE_KEY = 'gmDashboardTables';
  var RESERVATIONS_STORAGE_KEY = 'gmDashboardReservations';
  var ADS_STORAGE_KEY = 'gmDashboardAds';

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

  function getStoredReservations() {
    try {
      var raw = localStorage.getItem(scopedKey(RESERVATIONS_STORAGE_KEY));
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
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

  function getAdOptions() {
    var config = getStoreTypeConfig();
    return (config && config.adOptions) || {};
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

  function refreshReservationsNavBadge() {
    var pendingCount = 0;
    getStoredReservations().forEach(function (res) {
      if (res.status === 'pending') pendingCount++;
    });
    updateReservationsNavBadge(pendingCount);
  }

  GM.getStoredReservations = getStoredReservations;
  GM.getStoredTables = getStoredTables;
  GM.setStoredTables = setStoredTables;
  GM.getAdOptions = getAdOptions;
  GM.getAdsStorageKey = getAdsStorageKey;
  GM.getStoredAds = getStoredAds;
  GM.setStoredAds = setStoredAds;
  GM.getCurrentTypeServices = getCurrentTypeServices;

  GM.registerCommon({
    partials: [
      ['#profile-edit-slot', 'profile-edit-panel.html'],
      ['#prices-edit-slot', 'prices-hours-edit-panel.html'],
      ['#services-edit-slot', 'services-edit-panel.html']
    ],
    afterNotifications: checkAdExpiryNotifications,
    init: function () {
      refreshReservationsNavBadge();
      initProfileEditPanel();
      initPricesHoursEditPanel();
      initServicesEditPanel();
      initProfilePageExtras();
      initCopyLinkButtons();
    }
  });

})();