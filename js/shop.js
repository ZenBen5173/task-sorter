/* ============================================================
   shop.js  -  pets, armour and weapons
   ------------------------------------------------------------
   Every item changes how a round actually plays. Nothing here is
   decoration.

     Pets     cut your time short, and pay you more coins for the risk
     Armour   forgives a few wrong answers
     Weapons  multiply the points you score, and battle damage

   You buy with coins earned by finishing levels. One of each kind
   can be equipped at a time.

   ADDING AN ITEM: copy a line and change it. An item can set
   `fast`, `coin`, `block` and `mult`.

   WHY THE THREE DO WHAT THEY DO
   Passing a level is decided by accuracy and nothing else. So:
     - a weapon makes a good round score more (reward)
     - armour protects your accuracy itself (safety)
     - a pet pays you extra but takes time off the clock, which means
       fewer cards and a smaller score (risk)
   Every slot has to either help you pass or pay you for not helping,
   or it is decoration.
   ============================================================ */

var SHOP = {

  pet: {
    label: 'Pets',
    blurb: 'Pays you more coins - and takes time off your clock for it.',
    items: [
      { id: 'pet0', name: 'None',        cost: 0,    tint: 0, fast: 1,    coin: 0,    desc: 'No pet.' },
      { id: 'pet1', name: 'Paper Crane', cost: 150,  tint: 0, fast: 1.12, coin: 0.15, desc: '+15% coins. Clock runs 12% faster.', sprite: 'crane' },
      { id: 'pet2', name: 'Ink Cat',     cost: 400,  tint: 0, fast: 1.25, coin: 0.30, desc: '+30% coins. Clock runs 25% faster.', needsLevel: 2, sprite: 'tabby' },
      { id: 'pet3', name: 'Sleepy Sloth',cost: 650,  tint: 0, fast: 1.32, coin: 0.40, desc: '+40% coins. Clock runs 32% faster.', needsLevel: 3, sprite: 'sloth' },
      { id: 'pet4', name: 'Desk Dragon', cost: 900,  tint: 0, fast: 1.40, coin: 0.50, desc: '+50% coins. Clock runs 40% faster.', needsLevel: 4, sprite: 'dragon' },
      { id: 'pet5', name: 'Time Owl',    cost: 1400, tint: 0, fast: 1.50, coin: 0.60, desc: '+60% coins. Clock runs 50% faster.', needsRival: 2, sprite: 'owl' }
    ]
  },
  armour: {
    label: 'Armour',
    blurb: 'Wrong answers it covers do not count against you.',
    items: [
      { id: 'arm0', name: 'None',            cost: 0,    tint: 0, block: 0, desc: 'No armour.' },
      { id: 'arm1', name: 'Wood Shield',     cost: 120,  tint: 0, block: 1, desc: 'Covers 1 wrong answer.', sprite: 'woodshield' },
      { id: 'arm2', name: 'Silver Shield',   cost: 350,  tint: 0, block: 2, desc: 'Covers 2 wrong answers.', needsLevel: 2, sprite: 'silvershield' },
      { id: 'arm3', name: 'Gold Shield',     cost: 600,  tint: 0, block: 3, desc: 'Covers 3 wrong answers.', needsLevel: 3, sprite: 'goldshield' },
      { id: 'arm4', name: 'Diamond Shield',  cost: 900,  tint: 0, block: 4, desc: 'Covers 4 wrong answers.', needsLevel: 4, sprite: 'diamondshield' },
      { id: 'arm5', name: 'Diamond and Gold Shield', cost: 1500, tint: 0, block: 5, desc: 'Covers 5 wrong answers.', needsRival: 3, sprite: 'diamondgoldshield' }
    ]
  },
  weapon: {
    label: 'Weapons',
    blurb: 'Hit harder. More points, and more damage in a battle.',
    items: [
      { id: 'wep0', name: 'Bare Hands',      cost: 0,    tint: 0,   mult: 1,    desc: 'Normal points.' },
      { id: 'wep1', name: 'Dagger',          cost: 100,  tint: 0,   mult: 1.10, desc: '+10% points.', sprite: 'dagger' },
      { id: 'wep2', name: 'Longsword',       cost: 300,  tint: 0,   mult: 1.25, desc: '+25% points.', needsLevel: 2, sprite: 'longsword' },
      { id: 'wep3', name: 'Gold Sword',      cost: 550,  tint: 0,   mult: 1.35, desc: '+35% points.', needsLevel: 3, sprite: 'goldsword' },
      { id: 'wep4', name: 'Bronze Blade',    cost: 850,  tint: 0,   mult: 1.50, desc: '+50% points.', needsLevel: 4, sprite: 'bronzeblade' },
      { id: 'wep5', name: 'Winged Blade',    cost: 1500, tint: 0,   mult: 1.75, desc: '+75% points.', needsRival: 4, sprite: 'wingedblade' }
    ]
  }
};

