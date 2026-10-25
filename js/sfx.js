/* ============================================================
   sfx.js  -  every sound the game makes, and every buzz
   ------------------------------------------------------------
   THERE ARE STILL NO SOUND FILES, for the reasons js/music.js gives:
   no licence to honour, nothing to download, nothing to buffer on a
   stranger's wifi. What changed is how much each sound is made of.
   The game used to have five sounds and every one was a single
   square wave with a fade - which is a beep, and a game made of
   beeps sounds like a microwave.

   Each sound here is built the way a sound designer would build it on
   a synth: two or three layers, each with its own shape - a click on
   the front so it has an edge, a body that carries the pitch, a tail
   of filtered noise so it sits in a room. A card going into the right
   corner is a pluck AND a soft thud of it landing; a mistake is a low
   buzz AND a dull knock.

   THE RIGHT ANSWERS PLAY A TUNE. Each correct sort in a streak is the
   next note up the C major pentatonic - the same five notes the
   soundtrack's melody is built from, so they can never clash with it.
   A long streak climbs a scale you can hear. Break it and the scale
   starts again from the bottom. That one idea does more for "keep the
   streak going" than any number on the screen.

   ONE AUDIO CONTEXT. Everything plays through UI.sound's context,
   which the soundtrack shares too, and nothing is heard until the
   player has touched the screen (see the note on `awake` in ui.js).

   HAPTICS ride along at the bottom: a phone that buzzes in your hand
   when a card lands is a phone that feels like a game console.
   ============================================================ */

