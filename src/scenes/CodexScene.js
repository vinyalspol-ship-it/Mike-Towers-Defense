import Phaser from 'phaser';
import { W, H, FONT, EMOJI_FONT, COL } from '../config.js';
import { TOWERS, TOWER_ORDER } from '../data/towers.js';
import { towerUnlocked } from '../data/tree.js';
import { TOWER_ART } from '../towerArt.js';
import { load, reset, save } from '../storage.js';
import { makeButton, title, woodPanel, infoIcon, hideTip } from '../ui.js';
import { GLOSSARY, glossaryFor } from '../data/glossary.js';
import { ENEMIES, enemyInfo } from '../data/enemies.js';
import { LEVELS, ENEMY_ORDER, enemiesOfLevel, seenEnemies } from '../levelInfo.js';

// Datos base y consejos de cada defensa (las cifras salen de GameScene.stats() / newTowers.js: actualizar si cambian)
const INFO = {
  barbaro: { stats: ['Daño 16 · 1 golpe/s', 'Alcance 95 · cono de 72º', 'Crítico 5% (x2)'], tip: 'Pégalo al camino: golpea a todos los zombis del cono. Muy barato, ideal para empezar. El camino C lo especializa contra jefes.' },
  elfo: { stats: ['Daño 9 · 1,25 salvas/s', 'Alcance 250 (el mayor de las defensas básicas)', 'Flechas que pueden atravesar'], tip: 'Colócalo en el centro del mapa para cubrir varios tramos. Con las flechas afiladas, las que no encuentran más zombis siguen su camino.' },
  alquimista: { stats: ['Zona de 9 de daño/s durante 3 s', 'Alcance 161 · radio de zona 40', 'Lanza una poción cada 2,4 s'], tip: 'Excelente contra grupos y zombis lentos. Las pociones doradas dan un 30% más de suministros por zombi. Ojo con los tóxicos: son inmunes al veneno.' },
  mago: { stats: ['Daño 18 · explosión de radio 50', 'Alcance 115 (corto) · 1 hechizo cada 1,6 s', 'Orbes con efectos de hielo o fuego'], tip: 'Mucho daño en área pero poco alcance: ponlo en las curvas del camino. Los ignífugos aguantan sus llamas.' },
  lancero: { stats: ['Daño 20 · 1 estocada cada 1,1 s', 'Alcance 135 · línea que atraviesa a todos', 'Zona muerta: ninguna'], tip: 'Mejor donde el camino es recto y los zombis van en fila. Sus mejoras controlan (anclan, marcan) o multiplican el daño por combos.' },
  monje: { stats: ['Daño 7 · rayo cada 1,1 s', 'Alcance 170 · aura de 150', 'Su valor está en potenciar a otras defensas'], tip: 'Colócalo en el centro de tu defensa, rodeado de torres: su aura mejora cadencia y daño a las cercanas.' },
  ingeniero: { stats: ['Daño 6 · llave cada 1,3 s (casi nada)', 'Alcance 140', 'Trampas, torretas y golem según mejoras'], tip: 'No es de daño directo: coloca trampas en el camino, monta torretas o llama a un golem. Brilla con varias mejoras.' },
  asedio: { stats: ['Daño 42 · roca cada 2,6 s', 'Alcance 340 · zona muerta de 85', 'Explosión de radio 50'], tip: 'Artillería de largo alcance: no golpea lo que tiene cerca, así que cubre a las demás. Las rocas tardan en caer: los rápidos se le escapan hasta que aprende a anticipar.' },
  midas: { stats: ['Daño 5 · rayo cada 1,4 s', 'Alcance 175', 'Casi no hace daño: genera suministros'], tip: 'Rinde si dura muchas oleadas. Con el Recaudador guarda suministros en su inventario: recógelos con el botón de su panel. Su contador muestra cuánto oro ha recaudado en total.' },
  druida: { stats: ['Daño 11 · hoja cada 1,2 s', 'Alcance 170', 'Raíces, lobos y polillas según mejoras'], tip: 'Defensa de control: inmoviliza a los primeros zombis, suelta lobos y ralentiza con arbustos. Con Foco arcano castiga a los minijefes.' },
  nigromante: { stats: ['Daño 15 · rayo oscuro cada 1,6 s', 'Alcance 190', 'Esbirros, maldiciones y almas según mejoras'], tip: 'Usa a los zombis contra ellos mismos: resucita caídos, maldice a los fuertes y carga almas con las bajas.' },
};