/* Every item in a group shares one picture; `tint` shifts its colour so the
   tiers are still telling apart. Swap in separate art later and drop the tint. */
(function () {
  var art = { pet: 'cat', armour: 'shield', weapon: 'sword' };
  for (var kind in SHOP) {
    SHOP[kind].sprite = art[kind];
    for (var i = 0; i < SHOP[kind].items.length; i++) {
      // an item may bring its own picture; otherwise it uses the group's
      if (!SHOP[kind].items[i].sprite) SHOP[kind].items[i].sprite = art[kind];
    }
  }
})();

/** Coins paid out at the end of a level.

    TUNED AGAINST A REAL ROUND. At 1 coin per 200 score a clean Level 1
    paid 288, which bought the cheapest item in each slot outright and
    left the whole shop about two rounds away - there was nothing to
    save up for. A round scores what it scores because score climbs with
    the streak AND with how many cards you got through, so the divisor
    is what keeps the payout sane. A good round now lands near 140. */
var COIN_REWARD = {
  perScore: 500,                         // 1 coin per this much score
  grade: { S: 50, A: 35, B: 20, C: 8 },  // plus a bonus for the grade

  /* Wear a pet AND armour AND a weapon at the same time and every coin
     payout goes up by this much. Gives you a reason to fill all three
     slots instead of saving up for one expensive item. */
  setBonus: 0.25
};

