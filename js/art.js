'use strict';
// Everything is drawn with canvas shapes (no image files).
// Characters are drawn with their feet at (0,0), facing right; the caller flips them.

const OL = '#4a3226';   // outline colour

function setLine(c, w = 3) { c.lineWidth = w; c.strokeStyle = OL; c.lineJoin = 'round'; c.lineCap = 'round'; }
function el(c, x, y, rx, ry, fill, rot = 0, stroke = true) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, Math.abs(rx)), Math.max(0.1, Math.abs(ry)), rot, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) c.stroke();
}
function ci(c, x, y, r, fill, stroke = true) { el(c, x, y, r, r, fill, 0, stroke); }
function tri(c, ax, ay, bx, by, cx, cy, fill, stroke = true) {
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(cx, cy); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) c.stroke();
}
// a thick outlined stroke, used for arms, legs and necks
function limb(c, pts, w, color) {
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.strokeStyle = OL; c.lineWidth = w + 5; c.stroke();
  c.strokeStyle = color; c.lineWidth = w; c.stroke();
  c.restore();
}
// several overlapping circles with one merged outline (trees, bushes, fluff, clouds)
function blobs(c, list, fill, olw = 6) {
  c.save();
  c.beginPath();
  for (const b of list) { c.moveTo(b[0] + b[2], b[1]); c.arc(b[0], b[1], b[2], 0, TAU); }
  c.strokeStyle = OL; c.lineWidth = olw; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = fill; c.fill();
  c.restore();
}
function shadow(c, x, y, rx, ry) {
  c.save();
  c.fillStyle = 'rgba(40,70,20,0.22)';
  c.beginPath(); c.ellipse(x, y, rx, ry ?? rx * 0.33, 0, 0, TAU); c.fill();
  c.restore();
}
function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.3, y, x - s * 0.9, y - s * 1.1, x, y - s * 0.4);
  c.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.3, y, x, y + s * 0.9);
  c.closePath();
}
function starPath(c, x, y, r, r2 = r * 0.5, n = 5, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? r2 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
function drawHeart(c, x, y, s, color = '#ff5c8a') {
  heartPath(c, x, y, s);
  c.fillStyle = color; c.fill();
  c.lineWidth = Math.max(1.5, s * 0.2); c.strokeStyle = OL; c.lineJoin = 'round'; c.stroke();
}
function drawStar(c, x, y, r, color = '#ffd23f', rot) {
  starPath(c, x, y, r, r * 0.5, 5, rot);
  c.fillStyle = color; c.fill();
  c.lineWidth = Math.max(1.5, r * 0.16); c.strokeStyle = OL; c.lineJoin = 'round'; c.stroke();
}
function eyeDot(c, x, y, r = 2.8, mode) {
  if (mode === 'happy' || mode === 'closed') {
    c.beginPath();
    c.moveTo(x - r * 1.2, y + (mode === 'happy' ? 1 : 0));
    if (mode === 'happy') c.quadraticCurveTo(x, y - r * 1.8, x + r * 1.2, y + 1);
    else c.quadraticCurveTo(x, y + r * 1.4, x + r * 1.2, y);
    c.lineWidth = 2.4; c.strokeStyle = OL; c.stroke();
    return;
  }
  c.fillStyle = '#2b1d16'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x + r * 0.35, y - r * 0.4, r * 0.38, 0, TAU); c.fill();
}
function smile(c, x, y, w = 4, color = OL) {
  c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y + w, x + w, y);
  c.lineWidth = 2; c.strokeStyle = color; c.stroke();
}

// ---------------------------------------------------------------- bunnies
const BUNNIES = {
  sarah: { s: 0.82, fur: '#fffaf5', ear: '#ffb3c7', hair: '#1f1b1d', style: 'dress', cloth: '#ff8ab3', cloth2: '#ffd6e6', bodyH: 40, hairStyle: 'bob', seed: 0.3 },
  mommy: { s: 1.06, fur: '#f7efe7', ear: '#ffbccb', hair: '#1f1b1d', style: 'gown', cloth: '#a78bf0', cloth2: '#ffffff', bodyH: 58, hairStyle: 'long', seed: 1.7 },
  dad:   { s: 1.08, fur: '#efe6dc', ear: '#f2b2c0', hair: '#56595f', style: 'shirt', cloth: '#6cbf6a', cloth2: '#4d6fb8', bodyH: 50, hairStyle: 'messy', glasses: true, beard: true, seed: 2.9 },
};
const eyeMode = o => (o.sleep ? 'closed' : o.happy ? 'happy' : null);

function drawEar(c, x, y, rot, P) {
  c.save(); c.translate(x, y); c.rotate(rot);
  el(c, 0, -20, 7.5, 21, P.fur);
  el(c, 0, -19, 3.6, 15, P.ear, 0, false);
  c.restore();
}

function drawHairFront(c, P, hx, hy) {
  c.fillStyle = P.hair; c.lineWidth = 2.5; c.strokeStyle = OL;
  if (P.hairStyle === 'messy') {
    c.beginPath();
    c.moveTo(hx - 15, hy - 13);
    c.quadraticCurveTo(hx - 14, hy - 27, hx - 5, hy - 20);
    c.quadraticCurveTo(hx - 1, hy - 31, hx + 6, hy - 21);
    c.quadraticCurveTo(hx + 14, hy - 28, hx + 15, hy - 13);
    c.quadraticCurveTo(hx, hy - 8, hx - 15, hy - 13);
    c.closePath(); c.fill(); c.stroke();
    return;
  }
  c.beginPath();
  c.arc(hx, hy, 22, Math.PI * 1.06, Math.PI * 1.94);
  c.lineTo(hx + 17, hy - 6); c.lineTo(hx + 12, hy - 2); c.lineTo(hx + 7, hy - 8); c.lineTo(hx + 2, hy - 2);
  c.lineTo(hx - 4, hy - 8); c.lineTo(hx - 9, hy - 2); c.lineTo(hx - 14, hy - 7); c.lineTo(hx - 19, hy - 3);
  c.closePath(); c.fill(); c.stroke();
  if (P.hairStyle === 'bob') {
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + sx * 21, hy - 6);
      c.quadraticCurveTo(hx + sx * 27, hy + 8, hx + sx * 20, hy + 16);
      c.quadraticCurveTo(hx + sx * 15, hy + 8, hx + sx * 16, hy - 4);
      c.closePath(); c.fill(); c.stroke();
    }
  }
  // a little shine so dark hair still reads as hair
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2.5; c.lineCap = 'round';
  c.beginPath(); c.arc(hx - 2, hy - 2, 16, Math.PI * 1.2, Math.PI * 1.45); c.stroke();
}

