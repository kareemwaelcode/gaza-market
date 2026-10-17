/*
 * Gaza Market - dashboard page: ads
 * Ads / offers / activities list and add-edit panel.
 * Moved verbatim from the former js/usere-dashboard.js (no behaviour change).
 * Load order: core.js, shell.js, page-runner.js, common.js, [extra-fields.js,] this file.
 */
(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM || !GM.registerPage) { console.error('GMDash is missing: load js/dashboard/core.js, shell.js, page-runner.js and common.js first.'); return; }

  var getStoreTypeConfig = GM.getStoreTypeConfig;
  var closeSidebarDrawerIfNeeded = GM.closeSidebarDrawerIfNeeded;
  var closeMobileMoreSheet = GM.closeMobileMoreSheet;
  var bootIcons = GM.bootIcons;
  var GAZA_TZ = GM.GAZA_TZ;
  var getPlanLimitStatus = GM.getPlanLimitStatus;
  var guardPlanLimit = GM.guardPlanLimit;
  var parseISODate = GM.parseISODate;
  var escapeHtml = GM.escapeHtml;
  var safeExternalUrl = GM.safeExternalUrl;
  var showToast = GM.showToast;
  var openConfirmModal = GM.openConfirmModal;
  var addNotification = GM.addNotification;
  var getAdOptions = GM.getAdOptions;
  var getStoredAds = GM.getStoredAds;
  var setStoredAds = GM.setStoredAds;

  var AD_TYPE_LABELS = { activity: 'فعالية', workshop: 'ورشة', job: 'وظيفة', offer: 'عرض' };
  var DEFAULT_AD_TYPES = ['activity', 'workshop', 'job', 'offer'];

  function getAllowedAdTypes() {
    var config = getStoreTypeConfig();
    if (config && Array.isArray(config.adTypes) && config.adTypes.length) return config.adTypes;
    return DEFAULT_AD_TYPES;
  }

  function formatAdPrice(value) {
    var n = Number(value);
    if (!isFinite(n)) return '';
    return String(Math.round(n * 100) / 100) + ' ₪';
  }

  function generateAdId() {
    return window.GM_ID.generate('ad');
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

  GM.registerPage('ads', {
    partials: [
      ['#ad-edit-slot', 'ad-edit-panel.html']
    ],
    init: function () {
      renderAdsPage();
      initAdAddPanel();
      initAdActions();
    }
  });

})();