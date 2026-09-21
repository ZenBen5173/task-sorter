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
    blurb: 'More coins. Less time.',

    /* THE COLLECTION. Thirteen buddies, brought over from MyTask with
       their own art and their own rarity, cheapest to dearest.

       MyTask gave each one an ability worth some percent of XP or
       coins. Task Sorter has no XP, so every ability lands on coins -
       and the deal here is that a pet ALSO shortens your clock. So the
       ladder runs both ways at once: the further down you buy, the more
       you are paid and the less time you get to earn it in. The best
       pet in the game is not simply the best pet to wear.

       The rarity a pet had in MyTask sets its place in the ladder:
         common      Duck, Kitten, Mushroom, Hatchling, Bunny
         rare        Adventurer, Teddy Bear, Penguin
         epic        Zombie, Flame Sprite
         legendary   Polar Bear, Dragon, Phoenixling

       Gating follows the same line. The commons are buyable from the
       start, the rares and epics want progress on the map, and all
       three legendaries are behind a BATTLE - which is what stops the
       collection being a pure coin grind. */
    items: [
      { id: 'pet0',  name: 'None',         cost: 0,    tint: 0, fast: 1,    coin: 0,    desc: 'Empty slot' },

      /* --- common --- */
      { id: 'pet1',  name: 'Duck',         cost: 120,  tint: 0, fast: 1.06, coin: 0.08, desc: '+8% coins\n-6% time',   sprite: 'duck' },
      { id: 'pet2',  name: 'Kitten',       cost: 170,  tint: 0, fast: 1.08, coin: 0.10, desc: '+10% coins\n-8% time',  sprite: 'kitten' },
      { id: 'pet3',  name: 'Mushroom',     cost: 230,  tint: 0, fast: 1.10, coin: 0.12, desc: '+12% coins\n-10% time', sprite: 'mushroom' },
      { id: 'pet4',  name: 'Hatchling',    cost: 300,  tint: 0, fast: 1.12, coin: 0.15, desc: '+15% coins\n-12% time', sprite: 'hatchling' },
      { id: 'pet5',  name: 'Bunny',        cost: 390,  tint: 0, fast: 1.16, coin: 0.20, desc: '+20% coins\n-16% time', sprite: 'bunny' },

      /* --- rare --- */
      { id: 'pet6',  name: 'Adventurer',   cost: 480,  tint: 0, fast: 1.18, coin: 0.22, desc: '+22% coins\n-18% time', needsLevel: 2, sprite: 'slime' },
      { id: 'pet7',  name: 'Teddy Bear',   cost: 580,  tint: 0, fast: 1.22, coin: 0.25, desc: '+25% coins\n-22% time', needsLevel: 2, sprite: 'teddy_bear' },
      { id: 'pet8',  name: 'Penguin',      cost: 700,  tint: 0, fast: 1.26, coin: 0.30, desc: '+30% coins\n-26% time', needsLevel: 3, sprite: 'penguin' },

      /* --- epic --- */
      { id: 'pet9',  name: 'Zombie',       cost: 850,  tint: 0, fast: 1.32, coin: 0.38, desc: '+38% coins\n-32% time', needsLevel: 3, sprite: 'zombie' },
      { id: 'pet10', name: 'Flame Sprite', cost: 1000, tint: 0, fast: 1.36, coin: 0.42, desc: '+42% coins\n-36% time', needsLevel: 4, sprite: 'flame_sprite' },

      /* --- legendary: every one of these is behind a rival --- */
      { id: 'pet11', name: 'Polar Bear',   cost: 1200, tint: 0, fast: 1.42, coin: 0.48, desc: '+48% coins\n-42% time', needsRival: 1, sprite: 'polar_bear' },
      { id: 'pet12', name: 'Dragon',       cost: 1500, tint: 0, fast: 1.48, coin: 0.54, desc: '+54% coins\n-48% time', needsRival: 2, sprite: 'dragon' },
      { id: 'pet13', name: 'Phoenixling',  cost: 2000, tint: 0, fast: 1.55, coin: 0.60, desc: '+60% coins\n-55% time', needsRival: 3, sprite: 'phoenix' }
    ]
  },
  armour: {
    label: 'Armour',
    blurb: 'Mistakes that do not count.',
    items: [
      { id: 'arm0', name: 'None',            cost: 0,    tint: 0, block: 0, desc: 'Empty slot' },
      { id: 'arm1', name: 'Wood Shield',     cost: 120,  tint: 0, block: 1, desc: 'Covers 1', sprite: 'woodshield' },
      { id: 'arm2', name: 'Silver Shield',   cost: 350,  tint: 0, block: 2, desc: 'Covers 2', needsLevel: 2, sprite: 'silvershield' },
      { id: 'arm3', name: 'Gold Shield',     cost: 600,  tint: 0, block: 3, desc: 'Covers 3', needsLevel: 3, sprite: 'goldshield' },
      { id: 'arm4', name: 'Diamond Shield',  cost: 900,  tint: 0, block: 4, desc: 'Covers 4', needsLevel: 4, sprite: 'diamondshield' },
      { id: 'arm5', name: 'Diamond and Gold Shield', cost: 1500, tint: 0, block: 5, desc: 'Covers 5', needsRival: 3, sprite: 'diamondgoldshield' }
    ]
  },
  weapon: {
    label: 'Weapons',
    blurb: 'More points. Harder hits.',
    items: [
      { id: 'wep0', name: 'Bare Hands',      cost: 0,    tint: 0,   mult: 1,    desc: 'Empty slot' },
      { id: 'wep1', name: 'Dagger',          cost: 100,  tint: 0,   mult: 1.10, desc: '+10% points', sprite: 'dagger' },
      { id: 'wep2', name: 'Longsword',       cost: 300,  tint: 0,   mult: 1.25, desc: '+25% points', needsLevel: 2, sprite: 'longsword' },
      { id: 'wep3', name: 'Gold Sword',      cost: 550,  tint: 0,   mult: 1.35, desc: '+35% points', needsLevel: 3, sprite: 'goldsword' },
      { id: 'wep4', name: 'Bronze Blade',    cost: 850,  tint: 0,   mult: 1.50, desc: '+50% points', needsLevel: 4, sprite: 'bronzeblade' },
      { id: 'wep5', name: 'Winged Blade',    cost: 1500, tint: 0,   mult: 1.75, desc: '+75% points', needsRival: 4, sprite: 'wingedblade' }
    ]
  }
};

