/* Campaign map: Moldavia 1476. Uses assets/img/map.(jpg|png|webp) if present, otherwise a painted-parchment fallback. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const NODES = {
    hotin:     { n: 'Hotin',        x: 0.50, y: 0.07 },
    suceava:   { n: 'Suceava',      x: 0.40, y: 0.20, home: true },
    neamt:     { n: 'Neamț',        x: 0.36, y: 0.44, siege: true },
    razboieni: { n: 'Războieni',    x: 0.47, y: 0.40, battle: true },
    roman:     { n: 'Roman',        x: 0.54, y: 0.47 },
    iasi:      { n: 'Iași',         x: 0.68, y: 0.38 },
    chilia:    { n: 'Chilia',       x: 0.80, y: 0.90 },
    cetatea:   { n: 'Cetatea Albă', x: 0.90, y: 0.78 }
  };
  const ROAD = [['hotin', 'suceava'], ['suceava', 'neamt'], ['suceava', 'roman'], ['neamt', 'roman'], ['roman', 'iasi'], ['iasi', 'cetatea'], ['roman', 'chilia'], ['iasi', 'chilia']];
  const OTTO = [[0.50, 1.02], [0.52, 0.78], [0.50, 0.62], [0.44, 0.50], [0.38, 0.46]];
  let bg = null;
  (function load() { const ex = ['jpg', 'png', 'jpeg', 'webp']; let k = 0; const i = new Image(); i.onload = () => { bg = i; }; i.onerror = () => { k++; if (k < ex.length) i.src = `assets/img/map.${ex[k]}`; }; i.src = `assets/img/map.${ex[0]}`; })();

  function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let cache = null;
  function parchment(W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rng(7);
    let g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#d9c89c'); g.addColorStop(0.5, '#cdb98a'); g.addColorStop(1, '#bba577'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '120,90,50' : '230,215,170'},${0.05 + r() * 0.07})`; x.beginPath(); x.ellipse(r() * W, r() * H, 10 + r() * 60, 6 + r() * 30, r() * 3, 0, TAU); x.fill(); }
    // black sea
    const sea = x.createLinearGradient(W * 0.7, H * 0.8, W, H); sea.addColorStop(0, 'rgba(70,110,125,0)'); sea.addColorStop(1, 'rgba(70,110,125,.75)'); x.fillStyle = sea; x.beginPath(); x.moveTo(W * 0.62, H); x.quadraticCurveTo(W * 0.88, H * 0.82, W, H * 0.7); x.lineTo(W, H); x.closePath(); x.fill();
    // forests
    for (let i = 0; i < 260; i++) { const fx = r() * W, fy = r() * H * 0.9; if (fx > W * 0.8 && fy > H * 0.6) continue; x.fillStyle = `rgba(${60 + r() * 30},${90 + r() * 30},${50},${0.28 + r() * 0.2})`; x.beginPath(); x.moveTo(fx, fy - 7); x.lineTo(fx - 4, fy + 2); x.lineTo(fx + 4, fy + 2); x.fill(); }
    // Carpathians
    x.strokeStyle = 'rgba(80,60,40,.65)'; x.fillStyle = 'rgba(150,130,100,.8)'; x.lineWidth = 1;
    for (let i = 0; i < 46; i++) { const a = -0.2 + i / 46 * 1.25, mx = W * (0.03 + 0.22 * Math.sin(a * 1.25)) + r() * 14, my = H * (0.02 + a * 0.62) + r() * 12; x.beginPath(); x.moveTo(mx - 12, my + 10); x.lineTo(mx, my - 10); x.lineTo(mx + 12, my + 10); x.closePath(); x.fill(); x.stroke(); x.fillStyle = 'rgba(245,240,225,.7)'; x.beginPath(); x.moveTo(mx - 3, my - 5); x.lineTo(mx, my - 10); x.lineTo(mx + 3, my - 5); x.fill(); x.fillStyle = 'rgba(150,130,100,.8)'; }
    // rivers: Siret & Prut
    const river = pts => { x.strokeStyle = 'rgba(70,110,125,.85)'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0] * W, p[1] * H) : x.moveTo(p[0] * W, p[1] * H)); x.stroke(); };
    river([[0.46, 0.02], [0.50, 0.2], [0.55, 0.4], [0.56, 0.6], [0.6, 0.8], [0.66, 0.97]]); river([[0.80, 0.12], [0.78, 0.35], [0.82, 0.55], [0.84, 0.75], [0.8, 0.9]]);
    // vignette & border
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,40,20,.5)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(70,45,20,.8)'; x.lineWidth = 3; x.strokeRect(6, 6, W - 12, H - 12);
    return c;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function pathPt(pts, t) { const n = pts.length - 1, f = Math.min(0.9999, Math.max(0, t)) * n, i = Math.floor(f); return [lerp(pts[i][0], pts[i + 1][0], f - i), lerp(pts[i][1], pts[i + 1][1], f - i)]; }

  function draw(cv, s, time) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    if (bg) ctx.drawImage(bg, 0, 0, W, H); else { if (!cache || cache.width !== W) cache = parchment(W, H); ctx.drawImage(cache, 0, 0); }
    const P = n => [NODES[n].x * W, NODES[n].y * H];
    // roads
    ctx.strokeStyle = 'rgba(90,60,30,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    for (const [a, b] of ROAD) { const A = P(a), B = P(b); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
    ctx.setLineDash([]);
    const N = P('neamt'), S = P('suceava');
    const hp = s ? Engine.hostProgress(s) : { p: 0, eta: 0 };
    // Ottoman host approach path + camp
    const op = OTTO.map(q => [q[0] * W, q[1] * H]);
    ctx.strokeStyle = 'rgba(160,40,30,.7)'; ctx.lineWidth = 3; ctx.setLineDash([2, 7]); ctx.lineCap = 'round'; ctx.beginPath(); op.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.setLineDash([]);
    const camp = s ? Math.min(1, s.camp / 40 + 0.25) : 0.4;
    for (let i = 0; i < 3 + Math.round(camp * 8); i++) { const a = i * 2.4, rr = 14 + (i % 4) * 7; const cx = N[0] + 28 + Math.cos(a) * rr * 1.3, cy = N[1] + 18 + Math.sin(a) * rr * 0.8; ctx.fillStyle = i % 3 === 0 ? '#e4d7b6' : '#b53a2e'; ctx.beginPath(); ctx.moveTo(cx - 5, cy + 3); ctx.lineTo(cx, cy - 6); ctx.lineTo(cx + 5, cy + 3); ctx.fill(); }
    // Stephen's host marching Suceava -> Neamț
    const hp0 = [S[0], S[1]], hp1 = [N[0], N[1]];
    ctx.strokeStyle = 'rgba(30,70,140,.75)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(hp0[0], hp0[1]); ctx.lineTo(lerp(hp0[0], hp1[0], hp.p), lerp(hp0[1], hp1[1], hp.p)); ctx.stroke(); ctx.setLineDash([]);
    const hx = lerp(hp0[0], hp1[0], hp.p), hy = lerp(hp0[1], hp1[1], hp.p);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(hx + 3, hy + 9, 12, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy + 6); ctx.lineTo(hx, hy - 22); ctx.stroke();
    ctx.fillStyle = '#9a1b1b'; ctx.beginPath(); ctx.moveTo(hx, hy - 22); for (let i = 0; i <= 5; i++) ctx.lineTo(hx + i * 4, hy - 22 + Math.sin(time * 4 + i) * 1.5); for (let i = 5; i >= 0; i--) ctx.lineTo(hx + i * 4, hy - 12 + Math.sin(time * 4 + i) * 1.5); ctx.fill();
    ctx.fillStyle = '#e0b54a'; ctx.beginPath(); ctx.arc(hx + 8, hy - 17, 2.4, 0, TAU); ctx.fill();
    // nodes
    ctx.textAlign = 'center';
    for (const k in NODES) {
      const nd = NODES[k], [x, y] = P(k), isN = k === 'neamt';
      if (isN) { const pr = 12 + Math.sin(time * 3) * 3; ctx.strokeStyle = 'rgba(190,50,40,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 14 + pr * 0.4, 0, TAU); ctx.stroke(); }
      // castle glyph
      ctx.fillStyle = nd.battle ? '#7a2a22' : '#51463a'; ctx.fillRect(x - 7, y - 5, 14, 10); ctx.fillRect(x - 9, y - 9, 4, 5); ctx.fillRect(x + 5, y - 9, 4, 5); ctx.fillRect(x - 2, y - 9, 4, 4);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 2, y, 4, 5);
      if (nd.battle) { ctx.strokeStyle = '#7a2a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, y - 8); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 8); ctx.lineTo(x - 6, y + 6); ctx.stroke(); }
      ctx.font = `${isN ? 'bold ' : ''}14px Georgia, serif`; ctx.fillStyle = 'rgba(245,235,205,.9)'; ctx.strokeStyle = 'rgba(40,25,10,.85)'; ctx.lineWidth = 3; ctx.strokeText(nd.n, x, y + 24); ctx.fillText(nd.n, x, y + 24);
      if (isN && s) { const fire = s.walls.gate + s.walls.east + s.walls.curtain < 180; if (fire) for (let i = 0; i < 3; i++) { const fx = x - 8 + i * 8, fy = y - 12 - Math.abs(Math.sin(time * 6 + i)) * 6; ctx.fillStyle = `rgba(255,${130 + i * 30},40,.9)`; ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, TAU); ctx.fill(); } }
    }
    // burnt valley
    if (s && s.villageBurn > 0.1) { for (let i = 0; i < Math.round(s.villageBurn * 6); i++) { const bx = N[0] + 30 + i * 14, by = N[1] + 40 + (i % 2) * 12; ctx.fillStyle = 'rgba(30,22,16,.55)'; ctx.beginPath(); ctx.arc(bx, by + Math.sin(time * 2 + i) * 0.4 - 8, 5 + i % 3, 0, TAU); ctx.fill(); } }
    // legend
    ctx.textAlign = 'left'; ctx.font = '12px Georgia, serif'; ctx.fillStyle = 'rgba(40,25,10,.85)';
    ctx.fillText('— Prince Stephen’s host', 14, H - 30); ctx.fillText('··· Ottoman host', 14, H - 14);
  }

  root.CampaignMap = { draw, NODES };
})(window);
