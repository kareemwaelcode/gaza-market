(function () {
  'use strict';

  if (window.GM_ENV) return;

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

  function isMockAllowed() {
    var cfg = window.GM_CONFIG || {};
    return cfg.USE_MOCK !== false && (isLocalDevHost() || cfg.ALLOW_MOCK_ON_ANY_HOST === true);
  }

  var MOCK_OWNER_SLUG = 'vibe-hub';

  window.GM_ENV = Object.freeze({
    isLocalDevHost: isLocalDevHost,
    isMockAllowed: isMockAllowed,
    mockOwnerSlug: MOCK_OWNER_SLUG
  });
})();

(function () {
  'use strict';

  var ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var RANDOM_LENGTH = 10;
  var PREFIX_PATTERN = /^[a-z][a-z0-9]{0,11}$/;
  var BYTE_LIMIT = 256 - (256 % ALPHABET.length);

  function getCrypto() {
    var c = window.crypto || window.msCrypto;
    return c && typeof c.getRandomValues === 'function' ? c : null;
  }

  function randomString(length) {
    var cryptoObj = getCrypto();
    if (!cryptoObj) throw new Error('[GM_ID] Secure random generator is unavailable');
    if (typeof length !== 'number' || length < 1 || length !== Math.floor(length)) {
      throw new Error('[GM_ID] Invalid length');
    }

    var out = '';
    var buf = new Uint8Array(Math.min(length * 2, 1024));
    while (out.length < length) {
      cryptoObj.getRandomValues(buf);
      for (var i = 0; i < buf.length && out.length < length; i++) {
        if (buf[i] < BYTE_LIMIT) out += ALPHABET.charAt(buf[i] % ALPHABET.length);
      }
    }
    return out;
  }

  function generate(prefix) {
    if (typeof prefix !== 'string' || !PREFIX_PATTERN.test(prefix)) {
      throw new Error('[GM_ID] Invalid prefix');
    }
    return prefix + '_' + Date.now().toString(36) + randomString(RANDOM_LENGTH);
  }

  window.GM_ID = Object.freeze({
    generate: generate,
    randomString: randomString
  });
})();