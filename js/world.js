'use strict';
// The yard, laid out like the drawing: house top-left (bedroom | kitchen),
// porch with the flour below it, olive tree bottom-left, chickens and cow in the
// middle, big tree + turtle and the goose pond up top, alpaca top-right,
// doghouse right, alligator creek bottom-right, fox pumpkin bottom-centre.

const WORLD = { W: 2600, H: 1800 };

const WALLS = [
  { x: 80, y: 80, w: 920, h: 24 },    // top
  { x: 80, y: 80, w: 24, h: 520 },    // left
  { x: 976, y: 80, w: 24, h: 520 },   // right
  { x: 80, y: 576, w: 560, h: 24 },   // bottom, left of the front door
  { x: 760, y: 576, w: 240, h: 24 },  // bottom, right of the front door
  { x: 400, y: 80, w: 24, h: 210 },   // bedroom | kitchen wall (above its doorway)
  { x: 400, y: 420, w: 24, h: 180 },  // bedroom | kitchen wall (below its doorway)
];
const BED = { x: 114, y: 122, w: 190, h: 165 };   // big enough for the whole family
const OVEN = { x: 884, y: 104, w: 84, h: 64 };
const COUNTER = { x: 690, y: 104, w: 190, h: 52 };
const TABLE = { x: 690, y: 400, r: 44 };
const CHAIRS = [{ x: 612, y: 404 }, { x: 768, y: 404 }];

const POS = {
  wake: { x: 358, y: 250 },
  bedSide: { x: 355, y: 230 },
  mommy: { x: 800, y: 292 },
  flour: { x: 800, y: 660 },
  olive: { x: 300, y: 1330 },
  chickens: { x: 800, y: 1010 },
  nest: { x: 735, y: 1050 },
  cow: { x: 1310, y: 1040 },
  turtle: { x: 1185, y: 455 },
  goose: { x: 1640, y: 430 },
  alpaca: { x: 2250, y: 350 },
  doghouse: { x: 2265, y: 780 },
  dog: { x: 2150, y: 845 },
  pumpkin: { x: 1300, y: 1530 },
  alligator: { x: 2250, y: 1155 },
  doorOutside: { x: 700, y: 690 },
};
const POND = { x: 1650, y: 360, rx: 250, ry: 140 };
const CREEK = smoothPolyline([[2660, 1060], [2380, 1130], [2120, 1175], [1930, 1255], [1830, 1385], [1900, 1525], [2140, 1600], [2440, 1640], [2660, 1650]], 10);
const FENCES = [{ ax: 80, ay: 702, bx: 540 }, { ax: 860, ay: 702, bx: 1060 }];

const TREES = [
  { x: 1120, y: 315, s: 1.3 },   // the big tree with the turtle
  { x: 1345, y: 150, s: 0.95 },
  { x: 1960, y: 140, s: 1.05 },
  { x: 2105, y: 245, s: 0.9 },
  { x: 2430, y: 210, s: 1.1 },
  { x: 2490, y: 470, s: 0.95 },
  { x: 2040, y: 490, s: 0.85 },
  { x: 2550, y: 870, s: 0.9 },
  { x: 120, y: 905, s: 1.0 },
  { x: 92, y: 1135, s: 0.9 },
  { x: 1580, y: 1300, s: 0.85 },
  { x: 1040, y: 1240, s: 0.8 },
  { x: 2560, y: 1770, s: 0.8 },
];
TREES.forEach((t, i) => { t.blobs = makeTreeBlobs(100 + i); });

const OLIVE_TREE = {
  x: 300, y: 1330, s: 1.05, color: '#94b060', light: '#b4cd86', trunk: '#8a7358', shake: true,
  blobs: makeTreeBlobs(7),
};
OLIVE_TREE.fruit = (() => {
  const r = mulberry32(99), out = [];
  for (let i = 0; i < 16; i++) out.push([(r() - 0.5) * 90, -80 - r() * 80, 4, r() < 0.5 ? '#4f6b2a' : '#5b3d5e']);
  return out;
})();

const BUSHES = [
  { x: 170, y: 1640, s: 1.15 }, { x: 400, y: 1705, s: 1.0, berries: '#ff6b8a' }, { x: 620, y: 1650, s: 1.1 },
  { x: 860, y: 1710, s: 1.0 }, { x: 1060, y: 1655, s: 0.9, berries: '#6bc5ff' }, { x: 1520, y: 1705, s: 1.0 },
  { x: 1700, y: 1640, s: 0.85 }, { x: 150, y: 1460, s: 0.85, berries: '#ff6b8a' }, { x: 530, y: 1450, s: 0.8 },
  { x: 1900, y: 870, s: 0.8 }, { x: 1440, y: 770, s: 0.75, berries: '#ffd23f' }, { x: 990, y: 770, s: 0.8 },
  { x: 1180, y: 1720, s: 0.8 }, { x: 1830, y: 640, s: 0.75 },
];

