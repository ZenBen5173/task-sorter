# Task Sorter

A fast sorting game built on the **Eisenhower Matrix**. Task cards fly in, you
swipe each one into one of four corners, and only accuracy decides whether
you pass.

Sort right and fast, keep your streak alive, get an S.

Four levels wind up a trail - the **Day to Day** pack. Each level is a
**place in your life**, and only that place's tasks turn up there, and each
one brings **one new twist**. Four bosses each have a trick of their own. A
**Daily Challenge** deals the same round to everybody each day, **missions**
and **badges** give you something to come back for, and **My List** turns
the four corners on your own real week.

---

## Playing it

**In a browser:** <https://task-sorter-one.vercel.app>

Note the `-one`. Plain `task-sorter.vercel.app` is a different project by
somebody else and is not this game.

**On an Android phone:** build the APK, or take it from the Build APK workflow
in the Actions tab. See `android/README.md`.

---

## Running it locally

**On the PC:** double-click `index.html`.

**On a phone** (same Wi-Fi):

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

It prints a `http://192.168.x.x:8080` address. Open that on the phone.

On a laptop you can also play with the keyboard: **Q W A S** for the four
corners, **Escape** to pause or go back, **Enter** to go on.

The **pause** button in the top-left of a round stops the clock and offers
Resume, Restart and Quit. Nothing is recorded when you quit: no grade, no
coins, no failed attempt.

Add **`?fps`** to the address - `http://192.168.x.x:8080/?fps` - and a strip
in the bottom corner shows the frame rate and how many milliseconds the game's
own code spends on each frame. That is the number to check on a real phone.

---

## The four corners

| Corner | Box | Means |
|---|---|---|
| Top-left | **Do Now** | important **and** due soon |
| Top-right | **Do Later** | important, not due yet |
| Bottom-left | **Give Away** | urgent, but not yours to do |
| Bottom-right | **Drop** | neither important nor urgent |

Three ways to sort, for three kinds of player:

- **Drag** the card into a corner. It rides a spring a hair behind your thumb
  and leans into the drag, and the tray you are heading for swells and lights
  up while the other three dim - you can see where it will land before you
  let go.
- **Flick** it. A quick throw that never travels the full distance still
  sorts, in the direction you threw it.
- **Tap a tray.** The card flies there.

Any direction maps to a corner, so a sloppy flick still counts. A drag shorter
than `SWIPE_MIN_PX` that is not a flick snaps back instead of sorting, so a
stray touch costs you nothing.

### When you miss

The tray the card belonged in lights up with a moving dashed edge for a
moment **while you keep playing**. No words: the glow says where it went. The
round does not stop for it: the stun after a miss is still only the bounce.

The end-screen review lists every miss with its reason. The right corner is
there too, **under a tap** - try to work it out from the reason first, then
tap to check.

---

## Special cards and twists

**Every level adds one thing and keeps the ones before it.** A clock and harder
cards make a level harder; they do not make it different. So:

| Level | Twist | What it is |
|---|---|---|
| 1 House | **Golden cards** | Gold paper, triple points, +5 coins. The only new thing is good |
| 2 School | **Frozen cards** | Iced over. Tap the card to crack it (twice), then sort it |
| 3 Phone | **Burning cards** | A fuse runs along the top. Sort it before the spark reaches the end, or it chars and counts as a miss |
| 4 Town | **Trays swap** | Every 18 seconds two trays slide into each other's corners. Every swipe follows them |

Nothing announces a twist - the card looks different and you find out. How
often each card turns up is `specials` in
`js/levels.js`; the fixed numbers (triple, five coins, two taps, 3.4 seconds of
fuse) are in `TUNING` in `js/game.js`.

**Your gear works on them too.** A Longsword or better breaks ice in one tap. A
pet makes golden cards a little more likely (its coin bonus x 0.15). A shield
covers a card that burns out, because a burnt card is a wrong answer.

A special card says what it is by how it looks - gold paper, ice, a fuse -
never in words.

---

## Daily Challenge

**One round a day, the same for everybody.** The deck, which cards are special,
and which trays swap are drawn from random numbers seeded with today's date
(`js/daily.js`, `startDaily` in `js/game.js`). Three separate streams, so the
Nth card of the day is the same card with the same special for everybody,
however fast they got there. Two friends on two phones get exactly the same
round - the one place where comparing scores is fair.

- 75 seconds, every kind of card, every twist.
- Opens once **Level 1 is passed**, so a first-time player meets the corners on
  the gentle level.
- **Streak:** play on consecutive days and it climbs; miss one and it starts
  again. The first finish each day pays **40 coins + 15 per streak day**, capped
  at a week. Replays can beat your best but do not pay the bonus again.
- The DAILY door on the home screen goes gold with a **!** when today's round
  is waiting.

---

## Missions and badges

`js/missions.js`. **Three missions are always on the go** - "Get 8 Perfects in
one round", "Crack 3 frozen cards", "Sort 6 Do Later cards right". Finish one
and its coins pay out with that round, flying into the wallet with the rest, and
a new one takes its place. They get harder after every four you finish. Some
count over many rounds, some want it done in one.

There is a mission for **Do Later** on purpose: it is the corner the game argues
changes your life, and the one people skip.

**Sixteen badges** are for keeps: every level passed, an S on all four, every
boss beaten, a seven-day streak, sorting your own list. Each is also an
achievement id for HUAWEI Game Service (below).

Both live behind the **target** button next to the cog on the home screen, with
a red dot when something has finished since you last looked. On the results
screen, a finished mission or a new badge gets a card of its own that stamps in
before the buttons.

---

## My List

**The game pointed at real life.** Open MY LIST on the home screen, type in what
is actually on your plate - "Science project due Friday", "Reply to grandma" -
and press **Sort my list**. It plays like a round of your own cards: same four
trays, same drag, no clock, **no score and no wrong answers**, because only you
know whether your project is a Do Now.