function drawBunnyHead(c, P, hx, hy, o) {
  const t = o.t || 0, fx = 2.5;
  ci(c, hx, hy, 21, P.fur);
  drawHairFront(c, P, hx, hy);
  let eyes = o.eyes;
  if (!eyes) eyes = ((t + P.seed) % 3.7) < 0.13 ? 'closed' : 'open';
  eyeDot(c, hx + fx - 7.5, hy + 1, 2.9, eyes);
  eyeDot(c, hx + fx + 7.5, hy + 1, 2.9, eyes);
  c.fillStyle = 'rgba(255,120,150,0.35)';
  el(c, hx + fx - 13, hy + 8, 4.5, 3, 'rgba(255,120,150,0.35)', 0, false);
  el(c, hx + fx + 13, hy + 8, 4.5, 3, 'rgba(255,120,150,0.35)', 0, false);
  if (P.glasses) {
    c.lineWidth = 2.2; c.strokeStyle = OL;
    c.beginPath(); c.arc(hx + fx - 7.5, hy + 1, 6.5, 0, TAU); c.stroke();
    c.beginPath(); c.arc(hx + fx + 7.5, hy + 1, 6.5, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(hx + fx - 1, hy); c.lineTo(hx + fx + 1, hy); c.stroke();
  }
  if (P.beard) {
    c.fillStyle = P.hair; c.lineWidth = 2.5; c.strokeStyle = OL;
    c.beginPath();
    c.moveTo(hx - 18, hy + 3);
    c.quadraticCurveTo(hx - 17, hy + 25, hx + fx, hy + 28);
    c.quadraticCurveTo(hx + 17 + fx, hy + 25, hx + 18, hy + 3);
    c.quadraticCurveTo(hx + fx, hy + 15, hx - 18, hy + 3);
    c.closePath(); c.fill(); c.stroke();
  }
  el(c, hx + fx, hy + 6.5, 2.6, 2, '#ff8fa8', 0, false);
  if (o.mouth === 'o') { c.lineWidth = 2; el(c, hx + fx, hy + 12.5, 3, 4, '#8a3040'); }
  else if (o.mouth === 'nom') { c.lineWidth = 2; el(c, hx + fx, hy + 12, 4, 2 + Math.abs(Math.sin(t * 18)) * 3, '#8a3040'); }
  else smile(c, hx + fx, hy + 10.5, 4, P.beard ? '#f6e3d2' : OL);
}

function drawBasket(c, x, y, items, turtle, t) {
  c.save(); c.translate(x, y);
  for (let i = 0; i < items.length; i++) drawItem(c, items[i], -9 + i * 6.5, 3 - (i % 2) * 3, 0.42);
  if (turtle) { c.save(); c.translate(1, 5); c.scale(0.5, 0.5); setLine(c, 3); ANIMAL_DRAW.turtle(c, { t, happy: true }); c.restore(); }
  setLine(c, 2.5);
  c.fillStyle = '#d39a55';
  c.beginPath(); c.moveTo(-15, 0); c.lineTo(15, 0); c.lineTo(12, 21); c.lineTo(-12, 21); c.closePath(); c.fill(); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(120,70,30,0.55)';
  for (let yy = 6; yy < 20; yy += 5) { c.beginPath(); c.moveTo(-14 + yy * 0.13, yy); c.lineTo(14 - yy * 0.13, yy); c.stroke(); }
  setLine(c, 2.5); c.fillStyle = '#b9783a';
  c.beginPath(); c.roundRect(-17, -3, 34, 6, 3); c.fill(); c.stroke();
  c.restore();
}

function drawHat(c, x, y, color, rot = -0.15, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.lineTo(0, -30); c.closePath();
  c.fillStyle = color; c.fill();
  c.save(); c.clip();
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3;
  for (let i = -1; i < 4; i++) { c.beginPath(); c.moveTo(-14, -i * 9); c.lineTo(14, -i * 9 - 10); c.stroke(); }
  c.restore();
  setLine(c, 2.5);
  c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.lineTo(0, -30); c.closePath(); c.stroke();
  ci(c, 0, -31, 4.5, '#fff7a8');
  c.restore();
}

function drawHeld(c, kind, x, y, o) {
  setLine(c, 2.5);
  if (kind === 'bowl') {
    c.beginPath(); c.ellipse(x, y, 16, 12, 0, 0, Math.PI); c.closePath(); c.fillStyle = '#8ec8ff'; c.fill(); c.stroke();
    el(c, x, y, 16, 4.5, '#fff1d2');
    const a = o.stir || 0;
    const sx = x + Math.cos(a) * 9, sy = y + Math.sin(a) * 2.5;
    limb(c, [sx, sy, sx + 5, sy - 20], 2.5, '#c98b58');
  } else if (kind === 'cup') {
    c.beginPath(); c.roundRect(x - 6, y - 15, 12, 15, 3); c.fillStyle = '#ffffff'; c.fill(); c.stroke();
    el(c, x, y - 14, 5, 2, '#ff9fc0', 0, false);
    c.beginPath(); c.arc(x + 7, y - 8, 3.5, -1.2, 1.2); c.stroke();
    limb(c, [x - 1, y - 14, x + 3, y - 24], 1.2, '#ff6b8a');
  } else if (kind === 'flower') {
    limb(c, [x, y, x + 3, y - 18], 1.5, '#4c9a3c');
    c.fillStyle = '#ff9ccf';
    for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; ci(c, x + 3 + Math.cos(a) * 4.5, y - 21 + Math.sin(a) * 4.5, 3.6, '#ff9ccf'); }
    ci(c, x + 3, y - 21, 2.8, '#ffe066');
  }
}

