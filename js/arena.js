/* ============================================================
   arena.js  -  the round, as something you play rather than click
   ------------------------------------------------------------
   The four corners and a card. The rules live in js/game.js; this is
   everything you see and feel while they run.

   WHAT CHANGED, AND WHY EACH ONE MATTERS
   - The card has WEIGHT. It rides a spring a hair behind your thumb
     and leans into the direction you drag it, instead of being glued
     to the pointer like a cursor.
   - You can THROW it. A flick that never travels the full swipe
     distance still sorts, in the direction you flicked.
   - The corners are TRAYS that react. As the card nears one it swells
     and brightens and the others dim, so you know where it will land
     before you let go. A right answer is sucked in with a gulp; a
     wrong one bounces off the edge and tumbles away.
   - BIG MOMENTS LAND. A Perfect freezes the screen for three frames
     (a hit-stop), punches the camera, and throws sparks. A mistake
     shakes the screen and bleeds red in from the edges. The time
     running out goes into slow motion.
   - YOU ARE IN IT. Your character stands at the bottom between the
     trays wearing your gear, cheers a streak, flinches at a miss, and
     the shield you bought comes up as a bubble when it saves you.
   - A boss fight is a fight: the boss across from you, two health
     bars like a fighting game, your right answers flying up at them
     as bolts, their attacks winding up where you can see them coming.

   You can also TAP a tray to send the card there, and Q W A S still
   work - three ways in, for three kinds of player.

   SPECIAL CARDS AND TWISTS (the rules are in js/game.js)
   - GOLD cards are paper made of gold: triple points, coins on landing.
   - ICE cards come frozen. Tap the card to crack it - twice, or once
     with a strong weapon - and only then can it move.
   - FUSE cards burn. A fuse runs along the top; sort it before the
     spark reaches the end or it chars and drops.
   - TRAYS SWAP. Two trays slide past each other into each other's
     corners, and every swipe follows them.
   - A MISS IS EXPLAINED. The tray it belonged in lights up and the
     reason shows for a couple of seconds while you carry on - the
     moment you are most curious is the moment it is worth reading.
   - BOSSES TALK, and each one has a trick (js/battle.js): Steve glues
     your card down, Carla swaps your trays, Ivan blacks out the words
     on them, Dan sets your cards alight.
   ============================================================ */

