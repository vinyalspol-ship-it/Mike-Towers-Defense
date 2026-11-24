// Música de fondo: "Frost" de Alexander Nakarada (música gratuita; licencia CC BY 4.0, hay que citar al autor: ver créditos del menú).
// Descargada de https://www.youtube.com/watch?v=8dOo7kpYLz4 (canal BreakingCopyright, enlace oficial: breakingcopyright.com/song/alexander-nakarada-frost).
// El gestor de sonido de Phaser es global, así que la música sigue sonando al cambiar de escena.
const KEY = 'zmcd_music';
const SONG = 'music_frost';

export const musicOn = () => localStorage.getItem(KEY) !== '0';

export function loadMusic(scene) {
  scene.load.audio(SONG, 'assets/music/frost.mp3');
}

export function startMusic(scene) {
  scene.sound.mute = !musicOn();
  if (!scene.sound.get(SONG)) scene.sound.add(SONG, { loop: true, volume: 0.28 }).play();
}

// Activa o silencia la música (la canción sigue avanzando en silencio). Devuelve el estado nuevo.
export function toggleMusic(scene) {
  localStorage.setItem(KEY, musicOn() ? '0' : '1');
  scene.sound.mute = !musicOn();
  return musicOn();
}

// tecla M en la escena
export function bindMusicKey(scene, onChange) {
  scene.input.keyboard.on('keydown-M', () => {
    toggleMusic(scene);
    if (onChange) onChange(musicOn());
  });
}