What you get is a **plan in four piles**, kept on the sheet, with a tick box on every task.
Sort the week again whenever it changes. It is saved on the phone like the rest
of your progress (`myTasks`), and never leaves it unless you made an account.

---

## Easier to play

Settings has two switches:

- **Bigger text** - larger words on the cards, the trays and every sheet.
- **Calm screen** - no screen shake, no freeze-frames, no punch-zoom, softer
  red flashes. The phone's own "reduce motion" setting does the same.

The trays also carry a **pattern** each - stripes, dots, chevrons, lines - so
they differ in more than colour, for anyone who cannot tell the red from the
orange.

---

## What is in the box

**The rules** - what is true, regardless of what is on screen:

| File | What it does |
|---|---|
| `js/cards.js` | **The task cards.** This is the file you will edit most |
| `js/levels.js` | **The levels**, the ranks, and your saved progress |
| `js/game.js` | **The rules of a round:** scoring, the clock, grading, unlocks |
| `js/shop.js` | **The shop:** pets, armour, weapons and coin rewards |
| `js/battle.js` | **The bosses** you duel, their tricks and what they say |
| `js/daily.js` | **The Daily Challenge**: today's seed, the streak, the bonus |
| `js/missions.js` | **Missions** (three at a time) and **badges** (for keeps) |
| `js/mylist.js` | **My List**: your own tasks, and the plan they become |
| `js/services.js` | Where **HUAWEI Game Service** plugs in (achievements, leaderboards) |
| `js/hero.js` | Your character's name, and the readout of what your gear does |

**The engine** - how it is drawn, on one canvas (see *Why it is drawn now*):

| File | What it does |
|---|---|
| `js/gfx.js` | Easing, tweens, springs, particles, sprites, text, the panel look, baking |
| `js/stage.js` | The canvas, the loop, scenes, transitions, hit-stop, shake, buttons |
| `js/world.js` | **The four desk surfaces** you play on, and the shelf |
| `js/desk.js` | **The props:** the four tray objects, the index card, the timer, notes |
| `js/actors.js` | Your character, your pets and the bosses, with bodies that react |
| `js/sfx.js` | **Every sound effect**, synthesised, and the haptics |
| `js/music.js` | **The soundtrack**, played rather than loaded |

**The screens:**

| File | What it does |
|---|---|
| `js/arena.js` | **The round itself** - the trays, the card, the fight |
| `js/scenes.js` | Title, home, the map, the boss stage, the VS face-off, the gear stage |
| `js/results.js` | The end of a round, as a sequence |
| `js/panels.js` | The HTML sheets: the shop, settings, the Guide Book, the review, back |
| `index.html` | The canvas, and the handful of sheets HTML is better at |
| `css/game.css` | Those sheets, and the fonts |

**Data and art:**

| File | What it does |
|---|---|
| `js/doodle.js` | **The characters.** Hero, gear, bosses and pets as shapes, inked once into canvases |
| `js/sprites.js` | **The pixel icons.** Small grids for the tab and badge icons |
| `js/pets.js` | **The pet collection:** the thirteen sheets, and how they are played |
| `js/themes.js` | **The backgrounds** you can pick |
| `js/cloud.js` | **Accounts** and saving your progress online |
| `js/ui.js` | The one audio context, and the sound switch |
| `js/main.js` | Boots the game, and wires the settings sheet |
| `android/` | **The Android app.** One WebView around this same game |
| `serve.ps1` | Local server for phone testing |

No frameworks and no build step. Sounds are generated in code, so there are no
audio files at all. The only network calls the game ever makes are the account
ones in `js/cloud.js`, and the game plays exactly the same with every one of
them failing.

---

## Why it is drawn now

**It used to be a website.** Eight HTML pages swapped with `display: none`, a
tab bar along the bottom, every card and corner a `<div>` moved by a CSS
transition. It was well made, and it felt like what it was: an app with a game
on one of its pages. A transition knows where a thing starts and where it ends
and nothing about the middle - it cannot follow a thumb with weight, bounce a
card off the wrong corner, or freeze the screen for three frames when you land
a Perfect.

So the whole game is drawn on **one canvas, sixty times a second**. The rules
did not move: `js/game.js` still decides what a card is worth, when a round
ends, what a shield forgives and whether you passed, exactly as before. What
changed is everything you see and feel while those rules run.

**No engine, on purpose.** This repository has no package.json and no build
step - plain `<script>` tags, which is also what lets the same files run offline
inside the Android app. A game with one card and four corners needs a loop, a
tween, a spring and a particle emitter, not Phaser. `js/gfx.js` and
`js/stage.js` are those, written for this game, in the same ES5 as the rest of
it, because the APK's floor is Android 7.

**What is on the canvas and what is not.** The world, your character, the
round, the map, the bosses, the results - all drawn. HTML is kept only for what
it is genuinely better at: a shop you scroll, a box you type your name into, a
rulebook, the list of what you missed. Those slide up as sheets *over* the
living world rather than replacing it.

**Two clocks.** The stage keeps its own clock, which a hit-stop stops and a
slow-motion finish slows, so when the screen freezes on a Perfect everything in
it freezes together. The rules do not use it: the round is still timed against
`Date.now()`, so a hit-stop can never steal a second off the clock you are
racing.

**On a wide screen the game plays in a column.** A phone game stretched across
a laptop put the four trays at the far corners of the window with a small card
marooned between them. Wider than about 0.62 of its own height, the stage lays
the game out in a portrait column in the middle and lets the world run
full-bleed either side of it.

### What a frame costs

Every canvas call is a draw call, and on a phone the cost of a frame is mostly
how many of those there are, not how many pixels they cover. Profiling the
round showed text alone was half the frame. So anything that does not change
from one frame to the next is **baked** - drawn once into a small off-screen
bitmap and stamped down as one image after that: every line of text, every
glow, each tray, each card face, each button's body. Only what moves is drawn
live.

