(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var closeSidebarDrawerIfNeeded = GM.closeSidebarDrawerIfNeeded;
  var closeMobileMoreSheet = GM.closeMobileMoreSheet;
  var bootIcons = GM.bootIcons;
  var LIMIT_NOUNS = GM.LIMIT_NOUNS;
  var getPlanLimitStatus = GM.getPlanLimitStatus;
  var guardPlanLimit = GM.guardPlanLimit;
  var applyLockedFeaturesToUI = GM.applyLockedFeaturesToUI;
  var escapeHtml = GM.escapeHtml;
  var showToast = GM.showToast;
  var openConfirmModal = GM.openConfirmModal;
  var getStoredTables = GM.getStoredTables;
  var setStoredTables = GM.setStoredTables;

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

  GM.registerPage('tables', {
    partials: [['#table-edit-slot', 'table-edit-panel.html']],
    init: function () {
      renderTablesPage();
      initTableAddPanel();
      initTableActions();
    }
  });

})();