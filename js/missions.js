/* ============================================================
   missions.js  -  three small goals at a time, and badges for keeps
   ------------------------------------------------------------
   MISSIONS are short and they rotate: "get 5 Perfects in one round",
   "crack 3 frozen cards". Three are always on the go. Finish one and
   it pays out with that round - its coins fly into the wallet with the
   rest - and a new one takes its place. They get harder the more you
   finish.

   BADGES are forever: passing every level, a seven-day streak, sorting
   your own to-do list. Each one is earned once, and each one is the
   same as an achievement on HUAWEI's game service (js/services.js
   passes them on when the app is connected to it).

   ADDING A MISSION: copy a line in POOL.
     kind 'round'   the best you did in ONE round counts (perfects)
     kind 'total'   every round adds to it (cards sorted)
     value(s)       what to count, from the round summary game.js makes
     targets        easy, medium, hard - picked by how many you have done
     rewards        coins for each of those
     open()         optional: only offered once it can actually be done

   ADDING A BADGE: copy a line in BADGES. `got(s)` is asked at the end of
   every round (and after buying something) and answers true once
   earned.
   ============================================================ */

var Missions = (function () {

  var ACTIVE = 3;

  var POOL = [
    { id: 'perfects', kind: 'round', targets: [5, 8, 12], rewards: [40, 60, 90],
      text: function (n) { return 'Get ' + n + ' Perfects in one round'; },
      value: function (s) { return s.perfects; } },
    { id: 'combo', kind: 'round', targets: [5, 8, 8], rewards: [40, 60, 70],
      text: function (n) { return 'Reach a x' + n + ' combo'; },
      value: function (s) { return s.bestStreak; } },
    { id: 'sort', kind: 'total', targets: [30, 60, 120], rewards: [40, 70, 110],
      text: function (n) { return 'Sort ' + n + ' cards right'; },
      value: function (s) { return s.mode === 'mine' ? 0 : s.correct; } },
    /* The corner the whole game argues is the one that changes your
       life - so it gets a mission of its own. */
    { id: 'later', kind: 'total', targets: [6, 12, 20], rewards: [40, 60, 90],
      text: function (n) { return 'Sort ' + n + ' Do Later cards right'; },
      value: function (s) { return s.laterRight; } },
    { id: 'gold', kind: 'total', targets: [3, 5, 8], rewards: [40, 60, 90],
      text: function (n) { return 'Sort ' + n + ' golden cards'; },
      value: function (s) { return s.golds; } },
    { id: 'ice', kind: 'total', targets: [3, 6, 10], rewards: [40, 60, 90],
      text: function (n) { return 'Crack ' + n + ' frozen cards'; },
      value: function (s) { return s.ices; },
      open: function () { return Progress.unlocked() >= 2; } },
    { id: 'gradeA', kind: 'round', targets: [1, 1, 1], rewards: [50, 50, 50],
      text: function () { return 'Get an A or better on a level'; },
      value: function (s) { return s.mode === 'level' && s.passed && (s.grade === 'A' || s.grade === 'S') ? 1 : 0; } },
    { id: 'gradeS', kind: 'round', targets: [1, 1, 1], rewards: [90, 90, 90],
      text: function () { return 'Get an S on any level'; },
      value: function (s) { return s.mode === 'level' && s.passed && s.grade === 'S' ? 1 : 0; },
      open: function () { return Progress.unlocked() >= 2; } },
    { id: 'flawless', kind: 'round', targets: [1, 1, 1], rewards: [60, 60, 60],
      text: function () { return 'Finish a round with no mistakes'; },
      value: function (s) { return s.flawless ? 1 : 0; } },
    { id: 'boss', kind: 'round', targets: [1, 1, 1], rewards: [50, 50, 50],
      text: function () { return 'Beat a boss'; },
      value: function (s) { return s.mode === 'battle' && s.passed ? 1 : 0; } },
    { id: 'bossHp', kind: 'round', targets: [40, 60, 75], rewards: [60, 80, 110],
      text: function (n) { return 'Beat a boss with ' + n + '+ health left'; },
      value: function (s) { return s.mode === 'battle' && s.passed ? s.hpLeft : 0; },
      open: function () { return Progress.rivalsBeaten() >= 1; } },
    { id: 'daily', kind: 'round', targets: [1, 1, 1], rewards: [40, 40, 40],
      text: function () { return 'Play the Daily Challenge'; },
      value: function (s) { return s.mode === 'daily' ? 1 : 0; },
      open: function () { return Daily.isOpen(); } },
    { id: 'score', kind: 'round', targets: [6000, 15000, 30000], rewards: [40, 70, 110],
      text: function (n) { return 'Score ' + n.toLocaleString() + ' in one round'; },
      value: function (s) { return s.score; } }
  ];

  function def(id) { for (var i = 0; i < POOL.length; i++) if (POOL[i].id === id) return POOL[i]; return null; }

  /** How hard new missions are: easy, then medium after four, then hard. */
  function tier() { return Math.min(2, Math.floor((Progress.get('missionsDone') || 0) / 4)); }

  function fresh(not) {
    var t = tier();
    var open = POOL.filter(function (m) { return not.indexOf(m.id) === -1 && (!m.open || m.open()); });
    var m = open[Math.floor(Math.random() * open.length)] || POOL[0];
    return { id: m.id, target: m.targets[t], reward: m.rewards[t], prog: 0 };
  }

  /** The three on the go, making them the first time anyone asks. */
  function active() {
    var list = Progress.get('missions');
    if (!Array.isArray(list) || !list.length) {
      list = [];
      while (list.length < ACTIVE) list.push(fresh(list.map(function (m) { return m.id; })));
      Progress.edit('missions', function () { return list; });
    }
    return list.filter(function (m) { return !!def(m.id); });
  }

  /** Told what a round did. Returns every mission it finished. */
  function record(s) {
    var done = [];
    Progress.edit('totals', function (t) {
      t.rounds++;
      if (s.mode !== 'mine') {
        t.sorted += s.correct; t.golds += s.golds; t.ices += s.ices;
        t.later += s.laterRight; t.perfects += s.perfects;
      }
      return t;
    });
    var list = active();
    var next = [];
    list.forEach(function (m) {
      var d = def(m.id);
      var v = d.value(s) || 0;
      m.prog = d.kind === 'total' ? m.prog + v : Math.max(m.prog, v);
      if (m.prog >= m.target) {
        done.push({ text: d.text(m.target), reward: m.reward });
        next.push(null);
      } else next.push(m);
    });
    if (done.length) {
      Progress.edit('missionsDone', function (n) { return (n || 0) + done.length; });
      var keep = next.filter(Boolean).map(function (m) { return m.id; });
      next = next.map(function (m) {
        if (m) return m;
        var f = fresh(keep);
        keep.push(f.id);
        return f;
      });
    }
    Progress.edit('missions', function () { return next; });
    return done;
  }

  /** For the sheet. */
  function view() {
    return active().map(function (m) {
      var d = def(m.id);
      return { text: d.text(m.target), prog: Math.min(m.prog, m.target), target: m.target, reward: m.reward };
    });
  }

  return { active: active, record: record, view: view, pool: POOL };
})();