// Códice de Evelmore: libro de dos páginas. A la izquierda la defensa; a la derecha, descripción y detalles.
export default class CodexScene extends Phaser.Scene {
  constructor() {
    super('Codex');
  }

  // modos: 'towers' (defensas + glosario), 'enemies' (todos los enemigos) o 'level' (los enemigos de un nivel)
  init(data) {
    this.idx = (data && data.index) || 0;
    this.mode = (data && data.mode) || 'towers';
    this.levelId = data && data.level;
    this.backPage = (data && data.back) || 0;
    this.msg = (data && data.msg) || '';
  }

  // lista de páginas según el modo
  list() {
    if (this.mode === 'towers') return [...TOWER_ORDER, '__glossary'];
    if (this.mode === 'level') return enemiesOfLevel(LEVELS.find((l) => l.id === this.levelId));
    return ENEMY_ORDER;
  }

  create() {
    this.sv = load();
    for (let c = 0; c < 20; c++) for (let r = 0; r < 12; r++) this.add.image(c * 64, r * 64, 'grass', 10).setOrigin(0, 0).setDepth(0);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0).setDepth(1);
    // tapa de madera y las dos páginas
    woodPanel(this, 40, 64, W - 80, H - 84, 2, 16);
    this.add.rectangle(60, 84, W / 2 - 66, H - 124, 0xf1dfae).setOrigin(0, 0).setStrokeStyle(2, 0xb08d57).setDepth(3);
    this.add.rectangle(W / 2 + 6, 84, W / 2 - 66, H - 124, 0xf1dfae).setOrigin(0, 0).setStrokeStyle(2, 0xb08d57).setDepth(3);
    this.add.rectangle(W / 2 - 6, 84, 12, H - 124, 0xb08d57).setOrigin(0, 0).setDepth(4); // lomo
    {
      const tt = title(this, W / 2 + 140, 32, this.mode === 'level' ? `Enemigos del nivel ${this.levelId}` : 'Códice de Evelmore', 32).setDepth(12);
      const bk = this.add.image(tt.x - tt.width / 2 - 26, 32, 'ic_book').setDepth(12);
      bk.setScale(40 / bk.width);
    }
    makeButton(this, 14, 10, 130, 42, '← Menú', () => this.scene.start('Menu', { page: this.backPage }), { fontSize: 18, depth: 12 });
    // pestañas: defensas / enemigos
    const tab = (x, label, mode) => {
      const on = this.mode === mode || (mode === 'enemies' && this.mode === 'level');
      makeButton(this, x, 10, 130, 42, label, () => this.scene.restart({ mode, index: 0, back: this.backPage }), { fontSize: 17, fill: on ? 0x2f6f4a : 0x5b4636, depth: 12 });
    };
    tab(156, 'Defensas', 'towers');
    tab(296, 'Enemigos', 'enemies');
    makeButton(this, W - 214, 10, 200, 42, '⚔ Equipo', () => this.scene.start('Team'), { fontSize: 18, fill: 0x2f6f4a, depth: 12 });
    // pasar página: botones y flechas del teclado
    this.prev = makeButton(this, 8, H / 2 - 40, 44, 80, '◀', () => this.go(-1), { fontSize: 30, fill: 0x5b4636, depth: 12 });
    this.next = makeButton(this, W - 52, H / 2 - 40, 44, 80, '▶', () => this.go(1), { fontSize: 30, fill: 0x5b4636, depth: 12 });
    this.input.keyboard.on('keydown-LEFT', () => this.go(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.go(1));
    this.page = [];
    if (this.msg) {
      const m = this.add.text(W / 2, 690, this.msg, { fontFamily: FONT, fontSize: '18px', color: '#a5d6a7', fontStyle: 'bold', stroke: '#1b1209', strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: m, alpha: 0, delay: 2500, duration: 600 });
    }
    if (this.mode === 'towers') makeButton(this, 76, 598, 140, 44, 'SAVE', () => this.confirmSave(), { fontSize: 20, fill: 0x8a6d1a, depth: 12 });
    this.show();
  }

