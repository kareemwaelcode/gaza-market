(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM || !GM.registerPage) { console.error('GMDash is missing: load js/dashboard/core.js, shell.js, page-runner.js and common.js first.'); return; }

  var getStoreTypeConfig = GM.getStoreTypeConfig;
  var closeSidebarDrawerIfNeeded = GM.closeSidebarDrawerIfNeeded;
  var closeMobileMoreSheet = GM.closeMobileMoreSheet;
  var bootIcons = GM.bootIcons;
  var LIMIT_NOUNS = GM.LIMIT_NOUNS;
  var getServiceLockedFeatureKey = GM.getServiceLockedFeatureKey;
  var isServiceLocked = GM.isServiceLocked;
  var LOCK_OVERLAY_TEXT = GM.LOCK_OVERLAY_TEXT;
  var getPlanLimitStatus = GM.getPlanLimitStatus;
  var isFeatureLockedForPlan = GM.isFeatureLockedForPlan;
  var openUpgradeModal = GM.openUpgradeModal;
  var guardPlanLimit = GM.guardPlanLimit;
  var applyLockedFeaturesToUI = GM.applyLockedFeaturesToUI;
  var escapeHtml = GM.escapeHtml;
  var safeIcon = GM.safeIcon;
  var parseStoredArray = GM.parseStoredArray;
  var handleStorageError = GM.handleStorageError;
  var debounce = GM.debounce;
  var showToast = GM.showToast;
  var openConfirmModal = GM.openConfirmModal;
  var scopedKey = GM.scopedKey;
  var storeHasServiceField = GM.storeHasServiceField;
  var getExtraFieldDefs = GM.getExtraFieldDefs;
  var renderExtraFields = GM.renderExtraFields;
  var readExtraFields = GM.readExtraFields;
  var formatExtraFields = GM.formatExtraFields;
  var extraFieldsMatch = GM.extraFieldsMatch;
  var getCurrentTypeServices = GM.getCurrentTypeServices;
  var STORE_SERVICE_CATEGORIES_STORAGE_KEY = 'gmDashboardStoreServiceCategories';
  var STORE_SERVICE_ITEMS_STORAGE_KEY = 'gmDashboardStoreServiceItems';

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

  GM.registerPage('services', {
    partials: [
      ['#service-category-slot', 'service-category-panel.html'],
      ['#service-item-edit-slot', 'service-item-edit-panel.html']
    ],
    init: function () {
      renderServicesPage();
      initServiceCategoryPanel();
      initServiceItemEditPanel();
      initServiceItemActions();
      initServiceSearch();
    }
  });

})();