On a GPU-accelerated canvas the round holds **60 fps at max combo with 120
particles in the air, for about 3 ms of the game's own work per frame**. If a
phone still cannot hold the frame rate, the stage steps its resolution down
rather than stuttering.

**The Android emulator is not a fair test of this.** On it, even a bare
full-screen canvas that fills one rectangle and 60 squares a frame manages 23
fps on the host GPU and 10 on SwiftShader, while the same test done in HTML gets
55 to 58 - the emulator's graphics translation is the bottleneck, not the game.
Real phones composite canvases natively. Check a real one with `?fps`.

---

## How you get around

**There is no tab bar.** HOME / BOSS / PLAY / GEAR / ME along the bottom is
the single most "this is an app" thing a screen can have. Games are places you
move between: home is the hub, every door off it leads somewhere, and back takes
you home.

| | What is there |
|---|---|
| **Title** | The logo assembling itself, and **TAP TO START** - which is also the tap that wakes the sound |
| **Home** | Your character standing in the world, your rank and stars, PLAY, and three doors |
| **The map** | The trail. Tap a level and you walk there; it tells you about itself and you go in |
| **Boss** | The four bosses on a stage, one at a time, and a VS face-off before each fight |
| **Gear** | Your character up close on a pedestal, with the shop as a sheet underneath |
| **Guide** | The rulebook, as pages you turn |
| **Settings** | The cog on the home screen: account, background, sound, vibration, reset |

**Back is one rule everywhere.** It closes whatever sheet is open; in a round it
pauses, and from the pause it resumes; anywhere else it goes home; on the home
screen it leaves the app. `Nav.back()` in `js/panels.js` is the single place
that decides, and the Android app asks it rather than guessing.

### Home

**A game's home is where you see what you have got.** Your character stands on
a shelf on the board, a name sticker on, actually **wearing** what you chose: the shield on the off arm, the weapon in
the near hand, and the pet you are walking with at their side. Every *other*
pet you own potters about on the ground around them, so the collection lives
on the home screen as creatures rather than as a row of icons. Tap your
character and they jump; tap a pet and it hops.

The doors carry no subtitles. A red **!** on GEAR means you can afford
something; on DAILY it means today's round is waiting.

The hero is a marker doodle (see **The characters** below), chibi proportions
on purpose - a big head and a short body, which is what the pets are, so the
party looks like it came from one game. The figure is a composite, not thirty drawings: the shield and the
weapon are laid over the figure at the points its hands are, in percent of the
figure, so one set of numbers works at every size the game draws it.

### Stars and ranks

A grade is a mark. **Stars are the thing you collect** - which is why every
game that wants you to replay a level counts them. A letter tells you how you
did; three empty stars tell you there is something still on the table.

| Grade | Stars |
|---|---|
| **S** | 3 |
| **A** | 2 |
| **B** or **C** | 1 |

Clearing a level *is* the achievement, so a pass at any grade is worth one.
The other two are for doing it well. Twelve is everything the pack has, and
they add up to a rank: **Beginner, Sorter, Organiser, Pro, Master**. A number
going up is a score; a name going up is a reason to keep going. Both live in
`js/levels.js` - `RANKS`, and `Progress.stars()`.

---

## What was wrong before

Three things were in the wrong place, back when this was five tabs of Map,
Guide Book, Character, Battle and Shop:

- **Saving your progress was on the Character page**, in among the pets and
  the swords. Nobody looking for "keep my progress" opens a page about gear.
  It has its own screen now, and that screen says what it is for.
- **The Shop and the Character were two tabs doing one job.** They rendered
  the same list; you bought on one and equipped on the other.
- **The Guide Book was a tab for ever.** It is read once and come back to now
  and then, which is a button, not a fifth of the bottom bar. It kept its
  place in the first-run flow and gained a **?** on the map, so it is still
  one tap away.

And one thing was simply broken: when the shop moved onto the Gear page it
kept `flex: 1; min-height: 0; overflow-y: auto` from the days when it was its
own screen. Nested inside another scrolling box it **collapsed to nothing**,
so all twenty-six tiles were there in the page and none of them could be
reached. The page had no clearance under the bottom bar either, so the last
thing on it ended up underneath the bar.

Two things gained a home they never had. The **background** could only be
changed from inside a round - you had to start playing something to change
how the game looks - and the **sound** had no switch at all.

### Reset asks first

**Reset all progress** used to wipe the save on a single tap, from a button
sitting directly under the gear picker. It takes every level, every coin, all
thirteen pets and your character's name with it, and if you are signed in it
uploads the empty save to your account.

It now opens a popup that **names what is lost** rather than asking "are you
sure", which tells nobody anything. The button that does it is red and says
**Delete everything**, never "OK": a person tapping the loud button should
already know what it does. Cancel, the tap outside, and every other way of
dismissing it are all a no.

`Panels.dialog()` in `js/panels.js` is the general version of that, if
anything else ever needs to ask.

---

## Why it looks like this

**Desk Day.** The game is played on a cork board, and everything on it is a
real thing from a desk. The design was drawn first, on Claude's Design canvas
(*Task Sorter game look*), and the game was built to match it.

- **The four trays are objects, not boxes.** Do Now is a red metal in-tray
  with hazard tape across the front. Do Later is a desk calendar with a day
  ringed in red marker. Give Away is a stamped, addressed envelope. Drop is a
  wire bin already full of crumpled paper. Each is a different *shape* as well
  as a different colour, so the corners tell apart before you read a word - and
  for anyone who cannot tell red from orange. Each shows its own pile as the
  round goes on: more papers in the in-tray, days crossed off the calendar,
  letters behind the envelope, balls of paper in the bin.
