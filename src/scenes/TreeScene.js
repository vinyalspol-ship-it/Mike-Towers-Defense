import Phaser from 'phaser';
import { W, H, FONT, EMOJI_FONT, COL } from '../config.js';
import { NODES, has, whyNot, buy, FREE_NODES } from '../data/tree.js';
import { load, save } from '../storage.js';
import { makeButton, title } from '../ui.js';
import { bindMusicKey } from '../music.js';

let lastZoom = 1; // zoom del árbol (rueda del ratón), se conserva entre recargas
const HEADER = 60; // alto de la cabecera
const PANEL_TOP = 626; // inicio del panel inferior
const HIT = 34; // radio de pulsación de un nodo

// Constelación: los nodos salen del centro; se arrastra con el ratón (o el dedo) para ver más.
export default class TreeScene extends Phaser.Scene {
  constructor() {
    super('Tree');
  }

  init(data) {
    this.selected = (data && data.selected) || null;
    this.msg = (data && data.msg) || '';
  }

  create() {
    const sv = load();
    this.sv = sv;

    // cielo nocturno con estrellas que se mueven más despacio (efecto de profundidad)
    this.add.rectangle(0, 0, W, H, 0x0c0a1c).setOrigin(0, 0).setDepth(0);
    this.far = this.add.container(0, 0).setDepth(1);
    const rng = new Phaser.Math.RandomDataGenerator(['stars']);
    for (let i = 0; i < 160; i++) {
      const s = this.add.circle(rng.between(-600, W + 600), rng.between(-400, H + 400), rng.pick([1, 1, 1.5, 2]), 0xffffff, rng.realInRange(0.25, 0.9));
      this.far.add(s);
    }

    this.world = this.add.container(W / 2, (HEADER + PANEL_TOP) / 2).setDepth(2);
    this.lines = this.add.graphics();
    this.world.add(this.lines);
    this.nodeObjs = [];

    // límites del arrastre según el tamaño de la constelación
    const vis = Object.keys(NODES).filter((id) => this.isVisible(id) || this.isGhost(id)).map((id) => NODES[id]);
    this.zoom = lastZoom;
    this.world.setScale(lastZoom);
    const xs = vis.map((n) => n.x);
    const ys = vis.map((n) => n.y);
    this.bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };

