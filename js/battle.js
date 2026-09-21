/* ============================================================
   battle.js  -  1 v 1 against the computer
   ------------------------------------------------------------
   THE SCREEN IS CALLED BOSS. The code is not: a "battle" here is the
   duel MECHANIC - two health bars, one clock, the same cards - and it
   is what game.js switches into with `mode = 'battle'`. Boss is what
   the four of them ARE to a player working up the ladder.

   So every word a player reads says Boss, and every identifier still
   says battle. Renaming the mechanic would have meant touching the
   scoring path in game.js to change nothing anybody can see.
   ------------------------------------------------------------
   A sorting duel, not a separate fighting game. Both of you sort
   the same kind of cards:

     you sort it right  -> you hit them
     you sort it wrong  -> they hit you
     they sort it right -> they hit you

   First health bar to empty loses. If the clock runs out, whoever
   has more health left wins.

   ADDING A RIVAL: copy a line below.
     speed     ms between their sorts (smaller = faster)
     accuracy  how often they get it right (0.85 = 85%)
     sprite    their picture, drawn in js/sprites.js. Leave it out
               and they fall back to the plain stand-in figure.
   ============================================================ */

var BATTLE = {
  SECONDS: 60,
  HP: 100,

  HIT: 12,          // damage when you sort correctly
  HIT_PERFECT: 18,  // ...and you were fast about it
  PERFECT_MS: 1200,
  SELF_HIT: 10,     // damage you take for a wrong sort

  WIN_COINS: 120   // plus a bonus per rival, see coinsFor()
};

var OPPONENTS = [
  {
    n: 1, name: 'Sticky Steve',
    taunt: 'Sorts slowly and gets it wrong a lot.',
    speed: 2600, accuracy: 0.60, damage: 9, sprite: 'steve'
  },
  {
    n: 2, name: 'Clip Carla',
    taunt: 'Quick hands, average judgement.',
    speed: 2000, accuracy: 0.72, damage: 10, sprite: 'carla'
  },
  {
    n: 3, name: 'Inbox Ivan',
    taunt: 'Rarely wrong. Never stops.',
    speed: 1500, accuracy: 0.82, damage: 11, sprite: 'ivan'
  },
  {
    n: 4, name: 'Deadline Dan',
    taunt: 'Faster than you. Almost never wrong.',
    speed: 1100, accuracy: 0.92, damage: 13, sprite: 'dan'
  }
];

var Battle = (function () {

  function coinsFor(opponent) {
    var base = BATTLE.WIN_COINS + (opponent.n - 1) * 60;
    return Math.round(base * (1 + Shop.coinBonus()));   // full-set bonus applies here too
  }

  /** Rivals unlock one at a time, like levels. */
  function isOpen(n) { return n <= Progress.rivalsBeaten() + 1; }

  /* ---------------- the choose-your-fight screen ---------------- */

  function paint() {
    var host = UI.$('battle-list');
    host.innerHTML = '';

    OPPONENTS.forEach(function (foe) {
      var open = isOpen(foe.n);
      var beaten = foe.n <= Progress.rivalsBeaten();

      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'foe-row' + (open ? '' : ' is-locked') + (beaten ? ' is-beaten' : '');
      row.disabled = !open;

      var art = document.createElement('span');
      art.className = 'foe-art';
      Sprites.apply(art, foe.sprite || 'rival');

      var txt = document.createElement('span');
      txt.className = 'foe-txt';
      txt.innerHTML = '<b>' + foe.name + '</b><small>' +
        (open ? foe.taunt : 'Beat ' + OPPONENTS[foe.n - 2].name + ' first') + '</small>' +
        (open ? '<span class="foe-stats">one card every ' + (foe.speed / 1000).toFixed(1) +
                's &middot; ' + Math.round(foe.accuracy * 100) + '% right</span>' : '');

      var badge = document.createElement('span');
      badge.className = 'foe-badge';
      badge.textContent = beaten ? '✓' : (open ? 'Fight' : '🔒');
      if (beaten) badge.classList.add('is-beaten');

      row.appendChild(art);
      row.appendChild(txt);
      row.appendChild(badge);

      if (open) {
        row.addEventListener('click', function () {
          UI.sound.tick();
          Game.startBattle(foe.n);
        });
      }
      host.appendChild(row);
    });

    host.appendChild(onlineRow());
  }

  /* ---------------- online battle (not built yet) ----------------
     Fighting a real person needs a server somewhere on the internet to
     find two players and pass their moves back and forth. The game has
     no server - it is one file that runs on the phone - so this cannot
     honestly work yet.

     So it is shown, clearly marked "Coming soon", and tapping it SAYS
     so. There is deliberately no pretend "searching for players..."
     screen: faking a real opponent with a computer one would be lying
     to whoever is playing. */
  function onlineRow() {
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'foe-row is-online';

    var art = document.createElement('span');
    art.className = 'foe-art';
    Sprites.apply(art, 'globe');

    var txt = document.createElement('span');
    txt.className = 'foe-txt';
    txt.innerHTML = '<b>Online Boss</b>' +
      '<small>Out-sort a real player, anywhere in the world</small>';

    var badge = document.createElement('span');
    badge.className = 'foe-badge is-soon';
    badge.textContent = 'Coming soon';

    row.appendChild(art);
    row.appendChild(txt);
    row.appendChild(badge);

    row.addEventListener('click', function () {
      UI.sound.tick();
      Tips.showInfo({
        icon: 'globe',
        title: 'Online Boss',
        lines: [
          '<b>Coming soon.</b> Two real players, the same cards, the same clock - whoever sorts better wins.',
          'It needs an online server to find you an opponent and pass the moves between phones. That is the next big thing to build.',
          'Until then, the four bosses above are the fight.'
        ]
      });
    });
    return row;
  }

  return {
    paint: paint,
    coinsFor: coinsFor,
    isOpen: isOpen
  };
})();
