/* ============================================================
   results.js  -  the end of a round, as a moment
   ------------------------------------------------------------
   The old end screen was a list: a title, a letter, six rows of
   numbers and three buttons, all there at once. Everything you had
   just earned arrived in the same frame, which is the same as none
   of it arriving.

   Now it is a sequence, each beat landing on its own:
     the title comes down
     the grade STAMPS - the screen shakes, dust flies
     the stars pop in one at a time, each a note higher
     the numbers count up, row by row
     the coins you earned fly up and into your wallet, and the
       counter in the corner ticks up as each one lands
     and only then do the buttons arrive

   Tap anywhere during it and the whole thing jumps to the end, so
   somebody who has seen it fifty times never has to sit through it.

   WHAT YOU MISSED is a button now, not a list underneath that you
   scroll past to find Play again. It opens the review (js/panels.js),
   which is still the part of the game that actually teaches.

   AND THEN WHAT ELSE IT DID. A mission the round finished, a badge it
   earned, the Daily Challenge it opened - each gets a card of its own
   that stamps in over the screen, one at a time, before the buttons.
   Tap to move on to the next one.
   ============================================================ */

(function () {

  var t = 0, R = null, buttons = new Stage.Buttons(), skipped = false;
  var cel = null;               // the "mission complete" cards, in turn
  var st = {};                  // everything animated, 0..1
  var flying = [];              // coins on their way to the wallet
  var L = {};
  var GRADE_COL = { S: '#ff7ad9', A: '#f2c14e', B: '#9fd4ff', C: '#d49a62' };

  function S() { return Stage.size(); }

  function layout(W, H) {
    var sf = Stage.safe;
    var avail = H - sf.t - sf.b;
    var k = Gfx.clamp(avail / 800, 0.74, 1.12);
    L.k = k;
    /* Below the coin pill, which the coins fly up into - not level with
       it, where a long title ran straight into it. */
    L.titleY = sf.t + 82 * k;
    L.subY = L.titleY + 8 * k;
    L.gr = Math.round(Gfx.clamp(W * 0.16, 44, 70) * k);
    L.gradeY = L.subY + 28 * k + L.gr;
    L.starY = L.gradeY + L.gr + 30 * k;
    L.unlockY = L.starY + (R && R.mode === 'level' ? 26 : 0) * k;
    L.panelX = 20; L.panelW = W - 40;
    L.rowH = Math.round(29 * k);
    L.panelY = L.unlockY + 22 * k;
    L.panelH = L.rowH * ((R ? R.stats.length : 5) + 1) + 18;
    L.btnY = L.panelY + L.panelH + 16 * k;
    /* On a tall phone everything above ended two thirds of the way down,
       leaving a slab of nothing under the buttons. The whole column is
       moved down into the middle of the room it has instead. */
    var bottom = L.btnY + (56 + 48 + 44) * k + 20;
    var spare = H - sf.b - 24 - bottom;
    if (spare > 0) {
      var dy = Math.round(spare * 0.45);
      L.titleY += dy; L.subY += dy; L.gradeY += dy; L.starY += dy;
      L.unlockY += dy; L.panelY += dy; L.btnY += dy;
    }
    buildButtons(W, H);
  }

  function buildButtons(W, H) {
    buttons.clear();
    if (!R) return;
    var bw = Math.min(W - 40, 380), bx = (W - bw) / 2, y = L.btnY;
    var big = Math.round(56 * L.k), mid = Math.round(48 * L.k);
    if (R.hasNext) {
      buttons.add({ x: bx, y: y, w: bw, h: big, label: R.nextLabel, style: 'gold', size: 17, pulse: true, id: 'next', onTap: next });
      y += big + 10;
    }
    var hw = (bw - 10) / 2;
    buttons.add({ x: bx, y: y, w: hw, h: mid, label: R.againLabel, style: R.hasNext ? 'blue' : 'gold', size: 12, pulse: !R.hasNext, id: 'again', onTap: again });
    buttons.add({ x: bx + hw + 10, y: y, w: hw, h: mid, label: R.homeLabel, style: 'dark', size: 12, id: 'home', onTap: home });
    y += mid + 10;
    if (R.misses && R.misses.length) {
      buttons.add({ x: bx, y: y, w: bw, h: Math.round(44 * L.k), style: 'red', id: 'review', size: 11,
                    label: (R.misses.length === 1 ? 'THE ONE YOU MISSED' : 'WHAT YOU MISSED (' + R.misses.length + ')'),
                    onTap: function () { Panels.open('review', R); } });
    }
    /* Arrive last, and only once the sequence has played. */
    buttons.list.forEach(function (b) { b.appear = skipped || st.buttons ? 1 : 0; });
  }

  function next() {
    if (R.mode === 'battle') Stage.go('vs', { foe: R.foeN + 1 }, 'cards');
    else Stage.go('round', { level: R.levelN + 1 }, 'iris');
  }
  function again() {
    if (R.mode === 'battle') Stage.go('vs', { foe: R.foeN }, 'cards');
    else if (R.mode === 'daily') Stage.go('round', { daily: true }, 'iris');
    else Stage.go('round', { level: R.levelN }, 'iris');
  }
  function home() {
    if (R.mode === 'daily') Stage.go('home', {}, 'cards');
    else if (R.mode === 'battle') Stage.go('bosses', { at: R.foeN }, 'cards');
    else Stage.go('map', { at: R.passed && R.hasNext ? R.levelN + 1 : R.levelN,
                           fresh: !!(R.unlock && R.unlock.fresh && R.hasNext) }, 'cards');
  }

  /* ---------------- the sequence ---------------- */

  function beat(ms, fn) { Tween.wait(ms, function () { if (!skipped) fn(); }, { tag: 'results', real: true }); }

  function enter(r) {
    R = r; t = 0; skipped = false; flying = [];
    st = { title: 0, grade: 0, stars: [0, 0, 0], rows: [0, 0, 0, 0, 0, 0], shown: [0, 0, 0, 0, 0], coins: 0,
           unlock: 0, best: 0, buttons: 0 };
    Wallet.hold(r.coins);
    var s = S();
    layout(s.W, s.H);

    Sfx.play(r.passed ? 'win' : 'lose');
    Tween.to(st, { title: 1 }, 420, { ease: Ease.outBack, real: true, tag: 'results' });
    beat(380, function () {
      Tween.to(st, { grade: 1 }, 360, { ease: Ease.outBackBig, real: true, tag: 'results', done: stampLanded });
    });
    var at = 800;
    if (r.mode === 'level' && r.stars) {
      for (var i = 0; i < 3; i++) {
        (function (i) {
          beat(at + i * 260, function () {
            if (i < r.stars) {
              Tween.to(st.stars, (function () { var o = {}; o[i] = 1; return o; })(), 300, { ease: Ease.outBackBig, real: true, tag: 'results' });
              Sfx.play('star', i);
              Haptics.good();
              var sx = S().W / 2 + (i - 1) * 54 * L.k;
              Particles.emit({ x: sx, y: L.starY, n: 12, shape: 'star', colors: [Gfx.C.gold, '#fff6c4', '#fff'], speed: [80, 260], life: [300, 700], size: [3, 6], gravity: 180, layer: 'top' });
            } else {
              Tween.to(st.stars, (function () { var o = {}; o[i] = 0.5; return o; })(), 200, { real: true, tag: 'results' });
            }
          });
        })(i);
      }
      at += 3 * 260;
    }
    if (r.newBest) beat(at, function () { Tween.to(st, { best: 1 }, 380, { ease: Ease.outBackBig, real: true, tag: 'results' }); Sfx.play('unlock'); });
    beat(at, function () {
      Tween.to(st, { unlock: 1 }, 360, { ease: Ease.outCubic, real: true, tag: 'results' });
      if (r.unlock && r.unlock.fresh) { Sfx.play('unlock'); Haptics.win(); }
    });
    at += 200;
    r.stats.forEach(function (row, i) {
      beat(at + i * 120, function () {
        Tween.to(st.rows, (function () { var o = {}; o[i] = 1; return o; })(), 280, { ease: Ease.outCubic, real: true, tag: 'results' });
        Sfx.play('tick');
        if (row.count) {
          Tween.to(st.shown, (function () { var o = {}; o[i] = 1; return o; })(), 700, { ease: Ease.outCubic, real: true, tag: 'results' });
        } else st.shown[i] = 1;
      });
    });
    at += r.stats.length * 120 + 100;
    beat(at, function () {
      var cr = {}; cr[r.stats.length] = 1;
      Tween.to(st.rows, cr, 280, { ease: Ease.outCubic, real: true, tag: 'results' });
      Tween.to(st, { coins: 1 }, 800, { ease: Ease.outCubic, real: true, tag: 'results', done: throwCoins });
    });
    /* the extras, one card each, then the buttons */
    var extras = [];
    (r.missionsDone || []).forEach(function (m) { extras.push({ head: 'MISSION', text: m.text, sub: '+' + m.reward + ' coins', icon: m.icon || 'target', col: Gfx.C.gold }); });
    (r.badgesNew || []).forEach(function (b) { extras.push({ head: 'BADGE', text: b.name, sub: '', icon: badgeIcon(b.id), col: '#ff7ad9' }); });
    if (r.dailyOpened) extras.push({ head: 'NEW', text: 'Daily Challenge', sub: '', icon: 'cal', col: '#9fd4ff' });
    cel = extras.length ? { list: extras, i: -1, t: 0, a: 0 } : null;
    if (cel) Tween.wait(at + 1050, nextCel, { tag: 'cel', real: true });
    else beat(at + 1050, showButtons);
    if (r.passed) beat(500, confetti);
  }

  function badgeIcon(id) {
    for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) return BADGES[i].icon;
    return 'star';
  }

  /** The next "mission complete" card, or the buttons after the last. */
  function nextCel() {
    if (!cel) return;
    cel.i++;
    cel.t = 0;
    if (cel.i >= cel.list.length) { cel = null; showButtons(); return; }
    var e = cel.list[cel.i];
    Sfx.play(e.head === 'BADGE EARNED' ? 'unlock' : 'mission');
    Haptics.win();
    var s = S();
    Particles.emit({ x: s.W / 2, y: s.H * 0.47, n: 26, shape: 'star', colors: [e.col, '#ffffff', Gfx.C.gold], speed: [140, 420], life: [500, 1000], size: [3, 7], gravity: 240, layer: 'top' });
    Tween.killTag('cel');
    Tween.wait(1700, nextCel, { tag: 'cel', real: true });
  }

  function stampLanded() {
    if (skipped) return;
    Sfx.play('stamp');
    Stage.shake(R.passed ? 11 : 6, 320);
    Haptics.heavy();
    var s = S(), col = GRADE_COL[R.grade] || '#fff';
    Particles.emit({ x: s.W / 2, y: L.gradeY + L.gr * 0.6, n: 26, colors: ['#cdd8ec', '#8a9ac0', '#ffffff'], shape: 'circle',
                     angle: [Math.PI * 0.95, Math.PI * 2.05], speed: [80, 260], life: [400, 800], size: [3, 8], gravity: 90, drag: 2.5, layer: 'top' });
    if (R.passed) Particles.emit({ x: s.W / 2, y: L.gradeY, n: 1, shape: 'ring', colors: [col], speed: 0, life: 520, size: L.gr * 0.4, shrink: false, layer: 'top' });
  }

  function throwCoins() {
    if (skipped || !R.coins) return;
    var s = S();
    var from = { x: s.W / 2 + L.panelW * 0.25, y: L.panelY + 9 + L.rowH * 5.5 };
    var n = Gfx.clamp(Math.round(R.coins / 12), 5, 22);
    var per = R.coins / n, given = 0;
    for (var i = 0; i < n; i++) {
      var share = i === n - 1 ? R.coins - given : Math.round(per);
      given += share;
      flying.push({ x0: from.x + (Math.random() - 0.5) * 60, y0: from.y + (Math.random() - 0.5) * 16,
                    t: -i * 45, ms: 520 + Math.random() * 160, share: share,
                    bend: (Math.random() - 0.5) * 160 });
    }
  }

  function showButtons() {
    if (st.buttons) return;
    st.buttons = 1;
    Stage.stagger(buttons.list, 80, 0);
    Sfx.play('pop');
  }

  /** Tapped during the sequence: everything lands at once. */
  function skip() {
    if (skipped || st.buttons) return;
    skipped = true;
    Tween.killTag('results');
    st.title = 1; st.grade = 1; st.unlock = 1; st.coins = 1; st.best = R.newBest ? 1 : 0;
    for (var i = 0; i < 3; i++) st.stars[i] = i < R.stars ? 1 : 0.5;
    for (i = 0; i < 6; i++) st.rows[i] = 1;
    for (i = 0; i < 5; i++) st.shown[i] = 1;
    flying = [];
    Wallet.clear();
    /* The extras still get their moment - skipping is for the parts
       you have seen fifty times, and these are new every time. */
    if (cel && cel.i < 0) { Tween.killTag('cel'); nextCel(); return; }
    if (cel) return;
    st.buttons = 1;
    buttons.list.forEach(function (b) { b.appear = 1; });
  }

  function confetti() {
    var s = S();
    var cols = [Gfx.C.now, Gfx.C.later, Gfx.C.give, Gfx.C.gold, '#7dff9a', '#ffffff'];
    for (var i = 0; i < 2; i++) {
      Particles.emit({ x: s.W * (0.25 + i * 0.5), y: -10, n: 30, colors: cols, angle: [Math.PI * 0.25, Math.PI * 0.75],
                       speed: [160, 420], life: [1600, 2600], size: [4, 8], gravity: 360, drag: 0.8, spin: 10, wobble: 1.2, layer: 'top' });
    }
  }

  /* ---------------- per frame ---------------- */

  function update(dt, dtReal) {
    t += dtReal;
    if (cel && cel.i >= 0) cel.t += dtReal;
    Wallet.update(dtReal);
    buttons.update(dtReal);
    var target = TopBar.coin();
    for (var i = flying.length - 1; i >= 0; i--) {
      var f = flying[i];
      f.t += dtReal;
      if (f.t >= f.ms) {
        flying.splice(i, 1);
        Wallet.release(f.share);
        Sfx.play('coin');
        Particles.emit({ x: target.x, y: target.y, n: 4, shape: 'spark', colors: [Gfx.C.gold, '#fff'], speed: [80, 200], life: [150, 300], size: [2, 3], layer: 'top' });
      }
    }
  }

  function draw(c, W, H) {
    World.draw(c, W, H, { camX: Math.sin(t / 4200) * 10, dim: 0.5 });
    if (!R) return;
    var k = L.k;
    TopBar.draw(c, W, { stars: R.mode === 'level' });

    /* title */
    var ta = Math.min(1, st.title);
    c.save();
    c.globalAlpha = ta;
    c.translate(W / 2, L.titleY - (1 - ta) * 40);
    Gfx.text(c, R.title.toUpperCase(), 0, 0, { font: 'arcade', size: Math.round(18 * k), color: R.passed ? '#fff4dd' : '#ffc4b8', shadow: 'rgba(46,24,6,.75)', shadowY: 4, maxW: W - 120 });
    c.restore();

    drawGrade(c, W);
    if (R.mode === 'level') drawStars(c, W);
    if (st.best > 0) {
      c.save();
      c.translate(W / 2 + L.gr + 30, L.gradeY - L.gr * 0.7);
      c.rotate(0.22);
      c.scale(st.best, st.best);
      Gfx.panel(c, -48, -14, 96, 28, { fill: '#e0524a', fill2: '#b03a33', depth: 3, r: 8 });
      Gfx.text(c, 'NEW BEST', 0, 1, { font: 'arcade', size: 9, color: '#fff' });
      c.restore();
    }

    drawStats(c, W);
    for (var i = 0; i < flying.length; i++) drawFlyingCoin(c, flying[i]);
    buttons.draw(c);
    if (cel && cel.i >= 0) drawCel(c, W, Stage.size().H);
  }

  function drawCel(c, W, H) {
    var e = cel.list[cel.i];
    var k = cel.t < 320 ? Ease.outBackBig(cel.t / 320) : 1;
    var out = cel.t > 1450 ? Math.max(0, 1 - (cel.t - 1450) / 250) : 1;
    c.save();
    c.globalAlpha = Math.min(1, cel.t / 160) * out;
    c.fillStyle = 'rgba(30,16,4,.7)'; c.fillRect(0, 0, W, H);
    var w = Math.min(W - 40, 330), h = 188, cy = H * 0.47;
    c.translate(W / 2, cy);
    c.rotate((1 - Math.min(1, k)) * -0.2);
    c.scale(k, k);
    Gfx.glow(c, 0, 0, w * 0.8, e.col, 0.3 + 0.1 * Math.sin(t / 200));
    /* a certificate pinned up: cream card, a coloured band, a pin */
    Desk.note(c, -w / 2, -h / 2, w, h, { band: e.col === Gfx.C.gold ? '#e8a33a' : e.col, pinColor: '#c2412f' });
    Gfx.text(c, e.head, 0, -h / 2 + 26, { font: 'arcade', size: 9.5, color: e.col === Gfx.C.gold ? '#a8641a' : e.col === '#9fd4ff' ? '#2f6fb0' : '#b0306a', maxW: w - 30 });
    Gfx.drawSprite(c, e.icon, 0, -10 + Math.sin(t / 260) * 3, 44, 44);
    Gfx.text(c, e.text, 0, 36, { size: 20, weight: 700, color: '#1f2a44', maxW: w - 30 });
    Gfx.text(c, e.sub, 0, 60, { size: 14, weight: 700, color: e.sub.charAt(0) === '+' ? '#a8641a' : '#5a4630', maxW: w - 30 });
    c.restore();
  }

  function drawGrade(c, W) {
    var g = st.grade;
    if (g <= 0) return;
    var col = GRADE_COL[R.grade] || '#fff';
    var r = L.gr;
    c.save();
    c.translate(W / 2, L.gradeY);
    var s = 0.3 + 0.7 * g + (1 - Math.min(1, g)) * 2.2;
    c.rotate(-0.6 + 0.52 * Math.min(1, g));
    c.scale(s, s);
    c.globalAlpha = Math.min(1, g * 1.5) * (R.passed ? 1 : 0.7);
    if (R.passed) Gfx.glow(c, 0, 0, r * 2.2, col, 0.35 + 0.1 * Math.sin(t / 300));
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.beginPath(); c.arc(4, 8, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = Gfx.shade(col, -0.45);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.arc(0, 0, r * 0.84, 0, Math.PI * 2); c.fill();
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.arc(0, 0, r * 0.72, 0, Math.PI * 2); c.stroke();
    Gfx.text(c, R.grade, 0, 3, { font: 'arcade', size: r * 0.95, color: Gfx.shade(col, -0.65) });
    c.restore();
  }

  function drawStars(c, W) {
    for (var i = 0; i < 3; i++) {
      var v = st.stars[i];
      var x = W / 2 + (i - 1) * 54 * L.k, y = L.starY - (i === 1 ? 6 : 0);
      var size = 20 * L.k;
      c.fillStyle = 'rgba(0,0,0,.45)';
      Gfx.star(c, x, y, size, size * 0.46, 5, 0); c.fill();
      if (v > 0.6) {
        c.save(); c.translate(x, y); c.scale(Math.min(1.3, v), Math.min(1.3, v));
        Gfx.glow(c, 0, 0, size * 2, Gfx.C.gold, 0.35);
        c.fillStyle = Gfx.C.gold;
        Gfx.star(c, 0, 0, size, size * 0.46, 5, 0); c.fill();
        c.lineWidth = 2; c.strokeStyle = '#8a5a16'; c.stroke();
        c.restore();
      } else {
        c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.2)';
        Gfx.star(c, x, y, size, size * 0.46, 5, 0); c.stroke();
      }
    }
  }

  function drawStats(c, W) {
    var x = L.panelX, y = L.panelY, w = L.panelW, h = L.panelH;
    var any = st.rows[0] > 0;
    if (!any) return;
    c.save();
    c.globalAlpha = Math.min(1, st.rows[0] * 1.5);
    /* the numbers, on a report card */
    Gfx.indexCard(c, x, y, w, h, { top: 9 + L.rowH, gap: L.rowH, margin: 12 });
    Gfx.tape(c, x + w * 0.5, y + 1, 90, 0.04, 'rgba(160,210,240,.85)');
    c.restore();
    var rows = R.stats.slice();
    rows.push({ k: 'Coins earned', v: R.coins, count: true, prefix: '+', coin: true });
    for (var i = 0; i < rows.length; i++) {
      var a = st.rows[i];
      if (a <= 0) continue;
      var ry = y + 9 + L.rowH * i + L.rowH / 2;
      var row = rows[i];
      c.save();
      c.globalAlpha = Math.min(1, a);
      c.translate((1 - Math.min(1, a)) * 30, 0);
      Gfx.text(c, row.k, x + 22, ry, { size: Math.round(15 * L.k), weight: 700, color: '#5a4630', align: 'left' });
      var val;
      if (row.coin) {
        val = '+' + Math.round(R.coins * Math.min(1, st.coins)).toLocaleString();
        Gfx.drawSprite(c, 'coin', x + w - 18 - Gfx.measure(c, val, { font: 'arcade', size: 12 }) - 16, ry, 18, 18);
      } else if (row.count) {
        val = Math.round(row.v * Math.min(1, st.shown[i])).toLocaleString() + (row.suffix || '');
      } else val = String(row.v);
      Gfx.text(c, val, x + w - 18, ry + 1, { font: 'arcade', size: 11, color: row.coin ? '#a8641a' : Desk.INK, align: 'right', maxW: w * 0.55 });
      c.restore();
    }
  }

  function drawFlyingCoin(c, f) {
    if (f.t < 0) return;
    var p = Math.min(1, f.t / f.ms), e = Ease.inOutCubic(p);
    var to = TopBar.coin();
    var mx = (f.x0 + to.x) / 2 + f.bend, my = Math.min(f.y0, to.y) - 60;
    var u = 1 - e;
    var x = u * u * f.x0 + 2 * u * e * mx + e * e * to.x;
    var y = u * u * f.y0 + 2 * u * e * my + e * e * to.y;
    var spin = Math.abs(Math.cos(f.t / 70));
    Gfx.glow(c, x, y, 18, Gfx.C.gold, 0.3);
    Gfx.drawSprite(c, 'coin', x, y, 22 * (0.3 + 0.7 * spin), 22);
  }

  Stage.define('results', {
    enter: enter,
    layout: layout,
    update: update,
    draw: draw,
    pointer: function (type, x, y) {
      /* A card up: a tap moves on to the next one, and nothing under it. */
      if (cel && cel.i >= 0) { if (type === 'down' && cel.t > 250) nextCel(); return; }
      if (buttons.pointer(type, x, y)) return;
      if (type === 'down' && !st.buttons) skip();
    },
    key: function (e) {
      if (e.key === 'Enter' || e.key === ' ') { if (!st.buttons) skip(); else (R.hasNext ? next : again)(); }
    },
    back: function () {
      if (cel && cel.i >= 0) { nextCel(); return true; }
      if (!st.buttons) { skip(); return true; }
      home(); return true;
    },
    exit: function () { Tween.killTag('results'); Tween.killTag('cel'); cel = null; Wallet.clear(); }
  });
})();
