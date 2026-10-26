/* ============================================================
   services.js  -  where HUAWEI's game service plugs in
   ------------------------------------------------------------
   HUAWEI Game Service (part of HMS Core) gives a game a shared
   leaderboard and achievements that show up in AppGallery. Using it
   needs things that live outside this code: a HUAWEI developer account,
   an AppGallery Connect project with the game registered, its
   agconnect-services.json, and the app signed with a certificate whose
   fingerprint is on that project. None of that can be in a repository.

   So the game is built to be connected, not connected:
     - every badge in js/missions.js is an achievement, with an id
     - every daily score and level score is a leaderboard entry
     - both are passed through THIS file, and only this file
     - the Android app exposes an object called `HuaweiGames` to the
       page (see GameServices.java). When it is there, this calls it;
       when it is not - in a browser, or before HMS is wired in - every
       call is a quiet no-op and the game plays exactly the same.

   android/README.md says, step by step, what to do on the HUAWEI side
   and which ids to create.
   ============================================================ */

var Services = (function () {

  function bridge() { return window.HuaweiGames || null; }

  function call(fn, a, b) {
    var h = bridge();
    if (!h || typeof h[fn] !== 'function') return false;
    /* Exactly as many arguments as the Java method takes: an Android
       bridge matches methods by count, and an extra `undefined` makes
       it look for a method that does not exist. */
    try { if (b === undefined) h[fn](a); else h[fn](a, b); return true; } catch (e) { return false; }
  }

  return {
    connected: function () { return !!bridge(); },

    /** A badge was earned. */
    achievement: function (id) { return call('unlockAchievement', String(id)); },

    /** A score for a leaderboard: 'daily', or 'level1'...'level4'. */
    score: function (board, value) { return call('submitScore', String(board), Math.max(0, Math.round(value || 0))); },

    /** Called by the game at the end of every round with what happened. */
    roundOver: function (s) {
      if (!s) return;
      if (s.mode === 'daily') this.score('daily', s.score);
      else if (s.mode === 'level' && s.passed) this.score('level' + s.level, s.score);
    }
  };
})();
