(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM || !GM.registerPage) { console.error('GMDash is missing: load js/dashboard/core.js, shell.js, page-runner.js and common.js first.'); return; }

  var closeSidebarDrawerIfNeeded = GM.closeSidebarDrawerIfNeeded;
  var closeMobileMoreSheet = GM.closeMobileMoreSheet;
  var bootIcons = GM.bootIcons;
  var LIMIT_NOUNS = GM.LIMIT_NOUNS;
  var compressImageFile = GM.compressImageFile;
  var getPlanLimitStatus = GM.getPlanLimitStatus;
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
  var MENU_CATEGORIES_STORAGE_KEY = 'gmDashboardMenuCategories';
  var MENU_ITEMS_STORAGE_KEY = 'gmDashboardMenuItems';

  function getStoredMenuCategories() {
    try {
      var raw = localStorage.getItem(scopedKey(MENU_CATEGORIES_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredMenuCategories(list) {
    try {
      localStorage.setItem(scopedKey(MENU_CATEGORIES_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function getStoredMenuItems() {
    try {
      var raw = localStorage.getItem(scopedKey(MENU_ITEMS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredMenuItems(list) {
    try {
      localStorage.setItem(scopedKey(MENU_ITEMS_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateMenuCategoryId() {
    return window.GM_ID.generate('mc');
  }

  function generateMenuItemId() {
    return window.GM_ID.generate('mi');
  }

  function findMenuCategoryById(id) {
    var list = getStoredMenuCategories();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findMenuItemById(id) {
    var list = getStoredMenuItems();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function menuCategoryLabel(categoryId) {
    var cat = categoryId ? findMenuCategoryById(categoryId) : null;
    return cat ? cat.name : 'بدون تصنيف';
  }

  function countItemsInCategory(categoryId) {
    return getStoredMenuItems().filter(function (it) { return it.categoryId === categoryId; }).length;
  }

  var menuEditingCategoryId = null;

  function renderMenuCategoryList() {
    var list = document.getElementById('mcp-list');
    var empty = document.getElementById('mcp-empty');
    if (!list) return;

    var categories = getStoredMenuCategories();

    if (!categories.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      bootIcons();
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = categories.map(function (cat) {
      var itemsCount = countItemsInCategory(cat.id);

      if (cat.id === menuEditingCategoryId) {
        return (
          '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
            '<input type="text" id="mcp-rename-' + escapeHtml(cat.id) + '" value="' + escapeHtml(cat.name) + '" style="flex:1;">' +
            '<div class="flex gap-8">' +
              '<button type="button" class="icon-btn" data-action="save-menu-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حفظ"><i data-lucide="check" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="cancel-edit-menu-category" aria-label="إلغاء"><i data-lucide="x" class="icon"></i></button>' +
            '</div>' +
          '</div>'
        );
      }

      return (
        '<div class="list-row" data-id="' + escapeHtml(cat.id) + '">' +
          '<div class="title">' + escapeHtml(cat.name) + '</div>' +
          '<div class="flex gap-8">' +
            '<span class="badge gray">' + itemsCount + ' صنف</span>' +
            '<button type="button" class="icon-btn" data-action="edit-menu-category" data-id="' + escapeHtml(cat.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
            '<button type="button" class="icon-btn" data-action="delete-menu-category" data-id="' + escapeHtml(cat.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    bootIcons();
  }

  function renderMenuCategorySelectOptions() {
    var select = document.getElementById('mie-category');
    if (!select) return;
    var current = select.value;
    var categories = getStoredMenuCategories();

    select.innerHTML = '<option value="">بدون تصنيف</option>' + categories.map(function (cat) {
      return '<option value="' + escapeHtml(cat.id) + '">' + escapeHtml(cat.name) + '</option>';
    }).join('');

    if (categories.some(function (c) { return c.id === current; })) select.value = current;
  }

  function initMenuCategoryPanel() {
    var panel = document.getElementById('mcp-panel');
    var scrim = document.getElementById('mcp-scrim');
    if (!panel) return;

    var newNameInput = document.getElementById('mcp-new-name');
    var addBtn = document.getElementById('mcp-add-btn');

    function open() {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      menuEditingCategoryId = null;
      renderMenuCategoryList();

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
      menuEditingCategoryId = null;
    }

    function addCategory() {
      var name = newNameInput ? newNameInput.value.trim() : '';
      if (!name) { if (newNameInput) newNameInput.focus(); return; }

      var list = getStoredMenuCategories();
      if (!guardPlanLimit('menuCategories', list.length)) return;
      list.push({ id: generateMenuCategoryId(), name: name, createdAt: Date.now() });
      setStoredMenuCategories(list);

      if (newNameInput) newNameInput.value = '';
      renderMenuCategoryList();
      renderMenuCategorySelectOptions();
      renderMenuPage();
      showToast('تمت إضافة التصنيف', { icon: 'folder-plus' });
    }

    if (addBtn) addBtn.addEventListener('click', addCategory);
    if (newNameInput) {
      newNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
      });
    }

    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-menu-category-panel"]');
      if (openTrigger) { e.preventDefault(); open(); return; }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-menu-category-panel"]');
      if (closeTrigger) { close(); return; }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-menu-category"]');
      if (editTrigger) {
        menuEditingCategoryId = editTrigger.getAttribute('data-id');
        renderMenuCategoryList();
        var input = document.getElementById('mcp-rename-' + menuEditingCategoryId);
        if (input) { input.focus(); input.select(); }
        return;
      }

      var cancelTrigger = e.target.closest && e.target.closest('[data-action="cancel-edit-menu-category"]');
      if (cancelTrigger) { menuEditingCategoryId = null; renderMenuCategoryList(); return; }

      var saveTrigger = e.target.closest && e.target.closest('[data-action="save-menu-category"]');
      if (saveTrigger) {
        var id = saveTrigger.getAttribute('data-id');
        var input2 = document.getElementById('mcp-rename-' + id);
        var newName = input2 ? input2.value.trim() : '';
        if (!newName) { if (input2) input2.focus(); return; }

        var list2 = getStoredMenuCategories();
        for (var i = 0; i < list2.length; i++) {
          if (list2[i].id === id) { list2[i].name = newName; break; }
        }
        setStoredMenuCategories(list2);

        menuEditingCategoryId = null;
        renderMenuCategoryList();
        renderMenuCategorySelectOptions();
        renderMenuPage();
        showToast('تم تعديل التصنيف', { icon: 'pencil' });
        return;
      }

      var deleteTrigger = e.target.closest && e.target.closest('[data-action="delete-menu-category"]');
      if (deleteTrigger) {
        var delId = deleteTrigger.getAttribute('data-id');
        var cat = findMenuCategoryById(delId);
        var itemsCount = countItemsInCategory(delId);
        var name = cat ? cat.name : 'هذا التصنيف';

        var message = 'سيتم حذف «<strong>' + escapeHtml(name) + '</strong>» نهائياً';
        if (itemsCount > 0) {
          message += '. الأصناف المرتبطة به (' + itemsCount + ') هتتحول تلقائياً لـ«بدون تصنيف» ومش هتتحذف.';
        }

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف التصنيف؟',
          message: message,
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredMenuCategories().filter(function (c) { return c.id !== delId; });
            setStoredMenuCategories(remaining);

            var items = getStoredMenuItems();
            var touched = false;
            items.forEach(function (it) {
              if (it.categoryId === delId) { it.categoryId = ''; touched = true; }
            });
            if (touched) setStoredMenuItems(items);

            renderMenuCategoryList();
            renderMenuCategorySelectOptions();
            renderMenuPage();
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

  function buildMenuStatusBadge(item) {
    return item.available !== false
      ? '<span class="badge green">متاح</span>'
      : '<span class="badge gray">غير متاح</span>';
  }

  var menuSearchTerm = '';

  function renderMenuPage() {
    var tbody = document.getElementById('menu-table-body');
    var dataWrap = document.getElementById('menu-data-wrap');
    var emptyState = document.getElementById('menu-empty-state');
    if (!tbody) return;

    var items = getStoredMenuItems();
    var categories = getStoredMenuCategories();

    var totalEl = document.getElementById('menu-stat-total');
    var availableEl = document.getElementById('menu-stat-available');
    var categoriesEl = document.getElementById('menu-stat-categories');
    var unavailableEl = document.getElementById('menu-stat-unavailable');
    if (totalEl) totalEl.textContent = items.length;
    if (availableEl) availableEl.textContent = items.filter(function (it) { return it.available !== false; }).length;
    if (categoriesEl) categoriesEl.textContent = categories.length;
    var catBtnCount = document.getElementById('menu-cat-btn-count');
    if (catBtnCount) catBtnCount.textContent = categories.length;
    if (unavailableEl) unavailableEl.textContent = items.filter(function (it) { return it.available === false; }).length;

    var usageEl = document.getElementById('menu-usage-counter');
    if (usageEl) {
      var usage = getPlanLimitStatus('menuItems', items.length);
      if (usage.unlimited) {
        usageEl.style.display = 'none';
      } else {
        usageEl.textContent = usage.used + ' من ' + usage.limit + ' ' + LIMIT_NOUNS.menuItems +
          (usage.canAdd ? '' : ' — وصلت للحد الأقصى');
        usageEl.style.display = '';
      }
    }

    var term = menuSearchTerm.trim().toLowerCase();
    var visibleItems = term
      ? items.filter(function (it) {
          return (it.name || '').toLowerCase().indexOf(term) !== -1 ||
                 menuCategoryLabel(it.categoryId).toLowerCase().indexOf(term) !== -1;
        })
      : items;

    if (!visibleItems.length && term && items.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--db-text-tertiary);padding:24px;">لا توجد نتائج مطابقة لبحثك</td></tr>';
    } else {
      tbody.innerHTML = visibleItems.map(function (item) {
        var thumb = safeImageSrc(item.image)
          ? '<img src="' + escapeHtml(safeImageSrc(item.image)) + '" class="menu-item-thumb" alt="">'
          : '<span class="menu-item-thumb" style="display:inline-flex;align-items:center;justify-content:center;"><i data-lucide="utensils" class="icon"></i></span>';

        var priceValue = (item.price !== '' && item.price != null && !isNaN(Number(item.price)))
          ? Number(item.price).toFixed(2)
          : null;
        var priceHtml = priceValue !== null
          ? '<span class="menu-price"><b>' + priceValue + '</b><i>₪</i></span>'
          : '<span class="menu-price menu-price--none"><b>—</b></span>';

        return (
          '<tr' + (item.available === false ? ' class="is-unavailable"' : '') + '>' +
            '<td class="menu-td-name" data-label="الصنف"><div class="menu-item-name-cell">' + thumb + '<span>' + escapeHtml(item.name) + '</span></div></td>' +
            '<td class="menu-td-cat" data-label="التصنيف"><span class="menu-cat-chip">' + escapeHtml(menuCategoryLabel(item.categoryId)) + '</span></td>' +
            '<td class="menu-td-price" data-label="السعر">' + priceHtml + '</td>' +
            '<td class="menu-td-status" data-label="الحالة">' + buildMenuStatusBadge(item) + '</td>' +
            '<td class="menu-td-actions">' +
              '<button type="button" class="icon-btn" data-action="toggle-menu-item-availability" data-id="' + escapeHtml(item.id) + '" aria-label="' + (item.available !== false ? 'وضع كغير متاح' : 'وضع كمتاح') + '">' +
                '<i data-lucide="' + (item.available !== false ? 'eye' : 'eye-off') + '" class="icon"></i>' +
              '</button>' +
              '<button type="button" class="icon-btn" data-action="edit-menu-item" data-id="' + escapeHtml(item.id) + '" aria-label="تعديل"><i data-lucide="pencil" class="icon"></i></button>' +
              '<button type="button" class="icon-btn" data-action="delete-menu-item" data-id="' + escapeHtml(item.id) + '" aria-label="حذف"><i data-lucide="trash-2" class="icon"></i></button>' +
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

  window.renderMenuPage = renderMenuPage;

  function initMenuSearch() {
    var input = document.getElementById('menu-search-input');
    if (!input) return;
    input.addEventListener('input', debounce(function () {
      menuSearchTerm = input.value || '';
      renderMenuPage();
    }, 150));
  }

  function initMenuItemEditPanel() {
    var panel = document.getElementById('mie-panel');
    var scrim = document.getElementById('mie-scrim');
    if (!panel) return;

    var titleEl = document.getElementById('mie-title');
    var nameInput = document.getElementById('mie-name');
    var categorySelect = document.getElementById('mie-category');
    var priceInput = document.getElementById('mie-price');
    var statusGroup = document.getElementById('mie-status-group');
    var imageInput = document.getElementById('mie-image-input');
    var uploadBtn = document.getElementById('mie-upload-btn');
    var removeImageBtn = document.getElementById('mie-remove-image-btn');
    var preview = document.getElementById('mie-image-preview');
    var saveBtn = document.getElementById('mie-save-btn');

    var editingId = null;
    var selectedStatus = 'available';
    var pendingImage = null;

    function setStatus(value) {
      selectedStatus = value;
      if (!statusGroup) return;
      statusGroup.querySelectorAll('.seg-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
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
        preview.innerHTML = '<i data-lucide="utensils" class="icon"></i>';
        if (removeImageBtn) removeImageBtn.style.display = 'none';
        bootIcons();
      }
    }

    function resetForm() {
      if (nameInput) nameInput.value = '';
      if (priceInput) priceInput.value = '';
      if (categorySelect) categorySelect.value = '';
      setStatus('available');
      setPreview(null);
    }

    function fillFormFromItem(item) {
      if (nameInput) nameInput.value = item.name || '';
      if (priceInput) priceInput.value = item.price != null ? item.price : '';
      if (categorySelect) categorySelect.value = item.categoryId || '';
      setStatus(item.available === false ? 'unavailable' : 'available');
      setPreview(item.image || null);
    }

    function open(itemToEdit) {
      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();
      renderMenuCategorySelectOptions();

      editingId = itemToEdit ? itemToEdit.id : null;

      if (itemToEdit) {
        fillFormFromItem(itemToEdit);
        if (titleEl) titleEl.textContent = 'تعديل صنف';
      } else {
        resetForm();
        if (titleEl) titleEl.textContent = 'صنف جديد';
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
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-menu-item-add"]');
      if (openTrigger) {
        e.preventDefault();
        if (guardPlanLimit('menuItems', getStoredMenuItems().length)) open(null);
        return;
      }

      var editTrigger = e.target.closest && e.target.closest('[data-action="edit-menu-item"]');
      if (editTrigger) {
        e.preventDefault();
        var itemToEdit = findMenuItemById(editTrigger.getAttribute('data-id'));
        if (itemToEdit) open(itemToEdit);
        return;
      }

      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-menu-item-add"]');
      if (closeTrigger) { close(); return; }

      var segBtn = e.target.closest && e.target.closest('#mie-status-group .seg-btn');
      if (segBtn) setStatus(segBtn.getAttribute('data-value'));
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

        var list = getStoredMenuItems();

        if (!editingId && !guardPlanLimit('menuItems', list.length)) return;

        if (editingId) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === editingId) {
              list[i].name = name;
              list[i].categoryId = categorySelect ? categorySelect.value : '';
              list[i].price = price;
              list[i].available = selectedStatus === 'available';
              list[i].image = pendingImage;
              break;
            }
          }
        } else {
          list.unshift({
            id: generateMenuItemId(),
            name: name,
            categoryId: categorySelect ? categorySelect.value : '',
            price: price,
            available: selectedStatus === 'available',
            image: pendingImage,
            createdAt: Date.now()
          });
        }

        setStoredMenuItems(list);
        close();
        renderMenuPage();
        showToast(editingId ? 'تم تعديل الصنف' : 'تمت إضافة الصنف', { icon: 'utensils' });
      });
    }
  }

  function initMenuItemActions() {
    document.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest && e.target.closest('[data-action="delete-menu-item"]');
      if (deleteBtn) {
        var idToDelete = deleteBtn.getAttribute('data-id');
        var itemToDelete = findMenuItemById(idToDelete);
        var nameHtml = itemToDelete ? '<strong>' + escapeHtml(itemToDelete.name) + '</strong>' : 'هذا الصنف';

        openConfirmModal({
          icon: 'trash-2',
          danger: true,
          title: 'حذف الصنف؟',
          message: 'سيتم حذف «' + nameHtml + '» نهائياً من المنيو',
          confirmLabel: 'حذف',
          cancelLabel: 'إلغاء',
          onConfirm: function () {
            var remaining = getStoredMenuItems().filter(function (it) { return it.id !== idToDelete; });
            setStoredMenuItems(remaining);
            renderMenuPage();
            showToast('تم حذف الصنف', { icon: 'trash-2', danger: true });
          }
        });
        return;
      }

      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-menu-item-availability"]');
      if (toggleBtn) {
        var idToToggle = toggleBtn.getAttribute('data-id');
        var list = getStoredMenuItems();
        var nowAvailable = true;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === idToToggle) {
            list[i].available = list[i].available === false;
            nowAvailable = list[i].available;
            break;
          }
        }
        setStoredMenuItems(list);
        renderMenuPage();
        showToast(nowAvailable ? 'الصنف صار متاح' : 'الصنف صار غير متاح', {
          icon: nowAvailable ? 'eye' : 'eye-off',
          danger: !nowAvailable
        });
        return;
      }
    });
  }

  GM.registerPage('menu', {
    partials: [
      ['#menu-category-slot', 'menu-category-panel.html'],
      ['#menu-item-edit-slot', 'menu-item-edit-panel.html']
    ],
    init: function () {
      renderMenuPage();
      initMenuCategoryPanel();
      initMenuItemEditPanel();
      initMenuItemActions();
      initMenuSearch();
    }
  });

})();