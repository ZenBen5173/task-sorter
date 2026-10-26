/* ============================================================
   doodle.js  -  everyone, drawn in marker
   ------------------------------------------------------------
   Your character, the gear, the four bosses and the thirteen pets,
   drawn the way you would on the desk: a wobbly ink line, with the
   colour laid down a little off it, like a cheap print where the
   plates slipped. (Board C2 on the design canvas.)

   THEY ARE SHAPES, NOT PICTURES. Each one is a list of polygons,
   ellipses and pen strokes on its own little grid. The first time
   one is asked for it is drawn once into a canvas big enough for a
   phone screen, and from then on it is just another sprite: Gfx and
   Sprites hand it out under the same name the pixel art had, so
   nothing that draws a boss or a pet had to change.

   HOW A SHAPE IS INKED
     fill   the colour, nudged down and right, no outline
     line   the outline, on the true spot, every edge cut into short
            steps and each step pushed about a little - the same
            shape always wobbles the same way, so nothing shimmers
   Eyes and shine are solid ink and sit exactly where they are drawn.
   ============================================================ */

var Doodle = (function () {
  var INK = '#2a1e12';
  var EYE = '#1c1a24', SHINE = '#ffffff';

  function P(pts, fill, o) { return { t: 'p', pts: pts, fill: fill, o: o || {} }; }
  function E(cx, cy, rx, ry, fill, o) { return { t: 'e', cx: cx, cy: cy, rx: rx, ry: ry, fill: fill, o: o || {} }; }
  function L(d, w, c) { return { t: 'l', d: d, w: w || 2, c: c || INK }; }
  /* the two eyes, with their shine, that almost everyone has */
  function eyes(x1, x2, y, rx, ry) {
    return [E(x1, y, rx, ry, EYE), E(x2, y, rx, ry, EYE),
            E(x1 + rx * 0.35, y - ry * 0.35, rx * 0.36, ry * 0.32, SHINE), E(x2 + rx * 0.35, y - ry * 0.35, rx * 0.36, ry * 0.32, SHINE)];
  }
  function cheeks(x1, x2, y, r) {
    return [E(x1, y, r, r * 0.65, '#e8968a', { flat: 1, a: 0.7 }), E(x2, y, r, r * 0.65, '#e8968a', { flat: 1, a: 0.7 })];
  }

  /* ---------------- your character: 120 x 160, feet on the floor ---------------- */
  var HERO = [
    P('30,148 58,146 59,158 28,158', '#6b4a2e'), P('62,146 90,148 92,158 61,158', '#6b4a2e'),
    P('42,110 58,110 57,148 41,148', '#3a3a46'), P('62,110 78,110 79,148 63,148', '#3a3a46'),
    P('36,72 22,104 31,109 44,84', '#2b3a55'),
    P('34,70 86,70 92,116 28,116', '#2b3a55'),
    P('31,90 46,90 46,99 30,99', '#e0524a'), P('46,90 60,90 60,99 46,99', '#4a86c4'),
    P('60,90 74,90 74,99 60,99', '#f2a03d'), P('74,90 89,90 90,99 74,99', '#8a929e'),
    P('84,72 98,104 89,109 76,84', '#2b3a55'),
    P('20,102 30,106 28,114 18,111', '#f2cfa8'), P('100,102 90,106 92,114 102,111', '#f2cfa8'),
    P('38,18 82,18 91,36 89,60 77,71 43,71 31,60 29,36', '#f2cfa8'),
    P('34,8 86,8 93,32 84,28 76,34 64,26 52,34 42,26 27,32', '#3b2a20'),
    P('28,28 92,28 93,36 27,36', '#2fb3a8'), P('92,29 108,22 104,38 92,35', '#2fb3a8')
  ].concat(eyes(49, 71, 48, 4, 5.5), cheeks(41, 79, 58, 4), [L('M54 60 Q60 65 66 60', 2.4)]);

  /* ---------------- the gear: 40 x 40, worn on the arm or held up ---------------- */
  function shield(body, inner, rim, crest) {
    var s = [P('4,6 20,2 36,6 34,24 20,38 6,24', rim || body)];
    if (rim) s.push(P('8,9 20,6 32,9 30,23 20,33 10,23', body));
    if (inner) s.push(P('12,11 20,9 28,11 27,21 20,28 13,21', inner));
    if (crest) s.push(P('20,11 26,18 20,26 14,18', crest));
    return s;
  }
  function blade(pts, col, guard, grip, pommel) {
    return [P(pts, col), P(guard, '#8a5a2a'), P(grip, '#6b4a2e'), E(pommel[0], pommel[1], 2.4, 2.4, '#c9a24a')];
  }
  var GEAR = {
    woodshield: shield('#a8703a', null, null, null).concat([L('M15 5 L15 30 M25 5 L25 30', 1.6, '#6b4a2e'), E(20, 17, 3.4, 3.4, '#6e7680')]),
    silvershield: shield('#b8c0c8', '#dfe5ec'),
    goldshield: shield('#e8b030', '#ffd862'),
    diamondshield: shield('#58c8e0', '#a6ecf6', null, '#ffffff'),
    diamondgoldshield: shield('#58c8e0', '#a6ecf6', '#e8b030', '#ffd862'),
    dagger: blade('17,26 23,26 22,10 20,6 18,10', '#dfe5ec', '13,26 27,26 27,29 13,29', '18,29 22,29 22,35 18,35', [20, 37]),
    longsword: blade('18,27 22,27 22,6 20,1 18,6', '#dfe5ec', '11,27 29,27 29,30 11,30', '18,30 22,30 22,36 18,36', [20, 38]),
    goldsword: blade('17,27 23,27 23,7 20,1 17,7', '#ffd23f', '10,27 30,27 29,31 11,31', '18,31 22,31 22,36 18,36', [20, 38]),
    bronzeblade: blade('14,27 24,27 27,8 22,2 14,4', '#d08a4a', '10,27 28,27 28,30 10,30', '17,30 21,30 21,36 17,36', [19, 38]),
    wingedblade: [P('4,24 14,20 17,27 9,30', '#ffffff'), P('36,24 26,20 23,27 31,30', '#ffffff'),
                  P('17,26 23,26 23,6 20,0 17,6', '#b6a4f0'), P('19,8 21,8 21,22 19,22', '#ffffff'),
                  P('12,26 28,26 28,29 12,29', '#8a5aa8'), P('18,29 22,29 22,35 18,35', '#3b2032'), E(20, 37, 2.6, 2.6, '#ffd23f')]
  };

  /* ---------------- the bosses: busts on a 100 x 110 grid ---------------- */
  function bust(skin, hair, shirt, extra) {
    return [P('12,108 88,108 82,70 18,70', shirt),
            P('28,18 72,18 80,34 78,56 68,66 32,66 22,56 20,34', skin)]
      .concat(hair, eyes(41, 59, 42, 3.4, 4.6), extra);
  }
  var BOSSES = {
    steve: bust('#f0c89c', [P('24,10 76,10 82,30 18,30', '#7a5a3a')], '#4f9a5c', [
      L('M40 34 L46 32', 2.4), L('M54 32 L60 34', 2.4), L('M42 55 Q50 51 58 55', 2.4),
      P('56,2 80,0 82,22 58,24', '#ffe066'), L('M60 8 L76 7 M60 13 L72 12', 1.6, '#b39a2a'),
      P('30,78 44,78 44,100 30,100', '#f7f0dc'), P('33,74 41,74 41,80 33,80', '#c2412f')]),
    carla: bust('#d9a27a', [P('20,12 80,12 86,48 78,40 74,22 26,22 22,40 14,48', '#3b2032')], '#8a5aa8', [
      L('M40 34 L47 36', 2.4), L('M53 36 L60 34', 2.4), L('M43 55 L57 55', 2.4),
      L('M18 50 v12 a4 4 0 0 0 8 0 v-10 a2.5 2.5 0 0 0 -5 0 v8', 1.8, '#6e7680'),
      L('M74 50 v12 a4 4 0 0 0 8 0 v-10 a2.5 2.5 0 0 0 -5 0 v8', 1.8, '#6e7680')]),
    ivan: bust('#f2d2b0', [P('18,6 82,6 84,22 16,22', '#4a86c4'), P('22,0 78,0 80,8 20,8', '#f7f0dc')], '#2f5f8a', [
      L('M38 35 L45 35', 2.4), L('M55 35 L62 35', 2.4), E(50, 57, 4, 3, EYE)]),
    dan: bust('#e8b48c', [P('22,14 30,0 38,12 46,-2 54,12 62,0 70,12 78,4 78,26 22,26', '#e0524a'),
                          P('32,10 40,4 46,12 54,4 60,12 68,6 68,20 32,20', '#f2a03d')], '#3a3a46', [
      L('M38 34 L47 38', 2.6), L('M53 38 L62 34', 2.6), L('M42 57 Q50 52 58 57', 2.4),
      P('46,72 54,72 56,98 50,104 44,98', '#c2412f'),
      E(70, 88, 9, 9, '#fffdf6'), L('M70 88 L70 82 M70 88 L75 90', 1.8)])
  };

  /* ---------------- the pets: 80 x 70, facing right as drawn ---------------- */
  var PETS = {
    duck: [P('14,40 30,30 62,30 70,48 60,64 20,64', '#ffd23f'), P('46,10 64,10 70,24 64,36 46,36 40,24', '#ffd23f'),
           P('68,20 80,23 68,28', '#f2a03d'), P('22,42 40,40 38,54 24,54', '#f2b92a'),
           P('30,64 34,64 34,70 26,70', '#f2a03d'), P('48,64 52,64 52,70 44,70', '#f2a03d'),
           E(58, 20, 2.6, 3.2, EYE), E(59, 19, 0.9, 1, SHINE)],
    kitten: [P('64,50 76,34 79,38 68,58', '#8a929e'), P('16,36 64,36 68,66 12,66', '#8a929e'),
             P('18,14 26,2 32,14 48,14 54,2 62,14 66,30 58,40 22,40 14,30', '#8a929e'),
             P('24,12 27,6 30,12', '#e8968a'), P('50,12 53,6 56,12', '#e8968a'),
             P('22,48 56,48 56,53 22,53', '#6f7782'), P('38,31 42,31 40,34', '#e8968a')].concat(eyes(32, 48, 26, 2.8, 3.6)),
    mushroom: [P('26,40 54,40 56,68 24,68', '#f4ead2'), P('6,40 14,18 30,6 50,6 66,18 74,40', '#e0524a'),
               E(26, 22, 5, 4, '#fffdf6', { flat: 1 }), E(52, 18, 4, 3.4, '#fffdf6', { flat: 1 }), E(64, 32, 3.4, 3, '#fffdf6', { flat: 1 }), E(16, 34, 3, 2.6, '#fffdf6', { flat: 1 })]
              .concat(eyes(34, 46, 52, 2.4, 3.2), [L('M37 60 Q40 63 43 60', 1.8)]),
    hatchling: [P('22,24 58,24 62,40 50,48 30,48 18,40', '#ffe066'), P('48,32 60,36 48,40', '#f2a03d'),
                P('12,40 22,46 30,38 40,46 50,38 58,46 68,40 64,66 16,66', '#f7f0dc'),
                L('M30 54 L36 58 M50 52 L46 58', 1.4, '#b8a67a'), P('34,24 38,14 42,24', '#ffe066')].concat(eyes(34, 46, 32, 2.4, 3)),
    bunny: [P('16,40 62,40 66,66 12,66', '#f7f2ea'), P('20,22 58,22 64,40 56,48 22,48 14,40', '#f7f2ea'),
            P('24,22 22,0 32,0 34,22', '#f7f2ea'), P('44,22 46,0 56,0 54,22', '#f7f2ea'),
            P('26,18 25,5 30,5 31,18', '#f2b8b0'), P('47,18 48,5 53,5 52,18', '#f2b8b0'),
            P('37,39 41,39 39,42', '#e8968a')].concat(eyes(31, 47, 34, 2.8, 3.4)),
    slime: [P('8,66 10,44 22,28 40,22 58,28 70,44 72,66', '#6fcf6a'), P('20,30 28,14 52,14 60,30', '#a8703a'),
            P('14,30 66,30 68,34 12,34', '#6b4a2e'), E(24, 50, 4, 6, '#a6eca2', { flat: 1 })]
           .concat(eyes(34, 50, 44, 3, 4), [L('M36 54 Q42 58 48 54', 2)]),
    teddy_bear: [E(20, 10, 7, 7, '#a8703a'), E(60, 10, 7, 7, '#a8703a'),
                 P('16,38 64,38 68,66 12,66', '#a8703a'), P('18,10 62,10 68,26 60,40 20,40 12,26', '#a8703a'),
                 E(40, 30, 9, 6.4, '#e8c090'), E(40, 28, 3, 2.2, EYE), E(40, 52, 10, 9, '#e8c090')].concat(eyes(30, 50, 20, 2.6, 3.2)),
    penguin: [P('18,20 30,6 50,6 62,20 66,62 14,62', '#2b3a55'), P('26,26 40,20 54,26 56,60 24,60', '#f7f2ea'),
              P('36,28 44,28 40,34', '#f2a03d'), P('24,62 36,62 36,68 22,68', '#f2a03d'), P('44,62 56,62 58,68 44,68', '#f2a03d'),
              P('12,30 18,28 20,50 8,46', '#2b3a55'), P('68,30 62,28 60,50 72,46', '#2b3a55')].concat(eyes(34, 46, 20, 2.4, 3)),
    zombie: [P('28,48 52,48 54,68 26,68', '#5a6f3a'), P('52,40 76,40 76,46 52,48', '#8ac06a'),
             P('24,38 56,38 58,52 22,52', '#7a5aa8'), P('20,8 60,8 64,30 56,40 24,40 16,30', '#8ac06a'),
             P('20,8 60,8 62,16 20,16', '#3a4a2a'), L('M24 30 L32 28', 1.4), L('M46 34 L54 34 M48 32 L48 36 M52 32 L52 36', 1.2)]
            .concat([E(32, 22, 3.6, 3.6, '#fffdf6'), E(48, 22, 2.4, 2.4, EYE), E(32, 22, 1.4, 1.4, EYE)]),
    flame_sprite: [P('40,2 52,20 62,36 60,54 48,66 32,66 20,54 18,36 30,22', '#f2a03d'),
                   P('40,22 48,34 52,46 46,58 34,58 28,46 32,34', '#ffd23f')].concat(eyes(34, 46, 44, 2.6, 3.4), cheeks(28, 52, 52, 2.6)),
    polar_bear: [E(18, 14, 6, 6, '#f7f2ea'), E(56, 14, 6, 6, '#f7f2ea'),
                 P('10,34 60,34 76,44 74,66 6,66', '#f7f2ea'), P('12,14 60,14 68,30 62,42 18,42 8,30', '#f7f2ea'),
                 E(38, 32, 8, 6, '#e6dccd'), E(38, 30, 3, 2.2, EYE),
                 L('M20 66 L20 58 M36 66 L36 58 M56 66 L56 58', 1.4, '#c8bba6')].concat(eyes(28, 48, 24, 2.4, 3)),
    dragon: [P('6,30 18,10 34,26', '#8a5aa8'), P('62,56 78,50 72,64', '#4f9a5c'),
             P('20,38 60,38 66,66 16,66', '#4f9a5c'), P('24,44 52,44 54,64 24,64', '#bfe08a'),
             P('40,10 66,10 74,26 66,40 40,40 34,26', '#4f9a5c'), P('46,10 50,0 54,10', '#ffd23f'), P('58,10 62,2 66,12', '#ffd23f'),
             P('18,42 22,34 28,42', '#8a5aa8'), E(70, 28, 1.4, 1.4, EYE)].concat(eyes(50, 62, 22, 2.4, 3.2)),
    phoenix: [P('6,40 2,22 16,34 12,16 26,32', '#e0524a'), P('8,44 4,34 20,40', '#ffd23f'),
              P('20,34 54,30 62,48 52,62 28,62 18,50', '#f2a03d'), P('44,10 62,10 68,26 60,36 44,36 38,24', '#f2a03d'),
              P('48,10 50,0 56,8 60,0 60,12', '#e0524a'), P('66,20 78,24 66,28', '#ffd23f'),
              P('26,40 44,38 40,54 28,52', '#e0524a'), P('30,62 34,62 34,70 28,70', '#c2412f'), P('44,62 48,62 48,70 42,70', '#c2412f'),
              E(58, 20, 2.4, 3, EYE), E(59, 19, 0.8, 1, SHINE)]
  };

  /* What each one is drawn on: grid size, how big to bake it, flipped? */
  var DEFS = {};
  function def(name, shapes, w, h, px, o) { DEFS[name] = { shapes: shapes, w: w, h: h, px: px, o: o || {} }; }
  def('hero', HERO, 120, 160, 480);
  for (var g in GEAR) def(g, GEAR[g], 40, 40, 160);
  for (var b in BOSSES) {
    def(b, BOSSES[b], 110, 110, 320, { dx: 5 });
    def(b + '_hurt', hurt(BOSSES[b]), 110, 110, 320, { dx: 5 });
  }
  for (var p in PETS) def(p, PETS[p], 80, 72, 240, { flip: true });

  /** The same face, eyes screwed shut: > < instead of two dots. */
  function hurt(shapes) {
    var out = [];
    shapes.forEach(function (s) {
      if (s.t === 'e' && s.fill === SHINE) return;
      if (s.t === 'e' && s.fill === EYE && s.rx < 4) {
        var left = s.cx < 50, x = s.cx, y = s.cy, r = 4;
        out.push(L(left ? 'M' + (x - r) + ' ' + (y - r) + ' L' + (x + r) + ' ' + y + ' L' + (x - r) + ' ' + (y + r)
                        : 'M' + (x + r) + ' ' + (y - r) + ' L' + (x - r) + ' ' + y + ' L' + (x + r) + ' ' + (y + r), 2.4));
        return;
      }
      out.push(s);
    });
    return out;
  }

  /* ---------------- inking ---------------- */

  function solid(s) { return s.fill === EYE || s.fill === SHINE; }

  function points(s) {
    if (s.t === 'p') return s.pts.split(' ').map(function (q) { var a = q.split(','); return [+a[0], +a[1]]; });
    var out = [], n = 26;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      out.push([s.cx + Math.cos(a) * s.rx, s.cy + Math.sin(a) * s.ry]);
    }
    return out;
  }
  function trace(c, pts) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
  }
  /** The outline, cut into short steps and pushed about: a pen line,
      not a ruler line. Seeded by where the point is, so it is the
      same wobble every time. */
  function wobbly(pts, step, amp, seed) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      var n = Math.max(1, Math.ceil(len / step));
      for (var j = 0; j < n; j++) {
        var x = a[0] + (b[0] - a[0]) * j / n, y = a[1] + (b[1] - a[1]) * j / n;
        out.push([x + amp * Math.sin(x * 0.37 + y * 0.11 + seed), y + amp * Math.sin(y * 0.41 - x * 0.07 + seed * 1.7)]);
      }
    }
    return out;
  }

  function ink(c, d) {
    var W = d.w;
    var lw = 2.6 * Math.max(0.55, W / 120), off = [2.6 * W / 120 + 0.6, 2 * W / 120 + 0.5];
    if (W <= 40) { lw = 1.5; off = [1.3, 1]; }
    /* Shape by shape, back to front: the colour slipped, then the line
       on top - so a head drawn after a body covers the body's line. */
    c.lineJoin = 'round'; c.lineCap = 'round';
    d.shapes.forEach(function (s, i) {
      if (s.t !== 'l' && !solid(s)) {
        c.save();
        c.translate(off[0], off[1]);
        c.globalAlpha = 0.94 * (s.o.a || 1);
        c.fillStyle = s.fill;
        trace(c, points(s));
        c.fill();
        c.restore();
      }
      if (s.t === 'l') {
        c.lineWidth = s.w * (W <= 40 ? 0.6 : Math.max(0.6, W / 120)) + 0.4;
        c.strokeStyle = s.c;
        c.stroke(new Path2D(s.d));
        return;
      }
      if (solid(s)) { c.fillStyle = s.fill; trace(c, points(s)); c.fill(); return; }
      if (s.o.flat) return;
      c.lineWidth = lw;
      c.strokeStyle = INK;
      trace(c, wobbly(points(s), W / 30, W / 140, i * 2.3));
      c.stroke();
    });
  }

  var baked = {};
  /** The picture called `name`, inked once into a canvas. */
  function get(name) {
    if (name in baked) return baked[name];
    var d = DEFS[name];
    if (!d) return (baked[name] = null);
    var pad = d.w * 0.06;
    var k = d.px / Math.max(d.w, d.h);
    var cv = document.createElement('canvas');
    cv.width = Math.round((d.w + pad * 2) * k);
    cv.height = Math.round((d.h + pad * 2) * k);
    var c = cv.getContext('2d');
    c.scale(k, k);
    c.translate(pad + (d.o.dx || 0), pad);
    if (d.o.flip) { c.translate(d.w, 0); c.scale(-1, 1); }
    ink(c, d);
    cv.doodle = true;
    baked[name] = cv;
    return cv;
  }

  var urls = {};
  return {
    has: function (name) { return !!DEFS[name]; },
    isPet: function (name) { return !!PETS[name]; },
    get: get,
    /** For the HTML sheets: the same picture as an image address. */
    url: function (name) {
      if (!urls[name]) { var cv = get(name); urls[name] = cv ? cv.toDataURL('image/png') : ''; }
      return urls[name];
    },
    names: function () { return Object.keys(DEFS); }
  };
})();
