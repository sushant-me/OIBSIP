(function () {
  'use strict';

  var auth = window.LatchAuth;

  function goToLogin(message) {
    if (message) {
      auth.setFlash(message, 'info');
    }
    window.location.replace('index.html');
  }

  var session = auth.getSession();
  if (!session) {
    goToLogin();
    return;
  }

  var user = auth.getUserRecord(session.username);
  if (!user) {
    auth.clearSession();
    goToLogin('Your session is no longer valid. Please sign in again.');
    return;
  }

  var els = {
    displayName: document.getElementById('displayName'),
    avatar: document.getElementById('avatar'),
    accountUsername: document.getElementById('accountUsername'),
    accountEmail: document.getElementById('accountEmail'),
    memberSince: document.getElementById('memberSince'),
    sessionStarted: document.getElementById('sessionStarted'),
    iterations: document.getElementById('iterations'),
    salt: document.getElementById('salt'),
    hashPrefix: document.getElementById('hashPrefix'),
    userRecord: document.getElementById('userRecord'),
    logout: document.getElementById('logoutBtn'),
    simulateExpiry: document.getElementById('simulateExpiry'),
    liveStatus: document.getElementById('liveStatus')
  };

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function announce(message) {
    if (!els.liveStatus) {
      return;
    }
    els.liveStatus.textContent = '';
    window.setTimeout(function () {
      els.liveStatus.textContent = message;
    }, 30);
  }

  function render() {
    var iterations = user.iterations || auth.ITERATIONS;

    setText(els.displayName, user.username);
    setText(els.avatar, String(user.username).charAt(0).toUpperCase() || '?');
    setText(els.accountUsername, user.username);
    setText(els.accountEmail, user.email);
    setText(els.memberSince, auth.formatDate(user.createdAt));
    setText(els.sessionStarted, auth.formatDateTime(session.loginAt));
    setText(els.iterations, new Intl.NumberFormat().format(iterations));
    setText(els.salt, user.salt);
    setText(els.hashPrefix, user.hash.slice(0, 16) + '…');

    if (els.userRecord) {
      els.userRecord.textContent = JSON.stringify(user, null, 2);
    }

    document.body.classList.remove('is-pending');
  }

  function logout() {
    auth.clearSession();
    auth.setFlash('You have been signed out.', 'info');
    window.location.assign('index.html');
  }

  function simulateExpiry() {
    auth.clearSession();
    auth.setFlash('Session expired. Sign in again to open the dashboard.', 'info');
    announce('Session cleared. Reloading the dashboard to show the redirect.');
    window.location.reload();
  }

  render();

  els.logout.addEventListener('click', logout);
  els.simulateExpiry.addEventListener('click', simulateExpiry);
})();