- **A task is an index card**, handwritten (Kalam), taped down with washi tape:
  cream card, red margin, blue rules. A golden card is golden card stock, a
  frozen one is iced over, a burning one has a fuse along the top.
- **The rest is stationery.** The score is on a strip of masking tape, the
  clock is a kitchen timer, the combo is a rubber stamp that inks redder as it
  climbs, the reason for a miss is a note pinned to the board, buttons are
  tickets (PLAY), manila folders (the home doors) and kraft card, coins and
  stars are on price tags, your name is a HELLO MY NAME IS sticker, your rank is
  coloured in on a ruler, the map is red string between pinned discs, each boss
  is on a WANTED poster, and the results are a report card.
- **One light, one shadow.** Everything casts the same hard brown shadow down
  and to the right, as if one lamp is above and to the left. No glows, no gloss,
  no blur, no rounded app cards.
- **Three typefaces, each with one job.** Bungee for anything loud, Kalam
  handwriting for anything you read, IBM Plex Mono for typed labels. All three
  ship with the game (`assets/fonts/`).
- **The characters are marker doodles.** The hero, the gear, the bosses and
  the pets are drawn the way you would doodle on the desk: a wobbly ink line,
  with the colour printed slightly off it.

The props are drawn in `js/desk.js` (trays, index card, card back, timer, note)
and `js/gfx.js` (tape, pins, the rubber stamp, the paper `panel` every box
uses). The sheets get the same look in `css/game.css` (*Desk Day* block).

## Writing cards (the important part)

Open `js/cards.js`. Copy a line and change it:

```js
{ text: 'Homework due 8am tomorrow',
  box: 'now',
  why: 'Important, and the deadline is before school.' },
```

`box` is one of `'now'`, `'later'`, `'give'`, `'drop'`.

### The fair card rule

**A card must have exactly one right answer.** Give it a deadline AND the
stakes, so the player is judging, not guessing.

- BAD — `'Essay'` — could be any box
- GOOD — `'Essay due in 2 weeks, 20% of grade'` — clearly Do Later

The `why` is shown on the END SCREEN, in the "What you missed" list, not
during the round. **The right corner is never shown** - not on a fail, and not
on a pass either. Being handed the answer teaches nothing: you read it, nod,
and forget it by the next round. You are told what you chose and why that was
not it; working out what it should have been is the part that is actually the
game. A banner mid-round is unreadable at speed and it covers
the card you are meant to be looking at. This is still the line that does
the teaching, so write it properly. If you cannot write a
`why` that convinces you, cut the card.

There are **116 cards**: 32 house, and 28 each for school, phone and out.

### Give Away must not be spottable

The corner people find hardest was also the most guessable. Every Give Away
card named somebody - a brother, a friend, "anyone can" - and almost nothing
else did, so **a player who swiped bottom-left whenever a human appeared in
the text scored 60% without reading the card**. That is pattern matching, not
judgement, and it is the one corner the game most needs to teach.

Fixed from both ends: a dozen Do Now, Do Later and Drop cards now mention
somebody without being anyone else's job ("Everyone else revised, your test is
tomorrow"), and four Give Away cards name nobody at all ("A reply is needed
today and it is not your thread"). **The tell is down to 42%, against 25% for
a coin flip.**

When you add a card, keep it that way: a person in the text must never be a
reliable signal for a corner.

**But do not chase the number.** The first pass at this rewrote "Learn to cook
one meal properly" into "Get someone to teach you one meal properly" - which
moved the metric and pointed the card straight at Give Away. Three others went
the same way: a card where the person named could plausibly do the task is a
card with two answers, and the FAIR CARD RULE outranks the tell every time.
Add the person; never hand them the job.
Inside a theme the four corners are the same size as each other, or one
corner starts repeating before the others do.

---

## Levels

The Day to Day pack is four levels, defined in `js/levels.js`. Beat one to unlock
the next. Your best grade is saved and shown on the marker itself.

The map is a winding trail: level markers sit at the `x` and `y` percent set on
each level, so it stretches to any phone. Move a marker by changing those two
numbers and redrawing the trail path in `index.html`.

| # | Level | Place | Clock | Cards | Corners | Pass |
|---|---|---|---|---|---|---|
| 1 | In the House | home, chores, cooking | none | easy only | 4 | 60% |
| 2 | At School | homework, tests, group work | 60s | easy + medium | 4 | 65% |
| 3 | On Your Phone | messages, apps, scrolling | 75s | all three | 4 | 70% |
| 4 | Out in Town | buses, shops, friends | 90s | medium + hard | 4 | 75% |

The order is deliberate. Home is where the answers are most obvious. School
adds other people, so **Give Away** starts to matter. A phone is the hardest
thing in anyone's life to sort, because every notification *feels* urgent.
Out in town is last: real deadlines, other people, and no easy cards left.

Three lists on each level control what turns up, and together they are the
whole difficulty ramp:

- `theme` - which place you are in, so Level 1 is nothing but house tasks
- `boxes` - which corners a level uses. **All four are live from Level 1**;
  the easing-in comes from `tiers`, not from hiding a corner. Nothing uses a
  short `boxes` list at the moment - it is there so a future level can, and
  a corner left out is removed from the screen rather than greyed out
- `tiers` - how hard the cards are to judge (see `js/cards.js`)

That is the teaching built into the progression.

### Why passing is accuracy, not score

Score swings enormously - a x8 streak with Perfect bonuses is worth more than
ten times a careless sort. A near-perfect test run scored 249,708 against an
early target of 3,000. Any score target is therefore either trivial or
impossible, so passing tests the thing the game is actually about: getting them
right, and not drowning. Score still drives your grade and the leaderboard.

---


## Scoring

Points reward **accuracy and steadiness**, never how many cards you mashed
through.

