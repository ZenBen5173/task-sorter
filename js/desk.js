/* ============================================================
   desk.js  -  the things on the desk
   ------------------------------------------------------------
   The look is "Desk Day" (the design is on the Task Sorter game look
   canvas): the game is played on a cork board, and everything on it is
   a real thing you would find on a desk. This file draws those things,
   so every screen draws them the same way:

     the four trays, each its own object -
       Do Now     a red metal in-tray, hazard tape across the front
       Do Later   a desk calendar, a day ringed in red marker
       Give Away  an envelope, stamped and addressed
       Drop       a wire bin, already full of crumpled paper
     an index card       the task, handwritten, taped down
     the back of a card  kraft card, the four colours as sticker dots
     a kitchen timer     the clock
     a paper note        anything the game has to say in a box

   WHY OBJECTS AND NOT BOXES. Four coloured rectangles read as buttons;
   a bin reads as Drop before you have read a word, and an envelope is
   very nearly the idea of Give Away. Each tray is a different SHAPE as
   well as a different colour, which is also what makes them tell apart
   for anyone who cannot tell red from orange.

   Everything here draws at the origin, in a box of the size it is given,
   and is meant to be baked (Gfx.bake) - none of it changes frame to
   frame except the timer.
   ============================================================ */

var Desk = (function () {

  var INK = '#2a1e12';

  function line(k, pts, color, w, close) {
    k.beginPath();
    k.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) k.lineTo(pts[i], pts[i + 1]);
    if (close) k.closePath();
    if (color) { k.strokeStyle = color; k.lineWidth = w || 2; k.lineJoin = 'round'; k.lineCap = 'round'; k.stroke(); }
  }
  function poly(k, pts, fill, stroke, w) {
    line(k, pts, null, 0, true);
    if (fill) { k.fillStyle = fill; k.fill(); }
    if (stroke) { k.strokeStyle = stroke; k.lineWidth = w || 2.5; k.lineJoin = 'round'; k.stroke(); }
  }

  /** The words on a tray, painted on it. */
  function label(k, s, x, y, w, size, shadow) {
    Gfx.textNow(k, s, x, y, { font: 'arcade', size: size, color: '#ffffff', shadow: shadow, shadowY: 2, maxW: w });
  }

  /* ---------------- the four trays ---------------- */

  /** Draws tray `key` filling w x h. `pile` is how many cards have gone
      in this round (0-6), which each object shows its own way. */
  function tray(k, key, w, h, pile, hidden, bt) {
    var ls = Gfx.clamp(w * 0.082, 10, 14) * (bt ? 1.1 : 1);
    var name = hidden ? '? ? ?' : BOXES[key].label.toUpperCase();
    var i;
    k.save();
    /* the shadow every object casts on the cork */
    k.fillStyle = 'rgba(46,24,6,.38)';
    if (key === 'now') {
      poly(k, [w * 0.05, h * 0.52, w * 0.99, h * 0.52, w * 0.95, h * 0.99, w * 0.09, h * 0.99], 'rgba(46,24,6,.38)');
      /* the back panel, with papers standing in it */
      poly(k, [w * 0.09, h * 0.14, w * 0.91, h * 0.14, w * 0.91, h * 0.6, w * 0.09, h * 0.6], '#a8322b', '#3d0f0b', 2.5);
      var papers = 2 + Math.min(4, pile);
      for (i = 0; i < papers; i++) {
        var px = w * (0.16 + (i % 3) * 0.06), pr = (i % 2 ? 1 : -1) * 0.04 * (i + 1) / papers;
        k.save(); k.translate(px + w * 0.27, h * 0.33); k.rotate(pr);
        k.fillStyle = i % 2 ? '#f3ebd8' : '#fffdf6';
        k.fillRect(-w * 0.27, -h * 0.3 + i * 2, w * 0.54, h * 0.4);
        k.strokeStyle = 'rgba(120,96,60,.5)'; k.lineWidth = 1; k.strokeRect(-w * 0.27, -h * 0.3 + i * 2, w * 0.54, h * 0.4);
        k.fillStyle = 'rgba(140,175,220,.7)';
        for (var r = 0; r < 3; r++) k.fillRect(-w * 0.2, -h * 0.22 + i * 2 + r * h * 0.07, w * 0.36, 1.4);
        k.restore();
      }
      /* the front lip, and the hazard tape across it */
      poly(k, [w * 0.02, h * 0.48, w * 0.98, h * 0.48, w * 0.93, h * 0.97, w * 0.07, h * 0.97], '#e0524a', '#3d0f0b', 2.5);
      k.fillStyle = '#ff8a7a'; k.fillRect(w * 0.05, h * 0.5, w * 0.9, 2.5);
      var hx = w * 0.13, hy = h * 0.58, hw = w * 0.74, hh = h * 0.13;
      k.save(); k.beginPath(); k.rect(hx, hy, hw, hh); k.clip();
      k.fillStyle = '#f2c14e'; k.fillRect(hx, hy, hw, hh);
      k.fillStyle = '#1d1712';
      for (i = -hh; i < hw + hh; i += 14) { k.beginPath(); k.moveTo(hx + i, hy + hh); k.lineTo(hx + i + 7, hy + hh); k.lineTo(hx + i + 7 + hh, hy); k.lineTo(hx + i + hh, hy); k.closePath(); k.fill(); }
      k.restore();
      k.strokeStyle = '#1d1712'; k.lineWidth = 1.5; k.strokeRect(hx, hy, hw, hh);
      label(k, name, w / 2, h * 0.84, w * 0.8, ls, '#3d0f0b');
    } else if (key === 'later') {
      k.fillRect(w * 0.07, h * 0.18, w * 0.92, h * 0.82);
      poly(k, [w * 0.04, h * 0.14, w * 0.96, h * 0.14, w * 0.96, h * 0.96, w * 0.04, h * 0.96], '#2f5f96', '#0f2238', 2.5);
      k.fillStyle = '#fffdf6'; k.fillRect(w * 0.1, h * 0.22, w * 0.8, h * 0.68);
      k.fillStyle = '#4a86c4'; k.fillRect(w * 0.1, h * 0.22, w * 0.8, h * 0.2);
      /* the days, and one ringed */
      var cols = 6, rows = 3, cw = w * 0.8 / cols, chh = h * 0.42 / rows, n = 0;
      for (var ry = 0; ry < rows; ry++) for (var cx = 0; cx < cols; cx++) {
        var dx = w * 0.1 + cx * cw + 3, dy = h * 0.46 + ry * chh + 2;
        k.fillStyle = '#d6deea'; k.fillRect(dx, dy, cw - 6, chh - 5);
        /* every card filed here crosses a day off */
        if (n < pile) { line(k, [dx + 1, dy + 1, dx + cw - 7, dy + chh - 6], INK, 1.6); line(k, [dx + cw - 7, dy + 1, dx + 1, dy + chh - 6], INK, 1.6); }
        n++;
      }
      k.strokeStyle = '#e0524a'; k.lineWidth = 2.5;
      k.beginPath(); k.ellipse(w * 0.1 + 4.5 * cw, h * 0.46 + 1.5 * chh, cw * 0.62, chh * 0.62, -0.2, 0, 6.28); k.stroke();
      /* the rings */
      k.fillStyle = '#0f2238';
      for (i = 0; i < 5; i++) k.fillRect(w * (0.16 + i * 0.17), h * 0.04, 4, h * 0.16);
      label(k, name, w / 2, h * 0.32, w * 0.76, ls, '#0f2238');
    } else if (key === 'give') {
      k.save(); k.translate(3, 5);
      poly(k, [w * 0.03, h * 0.2, w * 0.96, h * 0.14, w * 0.98, h * 0.94, w * 0.05, h * 0.99], 'rgba(46,24,6,.38)');
      k.restore();
      /* letters already waiting to go, behind it */
      for (i = 0; i < Math.min(4, pile); i++) {
        k.fillStyle = i % 2 ? '#f3ebd8' : '#fffdf6';
        k.save(); k.translate(w * 0.5, h * 0.18); k.rotate(-0.08 + i * 0.05);
        k.fillRect(-w * 0.4, -h * 0.1 - i * 3, w * 0.8, h * 0.3); k.strokeStyle = 'rgba(120,96,60,.5)'; k.lineWidth = 1; k.strokeRect(-w * 0.4, -h * 0.1 - i * 3, w * 0.8, h * 0.3);
        k.restore();
      }
      poly(k, [w * 0.03, h * 0.2, w * 0.96, h * 0.14, w * 0.98, h * 0.94, w * 0.05, h * 0.99], '#f2a03d', '#5a3208', 2.5);
      line(k, [w * 0.03, h * 0.2, w * 0.51, h * 0.6, w * 0.96, h * 0.14], '#5a3208', 2.5);
      line(k, [w * 0.05, h * 0.99, w * 0.42, h * 0.56], '#c97a1e', 2);
      line(k, [w * 0.98, h * 0.94, w * 0.6, h * 0.55], '#c97a1e', 2);
      /* the stamp */
      k.fillStyle = '#fffdf6'; k.fillRect(w * 0.74, h * 0.24, w * 0.16, h * 0.22);
      k.setLineDash([3, 2]); k.strokeStyle = '#5a3208'; k.lineWidth = 1.5; k.strokeRect(w * 0.74, h * 0.24, w * 0.16, h * 0.22); k.setLineDash([]);
      poly(k, [w * 0.77, h * 0.42, w * 0.82, h * 0.29, w * 0.87, h * 0.42], '#4a86c4');
      label(k, name, w / 2, h * 0.79, w * 0.8, ls, '#5a3208');
    } else {
      /* crumpled paper above the rim - more of it the more you drop */
      var balls = 1 + Math.min(5, pile);
      for (i = 0; i < balls; i++) {
        var bx = w * (0.3 + ((i * 37) % 40) / 100), by = h * (0.2 - (i % 3) * 0.05), br = w * 0.1;
        k.save(); k.translate(bx, by); k.rotate(i);
        poly(k, [-br, 0, -br * 0.6, -br * 0.8, 0, -br, br * 0.7, -br * 0.7, br, 0.1, br * 0.6, br * 0.8, -0.2, br, -br * 0.8, br * 0.6], i % 2 ? '#e9e2d2' : '#f6f1e4', '#6b6458', 1.5);
        line(k, [-br * 0.4, -br * 0.2, 0, br * 0.2, br * 0.3, -br * 0.4], '#b8b0a0', 1);
        k.restore();
      }
      poly(k, [w * 0.13, h * 0.29, w * 0.87, h * 0.29, w * 0.79, h * 0.99, w * 0.21, h * 0.99], 'rgba(46,24,6,.38)');
      poly(k, [w * 0.12, h * 0.26, w * 0.88, h * 0.26, w * 0.8, h * 0.97, w * 0.2, h * 0.97], '#6f7784', '#22262e', 2.5);
      /* the wire mesh */
      k.strokeStyle = '#9aa3b0'; k.lineWidth = 2;
      for (i = 1; i < 7; i++) { var f = i / 7; line(k, [w * (0.12 + 0.76 * f), h * 0.3, w * (0.2 + 0.6 * f), h * 0.94], '#9aa3b0', 2); }
      for (i = 1; i < 4; i++) { var g = i / 4; line(k, [w * (0.12 + 0.08 * g), h * (0.26 + 0.71 * g), w * (0.88 - 0.08 * g), h * (0.26 + 0.71 * g)], '#9aa3b0', 2); }
      poly(k, [w * 0.08, h * 0.22, w * 0.92, h * 0.22, w * 0.9, h * 0.3, w * 0.1, h * 0.3], '#8a929e', '#22262e', 2.5);
      label(k, name, w / 2, h * 0.62, w * 0.62, ls, '#22262e');
    }
    k.restore();
  }

  /** Where on each tray the card disappears into, as a share of the
      tray's height from its top. */
  var MOUTH = { now: 0.3, later: 0.6, give: 0.45, drop: 0.24 };

  /* ---------------- the card ---------------- */

  /** An index card, w x h, with the task handwritten on it and a strip
      of washi tape holding it on. `special` is 'gold', 'fuse', 'ice' or
      nothing. */
  function cardFace(k, text, w, h, place, special, bt) {
    var gold = special === 'gold';
    Gfx.indexCard(k, 0, 0, w, h, {
      fill: gold ? '#ffe6a0' : '#fffdf6',
      ruleColor: gold ? 'rgba(180,120,20,.4)' : 'rgba(140,175,220,.55)',
      marginColor: gold ? 'rgba(180,90,20,.6)' : 'rgba(224,120,120,.75)',
      top: 34, gap: Math.max(24, Math.round(h / 6)), margin: 24
    });
    /* the card's shadow is drawn by indexCard; the tape sits over the top edge */
    Gfx.tape(k, w / 2, 3, Math.min(96, w * 0.32), 0.05, gold ? 'rgba(120,200,190,.85)' : 'rgba(255,150,180,.82)');
    Gfx.textNow(k, place, 34, 22, { font: 'mono', size: 8.5, align: 'left',
      color: gold ? '#8a5a10' : special === 'fuse' ? '#c2412f' : special === 'ice' ? '#2f6fb0' : '#a08a62' });
    var f = Gfx.fit(k, text, w - 56, h - 54, { size: Math.round(Gfx.clamp(w * 0.072, 16, 23) * (bt ? 1.16 : 1)), weight: 700, maxLines: 4, lead: 1.2 });
    var lh = f.size * 1.08 * 1.2, ty = h / 2 + 12 - (f.lines.length - 1) * lh / 2;
    for (var i = 0; i < f.lines.length; i++) {
      Gfx.textNow(k, f.lines[i], w / 2 + 10, ty + i * lh, { size: f.size, weight: 700, color: '#1f2a44' });
    }
  }

  /** The back of a card, seen while it flips: kraft card, four dots. */
  function cardBack(k, w, h) {
    k.fillStyle = 'rgba(46,24,6,.38)'; k.fillRect(3, 6, w, h);
    k.fillStyle = '#c9a874'; k.fillRect(0, 0, w, h);
    k.fillStyle = 'rgba(90,60,20,.12)';
    for (var i = 0; i < 160; i++) k.fillRect((i * 53) % w, (i * 31) % h, 2, 1);
    var cols = [Gfx.C.now, Gfx.C.later, Gfx.C.give, Gfx.C.drop], r = Math.min(w, h) * 0.08;
    for (i = 0; i < 4; i++) {
      var x = w / 2 + (i % 2 ? 1 : -1) * r * 1.5, y = h / 2 + (i > 1 ? 1 : -1) * r * 1.5;
      k.fillStyle = cols[i]; k.beginPath(); k.arc(x, y, r, 0, 6.28); k.fill();
    }
    k.strokeStyle = 'rgba(90,60,20,.45)'; k.lineWidth = 1; k.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  /* ---------------- the clock ---------------- */

  /** A kitchen timer: cream dial, the time left as a red wedge. */
  function timer(c, x, y, r, frac, text, hot, color) {
    c.save();
    c.translate(x, y);
    c.fillStyle = 'rgba(46,24,6,.4)'; c.beginPath(); c.arc(2, 3, r, 0, 6.2832); c.fill();
    c.fillStyle = INK; c.fillRect(-r * 0.18, -r - 5, r * 0.36, 6);
    c.fillStyle = '#f6efe0'; c.beginPath(); c.arc(0, 0, r, 0, 6.2832); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    if (frac > 0) {
      c.fillStyle = color || '#e0524a';
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); c.closePath(); c.fill();
    }
    c.fillStyle = '#f6efe0'; c.beginPath(); c.arc(0, 0, r * 0.56, 0, 6.2832); c.fill();
    c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
    /* the ticks round the dial */
    c.strokeStyle = 'rgba(42,30,18,.5)'; c.lineWidth = 1.2;
    for (var i = 0; i < 12; i++) { var a = i / 12 * 6.2832; c.beginPath(); c.moveTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2)); c.lineTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5)); c.stroke(); }
    Gfx.text(c, text, 0, 1, { font: 'arcade', size: text.length > 3 ? 7 : 10, color: hot ? '#c2412f' : INK, maxW: r * 1.05 });
    c.restore();
  }

  /* ---------------- a note ---------------- */

  /** A paper note pinned to the board: anything the game has to say in a
      box. `color` is the pin's. Draws with its top-left at (x, y). */
  function note(c, x, y, w, h, o) {
    o = o || {};
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate(o.rot || 0);
    c.fillStyle = 'rgba(46,24,6,.38)'; c.fillRect(-w / 2 + 3, -h / 2 + 5, w, h);
    c.fillStyle = o.fill || '#fffdf6'; c.fillRect(-w / 2, -h / 2, w, h);
    c.strokeStyle = 'rgba(120,96,60,.4)'; c.lineWidth = 1; c.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    if (o.band) { c.fillStyle = o.band; c.fillRect(-w / 2, -h / 2, w, 4); }
    if (o.pin !== false) Gfx.pin(c, 0, -h / 2 + 2, o.pinColor || '#c2412f', 6);
    c.restore();
  }

  return { INK: INK, tray: tray, MOUTH: MOUTH, cardFace: cardFace, cardBack: cardBack, timer: timer, note: note };
})();
