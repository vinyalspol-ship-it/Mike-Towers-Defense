import Phaser from 'phaser';
import { W, H, FONT, EMOJI_FONT, COL } from '../config.js';
import { TOWERS, TOWER_ORDER } from '../data/towers.js';
import { towerUnlocked } from '../data/tree.js';
import { TOWER_ART } from '../towerArt.js';
import { load } from '../storage.js';
import { makeButton, title, woodPanel } from '../ui.js';

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

  init(data) {
    this.idx = (data && data.index) || 0;
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
    title(this, W / 2, 32, '📖 Códice de Evelmore', 34).setDepth(12);
    makeButton(this, 14, 10, 130, 42, '← Menú', () => this.scene.start('Menu'), { fontSize: 18, depth: 12 });
    makeButton(this, W - 214, 10, 200, 42, '⚔ Equipo', () => this.scene.start('Team'), { fontSize: 18, fill: 0x2f6f4a, depth: 12 });
    // pasar página: botones y flechas del teclado
    this.prev = makeButton(this, 8, H / 2 - 40, 44, 80, '◀', () => this.go(-1), { fontSize: 30, fill: 0x5b4636, depth: 12 });
    this.next = makeButton(this, W - 52, H / 2 - 40, 44, 80, '▶', () => this.go(1), { fontSize: 30, fill: 0x5b4636, depth: 12 });
    this.input.keyboard.on('keydown-LEFT', () => this.go(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.go(1));
    this.page = [];
    this.show();
  }

  go(d) {
    this.idx = (this.idx + d + TOWER_ORDER.length) % TOWER_ORDER.length;
    this.show();
  }

  show() {
    this.page.forEach((o) => o.destroy());
    this.page = [];
    const add = (o) => {
      this.page.push(o);
      return o;
    };
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
        y += t.height + 6;
      });
    });
  }
}

