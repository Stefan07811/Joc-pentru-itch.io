/* Optional sounds: drop files in assets/audio/. Missing files are ignored. */
(function (root) {
  'use strict';
  const FILES = {
    music_menu: 'assets/audio/music_menu.mp3', music_game: 'assets/audio/music_game.mp3', music_battle: 'assets/audio/music_battle.mp3',
    click: 'assets/audio/sfx_click.mp3', quill: 'assets/audio/sfx_quill.mp3', horn: 'assets/audio/sfx_horn.mp3',
    boom: 'assets/audio/sfx_boom.mp3', bombard: 'assets/audio/sfx_impact.mp3', clash: 'assets/audio/sfx_clash.mp3',
    collapse: 'assets/audio/sfx_collapse.mp3', thunder: 'assets/audio/sfx_thunder.mp3', order: 'assets/audio/sfx_order.mp3',
    event: 'assets/audio/sfx_event.mp3', victory: 'assets/audio/sfx_victory.mp3', defeat: 'assets/audio/sfx_defeat.mp3',
    ambience: 'assets/audio/ambience.mp3'
  };
  let muted = false, music = null, amb = null;
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
    ambience(on) {
      if (amb) { amb.pause(); amb = null; }
      if (!on) return;
      amb = make('ambience', true, 0.25);
      if (!muted) amb.play().catch(() => {});
    }
  };
  root.Sound = Sound;
})(window);