  // Partida preparada: 2500 de oro, 5 cerebros y los niveles 1-5 superados con 1 estrella (se puede jugar el 6). Sustituye el progreso actual.
  confirmSave() {
    if (this.saveUi) return;
    const objs = [];
    this.saveUi = objs;
    const add = (o) => (objs.push(o), o);
    const close = () => {
      objs.forEach((o) => o.destroy && o.destroy());
      this.saveUi = null;
    };
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0, 0).setDepth(100).setInteractive());
    add(woodPanel(this, W / 2 - 300, 170, 600, 340, 101, 16));
    add(title(this, W / 2, 215, 'Cargar partida SAVE', 32).setDepth(102));
    add(
      this.add
        .text(W / 2, 322, 'Se cargará una partida con 2500 de oro, 5 cerebros y los niveles 1 a 5 superados con una estrella (podrás jugar el nivel 6).\n\nTu progreso actual se sustituirá.', { fontFamily: EMOJI_FONT, fontSize: '19px', color: COL.cream, align: 'center', lineSpacing: 5, stroke: '#2e1c0f', strokeThickness: 4, wordWrap: { width: 540 } })
        .setOrigin(0.5)
        .setDepth(102)
    );
    add(makeButton(this, W / 2 - 250, 420, 230, 60, 'Cancelar', close, { fontSize: 22, fill: 0x5b4636, depth: 103 }));
    add(
      makeButton(this, W / 2 + 20, 420, 230, 60, 'Cargar', () => {
        const s = reset();
        s.coins = 2500;
        s.brains = 5;
        s.cleared = {};
        s.stars = {};
        for (let id = 1; id <= 5; id++) {
          s.cleared[id] = true;
          s.stars[id] = 1;
        }
        save();
        this.scene.restart({ mode: 'towers', index: this.idx, back: this.backPage, msg: 'Partida SAVE cargada: 2500 de oro y 5 cerebros' });
      }, { fontSize: 24, fill: 0x2e7d32, depth: 103 })
    );
  }

  go(d) {
    const n = this.list().length;
    this.idx = (this.idx + d + n) % n;
    this.show();
  }

  // Página de un enemigo: a la izquierda su figura animada (silueta negra si aún no lo has visto); a la derecha su ficha
  showEnemy(type, add) {
    const def = ENEMIES[type];
    const known = seenEnemies().has(type);
    const ink = '#3b2412';
    const lx = 60;
    const lw = W / 2 - 66;
    const n = this.list().length;
    add(this.add.text(lx + lw / 2, 112, known ? def.name : '???', { fontFamily: FONT, fontSize: '30px', color: '#7b241c', fontStyle: 'bold', align: 'center', wordWrap: { width: lw - 40 } }).setOrigin(0.5).setDepth(5));
    add(this.add.text(lx + lw / 2, 148, known ? def.desc : 'Aún no lo has encontrado en ninguna partida.', { fontFamily: EMOJI_FONT, fontSize: '16px', color: ink, fontStyle: 'italic', align: 'center', wordWrap: { width: lw - 50 } }).setOrigin(0.5, 0).setDepth(5));
    add(this.add.ellipse(lx + lw / 2, 450, 220, 36, 0x000000, 0.18).setDepth(4));
    // alto real de la figura dentro del fotograma y dónde están sus pies (orco/soldado: fotogramas de 100 px; hobgoblin: 16 px)
    const FIG = { orc_walk: [15, 0.57], sol_walk: [21, 0.6], gob_run: [16, 0.97] }[def.art.key] || [20, 0.6];
    const sc = (150 + Math.min(100, def.size)) / FIG[0];
    const spr = add(this.add.sprite(lx + lw / 2, 450, def.art.key).setOrigin(0.5, FIG[1]).setScale(sc).setDepth(5));
    spr.play(def.art.key);
    if (known) spr.setTint(def.art.tint ?? 0xffffff);
    else spr.setTint(0x000000).setTintMode(Phaser.TintModes.FILL); // silueta
    const where = LEVELS.find((l) => enemiesOfLevel(l).includes(type));
    add(this.add.text(lx + lw / 2, 560, `${this.mode === 'level' ? `Nivel ${this.levelId} · ` : ''}${this.idx + 1} / ${n}`, { fontFamily: FONT, fontSize: '16px', color: '#6d5a45' }).setOrigin(0.5).setDepth(5));
    const rx = W / 2 + 26;
    const rw = W / 2 - 106;
    if (!known) {
      add(this.add.text(rx, 110, 'Enemigo por descubrir', { fontFamily: FONT, fontSize: '22px', color: '#7b241c', fontStyle: 'bold' }).setDepth(5));
      add(this.add.text(rx, 150, `Su ficha se completará la primera vez que aparezca en una partida.${where ? `\n\nSale por primera vez en el nivel ${where.id} (${where.name.replace(/ · \d+/, '')}).` : ''}`, { fontFamily: EMOJI_FONT, fontSize: '17px', color: ink, wordWrap: { width: rw }, lineSpacing: 4 }).setDepth(5));
      return;
    }
    const info = enemyInfo(def);
    add(this.add.text(rx, 100, 'Ficha', { fontFamily: FONT, fontSize: '22px', color: '#7b241c', fontStyle: 'bold' }).setDepth(5));
    let y = 134;
    for (const [k, v] of info.rows) {
      add(this.add.text(rx, y, k, { fontFamily: FONT, fontSize: '17px', color: '#6d5a45', fontStyle: 'bold' }).setDepth(5));
      add(this.add.text(rx + 190, y, v, { fontFamily: EMOJI_FONT, fontSize: '17px', color: ink }).setDepth(5));
      y += 28;
    }
    if (info.traits.length) {
      y += 10;
      add(this.add.text(rx, y, 'Rasgos', { fontFamily: FONT, fontSize: '20px', color: '#7b241c', fontStyle: 'bold' }).setDepth(5));
      y += 30;
      const t = add(this.add.text(rx, y, info.traits.map((s) => '• ' + s).join('\n'), { fontFamily: EMOJI_FONT, fontSize: '16px', color: ink, wordWrap: { width: rw }, lineSpacing: 4 }).setDepth(5));
      y += t.height;
    }
    if (where) add(this.add.text(rx, Math.max(y + 16, 520), `Aparece desde el nivel ${where.id}`, { fontFamily: FONT, fontSize: '15px', color: '#6d5a45' }).setDepth(5));
  }

  // Última página del libro: glosario de combate (resistencias, dorados, control...)
  showGlossary(add) {
    const ink = '#3b2412';
    const lx = 60;
    const lw = W / 2 - 66;
    const rx = W / 2 + 26;
    const rw = W / 2 - 106;
    add(this.add.text(lx + lw / 2, 112, 'Glosario de combate', { fontFamily: FONT, fontSize: '32px', color: '#7b241c', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5));
    add(this.add.text(lx + 30, 170, 'Las dos resistencias', { fontFamily: FONT, fontSize: '22px', color: '#7b241c', fontStyle: 'bold' }).setDepth(5));
    const body = (txt, y, w = lw - 60) => add(this.add.text(lx + 30, y, txt, { fontFamily: EMOJI_FONT, fontSize: '16px', color: ink, lineSpacing: 4, wordWrap: { width: w } }).setDepth(5));
    const a = body('🛡 Armadura (resistencia física): el enemigo absorbe un porcentaje del daño de los golpes físicos.\n\nLa ignoran: los ataques mágicos (Mago, Nigromante, Druida), el veneno, el fuego (todo daño continuo) y las habilidades que lo indican, como la Lluvia de flechas y la Magia oscura del Elfo.', 204);
    body('✨ Resistencia mágica: el enemigo reduce un porcentaje del daño de las fuentes mágicas: Mago, Nigromante y Druida. No afecta a los golpes físicos.\n\nUn enemigo puede tener solo una de las dos, o un poco de cada. Los blindados, por ejemplo, tienen mucha armadura: la magia los funde.', 204 + a.height + 18);
    add(this.add.text(lx + lw / 2, 590, `${TOWER_ORDER.length + 1} / ${TOWER_ORDER.length + 1}`, { fontFamily: FONT, fontSize: '16px', color: '#6d5a45' }).setOrigin(0.5).setDepth(5));
    let y = 100;
    GLOSSARY.filter((g) => g.key !== 'armadura' && g.key !== 'magica').forEach((g) => {
      add(this.add.text(rx, y, g.title, { fontFamily: FONT, fontSize: '19px', color: '#7b241c', fontStyle: 'bold' }).setDepth(5));
      const t = add(this.add.text(rx, y + 25, g.text, { fontFamily: EMOJI_FONT, fontSize: '15px', color: ink, lineSpacing: 2, wordWrap: { width: rw } }).setDepth(5));
      y += 25 + t.height + 14;
    });
  }

  show() {
    hideTip();
    this.page.forEach((o) => o.destroy());
    this.page = [];
    const add = (o) => {
      this.page.push(o);
      return o;
    };
    const item = this.list()[this.idx];
    if (!item) return;
    if (this.mode !== 'towers') return this.showEnemy(item, add);
    if (item === '__glossary') return this.showGlossary(add);
    const id = TOWER_ORDER[this.idx];
    const def = TOWERS[id];
    const art = TOWER_ART[id];
    const info = INFO[id];
    const open = towerUnlocked(this.sv, id);
    const ink = '#3b2412';
    const lx = 60;
    const lw = W / 2 - 66;

    // ---------------- página izquierda: la defensa
    add(this.add.text(lx + lw / 2, 112, def.name, { fontFamily: FONT, fontSize: '34px', color: '#7b241c', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5));
    add(this.add.text(lx + lw / 2, 150, `${def.emoji}  ${def.desc}`, { fontFamily: EMOJI_FONT, fontSize: '16px', color: ink, fontStyle: 'italic', align: 'center', wordWrap: { width: lw - 50 } }).setOrigin(0.5, 0).setDepth(5));
    add(this.add.ellipse(lx + lw / 2, 410, 220, 36, 0x000000, 0.18).setDepth(4));
    const spr = add(this.add.sprite(lx + lw / 2, 380, art.idle).setOrigin(0.5, 0.7).setScale(art.idle === 'lan_idle' ? art.scale * 2.2 : art.scale * 3).setDepth(5).setTint(art.tint ?? 0xffffff)); // el lancero tiene fotogramas más grandes
    spr.play(art.idle);
    if (!open) spr.setTint(0x000000).setTintMode(Phaser.TintModes.FILL); // aún sin desbloquear: silueta
    // ataque de muestra al pulsarla
    spr.setInteractive({ useHandCursor: true });
    spr.on('pointerdown', () => {
      spr.play(art.atk, true);
      spr.once('animationcomplete', () => spr.active && spr.play(art.idle, true));
    });
    add(this.add.text(lx + lw / 2, 462, `Coste de construcción: 🛠 ${def.cost}`, { fontFamily: EMOJI_FONT, fontSize: '20px', color: ink, fontStyle: 'bold' }).setOrigin(0.5).setDepth(5));
    add(this.add.text(lx + lw / 2, 494, `Habilidad especial: ${def.skill.icon} ${def.skill.name} (recarga ${def.skill.cooldown} s)`, { fontFamily: EMOJI_FONT, fontSize: '16px', color: ink, align: 'center', wordWrap: { width: lw - 50 } }).setOrigin(0.5, 0).setDepth(5));
    add(this.add.text(lx + lw / 2, 560, open ? '(pulsa a la defensa para verla atacar)' : '🔒 Aún no la has desbloqueado en el árbol de mejoras', { fontFamily: EMOJI_FONT, fontSize: '14px', color: open ? '#6d5a45' : '#7b241c' }).setOrigin(0.5).setDepth(5));
    add(this.add.text(lx + lw / 2, 590, `${this.idx + 1} / ${TOWER_ORDER.length}`, { fontFamily: FONT, fontSize: '16px', color: '#6d5a45' }).setOrigin(0.5).setDepth(5));

    // ---------------- página derecha: detalles
    const rx = W / 2 + 26;
    const rw = W / 2 - 106;
    add(this.add.text(rx, 100, 'Datos base', { fontFamily: FONT, fontSize: '20px', color: '#7b241c', fontStyle: 'bold' }).setDepth(5));
    add(this.add.text(rx, 126, info.stats.map((s) => '• ' + s).join('\n'), { fontFamily: EMOJI_FONT, fontSize: '15px', color: ink, lineSpacing: 3, wordWrap: { width: rw } }).setDepth(5));
    add(this.add.text(rx, 204, 'Cómo usarla', { fontFamily: FONT, fontSize: '20px', color: '#7b241c', fontStyle: 'bold' }).setDepth(5));
    add(this.add.text(rx, 230, info.tip, { fontFamily: EMOJI_FONT, fontSize: '15px', color: ink, wordWrap: { width: rw } }).setDepth(5));
    add(this.add.text(rx, 318, 'Mejoras (3 caminos de 4 niveles; nivel 3 solo en 2 caminos, nivel 4 solo en uno)', { fontFamily: FONT, fontSize: '14px', color: '#6d5a45', fontStyle: 'bold', wordWrap: { width: rw } }).setDepth(5));
    const colW = Math.floor(rw / 3) - 4;
    ['A', 'B', 'C'].forEach((P, ci) => {
      const path = def.paths[P];
      const x = rx + ci * (colW + 6);
      add(this.add.rectangle(x - 3, 346, colW + 2, 252, 0xe6d09a, 0.7).setOrigin(0, 0).setStrokeStyle(1, 0xb08d57).setDepth(4));
      add(this.add.text(x, 350, path.name, { fontFamily: FONT, fontSize: '15px', color: '#7b241c', fontStyle: 'bold', wordWrap: { width: colW - 4 } }).setDepth(5));
      let y = 374;
      path.tiers.forEach((u, k) => {
        const t = add(this.add.text(x, y, `${k + 1}. ${u.name}  🛠${u.cost}\n${u.desc}`, { fontFamily: EMOJI_FONT, fontSize: '11px', color: ink, lineSpacing: 1, wordWrap: { width: colW - 4 } }).setDepth(5));
        const gl = glossaryFor(`${u.name} ${u.desc}`);
        if (gl.length) infoIcon(this, x + colW - 12, y + t.height - 7, gl, 6).forEach((o) => add(o)); // "i": aclara términos de la mejora
        y += t.height + 6;
      });
    });
  }
}

