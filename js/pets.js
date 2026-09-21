/* ============================================================
   pets.js  -  the animated pet collection
   ------------------------------------------------------------
   The thirteen buddies from MyTask, brought across whole. Every
   one is a real sprite sheet drawn by an artist, not a 16x16 grid
   typed out in js/sprites.js - so they get their own file and
   their own way of being drawn.

   HOW THEY ARE PLAYED
   A sheet is one long strip of frames. The pet is a box with the
   strip as its background, and playing it is nothing more than
   sliding `background-position` one cell to the left on a timer.
   No canvas, no redraw per frame, and it costs nothing on a screen
   that already has cards flying about.

   ONE TIMER FOR THE WHOLE GAME. The shop shows fourteen pets at
   once; fourteen separate intervals would be fourteen things to
   start, stop and leak. Instead every pet on screen is registered
   in one list and a single ticker walks it, dropping anything that
   has left the page. See `step` at the bottom.

   ADDING A PET: drop the sheet in assets/pets/ and add an entry.
     cellW, cellH   one frame, in real pixels
     width, height  the whole sheet, so the background can scale
     frames, fps    how many cells and how fast to walk them
     body           the biggest box the creature actually fills
     offset         how far its middle sits below the cell's middle
     name           what the shop calls it

   WHY `body` AND `offset` EXIST
   A cell is not a creature. The Phoenixling is a 23x21 bird adrift
   in a 40x56 cell, because the cell is tall enough for the rebirth
   animation; the Dragon fills 79x41 of its 83x48. Scale both to the
   same cell height and the bird comes out half the size of the
   dragon, because it is. So the scale is worked out from `body`,
   the part that is actually drawn, and `offset` slides the creature
   off the floor of its cell and into the middle of its box.

   ART AND LICENCES: see assets/pets/CREDITS.md.
   ============================================================ */

var PET_SHEETS = {

  duck: {
    name: 'Duck', src: 'assets/pets/duck.png',
    cellW: 31, cellH: 48, width: 310, height: 48,
    frames: 10, fps: 12, body: { w: 30, h: 48 }, offset: 0
  },
  kitten: {
    name: 'Kitten', src: 'assets/pets/kitten.png',
    cellW: 35, cellH: 48, width: 350, height: 48,
    frames: 10, fps: 12, body: { w: 34, h: 48 }, offset: 0
  },
  mushroom: {
    name: 'Mushroom', src: 'assets/pets/mushroom.png',
    cellW: 45, cellH: 48, width: 450, height: 48,
    frames: 10, fps: 12, body: { w: 45, h: 48 }, offset: 0
  },
  hatchling: {
    name: 'Hatchling', src: 'assets/pets/hatchling.png',
    cellW: 24, cellH: 36, width: 120, height: 36,
    frames: 5, fps: 12, body: { w: 24, h: 36 }, offset: 0
  },
  bunny: {
    name: 'Bunny', src: 'assets/pets/bunny.png',
    cellW: 31, cellH: 48, width: 248, height: 48,
    frames: 8, fps: 12, body: { w: 31, h: 48 }, offset: 0
  },
  slime: {
    name: 'Adventurer', src: 'assets/pets/slime.png',
    cellW: 44, cellH: 48, width: 440, height: 48,
    frames: 10, fps: 12, body: { w: 44, h: 48 }, offset: 0
  },
  teddy_bear: {
    name: 'Teddy Bear', src: 'assets/pets/teddy_bear.png',
    cellW: 32, cellH: 48, width: 320, height: 48,
    frames: 10, fps: 12, body: { w: 32, h: 48 }, offset: 0
  },
  penguin: {
    name: 'Penguin', src: 'assets/pets/penguin.png',
    cellW: 31, cellH: 48, width: 310, height: 48,
    frames: 10, fps: 12, body: { w: 30, h: 48 }, offset: 0
  },
  zombie: {
    name: 'Zombie', src: 'assets/pets/zombie.png',
    cellW: 38, cellH: 48, width: 342, height: 48,
    frames: 9, fps: 12, body: { w: 37, h: 48 }, offset: 0
  },
  flame_sprite: {
    name: 'Flame Sprite', src: 'assets/pets/flame_sprite.png',
    cellW: 26, cellH: 18, width: 338, height: 18,
    frames: 13, fps: 12, body: { w: 26, h: 18 }, offset: 0
  },
  polar_bear: {
    name: 'Polar Bear', src: 'assets/pets/polar_bear.png',
    cellW: 32, cellH: 48, width: 320, height: 48,
    frames: 10, fps: 12, body: { w: 32, h: 48 }, offset: 0
  },
  /* Not pixel art at heart - a painted, bone-animated dragon reduced
     down to a strip. It is the widest creature in the set by a long
     way, so it ends up the smallest on screen for its box. */
  dragon: {
    name: 'Dragon', src: 'assets/pets/dragon.png',
    cellW: 83, cellH: 48, width: 1328, height: 48,
    frames: 16, fps: 12, body: { w: 79, h: 41 }, offset: 4
  },
  /* The idle bird sits on the floor of a cell built tall enough for
     the rebirth animation, hence the big offset. */
  phoenix: {
    name: 'Phoenixling', src: 'assets/pets/phoenix.png',
    cellW: 40, cellH: 56, width: 640, height: 112,
    frames: 4, fps: 6, body: { w: 23, h: 21 }, offset: 15
  }
};

