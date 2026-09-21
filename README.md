# Task Sorter

A fast sorting game built on the **Eisenhower Matrix**. Task cards fly in, you
swipe each one into one of four corners, and only accuracy decides whether
you pass.

Sort right and fast, keep your streak alive, get an S.

Four levels wind up a trail - the **Day to Day** pack. Each level is a
**place in your life**, and only that place's tasks turn up there.

---

## Running it

**On the PC:** double-click `index.html`.

**On a phone** (same Wi-Fi):

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

It prints a `http://192.168.x.x:8080` address. Open that on the phone.

On a laptop you can also play with the keyboard: **Q W A S** for the four corners.

The **←** button in the top-left of a level leaves it and goes back to the map.
Nothing is recorded when you leave: no grade, no coins, no failed attempt.

---

## The four corners

| Corner | Box | Means |
|---|---|---|
| Top-left | **Do Now** | important **and** due soon |
| Top-right | **Do Later** | important, not due yet |
| Bottom-left | **Give Away** | urgent, but not yours to do |
| Bottom-right | **Drop** | neither important nor urgent |

Any swipe direction maps to a corner, so a sloppy flick still counts. A swipe
shorter than `SWIPE_MIN_PX` snaps back instead of sorting, so a stray tap costs
you nothing.

---

## What is in the box

| File | What it does |
|---|---|
| `index.html` | Every screen (title, map, guide, gear, me, play, end) |
| `css/style.css` | Everything visual, including all the animation |
| `js/cards.js` | **The task cards.** This is the file you will edit most |
| `js/sprites.js` | **The pixel art.** Placeholders you will replace |
| `js/themes.js` | **The backgrounds** you can switch between mid-round |
| `js/tips.js` | **The first-time popups**, one per screen |
| `js/game.js` | The round: swiping, scoring, grading |
| `js/ui.js` | Score odometer, floating points, sound |
| `js/levels.js` | **The levels** and your saved progress |
| `js/shop.js` | **The shop:** pets, armour, weapons and coin rewards |
| `js/hero.js` | **The Character screen:** gear slots and stat bars |
| `js/battle.js` | **The bosses** you duel |
| `js/main.js` | Boots the game, draws the level map, wires the buttons |
| `js/pets.js` | **The pet collection:** the thirteen sheets, and how they are played |
| `js/weather.js` | **The falling petals, leaves and rain** behind a round |
| `js/cloud.js` | **Accounts** and saving your progress online |
| `serve.ps1` | Local server for phone testing |

No frameworks and no build step. Sounds are generated in code, so there are no
audio files at all. The only network calls the game ever makes are the account
ones in `js/cloud.js`, and the game plays exactly the same with every one of
them failing.

---

## How you get around

It is a game, so it is built around the thing you came to do.

**PLAY is the middle of the bottom bar**, raised and gold, and it is the only
round button on the screen - a thumb finds it without looking. The level map
is what it opens, so the map stopped being a tab of its own: it is a place you
pass *through* on the way into a round, not a section of an app.

| | What is on it |
|---|---|
| **Home** | Your character in the gear you chose, your rank, your stars, your collection - and PLAY |
| **Boss** | The four bosses, and Online Boss marked coming soon |
| **&#9654; PLAY** | The level map. The **?** in its corner opens the Guide Book |
| **Gear** | Your character, the three slots, the whole shop, and your stats |
| **Me** | Your account, the background, the sound, the rulebook, and Reset |

### Home

There used to be a title card: a logo, the four corners written out a second
time, and one button. You passed through it once and never came back.

**A game's home is where you see what you have got.** Your character stands on
it wearing what you chose, with the pet you bought beside them, and around
that: your rank, your stars, the pets you have caught, and what the next level
is called. PLAY names where it is going - *"Level 3, On Your Phone"* is a
reason to tap it; *"Play"* on its own is furniture.

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

`Tips.confirm()` in `js/tips.js` is the general version of that, if anything
else ever needs to ask.

---

## Why it looks like this

The structure was a game and the skin was a dashboard. Every picture in
Task Sorter is pixel art and every surface around it was a flat 1px-bordered
card in a muted navy, set in a UI sans - so a game full of sprites read as a
settings screen with sprites in it.

