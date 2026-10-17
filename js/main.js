const TRANSLATIONS = {
  ar: {
    authTitleLogin:           "تسجيل الدخول",
    authSubLogin:             "أدخل رقم هاتفك للمتابعة",
    authTitleRegister:        "إنشاء حساب جديد",
    authSubRegister:          "أدخل بياناتك لإنشاء حسابك",
    authOtpTitle:             "التحقق من الرقم",
    authOtpSub:               "أدخل الرمز المرسل إلى هاتفك",
    authSuccessLoginTitle:    "أهلاً بك!",
    authSuccessLoginSub:      "تم تسجيل دخولك بنجاح",
    authSuccessRegisterTitle: "تم إنشاء الحساب!",
    authSuccessRegisterSub:   "مرحباً بك في المنصة",
    authErrOtpIncomplete:     "أدخل الرمز كاملاً (6 أرقام)",
    authErrOtpWrong:          "الرمز غير صحيح، حاول مجدداً",
    regionSelectError:             "يرجى اختيار منطقة قبل المتابعة",
    "addPrice.title":              "إضافة سعر",
    "addPrice.product":            "المنتج",
    "addPrice.price":              "السعر",
    "addPrice.region":             "المنطقة",
    "addPrice.regionPlaceholder":  "اختر المنطقة...",
    "addPrice.quickPriceHint":     "أو اختر سعر سريع",
    "addPrice.storeName":          "اسم المتجر",
    "addPrice.storeAddress":       "عنوان المتجر",
    "addPrice.submit":             "إرسال السعر",
    "addPrice.cancel":             "إلغاء",
    "addPrice.note":               "شكراً لمساهمتك في مساعدة المجتمع",
    "listingSuccess.title":        "تم نشر الإعلان بنجاح",
    "listingSuccess.desc":         "شكراً لك، إعلانك أصبح الآن متاحاً في السوق وسيتمكن الأشخاص القريبون من رؤيته.",
    "listingSuccess.backHome":     "العودة للرئيسية",
    "listingSuccess.addAnother":   "نشر إعلان آخر",
    "addListing.phone":            "رقم هاتف المعلن",
    "addListing.phonePlaceholder": "05XX XXX XXX",
    "addListing.whatsapp":         "رقم الواتساب",
    "addListing.whatsappPlaceholder": "+972 5XX XXX XXX",
    "addListing.cardPhoneTitle":   "رقم الهاتف",
    "addListing.cardPhoneSub":     "سيستخدم المشترون هذا الرقم للتواصل معك",
    "addListing.errRequired":      "هذا الحقل مطلوب",

    "npw.unit":                    "الوحدة",
    "npw.quantity":                "الكمية",
    "npw.unitPlaceholder":         "اختر الوحدة...",
    "npw.unitKg":                  "كيلوغرام (كغ)",
    "npw.unitG":                   "غرام (غ)",
    "npw.unitL":                   "لتر (ل)",
    "npw.unitMl":                  "مليلتر (مل)",
    "npw.unitPiece":               "قطعة",
    "npw.unitPack":                "عبوة",
    "npw.unitBox":                 "صندوق",
    "npw.unitSack":                "كيس",
    "npw.errUnitRequired":         "يرجى اختيار الوحدة",
    "npw.errRequired":             "هذا الحقل مطلوب",
    "npw.reviewUnit":              "الوحدة والكمية",
  },
  en: {
    authTitleLogin:           "Sign In",
    authSubLogin:             "Enter your phone number to continue",
    authTitleRegister:        "Create Account",
    authSubRegister:          "Enter your details to create your account",
    authOtpTitle:             "Verify Your Number",
    authOtpSub:               "Enter the code sent to your phone",
    authSuccessLoginTitle:    "Welcome back!",
    authSuccessLoginSub:      "You have signed in successfully",
    authSuccessRegisterTitle: "Account Created!",
    authSuccessRegisterSub:   "Welcome to the platform",
    authErrOtpIncomplete:     "Please enter the full 6-digit code",
    authErrOtpWrong:          "Incorrect code, please try again",
    regionSelectError:             "Please select a region before continuing",
    "addPrice.title":              "Add Price",
    "addPrice.product":            "Product",
    "addPrice.price":              "Price",
    "addPrice.region":             "Region",
    "addPrice.regionPlaceholder":  "Select region...",
    "addPrice.quickPriceHint":     "Or pick a quick price",
    "addPrice.storeName":          "Store Name",
    "addPrice.storeAddress":       "Store Address",
    "addPrice.submit":             "Submit Price",
    "addPrice.cancel":             "Cancel",
    "addPrice.note":               "Thank you for helping the community",
    "listingSuccess.title":        "Ad Posted Successfully",
    "listingSuccess.desc":         "Thank you—your ad is now live in the marketplace and people nearby will be able to see it.",
    "listingSuccess.backHome":     "Back to Home",
    "listingSuccess.addAnother":   "Post another ad",
    "addListing.phone":            "Advertiser Phone Number",
    "addListing.phonePlaceholder": "05XX XXX XXX",
    "addListing.whatsapp":         "WhatsApp Number",
    "addListing.whatsappPlaceholder": "+972 5XX XXX XXX",
    "addListing.cardPhoneTitle":   "Mobile phone number",
    "addListing.cardPhoneSub":     "Buyers will use this number to contact you",
    "addListing.errRequired":      "This field is required",

    "npw.unit":                    "Unit",
    "npw.quantity":                "Quantity",
    "npw.unitPlaceholder":         "Select unit...",
    "npw.unitKg":                  "Kilogram (kg)",
    "npw.unitG":                   "Gram (g)",
    "npw.unitL":                   "Liter (l)",
    "npw.unitMl":                  "Milliliter (ml)",
    "npw.unitPiece":               "Piece",
    "npw.unitPack":                "Pack",
    "npw.unitBox":                 "Box",
    "npw.unitSack":                "Sack",
    "npw.errUnitRequired":         "Please select a unit",
    "npw.errRequired":             "This field is required",
    "npw.reviewUnit":              "Unit & Quantity",
  },
};

function translate(key) {
  if (!key || typeof key !== "string") return "";
  try {
    if (typeof i18n !== "undefined" && typeof i18n.t === "function") {
      const result = i18n.t(key);
      if (result && result !== key) return result;
    }
  } catch (e) {
    console.warn("i18n error:", e);
  }
  const lang =
    document.documentElement.lang?.startsWith("ar") ||
    document.documentElement.dir === "rtl"
      ? "ar"
      : "en";
  return TRANSLATIONS[lang]?.[key] || key;
}

const GM_REGION_KEY       = "gmSelectedArea";
const GM_REGION_LABEL_KEY = "gmSelectedAreaLabel";
const GM_MAIN_LABEL_KEY   = "gmSelectedRegionLabel";

const GM_REGION_KEY_MAP = {
  "Nuseirat": "Nuseirat",
  "Breij": "Breij",
  "Maghazi": "Maghazi",
  "Zawayda": "Zawayda",
  "Deir al-Balah": "DeirBalah",
  "Khan Yunis": "KhanYunis",
  "Rafah": "Rafah",
  "Mawasi Khan Yunis": "MawasiKhanYunis",
  "Mawasi al-Qarara": "MawasiQarara",
  "Alrimal": "Alrimal",
  "Alshaati": "Alshaati",
  "Sheikh Radwan": "SheikhRadwan",
  "Saftawi": "Saftawi",
  "Beit Hanoun": "BeitHanoun",
  "Beit Lahia": "BeitLahia",
  "Tal Al-Hawa": "TalHawa",
  "Jabalia": "Jabalia",
};

function gmGetSelectedArea() {
  return localStorage.getItem(GM_REGION_KEY) || "";
}

function gmSaveSelectedArea(areaValue, areaLabel, regionLabel) {
  if (!areaValue) return;
  localStorage.setItem(GM_REGION_KEY, areaValue);
  if (areaLabel)   localStorage.setItem(GM_REGION_LABEL_KEY, areaLabel);
  if (regionLabel) localStorage.setItem(GM_MAIN_LABEL_KEY, regionLabel);
}

function gmNormalizeRegionKey(raw) {
  if (!raw) return "";
  return GM_REGION_KEY_MAP[raw] || raw;
}

function gmSyncUserRegion(rawArea) {
  try {
    const userRaw = localStorage.getItem(window.GM_STORAGE_KEYS.user);
    if (!userRaw) return;

    const user = JSON.parse(userRaw);
    if (!user) return;

    const normalizedRegion = gmNormalizeRegionKey(rawArea);
    user.region = normalizedRegion || rawArea;
    localStorage.setItem(window.GM_STORAGE_KEYS.user, JSON.stringify(user));

    window.AuthUI?.refresh();
  } catch (err) {
    console.warn("gmSyncUserRegion error:", err);
  }
}

window.gmGetSelectedArea    = gmGetSelectedArea;
window.gmSaveSelectedArea   = gmSaveSelectedArea;
window.gmNormalizeRegionKey = gmNormalizeRegionKey;
window.gmSyncUserRegion     = gmSyncUserRegion;

