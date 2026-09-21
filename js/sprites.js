/* ============================================================
   sprites.js  -  pixel art
   ------------------------------------------------------------
   SWAPPING IN REAL ART LATER (Louis):
   Drop a PNG into assets/sprites/ and uncomment its line below.
   That is the only change needed.

   THE GEAR IS REAL ART NOW. The ten shields and swords used to be
   hand-drawn 16x16 grids further down this file, and next to pets an
   artist drew they looked exactly like what they were. They are now
   sprites from Kenney's Roguelike Characters pack (CC0 - public
   domain, no attribution required, commercial use fine). See
   assets/sprites/CREDITS.md.

   WHY OVERRIDE FILES RATHER THAN NEW GRIDS. This hook was already
   here waiting for exactly this. A PNG needs no palette, no row-length
   check and no canvas; build() hands the path straight to CSS. The old
   grids stay in SPRITE_DATA below as the fallback if a file ever goes
   missing, and cost nothing while a file is present.
   ============================================================ */

var SPRITE_OVERRIDES = {
  // map:    'assets/sprites/map.png',
  // battle: 'assets/sprites/battle.png',
  // steve:  'assets/sprites/sticky-steve.png',
  // carla:  'assets/sprites/clip-carla.png',
  // ivan:   'assets/sprites/inbox-ivan.png',
  // dan:    'assets/sprites/deadline-dan.png',
  // shop:   'assets/sprites/shop.png',
  // bang:  'assets/sprites/bang.png',
  // cal:   'assets/sprites/cal.png',
  // arrow: 'assets/sprites/arrow.png',
  // bin:   'assets/sprites/bin.png',
  // hero:  'assets/sprites/hero.png',

  /* Shields, cheapest to dearest. The ladder is carried by colour and
     then by decoration - plain wood, plain silver, plain gold, then a
     crest, then a crest with a metal rim - so the row of them on the
     shelf reads as a ladder even before you look at the prices. */
  woodshield:        'assets/sprites/wood-shield.png',
  silvershield:      'assets/sprites/silver-shield.png',
  goldshield:        'assets/sprites/gold-shield.png',
  diamondshield:     'assets/sprites/diamond-shield.png',
  diamondgoldshield: 'assets/sprites/diamond-gold-shield.png',

  /* Weapons. Same idea, but the SHAPE climbs as well as the colour:
     a stubby blade, then two full swords, then a broad cleaver, then a
     greatsword. A row of five identical outlines in five colours is a
     palette swap, and a palette swap does not feel like an upgrade. */
  dagger:      'assets/sprites/dagger.png',
  longsword:   'assets/sprites/longsword.png',
  goldsword:   'assets/sprites/gold-sword.png',
  bronzeblade: 'assets/sprites/bronze-blade.png',
  wingedblade: 'assets/sprites/winged-blade.png'
};

/* 16x16 grids. '.' is see-through, every other letter is a colour.

   NO PETS IN HERE at all. The pets are animated sheets an artist drew
   and they live in js/pets.js. The six hand-drawn stand-ins that used
   to sit here - crane, tabby, sloth, dragon, owl and cat - are all
   gone. `cat` outlasted the others because it was the picture the pet
   group fell back to, which is what the "None" slot showed; an empty
   slot is not a pet, so it gets `nopet` instead. */
