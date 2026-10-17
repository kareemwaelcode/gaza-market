/*
 * Gaza Market - dashboard page: prices (products)
 * Product categories and items with prices.
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
  var LIMIT_NOUNS = GM.LIMIT_NOUNS;
  var compressImageFile = GM.compressImageFile;
  var getPlanLimitStatus = GM.getPlanLimitStatus;
  var openUpgradeModal = GM.openUpgradeModal;
  var guardPlanLimit = GM.guardPlanLimit;
  var escapeHtml = GM.escapeHtml;
  var safeImageSrc = GM.safeImageSrc;
  var toCssUrl = GM.toCssUrl;
  var parseStoredArray = GM.parseStoredArray;
  var handleStorageError = GM.handleStorageError;
  var debounce = GM.debounce;
  var showToast = GM.showToast;
  var openConfirmModal = GM.openConfirmModal;
  var scopedKey = GM.scopedKey;
  var storeHasDiscounts = GM.storeHasDiscounts;
  var storeHasProductField = GM.storeHasProductField;
  var getExtraFieldDefs = GM.getExtraFieldDefs;
  var renderExtraFields = GM.renderExtraFields;
  var readExtraFields = GM.readExtraFields;
  var formatExtraFields = GM.formatExtraFields;
  var extraFieldsMatch = GM.extraFieldsMatch;
  var PRODUCT_CATEGORIES_STORAGE_KEY = 'gmDashboardProductCategories';
  var PRODUCT_ITEMS_STORAGE_KEY = 'gmDashboardProductItems';

  function getStoredProductCategories() {
    try {
      var raw = localStorage.getItem(scopedKey(PRODUCT_CATEGORIES_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredProductCategories(list) {
    try {
      localStorage.setItem(scopedKey(PRODUCT_CATEGORIES_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function getStoredProductItems() {
    try {
      var raw = localStorage.getItem(scopedKey(PRODUCT_ITEMS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredProductItems(list) {
    try {
      localStorage.setItem(scopedKey(PRODUCT_ITEMS_STORAGE_KEY), JSON.stringify(list));
      return true;
    } catch (err) {
      return false;
    }
  }

  function countDiscountedProducts(excludeId) {
    return getStoredProductItems().filter(function (it) {
      return it.discount === true && it.id !== excludeId;
    }).length;
  }

  function generateProductCategoryId() {
    return window.GM_ID.generate('pc');
  }

  function generateProductItemId() {
    return window.GM_ID.generate('pi');
  }

  function findProductCategoryById(id) {
    var list = getStoredProductCategories();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findProductItemById(id) {
    var list = getStoredProductItems();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function productCategoryLabel(categoryId) {
    var cat = categoryId ? findProductCategoryById(categoryId) : null;
    return cat ? cat.name : 'بدون تصنيف';
  }

  function countItemsInProductCategory(categoryId) {
    return getStoredProductItems().filter(function (it) { return it.categoryId === categoryId; }).length;
  }

  var productEditingCategoryId = null;

  function renderProductCategorySuggestions() {
    var wrap = document.getElementById('pcp-suggestions');
    var box = document.getElementById('pcp-suggestions-list');
    if (!wrap || !box) return;

    var config = getStoreTypeConfig();
    var suggested = (config && Array.isArray(config.suggestedCategories)) ? config.suggestedCategories : [];

    var nameInput = document.getElementById('pcp-new-name');
    if (nameInput && suggested.length) nameInput.placeholder = 'مثال: ' + suggested[0];

    var existing = getStoredProductCategories().map(function (cat) {
      return String(cat.name || '').trim();
    });
    var remaining = suggested.filter(function (name) { return existing.indexOf(name) === -1; });

    if (!remaining.length) {
      wrap.style.display = 'none';
      box.innerHTML = '';
      return;
    }

    box.innerHTML = remaining.map(function (name) {
      return '<button type="button" class="btn btn-ghost btn-sm" data-action="add-product-category-suggestion" data-name="' + escapeHtml(name) + '">' +
        '<i data-lucide="plus" class="icon"></i> ' + escapeHtml(name) +
      '</button>';
    }).join('');
    wrap.style.display = '';
    bootIcons();
  }

  function renderProductCategoryList() {
    var list = document.getElementById('pcp-list');
    var empty = document.getElementById('pcp-empty');
    if (!list) return;

    renderProductCategorySuggestions();

    var categories = getStoredProductCategories();

    if (!categories.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      bootIcons();
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = categories.map(function (cat) {
      var itemsCount = countItemsInProductCategory(cat.id);

      if (cat.id === productEditingCategoryId) {
        return (
          '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
            '<input type="text" id="pcp-rename-' + escapeHtml(cat.id) + '" value="' + escapeHtml(cat.name) + '" style="flex:1;">' +
            '<div class="flex gap-8">' +
              '<button type="button" class="icon-btn" data-action="save-product-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حفظ"><i data-lucide="check" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="cancel-edit-product-category" aria-label="إلغاء"><i data-lucide="x" class="icon"></i></button>' +
            '</div>' +
          '</div>'
        );
      }

      return (
        '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
          '<div class="title">' + escapeHtml(cat.name) + '</div>' +
          '<div class="flex gap-8">' +
            '<span class="badge gray">' + itemsCount + ' منتج</span>' +
            '<button type="button" class="icon-btn" data-action="edit-product-category" data-id="' + escapeHtml(cat.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
            '<button type="button" class="icon-btn" data-action="delete-product-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    bootIcons();
  }

  function renderProductCategorySelectOptions() {
    var select = document.getElementById('pie-category');
    if (!select) return;
    var current = select.value;
    var categories = getStoredProductCategories();

    select.innerHTML = '<option value="">بدون تصنيف</option>' + categories.map(function (cat) {
      return '<option value="' + escapeHtml(cat.id) + '">' + escapeHtml(cat.name) + '</option>';
    }).join('');

    if (categories.some(function (c) { return c.id === current; })) select.value = current;
  }

  function initProductCategoryPanel() {
    var panel = document.getElementById('pcp-panel');
    var scrim = document.getElementById('pcp-scrim');
    if (!panel) return;

    var newNameInput = document.getElementById('pcp-new-name');
    var addBtn = document.getElementById('pcp-add-btn');

    function open() {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      productEditingCategoryId = null;
      renderProductCategoryList();

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
      productEditingCategoryId = null;
    }

    function addCategory() {
      var name = newNameInput ? newNameInput.value.trim() : '';
      if (!name) { if (newNameInput) newNameInput.focus(); return; }

      var list = getStoredProductCategories();
      if (!guardPlanLimit('productCategories', list.length)) return;
      list.push({ id: generateProductCategoryId(), name: name, createdAt: Date.now() });
      setStoredProductCategories(list);

      if (newNameInput) newNameInput.value = '';
      renderProductCategoryList();
      renderProductCategorySelectOptions();
      renderProductsPage();
      showToast('تمت إضافة التصنيف', { icon: 'folder-plus' });
    }

    if (addBtn) addBtn.addEventListener('click', addCategory);
    if (newNameInput) {
      newNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
      });
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-product-category-panel"]');
      if (openTrigger) { e.preventDefault(); open(); return; }

      var suggestionTrigger = e.target.closest && e.target.closest('[data-action="add-product-category-suggestion"]');
      if (suggestionTrigger) {
        e.preventDefault();
        var suggestedName = (suggestionTrigger.getAttribute('data-name') || '').trim();
        if (!suggestedName) return;

        var suggestedList = getStoredProductCategories();
        if (!guardPlanLimit('productCategories', suggestedList.length)) return;
        suggestedList.push({ id: generateProductCategoryId(), name: suggestedName, createdAt: Date.now() });
        setStoredProductCategories(suggestedList);

        renderProductCategoryList();
        renderProductCategorySelectOptions();
        renderProductsPage();
        showToast('تمت إضافة التصنيف', { icon: 'folder-plus' });
        return;
      }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-product-category-panel"]');
      if (closeTrigger) { close(); return; }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-product-category"]');
      if (editTrigger) {
        productEditingCategoryId = editTrigger.getAttribute('data-id');
        renderProductCategoryList();
        var input = document.getElementById('pcp-rename-' + productEditingCategoryId);
        if (input) { input.focus(); input.select(); }
        return;
      }

      var cancelTrigger = e.target.closest && e.target.closest('[data-action="cancel-edit-product-category"]');
      if (cancelTrigger) { productEditingCategoryId = null; renderProductCategoryList(); return; }

      var saveTrigger = e.target.closest && e.target.closest('[data-action="save-product-category"]');
      if (saveTrigger) {
        var id = saveTrigger.getAttribute('data-id');
        var input2 = document.getElementById('pcp-rename-' + id);
        var newName = input2 ? input2.value.trim() : '';
        if (!newName) { if (input2) input2.focus(); return; }

        var list2 = getStoredProductCategories();
        for (var i = 0; i < list2.length; i++) {
          if (list2[i].id === id) { list2[i].name = newName; break; }
        }
        setStoredProductCategories(list2);

        productEditingCategoryId = null;
        renderProductCategoryList();
        renderProductCategorySelectOptions();
        renderProductsPage();
        return;
      }

      var delTrigger = e.target.closest && e.target.closest('[data-action="delete-product-category"]');
      if (delTrigger) {
        var delId = delTrigger.getAttribute('data-id');
        var cat = findProductCategoryById(delId);
        var itemsCount = countItemsInProductCategory(delId);
        var message = itemsCount > 0
          ? 'سيتم حذف التصنيف «' + escapeHtml(cat ? cat.name : '') + '»، و' + itemsCount + ' منتج بداخله هيرجعوا «بدون تصنيف»'
          : 'سيتم حذف التصنيف «' + escapeHtml(cat ? cat.name : '') + '» نهائياً';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف التصنيف؟',
          message: message,
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredProductCategories().filter(function (c) { return c.id !== delId; });
            setStoredProductCategories(remaining);

            var items = getStoredProductItems();
            var touched = false;
            items.forEach(function (it) {
              if (it.categoryId === delId) { it.categoryId = ''; touched = true; }
            });
            if (touched) setStoredProductItems(items);

            renderProductCategoryList();
            renderProductCategorySelectOptions();
            renderProductsPage();
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

  function buildProductStatusBadge(item) {
    return item.available !== false
      ? '<span class="badge green">متاح</span>'
      : '<span class="badge gray">غير متاح</span>';
  }

  var productSearchTerm = '';

  function renderProductsPage() {
    var tbody = document.getElementById('product-table-body');
    var dataWrap = document.getElementById('product-data-wrap');
    var emptyState = document.getElementById('product-empty-state');
    if (!tbody) return;

    var items = getStoredProductItems();
    var categories = getStoredProductCategories();

    var totalEl = document.getElementById('product-stat-total');
    var availableEl = document.getElementById('product-stat-available');
    var categoriesEl = document.getElementById('product-stat-categories');
    var unavailableEl = document.getElementById('product-stat-unavailable');
    if (totalEl) totalEl.textContent = items.length;
    if (availableEl) availableEl.textContent = items.filter(function (it) { return it.available !== false; }).length;
    if (categoriesEl) categoriesEl.textContent = categories.length;
    var catBtnCount = document.getElementById('product-cat-btn-count');
    if (catBtnCount) catBtnCount.textContent = categories.length;
    if (unavailableEl) unavailableEl.textContent = items.filter(function (it) { return it.available === false; }).length;

    var usageEl = document.getElementById('product-usage-counter');
    if (usageEl) {
      var usage = getPlanLimitStatus('products', items.length);
      if (usage.unlimited) {
        usageEl.style.display = 'none';
      } else {
        usageEl.textContent = usage.used + ' من ' + usage.limit + ' ' + LIMIT_NOUNS.products +
          (usage.canAdd ? '' : ' — وصلت للحد الأقصى');
        usageEl.style.display = '';
      }
    }

    var term = productSearchTerm.trim().toLowerCase();
    var visibleItems = term
      ? items.filter(function (it) {
          return (it.name || '').toLowerCase().indexOf(term) !== -1 ||
                 productCategoryLabel(it.categoryId).toLowerCase().indexOf(term) !== -1 ||
                 (storeHasProductField('brand') && (it.brand || '').toLowerCase().indexOf(term) !== -1) ||
                 (storeHasProductField('color') && (it.color || '').toLowerCase().indexOf(term) !== -1) ||
                 (storeHasProductField('material') && (it.material || '').toLowerCase().indexOf(term) !== -1) ||
                 extraFieldsMatch(term, getExtraFieldDefs('product'), it.extra);
        })
      : items;

    if (!visibleItems.length && term && items.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--db-text-tertiary);padding:24px;">لا توجد نتائج مطابقة لبحثك</td></tr>';
    } else {
      tbody.innerHTML = visibleItems.map(function (item) {
        var thumb = safeImageSrc(item.image)
          ? '<img src="' + escapeHtml(safeImageSrc(item.image)) + '" class="menu-item-thumb" alt="">'
          : '<span class="menu-item-thumb" style="display:inline-flex;align-items:center;justify-content:center;"><i data-lucide="package" class="icon"></i></span>';

        var priceValue = (item.price !== '' && item.price != null && !isNaN(Number(item.price)))
          ? Number(item.price).toFixed(2)
          : null;
        var sizeChip = (storeHasProductField('size') && item.size)
          ? ' <span class="menu-cat-chip">مقاس ' + escapeHtml(item.size) + '</span>'
          : '';
        var detailsLine = (storeHasProductField('details') && item.details)
          ? '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' + escapeHtml(item.details) + '</div>'
          : '';
        var attrParts = [];
        if (storeHasProductField('brand') && item.brand) attrParts.push('الماركة: ' + escapeHtml(item.brand));
        if (storeHasProductField('material') && item.material) attrParts.push('الخامة: ' + escapeHtml(item.material));
        if (storeHasProductField('color') && item.color) attrParts.push('اللون: ' + escapeHtml(item.color));
        formatExtraFields(getExtraFieldDefs('product'), item.extra).forEach(function (part) { attrParts.push(part); });
        var attrsLine = attrParts.length
          ? '<div class="sub" style="font-size:12px;color:var(--db-text-tertiary);">' + attrParts.join(' · ') + '</div>'
          : '';
        var discountBadge = (storeHasDiscounts() && item.discount === true)
          ? ' <span class="badge red">خصم</span>'
          : '';
        var priceHtml = priceValue !== null
          ? '<span class="menu-price"><b>' + priceValue + '</b><i>₪</i></span>'
          : '<span class="menu-price menu-price--none"><b>—</b></span>';

        return (
          '<tr' + (item.available === false ? ' class="is-unavailable"' : '') + '>' +
            '<td class="menu-td-name" data-label="المنتج"><div class="menu-item-name-cell">' + thumb + '<span>' + escapeHtml(item.name) + detailsLine + attrsLine + '</span></div></td>' +
            '<td class="menu-td-cat" data-label="التصنيف"><span class="menu-cat-chip">' + escapeHtml(productCategoryLabel(item.categoryId)) + '</span>' + sizeChip + '</td>' +
            '<td class="menu-td-price" data-label="السعر">' + priceHtml + '</td>' +
            '<td class="menu-td-status" data-label="الحالة">' + buildProductStatusBadge(item) + discountBadge + '</td>' +
            '<td class="menu-td-actions">' +
              '<button type="button" class="icon-btn" data-action="toggle-product-item-availability" data-id="' + escapeHtml(item.id) + '" aria-label="' + (item.available !== false ? 'وضع كغير متاح' : 'وضع كمتاح') + '">' +
                '<i data-lucide="' + (item.available !== false ? 'eye' : 'eye-off') + '" class="icon"></i>' +
              '</button>' +
              '<button type="button" class="icon-btn" data-action="edit-product-item" data-id="' + escapeHtml(item.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="delete-product-item" data-id="' + escapeHtml(item.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
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

    bootIcons();
  }

  window.renderProductsPage = renderProductsPage;

  function initProductSearch() {
    var input = document.getElementById('product-search-input');
    if (!input) return;
    input.addEventListener('input', debounce(function () {
      productSearchTerm = input.value || '';
      renderProductsPage();
    }, 150));
  }

  function initProductItemEditPanel() {
    var panel = document.getElementById('pie-panel');
    var scrim = document.getElementById('pie-scrim');
    if (!panel) return;

    var titleEl = document.getElementById('pie-title');
    var nameInput = document.getElementById('pie-name');
    var categorySelect = document.getElementById('pie-category');
    var priceInput = document.getElementById('pie-price');
    var statusGroup = document.getElementById('pie-status-group');
    var sizeField = document.getElementById('pie-size-field');
    var sizeInput = document.getElementById('pie-size');
    var detailsField = document.getElementById('pie-details-field');
    var detailsInput = document.getElementById('pie-details');
    var brandField = document.getElementById('pie-brand-field');
    var brandInput = document.getElementById('pie-brand');
    var colorField = document.getElementById('pie-color-field');
    var colorInput = document.getElementById('pie-color');
    var materialField = document.getElementById('pie-material-field');
    var materialInput = document.getElementById('pie-material');
    var extraContainer = document.getElementById('pie-extra-fields');
    var discountField = document.getElementById('pie-discount-field');
    var discountGroup = document.getElementById('pie-discount-group');
    var imageInput = document.getElementById('pie-image-input');
    var uploadBtn = document.getElementById('pie-upload-btn');
    var removeImageBtn = document.getElementById('pie-remove-image-btn');
    var preview = document.getElementById('pie-image-preview');
    var saveBtn = document.getElementById('pie-save-btn');

    var editingId = null;
    var selectedStatus = 'available';
    var selectedDiscount = false;
    var pendingImage = null;

    function setStatus(value) {
      selectedStatus = value;
      if (!statusGroup) return;
      statusGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
      });
    }

    function setDiscount(isOn) {
      selectedDiscount = !!isOn;
      if (!discountGroup) return;
      discountGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', (btn.getAttribute('data-value') === 'discount') === selectedDiscount);
      });
    }

    function canEnableDiscount() {
      var status = getPlanLimitStatus('discountedProducts', countDiscountedProducts(editingId));
      if (status.canAdd) return true;
      openUpgradeModal({ limitKey: 'discountedProducts', limit: status.limit });
      return false;
    }

    function applyFieldVisibility() {
      if (sizeField) sizeField.style.display = storeHasProductField('size') ? '' : 'none';
      if (discountField) discountField.style.display = storeHasDiscounts() ? '' : 'none';
      if (detailsField) detailsField.style.display = storeHasProductField('details') ? '' : 'none';
      if (brandField) brandField.style.display = storeHasProductField('brand') ? '' : 'none';
      if (colorField) colorField.style.display = storeHasProductField('color') ? '' : 'none';
      if (materialField) materialField.style.display = storeHasProductField('material') ? '' : 'none';
      applyFieldHints();
    }

    function applyFieldHints() {
      var config = getStoreTypeConfig();
      var hints = (config && config.productHints) || {};
      var pairs = [
        [nameInput, 'name'],
        [detailsInput, 'details'],
        [sizeInput, 'size'],
        [brandInput, 'brand'],
        [colorInput, 'color'],
        [materialInput, 'material']
      ];
      pairs.forEach(function (pair) {
        if (pair[0] && hints[pair[1]]) pair[0].placeholder = hints[pair[1]];
      });
    }

    function setPreview(imageUrl) {
      pendingImage = imageUrl || null;
      if (!preview) return;
      if (pendingImage) {
        preview.style.backgroundImage = toCssUrl(pendingImage);
        preview.innerHTML = '';
        if (removeImageBtn) removeImageBtn.style.display = '';
      } else {
        preview.style.backgroundImage = '';
        preview.innerHTML = '<i data-lucide="package" class="icon"></i>';
        if (removeImageBtn) removeImageBtn.style.display = 'none';
        bootIcons();
      }
    }

    function resetForm() {
      if (nameInput) nameInput.value = '';
      if (priceInput) priceInput.value = '';
      if (sizeInput) sizeInput.value = '';
      if (detailsInput) detailsInput.value = '';
      if (brandInput) brandInput.value = '';
      if (colorInput) colorInput.value = '';
      if (materialInput) materialInput.value = '';
      if (categorySelect) categorySelect.value = '';
      setStatus('available');
      setDiscount(false);
      setPreview(null);
    }

    function fillFormFromItem(item) {
      if (nameInput) nameInput.value = item.name || '';
      if (priceInput) priceInput.value = item.price != null ? item.price : '';
      if (sizeInput) sizeInput.value = item.size || '';
      if (detailsInput) detailsInput.value = item.details || '';
      if (brandInput) brandInput.value = item.brand || '';
      if (colorInput) colorInput.value = item.color || '';
      if (materialInput) materialInput.value = item.material || '';
      if (categorySelect) categorySelect.value = item.categoryId || '';
      setStatus(item.available === false ? 'unavailable' : 'available');
      setDiscount(item.discount === true);
      setPreview(item.image || null);
    }

    function open(itemToEdit) {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      renderProductCategorySelectOptions();
      applyFieldVisibility();
      renderExtraFields(extraContainer, 'pie', getExtraFieldDefs('product'), itemToEdit ? itemToEdit.extra : null);

      editingId = itemToEdit ? itemToEdit.id : null;

      if (itemToEdit) {
        fillFormFromItem(itemToEdit);
        if (titleEl) titleEl.textContent = 'تعديل منتج';
      } else {
        resetForm();
        if (titleEl) titleEl.textContent = 'منتج جديد';
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

    if (uploadBtn && imageInput) {
      uploadBtn.addEventListener('click', function () { imageInput.click(); });
    }
    if (imageInput) {
      imageInput.addEventListener('change', function () {
        var file = imageInput.files && imageInput.files[0];
        if (!file) return;
        compressImageFile(file, 720, 0.8, setPreview);
      });
    }
    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', function () {
        setPreview(null);
        if (imageInput) imageInput.value = '';
      });
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-product-item-add"]');
      if (openTrigger) {
        e.preventDefault();
        if (guardPlanLimit('products', getStoredProductItems().length)) open(null);
        return;
      }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-product-item"]');
      if (editTrigger) {
        e.preventDefault();
        var itemToEdit = findProductItemById(editTrigger.getAttribute('data-id'));
        if (itemToEdit) open(itemToEdit);
        return;
      }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-product-item-add"]');
      if (closeTrigger) { close(); return; }

      var segBtn = e.target.closest && e.target.closest('#pie-status-group .seg-btn');
      if (segBtn) setStatus(segBtn.getAttribute('data-value'));

      var discountBtn = e.target.closest && e.target.closest('#pie-discount-group .seg-btn');
      if (discountBtn) {
        var wantsDiscount = discountBtn.getAttribute('data-value') === 'discount';
        if (wantsDiscount && !selectedDiscount && !canEnableDiscount()) return;
        setDiscount(wantsDiscount);
      }
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

        var list = getStoredProductItems();

        if (!editingId && !guardPlanLimit('products', list.length)) return;

        var withDetailsField = storeHasProductField('details');
        var details = (withDetailsField && detailsInput) ? detailsInput.value.trim() : '';
        var withDiscountFields = storeHasDiscounts();
        var withSizeField = storeHasProductField('size');
        var withBrandField = storeHasProductField('brand');
        var withColorField = storeHasProductField('color');
        var withMaterialField = storeHasProductField('material');
        var size = (withSizeField && sizeInput) ? sizeInput.value.trim() : '';
        var brand = (withBrandField && brandInput) ? brandInput.value.trim() : '';
        var color = (withColorField && colorInput) ? colorInput.value.trim() : '';
        var material = (withMaterialField && materialInput) ? materialInput.value.trim() : '';
        var extraDefs = getExtraFieldDefs('product');
        var extra = extraDefs.length ? readExtraFields(extraContainer, extraDefs) : null;
        if (withDiscountFields && selectedDiscount && !canEnableDiscount()) {
          setDiscount(false);
          return;
        }

        if (editingId) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === editingId) {
              list[i].name = name;
              list[i].categoryId = categorySelect ? categorySelect.value : '';
              list[i].price = price;
              list[i].available = selectedStatus === 'available';
              list[i].image = pendingImage;
              if (withDetailsField) list[i].details = details;
              if (withSizeField) list[i].size = size;
              if (withBrandField) list[i].brand = brand;
              if (withColorField) list[i].color = color;
              if (withMaterialField) list[i].material = material;
              if (extra) list[i].extra = extra;
              if (withDiscountFields) list[i].discount = selectedDiscount;
              break;
            }
          }
        } else {
          var newItem = {
            id: generateProductItemId(),
            name: name,
            categoryId: categorySelect ? categorySelect.value : '',
            price: price,
            available: selectedStatus === 'available',
            image: pendingImage,
            createdAt: Date.now()
          };
          if (withDetailsField) newItem.details = details;
          if (withSizeField) newItem.size = size;
          if (withBrandField) newItem.brand = brand;
          if (withColorField) newItem.color = color;
          if (withMaterialField) newItem.material = material;
          if (extra) newItem.extra = extra;
          if (withDiscountFields) newItem.discount = selectedDiscount;
          list.unshift(newItem);
        }

        if (!setStoredProductItems(list)) {
          showToast('تعذر حفظ المنتج، مساحة التخزين ممتلئة', { icon: 'circle-alert', danger: true });
          return;
        }
        close();
        renderProductsPage();
        showToast(editingId ? 'تم تعديل المنتج' : 'تمت إضافة المنتج', { icon: 'package' });
      });
    }
  }

  function initProductItemActions() {
    document.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-product-item"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        var itemToDelete = findProductItemById(idToDelete);
        var nameHtml = itemToDelete ? '<strong>' + escapeHtml(itemToDelete.name) + '</strong>' : 'هذا المنتج';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف المنتج؟',
          message: 'سيتم حذف «' + nameHtml + '» نهائياً من قائمة منتجاتك',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredProductItems().filter(function (it) { return it.id !== idToDelete; });
            setStoredProductItems(remaining);
            renderProductsPage();
            showToast('تم حذف المنتج', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }

      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-product-item-availability"]');
      if (toggleBtn) {
        var idToToggle = toggleBtn.getAttribute('data-id');
        var list = getStoredProductItems();
        var nowAvailable = true;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === idToToggle) {
            list[i].available = list[i].available === false;
            nowAvailable = list[i].available;
            break;
          }
        }
        setStoredProductItems(list);
        renderProductsPage();
        showToast(nowAvailable ? 'المنتج صار متاح' : 'المنتج صار غير متاح', {
          icon: nowAvailable ? 'eye' : 'eye-off',
          danger: !nowAvailable
        });
        return;
      }
    });
  }

  GM.registerPage('prices', {
    partials: [
      ['#product-category-slot', 'product-category-panel.html'],
      ['#product-item-edit-slot', 'product-item-edit-panel.html']
    ],
    init: function () {
      renderProductsPage();
      initProductCategoryPanel();
      initProductItemEditPanel();
      initProductItemActions();
      initProductSearch();
    }
  });

})();