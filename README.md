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
| `index.html` | The four screens (title, levels, play, end) |
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
| `js/battle.js` | **The rivals** you duel in Battle |
| `js/main.js` | Boots the game, draws the level map, wires the buttons |
| `serve.ps1` | Local server for phone testing |
| `archive/` | The old Focus Village build, kept for reference |

No frameworks, no build step, no network calls. Sounds are generated in code,
so there are no audio files at all.

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
during the round. **If you FAILED, the reason is all you get** - the right
corner is held back until you pass, so the retry is where the thinking
happens instead of you being handed the answer and forgetting it. A banner mid-round is unreadable at speed and it covers
the card you are meant to be looking at. This is still the line that does
the teaching, so write it properly. If you cannot write a
`why` that convinces you, cut the card.

There are **116 cards**: 32 house, and 28 each for school, phone and out.
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
- `boxes` - which corners exist yet. **Level 1 has no Give Away cards at all**,
  so players learn three corners before the fourth shows up
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

## Battle

The third tab. A **1 v 1 sorting duel** against the computer — not a separate
fighting game. Both of you sort the same cards:

- You sort one **right** → you hit them (12 damage, 18 if you were fast)
- You sort one **wrong** → they hit you (10 damage)
- They sort one right on their own clock → they hit you

Two health bars, a 60 second clock. First bar to empty loses; if the clock runs
out, whoever has more health wins.

### The rivals

| Rival | Is | Sorts | Accuracy | Damage |
|---|---|---|---|---|
| Sticky Steve | a sticky note with a face | one every 2.6s | 60% | 9 |
| Clip Carla | paperclips in her hair | one every 2.0s | 72% | 10 |
| Inbox Ivan | buried under his own paperwork | one every 1.5s | 82% | 11 |
| Deadline Dan | an alarm clock, not a person | one every 1.1s | 92% | 13 |

Each rival has its own drawing, named by `sprite` on the opponent. They are
all named after the thing that buries people, so each one IS that thing - you
can tell them apart by silhouette before reading a name. A rival added without
a `sprite` falls back to the plain stand-in figure.

They unlock one at a time. Winning pays 120 coins plus 60 per rival; losing
still pays 20% of that, so a hard fight is never a total waste.

Your **weapon** from the shop multiplies your damage, so gear matters here more
than anywhere else.

Everything is in `js/battle.js` — adding a rival is one entry with a `speed` and
an `accuracy`.

---

## The Character screen

The second tab. Your character stands in the centre with three gear slots
around them — **Pet**, **Weapon** and **Armour** — and three stat bars
underneath showing what you are currently carrying:

- **Clock speed** — how fast your round runs out (from your pet)
- **Coins** — what you earn at the end of a round (pet + full set)
- **Mistakes covered** — wrong answers that will not count (from your armour)
- **Points** — what each card is worth (from your weapon)

Tap a slot and a picker opens showing everything you own of that kind. Pick
one and the stat bars update straight away.

Buying happens in the Shop, choosing happens here. `js/hero.js` holds this
screen; it reads the same item list as the shop, so adding an item to
`js/shop.js` makes it appear in both places automatically.

---

## The shop

Reached from the **bottom bar** (Map / Character / Battle / Shop). Three kinds of gear, and
**every item changes how a round actually plays** — nothing is decoration.

| Kind | What it does | Items |
|---|---|---|
| **Pets** | More coins, but a faster clock | Paper Crane, Ink Cat, Sleepy Sloth, Desk Dragon, Time Owl |
| **Armour** | Covers wrong answers so they do not count | Wood, Silver, Gold, Diamond, Diamond and Gold Shield |
| **Weapons** | More points, and more battle damage | Red Pen, Stapler, Hole Punch, Paper Cutter, Golden Shredder |

One of each can be worn at a time. Everything is defined in `js/shop.js`;
`fast`, `coin`, `block` and `mult` are the only four things an item can do,
so adding an item is one line.

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
- `needsRival: 2` — you must have **beaten the second rival** in Battle

A locked tile shows the reason on its price tag (*"Reach level 3"*,
*"Beat Clip Carla"*) rather than just going grey, so you always know what to go
and do. The top item in each group is gated behind a **battle**, which is what
gives Battle mode a purpose beyond coins.

There are 18 items: six per group, five of them buyable.

### The full-set bonus

Wear a pet **and** armour **and** a weapon at the same time and every coin
payout goes up by **25%** — levels and battles both.

It is deliberately about filling all three slots rather than owning expensive
gear, so the cheapest full set (Paper Crane + Folder + Red Pen, 370 coins) earns
the bonus just as well as the priciest one. That gives a new player something
reachable to aim for instead of grinding for one costly item.

The Character screen shows a gold **Full set!** banner when it is active, and a
greyed-out reminder when it is not. `setBonus` in `js/shop.js` controls it.

### Coins

You earn coins by finishing a level:

```
coins = score / 200  +  grade bonus (S 60, A 40, B 25, C 10)
```

Both numbers live in `COIN_REWARD` in `js/shop.js`. A typical good round pays
roughly 100-150 coins, so the cheapest item is about one round away and the
best is a proper grind. **Worth re-checking once real people play it** — the
gap between a careless and an expert run is wide, so the payout may need
tuning.

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

| Theme | Picture |
|---|---|
| Theme | Picture | Fallback colour |
|---|---|---|
| Deep Space | none - the plain dark screen, and the default | dark navy |
| Sakura | `assets/themes/sakura.jpg` | pale blossom pink |
| Forest | `assets/themes/forest.jpg` | light leaf green |
| Waterfalls | `assets/themes/waterfalls.jpg` | pale aqua |

Save a picture with the exact name above and it appears. **Until the file
exists the browser quietly ignores it and you get the plain `tint` colour
underneath**, so a missing picture never breaks anything and never shows an
error. Add them one at a time if you like.

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
left and setting a fresh `endsAt` on the way out. The rival in a duel is
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
| Battle | Same cards as your rival; right hits them, wrong hits you |
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

## Online Battle (not built yet)

The Battle screen shows a fifth card, **Online Battle**, with a dashed outline
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
