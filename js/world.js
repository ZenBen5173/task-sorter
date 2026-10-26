/* ============================================================
   world.js  -  the desk everything happens on
   ------------------------------------------------------------
   THE GAME IS A DESK NOW. It used to be played against four scenic
   skies - space, cherry blossom, forest, waterfalls - which were
   pretty and had nothing to do with sorting jobs. The look is "Desk
   Day": the four trays are things on a desk, the cards are index
   cards, the buttons are tickets and tags. So the backgrounds are the
   surfaces a desk can have:

     cork    a pinboard, in a wooden frame (the default)
     wood    the desk itself, planks and grain
     mat     a green cutting mat, ruled in centimetres
     chalk   a chalkboard, smudged

   Same contract as before: every scene is drawn in front of it, and
   changing it in Settings changes it behind the sheet as you watch.

   HOW IT IS DRAWN. The surface is painted ONCE into an off-screen
   canvas (a little wider than the screen, for parallax), and each frame
   just stamps it. The only moving things are a few specks of dust in
   the light, which is what keeps a still surface from looking like a
   screenshot.

   THE SHELF. drawGround() is now a wooden shelf: the plank the
   character stands on at home and between the bottom trays in a round.
   ============================================================ */

var World = (function () {

  var W = 0, H = 0;
  var floorWanted = 0;
  var offX = 0;
  var theme = 'cork';
  var layer = null;            // the painted surface
  var old = null, oldAlpha = 0;
  var cache = {}, cacheKeys = [];
  var M = 24;                  // extra width either side, for parallax
  var t = 0;
  var dust = [];
  var R = null;

  /* Saves written before the desk had these ids, or by a build that had
     other ones, land on the cork board. */
  var LEGACY = { space: 'cork', sakura: 'wood', forest: 'mat', falls: 'chalk' };

  function rnd(a, b) { return a + R() * (b - a); }
  function seeded(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var x = Math.imul(a ^ (a >>> 15), a | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }

  function canvas(w, h) {
    var q = Math.min(2, (window.Stage && Stage.pixelRatio && Stage.pixelRatio()) || 1);
    var c = document.createElement('canvas');
    c.width = Math.ceil(w * q); c.height = Math.ceil(h * q);
    var x = c.getContext('2d');
    x.scale(q, q);
    return { cv: c, ctx: x, w: w, h: h };
  }

  /* ---------------- the four surfaces ---------------- */

  /** Specks of a colour, scattered: the grain of cork, chalk dust. */
  function specks(c, w, h, n, cols, r0, r1) {
    for (var i = 0; i < n; i++) {
      c.fillStyle = cols[i % cols.length];
      var r = rnd(r0, r1);
      c.fillRect(rnd(0, w), rnd(0, h), r, r * rnd(0.6, 1.4));
    }
  }

  /** A soft darkening toward the edges - lamp light falls on the middle. */
  function lamp(c, w, h, a) {
    var g = c.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(20,10,2,' + a + ')');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }

  /** A wooden frame round the edge of a board. */
  function frame(c, w, h, wood, dark) {
    var f = 11;
    c.fillStyle = wood;
    c.fillRect(0, 0, w, f); c.fillRect(0, h - f, w, f); c.fillRect(0, 0, f + M, h); c.fillRect(w - f - M, 0, f + M, h);
    c.fillStyle = dark;
    c.fillRect(M + f, f, w - (M + f) * 2, 3); c.fillRect(M + f, h - f - 3, w - (M + f) * 2, 3);
    c.fillRect(M + f, f, 3, h - f * 2); c.fillRect(w - M - f - 3, f, 3, h - f * 2);
    c.globalAlpha = 0.18;
    c.fillStyle = '#fff';
    for (var y = 3; y < h; y += 7) c.fillRect(M, y, 9, 1);
    c.globalAlpha = 1;
  }

  var SURFACE = {
    cork: function (c, w, h) {
      c.fillStyle = '#b9895a'; c.fillRect(0, 0, w, h);
      specks(c, w, h, Math.round(w * h / 22), ['rgba(74,42,14,.42)', 'rgba(255,232,196,.3)', 'rgba(120,74,32,.5)', 'rgba(60,32,10,.3)'], 1, 2.6);
      specks(c, w, h, Math.round(w * h / 900), ['rgba(70,38,12,.35)'], 3, 5);
      /* the holes old pins left */
      for (var i = 0; i < 26; i++) { c.fillStyle = 'rgba(40,20,6,.45)'; c.beginPath(); c.arc(rnd(0, w), rnd(0, h), 1.6, 0, 6.28); c.fill(); }
      lamp(c, w, h, 0.4);
      frame(c, w, h, '#7a4f2a', '#5e3a1c');
    },
    wood: function (c, w, h) {
      c.fillStyle = '#8a5a32'; c.fillRect(0, 0, w, h);
      var plank = 64, x, y;
      for (x = -rnd(0, plank); x < w; x += plank) {
        c.fillStyle = 'rgba(' + Math.round(rnd(90, 140)) + ',' + Math.round(rnd(54, 84)) + ',' + Math.round(rnd(24, 40)) + ',.55)';
        c.fillRect(x, 0, plank, h);
        /* grain: long wavy lines */
        c.strokeStyle = 'rgba(50,26,8,.28)'; c.lineWidth = 1.2;
        for (var g = 0; g < 7; g++) {
          var gx = x + rnd(4, plank - 4), wob = rnd(2, 6), ph = rnd(0, 6);
          c.beginPath(); c.moveTo(gx, 0);
          for (y = 0; y <= h; y += 20) c.lineTo(gx + Math.sin(y / 90 + ph) * wob, y);
          c.stroke();
        }
        if (R() < 0.5) { c.fillStyle = 'rgba(50,26,8,.35)'; c.beginPath(); c.ellipse(x + rnd(10, plank - 10), rnd(0, h), 5, 9, 0, 0, 6.28); c.fill(); }
        c.fillStyle = 'rgba(30,14,4,.55)'; c.fillRect(x, 0, 2, h);
      }
      lamp(c, w, h, 0.45);
    },
    mat: function (c, w, h) {
      c.fillStyle = '#2f6b4a'; c.fillRect(0, 0, w, h);
      var cm = 22, i;
      c.strokeStyle = 'rgba(220,240,220,.13)'; c.lineWidth = 1;
      for (i = 0; i < w; i += cm) { c.beginPath(); c.moveTo(i + 0.5, 0); c.lineTo(i + 0.5, h); c.stroke(); }
      for (i = 0; i < h; i += cm) { c.beginPath(); c.moveTo(0, i + 0.5); c.lineTo(w, i + 0.5); c.stroke(); }
      c.strokeStyle = 'rgba(230,250,230,.28)';
      for (i = 0; i < w; i += cm * 5) { c.beginPath(); c.moveTo(i + 0.5, 0); c.lineTo(i + 0.5, h); c.stroke(); }
      for (i = 0; i < h; i += cm * 5) { c.beginPath(); c.moveTo(0, i + 0.5); c.lineTo(w, i + 0.5); c.stroke(); }
      /* a 45-degree guide and the ruler along the edge */
      c.beginPath(); c.moveTo(0, h * 0.2); c.lineTo(w, h * 0.2 + w); c.stroke();
      c.fillStyle = 'rgba(230,250,230,.5)'; c.font = '600 8px "IBM Plex Mono", monospace';
      for (i = cm * 5; i < w; i += cm * 5) c.fillText(String(Math.round(i / cm)), i + 3, 12);
      specks(c, w, h, Math.round(w * h / 400), ['rgba(0,0,0,.12)', 'rgba(255,255,255,.05)'], 1, 2);
      lamp(c, w, h, 0.4);
    },
    chalk: function (c, w, h) {
      c.fillStyle = '#26332c'; c.fillRect(0, 0, w, h);
      /* old chalk, half rubbed out */
      for (var i = 0; i < 14; i++) {
        c.save();
        c.globalAlpha = rnd(0.03, 0.08);
        c.fillStyle = '#e6efe8';
        c.translate(rnd(0, w), rnd(0, h)); c.rotate(rnd(-0.5, 0.5));
        c.fillRect(-rnd(40, 120), -rnd(6, 20), rnd(80, 240), rnd(12, 40));
        c.restore();
      }
      specks(c, w, h, Math.round(w * h / 60), ['rgba(230,240,232,.06)', 'rgba(0,0,0,.12)'], 1, 2);
      lamp(c, w, h, 0.35);
      frame(c, w, h, '#8a5a32', '#5e3a1c');
    }
  };

  /* The theme ids every other file uses, and their names. */
  var NAMES = { cork: 'Cork Board', wood: 'Wood Desk', mat: 'Cutting Mat', chalk: 'Chalkboard' };
  var TINT = { cork: '#b9895a', wood: '#8a5a32', mat: '#2f6b4a', chalk: '#26332c' };

  /* ---------------- building ---------------- */

  function build() {
    if (!W || !H) return;
    var key = theme + '|' + W + '|' + H;
    var hit = cache[key];
    if (!hit) {
      R = seeded(theme.length * 7919 + 17);
      hit = canvas(W + M * 2, H);
      SURFACE[theme](hit.ctx, W + M * 2, H);
      cache[key] = hit;
      cacheKeys.push(key);
      if (cacheKeys.length > 4) delete cache[cacheKeys.shift()];
    }
    layer = hit;
    R = Math.random;
    dust = [];
    for (var i = 0; i < 16; i++) dust.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 5, ph: Math.random() * 6 });
  }

  function resize(w, h) {
    if (w === W && h === H && layer) return;
    W = w; H = h;
    build();
  }

  /** Kept for the scenes that still say where their floor is; a desk has
      no horizon, so it only matters to the shelf. */
  function setFloor(y) { floorWanted = Math.round(y || 0); }

  function setTheme(id, instant) {
    id = LEGACY[id] || id;
    if (!SURFACE[id]) id = 'cork';
    if (id === theme && layer) return;
    if (!instant && layer) { old = layer; oldAlpha = 1; }
    theme = id;
    build();
  }

  function update(dt) {
    t += dt;
    var s = dt / 1000;
    if (old) { oldAlpha = Math.max(0, oldAlpha - dt / 650); if (!oldAlpha) old = null; }
    for (var i = 0; i < dust.length; i++) {
      var p = dust[i];
      p.x += (p.vx + Math.sin(t / 1600 + p.ph) * 4) * s; p.y += p.vy * s;
      if (p.y < -6) { p.y = H + 4; p.x = Math.random() * W; }
    }
  }

  /** Paints the surface. Options: camX, camY (parallax, px), dim (0..1
      of shade over it), tint + tintAmt (the orange of the final rush). */
  function draw(ctx, w, h, o) {
    o = o || {};
    if (!layer) return;
    ctx.save();
    ctx.translate(-offX, 0);
    var camX = Gfx.clamp(o.camX || 0, -M, M) * 0.4;
    ctx.drawImage(layer.cv, -M - camX, 0, layer.w, layer.h);
    if (old && oldAlpha > 0) { ctx.globalAlpha = oldAlpha; ctx.drawImage(old.cv, -M - camX, 0, old.w, old.h); ctx.globalAlpha = 1; }
    /* dust in the lamp light */
    ctx.fillStyle = theme === 'chalk' ? '#e6efe8' : '#fff4dc';
    for (var i = 0; i < dust.length; i++) {
      var p = dust[i];
      ctx.globalAlpha = 0.18 + 0.18 * Math.sin(t / 900 + p.ph);
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }
    ctx.globalAlpha = 1;
    if (o.tint && o.tintAmt > 0) { ctx.fillStyle = Gfx.rgba(o.tint, o.tintAmt); ctx.fillRect(0, 0, W, H); }
    /* A round used to dim the sky by a third so cards read over it. A
       desk is already in the background's colours; half that is plenty. */
    if (o.dim > 0) { ctx.fillStyle = 'rgba(30,16,4,' + (o.dim * 0.5).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  /** The wooden shelf, its top edge at `y`. */
  function drawGround(ctx, y, camX) {
    ctx.save();
    ctx.translate(-offX, 0);
    var x0 = 0, x1 = W;
    ctx.fillStyle = 'rgba(40,20,5,.35)';
    ctx.fillRect(x0, y + 14, x1, 8);
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(x0, y, x1, 16);
    ctx.fillStyle = '#a8743f'; ctx.fillRect(x0, y, x1, 3);
    ctx.fillStyle = '#6b4220'; ctx.fillRect(x0, y + 13, x1, 3);
    ctx.strokeStyle = 'rgba(50,26,8,.3)'; ctx.lineWidth = 1;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x0, y + 5 + i * 3);
      for (var x = 0; x <= x1; x += 30) ctx.lineTo(x, y + 5 + i * 3 + Math.sin(x / 70 + i) * 1.2);
      ctx.stroke();
    }
    void camX;
    ctx.restore();
  }

  return {
    resize: resize,
    setFloor: setFloor,
    offset: function (x) { offX = x || 0; },
    setTheme: setTheme,
    theme: function () { return theme; },
    tint: function () { return TINT[theme]; },
    names: NAMES,
    ids: ['cork', 'wood', 'mat', 'chalk'],
    update: update,
    draw: draw,
    drawGround: drawGround
  };
})();
