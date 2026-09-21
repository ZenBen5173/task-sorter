/* ============================================================
   forest.js  -  the trees on the level map
   ------------------------------------------------------------
   WHY THIS IS NOT CSS ANY MORE.

   The treeline used to be conic-gradient wedges tiled with repeat-x.
   That gets you a row of triangles, and a triangle is not a pine - it
   is a tooth. Stacking three wedges into tiers helped the silhouette
   and changed nothing about the real problem, which is that repeat-x
   draws the SAME TREE over and over at a fixed spacing. A forest has
   no two trees alike and no two gaps the same, and no amount of extra
   gradient layers buys you either.

   So the trees are drawn, once, as a shape - and then scattered.

   WHAT MAKES THE SHAPE READ AS A PINE
   Not the outline of a cone. A stylised pine has a JAGGED, STEPPED
   edge: every branch layer juts out and then tucks back in towards the
   trunk before the next one starts. That sawtooth is the thing the eye
   recognises, and it is exactly what a smooth-sided triangle has none
   of. Each tree below is four such steps down each side, plus a trunk.

   AND NO TWO ALIKE
   Every tree gets its own height, width, lean and shade, from a seeded
   random number generator - seeded so the wood looks the SAME every
   time you open the map. A forest that reshuffles itself whenever you
   walk back onto the screen is a screensaver, not a place.
   ============================================================ */

var Forest = (function () {

  /* A tiny seeded generator. Math.random would redraw a different wood
     on every visit to the map; this one gives the same wood forever,
     while still being shapeless enough that nobody can see a pattern. */
  function rng(seed) {
    var s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  /** One pine silhouette, as an SVG path, drawn in a 40 x 100 box with
      its trunk sitting on the bottom edge.

      `steps` is how many branch layers it has and `spread` how far they
      throw out. A tree with more, shallower steps reads young and
      bushy; fewer, wider ones read old. Both are randomised per tree,
      which is most of why the wood looks like a wood. */
  function pinePath(steps, spread, lean) {
    var W = 40, H = 100, trunkH = 13, mid = W / 2;
    var top = 3, bottom = H - trunkH;
    var span = bottom - top;

    var right = [], left = [];
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      var y = top + span * t;
      /* How far this layer throws out. It widens towards the ground,
         and the tuck-back is what makes the step rather than a slope. */
      var out = spread * Math.pow(t, 0.78);
      var tuck = out * 0.72;
      var yTop = top + span * ((i - 1) / steps);
      right.push('L' + (mid + out).toFixed(1) + ',' + y.toFixed(1));
      left.unshift('L' + (mid - out).toFixed(1) + ',' + y.toFixed(1));
      if (i < steps) {
        right.push('L' + (mid + tuck).toFixed(1) + ',' + y.toFixed(1));
        left.unshift('L' + (mid - tuck).toFixed(1) + ',' + y.toFixed(1));
      }
      void yTop;
    }

    /* The lean tips the apex sideways. Trees do not grow in columns. */
    var apex = mid + lean;
    var tw = 3.4;   // half the trunk width

    return 'M' + apex.toFixed(1) + ',' + top
      + right.join('')
      + 'L' + (mid + tw) + ',' + bottom.toFixed(1)
      + 'L' + (mid + tw) + ',' + H
      + 'L' + (mid - tw) + ',' + H
      + 'L' + (mid - tw) + ',' + bottom.toFixed(1)
      + left.join('')
      + 'Z';
  }

  /* The ranks, far to near. Each is a band of the picture with its own
     size, shade and crowding.

       y        where the FEET of the trees sit, in percent
       h        tree height in percent of the scene
       n        how many
       fill     silhouette colour
       jitter   how far a tree may wander off its rank, in percent

     Distance is carried by three things at once - smaller, paler, and
     closer together - because any one of them alone just looks like a
     mistake. */
  var RANKS = [
    /* The two furthest ranks replace the pale gradient treeline that
       used to sit up here. They are small, close together and washed
       out almost to the colour of the mist, which is what distance
       looks like - not a smaller triangle. */
    { y: 24, h: 9,  n: 34, fill: '#8fb48c', jitter: 1.1, steps: [3, 4], spread: [11, 15] },
    { y: 30, h: 13, n: 26, fill: '#7aa47a', jitter: 1.6, steps: [3, 4], spread: [12, 16] },
    { y: 40, h: 17, n: 22, fill: '#5f8b62', jitter: 2.0, steps: [3, 4], spread: [13, 17] },
    { y: 54, h: 23, n: 18, fill: '#3d6b45', jitter: 2.6, steps: [4, 5], spread: [14, 18] },
    { y: 72, h: 30, n: 15, fill: '#24472e', jitter: 3.0, steps: [4, 5], spread: [15, 19] },
    { y: 93, h: 38, n: 12, fill: '#16301e', jitter: 3.4, steps: [4, 6], spread: [16, 20] },
    { y: 106, h: 46, n: 10, fill: '#0d1f14', jitter: 3.0, steps: [4, 6], spread: [17, 21] }
  ];

  /** Builds the whole wood into the <svg> on the level map. Called once
      on boot; the trees never change, so there is nothing to repaint. */
  function paint() {
    var svg = document.getElementById('lv-trees');
    if (!svg || svg.childNodes.length) return;

    var rand = rng(20260921);
    var ns = 'http://www.w3.org/2000/svg';
    var frag = document.createDocumentFragment();

    RANKS.forEach(function (rank) {
      for (var i = 0; i < rank.n; i++) {
        var pick = function (pair) { return pair[0] + rand() * (pair[1] - pair[0]); };

        var steps = Math.round(pick(rank.steps));
        var spread = pick(rank.spread);
        var lean = (rand() - 0.5) * 5;

        var h = rank.h * (0.72 + rand() * 0.56);     // height varies a lot
        var w = h * 0.42 * (0.85 + rand() * 0.4);    // and width separately
        /* Spread across a bit more than the full width, so the rows do
           not start and stop neatly at the edges. */
        var x = -4 + rand() * 108;
        var y = rank.y + (rand() - 0.5) * rank.jitter;

        var g = document.createElementNS(ns, 'path');
        g.setAttribute('d', pinePath(steps, spread, lean));
        g.setAttribute('fill', rank.fill);
        /* Each tree is placed in percent and then scaled to its own
           size, so the wood stretches with the screen instead of
           cropping on a narrow phone. */
        g.setAttribute('transform',
          'translate(' + x.toFixed(2) + ',' + (y - h).toFixed(2) + ') '
          + 'scale(' + (w / 40).toFixed(4) + ',' + (h / 100).toFixed(4) + ')');
        /* A touch of shading within a rank, so a band of one flat colour
           does not read as a cardboard cut-out. */
        g.setAttribute('opacity', (0.86 + rand() * 0.14).toFixed(2));
        frag.appendChild(g);
      }
    });

    svg.appendChild(frag);
  }

  return { paint: paint };
})();
