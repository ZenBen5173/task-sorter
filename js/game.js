/* ============================================================
   game.js  -  the round: swiping, scoring, grading
   ------------------------------------------------------------
   TEAM: every number worth tuning is in TUNING at the top.
   ============================================================ */

var TUNING = {
  ROUND_SECONDS: 90,

  BASE_POINTS: 100,
  SPEED_WINDOW_MS: 3000,   // sort faster than this for a speed bonus
  SPEED_BONUS_MAX: 100,
  PERFECT_MS: 1200,        // correct AND under this = Perfect
  PERFECT_BONUS: 150,

  MAX_MULTIPLIER: 8,

  /* The pause after a wrong sort. Just long enough for the card to fly
     off and the screen to flash red - it is animation time, not reading
     time. Nothing is printed on screen to read any more; the answers
     are on the end screen under "What you missed". */
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
  var deck = [];           // shuffled, preloaded before the round starts
  var deckAt = 0;
  var pool = [];           // the cards this level is allowed to use
  var calm = false;        // true on a no-clock level (Level 1)
  var goal = 0;            // on a calm level, how many cards ends the round
  var card = null;         // the card currently on screen
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
  var paused = false;      // true while the background picker is open
  var pausedMsLeft = 0;    // clock frozen at this many ms remaining
  var pausedFoeGap = 0;    // how long the rival had been winding up
  var endsAt = 0;
  var timer = null;

  var cardEl = null, arenaEl = null;
  var gear = { fast: 1, block: 0, mult: 1 };   // whatever the shop gear does
  var blocksLeft = 0;      // mistakes your shield can still soak up this round

  /* battle mode reuses the same cards, corners and swipe as a level;
     only the scoring and the way it ends are different. */
  var mode = 'level';        // 'level' or 'battle'
  var foe = null;
  var hpYou = 0, hpFoe = 0;
  var lastFoeMove = 0;

  /* ---------------- setup ---------------- */

  function init() {
    cardEl = UI.$('card');
    arenaEl = UI.$('arena');
    buildCorners();
    bindInput();
  }

  function buildCorners() {
    for (var key in BOXES) {
      var b = BOXES[key];
      var el = UI.$('corner-' + key);
      if (!el) continue;
      var ico = el.querySelector('.corner-ico');
      Sprites.apply(ico, b.sprite);
      el.querySelector('.corner-label').textContent = b.label;
      el.querySelector('.corner-hint').textContent = b.hint;
    }
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /* ---------------- starting a round ---------------- */

  /* ---------------- starting a battle ---------------- */

  function startBattle(foeNumber) {
    mode = 'battle';
    foe = OPPONENTS[(foeNumber || 1) - 1] || OPPONENTS[0];

    gear = Shop.effects();
    blocksLeft = gear.block;

    // every kind of card shows up in a duel, at every difficulty
    pool = CARDS;
    calm = false;
    deck = shuffle(CARDS).concat(shuffle(CARDS)).concat(shuffle(CARDS));
    deckAt = 0;

    score = 0; streak = 0; bestStreak = 0;
    correct = 0; wrong = 0; forgiven = 0; misses = [];
    hpYou = BATTLE.HP; hpFoe = BATTLE.HP;
    running = true; locked = false; paused = false;

    endsAt = Date.now() + BATTLE.SECONDS * 1000;
    lastFoeMove = Date.now();

    UI.$('you-name').textContent = Hero.name();   // your character, by name
    UI.$('foe-name').textContent = foe.name;
    var art = UI.$('foe-art-live');
    Sprites.apply(art, foe.sprite || 'rival');

    UI.$('screen-play').classList.add('is-battle');
    UI.$('screen-play').classList.remove('is-rush');
    UI.$('screen-play').classList.remove('is-calm');
    // a duel uses all four corners, whatever the last level used
    for (var key in BOXES) {
      var cel = UI.$('corner-' + key);
      if (!cel) continue;
      cel.classList.remove('is-off');
      cel.querySelector('.corner-hint').textContent = BOXES[key].hint;
    }
    UI.$('arena').setAttribute('data-missing', 'none');
    paintHealth();
    paintShields();

    UI.showScreen('play');
    nextCard();

    if (timer) clearInterval(timer);
    timer = setInterval(tick, 100);
    tick();
  }

  function paintHealth() {
    UI.$('hp-you').style.width = Math.max(0, hpYou / BATTLE.HP * 100) + '%';
    UI.$('hp-foe').style.width = Math.max(0, hpFoe / BATTLE.HP * 100) + '%';
    UI.$('hp-you').classList.toggle('is-low', hpYou <= 30);
    UI.$('hp-foe').classList.toggle('is-low', hpFoe <= 30);
  }

  /** Hurts someone and flashes the screen so you feel it. */
  function damage(who, amount) {
    if (who === 'foe') {
      hpFoe = Math.max(0, hpFoe - amount);
      UI.$('screen-play').classList.add('is-hit-foe');
      setTimeout(function () { UI.$('screen-play').classList.remove('is-hit-foe'); }, 240);
    } else {
      hpYou = Math.max(0, hpYou - amount);
      UI.$('screen-play').classList.add('is-hit-you');
      setTimeout(function () { UI.$('screen-play').classList.remove('is-hit-you'); }, 240);
    }
    paintHealth();
  }

  function start(levelNumber) {
    mode = 'level';
    UI.$('screen-play').classList.remove('is-battle');
    level = LEVELS[(levelNumber || 1) - 1] || LEVELS[0];

    // whatever you bought in the shop applies for this whole round
    gear = Shop.effects();
    blocksLeft = gear.block;

    /* A level only draws from the cards it is allowed:
         theme  - which place you are in (house, school, phone, out)
         boxes  - which corners exist yet (Level 1 has no Give Away)
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

    /* A calm level has no clock and nothing landing on its own. It ends
       when you have sorted `goal` cards, at whatever pace you like. */
    calm = !level.seconds;
    goal = level.goal || 20;

    score = 0; streak = 0; bestStreak = 0;
    correct = 0; wrong = 0; forgiven = 0; misses = [];
    running = true; locked = false; paused = false;

    /* Your pet shortens the clock. That is the price of the extra coins it
       pays: less time means fewer cards, so a smaller score. A calm level
       has no clock, so a pet costs you nothing there. */
    var seconds = Math.round(level.seconds / (gear.fast || 1));
    endsAt = calm ? Infinity : Date.now() + seconds * 1000;

    UI.$('play-level').textContent = 'Level ' + level.n;
    UI.$('play-target').textContent = Math.round(level.minAcc * 100) + '% right';
    UI.setScore(0);
    paintStreak();
    paintShields();
    UI.$('screen-play').classList.remove('is-rush');

    /* The clock corner becomes a card counter when there is no clock,
       so the player still knows how far through the round they are. */
    UI.$('screen-play').classList.toggle('is-calm', calm);
    UI.$('clock-k').textContent = calm ? 'Card' : 'Time';
    if (calm) paintProgress(); else UI.$("clock").textContent = seconds;

    /* Take any corner this level does not use completely off the screen,
       and let the one beside it grow into the space.

       Greying it out was worse than useless: a dead box you can still
       aim at, with an apology written under it, is clutter in the middle
       of a game about not being distracted. If a corner has nothing to
       do this level, it should not be there at all. Level 1 shows three
       boxes, and Drop takes the whole bottom row. */
    for (var key in BOXES) {
      var el = UI.$('corner-' + key);
      if (!el) continue;
      var off = level.boxes.indexOf(key) === -1;
      el.classList.toggle('is-off', off);
      el.querySelector('.corner-hint').textContent = BOXES[key].hint;
    }
    /* Marks which corner is missing, so the CSS knows who to widen. */
    UI.$('arena').setAttribute('data-missing',
      ['now', 'later', 'give', 'drop'].filter(function (k) {
        return level.boxes.indexOf(k) === -1;
      }).join(' ') || 'none');

    UI.showScreen('play');
    nextCard();

    if (timer) clearInterval(timer);
    // A wall-clock interval, not requestAnimationFrame: rAF stops dead when
    // the phone screen locks or the player switches apps, which would freeze
    // the round instead of ending it. Everything below reads Date.now(), so
    // the clock stays honest either way.
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
       their own. Nothing in the rest of this function applies, and the
       round ends from resolve() once the card goal is reached. */
    if (calm) return;

    if (msLeft <= 0) { finish('time'); return; }

    // clock
    var secs = Math.ceil(msLeft / 1000);
    UI.$('clock').textContent = secs;

    // final rush
    UI.$('screen-play').classList.toggle('is-rush', secs <= rushWindow());
  }

  /** The duel clock: the rival keeps sorting whether you do or not. */
  function battleTick(now, msLeft) {
    UI.$('fight-clock').textContent = Math.max(0, Math.ceil(msLeft / 1000));

    if (hpYou <= 0) { finish('lost'); return; }
    if (hpFoe <= 0) { finish('won'); return; }
    if (msLeft <= 0) { finish(hpYou >= hpFoe ? 'won' : 'lost'); return; }

    // the rival takes a swing on their own clock
    if (now - lastFoeMove >= foe.speed) {
      lastFoeMove = now;
      if (Math.random() < foe.accuracy) {
        damage('you', foe.damage);
        showFlash(foe.name + ' sorted one!', 'bad');
      } else {
        showFlash(foe.name + ' fumbled it.');
      }
    }
  }

  /** How many seconds of final rush this level gets. A level with no
      clock has no "final" anything, so it gets none. */
  function rushWindow() {
    if (calm) return 0;
    return Math.min(TUNING.RUSH_SECONDS, Math.round(level.seconds * TUNING.RUSH_SHARE));
  }

  /* ---------------- the end-screen review ---------------- */

  /** Lists every card you got wrong, what you said, what it really was,
      and why. In a round the reason flashes past in under two seconds;
      here you can sit and read it. This is the part of the game that
      actually teaches, so it gets the room it needs.

      The same card missed twice is one row with a "x2" on it, so five
      mistakes on one stubborn card do not push everything else off. */
  /** `passed` decides how much of each answer is given away.

      PASS and you get everything: the right corner and the reason.
      FAIL and you get the reason ONLY - the right corner is held back.

      Being handed the answer the moment you fail teaches nothing; you
      read it, nod, and forget it. Held back, the reason is a clue and
      the retry is where the thinking happens. You have to work it out,
      which is the entire point of the game. */
  function paintReview(passed) {
    var host = UI.$('review');
    var list = UI.$('review-list');
    list.innerHTML = '';

    if (!misses.length) {
      host.hidden = true;
      return;
    }
    host.hidden = false;

    // roll up repeats of the same card, keeping the order they happened in
    var rows = [];
    var seen = {};
    misses.forEach(function (m) {
      var key = m.card.text;
      if (seen[key]) { seen[key].times++; return; }
      seen[key] = { card: m.card, chose: m.chose, times: 1 };
      rows.push(seen[key]);
    });

    UI.$('review-head').textContent = rows.length === 1
      ? 'The one you missed'
      : 'What you missed (' + rows.length + ')';

    /* Say the answers are being held back, and why. A missing answer
       with no explanation just looks like the screen is broken. */
    var note = UI.$('review-note');
    note.hidden = passed;
    note.textContent = 'Answers hidden until you pass. Read the reasons, '
      + 'work out the corner yourself, and go again.';

    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'review-row';

      var task = document.createElement('p');
      task.className = 'review-task';
      task.textContent = r.card.text;
      if (r.times > 1) {
        var again = document.createElement('span');
        again.className = 'review-times';
        again.textContent = 'x' + r.times;
        task.appendChild(again);
      }

      /* Your own answer always shows - you already know what you picked,
         and seeing it written down is half of noticing the mistake. The
         RIGHT one only appears once you have passed. */
      var answers = document.createElement('p');
      answers.className = 'review-answers';

      var mine = document.createElement('span');
      mine.className = 'review-chip is-wrong';
      mine.textContent = 'You said ' + BOXES[r.chose].label;
      answers.appendChild(mine);

      if (passed) {
        var real = document.createElement('span');
        real.className = 'review-chip is-right box-' + r.card.box;
        real.textContent = BOXES[r.card.box].label;
        answers.appendChild(real);
      } else {
        var hidden = document.createElement('span');
        hidden.className = 'review-chip is-hidden';
        hidden.textContent = 'so what was it?';
        answers.appendChild(hidden);
      }

      var why = document.createElement('p');
      why.className = 'review-why';
      why.textContent = r.card.why;

      li.appendChild(task);
      li.appendChild(answers);
      li.appendChild(why);
      list.appendChild(li);
    });
  }

  /** Every card you actually dealt with this round: the ones you got
      right, the ones you got wrong, and the ones your shield covered. */
  function sorted() {
    return correct + wrong + forgiven;
  }

  /** On a calm level the clock corner counts cards instead: "3 / 20". */
  function paintProgress() {
    UI.$('clock').textContent = Math.min(sorted() + 1, goal) + ' / ' + goal;
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

    cardEl.querySelector('.card-text').textContent = card.text;
    cardEl.classList.remove('is-gone');
    cardEl.style.transition = 'none';
    cardEl.style.transform = 'translate(-50%, -50%)';
    void cardEl.offsetWidth;
    cardEl.style.transition = '';
    cardEl.classList.add('is-in');
    setTimeout(function () { cardEl.classList.remove('is-in'); }, 200);
  }

  /* ---------------- input ---------------- */

  var dragging = false, startX = 0, startY = 0, dx = 0, dy = 0;

  function bindInput() {
    cardEl.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // keyboard, for testing on a laptop
    window.addEventListener('keydown', function (e) {
      if (!running || locked || paused) return;
      /* Q W A S sit in the same square as the four corners on screen, so
         they go through the same redirect a swipe does: on Level 1 the
         Give Away key lands on Drop, because that is the box actually
         filling the bottom-left of the screen. */
      var map = { q: [-1, -1], w: [1, -1], a: [-1, 1], s: [1, 1] };
      var dir = map[e.key.toLowerCase()];
      if (dir) resolve(boxFor(dir[0], dir[1]));
    });
  }

  function onDown(e) {
    if (!running || locked || paused) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    dx = 0; dy = 0;
    cardEl.style.transition = 'none';
    cardEl.classList.add('is-held');
  }

  function onMove(e) {
    if (!dragging) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    // follows your thumb and leans into the swipe
    cardEl.style.transform =
      'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + (dx * 0.05) + 'deg)';
    hintCorner(dx, dy);
    if (e.cancelable) e.preventDefault();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    cardEl.style.transition = '';
    cardEl.classList.remove('is-held');
    clearHints();

    if (Math.sqrt(dx * dx + dy * dy) < TUNING.SWIPE_MIN_PX) {
      cardEl.style.transform = 'translate(-50%, -50%)';   // snap back
      return;
    }
    resolve(boxFor(dx, dy));
  }

  /** Any direction maps to a corner, so a sloppy swipe still counts. */
  /** Which corner a swipe is aimed at. Any direction lands somewhere, so
      a sloppy flick still counts.

      On a level that does not use all four, the missing corner is taken
      off the screen and its neighbour grows to fill the space - so a
      swipe into that empty half has to land on whatever is actually
      sitting there now. Level 1 has no Give Away, Drop spans the whole
      bottom, and a swipe down-left is a Drop. */
  function boxFor(x, y) {
    var box;
    if (x < 0 && y < 0) box = 'now';
    else if (x >= 0 && y < 0) box = 'later';
    else if (x < 0 && y >= 0) box = 'give';
    else box = 'drop';

    if (mode === 'level' && level && level.boxes.indexOf(box) === -1) {
      box = (box === 'give') ? 'drop'   // bottom row: Drop took the space
          : (box === 'drop') ? 'give'
          : (box === 'now')  ? 'later'  // top row: the other one took it
          : 'now';
    }
    return box;
  }

  function hintCorner(x, y) {
    if (Math.sqrt(x * x + y * y) < TUNING.SWIPE_MIN_PX) { clearHints(); return; }
    clearHints();
    var el = UI.$('corner-' + boxFor(x, y));
    if (el) el.classList.add('is-aimed');
  }

  function clearHints() {
    var all = document.querySelectorAll('.corner');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('is-aimed');
  }

  /* ---------------- scoring ---------------- */

  function resolve(box) {
    if (!running || locked || paused || !card) return;

    var took = Date.now() - cardShownAt;
    var right = (box === card.box);
    var cornerEl = UI.$('corner-' + box);
    var rect = cornerEl.getBoundingClientRect();

    if (mode === 'battle') { battleResolve(box, right, took, cornerEl, rect); return; }


    if (right) {
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;

      var mult = Math.min(streak, TUNING.MAX_MULTIPLIER);
      var speed = Math.max(0, Math.round(
        (1 - Math.min(took, TUNING.SPEED_WINDOW_MS) / TUNING.SPEED_WINDOW_MS) * TUNING.SPEED_BONUS_MAX));
      var perfect = took <= TUNING.PERFECT_MS;

      var gained = (TUNING.BASE_POINTS + speed + (perfect ? TUNING.PERFECT_BONUS : 0)) * mult;
      if (isRush()) gained *= TUNING.RUSH_MULTIPLIER;
      gained = Math.round(gained * gear.mult);   // weapon bonus

      score += gained;
      UI.setScore(score);

      flyTo(box, true);
      cornerEl.classList.add('is-hit');
      setTimeout(function () { cornerEl.classList.remove('is-hit'); }, 260);

      UI.floatText('+' + gained, rect.left + rect.width / 2, rect.top + rect.height / 2,
                   perfect ? 'perfect' : 'good');
      if (perfect) {
        UI.sound.perfect();
        showFlash('Perfect!');
      } else {
        UI.sound.good(streak);
      }

      paintStreak();
      if (goalReached()) { finish('goal'); return; }
      if (calm) paintProgress();
      nextCard();

    } else {
      /* Keep the card so the end screen can show it again. The flash below
         is gone in under two seconds, which is not long enough to read and
         think about - so the real teaching happens on the summary. */
      misses.push({ card: card, chose: box });

      /* A shield fully forgives the mistake: the streak survives AND it
         does not count against your accuracy. Accuracy is the only thing
         that decides whether you pass now, so forgiving it is the whole
         point of buying armour. It still shows up in the review at the
         end, because being let off is not the same as being right. */
      var blocked = blocksLeft > 0;
      if (blocked) { blocksLeft--; forgiven++; }
      else { wrong++; streak = 0; }

      paintStreak();
      paintShields();

      /* No banner, and no pause to read one. You get the sound, the red
         screen and the card flying the wrong way - enough to know you
         missed it - and the round carries straight on.

         The answer and the reason wait for the end screen instead. A
         banner mid-round is unreadable at speed and it buries the card
         you are supposed to be looking at, so it was teaching nobody
         while costing everybody a beat. The only delay left is the
         length of the card animation. */
      hideFlash();
      UI.sound.bad();
      flyTo(box, false);
      cardEl.classList.add('is-wrong');
      UI.$('screen-play').classList.add('is-bad');

      locked = true;
      setTimeout(function () {
        cardEl.classList.remove('is-wrong');
        UI.$('screen-play').classList.remove('is-bad');
        locked = false;
        if (!running) return;
        if (goalReached()) { finish('goal'); return; }
        if (calm) paintProgress();
        nextCard();
      }, TUNING.WRONG_STUN_MS);
    }
  }

  /** In a duel a correct sort is a punch, a wrong one is a punch taken. */
  function battleResolve(box, right, took, cornerEl, rect) {
    if (right) {
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;

      var perfect = took <= BATTLE.PERFECT_MS;
      var hit = Math.round((perfect ? BATTLE.HIT_PERFECT : BATTLE.HIT) * gear.mult);

      damage('foe', hit);
      flyTo(box, true);
      cornerEl.classList.add('is-hit');
      setTimeout(function () { cornerEl.classList.remove('is-hit'); }, 260);

      UI.floatText('-' + hit, rect.left + rect.width / 2, rect.top + rect.height / 2,
                   perfect ? 'perfect' : 'good');
      if (perfect) { UI.sound.perfect(); showFlash('Perfect hit!'); }
      else UI.sound.good(streak);

      paintStreak();
      if (hpFoe <= 0) { finish('won'); return; }
      nextCard();

    } else {
      wrong++;

      // a duel teaches the same lesson, so it gets the same review
      misses.push({ card: card, chose: box });

      // in a duel the shield takes the hit for you as well
      var blocked = blocksLeft > 0;
      if (blocked) blocksLeft--;
      else streak = 0;

      paintStreak();
      paintShields();

      // same as a level: no banner, the review at the end does the teaching
      if (!blocked) damage('you', BATTLE.SELF_HIT);
      hideFlash();
      UI.sound.bad();
      flyTo(box, false);
      cardEl.classList.add('is-wrong');

      locked = true;
      setTimeout(function () {
        cardEl.classList.remove('is-wrong');
        locked = false;
        if (hpYou <= 0) { finish('lost'); return; }
        if (running) nextCard();
      }, TUNING.WRONG_STUN_MS);
    }
  }

  function isRush() {
    return (endsAt - Date.now()) / 1000 <= rushWindow();
  }

  /** Throws the card at the corner it was sorted into. */
  function flyTo(box, right) {
    var corner = UI.$('corner-' + box).getBoundingClientRect();
    var cardRect = cardEl.getBoundingClientRect();
    var tx = (corner.left + corner.width / 2) - (cardRect.left + cardRect.width / 2);
    var ty = (corner.top + corner.height / 2) - (cardRect.top + cardRect.height / 2);

    cardEl.classList.add('is-gone');
    cardEl.style.transform =
      'translate(calc(-50% + ' + tx + 'px), calc(-50% + ' + ty + 'px)) scale(.2) rotate(' +
      (right ? 20 : -20) + 'deg)';
  }

  /* ---------------- meters ---------------- */

  function paintStreak() {
    var mult = Math.min(Math.max(streak, 1), TUNING.MAX_MULTIPLIER);
    var el = UI.$('streak');
    el.textContent = 'x' + mult;
    el.classList.toggle('is-hot', streak >= 3);
    el.classList.remove('punch');
    void el.offsetWidth;
    if (streak > 0) el.classList.add('punch');
  }

  /** Little shield pips in the HUD, so you can see what is left to soak
      up a mistake. Hidden entirely when you have no shield. */
  function paintShields() {
    var host = UI.$('shield-pips');
    if (!host) return;
    host.innerHTML = '';
    host.hidden = gear.block === 0;
    for (var i = 0; i < gear.block; i++) {
      var pip = document.createElement('span');
      pip.className = 'pip' + (i < blocksLeft ? '' : ' is-spent');
      host.appendChild(pip);
    }
  }

  var flashTimer = null;

  function showFlash(text, kind) {
    var el = UI.$('flash');
    el.textContent = text;
    el.className = 'flash is-on' + (kind ? ' is-' + kind : '');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.className = 'flash'; }, 1100);
  }

  /** Wipes the banner immediately. "Perfect!" hangs around for just over
      a second, which is longer than it takes to get the next card wrong -
      so without this you miss one and the word Perfect is still sitting
      on the screen congratulating you. */
  function hideFlash() {
    clearTimeout(flashTimer);
    UI.$('flash').className = 'flash';
  }

  /* ---------------- end of round ---------------- */

  function finish(reason) {
    running = false;
    if (timer) clearInterval(timer);

    if (mode === 'battle') { battleFinish(reason); return; }

    var total = sorted();
    var acc = total ? (correct + forgiven) / total : 0;
    var grade = gradeFor(acc, bestStreak);
    /* Passing tests the skill, not the scoreboard. Score swings wildly
       (a x8 streak with Perfect bonuses is worth ten times a careless
       sort), so any score target is either trivial or impossible.
       Getting them right is the whole lesson, so it is the whole test. */
    var passed = acc >= level.minAcc;

    if (passed) UI.sound.perfect(); else UI.sound.over();
    Progress.record(level.n, passed, grade, score);

    var coins = Shop.coinsFor(score, grade);
    Progress.addCoins(coins);
    UI.$("end-coins").textContent = "+" + coins + (Shop.hasFullSet() ? " (full set)" : "");
    Shop.paintCoins();

    UI.$('end-title').textContent = passed
      ? 'Level ' + level.n + ' complete!'
      : 'Not quite';

    UI.$('end-sub').textContent = passed
      ? level.name
      : 'You needed ' + Math.round(level.minAcc * 100) + '% right. Have another go.';

    UI.$('grade').textContent = grade;
    UI.$('grade').className = 'grade grade-' + grade + (passed ? '' : ' is-dim');
    UI.$('end-score-k').textContent = 'Score';
    UI.$('end-target-k').textContent = 'Needed to pass';
    UI.$('end-score').textContent = score.toLocaleString();
    UI.$('end-target').textContent = Math.round(level.minAcc * 100) + '%';
    UI.$('end-acc').textContent = Math.round(acc * 100) + '%';
    UI.$('end-streak').textContent = 'x' + Math.min(bestStreak, TUNING.MAX_MULTIPLIER);
    UI.$('end-sorted').textContent = total;

    // "Next level" only appears if you passed and there is one
    var hasNext = passed && level.n < LEVELS.length;
    UI.$("btn-next").hidden = !hasNext;
    UI.$("btn-next").textContent = "Next level";
    UI.$('btn-again').textContent = passed ? 'Play again' : 'Try again';
    /* It used to say "Dashboard", which is not the name of anything in
       this game. Say where it goes. */
    UI.$('btn-home').textContent = 'Back to the map';

    /* Spell out what just happened to the map. Without this, a player who
       finishes a round but misses the accuracy bar has no idea why the next
       level is still locked. */
    var unlock = UI.$('end-unlock');
    var nextLv = LEVELS[level.n];        // the one after this
    var who = nextLv ? ('Level ' + nextLv.n + ' stays locked. ') : '';

    if (passed && nextLv) {
      unlock.textContent = 'Level ' + nextLv.n + ' unlocked - ' + nextLv.name;
      unlock.className = 'end-unlock is-good';
    } else if (passed) {
      unlock.textContent = 'You finished the whole trail!';
      unlock.className = 'end-unlock is-good';
    } else {
      unlock.textContent = who + 'Get ' + Math.round(level.minAcc * 100) + '% right to open it.';
      unlock.className = 'end-unlock is-bad';
    }

    paintReview(passed);
    UI.showScreen('end');
  }

  function currentLevel() { return level ? level.n : 1; }

  function battleFinish(reason) {
    var won = (reason === 'won');
    UI.$('screen-play').classList.remove('is-battle');

    var total = sorted();
    var acc = total ? (correct + forgiven) / total : 0;
    var grade = gradeFor(acc, bestStreak);

    // losing still pays a little, so a hard rival is not a total waste
    var coins = won ? Battle.coinsFor(foe) : Math.round(Battle.coinsFor(foe) * 0.2);
    Progress.addCoins(coins);
    if (won) Progress.beatRival(foe.n);
    Shop.paintCoins();

    if (won) UI.sound.perfect(); else UI.sound.over();

    UI.$('end-title').textContent = won ? 'You win!' : 'Knocked out';
    UI.$('end-sub').textContent = won
      ? 'You out-sorted ' + foe.name + '.'
      : foe.name + ' buried you in paperwork.';

    UI.$('grade').textContent = grade;
    UI.$('grade').className = 'grade grade-' + grade + (won ? '' : ' is-dim');

    var nextFoe = OPPONENTS[foe.n];
    var unlock = UI.$('end-unlock');
    if (won && nextFoe) {
      unlock.textContent = nextFoe.name + ' unlocked';
      unlock.className = 'end-unlock is-good';
    } else if (won) {
      unlock.textContent = 'You beat every rival!';
      unlock.className = 'end-unlock is-good';
    } else {
      unlock.textContent = 'Your health ran out. Sort faster, and stop missing.';
      unlock.className = 'end-unlock is-bad';
    }

    /* A duel has no score and no pass mark, so those two rows say what
       they are actually showing: the health you finished on, and who
       you were fighting. */
    UI.$('end-score-k').textContent = 'Health left';
    UI.$('end-target-k').textContent = 'Rival';
    UI.$('end-score').textContent = Math.max(0, hpYou) + ' HP';
    UI.$('end-target').textContent = foe.name;
    UI.$('end-acc').textContent = Math.round(acc * 100) + '%';
    UI.$('end-streak').textContent = 'x' + Math.min(bestStreak, TUNING.MAX_MULTIPLIER);
    UI.$('end-sorted').textContent = total;
    UI.$("end-coins").textContent = "+" + coins + (Shop.hasFullSet() ? " (full set)" : "");

    UI.$("btn-next").hidden = !(won && nextFoe);
    UI.$('btn-next').textContent = 'Next rival';
    UI.$('btn-again').textContent = won ? 'Fight again' : 'Try again';
    UI.$('btn-home').textContent = 'Back to the rivals';

    paintReview(won);
    UI.showScreen('end');
  }

  /** Grade comes from accuracy and streak, never from how many you sorted. */
  function gradeFor(acc, best) {
    if (acc >= 0.95 && best >= 12) return 'S';
    if (acc >= 0.85) return 'A';
    if (acc >= 0.70) return 'B';
    return 'C';
  }

  return {
    init: init,
    start: start,
    startBattle: startBattle,
    currentLevel: currentLevel,
    currentFoe: function () { return foe ? foe.n : 1; },
    isBattle: function () { return mode === "battle"; },
    stop: function () { running = false; if (timer) clearInterval(timer); },

    /* ---- pause, for the background picker ----
       The clock is a wall clock: everything reads Date.now() against
       endsAt. So pausing is just remembering how much was left, and
       resuming is setting a fresh endsAt that far into the future.
       Swiping is blocked too, or you could sort cards while paused. */
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