function gmIsLoggedIn() {
  try {
    const raw = localStorage.getItem(window.GM_STORAGE_KEYS.user);
    if (!raw) return false;
    const user = JSON.parse(raw);
    return !!(user && user.phone);
  } catch (err) {
    return false;
  }
}

function gmRequireAuthThenRun(action, sourceModalId) {
  if (typeof action !== "function") return;

  if (gmIsLoggedIn()) {
    action();
    return;
  }

  const overlay = document.getElementById("authOverlay");
  if (!overlay) {
    action();
    return;
  }

  const sourceEl = sourceModalId ? document.getElementById(sourceModalId) : null;
  const hasBootstrap = typeof bootstrap !== "undefined";
  const sourceInstance = sourceEl && hasBootstrap
    ? bootstrap.Modal.getInstance(sourceEl)
    : null;

  let loggedInDuringFlow = false;

  function openLoginOverlay() {
    function onLoggedIn() {
      loggedInDuringFlow = true;
    }

    function onOverlayClosed() {
      document.removeEventListener("gmUserLoggedIn", onLoggedIn);
      observer.disconnect();

      if (loggedInDuringFlow) {
        setTimeout(action, 50);
        return;
      }

      if (sourceEl && hasBootstrap) {
        sourceEl.setAttribute("data-gm-suppress-reset", "1");
        setTimeout(() => {
          bootstrap.Modal.getOrCreateInstance(sourceEl).show();
        }, 320);
      }
    }

    const observer = new MutationObserver(() => {
      if (!overlay.classList.contains("open")) onOverlayClosed();
    });
    observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });

    document.addEventListener("gmUserLoggedIn", onLoggedIn);

    overlay.style.zIndex = "2000";

    document.getElementById("loginBtn")?.click();
  }

  if (sourceEl && sourceInstance) {
    sourceEl.addEventListener("hidden.bs.modal", function onHidden() {
      sourceEl.removeEventListener("hidden.bs.modal", onHidden);
      openLoginOverlay();
    }, { once: true });
    sourceInstance.hide();
  } else {
    openLoginOverlay();
  }
}

window.gmIsLoggedIn         = gmIsLoggedIn;
window.gmRequireAuthThenRun = gmRequireAuthThenRun;

(function initNavbarScroll() {
  const nav = document.querySelector(".nav-bar");
  if (!nav) return;

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 10);
  }, { passive: true });
})();

(function initNavCollapse() {
  const navbarCollapse = document.querySelector(".navbar-collapse");
  if (!navbarCollapse) return;

  navbarCollapse.style.transformOrigin = "top center";

  navbarCollapse.addEventListener("show.bs.collapse", () => {
    navbarCollapse.style.animation =
      "navSlideDown 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards";
  });

  navbarCollapse.addEventListener("hide.bs.collapse", () => {
    navbarCollapse.style.animation =
      "navSlideUp 0.25s cubic-bezier(0.4, 0, 1, 1) forwards";
  });
})();

(function initDropdownRegions() {
  function closeAllSubMenus() {
    document.querySelectorAll(".sub-menu").forEach(menu => {
      menu.classList.remove("sub-open");
      menu.style.maxHeight = "0";
      menu.style.opacity   = "0";
    });
    document.querySelectorAll(".arrow").forEach(arrow => {
      arrow.style.transform = "rotate(0deg)";
    });
  }

  document.querySelectorAll(".region-toggle").forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const subMenu = this.nextElementSibling;
      const arrow   = this.querySelector(".arrow");
      if (!subMenu) return;

      const isOpen = subMenu.classList.contains("sub-open");
      closeAllSubMenus();

      if (!isOpen) {
        subMenu.classList.add("sub-open");
        subMenu.style.maxHeight = subMenu.scrollHeight + "px";
        subMenu.style.opacity   = "1";
        if (arrow) arrow.style.transform = "rotate(90deg)";
      }
    });
  });

  document.addEventListener("click", closeAllSubMenus);
})();

(function initAreaSelection() {
  const toggleEl  = document.getElementById("selectedAreaLabel");
  const labelText = document.getElementById("areaLabelText");
  if (!toggleEl || !labelText) return;

  const STORAGE_KEY = "selectedAreaKey";

  function setAreaLabel(areaName, areaKey) {
    labelText.textContent = areaName || "";
    if (areaKey) labelText.setAttribute("data-i18n", areaKey);
  }

  function restoreSelection() {
    const gmArea      = gmGetSelectedArea();
    const gmAreaLabel = localStorage.getItem(GM_REGION_LABEL_KEY);

    if (gmArea) {
      let matchingItem =
        document.querySelector(`.dropdown-menu .dropdown-item[data-area="${CSS.escape(gmArea)}"]`) ||
        document.querySelector(`.dropdown-menu .dropdown-item[data-i18n="${CSS.escape(gmArea)}"]`);

      document.querySelectorAll(".dropdown-menu .dropdown-item[data-i18n]").forEach(item => {
        item.classList.remove("area-selected");
      });

      if (matchingItem) {
        matchingItem.classList.add("area-selected");
        const areaKey = matchingItem.getAttribute("data-i18n") || "";
        setAreaLabel(matchingItem.textContent?.trim() || gmAreaLabel || "", areaKey);
        if (areaKey) localStorage.setItem(STORAGE_KEY, areaKey);
      } else {
        setAreaLabel(gmAreaLabel || gmArea, "");
      }
      return;
    }

    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (!savedKey) return;

    document.querySelectorAll(".dropdown-menu .dropdown-item[data-i18n]").forEach(item => {
      item.classList.remove("area-selected");
      if (item.getAttribute("data-i18n") === savedKey) {
        item.classList.add("area-selected");
        setAreaLabel(item.textContent?.trim() || "", savedKey);
      }
    });
  }

  restoreSelection();
  document.addEventListener("languageChanged", restoreSelection);

  document.addEventListener("gmRegionChanged", restoreSelection);

  document.querySelectorAll(".dropdown-menu .dropdown-item[data-i18n]").forEach(item => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      document.querySelectorAll(".dropdown-menu .dropdown-item")
        .forEach(el => el.classList.remove("area-selected"));

      this.classList.add("area-selected");
      const areaName = this.textContent?.trim() || "";
      const areaKey  = this.getAttribute("data-i18n") || "";
      setAreaLabel(areaName, areaKey);
      if (areaKey) localStorage.setItem(STORAGE_KEY, areaKey);

      const rawArea = this.dataset.area || areaKey;
      if (rawArea) {
        gmSaveSelectedArea(rawArea, areaName, "");
        gmSyncUserRegion(rawArea);
        const url = new URL(window.location.href);
        url.searchParams.set("area", rawArea);
        window.location.href = url.toString();
        return;
      }

      if (typeof bootstrap !== "undefined") {
        try {
          const bsDropdown =
            bootstrap.Dropdown.getInstance(toggleEl) ||
            bootstrap.Dropdown.getOrCreateInstance(toggleEl);
          bsDropdown?.hide();
        } catch (err) {
          console.warn("Dropdown hide error:", err);
        }
      }

      window.selectedArea = areaKey;
    });
  });
})();

(function initTheme() {
  const themeBtn  = document.querySelector(".theme-btn");
  const THEME_KEY = window.GM_STORAGE_KEYS.theme;

  if (localStorage.getItem(THEME_KEY) === "dark") {
    document.body.classList.add("dark-mode");
  }

  if (!themeBtn) return;

  themeBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

    const iconClass = isDark ? ".icon-night" : ".icon-day";
    const icon = themeBtn.querySelector(iconClass);
    if (icon) {
      icon.style.transition = "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
      icon.style.transform  = "rotate(20deg) scale(1.3)";
      setTimeout(() => { icon.style.transform = ""; }, 300);
    }
  });
})();

