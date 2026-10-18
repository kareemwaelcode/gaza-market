document.addEventListener('DOMContentLoaded', () => {

  const AUTH_STORAGE_KEY = window.GM_STORAGE_KEYS.user;

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.name) return null;
      return parsed;
    } catch (err) {
      console.warn('profile.js: فشل قراءة بيانات المستخدم من localStorage', err);
      return null;
    }
  }

  function saveCurrentUser(user) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (err) {
      console.warn('profile.js: فشل حفظ بيانات المستخدم', err);
      return false;
    }
    window.AuthUI?.refresh();
    return true;
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'home.html';
    return;
  }

  const regionLabels = {
    Nuseirat: "Nuseirat",
    Breij: "Breij",
    Maghazi: "Maghazi",
    Zawayda: "Zawayda",
    DeirBalah: "Deir al-Balah",
    KhanYunis: "Khan Yunis",
    Rafah: "Rafah",
    MawasiKhanYunis: "Mawasi Khan Yunis",
    MawasiQarara: "Mawasi al-Qarara",
    Alrimal: "Al-Rimal",
    Alshaati: "Al-Shaati",
    SheikhRadwan: "Sheikh Radwan",
    Saftawi: "Saftawi",
    BeitHanoun: "Beit Hanoun",
    BeitLahia: "Beit Lahia",
    TalHawa: "Tal Al-Hawa",
    Jabalia: "Jabalia"
  };

  function t(key, fallback) {
    try {
      const lang = localStorage.getItem('gm_lang') === 'en' ? 'en' : 'ar';
      const v = typeof translations !== 'undefined' && translations[lang] && translations[lang][key];
      return v || fallback || key;
    } catch (err) {
      return fallback || key;
    }
  }

  function regionLabel(key) {
    return key ? t(key, regionLabels[key] || key) : '';
  }

  function makeKeyboardClickable(node) {
    if (!node) return;
    node.setAttribute('role', 'button');
    node.tabIndex = 0;
    node.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        node.click();
      }
    });
  }

  const ids = [
    'avatarWrap', 'avatar', 'uploadStatus',
    'userName', 'userPhone', 'userRegion',
    'editModal', 'editProfileBtn', 'modalCloseBtn', 'modalCancelBtn', 'modalSaveBtn',
    'modalName', 'modalPhone', 'modalRegion',
    'modalAvatarWrap', 'modalAvatarInput', 'modalAvatar',
    'regionPicker', 'regionCurrentBtn', 'regionCurrentText',
    'settingsSoundsToggle'
  ];

  const el = {};
  let missing = false;

  ids.forEach(id => {
    el[id] = document.getElementById(id);
    if (!el[id]) {
      console.error(`profile.js: العنصر بمعرّف "#${id}" غير موجود في الصفحة.`);
      missing = true;
    }
  });

  if (missing) {
    console.error('profile.js: توقف التنفيذ بسبب عناصر ناقصة أعلاه. تأكد من الـ HTML.');
    return;
  }

  const {
    avatarWrap, avatar: avatarEl, uploadStatus: statusEl,
    userName: userNameEl, userPhone: userPhoneEl, userRegion: userRegionEl,
    editModal, editProfileBtn, modalCloseBtn, modalCancelBtn, modalSaveBtn,
    modalName: modalNameInput, modalPhone: modalPhoneInput, modalRegion: modalRegionInput,
    modalAvatarWrap, modalAvatarInput, modalAvatar: modalAvatarEl,
    regionPicker, regionCurrentBtn, regionCurrentText,
    settingsSoundsToggle
  } = el;

  let pendingAvatarDataUrl = null;
  let lastFocusEl = null;

  function setAvatarImage(el, src) {
    el.textContent = '';
    if (typeof src !== 'string' || !/^(data:image\/|https?:\/\/|\/|assets\/)/i.test(src)) return false;
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'avatar';
    el.appendChild(img);
    return true;
  }

  const modalStatusEl = document.getElementById('modalStatus') || statusEl;

  function showRegionTile(key) {
    userRegionEl.dataset.value = key || '';
    if (key && regionLabels[key]) userRegionEl.setAttribute('data-i18n', key);
    else userRegionEl.removeAttribute('data-i18n');
    userRegionEl.textContent = key ? regionLabel(key) : '\u2014';
  }

  makeKeyboardClickable(avatarWrap);
  makeKeyboardClickable(modalAvatarWrap);

  function renderUserData(user) {
    userNameEl.textContent = user.name || '';
    userPhoneEl.textContent = user.phone || '';

    if (user.avatar && setAvatarImage(avatarEl, user.avatar)) {
    } else {
      avatarEl.textContent = (user.name || '').trim().charAt(0).toUpperCase() || '؟';
    }

    showRegionTile(user.region);
  }

  function renderUserStats(user) {
    const pointsEl = document.getElementById('userPoints');
    const contributionsEl = document.getElementById('userContributions');
    const joinDateEl = document.getElementById('userJoinDate');

    const toCount = value => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : 0);

    if (pointsEl) pointsEl.textContent = String(toCount(user.points));
    if (contributionsEl) contributionsEl.textContent = String(toCount(user.contributions));

    if (joinDateEl) {
      const created = new Date(user.createdAt);
      const year = Number.isNaN(created.getTime()) ? new Date().getFullYear() : created.getFullYear();
      joinDateEl.textContent = String(year);
    }
  }

  renderUserData(currentUser);
  renderUserStats(currentUser);

  function setRegionValue(value) {
    modalRegionInput.value = value || '';
    const knownKey = regionLabels[value] ? value : '';
    regionCurrentText.setAttribute('data-i18n', knownKey || 'editModal.regionPlaceholder');
    regionCurrentText.textContent = knownKey ? regionLabel(knownKey) : t('editModal.regionPlaceholder', 'اختر منطقتك');
    regionCurrentText.classList.toggle('placeholder', !value);

    document.querySelectorAll('.region-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === value);
    });
  }

  function closeRegionPicker() {
    regionPicker.classList.remove('open');
    document.querySelectorAll('.region-zone.open').forEach(z => z.classList.remove('open'));
  }

  regionCurrentBtn.addEventListener('click', e => {
    e.stopPropagation();
    regionPicker.classList.toggle('open');
  });

  document.querySelectorAll('.region-zone-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.region-zone').classList.toggle('open');
    });
  });

  document.querySelectorAll('.region-option').forEach(option => {
    option.addEventListener('click', () => {
      setRegionValue(option.dataset.value);
      closeRegionPicker();
    });
  });

  document.addEventListener('click', e => {
    if (!regionPicker.contains(e.target)) closeRegionPicker();
  });

  function openEditModal() {
    lastFocusEl = document.activeElement;
    modalNameInput.value = userNameEl.textContent.trim();
    modalPhoneInput.value = userPhoneEl.textContent.trim();
    setRegionValue(userRegionEl.dataset.value || '');
    closeRegionPicker();
    pendingAvatarDataUrl = null;

    statusEl.textContent = '';
    statusEl.className = 'upload-status';
    modalStatusEl.textContent = '';
    modalStatusEl.className = 'upload-status';

    const currentImg = avatarEl.querySelector('img');
    if (!(currentImg && setAvatarImage(modalAvatarEl, currentImg.src))) {
      modalAvatarEl.textContent = avatarEl.textContent;
    }

    editModal.classList.add('open');
    modalNameInput.focus();
  }

  function closeEditModal() {
    editModal.classList.remove('open');
    closeRegionPicker();
    if (lastFocusEl && typeof lastFocusEl.focus === 'function') lastFocusEl.focus();
  }

  editProfileBtn.addEventListener('click', openEditModal);

  avatarWrap.addEventListener('click', e => {
    e.stopPropagation();
    openEditModal();
  });

  modalCloseBtn.addEventListener('click', closeEditModal);
  modalCancelBtn.addEventListener('click', closeEditModal);

  editModal.addEventListener('click', e => {
    if (e.target === editModal) closeEditModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && editModal.classList.contains('open')) closeEditModal();
  });

  modalAvatarWrap.addEventListener('click', () => modalAvatarInput.click());

  modalAvatarInput.addEventListener('change', () => {
    const file = modalAvatarInput.files[0];
    if (!file) return;

    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      modalAvatarInput.value = '';
      modalStatusEl.textContent = t('editModal.avatarInvalid', 'Please choose a PNG, JPG or WebP image up to 5MB.');
      modalStatusEl.className = 'upload-status error';
      return;
    }
    modalStatusEl.textContent = '';

    const reader = new FileReader();
    reader.onload = e => {
      pendingAvatarDataUrl = e.target.result;
      setAvatarImage(modalAvatarEl, pendingAvatarDataUrl);
    };
    reader.readAsDataURL(file);
  });

  modalSaveBtn.addEventListener('click', () => {
    const newName = modalNameInput.value.trim();
    if (!newName) {
      modalNameInput.focus();
      return;
    }

    const newPhone = modalPhoneInput.value.trim();
    const newRegion = modalRegionInput.value;

    userNameEl.textContent = newName;
    userPhoneEl.textContent = newPhone;

    showRegionTile(newRegion);

    if (pendingAvatarDataUrl && setAvatarImage(avatarEl, pendingAvatarDataUrl)) {
    } else if (!avatarEl.querySelector('img')) {
      avatarEl.textContent = newName.charAt(0).toUpperCase() || '؟';
    }

    const updatedUser = {
      ...currentUser,
      name: newName,
      phone: newPhone,
      region: newRegion,
      ...(pendingAvatarDataUrl ? { avatar: pendingAvatarDataUrl } : {})
    };
    if (!saveCurrentUser(updatedUser)) {
      renderUserData(currentUser);
      modalStatusEl.textContent = t('editModal.saveFailed', 'Could not save your changes. Please try again.');
      modalStatusEl.className = 'upload-status error';
      return;
    }

    if (newRegion && typeof window.gmSaveSelectedArea === 'function') {
      window.gmSaveSelectedArea(newRegion, regionLabels[newRegion] || newRegion, '');
    }

    document.dispatchEvent(new CustomEvent('gmRegionChanged', {
      detail: { region: newRegion }
    }));

    statusEl.textContent = t('editModal.saved', 'تم حفظ التغييرات بنجاح');
    statusEl.className = 'upload-status success';
    closeEditModal();
  });


  const SOUNDS_STORAGE_KEY = 'appSoundsEnabled';

  let savedSoundsSetting = null;
  try { savedSoundsSetting = localStorage.getItem(SOUNDS_STORAGE_KEY); } catch (err) { /* storage unavailable */ }
  settingsSoundsToggle.checked = savedSoundsSetting !== 'false';

  settingsSoundsToggle.addEventListener('change', () => {
    const isEnabled = settingsSoundsToggle.checked;
    try { localStorage.setItem(SOUNDS_STORAGE_KEY, isEnabled ? 'true' : 'false'); } catch (err) { /* storage unavailable */ }

    if (isEnabled) {
      console.log('App Sounds: ON');
    } else {
      console.log('App Sounds: OFF');
    }
  });

