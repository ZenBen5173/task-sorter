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
  var hp = { max: 100, you: 100, foe: 100, youBar: 1, foeBar: 1, youChip: 1, foeChip: 1, youHit: 0, foeHit: 0 };
  var shields = { left: 0, total: 0 };
  var banners = [], pops = [];
  var vig = { color: '#e0524a', a: 0 };
  var rush = false, rushA = 0;
  var phase = 'idle';           // 'intro' | 'play' | 'end'
  var coach = null;
  var dim = Spring.make(0.3);

  var PLACE = { house: 'AT HOME', school: 'AT SCHOOL', phone: 'ON YOUR PHONE', out: 'OUT IN TOWN' };

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

    setTray('now', pad, top, trayW, trayH);
    setTray('later', W - pad - trayW, top, trayW, trayH);
    setTray('give', pad, bottom - trayH, trayW, trayH);
    setTray('drop', W - pad - trayW, bottom - trayH, trayW, trayH);
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
        c.fillStyle = '#e6eefc';
        c.fillRect(b.w / 2 - 8, b.h / 2 - 9, 5, 18);
        c.fillRect(b.w / 2 + 3, b.h / 2 - 9, 5, 18);
      },
      onTap: function () { openPause(); }
    });
    layoutPause();
  }

  function setTray(key, x, y, w, h) {
    var tr = trays[key] || (trays[key] = {
      key: key, aim: Spring.make(0), squash: Spring.make(1), wiggle: Spring.make(0),
      flash: 0, flashColor: '#fff', hits: 0, appear: 1, glow: 0
    });
    tr.x = x; tr.y = y; tr.w = w; tr.h = h;
    tr.cx = x + w / 2; tr.cy = y + h / 2;
    /* The mouth is the part of the tray a card disappears into: the
       inner side, toward the middle of the screen. */
    var inward = key === 'now' || key === 'later' ? 1 : -1;
    tr.mx = tr.cx; tr.my = tr.cy + inward * h * 0.08;
  }

  /* ================= starting ================= */

  function enter(p) {
    params = p || {};
    mode = params.battle ? 'battle' : 'level';
    var lv = mode === 'level' ? (LEVELS[(params.level || 1) - 1] || LEVELS[0]) : null;
    boxesOn = { now: false, later: false, give: false, drop: false };
    (lv ? lv.boxes : ORDER).forEach(function (b) { boxesOn[b] = true; });

    card = null; ghosts = []; shots = []; banners = []; pops = [];
    paused = false; pauseA = 0; drag = null; trayTap = null; coach = null;
    rush = false; rushA = 0; vig.a = 0;
    hud.score = 0; hud.shown = 0; hud.streak = 0; hud.secs = lv && lv.seconds ? lv.seconds : 0;
    hud.frac = 1; hud.calm = !!(lv && !lv.seconds);
    hud.goal = lv ? (lv.goal || 20) : 0; hud.progress = 0;
    hud.label = lv ? 'LEVEL ' + lv.n + ' · NEED ' + Math.round(lv.minAcc * 100) + '%' : '';
    shields.total = Shop.effects().block; shields.left = shields.total;

    hero = new Actors.Hero({ k: 2.6, name: Hero.name() });
    hero.refresh();
    if (mode === 'battle') {
      var def = OPPONENTS[(params.battle || 1) - 1] || OPPONENTS[0];
      foe = new Actors.Foe(def, {});
      hp.max = BATTLE.HP; hp.you = hp.foe = BATTLE.HP;
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
      if (mode === 'battle') Game.startBattle(params.battle);
      else Game.start(params.level);
    };
    if (mode === 'battle') {
      Tween.wait(450, function () {
        banner('FIGHT!', { color: '#ff6a5a', size: 40, life: 800, y: L.rest.y });
        Sfx.play('vs');
        Stage.shake(8, 300);
      }, { tag: 'arena' });
      Tween.wait(1050, go, { tag: 'arena' });
    } else {
      Tween.wait(320, function () {
        banner('LEVEL ' + lv.n, { color: Gfx.C.gold, size: 30, life: 1000, y: L.rest.y - 22,
                                  sub: lv.name.toUpperCase(), subColor: '#fff' });
        Sfx.play('pop');
      }, { tag: 'arena' });
      Tween.wait(1250, function () {
        banner('GO!', { color: '#7dff9a', size: 44, life: 600, y: L.rest.y });
        Sfx.play('release');
        Stage.punch(0.5);
      }, { tag: 'arena' });
      Tween.wait(1400, go, { tag: 'arena' });
    }
  }

  /* ================= what the game tells us ================= */

  function beginLevel(o) {
    info = o;
    hud.calm = o.calm; hud.goal = o.goal;
    hud.secs = o.seconds; hud.frac = 1;
    hud.label = 'LEVEL ' + o.level.n + ' · NEED ' + o.target + '%';
    shields.total = o.shields; shields.left = o.shields;
  }

  function beginBattle(o) {
    info = o;
    hp.max = o.hp; hp.you = o.hp; hp.foe = o.hp;
    hud.secs = o.seconds; hud.frac = 1;
    shields.total = o.shields; shields.left = o.shields;
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
  }

  /** What a sort was worth. The card in play becomes a ghost flying to
      its tray; the next card is dealt straight after by the game. */
  function sorted(r) {
    var tr = trays[r.box];
    var c = card;
    card = null;
    drag = null;
    coach = null;
    clearAim();
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

  function landRight(r, tr) {
    var col = cornerColor(r.box);
    tr.hits++;
    Spring.kick(tr.squash, -6);
    tr.flash = 1; tr.flashColor = '#ffffff';
    Particles.emit({ x: tr.mx, y: tr.my, n: 16, colors: [col, Gfx.shade(col, 0.4), '#ffffff'],
                     speed: [120, 380], life: [300, 700], size: [3, 7], gravity: 600, drag: 2 });
    Particles.emit({ x: tr.mx, y: tr.my, n: 8, shape: 'spark', colors: ['#ffffff', Gfx.shade(col, 0.5)],
                     speed: [260, 520], life: [180, 360], size: [2, 3], drag: 3 });
    Sfx.play('right', r.streak);
    Haptics.good();

    var popAt = { x: tr.cx, y: tr.cy + (tr.y < L.rest.y ? tr.h * 0.62 : -tr.h * 0.62) };
    if (mode === 'battle') {
      /* The answer flies up out of the tray at the boss. */
      shoot(tr.mx, tr.my, foe.x, foe.y, col, r.perfect, function () {
        foe.hurt(r.perfect ? 1 : 0.5);
        hp.foe = r.hpFoe; hp.foeHit = 1;
        pop('-' + r.hit, foe.x + 30, foe.y - 30, r.perfect ? Gfx.C.gold : '#ffffff', r.perfect ? 26 : 20);
        Particles.emit({ x: foe.x, y: foe.y, n: 18, colors: [col, '#fff'], speed: [140, 420], life: [300, 600], size: [3, 6], gravity: 300 });
        Sfx.play('hit', r.perfect ? 1 : 0.5);
        Stage.shake(r.perfect ? 9 : 5, 220);
        Haptics.perfect();
      });
      if (r.perfect) perfectBeat(tr, 'PERFECT HIT!');
    } else {
      pop('+' + r.gained.toLocaleString(), popAt.x, popAt.y, r.perfect ? Gfx.C.gold : '#ffffff', r.perfect ? 24 : 19);
      hud.score = r.score;
      Spring.kick(hud.punch, 4);
      if (r.perfect) perfectBeat(tr, 'PERFECT!');
    }

    Spring.kick(hud.comboPunch, 5);
    if (hero) hero.cheer(Math.min(1, 0.3 + r.streak * 0.08));
    /* Milestones in a streak get their own moment. */
    if (r.streak === 5 || r.streak === 8 || (r.streak > 8 && r.streak % 5 === 0)) {
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
    banner(word, { color: Gfx.C.gold, size: 24, life: 560, y: L.top + L.trayH + 26, slot: 'top' });
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
      vig.color = '#e0524a'; vig.a = 0.7;
      Stage.shake(mode === 'battle' ? 9 : 7, 260);
      Sfx.play('wrong');
      Haptics.bad();
      if (r.lostStreak >= 3) {
        pop('COMBO BROKEN', W / 2, L.top + L.trayH + 24, '#ff8a7a', 15);
        Particles.emit({ x: W / 2, y: L.top + L.trayH * 0.5, n: 16, colors: ['#ffb43a', '#ff6a3a', '#ffe48a'], speed: [100, 300], life: [400, 800], size: [3, 6], gravity: 700 });
        Sfx.play('comboBreak');
      }
      if (hero) {
        if (mode === 'battle') {
          hero.hurt(tr.cx < W / 2 ? 1 : -1);
          hp.you = r.hpYou; hp.youHit = 1;
          var hc = hero.centre();
          pop('-' + r.selfHit, hc.x + 34, hc.y - 20, '#ff6a5a', 20);
          Sfx.play('hurt');
        } else {
          /* In a level nobody hurts you; you just flinch. */
          Spring.kick(hero.sq, -2.5);
          Spring.kick(hero.lean, (tr.cx < W / 2 ? 1 : -1) * 4);
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
        pop('FUMBLED!', foe.x, foe.y - foe.size * 0.6, '#9fd4ff', 14);
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
      banner('FINAL RUSH!', { color: '#ff8a3a', size: 30, life: 1200, y: L.rest.y - L.cardH * 0.85, sub: 'DOUBLE POINTS', subColor: '#ffe48a' });
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
    drag = null; coach = null;
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
      banner('DONE!', { color: '#7dff9a', size: 46, life: 1200, y: H * 0.45, rays: true });
      Sfx.play('win');
      Haptics.win();
      confetti();
      wait = 1300;
    } else if (reason === 'won') {
      wait = 1900;
      Tween.wait(260, function () {
        if (foe) foe.knockOut();
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
    banners.push({ text: text, sub: o.sub || '', subColor: o.subColor || '#fff', color: o.color || '#fff',
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
          c.fillStyle = th.id === 'space' ? '#18234a' : th.id === 'sakura' ? '#c86a8a' : th.id === 'forest' ? '#2f6a4a' : '#3f7c9c';
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
      if (card && (card.state === 'idle' || (card.state === 'deal' && card.flip > 0.45)) && cardHit(x, y) && Game.canSort()) {
        card.state = 'held';
        drag = { id: e.pointerId, sx: x, sy: y, ox: card.x.x - x, oy: card.y.x - y, px: x, py: y, samples: [{ x: x, y: y, t: Stage.real() }] };
        Spring.kick(card.lift, 6);
        Sfx.play('grab');
        Haptics.tap();
        return;
      }
      var tb = trayAt(x, y);
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
    hp.youBar = hp.you / hp.max; hp.foeBar = hp.foe / hp.max;
    hp.youChip += (hp.youBar - hp.youChip) * Math.min(1, dt / (hp.youChip > hp.youBar + 0.001 ? 380 : 1));
    hp.foeChip += (hp.foeBar - hp.foeChip) * Math.min(1, dt / (hp.foeChip > hp.foeBar + 0.001 ? 380 : 1));
    hp.youHit = Math.max(0, hp.youHit - dt / 300); hp.foeHit = Math.max(0, hp.foeHit - dt / 300);

    if (hero) hero.update(dt);
    if (foe) { foe.charge = Game.foeCharge(); foe.update(dt); }
    hudButtons.update(dtReal);
    pauseButtons.update(dtReal);

    /* Flames off a hot streak. */
    if (mode === 'level' && hud.streak >= 5 && phase === 'play' && !paused && Math.random() < 0.5) {
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
    if (mode === 'level' && phase !== 'intro') drawCombo(c);
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
    if (coach && card) drawCoach(c);
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
    c.save();
    /* Slide in from its own corner of the screen. */
    var fromX = tr.cx < W / 2 ? -tr.w : tr.w, fromY = tr.cy < H / 2 ? -tr.h : tr.h;
    var ea = Math.min(1, a);
    c.translate(tr.cx + fromX * (1 - ea), tr.cy + fromY * (1 - ea));
    /* Squashed by a gulp, it gets wider as it gets shorter - the way a
       soft thing would - rather than just shrinking. */
    var base = (1 + aim * 0.08) * (a > 1 ? a : 1);
    c.rotate(tr.wiggle.x * 0.006);
    c.scale(base / Math.max(0.7, tr.squash.x), base * tr.squash.x);
    c.globalAlpha = Math.min(1, ea) * (1 - otherAimed * 0.45);
    var x = -tr.w / 2, y = -tr.h / 2;

    if (aim > 0.02) Gfx.glow(c, 0, 0, Math.max(tr.w, tr.h) * (0.7 + aim * 0.3), col, 0.45 * aim);
    if (rushA > 0.05) Gfx.glow(c, 0, 0, Math.max(tr.w, tr.h) * 0.7, '#ff8a3a', 0.18 * rushA);

    /* The tray itself - body, mouth, label, the cards piled in it - is
       baked, one bitmap per number of cards in the pile. Only what moves
       is drawn live: the icon (it bounces when you aim at it), the glow,
       the flash. */
    var top = tr.y < L.rest.y;
    var pile = Math.min(6, tr.hits);
    var key = 'tray|' + tr.key + '|' + tr.w + '|' + tr.h + '|' + (top ? 1 : 0) + '|' + pile;
    var b = Gfx.bake(key, tr.w + 4, tr.h + 10, function (k) {
      Gfx.panel(k, 2, 2, tr.w, tr.h, {
        fill: Gfx.shade(col, -0.18), fill2: Gfx.shade(col, -0.45), sink: Gfx.shade(col, -0.72),
        depth: 6, r: 18, edge: Gfx.rgba(Gfx.shade(col, 0.45), 0.6), edgeW: 2
      });
      var mw = tr.w - 22, mh = tr.h * 0.38;
      var my = top ? 2 + tr.h - mh - 10 : 2 + 10;
      k.fillStyle = 'rgba(0,0,0,.28)';
      Gfx.rr(k, 2 + 11, my, mw, mh, 10); k.fill();
      for (var i = 0; i < pile; i++) {
        k.fillStyle = i % 2 ? '#efe1bf' : '#fbf3e0';
        var py = top ? my + mh - 6 - i * 3 : my + 4 + i * 3;
        k.fillRect(2 + 22 + (i % 3) * 3, py, mw - 22 - (i % 3) * 3, 3);
      }
      var iy0 = 2 + (top ? tr.h * 0.27 : tr.h * 0.7);
      Gfx.textNow(k, BOXES[tr.key].label.toUpperCase(), 2 + 52, iy0 - 7, {
        font: 'arcade', size: 11, color: '#ffffff', align: 'left', maxW: tr.w - 62, shadow: 'rgba(0,0,0,.4)', shadowY: 2
      });
      Gfx.textNow(k, BOXES[tr.key].hint, 2 + 52, iy0 + 10, {
        size: 12, weight: 600, color: 'rgba(255,255,255,.78)', align: 'left', maxW: tr.w - 62
      });
    });
    c.drawImage(b.cv, x - 2, y - 2, b.w, b.h);

    if (aim > 0.02) {
      /* aimed at: brighter, with a thicker edge */
      c.fillStyle = Gfx.rgba('#ffffff', 0.1 * aim);
      Gfx.rr(c, x, y, tr.w, tr.h, 18); c.fill();
      c.lineWidth = 2 + aim * 3;
      c.strokeStyle = Gfx.rgba(Gfx.shade(col, 0.55), 0.5 + aim * 0.5);
      c.stroke();
    }

    var iy = top ? y + tr.h * 0.27 : y + tr.h * 0.7;
    var bounce = aim > 0.05 ? Math.sin(t / 90) * 3 * aim : 0;
    Gfx.drawSprite(c, BOXES[tr.key].sprite, x + 30, iy + bounce, 30, 30);

    if (tr.flash > 0) {
      c.globalAlpha = tr.flash * 0.55;
      c.fillStyle = tr.flashColor;
      Gfx.rr(c, x, y, tr.w, tr.h, 18); c.fill();
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
    if (aimCol) Gfx.glow(c, 0, 0, w * 0.75, aimCol, 0.4 * cd.aim);
    /* the shadow rises away from the card as it is lifted */
    c.fillStyle = 'rgba(0,0,0,' + (0.32 - lift * 0.08).toFixed(3) + ')';
    Gfx.rr(c, -w / 2 + lift * 6, -h / 2 + 7 + lift * 12, w, h, 16); c.fill();

    if (showBack) {
      var back = Gfx.bake('cardback|' + w + '|' + h, w, h, function (k) {
        Gfx.panel(k, 0, 0, w, h, { fill: '#2a3d6e', fill2: '#16224a', depth: 0, r: 16, edge: 'rgba(255,255,255,.25)', edgeW: 3 });
        var q = Math.min(w, h) * 0.18, cx = w / 2, cy = h / 2;
        k.fillStyle = Gfx.C.now; k.fillRect(cx - q - 3, cy - q - 3, q, q);
        k.fillStyle = Gfx.C.later; k.fillRect(cx + 3, cy - q - 3, q, q);
        k.fillStyle = Gfx.C.give; k.fillRect(cx - q - 3, cy + 3, q, q);
        k.fillStyle = Gfx.C.drop; k.fillRect(cx + 3, cy + 3, q, q);
      });
      c.drawImage(back.cv, -w / 2, -h / 2, w, h);
      c.restore();
      return;
    }

    /* The face is baked once per card - paper, the place strip, the
       pips, the words - and stamped down as one image every frame after.
       Only the coloured edge you aim with is drawn live on top. */
    var place = PLACE[cd.data && cd.data.theme] || 'TASK';
    var face = Gfx.bake('card|' + cd.text + '|' + w + '|' + h, w, h, function (k) {
      Gfx.panel(k, 0, 0, w, h, { fill: Gfx.C.paper, fill2: Gfx.C.paper2, depth: 0, r: 16, lip: false,
                                 edge: 'rgba(120,90,40,.35)', edgeW: 2 });
      k.save();
      Gfx.rr(k, 0, 0, w, h, 16); k.clip();
      k.fillStyle = 'rgba(60,40,20,.08)';
      k.fillRect(0, 0, w, 26);
      k.restore();
      Gfx.textNow(k, place, w / 2, 14, { font: 'arcade', size: 8, color: 'rgba(90,64,30,.6)' });
      /* four pips, the four corners, like a playing card's suit */
      var cols = [Gfx.C.now, Gfx.C.later, Gfx.C.give, Gfx.C.drop];
      k.globalAlpha = 0.55;
      for (var i = 0; i < 4; i++) {
        k.fillStyle = cols[i];
        k.fillRect(12 + (i % 2) * 7, 8 + (i > 1 ? 7 : 0), 5, 5);
        k.fillRect(w - 24 + (i % 2) * 7, 8 + (i > 1 ? 7 : 0), 5, 5);
      }
      k.globalAlpha = 1;
      var f = Gfx.fit(k, cd.text, w - 36, h - 50, { size: Math.round(Gfx.clamp(w * 0.075, 17, 24)), weight: 700, maxLines: 4, lead: 1.18 });
      var lh = f.size * 1.18, ty = h / 2 + 12 - (f.lines.length - 1) * lh / 2;
      for (i = 0; i < f.lines.length; i++) {
        Gfx.textNow(k, f.lines[i], w / 2, ty + i * lh, { size: f.size, weight: 700, color: '#2a1e10' });
      }
    });
    c.drawImage(face.cv, -w / 2, -h / 2, w, h);
    if (aimCol) {
      c.lineWidth = 3 + cd.aim * 3;
      c.strokeStyle = Gfx.rgba(aimCol, 0.5 + cd.aim * 0.5);
      Gfx.rr(c, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, 16); c.stroke();
    }
    if (cd.stamp) {
      /* the wrong-way stamp */
      c.save();
      c.rotate(-0.25);
      c.globalAlpha *= 0.85;
      c.strokeStyle = '#d23a30'; c.lineWidth = 5;
      Gfx.rr(c, -46, -24, 92, 48, 8); c.stroke();
      Gfx.text(c, 'NOPE', 0, 2, { font: 'arcade', size: 16, color: '#d23a30' });
      c.restore();
    }
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
    var cols = ['#c9d4ec', '#c9d4ec', '#ffe48a', '#ffd04a', '#ffb43a', '#ff8a3a', '#ff6a3a', '#ff4a5a', '#ff7ad9'];
    var col = cols[Math.min(mult, 8)];
    var size = 18 + Math.min(mult, 8) * 2.2;
    c.save();
    c.translate(x + (hud.comboShake > 0 ? (Math.random() - 0.5) * 10 * hud.comboShake : 0), y);
    var p = hud.comboPunch.x * (mult >= 8 ? 1 + 0.06 * Math.sin(t / 90) : 1);
    c.scale(p, p);
    if (mult >= 3) Gfx.glow(c, 0, 0, 44 + mult * 4, col, 0.25 + mult * 0.03);
    Gfx.text(c, 'x' + mult, 0, 0, { font: 'arcade', size: size, color: col, stroke: '#1a0e06', strokeW: 6, maxW: L.chan + 20 });
    Gfx.text(c, 'COMBO', 0, size * 0.85, { font: 'arcade', size: 8, color: Gfx.rgba(col, 0.85), stroke: '#000', strokeW: 3 });
    c.restore();
  }

  function drawHud(c) {
    var y = L.hudY, h = L.hudH;
    /* a band behind the HUD so it reads over any world */
    var g = c.createLinearGradient(0, 0, 0, y + h + 18);
    g.addColorStop(0, 'rgba(4,6,14,.75)'); g.addColorStop(1, 'rgba(4,6,14,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, y + h + 18);
    hudButtons.draw(c);

    var cxClock = W - L.pad - 26, cyClock = y + h / 2;
    if (mode === 'battle') {
      drawHpBars(c, y, h, cxClock);
    } else {
      /* score */
      var sx = W / 2 + 4;
      Gfx.text(c, hud.label, sx, y + 12, { font: 'arcade', size: 8, color: 'rgba(205,216,236,.75)', maxW: W - 150 });
      c.save();
      c.translate(sx, y + 36);
      c.scale(hud.punch.x, hud.punch.x);
      Gfx.text(c, Math.round(hud.shown).toLocaleString(), 0, 0, {
        font: 'arcade', size: 22, color: '#ffffff', stroke: '#0a0e1a', strokeW: 6, maxW: W - 150
      });
      c.restore();
    }
    drawClock(c, cxClock, cyClock);
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
    c.save();
    c.translate(x, y);
    var p = hud.clockPunch.x;
    c.scale(p, p);
    c.fillStyle = 'rgba(6,10,24,.85)';
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.12)';
    c.beginPath(); c.arc(0, 0, r - 3, 0, Math.PI * 2); c.stroke();
    var col = hot ? (Math.sin(t / 120) > 0 ? '#ff5a4a' : '#ff9a8a') : rush ? '#ff8a3a' : hud.calm ? '#7dff9a' : '#7ab8ff';
    c.strokeStyle = col; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); c.stroke();
    Gfx.text(c, label, 0, 1, { font: 'arcade', size: size, color: hot ? col : '#fff', maxW: r * 1.6 });
    c.restore();
    if (mode === 'battle' && hud.streak > 1) {
      Gfx.text(c, 'x' + Math.min(hud.streak, 8), x, y + r + 12, { font: 'arcade', size: 9, color: '#ffd04a', stroke: '#000', strokeW: 3 });
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
    Gfx.text(c, name, flip ? x + w : x, y - 12, { font: 'arcade', size: 8, color: '#e6eefc', align: flip ? 'right' : 'left', maxW: w });
    c.fillStyle = 'rgba(0,0,0,.55)';
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
      c.translate(p.x, p.y - rise);
      c.scale(s, s);
      Gfx.text(c, p.text, 0, 0, { font: 'arcade', size: p.size, color: p.color, stroke: '#0a0e1a', strokeW: Math.max(4, p.size * 0.3) });
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
      Gfx.text(c, b.text, 0, 0, { font: 'arcade', size: b.size, color: b.color, stroke: '#0a0e1a', strokeW: Math.max(6, b.size * 0.28), maxW: W - 30, shadow: 'rgba(0,0,0,.5)', shadowY: 5 });
      if (b.sub) Gfx.text(c, b.sub, 0, b.size * 0.95, { font: 'arcade', size: Math.max(10, b.size * 0.36), color: b.subColor, stroke: '#0a0e1a', strokeW: 5, maxW: W - 40 });
      c.restore();
    }
  }

  /** The tutorial: a speech panel above the card, the tray it belongs
      in glowing, and a hand that shows the drag. */
  function drawCoach(c) {
    var tr = trays[coach.box];
    var bw = Math.min(W - 24, 360), bx = (W - bw) / 2;
    var by = L.top + L.trayH + 10;
    var cardTop = card.y.x - L.cardH / 2 - 10;
    var bh = Math.max(58, Math.min(86, cardTop - by));
    var a = Math.min(1, coach.t / 250);
    c.save();
    c.globalAlpha = a;
    Gfx.panel(c, bx, by, bw, bh, { fill: 'rgba(10,16,34,.94)', depth: 4, r: 14, edge: Gfx.rgba(cornerColor(coach.box), 0.9), edgeW: 2 });
    Gfx.text(c, coach.n + '/4  DRAG IT TO ' + BOXES[coach.box].label.toUpperCase(), bx + bw / 2, by + 17, {
      font: 'arcade', size: 9, color: cornerColor(coach.box) === Gfx.C.drop ? '#d8dee8' : Gfx.shade(cornerColor(coach.box), 0.25), maxW: bw - 20
    });
    var lines = Gfx.wrap(c, coach.why, bw - 28, { size: 14, weight: 600 }).slice(0, 2);
    for (var i = 0; i < lines.length; i++) {
      Gfx.text(c, lines[i], bx + bw / 2, by + 39 + i * 18, { size: 14, weight: 600, color: '#e6eefc' });
    }
    /* the hand */
    if (card.state !== 'held') {
      var cyc = (coach.t % 1500) / 1500;
      var mv = Ease.inOutCubic(Math.min(1, Math.max(0, (cyc - 0.15) / 0.6)));
      var hx = Gfx.lerp(card.x.x, tr.mx, mv), hy = Gfx.lerp(card.y.x + 10, tr.my, mv);
      var ha = cyc < 0.1 ? cyc / 0.1 : cyc > 0.85 ? 1 - (cyc - 0.85) / 0.15 : 1;
      c.globalAlpha = a * ha;
      c.fillStyle = 'rgba(255,255,255,.28)';
      c.beginPath(); c.arc(hx, hy, 22 + (cyc < 0.15 ? (0.15 - cyc) * 60 : 0), 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(hx, hy, 11, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#0a0e1a'; c.lineWidth = 3; c.stroke();
    }
    c.restore();
  }

  function drawPause(c) {
    c.save();
    c.globalAlpha = pauseA;
    c.fillStyle = 'rgba(4,6,14,.78)';
    c.fillRect(0, 0, W, H);
    var by = pauseButtons.list.length ? pauseButtons.list[0].y : H * 0.36;
    Gfx.text(c, 'PAUSED', W / 2, by - 56, { font: 'arcade', size: 30, color: '#ffffff', stroke: '#000', strokeW: 6 });
    Gfx.text(c, 'The clock has stopped.', W / 2, by - 22, { size: 15, weight: 600, color: Gfx.C.txDim });
    pauseButtons.draw(c);
    var last = pauseButtons.list[pauseButtons.list.length - 1];
    if (last) Gfx.text(c, 'BACKGROUND', W / 2, last.y - 12, { font: 'arcade', size: 8, color: Gfx.C.txDim });
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
    setClock: setClock,
    setProgress: setProgress,
    setRush: setRush,
    foeMove: foeMove,
    end: end,
    /* for tests and for the debug overlay */
    state: function () {
      return { phase: phase, paused: paused, card: card ? { text: card.text, box: card.data.box, state: card.state } : null,
               score: hud.score, streak: hud.streak, secs: hud.secs, trays: L ? {
                 now: trays.now && { x: trays.now.cx, y: trays.now.cy }, later: trays.later && { x: trays.later.cx, y: trays.later.cy },
                 give: trays.give && { x: trays.give.cx, y: trays.give.cy }, drop: trays.drop && { x: trays.drop.cx, y: trays.drop.cy }
               } : null, rest: L ? L.rest : null };
    }
  };
})();
