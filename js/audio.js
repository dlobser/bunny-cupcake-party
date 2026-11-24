'use strict';
// All sounds are synthesized with Web Audio: no audio files, no words.
// Browsers only allow audio after a tap/click/key, so Sound.init() is called
// from those events (see game.js).

const Sound = (() => {
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('bunnycupcake_muted') === '1'; } catch (e) { /* ignore */ }
  const lastPlay = {};

  function init() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.9;
        master.connect(ctx.destination);
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
        comp.connect(master);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(comp);
        musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(comp);
        const len = Math.floor(ctx.sampleRate * 1.5);
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        setInterval(schedule, 60);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { console.warn('audio init failed', e); }
  }

  function env(g, t0, vol, attack, hold, dur) {
    vol = Math.max(vol, 0.0002);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    if (hold > 0) g.gain.setValueAtTime(vol, t0 + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function shape(param, t0, start, slide, to, dur) {
    param.setValueAtTime(start, t0);
    if (slide) for (const [v, tt] of slide) param.linearRampToValueAtTime(v, t0 + tt);
    else if (to) param.exponentialRampToValueAtTime(to, t0 + dur);
  }

  function tone(o) {
    const t0 = ctx.currentTime + (o.when || 0) + 0.005;
    const dur = o.dur || 0.2;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    shape(osc.frequency, t0, o.freq, o.slide, o.to, dur);
    let node = osc;
    if (o.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
      l.connect(lg); lg.connect(osc.frequency);
      l.start(t0); l.stop(t0 + dur + 0.05);
    }
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type || 'lowpass';
      f.Q.value = o.filter.Q || 0.7;
      shape(f.frequency, t0, o.filter.freq, o.filter.slide, o.filter.to, dur);
      node.connect(f); node = f;
    }
    const g = ctx.createGain();
    env(g, t0, o.vol ?? 0.15, o.attack ?? 0.01, o.hold || 0, dur);
    node.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function noise(o) {
    const t0 = ctx.currentTime + (o.when || 0) + 0.005;
    const dur = o.dur || 0.2;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.ftype || 'bandpass';
    f.Q.value = o.Q ?? 1;
    shape(f.frequency, t0, o.freq || 1000, o.slide, o.to, dur);
    const g = ctx.createGain();
    env(g, t0, o.vol ?? 0.1, o.attack ?? 0.01, o.hold || 0, dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0, Math.random() * 0.8); src.stop(t0 + dur + 0.05);
  }

  const S = {
    pop() { tone({ freq: 380, to: 950, dur: 0.1, vol: 0.22 }); },
    chime() {
      [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.55, vol: 0.16, when: i * 0.08 }));
      tone({ freq: 2093, dur: 0.7, vol: 0.05, when: 0.32 });
    },
    sparkle() { for (let i = 0; i < 5; i++) tone({ freq: 1800 + Math.random() * 1600, dur: 0.18, vol: 0.04, when: i * 0.05 }); },
    tink() { tone({ freq: 1500 + Math.random() * 600, dur: 0.12, vol: 0.035 }); },
    yawn() {
      tone({ freq: 250, type: 'sawtooth', dur: 1.4, vol: 0.11, attack: 0.15, hold: 0.7,
        slide: [[340, 0.4], [300, 0.9], [190, 1.35]], vib: [5, 4],
        filter: { type: 'lowpass', freq: 400, Q: 5, slide: [[1300, 0.4], [1000, 0.9], [300, 1.35]] } });
    },
    giggle() {
      [880, 1000, 930, 1060, 980, 1120].forEach((f, i) =>
        tone({ freq: f, to: f * 0.82, type: 'triangle', dur: 0.09, vol: 0.12, when: i * 0.085, vib: [30, 25] }));
    },
    mommy() {
      tone({ freq: 440, slide: [[523, 0.15]], type: 'sine', dur: 0.3, vol: 0.14, vib: [6, 6] });
      tone({ freq: 523, slide: [[698, 0.2]], type: 'sine', dur: 0.45, vol: 0.14, when: 0.3, vib: [6, 8] });
    },
    dad() {
      tone({ freq: 220, slide: [[294, 0.15]], type: 'triangle', dur: 0.28, vol: 0.16, vib: [5, 4] });
      tone({ freq: 294, slide: [[392, 0.18]], type: 'triangle', dur: 0.4, vol: 0.16, when: 0.28, vib: [5, 6] });
    },
    hug() {
      tone({ freq: 520, to: 900, dur: 0.14, vol: 0.1 });
      [523, 659, 784].forEach(f => tone({ freq: f, type: 'triangle', dur: 1.3, vol: 0.06, attack: 0.15, when: 0.1 }));
      S.giggle();
    },
    cluck() {
      [0, 0.12, 0.24].forEach((w, i) => tone({ freq: 520 + i * 40, to: 380, type: 'square', dur: 0.07, vol: 0.07, when: w, filter: { type: 'bandpass', freq: 1400, Q: 2 } }));
      tone({ freq: 760, to: 520, type: 'square', dur: 0.22, vol: 0.08, when: 0.42, filter: { type: 'bandpass', freq: 1600, Q: 2 } });
    },
    moo() {
      tone({ freq: 125, type: 'sawtooth', dur: 1.15, vol: 0.17, attack: 0.12, hold: 0.5,
        slide: [[155, 0.3], [150, 0.75], [100, 1.1]], vib: [4, 3],
        filter: { type: 'lowpass', freq: 450, Q: 3, slide: [[950, 0.3], [700, 0.75], [300, 1.1]] } });
    },
    honk() {
      [0, 0.26].forEach(w => {
        tone({ freq: 340, to: 300, type: 'sawtooth', dur: 0.19, vol: 0.1, when: w, filter: { type: 'bandpass', freq: 1000, Q: 4 } });
        tone({ freq: 680, to: 600, type: 'square', dur: 0.19, vol: 0.025, when: w });
      });
    },
    bark() {
      [0, 0.22].forEach(w => {
        noise({ freq: 700, Q: 1.5, dur: 0.08, vol: 0.16, when: w });
        tone({ freq: 330, to: 170, type: 'sawtooth', dur: 0.14, vol: 0.12, when: w, filter: { type: 'lowpass', freq: 1300 } });
      });
    },
    hum() {
      tone({ freq: 300, type: 'sine', dur: 0.95, vol: 0.16, attack: 0.1, hold: 0.4, slide: [[345, 0.25], [325, 0.6], [280, 0.9]], vib: [6, 8] });
      tone({ freq: 600, type: 'sine', dur: 0.9, vol: 0.03, attack: 0.1, vib: [6, 16] });
    },
    squeak() {
      tone({ freq: 1300, to: 1800, dur: 0.08, vol: 0.12 });
      tone({ freq: 1500, to: 2100, dur: 0.08, vol: 0.1, when: 0.12 });
    },
    gator() {
      tone({ freq: 85, type: 'sawtooth', dur: 0.6, vol: 0.16, attack: 0.05, hold: 0.3, vib: [14, 10], filter: { type: 'lowpass', freq: 420 } });
      tone({ freq: 500, to: 820, type: 'triangle', dur: 0.12, vol: 0.08, when: 0.55 });
      tone({ freq: 620, to: 960, type: 'triangle', dur: 0.12, vol: 0.08, when: 0.7 });
    },
    yip() { [0, 0.16].forEach(w => tone({ freq: 900, slide: [[1500, 0.05], [1000, 0.12]], type: 'triangle', dur: 0.13, vol: 0.12, when: w })); },
    ding() {
      tone({ freq: 1760, dur: 1.7, vol: 0.17 });
      tone({ freq: 2640, dur: 1.2, vol: 0.06 });
      tone({ freq: 4400, dur: 0.5, vol: 0.025 });
    },
    swish() { noise({ freq: 600, to: 2400, Q: 2, dur: 0.3, vol: 0.1, attack: 0.08 }); },
    whoosh() { noise({ freq: 300, to: 1600, Q: 1, dur: 0.45, vol: 0.09, attack: 0.15 }); },
    splash() {
      noise({ ftype: 'lowpass', freq: 3200, to: 300, dur: 0.6, vol: 0.18 });
      tone({ freq: 500, to: 200, dur: 0.15, vol: 0.05 });
    },
    rustle() { noise({ ftype: 'highpass', freq: 2600, dur: 0.18, vol: 0.05, attack: 0.03 }); },
    boing() { tone({ freq: 220, to: 660, dur: 0.18, vol: 0.13 }); },
    nom() { [0, 0.14].forEach(w => tone({ freq: 230, to: 160, type: 'square', dur: 0.07, vol: 0.06, when: w, filter: { type: 'lowpass', freq: 700 } })); },
    oven() { tone({ freq: 110, type: 'sine', dur: 2.0, vol: 0.06, attack: 0.4, hold: 1.0 }); },
    snore() { noise({ ftype: 'lowpass', freq: 300, slide: [[700, 0.6], [250, 1.2]], dur: 1.2, vol: 0.05, attack: 0.5 }); },
    fanfare() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.14, when: i * 0.12 }));
      [523, 659, 784, 1047].forEach(f => tone({ freq: f, type: 'triangle', dur: 1.3, vol: 0.06, when: 0.5 }));
    },
    confetti() { for (let i = 0; i < 6; i++) noise({ freq: 2000 + Math.random() * 3000, Q: 3, dur: 0.05, vol: 0.07, when: i * 0.04 }); },
  };

  // Gentle original music-box tune (C major pentatonic).
  const MEL = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 81, 84, 81, 79, 76, 0,
    74, 76, 79, 76, 74, 72, 69, 72, 74, 76, 74, 72, 72, 0, 0, 0];
  const BASS = [48, 43, 48, 43, 45, 52, 45, 52, 41, 48, 43, 50, 43, 50, 48, 0];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let mode = 'day', step = 0, nextT = 0;

  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const spb = mode === 'party' ? 0.2 : mode === 'night' ? 0.46 : 0.3;
    if (nextT < ctx.currentTime - 0.05) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.3) {
      const when = nextT - ctx.currentTime;
      const tr = mode === 'night' ? -12 : 0;
      const m = MEL[step % MEL.length];
      if (m) {
        tone({ freq: mtof(m + tr), type: 'triangle', dur: spb * 1.6, vol: 0.05, when, bus: musicBus });
        tone({ freq: mtof(m + tr + 12), type: 'sine', dur: spb * 1.2, vol: 0.012, when, bus: musicBus });
      }
      if (step % 2 === 0) {
        const b = BASS[(step / 2) % BASS.length];
        if (b) tone({ freq: mtof(b), type: 'sine', dur: spb * 2.2, vol: 0.06, attack: 0.02, when, bus: musicBus });
      }
      if (mode === 'party' && step % 2 === 1) noise({ ftype: 'highpass', freq: 6000, dur: 0.05, vol: 0.025, when });
      nextT += spb;
      step++;
    }
  }

  function play(name) {
    if (!ctx || muted || ctx.state !== 'running') return;
    const now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 70) return;
    lastPlay[name] = now;
    const f = S[name];
    if (f) { try { f(); } catch (e) { console.warn(e); } }
  }

  function setMode(m) { mode = m; }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('bunnycupcake_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    return muted;
  }

  return { init, play, setMode, toggleMute, get muted() { return muted; } };
})();