const confirmModal     = document.getElementById('confirmModal');
const confirmTitle      = document.getElementById('confirmTitle');
const confirmMessage    = document.getElementById('confirmMessage');
const confirmActionBtn  = document.getElementById('confirmActionBtn');
const confirmCancelBtn  = document.getElementById('confirmCancelBtn');
const confirmCloseBtn   = document.getElementById('confirmCloseBtn');

let pendingConfirmAction = null;
let confirmOpener = null;

function openConfirmModal({ title, message, actionLabel, onConfirm }) {
  confirmOpener = document.activeElement;
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmActionBtn.textContent = actionLabel;
  pendingConfirmAction = onConfirm;
  confirmModal.classList.add('open');
  confirmCancelBtn.focus();
}

function closeConfirmModal() {
  confirmModal.classList.remove('open');
  pendingConfirmAction = null;
  if (confirmOpener && typeof confirmOpener.focus === 'function') confirmOpener.focus();
}

confirmActionBtn.addEventListener('click', () => {
  if (typeof pendingConfirmAction === 'function') {
    pendingConfirmAction();
  }
  closeConfirmModal();
});

confirmCancelBtn.addEventListener('click', closeConfirmModal);
confirmCloseBtn.addEventListener('click', closeConfirmModal);

confirmModal.addEventListener('click', e => {
  if (e.target === confirmModal) closeConfirmModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && confirmModal.classList.contains('open')) closeConfirmModal();
});


function bindConfirmRow(rowId, onConfirm) {
  const row = document.getElementById(rowId);
  if (!row) return;
  makeKeyboardClickable(row);

  row.addEventListener('click', () => {
    openConfirmModal({
      title:       row.dataset.confirmTitle   || '',
      message:     row.dataset.confirmMessage || '',
      actionLabel: row.dataset.confirmAction  || '',
      onConfirm
    });
  });
}

bindConfirmRow('settingsLogoutRow', () => {
  if (window.AuthUI && typeof window.AuthUI.logout === 'function') {
    window.AuthUI.logout();
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  window.location.href = 'home.html';
});

bindConfirmRow('settingsDeleteAccountRow', () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.href = 'home.html';
});

function playAppSound(audioSrc) {
  const soundsEnabled = localStorage.getItem('appSoundsEnabled') !== 'false';
  if (!soundsEnabled) return;

  const audio = new Audio(audioSrc);
  audio.play().catch(err => {
    console.error('تعذّر تشغيل الصوت:', err);
  });
}});