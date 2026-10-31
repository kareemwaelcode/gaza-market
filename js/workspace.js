'use strict';

(function () {
  var api = window.GMPlaces;
  var sectionEl = document.getElementById('wsSection');
  var modalEl = document.getElementById('wsSubModal');
  var formEl = document.getElementById('wsSubForm');
  if (!api || !sectionEl || !modalEl || !formEl || typeof api.submitSubscriptionRequest !== 'function') return;

  function byId(id) {
    return document.getElementById(id);
  }

  var DEFAULT_CODE = '970';
  var CODES = ['970', '972'];
  var DEFAULT_DURATION = 'month';

  var rowsEl = byId('wsRows');
  var servicesWrapEl = byId('wsServicesWrap');
  var servicesEl = byId('wsServices');
  var requestBtn = byId('wsRequestBtn');
  var doneEl = byId('wsSubDone');
  var formErrEl = byId('wsFormErr');
  var submitEl = byId('wsSubmit');
  var submitLabelEl = byId('wsSubmitLabel');
  var nameEl = byId('wsName');
  var codeEl = byId('wsCode');
  var codeBtn = byId('wsCodeBtn');
  var codeTextEl = byId('wsCodeText');
  var phoneEl = byId('wsPhone');
  var durationGroupEl = byId('wsDurationGroup');
  var dateEl = byId('wsDate');
  var noteEl = byId('wsNote');

  var FIELDS = {
    name: { control: nameEl, error: byId('wsErrName') },
    phone: { control: phoneEl, error: byId('wsErrPhone') },
    duration: { control: durationGroupEl, error: byId('wsErrDuration') },
    date: { control: dateEl, error: byId('wsErrDate') }
  };
  var ORDER = ['name', 'phone', 'duration', 'date'];

  var ICONS = {
    dollar: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
    wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    door: '<path d="M11 20H2"/><path d="M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z"/><path d="M11 4H8a2 2 0 0 0-2 2v14"/><path d="M14 12h.01"/><path d="M22 20h-3"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>'
  };

  var PRICE_ROWS = [
    { key: 'hour', label: 'ws.priceHour', unit: 'ws.perHour', tone: 'green' },
    { key: 'halfDay', label: 'ws.priceHalfDay', unit: 'ws.perHalfDay', tone: 'green' },
    { key: 'day', label: 'ws.priceDay', unit: 'ws.perDay', tone: 'blue' },
    { key: 'week', label: 'ws.priceWeek', unit: 'ws.perWeek', tone: 'blue' },
    { key: 'month', label: 'ws.priceMonth', unit: 'ws.perMonth', tone: 'amber' }
  ];

  var SERVICE_ICONS = {
    wifi: 'wifi',
    electricity: 'zap',
    printing: 'printer',
    screens: 'monitor',
    private_rooms: 'door',
    drinks: 'coffee'
  };

  var state = { slug: '', ws: null, sending: false, done: false, limitHit: false };

  function t(key) {
    return typeof i18n !== 'undefined' && i18n.t ? i18n.t(key) : key;
  }

  function setI18n(node, key) {
    node.setAttribute('data-i18n', key);
    node.textContent = t(key);
  }

  function clearI18n(node) {
    node.removeAttribute('data-i18n');
    node.textContent = '';
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(name, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'places-icon');
    svg.setAttribute('width', String(size || 20));
    svg.setAttribute('height', String(size || 20));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }

  function formatTime(value) {
    var m = /^(\d{2}):(\d{2})$/.exec(value || '');
    if (!m) return '';
    var hour = Number(m[1]);
    var h12 = hour % 12 === 0 ? 12 : hour % 12;
    return h12 + ':' + m[2] + ' ' + t(hour < 12 ? 'ws.am' : 'ws.pm');
  }

  function formatNumber(value) {
    return String(Number(value));
  }

  function buildRow(tone, iconName, label, valueNode) {
    var row = el('div', 'ws-row ws-tone-' + tone);
    var iconBox = el('span', 'ws-row__icon');
    iconBox.appendChild(icon(iconName, 20));
    row.appendChild(iconBox);

    var text = el('div', 'ws-row__text');
    text.appendChild(el('span', 'ws-row__label', label));
    text.appendChild(valueNode);
    row.appendChild(text);
    return row;
  }

  function priceValue(amount, unitKey) {
    var value = el('span', 'ws-row__value');
    var num = el('bdi', 'ws-row__num', formatNumber(amount) + ' \u20AA');
    num.setAttribute('dir', 'ltr');
    value.appendChild(num);
    value.appendChild(document.createTextNode(' / ' + t(unitKey)));
    return value;
  }

  function renderRows() {
    var ws = state.ws;
    rowsEl.textContent = '';
    var count = 0;

    PRICE_ROWS.forEach(function (def) {
      var amount = ws.prices[def.key];
      if (amount === null || amount === undefined) return;
      rowsEl.appendChild(buildRow(def.tone, 'dollar', t(def.label), priceValue(amount, def.unit)));
      count += 1;
    });

    var open = formatTime(ws.hours.open);
    var close = formatTime(ws.hours.close);
    if (open && close) {
      var hoursValue = el('span', 'ws-row__value');
      hoursValue.appendChild(el('bdi', 'ws-row__num', open));
      hoursValue.appendChild(document.createTextNode(' \u2014 '));
      hoursValue.appendChild(el('bdi', 'ws-row__num', close));
      rowsEl.appendChild(buildRow('amber', 'clock', t('ws.hours'), hoursValue));
      count += 1;
    }

    if (ws.seats.total !== null && ws.seats.total !== undefined) {
      var seatsValue = el('span', 'ws-row__value', t('ws.seatsCount').replace('{n}', formatNumber(ws.seats.total)));
      rowsEl.appendChild(buildRow('violet', 'users', t('ws.capacity'), seatsValue));
      count += 1;
    }

    if (!count) {
      var empty = el('p', 'ws-empty', t('ws.noDetails'));
      empty.setAttribute('data-i18n', 'ws.noDetails');
      rowsEl.appendChild(empty);
    }
  }

  function renderServices() {
    var list = state.ws.services.filter(function (svc) { return !!SERVICE_ICONS[svc.id]; });
    servicesEl.textContent = '';
    servicesWrapEl.hidden = list.length === 0;

    list.forEach(function (svc) {
      var card = el('div', 'ws-svc');
      var iconBox = el('span', 'ws-svc__icon');
      iconBox.appendChild(icon(SERVICE_ICONS[svc.id], 18));
      card.appendChild(iconBox);

      var text = el('div', 'ws-svc__text');
      text.appendChild(el('span', 'ws-svc__name', t('ws.svc.' + svc.id)));
      if (svc.details) text.appendChild(el('span', 'ws-svc__details', svc.details));
      card.appendChild(text);
      servicesEl.appendChild(card);
    });
  }

  function syncRequestBtn() {
    var visible = !!state.ws && state.ws.plan === 'paid' && !!state.slug && !state.limitHit;
    requestBtn.hidden = !visible;
  }

  function renderAll() {
    renderRows();
    renderServices();
    syncRequestBtn();
  }

  function show(slug, ws) {
    var clean = typeof slug === 'string' ? slug : '';
    if (clean !== state.slug) {
      state.slug = clean;
      state.limitHit = false;
    }
    state.ws = ws;
    renderAll();
    sectionEl.hidden = false;
  }

  function hide() {
    state.ws = null;
    sectionEl.hidden = true;
    requestBtn.hidden = true;
  }

  function refresh() {
    setCode(codeEl.value);
    if (state.ws) renderAll();
  }

  function setCode(code) {
    var next = CODES.indexOf(code) !== -1 ? code : DEFAULT_CODE;
    var other = next === CODES[0] ? CODES[1] : CODES[0];
    codeEl.value = next;
    codeTextEl.textContent = '+' + next;
    codeBtn.setAttribute(
      'aria-label',
      t('book.codeToggle').replace('{code}', '+' + next).replace('{other}', '+' + other)
    );
  }

  function getDuration() {
    var active = durationGroupEl.querySelector('.ws-seg__btn[aria-pressed="true"]');
    return active ? active.getAttribute('data-value') : '';
  }

  function setDuration(value) {
    var buttons = durationGroupEl.querySelectorAll('.ws-seg__btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-value') === value ? 'true' : 'false');
    }
  }

  function showFieldError(name, key) {
    var field = FIELDS[name];
    setI18n(field.error, key);
    field.error.classList.add('show');
    field.control.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(name) {
    var field = FIELDS[name];
    clearI18n(field.error);
    field.error.classList.remove('show');
    field.control.removeAttribute('aria-invalid');
  }

  function showFormError(key) {
    setI18n(formErrEl, key);
    formErrEl.hidden = false;
  }

  function clearErrors() {
    ORDER.forEach(clearFieldError);
    clearI18n(formErrEl);
    formErrEl.hidden = true;
  }

  function updateSubmit() {
    submitEl.disabled = state.sending || state.limitHit;
  }

  function setSending(on) {
    state.sending = on;
    if (on) submitEl.setAttribute('aria-busy', 'true');
    else submitEl.removeAttribute('aria-busy');
    setI18n(submitLabelEl, on ? 'book.sending' : 'ws.submit');
    updateSubmit();
  }

  function prepareDate() {
    var win = api.subscriptionWindow();
    dateEl.min = win.min;
    dateEl.max = win.max;
    if (!dateEl.value || dateEl.value < win.min) dateEl.value = win.min;
  }

  function readForm() {
    return {
      name: nameEl.value,
      countryCode: codeEl.value,
      phone: phoneEl.value,
      duration: getDuration(),
      date: dateEl.value,
      note: noteEl.value
    };
  }

  function showErrors(errors) {
    var first = '';
    ORDER.forEach(function (name) {
      if (!errors || typeof errors[name] !== 'string' || !errors[name]) return;
      showFieldError(name, errors[name]);
      if (!first) first = name;
    });
    if (first) {
      var control = FIELDS[first].control;
      var target = first === 'duration' ? control.querySelector('.ws-seg__btn') : control;
      if (target) target.focus();
    }
    return !!first;
  }

  function resetForm() {
    formEl.reset();
    setCode(DEFAULT_CODE);
    setDuration(DEFAULT_DURATION);
    clearErrors();
    state.done = false;
    formEl.hidden = false;
    doneEl.hidden = true;
  }

  function onSent() {
    state.done = true;
    formEl.hidden = true;
    doneEl.hidden = false;
    doneEl.focus();
  }

  function onFailed(err) {
    var code = err && err.code;
    if (code === 'forbidden') {
      state.limitHit = true;
      showFormError('ws.unavailable');
      syncRequestBtn();
      updateSubmit();
      return;
    }
    if (code === 'rate_limited') showFormError('book.errRate');
    else if (code === 'network' || code === 'timeout') showFormError('book.errNetwork');
    else showFormError('book.errServer');
  }

  function onSubmit(event) {
    event.preventDefault();
    if (state.sending || state.limitHit) return;

    var raw = readForm();
    clearErrors();

    var result = api.validateSubscriptionRequest(raw);
    if (result.errors) {
      showErrors(result.errors);
      return;
    }

    setSending(true);
    api.submitSubscriptionRequest(state.slug, raw).then(onSent, onFailed).then(function () {
      setSending(false);
    });
  }

  codeBtn.addEventListener('click', function () {
    setCode(codeEl.value === CODES[0] ? CODES[1] : CODES[0]);
    clearFieldError('phone');
  });

  durationGroupEl.addEventListener('click', function (event) {
    var btn = event.target.closest('.ws-seg__btn');
    if (!btn || !durationGroupEl.contains(btn)) return;
    setDuration(btn.getAttribute('data-value'));
    clearFieldError('duration');
  });

  nameEl.addEventListener('input', function () { clearFieldError('name'); });
  phoneEl.addEventListener('input', function () { clearFieldError('phone'); });
  dateEl.addEventListener('change', function () { clearFieldError('date'); });

  formEl.addEventListener('submit', onSubmit);

  modalEl.addEventListener('show.bs.modal', prepareDate);

  modalEl.addEventListener('shown.bs.modal', function () {
    if (!formEl.hidden) nameEl.focus();
  });

  modalEl.addEventListener('hidden.bs.modal', function () {
    if (state.done) resetForm();
  });

  var requestIconHost = byId('wsRequestIcon');
  if (requestIconHost) requestIconHost.appendChild(icon('userPlus', 15));

  setCode(DEFAULT_CODE);
  setDuration(DEFAULT_DURATION);

  window.GMWorkspace = { show: show, hide: hide, refresh: refresh };
})();