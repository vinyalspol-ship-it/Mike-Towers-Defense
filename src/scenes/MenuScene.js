import { DEV_TOOLS } from '../devMode.js';
import Phaser from 'phaser';
import { W, H, FONT, EMOJI_FONT, COL } from '../config.js';
import { LEVELS } from '../data/levels.js';
import { load, save, reset, GIFT_COINS } from '../storage.js';
import { makeButton, title, woodPanel } from '../ui.js';
import { musicOn, toggleMusic, bindMusicKey } from '../music.js';
import { addFullscreenButton } from '../fullscreen.js';
import { TOWER_ART } from '../towerArt.js';
import { STAGES, PER_STAGE, stageOf, teamFor } from '../levelInfo.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.page = (data && data.page) || 0;
  }

  // Aviso único para quien tenía una partida de una versión anterior: se ha reiniciado y recibe un regalo
  showGift(sv) {
    sv.giftMsg = false;
    save();
    const objs = [];
    const add = (o) => (objs.push(o), o);
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0).setDepth(200).setInteractive());
    add(woodPanel(this, W / 2 - 330, 170, 660, 300, 201, 16));
    add(title(this, W / 2, 215, '🎁 ¡Juego actualizado!', 34).setDepth(202));
    add(
      this.add
        .text(W / 2, 320, `Hemos cambiado muchas cosas y tu partida anterior se ha reiniciado.\nComo disculpa, ¡te regalamos ${GIFT_COINS} monedas!`, {
          fontFamily: EMOJI_FONT,
          fontSize: '22px',
          color: '#fff4d6',
          align: 'center',
          lineSpacing: 8,
          stroke: '#2e1c0f',
          strokeThickness: 4,
          wordWrap: { width: 580 },
        })
        .setOrigin(0.5)
        .setDepth(202)
    );
    add(makeButton(this, W / 2 - 100, 392, 200, 56, 'Aceptar', () => objs.forEach((o) => o.destroy && o.destroy()), { fontSize: 24, fill: 0x2d6a4f, depth: 203 }));
  }

  // Ficha de un nivel: número, etapa, estrellas, equipo con sus iconos, ver mapa, enemigos y jugar
  openLevel(lv, i) {
    const sv = this.sv;
    const unlocked = i === 0 || sv.cleared[LEVELS[i - 1].id];
    const done = sv.cleared[lv.id];
    const st = (sv.stars && sv.stars[lv.id]) || 0;
    const stageNum = Math.floor(i / PER_STAGE) + 1;
    const objs = [];
    const add = (o) => (objs.push(o), o);
    const close = () => objs.forEach((o) => o.destroy && o.destroy());
    const cx = W / 2;
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0, 0).setDepth(100).setInteractive());
    add(woodPanel(this, cx - 310, 96, 620, 520, 101, 16));
    add(title(this, cx, 142, `Nivel ${lv.id}`, 40).setDepth(102));
    add(this.add.text(cx, 184, `${lv.name.replace(/ · \d+/, '')} · Etapa ${stageNum}: ${STAGES[stageNum - 1].name}`, { fontFamily: FONT, fontSize: '18px', color: '#ffe9a0', fontStyle: 'bold', stroke: '#2e1c0f', strokeThickness: 4 }).setOrigin(0.5).setDepth(102));
    add(this.add.text(cx, 214, lv.subtitle, { fontFamily: FONT, fontSize: '16px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 3, align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5, 0).setDepth(102));
    add(
      this.add
        .text(cx, 272, done ? `${'★'.repeat(st)}${'☆'.repeat(3 - st)}` : unlocked ? 'Todavía sin completar' : '🔒 Supera el nivel anterior para jugarlo', { fontFamily: EMOJI_FONT, fontSize: done ? '40px' : '20px', color: '#ffd23f', stroke: '#2e1c0f', strokeThickness: 5 })
        .setOrigin(0.5)
        .setDepth(102)
    );
    // equipo con el que se jugaría
    const team = teamFor(sv, lv);
    add(this.add.text(cx, 312, 'Tu equipo', { fontFamily: FONT, fontSize: '18px', color: '#ffe9a0', fontStyle: 'bold', stroke: '#2e1c0f', strokeThickness: 4 }).setOrigin(0.5).setDepth(102));
    const iw = 66;
    team.forEach((id, k) => {
      const ix = cx - ((team.length - 1) * iw) / 2 + k * iw;
      add(this.add.rectangle(ix, 362, 58, 58, 0x2e1c0f, 0.6).setStrokeStyle(2, 0xb08d57).setDepth(102));
      const im = add(this.add.image(ix, 362, TOWER_ART[id].avatar).setDepth(103).setTint(TOWER_ART[id].tint ?? 0xffffff));
      im.setScale(52 / im.width);
    });
    // botones
    const play = add(makeButton(this, cx - 280, 418, 270, 66, '▶ Jugar', () => this.scene.start('Game', { level: lv.id }), { fontSize: 26, fill: 0x2d6a4f, depth: 103 }));
    play.setEnabled(!!unlocked);
    add(makeButton(this, cx + 10, 418, 270, 66, 'Ver mapa', () => this.showMinimap(lv), { fontSize: 24, fill: 0x2f5f8a, depth: 103 }));
    add(makeButton(this, cx - 280, 500, 270, 58, 'Enemigos del nivel', () => this.scene.start('Codex', { mode: 'level', level: lv.id, back: Math.floor(i / PER_STAGE) }), { fontSize: 20, fill: 0x7b3f8f, depth: 103, leftIcon: 'ic_book' }));
    add(makeButton(this, cx + 10, 500, 270, 58, 'Cerrar', close, { fontSize: 22, fill: 0x5b4636, depth: 103 }));
  }

  // Imagen pequeña del mapa del nivel: hierba, camino(s), entrada y castillo
  showMinimap(lv) {
    const objs = [];
    const add = (o) => (objs.push(o), o);
    const cols = lv.zoom ? 30 : 20;
    const rows = lv.zoom ? 12 : 8;
    const MW = 640;
    const cs = MW / cols;
    const MH = rows * cs;
    const x0 = W / 2 - MW / 2;
    const y0 = H / 2 - MH / 2 + 10;
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0).setDepth(120).setInteractive());
    add(woodPanel(this, x0 - 24, y0 - 64, MW + 48, MH + 140, 121, 16));
    add(this.add.text(W / 2, y0 - 34, `Mapa · Nivel ${lv.id}`, { fontFamily: FONT, fontSize: '24px', color: '#ffe9a0', fontStyle: 'bold', stroke: '#2e1c0f', strokeThickness: 5 }).setOrigin(0.5).setDepth(122));
    const g = add(this.add.graphics().setDepth(122));
    g.fillStyle(0x5d8a3a, 1);
    g.fillRect(x0, y0, MW, MH);
    g.lineStyle(1, 0x000000, 0.08);
    for (let c = 1; c < cols; c++) g.lineBetween(x0 + c * cs, y0, x0 + c * cs, y0 + MH);
    for (let r = 1; r < rows; r++) g.lineBetween(x0, y0 + r * cs, x0 + MW, y0 + r * cs);
    const P = ([c, r]) => ({ x: x0 + (Math.max(-0.5, Math.min(cols - 0.5, c)) + 0.5) * cs, y: y0 + (r + 0.5) * cs });
    const defs = lv.routes || [lv.path];
    for (const [wdt, col] of [[cs * 0.9, 0x6d4c25], [cs * 0.7, 0xc9a46a]]) {
      g.lineStyle(wdt, col, 1);
      for (const d of defs) {
        g.beginPath();
        d.forEach((pt, k) => (k ? g.lineTo(P(pt).x, P(pt).y) : g.moveTo(P(pt).x, P(pt).y)));
        g.strokePath();
      }
    }
    const a = P(defs[0][0]);
    const z = P(defs[0][defs[0].length - 1]);
    g.fillStyle(0xe53935, 1);
    g.fillTriangle(a.x - 4, a.y - 12, a.x + 14, a.y, a.x - 4, a.y + 12); // entrada
    g.fillStyle(0x90a4ae, 1);
    g.fillRect(z.x - 14, z.y - 14, 28, 28); // castillo
    g.lineStyle(3, 0x37474f, 1);
    g.strokeRect(z.x - 14, z.y - 14, 28, 28);
    g.lineStyle(4, 0x2e1c0f, 1);
    g.strokeRect(x0, y0, MW, MH);
    add(this.add.text(W / 2, y0 + MH + 16, 'Rojo: entrada de los zombis · Gris: tu castillo', { fontFamily: FONT, fontSize: '16px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(122));
    add(makeButton(this, W / 2 - 90, y0 + MH + 44, 180, 48, 'Cerrar', () => objs.forEach((o) => o.destroy && o.destroy()), { fontSize: 20, fill: 0x5b4636, depth: 123 }));
  }

  create() {
    const sv = load();
    this.sv = sv;
    const pages = Math.ceil(LEVELS.length / PER_STAGE);
    const page = Math.min(this.page, pages - 1);
    const stage = stageOf(page * PER_STAGE); // cada 5 niveles cambia la etapa y el fondo

    // fondo de hierba con decoración y unidades animadas
    for (let c = 0; c < 20; c++) for (let r = 0; r < 12; r++) this.add.image(c * 64, r * 64, 'grass', 10).setOrigin(0, 0).setDepth(0).setTint(stage.tint);
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(stage.shade, stage.alpha);
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
    const heroes = [['barbaro_idle', 90], ['elfo_idle', 170], ['mago_idle', 250], ['alq_idle', 330]];
    heroes.forEach(([k, x]) => {
      this.add.image(x, 668, 'shadow').setScale(0.42).setAlpha(0.5).setDepth(5);
      const s = this.add.sprite(x, 660, k).setOrigin(0.5, 0.62).setScale(0.95).setDepth(6);
      s.play(k);
      s.anims.setProgress(Math.random());
    });
    const walkers = [['orc_walk', 0xffffff, 2.4], ['sol_walk', 0xffffff, 2.7], ['orc_walk', 0xd8ff50, 2.2], ['orc_walk', 0xe6c07a, 2.6]];
    walkers.forEach(([k, tint, sc], i) => {
      const y = 572 + (i % 2) * 28;
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
      .text(W / 2, 126, `TWD · ${stage.name}`, { fontFamily: FONT, fontSize: '22px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 4 })
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

    // ---- niveles: 5 por etapa, puntos con bandera sobre un camino que avanza de izquierda a derecha
    const lvls = LEVELS.slice(page * PER_STAGE, page * PER_STAGE + PER_STAGE);
    const pts = lvls.map((lv, j) => ({ x: 190 + j * 225, y: 360 + Math.sin(j * 1.35 + 0.4) * 34 }));
    const full = [{ x: 30, y: pts[0].y + 12 }, ...pts, { x: W - 30, y: pts[pts.length - 1].y - 12 }];
    const curve = new Phaser.Curves.Spline(full.flatMap((q) => [q.x, q.y]));
    const road = this.add.graphics().setDepth(14);
    road.lineStyle(40, 0x2e1c0f, 0.9);
    curve.draw(road, 80);
    road.lineStyle(30, stage.road, 1);
    curve.draw(road, 80);
    road.fillStyle(0xfff4d6, 0.45);
    curve.getSpacedPoints(46).forEach((q, k) => k % 2 === 0 && road.fillCircle(q.x, q.y, 2.5)); // línea central discontinua
    this.add
      .text(W / 2, 236, `Etapa ${page + 1} de ${pages} · ${stage.name}`, { fontFamily: FONT, fontSize: '22px', color: '#ffe9a0', fontStyle: 'bold', stroke: '#2e1c0f', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(20);
    lvls.forEach((lv, j) => {
      const i = LEVELS.indexOf(lv);
      const unlocked = i === 0 || sv.cleared[LEVELS[i - 1].id];
      const done = sv.cleared[lv.id];
      const st = (sv.stars && sv.stars[lv.id]) || 0;
      const { x, y } = pts[j];
      const gfx = this.add.graphics().setDepth(16);
      gfx.fillStyle(0x000000, 0.3);
      gfx.fillEllipse(x, y + 30, 70, 18);
      // bandera
      gfx.lineStyle(4, 0x3e2723, 1);
      gfx.lineBetween(x + 20, y - 24, x + 20, y - 86);
      gfx.fillStyle(lv.boss ? 0x8e24aa : done ? 0x43a047 : unlocked ? 0xe53935 : 0x7a7a7a, 1);
      gfx.fillTriangle(x + 22, y - 86, x + 64, y - 74, x + 22, y - 62);
      gfx.lineStyle(2, 0x2e1c0f, 1);
      gfx.strokeTriangle(x + 22, y - 86, x + 64, y - 74, x + 22, y - 62);
      // punto del nivel
      if (unlocked && !done) {
        const halo = this.add.circle(x, y, 44, 0xffd23f, 0.35).setDepth(16);
        this.tweens.add({ targets: halo, scale: 1.18, alpha: 0.1, yoyo: true, repeat: -1, duration: 800 }); // el siguiente nivel por jugar
      }
      const dot = this.add.circle(x, y, 34, !unlocked ? 0x5a5048 : done ? 0xd4a017 : 0x2f8f5a).setStrokeStyle(5, 0x2e1c0f, 1).setDepth(17);
      this.add.circle(x, y, 27).setStrokeStyle(2, 0xffffff, 0.35).setDepth(17);
      this.add.text(x, y, unlocked ? String(lv.id) : '🔒', { fontFamily: EMOJI_FONT, fontSize: unlocked ? '30px' : '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#2e1c0f', strokeThickness: 5 }).setOrigin(0.5).setDepth(18);
      if (done) this.add.text(x, y + 46, `${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, { fontFamily: FONT, fontSize: '22px', color: '#ffd23f', stroke: '#2e1c0f', strokeThickness: 4 }).setOrigin(0.5).setDepth(18);
      this.add.text(x, y + (done ? 72 : 52), lv.name.replace(/ · \d+/, ''), { fontFamily: FONT, fontSize: '15px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 4, align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5, 0).setDepth(18);
      dot.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openLevel(lv, i));
      // libro de enemigos del nivel (abajo a la izquierda del punto)
      const book = this.add.image(x - 40, y + 30, 'ic_book').setScale(0.95).setDepth(19).setInteractive({ useHandCursor: true });
      book.on('pointerdown', () => this.scene.start('Codex', { mode: 'level', level: lv.id, back: page }));
    });
    if (pages > 1) {
      const left = makeButton(this, 4, 250, 52, 250, '◀', () => this.scene.restart({ page: page - 1 }), { fontSize: 34, fill: 0x5b4636, depth: 20 });
      left.setEnabled(page > 0);
      const right = makeButton(this, W - 56, 250, 52, 250, '▶', () => this.scene.restart({ page: page + 1 }), { fontSize: 34, fill: 0x5b4636, depth: 20 });
      right.setEnabled(page < pages - 1);
    }
    // música: botón y tecla M
    const mus = makeButton(this, W - 62, 8, 52, 38, '', () => paintMusic(toggleMusic(this)), { fill: 0x5b4636, depth: 20 });
    const musIcon = this.add.image(W - 36, 27, 'ui_icons', 5).setScale(2.4).setDepth(22); // icono de altavoz del pack
    const paintMusic = (on) => musIcon.setFrame(on ? 5 : 8).setAlpha(on ? 1 : 0.7);
    paintMusic(musicOn());
    bindMusicKey(this, paintMusic);
    addFullscreenButton(this, W - 62 - 58, 8, 52, 38, 20); // pantalla completa (junto al botón de música)
    if (sv.giftMsg) this.showGift(sv);

    makeButton(this, 750, 506, 230, 70, '⚔ Equipo', () => this.scene.start('Team'), { fill: 0x2f6f4a, fontSize: 26, depth: 20 });
    makeButton(this, 996, 506, 244, 70, 'Códice', () => this.scene.start('Codex'), { fill: 0x7b3f8f, fontSize: 26, depth: 20, leftIcon: 'ic_book' });

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
      .text(W / 2, H - 14, 'Prototipo jugable · Arte: Tiny Swords (Pixel Frog) y Tiny RPG Character Pack · Música: "Frost" de Alexander Nakarada (CC BY 4.0) · Fuente: Nunito (SIL OFL)', {
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





