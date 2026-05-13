// ─── Préférences sons (en mémoire, global) ───

let _musicEnabled = true;
let _sfxEnabled = true;

export const isMusicEnabled = () => _musicEnabled;
export const isSfxEnabled = () => _sfxEnabled;

export const setMusicEnabled = (v: boolean) => {
  _musicEnabled = v;
};

export const setSfxEnabled = (v: boolean) => {
  _sfxEnabled = v;
};
