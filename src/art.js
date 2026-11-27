import { makeFlyerArt } from './flyerArt.js';
// Carga de arte (pack Tiny Swords, copiado con nombres limpios en public/assets/game)
// y registro de animaciones.
import { ICON_IDS } from './upgradeIcons.js';
const P = 'assets/game/';

// [clave, archivo, ancho de fotograma, alto de fotograma, nº de fotogramas]
const SHEETS = [
  // defensas (equipo azul/morado)
  ['barbaro_idle', 'barbaro_idle.png', 192, 192, 8],
  ['barbaro_atk', 'barbaro_atk.png', 192, 192, 4],
  ['elfo_idle', 'elfo_idle.png', 192, 192, 6],
  ['elfo_atk', 'elfo_atk.png', 192, 192, 8],
  ['alq_idle', 'alq_idle.png', 192, 192, 8],
  ['alq_atk', 'alq_atk.png', 192, 192, 4],
  ['mago_idle', 'mago_idle.png', 192, 192, 6],
  ['mago_atk', 'mago_atk.png', 192, 192, 11],
  // defensas nuevas (Tiny Swords: Lancero azul, Monje amarillo, Peón con martillo, Guerrero rojo, Peón con oro, Monje negro)
  ['lan_idle', 'lan_idle.png', 320, 320, 12],
  ['lan_atk', 'lan_atk.png', 320, 320, 3],
  ['mon_idle', 'mon_idle.png', 192, 192, 6],
  ['mon_atk', 'mon_atk.png', 192, 192, 11],
  ['ing_idle', 'ing_idle.png', 192, 192, 8],
  ['ing_atk', 'ing_atk.png', 192, 192, 3],
  ['sie_idle', 'sie_idle.png', 192, 192, 8],
  ['sie_atk', 'sie_atk.png', 192, 192, 4],
  ['mid_idle', 'mid_idle.png', 192, 192, 8],
  ['mid_atk', 'mid_atk.png', 192, 192, 6],
  ['nec_idle', 'nec_idle.png', 64, 64, 4],
  ['nec_atk', 'nec_atk.png', 64, 64, 5],
  // golem de piedra (Mecha-stone Golem): Autómata del Ingeniero y gigante del Nigromante
  ['golem_idle', 'golem_idle.png', 100, 100, 4],
  ['golem_atk', 'golem_atk.png', 100, 100, 9],
  // enemigos: Tiny RPG Character Asset Pack 01 (Orco y Soldado, fotogramas de 100x100)
  ['orc_walk', 'orc_walk.png', 100, 100, 8],
  ['sol_walk', 'sol_walk.png', 100, 100, 8],
  ['gob_run', 'gob_run.png', 16, 16, 8], // Hobgoblin (goblinsmasher)
  ['menu_warrior_run', 'menu_warrior_run.png', 192, 192, 6],
  // terreno y decoración
  ['grass', 'grass.png', 64, 64, 54],
  ['path', 'path.png', 64, 64, 54],
  ['bush1', 'bush1.png', 128, 128, 8],
  ['bush2', 'bush2.png', 128, 128, 8],
  ['bush3', 'bush3.png', 128, 128, 8],
  ['bush4', 'bush4.png', 128, 128, 8],
  ['tree1', 'tree1.png', 192, 256, 8],
  ['tree2', 'tree2.png', 192, 256, 8],
  ['tree3', 'tree3.png', 192, 192, 8],
  ['tree4', 'tree4.png', 192, 192, 8],
  ['sheep_idle', 'sheep_idle.png', 128, 128, 6],
  ['sheep_grass', 'sheep_grass.png', 128, 128, 12],
  // efectos
  ['fx_explosion1', 'fx_explosion1.png', 192, 192, 8],
  ['fx_explosion2', 'fx_explosion2.png', 192, 192, 10],
  ['fx_fire', 'fx_fire.png', 64, 64, 8],
  ['fx_dust', 'fx_dust.png', 64, 64, 8],
  ['fx_splash', 'fx_splash.png', 192, 192, 9],
];

const IMAGES = [
  'arrow', 'shadow', 'castle', 'tower_black', 'house',
  'rock1', 'rock2', 'rock3', 'rock4', 'cloud1', 'cloud2', 'cloud3', 'cloud4',
];
for (let i = 1; i <= 12; i++) {
  IMAGES.push('icon_' + String(i).padStart(2, '0'));
  IMAGES.push('avatar_' + String(i).padStart(2, '0'));
}

