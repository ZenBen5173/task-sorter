/* ============================================================
   gfx.js  -  the drawing kit everything on the stage is made of
   ------------------------------------------------------------
   WHY THIS EXISTS. The game used to be a web page: every card,
   corner and coin was a <div>, and every movement was a CSS
   transition. That is why it felt like a website. A transition
   knows where a thing starts and where it ends and nothing about
   what is happening in between - it cannot follow a thumb with
   weight, bounce a card back off the wrong corner, or freeze the
   whole screen for two frames when you land a Perfect.

   So the game is drawn now, onto one canvas, sixty times a second
   (js/stage.js). This file is the box of tools that drawing uses:

     Ease       the curves things move along
     Tween      "move this from here to there over this long"
     Spring     movement with weight: overshoots, settles
     Particles  sparks, confetti, coins, dust
     Gfx        sprites, pets, text, panels, colours

   No library. The repository has no build step and no package.json
   on purpose - plain script tags are what lets the same files run
   offline inside the Android app - and a game with one card and four
   corners needs a loop, a tween and a particle emitter, not an
   engine.

   ES5 THROUGHOUT, like the rest of the game. The APK's floor is
   Android 7, and a WebView that old does not speak arrow functions.
   ============================================================ */

/* ---------------- easing ----------------
   Every one takes 0..1 and returns roughly 0..1. The Back and
   Elastic curves overshoot past 1 on purpose: that overshoot is
   the difference between a thing that arrives and a thing that
   lands. */
var Ease = {
  linear:    function (t) { return t; },
  inQuad:    function (t) { return t * t; },
  outQuad:   function (t) { return t * (2 - t); },
  inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
  inCubic:   function (t) { return t * t * t; },
  outCubic:  function (t) { var u = t - 1; return u * u * u + 1; },
  inOutCubic: function (t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },
  outQuart:  function (t) { var u = t - 1; return 1 - u * u * u * u; },
  outExpo:   function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
  inBack:    function (t) { var s = 1.70158; return t * t * ((s + 1) * t - s); },
  outBack:   function (t) {
    var s = 1.70158, u = t - 1;
    return u * u * ((s + 1) * u + s) + 1;
  },
  /* A bigger overshoot, for things that should SLAM in: a grade, a
     banner, a button appearing. */
  outBackBig: function (t) {
    var s = 3.2, u = t - 1;
    return u * u * ((s + 1) * u + s) + 1;
  },
  outElastic: function (t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  },
  outBounce: function (t) {
    var n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75; }
    if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375; }
    t -= 2.625 / d; return n * t * t + 0.984375;
  }
};

/* ---------------- tweens ----------------
   Tween.to(obj, { x: 100, alpha: 0 }, 300, { ease, delay, done })
   moves the named numbers on `obj` from wherever they are now to
   the values given.

   TWO CLOCKS. Gameplay runs on the STAGE clock, which stops dead
   for a hit-stop and slows down for a slow-motion finish - a card
   in mid-flight should freeze with everything else when the screen
   freezes. A button bouncing under your finger should not, so
   anything passed `real: true` runs on the wall clock instead. */
