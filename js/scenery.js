/* ============================================================
   scenery.js  -  what you are playing in front of
   ------------------------------------------------------------
   Three of the four themes named a photograph - sakura.jpg,
   forest.jpg, waterfalls.jpg - and none of the three ever existed.
   js/themes.js drops a missing picture out of the stack and lets the
   tint carry the screen, so nothing was broken. It was just empty:
   pick Sakura and you got a flat pink page with petals on it.

   SO THEY ARE DRAWN, for the same three reasons the soundtrack is
   generated and the fonts are bundled. A photograph is somebody's
   copyright, and this repository is public. A photograph good enough
   to fill a phone screen is a megabyte each, which is more than the
   whole game. And a photograph is a picture of somewhere real behind
   a game made of pixel art, which is the join you can always see.

   THIS IS THE LEVEL MAP'S TRICK, APPLIED AGAIN. js/forest.js already
   learned it the hard way: a repeated CSS gradient draws the same
   shape at the same spacing forever, and the eye reads the repeat
   instantly. Shapes are drawn once and then SCATTERED - every one
   with its own size, lean and shade, from a seeded generator so the
   view is the same every time you open the theme.

   IT IS BEHIND A GAME ON A CLOCK, so it is painted once when the
   theme changes and never touched again. No animation lives here;
   the motion on these screens is js/weather.js, which is CSS
   keyframes and costs nothing per frame either.

   AND IT STAYS OUT OF THE WAY. Everything is a silhouette in a
   narrow band of colour, sat under the theme's dim layer. A
   background with detail in it competes with a card you are supposed
   to be reading, and the card has to win.
   ============================================================ */

