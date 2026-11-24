// Constantes de pantalla y maquetación (1280x720, apaisado).
// La rejilla es de 64 px para que el pixel art (Tiny Swords, tiles de 64) se vea nítido.
export const W = 1280;
export const H = 720;
export const TILE = 64;
export const COLS = 20;
export const ROWS = 8;
export const HUD_H = 48;
export const MAP_Y = 48; // el mapa ocupa y=48..560
export const PANEL_Y = 560; // panel inferior y=560..720
export const PANEL_H = H - PANEL_Y;

export const FONT = '"Segoe UI", system-ui, Arial, sans-serif';
export const EMOJI_FONT =
  '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Segoe UI",sans-serif';

// Paleta madera/pergamino (a juego con el pack Tiny Swords)
export const COL = {
  wood: 0x5a3b22,
  woodDark: 0x2e1c0f,
  woodLight: 0x8a6238,
  paper: 0xf2e4c4,
  paperDark: 0xc9b48a,
  ink: '#2e1c0f',
  cream: '#fff4d6',
};
