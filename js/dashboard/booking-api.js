(function () {
  'use strict';

  // Dashboard API for tables and table reservations.
  // Contract: tables-reservations-api-contract.md (v4). Same style as dashboard-users/auth/auth-api.js:
  // every method returns a Promise that always resolves to { ok, data } or { ok: false, code, data }.
  // It never throws and never touches the DOM.
  //
  // Failure codes: NETWORK, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, VALIDATION, RATE_LIMITED, SERVER.
  // fail().data.reason carries the server "code" when present:
  //   plan_limit_reached (403), table_unavailable (409), invalid_transition (422).
  // fail().data.errors (VALIDATION only) maps field -> short code, e.g. { name: 'required', seats: 'invalid' }.

  var CONFIG = {
    USE_MOCK: true,
    BASE_URL: '/api/dashboard',
    CSRF_URL: '/sanctum/csrf-cookie',
    TIMEOUT_MS: 15000,
    GET_RETRY_DELAY_MS: 400
  };

  var SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  var TABLE_NAME_MAX = 40;
  var DEFAULT_LIMIT = 20;
  var MAX_LIMIT = 50;
  var TABLE_STATUSES = ['available', 'occupied'];
  var RESERVATION_TARGETS = ['confirmed', 'cancelled'];
  var RESERVATION_FILTERS = ['pending', 'confirmed', 'cancelled'];
  var SEARCH_MAX = 80;

  function ok(data) {
    return { ok: true, data: data || {} };
  }

  function fail(code, data) {
    return { ok: false, code: code, data: data || {} };
  }

  function codeFromStatus(status) {
    if (status === 0) return 'NETWORK';
    if (status === 401 || status === 419) return 'UNAUTHENTICATED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 422) return 'VALIDATION';
    if (status === 429) return 'RATE_LIMITED';
    return 'SERVER';
  }

  function isSafeId(value) {
    return typeof value === 'string' && SAFE_ID_RE.test(value);
  }

  function toInt(value) {
    var n = Number(value);
    return isFinite(n) ? Math.floor(n) : NaN;
  }

  function limitOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    var n = toInt(value);
    return isFinite(n) && n >= 0 ? n : null;
  }

  function countOf(value) {
    var n = toInt(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  // ---------- Normalizers (server shape -> clean shape for the pages) ----------

  function normalizeTable(raw) {
    if (!raw || !isSafeId(String(raw.id)) || typeof raw.name !== 'string' || !raw.name.trim()) return null;
    var seats = toInt(raw.seats);
    return {
      id: String(raw.id),
      name: raw.name.trim().slice(0, TABLE_NAME_MAX),
      seats: isFinite(seats) && seats >= 1 ? seats : null,
      status: raw.status === 'occupied' ? 'occupied' : 'available'
    };
  }

  function toIso(value) {
    if (value === null || value === undefined || value === '') return '';
    var d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  function normalizeReservation(raw) {
    if (!raw || !isSafeId(String(raw.id)) || typeof raw.name !== 'string') return null;
    var people = toInt(raw.peopleCount);
    var table = null;
    if (raw.table && isSafeId(String(raw.table.id)) && typeof raw.table.name === 'string') {
      table = { id: String(raw.table.id), name: raw.table.name };
    }
    var status = raw.status === 'confirmed' || raw.status === 'cancelled' ? raw.status : 'pending';
    return {
      id: String(raw.id),
      name: raw.name,
      countryCode: String(raw.countryCode || '970'),
      whatsapp: String(raw.whatsapp || ''),
      datetime: toIso(raw.datetime),
      peopleCount: isFinite(people) && people >= 1 ? people : null,
      tableId: raw.tableId === null || raw.tableId === undefined || raw.tableId === '' ? null : String(raw.tableId),
      table: table,
      tableDeleted: raw.tableDeleted === true,
      note: typeof raw.note === 'string' ? raw.note : '',
      status: status,
      createdAt: toIso(raw.createdAt)
    };
  }

  function normalizeList(items, mapper) {
    var out = [];
    (Array.isArray(items) ? items : []).forEach(function (item) {
      var mapped = mapper(item);
      if (mapped) out.push(mapped);
    });
    return out;
  }

  function normalizeCursorMeta(meta) {
    var m = meta && typeof meta === 'object' ? meta : {};
    var next = m.next_cursor ? String(m.next_cursor) : null;
    var total = toInt(m.total);
    return {
      nextCursor: next,
      hasMore: !!m.has_more && !!next,
      total: isFinite(total) && total >= 0 ? total : null
    };
  }

  // ---------- Input validation (shared by live and mock) ----------

  function validateTableInput(input, partial) {
    var src = input || {};
    var errors = {};
    var payload = {};

    if (!partial || src.name !== undefined) {
      var name = String(src.name === undefined || src.name === null ? '' : src.name).replace(/\s+/g, ' ').trim();
      if (!name) errors.name = 'required';
      else if (name.length > TABLE_NAME_MAX) errors.name = 'too_long';
      else payload.name = name;
    }

    if (!partial || src.seats !== undefined) {
      if (src.seats === null || src.seats === '' || src.seats === undefined) {
        payload.seats = null;
      } else {
        var seats = toInt(src.seats);
        if (!isFinite(seats) || seats < 1) errors.seats = 'invalid';
        else payload.seats = seats;
      }
    }

    if (!partial || src.status !== undefined) {
      var status = src.status === undefined ? 'available' : src.status;
      if (TABLE_STATUSES.indexOf(status) === -1) errors.status = 'invalid';
      else payload.status = status;
    }

    if (partial && !Object.keys(errors).length && !Object.keys(payload).length) errors.name = 'required';

    return Object.keys(errors).length ? { errors: errors, payload: null } : { errors: null, payload: payload };
  }

  function cleanListParams(params) {
    var p = params || {};
    var limit = toInt(p.limit);
    return {
      status: RESERVATION_FILTERS.indexOf(p.status) !== -1 ? p.status : '',
      q: String(p.q === undefined || p.q === null ? '' : p.q).replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX),
      cursor: p.cursor ? String(p.cursor) : '',
      limit: isFinite(limit) && limit >= 1 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT
    };
  }

  // ---------- Live driver (Laravel + Sanctum cookies) ----------

  function createLiveDriver() {
    var csrfPromise = null;

    function getXsrfToken() {
      var match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    }

    function ensureCsrfCookie(force) {
      if (!force && getXsrfToken()) return Promise.resolve();
      if (!csrfPromise) {
        csrfPromise = fetch(CONFIG.CSRF_URL, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'same-origin',
          cache: 'no-store'
        }).then(function () {}, function () {}).then(function () { csrfPromise = null; });
      }
      return csrfPromise;
    }

    function send(method, path, body) {
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = controller
        ? window.setTimeout(function () { controller.abort(); }, CONFIG.TIMEOUT_MS)
        : null;

      return ensureCsrfCookie(false).then(function () {
        var headers = {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        };
        var lang = document.documentElement.getAttribute('lang');
        if (lang) headers['Accept-Language'] = lang;
        var init = {
          method: method,
          headers: headers,
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller ? controller.signal : undefined
        };
        if (method !== 'GET') {
          var xsrf = getXsrfToken();
          if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
          if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
          }
        }
        return fetch(CONFIG.BASE_URL + path, init);
      }).then(function (response) {
        var retryAfter = parseInt(response.headers && response.headers.get ? response.headers.get('Retry-After') : '', 10);
        return response.json().then(
          function (payload) { return { status: response.status, payload: payload || {}, retryAfter: retryAfter }; },
          function () { return { status: response.status, payload: {}, retryAfter: retryAfter }; }
        );
      }).catch(function () {
        return { status: 0, payload: {}, retryAfter: NaN };
      }).then(function (result) {
        window.clearTimeout(timer);
        return result;
      });
    }

    function delay(ms) {
      return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
    }

    function request(method, path, body) {
      return send(method, path, body).then(function (res) {
        // 419 = Laravel CSRF/session mismatch: refresh the CSRF cookie and retry once.
        if (res.status === 419 && method !== 'GET') {
          return ensureCsrfCookie(true).then(function () { return send(method, path, body); });
        }
        // Only GET is retried on network/5xx. Writes are never repeated (they may have already happened).
        if (method === 'GET' && (res.status === 0 || res.status >= 500)) {
          return delay(CONFIG.GET_RETRY_DELAY_MS).then(function () { return send(method, path, body); });
        }
        return res;
      });
    }

    function toFailure(res) {
      var body = res.payload || {};
      var data = {
        reason: typeof body.code === 'string' ? body.code : '',
        message: typeof body.message === 'string' ? body.message : '',
        errors: res.status === 422 && body.errors && typeof body.errors === 'object' ? body.errors : null,
        retryAfter: isFinite(res.retryAfter) ? res.retryAfter : null
      };
      return fail(codeFromStatus(res.status), data);
    }

    function done(res, mapData) {
      if (res.status >= 200 && res.status < 300) {
        return ok(mapData ? mapData(res.payload || {}) : {});
      }
      return toFailure(res);
    }

    function query(params) {
      var q = new URLSearchParams();
      Object.keys(params).forEach(function (key) {
        if (params[key] !== '' && params[key] !== null && params[key] !== undefined) q.set(key, String(params[key]));
      });
      var s = q.toString();
      return s ? '?' + s : '';
    }

    function tableOnly(body) {
      var table = normalizeTable(body.data);
      return table ? { table: table } : null;
    }

    function reservationOnly(body) {
      var reservation = normalizeReservation(body.data);
      return reservation ? { reservation: reservation } : null;
    }

    function guarded(res, mapper) {
      if (res.status >= 200 && res.status < 300) {
        var mapped = mapper(res.payload || {});
        return mapped ? ok(mapped) : fail('SERVER', { reason: 'invalid_response' });
      }
      return toFailure(res);
    }

    return {
      tables: {
        list: function () {
          return request('GET', '/tables').then(function (res) {
            return guarded(res, function (body) {
              var meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
              return {
                items: normalizeList(body.data, normalizeTable),
                meta: { limit: limitOrNull(meta.limit), used: countOf(meta.used), hidden: countOf(meta.hidden) }
              };
            });
          });
        },
        create: function (input) {
          var v = validateTableInput(input, false);
          if (v.errors) return Promise.resolve(fail('VALIDATION', { errors: v.errors, reason: '' }));
          return request('POST', '/tables', v.payload).then(function (res) { return guarded(res, tableOnly); });
        },
        update: function (id, input) {
          if (!isSafeId(id)) return Promise.resolve(fail('NOT_FOUND'));
          var v = validateTableInput(input, true);
          if (v.errors) return Promise.resolve(fail('VALIDATION', { errors: v.errors, reason: '' }));
          return request('PATCH', '/tables/' + encodeURIComponent(id), v.payload).then(function (res) { return guarded(res, tableOnly); });
        },
        remove: function (id) {
          if (!isSafeId(id)) return Promise.resolve(fail('NOT_FOUND'));
          return request('DELETE', '/tables/' + encodeURIComponent(id)).then(function (res) { return done(res); });
        }
      },

      reservations: {
        list: function (params) {
          var p = cleanListParams(params);
          return request('GET', '/reservations' + query(p)).then(function (res) {
            return guarded(res, function (body) {
              return { items: normalizeList(body.data, normalizeReservation), meta: normalizeCursorMeta(body.meta) };
            });
          });
        },
        summary: function () {
          return request('GET', '/reservations/summary').then(function (res) {
            return guarded(res, function (body) {
              var d = body.data && typeof body.data === 'object' ? body.data : {};
              return {
                pending: countOf(d.pending),
                confirmed: countOf(d.confirmed),
                total: countOf(d.total),
                limit: limitOrNull(d.limit),
                used: countOf(d.used),
                hidden: countOf(d.hidden)
              };
            });
          });
        },
        setStatus: function (id, status) {
          if (!isSafeId(id)) return Promise.resolve(fail('NOT_FOUND'));
          if (RESERVATION_TARGETS.indexOf(status) === -1) {
            return Promise.resolve(fail('VALIDATION', { errors: { status: 'invalid' }, reason: '' }));
          }
          return request('PATCH', '/reservations/' + encodeURIComponent(id), { status: status }).then(function (res) {
            return guarded(res, reservationOnly);
          });
        },
        remove: function (id) {
          if (!isSafeId(id)) return Promise.resolve(fail('NOT_FOUND'));
          return request('DELETE', '/reservations/' + encodeURIComponent(id)).then(function (res) { return done(res); });
        }
      }
    };
  }

  // ---------- Mock driver (localStorage, mirrors the server rules of the contract) ----------
  // Reads and writes the same scoped keys the current dashboard pages use, so the data stays in one place
  // while the pages are migrated one by one.
  // Test modes (query string): ?gm_test=slow | error | empty | conflict | limit | seed
  // seed: when no reservations are stored, plants 25 reservations (all statuses, one with a deleted table,
  // some old ones without a table). If no tables are stored it also plants 3 tables, and marks the first table
  // as occupied by the confirmed reservation seeded on it.

  function createMockDriver() {
    var RESERVATIONS_KEY = 'gmDashboardReservations';
    var TABLES_KEY = 'gmDashboardTables';
    var DELAY_MS = 300;

    function testMode() {
      try {
        return new URLSearchParams(window.location.search).get('gm_test') || '';
      } catch (err) {
        return '';
      }
    }

    function dash() {
      return window.GMDash || null;
    }

    function readList(key) {
      try {
        var raw = localStorage.getItem(dash().scopedKey(key));
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    }

    function writeList(key, list) {
      localStorage.setItem(dash().scopedKey(key), JSON.stringify(list));
    }

    function readTables() {
      var gm = dash();
      return typeof gm.getStoredTables === 'function' ? gm.getStoredTables() : readList(TABLES_KEY);
    }

    function writeTables(list) {
      var gm = dash();
      if (typeof gm.setStoredTables === 'function') gm.setStoredTables(list);
      else writeList(TABLES_KEY, list);
    }

    function limitFor(key, used) {
      var gm = dash();
      var status = typeof gm.getPlanLimitStatus === 'function' ? gm.getPlanLimitStatus(key, used) : null;
      return status && !status.unlimited ? status.limit : null;
    }

    function later(fn) {
      var mode = testMode();
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          try {
            if (!dash() || typeof dash().scopedKey !== 'function') {
              resolve(fail('SERVER', { reason: 'dashboard_core_missing' }));
              return;
            }
            if (mode === 'error') {
              resolve(fail('SERVER'));
              return;
            }
            resolve(fn(mode));
          } catch (err) {
            resolve(fail('SERVER'));
          }
        }, mode === 'slow' ? 2500 : DELAY_MS);
      });
    }

    // Plan visibility. Tables: newest = last in storage order. Reservations: newest = highest createdAt.
    function visibleTables() {
      var all = readTables();
      var limit = limitFor('tables', all.length);
      var shown = limit === null ? all : all.slice(Math.max(0, all.length - limit));
      return { all: all, shown: shown, limit: limit, hidden: all.length - shown.length };
    }

    function createdAtMs(res) {
      var n = typeof res.createdAt === 'number' ? res.createdAt : Date.parse(res.createdAt);
      return isFinite(n) ? n : 0;
    }

    function visibleReservations() {
      var all = readList(RESERVATIONS_KEY);
      var sorted = all.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
        return createdAtMs(b.r) - createdAtMs(a.r) || a.i - b.i;
      }).map(function (x) { return x.r; });
      var limit = limitFor('reservations', all.length);
      var shown = limit === null ? sorted : sorted.slice(0, limit);
      return { all: all, shown: shown, limit: limit, hidden: all.length - shown.length };
    }

    var SEED_NAMES = [
      'أحمد علي', 'محمد خالد', 'سارة يوسف', 'ليلى حسن', 'عمر إبراهيم', 'نور الدين', 'رنا سمير', 'يوسف محمود',
      'هبة أحمد', 'خالد وليد', 'مريم عادل', 'إسلام ناصر', 'دانا فادي', 'باسل رامي', 'آية محمود', 'كريم سعيد',
      'لينا جمال', 'طارق زياد', 'سلمى عمر', 'حمزة مازن', 'جنى هاني', 'معتز بلال', 'رهف ياسر', 'أنس ماهر', 'شهد نبيل'
    ];

    function pad2(n) {
      return n < 10 ? '0' + n : String(n);
    }

    function seedReservations() {
      if (readList(RESERVATIONS_KEY).length) return;

      var tables = readTables();
      if (!tables.length) {
        tables = [
          { id: 'tbl_seed1', name: 'طاولة 1', seats: 2, status: 'available' },
          { id: 'tbl_seed2', name: 'طاولة 2', seats: 4, status: 'available' },
          { id: 'tbl_seed3', name: 'طاولة 3', seats: 6, status: 'available' }
        ];
      }

      var now = Date.now();
      var HOUR = 3600000;
      var list = SEED_NAMES.map(function (name, i) {
        var status = i % 4 === 1 ? 'confirmed' : (i % 4 === 3 ? 'cancelled' : 'pending');
        var tableId = tables[i % tables.length].id;
        if (i % 5 === 0) tableId = null;
        if (i === 2) tableId = 'tbl_seed_deleted';
        if (status === 'confirmed' && i !== 1) tableId = null;
        if (i === 1) tableId = tables[0].id;
        return {
          id: 'res_seed' + pad2(i + 1),
          name: name,
          countryCode: i % 6 === 5 ? '972' : '970',
          whatsapp: '5991234' + pad2(i + 1),
          datetime: new Date(now + (i + 1) * 5 * HOUR).toISOString(),
          peopleCount: (i % 10) + 1,
          tableId: tableId,
          note: i % 3 === 0 ? 'ملاحظة تجريبية للحجز رقم ' + (i + 1) : '',
          status: status,
          createdAt: now - i * HOUR
        };
      });

      tables[0].status = 'occupied';
      writeTables(tables);
      writeList(RESERVATIONS_KEY, list);
    }

    function tableLookup() {
      var map = Object.create(null);
      readTables().forEach(function (t) { map[t.id] = t; });
      return map;
    }

    function shapeReservation(res, tablesById) {
      var table = res.tableId ? tablesById[res.tableId] || null : null;
      return normalizeReservation({
        id: res.id,
        name: res.name,
        countryCode: res.countryCode,
        whatsapp: res.whatsapp,
        datetime: res.datetime,
        peopleCount: res.peopleCount,
        tableId: res.tableId || null,
        table: table ? { id: table.id, name: table.name } : null,
        tableDeleted: !!res.tableId && !table,
        note: res.note,
        status: res.status,
        createdAt: typeof res.createdAt === 'number' ? new Date(res.createdAt).toISOString() : res.createdAt
      });
    }

    function findVisibleTable(id) {
      var v = visibleTables();
      for (var i = 0; i < v.shown.length; i++) {
        if (v.shown[i].id === id) return v.shown[i];
      }
      return null;
    }

    function findVisibleReservation(id) {
      var v = visibleReservations();
      for (var i = 0; i < v.shown.length; i++) {
        if (v.shown[i].id === id) return v.shown[i];
      }
      return null;
    }

    function newId(prefix) {
      return window.GM_ID && typeof window.GM_ID.generate === 'function'
        ? window.GM_ID.generate(prefix)
        : prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    return {
      tables: {
        list: function () {
          return later(function (mode) {
            var v = visibleTables();
            var items = mode === 'empty' ? [] : normalizeList(v.shown, normalizeTable);
            return ok({ items: items, meta: { limit: v.limit, used: items.length, hidden: mode === 'empty' ? 0 : v.hidden } });
          });
        },
        create: function (input) {
          var v = validateTableInput(input, false);
          if (v.errors) return Promise.resolve(fail('VALIDATION', { errors: v.errors, reason: '' }));
          return later(function (mode) {
            var vis = visibleTables();
            if (mode === 'limit' || (vis.limit !== null && vis.shown.length >= vis.limit)) {
              return fail('FORBIDDEN', { reason: 'plan_limit_reached' });
            }
            var table = { id: newId('tbl'), name: v.payload.name, seats: v.payload.seats, status: v.payload.status };
            var all = vis.all.slice();
            all.push(table);
            writeTables(all);
            return ok({ table: normalizeTable(table) });
          });
        },
        update: function (id, input) {
          if (!isSafeId(id)) return Promise.resolve(fail('NOT_FOUND'));
          var v = validateTableInput(input, true);
          if (v.errors) return Promise.resolve(fail('VALIDATION', { errors: v.errors, reason: '' }));
          return later(function () {
            if (!findVisibleTable(id)) return fail('NOT_FOUND');
            var all = readTables();
            var updated = null;
            for (var i = 0; i < all.length; i++) {
              if (all[i].id === id) {
                Object.keys(v.payload).forEach(function (key) { all[i][key] = v.payload[key]; });
                updated = all[i];
                break;
              }
            }
            if (!updated) return fail('NOT_FOUND');
            writeTables(all);
            return ok({ table: normalizeTable(updated) });
          });
        },
        remove: function (id) {
          if (!isSafeId(id)) return Promise.resolve(fail('NOT_FOUND'));
          return later(function () {
            if (!findVisibleTable(id)) return fail('NOT_FOUND');
            writeTables(readTables().filter(function (t) { return t.id !== id; }));
            return ok();
          });
        }
      },

      reservations: {
        list: function (params) {
          var p = cleanListParams(params);
          return later(function (mode) {
            if (mode === 'seed') seedReservations();
            var v = visibleReservations();
            var needle = p.q.toLowerCase();
            var rows = mode === 'empty' ? [] : v.shown.filter(function (r) {
              if (p.status && r.status !== p.status) return false;
              if (needle && String(r.name || '').toLowerCase().indexOf(needle) === -1) return false;
              return true;
            });
            var offset = p.cursor ? Math.max(0, toInt(p.cursor) || 0) : 0;
            var page = rows.slice(offset, offset + p.limit);
            var hasMore = offset + p.limit < rows.length;
            var tablesById = tableLookup();
            return ok({
              items: normalizeList(page, function (r) { return shapeReservation(r, tablesById); }),
              meta: { nextCursor: hasMore ? String(offset + p.limit) : null, hasMore: hasMore, total: rows.length }
            });
          });
        },
        summary: function () {
          return later(function (mode) {
            if (mode === 'seed') seedReservations();
            var v = visibleReservations();
            var shown = mode === 'empty' ? [] : v.shown;
            var pending = 0;
            var confirmed = 0;
            shown.forEach(function (r) {
              if (r.status === 'pending') pending += 1;
              if (r.status === 'confirmed') confirmed += 1;
            });
            return ok({
              pending: pending,
              confirmed: confirmed,
              total: shown.length,
              limit: v.limit,
              used: shown.length,
              hidden: mode === 'empty' ? 0 : v.hidden
            });
          });
        },
        setStatus: function (id, status) {
          if (!isSafeId(id)) return Promise.resolve(fail('NOT_FOUND'));
          if (RESERVATION_TARGETS.indexOf(status) === -1) {
            return Promise.resolve(fail('VALIDATION', { errors: { status: 'invalid' }, reason: '' }));
          }
          return later(function (mode) {
            var target = findVisibleReservation(id);
            if (!target) return fail('NOT_FOUND');

            var allowed = (target.status === 'pending' && (status === 'confirmed' || status === 'cancelled')) ||
              (target.status === 'confirmed' && status === 'cancelled');
            if (!allowed) return fail('VALIDATION', { reason: 'invalid_transition' });

            var tables = readTables();
            var tableIndex = -1;
            if (target.tableId) {
              for (var t = 0; t < tables.length; t++) {
                if (tables[t].id === target.tableId) { tableIndex = t; break; }
              }
            }

            // Confirming a reservation whose table was deleted (or that never had one) only changes the reservation.
            if (status === 'confirmed' && target.tableId && tableIndex !== -1) {
              var usable = findVisibleTable(target.tableId) && tables[tableIndex].status !== 'occupied';
              if (mode === 'conflict' || !usable) return fail('CONFLICT', { reason: 'table_unavailable' });
              tables[tableIndex].status = 'occupied';
              writeTables(tables);
            } else if (status === 'cancelled' && target.status === 'confirmed' && tableIndex !== -1) {
              tables[tableIndex].status = 'available';
              writeTables(tables);
            }

            var all = readList(RESERVATIONS_KEY);
            var saved = null;
            for (var i = 0; i < all.length; i++) {
              if (all[i].id === id) {
                all[i].status = status;
                saved = all[i];
                break;
              }
            }
            if (!saved) return fail('NOT_FOUND');
            writeList(RESERVATIONS_KEY, all);

            var shaped = shapeReservation(saved, tableLookup());
            return shaped ? ok({ reservation: shaped }) : fail('SERVER');
          });
        },
        remove: function (id) {
          if (!isSafeId(id)) return Promise.resolve(fail('NOT_FOUND'));
          return later(function () {
            var target = findVisibleReservation(id);
            if (!target) return fail('NOT_FOUND');
            if (target.status !== 'cancelled') return fail('VALIDATION', { reason: 'invalid_transition' });

            // A deleted reservation no longer counts toward the plan limit.
            writeList(RESERVATIONS_KEY, readList(RESERVATIONS_KEY).filter(function (r) { return r.id !== id; }));
            return ok();
          });
        }
      }
    };
  }

  function createBlockedDriver() {
    function blocked() {
      return Promise.resolve(fail('SERVER', { reason: 'mock_blocked' }));
    }
    return {
      tables: { list: blocked, create: blocked, update: blocked, remove: blocked },
      reservations: { list: blocked, summary: blocked, setStatus: blocked, remove: blocked }
    };
  }

  var mockAllowed = !!(window.GM_ENV && window.GM_ENV.isMockAllowed());
  var mockBlocked = CONFIG.USE_MOCK && !mockAllowed;
  if (mockBlocked && window.console) {
    console.error('[GMBookingApi] Mock data is disabled on this host. Set USE_MOCK to false once the backend is ready.');
  }

  var driver = CONFIG.USE_MOCK
    ? (mockBlocked ? createBlockedDriver() : createMockDriver())
    : createLiveDriver();

  window.GMBookingApi = {
    mode: CONFIG.USE_MOCK ? (mockBlocked ? 'blocked' : 'mock') : 'live',
    maxLimit: MAX_LIMIT,
    defaultLimit: DEFAULT_LIMIT,
    tables: driver.tables,
    reservations: driver.reservations
  };
})();