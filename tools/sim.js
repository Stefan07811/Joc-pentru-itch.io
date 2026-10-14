/* Simulare de echilibrare: node tools/sim.js */
const Engine = require('../js/engine.js');
globalThis.Engine = Engine;
require('../js/data.js');
const { EVENTS } = globalThis.GameData;

function play(seed, policy) {
  const s = Engine.newGame(seed);
  while (!s.over) {
    s.snap = { morale: s.morale, men: s.men, walls: s.walls };
    s.dayNotes = [];
    const ev = Engine.pickEvent(s, EVENTS);
    if (ev) {
      const ch = Engine.choices(s, ev);
      Engine.resolveChoice(s, ch[policy.event(s, ch)]);
    }
    for (let i = 0; i < 2 && !s.over; i++) {
      const id = policy.action(s);
      if (id) Engine.doAction(s, id);
    }
    if (!s.over && Engine.isAssaultDay(s)) Engine.assault(s);
    if (!s.over) Engine.writeChronicle(s, policy.tone(s));
    if (!s.over) Engine.endDay(s);
  }
  return s;
}

const smart = {
  event: (s, ch) => 0,
  action: s => {
    const next = Engine.ASSAULT_DAYS.find(d => d >= s.day);
    if (s.food < 25 && !s.ration) return 'ration';
    if (s.men < 50 && (s.flags.recruits||0) < 6) return 'recruit';
    if (s.morale < 45) return 'feast';
    if (s.walls < 55) return 'repair';
    if (s.arrows < 40) return 'arrows';
    if (s.drill < 10) return 'drill';
    if (s.cred < 55) return 'envoy';
    return 'repair';
  },
  tone: s => (s.lieDebt >= 2 ? 'truth' : 'glory')
};
const lazy = { event: () => 0, action: () => null, tone: () => 'glory' };

for (const [name, pol] of [['smart', smart], ['lazy', lazy]]) {
  const res = {};
  const N = 500;
  let days = 0;
  for (let i = 1; i <= N; i++) {
    const s = play(i, pol);
    res[s.over] = (res[s.over] || 0) + 1;
    days += s.day;
  }
  console.log(name, res, 'avg day', (days / N).toFixed(1));
}

const ids = Engine.ACTIONS.map(a => a.id);
const rnd = { event: (s, ch) => Math.floor(s.rng() * ch.length),
  action: s => { const ok = Engine.ACTIONS.filter(a => a.can(s)); return ok[Math.floor(s.rng() * ok.length)].id; },
  tone: s => ['truth', 'glory', 'silence'][Math.floor(s.rng() * 3)] };
const r = {}; for (let i = 1; i <= 500; i++) { const s = play(i, rnd); r[s.over] = (r[s.over] || 0) + 1; }
console.log('random', r);