**Depth is a solid block, never a blur.** A panel sits on a flat slab of
`--sink` two or three pixels below it, with a one-pixel light line along its
top edge, and pressing it drops it onto the slab. That is what makes a surface
feel stamped out of plastic rather than floated in a browser. The PLAY button
was already built that way and was the only thing on screen that read as a
game, so everything else is now built the way PLAY is.

**Two fonts, and the arcade one is a spice.** *Press Start 2P* is a real arcade
face - eight pixels tall, no curves - and it matches the sprites. It went on
everything first, and the score odometer came out as overlapping garbage: a
sliding strip of digits needs every cell to be exactly one line tall, and this
face does not have the metrics for it. The rest was merely hard to read at
speed, which in a game about sorting cards against a clock is the same problem.

So it keeps **three places nobody has to read under pressure** - the logo, the
PLAY button, and the grade you are handed at the end. *Fredoka* carries
everything else, and the in-round numbers get their weight from size and
colour instead. Both come from Google Fonts; if they never arrive the game
falls back to the system stack and plays exactly the same.

**The dark is blue and lit from somewhere.** One radial gradient at the top of
`#app` is the difference between a room and a page.

**The weather runs behind every screen**, not just a round. Deep Space - the
default, and the screen most people look at most - used to be flat black, and
that was the single biggest thing making the menus feel like a website. It has
a slow starfield now. Petals, leaves and rain fall behind the menus too.

**Things arrive rather than appear.** Screens pop past where they are going and
settle, lists land a tile at a time, buttons drop onto their shadow. At the end
of a round the score, the accuracy and the coins **count up**, and when the
count lands the coins burst out of the row and arc away. A payout that is
simply there was never a moment; one that climbs while coins fly is what the
round was for.

**And far fewer words.** A shop tile is a picture, a name and a number:
`+8% coins - 6% time`, not *"+8% coins. Clock runs 6% faster."* Every group
blurb is now three words. The long sentences were mine and they were the last
thing making it read like documentation.

Anyone who has asked their phone for less motion gets the layout and none of
the show.

---

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
- **Final rush** — the last 20 seconds pay double, but cards land faster

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

The last stretch of a level pays double but throws cards 40%% faster. Its length
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
out, whoever has more health wins.

### The bosses

| Boss | Is | Sorts | Accuracy | Damage |
|---|---|---|---|---|
| Sticky Steve | a sticky note with a face | one every 2.6s | 60% | 9 |
| Clip Carla | paperclips in her hair | one every 2.0s | 72% | 10 |
| Inbox Ivan | buried under his own paperwork | one every 1.5s | 82% | 11 |
| Deadline Dan | an alarm clock, not a person | one every 1.1s | 92% | 13 |

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

The third tab, and it holds **both halves of choosing what you carry**. Your character stands in the centre with three gear slots
around them — **Pet**, **Weapon** and **Armour** — and three stat bars
underneath showing what you are currently carrying:

- **Clock speed** — how fast your round runs out (from your pet)
- **Coins** — what you earn at the end of a round (pet + full set)
- **Mistakes covered** — wrong answers that will not count (from your armour)
- **Points** — what each card is worth (from your weapon)

Tap a slot and a picker opens showing everything you own of that kind. Pick
one and the stat bars update straight away.

Everything you can buy is **on the same page**, straight underneath. It used
to be two tabs - a Shop to buy on and a Character to equip on - showing the
same list of items, so choosing your gear meant hopping between them. Tapping
something you own already equips it and tapping a price already buys AND
equips it, so the split was never doing any work.

`js/hero.js` draws the character and the slots, `js/shop.js` draws what is for
sale, and both read the same item list - so adding an item to `js/shop.js`
makes it appear in every part of the screen at once.

---

## The shop

On the **Gear** tab, under your character, laid out as an actual shop:
**three items to a wooden shelf**, standing on the plank with a shadow
pooled under each one, price on a little parchment tag, and a carved sign
over each group. It was a two-column grid of cards, which is how a website
lists products - a shop is a wall of shelves with things standing on them,
and you cannot stand anything on a card.

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
own rarity. They are animated sprite sheets an artist drew, not 16x16 grids
typed into `js/sprites.js`, so they live in `js/pets.js` and are played their
own way - see **Animated pets** below.

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

Art and licences: `assets/pets/CREDITS.md`.

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

## Swapping in real pixel art

