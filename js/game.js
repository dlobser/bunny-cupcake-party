'use strict';
// Sarah's Cupcake Party: story, characters, guide arrow, camera, HUD.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const view = { w: 0, h: 0, dpr: 1, baseZoom: 1, hud: 1 };
let ground = null, groundScale = 0;
const DEBUG = /[?&]debug/.test(location.search);

const SPEED = 165;   // slow and bouncy
const COLORS = ['#ff6b8a', '#6bc5ff', '#ffd23f', '#7bd88f', '#c28bff', '#ff9f43', '#5ad1c4', '#ff7bd5'];

const ANIMALS = {
  turtle:    { touchR: 74,  sound: 'squeak', speed: 95,  spacing: 60,  h: 46,  balloon: '#ff6b8a', bx: 22 },
  goose:     { touchR: 108, sound: 'honk',   speed: 150, spacing: 70,  h: 74,  balloon: '#ffd23f', bx: 14, water: 'pond' },
  dog:       { touchR: 76,  sound: 'bark',   speed: 170, spacing: 78,  h: 60,  balloon: '#6bc5ff', bx: 22 },
  alpaca:    { touchR: 86,  sound: 'hum',    speed: 140, spacing: 95,  h: 128, balloon: '#c28bff', bx: 30 },
  alligator: { touchR: 116, sound: 'gator',  speed: 120, spacing: 185, h: 44,  balloon: '#ff9f43', bx: 48, water: 'creek' },
  fox:       { touchR: 86,  sound: 'yip',    speed: 170, spacing: 78,  h: 58,  balloon: '#7bd88f', bx: 16 },
  chickens:  { touchR: 84,  sound: 'cluck',  speed: 130, spacing: 75,  h: 50,  balloon: '#ff7bd5', bx: 0 },
  cow:       { touchR: 100, sound: 'moo',    speed: 110, spacing: 130, h: 108, balloon: '#5ad1c4', bx: 52 },
};
const FRIENDS = ['turtle', 'goose', 'dog', 'alpaca', 'alligator', 'fox', 'chickens', 'cow'];
const ITEMS = ['flour', 'oil', 'egg', 'milk'];
const SEATS = { sarah: { x: 612, y: 412 }, dad: { x: 768, y: 412 }, mommy: { x: 690, y: 300 }, hug: { x: 576, y: 414 } };
const PARTY_POS = {
  chickens: { x: 505, y: 300 }, fox: { x: 510, y: 480 }, goose: { x: 590, y: 540 }, dog: { x: 668, y: 548 },
  alligator: { x: 830, y: 540 }, cow: { x: 895, y: 420 }, alpaca: { x: 880, y: 262 },
};
// bedtime: where Mommy and Daddy wait by the bed, and where each animal curls up
const SLEEP_WAIT = { mommy: { x: 292, y: 340 }, dad: { x: 160, y: 340 } };
const SLEEP_POS = {
  turtle: { x: 215, y: 318 }, fox: { x: 140, y: 405 }, chickens: { x: 352, y: 322 }, dog: { x: 355, y: 405 },
  goose: { x: 160, y: 478 }, cow: { x: 270, y: 455 }, alpaca: { x: 352, y: 505 }, alligator: { x: 250, y: 552 },
};

const G = {
  t: 0, phase: 'title', cut: null, sleepT: 0, fade: 0, lastTink: 0,
  cam: { x: 430, y: 330, zoom: 1 },
  guide: { target: null, path: null, timer: 0, dir: null, dirS: null, dist: 0, friend: null },
};
window.G = G;

// ------------------------------------------------------------------ setup
function makeAnimal(kind) {
  const home = kind === 'fox' ? POS.pumpkin : POS[kind];
  return {
    kind, def: ANIMALS[kind], home: { x: home.x, y: home.y }, x: home.x, y: home.y,
    t: Math.random() * 10, facing: kind === 'alligator' ? -1 : Math.random() < 0.5 ? -1 : 1,
    walk: 0, moving: false, state: 'home', invited: false, joined: false, hat: null,
    bumpCD: 0, jumpT: null, path: null, pi: 0, lift: 0, swim: false, happyUntil: 0, flap: false, grinT: -99,
  };
}

function resetWorld() {
  G.items = { flour: 'todo', oil: 'todo', egg: 'todo', milk: 'todo' };
  G.basket = []; G.plate = 0; G.hudMode = null; G.hudT = 0; G.hudCheck = {};
  G.followers = []; G.trail = [];
  G.animals = {};
  for (const k of FRIENDS) G.animals[k] = makeAnimal(k);
  G.list = FRIENDS.map(k => G.animals[k]);
  G.player = {
    x: POS.wake.x, y: POS.wake.y, vx: 0, vy: 0, r: 16, facing: 1, walk: 0, moving: false,
    frozen: true, inBed: true, pose: null, eyes: null, mouth: null, hat: null, jump: 0, sortY: null,
    bubble: null, hold: null, sit: false, turtle: false, happyUntil: 0,
  };
  G.mommy = { x: POS.mommy.x, y: POS.mommy.y, facing: -1, t: 0, wave: 0, reactCD: 0, bubble: null, hold: null, stir: 0, hat: null, faceTo: null, walk: 0, moving: false };
  G.dad = { x: DAD_SPOTS[0].x, y: DAD_SPOTS[0].y, facing: 1, t: 0, walk: 0, moving: false, state: 'idle', spot: 0, cd: 3, path: null, pi: 0, hugT: 0, waveT: 0, hat: null, pose: null, hold: 'flower', sit: false };
  G.oven = { baking: false, glow: 0 };
  G.visitor = null; G.lastVisitor = null; G.idleT = 0; G.freeT = 0;
  G.night = 0; G.nightTarget = 0; G.camFocus = null; G.finalShot = false; G.cups = false;
  G.nestEggs = 3; G.pumpkinWob = null; G.pumpkinPeek = 0; G.olive = null;
  G.particles = []; G.flying = [];
  G.guide.friend = null; G.guide.path = null;
  OLIVE_TREE.jig = null;
  Sound.setMode('day');
}

// ------------------------------------------------------------------ helpers
function spawn(type, x, y, o = {}) {
  const life = o.life || 1;
  G.particles.push(Object.assign({ type, x, y, z: 0, vx: 0, vy: 0, vz: 0, g: 0, size: 8, rot: 0, vr: 0, color: '#fff' }, o, { life, max: life }));
}
function hearts(x, y, h, n = 3, big = false) {
  for (let i = 0; i < n; i++) spawn('heart', x + rand(-22, 22), y, { z: h + rand(0, 20), vz: rand(40, 70), vx: rand(-20, 20), life: rand(1.0, 1.5), size: big ? rand(12, 16) : rand(7, 11), color: pick(['#ff5c8a', '#ff8fb8', '#ff3b6b']) });
}
function sparkles(x, y, z, n = 8) {
  for (let i = 0; i < n; i++) spawn('sparkle', x, y, { z, vx: rand(-90, 90), vy: rand(-30, 30), vz: rand(-40, 120), life: rand(0.5, 0.9), size: rand(5, 9), color: pick(['#ffffff', '#fff3a0', '#ffd23f']) });
}
function confetti(x, y, n = 40, spread = 220) {
  for (let i = 0; i < n; i++) spawn('confetti', x + rand(-spread, spread), y + rand(-60, 60), { z: rand(150, 320), vz: rand(-20, 80), g: 140, vx: rand(-40, 40), life: rand(2.2, 3.6), size: rand(6, 9), rot: rand(0, TAU), vr: rand(-8, 8), color: pick(COLORS) });
}
function puff(x, y, z, n = 6) {
  for (let i = 0; i < n; i++) spawn('puff', x + rand(-10, 10), y, { z: z + rand(-5, 10), vx: rand(-40, 40), vz: rand(10, 50), life: rand(0.5, 0.8), size: rand(6, 10) });
}
function splash(x, y) {
  for (let i = 0; i < 14; i++) spawn('drop', x + rand(-20, 20), y, { z: 5, vx: rand(-90, 90), vy: rand(-20, 20), vz: rand(120, 260), g: 600, life: rand(0.5, 0.8), size: rand(3, 5) });
}
function leaves(x, y, z, n = 5) {
  for (let i = 0; i < n; i++) spawn('leaf', x + rand(-40, 40), y + rand(-5, 5), { z: z + rand(-20, 20), vx: rand(-30, 30), vz: rand(-10, 20), g: 60, life: rand(1.2, 1.8), size: rand(5, 7), rot: rand(0, TAU), vr: rand(-4, 4) });
}

function moveToward(o, tx, ty, step) {
  const d = Math.hypot(tx - o.x, ty - o.y);
  if (d <= step || d < 0.001) { o.x = tx; o.y = ty; return true; }
  o.x += ((tx - o.x) / d) * step; o.y += ((ty - o.y) / d) * step;
  return false;
}
function setPath(o, tx, ty) {
  const p = Nav.findPath(o.x, o.y, tx, ty) || [{ x: o.x, y: o.y }];
  const lastP = p[p.length - 1];
  if (Math.hypot(lastP.x - tx, lastP.y - ty) > 2) p.push({ x: tx, y: ty });
  o.path = p; o.pi = 1;
}
function followPath(o, dt, speed) {
  if (!o.path || o.pi >= o.path.length) return true;
  let step = speed * dt;
  while (step > 0 && o.pi < o.path.length) {
    const q = o.path[o.pi], d = Math.hypot(q.x - o.x, q.y - o.y);
    if (d <= step) { o.x = q.x; o.y = q.y; step -= d; o.pi++; } else { o.x += ((q.x - o.x) / d) * step; o.y += ((q.y - o.y) / d) * step; step = 0; }
  }
  return o.pi >= o.path.length;
}
function trailPoint(d) {
  const tr = G.trail, p = G.player;
  let acc = 0, prev = { x: p.x, y: p.y };
  for (let i = 0; i < tr.length; i++) {
    const q = tr[i], seg = Math.hypot(q.x - prev.x, q.y - prev.y);
    if (acc + seg >= d && seg > 0) { const k = (d - acc) / seg; return { x: lerp(prev.x, q.x, k), y: lerp(prev.y, q.y, k) }; }
    acc += seg; prev = q;
  }
  return { x: prev.x, y: prev.y, short: true };   // Sarah hasn't walked far enough yet
}
function slotDist(a) {
  let d = 34;
  for (const f of G.followers) { d += f.def.spacing / 2; if (f === a) return d; d += f.def.spacing / 2; }
  return d;
}
const isInPumpkin = a => a.kind === 'fox' && a.state === 'home' && Math.hypot(a.x - a.home.x, a.y - a.home.y) < 6;
const allItems = () => ITEMS.every(k => G.items[k] === 'got');
const allFriends = () => G.list.every(a => a.joined && a.state !== 'entrance');

// ------------------------------------------------------------------ cutscenes
function startCut(name) {
  G.cut = { name, t: 0, prev: -1 };
  const p = G.player;
  p.frozen = true; p.vx = p.vy = 0; p.moving = false;
  G.idleT = 0;
  if (CUTS[name].start) CUTS[name].start();
}
function endCut() { G.cut = null; G.player.frozen = false; }
function at(x) { return !!G.cut && G.cut.prev < x && G.cut.t >= x; }
function faceEachOther(a, b) { a.facing = b.x > a.x ? 1 : -1; b.facing = -a.facing; }

