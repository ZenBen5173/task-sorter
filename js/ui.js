/* ============================================================
   ui.js  -  the one audio context, and the switch that silences it
   ------------------------------------------------------------
   This file used to run the whole interface: which HTML screen was
   showing, the rolling score, the floating points, the coin bursts.
   All of that is drawn on the stage now (js/stage.js, js/arena.js),
   so what is left is the part that is genuinely shared by everything:
   sound.

   ONE AUDIO CONTEXT for the whole game. The soundtrack (js/music.js)
   and every effect (js/sfx.js) play through it. A browser allows only
   a handful, each one costs a thread, and two would each have to be
   unlocked separately by the first tap.
   ============================================================ */

var UI = (function () {

  var $ = function (id) { return document.getElementById(id); };

  var actx = null;

  /* HAS THE PAGE BEEN TOUCHED YET? The game used to let the browser
     answer that. A browser tab hands back a context that is already
     suspended until somebody has tapped, which is exactly the gate the
     sound code wants: nothing plays while it is suspended, and the
     first tap resumes it.

     An Android WebView does not play along. The context comes back
     already 'running', the opening tune is allowed, and the game starts
     singing on the launcher animation - before a finger has landed on
     it. Measured on a Pixel 7, API 35.

     So the game keeps the answer itself rather than reading it off the
     context, and suspends the context on the way out to match. A flag
     also closes a race the state check could not: suspend() resolves
     asynchronously, so for a moment after asking, state is still
     'running'. */
  var awake = false;

  function audio() {
    if (actx === null) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'running' && actx.suspend) actx.suspend();
      } catch (e) { actx = false; }
    }
    return actx;
  }

  /* Sound can be turned off in Settings, and the choice is saved with
     everything else. Every noise in the game asks isOn() first. */
  var soundOn = true;

  var SOUND = {
    ctx: audio,

    /** True once a real gesture has unlocked the sound. */
    isAwake: function () { return awake; },

    /** The first tap, arriving through Music.wake. Returns the resume
        promise when there is one, so the caller can start the tune only
        once the context is actually running. */
    wake: function () {
      awake = true;
      var a = audio();
      if (a && a.state === 'suspended' && a.resume) {
        try { return a.resume(); } catch (e) {}
      }
      return null;
    },

    /** Called once at boot and whenever the switch is flipped. The
        soundtrack is told as well, because it is the same switch - a
        player turning the sound off means all of it. */
    setOn: function (on) {
      soundOn = !!on;
      if (window.Music) Music.setOn(soundOn);
    },
    isOn: function () { return soundOn; },

    /* The old five beeps, kept as names so anything still calling them
       gets the new sounds instead. */
    good: function (streak) { if (window.Sfx) Sfx.play('right', streak); },
    perfect: function () { if (window.Sfx) Sfx.play('perfect'); },
    bad: function () { if (window.Sfx) Sfx.play('wrong'); },
    over: function () { if (window.Sfx) Sfx.play('lose'); },
    tick: function () { if (window.Sfx) Sfx.play('press'); }
  };

  function still() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  return { $: $, sound: SOUND, still: still };
})();
