'use strict';
// One "left stick" built from three sources; whichever is pushed hardest wins:
//  - keyboard: arrows / WASD
//  - touch or mouse: press anywhere and drag (a floating joystick appears under the finger)
//  - any gamepad / joystick (Thrustmaster sticks report X on axis 0, Y on axis 1;
//    their hat switch is read too, and the d-pad on standard gamepads)

const Input = (() => {
  const keys = new Set();
  const KEYMAP = {
    ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  };
  const touch = { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
  const R = 70;          // floating joystick radius in CSS px
  const DEAD = 0.2;      // stick deadzone (Thrustmaster sticks can drift a little)
  let pressed = false;   // any new key/tap/button since last consumePress()
  let uiHandler = null;
  const padInfo = new Map();
  let padSeen = false;

  addEventListener('keydown', e => {
    if (KEYMAP[e.code] || e.code === 'Space') e.preventDefault();
    if (!e.repeat) pressed = true;
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); touch.active = false; touch.id = null; });
  addEventListener('gamepadconnected', () => { padSeen = true; });

  function attach(canvas, onUi) {
    uiHandler = onUi;
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (uiHandler && uiHandler(e.clientX, e.clientY, 'down')) return;
      pressed = true;
      if (touch.active) return;
      touch.active = true;
      touch.id = e.pointerId;
      touch.sx = touch.x = e.clientX;
      touch.sy = touch.y = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', e => {
      if (touch.active && e.pointerId === touch.id) { touch.x = e.clientX; touch.y = e.clientY; }
    });
    const end = e => { if (e.pointerId === touch.id) { touch.active = false; touch.id = null; } };
    canvas.addEventListener('pointerup', e => { end(e); if (uiHandler) uiHandler(e.clientX, e.clientY, 'up'); });
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', end);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  function readPads() {
    const res = { x: 0, y: 0, mag: 0 };
    let pads = [];
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { pads = []; }
    for (const p of pads) {
      if (!p || p.connected === false) continue;
      padSeen = true;
      let info = padInfo.get(p.index);
      if (!info || info.id !== p.id) {
        info = { id: p.id, trust: [false, false], btn: [], hat: false };
        padInfo.set(p.index, info);
      }
      let ax = p.axes.length > 0 ? p.axes[0] : 0;
      let ay = p.axes.length > 1 ? p.axes[1] : 0;
      // Only trust an axis once we've seen it near the middle. This ignores
      // things like pedals/throttles that rest at one end.
      if (Math.abs(ax) < 0.35) info.trust[0] = true;
      if (Math.abs(ay) < 0.35) info.trust[1] = true;
      if (!info.trust[0]) ax = 0;
      if (!info.trust[1]) ay = 0;
      let m = Math.hypot(ax, ay);
      if (m < DEAD) { ax = 0; ay = 0; m = 0; } else {
        const nm = Math.min(1, (m - DEAD) / (1 - DEAD));
        ax = (ax / m) * nm; ay = (ay / m) * nm; m = nm;
      }
      const b = p.buttons || [];
      const bp = i => !!b[i] && (b[i].pressed || b[i].value > 0.5);
      // D-pad on standard-mapped gamepads.
      if (p.mapping === 'standard' && b.length > 15) {
        const dx = (bp(15) ? 1 : 0) - (bp(14) ? 1 : 0), dy = (bp(13) ? 1 : 0) - (bp(12) ? 1 : 0);
        if (dx || dy) { const l = Math.hypot(dx, dy); ax = dx / l; ay = dy / l; m = 1; }
      }
      // Hat switch: Chrome on Windows reports joystick hats on axis 9
      // (8 positions between -1 and 1, and ~1.29 or ~3.29 when centred).
      if (p.axes.length > 9) {
        const v = p.axes[9];
        if (v > 1.1) info.hat = true;
        if (info.hat && m === 0 && v >= -1.01 && v <= 1.01) {
          const f = (v + 1) * 3.5, idx = Math.round(f);
          if (Math.abs(f - idx) < 0.15) {
            const ang = (idx % 8) * Math.PI / 4;
            ax = Math.sin(ang); ay = -Math.cos(ang); m = 1;
          }
        }
      }
      for (let i = 0; i < b.length; i++) {
        const now = bp(i);
        if (now && !info.btn[i]) pressed = true;
        info.btn[i] = now;
      }
      if (m > res.mag) { res.x = ax; res.y = ay; res.mag = m; }
    }
    return res;
  }

  function getMove() {
    let x = 0, y = 0;
    for (const k of keys) { const v = KEYMAP[k]; if (v) { x += v[0]; y += v[1]; } }
    let m = Math.hypot(x, y);
    if (m > 0) { x /= m; y /= m; m = 1; }
    if (touch.active) {
      let dx = touch.x - touch.sx, dy = touch.y - touch.sy;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        // drag the base along so changing direction is instant
        touch.sx = touch.x - (dx / d) * R;
        touch.sy = touch.y - (dy / d) * R;
        dx = touch.x - touch.sx; dy = touch.y - touch.sy;
      }
      const dd = Math.min(d, R);
      if (dd > 8) {
        const tm = (dd - 8) / (R - 8);
        if (tm > m) { x = (dx / dd) * tm; y = (dy / dd) * tm; m = tm; }
      }
    }
    const g = readPads();
    if (g.mag > m) { x = g.x; y = g.y; m = g.mag; }
    return { x, y, mag: m };
  }

  function consumePress() { const p = pressed; pressed = false; return p; }

  return { attach, getMove, consumePress, touch, R, get padSeen() { return padSeen; } };
})();