const CUTS = {
  wake: {
    start() {
      const p = G.player;
      p.inBed = false; p.x = BED.x + BED.w / 2; p.y = BED.y + 72; p.sortY = BED.y + BED.h + 5;
      p.pose = 'up'; p.eyes = 'closed'; p.mouth = 'o'; p.facing = 1;
      Sound.play('yawn');
    },
    update(t) {
      const p = G.player;
      if (at(1.4)) { p.pose = null; p.eyes = null; p.mouth = null; Sound.play('boing'); }
      if (t >= 1.4 && t < 1.9) {
        const k = (t - 1.4) / 0.5;
        p.x = lerp(BED.x + BED.w / 2, POS.wake.x, k); p.y = lerp(BED.y + 72, POS.wake.y, k);
        p.jump = Math.sin(Math.PI * k) * 45;
      }
      if (at(1.9)) { p.jump = 0; p.x = POS.wake.x; p.y = POS.wake.y; p.sortY = null; G.trail = []; Sound.play('giggle'); p.happyUntil = G.t + 1; }
      if (t > 2.1) { G.phase = 'toMom'; endCut(); }
    },
  },

  momIdea: {
    start() { faceEachOther(G.player, G.mommy); G.mommy.wave = 2.2; Sound.play('mommy'); hearts(G.mommy.x, G.mommy.y, 150, 3); },
    update(t) {
      const m = G.mommy;
      if (at(0.7)) { m.bubble = { type: 'cupcake', t0: G.t }; Sound.play('pop'); }
      if (at(2.3)) { m.bubble = { type: 'list', t0: G.t }; Sound.play('whoosh'); }
      if (at(3.8)) { m.bubble = null; G.hudMode = 'items'; G.hudT = G.t; Sound.play('sparkle'); }
      if (t > 4.2) { G.phase = 'gather'; G.player.happyUntil = G.t + 1; Sound.play('giggle'); endCut(); }
    },
  },

  baking: {
    start() {
      faceEachOther(G.player, G.mommy);
      G.mommy.bubble = null; G.mommy.wave = 1;
      G.camFocus = { x: (G.mommy.x + TABLE.x) / 2 + 30, y: 300, zoom: 1.15 };
      Sound.play('mommy');
    },
    update(t) {
      const m = G.mommy, p = G.player;
      for (let i = 0; i < 4; i++) {
        if (at(0.4 + i * 0.35)) {
          const k = G.basket.shift();
          if (k) { G.flying.push({ icon: k, x0: p.x - 15 * p.facing, y0: p.y, z0: 52, t: 0, delay: 0, dur: 0.5, to: 'mommy' }); Sound.play('pop'); }
        }
      }
      if (at(2.0)) m.hold = 'bowl';
      if (t > 2.0 && t < 3.9) {
        m.stir = (t - 2.0) * 14;
        if (at(2.1) || at(2.7) || at(3.3)) { Sound.play('swish'); puff(m.x + 18 * m.facing, m.y, 70, 4); }
      }
      if (at(4.0)) { m.hold = null; m.faceTo = { x: OVEN.x + OVEN.w / 2 }; G.oven.baking = true; Sound.play('oven'); }
      if (t > 4.2 && t < 6.1 && Math.random() < 0.15) spawn('puff', OVEN.x + rand(10, OVEN.w - 10), OVEN.y + OVEN.h, { z: 80, vz: 40, life: 0.8, size: 6 });
      if (at(6.2)) { G.oven.baking = false; Sound.play('ding'); sparkles(OVEN.x + OVEN.w / 2, OVEN.y + OVEN.h, 60, 10); }
      if (at(6.7)) { G.plate = 9; m.faceTo = null; Sound.play('chime'); sparkles(TABLE.x, TABLE.y, 50, 14); }
      if (at(7.4)) { m.bubble = { type: 'friends', t0: G.t }; G.hudMode = 'friends'; G.hudT = G.t; G.trail = []; Sound.play('giggle'); m.wave = 1.5; }
      if (t > 8.9) { G.phase = 'friends'; G.camFocus = null; endCut(); }
    },
  },

  party: {
    start() {
      G.phase = 'party';
      Sound.setMode('party');
      const m = G.mommy, p = G.player, d = G.dad;
      m.bubble = null; G.hudMode = null; G.visitor = null;
      G.camFocus = { x: 700, y: 335, fit: { w: 660, h: 600 } };
      G.moves = [];
      const add = (o, x, y) => G.moves.push({ o, x0: o.x, y0: o.y, x1: x, y1: y });
      add(p, SEATS.sarah.x, SEATS.sarah.y);
      add(m, SEATS.mommy.x, SEATS.mommy.y);
      for (const a of G.list) if (a.state !== 'basket') { a.state = 'party'; add(a, PARTY_POS[a.kind].x, PARTY_POS[a.kind].y); }
      // Daddy comes to the party with everyone (in through the front door if he's out in the yard)
      const inKitchen = d.x > 424 && d.x < 976 && d.y > 104 && d.y < 576;
      if (!inKitchen) { d.x = POS.doorOutside.x; d.y = POS.doorOutside.y; }
      d.state = 'party'; d.pose = null; d.hold = 'flower'; d.path = null; d.inBed = false;
      add(d, SEATS.hug.x, SEATS.hug.y);
      Sound.play('dad');
    },
    update(t, dt) {
      const p = G.player, m = G.mommy, d = G.dad;
      if (t < 1.8) {
        const k = easeInOut(t / 1.8);
        for (const mv of G.moves) {
          mv.o.x = lerp(mv.x0, mv.x1, k); mv.o.y = lerp(mv.y0, mv.y1, k);
          if (Math.abs(mv.x1 - mv.x0) > 2) mv.o.facing = mv.x1 > mv.x0 ? 1 : -1;
        }
        for (const o of [p, m, d]) { o.moving = true; o.walk += dt * 12; }
      }
      if (at(1.8)) {
        for (const o of [p, m, d]) o.moving = false;
        p.facing = -1; m.facing = -1; d.facing = 1;
        for (const a of G.list) a.facing = a.x < TABLE.x ? 1 : -1;
      }
      if (at(1.9)) { Sound.play('fanfare'); Sound.play('confetti'); confetti(700, 380, 60, 260); }
      // Daddy's big hug, then he goes to his seat across the table
      if (at(3.0)) {
        d.pose = 'hug'; d.hold = null; p.pose = 'hug'; p.eyes = 'happy';
        faceEachOther(d, p); Sound.play('hug'); hearts((d.x + p.x) / 2, p.y, 100, 6, true);
      }
      if (t > 3.0 && t < 4.6 && Math.random() < 0.08) hearts((d.x + p.x) / 2, p.y, 110, 1);
      if (at(4.6)) {
        d.pose = null; p.pose = null; p.eyes = null; p.facing = 1; d.hold = 'flower';
        d.path = [{ x: d.x, y: d.y }, { x: SEATS.hug.x, y: 486 }, { x: SEATS.dad.x, y: 486 }, SEATS.dad]; d.pi = 1;
      }
      if (t > 4.6 && t < 6.4) { d.moving = !followPath(d, dt, 220); if (d.moving) d.walk += dt * 12; }
      if (at(6.4)) { d.moving = false; d.x = SEATS.dad.x; d.y = SEATS.dad.y; d.facing = -1; }
      const chars = [p, m, d, ...G.list];
      chars.forEach((o, i) => { if (at(2.1 + i * 0.12)) { o.hat = COLORS[i % COLORS.length]; Sound.play('pop'); sparkles(o.x, o.y, 90, 3); } });
      G.list.forEach((a, i) => {
        const t0 = 6.6 + i * 0.85;
        if (at(t0)) {
          const hx = a.state === 'basket' ? p.x - 14 : a.x + (a.def.bx || 0) * a.facing * 0.6;
          const hy = a.state === 'basket' ? p.y : a.y;
          spawn('cupcake', hx, hy, { z: (a.state === 'basket' ? 80 : a.def.h * 0.85), vz: -10, life: 0.5, size: 0.6 });
          G.plate = Math.max(2, G.plate - 1);
        }
        if (at(t0 + 0.45)) {
          Sound.play('nom'); Sound.play(a.def.sound); a.jumpT = 0; a.happyUntil = G.t + 2;
          const hx = a.state === 'basket' ? p.x : a.x;
          for (let j = 0; j < 6; j++) spawn('crumb', hx, a.state === 'basket' ? p.y : a.y, { z: a.def.h * 0.7, vx: rand(-50, 50), vz: rand(30, 90), g: 300, life: 0.7, size: 2.5 });
          hearts(hx, a.y, a.def.h + 10, 1);
        }
      });
      // Daddy and Sarah have theirs last
      if (at(13.3)) { spawn('cupcake', d.x - 14, d.y, { z: 110, vz: -10, life: 0.5, size: 0.6 }); G.plate = 1; }
      if (at(13.75)) { Sound.play('nom'); Sound.play('dad'); hearts(d.x, d.y, 160, 2); }
      if (at(14.2)) { p.mouth = 'nom'; G.plate = 0; Sound.play('nom'); }
      if (at(14.9)) { p.mouth = null; Sound.play('giggle'); p.happyUntil = G.t + 1.5; }
      // the final shot, like the table drawing
      if (at(15.6)) {
        d.x = SEATS.dad.x; d.y = SEATS.dad.y; d.facing = -1; p.facing = 1;
        p.sit = true; d.sit = true; p.pose = 'cup'; d.pose = 'cup'; p.hold = 'cup'; d.hold = 'cup';
        G.finalShot = true; G.camFocus = { x: 690, y: 312, fit: { w: 660, h: 600 }, zoom: 1.6 };
        G.plate = 4; sparkles(TABLE.x, TABLE.y, 45, 10);
        Sound.play('sparkle'); Sound.play('giggle');
      }
      if (t > 15.6 && Math.random() < 0.05) confetti(690, 360, 3, 160);
      if (at(17.6) || at(20.1)) { hearts(p.x, p.y, 105, 2); hearts(d.x, d.y, 125, 2); }
      if (t > 22.6) endParty();
    },
  },

  // Bedtime: Sarah, Mommy and Daddy all climb into the big bed, and the animals curl up around it.
  sleepy: {
    start() {
      const p = G.player, m = G.mommy, d = G.dad;
      G.camFocus = { x: 252, y: 340, fit: { w: 470, h: 540 } };
      p.pose = 'up'; p.mouth = 'o'; p.eyes = 'closed';
      Sound.play('yawn');
      for (const [o, w] of [[m, SLEEP_WAIT.mommy], [d, SLEEP_WAIT.dad]]) {
        if (o.x > 400 || o.y > 590) { o.x = 385; o.y = 360; }   // still out of the room: come in through the bedroom door
        o.path = null; o.pose = null; o.sx0 = o.x; o.sy0 = o.y; o.wait = w;
      }
      d.state = 'sleep'; d.hold = 'flower'; m.bubble = null;
      G.moves = [];
      for (const a of G.list) {
        if (a.state === 'basket') { a.x = p.x - 10; a.y = p.y + 4; p.turtle = false; }
        a.state = 'sleep'; a.jumpT = null; a.lift = 0;
        G.moves.push({ o: a, x0: a.x, y0: a.y, x1: SLEEP_POS[a.kind].x, y1: SLEEP_POS[a.kind].y });
      }
    },
    update(t, dt) {
      const p = G.player, m = G.mommy, d = G.dad;
      if (t < 1.6) {
        const k = easeInOut(t / 1.6);
        for (const mv of G.moves) {
          mv.o.x = lerp(mv.x0, mv.x1, k); mv.o.y = lerp(mv.y0, mv.y1, k);
          if (Math.abs(mv.x1 - mv.x0) > 2) mv.o.facing = mv.x1 > mv.x0 ? 1 : -1;
        }
      }
      if (t < 1.1) {
        const k = easeInOut(t / 1.1);
        for (const o of [m, d]) {
          o.x = lerp(o.sx0, o.wait.x, k); o.y = lerp(o.sy0, o.wait.y, k);
          o.moving = Math.hypot(o.wait.x - o.sx0, o.wait.y - o.sy0) > 4; o.walk += dt * 12;
        }
      }
      if (at(1.1)) { m.moving = d.moving = false; p.pose = null; p.mouth = null; hopStart(p); }
      if (t > 1.1 && t < 1.6) hopUpdate(p, 'sarah', (t - 1.1) / 0.5);
      if (at(1.6)) { hopEnd(p); hopStart(m); }
      if (t > 1.6 && t < 2.1) hopUpdate(m, 'mommy', (t - 1.6) / 0.5);
      if (at(2.1)) { hopEnd(m); hopStart(d); }
      if (t > 2.1 && t < 2.6) hopUpdate(d, 'dad', (t - 2.1) / 0.5);
      if (at(2.6)) {
        hopEnd(d);
        for (const a of G.list) { a.sleepy = true; a.moving = false; }
        hearts(BED.x + BED.w / 2, BED.y + 40, 70, 5, true);
        Sound.play('snore');
      }
      if (t > 4.8 && t < 6.3) G.fade = clamp((t - 4.8) / 1.5, 0, 1);
      if (at(6.3)) { resetWorld(); G.phase = 'sleep'; G.fade = 1; G.player.frozen = true; }
      if (t > 6.5) G.fade = clamp(1 - (t - 6.5) / 1.6, 0, 1);
      if (t > 8.2) { G.fade = 0; G.phase = 'sleep'; G.sleepT = 0; G.cut = null; }
    },
  },
};

