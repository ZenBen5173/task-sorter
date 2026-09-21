/* ============================================================
   music.js  -  the soundtrack, written in code
   ------------------------------------------------------------
   The game had five beeps and silence in between, and silence is
   what a judge remembers about a game they played for three minutes.

   THERE IS NO MUSIC FILE. Every note here is an oscillator, the same
   bargain the rest of the game makes: the sprites are colour grids,
   the forest is drawn maths, the weather is CSS, and the soundtrack
   is a few hundred bytes of scheduling. Three reasons that is the
   right call here and not just a clever one.

     It is free of a licence. This repository is public and it is a
     competition entry. A borrowed loop means a borrowed loop's terms
     to honour, and the one thing worse than no music is music
     somebody else owns.

     It costs nothing to ship. A minute of even middling MP3 is a
     megabyte; this is smaller than one of the pet sheets.

     It never has to arrive. The fonts were moved off the network for
     the same reason - a mobile game is demonstrated on a stranger's
     wifi, and a soundtrack that buffers is a soundtrack that is not
     there for the first round.

   HOW IT KEEPS TIME. Not with setTimeout per note, which drifts
   audibly within a couple of bars because the browser is free to run
   a timer late. The standard trick instead: a coarse timer wakes up
   every 25ms and books every note that falls inside the next 120ms
   directly with the audio clock, which is a hardware clock and does
   not drift. The timer being late by a frame changes nothing,
   because the notes were booked ahead of it.

   WHAT IT PLAYS. Four chords - C, G, Am, F - which is the most
   agreeable progression in Western music and is chosen precisely
   because this loops for as long as somebody is on the screen. Over
   it, a melody built only from the C major pentatonic: five notes
   that cannot land wrong on any of the four chords. Music that has
   to repeat for ten minutes must have nothing in it that grates on
   the ninth.

   TWO TUNES. `menu` is slow and thin, for screens you read. `play`
   is faster, with a hat and a busier arpeggio, for a round on a
   clock. Same chords and same melody, so moving between them sounds
   like the same game rather than two.
   ============================================================ */