var Scenery = (function () {

  var NS = 'http://www.w3.org/2000/svg';

  /* Same seeded generator as the level map, and seeded for the same
     reason: a view that reshuffles itself every time you come back to
     it is a screensaver, not a place. */
  function rng(seed) {
    var s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ---------------- the shapes ---------------- */

  /** A pine, in its own 40 x 100 box with the trunk on the bottom edge.
      The jagged stepped edge is the whole point - a smooth-sided
      triangle is a tooth, not a tree. */
  function pine(steps, spread, lean) {
    var W = 40, H = 100, trunk = 12, mid = W / 2;
    var top = 3, bottom = H - trunk, span = bottom - top;
    var right = [], left = [];
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      var y = (top + span * t).toFixed(1);
      var out = spread * Math.pow(t, 0.78);
      var tuck = out * 0.72;
      right.push('L' + (mid + out).toFixed(1) + ',' + y);
      left.unshift('L' + (mid - out).toFixed(1) + ',' + y);
      if (i < steps) {
        right.push('L' + (mid + tuck).toFixed(1) + ',' + y);
        left.unshift('L' + (mid - tuck).toFixed(1) + ',' + y);
      }
    }
    return 'M' + (mid + lean).toFixed(1) + ',' + top + right.join('')
      + 'L' + (mid + 3) + ',' + bottom + 'L' + (mid + 3) + ',' + H
      + 'L' + (mid - 3) + ',' + H + 'L' + (mid - 3) + ',' + bottom
      + left.join('') + 'Z';
  }

  /** A blossom tree: a bent trunk with a couple of boughs, and the
      canopy as overlapping blobs rather than one outline. A cherry in
      flower has no edge to it - it is a cloud sitting in a tree, and
      one smooth shape reads as a lollipop. */
  function blossom(g, rand, fill, trunkFill) {
    var lean = (rand() - 0.5) * 10;
    g.appendChild(el('path', {
      d: 'M' + (20 - 2.2) + ',100 L' + (20 - 1.4 + lean * 0.5) + ',52 '
       + 'L' + (20 + 1.4 + lean * 0.5) + ',52 L' + (20 + 2.2) + ',100 Z'
       + 'M' + (20 + lean * 0.5) + ',66 L' + (20 + 9 + lean) + ',54 '
       + 'L' + (20 + 8 + lean) + ',58 Z'
       + 'M' + (20 + lean * 0.5) + ',72 L' + (20 - 8 + lean) + ',60 '
       + 'L' + (20 - 7 + lean) + ',64 Z',
      fill: trunkFill
    }));
    /* Five to seven blobs, biggest in the middle, so the canopy has a
       lumpy edge instead of a circle's. */
    var blobs = 5 + Math.floor(rand() * 3);
    for (var i = 0; i < blobs; i++) {
      var a = (i / blobs) * Math.PI * 2 + rand() * 0.6;
      var r = 9 + rand() * 7;
      g.appendChild(el('ellipse', {
        cx: (20 + lean + Math.cos(a) * (9 + rand() * 6)).toFixed(1),
        cy: (40 + Math.sin(a) * (7 + rand() * 5)).toFixed(1),
        rx: r.toFixed(1), ry: (r * 0.82).toFixed(1), fill: fill
      }));
    }
    g.appendChild(el('ellipse', { cx: (20 + lean).toFixed(1), cy: 40, rx: 14, ry: 11, fill: fill }));
  }

  /** The waterfalls, built rather than scattered.

      THE OTHER TWO SCENES ARE CROWDS - trees, and one more tree is
      always fine. A waterfall is not a crowd. Scattering cliff-shaped
      things across the screen gave a row of grey-blue blocks with thin
      white stripes down them, which is not a waterfall; it is an
      abstract. What makes the shape read is the ARRANGEMENT: a wall
      with gaps cut in it, water falling through the gaps, and a pool at
      the bottom wide enough to have caught it.

      So this one is composed: a rock mass across the whole width, three
      falls cut into it at uneven spacing, and the water they land in. */
  function falls(svg, rand, c) {
    /* The far wall. One ragged silhouette, because that is what a cliff
       is from across a valley - one shape with an uneven top. */
    var top = [];
    for (var i = 0; i <= 12; i++) {
      top.push((i * 100 / 12).toFixed(1) + ',' + (38 + rand() * 9).toFixed(1));
    }
    svg.appendChild(el('polygon', { points: '0,100 ' + top.join(' ') + ' 100,100', fill: c.far }));

    /* Three falls, spaced unevenly. Evenly spaced would read as a
       fountain - something built - rather than as a river finding the
       three lowest places in a cliff. */
    var at = [18 + rand() * 8, 46 + rand() * 7, 74 + rand() * 9];
    var pool = 84;

    at.forEach(function (x, n) {
      var wide = 5 + rand() * 4;
      var lip = 44 + rand() * 6;
      /* Tapered: a fall spreads as it drops. A rectangle of white is a
         pillar, and a pillar is architecture. */
      svg.appendChild(el('polygon', {
        points: (x - wide / 2).toFixed(1) + ',' + lip.toFixed(1) + ' '
              + (x + wide / 2).toFixed(1) + ',' + lip.toFixed(1) + ' '
              + (x + wide * 0.85).toFixed(1) + ',' + pool + ' '
              + (x - wide * 0.85).toFixed(1) + ',' + pool,
        fill: c.water, opacity: 0.92
      }));
      /* A brighter core, so the fall has a near edge and a far one
         instead of being a flat cut-out. */
      svg.appendChild(el('rect', {
        x: (x - wide * 0.22).toFixed(1), y: (lip + 1).toFixed(1),
        width: (wide * 0.44).toFixed(1), height: (pool - lip - 1).toFixed(1),
        fill: c.bright, opacity: 0.75
      }));
      /* Spray where it lands. Without this the fall stops dead on the
         water like a painted line. */
      svg.appendChild(el('ellipse', {
        cx: x.toFixed(1), cy: pool, rx: (wide * 1.5).toFixed(1), ry: 3.4,
        fill: c.bright, opacity: 0.55
      }));
      void n;
    });

    /* The near rock, in front of the falls on both sides, which is what
       puts the viewer INSIDE the gorge rather than looking at a picture
       of one. */
    svg.appendChild(el('polygon', { points: '0,52 22,60 30,100 0,100', fill: c.near }));
    svg.appendChild(el('polygon', { points: '100,50 78,62 72,100 100,100', fill: c.near }));

    /* The pool. Two flat ellipses: the water, then a paler skim of
       mist sitting on it. */
    svg.appendChild(el('ellipse', { cx: 50, cy: pool + 9, rx: 68, ry: 12, fill: c.pool }));
    svg.appendChild(el('ellipse', { cx: 50, cy: pool + 1, rx: 52, ry: 4.5, fill: c.bright, opacity: 0.35 }));
  }

  /* ---------------- what each theme is made of ----------------
     Ranks run far to near. Distance is carried by three things at
     once - smaller, paler, closer together - because any one of them
     on its own just looks like a mistake.

       y   where the feet of the things in it sit, in percent
       h   their height, in percent of the screen
       n   how many
     */
  var SCENES = {

    sakura: {
      seed: 20260401,
      /* Hills first. A row of trees with nothing behind it is a row of
         trees; a hill behind it is a valley. */
      hills: [
        { y: 62, h: 16, fill: '#e7b9cf' },
        { y: 70, h: 20, fill: '#d99ec0' }
      ],
      ranks: [
        { kind: 'blossom', y: 66, h: 26, n: 7, fill: '#f4c2da', trunk: '#b07f96' },
        { kind: 'blossom', y: 78, h: 36, n: 6, fill: '#ecaacb', trunk: '#8f6076' },
        { kind: 'blossom', y: 94, h: 48, n: 5, fill: '#df8fb8', trunk: '#6d4657' }
      ]
    },

    forest: {
      seed: 20260615,
      hills: [
        { y: 58, h: 14, fill: '#9ec89a' },
        { y: 66, h: 18, fill: '#7fae7e' }
      ],
      ranks: [
        { kind: 'pine', y: 62, h: 22, n: 13, fill: '#6b9a68' },
        { kind: 'pine', y: 74, h: 30, n: 10, fill: '#47774c' },
        { kind: 'pine', y: 92, h: 40, n: 8,  fill: '#2c5334' }
      ]
    },

    /* No ranks. See falls() above for why this one is composed. */
    falls: {
      seed: 20260820,
      hills: [ { y: 44, h: 13, fill: '#a8c9d8' } ],
      built: 'falls',
      colors: { far: '#7fa3b8', near: '#4e738a', water: '#dff2fb', bright: '#ffffff', pool: '#8fbdd2' }
    }
  };

  /* ---------------- painting ---------------- */

  var host = null;
  var painted = {};      // themes already built, so switching back is free

  function build(id) {
    var scene = SCENES[id];
    var svg = el('svg', {
      'class': 'scene', 'data-scene': id,
      viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true'
    });
    if (!scene) return svg;      // Deep Space has stars and wants nothing else

    var rand = rng(scene.seed);

    /* The hills are one wide, very flat ellipse each. Anything more
       detailed at this distance is detail nobody can see. */
    (scene.hills || []).forEach(function (h) {
      svg.appendChild(el('ellipse', {
        cx: 50, cy: h.y + h.h, rx: 78, ry: h.h, fill: h.fill, opacity: 0.85
      }));
    });

    if (scene.built === 'falls') { falls(svg, rand, scene.colors); return svg; }

    (scene.ranks || []).forEach(function (rank) {
      for (var i = 0; i < rank.n; i++) {
        var h = rank.h * (0.74 + rand() * 0.52);      // height varies a lot
        var w = h * 0.46 * (0.85 + rand() * 0.4);     // and width separately
        /* Spread wider than the screen, so a row does not start and
           stop neatly at the edges. */
        var x = -6 + rand() * 112;
        var y = rank.y + (rand() - 0.5) * 3;

        var g = el('g', {
          transform: 'translate(' + x.toFixed(2) + ',' + (y - h).toFixed(2) + ') '
            + 'scale(' + (w / 40).toFixed(4) + ',' + (h / 100).toFixed(4) + ')',
          opacity: (0.86 + rand() * 0.14).toFixed(2)
        });

        if (rank.kind === 'pine') {
          g.appendChild(el('path', {
            d: pine(3 + Math.round(rand() * 2), 13 + rand() * 6, (rand() - 0.5) * 5),
            fill: rank.fill
          }));
        } else if (rank.kind === 'blossom') {
          blossom(g, rand, rank.fill, rank.trunk);
        }
        svg.appendChild(g);
      }
    });
    return svg;
  }

  return {
    /** Called by Themes.apply, so a theme change is the only thing that
        ever has to think about it. */
    paint: function (id) {
      if (!host) host = document.getElementById('play-scene');
      if (!host) return;
      host.innerHTML = '';
      if (!painted[id]) painted[id] = build(id);
      /* Cloned rather than moved, so the cached one stays whole if this
         is ever painted into two places at once. */
      host.appendChild(painted[id].cloneNode(true));
    }
  };
})();
