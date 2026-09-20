/* ============================================================
   ui.js  -  screens, the rolling score, sounds
   ============================================================ */

var UI = (function () {

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- screens ---------------- */

  function showScreen(name) {
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('is-on');
    var el = $('screen-' + name);
    if (el) el.classList.add('is-on');

    /* The bottom bar belongs to the five browsing screens. It stays off
       during a round and on the title and end screens. Each tab lights
       up on its own screen - one list, so adding a sixth tab later means
       adding one line here and nothing else. */
    var TABS = {
      levels: 'tab-map',
      guide:  'tab-guide',
      hero:   'tab-hero',
      battle: 'tab-battle',
      shop:   'tab-shop'
    };

    var bar = $('tabbar');
    if (bar) bar.hidden = !TABS[name];

    for (var screen in TABS) {
      var tab = $(TABS[screen]);
      if (tab) tab.classList.toggle('is-on', name === screen);
    }

    /* The first time any screen opens, its popup explains it. Hooked in
       here because every route onto every screen passes through this one
       function - a tab, a button, the end of a round - so no way in can
       skip it. */
    if (window.Tips) Tips.maybeShow(name);
  }

  /* ---------------- rolling score (odometer) ---------------- */

  var odoEl = null, odoDigits = 0;

  function buildOdometer(count) {
    odoEl.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var col = document.createElement('span');
      col.className = 'odo-col';
      var strip = document.createElement('span');
      strip.className = 'odo-strip';
      for (var d = 0; d < 10; d++) {
        var cell = document.createElement('span');
        cell.className = 'odo-cell';
        cell.textContent = String(d);
        strip.appendChild(cell);
      }
      col.appendChild(strip);
      odoEl.appendChild(col);
    }
    odoDigits = count;
  }

  function setScore(value) {
    if (!odoEl) odoEl = $('odo');
    value = Math.max(0, Math.round(value));
    var text = String(value);
    if (text.length !== odoDigits) buildOdometer(text.length);

    var strips = odoEl.querySelectorAll('.odo-strip');
    for (var i = 0; i < strips.length; i++) {
      strips[i].style.transform = 'translateY(' + (-(+text.charAt(i)) * 10) + '%)';
    }
  }

  /* ---------------- floating points ---------------- */

  function floatText(text, x, y, kind) {
    var el = document.createElement('div');
    el.className = 'float-pts' + (kind ? ' is-' + kind : '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
  }

  /* ---------------- sound ----------------
     Generated on the fly, so the game ships with zero audio files
     and stays tiny. */

  var actx = null;

  function audio() {
    if (actx === null) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { actx = false; }
    }
    return actx;
  }

  function tone(freq, ms, type, vol) {
    var a = audio();
    if (!a) return;
    try {
      var osc = a.createOscillator();
      var gain = a.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.value = vol === undefined ? 0.06 : vol;
      gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
      osc.connect(gain); gain.connect(a.destination);
      osc.start();
      osc.stop(a.currentTime + ms / 1000);
    } catch (e) { /* sound is nice to have, never required */ }
  }

  var SOUND = {
    good:    function (streak) { tone(520 + Math.min(streak, 10) * 40, 90, 'square'); },
    perfect: function () { tone(880, 70, 'square'); setTimeout(function () { tone(1320, 90, 'square'); }, 70); },
    bad:     function () { tone(150, 180, 'sawtooth', 0.05); },
    over:    function () { tone(220, 300, 'sawtooth', 0.05); },
    tick:    function () { tone(700, 40, 'square', 0.03); }
  };

  return {
    $: $,
    showScreen: showScreen,
    setScore: setScore,
    floatText: floatText,
    sound: SOUND
  };
})();
