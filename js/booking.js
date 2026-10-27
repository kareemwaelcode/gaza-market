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

var DEFAULT_CODE = '970';
var CODES = ['970', '972'];
var TIME_STEP_MIN = 30;
var GAZA_TZ = 'Asia/Gaza';
var TIME_DEFAULT_VALUE = '12:00';

var doneEl = byId('bookingDone');
var formErrEl = byId('bookFormErr');
var submitEl = byId('bookSubmit');
var submitLabelEl = byId('bookSubmitLabel');
var nameEl = byId('bookName');
var codeEl = byId('bookCode');
var codeBtn = byId('bookCodeBtn');
var codeTextEl = byId('bookCodeText');
var phoneEl = byId('bookPhone');
var dateEl = byId('bookDate');
var timeEl = byId('bookTime');
var tableEl = byId('bookTable');
var peopleEl = byId('bookPeople');
var noteEl = byId('bookNote');
var tableStatusEl = byId('bookTableStatus');
var retryBtn = byId('bookTablesRetry');

var FIELDS = {
name: { input: nameEl, control: nameEl, error: byId('bookErrName') },
phone: { input: phoneEl, control: phoneEl, error: byId('bookErrPhone') },
date: { input: dateEl, control: dateEl, error: byId('bookErrDate') },
time: { input: timeEl, control: byId('bookTimeBtn'), error: byId('bookErrTime') },
people: { input: peopleEl, control: peopleEl, error: byId('bookErrPeople') },
table: { input: tableEl, control: byId('bookTableBtn'), error: byId('bookErrTable') }
};
var ORDER = ['name', 'phone', 'date', 'time', 'people', 'table'];

var state = {
slug: '',
tables: [],
tablesState: 'idle',
tablesSeq: 0,
sending: false,
done: false,
placeOpen: true,
limitHit: false
};

