"use strict";
(function () {
  const DEFAULTS = {
    API_BASE: "/api",
    TIMEOUT_MS: 15000,
    UPLOAD_TIMEOUT_MS: 60000,
    CREDENTIALS: "same-origin",
    CSRF_URL: "/sanctum/csrf-cookie",
  };

  const CONFIG = Object.assign({}, DEFAULTS, window.GM_CONFIG || {});
  const API_BASE = String(CONFIG.API_BASE).replace(/\/+$/, "");
  const USE_MOCK = !!(window.GM_ENV && window.GM_ENV.isMockAllowed());

  const STORE_KEY = "gm_mock_market_v1";
  const SAVED_KEY = "gm_mock_market_saved_v1";
  const USER_KEY = (window.GM_STORAGE_KEYS && window.GM_STORAGE_KEYS.user) || "user";

  const CATEGORIES = Object.freeze(["electronics", "clothing", "furniture", "food", "books", "tools", "toys", "other"]);
  const CONDITIONS = Object.freeze(["new", "used", "urgent"]);
  const STATUSES = Object.freeze(["pending", "approved"]);

  const MAX_IMAGES = 3;
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const IMAGE_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
  const IMAGE_MAX_SIDE = 1280;
  const IMAGE_QUALITY = 0.8;

  const PAGE_DEFAULT = 12;
  const PAGE_MAX = 48;
  const SIMILAR_DEFAULT = 8;
  const SIMILAR_MAX = 24;

  const LIMITS = Object.freeze({
    title: 100,
    description: 1500,
    priceMax: 100000000,
    phoneMin: 9,
    phoneMax: 15,
    query: 60,
  });

  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  const CODE_RE = /^[A-Za-z][A-Za-z0-9]{1,39}$/;
  const SAFE_URL_RE = /^(https?:\/\/|\/(?!\/)|data:image\/(jpeg|png|webp);base64,)/i;

  function GMMarketError(code, message, status, errors) {
    const err = new Error(message || code);
    err.name = "GMMarketError";
    err.code = code;
    err.status = status || 0;
    err.errors = errors || null;
    return err;
  }

  function codeFromStatus(status) {
    if (status === 401 || status === 419) return "unauthorized";
    if (status === 403) return "forbidden";
    if (status === 404) return "not_found";
    if (status === 422) return "validation";
    if (status === 429) return "rate_limited";
    return "server";
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getTestMode() {
    try {
      return new URLSearchParams(window.location.search).get("gm_test") || "";
    } catch (err) {
      return "";
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function squash(value) {
    return String(value)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0640]/g, "")
      .replace(/[\u0622\u0623\u0625]/g, "\u0627")
      .replace(/\u0649/g, "\u064A")
      .replace(/\u0629/g, "\u0647")
      .replace(/[^\p{L}\p{N}]/gu, "");
  }

  function safeUrl(value) {
    return typeof value === "string" && value.length <= 2000000 && SAFE_URL_RE.test(value) ? value : null;
  }

  function toIso(value) {
    const date = value ? new Date(value) : null;
    return date && !isNaN(date.getTime()) ? date.toISOString() : null;
  }

  function cleanTitle(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  }

  function cleanDescription(value) {
    return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
  }

  function cleanPhone(value) {
    if (typeof value !== "string") return "";
    const text = value.trim();
    return (text.charAt(0) === "+" ? "+" : "") + text.replace(/\D/g, "");
  }

  function phoneValid(value) {
    const digits = value.replace(/\D/g, "");
    return digits.length >= LIMITS.phoneMin && digits.length <= LIMITS.phoneMax;
  }

  function cleanPrice(value) {
    if (value === null || value === undefined || value === "") return { value: null, valid: true };
    const num = Number(value);
    if (!isFinite(num) || num < 0 || num > LIMITS.priceMax) return { value: null, valid: false };
    return { value: Math.round(num * 100) / 100, valid: true };
  }

  function resolveRegion(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    if (window.GMRegions && typeof window.GMRegions.normalize === "function") return window.GMRegions.normalize(raw);
    return typeof raw === "string" && CODE_RE.test(raw) ? raw : null;
  }

  function isFile(value) {
    return typeof File === "function" && value instanceof File;
  }

  function cleanId(id) {
    const text = String(id === undefined || id === null ? "" : id).trim();
    if (!ID_RE.test(text)) throw GMMarketError("not_found", "Listing not found", 404);
    return text;
  }

  function currentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      if (!user || !user.phone) return null;
      return {
        name: typeof user.name === "string" ? user.name.trim() : "",
        phone: String(user.phone),
        avatar: safeUrl(user.avatar),
      };
    } catch (err) {
      return null;
    }
  }

  function ownerKeyOf(phone) {
    return String(phone).replace(/\D/g, "").slice(-9);
  }

  function validate(payload) {
    const src = payload && typeof payload === "object" ? payload : {};
    const errors = {};

    const title = cleanTitle(src.title);
    if (!title) errors.title = "required";
    else if (title.length > LIMITS.title) errors.title = "too_long";

    const category = typeof src.category === "string" ? src.category : "";
    if (!category) errors.category = "required";
    else if (CATEGORIES.indexOf(category) === -1) errors.category = "invalid";

    const condition = src.condition === undefined || src.condition === null || src.condition === "" ? "new" : src.condition;
    if (CONDITIONS.indexOf(condition) === -1) errors.condition = "invalid";

    const description = cleanDescription(src.description);
    if (!description) errors.description = "required";
    else if (description.length > LIMITS.description) errors.description = "too_long";

    const price = cleanPrice(src.price);
    if (!price.valid) errors.price = "invalid";

    const region = resolveRegion(src.region);
    if (!region) errors.region = src.region ? "invalid" : "required";

    const phone = cleanPhone(src.phone);
    if (!phone) errors.phone = "required";
    else if (!phoneValid(phone)) errors.phone = "invalid";

    const whatsapp = cleanPhone(src.whatsapp);
    if (whatsapp && !phoneValid(whatsapp)) errors.whatsapp = "invalid";

    const images = Array.isArray(src.images) ? src.images : [];
    if (images.length > MAX_IMAGES) {
      errors.images = "too_many";
    } else {
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (typeof item === "string") {
          if (!safeUrl(item)) { errors.images = "invalid"; break; }
        } else if (isFile(item)) {
          if (IMAGE_TYPES.indexOf(item.type) === -1) { errors.images = "invalid_type"; break; }
          if (item.size > MAX_IMAGE_BYTES) { errors.images = "too_large"; break; }
        } else {
          errors.images = "invalid";
          break;
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors,
      value: {
        title: title,
        category: category,
        condition: condition,
        description: description,
        price: price.value,
        negotiable: !!src.negotiable,
        region: region || "",
        phone: phone,
        whatsapp: whatsapp,
        images: images.filter((item) => typeof item === "string").concat(images.filter(isFile)),
      },
    };
  }

  function normalizeItem(raw) {
    if (!raw || raw.listing_id === undefined || raw.listing_id === null || raw.listing_id === "") return null;

    const title = cleanTitle(raw.title);
    if (!title) return null;

    const status = STATUSES.indexOf(raw.status) === -1 ? null : raw.status;
    if (!status) return null;

    const price = Number(raw.price);
    const seller = raw.seller && typeof raw.seller === "object" ? raw.seller : {};

    return {
      listing_id: String(raw.listing_id),
      title: title,
      category: CATEGORIES.indexOf(raw.category) === -1 ? "other" : raw.category,
      condition: CONDITIONS.indexOf(raw.condition) === -1 ? "new" : raw.condition,
      description: cleanDescription(raw.description),
      price: raw.price === null || raw.price === undefined || raw.price === "" || !isFinite(price) || price < 0 ? null : price,
      negotiable: !!raw.negotiable,
      region: typeof raw.region === "string" ? raw.region : "",
      phone: typeof raw.phone === "string" ? raw.phone : "",
      whatsapp: typeof raw.whatsapp === "string" ? raw.whatsapp : "",
      images: Array.isArray(raw.images) ? raw.images.map(safeUrl).filter(Boolean).slice(0, MAX_IMAGES) : [],
      status: status,
      created_at: toIso(raw.created_at),
      approved_at: toIso(raw.approved_at),
      seller: {
        name: typeof seller.name === "string" ? seller.name.trim() : "",
        avatar: safeUrl(seller.avatar),
        member_since: toIso(seller.member_since),
      },
      is_owner: !!raw.is_owner,
      is_saved: !!raw.is_saved,
    };
  }

  function normalizeSingle(json) {
    const body = json && json.data && typeof json.data === "object" && !Array.isArray(json.data) ? json.data : json;
    const item = normalizeItem(body);
    if (!item) throw GMMarketError("invalid_response", "Invalid listing response");
    return item;
  }

  function normalizeList(json) {
    if (!json || !Array.isArray(json.data)) throw GMMarketError("invalid_response", "Invalid listings response");
    return json.data.map(normalizeItem).filter(Boolean);
  }

  function normalizePage(json) {
    const items = normalizeList(json);
    const meta = json.meta && typeof json.meta === "object" ? json.meta : {};
    const nextCursor = json.next_cursor || meta.next_cursor || null;
    const hasMoreFlag = json.has_more !== undefined ? json.has_more : meta.has_more;
    const rawTotal = json.total !== undefined ? json.total : meta.total;
    const total = rawTotal === undefined || rawTotal === null || rawTotal === "" ? NaN : Number(rawTotal);

    return {
      items: items,
      nextCursor: nextCursor,
      hasMore: (hasMoreFlag === undefined ? true : !!hasMoreFlag) && !!nextCursor,
      total: isFinite(total) && total >= 0 ? Math.floor(total) : null,
    };
  }

  function normalizeSaved(json) {
    const body = json && json.data && typeof json.data === "object" && !Array.isArray(json.data) ? json.data : json;
    if (!body || typeof body !== "object") throw GMMarketError("invalid_response", "Invalid save response");
    return { saved: !!body.saved };
  }

  function cleanParams(params) {
    const p = params && typeof params === "object" ? params : {};
    const limit = Math.floor(Number(p.limit));
    return {
      region: p.region ? resolveRegion(p.region) : null,
      category: CATEGORIES.indexOf(p.category) === -1 ? null : p.category,
      condition: CONDITIONS.indexOf(p.condition) === -1 ? null : p.condition,
      q: typeof p.q === "string" ? p.q.replace(/\s+/g, " ").trim().slice(0, LIMITS.query) : "",
      saved: !!p.saved,
      cursor: typeof p.cursor === "string" && p.cursor.length <= 200 ? p.cursor : null,
      limit: clamp(isFinite(limit) && limit > 0 ? limit : PAGE_DEFAULT, 1, PAGE_MAX),
    };
  }

  function getXsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function buildHeaders(hasJsonBody) {
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };
    const lang = document.documentElement.getAttribute("lang");
    if (lang) headers["Accept-Language"] = lang;
    if (hasJsonBody) headers["Content-Type"] = "application/json";
    const xsrf = getXsrfToken();
    if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;
    return headers;
  }

  let csrfPromise = null;

  function ensureCsrfCookie() {
    if (getXsrfToken()) return Promise.resolve();
    if (!csrfPromise) {
      csrfPromise = fetch(CONFIG.CSRF_URL, {
        method: "GET",
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: CONFIG.CREDENTIALS,
      }).then(() => undefined, () => undefined).then(() => { csrfPromise = null; });
    }
    return csrfPromise;
  }

  async function request(method, path, body) {
    if (method !== "GET") await ensureCsrfCookie();

    const isForm = typeof FormData === "function" && body instanceof FormData;
    const timeout = isForm ? CONFIG.UPLOAD_TIMEOUT_MS : CONFIG.TIMEOUT_MS;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

    let res;
    try {
      res = await fetch(API_BASE + path, {
        method: method,
        headers: buildHeaders(body !== undefined && !isForm),
        credentials: CONFIG.CREDENTIALS,
        body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
        signal: controller ? controller.signal : undefined,
      });
    } catch (err) {
      if (err && err.name === "AbortError") throw GMMarketError("timeout", "Request timed out");
      throw GMMarketError("network", "Network error");
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (res.status === 204) return {};

    let json = null;
    try {
      json = await res.json();
    } catch (err) {
      json = null;
    }

    if (!res.ok) {
      const message = json && typeof json.message === "string" ? json.message : "HTTP " + res.status;
      throw GMMarketError(codeFromStatus(res.status), message, res.status, json && json.errors);
    }

    if (json === null) throw GMMarketError("invalid_response", "Empty or invalid JSON response", res.status);
    return json;
  }

  function buildFormData(value, method) {
    const form = new FormData();
    if (method) form.append("_method", method);
    form.append("title", value.title);
    form.append("category", value.category);
    form.append("condition", value.condition);
    form.append("description", value.description);
    if (value.price !== null) form.append("price", String(value.price));
    form.append("negotiable", value.negotiable ? "1" : "0");
    form.append("region", value.region);
    form.append("phone", value.phone);
    if (value.whatsapp) form.append("whatsapp", value.whatsapp);
    value.images.forEach((item) => {
      if (typeof item === "string") form.append("keep_images[]", item);
      else form.append("images[]", item, item.name);
    });
    return form;
  }

  function apiFetchPage(p) {
    const query = new URLSearchParams();
    if (p.region) query.set("region", p.region);
    if (p.category) query.set("category", p.category);
    if (p.condition) query.set("condition", p.condition);
    if (p.q) query.set("q", p.q);
    if (p.saved) query.set("saved", "1");
    if (p.cursor) query.set("cursor", p.cursor);
    query.set("limit", String(p.limit));
    return request("GET", "/market?" + query.toString());
  }

  function apiFetchMine() {
    return request("GET", "/market/mine");
  }

  function apiFetchOne(id) {
    return request("GET", "/market/" + encodeURIComponent(id));
  }

  function apiFetchSimilar(id, limit) {
    return request("GET", "/market/" + encodeURIComponent(id) + "/similar?limit=" + limit);
  }

  function apiCreate(value) {
    return request("POST", "/market", buildFormData(value, null));
  }

  function apiUpdate(id, value) {
    return request("POST", "/market/" + encodeURIComponent(id), buildFormData(value, "PUT"));
  }

  function apiRemove(id) {
    return request("DELETE", "/market/" + encodeURIComponent(id));
  }

  function apiMarkSold(id) {
    return request("POST", "/market/" + encodeURIComponent(id) + "/sold", {});
  }

  function apiSetSaved(id, saved) {
    return request("PUT", "/market/" + encodeURIComponent(id) + "/save", { saved: !!saved });
  }

  const MOCK_BASE_TIME = Math.floor(Date.now() / 60000) * 60000;
  const HOUR = 3600000;
  const DAY = 24 * HOUR;

  const MOCK_SEEDS = [
    {
      listing_id: "mkt_seed_tv",
      title: "تلفاز سامسونج 43 بوصة",
      category: "electronics",
      condition: "used",
      description: "تلفاز سامسونج فل اتش دي، مقاس 43 بوصة، الشاشة سليمة 100% وبدون أي خدوش. تم استخدامه بشكل خفيف داخل المنزل فقط، ويأتي مع الريموت الأصلي وكابل الطاقة.",
      price: 1800,
      negotiable: true,
      region: "KhanYunis",
      phone: "0599123456",
      whatsapp: "+970599123456",
      images: [],
      status: "approved",
      created_at: new Date(MOCK_BASE_TIME - 2 * DAY).toISOString(),
      approved_at: new Date(MOCK_BASE_TIME - 2 * DAY + HOUR).toISOString(),
      owner_key: "seed00001",
      seller: { name: "أبو محمود", avatar: null, member_since: new Date(MOCK_BASE_TIME - 400 * DAY).toISOString() },
    },
    {
      listing_id: "mkt_seed_iphone",
      title: "آيفون 12 برو",
      category: "electronics",
      condition: "urgent",
      description: "آيفون 12 برو بحالة ممتازة، البطارية جيدة والشاشة بدون خدوش، مع الشاحن الأصلي.",
      price: 2600,
      negotiable: false,
      region: "Rafah",
      phone: "0599000002",
      whatsapp: "",
      images: [],
      status: "approved",
      created_at: new Date(MOCK_BASE_TIME - 30 * HOUR).toISOString(),
      approved_at: new Date(MOCK_BASE_TIME - 29 * HOUR).toISOString(),
      owner_key: "seed00002",
      seller: { name: "سامر", avatar: null, member_since: new Date(MOCK_BASE_TIME - 200 * DAY).toISOString() },
    },
    {
      listing_id: "mkt_seed_shirt",
      title: "قميص شتوي رجالي",
      category: "clothing",
      condition: "new",
      description: "قميص شتوي رجالي جديد لم يستخدم، مقاس لارج، قماش سميك ودافئ.",
      price: 60,
      negotiable: true,
      region: "DeirBalah",
      phone: "0599000003",
      whatsapp: "0599000003",
      images: [],
      status: "approved",
      created_at: new Date(MOCK_BASE_TIME - 20 * HOUR).toISOString(),
      approved_at: new Date(MOCK_BASE_TIME - 19 * HOUR).toISOString(),
      owner_key: "seed00003",
      seller: { name: "ليلى", avatar: null, member_since: new Date(MOCK_BASE_TIME - 90 * DAY).toISOString() },
    },
    {
      listing_id: "mkt_seed_bedroom",
      title: "طقم غرفة نوم كاملة",
      category: "furniture",
      condition: "used",
      description: "طقم غرفة نوم كامل يشمل السرير وخزانة وتسريحة وكومودينو، بحالة جيدة جداً.",
      price: 2500,
      negotiable: true,
      region: "Jabalia",
      phone: "0599000004",
      whatsapp: "",
      images: [],
      status: "approved",
      created_at: new Date(MOCK_BASE_TIME - 8 * HOUR).toISOString(),
      approved_at: new Date(MOCK_BASE_TIME - 7 * HOUR).toISOString(),
      owner_key: "seed00004",
      seller: { name: "أم خالد", avatar: null, member_since: new Date(MOCK_BASE_TIME - 150 * DAY).toISOString() },
    },
  ];

  function loadUserRows() {
    const stored = readJson(STORE_KEY, null);
    return stored && Array.isArray(stored.rows) ? stored.rows : [];
  }

  function saveUserRows(rows) {
    if (!writeJson(STORE_KEY, { rows: rows })) throw GMMarketError("storage_full", "Storage is full");
  }

  function allRows() {
    return MOCK_SEEDS.concat(loadUserRows());
  }

  function readSaved() {
    const list = readJson(SAVED_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function writeSaved(list) {
    writeJson(SAVED_KEY, list);
  }

  function isOwnerRow(row, user) {
    return !!user && row.owner_key === ownerKeyOf(user.phone);
  }

  function canSee(row, user) {
    return row.status === "approved" || isOwnerRow(row, user);
  }

  function toView(row, user, saved) {
    return Object.assign({}, row, {
      is_owner: isOwnerRow(row, user),
      is_saved: saved.indexOf(row.listing_id) !== -1,
    });
  }

  function sortKey(row) {
    return row.approved_at || row.created_at;
  }

  function compareNewestFirst(a, b) {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka !== kb) return ka < kb ? 1 : -1;
    return a.listing_id < b.listing_id ? 1 : -1;
  }

  function encodeCursor(row) {
    return sortKey(row) + "|" + row.listing_id;
  }

  function decodeCursor(cursor) {
    const index = String(cursor).lastIndexOf("|");
    if (index < 1) return null;
    return { key: cursor.slice(0, index), id: cursor.slice(index + 1) };
  }

  async function mockGate(ms) {
    const mode = getTestMode();
    await delay(mode === "slow" ? 3000 : ms);
    if (navigator.onLine === false || mode === "error") throw GMMarketError("network", "mock network error");
    return mode;
  }

  function requireUser() {
    const user = currentUser();
    if (!user) throw GMMarketError("unauthorized", "Login required", 401);
    return user;
  }

  function findVisible(id, user) {
    const row = allRows().find((item) => item.listing_id === id);
    if (!row || !canSee(row, user)) throw GMMarketError("not_found", "Listing not found", 404);
    return row;
  }

  function findOwned(id, user) {
    const row = findVisible(id, user);
    if (!isOwnerRow(row, user)) throw GMMarketError("forbidden", "Not the owner", 403);
    return row;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(GMMarketError("validation", "Invalid image", 422, { images: "invalid" }));
      };
      img.src = url;
    });
  }

  async function mockResolveImages(images, keepable) {
    const kept = images.filter((item) => typeof item === "string");
    kept.forEach((url) => {
      if (keepable.indexOf(url) === -1) throw GMMarketError("validation", "Invalid image", 422, { images: "invalid" });
    });
    const added = await Promise.all(images.filter(isFile).map(fileToDataUrl));
    return kept.concat(added);
  }

  async function mockFetchPage(p) {
    const mode = await mockGate(300);
    if (mode === "empty") return { data: [], next_cursor: null, has_more: false, total: 0 };

    const user = currentUser();
    const saved = readSaved();

    let rows = allRows().filter((row) => row.status === "approved");
    if (p.saved) rows = rows.filter((row) => saved.indexOf(row.listing_id) !== -1);
    if (p.region) rows = rows.filter((row) => row.region === p.region);
    if (p.category) rows = rows.filter((row) => row.category === p.category);
    if (p.condition) rows = rows.filter((row) => row.condition === p.condition);
    if (p.q) {
      const needle = squash(p.q);
      if (needle) rows = rows.filter((row) => squash(row.title).indexOf(needle) !== -1);
    }
    rows.sort(compareNewestFirst);

    const total = rows.length;
    const cursor = p.cursor ? decodeCursor(p.cursor) : null;
    if (cursor) {
      rows = rows.filter((row) => sortKey(row) < cursor.key || (sortKey(row) === cursor.key && row.listing_id < cursor.id));
    }

    const pageRows = rows.slice(0, p.limit);
    const hasMore = rows.length > p.limit;

    return {
      data: pageRows.map((row) => toView(row, user, saved)),
      next_cursor: hasMore ? encodeCursor(pageRows[pageRows.length - 1]) : null,
      has_more: hasMore,
      total: total,
    };
  }

  async function mockFetchMine() {
    await mockGate(250);
    const user = requireUser();
    const saved = readSaved();
    const rows = loadUserRows().filter((row) => isOwnerRow(row, user));
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { data: rows.map((row) => toView(row, user, saved)) };
  }

  async function mockFetchOne(id) {
    await mockGate(250);
    const user = currentUser();
    return { data: toView(findVisible(id, user), user, readSaved()) };
  }

  async function mockFetchSimilar(id, limit) {
    await mockGate(250);
    const user = currentUser();
    const base = findVisible(id, user);
    const saved = readSaved();
    const rows = allRows()
      .filter((row) => row.status === "approved" && row.listing_id !== base.listing_id && row.category === base.category)
      .sort((a, b) => {
        const ra = a.region === base.region ? 0 : 1;
        const rb = b.region === base.region ? 0 : 1;
        return ra !== rb ? ra - rb : compareNewestFirst(a, b);
      })
      .slice(0, limit);
    return { data: rows.map((row) => toView(row, user, saved)) };
  }

  async function mockCreate(value) {
    await mockGate(500);
    const user = requireUser();
    const images = await mockResolveImages(value.images, []);
    const now = new Date().toISOString();
    const id = window.GM_ID && typeof window.GM_ID.generate === "function"
      ? window.GM_ID.generate("mkt")
      : "mkt_" + Date.now().toString(36);

    const row = {
      listing_id: id,
      title: value.title,
      category: value.category,
      condition: value.condition,
      description: value.description,
      price: value.price,
      negotiable: value.negotiable,
      region: value.region,
      phone: value.phone,
      whatsapp: value.whatsapp,
      images: images,
      status: "pending",
      created_at: now,
      approved_at: null,
      owner_key: ownerKeyOf(user.phone),
      seller: { name: user.name, avatar: user.avatar, member_since: now },
    };

    const rows = loadUserRows();
    rows.push(row);
    saveUserRows(rows);
    return { data: toView(row, user, readSaved()) };
  }

  async function mockUpdate(id, value) {
    await mockGate(500);
    const user = requireUser();
    const row = findOwned(id, user);
    if (row.status !== "pending") throw GMMarketError("forbidden", "listing_locked", 403);

    const images = await mockResolveImages(value.images, row.images);
    const rows = loadUserRows();
    const index = rows.findIndex((item) => item.listing_id === id);
    if (index === -1) throw GMMarketError("not_found", "Listing not found", 404);

    rows[index] = Object.assign({}, rows[index], {
      title: value.title,
      category: value.category,
      condition: value.condition,
      description: value.description,
      price: value.price,
      negotiable: value.negotiable,
      region: value.region,
      phone: value.phone,
      whatsapp: value.whatsapp,
      images: images,
    });
    saveUserRows(rows);
    return { data: toView(rows[index], user, readSaved()) };
  }

  async function mockRemoveOwned(id, requiredStatus, lockedMessage) {
    await mockGate(300);
    const user = requireUser();
    const row = findOwned(id, user);
    if (row.status !== requiredStatus) throw GMMarketError("forbidden", lockedMessage, 403);
    saveUserRows(loadUserRows().filter((item) => item.listing_id !== id));
    writeSaved(readSaved().filter((savedId) => savedId !== id));
    return {};
  }

  async function mockSetSaved(id, saved) {
    await mockGate(200);
    const user = requireUser();
    const row = findVisible(id, user);
    const list = readSaved().filter((savedId) => savedId !== row.listing_id);
    if (saved) list.push(row.listing_id);
    writeSaved(list);
    return { saved: !!saved };
  }

  function devApprove(id) {
    const rows = loadUserRows();
    const index = rows.findIndex((row) => row.listing_id === id);
    if (index === -1 || rows[index].status !== "pending") return false;
    rows[index] = Object.assign({}, rows[index], { status: "approved", approved_at: new Date().toISOString() });
    saveUserRows(rows);
    return true;
  }

  function devReject(id) {
    const rows = loadUserRows();
    const next = rows.filter((row) => row.listing_id !== id);
    if (next.length === rows.length) return false;
    saveUserRows(next);
    return true;
  }

  function devReset() {
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(SAVED_KEY);
    } catch (err) {}
    return true;
  }

  function devList() {
    return loadUserRows().map((row) => ({ listing_id: row.listing_id, title: row.title, status: row.status }));
  }

  function throwIfInvalid(check) {
    if (!check.valid) throw GMMarketError("validation", "Invalid listing", 422, check.errors);
  }

  async function fetchPage(params) {
    const p = cleanParams(params);
    const json = USE_MOCK ? await mockFetchPage(p) : await apiFetchPage(p);
    return normalizePage(json);
  }

  async function fetchMine() {
    const json = USE_MOCK ? await mockFetchMine() : await apiFetchMine();
    return normalizeList(json);
  }

  async function fetchOne(id) {
    const cleaned = cleanId(id);
    const json = USE_MOCK ? await mockFetchOne(cleaned) : await apiFetchOne(cleaned);
    return normalizeSingle(json);
  }

  async function fetchSimilar(id, limit) {
    const cleaned = cleanId(id);
    const size = clamp(Math.floor(Number(limit)) || SIMILAR_DEFAULT, 1, SIMILAR_MAX);
    const json = USE_MOCK ? await mockFetchSimilar(cleaned, size) : await apiFetchSimilar(cleaned, size);
    return normalizeList(json);
  }

  async function create(payload) {
    const check = validate(payload);
    throwIfInvalid(check);
    const json = USE_MOCK ? await mockCreate(check.value) : await apiCreate(check.value);
    return normalizeSingle(json);
  }

  async function update(id, payload) {
    const cleaned = cleanId(id);
    const check = validate(payload);
    throwIfInvalid(check);
    const json = USE_MOCK ? await mockUpdate(cleaned, check.value) : await apiUpdate(cleaned, check.value);
    return normalizeSingle(json);
  }

  async function remove(id) {
    const cleaned = cleanId(id);
    if (USE_MOCK) await mockRemoveOwned(cleaned, "pending", "listing_locked");
    else await apiRemove(cleaned);
    return true;
  }

  async function markSold(id) {
    const cleaned = cleanId(id);
    if (USE_MOCK) await mockRemoveOwned(cleaned, "approved", "listing_not_approved");
    else await apiMarkSold(cleaned);
    return true;
  }

  async function setSaved(id, saved) {
    const cleaned = cleanId(id);
    const json = USE_MOCK ? await mockSetSaved(cleaned, !!saved) : await apiSetSaved(cleaned, !!saved);
    return normalizeSaved(json);
  }

  window.GMMarket = Object.freeze({
    isMock: USE_MOCK,
    categories: CATEGORIES,
    conditions: CONDITIONS,
    maxImages: MAX_IMAGES,
    maxImageBytes: MAX_IMAGE_BYTES,
    imageTypes: IMAGE_TYPES,
    limits: LIMITS,
    validate: validate,
    fetchPage: fetchPage,
    fetchMine: fetchMine,
    fetchOne: fetchOne,
    fetchSimilar: fetchSimilar,
    create: create,
    update: update,
    remove: remove,
    markSold: markSold,
    setSaved: setSaved,
    dev: USE_MOCK
    ? Object.freeze({ approve: devApprove, reject: devReject, reset: devReset, list: devList })
    : null,
});
})();