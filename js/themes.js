/* ============================================================
   themes.js  -  the background you play against
   ------------------------------------------------------------
   The paint button in the top right of a round opens this. Pick a
   background, it changes straight away and is remembered for every
   round after.

   ADDING YOUR PICTURES (Louis):
   Save them with these exact names and nothing here needs editing:

       assets/themes/sakura.jpg
       assets/themes/forest.jpg
       assets/themes/waterfalls.jpg

   Until a file exists the browser quietly ignores it and you get the
   plain colour underneath, so a missing picture never breaks the game
   and never shows an error. Add them one at a time if you like.

   ADDING A FOURTH THEME: copy a line below, save a picture with the
   name you put in `file`. That is the whole job.

     id     saved in progress, so never rename one that is in use
     name   what the button says
     file   the picture, or null for a plain background
     tint   the colour behind the picture. Shows through while the
            picture loads, and stands in for it completely if the
            file is missing, so pick something close to the photo.
            Keep these LIGHT. The little swatch in the picker shows
            this colour raw, and a dark swatch just looks like a
            hole in the panel. The round itself darkens it (see dim
            below), so light here does not mean a washed-out screen
     dim    how hard to darken the picture, 0 to 1. Cards and corner
            labels sit on top of this, and white text on a bright
            photo is unreadable - this is what keeps them legible
     fall   OPTIONAL. Petals, leaves or rain drifting down over the
            top, drawn by js/weather.js. Leave it out for a still
            background. This is what makes a theme feel like a place
            rather than a colour, and it works with no photograph at
            all - which is why Sakura looks like a cherry tree today
            even though sakura.jpg has never existed
   ============================================================ */

var THEMES = [
  /* Deep Space is the default, and it is the screen most people will
     look at most of the time. With no `fall` it was a flat black page -
     which, now that the weather runs behind the MENUS too, was the
     single biggest thing making a game full of pixel art feel like a
     website. Stars drift down it instead. */
  { id: 'space',  name: 'Deep Space',  file: null,
    tint: '#0a0e1a', dim: 0,
    fall: { kind: 'star', count: 22,
            colors: ['#ffffff', '#cddcff', '#9db7ff', '#fff0c4'] } },

  /* THE DIMS ARE LOW NOW. They were 0.58 and 0.62, set for photographs
     that never arrived - a photograph is full of contrast and detail
     and has to be held right back before a card will read over it. What
     is behind the game now is drawn (js/scenery.js): flat silhouettes
     in a narrow band of colour, which is already most of the way there.
     At the old strength Sakura came out as dusk. */
  { id: 'sakura', name: 'Sakura',      file: null,
    tint: '#f6d3e2', dim: 0.30,
    fall: { kind: 'petal', count: 18,
            colors: ['#ffd7e6', '#ffc0d8', '#ff9ec4', '#fff0f6'] } },

  { id: 'forest', name: 'Forest',      file: null,
    tint: '#cfe6bd', dim: 0.30,
    fall: { kind: 'leaf', count: 14,
            colors: ['#a8d98a', '#7fbf63', '#d8e89a', '#5fa34d'] } },

  { id: 'falls',  name: 'Waterfalls',  file: null,
    tint: '#cbe6f0', dim: 0.26,
    fall: { kind: 'drop', count: 26,
            colors: ['#cfeaf6', '#9fd4ea', '#eaf7fd'] } }
];

/* What each chip in Settings shows: a strip of the world's own sky, so
   the little square is an honest preview of what you are about to get. */
var THEME_SWATCH = {
  space:  'linear-gradient(#05070f, #18234a 70%, #3a2a5a)',
  sakura: 'linear-gradient(#1f1233, #b8577a 60%, #f6c8c0)',
  forest: 'linear-gradient(#08141a, #3f7a5c 70%, #86b88a)',
  falls:  'linear-gradient(#06101e, #3f7c9c 70%, #7ab6cc)'
};

var Themes = (function () {

  /** Puts the saved background on the world. The world is drawn
      (js/world.js) and it is behind every scene, so this is the whole
      job now - no CSS layers, no separate weather. */
  function apply(instant) {
    if (window.World) World.setTheme(Progress.theme(), instant);
  }

  /** The chips in Settings. Tapping one changes the world behind the
      sheet while you watch, because it is the same world. */
  function paintSettings() {
    var host = document.getElementById('theme-picker-me');
    if (!host) return;
    host.innerHTML = '';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-chip' + (t.id === Progress.theme() ? ' is-worn' : '');
      var sw = document.createElement('span');
      sw.className = 'theme-swatch';
      sw.style.background = THEME_SWATCH[t.id] || t.tint;
      var name = document.createElement('small');
      name.textContent = t.name;
      b.appendChild(sw); b.appendChild(name);
      b.addEventListener('click', function () {
        Progress.setTheme(t.id);
        if (window.Sfx) Sfx.play('equip');
        apply();
        paintSettings();
      });
      host.appendChild(b);
    });
  }

  return {
    init: function () { apply(true); },
    apply: apply,
    paintSettings: paintSettings
  };
})();
