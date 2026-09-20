/* ============================================================
   cloud.js  -  accounts, and saving your progress online
   ------------------------------------------------------------
   Make an account with a USERNAME and a password. Your progress is
   then kept on a server, so the same account picks up where it left
   off on any phone or computer.

   NO EMAIL IS EVER ASKED FOR. The player types a username; behind the
   scenes it becomes "username@tasksorter.invalid". `.invalid` is a
   domain reserved by the internet standards so that it can NEVER be
   registered by anybody - no message can ever leave for a real person.
   That is deliberate: this is a game played by children, and the less
   personal information it holds, the better.

   THE GAME STILL WORKS WITH NO INTERNET. Everything here is an extra
   layer on top of the ordinary save in the browser. If the server is
   unreachable, or the account library fails to load, the game carries
   on exactly as it always did and simply says it is offline.

   WHICH SAVE WINS when you sign in:
     - the account has never been played -> your progress here is
       uploaded to it
     - the account has progress          -> the account's progress
       wins and replaces what is on this device
   That rule is blunt on purpose. Trying to merge two saves would have
   to guess, and a guess that silently deletes somebody's coins is far
   worse than a rule you can predict.
   ============================================================ */

var CLOUD = {
  url: 'https://grhnczwqilayvxfaypmj.supabase.co',

  /* This key is MEANT to be public - it is in every copy of the game.
     It grants nothing on its own: the database will only ever return
     or change the row belonging to whoever is signed in, and that is
     enforced by the database, not by this file. */
  key: 'sb_publishable_wDGxIbxxFXMMunzEXULoJA_Und14toQ',

  /* Usernames are turned into addresses at this domain. Reserved by
     RFC 2606; it cannot be registered, so nothing can be delivered. */
  domain: 'tasksorter.invalid',

  SAVE_KEY: 'task-sorter-session-v1',   // where the sign-in is remembered
  PUSH_DELAY_MS: 1500                   // wait this long after a change
};

var Cloud = (function () {

  var session = null;      // { access_token, refresh_token, user: { id } }
  var username = '';
  var pushTimer = null;
  var listeners = [];

  /* ---------------- talking to the server ---------------- */

  function api(path, opts) {
    opts = opts || {};
    var headers = { 'apikey': CLOUD.key, 'Content-Type': 'application/json' };
    if (opts.auth && session) headers['Authorization'] = 'Bearer ' + session.access_token;
    for (var h in (opts.headers || {})) headers[h] = opts.headers[h];

    return fetch(CLOUD.url + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        if (!r.ok) {
          var msg = (data && (data.msg || data.error_description || data.message || data.error))
            || ('Server said ' + r.status);
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  function emailFor(name) {
    return String(name).toLowerCase() + '@' + CLOUD.domain;
  }

  /* ---------------- signing in and out ---------------- */

  function validName(name) {
    return /^[A-Za-z0-9_]{3,14}$/.test(name || '');
  }

  function signUp(name, password) {
    if (!validName(name)) {
      return Promise.reject(new Error('Names are 3 to 14 letters, numbers or _'));
    }
    if ((password || '').length < 6) {
      return Promise.reject(new Error('Password needs at least 6 characters'));
    }
    return api('/auth/v1/signup', {
      method: 'POST',
      body: { email: emailFor(name), password: password, data: { username: name } }
    }).then(function (res) {
      /* No token back means the server wants an email confirmed - which
         can never happen with a .invalid address. Say so plainly rather
         than leaving the player pressing a dead button. */
      if (!res || !res.access_token) {
        throw new Error('Accounts are not switched on for this game yet.');
      }
      return adopt(res, name);
    });
  }

  function signIn(name, password) {
    return api('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: emailFor(name), password: password }
    }).then(function (res) {
      return adopt(res, name);
    }).catch(function (e) {
      // the server says "invalid credentials" for both cases; be kinder
      if (/invalid/i.test(e.message)) throw new Error('Wrong name or password');
      throw e;
    });
  }

  function adopt(res, name) {
    session = res;
    username = name || (res.user && res.user.user_metadata && res.user.user_metadata.username) || name;
    remember();
    return pullOrPush().then(function (what) {
      announce();
      return what;
    });
  }

  function signOut() {
    /* Only the sign-in is forgotten. The progress stays on this device,
       exactly as it would for somebody who never made an account. */
    session = null;
    username = '';
    try { localStorage.removeItem(CLOUD.SAVE_KEY); } catch (e) {}
    announce();
  }

  function remember() {
    try {
      localStorage.setItem(CLOUD.SAVE_KEY, JSON.stringify({
        refresh_token: session.refresh_token, username: username
      }));
    } catch (e) {}
  }

  /** Comes back signed in from last time, if the saved pass is still good. */
  function resume() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(CLOUD.SAVE_KEY) || 'null'); } catch (e) {}
    if (!saved || !saved.refresh_token) return Promise.resolve(false);

    return api('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: saved.refresh_token }
    }).then(function (res) {
      return adopt(res, saved.username).then(function () { return true; });
    }).catch(function () {
      // expired or revoked: quietly go back to being a local player
      try { localStorage.removeItem(CLOUD.SAVE_KEY); } catch (e) {}
      return false;
    });
  }

  /* ---------------- moving the save around ---------------- */

  function pullOrPush() {
    return api('/rest/v1/profiles?select=progress,username&id=eq.' + session.user.id, { auth: true })
      .then(function (rows) {
        var row = rows && rows[0];
        if (row && row.username) username = row.username;

        var cloudSave = row && row.progress;
        var cloudIsEmpty = !cloudSave || Object.keys(cloudSave).length === 0;

        if (cloudIsEmpty) {
          return push().then(function () { return 'uploaded'; });
        }
        Progress.replaceAll(cloudSave);
        return 'downloaded';
      });
  }

  function push() {
    if (!session) return Promise.resolve();
    return api('/rest/v1/profiles?id=eq.' + session.user.id, {
      method: 'PATCH',
      auth: true,
      headers: { 'Prefer': 'return=minimal' },
      body: { progress: Progress.all() }
    });
  }

  /** Called after every single save. Batched, so finishing a level does
      not fire one upload per coin, streak and unlock it touched. */
  function onProgressChanged() {
    if (!session) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      push().then(function () { announce(); }).catch(function () { announce('Could not save online'); });
    }, CLOUD.PUSH_DELAY_MS);
  }

  /* ---------------- telling the screen what happened ---------------- */

  function announce(error) {
    var state = {
      signedIn: !!session,
      username: username,
      userId: session ? session.user.id : null,
      error: error || null
    };
    listeners.forEach(function (fn) { try { fn(state); } catch (e) {} });
  }

  function init() {
    Progress.subscribe(onProgressChanged);
    resume();
  }

  return {
    init: init,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    push: push,
    onChange: function (fn) { listeners.push(fn); announce(); },
    isSignedIn: function () { return !!session; },
    name: function () { return username; },
    userId: function () { return session ? session.user.id : null; },
    token: function () { return session ? session.access_token : null; }
  };
})();
