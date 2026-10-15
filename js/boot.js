// boot.js — يشتغل بأول الـ <head> (بدون defer) عشان ما يصير وميض باللغة/الاتجاه/الثيم.
// بدل السكربتات الـ inline القديمة (عشان الـ CSP) + بدل onsubmit/onerror.
(function () {
  'use strict';
  var d = document.documentElement;

  // 1) اللغة والاتجاه
  try {
    var l = localStorage.getItem('gm_lang') === 'en' ? 'en' : 'ar';
    d.lang = l;
    d.dir = l === 'ar' ? 'rtl' : 'ltr';
    if (d.hasAttribute('data-lang')) d.setAttribute('data-lang', l);
  } catch (e) {}

  // 2) الثيم الداكن (الـ body لسا مش موجود هون، فبننتظره)
  function applyTheme() {
    try {
      if (localStorage.getItem('gaza-market-theme') === 'dark') document.body.classList.add('dark-mode');
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

  // 3) بدل onsubmit="return false;" على نماذج البحث
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.matches && f.matches('form.search-form')) e.preventDefault();
  });

  // 4) بدل onerror="this.style.display='none'" على الصور اللي عليها data-hide-on-error
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-hide-on-error')) t.style.display = 'none';
  }, true);
})();