// hopping into the big bed
function hopStart(o) { o.hx0 = o.x; o.hy0 = o.y; o.sortY = BED.y + BED.h + 5; o.pose = null; o.wave = 0; o.moving = false; }
function hopUpdate(o, kind, k) {
  o.x = lerp(o.hx0, BED.x + BED.w * BED_SLOTS[kind], k);
  o.y = lerp(o.hy0, BED.y + 72, k);
  o.jump = Math.sin(Math.PI * k) * 50;
}
function hopEnd(o) { o.jump = 0; o.inBed = true; o.sortY = null; o.eyes = null; Sound.play('boing'); }

function endParty() {
  const p = G.player, d = G.dad;
  G.finalShot = false; G.camFocus = null;
  p.sit = false; p.pose = null; p.hold = null;
  d.sit = false; d.pose = 'wave'; d.hold = 'flower'; d.state = 'wave'; d.waveT = 1.5; d.cd = 25;
  d.spot = (d.spot + 1) % DAD_SPOTS.length;
  G.trail = [];
  for (const a of G.list) if (a.state === 'party') a.state = 'join';
  G.phase = 'freeplay'; G.freeT = 0;
  Sound.setMode('day');
  endCut();
}

// ------------------------------------------------------------------ chores
function fly(icon, x, y, z, dur, done, delay = 0) {
  G.flying.push({ icon, x0: x, y0: y, z0: z, t: -delay, delay, dur, done, to: 'basket', x, y, z, s: 0 });
}
function gotItem(k) {
  G.items[k] = 'got'; G.basket.push(k); G.hudCheck[k] = G.t;
  Sound.play('chime');
  sparkles(G.player.x, G.player.y, 60, 10);
  G.player.happyUntil = G.t + 1.2;
  if (allItems()) setTimeout(() => Sound.play('giggle'), 500);
}
function getFlour() {
  G.items.flour = 'pending';
  Sound.play('boing');
  fly('flour', POS.flour.x, POS.flour.y, 0, 0.7, () => gotItem('flour'));
}
function startOlives() {
  G.items.oil = 'pending';
  OLIVE_TREE.jig = G.t; G.olive = { t: 0, done: false };
  Sound.play('rustle');
  for (let i = 0; i < 8; i++) spawn('olive', OLIVE_TREE.x + rand(-60, 60), OLIVE_TREE.y + rand(-10, 30), { z: rand(80, 160), g: 600, life: 1.3, bounce: true, color: pick(['#4f6b2a', '#5b3d5e', '#6b8e23']), size: 5 });
}
function getEgg() {
  G.items.egg = 'pending';
  const ch = G.animals.chickens;
  ch.jumpT = 0; ch.happyUntil = G.t + 1.5;
  Sound.play('cluck');
  G.nestEggs = Math.max(0, G.nestEggs - 1);
  fly('egg', POS.nest.x, POS.nest.y, 5, 0.75, () => gotItem('egg'), 0.45);
}
function getMilk() {
  G.items.milk = 'pending';
  const cw = G.animals.cow;
  cw.mooT = G.t; cw.happyUntil = G.t + 1.5;
  Sound.play('moo');
  fly('milk', cw.x - 30 * cw.facing, cw.y + 18, 0, 0.75, () => gotItem('milk'), 0.8);
}

function updateFlying(dt) {
  for (const f of G.flying) {
    f.t += dt;
    if (f.t < 0) { const k = 1 - -f.t / f.delay; f.x = f.x0; f.y = f.y0; f.z = f.z0; f.s = easeOutBack(clamp(k * 1.4, 0, 1)); continue; }
    const k = Math.min(1, f.t / f.dur);
    const dest = f.to === 'mommy'
      ? { x: G.mommy.x + 18 * G.mommy.facing, y: G.mommy.y + 1, z: 62 }
      : { x: G.player.x - 15 * G.player.facing, y: G.player.y + 1, z: 52 };
    const e = easeInOut(k);
    f.x = lerp(f.x0, dest.x, e); f.y = lerp(f.y0, dest.y, e);
    f.z = lerp(f.z0, dest.z, e) + Math.sin(Math.PI * k) * 95;
    f.s = lerp(1, 0.5, k);
    if (k >= 1) { f.dead = true; if (f.done) f.done(); }
  }
  G.flying = G.flying.filter(f => !f.dead);
}

// ------------------------------------------------------------------ friends
function bumpAnimal(a) {
  if (a.bumpCD > 0) return;
  a.bumpCD = 1.6; a.jumpT = 0; a.happyUntil = G.t + 1.5;
  Sound.play(a.def.sound);
  hearts(a.x, a.y, a.def.h, 3);
  if (a.kind === 'fox' && isInPumpkin(a)) G.pumpkinWob = G.t;
  if (a.kind === 'alligator') a.grinT = G.t;
  if (a.kind === 'cow') a.mooT = G.t;
  if (G.phase === 'friends' && !a.joined) { joinFriend(a); return; }
  if ((G.phase === 'toMom' || G.phase === 'gather') && !a.invited) {
    a.invited = true;
    G.player.bubble = { type: 'invite', t0: G.t, until: G.t + 2.4 };
    G.player.happyUntil = G.t + 1.5;
    Sound.play('pop');
  }
}

function joinFriend(a) {
  if (G.visitor === a) { G.visitor = null; G.idleT = 0; }
  a.joined = true; a.invited = true;
  G.hudCheck[a.kind] = G.t;
  setTimeout(() => Sound.play('chime'), 250);
  hearts(a.x, a.y, a.def.h, 5, true);
  G.player.happyUntil = G.t + 1.5;
  const ent = (kind, dur, y0) => { a.state = 'entrance'; a.ent = { kind, t: 0, dur, x0: a.x, y0: y0 ?? a.y }; };
  if (a.kind === 'turtle') { ent('basket', 0.8); return; }
  G.followers.push(a);
  if (isInPumpkin(a)) { ent('pop', 0.75, a.y - 40); G.pumpkinWob = G.t; Sound.play('boing'); }
  else if (a.kind === 'goose' && a.swim) { ent('fly', 1.0); splash(a.x, a.y); Sound.play('splash'); }
  else if (a.kind === 'alligator') { a.grinT = G.t; a.state = 'join'; }
  else a.state = 'join';
}

function visitTarget(a) {
  const p = G.player;
  const stop = a.def.touchR + 30;
  const ang = Math.atan2(a.y - p.y, a.x - p.x);
  setPath(a, p.x + Math.cos(ang) * stop, p.y + Math.sin(ang) * stop * 0.8);
}

function arriveHome(a) {
  if (a.kind === 'fox') { G.pumpkinWob = G.t; Sound.play('boing'); }
  if (a.kind === 'goose') { splash(a.x, a.y); Sound.play('splash'); }
}

function updateAnimal(a, dt) {
  a.t += dt; a.bumpCD -= dt;
  const ox = a.x, oy = a.y, p = G.player;
  let lift = 0;
  if (a.jumpT != null) { a.jumpT += dt; if (a.jumpT > 0.5) a.jumpT = null; else lift = Math.sin((Math.PI * a.jumpT) / 0.5) * 24; }
  a.flap = false;
  switch (a.state) {
    case 'home':
      if (a.kind === 'goose') {
        const tx = a.home.x + Math.cos(a.t * 0.45) * 45, ty = a.home.y + Math.sin(a.t * 0.45) * 14;
        const k = Math.min(1, dt * 1.5); a.x += (tx - a.x) * k; a.y += (ty - a.y) * k;
      } else {
        if (Math.hypot(a.x - a.home.x, a.y - a.home.y) > 1) moveToward(a, a.home.x, a.home.y, 60 * dt);
        if (dist(a, p) < 320) a.facing = p.x > a.x ? 1 : -1;
      }
      break;
    case 'visit_go': {
      a.repath -= dt;
      if (a.repath <= 0) { a.repath = 1.5; visitTarget(a); }
      const done = followPath(a, dt, a.def.speed);
      if (done || dist(a, p) < a.def.touchR + 40) {
        a.state = 'visit_stay'; a.visitT = rand(10, 20); a.bubbleT = 0.2; a.jumpT = 0;
        Sound.play(a.def.sound);
      }
      break;
    }
    case 'visit_stay':
      a.visitT -= dt; a.bubbleT -= dt;
      a.facing = p.x > a.x ? 1 : -1;
      a.happyUntil = G.t + 0.5;
      if (a.bubbleT <= 0) {
        a.bubbleT = rand(0.8, 1.3);
        spawn('speech', a.x + rand(-12, 12), a.y, { z: a.def.h + 18, vz: 28, vx: rand(-12, 12), life: 1.7, icon: Math.random() < 0.5 ? 'heart' : 'star' });
        if (Math.random() < 0.5) spawn(Math.random() < 0.5 ? 'heart' : 'star', a.x + rand(-25, 25), a.y, { z: a.def.h, vz: 55, vx: rand(-25, 25), life: 1.2, size: rand(6, 9), color: Math.random() < 0.5 ? '#ffd23f' : '#ff5c8a' });
        if (Math.random() < 0.35) a.jumpT = 0;
        if (Math.random() < 0.2) Sound.play(a.def.sound);
      }
      if (a.visitT <= 0) {
        a.state = 'visit_back'; setPath(a, a.home.x, a.home.y);
        if (G.visitor === a) { G.visitor = null; G.idleT = 0; }
      }
      break;
    case 'visit_back':
      if (followPath(a, dt, a.def.speed)) { a.state = 'home'; arriveHome(a); }
      break;
    case 'entrance': {
      const e = a.ent; e.t += dt;
      const k = Math.min(1, e.t / e.dur);
      let tx, ty;
      if (e.kind === 'basket') { tx = p.x - 15 * p.facing; ty = p.y; } else { const s = trailPoint(slotDist(a)); tx = s.x; ty = s.y; }
      a.x = lerp(e.x0, tx, easeOut(k)); a.y = lerp(e.y0, ty, k);
      lift = Math.sin(Math.PI * k) * (e.kind === 'fly' ? 110 : 70) + (e.kind === 'basket' ? k * 40 : 0);
      a.flap = e.kind === 'fly';
      if (k >= 1) {
        lift = 0;
        if (e.kind === 'basket') { a.state = 'basket'; p.turtle = true; Sound.play('pop'); sparkles(p.x, p.y, 55, 6); }
        else a.state = 'follow';
      }
      break;
    }
    case 'join': {
      // wait in place until Sarah has walked far enough to make room in the line
      const s = trailPoint(slotDist(a));
      if (s.short && Math.hypot(a.x - s.x, a.y - s.y) < 400) break;
      if (moveToward(a, s.x, s.y, 280 * dt) || Math.hypot(a.x - s.x, a.y - s.y) < 18) a.state = 'follow';
      break;
    }
    case 'follow': {
      const s = trailPoint(slotDist(a));
      if (s.short) break;
      const k = 1 - Math.exp(-8 * dt);
      a.x += (s.x - a.x) * k; a.y += (s.y - a.y) * k;
      break;
    }
    case 'basket': a.x = p.x; a.y = p.y; break;
    case 'party': break;
    case 'sleep': break;
  }
  a.lift = lift;
  const dx = a.x - ox, dy = a.y - oy;
  const sp = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
  a.moving = sp > 14 && a.state !== 'entrance' && a.state !== 'basket';
  if (a.state === 'party' && G.cut && G.cut.t < 1.8) a.moving = true;
  if (a.state === 'sleep' && G.cut && G.cut.t < 1.6) a.moving = true;
  if (a.moving) { a.walk += (sp * dt) / 11; if (Math.abs(dx) > 0.25 && a.state !== 'party' && a.state !== 'sleep') a.facing = dx > 0 ? 1 : -1; }
  a.swim = a.def.water === 'pond' ? inWaterPond(a.x, a.y) : a.def.water === 'creek' ? creekDist(a.x, a.y) < 46 : false;
  a.happy = G.t < a.happyUntil || ['follow', 'join', 'party', 'basket'].includes(a.state);
}

