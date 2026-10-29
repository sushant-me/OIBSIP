(function () {
  'use strict';

  var auth = window.LatchAuth;

  var EYE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '</svg>';

  var EYE_OFF_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M10.6 6.1A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17.6 17.6 0 0 1-3.2 3.9M6.3 7.7A17.4 17.4 0 0 0 2.5 12S6 18 12 18a10 10 0 0 0 4-.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '</svg>';

  var USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,20}$/;
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var els = {
    form: document.getElementById('registerForm'),
    username: document.getElementById('username'),
    usernameError: document.getElementById('usernameError'),
    email: document.getElementById('email'),
    emailError: document.getElementById('emailError'),
    password: document.getElementById('password'),
    passwordError: document.getElementById('passwordError'),
    confirmPassword: document.getElementById('confirmPassword'),
    confirmError: document.getElementById('confirmError'),
    togglePassword: document.getElementById('togglePassword'),
    toggleConfirm: document.getElementById('toggleConfirm'),
    ruleLength: document.getElementById('ruleLength'),
    ruleNumber: document.getElementById('ruleNumber'),
    strengthMeter: document.getElementById('strengthMeter'),
    strengthLabel: document.getElementById('strengthLabel'),
    submit: document.getElementById('registerSubmit'),
    formError: document.getElementById('formError'),
    secureNote: document.getElementById('secureNote'),
    liveStatus: document.getElementById('liveStatus')
  };

  function announce(message) {
    if (!els.liveStatus) {
      return;
    }
    els.liveStatus.textContent = '';
    window.setTimeout(function () {
      els.liveStatus.textContent = message;
    }, 30);
  }

  function setFieldError(input, errorElement, message) {
    if (message) {
      errorElement.textContent = message;
      errorElement.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    } else {
      errorElement.textContent = '';
      errorElement.hidden = true;
      input.removeAttribute('aria-invalid');
    }
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = '';
  }

  function showFormError(message) {
    els.formError.textContent = message;
    els.formError.hidden = false;
  }

  function setBusy(isBusy) {
    els.submit.disabled = isBusy;
    els.submit.textContent = isBusy ? 'Creating account…' : 'Register';
  }

  function passwordMeetsRules(value) {
    return value.length >= 8 && /\d/.test(value);
  }

  function strengthScore(value) {
    if (!value) {
      return 0;
    }
    var score = 0;
    if (value.length >= 8) {
      score += 1;
    }
    if (/\d/.test(value)) {
      score += 1;
    }
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) {
      score += 1;
    }
    if (value.length >= 12 || /[^A-Za-z0-9]/.test(value)) {
      score += 1;
    }
    return Math.max(1, Math.min(4, score));
  }

  function updatePasswordUi() {
    var value = els.password.value;
    var lengthMet = value.length >= 8;
    var numberMet = /\d/.test(value);
    var score = strengthScore(value);
    var labels = {
      0: '—',
      1: 'Weak',
      2: 'Fair',
      3: 'Good',
      4: 'Strong'
    };

    els.ruleLength.classList.toggle('is-met', lengthMet);
    els.ruleNumber.classList.toggle('is-met', numberMet);
    els.strengthMeter.className = 'strength' + (score ? ' strength--' + score : '');
    els.strengthLabel.textContent = 'Password strength: ' + labels[score];
  }

  function wireRevealButton(button, input, labels) {
    button.addEventListener('click', function () {
      var pressed = button.getAttribute('aria-pressed') === 'true';
      var next = !pressed;
      button.setAttribute('aria-pressed', next ? 'true' : 'false');
      button.setAttribute('aria-label', next ? labels.hide : labels.show);
      button.innerHTML = next ? EYE_OFF_ICON : EYE_ICON;
      input.type = next ? 'text' : 'password';
      input.focus();
    });
  }

  function clearFieldErrors() {
    setFieldError(els.username, els.usernameError, '');
    setFieldError(els.email, els.emailError, '');
    setFieldError(els.password, els.passwordError, '');
    setFieldError(els.confirmPassword, els.confirmError, '');
  }

  function focusFirst(invalidInput) {
    if (invalidInput) {
      invalidInput.focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    hideFormError();
    clearFieldErrors();

    var username = els.username.value.trim();
    var email = els.email.value.trim();
    var password = els.password.value;
    var confirmPassword = els.confirmPassword.value;
    var firstInvalid = null;

    if (!username) {
      setFieldError(els.username, els.usernameError, 'Choose a username.');
      firstInvalid = firstInvalid || els.username;
    } else if (!USERNAME_PATTERN.test(username)) {
      setFieldError(
        els.username,
        els.usernameError,
        'Use 3–20 characters: letters, numbers, dot, dash or underscore.'
      );
      firstInvalid = firstInvalid || els.username;
    }

    if (!email) {
      setFieldError(els.email, els.emailError, 'Enter your email address.');
      firstInvalid = firstInvalid || els.email;
    } else if (!EMAIL_PATTERN.test(email)) {
      setFieldError(els.email, els.emailError, 'Enter a valid email address, e.g. name@example.com.');
      firstInvalid = firstInvalid || els.email;
    }

    if (!password) {
      setFieldError(els.password, els.passwordError, 'Choose a password.');
      firstInvalid = firstInvalid || els.password;
    } else if (!passwordMeetsRules(password)) {
      setFieldError(
        els.password,
        els.passwordError,
        'Password must be at least 8 characters and include at least 1 number.'
      );
      firstInvalid = firstInvalid || els.password;
    }

    if (!confirmPassword) {
      setFieldError(els.confirmPassword, els.confirmError, 'Re-enter your password.');
      firstInvalid = firstInvalid || els.confirmPassword;
    } else if (password && confirmPassword !== password) {
      setFieldError(els.confirmPassword, els.confirmError, 'Passwords do not match.');
      firstInvalid = firstInvalid || els.confirmPassword;
    }

    if (firstInvalid) {
      focusFirst(firstInvalid);
      return;
    }

    if (!auth.isCryptoAvailable()) {
      showFormError(
        'Password hashing needs a secure context. Serve this folder over http://localhost or http://127.0.0.1 and reload.'
      );
      return;
    }

    setBusy(true);
    auth
      .registerUser({ username: username, email: email, password: password })
      .then(function (result) {
        if (result && result.ok) {
          auth.setFlash(
            'Account created. Sign in with your new username or email.',
            'success'
          );
          announce('Account created. Redirecting to the sign-in page.');
          window.location.assign('index.html');
          return;
        }

        setBusy(false);
        if (result && result.field === 'username') {
          setFieldError(els.username, els.usernameError, result.message);
          els.username.focus();
          return;
        }
        if (result && result.field === 'email') {
          setFieldError(els.email, els.emailError, result.message);
          els.email.focus();
          return;
        }
        showFormError(
          (result && result.message) ||
            'The account could not be created. Please check your details and try again.'
        );
      })
      .catch(function () {
        setBusy(false);
        showFormError('Something went wrong while creating the account. Please try again.');
      });
  }

  function init() {
    auth.ensureReady().then(function () {
      auth.showSecureContextNotice(els.secureNote);
      updatePasswordUi();

      wireRevealButton(els.togglePassword, els.password, {
        show: 'Show password',
        hide: 'Hide password'
      });
      wireRevealButton(els.toggleConfirm, els.confirmPassword, {
        show: 'Show confirmed password',
        hide: 'Hide confirmed password'
      });

      els.form.addEventListener('submit', handleSubmit);

      els.username.addEventListener('input', function () {
        setFieldError(els.username, els.usernameError, '');
        hideFormError();
      });

      els.email.addEventListener('input', function () {
        setFieldError(els.email, els.emailError, '');
        hideFormError();
      });

      els.password.addEventListener('input', function () {
        updatePasswordUi();
        setFieldError(els.password, els.passwordError, '');
        hideFormError();
      });

      els.confirmPassword.addEventListener('input', function () {
        setFieldError(els.confirmPassword, els.confirmError, '');
        hideFormError();
      });

      els.username.focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
