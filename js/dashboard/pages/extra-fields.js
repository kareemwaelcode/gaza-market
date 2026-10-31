(function () {
  'use strict';

  var GM = window.GMDash;
  if (!GM) { console.error('GMDash is missing: load js/dashboard/core.js and shell.js first.'); return; }

  var getStoreTypeConfig = GM.getStoreTypeConfig;
  var escapeHtml = GM.escapeHtml;

  function storeHasDiscounts() {
    var config = getStoreTypeConfig();
    return !!(config && config.hasDiscounts);
  }

  function storeHasProductField(fieldKey) {
    var config = getStoreTypeConfig();
    return !!(config && Array.isArray(config.productFields) && config.productFields.indexOf(fieldKey) !== -1);
  }

  function storeHasServiceField(fieldKey) {
    var config = getStoreTypeConfig();
    return !!(config && Array.isArray(config.serviceFields) && config.serviceFields.indexOf(fieldKey) !== -1);
  }

  function getExtraFieldDefs(kind) {
    var config = getStoreTypeConfig();
    var list = config && config[kind === 'service' ? 'serviceExtraFields' : 'productExtraFields'];
    return Array.isArray(list) ? list : [];
  }

  function renderExtraFields(container, prefix, defs, values) {
    if (!container) return;
    var saved = values || {};
    container.innerHTML = defs.map(function (def) {
      var id = prefix + '-x-' + def.key;
      var value = saved[def.key] != null ? String(saved[def.key]) : '';
      var control;
      if (def.type === 'choice') {
        control = '<select id="' + id + '" data-extra-key="' + def.key + '"><option value="">غير محدد</option>' +
          (def.options || []).map(function (opt) {
            return '<option value="' + escapeHtml(opt) + '"' + (opt === value ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
          }).join('') + '</select>';
      } else {
        control = '<input type="text" id="' + id + '" data-extra-key="' + def.key + '" maxlength="' + (def.maxLength || 40) + '" placeholder="' + escapeHtml(def.placeholder || '') + '" value="' + escapeHtml(value) + '">';
      }
      return '<div class="field"><label for="' + id + '">' + escapeHtml(def.label) + '</label>' + control + '</div>';
    }).join('');
  }

  function readExtraFields(container, defs) {
    var result = {};
    if (!container) return result;
    defs.forEach(function (def) {
      var el = container.querySelector('[data-extra-key="' + def.key + '"]');
      var value = el ? String(el.value || '').trim() : '';
      if (value) result[def.key] = value;
    });
    return result;
  }

  function formatExtraFields(defs, extra) {
    if (!extra) return [];
    var parts = [];
    defs.forEach(function (def) {
      if (extra[def.key]) parts.push(escapeHtml(def.label) + ': ' + escapeHtml(extra[def.key]));
    });
    return parts;
  }

  function extraFieldsMatch(term, defs, extra) {
    if (!extra) return false;
    return defs.some(function (def) {
      return String(extra[def.key] || '').toLowerCase().indexOf(term) !== -1;
    });
  }

  GM.storeHasDiscounts = storeHasDiscounts;
  GM.storeHasProductField = storeHasProductField;
  GM.storeHasServiceField = storeHasServiceField;
  GM.getExtraFieldDefs = getExtraFieldDefs;
  GM.renderExtraFields = renderExtraFields;
  GM.readExtraFields = readExtraFields;
  GM.formatExtraFields = formatExtraFields;
  GM.extraFieldsMatch = extraFieldsMatch;

})();