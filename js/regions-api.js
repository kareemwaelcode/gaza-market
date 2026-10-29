"use strict";
// regions-api.js: single source of truth for the list of regions (areas) on the client.
//
// - list() / grouped() are SYNCHRONOUS: they return the last cached API list, or the built-in
//   fallback list, so pages can render immediately and never show an empty region menu.
// - refresh() fetches GET /api/regions in the background (live mode only), validates the data,
//   caches it (stale-while-revalidate) and fires "gmRegionsUpdated" if it changed.
//   Pages that render once at load pick up a new list on the next page load.
// - Region codes (Nuseirat, DeirBalah, ...) are stable identifiers. Only names/order/new areas
//   come from the API. normalize() accepts every legacy spelling used in the old pages.
(function () {
  const DEFAULTS = {
    API_BASE: "/api",
    TIMEOUT_MS: 8000,
  };

  const CONFIG = Object.assign({}, DEFAULTS, window.GM_CONFIG || {});
  const API_BASE = String(CONFIG.API_BASE).replace(/\/+$/, "");
  const USE_MOCK = !!(window.GM_ENV && window.GM_ENV.isMockAllowed());

  const CACHE_KEY = "gm_regions_cache_v1";
  const FRESH_MS = 60 * 60 * 1000;
  const CODE_RE = /^[A-Za-z][A-Za-z0-9]{1,39}$/;
  const NAME_MAX = 60;
  const LIST_MAX = 200;

  // Fixed groups. i18n keys already exist in translations.js.
  const GROUPS = Object.freeze([
    Object.freeze({ code: "central", i18n: "CentralGaza" }),
    Object.freeze({ code: "south", i18n: "SouthGaza" }),
    Object.freeze({ code: "north", i18n: "NorthGaza" }),
  ]);
  const GROUP_CODES = GROUPS.map((g) => g.code);

  // Built-in fallback: used when there is no cache yet and in mock mode.
  const FALLBACK = [
    { code: "Nuseirat", group: "central", name_ar: "النصيرات", name_en: "Nuseirat" },
    { code: "Breij", group: "central", name_ar: "البريج", name_en: "Breij" },
    { code: "Maghazi", group: "central", name_ar: "المغازي", name_en: "Maghazi" },
    { code: "Zawayda", group: "central", name_ar: "الزوايدة", name_en: "Zawayda" },
    { code: "DeirBalah", group: "central", name_ar: "دير البلح", name_en: "Deir al-Balah" },
    { code: "KhanYunis", group: "south", name_ar: "خان يونس", name_en: "Khan Yunis" },
    { code: "Rafah", group: "south", name_ar: "رفح", name_en: "Rafah" },
    { code: "MawasiKhanYunis", group: "south", name_ar: "المواصي خان يونس", name_en: "Mawasi Khan Yunis" },
    { code: "MawasiQarara", group: "south", name_ar: "المواصي القرارة", name_en: "Mawasi al-Qarara" },
    { code: "Alrimal", group: "north", name_ar: "الرمال", name_en: "Al-Rimal" },
    { code: "Alshaati", group: "north", name_ar: "الشاطئ", name_en: "Al-Shati" },
    { code: "SheikhRadwan", group: "north", name_ar: "الشيخ رضوان", name_en: "Sheikh Radwan" },
    { code: "Saftawi", group: "north", name_ar: "الصفطاوي", name_en: "Al-Saftawi" },
    { code: "BeitHanoun", group: "north", name_ar: "بيت حانون", name_en: "Beit Hanoun" },
    { code: "BeitLahia", group: "north", name_ar: "بيت لاهيا", name_en: "Beit Lahia" },
    { code: "TalHawa", group: "north", name_ar: "تل الهوا", name_en: "Tal Al-Hawa" },
    { code: "Jabalia", group: "north", name_ar: "جباليا", name_en: "Jabalia" },
  ];

  // Old spellings still used by some pages (add-store, add-price modals, saved selections).
  // They are only used to map a legacy value to a stable code.
  const LEGACY_ALIASES = {
    Nuseirat: ["Al-Nuseirat"],
    Breij: ["Al-Bureij", "Bureij", "Al-Breij"],
    Maghazi: ["Al-Maghazi"],
    Zawayda: ["Al-Zawayda"],
    DeirBalah: ["Deir Al Balah", "Deir al-Balah"],
    KhanYunis: ["Khan Younis"],
    MawasiKhanYunis: ["Mawasi-Khan Yunis", "Al-Mawasi Khan Yunis"],
    MawasiQarara: ["Mawasi Al-Qarara", "Al-Mawasi Al-Qararah", "Al-Mawasi Al-Qarara"],
    Alrimal: ["Al-Rimal"],
    Alshaati: ["Al-Shati", "Al-Shaati", "Alshati"],
    Saftawi: ["Al-Saftawi"],
    TalHawa: ["Tel al-Hawa", "Tal al-Hawa", "تل الهوى"],
  };

  // Lowercase letters/digits only (Unicode aware, so Arabic names work too).
  function squash(value) {
    return String(value)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0640]/g, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
  }

  function cleanName(value) {
    if (typeof value !== "string") return "";
    const text = value.replace(/\s+/g, " ").trim();
    return text.length > NAME_MAX ? text.slice(0, NAME_MAX).trim() : text;
  }

  // Keeps only well-formed entries, so a bad API response can never break the menus.
  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (let i = 0; i < raw.length && out.length < LIST_MAX; i++) {
      const r = raw[i];
      if (!r || typeof r !== "object") continue;
      const code = typeof r.code === "string" ? r.code : "";
      const nameAr = cleanName(r.name_ar);
      const nameEn = cleanName(r.name_en);
      if (!CODE_RE.test(code) || seen.has(code)) continue;
      if (GROUP_CODES.indexOf(r.group) === -1) continue;
      if (!nameAr || !nameEn) continue;
      seen.add(code);
      out.push({ code: code, group: r.group, name_ar: nameAr, name_en: nameEn });
    }
    return out;
  }

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return null;
      const list = sanitize(parsed.list);
      if (!list.length) return null;
      return { t: Number(parsed.t) || 0, list: list };
    } catch (err) {
      return null;
    }
  }

  function writeCache(list) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), list: list }));
    } catch (err) {}
  }

  let current = FALLBACK;
  let lookup = new Map();
  let cacheTime = 0;

  function buildLookup() {
    const map = new Map();
    const add = (text, code) => {
      const key = squash(text);
      if (key && !map.has(key)) map.set(key, code);
    };
    current.forEach((r) => add(r.code, r.code));
    current.forEach((r) => {
      add(r.name_en, r.code);
      add(r.name_ar, r.code);
      (LEGACY_ALIASES[r.code] || []).forEach((a) => add(a, r.code));
    });
    lookup = map;
  }

  if (!USE_MOCK) {
    const cached = readCache();
    if (cached) {
      current = cached.list;
      cacheTime = cached.t;
    }
  }
  buildLookup();

  function list() {
    return current.map((r) => Object.assign({}, r));
  }

  function grouped() {
    return GROUPS.map((g) => ({
      group: g,
      regions: current.filter((r) => r.group === g.code).map((r) => Object.assign({}, r)),
    })).filter((entry) => entry.regions.length);
  }

  function normalize(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    return lookup.get(squash(raw)) || null;
  }

  function isValid(code) {
    return typeof code === "string" && current.some((r) => r.code === code);
  }

  function label(code, lang) {
    const r = current.find((x) => x.code === code);
    if (!r) return code;
    return lang === "en" ? r.name_en : r.name_ar;
  }

  let inflight = null;

  function fetchList() {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS) : null;
    return fetch(API_BASE + "/regions", {
      method: "GET",
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      credentials: "same-origin",
      signal: controller ? controller.signal : undefined,
    })
      .then((response) => {
        if (!response.ok) throw new Error("regions http " + response.status);
        return response.json();
      })
      .then((body) => sanitize(body && body.data))
      .then(
        (result) => { window.clearTimeout(timer); return result; },
        (err) => { window.clearTimeout(timer); throw err; }
      );
  }

  // Resolves with true when the list changed, false otherwise. Never rejects.
  function refresh() {
    if (USE_MOCK) return Promise.resolve(false);
    if (inflight) return inflight;
    inflight = fetchList()
      .then((fresh) => {
        if (!fresh.length) return false;
        writeCache(fresh);
        cacheTime = Date.now();
        const changed = JSON.stringify(fresh) !== JSON.stringify(current);
        if (changed) {
          current = fresh;
          buildLookup();
          document.dispatchEvent(new CustomEvent("gmRegionsUpdated"));
        }
        return changed;
      })
      .catch(() => false)
      .then((changed) => { inflight = null; return changed; });
    return inflight;
  }

  if (!USE_MOCK && Date.now() - cacheTime > FRESH_MS) refresh();

  window.GMRegions = Object.freeze({
    mode: USE_MOCK ? "mock" : "live",
    groups: GROUPS,
    list: list,
    grouped: grouped,
    normalize: normalize,
    isValid: isValid,
    label: label,
    refresh: refresh,
  });
})();