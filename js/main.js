/* ============================================================
   main.js  -  boots the game, draws the level map, wires buttons
   ============================================================ */

/** Drops the level markers onto the trail. Each one sits at the x/y
    percent set in levels.js, so the map stretches to any phone. */
function paintLevels() {
  var scene = UI.$('lv-scene');

  // clear only the nodes, leaving the trail and scenery alone
  var old = scene.querySelectorAll('.lv-node');
  for (var i = 0; i < old.length; i++) old[i].remove();

  UI.$('lv-title').textContent = PACK.name;
  UI.$('lv-sub').textContent = PACK.sub;

  var next = Progress.unlocked();

  LEVELS.forEach(function (lv) {
    var open = Progress.isOpen(lv.n);
    var best = Progress.best(lv.n);

    var node = document.createElement('button');
    node.type = 'button';
    node.className = 'lv-node'
      + (open ? '' : ' is-locked')
      + (best ? ' is-done' : '')
      + (lv.n === next ? ' is-next' : '');
    node.style.left = lv.x + '%';
    node.style.top = lv.y + '%';
    node.disabled = !open;
    node.setAttribute('aria-label',
      open ? ('Level ' + lv.n + ', ' + lv.name) : ('Level ' + lv.n + ', locked'));

    var face = document.createElement('span');
    face.className = 'lv-face';
    if (!open) {
      face.textContent = '🔒';
      face.classList.add('is-lock');
    } else if (best) {
      face.textContent = best.grade;
      face.classList.add('grade-' + best.grade);
    } else {
      face.textContent = lv.n;
    }
    node.appendChild(face);

    /* Three stars under every level you have beaten. A grade is a mark;
       stars are the thing you collect, and three empty ones say plainly
       that there is something still on the table here. */
    if (best) {
      var stars = document.createElement('span');
      stars.className = 'lv-stars';
      var got = Progress.starsFor(lv.n);
      for (var si = 1; si <= 3; si++) {
        var st = document.createElement('span');
        st.className = 'lv-star' + (si <= got ? ' is-on' : '');
        st.textContent = '\u2605';
        stars.appendChild(st);
      }
      node.appendChild(stars);
    }

    if (open) {
      node.addEventListener('click', function () {
        UI.sound.tick();
        UI.$('lv-ribbon').textContent = lv.name;
        Game.start(lv.n);
      });
      // tapping and holding shows what the place is
      node.addEventListener('pointerenter', function () {
        UI.$('lv-ribbon').textContent = lv.name;
      });
    }

    scene.appendChild(node);
  });

  // the ribbon names wherever you are heading next
  var nextLv = LEVELS[Math.min(next, LEVELS.length) - 1];
  if (nextLv) UI.$('lv-ribbon').textContent = nextLv.name;

  // keep the coin count honest wherever we came from
  Shop.paintCoins();
}

/** Draws the home hub: your character in the gear you chose, your rank,
    your stars, and what PLAY is about to open. */
function paintHome() {
  var stars = Progress.stars();
  var rank = rankFor(stars);

  UI.$('home-stars').textContent = stars;
  UI.$('rank-name').textContent = rank.name;
  UI.$('rank-stars').textContent = stars + ' / ' + STAR_MAX + ' stars';
  UI.$('rank-fill').style.width = (STAR_MAX ? stars / STAR_MAX * 100 : 0) + '%';
  UI.$('home-name').textContent = Hero.name();

  /* The whole party in one picture: the character wearing the armour
     and the weapon you chose, with the pet walking beside them. It used
     to be the plain figure and a pet floating next to it, which proved
     you owned a pet and nothing else. */
  Hero.paintFigure(UI.$('home-hero'), true, 64);

  /* PLAY says where it is going. "Level 3 - On Your Phone" is a reason
     to tap it; "Play" on its own is furniture. */
  var next = LEVELS[Math.min(Progress.unlocked(), LEVELS.length) - 1];
  UI.$('play-next').textContent = next
    ? ('Level ' + next.n + ' \u00b7 ' + next.name)
    : 'Every level beaten';

  paintCollection();

  var beaten = Progress.rivalsBeaten();
  UI.$('home-battle-sub').textContent = beaten >= OPPONENTS.length
    ? 'Every boss beaten'
    : 'Next: ' + OPPONENTS[beaten].name;

  Shop.paintCoins();
}

