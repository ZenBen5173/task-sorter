/* ============================================================
   hero.js  -  your character and the three gear slots
   ------------------------------------------------------------
   Shows what you are wearing and lets you swap between anything
   you already own. Buying happens in the Shop; choosing happens
   here.
   ============================================================ */

var Hero = (function () {

  var SLOTS = [
    { kind: 'pet',    label: 'Pet' },
    { kind: 'weapon', label: 'Weapon' },
    { kind: 'armour', label: 'Armour' }
  ];

  var openSlot = null;   // which slot's picker is showing

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
    paintSlots();
    paintSet();
    paintStats();
    paintPicker();
    Shop.paintCoins();
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

  /* ---------------- the three slots ---------------- */

  function paintSlots() {
    SLOTS.forEach(function (slot) {
      var el = UI.$('slot-' + slot.kind);
      var item = equippedItem(slot.kind);

      el.classList.toggle('is-open', openSlot === slot.kind);

      var art = el.querySelector(".slot-art");
      Sprites.apply(art, item.sprite, 38);
      art.style.filter = item.tint ? "hue-rotate(" + item.tint + "deg)" : "";
      el.querySelector('.slot-name').textContent = item.name;
      el.querySelector('.slot-desc').textContent = item.desc;
    });
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

  /* ---------------- choosing gear ---------------- */

  function paintPicker() {
    var host = UI.$('hero-picker');
    host.innerHTML = '';

    if (!openSlot) {
      host.classList.remove('is-on');
      return;
    }
    host.classList.add('is-on');

    var group = SHOP[openSlot];

    var title = document.createElement('p');
    title.className = 'picker-title';
    title.textContent = 'Choose your ' + group.label.toLowerCase().replace(/s$/, '');
    host.appendChild(title);

    var row = document.createElement('div');
    row.className = 'picker-row';

    var ownedAny = false;

    group.items.forEach(function (item) {
      var owned = item.cost === 0 || Progress.owns(item.id);
      if (!owned) return;
      ownedAny = true;

      var worn = Progress.equipped()[openSlot] === item.id;
      /* Same as the shop: the free item is the EMPTY slot, so it does
         not get the green "this is what you are wearing" ring. Wearing
         nothing is not wearing something. */
      var blank = item.cost === 0;

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picker-item'
        + (worn && !blank ? ' is-worn' : '')
        + (blank ? ' is-blank' : '');

      var art = document.createElement("span");
      art.className = "picker-art";
      Sprites.apply(art, item.sprite, 32);
      art.style.filter = item.tint ? "hue-rotate(" + item.tint + "deg)" : "";

      var name = document.createElement('small');
      name.textContent = item.name;

      b.appendChild(art);
      b.appendChild(name);
      b.addEventListener('click', function () {
        Progress.equip(openSlot, item.id);
        UI.sound.tick();
        paint();
      });
      row.appendChild(b);
    });

    host.appendChild(row);

    if (!ownedAny) {
      var none = document.createElement('p');
      none.className = 'picker-empty';
      none.textContent = 'Nothing bought yet. Visit the Shop.';
      host.appendChild(none);
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
    SLOTS.forEach(function (slot) {
      UI.$('slot-' + slot.kind).addEventListener('click', function () {
        openSlot = (openSlot === slot.kind) ? null : slot.kind;
        UI.sound.tick();
        paint();
      });
    });
    Sprites.apply(UI.$('hero-art'), 'hero');
  }

  return {
    init: init,
    paint: paint,
    name: name,
    close: function () { openSlot = null; }
  };
})();