var Pets = (function () {

  /* Everything currently being played. One entry per element on
     screen; the ticker below walks the lot. */
  var live = [];
  var ticker = null;

  /* Someone who asked for less motion gets the first frame, held. */
  var still = false;
  try {
    still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* no matchMedia: play it */ }

  function has(key) { return !!PET_SHEETS[key]; }

  function nameOf(key) {
    return PET_SHEETS[key] ? PET_SHEETS[key].name : '';
  }

  /** Draws pet `key` inside `el`, sized so the creature - not the
      cell it was drawn on - fills a box `box` pixels across.

      `el` is the box. The creature goes in a child, because the
      child has to be the size of a whole CELL for the background to
      line up, and a cell is often bigger than the box. The extra is
      transparent, so it never covers anything. */
  function apply(el, key, box) {
    var sheet = PET_SHEETS[key];
    if (!sheet) return false;

    box = box || 40;
    el.innerHTML = '';
    el.classList.add('pet-art');
    el.style.backgroundImage = '';     // clear any 16x16 sprite left behind

    /* Scaled off the body, so a small bird on a tall canvas comes out
       the same size as a creature that fills its cell. Capped, or the
       18px Flame Sprite would be blown up past everything else. */
    var k = box / Math.max(sheet.body.w, sheet.body.h);
    k = Math.min(k, 3);

    /* ...and capped again on the CELL, not the body. The Phoenixling is
       a 23px bird on a 56px canvas: scale it so the bird matches the
       others and the cell comes out two and a half tiles tall, hanging
       transparently over everything around it. Held to a little over
       the box, the bird ends up a touch smaller than a creature that
       fills its own cell, which is the honest trade - it IS a smaller
       creature. */
    var roomy = box * 2.2;
    k = Math.min(k, roomy / Math.max(sheet.cellW, sheet.cellH));

    var frame = document.createElement('span');
    frame.className = 'pet-frame';
    frame.style.width = sheet.cellW * k + 'px';
    frame.style.height = sheet.cellH * k + 'px';
    frame.style.backgroundImage = 'url("' + sheet.src + '")';
    frame.style.backgroundSize = (sheet.width * k) + 'px ' + (sheet.height * k) + 'px';
    // the whole sheet is scaled, so the offset scales with it
    if (sheet.offset) frame.style.transform = 'translateY(-' + (sheet.offset * k) + 'px)';
    el.appendChild(frame);

    /* `screen` is worked out on the first tick, not here: a shop tile is
       built and painted before it is put on the page, so right now there
       is no screen above it to find. */
    var entry = { el: frame, sheet: sheet, k: k, frame: 0, waited: 0, screen: undefined };
    draw(entry);
    if (!still) {
      live.push(entry);
      startTicker();
    }
    return true;
  }

  function draw(e) {
    e.el.style.backgroundPosition = '-' + (e.frame * e.sheet.cellW * e.k) + 'px 0';
  }

  /* ---------------- the one ticker ---------------- */

  var STEP_MS = 40;   // 25 times a second, fast enough for a 12fps sheet

  function startTicker() {
    if (ticker) return;
    ticker = setInterval(step, STEP_MS);
  }

  function step() {
    for (var i = live.length - 1; i >= 0; i--) {
      var e = live[i];

      /* Repainting a screen throws the old elements away. Nothing
         tells us when that happens, so the ticker checks: anything no
         longer in the page stops being played and is forgotten. */
      if (!e.el.isConnected) { live.splice(i, 1); continue; }

      /* A screen that is not showing is display:none, and its pets were
         still being walked frame by frame behind it - the shop's
         fourteen kept running the whole time you were in a round. They
         stay in the list, because the screen comes back, but nothing is
         written while nobody can see them.

         Asked by class rather than by measuring: reading a position or
         an offsetParent makes the browser lay the page out, which is
         the one thing a 25-times-a-second timer must not do. */
      if (e.screen === undefined) e.screen = e.el.closest('.screen');
      if (e.screen && !e.screen.classList.contains('is-on')) continue;

      e.waited += STEP_MS;
      if (e.waited < 1000 / e.sheet.fps) continue;
      e.waited = 0;
      e.frame = (e.frame + 1) % e.sheet.frames;
      draw(e);
    }

    // nothing left on screen: stop burning a timer until there is
    if (!live.length) { clearInterval(ticker); ticker = null; }
  }

  return {
    has: has,
    name: nameOf,
    apply: apply,
    /** How many pets are being played right now. For testing. */
    liveCount: function () { return live.length; }
  };
})();