// "If the child stops, an animal comes over to say hi" (hearts and stars), then goes home.
function updateIdle(dt, mv) {
  const ok = !G.player.frozen && !G.cut && ['toMom', 'gather', 'friends'].includes(G.phase);
  if (!ok || mv.mag > 0.15) { G.idleT = 0; return; }
  G.idleT += dt;
  if (G.idleT > 8 && !G.visitor) {
    const cands = G.list.filter(a => a.state === 'home' && !a.joined);
    if (!cands.length) return;
    cands.sort((a, b) => dist(a, G.player) - dist(b, G.player));
    let a = cands[0];
    if (cands.length > 1 && (a === G.lastVisitor || Math.random() < 0.3)) a = cands[1];
    G.visitor = a; G.lastVisitor = a; G.idleT = 0;
    a.state = 'visit_go'; a.repath = 0; a.jumpT = 0;
    if (isInPumpkin(a) || a.kind === 'fox') { G.pumpkinWob = G.t; Sound.play('yip'); }
    if (a.kind === 'goose' && a.swim) { splash(a.x, a.y); Sound.play('splash'); }
  }
}

// ------------------------------------------------------------------ mommy & daddy
function updateMommy(dt) {
  const m = G.mommy, p = G.player;
  m.t += dt; m.wave = Math.max(0, m.wave - dt); m.reactCD -= dt;
  if (m.path) {
    // walking to the bedroom at bedtime
    const ox = m.x;
    if (followPath(m, dt, 130)) { m.path = null; m.moving = false; }
    else { m.moving = true; m.walk += (130 * dt) / 15; if (Math.abs(m.x - ox) > 0.2) m.facing = m.x > ox ? 1 : -1; }
  } else if (G.phase !== 'party' && !m.inBed) {
    if (m.faceTo) m.facing = m.faceTo.x > m.x ? 1 : -1;
    else if (!p.inBed) m.facing = p.x > m.x ? 1 : -1;
  }
  if (m.bubble && m.bubble.until && G.t > m.bubble.until) m.bubble = null;
  if (G.phase === 'friends' && !G.cut && !m.bubble) m.bubble = { type: 'friends', t0: G.t };
}

function updateDad(dt) {
  const d = G.dad, p = G.player;
  d.t += dt; d.cd -= dt;
  if (d.state === 'party' || d.state === 'sleep') return;   // the cutscene moves him
  // at bedtime Daddy heads to the bedroom (after finishing a hug)
  if (G.phase === 'bedtime' && !['hug', 'toBed', 'bedWait'].includes(d.state)) {
    d.state = 'toBed'; d.pose = null; d.hold = 'flower';
    setPath(d, SLEEP_WAIT.dad.x, SLEEP_WAIT.dad.y);
  }
  const ox = d.x, oy = d.y;
  switch (d.state) {
    case 'toBed':
      if (followPath(d, dt, 200)) d.state = 'bedWait';
      break;
    case 'bedWait':
      if (dist(d, p) < 500) d.facing = p.x > d.x ? 1 : -1;
      d.pose = Math.sin(d.t * 0.9) > 0.8 ? 'wave' : null;
      break;
    case 'idle': {
      if (dist(d, p) < 420) d.facing = p.x > d.x ? 1 : -1;
      d.pose = Math.sin(d.t * 0.7) > 0.93 ? 'wave' : null;
      const can = !p.frozen && !p.inBed && !G.cut && ['toMom', 'gather', 'friends', 'freeplay', 'bedtime'].includes(G.phase);
      if (can && d.cd <= 0 && dist(d, p) < 300 && Nav.lineClear(d.x, d.y, p.x, p.y, 30)) {
        d.state = 'approach'; d.pose = 'wave'; d.approachT = 0;
        Sound.play('dad'); hearts(d.x, d.y, 165, 2);
      }
      break;
    }
    case 'approach': {
      d.approachT += dt;
      if (p.frozen || G.cut) { d.state = 'idle'; d.pose = null; break; }
      if (dist(d, p) > 480 || d.approachT > 8) { d.state = 'walk'; d.cd = 10; setPath(d, DAD_SPOTS[d.spot].x, DAD_SPOTS[d.spot].y); break; }
      const side = d.x > p.x ? 1 : -1;
      const tx = p.x + side * 34, ty = p.y + 2;
      moveToward(d, tx, ty, 210 * dt);
      Nav.resolve(d, 14);
      if (d.approachT > 0.6) d.pose = null;
      if (Math.hypot(d.x - tx, d.y - ty) < 8) {
        d.state = 'hug'; d.hugT = 0; d.x = tx; d.y = ty;
        p.frozen = true; p.vx = p.vy = 0; p.moving = false; p.pose = 'hug'; p.eyes = 'happy';
        faceEachOther(p, d); d.pose = 'hug'; d.hold = null;
        Sound.play('hug'); hearts((d.x + p.x) / 2, p.y, 110, 6, true);
      }
      break;
    }
    case 'hug':
      d.hugT += dt;
      if (Math.random() < dt * 4) hearts((d.x + p.x) / 2, p.y, 115, 1);
      if (d.hugT > 2.3) {
        d.state = 'wave'; d.waveT = 1.3; d.pose = 'wave'; d.hold = 'flower';
        p.frozen = false; p.pose = null; p.eyes = null; p.happyUntil = G.t + 1;
        d.cd = 35; d.spot = (d.spot + 1) % DAD_SPOTS.length;
      }
      break;
    case 'wave':
      d.waveT -= dt;
      if (d.waveT <= 0) { d.pose = null; d.state = 'walk'; setPath(d, DAD_SPOTS[d.spot].x, DAD_SPOTS[d.spot].y); }
      break;
    case 'walk':
      if (followPath(d, dt, 120)) d.state = 'idle';
      break;
    case 'party': break;
  }
  const dx = d.x - ox, dy = d.y - oy, sp = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
  d.moving = sp > 15;
  if (d.moving) { d.walk += (sp * dt) / 15; if (Math.abs(dx) > 0.3 && d.state !== 'hug') d.facing = dx > 0 ? 1 : -1; }
}

// ------------------------------------------------------------------ guide
function mommyTarget() { return { x: G.mommy.x, y: G.mommy.y, h: 160, kind: 'mommy' }; }
function currentTarget() {
  const ph = G.phase, p = G.player;
  if (ph === 'sleep' || ph === 'toMom') return mommyTarget();
  if (ph === 'gather') {
    if (G.items.flour === 'todo') return { x: POS.flour.x, y: POS.flour.y, h: 50, kind: 'flour' };
    if (G.items.oil === 'todo') return { x: OLIVE_TREE.x, y: OLIVE_TREE.y, h: 185, kind: 'oil' };
    if (G.items.egg === 'todo') { const a = G.animals.chickens; return { x: a.x, y: a.y, h: 58, kind: 'egg' }; }
    if (G.items.milk === 'todo') { const a = G.animals.cow; return { x: a.x, y: a.y, h: 112, kind: 'milk' }; }
    return allItems() ? mommyTarget() : null;
  }
  if (ph === 'friends') {
    const left = G.list.filter(a => !a.joined);
    if (!left.length) return mommyTarget();
    let best = null, bd = 1e9;
    for (const a of left) { const d = dist(p, a); if (d < bd) { bd = d; best = a; } }
    const cur = G.guide.friend;
    if (cur && !cur.joined && dist(p, cur) < bd * 1.35) best = cur;   // don't flip-flop between two
    G.guide.friend = best;
    return { x: best.x, y: best.y, h: isInPumpkin(best) ? 100 : best.def.h, kind: best.kind };
  }
  if (ph === 'bedtime') return { x: BED.x + BED.w / 2, y: BED.y + BED.h, h: 70, kind: 'bed', tx: POS.bedSide.x, ty: POS.bedSide.y };
  return null;
}

function updateGuide(dt) {
  const g = G.guide;
  const tg = G.cut && G.cut.name !== 'wake' ? null : currentTarget();
  g.target = tg;
  if (!tg) { g.path = null; g.dir = null; return; }
  const from = G.player.inBed ? POS.wake : G.player;
  g.timer -= dt;
  if (g.timer <= 0 || !g.path) { g.timer = 0.2; g.path = Nav.findPath(from.x, from.y, tg.tx ?? tg.x, tg.ty ?? tg.y); }
  let wp = null;
  if (g.path) for (let i = 1; i < g.path.length; i++) { const q = g.path[i]; if (Math.hypot(q.x - from.x, q.y - from.y) > 28) { wp = q; break; } }
  if (!wp) wp = tg;
  g.dir = Math.atan2(wp.y - from.y, wp.x - from.x);
  g.dirS = g.dirS == null ? g.dir : g.dirS + angleDiff(g.dirS, g.dir) * Math.min(1, dt * 10);
  g.dist = Math.hypot(tg.x - from.x, tg.y - from.y);
}

