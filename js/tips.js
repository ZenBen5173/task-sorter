/* ============================================================
   tips.js  -  the first-time popups
   ------------------------------------------------------------
   The first time a player opens each screen, a short card pops up
   saying what the screen is for and what to do on it. Close it and
   it never comes back for that screen.

   EDITING A TIP: change the words below. Keep each one to three
   short lines - it is a sign on the door, not a manual. The Guide
   Book is the manual.

   ADDING A TIP FOR A NEW SCREEN: add an entry whose key is the
   screen's name (the part after "screen-" in index.html). That is
   all - it shows up automatically the first time that screen opens.

   "Reset all progress" on the Character screen brings every tip back.
   ============================================================ */

var TIPS = {

  guide: {
    icon: 'book',
    title: 'The Guide Book',
    lines: [
      'This is the rulebook. <b>Everything the game marks you on is in here.</b>',
      'Scroll down to read it.',
      'When you are ready, tap <b>Map</b> at the bottom to start playing.'
    ]
  },

  levels: {
    icon: 'map',
    title: 'The Map',
    lines: [
      'Each circle is a level, and each level is a <b>place in your day</b> - home, school, your phone, out in town.',
      '<b>Tap a circle to play it.</b> Pass it to unlock the next one.',
      'Your best grade is shown on the circle afterwards.'
    ]
  },

  play: {
    icon: 'bang',
    title: 'How to play',
    lines: [
      '<b>Swipe the card into the corner it belongs in.</b> On a laptop use Q W A S.',
      '<em class="c-now">Do Now</em> matters and is due today. <em class="c-later">Do Later</em> matters but can wait. <em class="c-give">Give Away</em> is urgent but someone else can do it. <em class="c-drop">Drop</em> is neither.',
      'Get one wrong and you just keep going - <b>every mistake is explained at the end.</b>'
    ]
  },

  hero: {
    icon: 'hero',
    title: 'Your Character',
    lines: [
      'Tap <b>Pet</b>, <b>Weapon</b> or <b>Armour</b> to change what you are wearing.',
      'The bars underneath show what your gear does to a round.',
      'Wear all three at once for <b>+25% coins</b>. New gear comes from the Shop.'
    ]
  },

  battle: {
    icon: 'battle',
    title: 'Battle',
    lines: [
      'Fight a rival one on one. <b>You both sort the same cards.</b>',
      'Sort right and you hit them. Sort wrong and they hit you.',
      'Beat a rival to unlock the next, tougher one.'
    ]
  },

  shop: {
    icon: 'shop',
    title: 'The Shop',
    lines: [
      'Spend the coins you win on gear.',
      '<b>Weapon</b> - more points. <b>Armour</b> - covers wrong answers. <b>Pet</b> - more coins, but your clock runs faster.',
      'Some items stay locked until you reach a certain level.'
    ]
  }
};

var Tips = (function () {

  var showing = null;   // which screen's tip is open right now

  /** Called every time a screen opens. Pops that screen's tip if this
      player has never seen it; does nothing otherwise. */
  function maybeShow(screen) {
    var tip = TIPS[screen];
    if (!tip || Progress.hasSeenTip(screen) || showing) return;
    showing = screen;

    /* A round is already running under the popup. Freeze it, or the
       clock would tick away while the player is still reading how to
       play - on their very first go, of all times. */
    if (screen === 'play') Game.pause();

    render(tip);
  }

  /** The same popup, opened on purpose rather than on a first visit -
      for a button that needs to explain itself. Never remembered, so it
      shows every time it is asked for. */
  function showInfo(tip) {
    if (showing) return;
    showing = '__info';
    render(tip);
  }

  function render(tip) {
    Sprites.apply(UI.$('tip-ico'), tip.icon);
    UI.$('tip-title').textContent = tip.title;

    var list = UI.$('tip-lines');
    list.innerHTML = '';
    tip.lines.forEach(function (line) {
      var li = document.createElement('li');
      li.innerHTML = line;
      list.appendChild(li);
    });

    var el = UI.$('tip');
    el.hidden = false;
    void el.offsetWidth;          // let it draw once so the fade-in plays
    el.classList.add('is-on');
  }

  function close() {
    if (!showing) return;
    if (showing !== '__info') Progress.markTipSeen(showing);
    if (showing === 'play') Game.resume();
    showing = null;

    var el = UI.$('tip');
    el.classList.remove('is-on');
    setTimeout(function () { if (!showing) el.hidden = true; }, 180);
    UI.sound.tick();
  }

  function init() {
    UI.$('tip-ok').addEventListener('click', close);
    // tapping the dark area around the card closes it too
    UI.$('tip').addEventListener('click', function (e) {
      if (e.target === UI.$('tip')) close();
    });
  }

  return {
    init: init,
    maybeShow: maybeShow,
    showInfo: showInfo,
    isOpen: function () { return !!showing; }
  };
})();