(function initRegionSelector() {
  const regionCards = document.querySelectorAll(".region-card-header");
  if (!regionCards.length) return;

  regionCards.forEach(header => {
    header.addEventListener("click", function () {
      const card   = this.closest(".region-card");
      if (!card) return;
      const isOpen = card.classList.contains("open");
      document.querySelectorAll(".region-card").forEach(c => c.classList.remove("open"));
      if (!isOpen) card.classList.add("open");
    });
  });

  let selectedAreaName   = null;
  let selectedRegionName = null;
  let selectedAreaValue  = null;

  const regionErrorMsg = document.getElementById("regionErrorMsg");

  function hideRegionError() {
    regionErrorMsg?.classList.remove("visible");
  }

  function showRegionError() {
    if (!regionErrorMsg) return;
    regionErrorMsg.textContent = translate("regionSelectError");
    regionErrorMsg.classList.add("visible");
  }

  (function restorePreviousSelection() {
    const savedValue = gmGetSelectedArea();
    if (!savedValue) return;

    const matchingTag = document.querySelector(`.region-tag[data-area="${CSS.escape(savedValue)}"]`);
    if (matchingTag) {
      matchingTag.classList.add("selected");
      const areaKey   = matchingTag.getAttribute("data-i18n") || "";
      const regionKey = matchingTag.dataset.regionName || "";
      selectedAreaName   = translate(areaKey)   || areaKey;
      selectedRegionName = translate(regionKey) || regionKey;
      selectedAreaValue  = savedValue;

      const display = document.getElementById("selectedRegionDisplay");
      const value   = document.getElementById("selectedRegionValue");
      if (value)   value.textContent = `${selectedAreaName} — ${selectedRegionName}`;
      if (display) display.classList.add("visible");

      const parentCard = matchingTag.closest(".region-card");
      parentCard?.classList.add("open");
    }
  })();

  document.querySelectorAll(".region-tag").forEach(tag => {
    tag.addEventListener("click", function (e) {
      e.stopPropagation();

      document.querySelectorAll(".region-tag").forEach(t => t.classList.remove("selected"));
      this.classList.add("selected");

      const areaKey   = this.getAttribute("data-i18n") || "";
      const regionKey = this.dataset.regionName || "";
      const areaValue = this.dataset.area || areaKey;

      selectedAreaName   = translate(areaKey)   || areaKey;
      selectedRegionName = translate(regionKey) || regionKey;
      selectedAreaValue  = areaValue;

      const display = document.getElementById("selectedRegionDisplay");
      const value   = document.getElementById("selectedRegionValue");

      if (value)   value.textContent = `${selectedAreaName} — ${selectedRegionName}`;
      if (display) display.classList.add("visible");

      hideRegionError();
    });
  });

  const startBtn = document.getElementById("startBtn");
  if (!startBtn) return;

  startBtn.addEventListener("click", function (e) {
    e.preventDefault();

    if (!selectedAreaValue) {
      this.classList.remove("shake");
      void this.offsetWidth;
      this.classList.add("shake");
      this.addEventListener("animationend", () => this.classList.remove("shake"), { once: true });

      showRegionError();
      return;
    }

    hideRegionError();

    gmSaveSelectedArea(selectedAreaValue, selectedAreaName, selectedRegionName);
    gmSyncUserRegion(selectedAreaValue);

    const target = this.getAttribute("href") || "home.html";
    window.location.href = `${target}?area=${encodeURIComponent(selectedAreaValue)}`;
  });
})();