    this.drawNodes();
    this.centerOn(this.selected && NODES[this.selected] ? NODES[this.selected] : { x: 0, y: 0 });
    this.setupDrag();
    this.buildUi();
    if (this.selected) this.showInfo(this.selected);
    if (this.msg) this.info.setText(this.msg);
  }

  // Niebla: un nodo se ve si está comprado o si ya se cumplen sus requisitos (es de los siguientes por comprar)
  isVisible(id) {
    if (FREE_NODES.includes(id) && !has(this.sv, 'root')) return false; // Bárbaro y Elfo: ? hasta comprar el Cuartel
    return has(this.sv, id) || NODES[id].req.every((r) => has(this.sv, r));
  }

  // Nodo "fantasma": aún no se puede comprar, pero cuelga de uno visible. Se ve gris con un "?" (hay más por descubrir)
  isGhost(id) {
    const n = NODES[id];
    return !this.isVisible(id) && !!n.parent && this.isVisible(n.parent);
  }

  // ------------------------------------------------------------------ DIBUJO
  drawNodes() {
    this.nodeObjs.forEach((o) => o.destroy());
    this.nodeObjs = [];
    const g = this.lines;
    g.clear();
    const sv = this.sv;

    // líneas entre nodos (doradas si el tramo ya está desbloqueado)
    for (const [id, n] of Object.entries(NODES)) {
      if (!n.parent || !(this.isVisible(id) || this.isGhost(id)) || !this.isVisible(n.parent)) continue;
      const p = NODES[n.parent];
      const done = has(sv, id) && has(sv, n.parent);
      g.lineStyle(done ? 5 : 3, done ? 0xffd23f : 0x4a4770, done ? 0.95 : 0.7);
      g.lineBetween(p.x, p.y, n.x, n.y);
    }

    for (const [id, n] of Object.entries(NODES)) {
      if (this.isGhost(id)) {
        const r = n.kind === 'big' ? 32 : n.kind === 'char' ? 34 : 26;
        const gs = this.add.circle(n.x, n.y, r, 0x24233a).setStrokeStyle(3, 0x4a4962, 0.8);
        const q = this.add.text(n.x, n.y, '?', { fontFamily: FONT, fontSize: '30px', color: '#7d7c99', fontStyle: 'bold' }).setOrigin(0.5);
        this.world.add([gs, q]);
        this.nodeObjs.push(gs, q);
        continue;
      }
      if (!this.isVisible(id)) continue; // niebla: más allá de los fantasmas no se ve nada
      const owned = has(sv, id);
      const reqOk = n.req.every((r) => has(sv, r));
      const excluded = !owned && n.excl && has(sv, n.excl);
      const buyable = !owned && reqOk && !excluded;
      const radius = n.kind === 'root' ? 38 : n.kind === 'big' ? 32 : n.kind === 'char' ? 34 : 26;

      const fill = owned ? 0xffd23f : buyable ? 0x2a2f66 : 0x1a1830;
      const ring = owned ? 0xfff2a8 : buyable ? n.color : 0x3b3860;
      const halo = this.add.circle(n.x, n.y, radius + 9, owned ? 0xffd23f : n.color, owned ? 0.22 : buyable ? 0.18 : 0.05);
      const star = this.add.circle(n.x, n.y, radius, fill).setStrokeStyle(4, ring, owned || buyable ? 1 : 0.7);
      const icon = this.add
        .text(n.x, n.y, n.icon, {
          fontFamily: EMOJI_FONT,
          fontSize: n.kind === 'path' || n.kind === 'big' ? '24px' : '28px',
          color: owned ? '#2e1c0f' : '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      icon.setAlpha(owned || buyable ? 1 : 0.5);
      const cost = owned ? '✓' : n.cur === 'brains' ? `${n.cost}🧠` : n.cost ? `${n.cost}🪙` : 'Gratis';
      const label = this.add
        .text(n.x, n.y + radius + 5, `${n.name}\n${cost}`, {
          fontFamily: EMOJI_FONT,
          fontSize: '12px',
          color: owned ? '#ffe9a0' : buyable ? '#ffffff' : '#8b88b0',
          align: 'center',
          stroke: '#0c0a1c',
          strokeThickness: 3,
          wordWrap: { width: 120 },
        })
        .setOrigin(0.5, 0);
      this.world.add([halo, star, icon, label]);
      this.nodeObjs.push(halo, star, icon, label);
      if (buyable) {
        this.tweens.add({ targets: halo, alpha: 0.4, scale: 1.12, yoyo: true, repeat: -1, duration: 900 + (n.x % 5) * 60 });
      }
      if (this.selected === id) {
        const sel = this.add.circle(n.x, n.y, radius + 14).setStrokeStyle(4, 0xffffff, 1).setFillStyle(0, 0);
        this.world.add(sel);
        this.nodeObjs.push(sel);
      }
    }
    // los nodos van sobre las líneas
    this.world.bringToTop(this.lines);
    this.world.sendToBack(this.lines);
  }

  // -------------------------------------------------------------- ARRASTRE
  setupDrag() {
    this.drag = null;
    this.input.on('pointerdown', (p) => {
      if (p.y < HEADER || p.y > PANEL_TOP) return;
      this.drag = { x: p.x, y: p.y, wx: this.world.x, wy: this.world.y, moved: false };
    });
    this.input.on('pointermove', (p) => {
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.x;
      const dy = p.y - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) this.drag.moved = true;
      if (this.drag.moved) this.panTo(this.drag.wx + dx, this.drag.wy + dy);
    });
    this.input.on('pointerup', (p) => {
      const d = this.drag;
      this.drag = null;
      if (!d || d.moved) return;
      this.tap((p.x - this.world.x) / this.zoom, (p.y - this.world.y) / this.zoom);
    });
    // rueda del ratón: acercar / alejar sobre el puntero
    this.input.on('wheel', (p, over, dx, dy) => {
      if (p.y < HEADER || p.y > PANEL_TOP) return;
      const z0 = this.zoom;
      const z1 = Phaser.Math.Clamp(z0 * (dy < 0 ? 1.12 : 1 / 1.12), 0.35, 1.8);
      if (z1 === z0) return;
      const wx = (p.x - this.world.x) / z0;
      const wy = (p.y - this.world.y) / z0;
      this.zoom = lastZoom = z1;
      this.world.setScale(z1);
      this.panTo(p.x - wx * z1, p.y - wy * z1);
    });
    this.events.once('shutdown', () => {
      this.input.off('wheel');
      this.input.off('pointerdown');
      this.input.off('pointermove');
      this.input.off('pointerup');
    });
  }

  panTo(x, y) {
    const b = this.bounds;
    const z = this.zoom;
    const m = 140;
    // si el contenido es más pequeño que la pantalla, los límites se invierten: se centra
    const clampAxis = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Phaser.Math.Clamp(v, lo, hi));
    // libre: se puede llevar cualquier borde de la constelación hasta el centro de la pantalla
    const mid = (HEADER + PANEL_TOP) / 2;
    x = clampAxis(x, W / 2 - (b.maxX + m / 2) * z, W / 2 - (b.minX - m / 2) * z);
    y = clampAxis(y, mid - (b.maxY + m / 2) * z, mid - (b.minY - m / 2) * z);
    this.world.setPosition(x, y);
    this.far.setPosition(x * 0.25, y * 0.25);
  }

  centerOn(p) {
    this.panTo(W / 2 - p.x * this.zoom, (HEADER + PANEL_TOP) / 2 - p.y * this.zoom);
  }

  tap(wx, wy) {
    let best = null;
    let bd = HIT + 10;
    for (const [id, n] of Object.entries(NODES)) {
      if (!this.isVisible(id)) continue;
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    if (best) this.select(best);
  }

  // ---------------------------------------------------------------------- UI
  buildUi() {
    // cabecera
    this.add.rectangle(0, 0, W, HEADER, 0x2e1c0f, 0.92).setOrigin(0, 0).setDepth(10);
    title(this, W / 2, 28, '🌳 Árbol de mejoras', 32).setDepth(11);
    makeButton(this, 14, 10, 120, 40, '← Menú', () => this.scene.start('Menu'), { fontSize: 18, depth: 12 });
    makeButton(this, 146, 10, 130, 40, '⊙ Centrar', () => this.centerOn({ x: 0, y: 0 }), { fontSize: 16, depth: 12 });
    makeButton(this, 288, 10, 200, 40, '💰 Gastar todo el oro', () => this.buyAll(), { fontSize: 16, fill: 0x7a5c00, depth: 12 });
    this.add
      .text(W - 20, 16, `🪙 ${this.sv.coins}   🧠 ${this.sv.brains}   🥇 ${this.sv.ingots}`, {
        fontFamily: EMOJI_FONT,
        fontSize: '22px',
        color: '#fff4d6',
        stroke: '#2e1c0f',
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(11);

    // panel inferior con la descripción del nodo elegido
    this.add.rectangle(0, PANEL_TOP, W, H - PANEL_TOP, COL.wood).setOrigin(0, 0).setDepth(10);
    this.add.rectangle(0, PANEL_TOP, W, 5, COL.woodLight).setOrigin(0, 0).setDepth(11);
    this.info = this.add
      .text(24, PANEL_TOP + 14, 'Arrastra con el ratón (o el dedo) para moverte por la constelación. Toca una estrella para ver qué hace.', {
        fontFamily: EMOJI_FONT,
        fontSize: '19px',
        color: '#fff4d6',
        stroke: '#2e1c0f',
        strokeThickness: 3,
        wordWrap: { width: 900 },
      })
      .setDepth(11);
    this.buyBtn = makeButton(this, 960, PANEL_TOP + 16, 300, 60, '', () => this.tryBuy(), { fontSize: 20, fill: 0x2d6a4f, depth: 12 });
    this.buyBtn.setVisible(false);
    // la barra espaciadora compra el nodo elegido
    this.input.keyboard.addCapture('SPACE');
    this.input.keyboard.on('keydown-SPACE', () => this.tryBuy());
    bindMusicKey(this);
  }

  select(id) {
    this.selected = id;
    this.drawNodes();
    this.showInfo(id);
  }

  showInfo(id) {
    const nd = NODES[id];
    const owned = has(this.sv, id);
    const why = owned ? null : whyNot(this.sv, id);
    this.info.setText(`${nd.name}: ${nd.desc}${owned ? '\n✅ Ya comprado' : why ? '\n⚠ ' + why : ''}`);
    this.buyBtn.setVisible(!owned);
    if (!owned) {
      const cost = nd.cur === 'brains' ? `${nd.cost} 🧠` : nd.cost ? `${nd.cost} 🪙` : 'Gratis';
      this.buyBtn.setText(`Comprar · ${cost}  [Espacio]`);
      this.buyBtn.setEnabled(!why);
    }
  }

  // Compra de golpe todas las mejoras posibles con las monedas disponibles (primero las más baratas).
  // Solo gasta monedas: los nodos que cuestan cerebros se compran a mano.
  buyAll() {
    const sv = this.sv;
    const bought = [];
    const start = sv.coins;
    for (;;) {
      let best = null;
      for (const [id, n] of Object.entries(NODES)) {
        if (n.cur === 'brains' || has(sv, id) || whyNot(sv, id)) continue;
        if (!best || n.cost < NODES[best].cost) best = id;
      }
      if (!best) break;
      buy(sv, best);
      bought.push(best);
    }
    if (!bought.length) {
      this.info.setText('No hay ninguna mejora de monedas que puedas comprar ahora mismo.');
      return;
    }
    save();
    const names = bought.slice(0, 6).map((id) => NODES[id].name).join(', ');
    this.scene.restart({ msg: `💰 Compradas ${bought.length} mejoras (${start - sv.coins} monedas): ${names}${bought.length > 6 ? '…' : ''}` });
  }

  tryBuy() {
    const id = this.selected;
    if (!id || whyNot(this.sv, id)) return;
    buy(this.sv, id);
    save();
    // se reinicia la escena conservando el nodo elegido para refrescar monedas y estados
    this.scene.restart({ selected: id });
  }
}



