'use strict';
// Small math helpers shared by every other script (plain globals, no modules,
// so index.html also works when opened straight from disk).

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = t => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function segClosest(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t };
}

// Smooth a polyline with quadratic curves through the midpoints and return
// dense sample points (used for both drawing and collision of the creek).
function smoothPolyline(pts, perSeg = 8) {
  if (pts.length < 3) return pts.map(p => ({ x: p[0], y: p[1] }));
  const out = [{ x: pts[0][0], y: pts[0][1] }];
  let sx = pts[0][0], sy = pts[0][1];
  for (let i = 1; i < pts.length - 1; i++) {
    const cx = pts[i][0], cy = pts[i][1];
    const ex = i === pts.length - 2 ? pts[i + 1][0] : (pts[i][0] + pts[i + 1][0]) / 2;
    const ey = i === pts.length - 2 ? pts[i + 1][1] : (pts[i][1] + pts[i + 1][1]) / 2;
    for (let k = 1; k <= perSeg; k++) {
      const t = k / perSeg, u = 1 - t;
      out.push({ x: u * u * sx + 2 * u * t * cx + t * t * ex, y: u * u * sy + 2 * u * t * cy + t * t * ey });
    }
    sx = ex; sy = ey;
  }
  return out;
}

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
