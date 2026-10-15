(function () {
  'use strict';

  var CONFIG = {
    USE_MOCK: true,
    BASE_URL: '/api/auth',
    CSRF_URL: '/sanctum/csrf-cookie',
    TIMEOUT_MS: 15000
  };

  var PASSWORD_MIN_LENGTH = 8;
  // Mock mode only. In live mode the session lives in the server's HttpOnly cookie and this key is purged.
  var MOCK_SESSION_KEY = 'gmDashboardSession';

  function ok(data) {
    return { ok: true, data: data || {} };
  }

  function fail(code, data) {
    return { ok: false, code: code, data: data || {} };
  }

  function secureRandomInt(min, max) {
    var range = max - min + 1;
    var cryptoObj = window.crypto || window.msCrypto;
    if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
      throw new Error('Secure random generator is unavailable');
    }
    var limit = Math.floor(4294967296 / range) * range;
    var buf = new Uint32Array(1);
    do {
      cryptoObj.getRandomValues(buf);
    } while (buf[0] >= limit);
    return min + (buf[0] % range);
  }

  function secureRandomString(length) {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var out = '';
    for (var i = 0; i < length; i++) out += alphabet.charAt(secureRandomInt(0, alphabet.length - 1));
    return out;
  }

  function isValidPassword(password) {
    var value = String(password || '');
    return value.length >= PASSWORD_MIN_LENGTH &&
      /[A-Za-z\u0600-\u06FF]/.test(value) &&
      /[0-9]/.test(value);
  }

  function createLiveDriver() {
    var csrfPromise = null;

    try { window.localStorage.removeItem(MOCK_SESSION_KEY); } catch (err) {}

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
        var init = {
          method: method,
          headers: headers,
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller ? controller.signal : undefined
        };
        if (method !== 'GET') {
          headers['Content-Type'] = 'application/json';
          var xsrf = getXsrfToken();
          if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
          init.body = JSON.stringify(body || {});
        }
        return fetch(CONFIG.BASE_URL + path, init);
      }).then(function (response) {
        return response.json().then(
          function (payload) { return { status: response.status, payload: payload }; },
          function () { return { status: response.status, payload: {} }; }
        );
      }).catch(function () {
        return { status: 0, payload: {} };
      }).then(function (result) {
        window.clearTimeout(timer);
        return result;
      });
    }

    function request(method, path, body) {
      return send(method, path, body).then(function (res) {
        // 419 = Laravel CSRF/session mismatch: refresh the CSRF cookie and retry once.
        if (res.status === 419 && method !== 'GET') {
          return ensureCsrfCookie(true).then(function () { return send(method, path, body); });
        }
        return res;
      });
    }

    function post(path, body) {
      return request('POST', path, body);
    }

    function toResult(res, mapData) {
      var body = res.payload || {};

      if (res.status === 0) return fail('NETWORK');

      if (res.status >= 200 && res.status < 300) {
        return ok(mapData ? mapData(body.data || {}) : {});
      }

      var code = body.code;
      if (!code) {
        code = res.status === 401 ? 'UNAUTHENTICATED' : (res.status === 429 ? 'RATE_LIMITED' : 'SERVER');
      }
      return fail(code, { attemptsLeft: body.attempts_left, retryAfter: body.retry_after });
    }

    return {
      login: function (whatsapp, password) {
        return post('/login', { whatsapp: whatsapp, password: password }).then(function (res) {
          return toResult(res, function (d) {
            return {
              whatsapp: (d.user && d.user.whatsapp) || whatsapp
            };
          });
        });
      },

      requestResetCode: function (whatsapp) {
        return post('/password/forgot', { whatsapp: whatsapp }).then(function (res) {
          return toResult(res, function (d) {
            var now = Date.now();
            return {
              expiresAt: now + (d.expires_in || 600) * 1000,
              resendAt: now + (d.resend_in || 60) * 1000
            };
          });
        });
      },

      verifyResetCode: function (whatsapp, code) {
        return post('/password/verify-code', { whatsapp: whatsapp, code: code }).then(function (res) {
          return toResult(res, function (d) {
            return {
              token: d.reset_token,
              expiresAt: Date.now() + (d.expires_in || 900) * 1000
            };
          });
        });
      },

      resetPassword: function (whatsapp, resetToken, password, passwordConfirmation) {
        return post('/password/reset', {
          whatsapp: whatsapp,
          reset_token: resetToken,
          password: password,
          password_confirmation: passwordConfirmation
        }).then(function (res) {
          return toResult(res);
        });
      },

      me: function () {
        return request('GET', '/me').then(function (res) {
          return toResult(res, function (d) {
            return { whatsapp: (d.user && d.user.whatsapp) || '' };
          });
        });
      },

      logout: function () {
        return post('/logout', {}).then(function (res) {
          if (res.status === 401) return ok();
          return toResult(res);
        });
      }
    };
  }

  function createMockDriver() {
    var USERS_KEY = 'gmDashboardAuthUsers';
    var MOCK_REQUEST_KEY = 'gmMockResetRequest';
    var MOCK_TOKEN_KEY = 'gmMockResetToken';

    var DELAY_MS = 600;
    var WHATSAPP_PATTERN = /^(970|972)\d{9}$/;
    var CODE_TTL_MS = 10 * 60 * 1000;
    var RESEND_COOLDOWN_MS = 60 * 1000;
    var MAX_CODE_ATTEMPTS = 5;
    var RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

    var LOGIN_ATTEMPTS_KEY = 'gmMockLoginAttempts';
    var MAX_LOGIN_ATTEMPTS = 5;
    var LOGIN_LOCK_MS = 5 * 60 * 1000;

    var DEMO_USER = { whatsapp: '970591234567', password: 'Test1234' };

    function read(store, key, fallback) {
      try {
        var raw = window[store].getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        return fallback;
      }
    }

    function write(store, key, value) {
      try {
        window[store].setItem(key, JSON.stringify(value));
      } catch (err) {}
    }

    function remove(store, key) {
      try {
        window[store].removeItem(key);
      } catch (err) {}
    }

    function getUsers() {
      var list = read('localStorage', USERS_KEY, []);
      return Array.isArray(list) ? list : [];
    }

    function setUsers(list) {
      write('localStorage', USERS_KEY, list);
    }

    function seedDemoUser() {
      if (getUsers().length) return;
      setUsers([{ whatsapp: DEMO_USER.whatsapp, password: DEMO_USER.password }]);
    }

    function findUser(whatsapp) {
      var users = getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].whatsapp === whatsapp) return users[i];
      }
      return null;
    }

    function generateResetCode() {
      return String(secureRandomInt(100000, 999999));
    }

    function generateResetTokenValue() {
      return 'rst_' + secureRandomString(32);
    }

    function getLoginAttempts() {
      var state = read('localStorage', LOGIN_ATTEMPTS_KEY, null);
      if (!state || typeof state !== 'object') return { count: 0, lockedUntil: 0 };
      return {
        count: typeof state.count === 'number' ? state.count : 0,
        lockedUntil: typeof state.lockedUntil === 'number' ? state.lockedUntil : 0
      };
    }

    function later(fn) {
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          try {
            resolve(fn());
          } catch (err) {
            resolve(fail('SERVER'));
          }
        }, DELAY_MS);
      });
    }

    var SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    var CLOCK_SKEW_MS = 5 * 60 * 1000;

    function readMockSession() {
      var s = read('localStorage', MOCK_SESSION_KEY, null);
      if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
      if (typeof s.whatsapp !== 'string' || !WHATSAPP_PATTERN.test(s.whatsapp)) return null;
      if (typeof s.loggedInAt !== 'number' || !isFinite(s.loggedInAt)) return null;
      var now = Date.now();
      if (s.loggedInAt > now + CLOCK_SKEW_MS || now - s.loggedInAt > SESSION_MAX_AGE_MS) return null;
      return s;
    }

    seedDemoUser();

    return {
      login: function (whatsapp, password) {
        return later(function () {
          if (!WHATSAPP_PATTERN.test(whatsapp)) return fail('INVALID_PHONE');

          var attempts = getLoginAttempts();
          var now = Date.now();
          if (attempts.lockedUntil > now) {
            return fail('RATE_LIMITED', { retryAfter: Math.ceil((attempts.lockedUntil - now) / 1000) });
          }
          if (attempts.lockedUntil && attempts.lockedUntil <= now) {
            attempts = { count: 0, lockedUntil: 0 };
          }

          var user = findUser(whatsapp);
          if (!user || user.password !== password) {
            attempts.count += 1;
            if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
              attempts.lockedUntil = now + LOGIN_LOCK_MS;
              attempts.count = 0;
            }
            write('localStorage', LOGIN_ATTEMPTS_KEY, attempts);
            return fail('INVALID_CREDENTIALS');
          }

          remove('localStorage', LOGIN_ATTEMPTS_KEY);
          write('localStorage', MOCK_SESSION_KEY, { whatsapp: user.whatsapp, loggedInAt: Date.now() });
          return ok({ whatsapp: user.whatsapp });
        });
      },

      requestResetCode: function (whatsapp) {
        return later(function () {
          if (!WHATSAPP_PATTERN.test(whatsapp)) return fail('INVALID_PHONE');

          var now = Date.now();
          var registered = !!findUser(whatsapp);
          var state = {
            whatsapp: whatsapp,
            code: registered ? generateResetCode() : null,
            expiresAt: now + CODE_TTL_MS,
            attempts: 0
          };
          write('sessionStorage', MOCK_REQUEST_KEY, state);

          return ok({
            expiresAt: state.expiresAt,
            resendAt: now + RESEND_COOLDOWN_MS
          });
        });
      },

      verifyResetCode: function (whatsapp, code) {
        return later(function () {
          var state = read('sessionStorage', MOCK_REQUEST_KEY, null);

          if (!state || state.whatsapp !== whatsapp) return fail('REQUEST_NOT_FOUND');
          if (Date.now() > state.expiresAt) return fail('CODE_EXPIRED');
          if (state.attempts >= MAX_CODE_ATTEMPTS) return fail('TOO_MANY_ATTEMPTS');

          if (!state.code || String(code) !== state.code) {
            state.attempts += 1;
            write('sessionStorage', MOCK_REQUEST_KEY, state);
            return fail('INVALID_CODE', { attemptsLeft: MAX_CODE_ATTEMPTS - state.attempts });
          }

          var tokenData = {
            whatsapp: whatsapp,
            token: generateResetTokenValue(),
            expiresAt: Date.now() + RESET_TOKEN_TTL_MS
          };
          write('sessionStorage', MOCK_TOKEN_KEY, tokenData);
          remove('sessionStorage', MOCK_REQUEST_KEY);

          return ok({ token: tokenData.token, expiresAt: tokenData.expiresAt });
        });
      },

      resetPassword: function (whatsapp, resetToken, password, passwordConfirmation) {
        return later(function () {
          var stored = read('sessionStorage', MOCK_TOKEN_KEY, null);

          if (!stored || stored.token !== resetToken || stored.whatsapp !== whatsapp ||
              Date.now() > stored.expiresAt) {
            return fail('INVALID_TOKEN');
          }
          if (password !== passwordConfirmation) return fail('PASSWORD_MISMATCH');
          if (!isValidPassword(password)) return fail('WEAK_PASSWORD');

          var users = getUsers();
          var found = false;
          for (var i = 0; i < users.length; i++) {
            if (users[i].whatsapp === whatsapp) {
              users[i].password = password;
              found = true;
              break;
            }
          }
          if (!found) return fail('INVALID_TOKEN');

          setUsers(users);
          remove('sessionStorage', MOCK_TOKEN_KEY);
          return ok();
        });
      },

      me: function () {
        var s = readMockSession();
        return Promise.resolve(s ? ok({ whatsapp: s.whatsapp }) : fail('UNAUTHENTICATED'));
      },

      logout: function () {
        remove('localStorage', MOCK_SESSION_KEY);
        return later(function () {
          return ok();
        });
      }
    };
  }

  function createBlockedDriver() {
    function blocked() {
      return Promise.resolve(fail('SERVER'));
    }
    return {
      login: blocked,
      requestResetCode: blocked,
      verifyResetCode: blocked,
      resetPassword: blocked,
      me: function () { return Promise.resolve(fail('UNAUTHENTICATED')); },
      logout: function () { return Promise.resolve(ok()); }
    };
  }

  var mockAllowed = !!(window.GM_ENV && window.GM_ENV.isMockAllowed());
  var mockBlocked = CONFIG.USE_MOCK && !mockAllowed;
  if (mockBlocked && window.console) {
    console.error('[GMAuthApi] Mock auth is disabled on this host. Set USE_MOCK to false once the backend is ready.');
  }

  var driver = CONFIG.USE_MOCK
    ? (mockBlocked ? createBlockedDriver() : createMockDriver())
    : createLiveDriver();

  window.GMAuthApi = {
    mode: CONFIG.USE_MOCK ? (mockBlocked ? 'blocked' : 'mock') : 'live',
    passwordMinLength: PASSWORD_MIN_LENGTH,
    isValidPassword: isValidPassword,
    login: driver.login,
    requestResetCode: driver.requestResetCode,
    verifyResetCode: driver.verifyResetCode,
    resetPassword: driver.resetPassword,
    me: driver.me,
    logout: driver.logout
  };
})();