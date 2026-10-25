/* ============================================================
   actors.js  -  everyone with a body
   ------------------------------------------------------------
   Your character, your pets, and the four bosses, as things that
   stand in the world and react to what happens to them - rather
   than pictures pinned to a page.

   YOUR CHARACTER WAS MISSING FROM THE ONE PLACE IT MATTERED. In the
   old game you could see your hero on the home screen and on the gear
   page, and then a round started - the only part of the game you
   actually PLAY - and they vanished. The shield you saved up for
   protected you from mistakes in a round you could not see yourself
   in. Now the hero stands in the arena: they lean into a good sort,
   flinch at a bad one, and the shield you bought comes up as a bubble
   when it saves you.

   THE GEAR IS WORN, NOT LISTED. The figure is composited the same way
   js/hero.js composited it in HTML - the 24x32 hero, the shield on the
   off arm, the weapon in the near hand, at the same percentages - so
   whatever you equip in the shop is what is standing here.
   ============================================================ */

var Actors = (function () {

  /** Whatever is equipped in `kind`, as the shop item. */
  function equipped(kind) {
    var id = Progress.equipped()[kind];
    var list = SHOP[kind].items;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  function shadow(c, x, y, w, a) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,' + (a === undefined ? 0.35 : a) + ')';
    c.beginPath();
    c.ellipse(x, y, w, w * 0.26, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /* ================= the hero ================= */

  function Hero(o) {
    o = o || {};
    this.x = o.x || 0;
    this.y = o.y || 0;          // where the feet are
    this.k = o.k || 3;          // screen pixels per art pixel
    this.t = Math.random() * 5000;
    this.sq = Spring.make(1);   // squash: <1 squashed, >1 stretched
    this.lean = Spring.make(0); // radians
    this.kx = Spring.make(0);   // knockback, px
    this.hop = 0; this.vy = 0;
    this.flash = 0; this.flashColor = '#ffffff';
    this.bubble = 0;            // the shield, when it saves you
    this.walk = 0;              // 0..1, how much they are walking
    this.face = 1;
    this.down = 0;              // knocked out, 0..1
    this.withPet = o.withPet !== false;
    this.name = o.name || '';
    this.pet = null;
    this.refresh();
  }

  /** Re-reads what is worn. Called after anything in the shop changes. */
  Hero.prototype.refresh = function () {
    var arm = equipped('armour'), wep = equipped('weapon'), pet = equipped('pet');
    this.armour = arm.cost !== 0 ? arm.sprite : null;
    this.weapon = wep.cost !== 0 ? wep.sprite : null;
    var petKey = pet.cost !== 0 ? pet.sprite : null;
    if (this.withPet && petKey) {
      if (!this.pet || this.pet.key !== petKey) {
        var px = this.pet ? this.pet.x : this.x - this.k * 22;
        this.pet = new Pet(petKey, { x: px, y: this.y, box: this.k * 18 });
        this.pet.owner = this;
      }
    } else this.pet = null;
  };

  /** A good sort: a little hop and a stretch. `power` 0..1. */
  Hero.prototype.cheer = function (power) {
    power = power === undefined ? 0.6 : power;
    if (this.hop <= 0.5) this.vy = -(220 + 260 * power);
    Spring.kick(this.sq, 3 * power);
    if (this.pet) this.pet.cheer(power);
  };
  /** Leans toward the corner a card just went into. -1 left, 1 right. */
  Hero.prototype.throwTo = function (dir) {
    Spring.kick(this.lean, dir * 7);
    this.face = dir || this.face;
  };
  Hero.prototype.hurt = function (dir) {
    this.flash = 1; this.flashColor = '#ff5a4a';
    Spring.kick(this.kx, (dir || -1) * 380);
    Spring.kick(this.sq, -4);
    Spring.kick(this.lean, (dir || -1) * 6);
  };
  Hero.prototype.block = function () {
    this.bubble = 1;
    this.flash = 0.7; this.flashColor = '#9fd4ff';
    Spring.kick(this.sq, -2);
  };
  Hero.prototype.knockOut = function () {
    var self = this;
    this.flash = 1; this.flashColor = '#ff5a4a';
    Tween.to(this, { down: 1 }, 600, { ease: Ease.outBounce });
    void self;
  };

  Hero.prototype.update = function (dt) {
    this.t += dt;
    var s = dt / 1000;
    if (this.hop > 0 || this.vy < 0) {
      this.vy += 2200 * s;
      this.hop -= this.vy * s;
      if (this.hop <= 0) {
        this.hop = 0;
        /* Land with a squash proportional to how hard they came down. */
        if (this.vy > 120) Spring.kick(this.sq, -this.vy / 140);
        this.vy = 0;
      }
    }
    Spring.step(this.sq, 1, dt, 380, 14);
    Spring.step(this.lean, 0, dt, 200, 16);
    Spring.step(this.kx, 0, dt, 160, 18);
    this.flash = Math.max(0, this.flash - dt / 260);
    this.bubble = Math.max(0, this.bubble - dt / 700);
    if (this.pet) this.pet.update(dt);
  };

  /** The figure, feet at (x + knockback, y - hop). */
  Hero.prototype.draw = function (c, o) {
    o = o || {};
    var k = this.k;
    var w = 24 * k, h = 32 * k;
    var fx = this.x + this.kx.x;
    var fy = this.y - this.hop;
    var breathe = Math.sin(this.t / 520) * 0.018;
    var bob = this.walk > 0 ? Math.abs(Math.sin(this.t / 110)) * k * 1.4 * this.walk : Math.sin(this.t / 950) * k * 0.5;

    if (this.pet && this.pet.x < this.x) this.pet.draw(c);

    shadow(c, this.x + this.kx.x, this.y + 2, w * 0.42 * (1 - Math.min(0.5, this.hop / 300)), 0.32);

    c.save();
    c.translate(fx, fy - bob);
    var sy = this.sq.x + breathe, sx = 1 / Math.max(0.6, this.sq.x + breathe * 0.5);
    c.rotate(this.lean.x * 0.05 + this.down * -1.45);
    c.scale(sx * (this.face < 0 && o.canFlip ? -1 : 1), sy);
    var left = -w / 2, top = -h;
    var flash = this.flash > 0 ? { tint: this.flashColor, tintAmt: this.flash * 0.8 } : {};

    Gfx.drawSprite(c, 'hero', 0, top + h / 2, w, h, flash);

    if (this.armour) {
      Gfx.drawSprite(c, this.armour, left + 0, top + h * 0.62, w * 0.34, w * 0.34,
        { rot: -8 * Math.PI / 180, tint: flash.tint, tintAmt: flash.tintAmt });
    }
    if (this.weapon) {
      Gfx.drawSprite(c, this.weapon, left + w * 0.93, top + h * 0.53, w * 0.4, w * 0.4,
        { rot: 28 * Math.PI / 180 + this.lean.x * 0.08, tint: flash.tint, tintAmt: flash.tintAmt });
    }
    c.restore();

    if (this.bubble > 0) {
      /* The shield coming up to cover you. A ring and a sheen, so it
         reads as glass and not as a blue blob. */
      var r = h * 0.62 * (1 + (1 - this.bubble) * 0.25);
      c.save();
      c.globalAlpha = this.bubble;
      c.fillStyle = 'rgba(120,190,255,.22)';
      c.beginPath(); c.arc(fx, fy - h * 0.5, r, 0, Math.PI * 2); c.fill();
      c.lineWidth = 3; c.strokeStyle = 'rgba(190,230,255,.95)';
      c.stroke();
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.7)';
      c.beginPath(); c.arc(fx, fy - h * 0.5, r * 0.78, -2.4, -1.6); c.stroke();
      c.restore();
    }

    if (this.pet && this.pet.x >= this.x) this.pet.draw(c);

    if (o.nameTag && this.name) {
      /* a HELLO MY NAME IS sticker, stuck on a little crooked */
      var ty = this.y + 30;
      var tw = Math.max(96, Gfx.measure(c, this.name, { size: 18, weight: 700 }) + 28);
      c.save();
      c.translate(this.x, ty); c.rotate(-0.05);
      c.fillStyle = 'rgba(46,24,6,.35)'; c.fillRect(-tw / 2 + 2, -18, tw, 40);
      c.fillStyle = '#fffdf6'; c.fillRect(-tw / 2, -20, tw, 40);
      c.fillStyle = '#c2412f'; c.fillRect(-tw / 2, -20, tw, 12);
      Gfx.text(c, 'HELLO, MY NAME IS', 0, -14, { font: 'mono', size: 6.5, color: '#fff' });
      Gfx.text(c, this.name, 0, 7, { size: 18, weight: 700, color: '#1f2a44', maxW: tw - 12 });
      c.restore();
    }
  };

  /** The rough box the figure covers, for anything that wants to aim
      at the hero - a boss's attack, a coin flying home. */
  Hero.prototype.centre = function () {
    return { x: this.x + this.kx.x, y: this.y - this.hop - 16 * this.k };
  };

  /* ================= a pet ================= */

  function Pet(key, o) {
    o = o || {};
    this.key = key;
    this.x = o.x || 0; this.y = o.y || 0;
    this.box = o.box || 48;
    this.frame = Math.random() * 10; this.ft = 0;
    this.face = -1;             // sheets are drawn facing left
    this.hop = 0; this.vy = 0;
    this.sq = Spring.make(1);
    this.mode = o.mode || 'follow';
    this.minX = o.minX || 0; this.maxX = o.maxX || 0;
    this.target = this.x; this.rest = 0; this.speed = o.speed || 40;
    this.owner = null;
    this.vx = 0;
  }
  Pet.prototype.cheer = function (power) {
    if (this.hop <= 0.5) this.vy = -(160 + 200 * (power || 0.5));
  };
  Pet.prototype.update = function (dt) {
    var s = dt / 1000;
    var fps = Gfx.petFps(this.key), n = Gfx.petFrames(this.key);
    this.ft += dt;
    if (this.ft > 1000 / fps) { this.ft = 0; this.frame = (this.frame + 1) % n; }

    var prev = this.x;
    if (this.mode === 'follow' && this.owner) {
      /* Trails its owner at a pet's distance, on whichever side it was
         already on, so a hero walking right does not have a dog teleport
         through them to the other side. */
      var side = this.x < this.owner.x ? -1 : 1;
      var want = this.owner.x + side * (this.gap || this.owner.k * 21);
      this.x += (want - this.x) * Math.min(1, s * 6);
      this.y = this.owner.y;
    } else if (this.mode === 'wander') {
      /* Pottering about: walk to a spot, stand a while, pick another. */
      if (this.rest > 0) this.rest -= dt;
      else {
        var d = this.target - this.x;
        if (Math.abs(d) < 2) {
          this.rest = 600 + Math.random() * 2600;
          this.target = this.minX + Math.random() * (this.maxX - this.minX);
        } else this.x += Math.max(-1, Math.min(1, d)) * this.speed * s;
      }
    }
    this.vx = (this.x - prev) / Math.max(0.001, s);
    if (Math.abs(this.vx) > 4) this.face = this.vx > 0 ? 1 : -1;

    if (this.hop > 0 || this.vy < 0) {
      this.vy += 2000 * s;
      this.hop -= this.vy * s;
      if (this.hop <= 0) { this.hop = 0; if (this.vy > 80) Spring.kick(this.sq, -this.vy / 160); this.vy = 0; }
    }
    Spring.step(this.sq, 1, dt, 380, 14);
  };
  Pet.prototype.draw = function (c) {
    shadow(c, this.x, this.y + 2, this.box * 0.36 * (1 - Math.min(0.5, this.hop / 200)), 0.28);
    Gfx.drawPet(c, this.key, this.x, this.y - this.hop, this.box, this.frame, {
      flipX: this.face > 0, sy: this.sq.x, sx: 1 / Math.max(0.6, this.sq.x)
    });
  };

  /* ================= a boss ================= */

  function Foe(def, o) {
    o = o || {};
    this.def = def;
    this.sprite = def.sprite || 'rival';
    this.x = o.x || 0; this.y = o.y || 0;   // centre
    this.size = o.size || 96;
    this.t = Math.random() * 5000;
    this.sq = Spring.make(1);
    this.lunge = Spring.make(0);
    this.kx = Spring.make(0);
    this.flash = 0; this.flashColor = '#ffffff';
    this.charge = 0;     // 0..1, the swing winding up
    this.ko = 0;
    this.sweat = 0;
  }
  Foe.prototype.attack = function () {
    Spring.kick(this.lunge, 900);
    Spring.kick(this.sq, 3);
  };
  Foe.prototype.fumble = function () {
    this.sweat = 1;
    Spring.kick(this.sq, -3);
    Spring.kick(this.kx, 90);
  };
  Foe.prototype.hurt = function (power) {
    this.flash = 1; this.flashColor = '#ffffff';
    Spring.kick(this.kx, (Math.random() < 0.5 ? -1 : 1) * (220 + 260 * (power || 0.5)));
    Spring.kick(this.sq, -4);
  };
  Foe.prototype.knockOut = function () {
    this.flash = 1;
    Tween.to(this, { ko: 1 }, 900, { ease: Ease.inQuad });
  };
  Foe.prototype.update = function (dt) {
    this.t += dt;
    Spring.step(this.sq, 1, dt, 300, 12);
    Spring.step(this.lunge, 0, dt, 240, 16);
    Spring.step(this.kx, 0, dt, 180, 14);
    this.flash = Math.max(0, this.flash - dt / 200);
    this.sweat = Math.max(0, this.sweat - dt / 900);
  };
  Foe.prototype.draw = function (c) {
    var s = this.size;
    var sway = Math.sin(this.t / 700) * 0.06;
    var bob = Math.sin(this.t / 430) * s * 0.025;
    /* Winding up: they draw back, a little bigger and a little redder,
       which is the warning that a swing is coming. */
    var wind = this.charge > 0.75 ? (this.charge - 0.75) / 0.25 : 0;
    var x = this.x + this.kx.x, y = this.y + bob + this.lunge.x * 0.06 - wind * s * 0.06;
    shadow(c, this.x, this.y + s * 0.5, s * 0.36 * (1 - this.ko * 0.8), 0.3);
    c.save();
    c.translate(x, y + this.ko * s * 0.9);
    c.rotate(sway + this.ko * 2.6);
    var sq = this.sq.x + wind * 0.08;
    c.scale(1 / Math.max(0.6, sq), sq);
    c.globalAlpha = 1 - this.ko * 0.85;
    Gfx.drawSprite(c, this.sprite, 0, 0, s, s, {
      tint: this.flash > 0 ? this.flashColor : (wind > 0 ? '#ff6a5a' : null),
      tintAmt: this.flash > 0 ? this.flash : wind * 0.35
    });
    c.restore();
    if (this.sweat > 0) {
      c.save();
      c.globalAlpha = this.sweat;
      c.fillStyle = '#9fd4ff';
      var dx = x + s * 0.42, dy = y - s * 0.32 + (1 - this.sweat) * 14;
      c.beginPath();
      c.moveTo(dx, dy - 7); c.quadraticCurveTo(dx + 6, dy + 2, dx, dy + 5); c.quadraticCurveTo(dx - 6, dy + 2, dx, dy - 7);
      c.fill();
      c.restore();
    }
  };
  Foe.prototype.centre = function () {
    return { x: this.x + this.kx.x, y: this.y };
  };

  return {
    Hero: Hero,
    Pet: Pet,
    Foe: Foe,
    equipped: equipped,
    shadow: shadow
  };
})();