```
points = (100 + speed bonus + perfect bonus) x streak multiplier
```

- **Streak** rises with every correct sort, up to `MAX_MULTIPLIER` (8)
- **One wrong sort resets it to x1** — that is the real punishment
- **Speed bonus** — up to +100, the faster you sort
- **Perfect** — correct and under 1.2 seconds — +150 and a chime
- **Final rush** — the last stretch of a level pays double

**Grade** comes from accuracy and best streak only:

- **S** — 95%+ accuracy and a 12+ streak
- **A** — 85%+
- **B** — 70%+
- **C** — below that

You cannot win by spamming swipes, which is what makes a leaderboard mean
something.

### Losing

There is only one way to fail a level: **finish below the accuracy bar**.

**A failed run is not recorded.** No grade is saved and the marker on the map
stays blank, because a best grade is the badge for beating a level - writing a
failed one in there put a C on a level nobody had passed, and made it look
finished from the map.

There used to be a second - a desk meter that filled up behind you and buried
you if you fell behind. It was removed. Everything it touched (card spawning,
`deskMax`, the armour "desk space" stat) went with it, and pets and armour were
rebuilt around the clock and accuracy instead.

### The final rush

The last stretch of a level pays double - the screen washes red, the music
speeds up, and the score tape reads RUSH x2. Its length
is `min(RUSH_SECONDS, level length x RUSH_SHARE)` - capped at a quarter of the
level. Without that cap a 45 second tutorial level would spend 20 of its 45
seconds in rush mode, which is what made Level 1 unfairly brutal at first.

---

## Boss

A **1 v 1 sorting duel** against the computer — not a separate
fighting game. Both of you sort the same cards:

- You sort one **right** → you hit them (12 damage, 18 if you were fast)
- You sort one **wrong** → they hit you (10 damage)
- They sort one right on their own clock → they hit you

Two health bars, a 60 second clock. First bar to empty loses; if the clock runs
out, whoever has more of their own bar left wins.

### The bosses

| Boss | Is | Sorts | Accuracy | Damage | Health | Trick |
|---|---|---|---|---|---|---|
| Sticky Steve | a sticky note with a face | one every 2.6s | 60% | 9 | 100 | **Sticky Fingers** - glues the card you are holding; tap it free |
| Clip Carla | paperclips in her hair | one every 2.0s | 72% | 10 | 120 | **Reshuffle** - swaps two of your trays |
| Inbox Ivan | buried under his own paperwork | one every 1.5s | 82% | 11 | 140 | **Inbox Flood** - the words on your trays vanish for 6 seconds |
| Deadline Dan | an alarm clock, not a person | one every 1.1s | 92% | 13 | 160 | **Deadline** - this card and the next two catch fire |

**Every boss has one trick, and it is the one their name promises.** Each is a
twist the map already taught - frozen cards, swapping trays, burning cards -
turned up, so a boss fight tests what the levels taught. Ivan's blackout is the
only new one, and it only takes away words you should not need by then: the
colours, icons and patterns stay. The first trick comes 4.5 seconds in, so you
meet it in every fight, then every 9 to 11 seconds.

**They talk.** A speech bubble under the boss: a line when the fight starts,
when they use their trick, sometimes when you land a big hit, and when one of
you goes down. They keep quiet while the reason for a miss is on screen. The lines are in `lines` on each boss.

The later bosses have **more health**, so their fights last long enough for the
trick to matter - at full speed a player could take a 100 HP boss apart in six
cards.

Each boss has its own drawing, named by `sprite` on the opponent. They are
all named after the thing that buries people, so each one IS that thing - you
can tell them apart by silhouette before reading a name. A boss added without
a `sprite` falls back to the plain stand-in figure.

They unlock one at a time. Winning pays 120 coins plus 60 per boss; losing
still pays 20% of that, so a hard fight is never a total waste.

Your **weapon** from the shop multiplies your damage, so gear matters here more
than anywhere else.

Everything is in `js/battle.js` — adding a boss is one entry with a `speed` and
an `accuracy`.

**The screen says Boss; the code still says battle.** A "battle" in the source
is the duel *mechanic* - two health bars, one clock, the same cards - and it is
what `game.js` switches into with `mode = 'battle'`. *Boss* is what the four of
them are to a player working up the ladder. Renaming the mechanic would have
meant touching the scoring path to change nothing anybody can see.

---

## The Gear screen

**Your character, large, standing on a pedestal**, with the shop as a sheet
underneath. Tap anything and the figure above changes outfit in a puff of
smoke - buy a shield and you watch it appear on their arm. (The old Gear page
redrew the shelf on a purchase and not the character, so the figure kept
wearing last week's shield until you left the page - which read exactly like
the purchase had not registered.)

At the top of the sheet: your character's **name** (tap to type) and the **full set** banner. At the bottom, what your gear
actually does:

- **Clock speed** — how fast your round runs out (from your pet)
- **Coins** — what you earn at the end of a round (pet + full set)
- **Mistakes covered** — wrong answers that will not count (from your armour)
- **Points** — what each card is worth (from your weapon)

`js/shop.js` draws what is for sale, `js/hero.js` the readout, and
`Scenes.gear` the character - all reading the same item list, so adding an item
to `js/shop.js` makes it appear in every part of the screen at once.

---

## The shop

On the **Gear** screen, under your character: **one kind at a time, on
tabs** - Pets, Armour, Weapons. All three used to be stacked down one long
page, which is a catalogue; a game's shop shows you one shelf and lets you flip
between them. Each item stands on its tile with a shadow under it; tiles you
can afford wear a gold price tag, the one you are wearing goes green, and
anything still locked is a silhouette that says what unlocks it.

Three kinds of gear, and
**every item changes how a round actually plays** — nothing is decoration.