document.addEventListener("DOMContentLoaded", () => {

  const applyListingSuccessTranslations = () => {
    document.querySelectorAll("#listingSuccessModal [data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = translate(key);
    });
  };
  applyListingSuccessTranslations();
  document.addEventListener("languageChanged", applyListingSuccessTranslations);

  document.getElementById("additionModal")?.addEventListener("shown.bs.modal", () => {
    document.querySelectorAll(".addition-option, .addition-note").forEach((el, i) => {
      el.style.opacity    = "0";
      el.style.transform  = "translateY(12px)";
      el.style.transition = `opacity 0.25s ease ${i * 0.07}s, transform 0.25s ease ${i * 0.07}s`;
      setTimeout(() => {
        el.style.opacity   = "1";
        el.style.transform = "translateY(0)";
      }, 10);
    });
  });

  (function initAuth() {
    const overlay = document.getElementById("authOverlay");
    if (!overlay) return;

    const closeBtn     = document.getElementById("authClose");
    const tabs         = document.querySelectorAll(".auth-tab");
    const authTitle    = document.getElementById("authTitle");
    const authSub      = document.getElementById("authSub");
    const authDots     = document.getElementById("authDots");
    const panelPhone   = document.getElementById("panelPhone");
    const panelOtp     = document.getElementById("panelOtp");
    const panelSuccess = document.getElementById("panelSuccess");
    const phoneInput   = document.getElementById("phoneInput");
    const phoneErr     = document.getElementById("phoneErr");
    const nameInput    = document.getElementById("nameInput");
    const nameField    = document.getElementById("nameField");
    const nameErr      = document.getElementById("nameErr");
    const sendCodeBtn  = document.getElementById("sendCodeBtn");
    const phoneRow     = phoneInput?.closest(".auth-phone-row");
    const otpBoxes     = document.querySelectorAll(".auth-otp-box");
    const otpErr       = document.getElementById("otpErr");
    const verifyBtn    = document.getElementById("verifyBtn");
    const phoneMask    = document.getElementById("phoneMask");
    const resendText   = document.getElementById("resendText");
    const resendBtn    = document.getElementById("resendBtn");
    const otpBackBtn   = document.getElementById("otpBackBtn");
    const successTitle = document.getElementById("successTitle");
    const successDesc  = document.getElementById("successDesc");
    const successClose = document.getElementById("successCloseBtn");

    let mode        = "login";
    let phone       = "";
    let resendTimer = null;
    const DEMO_OTP  = "123456";

    const showErr  = el => el?.classList.add("show");
    const clearErr = el => el?.classList.remove("show");

    function setLoading(btn, loading) {
      if (!btn) return;
      btn.classList.toggle("loading", !!loading);
      btn.disabled = !!loading;
    }

    function isValidPhone(p) {
      return (
        /^(059|056|057|058|055|054|053|052|0[5-9])\d{7}$/.test(p) ||
        /^\d{9,11}$/.test(p)
      );
    }

    function maskPhone(p) {
      if (!p || p.length < 7) return p || "";
      return p.slice(0, 3) + " *** " + p.slice(-3);
    }

    function showOtpError(msg) {
      if (!otpErr) return;
      otpErr.textContent = "";
      const svgNS = "http://www.w3.org/2000/svg";
      const errIcon = document.createElementNS(svgNS, "svg");
      errIcon.setAttribute("width", "16");
      errIcon.setAttribute("height", "16");
      errIcon.setAttribute("aria-hidden", "true");
      errIcon.setAttribute("focusable", "false");
      const errUse = document.createElementNS(svgNS, "use");
      errUse.setAttribute("href", "#gm-i-circle-alert");
      errIcon.appendChild(errUse);
      otpErr.appendChild(errIcon);
      otpErr.appendChild(document.createTextNode(" " + (msg || "")));
      otpErr.classList.add("show");
    }

    function openModal() {
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      setTimeout(() => phoneInput?.focus(), 380);
    }

    function closeModal() {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      setTimeout(resetModal, 320);
    }

    function resetModal() {
      if (phoneInput) phoneInput.value = "";
      if (nameInput)  nameInput.value  = "";
      clearErr(phoneErr);
      clearErr(nameErr);
      clearErr(otpErr);
      otpBoxes.forEach(b => { if (b) { b.value = ""; b.classList.remove("filled", "invalid"); } });
      if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
      setMode(mode);
    }

    function setMode(newMode) {
      mode = newMode || "login";
      tabs.forEach(tb => tb?.classList.toggle("active", tb.dataset.tab === mode));

      if (mode === "register") {
        if (authTitle) authTitle.textContent = translate("authTitleRegister");
        if (authSub)   authSub.textContent   = translate("authSubRegister");
        if (nameField) nameField.style.display = "flex";
      } else {
        if (authTitle) authTitle.textContent = translate("authTitleLogin");
        if (authSub)   authSub.textContent   = translate("authSubLogin");
        if (nameField) nameField.style.display = "none";
      }

      [panelPhone, panelOtp, panelSuccess].forEach(p => p?.classList.add("auth-panel--hidden"));
      if (panelPhone) {
        panelPhone.classList.remove("auth-panel--hidden");
        panelPhone.style.animation = "none";
        void panelPhone.offsetWidth;
        panelPhone.style.animation = "";
      }
      updateDots("phone");
    }

    function showPanel(name) {
      [panelPhone, panelOtp, panelSuccess].forEach(p => p?.classList.add("auth-panel--hidden"));

      const panels = { phone: panelPhone, otp: panelOtp, success: panelSuccess };
      const target = panels[name];
      if (!target) return;

      target.classList.remove("auth-panel--hidden");
      target.style.animation = "none";
      void target.offsetWidth;
      target.style.animation = "";
      updateDots(name);

      const titles = {
        otp:     { title: translate("authOtpTitle"), sub: translate("authOtpSub") },
        phone:   mode === "register"
          ? { title: translate("authTitleRegister"), sub: translate("authSubRegister") }
          : { title: translate("authTitleLogin"),    sub: translate("authSubLogin") },
        success: mode === "register"
          ? { title: translate("authSuccessRegisterTitle"), sub: "" }
          : { title: translate("authSuccessLoginTitle"),    sub: "" },
      };
      if (authTitle) authTitle.textContent = titles[name]?.title || "";
      if (authSub)   authSub.textContent   = titles[name]?.sub   || "";
    }

    function updateDots(panel) {
      if (!authDots) return;
      const dots = authDots.querySelectorAll(".auth-dot");
      dots.forEach(d => { d.classList.remove("auth-dot--active"); d.style.width = ""; });
      const idx = { phone: 0, otp: 1, success: 1 }[panel] ?? 0;
      if (dots[idx]) { dots[idx].classList.add("auth-dot--active"); dots[idx].style.width = "22px"; }
    }

    function setPhoneErrKey(key) {
      const span = phoneErr?.querySelector("[data-i18n]");
      if (!span) return;
      span.setAttribute("data-i18n", key);
      span.textContent = translate(key);
    }

    function handleSendCode() {
      clearErr(phoneErr);
      clearErr(nameErr);
      setPhoneErrKey("authErrPhone");
      if (!window.GM_ENV.isMockAllowed()) {
        setPhoneErrKey("authErrUnavailable");
        showErr(phoneErr);
        return;
      }
      const rawPhone = phoneInput?.value?.replace(/\s/g, "") || "";
      let valid = true;

      if (!isValidPhone(rawPhone)) {
        showErr(phoneErr);
        phoneRow?.classList.add("invalid");
        phoneRow?.addEventListener("animationend", () => phoneRow?.classList.remove("invalid"), { once: true });
        phoneInput?.focus();
        valid = false;
      }

      if (mode === "register" && nameInput) {
        const nameValue = nameInput.value?.trim() || "";
        if (nameValue.length < 2) {
          showErr(nameErr);
          nameInput.classList.add("invalid");
          nameInput.addEventListener("animationend", () => nameInput.classList.remove("invalid"), { once: true });
          if (valid) nameInput.focus();
          valid = false;
        }
      }

      if (!valid) return;

      phone = rawPhone;
      setLoading(sendCodeBtn, true);
      setTimeout(() => {
        setLoading(sendCodeBtn, false);
        if (phoneMask) phoneMask.textContent = maskPhone(phone);
        showPanel("otp");
        startResendTimer();
        setTimeout(() => otpBoxes[0]?.focus(), 100);
      }, 1400);
    }

    if (sendCodeBtn) sendCodeBtn.addEventListener("click", handleSendCode);

    if (phoneInput) {
      phoneInput.addEventListener("keydown", e => { if (e.key === "Enter") handleSendCode(); });
      phoneInput.addEventListener("input",   () => { clearErr(phoneErr); phoneRow?.classList.remove("invalid"); });
    }

    if (nameInput) {
      nameInput.addEventListener("input", () => { clearErr(nameErr); nameInput.classList.remove("invalid"); });
    }

    otpBoxes.forEach((box, i) => {
      if (!box) return;

      box.addEventListener("input", e => {
        const val = e.target.value.replace(/\D/g, "");
        box.value = val ? val[0] : "";
        if (val) {
          box.classList.add("filled", "pop");
          box.addEventListener("animationend", () => box.classList.remove("pop"), { once: true });
          if (i < otpBoxes.length - 1) otpBoxes[i + 1]?.focus();
          else verifyBtn?.focus();
        } else {
          box.classList.remove("filled");
        }
        clearErr(otpErr);
      });

      box.addEventListener("keydown", e => {
        if (e.key === "Backspace" && !box.value && i > 0) {
          const prev = otpBoxes[i - 1];
          prev?.focus();
          if (prev) { prev.value = ""; prev.classList.remove("filled"); }
        }
        if (e.key === "Enter") handleVerify();
      });

      box.addEventListener("paste", e => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)
          ?.getData("text")?.replace(/\D/g, "") || "";
        if (!pasted) return;
        otpBoxes.forEach((b, j) => {
          if (b && pasted[j]) { b.value = pasted[j]; b.classList.add("filled"); }
        });
        const nextEmpty = [...otpBoxes].findIndex(b => !b?.value);
        if (nextEmpty !== -1) otpBoxes[nextEmpty]?.focus();
        else verifyBtn?.focus();
      });
    });

    function handleVerify() {
      clearErr(otpErr);
      const entered = [...otpBoxes].map(b => b?.value || "").join("");
      if (!window.GM_ENV.isMockAllowed()) { showOtpError(translate("authErrUnavailable")); return; }
      if (entered.length < 6) { showOtpError(translate("authErrOtpIncomplete")); return; }

      setLoading(verifyBtn, true);
      setTimeout(() => {
        setLoading(verifyBtn, false);
        if (entered === DEMO_OTP) {
          if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
          if (successTitle) successTitle.textContent = mode === "register"
            ? translate("authSuccessRegisterTitle")
            : translate("authSuccessLoginTitle");
          if (successDesc) successDesc.textContent = mode === "register"
            ? translate("authSuccessRegisterSub")
            : translate("authSuccessLoginSub");

          try {
            const existingUser     = JSON.parse(localStorage.getItem(window.GM_STORAGE_KEYS.user) || "null");
            const rawRegion        = gmGetSelectedArea();
            const normalizedRegion = gmNormalizeRegionKey(rawRegion);

            localStorage.setItem(
              window.GM_STORAGE_KEYS.user,
              JSON.stringify({
                ...existingUser,
                name:   nameInput?.value?.trim() || phone,
                phone:  phone,
                region: normalizedRegion || existingUser?.region || "",
                createdAt: existingUser?.createdAt || new Date().toISOString(),
              })
            );
            window.AuthUI?.refresh();

            document.dispatchEvent(new CustomEvent("gmUserLoggedIn", {
              detail: { phone, mode },
            }));
          } catch (err) {
            console.warn("Failed to persist user / refresh navbar:", err);
          }

          showPanel("success");
        } else {
          showOtpError(translate("authErrOtpWrong"));
          otpBoxes.forEach(b => {
            if (b) {
              b.classList.add("invalid");
              b.addEventListener("animationend", () => b.classList.remove("invalid"), { once: true });
            }
          });
          otpBoxes[0]?.focus();
        }
      }, 1200);
    }

    if (verifyBtn) verifyBtn.addEventListener("click", handleVerify);

    function startResendTimer() {
      let seconds   = 60;
      const timerEl = document.getElementById("resendTimer");

      if (resendText) resendText.style.display = "block";
      if (resendBtn)  resendBtn.style.display  = "none";
      if (timerEl)    timerEl.textContent      = seconds;

      if (resendTimer) clearInterval(resendTimer);

      resendTimer = setInterval(() => {
        seconds--;
        if (timerEl) timerEl.textContent = seconds;
        if (seconds <= 0) {
          clearInterval(resendTimer);
          resendTimer = null;
          if (resendText) resendText.style.display = "none";
          if (resendBtn) {
            resendBtn.removeAttribute("disabled");
            resendBtn.style.display = "flex";
          }
        }
      }, 1000);
    }

    if (resendBtn) {
      resendBtn.addEventListener("click", () => {
        resendBtn.style.display = "none";
        setLoading(sendCodeBtn, true);
        setTimeout(() => {
          setLoading(sendCodeBtn, false);
          startResendTimer();
          otpBoxes.forEach(b => { if (b) { b.value = ""; b.classList.remove("filled"); } });
          clearErr(otpErr);
          otpBoxes[0]?.focus();
        }, 1000);
      });
    }

    if (otpBackBtn) {
      otpBackBtn.addEventListener("click", () => {
        if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
        clearErr(otpErr);
        otpBoxes.forEach(b => { if (b) { b.value = ""; b.classList.remove("filled"); } });
        showPanel("phone");
        setTimeout(() => phoneInput?.focus(), 100);
      });
    }

    document.addEventListener("click", (e) => {
      const loginTrigger = e.target.closest("#loginBtn");
      if (loginTrigger) {
        setMode("login");
        openModal();
      }
    });

    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });

    tabs.forEach(tab => { if (tab) tab.addEventListener("click", () => setMode(tab.dataset.tab)); });

    if (successClose) successClose.addEventListener("click", closeModal);

    setMode("login");
  })();

  (function initLoader() {
    const bar      = document.getElementById("gmLoaderBar");
    const pct      = document.getElementById("gmLoaderPct");
    const statusEl = document.getElementById("gmLoaderText");
    const loader   = document.getElementById("gmLoader");
    const app      = document.getElementById("gmApp");

    if (!loader) return;

    const steps = [
      [15, "Loading stores"],
      [40, "Loading price list"],
      [65, "Syncing latest updates"],
      [88, "Preparing interface"],
      [100, "Successfully loaded"],
    ];

    let i = 0;
    function step() {
      if (i >= steps.length) {
        setTimeout(() => {
          loader.classList.add("gm-leave");
          if (app) app.style.display = "flex";
          setTimeout(() => loader.remove(), 200);
        }, 300);
        return;
      }
      const [value, text] = steps[i];
      if (bar)      bar.style.width      = value + "%";
      if (pct)      pct.textContent      = value + "%";
      if (statusEl) statusEl.textContent = text;
      i++;
      setTimeout(step, 420 + Math.random() * 260);
    }
    step();
  })();

});