const PATHS = [
  [[700, 640], [700, 780], [720, 900]],
  [[720, 900], [560, 1040], [420, 1190], [340, 1270]],
  [[720, 900], [790, 960]],
  [[720, 900], [1000, 960], [1230, 1030]],
  [[1000, 960], [1250, 800], [1500, 640]],
  [[1250, 800], [1700, 790], [2120, 880]],
  [[1230, 1030], [1280, 1250], [1300, 1440]],
  [[1700, 790], [2000, 620], [2200, 470]],
  [[2120, 880], [2250, 1040]],
];

// spots where Daddy hangs out between hugs
const DAD_SPOTS = [
  { x: 480, y: 1210 }, { x: 1480, y: 625 }, { x: 2040, y: 700 },
  { x: 1070, y: 1470 }, { x: 1610, y: 1060 }, { x: 600, y: 860 },
];

const FLOWER_COLORS = ['#ff7eb6', '#ffd23f', '#b28dff', '#ffffff', '#ff8f5a', '#7cc8ff'];
let FLOWERS = [], REEDS = [];

function inWaterPond(x, y, inset = 15) {
  const dx = (x - POND.x) / (POND.rx - inset), dy = (y - POND.y) / (POND.ry - inset);
  return dx * dx + dy * dy < 1;
}
function creekDist(x, y) {
  let best = 1e9;
  for (let i = 0; i < CREEK.length - 1; i++) {
    const q = segClosest(x, y, CREEK[i].x, CREEK[i].y, CREEK[i + 1].x, CREEK[i + 1].y);
    const d = Math.hypot(x - q.x, y - q.y);
    if (d < best) best = d;
  }
  return best;
}

function buildObstacles() {
  const o = [];
  for (const w of WALLS) o.push({ t: 'rect', x: w.x, y: w.y, w: w.w, h: w.h });
  o.push({ t: 'rect', x: BED.x, y: BED.y, w: BED.w, h: BED.h });
  o.push({ t: 'rect', x: OVEN.x, y: OVEN.y, w: OVEN.w, h: OVEN.h });
  o.push({ t: 'rect', x: COUNTER.x, y: COUNTER.y, w: COUNTER.w, h: COUNTER.h });
  o.push({ t: 'circle', x: TABLE.x, y: TABLE.y - 8, r: TABLE.r });
  o.push({ t: 'ellipse', x: POND.x, y: POND.y, rx: POND.rx - 22, ry: POND.ry - 22 });
  for (let i = 0; i < CREEK.length - 1; i++) o.push({ t: 'seg', ax: CREEK[i].x, ay: CREEK[i].y, bx: CREEK[i + 1].x, by: CREEK[i + 1].y, r: 46 });
  for (const f of FENCES) o.push({ t: 'seg', ax: f.ax, ay: f.ay - 4, bx: f.bx, by: f.ay - 4, r: 6 });
  for (const tr of TREES) o.push({ t: 'circle', x: tr.x, y: tr.y - 4, r: 14 * tr.s });
  o.push({ t: 'circle', x: OLIVE_TREE.x, y: OLIVE_TREE.y - 4, r: 14 * OLIVE_TREE.s });
  o.push({ t: 'rect', x: POS.doghouse.x - 50, y: POS.doghouse.y - 44, w: 100, h: 44 });
  o.push({ t: 'circle', x: POS.pumpkin.x, y: POS.pumpkin.y - 16, r: 40 });
  return o;
}

function distToPaths(x, y) {
  let best = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) {
    const q = segClosest(x, y, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
    best = Math.min(best, Math.hypot(x - q.x, y - q.y));
  }
  return best;
}

