(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js first.'); return; }

  var LOGO_URL = GM.LOGO_URL;
  var PROFILE_PAGE_URL = GM.PROFILE_PAGE_URL;
  var PACKAGES_PAGE_URL = GM.PACKAGES_PAGE_URL;
  var loadPartial = GM.loadPartial;
  var getStoreTypeConfig = GM.getStoreTypeConfig;
  var getFallbackAvatarLetter = GM.getFallbackAvatarLetter;
  var getFallbackName = GM.getFallbackName;
  var bootIcons = GM.bootIcons;
  var getStoredProfile = GM.getStoredProfile;
  var getPublicUrl = GM.getPublicUrl;
  var escapeHtml = GM.escapeHtml;
  var safeIcon = GM.safeIcon;
  var safePage = GM.safePage;
  var safeAction = GM.safeAction;
  var safeHref = GM.safeHref;
  var toCssUrl = GM.toCssUrl;
  var isValidCoordinate = GM.isValidCoordinate;
  var parseStoredArray = GM.parseStoredArray;
  var parseStoredObject = GM.parseStoredObject;
  var handleStorageError = GM.handleStorageError;
  var openConfirmModal = GM.openConfirmModal;
  var scopedKey = GM.scopedKey;

  var THEME_STORAGE_KEY = 'gaza-market-dashboard-theme';
  var OPEN_STORAGE_KEY = 'gmDashboardOpenStatus';
  var NOTIFICATIONS_STORAGE_KEY = 'gmDashboardNotifications';
  var NOTIFICATIONS_MAX = 30;
  var VISITS_STORAGE_KEY = 'gmDashboardVisits';
  var STORE_SUBCATEGORY_KEY = 'gm-store-subcategory';
  var MOBILE_MORE_LOGOUT_ONLY = true;
  var FREE_PLAN_CHIP_LABEL = 'مجانية';
  var LIMIT_NOUNS = {
    menuItems: 'أصناف',
    menuCategories: 'تصنيفات',
    products: 'منتجات',
    productCategories: 'تصنيفات',
    ads: 'إعلانات',
    services: 'خدمات',
    serviceCategories: 'تصنيفات',
    tables: 'طاولات',
    reservations: 'حجوزات',
    discountedProducts: 'منتجات بخصم'
  };
  var LOCKED_FEATURE_LABELS = {
    qrCode: 'كود QR',
    shareWhatsapp: 'المشاركة عبر واتساب',
    subscriptionRequests: 'طلبات الاشتراك',
    cardPayment: 'إظهار الدفع بالبطاقة للزوار',
    whatsappOrder: 'استقبال الطلبات عبر واتساب',
    installments: 'خدمة التقسيط'
  };
  var SERVICE_LOCKED_FEATURE = {
    card_payment: 'cardPayment',
    'payment_methods-tow': 'cardPayment',
    whatsapp_order: 'whatsappOrder',
    installments: 'installments'
  };
  var LOCK_OVERLAY_TEXT = 'متاحة في الباقة المدفوعة';
  var SHARED_PAGES = ['dashboard', 'packages', 'profile'];
  var SAVE_DELAY_MS = 550;

  function ensureMobileNavHost() {
    var host = document.getElementById('mobile-nav-slot');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mobile-nav-slot';
      document.body.appendChild(host);
    }
    return host;
  }

  function getTypeLabelWithSubCategory(typeLabel) {
    var config = getStoreTypeConfig();
    if (!config || config.id !== 'store') return typeLabel;
    var subLabel = null;
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.getStoreSubcategoryLabel === 'function') {
      subLabel = window.GMStoreTypeConfig.getStoreSubcategoryLabel();
    }
    if (!subLabel) {
      try {
        subLabel = localStorage.getItem(STORE_SUBCATEGORY_KEY);
      } catch (e) {}
    }
    if (subLabel) return typeLabel + ' — ' + subLabel;
    return typeLabel;
  }

  function navItemAttrs(item) {
    var attrs = '';
    var page = safePage(item.page);
    if (page) attrs += ' data-page="' + page + '"';
    var action = safeAction(item.action);
    if (action) attrs += ' data-action="' + action + '"';
    // A nav item tied to a plan-locked feature: applyLockedFeaturesToUI() toggles .is-locked
    // on it, and the capture-phase click handler opens the upgrade modal instead of navigating.
    if (typeof item.lockedFeature === 'string' && /^[A-Za-z]{1,32}$/.test(item.lockedFeature)) {
      attrs += ' data-locked-feature="' + item.lockedFeature + '"';
    }
    return attrs;
  }

  function navLockIconHTML(item) {
    return item.lockedFeature ? '<i data-lucide="lock" class="icon nav-lock-icon"></i>' : '';
  }

  function renderSidebarNav() {
    var config = getStoreTypeConfig();
    if (!config) return;
    var nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    var html = config.sidebar.map(function (item) {
      var badge = item.badge ? '<span class="nav-item-badge">' + escapeHtml(item.badge) + '</span>' : '';
      return (
        '<a href="' + escapeHtml(safeHref(item.href)) + '" class="nav-item"' + navItemAttrs(item) + '>' +
          '<span class="nav-item-icon"><i data-lucide="' + safeIcon(item.icon) + '" class="icon"></i></span>' +
          '<span class="nav-item-text">' +
            '<span class="nav-item-label">' + escapeHtml(item.label) + '</span>' +
            '<span class="label-sub">' + escapeHtml(item.sub) + '</span>' +
          '</span>' +
          badge +
          navLockIconHTML(item) +
          '<i data-lucide="chevron-left" class="icon nav-item-chevron"></i>' +
        '</a>'
      );
    }).join('');

    nav.innerHTML = html;
  }

  function renderMobileNav() {
    var config = getStoreTypeConfig();
    if (!config) return;
    var nav = document.getElementById('mobile-bottom-nav');
    if (!nav) return;

    var moreBtn = nav.querySelector('[data-action="open-mobile-more"]');
    var moreBtnHTML = moreBtn ? moreBtn.outerHTML : '';

    var itemsHTML = config.mobileNav.map(function (item) {
      var badge = item.badge ? '<span class="mobile-nav-badge"></span>' : '';
      return (
        '<a href="' + escapeHtml(safeHref(item.href)) + '" class="mobile-nav-item"' + navItemAttrs(item) + '>' +
          '<i data-lucide="' + safeIcon(item.icon) + '" class="icon"></i>' +
          '<span>' + escapeHtml(item.label) + '</span>' +
          badge +
        '</a>'
      );
    }).join('');

    nav.innerHTML = itemsHTML + moreBtnHTML;
  }

  function navItemKey(item) {
    return item.page || item.action || item.href;
  }

  function renderMobileMore() {
    var config = getStoreTypeConfig();
    if (!config || !Array.isArray(config.sidebar)) return;
    var body = document.querySelector('.mobile-more-body');
    if (!body) return;

    var logoutRow = body.querySelector('[data-action="logout"]');
    var logoutHTML = logoutRow ? logoutRow.outerHTML : '';

    var mobileNavKeys = (config.mobileNav || []).map(navItemKey);
    var moreItems = MOBILE_MORE_LOGOUT_ONLY ? [] : config.sidebar.filter(function (item) {
      return mobileNavKeys.indexOf(navItemKey(item)) === -1;
    });

    var itemsHTML = moreItems.map(function (item) {
      return (
        '<a href="' + escapeHtml(safeHref(item.href)) + '" class="mobile-more-row"' + navItemAttrs(item) + '>' +
          '<div class="mobile-more-row-icon-wrap">' +
            '<i data-lucide="' + safeIcon(item.icon) + '" class="icon"></i>' +
          '</div>' +
          '<div class="mobile-more-row-text">' +
            '<div class="mobile-more-row-title">' + escapeHtml(item.label) + '</div>' +
            '<div class="mobile-more-row-sub">' + escapeHtml(item.sub) + '</div>' +
          '</div>' +
          '<i data-lucide="chevron-left" class="icon mobile-more-chevron"></i>' +
        '</a>'
      );
    }).join('');

    body.innerHTML = itemsHTML + logoutHTML;
  }

  function applyStoreTypeLabel() {
    var config = getStoreTypeConfig();
    if (!config) return;
    document.querySelectorAll('[data-store-type-label]').forEach(function (el) {
      el.textContent = config.label;
    });
  }

  function applyStoreTypePageCopy() {
    var config = getStoreTypeConfig();
    if (!config || !config.pageCopy) return;
    document.querySelectorAll('[data-store-type-copy]').forEach(function (el) {
      var key = el.getAttribute('data-store-type-copy');
      var text = config.pageCopy[key];
      if (text) el.textContent = text;
    });
    if (config.pageCopy.profileTitle && document.body.getAttribute('data-page') === 'profile') {
      document.title = config.pageCopy.profileTitle + ' — سوق غزة';
    }
  }

  function markActiveNavItem() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    document.querySelectorAll('.nav-item[data-page]').forEach(function (el) {
      if (el.getAttribute('data-page') === page) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
    document.querySelectorAll('.mobile-nav-item[data-page]').forEach(function (el) {
      if (el.getAttribute('data-page') === page) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  function wireDrawer() {
    var panel = document.querySelector('.side-panel');
    var scrim = document.querySelector('.scrim');
    var openBtn = document.querySelector('[data-action="open-sidebar"]');
    var closeBtn = document.querySelector('[data-action="close-sidebar"]');
    if (!panel) return;

    function open() {
      panel.classList.add('open');
      if (scrim) scrim.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      panel.classList.remove('open');
      if (scrim) scrim.classList.remove('visible');
      document.body.style.overflow = '';
    }

    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  function closeSidebarDrawerIfNeeded() {
    var panel = document.querySelector('.side-panel');
    if (!panel || !panel.classList.contains('open')) return;
    var scrim = document.querySelector('.scrim');
    panel.classList.remove('open');
    if (scrim) scrim.classList.remove('visible');
    document.body.style.overflow = '';
  }

  function wireMobileMoreSheet() {
    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest && e.target.closest('[data-action="open-mobile-more"]');
      if (openTrigger) {
        e.preventDefault();
        openMobileMoreSheet();
        return;
      }
      var closeTrigger = e.target.closest && e.target.closest('[data-action="close-mobile-more"]');
      if (closeTrigger) {
        closeMobileMoreSheet();
        return;
      }
      var scrim = document.getElementById('mobile-more-scrim');
      if (scrim && e.target === scrim) {
        closeMobileMoreSheet();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobileMoreSheet();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) closeMobileMoreSheet();
    });
  }

  function openMobileMoreSheet() {
    var sheet = document.getElementById('mobile-more-sheet');
    var scrim = document.getElementById('mobile-more-scrim');
    if (!sheet) return;
    sheet.classList.add('open');
    if (scrim) scrim.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMoreSheet() {
    var sheet = document.getElementById('mobile-more-sheet');
    var scrim = document.getElementById('mobile-more-scrim');
    if (!sheet || !sheet.classList.contains('open')) return;
    sheet.classList.remove('open');
    if (scrim) scrim.classList.remove('open');
    document.body.style.overflow = '';
  }

  function wireSwitches() {
    document.querySelectorAll('.switch:not([data-action="toggle-open"])').forEach(function (el) {
      el.addEventListener('click', function () {
        el.classList.toggle('on');
      });
      el.setAttribute('role', 'switch');
      el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  function applyTheme(theme) {
    var isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    var toggleBtn = document.querySelector('[data-action="toggle-theme"]');
    if (toggleBtn) {
      var icon = toggleBtn.querySelector('[data-lucide]');
      if (icon) {
        var newIconName = isDark ? 'sun' : 'moon';
        icon.setAttribute('data-lucide', newIconName);
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      }
      toggleBtn.setAttribute('aria-label', isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي');
    }
  }

  function wireThemeToggle() {
    var stored = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (err) {}
    var initialTheme = stored === 'dark' ? 'dark' : 'light';
    applyTheme(initialTheme);

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="toggle-theme"]');
      if (!btn) return;
      var isDark = document.body.classList.contains('dark-mode');
      var nextTheme = isDark ? 'light' : 'dark';
      applyTheme(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (err) { handleStorageError(err); }
    });
  }

  function wireTopnavAccountLink() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="go-to-profile"]');
      if (!btn) return;
      window.location.href = PROFILE_PAGE_URL;
    });
  }

  function getCurrentPlanId() {
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.getCurrentPlan === 'function') {
      return window.GMStoreTypeConfig.getCurrentPlan();
    }
    return 'free';
  }

  function getCurrentPlanView() {
    var config = getStoreTypeConfig();
    var pkgs = config && config.packages ? config.packages : null;
    if (getCurrentPlanId() === 'paid' && pkgs && pkgs.paid) {
      return {
        id: 'paid',
        name: pkgs.paid.name,
        chipLabel: pkgs.paid.name,
        heroLabel: pkgs.paid.badge || ('باقة ' + pkgs.paid.name)
      };
    }
    return {
      id: 'free',
      name: pkgs && pkgs.free ? pkgs.free.name : 'مجاني',
      chipLabel: FREE_PLAN_CHIP_LABEL,
      heroLabel: 'باقة ' + FREE_PLAN_CHIP_LABEL
    };
  }

  function updateHeroPlanChip() {
    var el = document.getElementById('hero-plan-chip');
    if (el) el.textContent = getCurrentPlanView().heroLabel;
  }

  function getServiceLockedFeatureKey(serviceId) {
    return SERVICE_LOCKED_FEATURE[serviceId] || null;
  }

  function isServiceLocked(serviceId) {
    var featureKey = getServiceLockedFeatureKey(serviceId);
    return !!featureKey && isFeatureLockedForPlan(featureKey);
  }

  function getPlanLimitStatus(limitKey, usedCount) {
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.getLimitStatus === 'function') {
      return window.GMStoreTypeConfig.getLimitStatus(limitKey, usedCount);
    }
    return { plan: 'free', limit: null, used: usedCount, remaining: null, unlimited: true, canAdd: true };
  }

  function isFeatureLockedForPlan(featureKey) {
    if (window.GMStoreTypeConfig && typeof window.GMStoreTypeConfig.isFeatureLocked === 'function') {
      return window.GMStoreTypeConfig.isFeatureLocked(featureKey);
    }
    return false;
  }

  function goToPackagesPage() {
    window.location.href = PACKAGES_PAGE_URL;
  }

  function openUpgradeModal(opts) {
    opts = opts || {};
    var title;
    var message;

    if (opts.limitKey) {
      var noun = LIMIT_NOUNS[opts.limitKey] || 'عناصر';
      title = 'تجاوزت حد الباقة المجانية';
      message = 'وصلت للحد الأقصى في الباقة المجانية (' + opts.limit + ' ' + noun + '). ' +
        'اشترك بالباقة المدفوعة لإضافة ' + noun + ' أكثر.';
      if (opts.limitKey === 'discountedProducts') {
        message = 'وصلت للحد الأقصى للخصومات في الباقة المجانية (' + opts.limit + ' منتجات). ' +
          'اشترك بالباقة المدفوعة لتفعيل الخصم على منتجات أكثر.';
      }
    } else {
      var label = LOCKED_FEATURE_LABELS[opts.featureKey];
      title = 'ميزة للباقة المدفوعة';
      message = (label ? 'ميزة «' + escapeHtml(label) + '»' : 'هذه الميزة') +
        ' متاحة في الباقة المدفوعة فقط. اشترك بالباقة المدفوعة لتفعيلها.';
    }

    openConfirmModal({
      icon: 'lock',
      danger: false,
      title: title,
      message: message,
      confirmLabel: 'اشترك بالباقة المدفوعة',
      cancelLabel: 'إغلاق',
      onConfirm: goToPackagesPage
    });
  }

  function guardPlanLimit(limitKey, usedCount) {
    var status = getPlanLimitStatus(limitKey, usedCount);
    if (status.canAdd) return true;
    openUpgradeModal({ limitKey: limitKey, limit: status.limit });
    return false;
  }

  function initLockedFeatures() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-locked-feature]');
      if (!trigger) return;
      var featureKey = trigger.getAttribute('data-locked-feature');
      if (!isFeatureLockedForPlan(featureKey)) return;
      e.preventDefault();
      e.stopPropagation();
      openUpgradeModal({ featureKey: featureKey });
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var trigger = e.target.closest && e.target.closest('[data-lock-overlay].is-locked');
      if (!trigger) return;
      e.preventDefault();
      openUpgradeModal({ featureKey: trigger.getAttribute('data-locked-feature') });
    });
  }

  function applyLockedFeaturesToUI() {
    document.querySelectorAll('[data-locked-feature]').forEach(function (el) {
      var locked = isFeatureLockedForPlan(el.getAttribute('data-locked-feature'));
      el.classList.toggle('is-locked', locked);
      if (!el.hasAttribute('data-lock-overlay')) return;

      var overlay = el.querySelector('.feature-lock-overlay');
      if (locked && !overlay) {
        overlay = document.createElement('div');
        overlay.className = 'feature-lock-overlay';
        overlay.innerHTML =
          '<span class="feature-lock-chip">' +
            '<i data-lucide="lock" class="icon"></i>' +
            '<span>' + LOCK_OVERLAY_TEXT + '</span>' +
          '</span>';
        el.appendChild(overlay);
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
      } else if (!locked && overlay) {
        el.removeChild(overlay);
        el.removeAttribute('role');
        el.removeAttribute('tabindex');
      }
    });
  }

  function applyCurrentPlanToUI() {
    var view = getCurrentPlanView();
    updateHeroPlanChip();

    var sidebarChip = document.querySelector('.plan-mini-chip');
    if (sidebarChip) sidebarChip.textContent = view.chipLabel;

    var sidebarName = document.querySelector('.plan-mini-name');
    if (sidebarName) sidebarName.textContent = view.name;

    var mobileChip = document.querySelector('.mobile-plan-label .plan-chip');
    if (mobileChip) mobileChip.textContent = view.name;

    var isPaid = view.id === 'paid';
    var sidebarDesc = document.querySelector('.plan-mini-desc');
    if (sidebarDesc) sidebarDesc.style.display = isPaid ? 'none' : '';
    var sidebarUpgradeBtn = document.querySelector('.plan-mini-btn');
    if (sidebarUpgradeBtn) sidebarUpgradeBtn.style.display = isPaid ? 'none' : '';
    var mobileUpgrade = document.querySelector('.mobile-plan-upgrade');
    if (mobileUpgrade) mobileUpgrade.style.display = isPaid ? 'none' : '';
  }

  function getStoredOpenStatus() {
    try {
      var v = localStorage.getItem(scopedKey(OPEN_STORAGE_KEY));
      if (v === null) return true;
      return v === 'true';
    } catch (err) {
      return true;
    }
  }

  function setStoredOpenStatus(isOpen) {
    try {
      localStorage.setItem(scopedKey(OPEN_STORAGE_KEY), isOpen ? 'true' : 'false');
    } catch (err) { handleStorageError(err); }
  }

  function updateSubscriptionRequestsNavBadge(count) {
    document.querySelectorAll('.nav-item[data-page="subscription-requests"] .nav-item-badge, .mobile-nav-item[data-page="subscription-requests"] .mobile-nav-badge').forEach(function (el) {
      el.remove();
    });
    if (!count) return;

    var navItem = document.querySelector('.nav-item[data-page="subscription-requests"]');
    if (navItem) {
      var badge = document.createElement('span');
      badge.className = 'nav-item-badge';
      badge.textContent = String(count);
      navItem.appendChild(badge);
    }

    var mobileNavItem = document.querySelector('.mobile-nav-item[data-page="subscription-requests"]');
    if (mobileNavItem) {
      var dot = document.createElement('span');
      dot.className = 'mobile-nav-badge';
      mobileNavItem.appendChild(dot);
    }
  }

  function updateReservationsNavBadge(count) {
    document.querySelectorAll('.nav-item[data-page="reservations"] .nav-item-badge, .mobile-nav-item[data-page="reservations"] .mobile-nav-badge').forEach(function (el) {
      el.remove();
    });
    if (!count) return;

    var navItem = document.querySelector('.nav-item[data-page="reservations"]');
    if (navItem) {
      var badge = document.createElement('span');
      badge.className = 'nav-item-badge';
      badge.textContent = String(count);
      navItem.appendChild(badge);
    }

    var mobileNavItem = document.querySelector('.mobile-nav-item[data-page="reservations"]');
    if (mobileNavItem) {
      var dot = document.createElement('span');
      dot.className = 'mobile-nav-badge';
      mobileNavItem.appendChild(dot);
    }
  }

  function setContactRow(rowId, iconName, value, hrefBuilder) {
    var row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';

    if (value) {
      var a = document.createElement('a');
      a.className = 'mono';
      a.textContent = value;
      var href = hrefBuilder ? hrefBuilder(value) : null;
      if (href) {
        a.href = href;
        if (href.indexOf('http') === 0) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
      }
      row.appendChild(a);
    } else {
      var span = document.createElement('span');
      span.className = 'mono text-muted';
      span.textContent = '—';
      row.appendChild(span);
    }

    var icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    icon.className = 'icon contact-icon';
    row.appendChild(icon);
  }

  function applyProfileSubText(profile) {
    var typeConfig = getStoreTypeConfig();
    var typeLabel = typeConfig ? typeConfig.label : 'مساحة عمل';
    var regionText = (profile && profile.regionLabel) || 'لم تحدد المنطقة بعد';
    var text = regionText + ' · ' + getTypeLabelWithSubCategory(typeLabel);
    var topbarSub = document.getElementById('profile-sub-text');
    if (topbarSub) topbarSub.textContent = text;
    var pageSub = document.getElementById('profile-page-sub');
    if (pageSub) pageSub.textContent = text;
  }

  function setAvatarElement(el, image, text, useLogo) {
    if (!el) return;
    el.classList.remove('avatar--logo');
    el.style.backgroundColor = '';
    if (image) {
      el.style.backgroundImage = toCssUrl(image);
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = '';
      el.textContent = '';
      return;
    }
    if (useLogo) {
      el.classList.add('avatar--logo');
      el.style.backgroundImage = 'url("' + LOGO_URL + '")';
      el.style.backgroundSize = '68%';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundColor = '#ffffff';
      el.textContent = '';
      return;
    }
    el.style.backgroundImage = '';
    el.style.backgroundSize = '';
    el.style.backgroundPosition = '';
    el.style.backgroundRepeat = '';
    el.textContent = text;
  }

  function applyIdentityToUI(profile) {
    var hasName = !!(profile && profile.name);
    var displayName = hasName ? profile.name : getFallbackName();
    var avatarText = hasName ? (Array.from(profile.name.trim())[0] || getFallbackAvatarLetter()) : getFallbackAvatarLetter();
    var image = profile && profile.image ? profile.image : null;

    ['hero-user-name', 'profile-name-text', 'udTopnavUsername'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = displayName;
    });
    setAvatarElement(document.getElementById('profile-avatar-letter'), image, avatarText, false);
    setAvatarElement(document.querySelector('.ud-topnav-avatar'), image, avatarText, false);
  }

  function applyProfileToUI(profile) {
    applyProfileSubText(profile);
    applyIdentityToUI(profile);
    if (!profile) {
      var emptyProfileName = document.getElementById('profile-page-name');
      if (emptyProfileName) emptyProfileName.textContent = getFallbackName();
      return;
    }

    var emptyBox = document.getElementById('location-empty');
    var filledBox = document.getElementById('location-filled');
    var hasLocation = isValidCoordinate(profile.lat, -90, 90) && isValidCoordinate(profile.lng, -180, 180);
    if (emptyBox && filledBox) {
      emptyBox.style.display = hasLocation ? 'none' : '';
      filledBox.style.display = hasLocation ? '' : 'none';
    }

    var ppAvatar = document.getElementById('profile-page-avatar');
    if (ppAvatar) {
      if (profile.image) {
        ppAvatar.style.backgroundImage = toCssUrl(profile.image);
        ppAvatar.textContent = '';
      } else {
        ppAvatar.style.backgroundImage = '';
        ppAvatar.textContent = (profile.name || getFallbackAvatarLetter()).trim().charAt(0) || getFallbackAvatarLetter();
      }
    }

    var ppName = document.getElementById('profile-page-name');
    if (ppName) ppName.textContent = profile.name || getFallbackName();

    var ppAddress = document.getElementById('profile-address-value');
    if (ppAddress) ppAddress.textContent = profile.address || '—';

    setContactRow('profile-phone-row', 'phone', profile.phone, function (v) {
      return 'tel:' + v.replace(/\s+/g, '');
    });
    setContactRow('profile-whatsapp-row', 'message-circle', profile.whatsapp, function (v) {
      return 'https://wa.me/' + v.replace(/[^0-9]/g, '');
    });

    var mapLink = document.getElementById('profile-map-link');
    var mapEmptyText = document.getElementById('profile-map-empty-text');
    if (mapLink && mapEmptyText) {
      if (hasLocation) {
        mapLink.href = 'https://www.google.com/maps?q=' + profile.lat + ',' + profile.lng;
        mapLink.style.display = '';
        mapEmptyText.style.display = 'none';
      } else {
        mapLink.style.display = 'none';
        mapEmptyText.style.display = '';
      }
    }

    var publicLinkEl = document.getElementById('profile-public-link');
    if (publicLinkEl) publicLinkEl.textContent = getPublicUrl(profile);

    bootIcons();
  }

  function applyOpenStatusToUI(isOpen) {
    document.querySelectorAll('[data-action="toggle-open"]').forEach(function (el) {
      el.classList.toggle('on', isOpen);
    });

    var pill = document.getElementById('hero-status-pill');
    var pillText = document.getElementById('hero-status-text');
    if (pill && pillText) {
      pill.classList.toggle('closed', !isOpen);
      pillText.textContent = isOpen ? 'مفتوح' : 'مغلق حالياً';
    }

    var profilePill = document.getElementById('profile-status-pill');
    var profilePillText = document.getElementById('profile-status-text');
    if (profilePill && profilePillText) {
      profilePill.classList.toggle('closed', !isOpen);
      profilePillText.textContent = isOpen ? 'مفتوح' : 'مغلق حالياً';
    }

    document.querySelectorAll('.js-open-status-title').forEach(function (el) {
      el.textContent = isOpen ? 'مساحة مفتوحة' : 'مساحة مغلقة';
    });
    document.querySelectorAll('.js-open-status-sub').forEach(function (el) {
      el.textContent = isOpen ? 'الزبائن يستطيعون الطلب الآن' : 'غير متاح لاستقبال الطلبات حالياً';
    });
  }

  function toVisitCount(value) {
    var n = parseInt(value, 10);
    return n > 0 ? n : 0;
  }

  function getStoredVisits() {
    var visits = { today: 0, week: 0, total: 0 };
    try {
      var data = parseStoredObject(localStorage.getItem(scopedKey(VISITS_STORAGE_KEY)));
      if (data) {
        visits.today = toVisitCount(data.today);
        visits.week = toVisitCount(data.week);
        visits.total = toVisitCount(data.total);
      }
    } catch (err) {}
    return visits;
  }

  function applyVisitsToUI() {
    var visits = getStoredVisits();
    [
      ['.js-visits-today', visits.today],
      ['.js-visits-week', visits.week],
      ['.js-visits-total', visits.total]
    ].forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        el.textContent = String(pair[1]);
      });
    });
  }

  function initOpenStatusToggle() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-action="toggle-open"]');
      if (!el) return;
      var next = !getStoredOpenStatus();
      setStoredOpenStatus(next);
      applyOpenStatusToUI(next);
    });
  }

  function initLogoutAction() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="logout"]');
      if (!btn) return;
      if (!window.GMAuth || typeof window.GMAuth.logout !== 'function') return;

      e.preventDefault();
      e.stopPropagation();

      closeSidebarDrawerIfNeeded();
      closeMobileMoreSheet();

      openConfirmModal({
        icon: 'log-out',
        danger: true,
        title: 'تسجيل الخروج؟',
        message: 'هل أنت متأكد أنك تريد تسجيل الخروج من لوحة التحكم؟',
        confirmLabel: 'تسجيل الخروج',
        cancelLabel: 'إلغاء',
        onConfirm: function () {
          window.GMAuth.logout();
        }
      });
    }, true);
  }

  function getStoredNotifications() {
    try {
      var raw = localStorage.getItem(scopedKey(NOTIFICATIONS_STORAGE_KEY));
      return parseStoredArray(raw);
    } catch (err) {
      return [];
    }
  }

  function setStoredNotifications(list) {
    try {
      localStorage.setItem(scopedKey(NOTIFICATIONS_STORAGE_KEY), JSON.stringify(list));
    } catch (err) { handleStorageError(err); }
  }

  function generateNotificationId() {
    return window.GM_ID.generate('notif');
  }

  function addNotification(data) {
    var list = getStoredNotifications();
    list.unshift({
      id: generateNotificationId(),
      icon: safeIcon(data.icon, 'bell'),
      title: data.title || '',
      sub: data.sub || '',
      createdAt: Date.now(),
      read: false
    });
    if (list.length > NOTIFICATIONS_MAX) list = list.slice(0, NOTIFICATIONS_MAX);
    setStoredNotifications(list);
    renderNotifications();
  }

  function formatNotifTime(ts) {
    var diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return 'الآن';
    var diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return 'قبل ' + diffMin + ' دقيقة';
    var diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return 'قبل ' + diffHour + ' ساعة';
    var diffDay = Math.floor(diffHour / 24);
    return 'قبل ' + diffDay + ' يوم';
  }

  function renderNotifications() {
    var body = document.getElementById('notifPanelBody');
    var dot = document.getElementById('notifDot');
    if (!body) return;

    var list = getStoredNotifications();
    var hasUnread = list.some(function (n) { return !n.read; });
    if (dot) dot.classList.toggle('show', hasUnread);

    if (!list.length) {
      body.innerHTML = '<div class="notif-empty">ما في إشعارات جديدة</div>';
      return;
    }

    body.innerHTML = list.map(function (n) {
      return (
        '<div class="notif-row' + (n.read ? '' : ' unread') + '">' +
          '<div class="notif-row-icon-wrap">' +
            '<i data-lucide="' + safeIcon(n.icon, 'bell') + '" class="icon"></i>' +
          '</div>' +
          '<div class="notif-row-text">' +
            '<div class="notif-row-title">' + escapeHtml(n.title) + '</div>' +
            (n.sub ? '<div class="notif-row-sub">' + escapeHtml(n.sub) + '</div>' : '') +
            '<div class="notif-row-time">' + formatNotifTime(n.createdAt) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    bootIcons();
  }

  function markAllNotificationsRead() {
    var list = getStoredNotifications();
    var changed = false;
    list.forEach(function (n) {
      if (!n.read) { n.read = true; changed = true; }
    });
    if (changed) {
      setStoredNotifications(list);
      var dot = document.getElementById('notifDot');
      if (dot) dot.classList.remove('show');
    }
  }

  function openNotifPanel() {
    var panel = document.getElementById('notifPanel');
    if (!panel) return;
    panel.classList.add('open');
    setTimeout(markAllNotificationsRead, 900);
  }

  function closeNotifPanel() {
    var panel = document.getElementById('notifPanel');
    if (panel) panel.classList.remove('open');
  }

  function wireNotifications() {
    document.addEventListener('click', function (e) {
      var toggleBtn = e.target.closest && e.target.closest('[data-action="toggle-notifications"]');
      if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        var panel = document.getElementById('notifPanel');
        if (panel && panel.classList.contains('open')) {
          closeNotifPanel();
        } else {
          openNotifPanel();
        }
        return;
      }

      var clearBtn = e.target.closest && e.target.closest('[data-action="clear-notifications"]');
      if (clearBtn) {
        e.preventDefault();
        setStoredNotifications([]);
        renderNotifications();
        return;
      }

      var panelEl = document.getElementById('notifPanel');
      var wrapEl = document.querySelector('.ud-notif-wrap');
      if (panelEl && panelEl.classList.contains('open') && wrapEl && !wrapEl.contains(e.target)) {
        closeNotifPanel();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNotifPanel();
    });
  }

  function isPageAllowedForType(page) {
    if (!page || SHARED_PAGES.indexOf(page) !== -1) return true;
    var config = getStoreTypeConfig();
    if (!config) return true;
    var lists = [config.sidebar, config.mobileNav, config.dashboardCards];
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i] || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j] && list[j].page === page) return true;
      }
    }
    return false;
  }

  function guardPageForStoreType() {
    var page = document.body.getAttribute('data-page');
    if (isPageAllowedForType(page)) return true;
    window.location.replace('dashboard.html');
    return false;
  }

  function initSaveButtonDelay() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('button[id$="-save-btn"]');
      if (!btn || btn.disabled) return;
      if (btn.getAttribute('data-save-passed') === '1') {
        btn.removeAttribute('data-save-passed');
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (btn.classList.contains('is-saving')) return;
      btn.classList.add('is-saving');
      btn.setAttribute('aria-busy', 'true');
      window.setTimeout(function () {
        btn.classList.remove('is-saving');
        btn.removeAttribute('aria-busy');
        btn.setAttribute('data-save-passed', '1');
        btn.click();
        btn.removeAttribute('data-save-passed');
      }, SAVE_DELAY_MS);
    }, true);
  }

  var SHELL_PARTIALS_BEFORE = [
    ['#topnav-slot', 'topnav.html'],
    ['#sidebar-slot', 'sidebar.html'],
    ['#topbar-slot', 'topbar.html']
  ];
  var SHELL_PARTIALS_AFTER = [
    ['#mobile-nav-slot', 'mobile-nav.html']
  ];

  async function boot(opts) {
    opts = opts || {};
    if (window.GMAuth && typeof window.GMAuth.whenReady === 'function') {
      if (!(await window.GMAuth.whenReady())) return false;
    }
    if (!guardPageForStoreType()) return false;
    if (typeof opts.beforePartials === 'function') opts.beforePartials();
    ensureMobileNavHost();
    var partials = SHELL_PARTIALS_BEFORE.concat(opts.partials || [], SHELL_PARTIALS_AFTER);
    await Promise.all(partials.map(function (p) { return loadPartial(p[0], p[1]); }));
    renderSidebarNav();
    renderMobileNav();
    renderMobileMore();
    if (typeof opts.afterNavRender === 'function') opts.afterNavRender();
    applyStoreTypeLabel();
    applyStoreTypePageCopy();
    applyCurrentPlanToUI();
    applyLockedFeaturesToUI();
    markActiveNavItem();
    wireDrawer();
    wireSwitches();
    wireThemeToggle();
    wireTopnavAccountLink();
    wireMobileMoreSheet();
    wireNotifications();
    renderNotifications();
    if (typeof opts.afterNotifications === 'function') opts.afterNotifications();
    initLogoutAction();
    applyProfileToUI(getStoredProfile());
    applyOpenStatusToUI(getStoredOpenStatus());
    applyVisitsToUI();
    return true;
  }

  var OFFLINE_MESSAGE = 'أنت غير متصل بالإنترنت — تعرض بيانات محفوظة';

  function initOfflineBanner() {
    if (document.getElementById('gm-offline-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'gm-offline-banner';
    banner.className = 'offline-toast';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');

    var icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'wifi-off');
    icon.className = 'icon';

    var text = document.createElement('span');
    text.textContent = OFFLINE_MESSAGE;

    banner.appendChild(icon);
    banner.appendChild(text);
    document.body.appendChild(banner);
    bootIcons();

    function sync() {
      banner.classList.toggle('is-visible', !navigator.onLine);
    }

    window.addEventListener('offline', sync);
    window.addEventListener('online', sync);
    sync();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !GM.SW_URL) return;
    var host = window.location.hostname;
    if (window.location.protocol !== 'https:' && host !== 'localhost' && host !== '127.0.0.1') return;

    function register() {
      navigator.serviceWorker
        .register(GM.SW_URL, { scope: GM.SW_SCOPE, updateViaCache: 'none' })
        .then(function () { return navigator.serviceWorker.ready; })
        .then(function (registration) {
          if (navigator.onLine && registration.active) {
            registration.active.postMessage({ type: 'gm-precache-dashboard' });
          }
        })
        .catch(function (err) {
          console.warn('Service Worker registration failed:', err);
        });
    }

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
  }

  initOfflineBanner();
  registerServiceWorker();

  GM.THEME_STORAGE_KEY = THEME_STORAGE_KEY;
  GM.OPEN_STORAGE_KEY = OPEN_STORAGE_KEY;
  GM.NOTIFICATIONS_STORAGE_KEY = NOTIFICATIONS_STORAGE_KEY;
  GM.NOTIFICATIONS_MAX = NOTIFICATIONS_MAX;
  GM.VISITS_STORAGE_KEY = VISITS_STORAGE_KEY;
  GM.ensureMobileNavHost = ensureMobileNavHost;
  GM.STORE_SUBCATEGORY_KEY = STORE_SUBCATEGORY_KEY;
  GM.getTypeLabelWithSubCategory = getTypeLabelWithSubCategory;
  GM.navItemAttrs = navItemAttrs;
  GM.renderSidebarNav = renderSidebarNav;
  GM.renderMobileNav = renderMobileNav;
  GM.navItemKey = navItemKey;
  GM.MOBILE_MORE_LOGOUT_ONLY = MOBILE_MORE_LOGOUT_ONLY;
  GM.renderMobileMore = renderMobileMore;
  GM.applyStoreTypeLabel = applyStoreTypeLabel;
  GM.applyStoreTypePageCopy = applyStoreTypePageCopy;
  GM.markActiveNavItem = markActiveNavItem;
  GM.wireDrawer = wireDrawer;
  GM.closeSidebarDrawerIfNeeded = closeSidebarDrawerIfNeeded;
  GM.wireMobileMoreSheet = wireMobileMoreSheet;
  GM.openMobileMoreSheet = openMobileMoreSheet;
  GM.closeMobileMoreSheet = closeMobileMoreSheet;
  GM.wireSwitches = wireSwitches;
  GM.applyTheme = applyTheme;
  GM.wireThemeToggle = wireThemeToggle;
  GM.wireTopnavAccountLink = wireTopnavAccountLink;
  GM.FREE_PLAN_CHIP_LABEL = FREE_PLAN_CHIP_LABEL;
  GM.getCurrentPlanId = getCurrentPlanId;
  GM.getCurrentPlanView = getCurrentPlanView;
  GM.updateHeroPlanChip = updateHeroPlanChip;
  GM.LIMIT_NOUNS = LIMIT_NOUNS;
  GM.LOCKED_FEATURE_LABELS = LOCKED_FEATURE_LABELS;
  GM.SERVICE_LOCKED_FEATURE = SERVICE_LOCKED_FEATURE;
  GM.getServiceLockedFeatureKey = getServiceLockedFeatureKey;
  GM.isServiceLocked = isServiceLocked;
  GM.LOCK_OVERLAY_TEXT = LOCK_OVERLAY_TEXT;
  GM.getPlanLimitStatus = getPlanLimitStatus;
  GM.isFeatureLockedForPlan = isFeatureLockedForPlan;
  GM.goToPackagesPage = goToPackagesPage;
  GM.openUpgradeModal = openUpgradeModal;
  GM.guardPlanLimit = guardPlanLimit;
  GM.initLockedFeatures = initLockedFeatures;
  GM.applyLockedFeaturesToUI = applyLockedFeaturesToUI;
  GM.applyCurrentPlanToUI = applyCurrentPlanToUI;
  GM.getStoredOpenStatus = getStoredOpenStatus;
  GM.setStoredOpenStatus = setStoredOpenStatus;
  GM.updateSubscriptionRequestsNavBadge = updateSubscriptionRequestsNavBadge;
  GM.updateReservationsNavBadge = updateReservationsNavBadge;
  GM.setContactRow = setContactRow;
  GM.applyProfileSubText = applyProfileSubText;
  GM.setAvatarElement = setAvatarElement;
  GM.applyIdentityToUI = applyIdentityToUI;
  GM.applyProfileToUI = applyProfileToUI;
  GM.applyOpenStatusToUI = applyOpenStatusToUI;
  GM.toVisitCount = toVisitCount;
  GM.getStoredVisits = getStoredVisits;
  GM.applyVisitsToUI = applyVisitsToUI;
  GM.initOpenStatusToggle = initOpenStatusToggle;
  GM.initLogoutAction = initLogoutAction;
  GM.getStoredNotifications = getStoredNotifications;
  GM.setStoredNotifications = setStoredNotifications;
  GM.generateNotificationId = generateNotificationId;
  GM.addNotification = addNotification;
  GM.formatNotifTime = formatNotifTime;
  GM.renderNotifications = renderNotifications;
  GM.markAllNotificationsRead = markAllNotificationsRead;
  GM.openNotifPanel = openNotifPanel;
  GM.closeNotifPanel = closeNotifPanel;
  GM.wireNotifications = wireNotifications;
  GM.SHARED_PAGES = SHARED_PAGES;
  GM.isPageAllowedForType = isPageAllowedForType;
  GM.guardPageForStoreType = guardPageForStoreType;
  GM.SAVE_DELAY_MS = SAVE_DELAY_MS;
  GM.initSaveButtonDelay = initSaveButtonDelay;
  GM.boot = boot;
})();