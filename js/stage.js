/* ============================================================
   stage.js  -  the canvas, the loop, the scenes
   ------------------------------------------------------------
   ONE CANVAS, ALWAYS ON. It fills the screen behind everything and
   never stops drawing. The world you are in, your character, the
   round itself - all of it is painted here, every frame. That is the
   single biggest change from the old game, which swapped between
   eight HTML pages with display:none and so felt like what it was: a
   website with a game on one of its pages.

   Three layers, bottom to top:

     #stage   this canvas: the world, the scenes, the round
     #ui      plain HTML, for the few things HTML is genuinely better
              at - a shop list you scroll, a box you type your name
              into, the rulebook. They slide up OVER the living world
              rather than replacing it.
     #fx      a second, see-through canvas on top of everything, for
              what has to cross both: scene transitions, and coins
              flying up into a counter over an open panel.

   SCENES. A scene is an object with any of:
     enter(params)    it is being shown
     exit()           it is being left
     layout(W, H)     the screen changed size
     update(dt)       advance, in stage milliseconds
     draw(ctx, W, H)  paint
     pointer(type, x, y, e)   'down' | 'move' | 'up' | 'cancel'
     key(e)           a key was pressed
     back()           Android's back button; return true if handled

   TIME. The stage keeps its own clock. A hit-stop stops it for a few
   frames and a slow-motion finish runs it at a fraction of real speed;
   everything in the round (tweens, particles, flying cards) moves on
   that clock, so when the screen freezes on a Perfect, everything
   freezes together. The RULES do not - js/game.js times the round
   against Date.now(), so a hit-stop can never steal a second off the
   clock you are racing.
   ============================================================ */