var SPRITE_DATA = {

  /* The Map tab - an old explorer's chart. Aged paper, a torn brown
     edge, blue sea, tan land and a tiny red marker where you are.
     Override: map   (assets/sprites/map.png)

     A real world map cannot survive 16x16 - real coastlines turn to
     speckle. So the land is three fat blobs that READ as continents at
     20px, which is all a tab icon has to do. Nothing smaller than two
     pixels wide, or it disappears on a phone. */
  map: {
    pal: { E: '#8a5a2b', P: '#e8d5a8', S: '#6f9fb5', L: '#c9a961', R: '#c0392b' },
    px: [
      '................',
      '..EEEEEEEEEEEE..',
      '..EPPPPPPPPPPE..',
      '..EPSSSSSSSSPE..',
      '..EPSLLSSLLLPE..',
      '..EPSLLSLLLLPE..',
      '..EPSSLSLLLLPE..',
      '..EPSSLSSLLSPE..',
      '..EPSLLSSLSSPE..',
      '..EPSLLSSSSSPE..',
      '..EPSSLSSSLLPE..',
      '..EPSRSSSSLLPE..',
      '..EPSSSSSSSSPE..',
      '..EPPPPPPPPPPE..',
      '..EEEEEEEEEEEE..',
      '................'
    ]
  },

  /* The Home tab - a little house with a lit window.
     The map icon used to sit here, and it stopped being true the moment
     the map became what PLAY opens rather than a tab of its own. */
  house: {
    pal: { R: '#c0392b', r: '#8e2820', W: '#e8e0d0', w: '#4a5460',
           G: '#e8c14e', d: '#6e4522' },
    px: [
      '................',
      '.......RR.......',
      '......RRRR......',
      '.....RRRRRR.....',
      '....RRRRRRRR....',
      '...RRRRRRRRRR...',
      '..rRRRRRRRRRRr..',
      '.rrrrrrrrrrrrrr.',
      '..WWWWWWWWWWWW..',
      '..WGGWWWWWWGGW..',
      '..WGGWWddWWGGW..',
      '..WWWWWddWWWWW..',
      '..WGGWWddWWGGW..',
      '..WGGWWddWWGGW..',
      '..WWWWWddWWWWW..',
      '................'
    ]
  },

  /* The Battle tab - crossed swords behind a white shield with a red
     cross, taken from Louis's picture of the knights.
     Override: battle   (assets/sprites/battle.png)

     The photo is a whole melee: forty men, spears, helmets, a dozen
     shields. None of that survives 16x16. The one thing in it that DOES
     read at 20px is the big red-cross shield, so that is the icon, with
     the swords crossed behind it to say "fight" rather than "defend". */
  battle: {
    pal: { m: '#c9ced6', W: '#f0f2f5', R: '#c0392b',
           h: '#6b563c', G: '#e8c14e' },
    px: [
      '.m............m.',
      '..m..........m..',
      '...m........m...',
      '....m......m....',
      '...WWWWWWWWWW...',
      '...WWWWRRWWWW...',
      '...WWWWRRWWWW...',
      '...WRRRRRRRRW...',
      '...WRRRRRRRRW...',
      '...WWWWRRWWWW...',
      '...WWWWRRWWWW...',
      '...WWWWRRWWWW...',
      '....WWWRRWWW....',
      '..h..WWRRWW..h..',
      '.hhh..WWWW..hhh.',
      '..G....WW....G..'
    ]
  },

  /* The Shop tab - a little shopfront: striped awning, a lit window
     and a door with a gold handle.
     Override: shop   (assets/sprites/shop.png)

     The striped awning is doing all the work. A window and a door alone
     could be a house; the red and cream stripes are what say "shop" at
     20px, so they get the widest, boldest part of the grid. */
  shop: {
    pal: { k: '#2a3040', R: '#c0392b', W: '#f2efe6',
           w: '#4a5460', G: '#e8c14e', d: '#8a5a2b' },
    px: [
      '................',
      '..kkkkkkkkkkkk..',
      '.RRWWRRWWRRWWRR.',
      '.RRWWRRWWRRWWRR.',
      '..wwwwwwwwwwww..',
      '..wGGGGGwwwwww..',
      '..wGGGGGwddddw..',
      '..wGGGGGwddddw..',
      '..wGGGGGwddddw..',
      '..wwwwwwwddGdw..',
      '..wwwwwwwddddw..',
      '..wwwwwwwddddw..',
      '..wwwwwwwddddw..',
      '..kkkkkkkkkkkk..',
      '.kkkkkkkkkkkkkk.',
      '................'
    ]
  },

  /* The Guide Book tab - a closed leather tome with a gold clasp and
     a red bookmark hanging out of it.
     Override: book   (assets/sprites/book.png)

     Closed and face-on, not an open book. An open book at 20px is two
     pale rectangles with a line down the middle, which reads as a
     folded note. A closed cover with a spine reads as a book. */
  book: {
    pal: { L: '#7a3b2e', l: '#54271f', G: '#e8c14e', g: '#b08a2a',
           P: '#f2ecdc', R: '#c0392b' },
    px: [
      '................',
      '..lLLLLLLLLLLl..',
      '..lLLLLLLLLLLl..',
      '..lLLGGGGGGLLl..',
      '..lLLGllllGLLl..',
      '..lLLGlGGlGLLl..',
      '..lLLGlGGlGLLl..',
      '..lLLGllllGLLl..',
      '..lLLGGGGGGLLl..',
      '..lLLLLLLLLLLl..',
      '..lLLLLRRLLLLl..',
      '..lLLLLRRLLLLl..',
      '..lLLLLRRLLLLl..',
      '..lPPPPRRPPPPl..',
      '..llllRR..RRlll.',
      '................'
    ]
  },

  /* Online Battle - a little globe: blue sea, green land, pale lines
     of latitude. "The whole world" at 16 pixels.
     Override: globe   (assets/sprites/globe.png) */
  globe: {
    pal: { k: '#1d3d66', S: '#3f86c9', s: '#5fa3dc', L: '#5cc46a', l: '#3f9a4d' },
    px: [
      '................',
      '.....kkkkkk.....',
      '...kkSSSSLLkk...',
      '..kSSSLLLLLSSk..',
      '..kSLLLLLlSSSk..',
      '.kssssLLlsssssk.',
      '.kSSSSSLSSSLLSk.',
      '.kSSSSSSSSLLLSk.',
      '.kSSLLSSSSLLSSk.',
      '.ksLLLLssssLsss.',
      '..kSLLLSSSSSSk..',
      '..kSSLSSSSSSSk..',
      '...kkSSSSSSkk...',
      '.....kkkkkk.....',
      '................',
      '................'
    ]
  },

  /* Do Now - an exclamation. Reads instantly at any size. */
  bang: {
    pal: { c: '#ffffff' },
    px: [
      '................',
      '.....cccccc.....',
      '.....cccccc.....',
      '.....cccccc.....',
      '.....cccccc.....',
      '.....cccccc.....',
      '.....cccccc.....',
      '.....cccccc.....',
      '......cccc......',
      '................',
      '................',
      '.....cccccc.....',
      '.....cccccc.....',
      '.....cccccc.....',
      '................',
      '................'
    ]
  },

  /* Do Later - a calendar */
  cal: {
    pal: { c: '#ffffff', w: '#1d2733' },
    px: [
      '................',
      '...c........c...',
      '...c........c...',
      '.cccccccccccccc.',
      '.cccccccccccccc.',
      '.cwwwwwwwwwwwwc.',
      '.cwccwccwccwwwc.',
      '.cwwwwwwwwwwwwc.',
      '.cwccwccwccwwwc.',
      '.cwwwwwwwwwwwwc.',
      '.cwccwccwwwwwwc.',
      '.cwwwwwwwwwwwwc.',
      '.cccccccccccccc.',
      '................',
      '................',
      '................'
    ]
  },

  /* Give Away - an arrow handing it on */
  arrow: {
    pal: { c: '#ffffff' },
    px: [
      '................',
      '................',
      '................',
      '.........cc.....',
      '..........cc....',
      '...........cc...',
      'cccccccccccccc..',
      'cccccccccccccc..',
      'cccccccccccccc..',
      '...........cc...',
      '..........cc....',
      '.........cc.....',
      '................',
      '................',
      '................',
      '................'
    ]
  },

  /* ---------------- the four Battle rivals ----------------
     Each one is its own drawing, not one figure in four colours.
     They are named after the thing that buries people - a sticky
     note, a paperclip, an inbox, a deadline - so each one IS that
     thing, and you can tell them apart by silhouette alone before
     you have read a single name. */

  /* Sticky Steve: slow and wrong a lot. His head is a sticky note
     with the corner peeling, and there is another stuck to his
     chest that he has clearly forgotten about. Override: steve */
  steve: {
    pal: { Y: '#f2d65c', y: '#cdae3f', W: '#4a3a16',
           o: '#d98b4a', k: '#8a5528' },
    px: [
      '................',
      '..YYYYYYYYYYYY..',
      '..YYYYYYYYYYYY..',
      '..YYWWYYYYWWYY..',
      '..YYWWYYYYWWYY..',
      '..YYYYYYYYYYYY..',
      '..YYYYyyyyYYYY..',
      '..YYYYYYYYYYyy..',
      '...oooooooooo...',
      '..oooooooooooo..',
      '..oooYYYYYYooo..',
      '..oooooooooooo..',
      '...oooooooooo...',
      '....oo....oo....',
      '....kk....kk....',
      '................'
    ]
  },

  /* Clip Carla: quick hands, average judgement. Green hoodie, a
     silver clip in her hair and a row of spares across her chest
     because she is always fastening something. Override: carla */
  carla: {
    pal: { h: '#5a3a22', s: '#f2cfa8', W: '#2a2018', m: '#c6ccd4',
           G: '#3f9a62', g: '#2c6f47', k: '#2a3340' },
    px: [
      '................',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hhssssshhmm..',
      '...hsWsssWshmm..',
      '...hssssssshm...',
      '....sssssss.....',
      '...gGGGGGGGGg...',
      '..gGGGGGGGGGGg..',
      '..gGGmmmmmmGGg..',
      '..gGGGGGGGGGGg..',
      '...gGGGGGGGGg...',
      '....GG....GG....',
      '....GG....GG....',
      '...kkk....kkk...',
      '................'
    ]
  },

  /* Inbox Ivan: rarely wrong, never stops. A stack of paper balanced
     on his head and a full tray in his arms - the man is the pile.
     Override: ivan */
  ivan: {
    pal: { P: '#f0ece0', h: '#2a2a2e', s: '#e8bd94', W: '#2a2018',
           B: '#3f6fae', b: '#2b4f80', k: '#2a3340' },
    px: [
      '....PPPPPPPP....',
      '...PPPPPPPPPP...',
      '....PPPPPPPP....',
      '....hhhhhhhh....',
      '...hssssssssh...',
      '...hsWssssWsh...',
      '...hssssssssh...',
      '....ssssssss....',
      '...bBBBBBBBBb...',
      '..bBBBBBBBBBBb..',
      '..bBPPPPPPPPBb..',
      '..bBPPPPPPPPBb..',
      '..bBBBBBBBBBBb..',
      '....BB....BB....',
      '...kkk....kkk...',
      '................'
    ]
  },

  /* Deadline Dan: the last one, and the only one who is not really a
     person. He is an alarm clock - bells up top, both hands at the
     top of the hour. Time itself, come to sort your desk.
     Override: dan */
  dan: {
    pal: { G: '#e8c14e', k: '#2a2530', C: '#f4efe4',
           R: '#c0392b', r: '#8e2820' },
    px: [
      '..GG........GG..',
      '..GGG......GGG..',
      '...kkkkkkkkkk...',
      '..kCCCCCCCCCCk..',
      '..kCCCCkCCCCCk..',
      '..kCCCCkCCCCCk..',
      '..kCCCkkkkCCCk..',
      '..kCCCCCCCCCCk..',
      '...kkkkkkkkkk...',
      '...rRRRRRRRRr...',
      '..rRRRRRRRRRRr..',
      '..rRRRRRRRRRRr..',
      '...rRRRRRRRRr...',
      '....RR....RR....',
      '...kkk....kkk...',
      '................'
    ]
  },

  /* The old stand-in. Still here as a fallback: a rival added later
     with no `sprite` of its own gets this rather than nothing. */
  rival: {
    pal: { h: '#3a2a4a', s: '#d8a882', W: '#2a2a2a', b: '#c4462f',
           w: '#f0e6d8', d: '#4a3a2a', k: '#2a2018' },
    px: [
      '................',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hssssssssh...',
      '...hsWssssWsh...',
      '...hssssssssh...',
      '....ssssssss....',
      '...bbbbbbbbbb...',
      '..bbbbbbbbbbbb..',
      '..bbwwwwwwwwbb..',
      '..bbwwwwwwwwbb..',
      '..bbbbbbbbbbbb..',
      '....dddddddd....',
      '....dd....dd....',
      '...kkk....kkk...',
      '................'
    ]
  },

  /* The player character - an original design made for this game.
     Override: hero   (assets/sprites/hero.png)

     REDRAWN AT 24x32. It was 16x16, and at 16x16 a person is a blob
     with two dots on it - fine for a tab icon, hopeless blown up to
     104px on the home screen, where it stands next to pets drawn on
     real 48px sheets. Chibi proportions on purpose: a big head and a
     short body, which is what the pets are, so the party looks like it
     came from one game.

     Across the chest is a sash in FOUR COLOURS - red, blue, orange and
     grey - the exact colours of Do Now, Do Later, Give Away and Drop.
     The character wears the four corners. That stripe is the whole idea
     of the design, and it is why the shield is placed to sit below it
     rather than across it.

     Used at every size, from the 20px Me tab to the home screen, so it
     has to read as a person at both. */
  hero: {
    pal: { H: '#3b2a20', h: '#5e4331', B: '#2fb3a8',
           s: '#f2cfa8', W: '#1c1a24', m: '#c4746a',
           J: '#2b3a55',
           R: '#e0524a', L: '#4a86c4', O: '#f2a03d', G: '#8a929e',
           P: '#3a3a46', K: '#6b4a2e' },
    px: [
      '........................',
      '........HHHHHHHH........',
      '.......HHHHHHHHHH.......',
      '......HHhHHHHHHhHH......',
      '......HHHHHHHHHHHH......',
      '......BBBBBBBBBBBB......',
      '......BBBBBBBBBBBB......',
      '......HssssssssssH......',
      '......ssssssssssss......',
      '......ssWWssssWWss......',
      '......ssWWssssWWss......',
      '......ssssssssssss......',
      '......sssssmmsssss......',
      '.......ssssssssss.......',
      '........ssssssss........',
      '.........ssssss.........',
      '.....JJJJJJJJJJJJJJ.....',
      '....JJJJJJJJJJJJJJJJ....',
      '....JJJJJJJJJJJJJJJJ....',
      '....JRRRLLLOOOGGGGJJ....',
      '....JRRRLLLOOOGGGGJJ....',
      '...sJJJJJJJJJJJJJJJJs...',
      '...sJJJJJJJJJJJJJJJJs...',
      '....JJJJJJJJJJJJJJJJ....',
      '.....PPPPPPPPPPPPPP.....',
      '.....PPPPPPPPPPPPPP.....',
      '.....PPPPPP..PPPPPP.....',
      '.....PPPPPP..PPPPPP.....',
      '.....PPPPPP..PPPPPP.....',
      '....KKKKKKK..KKKKKKK....',
      '....KKKKKKK..KKKKKKK....',
      '........................'
    ]
  },

  coin: {
    pal: { G: '#b8860b', Y: '#f2c14e', W: '#fff3c4' },
    px: [
      '................',
      '................',
      '.....GGGGGG.....',
      '...GGYYYYYYGG...',
      '..GGYYYYYYYYGG..',
      '..GYYYYYYYYYYG..',
      '..GYYWYYYYYYYG..',
      '..GYWYYYYYYYYG..',
      '..GYYYYYYYYYYG..',
      '..GGYYYYYYYYGG..',
      '...GGYYYYYYGG...',
      '.....GGGGGG.....',
      '................',
      '................',
      '................',
      '................'
    ]
  },

  /* Golden Shredder - a winged blade: golden feathers spreading from an
     ornate guard, silver blade with a gold core. Override: wingedblade */
  wingedblade: {
    pal: { G: '#e8c14e', g: '#c9a13a', c: '#dfe4ea', m: '#8a6a1e',
           b: '#9aa3ad', w: '#f2f6fa' },
    px: [
      '..G..........G..',
      '.GGG........GGG.',
      'GGGGG..gg..GGGGG',
      '.GGGGggggggGGGG.',
      '..GGGGggggGGGG..',
      '....cccccccc....',
      '....cGmmmmGc....',
      '.....bbwwbb.....',
      '.....bwGGwb.....',
      '.....bwGGwb.....',
      '.....bwGGwb.....',
      '.....bwwwwb.....',
      '......bwwb......',
      '......bwb.......',
      '.......bb.......',
      '.......b........'
    ]
  },

  /* Paper Cutter - a bronze short sword in a studded scabbard.
     Override: bronzeblade */
  bronzeblade: {
    pal: { p: '#b8b0a0', g: '#5a4a32', c: '#9a8a5a',
           b: '#6b5a2a', B: '#b09a4a', s: '#e8d88a' },
    px: [
      '......pppp......',
      '.......pp.......',
      '.......gg.......',
      '.......gg.......',
      '....cccccccc....',
      '....bBBBBBBb....',
      '...bBsBBBBsBb...',
      '...bBBBBBBBBb...',
      '...bBsBBBBsBb...',
      '...bBBBBBBBBb...',
      '...bBsBBBBsBb...',
      '...bBBBBBBBBb...',
      '....bBBBBBBb....',
      '.....bBBBBb.....',
      '......bBBb......',
      '.......bb.......'
    ]
  },

  /* Hole Punch - an ornate golden sword: flared guard with a red gem,
     engraved gold blade. Override: goldsword */
  goldsword: {
    pal: { p: '#8a6a1e', G: '#e8c14e', g: '#4a3a2a', r: '#c4352a',
           b: '#a8801e', y: '#f0d472', e: '#fff0b0' },
    px: [
      '.......pp.......',
      '......pGGp......',
      '......pGGp......',
      '.......gg.......',
      '.......gg.......',
      '.GG..GGGGGG..GG.',
      'GGGGGGGrrGGGGGGG',
      '.GGGGGGGGGGGGGG.',
      '.....bbyybb.....',
      '.....byeeyb.....',
      '.....byeeyb.....',
      '.....byeeyb.....',
      '......byyb......',
      '......byb.......',
      '.......bb.......',
      '.......b........'
    ]
  },

  /* Stapler - a longsword: silver crossguard, leather grip, long blade.
     Override: longsword */
  longsword: {
    pal: { p: '#8a8f96', g: '#4a3a2e', c: '#c8cdd4',
           b: '#a8b0b8', w: '#eef2f6' },
    px: [
      '.......pp.......',
      '......pggp......',
      '.......gg.......',
      '.......gg.......',
      '.......gg.......',
      '..cccccccccccc..',
      '.cc..cccccc..cc.',
      '.......bb.......',
      '......bwwb......',
      '......bwwb......',
      '......bwwb......',
      '......bwwb......',
      '......bwwb......',
      '.......bwb......',
      '.......bb.......',
      '.......b........'
    ]
  },

  /* Red Pen - an engraved dagger. Override: dagger */
  dagger: {
    pal: { d: '#5a5a5e', h: '#9a8f78', b: '#b8bcc2', w: '#e8eaee' },
    px: [
      '.....dddddd.....',
      '.....dhhhhd.....',
      '......dhhd......',
      '......dhhd......',
      '...dddddddddd...',
      '...dhhhhhhhhd...',
      '....dbbbbbbd....',
      '....dbwbbwbd....',
      '.....dbwwbd.....',
      '.....dbwwbd.....',
      '......dbbd......',
      '......dbbd......',
      '.......dbd......',
      '.......dd.......',
      '.......d........',
      '................'
    ]
  },

  /* Diamond and Gold Shield - gems round a gold face. Override: diamondgoldshield */
  diamondgoldshield: {
    pal: { D: '#8a6412', G: '#f0d06a', g: '#c9a13a',
           w: '#ffffff', b: '#bcd4e8' },
    px: [
      '.DDDDDDDDDDDDDD.',
      '.DGGGGGGGGGGGGD.',
      '.DGwbwbwbwbwbGD.',
      '.DGwGGGGGGGGwGD.',
      '.DGbggggggggbGD.',
      '.DGwggGGGGggwGD.',
      '.DGbggGGGGggbGD.',
      '.DGwggggggggwGD.',
      '..DGbggggggbGD..',
      '..DGwggggggwGD..',
      '...DGbggggbGD...',
      '....DGwggwGD....',
      '.....DGbbGD.....',
      '......DGGD......',
      '.......DD.......',
      '................'
    ]
  },

  /* Diamond Shield - faceted gemstone. Override: diamondshield */
  diamondshield: {
    pal: { D: '#6b6458', c: '#e8e0c8', w: '#f8f6ee',
           m: '#a09684', s: '#7d7466' },
    px: [
      '................',
      '.DDDDDDDDDDDDDD.',
      '.DccccccccccccD.',
      '.DcwwwmmmmwwwcD.',
      '.DcwwsmmmmswwcD.',
      '.DcwsmmmmmmswcD.',
      '..DcsmmwwmmscD..',
      '..DcsmmwwmmscD..',
      '...DcsmwwmscD...',
      '...DcsmwwmscD...',
      '....DcsmmscD....',
      '.....DcsscD.....',
      '......DccD......',
      '.......DD.......',
      '................',
      '................'
    ]
  },

  /* Gold Shield - embossed gold disc. Override: goldshield */
  goldshield: {
    pal: { D: '#8a6412', g: '#c9a13a', G: '#f0d06a',
           h: '#fff0b8', k: '#6b4a0c' },
    px: [
      '.....DDDDDD.....',
      '...DDggggggDD...',
      '..DggGGGGGGggD..',
      '.DggGGkkkkGGggD.',
      '.DgGGkkGGGGkkGD.',
      'DggGkkGhhhhGkkgD',
      'DgGGkGhhGGhhGkGD',
      'DgGGkGhGGGGhGkGD',
      'DgGGkGhhGGhhGkGD',
      'DggGkkGhhhhGkkgD',
      '.DgGGkkGGGGkkGD.',
      '.DggGGkkkkGGggD.',
      '..DggGGGGGGggD..',
      '...DDggggggDD...',
      '.....DDDDDD.....',
      '................'
    ]
  },

  /* Silver Shield - riveted steel. Override: silvershield */
  silvershield: {
    pal: { D: '#6f7680', k: '#4a5058', r: '#9aa3ad',
           s: '#c3ccd6', h: '#eef2f6' },
    px: [
      '.DDDDDDDDDDDDDD.',
      '.DkssssssssssskD',
      '.DsssrrrrrrsssD.',
      '.DksssshhsssskD.',
      '.DssssshhsssssD.',
      '.DksssshhsssskD.',
      '.DssssshhsssssD.',
      '.DksssshhsssskD.',
      '..DsssshhssssD..',
      '...DssshhsssD...',
      '....DsshhssD....',
      '.....DshhsD.....',
      '......DhhD......',
      '.......DD.......',
      '................',
      '................'
    ]
  },

  /* Wood Shield - bronze rim, winged emblem. Override: woodshield */
  woodshield: {
    pal: { R: '#6e4522', r: '#a06a3a', w: '#4a5348',
           G: '#c9a03a', g: '#e8c464', b: '#7a5a28' },
    px: [
      '.....RRRRRR.....',
      '...RRrrrrrrRR...',
      '..RrrwwwwwwrrR..',
      '.RrwwwwwwwwwwrR.',
      '.RrwwwGwwGwwwrR.',
      'RrwwGGGwwGGGwwrR',
      'RrwGGGgbbgGGGwrR',
      'RrwGGGgbbgGGGwrR',
      'RrwwGGGGGGGGwwrR',
      'RrwwwGwGGwGwwwrR',
      '.RrwwwGwwGwwwrR.',
      '.RrwwwwwwwwwwrR.',
      '..RrrwwwwwwrrR..',
      '...RRrrrrrrRR...',
      '.....RRRRRR.....',
      '................'
    ]
  },






  /* The empty pet slot. Not a creature - the pets are all real sprite
     sheets in js/pets.js now, and the shop's "None" was still showing a
     hand-drawn cat that had stopped being one of them. A dashed outline
     says "nothing here" without pretending to be an animal you could
     own. */
  /* The empty ARMOUR and WEAPON slots. Same dashed frame as `nopet`:
     an empty slot is a gap in your kit, and drawing it as a greyed-out
     shield or a greyed-out sword says the opposite - it says you are
     wearing something dull. The frame says there is nothing here yet.

     These two used to fall back to the `shield` and `sword` group
     pictures. That read as a hand-drawn blade parked in the row next to
     five real ones, which made the real ones look worse than they are. */
  noarm: {
    pal: { d: '#5d6675' },
    px: [
      '................',
      '....dd..dd..dd..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '....dd..dd..dd..',
      '................'
    ]
  },

  nowep: {
    pal: { d: '#5d6675' },
    px: [
      '................',
      '....dd..dd..dd..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '....dd..dd..dd..',
      '................'
    ]
  },

  nopet: {
    pal: { d: '#5d6675' },
    px: [
      '................',
      '....dd..dd..dd..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '................',
      '..d..........d..',
      '..d..........d..',
      '....dd..dd..dd..',
      '................'
    ]
  },

  shield: {
    pal: { S: '#8f97a3', s: '#4a86c4', W: '#ffffff' },
    px: [
      '................',
      '..SSSSSSSSSSSS..',
      '..SssssssssssS..',
      '..SsssswwssssS..',
      '..SsssWWWWsssS..',
      '..SsssswwssssS..',
      '..SssssssssssS..',
      '...SssssssssS...',
      '....SssssssS....',
      '.....SssssS.....',
      '......SssS......',
      '.......SS.......',
      '................',
      '................',
      '................',
      '................'
    ]
  },

  sword: {
    pal: { b: '#cfd6de', g: '#f2c14e', h: '#8a5a2e' },
    px: [
      '................',
      '............bb..',
      '...........bbb..',
      '..........bbbb..',
      '.........bbbb...',
      '........bbbb....',
      '.......bbbb.....',
      '......bbbb......',
      '.....bbbb.......',
      '....bbbb........',
      '..ggbbbgg.......',
      '...hhbb.........',
      '...hhh..........',
      '..hhh...........',
      '................',
      '................'
    ]
  },

  /* Drop - a bin */
  bin: {
    pal: { c: '#ffffff', w: '#1d2733' },
    px: [
      '................',
      '......cccc......',
      '...cccccccccc...',
      '...cccccccccc...',
      '....cccccccc....',
      '....cwcccwcc....',
      '....cwcccwcc....',
      '....cwcccwcc....',
      '....cwcccwcc....',
      '....cwcccwcc....',
      '....cwcccwcc....',
      '....cwcccwcc....',
      '....cccccccc....',
      '................',
      '................',
      '................'
    ]
  }
};