var Tween = (function () {
  var list = [];

  function to(obj, props, ms, opts) {
    opts = opts || {};
    var t = {
      obj: obj, props: props, from: {},
      ms: Math.max(1, ms || 1),
      t: -(opts.delay || 0),
      ease: opts.ease || Ease.outCubic,
      done: opts.done || null,
      update: opts.update || null,
      tag: opts.tag || null,
      real: !!opts.real,
      started: false, dead: false
    };
    list.push(t);
    return t;
  }

  /** Calls `fn` after `ms` of stage time. A timer that honours the
      hit-stop, which setTimeout cannot. */
  function wait(ms, fn, opts) {
    opts = opts || {};
    return to({ k: 0 }, { k: 1 }, ms, {
      ease: Ease.linear, done: fn, tag: opts.tag, real: opts.real
    });
  }

  function update(dt, dtReal) {
    /* Read the length once. A `done` that starts another tween adds to
       the end of this list; that one starts next frame rather than
       being run a frame early by this loop. */
    var n = list.length, i, t, p, e, k;
    for (i = 0; i < n; i++) {
      t = list[i];
      if (t.dead) continue;
      t.t += t.real ? dtReal : dt;
      if (t.t < 0) continue;
      if (!t.started) {
        for (k in t.props) t.from[k] = t.obj[k];
        t.started = true;
      }
      p = Math.min(1, t.t / t.ms);
      e = t.ease(p);
      for (k in t.props) t.obj[k] = t.from[k] + (t.props[k] - t.from[k]) * e;
      if (t.update) t.update(e, p);
      if (p >= 1) {
        t.dead = true;
        if (t.done) t.done();
      }
    }
    if (list.length > 48) {
      var keep = [];
      for (i = 0; i < list.length; i++) if (!list[i].dead) keep.push(list[i]);
      list = keep;
    }
  }

  function kill(obj) {
    for (var i = 0; i < list.length; i++) if (list[i].obj === obj) list[i].dead = true;
  }
  function killTag(tag) {
    for (var i = 0; i < list.length; i++) if (list[i].tag === tag) list[i].dead = true;
  }
  function clear() { list = []; }
  function count() {
    var n = 0;
    for (var i = 0; i < list.length; i++) if (!list[i].dead) n++;
    return n;
  }

  return { to: to, wait: wait, update: update, kill: kill, killTag: killTag, clear: clear, count: count };
})();

/* ---------------- springs ----------------
   A spring is { x, v }: where it is and how fast it is going. Each
   frame it is pulled toward a target and slowed by damping. Low
   damping wobbles, high damping glides.

   This is what makes a held card feel like it has weight. A card that
   sits exactly under your thumb is a cursor; a card on a stiff spring
   lags a hair behind and leans into the drag. */
var Spring = {
  make: function (x) { return { x: x || 0, v: 0 }; },
  step: function (s, target, dtMs, stiff, damp) {
    /* Sub-stepped, so a long frame on a slow phone cannot fling a
       stiff spring off to infinity. */
    var dt = Math.min(dtMs, 64) / 1000;
    var steps = Math.ceil(dt / 0.008);
    var h = dt / steps;
    for (var i = 0; i < steps; i++) {
      var f = (target - s.x) * stiff - s.v * damp;
      s.v += f * h;
      s.x += s.v * h;
    }
    return s.x;
  },
  /** Kicks a spring: the punch on a score, the bounce on a tray. */
  kick: function (s, v) { s.v += v; }
};

/* ---------------- particles ----------------
   One pool for the whole game. A burst of thirty sparks is thirty
   objects; making and throwing away thirty objects every time a card
   lands is how a game stutters on a cheap phone, so dead ones go back
   in the pool and get handed out again. */
