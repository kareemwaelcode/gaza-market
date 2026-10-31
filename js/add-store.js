"use strict";
(function () {
  const TYPE_LABELS = {
    en: {
      restaurant: "Restaurant",
      cafe: "Cafe",
      "restaurant-cafe": "Restaurant & Cafe",
      workspace: "Coworking Space",
      store: "Store",
    },
    ar: {
      restaurant: "مطعم",
      cafe: "كافيه",
      "restaurant-cafe": "مطعم وكافيه",
      workspace: "مساحة عمل مشتركة",
      store: "متجر",
    },
  };

  const PHONE_RE = /^(972|970)[0-9]{8,9}$/;
  const WA_RE    = /^(972|970)5[0-9]{8}$/;
  const state = {
    step: 1,
    type: null,
    storeSubCat: null,
    imageFile: null,
    imagePreviewUrl: null,
    submitting: false,
  };

  const FIELD_STEP = { type: 1, sub_category: 1, name: 2, region: 2, address: 2, image: 2, phone: 3, whatsapp: 3 };
  const FIELD_INPUT = { name: "#f2Name", address: "#f2Address", phone: "#f3Phone", whatsapp: "#f3Wa" };
  const FIELD_ERR = {
    type: "gmErrType",
    sub_category: "gmErrCat",
    name: "e2Name",
    region: "e2Region",
    address: "e2Address",
    phone: "e3Phone",
    whatsapp: "e3Wa",
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
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
          alert(getLang() === "ar" ? "نوع الملف غير مدعوم، اختر صورة PNG أو JPG أو WEBP" : "Unsupported file type. Choose a PNG, JPG or WEBP image.");
          this.value = "";
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert(getLang() === "ar" ? "يجب أن تكون الصورة أقل من 5MB" : "Image must be under 5MB.");
          this.value = "";
          return;
        }
        if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
        state.imageFile = file;
        state.imagePreviewUrl = URL.createObjectURL(file);
        imgPreview.src = state.imagePreviewUrl;
        imgUpload.classList.add("has-img");
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

  const REGION_GROUPS = [
    { code: "north",   i18n: "regionNorth",   fallback: "Northern Gaza" },
    { code: "central", i18n: "regionCentral", fallback: "Central Gaza" },
    { code: "south",   i18n: "regionSouth",   fallback: "Southern Gaza" },
  ];

  function renderRegionOptions(panel) {
    const api = window.GMRegions;
    if (!api) return;
    const regions = api.list();
    const frag = document.createDocumentFragment();

    REGION_GROUPS.forEach((g) => {
      const items = regions.filter((r) => r.group === g.code);
      if (!items.length) return;

      const group = document.createElement("div");
      group.className = "gm-region-group";

      const title = document.createElement("div");
      title.className = "gm-region-group-title";
      title.setAttribute("data-i18n", g.i18n);
      const translated = typeof i18n !== "undefined" ? i18n.t(g.i18n) : g.i18n;
      title.textContent = translated !== g.i18n ? translated : g.fallback;
      group.appendChild(title);

      items.forEach((r) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gm-region-opt";
        btn.setAttribute("role", "option");
        btn.dataset.val = r.code;
        btn.textContent = typeof i18n !== "undefined" ? i18n.regionLabel(r.code) : r.name_en;
        group.appendChild(btn);
      });
      frag.appendChild(group);
    });

    panel.textContent = "";
    panel.appendChild(frag);
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

    const selectRegion = (opt) => {
      const val = opt.dataset.val;
      hiddenIn.value      = val;
      valueEl.textContent = typeof i18n !== "undefined" ? i18n.regionLabel(val) : val;
      valueEl.classList.remove("placeholder");
      $$(".gm-region-opt").forEach((o) => o.classList.toggle("selected", o === opt));
      $("#gmRegionTrigger")?.classList.remove("invalid");
      showError("e2Region", false);
      closePanel();
    };

    panel.addEventListener("click", (e) => {
      const opt = e.target.closest(".gm-region-opt");
      if (opt && panel.contains(opt)) selectRegion(opt);
    });

    const syncSelection = () => {
      const chosen = hiddenIn.value;
      if (!chosen) return;
      const opt = $$(".gm-region-opt").find((o) => o.dataset.val === chosen);
      if (opt) opt.classList.add("selected");
      valueEl.textContent = typeof i18n !== "undefined" ? i18n.regionLabel(chosen) : chosen;
    };

    renderRegionOptions(panel);

    document.addEventListener("gmRegionsUpdated", () => {
      renderRegionOptions(panel);
      syncSelection();
    });
  }

  function initStep3() {
    $("#gmNext3")?.addEventListener("click", function () {
      const phoneEl = $("#f3Phone");
      const waEl    = $("#f3Wa");
      let valid = true;

      [phoneEl, waEl].forEach((el) => {
        if (el) el.value = el.value.replace(/\D/g, "");
      });

      const checkPhone = (el, errId, re) => {
        const bad = !re.test(el?.value.trim() ?? "");
        setInvalid(el, bad);
        showError(errId, bad);
        if (bad) valid = false;
      };

      checkPhone(phoneEl, "e3Phone", PHONE_RE);
      checkPhone(waEl,    "e3Wa",    WA_RE);

      if (!valid) { shakeBtn(this); return; }
      populateReview();
      goToStep(4);
    });

    [$("#f3Phone"), $("#f3Wa")].forEach((el) => {
      el?.addEventListener("input", () => {
        el.value = el.value.replace(/\D/g, "");
      });
    });

    $("#gmBack3")?.addEventListener("click", () => goToStep(2));
  }

  function populateReview() {
    const name    = $("#f2Name")?.value.trim()    || "—";
    const region  = $("#f2Region")?.value.trim()  || "—";
    const address = $("#f2Address")?.value.trim() || "—";
    const phone   = $("#f3Phone")?.value.trim() || "—";
    const wa      = $("#f3Wa")?.value.trim()    || "—";

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
      const hasImg = Boolean(state.imagePreviewUrl);
      rvImg.src           = hasImg ? state.imagePreviewUrl : "";
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

  const STATUS_CHECK_TIMEOUT_MS = 4000;
  const ACTIVATE_URL = "dashboard-users/auth/forgot-password.html?mode=activate";
  const LOGIN_URL = "dashboard-users/auth/login.html";
  const STATUS_VIEWS = {
    pending: { title: "statusPendingTitle", desc: "statusPendingDesc" },
    approved: { title: "statusApprovedTitle", desc: "statusApprovedDescNew", descActive: "statusApprovedDescActive" },
    rejected: { title: "statusRejectedTitle", desc: "statusRejectedDesc" },
  };

  function setI18nText(el, key) {
    if (!el) return;
    el.setAttribute("data-i18n", key);
    el.textContent = typeof i18n !== "undefined" ? i18n.t(key) : key;
  }

  function isLoggedInLocally() {
    try {
      const user = JSON.parse(localStorage.getItem(window.GM_STORAGE_KEYS.user) || "null");
      return !!(user && user.name);
    } catch (err) {
      return false;
    }
  }

  function showStatus(mine) {
    const view = STATUS_VIEWS[mine && mine.status];
    const section = $("#gmStatus");
    const box = $("#gmStatusBox");
    if (!view || !section || !box) return;

    $$(".gm-step").forEach((step) => step.classList.toggle("gm-step--hidden", step !== section));
    const indicator = $("#gmStepsIndicator");
    if (indicator) indicator.style.display = "none";
    $$(".gm-back-btn").forEach((btn) => (btn.style.display = "none"));

    const activated = mine.status === "approved" && mine.activated === true;
    box.setAttribute("data-state", mine.status);
    setI18nText($("#gmStatusTitle"), view.title);
    setI18nText($("#gmStatusDesc"), activated ? view.descActive : view.desc);

    const nameEl = $("#gmStatusName");
    if (nameEl) {
      nameEl.textContent = mine.name || "";
      nameEl.hidden = !mine.name;
    }

    const reasonBox = $("#gmStatusReason");
    const reasonText = $("#gmStatusReasonText");
    const showReason = mine.status === "rejected" && !!mine.rejectionReason;
    if (reasonBox) reasonBox.hidden = !showReason;
    if (reasonText) reasonText.textContent = showReason ? mine.rejectionReason : "";

    const primary = $("#gmStatusPrimary");
    if (primary) {
      if (mine.status === "approved") {
        primary.hidden = false;
        primary.setAttribute("href", activated ? LOGIN_URL : ACTIVATE_URL);
        setI18nText(primary.querySelector("span"), activated ? "btnOpenDashboard" : "btnActivateAccount");
      } else {
        primary.hidden = true;
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function loadStatus(onDone) {
    const api = window.GMAddStoreApi;
    if (!api || typeof api.getMine !== "function" || !isLoggedInLocally()) {
      onDone();
      return;
    }

    let settled = false;
    const finish = (mine) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (mine) showStatus(mine);
      onDone();
    };
    const timer = window.setTimeout(() => finish(null), STATUS_CHECK_TIMEOUT_MS);

    api.getMine().then(
      (res) => finish(res && res.ok && res.data ? res.data.mine : null),
      () => finish(null)
    );
  }

  function initStatusCheck() {
    document.body.classList.add("gm-checking");
    loadStatus(() => document.body.classList.remove("gm-checking"));
  }

  function setSubmitError(key) {
    const el = $("#gmErrSubmit");
    if (!el) {
      if (key) alert(typeof i18n !== "undefined" ? i18n.t(key) : key);
      return;
    }
    if (!key) {
      el.classList.remove("show");
      el.removeAttribute("data-i18n");
      el.textContent = "";
      return;
    }
    el.setAttribute("data-i18n", key);
    el.textContent = typeof i18n !== "undefined" ? i18n.t(key) : key;
    el.classList.add("show");
  }

  function setSubmitting(isSubmitting) {
    state.submitting = isSubmitting;
    const btn = $("#gmSubmit");
    const label = btn?.querySelector("span");
    const key = isSubmitting ? "btnSending" : "btnSubmit";

    if (btn) {
      btn.disabled = isSubmitting;
      btn.setAttribute("aria-busy", isSubmitting ? "true" : "false");
      btn.style.opacity = isSubmitting ? "0.65" : "";
      btn.style.cursor = isSubmitting ? "wait" : "";
    }
    if (label) {
      label.setAttribute("data-i18n", key);
      label.textContent = typeof i18n !== "undefined" ? i18n.t(key) : label.textContent;
    }
    const back = $("#gmBack4");
    if (back) back.disabled = isSubmitting;
  }

  function showFieldErrors(fields) {
    let firstStep = 4;
    fields.forEach((f) => {
      const input = $(FIELD_INPUT[f] || "#__none__");
      if (input) setInvalid(input, true);
      if (f === "region") $("#gmRegionTrigger")?.classList.add("invalid");
      if (FIELD_ERR[f]) showError(FIELD_ERR[f], true);
      if (FIELD_STEP[f] && FIELD_STEP[f] < firstStep) firstStep = FIELD_STEP[f];
    });
    if (firstStep < 4) goToStep(firstStep);
  }

  function handleSubmitFailure(res) {
    switch (res.code) {
      case "UNAUTHENTICATED":
        setSubmitError("errSubmitLogin");
        document.getElementById("loginBtn")?.click();
        break;
      case "VALIDATION":
        if (res.fields.indexOf("image") !== -1) setSubmitError("errSubmitImage");
        else if (res.fields.length) showFieldErrors(res.fields);
        else setSubmitError("errSubmitValidation");
        break;
      case "NUMBER_TAKEN": {
        const which = res.field === "whatsapp" ? "whatsapp" : "phone";
        setInvalid($(FIELD_INPUT[which]), true);
        setSubmitError(which === "whatsapp" ? "errSubmitWaTaken" : "errSubmitPhoneTaken");
        break;
      }
      case "ALREADY_HAS_PLACE":
        setSubmitError("errSubmitHasPlace");
        break;
      case "RATE_LIMITED":
        setSubmitError("errSubmitRateLimited");
        break;
      case "NETWORK":
        setSubmitError("errSubmitNetwork");
        break;
      default:
        setSubmitError("errSubmitServer");
    }
  }

  function initStep4() {
    $("#gmSubmit")?.addEventListener("click", () => {
      if (state.submitting) return;
      const api = window.GMAddStoreApi;
      if (!api) {
        setSubmitError("errSubmitServer");
        return;
      }

      setSubmitError(null);
      setSubmitting(true);

      api
        .submit({
          type: state.type,
          subCategory: state.storeSubCat,
          name: $("#f2Name")?.value.trim() || "",
          region: $("#f2Region")?.value.trim() || "",
          address: $("#f2Address")?.value.trim() || "",
          phone: $("#f3Phone")?.value.trim() || "",
          whatsapp: $("#f3Wa")?.value.trim() || "",
          imageFile: state.imageFile,
        })
        .then(
          (res) => {
            setSubmitting(false);
            if (res && res.ok) {
              if (api.mode === "mock") persistTypeForDashboard();
              goToStep("success");
            } else {
              handleSubmitFailure(res || { code: "SERVER", fields: [] });
            }
          },
          () => {
            setSubmitting(false);
            handleSubmitFailure({ code: "NETWORK", fields: [] });
          }
        );
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
    document.body.classList.toggle("dark-mode", localStorage.getItem(window.GM_STORAGE_KEYS.theme) === "dark");
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