var limitNoteEl = null;
var toggleAttrs = {
toggle: openBtn.getAttribute('data-bs-toggle'),
target: openBtn.getAttribute('data-bs-target')
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

function pad(n) {
return n < 10 ? '0' + n : String(n);
}

var pickers = [];

function createPicker(cfg) {
var root = cfg.root;
var btn = cfg.button;
var panel = cfg.panel;
var native = cfg.native;
var phEl = btn.querySelector('.booking-select__ph');
var valEl = btn.querySelector('.booking-select__val');
var items = [];
var active = -1;
var isOpen = false;

function fullLabel(item) {
    return item.hint ? item.label + ' — ' + item.hint : item.label;
}

function indexOfValue(value) {
    for (var i = 0; i < items.length; i++) {
    if (items[i].value === value) return i;
    }
    return -1;
}

function markSelected() {
    var selected = indexOfValue(native.value);
    for (var i = 0; i < panel.children.length; i++) {
    panel.children[i].setAttribute('aria-selected', i === selected ? 'true' : 'false');
    }
}

function sync() {
    var item = items[indexOfValue(native.value)];
    if (item) {
    valEl.textContent = fullLabel(item);
    valEl.hidden = false;
    phEl.hidden = true;
    } else {
    valEl.textContent = '';
    valEl.hidden = true;
    phEl.hidden = false;
    }
    markSelected();
}

function renderPanel() {
    panel.textContent = '';
    items.forEach(function (item, i) {
    var li = document.createElement('li');
    li.id = panel.id + '-opt-' + i;
    li.className = 'booking-select__opt';
    li.setAttribute('role', 'option');
    li.setAttribute('data-index', String(i));
    var label = document.createElement('span');
    label.textContent = item.label;
    li.appendChild(label);
    if (item.hint) {
        var hint = document.createElement('span');
        hint.className = 'booking-select__hint';
        hint.textContent = item.hint;
        li.appendChild(hint);
    }
    panel.appendChild(li);
    });
}

function setItems(list) {
    var keep = native.value;
    items = list;
    native.textContent = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    native.appendChild(placeholder);
    list.forEach(function (item) {
    var option = document.createElement('option');
    option.value = item.value;
    option.textContent = fullLabel(item);
    native.appendChild(option);
    });
    if (keep && indexOfValue(keep) !== -1) native.value = keep;
    active = -1;
    renderPanel();
    sync();
}

function setDisabled(on) {
    btn.disabled = on;
    native.disabled = on;
    if (on) close(false);
}

function setActive(index, mode) {
    if (!items.length) return;
    var next = Math.max(0, Math.min(items.length - 1, index));
    var prev = panel.children[active];
    if (prev) prev.classList.remove('active');
    active = next;
    var li = panel.children[active];
    li.classList.add('active');
    panel.setAttribute('aria-activedescendant', li.id);

    if (mode === 'hover') return;
    if (mode === 'center') {
    panel.scrollTop = li.offsetTop - (panel.clientHeight - li.offsetHeight) / 2;
    } else {
    var top = li.offsetTop;
    var bottom = top + li.offsetHeight;
    if (top < panel.scrollTop + 6) panel.scrollTop = top - 6;
    else if (bottom > panel.scrollTop + panel.clientHeight - 6) panel.scrollTop = bottom - panel.clientHeight + 6;
    }
}

function place() {
    var holder = root.closest('.modal-body');
    var rootRect = root.getBoundingClientRect();
    var limitBottom = window.innerHeight;
    var limitTop = 0;
    if (holder) {
    var holderRect = holder.getBoundingClientRect();
    limitBottom = Math.min(limitBottom, holderRect.bottom);
    limitTop = Math.max(limitTop, holderRect.top);
    }
    var need = Math.min(panel.scrollHeight, 232) + 12;
    var below = limitBottom - rootRect.bottom;
    var above = rootRect.top - limitTop;
    panel.classList.toggle('up', below < need && above > below);
}

function open() {
    if (isOpen || btn.disabled || !items.length) return;
    pickers.forEach(function (picker) {
    if (picker.panel !== panel) picker.close(false);
    });
    isOpen = true;
    place();
    panel.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');

    var selected = indexOfValue(native.value);
    var start = selected !== -1 ? selected : cfg.startValue ? indexOfValue(cfg.startValue) : 0;
    setActive(start === -1 ? 0 : start, 'center');
    panel.focus({ preventScroll: true });
    if (typeof panel.scrollIntoView === 'function') panel.scrollIntoView({ block: 'nearest' });
}

function close(returnFocus) {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    panel.removeAttribute('aria-activedescendant');
    if (returnFocus) btn.focus();
}

function choose(index) {
    var item = items[index];
    if (!item) return;
    native.value = item.value;
    sync();
    native.dispatchEvent(new Event('input', { bubbles: true }));
    native.dispatchEvent(new Event('change', { bubbles: true }));
    close(true);
}

btn.addEventListener('click', function () {
    if (isOpen) close(false);
    else open();
});

btn.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    open();
    }
});

panel.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'ArrowDown') setActive(active + 1);
    else if (key === 'ArrowUp') setActive(active - 1);
    else if (key === 'PageDown') setActive(active + 5);
    else if (key === 'PageUp') setActive(active - 5);
    else if (key === 'Home') setActive(0);
    else if (key === 'End') setActive(items.length - 1);
    else if (key === 'Enter' || key === ' ') choose(active);
    else if (key === 'Escape') {
    event.stopPropagation();
    close(true);
    } else if (key === 'Tab') {
    close(false);
    return;
    } else return;
    event.preventDefault();
});

panel.addEventListener('click', function (event) {
    var li = event.target.closest('.booking-select__opt');
    if (li && panel.contains(li)) choose(Number(li.getAttribute('data-index')));
});

panel.addEventListener('mousemove', function (event) {
    var li = event.target.closest('.booking-select__opt');
    if (!li) return;
    var index = Number(li.getAttribute('data-index'));
    if (index !== active) setActive(index, 'hover');
});

var picker = {
    panel: panel,
    setItems: setItems,
    setDisabled: setDisabled,
    sync: sync,
    close: close
};
pickers.push(picker);
return picker;
}

