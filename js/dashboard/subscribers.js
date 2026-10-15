(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var closeSidebarDrawerIfNeeded = GM.closeSidebarDrawerIfNeeded;
  var closeMobileMoreSheet = GM.closeMobileMoreSheet;
  var bootIcons = GM.bootIcons;
  var GAZA_TZ = GM.GAZA_TZ;
  var updateSubscriptionRequestsNavBadge = GM.updateSubscriptionRequestsNavBadge;
  var getTodayISODate = GM.getTodayISODate;
  var parseISODate = GM.parseISODate;
  var addDaysToDate = GM.addDaysToDate;
  var addMonthsToDate = GM.addMonthsToDate;
  var formatDisplayDate = GM.formatDisplayDate;
  var escapeHtml = GM.escapeHtml;
  var parseStoredArray = GM.parseStoredArray;
  var handleStorageError = GM.handleStorageError;
  var showToast = GM.showToast;
  var openConfirmModal = GM.openConfirmModal;
  var scopedKey = GM.scopedKey;

  var SUBSCRIBERS_STORAGE_KEY = 'gmDashboardSubscribers';
  var SUBSCRIPTION_REQUESTS_STORAGE_KEY = 'gmDashboardSubscriptionRequests';

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

  GM.registerPage('subscribers', {
    partials: [['#subscriber-add-slot', 'subscriber-add-panel.html']],
    init: function () {
      renderSubscribersPage();
      initSubscriberAddPanel();
      initSubscriberActions();
    }
  });

  GM.registerPage('subscription-requests', {
    init: function () {
      renderSubscriptionRequestsPage();
      initSubscriptionRequestActions();
    }
  });

})();