| Kind | What it does | Items |
|---|---|---|
| **Pets** | More coins, but a faster clock | Thirteen, from the Duck to the Phoenixling - see below |
| **Armour** | Covers wrong answers so they do not count | Wood, Silver, Gold, Diamond, Diamond and Gold Shield |
| **Weapons** | More points, and more battle damage | Dagger, Longsword, Gold Sword, Bronze Blade, Winged Blade |

One of each can be worn at a time. Everything is defined in `js/shop.js`;
`fast`, `coin`, `block` and `mult` are the only four things an item can do,
so adding an item is one line.

### The pet collection

Thirteen pets, brought over whole from **MyTask** with their own art and their
own rarity. They are doodles like everyone else (`js/doodle.js`); their names,
prices and speeds live in `js/pets.js`.

| Rarity | Pets | Gate |
|---|---|---|
| Common | Duck, Kitten, Mushroom, Hatchling, Bunny | none - buyable from the start |
| Rare | Adventurer, Teddy Bear, Penguin | reach level 2 or 3 |
| Epic | Zombie, Flame Sprite | reach level 3 or 4 |
| Legendary | Polar Bear, Dragon, Phoenixling | **beat a boss** |

MyTask gave each pet an ability worth some percent of XP or coins. Task Sorter
has no XP, so every ability lands on coins - and here a pet also shortens your
clock. **The ladder runs both ways at once:** the further down you buy, the
more you are paid and the less time you get to earn it in. The Phoenixling pays
+60% and cuts a 60 second level to 39. That is on purpose: the best pet in the
game is not automatically the best pet to wear, which is the only thing keeping
thirteen of them from being one of them and twelve trophies.

All three legendaries sit behind a **battle** rather than a price, so the
collection cannot be finished by grinding coins alone. That is what Battle mode
is for.

Each slot has a different job, and the jobs come from how you pass a level.
Passing is decided by accuracy alone, so **armour protects your accuracy**,
**a weapon grows the score** a good round earns, and **a pet pays extra coins
but shortens the clock**, which means fewer cards and a smaller score. A slot
that does not help you pass, or pay you for not helping, is decoration.

### Giving one item its own picture

By default every item in a group shares its group's picture and is told apart
by a colour tint. An item can override that with its own `sprite`:

```js
{ id: 'pet3', name: 'Sleepy Sloth', ..., tint: 0, sprite: 'sloth' },
```

Set `tint: 0` at the same time, or the tint will recolour your art.

The named sprite either comes from a grid in `js/sprites.js` or from a real PNG
listed in `SPRITE_OVERRIDES`. To swap the hand-drawn Sleepy Sloth for real art:

1. Save the image as `assets/sprites/sleepy-sloth.png`
2. Uncomment `// sloth: 'assets/sprites/sleepy-sloth.png'` at the top of
   `js/sprites.js`

Nothing else changes — the shop, the Character slots and the picker all pick it up.

### Unlocking gear

Not everything is buyable from the start. Items carry one of two gates:

- `needsLevel: 3` — you must have **reached level 3** on the map
- `needsRival: 2` — you must have **beaten the second boss**

A locked tile shows the reason on its price tag (*"Reach level 3"*,
*"Beat Clip Carla"*) rather than just going grey, so you always know what to go
and do. The top item in each group is gated behind a **boss fight**, which is
what gives the Boss screen a purpose beyond coins.

There are 18 items: six per group, five of them buyable.

### The full-set bonus

Wear a pet **and** armour **and** a weapon at the same time and every coin
payout goes up by **25%** — levels and battles both.

It is deliberately about filling all three slots rather than owning expensive
gear, so the cheapest full set (Paper Crane + Wood Shield + Dagger, 370 coins) earns
the bonus just as well as the priciest one. That gives a new player something
reachable to aim for instead of grinding for one costly item.

The Character screen shows a gold **Full set!** banner when it is active, and a
greyed-out reminder when it is not. `setBonus` in `js/shop.js` controls it.

### Coins

You earn coins by finishing a level:

```
coins = score / 500  +  grade bonus (S 50, A 35, B 20, C 8)
```

Both numbers live in `COIN_REWARD` in `js/shop.js`. A typical good round pays
roughly 100-150 coins, so the cheapest item is about one round away and the
best is a proper grind.

The divisor was 200 until a full play-through test: a clean Level 1 paid 288
coins, which bought the cheapest item in every slot at once and left the whole
shop about two rounds away. Score climbs with your streak AND with how many
cards you got through, so it runs away from you on the longer levels - the
divisor is the thing holding the payout down. **Still worth re-checking once
real people play it.**

---

## Tuning

Every number worth changing is in `TUNING` at the top of `js/game.js`:
round length, points, streak cap, wrong-answer pause, rush settings.

The wrong-answer pause is 350ms and it is ANIMATION time, not reading time -
just long enough for the card to fly off and the screen to flash red. It used
to be 1800ms on Level 1 so the player could read a banner; the banner is gone,
so the wait went with it.

---

## The characters

Everyone with a face is drawn in `js/doodle.js` - the hero, the ten pieces of
gear, the four bosses and the thirteen pets. Each is a short list of polygons,
ellipses and pen strokes on its own little grid. The first time one is asked
for, it is inked once into a canvas big enough for a phone screen, and from
then on it is an ordinary sprite: `Gfx.sprite('steve')` and
`Sprites.apply(el, 'duck')` hand it out under the name the pixel art had.

**How a shape is inked.** The colour goes down first, nudged down and to the
right. Then the outline, on the true spot, with every edge cut into short steps
and each step pushed about a little. The wobble is worked out from where the
point is, so the same shape always wobbles the same way and nothing shimmers.
Eyes and their shine are solid ink and sit exactly where they are drawn.

**A hit shows on the face.** Each boss has a second drawing, `steve_hurt` and
so on, with the eyes screwed shut; it is shown while they flash from a hit.

