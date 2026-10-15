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
      window.AuthUI?.refresh();
    } catch (err) {
      console.warn('profile.js: فشل حفظ بيانات المستخدم', err);
    }
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

  function setAvatarImage(el, src) {
    el.textContent = '';
    if (typeof src !== 'string' || !/^(data:image\/|https?:\/\/|\/|assets\/)/i.test(src)) return false;
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'avatar';
    el.appendChild(img);
    return true;
  }

  function renderUserData(user) {
    userNameEl.textContent = user.name || '';
    userPhoneEl.textContent = user.phone || '';

    if (user.avatar && setAvatarImage(avatarEl, user.avatar)) {
    } else {
      avatarEl.textContent = (user.name || '').trim().charAt(0).toUpperCase() || '؟';
    }

    if (user.region) {
      userRegionEl.dataset.value = user.region;
      userRegionEl.textContent = regionLabels[user.region] || user.region;
    } else {
      userRegionEl.dataset.value = '';
      userRegionEl.textContent = '—';
    }
  }

  renderUserData(currentUser);

  function setRegionValue(value) {
    modalRegionInput.value = value || '';
    regionCurrentText.textContent = regionLabels[value] || 'اختر منطقتك';
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
    modalNameInput.value = userNameEl.textContent.trim();
    modalPhoneInput.value = userPhoneEl.textContent.trim();
    setRegionValue(userRegionEl.dataset.value || '');
    closeRegionPicker();
    pendingAvatarDataUrl = null;

    statusEl.textContent = '';
    statusEl.className = 'upload-status';

    const currentImg = avatarEl.querySelector('img');
    if (!(currentImg && setAvatarImage(modalAvatarEl, currentImg.src))) {
      modalAvatarEl.textContent = avatarEl.textContent;
    }

    editModal.classList.add('open');
  }

  function closeEditModal() {
    editModal.classList.remove('open');
    closeRegionPicker();
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

    userRegionEl.dataset.value = newRegion;
    userRegionEl.textContent = regionLabels[newRegion] || newRegion || '—';

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
    saveCurrentUser(updatedUser);

    if (newRegion && typeof window.gmSaveSelectedArea === 'function') {
      window.gmSaveSelectedArea(newRegion, regionLabels[newRegion] || newRegion, '');
    }

    document.dispatchEvent(new CustomEvent('gmRegionChanged', {
      detail: { region: newRegion }
    }));

    statusEl.textContent = 'تم حفظ التغييرات بنجاح';
    statusEl.className = 'upload-status success';
    closeEditModal();
  });


  const SOUNDS_STORAGE_KEY = 'appSoundsEnabled';

  const savedSoundsSetting = localStorage.getItem(SOUNDS_STORAGE_KEY);
  settingsSoundsToggle.checked = savedSoundsSetting !== 'false';

  settingsSoundsToggle.addEventListener('change', () => {
    const isEnabled = settingsSoundsToggle.checked;
    localStorage.setItem(SOUNDS_STORAGE_KEY, isEnabled ? 'true' : 'false');

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

function openConfirmModal({ title, message, actionLabel, onConfirm }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmActionBtn.textContent = actionLabel;
  pendingConfirmAction = onConfirm;
  confirmModal.classList.add('open');
}

function closeConfirmModal() {
  confirmModal.classList.remove('open');
  pendingConfirmAction = null;
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