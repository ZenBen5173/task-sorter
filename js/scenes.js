/* ============================================================
   scenes.js  -  every place in the game that is not a round
   ------------------------------------------------------------
     title    the logo assembling, and TAP TO START
     home     your character standing in the world, and the doors
     map      the trail: you walk to a level, it tells you about
              itself, and you go in
     bosses   the four bosses on a stage, one at a time
     vs       the fighting-game face-off before a boss
     gear     your character up close, with the shop under them

   NO TAB BAR. The old game had one along the bottom - Home, Boss,
   Play, Gear, Me - and a tab bar is the single most "this is an app"
   thing a screen can have. Games are places you move between: home
   is the hub, every door off it leads somewhere, and back takes you
   home.

   TAP TO START is a classic for a reason beyond nostalgia: a browser
   will not make a sound until the page has been touched, and a title
   screen that asks for a tap is the one place where that tap is the
   natural thing to do. The music starts on it.
   ============================================================ */

/* ---------------- the coin counter ----------------
   The number on the coin pill. It rolls toward your real balance
   rather than jumping, and can be told to HOLD some back while the
   coins you just earned are still flying up to it - so the count goes
   up as each one lands, not the moment the round ends. */
var Wallet = (function () {
  var shown = null, pending = 0, punch = Spring.make(1);
  return {
    update: function (dt) {
      var target = Progress.coins() - pending;
      if (shown === null) shown = target;
      var before = Math.round(shown);
      shown += (target - shown) * Math.min(1, dt / 140);
      if (Math.abs(target - shown) < 0.5) shown = target;
      if (Math.round(shown) > before) Spring.kick(punch, 1.5);
      Spring.step(punch, 1, dt, 420, 16);
    },
    shown: function () { return Math.round(shown === null ? Progress.coins() : shown); },
    hold: function (n) { pending += n; },
    release: function (n) { pending = Math.max(0, pending - n); },
    clear: function () { pending = 0; },
    punch: function () { return punch.x; }
  };
})();

/* ---------------- the pills in the top corner ---------------- */
var TopBar = (function () {
  var coinPos = { x: 0, y: 0 }, starPos = { x: 0, y: 0 };
  function pill(c, x, y, w, icon, text, k) {
    c.save();
    c.translate(x + w / 2, y + 19);
    c.scale(k, k);
    Gfx.panel(c, -w / 2, -19, w, 38, { fill: 'rgba(16,24,48,.92)', sink: 'rgba(0,0,0,.5)', depth: 3, r: 19, edge: 'rgba(255,255,255,.14)' });
    if (icon === 'star') {
      c.fillStyle = Gfx.C.gold;
      Gfx.star(c, -w / 2 + 20, 0, 10, 4.5, 5, 0); c.fill();
    } else Gfx.drawSprite(c, icon, -w / 2 + 20, 0, 22, 22);
    Gfx.text(c, text, -w / 2 + 38, 1, { font: 'arcade', size: 12, color: '#fff', align: 'left', maxW: w - 46 });
    c.restore();
  }
  return {
    draw: function (c, W, o) {
      o = o || {};
      var y = Stage.safe.t + 12, pad = Math.max(12, Stage.safe.r);
      var coins = Wallet.shown().toLocaleString();
      var cw = Math.max(84, 52 + coins.length * 12);
      var cx = W - pad - cw;
      pill(c, cx, y, cw, 'coin', coins, Wallet.punch());
      coinPos.x = cx + 20; coinPos.y = y + 19;
      if (o.stars !== false) {
        var st = String(Progress.stars());
        var sw = 52 + st.length * 12 + 8;
        var sx = cx - 10 - sw;
        pill(c, sx, y, sw, 'star', st, 1);
        starPos.x = sx + 20; starPos.y = y + 19;
      }
    },
    coin: function () { return coinPos; },
    star: function () { return starPos; }
  };
})();