// o: x, y, t, facing, moving, walk, jump, pose, eyes, mouth, hat, basket, turtle, hold, stir, sit, scale
function drawBunny(c, kind, o) {
  const P = BUNNIES[kind];
  const s = P.s * (o.scale || 1);
  const t = o.t || 0, f = o.facing || 1;
  c.save();
  c.translate(o.x, o.y);
  if (!o.noShadow) shadow(c, 0, 0, 24 * s, 8 * s);
  const lift = (o.jump || 0) + (o.moving ? Math.abs(Math.sin(o.walk || 0)) * 7 : 0);
  c.translate(0, -lift);
  c.scale(s * f, s);
  setLine(c, 3);
  const sw = o.moving ? Math.sin(o.walk || 0) : 0;
  const breathe = Math.sin(t * 2.2) * 1.2;
  const hipY = P.style === 'gown' ? -8 : -18;
  const topY = hipY - P.bodyH + (o.sit ? 6 : 0);
  const hy = topY - 18 - breathe * 0.5;
  const earSway = Math.sin(t * 3 + P.seed) * 0.06 + (o.moving ? Math.sin((o.walk || 0) * 2) * 0.1 : 0);
  const earSpread = o.pose === 'up' ? 0.12 : 0;

  drawEar(c, -9, hy - 14, -0.22 - earSway - earSpread, P);
  drawEar(c, 9, hy - 14, 0.22 - earSway + earSpread, P);

  if (P.hairStyle === 'long') {
    c.fillStyle = P.hair; c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(-22, hy - 6);
    c.quadraticCurveTo(-32, hy + 30, -22, hy + 44); c.lineTo(22, hy + 44);
    c.quadraticCurveTo(32, hy + 30, 22, hy - 6); c.closePath(); c.fill(); c.stroke();
  }
  if (o.basket) drawBasket(c, -18, topY + 10, o.basket, o.turtle, t);

  // legs and feet
  setLine(c, 3);
  const lf = -5 - Math.max(0, sw) * 4, rf = -5 - Math.max(0, -sw) * 4;
  if (o.sit) {
    el(c, -8, -10, 8, 5, P.fur); el(c, 10, -10, 8, 5, P.fur);
  } else {
    if (P.style === 'shirt') { limb(c, [-8, hipY, -9, lf - 2], 9, P.cloth2); limb(c, [8, hipY, 9, rf - 2], 9, P.cloth2); }
    else if (P.style === 'dress') { limb(c, [-7, hipY, -8, lf - 2], 7, P.fur); limb(c, [7, hipY, 8, rf - 2], 7, P.fur); }
    setLine(c, 3);
    el(c, -9, lf, 9, 5.5, P.fur);
    el(c, 9, rf, 9, 5.5, P.fur);
  }

  // body
  setLine(c, 3);
  c.fillStyle = P.cloth;
  if (P.style === 'dress') {
    const by = o.sit ? hipY + 4 : hipY;
    c.beginPath(); c.moveTo(-11, topY); c.lineTo(11, topY); c.lineTo(23, by - 2);
    const teeth = 6;
    for (let i = 0; i <= teeth * 2; i++) c.lineTo(23 - i * (46 / (teeth * 2)), by + (i % 2 ? 5 : -2));
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = P.cloth2;
    for (const [dx, dy] of [[-8, 20], [6, 28], [-2, 11], [12, 17], [-13, 31]]) { c.beginPath(); c.arc(dx, topY + dy, 2.3, 0, TAU); c.fill(); }
  } else if (P.style === 'gown') {
    c.beginPath(); c.moveTo(-12, topY); c.lineTo(12, topY);
    c.quadraticCurveTo(22, hipY - 20, 27, hipY); c.quadraticCurveTo(0, hipY + 6, -27, hipY);
    c.quadraticCurveTo(-22, hipY - 20, -12, topY); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(-11, topY + 16, 22, 30, 6); c.fill(); c.stroke();
    c.fillStyle = '#ffd0e2'; c.beginPath(); c.roundRect(-6, topY + 30, 12, 9, 3); c.fill(); c.stroke();
  } else {
    c.beginPath(); c.roundRect(-16, topY, 32, hipY - topY + 4, 9); c.fill(); c.stroke();
    c.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(2, topY + 10 + i * 10, 1.8, 0, TAU); c.fill(); }
  }
  if (o.basket) { limb(c, [9, topY + 1, -6, hipY - 8], 2.5, '#b9783a'); }

  // arms
  const shY = topY + 7;
  let L, Rr;
  switch (o.pose) {
    case 'up': { const w = Math.sin(t * 10) * 3; L = [-21, shY - 24 + w]; Rr = [21, shY - 24 - w]; break; }
    case 'wave': L = [-15, shY + 18]; Rr = [27 + Math.sin(t * 12) * 5, shY - 20]; break;
    case 'hug': L = [26, shY + 4]; Rr = [28, shY + 11]; break;
    case 'hold': L = [14, shY + 17]; Rr = [22, shY + 15]; break;
    case 'cup': L = [-15, shY + 18]; Rr = [20, shY - 2]; break;
    default: { const s2 = o.moving ? Math.sin(o.walk || 0) * 4 : 0; L = [-15 - s2, shY + 18]; Rr = [15 + s2, shY + 18]; }
  }
  limb(c, [-10, shY, L[0], L[1]], 7, P.fur);
  limb(c, [10, shY, Rr[0], Rr[1]], 7, P.fur);

  // head
  setLine(c, 3);
  drawBunnyHead(c, P, 0, hy, o);
  if (o.hat) drawHat(c, 4, hy - 17, o.hat, -0.12);
  if (o.hold) drawHeld(c, o.hold, o.hold === 'bowl' ? 18 : Rr[0], o.hold === 'bowl' ? shY + 16 : Rr[1], o);
  c.restore();
}

// ---------------------------------------------------------------- animals
const ANIMAL_SHADOW = { chickens: 40, cow: 62, turtle: 30, goose: 28, alpaca: 40, dog: 32, alligator: 70, fox: 28 };
const SWIM_DEPTH = { goose: 12, alligator: 12 };

function hen(c, x, y, o, ph) {
  const t = (o.t || 0) + ph;
  const peck = o.moving ? 0 : Math.pow(Math.max(0, Math.sin(t * 2.2)), 6);
  const sw = o.moving ? Math.sin((o.walk || 0) + ph) : 0;
  c.save(); c.translate(x, y);
  limb(c, [-4, -8, -5 + sw * 3, -1], 2.2, '#f2a23a');
  limb(c, [4, -8, 5 - sw * 3, -1], 2.2, '#f2a23a');
  setLine(c, 2.5);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(-11, -16); c.lineTo(-22, -32); c.lineTo(-17, -18); c.lineTo(-25, -24); c.lineTo(-10, -11); c.closePath(); c.fill(); c.stroke();
  el(c, 0, -17, 15, 12, '#ffffff');
  el(c, -3, -17, 8, 5.5, '#efe8dc', -0.2);
  const hx = 10 + peck * 5, hy = -31 + peck * 13;
  ci(c, hx - 3.5, hy - 8, 3.4, '#ff5a5a'); ci(c, hx, hy - 10, 3.6, '#ff5a5a'); ci(c, hx + 3.5, hy - 8, 3.2, '#ff5a5a');
  ci(c, hx, hy, 8.5, '#ffffff');
  tri(c, hx + 7, hy - 2.5, hx + 14, hy + 0.5, hx + 7, hy + 3, '#ffb02e');
  el(c, hx + 6, hy + 6, 2.5, 3.5, '#ff5a5a');
  eyeDot(c, hx + 2.5, hy - 2, 2.2, eyeMode(o));
  c.restore();
}