function buildDecor() {
  const r = mulberry32(42);
  FLOWERS = [];
  for (let i = 0; i < 900 && FLOWERS.length < 190; i++) {
    const x = 60 + r() * (WORLD.W - 120), y = 120 + r() * (WORLD.H - 160);
    if (x < 1030 && y < 730) continue;
    if (Nav.blockedAt(x, y) || distToPaths(x, y) < 44) continue;
    if (inWaterPond(x, y, -40) || creekDist(x, y) < 95) continue;
    FLOWERS.push({ x, y, c: FLOWER_COLORS[(r() * FLOWER_COLORS.length) | 0], jig: null });
  }
  FLOWERS.sort((a, b) => a.y - b.y);
  REEDS = [];
  const mk = (x, y) => {
    const n = 3 + ((r() * 3) | 0), stalks = [];
    for (let k = 0; k < n; k++) stalks.push({ dx: (k - n / 2) * 6, a: (r() - 0.5) * 0.5, h: 28 + r() * 24, cat: r() < 0.6 });
    REEDS.push({ x, y, stalks, jig: null });
  };
  for (let i = 4; i < CREEK.length - 1; i += 7) {
    const a = CREEK[i], b = CREEK[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    for (const side of [1, -1]) {
      const off = 64 + r() * 14;
      const x = a.x + nx * off * side, y = a.y + ny * off * side;
      if (x > 40 && x < WORLD.W - 30 && y > 60 && y < WORLD.H - 30 && creekDist(x, y) > 60 && r() < 0.8) mk(x, y);
    }
  }
  for (const ang of [0.3, 0.7, 1.1, 2.5, 2.9]) mk(POND.x + Math.cos(ang) * (POND.rx + 4), POND.y + Math.sin(ang) * (POND.ry + 4));
}

// ------------------------------------------------------------ ground image
function strokeLine(c, pts, w, color) {
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.stroke();
}

function renderGround(gs) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(WORLD.W * gs); cv.height = Math.ceil(WORLD.H * gs);
  const c = cv.getContext('2d');
  c.scale(gs, gs);
  const r = mulberry32(7);
  const W = WORLD.W, H = WORLD.H;

  c.fillStyle = '#a6d873'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(140,200,95,0.35)' : 'rgba(195,232,145,0.32)';
    c.beginPath(); c.ellipse(r() * W, r() * H, 60 + r() * 150, 40 + r() * 90, r() * 3, 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(88,150,58,0.5)'; c.lineWidth = 2.2; c.lineCap = 'round';
  for (let i = 0; i < 1700; i++) {
    const x = r() * W, y = r() * H;
    c.beginPath(); c.moveTo(x - 4, y - 6); c.lineTo(x, y); c.lineTo(x + 4, y - 7); c.stroke();
  }

  // dirt paths
  const sp = PATHS.map(p => smoothPolyline(p, 8));
  for (const p of sp) strokeLine(c, p, 78, '#d6b27c');
  for (const p of sp) strokeLine(c, p, 64, '#ecd3a4');
  c.fillStyle = 'rgba(180,140,90,0.45)';
  for (const p of sp) for (let i = 0; i < p.length; i += 2) {
    const q = p[i]; c.beginPath(); c.arc(q.x + (r() - 0.5) * 44, q.y + (r() - 0.5) * 44, 2 + r() * 2.5, 0, TAU); c.fill();
  }

  // pond
  c.fillStyle = '#efe0b0'; c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx + 22, POND.ry + 18, 0, 0, TAU); c.fill();
  c.fillStyle = '#5fbce6'; c.strokeStyle = OL; c.lineWidth = 3;
  c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#86d0f0'; c.beginPath(); c.ellipse(POND.x - 25, POND.y - 22, POND.rx * 0.72, POND.ry * 0.52, 0, 0, TAU); c.fill();
  for (const [lx, ly, lr] of [[1480, 310, 18], [1520, 290, 13], [1790, 300, 16], [1760, 410, 14]]) {
    c.fillStyle = '#5fae4c'; c.strokeStyle = OL; c.lineWidth = 2;
    c.beginPath(); c.moveTo(lx, ly); c.arc(lx, ly, lr, 0.4, TAU - 0.1); c.closePath(); c.fill(); c.stroke();
  }
  for (const [fx, fy] of [[1485, 303], [1792, 293]]) {
    c.fillStyle = '#ffb3d1';
    for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; c.beginPath(); c.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3.5, 0, TAU); c.fill(); }
    c.fillStyle = '#ffe066'; c.beginPath(); c.arc(fx, fy, 2.5, 0, TAU); c.fill();
  }

  // creek
  strokeLine(c, CREEK, 152, '#efe0b0');
  strokeLine(c, CREEK, 118, OL);
  strokeLine(c, CREEK, 112, '#5fbce6');
  strokeLine(c, CREEK, 56, '#86d0f0');

  // house shadow, porch and floors
  c.fillStyle = 'rgba(40,70,20,0.18)'; c.fillRect(92, 96, 920, 520);
  c.fillStyle = '#d29b62'; c.strokeStyle = OL; c.lineWidth = 3;
  c.beginPath(); c.roundRect(590, 596, 240, 94, 6); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(74,50,38,0.35)'; c.lineWidth = 2;
  for (let y = 616; y < 690; y += 18) { c.beginPath(); c.moveTo(594, y); c.lineTo(826, y); c.stroke(); }
  c.fillStyle = '#c08a52'; c.strokeStyle = OL; c.lineWidth = 3;
  c.beginPath(); c.roundRect(640, 688, 120, 16, 4); c.fill(); c.stroke();
  c.fillStyle = '#ff9ec4'; c.beginPath(); c.roundRect(662, 612, 76, 34, 8); c.fill(); c.stroke();

  c.fillStyle = '#e9c48f'; c.fillRect(104, 104, 296, 472);
  c.strokeStyle = 'rgba(160,110,60,0.35)'; c.lineWidth = 2;
  for (let y = 130; y < 576; y += 26) { c.beginPath(); c.moveTo(104, y); c.lineTo(400, y); c.stroke(); }
  c.fillStyle = '#ffc3d8'; c.strokeStyle = OL; c.lineWidth = 3;
  c.beginPath(); c.ellipse(260, 440, 95, 58, 0, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = '#fff0f6'; c.lineWidth = 6; c.beginPath(); c.ellipse(260, 440, 70, 40, 0, 0, TAU); c.stroke();

  for (let y = 104; y < 576; y += 36) for (let x = 424; x < 976; x += 36) {
    c.fillStyle = ((x - 424) / 36 + (y - 104) / 36) % 2 ? '#f6e2c4' : '#fff6e6';
    c.fillRect(x, y, Math.min(36, 976 - x), Math.min(36, 576 - y));
  }
  c.fillStyle = '#bfe3ff'; c.strokeStyle = OL; c.lineWidth = 3;
  c.beginPath(); c.ellipse(690, 410, 130, 84, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 14; i++) { const a = (i * TAU) / 14; c.beginPath(); c.arc(690 + Math.cos(a) * 110, 410 + Math.sin(a) * 68, 4, 0, TAU); c.fill(); }
  c.fillStyle = '#e9c48f'; c.fillRect(400, 290, 24, 130); c.fillRect(640, 576, 120, 24);

  // walls: light top face + darker front face so they read as low walls
  c.lineWidth = 3; c.strokeStyle = OL;
  const vert = WALLS.filter(w => w.h > w.w), horiz = WALLS.filter(w => w.w >= w.h);
  for (const w of vert) {
    c.fillStyle = '#fff3e4'; c.beginPath(); c.rect(w.x, w.y, w.w, w.h); c.fill(); c.stroke();
    c.fillStyle = '#dcae80'; c.beginPath(); c.rect(w.x, w.y + w.h - 10, w.w, 10); c.fill(); c.stroke();
  }
  for (const w of horiz) {
    c.fillStyle = '#fff3e4'; c.beginPath(); c.rect(w.x, w.y, w.w, 14); c.fill(); c.stroke();
    c.fillStyle = '#dcae80'; c.beginPath(); c.rect(w.x, w.y + 14, w.w, w.h - 14); c.fill(); c.stroke();
  }
  // windows on the back wall
  for (const wx of [170, 300, 480, 600]) {
    c.fillStyle = '#bfe6ff'; c.beginPath(); c.rect(wx, 82, 60, 10); c.fill(); c.stroke();
  }
  // door frames
  c.fillStyle = '#b8773f';
  for (const [x, y, w, h] of [[634, 572, 8, 32], [758, 572, 8, 32], [398, 284, 28, 8], [398, 416, 28, 8]]) {
    c.beginPath(); c.rect(x, y, w, h); c.fill(); c.stroke();
  }
  return cv;
}

// little wave marks on the water, drawn every frame
const POND_WAVES = (() => {
  const r = mulberry32(5), out = [];
  for (let i = 0; i < 10; i++) {
    const a = r() * TAU, k = 0.25 + r() * 0.55;
    out.push({ x: POND.x + Math.cos(a) * POND.rx * k, y: POND.y + Math.sin(a) * POND.ry * k, p: r() * 6 });
  }
  return out;
})();
function drawWaves(c, t) {
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 3; c.lineCap = 'round';
  const wave = (x, y) => {
    c.beginPath(); c.moveTo(x - 12, y);
    c.quadraticCurveTo(x - 6, y - 6, x, y); c.quadraticCurveTo(x + 6, y + 6, x + 12, y);
    c.stroke();
  };
  for (const w of POND_WAVES) wave(w.x + Math.sin(t * 0.8 + w.p) * 8, w.y);
  for (let i = 3; i < CREEK.length - 1; i += 6) {
    const a = CREEK[i], b = CREEK[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const k = ((t * 18 + i * 13) % 40) - 20;
    wave(a.x + (dx / l) * k, a.y + (dy / l) * k + ((i % 12) - 6) * 3);
  }
  c.restore();
}
