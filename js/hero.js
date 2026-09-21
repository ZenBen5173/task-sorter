/* ============================================================
   hero.js  -  your character, wearing what you chose
   ------------------------------------------------------------
   Builds the figure at the top of the Gear screen and the stat bars
   underneath it, and remembers the name you gave them.

   IT NO LONGER CHOOSES ANYTHING. There used to be three slot boxes
   around the figure; tapping one opened a picker of everything you
   owned of that kind. Every one of those taps had a shorter version
   already sitting on the same screen - a shelf tile buys the item if
   you do not own it and equips it either way, in ONE tap. So the boxes
   were a second, longer road to the same place, and they made the only
   screen in the game that should show you a character look like a form
   with three empty fields on it.

   What is here now is the character and a readout. Choosing happens
   where the things are: on the shelves in js/shop.js.
   ============================================================ */

var Hero = (function () {

  /* The order the worn line reads in: what is in your hands first,
     then who is walking with you. */
  var WORN = ['armour', 'weapon', 'pet'];

  /** The best value any item of that kind can give, so the bars stay
      correct when new gear is added to the shop. */
  function ceilingOf(kind, field) {
    var best = 0;
    SHOP[kind].items.forEach(function (it) {
      var v = it[field] || 0;
      if (v > best) best = v;
    });
    return best;
  }

  /** How full each stat bar is, 0 to 1, and what to print next to it. */
  function stats() {
    var e = Shop.effects();
    var maxFast = ceilingOf('pet', 'fast') - 1;
    var maxBlock = ceilingOf('armour', 'block');
    var maxMult = ceilingOf('weapon', 'mult') - 1;
    var maxCoin = ceilingOf('pet', 'coin') + COIN_REWARD.setBonus;
    var coins = Shop.coinBonus();

    return [
      /* Clock speed is the one stat you do NOT want high - it is the risk
         you take on for the coins. Marked as a warning so it reads that way. */
      { label: 'Clock speed', hint: 'a faster clock means fewer cards and a smaller score', risk: true,
        fill: maxFast ? (e.fast - 1) / maxFast : 0,
        text: e.fast > 1 ? '+' + Math.round((e.fast - 1) * 100) + '% faster' : 'normal' },
      { label: 'Coins', hint: 'what you earn at the end of a round',
        fill: maxCoin ? coins / maxCoin : 0,
        text: coins > 0 ? '+' + Math.round(coins * 100) + '%' : 'normal' },
      { label: 'Mistakes covered', hint: 'wrong answers that will not count against you',
        fill: maxBlock ? e.block / maxBlock : 0,
        text: e.block ? e.block : 'none' },
      { label: 'Points', hint: 'what each card is worth',
        fill: maxMult ? (e.mult - 1) / maxMult : 0,
        text: e.mult > 1 ? '+' + Math.round((e.mult - 1) * 100) + '%' : 'normal' }
    ];
  }

  function paint() {
    /* WITH THE PET. The Gear screen is where you go to look at what you
       have got, so it shows the whole party - the home screen has done
       that for a while and this one was still drawing the figure alone
       with its pet boxed off to one side. */
    paintFigure(UI.$('hero-art'), true, 62);
    paintWorn();
    paintSet();
    paintStats();
    Shop.paintCoins();
  }

  /** One line naming what the figure has on. A READOUT, not a control:
      the picture already tells you what you are wearing, and this says
      it in words for anything the picture cannot make obvious at that
      size - which shield of the five, which of the two gold blades. */
  function paintWorn() {
    var el = UI.$('hero-worn');
    if (!el) return;

    var names = WORN.map(function (kind) {
      var item = equippedItem(kind);
      return item.cost === 0 ? null : item.name;
    }).filter(Boolean);

    if (!names.length) {
      el.className = 'hero-worn is-empty';
      el.textContent = 'Nothing on. Everything below is one tap away.';
      return;
    }
    el.className = 'hero-worn';
    el.textContent = names.join('  \u00b7  ');
  }

  /** The full-set banner: on when all three slots hold a real item. */
  function paintSet() {
    var el = UI.$('hero-set');
    var full = Shop.hasFullSet();
    var pct = Math.round(COIN_REWARD.setBonus * 100);

    el.className = 'hero-set' + (full ? ' is-on' : '');
    el.innerHTML = full
      ? '<b>FULL SET</b><span><em>+' + pct + '% coins</em></span>'
      : '<b>FULL SET</b><span>Fill all three slots for <em>+' + pct + '% coins</em></span>';
  }

  function equippedItem(kind) {
    var id = Progress.equipped()[kind];
    var list = SHOP[kind].items;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0];
  }

  /* ---------------- stat bars ---------------- */

  function paintStats() {
    var host = UI.$('hero-stats');
    host.innerHTML = '';

    stats().forEach(function (s) {
      var row = document.createElement('div');
      row.className = 'stat-row' + (s.risk ? ' is-risk' : '');

      var head = document.createElement('div');
      head.className = 'stat-head';
      head.innerHTML = '<b>' + s.label + '</b><span>' + s.text + '</span>';

      var track = document.createElement('div');
      track.className = 'stat-track';
      var fill = document.createElement('div');
      fill.className = 'stat-fill';
      fill.style.width = Math.max(0, Math.min(1, s.fill)) * 100 + '%';
      track.appendChild(fill);

      var hint = document.createElement('small');
      hint.className = 'stat-hint';
      hint.textContent = s.hint;

      row.appendChild(head);
      row.appendChild(track);
      row.appendChild(hint);
      host.appendChild(row);
    });
  }

  /** Draws the character WEARING what you chose: the figure, with the
      shield on the off arm and the weapon in the near hand.

      The hero is a 16x16 sprite and so is every piece of gear, so this
      is a composite rather than a redraw - the shield and the weapon
      are laid over the figure at the points its hands are, sized and
      placed in PERCENT so the same rig works at any size. Drawing a
      separate hero for each of the thirty combinations of armour and
      weapon would be thirty sprites to keep in step.

      An empty slot simply puts nothing there.

      `petBox` is how many pixels across to draw the pet, because a pet
      is a sheet with a real frame size rather than something CSS can
      scale by percent like the shield and the sword. It has to be
      passed in: the Gear screen draws the rig a third bigger than the
      home screen does, and a 46px creature next to a 140px character
      reads as a different animal. */
  function paintFigure(el, withPet, petBox) {
    if (!el) return;
    el.innerHTML = '';
    el.className = 'rig';

    var body = document.createElement('span');
    body.className = 'rig-body';
    Sprites.apply(body, 'hero');
    el.appendChild(body);

    var arm = equippedItem('armour');
    if (arm.cost !== 0) {
      var a = document.createElement('span');
      a.className = 'rig-armour';
      Sprites.apply(a, arm.sprite);
      el.appendChild(a);
    }

    var wep = equippedItem('weapon');
    if (wep.cost !== 0) {
      var w = document.createElement('span');
      w.className = 'rig-weapon';
      Sprites.apply(w, wep.sprite);
      el.appendChild(w);
    }

    /* The pet walks beside them rather than being worn. It is its own
       animated sheet, so it goes in a box of its own next to the rig
       and paces on the spot. */
    if (withPet) {
      var pet = equippedItem('pet');
      if (pet.cost !== 0) {
        var p = document.createElement('span');
        p.className = 'rig-pet';
        Sprites.apply(p, pet.sprite, petBox || 46);
        el.appendChild(p);
      }
    }
  }

  /** Whatever the player called their character, or "You" if they have
      not named it yet. Used anywhere the game has to refer to them. */
  function name() {
    return Progress.heroName() || 'You';
  }

  function initName() {
    var box = UI.$('hero-name');
    box.value = Progress.heroName();

    // saved on every keystroke, so there is no Save button to forget
    box.addEventListener('input', function () {
      Progress.setHeroName(box.value);
    });
    // tidy the box up once they are done (the stored name was trimmed)
    box.addEventListener('blur', function () {
      box.value = Progress.heroName();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') box.blur();
      e.stopPropagation();          // Q W A S must not sort a card in here
    });
  }

  function init() {
    initName();
    paintFigure(UI.$('hero-art'), true, 62);
  }

  return {
    init: init,
    paint: paint,
    paintFigure: paintFigure,
    name: name,
    /* Kept because the reset flow calls it. There is no longer a picker
       left open to shut, but a reset SHOULD be able to say "put this
       screen back to nothing" without knowing what this screen has on
       it, so the door stays. */
    close: function () {}
  };
})();