const ANIMAL_DRAW = {
  chickens(c, o) {
    hen(c, 16, -3, o, 1.3);
    hen(c, -14, 4, o, 0);
    return { x: -4, y: -46 };
  },

  cow(c, o) {
    const t = o.t || 0, sw = o.moving ? Math.sin(o.walk || 0) : 0;
    for (const [lx, s] of [[-36, sw], [-20, -sw], [22, -sw], [38, sw]]) {
      limb(c, [lx, -40, lx + s * 4, -6], 9, '#fffaf2');
      setLine(c, 2.5); el(c, lx + s * 4, -4, 6, 4, '#5a4636');
    }
    c.save(); c.translate(-52, -66); c.rotate(Math.sin(t * 3) * 0.3);
    limb(c, [0, 0, -7, 20, -5, 32], 3, '#fffaf2'); setLine(c, 2); el(c, -5, 36, 4, 6, '#5a4636');
    c.restore();
    setLine(c, 3);
    c.beginPath(); c.roundRect(-56, -86, 108, 50, 24); c.fillStyle = '#fffaf2'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#3d3431';
    for (const s of [[-32, -72, 15, 11], [4, -52, 13, 9], [30, -78, 11, 8], [-10, -86, 9, 6], [-44, -46, 9, 7]]) { c.beginPath(); c.ellipse(s[0], s[1], s[2], s[3], 0.3, 0, TAU); c.fill(); }
    c.restore();
    c.beginPath(); c.roundRect(-56, -86, 108, 50, 24); c.stroke();
    el(c, 8, -36, 9, 6, '#ffb3c1');
    const nod = o.moving ? 0 : Math.sin(t * 1.5) * 1.5;
    c.save(); c.translate(54, -78 + nod);
    limb(c, [-9, -17, -14, -28], 3.5, '#fff1c9'); limb(c, [9, -17, 14, -28], 3.5, '#fff1c9');
    setLine(c, 3);
    el(c, -21, -9, 10, 5, '#fffaf2', -0.35); el(c, 21, -9, 10, 5, '#fffaf2', 0.35);
    el(c, -21, -9, 5, 2.5, '#ffb8c6', -0.35, false); el(c, 21, -9, 5, 2.5, '#ffb8c6', 0.35, false);
    el(c, 0, -2, 19, 21, '#fffaf2');
    el(c, -8, -12, 7, 5, '#3d3431', 0.2, false);
    el(c, 0, 12, 17, 11, '#ffb8c6');
    el(c, -6, 12, 2.5, 3, '#8a4a55', 0, false); el(c, 6, 12, 2.5, 3, '#8a4a55', 0, false);
    eyeDot(c, -8, -3, 3, eyeMode(o)); eyeDot(c, 8, -3, 3, eyeMode(o));
    if (o.mouth) { c.lineWidth = 2; el(c, 0, 19, 4, 3, '#8a3040'); }
    c.restore();
    setLine(c, 2.5); ci(c, 48, -52, 5, '#ffd23f');
    return { x: 54, y: -104 };
  },

  turtle(c, o) {
    const t = o.t || 0, sw = o.moving ? Math.sin(o.walk || 0) : 0;
    setLine(c, 3);
    el(c, -17 + sw * 3, -4, 7, 5, '#9bd87a'); el(c, 17 - sw * 3, -4, 7, 5, '#9bd87a');
    tri(c, -27, -9, -36, -6, -27, -4, '#9bd87a');
    const hb = Math.sin(t * 2) * 2;
    el(c, 31, -14 + hb, 10, 9, '#9bd87a');
    eyeDot(c, 34, -17 + hb, 2.4, eyeMode(o));
    smile(c, 35, -11 + hb, 3);
    setLine(c, 3);
    c.fillStyle = '#5fae4c';
    c.beginPath(); c.moveTo(-29, -8); c.quadraticCurveTo(-27, -42, 0, -42); c.quadraticCurveTo(27, -42, 29, -8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#3f8f39';
    for (const [hx, hy, r] of [[0, -25, 8], [-15, -17, 6], [15, -17, 6], [-10, -33, 4.5], [10, -33, 4.5]]) {
      c.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; c.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); }
      c.closePath(); c.fill();
    }
    c.fillStyle = '#c9e58a'; c.beginPath(); c.roundRect(-31, -11, 62, 7, 3.5); c.fill(); c.stroke();
    return { x: 31, y: -22 };
  },

  goose(c, o) {
    const t = o.t || 0, sw = o.moving ? Math.sin(o.walk || 0) : 0;
    if (!o.swim) {
      limb(c, [-4, -14, -5 + sw * 3, -2], 2.5, '#ff9f1c'); limb(c, [6, -14, 7 - sw * 3, -2], 2.5, '#ff9f1c');
      setLine(c, 2); el(c, -3 + sw * 3, -2, 5, 2.5, '#ff9f1c'); el(c, 9 - sw * 3, -2, 5, 2.5, '#ff9f1c');
    }
    setLine(c, 3);
    tri(c, -18, -30, -32, -34, -20, -20, '#ffffff');
    el(c, 0, -24, 24, 14, '#ffffff');
    if (o.flap) {
      const a = Math.sin(t * 28) * 0.7;
      c.save(); c.translate(-2, -30); c.rotate(-0.9 + a); el(c, -14, 0, 18, 7, '#f0ece6'); c.restore();
    } else el(c, -4, -24, 13, 7, '#f0ece6', -0.15);
    const nb = Math.sin(t * 1.7) * 2;
    limb(c, [14, -30, 20, -44, 16 + nb, -58], 9, '#ffffff');
    setLine(c, 3);
    ci(c, 17 + nb, -62, 9, '#ffffff');
    tri(c, 24 + nb, -66, 37 + nb, -61, 24 + nb, -57, '#ff9f1c');
    eyeDot(c, 19 + nb, -64, 2.3, eyeMode(o));
    return { x: 16, y: -70 };
  },

  alpaca(c, o) {
    const t = o.t || 0, sw = o.moving ? Math.sin(o.walk || 0) : 0;
    const C1 = '#8f5f3f', C2 = '#b9875f';
    for (const [lx, s] of [[-26, sw], [-13, -sw], [13, -sw], [26, sw]]) {
      limb(c, [lx, -44, lx + s * 3, -5], 6.5, C2);
      setLine(c, 2); el(c, lx + s * 3, -3, 5, 3.2, '#4a3226');
    }
    blobs(c, [[-38, -56, 8], [-37, -48, 7]], C2, 5);
    blobs(c, [[-22, -56, 16], [-6, -62, 18], [12, -60, 17], [24, -52, 14], [-12, -46, 15], [8, -46, 15], [-30, -48, 11], [27, -66, 10], [30, -80, 10], [31, -93, 9]], C2, 6);
    c.fillStyle = '#d0a27a';
    for (const [bx, by, r] of [[-8, -66, 7], [12, -64, 6], [-22, -60, 5]]) { c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill(); }
    const chew = Math.sin(t * 6) * 1;
    c.save(); c.translate(35, -108);
    setLine(c, 2.5);
    el(c, -6, -17, 3.5, 9, C1, -0.25); el(c, 7, -17, 3.5, 9, C1, 0.25);
    el(c, 0, 0, 11, 13, '#e6c6a6');
    blobs(c, [[-6, -10, 6.5], [1, -13, 7.5], [8, -9, 6]], C2, 5);
    el(c, 5, 8, 7, 5.5, '#f3dfc9');
    eyeDot(c, -2, -1, 2.5, eyeMode(o)); eyeDot(c, 8, -1, 2.5, eyeMode(o));
    smile(c, 5, 10 + chew, 3);
    c.restore();
    return { x: 36, y: -124 };
  },

  dog(c, o) {
    const t = o.t || 0, sw = o.moving ? Math.sin(o.walk || 0) : 0;
    const C = '#e0a86a', D = '#9a6236';
    for (const [lx, s] of [[-16, sw], [-7, -sw], [10, -sw], [19, sw]]) {
      limb(c, [lx, -20, lx + s * 3, -4], 6.5, C);
      setLine(c, 2); el(c, lx + s * 3, -3, 4.5, 3, C);
    }
    c.save(); c.translate(-22, -28); c.rotate(-0.8 + Math.sin(t * (o.happy ? 24 : 9)) * 0.45);
    limb(c, [0, 0, -3, -15], 5.5, C); c.restore();
    setLine(c, 3);
    el(c, 0, -26, 25, 13, C);
    el(c, -6, -30, 9, 6, D, 0, false);
    c.save(); c.translate(25, -42);
    setLine(c, 3);
    el(c, -11, 4, 6, 12, D, 0.35);
    ci(c, 0, 0, 14, C);
    el(c, 5, -4, 6, 5, 'rgba(154,98,54,0.7)', 0, false);
    el(c, 10, 6, 8.5, 6.5, '#f6d8b0');
    el(c, 17, 4, 3.6, 2.8, '#2b1d16', 0, false);
    eyeDot(c, 4, -3, 2.7, eyeMode(o));
    if (o.happy) { setLine(c, 1.8); el(c, 12, 14, 3, 4.5, '#ff7b9c'); }
    setLine(c, 3);
    el(c, -5, 5, 6, 12, D, 0.15);
    c.restore();
    setLine(c, 2.5);
    c.beginPath(); c.roundRect(11, -36, 7, 15, 3); c.fillStyle = '#e84a4a'; c.fill(); c.stroke();
    ci(c, 16, -22, 3, '#ffd23f');
    return { x: 25, y: -56 };
  },

  alligator(c, o) {
    const t = o.t || 0, sw = o.moving ? Math.sin(o.walk || 0) : 0;
    const G = '#5fb04f', G2 = '#4a9440', B = '#c6e48e';
    setLine(c, 3);
    if (!o.swim) for (const [lx, s] of [[-30, sw], [-14, -sw], [18, -sw], [34, sw]]) el(c, lx + s * 3, -4, 8, 5, G);
    const tw = Math.sin(t * 2 + (o.walk || 0)) * 4;
    c.fillStyle = G;
    c.beginPath(); c.moveTo(-40, -25); c.quadraticCurveTo(-72, -18 + tw, -98, -9 + tw * 1.5); c.quadraticCurveTo(-70, -6, -40, -6); c.closePath(); c.fill(); c.stroke();
    el(c, -4, -17, 47, 15, G);
    el(c, -4, -9, 38, 5, B, 0, false);
    for (let i = 0; i < 6; i++) ci(c, -36 + i * 12, -31, 4, G2);
    c.save(); c.translate(38, -17);
    setLine(c, 3);
    c.beginPath(); c.roundRect(-6, -10, 54, 19, 9.5); c.fillStyle = G; c.fill(); c.stroke();
    ci(c, 4, -13, 7, G); ci(c, 15, -12, 6, G);
    ci(c, 4, -14, 4.5, '#fff', false); ci(c, 15, -13, 4, '#fff', false);
    eyeDot(c, 5, -14, 2.2, eyeMode(o)); eyeDot(c, 16, -13, 2, eyeMode(o));
    ci(c, 43, -6, 1.5, OL, false); ci(c, 38, -7, 1.5, OL, false);
    const big = o.grin ? 1.6 : 1;
    c.beginPath(); c.moveTo(-1, 1); c.quadraticCurveTo(22, 8 * big, 46, 0); c.lineWidth = 2.6; c.strokeStyle = OL; c.stroke();
    el(c, 0, 3, 4, 2.5, 'rgba(255,130,150,0.5)', 0, false);
    c.restore();
    return { x: 44, y: -34 };
  },

  fox(c, o) {
    const t = o.t || 0, sw = o.moving ? Math.sin(o.walk || 0) : 0;
    const O = '#f28a3a', W = '#fff6ea', K = '#5a3a2a';
    for (const [lx, s] of [[-12, sw], [-4, -sw], [8, -sw], [15, sw]]) limb(c, [lx, -15, lx + s * 3, -3], 5, K);
    c.save(); c.translate(-15, -20); c.rotate(-0.4 + Math.sin(t * 3) * 0.15);
    setLine(c, 3); el(c, -15, -6, 17, 9, O, -0.5); el(c, -27, -13, 7, 5, W, -0.5);
    c.restore();
    setLine(c, 3);
    el(c, 0, -19, 18, 12, O);
    el(c, 11, -19, 6, 8, W, 0, false);
    c.save(); c.translate(16, -35);
    setLine(c, 2.5);
    tri(c, -10, -5, -12, -22, -2, -10, O); tri(c, 4, -8, 9, -23, 12, -6, O);
    tri(c, -10, -12, -11.5, -21, -6, -14, K, false); tri(c, 7, -15, 9, -22, 10.5, -13, K, false);
    el(c, 0, 0, 13, 11, O);
    c.fillStyle = W; c.beginPath(); c.moveTo(-2, 4); c.quadraticCurveTo(10, 14, 19, 3); c.quadraticCurveTo(10, 4, -2, 4); c.fill();
    ci(c, 19, 2.5, 2.6, K, false);
    eyeDot(c, 4, -2, 2.6, eyeMode(o));
    c.restore();
    return { x: 16, y: -54 };
  },
};