document.addEventListener('pointerdown', function (event) {
pickers.forEach(function (picker) {
    var root = picker.panel.parentNode;
    if (!root.contains(event.target)) picker.close(false);
});
});

function timeLabel(hour, minute) {
var h12 = hour % 12 === 0 ? 12 : hour % 12;
var period = t(hour < 12 ? 'book.am' : 'book.pm');
var key = minute === 0 ? 'book.timeHour' : minute === 30 ? 'book.timeHalf' : '';
if (!key) return h12 + ':' + pad(minute) + ' ' + period;
return t(key).replace('{h}', h12).replace('{p}', period);
}

function gazaNowMinutes() {
try {
    var parts = new Intl.DateTimeFormat('en-US', {
    timeZone: GAZA_TZ,
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric'
    }).formatToParts(new Date());
    var hour = 0;
    var minute = 0;
    parts.forEach(function (part) {
    if (part.type === 'hour') hour = Number(part.value);
    else if (part.type === 'minute') minute = Number(part.value);
    });
    return (hour % 24) * 60 + minute;
} catch (err) {
    var now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}
}

function timeItems() {
var list = [];
var isToday = dateEl.value === api.reservationWindow().min;
var from = isToday ? gazaNowMinutes() : -1;
for (var min = 0; min < 24 * 60; min += TIME_STEP_MIN) {
    if (min <= from) continue;
    var hour = Math.floor(min / 60);
    var minute = min % 60;
    list.push({ value: pad(hour) + ':' + pad(minute), label: timeLabel(hour, minute) });
}
return list;
}

function refreshTimes() {
var list = timeItems();
timePicker.setItems(list);
if (!list.length) showFieldError('time', 'book.errPast');
}

var timePicker = createPicker({
root: byId('bookTimeSelect'),
button: FIELDS.time.control,
panel: byId('bookTimeList'),
native: timeEl,
startValue: TIME_DEFAULT_VALUE
});

var tablePicker = createPicker({
root: byId('bookTableSelect'),
button: FIELDS.table.control,
panel: byId('bookTableList'),
native: tableEl
});

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

codeBtn.addEventListener('click', function () {
setCode(codeEl.value === CODES[0] ? CODES[1] : CODES[0]);
clearFieldError('phone');
});

setCode(DEFAULT_CODE);

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
submitEl.disabled = state.sending || state.limitHit || state.tablesState !== 'ready';
}

function bookingOpen() {
return state.placeOpen && !state.limitHit;
}

function ensureLimitNote() {
if (limitNoteEl) return limitNoteEl;
limitNoteEl = document.createElement('p');
limitNoteEl.id = 'shopBookNote';
limitNoteEl.className = 'shop-book-note';
limitNoteEl.setAttribute('role', 'status');
limitNoteEl.hidden = true;
var toolbar = openBtn.parentNode;
if (toolbar && toolbar.parentNode) toolbar.parentNode.insertBefore(limitNoteEl, toolbar.nextSibling);
else openBtn.insertAdjacentElement('afterend', limitNoteEl);
return limitNoteEl;
}

function showLimitNote() {
var note = ensureLimitNote();
setI18n(note, 'book.unavailable');
note.hidden = false;
}

function hideLimitNote() {
if (!limitNoteEl) return;
limitNoteEl.hidden = true;
clearI18n(limitNoteEl);
}

function syncOpenBtn() {
if (bookingOpen()) {
    if (toggleAttrs.toggle) openBtn.setAttribute('data-bs-toggle', toggleAttrs.toggle);
    if (toggleAttrs.target) openBtn.setAttribute('data-bs-target', toggleAttrs.target);
    openBtn.removeAttribute('aria-disabled');
    hideLimitNote();
} else {
    openBtn.removeAttribute('data-bs-toggle');
    openBtn.removeAttribute('data-bs-target');
    openBtn.setAttribute('aria-disabled', 'true');
}
}

function setSending(on) {
state.sending = on;
if (on) submitEl.setAttribute('aria-busy', 'true');
else submitEl.removeAttribute('aria-busy');
setI18n(submitLabelEl, on ? 'book.sending' : 'book.submit');
updateSubmit();
}