Open `js/sprites.js`, drop a PNG into `assets/sprites/`, and uncomment the
matching line in `SPRITE_OVERRIDES`. That is the only change needed.

Four sprites so far: `bang` (Do Now), `cal` (Do Later), `arrow` (Give Away),
`bin` (Drop).

---

## Animated pets

The thirteen pets are the one thing in the game that is not drawn in code. Each
is a **sprite sheet**: one long strip of frames, played by sliding
`background-position` one cell to the left on a timer. No canvas, no redraw per
frame, and it costs nothing on a screen that already has cards flying about.

**One timer for the whole game.** The shop shows fourteen pets at once, and
fourteen separate intervals would be fourteen things to start, stop and leak.
Every pet on screen goes into one list that a single ticker walks. It drops
anything that has left the page, and **skips anything whose screen is not
showing** - otherwise the shop's fourteen would keep running frame by frame
behind a round you were in the middle of. It asks by CSS class rather than by
measuring, because reading a position makes the browser lay the page out, and
that is the one thing a 25-times-a-second timer must never do.

**Adding a pet** is a sheet in `assets/pets/` and one entry in `PET_SHEETS`:

```js
kitten: {
  name: 'Kitten', src: 'assets/pets/kitten.png',
  cellW: 35, cellH: 48, width: 350, height: 48,
  frames: 10, fps: 12, body: { w: 34, h: 48 }, offset: 0
},
```

### Why `body` and `offset` exist

**A cell is not a creature.** The Phoenixling is a 23x21 bird adrift in a 40x56
cell, because the cell has to be tall enough for its rebirth animation. The
Dragon fills 79x41 of its 83x48. Scale both to the same cell height and the
bird comes out half the size of the dragon - because it is.

So a pet is scaled off `body`, the part that is actually drawn, and `offset`
lifts it off the floor of its cell into the middle of its box. There is a
second cap on the **cell**: without it the Phoenixling's bird would match the
others while its canvas grew to two and a half tiles tall, hanging over
everything around it. The bird ends up a little smaller than a creature that
fills its own cell, which is the honest answer - it is a smaller creature.

The frame that hangs outside its box is transparent, so it never covers
anything, and it is `pointer-events: none`, so a tap meant for the tile next
door never buys a Phoenixling instead.

---

## One thing done deliberately

The round clock runs on a **wall-clock interval**, not `requestAnimationFrame`.
rAF stops dead when the phone screen locks or the player switches apps, which
would freeze a round instead of ending it. Everything reads `Date.now()`, so the
timer stays honest even if the app goes to the background.

---

## Not built yet

- Give Away characters (pick a teammate to hand the task to)
- Rush mode (3x)
- HUAWEI Game Service leaderboard
- Office pack

---

## Contest checklist

- [ ] Register before **13 October**
- [ ] Collect **20 HUAWEI GameCenter IDs** from 20 different devices
- [ ] Ask the Category A WhatsApp group whether a web prototype is accepted, or
      whether it must be an installable Android app
- [ ] Presentation slides (ppt, max 40) — needs Issue Clarification and SDGs
- [ ] Video, max 3 minutes, max 60 MB, English subtitles if not in English
- [ ] Keep the game under **100 MB** (currently well under 1 MB)
- [ ] Final submission **1 November**, 11:59pm

---

## Backgrounds

The round button in the top right of a level opens the background picker.
Four choices, defined in `js/themes.js`, and your pick is remembered for
every round after.

| Theme | Falling | Optional picture | Fallback colour |
|---|---|---|---|
| Deep Space | nothing - a still screen, and the default | none | dark navy |
| Sakura | cherry blossom petals | `assets/themes/sakura.jpg` | pale blossom pink |
| Forest | leaves | `assets/themes/forest.jpg` | light leaf green |
| Waterfalls | rain | `assets/themes/waterfalls.jpg` | pale aqua |

**The photographs are optional and none of them exist.** Each theme is carried
by its colour and by what falls through it - see **Animated backgrounds** below.
Save a picture with the exact name above and it slots in behind the weather;
until the file exists the browser quietly ignores it and you get the plain
`tint` colour underneath, so a missing picture never breaks anything and never
shows an error.

Adding a fifth is one line in `THEMES`: an `id`, a `name`, a `file`, a
`tint` close to the photo, and a `dim` between 0 and 1.

