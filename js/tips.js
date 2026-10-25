/* ============================================================
   tips.js  -  the first-time notes
   ------------------------------------------------------------
   The first time a player reaches each place, their character pops up
   at the bottom of the screen and says what it is for (js/panels.js
   draws it). Dismiss it and it never comes back for that place.

   EDITING A TIP: change the words below. Keep each one to three short
   lines - it is a sign on the door, not a manual. The Guide Book is the
   manual, and the very first round teaches the corners by doing.

   ADDING A TIP FOR A NEW PLACE: add an entry here and call
   Panels.coachOnce('<its name>') from that scene's enter().

   "Reset all progress" in Settings brings every tip back.
   ============================================================ */

var TIPS = {

  home: {
    title: 'This is you',
    lines: [
      '<b>PLAY</b> takes you to the map. <b>BOSS</b> is a one-on-one fight.',
      '<b>DAILY</b> is a new round every day. <b>MY LIST</b> is your real week.',
      'Gear you buy shows <b>on you</b>. The <b>target</b> holds your missions.'
    ]
  },

  levels: {
    title: 'The map',
    lines: [
      'Each circle is a <b>place in your day</b> - home, school, your phone, out in town.',
      '<b>Tap a circle</b> to walk there. Pass a level to open the next one.',
      'Your best grade and stars stay on the circle.'
    ]
  },

  gear: {
    title: 'Your gear',
    lines: [
      '<b>Tap anything you own to wear it.</b> Tap a price to buy it and put it on.',
      '<b>Weapon</b> - more points. <b>Armour</b> - covers mistakes. <b>Pet</b> - more coins, but a faster clock.',
      'Wear all three at once for <b>+25% coins</b>.'
    ]
  },

  battle: {
    title: 'Bosses',
    lines: [
      'A boss sorts the same cards you do, on their own clock.',
      '<b>Sort right and you hit them.</b> Sort wrong and they hit you.',
      'Watch the bar under them - <b>when it fills, they swing.</b>'
    ]
  }
};
