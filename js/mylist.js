/* ============================================================
   mylist.js  -  your own to-do list, sorted with the four corners
   ------------------------------------------------------------
   Everything else in the game is practice. This is the real thing:
   type what is actually on your plate, sort it the way the cards
   taught you, and keep the result as a plan in four piles.

   NOBODY MARKS IT. The game cannot know whether YOUR science project
   is a Do Now or a Do Later - only you can - so a round of your own
   list has no score, no clock and no wrong answers. The four corners
   are the help: the same two questions, asked about your own life.

   It lives in the save (`myTasks`), so it is there tomorrow, and it
   never leaves the phone unless you made an account to keep your
   save online.
   ============================================================ */

var MyList = (function () {

  var MAX = 30, MAX_LEN = 60;
  var ORDER = [null, 'now', 'later', 'give', 'drop'];
  var HINT = {
    null: 'Not sorted yet',
    now: 'Matters, and it is due. Start with these.',
    later: 'Matters, not yet. Pick a day for each one.',
    give: 'Urgent, but not yours. Who could do it?',
    drop: 'Let these go. Really.'
  };
  var lastPlan = false;

  function all() { return Progress.get('myTasks') || []; }
  function $(id) { return document.getElementById(id); }

  function add(text) {
    text = String(text || '').replace(/[<>&]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
    if (!text) return false;
    if (all().length >= MAX) { Panels.toast('That is a lot already. Sort these first.', 'bad'); return false; }
    Progress.edit('myTasks', function (list) {
      list.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: text, box: null, done: false });
      return list;
    });
    return true;
  }

  function change(id, fn) {
    Progress.edit('myTasks', function (list) {
      return list.map(function (t) { if (t.id === id) fn(t); return t; });
    });
  }

  function remove(id) { Progress.edit('myTasks', function (list) { return list.filter(function (t) { return t.id !== id; }); }); }

  /** What a round of your list deals: what you have not sorted yet - or,
      if everything has a corner, everything not done, so you can sort
      the week again when it has changed. */
  function toSort() {
    var open = all().filter(function (t) { return !t.done; });
    var fresh = open.filter(function (t) { return !t.box; });
    return fresh.length ? fresh : open;
  }

  /* ---------------- the sheet ---------------- */

  function paint(o) {
    if (o && o.plan) lastPlan = true;
    var host = $('mine-plan');
    if (!host) return;
    host.innerHTML = '';
    var list = all();
    $('mine-empty').hidden = list.length > 0;
    var groups = ORDER.map(function (box) { return { box: box, items: list.filter(function (t) { return (t.box || null) === box; }) }; });
    groups.forEach(function (g) {
      if (!g.items.length) return;
      var sec = document.createElement('div');
      sec.className = 'mine-group' + (g.box ? ' box-' + g.box : ' is-unsorted');
      var h = document.createElement('h4');
      h.innerHTML = '<b>' + (g.box ? BOXES[g.box].label : 'To sort') + '</b><small>' + HINT[g.box] + '</small>';
      sec.appendChild(h);
      g.items.forEach(function (t, i) {
        var row = document.createElement('div');
        row.className = 'mine-row' + (t.done ? ' is-done' : '');
        row.style.setProperty('--i', i);
        var tick = document.createElement('button');
        tick.type = 'button'; tick.className = 'mine-tick';
        tick.setAttribute('aria-label', t.done ? 'Mark not done' : 'Mark done');
        tick.addEventListener('click', function () {
          change(t.id, function (x) { x.done = !x.done; });
          Sfx.play(t.done ? 'press' : 'right', 3); Haptics.good();
          paint();
        });
        var txt = document.createElement('span');
        txt.className = 'mine-text';
        txt.textContent = t.text;
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'mine-x'; x.textContent = '×';
        x.setAttribute('aria-label', 'Remove');
        x.addEventListener('click', function () {
          row.classList.add('is-gone');
          Sfx.play('close');
          setTimeout(function () { remove(t.id); paint(); }, 180);
        });
        row.appendChild(tick); row.appendChild(txt); row.appendChild(x);
        sec.appendChild(row);
      });
      host.appendChild(sec);
    });
    var n = toSort().length;
    var btn = $('mine-sort');
    btn.disabled = n === 0;
    btn.textContent = n === 0 ? 'Add something to sort' : list.some(function (t) { return !t.box && !t.done; })
      ? 'Sort ' + n + (n === 1 ? ' task' : ' tasks') : 'Sort the week again';
    $('mine-clear').hidden = !list.some(function (t) { return t.done; });
    $('mine-lead').textContent = lastPlan
      ? 'Your plan. Tick things off as you do them.'
      : 'Type what is really on your plate this week. Then sort it with the four corners.';
  }

  function init() {
    $('mine-add').addEventListener('submit', function (e) {
      e.preventDefault();
      var box = $('mine-text');
      if (add(box.value)) {
        box.value = '';
        Sfx.play('pop'); Haptics.tap();
        lastPlan = false;
        paint();
        var rows = document.querySelectorAll('#mine-plan .is-unsorted .mine-row');
        if (rows.length) rows[rows.length - 1].classList.add('is-new');
      }
    });
    $('mine-text').addEventListener('keydown', function (e) { e.stopPropagation(); });
    $('mine-sort').addEventListener('click', function () {
      if (!toSort().length) return;
      Panels.close('mine', true);
      Stage.go('round', { mine: true }, 'iris');
    });
    $('mine-clear').addEventListener('click', function () {
      Progress.edit('myTasks', function (list) { return list.filter(function (t) { return !t.done; }); });
      Sfx.play('close');
      paint();
    });
  }

  return {
    init: init,
    paint: paint,
    all: all,
    add: add,
    toSort: toSort,
    place: function (id, box) { change(id, function (t) { t.box = box; }); },
    finished: function () { lastPlan = true; },
    count: function () { return all().filter(function (t) { return !t.done; }).length; }
  };
})();