function drawAnimal(c, kind, o) {
  const sc = o.scale || 1, f = o.facing || 1;
  c.save();
  c.translate(o.x, o.y);
  if (!o.swim && !o.noShadow) shadow(c, 0, 0, ANIMAL_SHADOW[kind] * sc);
  const bob = o.moving ? Math.abs(Math.sin(o.walk || 0)) * 3 : 0;
  c.translate(0, -((o.lift || 0) + bob));
  c.scale(sc * f, sc);
  const D = o.swim ? SWIM_DEPTH[kind] || 10 : 0;
  if (o.swim) { c.translate(0, D); c.beginPath(); c.rect(-220, -400, 440, 400 - D); c.clip(); }
  setLine(c, 3);
  const a = ANIMAL_DRAW[kind](c, o);
  if (o.hat && a) drawHat(c, a.x, a.y + 4, o.hat, -0.2, 0.85);
  c.restore();
  if (o.swim) {
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2.5;
    const r = ANIMAL_SHADOW[kind] * sc * (1.05 + 0.06 * Math.sin((o.t || 0) * 3));
    c.beginPath(); c.ellipse(o.x, o.y, r, 7, 0, 0, TAU); c.stroke();
    c.restore();
  }
}

function foxHeadFront(c, x, y, happy) {
  c.save(); c.translate(x, y); setLine(c, 2.5);
  tri(c, -13, -4, -16, -24, -3, -11, '#f28a3a'); tri(c, 13, -4, 16, -24, 3, -11, '#f28a3a');
  tri(c, -13, -13, -15, -22, -9, -15, '#5a3a2a', false); tri(c, 13, -13, 15, -22, 9, -15, '#5a3a2a', false);
  el(c, 0, 0, 15, 12, '#f28a3a');
  c.fillStyle = '#fff6ea'; c.beginPath(); c.moveTo(-14, 2); c.quadraticCurveTo(-6, 13, 0, 9); c.quadraticCurveTo(6, 13, 14, 2); c.quadraticCurveTo(0, 6, -14, 2); c.fill();
  ci(c, 0, 6, 2.6, '#5a3a2a', false);
  eyeDot(c, -6, -2, 2.6, happy ? 'happy' : null); eyeDot(c, 6, -2, 2.6, happy ? 'happy' : null);
  c.restore();
}

// o: t, wobble, fox (bool), peek 0..1, happy
function drawPumpkin(c, x, y, o) {
  c.save(); c.translate(x, y);
  shadow(c, 0, 0, 52, 15);
  c.rotate(o.wobble || 0);
  setLine(c, 3);
  const P = '#f7922f';
  el(c, -24, -36, 26, 34, P); el(c, 24, -36, 26, 34, P); el(c, 0, -38, 30, 37, P);
  c.fillStyle = '#ffd23f';
  tri(c, -24, -40, -10, -40, -17, -54, '#ffd23f'); tri(c, 10, -40, 24, -40, 17, -54, '#ffd23f');
  c.beginPath(); c.moveTo(-24, -28); c.quadraticCurveTo(0, -4, 24, -28); c.quadraticCurveTo(0, -16, -24, -28); c.closePath(); c.fill(); c.stroke();
  el(c, 0, -72, 21, 7, '#5a2e12');
  if (o.fox) {
    const off = (1 - (o.peek || 0)) * 24;
    c.save(); c.beginPath(); c.rect(-40, -150, 80, 78); c.clip();
    foxHeadFront(c, 0, -86 + off, o.happy);
    c.restore();
    setLine(c, 3);
    c.beginPath(); c.ellipse(0, -72, 21, 7, 0, 0, Math.PI); c.stroke();
  }
  c.restore();
  // lid with stem resting beside it
  c.save(); c.translate(x + 44, y - 4); setLine(c, 2.5);
  el(c, 0, 0, 15, 6, '#f7922f'); limb(c, [0, -4, 3, -14], 4, '#6b8e23');
  c.restore();
}

