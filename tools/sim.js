/* Balance simulation: node tools/sim.js */
const E = require('../js/engine.js');
globalThis.Engine = E;
require('../js/data.js');

function assignByThreat(s) {
  const it = E.intel(s);
  const w = it ? it.weights : { cliff: .1, curtain: .25, gate: .37, east: .28 };
  E.autoAssign(s, w);
}

function play(seed, pol) {
  const s = E.newGame(seed);
  E.rollWeather(s);
  while (!s.over) {
    E.takeSnapshot(s);
    const ev = E.pickEvent(s);
    if (ev) { const ch = E.choices(s, ev); E.resolveChoice(s, ch[pol.event(s, ch)]); }
    for (let i = 0; i < E.AP && !s.over; i++) { const o = pol.order(s); if (o) E.doOrder(s, o[0], o[1]); }
    if (!s.over && pol.assign) pol.assign(s);
    if (!s.over && E.isAssaultDay(s)) { E.bombard(s); E.assault(s); }
    else if (!s.over) E.bombard(s);
    if (!s.over) E.writeChronicle(s, pol.tone(s));
    if (!s.over) E.endDay(s);
  }
  return s;
}

function weakest(s) {
  const it = E.intel(s); const w = it ? it.weights : null;
  let best = null, bs = 1e9;
  for (const sec of E.SECTORS) { const sc = s.walls[sec] - (w ? w[sec] * 60 : 0); if (sc < bs) { bs = sc; best = sec; } }
  return best;
}
const smart = {
  event: () => 0,
  assign: assignByThreat,
  order: s => {
    const sec = weakest(s);
    if (s.food < 40 && !s.ration) return ['ration'];
    if (E.nextWave(s) && E.daysToAssault(s) <= 1 && !s.scouted) return ['scout'];
    if (s.units.militia >= 5 && s.timber >= 4 && s.units.spear < 60) return ['drill'];
    if (s.civ >= 6 && s.units.militia < 14) return ['conscript'];
    if (s.walls[sec] < 70 && s.timber >= 4) return ['repair', sec];
    if (s.morale < 50) return ['feast'];
    if (s.arrows < 40) return ['forge'];
    if (s.timber < 10) return ['timber'];
    if (E.woundedTotal(s) > 4) return ['tend'];
    if (s.fort[sec] < 2 && s.timber >= 8) return ['fortify', sec];
    return ['forge'];
  },
  tone: s => (s.lieDebt >= 2 ? 'truth' : 'glory')
};
const lazy = { event: () => 0, order: () => null, tone: () => 'glory' };
const rnd = { event: (s, ch) => Math.floor(s.rng() * ch.length),
  order: s => { const o = E.ORDERS.filter(a => a.can(s, 'gate')); const a = o[Math.floor(s.rng() * o.length)]; return a ? [a.id, E.SECTORS[Math.floor(s.rng() * 4)]] : null; },
  tone: s => ['truth', 'glory', 'silence'][Math.floor(s.rng() * 3)] };

for (const [name, pol] of [['smart', smart], ['lazy', lazy], ['random', rnd]]) {
  const res = {}; const N = 400; let days = 0;
  for (let i = 1; i <= N; i++) { const s = play(i, pol); res[s.over] = (res[s.over] || 0) + 1; days += s.day; }
  console.log(name.padEnd(7), JSON.stringify(res), 'avg day', (days / N).toFixed(1));
}
