/* Optional sounds: drop files in assets/audio/. Missing files are ignored. */
(function (root) {
  'use strict';
  const FILES = {
    music_menu: 'assets/audio/music_menu.mp3', music_game: 'assets/audio/music_game.mp3', music_battle: 'assets/audio/music_battle.mp3',
    music_victory: 'assets/audio/music_victory.mp3', music_defeat: 'assets/audio/music_defeat.mp3',
    amb_day: 'assets/audio/amb_day.mp3', amb_night: 'assets/audio/amb_night.mp3', amb_rain: 'assets/audio/amb_rain.mp3',
    click: 'assets/audio/sfx_click.mp3', quill: 'assets/audio/sfx_quill.mp3', horn: 'assets/audio/sfx_horn.mp3', bell: 'assets/audio/sfx_bell.mp3',
    boom: 'assets/audio/sfx_boom.mp3', bombard: 'assets/audio/sfx_impact.mp3', clash: 'assets/audio/sfx_clash.mp3', volley: 'assets/audio/sfx_volley.mp3',
    ladder: 'assets/audio/sfx_ladder.mp3', collapse: 'assets/audio/sfx_collapse.mp3', thunder: 'assets/audio/sfx_thunder.mp3',
    hammer: 'assets/audio/sfx_hammer.mp3', anvil: 'assets/audio/sfx_anvil.mp3', order: 'assets/audio/sfx_order.mp3', event: 'assets/audio/sfx_event.mp3',
    horse: 'assets/audio/sfx_horse.mp3', crowd: 'assets/audio/sfx_crowd.mp3', victory: 'assets/audio/sfx_victory.mp3', defeat: 'assets/audio/sfx_defeat.mp3'
  };
  let muted = false, music = null, amb = null, ambName = null;
  try { muted = localStorage.getItem('muted') === '1'; } catch (e) {}
  const cache = {};
  function make(name, loop, vol) {
    const a = new Audio(FILES[name]); a.loop = !!loop; a.volume = vol; a.addEventListener('error', () => { a._broken = true; }); return a;
  }
  const Sound = {
    isMuted: () => muted,
    toggle() {
      muted = !muted;
      try { localStorage.setItem('muted', muted ? '1' : '0'); } catch (e) {}
      for (const m of [music, amb]) if (m) { muted ? m.pause() : m.play().catch(() => {}); }
      return muted;
    },
    play(name) {
      if (muted || !FILES[name]) return;
      if (cache[name] && cache[name]._broken) return;
      const a = cache[name] || (cache[name] = make(name, false, 0.7));
      try { a.currentTime = 0; } catch (e) {}
      a.play().catch(() => {});
    },
    music(name) {
      if (music) { music.pause(); music = null; }
      if (!FILES[name]) return;
      music = make(name, true, 0.32);
      if (!muted) music.play().catch(() => {});
    },
    ambience(name) {
      if (name === ambName) return;
      ambName = name;
      if (amb) { amb.pause(); amb = null; }
      if (!name || !FILES[name]) return;
      amb = make(name, true, 0.3);
      if (!muted) amb.play().catch(() => {});
    }
  };
  root.Sound = Sound;
})(window);