/* Every item in a group shares one picture; `tint` shifts its colour so the
   tiers are still telling apart. Swap in separate art later and drop the tint. */
(function () {
  /* `pet` is an EMPTY SLOT, not a creature: every real pet brings its
     own animated sheet, so the only thing left falling back to the
     group picture is "None". */
  var art = { pet: 'nopet', armour: 'shield', weapon: 'sword' };
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

    /* THREE TO A SHELF. The items used to be a two-column grid of
       cards, which is how a website lists products - a shop is a wall
       of shelves with things STANDING on them, and you cannot stand
       anything on a card.

       Chunked here rather than in CSS because each shelf needs its own
       plank drawn underneath it, and a grid has no element per row to
       hang one off. */
    var PER_SHELF = 3;
    for (var i = 0; i < group.items.length; i += PER_SHELF) {
      var shelf = document.createElement('div');
      shelf.className = 'shelf';

      group.items.slice(i, i + PER_SHELF).forEach(function (item) {
        shelf.appendChild(tile(kind, item));
      });
      /* A short shelf still gets a full plank, so the bottom row of a
         group does not end in mid-air. */
      for (var pad = group.items.slice(i, i + PER_SHELF).length; pad < PER_SHELF; pad++) {
        var gap = document.createElement('span');
        gap.className = 'shelf-gap';
        shelf.appendChild(gap);
      }
      wrap.appendChild(shelf);
    }
    return wrap;
  }

  function tile(kind, item) {
    var owned = Progress.owns(item.id) || item.cost === 0;
    var worn = Progress.equipped()[kind] === item.id;
    var afford = Progress.coins() >= item.cost;
    var open = isUnlocked(item);

    /* The free item in a group is the EMPTY SLOT, not a thing you own:
       "None", "Bare Hands". It was getting the same green border and the
       same "Worn" badge as a pet you saved up for, which read as an
       achievement for having no pet. Wearing nothing is not wearing
       something, so it says what it is and what tapping it does. */
    var blank = item.cost === 0;

    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'shop-tile'
      + (worn && !blank ? ' is-worn' : '')
      + (blank ? ' is-blank' : '')
      + (owned ? ' is-owned' : '')
      + (!open ? ' is-sealed' : '')
      + (open && !owned && !afford ? ' is-broke' : '');

    /* The item stands on the plank, with a shadow pooled under it. The
       shadow is what puts it ON the shelf rather than floating over it. */
    var stand = document.createElement('span');
    stand.className = 'shop-stand';

    var art = document.createElement('span');
    art.className = 'shop-art';
    Sprites.apply(art, item.sprite, 46);
    if (item.tint) art.style.filter = 'hue-rotate(' + item.tint + 'deg)';
    stand.appendChild(art);

    var name = document.createElement('b');
    name.textContent = item.name;

    var desc = document.createElement('small');
    desc.textContent = item.desc;

    var tag = document.createElement('span');
    tag.className = 'shop-tag';
    if (!open) {
      tag.textContent = lockReason(item);
      tag.classList.add('is-sealed');
    } else if (blank) {
      /* Currently empty, so there is nothing to do here - or something
         is worn, and tapping this is how you take it off. */
      tag.textContent = worn ? 'Empty' : 'Take off';
      tag.classList.add('is-blank');
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

    el.appendChild(stand);
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
    coinBonus: coinBonus,
    /** The item worn in a slot. The home screen uses it to stand your
        pet next to you. */
    equippedItem: equipped
  };
})();