var Stage = (function () {

  var cv = null, ctx = null, fx = null, fctx = null;
  /* W and H are the PLAY COLUMN, which is what every scene lays itself
     out in. SW and SH are the whole screen. On a phone they are the same
     thing. On a laptop they are not: a game built for a phone in your
     hand, stretched across a 1280px window, put the four trays at the
     far corners of the screen with a small card marooned between them.
     So on a wide screen the game plays in a portrait column in the
     middle, and the world it is set in stays full-bleed around it. */
  var W = 0, H = 0, SW = 0, SH = 0, colX = 0, dpr = 1;
  /* ADAPTIVE RESOLUTION. The pixel density the stage draws at starts at
     the phone's own (capped at 2) and steps down a notch if the frame
     rate cannot be held - a slightly softer picture at sixty frames is a
     better game than a sharp one at twenty. It never steps back up by
     itself, so it cannot see-saw. */
  var dprCap = 2, slowFrames = 0, sampled = 0;

  /* WHAT A FRAME COSTS. `work` is the time this game's own code spends
     on a frame - updating and drawing - which is the part a cheap
     phone's processor has to pay. `gap` is the time between frames,
     which also includes the browser compositing the canvas. Both are
     smoothed. Add ?fps to the address to see them on screen. */
  var stats = { work: 0, gap: 16.7, fps: 60 };
  var showStats = /[?&]fps\b/.test(location.search);
  var safe = { t: 0, b: 0, l: 0, r: 0 };

  var scenes = {};
  var scene = null, sceneName = '';

  var last = 0, started = false;
  var now = 0, real = 0;            // stage clock, wall clock (ms)
  var hitstopLeft = 0;
  var slow = { scale: 1, left: 0 };
  var shakeAmt = 0, shakeLeft = 0, shakeDur = 1;
  var zoom = Spring.make(1);
  var still = false;                // reduced motion

  var trans = null;
  var inputBlocked = 0;

  /* ---------------- setup ---------------- */

  function init() {
    cv = document.getElementById('stage');
    fx = document.getElementById('fx');
    ctx = cv.getContext('2d');
    fctx = fx.getContext('2d');

    try { still = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (still) Particles.setBudget(0.35);

    resize();
    window.addEventListener('resize', resize);
    /* A keyboard opening on Android resizes the window; so does the
       browser bar sliding away. Both arrive as this. */
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

    bindInput();
    if (!started) {
      started = true;
      requestAnimationFrame(frame);
    }
  }

  /** The notch and the gesture bar, read off CSS. env() only exists in
      CSS, so a hidden probe is padded with it and its padding read
      back - the canvas then keeps its HUD clear of both. */
  function readSafe() {
    var p = document.getElementById('safe-probe');
    if (!p) {
      p = document.createElement('div');
      p.id = 'safe-probe';
      p.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) ' +
        'env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
      document.body.appendChild(p);
    }
    var s = getComputedStyle(p);
    safe.t = parseFloat(s.paddingTop) || 0;
    safe.r = parseFloat(s.paddingRight) || 0;
    safe.b = parseFloat(s.paddingBottom) || 0;
    safe.l = parseFloat(s.paddingLeft) || 0;
  }

  function resize() {
    /* Capped at 2. A 3x phone drawing a full-screen canvas at 3x is
       nine times the pixels of 1x for a picture made of 16x16 sprites
       and flat shapes - the extra sharpness is invisible and the extra
       fill is the most likely thing to cost a cheap phone its sixty
       frames a second. */
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    SW = Math.round(window.innerWidth);
    SH = Math.round(window.innerHeight);
    var widest = Math.round(SH * 0.62);
    W = SW > widest * 1.1 ? widest : SW;
    H = SH;
    colX = Math.round((SW - W) / 2);
    [cv, fx].forEach(function (c) {
      c.width = Math.round(SW * dpr);
      c.height = Math.round(SH * dpr);
      c.style.width = SW + 'px';
      c.style.height = SH + 'px';
    });
    readSafe();
    Gfx.setScale(dpr);
    if (window.World) { World.resize(SW, SH); World.offset(colX); }
    if (scene && scene.layout) scene.layout(W, H);
  }

  /* ---------------- the loop ---------------- */

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    /* Clamped. Coming back to the app after a minute in the background
       hands rAF a minute-long frame, which would teleport every spring
       and tween to its end at once. */
    var raw = ts - last;
    var dtReal = Math.min(50, Math.max(0, raw));
    last = ts;
    real += dtReal;
    watchSpeed(raw);

    var dt = dtReal;
    if (hitstopLeft > 0) { hitstopLeft -= dtReal; dt = 0; }
    else if (slow.left > 0) { slow.left -= dtReal; dt = dtReal * slow.scale; }
    now += dt;

    if (shakeLeft > 0) shakeLeft = Math.max(0, shakeLeft - dtReal);
    Spring.step(zoom, 1, dtReal, 260, 18);

    var t0 = performance.now();
    Tween.update(dt, dtReal);
    Particles.update(dt);
    if (window.World) World.update(dt);
    if (scene && scene.update) scene.update(dt, dtReal);
    if (trans) stepTransition(dtReal);

    paint();
    var spent = performance.now() - t0;
    stats.work += (spent - stats.work) * 0.05;
    if (raw > 0 && raw < 250) stats.gap += (raw - stats.gap) * 0.05;
    stats.fps = 1000 / stats.gap;
    if (showStats) drawStats();
  }

  function drawStats() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var txt = Math.round(stats.fps) + ' fps  ' + stats.work.toFixed(1) + 'ms  x' + dpr + '  ' + Particles.count() + 'p';
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(4, SH - safe.b - 22, 196, 18);
    ctx.fillStyle = stats.fps > 55 ? '#7dff9a' : stats.fps > 40 ? '#ffd04a' : '#ff6a5a';
    ctx.font = '600 12px monospace';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(txt, 8, SH - safe.b - 13);
  }

  function paint() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SW, SH);

    ctx.save();
    ctx.translate(colX, 0);
    if (shakeLeft > 0 && !still) {
      var k = shakeAmt * (shakeLeft / shakeDur);
      ctx.translate((Math.random() * 2 - 1) * k, (Math.random() * 2 - 1) * k);
    }
    if (Math.abs(zoom.x - 1) > 0.0005) {
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom.x, zoom.x);
      ctx.translate(-W / 2, -H / 2);
    }
    if (scene && scene.draw) scene.draw(ctx, W, H);
    Particles.draw(ctx, 'world');
    ctx.restore();
    if (colX > 0) frameColumn(ctx);

    /* The top layer is cleared and drawn only when it has something on
       it. Most frames it has nothing, and an empty full-screen canvas
       still costs a clear. */
    var busy = !!trans || Particles.has('top') || (scene && scene.drawTop);
    if (busy || fx.dataset.dirty === '1') {
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.clearRect(0, 0, SW, SH);
      fctx.save();
      fctx.translate(colX, 0);
      if (scene && scene.drawTop) scene.drawTop(fctx, W, H);
      Particles.draw(fctx, 'top');
      fctx.restore();
      if (trans) drawTransition(fctx);
      fx.dataset.dirty = busy ? '1' : '0';
    }
  }

  /** Counts slow frames over a two-second window. If more than a third
      of them were slow, and the page is actually visible, the stage
      drops a step of resolution and starts counting again. */
  function watchSpeed(raw) {
    if (document.hidden || trans || raw > 250) return;
    sampled++;
    if (raw > 24) slowFrames++;
    if (sampled < 120) return;
    if (slowFrames > 40 && dprCap > 1) {
      dprCap = Math.max(1, Math.round((Math.min(dprCap, window.devicePixelRatio || 1) - 0.25) * 4) / 4);
      resize();
    }
    sampled = 0; slowFrames = 0;
  }

  /* ---------------- scenes ---------------- */

  function define(name, def) {
    def.name = name;
    scenes[name] = def;
    return def;
  }

  function swap(name, params) {
    if (scene && scene.exit) scene.exit();
    scene = scenes[name];
    sceneName = name;
    if (!scene) throw new Error('[stage] no scene called ' + name);
    /* The world's floor goes back to the bottom of the screen for every
       scene; one with a floor of its own (home) sets it in enter(). */
    if (window.World) World.setFloor(0);
    if (scene.enter) scene.enter(params || {});
    if (scene.layout) scene.layout(W, H);
    if (window.Music) Music.forScreen(typeof scene.music === 'function' ? scene.music() : (scene.music || name));
    document.body.setAttribute('data-scene', name);
  }

  /** Goes to scene `name`. `how` picks the transition:
        'iris'   a circle closes onto a point, then opens - the classic
                 way into a round
        'cards'  four bars in the four corner colours sweep across
        'fade'   to the dark and back
        'none'   a straight cut */
  function go(name, params, how) {
    how = how || 'fade';
    if (how === 'none') { swap(name, params); return; }
    if (trans) {
      /* A second go() while one is running: let the running one finish
         and land on the newest destination instead. */
      trans.name = name; trans.params = params;
      return;
    }
    var o = typeof how === 'object' ? how : { kind: how };
    /* Asked for less motion: every transition becomes a quick fade. A
       circle closing on the screen is exactly the kind of movement that
       setting exists to switch off. */
    if (still) o = { kind: 'fade', ms: 140 };
    trans = {
      kind: o.kind, phase: 'out', t: 0,
      ms: o.ms || (o.kind === 'iris' ? 420 : o.kind === 'cards' ? 440 : 260),
      cx: colX + (o.x === undefined ? W / 2 : o.x),
      cy: o.y === undefined ? H / 2 : o.y,
      name: name, params: params
    };
    if (window.Sfx) Sfx.play(o.kind === 'iris' ? 'irisOut' : 'swoosh');
  }

  function stepTransition(dt) {
    /* A short hold on the dark first, so the new scene's first frame is
       drawn before it is uncovered and nothing visibly pops in. */
    if (trans.phase === 'in' && trans.hold > 0) { trans.hold -= dt; return; }
    trans.t += dt;
    if (trans.t < trans.ms) return;
    if (trans.phase === 'out') {
      swap(trans.name, trans.params);
      trans.phase = 'in';
      trans.t = 0;
      trans.hold = 70;
    } else {
      trans = null;
    }
  }

  function drawTransition(c) {
    var p = Math.min(1, trans.t / trans.ms);
    if (trans.phase === 'in' && trans.hold > 0) p = 0;
    /* `cover` is how much of the screen is hidden: rising to 1 on the
       way out, falling back to 0 on the way in. */
    var cover = trans.phase === 'out' ? Ease.inCubic(p) : 1 - Ease.outCubic(p);
    var ink = Gfx.C.ink;

    if (trans.kind === 'iris') {
      var far = Math.sqrt(Math.max(trans.cx, SW - trans.cx) * Math.max(trans.cx, SW - trans.cx) +
                          Math.max(trans.cy, SH - trans.cy) * Math.max(trans.cy, SH - trans.cy));
      var r = far * (1 - cover);
      c.save();
      c.fillStyle = ink;
      c.beginPath();
      c.rect(0, 0, SW, SH);
      c.arc(trans.cx, trans.cy, Math.max(0, r), 0, Math.PI * 2, true);
      c.fill('evenodd');
      /* A thin gold ring rides the edge of the circle, so the iris reads
         as a lens closing rather than a hole in the screen. */
      if (r > 2) {
        c.strokeStyle = Gfx.rgba(Gfx.C.gold, 0.85 * Math.min(1, cover * 3));
        c.lineWidth = 3;
        c.beginPath(); c.arc(trans.cx, trans.cy, r, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
      return;
    }

    if (trans.kind === 'cards') {
      /* Four diagonal stripes, one per corner, each a beat behind the
         last - the game's own four colours wiping the screen. On the way
         out they slide IN from the left until they tile the screen; on
         the way back they keep going and slide off to the right, so the
         wipe reads as one sweep through rather than a curtain that
         closes and reopens. */
      var cols = [Gfx.C.now, Gfx.C.later, Gfx.C.give, Gfx.C.drop];
      var full = Math.sqrt(SW * SW + SH * SH);
      var stripe = full / 4;
      c.save();
      c.translate(SW / 2, SH / 2);
      c.rotate(-0.5);
      for (var i = 0; i < 4; i++) {
        /* Each stripe gets its own slice of the timeline. */
        var d = Gfx.clamp(p * 1.45 - i * 0.15, 0, 1);
        var e = Ease.inOutCubic(d);
        var left;
        if (trans.phase === 'out') left = -3 * full + 2 * full * e;   // -> covering
        else left = (trans.hold > 0 ? -full : -full + 2 * full * e);  // covering ->
        c.fillStyle = cols[i];
        c.fillRect(left, -full / 2 + i * stripe - 1, full * 2, stripe + 2);
        /* A dark rule along each stripe's leading edge gives it a front. */
        c.fillStyle = 'rgba(0,0,0,.22)';
        c.fillRect(left + full * 2 - 10, -full / 2 + i * stripe - 1, 10, stripe + 2);
      }
      c.restore();
      return;
    }

    c.fillStyle = Gfx.rgba(ink, cover);
    c.fillRect(0, 0, SW, SH);
  }

  /** On a wide screen: the world either side of the play column, held
      back a little, with a soft edge where the column starts - so the
      eye knows where the game is without a hard box drawn round it. */
  function frameColumn(c) {
    c.save();
    var edge = Math.min(60, colX);
    var gl = c.createLinearGradient(colX - edge, 0, colX, 0);
    gl.addColorStop(0, 'rgba(4,6,14,.55)'); gl.addColorStop(1, 'rgba(4,6,14,0)');
    c.fillStyle = 'rgba(4,6,14,.55)'; c.fillRect(0, 0, colX - edge, SH);
    c.fillStyle = gl; c.fillRect(colX - edge, 0, edge, SH);
    var gr = c.createLinearGradient(colX + W, 0, colX + W + edge, 0);
    gr.addColorStop(0, 'rgba(4,6,14,0)'); gr.addColorStop(1, 'rgba(4,6,14,.55)');
    c.fillStyle = gr; c.fillRect(colX + W, 0, edge, SH);
    c.fillStyle = 'rgba(4,6,14,.55)'; c.fillRect(colX + W + edge, 0, SW - colX - W - edge, SH);
    c.restore();
  }

  /* ---------------- effects ---------------- */

  /** Shakes the camera. `amt` in pixels. */
  function shake(amt, ms) {
    if (still) return;
    if (amt * 1 < shakeAmt * (shakeLeft / shakeDur)) return;
    shakeAmt = amt; shakeDur = ms || 240; shakeLeft = shakeDur;
  }
  /** Freezes the stage clock for `ms`. Two or three frames of nothing
      on a big moment is what makes it land - every fighting game does
      it on a hit, and it is why a Perfect feels like one. */
  function hitstop(ms) { if (!still) hitstopLeft = Math.max(hitstopLeft, ms); }
  function slowmo(scale, ms) { if (!still) { slow.scale = scale; slow.left = ms; } }
  /** A punch of the whole picture toward the viewer. */
  function punch(amt) { if (!still) Spring.kick(zoom, amt || 0.4); }

  /* ---------------- input ---------------- */

  function toLocal(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) - colX, y: (e.clientY - r.top) };
  }

  function bindInput() {
    cv.addEventListener('pointerdown', function (e) {
      if (trans || inputBlocked) return;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      var p = toLocal(e);
      if (scene && scene.pointer) scene.pointer('down', p.x, p.y, e);
    });
    cv.addEventListener('pointermove', function (e) {
      var p = toLocal(e);
      if (scene && scene.pointer) scene.pointer('move', p.x, p.y, e);
    });
    cv.addEventListener('pointerup', function (e) {
      var p = toLocal(e);
      if (scene && scene.pointer) scene.pointer('up', p.x, p.y, e);
    });
    cv.addEventListener('pointercancel', function (e) {
      var p = toLocal(e);
      if (scene && scene.pointer) scene.pointer('cancel', p.x, p.y, e);
    });
    /* The canvas never scrolls and never zooms. Without this a fast
       swipe on a card is also a page scroll, and the whole game slides
       a few pixels under your thumb. */
    cv.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (trans) return;
      if (scene && scene.key) scene.key(e);
    });
  }

  /* ---------------- buttons, drawn on the canvas ----------------
     A button you press on a canvas has to be built by hand: the
     canvas knows nothing about what is drawn on it. In exchange it can
     do what an HTML button cannot easily do - sink into its own shadow
     under your thumb, overshoot on release, pulse when it is the thing
     you should press next.

     STYLES
       gold   PLAY, and anything that is the next thing to do
       blue   a second choice
       wood   the warm one, for the home screen's side doors
       dark   quiet
       red    destructive
       icon   a round button with a picture and no words */
  var STYLE = {
    gold: { fill: '#ffd76a', fill2: '#f0a93a', sink: '#8a5a16', text: '#3a2208', edge: '#fff3c4' },
    blue: { fill: '#5b8fd8', fill2: '#3b64a8', sink: '#1a2f55', text: '#ffffff', edge: '#a8c8f4' },
    green: { fill: '#76d483', fill2: '#3e9d52', sink: '#1d4d28', text: '#0f2a14', edge: '#c8f2cf' },
    wood: { fill: '#a06a36', fill2: '#74481f', sink: '#3a220e', text: '#fff6e6', edge: '#d4a26c' },
    dark: { fill: '#2b3a5c', fill2: '#1c2742', sink: '#060a14', text: '#e6eefc', edge: '#4a5d86' },
    red: { fill: '#e8685f', fill2: '#b03a33', sink: '#4a1210', text: '#ffffff', edge: '#ffb4ae' },
    icon: { fill: '#2b3a5c', fill2: '#1c2742', sink: '#060a14', text: '#e6eefc', edge: '#4a5d86' }
  };

  function Button(o) {
    this.x = o.x || 0; this.y = o.y || 0; this.w = o.w || 100; this.h = o.h || 48;
    this.label = o.label || '';
    this.sub = o.sub || '';
    this.icon = o.icon || null;
    this.style = o.style || 'dark';
    this.onTap = o.onTap || null;
    this.enabled = o.enabled !== false;
    this.visible = o.visible !== false;
    this.pulse = !!o.pulse;
    this.size = o.size || 0;
    this.badge = o.badge || '';
    this.custom = o.draw || null;
    this.pressed = false;
    this.scale = Spring.make(1);
    this.appear = o.appear === undefined ? 1 : o.appear;   // 0..1, for entrances
    this.t = Math.random() * 1000;
    this.id = o.id || '';
  }
  Button.prototype.hit = function (x, y) {
    var pad = 6;      // fingers are bigger than the art
    return this.visible && this.enabled && this.appear > 0.6 &&
      x >= this.x - pad && x <= this.x + this.w + pad &&
      y >= this.y - pad && y <= this.y + this.h + pad;
  };
  Button.prototype.update = function (dt) {
    this.t += dt;
    Spring.step(this.scale, this.pressed ? 0.93 : 1, dt, 520, 22);
  };
  Button.prototype.draw = function (c) {
    if (!this.visible || this.appear <= 0.001) return;
    var s = STYLE[this.style] || STYLE.dark;
    var depth = this.style === 'icon' ? 4 : 6;
    var down = this.pressed ? depth * 0.7 : 0;
    var a = Math.min(1, this.appear);
    var k = this.scale.x * (0.6 + 0.4 * Ease.outBack(a));
    c.save();
    c.globalAlpha *= this.enabled ? a : a * 0.5;
    c.translate(this.x + this.w / 2, this.y + this.h / 2);
    c.scale(k, k);
    c.translate(-this.w / 2, -this.h / 2 + down);
    if (this.pulse && this.enabled) {
      var g = 0.35 + 0.25 * Math.sin(this.t / 260);
      Gfx.glow(c, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75, s.fill, g * 0.5);
    }
    var r = this.style === 'icon' ? this.h / 2 : Math.min(16, this.h * 0.32);
    /* The plastic body is baked - one bitmap for up, one for pressed. */
    var bw = this.w, bh = this.h, dd = depth - down;
    var body = Gfx.bake('btn|' + this.style + '|' + bw + '|' + bh + '|' + dd.toFixed(1), bw, bh + depth + 1, function (k) {
      Gfx.panel(k, 0, 0, bw, bh, {
        fill: s.fill, fill2: s.fill2, sink: s.sink, depth: dd, r: r,
        edge: Gfx.rgba(s.edge, 0.55), edgeW: 2
      });
    });
    c.drawImage(body.cv, 0, 0, body.w, body.h);
    if (this.custom) this.custom(c, this, s);
    else {
      var cx = this.w / 2, cy = this.h / 2;
      if (this.icon && !this.label) {
        Gfx.drawSprite(c, this.icon, cx, cy, this.h * 0.56);
      } else {
        var tx = cx;
        if (this.icon) {
          var isz = this.h * 0.5;
          Gfx.drawSprite(c, this.icon, 18 + isz / 2, cy, isz);
          tx = cx + isz * 0.45;
        }
        var lsize = this.size || Math.min(18, this.h * 0.32);
        if (this.sub) {
          Gfx.text(c, this.label, tx, cy - lsize * 0.42, {
            font: 'arcade', size: lsize, color: s.text, maxW: this.w - (this.icon ? 70 : 24)
          });
          Gfx.text(c, this.sub, tx, cy + lsize * 0.78, {
            size: Math.max(11, lsize * 0.62), weight: 600, color: Gfx.rgba(s.text === '#ffffff' ? '#ffffff' : s.text, 0.75),
            maxW: this.w - (this.icon ? 70 : 24)
          });
        } else {
          Gfx.text(c, this.label, tx, cy + 1, {
            font: 'arcade', size: lsize, color: s.text, maxW: this.w - (this.icon ? 70 : 24)
          });
        }
      }
    }
    if (this.badge) {
      Gfx.panel(c, this.w - 22, -8, 30, 22, { fill: Gfx.C.now, sink: '#4a1210', depth: 2, r: 11, lip: false });
      Gfx.text(c, this.badge, this.w - 7, 3, { size: 12, weight: 700, color: '#fff' });
    }
    c.restore();
  };

  /** A set of buttons a scene owns. Routes the pointer to them and
      remembers which one a press started on, so sliding off a button
      before letting go cancels it, the way a real button does. */
  function Buttons() {
    this.list = [];
    this.active = null;
  }
  Buttons.prototype.add = function (o) {
    var b = o instanceof Button ? o : new Button(o);
    this.list.push(b);
    return b;
  };
  Buttons.prototype.clear = function () { this.list = []; this.active = null; };
  Buttons.prototype.pointer = function (type, x, y) {
    var i, b;
    if (type === 'down') {
      for (i = this.list.length - 1; i >= 0; i--) {
        b = this.list[i];
        if (b.hit(x, y)) {
          this.active = b; b.pressed = true;
          if (window.Sfx) Sfx.play('press');
          if (window.Haptics) Haptics.tap();
          return true;
        }
      }
      return false;
    }
    if (!this.active) return false;
    b = this.active;
    if (type === 'move') {
      b.pressed = b.hit(x, y);
      return true;
    }
    if (type === 'up') {
      var fire = b.pressed && b.hit(x, y);
      b.pressed = false;
      this.active = null;
      if (fire) {
        Spring.kick(b.scale, 2.2);
        if (window.Sfx) Sfx.play('release');
        if (b.onTap) b.onTap(b);
      }
      return true;
    }
    b.pressed = false;
    this.active = null;
    return true;
  };
  Buttons.prototype.update = function (dt) {
    for (var i = 0; i < this.list.length; i++) this.list[i].update(dt);
  };
  Buttons.prototype.draw = function (c) {
    for (var i = 0; i < this.list.length; i++) this.list[i].draw(c);
  };

  /** Brings a row of buttons in one after another. */
  function stagger(buttons, gap, delay) {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].appear = 0;
      Tween.to(buttons[i], { appear: 1 }, 380, { ease: Ease.outCubic, delay: (delay || 0) + i * (gap || 60), real: true });
    }
  }

  return {
    init: init,
    define: define,
    go: go,
    current: function () { return sceneName; },
    scene: function () { return scene; },
    get: function (name) { return scenes[name]; },
    size: function () { return { W: W, H: H }; },
    /** The whole screen, and where the play column starts on it. */
    screen: function () { return { W: SW, H: SH, x: colX }; },
    safe: safe,
    now: function () { return now; },
    real: function () { return real; },
    still: function () { return still; },
    busy: function () { return !!trans; },
    shake: shake, hitstop: hitstop, slowmo: slowmo, punch: punch,
    pixelRatio: function () { return dpr; },
    stats: function () { return { fps: Math.round(stats.fps * 10) / 10, workMs: Math.round(stats.work * 100) / 100, dpr: dpr, particles: Particles.count() }; },
    block: function (on) { inputBlocked += on ? 1 : -1; if (inputBlocked < 0) inputBlocked = 0; },
    canvas: function () { return cv; },
    Button: Button, Buttons: Buttons, STYLE: STYLE, stagger: stagger
  };
})();
