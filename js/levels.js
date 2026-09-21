/* ============================================================
   levels.js  -  the Day to Day pack
   ------------------------------------------------------------
   Each level is a place along a winding trail, getting busier as
   you go. Beat a level to unlock the next.

   EVERY LEVEL IS A PLACE. The `theme` picks which cards turn up, so
   Level 1 is nothing but things that happen in your house, Level 2 is
   nothing but school, and so on. Themes are listed in cards.js.

   ADDING OR TUNING A LEVEL:
     theme       where you are: 'house', 'school', 'phone' or 'out'
     seconds     how long the round lasts. 0 means NO CLOCK AT ALL
     goal        with no clock, how many cards you sort before it ends
     tiers       which card difficulties can appear (see cards.js)
     minAcc      share of cards you must get right to pass (0.6 = 60%)
     boxes       which kinds of card can appear in this level
     x, y        where the level sits on the map, in percent

   HOW THE DIFFICULTY RAMPS
   Four separate dials get turned up, one level at a time:

     Level  Place    Clock  Card difficulty    Corners  Must get right
     1      House    none   easy only          4        60%
     2      School   60s    easy + medium      4        65%
     3      Phone    75s    easy + med + hard  4        70%
     4      Out      90s    medium + hard      4        75%

   The places are in that order on purpose. Home is where the answers
   are most obvious. School adds other people, so Give Away starts to
   matter. A phone is the hardest thing in anyone's life to sort,
   because every single notification FEELS urgent. Out in town is
   last: other people, real deadlines, and no easy cards left.

   Level 1 is a lesson, not a test: no clock, and only cards with an
   obvious answer. All four corners are live from the start - the
   easing-in comes from `tiers`, not from hiding a corner.

   `boxes` is still there for any level that wants fewer than four.
   A corner left out is REMOVED from the screen, not greyed out, and
   the one beside it stretches to fill the space. Nothing uses that
   at the moment; it exists so a future level can.

   A LONGER CLOCK IS NOT AN EASIER LEVEL. Accuracy is the only thing
   that decides whether you pass, and accuracy does not care how many
   cards you got through. The clock only sets how big your score can
   be. Difficulty lives in `tiers` and `minAcc`.

   ADDING A FIFTH LEVEL: give it a new theme, write that theme a
   full set of cards in cards.js (7 in each corner is plenty), then
   add it here and put a marker on the trail in index.html.
   ============================================================ */

/* Kept short on purpose: a two-line pack title eats 31px off the map on a
   phone, which is a whole level marker's worth of trail. */
var PACK = { name: 'Day to Day', sub: 'Four places. Same four corners.' };

var LEVELS = [
  {
    n: 1,
    name: 'In the House',
    story: 'Chores, cooking, and the mess at home. No clock.',
    theme: 'house',
    seconds: 0,                       // no clock
    goal: 20,                         // ends after 20 cards
    minAcc: 0.60,
    boxes: ['now', 'later', 'give', 'drop'],
    tiers: [1],
    x: 26, y: 87
  },
  {
    n: 2,
    name: 'At School',
    story: 'Homework, tests and group work. Other people now.',
    theme: 'school',
    seconds: 60,
    minAcc: 0.65,
    boxes: ['now', 'later', 'give', 'drop'],
    tiers: [1, 2],
    x: 70, y: 68
  },
  {
    n: 3,
    name: 'On Your Phone',
    story: 'Everything buzzes like it matters. Most of it does not.',
    theme: 'phone',
    seconds: 75,
    minAcc: 0.70,
    boxes: ['now', 'later', 'give', 'drop'],
    tiers: [1, 2, 3],
    x: 28, y: 47
  },
  {
    n: 4,
    name: 'Out in Town',
    story: 'Buses, shops and friends. No easy cards left.',
    theme: 'out',
    seconds: 90,
    minAcc: 0.75,
    boxes: ['now', 'later', 'give', 'drop'],
    tiers: [2, 3],
    x: 66, y: 24
  }
];

/* ---------------- saved progress ---------------- */

