/* ============================================================
   panels.js  -  the sheets that slide up over the stage
   ------------------------------------------------------------
     gear       the shop, under your character
     settings   account, background, sound, vibration, reset
     guide      the rulebook, as pages you turn
     review     the cards you got wrong, and why
     missions   three goals on the go, and your badges
     mine       your own to-do list, as a plan in four piles
     dialog     a question ("delete everything?") or a note
     coach      the first time you reach a place, a word about it
     toast      one line that comes and goes

   ONE BACK BUTTON FOR ALL OF IT. Android's back closes the top sheet
   if there is one, and only then asks the scene to go back a step.
   Nav.back() at the bottom is the single place that decides; the app
   asks it rather than guessing at which HTML button to click.
   ============================================================ */

var Panels = (function () {

  var stack = [];
  var dialogOk = null;
  var toastTimer = null;
  var coachName = null;
  var page = 0;

  function $(id) { return document.getElementById(id); }

  var SHEETS = { gear: 'sheet-gear', settings: 'sheet-settings', guide: 'sheet-guide', review: 'sheet-review',
                 missions: 'sheet-missions', mine: 'sheet-mine' };

  /* The gear sheet sits over the gear SCENE, which draws the character
     above it - so it needs no dimming and has no close button of its
     own: the scene's back button is its close button. */
  var NO_SCRIM = { gear: true };

  function open(name, data) {
    var el = $(SHEETS[name]);
    if (!el) return;
    if (stack.indexOf(name) === -1) stack.push(name);
    paint(name, data);
    el.classList.add('is-open');
    $('scrim').classList.toggle('is-on', stack.some(function (n) { return !NO_SCRIM[n]; }));
    if (!NO_SCRIM[name]) { Sfx.play('open'); Haptics.tap(); }
  }

  function close(name, silent) {
    var i = stack.indexOf(name);
    if (i === -1) return;
    stack.splice(i, 1);
    var el = $(SHEETS[name]);
    if (el) el.classList.remove('is-open');
    if (document.activeElement && el && el.contains(document.activeElement)) document.activeElement.blur();
    $('scrim').classList.toggle('is-on', stack.some(function (n) { return !NO_SCRIM[n]; }));
    if (!silent) Sfx.play('close');
    if ((name === 'settings' || name === 'missions' || name === 'mine') && Stage.current() === 'home' && Scenes.home) Scenes.home.refresh();
  }

  function top() { return stack[stack.length - 1]; }

  /** Closes whatever is on top. Returns true if there was something. */
  function back() {
    if (!$('dialog').hidden) { closeDialog(); return true; }
    if (coachName) { dismissCoach(); return true; }
    var t = top();
    if (!t || t === 'gear') return false;     // gear closes with its scene
    close(t);
    return true;
  }

  function sheetTop(name) {
    var el = $(SHEETS[name]);
    if (!el) return 0;
    return window.innerHeight - el.getBoundingClientRect().height;
  }

  /* ---------------- painting each sheet ---------------- */

  function paint(name, data) {
    if (name === 'gear') {
      $('hero-name').value = Progress.heroName();
      Shop.paint();
      Hero.paint();
    } else if (name === 'settings') {
      Themes.paintSettings();
      paintSwitches();
    } else if (name === 'guide') {
      showPage(0, true);
      if (!Progress.hasReadGuide()) Progress.markGuideRead();
    } else if (name === 'review') {
      paintReview(data);
    } else if (name === 'missions') {
      paintMissions();
    } else if (name === 'mine') {
      MyList.paint(data);
    }
  }

  function paintSwitches() {
    $('sound-switch').classList.toggle('is-on', Progress.soundOn());
    $('haptics-switch').classList.toggle('is-on', Progress.hapticsOn());
    $('btn-haptics').hidden = !Haptics.supported();
    $('bigtext-switch').classList.toggle('is-on', Progress.bigText());
    $('calmfx-switch').classList.toggle('is-on', Progress.calmFx());
    document.body.classList.toggle('big-text', Progress.bigText());
  }

  /* ---------------- missions and badges ---------------- */

  function paintMissions() {
    Progress.edit('missionsSeen', function () { return Progress.get('missionsDone') || 0; });
    var list = $('mission-list');
    list.innerHTML = '';
    Missions.view().forEach(function (m, i) {
      var li = document.createElement('li');
      li.className = 'mission';
      li.style.setProperty('--i', i);
      var pct = Math.round(m.prog / m.target * 100);
      li.innerHTML = '<span class="mission-ico"></span>' +
        '<span class="mission-body"><b></b><span class="mission-bar"><i style="width:' + pct + '%"></i></span>' +
        '<small>' + m.prog.toLocaleString() + ' / ' + m.target.toLocaleString() + '</small></span>' +
        '<span class="mission-reward"><span class="shop-coin"></span>' + m.reward + '</span>';
      li.querySelector('b').textContent = m.text;
      Sprites.apply(li.querySelector('.mission-ico'), 'target');
      Sprites.apply(li.querySelector('.shop-coin'), 'coin');
      list.appendChild(li);
    });
    var grid = $('badge-grid');
    grid.innerHTML = '';
    BADGES.forEach(function (b, i) {
      var got = Badges.has(b.id);
      var el = document.createElement('div');
      el.className = 'badge' + (got ? ' is-got' : '');
      el.style.setProperty('--i', i);
      el.innerHTML = '<span class="badge-ico"></span><b></b><small></small>';
      el.querySelector('b').textContent = b.name;
      el.querySelector('small').textContent = b.desc;
      Sprites.apply(el.querySelector('.badge-ico'), b.icon);
      grid.appendChild(el);
    });
    $('badge-count').textContent = Badges.count() + ' / ' + BADGES.length;
  }

  /* ---------------- the guide book ---------------- */

  function pages() { return $('guide-pages').querySelectorAll('.page'); }

  function showPage(n, instant) {
    var list = pages();
    n = Math.max(0, Math.min(list.length - 1, n));
    if (n !== page && !instant) Sfx.play('page');
    page = n;
    for (var i = 0; i < list.length; i++) {
      list[i].classList.toggle('is-left', i < n);
      list[i].classList.toggle('is-right', i > n);
      if (i === n) list[i].scrollTop = 0;
    }
    var dots = $('guide-dots');
    dots.innerHTML = '';
    for (i = 0; i < list.length; i++) {
      var d = document.createElement('i');
      if (i === n) d.className = 'is-on';
      dots.appendChild(d);
    }
    $('guide-prev').disabled = n === 0;
    $('guide-next').textContent = n === list.length - 1 ? 'Done' : 'Next →';
  }

  /* ---------------- the review ---------------- */

  function paintReview(R) {
    var list = $('review-list');
    list.innerHTML = '';
    var rows = (R && R.misses) || [];
    $('review-head').textContent = rows.length === 1 ? 'THE ONE YOU MISSED' : 'WHAT YOU MISSED (' + rows.length + ')';
    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'review-row';
      var task = document.createElement('p');
      task.className = 'review-task';
      task.textContent = r.text;
      if (r.times > 1) {
        var again = document.createElement('span');
        again.className = 'review-times';
        again.textContent = 'x' + r.times;
        task.appendChild(again);
      }
      var answers = document.createElement('p');
      answers.className = 'review-answers';
      var mine = document.createElement('span');
      mine.className = 'review-chip is-wrong';
      mine.textContent = r.chose ? 'You said ' + BOXES[r.chose].label : '';
      /* The answer is under a tap. Try to work it out from the reason
         first; tap when you want to check. */
      var hidden = document.createElement('button');
      hidden.type = 'button';
      hidden.className = 'review-chip is-hidden';
      hidden.textContent = 'so what was it? tap';
      if (r.chose === null) mine.textContent = 'It burnt out';
      hidden.addEventListener('click', function () {
        if (!r.box || hidden.classList.contains('is-shown')) return;
        hidden.classList.add('is-shown', 'box-' + r.box);
        hidden.textContent = 'It was ' + BOXES[r.box].label;
        Sfx.play('pop'); Haptics.tap();
      });
      answers.appendChild(mine);
      answers.appendChild(hidden);
      var why = document.createElement('p');
      why.className = 'review-why';
      why.textContent = r.why;
      li.appendChild(task); li.appendChild(answers); li.appendChild(why);
      list.appendChild(li);
    });
  }

  /* ---------------- dialog ---------------- */

  /** A note, or a question. `onOk` makes it a question: Cancel appears
      next to the button, and `danger` paints that button red. */
  function dialog(o) {
    var d = $('dialog');
    Sprites.apply($('dialog-ico'), o.icon || 'hero');
    $('dialog-title').textContent = o.title || '';
    $('dialog-lines').innerHTML = (o.lines || []).map(function (l) { return '<p>' + l + '</p>'; }).join('');
    $('dialog-ok').textContent = o.okText || (o.onOk ? 'OK' : 'Got it');
    $('dialog-no').hidden = !o.onOk;
    d.classList.toggle('is-danger', !!o.danger);
    dialogOk = o.onOk || null;
    d.hidden = false;
    Sfx.play('open');
  }
  function closeDialog(ok) {
    var d = $('dialog');
    if (d.hidden) return;
    d.hidden = true;
    var fn = dialogOk; dialogOk = null;
    Sfx.play('close');
    if (ok && fn) fn();
  }

  /* ---------------- toast ---------------- */

  function toast(text, kind) {
    var el = $('toast');
    el.textContent = text;
    el.className = 'toast is-on' + (kind ? ' is-' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 1800);
  }

  /* ---------------- the first-time note ----------------
     The first time you reach a place, your character tells you what it
     is. Once only: it is remembered in the save. */
  function coachOnce(name) {
    if (!window.TIPS || !TIPS[name] || Progress.hasSeenTip(name)) return;
    /* A beat after arriving, not on the same frame as the transition. */
    setTimeout(function () {
      if (Progress.hasSeenTip(name) || coachName) return;
      var tip = TIPS[name];
      coachName = name;
      Sprites.apply($('coach-who'), 'hero');
      $('coach-title').textContent = tip.title;
      $('coach-lines').innerHTML = tip.lines.map(function (l) { return '<li>' + l + '</li>'; }).join('');
      var c = $('coach');
      c.classList.remove('is-out');
      c.hidden = false;
      Sfx.play('pop');
    }, 650);
  }
  function dismissCoach() {
    if (!coachName) return;
    Progress.markTipSeen(coachName);
    coachName = null;
    var c = $('coach');
    c.classList.add('is-out');
    Sfx.play('close');
    setTimeout(function () { c.hidden = true; }, 240);
  }

  /* ---------------- wiring ---------------- */

  function init() {
    $('scrim').addEventListener('click', function () { back(); });
    var closers = document.querySelectorAll('[data-close]');
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener('click', function (e) {
        var sheet = e.currentTarget.closest('.sheet, .book');
        for (var k in SHEETS) if (SHEETS[k] === sheet.id) close(k);
      });
    }
    var tabs = document.querySelectorAll('[data-shop-tab]');
    for (i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function (e) { Shop.setTab(e.currentTarget.getAttribute('data-shop-tab')); });
    }
    $('guide-prev').addEventListener('click', function () { showPage(page - 1); });
    $('guide-next').addEventListener('click', function () {
      if (page >= pages().length - 1) close('guide'); else showPage(page + 1);
    });
    /* Swipe between pages, the way you turn one. */
    var sx = null;
    $('guide-pages').addEventListener('pointerdown', function (e) { sx = e.clientX; });
    $('guide-pages').addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 60) showPage(page + (dx < 0 ? 1 : -1));
    });
    $('dialog-ok').addEventListener('click', function () { closeDialog(true); });
    $('dialog-no').addEventListener('click', function () { closeDialog(false); });
    $('dialog').addEventListener('click', function (e) { if (e.target === $('dialog')) closeDialog(false); });
    $('coach-ok').addEventListener('click', dismissCoach);

    /* Every picture in the sheets that names a sprite gets it. */
    var pics = document.querySelectorAll('#ui [data-sprite]');
    for (i = 0; i < pics.length; i++) Sprites.apply(pics[i], pics[i].getAttribute('data-sprite'));
  }

  return {
    init: init,
    open: open, close: close, back: back, top: top,
    isOpen: function (name) { return stack.indexOf(name) !== -1; },
    any: function () { return stack.length > 0 || !$('dialog').hidden; },
    sheetTop: sheetTop,
    dialog: dialog, toast: toast,
    coachOnce: coachOnce, dismissCoach: dismissCoach,
    paintSwitches: paintSwitches
  };
})();

/* ---------------- back ----------------
   The ONE answer to "the player pressed back". The Android app calls
   this (see MainActivity) and so does Escape on a keyboard. Returns
   true if it did something, false if there is nowhere left to go back
   to - which on the home screen means: leave the app. */
var Nav = {
  back: function () {
    if (Stage.busy()) return true;
    if (Panels.back()) return true;
    var sc = Stage.scene();
    if (sc && sc.back) return !!sc.back();
    return false;
  }
};
