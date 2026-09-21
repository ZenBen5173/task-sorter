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
  { id: 'space',  name: 'Deep Space',  file: null,
    tint: '#0e1218', dim: 0 },

  /* Louis's cherry blossom photo: white blossom, blue sky, a purple and
     magenta carpet underneath. It is a BRIGHT picture, so it needs a
     heavier dim than the others or the corner labels wash out. */
  { id: 'sakura', name: 'Sakura',      file: 'assets/themes/sakura.jpg',
    tint: '#f6d3e2', dim: 0.62,
    fall: { kind: 'petal', count: 18,
            colors: ['#ffd7e6', '#ffc0d8', '#ff9ec4', '#fff0f6'] } },

  { id: 'forest', name: 'Forest',      file: 'assets/themes/forest.jpg',
    tint: '#cfe6bd', dim: 0.58,
    fall: { kind: 'leaf', count: 14,
            colors: ['#a8d98a', '#7fbf63', '#d8e89a', '#5fa34d'] } },

  { id: 'falls',  name: 'Waterfalls',  file: 'assets/themes/waterfalls.jpg',
    tint: '#cbe6f0', dim: 0.58,
    fall: { kind: 'drop', count: 26,
            colors: ['#cfeaf6', '#9fd4ea', '#eaf7fd'] } }
];

var Themes = (function () {

  var open = false;

  function find(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return THEMES[i];
    }
    return THEMES[0];
  }

  function current() { return find(Progress.theme()); }

  /** Paints the chosen background onto the play screen. */
  function apply() {
    var el = UI.$('screen-play');
    var t = current();

    /* Layered back to front: the dark scrim, then the picture, then the
       plain tint. A missing picture just drops out of the middle and the
       tint carries the screen on its own. */
    var layers = [];
    if (t.dim > 0) {
      layers.push('linear-gradient(rgba(6,9,14,' + t.dim + '), rgba(6,9,14,' + t.dim + '))');
    }
    /* No "../" in front of the path. These are inline styles written by
       JavaScript, so the browser measures the address from index.html,
       not from the stylesheet the way css/style.css does. It happens to
       survive at the top of a site because a browser refuses to climb
       above the root, but it would break the moment the game lived in a
       subfolder. */
    if (t.file) layers.push('url("' + t.file + '") center / cover no-repeat');
    layers.push(t.tint);

    el.style.background = layers.join(', ');
    el.setAttribute('data-theme', t.id);

    /* The moving half of the background. A theme with a `fall` gets
       petals, leaves or rain over the top of its colour; one without
       gets a still screen, which is what Deep Space is for. */
    if (window.Weather) Weather.apply(t);
  }

  /* ---------------- the picker ---------------- */

  function paint() {
    var host = UI.$('theme-picker');
    host.innerHTML = '';
    host.classList.toggle('is-on', open);
    host.hidden = !open;
    UI.$('btn-theme').classList.toggle('is-on', open);

    if (!open) return;
    fill(host, true);
  }

  /** The same picker, built into the Me screen, where it is always
      open and has no clock to pause. Choosing a background used to be
      possible ONLY from inside a round, which meant starting a level
      to change how the game looks. */
  function paintSettings() {
    var host = UI.$('theme-picker-me');
    if (!host) return;
    host.innerHTML = '';
    fill(host, false);
  }

  /** Builds the chips into `host`. `titled` is off on the Me screen,
      which has its own heading above it already. */
  function fill(host, titled) {
    if (titled) {
      var title = document.createElement('p');
      title.className = 'theme-title';
      title.textContent = 'Background';
      host.appendChild(title);
    }

    var row = document.createElement('div');
    row.className = 'theme-row';

    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-chip' + (t.id === Progress.theme() ? ' is-worn' : '');

      var swatch = document.createElement('span');
      swatch.className = 'theme-swatch';
      /* Same layering as the real thing, so the little square is an
         honest preview: with the picture missing you see the tint here
         too, which is exactly what you would get in the round. */
      swatch.style.background = (t.file ? 'url("' + t.file + '") center / cover no-repeat, ' : '') + t.tint;

      var name = document.createElement('small');
      name.textContent = t.name;

      b.appendChild(swatch);
      b.appendChild(name);
      b.addEventListener('click', function () {
        Progress.setTheme(t.id);
        UI.sound.tick();
        apply();
        /* Both pickers redraw, so whichever one you did not use is
           still showing the right thing when you get to it. */
        if (open) paint();
        paintSettings();
      });
      row.appendChild(b);
    });

    host.appendChild(row);

    if (titled) {
      var hint = document.createElement('p');
      hint.className = 'theme-hint';
      hint.textContent = 'The clock is paused while this is open.';
      host.appendChild(hint);
    }
  }

  /** Opening the picker pauses the round. Changing the background is a
      decoration, so it must never cost you seconds off your clock. */
  function toggle() {
    open = !open;
    if (open) Game.pause(); else Game.resume();
    UI.sound.tick();
    paint();
  }

  function close() {
    if (!open) return;
    open = false;
    Game.resume();
    paint();
  }

  /** The little preview strip in the Guide Book. Read-only: it is there
      so a new player learns the picker EXISTS, not to change anything.
      Built from the same THEMES list, so adding a theme updates the
      Guide Book on its own and it can never go out of date. */
  function paintGuide() {
    var host = UI.$('guide-swatches');
    if (!host) return;
    host.innerHTML = '';

    THEMES.forEach(function (t) {
      var cell = document.createElement('span');
      cell.className = 'guide-swatch';

      var sw = document.createElement('span');
      sw.className = 'guide-swatch-box';
      sw.style.background = (t.file ? 'url("' + t.file + '") center / cover no-repeat, ' : '') + t.tint;

      var name = document.createElement('small');
      name.textContent = t.name;

      cell.appendChild(sw);
      cell.appendChild(name);
      host.appendChild(cell);
    });
  }

  function init() {
    UI.$('btn-theme').addEventListener('click', toggle);
    paintGuide();
    paintSettings();
    apply();
  }

  return {
    init: init,
    apply: apply,
    close: close,
    paintSettings: paintSettings,
    isOpen: function () { return open; }
  };
})();