var BADGES = [
  { id: 'first_pass', name: 'First Steps', desc: 'Pass Level 1', icon: 'star',
    got: function () { return !!Progress.best(1); } },
  { id: 'trail', name: 'Trailblazer', desc: 'Pass every level', icon: 'flag',
    got: function () { return LEVELS.every(function (l) { return !!Progress.best(l.n); }); } },
  { id: 'all_s', name: 'Perfectionist', desc: 'Get an S on every level', icon: 'crown',
    got: function () { return LEVELS.every(function (l) { var b = Progress.best(l.n); return b && b.grade === 'S'; }); } },
  { id: 'boss_1', name: 'Unstuck', desc: 'Beat Sticky Steve', icon: 'battle',
    got: function () { return Progress.rivalsBeaten() >= 1; } },
  { id: 'boss_all', name: 'Boss of Bosses', desc: 'Beat every boss', icon: 'crown',
    got: function () { return Progress.rivalsBeaten() >= OPPONENTS.length; } },
  { id: 'combo8', name: 'On Fire', desc: 'Reach a x8 combo', icon: 'fire',
    got: function (s) { return !!s && s.bestStreak >= 8; } },
  { id: 'perfect15', name: 'Lightning', desc: '15 Perfects in one round', icon: 'bolt',
    got: function (s) { return !!s && s.perfects >= 15; } },
  { id: 'flawless', name: 'Spotless', desc: 'A round with no mistakes', icon: 'shield',
    got: function (s) { return !!s && !!s.flawless; } },
  { id: 'later50', name: 'Future You', desc: 'Sort 50 Do Later cards right', icon: 'cal',
    got: function () { return Progress.get('totals').later >= 50; } },
  { id: 'gold25', name: 'Gold Digger', desc: 'Sort 25 golden cards', icon: 'coin',
    got: function () { return Progress.get('totals').golds >= 25; } },
  { id: 'ice25', name: 'Ice Breaker', desc: 'Crack 25 frozen cards', icon: 'ice',
    got: function () { return Progress.get('totals').ices >= 25; } },
  { id: 'daily3', name: 'Regular', desc: 'A 3-day daily streak', icon: 'cal',
    got: function () { return Daily.bestStreak() >= 3; } },
  { id: 'daily7', name: 'Habit', desc: 'A 7-day daily streak', icon: 'fire',
    got: function () { return Daily.bestStreak() >= 7; } },
  { id: 'mylist', name: 'For Real', desc: 'Sort your own to-do list', icon: 'book',
    got: function (s) { return !!s && s.mode === 'mine'; } },
  { id: 'pets5', name: 'Zookeeper', desc: 'Own 5 pets', icon: 'duck',
    got: function () { return SHOP.pet.items.filter(function (it) { return it.cost && Progress.owns(it.id); }).length >= 5; } },
  { id: 'saver', name: 'Saver', desc: 'Have 1,000 coins at once', icon: 'coin',
    got: function () { return Progress.coins() >= 1000; } }
];

var Badges = (function () {
  function has(id) { var b = Progress.get('badges'); return !!(b && b[id]); }

  /** Everything newly earned, after whatever just happened. */
  function check(s) {
    var won = [];
    BADGES.forEach(function (b) {
      if (has(b.id)) return;
      var ok = false;
      try { ok = b.got(s); } catch (e) { ok = false; }
      if (ok) won.push(b);
    });
    if (won.length) {
      Progress.edit('badges', function (all) {
        all = all || {};
        won.forEach(function (b) { all[b.id] = Date.now(); });
        return all;
      });
      won.forEach(function (b) { Services.achievement(b.id); });
    }
    return won.map(function (b) { return { id: b.id, name: b.name, desc: b.desc }; });
  }

  /** Earned outside a round (buying a fifth pet): said with a toast. */
  function checkQuietly() {
    var won = check(null);
    if (won.length) {
      Sfx.play('unlock'); Haptics.win();
      Panels.toast('Badge earned: ' + won[0].name + '!', 'good');
    }
  }

  return {
    check: check,
    checkQuietly: checkQuietly,
    has: has,
    count: function () { return BADGES.filter(function (b) { return has(b.id); }).length; }
  };
})();