var Sfx = (function () {

  var bus = null, comp = null, noiseBuf = null, ctxRef = null;
  var lastAt = {};               // name -> time, so a burst of coins is not a wall of noise

  function ac() {
    if (!window.UI || !UI.sound || !UI.sound.isOn()) return null;
    if (UI.sound.isAwake && !UI.sound.isAwake()) return null;
    var a = UI.sound.ctx();
    if (!a || a.state !== 'running') return null;
    if (ctxRef !== a) {
      ctxRef = a;
      /* A compressor on the whole effects bus. Twenty coins landing at
         once would otherwise clip; this squeezes the peaks and lets the
         quiet sounds come up, which is half of why games sound "full". */
      comp = a.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 12;
      comp.ratio.value = 5;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      bus = a.createGain();
      bus.gain.value = 0.9;
      bus.connect(comp);
      comp.connect(a.destination);
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return a;
  }

  var STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(name) {
    var letter = name.charAt(0), rest = name.slice(1), sharp = 0;
    if (rest.charAt(0) === '#') { sharp = 1; rest = rest.slice(1); }
    var semi = STEPS[letter] + sharp + (parseInt(rest, 10) + 1) * 12;
    return 440 * Math.pow(2, (semi - 69) / 12);
  }

  /** One oscillator voice.
        type  wave        f, f2  start and end pitch (a glide)
        t     length (s)  a, d   attack, and how fast it decays
        vol   peak        at     start offset (s)
        lp/hp/bp          an optional filter cutoff (Hz)
        vib   vibrato depth (Hz) */
  function tone(a, o) {
    var t0 = a.currentTime + (o.at || 0);
    var dur = o.t || 0.12;
    var osc = a.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    var g = a.createGain();
    var vol = (o.vol || 0.1);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var node = osc;
    if (o.lp || o.hp || o.bp) {
      var f = a.createBiquadFilter();
      f.type = o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass';
      f.frequency.value = o.lp || o.hp || o.bp;
      f.Q.value = o.q || 0.8;
      osc.connect(f); node = f;
    }
    if (o.vib) {
      var lfo = a.createOscillator(), lg = a.createGain();
      lfo.frequency.value = o.vibRate || 6;
      lg.gain.value = o.vib;
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    node.connect(g); g.connect(bus);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  /** A burst of filtered noise: whooshes, thuds, paper, breath. */
  function noise(a, o) {
    var t0 = a.currentTime + (o.at || 0);
    var dur = o.t || 0.1;
    var src = a.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    var f = a.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    f.Q.value = o.q || 1;
    var g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  }

  /* The pentatonic ladder a streak climbs. */
  var LADDER = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7'];

  var SOUNDS = {
    press: function (a) { tone(a, { type: 'sine', f: 520, f2: 430, t: 0.05, vol: 0.05 }); },
    release: function (a) {
      tone(a, { type: 'triangle', f: 660, f2: 990, t: 0.07, vol: 0.06 });
      noise(a, { f: 3000, t: 0.03, vol: 0.02 });
    },
    pop: function (a) { tone(a, { type: 'sine', f: 380, f2: 900, t: 0.06, vol: 0.06 }); },
    grab: function (a) { noise(a, { type: 'highpass', f: 900, f2: 2600, t: 0.07, vol: 0.05 }); },
    deal: function (a) {
      noise(a, { f: 2200, f2: 4200, t: 0.06, vol: 0.06, q: 2 });
      tone(a, { type: 'triangle', f: 1400, t: 0.025, vol: 0.025 });
    },
    whoosh: function (a, power) {
      var p = power === undefined ? 0.6 : power;
      noise(a, { f: 500, f2: 2600, t: 0.12 + p * 0.08, vol: 0.05 + p * 0.07, q: 1.4 });
    },
    right: function (a, streak) {
      var n = LADDER[Math.min(LADDER.length - 1, Math.max(0, (streak || 1) - 1))];
      var f = hz(n);
      tone(a, { type: 'triangle', f: f, t: 0.22, vol: 0.14, a: 0.002 });
      tone(a, { type: 'square', f: f * 2, t: 0.06, vol: 0.03, lp: 3500 });
      /* and it landing in the tray */
      tone(a, { type: 'sine', f: 180, f2: 70, t: 0.09, vol: 0.12 });
      noise(a, { type: 'lowpass', f: 900, t: 0.05, vol: 0.05 });
    },
    perfect: function (a) {
      ['C6', 'E6', 'G6', 'C7'].forEach(function (n, i) {
        tone(a, { type: 'triangle', f: hz(n), t: 0.18, vol: 0.09, at: i * 0.045 });
        tone(a, { type: 'sine', f: hz(n) * 2, t: 0.12, vol: 0.03, at: i * 0.045 });
      });
      noise(a, { type: 'highpass', f: 6000, t: 0.35, vol: 0.04, at: 0.05 });
    },
    wrong: function (a) {
      tone(a, { type: 'square', f: 150, f2: 88, t: 0.26, vol: 0.09, lp: 900 });
      tone(a, { type: 'sawtooth', f: 156, f2: 92, t: 0.26, vol: 0.05, lp: 700 });
      noise(a, { type: 'lowpass', f: 400, t: 0.12, vol: 0.12 });
    },
    block: function (a) {
      tone(a, { type: 'square', f: 880, t: 0.3, vol: 0.05, bp: 1800, q: 6 });
      tone(a, { type: 'square', f: 1243, t: 0.28, vol: 0.04, bp: 2400, q: 6 });
      tone(a, { type: 'triangle', f: 2210, t: 0.4, vol: 0.03 });
      noise(a, { type: 'highpass', f: 3000, t: 0.08, vol: 0.06 });
    },
    comboBreak: function (a) {
      noise(a, { type: 'highpass', f: 4000, t: 0.18, vol: 0.06 });
      tone(a, { type: 'triangle', f: hz('E6'), f2: hz('C5'), t: 0.3, vol: 0.05 });
    },
    coin: function (a) {
      tone(a, { type: 'square', f: hz('B5'), t: 0.06, vol: 0.04, lp: 5000 });
      tone(a, { type: 'square', f: hz('E6'), t: 0.16, vol: 0.04, lp: 5000, at: 0.055 });
    },
    star: function (a, i) {
      var base = hz(['G5', 'C6', 'E6'][Math.min(2, i || 0)]);
      tone(a, { type: 'triangle', f: base, t: 0.6, vol: 0.11 });
      tone(a, { type: 'sine', f: base * 1.5, t: 0.5, vol: 0.05 });
      tone(a, { type: 'sine', f: base * 2.01, t: 0.4, vol: 0.03 });
      noise(a, { type: 'highpass', f: 7000, t: 0.25, vol: 0.03 });
    },
    stamp: function (a) {
      tone(a, { type: 'sine', f: 110, f2: 38, t: 0.38, vol: 0.28 });
      noise(a, { type: 'lowpass', f: 700, f2: 120, t: 0.3, vol: 0.18 });
      noise(a, { f: 2500, t: 0.04, vol: 0.06 });
    },
    tick: function (a) {
      tone(a, { type: 'square', f: 1250, t: 0.025, vol: 0.04, bp: 1300, q: 4 });
      noise(a, { f: 3000, t: 0.02, vol: 0.03 });
    },
    tickHot: function (a) {
      tone(a, { type: 'square', f: 1650, t: 0.04, vol: 0.06, bp: 1700, q: 4 });
      tone(a, { type: 'sine', f: 820, t: 0.06, vol: 0.04 });
    },
    timeUp: function (a) {
      tone(a, { type: 'sawtooth', f: hz('A3'), t: 0.55, vol: 0.06, lp: 1400 });
      tone(a, { type: 'sawtooth', f: hz('C#4'), t: 0.55, vol: 0.05, lp: 1400 });
      tone(a, { type: 'sawtooth', f: hz('E4'), t: 0.55, vol: 0.05, lp: 1400 });
      noise(a, { type: 'lowpass', f: 500, t: 0.2, vol: 0.1 });
    },
    rush: function (a) {
      noise(a, { type: 'highpass', f: 400, f2: 7000, t: 0.75, vol: 0.06, a: 0.3 });
      tone(a, { type: 'sawtooth', f: 180, f2: 760, t: 0.75, vol: 0.04, lp: 2400, a: 0.2 });
      tone(a, { type: 'square', f: hz('C5'), t: 0.15, vol: 0.05, at: 0.75 });
      tone(a, { type: 'square', f: hz('G5'), t: 0.3, vol: 0.05, at: 0.85 });
    },
    win: function (a) {
      var seq = [['C5', 0], ['E5', 0.1], ['G5', 0.2], ['C6', 0.32], ['G5', 0.46], ['C6', 0.56]];
      seq.forEach(function (s, i) {
        var long = i === seq.length - 1;
        tone(a, { type: 'square', f: hz(s[0]), t: long ? 0.6 : 0.12, vol: 0.05, lp: 4200, at: s[1] });
        tone(a, { type: 'triangle', f: hz(s[0]) / 2, t: long ? 0.6 : 0.12, vol: 0.06, at: s[1] });
      });
      noise(a, { type: 'highpass', f: 6000, t: 0.5, vol: 0.03, at: 0.56 });
    },
    lose: function (a) {
      ['G4', 'F#4', 'F4', 'E4'].forEach(function (n, i) {
        tone(a, { type: 'sawtooth', f: hz(n), t: i === 3 ? 0.7 : 0.24, vol: 0.06, lp: 1100,
                  at: i * 0.26, vib: i === 3 ? 6 : 0 });
      });
    },
    hit: function (a, power) {
      var p = power || 0.5;
      tone(a, { type: 'sine', f: 140, f2: 50, t: 0.16, vol: 0.2 + p * 0.1 });
      noise(a, { type: 'lowpass', f: 1800, f2: 300, t: 0.12, vol: 0.16 });
      noise(a, { f: 3500, t: 0.03, vol: 0.05 });
    },
    hurt: function (a) {
      tone(a, { type: 'square', f: 240, f2: 90, t: 0.2, vol: 0.08, lp: 1400 });
      noise(a, { f: 900, t: 0.16, vol: 0.14, q: 0.8 });
    },
    windup: function (a) { tone(a, { type: 'sine', f: 300, f2: 700, t: 0.28, vol: 0.035, a: 0.15 }); },
    fumble: function (a) {
      tone(a, { type: 'triangle', f: 520, f2: 260, t: 0.22, vol: 0.05 });
      tone(a, { type: 'triangle', f: 440, f2: 220, t: 0.22, vol: 0.04, at: 0.12 });
    },
    ko: function (a) {
      tone(a, { type: 'sine', f: 90, f2: 30, t: 0.7, vol: 0.32 });
      noise(a, { type: 'lowpass', f: 900, f2: 80, t: 0.6, vol: 0.2 });
      tone(a, { type: 'sine', f: 1400, f2: 300, t: 0.8, vol: 0.04, at: 0.15 });
    },
    vs: function (a) {
      tone(a, { type: 'sine', f: 70, f2: 40, t: 0.5, vol: 0.3 });
      noise(a, { type: 'lowpass', f: 1200, f2: 100, t: 0.5, vol: 0.2 });
      tone(a, { type: 'sawtooth', f: hz('E3'), t: 0.5, vol: 0.05, lp: 900 });
      tone(a, { type: 'sawtooth', f: hz('B3'), t: 0.5, vol: 0.04, lp: 900 });
    },
    irisOut: function (a) { tone(a, { type: 'sine', f: 900, f2: 220, t: 0.32, vol: 0.05 }); },
    swoosh: function (a) { noise(a, { f: 700, f2: 3200, t: 0.3, vol: 0.05, q: 1.2, a: 0.08 }); },
    unlock: function (a) {
      ['C6', 'E6', 'G6', 'B6', 'D7'].forEach(function (n, i) {
        tone(a, { type: 'sine', f: hz(n), t: 0.4, vol: 0.06, at: i * 0.06 });
      });
      noise(a, { type: 'highpass', f: 7000, t: 0.6, vol: 0.04 });
    },
    buy: function (a) {
      SOUNDS.coin(a);
      tone(a, { type: 'triangle', f: hz('G6'), t: 0.45, vol: 0.06, at: 0.12 });
      tone(a, { type: 'triangle', f: hz('C7'), t: 0.5, vol: 0.05, at: 0.18 });
    },
    equip: function (a) {
      noise(a, { type: 'lowpass', f: 1600, f2: 400, t: 0.16, vol: 0.12 });
      tone(a, { type: 'sine', f: 300, f2: 700, t: 0.12, vol: 0.08 });
      tone(a, { type: 'triangle', f: hz('E6'), t: 0.2, vol: 0.04, at: 0.06 });
    },
    nope: function (a) {
      tone(a, { type: 'square', f: 200, t: 0.08, vol: 0.05, lp: 1200 });
      tone(a, { type: 'square', f: 160, t: 0.12, vol: 0.05, lp: 1200, at: 0.09 });
    },
    page: function (a) {
      noise(a, { f: 2600, f2: 1400, t: 0.12, vol: 0.06, q: 0.7 });
      noise(a, { f: 3400, t: 0.05, vol: 0.03, at: 0.07 });
    },
    step: function (a) { noise(a, { type: 'lowpass', f: 500, t: 0.04, vol: 0.05 }); },
    open: function (a) {
      tone(a, { type: 'sine', f: 440, f2: 660, t: 0.1, vol: 0.05 });
      noise(a, { f: 1800, f2: 3000, t: 0.1, vol: 0.03 });
    },
    close: function (a) {
      tone(a, { type: 'sine', f: 600, f2: 400, t: 0.1, vol: 0.05 });
      noise(a, { f: 2400, f2: 1200, t: 0.08, vol: 0.03 });
    },

    /* ---- special cards and twists ---- */
    /* a golden card arriving: a bright little sparkle */
    shine: function (a) {
      ['E7', 'B6', 'G#7'].forEach(function (n, i) {
        tone(a, { type: 'sine', f: hz(n), t: 0.22, vol: 0.035, at: i * 0.05 });
      });
    },
    /* ice forming over a card */
    freeze: function (a) {
      noise(a, { type: 'highpass', f: 5000, f2: 9000, t: 0.25, vol: 0.05 });
      tone(a, { type: 'sine', f: hz('B6'), f2: hz('E7'), t: 0.3, vol: 0.03 });
    },
    crack: function (a) {
      noise(a, { type: 'highpass', f: 2500, t: 0.05, vol: 0.12 });
      tone(a, { type: 'square', f: 1900, f2: 900, t: 0.05, vol: 0.03, bp: 2200, q: 3 });
    },
    shatter: function (a) {
      noise(a, { type: 'highpass', f: 3000, f2: 7000, t: 0.3, vol: 0.12 });
      ['E7', 'C7', 'G6', 'D7'].forEach(function (n, i) {
        tone(a, { type: 'triangle', f: hz(n), t: 0.12, vol: 0.03, at: i * 0.03 });
      });
    },
    /* a fuse catching */
    fuse: function (a) {
      noise(a, { type: 'bandpass', f: 3500, f2: 6000, t: 0.4, vol: 0.05, q: 0.6 });
      noise(a, { type: 'lowpass', f: 300, t: 0.08, vol: 0.06 });
    },
    burn: function (a) {
      noise(a, { type: 'lowpass', f: 1400, f2: 200, t: 0.45, vol: 0.14 });
      tone(a, { type: 'sawtooth', f: 220, f2: 60, t: 0.4, vol: 0.05, lp: 700 });
    },
    /* two trays sliding past each other */
    swap: function (a) {
      noise(a, { f: 900, f2: 2600, t: 0.22, vol: 0.06, q: 1.4 });
      noise(a, { f: 2600, f2: 900, t: 0.22, vol: 0.05, q: 1.4, at: 0.12 });
      tone(a, { type: 'triangle', f: hz('A5'), t: 0.08, vol: 0.04, at: 0.3 });
    },
    /* a boss talking: a quick nasal mumble */
    blip: function (a) {
      for (var i = 0; i < 4; i++) {
        tone(a, { type: 'square', f: 300 + Math.random() * 260, t: 0.045, vol: 0.025, lp: 1800, at: i * 0.055 });
      }
    },
    /* a boss winding up their trick */
    power: function (a) {
      tone(a, { type: 'sawtooth', f: 120, f2: 520, t: 0.42, vol: 0.06, lp: 1600, a: 0.2 });
      noise(a, { type: 'highpass', f: 800, f2: 5000, t: 0.42, vol: 0.05, a: 0.25 });
      tone(a, { type: 'square', f: hz('E5'), t: 0.12, vol: 0.05, lp: 3000, at: 0.42 });
    },
    /* Ivan's blackout: static */
    glitch: function (a) {
      for (var i = 0; i < 5; i++) noise(a, { type: 'bandpass', f: 600 + Math.random() * 4000, t: 0.05, vol: 0.06, q: 4, at: i * 0.06 });
    },
    /* a mission or a badge finished */
    mission: function (a) {
      ['G5', 'C6', 'E6', 'G6'].forEach(function (n, i) {
        tone(a, { type: 'square', f: hz(n), t: i === 3 ? 0.4 : 0.1, vol: 0.04, lp: 4000, at: i * 0.08 });
      });
      noise(a, { type: 'highpass', f: 7000, t: 0.4, vol: 0.03, at: 0.24 });
    }
  };

  /* Minimum gap between two of the same sound, in seconds. A row of
     fifteen coins arriving in the same frame is one clink, not fifteen
     stacked into a roar. */
  var GAP = { coin: 0.045, tick: 0.05, step: 0.12, star: 0.06, press: 0.03, blip: 0.3, crack: 0.04 };

  function play(name, arg) {
    var a = ac();
    if (!a || !SOUNDS[name]) return;
    var gap = GAP[name] || 0.012;
    if (lastAt[name] && a.currentTime - lastAt[name] < gap) return;
    lastAt[name] = a.currentTime;
    try { SOUNDS[name](a, arg); } catch (e) { /* a sound is never worth a crash */ }
  }

  return { play: play, hz: hz };
})();

/* ---------------- haptics ----------------
   navigator.vibrate, which an Android WebView supports and a desktop
   browser quietly ignores. Patterns are milliseconds of buzz, gap,
   buzz. Kept very short: a phone buzzing for a quarter of a second on
   every card is a phone being annoying. */
var Haptics = (function () {
  var ok = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  function on() { return ok && (!window.Progress || !Progress.hapticsOn || Progress.hapticsOn()); }
  function buzz(p) { if (on()) { try { navigator.vibrate(p); } catch (e) {} } }
  return {
    supported: function () { return ok; },
    tap: function () { buzz(6); },
    good: function () { buzz(10); },
    perfect: function () { buzz([12, 40, 18]); },
    bad: function () { buzz([30, 30, 40]); },
    block: function () { buzz([14, 20, 14]); },
    heavy: function () { buzz([40, 50, 80]); },
    win: function () { buzz([20, 60, 20, 60, 50]); }
  };
})();
