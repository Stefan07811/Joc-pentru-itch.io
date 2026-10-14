/* Sunete opționale: pune fișierele în assets/audio/. Dacă lipsesc, jocul rulează fără ele. */
(function (root) {
  'use strict';
  const FILES = {
    music_menu: 'assets/audio/music_menu.mp3',
    music_game: 'assets/audio/music_game.mp3',
    click: 'assets/audio/sfx_click.mp3',
    quill: 'assets/audio/sfx_quill.mp3',
    assault: 'assets/audio/sfx_assault.mp3',
    victory: 'assets/audio/sfx_victory.mp3',
    defeat: 'assets/audio/sfx_defeat.mp3'
  };
  let muted = false, music = null;
  try { muted = localStorage.getItem('muted') === '1'; } catch (e) {}

  function make(name, loop) {
    const a = new Audio(FILES[name]);
    a.loop = !!loop; a.volume = loop ? 0.35 : 0.7;
    a.addEventListener('error', () => { a._broken = true; });
    return a;
  }
  const Sound = {
    isMuted: () => muted,
    toggle() {
      muted = !muted;
      try { localStorage.setItem('muted', muted ? '1' : '0'); } catch (e) {}
      if (music) { muted ? music.pause() : music.play().catch(() => {}); }
      return muted;
    },
    play(name) {
      if (muted || !FILES[name]) return;
      const a = make(name, false);
      a.play().catch(() => {});
    },
    music(name) {
      if (music) { music.pause(); music = null; }
      if (!FILES[name]) return;
      music = make(name, true);
      if (!muted) music.play().catch(() => {});
    }
  };
  root.Sound = Sound;
})(window);