var Progress = (function () {

  var KEY = 'task-sorter-progress-v1';

  function blank() {
    return {
      unlocked: 1,
      best: {},
      coins: 0,
      rivals: 0,
      owned: [],
      equipped: { pet: 'pet0', armour: 'arm0', weapon: 'wep0' },

      /* which background you play against. See js/themes.js. */
      theme: 'space',

      /* what the player called their character. Empty means they have
         not named it, and the game just says "You". */
      heroName: '',

      /* false until the player has been through the Guide Book once.
         Their very first tap on Play opens the book instead of the map,
         because a sorting game is meaningless if nobody ever explained
         what the four corners mean. */
      readGuide: false,

      /* which screens have already shown their first-time popup,
         e.g. { levels: true, shop: true }. See js/tips.js. */
      tipsSeen: {}
    };
  }

  var data = blank();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.unlocked === 'number') {
          var fresh = blank();
          // copy known keys so an older save never breaks a newer build
          for (var k in fresh) {
            if (parsed[k] !== undefined && parsed[k] !== null) fresh[k] = parsed[k];
          }
          if (!Array.isArray(fresh.owned)) fresh.owned = [];
          if (!fresh.equipped) fresh.equipped = blank().equipped;
          data = fresh;
        }
      }
    } catch (e) {
      /* private mode or storage off - the game still plays,
         it just will not remember between visits. */
    }
  }

  /* Anyone who wants to know when the save changed. The cloud save uses
     this to push progress up without every single button in the game
     having to remember to call it. */
  var listeners = [];

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](data); } catch (e) {}
    }
  }

  return {
    load: load,
    unlocked: function () { return data.unlocked; },
    isOpen: function (n) { return n <= data.unlocked; },
    best: function (n) { return data.best[n] || null; },

    /** Called at the end of a level. Unlocks the next one on a pass.

        ONLY A PASS IS RECORDED. A best grade is a badge for beating the
        level, and the map paints the marker as finished the moment one
        exists - so writing a failed run in there put a C on a level the
        player never actually passed, and it looked done from the map. */
    record: function (n, passed, grade, score) {
      var prev = data.best[n];
      if (passed && (!prev || score > prev.score)) {
        data.best[n] = { grade: grade, score: score };
      }
      if (passed && n === data.unlocked && n < LEVELS.length) {
        data.unlocked = n + 1;
      }
      save();
      return data.unlocked;
    },

    /* ---- coins and the shop ---- */
    coins: function () { return data.coins || 0; },
    addCoins: function (n) { data.coins = (data.coins || 0) + n; save(); return data.coins; },
    owns: function (id) { return data.owned.indexOf(id) !== -1; },
    equipped: function () { return data.equipped; },

    buy: function (id, cost) {
      if (data.coins < cost || data.owned.indexOf(id) !== -1) return false;
      data.coins -= cost;
      data.owned.push(id);
      save();
      return true;
    },

    equip: function (kind, id) { data.equipped[kind] = id; save(); },

    /* ---- the character's name ---- */
    heroName: function () { return data.heroName || ''; },
    setHeroName: function (n) {
      /* Trimmed, capped, and stripped of anything that could be read as
         HTML. It gets printed onto the screen, so it has to be text and
         nothing else. */
      data.heroName = String(n || '').replace(/[<>&]/g, '').trim().slice(0, 14);
      save();
    },

    /* ---- the background theme ---- */
    theme: function () { return data.theme || 'space'; },
    setTheme: function (id) { data.theme = id; save(); },

    /* ---- first-time popups ---- */
    hasSeenTip: function (name) { return !!(data.tipsSeen && data.tipsSeen[name]); },
    markTipSeen: function (name) {
      if (!data.tipsSeen || typeof data.tipsSeen !== 'object') data.tipsSeen = {};
      data.tipsSeen[name] = true;
      save();
    },

    /* ---- the Guide Book ---- */
    hasReadGuide: function () { return !!data.readGuide; },
    markGuideRead: function () { data.readGuide = true; save(); },

    rivalsBeaten: function () { return data.rivals || 0; },
    beatRival: function (n) { if (n > (data.rivals || 0)) { data.rivals = n; save(); } },

    reset: function () { data = blank(); save(); },

    /* ---- the whole save, for the cloud ----
       `all` hands out a copy so nothing outside can quietly edit the
       live save. `replaceAll` takes a whole save back, keeping only the
       keys this version of the game knows about, so a save written by a
       newer or older build can never break this one. */
    all: function () { return JSON.parse(JSON.stringify(data)); },

    replaceAll: function (incoming) {
      if (!incoming || typeof incoming !== 'object') return false;
      var fresh = blank();
      for (var k in fresh) {
        if (incoming[k] !== undefined && incoming[k] !== null) fresh[k] = incoming[k];
      }
      if (!Array.isArray(fresh.owned)) fresh.owned = [];
      if (!fresh.equipped) fresh.equipped = blank().equipped;
      data = fresh;
      save();
      return true;
    },

    /** Called after every save, with the new save. */
    subscribe: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})();
