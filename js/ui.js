/* UI + game flow: dawn event → day orders → assault → night chronicle. */
(function () {
  'use strict';
  const { SCENARIO, EVENTS, ENDINGS } = window.GameData;
  const E = window.Engine;
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let s = null;
  let tab = 'defense';
  let sel = 'gate';
  let canAct = false;          // player may give orders / move troops
  let dayResolve = null;
  let phase = 'title';
  let lastVals = null;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in (attrs || {})) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'onclick') el.addEventListener('click', attrs[k]);
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  const click = () => Sound.play('click');

  /* ---------------- view model for the scene ---------------- */
  function viewOf() {
    return {
      day: s.day, walls: Object.assign({}, s.walls), fort: Object.assign({}, s.fort),
      garrison: JSON.parse(JSON.stringify(s.garrison)),
      tents: 6 + s.camp, bombards: s.bombards, villageBurn: s.villageBurn, deaths: s.deaths, morale: s.morale, weather: s.weather
    };
  }
  function syncScene(instant) { if (s) Scene.sync(viewOf(), instant); }

  /* ---------------- toast ---------------- */
  function toast(html, ms) {
    const t = h('div', { class: 'toast', html });
    $('toast').append(t);
    setTimeout(() => t.remove(), (ms || 4200));
    while ($('toast').children.length > 3) $('toast').firstChild.remove();
  }

  /* ---------------- HUD ---------------- */
  function foodDays() {
    const mouths = E.fighters(s) + s.units.knight + E.woundedTotal(s) + s.civ * 0.5;
    const per = Math.max(1, Math.ceil(mouths / 12));
    return Math.floor(s.food / per);
  }
  function renderHUD() {
    const ph = [['dawn', 'Dawn'], ['day', 'Orders'], ['assault', 'Battle'], ['night', 'Chronicle']];
    $('phases').replaceChildren(...ph.map(([k, n]) => h('div', { class: 'ph' + (phase === k ? ' on' : '') }, n)));
    const box = $('res'); box.replaceChildren();
    if (!s) return;
    const dayChip = h('div', { class: 'rc' }, h('span', { class: 'ic' }, '📅'), h('div', {}, h('small', {}, 'Day'), h('b', {}, `${Math.min(s.day, E.DAYS)} / ${E.DAYS}`)));
    box.append(dayChip);
    const R = [
      ['food', '🌾', 'Food', s.food, `${foodDays()}d left`, foodDays() < 6],
      ['morale', '🕯️', 'Morale', s.morale, null, s.morale < 30, s.morale],
      ['arrows', '🏹', 'Arrows', s.arrows, null, s.arrows < 15],
      ['timber', '🪵', 'Timber', s.timber, null, s.timber < 5],
      ['cred', '👑', "Prince's trust", s.cred, `need ${E.CRED_NEEDED}`, s.cred < E.CRED_NEEDED, s.cred],
      ['breach', '⚠️', 'Breaches', `${s.breaches} / 3`, null, s.breaches >= 2]
    ];
    for (const [k, ic, label, v, note, low, bar] of R) {
      const el = h('div', { class: 'rc' + (low ? ' low' : ''), title: label + (note ? ' · ' + note : '') },
        h('span', { class: 'ic' }, ic), h('div', {}, h('small', {}, label), h('b', {}, String(v))));
      if (bar != null) el.append(h('div', { class: 'mini' }, h('i', { style: `width:${bar}%` })));
      if (lastVals && typeof v === 'number' && lastVals[k] != null && lastVals[k] !== v) {
        const d = v - lastVals[k]; el.append(h('span', { class: 'd ' + (d > 0 ? 'up' : 'down') }, (d > 0 ? '+' : '−') + Math.abs(d)));
      }
      box.append(el);
    }
    lastVals = { food: s.food, morale: s.morale, arrows: s.arrows, timber: s.timber, cred: s.cred };
  }

  /* ---------------- bottom bar ---------------- */
  function renderBar() {
    const bar = $('intel'); bar.replaceChildren();
    if (!s) return;
    const w = E.nextWave(s);
    if (w) {
      const d = w.day - s.day;
      bar.append(h('span', {}, d === 0 ? h('b', {}, 'Assault today: ') : 'Next assault in ', d === 0 ? '' : h('b', {}, `${d} day${d === 1 ? '' : 's'}`), ' · ', w.name));
      const it = E.intel(s);
      const hh = E.hostProgress(s);
      bar.append(h('span', { class: 'sub' }, `👑 Prince's host: ${hh.eta === 0 ? 'arrived' : '~' + hh.eta + ' days away'}`));
      bar.append(h('span', { class: 'sub' }, it.exact ? `Scouted: about ${it.lo} attackers, red arrows show where they strike.` : `Estimate: ${it.lo}–${it.hi} attackers. Scout to see exactly where they strike.`));
    } else bar.append(h('span', {}, h('b', {}, 'No more assaults. '), 'Survive until the Prince arrives.'));
    const ap = $('ap'); ap.replaceChildren(h('span', {}, 'Orders'), ...Array.from({ length: E.AP }, (_, i) => h('i', { class: 'pip' + (i < s.ap ? ' on' : '') })));
    const b = $('btn-end');
    b.disabled = !canAct;
    b.textContent = E.isAssaultDay(s) ? 'Man the walls!' : 'End the day';
  }

  /* ---------------- side panel ---------------- */
  function renderTabs() {
    const names = [['defense', 'Defence'], ['orders', 'Orders'], ['army', 'Army'], ['map', 'Map'], ['chron', 'Chronicle']];
    $('tabs').replaceChildren(...names.map(([k, n]) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { click(); tab = k; renderSide(); } }, n)));
  }
  function renderSide() {
    renderTabs();
    const p = $('panel'); const keep = p.scrollTop;
    p.replaceChildren();
    if (!s) return;
    if (tab === 'defense') p.append(defensePanel());
    else if (tab === 'orders') p.append(ordersPanel());
    else if (tab === 'army') p.append(armyPanel());
    else if (tab === 'map') p.append(mapPanel());
    else p.append(chronPanel());
    p.scrollTop = keep;
  }

  function verdict(ratio) {
    if (ratio >= 1.5) return ['Secure', '#7fa65a'];
    if (ratio >= 1.1) return ['Should hold', '#a5b95a'];
    if (ratio >= 0.8) return ['Contested: heavy losses', '#d6a23c'];
    if (ratio >= 0.55) return ['Breach likely', '#d0683a'];
    return ['Will collapse', '#c0483a'];
  }

  function defensePanel() {
    const box = h('div');
    box.append(h('div', { class: 'h3' }, 'Sector'));
    box.append(h('div', { class: 'chips' }, E.SECTORS.map((sec, i) => h('button', { class: 'chip' + (sel === sec ? ' on' : ''), onclick: () => { click(); selectSector(sec); } }, `${i + 1} · ${E.SECTOR_INFO[sec].name}`))));
    const info = E.SECTOR_INFO[sel];
    const hp = s.walls[sel];
    box.append(h('div', { class: 'h3' }, info.name));
    box.append(h('div', { class: 'kv' }, 'Walls', h('b', {}, `${Math.round(hp)} / 100`)));
    box.append(h('div', { class: 'bar' }, h('i', { style: `width:${hp}%;background:${hp > 55 ? '#7fa65a' : hp > 28 ? '#d09a3a' : '#c1493a'}` })));
    box.append(h('div', { class: 'kv' }, 'Fortifications', h('span', { class: 'pips' }, [0, 1, 2].map(i => h('i', { class: i < s.fort[sel] ? 'on' : '' })))));
    // threat meter
    const D = E.sectorDefense(s, sel);
    const it = E.intel(s);
    if (it) {
      const lo = it.lo * it.weights[sel], hi = it.hi * it.weights[sel], mid = (lo + hi) / 2;
      const max = Math.max(D, hi) * 1.25 || 1;
      const [vt, vc] = verdict(D / Math.max(1, mid));
      box.append(h('div', { class: 'h3' }, 'Expected assault'));
      box.append(h('div', { class: 'meter', title: 'Green: your defence. Red band: enemy strength.' },
        h('div', { class: 'def', style: `width:${D / max * 100}%;background:${vc}` }),
        h('div', { class: 'band', style: `left:${lo / max * 100}%;width:${Math.max(1.5, (hi - lo) / max * 100)}%` })));
      box.append(h('div', { class: 'verdict' }, h('b', { style: `color:${vc}` }, vt), h('span', { class: 'note' }, `  · defence ${Math.round(D)} vs enemy ${Math.round(lo)}${hi - lo > 1 ? '–' + Math.round(hi) : ''}`)));
      if (s.weather === 'rain' || s.weather === 'storm') box.append(h('div', { class: 'note' }, '🌧️ Rain slackens bowstrings: archers fight at 75%.'));
    } else box.append(h('div', { class: 'note' }, 'No further assaults are expected.'));
    // units
    box.append(h('div', { class: 'h3' }, 'Garrison'));
    for (const t of E.TYPES) {
      const cur = s.garrison[sel][t], res = E.reserve(s, t);
      const info = E.UNIT[t];
      const hint = t === 'spear' ? 'Strongest on the wall' : t === 'archer' ? `Need arrows (${s.arrows} left)` : 'Weak, dies quickly';
      const set = n => { E.setAssign(s, sel, t, n); refresh(); };
      box.append(h('div', { class: 'urow' }, h('span', { style: 'font-size:1.3rem' }, E.ICON[t]),
        h('div', { class: 'nm' }, info.name, h('small', {}, `${hint} · ${res} in reserve`)),
        h('div', { class: 'step' },
          h('button', { disabled: !canAct || cur <= 0, onclick: ev => { click(); set(cur - (ev.shiftKey ? 5 : 1)); } }, '−'),
          h('span', {}, String(cur)),
          h('button', { disabled: !canAct || res <= 0, onclick: ev => { click(); set(cur + (ev.shiftKey ? 5 : 1)); } }, '+'))));
    }
    box.append(h('div', { class: 'row', style: 'justify-content:flex-start' },
      h('button', { class: 'btn small', disabled: !canAct, onclick: () => { click(); const w = it ? it.weights : null; E.autoAssign(s, w || undefined); refresh(); toast('Troops posted to match the expected threat.'); } }, '⚖️ Auto-assign'),
      h('button', { class: 'btn small', disabled: !canAct, title: 'Move everyone from this sector to reserve', onclick: () => { click(); for (const t of E.TYPES) s.garrison[sel][t] = 0; refresh(); } }, 'Clear sector')));
    box.append(h('p', { class: 'note' }, 'Tip: click a part of the fortress, or press 1–4. Shift-click moves 5 at a time.'));
    return box;
  }

  function costText(o) { return Object.keys(o.cost).map(k => `${E.ICON[k]} ${o.cost[k]}`).join('  '); }
  function ordersPanel() {
    const box = h('div');
    box.append(h('div', { class: 'h3' }, `Orders · ${s.ap} left today`));
    box.append(h('div', { class: 'note' }, `Sector orders apply to: `, h('b', {}, E.SECTOR_INFO[sel].name)));
    const grid = h('div', { class: 'orders', style: 'margin-top:8px' });
    for (const o of E.ORDERS) {
      const ok = canAct && s.ap > 0 && o.can(s, sel);
      grid.append(h('button', { class: 'order', disabled: !ok, onclick: () => runOrder(o) },
        h('span', { class: 't' }, h('span', {}, o.icon), o.name), h('span', { class: 'ds' }, o.desc), o.cost && Object.keys(o.cost).length ? h('span', { class: 'co' }, costText(o)) : null));
    }
    box.append(grid);
    return box;
  }

  function armyPanel() {
    const box = h('div');
    box.append(h('div', { class: 'h3' }, 'Garrison'));
    const rows = [['spear', 'Men-at-arms'], ['archer', 'Archers'], ['militia', 'Militia']];
    for (const [t, n] of rows) {
      const posted = E.SECTORS.reduce((a, sec) => a + s.garrison[sec][t], 0);
      box.append(h('div', { class: 'kv' }, h('span', {}, E.ICON[t] + ' ' + n), h('span', {}, h('b', {}, String(s.units[t])), `  (${posted} posted · ${s.wounded[t]} wounded)`)));
    }
    box.append(h('div', { class: 'kv' }, h('span', {}, '🐎 Horsemen'), h('b', {}, String(s.units.knight))));
    box.append(h('div', { class: 'kv' }, h('span', {}, '👥 Civilians'), h('b', {}, String(s.civ))));
    box.append(h('div', { class: 'kv' }, h('span', {}, '⚰️ Fallen so far'), h('b', {}, String(s.deaths))));
    box.append(h('div', { class: 'h3' }, 'Supplies'));
    box.append(h('div', { class: 'kv' }, h('span', {}, '🌾 Food'), h('b', {}, `${s.food}  (~${foodDays()} days)`)));
    box.append(h('div', { class: 'kv' }, h('span', {}, '🏹 Arrows'), h('b', {}, String(s.arrows))));
    box.append(h('div', { class: 'kv' }, h('span', {}, '🪵 Timber'), h('b', {}, String(s.timber))));
    box.append(h('div', { class: 'h3' }, 'Weather'));
    box.append(h('div', { class: 'kv' }, { clear: '☀️ Clear', rain: '🌧️ Rain · archers −25%', fog: '🌫️ Fog · intel is poor', storm: '⛈️ Storm · enemy −15%' }[s.weather]));
    return box;
  }

  let mapTimer = null;
  function mapPanel() {
    const box = h('div');
    const hp = E.hostProgress(s);
    box.append(h('div', { class: 'h3' }, 'Moldavia, summer 1476'));
    const cv = h('canvas', { width: 720, height: 600, class: 'mapcv' });
    box.append(cv);
    box.append(h('div', { class: 'kv' }, "👑 Prince Stephen's host", h('b', {}, hp.eta === 0 ? 'has arrived' : `~${hp.eta} day${hp.eta === 1 ? '' : 's'} away`)));
    box.append(h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(hp.p * 100)}%;background:#6a9ad0` })));
    box.append(h('p', { class: 'note' }, s.cred >= E.CRED_NEEDED ? 'The Prince trusts your word. His host marches at full speed.' : "The Prince doubts your reports. His host lingers. Raise his trust, with riders and honest chronicles."));
    clearInterval(mapTimer);
    const t0 = performance.now();
    const tick = () => { if (!document.body.contains(cv) || !s) { clearInterval(mapTimer); return; } window.CampaignMap.draw(cv, s, (performance.now() - t0) / 1000); };
    tick(); mapTimer = setInterval(tick, 80);
    return box;
  }

  function chronPanel() {
    const box = h('div');
    box.append(h('div', { class: 'h3' }, 'The Chronicle of Neamț'));
    box.append(h('div', { class: 'legend' }, h('span', {}, '🟢 truth'), h('span', {}, '🟡 glory'), h('span', {}, '⚪ silence'), h('span', {}, `Debt of lies: ${s.lieDebt}`)));
    if (!s.chronicle.length) box.append(h('p', { class: 'note' }, 'The first page is still blank.'));
    for (const e of s.chronicle.slice().reverse()) box.append(h('div', { class: 'chron ' + e.tone }, h('b', {}, `DAY ${e.day}`), h('div', {}, e.text)));
    return box;
  }

  /* ---------------- interaction ---------------- */
  function selectSector(sec) { sel = sec; Scene.setSelected(sec); renderSide(); }
  function refresh() { renderHUD(); renderBar(); renderSide(); syncScene(); }

  function runOrder(o) {
    if (!canAct) return;
    const r = E.doOrder(s, o.id, sel);
    if (!r) return;
    Sound.play(({ repair: 'hammer', fortify: 'hammer', forge: 'anvil', timber: 'hammer', rider: 'horse', forage: 'horse', sortie: 'horse', conscript: 'crowd' })[o.id] || 'order');
    toast(`${o.icon} ${r.text}`);
    refresh();
    if (s.over) finish();
  }

  /* ---------------- modals ---------------- */
  function modal(card, full, cls) {
    const m = $('modal'); m.className = 'on' + (full ? ' full' : '') + (cls ? ' ' + cls : ''); m.replaceChildren(card); Scene.S.showLabels = false;
  }
  function closeModal() { const m = $('modal'); m.className = ''; m.replaceChildren(); Scene.S.showLabels = true; }

  function fxChips(fx, risky, set) {
    const out = E.chips(fx).map(c => h('span', { class: 'fx ' + (c.good ? 'good' : 'bad'), title: c.label }, `${c.icon} ${c.v > 0 ? '+' : '−'}${Math.abs(c.v)}`));
    if (set) {
      if (set.enemyWeak) out.push(h('span', { class: 'fx misc' }, '⚔ Weakens next assault'));
      if (set.scoutAll) out.push(h('span', { class: 'fx misc' }, '🔭 Reveals enemy plans'));
      if (set.sortieBonus) out.push(h('span', { class: 'fx misc' }, '🔥 Burns siege works'));
    }
    if (risky) out.push(h('span', { class: 'fx misc', title: 'The outcome is uncertain' }, '🎲 Risk'));
    return out;
  }

  function banner(base) {   // tries .jpg, then .png, else shows nothing
    const exts = ['jpg', 'jpeg', 'png', 'webp']; let i = 0;
    const img = h('img', { class: 'banner', src: `${base}.${exts[0]}`, alt: '' });
    img.addEventListener('error', () => { i++; if (i < exts.length) img.src = `${base}.${exts[i]}`; else img.remove(); });
    return img;
  }
  function showEvent(ev) {
    return new Promise(resolve => {
      if (ev.spawn) Scene.spawn(ev.spawn);
      Sound.play('event');
      const box = h('div');
      for (const ch of E.choices(s, ev)) {
        box.append(h('button', { class: 'choice', onclick: () => {
          click();
          const r = E.resolveChoice(s, ch);
          Scene.endProps();
          Scene.react(r.fx);
          refresh();
          const card = h('div', { class: 'card' }, banner(`assets/img/events/${ev.id}`),
            h('div', { class: 'art' }, ev.art || '📜'), h('h2', {}, ev.title),
            h('p', { class: 'quote' }, r.text),
            h('div', { class: 'fxs', style: 'display:flex;flex-wrap:wrap;gap:5px;clear:both;margin-top:8px' }, fxChips(r.fx)),
            h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { click(); closeModal(); resolve(); } }, 'Continue')));
          modal(card);
        } }, h('div', { class: 'l' }, ch.label), h('div', { class: 'fxs' }, fxChips(ch.fx, !!ch.risk, ch.set))));
      }
      modal(h('div', { class: 'card' }, banner(`assets/img/events/${ev.id}`), h('div', { class: 'art' }, ev.art || '📜'), h('h2', {}, ev.title), h('p', {}, ev.text), h('div', { style: 'clear:both' }), box));
    });
  }

  const KIND_TXT = { repelled: 'Repelled', held: 'Held', bloody: 'Bloody', breach: 'Breached', collapse: 'Collapsing' };
  function showAssaultResult(res) {
    return new Promise(resolve => {
      const rows = res.results.map(r => h('tr', {}, h('td', {}, E.SECTOR_INFO[r.sector].name), h('td', {}, h('span', { class: 'badge ' + r.kind }, KIND_TXT[r.kind])),
        h('td', {}, `${r.defense} vs ${r.attackers}`), h('td', {}, `☠ ${r.dead} · 🩹 ${r.hurt}`), h('td', {}, r.wallDmg ? `🧱 −${r.wallDmg}` : '')));
      const card = h('div', { class: 'card' },
        h('h2', {}, `Assault ${res.index}: ${res.wave.name}`),
        h('table', { class: 'rtable' }, h('thead', {}, h('tr', {}, ...['Sector', 'Result', 'Defence vs enemy', 'Losses', 'Walls'].map(x => h('th', {}, x)))), h('tbody', {}, rows)),
        h('p', {}, `${res.dead} of your people are dead and ${res.hurt} wounded.`, res.moraleFx ? ` Morale ${res.moraleFx > 0 ? '+' : '−'}${Math.abs(res.moraleFx)}.` : ''),
        s.breaches ? h('p', { class: 'note' }, `⚠️ Breaches: ${s.breaches} of 3. The fortress falls at three.`) : null,
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { click(); closeModal(); resolve(); } }, 'Continue')));
      modal(card);
    });
  }

  function showChronicle() {
    return new Promise(resolve => {
      const o = E.chronicleOptions(s);
      const box = h('div');
      for (const k of ['truth', 'glory', 'silence']) {
        const opt = o[k];
        box.append(h('button', { class: 'choice tone ' + k, onclick: () => {
          click(); Sound.play('quill');
          E.writeChronicle(s, k); refresh(); closeModal(); resolve();
        } }, h('div', { class: 'l' }, opt.label), h('div', { class: 'fxs' }, fxChips(opt.fx)), h('span', { class: 'tx' }, '“' + opt.text + '”')));
      }
      modal(h('div', { class: 'card' }, h('div', { class: 'art' }, '🪶'), h('h2', {}, `Night of Day ${s.day}: the Chronicle`),
        h('p', {}, 'The garrison hears this read aloud at dusk, and the Prince reads it through his riders. What do you write?'),
        h('div', { style: 'clear:both' }), box));
    });
  }

  /* ---------------- flow ---------------- */
  function setPhase(p) { phase = p; renderHUD(); }

  async function runDay() {
    E.takeSnapshot(s);
    setPhase('dawn'); canAct = false; Scene.setSelected(null); Scene.setIntel(null);
    syncScene(); Scene.setTime(s.day, 'dawn'); renderBar(); renderSide();
    Sound.ambience(s.weather === 'rain' || s.weather === 'storm' ? 'amb_rain' : 'amb_day'); Sound.play('bell');
    toast(`Day ${s.day} · ${({ clear: 'a clear morning', rain: 'rain on the stones', fog: 'a thick fog', storm: 'a storm gathers' })[s.weather]}`, 2800);
    await sleep(s.day === 1 ? 700 : 1500);
    const ev = E.pickEvent(s);
    if (ev) { await showEvent(ev); if (s.over) return finish(); }
    // orders
    setPhase('day'); Scene.setTime(s.day, 'day'); canAct = true; Scene.setSelected(sel); Scene.setIntel(E.intel(s));
    refresh();
    if (s.day === 1) toast('Click a part of the fortress to command it. Move troops with + and −.', 7000);
    if (s.day === 2) toast('Use <em>Scout</em> before an assault to see where the enemy will strike.', 6000);
    await new Promise(r => { dayResolve = r; });
    canAct = false; Scene.setIntel(null); renderBar(); renderSide();
    // bombardment
    if (s.bombards > 0) {
      const hits = E.bombard(s);
      await Scene.playBombard(hits);
      for (const hit of hits) toast(`💣 The bombard struck the ${E.SECTOR_INFO[hit.sector].name}: walls −${hit.dmg}${hit.killed ? ', one defender killed' : ''}`);
      refresh(); await sleep(600);
    }
    if (s.over) return finish();
    // assault
    if (E.isAssaultDay(s)) {
      setPhase('assault'); Scene.setTime(s.day, 'assault'); await sleep(1800);
      const before = viewOf(); Scene.sync(before);
      Sound.music('music_battle');
      const res = E.assault(s);
      toast(`⚔ ${res.wave.name}! <em>(click the scene to speed up)</em>`, 4000);
      await Scene.playAssault(res, before);
      Sound.music('music_game');
      refresh();
      if (s.over) { await sleep(500); return finish(); }
      await showAssaultResult(res);
      if (s.over) return finish();
    }
    // night
    setPhase('night'); Scene.setTime(s.day, 'night'); Sound.ambience('amb_night'); await sleep(1600);
    await showChronicle();
    if (s.over) return finish();
    const log = E.endDay(s);
    refresh();
    if (s.over) return finish();
    if (log.length) toast('🌑 ' + log.join(' '), 5000);
    await runDay();
  }

  function finish() {
    canAct = false; setPhase('end'); refresh();
    const e = ENDINGS[s.over], ep = E.epilogue(s);
    const good = s.over === 'victory' || s.over === 'bitter';
    Sound.play(good ? 'victory' : 'defeat'); Sound.music(good ? 'music_victory' : 'music_defeat'); Sound.ambience(null);
    Scene.setTime(Math.min(s.day, E.DAYS), good ? 'dawn' : 'night');
    const full = s.chronicle.map(c => `Day ${c.day}. ${c.text}`).join('\n');
    const card = h('div', { class: 'card' }, banner(`assets/img/endings/${s.over}`), h('h1', {}, e.title), h('div', { class: 'sub' }, `Day ${Math.min(s.day, E.DAYS)} of ${E.DAYS}`),
      h('p', {}, e.text), h('p', {}, `History will remember you as ${ep.legacy}.`),
      h('p', { class: 'note' }, `Truth ${ep.truths} · Glory ${ep.lies} · Silence ${ep.silences} · Debt of lies ${s.lieDebt} · Fallen ${s.deaths}`),
      h('div', { class: 'scroll' }, s.chronicle.length ? s.chronicle.map(c => h('p', {}, h('b', {}, `Day ${c.day}. `), c.text)) : h('p', {}, 'The Chronicle is empty.')),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { click(); title(); } }, 'Play again'),
        h('button', { class: 'btn', onclick: () => { try { navigator.clipboard.writeText(`Chronicle of Ash · Siege of Neamț (1476)\n\n${full}`); toast('Chronicle copied.'); } catch (er) {} } }, 'Copy the Chronicle')));
    modal(card, true);
  }

  function title() {
    s = null; phase = 'title'; canAct = false; lastVals = null; $('app').classList.add('is-title');
    renderHUD(); renderBar(); $('panel').replaceChildren(); $('tabs').replaceChildren();
    const fake = E.newGame(1); Scene.sync({ day: 1, walls: fake.walls, fort: fake.fort, garrison: fake.garrison, tents: 12, bombards: 1, villageBurn: 0.35, deaths: 10, morale: 60, weather: 'clear' }, true);
    Scene.setTime(1, 'title', true); Scene.setMode('title'); Scene.setSelected(null); Scene.setIntel(null);
    Sound.music('music_menu');
    modal(h('div', { class: 'card' },
      h('h1', {}, SCENARIO.title), h('div', { class: 'sub' }, SCENARIO.subtitle),
      SCENARIO.intro.map(t => h('p', {}, t)),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { click(); start(); } }, 'Begin the siege'), h('button', { class: 'btn', onclick: () => { click(); help(); } }, 'How to play'))), false, 'title');
  }

  function help() {
    modal(h('div', { class: 'card' }, h('h2', {}, 'How to play'),
      h('p', {}, h('b', {}, 'Hold for 30 days. '), 'Each day has four parts: a dawn event, your orders, the battle and the night Chronicle.'),
      h('p', {}, h('b', {}, 'Command the walls. '), 'Click a section of the fortress (or press 1–4) and post men-at-arms, archers and militia with + and −. The red arrows show where the enemy will strike. Scout to see them exactly.'),
      h('p', {}, h('b', {}, 'Spend your orders wisely. '), `You have ${E.AP} orders a day: repair, fortify, forge arrows, drill militia, forage, scout, feed the people.`),
      h('p', {}, h('b', {}, 'Write the Chronicle. '), 'The garrison hears it and the Prince reads it. The truth builds trust but may break morale. Glory lifts spirits but builds a debt of lies, and the Prince will come to check.'),
      h('p', {}, h('b', {}, 'You lose '), 'if three sectors collapse, morale hits zero, or too few fighters remain. You win if you survive and the Prince trusts you enough to march.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { click(); if (s) closeModal(); else title(); } }, s ? 'Back to the siege' : 'Back'))), !!s, s ? '' : 'title');
  }

  function start() {
    s = E.newGame(); E.rollWeather(s); sel = 'gate'; tab = 'defense'; lastVals = null;
    Scene.clearBodies(); Scene.setMode('game');
    Sound.music('music_game');
    $('app').classList.remove('is-title'); closeModal(); syncScene(true); Scene.setTime(1, 'dawn', true);
    runDay();
  }

  /* ---------------- wiring ---------------- */
  Scene.init($('view'));
  Scene.onSector = sec => { if (s && phase === 'day') { click(); selectSector(sec); } };
  Scene.onSound = n => Sound.play(n);
  $('btn-end').addEventListener('click', () => { if (canAct && dayResolve) { click(); const r = dayResolve; dayResolve = null; r(); } });
  $('btn-mute').addEventListener('click', () => $('btn-mute').classList.toggle('off', Sound.toggle()));
  $('btn-mute').classList.toggle('off', Sound.isMuted());
  $('btn-help').addEventListener('click', () => { if (phase === 'title' || (s && phase === 'day')) help(); });
  document.addEventListener('keydown', ev => {
    if (!s || !canAct) return;
    if (ev.key >= '1' && ev.key <= '4') selectSector(E.SECTORS[+ev.key - 1]);
    else if (ev.key === ' ' && document.activeElement && document.activeElement.tagName !== 'BUTTON') { ev.preventDefault(); $('btn-end').click(); }
  });
  title();
  window.__game = { get s() { return s; } };
})();