var Sprites = (function () {
  var cache = {};

  function build(name) {
    if (SPRITE_OVERRIDES[name]) return SPRITE_OVERRIDES[name];

    var def = SPRITE_DATA[name];
    if (!def) { console.warn('[sprites] unknown sprite: ' + name); return ''; }

    /* A grid reads its own size off its rows rather than assuming 16x16.
       Sixteen pixels is fine for an icon, and far too few for a person:
       the hero is drawn at 104px on the home screen, which was six and a
       half screen pixels per art pixel. */
    var h = def.px.length;
    var w = def.px[0].length;

    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');

    for (var y = 0; y < h; y++) {
      var row = def.px[y] || '';
      if (row.length !== w) {
        console.warn('[sprites] ' + name + ' row ' + y + ' is ' + row.length + ' px, expected ' + w);
      }
      for (var x = 0; x < w; x++) {
        var col = def.pal[row.charAt(x)];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return cv.toDataURL('image/png');
  }

  return {
    get: function (name) {
      if (!(name in cache)) cache[name] = build(name);
      return cache[name];
    },
    /** Puts the picture called `name` on `el`.

        A pet is not one of these 16x16 grids - it is an animated sheet
        an artist drew, and js/pets.js plays it. Rather than make every
        caller ask which kind of picture it is about to draw, this one
        function knows, and hands a pet straight over. `box` is how many
        pixels across the picture should come out; it only matters for a
        pet, because a flat sprite just fills whatever box CSS gave it. */
    apply: function (el, name, box) {
      if (window.Pets && Pets.has(name)) {
        Pets.apply(el, name, box);
        return;
      }
      /* Coming back from a pet: drop the frame it left behind, or the
         creature would still be standing there under the new picture. */
      if (el.firstChild) el.innerHTML = '';
      el.classList.remove('pet-art');
      el.style.backgroundImage = 'url("' + this.get(name) + '")';
      el.classList.add('px-art');
    }
  };
})();
