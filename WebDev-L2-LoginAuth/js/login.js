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

  var els = {
    flash: document.getElementById('flash'),
    sessionNote: document.getElementById('sessionNote'),
    formError: document.getElementById('formError'),
    form: document.getElementById('loginForm'),
    identifier: document.getElementById('identifier'),
    identifierError: document.getElementById('identifierError'),
    password: document.getElementById('password'),
    passwordError: document.getElementById('passwordError'),
    togglePassword: document.getElementById('togglePassword'),
    submit: document.getElementById('loginSubmit'),
    demoHintText: document.getElementById('demoHintText'),
    fillDemo: document.getElementById('fillDemo'),
    secureNote: document.getElementById('secureNote'),
    liveStatus: document.getElementById('liveStatus')
  };

  var GENERIC_ERROR =
    "We couldn't sign you in. Check your username/email and password, then try again.";

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
    if (!input || !errorElement) {
      return;
    }
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
    els.submit.textContent = isBusy ? 'Signing in…' : 'Sign in';
  }

  function wirePasswordToggle() {
    els.togglePassword.addEventListener('click', function () {
      var pressed = els.togglePassword.getAttribute('aria-pressed') === 'true';
      var next = !pressed;
      els.togglePassword.setAttribute('aria-pressed', next ? 'true' : 'false');
      els.togglePassword.setAttribute('aria-label', next ? 'Hide password' : 'Show password');
      els.togglePassword.innerHTML = next ? EYE_OFF_ICON : EYE_ICON;
      els.password.type = next ? 'text' : 'password';
      els.password.focus();
    });
  }

  function updateDemoHint() {
    var users = auth.getUsers();
    var demo = null;
    for (var i = 0; i < users.length; i += 1) {
      if (users[i].usernameKey === 'demo') {
        demo = users[i];
        break;
      }
    }

    if (demo) {
      var others = users.filter(function (user) {
        return user.usernameKey !== 'demo';
      });
      var extra = others.length
        ? ' Also registered in this browser: ' + others.map(function (user) { return user.username; }).join(', ') + '.'
        : '';
      els.demoHintText.textContent =
        'Seeded demo account: demo / Demo1234.' + extra;
      els.fillDemo.hidden = false;
    } else if (users.length) {
      var names = users
        .map(function (user) {
          return user.username;
        })
        .join(', ');
      els.demoHintText.textContent =
        'Registered in this browser: ' + names + '. Use the password you chose when you registered.';
      els.fillDemo.hidden = true;
    } else {
      els.demoHintText.textContent = 'No accounts yet — create one to try the demo.';
      els.fillDemo.hidden = true;
    }
  }

  function showFlash() {
    var flash = auth.consumeFlash();
    if (!flash) {
      return;
    }
    els.flash.textContent = flash.message;
    els.flash.classList.remove('banner--info', 'banner--success');
    els.flash.classList.add(flash.tone === 'success' ? 'banner--success' : 'banner--info');
    els.flash.hidden = false;
  }

  function showExistingSession() {
    var session = auth.getSession();
    if (!session) {
      return;
    }
    els.sessionNote.hidden = false;
    els.sessionNote.textContent = "You're already signed in as " + session.username + '. ';
    var link = document.createElement('a');
    link.href = 'dashboard.html';
    link.textContent = 'Open your dashboard';
    els.sessionNote.appendChild(link);
  }

  function handleSubmit(event) {
    event.preventDefault();
    hideFormError();
    setFieldError(els.identifier, els.identifierError, '');
    setFieldError(els.password, els.passwordError, '');

    var identifier = els.identifier.value.trim();
    var password = els.password.value;
    var firstInvalid = null;

    if (!identifier) {
      setFieldError(els.identifier, els.identifierError, 'Enter your username or email.');
      firstInvalid = firstInvalid || els.identifier;
    }
    if (!password) {
      setFieldError(els.password, els.passwordError, 'Enter your password.');
      firstInvalid = firstInvalid || els.password;
    }
    if (firstInvalid) {
      firstInvalid.focus();
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
      .loginUser(identifier, password)
      .then(function (result) {
        if (result && result.ok) {
          announce('Signed in as ' + result.user.username + '. Opening your dashboard.');
          window.location.assign('dashboard.html');
          return;
        }
        setBusy(false);
        if (result && result.unavailable) {
          showFormError(
            'Password hashing needs a secure context. Serve this folder over http://localhost or http://127.0.0.1 and reload.'
          );
          return;
        }
        if (result && result.storage) {
          showFormError('This browser blocked session storage, so the session could not be created.');
          return;
        }
        showFormError(GENERIC_ERROR);
        els.password.value = '';
        els.password.focus();
      })
      .catch(function () {
        setBusy(false);
        showFormError('Something went wrong while checking your details. Please try again.');
      });
  }

  function init() {
    auth.ensureReady().then(function () {
      wirePasswordToggle();
      showFlash();
      showExistingSession();
      auth.showSecureContextNotice(els.secureNote);
      updateDemoHint();

      els.form.addEventListener('submit', handleSubmit);

      els.identifier.addEventListener('input', function () {
        setFieldError(els.identifier, els.identifierError, '');
        hideFormError();
      });

      els.password.addEventListener('input', function () {
        setFieldError(els.password, els.passwordError, '');
        hideFormError();
      });

      els.fillDemo.addEventListener('click', function () {
        els.identifier.value = auth.DEMO_ACCOUNT.username;
        els.password.value = auth.DEMO_ACCOUNT.password;
        setFieldError(els.identifier, els.identifierError, '');
        setFieldError(els.password, els.passwordError, '');
        hideFormError();
        els.submit.focus();
        announce('Demo credentials filled in. Press Sign in to continue.');
      });

      els.identifier.focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