// ---------------------------------------------------------------- items
const ITEM_KINDS = new Set(['flour', 'oil', 'egg', 'milk', 'cupcake', 'olives']);
function drawItem(c, kind, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); setLine(c, 3);
  switch (kind) {
    case 'flour':
      c.fillStyle = '#f4e8d0';
      c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-21, -24, -12, -34); c.lineTo(12, -34); c.quadraticCurveTo(21, -24, 16, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-10, -34); c.lineTo(-15, -45); c.lineTo(0, -40); c.lineTo(15, -45); c.lineTo(10, -34); c.closePath(); c.fill(); c.stroke();
      limb(c, [-10, -35, 10, -35], 2, '#c98b58');
      c.fillStyle = '#7fb2ea'; c.fillRect(-17.5, -19, 35, 6);
      c.strokeStyle = '#d9a440'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, -4); c.lineTo(0, -14); c.stroke();
      for (let i = 0; i < 3; i++) { el(c, -3, -7 - i * 3, 2, 1.2, '#e6b44c', -0.6, false); el(c, 3, -7 - i * 3, 2, 1.2, '#e6b44c', 0.6, false); }
      break;
    case 'oil':
      c.fillStyle = '#d4d94a'; c.beginPath(); c.roundRect(-12, -31, 24, 31, 7); c.fill(); c.stroke();
      c.beginPath(); c.roundRect(-5, -43, 10, 13, 3); c.fill(); c.stroke();
      c.fillStyle = '#c58b52'; c.beginPath(); c.roundRect(-6, -49, 12, 7, 2); c.fill(); c.stroke();
      ci(c, 0, -15, 7.5, '#ffffff');
      setLine(c, 1.5); el(c, 0, -15, 3, 4, '#5f7a2a');
      break;
    case 'egg':
      el(c, 0, -14, 11.5, 14.5, '#fff4df');
      el(c, -4, -19, 3, 4.5, '#ffffff', 0, false);
      break;
    case 'milk':
      c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(-11, -33, 22, 33, 7); c.fill(); c.stroke();
      c.beginPath(); c.roundRect(-6, -41, 12, 10, 3); c.fill(); c.stroke();
      c.fillStyle = '#4f9be8'; c.beginPath(); c.roundRect(-7.5, -47, 15, 7, 2); c.fill(); c.stroke();
      c.fillStyle = '#bfe0ff'; c.fillRect(-9.5, -21, 19, 8);
      break;
    case 'cupcake': {
      c.fillStyle = '#ff9ec4';
      c.beginPath(); c.moveTo(-13, -16); c.lineTo(13, -16); c.lineTo(10, 0); c.lineTo(-10, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2;
      for (const sx of [-6, 0, 6]) { c.beginPath(); c.moveTo(sx * 1.1, -14); c.lineTo(sx * 0.9, -2); c.stroke(); }
      blobs(c, [[-8, -20, 8], [8, -20, 8], [0, -23, 10], [0, -31, 6.5]], '#fff0f6', 5);
      const cols = ['#ff6b8a', '#6bc5ff', '#ffd23f', '#7bd88f'];
      for (let i = 0; i < 5; i++) { c.strokeStyle = cols[i % 4]; c.lineWidth = 2; const a = i * 1.3; c.beginPath(); c.moveTo(-8 + i * 4, -22 - (i % 2) * 5); c.lineTo(-8 + i * 4 + Math.cos(a) * 3, -22 - (i % 2) * 5 + Math.sin(a) * 3); c.stroke(); }
      setLine(c, 2); limb(c, [0, -40, 4, -46], 1.2, '#4c9a3c');
      setLine(c, 2.5); ci(c, 0, -39, 4.5, '#ff3b5c');
      break;
    }
    case 'olives':
      setLine(c, 2);
      ci(c, -6, -6, 6, '#556b2f'); ci(c, 6, -6, 6, '#5b3d5e'); ci(c, 0, -14, 6, '#6b8e23');
      break;
  }
  c.restore();
}

function drawBalloon(c, x, y, color, t, sx, sy) {
  c.save();
  c.strokeStyle = 'rgba(74,50,38,0.7)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(x + Math.sin(t * 2) * 6, (y + sy) / 2, x, y + 14); c.stroke();
  setLine(c, 2.5);
  el(c, x, y, 11, 14, color);
  tri(c, x - 3, y + 16, x + 3, y + 16, x, y + 12, color);
  el(c, x - 4, y - 5, 3, 4.5, 'rgba(255,255,255,0.6)', -0.4, false);
  c.restore();
}

// fluffy cloud-shaped thought bubble centred at (x,y), size w*h, with a dotted tail to (tx,ty)
function drawThought(c, x, y, w, h, tx, ty, k = 1) {
  c.save();
  c.translate(x, y); c.scale(k, k); c.translate(-x, -y);
  const r = Math.min(w, h) * 0.3;
  const list = [];
  const nx = Math.max(2, Math.round(w / (r * 1.2))), ny = Math.max(1, Math.round(h / (r * 1.2)));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
    list.push([x - w / 2 + r * 0.7 + ((w - r * 1.4) * i) / nx, y - h / 2 + r * 0.7 + ((h - r * 1.4) * j) / ny, r]);
  }
  blobs(c, list, '#ffffff', 6);
  c.fillStyle = '#ffffff'; c.fillRect(x - w / 2 + r * 0.7, y - h / 2 + r * 0.7, w - r * 1.4, h - r * 1.4);
  const bx = x - w * 0.2, by = y + h / 2 + 4;
  setLine(c, 3);
  for (let i = 0; i < 3; i++) {
    const u = (i + 1) / 4;
    ci(c, lerp(bx, tx, u), lerp(by, ty, u), 9 - i * 2.5, '#ffffff');
  }
  c.restore();
}

function drawSpeech(c, x, y, icon, k) {
  c.save(); c.translate(x, y); c.scale(k, k);
  setLine(c, 2.5);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.roundRect(-17, -32, 34, 28, 11); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-5, -5); c.lineTo(0, 4); c.lineTo(5, -5); c.fill(); c.stroke();
  c.fillRect(-6, -9, 12, 5);
  if (icon === 'heart') drawHeart(c, 0, -19, 8.5, '#ff5c8a');
  else drawStar(c, 0, -18, 10, '#ffd23f');
  c.restore();
}

// ---------------------------------------------------------------- scenery
const TREE_BASE = [[0, -128, 44], [-38, -102, 36], [38, -102, 36], [-22, -74, 30], [24, -74, 30], [0, -96, 40], [-12, -146, 30], [16, -144, 28]];
function makeTreeBlobs(seed) {
  const r = mulberry32(seed);
  return TREE_BASE.map(b => [b[0] + (r() - 0.5) * 12, b[1] + (r() - 0.5) * 12, b[2] * (0.9 + r() * 0.2)]);
}
function jig(t, t0, dur) { return t0 == null ? 0 : Math.sin((t - t0) * 28) * Math.max(0, 1 - (t - t0) / dur); }

