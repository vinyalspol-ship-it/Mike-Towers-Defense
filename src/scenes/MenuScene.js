import { DEV_TOOLS } from '../devMode.js';
import Phaser from 'phaser';
import { W, H, FONT, EMOJI_FONT, COL } from '../config.js';
import { LEVELS } from '../data/levels.js';
import { load, save, reset } from '../storage.js';
import { makeButton, title } from '../ui.js';
import { musicOn, toggleMusic, bindMusicKey } from '../music.js';
import { addFullscreenButton } from '../fullscreen.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.page = (data && data.page) || 0;
  }

  create() {
    const sv = load();

    // fondo de hierba con decoración y unidades animadas
    for (let c = 0; c < 20; c++) for (let r = 0; r < 12; r++) this.add.image(c * 64, r * 64, 'grass', 10).setOrigin(0, 0).setDepth(0);
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x000000, 0.28);
    g.fillRect(0, 0, W, H);

    const deco = [
      ['tree1', 70, 560, 0.7], ['tree2', 180, 640, 0.65], ['tree3', 1190, 600, 0.7], ['tree4', 1090, 680, 0.6],
      ['tree2', 40, 300, 0.6], ['tree1', 1240, 330, 0.65],
    ];
    for (const [k, x, y, s] of deco) {
      const o = this.add.sprite(x, y, k).setOrigin(0.5, 0.88).setScale(s).setDepth(2 + y / 1000);
      o.play(k);
      o.anims.setProgress(Math.random());
    }
    const sheep = this.add.sprite(300, 665, 'sheep_grass').setScale(0.6).setDepth(3);
    sheep.play('sheep_grass');

    // castillo y héroes a un lado; zombis desfilando al otro
    this.add.image(1130, 215, 'castle').setScale(0.7).setDepth(4);
    const heroes = [['barbaro_idle', 90], ['elfo_idle', 170], ['mago_idle', 250], ['alq_idle', 330]];
    heroes.forEach(([k, x]) => {
      this.add.image(x, 668, 'shadow').setScale(0.42).setAlpha(0.5).setDepth(5);
      const s = this.add.sprite(x, 660, k).setOrigin(0.5, 0.62).setScale(0.95).setDepth(6);
      s.play(k);
      s.anims.setProgress(Math.random());
    });
    const walkers = [['orc_walk', 0xffffff, 2.4], ['sol_walk', 0xffffff, 2.7], ['orc_walk', 0xd8ff50, 2.2], ['orc_walk', 0xe6c07a, 2.6]];
    walkers.forEach(([k, tint, sc], i) => {
      const y = 600 + (i % 2) * 36;
      const z = this.add.sprite(-100 - i * 140, y, k).setOrigin(0.5, 0.58).setScale(sc).setTint(tint).setDepth(7 + y / 1000);
      z.play(k);
      this.tweens.add({ targets: z, x: W + 100, duration: 26000 + i * 3000, repeat: -1, delay: i * 2500 });
    });

    // velas encendidas y dagas junto al título (pack de interfaz)
    [[150, 'ui_candle1'], [1130, 'ui_candle2']].forEach(([cx, key], i) => {
      const c = this.add.image(cx, 100, key).setScale(4).setDepth(11);
      this.time.addEvent({ delay: 220 + i * 90, loop: true, callback: () => c.setTexture(c.texture.key === 'ui_candle1' ? 'ui_candle2' : 'ui_candle1') });
    });
    this.add.image(W / 2 - 330, 126, 'ui_dagger1').setScale(1.6).setAngle(-90).setDepth(12);
    this.add.image(W / 2 + 330, 126, 'ui_dagger2').setScale(1.6).setAngle(90).setDepth(12);

    // título sobre un cartel de madera
    this.add.rectangle(W / 2, 92, 900, 130, COL.wood).setStrokeStyle(6, COL.woodDark).setDepth(10);
    this.add.rectangle(W / 2, 92 - 58, 888, 8, COL.woodLight).setDepth(11);
    title(this, W / 2, 80, 'ZOMBIES MUST COME DOWN', 54).setDepth(12);
    this.add
      .text(W / 2, 126, (this.page ? 'TWD · Tierras Altas de Evelmore' : 'TWD · Praderas de Evelmore'), { fontFamily: FONT, fontSize: '22px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(12);

    // monedas, cerebros y lingotes con iconos del pack
    this.add.rectangle(W / 2, 185, 640, 44, COL.wood).setStrokeStyle(4, COL.woodDark).setDepth(10);
    this.add.image(W / 2 - 280, 185, 'icon_03').setScale(0.7).setDepth(12);
    this.add
      .text(W / 2 - 252, 171, `${sv.coins} monedas      🧠 ${sv.brains} cerebros      🥇 ${sv.ingots} lingotes de oro`, {
        fontFamily: EMOJI_FONT,
        fontSize: '22px',
        color: COL.cream,
        stroke: '#2e1c0f',
        strokeThickness: 4,
      })
      .setDepth(12);

    // niveles en páginas de 10 (5 columnas x 2 filas) con una flecha a cada lado para cambiar de página
    const PER = 10;
    const pages = Math.ceil(LEVELS.length / PER);
    const page = Math.min(this.page, pages - 1);
    LEVELS.slice(page * PER, page * PER + PER).forEach((lv, j) => {
      const i = LEVELS.indexOf(lv);
      const unlocked = i === 0 || sv.cleared[LEVELS[i - 1].id];
      const done = sv.cleared[lv.id];
      const st = (sv.stars && sv.stars[lv.id]) || 0;
      const x = 64 + (j % 5) * 236;
      const y = 226 + Math.floor(j / 5) * 134;
      const stars = done ? `${'★'.repeat(st)}${'☆'.repeat(3 - st)}` : '';
      const label = `${lv.name}  ${stars}\n${lv.subtitle}\n${unlocked ? 'Toca para jugar' : '🔒 Supera el nivel anterior'}`;
      const b = makeButton(this, x, y, 228, 124, label, () => this.scene.start('Game', { level: lv.id }), {
        fill: unlocked ? (lv.routes ? 0x7a5a1f : lv.boss ? 0x7b2d2d : lv.zoom ? 0x2f5a6f : 0x2f6f4a) : 0x4a3b2e,
        fontSize: 14,
        depth: 20,
      });
      b.setEnabled(!!unlocked);
    });
    if (pages > 1) {
      const left = makeButton(this, 4, 226, 52, 258, '◀', () => this.scene.restart({ page: page - 1 }), { fontSize: 34, fill: 0x5b4636, depth: 20 });
      left.setEnabled(page > 0);
      const right = makeButton(this, W - 56, 226, 52, 258, '▶', () => this.scene.restart({ page: page + 1 }), { fontSize: 34, fill: 0x5b4636, depth: 20 });
      right.setEnabled(page < pages - 1);
      this.add
        .text(W / 2, 492, `Página ${page + 1}/${pages} · niveles ${page * PER + 1}-${Math.min(LEVELS.length, page * PER + PER)}`, { fontFamily: FONT, fontSize: '15px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 3 })
        .setOrigin(0.5)
        .setDepth(20);
    }
    // música: botón y tecla M
    const mus = makeButton(this, W - 62, 8, 52, 38, '', () => paintMusic(toggleMusic(this)), { fill: 0x5b4636, depth: 20 });
    const musIcon = this.add.image(W - 36, 27, 'ui_icons', 5).setScale(2.4).setDepth(22); // icono de altavoz del pack
    const paintMusic = (on) => musIcon.setFrame(on ? 5 : 8).setAlpha(on ? 1 : 0.7);
    paintMusic(musicOn());
    bindMusicKey(this, paintMusic);
    addFullscreenButton(this, W - 62 - 58, 8, 52, 38, 20); // pantalla completa (junto al botón de música)

    makeButton(this, 750, 506, 230, 70, '⚔ Equipo', () => this.scene.start('Team'), { fill: 0x2f6f4a, fontSize: 26, depth: 20 });
    makeButton(this, 996, 506, 244, 70, '📖 Códice', () => this.scene.start('Codex'), { fill: 0x7b3f8f, fontSize: 26, depth: 20 });

    makeButton(this, 30, 506, 340, 70, '🌳 Árbol de mejoras', () => this.scene.start('Tree'), {
      fill: 0x6c3483,
      fontSize: 26,
      depth: 20,
    });

    // modo prueba: un botón para oro y otro para cerebros
    if (DEV_TOOLS) makeButton(
      this,
      390,
      506,
      168,
      32,
      '🧪 +100 de oro',
      () => {
        sv.coins += 100;
        save();
        this.scene.restart();
      },
      { fill: 0x7a5c00, fontSize: 14, depth: 20 }
    );
    if (DEV_TOOLS) makeButton(
      this,
      562,
      506,
      168,
      32,
      '🧪 +2 cerebros',
      () => {
        sv.brains += 2;
        save();
        this.scene.restart();
      },
      { fill: 0x8a3d6b, fontSize: 14, depth: 20 }
    );

    makeButton(
      this,
      390,
      544,
      340,
      32,
      '🗑 Borrar partida guardada',
      () => {
        reset();
        this.scene.restart();
      },
      { fill: 0x7b241c, fontSize: 14, depth: 20 }
    );

    this.add
      .text(W / 2, H - 14, 'Prototipo jugable · Arte: Tiny Swords (Pixel Frog) y Tiny RPG Character Pack · Música: "Frost" de Alexander Nakarada (CC BY 4.0)', {
        fontFamily: FONT,
        fontSize: '14px',
        color: COL.cream,
        stroke: '#2e1c0f',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(20);
  }
}





