(function () {
  'use strict';

  var SESSION_STORAGE_KEY = 'gmDashboardSession';
  var LOGOUT_MAX_WAIT_MS = 1500;
  var SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  var SESSION_CHECK_INTERVAL_MS = 60 * 1000;
  var CLOCK_SKEW_MS = 5 * 60 * 1000;
  var WHATSAPP_PATTERN = /^(970|972)\d{9}$/;

  var scriptEl = document.currentScript;
  var LOGIN_PAGE_URL = scriptEl && scriptEl.src
    ? new URL('login.html', scriptEl.src).href
    : 'auth/login.html';

  var loggingOut = false;

  function isValidSession(session) {
    if (!session || typeof session !== 'object' || Array.isArray(session)) return false;
    if (typeof session.whatsapp !== 'string' || !WHATSAPP_PATTERN.test(session.whatsapp)) return false;
    if (typeof session.loggedInAt !== 'number' || !isFinite(session.loggedInAt)) return false;
    var now = Date.now();
    if (session.loggedInAt > now + CLOCK_SKEW_MS) return false;
    if (now - session.loggedInAt > SESSION_MAX_AGE_MS) return false;
    return true;
  }

  function readSession() {
    try {
      var raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      var session = raw ? JSON.parse(raw) : null;
      if (!isValidSession(session)) return null;
      if (Object.prototype.hasOwnProperty.call(session, 'token')) {
        delete session.token;
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
      return session;
    } catch (err) {
      return null;
    }
  }

  function clearSession() {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {}
  }

  function redirectToLogin() {
    document.documentElement.style.display = 'none';
    window.location.replace(LOGIN_PAGE_URL);
  }

  function endSession() {
    clearSession();
    redirectToLogin();
  }

  function logout() {
    if (loggingOut) return;
    loggingOut = true;

    clearSession();

    if (!window.GMAuthApi || typeof window.GMAuthApi.logout !== 'function') {
      redirectToLogin();
      return;
    }

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      redirectToLogin();
    }

    window.setTimeout(finish, LOGOUT_MAX_WAIT_MS);
    window.GMAuthApi.logout().then(finish, finish);
  }

  window.GMAuth = {
    getSession: readSession,
    logout: logout,
    endSession: endSession
  };

  if (!readSession()) {

    endSession();
    return;
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-action="logout"]');
    if (!btn) return;
    e.preventDefault();
    logout();
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted && !readSession()) redirectToLogin();
  });

  window.addEventListener('storage', function (e) {
    if (e.key === SESSION_STORAGE_KEY && !readSession()) redirectToLogin();
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !readSession()) endSession();
  });

  window.setInterval(function () {
    if (!readSession()) endSession();
  }, SESSION_CHECK_INTERVAL_MS);
})();