function drawTree(c, tr, t, alpha = 1) {
  const s = tr.s;
  c.save(); c.translate(tr.x, tr.y);
  shadow(c, 0, 0, 50 * s, 16 * s);
  c.scale(s, s); setLine(c, 3);
  c.fillStyle = tr.trunk || '#9a6943';
  c.beginPath(); c.moveTo(-13, 0); c.quadraticCurveTo(-8, -30, -9, -72); c.lineTo(9, -72); c.quadraticCurveTo(8, -30, 13, 0); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(74,50,38,0.4)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-3, -12); c.lineTo(-4, -30); c.moveTo(4, -38); c.lineTo(3, -55); c.stroke();
  const sway = Math.sin(t * 0.8 + tr.x) * 1.5 + jig(t, tr.jig, tr.shake ? 1.4 : 0.9) * (tr.shake ? 9 : 5);
  c.globalAlpha = alpha;
  c.translate(sway, 0);
  blobs(c, tr.blobs, tr.color || '#5dbb57', 6);
  c.fillStyle = tr.light || '#7fd36f';
  for (const b of tr.blobs) { c.beginPath(); c.arc(b[0] - b[2] * 0.25, b[1] - b[2] * 0.3, b[2] * 0.45, 0, TAU); c.fill(); }
  if (tr.fruit) for (const fr of tr.fruit) { setLine(c, 1.5); ci(c, fr[0], fr[1], fr[2], fr[3]); }
  c.restore();
}

const BUSH_BLOBS = [[-24, -16, 18], [0, -26, 22], [24, -16, 18], [-10, -12, 17], [12, -12, 17]];
function drawBush(c, b, t) {
  const j = jig(t, b.jig, 0.7);
  c.save(); c.translate(b.x, b.y);
  shadow(c, 0, 0, 42 * b.s, 12 * b.s);
  c.scale(b.s * (1 + j * 0.08), b.s * (1 - j * 0.08));
  blobs(c, BUSH_BLOBS, '#4fae5a', 6);
  c.fillStyle = '#6cc66f';
  for (const bl of BUSH_BLOBS) { c.beginPath(); c.arc(bl[0] - bl[2] * 0.25, bl[1] - bl[2] * 0.3, bl[2] * 0.42, 0, TAU); c.fill(); }
  if (b.berries) { c.fillStyle = b.berries; for (const [bx, by] of [[-18, -14], [6, -30], [20, -12], [-4, -18]]) { c.beginPath(); c.arc(bx, by, 3, 0, TAU); c.fill(); } }
  c.restore();
}

function drawFlower(c, f, t) {
  const j = jig(t, f.jig, 0.8) * 0.5;
  c.save(); c.translate(f.x, f.y);
  c.rotate(j + Math.sin(t * 1.5 + f.x) * 0.05);
  c.strokeStyle = '#4c9a3c'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -9); c.stroke();
  c.fillStyle = f.c;
  for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; c.beginPath(); c.arc(Math.cos(a) * 4, -11 + Math.sin(a) * 4, 3.4, 0, TAU); c.fill(); }
  c.fillStyle = '#ffe066'; c.beginPath(); c.arc(0, -11, 2.4, 0, TAU); c.fill();
  c.restore();
}

function drawReeds(c, r, t) {
  c.save(); c.translate(r.x, r.y);
  const sway = Math.sin(t * 1.3 + r.x * 0.05) * 0.06 + jig(t, r.jig, 0.8) * 0.25;
  for (const k of r.stalks) {
    c.save(); c.translate(k.dx, 0); c.rotate(k.a + sway);
    c.strokeStyle = '#4f8f3a'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -k.h); c.stroke();
    if (k.cat) { setLine(c, 1.5); el(c, 0, -k.h - 6, 3.6, 9, '#8a5a35'); }
    else { c.strokeStyle = '#6aa84f'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -k.h * 0.4); c.quadraticCurveTo(8, -k.h * 0.7, 10, -k.h * 0.9); c.stroke(); }
    c.restore();
  }
  c.restore();
}

function drawFence(c, f) {
  setLine(c, 2.5);
  const len = f.bx - f.ax;
  c.fillStyle = '#fff6e8';
  for (const hy of [-11, -24]) { c.beginPath(); c.roundRect(f.ax, f.ay + hy - 3, len, 6, 3); c.fill(); c.stroke(); }
  for (let x = f.ax + 6; x <= f.bx - 4; x += 22) {
    c.beginPath(); c.moveTo(x - 6, f.ay); c.lineTo(x - 6, f.ay - 30); c.lineTo(x, f.ay - 37); c.lineTo(x + 6, f.ay - 30); c.lineTo(x + 6, f.ay); c.closePath();
    c.fillStyle = '#ffffff'; c.fill(); c.stroke();
  }
}

function drawDoghouse(c, x, y) {
  shadow(c, x, y, 64, 16);
  setLine(c, 3);
  c.fillStyle = '#e8705a'; c.beginPath(); c.rect(x - 48, y - 62, 96, 62); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(74,50,38,0.35)'; c.lineWidth = 2;
  for (let yy = y - 48; yy < y; yy += 14) { c.beginPath(); c.moveTo(x - 46, yy); c.lineTo(x + 46, yy); c.stroke(); }
  setLine(c, 3);
  c.fillStyle = '#4a2a20';
  c.beginPath(); c.moveTo(x - 18, y); c.lineTo(x - 18, y - 30); c.arc(x, y - 30, 18, Math.PI, 0); c.lineTo(x + 18, y); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#8b5a3c';
  c.beginPath(); c.moveTo(x - 62, y - 54); c.lineTo(x, y - 106); c.lineTo(x + 62, y - 54); c.closePath(); c.fill(); c.stroke();
  setLine(c, 2);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.roundRect(x - 11, y - 78, 22, 6, 3); c.fill(); c.stroke();
  for (const sx of [-1, 1]) { ci(c, x + sx * 12, y - 78, 3.5, '#ffffff'); ci(c, x + sx * 12, y - 72, 3.5, '#ffffff'); }
}

function drawNest(c, x, y, eggs) {
  shadow(c, x, y + 2, 30, 9);
  setLine(c, 2.5);
  el(c, x, y, 28, 11, '#b07a43');
  el(c, x, y - 2, 19, 6, '#7a4f2a', 0, false);
  for (let i = 0; i < eggs; i++) el(c, x - 8 + i * 8, y - 5, 5, 6.5, '#fff4df');
  c.strokeStyle = 'rgba(74,50,38,0.5)'; c.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 9 - 4, y + 7); c.lineTo(x + i * 9 + 4, y + 2); c.stroke(); }
}

