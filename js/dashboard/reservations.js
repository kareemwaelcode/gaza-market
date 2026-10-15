(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var bootIcons = GM.bootIcons;
  var GAZA_TZ = GM.GAZA_TZ;
  var LIMIT_NOUNS = GM.LIMIT_NOUNS;
  var getPlanLimitStatus = GM.getPlanLimitStatus;
  var updateReservationsNavBadge = GM.updateReservationsNavBadge;
  var escapeHtml = GM.escapeHtml;
  var handleStorageError = GM.handleStorageError;
  var debounce = GM.debounce;
  var showToast = GM.showToast;
  var openConfirmModal = GM.openConfirmModal;
  var scopedKey = GM.scopedKey;
  var addNotification = GM.addNotification;
  var getStoredReservations = GM.getStoredReservations;
  var getStoredTables = GM.getStoredTables;
  var setStoredTables = GM.setStoredTables;

  var RESERVATIONS_STORAGE_KEY = 'gmDashboardReservations';
  var RESERVATIONS_CREATED_KEY = 'gmDashboardReservationsCreated';

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

  GM.registerPage('reservations', {
    init: function () {
      renderReservationsPage();
      initReservationActions();
      initReservationsSearch();
    }
  });

})();