(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var getStoreTypeConfig = GM.getStoreTypeConfig;
  var bootIcons = GM.bootIcons;
  var getCurrentPlanView = GM.getCurrentPlanView;
  var getStoredProfile = GM.getStoredProfile;
  var copyText = GM.copyText;
  var escapeHtml = GM.escapeHtml;

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
                '<span>حوّل المبلغ عبر بنك فلسطين (بأسم: كريم وائل ابو عويمر)</span>' +
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
          '<span class="pkg-price-period">/ شهرين</span>' +
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

  GM.registerPage('packages', { init: initPackagesPage });

})();