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

document.addEventListener('DOMContentLoaded', function () {
  Progress.load();
  Game.init();
  Shop.paintCoins();
  Hero.init();
  Themes.init();
  Tips.init();
  var coinIcons = document.querySelectorAll('.tab-coin-ico');
  for (var i = 0; i < coinIcons.length; i++) Sprites.apply(coinIcons[i], 'coin');

  /* Any icon in the page that asks for a sprite by name gets one. Lets a
     tab or a header swap from a text symbol to real art by changing only
     the HTML - no new JavaScript per icon. */
  var pics = document.querySelectorAll('[data-sprite]:not(.tab-coin-ico)');
  for (var p = 0; p < pics.length; p++) {
    Sprites.apply(pics[p], pics[p].getAttribute('data-sprite'));
  }

  UI.$('btn-play').addEventListener('click', function () {
    UI.sound.tick();          // also unlocks audio on the first tap
    paintLevels();

    /* A brand new player goes to the Guide Book first. Task Sorter asks
       you to judge tasks against a rule; dropping someone straight into
       a round without ever stating that rule makes the game a guessing
       game. They leave it by tapping any tab at the bottom.

       It is marked read the moment it OPENS, not when they leave. There
       is no button on that screen any more, so if it were marked on the
       way out there would be nothing to mark it - and every tap on Play
       would bounce them back into the book for ever. */
    if (!Progress.hasReadGuide()) {
      Progress.markGuideRead();
      UI.showScreen('guide');
      return;
    }
    UI.showScreen('levels');
  });

  UI.$('tab-guide').addEventListener('click', function () {
    UI.sound.tick();
    UI.showScreen('guide');
  });

  UI.$('btn-lv-back').addEventListener('click', function () {
    UI.showScreen('title');
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

  UI.$('btn-reset').addEventListener('click', function () {
    Progress.reset();
    Hero.close();
    UI.$('hero-name').value = '';      // the name is wiped too
    paintLevels();
    Hero.paint();
    /* Reset wipes the saved background back to Deep Space, so the play
       screen has to be repainted too. Without this the old picture stays
       up until something else happens to redraw it. */
    Themes.apply();
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

  UI.$('tab-map').addEventListener('click', function () {
    UI.sound.tick();
    paintLevels();
    UI.showScreen('levels');
  });

  UI.$('tab-hero').addEventListener('click', function () {
    UI.sound.tick();
    Hero.paint();
    UI.showScreen('hero');
  });

  UI.$("tab-battle").addEventListener("click", function () {
    UI.sound.tick();
    Battle.paint();
    UI.showScreen("battle");
  });

  UI.$('tab-shop').addEventListener('click', function () {
    UI.sound.tick();
    Shop.paint();
    UI.showScreen('shop');
  });

  // Stop the page bouncing under a swipe, but let the shop and hero
  // screens scroll normally.
  document.addEventListener('touchmove', function (e) {
    var scrollable = e.target.closest && e.target.closest('.shop-body, .hero-body, .battle-list');
    if (e.cancelable && !scrollable) e.preventDefault();
  }, { passive: false });
});
