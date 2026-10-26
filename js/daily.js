/* ============================================================
   daily.js  -  one round a day, the same for everybody
   ------------------------------------------------------------
   The deck, which cards are special and when the trays swap all come
   from a random number seeded with TODAY'S DATE (see startDaily in
   js/game.js). Two phones, same day, same round.

   WHY IT EXISTS. Levels run out: four of them, then you are replaying.
   A daily round never runs out, and a streak - "four days in a row" -
   is the reason to open the game tomorrow that a finished map is not.

   THE STREAK. Play on a day and the streak goes up by one if you also
   played yesterday, or starts again at one if you did not. The first
   finish each day pays a bonus that grows with the streak, capped at a
   week so missing a day is a loss but not a disaster.

   It opens once Level 1 is passed: a first-time player meets the four
   corners on the gentle level, not in a round that deals everything.
   ============================================================ */

var DAILY = {
  SECONDS: 75,
  GOLD: 0.08, ICE: 0.1, FUSE: 0.12,     // a bit of every twist
  SHUFFLE_EVERY: 20,                    // seconds between tray swaps
  EPOCH: [2026, 10, 1],                 // Daily #1
  BONUS_BASE: 40,
  BONUS_PER_DAY: 15,
  BONUS_CAP_DAYS: 7
};

var Daily = (function () {

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /** The date in the player's own time zone - their today, not London's. */
  function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function dayNumber(d) {
    var e = DAILY.EPOCH;
    var a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    var b = Date.UTC(e[0], e[1] - 1, e[2]);
    return Math.max(1, Math.round((a - b) / 86400000) + 1);
  }

  /** A whole number from a string (FNV-1a), for the seed. */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function today() {
    var d = new Date();
    var key = keyOf(d);
    return { key: key, number: dayNumber(d), seed: hash('task-sorter:' + key) };
  }

  function yesterdayKey() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return keyOf(d);
  }

  function rec() { return Progress.get('daily'); }

  /** The streak as it stands: still alive if you played today or
      yesterday, otherwise gone. */
  function streak() {
    var r = rec();
    if (!r || !r.last) return 0;
    return r.last === today().key || r.last === yesterdayKey() ? r.streak : 0;
  }

  function bonusFor(days) {
    return DAILY.BONUS_BASE + DAILY.BONUS_PER_DAY * (Math.min(days, DAILY.BONUS_CAP_DAYS) - 1);
  }

  /** Called at the end of a daily round with its score. */
  function record(score) {
    var t = today();
    var out = { number: t.number, first: false, streak: 0, best: 0, improved: false, bonus: 0 };
    Progress.edit('daily', function (r) {
      if (r.last !== t.key) {
        out.first = true;
        r.streak = r.last === yesterdayKey() ? r.streak + 1 : 1;
        r.last = t.key;
        r.best = score;
        r.plays = (r.plays || 0) + 1;
        r.bestStreak = Math.max(r.bestStreak || 0, r.streak);
        out.bonus = bonusFor(r.streak);
        out.improved = true;
      } else if (score > r.best) {
        r.best = score;
        out.improved = true;
      }
      out.streak = r.streak;
      out.best = r.best;
      return r;
    });
    return out;
  }

  return {
    today: today,
    isOpen: function () { return Progress.unlocked() >= 2; },
    playedToday: function () { var r = rec(); return !!r && r.last === today().key; },
    bestToday: function () { var r = rec(); return r && r.last === today().key ? r.best : 0; },
    streak: streak,
    bestStreak: function () { var r = rec(); return (r && r.bestStreak) || 0; },
    nextBonus: function () { var s = streak(); return bonusFor(this.playedToday() ? s : s + 1); },
    record: record,

    /** The note on the home screen's DAILY door, then the PLAY dialog. */
    open: function () {
      if (!this.isOpen()) {
        Sfx.play('nope'); Haptics.bad();
        Panels.toast('Pass Level 1 to open the Daily Challenge.', 'bad');
        return;
      }
      var t = today(), s = streak(), played = this.playedToday();
      Panels.dialog({
        icon: 'cal',
        title: 'Daily #' + t.number,
        lines: [played ? '<b>' + this.bestToday().toLocaleString() + '</b>' : '<b>+' + this.nextBonus() + '</b> coins'],
        okText: played ? 'Play again' : 'Play',
        onOk: function () { Stage.go('round', { daily: true }, 'iris'); }
      });
    }
  };
})();
