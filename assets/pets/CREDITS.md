# Pet sprites

The thirteen pets in the shop, brought over from MyTask. Every one is a real
sprite sheet; how they are played is in `js/pets.js`.

The owner of this repository has confirmed they hold the redistribution rights
for all thirteen. The two entries below carry the attribution recorded in
MyTask, because the artists earned it and one of them asks for it by name.

---

## phoenix.png — Phoenixling

- **Artist:** Elthen (Ahmet Avci) — [Elthen's Pixel Art Shop](https://elthen.itch.io/2d-pixel-art-phoenixling-sprites)
- **Licence:** free ("name your own price"). Commercial use permitted.
- **Attribution:** not required, but the artist asks nicely, so it is recorded here.

640x112, a grid of 40x56 cells. Row 0 is `idle`, 4 frames — the only row this
game plays. Row 1 is a 16-frame `rebirth` that Task Sorter has no use for yet:
the bird collapses into flame, burns to ash, an egg forms and cracks, and it
bursts back out. It is sitting in the file if a hatching screen ever wants it.

The frames came from the store page's public preview, which renders at 5x, so
this is a faithful copy of the preview rather than the full product. The real
download has six animations at a clean 64x64 and is one free click away on the
page above — dropping it in here would be a straight improvement.

## dragon.png — Dragon

- **Artist:** Cethiel — [Dragon – Fully Animated](https://opengameart.org/content/dragon-fully-animated)
- **Licence:** CC0 (public domain). No attribution required; credited anyway.

Not pixel art at heart. Cethiel drew and bone-animated it, and it ships as
1,197 PNG frames at 725x445 — 139 MB, and far too smooth to sit beside the
Phoenixling. What is here is a reduction to 16 frames of 83x48, using the
walking animation rather than either idle, because at pet size the idles are a
statue. It still reads as a shrunken painting rather than placed pixels, and
next to the Phoenixling that shows.

---

## The other eleven

`bunny` `duck` `flame_sprite` `hatchling` `kitten` `mushroom` `penguin`
`polar_bear` `slime` `teddy_bear` `zombie`

These carried no recorded artist or licence in MyTask. They are published here
on the repository owner's confirmation that the rights allow it. **If you know
where any of them came from, record it here** — an artist named is an artist
credited, and the contest submission is stronger for it.

---

## Sizes

`js/pets.js` holds each sheet's cell size, frame count and frame rate, plus two
numbers that matter more than they look: `body`, the box the creature actually
fills, and `offset`, how far it sits below the middle of its cell. A cell is
not a creature — the Phoenixling is a 23x21 bird adrift in a 40x56 canvas — and
scaling by the cell instead of the body is what makes one pet come out half the
size of the rest.
