/* Interfața: desenează starea motorului în pagină. */
(function () {
  'use strict';
  const { SCENARIO, EVENTS, ENDINGS } = window.GameData;
  const $ = id => document.getElementById(id);
  const FALLBACK_BG = 'radial-gradient(ellipse at 50% 120%, #5a3b1f 0%, #2a1d12 55%, #17120d 100%)';
  let s = null;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in (attrs || {})) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'onclick') el.addEventListener('click', attrs[k]);
      else if (k === 'html') el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }

  function scene(name, caption) {
    $('scene').style.backgroundImage = `url(assets/img/scene_${name}.jpg), ${FALLBACK_BG}`;
    $('scene-caption').textContent = caption || '';
  }

  function btn(label, sub, fn, cls, disabled) {
    const b = h('button', { class: 'btn ' + (cls || ''), onclick: () => { Sound.play('click'); fn(); } }, label, sub ? h('small', {}, sub) : null);
    if (disabled) b.disabled = true;
    return b;
  }

  function show(...kids) { const c = $('card'); c.replaceChildren(...kids.flat().filter(Boolean)); }

  /* ---- bară de resurse ---- */
  const RES = [['food', '🌾'], ['morale', '🕯'], ['men', '⚔'], ['arrows', '🏹'], ['walls', '🧱'], ['cred', '👑']];
  let lastVals = null;
  function renderBar() {
    $('day').textContent = s ? `Ziua ${Math.min(s.day, Engine.DAYS)} / ${Engine.DAYS}` : '';
    const box = $('resources'); box.replaceChildren();
    if (!s) return;
    for (const [k, icon] of RES) {
      const v = s[k];
      const low = (k === 'food' && v < 30) || (k === 'morale' && v < 25) || (k === 'men' && v < 20) || (k === 'walls' && v < 30) || (k === 'cred' && v < Engine.CRED_NEEDED);
      const el = h('div', { class: 'res' + (low ? ' low' : ''), title: Engine.LABELS[k] }, h('span', { class: 'l' }, icon + ' ' + Engine.LABELS[k]), h('b', {}, String(v)));
      if (lastVals && lastVals[k] !== v) {
        const d = v - lastVals[k];
        el.append(h('span', { class: 'delta ' + (d > 0 ? 'up' : 'down') }, (d > 0 ? '+' : '−') + Math.abs(d)));
      }
      box.append(el);
    }
    lastVals = Object.fromEntries(RES.map(([k]) => [k, s[k]]));
  }

  function renderChron() {
    const list = $('chron-list');
    if (!s || !s.chronicle.length) { list.innerHTML = '<p class="muted">Pagina e încă goală.</p>'; return; }
    list.replaceChildren(...s.chronicle.map(e => h('p', { class: 'entry tone-' + e.tone }, h('b', {}, `Ziua ${e.day}. `), e.text)));
    list.scrollTop = list.scrollHeight;
  }

  /* ---- ecrane ---- */
  function title() {
    s = null; lastVals = null; renderBar(); renderChron();
    scene('title', SCENARIO.title);
    Sound.music('music_menu');
    show(
      h('h1', {}, 'Cronicarul Cetății'),
      h('p', { class: 'muted' }, 'Demo · un joc de strategie istorică despre asediu, încredere și adevărul scris'),
      SCENARIO.intro.map(t => h('p', {}, t)),
      h('div', { class: 'row' }, btn('Începe asediul', null, start, 'primary'))
    );
  }

  function start() {
    s = Engine.newGame();
    lastVals = null;
    Sound.music('music_game');
    beginDay();
  }

  function beginDay() {
    s.snap = { morale: s.morale, men: s.men, walls: s.walls };
    s.dayNotes = [];
    renderBar();
    const ev = Engine.pickEvent(s, EVENTS);
    if (ev) return showEvent(ev);
    scene('quiet', `Ziua ${s.day}`);
    show(h('h2', {}, `Ziua ${s.day}`),
      h('p', {}, 'Dimineață liniștită. Nicio veste nouă de pe ziduri.'),
      h('div', { class: 'row' }, btn('Mergi la treburi', null, showActions, 'primary')));
  }

  function showEvent(ev) {
    scene(ev.id, `Ziua ${s.day} · ${ev.title}`);
    const box = h('div', { class: 'choices' });
    for (const ch of Engine.choices(s, ev)) {
      box.append(btn(ch.label, null, () => {
        const r = Engine.resolveChoice(s, ch);
        renderBar();
        if (s.over) return finish();
        show(h('h2', {}, ev.title), h('p', {}, ev.text), h('p', { class: 'quote' }, r.text),
          h('p', { class: 'fx' }, Engine.fxSummary(r.fx)),
          h('div', { class: 'row' }, btn('Mai departe', null, showActions, 'primary')));
      }));
    }
    show(h('h2', {}, ev.title), h('p', {}, ev.text), box);
  }

  let lastAction = null;
  function showActions() {
    scene('cetate', `Ziua ${s.day} · Treburile cetății`);
    const box = h('div', { class: 'choices' });
    for (const a of Engine.ACTIONS) {
      box.append(btn(a.label, a.desc, () => {
        const r = Engine.doAction(s, a.id);
        lastAction = r;
        renderBar();
        if (s.over) return finish();
        showActions();
      }, '', s.ap <= 0 || !a.can(s)));
    }
    show(h('h2', {}, 'Ce poruncești azi?'),
      h('p', {}, 'Mai ai ', h('span', { class: 'ap' }, `${s.ap} ${s.ap === 1 ? 'poruncă' : 'porunci'}`), ' pentru ziua de azi.'),
      lastAction ? h('p', { class: 'quote' }, lastAction.text) : null,
      lastAction ? h('p', { class: 'fx' }, Engine.fxSummary(lastAction.fx)) : null,
      box,
      h('div', { class: 'row' }, btn(Engine.isAssaultDay(s) ? 'Așteaptă asaltul' : 'Încheie ziua', null, () => { lastAction = null; nightfall(); }, 'primary')));
  }

  function nightfall() {
    if (Engine.isAssaultDay(s)) {
      const r = Engine.assault(s);
      renderBar();
      Sound.play('assault');
      scene('asalt', `Asaltul ${r.index} · ${r.enemy} dușmani`);
      const txt = {
        decisive: 'Asaltul a fost respins cu ușurință. Dușmanul se retrage.',
        held: 'Zidurile au ținut, dar cu greu. Mulți au căzut.',
        breach: 'Turcii au pătruns un moment pe zid. Ai pierdut oameni și un colț din cetate.',
        collapse: 'Asaltul a aproape doborât cetatea. Zidul geme.'
      }[r.kind];
      if (s.over) return finish();
      show(h('h2', {}, `Asaltul ${r.index}`), h('p', {}, txt),
        h('p', { class: 'fx' }, `Dușmani: ${r.enemy} · Apărare: ${r.defense}`),
        h('p', { class: 'fx' }, Engine.fxSummary(r.fx)),
        h('div', { class: 'row' }, btn('Scrie cronica', null, showChronicle, 'primary')));
    } else showChronicle();
  }

  function showChronicle() {
    scene('cronica', `Ziua ${s.day} · Cronica de seară`);
    const o = Engine.chronicleOptions(s);
    const box = h('div', { class: 'choices' });
    for (const k of ['truth', 'glory', 'silence']) {
      const opt = o[k];
      box.append(btn(opt.label, null, () => {
        Sound.play('quill');
        Engine.writeChronicle(s, k);
        renderBar(); renderChron();
        if (s.over) return finish();
        const log = Engine.endDay(s);
        renderBar();
        if (s.over) return finish();
        if (log.length) { show(h('h2', {}, 'Noapte grea'), log.map(t => h('p', {}, t)), h('div', { class: 'row' }, btn('Ziua următoare', null, beginDay, 'primary'))); }
        else beginDay();
      }, 'tone-' + k));
      const b = box.lastChild;
      b.append(h('small', {}, '„' + opt.text + '”'), h('small', {}, opt.hint));
    }
    show(h('h2', {}, 'Ce scrii în cronică?'),
      h('p', {}, 'Garnizoana îți ascultă cronica seara. Domnul o citește prin soli. Ce scrii schimbă ce simt și ce cred ei.'),
      box);
  }

  function finish() {
    renderBar(); renderChron();
    const e = ENDINGS[s.over];
    const ep = Engine.epilogue(s);
    const good = s.over === 'victory' || s.over === 'bitter';
    scene(good ? 'victorie' : 'infrangere', e.title);
    Sound.play(good ? 'victory' : 'defeat');
    const full = s.chronicle.map(c => `Ziua ${c.day}. ${c.text}`).join('\n');
    show(h('h1', {}, e.title), h('p', {}, e.text),
      h('p', {}, `Istoria te va ține minte ca „${ep.legacy}”.`),
      h('p', { class: 'fx' }, `Zile: adevăr ${ep.truths} · slavă ${ep.lies} · tăcere ${ep.silences} · Datoria minciunii ${s.lieDebt}`),
      h('div', { class: 'row' },
        btn('Joacă din nou', null, title, 'primary'),
        btn('Copiază cronica', null, () => { try { navigator.clipboard.writeText(`Cronica cetății Neamț (1476)\n\n${full}`); } catch (er) {} })));
  }

  $('mute').addEventListener('click', () => $('mute').classList.toggle('off', Sound.toggle()));
  $('mute').classList.toggle('off', Sound.isMuted());
  title();
})();