**Pets bob instead of walking frames.** On the stage a pet breathes and bobs
on the same frame counter a sheet used to step; in the shop sheet CSS does the
bob (`.pet-ink`), and stops it for anyone who asked for less motion.

**Adding a pet** is a shape list in `PETS` in `js/doodle.js` (drawn facing
right on an 80 x 72 grid; it is flipped to face left like the old sheets) and
one entry in `PET_SHEETS` in `js/pets.js` for its name and speed.

---

## One thing done deliberately

The round clock runs on a **wall-clock interval**, not `requestAnimationFrame`.
rAF stops dead when the phone screen locks or the player switches apps, which
would freeze a round instead of ending it. Everything reads `Date.now()`, so the
timer stays honest even if the app goes to the background.

---

## Not built yet

- **Online Boss.** Shown on the Boss screen, clearly marked *Coming soon*, and
  tapping it says so. Two real players need a server to pair them and pass
  their moves; the game has no server. There is deliberately no pretend
  "searching for players" screen, because faking a real opponent with a
  computer one is lying to whoever is playing.
- Give Away characters (pick a teammate to hand the task to)
- Rush mode (3x)
- **HUAWEI Game Service, connected.** The game is built for it - every badge is
  an achievement id, every daily and level score a leaderboard entry, all
  passed through `js/services.js` to `GameServices.java` in the app. What is
  missing is the part that cannot be in a repository: a HUAWEI developer
  account and an AppGallery Connect project. `android/README.md` has the steps.
- Office pack

---

## Contest checklist

- [ ] Register before **13 October**
- [ ] **Collect 20 HUAWEI GameCenter IDs from 20 different devices.** This is
      the one on the list that is not code and not a document: it is twenty
      people with twenty phones. It is compulsory, it waives the RM20 fee, and
      it is what teams run out of time on. Start it first.
- [ ] Confirm with the Category A group that the APK satisfies the "Mobile
      Game App Product / Prototype" requirement
- [ ] Presentation slides (ppt, max 40) — needs Issue Clarification and SDGs.
      The SDG answer is in the game as well as on the slide: see **Why this
      game exists** in the Guide Book
- [ ] Video, max 3 minutes, max 60 MB, English subtitles if not in English.
      `store/gameplay.mp4` is 53 seconds of real play to cut from (no sound -
      record the soundtrack separately, or play over it)
- [x] Store screenshots, 1080 x 1920 - `store/screenshots/`
- [x] Store text: name, short and long description - `store/listing.md`
- [x] An installable Android app — `android/`, about 3.4 MB
- [x] Under **100 MB** — the APK is 3.4 MB, the game itself under 1 MB
- [x] **Run the APK.** Done on an Android 15 emulator (Pixel 7, API 35): save
      survives a cold start, touch and the back button behave, portrait holds,
      it clears a notch, 60 fps, works with the network off. Three bugs found
      and fixed. See `android/TESTING.md`
- [ ] **Run it on a physical phone.** The emulator covered the logic; it cannot
      tell you about a cheap chipset or how a swipe feels - and since the game
      became a canvas game, the emulator is no measure of its frame rate at all
      (see *What a frame costs*). Open it with `?fps` on a real phone and check
      the number. An emulator will also NOT do for the twenty IDs above; those
      say twenty different devices and mean it
- [ ] Final submission **1 November**, 11:59pm

---

## The soundtrack

**There is no music file.** Every note in `js/music.js` is an oscillator, the
same bargain as the rest of the game - the sprites are colour grids and the
worlds are drawn maths.

That matters here more than it is clever. A borrowed loop in a public
repository is a borrowed loop's licence to honour. A minute of even middling
MP3 is bigger than everything else in the game put together. And a soundtrack
that has to arrive over the network is not there for the first round, which is
the round somebody judges you on.

**It keeps time against the audio clock, not `setTimeout`.** A coarse timer
wakes every 25ms and books whatever falls inside the next 120ms directly with
the hardware clock, so the timer running a frame late changes nothing.
Scheduling each note with its own `setTimeout` drifts audibly inside two bars.

**Four chords - C, G, Am, F - and a melody built only from the C major
pentatonic**, five notes that cannot land wrong on any of them. Chosen because
this loops for as long as somebody is on the screen, and music that repeats
must have nothing in it that grates on the ninth time round. Five arrangements
of the same phrase, so moving between them sounds like one game:

| Tune | Where | How |
|---|---|---|
| `title` | the title screen | the menu's tempo with the arpeggio running |
| `menu` | home, map, gear, bosses | slow and thin, for screens you read |
| `play` | a round | faster, with a hat and a kick |
| `rush` | the final rush | faster again, a kick on every beat |
| `battle` | a boss fight | the same melody over Am F C G - every note of the C major pentatonic is also in A minor, so it fits unchanged and the whole thing turns tense |

It follows the scene (the stage tells it), stops on the Settings sound switch
along with the effects, and pauses on a hidden tab - on a phone that is battery
spent behind a locked screen.

**Nothing makes a sound until you have touched the screen.** A browser tab
enforces that itself; an Android WebView does not, and for a while the game
sang over the launcher animation. `UI.sound` keeps that gate itself now, and
the title screen's TAP TO START is the tap that opens it.

### The sound effects

`js/sfx.js`. Still no files: each effect is built the way a sound designer
would build it on a synth, from two or three layers - a click on the front so
it has an edge, a body that carries the pitch, a tail of filtered noise so it
sits in a room. A card landing in the right tray is a pluck *and* a soft thud
of it arriving; a mistake is a low buzz *and* a dull knock. A compressor on the
whole effects bus keeps twenty coins landing at once from clipping.

**The right answers play a tune.** Each correct sort in a streak is the next
note up the C major pentatonic, the same five notes the melody is built from,
so they can never clash with it. A long streak climbs a scale you can hear;
break it and it starts again from the bottom. That one idea does more for
"keep the streak going" than any number on the screen.

