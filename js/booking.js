'use strict';

(function () {
  var api = window.GMShops;
  var modalEl = document.getElementById('bookingModal');
  var openBtn = document.getElementById('shopBookBtn');
  var formEl = document.getElementById('bookingForm');
  if (!api || !modalEl || !openBtn || !formEl || typeof api.getTables !== 'function') return;

  function byId(id) {
    return document.getElementById(id);
  }

  var doneEl = byId('bookingDone');
  var formErrEl = byId('bookFormErr');
  var submitEl = byId('bookSubmit');
  var submitLabelEl = byId('bookSubmitLabel');
  var nameEl = byId('bookName');
  var codeEl = byId('bookCode');
  var phoneEl = byId('bookPhone');
  var dateEl = byId('bookDate');
  var timeEl = byId('bookTime');
  var tableEl = byId('bookTable');
  var noteEl = byId('bookNote');
  var tableStatusEl = byId('bookTableStatus');
  var retryBtn = byId('bookTablesRetry');

  var FIELDS = {
    name: { input: nameEl, error: byId('bookErrName') },
    phone: { input: phoneEl, error: byId('bookErrPhone') },
    date: { input: dateEl, error: byId('bookErrDate') },
    time: { input: timeEl, error: byId('bookErrTime') },
    table: { input: tableEl, error: byId('bookErrTable') }
  };
  var ORDER = ['name', 'phone', 'date', 'time', 'table'];

  var state = {
    slug: '',
    tables: [],
    tablesState: 'idle',
    tablesSeq: 0,
    sending: false,
    done: false
  };

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

  function showFieldError(name, key) {
    var field = FIELDS[name];
    setI18n(field.error, key);
    field.error.classList.add('show');
    field.input.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(name) {
    var field = FIELDS[name];
    clearI18n(field.error);
    field.error.classList.remove('show');
    field.input.removeAttribute('aria-invalid');
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
    submitEl.disabled = state.sending || state.tablesState !== 'ready';
  }

  function setSending(on) {
    state.sending = on;
    if (on) submitEl.setAttribute('aria-busy', 'true');
    else submitEl.removeAttribute('aria-busy');
    setI18n(submitLabelEl, on ? 'book.sending' : 'book.submit');
    updateSubmit();
  }

  function tableLabel(table) {
    return table.seats ? table.name + ' — ' + table.seats + ' ' + t('book.seats') : table.name;
  }

  function renderTables() {
    var keep = tableEl.value;
    tableEl.textContent = '';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('book.tablePh');
    tableEl.appendChild(placeholder);

    state.tables.forEach(function (table) {
      var option = document.createElement('option');
      option.value = table.id;
      option.textContent = tableLabel(table);
      tableEl.appendChild(option);
    });

    if (keep && state.tables.some(function (table) { return table.id === keep; })) tableEl.value = keep;

    var status = state.tablesState;
    tableEl.disabled = status !== 'ready';

    if (status === 'loading') setI18n(tableStatusEl, 'book.tablesLoading');
    else if (status === 'empty') setI18n(tableStatusEl, 'book.tablesEmpty');
    else if (status === 'error') setI18n(tableStatusEl, 'book.tablesError');
    else clearI18n(tableStatusEl);

    tableStatusEl.hidden = status === 'ready' || status === 'idle';
    retryBtn.hidden = status !== 'error';
    updateSubmit();
  }

  function loadTables() {
    if (!state.slug) return;
    var seq = ++state.tablesSeq;

    if (!state.tables.length) {
      state.tablesState = 'loading';
      renderTables();
    }

    api.getTables(state.slug).then(function (list) {
      if (seq !== state.tablesSeq) return;
      state.tables = list;
      state.tablesState = list.length ? 'ready' : 'empty';
      renderTables();
    }).catch(function () {
      if (seq !== state.tablesSeq) return;
      if (state.tables.length) return;
      state.tablesState = 'error';
      renderTables();
    });
  }

  function prepareDates() {
    var win = api.reservationWindow();
    dateEl.min = win.min;
    dateEl.max = win.max;
    if (!dateEl.value) dateEl.value = win.min;
  }

  function readForm() {
    return {
      name: nameEl.value,
      countryCode: codeEl.value,
      phone: phoneEl.value,
      date: dateEl.value,
      time: timeEl.value,
      tableId: tableEl.value,
      note: noteEl.value
    };
  }

  function showErrors(errors) {
    var first = '';
    ORDER.forEach(function (name) {
      if (!errors[name]) return;
      showFieldError(name, errors[name]);
      if (!first) first = name;
    });
    if (first) FIELDS[first].input.focus();
  }

  function resetForm() {
    formEl.reset();
    clearErrors();
    state.tables = [];
    state.tablesState = 'idle';
    state.tablesSeq += 1;
    state.done = false;
    formEl.hidden = false;
    doneEl.hidden = true;
  }

  function onSent() {
    state.done = true;
    state.tables = [];
    state.tablesState = 'idle';
    formEl.hidden = true;
    doneEl.hidden = false;
    doneEl.focus();
  }

  function onFailed(err) {
    var code = err && err.code;
    if (code === 'conflict') {
      showFieldError('table', 'book.errTaken');
      state.tables = [];
      loadTables();
      return;
    }
    if (code === 'rate_limited') showFormError('book.errRate');
    else if (code === 'network' || code === 'timeout') showFormError('book.errNetwork');
    else showFormError('book.errServer');
  }

  function onSubmit(event) {
    event.preventDefault();
    if (state.sending || state.tablesState !== 'ready') return;

    var raw = readForm();
    clearErrors();

    var result = api.validateReservation(raw);
    if (result.errors) {
      showErrors(result.errors);
      return;
    }

    setSending(true);
    api.submitReservation(state.slug, raw).then(onSent, onFailed).then(function () {
      setSending(false);
    });
  }

  function setPlace(slug, enabled) {
    var clean = typeof slug === 'string' ? slug : '';
    if (clean !== state.slug) {
      state.slug = clean;
      state.tables = [];
      state.tablesState = 'idle';
      state.tablesSeq += 1;
    }
    openBtn.hidden = !(enabled && clean);
  }

  formEl.addEventListener('submit', onSubmit);
  retryBtn.addEventListener('click', function () {
    state.tablesState = 'loading';
    renderTables();
    loadTables();
  });

  ['name', 'phone', 'table'].forEach(function (name) {
    FIELDS[name].input.addEventListener('input', function () { clearFieldError(name); });
    FIELDS[name].input.addEventListener('change', function () { clearFieldError(name); });
  });
  ['date', 'time'].forEach(function (name) {
    FIELDS[name].input.addEventListener('change', function () {
      clearFieldError('date');
      clearFieldError('time');
    });
  });

  modalEl.addEventListener('show.bs.modal', function () {
    prepareDates();
    loadTables();
  });

  modalEl.addEventListener('shown.bs.modal', function () {
    if (!formEl.hidden) nameEl.focus();
  });

  modalEl.addEventListener('hidden.bs.modal', function () {
    if (state.done) resetForm();
  });

  var lastLang = document.documentElement.getAttribute('lang');
  new MutationObserver(function () {
    var lang = document.documentElement.getAttribute('lang');
    if (lang === lastLang) return;
    lastLang = lang;
    renderTables();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  window.GMBooking = { setPlace: setPlace };
})();