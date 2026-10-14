/* Game engine: pure logic, no DOM (testable in Node). */
(function (root) {
  'use strict';
  const E = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const D = () => root.GameData;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  E.mulberry32 = mulberry32;

  E.DAYS = 30;
  E.AP = 3;
  E.CRED_NEEDED = 35;
  E.SECTORS = ['cliff', 'curtain', 'gate', 'east'];
  E.SECTOR_INFO = {
    cliff:   { name: 'Cliff Bastion', terrain: 1.4 },
    curtain: { name: 'Curtain Wall',  terrain: 1.0 },
    gate:    { name: 'Gatehouse',     terrain: 0.9 },
    east:    { name: 'East Tower',    terrain: 1.05 }
  };
  E.TYPES = ['spear', 'archer', 'militia'];
  E.UNIT = {
    spear:   { name: 'Men-at-arms', pow: 3.0, loss: 0.9 },
    archer:  { name: 'Archers',     pow: 2.4, loss: 0.9, arrows: 1.2 },
    militia: { name: 'Militia',     pow: 1.1, loss: 1.5 },
    knight:  { name: 'Horsemen' }
  };
  E.ICON = { food: '🌾', morale: '🕯️', arrows: '🏹', timber: '🪵', cred: '👑', civ: '👥',
    spear: '🛡️', archer: '🎯', militia: '⚒️', knight: '🐎', walls: '🧱' };
  E.LABEL = { food: 'Food', morale: 'Morale', arrows: 'Arrows', timber: 'Timber', cred: "Prince's trust", civ: 'Civilians',
    spear: 'Men-at-arms', archer: 'Archers', militia: 'Militia', knight: 'Horsemen', walls: 'Walls' };

  /* ---------------- state ---------------- */
  E.newGame = function (seed) {
    seed = seed == null ? (Date.now() & 0xffffffff) : seed;
    const s = {
      seed, rng: mulberry32(seed), day: 1, ap: E.AP,
      food: 170, morale: 62, arrows: 60, timber: 34, cred: 50, civ: 20,
      units: { spear: 24, archer: 18, militia: 30, knight: 6 },
      wounded: { spear: 0, archer: 0, militia: 0, knight: 0 },
      garrison: {}, walls: { cliff: 90, curtain: 80, gate: 78, east: 80 }, fort: { cliff: 0, curtain: 0, gate: 0, east: 0 },
      breaches: 0, wavesDone: 0, deaths: 0, camp: 4, bombards: 0, villageBurn: 0,
      weather: 'clear', ration: false, scouted: false,
      lieDebt: 0, truths: 0, lies: 0, silences: 0,
      used: {}, flags: {}, chronicle: [], dayNotes: [], snap: null, history: [], over: null
    };
    for (const sec of E.SECTORS) s.garrison[sec] = { spear: 0, archer: 0, militia: 0 };
    E.autoAssign(s);
    return s;
  };

  E.fighters = s => s.units.spear + s.units.archer + s.units.militia;
  E.reserve = (s, t) => s.units[t] - E.SECTORS.reduce((a, sec) => a + s.garrison[sec][t], 0);
  E.assigned = (s, sec) => E.TYPES.reduce((a, t) => a + s.garrison[sec][t], 0);

  E.normalizeGarrison = function (s) {
    for (const t of E.TYPES) {
      let over = E.SECTORS.reduce((a, sec) => a + s.garrison[sec][t], 0) - s.units[t];
      while (over > 0) {
        let best = null;
        for (const sec of E.SECTORS) if (s.garrison[sec][t] > 0 && (!best || s.garrison[sec][t] > s.garrison[best][t])) best = sec;
        if (!best) break;
        s.garrison[best][t]--; over--;
      }
    }
  };

  E.setAssign = function (s, sec, t, n) {
    n = Math.max(0, Math.floor(n));
    const cur = s.garrison[sec][t];
    const room = cur + E.reserve(s, t);
    s.garrison[sec][t] = Math.min(n, room);
  };

  E.autoAssign = function (s, weights) {
    weights = weights || { cliff: 0.1, curtain: 0.25, gate: 0.37, east: 0.28 };
    for (const sec of E.SECTORS) for (const t of E.TYPES) s.garrison[sec][t] = 0;
    for (const t of E.TYPES) {
      let left = s.units[t];
      const secs = E.SECTORS.slice().sort((a, b) => weights[b] - weights[a]);
      const tot = secs.reduce((a, x) => a + weights[x], 0) || 1;
      for (const sec of secs) {
        const n = Math.min(left, Math.round(s.units[t] * weights[sec] / tot));
        s.garrison[sec][t] = n; left -= n;
      }
      let i = 0;
      while (left > 0) { s.garrison[secs[i % secs.length]][t]++; left--; i++; }
    }
  };

  /* ---------------- effects ---------------- */
  const SIMPLE = ['food', 'morale', 'arrows', 'timber', 'cred', 'civ', 'lieDebt', 'camp', 'villageBurn'];
  E.apply = function (s, fx) {
    if (!fx) return;
    for (const k in fx) {
      const v = fx[k];
      if (SIMPLE.includes(k)) s[k] += v;
      else if (k in s.units) { s.units[k] += v; if (v < 0) s.deaths += -v; }
      else if (k === 'wallsAll') for (const sec of E.SECTORS) s.walls[sec] += v;
      else if (k.startsWith('wall_')) s.walls[k.slice(5)] += v;
      else if (k.startsWith('fort_')) s.fort[k.slice(5)] += v;
    }
    s.morale = clamp(s.morale, 0, 100); s.cred = clamp(s.cred, 0, 100);
    s.food = Math.max(0, s.food); s.arrows = clamp(s.arrows, 0, 200); s.timber = clamp(s.timber, 0, 150);
    s.civ = Math.max(0, s.civ); s.lieDebt = Math.max(0, s.lieDebt); s.villageBurn = clamp(s.villageBurn, 0, 1);
    for (const sec of E.SECTORS) { s.walls[sec] = clamp(s.walls[sec], 0, 100); s.fort[sec] = clamp(s.fort[sec], 0, 3); }
    for (const t in s.units) s.units[t] = Math.max(0, s.units[t]);
    E.normalizeGarrison(s);
    checkOver(s);
  };

  E.chips = function (fx) {
    const out = [];
    for (const k in (fx || {})) {
      const v = fx[k]; if (!v) continue;
      let icon = E.ICON[k], label = E.LABEL[k];
      if (k === 'wallsAll') { icon = E.ICON.walls; label = 'All walls'; }
      else if (k.startsWith('wall_')) { icon = E.ICON.walls; label = E.SECTOR_INFO[k.slice(5)].name; }
      else if (k.startsWith('fort_')) { icon = '🛠️'; label = E.SECTOR_INFO[k.slice(5)].name + ' defences'; }
      if (!icon) continue;
      out.push({ icon, label, v, good: ['food', 'morale', 'arrows', 'timber', 'cred', 'civ', 'spear', 'archer', 'militia', 'knight', 'wallsAll'].includes(k) || k.startsWith('wall_') || k.startsWith('fort_') ? v > 0 : v < 0 });
    }
    return out;
  };

  function checkOver(s) {
    if (s.over) return;
    if (s.breaches >= 3) s.over = 'fall';
    else if (E.fighters(s) <= 6) s.over = 'fall';
    else if (s.morale <= 0) s.over = 'mutiny';
  }
  E.checkOver = checkOver;

  /* ---------------- weather ---------------- */
  E.rollWeather = function (s) {
    if (s.day === 1) return (s.weather = 'clear');
    const r = s.rng();
    s.weather = r < 0.5 ? 'clear' : r < 0.72 ? 'rain' : r < 0.9 ? 'fog' : 'storm';
    return s.weather;
  };

  /* ---------------- enemy intel ---------------- */
  E.nextWave = s => D().WAVES[s.wavesDone] || null;
  E.daysToAssault = s => { const w = E.nextWave(s); return w ? w.day - s.day : null; };
  E.isAssaultDay = s => { const w = E.nextWave(s); return !!w && w.day === s.day; };

  E.intel = function (s) {
    const w = E.nextWave(s);
    if (!w) return null;
    const exact = s.scouted || s.flags.scoutAll;
    let weights = Object.assign({}, w.focus);
    let lo = w.power, hi = w.power;
    if (!exact) {
      const r = mulberry32(s.seed * 31 + s.wavesDone * 7 + 3);
      let tot = 0;
      for (const sec of E.SECTORS) { weights[sec] = w.focus[sec] * (0.55 + 0.9 * r()); tot += weights[sec]; }
      for (const sec of E.SECTORS) weights[sec] /= tot;
      lo = Math.round(w.power * 0.75); hi = Math.round(w.power * 1.3);
    }
    return { wave: w, exact, weights, lo, hi, mid: Math.round((lo + hi) / 2) };
  };

  /* ---------------- defence strength ---------------- */
  function arrowFactor(s) {
    const need = E.SECTORS.reduce((a, sec) => a + s.garrison[sec].archer, 0) * E.UNIT.archer.arrows;
    return need <= 0 ? 1 : Math.min(1, s.arrows / need);
  }
  E.sectorDefense = function (s, sec) {
    const g = s.garrison[sec], U = E.UNIT;
    const wx = (s.weather === 'rain' || s.weather === 'storm') ? 0.75 : 1;
    const base = g.spear * U.spear.pow + g.archer * U.archer.pow * (0.4 + 0.6 * arrowFactor(s)) * wx + g.militia * U.militia.pow;
    const wallMult = 0.55 + 0.6 * s.walls[sec] / 100;
    const mm = 0.6 + 0.8 * s.morale / 100;
    return base * wallMult * mm * (1 + 0.12 * s.fort[sec]) * E.SECTOR_INFO[sec].terrain;
  };

  /* ---------------- bombardment ---------------- */
  E.bombard = function (s) {
    const hits = [];
    for (let i = 0; i < s.bombards; i++) {
      const w = E.nextWave(s);
      const pool = w ? E.SECTORS.filter(x => x !== 'cliff') : ['gate', 'east', 'curtain'];
      const sec = pool[Math.floor(s.rng() * pool.length)];
      const dmg = Math.round((6 + s.rng() * 6) * (1 - 0.15 * s.fort[sec]));
      s.walls[sec] = Math.max(0, s.walls[sec] - dmg);
      let killed = 0;
      if (s.rng() < 0.35 && E.assigned(s, sec) > 0) {
        const t = ['militia', 'archer', 'spear'].find(x => s.garrison[sec][x] > 0);
        s.garrison[sec][t]--; s.units[t]--; s.deaths++; killed = 1;
      }
      hits.push({ sector: sec, dmg, killed });
    }
    if (hits.length) s.morale = clamp(s.morale - 1, 0, 100);
    return hits;
  };

  /* ---------------- assault ---------------- */
  function loseUnits(s, sec, frac) {
    const dead = { spear: 0, archer: 0, militia: 0 }, hurt = { spear: 0, archer: 0, militia: 0 };
    for (const t of E.TYPES) {
      const n = s.garrison[sec][t];
      const loss = Math.min(n, Math.round(n * frac * E.UNIT[t].loss));
      const d = Math.ceil(loss * 0.65), w = loss - d;
      s.garrison[sec][t] -= loss; s.units[t] -= loss; s.wounded[t] += w;
      dead[t] = d; hurt[t] = w; s.deaths += d;
    }
    return { dead, hurt };
  }

  const KINDS = [
    { min: 1.5, kind: 'repelled', loss: 0.04, wall: 5, morale: 3 },
    { min: 1.1, kind: 'held',     loss: 0.10, wall: 10, morale: 1 },
    { min: 0.8, kind: 'bloody',   loss: 0.20, wall: 20, morale: -3 },
    { min: 0.55, kind: 'breach',  loss: 0.35, wall: 32, morale: -8 },
    { min: -1, kind: 'collapse',  loss: 0.55, wall: 48, morale: -14 }
  ];

  E.assault = function (s) {
    const w = E.nextWave(s);
    let power = w.power * (0.92 + s.rng() * 0.16);
    if (s.flags.enemyWeak) { power *= 0.85; s.flags.enemyWeak = false; }
    if (s.flags.sortieBonus) { power *= 0.88; s.flags.sortieBonus = false; }
    if (s.weather === 'storm') power *= 0.85;
    const need = E.SECTORS.reduce((a, sec) => a + s.garrison[sec].archer, 0) * E.UNIT.archer.arrows;
    const results = [];
    let moraleFx = 0, dead = 0, hurt = 0;
    for (const sec of E.SECTORS) {
      const A = Math.max(1, power * w.focus[sec]);
      const Dn = E.sectorDefense(s, sec);
      const ratio = Dn / A;
      const K = KINDS.find(k => ratio >= k.min);
      const manned = E.assigned(s, sec);
      const before = Object.assign({}, s.garrison[sec]);
      const lu = loseUnits(s, sec, manned ? K.loss : 0);
      const wallDmg = Math.round(K.wall * (1 - 0.1 * s.fort[sec]));
      s.walls[sec] = Math.max(sec === 'cliff' ? 0 : 0, s.walls[sec] - wallDmg);
      if (K.kind === 'collapse') { s.breaches++; if (s.walls[sec] < 8) s.walls[sec] = 8; }
      const d = E.TYPES.reduce((a, t) => a + lu.dead[t], 0), h = E.TYPES.reduce((a, t) => a + lu.hurt[t], 0);
      dead += d; hurt += h;
      moraleFx += K.morale * (w.focus[sec] > 0.2 ? 1 : 0.3);
      results.push({ sector: sec, attackers: Math.round(A), defense: Math.round(Dn), ratio, kind: K.kind, dead: d, hurt: h, wallDmg, manned: before });
    }
    s.arrows = Math.max(0, s.arrows - Math.round(need * (0.6 + 0.4 * (power / 100))));
    moraleFx = Math.round(clamp(moraleFx, -22, 10));
    s.morale = clamp(s.morale + moraleFx, 0, 100);
    s.wavesDone++;
    s.camp += 2;
    const worst = results.reduce((a, r) => KINDS.findIndex(k => k.kind === r.kind) > KINDS.findIndex(k => k.kind === a.kind) ? r : a, results[0]);
    const top = results.slice().sort((a, b) => b.attackers - a.attackers)[0];
    const bad = ['breach', 'collapse'].includes(worst.kind);
    s.dayNotes.push({
      real: `${w.name}: the Turks struck hardest at the ${E.SECTOR_INFO[top.sector].name}. ${dead} of ours are dead and ${hurt} wounded.` + (bad ? ` The ${E.SECTOR_INFO[worst.sector].name} nearly gave way.` : ''),
      glory: bad ? `The pagans broke upon our walls like surf upon rock, though the ${E.SECTOR_INFO[worst.sector].name} was sorely tried.` : `God and the stout hearts of Moldavia turned the heathen back, and few of ours fell.`
    });
    checkOver(s);
    return { wave: w, index: s.wavesDone, power: Math.round(power), results, moraleFx, dead, hurt, worst };
  };

  /* ---------------- orders ---------------- */
  E.ORDERS = [
    { id: 'repair', icon: '🧱', name: 'Repair walls', desc: 'Selected sector: walls +16', cost: { timber: 4 }, sector: true,
      can: (s, sec) => s.walls[sec] < 100 && s.timber >= 4,
      run: (s, sec) => { E.apply(s, { ['wall_' + sec]: 16, timber: -4 }); return { text: `Masons and militia patched the ${E.SECTOR_INFO[sec].name}.`, fx: { ['wall_' + sec]: 16, timber: -4 } }; } },
    { id: 'fortify', icon: '🛠️', name: 'Fortify sector', desc: 'Selected sector: +12% defence (max 3)', cost: { timber: 8 }, sector: true,
      can: (s, sec) => s.fort[sec] < 3 && s.timber >= 8,
      run: (s, sec) => { E.apply(s, { ['fort_' + sec]: 1, timber: -8 }); return { text: `Hoardings, stakes and cauldrons now crown the ${E.SECTOR_INFO[sec].name}.`, fx: { ['fort_' + sec]: 1, timber: -8 } }; } },
    { id: 'forge', icon: '🔨', name: 'Forge arrows', desc: 'Arrows +20', cost: {},
      can: () => true, run: s => { E.apply(s, { arrows: 20 }); return { text: 'The smithy rang until dusk.', fx: { arrows: 20 } }; } },
    { id: 'timber', icon: '🪓', name: 'Gather timber', desc: 'Timber +10', cost: {},
      can: () => true,
      run: s => { const fx = { timber: 10 }; let t = 'Work parties stripped beams from outbuildings.'; if (s.rng() < 0.15) { fx.militia = -1; t += ' A raider\'s arrow found one of them.'; } E.apply(s, fx); return { text: t, fx }; } },
    { id: 'drill', icon: '🛡️', name: 'Drill militia into spearmen', desc: '5 militia → 4 men-at-arms', cost: { timber: 4 },
      can: s => s.units.militia >= 5 && s.timber >= 4,
      run: s => { const fx = { militia: -5, spear: 4, timber: -4 }; E.apply(s, fx); s.deaths -= 5; return { text: 'Spears were issued and shield walls drilled in the yard.', fx }; } },
    { id: 'bows', icon: '🎯', name: 'Issue bows', desc: '4 militia → 4 archers', cost: { arrows: 12 },
      can: s => s.units.militia >= 4 && s.arrows >= 12,
      run: s => { const fx = { militia: -4, archer: 4, arrows: -12 }; E.apply(s, fx); s.deaths -= 4; return { text: 'Hunters and herdsmen were taught to loose in volleys.', fx }; } },
    { id: 'conscript', icon: '👥', name: 'Conscript civilians', desc: '6 civilians → 6 militia, morale −2', cost: {},
      can: s => s.civ >= 6,
      run: s => { const fx = { civ: -6, militia: 6, morale: -2 }; E.apply(s, fx); s.deaths -= 6; return { text: 'Farmers and cooks were handed clubs and told where to stand.', fx }; } },
    { id: 'scout', icon: '🔭', name: 'Scout the enemy', desc: 'Reveals the next assault exactly', cost: {},
      can: s => !s.scouted && !!E.nextWave(s),
      run: s => { s.scouted = true; const fx = {}; let t = 'A rider slipped out and counted tents, ladders and banners.';
        if (s.rng() < 0.2 && s.units.knight > 0) { fx.knight = -1; t += ' He did not return, but his tally did.'; } E.apply(s, fx); return { text: t, fx }; } },
    { id: 'forage', icon: '🐎', name: 'Night forage raid', desc: 'Food +22 (riders at risk)', cost: {},
      can: s => s.units.knight >= 2,
      run: s => { const fx = { food: 22 }; let t = 'Riders returned before dawn with sacks of grain and two stolen cows.';
        if (s.rng() < 0.35) { fx.knight = -2; fx.food = 12; t = 'The raid was ambushed. Two riders fell and half the grain was lost.'; } E.apply(s, fx); return { text: t, fx }; } },
    { id: 'sortie', icon: '🔥', name: 'Sortie against siege works', desc: 'Next assault −12% power (heavy risk)', cost: {},
      can: s => s.units.knight >= 3 && !!E.nextWave(s) && !s.flags.sortieBonus,
      run: s => { const fx = {}; let t = 'Horsemen fired siege baskets and fled back through the gate.'; s.flags.sortieBonus = true;
        if (s.rng() < 0.4) { fx.knight = -2; fx.militia = -3; t = 'The sortie burned a ladder cart but was cut off. Five did not return.'; } E.apply(s, fx); return { text: t, fx }; } },
    { id: 'rider', icon: '📜', name: 'Send rider to the Prince', desc: "Prince's trust +6", cost: {},
      can: s => s.units.knight >= 1,
      run: s => { const fx = { cred: 6 }; let t = 'A rider carried your seal through the hills to Prince Stephen.';
        if (s.rng() < 0.25) { fx.cred = 0; fx.knight = -1; t = 'The rider was caught by akinji. The Prince learns nothing.'; } E.apply(s, fx); return { text: t, fx }; } },
    { id: 'feast', icon: '🕯️', name: 'Mass and common meal', desc: 'Morale +8, food −5', cost: { food: 5 },
      can: s => s.food >= 5,
      run: s => { E.apply(s, { morale: 8, food: -5 }); return { text: 'The priest said mass in the yard and the bread was shared.', fx: { morale: 8, food: -5 } }; } },
    { id: 'tend', icon: '⚕️', name: 'Tend the wounded', desc: 'Half the wounded return to arms, food −2', cost: { food: 2 },
      can: s => E.woundedTotal(s) > 0 && s.food >= 2,
      run: s => { let n = 0; for (const t in s.wounded) { const b = Math.ceil(s.wounded[t] / 2); s.wounded[t] -= b; s.units[t] += b; n += b; } E.apply(s, { food: -2 }); return { text: `${n} wounded men took up arms again.`, fx: { food: -2 } }; } },
    { id: 'ration', icon: '🍞', name: 'Cut rations today', desc: 'Food use −40% today, morale −3', cost: {},
      can: s => !s.ration,
      run: s => { s.ration = true; E.apply(s, { morale: -3 }); return { text: 'Bowls were filled half full.', fx: { morale: -3 } }; } }
  ];
  E.woundedTotal = s => Object.values(s.wounded).reduce((a, b) => a + b, 0);

  E.doOrder = function (s, id, sec) {
    const o = E.ORDERS.find(x => x.id === id);
    if (!o || s.ap <= 0 || !o.can(s, sec)) return null;
    s.ap--;
    return o.run(s, sec);
  };

  /* ---------------- events ---------------- */
  E.pickEvent = function (s) {
    const EV = D().EVENTS;
    const ok = e => !s.used[e.id] && (!e.when || e.when(s));
    let ev = EV.find(e => e.day === s.day && ok(e));
    if (!ev) ev = EV.find(e => e.priority && s.day >= (e.minDay || 0) && ok(e));
    if (!ev) {
      if (s.rng() < 0.12) return null;
      const pool = EV.filter(e => !e.day && !e.priority && s.day >= (e.minDay || 0) && ok(e));
      if (!pool.length) return null;
      ev = pool[Math.floor(s.rng() * pool.length)];
    }
    s.used[ev.id] = true;
    return ev;
  };

  E.choices = function (s, ev) {
    const list = typeof ev.choices === 'function' ? ev.choices(s) : ev.choices;
    return list.filter(c => !c.when || c.when(s));
  };

  E.resolveChoice = function (s, ch) {
    const fx = Object.assign({}, ch.fx || {});
    let text = ch.text || '';
    if (ch.risk && s.rng() < ch.risk.p) {
      for (const k in ch.risk.fx) fx[k] = (fx[k] || 0) + ch.risk.fx[k];
      text += ' ' + ch.risk.text;
    }
    E.apply(s, fx);
    if (ch.set) Object.assign(s.flags, ch.set);
    if (ch.lieReset) s.lieDebt = ch.lieReset(s);
    if (ch.note) s.dayNotes.push(ch.note);
    checkOver(s);
    return { text, fx };
  };

  /* ---------------- chronicle ---------------- */
  function isBadDay(s) {
    if (!s.snap) return false;
    return s.morale < s.snap.morale - 2 || E.fighters(s) < s.snap.men - 2 || s.walls.gate + s.walls.east + s.walls.curtain < s.snap.walls - 15;
  }
  E.takeSnapshot = s => { s.snap = { morale: s.morale, men: E.fighters(s), walls: s.walls.gate + s.walls.east + s.walls.curtain }; };

  E.chronicleOptions = function (s) {
    const quiet = { real: 'A day without great events. Folk went about their work.', glory: 'A quiet day, kept by God\'s mercy and the vigilance of the watch.' };
    const list = s.dayNotes.length ? s.dayNotes : [quiet];
    const bad = isBadDay(s);
    return {
      bad,
      truth:   { tone: 'truth',   label: 'The bare truth', text: list.map(n => n.real).join(' '), fx: bad ? { cred: 3, morale: -3 } : { cred: 2, morale: 1 } },
      glory:   { tone: 'glory',   label: 'Embellished glory', text: list.map(n => n.glory).join(' '), fx: { cred: 1, morale: 4, lieDebt: 1 } },
      silence: { tone: 'silence', label: 'Say nothing', text: '(the page is left blank)', fx: { cred: -2 } }
    };
  };

  E.writeChronicle = function (s, tone) {
    const o = E.chronicleOptions(s)[tone];
    E.apply(s, o.fx);
    if (tone === 'truth') s.truths++; else if (tone === 'glory') s.lies++; else s.silences++;
    s.chronicle.push({ day: s.day, tone, text: o.text });
    return o;
  };

  /* ---------------- end of day ---------------- */
  E.endDay = function (s) {
    const log = [];
    const mouths = E.fighters(s) + s.units.knight + E.woundedTotal(s) + s.civ * 0.5;
    const per = Math.ceil(mouths / 12) * (s.ration ? 0.6 : 1);
    s.food = Math.max(0, s.food - Math.ceil(per));
    if (s.food <= 0) {
      const t = s.civ > 0 ? 'civ' : 'militia';
      const lose = Math.min(s.civ > 0 ? 4 : s.units.militia, 4);
      E.apply(s, { [t]: -lose, morale: -8 });
      log.push('The granary is empty. People starve in the dark.');
    } else if (s.food < 30) E.apply(s, { morale: -1 });
    for (const t in s.wounded) { const b = Math.ceil(s.wounded[t] * 0.25); s.wounded[t] -= b; s.units[t] += b; }
    s.villageBurn = clamp(s.villageBurn + 0.035, 0, 1);
    s.camp += 1;
    if (s.day === 6) s.bombards = Math.max(s.bombards, 1);
    if (s.day === 18) s.bombards = Math.max(s.bombards, 2);
    s.ration = false; s.scouted = false;
    E.normalizeGarrison(s);
    checkOver(s);
    if (!s.over) {
      s.day++; s.ap = E.AP; s.dayNotes = [];
      if (s.day > E.DAYS) s.over = s.cred >= E.CRED_NEEDED ? 'victory' : 'bitter';
      else E.rollWeather(s);
    }
    return log;
  };

  E.epilogue = function (s) {
    const total = s.truths + s.lies + s.silences || 1;
    const legacy = s.lies / total >= 0.5 ? 'the Teller of Legends' : s.truths / total >= 0.6 ? 'the Honest Chronicler' : 'the Careful Chronicler';
    return { legacy, truths: s.truths, lies: s.lies, silences: s.silences };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
  else root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