var Scenes = (function () {

  function S() { return Stage.size(); }
  function safe() { return Stage.safe; }

  /** A round icon button in the top-left: back, or the settings cog. */
  function cornerButton(buttons, kind, onTap) {
    return buttons.add({
      x: Math.max(12, safe().l), y: safe().t + 9, w: 44, h: 44, style: 'icon', id: kind,
      draw: function (c, b) {
        c.save();
        c.translate(b.w / 2, b.h / 2);
        c.fillStyle = '#e6eefc'; c.strokeStyle = '#e6eefc';
        if (kind === 'back') {
          c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
          c.beginPath(); c.moveTo(4, -9); c.lineTo(-5, 0); c.lineTo(4, 9); c.stroke();
        } else {
          /* a cog: a ring with eight teeth */
          for (var i = 0; i < 8; i++) {
            c.save(); c.rotate(i * Math.PI / 4); c.fillRect(-3, -13, 6, 6); c.restore();
          }
          c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#1c2742';
          c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      },
      onTap: onTap
    });
  }

  /** The tall button with a picture on top and two lines of words, for
      the row of doors on the home screen. */
  function doorDraw(icon) {
    return function (c, b, st) {
      var bounce = b.pressed ? 0 : Math.sin(b.t / 400) * 1.2;
      Gfx.drawSprite(c, icon, b.w / 2, b.h * 0.34 + bounce, Math.min(30, b.h * 0.4));
      Gfx.text(c, b.label, b.w / 2, b.h * 0.67, { font: 'arcade', size: 10, color: st.text, maxW: b.w - 12 });
      if (b.sub) Gfx.text(c, b.sub, b.w / 2, b.h * 0.85, { size: 11, weight: 600, color: Gfx.rgba(st.text === '#ffffff' ? '#ffffff' : st.text, 0.72), maxW: b.w - 10 });
    };
  }

  function drawWorld(c, W, H, t, o) {
    o = o || {};
    World.draw(c, W, H, { camX: Math.sin(t / 4200) * 14 + (o.camX || 0), camY: o.camY || 0, dim: o.dim || 0 });
  }

  /* ======================= TITLE ======================= */

  var title = (function () {
    var t = 0, started = false, tiles = [], plate = { s: 0 }, card = { y: -1, s: 1 }, words = { a: 0, y: 30 }, cue = 0;
    var COLS = ['now', 'later', 'give', 'drop'];

    function go() {
      if (started || t < 350) return;
      started = true;
      Sfx.play('release');
      Haptics.tap();
      Stage.go('home', {}, 'cards');
    }

    return {
      music: 'title',
      enter: function () {
        t = 0; started = false;
        tiles = COLS.map(function (k, i) {
          return { k: k, p: 0, i: i, landed: false };
        });
        tiles.forEach(function (tl, i) {
          Tween.to(tl, { p: 1 }, 520, { ease: Ease.outBack, delay: 150 + i * 90, done: function () {
            Sfx.play('pop');
            tl.landed = true;
          } });
        });
        plate.s = 0; card.y = -1; card.s = 1; words.a = 0; words.y = 30; cue = 0;
        Tween.to(plate, { s: 1 }, 420, { ease: Ease.outBack, delay: 520 });
        Tween.to(card, { y: 0 }, 620, { ease: Ease.outBounce, delay: 860, done: function () {
          Sfx.play('stamp'); Stage.shake(5, 200);
          var S0 = S();
          Particles.emit({ x: S0.W / 2, y: S0.H * 0.33, n: 22, shape: 'star', colors: [Gfx.C.gold, '#ffffff', '#fff6c4'], speed: [120, 360], life: [400, 900], size: [3, 7], gravity: 200 });
        } });
        Tween.to(words, { a: 1, y: 0 }, 520, { ease: Ease.outCubic, delay: 1250 });
        Tween.wait(1700, function () { cue = 1; });
      },
      update: function (dt) { t += dt; },
      draw: function (c, W, H) {
        drawWorld(c, W, H, t, { dim: 0.12 });
        var sz = Math.min(W * 0.52, 210), cx = W / 2, cy = Math.max(H * 0.33, safe().t + sz * 0.7);
        var cell = sz * 0.34, gap = sz * 0.06;
        /* the dark plate behind the tiles, as on the app's own icon */
        if (plate.s > 0) {
          c.save(); c.translate(cx, cy); c.scale(plate.s, plate.s);
          Gfx.panel(c, -sz / 2, -sz / 2, sz, sz, { fill: '#121a2e', fill2: '#0a0e1a', depth: 8, r: sz * 0.2, edge: 'rgba(255,255,255,.12)' });
          c.restore();
        }
        var spots = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
        tiles.forEach(function (tl, i) {
          var p = tl.p;
          if (p <= 0) return;
          var tx = cx + spots[i][0] * (cell / 2 + gap / 2), ty = cy + spots[i][1] * (cell / 2 + gap / 2);
          var fx = spots[i][0] < 0 ? -cell : W + cell, fy = spots[i][1] < 0 ? -cell : H + cell;
          var x = Gfx.lerp(fx, tx, p), y = Gfx.lerp(fy, ty, p);
          c.save(); c.translate(x, y); c.rotate((1 - p) * 2.4 * (i % 2 ? 1 : -1));
          Gfx.panel(c, -cell / 2, -cell / 2, cell, cell, { fill: Gfx.C[tl.k], fill2: Gfx.shade(Gfx.C[tl.k], -0.25), depth: 4, r: cell * 0.18 });
          c.restore();
        });
        if (card.y > -1) {
          var cw = sz * 0.62, ch = sz * 0.36;
          var yy = cy + card.y * (cy + sz);
          c.save(); c.translate(cx, yy); c.rotate(card.y * 0.6);
          Gfx.panel(c, -cw / 2, -ch / 2, cw, ch, { fill: Gfx.C.paper, fill2: Gfx.C.paper2, depth: 5, sink: 'rgba(0,0,0,.4)', r: ch * 0.22, lip: false });
          c.fillStyle = 'rgba(60,40,20,.25)';
          c.fillRect(-cw * 0.32, -ch * 0.1, cw * 0.64, ch * 0.1);
          c.fillRect(-cw * 0.32, ch * 0.12, cw * 0.44, ch * 0.1);
          c.restore();
        }
        if (words.a > 0) {
          var ty2 = cy + sz * 0.72 + words.y;
          c.save(); c.globalAlpha = words.a;
          var fs = Math.min(30, W * 0.075);
          var tw = Gfx.measure(c, 'TASK', { font: 'arcade', size: fs }), sw = Gfx.measure(c, 'SORTER', { font: 'arcade', size: fs });
          var left = cx - (tw + sw + fs * 0.4) / 2;
          Gfx.text(c, 'TASK', left, ty2, { font: 'arcade', size: fs, color: '#ffffff', align: 'left', stroke: '#0a0e1a', strokeW: 7, shadow: 'rgba(0,0,0,.5)', shadowY: 5 });
          Gfx.text(c, 'SORTER', left + tw + fs * 0.4, ty2, { font: 'arcade', size: fs, color: Gfx.C.gold, align: 'left', stroke: '#0a0e1a', strokeW: 7, shadow: 'rgba(0,0,0,.5)', shadowY: 5 });
          Gfx.text(c, 'Sort the pile before it buries you.', cx, ty2 + fs * 1.4, { size: 16, weight: 600, color: Gfx.C.tx });
          c.restore();
        }
        if (cue) {
          var a = 0.45 + 0.55 * Math.abs(Math.sin(t / 520));
          Gfx.text(c, 'TAP TO START', cx, H - safe().b - Math.max(70, H * 0.12), { font: 'arcade', size: 14, color: '#ffffff', alpha: a, stroke: '#0a0e1a', strokeW: 5 });
        }
      },
      pointer: function (type) { if (type === 'down') go(); },
      key: function (e) { if (e.key === 'Enter' || e.key === ' ') go(); },
      back: function () { return false; }
    };
  })();

  /* ======================= HOME ======================= */

  var home = (function () {
    var t = 0, buttons = new Stage.Buttons(), hero = null, roam = [], groundY = 0, rankY = 0;

    function goPlay() { Stage.go('map', {}, 'cards'); }

    function build() {
      var s = S(), W = s.W, H = s.H, sf = safe();
      buttons.clear();
      cornerButton(buttons, 'settings', function () { Panels.open('settings'); });
      var bw = Math.min(W - 40, 360), bx = (W - bw) / 2;
      groundY = Math.round(Gfx.clamp(H * 0.5, sf.t + 250, H - sf.b - 290));
      rankY = groundY + 46;
      var playY = rankY + 44;
      var next = LEVELS[Math.min(Progress.unlocked(), LEVELS.length) - 1];
      var allDone = Object.keys(Progress.all().best).length >= LEVELS.length;
      buttons.add({ x: bx, y: playY, w: bw, h: 76, label: 'PLAY', style: 'gold', size: 24, pulse: true, id: 'play',
                    sub: allDone ? 'EVERY LEVEL BEATEN' : 'LEVEL ' + next.n + ' · ' + next.name.toUpperCase(),
                    onTap: goPlay });
      var gap = 10, dw = (bw - gap * 2) / 3, dy = playY + 76 + 16, dh = 82;
      var beaten = Progress.rivalsBeaten();
      var pets = SHOP.pet.items.filter(function (it) { return it.cost !== 0 && Progress.owns(it.id); }).length;
      buttons.add({ x: bx, y: dy, w: dw, h: dh, label: 'BOSS', style: 'wood', id: 'boss',
                    sub: beaten >= OPPONENTS.length ? 'All beaten' : OPPONENTS[beaten].name, draw: doorDraw('battle'),
                    onTap: function () { Stage.go('bosses', {}, 'cards'); } });
      buttons.add({ x: bx + dw + gap, y: dy, w: dw, h: dh, label: 'GEAR', style: 'wood', id: 'gear',
                    sub: pets + '/' + (SHOP.pet.items.length - 1) + ' pets', draw: doorDraw('shield'),
                    onTap: function () { Stage.go('gear', {}, 'fade'); } });
      buttons.add({ x: bx + (dw + gap) * 2, y: dy, w: dw, h: dh, label: 'GUIDE', style: 'wood', id: 'guide',
                    sub: 'How to play', draw: doorDraw('book'),
                    onTap: function () { Panels.open('guide'); } });
      Stage.stagger(buttons.list.slice(1), 70, 200);

      World.setFloor(groundY + 8);
      var k = Gfx.clamp(Math.min(W / 24 * 0.21, (groundY - sf.t - 90) / 32 * 0.8), 2.6, 4.4);
      if (!hero) hero = new Actors.Hero({ k: k });
      hero.k = k; hero.x = W / 2; hero.y = groundY; hero.name = Hero.name();
      hero.refresh();

      /* Every pet you own that you are NOT walking with potters about on
         the ground, so the collection lives on the home screen as
         creatures rather than as a row of icons. */
      var equippedPet = Actors.equipped('pet').id;
      var owned = SHOP.pet.items.filter(function (it) { return it.cost !== 0 && Progress.owns(it.id) && it.id !== equippedPet; });
      var keep = {};
      roam.forEach(function (p) { keep[p.key] = p; });
      roam = owned.slice(0, 9).map(function (it, i) {
        var p = keep[it.sprite] || new Actors.Pet(it.sprite, { x: 30 + Math.random() * (W - 60), mode: 'wander', speed: 22 + Math.random() * 30 });
        p.minX = 24; p.maxX = W - 24; p.box = 34 + (i % 3) * 3;
        p.y = groundY + 6 + (i % 4) * 7;
        return p;
      });
    }

    return {
      music: 'menu',
      enter: function () { t = 0; build(); Panels.coachOnce('home'); },
      layout: function () { build(); },
      refresh: function () { build(); },
      update: function (dt, dtReal) {
        t += dt;
        Wallet.update(dt);
        buttons.update(dtReal);
        if (hero) hero.update(dt);
        roam.forEach(function (p) { p.update(dt); });
      },
      draw: function (c, W, H) {
        drawWorld(c, W, H, t, {});
        World.drawGround(c, groundY, Math.sin(t / 4200) * 14);
        var sf = safe();
        /* The wordmark sits beside the settings cog, left of the pills -
           centred, it ran into them on a narrow phone. */
        var lx = Math.max(12, sf.l) + 56;
        Gfx.text(c, 'TASK', lx, sf.t + 32, { font: 'arcade', size: 10, color: '#fff', align: 'left', stroke: '#0a0e1a', strokeW: 4 });
        Gfx.text(c, 'SORTER', lx, sf.t + 46, { font: 'arcade', size: 10, color: Gfx.C.gold, align: 'left', stroke: '#0a0e1a', strokeW: 4 });
        TopBar.draw(c, W, { stars: true });

        var behind = roam.filter(function (p) { return p.y <= groundY + 8; });
        var front = roam.filter(function (p) { return p.y > groundY + 8; });
        behind.forEach(function (p) { p.draw(c); });
        if (hero) hero.draw(c, { nameTag: true });
        front.forEach(function (p) { p.draw(c); });

        /* rank, and how far to the next one */
        var stars = Progress.stars(), rank = rankFor(stars);
        var rw = Math.min(W - 60, 300), rx = (W - rw) / 2;
        Gfx.text(c, rank.name.toUpperCase(), rx, rankY + 2, { font: 'arcade', size: 10, color: Gfx.C.gold, align: 'left', stroke: '#0a0e1a', strokeW: 4 });
        Gfx.text(c, stars + ' / ' + STAR_MAX + ' ★', rx + rw, rankY + 2, { size: 14, weight: 700, color: '#fff', align: 'right' });
        c.fillStyle = 'rgba(0,0,0,.5)'; Gfx.rr(c, rx, rankY + 13, rw, 10, 5); c.fill();
        c.fillStyle = Gfx.C.gold; Gfx.rr(c, rx + 1, rankY + 14, Math.max(0, (rw - 2) * stars / STAR_MAX), 8, 4); c.fill();
        buttons.draw(c);
      },
      pointer: function (type, x, y) {
        if (buttons.pointer(type, x, y)) return;
        if (type === 'down' && hero) {
          var hc = hero.centre();
          if (Math.abs(x - hc.x) < hero.k * 14 && Math.abs(y - hc.y) < hero.k * 18) {
            hero.cheer(1);
            Sfx.play('right', 1 + ((Math.random() * 6) | 0));
            Particles.emit({ x: hc.x, y: hc.y - hero.k * 14, n: 6, shape: 'star', colors: [Gfx.C.gold, '#fff'], speed: [60, 160], life: [400, 800], size: [3, 6], gravity: -40 });
            return;
          }
          roam.forEach(function (p) {
            if (Math.abs(x - p.x) < p.box * 0.6 && Math.abs(y - (p.y - p.box * 0.5)) < p.box * 0.7) {
              p.cheer(0.8);
              Sfx.play('pop');
              Particles.emit({ x: p.x, y: p.y - p.box, n: 1, shape: 'text', text: '♥', colors: ['#ff7aa8'], speed: [20, 40], angle: [-1.8, -1.3], life: 800, size: 16, gravity: -30 });
            }
          });
        }
      },
      key: function (e) { if (e.key === 'Enter' || e.key === ' ') goPlay(); },
      back: function () { return false; }
    };
  })();

  /* ======================= MAP ======================= */

  var map = (function () {
    var t = 0, buttons = new Stage.Buttons(), cardButtons = new Stage.Buttons();
    var hero = null, pts = [], nodes = [], at = 0, walkTo = -1, walkPos = 0, stepT = 0;
    var card = { a: 0, n: 0, open: false };
    var R = 30, shakeNode = { i: -1, a: 0 };
    /* The trail from the old level map, in percent of the map area. */
    var PATH = [[26, 87], [45, 89], [64, 80], [70, 68], [76, 56], [42, 56], [28, 47], [15, 39], [52, 36], [66, 24]];

    function area() {
      var s = S(), sf = safe();
      var top = sf.t + 76, bottom = s.H - sf.b - 24;
      return { x: 0, y: top, w: s.W, h: bottom - top };
    }
    function toScreen(p, a) { return { x: a.x + a.w * p[0] / 100, y: a.y + a.h * p[1] / 100 }; }

    function bez(p0, p1, p2, p3, tt) {
      var u = 1 - tt;
      return {
        x: u * u * u * p0.x + 3 * u * u * tt * p1.x + 3 * u * tt * tt * p2.x + tt * tt * tt * p3.x,
        y: u * u * u * p0.y + 3 * u * u * tt * p1.y + 3 * u * tt * tt * p2.y + tt * tt * tt * p3.y
      };
    }

    function build() {
      var a = area();
      var P = PATH.map(function (p) { return toScreen(p, a); });
      pts = []; nodes = [];
      var len = 0, prev = null;
      for (var seg = 0; seg < 3; seg++) {
        var p0 = P[seg * 3], p1 = P[seg * 3 + 1], p2 = P[seg * 3 + 2], p3 = P[seg * 3 + 3];
        for (var i = 0; i <= 40; i++) {
          if (seg > 0 && i === 0) continue;
          var q = bez(p0, p1, p2, p3, i / 40);
          if (prev) len += Math.sqrt((q.x - prev.x) * (q.x - prev.x) + (q.y - prev.y) * (q.y - prev.y));
          q.d = len;
          pts.push(q);
          prev = q;
          if (i === 0 || i === 40) nodes.push({ x: q.x, y: q.y, d: q.d, idx: pts.length - 1 });
        }
      }
      R = Math.round(Gfx.clamp(a.w * 0.085, 26, 38));
      var s = S();
      buttons.clear();
      cornerButton(buttons, 'back', function () { Stage.go('home', {}, 'cards'); });
      buttons.add({ x: s.W - Math.max(12, safe().r) - 44, y: safe().t + 60 + 4, w: 44, h: 44, style: 'icon', id: 'help',
        draw: function (c, b) { Gfx.text(c, '?', b.w / 2, b.h / 2 + 1, { font: 'arcade', size: 18, color: '#e6eefc' }); },
        onTap: function () { Panels.open('guide'); } });
      if (!hero) hero = new Actors.Hero({ k: 2.1 });
      hero.refresh();
      hero.name = '';
      placeHero();
      buildCard();
    }

    function placeHero() {
      var n = nodes[at] || nodes[0];
      walkPos = n.d;
      var p = pointAt(walkPos);
      hero.x = p.x; hero.y = p.y - R * 0.85;
    }

    function pointAt(d) {
      for (var i = 1; i < pts.length; i++) {
        if (pts[i].d >= d) {
          var a = pts[i - 1], b = pts[i];
          var k = (d - a.d) / Math.max(0.001, b.d - a.d);
          return { x: Gfx.lerp(a.x, b.x, k), y: Gfx.lerp(a.y, b.y, k) };
        }
      }
      return pts[pts.length - 1];
    }

    function buildCard() {
      var s = S();
      cardButtons.clear();
      var cw = Math.min(s.W - 24, 380), cx = (s.W - cw) / 2;
      var ch = 236, cy = s.H - safe().b - ch - 12;
      card.rect = { x: cx, y: cy, w: cw, h: ch };
      cardButtons.add({ x: cx + 18, y: cy + ch - 78, w: cw - 36, h: 62, label: 'PLAY', style: 'gold', size: 20, pulse: true, id: 'go',
        onTap: function () {
          var n = nodes[card.n];
          Stage.go('round', { level: card.n + 1 }, { kind: 'iris', x: n.x, y: n.y });
        } });
      cardButtons.add({ x: cx + cw - 46, y: cy + 10, w: 36, h: 36, style: 'icon', id: 'close',
        draw: function (c, b) {
          c.strokeStyle = '#e6eefc'; c.lineWidth = 3; c.lineCap = 'round';
          c.beginPath(); c.moveTo(12, 12); c.lineTo(b.w - 12, b.h - 12); c.moveTo(b.w - 12, 12); c.lineTo(12, b.h - 12); c.stroke();
        },
        onTap: function () { closeCard(); } });
    }

    function openCard(i) {
      card.n = i; card.open = true;
      Tween.kill(card);
      Tween.to(card, { a: 1 }, 320, { ease: Ease.outBack, real: true });
      Sfx.play('open');
    }
    function closeCard() {
      if (!card.open) return;
      card.open = false;
      Tween.kill(card);
      Tween.to(card, { a: 0 }, 200, { ease: Ease.inQuad, real: true });
      Sfx.play('close');
    }

    function tapNode(i) {
      if (!Progress.isOpen(i + 1)) {
        shakeNode = { i: i, a: 1 };
        Sfx.play('nope'); Haptics.bad();
        Particles.emit({ x: nodes[i].x, y: nodes[i].y - R - 10, n: 1, shape: 'text', text: 'BEAT LEVEL ' + i + ' FIRST', colors: ['#ffffff'], speed: 30, angle: [-1.6, -1.5], life: 1100, size: 9, gravity: -20 });
        return;
      }
      if (i === at && walkTo < 0) { openCard(i); return; }
      closeCard();
      walkTo = i;
      hero.walk = 1;
    }

    return {
      music: 'menu',
      enter: function (p) {
        t = 0; card.a = 0; card.open = false; walkTo = -1;
        var last = p && p.at ? p.at - 1 : Math.min(Progress.unlocked(), LEVELS.length) - 1;
        at = Gfx.clamp(last, 0, LEVELS.length - 1);
        build();
        Panels.coachOnce('levels');
      },
      layout: function () { build(); },
      update: function (dt, dtReal) {
        t += dt;
        Wallet.update(dt);
        buttons.update(dtReal); cardButtons.update(dtReal);
        shakeNode.a = Math.max(0, shakeNode.a - dt / 400);
        if (walkTo >= 0) {
          var target = nodes[walkTo].d;
          var dir = target > walkPos ? 1 : -1;
          var speed = 190 * dt / 1000;
          var before = pointAt(walkPos);
          walkPos += dir * Math.min(speed, Math.abs(target - walkPos));
          var p = pointAt(walkPos);
          hero.face = p.x >= before.x ? 1 : -1;
          /* Standing ON a node lifts the hero up onto it; between nodes
             they walk on the path itself. */
          var nearest = 1e9;
          nodes.forEach(function (n) { nearest = Math.min(nearest, Math.abs(n.d - walkPos)); });
          var lift = Gfx.clamp(1 - nearest / (R * 1.6), 0, 1);
          hero.x = p.x; hero.y = p.y - R * 0.85 * lift;
          stepT += dt;
          if (stepT > 260) { stepT = 0; Sfx.play('step'); }
          if (Math.abs(target - walkPos) < 0.5) {
            at = walkTo; walkTo = -1; hero.walk = 0;
            hero.cheer(0.4);
            openCard(at);
          }
        }
        if (hero) hero.update(dt);
      },
      draw: function (c, W, H) {
        drawWorld(c, W, H, t, { dim: 0.18 });
        var sf = safe();
        Gfx.text(c, (PACK.name || 'DAY TO DAY').toUpperCase(), W / 2, sf.t + 32, { font: 'arcade', size: 14, color: '#fff', stroke: '#0a0e1a', strokeW: 5 });
        TopBar.draw(c, W, { stars: false });

        /* the trail: a wide sandy band, a darker edge, a dashed centre */
        var furthest = nodes[Math.min(Progress.unlocked(), nodes.length) - 1];
        c.save();
        c.lineCap = 'round'; c.lineJoin = 'round';
        var trace = function () { c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }); };
        trace(); c.lineWidth = 34; c.strokeStyle = 'rgba(0,0,0,.35)'; c.stroke();
        trace(); c.lineWidth = 28; c.strokeStyle = '#8a6a3a'; c.stroke();
        trace(); c.lineWidth = 22; c.strokeStyle = '#c9a26a'; c.stroke();
        c.setLineDash([2, 14]); c.lineDashOffset = -t / 60;
        c.beginPath();
        pts.forEach(function (p, i) { if (furthest && p.d > furthest.d) return; if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
        c.lineWidth = 5; c.strokeStyle = 'rgba(255,240,200,.85)'; c.stroke();
        c.setLineDash([]);
        c.restore();

        /* Painted back to front - the higher up the screen, the further
           away - so the hero walks behind the levels above them and in
           front of the ones below. */
        var things = nodes.map(function (n, i) { return { y: n.y, node: n, i: i }; });
        if (hero) things.push({ y: hero.y + R * 0.85 + 1, hero: true });
        things.sort(function (a, b) { return a.y - b.y; });
        things.forEach(function (th) {
          if (th.hero) hero.draw(c, { canFlip: true });
          else drawNode(c, th.node, th.i);
        });
        drawFlags(c);
        buttons.draw(c);
        if (card.a > 0.01) drawCard(c);
      },
      pointer: function (type, x, y) {
        if (card.a > 0.5) {
          if (cardButtons.pointer(type, x, y)) return;
          if (type === 'down' && !inRect(x, y, card.rect)) { closeCard(); }
          return;
        }
        if (buttons.pointer(type, x, y)) return;
        if (type !== 'down') return;
        for (var i = 0; i < nodes.length; i++) {
          if (Math.sqrt((x - nodes[i].x) * (x - nodes[i].x) + (y - nodes[i].y) * (y - nodes[i].y)) < R + 14) { tapNode(i); return; }
        }
      },
      key: function (e) {
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowUp') tapNode(Math.min(LEVELS.length - 1, at + 1));
        else if (k === 'ArrowLeft' || k === 'ArrowDown') tapNode(Math.max(0, at - 1));
        else if (k === 'Enter' || k === ' ') { if (card.open) cardButtons.list[0].onTap(); else openCard(at); }
      },
      back: function () {
        if (card.open) { closeCard(); return true; }
        Stage.go('home', {}, 'cards'); return true;
      }
    };

    function inRect(x, y, r) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

    function drawNode(c, n, i) {
      var lv = LEVELS[i];
      var open = Progress.isOpen(lv.n), best = Progress.best(lv.n);
      var next = open && !best;
      var sx = shakeNode.i === i ? Math.sin(t / 25) * 6 * shakeNode.a : 0;
      c.save();
      c.translate(n.x + sx, n.y);
      if (next) {
        var pr = R + 8 + Math.sin(t / 300) * 4;
        c.strokeStyle = Gfx.rgba(Gfx.C.gold, 0.6); c.lineWidth = 3;
        c.beginPath(); c.arc(0, 0, pr, 0, Math.PI * 2); c.stroke();
        Gfx.glow(c, 0, 0, R * 2.2, Gfx.C.gold, 0.25);
      }
      var fill = !open ? '#3a4258' : best ? '#f2c14e' : '#5b8fd8';
      c.fillStyle = 'rgba(0,0,0,.4)';
      c.beginPath(); c.ellipse(0, R * 0.32, R * 1.02, R * 0.85, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = Gfx.shade(fill, -0.35);
      c.beginPath(); c.arc(0, 5, R, 0, Math.PI * 2); c.fill();
      c.fillStyle = fill;
      c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
      c.lineWidth = 3; c.strokeStyle = Gfx.rgba('#ffffff', open ? 0.5 : 0.15);
      c.beginPath(); c.arc(0, 0, R - 2, 0, Math.PI * 2); c.stroke();
      if (!open) {
        /* a padlock */
        c.strokeStyle = '#9aa3b8'; c.lineWidth = 4;
        c.beginPath(); c.arc(0, -4, 7, Math.PI, 0); c.stroke();
        c.fillStyle = '#9aa3b8'; Gfx.rr(c, -10, -4, 20, 15, 3); c.fill();
        c.fillStyle = '#3a4258'; c.fillRect(-1.5, 1, 3, 6);
      } else if (best) {
        Gfx.text(c, best.grade, 0, 1, { font: 'arcade', size: R * 0.75, color: '#4a2a08' });
      } else {
        Gfx.text(c, lv.n, 0, 2, { font: 'arcade', size: R * 0.72, color: '#ffffff', stroke: '#1a2f55', strokeW: 4 });
      }
      c.restore();
      if (best) {
        var got = Progress.starsFor(lv.n);
        for (var s = 0; s < 3; s++) {
          c.fillStyle = s < got ? Gfx.C.gold : 'rgba(0,0,0,.45)';
          Gfx.star(c, n.x + (s - 1) * 16, n.y + R + 12 - (s === 1 ? 4 : 0), 7, 3.2, 5, 0); c.fill();
          c.lineWidth = 1.5; c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke();
        }
      }
    }

    /** The name on a little flag above each open level. Drawn after
        everyone, and lifted over the hero's head on the level they are
        standing on, or the flag disappears behind them. */
    function drawFlags(c) {
      nodes.forEach(function (n, i) {
        var lv = LEVELS[i];
        if (!Progress.isOpen(lv.n)) return;
        var best = Progress.best(lv.n);
        var label = lv.name.toUpperCase();
        var lw = Gfx.measure(c, label, { font: 'arcade', size: 8 }) + 16;
        var ly = n.y - R - 20;
        if (hero && Math.abs(hero.x - n.x) < R * 1.2 && Math.abs(hero.y - (n.y - R * 0.85)) < R) {
          ly = hero.y - hero.k * 32 - 18;
        }
        Gfx.panel(c, n.x - lw / 2, ly - 10, lw, 20, { fill: 'rgba(10,14,30,.85)', depth: 2, r: 6, lip: false });
        Gfx.text(c, label, n.x, ly, { font: 'arcade', size: 8, color: best ? Gfx.C.gold : '#ffffff' });
      });
    }

    function drawCard(c) {
      var r = card.rect, a = card.a;
      var lv = LEVELS[card.n];
      var best = Progress.best(lv.n);
      c.save();
      c.globalAlpha = Math.min(1, a);
      c.translate(0, (1 - Math.min(1, a)) * 80);
      c.fillStyle = 'rgba(4,6,14,' + (0.45 * Math.min(1, a)).toFixed(3) + ')';
      c.fillRect(0, 0, S().W, S().H);
      Gfx.panel(c, r.x, r.y, r.w, r.h, { fill: '#1f2c50', fill2: '#141d38', depth: 7, r: 20, edge: 'rgba(255,255,255,.16)' });
      Gfx.text(c, 'LEVEL ' + lv.n, r.x + 20, r.y + 26, { font: 'arcade', size: 10, color: Gfx.C.gold, align: 'left' });
      Gfx.text(c, lv.name, r.x + 20, r.y + 54, { size: 26, weight: 700, color: '#fff', align: 'left', maxW: r.w - 80 });
      var lines = Gfx.wrap(c, lv.story, r.w - 40, { size: 15, weight: 500 }).slice(0, 2);
      lines.forEach(function (ln, i) { Gfx.text(c, ln, r.x + 20, r.y + 84 + i * 19, { size: 15, weight: 500, color: Gfx.C.tx, align: 'left' }); });
      var chips = [lv.seconds ? lv.seconds + ' SEC' : 'NO CLOCK', 'NEED ' + Math.round(lv.minAcc * 100) + '%'];
      if (best) chips.push('BEST ' + best.grade);
      var cx = r.x + 20;
      chips.forEach(function (ch, i) {
        var w = Gfx.measure(c, ch, { font: 'arcade', size: 8 }) + 18;
        Gfx.panel(c, cx, r.y + 122, w, 24, { fill: i === 2 ? '#6a4a10' : '#2b3a5c', depth: 2, r: 8, lip: false });
        Gfx.text(c, ch, cx + w / 2, r.y + 134, { font: 'arcade', size: 8, color: i === 2 ? Gfx.C.gold : '#e6eefc' });
        cx += w + 8;
      });
      if (best) {
        var got = Progress.starsFor(lv.n);
        for (var s = 0; s < 3; s++) {
          c.fillStyle = s < got ? Gfx.C.gold : 'rgba(255,255,255,.15)';
          Gfx.star(c, r.x + r.w - 76 + s * 26, r.y + 134, 10, 4.5, 5, 0); c.fill();
        }
      }
      cardButtons.draw(c);
      c.restore();
    }
  })();

  /* ======================= BOSSES ======================= */

  var bosses = (function () {
    var t = 0, buttons = new Stage.Buttons(), idx = 0, slide = { x: 0 }, foes = [], swipe = null;
    var PAGES = 5;

    function isOnline(i) { return i >= OPPONENTS.length; }

    function build() {
      var s = S(), W = s.W, H = s.H, sf = safe();
      buttons.clear();
      cornerButton(buttons, 'back', function () { Stage.go('home', {}, 'cards'); });
      var bw = Math.min(W - 60, 320);
      var fy = H - sf.b - 96;
      buttons.add({ x: (W - bw) / 2, y: fy, w: bw, h: 66, label: 'FIGHT', style: 'red', size: 20, pulse: true, id: 'fight',
        onTap: function () {
          if (isOnline(idx)) { onlineInfo(); return; }
          if (!Battle.isOpen(idx + 1)) { Sfx.play('nope'); return; }
          Stage.go('vs', { foe: idx + 1 }, 'cards');
        } });
      buttons.add({ x: 8, y: H * 0.36 - 28, w: 48, h: 56, style: 'icon', id: 'prev',
        draw: arrow(-1), onTap: function () { go(-1); } });
      buttons.add({ x: W - 56, y: H * 0.36 - 28, w: 48, h: 56, style: 'icon', id: 'next',
        draw: arrow(1), onTap: function () { go(1); } });
      foes = OPPONENTS.map(function (o) { return new Actors.Foe(o, {}); });
      refreshButton();
    }

    function arrow(dir) {
      return function (c, b) {
        c.strokeStyle = '#e6eefc'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(b.w / 2 - dir * 5, b.h / 2 - 10); c.lineTo(b.w / 2 + dir * 5, b.h / 2); c.lineTo(b.w / 2 - dir * 5, b.h / 2 + 10); c.stroke();
      };
    }

    function refreshButton() {
      var b = buttons.list[1];
      if (!b) return;
      if (isOnline(idx)) { b.label = 'COMING SOON'; b.style = 'dark'; b.pulse = false; b.size = 13; b.enabled = true; return; }
      var open = Battle.isOpen(idx + 1), beaten = idx + 1 <= Progress.rivalsBeaten();
      b.label = beaten ? 'FIGHT AGAIN' : 'FIGHT';
      b.style = open ? 'red' : 'dark'; b.pulse = open && !beaten; b.size = beaten ? 15 : 20;
      b.enabled = open;
      buttons.list[2].visible = idx > 0;
      buttons.list[3].visible = idx < PAGES - 1;
    }

    function go(d) {
      var n = Gfx.clamp(idx + d, 0, PAGES - 1);
      if (n === idx) return;
      idx = n;
      slide.x = d * S().W * 0.6;
      Tween.kill(slide);
      Tween.to(slide, { x: 0 }, 380, { ease: Ease.outBack, real: true });
      Sfx.play('swoosh');
      refreshButton();
    }

    function onlineInfo() {
      Panels.dialog({
        icon: 'globe', title: 'Online Boss',
        lines: [
          '<b>Coming soon.</b> Two real players, the same cards, the same clock - whoever sorts better wins.',
          'It needs an online server to find you an opponent and pass the moves between phones. That is the next big thing to build.',
          'Until then, the four bosses here are the fight.'
        ]
      });
    }

    return {
      music: 'menu',
      enter: function (p) {
        t = 0;
        idx = Gfx.clamp(p && p.at ? p.at - 1 : Progress.rivalsBeaten(), 0, OPPONENTS.length - 1);
        build();
        Panels.coachOnce('battle');
      },
      layout: function () { build(); },
      update: function (dt, dtReal) {
        t += dt;
        Wallet.update(dt);
        buttons.update(dtReal);
        foes.forEach(function (f) { f.update(dt); });
      },
      draw: function (c, W, H) {
        drawWorld(c, W, H, t, { dim: 0.25 });
        var sf = safe();
        Gfx.text(c, 'BOSSES', W / 2, sf.t + 32, { font: 'arcade', size: 14, color: '#fff', stroke: '#0a0e1a', strokeW: 5 });
        TopBar.draw(c, W, { stars: false });

        var cx = W / 2 + slide.x, cy = H * 0.36;
        var size = Math.min(W * 0.44, 190);
        /* spotlight and pedestal */
        c.save();
        c.globalCompositeOperation = 'lighter';
        var g = c.createLinearGradient(cx, sf.t + 50, cx, cy + size * 0.6);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(255,240,200,.16)');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(cx - 24, sf.t + 50); c.lineTo(cx + 24, sf.t + 50); c.lineTo(cx + size * 0.75, cy + size * 0.62); c.lineTo(cx - size * 0.75, cy + size * 0.62); c.closePath(); c.fill();
        c.restore();
        c.fillStyle = '#2a2140';
        c.beginPath(); c.ellipse(cx, cy + size * 0.62, size * 0.7, size * 0.16, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#3e3260';
        c.beginPath(); c.ellipse(cx, cy + size * 0.58, size * 0.66, size * 0.13, 0, 0, Math.PI * 2); c.fill();

        var nameY = cy + size * 0.95;
        if (isOnline(idx)) {
          var bob = Math.sin(t / 600) * 6;
          Gfx.drawSprite(c, 'globe', cx, cy + bob, size * 0.8, size * 0.8);
          Gfx.text(c, '?', cx, cy + bob, { font: 'arcade', size: size * 0.3, color: '#fff', stroke: '#0a0e1a', strokeW: 8 });
          Gfx.text(c, 'ONLINE BOSS', cx, nameY, { font: 'arcade', size: 18, color: '#fff', stroke: '#0a0e1a', strokeW: 5 });
          Gfx.text(c, 'Out-sort a real player, anywhere in the world.', cx, nameY + 30, { size: 15, weight: 600, color: Gfx.C.tx, maxW: W - 40 });
        } else {
          var def = OPPONENTS[idx], f = foes[idx];
          var open = Battle.isOpen(def.n), beaten = def.n <= Progress.rivalsBeaten();
          f.x = cx; f.y = cy; f.size = size;
          if (open) f.draw(c);
          else Gfx.drawSprite(c, def.sprite, cx, cy, size, size, { tint: '#05070f', tintAmt: 0.92 });
          if (!open) {
            c.fillStyle = '#c9d4ec'; c.strokeStyle = '#c9d4ec'; c.lineWidth = 6;
            c.beginPath(); c.arc(cx, cy - 8, 14, Math.PI, 0); c.stroke();
            Gfx.rr(c, cx - 20, cy - 8, 40, 30, 5); c.fill();
          }
          if (beaten) {
            c.save(); c.translate(cx, cy + size * 0.15); c.rotate(-0.22);
            c.strokeStyle = '#5cc46a'; c.lineWidth = 5; Gfx.rr(c, -86, -22, 172, 44, 8); c.stroke();
            Gfx.text(c, 'DEFEATED', 0, 2, { font: 'arcade', size: 16, color: '#5cc46a', stroke: '#0a0e1a', strokeW: 4 });
            c.restore();
          }
          Gfx.text(c, open ? def.name.toUpperCase() : '???', cx, nameY, { font: 'arcade', size: 18, color: '#fff', stroke: '#0a0e1a', strokeW: 5, maxW: W - 40 });
          Gfx.text(c, open ? def.taunt : 'Beat ' + OPPONENTS[def.n - 2].name + ' first.', cx, nameY + 30, { size: 15, weight: 600, color: Gfx.C.tx, maxW: W - 40 });
          if (open) {
            /* how fast they sort, and how often they are right */
            var bw2 = Math.min(W - 80, 280), bx2 = W / 2 - bw2 / 2 + slide.x, by2 = nameY + 58;
            [['SPEED', Gfx.clamp((3000 - def.speed) / 2200, 0.1, 1), '#ffb43a'], ['AIM', def.accuracy, '#e0524a']].forEach(function (row, i) {
              var yy = by2 + i * 26;
              Gfx.text(c, row[0], bx2, yy, { font: 'arcade', size: 8, color: Gfx.C.txDim, align: 'left' });
              c.fillStyle = 'rgba(0,0,0,.5)'; Gfx.rr(c, bx2 + 56, yy - 6, bw2 - 56, 12, 6); c.fill();
              c.fillStyle = row[2]; Gfx.rr(c, bx2 + 57, yy - 5, (bw2 - 58) * row[1], 10, 5); c.fill();
            });
          }
        }
        /* page dots */
        for (var i = 0; i < PAGES; i++) {
          c.fillStyle = i === idx ? '#ffffff' : 'rgba(255,255,255,.25)';
          c.beginPath(); c.arc(W / 2 + (i - (PAGES - 1) / 2) * 16, H - sf.b - 116, i === idx ? 5 : 4, 0, Math.PI * 2); c.fill();
        }
        buttons.draw(c);
      },
      pointer: function (type, x, y) {
        if (buttons.pointer(type, x, y)) { swipe = null; return; }
        if (type === 'down') swipe = { x: x, y: y };
        else if (type === 'up' && swipe) {
          var dx = x - swipe.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(y - swipe.y)) go(dx < 0 ? 1 : -1);
          swipe = null;
        }
      },
      key: function (e) {
        if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === 'Enter' || e.key === ' ') buttons.list[1].onTap();
      },
      back: function () { Stage.go('home', {}, 'cards'); return true; }
    };
  })();

  /* ======================= VS ======================= */

  var vs = (function () {
    var t = 0, n = 1, hero = null, foe = null, a = { l: 0, r: 0, v: 0 }, gone = false;
    function next() {
      if (gone) return;
      gone = true;
      Stage.go('round', { battle: n }, 'iris');
    }
    return {
      enter: function (p) {
        t = 0; n = p.foe || 1; gone = false;
        var s = S();
        hero = new Actors.Hero({ k: Gfx.clamp(s.W / 24 * 0.26, 3, 5), withPet: false });
        foe = new Actors.Foe(OPPONENTS[n - 1], { size: Math.min(s.W * 0.4, 170) });
        a.l = 0; a.r = 0; a.v = 0;
        Tween.to(a, { l: 1 }, 360, { ease: Ease.outCubic, delay: 80 });
        Tween.to(a, { r: 1 }, 360, { ease: Ease.outCubic, delay: 200 });
        Tween.to(a, { v: 1 }, 380, { ease: Ease.outBackBig, delay: 520, done: function () {
          Sfx.play('vs'); Stage.shake(12, 380); Stage.punch(1); Haptics.heavy();
        } });
        Tween.wait(2100, next);
      },
      update: function (dt) { t += dt; if (hero) hero.update(dt); if (foe) foe.update(dt); },
      draw: function (c, W, H) {
        c.fillStyle = '#05070f'; c.fillRect(0, 0, W, H);
        /* two halves, split on a slant */
        c.save();
        c.translate((1 - a.l) * -W, 0);
        var g1 = c.createLinearGradient(0, 0, W, H);
        g1.addColorStop(0, '#2a5aa8'); g1.addColorStop(1, '#14284e');
        c.fillStyle = g1;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(W * 0.62, 0); c.lineTo(W * 0.38, H); c.lineTo(0, H); c.closePath(); c.fill();
        hero.x = W * 0.27; hero.y = H * 0.76;
        hero.draw(c);
        Gfx.text(c, Hero.name().toUpperCase(), W * 0.27, H * 0.81, { font: 'arcade', size: 14, color: '#fff', stroke: '#0a0e1a', strokeW: 5, maxW: W * 0.45 });
        c.restore();
        c.save();
        c.translate((1 - a.r) * W, 0);
        var g2 = c.createLinearGradient(W, 0, 0, H);
        g2.addColorStop(0, '#b03a33'); g2.addColorStop(1, '#4a1210');
        c.fillStyle = g2;
        c.beginPath(); c.moveTo(W * 0.62, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(W * 0.38, H); c.closePath(); c.fill();
        /* The boss high on their side, the hero low on theirs, and the VS
           in the gap between - so the slam never lands on anybody's name. */
        foe.x = W * 0.72; foe.y = H * 0.24;
        foe.draw(c);
        var def = OPPONENTS[n - 1];
        Gfx.text(c, def.name.toUpperCase(), W * 0.72, H * 0.24 + foe.size * 0.72, { font: 'arcade', size: 14, color: '#fff', stroke: '#0a0e1a', strokeW: 5, maxW: W * 0.5 });
        Gfx.text(c, def.taunt, W * 0.72, H * 0.24 + foe.size * 0.72 + 24, { size: 13, weight: 600, color: '#ffd8d4', maxW: W * 0.5 });
        c.restore();
        if (a.v > 0) {
          c.save();
          c.translate(W / 2, H * 0.53);
          c.scale(a.v, a.v);
          Gfx.glow(c, 0, 0, 120, '#ffd76a', 0.6);
          Gfx.text(c, 'VS', 0, 0, { font: 'arcade', size: 64, color: Gfx.C.gold, stroke: '#0a0e1a', strokeW: 12, shadow: 'rgba(0,0,0,.6)', shadowY: 7 });
          c.restore();
        }
      },
      pointer: function (type) { if (type === 'down' && t > 700) next(); },
      back: function () { return true; }
    };
  })();

  /* ======================= GEAR (the stage half) =======================
     The character large, standing on a pedestal, with the shop as a
     sheet underneath (see js/panels.js). Change anything in the shop
     and the figure up here changes with a puff of smoke. */

  var gear = (function () {
    var t = 0, buttons = new Stage.Buttons(), hero = null, top = 0;
    function build() {
      var s = S(), sf = safe();
      buttons.clear();
      cornerButton(buttons, 'back', function () { Stage.go('home', {}, 'fade'); });
      var sheetTop = Panels.sheetTop('gear');
      top = sheetTop || s.H * 0.5;
      var room = top - sf.t - 70;
      var k = Gfx.clamp(room / 32 * 0.55, 2.4, 5);
      if (!hero) hero = new Actors.Hero({ k: k });
      hero.k = k; hero.x = s.W / 2; hero.y = sf.t + 70 + room * 0.78; hero.name = '';
      hero.refresh();
      if (hero.pet) { hero.pet.gap = k * 17; hero.pet.box = k * 15; }
    }
    return {
      music: 'menu',
      enter: function () { t = 0; Panels.open('gear'); build(); Panels.coachOnce('gear'); },
      exit: function () { Panels.close('gear', true); },
      layout: function () { build(); },
      /** Called by the shop whenever something is bought or put on. */
      refresh: function (kind) {
        if (!hero) return;
        hero.refresh();
        if (hero.pet) { hero.pet.gap = hero.k * 17; hero.pet.box = hero.k * 15; }
        hero.cheer(0.8);
        var c = hero.centre();
        Particles.emit({ x: c.x, y: c.y, n: 22, colors: ['#ffffff', '#cdd8ec', '#8a9ac0'], speed: [60, 220], life: [300, 700], size: [5, 11], gravity: -60, shape: 'circle', drag: 3 });
        Particles.emit({ x: c.x, y: c.y - hero.k * 10, n: 10, shape: 'star', colors: [Gfx.C.gold, '#fff'], speed: [100, 260], life: [400, 800], size: [3, 6], gravity: 120 });
        void kind;
      },
      update: function (dt, dtReal) {
        t += dt;
        Wallet.update(dt);
        buttons.update(dtReal);
        if (hero) hero.update(dt);
      },
      draw: function (c, W, H) {
        drawWorld(c, W, H, t, { dim: 0.2 });
        var sf = safe();
        Gfx.text(c, 'GEAR', W / 2, sf.t + 32, { font: 'arcade', size: 14, color: '#fff', stroke: '#0a0e1a', strokeW: 5 });
        TopBar.draw(c, W, { stars: false });
        if (hero) {
          var py = hero.y;
          c.save();
          c.globalCompositeOperation = 'lighter';
          Gfx.glow(c, W / 2, py - hero.k * 12, hero.k * 26, '#7ab8ff', 0.18);
          c.restore();
          c.fillStyle = '#1c2742';
          c.beginPath(); c.ellipse(W / 2, py + 6, hero.k * 20, hero.k * 5, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#2b3a5c';
          c.beginPath(); c.ellipse(W / 2, py + 2, hero.k * 19, hero.k * 4.2, 0, 0, Math.PI * 2); c.fill();
          hero.draw(c);
          if (Shop.hasFullSet()) {
            var pulse = 0.6 + 0.4 * Math.sin(t / 300);
            Gfx.text(c, 'FULL SET  +25% COINS', W / 2, py + 26, { font: 'arcade', size: 9, color: Gfx.C.gold, alpha: pulse, stroke: '#0a0e1a', strokeW: 4 });
          }
        }
        buttons.draw(c);
      },
      pointer: function (type, x, y) {
        if (buttons.pointer(type, x, y)) return;
        if (type === 'down' && hero) {
          var hc = hero.centre();
          if (Math.abs(x - hc.x) < hero.k * 14 && Math.abs(y - hc.y) < hero.k * 18) { hero.cheer(1); Sfx.play('pop'); }
        }
      },
      back: function () { Stage.go('home', {}, 'fade'); return true; }
    };
  })();

  Stage.define('title', title);
  Stage.define('home', home);
  Stage.define('map', map);
  Stage.define('bosses', bosses);
  Stage.define('vs', vs);
  Stage.define('gear', gear);

  return { home: home, gear: gear, map: map };
})();
