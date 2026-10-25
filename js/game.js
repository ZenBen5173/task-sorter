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
     the game tells the arena   Arena.deal(card)  here is the next one
                                Arena.sorted(r)   here is what that was worth
                                Arena.end(...)    the round is over

   Every rule is exactly as it was. Same points, same Perfect window,
   same final rush, same shields, same bosses, same grades.

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
     answers are on the end screen under "What you missed". */
  WRONG_STUN_MS: 350,

  SWIPE_MIN_PX: 45,        // shorter than this counts as a tap, not a swipe

  /* The final rush is capped to a quarter of the level, so a short
     tutorial level does not spend half its life in rush mode. */
  RUSH_SECONDS: 20,
  RUSH_SHARE: 0.25,
  RUSH_MULTIPLIER: 2
};

var Game = (function () {

  /* ---------------- round state ---------------- */

  var level = null;        // the level being played
  var deck = [];           // shuffled, prepared before the round starts
  var deckAt = 0;
  var pool = [];           // the cards this level is allowed to use
  var calm = false;        // true on a no-clock level (Level 1)
  var goal = 0;            // on a calm level, how many cards ends the round
  var card = null;         // the card currently in play
  var cardShownAt = 0;

  var score = 0;
  var streak = 0;
  var bestStreak = 0;
  var correct = 0;
  var wrong = 0;
  var misses = [];         // every card you got wrong, for the end screen
  var forgiven = 0;        // mistakes your shield wiped off your accuracy

  var running = false;
  var locked = false;      // true during the stun after a wrong answer
  var paused = false;
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
  var mode = 'level';      // 'level' or 'battle'
  var foe = null;
  var hpYou = 0, hpFoe = 0;
  var lastFoeMove = 0;

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
      if (dir) resolve(boxFor(dir[0], dir[1]));
    });
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function resetCounters() {
    score = 0; streak = 0; bestStreak = 0;
    correct = 0; wrong = 0; forgiven = 0; misses = [];
    running = true; locked = false; paused = false;
    lastSecs = -1;
  }

  /* ---------------- starting a battle ---------------- */

  function startBattle(foeNumber) {
    mode = 'battle';
    tutorial = false;
    foe = OPPONENTS[(foeNumber || 1) - 1] || OPPONENTS[0];

    gear = Shop.effects();
    blocksLeft = gear.block;

    // every kind of card shows up in a duel, at every difficulty
    pool = CARDS;
    calm = false;
    deck = shuffle(CARDS).concat(shuffle(CARDS)).concat(shuffle(CARDS));
    deckAt = 0;

    resetCounters();
    hpYou = BATTLE.HP; hpFoe = BATTLE.HP;

    totalMs = BATTLE.SECONDS * 1000;
    endsAt = Date.now() + totalMs;
    lastFoeMove = Date.now();

    Arena.beginBattle({
      foe: foe, you: Hero.name(), hp: BATTLE.HP,
      shields: gear.block, seconds: BATTLE.SECONDS
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
    gear = Shop.effects();
    blocksLeft = gear.block;

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

    Arena.beginLevel({
      level: level, calm: calm, goal: goal, seconds: seconds,
      target: Math.round(level.minAcc * 100),
      shields: gear.block, boxes: level.boxes, tutorial: tutorial
    });
    if (calm) Arena.setProgress(1, goal);
    nextCard();

    if (timer) clearInterval(timer);
    timer = setInterval(tick, 100);
    tick();
  }

  /* ---------------- the game clock ---------------- */

  function tick() {
    if (!running || paused) return;

    var now = Date.now();
    var msLeft = endsAt - now;

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
    if (msLeft <= 0) { finish(hpYou >= hpFoe ? 'won' : 'lost'); return; }

    // the rival takes a swing on their own clock
    if (now - lastFoeMove >= foe.speed) {
      lastFoeMove = now;
      if (Math.random() < foe.accuracy) {
        hpYou = Math.max(0, hpYou - foe.damage);
        Arena.foeMove(true, foe.damage, hpYou);
      } else {
        Arena.foeMove(false, 0, hpYou);
      }
    }
  }

  /** How many seconds of final rush this level gets. A level with no
      clock has no "final" anything, so it gets none. */
  function rushWindow() {
    if (calm) return 0;
    return Math.min(TUNING.RUSH_SECONDS, Math.round(level.seconds * TUNING.RUSH_SHARE));
  }

  function isRush() {
    return mode === 'level' && !calm && (endsAt - Date.now()) / 1000 <= rushWindow();
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
      deck = deck.concat(shuffle(pool.length ? pool : CARDS));
    }
    card = deck[deckAt++];
    cardShownAt = Date.now();
    Arena.deal(card, { coach: tutorial && deckAt <= TUTORIAL_CARDS, lesson: deckAt });
  }

  /** Which corner a swipe is aimed at. Any direction lands somewhere, so a
      sloppy flick still counts.

      On a level that does not use all four, the missing corner is taken
      off the screen and its neighbour grows into the space - so a swipe
      into that half lands on whatever is actually sitting there. */
  function boxFor(x, y) {
    var box;
    if (x < 0 && y < 0) box = 'now';
    else if (x >= 0 && y < 0) box = 'later';
    else if (x < 0 && y >= 0) box = 'give';
    else box = 'drop';

    if (mode === 'level' && level && level.boxes.indexOf(box) === -1) {
      box = (box === 'give') ? 'drop'
          : (box === 'drop') ? 'give'
          : (box === 'now')  ? 'later'
          : 'now';
    }
    return box;
  }

  /* ---------------- scoring ---------------- */

  function resolve(box) {
    if (!running || locked || paused || !card) return;

    var took = Date.now() - cardShownAt;
    var right = (box === card.box);
    var was = card;

    if (tutorial && deckAt >= TUTORIAL_CARDS) {
      tutorial = false;
      Progress.markTipSeen('tutorial');
    }

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

      var gained = (TUNING.BASE_POINTS + speed + (perfect ? TUNING.PERFECT_BONUS : 0)) * mult;
      if (rush) gained *= TUNING.RUSH_MULTIPLIER;
      gained = Math.round(gained * gear.mult);   // weapon bonus

      score += gained;

      Arena.sorted({
        box: box, right: true, perfect: perfect, gained: gained, score: score,
        streak: streak, mult: mult, rush: rush, card: was
      });

      if (goalReached()) { finish('goal'); return; }
      if (calm) Arena.setProgress(sorted() + 1, goal);
      nextCard();

    } else {
      /* Kept so the end screen can show it again. */
      misses.push({ card: card, chose: box });

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
        box: box, right: false, blocked: blocked, streak: streak, lostStreak: blocked ? 0 : lost,
        shieldsLeft: blocksLeft, card: was
      });

      /* No banner and no pause to read one. The answer and the reason wait
         for the end screen. The only delay is the bounce animation. */
      locked = true;
      setTimeout(function () {
        locked = false;
        if (!running) return;
        if (goalReached()) { finish('goal'); return; }
        if (calm) Arena.setProgress(sorted() + 1, goal);
        nextCard();
      }, TUNING.WRONG_STUN_MS);
    }
  }

  /** In a duel a correct sort is a punch, a wrong one is a punch taken. */
  function battleResolve(box, right, took, was) {
    if (right) {
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;

      var perfect = took <= BATTLE.PERFECT_MS;
      var hit = Math.round((perfect ? BATTLE.HIT_PERFECT : BATTLE.HIT) * gear.mult);
      hpFoe = Math.max(0, hpFoe - hit);

      Arena.sorted({
        box: box, right: true, perfect: perfect, hit: hit, hpFoe: hpFoe,
        streak: streak, card: was
      });

      if (hpFoe <= 0) { finish('won'); return; }
      nextCard();

    } else {
      wrong++;
      // a duel teaches the same lesson, so it gets the same review
      misses.push({ card: card, chose: box });

      // in a duel the shield takes the hit for you as well
      var blocked = blocksLeft > 0;
      var lost = streak;
      if (blocked) blocksLeft--;
      else streak = 0;
      if (!blocked) hpYou = Math.max(0, hpYou - BATTLE.SELF_HIT);

      Arena.sorted({
        box: box, right: false, blocked: blocked, selfHit: blocked ? 0 : BATTLE.SELF_HIT,
        hpYou: hpYou, streak: streak, lostStreak: blocked ? 0 : lost, shieldsLeft: blocksLeft, card: was
      });

      locked = true;
      setTimeout(function () {
        locked = false;
        if (hpYou <= 0) { finish('lost'); return; }
        if (running) nextCard();
      }, TUNING.WRONG_STUN_MS);
    }
  }

  /* ---------------- the end-screen review ---------------- */

  /** Every card you got wrong, what you said, and why that was not it.
      The same card missed twice is one row with "x2" on it, so five
      mistakes on one stubborn card do not push everything else off.

      THE RIGHT CORNER IS NEVER GIVEN. Being handed the answer teaches
      nothing: you read it, nod, and forget it by the next round. The
      reason is the lesson, and made to work for on its own it is the
      thing that sticks. */
  function reviewRows() {
    var rows = [], seen = {};
    misses.forEach(function (m) {
      var key = m.card.text;
      if (seen[key]) { seen[key].times++; return; }
      seen[key] = { text: m.card.text, why: m.card.why, chose: m.chose, times: 1 };
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

    var R = mode === 'battle' ? battleFinish(reason) : levelFinish(reason);
    Arena.end(reason, function () { Stage.go('results', R, 'fade'); });
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

    return {
      mode: 'level', reason: reason, passed: passed, levelN: level.n,
      title: passed ? 'Level ' + level.n + ' complete!' : 'Not quite',
      sub: passed ? level.name : 'You needed ' + bar + '% right. Have another go.',
      grade: grade,
      stars: passed ? starsForGrade(grade) : 0,
      newBest: passed && (!prevBest || score > prevBest.score) && !!prevBest,
      unlock: unlock,
      stats: [
        { k: 'Score', v: score, count: true },
        { k: 'Needed to pass', v: bar + '%' },
        { k: 'Accuracy', v: Math.round(acc * 100), count: true, suffix: '%' },
        { k: 'Best streak', v: 'x' + Math.min(bestStreak, TUNING.MAX_MULTIPLIER) },
        { k: 'Cards sorted', v: total }
      ],
      coins: coins, fullSet: Shop.hasFullSet(),
      misses: reviewRows(),
      hasNext: passed && level.n < LEVELS.length,
      nextLabel: 'NEXT LEVEL',
      againLabel: passed ? 'PLAY AGAIN' : 'TRY AGAIN',
      homeLabel: 'MAP'
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
      /* A duel has no score and no pass mark, so those rows say what they
         are actually showing: the health you finished on, and who you were
         fighting. */
      stats: [
        { k: 'Health left', v: Math.max(0, hpYou) + ' HP' },
        { k: 'Boss', v: foe.name },
        { k: 'Accuracy', v: Math.round(acc * 100), count: true, suffix: '%' },
        { k: 'Best streak', v: 'x' + Math.min(bestStreak, TUNING.MAX_MULTIPLIER) },
        { k: 'Cards sorted', v: total }
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
    sort: resolve,
    boxFor: boxFor,
    canSort: function () { return running && !locked && !paused && !!card; },
    isRunning: function () { return running; },
    currentLevel: function () { return level ? level.n : 1; },
    currentFoe: function () { return foe ? foe.n : 1; },
    isBattle: function () { return mode === 'battle'; },
    isTutorial: function () { return tutorial; },
    stop: function () { running = false; if (timer) clearInterval(timer); },

    /** How far the boss's next swing has wound up, 0..1. The arena draws
        it as a bar filling under them - a telegraph, so a hit you take
        is one you could see coming. */
    foeCharge: function () {
      if (mode !== 'battle' || !running || !foe) return 0;
      var gap = paused ? pausedFoeGap : Date.now() - lastFoeMove;
      return Math.max(0, Math.min(1, gap / foe.speed));
    },

    /* ---- pause ----
       The clock is a wall clock: everything reads Date.now() against
       endsAt. So pausing is remembering how much was left, and resuming
       is setting a fresh endsAt that far into the future. Sorting is
       blocked too, or you could sort cards while paused. */
    pause: function () {
      if (!running || paused) return;
      paused = true;
      pausedMsLeft = endsAt - Date.now();
      pausedFoeGap = Date.now() - lastFoeMove;
    },
    resume: function () {
      if (!paused) return;
      paused = false;
      if (isFinite(pausedMsLeft)) endsAt = Date.now() + pausedMsLeft;
      lastFoeMove = Date.now() - pausedFoeGap;   // the rival lost no ground
    },
    isPaused: function () { return paused; }
  };
})();
