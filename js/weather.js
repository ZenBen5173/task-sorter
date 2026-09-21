/* ============================================================
   weather.js  -  the moving part of a background
   ------------------------------------------------------------
   Petals for Sakura, leaves for Forest, rain for Waterfalls. It is
   what the themes were always meant to be; the photographs never
   turned up, and a flat pink screen is not a cherry tree.

   NOTHING RUNS PER FRAME. Each speck is a span with a CSS keyframe
   on it, and the browser animates it on its own - the same bargain
   js/pets.js makes. The only JavaScript is the handful of lines
   below that create the specks and hand each one a random size,
   speed and starting point. A round is a fast game on a cheap
   phone; a background that costs frames is a background that costs
   you the round.

   TWO SPANS PER SPECK, and it has to be two. The outer one falls
   and spins, the inner one drifts side to side. One element cannot
   do both, because `transform` is a single property and the second
   animation would simply overwrite the first. Splitting them lets
   the drift run at its own speed, which is what stops a screenful
   of petals moving like one sheet.

   ADDING WEATHER TO A THEME: give it a `fall` in js/themes.js.
     kind    'petal', 'leaf', 'drop' or 'star' - the shape, in CSS
     count   how many are on screen at once. Keep it low
     colors  the shades to pick from

   WHY THE COUNTS ARE SMALL: every speck is a real element the
   browser composites on every frame, behind a card you are dragging
   about. Twenty reads as weather. Two hundred reads as a dropped
   frame.
   ============================================================ */

var Weather = (function () {

  var host = null;

  /* Someone who asked for less motion gets a still background. This
     is decoration with no information in it, so there is nothing to
     fall back to - it simply does not run. */
  var still = false;
  try {
    still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* no matchMedia: run it */ }

  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /** Builds one speck: a falling outer span with a drifting inner one. */
  function speck(spec, i) {
    var size = rand(spec.size[0], spec.size[1]);

    var fall = document.createElement('span');
    fall.className = 'wx-fall';
    fall.style.left = rand(-4, 104) + '%';
    fall.style.animationDuration = rand(spec.speed[0], spec.speed[1]) + 's';
    /* Spread the start times across a whole fall, so the screen is
       already full when you arrive instead of raining from nothing. */
    fall.style.animationDelay = '-' + rand(0, spec.speed[1]) + 's';
    fall.style.setProperty('--wx-spin', Math.round(rand(spec.spin[0], spec.spin[1])) + 'deg');

    var drift = document.createElement('span');
    drift.className = 'wx-drift';
    drift.style.animationDuration = rand(2.2, 5.4) + 's';
    drift.style.animationDelay = '-' + rand(0, 5) + 's';
    drift.style.setProperty('--wx-sway', Math.round(rand(spec.sway[0], spec.sway[1])) + 'px');

    var bit = document.createElement('span');
    bit.className = 'wx-bit wx-' + spec.kind;
    bit.style.width = size + 'px';
    bit.style.height = size * (spec.kind === 'drop' ? 3.2 : 1) + 'px';
    var shade = pick(spec.colors);
    bit.style.background = shade;
    /* the star's halo is drawn with `currentColor`, so give it one */
    if (spec.kind === 'star') bit.style.color = shade;
    bit.style.opacity = rand(0.45, 0.9);

    drift.appendChild(bit);
    fall.appendChild(drift);
    return fall;
  }

  /* How each kind behaves. The shape itself is in css/style.css. */
  var KINDS = {
    /* `spin` is how far it turns on the way down. A petal tumbling is
       the whole charm of it. */
    petal: { size: [7, 13],  speed: [7, 14],  sway: [-34, 34], spin: [-540, 540] },
    leaf:  { size: [9, 16],  speed: [8, 16],  sway: [-40, 40], spin: [-540, 540] },
    /* Rain falls hard, almost straight, and DOES NOT TURN. Spinning it
       like a petal put raindrops on screen lying flat on their sides,
       which reads as a glitch rather than as weather. It keeps one
       fixed lean, set in CSS on the drop itself. */
    drop:  { size: [2, 3.5], speed: [1.1, 2.4], sway: [-5, 5], spin: [0, 0] },
    /* Deep Space: slow, tiny, barely there. A star that hurries reads
       as a bug, and one you can pick out individually reads as dust on
       the screen - the whole job is a field that moves without ever
       asking to be looked at. */
    star:  { size: [1.5, 3], speed: [18, 34], sway: [-8, 8], spin: [0, 0] }
  };

  /** Clears whatever was falling and starts this theme's weather.
      Called by Themes.apply(), so a theme change is the only thing
      that ever has to think about it. */
  function apply(theme) {
    if (!host) host = document.getElementById('weather');
    if (!host) return;

    host.innerHTML = '';
    host.hidden = true;

    var fall = theme && theme.fall;
    if (!fall || still) return;

    var spec = {
      kind: fall.kind,
      colors: fall.colors,
      size: KINDS[fall.kind].size,
      speed: KINDS[fall.kind].speed,
      sway: KINDS[fall.kind].sway,
      spin: KINDS[fall.kind].spin
    };

    var frag = document.createDocumentFragment();
    for (var i = 0; i < fall.count; i++) frag.appendChild(speck(spec, i));
    host.appendChild(frag);
    host.hidden = false;
  }

  return { apply: apply };
})();