(function () {

  const MAX_IMAGE_MB = 5;
  const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_LISTING_IMAGES = 3;

  function t(key, fallback) {
    try {
      if (typeof translate === "function") {
        const result = translate(key);
        if (result && result !== key) return result;
      }
    } catch (e) { }
    return fallback;
  }

  function getModal(id) {
    const el = document.getElementById(id);
    if (!el || typeof bootstrap === "undefined") return null;
    return bootstrap.Modal.getOrCreateInstance(el);
  }

  function showModal(id, delay = 0) {
    setTimeout(() => getModal(id)?.show(), delay);
  }

  function hideModal(id) {
    const el = document.getElementById(id);
    if (el && typeof bootstrap !== "undefined") {
      try { bootstrap.Modal.getInstance(el)?.hide(); }
      catch (err) { console.warn(`Modal hide error (${id}):`, err); }
    }
  }

  function switchModal(fromId, toId, delay = 280) {
    hideModal(fromId);
    document.activeElement?.blur();
    showModal(toId, delay);
  }

  function setBtnLoading(btn, loading) {
    if (!btn) return;
    btn.classList.toggle("loading", !!loading);
    btn.disabled = !!loading;
  }

  function showFieldError(errEl, inputEl) {
    errEl?.classList.add("show");
    inputEl?.classList.add("gm-invalid-input", "npw-invalid");
  }

  function clearFieldError(errEl, inputEl) {
    errEl?.classList.remove("show");
    inputEl?.classList.remove("gm-invalid-input", "npw-invalid");
  }

  function focusFirstInvalid(container, el) {
    if (!el) return;
    container?.scrollTo?.({
      top: Math.max(el.offsetTop - 90, 0),
      behavior: "smooth",
    });
    el.closest(".gm-form-card")?.classList.add("gm-invalid");
    setTimeout(() => el.focus?.({ preventScroll: true }), 250);
  }

  function truncateForReview(str, max = 60) {
    const s = (str || "").trim();
    if (!s) return "—";
    return s.length > max ? s.slice(0, max).trim() + "…" : s;
  }

  function normalizeDigits(str) {
    if (str === null || str === undefined) return "";
    const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
    const persian     = "۰۱۲۳۴۵۶۷۸۹";
    return String(str)
      .replace(/[٠-٩]/g, (d) => String(arabicIndic.indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
      .replace(/[٫،]/g, ".")
      .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
      .trim();
  }

  function setSelectValueSafe(selectEl, rawValue, labelHint) {
    if (!selectEl) return false;
    const wanted = (rawValue ?? "").toString().trim();
    if (!wanted) return false;

    const options = [...selectEl.options];

    let match = options.find((o) => o.value === wanted);

    if (!match) {
      match = options.find(
        (o) => o.value.trim().toLowerCase() === wanted.toLowerCase()
      );
    }

    if (!match) {
      const wantedText = (labelHint || wanted).toString().trim().toLowerCase();
      match = options.find(
        (o) => o.textContent.trim().toLowerCase() === wantedText
      );
    }

    if (!match) {
      match = document.createElement("option");
      match.value = wanted;
      match.textContent = labelHint || wanted;
      selectEl.appendChild(match);
    }

    selectEl.value = match.value;
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    return selectEl.value === match.value;
  }

  function initCustomSelects(root) {
    const wrappers = root.querySelectorAll("[data-gm-custom-select]");

    wrappers.forEach((wrap) => {
      const trigger = wrap.querySelector("[data-select-trigger]");
      const triggerText = wrap.querySelector("[data-select-trigger-text]");
      const panel = wrap.querySelector("[data-select-panel]");
      const errEl = wrap.querySelector("[data-select-err]");
      const hiddenSelect = document.getElementById(wrap.dataset.hiddenSelect || "");
      if (!trigger || !panel || !hiddenSelect) return;

      function close() {
        panel.classList.remove("open");
        trigger.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
      function open() {
        panel.classList.add("open");
        trigger.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
      }

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.classList.contains("open") ? close() : open();
      });

      panel.addEventListener("click", (e) => {
        const opt = e.target.closest(".npw-custom-select-option");
        if (!opt) return;

        const value = opt.dataset.value;
        const label = opt.textContent.trim();

        setSelectValueSafe(hiddenSelect, value, label);

        if (triggerText) {
          triggerText.textContent = label;
          triggerText.classList.remove("placeholder");
        }
        panel.querySelectorAll(".npw-custom-select-option").forEach((o) => {
          o.classList.toggle("selected", o === opt);
        });

        clearFieldError(errEl, trigger);
        close();
      });

      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) close();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
    });

    applySavedRegion(root);
  }

  function applySavedRegion(root) {
    let saved = "";
    try { saved = typeof gmGetSelectedArea === "function" ? gmGetSelectedArea() : ""; }
    catch (err) { saved = ""; }
    if (!saved) return;

    const wraps = root.matches?.("[data-gm-custom-select]")
      ? [root]
      : [...root.querySelectorAll("[data-gm-custom-select]")];

    wraps.forEach((wrap) => {
      const panel = wrap.querySelector("[data-select-panel]");
      const match = panel?.querySelector(`.npw-custom-select-option[data-value="${CSS.escape(saved)}"]`);
      match?.click();
    });
  }

  function initSingleImageUpload(areaId, inputId) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    if (!area || !input) return null;

    const filenameEl = area.querySelector("[data-upload-filename]");
    const defaultText = filenameEl?.textContent || "";
    const originalIconNode = area.querySelector("[data-upload-icon]")?.cloneNode(true) || null;
    const checkTemplate = document.getElementById("gmSingleImagePreviewTemplate");

    function reset() {
      input.value = "";
      if (filenameEl) filenameEl.textContent = defaultText;
      area.classList.remove("gm-has-image");
      const currentIcon = area.querySelector("[data-upload-icon]");
      if (currentIcon && originalIconNode) {
        currentIcon.replaceWith(originalIconNode.cloneNode(true));
      }
    }

    function showCheckIcon() {
      const currentIcon = area.querySelector("[data-upload-icon]");
      const clone = checkTemplate?.content?.firstElementChild?.cloneNode(true);
      if (currentIcon && clone) currentIcon.replaceWith(clone);
    }

    area.addEventListener("click", () => input.click());
    area.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
    });

    input.addEventListener("change", function () {
      const file = this.files?.[0];
      if (!file) return;

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        alert(t("addPrice.errImageType", "صيغة الصورة غير مدعومة. الرجاء اختيار JPG أو PNG أو WEBP"));
        reset();
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        alert(t("addPrice.errImageSize", `حجم الصورة أكبر من ${MAX_IMAGE_MB}MB`));
        reset();
        return;
      }

      if (filenameEl) filenameEl.textContent = file.name;
      area.classList.add("gm-has-image");
      showCheckIcon();
    });

    return { reset };
  }

  function initMultiImageUpload({ gridId, inputId, addTileId, countId, errId, hintId }) {
    const grid = document.getElementById(gridId);
    const input = document.getElementById(inputId);
    const addTile = document.getElementById(addTileId);
    const countEl = document.getElementById(countId);
    const errEl = document.getElementById(errId);
    if (!grid || !input || !addTile) return null;

    const tileTemplate = document.getElementById("gmImageTileTemplate");
    let items = [];

    function updateCount() {
      if (countEl) countEl.textContent = `${items.length}/${MAX_LISTING_IMAGES}`;
      addTile.disabled = items.length >= MAX_LISTING_IMAGES;
    }

    function clearError() {
      if (errEl) { errEl.textContent = ""; errEl.classList.remove("show"); }
    }

    function showError(msg) {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.classList.add("show");
    }

    function addFiles(fileList) {
      const incoming = Array.from(fileList || []);
      if (!incoming.length) return;

      const remainingSlots = MAX_LISTING_IMAGES - items.length;
      if (remainingSlots <= 0) {
        showError(t("addListing.errMax", `الحد الأقصى ${MAX_LISTING_IMAGES} صور`));
        return;
      }

      let rejected = false;
      const toAdd = incoming.slice(0, remainingSlots);
      if (incoming.length > toAdd.length) rejected = true;

      const fragment = document.createDocumentFragment();

      toAdd.forEach((file) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          showError(t("addListing.errImageType", "صيغة غير مدعومة. استخدم JPG أو PNG أو WEBP"));
          rejected = true;
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          showError(t("addListing.errImageSize", `حجم الصورة أكبر من ${MAX_IMAGE_MB}MB`));
          rejected = true;
          return;
        }

        const tileNode = tileTemplate.content.firstElementChild.cloneNode(true);
        const url = URL.createObjectURL(file);
        tileNode.querySelector(".gm-image-tile-img").src = url;
        fragment.appendChild(tileNode);
        items.push({ file, url, tile: tileNode });
      });

      grid.insertBefore(fragment, addTile);
      if (!rejected) clearError();
      updateCount();
    }

    function removeItem(tileEl) {
      const idx = items.findIndex((it) => it.tile === tileEl);
      if (idx === -1) return;
      URL.revokeObjectURL(items[idx].url);
      items.splice(idx, 1);
      tileEl.remove();
      clearError();
      updateCount();
    }

    addTile.addEventListener("click", () => input.click());

    input.addEventListener("change", function () {
      addFiles(this.files);
      this.value = "";
    });

    grid.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".gm-image-delete-btn");
      if (!delBtn) return;
      removeItem(delBtn.closest(".gm-image-tile"));
    });

    ["dragover", "dragenter"].forEach((evt) => {
      addTile.addEventListener(evt, (e) => {
        e.preventDefault();
        addTile.classList.add("gm-drag-over");
      });
    });
    ["dragleave", "dragend"].forEach((evt) => {
      addTile.addEventListener(evt, () => addTile.classList.remove("gm-drag-over"));
    });
    addTile.addEventListener("drop", (e) => {
      e.preventDefault();
      addTile.classList.remove("gm-drag-over");
      addFiles(e.dataTransfer?.files);
    });

    function reset() {
      items.forEach((it) => URL.revokeObjectURL(it.url));
      items = [];
      grid.querySelectorAll(".gm-image-tile--filled").forEach((n) => n.remove());
      clearError();
      updateCount();
    }

    function getFiles() {
      return items.map((it) => it.file);
    }

    updateCount();
    return { reset, getFiles, get count() { return items.length; } };
  }

 function initStepWizard(modalEl, { validateStep, onSubmit, onStepChange, onFirstStepBack } = {}) {
    const body = modalEl.querySelector("[data-step-body]");
    const steps = [...modalEl.querySelectorAll(".gm-form-card[data-step]")]
      .sort((a, b) => Number(a.dataset.step) - Number(b.dataset.step));
    const fill = modalEl.querySelector("[data-progress-fill]");
    const dots = [...modalEl.querySelectorAll("[data-progress-dots] .npw-dot")];
    const stepCountEl = modalEl.querySelector("[data-step-count]");
    const backBtn = modalEl.querySelector("[data-step-back]");
    const nextBtn = modalEl.querySelector("[data-step-next]");
    const nextLabel = nextBtn?.querySelector(".gm-btn-label") || nextBtn?.querySelector("span:not(.gm-btn-spinner)");
    const total = steps.length;
    let current = 1;

    function render() {
      steps.forEach((s) => s.classList.toggle("gm-step-active", Number(s.dataset.step) === current));

      const pct = total > 1 ? ((current - 1) / (total - 1)) * 100 : 100;
      if (fill) fill.style.width = pct + "%";
      if (stepCountEl) stepCountEl.textContent = `${current} / ${total}`;

      dots.forEach((d) => {
        const n = Number(d.dataset.step);
        d.classList.toggle("active", n === current);
        d.classList.toggle("done", n < current);
      });

      if (backBtn) backBtn.disabled = false;

      if (nextBtn && nextLabel) {
        const isLast = current === total;
        const i18nKey = isLast ? nextBtn.dataset.i18nLabelSubmit : nextBtn.dataset.i18nLabelNext;
        const fallback = isLast
          ? (nextBtn.dataset.labelSubmit || nextLabel.textContent)
          : (nextBtn.dataset.labelNext || nextLabel.textContent);

        nextLabel.textContent = i18nKey ? t(i18nKey, fallback) : fallback;
        if (i18nKey) nextLabel.setAttribute("data-i18n", i18nKey);
      }

      body?.scrollTo?.({ top: 0, behavior: "smooth" });

      if (typeof onStepChange === "function") onStepChange(current, total);
    }

    function goTo(step) {
      current = Math.min(Math.max(step, 1), total);
      render();
    }

    backBtn?.addEventListener("click", () => {
      if (current > 1) {
        goTo(current - 1);
        return;
      }
      if (typeof onFirstStepBack === "function") {
        onFirstStepBack();
      }
    });

    nextBtn?.addEventListener("click", () => {
      const stepEl = steps.find((s) => Number(s.dataset.step) === current);
      const result = validateStep ? validateStep(current, stepEl) : { valid: true };

      if (!result?.valid) {
        if (result?.focusEl) focusFirstInvalid(body, result.focusEl);
        return;
      }

      if (current === total) {
        onSubmit?.(nextBtn);
      } else {
        goTo(current + 1);
      }
    });

    function reset() {
      current = 1;
      render();
    }

    reset();
    return { reset, goTo, get current() { return current; }, get total() { return total; } };
  }

  function initAdditionRouter() {
    const additionModal = document.getElementById("additionModal");
    if (!additionModal) return;

    additionModal.addEventListener("click", (e) => {
      const option = e.target.closest(".addition-option");
      if (!option) return;

      const action = option.dataset.action;
      const routes = {
        "add-price": "addPriceModal",
        "add-listing": "addListingModal",
        "add-new-product": "addNewProductModal",
      };

      if (action === "add-store") {
        hideModal("additionModal");
        window.location.href = option.dataset.link || "add-store.html";
        return;
      }
      if (routes[action]) {
        switchModal("additionModal", routes[action]);
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("openAddition") === "1") showModal("additionModal", 200);
  }

  function initAddPriceModal() {
    const modalEl = document.getElementById("addPriceModal");
    if (!modalEl) return;

    const productInput = document.getElementById("productSearch");
    const productErr = document.getElementById("productSearchErr");
    const priceInput = document.getElementById("priceInput");
    const priceErr = document.getElementById("priceInputErr");
    const storeNameInput = document.getElementById("storeName");
    const storeAddressInput = document.getElementById("storeAddress");
    const storePhoneInput = document.getElementById("storePhone");

    const regionSelect = document.getElementById("regionSelect");
    const regionGrid = document.getElementById("addPriceRegionGrid");
    const regionErr = document.getElementById("addPriceRegionErr");

    const quickPriceRow = document.getElementById("quickPriceRow");

    const receiptUpload = initSingleImageUpload("uploadArea", "receiptImage");

    function setRegionSelection(btn) {
      regionGrid?.querySelectorAll(".npw-region-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });

      if (btn) {
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        setSelectValueSafe(regionSelect, btn.dataset.value, btn.textContent);
        clearFieldError(regionErr, regionGrid);
      } else if (regionSelect) {
        regionSelect.selectedIndex = 0;
      }
    }

    function prefillSavedRegion() {
      let saved = "";
      try { saved = typeof gmGetSelectedArea === "function" ? gmGetSelectedArea() : ""; }
      catch (err) { saved = ""; }
      if (!saved) return;
      const match = regionGrid?.querySelector(`.npw-region-btn[data-value="${CSS.escape(saved)}"]`);
      if (match) setRegionSelection(match);
    }

    regionGrid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".npw-region-btn");
      if (!btn) return;
      setRegionSelection(btn);
    });

    prefillSavedRegion();

    function setQuickPriceActive(value) {
      quickPriceRow?.querySelectorAll(".npw-quick-price-btn").forEach((b) => {
        b.classList.toggle("active", String(b.dataset.price) === String(value));
      });
    }

    quickPriceRow?.addEventListener("click", (e) => {
      const btn = e.target.closest(".npw-quick-price-btn");
      if (!btn) return;
      if (priceInput) priceInput.value = btn.dataset.price;
      setQuickPriceActive(btn.dataset.price);
      clearFieldError(priceErr, priceInput);
    });

    priceInput?.addEventListener("input", () => {
      setQuickPriceActive(priceInput.value);
      clearFieldError(priceErr, priceInput);
    });

    function validateStep(step) {
      if (step === 1) {
        const productOk = !!productInput?.value?.trim();
        productOk ? clearFieldError(productErr, productInput) : showFieldError(productErr, productInput);
        if (!productOk) return { valid: false, focusEl: productInput };
        return { valid: true };
      }
      if (step === 2) {
        const regionOk = !!regionSelect?.value;
        regionOk ? clearFieldError(regionErr, regionGrid) : showFieldError(regionErr, regionGrid);
        if (!regionOk) return { valid: false, focusEl: regionGrid };
        return { valid: true };
      }
      if (step === 3) {
        const priceOk = !!priceInput?.value;
        priceOk ? clearFieldError(priceErr, priceInput) : showFieldError(priceErr, priceInput);
        if (!priceOk) return { valid: false, focusEl: priceInput };
        return { valid: true };
      }
      return { valid: true };
    }

    function populateReview(step, total) {
      if (step !== total) return;
      const list = document.getElementById("addPriceReviewList");
      if (!list) return;

      const storeBits = [
        storeNameInput?.value?.trim(),
        storeAddressInput?.value?.trim(),
      ].filter(Boolean).join(" — ");

      const values = {
        product: productInput?.value?.trim() || "—",
        region: regionSelect?.value || "—",
        price: priceInput?.value ? `₪${priceInput.value}` : "—",
        store: storeBits || "—",
        image: document.getElementById("receiptImage")?.files?.length ? "تم إرفاق صورة" : "لا يوجد",
      };

      Object.entries(values).forEach(([key, val]) => {
        const el = list.querySelector(`[data-review="${key}"]`);
        if (el) el.textContent = truncateForReview(val, 80);
      });
    }

    function submitForm(btn) {
      function proceedWithSubmit() {
        const payload = {
          product: productInput?.value?.trim() || "",
          price: priceInput?.value || "",
          region: regionSelect?.value || "",
          storeName: storeNameInput?.value?.trim() || "",
          storeAddress: storeAddressInput?.value?.trim() || "",
          storePhone: storePhoneInput?.value?.trim() || "",
          hasReceipt: !!document.getElementById("receiptImage")?.files?.length,
        };

        setBtnLoading(btn, true);
        setTimeout(() => {
          setBtnLoading(btn, false);
          console.log("New price payload:", payload);
          switchModal("addPriceModal", "priceSuccessModal");
        }, 700);
      }

      if (typeof window.gmRequireAuthThenRun === "function") {
        window.gmRequireAuthThenRun(proceedWithSubmit, "addPriceModal");
      } else {
        proceedWithSubmit();
      }
    }

    function goBackToAdditionMenu() {
      resetForm();
      switchModal("addPriceModal", "additionModal");
    }

    const wizard = initStepWizard(modalEl, {
      validateStep,
      onSubmit: submitForm,
      onStepChange: populateReview,
      onFirstStepBack: goBackToAdditionMenu,
    });

    function resetForm() {
      [productInput, priceInput, storeNameInput, storeAddressInput, storePhoneInput].forEach((el) => { if (el) el.value = ""; });
      setRegionSelection(null);
      setQuickPriceActive(null);
      receiptUpload?.reset();
      modalEl.querySelectorAll(".gm-invalid-input").forEach((el) => el.classList.remove("gm-invalid-input"));
      modalEl.querySelectorAll(".gm-form-card.gm-invalid").forEach((el) => el.classList.remove("gm-invalid"));
      clearFieldError(regionErr, regionGrid);
      clearFieldError(productErr, productInput);
      clearFieldError(priceErr, priceInput);
      wizard?.reset();
      prefillSavedRegion();
    }

    modalEl.addEventListener("show.bs.modal", () => {
      if (modalEl.dataset.gmSuppressReset === "1") {
        delete modalEl.dataset.gmSuppressReset;
        return;
      }
      resetForm();
    });

    document.getElementById("addSomethingElseBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchModal("priceSuccessModal", "additionModal");
    });
  }

  function initAddListingModal() {
    const modalEl = document.getElementById("addListingModal");
    if (!modalEl) return;

    const nameInput = document.getElementById("listingProductName");
    const categoryGrid = document.getElementById("listingCategoryGrid");
    const descriptionInput = document.getElementById("listingDescription");
    const priceInput = document.getElementById("listingPrice");
    const phoneInput = document.getElementById("listingPhone");
    const whatsappInput = document.getElementById("listingWhatsapp");
    const negotiableInput = document.getElementById("listingNegotiable");
    const conditionGroup = document.getElementById("listingConditionGroup");

    const nameErr = document.getElementById("listingProductNameErr");
    const categoryErr = document.getElementById("listingCategoryErr");
    const descriptionErr = document.getElementById("listingDescriptionErr");
    const phoneErr = document.getElementById("listingPhoneErr");

    const images = initMultiImageUpload({
      gridId: "listingImageGrid",
      inputId: "listingImages",
      addTileId: "listingImageAddTile",
      countId: "listingImageCount",
      errId: "listingImagesErr",
    });

    let selectedCategory = null;
    let selectedCategoryLabel = "";

    categoryGrid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".npw-region-btn");
      if (!btn) return;

      categoryGrid.querySelectorAll(".npw-region-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });

      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      selectedCategory = btn.dataset.value;
      selectedCategoryLabel = btn.textContent?.trim() || "";
      clearFieldError(categoryErr, categoryGrid);
    });

    function clearCategorySelection() {
      selectedCategory = null;
      selectedCategoryLabel = "";
      categoryGrid?.querySelectorAll(".npw-region-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
    }

    conditionGroup?.addEventListener("click", (e) => {
      const btn = e.target.closest(".condition-btn");
      if (!btn) return;
      conditionGroup.querySelectorAll(".condition-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
    });

    const conditionLabels = { new: "جديد", used: "مستعمل", urgent: "عاجل" };

    function validateStep(step) {
      if (step === 1) {
        const nameOk = !!nameInput?.value?.trim();
        nameOk ? clearFieldError(nameErr, nameInput) : showFieldError(nameErr, nameInput);
        if (!nameOk) return { valid: false, focusEl: nameInput };
        return { valid: true };
      }
      if (step === 2) {
        const categoryOk = !!selectedCategory;
        categoryOk ? clearFieldError(categoryErr, categoryGrid) : showFieldError(categoryErr, categoryGrid);
        if (!categoryOk) return { valid: false, focusEl: categoryGrid };
        return { valid: true };
      }
      if (step === 4) {
        const descOk = !!descriptionInput?.value?.trim();
        descOk ? clearFieldError(descriptionErr, descriptionInput) : showFieldError(descriptionErr, descriptionInput);
        if (!descOk) return { valid: false, focusEl: descriptionInput };
        return { valid: true };
      }
      if (step === 7) {
        const phoneOk = !!phoneInput?.value?.trim();
        phoneOk ? clearFieldError(phoneErr, phoneInput) : showFieldError(phoneErr, phoneInput);
        if (!phoneOk) return { valid: false, focusEl: phoneInput };
        return { valid: true };
      }
      return { valid: true };
    }

    function populateReview(step, total) {
      if (step !== total) return;
      const list = document.getElementById("addListingReviewList");
      if (!list) return;

      const conditionValue = conditionGroup?.querySelector(".condition-btn.active")?.dataset.value || "new";
      const typeText = [
        selectedCategoryLabel,
        conditionLabels[conditionValue],
      ].filter(Boolean).join(" — ");

      const values = {
        title: nameInput?.value?.trim() || "—",
        type: typeText || "—",
        price: priceInput?.value ? `₪${priceInput.value}${negotiableInput?.checked ? " (قابل للتفاوض)" : ""}` : "غير محدد",
        images: images?.count ? `${images.count} صورة` : "بدون صور",
        phone: phoneInput?.value?.trim() || "—",
        whatsapp: whatsappInput?.value?.trim() || "—",
      };

      Object.entries(values).forEach(([key, val]) => {
        const el = list.querySelector(`[data-review="${key}"]`);
        if (el) el.textContent = truncateForReview(val, 80);
      });
    }

    function submitForm(btn) {
      const payload = {
        title: nameInput?.value?.trim() || "",
        category: selectedCategory || "",
        condition: conditionGroup?.querySelector(".condition-btn.active")?.dataset.value || "new",
        description: descriptionInput?.value?.trim() || "",
        price: priceInput?.value || "",
        negotiable: !!negotiableInput?.checked,
        phone: phoneInput?.value?.trim() || "",
        whatsapp: whatsappInput?.value?.trim() || "",
        imageCount: images?.count || 0,
        images: images?.getFiles() || [],
      };

      setBtnLoading(btn, true);
      setTimeout(() => {
        setBtnLoading(btn, false);
        console.log("New listing payload:", payload);
        switchModal("addListingModal", "listingSuccessModal");
      }, 700);
    }

    function goBackToAdditionMenu() {
      resetForm();
      switchModal("addListingModal", "additionModal");
    }

    const wizard = initStepWizard(modalEl, {
      validateStep,
      onSubmit: submitForm,
      onStepChange: populateReview,
      onFirstStepBack: goBackToAdditionMenu,
    });

    function resetForm() {
      [nameInput, priceInput, phoneInput, whatsappInput].forEach((el) => { if (el) el.value = ""; });
      clearCategorySelection();
      if (descriptionInput) descriptionInput.value = "";
      if (negotiableInput) negotiableInput.checked = false;
      conditionGroup?.querySelectorAll(".condition-btn").forEach((b, i) => {
        b.classList.toggle("active", i === 0);
        b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      });
      images?.reset();
      [nameErr, categoryErr, descriptionErr, phoneErr].forEach((el) => el?.classList.remove("show"));
      modalEl.querySelectorAll(".gm-invalid-input").forEach((el) => el.classList.remove("gm-invalid-input"));
      modalEl.querySelectorAll(".gm-form-card.gm-invalid").forEach((el) => el.classList.remove("gm-invalid"));
      wizard?.reset();
    }

    modalEl.addEventListener("show.bs.modal", resetForm);

    document.getElementById("listingAddAnotherBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchModal("listingSuccessModal", "addListingModal");
    });
  }

  function initSuggestProductModal() {
    const modalEl = document.getElementById("addNewProductModal");
    if (!modalEl) return;

    const nameInput = document.getElementById("npwProductName");
    const nameErr = document.getElementById("npwProductNameErr");

    const categoryGrid = document.getElementById("npwCategoryGrid");
    const categoryErr = document.getElementById("npwCategoryErr");

    const quantityInput = document.getElementById("npwQuantity");
    const quantityErr = document.getElementById("npwQuantityErr");
    const unitSelect = document.getElementById("npwUnitSelect");
    const unitErr = document.getElementById("npwUnitErr");

    const priceInput = document.getElementById("npwPrice");
    const priceErr = document.getElementById("npwPriceErr");
    const quickPriceRow = document.getElementById("npwQuickPriceRow");

    const storeNameInput = document.getElementById("npwStoreName");
    const storeNameErr = document.getElementById("npwStoreNameErr");

    const regionSelect = document.getElementById("npwRegionSelect");
    const regionGrid = document.getElementById("npwRegionGrid");
    const regionErr = document.getElementById("npwRegionErr");

    const storeAddressInput = document.getElementById("npwStoreAddress");
    const storePhoneInput = document.getElementById("npwStorePhone");

    const productImageUpload = initSingleImageUpload("npwUploadArea", "npwProductImage");

    let selectedCategory = null;
    let selectedCategoryLabel = "";

    categoryGrid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".npw-category-btn");
      if (!btn) return;
      categoryGrid.querySelectorAll(".npw-category-btn").forEach((b) => b.classList.remove("active", "just-selected"));
      btn.classList.add("active", "just-selected");
      btn.addEventListener("animationend", () => btn.classList.remove("just-selected"), { once: true });
      selectedCategory = btn.dataset.value;
      selectedCategoryLabel = btn.textContent?.trim() || "";
      clearFieldError(categoryErr, categoryGrid);
    });

    if (quantityInput && quantityInput.type === "number") {
      quantityInput.setAttribute("inputmode", "decimal");
      quantityInput.type = "text";
    }

    quantityInput?.addEventListener("input", () => {
      const normalized = normalizeDigits(quantityInput.value);
      if (normalized !== quantityInput.value) {
        const caret = quantityInput.selectionStart;
        quantityInput.value = normalized;
        try { quantityInput.setSelectionRange(caret, caret); } catch (err) { }
      }
      clearFieldError(quantityErr, quantityInput);
    });

    unitSelect?.addEventListener("change", () => clearFieldError(unitErr, unitSelect));

    function unitLabel() {
      const opt = unitSelect?.options?.[unitSelect.selectedIndex];
      return opt?.value ? (opt.textContent?.trim() || "") : "";
    }

    function resyncUnitSelect() {
      if (!unitSelect || unitSelect.value) return;
      const wrapper =
        unitSelect.closest("[data-gm-custom-select]") ||
        document.querySelector(`[data-gm-custom-select][data-hidden-select="${unitSelect.id}"]`);
      const activeOption = wrapper?.querySelector(".npw-custom-select-option.selected");
      if (activeOption) {
        setSelectValueSafe(unitSelect, activeOption.dataset.value, activeOption.textContent);
      }
    }

    function setQuickPriceActive(value) {
      quickPriceRow?.querySelectorAll(".npw-quick-price-btn").forEach((b) => {
        b.classList.toggle("active", String(b.dataset.price) === String(value));
      });
    }

    quickPriceRow?.addEventListener("click", (e) => {
      const btn = e.target.closest(".npw-quick-price-btn");
      if (!btn) return;
      if (priceInput) priceInput.value = btn.dataset.price;
      setQuickPriceActive(btn.dataset.price);
      clearFieldError(priceErr, priceInput);
    });

    priceInput?.addEventListener("input", () => {
      setQuickPriceActive(priceInput.value);
      clearFieldError(priceErr, priceInput);
    });

    storeNameInput?.addEventListener("input", () => clearFieldError(storeNameErr, storeNameInput));

    function setRegionSelection(btn) {
      regionGrid?.querySelectorAll(".npw-region-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });

      if (btn) {
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        setSelectValueSafe(regionSelect, btn.dataset.value, btn.textContent);
        clearFieldError(regionErr, regionGrid);
      } else if (regionSelect) {
        regionSelect.selectedIndex = 0;
      }
    }

    function prefillSavedRegion() {
      let saved = "";
      try { saved = typeof gmGetSelectedArea === "function" ? gmGetSelectedArea() : ""; }
      catch (err) { saved = ""; }
      if (!saved) return;
      const match = regionGrid?.querySelector(`.npw-region-btn[data-value="${CSS.escape(saved)}"]`);
      if (match) setRegionSelection(match);
    }

    regionGrid?.addEventListener("click", (e) => {
      const btn = e.target.closest(".npw-region-btn");
      if (!btn) return;
      setRegionSelection(btn);
    });

    prefillSavedRegion();

    function validateStep(step) {
      if (step === 1) {
        const ok = !!nameInput?.value?.trim();
        ok ? clearFieldError(nameErr, nameInput) : showFieldError(nameErr, nameInput);
        if (!ok) return { valid: false, focusEl: nameInput };
        return { valid: true };
      }
      if (step === 2) {
        const ok = !!selectedCategory;
        ok ? clearFieldError(categoryErr, categoryGrid) : showFieldError(categoryErr, categoryGrid);
        if (!ok) return { valid: false, focusEl: categoryGrid };
        return { valid: true };
      }
      if (step === 3) {
        const qtyNormalized = normalizeDigits(quantityInput?.value);
        if (quantityInput && qtyNormalized !== quantityInput.value) {
          quantityInput.value = qtyNormalized;
        }
        const qtyOk = !!qtyNormalized && !Number.isNaN(parseFloat(qtyNormalized));
        qtyOk ? clearFieldError(quantityErr, quantityInput) : showFieldError(quantityErr, quantityInput);

        resyncUnitSelect();
        const unitOk = !!unitSelect?.value?.trim();
        unitOk ? clearFieldError(unitErr, unitSelect) : showFieldError(unitErr, unitSelect);

        if (!qtyOk) return { valid: false, focusEl: quantityInput };
        if (!unitOk) return { valid: false, focusEl: unitSelect };
        return { valid: true };
      }
      if (step === 4) {
        const ok = !!priceInput?.value;
        ok ? clearFieldError(priceErr, priceInput) : showFieldError(priceErr, priceInput);
        if (!ok) return { valid: false, focusEl: priceInput };
        return { valid: true };
      }
      if (step === 5) {
        const ok = !!storeNameInput?.value?.trim();
        ok ? clearFieldError(storeNameErr, storeNameInput) : showFieldError(storeNameErr, storeNameInput);
        if (!ok) return { valid: false, focusEl: storeNameInput };
        return { valid: true };
      }
      if (step === 6) {
        const ok = !!regionSelect?.value;
        ok ? clearFieldError(regionErr, regionGrid) : showFieldError(regionErr, regionGrid);
        if (!ok) return { valid: false, focusEl: regionGrid };
        return { valid: true };
      }
      return { valid: true };
    }

    function populateReview(step, total) {
      if (step !== total) return;
      const list = document.getElementById("npwReviewList");
      if (!list) return;

      const values = {
        name: nameInput?.value?.trim() || "—",
        category: selectedCategoryLabel || "—",
        unit: quantityInput?.value ? `${quantityInput.value} ${unitLabel()}`.trim() : "—",
        price: priceInput?.value ? `₪${priceInput.value}` : "—",
        store: storeNameInput?.value?.trim() || "—",
        region: regionSelect?.value || "—",
      };

      Object.entries(values).forEach(([key, val]) => {
        const el = list.querySelector(`[data-review="${key}"]`);
        if (el) el.textContent = truncateForReview(val, 80);
      });
    }

    function submitForm(btn) {
      function proceedWithSubmit() {
        const payload = {
          productName: nameInput?.value?.trim() || "",
          category: selectedCategory || "",
          quantity: quantityInput?.value || "",
          unit: unitSelect?.value || "",
          price: priceInput?.value || "",
          storeName: storeNameInput?.value?.trim() || "",
          region: regionSelect?.value || "",
          storeAddress: storeAddressInput?.value?.trim() || "",
          storePhone: storePhoneInput?.value?.trim() || "",
          hasImage: !!document.getElementById("npwProductImage")?.files?.length,
        };

        setBtnLoading(btn, true);
        setTimeout(() => {
          setBtnLoading(btn, false);
          console.log("New product suggestion payload:", payload);
          switchModal("addNewProductModal", "newProductSuccessModal");
        }, 700);
      }

      if (typeof window.gmRequireAuthThenRun === "function") {
        window.gmRequireAuthThenRun(proceedWithSubmit, "addNewProductModal");
      } else {
        proceedWithSubmit();
      }
    }

    function goBackToAdditionMenu() {
      resetForm();
      switchModal("addNewProductModal", "additionModal");
    }

    const wizard = initStepWizard(modalEl, {
      validateStep,
      onSubmit: submitForm,
      onStepChange: populateReview,
      onFirstStepBack: goBackToAdditionMenu,
    });

    function resetForm() {
      selectedCategory = null;
      selectedCategoryLabel = "";

      if (nameInput) nameInput.value = "";
      categoryGrid?.querySelectorAll(".npw-category-btn").forEach((b) => b.classList.remove("active"));

      if (quantityInput) quantityInput.value = "";
      if (unitSelect) unitSelect.selectedIndex = 0;

      if (priceInput) priceInput.value = "";
      setQuickPriceActive(null);

      if (storeNameInput) storeNameInput.value = "";

      setRegionSelection(null);

      if (storeAddressInput) storeAddressInput.value = "";
      if (storePhoneInput) storePhoneInput.value = "";
      productImageUpload?.reset();

      [nameErr, categoryErr, quantityErr, unitErr, priceErr, storeNameErr, regionErr]
        .forEach((el) => el?.classList.remove("show"));
      modalEl.querySelectorAll(".gm-invalid-input, .npw-invalid").forEach((el) => el.classList.remove("gm-invalid-input", "npw-invalid"));
      modalEl.querySelectorAll(".gm-form-card.gm-invalid").forEach((el) => el.classList.remove("gm-invalid"));

      wizard?.reset();
      prefillSavedRegion();
    }

    modalEl.addEventListener("show.bs.modal", () => {
      if (modalEl.dataset.gmSuppressReset === "1") {
        delete modalEl.dataset.gmSuppressReset;
        return;
      }
      resetForm();
    });

    document.getElementById("npwAddAnotherBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchModal("newProductSuccessModal", "addNewProductModal");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCustomSelects(document);
    initAdditionRouter();
    initAddPriceModal();
    initAddListingModal();
    initSuggestProductModal();
  });

})();