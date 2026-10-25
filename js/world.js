/* ============================================================
   world.js  -  the place you are standing in
   ------------------------------------------------------------
   The four backgrounds - Deep Space, Sakura, Forest, Waterfalls - as
   living places drawn on the stage, instead of an SVG painted once
   behind a page and a layer of CSS-animated snow on top of it.

   IT IS ALWAYS THERE. Every scene in the game is played in front of
   it: the home screen, the map, the round, the boss fights. Change
   the background in Settings and the world behind the settings panel
   changes while you watch, because it is the same world.

   TWO KINDS OF THING IN IT
     Still things - the sky, mountains, trees, a planet - are painted
     ONCE into off-screen canvases when the theme or the screen size
     changes, and each frame is just those pictures stamped down.
     That is two image draws, which is nothing.
     Moving things - stars twinkling, petals falling, fireflies,
     water - are a few dozen small shapes drawn fresh every frame.

   DEPTH. The far picture and the near picture are drawn wider than
   the screen and slid by different amounts when a scene moves its
   camera, so the mountains move less than the trees. Parallax is the
   cheapest way there is to make a flat screen feel like a place.

   KEPT DARK ENOUGH TO READ OVER. Every theme is at dusk or at night.
   The old game held its bright themes back with a black layer so a
   card would read over them; a world drawn dusky in the first place
   needs far less of that, and keeps its colour.
   ============================================================ */

