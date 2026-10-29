"use strict";
// add-store-api.js: API layer for the "add a place" request (js/add-store.js uses it).
// Live mode talks to POST /api/places (multipart). Mock mode is allowed only on local hosts
// (GM_ENV.isMockAllowed) and never touches a real server.
// To test the live driver locally, set window.GM_CONFIG = { USE_MOCK: false } before this script.
(function () {
  const DEFAULTS = {
    API_BASE: "/api",
    CSRF_URL: "/sanctum/csrf-cookie",
    TIMEOUT_MS: 30000,
  };

  const CONFIG = Object.assign({}, DEFAULTS, window.GM_CONFIG || {});
  const API_BASE = String(CONFIG.API_BASE).replace(/\/+$/, "");
  const USE_MOCK = window.GM_ENV && window.GM_ENV.isMockAllowed();

  const MOCK_DELAY_MS = 600;
  const MOCK_SLOW_DELAY_MS = 3000;
  const MOCK_STORAGE_KEY = "gmMockPlaceRequests";
  const MOCK_STORAGE_MAX = 50;

  // Fields the server may report in `errors`. Anything else is ignored.
  const KNOWN_FIELDS = ["type", "sub_category", "name", "region", "address", "phone", "whatsapp", "image"];

  // Server `code` values mapped to the codes the page understands.
  const KNOWN_CODES = {
    unauthenticated: "UNAUTHENTICATED",
    validation: "VALIDATION",
    number_taken: "NUMBER_TAKEN",
    rate_limited: "RATE_LIMITED",
    already_has_place: "ALREADY_HAS_PLACE",
  };

  // Request statuses the page knows how to show.
  const MINE_STATUSES = ["pending", "approved", "rejected"];

  // Mock mode only: ?gm_test=unauth|validation|phone|whatsapp|limit|network|error|slow
  // Mock mode only: ?gm_status=none|pending|approved|activated|rejected previews the status screen.
  let testMode = "";
  let statusPreview = "";
  try {
    const params = new URLSearchParams(window.location.search);
    testMode = params.get("gm_test") || "";
    statusPreview = params.get("gm_status") || "";
  } catch (err) {
    testMode = "";
    statusPreview = "";
  }

  const ok = (data) => ({ ok: true, data: data || {} });
  const fail = (code, extra) => Object.assign({ ok: false, code: code, fields: [], field: "", retryAfter: 0 }, extra || {});

  function codeFromStatus(status) {
    if (status === 0) return "NETWORK";
    if (status === 401 || status === 419) return "UNAUTHENTICATED";
    if (status === 409) return "NUMBER_TAKEN";
    if (status === 413 || status === 422) return "VALIDATION";
    if (status === 429) return "RATE_LIMITED";
    return "SERVER";
  }

  function toResult(res) {
    const status = res.status;
    const payload = res.payload && typeof res.payload === "object" ? res.payload : {};

    if (status >= 200 && status < 300) {
      const data = payload.data && typeof payload.data === "object" ? payload.data : {};
      return ok({ id: data.id, status: data.status });
    }

    const serverCode = typeof payload.code === "string" ? KNOWN_CODES[payload.code.toLowerCase()] : "";
    const code = serverCode || codeFromStatus(status);

    const errors = payload.errors && typeof payload.errors === "object" ? Object.keys(payload.errors) : [];
    const fields = errors.filter((f) => KNOWN_FIELDS.indexOf(f) !== -1);
    const field = payload.field === "phone" || payload.field === "whatsapp" ? payload.field : "";
    const retryAfter = Number(payload.retry_after) > 0 ? Number(payload.retry_after) : 0;

    return fail(code, { fields: fields, field: field, retryAfter: retryAfter });
  }

  // Turns the server's "my place" object into the small shape the page needs.
  // Returns null when the object is missing or has a status the page does not know.
  function normalizeMine(d) {
    if (!d || typeof d !== "object" || MINE_STATUSES.indexOf(d.status) === -1) return null;
    return {
      id: typeof d.id === "string" || typeof d.id === "number" ? String(d.id) : "",
      status: d.status,
      name: typeof d.name === "string" ? d.name.slice(0, 80) : "",
      type: typeof d.type === "string" ? d.type : "",
      activated: d.activated === true,
      rejectionReason: typeof d.rejection_reason === "string" ? d.rejection_reason.slice(0, 300) : "",
    };
  }

  // GET /api/places/mine: 200 with data:null = the user has no place yet.
  function mineToResult(res) {
    if (res.status >= 200 && res.status < 300) {
      const body = res.payload && typeof res.payload === "object" ? res.payload : {};
      if (body.data === null || body.data === undefined) return ok({ mine: null });
      const mine = normalizeMine(body.data);
      return mine ? ok({ mine: mine }) : fail("SERVER");
    }
    return fail(codeFromStatus(res.status));
  }

  function createLiveDriver() {
    let csrfPromise = null;

    function getXsrfToken() {
      const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    }

    function ensureCsrfCookie(force) {
      if (!force && getXsrfToken()) return Promise.resolve();
      if (!csrfPromise) {
        csrfPromise = fetch(CONFIG.CSRF_URL, {
          method: "GET",
          headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
          credentials: "same-origin",
          cache: "no-store",
        })
          .then(() => {}, () => {})
          .then(() => { csrfPromise = null; });
      }
      return csrfPromise;
    }

    function buildFormData(p) {
      const fd = new FormData();
      fd.append("type", p.type);
      if (p.type === "store" && p.subCategory) fd.append("sub_category", p.subCategory);
      fd.append("name", p.name);
      fd.append("region", p.region);
      fd.append("address", p.address);
      fd.append("phone", p.phone);
      fd.append("whatsapp", p.whatsapp);
      if (p.imageFile) fd.append("image", p.imageFile);
      return fd;
    }

    function send(payload) {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timer = controller ? window.setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS) : null;

      return ensureCsrfCookie(false)
        .then(() => {
          // No Content-Type header: the browser sets the multipart boundary itself.
          const headers = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
          const xsrf = getXsrfToken();
          if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;
          return fetch(API_BASE + "/places", {
            method: "POST",
            headers: headers,
            body: buildFormData(payload),
            credentials: "same-origin",
            cache: "no-store",
            signal: controller ? controller.signal : undefined,
          });
        })
        .then(
          (response) =>
            response.json().then(
              (body) => ({ status: response.status, payload: body }),
              () => ({ status: response.status, payload: {} })
            ),
          () => ({ status: 0, payload: {} })
        )
        .then((res) => {
          window.clearTimeout(timer);
          return res;
        });
    }

    function fetchMine() {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timer = controller ? window.setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS) : null;

      return fetch(API_BASE + "/places/mine", {
        method: "GET",
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "same-origin",
        cache: "no-store",
        signal: controller ? controller.signal : undefined,
      })
        .then(
          (response) =>
            response.json().then(
              (body) => ({ status: response.status, payload: body }),
              () => ({ status: response.status, payload: {} })
            ),
          () => ({ status: 0, payload: {} })
        )
        .then((res) => {
          window.clearTimeout(timer);
          return res;
        });
    }

    return {
      submit: function (payload) {
        return send(payload)
          .then((res) => {
            // 419 = Laravel CSRF/session mismatch: refresh the CSRF cookie and retry once.
            if (res.status === 419) return ensureCsrfCookie(true).then(() => send(payload));
            return res;
          })
          .then(toResult);
      },

      getMine: function () {
        return fetchMine().then(mineToResult);
      },
    };
  }

  function createMockDriver() {
    const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

    function read() {
      try {
        const raw = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) || "[]");
        return Array.isArray(raw) ? raw : [];
      } catch (err) {
        return [];
      }
    }

    function write(list) {
      try {
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(list.slice(-MOCK_STORAGE_MAX)));
      } catch (err) {}
    }

    function isLoggedIn() {
      try {
        const user = JSON.parse(localStorage.getItem(window.GM_STORAGE_KEYS.user) || "null");
        return !!(user && user.name);
      } catch (err) {
        return false;
      }
    }

    // Rule: one place per number. A number counts as taken if it is the phone OR the
    // WhatsApp number of any existing request.
    function takenField(list, payload) {
      for (let i = 0; i < list.length; i++) {
        const used = [list[i].phone, list[i].whatsapp];
        if (used.indexOf(payload.phone) !== -1) return "phone";
        if (used.indexOf(payload.whatsapp) !== -1) return "whatsapp";
      }
      return "";
    }

    return {
      submit: function (payload) {
        return delay(testMode === "slow" ? MOCK_SLOW_DELAY_MS : MOCK_DELAY_MS).then(() => {
          if (testMode === "network") return fail("NETWORK");
          if (testMode === "error") return fail("SERVER");
          if (testMode === "limit") return fail("RATE_LIMITED", { retryAfter: 60 });
          if (testMode === "unauth" || !isLoggedIn()) return fail("UNAUTHENTICATED");
          if (testMode === "validation") return fail("VALIDATION", { fields: ["name"] });
          if (testMode === "phone") return fail("NUMBER_TAKEN", { field: "phone" });
          if (testMode === "whatsapp") return fail("NUMBER_TAKEN", { field: "whatsapp" });

          const list = read();
          const taken = takenField(list, payload);
          if (taken) return fail("NUMBER_TAKEN", { field: taken });

          const id = window.GM_ID ? window.GM_ID.generate("plc") : "plc_" + Date.now();
          list.push({
            id: id,
            type: payload.type,
            sub_category: payload.subCategory || null,
            name: payload.name,
            region: payload.region,
            address: payload.address,
            phone: payload.phone,
            whatsapp: payload.whatsapp,
            has_image: !!payload.imageFile,
            status: "pending",
          });
          write(list);
          return ok({ id: id, status: "pending" });
        });
      },

      // Mock: the newest saved request counts as "my place". ?gm_status=... previews each state.
      getMine: function () {
        return delay(300).then(() => {
          if (testMode === "network") return fail("NETWORK");
          if (!isLoggedIn()) return fail("UNAUTHENTICATED");
          if (statusPreview === "none") return ok({ mine: null });

          const list = read();
          const last = list.length ? list[list.length - 1] : null;
          const previews = {
            pending: { status: "pending" },
            approved: { status: "approved", activated: false },
            activated: { status: "approved", activated: true },
            rejected: { status: "rejected", rejection_reason: "الصورة غير واضحة، أعد تصوير المكان بوضوح أكبر." },
          };

          if (previews[statusPreview]) {
            const base = Object.assign(
              { id: "plc_preview", name: (last && last.name) || "Vibe Hub", type: (last && last.type) || "cafe" },
              previews[statusPreview]
            );
            return ok({ mine: normalizeMine(base) });
          }

          if (!last) return ok({ mine: null });
          return ok({
            mine: normalizeMine({ id: last.id, status: last.status || "pending", name: last.name, type: last.type }),
          });
        });
      },
    };
  }

  const driver = USE_MOCK ? createMockDriver() : createLiveDriver();

  window.GMAddStoreApi = Object.freeze({
    mode: USE_MOCK ? "mock" : "live",
    submit: driver.submit,
    getMine: driver.getMine,
  });
})();