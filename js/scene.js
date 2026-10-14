/* Oblique (3/4 top-down) procedural renderer of Neamț Fortress, its valley and the Ottoman siege camp.
   Layout follows the historical plan: irregular quadrilateral Mușatin fort with corner towers and buttressed walls,
   Mușatin Gate in the wall facing the camera, a dry ditch crossed by an arched bridge, and Stephen's outer belt
   with four semicircular bastions. Optional images in assets/ override textures and sprites (see docs/ASSET_GUIDE.md). */
(function (root) {
  'use strict';
  const W = 1600, H = 900, TAU = Math.PI * 2;
  const SECTORS = ['cliff', 'curtain', 'gate', 'east'];
  const NAMES = { cliff: 'West Cliff Wall', curtain: 'Outer Bastions', gate: 'Mușatin Gate', east: 'East Wall' };

  /* ---------- geometry (ground coordinates are screen coordinates; heights lift upward) ---------- */
  const F = { x0: 650, x1: 950, yb: 250, yf: 440, t: 14, h: 78 };      // inner Mușatin fort
  const O = { x0: 610, x1: 990, y: 520, t: 12, h: 64 };                // Stephen's outer wall
  const BAST = [650, 725, 875, 950], BR = 30, BH = 80;                 // four semicircular bastions
  const GX = 800;                                                       // gate axis
  const DITCH = { y0: 532, y1: 566 };
  const REG = { gate: [762, 330, 838, 640], curtain: [596, 440, 1004, 600], east: [920, 150, 1090, 520], cliff: [540, 150, 680, 520] };
  const LABEL = { cliff: [520, 300], curtain: [615, 635], gate: [800, 705], east: [1112, 300] };
  const WALK = {
    cliff: [[[657, 196], [657, 344]]],
    east: [[[943, 196], [943, 344]]],
    curtain: [[[628, 452], [756, 452]], [[844, 452], [972, 452]]],
    gate: [[[782, 418], [818, 418]], [[790, 344], [810, 344]]]
  };

  /* ---------- utils ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mixc(c1, c2, t) { const a = hex(c1), b = hex(c2); return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`; }
  const rr = (r, a, b) => a + r() * (b - a);
  let ctx;                                  // current drawing context (main or an offscreen layer)

  /* ---------- optional assets ---------- */
  const Assets = { tex: {}, spr: {} };
  let staticDirty = true, castleDirty = true;
  function loadImg(url, cb) { const i = new Image(); i.onload = () => cb(i); i.onerror = () => {}; i.src = url; }
  function keyOut(img) {
    try {
      const c = mk(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2];
        if (r > 170 && b > 170 && g < 110) p[i + 3] = 0; else if (r > 140 && b > 140 && r - g > 60 && b - g > 60) p[i + 3] = Math.max(0, p[i + 3] - 170); }
      x.putImageData(d, 0, 0);
      let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) if (p[(yy * c.width + xx) * 4 + 3] > 24) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      if (x1 <= x0 || y1 <= y0) return c;
      const o = mk(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o;
    } catch (e) { return img; }
  }
  ['grass', 'dirt', 'rock', 'stone', 'shingle', 'wood'].forEach(n => loadImg(`assets/img/tex/${n}.jpg`, img => { Assets.tex[n] = img; staticDirty = castleDirty = true; }));
  ['tent_red', 'tent_white', 'pavilion', 'bombard', 'siege_tower', 'house_a', 'house_b', 'church'].forEach(n => loadImg(`assets/img/sprites/${n}.png`, img => { Assets.spr[n] = keyOut(img); }));
  const pat = n => Assets.tex[n] ? ctx.createPattern(Assets.tex[n], 'repeat') : null;
  function sprite(name, x, y, w) { const s = Assets.spr[name]; if (!s) return false; const h = w * s.height / s.width; ctx.drawImage(s, x - w / 2, y - h, w, h); return true; }

  /* ---------- state ---------- */
  let cv, mctx, dpr = 1, running = false, tPrev = 0, time = 0;
  const S = { mode: 'game', hover: null, selected: null, fast: false, intel: null, showLabels: true };
  let V = null, T = null;
  let clock = 0.27, clockTarget = 0.27;
  const parts = [], proj = [], actors = [], bodies = [], flashes = [];
  let anim = null, shake = 0, lightning = 0, nextBolt = 8;
  const D = {};
  let layers = null, terrain = null, lastKey = '';

  /* ---------- drawing primitives ---------- */
  function stoneFace(x0, x1, yb, h, o) {
    o = o || {};
    const g = ctx.createLinearGradient(0, yb - h, 0, yb);
    g.addColorStop(0, o.top || '#aaa294'); g.addColorStop(1, o.bot || '#6d675b');
    ctx.fillStyle = g; ctx.fillRect(x0, yb - h, x1 - x0, h);
    const p = pat('stone'); if (p) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = p; ctx.fillRect(x0, yb - h, x1 - x0, h); ctx.restore(); }
    ctx.strokeStyle = 'rgba(35,29,22,.26)'; ctx.lineWidth = 1;
    let row = 0;
    for (let y = yb - h + 8; y < yb; y += 9, row++) {
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      for (let x = x0 + (row % 2 ? 8 : 0); x < x1; x += 17) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 9); ctx.stroke(); }
    }
    const sh = ctx.createLinearGradient(x0, 0, x1, 0); sh.addColorStop(0, 'rgba(255,240,210,.10)'); sh.addColorStop(1, 'rgba(0,0,0,.14)');
    ctx.fillStyle = sh; ctx.fillRect(x0, yb - h, x1 - x0, h);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x0, yb - 2, x1 - x0, 2);
  }
  function topSurface(x0, x1, yTop, t, col) { ctx.fillStyle = col || '#8a8375'; ctx.fillRect(x0, yTop - t, x1 - x0, t); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x0, yTop - t, x1 - x0, 1.5); }
  function merlons(x0, x1, yTop, skip) {
    for (let x = x0 + 1; x < x1 - 8; x += 17) {
      if (skip && skip(x)) continue;
      ctx.fillStyle = '#b3ab9c'; ctx.fillRect(x, yTop - 8, 10, 8); ctx.fillStyle = '#d0c8b8'; ctx.fillRect(x, yTop - 8, 10, 2); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + 8, yTop - 8, 2, 8);
    }
  }
  function slits(x0, x1, yb, h, step) {
    ctx.fillStyle = '#1c1611';
    for (let x = x0 + step / 2; x < x1 - 4; x += step) ctx.fillRect(x, yb - h * 0.55, 2.5, 10);
  }
  function buttresses(x0, x1, yb, h, step) {
    for (let x = x0 + step / 2; x < x1 - 6; x += step) {
      const g = ctx.createLinearGradient(x, 0, x + 9, 0); g.addColorStop(0, '#b7af9f'); g.addColorStop(1, '#7c7568');
      ctx.fillStyle = g; ctx.fillRect(x, yb - h * 0.78, 9, h * 0.78); ctx.fillStyle = '#c4bcac'; ctx.beginPath(); ctx.moveTo(x - 1, yb - h * 0.78); ctx.lineTo(x + 10, yb - h * 0.78); ctx.lineTo(x + 9, yb - h * 0.78 - 5); ctx.lineTo(x, yb - h * 0.78 - 5); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, yb - 3, 9, 3);
    }
  }
  function shingles(x0, x1, y0, y1, c1, c2, ridgeY) {
    // front roof slope: trapezoid between eave (y1) and ridge (y0)
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 3, y1 + 1); ctx.lineTo(x1 + 3, y1 + 1); ctx.lineTo(x1, y0); ctx.lineTo(x0, y0); ctx.closePath(); ctx.fill();
    const p = pat('shingle'); if (p) { ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = p; ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1;
    for (let y = y0 + 4; y < y1; y += 4) { ctx.beginPath(); ctx.moveTo(x0 - 3 * (y - y0) / (y1 - y0), y); ctx.lineTo(x1 + 3 * (y - y0) / (y1 - y0), y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x0 - 3, y1, x1 - x0 + 6, 2);
    if (ridgeY != null) { ctx.fillStyle = 'rgba(40,24,16,.7)'; ctx.fillRect(x0, y0 - 2, x1 - x0, 3); }
  }
  function house(x0, x1, yb, h, d, rise, wall, roof1, roof2, opts) {
    opts = opts || {};
    const g = ctx.createLinearGradient(0, yb - h, 0, yb); g.addColorStop(0, wall); g.addColorStop(1, mixc('#' + wall.slice(1, 7), '#2a2018', 0.35));
    ctx.fillStyle = g; ctx.fillRect(x0, yb - h, x1 - x0, h);
    if (opts.timber) { ctx.strokeStyle = 'rgba(40,26,14,.55)'; ctx.lineWidth = 1.2; for (let x = x0 + 4; x < x1; x += 9) { ctx.beginPath(); ctx.moveTo(x, yb - h); ctx.lineTo(x, yb); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x0, yb - 2, x1 - x0, 2);
    ctx.fillStyle = '#2a1d12'; const dw = Math.min(8, (x1 - x0) / 4); ctx.fillRect((x0 + x1) / 2 - dw / 2, yb - h * 0.6, dw, h * 0.6);
    if (opts.win !== false) { ctx.fillStyle = '#1a130d'; ctx.fillRect(x0 + 5, yb - h * 0.72, 5, 5); ctx.fillRect(x1 - 10, yb - h * 0.72, 5, 5); }
    const ridge = yb - h - d / 2 - rise;
    ctx.fillStyle = roof2; ctx.fillRect(x0 - 3, ridge - 1, x1 - x0 + 6, d * 0.5 + 1);       // back slope sliver
    shingles(x0, x1, ridge, yb - h, roof1, roof2, ridge);
    return ridge;
  }
  function tower(cx, yb, w, d, h, roofH, roofCols) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    stoneFace(x0, x1, yb, h, { top: '#b0a899', bot: '#6a6459' });
    ctx.fillStyle = '#1a140f'; ctx.fillRect(cx - 2, yb - h * 0.7, 4, 14); ctx.fillRect(cx - 2, yb - h * 0.34, 4, 12);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x1 - 5, yb - h, 5, h);
    ctx.fillStyle = '#a89f90'; ctx.fillRect(x0 - 3, yb - h - 4, w + 6, 5);                    // machicolation course
    topSurface(x0 - 3, x1 + 3, yb - h - 4, d, '#8d8678');
    const apex = yb - h - d / 2 - roofH;
    const c1 = roofCols ? roofCols[0] : '#7b4a38', c2 = roofCols ? roofCols[1] : '#4e2c20';
    const gl = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); gl.addColorStop(0, c1); gl.addColorStop(1, c2);
    ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(x0 - 7, yb - h - 3); ctx.lineTo(x1 + 7, yb - h - 3); ctx.lineTo(cx, apex); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
    for (let k = 1; k < 7; k++) { const t = k / 7, y = lerp(yb - h - 3, apex, t), hw = (w / 2 + 7) * (1 - t); ctx.beginPath(); ctx.moveTo(cx - hw, y); ctx.lineTo(cx + hw, y); ctx.stroke(); }
    ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, apex); ctx.lineTo(cx, apex - 9); ctx.stroke();
    ctx.fillStyle = '#d6b050'; ctx.beginPath(); ctx.arc(cx, apex - 10, 2.2, 0, TAU); ctx.fill();
  }
  function cyl(cx, cy, r, h, o) {
    o = o || {}; const ry = r * 0.52;
    const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, '#b4ac9d'); g.addColorStop(0.45, '#928b7d'); g.addColorStop(1, '#5b564c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - r, cy - h); ctx.lineTo(cx - r, cy); ctx.ellipse(cx, cy, r, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + r, cy - h); ctx.ellipse(cx, cy - h, r, ry, 0, 0, Math.PI, false); ctx.closePath(); ctx.fill();
    const p = pat('stone'); if (p) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = p; ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = 'rgba(30,25,20,.25)'; ctx.lineWidth = 1;
    for (let y = cy - h + 9; y < cy + ry - 2; y += 9) { ctx.beginPath(); ctx.ellipse(cx, y, r, ry, 0, 0.05, Math.PI - 0.05); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#847d6f'; ctx.beginPath(); ctx.ellipse(cx, cy - h, r, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a6458'; ctx.beginPath(); ctx.ellipse(cx, cy - h, r - 5, ry - 3, 0, 0, TAU); ctx.fill();
    for (let a = 0.15; a < Math.PI - 0.1; a += 0.32) { const mx = cx + Math.cos(a) * (r - 1), my = cy - h + Math.sin(a) * (ry - 1); ctx.fillStyle = '#bdb5a5'; ctx.fillRect(mx - 3, my - 6, 6, 6); ctx.fillStyle = '#d6cebe'; ctx.fillRect(mx - 3, my - 6, 6, 1.5); }
    ctx.fillStyle = '#1b150f'; ctx.fillRect(cx - 1.5, cy - h * 0.55, 3, 11);
  }
  function notch(xc, yTop, w, depth, onFace) {
    ctx.fillStyle = '#231b14'; ctx.beginPath(); ctx.moveTo(xc - w / 2, yTop - 10); ctx.lineTo(xc - w / 2 + 3, yTop + depth * 0.5); ctx.lineTo(xc - w * 0.15, yTop + depth); ctx.lineTo(xc + w * 0.1, yTop + depth * 0.6); ctx.lineTo(xc + w / 2 - 2, yTop + depth * 0.85); ctx.lineTo(xc + w / 2, yTop - 10); ctx.closePath(); ctx.fill();
    if (onFace) { ctx.strokeStyle = 'rgba(20,14,10,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xc - 6, yTop + depth); ctx.lineTo(xc + 2, yTop + depth + 16); ctx.lineTo(xc - 3, yTop + depth + 30); ctx.stroke(); }
  }
  function rubble(x, y, w) {
    for (let i = 0; i < 8; i++) { const q = rng(Math.round(x) * 7 + i * 13); ctx.fillStyle = q() < 0.5 ? '#6f685c' : '#554f45'; ctx.fillRect(x + (q() - 0.5) * w, y + q() * 7, 3 + q() * 5, 3 + q() * 3); }
  }

  /* damage notches along a sector's wall-walk line (deterministic) */
  function breaks(sec, hp) {
    const n = hp > 78 ? 0 : hp > 58 ? 1 : hp > 40 ? 2 : hp > 24 ? 3 : 4;
    const q = rng(sec.length * 911 + 17), out = [];
    const fr = [0.3, 0.66, 0.5, 0.84];
    for (let i = 0; i < n; i++) out.push({ f: clamp(fr[i] + (q() - 0.5) * 0.1, 0.08, 0.92), w: 22 + (1 - hp / 100) * 26, d: 12 + (1 - hp / 100) * 36 });
    return out;
  }
  function walkPoint(sec, f) {
    const segs = WALK[sec]; let total = 0; const L = segs.map(s => { const l = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]); total += l; return l; });
    let d = f * total;
    for (let i = 0; i < segs.length; i++) { if (d <= L[i] || i === segs.length - 1) { const t = clamp(d / L[i], 0, 1); return [lerp(segs[i][0][0], segs[i][1][0], t), lerp(segs[i][0][1], segs[i][1][1], t)]; } d -= L[i]; }
  }
  function damagePoints(sec) { return breaks(sec, V.walls[sec]).map(b => walkPoint(sec, b.f)); }

  /* ---------- decor ---------- */
  function buildDecor() {
    const r = rng(1476);
    D.river = [[470, -20], [488, 160], [520, 330], [500, 520], [440, 660], [330, 760], [260, 930]];
    D.roads = [
      [[250, 740], [350, 730], [450, 708], [580, 690], [700, 662], [800, 620]],
      [[800, 620], [930, 650], [1060, 660], [1160, 640]],
      [[800, 620], [800, 566]]
    ];
    D.fields = [];
    for (let i = 0; i < 9; i++) D.fields.push({ x: 120 + i * 30, y: 560, w: 24, h: 120, burn: (i + 1) / 10 });
    D.houses = [];
    for (let i = 0; i < 12; i++) D.houses.push({ x: 60 + (i % 6) * 62 + rr(r, -8, 8), y: 770 + Math.floor(i / 6) * 70 + rr(r, -8, 8), w: 40 + rr(r, 0, 14), h: 22 + rr(r, 0, 5), burn: (i + 1) / 13, kind: r() < 0.5 ? 'house_a' : 'house_b' });
    D.houses.push({ x: 290, y: 800, w: 56, h: 34, burn: 0.99, kind: 'church', church: true });
    D.tents = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 8; col++) {
      const x = 1180 + col * 52 + (row % 2) * 24 + rr(r, -8, 8), y = 470 + row * 52 + rr(r, -8, 8);
      if (x > 1560 || (x > 1330 && x < 1470 && y > 470 && y < 590)) continue;
      D.tents.push({ x, y, w: 36 + rr(r, 0, 14), c: r() < 0.45 ? 0 : r() < 0.7 ? 1 : 2, order: r() });
    }
    D.gabions = [[1070, 500], [1100, 585], [1060, 650]];
    D.stars = null;
    D.clouds = Array.from({ length: 7 }, () => ({ x: r() * W, y: r() * H, s: 120 + r() * 160, v: 4 + r() * 8 }));
    D.crows = Array.from({ length: 36 }, () => ({ cx: 900 + Math.random() * 360, cy: 560 + Math.random() * 180, r: 40 + Math.random() * 90, sp: 0.3 + Math.random() * 0.6, p: Math.random() * TAU }));
    D.rain = Array.from({ length: 300 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 700 + Math.random() * 300 }));
    D.hay = Array.from({ length: 60 }, () => ({ x: rr(r, 140, 420), y: rr(r, 570, 690) }));
  }

  function nearPath(x, y, pts, d) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const dx = x1 - x0, dy = y1 - y0; const t = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      if (Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) < d) return true;
    }
    return false;
  }
  function blocked(x, y) {
    if (x > 520 && x < 1050 && y > 120 && y < 700) return true;
    if (x > 1090 && y > 430) return true;
    if (x < 480 && y > 520) return true;
    if (x > 1030 && x < 1150 && y > 440 && y < 700) return true;
    if (nearPath(x, y, D.river, 50)) return true;
    for (const rd of D.roads) if (nearPath(x, y, rd, 26)) return true;
    return false;
  }

  /* ---------- static terrain ---------- */
  function tree(x, y, kind, s, c) {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x + 6 * s, y + 3 * s, 11 * s, 5 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 1.6 * s, y - 8 * s, 3.2 * s, 9 * s);
    if (kind === 0) {   // beech / oak canopy
      const base = mixc('#2f5a2a', '#58803a', c), hi = mixc('#4a7a36', '#8aaa4a', c);
      ctx.fillStyle = base; ctx.beginPath(); ctx.arc(x, y - 17 * s, 11 * s, 0, TAU); ctx.arc(x - 8 * s, y - 12 * s, 8 * s, 0, TAU); ctx.arc(x + 8 * s, y - 12 * s, 8 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(x - 3 * s, y - 21 * s, 7 * s, 0, TAU); ctx.fill();
    } else {            // spruce
      for (let k = 0; k < 3; k++) {
        const yy = y - 6 * s - k * 9 * s, w = (15 - k * 4) * s;
        ctx.fillStyle = mixc('#1f4a30', '#2f6a3c', c * 0.8 + k * 0.1); ctx.beginPath(); ctx.moveTo(x, yy - 14 * s); ctx.lineTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(x, yy - 14 * s); ctx.lineTo(x - w, yy); ctx.lineTo(x - w * 0.2, yy); ctx.fill();
      }
    }
  }
  function curve(pts, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke();
  }

  function buildTerrain() {
    terrain = terrain || mk(W, H); const c = terrain.getContext('2d'); ctx = c; c.clearRect(0, 0, W, H);
    const r = rng(99);
    let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#42603a'); g.addColorStop(0.35, '#58763e'); g.addColorStop(1, '#7a8c48');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const gp = pat('grass'); if (gp) { c.save(); c.globalAlpha = 0.5; c.fillStyle = gp; c.fillRect(0, 0, W, H); c.restore(); }
    const pal = ['#6d8a45', '#5b7a3c', '#8a9a52', '#7b8b48', '#697f3f', '#9aa05a', '#6a7a3a'];
    for (let i = 0; i < 1300; i++) { c.fillStyle = pal[(r() * pal.length) | 0]; c.globalAlpha = 0.22 + r() * 0.2; c.beginPath(); c.ellipse(r() * W, r() * H, 14 + r() * 60, 8 + r() * 30, r() * 3, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    // far Carpathian ridges
    const ridge = (base, amp, col, seed, a) => { const q = rng(seed); c.fillStyle = col; c.globalAlpha = a; c.beginPath(); c.moveTo(-10, 0); for (let x = -10; x <= W + 20; x += 30) c.lineTo(x, base + Math.sin(x * 0.005 + seed) * amp + q() * amp * 0.5); c.lineTo(W + 10, 0); c.closePath(); c.fill(); c.globalAlpha = 1; };
    ridge(70, 26, '#4f6a5c', 3, 0.95); ridge(46, 20, '#3f5f4c', 8, 0.97); ridge(26, 14, '#2f4f3e', 12, 1);
    const hz = c.createLinearGradient(0, 0, 0, 170); hz.addColorStop(0, 'rgba(190,205,215,.12)'); hz.addColorStop(1, 'rgba(200,215,225,0)'); c.fillStyle = hz; c.fillRect(0, 0, W, 170);
    // soft dirt patches: battlefield and camp ground
    const soft = (cx, cy, rx, ry, a) => { c.save(); c.translate(cx, cy); c.scale(1, ry / rx); const g = c.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx); g.addColorStop(0, `rgba(128,102,66,${a})`); g.addColorStop(0.7, `rgba(120,96,62,${a * 0.6})`); g.addColorStop(1, 'rgba(120,96,62,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore(); };
    soft(900, 690, 300, 90, 0.5); soft(1370, 640, 270, 230, 0.55); soft(1050, 560, 90, 150, 0.4);
    const dp = pat('dirt'); if (dp) { c.save(); c.globalAlpha = 0.3; c.fillStyle = dp; c.beginPath(); c.ellipse(1370, 640, 230, 200, 0, 0, TAU); c.fill(); c.restore(); }
    // fields (strips)
    for (const f of D.fields) { c.fillStyle = (f.burn * 10) % 2 < 1 ? '#bfa243' : '#8aa04a'; c.fillRect(f.x, f.y, f.w, f.h); c.fillStyle = 'rgba(80,60,20,.25)'; for (let y = f.y; y < f.y + f.h; y += 6) c.fillRect(f.x, y, f.w, 1); }
    // river + banks
    curve(D.river, 62, '#5a6a45'); curve(D.river, 50, '#4a7f92'); curve(D.river, 30, '#5e97aa');
    // roads
    for (const rd of D.roads) { curve(rd, 28, 'rgba(70,52,30,.5)'); curve(rd, 22, '#9a8458'); curve(rd, 12, '#b09a6c'); }
    // wooden bridge over river
    c.fillStyle = '#5a4126'; c.fillRect(420, 690, 76, 34); c.fillStyle = '#7a5a36'; for (let x = 422; x < 494; x += 6) c.fillRect(x, 692, 4, 30);
    // trees
    const trees = []; const tr = rng(555);
    for (let i = 0; i < 4200; i++) {
      const x = tr() * W, y = 36 + tr() * (H - 56);
      let dens = 0.05;
      if (y < 300) dens = 0.9; else if (x < 420 && y < 560) dens = 0.75; else if (x > 1000 && y < 440) dens = 0.8; else if (x > 1550) dens = 0.6; else if (y > 700 && x > 520 && x < 1100) dens = 0.07;
      if (y < 130 && x > 560 && x < 1040) dens = 0.95;
      if (tr() > dens || blocked(x, y)) continue;
      trees.push({ x, y, k: tr() < (y < 300 ? 0.55 : 0.4) ? 1 : 0, c: tr(), s: 0.7 + (y / H) * 0.55 + tr() * 0.2 });
    }
    trees.sort((a, b) => a.y - b.y); for (const t of trees) tree(t.x, t.y, t.k, t.s, t.c);
    // wildflower / grass tufts
    c.fillStyle = 'rgba(40,60,25,.5)'; for (let i = 0; i < 500; i++) { const x = tr() * W, y = 140 + tr() * (H - 160); if (blocked(x, y)) continue; c.fillRect(x, y, 1.4, 4); c.fillRect(x + 2, y + 1, 1.4, 3); }
    staticDirty = false;
  }

  /* ---------- castle layers ---------- */
  function renderCastle() {
    if (!layers) layers = { back: mk(W, H), inner: mk(W, H), outer: mk(W, H) };
    for (const k in layers) { layers[k].getContext('2d').clearRect(0, 0, W, H); }
    const hpC = V.walls.curtain, hpG = V.walls.gate, hpE = V.walls.east, hpW = V.walls.cliff, fort = V.fort;

    /* ===== BACK: plateau, ditch, bridge, courtyard, back wall & towers, buildings, side walls ===== */
    ctx = layers.back.getContext('2d');
    // rock skirt (steep west cliff, rocky east slope, earthen glacis in front)
    const rockG = ctx.createLinearGradient(560, 0, 1040, 0); rockG.addColorStop(0, '#5e5447'); rockG.addColorStop(0.5, '#756a5a'); rockG.addColorStop(1, '#64594a');
    ctx.fillStyle = rockG; ctx.beginPath(); ctx.moveTo(548, 235); ctx.quadraticCurveTo(540, 380, 560, 560); ctx.lineTo(1040, 575); ctx.quadraticCurveTo(1060, 380, 1040, 220); ctx.lineTo(980, 170); ctx.lineTo(620, 170); ctx.closePath(); ctx.fill();
    const rp = pat('rock'); if (rp) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = rp; ctx.fill(); ctx.restore(); }
    // cliff striations & boulders on west/east flanks
    const q = rng(31); ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 70; i++) { const west = q() < 0.55; const x = west ? rr(q, 548, 640) : rr(q, 960, 1048), y = rr(q, 200, 560); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rr(q, 8, 22), y + rr(q, -3, 3)); ctx.lineTo(x + rr(q, 4, 14), y + rr(q, 5, 12)); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,240,210,.08)'; for (let i = 0; i < 40; i++) { const x = rr(q, 550, 640), y = rr(q, 200, 560); ctx.fillRect(x, y, rr(q, 6, 16), 2); }
    // grassy plateau top
    const pg = ctx.createLinearGradient(0, 180, 0, 560); pg.addColorStop(0, '#6f8444'); pg.addColorStop(1, '#8a9650');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(592, 232); ctx.quadraticCurveTo(586, 390, 596, 546); ctx.lineTo(1004, 546); ctx.quadraticCurveTo(1012, 390, 1006, 226); ctx.lineTo(960, 190); ctx.lineTo(640, 190); ctx.closePath(); ctx.fill();
    // glacis slope to the plain
    const gl = ctx.createLinearGradient(0, 566, 0, 700); gl.addColorStop(0, 'rgba(98,84,58,.0)'); gl.addColorStop(1, 'rgba(98,84,58,.0)');
    // ditch (dry, stone-lined counterscarp)
    ctx.fillStyle = '#2d241a'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(592, DITCH.y0, 414, DITCH.y1 - DITCH.y0, 8) : ctx.rect(592, DITCH.y0, 414, DITCH.y1 - DITCH.y0); ctx.fill();
    const ditchG = ctx.createLinearGradient(0, DITCH.y0, 0, DITCH.y1); ditchG.addColorStop(0, 'rgba(0,0,0,.55)'); ditchG.addColorStop(1, 'rgba(70,56,38,.5)'); ctx.fillStyle = ditchG; ctx.fillRect(592, DITCH.y0, 414, DITCH.y1 - DITCH.y0);
    ctx.fillStyle = '#7b7365'; ctx.fillRect(592, DITCH.y1, 414, 5); ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let x = 592; x < 1006; x += 14) ctx.fillRect(x, DITCH.y1, 1, 5);
    for (let x = 604; x < 996; x += 22) { ctx.fillStyle = '#5a4630'; ctx.fillRect(x, DITCH.y0 + 18 + ((x * 7) % 9), 8, 2); }
    if (fort.curtain >= 2) { ctx.strokeStyle = '#5a3d20'; ctx.lineWidth = 2.5; for (let x = 606; x < 996; x += 13) { ctx.beginPath(); ctx.moveTo(x, DITCH.y1 - 4); ctx.lineTo(x - 5, DITCH.y0 + 6); ctx.stroke(); } }
    // approach road + arched stone bridge on 11 piers (outer 'movable' section by the gate is drawn with the gate)
    ctx.fillStyle = '#9a8458'; ctx.fillRect(GX - 15, 566, 30, 90);
    ctx.fillStyle = '#7d765f'; ctx.fillRect(GX - 17, DITCH.y0 - 6, 34, DITCH.y1 - DITCH.y0 + 12);
    ctx.fillStyle = '#a79f8c'; ctx.fillRect(GX - 17, DITCH.y0 - 6, 34, DITCH.y1 - DITCH.y0 + 12);
    ctx.fillStyle = '#6e6757'; for (let i = 0; i < 11; i++) { const y = DITCH.y0 - 4 + i * 3.6; ctx.fillRect(GX - 17, y, 3, 2.4); ctx.fillRect(GX + 14, y, 3, 2.4); }
    ctx.fillStyle = '#8d8574'; ctx.fillRect(GX - 17, DITCH.y0 - 6, 3, DITCH.y1 - DITCH.y0 + 12); ctx.fillRect(GX + 14, DITCH.y0 - 6, 3, DITCH.y1 - DITCH.y0 + 12);
    // courtyard floor
    ctx.fillStyle = '#7b6a4e'; ctx.fillRect(F.x0 + F.t, F.yb + F.t, F.x1 - F.x0 - 2 * F.t, F.yf - F.yb - F.t);
    const dpat = pat('dirt'); if (dpat) { ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = dpat; ctx.fillRect(F.x0 + F.t, F.yb + F.t, F.x1 - F.x0 - 2 * F.t, F.yf - F.yb - F.t); ctx.restore(); }
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 90; i++) { ctx.fillRect(rr(q, 670, 930), rr(q, 270, 430), rr(q, 3, 9), 2); }
    // outer ward floor
    ctx.fillStyle = '#6f6048'; ctx.fillRect(O.x0 + O.t, F.yf, O.x1 - O.x0 - 2 * O.t, O.y - F.yf);
    // back wall (inner face visible) + back towers
    stoneFace(F.x0, F.x1, F.yb + F.t, F.h, { top: '#9a9284', bot: '#6a6458' });
    slits(F.x0, F.x1, F.yb + F.t, F.h, 34);
    topSurface(F.x0, F.x1, F.yb + F.t - F.h, F.t, '#8a8375');
    merlons(F.x0, F.x1, F.yb - F.h, null);
    tower(F.x0 + 7, F.yb + 22, 46, 30, 100, 46);
    tower(F.x1 - 7, F.yb + 22, 46, 30, 100, 46);
    // buildings in the courtyard (chapel, palas / council hall, storehouse, workshop, well)
    const hall = house(768, 902, 392, 40, 26, 30, '#b9a68a', '#6f4a36', '#4c3024', { timber: false });
    ctx.fillStyle = '#e0c067'; ctx.fillRect(818, 392 - 36, 3, 14);
    house(690, 744, 372, 34, 22, 24, '#c9bda3', '#7a4e38', '#523626', { win: true });
    ctx.fillStyle = '#c9bda3'; ctx.fillRect(694, 372 - 62, 14, 28); ctx.fillStyle = '#6b4230'; ctx.beginPath(); ctx.moveTo(691, 372 - 62); ctx.lineTo(701, 372 - 80); ctx.lineTo(711, 372 - 62); ctx.fill();
    ctx.strokeStyle = '#e0c067'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(701, 372 - 80); ctx.lineTo(701, 372 - 90); ctx.moveTo(697, 372 - 86); ctx.lineTo(705, 372 - 86); ctx.stroke();
    house(850, 930, 322, 24, 18, 18, '#a89478', '#5e4030', '#42291f', { timber: true });
    house(676, 726, 316, 22, 16, 16, '#9d8c70', '#5e4030', '#42291f', { timber: true });
    cyl(790, 304, 8, 12, {});
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(782, 284, 16, 3);
    // side walls: wall-walk surfaces (inner faces are edge-on from this camera)
    for (const [x0, hp] of [[F.x0, hpW], [F.x1 - F.t, hpE]]) {
      ctx.fillStyle = '#7a7366'; ctx.fillRect(x0, F.yb - F.h, F.t, F.yf - F.yb);
      ctx.fillStyle = '#a69e8f'; ctx.fillRect(x0, F.yb - F.h, 2.5, F.yf - F.yb); ctx.fillRect(x0 + F.t - 2.5, F.yb - F.h, 2.5, F.yf - F.yb);
      ctx.fillStyle = '#c0b8a8'; for (let y = F.yb - F.h; y < F.yf - F.h - 10; y += 14) { ctx.fillRect(x0, y, 4, 8); ctx.fillRect(x0 + F.t - 4, y, 4, 8); }
      ctx.fillStyle = 'rgba(0,0,0,.16)'; for (let y = F.yb - F.h + 4; y < F.yf - F.h; y += 9) ctx.fillRect(x0, y, F.t, 1);
      const sec = x0 === F.x0 ? 'cliff' : 'east';
      for (const b of breaks(sec, hp)) { const p = walkPoint(sec, b.f); ctx.fillStyle = '#231b14'; ctx.beginPath(); ctx.moveTo(x0 - 1, p[1] - b.w / 2); ctx.lineTo(x0 + F.t + 1, p[1] - b.w / 2 + 3); ctx.lineTo(x0 + F.t + 1, p[1] + b.w / 2 - 2); ctx.lineTo(x0 - 1, p[1] + b.w / 2); ctx.closePath(); ctx.fill(); rubble(x0 + F.t / 2 + (sec === 'cliff' ? -14 : 14), p[1] + 70, 20); }
    }
    // fortifications on side walls (hoardings)
    for (const [sec, x0] of [['cliff', F.x0], ['east', F.x1 - F.t]]) {
      if (fort[sec] >= 1) { ctx.fillStyle = '#6b4a28'; for (let y = F.yb - F.h + 10; y < F.yf - F.h - 20; y += 42) { ctx.fillRect(x0 - 4, y, F.t + 8, 26); ctx.fillStyle = '#4a3219'; ctx.fillRect(x0 - 4, y, F.t + 8, 3); ctx.fillStyle = '#6b4a28'; } }
      if (fort[sec] >= 2) { ctx.strokeStyle = '#5a3d20'; ctx.lineWidth = 2.5; for (let y = 280; y < 540; y += 16) { const x = sec === 'cliff' ? 630 : 972; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (sec === 'cliff' ? -9 : 9), y - 6); ctx.stroke(); } }
    }

    /* ===== INNER: front inner wall (Mușatin curtain), SW & SE towers, inner gate tower ===== */
    ctx = layers.inner.getContext('2d');
    stoneFace(F.x0, F.x1, F.yf, F.h, { top: '#b4ac9d', bot: '#6c665a' });
    buttresses(F.x0 + 40, F.x1 - 40, F.yf, F.h, 44);
    slits(F.x0 + 20, F.x1 - 20, F.yf, F.h, 44);
    topSurface(F.x0, F.x1, F.yf - F.h, F.t, '#8d8678');
    merlons(F.x0, F.x1, F.yf - F.h, x => x > GX - 36 && x < GX + 28);
    tower(F.x0 + 7, F.yf + 8, 46, 30, 100, 46);
    tower(F.x1 - 7, F.yf + 8, 46, 30, 100, 46);
    // inner Mușatin Gate tower
    const igh = 90; stoneFace(GX - 30, GX + 30, F.yf + 4, igh, { top: '#b8b0a1', bot: '#6a6458' });
    topSurface(GX - 32, GX + 32, F.yf + 4 - igh, 22, '#8d8678'); merlons(GX - 32, GX + 32, F.yf + 4 - igh, null);
    ctx.fillStyle = '#16100b'; ctx.beginPath(); ctx.moveTo(GX - 12, F.yf + 4); ctx.lineTo(GX - 12, F.yf - 26); ctx.quadraticCurveTo(GX, F.yf - 44, GX + 12, F.yf - 26); ctx.lineTo(GX + 12, F.yf + 4); ctx.fill();
    ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 1.6; for (let x = GX - 9; x <= GX + 9; x += 6) { ctx.beginPath(); ctx.moveTo(x, F.yf - 36); ctx.lineTo(x, F.yf + 4); ctx.stroke(); }
    ctx.fillStyle = '#8e1b1b'; ctx.fillRect(GX - 4, F.yf + 4 - igh + 18, 8, 20); ctx.fillStyle = '#d4a53a'; ctx.fillRect(GX - 2, F.yf + 4 - igh + 22, 4, 4);
    if (fort.gate >= 1) { ctx.fillStyle = '#6b4a28'; ctx.fillRect(GX - 36, F.yf + 4 - igh - 4, 72, 12); ctx.fillStyle = '#4a3219'; ctx.fillRect(GX - 36, F.yf + 4 - igh - 4, 72, 3); }

    /* ===== OUTER: Stephen's outer belt, four semicircular bastions, outer gate, wings ===== */
    ctx = layers.outer.getContext('2d');
    for (const [x0, sec] of [[O.x0, 'cliff'], [O.x1 - O.t, 'east']]) {
      ctx.fillStyle = '#7e7769'; ctx.fillRect(x0, F.yf - O.h, O.t, O.y - F.yf); ctx.fillStyle = '#aaa293'; ctx.fillRect(x0, F.yf - O.h, 2, O.y - F.yf); ctx.fillRect(x0 + O.t - 2, F.yf - O.h, 2, O.y - F.yf);
    }
    stoneFace(O.x0, O.x1, O.y, O.h, { top: '#b7af9f', bot: '#6c665a' });
    buttresses(O.x0 + 16, O.x1 - 16, O.y, O.h, 46);
    slits(O.x0 + 10, O.x1 - 10, O.y, O.h, 46);
    topSurface(O.x0, O.x1, O.y - O.h, O.t, '#8d8678');
    const skipB = x => BAST.some(b => Math.abs(x + 5 - b) < 32) || (x > GX - 40 && x < GX + 36);
    merlons(O.x0, O.x1, O.y - O.h, skipB);
    for (const b of breaks('curtain', hpC)) { const x = lerp(628, 972, b.f); notch(x, O.y - O.h - 4, b.w, b.d, true); rubble(x, O.y + 14, 26); }
    // bastions
    BAST.forEach((bx, i) => { cyl(bx, O.y + 4, BR, BH); const dm = hpC < 55 && (i === 1 || i === 3); if (dm) { ctx.strokeStyle = 'rgba(20,14,10,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx - 6, O.y - 60); ctx.lineTo(bx + 1, O.y - 38); ctx.lineTo(bx - 4, O.y - 18); ctx.stroke(); } });
    // outer gate tower + raised drawbridge section
    const ogh = 92; stoneFace(GX - 32, GX + 32, O.y + 6, ogh, { top: '#b9b1a2', bot: '#6a6458' });
    topSurface(GX - 35, GX + 35, O.y + 6 - ogh, 26, '#8d8678'); merlons(GX - 35, GX + 35, O.y + 6 - ogh, null);
    ctx.fillStyle = '#16100b'; ctx.beginPath(); ctx.moveTo(GX - 14, O.y + 6); ctx.lineTo(GX - 14, O.y - 22); ctx.quadraticCurveTo(GX, O.y - 42, GX + 14, O.y - 22); ctx.lineTo(GX + 14, O.y + 6); ctx.fill();
    const dbOpen = hpG > 18;
    ctx.fillStyle = '#5e4126'; ctx.fillRect(GX - 13, O.y - 24, 26, 30); ctx.strokeStyle = '#2f2012'; ctx.lineWidth = 1.5; for (let x = GX - 9; x <= GX + 9; x += 6) { ctx.beginPath(); ctx.moveTo(x, O.y - 24); ctx.lineTo(x, O.y + 6); ctx.stroke(); }
    ctx.strokeStyle = '#3a3a3e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(GX - 12, O.y - 14); ctx.lineTo(GX + 12, O.y - 14); ctx.moveTo(GX - 12, O.y - 2); ctx.lineTo(GX + 12, O.y - 2); ctx.stroke();
    if (!dbOpen) { ctx.fillStyle = '#16100b'; ctx.fillRect(GX - 13, O.y - 24, 26, 30); }
    ctx.fillStyle = '#8e1b1b'; ctx.fillRect(GX - 5, O.y + 6 - ogh + 20, 10, 22); ctx.fillStyle = '#d4a53a'; ctx.beginPath(); ctx.arc(GX, O.y + 6 - ogh + 28, 3, 0, TAU); ctx.fill();
    if (hpG < 78) { for (const b of breaks('gate', hpG)) { notch(GX + (b.f - 0.5) * 50, O.y + 6 - ogh - 4, 18, 14 + b.d * 0.5, true); } rubble(GX, O.y + 24, 30); }
    // fortification props on outer wall
    if (fort.curtain >= 1) { ctx.fillStyle = '#6b4a28'; for (let x = 626; x < 972; x += 54) { if (x > GX - 56 && x < GX + 40) continue; ctx.fillRect(x, O.y - O.h - 14, 40, 14); ctx.fillStyle = '#4a3219'; ctx.fillRect(x, O.y - O.h - 14, 40, 3); ctx.fillStyle = '#6b4a28'; } }
    if (fort.curtain >= 3) { ctx.fillStyle = '#c2483a'; ctx.fillRect(O.x0 + 4, O.y - O.h - 34, 3, 26); ctx.fillRect(O.x1 - 7, O.y - O.h - 34, 3, 26); }
    if (fort.gate >= 2) { ctx.strokeStyle = '#5a3d20'; ctx.lineWidth = 2.5; for (let x = GX - 40; x <= GX + 40; x += 11) { ctx.beginPath(); ctx.moveTo(x, 584); ctx.lineTo(x - 5, 570); ctx.stroke(); } }
    ctx = null; castleDirty = false;
  }

  /* ---------- figures ---------- */
  function fig(x, y, sc, o) {
    const bob = o.bob || 0, dir = o.dir || 1;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(sc * dir, sc);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 1.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1511'; ctx.fillRect(-2.2, -4, 1.8, 4); ctx.fillRect(0.4, -4, 1.8, 4);
    ctx.fillStyle = o.body; ctx.fillRect(-3, -10, 6, 7); ctx.fillStyle = o.belt || '#3a2a1a'; ctx.fillRect(-3, -6, 6, 1);
    ctx.fillStyle = '#d9b48f'; ctx.beginPath(); ctx.arc(0, -12.4, 2.5, 0, TAU); ctx.fill();
    if (o.hat === 'helm') { ctx.fillStyle = '#8f98a3'; ctx.beginPath(); ctx.arc(0, -12.8, 2.8, Math.PI, TAU); ctx.fill(); }
    else if (o.hat === 'hood') { ctx.fillStyle = '#2f5b3a'; ctx.beginPath(); ctx.arc(0, -12.6, 2.9, Math.PI * 0.95, TAU * 1.02); ctx.fill(); }
    else if (o.hat === 'turban') { ctx.fillStyle = '#f1ead7'; ctx.beginPath(); ctx.ellipse(0, -14, 3.3, 2.1, 0, 0, TAU); ctx.fill(); }
    else if (o.hat === 'bork') { ctx.fillStyle = '#efe9d6'; ctx.fillRect(-2.1, -17.5, 4.2, 4); ctx.fillStyle = '#c0392b'; ctx.fillRect(-2.1, -14, 4.2, 1.2); }
    else if (o.hat === 'cap') { ctx.fillStyle = '#5b4630'; ctx.beginPath(); ctx.arc(0, -13, 2.7, Math.PI, TAU); ctx.fill(); }
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 0.9; const a = o.anim || 0;
    if (o.weapon === 'spear') { ctx.beginPath(); ctx.moveTo(4 + a, -2); ctx.lineTo(4 + a, -22); ctx.stroke(); ctx.fillStyle = '#c9d1d8'; ctx.beginPath(); ctx.moveTo(4 + a, -25); ctx.lineTo(5.3 + a, -21); ctx.lineTo(2.7 + a, -21); ctx.fill(); }
    else if (o.weapon === 'bow') { ctx.beginPath(); ctx.arc(4, -8, 6, -1.2, 1.2); ctx.stroke(); }
    else if (o.weapon === 'club') { ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(3.5, -7); ctx.lineTo(7 + a, -16); ctx.stroke(); }
    else if (o.weapon === 'sword') { ctx.strokeStyle = '#dfe5ea'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3.5, -8); ctx.lineTo(8 + a, -16); ctx.stroke(); }
    else if (o.weapon === 'ladder') { ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(7, -24); ctx.stroke(); }
    if (o.shield) { ctx.fillStyle = o.shield; ctx.beginPath(); ctx.arc(-3.5, -7, 3.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  const STYLE = {
    spear: { body: '#3b5e8c', hat: 'helm', weapon: 'spear', shield: '#8e2c2c' }, archer: { body: '#3e6b45', hat: 'hood', weapon: 'bow' },
    militia: { body: '#7a5b3c', hat: 'cap', weapon: 'club' }, azab: { body: '#a43c2f', hat: 'turban', weapon: 'sword', shield: '#c9a24a' },
    akinji: { body: '#8a5a2c', hat: 'turban', weapon: 'spear' }, janissary: { body: '#2f4f9a', hat: 'bork', weapon: 'sword', shield: '#d6c9a0' },
    sapper: { body: '#5a4632', hat: 'cap', weapon: 'club' }, civ: { body: '#9a8a6a', hat: 'cap', weapon: null }, civ2: { body: '#7a4a5a', hat: null, weapon: null }
  };
  function horse(x, y, sc, color, dir, gallop, rider) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc * dir, sc);
    const leg = Math.sin(gallop * 14) * 3; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, -10, 11, 5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(10, -16, 4, 3, -0.7, 0, TAU); ctx.fill();
    ctx.fillRect(-9, -8, 2, 8 + leg * 0.3); ctx.fillRect(-5, -8, 2, 8 - leg * 0.3); ctx.fillRect(5, -8, 2, 8 + leg * 0.3); ctx.fillRect(9, -8, 2, 8 - leg * 0.3);
    ctx.restore();
    if (rider) fig(x + dir, y - 9 * sc, sc, Object.assign({ dir }, rider));
  }

  /* ---------- API ---------- */
  const Scene = {
    W, H, NAMES, S,
    init(canvas) {
      cv = canvas; dpr = Math.min(2, root.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr; mctx = cv.getContext('2d'); mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDecor();
      cv.addEventListener('mousemove', e => { S.hover = Scene.sectorAt(Scene.toLocal(e)); cv.style.cursor = S.hover && S.mode === 'game' ? 'pointer' : 'default'; });
      cv.addEventListener('mouseleave', () => { S.hover = null; });
      cv.addEventListener('click', e => { if (anim) { S.fast = true; return; } const sec = Scene.sectorAt(Scene.toLocal(e)); if (sec && S.mode === 'game' && Scene.onSector) Scene.onSector(sec); });
      cv.addEventListener('touchend', () => { if (anim) S.fast = true; }, { passive: true });
      running = true; requestAnimationFrame(loop);
    },
    toLocal(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; },
    sectorAt(p) { for (const sec of ['gate', 'curtain', 'east', 'cliff']) { const r = REG[sec]; if (p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3]) return sec; } return null; },
    sync(view, instant) { T = view; if (!V || instant) { V = JSON.parse(JSON.stringify(view)); castleDirty = true; } },
    setTime(day, phase, instant) {
      const off = { dawn: 0.27, day: 0.46, assault: 0.58, dusk: 0.74, night: 0.92, title: 0.62 }[phase];
      clockTarget = (day - 1) + off; if (instant) clock = clockTarget;
    },
    setMode(m) { S.mode = m; }, setSelected(sec) { S.selected = sec; }, setIntel(i) { S.intel = i; },
    isBusy: () => !!anim, spawn(kind) { spawnProp(kind); }, endProps() { for (const a of actors) if (a.prop) a.leaving = true; },
    shake(n) { shake = Math.max(shake, n); },
    playBombard(hits) { return new Promise(res => { let i = 0; const next = () => { if (i >= hits.length) return setTimeout(res, 400); fireBombard(hits[i++]); setTimeout(next, S.fast ? 250 : 900); }; next(); }); },
    playAssault(result, view) { return new Promise(res => startAssault(result, view, res)); },
    clearBodies() { bodies.length = 0; },
    markDirty() { castleDirty = true; }
  };

  /* ---------- props (event actors) ---------- */
  function spawnProp(kind) {
    if (kind === 'envoy') actors.push({ prop: true, kind: 'envoy', x: 1250, y: 650, tx: 870, ty: 650, v: 60, state: 'in' });
    else if (kind === 'rider') actors.push({ prop: true, kind: 'rider', x: -40, y: 760, tx: 770, ty: 628, v: 170, state: 'in', route: [[250, 740], [450, 708], [700, 662]] });
    else if (kind === 'cart') actors.push({ prop: true, kind: 'cart', x: 1300, y: 690, tx: 860, ty: 650, v: 45, state: 'in' });
    else if (kind === 'refugees') for (let i = 0; i < 18; i++) actors.push({ prop: true, kind: 'refugee', x: 230 - i * 20 + Math.random() * 10, y: 745 + Math.random() * 14, tx: 770 + (i % 6) * 9, ty: 600 + (i % 4) * 9, v: 34 + Math.random() * 10, state: 'in', c: i % 3, route: [[350, 730], [450, 708], [580, 690], [700, 662]] });
  }
  function updateProps(dt) {
    for (let i = actors.length - 1; i >= 0; i--) {
      const a = actors[i]; if (!a.prop) continue;
      if (a.route && a.route.length && !a.leaving) { const [rx, ry] = a.route[0]; const dx = rx - a.x, dy = ry - a.y, d = Math.hypot(dx, dy); if (d < 6) a.route.shift(); else { a.x += dx / d * a.v * dt; a.y += dy / d * a.v * dt; a.dir = dx >= 0 ? 1 : -1; a.walk = (a.walk || 0) + dt; } continue; }
      const toX = a.leaving ? (a.kind === 'rider' || a.kind === 'refugee' ? GX : 1700) : a.tx, toY = a.leaving ? (a.kind === 'rider' || a.kind === 'refugee' ? 540 : a.ty) : a.ty;
      const dx = toX - a.x, dy = toY - a.y, d = Math.hypot(dx, dy);
      if (d > 3) { a.x += dx / d * a.v * dt; a.y += dy / d * a.v * dt; a.dir = dx >= 0 ? 1 : -1; a.walk = (a.walk || 0) + dt; if (a.leaving && (a.kind === 'rider' || a.kind === 'refugee') && a.y < 575) a.fade = (a.fade == null ? 1 : a.fade) - dt * 2.2; }
      else if (a.leaving) a.fade = 0;
      if (a.fade != null && a.fade <= 0) actors.splice(i, 1);
      else if (a.leaving && a.x > 1690) actors.splice(i, 1);
    }
  }

  /* ---------- particles / projectiles ---------- */
  function emit(type, x, y, n) {
    for (let i = 0; i < n && parts.length < 700; i++) {
      if (type === 'smoke') parts.push({ t: 'smoke', x: x + (Math.random() - 0.5) * 6, y, vx: 8 + Math.random() * 10, vy: -(12 + Math.random() * 12), life: 0, max: 3 + Math.random() * 2.5, s: 5 + Math.random() * 5 });
      else if (type === 'fire') parts.push({ t: 'fire', x: x + (Math.random() - 0.5) * 8, y, vx: (Math.random() - 0.5) * 8, vy: -(18 + Math.random() * 22), life: 0, max: 0.5 + Math.random() * 0.5, s: 3 + Math.random() * 3 });
      else if (type === 'dust') parts.push({ t: 'dust', x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 50, vy: -(10 + Math.random() * 40), life: 0, max: 0.8 + Math.random() * 0.8, s: 3 + Math.random() * 4 });
      else if (type === 'debris') parts.push({ t: 'debris', x, y, vx: (Math.random() - 0.5) * 110, vy: -(30 + Math.random() * 90), life: 0, max: 1 + Math.random() * 0.8, s: 1.5 + Math.random() * 2 });
      else if (type === 'spark') parts.push({ t: 'spark', x, y, vx: (Math.random() - 0.5) * 60, vy: -(10 + Math.random() * 40), life: 0, max: 0.4 + Math.random() * 0.3, s: 1 });
    }
  }
  function updateParts(dt) { for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += dt; if (p.life >= p.max) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.t === 'debris' || p.t === 'spark') p.vy += 260 * dt; if (p.t === 'smoke') { p.s += dt * 3; p.vx += 4 * dt; } } }
  function shoot(x0, y0, x1, y1, o) { proj.push(Object.assign({ x0, y0, x1, y1, t: 0, dur: 0.9, kind: 'arrow', arc: 40 }, o)); }
  function updateProj(dt) {
    for (let i = proj.length - 1; i >= 0; i--) {
      const p = proj[i]; p.t += dt / p.dur;
      if (p.t >= 1) { if (p.kind === 'stone') { emit('dust', p.x1, p.y1, 14); emit('debris', p.x1, p.y1, 12); shake = Math.max(shake, 6); if (p.onHit) p.onHit(); flashes.push({ x: p.x1, y: p.y1, t: 0, max: 0.35, r: 60 }); } proj.splice(i, 1); }
    }
  }
  const BATT = [{ x: 1085, y: 505 }, { x: 1062, y: 598 }];
  function fireBombard(h) {
    const bi = Math.min(Math.random() < 0.5 ? 0 : 1, Math.max(0, (V ? V.bombards : 1) - 1)); const b = BATT[bi];
    const imp = h.sector === 'gate' ? [GX + (Math.random() - 0.5) * 40, 430] : h.sector === 'east' ? [943, 200 + Math.random() * 140] : [lerp(640, 960, Math.random()), 470];
    flashes.push({ x: b.x - 22, y: b.y - 18, t: 0, max: 0.3, r: 55 }); emit('smoke', b.x - 22, b.y - 18, 10);
    proj.push({ x0: b.x - 22, y0: b.y - 18, x1: imp[0], y1: imp[1], t: 0, dur: 1.0, kind: 'stone', arc: 120, onHit: () => { if (Scene.onSound) Scene.onSound('bombard'); } });
    if (Scene.onSound) Scene.onSound('boom');
  }

  /* ---------- assault ---------- */
  const FATE = { repelled: [0.7, 0.3, 0], held: [0.45, 0.45, 0.1], bloody: [0.3, 0.4, 0.3], breach: [0.15, 0.35, 0.5], collapse: [0.05, 0.25, 0.7] };
  function route(sec) {
    const j = () => (Math.random() - 0.5);
    if (sec === 'gate') return { way: [[1000, 660], [880, 640]], tx: GX + j() * 26, ty: 582 + Math.random() * 24, H: 0, ladder: false };
    if (sec === 'curtain') { let x; do { x = lerp(630, 975, Math.random()); } while (x > 762 && x < 838); return { way: [[1020, 665], [x + 60, 650]], tx: x, ty: 582 + Math.random() * 8, H: O.h + 4, ladder: Math.random() < 0.8 }; }
    if (sec === 'east') return { way: [[1130, 520], [1050, 440]], tx: 962 + j() * 6, ty: 250 + Math.random() * 190, H: F.h, ladder: Math.random() < 0.85 };
    return { way: [[900, 690], [700, 660], [580, 580], [560, 440]], tx: 640 + j() * 6, ty: 250 + Math.random() * 190, H: F.h, ladder: Math.random() < 0.85 };
  }
  function startAssault(result, view, resolve) {
    S.fast = false;
    const army = result.wave.army || { azab: 1 }, kinds = Object.keys(army);
    const pick = () => { let r = Math.random(), a = 0; for (const k of kinds) { a += army[k]; if (r <= a) return k; } return kinds[0]; };
    for (const r of result.results) {
      const n = clamp(Math.round(r.attackers / 2.4), 4, 38), f = FATE[r.kind];
      for (let i = 0; i < n; i++) {
        const roll = Math.random(), fate = roll < f[0] ? 'early' : roll < f[0] + f[1] ? 'wall' : 'top';
        const rt = route(r.sector);
        actors.push({ assault: true, sector: r.sector, kind: pick(), x: 1100 + Math.random() * 200, y: 540 + Math.random() * 200, way: rt.way.slice(), tx: rt.tx, ty: rt.ty, WH: rt.H, v: 70 + Math.random() * 30, delay: Math.random() * 1.6, state: 'wait', fate, ladder: rt.ladder, climb: 0, die: 0, dir: -1, hold: 0 });
      }
    }
    if (result.index >= 4) actors.push({ assault: true, siege: true, x: 1090, y: 640, tx: 1018, ty: 470, state: 'wait', delay: 0.5, v: 14, kind: 'tower' });
    anim = { t: 0, result, resolve, view, volleyT: 0, collapseFx: {} };
    if (Scene.onSound) Scene.onSound('horn');
  }
  function updateAssault(dt) {
    if (!anim) return;
    const step = dt * (S.fast ? 3.2 : 1); anim.t += step; let alive = 0;
    anim.volleyT -= step;
    const attackers = actors.filter(a => a.assault && !a.siege && a.state === 'run');
    if (anim.volleyT <= 0 && attackers.length) {
      anim.volleyT = 0.12;
      for (const sec of SECTORS) {
        const g = V.garrison[sec]; if (!g || !g.archer) continue;
        const targets = attackers.filter(a => a.sector === sec); if (!targets.length) continue;
        const tg = targets[Math.floor(Math.random() * targets.length)], from = walkPoint(sec, Math.random());
        shoot(from[0], from[1] - 6, tg.x, tg.y - 8, { dur: 0.6 + Math.random() * 0.3, arc: 40 });
        if (Math.random() < 0.5) tg.arrowHits = (tg.arrowHits || 0) + 1;
      }
    }
    for (const a of actors) {
      if (!a.assault) continue;
      if (a.siege) { a.delay -= step; if (a.delay <= 0 && (Math.abs(a.x - a.tx) > 2 || Math.abs(a.y - a.ty) > 2)) { const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy); a.x += dx / d * a.v * step; a.y += dy / d * a.v * step; a.state = 'run'; } if (anim.t > 7) a.fadeOut = true; continue; }
      if (a.state === 'wait') { a.delay -= step; if (a.delay <= 0) a.state = 'run'; alive++; continue; }
      if (a.state === 'run') {
        alive++; const wp = a.way.length ? a.way[0] : [a.tx, a.ty];
        const dx = wp[0] - a.x, dy = wp[1] - a.y, d = Math.hypot(dx, dy), sp = a.v * step; a.walk = (a.walk || 0) + step;
        if (d > sp) { a.x += dx / d * sp; a.y += dy / d * sp; a.dir = dx >= 0 ? 1 : -1; }
        else if (a.way.length) a.way.shift();
        else { a.state = a.ladder ? 'climb' : 'fight'; a.hold = 0; }
        if (a.fate === 'early' && Math.random() < 0.0025 * (step / 0.016)) { a.state = 'dead'; a.die = 0; a.fresh = true; }
        if (a.arrowHits > 2 && a.fate !== 'top' && Math.random() < 0.05) { a.state = 'dead'; a.die = 0; a.fresh = true; }
      } else if (a.state === 'climb') { alive++; a.climb += step / 1.6; if (a.climb >= 1) { a.state = 'fight'; a.hold = 0; } }
      else if (a.state === 'fight') {
        alive++; a.hold += step;
        if (Math.random() < 0.08) emit('spark', a.x, a.y - (a.ladder ? a.WH : 12), 1);
        const lim = a.fate === 'top' ? 3.5 : 1.3 + Math.random() * 0.2;
        if (a.hold > lim) { if (a.fate === 'top') { a.state = 'top'; a.hold = 0; } else { a.state = 'dead'; a.die = 0; a.fresh = true; } }
      } else if (a.state === 'top') { alive++; a.hold += step; if (a.hold > 2.2) a.state = 'gone'; }
      else if (a.state === 'dead') {
        if (a.fresh) { a.fresh = false; if (bodies.length < 120) bodies.push({ x: a.tx + (Math.random() - 0.5) * 14, y: (a.ladder ? a.ty : a.y) + 2, c: Math.random() }); }
        a.die += step; if (a.die > 0.8) a.state = 'gone';
      }
    }
    for (const r of anim.result.results) {
      if ((r.kind === 'collapse' || r.kind === 'breach') && anim.t > 4.2 && !anim.collapseFx[r.sector]) {
        anim.collapseFx[r.sector] = true; shake = Math.max(shake, 9);
        const p = walkPoint(r.sector, 0.5); emit('debris', p[0], p[1], 24); emit('dust', p[0], p[1] + 20, 20); if (Scene.onSound) Scene.onSound('collapse');
      }
    }
    if (anim.t > 1.2 && !anim.sv) { anim.sv = 1; if (Scene.onSound) Scene.onSound('volley'); }
    if (anim.t > 2.6 && !anim.sl) { anim.sl = 1; if (Scene.onSound) Scene.onSound('ladder'); }
    if (anim.t > 3 && !anim.sfx) { anim.sfx = 1; if (Scene.onSound) Scene.onSound('clash'); }
    const done = anim.t > 14 || (anim.t > 4 && alive === 0 && !actors.some(a => a.assault && !a.siege && a.state !== 'gone'));
    if (done) { for (let i = actors.length - 1; i >= 0; i--) if (actors[i].assault) actors.splice(i, 1); const rs = anim.resolve; anim = null; S.fast = false; setTimeout(rs, 450); }
  }

  /* ---------- dynamic drawing ---------- */
  function houseDyn(h, burn, ruin) {
    const x = h.x, y = h.y, w = h.w, hh = h.h;
    if (ruin) { ctx.fillStyle = '#2a211a'; ctx.fillRect(x, y - 7, w, 7); ctx.fillStyle = '#1b1510'; ctx.fillRect(x + 4, y - 12, 6, 5); ctx.fillRect(x + w - 12, y - 10, 8, 3); if (Math.random() < 0.04) emit('smoke', x + w / 2, y - 10, 1); return; }
    if (h.church) { if (sprite('church', x + w / 2, y, 70)) return; house(x, x + w, y, hh, 24, 34, '#cbbf9f', '#5e4030', '#3f291f'); ctx.strokeStyle = '#e0c067'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y - hh - 46); ctx.lineTo(x + w / 2, y - hh - 58); ctx.moveTo(x + w / 2 - 4, y - hh - 54); ctx.lineTo(x + w / 2 + 4, y - hh - 54); ctx.stroke(); return; }
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x + w / 2 + 6, y + 1, w * 0.6, 4, 0, 0, TAU); ctx.fill();
    if (!sprite(h.kind, x + w / 2, y, w + 14)) house(x, x + w, y, hh, 16, 16, h.kind === 'house_a' ? '#c9b48a' : '#b19a74', '#6b4a38', '#4a3026', { timber: true });
    if (burn) { ctx.fillStyle = 'rgba(255,120,40,.22)'; ctx.fillRect(x, y - hh - 10, w, hh + 10); if (Math.random() < 0.5) emit('fire', x + Math.random() * w, y - hh - 4, 1); if (Math.random() < 0.3) emit('smoke', x + w / 2, y - hh - 10, 1); }
    else if (Math.random() < 0.01) emit('smoke', x + w - 6, y - hh - 18, 1);
  }
  function tent(t) {
    const x = t.x, y = t.y, w = t.w;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 2, w * 0.62, 5, 0, 0, TAU); ctx.fill();
    if (sprite(t.c === 1 ? 'tent_white' : 'tent_red', x, y, w + 14)) return;
    const col = ['#b53a2e', '#e4d7b6', '#8b6a2f'][t.c];
    ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - 11, w, 11);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x, y - 11, w / 2, 11);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2 - 3, y - 10); ctx.quadraticCurveTo(x - w * 0.2, y - 20, x, y - 34); ctx.quadraticCurveTo(x + w * 0.2, y - 20, x + w / 2 + 3, y - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.quadraticCurveTo(x + w * 0.2, y - 20, x + w / 2 + 3, y - 10); ctx.lineTo(x, y - 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - w / 2, y - 7, w, 2);
    ctx.fillStyle = '#17100a'; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 3, y - 8); ctx.lineTo(x + 3, y - 8); ctx.lineTo(x + 4, y); ctx.fill();
    ctx.fillStyle = '#d6b050'; ctx.beginPath(); ctx.arc(x, y - 36, 2, 0, TAU); ctx.fill();
  }
  function drawCamp() {
    const count = clamp(Math.round(V.tents), 6, D.tents.length);
    if (!D.tentsDrawn || D.tentsCount !== count) { D.tentsCount = count; D.tentsDrawn = D.tents.slice().sort((a, b) => a.order - b.order).slice(0, count).sort((a, b) => a.y - b.y); }
    // gabions + bombard batteries + trench
    for (const [gx, gy] of D.gabions) for (let k = 0; k < 4; k++) { const y = gy - 28 + k * 16; ctx.fillStyle = '#7a5e34'; ctx.fillRect(gx - 34, y, 12, 12); ctx.fillStyle = '#9a7a46'; ctx.fillRect(gx - 34, y, 12, 3); ctx.strokeStyle = 'rgba(40,26,12,.5)'; ctx.beginPath(); ctx.moveTo(gx - 31, y); ctx.lineTo(gx - 31, y + 12); ctx.moveTo(gx - 26, y); ctx.lineTo(gx - 26, y + 12); ctx.stroke(); }
    for (let i = 0; i < V.bombards; i++) {
      const b = BATT[i];
      if (!sprite('bombard', b.x - 6, b.y + 8, 100)) {
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, 40, 8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a3f1f'; ctx.fillRect(b.x - 16, b.y - 4, 44, 9);
        ctx.save(); ctx.translate(b.x - 8, b.y - 8); ctx.rotate(Math.atan2(-30, -70)); ctx.fillStyle = '#2b2b30'; ctx.fillRect(-4, -7, 58, 14); ctx.fillStyle = '#17171a'; ctx.fillRect(48, -9, 8, 18); ctx.restore();
        ctx.fillStyle = '#3a2a18'; ctx.beginPath(); ctx.arc(b.x - 8, b.y + 6, 7, 0, TAU); ctx.arc(b.x + 20, b.y + 6, 7, 0, TAU); ctx.fill();
      }
      fig(b.x + 26, b.y + 12, 0.95, { body: '#8f2a22', hat: 'turban', dir: -1 });
    }
    // sultan's pavilion arrives with the sultan
    if (V.day >= 9) {
      const px = 1400, py = 600;
      if (!sprite('pavilion', px, py, 150)) {
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(px + 10, py + 4, 70, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#9a1f1f'; ctx.fillRect(px - 52, py - 34, 104, 34); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(px, py - 34, 52, 34);
        ctx.fillStyle = '#b02525'; ctx.beginPath(); ctx.moveTo(px - 60, py - 32); ctx.quadraticCurveTo(px - 20, py - 50, px, py - 84); ctx.quadraticCurveTo(px + 20, py - 50, px + 60, py - 32); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d4a53a'; ctx.fillRect(px - 52, py - 36, 104, 4); ctx.beginPath(); ctx.arc(px, py - 88, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#17100a'; ctx.fillRect(px - 9, py - 24, 18, 24);
      }
      fig(px - 24, py + 14, 1.0, { body: '#2f4f9a', hat: 'bork', weapon: 'spear', dir: 1 }); fig(px + 24, py + 14, 1.0, { body: '#2f4f9a', hat: 'bork', weapon: 'spear', dir: -1 });
    }
    // tents + fires + soldiers sorted by y
    const items = D.tentsDrawn.map(t => ({ y: t.y, t }));
    for (const it of items) tent(it.t);
    for (let i = 0; i < Math.min(9, D.tentsDrawn.length / 3 | 0); i++) { const t = D.tentsDrawn[i * 3]; const fx = t.x + 30, fy = t.y + 8; ctx.fillStyle = '#2a1a10'; ctx.fillRect(fx - 5, fy, 10, 2); if (Math.random() < 0.45) emit('fire', fx, fy, 1); if (Math.random() < 0.08) emit('smoke', fx, fy - 4, 1); }
    // banners
    for (const [bx, by] of [[1140, 470], [1500, 520], [1240, 760]]) { ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 62); ctx.stroke(); ctx.fillStyle = '#b21f1f'; ctx.beginPath(); ctx.moveTo(bx, by - 62); for (let i = 0; i <= 6; i++) ctx.lineTo(bx + i * 5, by - 62 + Math.sin(time * 4 + i + bx) * 2); for (let i = 6; i >= 0; i--) ctx.lineTo(bx + i * 5, by - 46 + Math.sin(time * 4 + i + bx) * 2); ctx.fill(); ctx.fillStyle = '#f1ead7'; ctx.beginPath(); ctx.arc(bx + 10, by - 54, 3.5, 0.5, TAU - 0.5); ctx.fill(); }
    // idle soldiers
    if (!anim) {
      const n = clamp(Math.round(V.tents * 0.9), 5, 28);
      for (let i = 0; i < n; i++) {
        const bx = 1160 + (i * 59) % 400, by = 480 + ((i * 41) % 300), kind = i % 5 === 0 ? 'janissary' : i % 3 === 0 ? 'akinji' : 'azab', st = STYLE[kind];
        fig(bx + Math.sin(time * 0.3 + i) * 20, by, 0.8 + by / 1600, { body: st.body, hat: st.hat, weapon: st.weapon, shield: st.shield, bob: Math.sin(time * 4 + i) * 0.7, dir: Math.cos(time * 0.3 + i) > 0 ? 1 : -1 });
      }
    }
  }
  function drawVillage() {
    const hs = D.houses.slice().sort((a, b) => a.y - b.y);
    for (const h of hs) houseDyn(h, V.villageBurn > h.burn && !h.church ? V.villageBurn < h.burn + 0.18 : false, !h.church && V.villageBurn > h.burn + 0.18);
    for (const f of D.fields) if (V.villageBurn > f.burn * 0.8) { ctx.fillStyle = 'rgba(25,20,16,.78)'; ctx.fillRect(f.x, f.y, f.w, f.h); if (Math.random() < 0.006) emit('smoke', f.x + 8, f.y + Math.random() * f.h, 1); }
    if (V.villageBurn < 0.5) { fig(180, 748, 1.0, { body: STYLE.civ.body, hat: 'cap', dir: 1, bob: Math.sin(time * 2) * 0.6 }); fig(205, 752, 1.0, { body: STYLE.civ2.body, dir: -1, bob: Math.sin(time * 2 + 1) * 0.6 }); }
  }
  function drawBodies() { for (const b of bodies) { ctx.fillStyle = b.c < 0.5 ? 'rgba(46,28,22,.85)' : 'rgba(64,42,30,.85)'; ctx.fillRect(b.x - 4, b.y, 8, 3); ctx.fillStyle = 'rgba(180,170,150,.7)'; ctx.fillRect(b.x + 3, b.y, 2, 2); } }

  function defenderList(sec) {
    const g = V.garrison[sec]; if (!g) return [];
    const list = [];
    for (const t of ['spear', 'archer', 'militia']) { const n = Math.min(10, Math.ceil(g[t] / 2)); for (let i = 0; i < n; i++) list.push(t); }
    return list;
  }
  function drawDefenders(secs) {
    for (const sec of secs) {
      const list = defenderList(sec), k = list.length; if (!k) continue;
      list.forEach((t, i) => {
        const [px, py] = walkPoint(sec, (i + 0.5) / k), st = STYLE[t];
        const fighting = anim && anim.t > 2.4, a = fighting && t !== 'archer' ? Math.sin(time * 9 + i) * 1.8 : 0;
        const side = sec === 'cliff' ? 1 : sec === 'east' ? -1 : 1;
        fig(px + (i % 2 ? 2 : -2), py + 5, 0.85, { body: st.body, hat: st.hat, weapon: st.weapon, shield: st.shield, bob: Math.sin(time * 2.2 + i * 1.7) * 0.5, dir: sec === 'cliff' ? -1 : 1, anim: a });
      });
    }
    if (secs.includes('cliff')) { const py = 196 + ((time * 8) % 140); fig(F.x1 - 7, py, 0.8, { body: '#3b5e8c', hat: 'helm', weapon: 'spear', dir: 1 }); }
  }

  function drawShadows(sunH, tod) {
    if (sunH < 0.02) return;
    const a = clamp((tod - 0.25) / 0.5, 0, 1) * Math.PI, dx = -Math.cos(a), len = 0.35 + 0.95 * (1 - Math.sin(a)), dy = 0.45;
    const vx = dx * len, vy = dy * len, al = 0.26 * smooth(0.02, 0.35, sunH);
    ctx.fillStyle = `rgba(10,8,20,${al})`;
    const sweep = (x0, y0, x1, y1, h) => { const sx = vx * h, sy = vy * h; const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0 + sx, y0 + sy], [x1 + sx, y0 + sy], [x1 + sx, y1 + sy], [x0 + sx, y1 + sy]]; ctx.beginPath(); hull(pts); ctx.fill(); };
    sweep(F.x0, F.yb, F.x1, F.yf + 4, F.h);                       // inner fort
    sweep(O.x0, O.y - 6, O.x1, O.y + 6, O.h);                    // outer wall
    for (const b of BAST) sweep(b - BR, O.y - 4, b + BR, O.y + 14, BH);
    for (const [cx, cy] of [[657, 272], [943, 272], [657, 448], [943, 448]]) sweep(cx - 23, cy - 14, cx + 23, cy, 100);
    sweep(GX - 32, O.y - 20, GX + 32, O.y + 6, 92);
  }
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    const up = []; for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    const h = lo.slice(0, -1).concat(up.slice(0, -1)); ctx.moveTo(h[0][0], h[0][1]); for (let i = 1; i < h.length; i++) ctx.lineTo(h[i][0], h[i][1]); ctx.closePath();
  }

  function drawActors() {
    const items = actors.slice().sort((a, b) => a.y - b.y);
    for (const a of items) {
      if (a.fade != null) ctx.globalAlpha = clamp(a.fade, 0, 1);
      if (a.prop) {
        if (a.kind === 'envoy') { const dir = a.dir || -1; horse(a.x, a.y, 1.3, '#3a2a1a', dir, a.walk || 0, { body: '#d4cfc0', hat: 'turban' }); ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x + 8 * dir, a.y - 12); ctx.lineTo(a.x + 8 * dir, a.y - 52); ctx.stroke(); ctx.fillStyle = '#f5f2e8'; ctx.beginPath(); ctx.moveTo(a.x + 8 * dir, a.y - 52); for (let i = 0; i <= 5; i++) ctx.lineTo(a.x + 8 * dir + dir * i * 4.5, a.y - 52 + Math.sin(time * 6 + i) * 2); for (let i = 5; i >= 0; i--) ctx.lineTo(a.x + 8 * dir + dir * i * 4.5, a.y - 38 + Math.sin(time * 6 + i) * 2); ctx.fill(); }
        else if (a.kind === 'rider') horse(a.x, a.y, 1.3, '#5a3a22', a.dir || 1, time, { body: '#3b5e8c', hat: 'helm', weapon: 'spear' });
        else if (a.kind === 'cart') { const dir = a.dir || -1; ctx.save(); ctx.translate(a.x, a.y); ctx.scale(dir, 1); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#6a4a28'; ctx.fillRect(-18, -16, 36, 10); ctx.fillStyle = '#c6b27c'; ctx.fillRect(-14, -24, 28, 9); ctx.fillStyle = '#2a1a0e'; ctx.beginPath(); ctx.arc(-10, -4, 6, 0, TAU); ctx.arc(10, -4, 6, 0, TAU); ctx.fill(); ctx.restore(); horse(a.x + 30 * dir, a.y, 0.9, '#7a6a5a', dir, a.walk || 0, null); }
        else if (a.kind === 'refugee') { const st = a.c === 0 ? STYLE.civ : STYLE.civ2; fig(a.x, a.y, 0.95, { body: a.c === 2 ? '#5a6a4a' : st.body, hat: a.c === 1 ? null : 'cap', dir: a.dir || 1, bob: Math.sin((a.walk || 0) * 8) * 1.2 }); }
      } else if (a.assault) {
        if (a.siege) drawSiegeTower(a);
        else if (a.state !== 'wait' && a.state !== 'gone') {
          const st = STYLE[a.kind] || STYLE.azab; const sc = 0.82 + a.y / 1500;
          let x = a.x, y = a.y; ctx.globalAlpha = a.state === 'dead' ? 1 - a.die / 0.8 : 1;
          if (a.ladder && (a.state === 'climb' || a.state === 'fight' || a.state === 'top')) {
            const lx = a.tx, ly = a.ty, tx = lx - 1, ty = ly - a.WH;
            ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx - 3, ly); ctx.lineTo(tx - 3, ty); ctx.moveTo(lx + 3, ly); ctx.lineTo(tx + 3, ty); ctx.stroke();
            ctx.lineWidth = 1; for (let k = 1; k < 10; k++) { const f = k / 10; ctx.beginPath(); ctx.moveTo(lx - 3, lerp(ly, ty, f)); ctx.lineTo(lx + 3, lerp(ly, ty, f)); ctx.stroke(); }
            const f = a.state === 'climb' ? a.climb : 1; x = lerp(lx, tx, f); y = lerp(ly, ty + 10, f);
          }
          fig(x, y, a.state === 'climb' || a.state === 'top' ? 0.9 : sc, { body: st.body, hat: st.hat, weapon: a.ladder && a.state === 'run' ? 'ladder' : st.weapon, shield: st.shield, dir: a.dir || -1, bob: Math.sin((a.walk || 0) * 10) * 1.1, anim: a.state === 'fight' ? Math.sin(time * 14) * 2 : 0 });
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawSiegeTower(a) {
    if (a.state === 'wait' && a.delay > 0 && a.x === 1090) { /* standing in camp */ }
    const x = a.x, y = a.y; ctx.globalAlpha = a.fadeOut ? 0.6 : 1;
    if (!sprite('siege_tower', x, y, 90)) {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 10, y + 2, 34, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a3d20'; ctx.fillRect(x - 22, y - 112, 44, 112); ctx.fillStyle = '#3a2812'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 22, y - 104 + k * 26, 44, 3);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x, y - 112, 22, 112); ctx.fillStyle = '#7a1c1c'; ctx.fillRect(x - 25, y - 122, 50, 11);
      ctx.fillStyle = '#2a1a0e'; ctx.beginPath(); ctx.arc(x - 12, y, 8, 0, TAU); ctx.arc(x + 12, y, 8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawProjectiles() {
    for (const p of proj) {
      const t = p.t, x = lerp(p.x0, p.x1, t), y = lerp(p.y0, p.y1, t) - Math.sin(t * Math.PI) * p.arc;
      if (p.kind === 'stone') { ctx.fillStyle = '#2a2622'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); }
      else { const t2 = Math.max(0, t - 0.05), x2 = lerp(p.x0, p.x1, t2), y2 = lerp(p.y0, p.y1, t2) - Math.sin(t2 * Math.PI) * p.arc; ctx.strokeStyle = '#e6dcc2'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke(); }
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
  function drawRiverShimmer() {
    ctx.strokeStyle = 'rgba(220,240,250,.22)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let k = 0; k < 26; k++) { const t = ((time * 0.04 + k / 26) % 1) * (D.river.length - 1), i = Math.floor(t), f = t - i; const a = D.river[i], b = D.river[Math.min(i + 1, D.river.length - 1)]; const x = lerp(a[0], b[0], f) + Math.sin(k * 3.1) * 12, y = lerp(a[1], b[1], f); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y + 2); ctx.stroke(); }
  }
  function drawBirds() {
    const n = clamp(Math.round((V.deaths || 0) / 3), 0, D.crows.length); ctx.strokeStyle = '#0d0a08'; ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) { const c = D.crows[i], a = time * c.sp + c.p, x = c.cx + Math.cos(a) * c.r, y = c.cy + Math.sin(a * 1.3) * c.r * 0.3 - 30, fl = Math.sin(time * 9 + i) * 3; ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 40, 5, 2, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 5, y + fl); ctx.lineTo(x, y); ctx.lineTo(x + 5, y + fl); ctx.stroke(); }
  }
  function drawWeather(dt, sunH) {
    if (V.wx < 0.05 && sunH > 0.15) { // drifting cloud shadows on a clear day
      for (const c of D.clouds) { const x = ((c.x + time * c.v) % (W + 500)) - 250, y = c.y; const g = ctx.createRadialGradient(x, y, 10, x, y, c.s); g.addColorStop(0, 'rgba(10,20,30,.13)'); g.addColorStop(1, 'rgba(10,20,30,0)'); ctx.fillStyle = g; ctx.fillRect(x - c.s, y - c.s, c.s * 2, c.s * 2); }
    }
    if (V.fog > 0.02) for (let k = 0; k < 5; k++) { const y = 120 + k * 170; const g = ctx.createLinearGradient(0, y - 70, 0, y + 80); g.addColorStop(0, 'rgba(210,215,222,0)'); g.addColorStop(0.5, `rgba(210,215,222,${0.3 * V.fog})`); g.addColorStop(1, 'rgba(210,215,222,0)'); ctx.fillStyle = g; ctx.save(); ctx.translate(Math.sin(time * 0.1 + k) * 50, 0); ctx.fillRect(-80, y - 70, W + 160, 150); ctx.restore(); }
    if (V.wx > 0.05) { ctx.strokeStyle = `rgba(190,205,225,${0.35 * V.wx})`; ctx.lineWidth = 1; ctx.beginPath(); for (const d of D.rain) { d.y += d.v * dt; d.x -= 90 * dt; if (d.y > H) { d.y = -10; d.x = Math.random() * (W + 100); } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y - 12); } ctx.stroke(); ctx.fillStyle = `rgba(30,40,55,${0.16 * V.wx})`; ctx.fillRect(0, 0, W, H); }
    if (lightning > 0) { ctx.fillStyle = `rgba(230,235,255,${lightning * 0.55})`; ctx.fillRect(0, 0, W, H); }
  }
  function drawGrading(dark, sunH) {
    const warm = clamp(1 - Math.abs(sunH) / 0.38, 0, 1) * (sunH > -0.25 ? 1 : 0);
    if (warm > 0.01) { ctx.fillStyle = `rgba(255,140,70,${0.15 * warm})`; ctx.fillRect(0, 0, W, H); }
    if (dark > 0.01) { ctx.fillStyle = `rgba(8,12,44,${dark})`; ctx.fillRect(0, 0, W, H); }
  }
  function drawLights(dark) {
    if (dark < 0.08) return;
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(255,170,70,${a})`); g.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    const k = dark / 0.62;
    for (const sec of SECTORS) { for (let f = 0.05; f < 1; f += 0.16) { const p = walkPoint(sec, f); glow(p[0] + Math.sin(time * 7 + f * 9) * 0.6, p[1] - 6, 34, 0.3 * k); } }
    for (const [wx, wy] of [[800, 352], [722, 350], [880, 296], [701, 296], [657, 330], [943, 330], [657, 188], [943, 188], [GX, 458]]) glow(wx, wy, 30, 0.5 * k);
    glow(GX, O.y - 6, 40, 0.35 * k);
    for (let i = 0; i < Math.min(9, (D.tentsDrawn || []).length / 3 | 0); i++) { const t = D.tentsDrawn[i * 3]; glow(t.x + 30, t.y + 2, 48 + Math.sin(time * 8 + i) * 3, 0.55 * k); }
    for (let i = 0; i < (D.tentsDrawn || []).length; i += 2) { const t = D.tentsDrawn[i]; glow(t.x, t.y - 14, 26, 0.2 * k); }
    for (const h of D.houses) if (V.villageBurn < h.burn || h.church) glow(h.x + 10, h.y - 12, 18, 0.45 * k);
    ctx.globalCompositeOperation = 'source-over';
  }

  function plaque(sec) {
    const [cx, cy] = LABEL[sec], hp = Math.round(T ? T.walls[sec] : V.walls[sec]), g = V.garrison[sec], nU = g ? g.spear + g.archer + g.militia : 0;
    const sel = S.selected === sec, pw = 214, ph = 64, px = cx - pw / 2, py = cy - ph / 2;
    ctx.fillStyle = 'rgba(16,12,8,.8)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 9) : ctx.rect(px, py, pw, ph); ctx.fill();
    ctx.strokeStyle = sel ? '#e8be5a' : 'rgba(120,100,70,.85)'; ctx.lineWidth = sel ? 2.4 : 1.2; ctx.stroke();
    ctx.fillStyle = sel ? '#f2d386' : '#e6d9bd'; ctx.font = 'bold 17px Georgia, serif'; ctx.textAlign = 'left'; ctx.fillText(NAMES[sec], px + 12, py + 22);
    ctx.fillStyle = '#2b2118'; ctx.fillRect(px + 12, py + 30, pw - 24, 8); ctx.fillStyle = hp > 55 ? '#7fa65a' : hp > 28 ? '#d09a3a' : '#c1493a'; ctx.fillRect(px + 12, py + 30, (pw - 24) * hp / 100, 8);
    ctx.fillStyle = '#c4b493'; ctx.font = '15px Georgia, serif'; ctx.fillText(`🧱 ${hp}    ⚔ ${nU}    🛠 ${V.fort[sec]}`, px + 12, py + 57);
  }
  function drawOverlay() {
    if (S.mode !== 'game' || !S.showLabels) return;
    ctx.save();
    if (S.intel && !anim) {
      const tgt = { gate: [GX, 600], curtain: [700, 590], east: [975, 420], cliff: [600, 560] };
      for (const sec of SECTORS) {
        const w = S.intel.weights[sec]; if (w < 0.05) continue;
        const [ex, ey] = tgt[sec], sx = 1090, sy = 690, th = clamp(w * 16, 2, 9);
        ctx.strokeStyle = `rgba(214,70,50,${S.intel.exact ? 0.72 : 0.42})`; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = th; ctx.setLineDash(S.intel.exact ? [] : [10, 8]); ctx.lineCap = 'round'; ctx.lineDashOffset = -((time * 26) % 18);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + ex) / 2, Math.max(ey, sy) + 60 - w * 40, ex + 14, ey + 14); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(ex - 8, ey - 6); ctx.lineTo(ex + 22, ey + 8); ctx.lineTo(ex - 4, ey + 22); ctx.closePath(); ctx.fill();
      }
    }
    for (const sec of SECTORS) {
      const r = REG[sec], hot = S.hover === sec, sel = S.selected === sec;
      if (hot || sel) { ctx.fillStyle = sel ? 'rgba(232,190,90,.14)' : 'rgba(255,255,255,.08)'; ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); ctx.strokeStyle = sel ? 'rgba(232,190,90,.9)' : 'rgba(255,255,255,.45)'; ctx.lineWidth = sel ? 2 : 1; ctx.setLineDash([8, 5]); ctx.strokeRect(r[0] + 1, r[1] + 1, r[2] - r[0] - 2, r[3] - r[1] - 2); ctx.setLineDash([]); }
      plaque(sec);
    }
    ctx.restore();
  }

  /* ---------- main loop ---------- */
  function update(dt) {
    time += dt;
    const diff = clockTarget - clock; clock += Math.sign(diff) * Math.min(Math.abs(diff), Math.max(0.01 * dt * 60 * 0.4, Math.abs(diff) * dt * 1.4));
    if (T) {
      let changed = false;
      for (const sec of SECTORS) {
        const d = T.walls[sec] - V.walls[sec]; V.walls[sec] += Math.sign(d) * Math.min(Math.abs(d), 22 * dt);
        if (Math.round(V.walls[sec] / 3) !== (V._r ? V._r[sec] : -1)) changed = true;
        if (V.fort[sec] !== T.fort[sec]) { V.fort[sec] = T.fort[sec]; changed = true; }
        V.garrison[sec] = T.garrison[sec];
      }
      if (changed) { V._r = {}; for (const sec of SECTORS) V._r[sec] = Math.round(V.walls[sec] / 3); castleDirty = true; }
      V.tents = lerp(V.tents, T.tents, Math.min(1, dt * 1.5)); V.bombards = T.bombards;
      V.villageBurn = lerp(V.villageBurn, T.villageBurn, Math.min(1, dt * 0.8)); V.deaths = T.deaths; V.morale = lerp(V.morale, T.morale, Math.min(1, dt * 2)); V.day = T.day;
      const wx = T.weather === 'rain' ? 0.8 : T.weather === 'storm' ? 1 : 0, fg = T.weather === 'fog' ? 1 : 0;
      V.wx = lerp(V.wx || 0, wx, Math.min(1, dt * 0.8)); V.fog = lerp(V.fog || 0, fg, Math.min(1, dt * 0.8));
    }
    if (T && T.weather === 'storm') { nextBolt -= dt; if (nextBolt <= 0) { lightning = 1; nextBolt = 5 + Math.random() * 9; if (Scene.onSound) Scene.onSound('thunder'); } }
    lightning = Math.max(0, lightning - dt * 3); shake = Math.max(0, shake - dt * 14);
    updateParts(dt); updateProj(dt); updateProps(dt); updateAssault(dt);
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t >= flashes[i].max) flashes.splice(i, 1); }
  }
  function frame(dtRaw) {
    const dt = Math.min(0.05, dtRaw); if (!V) return;
    update(dt);
    const tod = ((clock % 1) + 1) % 1, sunH = Math.sin((tod - 0.25) * TAU);
    V.__sunH = sunH; V.__night = sunH < 0.05;
    const dark = clamp(0.6 * (1 - smooth(-0.22, 0.28, sunH)), 0, 0.6) + (V.fog || 0) * 0.04;
    if (staticDirty || !terrain) buildTerrain();
    if (castleDirty || !layers) { const prev = ctx; renderCastle(); ctx = prev; }
    ctx = mctx;
    ctx.save();
    if (shake > 0.1) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.drawImage(terrain, 0, 0, W, H);
    drawRiverShimmer();
    drawVillage();
    ctx.drawImage(layers.back, 0, 0, W, H);
    drawShadows(sunH, tod);
    drawBodies();
    drawDefenders(['cliff', 'east']);
    ctx.drawImage(layers.inner, 0, 0, W, H);
    drawDefenders(['gate']);
    ctx.drawImage(layers.outer, 0, 0, W, H);
    drawDefenders(['curtain']);
    // fires on heavily damaged sectors
    for (const sec of SECTORS) if (V.walls[sec] < 36) for (const p of damagePoints(sec)) if (Math.random() < 0.25) { emit('fire', p[0], p[1], 1); if (Math.random() < 0.5) emit('smoke', p[0], p[1] - 4, 1); }
    drawCamp();
    drawActors();
    drawProjectiles(); drawParts(); drawBirds(); drawFireParts(dark);
    drawWeather(dt, sunH);
    drawGrading(dark, sunH);
    drawLights(dark);
    ctx.restore();
    drawOverlay();
  }
  function loop(ts) { if (!running) return; const dt = (ts - tPrev) / 1000; tPrev = ts; try { frame(isFinite(dt) ? dt : 0.016); } catch (e) { console.error(e); } requestAnimationFrame(loop); }

  root.Scene = Scene;
})(window);