/** The pets you have actually caught, walking along the bottom of the
    home screen. Only the ones you own: an empty slot here would be a
    shopping list, and this is meant to be the shelf. */
function paintCollection() {
  var row = UI.$('collect-row');
  var pets = SHOP.pet.items.filter(function (it) {
    return it.cost !== 0 && Progress.owns(it.id);
  });

  UI.$('collect-count').textContent =
    pets.length + ' of ' + (SHOP.pet.items.length - 1) + ' pets';

  row.innerHTML = '';
  if (!pets.length) {
    var none = document.createElement('small');
    none.className = 'collect-none';
    none.textContent = 'No pets yet. They are in the Gear shop.';
    row.appendChild(none);
    return;
  }
  pets.forEach(function (it) {
    var cell = document.createElement('span');
    cell.className = 'collect-pet';
    Sprites.apply(cell, it.sprite, 30);
    row.appendChild(cell);
  });
}

/* ============================================================
   TEMPORARY - PREVIEW MODE. DELETE THIS BEFORE THE ENTRY GOES IN.
   ------------------------------------------------------------
   Opening the game with ?preview=gear fills the wallet and marks every
   level and boss as beaten, so the whole shop can be looked at without
   playing through to it. It exists because the only other way to see
   the gear is a browser console, and a console is not always available.

   IT IS A CHEAT AND IT IS IN A PUBLIC REPOSITORY. Anyone who reads this
   file or guesses the parameter can unlock the game with it, so it does
   not stay. Ripping it out is this one function and the one line below
   that calls it - nothing else in the game knows it is here.

   ?preview=off puts the save back to a fresh one.
   ============================================================ */
function previewMode() {
  var want = (location.search.match(/[?&]preview=([^&]*)/) || [])[1];
  if (!want) return;

  if (want === 'off') {
    Progress.reset();
  } else {
    Progress.addCoins(99999);
    for (var n = 1; n <= LEVELS.length; n++) Progress.record(n, true, 'S', 900);
    Progress.beatRival(4);
  }

  /* Take the parameter back out of the address bar, so a reload does not
     silently do it again and a shared link does not carry it. */
  try {
    history.replaceState(null, '', location.pathname + location.hash);
  } catch (e) { /* file:// has no history API - harmless */ }
}

