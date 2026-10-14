const i18n = (() => {
  const STORAGE_KEY  = "gm_lang";
  const DEFAULT_LANG = "ar";

  function getStoredLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && translations[saved] ? saved : DEFAULT_LANG;
    } catch (e) {
      return DEFAULT_LANG;
    }
  }

  let currentLang = getStoredLang();

  const storeTags = {
    en: {
      "General Grocery": "General Grocery", "Supermarket": "Supermarket",
      "Vegetables & Fruits": "Vegetables & Fruits", "Meat": "Meat", "Fish": "Fish",
      "Bakery": "Bakery", "Sweets & Pastries": "Sweets & Pastries",
      "Spices & Herbs": "Spices & Herbs", "Pharmacy": "Pharmacy",
      "Clinic & Medicine": "Clinic & Medicine", "Medical Supplies": "Medical Supplies",
      "Optics": "Optics", "Men's Clothing": "Men's Clothing",
      "Women's Clothing": "Women's Clothing", "Kids' Clothing": "Kids' Clothing",
      "Shoes": "Shoes", "Accessories": "Accessories", "Tailoring": "Tailoring",
      "Home Furniture": "Home Furniture", "Furnishings & Curtains": "Furnishings & Curtains",
      "Household Tools": "Household Tools",
      "Electrical & Home Appliances": "Electrical & Home Appliances",
      "Cleaning Supplies": "Cleaning Supplies", "Plumbing Supplies": "Plumbing Supplies",
      "Mobile & Accessories": "Mobile & Accessories",
      "Computers & Laptops": "Computers & Laptops", "Electronics": "Electronics",
      "Solar Energy": "Solar Energy", "Repair & Maintenance": "Repair & Maintenance",
      "Building Materials": "Building Materials", "Iron & Aluminum": "Iron & Aluminum",
      "Paints & Decor": "Paints & Decor", "Wood": "Wood",
      "Ceramics & Tiles": "Ceramics & Tiles",
      "Bookstore & Stationery": "Bookstore & Stationery",
      "Children's Toys": "Children's Toys", "Art & Drawing Tools": "Art & Drawing Tools",
      "Men's Salon": "Men's Salon", "Women's Salon": "Women's Salon",
      "Laundry": "Laundry", "Photography": "Photography", "Spare Parts": "Spare Parts",
      "Garage & Service": "Garage & Service", "Tires": "Tires",
      "Veterinary": "Veterinary", "Fodder & Supplies": "Fodder & Supplies",
      "Agricultural Tools": "Agricultural Tools", "Miscellaneous": "Miscellaneous",
      "Other": "Other",
    },
    ar: {
      "General Grocery": "بقالة عامة", "Supermarket": "سوبرماركت",
      "Vegetables & Fruits": "خضار وفواكه", "Meat": "لحوم", "Fish": "أسماك",
      "Bakery": "مخبز", "Sweets & Pastries": "حلويات ومعجنات",
      "Spices & Herbs": "بهارات وأعشاب", "Pharmacy": "صيدلية",
      "Clinic & Medicine": "عيادة وطب", "Medical Supplies": "مستلزمات طبية",
      "Optics": "بصريات", "Men's Clothing": "ملابس رجالية",
      "Women's Clothing": "ملابس نسائية", "Kids' Clothing": "ملابس أطفال",
      "Shoes": "أحذية", "Accessories": "إكسسوارات", "Tailoring": "خياطة",
      "Home Furniture": "أثاث منزلي", "Furnishings & Curtains": "مفروشات وستائر",
      "Household Tools": "أدوات منزلية",
      "Electrical & Home Appliances": "كهربائيات وأجهزة منزلية",
      "Cleaning Supplies": "مواد تنظيف", "Plumbing Supplies": "أدوات صحية",
      "Mobile & Accessories": "موبايل وإكسسوارات",
      "Computers & Laptops": "كمبيوتر ولابتوب", "Electronics": "إلكترونيات",
      "Solar Energy": "طاقة شمسية", "Repair & Maintenance": "تصليح وصيانة",
      "Building Materials": "مواد بناء", "Iron & Aluminum": "حديد وألمنيوم",
      "Paints & Decor": "دهانات وديكور", "Wood": "خشب",
      "Ceramics & Tiles": "سيراميك وبلاط",
      "Bookstore & Stationery": "مكتبة وقرطاسية",
      "Children's Toys": "ألعاب أطفال", "Art & Drawing Tools": "أدوات فن ورسم",
      "Men's Salon": "صالون رجالي", "Women's Salon": "صالون نسائي",
      "Laundry": "مغسلة", "Photography": "تصوير", "Spare Parts": "قطع غيار",
      "Garage & Service": "كراج وخدمة", "Tires": "إطارات",
      "Veterinary": "بيطري", "Fodder & Supplies": "أعلاف ومستلزمات",
      "Agricultural Tools": "أدوات زراعية", "Miscellaneous": "متنوع",
      "Other": "أخرى",
    },
  };

  const productCategories = {
    en: {
      "grains-flour": "Grains & Flour", "oils": "Oils", "sugars": "Sugars",
      "legumes": "Legumes", "beverages": "Beverages",
      "dairy-products": "Dairy Products", "vegetables": "Vegetables",
      "fruits": "Fruits", "meat-poultry": "Meat & Poultry",
      "canned-goods": "Canned Goods", "spices-seasonings": "Spices & Seasonings",
      "bread-bakery": "Bread & Bakery", "rice-pasta": "Rice & Pasta",
      "fuel": "Fuel", "water-juices": "Water & Juices",
      "tea-coffee": "Tea & Coffee", "soft-drinks": "Soft Drinks",
      "cleaning-supplies": "Cleaning Supplies", "household-tools": "Household Tools",
      "personal-care": "Personal Care", "diapers-baby": "Diapers & Baby Supplies",
      "medicine-medical": "Medicine & Medical Supplies",
      "tissues-paper": "Tissues & Paper", "cooking-gas": "Cooking Gas",
      "batteries-generators": "Batteries & Generators", "animal-feed": "Animal Feed",
      "seeds-agriculture": "Seeds & Agriculture", "other-products": "Other Products",
      "fuel-combustibles": "Fuel & Combustibles", "oils-grease": "Oils & Grease",
      "sugar-salt": "Sugar & Salt", "legumes-canned": "Legumes & Canned Goods",
      "fresh-vegetables": "Fresh Vegetables", "fish-seafood": "Fish & Seafood",
      "eggs-dairy-cheese": "Eggs, Dairy & Cheese", "test-category": "Test Category",
    },
    ar: {
      "grains-flour": "حبوب ودقيق", "oils": "زيوت", "sugars": "سكريات",
      "legumes": "بقوليات", "beverages": "مشروبات",
      "dairy-products": "منتجات ألبان", "vegetables": "خضروات",
      "fruits": "فواكه", "meat-poultry": "لحوم ودواجن",
      "canned-goods": "معلبات", "spices-seasonings": "بهارات وتوابل",
      "bread-bakery": "خبز ومخبوزات", "rice-pasta": "أرز ومعكرونة",
      "fuel": "وقود", "water-juices": "مياه وعصائر",
      "tea-coffee": "شاي وقهوة", "soft-drinks": "مشروبات غازية",
      "cleaning-supplies": "مواد تنظيف", "household-tools": "أدوات منزلية",
      "personal-care": "عناية شخصية", "diapers-baby": "حفاضات ومستلزمات أطفال",
      "medicine-medical": "أدوية ومستلزمات طبية",
      "tissues-paper": "مناديل وورقيات", "cooking-gas": "غاز الطبخ",
      "batteries-generators": "بطاريات ومولدات", "animal-feed": "أعلاف حيوانات",
      "seeds-agriculture": "بذور وزراعة", "other-products": "منتجات أخرى",
      "fuel-combustibles": "وقود ومحروقات", "oils-grease": "زيوت وشحوم",
      "sugar-salt": "سكر وملح", "legumes-canned": "بقوليات ومعلبات",
      "fresh-vegetables": "خضروات طازجة", "fish-seafood": "أسماك ومأكولات بحرية",
      "eggs-dairy-cheese": "بيض وألبان وأجبان", "test-category": "فئة اختبار",
    },
  };

  const regionOptions = {
    en: {
      "Al-Rimal": "Al-Rimal", "Al-Shati": "Al-Shati", "Sheikh Radwan": "Sheikh Radwan",
      "Al-Saftawi": "Al-Saftawi", "Beit Hanoun": "Beit Hanoun", "Beit Lahia": "Beit Lahia",
      "Tel al-Hawa": "Tel al-Hawa", "Jabalia": "Jabalia", "Al-Nuseirat": "Al-Nuseirat",
      "Al-Bureij": "Al-Bureij", "Al-Maghazi": "Al-Maghazi", "Al-Zawayda": "Al-Zawayda",
      "Deir al-Balah": "Deir al-Balah", "Khan Yunis": "Khan Yunis", "Rafah": "Rafah",
      "Al-Mawasi Al-Qararah": "Al-Mawasi Al-Qararah",
      "Al-Mawasi Khan Yunis": "Al-Mawasi Khan Yunis",
    },
    ar: {
      "Al-Rimal": "الرمال", "Al-Shati": "الشاطئ", "Sheikh Radwan": "الشيخ رضوان",
      "Al-Saftawi": "الصفطاوي", "Beit Hanoun": "بيت حانون", "Beit Lahia": "بيت لاهيا",
      "Tel al-Hawa": "تل الهوا", "Jabalia": "جباليا", "Al-Nuseirat": "النصيرات",
      "Al-Bureij": "البريج", "Al-Maghazi": "المغازي", "Al-Zawayda": "الزوايدة",
      "Deir al-Balah": "دير البلح", "Khan Yunis": "خان يونس", "Rafah": "رفح",
      "Al-Mawasi Al-Qararah": "المواصي القرارة",
      "Al-Mawasi Khan Yunis": "المواصي خان يونس",
    },
  };

  function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) ||
          (translations[DEFAULT_LANG] && translations[DEFAULT_LANG][key]) ||
          key;
  }

  function tagLabel(val) {
    return (storeTags[currentLang] && storeTags[currentLang][val]) || val;
  }

  function regionLabel(val) {
    return (regionOptions[currentLang] && regionOptions[currentLang][val]) || val;
  }

  function productCategoryLabel(val) {
    return (productCategories[currentLang] && productCategories[currentLang][val]) || val;
  }
  function updateArrowIcons(isRtl) {
    document.querySelectorAll("[data-arrow]").forEach((icon) => {
      const base   = icon.getAttribute("data-arrow");
      const isBack = base === "back";
      const shouldFlip = isBack ? !isRtl : isRtl;
      icon.classList.toggle("gm-icon-flip", shouldFlip);
    });

    document.querySelectorAll(
      ".gm-btn svg, .gm-back-btn svg, .gm-success-btn svg, #otpBackBtn svg, #successCloseBtn svg"
    ).forEach((icon) => {
      if (icon.hasAttribute("data-arrow")) return;

      const inBackBtn = icon.closest(
        ".gm-back-btn, .gm-success-btn, #otpBackBtn, #successCloseBtn"
      );
      const shouldFlip = inBackBtn ? !isRtl : isRtl;
      icon.classList.toggle("gm-icon-flip", shouldFlip);
    });
  }

  function applyLang() {
    const isRtl = currentLang === "ar";

    document.documentElement.setAttribute("lang", currentLang);
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    document.body.setAttribute("dir", isRtl ? "rtl" : "ltr");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (val.includes("<")) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = t(el.getAttribute("data-i18n-ph"));
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });

    document.querySelectorAll("optgroup[data-i18n-label]").forEach((el) => {
      el.label = t(el.getAttribute("data-i18n-label"));
    });

    const CONFIRM_ATTR_MAP = {
      "data-i18n-confirm-title":   "data-confirm-title",
      "data-i18n-confirm-message": "data-confirm-message",
      "data-i18n-confirm-action":  "data-confirm-action",
    };

    Object.entries(CONFIRM_ATTR_MAP).forEach(([i18nAttr, targetAttr]) => {
      document.querySelectorAll(`[${i18nAttr}]`).forEach((el) => {
        el.setAttribute(targetAttr, t(el.getAttribute(i18nAttr)));
      });
    });

    document.querySelectorAll(".gm-tag[data-sub]").forEach((btn) => {
      btn.textContent = tagLabel(btn.getAttribute("data-sub"));
    });

    document.querySelectorAll(".gm-region-opt[data-val]").forEach((btn) => {
      btn.textContent = regionLabel(btn.getAttribute("data-val"));
    });

    document.querySelectorAll(".npw-category-btn[data-value]").forEach((btn) => {
      btn.textContent = productCategoryLabel(btn.getAttribute("data-value"));
    });

    updateArrowIcons(isRtl);

    document.querySelectorAll(".lang-dropdown li[data-lang]").forEach((li) => {
      li.classList.toggle("active", li.getAttribute("data-lang") === currentLang);
    });

    const selectedLangImg = document.querySelector(".selected-lang img");
    if (selectedLangImg) {
      selectedLangImg.src = currentLang === "ar" ? "assets/img/ps.svg" : "assets/img/us.svg";
      selectedLangImg.alt = currentLang === "ar" ? "AR" : "EN";
    }

    document.querySelectorAll(
      ".addition-modal-content, .add-price-modal-content, .add-listing-modal-content"
    ).forEach((el) => el.classList.toggle("rtl", isRtl));

    applyDirectionFixes(isRtl);
    _applyAuthModal();
  }

  function applyDirectionFixes(isRtl) {
    const brand = document.querySelector(".navbar-brand img");
    if (brand) {
      brand.style.marginRight = isRtl ? "0"    : "15px";
      brand.style.marginLeft  = isRtl ? "15px" : "0";
    }

    const searchForm = document.querySelector(".search-form");
    if (searchForm) {
      searchForm.style.marginLeft  = isRtl ? "0"    : "15px";
      searchForm.style.marginRight = isRtl ? "15px" : "0";
    }

    document.documentElement.classList.toggle("dir-rtl", isRtl);
    document.documentElement.classList.toggle("dir-ltr", !isRtl);

    document.querySelectorAll(".addition-btn").forEach((btn) => {
      btn.style.marginRight = isRtl ? "0"    : "15px";
      btn.style.marginLeft  = isRtl ? "15px" : "0";
    });

    const regionValue = document.getElementById("gmRegionValue");
    if (regionValue) regionValue.style.textAlign = isRtl ? "right" : "left";

    document.querySelectorAll(".gm-region-opt").forEach((opt) => {
      opt.style.textAlign = isRtl ? "right" : "left";
    });
  }

  function _applyAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;

    modal.setAttribute("data-title-register",         t("authTitleRegister"));
    modal.setAttribute("data-sub-register",           t("authSubRegister"));
    modal.setAttribute("data-title-success-login",    t("authSuccessLoginTitle"));
    modal.setAttribute("data-sub-success-login",      t("authSuccessLoginSub"));
    modal.setAttribute("data-title-success-register", t("authSuccessRegisterTitle"));
    modal.setAttribute("data-sub-success-register",   t("authSuccessRegisterSub"));
    modal.setAttribute("data-err-otp-incomplete",     t("authErrOtpIncomplete"));
    modal.setAttribute("data-err-otp-wrong",          t("authErrOtpWrong"));

    const otpInfoSub = document.querySelector(".auth-otp-info-sub");
    if (otpInfoSub) {
      const labelSpan = otpInfoSub.querySelector('[data-i18n="authOtpSub"]');
      if (labelSpan) labelSpan.textContent = t("authOtpSub");
    }

    const resendText = document.getElementById("resendText");
    if (resendText) {
      const timer    = document.getElementById("resendTimer");
      const timerVal = timer ? timer.textContent : "60";
      resendText.innerHTML = `<span data-i18n="authResendAfter">${t("authResendAfter")}</span> <span id="resendTimer">${timerVal}</span>${t("authResendUnit")}`;
    }

  }

  function setLang(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
    }
    applyLang();
  }

  function getLang() {
    return currentLang;
  }

  function init() {
    applyLang();
    const selectedLang = document.querySelector(".selected-lang");
    const langSwitcher = document.querySelector(".lang-switcher");

    if (selectedLang && langSwitcher) {
      selectedLang.addEventListener("click", (e) => {
        e.stopPropagation();
        langSwitcher.classList.toggle("active");
      });
      document.addEventListener("click", () => {
        langSwitcher.classList.remove("active");
      });
      langSwitcher.addEventListener("click", (e) => e.stopPropagation());
    }
    document.querySelectorAll(".lang-dropdown li[data-lang]").forEach((li) => {
      li.addEventListener("click", () => {
        setLang(li.getAttribute("data-lang"));
        if (langSwitcher) langSwitcher.classList.remove("active");
      });
    });
  }
  return { init, setLang, getLang, t, tagLabel, regionLabel, productCategoryLabel };
})();

document.addEventListener("DOMContentLoaded", () => i18n.init());