// ------------------------------------------------------------------ player
function updatePlayer(dt, mv) {
  const p = G.player;
  if (p.frozen || p.inBed) { p.vx = p.vy = 0; if (G.phase !== 'party') p.moving = false; return; }
  let ix = mv.x, iy = mv.y;
  const m = mv.mag;
  // steering assist: gently bend toward the path to the current goal
  if (m > 0.05 && G.guide.target && G.guide.dir != null) {
    const a = Math.atan2(iy, ix), d = angleDiff(a, G.guide.dir);
    if (Math.abs(d) < 1.0) { const na = a + d * 0.3; ix = Math.cos(na) * m; iy = Math.sin(na) * m; }
  }
  const k = 1 - Math.exp(-10 * dt);
  p.vx += (ix * SPEED - p.vx) * k; p.vy += (iy * SPEED - p.vy) * k;
  const ox = p.x, oy = p.y;
  p.x += p.vx * dt; p.y += p.vy * dt;
  Nav.resolve(p, p.r);
  const real = Math.hypot(p.x - ox, p.y - oy) / Math.max(dt, 1e-4);
  p.moving = real > 18 && m > 0.05;
  if (p.moving) p.walk += (real * dt) / 15;
  if (Math.abs(p.vx) > 14 && m > 0.05) p.facing = p.vx > 0 ? 1 : -1;
  const tr = G.trail;
  if (!tr.length || Math.hypot(tr[0].x - p.x, tr[0].y - p.y) > 5) { tr.unshift({ x: p.x, y: p.y }); if (tr.length > 400) tr.length = 400; }
}

function checkInteractions() {
  const p = G.player, m = G.mommy, ph = G.phase;
  if (p.frozen || p.inBed) return;
  if (dist(p, m) < 85) {
    if (ph === 'toMom') return startCut('momIdea');
    if (ph === 'gather' && allItems()) return startCut('baking');
    if (ph === 'friends' && allFriends()) return startCut('party');
    if (m.reactCD <= 0) {
      m.wave = 1.6; m.reactCD = 5; Sound.play('mommy'); hearts(m.x, m.y, 150, 2);
      if (ph === 'gather') m.bubble = { type: 'list', t0: G.t, until: G.t + 3 };
    }
  }
  if (ph === 'gather') {
    if (G.items.flour === 'todo' && dist(p, POS.flour) < 64) getFlour();
    if (G.items.oil === 'todo' && dist(p, OLIVE_TREE) < 102) startOlives();
    const ch = G.animals.chickens, cw = G.animals.cow;
    if (G.items.egg === 'todo' && (dist(p, ch) < ch.def.touchR || dist(p, POS.nest) < 60)) getEgg();
    if (G.items.milk === 'todo' && dist(p, cw) < cw.def.touchR) getMilk();
  }
  for (const a of G.list) {
    if (['follow', 'join', 'basket', 'entrance', 'party'].includes(a.state)) continue;
    const r = isInPumpkin(a) ? 88 : a.def.touchR;
    if (dist(p, a) < r) bumpAnimal(a);
  }
  if (ph === 'bedtime' && dist(p, POS.bedSide) < 75) return startCut('sleepy');

  // every touch gets a reaction
  const t = G.t;
  for (const f of FLOWERS) {
    if (Math.abs(f.x - p.x) < 22 && Math.abs(f.y - p.y) < 16 && (f.jig == null || t - f.jig > 0.8)) {
      f.jig = t;
      if (t - G.lastTink > 0.22) { Sound.play('tink'); G.lastTink = t; }
    }
  }
  for (const b of BUSHES) if (dist(b, p) < 44 * b.s && (b.jig == null || t - b.jig > 0.7)) { b.jig = t; Sound.play('rustle'); leaves(b.x, b.y, 30, 3); }
  for (const r of REEDS) if (dist(r, p) < 40 && (r.jig == null || t - r.jig > 0.8)) { r.jig = t; Sound.play('rustle'); }
  for (const tr of [...TREES, OLIVE_TREE]) {
    if (dist(tr, p) < 14 * tr.s + 34 && (tr.jig == null || t - tr.jig > 1.4)) { tr.jig = t; Sound.play('rustle'); leaves(tr.x, tr.y, 120 * tr.s, 4); }
  }
}

// ------------------------------------------------------------------ ambient
function ambient(dt) {
  const t = G.t;
  if (G.player.inBed && (G.phase === 'sleep' || G.phase === 'title' || (G.cut && G.cut.name === 'sleepy'))) {
    G.zzT = (G.zzT || 0) - dt;
    if (G.zzT <= 0) {
      // little Zzz from whoever is asleep in the bed (and from sleepy animals)
      const sleepers = ['sarah', 'mommy', 'dad'].filter(k => (k === 'sarah' ? G.player : G[k === 'dad' ? 'dad' : 'mommy']).inBed);
      const k = pick(sleepers);
      G.zzT = 1.1 / sleepers.length;
      spawn('z', BED.x + BED.w * BED_SLOTS[k] + 14, BED.y + 30, { z: 20, vz: 30, vx: 18, life: 2.2, size: 7 });
      const naps = G.list.filter(a => a.sleepy);
      if (naps.length && Math.random() < 0.6) { const a = pick(naps); spawn('z', a.x + 10, a.y, { z: a.def.h * 0.8, vz: 26, vx: 14, life: 2, size: 5 }); }
    }
    G.snoreT = (G.snoreT || 0) - dt;
    if (G.snoreT <= 0) { G.snoreT = 4; Sound.play('snore'); }
  }
  const fox = G.animals.fox, inP = isInPumpkin(fox);
  const dP = dist(G.player, POS.pumpkin);
  const peekT = inP ? (dP < 260 ? 1 : Math.sin(t * 0.6) > 0.85 ? 0.7 : 0.12) : 0;
  G.pumpkinPeek += (peekT - G.pumpkinPeek) * Math.min(1, dt * 6);
  G.pumpkinWobble = (inP && dP < 260 ? Math.sin(t * 12) * 0.05 * (1 - dP / 260) : 0) + jig(t, G.pumpkinWob, 0.8) * 0.1;
  G.oven.glow += ((G.oven.baking ? 1 : 0) - G.oven.glow) * Math.min(1, dt * 3);
  if (G.olive) {
    G.olive.t += dt;
    if (G.olive.t > 1.3 && !G.olive.done) {
      G.olive.done = true;
      const gx = OLIVE_TREE.x + (G.player.x > OLIVE_TREE.x ? 55 : -55), gy = OLIVE_TREE.y + 25;
      for (const q of G.particles) if (q.type === 'olive') { q.life = 0; }
      sparkles(gx, gy, 10, 10); puff(gx, gy, 5, 5); Sound.play('pop');
      fly('oil', gx, gy, 0, 0.8, () => gotItem('oil'), 0.4);
    }
    if (G.olive.t > 2.5) G.olive = null;
  }
  if (G.phase === 'freeplay') {
    G.freeT += dt;
    if (G.freeT > 70) {
      G.phase = 'bedtime'; G.nightTarget = 1; Sound.setMode('night');
      // Mommy heads to the bedroom too (Daddy goes in updateDad)
      G.mommy.bubble = null; G.mommy.faceTo = null;
      setPath(G.mommy, SLEEP_WAIT.mommy.x, SLEEP_WAIT.mommy.y);
    }
  }
  G.night += (G.nightTarget - G.night) * Math.min(1, dt * 0.3);
  if (G.night > 0.35 && Math.random() < dt * 3) {
    const vw = view.w / G.cam.zoom, vh = view.h / G.cam.zoom;
    spawn('firefly', G.cam.x + rand(-vw / 2, vw / 2), G.cam.y + rand(-vh / 2, vh / 2), { z: rand(10, 60), vx: rand(-15, 15), vy: rand(-8, 8), vz: rand(-5, 5), life: rand(3, 5) });
  }
  if (G.player.bubble && G.t > G.player.bubble.until) G.player.bubble = null;
}

function updateParticles(dt) {
  for (const q of G.particles) {
    q.life -= dt;
    q.vz -= q.g * dt;
    q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rot += q.vr * dt;
    if (q.z < 0) {
      if (q.bounce && q.vz < -60) { q.z = 0; q.vz = -q.vz * 0.35; q.vx *= 0.6; }
      else { q.z = 0; q.vz = 0; q.vx *= 0.85; q.vy *= 0.85; }
    }
    if (q.type === 'confetti') { q.vx += Math.sin(G.t * 5 + q.rot) * 30 * dt; q.vz = Math.max(q.vz, -70); }
    if (q.type === 'leaf') { q.vx = Math.sin(G.t * 3 + q.rot) * 25; q.vz = Math.max(q.vz, -40); }
  }
  G.particles = G.particles.filter(q => q.life > 0);
}

// ------------------------------------------------------------------ camera
function updateCamera(dt, snap = false) {
  const p = G.player, f = G.camFocus;
  let tx, ty, zt = view.baseZoom;
  if (f) {
    tx = f.x; ty = f.y;
    zt = f.fit ? Math.min(view.w / f.fit.w, view.h / f.fit.h) : view.baseZoom;
    if (f.zoom) zt *= f.zoom;
  } else if (G.phase === 'title' || G.phase === 'sleep' || p.inBed) { tx = 400; ty = 330; }
  else { tx = p.x; ty = p.y - 45; }
  const k = snap ? 1 : 1 - Math.exp(-4 * dt), kz = snap ? 1 : 1 - Math.exp(-2.5 * dt);
  const cam = G.cam;
  cam.zoom += (zt - cam.zoom) * kz;
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  const vw = view.w / cam.zoom, vh = view.h / cam.zoom;
  cam.x = vw >= WORLD.W ? WORLD.W / 2 : clamp(cam.x, vw / 2, WORLD.W - vw / 2);
  cam.y = vh >= WORLD.H ? WORLD.H / 2 : clamp(cam.y, vh / 2, WORLD.H - vh / 2);
}

// ------------------------------------------------------------------ main update
function update(dt) {
  G.t += dt;
  const mv = Input.getMove();
  const press = Input.consumePress();
  if (G.phase === 'title') {
    if (G.t > 0.4 && (press || mv.mag > 0.6)) { G.phase = 'sleep'; G.sleepT = 0; G.splashOut = G.t; Sound.init(); Sound.play('sparkle'); }
  } else if (G.phase === 'sleep' && !G.cut) {
    G.sleepT += dt;
    if (G.sleepT > 0.5 && (mv.mag > 0.3 || press)) startCut('wake');
  }
  updatePlayer(dt, mv);
  if (G.cut) { G.cut.prev = G.cut.t; G.cut.t += dt; CUTS[G.cut.name].update(G.cut.t, dt); }
  updateMommy(dt);
  updateDad(dt);
  for (const a of G.list) updateAnimal(a, dt);
  updateGuide(dt);
  if (!G.cut) checkInteractions();
  updateIdle(dt, mv);
  updateFlying(dt);
  updateParticles(dt);
  ambient(dt);
  updateCamera(dt);
}

// ------------------------------------------------------------------ drawing
const ICON_FIT = {
  chickens: [1.15, 4], cow: [0.7, -6], turtle: [1.4, -4], goose: [1.25, -3], alpaca: [0.78, -4], dog: [1.25, -5],
  alligator: [0.56, 6], fox: [1.3, 6], flour: [1.9, 0], oil: [1.8, 0], egg: [2.4, 0], milk: [1.9, 0], cupcake: [2.0, 0],
};
const iconCache = new Map();
function getIcon(kind, sil) {
  const key = kind + (sil ? '#s' : '');
  let cv = iconCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  const [s, dx] = ICON_FIT[kind] || [1, 0];
  x.translate(64 + dx * s, 116); x.scale(s, s);
  if (ITEM_KINDS.has(kind)) drawItem(x, kind, 0, 0, 1);
  else drawAnimal(x, kind, { x: 0, y: 0, t: 1, facing: 1, noShadow: true, happy: !sil });
  if (sil) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#8b95a5'; x.fillRect(0, 0, 128, 128); }
  iconCache.set(key, cv);
  return cv;
}

