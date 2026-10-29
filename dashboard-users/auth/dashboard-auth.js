(function () {
  'use strict';

  var THEME_STORAGE_KEY = 'gaza-market-dashboard-theme';
  var RESET_REQUEST_STORAGE_KEY = 'gmDashboardResetRequest';
  var RESET_TOKEN_STORAGE_KEY = 'gmDashboardResetToken';

  var DASHBOARD_PAGE_URL = '../dashboard.html';
  var RESET_PASSWORD_PAGE_URL = 'reset-password.html';
  var FORGOT_PASSWORD_PAGE_URL = 'forgot-password.html';

  // "?mode=activate" turns the forgot/reset pages into the first-time account activation flow.
  // Any other value keeps the normal password-reset flow.
  var MODE = (function () {
    try {
      return new URLSearchParams(window.location.search).get('mode') === 'activate' ? 'activate' : 'reset';
    } catch (err) {
      return 'reset';
    }
  })();
  var IS_ACTIVATE = MODE === 'activate';

  var ACTIVATE_TEXTS = {
    pageTitle: 'تفعيل الحساب — سوق غزة',
    forgotTitle: 'تفعيل حسابك',
    forgotPhoneText: 'أدخل رقم الواتساب الذي سجّلت به نشاطك، وسنرسل لك كود تفعيل لإنشاء كلمة المرور لأول مرة.',
    forgotCodeLead: 'إذا كان الرقم مرتبطاً بنشاط تم قبوله، أرسلنا كوداً من 6 أرقام إلى واتساب',
    resetTitle: 'إنشاء كلمة المرور',
    resetFormLead: 'اختر كلمة مرور لحساب',
    successTitle: 'تم تفعيل حسابك',
    successText: 'يمكنك الآن تسجيل الدخول إلى لوحة التحكم بكلمة المرور التي أنشأتها.',
    expiredTitle: 'انتهت جلسة التفعيل',
    expiredText: 'الجلسة غير صالحة أو انتهت مدتها. اطلب كود تفعيل جديد للمتابعة.'
  };

  var ACTIVATE_ERRORS = {
    REQUEST_NOT_FOUND: 'انتهت جلسة التفعيل. أدخل رقم الواتساب لإرسال كود جديد.',
    INVALID_TOKEN: 'انتهت جلسة التفعيل. اطلب كوداً جديداً.'
  };

  function withMode(url) {
    return IS_ACTIVATE ? url + '?mode=activate' : url;
  }

  var WHATSAPP_PATTERN = /^(970|972)\d{9}$/;

  var CODE_LENGTH = 6;

  var ERROR_MESSAGES = {
    NETWORK: 'تعذّر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة ثانية.',
    SERVER: 'حصل خطأ غير متوقع. حاول مرة ثانية بعد قليل.',
    RATE_LIMITED: 'محاولات كثيرة. حاول مرة ثانية بعد قليل.',
    INVALID_CREDENTIALS: 'رقم الواتساب أو كلمة المرور غير صحيحة. تأكد من البيانات وحاول مرة ثانية.',
    INVALID_PHONE: 'يجب أن يبدأ الرقم بـ 972 أو 970 ويتكون من 12 رقماً',
    REQUEST_NOT_FOUND: 'انتهت جلسة الاستعادة. أدخل رقم الواتساب لإرسال كود جديد.',
    CODE_EXPIRED: 'انتهت صلاحية الكود. اطلب كوداً جديداً.',
    TOO_MANY_ATTEMPTS: 'تجاوزت عدد المحاولات المسموحة. اطلب كوداً جديداً.',
    INVALID_TOKEN: 'انتهت جلسة الاستعادة. اطلب كوداً جديداً.',
    PASSWORD_MISMATCH: 'كلمتا المرور غير متطابقتين'
  };

  function bootIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function normalizeDigits(value) {
    return String(value || '')
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/[^0-9]/g, '');
  }

  function readJson(storeName, key, fallback) {
    try {
      var raw = window[storeName].getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(storeName, key, value) {
    try {
      window[storeName].setItem(key, JSON.stringify(value));
    } catch (err) {}
  }

  function removeKey(storeName, key) {
    try {
      window[storeName].removeItem(key);
    } catch (err) {}
  }

  // A request/token created in one flow (reset or activate) is never picked up by the other.
  function getResetRequest() {
    var data = readJson('sessionStorage', RESET_REQUEST_STORAGE_KEY, null);
    if (data && (data.purpose || 'reset') !== MODE) return null;
    return data;
  }

  function setResetRequest(request) {
    request.purpose = MODE;
    writeJson('sessionStorage', RESET_REQUEST_STORAGE_KEY, request);
  }

  function clearResetRequest() {
    removeKey('sessionStorage', RESET_REQUEST_STORAGE_KEY);
  }

  function getResetToken() {
    var data = readJson('sessionStorage', RESET_TOKEN_STORAGE_KEY, null);
    if (!data || !data.token || !data.whatsapp || Date.now() > data.expiresAt) {
      removeKey('sessionStorage', RESET_TOKEN_STORAGE_KEY);
      return null;
    }
    if ((data.purpose || 'reset') !== MODE) return null;
    return data;
  }

  function setResetToken(tokenData) {
    tokenData.purpose = MODE;
    writeJson('sessionStorage', RESET_TOKEN_STORAGE_KEY, tokenData);
  }

  function clearResetToken() {
    removeKey('sessionStorage', RESET_TOKEN_STORAGE_KEY);
  }

  function formatMinutes(n) {
    if (n <= 1) return 'دقيقة';
    if (n === 2) return 'دقيقتين';
    if (n <= 10) return n + ' دقائق';
    return n + ' دقيقة';
  }

  function errorMessage(res) {
    if (IS_ACTIVATE && ACTIVATE_ERRORS[res.code]) return ACTIVATE_ERRORS[res.code];
    if (res.code === 'RATE_LIMITED' && res.data && res.data.retryAfter > 0) {
      return 'محاولات كثيرة. حاول مرة ثانية بعد ' + formatMinutes(Math.ceil(res.data.retryAfter / 60)) + '.';
    }
    return ERROR_MESSAGES[res.code] || ERROR_MESSAGES.SERVER;
  }

  function passwordRuleMessage() {
    return 'كلمة المرور يجب أن تتكوّن من ' + window.GMAuthApi.passwordMinLength +
      ' أحرف على الأقل وتحتوي على حروف وأرقام';
  }

  function applyTheme(theme) {
    var isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    var toggleBtn = document.querySelector('[data-action="toggle-theme"]');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i data-lucide="' + (isDark ? 'sun' : 'moon') + '" class="icon"></i>';
      toggleBtn.setAttribute('aria-label', isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي');
      bootIcons();
    }
  }

  function wireThemeToggle() {
    var stored = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (err) {}
    applyTheme(stored === 'dark' ? 'dark' : 'light');

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="toggle-theme"]');
      if (!btn) return;
      var nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
      applyTheme(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (err) {}
    });
  }

  function wirePasswordToggle() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="toggle-password"]');
      if (!btn) return;
      var input = document.getElementById(btn.getAttribute('data-target'));
      if (!input) return;
      var reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      btn.innerHTML = '<i data-lucide="' + (reveal ? 'eye-off' : 'eye') + '" class="icon"></i>';
      btn.setAttribute('aria-label', reveal ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
      bootIcons();
    });
  }

  function setFieldError(fieldId, errorId, message) {
    var field = document.getElementById(fieldId);
    var errorEl = document.getElementById(errorId);
    if (field) field.classList.toggle('has-error', !!message);
    if (errorEl) errorEl.textContent = message || '';
  }

  function showAlert(alertId, message) {
    var alertEl = document.getElementById(alertId);
    var textEl = document.getElementById(alertId + '-text');
    if (!alertEl || !textEl) return;
    textEl.textContent = message;
    alertEl.hidden = false;
  }

  function hideAlert(alertId) {
    var alertEl = document.getElementById(alertId);
    if (alertEl) alertEl.hidden = true;
  }

  function showToast(message, options) {
    options = options || {};
    var container = document.getElementById('gm-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gm-toast-container';
      container.className = 'gm-toast-container';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'gm-toast' + (options.danger ? ' gm-toast--danger' : '');

    var icon = document.createElement('i');
    icon.setAttribute('data-lucide', options.icon || 'check-circle');
    icon.className = 'icon';

    var text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    bootIcons();

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    window.setTimeout(function () {
      toast.classList.remove('show');
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, options.duration || 2600);
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Swaps the visible wording of the forgot/reset pages when they run in activation mode.
  function applyActivateTexts() {
    if (!IS_ACTIVATE) return;
    document.title = ACTIVATE_TEXTS.pageTitle;
    setText('forgot-title', ACTIVATE_TEXTS.forgotTitle);
    setText('forgot-phone-text', ACTIVATE_TEXTS.forgotPhoneText);
    setText('forgot-code-lead', ACTIVATE_TEXTS.forgotCodeLead);
    setText('reset-title', ACTIVATE_TEXTS.resetTitle);
    setText('reset-form-lead', ACTIVATE_TEXTS.resetFormLead);
    setText('reset-success-title', ACTIVATE_TEXTS.successTitle);
    setText('reset-success-text', ACTIVATE_TEXTS.successText);
    setText('reset-expired-title', ACTIVATE_TEXTS.expiredTitle);
    setText('reset-expired-text', ACTIVATE_TEXTS.expiredText);

    var help = document.getElementById('forgot-activate-help');
    if (help) help.hidden = false;

    var expiredLink = document.getElementById('reset-expired-link');
    if (expiredLink) expiredLink.setAttribute('href', withMode(FORGOT_PASSWORD_PAGE_URL));
  }

  function maskWhatsapp(whatsapp) {
    return '+' + whatsapp.slice(0, 3) + ' •••••• ' + whatsapp.slice(-3);
  }

  function wireLoginForm() {
    var form = document.getElementById('login-form');
    var whatsappInput = document.getElementById('login-whatsapp');
    var passwordInput = document.getElementById('login-password');
    var submitBtn = document.getElementById('login-submit');
    if (!form || !whatsappInput || !passwordInput || !submitBtn) return;

    var submitHtml = submitBtn.innerHTML;
    var submitting = false;

    function clearWhatsappError() {
      setFieldError('login-whatsapp-field', 'login-whatsapp-error', '');
    }

    function clearPasswordError() {
      setFieldError('login-password-field', 'login-password-error', '');
    }

    function resetSubmitState() {
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitHtml;
      bootIcons();
    }

    whatsappInput.addEventListener('input', function () {
      var cleaned = normalizeDigits(whatsappInput.value).slice(0, 12);
      if (whatsappInput.value !== cleaned) whatsappInput.value = cleaned;
      clearWhatsappError();
      hideAlert('login-alert');
    });

    passwordInput.addEventListener('input', function () {
      clearPasswordError();
      hideAlert('login-alert');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;

      clearWhatsappError();
      clearPasswordError();
      hideAlert('login-alert');

      var whatsapp = normalizeDigits(whatsappInput.value);
      var password = passwordInput.value;
      var firstInvalid = null;

      if (!whatsapp) {
        setFieldError('login-whatsapp-field', 'login-whatsapp-error', 'أدخل رقم الواتساب');
        firstInvalid = whatsappInput;
      } else if (!WHATSAPP_PATTERN.test(whatsapp)) {
        setFieldError('login-whatsapp-field', 'login-whatsapp-error', ERROR_MESSAGES.INVALID_PHONE);
        firstInvalid = whatsappInput;
      }

      if (!password) {
        setFieldError('login-password-field', 'login-password-error', 'أدخل كلمة المرور');
        if (!firstInvalid) firstInvalid = passwordInput;
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      submitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'جارِ تسجيل الدخول…';

      window.GMAuthApi.login(whatsapp, password).then(function (res) {
        if (!res.ok) {
          resetSubmitState();

          if (res.code === 'INVALID_PHONE') {
            setFieldError('login-whatsapp-field', 'login-whatsapp-error', errorMessage(res));
            whatsappInput.focus();
            return;
          }

          showAlert('login-alert', errorMessage(res));
          if (res.code === 'INVALID_CREDENTIALS') {
            passwordInput.value = '';
            passwordInput.focus();
          }
          return;
        }

        // The session itself lives in the server's HttpOnly cookie (live) or inside the mock driver; nothing is stored here.
        window.location.replace(DASHBOARD_PAGE_URL);
      });
    });
  }

  function wireForgotPassword() {
    var phoneStep = document.getElementById('forgot-phone-step');
    var codeStep = document.getElementById('forgot-code-step');
    var phoneForm = document.getElementById('forgot-phone-form');
    var codeForm = document.getElementById('forgot-code-form');
    var whatsappInput = document.getElementById('forgot-whatsapp');
    var phoneSubmitBtn = document.getElementById('forgot-phone-submit');
    var codeSubmitBtn = document.getElementById('forgot-code-submit');
    var codeInputsWrap = document.getElementById('forgot-code-inputs');
    var codeTarget = document.getElementById('forgot-code-target');
    var resendBtn = document.getElementById('forgot-resend-btn');
    var changeNumberBtn = document.getElementById('forgot-change-number');
    if (!phoneStep || !codeStep || !phoneForm || !codeForm || !whatsappInput || !phoneSubmitBtn ||
        !codeSubmitBtn || !codeInputsWrap || !codeTarget || !resendBtn || !changeNumberBtn) return;

    var codeInputs = Array.prototype.slice.call(codeInputsWrap.querySelectorAll('.auth-code-input'));
    var phoneSubmitHtml = phoneSubmitBtn.innerHTML;
    var codeSubmitHtml = codeSubmitBtn.innerHTML;
    var submitting = false;
    var resending = false;
    var cooldownTimer = null;

    function clearWhatsappError() {
      setFieldError('forgot-whatsapp-field', 'forgot-whatsapp-error', '');
    }

    function clearCodeError() {
      setFieldError('forgot-code-field', 'forgot-code-error', '');
    }

    function getCodeValue() {
      return codeInputs.map(function (input) { return input.value; }).join('');
    }

    function clearCodeInputs() {
      codeInputs.forEach(function (input) { input.value = ''; });
    }

    function showStep(name) {
      phoneStep.hidden = name !== 'phone';
      codeStep.hidden = name !== 'code';
      hideAlert('forgot-alert');
      clearWhatsappError();
      clearCodeError();
    }

    function stopCooldown() {
      window.clearInterval(cooldownTimer);
      cooldownTimer = null;
    }

    function renderResend() {
      var request = getResetRequest();
      var remaining = request ? Math.ceil((request.resendAt - Date.now()) / 1000) : 0;
      if (remaining > 0) {
        resendBtn.disabled = true;
        resendBtn.textContent = 'إعادة الإرسال بعد ' + remaining + ' ثانية';
      } else {
        resendBtn.disabled = false;
        resendBtn.textContent = 'إعادة إرسال الكود';
        stopCooldown();
      }
    }

    function startCooldown() {
      window.clearInterval(cooldownTimer);
      renderResend();
      cooldownTimer = window.setInterval(renderResend, 1000);
    }

    function openCodeStep(request) {
      codeTarget.textContent = maskWhatsapp(request.whatsapp);
      clearCodeInputs();
      showStep('code');
      startCooldown();
      codeInputs[0].focus();
    }

    function backToPhoneStep(message) {
      stopCooldown();
      clearResetRequest();
      clearCodeInputs();
      showStep('phone');
      if (message) showAlert('forgot-alert', message);
      whatsappInput.focus();
    }

    function resetSubmitState() {
      submitting = false;
      phoneSubmitBtn.disabled = false;
      phoneSubmitBtn.innerHTML = phoneSubmitHtml;
      codeSubmitBtn.disabled = false;
      codeSubmitBtn.innerHTML = codeSubmitHtml;
      bootIcons();
    }

    function handleVerifyError(res) {
      if (res.code === 'REQUEST_NOT_FOUND') {
        backToPhoneStep(errorMessage(res));
        return;
      }

      if (res.code === 'INVALID_CODE') {
        var left = res.data ? res.data.attemptsLeft : undefined;
        var message = 'الكود غير صحيح.';
        if (left > 0) {
          message = 'الكود غير صحيح. المحاولات المتبقية: ' + left;
        } else if (left === 0) {
          message = ERROR_MESSAGES.TOO_MANY_ATTEMPTS;
        }
        setFieldError('forgot-code-field', 'forgot-code-error', message);
        clearCodeInputs();
        codeInputs[0].focus();
        return;
      }

      if (res.code === 'CODE_EXPIRED' || res.code === 'TOO_MANY_ATTEMPTS') {
        setFieldError('forgot-code-field', 'forgot-code-error', errorMessage(res));
        clearCodeInputs();
        codeInputs[0].focus();
        return;
      }

      showAlert('forgot-alert', errorMessage(res));
    }

    whatsappInput.addEventListener('input', function () {
      var cleaned = normalizeDigits(whatsappInput.value).slice(0, 12);
      if (whatsappInput.value !== cleaned) whatsappInput.value = cleaned;
      clearWhatsappError();
      hideAlert('forgot-alert');
    });

    phoneForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;

      clearWhatsappError();
      hideAlert('forgot-alert');

      var whatsapp = normalizeDigits(whatsappInput.value);

      if (!whatsapp) {
        setFieldError('forgot-whatsapp-field', 'forgot-whatsapp-error', 'أدخل رقم الواتساب');
        whatsappInput.focus();
        return;
      }
      if (!WHATSAPP_PATTERN.test(whatsapp)) {
        setFieldError('forgot-whatsapp-field', 'forgot-whatsapp-error', ERROR_MESSAGES.INVALID_PHONE);
        whatsappInput.focus();
        return;
      }

      submitting = true;
      phoneSubmitBtn.disabled = true;
      phoneSubmitBtn.textContent = 'جارِ إرسال الكود…';

      window.GMAuthApi.requestResetCode(whatsapp, MODE).then(function (res) {
        resetSubmitState();

        if (!res.ok) {
          if (res.code === 'INVALID_PHONE') {
            setFieldError('forgot-whatsapp-field', 'forgot-whatsapp-error', errorMessage(res));
            whatsappInput.focus();
          } else {
            showAlert('forgot-alert', errorMessage(res));
          }
          return;
        }

        var request = {
          whatsapp: whatsapp,
          expiresAt: res.data.expiresAt,
          resendAt: res.data.resendAt
        };
        setResetRequest(request);
        openCodeStep(request);
      });
    });

    codeInputsWrap.addEventListener('input', function (e) {
      var index = codeInputs.indexOf(e.target);
      if (index === -1) return;
      var digits = normalizeDigits(e.target.value);
      e.target.value = digits.slice(-1);
      clearCodeError();
      hideAlert('forgot-alert');
      if (digits && index < codeInputs.length - 1) codeInputs[index + 1].focus();
    });

    codeInputsWrap.addEventListener('keydown', function (e) {
      var index = codeInputs.indexOf(e.target);
      if (index === -1) return;

      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        e.preventDefault();
        codeInputs[index - 1].value = '';
        codeInputs[index - 1].focus();
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        codeInputs[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < codeInputs.length - 1) {
        e.preventDefault();
        codeInputs[index + 1].focus();
      }
    });

    codeInputsWrap.addEventListener('paste', function (e) {
      var index = codeInputs.indexOf(e.target);
      if (index === -1) return;
      e.preventDefault();
      var text = e.clipboardData ? e.clipboardData.getData('text') : '';
      var digits = normalizeDigits(text).slice(0, codeInputs.length);
      if (!digits) return;
      clearCodeInputs();
      for (var i = 0; i < digits.length; i++) {
        codeInputs[i].value = digits.charAt(i);
      }
      codeInputs[Math.min(digits.length, codeInputs.length - 1)].focus();
      clearCodeError();
    });

    codeInputsWrap.addEventListener('focusin', function (e) {
      if (codeInputs.indexOf(e.target) !== -1) e.target.select();
    });

    codeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;

      clearCodeError();
      hideAlert('forgot-alert');

      var entered = getCodeValue();

      if (entered.length !== CODE_LENGTH) {
        setFieldError('forgot-code-field', 'forgot-code-error', 'أدخل الكود المكوّن من 6 أرقام');
        for (var i = 0; i < codeInputs.length; i++) {
          if (!codeInputs[i].value) {
            codeInputs[i].focus();
            break;
          }
        }
        return;
      }

      var request = getResetRequest();

      if (!request) {
        backToPhoneStep(ERROR_MESSAGES.REQUEST_NOT_FOUND);
        return;
      }

      if (Date.now() > request.expiresAt) {
        setFieldError('forgot-code-field', 'forgot-code-error', ERROR_MESSAGES.CODE_EXPIRED);
        clearCodeInputs();
        codeInputs[0].focus();
        return;
      }

      submitting = true;
      codeSubmitBtn.disabled = true;
      codeSubmitBtn.textContent = 'جارِ التحقق…';

      window.GMAuthApi.verifyResetCode(request.whatsapp, entered, MODE).then(function (res) {
        if (res.ok) {
          setResetToken({
            whatsapp: request.whatsapp,
            token: res.data.token,
            expiresAt: res.data.expiresAt
          });
          clearResetRequest();
          window.location.replace(withMode(RESET_PASSWORD_PAGE_URL));
          return;
        }

        resetSubmitState();
        handleVerifyError(res);
      });
    });

    resendBtn.addEventListener('click', function () {
      var request = getResetRequest();
      if (!request || resending || Date.now() < request.resendAt) return;

      resending = true;
      resendBtn.disabled = true;

      window.GMAuthApi.requestResetCode(request.whatsapp, MODE).then(function (res) {
        resending = false;

        if (!res.ok) {
          if (res.code === 'RATE_LIMITED' && res.data && res.data.retryAfter > 0) {
            request.resendAt = Date.now() + res.data.retryAfter * 1000;
            setResetRequest(request);
          }
          showAlert('forgot-alert', errorMessage(res));
          startCooldown();
          return;
        }

        setResetRequest({
          whatsapp: request.whatsapp,
          expiresAt: res.data.expiresAt,
          resendAt: res.data.resendAt
        });
        clearCodeInputs();
        clearCodeError();
        hideAlert('forgot-alert');
        startCooldown();
        codeInputs[0].focus();
      });
    });

    changeNumberBtn.addEventListener('click', function () {
      backToPhoneStep();
    });

    var existing = getResetRequest();
    if (existing && Date.now() <= existing.expiresAt) {
      whatsappInput.value = existing.whatsapp;
      openCodeStep(existing);
    } else {
      clearResetRequest();
      showStep('phone');
    }
  }

  function wireResetPassword() {
    var formStep = document.getElementById('reset-form-step');
    var successStep = document.getElementById('reset-success-step');
    var expiredStep = document.getElementById('reset-expired-step');
    var form = document.getElementById('reset-form');
    var passwordInput = document.getElementById('reset-password');
    var confirmInput = document.getElementById('reset-confirm');
    var submitBtn = document.getElementById('reset-submit');
    var target = document.getElementById('reset-target');
    if (!formStep || !successStep || !expiredStep || !form || !passwordInput || !confirmInput ||
        !submitBtn || !target) return;

    var submitHtml = submitBtn.innerHTML;
    var submitting = false;
    var tokenData = getResetToken();

    function clearPasswordError() {
      setFieldError('reset-password-field', 'reset-password-error', '');
    }

    function clearConfirmError() {
      setFieldError('reset-confirm-field', 'reset-confirm-error', '');
    }

    function showStep(name) {
      formStep.hidden = name !== 'form';
      successStep.hidden = name !== 'success';
      expiredStep.hidden = name !== 'expired';
      hideAlert('reset-alert');
      bootIcons();
    }

    function resetSubmitState() {
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitHtml;
      bootIcons();
    }

    function handleResetError(res) {
      if (res.code === 'INVALID_TOKEN') {
        clearResetToken();
        tokenData = null;
        showStep('expired');
        return;
      }

      if (res.code === 'WEAK_PASSWORD') {
        setFieldError('reset-password-field', 'reset-password-error', passwordRuleMessage());
        passwordInput.focus();
        return;
      }

      if (res.code === 'PASSWORD_MISMATCH') {
        setFieldError('reset-confirm-field', 'reset-confirm-error', errorMessage(res));
        confirmInput.focus();
        return;
      }

      showAlert('reset-alert', errorMessage(res));
    }

    if (!tokenData) {
      showStep('expired');
      return;
    }

    target.textContent = maskWhatsapp(tokenData.whatsapp);
    showStep('form');
    passwordInput.focus();

    passwordInput.addEventListener('input', function () {
      clearPasswordError();
      hideAlert('reset-alert');
    });

    confirmInput.addEventListener('input', function () {
      clearConfirmError();
      hideAlert('reset-alert');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;

      clearPasswordError();
      clearConfirmError();
      hideAlert('reset-alert');

      var password = passwordInput.value;
      var confirmation = confirmInput.value;
      var firstInvalid = null;

      if (!password) {
        setFieldError('reset-password-field', 'reset-password-error', 'أدخل كلمة المرور الجديدة');
        firstInvalid = passwordInput;
      } else if (!window.GMAuthApi.isValidPassword(password)) {
        setFieldError('reset-password-field', 'reset-password-error', passwordRuleMessage());
        firstInvalid = passwordInput;
      }

      if (!confirmation) {
        setFieldError('reset-confirm-field', 'reset-confirm-error', 'أكّد كلمة المرور');
        if (!firstInvalid) firstInvalid = confirmInput;
      } else if (password && confirmation !== password) {
        setFieldError('reset-confirm-field', 'reset-confirm-error', ERROR_MESSAGES.PASSWORD_MISMATCH);
        if (!firstInvalid) firstInvalid = confirmInput;
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var current = getResetToken();
      if (!current) {
        showStep('expired');
        return;
      }

      submitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'جارِ الحفظ…';

      window.GMAuthApi.resetPassword(current.whatsapp, current.token, password, confirmation, MODE).then(function (res) {
        if (!res.ok) {
          resetSubmitState();
          handleResetError(res);
          return;
        }

        clearResetToken();
        passwordInput.value = '';
        confirmInput.value = '';
        resetSubmitState();
        showStep('success');
        var loginLink = successStep.querySelector('a');
        if (loginLink) loginLink.focus();
      });
    });
  }

  function redirectIfAuthenticated() {
    if (typeof window.GMAuthApi.me !== 'function') return;
    window.GMAuthApi.me().then(function (res) {
      if (res && res.ok) window.location.replace(DASHBOARD_PAGE_URL);
    });
  }

  function init() {
    if (!window.GMAuthApi) {
      console.error('auth-api.js must be loaded before dashboard-auth.js');
      return;
    }
    applyActivateTexts();
    wireThemeToggle();
    wirePasswordToggle();
    wireLoginForm();
    wireForgotPassword();
    wireResetPassword();
    bootIcons();
    redirectIfAuthenticated();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();