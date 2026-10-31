(function () {
  'use strict';

  var LOGOUT_MAX_WAIT_MS = 1500;
  var CHECK_INTERVAL_MS = 60 * 1000;
  var MIN_RECHECK_GAP_MS = 5 * 1000;
  var SIGNAL_KEY = 'gmAuthSignal';

  var scriptEl = document.currentScript;
  var LOGIN_PAGE_URL = scriptEl && scriptEl.src
    ? new URL('login.html', scriptEl.src).href
    : 'auth/login.html';

  var root = document.documentElement;
  var session = null;
  var loggingOut = false;
  var redirecting = false;
  var checking = null;
  var lastCheckAt = 0;

  root.style.visibility = 'hidden';

  function reveal() {
    root.style.visibility = '';
  }

  function redirectToLogin() {
    if (redirecting) return;
    redirecting = true;
    session = null;
    root.style.visibility = 'hidden';
    window.location.replace(LOGIN_PAGE_URL);
  }

  function verify() {
    var api = window.GMAuthApi;
    if (!api || typeof api.me !== 'function') {
      return Promise.resolve({ ok: false, code: 'UNAUTHENTICATED' });
    }
    return api.me().then(function (res) { return res; }, function () {
      return { ok: false, code: 'NETWORK' };
    });
  }

  function check() {
    if (redirecting || loggingOut) return Promise.resolve(session);
    if (checking) return checking;
    lastCheckAt = Date.now();
    checking = verify().then(function (res) {
      checking = null;
      if (res.ok) {
        session = { whatsapp: res.data.whatsapp, verified: true };
        return session;
      }
      if (res.code === 'UNAUTHENTICATED') {
        redirectToLogin();
        return null;
      }
      if (!session) session = { whatsapp: '', verified: false };
      return session;
    });
    return checking;
  }

  function recheck(force) {
    if (!force && Date.now() - lastCheckAt < MIN_RECHECK_GAP_MS) return;
    check();
  }

  function logout() {
    if (loggingOut) return;
    loggingOut = true;
    session = null;

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      try { window.localStorage.setItem(SIGNAL_KEY, String(Date.now())); } catch (err) {}
      redirectToLogin();
    }

    window.setTimeout(finish, LOGOUT_MAX_WAIT_MS);

    var api = window.GMAuthApi;
    if (!api || typeof api.logout !== 'function') {
      finish();
      return;
    }
    api.logout().then(finish, finish);
  }

  var ready = check().then(function (s) {
    if (s) reveal();
    return s;
  });

  window.GMAuth = Object.freeze({
    whenReady: function () { return ready; },
    getSession: function () { return session; },
    logout: logout,
    endSession: redirectToLogin
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-action="logout"]');
    if (!btn) return;
    e.preventDefault();
    logout();
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) recheck(true);
  });

  window.addEventListener('storage', function (e) {
    if (e.key === SIGNAL_KEY) recheck(true);
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) recheck(false);
  });

  window.setInterval(function () {
    if (!document.hidden) recheck(false);
  }, CHECK_INTERVAL_MS);
})();