// Animaciones: [clave, hoja, velocidad, repetir(-1 = bucle)]
const ANIMS = [
  ['barbaro_idle', 'barbaro_idle', 8, -1],
  ['barbaro_atk', 'barbaro_atk', 14, 0],
  ['elfo_idle', 'elfo_idle', 8, -1],
  ['elfo_atk', 'elfo_atk', 18, 0],
  ['alq_idle', 'alq_idle', 8, -1],
  ['alq_atk', 'alq_atk', 10, 0],
  ['mago_idle', 'mago_idle', 8, -1],
  ['mago_atk', 'mago_atk', 20, 0],
  ['lan_idle', 'lan_idle', 9, -1],
  ['lan_atk', 'lan_atk', 14, 0],
  ['mon_idle', 'mon_idle', 8, -1],
  ['mon_atk', 'mon_atk', 20, 0],
  ['ing_idle', 'ing_idle', 8, -1],
  ['ing_atk', 'ing_atk', 12, 0],
  ['sie_idle', 'sie_idle', 8, -1],
  ['sie_atk', 'sie_atk', 10, 0],
  ['mid_idle', 'mid_idle', 8, -1],
  ['mid_atk', 'mid_atk', 12, 0],
  ['nec_idle', 'nec_idle', 6, -1],
  ['nec_atk', 'nec_atk', 11, 0],
  ['golem_idle', 'golem_idle', 6, -1],
  ['golem_atk', 'golem_atk', 14, 0],
  ['orc_walk', 'orc_walk', 10, -1],
  ['sol_walk', 'sol_walk', 10, -1],
  ['gob_run', 'gob_run', 9, -1, [0, 2, 4, 6]], // los fotogramas impares de la hoja están vacíos
  ['menu_warrior_run', 'menu_warrior_run', 9, -1],
  ['bush1', 'bush1', 6, -1],
  ['bush2', 'bush2', 6, -1],
  ['bush3', 'bush3', 6, -1],
  ['bush4', 'bush4', 6, -1],
  ['tree1', 'tree1', 5, -1],
  ['tree2', 'tree2', 5, -1],
  ['tree3', 'tree3', 5, -1],
  ['tree4', 'tree4', 5, -1],
  ['sheep_idle', 'sheep_idle', 6, -1],
  ['sheep_grass', 'sheep_grass', 8, -1],
  ['fx_explosion1', 'fx_explosion1', 22, 0],
  ['fx_explosion2', 'fx_explosion2', 22, 0],
  ['fx_fire', 'fx_fire', 14, 0],
  ['fx_dust', 'fx_dust', 16, 0],
  ['fx_splash', 'fx_splash', 18, 0],
];

export function loadArt(scene) {
  for (const [key, file, fw, fh] of SHEETS) {
    scene.load.spritesheet(key, P + file, { frameWidth: fw, frameHeight: fh });
  }
  for (const key of IMAGES) scene.load.image(key, P + key + '.png');
  // interfaz (pack Mediavel Free): tablón de madera, barra de vida, botones, iconos, velas y dagas
  for (const key of ['ui_panel', 'ui_hp_frame', 'ui_hp_fill', 'ui_candle1', 'ui_candle2', 'ui_dagger1', 'ui_dagger2', 'ui_sign']) scene.load.image(key, P + 'ui/' + key + '.png');
  // iconos de mejoras (Raven Fantasy Icons)
  for (const k of Object.keys(ICON_IDS)) scene.load.image('ic_' + k, P + 'icons/ic_' + k + '.png');
  // casillas dibujadas por Pol (32x32, el juego las amplía al doble)
  scene.load.image('grass_tile', P + 'tiles/grass_tile3.png');
  scene.load.image('tall_grass', P + 'tiles/tall_grass.png');
  // pantalla de inicio: fondo, logo y botón PLAY
  scene.load.image('title_bg', P + 'title/title_bg.jpg');
  scene.load.image('title_logo', P + 'title/title_logo.png');
  scene.load.image('title_play', P + 'title/title_play.png');
  scene.load.spritesheet('ui_btns', P + 'ui/ui_btns.png', { frameWidth: 16, frameHeight: 16 }); // 8 columnas x 4 filas
  scene.load.spritesheet('ui_icons', P + 'ui/ui_icons.png', { frameWidth: 16, frameHeight: 16 }); // 3 columnas x 4 filas
}

export function registerAnims(scene) {
  makeFlyerArt(scene); // voladores provisionales (dibujados con canvas)
  for (const [key, sheet, fps, repeat, only] of ANIMS) {
    if (scene.anims.exists(key)) continue;
    const n = SHEETS.find((s) => s[0] === sheet)[4];
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(sheet, only ? { frames: only } : { start: 0, end: n - 1 }),
      frameRate: fps,
      repeat,
    });
  }
}

// Efecto visual de un solo uso (explosión, polvo, salpicadura...) que se destruye al acabar
export function playFx(scene, key, x, y, scale = 1, depth = 28) {
  const s = scene.add.sprite(x, y, key).setScale(scale).setDepth(depth);
  s.play(key);
  s.once('animationcomplete', () => s.destroy());
  return s;
}