function drawCheck(c, x, y, r, k = 1) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = '#3cc46a'; c.strokeStyle = '#ffffff'; c.lineWidth = r * 0.22;
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
  c.lineWidth = r * 0.3; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-r * 0.45, 0); c.lineTo(-r * 0.1, r * 0.35); c.lineTo(r * 0.5, -r * 0.4); c.stroke();
  c.restore();
}

function drawGuideGround(c) {
  const g = G.guide, tg = g.target;
  if (!tg) return;
  const t = G.t;
  // pulsing ring on the ground under the goal
  c.save();
  const pr = 46 + Math.sin(t * 5) * 6;
  c.strokeStyle = 'rgba(255,210,63,0.9)'; c.lineWidth = 5;
  c.setLineDash([14, 10]); c.lineDashOffset = -t * 30;
  c.beginPath(); c.ellipse(tg.x, tg.y, pr * 1.3, pr * 0.5, 0, 0, TAU); c.stroke();
  c.setLineDash([]);
  // sparkle trail along the walkable path
  const path = g.path;
  if (path && path.length > 1 && !G.player.inBed) {
    const p = G.player;
    const pts = [{ x: p.x, y: p.y }, ...path.slice(1)];
    const gap = 40, off = (t * 55) % gap;
    let travelled = 0, next = 70 + off;
    for (let i = 0; i < pts.length - 1 && next < 900; i++) {
      const a = pts[i], b = pts[i + 1], seg = Math.hypot(b.x - a.x, b.y - a.y);
      while (next <= travelled + seg && next < 900) {
        const k = (next - travelled) / seg;
        const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k);
        if (Math.hypot(x - tg.x, y - tg.y) < 50) { next = 99999; break; }
        const alpha = clamp(1 - next / 900, 0, 1) * 0.9;
        const s = 5 + Math.sin(t * 6 + next * 0.05) * 1.5;
        c.globalAlpha = alpha;
        c.fillStyle = '#fff6b0';
        starPath(c, x, y - 4, s * 1.3, s * 0.45, 4, t * 1.5);
        c.fill();
        next += gap;
      }
      travelled += seg;
    }
    c.globalAlpha = 1;
  }
  c.restore();
}

function drawGuideArrow(c) {
  const g = G.guide, tg = g.target;
  if (!tg || g.dirS == null) return;
  const t = G.t, p = G.player;
  // bouncing marker over the goal
  const my = tg.y - tg.h - 34 - Math.abs(Math.sin(t * 4)) * 16;
  c.save(); c.translate(tg.x, my);
  setLine(c, 4); c.fillStyle = '#ffd23f';
  c.beginPath(); c.moveTo(-14, -30); c.lineTo(14, -30); c.lineTo(14, -10); c.lineTo(26, -10); c.lineTo(0, 16); c.lineTo(-26, -10); c.lineTo(-14, -10); c.closePath();
  c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-8, -26, 6, 14);
  c.restore();
  // big arrow next to Sarah pointing along the path
  const alpha = clamp((g.dist - 110) / 90, 0, 1);
  if (alpha <= 0) return;
  const from = p.inBed ? { x: BED.x + BED.w / 2 + 20, y: BED.y + 110 } : p;
  const cx = from.x, cy = from.y - 42;
  const r = 82 + Math.sin(t * 6) * 8;
  const ax = cx + Math.cos(g.dirS) * r, ay = cy + Math.sin(g.dirS) * r;
  c.save();
  c.globalAlpha = alpha;
  c.translate(ax, ay); c.rotate(g.dirS);
  const sc = 1 + Math.sin(t * 6) * 0.06;
  c.scale(sc, sc);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.beginPath(); c.moveTo(34, 6); c.lineTo(6, -20); c.lineTo(6, -6); c.lineTo(-22, -6); c.lineTo(-22, 18); c.lineTo(6, 18); c.lineTo(6, 32); c.closePath(); c.fill();
  setLine(c, 4.5); c.fillStyle = '#ffd23f';
  c.beginPath(); c.moveTo(32, 0); c.lineTo(4, -26); c.lineTo(4, -11); c.lineTo(-24, -11); c.lineTo(-24, 11); c.lineTo(4, 11); c.lineTo(4, 26); c.closePath();
  c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.65)';
  c.beginPath(); c.moveTo(-19, -6); c.lineTo(2, -6); c.lineTo(2, -2); c.lineTo(-19, -2); c.closePath(); c.fill();
  c.restore();
}

function drawParticles(c) {
  for (const q of G.particles) {
    const a = clamp(q.life / Math.min(0.4, q.max), 0, 1);
    c.globalAlpha = a;
    const x = q.x, y = q.y - q.z;
    switch (q.type) {
      case 'heart': drawHeart(c, x + Math.sin((q.max - q.life) * 6) * 4, y, q.size, q.color); break;
      case 'star': drawStar(c, x, y, q.size, q.color, q.rot); break;
      case 'sparkle': c.fillStyle = q.color; starPath(c, x, y, q.size, q.size * 0.35, 4, q.life * 3); c.fill(); break;
      case 'confetti': c.save(); c.translate(x, y); c.rotate(q.rot); c.fillStyle = q.color; c.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); c.restore(); break;
      case 'olive': setLine(c, 1.5); ci(c, x, y, q.size, q.color); break;
      case 'drop': c.fillStyle = '#bfe9ff'; c.beginPath(); c.arc(x, y, q.size, 0, TAU); c.fill(); break;
      case 'crumb': c.fillStyle = '#c98b58'; c.beginPath(); c.arc(x, y, q.size, 0, TAU); c.fill(); break;
      case 'leaf': c.save(); c.translate(x, y); c.rotate(q.rot); setLine(c, 1.5); el(c, 0, 0, q.size, q.size * 0.5, '#6cc66f'); c.restore(); break;
      case 'puff': { c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x, y, q.size * (1 + (q.max - q.life) * 1.5), 0, TAU); c.fill(); break; }
      case 'z': {
        c.save(); c.translate(x, y); const s = q.size * (1 + (q.max - q.life) * 0.4);
        c.lineJoin = 'round'; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-s, -s); c.lineTo(s, -s); c.lineTo(-s, s); c.lineTo(s, s);
        c.strokeStyle = OL; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#bfe0ff'; c.lineWidth = 3; c.stroke();
        c.restore(); break;
      }
      case 'speech': drawSpeech(c, x, y, q.icon, 1.5 * easeOutBack(clamp((q.max - q.life) / 0.3, 0, 1))); break;
      case 'cupcake': drawItem(c, 'cupcake', x, y, q.size); break;
      case 'firefly': {
        const fl = 0.5 + 0.5 * Math.sin(G.t * 6 + q.rot * 10 + q.x);
        c.fillStyle = `rgba(255,240,120,${0.25 * fl})`; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill();
        c.fillStyle = `rgba(255,250,190,${0.9 * fl})`; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
        break;
      }
    }
  }
  c.globalAlpha = 1;
}

function bubbleScale(b) { return easeOutBack(clamp((G.t - b.t0) / 0.35, 0, 1)); }

function drawMommyBubble(c) {
  const m = G.mommy, b = m.bubble;
  if (!b) return;
  const k = bubbleScale(b);
  const tx = m.x - 16, ty = m.y - 120;
  if (b.type === 'cupcake') {
    const w = 96, h = 84, x = m.x - 120, y = m.y - 150;
    drawThought(c, x, y, w, h, tx, ty, k);
    if (k > 0.5) drawItem(c, 'cupcake', x, y + 30, 1.4);
  } else if (b.type === 'list') {
    const w = 240, h = 84, x = m.x - 190, y = m.y - 170;
    drawThought(c, x, y, w, h, tx, ty, k);
    if (k > 0.5) ITEMS.forEach((it, i) => {
      const ix = x - 81 + i * 54, iy = y + 24;
      c.globalAlpha = G.items[it] === 'got' ? 1 : 0.9;
      drawItem(c, it, ix, iy, 0.95);
      c.globalAlpha = 1;
      if (G.items[it] === 'got') drawCheck(c, ix + 15, iy - 6, 9);
    });
  } else if (b.type === 'friends') {
    const w = 250, h = 130, x = m.x - 200, y = m.y - 165;
    drawThought(c, x, y, w, h, tx, ty, k);
    if (k > 0.5) FRIENDS.forEach((f, i) => {
      const ix = x - 90 + (i % 4) * 60, iy = y - 30 + Math.floor(i / 4) * 58;
      const a = G.animals[f];
      c.drawImage(getIcon(f, !a.joined), ix - 27, iy - 27, 54, 54);
    });
  }
}

function drawPlayerBubble(c) {
  const p = G.player, b = p.bubble;
  if (!b) return;
  const k = bubbleScale(b);
  const x = p.x + 10, y = p.y - 158;
  drawThought(c, x, y, 110, 66, p.x + 4, p.y - 108, k);
  if (k > 0.5) {
    drawItem(c, 'cupcake', x - 22, y + 22, 1.05);
    drawBalloon(c, x + 26, y - 6, '#ff6b8a', G.t, x + 24, y + 22);
  }
}

function drawBalloons(c) {
  const t = G.t;
  for (const a of G.list) {
    if (!a.invited || a.state === 'basket' || a.state === 'entrance') continue;
    const inP = isInPumpkin(a);
    const lift = a.lift || 0;
    const ax = inP ? a.x + 8 : a.x + (a.def.bx || 0) * a.facing * 0.7;
    const ay = inP ? a.y - 70 : a.y - lift - a.def.h * 0.82;
    const bx = ax + (inP ? 26 : 10) + Math.sin(t * 1.7 + a.t) * 4;
    const by = (inP ? a.y - 140 : a.y - lift - a.def.h - 42) + Math.sin(t * 2 + a.t) * 4;
    drawBalloon(c, bx, by, a.def.balloon, t + a.t, ax, ay);
  }
}

