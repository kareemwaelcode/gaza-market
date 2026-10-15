(function () {
  'use strict';
  var d = document.documentElement;

  window.GM_STORAGE_KEYS = Object.freeze({
    theme: 'gaza-market-theme',
    user: 'user'
  });

  if (!window.GM_ENV) {
    if (window.console) console.error('[GM] gm-core.js is missing; mock mode is disabled.');
    window.GM_ENV = Object.freeze({
      isLocalDevHost: function () { return false; },
      isMockAllowed: function () { return false; }
    });
  }

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