/* Procedural scene renderer: fortress, siege camp, village, weather, day/night, assault animation. */
(function (root) {
  'use strict';
  const W = 1200, H = 560;
  const GROUND = 398;                       // y where the field begins at the foot of the rock
  const WALL_TOP = 244, WALL_BASE = 330;
  const SX = { cliff: [110, 250], curtain: [250, 430], gate: [430, 600], east: [600, 760] };
  const SECTORS = ['cliff', 'curtain', 'gate', 'east'];
  const NAMES = { cliff: 'Cliff Bastion', curtain: 'Curtain Wall', gate: 'Gatehouse', east: 'East Tower' };
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`; }
  function mixArr(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;

  const SKY = [
    [0.00, '#070a18', '#141c38'], [0.19, '#141a3a', '#4a4468'], [0.27, '#3d5a8a', '#ff9c5b'], [0.38, '#5b8fc7', '#c4dcec'],
    [0.50, '#4f86c6', '#d2e7f5'], [0.65, '#5d88bb', '#ecd9b0'], [0.73, '#3d3a70', '#f0793c'], [0.81, '#1c1a42', '#5e3b5c'], [0.90, '#070a18', '#141c38'], [1.0, '#070a18', '#141c38']
  ];
  function skyAt(tod) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (tod >= a[0] && tod <= b[0]) { const t = (tod - a[0]) / (b[0] - a[0]); return [mixArr(hex(a[1]), hex(b[1]), t), mixArr(hex(a[2]), hex(b[2]), t)]; }
    }
    return [hex('#070a18'), hex('#141c38')];
  }

  /* ---------- state ---------- */
  let cv, ctx, dpr = 1, running = false, tPrev = 0, time = 0;
  const S = { mode: 'game', hover: null, selected: null, fast: false, intel: null, showLabels: true };
  let V = null;                  // displayed view
  let T = null;                  // target view
  let clock = 0.27, clockTarget = 0.27;
  const parts = [];              // particles
  const proj = [];               // projectiles
  const actors = [];             // attackers & props
  const bodies = [];             // persistent corpses
  const flashes = [];
  let anim = null;               // assault animation {until, resolve}
  let shake = 0, lightning = 0, nextBolt = 8;
  const D = {};                  // decor

  /* ---------- decor ---------- */
  function buildDecor() {
    const r = rng(1476);
    D.stars = Array.from({ length: 110 }, () => ({ x: r() * W, y: r() * 230, s: r() * 1.4 + 0.3, p: r() * TAU }));
    D.clouds = Array.from({ length: 8 }, () => ({ x: r() * W, y: 30 + r() * 120, s: 0.7 + r() * 1.1, v: 3 + r() * 6 }));
    const ridge = (base, amp, step, seed) => { const q = rng(seed); const pts = []; let y = base; for (let x = -20; x <= W + 40; x += step) { y = base + Math.sin(x * 0.006 + seed) * amp + (q() - 0.5) * amp * 0.9; pts.push([x, y]); } return pts; };
    D.mount = [ridge(238, 38, 26, 3), ridge(280, 30, 22, 9), ridge(320, 24, 18, 15)];
    D.treesBack = Array.from({ length: 120 }, () => { const x = r() * W; const near = x < 100 || x > 790; return { x, y: 372 + r() * 28, h: 22 + r() * 26, c: r(), side: near ? 1 : 0 }; }).filter(t => t.x < 90 || t.x > 780 || t.y < 384);
    D.tents = Array.from({ length: 34 }, (_, i) => ({ x: 810 + r() * 370, y: 418 + r() * 118, w: 34 + r() * 26, c: r() < 0.4 ? 0 : r() < 0.7 ? 1 : 2, order: r() })).sort((a, b) => a.y - b.y);
    D.houses = Array.from({ length: 9 }, (_, i) => ({ x: 22 + (i % 5) * 62 + r() * 14, y: 444 + Math.floor(i / 5) * 52 + r() * 10, w: 34 + r() * 12, burn: i / 9 * 0.9 + 0.05, h: 22 + r() * 6 }));
    D.fields = Array.from({ length: 8 }, (_, i) => ({ x: 340 + i * 14, burn: i / 9 + 0.1 }));
    D.breaks = {};
    for (const sec of SECTORS) { const q = rng(sec.length * 977 + 5); D.breaks[sec] = [0.3, 0.66, 0.5, 0.82].map(f => ({ f: f + (q() - 0.5) * 0.1, w: 24 + q() * 22 })); }
    D.brick = rng(77);
    D.crows = Array.from({ length: 36 }, () => ({ cx: 560 + Math.random() * 360, cy: 330 + Math.random() * 50, r: 30 + Math.random() * 70, sp: 0.3 + Math.random() * 0.6, p: Math.random() * TAU }));
    D.rain = Array.from({ length: 220 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 600 + Math.random() * 300 }));
    D.stakes = Array.from({ length: 16 }, (_, i) => ({ x: 770 + i * 3, y: 410 + i * 8 }));
  }

  /* ---------- helpers: figures ---------- */
  function fig(x, y, sc, o) {
    // y = feet. o: body, hat, kind('spear','archer','militia','turk','janissary','akinji','civ','knight'), dir (1 right/-1 left), anim, bow, weapon
    const bob = o.bob || 0, dir = o.dir || 1;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(sc * dir, sc);
    ctx.fillStyle = '#1a1511'; ctx.fillRect(-2.2, -4, 1.8, 4); ctx.fillRect(0.4, -4, 1.8, 4);
    ctx.fillStyle = o.body; ctx.fillRect(-3, -10, 6, 7);
    ctx.fillStyle = o.belt || '#3a2a1a'; ctx.fillRect(-3, -6, 6, 1);
    ctx.fillStyle = '#d9b48f'; ctx.beginPath(); ctx.arc(0, -12.4, 2.5, 0, TAU); ctx.fill();
    if (o.hat === 'helm') { ctx.fillStyle = '#8f98a3'; ctx.beginPath(); ctx.arc(0, -12.8, 2.8, Math.PI, TAU); ctx.fill(); }
    else if (o.hat === 'hood') { ctx.fillStyle = o.hatc || '#2f5b3a'; ctx.beginPath(); ctx.arc(0, -12.6, 2.9, Math.PI * 0.95, TAU * 1.02); ctx.fill(); }
    else if (o.hat === 'turban') { ctx.fillStyle = '#f1ead7'; ctx.beginPath(); ctx.ellipse(0, -14, 3.3, 2.1, 0, 0, TAU); ctx.fill(); }
    else if (o.hat === 'bork') { ctx.fillStyle = '#efe9d6'; ctx.fillRect(-2.1, -17.5, 4.2, 4); ctx.fillStyle = '#c0392b'; ctx.fillRect(-2.1, -14, 4.2, 1.2); }
    else if (o.hat === 'cap') { ctx.fillStyle = '#5b4630'; ctx.beginPath(); ctx.arc(0, -13, 2.7, Math.PI, TAU); ctx.fill(); }
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 0.9;
    const a = o.anim || 0;
    if (o.weapon === 'spear') { ctx.beginPath(); ctx.moveTo(4 + a, -2); ctx.lineTo(4 + a, -22); ctx.stroke(); ctx.fillStyle = '#c9d1d8'; ctx.beginPath(); ctx.moveTo(4 + a, -25); ctx.lineTo(5.3 + a, -21); ctx.lineTo(2.7 + a, -21); ctx.fill(); }
    else if (o.weapon === 'bow') { ctx.beginPath(); ctx.arc(4, -8, 6, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#d8cdb0'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(4 + 6 * Math.cos(-1.2), -8 + 6 * Math.sin(-1.2)); ctx.lineTo(4 + 6 * Math.cos(1.2), -8 + 6 * Math.sin(1.2)); ctx.stroke(); }
    else if (o.weapon === 'club') { ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(3.5, -7); ctx.lineTo(7 + a, -16); ctx.stroke(); }
    else if (o.weapon === 'sword') { ctx.strokeStyle = '#dfe5ea'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3.5, -8); ctx.lineTo(8 + a, -16); ctx.stroke(); }
    else if (o.weapon === 'ladder') { ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(7, -24); ctx.stroke(); }
    if (o.shield) { ctx.fillStyle = o.shield; ctx.beginPath(); ctx.arc(-3.5, -7, 3.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  const STYLE = {
    spear:   { body: '#3b5e8c', hat: 'helm', weapon: 'spear', shield: '#8e2c2c' },
    archer:  { body: '#3e6b45', hat: 'hood', weapon: 'bow' },
    militia: { body: '#7a5b3c', hat: 'cap', weapon: 'club' },
    azab:    { body: '#a43c2f', hat: 'turban', weapon: 'sword', shield: '#c9a24a' },
    akinji:  { body: '#8a5a2c', hat: 'turban', weapon: 'spear' },
    janissary: { body: '#2f4f9a', hat: 'bork', weapon: 'sword', shield: '#d6c9a0' },
    sapper:  { body: '#5a4632', hat: 'cap', weapon: 'club' },
    civ:     { body: '#9a8a6a', hat: 'cap', weapon: null },
    civ2:    { body: '#7a4a5a', hat: null, weapon: null }
  };

  function horse(x, y, sc, color, dir, gallop, rider) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc * dir, sc);
    const leg = Math.sin(gallop * 14) * 3;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, -10, 11, 5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -16, 4, 3, -0.7, 0, TAU); ctx.fill();
    ctx.fillRect(-9, -8, 2, 8 + leg * 0.3); ctx.fillRect(-5, -8, 2, 8 - leg * 0.3); ctx.fillRect(5, -8, 2, 8 + leg * 0.3); ctx.fillRect(9, -8, 2, 8 - leg * 0.3);
    ctx.strokeStyle = '#1b130c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11, -11); ctx.quadraticCurveTo(-16, -8, -15, -3); ctx.stroke();
    ctx.restore();
    if (rider) fig(x + 1 * dir, y - 9 * sc, sc, Object.assign({ dir }, rider));
  }

  /* ---------- API ---------- */
  const Scene = {
    W, H, SX, NAMES, S,
    init(canvas) {
      cv = canvas; dpr = Math.min(2, root.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr; ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDecor();
      cv.addEventListener('mousemove', e => { S.hover = Scene.sectorAt(Scene.toLocal(e)); cv.style.cursor = S.hover && S.mode === 'game' ? 'pointer' : 'default'; });
      cv.addEventListener('mouseleave', () => { S.hover = null; });
      cv.addEventListener('click', e => {
        if (anim) { S.fast = true; return; }
        const sec = Scene.sectorAt(Scene.toLocal(e));
        if (sec && S.mode === 'game' && Scene.onSector) Scene.onSector(sec);
      });
      cv.addEventListener('touchend', e => { if (anim) S.fast = true; }, { passive: true });
      running = true; requestAnimationFrame(loop);
    },
    toLocal(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; },
    sectorAt(p) {
      if (p.y < 160 || p.y > 400) return null;
      for (const sec of SECTORS) if (p.x >= SX[sec][0] && p.x < SX[sec][1]) return sec;
      return null;
    },
    sync(view, instant) {
      T = view;
      if (!V || instant) V = JSON.parse(JSON.stringify(view));
    },
    setTime(day, phase, instant) {
      const off = { dawn: 0.27, day: 0.46, assault: 0.58, dusk: 0.74, night: 0.92, title: 0.68 }[phase];
      clockTarget = (day - 1) + off;
      if (instant) clock = clockTarget;
    },
    setMode(m) { S.mode = m; },
    setSelected(sec) { S.selected = sec; },
    setIntel(i) { S.intel = i; },
    isBusy: () => !!anim,
    spawn(kind) { spawnProp(kind); },
    endProps() { for (const a of actors) if (a.prop) a.leaving = true; },
    shake(n) { shake = Math.max(shake, n); },
    playBombard(hits) {
      return new Promise(res => {
        let i = 0;
        const next = () => {
          if (i >= hits.length) return setTimeout(res, 400);
          const h = hits[i++]; fireBombard(h); setTimeout(next, S.fast ? 250 : 900);
        };
        next();
      });
    },
    playAssault(result, view) {
      return new Promise(res => startAssault(result, view, res));
    },
    clearBodies() { bodies.length = 0; }
  };

  /* ---------- props (event actors) ---------- */
  function spawnProp(kind) {
    if (kind === 'envoy') actors.push({ prop: true, kind: 'envoy', x: 1000, y: 452, tx: 640, ty: 452, v: 55, state: 'in' });
    else if (kind === 'rider') actors.push({ prop: true, kind: 'rider', x: -40, y: 470, tx: 470, ty: 440, v: 150, state: 'in' });
    else if (kind === 'cart') actors.push({ prop: true, kind: 'cart', x: 1100, y: 470, tx: 600, ty: 440, v: 40, state: 'in' });
    else if (kind === 'refugees') for (let i = 0; i < 16; i++) actors.push({ prop: true, kind: 'refugee', x: 1050 + i * 22 + Math.random() * 10, y: 440 + Math.random() * 40, tx: 590 + (i % 5) * 9, ty: 430 + (i % 4) * 8, v: 26 + Math.random() * 8, state: 'in', c: i % 3 });
  }
  function updateProps(dt) {
    for (let i = actors.length - 1; i >= 0; i--) {
      const a = actors[i]; if (!a.prop) continue;
      const toX = a.leaving ? (a.kind === 'rider' || a.kind === 'refugee' ? 520 : 1250) : a.tx;
      const toY = a.leaving ? a.ty : a.ty;
      const dx = toX - a.x, dy = toY - a.y, d = Math.hypot(dx, dy);
      if (d > 3) { a.x += dx / d * a.v * dt; a.y += dy / d * a.v * dt; a.dir = dx >= 0 ? 1 : -1; a.walk = (a.walk || 0) + dt; }
      else if (a.leaving) { if (a.kind === 'refugee' || a.kind === 'rider') a.fade = (a.fade || 1) - dt * 2; else a.fade = 0; if (a.fade <= 0) actors.splice(i, 1); }
      if (a.leaving && (a.x > 1230 || a.x < -60)) actors.splice(i, 1);
    }
  }

  /* ---------- particles ---------- */
  function emit(type, x, y, n) {
    for (let i = 0; i < n && parts.length < 700; i++) {
      if (type === 'smoke') parts.push({ t: 'smoke', x: x + (Math.random() - 0.5) * 6, y, vx: 6 + Math.random() * 10, vy: -(14 + Math.random() * 14), life: 0, max: 3 + Math.random() * 2.5, s: 5 + Math.random() * 5 });
      else if (type === 'fire') parts.push({ t: 'fire', x: x + (Math.random() - 0.5) * 8, y, vx: (Math.random() - 0.5) * 8, vy: -(20 + Math.random() * 25), life: 0, max: 0.5 + Math.random() * 0.5, s: 3 + Math.random() * 3 });
      else if (type === 'dust') parts.push({ t: 'dust', x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 50, vy: -(10 + Math.random() * 40), life: 0, max: 0.8 + Math.random() * 0.8, s: 3 + Math.random() * 4 });
      else if (type === 'debris') parts.push({ t: 'debris', x, y, vx: (Math.random() - 0.5) * 110, vy: -(30 + Math.random() * 90), life: 0, max: 1 + Math.random() * 0.8, s: 1.5 + Math.random() * 2 });
      else if (type === 'spark') parts.push({ t: 'spark', x, y, vx: (Math.random() - 0.5) * 60, vy: -(10 + Math.random() * 40), life: 0, max: 0.4 + Math.random() * 0.3, s: 1 });
    }
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt; if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t === 'debris' || p.t === 'spark') p.vy += 260 * dt;
      if (p.t === 'smoke') { p.s += dt * 3; p.vx += 4 * dt; }
    }
  }

  /* ---------- projectiles ---------- */
  function shoot(x0, y0, x1, y1, o) { proj.push(Object.assign({ x0, y0, x1, y1, t: 0, dur: 0.9, kind: 'arrow', arc: 40 }, o)); }
  function updateProj(dt) {
    for (let i = proj.length - 1; i >= 0; i--) {
      const p = proj[i]; p.t += dt / p.dur;
      if (p.t >= 1) {
        if (p.kind === 'stone') { emit('dust', p.x1, p.y1, 14); emit('debris', p.x1, p.y1, 12); shake = Math.max(shake, 6); if (p.onHit) p.onHit(); flashes.push({ x: p.x1, y: p.y1, t: 0, max: 0.35, r: 60 }); }
        proj.splice(i, 1);
      }
    }
  }

  /* ---------- bombard ---------- */
  function bombardPos(i) { return i === 0 ? { x: 770, y: 468 } : { x: 800, y: 508 }; }
  function fireBombard(h) {
    const i = Math.random() < 0.5 ? 0 : 1; const b = bombardPos(Math.min(i, Math.max(0, (V ? V.bombards : 1) - 1)));
    const tx = lerp(SX[h.sector][0], SX[h.sector][1], 0.3 + Math.random() * 0.4);
    flashes.push({ x: b.x - 14, y: b.y - 14, t: 0, max: 0.3, r: 50 }); emit('smoke', b.x - 14, b.y - 14, 10);
    proj.push({ x0: b.x - 14, y0: b.y - 14, x1: tx, y1: WALL_TOP + 40, t: 0, dur: 0.9, kind: 'stone', arc: 90, onHit: () => { if (Scene.onSound) Scene.onSound('bombard'); } });
    if (Scene.onSound) Scene.onSound('boom');
  }

  /* ---------- assault ---------- */
  const FATE = { repelled: [0.7, 0.3, 0], held: [0.45, 0.45, 0.1], bloody: [0.3, 0.4, 0.3], breach: [0.15, 0.35, 0.5], collapse: [0.05, 0.25, 0.7] };
  function startAssault(result, view, resolve) {
    S.fast = false;
    const army = result.wave.army || { azab: 1 };
    const kinds = Object.keys(army);
    const pick = () => { let r = Math.random(), a = 0; for (const k of kinds) { a += army[k]; if (r <= a) return k; } return kinds[0]; };
    let maxEnd = 0;
    for (const r of result.results) {
      const n = clamp(Math.round(r.attackers / 2.4), 4, 38);
      const f = FATE[r.kind];
      const [x0, x1] = SX[r.sector];
      for (let i = 0; i < n; i++) {
        const roll = Math.random(); const fate = roll < f[0] ? 'early' : roll < f[0] + f[1] ? 'wall' : 'top';
        const tx = lerp(x0 + 14, x1 - 14, Math.random());
        const delay = Math.random() * 1.6;
        actors.push({ assault: true, sector: r.sector, kind: pick(), x: 800 + Math.random() * 120, y: 420 + Math.random() * 100, tx, ty: GROUND + 6 + Math.random() * 30, v: 95 + Math.random() * 40, delay, state: 'wait', fate, ladder: Math.random() < 0.45, climb: 0, die: 0, dir: -1, hold: 0 });
      }
      maxEnd = Math.max(maxEnd, 9);
    }
    if (result.wave.army && (result.wave.army.sapper || result.index >= 4)) actors.push({ assault: true, siege: true, x: 735, y: 462, tx: 690, ty: 462, state: 'wait', delay: 0.5, v: 12, kind: 'tower' });
    anim = { t: 0, result, resolve, view, volleyT: 0, collapseFx: {}, lastCount: 0 };
    if (Scene.onSound) Scene.onSound('horn');
  }

  function updateAssault(dt) {
    if (!anim) return;
    const step = dt * (S.fast ? 3.2 : 1);
    anim.t += step;
    let alive = 0;
    // arrows from archers
    anim.volleyT -= step;
    const attackers = actors.filter(a => a.assault && !a.siege && a.state !== 'dead' && a.state !== 'gone' && a.state !== 'wait');
    if (anim.volleyT <= 0 && attackers.length) {
      anim.volleyT = 0.12;
      for (const sec of SECTORS) {
        const g = V.garrison[sec]; if (!g || !g.archer) continue;
        const targets = attackers.filter(a => a.sector === sec && a.state === 'run');
        if (!targets.length) continue;
        const tg = targets[Math.floor(Math.random() * targets.length)];
        const sx = lerp(SX[sec][0] + 10, SX[sec][1] - 10, Math.random());
        shoot(sx, WALL_TOP - 4, tg.x, tg.y - 8, { dur: 0.7 + Math.random() * 0.3, arc: 45, onHit: null, target: tg });
        if (Math.random() < 0.5) tg.arrowHits = (tg.arrowHits || 0) + 1;
      }
    }
    for (const a of actors) {
      if (!a.assault) continue;
      if (a.siege) { a.delay -= step; if (a.delay <= 0 && a.x > a.tx) { a.x -= a.v * step; a.state = 'run'; } if (anim.t > 7) a.fadeOut = true; continue; }
      if (a.state === 'wait') { a.delay -= step; if (a.delay <= 0) a.state = 'run'; alive++; continue; }
      if (a.state === 'run') {
        alive++;
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        a.walk = (a.walk || 0) + step;
        const sp = a.v * step;
        if (d > sp) { a.x += dx / d * sp; a.y += dy / d * sp; }
        else { a.state = a.ladder ? 'climb' : 'fight'; a.hold = 0; }
        if (a.fate === 'early' && a.x < SX[a.sector][1] + 160 && Math.random() < 0.02 * step * 60 / 8) { a.state = 'dead'; a.die = 0; }
        if (a.arrowHits > 2 && a.fate !== 'top' && Math.random() < 0.05) { a.state = 'dead'; a.die = 0; }
      } else if (a.state === 'climb') {
        alive++; a.climb += step / 1.6;
        if (a.climb >= 1) { a.state = 'fight'; a.hold = 0; }
      } else if (a.state === 'fight') {
        alive++; a.hold += step;
        if (Math.random() < 0.08) emit('spark', a.x, a.y - (a.ladder ? 140 : 12), 1);
        const lim = a.fate === 'top' ? 3.5 : 1.3 + Math.random() * 0.2;
        if (a.hold > lim) { if (a.fate === 'top') { a.state = 'top'; a.hold = 0; } else { a.state = 'dead'; a.die = 0; } }
      } else if (a.state === 'top') {
        alive++; a.hold += step; if (a.hold > 2.2) { a.state = 'gone'; }
      } else if (a.state === 'dead') {
        a.die += step;
        if (a.die === step) { if (bodies.length < 90) bodies.push({ x: a.x + (Math.random() - 0.5) * 10, y: a.y + 2, c: Math.random() }); }
        if (a.die > 0.8) a.state = 'gone';
      }
    }
    // collapse / breach visual: fire & smoke on sector
    for (const r of anim.result.results) {
      if ((r.kind === 'collapse' || r.kind === 'breach') && anim.t > 4.2 && !anim.collapseFx[r.sector]) { anim.collapseFx[r.sector] = true; shake = Math.max(shake, 9); const cx = (SX[r.sector][0] + SX[r.sector][1]) / 2; emit('debris', cx, WALL_TOP + 30, 24); emit('dust', cx, WALL_TOP + 30, 20); if (Scene.onSound) Scene.onSound('collapse'); }
    }
    if (anim.t > 3 && !anim.sfx) { anim.sfx = 1; if (Scene.onSound) Scene.onSound('clash'); }
    const done = anim.t > 14 || (anim.t > 4 && alive === 0 && !actors.some(a => a.assault && !a.siege && a.state !== 'gone'));
    if (done) {
      for (let i = actors.length - 1; i >= 0; i--) if (actors[i].assault) actors.splice(i, 1);
      const r = anim.resolve; anim = null; S.fast = false; setTimeout(r, 450);
    }
  }

  /* ---------- drawing: world ---------- */
  function drawSky(tod, sun) {
    const [top, bot] = skyAt(tod);
    const g = ctx.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 400);
    const nightAmt = smooth(0.1, -0.25, sun);
    if (nightAmt > 0.02) {
      for (const s of D.stars) { const a = nightAmt * (0.5 + 0.5 * Math.sin(time * 1.4 + s.p)); ctx.fillStyle = `rgba(255,255,240,${a})`; ctx.fillRect(s.x, s.y, s.s, s.s); }
    }
    // sun & moon
    const sp = (tod - 0.25) / 0.5;
    if (sp > -0.1 && sp < 1.1) {
      const x = 80 + sp * (W - 160), y = 300 - Math.sin(clamp(sp, 0, 1) * Math.PI) * 240;
      const g2 = ctx.createRadialGradient(x, y, 4, x, y, 90); g2.addColorStop(0, 'rgba(255,230,170,.75)'); g2.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g2; ctx.fillRect(x - 100, y - 100, 200, 200);
      ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
    }
    const mt = ((tod - 0.75) + 1) % 1 / 0.5;
    if (mt > -0.05 && mt < 1.05) {
      const x = 80 + mt * (W - 160), y = 300 - Math.sin(clamp(mt, 0, 1) * Math.PI) * 230;
      ctx.fillStyle = '#e8ecf5'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(30,40,70,.35)'; ctx.beginPath(); ctx.arc(x + 4, y - 2, 11, 0, TAU); ctx.fill();
    }
    // clouds
    const gray = clamp((V.wx || 0) * 0.8 + (V.fog || 0) * 0.3, 0, 1);
    for (const c of D.clouds) {
      const x = ((c.x + time * c.v) % (W + 300)) - 150;
      ctx.fillStyle = `rgba(${lerp(250, 110, gray) | 0},${lerp(250, 116, gray) | 0},${lerp(255, 126, gray) | 0},${0.45 + gray * 0.3})`;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + k * 22 * c.s, c.y + Math.sin(k * 2) * 6, 34 * c.s, 14 * c.s, 0, 0, TAU); ctx.fill(); }
    }
    return bot;
  }

  function drawMountains(bot) {
    const cols = ['#6a7c92', '#506477', '#3a4e45'];
    D.mount.forEach((pts, li) => {
      ctx.fillStyle = rgb(mixArr(hex(cols[li]), bot, 0.3 - li * 0.07));
      ctx.beginPath(); ctx.moveTo(-20, 420);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.lineTo(W + 40, 420); ctx.closePath(); ctx.fill();
    });
  }

  function tree(x, y, h, c, burn) {
    ctx.fillStyle = '#2a1d12'; ctx.fillRect(x - 1.5, y - 4, 3, 6);
    ctx.fillStyle = mix('#1f3a2a', '#35552f', c);
    for (let k = 0; k < 3; k++) { const w = h * (0.5 - k * 0.1); ctx.beginPath(); ctx.moveTo(x, y - h * (0.55 + k * 0.28)); ctx.lineTo(x - w / 2, y - h * k * 0.28 - 2); ctx.lineTo(x + w / 2, y - h * k * 0.28 - 2); ctx.fill(); }
  }

  function drawBackForest() {
    for (const t of D.treesBack) tree(t.x, t.y, t.h, t.c);
  }

  function wallEdge(sec, hp) {
    const [x0, x1] = SX[sec]; const n = hp > 78 ? 0 : hp > 58 ? 1 : hp > 40 ? 2 : hp > 24 ? 3 : 4;
    const depth = 10 + (1 - hp / 100) * 52;
    const list = [];
    for (let i = 0; i < n; i++) { const b = D.breaks[sec][i]; list.push({ x: lerp(x0 + 20, x1 - 20, b.f), w: b.w * (0.7 + (1 - hp / 100) * 0.6), d: depth * (i % 2 ? 0.7 : 1) }); }
    return list;
  }

  function wallFace(sec, x0, x1, top, base, hp) {
    const breaks = wallEdge(sec, hp);
    const topAt = x => { let y = top; for (const b of breaks) { const dx = Math.abs(x - b.x); if (dx < b.w / 2) y = Math.max(y, top + b.d * (1 - (dx / (b.w / 2)) ** 3 * 0.5)); } return y; };
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0, base);
    for (let x = x0; x <= x1; x += 3) ctx.lineTo(x, topAt(x));
    ctx.lineTo(x1, base); ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, base); g.addColorStop(0, '#9b9487'); g.addColorStop(1, '#6f695e');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(40,34,28,.35)'; ctx.lineWidth = 1;
    for (let y = top + 8, row = 0; y < base; y += 10, row++) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); for (let x = x0 + (row % 2 ? 9 : 0); x < x1; x += 18) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 10); ctx.stroke(); } }
    // damage: soot & cracks
    const dmg = 1 - hp / 100;
    if (dmg > 0.15) {
      ctx.fillStyle = `rgba(20,14,10,${dmg * 0.55})`;
      for (const b of breaks) { ctx.beginPath(); ctx.ellipse(b.x, top + b.d * 0.7, b.w * 0.8, b.d * 0.9, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = `rgba(25,18,12,${0.4 + dmg * 0.5})`; ctx.lineWidth = 1.4;
      for (const b of breaks) { ctx.beginPath(); ctx.moveTo(b.x - 4, top + b.d); ctx.lineTo(b.x + 2, top + b.d + 18); ctx.lineTo(b.x - 3, top + b.d + 32); ctx.stroke(); }
    }
    ctx.restore();
    // merlons
    ctx.fillStyle = '#a8a195';
    for (let x = x0 + 2; x < x1 - 8; x += 20) { if (topAt(x + 6) > top + 2) continue; ctx.fillRect(x, top - 10, 12, 10); ctx.fillStyle = '#7d776b'; ctx.fillRect(x, top - 10, 12, 2); ctx.fillStyle = '#a8a195'; }
    return breaks;
  }

  function tower(x0, x1, top, base, roof, opts) {
    opts = opts || {};
    const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#8a8478'); g.addColorStop(0.5, '#a39c8e'); g.addColorStop(1, '#6a645a');
    ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, base - top);
    ctx.strokeStyle = 'rgba(40,34,28,.3)'; ctx.lineWidth = 1;
    for (let y = top + 10, row = 0; y < base; y += 10, row++) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    ctx.fillStyle = '#a8a195'; for (let x = x0 - 2; x < x1; x += 14) ctx.fillRect(x, top - 8, 9, 8);
    ctx.fillStyle = '#2a2018'; const cx = (x0 + x1) / 2;
    ctx.fillRect(cx - 2, top + 22, 4, 12); if (opts.win2) ctx.fillRect(cx - 2, top + 60, 4, 12);
    if (roof) { ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x0 - 6, top - 6); ctx.lineTo(cx, top - (opts.rh || 48)); ctx.lineTo(x1 + 6, top - 6); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.moveTo(cx, top - (opts.rh || 48)); ctx.lineTo(x1 + 6, top - 6); ctx.lineTo(cx, top - 6); ctx.fill(); }
  }

  function flag(x, y, droop) {
    ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
    const w = 40, h = 24; const wave = time * 4;
    ctx.fillStyle = '#8e1b1b'; ctx.beginPath(); ctx.moveTo(x, y - 46);
    for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * w / 8, y - 46 + Math.sin(wave + i * 0.8) * (3 - droop * 2) + i * droop * 1.2);
    for (let i = 8; i >= 0; i--) ctx.lineTo(x + i * w / 8, y - 46 + h + Math.sin(wave + i * 0.8) * (3 - droop * 2) + i * droop * 1.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0b54a'; ctx.beginPath(); ctx.arc(x + 13, y - 33 + droop * 3, 4, 0, TAU); ctx.fill();
    ctx.fillRect(x + 10, y - 30 + droop * 3, 2, 8);
  }

  function drawCastle() {
    const dmg = key => 1 - V.walls[key] / 100;
    // rock
    const rg = ctx.createLinearGradient(0, 320, 0, 410); rg.addColorStop(0, '#6b6256'); rg.addColorStop(1, '#4a4136');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(70, 410); ctx.lineTo(96, 360); ctx.lineTo(104, 320); ctx.lineTo(780, 320); ctx.lineTo(808, 372); ctx.lineTo(836, 410); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 26; i++) { const q = rng(i * 13 + 4); const x = 100 + q() * 700, y = 336 + q() * 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14 + q() * 20, y + 4); ctx.lineTo(x + 6, y + 12 + q() * 10); ctx.fill(); }
    // keep (behind curtain)
    const gk = ctx.createLinearGradient(300, 0, 400, 0); gk.addColorStop(0, '#948d80'); gk.addColorStop(1, '#6b655a');
    ctx.fillStyle = gk; ctx.fillRect(296, 128, 96, 120);
    ctx.fillStyle = '#a8a195'; for (let x = 294; x < 392; x += 14) ctx.fillRect(x, 120, 9, 8);
    ctx.fillStyle = '#6e3b2c'; ctx.beginPath(); ctx.moveTo(286, 128); ctx.lineTo(344, 78); ctx.lineTo(402, 128); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.moveTo(344, 78); ctx.lineTo(402, 128); ctx.lineTo(344, 128); ctx.fill();
    ctx.fillStyle = '#2a2018'; for (const [wx, wy] of [[316, 150], [364, 150], [340, 190]]) ctx.fillRect(wx, wy, 6, 14);
    flag(344, 80, clamp((50 - V.morale) / 50, 0, 1));
    // chapel
    ctx.fillStyle = '#867f72'; ctx.fillRect(210, 198, 44, 50); ctx.fillStyle = '#5a342a'; ctx.beginPath(); ctx.moveTo(204, 198); ctx.lineTo(232, 168); ctx.lineTo(260, 198); ctx.fill();
    ctx.strokeStyle = '#e0c067'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(232, 168); ctx.lineTo(232, 150); ctx.moveTo(226, 158); ctx.lineTo(238, 158); ctx.stroke();
    // barracks roof
    ctx.fillStyle = '#7a756a'; ctx.fillRect(420, 190, 60, 56); ctx.fillStyle = '#5a342a'; ctx.beginPath(); ctx.moveTo(414, 190); ctx.lineTo(450, 160); ctx.lineTo(486, 190); ctx.fill();
    // cliff tower
    tower(104, 176, 196, 330, '#6e3b2c', { rh: 52, win2: true });
    // east tower
    tower(628, 742, 178, 336, '#6e3b2c', { rh: 58, win2: true });
    // gate towers
    tower(430, 486, 190, GROUND, '#6e3b2c', { rh: 46, win2: true });
    tower(544, 600, 190, GROUND, '#6e3b2c', { rh: 46, win2: true });

    // defenders layer (behind merlons)
    drawDefenders();

    // wall faces
    wallFace('cliff', 176, 250, WALL_TOP, WALL_BASE, V.walls.cliff);
    wallFace('curtain', 250, 430, WALL_TOP, WALL_BASE, V.walls.curtain);
    wallFace('gate', 486, 544, WALL_TOP, GROUND, V.walls.gate);
    wallFace('east', 600, 628, WALL_TOP, WALL_BASE, V.walls.east);
    wallFace('east', 742, 760, WALL_TOP, WALL_BASE, V.walls.east);
    // gate arch
    ctx.fillStyle = '#17110c'; ctx.beginPath(); ctx.moveTo(496, GROUND); ctx.lineTo(496, GROUND - 46); ctx.quadraticCurveTo(515, GROUND - 74, 534, GROUND - 46); ctx.lineTo(534, GROUND); ctx.fill();
    ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 2; for (let x = 500; x < 534; x += 8) { ctx.beginPath(); ctx.moveTo(x, GROUND - 60); ctx.lineTo(x, GROUND); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(498, GROUND - 40); ctx.lineTo(532, GROUND - 40); ctx.moveTo(498, GROUND - 20); ctx.lineTo(532, GROUND - 20); ctx.stroke();

    // fortifications visuals
    for (const sec of SECTORS) {
      const lvl = V.fort[sec]; const [x0, x1] = SX[sec];
      if (lvl >= 1) { ctx.fillStyle = '#6b4a28'; for (let x = x0 + 10; x < x1 - 20; x += 40) { ctx.fillRect(x, WALL_TOP - 14, 30, 6); ctx.fillStyle = '#4a3219'; ctx.fillRect(x, WALL_TOP - 14, 30, 2); ctx.fillStyle = '#6b4a28'; } }
      if (lvl >= 2) { ctx.strokeStyle = '#5a3d20'; ctx.lineWidth = 2.5; const by = sec === 'gate' ? GROUND + 4 : WALL_BASE + 66; for (let x = x0 + 8; x < x1 - 6; x += 14) { ctx.beginPath(); ctx.moveTo(x, by + 8); ctx.lineTo(x - 7, by - 10); ctx.stroke(); } }
      if (lvl >= 3) { ctx.fillStyle = '#2c2218'; for (let x = x0 + 30; x < x1 - 20; x += 60) { ctx.beginPath(); ctx.arc(x, WALL_TOP - 20, 6, 0, Math.PI); ctx.fill(); } ctx.fillStyle = '#c2483a'; ctx.fillRect(x0 + 2, WALL_TOP - 40, 3, 30); }
    }
    // fires on heavily damaged sectors
    for (const sec of SECTORS) {
      if (V.walls[sec] < 36) {
        const br = wallEdge(sec, V.walls[sec]);
        for (const b of br) if (Math.random() < 0.28) { emit('fire', b.x, WALL_TOP + b.d * 0.6, 1); if (Math.random() < 0.5) emit('smoke', b.x, WALL_TOP + b.d * 0.4, 1); }
      }
    }
    // chimney smoke
    if (Math.random() < 0.02) emit('smoke', 233, 150, 1);
    if (Math.random() < 0.02) emit('smoke', 462, 168, 1);
  }

  function drawDefenders() {
    const sel = S.selected;
    for (const sec of SECTORS) {
      const g = V.garrison[sec]; if (!g) continue;
      const [x0, x1] = SX[sec];
      const inner0 = sec === 'cliff' ? 180 : x0 + 8, inner1 = sec === 'gate' ? x1 - 8 : x1 - 6;
      const list = [];
      for (const t of ['spear', 'archer', 'militia']) { const n = Math.min(10, Math.ceil(g[t] / 2)); for (let i = 0; i < n; i++) list.push(t); }
      const k = list.length; if (!k) continue;
      list.forEach((t, i) => {
        const px = lerp(inner0 + 12, inner1 - 12, (i + 0.5) / k);
        const py = WALL_TOP + 8 + ((i * 7) % 3) * 1.5;
        const st = STYLE[t];
        const bob = Math.sin(time * 2.2 + i * 1.7) * 0.5;
        const fighting = anim && anim.t > 2.4;
        const a = fighting && t !== 'archer' ? Math.sin(time * 9 + i) * 1.8 : 0;
        fig(px, py, 1.18, { body: st.body, hat: st.hat, weapon: st.weapon, shield: st.shield, bob, dir: -1, anim: a });
      });
    }
    // sentry pacing on towers
    const px = 140 + ((time * 14) % 36); fig(px, 200, 1.05, { body: '#3b5e8c', hat: 'helm', weapon: 'spear', dir: 1 });
  }

  function drawGround() {
    const g = ctx.createLinearGradient(0, GROUND - 4, 0, H);
    g.addColorStop(0, '#59673a'); g.addColorStop(0.5, '#475a31'); g.addColorStop(1, '#2f3f24');
    ctx.fillStyle = g; ctx.fillRect(0, GROUND - 2, W, H - GROUND + 2);
    // scarred battlefield: dirt
    ctx.fillStyle = 'rgba(92,70,44,.55)';
    ctx.beginPath(); ctx.ellipse(540, 462, 300, 28, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(70,52,32,.5)'; ctx.beginPath(); ctx.ellipse(700, 440, 120, 16, 0, 0, TAU); ctx.fill();
    // road from gate to camp
    ctx.fillStyle = '#7a6a4c'; ctx.beginPath(); ctx.moveTo(500, GROUND); ctx.lineTo(530, GROUND); ctx.quadraticCurveTo(640, 440, 840, 440); ctx.lineTo(840, 470); ctx.quadraticCurveTo(580, 470, 490, GROUND); ctx.fill();
    // fields (between village and gate)
    for (const f of D.fields) {
      const burnt = V.villageBurn > f.burn;
      ctx.fillStyle = burnt ? '#2a2420' : '#b79a3d'; ctx.fillRect(f.x, 428, 9, 90);
      ctx.fillStyle = burnt ? '#1a1612' : '#9a7f2f'; ctx.fillRect(f.x + 9, 428, 3, 90);
      if (burnt && Math.random() < 0.004) emit('smoke', f.x + 4, 440 + Math.random() * 60, 1);
    }
    for (const b of bodies) { ctx.fillStyle = b.c < 0.5 ? 'rgba(46,28,22,.85)' : 'rgba(60,40,30,.85)'; ctx.fillRect(b.x - 4, b.y, 8, 3); ctx.fillStyle = 'rgba(180,170,150,.7)'; ctx.fillRect(b.x + 3, b.y, 2, 2); }
  }

  function drawVillage() {
    for (const h of D.houses) {
      const burn = V.villageBurn > h.burn;
      const ruin = V.villageBurn > h.burn + 0.18;
      const x = h.x, y = h.y, w = h.w, hh = h.h;
      if (ruin) {
        ctx.fillStyle = '#2a211a'; ctx.fillRect(x, y - 8, w, 8); ctx.fillStyle = '#1b1510'; ctx.fillRect(x + 4, y - 14, 6, 6); ctx.fillRect(x + w - 12, y - 11, 8, 3);
        if (Math.random() < 0.06) emit('smoke', x + w / 2, y - 10, 1);
        continue;
      }
      ctx.fillStyle = '#b8a07a'; ctx.fillRect(x, y - hh, w, hh);
      ctx.fillStyle = '#6a3f2c'; ctx.beginPath(); ctx.moveTo(x - 4, y - hh); ctx.lineTo(x + w / 2, y - hh - 16); ctx.lineTo(x + w + 4, y - hh); ctx.fill();
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x + w / 2 - 3, y - 12, 6, 12);
      ctx.fillStyle = V.__night ? '#f4c25a' : '#26201a'; ctx.fillRect(x + 5, y - hh + 5, 5, 5);
      if (burn) { if (Math.random() < 0.5) emit('fire', x + Math.random() * w, y - hh - 4, 1); if (Math.random() < 0.3) emit('smoke', x + w / 2, y - hh - 10, 1); ctx.fillStyle = 'rgba(255,120,40,.25)'; ctx.fillRect(x, y - hh, w, hh); }
      else if (Math.random() < 0.012) emit('smoke', x + w - 6, y - hh - 14, 1);
    }
    // well & villagers if village still alive
    if (V.villageBurn < 0.5) { fig(106, 520, 1.1, { body: STYLE.civ.body, hat: 'cap', dir: 1, bob: Math.sin(time * 2) * 0.6 }); fig(130, 524, 1.1, { body: STYLE.civ2.body, dir: -1, bob: Math.sin(time * 2 + 1) * 0.6 }); }
  }

  function tent(t, light) {
    const x = t.x, y = t.y, w = t.w, h = w * 0.7;
    const col = ['#b53a2e', '#e4d7b6', '#8b6a2f'][t.c];
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, w * 0.6, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w / 2, y); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x, y); ctx.fill();
    ctx.fillStyle = '#1b130c'; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y - h * 0.5); ctx.lineTo(x + 4, y); ctx.fill();
    ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h - 8); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.fillRect(x, y - h - 8, 6, 3);
  }

  function drawCamp() {
    const count = clamp(Math.round(V.tents), 6, D.tents.length);
    // palisade + trench
    ctx.fillStyle = '#4b3a24'; for (const s of D.stakes) { ctx.beginPath(); ctx.moveTo(s.x, s.y + 14); ctx.lineTo(s.x + 1.5, s.y - 6); ctx.lineTo(s.x + 3, s.y + 14); ctx.fill(); }
    ctx.fillStyle = 'rgba(30,22,14,.55)'; ctx.beginPath(); ctx.ellipse(760, 450, 22, 7, 0.2, 0, TAU); ctx.fill();
    // sultan's pavilion appears later
    if (V.day >= 9) {
      const px = 1110, py = 424;
      ctx.fillStyle = '#9a1f1f'; ctx.fillRect(px - 40, py - 30, 80, 30); ctx.beginPath(); ctx.moveTo(px - 46, py - 30); ctx.lineTo(px, py - 66); ctx.lineTo(px + 46, py - 30); ctx.fill();
      ctx.fillStyle = '#d4a53a'; ctx.fillRect(px - 40, py - 32, 80, 3); ctx.beginPath(); ctx.arc(px, py - 68, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#17100a'; ctx.fillRect(px - 8, py - 22, 16, 22);
    }
    D.tentsDrawn = D.tents.slice().sort((a, b) => a.order - b.order).slice(0, count).sort((a, b) => a.y - b.y);
    for (const tt of D.tentsDrawn) tent(tt);
    // campfires
    for (let i = 0; i < Math.min(8, D.tentsDrawn.length / 3 | 0); i++) { const t = D.tentsDrawn[i * 3]; const fx = t.x + 26, fy = t.y + 8; ctx.fillStyle = '#2a1a10'; ctx.fillRect(fx - 4, fy, 8, 2); if (Math.random() < 0.45) emit('fire', fx, fy, 1); if (Math.random() < 0.08) emit('smoke', fx, fy - 4, 1); }
    // banners
    for (const bx of [840, 960, 1060]) { ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, 430); ctx.lineTo(bx, 372); ctx.stroke(); ctx.fillStyle = '#b21f1f'; ctx.beginPath(); ctx.moveTo(bx, 372); for (let i = 0; i <= 6; i++) ctx.lineTo(bx + i * 5, 372 + Math.sin(time * 4 + i + bx) * 2); for (let i = 6; i >= 0; i--) ctx.lineTo(bx + i * 5, 388 + Math.sin(time * 4 + i + bx) * 2); ctx.fill(); ctx.fillStyle = '#f1ead7'; ctx.beginPath(); ctx.arc(bx + 10, 380, 3.5, 0.5, TAU - 0.5); ctx.fill(); }
    // siege engines
    for (let i = 0; i < V.bombards; i++) {
      const b = bombardPos(i);
      ctx.fillStyle = '#4a3219'; ctx.fillRect(b.x - 24, b.y - 8, 40, 7); ctx.fillStyle = '#2a2a2e'; ctx.save(); ctx.translate(b.x - 8, b.y - 12); ctx.rotate(-0.22); ctx.fillRect(-26, -6, 44, 11); ctx.fillStyle = '#17171a'; ctx.fillRect(-27, -7, 6, 13); ctx.restore();
      ctx.fillStyle = '#3a2a18'; ctx.beginPath(); ctx.arc(b.x - 18, b.y, 6, 0, TAU); ctx.arc(b.x + 8, b.y, 6, 0, TAU); ctx.fill();
      fig(b.x + 24, b.y + 2, 1.1, { body: '#8f2a22', hat: 'turban', dir: -1, weapon: null });
    }
    // ladder piles
    if (V.day > 2) { ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(850 + k * 6, 484 - k * 2); ctx.lineTo(884 + k * 6, 474 - k * 2); ctx.stroke(); } }
    // idle soldiers drilling
    const n = clamp(Math.round(V.tents * 0.8), 4, 22);
    for (let i = 0; i < n; i++) {
      const bx = 830 + (i * 53) % 330, by = 430 + ((i * 37) % 100);
      const wx = bx + Math.sin(time * 0.3 + i) * 22, kind = i % 5 === 0 ? 'janissary' : i % 3 === 0 ? 'akinji' : 'azab';
      const st = STYLE[kind];
      if (!anim) fig(wx, by, 0.9 + (by - 430) / 400, { body: st.body, hat: st.hat, weapon: st.weapon, shield: st.shield, bob: Math.sin(time * 4 + i) * 0.7, dir: Math.cos(time * 0.3 + i) > 0 ? 1 : -1 });
    }
  }

  function drawActors() {
    const items = actors.slice().sort((a, b) => a.y - b.y);
    for (const a of items) {
      if (a.fade != null) ctx.globalAlpha = clamp(a.fade, 0, 1);
      if (a.prop) {
        if (a.kind === 'envoy') { horse(a.x, a.y, 1.5, '#3a2a1a', a.dir || -1, a.walk || 0, { body: '#d4cfc0', hat: 'turban', weapon: null }); const dir = a.dir || -1; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x + 8 * dir, a.y - 14); ctx.lineTo(a.x + 8 * dir, a.y - 54); ctx.stroke(); ctx.fillStyle = '#f5f2e8'; ctx.beginPath(); ctx.moveTo(a.x + 8 * dir, a.y - 54); for (let i = 0; i <= 5; i++) ctx.lineTo(a.x + 8 * dir + dir * i * 4.5, a.y - 54 + Math.sin(time * 6 + i) * 2); for (let i = 5; i >= 0; i--) ctx.lineTo(a.x + 8 * dir + dir * i * 4.5, a.y - 40 + Math.sin(time * 6 + i) * 2); ctx.fill(); }
        else if (a.kind === 'rider') horse(a.x, a.y, 1.5, '#5a3a22', a.dir || 1, time, { body: '#3b5e8c', hat: 'helm', weapon: 'spear' });
        else if (a.kind === 'cart') { const dir = a.dir || -1; ctx.save(); ctx.translate(a.x, a.y); ctx.scale(dir, 1); ctx.fillStyle = '#6a4a28'; ctx.fillRect(-18, -16, 36, 10); ctx.fillStyle = '#c6b27c'; ctx.fillRect(-14, -24, 28, 9); ctx.fillStyle = '#2a1a0e'; ctx.beginPath(); ctx.arc(-10, -4, 6, 0, TAU); ctx.arc(10, -4, 6, 0, TAU); ctx.fill(); ctx.restore(); horse(a.x + 30 * dir, a.y, 1.0, '#7a6a5a', dir, a.walk || 0, null); }
        else if (a.kind === 'refugee') { const st = a.c === 0 ? STYLE.civ : STYLE.civ2; fig(a.x, a.y, 1 + (a.y - 400) / 300, { body: a.c === 2 ? '#5a6a4a' : st.body, hat: a.c === 1 ? null : 'cap', dir: a.dir || -1, bob: Math.sin((a.walk || 0) * 8) * 1.2 }); }
      } else if (a.assault) {
        if (a.siege) { drawSiegeTower(a); }
        else if (a.state === 'wait' || a.state === 'gone') { /* hidden */ }
        else {
          const st = STYLE[a.kind] || STYLE.azab; const sc = 1.1 + (a.y - 400) / 300;
          let x = a.x, y = a.y; let alpha = 1;
          if (a.state === 'dead') alpha = 1 - a.die / 0.8;
          ctx.globalAlpha = alpha * (a.fade != null ? clamp(a.fade, 0, 1) : 1);
          if (a.ladder && (a.state === 'climb' || a.state === 'fight')) {
            const lx = a.tx, ly = a.ty; const topX = lx - 12, topY = WALL_TOP + 4;
            ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx - 3, ly); ctx.lineTo(topX - 3, topY); ctx.moveTo(lx + 3, ly); ctx.lineTo(topX + 3, topY); ctx.stroke();
            ctx.lineWidth = 1; for (let k = 1; k < 10; k++) { const f = k / 10; ctx.beginPath(); ctx.moveTo(lerp(lx - 3, topX - 3, f), lerp(ly, topY, f)); ctx.lineTo(lerp(lx + 3, topX + 3, f), lerp(ly, topY, f)); ctx.stroke(); }
            const f = a.state === 'climb' ? a.climb : 1;
            x = lerp(lx, topX, f); y = lerp(ly, topY + 14, f);
          } else if (a.state === 'top') { x = a.tx - 12; y = WALL_TOP + 8; }
          fig(x, y, a.state === 'climb' || a.state === 'top' ? 1.05 : sc, { body: st.body, hat: st.hat, weapon: a.ladder && a.state === 'run' ? 'ladder' : st.weapon, shield: st.shield, dir: a.state === 'run' ? -1 : -1, bob: Math.sin((a.walk || 0) * 10) * 1.2, anim: a.state === 'fight' ? Math.sin(time * 14) * 2 : 0 });
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawSiegeTower(a) {
    if (a.state === 'wait' && a.x >= 735) { /* idle at camp */ }
    const x = a.x, y = a.y;
    ctx.globalAlpha = a.fadeOut ? 0.6 : 1;
    ctx.fillStyle = '#5a3d20'; ctx.fillRect(x - 24, y - 120, 48, 120); ctx.fillStyle = '#3a2812';
    for (let k = 0; k < 4; k++) ctx.fillRect(x - 24, y - 110 + k * 28, 48, 3);
    ctx.fillStyle = '#7a1c1c'; ctx.fillRect(x - 26, y - 128, 52, 10);
    ctx.fillStyle = '#2a1a0e'; ctx.beginPath(); ctx.arc(x - 14, y, 8, 0, TAU); ctx.arc(x + 14, y, 8, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawProjectiles() {
    for (const p of proj) {
      const t = p.t, x = lerp(p.x0, p.x1, t), y = lerp(p.y0, p.y1, t) - Math.sin(t * Math.PI) * p.arc;
      if (p.kind === 'stone') { ctx.fillStyle = '#2a2622'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(p.x0, p.x1, Math.max(0, t - 0.08)), lerp(p.y0, p.y1, Math.max(0, t - 0.08)) - Math.sin(Math.max(0, t - 0.08) * Math.PI) * p.arc); ctx.stroke(); }
      else {
        const t2 = Math.max(0, t - 0.05), x2 = lerp(p.x0, p.x1, t2), y2 = lerp(p.y0, p.y1, t2) - Math.sin(t2 * Math.PI) * p.arc;
        ctx.strokeStyle = '#e6dcc2'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
      }
    }
  }

  function drawParts() {
    for (const p of parts) {
      const k = p.life / p.max;
      if (p.t === 'smoke') { ctx.fillStyle = `rgba(${V.__night ? 40 : 90},${V.__night ? 40 : 86},${V.__night ? 46 : 82},${0.2 * (1 - k) * (1 - k * 0.5)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); }
      else if (p.t === 'dust') { ctx.fillStyle = `rgba(150,128,96,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 + k), 0, TAU); ctx.fill(); }
      else if (p.t === 'debris') { ctx.fillStyle = `rgba(80,70,60,${1 - k})`; ctx.fillRect(p.x, p.y, p.s, p.s); }
      else if (p.t === 'spark') { ctx.fillStyle = `rgba(255,220,120,${1 - k})`; ctx.fillRect(p.x, p.y, 1.5, 1.5); }
    }
  }
  function drawFireParts(dark) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) if (p.t === 'fire') { const k = p.life / p.max; ctx.fillStyle = `rgba(255,${(150 - k * 90) | 0},40,${0.85 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - k * 0.5), 0, TAU); ctx.fill(); if (dark > 0.1) { ctx.fillStyle = `rgba(255,150,50,${0.02 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 5, 0, TAU); ctx.fill(); } }
    for (const f of flashes) { const k = f.t / f.max; const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r); g.addColorStop(0, `rgba(255,220,150,${0.9 * (1 - k)})`); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawBirds() {
    // ravens circle the field; their number follows the dead
    const n = clamp(Math.round((V.deaths || 0) / 3), 0, D.crows.length);
    ctx.fillStyle = '#0d0a08';
    for (let i = 0; i < n; i++) { const c = D.crows[i]; const a = time * c.sp + c.p; const x = c.cx + Math.cos(a) * c.r, y = c.cy + Math.sin(a * 1.3) * c.r * 0.25 - 40; const fl = Math.sin(time * 9 + i) * 3; ctx.beginPath(); ctx.moveTo(x - 5, y + fl); ctx.lineTo(x, y); ctx.lineTo(x + 5, y + fl); ctx.lineWidth = 1.5; ctx.strokeStyle = '#0d0a08'; ctx.stroke(); }
    // distant birds by day
    if (V.__sunH > 0.2) for (let i = 0; i < 4; i++) { const x = ((time * 20 + i * 330) % (W + 100)) - 50, y = 120 + i * 30 + Math.sin(time + i) * 8; const fl = Math.sin(time * 6 + i) * 2.5; ctx.strokeStyle = 'rgba(30,30,40,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 4, y + fl); ctx.lineTo(x, y); ctx.lineTo(x + 4, y + fl); ctx.stroke(); }
  }

  function drawWeather(dt) {
    if (V.fog > 0.02) {
      for (let k = 0; k < 4; k++) { const y = 300 + k * 60; const g = ctx.createLinearGradient(0, y - 40, 0, y + 50); g.addColorStop(0, 'rgba(200,205,215,0)'); g.addColorStop(0.5, `rgba(200,205,215,${0.28 * V.fog})`); g.addColorStop(1, 'rgba(200,205,215,0)'); ctx.fillStyle = g; ctx.save(); ctx.translate(Math.sin(time * 0.1 + k) * 40, 0); ctx.fillRect(-60, y - 40, W + 120, 90); ctx.restore(); }
    }
    if (V.wx > 0.05) {
      ctx.strokeStyle = `rgba(190,205,225,${0.35 * V.wx})`; ctx.lineWidth = 1; ctx.beginPath();
      for (const d of D.rain) { d.y += d.v * dt; d.x -= 80 * dt; if (d.y > H) { d.y = -10; d.x = Math.random() * (W + 100); } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y - 11); }
      ctx.stroke();
    }
    if (lightning > 0) { ctx.fillStyle = `rgba(230,235,255,${lightning * 0.55})`; ctx.fillRect(0, 0, W, H); }
  }

  function drawDarkness(dark) {
    if (dark < 0.01) return;
    ctx.fillStyle = `rgba(8,12,40,${dark})`; ctx.fillRect(0, 0, W, H);
  }

  function drawLights(dark) {
    if (dark < 0.08) return;
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(255,170,70,${a})`); g.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    const k = dark / 0.62;
    for (let x = 140; x < 760; x += 56) glow(x + Math.sin(time * 7 + x) * 0.6, WALL_TOP - 12, 38, 0.35 * k);
    for (const [wx, wy] of [[319, 157], [367, 157], [343, 197], [468, 220], [232, 224]]) glow(wx, wy, 26, 0.55 * k);
    glow(515, GROUND - 24, 40, 0.3 * k);
    const count = clamp(Math.round(V.tents), 6, D.tents.length);
    for (let i = 0; i < Math.min(8, (D.tentsDrawn || []).length / 3 | 0); i++) { const t = D.tentsDrawn[i * 3]; glow(t.x + 26, t.y + 4, 46 + Math.sin(time * 8 + i) * 3, 0.6 * k); }
    for (let i = 0; i < (D.tentsDrawn || []).length; i += 2) { const t = D.tentsDrawn[i]; glow(t.x, t.y - 8, 24, 0.22 * k); }
    for (const h of D.houses) if (V.villageBurn < h.burn) glow(h.x + 6, h.y - 14, 16, 0.5 * k);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- overlay: labels, intel, selection ---------- */
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawOverlay() {
    if (S.mode !== 'game' || !S.showLabels) return;
    ctx.save();
    // intel arrows
    if (S.intel && !anim) {
      for (const sec of SECTORS) {
        const w = S.intel.weights[sec]; if (w < 0.05) continue;
        const cx = (SX[sec][0] + SX[sec][1]) / 2, sx = 800, sy = 452;
        const ty = sec === 'gate' ? GROUND + 12 : sec === 'cliff' ? GROUND + 40 : GROUND + 28;
        const th = clamp(w * 14, 2, 8);
        ctx.strokeStyle = `rgba(214,70,50,${S.intel.exact ? 0.7 : 0.4})`; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = th; ctx.setLineDash(S.intel.exact ? [] : [10, 8]); ctx.lineCap = 'round';
        const off = (time * 24) % 18;
        ctx.lineDashOffset = -off;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + cx) / 2, 470 - w * 30, cx + 20, ty + 24); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(cx + 10, ty + 8); ctx.lineTo(cx + 34, ty + 24); ctx.lineTo(cx + 8, ty + 30); ctx.closePath(); ctx.fill();
      }
    }
    for (const sec of SECTORS) {
      const [x0, x1] = SX[sec]; const cx = (x0 + x1) / 2;
      const hot = S.hover === sec, sel = S.selected === sec;
      if (hot || sel) {
        ctx.fillStyle = sel ? 'rgba(232,190,90,.16)' : 'rgba(255,255,255,.09)'; ctx.fillRect(x0, 160, x1 - x0, 238);
        ctx.strokeStyle = sel ? 'rgba(232,190,90,.95)' : 'rgba(255,255,255,.5)'; ctx.lineWidth = sel ? 2 : 1;
        ctx.strokeRect(x0 + 1, 162, x1 - x0 - 2, 234);
      }
      const hp = Math.round(T ? T.walls[sec] : V.walls[sec]);
      const g = V.garrison[sec]; const nU = g ? g.spear + g.archer + g.militia : 0;
      const pw = 124, ph = 44, px = cx - pw / 2, py = sec === 'gate' ? 346 : 346;
      ctx.fillStyle = 'rgba(16,12,8,.72)'; roundRect(px, py, pw, ph, 6); ctx.fill();
      ctx.strokeStyle = sel ? '#e8be5a' : 'rgba(120,100,70,.8)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = sel ? '#f2d386' : '#e6d9bd'; ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'left'; ctx.fillText(NAMES[sec], px + 8, py + 15);
      ctx.fillStyle = '#2b2118'; ctx.fillRect(px + 8, py + 22, pw - 16, 6);
      ctx.fillStyle = hp > 55 ? '#7fa65a' : hp > 28 ? '#d09a3a' : '#c1493a'; ctx.fillRect(px + 8, py + 22, (pw - 16) * hp / 100, 6);
      ctx.fillStyle = '#b9a98a'; ctx.font = '10px Georgia, serif'; ctx.fillText(`🧱 ${hp}   ⚔ ${nU}   🛠 ${V.fort[sec]}`, px + 8, py + 40);
    }
    ctx.restore();
  }

  /* ---------- main loop ---------- */
  function update(dt) {
    time += dt;
    // time of day
    const diff = clockTarget - clock; clock += Math.sign(diff) * Math.min(Math.abs(diff), Math.max(0.025 * dt * 60 * 0.4, Math.abs(diff) * dt * 1.4));
    // ease view toward target
    if (T) {
      for (const sec of SECTORS) {
        const d = T.walls[sec] - V.walls[sec]; V.walls[sec] += Math.sign(d) * Math.min(Math.abs(d), 22 * dt);
        V.fort[sec] = T.fort[sec];
        V.garrison[sec] = T.garrison[sec];
      }
      V.tents = lerp(V.tents, T.tents, Math.min(1, dt * 1.5)); V.bombards = T.bombards;
      V.villageBurn = lerp(V.villageBurn, T.villageBurn, Math.min(1, dt * 0.8)); V.deaths = T.deaths; V.morale = lerp(V.morale, T.morale, Math.min(1, dt * 2));
      V.day = T.day;
      const wx = T.weather === 'rain' ? 0.8 : T.weather === 'storm' ? 1 : 0, fg = T.weather === 'fog' ? 1 : 0;
      V.wx = lerp(V.wx || 0, wx, Math.min(1, dt * 0.8)); V.fog = lerp(V.fog || 0, fg, Math.min(1, dt * 0.8));
    }
    if (T && T.weather === 'storm') { nextBolt -= dt; if (nextBolt <= 0) { lightning = 1; nextBolt = 5 + Math.random() * 9; if (Scene.onSound) Scene.onSound('thunder'); } }
    lightning = Math.max(0, lightning - dt * 3);
    shake = Math.max(0, shake - dt * 14);
    updateParts(dt); updateProj(dt); updateProps(dt); updateAssault(dt);
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t >= flashes[i].max) flashes.splice(i, 1); }
  }

  function frame(dtRaw) {
    const dt = Math.min(0.05, dtRaw);
    if (!V) { return; }
    update(dt);
    const tod = ((clock % 1) + 1) % 1;
    const sunH = Math.sin((tod - 0.25) * TAU);
    V.__sunH = sunH; V.__night = sunH < 0.05;
    const dark = clamp(0.62 * (1 - smooth(-0.22, 0.28, sunH)), 0, 0.62) + (V.wx > 0 ? V.wx * 0.1 : 0) + (V.fog || 0) * 0.05;
    ctx.save();
    if (shake > 0.1) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    const bot = drawSky(tod, sunH);
    drawMountains(bot);
    drawBackForest();
    drawCastle();
    drawGround();
    drawVillage();
    drawCamp();
    drawActors();
    drawProjectiles();
    drawParts();
    drawBirds();
    drawFireParts(dark);
    drawWeather(dt);
    drawDarkness(dark);
    drawLights(dark);
    ctx.restore();
    drawOverlay();
  }

  function loop(ts) {
    if (!running) return;
    const dt = (ts - tPrev) / 1000; tPrev = ts;
    try { frame(isFinite(dt) ? dt : 0.016); } catch (e) { console.error(e); }
    requestAnimationFrame(loop);
  }

  root.Scene = Scene;
})(window);
