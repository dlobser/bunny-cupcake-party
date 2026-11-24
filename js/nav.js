'use strict';
// Obstacles, soft collision, and A* pathfinding on a coarse grid.
// The guide arrow follows the walkable path, so it bends around the pond,
// creek, fences and house walls instead of pointing through them.

const Nav = (() => {
  const CS = 25;     // grid cell size (world units)
  const INF = 20;    // how much obstacles are inflated for walking
  const M = { l: 40, r: 40, t: 50, b: 40 };   // soft world edges
  let obs = [], W = 0, H = 0, cols = 0, rows = 0, grid = null;

  function inside(o, x, y, inf) {
    switch (o.t) {
      case 'rect': return x > o.x - inf && x < o.x + o.w + inf && y > o.y - inf && y < o.y + o.h + inf;
      case 'circle': return (x - o.x) ** 2 + (y - o.y) ** 2 < (o.r + inf) ** 2;
      case 'ellipse': { const dx = (x - o.x) / (o.rx + inf), dy = (y - o.y) / (o.ry + inf); return dx * dx + dy * dy < 1; }
      case 'seg': { const q = segClosest(x, y, o.ax, o.ay, o.bx, o.by); return Math.hypot(x - q.x, y - q.y) < o.r + inf; }
    }
    return false;
  }

  // seedX/seedY: a point that must be reachable; free cells not connected to it are blocked.
  function build(obstacles, w, h, seedX, seedY) {
    obs = obstacles; W = w; H = h;
    cols = Math.ceil(W / CS); rows = Math.ceil(H / CS);
    grid = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * CS, y = (r + 0.5) * CS;
        let b = x < M.l || x > W - M.r || y < M.t || y > H - M.b;
        if (!b) for (const o of obs) { if (inside(o, x, y, INF)) { b = true; break; } }
        grid[r * cols + c] = b ? 1 : 0;
      }
    }
    // flood fill from the seed; anything unreachable becomes blocked
    const seen = new Uint8Array(cols * rows);
    const s = nearestFree(Math.floor(seedX / CS), Math.floor(seedY / CS));
    const stack = [s[1] * cols + s[0]];
    seen[stack[0]] = 1;
    while (stack.length) {
      const i = stack.pop(), c = i % cols, r = (i / cols) | 0;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = nr * cols + nc;
        if (seen[ni] || grid[ni]) continue;
        seen[ni] = 1; stack.push(ni);
      }
    }
    for (let i = 0; i < grid.length; i++) if (!grid[i] && !seen[i]) grid[i] = 1;
  }

  const blockedCell = (c, r) => c < 0 || r < 0 || c >= cols || r >= rows || grid[r * cols + c] === 1;
  const blockedAt = (x, y) => blockedCell(Math.floor(x / CS), Math.floor(y / CS));

  function nearestFree(c, r) {
    if (!blockedCell(c, r)) return [c, r];
    for (let rad = 1; rad < 40; rad++) {
      let best = null, bd = 1e9;
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
          if (!blockedCell(c + dc, r + dr)) {
            const d = dc * dc + dr * dr;
            if (d < bd) { bd = d; best = [c + dc, r + dr]; }
          }
        }
      }
      if (best) return best;
    }
    return [c, r];
  }

  function lineClear(ax, ay, bx, by, skip = 0) {
    const d = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(d / 8));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (t * d < skip) continue;
      if (blockedAt(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  }

  // --- tiny binary heap for A* ---
  function hpush(h, f, v) {
    h.push([f, v]);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (h[p][0] <= h[i][0]) break;
      [h[p], h[i]] = [h[i], h[p]]; i = p;
    }
  }
  function hpop(h) {
    const top = h[0], last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < h.length && h[l][0] < h[m][0]) m = l;
        if (r < h.length && h[r][0] < h[m][0]) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]]; i = m;
      }
    }
    return top;
  }

  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

  // Returns a smoothed list of points from (sx,sy) toward (tx,ty), or null.
  function findPath(sx, sy, tx, ty) {
    const [sc, sr] = nearestFree(Math.floor(sx / CS), Math.floor(sy / CS));
    const [gc, gr] = nearestFree(Math.floor(tx / CS), Math.floor(ty / CS));
    const N = cols * rows;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const start = sr * cols + sc, goal = gr * cols + gc;
    const heur = (c, r) => { const dx = Math.abs(c - gc), dy = Math.abs(r - gr); return dx + dy - 0.586 * Math.min(dx, dy); };
    const heap = [];
    g[start] = 0;
    hpush(heap, heur(sc, sr), start);
    let found = start === goal;
    while (heap.length && !found) {
      const cur = hpop(heap)[1];
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goal) { found = true; break; }
      const cc = cur % cols, cr = (cur / cols) | 0;
      for (const [dc, dr, cost] of DIRS) {
        const nc = cc + dc, nr = cr + dr;
        if (blockedCell(nc, nr)) continue;
        if (dc && dr && (blockedCell(cc + dc, cr) || blockedCell(cc, cr + dr))) continue;
        const ni = nr * cols + nc;
        if (closed[ni]) continue;
        const ng = g[cur] + cost;
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; hpush(heap, ng + heur(nc, nr), ni); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let i = goal; i !== -1; i = came[i]) { cells.push(i); if (i === start) break; }
    cells.reverse();
    const pts = cells.map(i => ({ x: ((i % cols) + 0.5) * CS, y: (((i / cols) | 0) + 0.5) * CS }));
    pts[0] = { x: sx, y: sy };
    if (!blockedAt(tx, ty)) pts.push({ x: tx, y: ty });
    return smooth(pts);
  }

  // string-pulling: keep only the corners we actually need
  function smooth(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !lineClear(pts[i].x, pts[i].y, pts[j].x, pts[j].y, i === 0 ? CS : 0)) j--;
      out.push(pts[j]);
      i = j;
    }
    return out;
  }

  function pushOut(o, p, r) {
    switch (o.t) {
      case 'circle': {
        let dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
        const m = o.r + r;
        if (d < m) { if (d < 0.001) { dx = 0; dy = 1; d = 1; } p.x = o.x + (dx / d) * m; p.y = o.y + (dy / d) * m; }
        break;
      }
      case 'rect': {
        const cx = clamp(p.x, o.x, o.x + o.w), cy = clamp(p.y, o.y, o.y + o.h);
        const dx = p.x - cx, dy = p.y - cy, d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < r * r) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * r; p.y = cy + (dy / d) * r;
        } else if (d2 === 0) {
          const l = p.x - o.x, rr = o.x + o.w - p.x, t = p.y - o.y, b = o.y + o.h - p.y;
          const m = Math.min(l, rr, t, b);
          if (m === l) p.x = o.x - r; else if (m === rr) p.x = o.x + o.w + r;
          else if (m === t) p.y = o.y - r; else p.y = o.y + o.h + r;
        }
        break;
      }
      case 'ellipse': {
        const ex = (p.x - o.x) / (o.rx + r), ey = (p.y - o.y) / (o.ry + r);
        const k = Math.hypot(ex, ey);
        if (k < 1) {
          if (k < 0.001) p.y = o.y + o.ry + r;
          else { p.x = o.x + (p.x - o.x) / k; p.y = o.y + (p.y - o.y) / k; }
        }
        break;
      }
      case 'seg': {
        const q = segClosest(p.x, p.y, o.ax, o.ay, o.bx, o.by);
        let dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
        const m = o.r + r;
        if (d < m) { if (d < 0.001) { dx = 0; dy = 1; d = 1; } p.x = q.x + (dx / d) * m; p.y = q.y + (dy / d) * m; }
        break;
      }
    }
  }

  function resolve(p, r) {
    for (let it = 0; it < 3; it++) for (const o of obs) pushOut(o, p, r);
    p.x = clamp(p.x, M.l, W - M.r);
    p.y = clamp(p.y, M.t, H - M.b);
  }

  return { build, findPath, lineClear, blockedAt, resolve, inside, CS, get obstacles() { return obs; } };
})();