var Arena = (function () {

  var W = 0, H = 0;
  var L = null;                 // the layout, rebuilt on resize
  var mode = 'level';
  var params = {};
  var info = {};                // what beginLevel/beginBattle said
  var boxesOn = { now: true, later: true, give: true, drop: true };
  var ORDER = ['now', 'later', 'give', 'drop'];

  var trays = {};
  var card = null;              // the card in play
  var ghosts = [];              // cards already sorted, still flying
  var shots = [];               // bolts and thrown paper, in a battle
  var hero = null, foe = null;
  var hudButtons = new Stage.Buttons();
  var pauseButtons = new Stage.Buttons();
  var paused = false, pauseA = 0;
  var drag = null, trayTap = null;
  var t = 0;

  var hud = {
    score: 0, shown: 0, punch: Spring.make(1),
    streak: 0, comboPunch: Spring.make(1), comboShake: 0,
    secs: 0, frac: 1, clockPunch: Spring.make(1),
    progress: 0, goal: 0,
    label: '', calm: false
  };
  var hp = { max: 100, maxFoe: 100, you: 100, foe: 100, youBar: 1, foeBar: 1, youChip: 1, foeChip: 1, youHit: 0, foeHit: 0 };
  var shields = { left: 0, total: 0 };
  var banners = [], pops = [];
  var vig = { color: '#e0524a', a: 0 };
  var rush = false, rushA = 0;
  var phase = 'idle';           // 'intro' | 'play' | 'end'
  var coach = null;
  var dim = Spring.make(0.3);
  var kind = 'level';           // 'level' | 'battle' | 'daily' | 'mine'
  var STANDARD = { tl: 'now', tr: 'later', bl: 'give', br: 'drop' };
  var corners = STANDARD;
  var explain = null;           // the reason for the last miss, on screen
  var say = null;               // what the boss just said
  var blackout = 0;             // ms of the trays' words still hidden

  var PLACE = { house: 'AT HOME', school: 'AT SCHOOL', phone: 'ON YOUR PHONE', out: 'OUT IN TOWN', mine: 'YOUR LIST' };

  function calmFx() { return Progress.calmFx(); }
  function big() { return Progress.bigText(); }
  function pick(list) { return list && list.length ? list[Math.floor(Math.random() * list.length)] : ''; }

  function cornerColor(box) { return Gfx.C[box] || '#888'; }

  /* ================= layout ================= */

  function layout(w, h) {
    W = w; H = h;
    var s = Stage.safe;
    var pad = Math.max(10, s.l, s.r);
    var hudY = s.t + 8, hudH = 56;
    var top = hudY + hudH + 10;
    var bottom = H - s.b - 12;
    var span = bottom - top;
    var trayW = Math.round(Gfx.clamp(W * 0.36, 118, 200));
    var trayH = Math.round(Gfx.clamp(span * 0.19, 92, 156));
    var chan = W - pad * 2 - trayW * 2;
    L = { pad: pad, hudY: hudY, hudH: hudH, top: top, bottom: bottom, span: span,
          trayW: trayW, trayH: trayH, chan: chan };

    /* Each tray goes wherever the corner map says it is right now. */
    setTray(corners.tl, pad, top, trayW, trayH);
    setTray(corners.tr, W - pad - trayW, top, trayW, trayH);
    setTray(corners.bl, pad, bottom - trayH, trayW, trayH);
    setTray(corners.br, W - pad - trayW, bottom - trayH, trayW, trayH);
    /* A corner this level does not use is taken off the screen and its
       neighbour on the same row grows into the space, so a swipe into
       that half lands on what is actually there. */
    if (!boxesOn.give && boxesOn.drop) setTray('drop', pad, bottom - trayH, W - pad * 2, trayH);
    if (!boxesOn.drop && boxesOn.give) setTray('give', pad, bottom - trayH, W - pad * 2, trayH);
    if (!boxesOn.now && boxesOn.later) setTray('later', pad, top, W - pad * 2, trayH);
    if (!boxesOn.later && boxesOn.now) setTray('now', pad, top, W - pad * 2, trayH);

    L.cardW = Math.round(Gfx.clamp(W * 0.72, 220, 340));
    L.cardH = Math.round(Gfx.clamp(L.cardW * 0.6, 128, 210));
    var mid = top + trayH + (span - trayH * 2) / 2;
    L.rest = { x: W / 2, y: mid };

    var k = Gfx.clamp(Math.min(chan / 24 / 1.1, (trayH * 0.92) / 32), 1.8, 3.4);
    L.hero = { x: W / 2, y: bottom - 4, k: k };
    L.foe = { x: W / 2, y: top + trayH * 0.5, size: Math.round(Gfx.clamp(Math.min(chan * 0.95, trayH * 0.86), 60, 132)) };
    if (hero) {
      hero.x = L.hero.x; hero.y = L.hero.y; hero.k = k;
      /* The pet stands tucked in at the hero's side. Its usual distance
         would put it on top of the bottom-left tray. */
      if (hero.pet) { hero.pet.gap = k * 11; hero.pet.box = k * 11; }
    }
    if (foe) { foe.x = L.foe.x; foe.y = L.foe.y; foe.size = L.foe.size; }

    hudButtons.clear();
    hudButtons.add({
      x: pad, y: hudY + 6, w: 44, h: 44, style: 'icon', id: 'pause',
      draw: function (c, b) {
        /* a yellow sticky note with the pause bars inked on */
        c.fillStyle = '#ffe27a'; c.fillRect(2, 2, b.w - 4, b.h - 6);
        c.fillStyle = Desk.INK;
        c.fillRect(b.w / 2 - 8, b.h / 2 - 10, 5, 17);
        c.fillRect(b.w / 2 + 3, b.h / 2 - 10, 5, 17);
      },
      onTap: function () { openPause(); }
    });
    layoutPause();
  }

  function setTray(key, x, y, w, h) {
    var tr = trays[key] || (trays[key] = {
      key: key, aim: Spring.make(0), squash: Spring.make(1), wiggle: Spring.make(0),
      flash: 0, flashColor: '#fff', hits: 0, appear: 1, glow: 0, ox: 0, oy: 0
    });
    tr.x = x; tr.y = y; tr.w = w; tr.h = h;
    tr.cx = x + w / 2; tr.cy = y + h / 2;
    /* The mouth is where a card disappears into the object: the top of
       the in-tray, the calendar page, the envelope's flap, the bin. */
    tr.mx = tr.cx; tr.my = y + h * Desk.MOUTH[key];
  }

  /* ================= starting ================= */

  function enter(p) {
    params = p || {};
    mode = params.battle ? 'battle' : 'level';
    kind = params.battle ? 'battle' : params.daily ? 'daily' : params.mine ? 'mine' : 'level';
    var lv = kind === 'level' ? (LEVELS[(params.level || 1) - 1] || LEVELS[0]) : null;
    corners = STANDARD;
    explain = null; say = null; blackout = 0;
    boxesOn = { now: false, later: false, give: false, drop: false };
    (lv ? lv.boxes : ORDER).forEach(function (b) { boxesOn[b] = true; });

    card = null; ghosts = []; shots = []; banners = []; pops = [];
    paused = false; pauseA = 0; drag = null; trayTap = null; coach = null;
    rush = false; rushA = 0; vig.a = 0;
    hud.score = 0; hud.shown = 0; hud.streak = 0; hud.secs = lv && lv.seconds ? lv.seconds : 0;
    hud.frac = 1; hud.calm = !!(lv && !lv.seconds) || kind === 'mine';
    hud.goal = lv ? (lv.goal || 20) : kind === 'mine' ? MyList.toSort().length : 0; hud.progress = 0;
    hud.label = lv ? 'LEVEL ' + lv.n + ' · NEED ' + Math.round(lv.minAcc * 100) + '%'
              : kind === 'daily' ? 'DAILY #' + Daily.today().number : kind === 'mine' ? 'MY LIST' : '';
    if (kind === 'daily') hud.secs = DAILY.SECONDS;
    shields.total = Shop.effects().block; shields.left = shields.total;

    hero = new Actors.Hero({ k: 2.6, name: Hero.name() });
    hero.refresh();
    if (mode === 'battle') {
      var def = OPPONENTS[(params.battle || 1) - 1] || OPPONENTS[0];
      foe = new Actors.Foe(def, {});
      hp.max = BATTLE.HP; hp.you = BATTLE.HP;
      hp.maxFoe = hp.foe = def.hp || BATTLE.HP;
      hp.youBar = hp.foeBar = hp.youChip = hp.foeChip = 1;
    } else foe = null;

    /* The stage's size, not this module's: on the very first round this
       module has never been laid out, and its own W and H are still 0. */
    var S = Stage.size();
    layout(S.W, S.H);
    for (var k in trays) trays[k].hits = 0;
    intro(lv);
  }

  function exit() {
    Game.stop();
    paused = false;
    Tween.killTag('arena');
  }

  /** The beat before the clock starts: the trays slide in from their
      corners, the level is named, then GO. A round that starts on the
      frame you arrive is a round you lose the first two seconds of. */
  function intro(lv) {
    phase = 'intro';
    ORDER.forEach(function (key, i) {
      var tr = trays[key];
      tr.appear = 0;
      Tween.to(tr, { appear: 1 }, 420, { ease: Ease.outBack, delay: 120 + i * 70, tag: 'arena' });
    });
    hero.y = L.hero.y + 140;
    Tween.to(hero, { y: L.hero.y }, 520, { ease: Ease.outCubic, delay: 200, tag: 'arena' });
    if (foe) {
      foe.y = L.foe.y - 200;
      Tween.to(foe, { y: L.foe.y }, 600, { ease: Ease.outBounce, delay: 150, tag: 'arena' });
    }
    var go = function () {
      phase = 'play';
      if (kind === 'battle') Game.startBattle(params.battle);
      else if (kind === 'daily') Game.startDaily();
      else if (kind === 'mine') Game.startMine();
      else Game.start(params.level);
    };
    if (kind === 'battle') {
      Tween.wait(450, function () {
        banner('FIGHT!', { color: '#ff6a5a', size: 40, life: 800, y: L.rest.y });
        Sfx.play('vs');
        Stage.shake(8, 300);
      }, { tag: 'arena' });
      Tween.wait(1050, go, { tag: 'arena' });
      Tween.wait(1300, function () { if (foe) speak(pick(foe.def.lines && foe.def.lines.intro)); }, { tag: 'arena' });
    } else if (kind === 'daily' || kind === 'mine') {
      Tween.wait(320, function () {
        if (kind === 'daily') banner('DAILY #' + Daily.today().number, { color: Gfx.C.gold, size: 30, life: 1000, y: L.rest.y - 22 });
        else banner('MY LIST', { color: Gfx.C.gold, size: 30, life: 1000, y: L.rest.y - 22 });
        Sfx.play('pop');
      }, { tag: 'arena' });
      Tween.wait(1250, function () {
        banner('GO!', { color: '#7dff9a', size: 44, life: 600, y: L.rest.y });
        Sfx.play('release');
        Stage.punch(0.5);
      }, { tag: 'arena' });
      Tween.wait(1400, go, { tag: 'arena' });
    } else {
      Tween.wait(320, function () {
        banner('LEVEL ' + lv.n, { color: Gfx.C.gold, size: 30, life: 1000, y: L.rest.y - 22 });
        Sfx.play('pop');
      }, { tag: 'arena' });
      var gap = 0;
      Tween.wait(1250 + gap, function () {
        banner('GO!', { color: '#7dff9a', size: 44, life: 600, y: L.rest.y });
        Sfx.play('release');
        Stage.punch(0.5);
      }, { tag: 'arena' });
      Tween.wait(1400 + gap, go, { tag: 'arena' });
    }
  }

  /* ================= what the game tells us ================= */

  function beginLevel(o) {
    info = o;
    if (o.corners) setCorners(o.corners);
    hud.calm = o.calm; hud.goal = o.goal;
    hud.secs = o.seconds; hud.frac = 1;
    hud.label = o.daily ? 'DAILY #' + Daily.today().number + ' · BEAT YOUR BEST'
              : o.mine ? 'MY LIST'
              : 'LEVEL ' + o.level.n + ' · NEED ' + o.target + '%';
    shields.total = o.shields; shields.left = o.shields;
  }

  function beginBattle(o) {
    info = o;
    if (o.corners) setCorners(o.corners);
    hp.max = o.hp; hp.you = o.hp;
    hp.maxFoe = hp.foe = o.foeHp || o.hp;
    hud.secs = o.seconds; hud.frac = 1;
    shields.total = o.shields; shields.left = o.shields;
  }

  function setCorners(m) {
    corners = m;
    layout(W, H);
  }

  /** Two trays swap corners: each slides from where it was to where it
      is now, crossing over, with a beat of warning in the middle. */
  function shuffle(m) {
    var old = {};
    ORDER.forEach(function (k) { if (trays[k]) old[k] = { x: trays[k].x, y: trays[k].y }; });
    corners = m;
    layout(W, H);
    ORDER.forEach(function (k) {
      var tr = trays[k], o = old[k];
      if (!tr || !o || (o.x === tr.x && o.y === tr.y)) return;
      tr.ox = o.x - tr.x; tr.oy = o.y - tr.y;
      Tween.kill(tr);
      Tween.to(tr, { ox: 0, oy: 0 }, 560, { ease: Ease.inOutCubic, tag: 'arena' });
      Spring.kick(tr.wiggle, 14);
      Particles.emit({ x: tr.cx + tr.ox, y: tr.cy + tr.oy, n: 10, colors: [cornerColor(k), '#ffffff'], speed: [80, 220], life: [300, 600], size: [3, 6], gravity: 200 });
    });
    if (phase === 'play') {
      /* In a boss fight the trick's own banner already says it. */
      if (mode !== 'battle') banner('SWAP!', { color: '#9fd4ff', size: 26, life: 800, y: L.rest.y - L.cardH * 0.78, slot: 'swap' });
      Sfx.play('swap');
      Haptics.block();
      if (!calmFx()) Stage.shake(4, 200);
    }
    if (drag) updateAim(drag.px - drag.sx, drag.py - drag.sy);
  }

  /* ================= special cards ================= */

  /** A tap landed on a frozen card. */
  function cracked(left) {
    if (!card) return;
    var cx = card.x.x, cy = card.y.x;
    Spring.kick(card.rot, (Math.random() - 0.5) * 6);
    Spring.kick(card.lift, 3);
    if (left > 0) {
      Sfx.play('crack');
      Haptics.tap();
      Particles.emit({ x: cx, y: cy, n: 10, colors: ['#e8f6ff', '#9fd4ff', '#ffffff'], speed: [80, 260], life: [250, 500], size: [2, 5], gravity: 600, shape: 'spark' });
    } else {
      Sfx.play('shatter');
      Haptics.good();
      if (!calmFx()) Stage.shake(3, 140);
      Particles.emit({ x: cx, y: cy, n: 26, spreadX: L.cardW * 0.4, colors: ['#e8f6ff', '#9fd4ff', '#ffffff', '#5b8fd8'], speed: [120, 420], life: [350, 800], size: [3, 8], gravity: 900, spin: 12 });
    }
  }

  /** Tried to move a card that is still frozen. */
  function stillFrozen() {
    if (!card) return;
    Spring.kick(card.rot, 4);
    Sfx.play('nope');
    Haptics.bad();
  }

  /** What the boss says, in a bubble under them. */
  function speak(text) {
    if (!text || !foe) return;
    say = { text: text, t: 0, life: 1900 };
    Sfx.play('blip');
  }

  /** The boss used their trick. */
  function foePower(p) {
    if (!foe || phase !== 'play') return;
    var def = foe.def;
    explain = null;           // the trick's banner goes where the reason was
    foe.attack();
    Spring.kick(foe.sq, 4);
    speak(pick(def.lines && def.lines.power));
    Sfx.play('power');
    Haptics.heavy();
    if (!calmFx()) Stage.shake(6, 260);
    vig.color = '#ff6a5a'; vig.a = calmFx() ? 0.15 : 0.4;
    if (p === 'freeze' && card) {
      /* Whatever you had in your hand is glued down where it is. */
      if (drag) { drag = null; card.state = 'idle'; clearAim(); }
      Particles.emit({ x: card.x.x, y: card.y.x, n: 22, spreadX: L.cardW * 0.4, colors: ['#e8f6ff', '#9fd4ff', '#ffffff'], speed: [60, 200], life: [300, 700], size: [3, 6], gravity: -40 });
      Sfx.play('freeze');
    } else if (p === 'blackout') {
      blackout = BATTLE.BLACKOUT_MS;
      Sfx.play('glitch');
    } else if (p === 'deadline' && card) {
      Particles.emit({ x: card.x.x, y: card.y.x - L.cardH * 0.4, n: 18, spreadX: L.cardW * 0.4, colors: ['#ffb43a', '#ff6a3a', '#ffe48a'], speed: [80, 240], life: [300, 700], size: [3, 7], gravity: -200 });
      Sfx.play('fuse');
    }
  }

  /** A new card: picked up by the hero and flipped up into the middle. */
  function deal(data, o) {
    o = o || {};
    var from = hero ? hero.centre() : { x: W / 2, y: H };
    card = {
      data: data, text: data.text,
      x: Spring.make(from.x), y: Spring.make(from.y),
      rot: Spring.make((Math.random() - 0.5) * 0.6),
      lift: Spring.make(0),
      flip: 0, scale: 0.35, state: 'deal', t: 0,
      aimBox: null, aim: 0, lines: null, size: 0,
      bob: Math.random() * 6
    };
    Tween.to(card, { flip: 1, scale: 1 }, 260, { ease: Ease.outCubic, tag: 'arena', done: function () {
      if (card && card.state === 'deal') card.state = 'idle';
    } });
    Sfx.play('deal');
    if (hero) Spring.kick(hero.sq, 1.2);
    coach = o.coach ? { box: data.box, why: data.why, n: o.lesson, t: 0 } : null;
    if (data.special === 'gold') Tween.wait(180, function () { Sfx.play('shine'); }, { tag: 'arena' });
    else if (data.special === 'ice') { Tween.wait(160, function () { Sfx.play('freeze'); }, { tag: 'arena' }); }
    else if (data.special === 'fuse') Tween.wait(160, function () { Sfx.play('fuse'); }, { tag: 'arena' });
  }

  /** What a sort was worth. The card in play becomes a ghost flying to
      its tray; the next card is dealt straight after by the game. */
  function sorted(r) {
    var hadCoach = !!coach;
    if (r.burnt) { burnUp(r); return; }
    var tr = trays[r.box];
    var c = card;
    card = null;
    drag = null;
    coach = null;
    clearAim();
    if (r.right && explain) explain.life = Math.min(explain.life, explain.t + 300);
    if (!r.right && !r.mine && !hadCoach) showWhy(r.card, false);
    if (!c) {
      /* Sorted from the keyboard before the card had been drawn - give it
         somewhere to start from. */
      c = { data: r.card, text: r.card.text, x: Spring.make(L.rest.x), y: Spring.make(L.rest.y),
            rot: Spring.make(0), lift: Spring.make(0), flip: 1, scale: 1 };
    }
    var g = {
      text: c.text, data: c.data, lines: c.lines, size: c.size,
      x: c.x.x, y: c.y.x, rot: c.rot.x, scale: c.scale, flip: 1,
      vx: c.vx || 0, vy: c.vy || 0, t: 0, right: r.right, box: r.box, alpha: 1,
      x0: c.x.x, y0: c.y.x, stamp: 0
    };
    var dist = Math.sqrt((tr.mx - g.x0) * (tr.mx - g.x0) + (tr.my - g.y0) * (tr.my - g.y0));
    g.ms = Gfx.clamp(dist * 0.6, 150, 240);
    ghosts.push(g);
    Sfx.play('whoosh', Gfx.clamp(Math.sqrt(g.vx * g.vx + g.vy * g.vy) / 1.4, 0.3, 1));
    if (hero) hero.throwTo(tr.cx < W / 2 ? -1 : 1);

    if (r.right) {
      g.onLand = function () { landRight(r, tr); };
    } else {
      g.onLand = function () { landWrong(r, tr, g); };
    }
    hud.streak = r.streak;
  }

  /** The reason a card belonged where it did, while you keep playing. */
  function showWhy(data, burnt) {
    if (!data || !data.box) return;
    explain = { box: data.box, why: data.why || '', burnt: burnt, t: 0, life: 2600 };
    /* It takes the strip under the top trays (under the card, in a boss
       fight), so a Perfect banner or a boss's trick still fading out
       there makes way for it. */
    for (var i = banners.length - 1; i >= 0; i--) if (banners[i].slot === 'top' || banners[i].slot === 'power') banners.splice(i, 1);
  }

  /** A burning card nobody sorted: it chars where it is and drops. */
  function burnUp(r) {
    var c = card;
    card = null; drag = null; coach = null;
    if (!c) return;
    ghosts.push({ text: c.text, data: c.data, lines: c.lines, size: c.size, x: c.x.x, y: c.y.x, rot: c.rot.x,
                  scale: c.scale, flip: 1, t: 0, ms: 9999, alpha: 1, vx: (Math.random() - 0.5) * 120, vy: -260,
                  x0: c.x.x, y0: c.y.x, bounced: true, burnt: true, spin: (Math.random() - 0.5) * 4, box: r.card.box });
    Particles.emit({ x: c.x.x, y: c.y.x, n: 24, spreadX: L.cardW * 0.4, colors: ['#3a3a3a', '#6a5a4a', '#1a1a1a'], speed: [30, 120], life: [600, 1200], size: [6, 12], gravity: -120, drag: 1.5 });
    Particles.emit({ x: c.x.x, y: c.y.x, n: 14, colors: ['#ffb43a', '#ff6a3a'], speed: [80, 260], life: [300, 600], size: [2, 5], gravity: 300, shape: 'spark' });
    Sfx.play('burn');
    showWhy(r.card, true);
    missFeel(r, null);
    hud.streak = r.streak;
  }

  function landRight(r, tr) {
    var col = cornerColor(r.box);
    tr.hits++;
    Spring.kick(tr.squash, -6);
    tr.flash = 1; tr.flashColor = '#ffffff';
    Particles.emit({ x: tr.mx, y: tr.my, n: 16, colors: [col, Gfx.shade(col, 0.4), '#ffffff'],
                     speed: [120, 380], life: [300, 700], size: [3, 7], gravity: 600, drag: 2 });
    Particles.emit({ x: tr.mx, y: tr.my, n: 8, shape: 'spark', colors: ['#ffffff', Gfx.shade(col, 0.5)],
                     speed: [260, 520], life: [180, 360], size: [2, 3], drag: 3 });
    Sfx.play('right', r.mine ? 3 : r.streak);
    Haptics.good();

    var popAt = { x: tr.cx, y: tr.cy + (tr.y < L.rest.y ? tr.h * 0.62 : -tr.h * 0.62) };
    /* A streak milestone puts its banner just above the bottom trays -
       exactly where a bottom tray's points pop - so on that sort the
       points rise clear of it instead of printing through it. */
    var milestone = r.streak === 5 || r.streak === 8 || (r.streak > 8 && r.streak % 5 === 0);
    if (milestone && tr.y >= L.rest.y) popAt.y -= 48;
    if (r.mine) {
      pop(BOXES[r.box].label.toUpperCase(), popAt.x, popAt.y, '#ffffff', 15);
      if (hero) hero.cheer(0.5);
      return;
    }
    if (r.gold) {
      /* Gold pays twice: the points, and a spray of coins. */
      Particles.emit({ x: tr.mx, y: tr.my, n: 18, shape: 'star', colors: [Gfx.C.gold, '#fff6c4', '#ffffff'], speed: [160, 420], life: [400, 900], size: [4, 8], gravity: 300 });
      Particles.emit({ x: tr.mx, y: tr.my, n: 6, shape: 'coin', colors: [Gfx.C.gold], speed: [160, 320], life: [500, 800], size: [6, 9], gravity: 700 });
      Sfx.play('coin'); Tween.wait(90, function () { Sfx.play('coin'); }, { tag: 'arena' });
    }
    if (mode === 'battle') {
      /* The answer flies up out of the tray at the boss. */
      var strong = r.perfect || r.gold;
      shoot(tr.mx, tr.my, foe.x, foe.y, r.gold ? Gfx.C.gold : col, strong, function () {
        foe.hurt(strong ? 1 : 0.5);
        hp.foe = r.hpFoe; hp.foeHit = 1;
        pop('-' + r.hit, foe.x + 30, Math.max(L.top + 18, foe.y - 30), strong ? Gfx.C.gold : '#ffffff', strong ? 26 : 20);
        Particles.emit({ x: foe.x, y: foe.y, n: 18, colors: [col, '#fff'], speed: [140, 420], life: [300, 600], size: [3, 6], gravity: 300 });
        Sfx.play('hit', r.perfect ? 1 : 0.5);
        Stage.shake(r.perfect ? 9 : 5, 220);
        Haptics.perfect();
        if (strong && hp.foe > 0 && Math.random() < 0.4) speak(pick(foe.def.lines && foe.def.lines.hurt));
      });
      if (r.perfect) perfectBeat(tr, 'PERFECT HIT!');
    } else {
      pop('+' + r.gained.toLocaleString(), popAt.x, popAt.y, r.perfect || r.gold ? Gfx.C.gold : '#ffffff', r.perfect || r.gold ? 24 : 19);
      hud.score = r.score;
      Spring.kick(hud.punch, 4);
      if (r.perfect) perfectBeat(tr, 'PERFECT!');
    }

    Spring.kick(hud.comboPunch, 5);
    if (hero) hero.cheer(Math.min(1, 0.3 + r.streak * 0.08));
    /* Milestones in a streak get their own moment. */
    if (milestone) {
      banner(r.streak >= 8 ? 'MAX COMBO!' : 'COMBO x' + r.streak, {
        color: r.streak >= 8 ? '#ff7ad9' : '#ffb43a', size: 22, life: 900,
        y: L.bottom - L.trayH - 34, slot: 'low', rays: r.streak === 8
      });
      Stage.punch(0.35);
    }
  }

  function perfectBeat(tr, word) {
    Stage.hitstop(55);
    Stage.punch(0.8);
    Stage.shake(4, 160);
    /* No rays on a Perfect. On a quick round nearly every card IS one,
       and a screen full of light every second stops meaning anything -
       the rays are kept for the moments that are rare. */
    banner(word, { color: Gfx.C.gold, size: 24, life: 560, slot: 'top',
                   y: mode === 'battle' ? L.rest.y + L.cardH * 0.5 + 24 : L.top + L.trayH + 26 });
    Particles.emit({ x: tr.mx, y: tr.my, n: 14, shape: 'star', colors: [Gfx.C.gold, '#fff6c4', '#ffffff'],
                     speed: [160, 460], life: [400, 800], size: [4, 8], gravity: 260, layer: 'world' });
    Particles.emit({ x: tr.mx, y: tr.my, n: 1, shape: 'ring', colors: [Gfx.C.gold], speed: 0, life: 420, size: 16, shrink: false });
    Sfx.play('perfect');
    Haptics.perfect();
  }

  function landWrong(r, tr, g) {
    Spring.kick(tr.wiggle, 18);
    tr.flash = 1; tr.flashColor = '#ff4a3a';
    g.bounced = true;
    /* Bounced back out of the tray, and off the screen under gravity. */
    var dx = L.rest.x - tr.mx, dy = L.rest.y - tr.my;
    var n = Math.sqrt(dx * dx + dy * dy) || 1;
    g.vx = dx / n * 420 + (Math.random() - 0.5) * 120;
    g.vy = dy / n * 300 - 380;
    g.spin = (tr.cx < W / 2 ? 1 : -1) * (6 + Math.random() * 4);
    g.stamp = 1;
    missFeel(r, tr);
  }

  /** Everything a miss feels like, for a bounce off a tray or a card
      that burnt up before you got to it. */
  function missFeel(r, tr) {
    var side = tr ? (tr.cx < W / 2 ? 1 : -1) : (Math.random() < 0.5 ? 1 : -1);
    if (r.blocked) {
      /* The shield took it: no red, no shake, and the streak survives. */
      if (hero) hero.block();
      shields.left = r.shieldsLeft;
      var c = hero ? hero.centre() : { x: W / 2, y: H - 80 };
      pop('BLOCKED!', c.x, c.y - 50, '#9fd4ff', 18);
      Particles.emit({ x: c.x, y: c.y - 30, n: 14, colors: ['#9fd4ff', '#ffffff', '#5b8fd8'], speed: [100, 300], life: [300, 600], size: [3, 6], gravity: 500 });
      vig.color = '#4a86c4'; vig.a = 0.45;
      Sfx.play('block');
      Haptics.block();
    } else {
      vig.color = '#e0524a'; vig.a = calmFx() ? 0.25 : 0.7;
      Stage.shake(mode === 'battle' ? 9 : 7, 260);
      Sfx.play('wrong');
      Haptics.bad();
      if (r.lostStreak >= 3) {
        /* on the combo counter itself, which is what just broke */
        Particles.emit({ x: W / 2, y: L.top + L.trayH * 0.5, n: 16, colors: ['#ffb43a', '#ff6a3a', '#ffe48a'], speed: [100, 300], life: [400, 800], size: [3, 6], gravity: 700 });
        Sfx.play('comboBreak');
      }
      if (hero) {
        if (mode === 'battle') {
          hero.hurt(side);
          hp.you = r.hpYou; hp.youHit = 1;
          var hc = hero.centre();
          pop('-' + r.selfHit, hc.x + 34, hc.y - 20, '#ff6a5a', 20);
          Sfx.play('hurt');
        } else {
          /* In a level nobody hurts you; you just flinch. */
          Spring.kick(hero.sq, -2.5);
          Spring.kick(hero.lean, side * 4);
        }
      }
    }
    hud.comboShake = r.lostStreak >= 3 ? 1 : 0;
  }

  /** A projectile between two points: a bolt of the tray's colour going
      up, or a ball of paper coming down. */
  function shoot(x0, y0, x1, y1, color, big, onHit, kind) {
    shots.push({ x0: x0, y0: y0, x1: x1, y1: y1, color: color, big: big, onHit: onHit,
                 t: 0, ms: kind === 'paper' ? 300 : 210, kind: kind || 'bolt',
                 bend: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 50), trail: [] });
  }

  function foeMove(hit, amount, hpYou) {
    if (!foe || phase !== 'play') return;
    foe.attack();
    Sfx.play('windup');
    var hc = hero.centre();
    if (hit) {
      shoot(foe.x, foe.y + foe.size * 0.3, hc.x, hc.y, '#ffffff', false, function () {
        hero.hurt(Math.random() < 0.5 ? -1 : 1);
        hp.you = hpYou; hp.youHit = 1;
        pop('-' + amount, hc.x + 34, hc.y - 24, '#ff6a5a', 20);
        vig.color = '#e0524a'; vig.a = 0.55;
        Stage.shake(7, 240);
        Sfx.play('hurt');
        Haptics.bad();
        Particles.emit({ x: hc.x, y: hc.y, n: 12, colors: ['#ffffff', '#e8e0d0', '#ff8a7a'], speed: [80, 260], life: [300, 600], size: [3, 6], gravity: 700 });
      }, 'paper');
    } else {
      /* A fumble: the throw falls short and drops away. */
      shoot(foe.x, foe.y + foe.size * 0.3, foe.x + (Math.random() < 0.5 ? -1 : 1) * 70, L.rest.y - 40, '#ffffff', false, function () {
        foe.fumble();
        pop('FUMBLED!', foe.x, Math.max(L.top + 14, foe.y - foe.size * 0.6), '#9fd4ff', 14);
        Sfx.play('fumble');
      }, 'paper');
    }
  }

  function setClock(secs, frac) {
    var prev = hud.secs;
    hud.secs = secs; hud.frac = frac;
    if (phase !== 'play') return;
    if (secs !== prev && secs <= 5 && secs > 0 && !hud.calm) {
      Spring.kick(hud.clockPunch, 6);
      Sfx.play('tickHot');
      Haptics.tap();
    } else if (secs !== prev && secs <= 10 && secs > 5 && !hud.calm) {
      Sfx.play('tick');
    }
  }

  function setProgress(n, goal) { hud.progress = Math.min(n, goal); hud.goal = goal; }

  function setRush(on) {
    if (on && !rush && phase === 'play') {
      banner('RUSH x2', { color: '#ff8a3a', size: 30, life: 1100, y: L.rest.y - L.cardH * 0.85 });
      Sfx.play('rush');
      Stage.shake(6, 400);
      Haptics.heavy();
      if (window.Music) Music.forScreen('rush');
    }
    rush = on;
  }

  /** The round is over: a beat to feel it, then the results. */
  function end(reason, next) {
    phase = 'end';
    closePause(true);
    drag = null; coach = null; explain = null; blackout = 0;
    if (card) {
      var c = card; card = null;
      ghosts.push({ text: c.text, data: c.data, lines: c.lines, size: c.size, x: c.x.x, y: c.y.x, rot: c.rot.x,
                    scale: c.scale, flip: 1, t: 0, ms: 9999, alpha: 1, fade: true, vx: 0, vy: 0, x0: c.x.x, y0: c.y.x });
    }
    var wait = 1500;
    if (reason === 'time') {
      banner('TIME!', { color: '#ff6a5a', size: 48, life: 1300, y: H * 0.45 });
      Sfx.play('timeUp');
      Stage.slowmo(0.35, 600);
      Stage.shake(10, 400);
      Haptics.heavy();
    } else if (reason === 'goal') {
      banner(kind === 'mine' ? 'PLAN MADE!' : 'DONE!', { color: '#7dff9a', size: kind === 'mine' ? 34 : 46, life: 1200, y: H * 0.45, rays: true });
      Sfx.play('win');
      Haptics.win();
      confetti();
      wait = 1300;
    } else if (reason === 'won') {
      wait = 1900;
      Tween.wait(260, function () {
        if (foe) { speak(pick(foe.def.lines && foe.def.lines.ko)); foe.knockOut(); }
        banner('K.O.!', { color: Gfx.C.gold, size: 56, life: 1500, y: H * 0.42, rays: true });
        Sfx.play('ko');
        Stage.slowmo(0.3, 700);
        Stage.shake(14, 500);
        Stage.punch(1.2);
        Haptics.win();
        Tween.wait(500, confetti, { tag: 'arena' });
      }, { tag: 'arena' });
    } else if (reason === 'lost') {
      wait = 1900;
      Tween.wait(260, function () {
        if (hero) hero.knockOut();
        if (foe) speak(pick(foe.def.lines && foe.def.lines.win));
        banner('KNOCKED OUT', { color: '#ff6a5a', size: 30, life: 1500, y: H * 0.42 });
        Sfx.play('lose');
        Stage.slowmo(0.35, 600);
        Stage.shake(10, 400);
        Haptics.heavy();
      }, { tag: 'arena' });
    }
    if (window.Music) Music.forScreen('none');
    Tween.wait(wait, next, { tag: 'arena', real: true });
  }

  function confetti() {
    var cols = [Gfx.C.now, Gfx.C.later, Gfx.C.give, Gfx.C.gold, '#7dff9a', '#ffffff'];
    for (var i = 0; i < 3; i++) {
      Particles.emit({ x: W * (0.2 + i * 0.3), y: -10, n: 26, colors: cols, angle: [Math.PI * 0.2, Math.PI * 0.8],
                       speed: [160, 420], life: [1400, 2400], size: [4, 8], gravity: 380, drag: 0.8, spin: 10, wobble: 1.2 });
    }
  }

  /* ================= banners and numbers ================= */

  function banner(text, o) {
    o = o || {};
    /* One banner per slot. A second Perfect a moment after the first
       replaces it rather than stacking a second one on top. */
    var slot = o.slot || 'centre';
    for (var i = banners.length - 1; i >= 0; i--) if (banners[i].slot === slot) banners.splice(i, 1);
    banners.push({ text: text, sub: o.sub || '', subColor: o.subColor || '#fff', subFont: o.subFont || 'arcade', color: o.color || '#fff',
                   size: o.size || 28, y: o.y || H * 0.4, t: 0, life: o.life || 900, rays: !!o.rays, slot: slot });
  }

  function pop(text, x, y, color, size) {
    pops.push({ text: text, x: x, y: y, color: color || '#fff', size: size || 18, t: 0, life: 900 });
  }

  /* ================= pause ================= */

  function layoutPause() {
    pauseButtons.clear();
    var bw = Math.min(260, W - 60), bx = (W - bw) / 2, by = H * 0.36;
    pauseButtons.add({ x: bx, y: by, w: bw, h: 58, label: 'RESUME', style: 'gold', size: 16, onTap: function () { closePause(); } });
    pauseButtons.add({ x: bx, y: by + 72, w: bw, h: 50, label: 'RESTART', style: 'blue', size: 13, onTap: function () {
      closePause(true); Game.stop(); Stage.go('round', params, 'fade');
    } });
    pauseButtons.add({ x: bx, y: by + 134, w: bw, h: 50, label: mode === 'battle' ? 'LEAVE FIGHT' : 'QUIT TO MAP', style: 'dark', size: 12, onTap: function () {
      closePause(true); Game.stop(); Stage.go(mode === 'battle' ? 'bosses' : 'map', {}, 'fade');
    } });
    /* The background, changeable mid-round like it always was - and
       the clock is stopped while you choose. */
    var themes = window.THEMES || [];
    var cw = Math.min(56, (bw - 3 * 10) / 4), cx0 = (W - (cw * 4 + 30)) / 2, cy = by + 214;
    themes.forEach(function (th, i) {
      pauseButtons.add({ x: cx0 + i * (cw + 10), y: cy, w: cw, h: cw, style: 'dark', id: 'theme-' + th.id,
        draw: function (c, b) {
          var on = World.theme() === th.id;
          c.fillStyle = World.tint && th.id === World.theme() ? World.tint() : ({ cork: '#b9895a', wood: '#8a5a32', mat: '#2f6b4a', chalk: '#26332c' })[th.id] || '#b9895a';
          Gfx.rr(c, 5, 5, b.w - 10, b.h - 10, 9); c.fill();
          if (on) { c.lineWidth = 3; c.strokeStyle = Gfx.C.gold; Gfx.rr(c, 2, 2, b.w - 4, b.h - 4, 11); c.stroke(); }
        },
        onTap: function () { Progress.setTheme(th.id); World.setTheme(th.id); }
      });
    });
  }

  function openPause() {
    if (paused || phase !== 'play') return;
    paused = true;
    Game.pause();
    drag = null; clearAim();
    if (card) card.state = card.state === 'held' ? 'idle' : card.state;
    Sfx.play('open');
    pauseA = 0;
    Stage.stagger(pauseButtons.list, 40, 60);
  }

  function closePause(silent) {
    if (!paused) return;
    paused = false;
    Game.resume();
    if (!silent) Sfx.play('close');
  }

  /* ================= input ================= */

  function cardHit(x, y) {
    if (!card) return false;
    var pad = 24;
    return Math.abs(x - card.x.x) <= L.cardW / 2 + pad && Math.abs(y - card.y.x) <= L.cardH / 2 + pad;
  }

  function trayAt(x, y) {
    for (var i = 0; i < ORDER.length; i++) {
      var tr = trays[ORDER[i]];
      if (!boxesOn[ORDER[i]]) continue;
      if (x >= tr.x && x <= tr.x + tr.w && y >= tr.y && y <= tr.y + tr.h) return ORDER[i];
    }
    return null;
  }

  function pointer(type, x, y, e) {
    if (paused) { pauseButtons.pointer(type, x, y); return; }
    if (hudButtons.pointer(type, x, y)) return;
    if (phase !== 'play') return;

    if (type === 'down') {
      /* A frozen card is cracked by tapping it, not dragged. */
      if (card && card.data.ice > 0 && card.flip > 0.45 && cardHit(x, y) && Game.canSort()) {
        Game.crack();
        return;
      }
      if (card && (card.state === 'idle' || (card.state === 'deal' && card.flip > 0.45)) && cardHit(x, y) && Game.canSort()) {
        card.state = 'held';
        drag = { id: e.pointerId, sx: x, sy: y, ox: card.x.x - x, oy: card.y.x - y, px: x, py: y, samples: [{ x: x, y: y, t: Stage.real() }] };
        Spring.kick(card.lift, 6);
        Sfx.play('grab');
        Haptics.tap();
        return;
      }
      var tb = trayAt(x, y);
      if (tb && card && card.data.ice > 0) { stillFrozen(); return; }
      if (tb && card && Game.canSort()) trayTap = { box: tb, x: x, y: y };
      return;
    }

    if (type === 'move') {
      if (!drag || e.pointerId !== drag.id) return;
      drag.px = x; drag.py = y;
      drag.samples.push({ x: x, y: y, t: Stage.real() });
      if (drag.samples.length > 8) drag.samples.shift();
      updateAim(x - drag.sx, y - drag.sy);
      return;
    }

    if (type === 'up' || type === 'cancel') {
      if (trayTap && !drag) {
        var tb2 = trayAt(x, y);
        if (type === 'up' && tb2 === trayTap.box && Math.abs(x - trayTap.x) < 14 && Math.abs(y - trayTap.y) < 14 && Game.canSort()) {
          Game.sort(trayTap.box);
        }
        trayTap = null;
        return;
      }
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag; drag = null;
      var dx = x - d.sx, dy = y - d.sy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var v = velocity(d.samples);
      var speed = Math.sqrt(v.x * v.x + v.y * v.y);       // px per ms
      if (card) { card.vx = v.x * 1000; card.vy = v.y * 1000; }
      var box = null;
      if (type === 'up') {
        if (dist >= TUNING.SWIPE_MIN_PX) box = Game.boxFor(dx, dy);
        /* A flick: fast, even if short. Its direction decides. */
        else if (speed > 0.55 && dist > 10) box = Game.boxFor(v.x, v.y);
      }
      if (box && Game.canSort()) {
        Game.sort(box);
      } else if (card) {
        card.state = 'idle';
        clearAim();
        Spring.kick(card.rot, (Math.random() - 0.5) * 3);
      }
    }
  }

  function velocity(samples) {
    if (samples.length < 2) return { x: 0, y: 0 };
    var a = samples[0], b = samples[samples.length - 1];
    for (var i = samples.length - 2; i >= 0; i--) {
      if (b.t - samples[i].t > 90) { a = samples[i]; break; }
      a = samples[i];
    }
    var dt = Math.max(8, b.t - a.t);
    return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
  }

  function updateAim(dx, dy) {
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (!card) return;
    if (dist < TUNING.SWIPE_MIN_PX * 0.6) { card.aimBox = null; card.aim = 0; return; }
    var box = Game.boxFor(dx, dy);
    if (box !== card.aimBox) { Sfx.play('pop'); Haptics.tap(); }
    card.aimBox = box;
    card.aim = Gfx.clamp((dist - TUNING.SWIPE_MIN_PX * 0.6) / 90, 0, 1);
  }

  function clearAim() { if (card) { card.aimBox = null; card.aim = 0; } }

  function key(e) {
    var k = (e.key || '').toLowerCase();
    if (k === 'escape' || k === 'p') { if (paused) closePause(); else openPause(); }
    else if (paused && (k === 'enter' || k === ' ')) closePause();
  }

  function back() {
    if (phase === 'end') return true;
    if (paused) { closePause(); return true; }
    if (phase === 'play' || phase === 'intro') { if (phase === 'play') openPause(); return true; }
    return false;
  }

  /* A round left running behind a locked screen pauses itself, rather
     than quietly losing to the clock while the phone is in a pocket. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && Stage.current() === 'round' && phase === 'play') openPause();
  });

  /* ================= per frame ================= */

  function update(dt, dtReal) {
    t += dt;
    var i, tr, key;
    for (i = 0; i < ORDER.length; i++) {
      key = ORDER[i]; tr = trays[key];
      var aimed = card && card.aimBox === key ? card.aim : 0;
      if (coach && coach.box === key) aimed = Math.max(aimed, 0.35 + 0.25 * Math.sin(t / 220));
      Spring.step(tr.aim, aimed, dt, 260, 20);
      Spring.step(tr.squash, 1, dt, 420, 16);
      Spring.step(tr.wiggle, 0, dt, 520, 10);
      tr.flash = Math.max(0, tr.flash - dt / 280);
    }

    if (card) {
      var tx = L.rest.x, ty = L.rest.y;
      if (card.state === 'held' && drag) {
        tx = drag.px + drag.ox; ty = drag.py + drag.oy;
        Spring.step(card.x, tx, dt, 900, 42);
        Spring.step(card.y, ty, dt, 900, 42);
        Spring.step(card.lift, 1, dt, 300, 20);
        /* Leans into the drag: the card's own horizontal speed tilts it. */
        Spring.step(card.rot, Gfx.clamp(card.x.v * 0.00045, -0.4, 0.4), dt, 300, 18);
      } else {
        ty += Math.sin(t / 700 + card.bob) * 2.5;
        Spring.step(card.x, tx, dt, card.state === 'deal' ? 140 : 260, card.state === 'deal' ? 16 : 22);
        Spring.step(card.y, ty, dt, card.state === 'deal' ? 140 : 260, card.state === 'deal' ? 16 : 22);
        Spring.step(card.lift, 0, dt, 260, 20);
        Spring.step(card.rot, 0, dt, 200, 14);
      }
      if (coach) coach.t += dt;
    }

    for (i = ghosts.length - 1; i >= 0; i--) {
      var g = ghosts[i];
      g.t += dt;
      if (g.fade) {
        g.alpha = Math.max(0, 1 - g.t / 300); g.scale *= 0.995;
        if (g.alpha <= 0) ghosts.splice(i, 1);
        continue;
      }
      var tr2 = trays[g.box];
      if (!g.bounced) {
        var p = Math.min(1, g.t / g.ms);
        var e = Ease.inQuad(p);
        /* Into the tray along a curve that starts in the direction it
           was thrown, so a flick sideways swings round into its corner
           rather than turning on a sixpence. */
        var tgtX = g.right ? tr2.mx : g.x0 + (tr2.mx - g.x0) * 0.78;
        var tgtY = g.right ? tr2.my : g.y0 + (tr2.my - g.y0) * 0.78;
        var cx = g.x0 + g.vx * 0.06, cy = g.y0 + g.vy * 0.06;
        var u = 1 - e;
        g.x = u * u * g.x0 + 2 * u * e * cx + e * e * tgtX;
        g.y = u * u * g.y0 + 2 * u * e * cy + e * e * tgtY;
        g.scale = g.right ? 1 - 0.72 * e : 1 - 0.3 * e;
        g.rot += (g.right ? (tr2.cx < W / 2 ? -1 : 1) * 9 : 4) * dt / 1000;
        if (p >= 1 && !g.landed) {
          g.landed = true;
          if (g.onLand) g.onLand();
          if (g.right) { ghosts.splice(i, 1); continue; }
        }
      } else {
        var s = dt / 1000;
        g.vy += 1900 * s;
        g.x += g.vx * s; g.y += g.vy * s;
        g.rot += g.spin * s;
        g.scale = Math.max(0.4, g.scale - s * 0.3);
        g.alpha = Math.max(0, g.alpha - s * 1.1);
        if (g.y > H + 200 || g.alpha <= 0) ghosts.splice(i, 1);
      }
    }

    for (i = shots.length - 1; i >= 0; i--) {
      var sh = shots[i];
      sh.t += dt;
      var q = Math.min(1, sh.t / sh.ms);
      var eq = sh.kind === 'paper' ? q : Ease.inQuad(q);
      var mx = (sh.x0 + sh.x1) / 2 + sh.bend, my = (sh.y0 + sh.y1) / 2;
      var uq = 1 - eq;
      sh.x = uq * uq * sh.x0 + 2 * uq * eq * mx + eq * eq * sh.x1;
      sh.y = uq * uq * sh.y0 + 2 * uq * eq * my + eq * eq * sh.y1;
      if (sh.kind === 'paper') sh.y -= Math.sin(q * Math.PI) * 60;
      sh.trail.push({ x: sh.x, y: sh.y });
      if (sh.trail.length > 10) sh.trail.shift();
      if (q >= 1) { shots.splice(i, 1); if (sh.onHit) sh.onHit(); }
    }

    for (i = banners.length - 1; i >= 0; i--) { banners[i].t += dtReal; if (banners[i].t > banners[i].life) banners.splice(i, 1); }
    for (i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > pops[i].life) pops.splice(i, 1); }

    if (explain) { explain.t += dtReal; if (explain.t > explain.life) explain = null; }
    if (say) { say.t += dtReal; if (say.t > say.life) say = null; }
    if (blackout > 0 && !paused) blackout = Math.max(0, blackout - dt);

    /* A golden card glints; a burning one throws sparks off its fuse. */
    if (card && phase === 'play' && !paused) {
      if (card.data.special === 'gold' && Math.random() < 0.18) {
        Particles.emit({ x: card.x.x + (Math.random() - 0.5) * L.cardW * 0.9, y: card.y.x + (Math.random() - 0.5) * L.cardH * 0.8, n: 1,
                         shape: 'star', colors: ['#ffffff', '#fff6c4'], speed: [5, 20], life: [300, 600], size: [3, 5], gravity: -20 });
      }
      if (card.data.fuseAt && card.flip > 0.9 && Math.random() < 0.7) {
        var fl = Game.fuseLeft();
        var sp = fusePoint(card, fl);
        Particles.emit({ x: sp.x, y: sp.y, n: 1, shape: 'spark', colors: ['#ffe48a', '#ffb43a', '#ff6a3a'],
                         speed: [40, 160], life: [150, 350], size: [2, 3], gravity: 300 });
        if (fl < 0.3 && Math.random() < 0.3) Particles.emit({ x: sp.x, y: sp.y, n: 1, colors: ['#555', '#777'], speed: [10, 40], life: [400, 800], size: [4, 8], gravity: -80 });
      }
    }

    vig.a = Math.max(0, vig.a - dt / 480);
    rushA += ((rush ? 1 : 0) - rushA) * Math.min(1, dt / 300);
    pauseA += ((paused ? 1 : 0) - pauseA) * Math.min(1, dtReal / 120);

    /* The score rolls up to its new value rather than jumping. */
    hud.shown += (hud.score - hud.shown) * Math.min(1, dt / 90);
    if (Math.abs(hud.score - hud.shown) < 1) hud.shown = hud.score;
    Spring.step(hud.punch, 1, dt, 420, 16);
    Spring.step(hud.comboPunch, 1, dt, 420, 14);
    Spring.step(hud.clockPunch, 1, dt, 420, 16);
    hud.comboShake = Math.max(0, hud.comboShake - dt / 400);

    /* Health bars drop at once; the pale "chip" behind them drains after
       a moment, so you can see how big the hit was. */
    hp.youBar = hp.you / hp.max; hp.foeBar = hp.foe / hp.maxFoe;
    hp.youChip += (hp.youBar - hp.youChip) * Math.min(1, dt / (hp.youChip > hp.youBar + 0.001 ? 380 : 1));
    hp.foeChip += (hp.foeBar - hp.foeChip) * Math.min(1, dt / (hp.foeChip > hp.foeBar + 0.001 ? 380 : 1));
    hp.youHit = Math.max(0, hp.youHit - dt / 300); hp.foeHit = Math.max(0, hp.foeHit - dt / 300);

    if (hero) hero.update(dt);
    if (foe) { foe.charge = Game.foeCharge(); foe.update(dt); }
    hudButtons.update(dtReal);
    pauseButtons.update(dtReal);

    /* Flames off a hot streak. */
    if (mode === 'level' && kind !== 'mine' && hud.streak >= 5 && phase === 'play' && !paused && Math.random() < 0.5) {
      var fx = W / 2, fy = L.top + L.trayH * 0.42;
      Particles.emit({ x: fx, y: fy + 6, n: 1, spreadX: 26, colors: hud.streak >= 8 ? ['#ff7ad9', '#ffb4ee', '#ffffff'] : ['#ffb43a', '#ff6a3a', '#ffe48a'],
                       angle: [-Math.PI * 0.62, -Math.PI * 0.38], speed: [40, 110], life: [300, 600], size: [3, 6], gravity: -90, drag: 1 });
    }
    Spring.step(dim, rush ? 0.36 : 0.3, dt, 80, 14);
  }

  /* ================= drawing ================= */

  function draw(c) {
    var camX = card ? (card.x.x - L.rest.x) * 0.05 : 0;
    var camY = card ? (card.y.x - L.rest.y) * 0.03 : 0;
    World.draw(c, W, H, { camX: camX, camY: camY, dim: dim.x,
                          tint: '#ff5a2a', tintAmt: rushA * (0.08 + 0.05 * Math.sin(t / 180)) });
    World.drawGround(c, L.bottom - 6, camX);

    if (foe) drawFoe(c);
    for (var i = 0; i < ORDER.length; i++) if (boxesOn[ORDER[i]]) drawTray(c, trays[ORDER[i]]);
    if (mode === 'level' && kind !== 'mine' && phase !== 'intro') drawCombo(c);
    if (hero) {
      hero.draw(c);
      drawShieldPips(c);
    }
    for (i = 0; i < ghosts.length; i++) drawCard(c, ghosts[i], true);
    drawShots(c);
    /* The card is hidden while paused. A pause is for the doorbell, not
       for sitting and thinking about the card with the clock stopped. */
    if (card && pauseA < 0.99) {
      c.save(); c.globalAlpha = 1 - pauseA;
      drawCard(c, card, false);
      c.restore();
    }
    /* No words while you play: the tutorial is the hand and the glowing
       tray, a miss is the right tray lighting up. The reasons wait for
       the review at the end. */
    if (coach && card) drawCoach(c);
    if (say && foe) drawSay(c);
    drawPops(c);
    drawHud(c);
    drawBanners(c);
    if (vig.a > 0) Gfx.vignette(c, W, H, vig.color, vig.a * 0.75);
    if (rushA > 0.01) Gfx.vignette(c, W, H, '#ff6a2a', rushA * (0.28 + 0.12 * Math.sin(t / 160)));
    if (pauseA > 0.01) drawPause(c);
  }

  function drawTray(c, tr) {
    var col = cornerColor(tr.key);
    var a = Gfx.clamp(tr.appear, 0, 1.2);
    if (a <= 0.01) return;
    var aim = tr.aim.x;
    var otherAimed = card && card.aimBox && card.aimBox !== tr.key ? card.aim : 0;
    var hidden = blackout > 0;
    var answer = explain && explain.box === tr.key ? Math.min(1, explain.t / 150) * Math.min(1, (explain.life - explain.t) / 300) : 0;
    c.save();
    /* Slide in from its own corner of the screen. */
    var fromX = tr.cx < W / 2 ? -tr.w : tr.w, fromY = tr.cy < H / 2 ? -tr.h : tr.h;
    var ea = Math.min(1, a);
    c.translate(tr.cx + tr.ox + fromX * (1 - ea), tr.cy + tr.oy + fromY * (1 - ea));
    /* Squashed by a gulp, it gets wider as it gets shorter - the way a
       soft thing would - rather than just shrinking. */
    var base = (1 + aim * 0.08) * (a > 1 ? a : 1);
    c.rotate(tr.wiggle.x * 0.006);
    c.scale(base / Math.max(0.7, tr.squash.x), base * tr.squash.x);
    c.globalAlpha = Math.min(1, ea) * (1 - otherAimed * 0.45);
    var x = -tr.w / 2, y = -tr.h / 2;

    if (rushA > 0.05) Gfx.glow(c, 0, 0, Math.max(tr.w, tr.h) * 0.7, '#ff8a3a', 0.18 * rushA);

    /* The tray is an object on the desk (js/desk.js): an in-tray, a
       calendar, an envelope, a bin. Baked, one bitmap per number of cards
       in it - each object shows its pile its own way. Aimed at, it lifts
       toward you and a marker ring goes round it. */
    var top = tr.y < L.rest.y;
    var pile = Math.min(6, tr.hits);
    var bt = big();
    var key = 'tray|' + tr.key + '|' + tr.w + '|' + tr.h + '|' + pile + '|' + (hidden ? 1 : 0) + '|' + (bt ? 1 : 0);
    var b = Gfx.bake(key, tr.w + 8, tr.h + 10, function (k) {
      k.translate(2, 2);
      Desk.tray(k, tr.key, tr.w, tr.h, pile, hidden, bt);
    });
    var hop = aim * -6 + (answer > 0 ? Math.abs(Math.sin(t / 110)) * -6 * answer : 0);
    c.drawImage(b.cv, x - 2, y - 2 + hop, b.w, b.h);

    if (aim > 0.02 || answer > 0) {
      /* a marker ring round it: the tray colour while you aim, and a
         moving dashed one round the tray a missed card belonged in */
      c.save();
      c.globalAlpha *= Math.max(aim, answer);
      c.lineWidth = 3.5;
      c.strokeStyle = answer > 0 ? '#fff4dd' : Gfx.shade(col, 0.35);
      if (answer > 0) { c.setLineDash([9, 7]); c.lineDashOffset = -t / 30; }
      c.beginPath(); c.ellipse(0, hop * 0.5, tr.w * 0.56, tr.h * 0.58, -0.04, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    if (hidden) {
      /* Ivan's blackout: scribbled over */
      c.save();
      c.globalAlpha = 0.5;
      c.strokeStyle = '#2a1e12'; c.lineWidth = 3;
      c.beginPath();
      for (var sl = 0; sl < 7; sl++) { var sy = y + tr.h * (0.2 + sl * 0.1) + Math.sin(t / 60 + sl) * 2; c.lineTo(x + (sl % 2 ? tr.w * 0.85 : tr.w * 0.15), sy); }
      c.stroke();
      c.restore();
    }
    if (tr.flash > 0) {
      c.globalAlpha = tr.flash * 0.45;
      c.fillStyle = tr.flashColor;
      c.beginPath(); c.ellipse(0, 0, tr.w * 0.5, tr.h * 0.5, 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  /** A task card: paper, the place it belongs to in a strip across the
      top, the task itself in the middle. While you aim it, its edge
      lights up in the colour of the tray it is heading for. */
  function drawCard(c, cd, isGhost) {
    var w = L.cardW, h = L.cardH;
    var x = isGhost ? cd.x : cd.x.x, y = isGhost ? cd.y : cd.y.x;
    var rot = isGhost ? cd.rot : cd.rot.x;
    var lift = isGhost ? 0 : Math.max(0, cd.lift.x);
    var scale = (cd.scale || 1) * (1 + lift * 0.06);
    var flip = cd.flip === undefined ? 1 : cd.flip;
    var showBack = flip < 0.5;
    var sx = Math.abs(Math.cos(flip * Math.PI)) || 0.02;

    c.save();
    c.globalAlpha *= cd.alpha === undefined ? 1 : cd.alpha;
    c.translate(x, y);
    c.rotate(rot);
    c.scale(scale * sx, scale);

    var aimCol = !isGhost && cd.aimBox ? cornerColor(cd.aimBox) : null;
    var special = cd.data && cd.data.special;
    var fl = !isGhost && cd.data && cd.data.fuseAt ? Game.fuseLeft() : 1;
    if (fl < 1) {
      /* the card shakes, gently and then less gently, as the fuse runs down */
      var heat = 1 - fl;
      if (heat > 0.6) c.translate((Math.random() - 0.5) * (heat - 0.6) * 10, 0);
    }
    /* Picked up, the shadow falls further away from the card. */
    if (lift > 0.01) {
      c.fillStyle = 'rgba(46,24,6,' + (0.1 + lift * 0.12).toFixed(3) + ')';
      c.fillRect(-w / 2 + lift * 8, -h / 2 + 8 + lift * 14, w, h);
    }

    if (showBack) {
      var back = Gfx.bake('cardback|' + w + '|' + h, w + 6, h + 8, function (k) { Desk.cardBack(k, w, h); });
      c.drawImage(back.cv, -w / 2, -h / 2, back.w, back.h);
      c.restore();
      return;
    }

    /* The face is baked once per card - paper, the place strip, the
       pips, the words - and stamped down as one image every frame after.
       Only the coloured edge you aim with is drawn live on top. */
    var place = PLACE[cd.data && cd.data.theme] || 'TASK';
    var gold = special === 'gold';
    var bt = big();
    /* once the ice is off, it is an ordinary card again */
    if (special === 'ice' && !(cd.data && cd.data.ice > 0)) special = null;
    /* A special card says what it is where the place usually goes. */
    if (gold) place = 'GOLDEN  x' + TUNING.GOLD_MULT;
    else if (special === 'fuse') place = 'BURNING - BE QUICK';
    else if (special === 'ice') place = 'FROZEN - TAP IT';
    /* The face is baked once per card (js/desk.js: an index card, taped
       down, the task written on it) and stamped every frame after. */
    var face = Gfx.bake('card|' + (special || '') + (bt ? 'b' : '') + '|' + cd.text + '|' + w + '|' + h, w + 6, h + 10, function (k) {
      k.translate(0, 4);
      Desk.cardFace(k, cd.text, w, h, '', special, bt);
    });
    c.drawImage(face.cv, -w / 2, -h / 2 - 4, face.w, face.h);
    if (gold && !isGhost) {
      /* a glint running across the gold card */
      var gx = ((t / 6) % (w * 2.2)) - w * 0.6;
      c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.beginPath(); c.moveTo(-w / 2 + gx, -h / 2); c.lineTo(-w / 2 + gx + 26, -h / 2); c.lineTo(-w / 2 + gx - 14, h / 2); c.lineTo(-w / 2 + gx - 40, h / 2); c.closePath(); c.fill();
      c.restore();
    }
    if (cd.burnt) {
      /* charred: the paper goes dark from the edges in */
      c.globalAlpha *= Math.min(1, cd.t / 250);
      c.fillStyle = 'rgba(30,18,10,.72)';
      Gfx.rr(c, -w / 2, -h / 2, w, h, 16); c.fill();
      c.globalAlpha = 1;
    }
    if (cd.data && cd.data.ice > 0) drawIce(c, w, h, cd.data.ice);
    if (fl < 1 && !isGhost) drawFuse(c, w, h, fl);
    if (aimCol) {
      /* a highlighter stripe down the card's edge in the tray's colour */
      c.fillStyle = Gfx.rgba(aimCol, 0.35 + cd.aim * 0.45);
      c.fillRect(-w / 2, -h / 2, 7, h);
      c.fillRect(w / 2 - 7, -h / 2, 7, h);
    }
    if (cd.stamp) {
      /* the wrong-way stamp, inked on */
      c.save();
      c.rotate(-0.25);
      c.globalAlpha *= 0.85;
      c.strokeStyle = '#c2412f'; c.lineWidth = 4;
      c.strokeRect(-50, -24, 100, 48);
      c.lineWidth = 1.5; c.strokeRect(-45, -19, 90, 38);
      Gfx.text(c, 'NOPE', 0, 2, { font: 'arcade', size: 15, color: '#c2412f' });
      c.restore();
    }
    c.restore();
  }

  /** Ice over a frozen card: clear blue, frost round the edge, and cracks
      once it has been tapped. Baked per crack stage. */
  function drawIce(c, w, h, left) {
    var stage = Math.max(0, iceStart() - left);
    var b = Gfx.bake('ice|' + w + '|' + h + '|' + stage, w + 8, h + 8, function (k) {
      k.translate(4, 4);
      k.save();
      Gfx.rr(k, 0, 0, w, h, 16); k.clip();
      var g = k.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(210,240,255,.78)'); g.addColorStop(0.5, 'rgba(150,205,245,.55)'); g.addColorStop(1, 'rgba(200,235,255,.8)');
      k.fillStyle = g; k.fillRect(0, 0, w, h);
      /* frost creeping in from the edges */
      k.fillStyle = 'rgba(255,255,255,.55)';
      for (var i = 0; i < 26; i++) {
        var ex = (i * 37) % w, side = i % 4;
        var px = side === 0 ? ex : side === 1 ? w - 4 : side === 2 ? ex : 0;
        var py = side === 0 ? 0 : side === 1 ? (i * 23) % h : side === 2 ? h - 4 : (i * 29) % h;
        k.beginPath(); k.arc(px, py, 5 + (i % 3) * 3, 0, Math.PI * 2); k.fill();
      }
      /* glints */
      k.strokeStyle = 'rgba(255,255,255,.8)'; k.lineWidth = 3; k.lineCap = 'round';
      k.beginPath(); k.moveTo(w * 0.12, h * 0.3); k.lineTo(w * 0.22, h * 0.14); k.stroke();
      k.beginPath(); k.moveTo(w * 0.78, h * 0.86); k.lineTo(w * 0.88, h * 0.7); k.stroke();
      if (stage > 0) {
        /* cracks from the middle out */
        k.strokeStyle = 'rgba(40,90,140,.75)'; k.lineWidth = 2.2;
        var arms = 4 + stage * 3;
        for (var a = 0; a < arms; a++) {
          var ang = a / arms * Math.PI * 2 + 0.4, r = 0, x = w / 2, y = h / 2;
          k.beginPath(); k.moveTo(x, y);
          for (var s = 0; s < 4; s++) {
            r += Math.min(w, h) * (0.14 + ((a * 7 + s * 3) % 5) * 0.03);
            ang += (((a + s) % 3) - 1) * 0.35;
            k.lineTo(w / 2 + Math.cos(ang) * r * 1.4, h / 2 + Math.sin(ang) * r);
          }
          k.stroke();
        }
      }
      k.restore();
      k.lineWidth = 3; k.strokeStyle = 'rgba(230,248,255,.95)';
      Gfx.rr(k, 1.5, 1.5, w - 3, h - 3, 16); k.stroke();
    });
    c.drawImage(b.cv, -w / 2 - 4, -h / 2 - 4, b.w, b.h);
  }

  function iceStart() { return Shop.effects().mult >= TUNING.ICE_ONE_HIT_MULT ? 1 : TUNING.ICE_HITS; }

  /** Where the spark on a burning card's fuse is, in screen space. */
  function fusePoint(cd, fl) {
    var w = L.cardW, h = L.cardH;
    var lx = -w / 2 + 16 + (w - 32) * fl, ly = -h / 2 - 2;
    var r = cd.rot.x, s = cd.scale || 1;
    return { x: cd.x.x + (lx * Math.cos(r) - ly * Math.sin(r)) * s, y: cd.y.x + (lx * Math.sin(r) + ly * Math.cos(r)) * s };
  }

  /** The fuse along the top of a burning card: the rope still to burn,
      the burnt bit behind it, and the spark where they meet. */
  function drawFuse(c, w, h, fl) {
    var x0 = -w / 2 + 16, x1 = w / 2 - 16, y = -h / 2 - 2;
    var xs = x0 + (x1 - x0) * fl;
    var heat = 1 - fl;
    /* the edge of the card catching, redder as it goes */
    c.lineWidth = 3 + heat * 2;
    c.strokeStyle = Gfx.rgba(heat > 0.65 ? '#ff4a2a' : '#ff8a3a', 0.55 + 0.35 * Math.sin(t / 80));
    Gfx.rr(c, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, 16); c.stroke();
    /* the burnt track, then the rope still to go */
    c.lineCap = 'round';
    c.lineWidth = 9; c.strokeStyle = 'rgba(20,12,6,.55)';
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
    c.lineWidth = 7; c.strokeStyle = '#5a3a1a';
    c.beginPath(); c.moveTo(x0, y); c.lineTo(xs, y); c.stroke();
    c.lineWidth = 4; c.strokeStyle = '#e8c58a';
    c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(x0, y); c.lineTo(xs, y); c.stroke();
    c.setLineDash([]);
    Gfx.glow(c, xs, y, 34, '#ffb43a', 1);
    Gfx.drawSprite(c, 'fire', xs, y - 8 + Math.sin(t / 50) * 1.5, 22, 22);

  }

  /** The boss's speech bubble, just under them. */
  function drawSay(c) {
    var s = say;
    var k = s.t < 160 ? Ease.outBack(s.t / 160) : 1;
    var a = Math.min(1, (s.life - s.t) / 250);
    var tw = Math.min(W - 40, Gfx.measure(c, s.text, { size: 14, weight: 700 }) + 28);
    var x = Gfx.clamp(foe.x, tw / 2 + 12, W - tw / 2 - 12), y = foe.y + foe.size * 0.56 + 22;
    c.save();
    c.globalAlpha = a;
    c.translate(x, y);
    c.scale(k, k);
    c.fillStyle = '#fffdf6';
    c.beginPath(); c.moveTo(foe.x - x - 8, 2); c.lineTo(foe.x - x + 8, 2); c.lineTo(foe.x - x, -9); c.closePath(); c.fill();
    Gfx.panel(c, -tw / 2, 0, tw, 30, { fill: '#fffdf6', depth: 3, r: 4, lip: false });
    Gfx.text(c, s.text, 0, 15, { size: 14, weight: 700, color: '#1f2a44', maxW: tw - 16 });
    c.restore();
  }

  function drawShots(c) {
    for (var i = 0; i < shots.length; i++) {
      var s = shots[i];
      if (s.kind === 'paper') {
        c.save();
        c.translate(s.x, s.y); c.rotate(s.t / 60);
        c.fillStyle = '#f4efe2'; c.strokeStyle = '#b8ab8a'; c.lineWidth = 2;
        c.beginPath();
        for (var k = 0; k < 7; k++) {
          var a = k / 7 * Math.PI * 2, r = 10 + (k % 2 ? 3 : -1);
          if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.closePath(); c.fill(); c.stroke();
        c.restore();
        continue;
      }
      for (var j = 0; j < s.trail.length; j++) {
        var p = s.trail[j], f = j / s.trail.length;
        c.globalAlpha = f * 0.8;
        c.fillStyle = s.color;
        c.beginPath(); c.arc(p.x, p.y, (s.big ? 9 : 6) * f, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      Gfx.glow(c, s.x, s.y, s.big ? 40 : 28, s.color, 0.7);
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(s.x, s.y, s.big ? 6 : 4, 0, Math.PI * 2); c.fill();
    }
  }

  function drawFoe(c) {
    foe.draw(c);
    if (phase === 'play' && foe.ko === 0) {
      /* The telegraph: a bar under the boss filling up to their swing. */
      var bw = foe.size * 0.9, bx = foe.x - bw / 2, by = foe.y + foe.size * 0.56;
      c.fillStyle = 'rgba(0,0,0,.45)';
      Gfx.rr(c, bx, by, bw, 7, 4); c.fill();
      var ch = foe.charge;
      c.fillStyle = ch > 0.75 ? (Math.sin(t / 50) > 0 ? '#ff6a5a' : '#ffd0c8') : '#ffb43a';
      Gfx.rr(c, bx + 1, by + 1, Math.max(0, (bw - 2) * ch), 5, 3); c.fill();
    }
  }

  function drawShieldPips(c) {
    if (!shields.total || !hero) return;
    var hc = hero.centre();
    var size = 15, gap = 4;
    var w = shields.total * size + (shields.total - 1) * gap;
    var y = hc.y - hero.k * 16 - 20;
    for (var i = 0; i < shields.total; i++) {
      var on = i < shields.left;
      Gfx.drawSprite(c, 'shield', hc.x - w / 2 + i * (size + gap) + size / 2, y, size, size, { alpha: on ? 1 : 0.22 });
    }
  }

  function drawCombo(c) {
    var mult = Math.max(1, Math.min(hud.streak, TUNING.MAX_MULTIPLIER));
    var x = W / 2, y = L.top + L.trayH * 0.42;
    /* THE COMBO IS A RUBBER STAMP, inked between the top trays. The ink
       goes from a tired grey to red as it climbs; at x8 it is gold. */
    var cols = ['#8a7a62', '#8a7a62', '#8a6a3a', '#a8562a', '#b84a2a', '#c2412f', '#c2412f', '#c2412f', '#d4a017'];
    var col = cols[Math.min(mult, 8)];
    var r = Gfx.clamp(L.chan * 0.42, 26, 40) * (1 + Math.min(mult, 8) * 0.025);
    c.save();
    c.translate(x + (hud.comboShake > 0 ? (Math.random() - 0.5) * 10 * hud.comboShake : 0), y);
    var p = hud.comboPunch.x * (mult >= 8 ? 1 + 0.05 * Math.sin(t / 90) : 1);
    c.scale(p, p);
    /* stamped on a round paper label stuck to the cork, or red ink on
       brown cork would barely read */
    c.fillStyle = 'rgba(46,24,6,.38)'; c.beginPath(); c.arc(2, 4, r * 1.12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fffdf6'; c.beginPath(); c.arc(0, 0, r * 1.12, 0, Math.PI * 2); c.fill();
    Gfx.rubberStamp(c, 0, 0, r, 'x' + mult, '', col, -0.16);
    c.restore();
  }

  function drawHud(c) {
    var y = L.hudY, h = L.hudH;
    hudButtons.draw(c);

    var cxClock = W - L.pad - 26, cyClock = y + h / 2;
    var sx = W / 2 + 4;
    if (mode === 'battle') {
      drawHpBars(c, y, h, cxClock);
    } else if (kind === 'mine') {
      maskingTape(c, sx, y + 30, 150, 1.2);
      Gfx.text(c, 'MY LIST', sx, y + 30, { font: 'arcade', size: 13, color: Desk.INK });
    } else {
      /* the level on a typed label; the score on a strip of masking tape */
      var digits = Math.round(hud.shown).toLocaleString();
      maskingTape(c, sx, y + 33, Math.max(110, digits.length * 20 + 40), 1.2);
      c.save();
      c.translate(sx, y + 34);
      c.scale(hud.punch.x, hud.punch.x);
      Gfx.text(c, digits, 0, 0, { font: 'arcade', size: 19, color: Desk.INK, maxW: W - 170 });
      c.restore();
    }
    drawClock(c, cxClock, cyClock);
  }

  /** A strip of masking tape, torn at both ends, centred on (x, y). */
  function maskingTape(c, x, y, w, rot) {
    var h = 30, seed = Math.round(w);
    c.save();
    c.translate(x, y); c.rotate((rot || 0) * Math.PI / 180);
    c.fillStyle = 'rgba(46,24,6,.25)'; c.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
    c.beginPath();
    c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2);
    for (var i = 1; i <= 5; i++) c.lineTo(w / 2 + ((i * 7 + seed) % 5) - 3, -h / 2 + h * i / 5);
    c.lineTo(-w / 2, h / 2);
    for (i = 4; i >= 0; i--) c.lineTo(-w / 2 + ((i * 5 + seed) % 5) - 2, -h / 2 + h * i / 5);
    c.closePath();
    c.fillStyle = 'rgba(240,226,190,.94)'; c.fill();
    c.restore();
  }

  function drawClock(c, x, y) {
    var r = 23;
    var frac, label, hot = false, size = 15;
    if (hud.calm) {
      frac = hud.goal ? hud.progress / hud.goal : 0;
      label = hud.progress + '/' + hud.goal; size = 9;
    } else {
      frac = Gfx.clamp(hud.frac, 0, 1);
      label = String(Math.max(0, hud.secs));
      hot = hud.secs <= 10;
    }
    /* a kitchen timer: the red wedge is the time left, and it wobbles on
       its base for the last few seconds */
    var col = hot ? (Math.sin(t / 120) > 0 ? '#c2412f' : '#e0524a') : rush ? '#e8963a' : hud.calm ? '#5aa864' : '#e0524a';
    c.save();
    c.translate(x, y);
    var p = hud.clockPunch.x;
    c.scale(p, p);
    if (hot && !hud.calm) c.rotate(Math.sin(t / 45) * 0.06);
    Desk.timer(c, 0, 0, r, frac, label, hot, col);
    c.restore();
    void size;
    if (mode === 'battle' && hud.streak > 1) {
      Gfx.text(c, 'x' + Math.min(hud.streak, 8), x, y + r + 12, { font: 'arcade', size: 9, color: '#fff4dd', shadow: 'rgba(46,24,6,.7)', shadowY: 1.5 });
    }
  }

  function drawHpBars(c, y, h, clockX) {
    var left = L.pad + 54, right = clockX - 34;
    var mid = (left + right) / 2;
    var bw = (right - left) / 2 - 6;
    bar(c, left, y + 26, bw, Hero.name().toUpperCase(), hp.youBar, hp.youChip, hp.youHit, '#5cc46a', false);
    bar(c, mid + 6, y + 26, bw, foe ? foe.def.name.toUpperCase() : '', hp.foeBar, hp.foeChip, hp.foeHit, '#e0524a', true);
  }

  function bar(c, x, y, w, name, v, chip, hit, col, flip) {
    /* a health bar is a strip of card with the health coloured in */
    Gfx.text(c, name, flip ? x + w : x, y - 11, { font: 'mono', size: 8, color: '#fff4dd', shadow: 'rgba(46,24,6,.7)', shadowY: 1, align: flip ? 'right' : 'left', maxW: w });
    c.fillStyle = 'rgba(46,24,6,.4)'; c.fillRect(x + 2, y + 3, w, 14);
    c.fillStyle = '#efe4c8';
    Gfx.rr(c, x, y, w, 14, 6); c.fill();
    var fw = (w - 4) * Gfx.clamp(v, 0, 1), cw = (w - 4) * Gfx.clamp(chip, 0, 1);
    c.fillStyle = '#ffffff';
    if (cw > 0) { Gfx.rr(c, flip ? x + 2 + (w - 4 - cw) : x + 2, y + 2, cw, 10, 4); c.fill(); }
    var low = v <= 0.3;
    c.fillStyle = low ? (Math.sin(t / 110) > 0 ? '#ff5a4a' : '#ff9a6a') : col;
    if (fw > 0) { Gfx.rr(c, flip ? x + 2 + (w - 4 - fw) : x + 2, y + 2, fw, 10, 4); c.fill(); }
    if (hit > 0) { c.globalAlpha = hit; c.fillStyle = '#fff'; Gfx.rr(c, x, y, w, 14, 6); c.fill(); c.globalAlpha = 1; }
  }

  function drawPops(c) {
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i], k = p.t / p.life;
      var rise = Ease.outCubic(Math.min(1, k * 1.4)) * 46;
      var s = k < 0.15 ? Ease.outBackBig(k / 0.15) : 1;
      var a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      c.save();
      c.globalAlpha = a;
      /* Kept on the screen: a corner tray's points would otherwise
         print half off the edge. */
      var half = Gfx.measure(c, p.text, { font: 'arcade', size: p.size }) / 2 + 8;
      c.translate(Gfx.clamp(p.x, half, W - half), p.y - rise);
      c.scale(s, s);
      Gfx.text(c, p.text, 0, 0, { font: 'arcade', size: p.size, color: p.color, stroke: '#2a1e12', strokeW: Math.max(4, p.size * 0.3) });
      c.restore();
    }
  }

  function drawBanners(c) {
    for (var i = 0; i < banners.length; i++) {
      var b = banners[i], k = b.t / b.life;
      var inK = Math.min(1, k / 0.18);
      var s = k < 0.18 ? 0.2 + 0.8 * Ease.outBackBig(inK) : k > 0.78 ? 1 + (k - 0.78) * 1.2 : 1;
      var a = k > 0.78 ? 1 - (k - 0.78) / 0.22 : Math.min(1, inK * 2);
      c.save();
      c.globalAlpha = a;
      c.translate(W / 2, b.y);
      if (b.rays) {
        c.save();
        c.rotate(t / 1400);
        c.globalAlpha = a * 0.22;
        c.fillStyle = b.color;
        var reach = Math.min(W, H) * 0.55;
        for (var r = 0; r < 12; r++) {
          c.rotate(Math.PI / 6);
          c.beginPath(); c.moveTo(0, 0); c.lineTo(-12, -reach); c.lineTo(12, -reach); c.closePath(); c.fill();
        }
        c.restore();
      }
      c.scale(s, s);
      Gfx.text(c, b.text, 0, 0, { font: 'arcade', size: b.size, color: b.color, stroke: '#2a1e12', strokeW: Math.max(6, b.size * 0.28), maxW: W - 30, shadow: 'rgba(0,0,0,.5)', shadowY: 5 });
      if (b.sub && b.subFont === 'body') Gfx.text(c, b.sub, 0, b.size * 1.1, { size: 15, weight: 700, color: b.subColor, stroke: '#2a1e12', strokeW: 4, maxW: W - 40 });
      else if (b.sub) Gfx.text(c, b.sub, 0, b.size * 0.95, { font: 'arcade', size: Math.max(10, b.size * 0.36), color: b.subColor, stroke: '#2a1e12', strokeW: 5, maxW: W - 40 });
      c.restore();
    }
  }

  /** The tutorial: a speech panel above the card, the tray it belongs
      in glowing, and a hand that shows the drag. */
  function drawCoach(c) {
    var tr = trays[coach.box];
    var a = Math.min(1, coach.t / 250);
    c.save();
    c.globalAlpha = a;
    /* the hand */
    if (card.state !== 'held') {
      var cyc = (coach.t % 1500) / 1500;
      var mv = Ease.inOutCubic(Math.min(1, Math.max(0, (cyc - 0.15) / 0.6)));
      var hx = Gfx.lerp(card.x.x, tr.mx, mv), hy = Gfx.lerp(card.y.x + 10, tr.my, mv);
      var ha = cyc < 0.1 ? cyc / 0.1 : cyc > 0.85 ? 1 - (cyc - 0.85) / 0.15 : 1;
      c.globalAlpha = a * ha;
      c.fillStyle = 'rgba(255,244,220,.35)';
      c.beginPath(); c.arc(hx, hy, 22 + (cyc < 0.15 ? (0.15 - cyc) * 60 : 0), 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fffdf6';
      c.beginPath(); c.arc(hx, hy, 11, 0, Math.PI * 2); c.fill();
      c.strokeStyle = Desk.INK; c.lineWidth = 3; c.stroke();
    }
    c.restore();
  }

  function drawPause(c) {
    c.save();
    c.globalAlpha = pauseA;
    c.fillStyle = 'rgba(30,16,4,.72)';
    c.fillRect(0, 0, W, H);
    var by = pauseButtons.list.length ? pauseButtons.list[0].y : H * 0.36;
    Gfx.text(c, 'PAUSED', W / 2, by - 56, { font: 'arcade', size: 26, color: '#fff4dd', shadow: 'rgba(0,0,0,.6)', shadowY: 4 });
    pauseButtons.draw(c);
    var last = pauseButtons.list[pauseButtons.list.length - 1];
    c.restore();
  }

  Stage.define('round', {
    music: function () { return mode === 'battle' ? 'battle' : 'play'; },
    enter: enter, exit: exit, layout: layout,
    update: update, draw: draw, pointer: pointer, key: key, back: back
  });

  return {
    beginLevel: beginLevel,
    beginBattle: beginBattle,
    deal: deal,
    sorted: sorted,
    shuffle: shuffle,
    cracked: cracked,
    stillFrozen: stillFrozen,
    foePower: foePower,
    setClock: setClock,
    setProgress: setProgress,
    setRush: setRush,
    foeMove: foeMove,
    end: end,
    /* for tests and for the debug overlay */
    state: function () {
      return { phase: phase, paused: paused, kind: kind, corners: corners, blackout: blackout, explain: explain ? explain.box : null,
               say: say ? say.text : null,
               card: card ? { text: card.text, box: card.data.box, state: card.state, special: card.data.special, ice: card.data.ice, x: card.x.x, y: card.y.x } : null,
               score: hud.score, streak: hud.streak, secs: hud.secs, trays: L ? {
                 now: trays.now && { x: trays.now.cx, y: trays.now.cy }, later: trays.later && { x: trays.later.cx, y: trays.later.cy },
                 give: trays.give && { x: trays.give.cx, y: trays.give.cy }, drop: trays.drop && { x: trays.drop.cx, y: trays.drop.cy }
               } : null, rest: L ? L.rest : null };
    }
  };
})();
