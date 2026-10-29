/*
 * Password scheme: a 16-byte random salt is stored as hex. h0 = SHA-256(salt || password),
 * then h = SHA-256(salt || h) for 999 more rounds; only hex(h999) and the salt are kept.
 * Plaintext passwords are never written to storage. This is a front-end demo, not
 * production authentication (see README).
 */

(function (global) {
  'use strict';

  var USERS_KEY = 'latch.users.v1';
  var SESSION_KEY = 'latch.session.v1';
  var FLASH_KEY = 'latch.flash.v1';
  var SEEDED_KEY = 'latch.seeded.v1';
  var ITERATIONS = 1000;
  var SALT_BYTES = 16;
  var DEMO_ACCOUNT = {
    username: 'demo',
    email: 'demo@latch.dev',
    password: 'Demo1234'
  };
  var DUMMY_SALT = '4f8d2c1a9b7e6355a0c4d9e1f2b3a5c7';

  var encoder = new TextEncoder();
  var readyPromise = null;
  var readyResolve = null;
  readyPromise = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  function isCryptoAvailable() {
    return Boolean(
      global.isSecureContext &&
        global.crypto &&
        global.crypto.subtle &&
        typeof global.crypto.subtle.digest === 'function'
    );
  }

  function bytesToHex(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 1) {
      out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
  }

  function hexToBytes(hex) {
    var clean = String(hex).replace(/[^0-9a-f]/gi, '');
    var bytes = new Uint8Array(Math.floor(clean.length / 2));
    for (var i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  function concatBytes(first, second) {
    var merged = new Uint8Array(first.length + second.length);
    merged.set(first, 0);
    merged.set(second, first.length);
    return merged;
  }

  function randomSalt() {
    var bytes = new Uint8Array(SALT_BYTES);
    global.crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }

  async function sha256Bytes(bytes) {
    var digest = await global.crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(digest);
  }

  async function hashPassword(password, saltHex, iterations) {
    if (!isCryptoAvailable()) {
      throw new Error(
        'Password hashing needs a secure browser context. Serve the folder over http://localhost or http://127.0.0.1.'
      );
    }
    var rounds = Number(iterations) || ITERATIONS;
    var saltBytes = hexToBytes(saltHex);
    var digest = await sha256Bytes(concatBytes(saltBytes, encoder.encode(String(password))));
    for (var i = 1; i < rounds; i += 1) {
      digest = await sha256Bytes(concatBytes(saltBytes, digest));
    }
    return bytesToHex(digest);
  }

  function constantTimeEqualHex(a, b) {
    var left = String(a || '');
    var right = String(b || '');
    if (left.length !== right.length) {
      return false;
    }
    var diff = 0;
    for (var i = 0; i < left.length; i += 1) {
      diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }
    return diff === 0;
  }

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function isValidRecord(record) {
    return Boolean(
      record &&
        typeof record === 'object' &&
        typeof record.username === 'string' &&
        typeof record.usernameKey === 'string' &&
        typeof record.email === 'string' &&
        typeof record.emailKey === 'string' &&
        typeof record.salt === 'string' &&
        typeof record.hash === 'string' &&
        typeof record.createdAt === 'number'
    );
  }

  function getUsers() {
    try {
      var parsed = safeParse(global.localStorage.getItem(USERS_KEY));
      if (!parsed || !Array.isArray(parsed.users)) {
        return [];
      }
      return parsed.users.filter(isValidRecord);
    } catch (error) {
      return [];
    }
  }

  function saveUsers(users) {
    try {
      global.localStorage.setItem(
        USERS_KEY,
        JSON.stringify({ version: 1, updatedAt: Date.now(), users: users })
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  function findUser(identifier) {
    var key = String(identifier || '').trim().toLowerCase();
    if (!key) {
      return null;
    }
    var users = getUsers();
    for (var i = 0; i < users.length; i += 1) {
      if (users[i].usernameKey === key || users[i].emailKey === key) {
        return users[i];
      }
    }
    return null;
  }

  function getUserRecord(username) {
    var key = String(username || '').trim().toLowerCase();
    var users = getUsers();
    for (var i = 0; i < users.length; i += 1) {
      if (users[i].usernameKey === key) {
        return users[i];
      }
    }
    return null;
  }

  function setSession(user) {
    try {
      global.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          username: user.username,
          email: user.email,
          loginAt: Date.now()
        })
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  function getSession() {
    try {
      var raw = global.sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }
      var session = safeParse(raw);
      if (
        !session ||
        typeof session.username !== 'string' ||
        typeof session.email !== 'string' ||
        typeof session.loginAt !== 'number' ||
        !session.username
      ) {
        return null;
      }
      return session;
    } catch (error) {
      return null;
    }
  }

  function clearSession() {
    try {
      global.sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
    }
  }

  function setFlash(message, tone) {
    try {
      global.sessionStorage.setItem(
        FLASH_KEY,
        JSON.stringify({ message: String(message), tone: tone || 'info' })
      );
    } catch (error) {
    }
  }

  function consumeFlash() {
    try {
      var raw = global.sessionStorage.getItem(FLASH_KEY);
      global.sessionStorage.removeItem(FLASH_KEY);
      if (!raw) {
        return null;
      }
      var flash = safeParse(raw);
      return flash && typeof flash.message === 'string' ? flash : null;
    } catch (error) {
      return null;
    }
  }

  async function registerUser(input) {
    await readyPromise;
    var username = String(input.username || '').trim();
    var email = String(input.email || '').trim();
    var password = String(input.password || '');
    var usernameKey = username.toLowerCase();
    var emailKey = email.toLowerCase();
    var users = getUsers();

    var usernameTaken = users.some(function (user) {
      return user.usernameKey === usernameKey;
    });
    if (usernameTaken) {
      return {
        ok: false,
        field: 'username',
        message: 'That username is already registered. Try a different one.'
      };
    }

    var emailTaken = users.some(function (user) {
      return user.emailKey === emailKey;
    });
    if (emailTaken) {
      return {
        ok: false,
        field: 'email',
        message: 'That email is already registered. Try signing in instead.'
      };
    }

    if (!isCryptoAvailable()) {
      return {
        ok: false,
        field: 'form',
        message:
          'Password hashing needs a secure context. Serve this folder over http://localhost or http://127.0.0.1 and reload.'
      };
    }

    var salt = randomSalt();
    var hash = await hashPassword(password, salt, ITERATIONS);
    var record = {
      username: username,
      usernameKey: usernameKey,
      email: email,
      emailKey: emailKey,
      salt: salt,
      hash: hash,
      iterations: ITERATIONS,
      createdAt: Date.now()
    };

    users.push(record);
    if (!saveUsers(users)) {
      return {
        ok: false,
        field: 'form',
        message: 'This browser blocked local storage, so the account could not be saved.'
      };
    }

    return { ok: true, user: record };
  }

  async function loginUser(identifier, password) {
    await readyPromise;
    if (!isCryptoAvailable()) {
      return { ok: false, unavailable: true };
    }

    var user = findUser(identifier);
    if (!user) {
      /* Hash anyway so unknown usernames take a similar amount of time. */
      await hashPassword(password, DUMMY_SALT, ITERATIONS);
      return { ok: false };
    }

    var candidate = await hashPassword(password, user.salt, user.iterations || ITERATIONS);
    if (!constantTimeEqualHex(candidate, user.hash)) {
      return { ok: false };
    }

    if (!setSession(user)) {
      return { ok: false, storage: true };
    }

    return { ok: true, user: user, session: getSession() };
  }

  function formatDateTime(timestamp) {
    if (typeof timestamp !== 'number') {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(timestamp));
    } catch (error) {
      return new Date(timestamp).toLocaleString();
    }
  }

  function formatDate(timestamp) {
    if (typeof timestamp !== 'number') {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(timestamp)
      );
    } catch (error) {
      return new Date(timestamp).toLocaleDateString();
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showSecureContextNotice(element) {
    if (!element) {
      return;
    }
    if (isCryptoAvailable()) {
      element.hidden = true;
      return;
    }
    element.hidden = false;
    element.textContent =
      'Password hashing needs a secure context (crypto.subtle). Serve this folder over ' +
      'http://localhost or http://127.0.0.1 — for example: python3 -m http.server 8000 — ' +
      'and reload. Some browsers also allow it on file:// pages, but a local server is the reliable option.';
  }

  async function ensureDemoAccount() {
    try {
      var alreadySeeded = global.localStorage.getItem(SEEDED_KEY) === '1';
      var users = getUsers();
      var demoExists = users.some(function (user) {
        return user.usernameKey === DEMO_ACCOUNT.username;
      });

      if (!alreadySeeded && !demoExists && isCryptoAvailable()) {
        var salt = randomSalt();
        var hash = await hashPassword(DEMO_ACCOUNT.password, salt, ITERATIONS);
        users.push({
          username: DEMO_ACCOUNT.username,
          usernameKey: DEMO_ACCOUNT.username,
          email: DEMO_ACCOUNT.email,
          emailKey: DEMO_ACCOUNT.email,
          salt: salt,
          hash: hash,
          iterations: ITERATIONS,
          createdAt: Date.now()
        });
        saveUsers(users);
      }
      try {
        global.localStorage.setItem(SEEDED_KEY, '1');
      } catch (error) {
      }
    } catch (error) {
    } finally {
      readyResolve(true);
    }
  }

  var api = {
    USERS_KEY: USERS_KEY,
    SESSION_KEY: SESSION_KEY,
    FLASH_KEY: FLASH_KEY,
    ITERATIONS: ITERATIONS,
    SALT_BYTES: SALT_BYTES,
    DEMO_ACCOUNT: DEMO_ACCOUNT,
    isCryptoAvailable: isCryptoAvailable,
    ensureReady: function () {
      return readyPromise;
    },
    hashPassword: hashPassword,
    randomSalt: randomSalt,
    getUsers: getUsers,
    findUser: findUser,
    getUserRecord: getUserRecord,
    registerUser: registerUser,
    loginUser: loginUser,
    setSession: setSession,
    getSession: getSession,
    clearSession: clearSession,
    setFlash: setFlash,
    consumeFlash: consumeFlash,
    formatDateTime: formatDateTime,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    showSecureContextNotice: showSecureContextNotice,
    secureContextOk: isCryptoAvailable
  };

  global.LatchAuth = api;

  /* Seed after parsing so it does not delay first paint. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureDemoAccount);
  } else {
    ensureDemoAccount();
  }
})(window);
