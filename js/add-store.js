"use strict";
(function () {
  const TYPE_LABELS = {
    en: {
      restaurant: "Restaurant",
      cafe: "Cafe",
      "restaurant-cafe": "Restaurant & Cafe",
      cowork: "Coworking Space",
      store: "Store",
    },
    ar: {
      restaurant: "مطعم",
      cafe: "كافيه",
      "restaurant-cafe": "مطعم وكافيه",
      cowork: "مساحة عمل مشتركة",
      store: "متجر",
    },
  };

  const PHONE_RE = /^[0-9]{8,12}$/;
  const state = {
    step: 1,
    type: null,
    storeSubCat: null,
    imageDataUrl: null,
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const getLang = () =>
    typeof i18n !== "undefined" ? i18n.getLang() : "ar";

  const showError = (id, visible) =>
    $(`#${id}`)?.classList.toggle("show", visible);

  function setInvalid(el, invalid) {
    if (!el) return;
    el.classList.toggle("invalid", invalid);
    if (invalid) {
      const clear = () => el.classList.remove("invalid");
      el.addEventListener("input",  clear, { once: true });
      el.addEventListener("change", clear, { once: true });
    }
  }

  function shakeBtn(btn) {
    if (!btn) return;
    btn.classList.remove("shake");
    void btn.offsetHeight;
    btn.classList.add("shake");
    btn.addEventListener("animationend", () => btn.classList.remove("shake"), { once: true });
  }

  function updateStepIndicator(step) {
    const indicator = $("#gmStepsIndicator");
    if (!indicator) return;

    $$(".gm-si-item", indicator).forEach((item) => {
      const s = parseInt(item.dataset.step, 10);
      item.classList.toggle("active", s === step);
      item.classList.toggle("done",   s < step);
    });

    $$(".gm-si-line", indicator).forEach((line, i) => {
      line.classList.toggle("done", i + 1 < step);
    });

    const fill = $("#gmSiProgressFill");
    if (fill) fill.style.width = (step === "success" ? 100 : ((step - 1) / 3) * 100) + "%";

    indicator.style.display = step === "success" ? "none" : "";
  }

  function goToStep(n) {
    const from = $(`#gmStep${state.step}`);
    const to   = $(n === "success" ? "#gmSuccess" : `#gmStep${n}`);
    if (!from || !to) return;

    from.classList.add("gm-step--hidden");
    to.classList.remove("gm-step--hidden");
    to.style.animation = "none";
    void to.offsetHeight;
    to.style.animation = "";

    if (n !== "success") state.step = n;

    $$(".gm-back-btn").forEach((btn) => {
      btn.style.display = n === 1 || n === "success" ? "none" : "flex";
    });

    updateStepIndicator(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initStep1() {
    $$(".gm-type-card").forEach((card) => {
      card.addEventListener("click", () => {
        $$(".gm-type-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");

        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        state.type = card.dataset.value;
        showError("gmErrType", false);
        showError("gmErrCat",  false);

        const cats = $("#gmStoreCats");
        if (cats) {
          const isStore = state.type === "store";
          cats.classList.toggle("open", isStore);
          if (!isStore) {
            state.storeSubCat = null;
            $$(".gm-tag").forEach((t) => t.classList.remove("selected"));
          }
        }
      });
    });

    $$(".gm-tag").forEach((tag) => {
      tag.addEventListener("click", () => {
        $$(".gm-tag").forEach((t) => t.classList.remove("selected"));
        tag.classList.add("selected");
        state.storeSubCat = tag.dataset.sub;
        showError("gmErrCat", false);
      });
    });

    $("#gmNext1")?.addEventListener("click", function () {
      let valid = true;

      if (!state.type) {
        showError("gmErrType", true);
        valid = false;
      } else {
        showError("gmErrType", false);
      }

      if (state.type === "store" && !state.storeSubCat) {
        showError("gmErrCat", true);
        valid = false;
      } else if (state.type !== "store") {
        showError("gmErrCat", false);
      }

      if (!valid) { shakeBtn(this); return; }
      goToStep(2);
    });
  }

  function initStep2() {
    const imgUpload  = $("#gmImgUpload");
    const imgInput   = $("#gmImgInput");
    const imgPreview = $("#gmImgPreview");

    if (imgUpload && imgInput && imgPreview) {
      imgUpload.addEventListener("click", () => imgInput.click());
      imgInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
          alert(getLang() === "ar" ? "نوع الملف غير مدعوم، اختر صورة PNG أو JPG أو WEBP" : "Unsupported file type. Choose a PNG, JPG or WEBP image.");
          this.value = "";
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert(getLang() === "ar" ? "يجب أن تكون الصورة أقل من 5MB" : "Image must be under 5MB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          state.imageDataUrl = e.target.result;
          imgPreview.src = state.imageDataUrl;
          imgUpload.classList.add("has-img");
        };
        reader.readAsDataURL(file);
      });
    }

    initRegionPicker();

    $("#gmNext2")?.addEventListener("click", function () {
      const nameEl        = $("#f2Name");
      const regionEl      = $("#f2Region");
      const addressEl     = $("#f2Address");
      const regionTrigger = $("#gmRegionTrigger");
      let valid = true;

      const checkField = (el, errId) => {
        const empty = !el?.value.trim();
        setInvalid(el, empty);
        showError(errId, empty);
        if (empty) valid = false;
      };

      checkField(nameEl,    "e2Name");
      checkField(addressEl, "e2Address");

      if (!regionEl?.value.trim()) {
        regionTrigger?.classList.add("invalid");
        showError("e2Region", true);
        valid = false;
      } else {
        regionTrigger?.classList.remove("invalid");
        showError("e2Region", false);
      }

      if (!valid) { shakeBtn(this); return; }
      goToStep(3);
    });

    $("#gmBack2")?.addEventListener("click", () => goToStep(1));
  }

  function initRegionPicker() {
    const trigger  = $("#gmRegionTrigger");
    const panel    = $("#gmRegionPanel");
    const valueEl  = $("#gmRegionValue");
    const hiddenIn = $("#f2Region");
    if (!trigger || !panel || !valueEl || !hiddenIn) return;

    let isOpen = false;

    const openPanel = () => {
      isOpen = true;
      trigger.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      panel.classList.add("open");
    };

    const closePanel = () => {
      isOpen = false;
      trigger.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
      panel.classList.remove("open");
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      isOpen ? closePanel() : openPanel();
    });

    document.addEventListener("click", (e) => {
      if (isOpen && !$("#gmRegionPicker")?.contains(e.target)) closePanel();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closePanel();
    });

    valueEl.classList.add("placeholder");

    $$(".gm-region-opt").forEach((opt) => {
      opt.addEventListener("click", () => {
        const val = opt.dataset.val;
        hiddenIn.value      = val;
        valueEl.textContent = typeof i18n !== "undefined" ? i18n.regionLabel(val) : val;
        valueEl.classList.remove("placeholder");
        $$(".gm-region-opt").forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");
        $("#gmRegionTrigger")?.classList.remove("invalid");
        showError("e2Region", false);
        closePanel();
      });
    });
  }

  function initStep3() {
    $("#gmNext3")?.addEventListener("click", function () {
      const phoneEl = $("#f3Phone");
      const waEl    = $("#f3Wa");
      let valid = true;

      const checkPhone = (el, errId) => {
        const bad = !PHONE_RE.test(el?.value.trim() ?? "");
        setInvalid(el, bad);
        showError(errId, bad);
        if (bad) valid = false;
      };

      checkPhone(phoneEl, "e3Phone");
      checkPhone(waEl,    "e3Wa");

      if (!valid) { shakeBtn(this); return; }
      populateReview();
      goToStep(4);
    });

    $("#gmBack3")?.addEventListener("click", () => goToStep(2));
  }

  function populateReview() {
    const name    = $("#f2Name")?.value.trim()    || "—";
    const region  = $("#f2Region")?.value.trim()  || "—";
    const address = $("#f2Address")?.value.trim() || "—";
    const phone   = "+970 " + ($("#f3Phone")?.value.trim() || "");
    const wa      = "+970 " + ($("#f3Wa")?.value.trim()    || "");

    const lang   = getLang();
    const labels = TYPE_LABELS[lang] || TYPE_LABELS.ar;
    let typeLabel = labels[state.type] || "—";

    if (state.type === "store" && state.storeSubCat) {
      const sub = typeof i18n !== "undefined" ? i18n.tagLabel(state.storeSubCat) : state.storeSubCat;
      typeLabel  = `${labels.store} — ${sub}`;
    }

    const regionDisplay = typeof i18n !== "undefined" ? i18n.regionLabel(region) : region;

    const set = (id, val) => { const el = $(`#${id}`); if (el) el.textContent = val; };
    set("rvName",    name);
    set("rvBadge",   typeLabel);
    set("rvRegion",  regionDisplay);
    set("rvAddress", address);
    set("rvPhone",   phone);
    set("rvWa",      wa);

    const rvImg = $("#rvImg");
    const rvPh  = $("#rvImgPh");
    if (rvImg && rvPh) {
      const hasImg = Boolean(state.imageDataUrl);
      rvImg.src           = hasImg ? state.imageDataUrl : "";
      rvImg.style.display = hasImg ? "block" : "none";
      rvPh.style.display  = hasImg ? "none"  : "flex";
    }
  }

  const DASHBOARD_TYPE_KEY = "gm-store-type";
  const DASHBOARD_SUBCAT_KEY = "gm-store-subcategory";
  const DASHBOARD_SUBCAT_ID_KEY = "gm-store-subcategory-id";

  function persistTypeForDashboard() {
    try {
      if (state.type) localStorage.setItem(DASHBOARD_TYPE_KEY, state.type);

      if (state.type === "store" && state.storeSubCat) {
        const subLabel =
          typeof i18n !== "undefined"
            ? i18n.tagLabel(state.storeSubCat)
            : state.storeSubCat;
        localStorage.setItem(DASHBOARD_SUBCAT_KEY, subLabel);
        localStorage.setItem(DASHBOARD_SUBCAT_ID_KEY, state.storeSubCat);
      } else {
        localStorage.removeItem(DASHBOARD_SUBCAT_KEY);
        localStorage.removeItem(DASHBOARD_SUBCAT_ID_KEY);
      }
    } catch (e) {}
  }

  function initStep4() {
    $("#gmSubmit")?.addEventListener("click", () => {
      persistTypeForDashboard();
      goToStep("success");
    });

    $("#gmBack4")?.addEventListener("click", () => goToStep(3));
  }


  function initNavbar() {
    const toggler    = document.querySelector(".navbar-toggler");
    const navCollapse = document.getElementById("navbarContent");
    if (!toggler || !navCollapse) return;

    navCollapse.querySelectorAll("a.nav-link:not(.dropdown-toggle)").forEach((link) => {
      link.addEventListener("click", () => {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse) bsCollapse.hide();
      });
    });

    document.addEventListener("click", (e) => {
      if (!navCollapse.classList.contains("show")) return;
      if (navCollapse.contains(e.target)) return;
      if (toggler.contains(e.target)) return;

      const bsCollapse =
        bootstrap.Collapse.getInstance(navCollapse) ||
        new bootstrap.Collapse(navCollapse, { toggle: false });
      bsCollapse.hide();
    });

    document.querySelectorAll(".modal").forEach((modalEl) => {
      modalEl.addEventListener("show.bs.modal", () => {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse && navCollapse.classList.contains("show")) {
          bsCollapse.hide();
        }
      });
    });
  }

  function initTheme() {
    document.body.classList.toggle("dark-mode", localStorage.getItem("gm-theme") === "dark");
  }

  function init() {
    initTheme();
    initStep1();
    initStep2();
    initStep3();
    initStep4();
    updateStepIndicator(1);
    $$(".gm-back-btn").forEach((btn) => (btn.style.display = "none"));
    initNavbar();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();

})();