function drawOven(c, o, glow, t) {
  const x = o.x, y = o.y + o.h, w = o.w, h = 80;
  setLine(c, 3);
  c.fillStyle = '#f4f1ec'; c.beginPath(); c.roundRect(x, y - h, w, h, 6); c.fill(); c.stroke();
  c.fillStyle = '#d8d2ca'; c.beginPath(); c.roundRect(x + 5, y - h + 5, w - 10, 13, 4); c.fill(); c.stroke();
  for (const kx of [x + 18, x + 34, x + 50, x + 66]) ci(c, kx, y - h + 11.5, 2.5, '#6b625a', false);
  c.fillStyle = '#3d3a3a'; c.beginPath(); c.roundRect(x + 12, y - h + 28, w - 24, 32, 6); c.fill(); c.stroke();
  if (glow > 0.01) {
    c.fillStyle = `rgba(255,150,50,${0.85 * glow * (0.8 + 0.2 * Math.sin(t * 8))})`;
    c.beginPath(); c.roundRect(x + 15, y - h + 31, w - 30, 26, 5); c.fill();
    c.fillStyle = `rgba(255,200,90,${0.25 * glow})`;
    c.beginPath(); c.ellipse(x + w / 2, y - h + 44, w * 0.8, 40, 0, 0, TAU); c.fill();
  }
  setLine(c, 2.5);
  limb(c, [x + 16, y - 14, x + w - 16, y - 14], 3, '#c9c2b8');
}

function drawCounter(c, o) {
  const x = o.x, y = o.y + o.h, w = o.w, h = 70;
  setLine(c, 3);
  c.fillStyle = '#f6e6cf'; c.beginPath(); c.roundRect(x, y - h + 12, w, h - 12, 4); c.fill(); c.stroke();
  c.fillStyle = '#d8a66b'; c.beginPath(); c.roundRect(x - 4, y - h, w + 8, 16, 5); c.fill(); c.stroke();
  for (let i = 0; i < 3; i++) {
    const dx = x + 8 + i * ((w - 16) / 3);
    c.beginPath(); c.roundRect(dx + 3, y - h + 22, (w - 16) / 3 - 6, h - 30, 4); c.stroke();
    ci(c, dx + (w - 16) / 6, y - h + 30, 2.5, '#c98b58');
  }
  // jars on top
  setLine(c, 2.5);
  c.fillStyle = '#ffe3f0'; c.beginPath(); c.roundRect(x + 14, y - h - 22, 18, 22, 5); c.fill(); c.stroke();
  c.fillStyle = '#ff9ec4'; c.beginPath(); c.roundRect(x + 12, y - h - 27, 22, 7, 3); c.fill(); c.stroke();
  c.fillStyle = '#e3f3ff'; c.beginPath(); c.roundRect(x + 42, y - h - 18, 16, 18, 5); c.fill(); c.stroke();
  c.fillStyle = '#6bc5ff'; c.beginPath(); c.roundRect(x + 40, y - h - 23, 20, 6, 3); c.fill(); c.stroke();
}

const PLATE_SLOTS = [[-16, -46], [0, -47], [16, -46], [-24, -38], [-8, -38], [8, -38], [24, -38], [-10, -30], [10, -30]];
function drawTable(c, T, plate, cups) {
  const x = T.x, y = T.y;
  shadow(c, x, y + 2, 52, 14);
  setLine(c, 3);
  c.fillStyle = '#b7834f'; c.beginPath(); c.roundRect(x - 7, y - 30, 14, 30, 3); c.fill(); c.stroke();
  el(c, x, y - 1, 22, 6, '#b7834f');
  el(c, x, y - 34, 62, 34, '#d9a56a');
  el(c, x, y - 36, 50, 26, '#fff4f8');
  if (plate > 0) {
    el(c, x, y - 36, 36, 15, '#ffffff');
    for (let i = 0; i < Math.min(plate, 9); i++) drawItem(c, 'cupcake', x + PLATE_SLOTS[i][0], y + PLATE_SLOTS[i][1] + 14, 0.5);
  }
  if (cups) {
    for (const sx of [-34, 34]) {
      setLine(c, 2.5);
      c.beginPath(); c.roundRect(x + sx - 6, y - 50, 12, 15, 3); c.fillStyle = '#ffffff'; c.fill(); c.stroke();
      el(c, x + sx, y - 49, 5, 2, '#ff9fc0', 0, false);
    }
  }
}

function drawChair(c, x, y) {
  setLine(c, 2.5);
  c.fillStyle = '#c98d55';
  c.beginPath(); c.roundRect(x - 15, y - 48, 30, 22, 6); c.fill(); c.stroke();
  limb(c, [x - 11, y - 14, x - 12, y], 3, '#a86f3d'); limb(c, [x + 11, y - 14, x + 12, y], 3, '#a86f3d');
  el(c, x, y - 15, 18, 7, '#d9a065');
}

// one big family bed: Daddy on the left, Sarah in the middle, Mommy on the right
const BED_SLOTS = { dad: 0.2, sarah: 0.5, mommy: 0.8 };
const BED_HEAD = { dad: 0.86, sarah: 0.78, mommy: 0.86 };
function drawBed(c, B, occ, t) {
  const { x, y, w, h } = B;
  const who = ['dad', 'sarah', 'mommy'];
  shadow(c, x + w / 2, y + h + 2, w * 0.6, 12);
  setLine(c, 3);
  c.fillStyle = '#c98b58'; c.beginPath(); c.roundRect(x - 6, y - 26, w + 12, 34, 10); c.fill(); c.stroke();
  for (const hx of [x + 14, x + w / 2, x + w - 14]) ci(c, hx, y - 14, 5, '#e5b07e');
  c.fillStyle = '#b8773f'; c.beginPath(); c.roundRect(x - 4, y, w + 8, h + 6, 8); c.fill(); c.stroke();
  c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(x, y + 2, w, h - 4, 8); c.fill(); c.stroke();
  for (const k of who) el(c, x + w * BED_SLOTS[k], y + 24, w * 0.14, 13, '#ffffff');
  for (const k of who) {
    if (!occ[k]) continue;
    const P = BUNNIES[k], s = BED_HEAD[k];
    c.save(); c.translate(x + w * BED_SLOTS[k], y + 30); c.scale(s, s);
    drawEar(c, -10, -12, -0.7, P); drawEar(c, 10, -12, 0.7, P);
    if (P.hairStyle === 'long') { setLine(c, 2.5); el(c, 0, 6, 27, 22, P.hair); }
    setLine(c, 3);
    drawBunnyHead(c, P, 0, 0, { t: t + P.seed, eyes: 'closed', mouth: Math.sin(t * 1.6 + P.seed * 2) > 0.3 ? 'o' : null });
    c.restore();
  }
  c.fillStyle = '#8fc9ff'; setLine(c, 3);
  c.beginPath(); c.roundRect(x - 2, y + 50, w + 4, h - 50, 8); c.fill(); c.stroke();
  for (const k of who) {
    if (occ[k]) el(c, x + w * BED_SLOTS[k], y + 94, w * 0.12, 26 + Math.sin(t * 1.6 + BUNNIES[k].seed) * 1.5, 'rgba(255,255,255,0.2)', 0, false);
  }
  c.fillStyle = '#e8f4ff'; c.beginPath(); c.roundRect(x - 2, y + 50, w + 4, 11, 5); c.fill(); c.stroke();
  for (const [fx, fy] of [[0.12, 80], [0.42, 96], [0.72, 82], [0.28, 124], [0.6, 132], [0.88, 118], [0.1, 146]]) drawStar(c, x + w * fx, y + fy, 5, '#ffe066');
}