document.addEventListener('DOMContentLoaded', function () {
  var guideBackTo = 'levels';

  Progress.load();
  previewMode();          // TEMPORARY - see above
  UI.sound.setOn(Progress.soundOn());
  Game.init();
  Shop.paintCoins();
  Hero.init();
  Themes.init();
  Forest.paint();
  Tips.init();
  Cloud.init();
  paintHome();
  var coinIcons = document.querySelectorAll('.tab-coin-ico');
  for (var i = 0; i < coinIcons.length; i++) Sprites.apply(coinIcons[i], 'coin');

  /* Any icon in the page that asks for a sprite by name gets one. Lets a
     tab or a header swap from a text symbol to real art by changing only
     the HTML - no new JavaScript per icon. */
  var pics = document.querySelectorAll('[data-sprite]:not(.tab-coin-ico)');
  for (var p = 0; p < pics.length; p++) {
    Sprites.apply(pics[p], pics[p].getAttribute('data-sprite'));
  }

  /* PLAY. The one route into a round, from the big button on the home
     screen and from the raised button in the middle of the bar.

     A brand new player goes to the Guide Book first. Task Sorter asks
     you to judge tasks against a rule; dropping someone straight into a
     round without ever stating that rule makes it a guessing game.

     It is marked read the moment it OPENS, not when they leave. There is
     no button on that screen to mark it on the way out, so every tap on
     PLAY would bounce them back into the book for ever. */
  function goPlay() {
    UI.sound.tick();          // also unlocks audio on the first tap
    if (!Progress.hasReadGuide()) {
      Progress.markGuideRead();
      guideBackTo = 'levels';
      UI.showScreen('guide');
      return;
    }
    paintLevels();
    UI.showScreen('levels');
  }

  UI.$('btn-play').addEventListener('click', goPlay);
  UI.$('tab-play').addEventListener('click', goPlay);

  function goHome() {
    paintHome();
    UI.showScreen('home');
  }

  UI.$('tab-home').addEventListener('click', function () {
    UI.sound.tick();
    goHome();
  });

  UI.$('home-battle').addEventListener('click', function () {
    UI.sound.tick();
    Battle.paint();
    UI.showScreen('battle');
  });

  function goGear() {
    UI.sound.tick();
    Hero.paint();
    Shop.paint();
    UI.showScreen('gear');
  }

  UI.$('home-gear').addEventListener('click', goGear);
  UI.$('home-collect').addEventListener('click', goGear);

  /* The Guide Book, from the ? on the map and from the Me screen.
     `from` is where Back should return to, so the rulebook never
     strands you on a screen with no way out. */

  /* ---- account ---- */

  function acctMsg(text, kind) {
    var el = UI.$('acct-msg');
    el.hidden = !text;
    el.textContent = text || '';
    el.className = 'acct-msg' + (kind ? ' is-' + kind : '');
  }

  function acctBusy(on) {
    ['btn-signin', 'btn-signup', 'btn-signout'].forEach(function (id) {
      UI.$(id).disabled = on;
    });
  }

  /* One place decides what the account box looks like, and it runs on
     every change - signing in, signing out, a failed upload. Nothing
     else is allowed to poke at those elements. */
  Cloud.onChange(function (state) {
    UI.$('acct-in').hidden = !state.signedIn;
    UI.$('acct-out').hidden = state.signedIn;
    UI.$('acct-name').textContent = state.username || '';
    if (state.error) acctMsg(state.error, null);
  });

  function tryAccount(which) {
    var name = UI.$('acct-user').value.trim();
    var pass = UI.$('acct-pass').value;
    acctBusy(true);
    acctMsg(which === 'up' ? 'Making your account...' : 'Signing in...', 'busy');

    var run = which === 'up' ? Cloud.signUp(name, pass) : Cloud.signIn(name, pass);
    run.then(function (what) {
      UI.$('acct-pass').value = '';
      /* Say which way the save went. Somebody whose progress was just
         replaced by their account deserves to be told, not left
         wondering where their coins went. */
      acctMsg(what === 'downloaded'
        ? 'Signed in. Your saved progress has been loaded onto this device.'
        : 'Signed in. The progress on this device is now saved to your account.',
        'good');
      paintLevels();
      Hero.paint();
      Shop.paint();
      UI.$('hero-name').value = Progress.heroName();
      UI.sound.setOn(Progress.soundOn());
      paintSound();
      Themes.apply();
      Themes.paintSettings();
    }).catch(function (e) {
      acctMsg(e.message || 'That did not work', null);
    }).then(function () {
      acctBusy(false);
    });
  }

  UI.$('btn-signin').addEventListener('click', function () { tryAccount('in'); });
  UI.$('btn-signup').addEventListener('click', function () { tryAccount('up'); });
  UI.$('acct-pass').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tryAccount('in');
    e.stopPropagation();
  });
  UI.$('acct-user').addEventListener('keydown', function (e) { e.stopPropagation(); });

  UI.$('btn-signout').addEventListener('click', function () {
    Cloud.signOut();
    acctMsg('Signed out. Your progress is still here on this device.', 'good');
  });


  function openGuide(from) {
    guideBackTo = from || 'levels';
    UI.sound.tick();
    UI.showScreen('guide');
  }

  UI.$('btn-help').addEventListener('click', function () { openGuide('levels'); });
  UI.$('btn-guide').addEventListener('click', function () { openGuide('me'); });

  UI.$('btn-guide-back').addEventListener('click', function () {
    UI.sound.tick();
    if (guideBackTo === 'me') { Hero.paint(); UI.showScreen('me'); }
    else { paintLevels(); UI.showScreen('levels'); }
  });

  /* ---- sound ---- */

  function paintSound() {
    UI.$('sound-switch').classList.toggle('is-on', Progress.soundOn());
  }

  UI.$('btn-sound').addEventListener('click', function () {
    var on = !Progress.soundOn();
    Progress.setSoundOn(on);
    UI.sound.setOn(on);
    paintSound();
    UI.sound.tick();      // silent when you just turned it off, which is the point
  });
  paintSound();

  UI.$('btn-lv-back').addEventListener('click', function () {
    UI.sound.tick();
    goHome();
  });

  UI.$('btn-next').addEventListener('click', function () {
    if (Game.isBattle()) Game.startBattle(Game.currentFoe() + 1);
    else Game.start(Game.currentLevel() + 1);
  });

  UI.$('btn-again').addEventListener('click', function () {
    if (Game.isBattle()) Game.startBattle(Game.currentFoe());
    else Game.start(Game.currentLevel());
  });

  UI.$('btn-home').addEventListener('click', function () {
    Game.stop();
    if (Game.isBattle()) { Battle.paint(); UI.showScreen("battle"); }
    else { paintLevels(); UI.showScreen("levels"); }
  });

  /* Wiping the save asks first. It used to go on a single tap of a
     button that sat directly under the gear picker, and it takes every
     level, every coin, all thirteen pets and your name with it. The
     popup names what is lost rather than saying "are you sure", because
     "are you sure" tells nobody anything. */
  function wipe() {
    Progress.reset();
    Hero.close();
    UI.$('hero-name').value = '';      // the name is wiped too
    UI.sound.setOn(Progress.soundOn());
    paintSound();
    paintLevels();
    paintHome();
    Hero.paint();
    Shop.paint();
    /* Reset wipes the saved background back to Deep Space, so the play
       screen and the picker on this screen both have to be repainted.
       Without this the old picture stays up until something else
       happens to redraw it. */
    Themes.apply();
    Themes.paintSettings();
  }

  UI.$('btn-reset').addEventListener('click', function () {
    UI.sound.tick();
    Tips.confirm({
      icon: 'bin',
      title: 'Delete everything?',
      lines: [
        'This wipes <b>every level you have passed</b>, all your coins, every pet and every piece of gear you have bought, and the name you gave your character.',
        'If you are signed in, the empty save is uploaded to your account as well.',
        '<b>There is no undo.</b>'
      ],
      okText: 'Delete everything',
      danger: true,
      onOk: wipe
    });
  });

  /* Leaving a level part-way. Nothing is recorded: no grade, no coins,
     no failed attempt. You picked the wrong level, that is all. */
  UI.$('btn-exit').addEventListener('click', function () {
    Themes.close();          // never leave the picker open behind you
    Game.stop();
    UI.sound.tick();
    if (Game.isBattle()) { Battle.paint(); UI.showScreen("battle"); }
    else { paintLevels(); UI.showScreen("levels"); }
  });

  /* ---- bottom bar ---- */

  UI.$("tab-battle").addEventListener("click", function () {
    UI.sound.tick();
    Battle.paint();
    UI.showScreen("battle");
  });

  /* One screen for gear, so both halves are painted together: the
     character at the top and everything buyable underneath. */
  UI.$('tab-gear').addEventListener('click', function () {
    UI.sound.tick();
    Hero.paint();
    Shop.paint();
    UI.showScreen('gear');
  });

  UI.$('tab-me').addEventListener('click', function () {
    UI.sound.tick();
    Shop.paintCoins();
    Themes.paintSettings();
    paintSound();
    UI.showScreen('me');
  });

  // Stop the page bouncing under a swipe, but let the shop and hero
  // screens scroll normally.
  document.addEventListener('touchmove', function (e) {
    var scrollable = e.target.closest && e.target.closest('.hero-body, .me-body, .guide-body, .battle-list');
    if (e.cancelable && !scrollable) e.preventDefault();
  }, { passive: false });
});