function render() {
  const c = ctx, dpr = view.dpr, cam = G.cam, z = cam.zoom, t = G.t, p = G.player;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#7fb956'; c.fillRect(0, 0, canvas.width, canvas.height);
  const vw = view.w / z, vh = view.h / z, left = cam.x - vw / 2, top = cam.y - vh / 2;
  c.setTransform(dpr * z, 0, 0, dpr * z, -left * dpr * z, -top * dpr * z);
  c.drawImage(ground, 0, 0, WORLD.W, WORLD.H);
  drawWaves(c, t);
  const inView = (x, y, mx = 220, below = 60, above = 320) => x > left - mx && x < left + vw + mx && y > top - below && y < top + vh + above;
  for (const f of FLOWERS) if (inView(f.x, f.y, 20, 20, 30)) drawFlower(c, f, t);
  drawGuideGround(c);

  const L = [];
  const add = (x, y, fn) => { if (inView(x, y)) L.push({ y, fn }); };
  for (const tr of TREES) {
    const behind = !p.inBed && p.y < tr.y && p.y > tr.y - 200 * tr.s && Math.abs(p.x - tr.x) < 70 * tr.s;
    tr.alpha = lerp(tr.alpha ?? 1, behind ? 0.45 : 1, 0.15);
    add(tr.x, tr.y, () => drawTree(c, tr, t, tr.alpha));
  }
  {
    const tr = OLIVE_TREE;
    const behind = p.y < tr.y && p.y > tr.y - 200 && Math.abs(p.x - tr.x) < 75;
    tr.alpha = lerp(tr.alpha ?? 1, behind ? 0.45 : 1, 0.15);
    add(tr.x, tr.y, () => drawTree(c, tr, t, tr.alpha));
  }
  for (const b of BUSHES) add(b.x, b.y, () => drawBush(c, b, t));
  for (const r of REEDS) add(r.x, r.y, () => drawReeds(c, r, t));
  for (const f of FENCES) L.push({ y: f.ay, fn: () => drawFence(c, f) });
  add(POS.doghouse.x, POS.doghouse.y, () => drawDoghouse(c, POS.doghouse.x, POS.doghouse.y));
  const fox = G.animals.fox, foxIn = isInPumpkin(fox);
  add(POS.pumpkin.x, POS.pumpkin.y, () => drawPumpkin(c, POS.pumpkin.x, POS.pumpkin.y, { t, wobble: G.pumpkinWobble, fox: foxIn, peek: G.pumpkinPeek, happy: fox.happy }));
  add(POS.nest.x, POS.nest.y - 20, () => drawNest(c, POS.nest.x, POS.nest.y, G.nestEggs));
  if (G.items.flour === 'todo') add(POS.flour.x, POS.flour.y, () => { shadow(c, POS.flour.x, POS.flour.y, 20); drawItem(c, 'flour', POS.flour.x, POS.flour.y, 1.1); });
  L.push({ y: BED.y + BED.h, fn: () => drawBed(c, BED, { sarah: p.inBed, mommy: G.mommy.inBed, dad: G.dad.inBed }, t) });
  L.push({ y: OVEN.y + OVEN.h, fn: () => drawOven(c, OVEN, G.oven.glow, t) });
  L.push({ y: COUNTER.y + COUNTER.h, fn: () => drawCounter(c, COUNTER) });
  L.push({ y: TABLE.y, fn: () => drawTable(c, TABLE, G.plate, G.cups) });
  for (const ch of CHAIRS) L.push({ y: ch.y - 4, fn: () => drawChair(c, ch.x, ch.y) });

  for (const a of G.list) {
    if (a.state === 'basket' || (a.kind === 'fox' && foxIn)) continue;
    add(a.x, a.y, () => drawAnimal(c, a.kind, {
      x: a.x, y: a.y, t: a.t, facing: a.facing, moving: a.moving, walk: a.walk, lift: a.lift, swim: a.swim,
      happy: a.happy, sleep: a.sleepy, hat: a.hat, flap: a.flap, grin: G.t - a.grinT < 2.5 || a.state === 'party', mouth: a.kind === 'cow' && G.t - (a.mooT || -9) < 1.1,
    }));
  }
  if (!p.inBed) {
    L.push({ y: p.sortY ?? p.y, fn: () => drawBunny(c, 'sarah', {
      x: p.x, y: p.y, t, facing: p.facing, moving: p.moving, walk: p.walk, jump: p.jump, pose: p.pose,
      eyes: p.eyes || (t < p.happyUntil ? 'happy' : null), mouth: p.mouth, hat: p.hat, basket: G.basket, turtle: p.turtle,
      hold: p.hold, sit: p.sit,
    }) });
  }
  const m = G.mommy;
  if (!m.inBed) {
    L.push({ y: m.sortY ?? m.y, fn: () => drawBunny(c, 'mommy', {
      x: m.x, y: m.y, t: m.t, facing: m.facing, moving: m.moving, walk: m.walk, jump: m.jump,
      pose: m.wave > 0 ? 'wave' : m.hold === 'bowl' ? 'hold' : null, hold: m.hold, stir: m.stir, hat: m.hat,
      eyes: m.wave > 0 ? 'happy' : null,
    }) });
  }
  const d = G.dad;
  if (!d.inBed) {
    const dy = d.sortY ?? d.y;
    if (inView(d.x, dy)) L.push({ y: dy, fn: () => drawBunny(c, 'dad', {
      x: d.x, y: d.y, t: d.t, facing: d.facing, moving: d.moving, walk: d.walk, pose: d.pose, jump: d.jump,
      hold: d.pose === 'hug' ? null : d.hold, hat: d.hat, sit: d.sit, eyes: d.state === 'hug' || d.sit ? 'happy' : null,
    }) });
  }
  L.sort((a, b) => a.y - b.y);
  for (const it of L) it.fn();

  for (const f of G.flying) {
    shadow(c, f.x, f.y, 12 * f.s);
    drawItem(c, f.icon, f.x, f.y - f.z, Math.max(0.01, f.s));
  }
  if (G.night > 0.01) {
    c.fillStyle = `rgba(20,24,72,${0.55 * G.night})`;
    c.fillRect(left - 10, top - 10, vw + 20, vh + 20);
    // warm glow from the house windows at night
    const gl = c.createRadialGradient(540, 340, 60, 540, 340, 620);
    gl.addColorStop(0, `rgba(255,220,140,${0.22 * G.night})`); gl.addColorStop(1, 'rgba(255,220,140,0)');
    c.fillStyle = gl; c.fillRect(-80, -280, 1240, 1240);
  }
  drawBalloons(c);
  drawParticles(c);
  drawMommyBubble(c);
  drawPlayerBubble(c);
  drawGuideArrow(c);

  // ---- screen space
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (G.finalShot) drawPhotoFrame(c);
  drawHUD(c);
  drawStick(c);
  const so = G.splashOut == null ? 1 : (G.t - G.splashOut) / 0.6;
  if (G.phase === 'title') drawSplash(c, 1);
  else if (so < 1) drawSplash(c, 1 - so);
  drawButtons(c);
  if (G.fade > 0) { c.fillStyle = `rgba(10,12,30,${G.fade})`; c.fillRect(0, 0, view.w, view.h); }
  if (DEBUG) drawDebug(c);
}

function drawPhotoFrame(c) {
  const W = view.w, H = view.h, b = Math.max(12, Math.min(W, H) * 0.035);
  const gr = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
  gr.addColorStop(0, 'rgba(255,240,220,0)'); gr.addColorStop(1, 'rgba(120,60,40,0.35)');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  c.fillStyle = '#fffaf2';
  c.beginPath(); c.rect(0, 0, W, H); c.roundRect(b, b, W - 2 * b, H - 2 * b, b); c.fill('evenodd');
  c.strokeStyle = OL; c.lineWidth = 3; c.beginPath(); c.roundRect(b, b, W - 2 * b, H - 2 * b, b); c.stroke();
  for (const [x, y] of [[b * 2.2, b * 2.2], [W - b * 2.2, b * 2.2], [b * 2.2, H - b * 2.2], [W - b * 2.2, H - b * 2.2]]) drawHeart(c, x, y, b * 0.7, '#ff8fb8');
}

function drawHUD(c) {
  if (!G.hudMode) return;
  const s = view.hud, W = view.w;
  const kinds = G.hudMode === 'items' ? ITEMS : FRIENDS;
  const perRow = 4;
  const cell = 64 * s, pad = 10 * s;
  const rowsN = Math.ceil(kinds.length / perRow);
  const pw = perRow * cell + pad * 2, ph = rowsN * cell + pad * 2;
  const appear = easeOutBack(clamp((G.t - G.hudT) / 0.5, 0, 1));
  const x0 = W - pw - 12 * s, y0 = 12 * s;
  const cur = G.guide.target && G.guide.target.kind;
  c.save();
  c.translate(x0 + pw, y0); c.scale(appear, appear); c.translate(-pw, 0);
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.strokeStyle = OL; c.lineWidth = 3 * s;
  c.beginPath(); c.roundRect(0, 0, pw, ph, 18 * s); c.fill(); c.stroke();
  kinds.forEach((k, i) => {
    const cx = pad + (i % perRow) * cell + cell / 2, cy = pad + Math.floor(i / perRow) * cell + cell / 2;
    const done = G.hudMode === 'items' ? G.items[k] === 'got' : G.animals[k].joined;
    if (k === cur && !done) {
      c.fillStyle = `rgba(255,210,63,${0.45 + 0.25 * Math.sin(G.t * 6)})`;
      c.beginPath(); c.arc(cx, cy, cell * 0.46, 0, TAU); c.fill();
    }
    const icon = getIcon(k, G.hudMode === 'friends' && !done);
    c.globalAlpha = G.hudMode === 'items' && !done ? 0.4 : 1;
    const bounce = done ? 1 + 0.25 * Math.max(0, 1 - (G.t - (G.hudCheck[k] || 0)) / 0.4) : 1;
    const sz = cell * 0.92 * bounce;
    c.drawImage(icon, cx - sz / 2, cy - sz / 2, sz, sz);
    c.globalAlpha = 1;
    if (done) {
      const pk = easeOutBack(clamp((G.t - (G.hudCheck[k] || 0)) / 0.35, 0, 1));
      drawCheck(c, cx + cell * 0.27, cy + cell * 0.25, 11 * s, pk);
    }
  });
  c.restore();
}

function drawStick(c) {
  const T = Input.touch;
  if (!T.active || G.phase === 'title') return;
  const R = Input.R;
  let dx = T.x - T.sx, dy = T.y - T.sy;
  const d = Math.hypot(dx, dy);
  if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 4;
  c.beginPath(); c.arc(T.sx, T.sy, R, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.85)'; c.strokeStyle = 'rgba(74,50,38,0.5)'; c.lineWidth = 3;
  c.beginPath(); c.arc(T.sx + dx, T.sy + dy, 28, 0, TAU); c.fill(); c.stroke();
  c.restore();
}

// --- small parent buttons in the top-left corner: sound and full screen
function buttonRects() {
  const s = view.hud, r = 22 * s, y = 14 * s + r;
  const list = [{ id: 'mute', x: 14 * s + r, y, r }];
  if (document.fullscreenEnabled || document.webkitFullscreenEnabled) list.push({ id: 'fs', x: 14 * s + r * 3 + 12 * s, y, r });
  return list;
}
function drawButtons(c) {
  if (G.finalShot) return;
  for (const b of buttonRects()) {
    c.save(); c.translate(b.x, b.y);
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.strokeStyle = 'rgba(74,50,38,0.7)'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.fill(); c.stroke();
    const u = b.r / 22;
    c.scale(u, u);
    c.fillStyle = OL; c.strokeStyle = OL; c.lineWidth = 2.5; c.lineCap = 'round';
    if (b.id === 'mute') {
      c.beginPath(); c.moveTo(-10, -4); c.lineTo(-5, -4); c.lineTo(1, -10); c.lineTo(1, 10); c.lineTo(-5, 4); c.lineTo(-10, 4); c.closePath(); c.fill();
      if (Sound.muted) { c.beginPath(); c.moveTo(5, -5); c.lineTo(12, 5); c.moveTo(12, -5); c.lineTo(5, 5); c.stroke(); }
      else { c.beginPath(); c.arc(2, 0, 6, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(2, 0, 11, -0.9, 0.9); c.stroke(); }
    } else {
      const k = 9, q = 4;
      c.beginPath();
      c.moveTo(-k, -k + q); c.lineTo(-k, -k); c.lineTo(-k + q, -k);
      c.moveTo(k - q, -k); c.lineTo(k, -k); c.lineTo(k, -k + q);
      c.moveTo(k, k - q); c.lineTo(k, k); c.lineTo(k - q, k);
      c.moveTo(-k + q, k); c.lineTo(-k, k); c.lineTo(-k, k - q);
      c.stroke();
    }
    c.restore();
  }
}
let uiDown = null;
function uiHit(x, y, type) {
  const hit = buttonRects().find(b => Math.hypot(x - b.x, y - b.y) < b.r + 6);
  if (type === 'down') { uiDown = hit ? hit.id : null; return !!hit; }
  if (type === 'up') {
    if (hit && uiDown === hit.id) {
      if (hit.id === 'mute') { Sound.init(); Sound.toggleMute(); }
      if (hit.id === 'fs') toggleFullscreen();
    }
    uiDown = null;
  }
  return false;
}
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if (r && r.catch) r.catch(() => {});
    } else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  } catch (e) { /* not supported */ }
}