function renderTables() {
tablePicker.setItems(state.tables.map(function (table) {
    return {
    value: table.id,
    label: table.name,
    hint: table.seats ? table.seats + ' ' + t('book.seats') : ''
    };
}));

var status = state.tablesState;
tablePicker.setDisabled(status !== 'ready');

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

function nextDay(value) {
var p = value.split('-').map(Number);
return new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1)).toISOString().slice(0, 10);
}

function prepareDates() {
var win = api.reservationWindow();
dateEl.min = win.min;
dateEl.max = win.max;
if (!dateEl.value) dateEl.value = win.min;
if (dateEl.value === win.min && !timeItems().length) dateEl.value = nextDay(win.min);
refreshTimes();
}

function readForm() {
return {
    name: nameEl.value,
    countryCode: codeEl.value,
    phone: phoneEl.value,
    date: dateEl.value,
    time: timeEl.value,
    peopleCount: peopleEl.value,
    tableId: tableEl.value,
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
if (first) FIELDS[first].control.focus();
return !!first;
}

function resetForm() {
formEl.reset();
setCode(DEFAULT_CODE);
timePicker.sync();
tablePicker.sync();
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
if (code === 'forbidden' && err.reason === 'plan_limit_reached') {
    state.limitHit = true;
    showFormError('book.unavailable');
    syncOpenBtn();
    updateSubmit();
    return;
}
if (code === 'conflict') {
    showFieldError('table', 'book.errTaken');
    state.tables = [];
    loadTables();
    return;
}
if (code === 'validation') {
    if (!showErrors(err.errors)) showFormError('book.errServer');
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

function setPlace(slug, enabled, available) {
var clean = typeof slug === 'string' ? slug : '';
if (clean !== state.slug) {
    state.slug = clean;
    state.tables = [];
    state.tablesState = 'idle';
    state.tablesSeq += 1;
    state.limitHit = false;
}
state.placeOpen = available !== false;
openBtn.hidden = !(enabled && clean);
syncOpenBtn();
if (!bookingOpen() && limitNoteEl && !limitNoteEl.hidden) showLimitNote();
}

openBtn.addEventListener('click', function (event) {
if (bookingOpen()) return;
event.preventDefault();
event.stopPropagation();
showLimitNote();
});

formEl.addEventListener('submit', onSubmit);
retryBtn.addEventListener('click', function () {
state.tablesState = 'loading';
renderTables();
loadTables();
});

['name', 'phone', 'people', 'table'].forEach(function (name) {
FIELDS[name].input.addEventListener('input', function () { clearFieldError(name); });
FIELDS[name].input.addEventListener('change', function () { clearFieldError(name); });
});
peopleEl.addEventListener('input', function () {
var digits = peopleEl.value.replace(/[\u0660-\u0669]/g, function (ch) { return String(ch.charCodeAt(0) - 1632); }).replace(/[^0-9]/g, '').slice(0, 2);
if (digits !== peopleEl.value) peopleEl.value = digits;
});
timeEl.addEventListener('change', function () {
clearFieldError('date');
clearFieldError('time');
});
dateEl.addEventListener('change', function () {
clearFieldError('date');
clearFieldError('time');
refreshTimes();
});

modalEl.addEventListener('show.bs.modal', function () {
prepareDates();
loadTables();
});

modalEl.addEventListener('shown.bs.modal', function () {
if (!formEl.hidden) nameEl.focus();
});

modalEl.addEventListener('hide.bs.modal', function () {
pickers.forEach(function (picker) { picker.close(false); });
});

modalEl.addEventListener('hidden.bs.modal', function () {
if (state.done) resetForm();
});

var lastLang = document.documentElement.getAttribute('lang');
new MutationObserver(function () {
var lang = document.documentElement.getAttribute('lang');
if (lang === lastLang) return;
lastLang = lang;
timePicker.setItems(timeItems());
renderTables();
setCode(codeEl.value);
}).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

window.GMBooking = { setPlace: setPlace };
})();