### Why `dim` matters

Cards and corner labels sit on top of the background. White text on a bright
photograph is unreadable, so every picture theme darkens itself first. The
corner boxes also gain a solid dark backing on any non-space theme - against
the plain dark screen they can be nearly see-through, but over a photo they
cannot.

### Why opening it pauses the clock

Changing the background is decoration. If the clock kept running you would
pay real seconds for using it, so `Themes.toggle()` calls `Game.pause()` and
swiping is blocked until it closes. The clock is a wall clock reading
`Date.now()` against `endsAt`, so pausing is just remembering how much was
left and setting a fresh `endsAt` on the way out. The boss in a duel is
frozen the same way, or a pause would be a free hit.

### Why the tints are light

The little swatch in the picker paints `tint` raw, with no `dim` over it.
Dark tints made the swatches look like holes punched in the panel, so the
three picture themes use pale colours instead. The round itself still lands
dark, because `dim` sits on top of the tint as well as the photo - a 0.6 dim
over pale pink comes out a muted mauve, not a white screen.

The Guide Book shows the same four swatches, read-only, built from this same
list. Add a fifth theme and the Guide Book picks it up on its own.

---

## Animated backgrounds

Sakura drops petals, Forest drops leaves, Waterfalls rains. Deep Space stays
still, which is what makes it the plain default.

This is what the themes were always meant to be. The photographs never turned
up, and **a flat pink screen is not a cherry tree** - so the motion carries the
theme instead, and it needs no image files at all.

**Nothing runs per frame.** Every speck is a span with a CSS keyframe on it and
the browser animates it alone - the same bargain `js/pets.js` makes. The only
JavaScript is the few lines in `js/weather.js` that create the specks and hand
each one a random size, speed, colour and starting point. A round is a fast
game on a cheap phone, and a background that costs frames is a background that
costs you the round.

**Two spans per speck**, and it has to be two: the outer one falls and spins,
the inner one drifts sideways. `transform` is a single property, so one element
cannot do both - the second animation would simply overwrite the first. Running
them separately, at their own speeds, is what stops a screenful of petals
moving like one sheet.

**Rain does not spin.** Petals tumbling is the charm of them; a raindrop turned
the same way spends half its fall lying on its side, which reads as a glitch
rather than as weather. Drops keep one fixed lean, set in CSS on the speck
itself rather than in the animation that owns `transform`.

**The counts are deliberately small** - 18 petals, 14 leaves, 26 drops. Every
speck is a real element the browser composites on every frame, behind a card
you are dragging about. Twenty reads as weather; two hundred reads as a dropped
frame.

Adding weather to a theme is one `fall` in `js/themes.js`:

```js
fall: { kind: 'petal', count: 18,
        colors: ['#ffd7e6', '#ffc0d8', '#ff9ec4', '#fff0f6'] },
```

`kind` is `'petal'`, `'leaf'` or `'drop'`. Anyone who has asked their phone for
less motion gets a still background and none of it is built.

---

## First-time popups

The first time a player opens each screen, a short card pops up saying what
that screen is for. Close it (the button, or tap outside the card) and it
never shows again for that screen. The words are in `js/tips.js`.

| Screen | Popup |
|---|---|
| Guide Book | This is the rulebook; scroll to read, tap Map to start |
| Map | Each circle is a level and a place in your day; tap to play |
| A round | Swipe into the right corner; the four corners in their colours |
| Character | Tap a slot to change gear; +25% for a full set |
| Boss | Same cards as your boss; right hits them, wrong hits you |
| Shop | What each kind of gear does; some unlock by level |

**The round popup pauses the clock.** It opens on top of a round that has
already started, so it calls `Game.pause()` and the clock and swiping stay
frozen until it closes. Without that the very first round of a new player's
life would tick away while they read how to play it.

It hooks into `UI.showScreen()`, which every route onto every screen passes
through, so there is no way in that skips it. Adding a screen's tip is one
entry in `TIPS`, keyed by the screen name. "Reset all progress" brings every
popup back.

---

## Online Boss (not built yet)

The Boss screen shows a fifth card, **Online Boss**, with a dashed outline
and a **Coming soon** badge. Tapping it opens a popup that says plainly it is
not ready yet and why.

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
