/* ============================================================
   game.js  -  the RULES of a round: scoring, the clock, grading
   ------------------------------------------------------------
   TEAM: every number worth tuning is in TUNING at the top.

   THIS FILE NO LONGER DRAWS ANYTHING. It used to reach into the page
   for every card, corner and number. The round is drawn on the stage
   now (js/arena.js), so this file was split down the middle: what is
   TRUE stays here - what a card is worth, when the round ends, what a
   shield forgives, whether you passed - and what you SEE moved into
   the arena. The two talk through a handful of calls:

     the arena tells the game   Game.sort(box)    a card was swiped
                                Game.crack()      a frozen card was tapped
     the game tells the arena   Arena.deal(card)  here is the next one
                                Arena.sorted(r)   here is what that was worth
                                Arena.shuffle(m)  two trays swapped places
                                Arena.foePower(p) the boss used their trick
                                Arena.end(...)    the round is over

   FIVE KINDS OF ROUND share this one set of rules:
     level    a stop on the map, passed on accuracy
     battle   a boss, fought on two health bars
     daily    one round a day, the same deck for everybody
     mine     your OWN to-do list, sorted with nobody marking it

   THE CLOCK IS STILL A WALL CLOCK. Everything reads Date.now(), on a
   setInterval rather than the stage's animation loop: an animation
   frame stops dead when the screen locks, which would freeze a round
   instead of ending it - and the stage clock pauses for hit-stops and
   slows for a slow-motion finish, which must never steal a second off
   the time you are racing.
   ============================================================ */

var TUNING = {
  ROUND_SECONDS: 90,

  BASE_POINTS: 100,
  SPEED_WINDOW_MS: 3000,   // sort faster than this for a speed bonus
  SPEED_BONUS_MAX: 100,
  PERFECT_MS: 1200,        // correct AND under this = Perfect
  PERFECT_BONUS: 150,

  MAX_MULTIPLIER: 8,

  /* The pause after a wrong sort. Just long enough for the card to bounce
     off the wrong tray - it is animation time, not reading time. The
     reason shows on screen while the next card is already in play. */
  WRONG_STUN_MS: 350,

  SWIPE_MIN_PX: 45,        // shorter than this counts as a tap, not a swipe

  /* The final rush is capped to a quarter of the level, so a short
     tutorial level does not spend half its life in rush mode. */
  RUSH_SECONDS: 20,
  RUSH_SHARE: 0.25,
  RUSH_MULTIPLIER: 2,

  /* ---- special cards ----
     GOLD   worth three times the points, and a few coins on top
     ICE    frozen: tap it to crack it before it can be sorted
     FUSE   burning: sort it before the fuse runs out, or it counts as a miss
     Each level says how often each one turns up (see `specials` in
     levels.js). These are the numbers that do not change by level. */
  GOLD_MULT: 3,
  GOLD_COINS: 5,
  ICE_HITS: 2,             // taps to break the ice; a strong weapon does it in one
  ICE_ONE_HIT_MULT: 1.25,  // ...a weapon at least this strong
  FUSE_MS: 3400,
  /* Every pet makes golden cards a little more likely: its coin bonus,
     scaled by this. The Phoenixling (+60% coins) adds about 9%. */
  PET_GOLD_SHARE: 0.15
};

