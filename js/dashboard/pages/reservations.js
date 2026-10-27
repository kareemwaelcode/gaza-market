(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var bootIcons = GM.bootIcons;
  var GAZA_TZ = GM.GAZA_TZ;
  var LIMIT_NOUNS = GM.LIMIT_NOUNS;
  var updateReservationsNavBadge = GM.updateReservationsNavBadge;
  var escapeHtml = GM.escapeHtml;
  var debounce = GM.debounce;
  var showToast = GM.showToast;
  var openConfirmModal = GM.openConfirmModal;

  var api = window.GMBookingApi;

  var PAGE_SIZE = 20;
  var SEARCH_DELAY_MS = 300;

  // The server (or the mock that mirrors it) is the source of truth. This page only keeps the last loaded snapshot:
  // items = the pages loaded so far, meta = cursor info of the last page, summary = counters and plan usage.
  var state = {
    items: [],
    meta: { nextCursor: null, hasMore: false, total: null },
    summary: null,
    q: '',
    view: 'loading',
    errorText: '',
    allSeq: 0,
    listSeq: 0,
    busy: false,
    loadingMore: false
  };

  var ERROR_TEXT = {
    NETWORK: 'تأكد من اتصالك بالإنترنت وجرّب مرة ثانية.',
    UNAUTHENTICATED: 'انتهت الجلسة. سجّل دخولك من جديد.',
    FORBIDDEN: 'ما عندك صلاحية على هاي الصفحة.',
    NOT_FOUND: 'الحجوزات مش متاحة لنوع نشاطك.',
    RATE_LIMITED: 'محاولات كثيرة. استنى شوي وجرّب مرة ثانية.',
    SERVER: 'صار خطأ. جرّب مرة ثانية.'
  };

  function errorText(result) {
    return ERROR_TEXT[result && result.code] || ERROR_TEXT.SERVER;
  }

  function findReservationById(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
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

  function tableLabelFor(item) {
    if (item.table) return escapeHtml(item.table.name);
    return item.tableDeleted ? 'طاولة محذوفة' : 'بدون تحديد';
  }

  function hiddenLabel(count) {
    if (count === 1) return 'حجز واحد مخفي';
    if (count === 2) return 'حجزين مخفيين';
    if (count <= 10) return count + ' حجوزات مخفية';
    return count + ' حجز مخفي';
  }

  function setStateBlock(icon, title, sub, canRetry, spinning) {
    var block = document.getElementById('res-state');
    if (!block) return;
    var iconHost = document.getElementById('res-state-icon');
    var titleEl = document.getElementById('res-state-title');
    var subEl = document.getElementById('res-state-sub');
    var retryBtn = document.getElementById('res-state-retry');

    if (iconHost) {
      iconHost.innerHTML = '<i data-lucide="' + icon + '" class="icon"></i>';
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      iconHost.style.animation = spinning && !reduceMotion ? 'gm-spin 1s linear infinite' : '';
    }
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub || '';
    if (retryBtn) retryBtn.style.display = canRetry ? '' : 'none';
    block.setAttribute('aria-busy', spinning ? 'true' : 'false');
    block.style.display = '';
  }

  function buildRow(item, disabledAttr) {
    var id = escapeHtml(item.id);
    var whatsappDisplay = '+' + item.countryCode + item.whatsapp;
    var avatarLetter = escapeHtml((item.name || '').trim().charAt(0) || '؟');
    var statusBadge = buildReservationStatusBadge(item.status);
    var dateLabel = item.datetime ? formatReservationDateTime(item.datetime) : '\u2014';
    var tableLabel = tableLabelFor(item);
    var peopleLine = item.peopleCount ? (escapeHtml(String(item.peopleCount)) + ' أشخاص') : '';

    var rowActionsHtml;
    var cardActionsHtml;
    if (item.status === 'pending') {
      rowActionsHtml =
        '<button type="button" class="btn btn-primary btn-sm" data-action="confirm-reservation" data-id="' + id + '"' + disabledAttr + '>تأكيد</button>' +
        '<button type="button" class="btn btn-danger btn-sm" data-action="cancel-reservation" data-id="' + id + '"' + disabledAttr + '>إلغاء</button>';
      cardActionsHtml =
        '<button type="button" class="btn btn-sm btn-primary" data-action="confirm-reservation" data-id="' + id + '"' + disabledAttr + '>' +
          '<i data-lucide="check" class="icon"></i> تأكيد' +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="cancel-reservation" data-id="' + id + '"' + disabledAttr + '>' +
          '<i data-lucide="x" class="icon"></i> إلغاء' +
        '</button>';
    } else if (item.status === 'confirmed') {
      rowActionsHtml =
        '<button type="button" class="btn btn-danger btn-sm" data-action="cancel-reservation" data-id="' + id + '"' + disabledAttr + '>إلغاء الحجز</button>';
      cardActionsHtml =
        '<button type="button" class="btn btn-sm btn-danger" data-action="cancel-reservation" data-id="' + id + '"' + disabledAttr + '>' +
          '<i data-lucide="x" class="icon"></i> إلغاء الحجز' +
        '</button>';
    } else {
      rowActionsHtml =
        '<button type="button" class="icon-btn" data-action="delete-reservation" data-id="' + id + '" aria-label="حذف" title="حذف"' + disabledAttr + '><i data-lucide="trash-2" class="icon"></i></button>';
      cardActionsHtml =
        '<button type="button" class="btn btn-sm btn-ghost" data-action="delete-reservation" data-id="' + id + '"' + disabledAttr + '>' +
          '<i data-lucide="trash-2" class="icon"></i> حذف' +
        '</button>';
    }

    var row =
      '<tr>' +
        '<td><div class="flex gap-12">' +
            '<div class="avatar">' + avatarLetter + '</div>' +
            '<div>' +
              '<div style="font-weight:700;">' + escapeHtml(item.name) + '</div>' +
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

    var card =
      '<div class="sub-card" data-id="' + id + '">' +
        '<div class="sub-card-top">' +
          statusBadge +
          '<div class="sub-card-name">' + escapeHtml(item.name) + '</div>' +
        '</div>' +
        '<div class="sub-card-row mono">' +
          '<i data-lucide="message-circle" class="icon"></i>' +
          '<span>' + escapeHtml(whatsappDisplay) + '</span>' +
        '</div>' +
        '<div class="sub-card-row">' + dateLabel + ' \u00b7 ' + tableLabel + (peopleLine ? ' \u00b7 ' + peopleLine : '') + '</div>' +
        (item.note ? '<div class="sub-card-note">' + escapeHtml(item.note) + '</div>' : '') +
        '<div class="sub-card-actions" style="grid-template-columns:repeat(' + (item.status === 'pending' ? 2 : 1) + ',1fr);">' +
          cardActionsHtml +
        '</div>' +
      '</div>';

    return { row: row, card: card };
  }

  function renderReservationsPage() {
    var tbody = document.getElementById('res-table-body');
    if (!tbody) return;

    var cardsWrap = document.getElementById('res-cards-wrap');
    var dataWrap = document.getElementById('res-data-wrap');
    var tableWrap = document.getElementById('res-table-wrap');
    var emptyState = document.getElementById('res-empty-state');
    var stateBlock = document.getElementById('res-state');
    var searchInput = document.getElementById('res-search-input');
    var searchClearBtn = document.getElementById('res-search-clear');
    var searchEmptyState = document.getElementById('res-search-empty');
    var statPendingEl = document.getElementById('res-stat-pending');
    var statConfirmedEl = document.getElementById('res-stat-confirmed');
    var statTotalEl = document.getElementById('res-stat-total');
    var usageEl = document.getElementById('res-usage-counter');
    var hiddenNoteEl = document.getElementById('res-hidden-note');
    var loadMoreWrap = document.getElementById('res-load-more-wrap');
    var loadMoreBtn = document.getElementById('res-load-more');

    var summary = state.summary;
    var ready = state.view === 'ready' && !!summary;

    if (!ready) {
      tbody.innerHTML = '';
      if (cardsWrap) cardsWrap.innerHTML = '';
      if (dataWrap) dataWrap.style.display = 'none';
      if (emptyState) emptyState.style.display = 'none';
      if (usageEl) usageEl.style.display = 'none';
      if (hiddenNoteEl) hiddenNoteEl.style.display = 'none';
      if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      if (statPendingEl) statPendingEl.textContent = '\u2013';
      if (statConfirmedEl) statConfirmedEl.textContent = '\u2013';
      if (statTotalEl) statTotalEl.textContent = '\u2013';

      if (state.view === 'error') {
        setStateBlock('alert-triangle', 'تعذّر تحميل الحجوزات', state.errorText, true, false);
      } else {
        setStateBlock('loader-2', 'جاري تحميل الحجوزات...', '', false, true);
      }
      bootIcons();
      return;
    }

    if (stateBlock) stateBlock.style.display = 'none';

    var disabledAttr = state.busy ? ' disabled' : '';
    var rowsHtml = '';
    var cardsHtml = '';
    state.items.forEach(function (item) {
      var built = buildRow(item, disabledAttr);
      rowsHtml += built.row;
      cardsHtml += built.card;
    });
    tbody.innerHTML = rowsHtml;
    if (cardsWrap) cardsWrap.innerHTML = cardsHtml;

    if (statPendingEl) statPendingEl.textContent = String(summary.pending);
    if (statConfirmedEl) statConfirmedEl.textContent = String(summary.confirmed);
    if (statTotalEl) statTotalEl.textContent = String(summary.total);

    if (usageEl) {
      if (summary.limit === null) {
        usageEl.style.display = 'none';
      } else {
        usageEl.textContent = summary.used + ' من ' + summary.limit + ' ' + LIMIT_NOUNS.reservations +
          (summary.used >= summary.limit ? ' — وصلت للحد الأقصى' : '');
        usageEl.style.display = '';
      }
    }

    if (hiddenNoteEl) {
      if (summary.hidden > 0) {
        hiddenNoteEl.textContent = 'في ' + hiddenLabel(summary.hidden) +
          ' بسبب حد الباقة المجانية. بتظهر كلها لما تشترك بالباقة المدفوعة.';
        hiddenNoteEl.style.display = '';
      } else {
        hiddenNoteEl.style.display = 'none';
      }
    }

    // The search box lives inside the data wrap, so it stays visible while a search has no results.
    var hasAny = summary.total > 0 || !!state.q;
    if (dataWrap) dataWrap.style.display = hasAny ? '' : 'none';
    if (emptyState) emptyState.style.display = hasAny ? 'none' : '';

    var hasRows = state.items.length > 0;
    if (tableWrap) tableWrap.style.display = hasRows ? '' : 'none';
    if (cardsWrap) cardsWrap.style.display = hasRows ? '' : 'none';
    if (searchEmptyState) searchEmptyState.style.display = !hasRows && state.q ? '' : 'none';
    if (searchClearBtn && searchInput) searchClearBtn.style.display = searchInput.value.trim() ? '' : 'none';

    if (loadMoreWrap) loadMoreWrap.style.display = state.meta.hasMore ? '' : 'none';
    if (loadMoreBtn) {
      loadMoreBtn.disabled = state.busy || state.loadingMore;
      loadMoreBtn.classList.toggle('is-saving', state.loadingMore);
    }

    bootIcons();
  }

  function listParams(cursor) {
    return { q: state.q, cursor: cursor || '', limit: PAGE_SIZE };
  }

  // Loads the counters and the first page together. silent = keep the current screen while refreshing
  // (used after a change, because counters and plan-hidden items change on the server side).
  function loadAll(silent) {
    if (!api || !api.reservations) {
      state.view = 'error';
      state.errorText = ERROR_TEXT.SERVER;
      renderReservationsPage();
      return Promise.resolve();
    }

    var keepScreen = !!silent && state.view === 'ready';
    if (!keepScreen) {
      state.view = 'loading';
      renderReservationsPage();
    }

    var allSeq = ++state.allSeq;
    var listSeq = ++state.listSeq;

    return Promise.all([
      api.reservations.summary(),
      api.reservations.list(listParams())
    ]).then(function (results) {
      if (allSeq !== state.allSeq) return;
      var summaryRes = results[0];
      var listRes = results[1];

      if (!summaryRes.ok || !listRes.ok) {
        var failed = !summaryRes.ok ? summaryRes : listRes;
        if (keepScreen) {
          showToast(errorText(failed), { icon: 'alert-triangle', danger: true });
          return;
        }
        state.view = 'error';
        state.errorText = errorText(failed);
        renderReservationsPage();
        return;
      }

      state.summary = summaryRes.data;
      updateReservationsNavBadge(state.summary.pending);

      // If the owner searched while this was loading, the search request owns the list.
      if (listSeq === state.listSeq) {
        state.items = listRes.data.items;
        state.meta = listRes.data.meta;
      }
      state.view = 'ready';
      renderReservationsPage();
    });
  }

  // Reloads only the list (search or clearing the search). The counters do not change.
  function reloadList() {
    if (!api || !api.reservations || state.view !== 'ready') return;
    var seq = ++state.listSeq;
    state.loadingMore = false;

    api.reservations.list(listParams()).then(function (res) {
      if (seq !== state.listSeq) return;
      if (!res.ok) {
        showToast(errorText(res), { icon: 'alert-triangle', danger: true });
        return;
      }
      state.items = res.data.items;
      state.meta = res.data.meta;
      renderReservationsPage();
    });
  }

  function loadMore() {
    if (!api || !api.reservations) return;
    if (state.view !== 'ready' || state.busy || state.loadingMore) return;
    if (!state.meta.hasMore || !state.meta.nextCursor) return;

    var seq = state.listSeq;
    state.loadingMore = true;
    renderReservationsPage();

    api.reservations.list(listParams(state.meta.nextCursor)).then(function (res) {
      if (seq !== state.listSeq) return;
      state.loadingMore = false;
      if (!res.ok) {
        showToast(errorText(res), { icon: 'alert-triangle', danger: true });
        renderReservationsPage();
        return;
      }
      var known = Object.create(null);
      state.items.forEach(function (item) { known[item.id] = true; });
      res.data.items.forEach(function (item) {
        if (!known[item.id]) state.items.push(item);
      });
      state.meta = res.data.meta;
      renderReservationsPage();
    });
  }

  function handleFailure(res) {
    var reason = res.data && res.data.reason;

    if (res.code === 'CONFLICT') {
      showToast('الطاولة مستخدمة حالياً. ألغِ الحجز أو رجّع الطاولة متاحة من صفحة الطاولات ثم أكّد.', { icon: 'alert-triangle', danger: true });
      loadAll(true);
      return;
    }
    if (res.code === 'VALIDATION') {
      showToast(reason === 'invalid_transition'
        ? 'ما بصير تغيّر حالة هذا الحجز. تم تحديث القائمة.'
        : 'تعذّر تنفيذ الطلب. تم تحديث القائمة.', { icon: 'alert-triangle', danger: true });
      loadAll(true);
      return;
    }
    if (res.code === 'NOT_FOUND') {
      showToast('الحجز مش موجود أو مخفي بسبب حد الباقة. تم تحديث القائمة.', { icon: 'alert-triangle', danger: true });
      loadAll(true);
      return;
    }
    showToast(errorText(res), { icon: 'alert-triangle', danger: true });
  }

  // One change at a time. Buttons stay disabled until the server answers, then the page reloads from the server.
  function mutate(call, successText, successOpts) {
    if (state.busy) return;
    state.busy = true;
    renderReservationsPage();

    call.then(function (res) {
      state.busy = false;
      if (!res.ok) {
        renderReservationsPage();
        handleFailure(res);
        return;
      }
      showToast(successText, successOpts);
      loadAll(true);
    });
  }

  function initReservationsSearch() {
    var searchInput = document.getElementById('res-search-input');
    var searchClearBtn = document.getElementById('res-search-clear');
    if (!searchInput) return;

    function applySearch() {
      var next = searchInput.value.replace(/\s+/g, ' ').trim();
      if (next === state.q) return;
      state.q = next;
      reloadList();
    }

    var applySearchDebounced = debounce(applySearch, SEARCH_DELAY_MS);

    searchInput.addEventListener('input', function () {
      if (searchClearBtn) searchClearBtn.style.display = searchInput.value.trim() ? '' : 'none';
      applySearchDebounced();
    });

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', function () {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        applySearch();
        searchInput.focus();
      });
    }
  }

  function initReservationActions() {
    document.addEventListener('click', function (e) {
      var target = e.target;
      if (!target || !target.closest) return;

      if (target.closest('[data-action="retry-reservations"]')) {
        e.preventDefault();
        loadAll(false);
        return;
      }

      if (target.closest('[data-action="load-more-reservations"]')) {
        e.preventDefault();
        loadMore();
        return;
      }

      var confirmBtn = target.closest('[data-action="confirm-reservation"]');
      if (confirmBtn) {
        if (state.busy) return;
        var idToConfirm = confirmBtn.getAttribute('data-id');
        var toConfirm = findReservationById(idToConfirm);
        if (!toConfirm) return;

        var confirmNote = '.';
        if (toConfirm.table) confirmNote = ' وتصير الطاولة مستخدمة تلقائياً.';
        else if (toConfirm.tableDeleted) confirmNote = ' (طاولته انحذفت، فما رح تتغيّر حالة أي طاولة).';

        openConfirmModal({
          icon: 'calendar-check',
          danger: false,
          title: 'تأكيد الحجز؟',
          message: 'رح يتم تأكيد حجز «<strong>' + escapeHtml(toConfirm.name) + '</strong>»' + confirmNote,
          confirmLabel: 'تأكيد الحجز',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            mutate(api.reservations.setStatus(idToConfirm, 'confirmed'), 'تم تأكيد الحجز', { icon: 'calendar-check' });
          }
        });
        return;
      }

      var cancelBtn = target.closest('[data-action="cancel-reservation"]');
      if (cancelBtn) {
        if (state.busy) return;
        var idToCancel = cancelBtn.getAttribute('data-id');
        var toCancel = findReservationById(idToCancel);
        if (!toCancel) return;

        openConfirmModal({
          icon: 'x',
          danger: true,
          title: 'إلغاء الحجز؟',
          message: 'سيتم إلغاء حجز «<strong>' + escapeHtml(toCancel.name) + '</strong>»' +
            (toCancel.status === 'confirmed' && toCancel.table ? ' وتصير الطاولة متاحة من جديد.' : '.'),
          confirmLabel: 'إلغاء الحجز',
          cancelLabel: 'تراجع',
          onConfirm: function () {
            mutate(api.reservations.setStatus(idToCancel, 'cancelled'), 'تم إلغاء الحجز', { icon: 'x', danger: true });
          }
        });
        return;
      }

      var deleteBtn = target.closest('[data-action="delete-reservation"]');
      if (deleteBtn) {
        if (state.busy) return;
        var idToDelete = deleteBtn.getAttribute('data-id');

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف الحجز؟',
          message: 'سيتم حذف هذا الطلب نهائياً من السجل.',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            mutate(api.reservations.remove(idToDelete), 'تم حذف الحجز', { icon: 'trash-2', danger: true });
          }
        });
      }
    });
  }

  GM.registerPage('reservations', {
    init: function () {
      renderReservationsPage();
      initReservationActions();
      initReservationsSearch();
      loadAll(false);
    }
  });

})();