var Music = (function () {

  /* ---------------- notes ----------------
     Worked out rather than tabulated. Twelve semitones to an octave,
     each one the twelfth root of two above the last, counted from
     A4 = 440Hz. A written-out table of frequencies is a table of
     numbers nobody can check. */
  var STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function freq(name) {
    if (!name) return 0;
    var letter = name.charAt(0);
    var rest = name.slice(1);
    var sharp = 0;
    if (rest.charAt(0) === '#') { sharp = 1; rest = rest.slice(1); }
    var semitone = STEPS[letter] + sharp + (parseInt(rest, 10) + 1) * 12;
    return 440 * Math.pow(2, (semitone - 69) / 12);
  }

  /* ---------------- the song ----------------
     One bar per chord, eight eighth-notes to a bar. A dot is a rest.

     The bass and the arpeggio are built from the chord, so they can
     never disagree with it. Only the melody is written out, and it
     only ever uses C D E G A - the C major pentatonic - which is why
     it sits on all four chords without a single accidental. */
  var CHORDS = [
    { root: 'C2', notes: ['C4', 'E4', 'G4'] },
    { root: 'G2', notes: ['G3', 'B3', 'D4'] },
    { root: 'A2', notes: ['A3', 'C4', 'E4'] },
    { root: 'F2', notes: ['F3', 'A3', 'C4'] }
  ];

  /* Thirty-two eighths: four bars, one phrase, then round again. */
  var MELODY = [
    'G4', 'A4', 'G4', 'E4', '.',   'C4', '.',   '.',
    'D4', '.',   'E4', 'G4', '.',  '.',   'D4', '.',
    'E4', '.',   'G4', 'A4', '.',  'G4', 'E4', '.',
    'C4', 'D4', 'E4', '.',   'D4', '.',   '.',   '.'
  ];

  var TUNES = {
    /* Slow, and the melody only every other phrase, so a screen you
       are reading on does not get sung at. */
    menu: { bpm: 92,  arp: false, hat: false, melodyEvery: 2, gain: 0.30 },
    /* A round has a clock on it. Busier, and it can be heard under
       the card sounds without covering them. */
    play: { bpm: 126, arp: true,  hat: true,  melodyEvery: 1, gain: 0.34 }
  };

  /* ---------------- the machine ---------------- */

  var actx = null;        // shared with UI.sound so both use one clock
  var master = null;      // everything goes through here, so one knob mutes all
  var timer = null;       // the coarse wake-up
  var step = 0;           // which eighth-note we are on, forever upwards
  var nextAt = 0;         // when that eighth-note is due, on the audio clock
  var tune = null;        // which of TUNES is playing, or null for silence
  var wanted = null;      // what SHOULD be playing once sound is allowed

  var LOOKAHEAD = 0.12;   // seconds of music booked in advance
  var TICK = 25;          // how often, in ms, we check whether to book more

  function ready() {
    if (!actx) {
      actx = (window.UI && UI.sound && UI.sound.ctx) ? UI.sound.ctx() : null;
      if (!actx) return false;
      master = actx.createGain();
      master.gain.value = 0;
      master.connect(actx.destination);
    }
    return true;
  }

  /** One note. `type` picks the waveform, and the short attack and
      long-ish release are what stop a square wave sounding like a
      fire alarm: a note that begins instantly at full volume clicks,
      and every click adds up over a loop this length. */
  function note(hz, at, len, type, vol) {
    if (!hz) return;
    var osc = actx.createOscillator();
    var g = actx.createGain();
    osc.type = type;
    osc.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(g); g.connect(master);
    osc.start(at);
    osc.stop(at + len + 0.02);
  }

  /** The hat. Filtered noise rather than a tone, because a drum has
      no pitch - a short high tone in its place reads as another note
      in the melody and fights it. */
  function hat(at) {
    var n = 0.03;
    var buf = actx.createBuffer(1, Math.ceil(actx.sampleRate * n), actx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var src = actx.createBufferSource();
    src.buffer = buf;
    var hp = actx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    var g = actx.createGain();
    g.gain.value = 0.10;
    src.connect(hp); hp.connect(g); g.connect(master);
    src.start(at);
  }

  /** Books everything that happens on one eighth-note. */
  function play(i, at) {
    var beat = i % 8;                       // where we are in the bar
    var bar = Math.floor(i / 8) % 4;        // which chord
    var phrase = Math.floor(i / 32);        // which time round the whole thing
    var chord = CHORDS[bar];
    var eighth = 30 / tune.bpm;             // seconds per eighth note

    /* Bass on the first and middle beat. A triangle rather than a
       square: it has far less in it up high, so it holds the bottom
       without muddying the melody. */
    if (beat === 0 || beat === 4) {
      note(freq(chord.root), at, eighth * 3.2, 'triangle', 0.22);
    }

    /* The arpeggio walks up and back down the chord, which is what
       fills a bar without adding anything new to listen to. */
    if (tune.arp && beat % 2 === 0) {
      var order = [0, 1, 2, 1];
      note(freq(chord.notes[order[(beat / 2) % 4]]), at, eighth * 0.9, 'square', 0.055);
    }

    if (tune.hat && beat % 2 === 1) hat(at);

    if (phrase % tune.melodyEvery === 0) {
      var m = MELODY[i % 32];
      if (m !== '.') note(freq(m), at, eighth * 1.7, 'square', 0.075);
    }
  }

  /** The coarse wake-up. Books every note due inside the lookahead and
      goes back to sleep; the audio clock does the actual timing. */
  function tick() {
    if (!tune) return;
    var eighth = 30 / tune.bpm;
    while (nextAt < actx.currentTime + LOOKAHEAD) {
      play(step, nextAt);
      step++;
      nextAt += eighth;
    }
  }

  /** Fades the master gain rather than cutting it. A loop that stops
      dead sounds like a fault; half a second of fade sounds like
      leaving the room. */
  function fade(to, secs) {
    if (!master) return;
    var now = actx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.linearRampToValueAtTime(to, now + secs);
  }

  function start(name) {
    if (!ready()) return;
    if (!window.UI || !UI.sound.isOn()) return;
    if (actx.state === 'suspended') return;     // no gesture yet; wake() retries

    var next = TUNES[name];
    if (!next) return;

    era++;                                 // cancels any fade-out in flight
    if (tune === next) { fade(next.gain, 0.4); return; }

    /* Changing tune keeps the step count, so the melody carries on
       from where it was rather than restarting every time somebody
       opens the shop. */
    tune = next;
    if (!timer) {
      nextAt = actx.currentTime + 0.06;
      timer = setInterval(tick, TICK);
    }
    fade(next.gain, 0.5);
  }

  /* Bumped every time the tune changes. A fade-out that is still in
     flight when something starts the music again must not then stop
     it: the timeout below checks that nothing has happened since it
     was booked, rather than checking the gain.

     It used to read master.gain.value and only clear the scheduler if
     that had reached zero. Reading a value that is part-way through an
     automation ramp is not something to lean on - if it came back a
     hair above the threshold, the scheduler was left running forever,
     booking silent notes for as long as the page was open. */
  var era = 0;

  function stop() {
    if (!master) return;
    var mine = ++era;
    fade(0, 0.35);
    /* The scheduler runs on through the fade-out, or the last third of
       a second would be silence with a tail of cut-off notes in it. */
    setTimeout(function () {
      if (era !== mine) return;            // something started again: leave it
      clearInterval(timer); timer = null; tune = null;
    }, 450);
  }

  /* Which screen gets which tune. Everything that is not a round is
     a screen you read, and the title and the end of a round are left
     alone entirely - one has nothing on it yet and the other is
     already playing its own fanfare. */
  var FOR_SCREEN = {
    play: 'play',
    home: 'menu', levels: 'menu', gear: 'menu',
    battle: 'menu', me: 'menu', guide: 'menu'
  };

  /** Which tune the screen that is showing right now wants.

      THE FIRST SCREEN NEVER GOES THROUGH showScreen. The home screen
      is marked `is-on` in index.html and is simply already there when
      the page loads, so nothing ever told the soundtrack about it and
      the game opened in silence - the music only started once you had
      navigated somewhere. Reading it off the page covers however the
      player arrived, including that first one. */
  function onScreenNow() {
    var el = document.querySelector('.screen.is-on');
    if (!el || !el.id) return null;
    return FOR_SCREEN[el.id.replace(/^screen-/, '')] || null;
  }

  return {

    /** Called by UI.showScreen, so nothing else has to remember. */
    forScreen: function (name) {
      wanted = FOR_SCREEN[name] || null;
      if (wanted) start(wanted); else stop();
    },

    /** Called on the first tap anywhere. A browser will not make a
        sound until the person has touched the page - quite rightly -
        so the context starts suspended and the first tune start is
        refused. This is what comes back for it. */
    wake: function () {
      if (!ready()) return;
      if (!wanted) wanted = onScreenNow();
      if (actx.state === 'suspended' && actx.resume) {
        actx.resume().then(function () { if (wanted) start(wanted); });
      } else if (wanted && !tune) {
        start(wanted);
      }
    },

    /** The switch on the Me screen. */
    setOn: function (on) {
      if (!on) { stop(); return; }
      if (!wanted) wanted = onScreenNow();
      if (wanted) start(wanted);
    },

    /** Nobody wants a game singing to them from a backgrounded tab,
        and on a phone it is battery spent on a screen that is off. */
    pause: function () { if (tune) fade(0, 0.2); },
    resume: function () { if (tune && window.UI && UI.sound.isOn()) fade(tune.gain, 0.3); }
  };
})();
