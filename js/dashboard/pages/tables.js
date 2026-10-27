(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var closeSidebarDrawerIfNeeded = GM.closeSidebarDrawerIfNeeded;
  var closeMobileMoreSheet = GM.closeMobileMoreSheet;
  var bootIcons = GM.bootIcons;
  var LIMIT_NOUNS = GM.LIMIT_NOUNS;
  var getPlanLimitStatus = GM.getPlanLimitStatus;
  var openUpgradeModal = GM.openUpgradeModal;
  var applyLockedFeaturesToUI = GM.applyLockedFeaturesToUI;
  var escapeHtml = GM.escapeHtml;
  var showToast = GM.showToast;
  var openConfirmModal = GM.openConfirmModal;

  var api = window.GMBookingApi;

  var NAME_MAX = 40;

  // The server (or the mock that mirrors it) is the source of truth. This page only keeps the last loaded
  // snapshot: items = visible tables, meta = { limit, used, hidden } coming from GET /dashboard/tables.
  var state = {
    items: [],
    meta: { limit: null, used: 0, hidden: 0 },
    view: 'loading',
    errorText: '',
    loadSeq: 0,
    busy: false
  };

  var ERROR_TEXT = {
    NETWORK: 'تأكد من اتصالك بالإنترنت وجرّب مرة ثانية.',
    UNAUTHENTICATED: 'انتهت الجلسة. سجّل دخولك من جديد.',
    FORBIDDEN: 'ما عندك صلاحية على هاي الصفحة.',
    NOT_FOUND: 'الطاولات مش متاحة لنوع نشاطك.',
    RATE_LIMITED: 'محاولات كثيرة. استنى شوي وجرّب مرة ثانية.',
    SERVER: 'صار خطأ. جرّب مرة ثانية.'
  };

  var VALIDATION_TEXT = {
    name: {
      required: 'اكتب اسم أو رقم الطاولة.',
      too_long: 'اسم الطاولة طويل، الحد الأقصى ' + NAME_MAX + ' حرف.'
    },
    seats: { invalid: 'عدد الكراسي لازم يكون رقم 1 أو أكثر.' },
    status: { invalid: 'حالة الطاولة غير صحيحة.' }
  };

  function errorText(result) {
    return ERROR_TEXT[result && result.code] || ERROR_TEXT.SERVER;
  }

  function validationText(errors) {
    var fields = Object.keys(errors || {});
    for (var i = 0; i < fields.length; i++) {
      var group = VALIDATION_TEXT[fields[i]];
      if (group && group[errors[fields[i]]]) return group[errors[fields[i]]];
    }
    return 'تأكد من بيانات الطاولة وجرّب مرة ثانية.';
  }

  function findTableById(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  function gmGetTables() {
    return state.items.map(function (t) {
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

  function limitReached() {
    return state.meta.limit !== null && state.meta.used >= state.meta.limit;
  }

  function showUpgrade() {
    var limit = state.meta.limit;
    if (limit === null && typeof getPlanLimitStatus === 'function') limit = getPlanLimitStatus('tables', 0).limit;
    if (limit === null || limit === undefined) openUpgradeModal({ featureKey: 'tables' });
    else openUpgradeModal({ limitKey: 'tables', limit: limit });
  }

  function guardAdd() {
    if (!limitReached()) return true;
    showUpgrade();
    return false;
  }

  function hiddenLabel(count) {
    if (count === 1) return 'طاولة وحدة مخفية';
    if (count === 2) return 'طاولتين مخفيتين';
    if (count <= 10) return count + ' طاولات مخفية';
    return count + ' طاولة مخفية';
  }

  function setStateBlock(icon, title, sub, canRetry, spinning) {
    var block = document.getElementById('tbl-state');
    if (!block) return;
    var iconHost = document.getElementById('tbl-state-icon');
    var titleEl = document.getElementById('tbl-state-title');
    var subEl = document.getElementById('tbl-state-sub');
    var retryBtn = document.getElementById('tbl-state-retry');

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

  function renderTablesPage() {
    var tbody = document.getElementById('tbl-table-body');
    var cardsWrap = document.getElementById('tbl-cards-wrap');
    var dataWrap = document.getElementById('tbl-data-wrap');
    var emptyState = document.getElementById('tbl-empty-state');
    var stateBlock = document.getElementById('tbl-state');
    var statTotalEl = document.getElementById('tbl-stat-total');
    var statAvailableEl = document.getElementById('tbl-stat-available');
    var statOccupiedEl = document.getElementById('tbl-stat-occupied');
    var tablesUsageEl = document.getElementById('tbl-usage-counter');
    var hiddenNoteEl = document.getElementById('tbl-hidden-note');
    if (!tbody) return;

    var ready = state.view === 'ready';
    var list = ready ? state.items : [];

    document.querySelectorAll('button[data-action="open-table-add"]').forEach(function (btn) {
      btn.disabled = !ready || state.busy;
    });

    if (!ready) {
      tbody.innerHTML = '';
      if (cardsWrap) cardsWrap.innerHTML = '';
      if (dataWrap) dataWrap.style.display = 'none';
      if (emptyState) emptyState.style.display = 'none';
      if (tablesUsageEl) tablesUsageEl.style.display = 'none';
      if (hiddenNoteEl) hiddenNoteEl.style.display = 'none';
      if (statTotalEl) statTotalEl.textContent = '–';
      if (statAvailableEl) statAvailableEl.textContent = '–';
      if (statOccupiedEl) statOccupiedEl.textContent = '–';

      if (state.view === 'error') {
        setStateBlock('alert-triangle', 'تعذّر تحميل الطاولات', state.errorText, true, false);
      } else {
        setStateBlock('loader-2', 'جاري تحميل الطاولات...', '', false, true);
      }
      bootIcons();
      return;
    }

    if (stateBlock) stateBlock.style.display = 'none';

    var disabledAttr = state.busy ? ' disabled' : '';
    var availableCount = 0;
    var occupiedCount = 0;

    var rowsHtml = '';
    var cardsHtml = '';

    list.forEach(function (table) {
      var isOccupied = table.status === 'occupied';
      if (isOccupied) { occupiedCount++; } else { availableCount++; }

      var statusBadge = isOccupied
        ? '<span class="badge red"><span>●</span> مستخدمة</span>'
        : '<span class="badge green"><span>●</span> متاحة</span>';

      var seatsLabel = table.seats ? (table.seats + ' كرسي') : '—';
      var toggleIcon = isOccupied ? 'check-circle' : 'ban';
      var toggleLabel = isOccupied ? 'وضع كمتاحة' : 'وضع كمستخدمة';

      rowsHtml +=
        '<tr' + (isOccupied ? ' class="is-unavailable"' : '') + '>' +
          '<td><div style="font-weight:700;">' + escapeHtml(table.name) + '</div></td>' +
          '<td>' + seatsLabel + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' +
            '<div class="flex gap-8">' +
              '<button type="button" class="icon-btn" data-action="toggle-table-status" data-id="' + escapeHtml(table.id) + '" aria-label="' + toggleLabel + '" title="' + toggleLabel + '"' + disabledAttr + '><i data-lucide="' + toggleIcon + '" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="edit-table" data-id="' + escapeHtml(table.id) + '" aria-label="تعديل" title="تعديل"' + disabledAttr + '><i data-lucide="pencil" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="delete-table" data-id="' + escapeHtml(table.id) + '" aria-label="حذف" title="حذف"' + disabledAttr + '><i data-lucide="trash-2" class="icon"></i></button>' +
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
            '<button type="button" class="btn btn-sm btn-ghost" data-action="toggle-table-status" data-id="' + escapeHtml(table.id) + '"' + disabledAttr + '>' +
              '<i data-lucide="' + toggleIcon + '" class="icon"></i> ' + (isOccupied ? 'إتاحة' : 'إشغال') +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-action="edit-table" data-id="' + escapeHtml(table.id) + '"' + disabledAttr + '>' +
              '<i data-lucide="pencil" class="icon"></i> تعديل' +
            '</button>' +
            '<button type="button" class="btn btn-sm btn-danger" data-action="delete-table" data-id="' + escapeHtml(table.id) + '"' + disabledAttr + '>' +
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

    if (tablesUsageEl) {
      if (state.meta.limit === null) {
        tablesUsageEl.style.display = 'none';
      } else {
        tablesUsageEl.textContent = state.meta.used + ' من ' + state.meta.limit + ' ' + LIMIT_NOUNS.tables +
          (limitReached() ? ' — وصلت للحد الأقصى' : '');
        tablesUsageEl.style.display = '';
      }
    }

    if (hiddenNoteEl) {
      if (state.meta.hidden > 0) {
        hiddenNoteEl.textContent = 'في ' + hiddenLabel(state.meta.hidden) +
          ' بسبب حد الباقة المجانية. بتظهر كلها لما تشترك بالباقة المدفوعة.';
        hiddenNoteEl.style.display = '';
      } else {
        hiddenNoteEl.style.display = 'none';
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

  // silent = true keeps the current list on screen while refreshing (used after a successful change).
  function loadTables(silent) {
    if (!api || !api.tables) {
      state.view = 'error';
      state.errorText = ERROR_TEXT.SERVER;
      renderTablesPage();
      return Promise.resolve();
    }

    var seq = ++state.loadSeq;
    var keepScreen = !!silent && state.view === 'ready';
    if (!keepScreen) {
      state.view = 'loading';
      renderTablesPage();
    }

    return api.tables.list().then(function (res) {
      if (seq !== state.loadSeq) return;
      if (!res.ok) {
        if (keepScreen) {
          showToast(errorText(res), { icon: 'alert-triangle', danger: true });
          return;
        }
        state.view = 'error';
        state.errorText = errorText(res);
        renderTablesPage();
        return;
      }
      state.items = res.data.items;
      state.meta = res.data.meta;
      state.view = 'ready';
      renderTablesPage();
    });
  }

  function setBusy(on) {
    state.busy = on;
    renderTablesPage();
  }

  function replaceTable(table) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === table.id) {
        state.items[i] = table;
        return;
      }
    }
  }

  // Returns true when the table no longer exists for this owner (the edit panel should close).
  function handleFailure(res) {
    var reason = res.data && res.data.reason;

    if (res.code === 'FORBIDDEN' && reason === 'plan_limit_reached') {
      showUpgrade();
      loadTables(true);
      return false;
    }
    if (res.code === 'NOT_FOUND') {
      showToast('الطاولة مش موجودة أو مخفية. تم تحديث القائمة.', { icon: 'alert-triangle', danger: true });
      loadTables(true);
      return true;
    }
    if (res.code === 'VALIDATION') {
      showToast(validationText(res.data && res.data.errors), { icon: 'alert-triangle', danger: true });
      return false;
    }
    showToast(errorText(res), { icon: 'alert-triangle', danger: true });
    return false;
  }

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

    function setSaving(on) {
      if (!saveBtn) return;
      saveBtn.disabled = on;
      saveBtn.classList.toggle('is-saving', on);
      if (on) saveBtn.setAttribute('aria-busy', 'true');
      else saveBtn.removeAttribute('aria-busy');
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

      setSaving(false);
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
        if (state.view !== 'ready' || state.busy) return;
        if (guardAdd()) open(null);
        return;
      }
      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-table"]');
      if (editTrigger) {
        e.preventDefault();
        if (state.busy) return;
        var tableToEdit = findTableById(editTrigger.getAttribute('data-id'));
        if (tableToEdit) open(tableToEdit);
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-table-add"]');
      if (closeTrigger) {
        if (state.busy) return;
        close();
        return;
      }
      var statusBtn = e.target.closest && e.target.closest('#tep-status-group .seg-btn');
      if (statusBtn) setStatus(statusBtn.getAttribute('data-value'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open') && !state.busy) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        if (state.busy) return;

        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { if (nameInput) nameInput.focus(); return; }

        var input = {
          name: name,
          seats: seatsInput ? parseTableSeats(seatsInput.value) : null,
          status: selectedStatus
        };
        var wasEditing = editingId;

        if (!wasEditing && !guardAdd()) return;
        if (!api || !api.tables) { showToast(ERROR_TEXT.SERVER, { icon: 'alert-triangle', danger: true }); return; }

        setSaving(true);
        setBusy(true);

        var call = wasEditing ? api.tables.update(wasEditing, input) : api.tables.create(input);
        call.then(function (res) {
          setSaving(false);
          setBusy(false);

          if (!res.ok) {
            if (handleFailure(res)) close();
            return;
          }

          close();
          if (wasEditing) {
            replaceTable(res.data.table);
            renderTablesPage();
            showToast('تم حفظ تعديلات الطاولة', { icon: 'check-circle' });
          } else {
            showToast('تمت إضافة الطاولة', { icon: 'check-circle' });
            loadTables(true);
          }
        });
      });
    }
  }

  function initTableActions() {
    document.addEventListener('click', function (e) {
      var retryBtn = e.target.closest && e.target.closest('[data-action="retry-tables"]');
      if (retryBtn) {
        e.preventDefault();
        loadTables(false);
        return;
      }

      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-table-status"]');
      if (toggleBtn) {
        if (state.busy) return;
        var tableToToggle = findTableById(toggleBtn.getAttribute('data-id'));
        if (!tableToToggle || !api || !api.tables) return;

        var nextStatus = tableToToggle.status === 'occupied' ? 'available' : 'occupied';
        setBusy(true);
        api.tables.update(tableToToggle.id, { status: nextStatus }).then(function (res) {
          setBusy(false);
          if (!res.ok) {
            handleFailure(res);
            return;
          }
          replaceTable(res.data.table);
          renderTablesPage();
          var nowOccupied = res.data.table.status === 'occupied';
          showToast(nowOccupied ? 'تم وضع الطاولة كمستخدمة' : 'تم وضع الطاولة كمتاحة', {
            icon: nowOccupied ? 'ban' : 'check-circle',
            danger: nowOccupied
          });
        });
        return;
      }

      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-table"]');
      if (deleteBtn) {
        if (state.busy) return;
        var idToDelete = deleteBtn.getAttribute('data-id');
        var tableToDelete = findTableById(idToDelete);
        var nameHtml = tableToDelete ? '<strong>' + escapeHtml(tableToDelete.name) + '</strong>' : 'هذه الطاولة';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف الطاولة؟',
          message: 'سيتم حذف «' + nameHtml + '» وما رح تظهر للزبائن. الحجوزات القديمة المرتبطة فيها بتضل بالسجل وبتظهر «طاولة محذوفة».',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            if (state.busy || !api || !api.tables) return;
            setBusy(true);
            api.tables.remove(idToDelete).then(function (res) {
              setBusy(false);
              if (!res.ok) {
                handleFailure(res);
                return;
              }
              showToast('تم حذف الطاولة', { icon: 'check-circle' });
              loadTables(true);
            });
          }
        });
        return;
      }
    });
  }

  GM.registerPage('tables', {
    partials: [['#table-edit-slot', 'table-edit-panel.html']],
    init: function () {
      renderTablesPage();
      initTableAddPanel();
      initTableActions();
      loadTables(false);
    }
  });

})();