---

## The Android app

`android/` wraps the game into an APK. About 3.4 MB.

**There is no second copy of the game in there.** The obvious approach is to
copy `index.html`, `css`, `js` and `assets` into the Android assets folder and
commit them, and from that moment there are two games in one repository and
one of them is always the stale one. `android/app/build.gradle` stages the
repository root at build time instead, so the app and the website are built
from the same files and cannot drift.

Nothing in `js/` changed for the app to exist, and nothing in it knows it is
inside one. One Activity, one WebView, no bridge - so there is still only one
game to test.

**It is served over https, not loaded from `file://`.** The usual way is
`loadUrl("file:///android_asset/index.html")` and it mostly works, which is
the trap: a `file://` page is an opaque origin, where local storage is
unreliable and every request is cross-origin from `null`. This game keeps
every scrap of progress in `localStorage`. `WebViewAssetLoader` serves the
same files from a real secure origin that never leaves the phone, so the app
behaves exactly like the browser the game was tested in.

**Back asks the game.** The system back button calls `Nav.back()` in the page
and only closes the app when the game says there is nowhere left to go. It
used to find whichever of four HTML back buttons was showing and click it; the
game is drawn now and those buttons do not exist.

**It buzzes.** `navigator.vibrate` works inside a WebView once the app holds
the install-time VIBRATE permission - a short tap when a card lands, a double
knock on a mistake. It asks the player nothing, and Settings turns it off.

Build it with `./gradlew assembleDebug`, or take the artifact from the Build
APK workflow in the Actions tab. See `android/README.md`.

---

## Backgrounds

**Four desks to play on**, picked in Settings or from the pause menu, and
painted in `js/world.js`:

| Id | Name | What it is |
|---|---|---|
| `cork` | Cork Board | a pinboard in a wooden frame - the default |
| `wood` | Wood Desk | planks and grain |
| `mat` | Cutting Mat | green, ruled in centimetres |
| `chalk` | Chalkboard | dark, half rubbed out |

Each is painted once into an off-screen canvas and stamped every frame, with a
few specks of dust drifting in the lamp light. Saves from before the desk say
`space`, `sakura`, `forest` or `falls`; `world.js` maps those onto the four
surfaces, so nobody's choice is lost.

## The first round

**The very first round teaches - without words.** The first time anyone plays
Level 1, the first four cards are one for each corner; the tray each belongs in
glows and a hand shows the drag. After the fourth it is a normal round. It is
remembered as `tipsSeen.tutorial`, so it only happens once.

There are no first-time notes anywhere else. Game screens carry names and
numbers only - no hints, subtitles or "tap to..." lines. The Guide Book holds
the reading, for anyone who opens it.

---

## Online Boss (not built yet)

The boss stage has a fifth page after Deadline Dan, **Online Boss**, marked
**Coming soon**. Tapping it opens a note that says plainly it is not ready yet
and why.

It is not a working feature. Playing a real person needs a server on the
internet to pair two players and pass their moves between the phones, and
this game has no server - it is files that run on the phone and never go
online.

There is deliberately **no pretend matchmaking**: no fake "searching for
players..." spinner and no computer opponent dressed up as a human. Anyone
tapping it is told the truth.

Building it for real would mean: a hosted server (or a service such as
HUAWEI's own game services), player accounts or at least anonymous IDs, a
matchmaking queue, sending both players the SAME shuffled deck so it is fair,
and deciding what happens when someone's connection drops mid-round.

---

## Putting it online

The repo is committed and ready. It is a static site - no build step - so a
host only has to serve the folder.

**Done:** <https://github.com/ZenBen5173/task-sorter>

```bash
git push          # after the first push, this is all it takes
```

**Deploy** at <https://vercel.com/new>: pick the repo and press Deploy.
Framework preset **Other**, no build command, no output directory -
`vercel.json` already says what is needed. Once it is linked, every push
deploys itself.

### Commit author

Commits use `ZenBen5173@users.noreply.github.com`, not a real address. GitHub
rejects a push that would publish a private email (error GH007), and this repo
is public, so the forwarding address is the right thing to use.

`archive/` (the old Focus Village build) is in `.gitignore`, so it is not
uploaded and does not count towards the competition's 100 MB.

---

## Accounts and saving online

Make an account with a **username and a password**. Progress is then kept on a
server, so the same account picks up where it left off on any device.

**No email is ever asked for.** The username becomes
`username@tasksorter.invalid` behind the scenes. `.invalid` is reserved by
RFC 2606 so it can never be registered by anyone and nothing can ever be
delivered to a real person. This is a game for children; the less personal
information it holds, the better.

**The game still works with no internet.** All of this sits on top of the
ordinary browser save. If the server cannot be reached the game carries on
exactly as before.

### Which save wins

| Signing in to... | What happens |
|---|---|
| an account never played | the progress on this device is uploaded to it |
| an account with progress | the account's progress replaces what is on this device |

Blunt on purpose. Merging two saves would have to guess, and a guess that
silently deletes somebody's coins is worse than a rule you can predict. The
game says out loud which way the save went.

### The server

Supabase project **task-sorter** (`grhnczwqilayvxfaypmj`), Singapore region,
free tier. One table, `profiles`: the player id, their username, and the whole
save as JSON.

Row Level Security is on, and the three policies only ever match
`auth.uid() = id`. **A player can only read and write their own row**, and the
database enforces it - not the game - so a tampered copy of the game cannot
reach anyone else's save.

The key in `js/cloud.js` is a publishable key. It is meant to be public and
grants nothing by itself.

### Before accounts will work

New Supabase projects require a new account to confirm its email address, and
a `.invalid` address can never receive one. Turn that off once, in the
dashboard:

**Authentication -> Sign In / Providers -> Email -> "Confirm email" OFF**