// ------------------------------------------------------------------ splash
// A wordless title picture: Daddy, Sarah and Mommy with a tray of cupcakes.
// Any tap, click, key, stick push or button makes it go away.
const SPLASH_FLOWERS = (() => {
  const r = mulberry32(11), out = [];
  for (let i = 0; i < 28; i++) out.push({ u: r(), v: r(), c: FLOWER_COLORS[(r() * FLOWER_COLORS.length) | 0] });
  return out;
})();
const TRAY_SLOTS = [[-18, -4], [0, -5], [18, -4], [-27, 4], [-9, 5], [9, 5], [27, 4]];   // back row, then front row

function drawTray(c, x, y, s, t) {
  c.save(); c.translate(x, y); c.scale(s, s); setLine(c, 3);
  el(c, 0, 8, 48, 13, '#d4d9e0');
  el(c, 0, 6, 40, 9, '#eef1f5', 0, false);
  for (const [dx, dy] of TRAY_SLOTS) drawItem(c, 'cupcake', dx, dy + 6, 0.62);
  const tw = (Math.sin(t * 4) + 1) / 2;
  c.fillStyle = `rgba(255,255,255,${0.5 + tw * 0.5})`;
  starPath(c, 32, -30, 6 + tw * 3, 2, 4, 0); c.fill();
  c.restore();
}

function drawSplash(c, alpha) {
  const W = view.w, H = view.h, t = G.t;
  const k = Math.min(W / 340, H / 360);                 // size of the picture
  const cx = W / 2, gy = Math.min(H * 0.74, H / 2 + 180 * k);   // where the family stands
  c.save();
  c.globalAlpha = alpha;
  if (alpha < 1) { const z = 1 + (1 - alpha) * 0.08; c.translate(cx, H / 2); c.scale(z, z); c.translate(-cx, -H / 2); }

  const sky = c.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#8fd0ff'); sky.addColorStop(0.7, '#d6efff'); sky.addColorStop(1, '#fff1f6');
  c.fillStyle = sky; c.fillRect(-W, -H, W * 3, H * 3);

  // smiling sun
  const sx = W - Math.min(W * 0.16, 110 * k), sy = Math.min(H * 0.22, 100 * k), sr = 34 * k;
  c.save(); c.translate(sx, sy); c.rotate(t * 0.2); c.fillStyle = '#ffe58a';
  for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(sr * 1.15, -sr * 0.14); c.lineTo(sr * 1.6, 0); c.lineTo(sr * 1.15, sr * 0.14); c.closePath(); c.fill(); }
  c.restore();
  c.save(); c.translate(sx, sy); c.scale(k, k); setLine(c, 3);
  ci(c, 0, 0, 34, '#ffd23f');
  eyeDot(c, -11, -4, 3, 'happy'); eyeDot(c, 11, -4, 3, 'happy'); smile(c, 0, 8, 9);
  el(c, -20, 7, 5, 3, 'rgba(255,130,150,0.45)', 0, false); el(c, 20, 7, 5, 3, 'rgba(255,130,150,0.45)', 0, false);
  c.restore();

  // drifting clouds
  for (let i = 0; i < 3; i++) {
    const span = W + 260 * k, cs = k * (0.8 + i * 0.15);
    const x = ((t * 10 * k + (i * span) / 3 + 40 * k) % span) - 130 * k;
    const y = (52 + i * 30) * k + (i === 1 ? H * 0.1 : 0);
    c.save(); c.translate(x, y); c.scale(cs, cs);
    blobs(c, [[-34, 0, 20], [-10, -12, 26], [18, -6, 22], [38, 4, 16], [0, 8, 20]], '#ffffff', 5);
    c.restore();
  }

  // party bunting across the top
  const by0 = Math.max(16, 12 * k), sag = 24 * k;
  const bY = x => by0 + sag * Math.sin((Math.PI * x) / W);
  c.strokeStyle = OL; c.lineWidth = Math.max(2, 1.5 * k);
  c.beginPath(); c.moveTo(0, bY(0));
  for (let x = 8; x <= W; x += 8) c.lineTo(x, bY(x));
  c.stroke();
  let fi = 0;
  for (let x = 22 * k; x < W; x += 44 * k, fi++) {
    c.save(); c.translate(x, bY(x)); c.rotate(Math.sin(t * 2 + fi) * 0.08);
    setLine(c, Math.max(1.5, 1.2 * k)); tri(c, -14 * k, 0, 14 * k, 0, 0, 28 * k, COLORS[fi % COLORS.length]);
    c.restore();
  }

  // hills and grass
  c.fillStyle = '#bfe691'; c.beginPath(); c.ellipse(cx - W * 0.32, gy + 30 * k, W * 0.55, 120 * k, 0, 0, TAU); c.fill();
  c.fillStyle = '#addf82'; c.beginPath(); c.ellipse(cx + W * 0.35, gy + 40 * k, W * 0.6, 100 * k, 0, 0, TAU); c.fill();
  c.fillStyle = '#a6d873';
  c.beginPath(); c.moveTo(-W, gy - 18 * k);
  for (let x = -W; x <= W * 2; x += 40) c.lineTo(x, gy - 18 * k + Math.sin(x * 0.01) * 6 * k);
  c.lineTo(W * 2, H * 2); c.lineTo(-W, H * 2); c.closePath(); c.fill();
  for (const f of SPLASH_FLOWERS) {
    const fx = f.u * W, fy = gy - 6 * k + f.v * (H - gy + 6 * k);
    if (Math.abs(fx - cx) < 170 * k && fy < gy + 30 * k) continue;   // keep flowers out from under the family
    if (Math.abs(fx - cx) < 60 * view.hud && fy > H - 110 * view.hud) continue;   // and away from the tap hint
    c.save(); c.translate(fx, fy); c.scale(k * 1.3, k * 1.3); drawFlower(c, { x: 0, y: 0, c: f.c }, t); c.restore();
  }

  // the family: Daddy waving a flower, Sarah cheering, Mommy holding the cupcakes
  const bunny = (kind, x, y, o) => { c.save(); c.translate(x, y); c.scale(k, k); drawBunny(c, kind, Object.assign({ x: 0, y: 0, t }, o)); c.restore(); };
  const momX = cx + 112 * k;
  bunny('dad', cx - 118 * k, gy, { facing: 1, pose: 'wave', eyes: 'happy', hold: 'flower', hat: '#6bc5ff' });
  bunny('mommy', momX, gy, { facing: -1, pose: 'hold', eyes: 'happy', hat: '#ff6b8a' });
  drawTray(c, momX - 34 * k, gy - 47 * k, k * 1.15, t);
  bunny('sarah', cx - 4 * k, gy + 16 * k, { facing: 1, pose: 'up', eyes: 'happy', hat: '#ffd23f', jump: Math.abs(Math.sin(t * 3)) * 8 });

  // floating hearts and falling confetti
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.35 + i / 5) % 1;
    c.globalAlpha = alpha * Math.sin(Math.PI * ph);
    drawHeart(c, cx + (i - 2) * 70 * k + Math.sin(t * 2 + i) * 10 * k, gy - 175 * k - ph * 110 * k, 9 * k, i % 2 ? '#ff8fb8' : '#ff5c8a');
  }
  c.globalAlpha = alpha;
  for (let i = 0; i < 30; i++) {
    const x = ((i * 97.3) % W) + Math.sin(t * 1.3 + i) * 18 * k;
    const y = ((t * (30 + (i % 5) * 9) * k * 0.6 + i * 71) % (H + 40)) - 20;
    c.save(); c.translate(x, y); c.rotate(t * (1.5 + (i % 3)) + i);
    c.fillStyle = COLORS[i % COLORS.length]; c.fillRect(-4 * k, -2 * k, 8 * k, 4 * k);
    c.restore();
  }

  // "tap here" hint: a finger tapping with ripples
  const hs = view.hud, hx = cx, hy = H - Math.max(36, 52 * hs);
  for (let j = 0; j < 2; j++) {
    const ph = (t * 0.9 + j * 0.5) % 1;
    c.strokeStyle = `rgba(255,255,255,${(1 - ph) * 0.9})`; c.lineWidth = 4 * hs;
    c.beginPath(); c.arc(hx, hy, (12 + ph * 36) * hs, 0, TAU); c.stroke();
  }
  const tap = Math.abs(Math.sin(t * 3));
  c.save(); c.translate(hx, hy + (6 - tap * 10) * hs); c.scale(hs, hs); setLine(c, 3);
  c.fillStyle = '#ffe0c8';
  c.beginPath(); c.roundRect(-9, 14, 32, 28, 11); c.fill(); c.stroke();
  for (const kx of [8, 17]) { c.beginPath(); c.roundRect(kx - 4, 10, 9, 12, 4.5); c.fill(); c.stroke(); }
  c.beginPath(); c.roundRect(-7, -6, 14, 34, 7); c.fill(); c.stroke();
  c.restore();
  c.restore();
}

function drawDebug(c) {
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, view.h - 22, 420, 22);
  c.fillStyle = '#fff'; c.font = '12px monospace';
  c.fillText(`${G.phase} ${G.cut ? G.cut.name : ''} p=${G.player.x | 0},${G.player.y | 0} idle=${G.idleT.toFixed(1)}`, 6, view.h - 7);
}

// ------------------------------------------------------------------ boot
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  view.w = w; view.h = h; view.dpr = dpr;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  view.baseZoom = Math.min(w, h) / 600;
  view.hud = clamp(Math.min(w, h) / 600, 0.62, 1.25);
  const gs = clamp(view.baseZoom * dpr, 0.5, 1.5);
  if (!ground || Math.abs(gs - groundScale) / groundScale > 0.25) { groundScale = gs; ground = renderGround(gs); }
  if (G.player) updateCamera(0, true);   // no slow zoom after rotating a phone
}

function boot() {
  const obstacles = buildObstacles();
  obstacles.push({ t: 'rect', x: 0, y: 0, w: 1000, h: 104 }, { t: 'rect', x: 0, y: 0, w: 104, h: 600 });
  Nav.build(obstacles, WORLD.W, WORLD.H, POS.mommy.x, POS.mommy.y);
  buildDecor();
  resetWorld();
  resize();
  updateCamera(0, true);
  addEventListener('resize', resize);
  Input.attach(canvas, uiHit);
  let fsTried = false;
  const unlock = e => {
    Sound.init();
    if (!fsTried && (e.type === 'pointerup' || e.type === 'touchend') && e.pointerType !== 'mouse' && matchMedia('(pointer: coarse)').matches) {
      fsTried = true; toggleFullscreen();
    }
  };
  for (const ev of ['pointerup', 'touchend', 'keydown', 'mousedown', 'click']) addEventListener(ev, unlock, { passive: true });
  if (DEBUG) {
    addEventListener('keydown', e => {
      if (e.key === '1' && G.phase === 'sleep') startCut('wake');
      if (e.key === '2') { G.cut = null; G.player.inBed = false; G.player.frozen = false; G.phase = 'gather'; G.hudMode = 'items'; G.hudT = G.t; }
      if (e.key === '3') { for (const k of ITEMS) { G.items[k] = 'got'; if (!G.basket.includes(k)) G.basket.push(k); } }
      if (e.key === '4') { for (const a of G.list) if (!a.joined) joinFriend(a); }
      if (e.key === '5') { G.freeT = 69; }
    });
  }
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
boot();
