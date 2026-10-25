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
  var coinPos = { x: 0, y: 0 }, starPos = { x: 0, y: 0 }, leftEdge = 0;
  /** Coins and stars, each on a price tag: a card cut to a point on its
      left, with the hole a string would go through. */
  function pill(c, x, y, w, icon, text, k) {
    c.save();
    c.translate(x + w / 2, y + 19);
    c.scale(k, k);
    c.rotate(icon === 'star' ? -0.03 : 0.03);
    var l = -w / 2, n = 12;
    var tag = function (dx, dy) {
      c.beginPath();
      c.moveTo(l + n + dx, -17 + dy); c.lineTo(w / 2 + dx, -17 + dy); c.lineTo(w / 2 + dx, 17 + dy); c.lineTo(l + n + dx, 17 + dy); c.lineTo(l + dx, dy);
      c.closePath();
    };
    tag(2, 3); c.fillStyle = 'rgba(46,24,6,.4)'; c.fill();
    tag(0, 0); c.fillStyle = '#fffdf6'; c.fill();
    c.lineWidth = 1; c.strokeStyle = 'rgba(120,96,60,.45)'; c.stroke();
    c.fillStyle = '#b9895a'; c.beginPath(); c.arc(l + n - 2, 0, 3, 0, 6.2832); c.fill();
    if (icon === 'star') {
      c.fillStyle = Gfx.C.gold;
      Gfx.star(c, l + n + 16, 0, 9, 4, 5, 0); c.fill();
      c.lineWidth = 1.5; c.strokeStyle = '#7a4f0a'; c.stroke();
    } else Gfx.drawSprite(c, icon, l + n + 16, 0, 20, 20);
    Gfx.text(c, text, l + n + 30, 1, { font: 'arcade', size: 11, color: Desk.INK, align: 'left', maxW: w - n - 36 });
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
      leftEdge = cx;
      if (o.stars !== false) {
        var st = String(Progress.stars());
        var sw = 52 + st.length * 12 + 8;
        var sx = cx - 10 - sw;
        pill(c, sx, y, sw, 'star', st, 1);
        starPos.x = sx + 20; starPos.y = y + 19;
        leftEdge = sx;
      }
    },
    coin: function () { return coinPos; },
    star: function () { return starPos; },
    /** A screen's title, centred in the room left between the button in
        the top-left corner and the pills - not on the screen's centre,
        where a four-figure coin count ran straight into it. Call after
        draw(), which is what measures the pills. */
    title: function (c, text) {
      var lx = Math.max(12, Stage.safe.l) + 52, rx = leftEdge - 8;
      Gfx.text(c, text, (lx + rx) / 2, Stage.safe.t + 32, { font: 'arcade', size: 13, color: '#fff4dd', shadow: 'rgba(46,24,6,.75)', shadowY: 3, maxW: rx - lx });
    }
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
        c.fillStyle = Desk.INK; c.strokeStyle = Desk.INK;
        if (kind === 'back') {
          c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
          c.beginPath(); c.moveTo(4, -9); c.lineTo(-5, 0); c.lineTo(4, 9); c.stroke();
        } else if (kind === 'missions') {
          Gfx.drawSprite(c, 'target', 0, 0, 26, 26);
        } else {
          /* a cog: a ring with eight teeth */
          for (var i = 0; i < 8; i++) {
            c.save(); c.rotate(i * Math.PI / 4); c.fillRect(-3, -13, 6, 6); c.restore();
          }
          c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#f1e8d2';
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
      Gfx.drawSprite(c, icon, b.w / 2, b.h * 0.42 + bounce, Math.min(34, b.h * 0.44));
      Gfx.text(c, b.label, b.w / 2, b.h * 0.8, { font: 'arcade', size: 10, color: st.text, maxW: b.w - 12 });
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
        /* THE LOGO, put together in front of you: a cork tile, four
           coloured tabs flying in to its corners, an index card dropping
           onto them with a red tick on it, and a strip of tape to hold it. */
        var sz = Math.min(W * 0.56, 230), cx = W / 2, cy = Math.max(H * 0.32, safe().t + sz * 0.7);
        if (plate.s > 0) {
          c.save(); c.translate(cx, cy); c.scale(plate.s, plate.s); c.rotate(-0.02);
          c.fillStyle = 'rgba(46,24,6,.45)'; Gfx.rr(c, -sz / 2 + 4, -sz / 2 + 7, sz, sz, 12); c.fill();
          c.fillStyle = '#7a4f2a'; Gfx.rr(c, -sz / 2, -sz / 2, sz, sz, 12); c.fill();
          c.fillStyle = '#c4946a'; c.fillRect(-sz / 2 + 9, -sz / 2 + 9, sz - 18, sz - 18);
          c.fillStyle = 'rgba(74,42,14,.35)';
          for (var sp = 0; sp < 140; sp++) c.fillRect(-sz / 2 + 9 + (sp * 47) % (sz - 18), -sz / 2 + 9 + (sp * 29) % (sz - 18), 1.5, 1.5);
          c.restore();
        }
        var spots = [[-1, -1], [1, -1], [-1, 1], [1, 1]], rots = [-0.24, 0.21, 0.17, -0.2];
        var tabW = sz * 0.3, tabH = sz * 0.2;
        tiles.forEach(function (tl, i) {
          var p = tl.p;
          if (p <= 0) return;
          var tx = cx + spots[i][0] * sz * 0.23, ty = cy + spots[i][1] * sz * 0.2;
          var fx = spots[i][0] < 0 ? -tabW : W + tabW, fy = spots[i][1] < 0 ? -tabH : H + tabH;
          var x = Gfx.lerp(fx, tx, p), y = Gfx.lerp(fy, ty, p);
          c.save(); c.translate(x, y); c.rotate(rots[i] + (1 - p) * 2.4 * (i % 2 ? 1 : -1));
          c.fillStyle = 'rgba(46,24,6,.4)'; c.fillRect(-tabW / 2 + 2, -tabH / 2 + 4, tabW, tabH);
          c.fillStyle = Gfx.C[tl.k]; c.fillRect(-tabW / 2, -tabH / 2, tabW, tabH);
          c.fillStyle = Gfx.shade(Gfx.C[tl.k], -0.25); c.fillRect(-tabW / 2, tabH / 2 - 5, tabW, 5);
          c.restore();
        });
        if (card.y > -1) {
          var cw = sz * 0.62, ch = sz * 0.44;
          var yy = cy + card.y * (cy + sz);
          c.save(); c.translate(cx, yy); c.rotate(-0.06 + card.y * 0.6);
          Gfx.indexCard(c, -cw / 2, -ch / 2, cw, ch, { top: ch * 0.2, gap: ch * 0.19, margin: cw * 0.14 });
          if (card.y >= 0) {
            c.strokeStyle = '#c2412f'; c.lineWidth = Math.max(6, sz * 0.05); c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath(); c.moveTo(-cw * 0.16, ch * 0.02); c.quadraticCurveTo(-cw * 0.06, ch * 0.12, -cw * 0.02, ch * 0.24); c.quadraticCurveTo(cw * 0.12, -ch * 0.12, cw * 0.32, -ch * 0.28); c.stroke();
          }
          Gfx.tape(c, 0, -ch / 2 + 2, cw * 0.42, 0.06);
          c.restore();
        }
        if (words.a > 0) {
          var ty2 = cy + sz * 0.72 + words.y;
          c.save(); c.globalAlpha = words.a;
          var fs = Math.min(34, W * 0.085);
          var tw = Gfx.measure(c, 'TASK', { font: 'arcade', size: fs }), sw = Gfx.measure(c, 'SORTER', { font: 'arcade', size: fs * 0.82 });
          var gapW = fs * 0.5, left = cx - (tw + sw + gapW + 16) / 2;
          Gfx.text(c, 'TASK', left, ty2, { font: 'arcade', size: fs, color: '#fff4dd', align: 'left', shadow: 'rgba(46,24,6,.75)', shadowY: 4 });
          /* SORTER, rubber-stamped in a box */
          var bx0 = left + tw + gapW, bw0 = sw + 16, bh0 = fs * 1.45;
          c.save(); c.translate(bx0 + bw0 / 2, ty2); c.rotate(-0.08);
          c.strokeStyle = '#c2412f'; c.lineWidth = 3.5; c.strokeRect(-bw0 / 2, -bh0 / 2, bw0, bh0);
          c.lineWidth = 1.5; c.strokeRect(-bw0 / 2 + 4, -bh0 / 2 + 4, bw0 - 8, bh0 - 8);
          Gfx.text(c, 'SORTER', 0, 1, { font: 'arcade', size: fs * 0.82, color: '#c2412f' });
          c.restore();

          c.restore();
        }
        if (cue) {
          var a = 0.45 + 0.55 * Math.abs(Math.sin(t / 520));
          Gfx.text(c, 'TAP TO START', cx, H - safe().b - Math.max(70, H * 0.12), { font: 'arcade', size: 13, color: '#fff4dd', alpha: a, shadow: 'rgba(46,24,6,.75)', shadowY: 3 });
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
      /* Missions sit next to the cog: always one tap away, and a red dot
         on them when one has been finished since you last looked. */
      var mb = cornerButton(buttons, 'missions', function () { Panels.open('missions'); });
      mb.x += 52;
      mb.badge = Progress.get('missionsDone') > (Progress.get('missionsSeen') || 0) ? '!' : '';
      var bw = Math.min(W - 40, 360), bx = (W - bw) / 2;
      groundY = Math.round(Gfx.clamp(H * 0.5, sf.t + 250, H - sf.b - 302));
      /* room under the shelf for the name sticker before the ruler */
      rankY = groundY + 62;
      var playY = rankY + 40;
      buttons.add({ x: bx, y: playY, w: bw, h: 76, label: 'PLAY', style: 'gold', size: 24, pulse: true, id: 'play',

                    onTap: goPlay });
      /* FOUR DOORS. The Guide Book used to be the third; it lives in
         Settings and behind the map's "?" now, because a rulebook is
         something you open once and two new things wanted the space -
         a round to come back for every day, and your own list. */
      var gap = 8, dw = (bw - gap * 3) / 4, dy = playY + 76 + 16, dh = 82;
      var beaten = Progress.rivalsBeaten();
      buttons.add({ x: bx, y: dy, w: dw, h: dh, label: 'BOSS', style: 'wood', id: 'boss',
                    draw: doorDraw('battle'),
                    onTap: function () { Stage.go('bosses', {}, 'cards'); } });
      var dOpen = Daily.isOpen(), dDone = Daily.playedToday();
      buttons.add({ x: bx + (dw + gap), y: dy, w: dw, h: dh, label: 'DAILY', style: dOpen && !dDone ? 'gold' : 'wood', id: 'daily',

                    badge: dOpen && !dDone ? '!' : '', draw: doorDraw('cal'),
                    onTap: function () { Daily.open(); } });
      buttons.add({ x: bx + (dw + gap) * 2, y: dy, w: dw, h: dh, label: 'GEAR', style: 'wood', id: 'gear',
                    badge: canAfford() ? '!' : '', draw: doorDraw('shield'),
                    onTap: function () { Stage.go('gear', {}, 'fade'); } });
      buttons.add({ x: bx + (dw + gap) * 3, y: dy, w: dw, h: dh, label: 'MY LIST', style: 'wood', id: 'mine',
                    draw: doorDraw('list'),
                    onTap: function () { Panels.open('mine'); } });

      Stage.stagger(buttons.list.slice(2), 70, 200);

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

    /** True when the shop has something you are allowed to buy, do not
        own, and can pay for - the red dot on the GEAR door. */
    function canAfford() {
      for (var kind in SHOP) {
        var list = SHOP[kind].items;
        for (var i = 0; i < list.length; i++) {
          var it = list[i];
          if (it.cost > 0 && !Progress.owns(it.id) && Shop.isUnlocked(it) && it.cost <= Progress.coins()) return true;
        }
      }
      return false;
    }

    return {
      music: 'menu',
      enter: function () { t = 0; build(); },
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
        /* No wordmark here any more: the cog and the missions button
           took its corner, and the title screen has just said the name
           in letters a foot high. */
        TopBar.draw(c, W, { stars: true });

        var behind = roam.filter(function (p) { return p.y <= groundY + 8; });
        var front = roam.filter(function (p) { return p.y > groundY + 8; });
        behind.forEach(function (p) { p.draw(c); });
        if (hero) hero.draw(c, { nameTag: true });
        front.forEach(function (p) { p.draw(c); });

        /* rank, and how far to the next one */
        var stars = Progress.stars();
        var rw = Math.min(W - 60, 300), rx = (W - rw) / 2;
        /* your rank, measured on a wooden ruler: a tick per star, the
           stars you have coloured in with a red pencil */
        c.fillStyle = Gfx.C.gold; Gfx.star(c, rx + 8, rankY - 1, 8, 3.6, 5, 0); c.fill();
        c.lineWidth = 1.5; c.strokeStyle = '#7a4f0a'; c.stroke();
        Gfx.text(c, String(stars), rx + 22, rankY - 1, { font: 'arcade', size: 10, color: '#fff4dd', align: 'left', shadow: 'rgba(46,24,6,.75)', shadowY: 2 });
        var ry = rankY + 11;
        c.fillStyle = 'rgba(46,24,6,.4)'; c.fillRect(rx + 2, ry + 3, rw, 18);
        c.fillStyle = '#f2dca0'; c.fillRect(rx, ry, rw, 18);
        c.fillStyle = 'rgba(194,65,47,.6)'; c.fillRect(rx, ry, rw * stars / STAR_MAX, 18);
        c.fillStyle = '#5a3e14';
        for (var tk = 0; tk <= STAR_MAX; tk++) c.fillRect(rx + rw * tk / STAR_MAX - (tk === STAR_MAX ? 1 : 0), ry, 1.2, tk % 3 === 0 ? 9 : 5);
        c.strokeStyle = '#7a5a24'; c.lineWidth = 1.2; c.strokeRect(rx + 0.5, ry + 0.5, rw - 1, 17);
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
    /* A level you JUST opened is unlocked in front of you: you arrive
       standing on the one you passed, its padlock shakes, bursts, and
       then you walk over to it. Being told "Level 3 unlocked" on the end
       screen is a sentence; watching it open is the reward. */
    var fresh = null;
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
      var ch = 186, cy = s.H - safe().b - ch - 12;
      card.rect = { x: cx, y: cy, w: cw, h: ch };
      cardButtons.add({ x: cx + 18, y: cy + ch - 78, w: cw - 36, h: 62, label: 'PLAY', style: 'gold', size: 20, pulse: true, id: 'go',
        onTap: function () {
          var n = nodes[card.n];
          Stage.go('round', { level: card.n + 1 }, { kind: 'iris', x: n.x, y: n.y });
        } });
      cardButtons.add({ x: cx + cw - 46, y: cy + 10, w: 36, h: 36, style: 'icon', id: 'close',
        draw: function (c, b) {
          c.strokeStyle = Desk.INK; c.lineWidth = 3; c.lineCap = 'round';
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
        t = 0; card.a = 0; card.open = false; walkTo = -1; fresh = null;
        var last = p && p.at ? p.at - 1 : Math.min(Progress.unlocked(), LEVELS.length) - 1;
        at = Gfx.clamp(last, 0, LEVELS.length - 1);
        if (p && p.fresh && at > 0) { fresh = { i: at, t: 0, burst: false, walked: false }; at = at - 1; }
        build();
       
      },
      layout: function () { build(); },
      update: function (dt, dtReal) {
        t += dt;
        Wallet.update(dt);
        buttons.update(dtReal); cardButtons.update(dtReal);
        shakeNode.a = Math.max(0, shakeNode.a - dt / 400);
        if (fresh) {
          fresh.t += dt;
          var fn = nodes[fresh.i];
          if (!fresh.burst && fresh.t > 650 && fn) {
            fresh.burst = true;
            Sfx.play('unlock'); Haptics.win(); Stage.shake(6, 260); Stage.punch(0.5);
            Particles.emit({ x: fn.x, y: fn.y, n: 26, colors: [Gfx.C.gold, '#ffffff', '#9aa3b8'], speed: [120, 380], life: [400, 900], size: [3, 8], gravity: 400 });
            Particles.emit({ x: fn.x, y: fn.y, n: 1, shape: 'ring', colors: [Gfx.C.gold], speed: 0, life: 520, size: R * 0.5, shrink: false });
            Particles.emit({ x: fn.x, y: fn.y - R - 30, n: 1, shape: 'text', text: 'NEW!', colors: [Gfx.C.gold], speed: 20, angle: [-1.6, -1.5], life: 1400, size: 14, gravity: -10 });
          }
          if (!fresh.walked && fresh.t > 1300) { fresh.walked = true; walkTo = fresh.i; hero.walk = 1; }
          if (fresh.t > 1900) fresh = null;
        }
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
        TopBar.draw(c, W, { stars: false });


        /* the trail: red string from pin to pin, as on any pinboard that
           plans something - grey string past where you have got to */
        var furthest = nodes[Math.min(Progress.unlocked(), nodes.length) - 1];
        c.save();
        c.lineCap = 'round'; c.lineJoin = 'round';
        var trace = function (to) { c.beginPath(); pts.forEach(function (p, i) { if (to && p.d > to) return; if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }); };
        c.translate(2, 4); trace(); c.lineWidth = 5; c.strokeStyle = 'rgba(46,24,6,.35)'; c.stroke(); c.translate(-2, -4);
        trace(); c.lineWidth = 4; c.strokeStyle = '#d8ccb4'; c.stroke();
        c.setLineDash([6, 4]); trace(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(120,100,70,.6)'; c.stroke(); c.setLineDash([]);
        if (furthest) {
          trace(furthest.d); c.lineWidth = 4.5; c.strokeStyle = '#c2412f'; c.stroke();
          c.setLineDash([3, 5]); c.lineDashOffset = -t / 60; trace(furthest.d); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,200,190,.8)'; c.stroke(); c.setLineDash([]);
        }
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
      var popK = 1;
      var sx = shakeNode.i === i ? Math.sin(t / 25) * 6 * shakeNode.a : 0;
      if (fresh && fresh.i === i) {
        if (!fresh.burst) { open = false; sx = Math.sin(t / 30) * 4 * Math.min(1, fresh.t / 600); }
        else popK = 1 + 0.45 * Math.max(0, 1 - (fresh.t - 650) / 450);
      }
      var next = open && !best;
      c.save();
      c.translate(n.x + sx, n.y);
      c.scale(popK, popK);
      /* A level is a round card disc pinned to the board: blue while it
         waits, gold once passed with its grade inked on, grey and
         padlocked until it opens. The next one to play is ringed in red
         marker. */
      var fill = !open ? '#b8b0a0' : best ? '#f2c14e' : '#4a86c4';
      c.fillStyle = 'rgba(46,24,6,.42)';
      c.beginPath(); c.arc(3, 5, R, 0, Math.PI * 2); c.fill();
      c.fillStyle = fill;
      c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
      c.lineWidth = 1.2; c.strokeStyle = 'rgba(40,20,4,.35)'; c.stroke();
      c.fillStyle = Gfx.shade(fill, -0.2);
      c.beginPath(); c.arc(0, 0, R, 0.2, Math.PI - 0.2); c.arc(0, 0, R - 5, Math.PI - 0.2, 0.2, true); c.closePath(); c.fill();
      if (next) {
        c.save(); c.rotate(t / 2400);
        c.strokeStyle = '#c2412f'; c.lineWidth = 3; c.setLineDash([14, 6]);
        c.beginPath(); c.ellipse(0, 0, R + 9 + Math.sin(t / 300) * 2, R + 6, 0.2, 0, Math.PI * 2); c.stroke();
        c.setLineDash([]); c.restore();
      }
      if (!open) {
        /* a padlock */
        c.strokeStyle = '#5a5246'; c.lineWidth = 4;
        c.beginPath(); c.arc(0, -4, 7, Math.PI, 0); c.stroke();
        c.fillStyle = '#5a5246'; Gfx.rr(c, -10, -4, 20, 15, 3); c.fill();
        c.fillStyle = '#b8b0a0'; c.fillRect(-1.5, 1, 3, 6);
      } else if (best) {
        Gfx.text(c, best.grade, 0, 2, { font: 'arcade', size: R * 0.62, color: '#5a3208' });
      } else {
        Gfx.text(c, lv.n, 0, 2, { font: 'arcade', size: R * 0.62, color: '#ffffff', shadow: 'rgba(15,34,56,.6)', shadowY: 2 });
      }
      Gfx.pin(c, 0, -R + 3, open ? '#c2412f' : '#6f7784', 5);
      c.restore();
      if (best) {
        var got = Progress.starsFor(lv.n);
        for (var s = 0; s < 3; s++) {
          c.fillStyle = s < got ? Gfx.C.gold : 'rgba(46,24,6,.4)';
          Gfx.star(c, n.x + (s - 1) * 16, n.y + R + 12 - (s === 1 ? 4 : 0), 7, 3.2, 5, 0); c.fill();
          c.lineWidth = 1.5; c.strokeStyle = s < got ? '#7a4f0a' : 'rgba(46,24,6,.4)'; c.stroke();
        }
      }
    }

    function drawCard(c) {
      var r = card.rect, a = card.a;
      var lv = LEVELS[card.n];
      var best = Progress.best(lv.n);
      c.save();
      c.globalAlpha = Math.min(1, a);
      c.translate(0, (1 - Math.min(1, a)) * 80);
      c.fillStyle = 'rgba(30,16,4,' + (0.4 * Math.min(1, a)).toFixed(3) + ')';
      c.fillRect(0, 0, S().W, S().H);
      /* the level, written up on a big index card */
      Gfx.indexCard(c, r.x, r.y, r.w, r.h, { top: 30, gap: 24, margin: 14 });
      Gfx.tape(c, r.x + r.w / 2, r.y + 2, 110, -0.03);
      Gfx.text(c, lv.name, r.x + 24, r.y + 40, { font: 'arcade', size: 18, color: Desk.INK, align: 'left', maxW: r.w - 80 });
      if (best) {
        var got = Progress.starsFor(lv.n);
        for (var s = 0; s < 3; s++) {
          c.fillStyle = s < got ? Gfx.C.gold : 'rgba(120,96,60,.25)';
          Gfx.star(c, r.x + 34 + s * 28, r.y + 76, 11, 5, 5, 0); c.fill();
          if (s < got) { c.lineWidth = 1.5; c.strokeStyle = '#7a4f0a'; c.stroke(); }
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
        c.strokeStyle = Desk.INK; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
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
        TopBar.draw(c, W, { stars: false });


        var cx = W / 2 + slide.x, cy = H * 0.36;
        /* Capped by height as well, so a short phone still has room
           under the boss for their speed, aim and trick. */
        var size = Math.min(W * 0.44, 190, H * 0.24);
        /* each boss on a WANTED poster pinned to the board */
        var pw = size * 1.3, ph = size * 1.42, ptop = cy - size * 0.72;
        c.save();
        c.translate(cx, ptop + ph / 2); c.rotate(-0.025 + slide.x * 0.0004);
        c.fillStyle = 'rgba(46,24,6,.42)'; c.fillRect(-pw / 2 + 4, -ph / 2 + 7, pw, ph);
        c.fillStyle = '#f1e3c0'; c.fillRect(-pw / 2, -ph / 2, pw, ph);
        c.fillStyle = 'rgba(140,100,40,.12)';
        for (var fi = 0; fi < 50; fi++) c.fillRect(-pw / 2 + (fi * 61) % pw, -ph / 2 + (fi * 37) % ph, 3, 2);
        c.strokeStyle = 'rgba(90,60,20,.5)'; c.lineWidth = 2; c.strokeRect(-pw / 2 + 7, -ph / 2 + 7, pw - 14, ph - 14);
        Gfx.text(c, 'WANTED', 0, -ph / 2 + 24, { font: 'arcade', size: Math.min(20, size * 0.12), color: '#5a3208' });
        Gfx.pin(c, -pw / 2 + 16, -ph / 2 + 12, '#c2412f', 6); Gfx.pin(c, pw / 2 - 16, -ph / 2 + 12, '#c2412f', 6);
        c.restore();

        var nameY = cy + size * 0.95;
        if (isOnline(idx)) {
          var bob = Math.sin(t / 600) * 6;
          Gfx.drawSprite(c, 'globe', cx, cy + bob, size * 0.8, size * 0.8);
          Gfx.text(c, '?', cx, cy + bob, { font: 'arcade', size: size * 0.3, color: '#fff', stroke: '#2a1e12', strokeW: 8 });
          Gfx.text(c, 'ONLINE BOSS', cx, nameY, { font: 'arcade', size: 18, color: '#fff', stroke: '#2a1e12', strokeW: 5 });
        } else {
          var def = OPPONENTS[idx], f = foes[idx];
          var open = Battle.isOpen(def.n), beaten = def.n <= Progress.rivalsBeaten();
          f.x = cx; f.y = cy; f.size = size;
          if (open) f.draw(c);
          else Gfx.drawSprite(c, def.sprite, cx, cy, size, size, { tint: '#3a2a18', tintAmt: 0.92 });
          if (!open) {
            c.fillStyle = '#f1e3c0'; c.strokeStyle = '#f1e3c0'; c.lineWidth = 6;
            c.beginPath(); c.arc(cx, cy - 8, 14, Math.PI, 0); c.stroke();
            Gfx.rr(c, cx - 20, cy - 8, 40, 30, 5); c.fill();
          }
          if (beaten) {
            c.save(); c.translate(cx, cy + size * 0.15); c.rotate(-0.22);
            c.globalAlpha *= 0.9;
            c.strokeStyle = '#3e9d52'; c.lineWidth = 4; c.strokeRect(-86, -22, 172, 44);
            c.lineWidth = 1.5; c.strokeRect(-81, -17, 162, 34);
            Gfx.text(c, 'CAUGHT', 0, 2, { font: 'arcade', size: 16, color: '#3e9d52' });
            c.restore();
          }
          Gfx.text(c, open ? def.name.toUpperCase() : '???', cx, nameY, { font: 'arcade', size: 18, color: '#fff', stroke: '#2a1e12', strokeW: 5, maxW: W - 40 });
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
        Gfx.text(c, Hero.name().toUpperCase(), W * 0.27, H * 0.81, { font: 'arcade', size: 14, color: '#fff', stroke: '#2a1e12', strokeW: 5, maxW: W * 0.45 });
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
        Gfx.text(c, def.name.toUpperCase(), W * 0.72, H * 0.24 + foe.size * 0.72, { font: 'arcade', size: 14, color: '#fff', stroke: '#2a1e12', strokeW: 5, maxW: W * 0.5 });
        c.restore();
        if (a.v > 0) {
          c.save();
          c.translate(W / 2, H * 0.53);
          c.scale(a.v, a.v);
          Gfx.glow(c, 0, 0, 120, '#ffd76a', 0.6);
          Gfx.text(c, 'VS', 0, 0, { font: 'arcade', size: 64, color: Gfx.C.gold, stroke: '#2a1e12', strokeW: 12, shadow: 'rgba(0,0,0,.6)', shadowY: 7 });
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
      enter: function () { t = 0; Panels.open('gear'); build(); },
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
        TopBar.draw(c, W, { stars: false });

        if (hero) {
          var py = hero.y;
          /* standing on a wooden block on the desk, like a figure in a shop window */
          var bw3 = hero.k * 34, bh3 = hero.k * 4.5;
          c.fillStyle = 'rgba(46,24,6,.4)'; c.fillRect(W / 2 - bw3 / 2 + 4, py + 6, bw3, bh3);
          c.fillStyle = '#8a5a30'; c.fillRect(W / 2 - bw3 / 2, py + 2, bw3, bh3);
          c.fillStyle = '#a8743f'; c.fillRect(W / 2 - bw3 / 2, py + 2, bw3, 3);
          hero.draw(c);
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
