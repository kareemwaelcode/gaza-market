(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM || !GM.boot) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js before page-runner.js.'); return; }

  var common = {};
  var pages = {};

  GM.registerCommon = function (def) { common = def || {}; };
  GM.registerPage = function (name, def) { pages[name] = def || {}; };

  function call(def, hook) {
    if (def && typeof def[hook] === 'function') def[hook]();
  }

  async function run() {
    var page = pages[document.body.getAttribute('data-page')] || {};

    var ok = await GM.boot({
      beforePartials: function () { call(page, 'beforePartials'); },
      afterNavRender: function () { call(page, 'afterNavRender'); },
      afterNotifications: function () { call(common, 'afterNotifications'); },
      partials: (page.partials || []).concat(common.partials || [])
    });
    if (!ok) return;

    call(page, 'init');
    call(common, 'init');
    GM.initOpenStatusToggle();
    GM.initLockedFeatures();
    GM.initSaveButtonDelay();
    GM.bootIcons();
  }

  if (document.readyState === 'complete') {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }
})();