var World = (function () {

  var W = 0, H = 0, q = 1;
  /* THE FLOOR. Every theme was painted for a scene whose ground is the
     bottom of the screen - and the home screen's ground is half way up
     it, which buried the sakura's sun, hills and trees under the floor
     and left a flat purple sky. So each scene says where its floor is,
     and the scenery is laid out above that line. */
  var FH = 0, floorWanted = 0;
  /* Where the stage's play column starts. Scenes draw inside the column,
     translated across by this much; the world un-translates itself and
     always fills the whole screen. */
  var offX = 0;
  var cache = {}, cacheKeys = [];
  var theme = 'space';
  var back = null, front = null, ground = null;
  var old = null;              // the previous theme, fading out
  var oldAlpha = 0;
  var M = 28;                  // extra width either side, for parallax
  var t = 0;

  /* moving things */
  var twinkles = [], falling = [], flies = [], streaks = [], mist = [];
  var shooting = null, shootIn = 3000;

  var R = null;                // the seeded generator for the current build

  function rnd(a, b) { return a + R() * (b - a); }

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * q));
    c.height = Math.max(1, Math.round(h * q));
    var x = c.getContext('2d');
    x.setTransform(q, 0, 0, q, 0, 0);
    return { cv: c, ctx: x };
  }

  function vgrad(c, y0, y1, stops) {
    var g = c.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }

  /* ---------------- shapes ---------------- */

  /** The stepped pine from the old level map, on a canvas. The jagged
      edge is the whole point - a smooth-sided triangle is a tooth, not
      a tree. (x, y) is the foot of the trunk. */
  function pine(c, x, y, h, spread, steps, lean) {
    var w = h * 0.4, trunk = h * 0.12, top = y - h, bottom = y - trunk, span = bottom - top;
    /* The right-hand edge, top to bottom: out to a tier's tip, then back
       in to the tuck under it. The left edge is the same points mirrored
       and walked back up. */
    var edge = [], i, tt, yy, out;
    for (i = 1; i <= steps; i++) {
      tt = i / steps;
      yy = top + span * tt;
      out = w * spread * Math.pow(tt, 0.78) / 2;
      edge.push([out, yy]);
      if (i < steps) edge.push([out * 0.72, yy]);
    }
    c.beginPath();
    c.moveTo(x + lean, top);
    for (i = 0; i < edge.length; i++) c.lineTo(x + edge[i][0], edge[i][1]);
    c.lineTo(x + w * 0.07, bottom); c.lineTo(x + w * 0.07, y);
    c.lineTo(x - w * 0.07, y); c.lineTo(x - w * 0.07, bottom);
    for (i = edge.length - 1; i >= 0; i--) c.lineTo(x - edge[i][0], edge[i][1]);
    c.closePath();
    c.fill();
  }

  /** A row of hills or mountains: a ragged top edge across the whole
      layer - which is the screen plus the parallax margin on BOTH sides,
      so it runs from 0 to W + 2M in the layer's own coordinates. */
  function ridge(c, w, baseY, height, bumps, jag, fill) {
    var LW = W + M * 2;
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(0, H + 10);
    var prev = baseY;
    c.lineTo(0, baseY);
    for (var i = 0; i <= bumps; i++) {
      var x = LW * i / bumps;
      var y = baseY - height * (0.35 + 0.65 * R()) * (i % 2 ? 1 : 0.6);
      if (jag) c.lineTo(x, y);
      else c.quadraticCurveTo(x - (LW / bumps) / 2, (prev + y) / 2 - height * 0.25, x, y);
      prev = y;
    }
    c.lineTo(LW, H + 10);
    c.closePath();
    c.fill();
  }

  /** A cherry tree: a bent trunk, a couple of boughs, and the canopy as
      overlapping blobs. A cherry in flower is a cloud sitting in a tree;
      one smooth outline reads as a lollipop. */
  function blossom(c, x, y, h, fill, trunk) {
    var lean = (R() - 0.5) * h * 0.12;
    c.fillStyle = trunk;
    c.beginPath();
    c.moveTo(x - h * 0.03, y);
    c.quadraticCurveTo(x + lean * 0.4, y - h * 0.3, x - h * 0.012 + lean, y - h * 0.52);
    c.lineTo(x + h * 0.012 + lean, y - h * 0.52);
    c.quadraticCurveTo(x + lean * 0.6, y - h * 0.3, x + h * 0.03, y);
    c.closePath(); c.fill();
    c.lineWidth = h * 0.018; c.strokeStyle = trunk; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + lean * 0.5, y - h * 0.36); c.lineTo(x + lean + h * 0.14, y - h * 0.5); c.stroke();
    c.beginPath(); c.moveTo(x + lean * 0.5, y - h * 0.3); c.lineTo(x + lean - h * 0.13, y - h * 0.46); c.stroke();
    var blobs = 6 + Math.floor(R() * 3);
    var cy = y - h * 0.6;
    for (var i = 0; i < blobs; i++) {
      var a = (i / blobs) * Math.PI * 2 + R() * 0.6;
      var r = h * (0.1 + R() * 0.07);
      c.fillStyle = i % 3 === 0 ? Gfx.shade(fill, 0.12) : fill;
      c.beginPath();
      c.ellipse(x + lean + Math.cos(a) * h * (0.1 + R() * 0.06), cy + Math.sin(a) * h * (0.07 + R() * 0.05),
                r, r * 0.82, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = fill;
    c.beginPath(); c.ellipse(x + lean, cy, h * 0.15, h * 0.12, 0, 0, Math.PI * 2); c.fill();
  }

  /* ---------------- each theme, painted ---------------- */

  var THEME = {

    /* ---- Deep Space ----
       The default, and the screen most people look at most of the time.
       A nebula, a field of fixed stars, a ringed planet, and stars that
       twinkle and drift. */
    space: {
      seed: 7,
      tint: '#0a0e1a',
      paint: function (b, f, g) {
        var c = b.ctx;
        c.fillStyle = vgrad(c, 0, H, [[0, '#05070f'], [0.45, '#0c1328'], [1, '#18234a']]);
        c.fillRect(0, 0, W + M * 2, H);
        /* The nebula: big soft blobs of colour, very faint. */
        var blobs = [['#6a3aa8', 0.18], ['#2a7aa8', 0.14], ['#a83a7a', 0.10], ['#3a4aa8', 0.16]];
        for (var i = 0; i < 7; i++) {
          var bl = blobs[i % blobs.length];
          var x = rnd(0, W + M * 2), y = rnd(H * 0.05, H * 0.7), r = rnd(W * 0.35, W * 0.8);
          var gr = c.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, Gfx.rgba(bl[0], bl[1]));
          gr.addColorStop(1, Gfx.rgba(bl[0], 0));
          c.fillStyle = gr;
          c.fillRect(x - r, y - r, r * 2, r * 2);
        }
        /* A band of thicker stars across it, like looking edge-on into
           a galaxy. */
        for (i = 0; i < 260; i++) {
          var sx = rnd(0, W + M * 2);
          var band = (sx / (W + M * 2)) * H * 0.5 + H * 0.12;
          var sy = R() < 0.55 ? band + rnd(-H * 0.12, H * 0.12) : rnd(0, H);
          var a = rnd(0.15, 0.85);
          c.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
          var s = R() < 0.92 ? 1 : 2;
          c.fillRect(Math.round(sx), Math.round(sy), s, s);
        }
        /* The planet. */
        /* Sky things - the planet, the moon, the nebula - stay where they are
           in the sky whatever the floor; only what stands on the ground
           follows it. */
        var px = (W + M * 2) * 0.8, py = H * 0.16, pr = Math.min(W, H) * 0.13;
        Gfx.glow(c, px, py, pr * 2.4, '#7aa8ff', 0.16);
        var pg = c.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
        pg.addColorStop(0, '#f2b58a'); pg.addColorStop(0.55, '#c2667a'); pg.addColorStop(1, '#3a2450');
        c.fillStyle = pg;
        c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
        /* bands across it */
        c.save();
        c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.clip();
        for (i = 0; i < 5; i++) {
          c.fillStyle = 'rgba(255,255,255,' + (0.05 + R() * 0.06).toFixed(2) + ')';
          c.fillRect(px - pr, py - pr + (i + 0.5) * pr * 0.4, pr * 2, pr * 0.12);
        }
        /* the night side */
        var sh = c.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.2, px, py, pr * 1.1);
        sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(5,7,20,.75)');
        c.fillStyle = sh; c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        c.restore();
        /* the ring */
        c.save();
        c.translate(px, py); c.rotate(-0.35); c.scale(1, 0.28);
        c.lineWidth = pr * 0.22;
        c.strokeStyle = 'rgba(255,220,190,.45)';
        c.beginPath(); c.arc(0, 0, pr * 1.6, Math.PI * 0.02, Math.PI * 0.98, true); c.stroke();
        c.restore();
        /* A small moon, low on the other side. */
        var mx = (W + M * 2) * 0.16, my = Math.min(H * 0.34, FH * 0.7), mr = pr * 0.32;
        c.fillStyle = '#c9d4ec';
        c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(10,14,30,.55)';
        c.beginPath(); c.arc(mx + mr * 0.4, my - mr * 0.2, mr, 0, Math.PI * 2); c.fill();

        /* NEAR: a far-off rocky horizon, very dark, so the bottom of the
           screen has weight and a character has somewhere to stand. */
        var fc = f.ctx;
        ridge(fc, W, FH * 0.9, FH * 0.06, 9, true, '#0b1124');
        ridge(fc, W, FH * 0.96, FH * 0.05, 7, true, '#070b18');

        paintGround(g.ctx, '#1c2440', '#283356', '#0e1428', function (c2, w) {
          /* craters */
          for (var k = 0; k < 9; k++) {
            var cx2 = rnd(0, w), cy2 = rnd(26, 120), cr = rnd(6, 18);
            c2.fillStyle = 'rgba(0,0,0,.25)';
            c2.beginPath(); c2.ellipse(cx2, cy2, cr, cr * 0.35, 0, 0, Math.PI * 2); c2.fill();
            c2.fillStyle = 'rgba(255,255,255,.06)';
            c2.beginPath(); c2.ellipse(cx2, cy2 + cr * 0.12, cr * 0.8, cr * 0.22, 0, 0, Math.PI); c2.fill();
          }
        });
      },
      spawn: function () {
        for (var i = 0; i < 34; i++) {
          twinkles.push({ x: rnd(0, W), y: rnd(0, FH * 0.85), r: rnd(0.8, 2.2), ph: rnd(0, 6.28), sp: rnd(0.8, 2.4),
                          vy: rnd(3, 10), col: Gfx.pick(['#ffffff', '#cddcff', '#9db7ff', '#fff0c4']) });
        }
      }
    },

    /* ---- Sakura ----
       A valley at dusk: violet sky going pink at the horizon, a big
       low sun, two rows of hills and cherry trees, and petals that
       drift and turn as they fall. */
    sakura: {
      seed: 20260401,
      tint: '#2a1838',
      paint: function (b, f, g) {
        var c = b.ctx;
        c.fillStyle = vgrad(c, 0, FH, [[0, '#1f1233'], [0.38, '#4a2550'], [0.66, '#b8577a'], [0.82, '#f0a0a8'], [1, '#f6c8c0']]);
        c.fillRect(0, 0, W + M * 2, H);
        /* The sun, sitting on the hills. */
        var sx = (W + M * 2) * 0.62, sy = FH * 0.62, sr = Math.min(W, H) * 0.16;
        Gfx.glow(c, sx, sy, sr * 3.2, '#ffd0b0', 0.32);
        c.fillStyle = '#ffe6d2';
        c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
        /* stripes across the low sun - the retro trick that says dusk */
        c.fillStyle = 'rgba(240,160,168,.9)';
        for (var i = 0; i < 4; i++) c.fillRect(sx - sr, sy + sr * (0.15 + i * 0.2), sr * 2, sr * (0.04 + i * 0.025));
        /* A few early stars up top. */
        for (i = 0; i < 40; i++) {
          c.fillStyle = 'rgba(255,240,250,' + rnd(0.15, 0.7).toFixed(2) + ')';
          c.fillRect(rnd(0, W + M * 2) | 0, rnd(0, FH * 0.35) | 0, 1, 1);
        }
        ridge(c, W, FH * 0.66, FH * 0.14, 6, false, '#7a3a6a');
        ridge(c, W, FH * 0.72, FH * 0.1, 8, false, '#5e2a58');

        var fc = f.ctx;
        ridge(fc, W, FH * 0.8, FH * 0.06, 10, false, '#3e1a40');
        /* far trees, small and pale; near trees, big and dark */
        var n = 6;
        for (i = 0; i < n; i++) {
          blossom(fc, rnd(0, W + M * 2), FH * rnd(0.79, 0.83), FH * rnd(0.12, 0.16), '#e89ab8', '#5a2a4a');
        }
        ridge(fc, W, FH * 0.9, FH * 0.05, 9, false, '#2a1030');
        blossom(fc, M + W * 0.04, FH * 0.93, FH * 0.34, '#f7b8d2', '#3a1630');
        blossom(fc, M + W * 0.98, FH * 0.95, FH * 0.3, '#f4a8c8', '#3a1630');

        paintGround(g.ctx, '#3a1a3c', '#542656', '#220e26', function (c2, w) {
          for (var k = 0; k < 40; k++) {
            c2.fillStyle = Gfx.pick(['#ffd7e6', '#ffc0d8', '#ff9ec4']);
            c2.globalAlpha = rnd(0.4, 0.9);
            c2.beginPath(); c2.ellipse(rnd(0, w), rnd(20, 130), rnd(2, 4), rnd(1, 2), rnd(0, 3), 0, Math.PI * 2); c2.fill();
          }
          c2.globalAlpha = 1;
        });
      },
      spawn: function () {
        for (var i = 0; i < 26; i++) falling.push(newPetal(true));
      }
    },

    /* ---- Forest ----
       A pine wood in the last of the light: three ranks of the stepped
       pines, fog lying between them, shafts of light through the gaps,
       and fireflies coming out. */
    forest: {
      seed: 1337,
      tint: '#0c1f1c',
      paint: function (b, f, g) {
        var c = b.ctx;
        c.fillStyle = vgrad(c, 0, FH, [[0, '#08141a'], [0.4, '#123228'], [0.75, '#3f7a5c'], [1, '#86b88a']]);
        c.fillRect(0, 0, W + M * 2, H);
        /* a pale low moon behind the trees */
        var mx = (W + M * 2) * 0.3, my = FH * 0.3, mr = Math.min(W, H) * 0.09;
        Gfx.glow(c, mx, my, mr * 4, '#e6ffd8', 0.18);
        c.fillStyle = '#eef8e0';
        c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
        var i, x;
        /* far rank: pale, small, packed */
        c.fillStyle = '#2c5a48';
        for (i = 0; i < 26; i++) {
          x = rnd(-M, W + M * 3);
          pine(c, x, FH * rnd(0.6, 0.64), FH * rnd(0.14, 0.22), rnd(0.9, 1.2), 5 + (R() * 3 | 0), rnd(-2, 2));
        }
        /* fog over the far rank */
        c.fillStyle = vgrad(c, FH * 0.5, FH * 0.7, [[0, 'rgba(180,230,200,0)'], [0.6, 'rgba(180,230,200,.28)'], [1, 'rgba(180,230,200,0)']]);
        c.fillRect(0, FH * 0.5, W + M * 2, FH * 0.2);
        c.fillStyle = '#1a3a2e';
        for (i = 0; i < 16; i++) {
          x = rnd(-M, W + M * 3);
          pine(c, x, FH * rnd(0.72, 0.76), FH * rnd(0.22, 0.32), rnd(0.9, 1.25), 6 + (R() * 3 | 0), rnd(-3, 3));
        }

        var fc = f.ctx;
        fc.fillStyle = vgrad(fc, FH * 0.7, FH * 0.86, [[0, 'rgba(150,210,180,0)'], [0.6, 'rgba(150,210,180,.22)'], [1, 'rgba(150,210,180,0)']]);
        fc.fillRect(0, FH * 0.7, W + M * 2, FH * 0.16);
        fc.fillStyle = '#0c1f18';
        for (i = 0; i < 9; i++) {
          x = rnd(-M, W + M * 3);
          if (x > M + W * 0.25 && x < M + W * 0.75 && R() < 0.75) continue;   // keep the middle clear
          pine(fc, x, FH * rnd(0.92, 0.98), FH * rnd(0.38, 0.55), rnd(0.95, 1.2), 7 + (R() * 3 | 0), rnd(-4, 4));
        }

        paintGround(g.ctx, '#12301f', '#1d4a2e', '#0a1c12', function (c2, w) {
          for (var k = 0; k < 30; k++) {
            c2.strokeStyle = Gfx.pick(['#2f6a3e', '#3e7a48', '#24552f']);
            c2.lineWidth = 2;
            var gx = rnd(0, w), gy = rnd(14, 40);
            c2.beginPath(); c2.moveTo(gx, gy + 8); c2.lineTo(gx + rnd(-3, 3), gy); c2.stroke();
          }
        });
      },
      spawn: function () {
        for (var i = 0; i < 18; i++) {
          flies.push({ x: rnd(0, W), y: rnd(FH * 0.35, FH * 0.85), ph: rnd(0, 6.28), sp: rnd(0.4, 1.1), r: rnd(1.5, 2.8) });
        }
        for (i = 0; i < 9; i++) falling.push(newLeaf(true));
      }
    },

    /* ---- Waterfalls ----
       Composed rather than scattered: a wall of rock with three falls
       cut into it at uneven spacing, the pool they land in, near rock
       on both sides putting you inside the gorge, and water that
       actually falls. */
    falls: {
      seed: 99,
      tint: '#0a1a2e',
      paint: function (b, f, g) {
        var c = b.ctx;
        c.fillStyle = vgrad(c, 0, FH, [[0, '#06101e'], [0.45, '#14324e'], [0.8, '#3f7c9c'], [1, '#7ab6cc']]);
        c.fillRect(0, 0, W + M * 2, H);
        for (var i = 0; i < 50; i++) {
          c.fillStyle = 'rgba(220,240,255,' + rnd(0.15, 0.6).toFixed(2) + ')';
          c.fillRect(rnd(0, W + M * 2) | 0, rnd(0, FH * 0.3) | 0, 1, 1);
        }
        /* the far wall: one ragged silhouette */
        c.fillStyle = '#1a3a52';
        c.beginPath(); c.moveTo(-M, H);
        for (i = 0; i <= 14; i++) c.lineTo(-M + (W + M * 2) * i / 14, FH * (0.34 + R() * 0.08));
        c.lineTo(W + M, H); c.closePath(); c.fill();
        /* Three falls, spaced unevenly - evenly spaced reads as a fountain,
           something built, rather than a river finding three low places
           in a cliff. Their positions are kept for the animated water. */
        var at = [0.2 + R() * 0.08, 0.46 + R() * 0.07, 0.74 + R() * 0.08];
        THEME.falls.cols = [];
        for (i = 0; i < 3; i++) {
          var fx = M + W * at[i], wide = W * (0.05 + R() * 0.04), lip = FH * (0.4 + R() * 0.05);
          THEME.falls.cols.push({ x: fx, w: wide, top: lip, bottom: FH * 0.84 });
          c.fillStyle = 'rgba(160,214,236,.85)';
          c.beginPath();
          c.moveTo(fx - wide / 2, lip); c.lineTo(fx + wide / 2, lip);
          c.lineTo(fx + wide * 0.85, FH * 0.84); c.lineTo(fx - wide * 0.85, FH * 0.84);
          c.closePath(); c.fill();
        }
        /* the pool */
        c.fillStyle = '#2a6688';
        c.beginPath(); c.ellipse(M + W / 2, FH * 0.9, W * 0.8, FH * 0.08, 0, 0, Math.PI * 2); c.fill();

        var fc = f.ctx;
        /* near rock, both sides */
        fc.fillStyle = '#0c1c2a';
        fc.beginPath(); fc.moveTo(-M, FH * 0.46); fc.lineTo(M + W * 0.18, FH * 0.56); fc.lineTo(M + W * 0.26, H); fc.lineTo(-M, H); fc.closePath(); fc.fill();
        fc.beginPath(); fc.moveTo(W + M * 3, FH * 0.44); fc.lineTo(M + W * 0.82, FH * 0.58); fc.lineTo(M + W * 0.74, H); fc.lineTo(W + M * 3, H); fc.closePath(); fc.fill();
        /* moss on the near rock */
        /* Moss along the top lip of each near rock - a thin rim of colour
           where the light catches, not a slab. */
        fc.strokeStyle = '#2f6a4e'; fc.lineWidth = 3; fc.lineCap = 'round';
        fc.beginPath(); fc.moveTo(0, FH * 0.465); fc.lineTo(M + W * 0.18, FH * 0.562); fc.stroke();
        fc.beginPath(); fc.moveTo(W + M * 2, FH * 0.445); fc.lineTo(M + W * 0.82, FH * 0.582); fc.stroke();

        paintGround(g.ctx, '#1a3448', '#24485e', '#0e1e2c', function (c2, w) {
          for (var k = 0; k < 14; k++) {
            var sx2 = rnd(0, w), sy2 = rnd(30, 120), sr2 = rnd(5, 14);
            c2.fillStyle = Gfx.pick(['#2a4a60', '#335a72', '#1f3a4e']);
            c2.beginPath(); c2.ellipse(sx2, sy2, sr2, sr2 * 0.5, 0, 0, Math.PI * 2); c2.fill();
            c2.fillStyle = 'rgba(200,240,255,.12)';
            c2.beginPath(); c2.ellipse(sx2 - sr2 * 0.2, sy2 - sr2 * 0.2, sr2 * 0.5, sr2 * 0.18, 0, 0, Math.PI * 2); c2.fill();
          }
        });
      },
      spawn: function () {
        var cols = THEME.falls.cols || [];
        for (var i = 0; i < cols.length; i++) {
          for (var k = 0; k < 7; k++) {
            streaks.push({ col: i, y: rnd(0, 1), sp: rnd(0.35, 0.7), dx: rnd(-0.4, 0.4), len: rnd(0.08, 0.2) });
          }
          for (k = 0; k < 6; k++) mist.push({ col: i, age: rnd(0, 2000), life: rnd(1600, 2600), dx: rnd(-1, 1) });
        }
        for (i = 0; i < 18; i++) falling.push(newDrop(true));
      }
    }
  };

  /** The ground a character stands on, painted into a strip 160px tall
      that a scene stamps down wherever its floor is. A top edge with a
      lip of lighter colour, a body, and whatever that theme scatters on
      it. */
  var groundBody = '#000';

  function paintGround(c, top, lip, body, extra) {
    var w = W + M * 2;
    groundBody = body;
    c.fillStyle = vgrad(c, 0, 160, [[0, top], [1, body]]);
    c.beginPath();
    c.moveTo(0, 12);
    for (var i = 0; i <= 16; i++) c.lineTo(w * i / 16, 8 + R() * 8);
    c.lineTo(w, 160); c.lineTo(0, 160); c.closePath(); c.fill();
    c.fillStyle = lip;
    c.fillRect(0, 10, w, 4);
    if (extra) extra(c, w);
  }

  /* ---------------- falling things ---------------- */

  function newPetal(anywhere) {
    return { kind: 'petal', x: rnd(-20, W + 20), y: anywhere ? rnd(-20, H) : rnd(-60, -10),
             vy: rnd(28, 60), vx: rnd(-20, 6), r: rnd(3, 5.5), rot: rnd(0, 6.28), spin: rnd(-2, 2),
             ph: rnd(0, 6.28), col: Gfx.pick(['#ffd7e6', '#ffc0d8', '#ff9ec4', '#fff0f6']) };
  }
  function newLeaf(anywhere) {
    return { kind: 'leaf', x: rnd(-20, W + 20), y: anywhere ? rnd(-20, H) : rnd(-60, -10),
             vy: rnd(22, 44), vx: rnd(-10, 10), r: rnd(3.5, 6), rot: rnd(0, 6.28), spin: rnd(-1.5, 1.5),
             ph: rnd(0, 6.28), col: Gfx.pick(['#a8d98a', '#7fbf63', '#d8e89a', '#5fa34d']) };
  }
  function newDrop(anywhere) {
    return { kind: 'drop', x: rnd(0, W), y: anywhere ? rnd(-20, H) : rnd(-60, -10),
             vy: rnd(260, 420), vx: rnd(-14, -4), r: rnd(1, 1.6), rot: 0, spin: 0, ph: 0,
             col: Gfx.pick(['#cfeaf6', '#9fd4ea', '#eaf7fd']) };
  }

  /* ---------------- build ---------------- */

  function build() {
    if (!W || !H) return;
    q = Math.min(window.devicePixelRatio || 1, 1.5);
    FH = Math.round(floorWanted > 0 && floorWanted < H ? floorWanted : H);
    var def = THEME[theme] || THEME.space;
    /* Painting a theme is a few dozen milliseconds of shapes. Scenes swap
       between two or three floors, so the last few paintings are kept
       rather than redone on every trip home and back. */
    var key = theme + '|' + W + '|' + H + '|' + FH + '|' + q;
    var hit = cache[key];
    twinkles = []; falling = []; flies = []; streaks = []; mist = [];
    if (hit) {
      back = hit.back; front = hit.front; ground = hit.ground;
      groundBody = hit.groundBody; THEME.falls.cols = hit.cols;
    } else {
      R = Gfx.rng(def.seed);
      back = canvas(W + M * 2, H);
      front = canvas(W + M * 2, H);
      ground = canvas(W + M * 2, 160);
      def.paint(back, front, ground);
      cache[key] = { back: back, front: front, ground: ground, groundBody: groundBody, cols: THEME.falls.cols };
      cacheKeys.push(key);
      if (cacheKeys.length > 4) delete cache[cacheKeys.shift()];
    }
    /* The moving things use their own unseeded randomness so they do not
       repeat in step with the scenery. */
    R = Math.random;
    def.spawn();
  }

  function resize(w, h) {
    if (w === W && h === H && back) return;
    W = w; H = h;
    build();
  }

  /** Where the current scene's floor is, in px from the top. 0 (or
      anything below the screen) means the bottom of the screen. */
  function setFloor(y) {
    y = Math.round(y || 0);
    if (Math.abs(y - floorWanted) < 3) return;
    floorWanted = y;
    build();
  }

  /** Changes theme with a cross-fade: the old world is kept and faded
      out over the new one rather than cut. */
  function setTheme(id, instant) {
    if (!THEME[id]) id = 'space';
    if (id === theme && back) return;
    /* The old pictures are kept and faded out by update(), over the new
       ones, rather than cut. */
    if (!instant && back) {
      old = { back: back, front: front, ground: ground };
      oldAlpha = 1;
    }
    theme = id;
    build();
  }

  /* ---------------- per frame ---------------- */

  function update(dt) {
    t += dt;
    var s = dt / 1000, i, p;
    if (oldAlpha > 0 && old) {
      oldAlpha = Math.max(0, oldAlpha - dt / 650);
      if (oldAlpha === 0) old = null;
    }
    for (i = 0; i < twinkles.length; i++) {
      p = twinkles[i];
      p.y += p.vy * s;
      if (p.y > H * 0.9) { p.y = -4; p.x = Math.random() * W; }
    }
    for (i = 0; i < falling.length; i++) {
      p = falling[i];
      p.y += p.vy * s;
      p.x += (p.vx + Math.sin(t / 700 + p.ph) * (p.kind === 'drop' ? 0 : 22)) * s;
      p.rot += p.spin * s;
      if (p.y > H + 20 || p.x < -40 || p.x > W + 40) {
        falling[i] = p.kind === 'petal' ? newPetal(false) : p.kind === 'leaf' ? newLeaf(false) : newDrop(false);
      }
    }
    for (i = 0; i < flies.length; i++) {
      p = flies[i];
      p.x += Math.cos(t / 900 * p.sp + p.ph) * 14 * s;
      p.y += Math.sin(t / 1300 * p.sp + p.ph * 1.7) * 9 * s;
    }
    for (i = 0; i < streaks.length; i++) {
      p = streaks[i];
      p.y += p.sp * s;
      if (p.y > 1.05) p.y -= 1.2;
    }
    for (i = 0; i < mist.length; i++) {
      p = mist[i];
      p.age += dt;
      if (p.age > p.life) { p.age = 0; p.dx = Math.random() * 2 - 1; }
    }
    if (theme === 'space') {
      shootIn -= dt;
      if (shootIn <= 0 && !shooting) {
        shooting = { x: Math.random() * W * 0.7 + W * 0.2, y: Math.random() * H * 0.35, age: 0, life: 700 };
        shootIn = 3500 + Math.random() * 6000;
      }
      if (shooting) { shooting.age += dt; if (shooting.age > shooting.life) shooting = null; }
    }
  }

  function drawLayers(ctx, L, a, camX, camY) {
    if (!L) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(L.back.cv, -M - camX * 0.35, -camY * 0.2, W + M * 2, H);
    ctx.drawImage(L.front.cv, -M - camX, -camY * 0.5, W + M * 2, H);
    ctx.restore();
  }

  /** Paints the world. Options:
        camX, camY   parallax offset in px (clamped to the margin)
        dim          0..1 of darkness laid over it, for a round
        tint         a colour washed over it (the red of the final rush)
        tintAmt      0..1 */
  function draw(ctx, w, h, o) {
    o = o || {};
    if (!back) return;
    ctx.save();
    ctx.translate(-offX, 0);
    w = W; h = H;
    var camX = Gfx.clamp(o.camX || 0, -M, M), camY = Gfx.clamp(o.camY || 0, -M, M);
    drawLayers(ctx, { back: back, front: front }, 1, camX, camY);
    var i, p, a;

    /* stars */
    for (i = 0; i < twinkles.length; i++) {
      p = twinkles[i];
      a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * p.sp * 2 + p.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.r / 2 - camX * 0.35, p.y - p.r / 2, p.r, p.r);
      if (p.r > 1.8 && a > 0.8) {
        ctx.fillRect(p.x - p.r * 2 - camX * 0.35, p.y - 0.5, p.r * 4, 1);
        ctx.fillRect(p.x - 0.5 - camX * 0.35, p.y - p.r * 2, 1, p.r * 4);
      }
    }
    ctx.globalAlpha = 1;
    if (shooting) {
      var k = shooting.age / shooting.life;
      var sx = shooting.x + k * 160, sy = shooting.y + k * 70;
      var gr = ctx.createLinearGradient(sx, sy, sx - 90, sy - 40);
      gr.addColorStop(0, 'rgba(255,255,255,' + (1 - k).toFixed(2) + ')');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 90, sy - 40); ctx.stroke();
    }

    /* forest light shafts, gently breathing */
    if (theme === 'forest') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < 4; i++) {
        a = 0.05 + 0.04 * Math.sin(t / 2200 + i * 1.7);
        var rx = W * (0.15 + i * 0.24) - camX * 0.6;
        var gr2 = ctx.createLinearGradient(rx, 0, rx + W * 0.25, H * 0.8);
        gr2.addColorStop(0, 'rgba(220,255,200,' + a.toFixed(3) + ')');
        gr2.addColorStop(1, 'rgba(220,255,200,0)');
        ctx.fillStyle = gr2;
        ctx.beginPath();
        ctx.moveTo(rx, 0); ctx.lineTo(rx + W * 0.08, 0);
        ctx.lineTo(rx + W * 0.34, H * 0.85); ctx.lineTo(rx + W * 0.2, H * 0.85);
        ctx.closePath(); ctx.fill();
      }
      for (i = 0; i < flies.length; i++) {
        p = flies[i];
        a = 0.4 + 0.6 * Math.max(0, Math.sin(t / 600 * p.sp + p.ph));
        Gfx.glow(ctx, p.x - camX * 0.8, p.y, p.r * 6, '#e8ff8a', a * 0.55);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#f8ffc8';
        ctx.fillRect(p.x - camX * 0.8 - 1, p.y - 1, 2, 2);
      }
      ctx.restore();
    }

    /* waterfall water: bright streaks running down each fall, and mist
       rising where it lands */
    if (theme === 'falls' && THEME.falls.cols) {
      var cols = THEME.falls.cols;
      ctx.save();
      for (i = 0; i < streaks.length; i++) {
        p = streaks[i];
        var col = cols[p.col]; if (!col) continue;
        var span = col.bottom - col.top;
        var y0 = col.top + span * p.y, y1 = y0 + span * p.len;
        var spread = (p.y) * col.w * 0.35;
        var x0 = col.x - M - camX * 0.35 + p.dx * (col.w * 0.35 + spread);
        ctx.strokeStyle = 'rgba(240,252,255,.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0, Math.max(col.top, y0)); ctx.lineTo(x0 + p.dx * 2, Math.min(col.bottom, y1)); ctx.stroke();
      }
      for (i = 0; i < mist.length; i++) {
        p = mist[i];
        var c2 = cols[p.col]; if (!c2) continue;
        var kk = p.age / p.life;
        ctx.globalAlpha = 0.28 * Math.sin(kk * Math.PI);
        ctx.fillStyle = '#e6f8ff';
        ctx.beginPath();
        ctx.arc(c2.x - M - camX * 0.35 + p.dx * c2.w * kk * 1.4, c2.bottom - kk * H * 0.06, c2.w * (0.4 + kk * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* falling petals, leaves and drops */
    for (i = 0; i < falling.length; i++) {
      p = falling[i];
      ctx.fillStyle = p.col;
      if (p.kind === 'drop') {
        ctx.globalAlpha = 0.6;
        ctx.fillRect(p.x, p.y, p.r, p.r * 7);
        continue;
      }
      ctx.globalAlpha = 0.85;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(t / 400 + p.ph)));
      ctx.beginPath();
      if (p.kind === 'leaf') {
        ctx.moveTo(0, -p.r); ctx.quadraticCurveTo(p.r, 0, 0, p.r); ctx.quadraticCurveTo(-p.r, 0, 0, -p.r);
      } else ctx.ellipse(0, 0, p.r, p.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (old && oldAlpha > 0) drawLayers(ctx, old, oldAlpha, camX, camY);

    if (o.tint && o.tintAmt > 0) {
      ctx.fillStyle = Gfx.rgba(o.tint, o.tintAmt);
      ctx.fillRect(0, 0, w, h);
    }
    if (o.dim > 0) {
      ctx.fillStyle = 'rgba(5,8,18,' + o.dim.toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  /** Stamps the theme's ground down with its top edge at `y`. */
  function drawGround(ctx, y, camX) {
    if (!ground) return;
    ctx.save();
    ctx.translate(-offX, 0);
    ctx.drawImage(ground.cv, -M - (camX || 0), y - 12, W + M * 2, 160);
    if (y + 146 < H) {
      /* Taller screens: the strip is only 160px, so the rest is filled
         with the colour the strip's own gradient ends on, which is the
         one colour that cannot leave a seam. */
      ctx.fillStyle = groundBody;
      ctx.fillRect(0, y + 146, W, H - y - 146);
    }
    ctx.restore();
  }

  return {
    resize: resize,
    setFloor: setFloor,
    offset: function (x) { offX = x || 0; },
    setTheme: setTheme,
    theme: function () { return theme; },
    tint: function () { return (THEME[theme] || THEME.space).tint; },
    update: update,
    draw: draw,
    drawGround: drawGround
  };
})();
