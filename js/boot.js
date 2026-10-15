(function () {
  'use strict';
  var d = document.documentElement;

  window.GM_STORAGE_KEYS = Object.freeze({
    theme: 'gaza-market-theme',
    user: 'user'
  });

  function isLocalDevHost() {
    var host = window.location.hostname;
    return host === '' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      /\.localhost$/.test(host) ||
      /\.local$/.test(host) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
  }

  window.GM_ENV = Object.freeze({
    isLocalDevHost: isLocalDevHost,
    isMockAllowed: function () {
      var cfg = window.GM_CONFIG || {};
      return cfg.USE_MOCK !== false && (isLocalDevHost() || cfg.ALLOW_MOCK_ON_ANY_HOST === true);
    }
  });

  try {
    localStorage.removeItem('gm_token');
  } catch (e) {}

  try {
    var l = localStorage.getItem('gm_lang') === 'en' ? 'en' : 'ar';
    d.lang = l;
    d.dir = l === 'ar' ? 'rtl' : 'ltr';
    if (d.hasAttribute('data-lang')) d.setAttribute('data-lang', l);
  } catch (e) {}

  function applyTheme() {
    try {
      if (localStorage.getItem(window.GM_STORAGE_KEYS.theme) === 'dark') document.body.classList.add('dark-mode');
    } catch (e) {}
  }
  if (document.body) {
    applyTheme();
  } else {
    var mo = new MutationObserver(function () {
      if (document.body) { mo.disconnect(); applyTheme(); }
    });
    mo.observe(d, { childList: true });
  }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.matches && f.matches('form.search-form')) e.preventDefault();
  });

  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-hide-on-error')) t.style.display = 'none';
  }, true);
})();