var Shop = (function () {

  /** Finds an item by its id, whatever kind it is. */
  function find(id) {
    for (var kind in SHOP) {
      var list = SHOP[kind].items;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
      }
    }
    return null;
  }

  /** The item currently worn in a slot, falling back to the free one. */
  function equipped(kind) {
    var id = Progress.equipped()[kind];
    return find(id) || SHOP[kind].items[0];
  }

  /** Everything your gear does, rolled up for the game to read at round start. */
  function effects() {
    return {
      fast: equipped('pet').fast || 1,      // the clock runs this many times faster
      block: equipped('armour').block || 0, // wrong answers your shield forgives
      mult: equipped('weapon').mult || 1
    };
  }

  /* ---------------- what you are allowed to buy yet ---------------- */

  /** Some gear only appears once you have got far enough in the game. */
  function isUnlocked(item) {
    if (item.needsLevel && Progress.unlocked() < item.needsLevel) return false;
    if (item.needsRival && Progress.rivalsBeaten() < item.needsRival) return false;
    return true;
  }

  /** Plain words for why an item is not buyable yet. */
  function lockReason(item) {
    if (item.needsLevel && Progress.unlocked() < item.needsLevel) {
      return 'Reach level ' + item.needsLevel;
    }
    if (item.needsRival && Progress.rivalsBeaten() < item.needsRival) {
      return 'Beat ' + OPPONENTS[item.needsRival - 1].name;
    }
    return '';
  }

  /** True only when all three slots hold a real item, not "None". */
  function hasFullSet() {
    var e = Progress.equipped();
    return e.pet !== 'pet0' && e.armour !== 'arm0' && e.weapon !== 'wep0';
  }

  /** Everything that raises a coin payout, added together:
      your pet's bonus, plus the full-set bonus if all three slots are filled. */
  function coinBonus() {
    var fromPet = equipped('pet').coin || 0;
    return fromPet + (hasFullSet() ? COIN_REWARD.setBonus : 0);
  }

  function coinsFor(score, grade) {
    var base = Math.floor(score / COIN_REWARD.perScore) + (COIN_REWARD.grade[grade] || 0);
    return Math.round(base * (1 + coinBonus()));
  }

  /* ---------------- drawing the shop ---------------- */

  function paint() {
    var host = UI.$('shop-body');
    host.innerHTML = '';

    for (var kind in SHOP) {
      host.appendChild(section(kind, SHOP[kind]));
    }
    paintCoins();
  }

  function section(kind, group) {
    var wrap = document.createElement('div');
    wrap.className = 'shop-group';

    var head = document.createElement('div');
    head.className = 'shop-head';
    head.innerHTML = '<b>' + group.label + '</b><small>' + group.blurb + '</small>';
    wrap.appendChild(head);

    var row = document.createElement('div');
    row.className = 'shop-row';

    group.items.forEach(function (item) {
      row.appendChild(tile(kind, item));
    });

    wrap.appendChild(row);
    return wrap;
  }

  function tile(kind, item) {
    var owned = Progress.owns(item.id) || item.cost === 0;
    var worn = Progress.equipped()[kind] === item.id;
    var afford = Progress.coins() >= item.cost;
    var open = isUnlocked(item);

    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'shop-tile'
      + (worn ? ' is-worn' : '')
      + (owned ? ' is-owned' : '')
      + (!open ? ' is-sealed' : '')
      + (open && !owned && !afford ? ' is-broke' : '');

    var art = document.createElement('span');
    art.className = 'shop-art';
    Sprites.apply(art, item.sprite);
    if (item.tint) art.style.filter = 'hue-rotate(' + item.tint + 'deg)';

    var name = document.createElement('b');
    name.textContent = item.name;

    var desc = document.createElement('small');
    desc.textContent = item.desc;

    var tag = document.createElement('span');
    tag.className = 'shop-tag';
    if (!open) {
      tag.textContent = lockReason(item);
      tag.classList.add('is-sealed');
    } else if (worn) {
      tag.textContent = 'Worn';
      tag.classList.add('is-worn');
    } else if (owned) {
      tag.textContent = 'Use';
      tag.classList.add('is-use');
    } else {
      var ico = document.createElement('span');
      ico.className = 'shop-coin';
      Sprites.apply(ico, 'coin');
      tag.appendChild(ico);
      tag.appendChild(document.createTextNode(String(item.cost)));
    }

    el.appendChild(art);
    el.appendChild(name);
    el.appendChild(desc);
    el.appendChild(tag);

    el.addEventListener('click', function () { tap(kind, item); });
    return el;
  }

  function tap(kind, item) {
    var owned = Progress.owns(item.id) || item.cost === 0;

    if (!isUnlocked(item)) {
      UI.sound.bad();
      flash(lockReason(item) + ' to unlock the ' + item.name + '.');
      return;
    }

    if (owned) {
      Progress.equip(kind, item.id);
      UI.sound.tick();
      paint();
      return;
    }

    if (Progress.coins() < item.cost) {
      UI.sound.bad();
      flash('You need ' + (item.cost - Progress.coins()) + ' more coins.');
      return;
    }

    Progress.buy(item.id, item.cost);
    Progress.equip(kind, item.id);
    UI.sound.perfect();
    flash(item.name + ' bought and equipped!');
    paint();
  }

  function paintCoins() {
    var nodes = document.querySelectorAll('.coin-count');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = Progress.coins().toLocaleString();
    }
  }

  var flashTimer = null;
  function flash(text) {
    var el = UI.$('shop-flash');
    el.textContent = text;
    el.className = 'shop-flash is-on';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.className = 'shop-flash'; }, 1600);
  }

  return {
    paint: paint,
    paintCoins: paintCoins,
    effects: effects,
    coinsFor: coinsFor,
    isUnlocked: isUnlocked,
    lockReason: lockReason,
    hasFullSet: hasFullSet,
    coinBonus: coinBonus
  };
})();
