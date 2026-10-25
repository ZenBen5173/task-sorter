/* ============================================================
   themes.js  -  which desk you play on
   ------------------------------------------------------------
   Settings and the pause menu both offer the four surfaces; pick one
   and it changes behind the sheet while you watch, and is remembered.
   The surfaces themselves are painted in js/world.js.

     id      saved in progress. Older saves say 'space', 'sakura',
             'forest' or 'falls'; world.js maps those onto these.
     name    what the chip says
   ============================================================ */

var THEMES = [
  { id: 'cork',  name: 'Cork Board' },
  { id: 'wood',  name: 'Wood Desk' },
  { id: 'mat',   name: 'Cutting Mat' },
  { id: 'chalk', name: 'Chalkboard' }
];

/* What each chip shows: a scrap of the surface itself. */
var THEME_SWATCH = {
  cork:  'radial-gradient(rgba(74,42,14,.45) 1px, transparent 1.6px) 0 0 / 6px 6px, #b9895a',
  wood:  'repeating-linear-gradient(90deg, #8a5a32 0 18px, #7a4e2a 18px 20px, #96643a 20px 36px)',
  mat:   'linear-gradient(rgba(230,250,230,.25) 1px, transparent 1px) 0 0 / 10px 10px, linear-gradient(90deg, rgba(230,250,230,.25) 1px, transparent 1px) 0 0 / 10px 10px, #2f6b4a',
  chalk: 'linear-gradient(160deg, rgba(230,240,232,.12), transparent 60%), #26332c'
};

var Themes = (function () {

  function current() { return window.World ? World.theme() : Progress.theme(); }

  /** Puts the saved surface on the world. */
  function apply(instant) {
    if (window.World) World.setTheme(Progress.theme(), instant);
  }

  /** The chips in Settings. */
  function paintSettings() {
    var host = document.getElementById('theme-picker-me');
    if (!host) return;
    host.innerHTML = '';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-chip' + (t.id === current() ? ' is-worn' : '');
      var sw = document.createElement('span');
      sw.className = 'theme-swatch';
      sw.style.background = THEME_SWATCH[t.id];
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
    current: current,
    paintSettings: paintSettings
  };
})();