var Game = (function () {

  /* ---------------- round state ---------------- */

  var level = null;        // the level being played (a stand-in one for daily and mine)
  var deck = [];           // shuffled, prepared before the round starts
  var deckAt = 0;
  var pool = [];           // the cards this level is allowed to use
  var calm = false;        // true on a no-clock level (Level 1, and your own list)
  var goal = 0;            // on a calm level, how many cards ends the round
  var card = null;         // the card currently in play
  var cardShownAt = 0;
  var dealt = 0;           // cards dealt this round

  var score = 0;
  var streak = 0;
  var bestStreak = 0;
  var correct = 0;
  var wrong = 0;
  var misses = [];         // every card you got wrong, for the end screen
  var forgiven = 0;        // mistakes your shield wiped off your accuracy

  /* What happened this round, beyond the score - for missions and badges. */
  var tally = null;

  var running = false;
  var locked = false;      // true during the stun after a wrong answer
  var paused = false;
  var pausedAt = 0;
  var pausedMsLeft = 0;    // clock frozen at this many ms remaining
  var pausedFoeGap = 0;    // how long the rival had been winding up
  var endsAt = 0;
  var totalMs = 0;
  var timer = null;
  var lastSecs = -1;

  var gear = { fast: 1, block: 0, mult: 1 };   // whatever the shop gear does
  var blocksLeft = 0;      // mistakes your shield can still soak up this round

  /* A battle reuses the same cards, corners and swipe as a level; only
     the scoring and the way it ends are different. */
  var mode = 'level';      // 'level', 'battle', 'daily' or 'mine'
  var foe = null;
  var hpYou = 0, hpFoe = 0, hpFoeMax = 0;
  var lastFoeMove = 0;
  var nextPower = 0;

  /* ---- special cards and twists ---- */
  var spec = { gold: 0, ice: 0, fuse: 0 };
  var iceHits = TUNING.ICE_HITS;
  var pendingIce = 0, pendingFuse = 0;
  var lastSpecial = false;
  var fuseMs = TUNING.FUSE_MS;

  /* WHICH TRAY SITS IN WHICH CORNER. Fixed on most levels; on a level
     with the shuffle twist, and against Clip Carla, two of them swap
     places mid-round. Every swipe goes through this map, so a flick
     into the top-left lands on whatever is in the top-left NOW. */
  var STANDARD = { tl: 'now', tr: 'later', bl: 'give', br: 'drop' };
  var corners = copy(STANDARD);
  var shuffleEvery = 0, nextShuffle = 0;

  /* The same "random" every phone gets for the daily challenge. Every
     other round uses the real thing. Three separate streams - the deck,
     which card is special, which trays swap - so the Nth card of the
     day is the same card with the same special for everybody, however
     fast or slow they got there. One shared stream would drift apart at
     the first tray swap. */
  var rng = Math.random, specRng = Math.random, swapRng = Math.random;

  /* THE FIRST ROUND TEACHES. The very first time anyone plays Level 1,
     the first four cards are one for each corner, and the arena shows
     where each one goes and why. Level 1 was already "a lesson, not a
     test" (see levels.js) - this makes it one you are walked through
     rather than told about on a page you scroll past. */
  var tutorial = false;
  var TUTORIAL_CARDS = 4;

  /* ---------------- setup ---------------- */

  function init() {
    // keyboard, for testing on a laptop
    window.addEventListener('keydown', function (e) {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (!running || locked || paused) return;
      /* Q W A S sit in the same square as the four corners on screen, so
         they go through the same redirect a swipe does. */
      var map = { q: [-1, -1], w: [1, -1], a: [-1, 1], s: [1, 1] };
      var dir = map[(e.key || '').toLowerCase()];
      if (!dir) return;
      /* A frozen card has to be cracked first, from the keyboard too. */
      if (card && card.ice > 0) { crack(); return; }
      resolve(boxFor(dir[0], dir[1]));
    });
  }

  function copy(o) { var out = {}; for (var k in o) out[k] = o[k]; return out; }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /** A small, fast, seeded random number maker (mulberry32). Same seed,
      same numbers, on every phone. */
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function resetCounters() {
    score = 0; streak = 0; bestStreak = 0;
    correct = 0; wrong = 0; forgiven = 0; misses = [];
    running = true; locked = false; paused = false;
    lastSecs = -1; dealt = 0;
    pendingIce = 0; pendingFuse = 0; lastSpecial = false;
    tally = { perfects: 0, golds: 0, ices: 0, burns: 0, laterRight: 0, goldCoins: 0, shuffles: 0 };
  }

  /** Gear and twists that apply whatever kind of round this is. */
  function setupGear() {
    gear = Shop.effects();
    blocksLeft = gear.block;
    iceHits = gear.mult >= TUNING.ICE_ONE_HIT_MULT ? 1 : TUNING.ICE_HITS;
    corners = copy(STANDARD);
    shuffleEvery = 0;
    fuseMs = TUNING.FUSE_MS;
    rng = specRng = swapRng = Math.random;
  }

  function petGold() { return (Shop.equippedItem('pet').coin || 0) * TUNING.PET_GOLD_SHARE; }

  /* ---------------- starting a battle ---------------- */

  function startBattle(foeNumber) {
    mode = 'battle';
    tutorial = false;
    foe = OPPONENTS[(foeNumber || 1) - 1] || OPPONENTS[0];
    level = null;

    setupGear();
    /* A boss fight deals the odd golden card, so a good hit can be a big
       one - every other trick in it is the boss's own. */
    spec = { gold: 0.06 + petGold(), ice: 0, fuse: 0 };

    // every kind of card shows up in a duel, at every difficulty
    pool = CARDS;
    calm = false;
    deck = shuffle(CARDS).concat(shuffle(CARDS)).concat(shuffle(CARDS));
    deckAt = 0;

    resetCounters();
    hpYou = BATTLE.HP;
    hpFoeMax = foe.hp || BATTLE.HP;
    hpFoe = hpFoeMax;

    totalMs = BATTLE.SECONDS * 1000;
    endsAt = Date.now() + totalMs;
    lastFoeMove = Date.now();
    /* The first trick comes early, so you meet it in every fight - a
       quick player can take a boss apart before a trick on the usual
       timer would ever have come round. */
    nextPower = Date.now() + BATTLE.FIRST_POWER_MS;

    Arena.beginBattle({
      foe: foe, you: Hero.name(), hp: BATTLE.HP, foeHp: hpFoeMax,
      shields: gear.block, seconds: BATTLE.SECONDS, corners: copy(corners)
    });
    nextCard();

    if (timer) clearInterval(timer);
    timer = setInterval(tick, 100);
    tick();
  }

  /* ---------------- starting a level ---------------- */

  function start(levelNumber) {
    mode = 'level';
    level = LEVELS[(levelNumber || 1) - 1] || LEVELS[0];

    // whatever you bought in the shop applies for this whole round
    setupGear();

    /* A level only draws from the cards it is allowed:
         theme  - which place you are in (house, school, phone, out)
         boxes  - which corners exist
         tiers  - how hard the cards are allowed to be
       Those three lists are the whole difficulty ramp. */
    var tiers = level.tiers || [1, 2, 3];
    pool = CARDS.filter(function (c) {
      return (!level.theme || c.theme === level.theme)
        && level.boxes.indexOf(c.box) !== -1
        && tiers.indexOf(c.tier || 1) !== -1;
    });

    // Everything is prepared up front so nothing loads mid-round.
    deck = shuffle(pool).concat(shuffle(pool)).concat(shuffle(pool));
    deckAt = 0;

    tutorial = level.n === 1 && !Progress.hasSeenTip('tutorial');
    if (tutorial) {
      /* One card for each corner, in corner order, at the front of the
         deck. Picked from the easiest tier this level deals. */
      var lesson = [];
      level.boxes.forEach(function (box) {
        for (var i = 0; i < deck.length; i++) {
          if (deck[i].box === box && lesson.indexOf(deck[i]) === -1) { lesson.push(deck[i]); break; }
        }
      });
      deck = lesson.concat(deck.filter(function (c) { return lesson.indexOf(c) === -1; }));
    }

    /* THE TWIST. Each level after the first brings one new thing, and
       keeps the ones before it: frozen cards at school, burning ones on
       your phone, trays that will not stay put out in town. */
    var sp = level.specials || {};
    spec = { gold: (sp.gold || 0) + petGold(), ice: sp.ice || 0, fuse: sp.fuse || 0 };
    shuffleEvery = (level.shuffleEvery || 0) * 1000;

    /* A calm level has no clock and nothing landing on its own. It ends
       when you have sorted `goal` cards, at whatever pace you like. */
    calm = !level.seconds;
    goal = level.goal || 20;

    resetCounters();

    /* Your pet shortens the clock. That is the price of the extra coins it
       pays: less time means fewer cards, so a smaller score. A calm level
       has no clock, so a pet costs you nothing there. */
    var seconds = Math.round(level.seconds / (gear.fast || 1));
    totalMs = seconds * 1000;
    endsAt = calm ? Infinity : Date.now() + totalMs;
    nextShuffle = Date.now() + shuffleEvery;

    Arena.beginLevel({
      level: level, calm: calm, goal: goal, seconds: seconds,
      target: Math.round(level.minAcc * 100),
      shields: gear.block, boxes: level.boxes, tutorial: tutorial, corners: copy(corners)
    });
    if (calm) Arena.setProgress(1, goal);
    nextCard();

    if (timer) clearInterval(timer);
    timer = setInterval(tick, 100);
    tick();
  }

  /* ---------------- the daily challenge ----------------
     ONE ROUND A DAY, THE SAME FOR EVERYBODY. The deck, which cards are
     golden or frozen or burning, and when the trays swap are all drawn
     from a random number seeded with today's date - so two friends on
     two phones get exactly the same round, and the score means the same
     thing on both. It is the one place in the game where comparing
     scores is fair. */

  function startDaily() {
    mode = 'daily';
    tutorial = false;
    var d = Daily.today();
    level = { n: 0, name: 'Daily #' + d.number, theme: null, seconds: DAILY.SECONDS, minAcc: 0,
              boxes: ['now', 'later', 'give', 'drop'], tiers: [1, 2, 3] };

    setupGear();
    rng = seeded(d.seed);
    specRng = seeded(d.seed ^ 0x9e3779b9);
    swapRng = seeded(d.seed ^ 0x85ebca6b);
    pool = CARDS;
    deck = shuffle(CARDS).concat(shuffle(CARDS));
    deckAt = 0;
    /* Gear still applies (it is yours), but a pet's extra golden cards
       would make the deck different for whoever owns the best pet - so
       on the daily they do not. */
    spec = { gold: DAILY.GOLD, ice: DAILY.ICE, fuse: DAILY.FUSE };
    shuffleEvery = DAILY.SHUFFLE_EVERY * 1000;

    calm = false;
    resetCounters();
    var seconds = Math.round(DAILY.SECONDS / (gear.fast || 1));
    totalMs = seconds * 1000;
    endsAt = Date.now() + totalMs;
    nextShuffle = Date.now() + shuffleEvery;

    Arena.beginLevel({
      level: level, calm: false, goal: 0, seconds: seconds, target: 0, daily: true,
      shields: gear.block, boxes: level.boxes, tutorial: false, corners: copy(corners)
    });
    nextCard();

    if (timer) clearInterval(timer);
    timer = setInterval(tick, 100);
    tick();
  }

  /* ---------------- your own list ----------------
     THE GAME POINTED AT REAL LIFE. You type in what is actually on your
     plate this week and sort it with the same four corners. Nobody marks
     it - there is no right answer to your own life - so there is no
     score, no clock and no combo. What you get at the end is a PLAN:
     your list, in four piles, kept on the My List sheet. */

  function startMine() {
    mode = 'mine';
    tutorial = false;
    var tasks = MyList.toSort();
    level = { n: 0, name: 'My List', theme: 'mine', seconds: 0, minAcc: 0,
              boxes: ['now', 'later', 'give', 'drop'], tiers: [1, 2, 3] };
    setupGear();
    spec = { gold: 0, ice: 0, fuse: 0 };
    pool = [];
    deck = tasks.map(function (t) { return { text: t.text, theme: 'mine', box: null, why: '', id: t.id }; });
    deckAt = 0;
    calm = true;
    goal = deck.length;
    resetCounters();
    totalMs = 0;
    endsAt = Infinity;

    Arena.beginLevel({
      level: level, calm: true, goal: goal, seconds: 0, target: 0, mine: true,
      shields: 0, boxes: level.boxes, tutorial: false, corners: copy(corners)
    });
    Arena.setProgress(1, goal);
    nextCard();

    if (timer) clearInterval(timer);
    timer = setInterval(tick, 100);
  }

  /* ---------------- the game clock ---------------- */

  function tick() {
    if (!running || paused) return;

    var now = Date.now();
    var msLeft = endsAt - now;

    /* A burning card that nobody sorted in time. */
    if (card && card.fuseAt && !locked && now >= card.fuseAt) { resolve(null); return; }

    if (shuffleEvery && now >= nextShuffle && !locked) {
      nextShuffle = now + shuffleEvery;
      /* Not in the last few seconds of a round: a swap you have no time
         to get used to is not a twist, it is a trick. */
      if (mode === 'battle' || msLeft > 5000) doShuffle();
    }

    if (mode === 'battle') { battleTick(now, msLeft); return; }

    /* A calm level has no clock, no final rush and no cards landing on
       their own. The round ends from resolve() once the goal is reached. */
    if (calm) return;

    if (msLeft <= 0) { finish('time'); return; }

    var secs = Math.ceil(msLeft / 1000);
    if (secs !== lastSecs) {
      lastSecs = secs;
      Arena.setClock(secs, msLeft / totalMs);
    }
    Arena.setRush(secs <= rushWindow());
  }

  /** The duel clock: the rival keeps sorting whether you do or not. */
  function battleTick(now, msLeft) {
    var secs = Math.max(0, Math.ceil(msLeft / 1000));
    if (secs !== lastSecs) { lastSecs = secs; Arena.setClock(secs, Math.max(0, msLeft) / totalMs); }

    if (hpYou <= 0) { finish('lost'); return; }
    if (hpFoe <= 0) { finish('won'); return; }
    /* Out of time: whoever has more of their OWN health left. A boss
       with a bigger bar does not win on having started with more. */
    if (msLeft <= 0) { finish(hpYou / BATTLE.HP >= hpFoe / hpFoeMax ? 'won' : 'lost'); return; }

    // the rival takes a swing on their own clock
    if (now - lastFoeMove >= foe.speed) {
      lastFoeMove = now;
      if (rng() < foe.accuracy) {
        hpYou = Math.max(0, hpYou - foe.damage);
        Arena.foeMove(true, foe.damage, hpYou);
      } else {
        Arena.foeMove(false, 0, hpYou);
      }
    }

    // ...and every so often, their special trick
    if (foe.power && now >= nextPower && !locked) {
      nextPower = now + (foe.powerEvery || 12000);
      usePower(foe.power);
    }
  }

  /* ---------------- boss tricks ----------------
     Each boss has ONE thing they do, and it is the thing their name
     promises. Every one of them is a twist you have already met on the
     map, turned up - so a boss fight tests what the levels taught. */
  function usePower(p) {
    if (p === 'freeze') {
      /* Sticky Steve gums up the card you are holding. */
      if (card && !card.ice && !card.fuseAt) { card.ice = iceHits + 1; card.special = 'ice'; }
      else pendingIce = 1;
    } else if (p === 'shuffle') {
      doShuffle();
    } else if (p === 'deadline') {
      /* Deadline Dan lights a fuse under this card and the next two. */
      if (card && !card.fuseAt && !card.ice) { card.fuseAt = Date.now() + fuseMs; card.fuseMs = fuseMs; card.special = 'fuse'; }
      pendingFuse = 2;
    }
    /* 'blackout' (Inbox Ivan) is the arena's alone: it hides the words
       on the trays. The rules do not change; your memory has to. */
    Arena.foePower(p, card);
  }

  /** Two trays swap corners. */
  function doShuffle() {
    var keys = ['tl', 'tr', 'bl', 'br'];
    var a = keys[Math.floor(swapRng() * 4)];
    var b = keys[(keys.indexOf(a) + 1 + Math.floor(swapRng() * 3)) % 4];
    var t = corners[a]; corners[a] = corners[b]; corners[b] = t;
    tally.shuffles++;
    Arena.shuffle(copy(corners));
  }

  /** How many seconds of final rush this level gets. A level with no
      clock has no "final" anything, so it gets none. */
  function rushWindow() {
    if (calm) return 0;
    return Math.min(TUNING.RUSH_SECONDS, Math.round(level.seconds * TUNING.RUSH_SHARE));
  }

  function isRush() {
    return (mode === 'level' || mode === 'daily') && !calm && (endsAt - Date.now()) / 1000 <= rushWindow();
  }

  /** Every card you actually dealt with this round: the ones you got
      right, the ones you got wrong, and the ones your shield covered. */
  function sorted() {
    return correct + wrong + forgiven;
  }

  /** True once a calm level has had all the cards it was going to give. */
  function goalReached() {
    return calm && sorted() >= goal;
  }

  /* ---------------- cards ---------------- */

  function nextCard() {
    /* Top up from this level's own pool, never from every card in the
       game - otherwise a long round would start smuggling in corners and
       difficulties the level is not supposed to have yet. */
    if (deckAt >= deck.length) {
      if (mode === 'mine') return;
      deck = deck.concat(shuffle(pool.length ? pool : CARDS));
    }
    card = decorate(deck[deckAt++]);
    dealt++;
    cardShownAt = Date.now();
    if (card.special === 'fuse') { card.fuseMs = fuseMs; card.fuseAt = cardShownAt + fuseMs; }
    Arena.deal(card, { coach: tutorial && deckAt <= TUTORIAL_CARDS, lesson: deckAt });
  }

  /** A copy of the card from the deck, with its special (if any). A copy,
      because the same card comes round again later, maybe plain. */
  function decorate(base) {
    var c = copy(base);
    c.special = null; c.ice = 0; c.fuseAt = 0;
    var teaching = tutorial && deckAt <= TUTORIAL_CARDS;
    if (mode === 'mine' || teaching) return c;
    var sp = null;
    if (pendingIce > 0) { sp = 'ice'; pendingIce--; }
    else if (pendingFuse > 0) { sp = 'fuse'; pendingFuse--; }
    else if (dealt >= 2) {
      /* Two specials in a row are half as likely, so a run of them is
         rare rather than routine. */
      var damp = lastSpecial ? 0.5 : 1;
      var r = specRng();
      if (r < spec.gold * damp) sp = 'gold';
      else if (r < (spec.gold + spec.ice) * damp) sp = 'ice';
      else if (r < (spec.gold + spec.ice + spec.fuse) * damp) sp = 'fuse';
    }
    lastSpecial = !!sp;
    c.special = sp;
    if (sp === 'ice') c.ice = iceHits;
    return c;
  }

  /** A tap on a frozen card. Returns how many taps are left. */
  function crack() {
    if (!running || paused || !card || !card.ice) return 0;
    card.ice--;
    if (card.ice <= 0) {
      card.ice = 0;
      tally.ices++;
      /* The clock on the card starts now. Being slow to sort a card you
         could not touch yet is not being slow. */
      cardShownAt = Date.now();
    }
    Arena.cracked(card.ice);
    return card.ice;
  }

  /** Which corner a swipe is aimed at. Any direction lands somewhere, so a
      sloppy flick still counts.

      On a level that does not use all four, the missing corner is taken
      off the screen and its neighbour grows into the space - so a swipe
      into that half lands on whatever is actually sitting there. */
  function boxFor(x, y) {
    var row = y < 0 ? 't' : 'b', col = x < 0 ? 'l' : 'r';
    var box = corners[row + col];
    if (level && level.boxes && level.boxes.indexOf(box) === -1) {
      box = corners[row + (col === 'l' ? 'r' : 'l')];
    }
    return box;
  }

  /* ---------------- scoring ---------------- */

  function resolve(box) {
    if (!running || locked || paused || !card) return;
    /* A frozen card cannot go anywhere until it is cracked. The arena
       tells you so; the rules just refuse. */
    if (card.ice > 0 && box !== null) { Arena.stillFrozen(); return; }

    var took = Date.now() - cardShownAt;
    var burnt = box === null;
    var right = !burnt && (mode === 'mine' || box === card.box);
    var was = card;

    if (tutorial && deckAt >= TUTORIAL_CARDS) {
      tutorial = false;
      Progress.markTipSeen('tutorial');
    }

    if (mode === 'mine') { mineResolve(box, was); return; }
    if (mode === 'battle') { battleResolve(box, right, took, was); return; }

    if (right) {
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;

      var mult = Math.min(streak, TUNING.MAX_MULTIPLIER);
      var speed = Math.max(0, Math.round(
        (1 - Math.min(took, TUNING.SPEED_WINDOW_MS) / TUNING.SPEED_WINDOW_MS) * TUNING.SPEED_BONUS_MAX));
      var perfect = took <= TUNING.PERFECT_MS;
      var rush = isRush();
      var gold = was.special === 'gold';

      var gained = (TUNING.BASE_POINTS + speed + (perfect ? TUNING.PERFECT_BONUS : 0)) * mult;
      if (rush) gained *= TUNING.RUSH_MULTIPLIER;
      if (gold) gained *= TUNING.GOLD_MULT;
      gained = Math.round(gained * gear.mult);   // weapon bonus

      score += gained;
      if (perfect) tally.perfects++;
      if (gold) { tally.golds++; tally.goldCoins += TUNING.GOLD_COINS; }
      if (box === 'later') tally.laterRight++;

      Arena.sorted({
        box: box, right: true, perfect: perfect, gained: gained, score: score,
        streak: streak, mult: mult, rush: rush, card: was, gold: gold
      });

      if (goalReached()) { finish('goal'); return; }
      if (calm) Arena.setProgress(sorted() + 1, goal);
      nextCard();

    } else {
      /* Kept so the end screen can show it again. */
      misses.push({ card: card, chose: box });
      if (burnt) tally.burns++;

      /* A shield fully forgives the mistake: the streak survives AND it
         does not count against your accuracy. Accuracy is the only thing
         that decides whether you pass, so forgiving it is the whole point
         of buying armour. It still shows up in the review at the end,
         because being let off is not the same as being right. */
      var blocked = blocksLeft > 0;
      var lost = streak;
      if (blocked) { blocksLeft--; forgiven++; }
      else { wrong++; streak = 0; }

      Arena.sorted({
        box: box, right: false, burnt: burnt, blocked: blocked, streak: streak, lostStreak: blocked ? 0 : lost,
        shieldsLeft: blocksLeft, card: was
      });

      afterMiss(function () {
        if (goalReached()) { finish('goal'); return; }
        if (calm) Arena.setProgress(sorted() + 1, goal);
        nextCard();
      });
    }
  }

  /** The short stun after a miss, then whatever comes next. */
  function afterMiss(then) {
    locked = true;
    setTimeout(function () {
      locked = false;
      if (!running) return;
      then();
    }, TUNING.WRONG_STUN_MS);
  }

  /** In a duel a correct sort is a punch, a wrong one is a punch taken. */
  function battleResolve(box, right, took, was) {
    var burnt = box === null;
    if (right) {
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;

      var perfect = took <= BATTLE.PERFECT_MS;
      var gold = was.special === 'gold';
      var hit = Math.round((perfect ? BATTLE.HIT_PERFECT : BATTLE.HIT) * gear.mult * (gold ? BATTLE.GOLD_HIT : 1));
      hpFoe = Math.max(0, hpFoe - hit);
      if (perfect) tally.perfects++;
      if (gold) { tally.golds++; tally.goldCoins += TUNING.GOLD_COINS; }
      if (box === 'later') tally.laterRight++;

      Arena.sorted({
        box: box, right: true, perfect: perfect, hit: hit, hpFoe: hpFoe,
        streak: streak, card: was, gold: gold
      });

      if (hpFoe <= 0) { finish('won'); return; }
      nextCard();

    } else {
      wrong++;
      if (burnt) tally.burns++;
      // a duel teaches the same lesson, so it gets the same review
      misses.push({ card: card, chose: box });

      // in a duel the shield takes the hit for you as well
      var blocked = blocksLeft > 0;
      var lost = streak;
      if (blocked) blocksLeft--;
      else streak = 0;
      if (!blocked) hpYou = Math.max(0, hpYou - BATTLE.SELF_HIT);

      Arena.sorted({
        box: box, right: false, burnt: burnt, blocked: blocked, selfHit: blocked ? 0 : BATTLE.SELF_HIT,
        hpYou: hpYou, streak: streak, lostStreak: blocked ? 0 : lost, shieldsLeft: blocksLeft, card: was
      });

      afterMiss(function () {
        if (hpYou <= 0) { finish('lost'); return; }
        nextCard();
      });
    }
  }

  /** Your own list: wherever you put it is where it goes. */
  function mineResolve(box, was) {
    correct++;
    MyList.place(was.id, box);
    Arena.sorted({ box: box, right: true, mine: true, card: was, streak: 0, score: 0, gained: 0 });
    if (goalReached()) { finish('goal'); return; }
    Arena.setProgress(sorted() + 1, goal);
    nextCard();
  }

  /* ---------------- the end-screen review ---------------- */

  /** Every card you got wrong, what you said, and why that was not it.
      The same card missed twice is one row with "x2" on it, so five
      mistakes on one stubborn card do not push everything else off.

      The right corner rides along now. The arena shows it the moment
      you miss, so hiding it again here would only be hiding it from
      somebody who looked away - the review keeps it under a tap, so
      you can still try to work it out before you look. */
  function reviewRows() {
    var rows = [], seen = {};
    misses.forEach(function (m) {
      var key = m.card.text;
      if (seen[key]) { seen[key].times++; return; }
      seen[key] = { text: m.card.text, why: m.card.why, chose: m.chose, box: m.card.box, times: 1 };
      rows.push(seen[key]);
    });
    return rows;
  }

  /** Grade comes from accuracy and streak, never from how many you sorted. */
  function gradeFor(acc, best) {
    if (acc >= 0.95 && best >= 12) return 'S';
    if (acc >= 0.85) return 'A';
    if (acc >= 0.70) return 'B';
    return 'C';
  }

  function starsForGrade(g) { return g === 'S' ? 3 : g === 'A' ? 2 : 1; }

  /* ---------------- end of round ---------------- */

  function finish(reason) {
    if (!running) return;
    running = false;
    if (timer) clearInterval(timer);

    if (mode === 'mine') {
      MyList.finished();
      var won = Badges.check({ mode: 'mine' });
      Arena.end('goal', function () {
        Stage.go('home', {}, 'fade');
        setTimeout(function () {
          Panels.open('mine', { plan: true });
          if (won.length) { Sfx.play('unlock'); Panels.toast('Badge earned: ' + won[0].name + '!', 'good'); }
        }, 450);
      });
      return;
    }

    var R = mode === 'battle' ? battleFinish(reason)
          : mode === 'daily' ? dailyFinish(reason)
          : levelFinish(reason);

    /* MISSIONS AND BADGES. Told what happened, they say what that
       finished - and a finished mission pays out with the round, so its
       coins fly into the wallet with the rest. */
    var summary = roundSummary(R);
    R.missionsDone = Missions.record(summary);
    var extra = 0;
    R.missionsDone.forEach(function (m) { extra += m.reward; });
    if (tally.goldCoins) extra += tally.goldCoins;
    if (extra) { Progress.addCoins(extra); R.coins += extra; }
    R.goldCoins = tally.goldCoins;
    R.badgesNew = Badges.check(summary);
    Services.roundOver(summary);

    Arena.end(reason, function () { Stage.go('results', R, 'fade'); });
  }

  /** Everything about the round a mission or a badge might care about. */
  function roundSummary(R) {
    var total = sorted();
    return {
      mode: mode, level: level ? level.n : 0, foe: foe ? foe.n : 0,
      passed: !!R.passed, grade: R.grade, score: mode === 'battle' ? 0 : score,
      sorted: total, correct: correct, wrong: wrong, forgiven: forgiven,
      bestStreak: bestStreak, perfects: tally.perfects, golds: tally.golds, ices: tally.ices,
      burns: tally.burns, laterRight: tally.laterRight,
      flawless: total >= 10 && wrong === 0 && forgiven === 0,
      hpLeft: mode === 'battle' ? hpYou : 0
    };
  }

  function levelFinish(reason) {
    var total = sorted();
    var acc = total ? (correct + forgiven) / total : 0;
    var grade = gradeFor(acc, bestStreak);
    /* Passing tests the skill, not the scoreboard. Score swings wildly (a
       x8 streak with Perfect bonuses is worth ten times a careless sort),
       so any score target is either trivial or impossible. */
    var passed = acc >= level.minAcc;

    /* Asked BEFORE the round is recorded, because recording it is what
       does the unlocking - afterwards there is no way to tell a level you
       just opened from one you opened last week. */
    var nextWasOpen = Progress.isOpen(level.n + 1);
    var prevBest = Progress.best(level.n);
    var dailyWasLocked = !Daily.isOpen();

    Progress.record(level.n, passed, grade, score);

    var coins = Shop.coinsFor(score, grade);
    Progress.addCoins(coins);

    /* Spell out what just happened to the map. Without this, a player who
       finishes a round but misses the accuracy bar has no idea why the
       next level is still locked. */
    var nextLv = LEVELS[level.n];        // the one after this
    var bar = Math.round(level.minAcc * 100);
    var unlock;
    if (passed && nextLv && !nextWasOpen) {
      unlock = { text: 'Level ' + nextLv.n + ' unlocked - ' + nextLv.name, good: true, fresh: true };
    } else if (passed && nextLv) {
      /* A REPLAY IS NOT AN UNLOCK. Going back to an early level to farm
         coins and being told you have just unlocked a level you opened an
         hour ago reads like the game lost your progress. */
      unlock = { text: 'Level ' + nextLv.n + ' is already open - ' + nextLv.name, good: true };
    } else if (passed) {
      unlock = { text: 'You finished the whole trail!', good: true, fresh: !prevBest };
    } else if (nextLv && !nextWasOpen) {
      unlock = { text: 'Level ' + nextLv.n + ' stays locked. Get ' + bar + '% right to open it.', good: false };
    } else if (nextLv) {
      /* And failing one you have already passed costs nothing. Saying
         "stays locked" about a level sitting open on the map is untrue,
         and the kind of untrue that makes somebody check whether their
         save is broken. */
      unlock = { text: 'Nothing lost - Level ' + nextLv.n + ' is already open.', good: false };
    } else {
      /* The last level has nothing after it, so "open it" pointed at
         nothing at all. */
      unlock = { text: 'Get ' + bar + '% right to pass.', good: false };
    }
    var dailyNow = dailyWasLocked && Daily.isOpen();

    return {
      mode: 'level', reason: reason, passed: passed, levelN: level.n,
      title: passed ? 'Level ' + level.n + ' complete!' : 'Not quite',
      sub: passed ? level.name : 'You needed ' + bar + '% right. Have another go.',
      grade: grade,
      stars: passed ? starsForGrade(grade) : 0,
      newBest: passed && (!prevBest || score > prevBest.score) && !!prevBest,
      unlock: unlock,
      dailyOpened: dailyNow,
      stats: [
        { k: 'Score', v: score, count: true },
        { k: 'Accuracy', v: Math.round(acc * 100), count: true, suffix: '%' },
        { k: 'Best streak', v: 'x' + Math.min(bestStreak, TUNING.MAX_MULTIPLIER) }
      ],
      coins: coins, fullSet: Shop.hasFullSet(),
      misses: reviewRows(),
      hasNext: passed && level.n < LEVELS.length,
      nextLabel: 'NEXT LEVEL',
      againLabel: passed ? 'PLAY AGAIN' : 'TRY AGAIN',
      homeLabel: 'MAP'
    };
  }

  function dailyFinish(reason) {
    var total = sorted();
    var acc = total ? (correct + forgiven) / total : 0;
    var grade = gradeFor(acc, bestStreak);
    var d = Daily.record(score);
    var coins = Shop.coinsFor(score, grade) + d.bonus;
    Progress.addCoins(coins);
    return {
      mode: 'daily', reason: reason, passed: true, daily: d,
      title: 'Daily #' + d.number,
      sub: d.first ? 'Day streak: ' + d.streak + (d.streak > 1 ? ' days in a row!' : ' - come back tomorrow')
                   : 'Best today: ' + d.best.toLocaleString(),
      grade: grade, stars: 0,
      newBest: !d.first && d.improved,
      unlock: d.first ? { text: 'Daily bonus +' + d.bonus + ' coins (streak x' + d.streak + ')', good: true }
                      : { text: d.improved ? 'A new best for today!' : 'Your best today is ' + d.best.toLocaleString(), good: d.improved },
      stats: [
        { k: 'Score', v: score, count: true },
        { k: 'Best today', v: d.best, count: true },
        { k: 'Accuracy', v: Math.round(acc * 100), count: true, suffix: '%' },
        { k: 'Best streak', v: 'x' + Math.min(bestStreak, TUNING.MAX_MULTIPLIER) }
      ],
      coins: coins, fullSet: Shop.hasFullSet(),
      misses: reviewRows(),
      hasNext: false,
      againLabel: 'PLAY AGAIN',
      homeLabel: 'HOME'
    };
  }

  function battleFinish(reason) {
    var won = (reason === 'won');
    var total = sorted();
    var acc = total ? (correct + forgiven) / total : 0;
    var grade = gradeFor(acc, bestStreak);

    // losing still pays a little, so a hard rival is not a total waste
    var coins = won ? Battle.coinsFor(foe) : Math.round(Battle.coinsFor(foe) * 0.2);
    Progress.addCoins(coins);
    /* Asked before beatRival, for the same reason as the levels. */
    var nextFoeWasOpen = Progress.rivalsBeaten() >= foe.n;
    if (won) Progress.beatRival(foe.n);

    var nextFoe = OPPONENTS[foe.n];
    var unlock;
    if (won && nextFoe && !nextFoeWasOpen) unlock = { text: nextFoe.name + ' unlocked', good: true, fresh: true };
    /* Same as the levels: beating a boss you have already beaten does not
       unlock the next one again. */
    else if (won && nextFoe) unlock = { text: nextFoe.name + ' is already waiting for you', good: true };
    else if (won) unlock = { text: 'You beat every boss!', good: true, fresh: !nextFoeWasOpen };
    else unlock = { text: 'Your health ran out. Sort faster, and stop missing.', good: false };

    return {
      mode: 'battle', reason: reason, passed: won, foeN: foe.n, foe: foe,
      title: won ? 'You win!' : 'Knocked out',
      sub: won ? 'You out-sorted ' + foe.name + '.' : foe.name + ' buried you in paperwork.',
      grade: grade,
      stars: 0,
      unlock: unlock,
      /* A duel has no score, so the first row is the health you kept. */
      stats: [
        { k: 'Health left', v: Math.max(0, hpYou) + ' HP' },
        { k: 'Accuracy', v: Math.round(acc * 100), count: true, suffix: '%' },
        { k: 'Best streak', v: 'x' + Math.min(bestStreak, TUNING.MAX_MULTIPLIER) }
      ],
      coins: coins, fullSet: Shop.hasFullSet(),
      misses: reviewRows(),
      hasNext: won && !!nextFoe,
      nextLabel: 'NEXT BOSS',
      againLabel: won ? 'FIGHT AGAIN' : 'TRY AGAIN',
      homeLabel: 'BOSSES'
    };
  }

  return {
    init: init,
    start: start,
    startBattle: startBattle,
    startDaily: startDaily,
    startMine: startMine,
    sort: resolve,
    crack: crack,
    boxFor: boxFor,
    canSort: function () { return running && !locked && !paused && !!card; },
    isRunning: function () { return running; },
    currentLevel: function () { return level ? level.n : 1; },
    currentFoe: function () { return foe ? foe.n : 1; },
    isBattle: function () { return mode === 'battle'; },
    mode: function () { return mode; },
    isTutorial: function () { return tutorial; },
    stop: function () { running = false; if (timer) clearInterval(timer); },
    /** Where each tray is right now, for the arena and for tests. */
    corners: function () { return copy(corners); },
    /** For tests: what the card in play really is. */
    card: function () { return card; },

    /** How far the boss's next swing has wound up, 0..1. The arena draws
        it as a bar filling under them - a telegraph, so a hit you take
        is one you could see coming. */
    foeCharge: function () {
      if (mode !== 'battle' || !running || !foe) return 0;
      var gap = paused ? pausedFoeGap : Date.now() - lastFoeMove;
      return Math.max(0, Math.min(1, gap / foe.speed));
    },

    /** How much of the card's fuse is left, 0..1 (1 for no fuse). */
    fuseLeft: function () {
      if (!card || !card.fuseAt) return 1;
      var now = paused ? pausedAt : Date.now();
      return Math.max(0, Math.min(1, (card.fuseAt - now) / (card.fuseMs || fuseMs)));
    },

    /* ---- pause ----
       The clock is a wall clock: everything reads Date.now() against
       endsAt. So pausing is remembering how much was left, and resuming
       is setting a fresh endsAt that far into the future. Sorting is
       blocked too, or you could sort cards while paused. Everything
       else that runs on the wall clock - a fuse, the next tray swap,
       the boss's next trick, how long you have held this card - is
       moved on by however long the pause lasted. */
    pause: function () {
      if (!running || paused) return;
      paused = true;
      pausedAt = Date.now();
      pausedMsLeft = endsAt - pausedAt;
      pausedFoeGap = pausedAt - lastFoeMove;
    },
    resume: function () {
      if (!paused) return;
      paused = false;
      var gap = Date.now() - pausedAt;
      if (isFinite(pausedMsLeft)) endsAt = Date.now() + pausedMsLeft;
      lastFoeMove = Date.now() - pausedFoeGap;   // the rival lost no ground
      cardShownAt += gap;
      nextShuffle += gap;
      nextPower += gap;
      if (card && card.fuseAt) card.fuseAt += gap;
    },
    isPaused: function () { return paused; }
  };
})();
