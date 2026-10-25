/* ============================================================
   main.js  -  boots the game and wires the few HTML controls
   ------------------------------------------------------------
   Almost everything you press is drawn on the stage and wired inside
   its own scene (js/scenes.js, js/arena.js, js/results.js). What is
   left here is booting, the settings sheet's switches and account
   box, and the global rules every screen shares: the first tap wakes
   the sound, a hidden tab is a silent one, Escape means back.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  var $ = UI.$;

  Progress.load();
  UI.sound.setOn(Progress.soundOn());
  Game.init();
  Hero.init();
  Panels.init();
  Cloud.init();
  Stage.init();
  Themes.init();

  /* A scene with nothing in it but the world, for the moment between
     the page arriving and the pictures being ready. */
  Stage.define('boot', { draw: function (c, W, H) { World.draw(c, W, H, { dim: 0.2 }); } });
  Stage.go('boot', {}, 'none');
  Gfx.preload(function () { Stage.go('title', {}, 'fade'); });

  /* ---- settings: sound and vibration ---- */

  $('btn-sound').addEventListener('click', function () {
    var on = !Progress.soundOn();
    Progress.setSoundOn(on);
    UI.sound.setOn(on);
    Panels.paintSwitches();
    Sfx.play('release');      // silent when you just turned it off, which is the point
  });

  $('btn-haptics').addEventListener('click', function () {
    var on = !Progress.hapticsOn();
    Progress.setHapticsOn(on);
    Panels.paintSwitches();
    Haptics.good();           // the buzz you just switched on, so you know it works
    Sfx.play('release');
  });

  $('btn-guide').addEventListener('click', function () {
    Panels.close('settings', true);
    Panels.open('guide');
  });

  /* ---- settings: the account ---- */

  function acctMsg(text, kind) {
    var el = $('acct-msg');
    el.hidden = !text;
    el.textContent = text || '';
    el.className = 'acct-msg' + (kind ? ' is-' + kind : '');
  }

  function acctBusy(on) {
    ['btn-signin', 'btn-signup', 'btn-signout'].forEach(function (id) { $(id).disabled = on; });
  }

  /* One place decides what the account box looks like, and it runs on
     every change - signing in, signing out, a failed upload. */
  Cloud.onChange(function (state) {
    $('acct-in').hidden = !state.signedIn;
    $('acct-out').hidden = state.signedIn;
    $('acct-name').textContent = state.username || '';
    if (state.error) acctMsg(state.error, null);
  });

  /** After the save has been swapped for the one on the account, every
      place that shows a piece of it has to be told. */
  function afterNewSave() {
    $('hero-name').value = Progress.heroName();
    UI.sound.setOn(Progress.soundOn());
    Panels.paintSwitches();
    Themes.apply();
    Themes.paintSettings();
    if (Stage.current() === 'home') Scenes.home.refresh();
  }

  function tryAccount(which) {
    var name = $('acct-user').value.trim();
    var pass = $('acct-pass').value;
    acctBusy(true);
    acctMsg(which === 'up' ? 'Making your account...' : 'Signing in...', 'busy');
    var run = which === 'up' ? Cloud.signUp(name, pass) : Cloud.signIn(name, pass);
    run.then(function (what) {
      $('acct-pass').value = '';
      /* Say which way the save went. Somebody whose progress was just
         replaced by their account deserves to be told. */
      acctMsg(what === 'downloaded'
        ? 'Signed in. Your saved progress has been loaded onto this device.'
        : 'Signed in. The progress on this device is now saved to your account.', 'good');
      Sfx.play('unlock');
      afterNewSave();
    }).catch(function (e) {
      acctMsg(e.message || 'That did not work', null);
      Sfx.play('nope');
    }).then(function () { acctBusy(false); });
  }

  $('btn-signin').addEventListener('click', function () { tryAccount('in'); });
  $('btn-signup').addEventListener('click', function () { tryAccount('up'); });
  $('acct-pass').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tryAccount('in');
    e.stopPropagation();
  });
  $('acct-user').addEventListener('keydown', function (e) { e.stopPropagation(); });
  $('btn-signout').addEventListener('click', function () {
    Cloud.signOut();
    acctMsg('Signed out. Your progress is still here on this device.', 'good');
  });

  /* ---- settings: reset ----
     Asks first, and names what is lost rather than saying "are you
     sure", because "are you sure" tells nobody anything. */
  $('btn-reset').addEventListener('click', function () {
    Panels.dialog({
      icon: 'bin',
      title: 'Delete everything?',
      lines: [
        'This wipes <b>every level you have passed</b>, all your coins, every pet and every piece of gear you have bought, and the name you gave your character.',
        'If you are signed in, the empty save is uploaded to your account as well.',
        '<b>There is no undo.</b>'
      ],
      okText: 'Delete everything',
      danger: true,
      onOk: function () {
        Progress.reset();
        Wallet.clear();
        afterNewSave();
        Panels.close('settings', true);
        Panels.toast('Everything has been reset.', 'good');
        Stage.go('title', {}, 'cards');
      }
    });
  });

  /* ---- the rules every screen shares ---- */

  /* THE FIRST TAP UNLOCKS THE SOUND. Nothing is allowed to make a noise
     until the person has touched the page; this asks again on the first
     real gesture, then takes itself off. */
  (function () {
    function wake() {
      if (window.Music) Music.wake();
      document.removeEventListener('pointerdown', wake, true);
      document.removeEventListener('keydown', wake, true);
    }
    document.addEventListener('pointerdown', wake, true);
    document.addEventListener('keydown', wake, true);
  })();

  /* A game has no business singing to a tab nobody is looking at, and on
     a phone that is battery spent behind a locked screen. */
  document.addEventListener('visibilitychange', function () {
    if (!window.Music) return;
    if (document.hidden) Music.pause(); else Music.resume();
  });

  /* Escape is back, the same back as the Android button. */
  window.addEventListener('keydown', function (e) {
    /* The round handles its own Escape: it pauses rather than leaves. */
    if (e.key === 'Escape' && Stage.current() !== 'round') Nav.back();
  });
});
