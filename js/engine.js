/* Motorul jocului: logică pură, fără DOM (testabil în Node). */
(function (root) {
  'use strict';
  const Engine = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  Engine.DAYS = 30;
  Engine.ASSAULT_DAYS = [4, 8, 12, 16, 20, 24, 28];
  Engine.ACTIONS_PER_DAY = 2;
  Engine.CRED_NEEDED = 35;

  Engine.LABELS = {
    food: 'Hrană', morale: 'Moral', men: 'Oșteni', arrows: 'Săgeți',
    walls: 'Ziduri', cred: 'Încrederea Domnului', drill: 'Disciplină', lieDebt: 'Datoria minciunii'
  };

  Engine.newGame = function (seed) {
    seed = seed == null ? (Date.now() & 0xffffffff) : seed;
    return {
      seed, rng: mulberry32(seed), day: 1,
      food: 165, morale: 60, men: 60, arrows: 50, walls: 80, cred: 50,
      drill: 0, lieDebt: 0, truths: 0, lies: 0, silences: 0,
      ap: Engine.ACTIONS_PER_DAY, ration: false,
      used: {}, flags: {}, chronicle: [], dayNotes: [], assaults: [],
      snap: null, over: null, ending: null
    };
  };

  /* ---- efecte ---- */
  function apply(s, fx) {
    if (!fx) return;
    for (const k in fx) {
      s[k] += fx[k];
    }
    s.morale = clamp(s.morale, 0, 100);
    s.cred = clamp(s.cred, 0, 100);
    s.walls = clamp(s.walls, 0, 100);
    s.drill = clamp(s.drill, 0, 20);
    s.food = Math.max(0, s.food);
    s.arrows = clamp(s.arrows, 0, 150);
    s.men = Math.max(0, s.men);
    s.lieDebt = Math.max(0, s.lieDebt);
  }
  Engine.apply = apply;

  Engine.fxSummary = function (fx) {
    if (!fx) return '';
    return Object.keys(fx).filter(k => fx[k] && Engine.LABELS[k] && k !== 'lieDebt' && k !== 'drill')
      .map(k => Engine.LABELS[k] + ' ' + (fx[k] > 0 ? '+' : '−') + Math.abs(fx[k])).join(' · ');
  };

  function checkOver(s) {
    if (s.over) return;
    if (s.men <= 0) s.over = 'fall';
    else if (s.morale <= 0) s.over = 'mutiny';
    else if (s.walls <= 0 && s.assaults.length && s.flags.lastAssaultBad) s.over = 'fall';
  }

  /* ---- evenimente ---- */
  Engine.pickEvent = function (s, EVENTS) {
    const avail = e => !s.used[e.id] && (!e.when || e.when(s));
    let ev = EVENTS.find(e => e.day === s.day && avail(e));
    if (!ev) ev = EVENTS.find(e => e.priority && s.day >= (e.minDay || 0) && avail(e));
    if (!ev) {
      if (s.rng() < 0.15) return null;
      const pool = EVENTS.filter(e => !e.day && !e.priority && s.day >= (e.minDay || 0) && avail(e));
      if (!pool.length) return null;
      ev = pool[Math.floor(s.rng() * pool.length)];
    }
    s.used[ev.id] = true;
    return ev;
  };

  Engine.choices = function (s, ev) {
    const list = typeof ev.choices === 'function' ? ev.choices(s) : ev.choices;
    return list.filter(c => !c.when || c.when(s));
  };

  Engine.resolveChoice = function (s, ch) {
    let fx = Object.assign({}, ch.fx || {});
    let text = ch.text || '';
    if (ch.risk && s.rng() < ch.risk.p) {
      for (const k in ch.risk.fx) fx[k] = (fx[k] || 0) + ch.risk.fx[k];
      text += ' ' + ch.risk.text;
    }
    apply(s, fx);
    if (ch.set) Object.assign(s.flags, ch.set);
    if (ch.lieReset != null) s.lieDebt = ch.lieReset(s);
    if (ch.note) s.dayNotes.push(ch.note);
    checkOver(s);
    return { text, fx };
  };

  /* ---- acțiuni ---- */
  Engine.ACTIONS = [
    { id: 'repair', label: 'Repară zidurile', desc: 'Ziduri +14',
      can: s => s.walls < 100, run: s => { apply(s, { walls: 14 }); return { text: 'Zidarii și țăranii au cârpit spărturile cu bolovani și bârne.', fx: { walls: 14 } }; } },
    { id: 'arrows', label: 'Făurește săgeți', desc: 'Săgeți +18',
      can: () => true, run: s => { apply(s, { arrows: 18 }); return { text: 'Fierarii au lucrat până la apus.', fx: { arrows: 18 } }; } },
    { id: 'drill', label: 'Instruiește garnizoana', desc: 'Disciplină +4, Moral −2',
      can: s => s.drill < 20, run: s => { apply(s, { drill: 4, morale: -2 }); return { text: 'Oștenii au exersat posturile și semnalele de alarmă.', fx: { morale: -2 } }; } },
    { id: 'recruit', label: 'Cheamă țăranii din munți', desc: 'Oșteni +5, Hrană −4 (de 6 ori)',
      can: s => (s.flags.recruits || 0) < 6, run: s => { s.flags.recruits = (s.flags.recruits || 0) + 1; apply(s, { men: 5, food: -4 }); return { text: 'Păstori și vânători au coborât la cetate, cu topoare și arcuri.', fx: { men: 5, food: -4 } }; } },
    { id: 'feast', label: 'Slujbă și masă comună', desc: 'Moral +8, Hrană −5',
      can: s => s.food >= 5, run: s => { apply(s, { morale: 8, food: -5 }); return { text: 'Preotul a slujit în curte, iar oamenii au mâncat împreună.', fx: { morale: 8, food: -5 } }; } },
    { id: 'ration', label: 'Împarte hrana cu zgârcenie', desc: 'Consum −40% azi, Moral −3',
      can: s => !s.ration, run: s => { s.ration = true; apply(s, { morale: -3 }); return { text: 'Pârcălabul a poruncit porții mai mici.', fx: { morale: -3 } }; } },
    { id: 'envoy', label: 'Trimite sol la Domn', desc: 'Încrederea +5, Oșteni −1 (risc)',
      can: s => s.men > 5, run: s => {
        const fx = { cred: 5, men: -1 };
        let text = 'Un călăreț a ieșit noaptea pe poarta tainică, cu veștile cetății.';
        if (s.rng() < 0.25) { fx.cred = 0; text = 'Solul a fost prins de iscoadele turcești. Nu s-a mai auzit de el.'; }
        apply(s, fx); return { text, fx };
      } }
  ];

  Engine.doAction = function (s, id) {
    const a = Engine.ACTIONS.find(x => x.id === id);
    if (!a || s.ap <= 0 || !a.can(s)) return null;
    s.ap--;
    const r = a.run(s);
    checkOver(s);
    return r;
  };

  /* ---- asalt ---- */
  Engine.isAssaultDay = s => Engine.ASSAULT_DAYS.includes(s.day);

  Engine.assault = function (s) {
    const k = s.assaults.length;
    const bonus = s.flags.enemyWeak ? 0.88 : 1;
    s.flags.enemyWeak = false;
    const enemy = Math.round((55 + 24 * k) * (0.9 + s.rng() * 0.25) * bonus);
    const used = Math.min(s.arrows, 8 + 3 * k);
    const moraleMult = 0.55 + (s.morale / 100) * 0.9;
    const base = s.men * 1.3 + s.walls * 0.5 + used * 1.4;
    const def = Math.round(base * moraleMult * (1 + s.drill / 100));
    const margin = def - enemy;
    let kind, menLoss, wallLoss, moraleFx;
    if (margin >= enemy * 0.4) { kind = 'decisive'; menLoss = enemy / 22; wallLoss = enemy / 15; moraleFx = 8; }
    else if (margin >= 0) { kind = 'held'; menLoss = enemy / 13; wallLoss = enemy / 9; moraleFx = 2; }
    else if (margin > -enemy * 0.35) { kind = 'breach'; menLoss = enemy / 7; wallLoss = enemy / 5; moraleFx = -10; }
    else { kind = 'collapse'; menLoss = enemy / 4.5; wallLoss = enemy / 3.5; moraleFx = -18; }
    menLoss = Math.round(menLoss); wallLoss = Math.round(wallLoss);
    const fx = { men: -menLoss, walls: -wallLoss, morale: moraleFx, arrows: -used };
    apply(s, fx);
    s.flags.lastAssaultBad = kind === 'collapse';
    if (kind === 'collapse' && s.walls <= 15) s.over = 'fall';
    const res = { index: k + 1, enemy, defense: def, kind, fx };
    s.assaults.push(res);
    const N = {
      decisive: { real: `Asaltul a fost respins cu pierderi mici (${menLoss} oșteni căzuți).`, glory: 'Păgânii au fugit înaintea cetății ca praful înaintea vântului, iar nimeni nu a pierit în afară de câțiva viteji.' },
      held: { real: `Zidurile au rezistat, dar ${menLoss} oșteni au căzut.`, glory: 'Cetatea a stat neclintită, ca stânca lui Dumnezeu, și vrăjmașul a plecat rușinat.' },
      breach: { real: `Turcii au intrat o clipă pe zid. Am pierdut ${menLoss} oșteni și o parte din ziduri.`, glory: 'Vrăjmașul a atins zidul, dar viteji de-ai noștri l-au azvârlit îndărăt fără mare zăbavă.' },
      collapse: { real: `Asaltul aproape ne-a doborât: ${menLoss} morți și ziduri prăbușite.`, glory: 'Ziua a fost grea, dar cetatea nu a încetat nicio clipă să se roage și să lupte.' }
    }[kind];
    s.dayNotes.push(N);
    checkOver(s);
    return res;
  };

  /* ---- cronică ---- */
  Engine.chronicleOptions = function (s) {
    const notes = s.dayNotes;
    const quiet = { real: 'Zi fără întâmplări de seamă. Oamenii și-au văzut de treabă.', glory: 'Zi liniștită, păzită de mila Domnului și de straja cea vitează.' };
    const list = notes.length ? notes : [quiet];
    const bad = isBadDay(s);
    return {
      bad,
      truth: { tone: 'truth', label: 'Adevărul gol', text: list.map(n => n.real).join(' '),
        hint: bad ? 'Încredere +3, Moral −3' : 'Încredere +2, Moral +1' },
      glory: { tone: 'glory', label: 'Slava înfrumusețată', text: list.map(n => n.glory).join(' '),
        hint: 'Moral +4, Încredere +1, Datoria minciunii +1' },
      silence: { tone: 'silence', label: 'Tăcere', text: '(fără însemnare)',
        hint: 'Încredere −2' }
    };
  };

  function isBadDay(s) {
    if (!s.snap) return false;
    return s.morale < s.snap.morale - 2 || s.men < s.snap.men - 2 || s.walls < s.snap.walls - 8;
  }

  Engine.writeChronicle = function (s, tone) {
    const opts = Engine.chronicleOptions(s);
    const o = opts[tone];
    let fx;
    if (tone === 'truth') { fx = opts.bad ? { cred: 3, morale: -3 } : { cred: 2, morale: 1 }; s.truths++; }
    else if (tone === 'glory') { fx = { cred: 1, morale: 4, lieDebt: 1 }; s.lies++; }
    else { fx = { cred: -2 }; s.silences++; }
    apply(s, fx);
    s.chronicle.push({ day: s.day, tone, text: o.text });
    checkOver(s);
    return o;
  };

  /* ---- sfârșit de zi ---- */
  Engine.endDay = function (s) {
    const per = Math.ceil(s.men / 12) * (s.ration ? 0.6 : 1);
    const eat = Math.min(s.food, Math.ceil(per));
    s.food -= eat;
    const log = [];
    if (s.food <= 0) {
      apply(s, { men: -4, morale: -8 });
      log.push('Hambarele sunt goale. Oamenii slăbesc și mor de foame.');
    } else if (s.food < 30) {
      apply(s, { morale: -1 });
    }
    s.ration = false;
    checkOver(s);
    if (!s.over) {
      s.day++;
      s.ap = Engine.ACTIONS_PER_DAY;
      if (s.day > Engine.DAYS) {
        s.over = s.cred >= Engine.CRED_NEEDED ? 'victory' : 'bitter';
      }
    }
    return log;
  };

  Engine.epilogue = function (s) {
    const total = s.truths + s.lies + s.silences || 1;
    let legacy;
    if (s.lies / total >= 0.5) legacy = 'Povestitorul de legende';
    else if (s.truths / total >= 0.6) legacy = 'Cronicarul cinstit';
    else legacy = 'Cronicarul prudent';
    return { legacy, truths: s.truths, lies: s.lies, silences: s.silences };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