var Particles = (function () {
  var live = [];
  var pool = [];
  var CAP = 700;
  var budget = 1;     // turned down for reduced motion

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function range(v, dflt) {
    if (v === undefined) v = dflt;
    if (typeof v === 'number') return [v, v];
    return v;
  }

  /** Throws `n` particles from (x, y).

      shape     'square' | 'circle' | 'spark' | 'star' | 'ring' |
                'petal' | 'coin' | 'text'
      colors    picked from at random
      speed     px per second, [min, max]
      angle     radians, [min, max] - default is all the way round
      gravity   px per second per second
      drag      0..1 per second of speed lost
      life      ms, [min, max]
      size      px, [min, max]
      layer     'world' draws with the scene, 'top' over the HUD and
                over the DOM panels (on the fx canvas) */
  function emit(o) {
    var n = Math.round((o.n || 10) * budget);
    var sp = range(o.speed, [60, 240]);
    var an = range(o.angle, [0, Math.PI * 2]);
    var lf = range(o.life, [400, 900]);
    var sz = range(o.size, [3, 6]);
    var colors = o.colors || ['#ffffff'];
    for (var i = 0; i < n; i++) {
      if (live.length >= CAP) return;
      var p = pool.pop() || {};
      var a = rnd(an[0], an[1]);
      var s = rnd(sp[0], sp[1]);
      p.x = o.x + (o.spreadX ? rnd(-o.spreadX, o.spreadX) : 0);
      p.y = o.y + (o.spreadY ? rnd(-o.spreadY, o.spreadY) : 0);
      p.vx = Math.cos(a) * s + (o.vx || 0);
      p.vy = Math.sin(a) * s + (o.vy || 0);
      p.g = o.gravity || 0;
      p.drag = o.drag === undefined ? 1.6 : o.drag;
      p.life = rnd(lf[0], lf[1]);
      p.age = 0;
      p.size = rnd(sz[0], sz[1]);
      p.color = colors[(Math.random() * colors.length) | 0];
      p.shape = o.shape || 'square';
      p.rot = Math.random() * Math.PI * 2;
      p.spin = o.spin === undefined ? rnd(-8, 8) : rnd(-o.spin, o.spin);
      p.layer = o.layer || 'world';
      p.add = !!o.additive;
      p.shrink = o.shrink === undefined ? true : o.shrink;
      p.text = o.text || '';
      p.wobble = o.wobble || 0;
      p.phase = Math.random() * 6.28;
      live.push(p);
    }
  }

  function update(dt) {
    var s = dt / 1000;
    for (var i = live.length - 1; i >= 0; i--) {
      var p = live[i];
      p.age += dt;
      if (p.age >= p.life) {
        live[i] = live[live.length - 1];
        live.pop();
        pool.push(p);
        continue;
      }
      var k = Math.max(0, 1 - p.drag * s);
      p.vx *= k; p.vy *= k;
      p.vy += p.g * s;
      p.x += p.vx * s;
      if (p.wobble) p.x += Math.sin(p.age / 180 + p.phase) * p.wobble * s * 60;
      p.y += p.vy * s;
      p.rot += p.spin * s;
    }
  }

  function draw(ctx, layer) {
    var t, a, sz, i, p;
    for (i = 0; i < live.length; i++) {
      p = live[i];
      if (p.layer !== layer) continue;
      t = p.age / p.life;
      a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      sz = p.shrink ? p.size * (1 - t * 0.6) : p.size;
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      switch (p.shape) {
        case 'circle':
          ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, 6.2832); ctx.fill();
          break;
        case 'ring':
          ctx.lineWidth = Math.max(1, sz * 0.25);
          ctx.beginPath(); ctx.arc(p.x, p.y, sz * (1 + t * 3), 0, 6.2832); ctx.stroke();
          break;
        case 'spark': {
          /* A streak drawn along its own velocity: the faster it is going,
             the longer it is. */
          var len = Math.min(26, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.05 + sz);
          var ang = Math.atan2(p.vy, p.vx);
          ctx.lineWidth = Math.max(1, sz * 0.5);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
          ctx.stroke();
          break;
        }
        case 'star':
          Gfx.star(ctx, p.x, p.y, sz, sz * 0.45, 5, p.rot);
          ctx.fill();
          break;
        case 'petal':
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.scale(1, 0.55 + 0.45 * Math.sin(p.age / 120 + p.phase));
          ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.6, 0, 0, 6.2832); ctx.fill();
          ctx.restore();
          break;
        case 'coin':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(Math.abs(Math.cos(p.age / 90 + p.phase)) * 0.8 + 0.2, 1);
          Gfx.drawSprite(ctx, 'coin', 0, 0, sz * 2, sz * 2);
          ctx.restore();
          break;
        case 'text':
          Gfx.text(ctx, p.text, p.x, p.y, { size: sz, color: p.color, font: 'arcade', stroke: '#000', strokeW: 3 });
          break;
        default:
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
          ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  return {
    emit: emit,
    update: update,
    draw: draw,
    clear: function () { while (live.length) pool.push(live.pop()); },
    count: function () { return live.length; },
    has: function (layer) {
      for (var i = 0; i < live.length; i++) if (live[i].layer === layer) return true;
      return false;
    },
    setBudget: function (b) { budget = b; }
  };
})();

/* ---------------- Gfx ---------------- */
var Gfx = (function () {

  /* The four corners are the game's language: the same red, blue,
     orange and grey everywhere - the trays, the glow on a card you are
     aiming, the points that fly out of a corner. */
  var C = {
    now: '#e0524a', later: '#4a86c4', give: '#f2a03d', drop: '#8a929e',
    good: '#5cc46a', bad: '#e0524a', gold: '#f2c14e', gold2: '#e8a33a',
    ink: '#0a0e1a', ink2: '#121a2e', ink3: '#1c2742', ink4: '#293755',
    line: '#3a4a6d', sink: '#060a14',
    paper: '#fbf3e0', paper2: '#efe1bf',
    tx: '#cdd8ec', txDim: '#8a9ac0', white: '#ffffff'
  };

  var FONT_ARCADE = '"Press Start 2P", "Courier New", monospace';
  var FONT_ROUND = 'Fredoka, "Trebuchet MS", system-ui, sans-serif';

  /* ---------------- maths ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  /** The same seeded generator the old level map used: a view that
      reshuffles itself every time you come back to it is a screensaver,
      not a place. */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  /* ---------------- colour ---------------- */
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  /** Lighter (amt > 0) or darker (amt < 0), -1..1. */
  function shade(hex, amt) {
    var c = hexToRgb(hex);
    for (var i = 0; i < 3; i++) {
      c[i] = amt > 0 ? c[i] + (255 - c[i]) * amt : c[i] * (1 + amt);
      c[i] = clamp(Math.round(c[i]), 0, 255);
    }
    return '#' + ((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1);
  }
  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    var r = Math.round(lerp(x[0], y[0], t)), g = Math.round(lerp(x[1], y[1], t)), bl = Math.round(lerp(x[2], y[2], t));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

  /* ---------------- images ----------------
     Two kinds of picture, same as before:

     SPRITE GRIDS from js/sprites.js - 16x16 colour grids typed out by
     hand, and the PNG overrides that replaced some of them. A grid is
     rasterised once into a canvas exactly its own size (one canvas
     pixel per art pixel) and drawn scaled up with smoothing OFF, so it
     stays crisp at any size. It used to go through toDataURL and back
     into an <img>; on a canvas that is a PNG encode and decode for
     nothing.

     PET SHEETS from js/pets.js - long strips of frames an artist drew,
     loaded once and sliced per frame. */
  var sprites = {};      // name -> canvas or Image
  var tints = {};        // name|colour -> canvas, the white flash on a hurt foe
  var pets = {};         // key -> Image
  var loading = 0;
  var readyFns = [];

  function done() {
    loading--;
    if (loading <= 0) {
      loading = 0;
      var fns = readyFns; readyFns = [];
      for (var i = 0; i < fns.length; i++) fns[i]();
    }
  }

  function loadImage(src) {
    var img = new Image();
    loading++;
    img.onload = done;
    img.onerror = function () { console.warn('[gfx] missing ' + src); done(); };
    img.src = src;
    return img;
  }

  function rasterise(def) {
    var h = def.px.length, w = def.px[0].length;
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var c = cv.getContext('2d');
    for (var y = 0; y < h; y++) {
      var row = def.px[y] || '';
      for (var x = 0; x < w; x++) {
        var col = def.pal[row.charAt(x)];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }

  function sprite(name) {
    if (sprites[name]) return sprites[name];
    if (window.SPRITE_OVERRIDES && SPRITE_OVERRIDES[name]) {
      sprites[name] = loadImage(SPRITE_OVERRIDES[name]);
    } else if (window.SPRITE_DATA && SPRITE_DATA[name]) {
      sprites[name] = rasterise(SPRITE_DATA[name]);
    } else {
      sprites[name] = null;
    }
    return sprites[name];
  }

  function petImage(key) {
    if (!pets[key] && window.PET_SHEETS && PET_SHEETS[key]) pets[key] = loadImage(PET_SHEETS[key].src);
    return pets[key];
  }

  /** Everything the stage will draw, loaded before the first frame that
      needs it, so a pet never pops in half a second after its scene. */
  function preload(cb) {
    if (cb) readyFns.push(cb);
    var k;
    if (window.SPRITE_OVERRIDES) for (k in SPRITE_OVERRIDES) sprite(k);
    if (window.SPRITE_DATA) for (k in SPRITE_DATA) sprite(k);
    if (window.PET_SHEETS) for (k in PET_SHEETS) petImage(k);
    /* The fonts count as one more thing to wait for. Answered by
       whichever comes first - the fonts arriving, or a timeout, because
       a font that never answers must not hold the game hostage - and
       only ever counted once, or a late answer would knock the counter
       down while a pet sheet was still on its way. */
    loading++;
    var answered = false;
    var fontsDone = function () { if (answered) return; answered = true; done(); };
    try {
      if (document.fonts && document.fonts.load) {
        Promise.all([
          document.fonts.load('16px "Press Start 2P"'),
          document.fonts.load('600 16px Fredoka'),
          document.fonts.load('700 16px Fredoka')
        ]).then(fontsDone, fontsDone);
        setTimeout(fontsDone, 2500);
      } else fontsDone();
    } catch (e) { fontsDone(); }
  }

  function isReady(img) {
    if (!img) return false;
    if (img.tagName === 'CANVAS') return true;
    return img.complete && img.naturalWidth > 0;
  }

  function natW(img) { return img.tagName === 'CANVAS' ? img.width : img.naturalWidth; }
  function natH(img) { return img.tagName === 'CANVAS' ? img.height : img.naturalHeight; }

  /** Draws a sprite CENTRED on (cx, cy), `w` across. Height follows the
      picture's own shape unless `h` is given. */
  function drawSprite(ctx, name, cx, cy, w, h, o) {
    var img = sprite(name);
    if (!isReady(img)) return;
    o = o || {};
    if (!h) h = w * natH(img) / natW(img);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(cx, cy);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flipX) ctx.scale(-1, 1);
    if (o.sx || o.sy) ctx.scale(o.sx || 1, o.sy || 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    if (o.tint && o.tintAmt > 0) {
      ctx.globalAlpha *= o.tintAmt;
      ctx.drawImage(tinted(name, o.tint), -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  /** A solid silhouette of a sprite in one colour, cached. Laid over the
      real sprite it is the white flash of a hit, the red of a hurt. */
  function tinted(name, color) {
    var key = name + '|' + color;
    if (tints[key]) return tints[key];
    var img = sprite(name);
    if (!isReady(img)) return img;
    var cv = document.createElement('canvas');
    cv.width = natW(img); cv.height = natH(img);
    var c = cv.getContext('2d');
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, cv.width, cv.height);
    tints[key] = cv;
    return cv;
  }

  /** How big a pet comes out for a box `box` pixels across. The same
      sums js/pets.js does for the DOM - scaled off the creature's BODY,
      not its cell, and capped - so a pet is the same size in the shop
      tile as it is walking about on the stage. */
  function petScale(sheet, box) {
    var k = box / Math.max(sheet.body.w, sheet.body.h);
    k = Math.min(k, 3);
    var roomy = box * 2.2;
    return Math.min(k, roomy / Math.max(sheet.cellW, sheet.cellH));
  }

  /** Draws frame `frame` of pet `key` standing with its feet on
      (cx, footY). Pets are drawn facing left; `flipX` turns them round. */
  function drawPet(ctx, key, cx, footY, box, frame, o) {
    var sheet = window.PET_SHEETS && PET_SHEETS[key];
    if (!sheet) return;
    var img = petImage(key);
    if (!isReady(img)) return;
    o = o || {};
    var k = petScale(sheet, box);
    var w = sheet.cellW * k, h = sheet.cellH * k;
    var f = ((frame | 0) % sheet.frames + sheet.frames) % sheet.frames;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(cx, footY + (sheet.offset ? sheet.offset * k : 0));
    if (o.sx || o.sy) ctx.scale(o.sx || 1, o.sy || 1);
    if (o.flipX) ctx.scale(-1, 1);
    /* Source in the sheet's own pixels: its drawn width and height may
       not match the image (the Phoenixling is two rows tall), so the
       cell is worked out from the image, not from the declared size. */
    var sx = natW(img) / sheet.width, sy = natH(img) / sheet.height;
    ctx.drawImage(img, f * sheet.cellW * sx, 0, sheet.cellW * sx, sheet.cellH * sy,
                  -w / 2, -h, w, h);
    ctx.restore();
  }

  function petFrameCount(key) {
    var s = window.PET_SHEETS && PET_SHEETS[key];
    return s ? s.frames : 1;
  }
  function petFps(key) {
    var s = window.PET_SHEETS && PET_SHEETS[key];
    return s ? s.fps : 12;
  }

  /* ---------------- shapes ---------------- */

  /** A rounded rectangle path. `r` may be one radius or [tl, tr, br, bl].
      Written out by hand: ctx.roundRect only arrived in Chrome 99, and
      the WebView on an older phone may predate it. */
  function rr(ctx, x, y, w, h, r) {
    var a, b, c, d;
    if (typeof r === 'object') { a = r[0]; b = r[1]; c = r[2]; d = r[3]; }
    else { a = b = c = d = r || 0; }
    var m = Math.min(w, h) / 2;
    a = Math.min(a, m); b = Math.min(b, m); c = Math.min(c, m); d = Math.min(d, m);
    ctx.beginPath();
    ctx.moveTo(x + a, y);
    ctx.lineTo(x + w - b, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + b);
    ctx.lineTo(x + w, y + h - c);
    ctx.quadraticCurveTo(x + w, y + h, x + w - c, y + h);
    ctx.lineTo(x + d, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - d);
    ctx.lineTo(x, y + a);
    ctx.quadraticCurveTo(x, y, x + a, y);
    ctx.closePath();
  }

  function star(ctx, x, y, outer, inner, points, rot) {
    ctx.beginPath();
    var step = Math.PI / points;
    var a = (rot || 0) - Math.PI / 2;
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 ? inner : outer;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      a += step;
    }
    ctx.closePath();
  }

  /** THE GAME'S PANEL. A body, a bright lip along the top edge, and a
      hard block of shadow `depth` pixels underneath - stamped out of
      plastic rather than floated on a blur. The old CSS did this with
      box-shadow; it is the one look worth carrying across unchanged. */
  function panel(ctx, x, y, w, h, o) {
    o = o || {};
    var r = o.r === undefined ? 14 : o.r;
    var depth = o.depth === undefined ? 5 : o.depth;
    var fill = o.fill || C.ink3;
    if (depth > 0) {
      ctx.fillStyle = o.sink || 'rgba(0,0,0,.45)';
      rr(ctx, x, y + depth, w, h, r); ctx.fill();
    }
    if (o.glow) {
      ctx.save();
      ctx.shadowColor = o.glow;
      ctx.shadowBlur = o.glowBlur || 18;
      ctx.fillStyle = fill;
      rr(ctx, x, y, w, h, r); ctx.fill();
      ctx.restore();
    }
    if (o.fill2) {
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, fill); g.addColorStop(1, o.fill2);
      ctx.fillStyle = g;
    } else ctx.fillStyle = fill;
    rr(ctx, x, y, w, h, r); ctx.fill();
    if (o.lip !== false) {
      ctx.save();
      rr(ctx, x, y, w, h, r); ctx.clip();
      ctx.fillStyle = o.lipColor || 'rgba(255,255,255,.16)';
      ctx.fillRect(x, y, w, Math.max(2, Math.min(4, h * 0.08)));
      ctx.restore();
    }
    if (o.edge) {
      ctx.lineWidth = o.edgeW || 2;
      ctx.strokeStyle = o.edge;
      rr(ctx, x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, r);
      ctx.stroke();
    }
  }

  /** A soft round light, drawn additively. Glows are what make a dark
      screen feel lit from somewhere. */
  function glow(ctx, x, y, r, color, a) {
    if (r <= 0) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a === undefined ? 0.6 : a));
    g.addColorStop(1, rgba(color, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /** Darkens the edges of the screen. A red one is how a miss feels. */
  function vignette(ctx, W, H, color, a) {
    if (a <= 0) return;
    var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, rgba(color, 0));
    g.addColorStop(1, rgba(color, a));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------------- text ---------------- */

  function font(o) {
    var size = Math.round(o.size || 16);
    if (o.font === 'arcade') return size + 'px ' + FONT_ARCADE;
    return (o.weight || 600) + ' ' + size + 'px ' + FONT_ROUND;
  }

  /** One line of text. Options:
        font    'arcade' (Press Start 2P, the loud things) or 'round'
        size, weight, color, align, base
        stroke, strokeW   an outline, so it reads over anything
        shadow, shadowY   a hard drop shadow, the panel look again
        maxW              shrinks the text until it fits
        alpha, tracking   letter spacing for the arcade face */
  function text(ctx, s, x, y, o) {
    o = o || {};
    s = String(s);
    ctx.save();
    var size = o.size || 16;
    ctx.font = font(o);
    if (o.maxW) {
      var w = ctx.measureText(s).width;
      if (w > o.maxW) {
        size = Math.max(6, size * o.maxW / w);
        ctx.font = font({ font: o.font, size: size, weight: o.weight });
      }
    }
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.base || 'middle';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.shadow) {
      ctx.fillStyle = o.shadow;
      ctx.fillText(s, x, y + (o.shadowY || Math.max(2, size * 0.12)));
    }
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeW || Math.max(2, size * 0.18);
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(s, x, y);
    ctx.restore();
    return size;
  }

  function measure(ctx, s, o) {
    ctx.save();
    ctx.font = font(o || {});
    var w = ctx.measureText(String(s)).width;
    ctx.restore();
    return w;
  }

  /** Breaks `s` into lines no wider than `maxW`. */
  function wrap(ctx, s, maxW, o) {
    ctx.save();
    ctx.font = font(o || {});
    var words = String(s).split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = words[i];
      } else line = test;
    }
    if (line) lines.push(line);
    ctx.restore();
    return lines;
  }

  /** Wraps and shrinks until the whole thing fits in a box - the card
      text, which runs from 23 to 56 characters and has to look settled
      at both ends. Returns { lines, size }. */
  function fit(ctx, s, maxW, maxH, o) {
    var size = o.size;
    var lines;
    for (var guard = 0; guard < 24; guard++) {
      lines = wrap(ctx, s, maxW, { font: o.font, size: size, weight: o.weight });
      var lh = size * (o.lead || 1.18);
      if (lines.length * lh <= maxH && lines.length <= (o.maxLines || 4)) break;
      size *= 0.92;
    }
    return { lines: lines, size: size };
  }

  return {
    C: C,
    clamp: clamp, lerp: lerp, rand: rand, pick: pick, rng: rng,
    rgba: rgba, shade: shade, mix: mix,
    preload: preload, sprite: sprite, drawSprite: drawSprite, tinted: tinted,
    petImage: petImage, drawPet: drawPet, petScale: petScale,
    petFrames: petFrameCount, petFps: petFps,
    rr: rr, star: star, panel: panel, glow: glow, vignette: vignette,
    text: text, measure: measure, wrap: wrap, fit: fit, font: font,
    FONT_ARCADE: FONT_ARCADE, FONT_ROUND: FONT_ROUND
  };
})();
