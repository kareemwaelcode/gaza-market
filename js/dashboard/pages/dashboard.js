(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var getStoreTypeConfig = GM.getStoreTypeConfig;
  var getFallbackName = GM.getFallbackName;
  var bootIcons = GM.bootIcons;
  var GAZA_TZ = GM.GAZA_TZ;
  var updateHeroPlanChip = GM.updateHeroPlanChip;
  var isFeatureLockedForPlan = GM.isFeatureLockedForPlan;
  var openUpgradeModal = GM.openUpgradeModal;
  var getStoredProfile = GM.getStoredProfile;
  var getPublicUrl = GM.getPublicUrl;
  var copyText = GM.copyText;
  var escapeHtml = GM.escapeHtml;
  var safeIcon = GM.safeIcon;
  var safeAction = GM.safeAction;
  var safeHref = GM.safeHref;
  var showToast = GM.showToast;
  var GAZA_LAT = GM.GAZA_LAT;
  var GAZA_LNG = GM.GAZA_LNG;

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

  function initHeroDynamicInfo() {
    updateHeroDateLine();
    updateHeroPlanChip();
    updateAzanPill();
    setInterval(function () {
      updateHeroDateLine();
      updateAzanPill();
    }, 60 * 1000);
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

  GM.registerPage('dashboard', {
    beforePartials: initHeroDynamicInfo,
    afterNavRender: renderDashboardQuickCards,
    init: initQrAction
  });

})();