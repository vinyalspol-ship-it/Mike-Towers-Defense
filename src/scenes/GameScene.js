import Phaser from 'phaser';
import { W, H, TILE, COLS, ROWS, HUD_H, MAP_Y, PANEL_Y, PANEL_H, FONT, EMOJI_FONT, COL } from '../config.js';
import { TOWERS, PATH_KEYS } from '../data/towers.js';
import { ENEMIES, enemyInfo } from '../data/enemies.js';
import { LEVELS, waveGroups, rampOf, isMassive } from '../data/levels.js';
import { DTYPES, HERO_DTYPE, NO_AIR, predomOf } from '../data/damage.js';
import { load, save } from '../storage.js';
import { has, gemRates, COINS_PER_KILL, pathTierUnlocked, towerUnlocked, START_LIVES, wallLives, maxSlots } from '../data/tree.js';
import { makeButton, woodPanel, iconButton, infoIcon, hideTip, title } from '../ui.js';
import { glossaryFor } from '../data/glossary.js';
import { iconKeyFor } from '../upgradeIcons.js';
import { bindMusicKey } from '../music.js';
import { playFx } from '../art.js';
import { NewTowers, NEW_TYPES } from '../newTowers.js';
import { DEV_TOOLS } from '../devMode.js';
import { toggleFullscreen, fsSupported } from '../fullscreen.js';
import { TOWER_ART } from '../towerArt.js';
import { enemiesOfLevel, seenEnemies } from '../levelInfo.js';

const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const LANE = 18; // desplazamiento lateral máximo (px) dentro del camino de 64 px
const PATH_CLEAR = 46; // distancia mínima de una defensa al centro del camino
const TOWER_GAP = 54; // distancia mínima entre dos defensas
const MAX_SLOTS = 6; // huecos de defensa visibles en el panel
const SLOT_W = 100; // ancho de las casillas para colocar defensas
const TUT_STEPS = ['place_barb', 'place_elf', 'call_wave', 'speed', 'priority', 'upgrade', 'skill_buy', 'skill_use', 'sell', 'done'];
const PRIORITIES = [['first', 'Primero'], ['last', 'Último'], ['hp', 'Más vida'], ['armor', 'Armados']];


export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.levelId = data.level || 1;
    this.infernal = !!data.infernal; // modo infernal (25 rondas, más duro)
  }

  // ------------------------------------------------------------------ SETUP
  create() {
    this.sv = load();
    const base = LEVELS[this.levelId - 1];
    // copia del nivel: en el modo infernal llega a la ronda 25
    this.level = base.tutorial ? base : { ...base, infernal: this.infernal, waveCount: this.infernal ? 25 : base.waveCount };
    // mundo: los niveles grandes (zoom < 1) tienen más casillas y se ven alejados con la cámara
    this.zoom = this.level.zoom || 1;
    this.WW = Math.round(W / this.zoom); // ancho del mundo en px de mundo
    this.WH = Math.round((PANEL_Y - MAP_Y) / this.zoom); // alto del mapa
    this.cols = Math.round(this.WW / TILE);
    this.rows = Math.round(this.WH / TILE);
    this.worldBottom = MAP_Y + this.WH;
    this.setupCameras();
    this.team = this.computeTeam(); // defensas elegidas en el menú de equipo (filtradas por lo que permite el nivel)

    this.blocked = new Set(); // casillas con decoración (no se puede construir)
    this.buildPath();
    this.drawMap();
    this.fxBelow = this.add.graphics().setDepth(5);
    this.fxAbove = this.add.graphics().setDepth(30);
    this.startTxt = this.add.text(0, 0, '¡Los zombis llegan por aquí!', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#2e1c0f', strokeThickness: 4 }).setOrigin(0.5).setDepth(31).setVisible(false);

    this._slotsShown = undefined;
    this.seen = null; // enemigos descubiertos (se cargan al aparecer el primero)
    this.paper = null;
    this.alerts = [];
    this.alertViews = [];
    this.lives = START_LIVES + wallLives(this.sv); // 10 de base + 5 por cada muralla del árbol
    this.maxLives = this.lives; // para las estrellas del nivel
    this.playTime = 0; // segundos jugados en esta partida
    this.supplies = this.level.startSupplies + 50 + (has(this.sv, 'rich_2') ? 60 : has(this.sv, 'rich_1') ? 40 : 0); // Víveres 40 / Víveres 2: 60 en total
    this.now = 0;
    this.speed = 1;
    this.paused = false;
    this.ended = false;
    this.waveNo = 0;
    this.waveRunning = false;
    this.queue = [];
    this.queueT = 0;
    this.countdown = 9999; // la oleada la llama el jugador con el botón (o Autoplay)
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.zones = [];
    this.effects = [];
    this.timers = [];
    this.buffs = { horn: 0, fever: 0, overload: 0, rain: 0 };
    this.allies = []; // esbirros del Nigromante y golem del Ingeniero
    this.leakedWave = false;
    this.run = { coins: 0, rubies: 0, emeralds: 0, diamonds: 0, kills: 0, coinKills: 0, gemCoins: 0 }; // las monedas se cuentan al final de la partida
    this.selection = null;
    this.panelObjs = [];
    this.skillBtns = [];
    this.panelDirty = true;
    this.skillsDirty = true;
    this._lastKey = '';
    this.tut = this.level.tutorial ? { step: 'place_barb' } : null;
    this.autoplay = !this.tut && localStorage.getItem('zmcd_autoplay') === '1'; // Autoplay: la siguiente oleada sale sola al terminar cada una

    this.waveStartAt = -999; // instante en que empezó la última oleada
    this.availAt = 0; // desde cuándo se puede llamar a la siguiente oleada (para el premio por adelantarla)
    this._hadQueue = false;
    this.placing = null;
    this._slotDown = false;

    this.buildHud();
    this.buildSlots();
    this.buildTutorialBanner();

    this.input.on('pointerdown', (p, over) => this.onMapTap(p, over));
    this.input.on('pointermove', (p) => this.onPointerMoveGlobal(p));
    this.input.on('pointerup', (p) => this.onPointerUpGlobal(p));
    // teclado: 1, 2, 3, 4 = casillas de defensa; espacio = siguiente oleada; Esc = cancelar
    const kb = this.input.keyboard;
    kb.addCapture('SPACE');
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'].forEach((name, i) => {
      const act = () => this.beginPlacing(i, this.input.activePointer, false);
      kb.on('keydown-' + name, act);
      kb.on('keydown-NUMPAD_' + name, act);
    });
    kb.on('keydown-SPACE', () => this.callWave());
    kb.on('keydown-F', () => !this.ended && this.cycleSpeed());
    bindMusicKey(this); // M = música sí/no
    kb.on('keydown-ESC', () => {
      if (this.moveMode) this.exitMoveMode(false);
      else if (this.exitUi) this.closeExitConfirm();
      else if (this.pauseUi) this.closePause();
      else if (this.paper) this.closePaper();
      else if (this.placing) this.cancelPlacing();
      else this.togglePause(); // sin nada que cerrar, Esc abre el menú de pausa
    });
    this.events.once('shutdown', () => {
      this.events.off('addedtoscene', this._onAdded);
      this.events.off('postupdate', this._onPost);
      this.input.off('pointerdown');
      this.input.off('pointermove');
      this.input.off('pointerup');
      this.cancelPlacing();
    });
  }

  // Dos cámaras: la del mundo (zoom y recorte al área del mapa) y la de la interfaz (pantalla completa, por encima).
  // Cada objeto se asigna a una de las dos según su profundidad: >= 40 es interfaz, el resto es mundo.
  setupCameras() {
    const cam = this.cameras.main;
    cam.setViewport(0, MAP_Y, W, PANEL_Y - MAP_Y);
    cam.setZoom(this.zoom);
    cam.centerOn(this.WW / 2, MAP_Y + this.WH / 2);
    this.worldCam = cam;
    this.uiCam = this.cameras.add(0, 0, W, H);
    this._camQueue = [];
    this._onAdded = (go) => this._camQueue.push(go);
    this._onPost = () => {
      for (const go of this._camQueue) {
        if (!go.scene) continue;
        if (go.depth >= 40) this.worldCam.ignore(go);
        else this.uiCam.ignore(go);
      }
      this._camQueue.length = 0;
    };
    this.events.on('addedtoscene', this._onAdded);
    this.events.on('postupdate', this._onPost);
  }

  // pantalla -> mundo (los punteros llegan en coordenadas de pantalla)
  wp(p) {
    const v = this.worldCam.getWorldPoint(p.x, p.y);
    return { x: v.x, y: v.y };
  }

  // texto flotante en coordenadas de pantalla (para avisos de la interfaz)
  uiFloat(x, y, str, color = '#ffd23f') {
    const tx = this.add
      .text(x, y, str, { fontFamily: EMOJI_FONT, fontSize: '20px', color, stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(61);
    this.tweens.add({ targets: tx, y: y - 40, alpha: 0, duration: 1000, onComplete: () => tx.destroy() });
  }

  // Equipo de la batalla: las defensas elegidas en el menú (por defecto, las últimas usadas) que este nivel permite.
  // El tutorial usa siempre las suyas; si no queda ninguna, se rellena con las primeras disponibles del nivel.
  computeTeam() {
    const lv = this.level;
    if (lv.tutorial) return lv.towers.slice();
    const max = maxSlots(this.sv);
    const ok = (id) => lv.towers.includes(id) && towerUnlocked(this.sv, id);
    const saved = (this.sv.team || []).filter((id) => towerUnlocked(this.sv, id)).slice(0, max);
    let team = saved.filter(ok);
    // si el nivel no permite alguna de tus defensas, ese hueco se rellena con otras que sí estén disponibles
    for (const id of lv.towers) if (team.length < saved.length && ok(id) && !team.includes(id)) team.push(id);
    if (!team.length) team = lv.towers.filter(ok).slice(0, max);
    if (!team.length) team = lv.towers.slice(0, max);
    return team;
  }

  buildPath() {
    // Un nivel puede tener varios recorridos (bifurcaciones): comparten entrada y castillo
    const defs = this.level.routes || [this.level.path];
    this.pathTiles = new Set();
    this.routes = defs.map((tl) => {
      const pts = tl.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: MAP_Y + r * TILE + TILE / 2 }));
      const segLen = [];
      const normals = [];
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1].x - pts[i].x;
        const dy = pts[i + 1].y - pts[i].y;
        const l = Math.hypot(dx, dy);
        segLen.push(l);
        normals.push({ x: -dy / l, y: dx / l });
        total += l;
      }
      for (let i = 0; i < tl.length - 1; i++) {
        let [c, r] = tl[i];
        const [c1, r1] = tl[i + 1];
        const dc = Math.sign(c1 - c);
        const dr = Math.sign(r1 - r);
        this.pathTiles.add(`${c},${r}`);
        while (c !== c1 || r !== r1) {
          c += dc;
          r += dr;
          this.pathTiles.add(`${c},${r}`);
        }
      }
      return { pts, segLen, normals, len: total };
    });
    this.pts = this.routes[0].pts;
    this.pathLen = this.routes[0].len;
  }

  // Posición sobre el recorrido `ri` a distancia d, con desplazamiento lateral `lane` (suavizado en las curvas)
  posAt(d, lane = 0, ri = 0) {
    const R = this.routes[ri];
    const { pts, segLen, normals } = R;
    let i = 0;
    while (i < segLen.length - 1 && d > segLen[i]) {
      d -= segLen[i];
      i++;
    }
    const a = pts[i];
    const b = pts[i + 1];
    const s = Phaser.Math.Clamp(d, 0, segLen[i]);
    const t = s / segLen[i];
    let nx = normals[i].x;
    let ny = normals[i].y;
    const BL = 40;
    if (lane) {
      if (i < segLen.length - 1 && segLen[i] - s < BL) {
        const k = 0.5 * (1 - (segLen[i] - s) / BL);
        nx += (normals[i + 1].x - nx) * k;
        ny += (normals[i + 1].y - ny) * k;
      } else if (i > 0 && s < BL) {
        const k = 0.5 * (1 - s / BL);
        nx += (normals[i - 1].x - nx) * k;
        ny += (normals[i - 1].y - ny) * k;
      }
    }
    return { x: a.x + (b.x - a.x) * t + nx * lane, y: a.y + (b.y - a.y) * t + ny * lane };
  }

  drawMap() {
    const rng = new Phaser.Math.RandomDataGenerator(['zmcd', String(this.levelId)]);
    const nearPath = (c, r, d) => {
      for (let dc = -d; dc <= d; dc++) for (let dr = -d; dr <= d; dr++) if (this.pathTiles.has(`${c + dc},${r + dr}`)) return true;
      return false;
    };

    // suelo: textura de hierba de Pol (32x32 ampliada x2, repetida por todo el mapa) y camino de tierra encima
    this.add.tileSprite(0, MAP_Y, this.cols * TILE, this.rows * TILE, 'grass_tile').setOrigin(0, 0).setTileScale(2).setDepth(0);
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (!this.pathTiles.has(`${c},${r}`)) continue;
        this.add.image(c * TILE, MAP_Y + r * TILE, 'path', 10).setOrigin(0, 0).setDepth(0.5).setTint(0xe9cfa0);
      }
    }
    // borde oscuro del camino (se ve el límite entre tierra y hierba)
    const g = this.add.graphics().setDepth(1);
    for (const key of this.pathTiles) {
      const [c, r] = key.split(',').map(Number);
      if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) continue;
      const x = c * TILE;
      const y = MAP_Y + r * TILE;
      g.fillStyle(0x4a3520, 0.9);
      if (!this.pathTiles.has(`${c},${r - 1}`)) g.fillRect(x, y, TILE, 3);
      if (!this.pathTiles.has(`${c},${r + 1}`)) g.fillRect(x, y + TILE - 3, TILE, 3);
      if (!this.pathTiles.has(`${c - 1},${r}`) && c > 0) g.fillRect(x, y, 3, TILE);
      if (!this.pathTiles.has(`${c + 1},${r}`) && c < this.cols - 1) g.fillRect(x + TILE - 3, y, 3, TILE);
    }

    // decoración animada en casillas alejadas del camino (no se puede construir encima)
    const kinds = ['tree1', 'tree2', 'tree3', 'tree4', 'bush1', 'bush2', 'bush3', 'bush4', 'rock1', 'rock2', 'rock3', 'rock4', 'sheep_idle', 'sheep_grass'];
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.pathTiles.has(`${c},${r}`) || nearPath(c, r, 1)) continue;
        const edge = c === 0 || c === this.cols - 1 || r === 0 || r === this.rows - 1;
        if (rng.frac() > (edge ? 0.6 : 0.32)) continue;
        const kind = kinds[rng.between(0, kinds.length - 1)];
        const x = c * TILE + TILE / 2;
        const y = MAP_Y + r * TILE + TILE / 2;
        this.blocked.add(`${c},${r}`);
        let o;
        if (kind.startsWith('tree')) {
          o = this.add.sprite(x, y + 24, kind).setOrigin(0.5, 0.88).setScale(0.5);
        } else if (kind.startsWith('bush')) {
          o = this.add.sprite(x, y + 8, kind).setScale(0.5);
        } else if (kind.startsWith('rock')) {
          o = this.add.image(x, y + 8, kind).setScale(0.9);
        } else {
          o = this.add.sprite(x, y + 6, kind).setScale(0.5);
          if (rng.frac() > 0.5) o.setFlipX(true);
        }
        if (o.play && kind !== 'rock') {
          o.play(kind);
          o.anims.setProgress(rng.frac()); // que no se muevan todos a la vez
        }
        o.setDepth(9 + y / 1000);
      }
    }

    // hierba alta de Pol: matas sueltas y pequeños grupos en la hierba (solo decoración: se puede construir encima)
    const tallRng = new Phaser.Math.RandomDataGenerator(['tall', String(this.levelId)]);
    const tuft = (x, y, s) => {
      const o = this.add.image(x, y, 'tall_grass').setOrigin(0.5, 0.92).setScale(s).setDepth(2 + y / 10000);
      if (tallRng.frac() < 0.5) o.setFlipX(true);
      // balanceo suave con el viento (cada mata a su ritmo)
      this.tweens.add({ targets: o, angle: { from: -3, to: 3 }, duration: 1400 + tallRng.between(0, 900), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: tallRng.between(0, 1200) });
    };
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const key = `${c},${r}`;
        if (this.pathTiles.has(key) || this.blocked.has(key)) continue;
        if (tallRng.frac() > 0.14) continue;
        const n = tallRng.frac() < 0.4 ? tallRng.between(2, 3) : 1; // a veces un grupito
        for (let k = 0; k < n; k++) {
          const x = c * TILE + 12 + tallRng.frac() * (TILE - 24);
          const y = MAP_Y + r * TILE + 22 + tallRng.frac() * (TILE - 26);
          const s = 1.5 + tallRng.frac() * 0.5;
          // que la mata entera (también la parte alta) quede fuera del camino
          const onPath = (px, py) => this.pathTiles.has(`${Math.floor(px / TILE)},${Math.floor((py - MAP_Y) / TILE)}`);
          const top = y - 30 * s;
          if ([[x - 12, top], [x + 12, top], [x - 12, y], [x + 12, y]].some(([px, py]) => onPath(px, py))) continue;
          tuft(x, y, s);
        }
      }
    }

    // castillo (meta) y portal zombi (entrada)
    const last = this.pts[this.pts.length - 1];
    this.add.image(this.WW - 70, last.y - 18, 'castle').setScale(0.55).setDepth(9 + last.y / 1000);
    const first = this.pts[0];
    this.add.image(34, first.y - 34, 'tower_black').setScale(0.5).setDepth(9);
    this.add
      .text(8, first.y + 22, 'ENTRADA', { fontFamily: FONT, fontSize: '12px', color: '#fff4d6', stroke: '#2e1c0f', strokeThickness: 3 })
      .setDepth(9);

    // nubes que pasan despacio por encima del mapa
    for (let i = 0; i < 2; i++) {
      const cl = this.add
        .image(rng.between(0, this.WW), MAP_Y + rng.between(60, this.WH - 70), 'cloud' + (1 + (i % 4)))
        .setAlpha(0.16)
        .setScale(1.1 + i * 0.3)
        .setDepth(26);
      this.tweens.add({ targets: cl, x: this.WW + 300, duration: 70000 + i * 25000, repeat: -1, onRepeat: () => (cl.x = -300) });
    }
  }

  buildHud() {
    const style = { fontFamily: EMOJI_FONT, fontSize: '24px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 4 };
    // ---- recuadro de arriba a la izquierda: vidas del castillo y suministros
    this.hudBox = this.add.rectangle(8, 8, 110, 82, 0x2e1c0f, 0.82).setOrigin(0, 0).setStrokeStyle(3, COL.woodLight, 1).setDepth(40); // se ajusta al ancho de los números
    this.add.image(32, 30, 'icon_06').setScale(0.7).setDepth(41); // escudo = vidas
    this.txtLives = this.add.text(54, 15, '', style).setDepth(41);
    this.add.image(32, 66, 'icon_01').setScale(0.7).setDepth(41); // martillo = suministros
    this.txtSupplies = this.add.text(54, 51, '', style).setDepth(41);
    // ---- recuadro de arriba al centro: oleada y tiempo de partida
    this.add.rectangle(W / 2 - 150, 8, 300, 42, 0x2e1c0f, 0.82).setOrigin(0, 0).setStrokeStyle(3, COL.woodLight, 1).setDepth(40);
    this.add.image(W / 2 - 128, 29, 'icon_05').setScale(0.6).setDepth(41); // espadas = oleada
    this.txtWave = this.add.text(W / 2 - 104, 14, '', { ...style, fontSize: '22px' }).setDepth(41);
    this.txtTime = this.add.text(W / 2 + 140, 16, '', { ...style, fontSize: '20px' }).setOrigin(1, 0).setDepth(41); // tiempo (sin contar pausas)
    this.txtBuffs = this.add.text(W / 2, 58, '', { ...style, fontSize: '20px', color: '#ffd23f' }).setOrigin(0.5, 0).setDepth(41);
    // ---- pausa (arriba a la derecha): abre el menú de pausa
    this.btnPause = iconButton(this, W - 102, 8, 94, 2, () => this.togglePause()); // un 80% más grande

    // ---- panel inferior de madera
    this.add.rectangle(0, PANEL_Y, W, PANEL_H, COL.wood).setOrigin(0, 0).setDepth(40);
    this.add.rectangle(0, PANEL_Y, W, 6, COL.woodLight).setOrigin(0, 0).setDepth(41);
    this.add.rectangle(0, PANEL_Y + 6, W, 3, COL.woodDark).setOrigin(0, 0).setDepth(41);

    // ---- botones de control: cuadrícula 2x2 a la derecha de las casillas de defensa, solo en el panel de comprar defensas.
    // 1 oleadas automáticas, 2 habilidades automáticas, 3 siguiente oleada, 4 velocidad (se ocultan al seleccionar una defensa)
    const nSlots = MAX_SLOTS; // siempre se ven los 6 huecos (los bloqueados, oscuros con candado)
    const slotsRight = 10 + nSlots * (SLOT_W + 4); // borde derecho de las casillas (una sola fila)
    const GX = slotsRight + 16;
    const GAP = 12;
    const GW = Math.floor((1124 - GX - GAP) / 2); // hasta donde empiezan los botones de habilidades activas
    const GH = 56;
    const GY = PANEL_Y + 14 + 8; // centrada en la altura de las casillas (138 px)
    const GY2 = GY + GH + 10;
    const BTN = { fontSize: 17, depth: 42 }; // botones más estrechos: el texto puede ir en dos líneas
    // 1 · Oleadas automáticas: encadena las oleadas solo; apagado, el juego espera a que pulses «Siguiente oleada» al terminar cada una
    const paintAP = () => {
      if (this.tut) {
        this.btnAutoplay.setText('Oleadas automáticas');
        this.btnAutoplay.setEnabled(false);
        return;
      }
      this.btnAutoplay.setText(`Oleadas automáticas: ${this.autoplay ? 'SÍ' : 'NO'}`);
      this.btnAutoplay.setFill(this.autoplay ? 0x2d6a4f : 0x5b4636);
    };
    this.btnAutoplay = makeButton(
      this, GX, GY, GW, GH, '',
      () => {
        this.autoplay = !this.autoplay;
        localStorage.setItem('zmcd_autoplay', this.autoplay ? '1' : '0');
        paintAP();
        const idle = !this.waveRunning && !this.queue.length && this.waveNo < this.level.waveCount && !this.ended;
        if (this.autoplay && idle) this.countdown = 0.5; // si estaba esperando, sale ya
        if (!this.autoplay && this.countdown < 9000) this.countdown = 9999; // cancelar la cuenta atrás
      },
      BTN
    );
    paintAP();
    // 2 · Habilidades automáticas: solo si se compró "Lanzamiento automático" en el árbol
    const owned = has(this.sv, 'auto_skills') && !this.tut;
    this.autoSkills = owned && localStorage.getItem('zmcd_auto') !== '0';
    const paintAS = () => {
      if (!owned) {
        this.btnAuto.setText('Habilidades automáticas (bloqueado)');
        this.btnAuto.setEnabled(false);
        return;
      }
      this.btnAuto.setText(`Habilidades automáticas: ${this.autoSkills ? 'SÍ' : 'NO'}`);
      this.btnAuto.setFill(this.autoSkills ? 0x5b2c83 : 0x5b4636);
    };
    this.btnAuto = makeButton(
      this, GX + GW + GAP, GY, GW, GH, '',
      () => {
        this.autoSkills = !this.autoSkills;
        localStorage.setItem('zmcd_auto', this.autoSkills ? '1' : '0');
        paintAS();
      },
      BTN
    );
    paintAS();
    // 3 · Siguiente oleada
    this.btnWave = makeButton(this, GX, GY2, GW, GH, 'Siguiente oleada', () => this.callWave(), { ...BTN, fill: 0x2d6a4f });
    // 4 · Velocidad
    this.btnSpeed = makeButton(this, GX + GW + GAP, GY2, GW, GH, 'Velocidad x1', () => this.cycleSpeed(), BTN);
    this.ctrlRects = { wave: { x: GX, y: GY2, w: GW, h: GH }, speed: { x: GX + GW + GAP, y: GY2, w: GW, h: GH } };

    // libro de enemigos (abajo a la derecha del mapa): abre la ficha de los zombis ya vistos de este nivel
    {
      const bx = W - 44, by = PANEL_Y - 44;
      const ring = this.add.circle(bx, by, 30, 0x5b2c83, 0.92).setStrokeStyle(3, COL.woodDark).setDepth(55).setInteractive({ useHandCursor: true });
      const bk = this.add.image(bx, by, 'ic_book').setDepth(56);
      bk.setScale(38 / bk.width);
      ring.on('pointerover', () => ring.setStrokeStyle(3, 0xffd23f));
      ring.on('pointerout', () => ring.setStrokeStyle(3, COL.woodDark));
      ring.on('pointerdown', () => {
        if (this.paper && this.paperList) return this.closePaper();
        this.openBook();
      });
      this.bookBtn = [ring, bk];
    }

    // botón de desarrollador: salta directamente al nivel siguiente (lo da por superado, sin premios ni estrellas)
    if (DEV_TOOLS) makeButton(
      this, 8, 96, 66, 30, '⏭ DEV',
      () => {
        this.sv.cleared[this.levelId] = true;
        save();
        const next = LEVELS[this.levelId];
        this.scene.start(next ? 'Game' : 'Menu', next ? { level: next.id } : undefined);
      },
      { fontSize: 14, fill: 0x555555, depth: 42 }
    );
  }

  // Casillas de defensa del panel (siempre visibles): se arrastran al mapa o se activan con 1, 2, 3...
  buildSlots() {
    this.slotObjs = [];
    const y0 = PANEL_Y + 14;
    const n = this.team.length;
    const dense = false; // todas las casillas del mismo tamaño grande, en una sola fila
    const cw = SLOT_W;
    const pitch = SLOT_W + 4;
    this.team.forEach((id, i) => {
      const d = TOWERS[id];
      const x = 10 + i * pitch;
      const y = y0;
      const bg = this.add.rectangle(x, y, cw, 138, 0x6b4a2b).setOrigin(0, 0).setStrokeStyle(3, COL.woodDark, 1).setDepth(42);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', (p) => {
        this._slotDown = true;
        this.beginPlacing(i, p, true);
      });
      const st = { fontFamily: FONT, color: COL.cream, stroke: '#2e1c0f', strokeThickness: 3 };
      const label = i === 9 ? '0' : String(i + 1);
      const num = this.add.text(x + 6, y + 3, label, { ...st, fontSize: '18px', color: '#ffd23f' }).setDepth(43);
      const icon = this.add.image(x + cw / 2, y + 44, TOWER_ART[id].avatar).setDepth(43).setTint(TOWER_ART[id].tint ?? 0xffffff);
      icon.setScale(62 / icon.width);
      const shortName = d.id === 'asedio' ? 'Asedio' : d.name; // «Maestro de asedio» no cabe en una línea
      const name = this.add.text(x + cw / 2, y + 86, shortName, { ...st, fontSize: '14px', align: 'center', wordWrap: { width: cw - 8 } }).setOrigin(0.5).setDepth(43);
      const cy = y + 112;
      const cost = this.add.text(x + cw / 2 + 3, cy, `${d.cost}`, { ...st, fontFamily: EMOJI_FONT, fontSize: '18px' }).setOrigin(1, 0.5).setDepth(43);
      const costIcon = this.add.image(x + cw / 2 + 3 + (dense ? 10 : 11), cy, 'icon_01').setDisplaySize(dense ? 16 : 18, dense ? 16 : 18).setDepth(43);
      this.slotObjs.push({ id, bg, num, icon, name, cost, costIcon, key: '' });
    });
    // huecos aún no desbloqueados: más oscuros, con candado y «Se desbloquea en el árbol»
    this.lockSlotObjs = [];
    for (let i = n; i < MAX_SLOTS; i++) {
      const x = 10 + i * pitch;
      const bg = this.add.rectangle(x, y0, cw, 138, 0x3b2817).setOrigin(0, 0).setStrokeStyle(3, COL.woodDark, 1).setDepth(42);
      const lock = this.add.text(x + cw / 2, y0 + 46, '🔒', { fontFamily: EMOJI_FONT, fontSize: '34px' }).setOrigin(0.5).setDepth(43).setAlpha(0.75);
      const txt = this.add
        .text(x + cw / 2, y0 + 104, 'Se desbloquea en el árbol', { fontFamily: FONT, fontSize: '13px', color: '#a89580', align: 'center', stroke: '#1b1209', strokeThickness: 3, wordWrap: { width: cw - 10 } })
        .setOrigin(0.5)
        .setDepth(43);
      this.lockSlotObjs.push(bg, lock, txt);
    }
  }

  // Los botones de control solo se ven (y se pueden pulsar) en el panel de comprar defensas
  setCtrlVisible(v) {
    for (const b of [this.btnAutoplay, this.btnAuto, this.btnWave, this.btnSpeed]) {
      b.setVisible(v);
      b.bg.input.enabled = v;
    }
  }

  updateSlots() {
    // con una defensa seleccionada se ocultan las casillas para dejar sitio a su panel
    const show = !this.selection;
    if (show !== this._slotsShown) {
      this._slotsShown = show;
      this.setCtrlVisible(show);
      for (const s of this.slotObjs) {
        [s.bg, s.num, s.icon, s.name, s.cost].forEach((o) => o.setVisible(show));
        s.costIcon.setVisible(show && towerUnlocked(this.sv, s.id));
        s.bg.input.enabled = show;
      }
      for (const o of this.lockSlotObjs || []) o.setVisible(show);
    }
    for (let i = 0; i < this.slotObjs.length; i++) {
      const s = this.slotObjs[i];
      const open = towerUnlocked(this.sv, s.id);
      const afford = this.supplies >= TOWERS[s.id].cost;
      const armed = this.placing && this.placing.slot === i;
      const key = `${open}|${afford}|${!!armed}`;
      if (key === s.key) continue;
      s.key = key;
      s.bg.setFillStyle(armed ? 0x2f6f4a : open && afford ? 0x6b4a2b : 0x3a342e);
      s.bg.setStrokeStyle(armed ? 4 : 3, armed ? 0xffd23f : COL.woodDark, 1);
      const a = open && afford ? 1 : 0.5;
      s.icon.setAlpha(a);
      s.name.setAlpha(a);
      s.cost.setAlpha(a);
      s.costIcon.setAlpha(a).setVisible(open && show);
      s.cost.setColor(open && !afford ? '#ff9e80' : COL.cream);
      s.cost.setText(open ? `${TOWERS[s.id].cost}` : '🔒');
    }
  }

  buildTutorialBanner() {
    this.banner = this.add
      .text(W / 2, 100, '', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#000000cc',
        padding: { x: 14, y: 8 },
        align: 'center',
        wordWrap: { width: 1100 },
      })
      .setOrigin(0.5, 0)
      .setDepth(45)
      .setVisible(false);
    this.tutHi = this.add.graphics().setDepth(60);
  }

  // velocidad x1 -> x2 -> x3 -> x1 (botón o tecla F)
  cycleSpeed() {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
    if (this.tut) this._tutSpeed = true;
    this.btnSpeed.setText('Velocidad x' + this.speed);
  }

  // 75 s -> "1:15"; 3725 s -> "1:02:05"
  fmtTime(s) {
    const t = Math.floor(s);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const sec = String(t % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  }

  // Menú de pausa (el juego se detiene mientras está abierto): Continuar, Pantalla completa y Salir (con aviso)
  togglePause() {
    if (this.ended || this.moveMode) return;
    if (this.pauseUi) this.closePause();
    else this.openPause();
  }

  openPause() {
    if (this.ended || this.pauseUi) return;
    this.cancelPlacing();
    hideTip();
    this.paused = true;
    const objs = [];
    this.pauseUi = objs;
    const add = (o) => (objs.push(o), o);
    const cx = W / 2;
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0, 0).setDepth(150).setInteractive());
    add(woodPanel(this, cx - 230, 120, 460, 440, 151, 16));
    add(title(this, cx, 175, 'PAUSA', 44).setDepth(152));
    add(this.add.text(cx, 230, `Nivel ${this.levelId}`, { fontFamily: FONT, fontSize: '30px', color: '#ffe9a0', fontStyle: 'bold', stroke: '#2e1c0f', strokeThickness: 5 }).setOrigin(0.5).setDepth(152));
    add(this.add.text(cx, 266, this.level.name, { fontFamily: FONT, fontSize: '17px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 3 }).setOrigin(0.5).setDepth(152));
    let y = 300;
    add(makeButton(this, cx - 170, y, 340, 62, 'Continuar', () => this.closePause(), { fontSize: 26, fill: 0x2d6a4f, depth: 153 }));
    y += 78;
    if (fsSupported()) {
      add(makeButton(this, cx - 170, y, 340, 62, 'Pantalla completa', () => toggleFullscreen(), { fontSize: 24, fill: 0x2f5f8a, depth: 153 }));
      y += 78;
    }
    add(makeButton(this, cx - 170, y, 340, 62, 'Salir', () => this.confirmExit(), { fontSize: 24, fill: 0x7b241c, depth: 153 }));
  }

  closePause() {
    if (!this.pauseUi) return;
    this.pauseUi.forEach((o) => o.destroy && o.destroy());
    this.pauseUi = null;
    this.closeExitConfirm();
    this.paused = false;
  }

  // Aviso antes de salir: no se consigue ninguna recompensa
  confirmExit() {
    if (this.exitUi) return;
    const objs = [];
    this.exitUi = objs;
    const add = (o) => (objs.push(o), o);
    const cx = W / 2;
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0, 0).setDepth(160).setInteractive());
    add(woodPanel(this, cx - 260, 190, 520, 300, 161, 16));
    add(title(this, cx, 235, '¿Salir del nivel?', 34).setDepth(162));
    add(
      this.add
        .text(cx, 320, 'Si sales ahora no conseguirás ninguna recompensa\n(ni monedas ni estrellas de esta partida).', { fontFamily: FONT, fontSize: '22px', color: COL.cream, align: 'center', lineSpacing: 6, stroke: '#2e1c0f', strokeThickness: 4, wordWrap: { width: 460 } })
        .setOrigin(0.5)
        .setDepth(162)
    );
    add(makeButton(this, cx - 235, 400, 220, 62, 'Seguir jugando', () => this.closeExitConfirm(), { fontSize: 22, fill: 0x2d6a4f, depth: 163 }));
    add(makeButton(this, cx + 15, 400, 220, 62, 'Salir', () => this.scene.start('Menu'), { fontSize: 24, fill: 0x7b241c, depth: 163 }));
  }

  closeExitConfirm() {
    if (!this.exitUi) return;
    this.exitUi.forEach((o) => o.destroy && o.destroy());
    this.exitUi = null;
  }

  // --------------------------------------------------------------- ENTRADA
  onMapTap(p, over) {
    if (this.pauseUi) return; // con el menú de pausa abierto no se toca el mapa
    if (this.moveMode) {
      if (!(over && over.length)) this.moveModeTap(p);
      return;
    }
    if (p.rightButtonDown && p.rightButtonDown()) {
      this.cancelPlacing();
      return;
    }
    const slotPress = this._slotDown;
    this._slotDown = false;
    if (this.ended || this.paused) return;
    if (over && over.length) {
      // tocar cualquier botón que no sea una casilla de defensa cancela la colocación
      if (!slotPress) this.cancelPlacing();
      return;
    }
    if (p.y < MAP_Y || p.y >= PANEL_Y) {
      this.cancelPlacing();
      return;
    }
    // modo "clic para colocar" (se armó con el teclado o con un clic en la casilla)
    const wpt = this.wp(p);
    if (this.placing && !this.placing.drag) {
      this.dropPlacing(wpt.x, wpt.y);
      return;
    }
    // si no, se selecciona la defensa más cercana (o se quita la selección)
    let best = null;
    let bd = 34 / this.zoom;
    for (const t of this.towers) {
      const d = dist2(t.x, t.y, wpt.x, wpt.y) - (t.type === 'ingeniero' ? 18 / this.zoom : 0); // el Ingeniero se toca más fácil
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    // sin defensa cerca del toque: se quita la selección y reaparece el panel de comprar defensas (con sus botones)
    this.selection = best ? { kind: 'tower', tower: best } : null;
    this.pendingUpg = null;
    this.sellArm = null;
    this.panelDirty = true;
  }

  // ---------------------------------------------------- COLOCAR DEFENSAS (arrastrar o teclas 1, 2, 3...)
  // Sitio válido: dentro del mapa, lejos del camino y de la decoración, y sin pegarse a otra defensa.
  canPlaceAt(x, y) {
    if (x < 26 || x > this.WW - 26 || y < MAP_Y + 26 || y > this.worldBottom - 26) return false;
    for (const R of this.routes) {
      for (let i = 0; i < R.pts.length - 1; i++) {
        const a = R.pts[i];
        const b = R.pts[i + 1];
        const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
        const k = l2 ? Phaser.Math.Clamp(((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / l2, 0, 1) : 0;
        if (dist2(x, y, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k) < PATH_CLEAR) return false;
      }
    }
    for (const key of this.blocked) {
      const [c, r] = key.split(',').map(Number);
      const rx = c * TILE;
      const ry = MAP_Y + r * TILE;
      if (x > rx - 12 && x < rx + TILE + 12 && y > ry - 12 && y < ry + TILE + 12) return false;
    }
    const moving = (this.placing && this.placing.moveTower) || this._moveIgnore; // al mover una defensa, ella misma no estorba
    return !this.towers.some((t) => t !== moving && dist2(t.x, t.y, x, y) < TOWER_GAP);
  }

  // Taller móvil (Ingeniero C3): mover una defensa gratis, una vez por oleada y por Ingeniero
  startMove(t) {
    if (this.ended || this.paused || !this.movableBy(t)) return;
    this.cancelPlacing();
    const art = t.art;
    const ptr = this.input.activePointer;
    const gp = this.wp(ptr);
    const ghost = this.add.sprite(gp.x, gp.y, art.idle).setOrigin(0.5, 0.62).setScale(art.scale).setAlpha(0.75).setDepth(39).setTint(art.tint ?? 0xffffff);
    ghost.play(art.idle);
    this.placing = { type: t.type, slot: -1, drag: false, moved: false, sx: ptr.x, sy: ptr.y, ghost, moveTower: t };
    this.selection = null;
    this.panelDirty = true;
  }

  finishMove(x, y) {
    const t = this.placing.moveTower;
    if (!this.canPlaceAt(x, y)) {
      this.floatText(x, y - 30, 'Aquí no cabe: lejos del camino y de otros héroes', '#ff9e80');
      return;
    }
    const eng = this.movableBy(t);
    if (!eng) return;
    eng.moveCharges -= 1;
    t.x = x;
    t.y = y;
    t.txt.setPosition(x, y + 6).setDepth(11 + y / 1000);
    t.shadow.setPosition(x, y + 14);
    t.lvTxt.setPosition(x, y + 26);
    playFx(this, 'fx_dust', x, y + 10, 1, 12);
    this.cancelPlacing();
    this.selection = { kind: 'tower', tower: t };
    this.panelDirty = true;
  }

  slotType(i) {
    return this.team[i];
  }

  // Empieza a colocar la defensa del espacio i (arrastrando desde el panel o con la tecla)
  beginPlacing(i, pointer, drag) {
    const type = this.slotType(i);
    if (!type || this.ended || this.paused) return;
    if (this.tut) {
      const need = this.tut.step === 'place_barb' ? 'barbaro' : this.tut.step === 'place_elf' ? 'elfo' : null;
      if (need && type !== need) {
        this.uiFloat(W / 2, PANEL_Y - 30, `Ahora toca colocar el ${TOWERS[need].name}`, '#ff9e80');
        return;
      }
    }
    if (this.placing && this.placing.slot === i && !drag) {
      this.cancelPlacing(); // pulsar otra vez el mismo número lo cancela
      return;
    }
    this.cancelPlacing();
    const def = TOWERS[type];
    if (!towerUnlocked(this.sv, type)) {
      this.uiFloat(W / 2, PANEL_Y - 30, `${def.name}: desbloquéalo en el árbol`, '#ff9e80');
      return;
    }
    if (this.supplies < def.cost) {
      this.uiFloat(W / 2, PANEL_Y - 30, `Te faltan ${Math.ceil(def.cost - this.supplies)} suministros`, '#ff9e80');
      return;
    }
    const art = TOWER_ART[type];
    const gp = this.wp(pointer);
    const ghost = this.add.sprite(gp.x, gp.y, art.idle).setOrigin(0.5, 0.62).setScale(art.scale).setAlpha(0.75).setDepth(39).setTint(art.tint ?? 0xffffff);
    ghost.play(art.idle);
    this.placing = { type, slot: i, drag: !!drag, moved: false, sx: pointer.x, sy: pointer.y, ghost };
    this.selection = null;
    this.panelDirty = true;
  }

  cancelPlacing() {
    if (!this.placing) return;
    this.placing.ghost.destroy();
    this.placing = null;
  }

  dropPlacing(x, y) {
    const pl = this.placing;
    if (!pl) return;
    if (y < MAP_Y || y >= this.worldBottom) {
      this.cancelPlacing();
      return;
    }
    if (pl.moveTower) {
      this.finishMove(x, y);
      return;
    }
    if (this.placeAt(pl.type, x, y)) this.cancelPlacing();
    else if (!this.canPlaceAt(x, y)) {
      this.floatText(x, y - 30, 'Aquí no cabe: lejos del camino y de otros héroes', '#ff9e80');
      if (pl.drag) this.cancelPlacing();
    } else this.cancelPlacing();
  }

  onPointerMoveGlobal(p) {
    const pl = this.placing;
    if (!pl) return;
    const wpp = this.wp(p);
    pl.ghost.setPosition(wpp.x, wpp.y);
    if (dist2(p.x, p.y, pl.sx, pl.sy) > 10) pl.moved = true;
  }

  onPointerUpGlobal(p) {
    const pl = this.placing;
    if (!pl || !pl.drag) return;
    if (pl.moved) {
      const wpu = this.wp(p);
      this.dropPlacing(wpu.x, wpu.y);
    }
    else pl.drag = false; // fue un clic simple: queda armada y sigue al ratón hasta el siguiente clic
  }

  // Llamar a la siguiente oleada (botón o barra espaciadora). Cuanto antes, más suministros de premio.
  // Suministros que da la siguiente oleada: se reciben al instante, en cuanto empieza (30 + 6 por oleada)
  waveBonus() {
    return Math.round((20 + 4 * (this.waveNo + 1)) * 1.5 * (this.infernal ? 0.75 : 1));
  }

  // segundos que faltan para poder avanzar la siguiente oleada (mínimo 15 s desde que empezó la anterior)
  waveCooldown() {
    return Math.max(0, 15 - (this.now - this.waveStartAt));
  }

  canCallWave() {
    return !this.ended && !this.paused && !this.queue.length && this.waveNo < this.level.waveCount && !this.tutorialBlock() && this.waveCooldown() <= 0;
  }

  callWave() {
    const blk = this.tutorialBlock();
    if (blk && !this.ended && !this.paused) {
      this.uiFloat(W / 2, MAP_Y + 100, blk, '#ff9e80');
      return;
    }
    if (!this.canCallWave()) return;
    this.startWave(true);
  }

  // -------------------------------------------------------------- DEFENSAS
  placeTower(type, c, r) {
    return this.placeAt(type, c * TILE + TILE / 2, MAP_Y + r * TILE + TILE / 2);
  }

  placeAt(type, x, y) {
    const def = TOWERS[type];
    if (!towerUnlocked(this.sv, type)) return false;
    if (this.supplies < def.cost) return false;
    if (!this.canPlaceAt(x, y)) return false;
    this.supplies -= def.cost;
    const c = Math.floor(x / TILE);
    const r = Math.floor((y - MAP_Y) / TILE);
    const art = TOWER_ART[type];
    const shadow = this.add.image(x, y + 14, 'shadow').setScale(0.42).setAlpha(0.55).setDepth(10);
    const sprite = this.add.sprite(x, y + 6, art.idle).setOrigin(0.5, 0.62).setScale(art.scale).setDepth(11 + y / 1000).setTint(art.tint ?? 0xffffff);
    sprite.play(art.idle);
    sprite.anims.setProgress(Math.random());
    playFx(this, 'fx_dust', x, y + 10, 1, 12);
    const t = {
      type,
      c,
      r,
      x,
      y,
      ups: { A: 0, B: 0, C: 0 },
      cd: 0.3,
      skillCd: 0,
      charge: 0,
      volley: 0,
      shots: 0,
      throws: 0,
      zapT: 0,
      blood: 0,
      bloodT: 0,
      dmgDealt: 0, // daño total que ha hecho esta defensa en la partida
      prio: 'first', // prioridad de ataque: first | last | hp | armor
      dmgLog: [],
      dmgLogT: -1,
      invested: def.cost,
      upgSpent: 0, // suministros gastados solo en mejoras (Inversión armamentística del Rey Midas)
      vault: 0, // inventario del Rey Midas (Recaudador)
      txt: sprite,
      shadow,
      art,
      lvTxt: this.add
        .text(x, y + 26, '', { fontFamily: FONT, fontSize: '15px', color: '#ffd23f', stroke: '#2e1c0f', strokeThickness: 4 })
        .setOrigin(0.5)
        .setDepth(20),
    };
    this.towers.push(t);
    this.selection = { kind: 'tower', tower: t };
    this.onTowersChanged();
    if (this.tut) this.updateTutorial();
    return true;
  }

  total(t) {
    return t.ups.A + t.ups.B + t.ups.C;
  }

  onTowersChanged() {
    this.towers.forEach((t) => {
      const tot = this.total(t);
      t.lvTxt.setText(tot ? `+${tot}${t.ups.B >= 4 ? '★' : ''}` : '');
    });
    this.panelDirty = true;
    this.skillsDirty = true;
  }

  // Estado de la próxima mejora del camino P de la torre t
  upgradeState(t, P) {
    const cur = t.ups[P];
    if (cur >= 4) return { state: 'maxed' };
    const tier = cur + 1;
    const upg = TOWERS[t.type].paths[P].tiers[cur];
    if (this.tut && !this.towers.some((q) => q.type === 'elfo')) return { state: 'blocked', tier, upg, reason: '🔒 Primero coloca el Elfo' };
    if (!(this.tut && t.type === 'barbaro') && !pathTierUnlocked(this.sv, t.type, P, tier)) return { state: 'tree', tier, upg, reason: `🔒 Nivel ${tier}\nDesbloquéalo en el árbol` };
    if (tier === 3 && PATH_KEYS.filter((p) => t.ups[p] >= 3).length >= 2)
      return { state: 'blocked', tier, upg, reason: '🔒 Bloqueada\n(ya hay 2 caminos en nivel 3)' };
    if (tier === 4 && PATH_KEYS.some((p) => t.ups[p] >= 4))
      return { state: 'blocked', tier, upg, reason: '🔒 Bloqueada\n(solo un camino llega a nivel 4)' };
    return { state: 'ok', tier, upg };
  }

  // precio real de una mejora: el Tributo del Rey Midas (camino B) abarata un 10% las mejoras de las defensas cercanas (no acumulable)
  upgCost(t, upg, tier) {
    // tutorial: las mejoras del Bárbaro cuestan la mitad y la habilidad (nivel 4) es gratis
    if (this.tut && t.type === 'barbaro') return tier === 4 ? 0 : Math.round(upg.cost * 0.5);
    const disc = this.towers.some((m) => m !== t && m.type === 'midas' && m.ups.B >= 1 && dist2(m.x, m.y, t.x, t.y) <= 150);
    return Math.round(upg.cost * (disc ? 0.9 : 1));
  }

  buyUpgrade(t, P) {
    const st = this.upgradeState(t, P);
    if (st.state !== 'ok') return;
    const cost = this.upgCost(t, st.upg, st.tier);
    if (this.supplies < cost) return;
    this.supplies -= cost;
    t.invested += cost;
    t.upgSpent += cost;
    t.ups[P] += 1;
    if (P === 'B' && t.ups.B >= 4) t.skillCd = 0;
    if (t.type === 'ingeniero' && P === 'C' && t.ups.C === 1) t.moveCharges = 1; // Taller móvil: ya puede mover una defensa
    this.addRing(t.x, t.y, 55, 0x66ccff, 0.4);
    this.onTowersChanged();
  }

  // Tocar una tarjeta de mejora: la primera vez se marca (CONFIRMAR + información); la segunda compra
  onUpgradeCard(t, P) {
    const st = this.upgradeState(t, P);
    if (st.state === 'maxed') return;
    this.sellArm = null;
    const pend = this.pendingUpg && this.pendingUpg.tower === t && this.pendingUpg.P === P;
    if (pend && st.state === 'ok') {
      const cost = this.upgCost(t, st.upg, st.tier);
      if (this.supplies >= cost) {
        this.pendingUpg = null;
        this.buyUpgrade(t, P);
      } else this.uiFloat(W / 2, PANEL_Y - 30, `Te faltan ${Math.ceil(cost - this.supplies)} suministros`, '#ff9e80');
      this.panelDirty = true;
      return;
    }
    this.pendingUpg = pend ? null : { tower: t, P };
    this.panelDirty = true;
  }

  // Recuadro negro sobre el panel con toda la información de la mejora (texto grande, sin desbordar)
  drawUpgradeInfo(t, P, st, price, cx, add) {
    const BW = 460;
    const bx = Math.max(8, Math.min(W - BW - 8, cx - BW / 2));
    const path = TOWERS[t.type].paths[P];
    const parts = [];
    const mk = (txt, style) => parts.push(this.add.text(bx + 18, 0, txt, { fontFamily: EMOJI_FONT, color: '#ffffff', wordWrap: { width: BW - 36 }, lineSpacing: 3, ...style }).setDepth(61));
    mk(st.upg.name, { fontSize: '24px', fontStyle: 'bold', color: '#ffe082' });
    mk(`Nivel ${st.tier} · Camino ${P}: ${path.name}`, { fontSize: '15px', color: '#9be4ff' });
    mk(st.upg.doc || st.upg.desc, { fontSize: '19px' });
    const gl = glossaryFor(`${st.upg.name} ${st.upg.desc}`);
    if (gl.length) mk(gl.map((g) => `· ${g.title}: ${g.text}`).join('\n'), { fontSize: '14px', color: '#cfc3a8' });
    if (st.state === 'ok') {
      const ok = this.supplies >= price;
      mk(`Precio: ${price} suministros · ${ok ? 'pulsa CONFIRMAR para comprar' : `te faltan ${Math.ceil(price - this.supplies)}`}`, { fontSize: '16px', color: ok ? '#a5d6a7' : '#ff8a80', fontStyle: 'bold' });
    } else {
      mk(st.reason.replace(/\n/g, ' '), { fontSize: '16px', color: '#ffab91', fontStyle: 'bold' });
    }
    const gap = 6;
    const h = parts.reduce((s, p) => s + p.height + gap, 0) + 22;
    let y = PANEL_Y - h - 10;
    add(this.add.rectangle(bx, y, BW, h, 0x0d0b08, 0.93).setOrigin(0, 0).setStrokeStyle(3, 0xffd23f, 1).setDepth(60));
    y += 12;
    for (const p of parts) {
      p.setY(y);
      add(p);
      y += p.height + gap;
    }
  }

  // ---- Taller móvil: pausa, eliges una defensa, la recolocas donde quieras y aceptas con el botón verde
  enterMoveMode(eng) {
    if (this.ended || this.moveMode || !((eng.moveCharges || 0) > 0)) return;
    this.cancelPlacing();
    this.selection = null;
    this.pendingUpg = null;
    this.panelDirty = true;
    this.paused = true;
    const objs = [];
    const mm = { eng, tower: null, orig: null, objs };
    this.moveMode = mm;
    objs.push(this.add.rectangle(0, PANEL_Y, W, H - PANEL_Y, 0x000000, 0.55).setOrigin(0, 0).setDepth(70).setInteractive()); // tapa el panel
    mm.txt = this.add
      .text(W / 2, 110, 'MOVER HÉROE: toca al héroe que quieras mover y luego toca su nuevo sitio', { fontFamily: FONT, fontSize: '20px', color: '#ffffff', backgroundColor: '#000000cc', padding: { x: 14, y: 8 }, align: 'center', wordWrap: { width: 900 } })
      .setOrigin(0.5, 0)
      .setDepth(71);
    objs.push(mm.txt);
    objs.push(makeButton(this, W - 430, H - 78, 200, 64, 'Cancelar', () => this.exitMoveMode(false), { fontSize: 22, fill: 0x7b241c, depth: 72 }));
    mm.okBtn = makeButton(this, W - 214, H - 78, 200, 64, '✔ Aceptar', () => this.exitMoveMode(true), { fontSize: 24, fill: 0x2e7d32, depth: 72 });
    objs.push(mm.okBtn);
  }

  moveModeTap(p) {
    const mm = this.moveMode;
    if (p.y < MAP_Y || p.y >= PANEL_Y) return;
    const w = this.wp(p);
    let best = null;
    let bd = 36 / this.zoom;
    for (const t of this.towers) {
      const d = dist2(t.x, t.y, w.x, w.y) - (t.type === 'ingeniero' ? 18 / this.zoom : 0);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    if (best && best !== mm.tower) {
      if (mm.tower && mm.orig) this.setTowerPos(mm.tower, mm.orig.x, mm.orig.y); // cambia de defensa: la anterior vuelve a su sitio
      mm.tower = best;
      mm.orig = { x: best.x, y: best.y };
      mm.txt.setText('Ahora toca el nuevo sitio (lejos del camino y de otros héroes). Pulsa «Aceptar» para fijarlo');
      return;
    }
    if (!mm.tower) return;
    this._moveIgnore = mm.tower;
    const ok = this.canPlaceAt(w.x, w.y);
    this._moveIgnore = null;
    if (!ok) {
      this.floatText(w.x, w.y - 30, 'Aquí no cabe', '#ff9e80');
      return;
    }
    this.setTowerPos(mm.tower, w.x, w.y);
  }

  setTowerPos(t, x, y) {
    t.x = x;
    t.y = y;
    t.txt.setPosition(x, y + 6).setDepth(11 + y / 1000);
    t.shadow.setPosition(x, y + 14);
    t.lvTxt.setPosition(x, y + 26);
  }

  exitMoveMode(accept) {
    const mm = this.moveMode;
    if (!mm) return;
    const moved = mm.tower && mm.orig && (mm.tower.x !== mm.orig.x || mm.tower.y !== mm.orig.y);
    if (!accept && moved) this.setTowerPos(mm.tower, mm.orig.x, mm.orig.y);
    if (accept && moved) {
      mm.eng.moveCharges = (mm.eng.moveCharges || 1) - 1;
      playFx(this, 'fx_dust', mm.tower.x, mm.tower.y + 10, 1, 12);
    }
    mm.objs.forEach((o) => o.destroy && o.destroy());
    this.moveMode = null;
    this.paused = false;
    this.panelDirty = true;
  }

  sellTower(t) {
    if (this.tut) this._tutSold = true;
    if (t.vault > 0) this.ntCollect(t); // el inventario del Rey Midas se recauda al venderlo
    const refund = Math.floor(t.invested * (has(this.sv, 'rich_3') ? 0.85 : 0.6));
    this.supplies += refund;
    playFx(this, 'fx_dust', t.x, t.y + 10, 1, 12);
    t.txt.destroy();
    t.shadow.destroy();
    t.lvTxt.destroy();
    if (t.soulTxt) t.soulTxt.destroy();
    this.towers = this.towers.filter((x) => x !== t);
    this.selection = null;
    this.onTowersChanged();
  }

  // Estadísticas reales de combate de una defensa (según sus mejoras)
  stats(t) {
    const { A, B, C } = t.ups;
    const o = {};
    switch (t.type) {
      case 'barbaro':
        // Hacha de guerra (B2): +20% de zona, daño y velocidad · Golpe contundente (B3): empuja
        o.dmg = 16 * (B >= 1 ? 1.25 : 1) * (B >= 2 ? 1.2 : 1);
        o.interval = 1.0 / (A >= 1 ? 1.3 : 1) / (B >= 2 ? 1.2 : 1) / (1 + 0.1 * t.blood);
        o.range = 95 * (A >= 2 ? 1.15 : 1) * (B >= 2 ? 1.2 : 1);
        o.crit = 0.05 + (C >= 1 ? 0.2 : 0); // Ojo letal (C1)
        o.critMult = C >= 2 ? 3 : 2; // Golpe brutal (C2)
        o.spin = A >= 3;
        o.knock = B >= 3;
        o.multi = C >= 3;
        o.boss5 = C >= 4;
        o.blood = A >= 4;
        break;
      case 'elfo':
        o.dmg = 9;
        o.interval = 0.8 / (A >= 1 ? 1.35 : 1); // Disparo rápido: +35%
        o.range = 250 * 0.85 * (1 + (B >= 1 ? 0.2 : 0) + (B >= 3 ? 0.4 : 0)); // empieza con un 15% menos de alcance
        o.arrows = 1 + (B >= 2 ? 1 : 0);
        o.crit = B >= 3 ? 0.3 : 0; // Ojo de halcón: +30% de probabilidad de crítico (x2)
        o.density = A >= 2;
        o.dark = A >= 3;
        o.execute = A >= 4;
        o.slow = C >= 2; // Flechas gélidas
        // penetración: Flechas afiladas (C1) +1, Magia oscura (A3) +1, Punta de acero (C4) +3
        o.pierce = (C >= 1 ? 1 : 0) + (A >= 3 ? 1 : 0) + (C >= 4 ? 3 : 0);
        o.tele = C >= 3; // Telequinesis: la flecha se curva hacia el siguiente enemigo
        if (this.buffs.rain > 0) o.interval /= 2; // Lluvia de flechas: los Elfos disparan el doble de rápido
        break;
      case 'alquimista':
        o.dmg = 9 * (B >= 1 ? 1.3 : 1); // daño por segundo dentro de la zona
        o.interval = 2.4 / (A >= 3 ? 1.3 : 1);
        o.range = 161 * (C >= 1 ? 1.2 : 1); // 70% del alcance anterior (230)
        o.zoneR = 40 * (A >= 1 ? 1.3 : 1);
        o.zoneLife = 3 + (A >= 2 ? 2 : 0);
        o.potions = B >= 3 ? 2 : 1;
        o.goldCharge = B >= 2; // Viscosidad: cada 3ª poción vuelve dorados a los zombis
        o.corrode = C >= 2;
        o.poison = C >= 3;
        o.poisonDps = 6;
        o.epidemic = C >= 4;
        o.impact = A >= 4;
        break;
      case 'mago':
        o.dmg = 18 * (B >= 1 ? 1.25 : 1); // antes 22
        o.interval = 1.6 / (A >= 2 ? 1.2 : 1);
        o.range = 115 * (C >= 2 ? 1.2 : 1); // 50% del alcance anterior (230)
        o.blast = 50 * (A >= 1 ? 1.25 : 1);
        o.twin = C >= 3; // Orbe doble: segundo orbe gélido tras disparar
        o.echo = A >= 3; // Eco arcano: fragmentos con penetración infinita
        o.nova = A >= 4; // Supernova: cada 5º hechizo con aura de luz
        o.volcano = B >= 2; // Piroclasto: cada 3 ataques, disparo volcánico
        o.explode = B >= 3;
        o.slow = C >= 1;
        o.chain = C >= 4; // Cadena de rayos: rayo periódico que salta entre enemigos
        break;
      default:
        Object.assign(o, this.newStats(t)); // defensas nuevas (src/newTowers.js)
        break;
    }
    if (this.buffs.horn > 0) {
      o.interval /= 1.3;
      if (t.type === 'barbaro') o.dmg *= 2;
    }
    // las mejoras caras pesan en el daño: cada camino en nivel 3 da +25% y el nivel 4 otro +15% (en total +40%)
    o.dmg *= this.tierBoost(t);
    // bonificaciones de otras defensas (Monje, Midas, Ingeniero, Nigromante...)
    if (t.auraSpeed) o.interval /= t.auraSpeed;
    if (t.auraDmg) o.dmg *= t.auraDmg;
    if (t.rangeMul && o.range) o.range *= t.rangeMul;
    if (t.ascUntil > this.now) {
      o.dmg *= 2;
      o.interval /= 2;
    }
    return o;
  }

  // multiplicador de daño por mejoras de nivel 3 y 4 (compensa su precio)
  tierBoost(t) {
    const u = [t.ups.A, t.ups.B, t.ups.C];
    return 1 + 0.25 * u.filter((v) => v >= 3).length + 0.15 * u.filter((v) => v >= 4).length;
  }

  describe(t) {
    const s = this.stats(t);
    const def = TOWERS[t.type];
    let line = '';
    switch (t.type) {
      case 'barbaro':
        line = `Daño ${s.dmg.toFixed(0)} · ${(1 / s.interval).toFixed(1)}/s\nCrít ${(s.crit * 100).toFixed(0)}% x${s.critMult}`;
        break;
      case 'elfo':
        line = `Daño ${s.dmg.toFixed(0)} x${s.arrows} flechas\n${(1 / s.interval).toFixed(1)} salvas/s${s.crit ? `\nCrít ${(s.crit * 100).toFixed(0)}% x2` : ''}`;
        break;
      case 'alquimista':
        line = `Zona ${s.zoneLife}s · ${s.dmg.toFixed(0)}/s\nRadio ${s.zoneR.toFixed(0)}`;
        break;
      case 'mago':
        line = `Daño ${s.dmg.toFixed(0)} · radio ${s.blast.toFixed(0)}\n${(1 / s.interval).toFixed(1)}/s`;
        break;
      default:
        line = `Daño ${s.dmg.toFixed(0)} · ${(1 / s.interval).toFixed(1)}/s\nAlcance ${Math.round(s.range)}`;
        break;
    }
    return `${def.emoji} ${def.name}${NO_AIR.has(t.type) ? '' : ' ✈'}  (+${this.total(t)})\n${line}`; // ✈ = antiaéreo
  }

  // ------------------------------------------------------------- HABILIDADES
  hasSkill(t) {
    return t.ups.B >= 4;
  }

  skillReady(t) {
    return this.hasSkill(t) && t.skillCd <= 0;
  }

  useSkill(t) {
    if (!this.skillReady(t) || this.ended || this.paused) return;
    const s = this.stats(t);
    const live = this.enemies.filter((e) => !e.dead);
    const def = TOWERS[t.type].skill;
    switch (t.type) {
      case 'barbaro':
        this.buffs.horn = 6;
        this.addRing(t.x, t.y, 500, 0xffd23f, 0.8);
        break;
      case 'elfo':
        if (!live.length) return;
        live.forEach((e) => {
          const arrows = [0, 1, 2].map(() => ({ dx: (Math.random() - 0.5) * 26, dy: (Math.random() - 0.5) * 10, delay: Math.random() * 0.15 }));
          this.effects.push({ kind: 'arrowrain', x: e.x, y: e.y, life: 1.1, max: 1.1, arrows });
          this.timers.push({ t: 0.42, fn: () => !e.dead && this.damage(e, s.dmg * 2.5, { ignoreResist: true, src: t }) });
        });
        // más flechas por todo el mapa (solo efecto)
        for (let i = 0; i < 26; i++) {
          const ax = 40 + Math.random() * (this.WW - 80);
          const ay = MAP_Y + 40 + Math.random() * (this.WH - 80);
          this.effects.push({ kind: 'arrowrain', x: ax, y: ay, life: 1.1, max: 1.1, arrows: [{ dx: 0, dy: 0, delay: Math.random() * 0.3 }] });
        }
        this.buffs.rain = 5;
        break;
      case 'alquimista': {
        if (!live.length) return;
        let best = live[0];
        let bn = -1;
        for (const e of live) {
          const n = live.filter((o) => dist2(e.x, e.y, o.x, o.y) < 150).length;
          if (n > bn) {
            bn = n;
            best = e;
          }
        }
        this.projectiles.push({
          kind: 'potion',
          sx: t.x,
          sy: t.y,
          tx: best.x,
          ty: best.y,
          x: t.x,
          y: t.y,
          t: 0,
          dur: 0.8,
          zoneR: 280,
          zoneLife: 4,
          dps: s.dmg * 0.5,
          gold: true,
          big: true,
        });
        break;
      }
      case 'mago':
        // Orbe arcano: carga 5 s una bola de magia sobre su cabeza; luego se divide en 3 orbes que buscan a los 3 zombis con más vida
        if (!live.length) return;
        this.projectiles.push({ kind: 'arcCharge', x: t.x, y: t.y - 58, t: 0, dur: 5, src: t, dmg: s.dmg * 5 });
        break;
      default:
        if (!this.ntSkill(t, s, live)) return;
    }
    if (this.tut && t.type === 'barbaro') this._tutSkill = true;
    t.skillCd = def.cooldown;
    this.floatText(t.x, t.y - 44, def.icon + ' ' + def.name, '#ffffff');
  }

  // --------------------------------------------------------------- OLEADAS
  startWave(manual = false) {
    if (this.ended || this.waveNo >= this.level.waveCount) return;
    if (this.tutorialBlock()) return;
    if (manual && this.queue.length) return; // no encolar mientras aún están saliendo zombis
    if (manual && this.waveCooldown() > 0) return; // al menos 15 s entre una oleada y la siguiente
    // los suministros de la oleada se dan al instante, al empezarla
    const bonus = this.waveBonus();
    this.supplies += bonus;
    this.uiFloat(W / 2, MAP_Y + 60, `Oleada ${this.waveNo + 1} · +${bonus} 🛠`, '#9be4ff');
    this.waveStartAt = this.now;
    this.waveNo += 1;
    this.ntOnWaveStart();
    const groups = waveGroups(this.level, this.waveNo);
    if (isMassive(this.level, this.waveNo)) this.notice('⚠ ¡OLEADA MASIVA! ⚠', '#ff5252', 3.5);
    if (this.waveNo === this.level.waveCount && !this.level.tutorial) this.notice('☠ OLEADA FINAL: llegan los enemigos maestro', '#ffd23f', 3.5);
    // modo infernal: las primeras rondas son más rápidas (menos tiempo para juntar suministros)
    const fast = this.infernal && this.waveNo <= 8 ? 0.6 : 1;
    let t = 0;
    const nr = this.routes.length;
    for (const g of groups) {
      let i = 0;
      while (i < g.n) {
        const k = Math.min(g.abreast, g.n - i);
        const lanes = this.lanesFor(k);
        // con bifurcaciones, cada tanda elige uno de los recorridos (reparto al azar y equilibrado)
        const route = nr > 1 ? Math.floor(Math.random() * nr) : 0;
        for (let j = 0; j < k; j++) this.queue.push({ at: t + j * 0.05, type: g.type, lane: ENEMIES[g.type].boss ? 0 : lanes[j], route, hpMul: g.hpMul || 1 });
        i += k;
        t += g.gap * (1 + 0.25 * (k - 1)) * fast;
      }
      t += g.massive ? 0.8 : 1.5 * fast; // en la oleada masiva los grupos llegan uno detrás de otro
    }
    this.queue.sort((a, b) => a.at - b.at);
    this.queueT = 0;
    this.waveRunning = true;
    this.countdown = 9999;
  }

  // Carriles laterales para k zombis que salen a la vez (hasta 3 de lado)
  lanesFor(k) {
    if (k === 1) return [Phaser.Math.Between(-1, 1) * LANE];
    if (k === 2) return [-LANE * 0.7, LANE * 0.7];
    return [-LANE, 0, LANE].slice(0, k);
  }

  // opts: { dist, summoned } para los refuerzos que invoca un jefe
  spawnEnemy(type, lane, route = 0, opts = {}) {
    const def = ENEMIES[type];
    const k = this.waveNo - 1;
    // dificultad: la vida crece cada oleada (y con el nivel); la velocidad sube un poco
    let hpMult;
    if (def.boss) hpMult = this.level.bossScale ?? 1 + 0.15 * (this.levelId - 1);
    else {
      // en los niveles con "ramp" la vida extra del nivel crece a lo largo de las oleadas
      const hs = 1 + ((this.level.hpScale || 1) - 1) * rampOf(this.level, this.waveNo);
      // a partir del nivel 7 la vida crece más entre rondas
      const grow = this.levelId >= 7 ? 1 + 0.2 * k + 0.016 * k * k : 1 + 0.15 * k + 0.011 * k * k;
      hpMult = def.mini ? (1 + 0.1 * k) * hs : grow * hs;
    }
    hpMult *= opts.hpMul || 1;
    if (this.infernal) hpMult *= 1.35;
    let spMult = def.boss || def.mini ? 1 : Math.min(1.25, 1 + 0.02 * k);
    if (this.infernal && this.waveNo <= 8 && !def.boss) spMult *= 1.15;
    const dist0 = opts.dist || 0;
    const p = this.posAt(dist0, lane, route);
    const e = {
      type,
      def,
      lane,
      route,
      summoned: !!opts.summoned,
      auraUntil: 0,
      summonT: [],
      spMult,
      hp: def.hp * hpMult,
      maxHp: def.hp * hpMult,
      dist: dist0,
      age: 0,
      x: p.x,
      y: p.y,
      goldUntil: 0,
      slowUntil: 0,
      slow: 0,
      frozenUntil: 0,
      poisonUntil: 0,
      poisonDps: 0,
      poisonSpread: false,
      spreadT: 0,
      burnUntil: 0,
      burnDps: 5,
      burnExplode: null,
      corrodeUntil: 0,
      dead: false,
      pushes: 0,
    };
    this.applyResists(e, k);
    // Pesado: a partir del nivel 5 es muy común (solo se le puede empujar 3 veces)
    e.heavy = !!def.heavy || (!def.flying && this.levelId >= 5 && !this.level.tutorial && Math.random() < 0.35);
    const art = def.art;
    e.flyY = def.flying ? -30 : 0; // los voladores se dibujan por encima de su sombra
    e.shadow = this.add.image(p.x, p.y + 14, 'shadow').setScale(art.shadow).setAlpha(def.flying ? 0.35 : 0.5).setDepth(10);
    e.txt = this.add.sprite(p.x, p.y + 6 + e.flyY, art.key).setOrigin(0.5, 0.58).setScale(art.scale).setTint(art.tint).setDepth(10);
    e.txt.play(art.key);
    e.txt.anims.setProgress(Math.random());
    e.flash = 0;
    this.enemies.push(e);
    this.discover(type);
  }

  // Resistencias del zombi en partida (e.res = {tipo: 0..0.85}):
  // las de su ficha + resistencia normal que crece con las rondas y los niveles + resistencia predominante del nivel.
  applyResists(e, k) {
    const def = e.def;
    const r = {};
    if (def.resist) r.normal = def.resist;
    if (def.mres) r.magico = def.mres;
    for (const [t, v] of Object.entries(def.res || {})) r[t] = Math.max(r[t] || 0, v);
    if (!this.level.tutorial) {
      // resistencia normal de todos los zombis: sube con las rondas y con los niveles
      r.normal = (r.normal || 0) + Math.min(0.3, 0.008 * (this.levelId - 1) + 0.007 * k + (this.infernal ? 0.05 : 0));
      const pre = predomOf(this.levelId);
      if (pre.length) {
        if (def.boss || def.mini) {
          // jefes y minijefes: resistencias extra (en menor medida) a los tipos del nivel
          for (const t of pre) r[t] = (r[t] || 0) + (this.infernal ? 0.25 : 0.15);
        } else {
          const chance = 0.25 + 0.3 * rampOf(this.level, this.waveNo) + (this.infernal ? 0.15 : 0);
          if (Math.random() < chance) {
            const t = pre[Math.floor(Math.random() * pre.length)];
            r[t] = Math.max(r[t] || 0, 0.5) + (this.infernal ? 0.15 : 0); // infernal: más de su resistencia principal
            e.predom = t;
            if (this.infernal) {
              // y una resistencia predominante extra
              const extra = pre.find((q) => q !== t) || ['normal', 'magico', 'fuego', 'oscuridad'].find((q) => q !== t);
              r[extra] = Math.max(r[extra] || 0, 0.3);
            }
          }
        }
      }
      // los zombis con resistencia ganan un extra en el modo infernal
      if (this.infernal) for (const t of Object.keys(r)) if (t !== 'normal' && r[t] > 0) r[t] += 0.1;
    }
    for (const t of Object.keys(r)) r[t] = Math.min(0.85, r[t]);
    e.res = r;
  }

  // ¿Puede este héroe (o su torreta, trampa, poción...) dañar a este zombi? Los voladores solo reciben daño antiaéreo.
  canHit(src, e) {
    return !(e.def.flying && src && NO_AIR.has(src.type));
  }

  // Empujar a un zombi: los jefes, minijefes y los inmunes no se empujan; los pesados, como mucho 3 veces
  canPush(e) {
    if (e.dead || e.def.boss || e.def.mini || e.def.noPush) return false;
    if (e.heavy && e.pushes >= 3) return false;
    e.pushes += 1;
    return true;
  }

  // Aviso grande en el centro del mapa (oleada masiva, voladores...)
  notice(text, color = '#ffd23f', dur = 3) {
    const tx = this.add
      .text(W / 2, MAP_Y + 150, text, { fontFamily: EMOJI_FONT, fontSize: '30px', color, fontStyle: 'bold', align: 'center', stroke: '#1b1209', strokeThickness: 6, wordWrap: { width: 900 } })
      .setOrigin(0.5)
      .setDepth(70)
      .setScale(0.6);
    this.tweens.add({ targets: tx, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: tx, alpha: 0, delay: dur * 1000, duration: 500, onComplete: () => tx.destroy() });
  }

  // ------------------------------------------------- ENEMIGOS DESCUBIERTOS
  // La primera vez que aparece un tipo de enemigo sale un "!" a la derecha; al pulsarlo se abre su ficha.
  discover(type) {
    if (!this.seen) {
      try {
        this.seen = new Set(JSON.parse(localStorage.getItem('zmcd_seen') || '[]'));
      } catch (e) {
        this.seen = new Set();
      }
      this.alerts = [];
      this.alertViews = [];
    }
    if (ENEMIES[type].flying && this.tut && !this._flyTip) {
      this._flyTip = true;
      this.notice('¡VOLADORES! El Bárbaro no llega hasta ellos.\nSolo los héroes ANTIAÉREOS (como el Elfo) pueden atacarlos.', '#9be4ff', 6);
    }
    if (this.seen.has(type)) return;
    this.seen.add(type);
    localStorage.setItem('zmcd_seen', JSON.stringify([...this.seen]));
    this.alerts.push(type);
    this.layoutAlerts();
  }

  layoutAlerts() {
    (this.alertViews || []).forEach((o) => o.destroy());
    this.alertViews = [];
    const x = this.paper ? W - 345 : W - 30;
    this.alerts.forEach((type, i) => {
      const y = MAP_Y + 136 + i * 50;
      const c = this.add.circle(x, y, 20, 0xffd23f).setStrokeStyle(4, 0x7b241c).setDepth(60).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, y - 1, '!', { fontFamily: FONT, fontSize: '30px', color: '#7b241c', fontStyle: 'bold' }).setOrigin(0.5).setDepth(61);
      const tip = this.add.text(x - 28, y, 'Nuevo enemigo', { fontFamily: FONT, fontSize: '14px', color: '#ffd23f', stroke: '#2e1c0f', strokeThickness: 3 }).setOrigin(1, 0.5).setDepth(61);
      this.tweens.add({ targets: [c, t], scale: 1.18, duration: 450, yoyo: true, repeat: -1 });
      c.on('pointerdown', () => {
        this.alerts = this.alerts.filter((a) => a !== type);
        this.openPaper(type);
      });
      this.alertViews.push(c, t, tip);
    });
  }

  closePaper() {
    (this.paper || []).forEach((o) => o.destroy());
    this.paper = null;
    this.paperList = null;
    if (this._paperWheel) this.input.off('wheel', this._paperWheel);
    if (this._paperMove) this.input.off('pointermove', this._paperMove);
    if (this._paperUp) this.input.off('pointerup', this._paperUp);
    this._paperWheel = this._paperMove = this._paperUp = null;
    this.layoutAlerts();
  }

  // Zombis de este nivel que ya se han visto alguna vez (para el libro de enemigos)
  bookList() {
    const seen = new Set([...seenEnemies(), ...(this.seen || [])]);
    return enemiesOfLevel(this.level).filter((t) => seen.has(t) && ENEMIES[t]);
  }

  openBook(type) {
    const list = this.bookList();
    if (!list.length) {
      this.uiFloat(W - 200, PANEL_Y - 44, 'Aún no has visto zombis', '#ffd23f');
      return;
    }
    this.openPaper(type && list.includes(type) ? type : list[0], list);
  }

  openPaper(type, list = null) {
    this.closePaper();
    this.paperList = list;
    const def = ENEMIES[type];
    const info = enemyInfo(def);
    const x0 = W - 310;
    const y0 = MAP_Y + 112;
    const w = 300;
    const h = PANEL_Y - y0 - 8;
    const D = 70;
    const ink = '#3b2412';
    const o = [];
    const add = (go) => {
      o.push(go);
      return go;
    };
    // marco de madera del pack de interfaz con el pergamino dentro
    const panelBg = add(woodPanel(this, x0, y0, w, h, D).setInteractive());
    add(this.add.rectangle(x0 + 11, y0 + 11, w - 22, h - 22, 0xf1dfae).setOrigin(0, 0).setStrokeStyle(2, 0xb08d57).setDepth(D + 0.1));
    add(this.add.text(x0 + w / 2, y0 + 24, def.name, { fontFamily: FONT, fontSize: '19px', color: '#7b241c', fontStyle: 'bold', align: 'center', wordWrap: { width: w - 70 } }).setOrigin(0.5).setDepth(D + 1));
    const art = def.art;
    const spr = add(this.add.sprite(x0 + w / 2, y0 + 96, art.key).setOrigin(0.5, 0.58).setScale(Math.min(art.scale * 1.15, 3.6)).setTint(art.tint).setDepth(D + 1));
    spr.play(art.key);
    // --- contenido con desplazamiento (rueda del ratón o arrastrar): nunca se sale del pergamino
    const top = y0 + 142;
    const bottom = y0 + h - 16;
    const scrollObjs = [];
    const sc = (go) => (scrollObjs.push({ o: add(go), by: go.y }), go);
    let y = top + 6;
    const desc = sc(this.add.text(x0 + w / 2, y, def.desc, { fontFamily: FONT, fontSize: '14px', color: ink, fontStyle: 'italic', align: 'center', wordWrap: { width: w - 40 } }).setOrigin(0.5, 0).setDepth(D + 1));
    y += desc.height + 12;
    info.rows.forEach(([label, value]) => {
      sc(this.add.text(x0 + 18, y, label, { fontFamily: FONT, fontSize: '15px', color: ink, fontStyle: 'bold' }).setDepth(D + 1));
      sc(this.add.text(x0 + w - 28, y, value, { fontFamily: FONT, fontSize: '15px', color: ink }).setOrigin(1, 0).setDepth(D + 1));
      sc(this.add.rectangle(x0 + 16, y + 21, w - 38, 1, 0xb08d57).setOrigin(0, 0).setDepth(D + 1));
      y += 26;
    });
    if (info.traits.length) {
      y += 6;
      sc(this.add.text(x0 + 18, y, 'Características', { fontFamily: FONT, fontSize: '15px', color: '#7b241c', fontStyle: 'bold' }).setDepth(D + 1));
      y += 22;
      for (const tr of info.traits) {
        const tt = sc(this.add.text(x0 + 18, y, '• ' + tr, { fontFamily: FONT, fontSize: '13px', color: ink, wordWrap: { width: w - 44 }, lineSpacing: 3 }).setDepth(D + 1));
        y += tt.height + 4;
      }
    }
    const maxScroll = Math.max(0, y + 6 - bottom);
    let bar = null;
    const barH = maxScroll ? Math.max(30, ((bottom - top) * (bottom - top)) / (bottom - top + maxScroll)) : 0;
    if (maxScroll) {
      add(this.add.rectangle(x0 + w - 17, top, 5, bottom - top, 0xb08d57, 0.35).setOrigin(0.5, 0).setDepth(D + 1));
      bar = add(this.add.rectangle(x0 + w - 17, top, 5, barH, 0x7b241c, 0.85).setOrigin(0.5, 0).setDepth(D + 2));
    }
    let scroll = 0;
    const apply = () => {
      for (const it of scrollObjs) {
        const go = it.o;
        go.y = it.by - scroll;
        if (go.type === 'Text') {
          // recorta el texto que asoma por arriba o por abajo
          const k = go.frame.height / go.height || 1;
          const c0 = Math.max(0, top - go.y);
          const c1 = Math.min(go.height, bottom - go.y);
          if (c1 <= c0) go.setVisible(false);
          else {
            go.setVisible(true);
            if (c0 > 0 || c1 < go.height) go.setCrop(0, c0 * k, go.frame.width, (c1 - c0) * k);
            else go.setCrop();
          }
        } else go.setVisible(go.y >= top && go.y <= bottom);
      }
      if (bar) bar.y = top + (scroll / maxScroll) * (bottom - top - barH);
    };
    const scrollBy = (d) => {
      const ns = Math.max(0, Math.min(maxScroll, scroll + d));
      if (ns !== scroll) {
        scroll = ns;
        apply();
      }
    };
    apply();
    const inside = (p) => p.x >= x0 && p.x <= x0 + w && p.y >= y0 && p.y <= y0 + h;
    if (maxScroll) {
      this._paperWheel = (p, objs, dx, dy) => inside(p) && scrollBy(dy * 0.5);
      this.input.on('wheel', this._paperWheel);
      let dragY = null;
      panelBg.on('pointerdown', (p) => (dragY = p.y));
      this._paperMove = (p) => {
        if (dragY === null || !p.isDown) return;
        scrollBy(dragY - p.y);
        dragY = p.y;
      };
      this._paperUp = () => (dragY = null);
      this.input.on('pointermove', this._paperMove);
      this.input.on('pointerup', this._paperUp);
    }
    // --- flechas para pasar a los otros zombis (solo desde el libro de enemigos)
    if (list && list.length > 1) {
      const i = list.indexOf(type);
      const go = (d) => this.openPaper(list[(i + d + list.length) % list.length], list);
      for (const [d, ax, lbl] of [[-1, x0 + 18, '◀'], [1, x0 + w - 58, '▶']]) {
        const b = makeButton(this, ax, y0 + 74, 40, 44, lbl, () => go(d), { fontSize: 20, fill: 0x7b4a2b, depth: D + 2 });
        add(b);
      }
      add(this.add.text(x0 + w / 2, y0 + 128, `${i + 1} / ${list.length}`, { fontFamily: FONT, fontSize: '13px', color: '#7b241c', fontStyle: 'bold' }).setOrigin(0.5).setDepth(D + 1));
    }
    add(iconButton(this, x0 + w - 36, y0 + 12, 24, 16, () => this.closePaper(), D + 2)); // botón X del pack
    this.paper = o;
    this.layoutAlerts();
  }

  destroyEnemyViews(e) {
    if (e.txt) e.txt.destroy();
    if (e.shadow) e.shadow.destroy();
  }

  // ------------------------------------------------------------ SIMULACIÓN
  update(time, delta) {
    if (!this.paused && !this.ended) this.playTime += delta / 1000; // tiempo real jugado (la pausa no cuenta; la velocidad x2/x3 sí es tiempo real)
    if (!this.paused && !this.ended) {
      const dt = Math.min(delta / 1000, 0.05);
      for (let i = 0; i < this.speed; i++) this.simulate(dt);
    }
    this.draw();
    this.refreshUi();
  }

  simulate(dt) {
    this.now += dt;
    if (this.buffs.horn > 0) this.buffs.horn -= dt;
    if (this.buffs.rain > 0) this.buffs.rain -= dt;
    if (this.buffs.fever > 0) this.buffs.fever -= dt;

    // timers diferidos
    for (const tm of this.timers) tm.t -= dt;
    const due = this.timers.filter((tm) => tm.t <= 0);
    this.timers = this.timers.filter((tm) => tm.t > 0);
    due.forEach((tm) => tm.fn());

    // cuenta atrás hacia la siguiente oleada
    if (!this.queue.length && this.waveNo < this.level.waveCount && this.countdown < 9000 && this.waveCooldown() <= 0) {
      this.countdown -= dt;
      if (this.countdown <= 0) this.startWave(false);
    }

    // aparición de zombis
    if (this.queue.length) {
      this.queueT += dt;
      while (this.queue.length && this.queue[0].at <= this.queueT) {
        const q = this.queue.shift();
        this.spawnEnemy(q.type, q.lane, q.route || 0, { hpMul: q.hpMul });
      }
      if (!this.queue.length) this.queueT = 0;
    }
    // la siguiente oleada se puede llamar desde que sale el último zombi de la anterior
    if (this.queue.length) this._hadQueue = true;
    else if (this._hadQueue) {
      this._hadQueue = false;
      this.availAt = this.now;
    }

    if (this.buffs.overload > 0) this.buffs.overload -= dt;
    this.updateAuras(dt);
    this.towers.forEach((t) => this.updateTower(t, dt));
    this.ntAllies(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateEnemies(dt);
    this.effects.forEach((f) => (f.life -= dt));
    this.effects = this.effects.filter((f) => f.life > 0);

    // fin de oleada
    if (this.waveRunning && !this.queue.length && !this.enemies.length) {
      this.waveRunning = false;
      this.ntOnWaveEnd();
      this.uiFloat(W / 2, MAP_Y + 120, `Oleada ${this.waveNo} superada`, '#9be4ff');
      if (this.waveNo >= this.level.waveCount) this.finish(true);
      else this.countdown = this.autoplay ? 3 : 9999; // con Autoplay la siguiente sale sola; si no, se espera al botón de oleada
    }
  }

  enemiesNear(x, y, r) {
    return this.enemies.filter((e) => !e.dead && dist2(x, y, e.x, e.y) <= r);
  }

  // Orden de prioridad de ataque de una defensa: devuelve negativo si a va antes que b
  prioCmp(t) {
    switch (t.prio) {
      case 'last':
        return (a, b) => a.dist - b.dist;
      case 'hp':
        return (a, b) => b.hp - a.hp || b.dist - a.dist;
      case 'armor':
        return (a, b) => (b.res.normal || 0) - (a.res.normal || 0) || b.dist - a.dist;
      default:
        return (a, b) => b.dist - a.dist;
    }
  }

  pickTarget(t, range) {
    const cmp = this.prioCmp(t);
    let best = null;
    for (const e of this.enemies) {
      if (e.dead || dist2(t.x, t.y, e.x, e.y) > range || !this.canHit(t, e)) continue;
      if (!best || cmp(e, best) < 0) best = e;
    }
    return best;
  }

  // enemigos en rango, ordenados según la prioridad de la defensa (por defecto, del más adelantado al más atrasado)
  targetsIn(t, range) {
    return this.enemies.filter((e) => !e.dead && dist2(t.x, t.y, e.x, e.y) <= range && this.canHit(t, e)).sort(this.prioCmp(t));
  }

  // DPS teórico contra un solo objetivo (sin críticos ni mejoras de zona); orientativo
  dpsTheory(t) {
    const s = this.stats(t);
    switch (t.type) {
      case 'elfo':
        return (s.dmg * s.arrows) / s.interval;
      case 'alquimista':
        return (s.dmg * s.potions * s.zoneLife) / s.interval;
      default:
        return s.dmg / s.interval;
    }
  }

  // DPS real: daño hecho por la defensa en los últimos 5 s
  dpsReal(t) {
    const log = t.dmgLog;
    if (!log || !log.length) return 0;
    const first = log[0];
    const span = Math.max(1, this.now - first.t);
    return (t.dmgDealt - first.d) / span;
  }

  applySlow(e, factor, dur) {
    if (e.def.noSlow) return; // inmune a los efectos de velocidad
    if (this.now > e.slowUntil) e.slow = factor;
    else e.slow = Math.max(e.slow, factor);
    e.slowUntil = Math.max(e.slowUntil, this.now + dur);
  }

  updateTower(t, dt) {
    t.cd -= dt;
    if (t.skillCd > 0) t.skillCd -= dt;
    // muestras de daño para el DPS real (una cada 0,5 s, ventana de 5 s)
    if (this.now - t.dmgLogT >= 0.5) {
      t.dmgLogT = this.now;
      t.dmgLog.push({ t: this.now, d: t.dmgDealt });
      while (t.dmgLog.length > 10) t.dmgLog.shift();
    }
    // lanzamiento automático de habilidades activas (nodo del árbol + botón AUTO)
    if (this.autoSkills && t.skillCd <= 0 && this.hasSkill(t) && this.enemies.some((e) => !e.dead)) this.useSkill(t);
    if (t.bloodT > 0) {
      t.bloodT -= dt;
      if (t.bloodT <= 0) t.blood = 0;
    }
    if (t.type === 'barbaro' && t.ups.C >= 3) t.charge += dt;
    if (t.type === 'mago' && t.ups.C >= 4) {
      t.zapT += dt;
      if (t.zapT >= 4) {
        const st = this.stats(t);
        const inR = this.targetsIn(t, st.range);
        if (inR.length) {
          t.zapT = 0;
          this.lightning(t, inR[0], st.dmg * 2.4); // el doble que antes
        }
      }
    }
    if (NEW_TYPES.includes(t.type)) this.ntUpdate(t, dt); // pasivas de las defensas nuevas
    if (t.cd > 0) return;
    const s = this.stats(t);

    switch (t.type) {
      case 'lancero':
      case 'monje':
      case 'ingeniero':
      case 'asedio':
      case 'midas':
      case 'nigromante':
      case 'druida':
        this.ntAttack(t, s);
        break;
      case 'barbaro': {
        const target = this.pickTarget(t, s.range);
        if (!target) return;
        const ang = Math.atan2(target.y - t.y, target.x - t.x);
        // Ataque múltiple: tras 3 ataques normales, el siguiente es triple (tres golpes seguidos). El contador solo cuenta
        // los ataques normales y se reinicia tras el triple (y mientras no se tenga la mejora).
        let multi = false;
        if (s.multi) {
          if ((t.normalHits || 0) >= 3) {
            multi = true;
            t.normalHits = 0;
          } else t.normalHits = (t.normalHits || 0) + 1;
        } else t.normalHits = 0;
        const full = s.spin;
        const strike = () => {
          for (const e of this.enemies) {
            if (e.dead || dist2(t.x, t.y, e.x, e.y) > s.range + e.def.size * 0.3) continue;
            if (!full) {
              let d = Math.atan2(e.y - t.y, e.x - t.x) - ang;
              d = Math.atan2(Math.sin(d), Math.cos(d));
              if (Math.abs(d) > Math.PI * 0.2) continue; // cono de 72º (antes 90º)
            }
            let hit = s.dmg;
            if (Math.random() < s.crit) {
              hit *= t.bloodUntil > this.now ? 5 : s.critMult; // Sed de sangre: críticos x5
              this.critText(e);
            }
            if ((e.def.boss || e.def.mini) && s.boss5) hit *= 4; // Conquistador: x4
            this.damage(e, hit, { src: t });
            // el empujón solo afecta a UN zombi por golpe (el objetivo principal)
            if (s.knock && e === target && !e.dead && this.canPush(e)) e.dist = Math.max(0, e.dist - 15.4); // empuja un 30% menos que antes (22)
          }
          this.effects.push({ kind: 'cone', x: t.x, y: t.y, ang, range: s.range, full, life: 0.18, max: 0.18, multi });
        };
        strike();
        if (multi) {
          [0.13, 0.26].forEach((dl) => this.timers.push({ t: dl, fn: () => this.towers.includes(t) && strike() }));
        }
        this.towerAnim(t, target);
        t.cd = s.interval;
        break;
      }
      case 'elfo': {
        const inRange = this.targetsIn(t, s.range);
        if (!inRange.length) return;
        t.volley += 1;
        const mult = (s.density ? Math.min(2, 1 + 0.05 * inRange.length) : 1) * (s.triple && t.volley % 4 === 0 ? 3 : 1);
        for (let i = 0; i < s.arrows; i++) {
          const target = inRange[i % inRange.length];
          this.projectiles.push({
            kind: 'arrow',
            x: t.x,
            y: t.y,
            target,
            lx: target.x,
            ly: target.y,
            speed: 650,
            dmg: s.dmg * mult,
            dtype: s.dark ? 'oscuridad' : 'normal', // Magia oscura: daño de oscuridad (ya no ignora las resistencias)
            crit: s.crit,
            dark: s.dark,
            execute: s.execute,
            slow: s.slow,
            pierce: s.pierce,
            tele: s.tele,
            hit: new Set(),
            src: t,
            spr: this.add
              .image(t.x, t.y, 'arrow')
              .setScale(0.6)
              .setTint(s.tele ? 0xc27bff : s.dark ? 0x6b5b7b : 0xffffff)
              .setDepth(29),
          });
        }
        this.towerAnim(t, inRange[0]);
        t.cd = s.interval;
        break;
      }
      case 'alquimista': {
        const inRange = this.targetsIn(t, s.range);
        if (!inRange.length) return;
        t.throws += 1;
        const goldPotion = s.goldCharge && t.throws % 3 === 0; // tras atacar dos veces, la siguiente poción es dorada
        for (let i = 0; i < s.potions; i++) {
          const target = inRange[Math.min(i, inRange.length - 1)];
          this.projectiles.push({
            kind: 'potion',
            sx: t.x,
            sy: t.y,
            tx: target.x,
            ty: target.y,
            x: t.x,
            y: t.y,
            t: 0,
            dur: 0.6 + i * 0.1,
            zoneR: s.zoneR,
            zoneLife: s.zoneLife,
            dps: s.dmg,
            poison: s.poison,
            poisonDps: s.poisonDps,
            epidemic: s.epidemic,
            gold: goldPotion,
            corrode: s.corrode,
            impact: s.impact,
            src: t,
            impactDmg: s.dmg * 3,
          });
        }
        this.towerAnim(t, inRange[0]);
        t.cd = s.interval;
        break;
      }
      case 'mago': {
        const inRange = this.targetsIn(t, s.range);
        if (!inRange.length) return;
        t.shots += 1;
        const nova = s.nova && t.shots % 5 === 0;
        const volc = s.volcano && t.shots % 3 === 0;
        const launch = (target, first) =>
          this.projectiles.push({
            kind: 'orb',
            x: t.x,
            y: t.y,
            target,
            lx: target.x,
            ly: target.y,
            speed: 420,
            dmg: s.dmg * (first && volc ? 2 : 1),
            blast: s.blast * (first && volc ? 1.3 : 1),
            burn: first && volc,
            explode: s.explode,
            slow: s.slow,
            echo: s.echo,
            nova: first && nova,
            volc: first && volc,
            src: t,
          });
        launch(inRange[0], true);
        if (s.twin) {
          this.timers.push({
            t: 0.25,
            fn: () => {
              if (!this.towers.includes(t)) return;
              const again = this.targetsIn(t, s.range);
              if (again.length) launch(again[0], false);
            },
          });
        }
        this.towerAnim(t, inRange[0]);
        t.cd = s.interval;
        break;
      }
    }
  }

  // Animación de ataque de la defensa (se gira hacia el objetivo y vuelve a la animación de reposo)
  towerAnim(t, target) {
    if (!target || !t.txt.active) return;
    t.txt.setFlipX(target.x < t.x);
    t.txt.play(t.art.atk, true);
    t.txt.once('animationcomplete', () => {
      if (t.txt.active) t.txt.play(t.art.idle, true);
    });
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.kind === 'rock' || p.kind === 'ghost' || p.kind === 'wisp' || p.kind === 'blood') {
        this.ntProjectile(p, dt);
        continue;
      }
      if (p.kind === 'potion') {
        p.t += dt;
        const k = Math.min(1, p.t / p.dur);
        p.x = p.sx + (p.tx - p.sx) * k;
        p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * 70;
        if (k >= 1) {
          p.dead = true;
          this.zones.push({
            x: p.tx,
            y: p.ty,
            r: p.zoneR,
            life: p.zoneLife,
            tick: 0,
            dps: p.dps,
            poison: p.poison,
            poisonDps: p.poisonDps || 0,
            epidemic: p.epidemic,
            slow: p.slow || 0,
            corrode: p.corrode,
            gold: !!p.gold,
            src: p.src,
          });
          if (p.big) this.addRing(p.tx, p.ty, p.zoneR, 0xffd700, 0.6);
          playFx(this, 'fx_splash', p.tx, p.ty, Math.max(0.5, p.zoneR / 70), 6);
          if (p.impact) this.splash(p.tx, p.ty, 70, p.impactDmg, { src: p.src });
        }
        continue;
      }
      if (p.kind === 'arcCharge') {
        // carga del Orbe arcano: sigue al Mago y, al acabar, se divide en 3
        if (!this.towers.includes(p.src)) {
          p.dead = true;
          continue;
        }
        p.t += dt;
        p.x = p.src.x;
        p.y = p.src.y - 58;
        if (p.t >= p.dur) {
          p.dead = true;
          const live = this.enemies.filter((e) => !e.dead).sort((a, b) => b.hp - a.hp);
          if (live.length) {
            this.addRing(p.x, p.y, 46, 0xce93d8, 0.5);
            const BEND = [0.16, 0.6, -0.75]; // el primero casi recto; los otros dan más rodeo
            for (let i = 0; i < 3; i++) {
              const e = live[i % live.length];
              const dur = Math.max(0.55, Math.hypot(e.x - p.x, e.y - p.y) / 650) + i * 1.0; // cada uno llega 1 s después que el anterior
              this.projectiles.push({ kind: 'arcFrag', sx: p.x, sy: p.y, x: p.x, y: p.y, tx: e.x, ty: e.y, target: e, t: 0, dur, bend: BEND[i], dmg: p.dmg, src: p.src, trail: [] });
            }
          }
        }
        continue;
      }
      if (p.kind === 'arcFrag') {
        // orbe púrpura con trayectoria curva (curva de Bézier) hasta su zombi; deja una estela de partículas blancas
        if (p.target && p.target.dead) {
          const alt = this.enemies.filter((e) => !e.dead).sort((a, b) => b.hp - a.hp)[0];
          p.target = alt || null;
        }
        if (p.target) {
          p.tx = p.target.x;
          p.ty = p.target.y;
        }
        p.t += dt;
        const k = Math.min(1, p.t / p.dur);
        const mx = (p.sx + p.tx) / 2, my = (p.sy + p.ty) / 2;
        const dx = p.tx - p.sx, dy = p.ty - p.sy;
        const cx = mx - dy * p.bend, cy = my + dx * p.bend; // punto de control desplazado en perpendicular
        const u = 1 - k;
        p.x = u * u * p.sx + 2 * u * k * cx + k * k * p.tx;
        p.y = u * u * p.sy + 2 * u * k * cy + k * k * p.ty;
        p.trail.push({ x: p.x + (Math.random() - 0.5) * 8, y: p.y + (Math.random() - 0.5) * 8, life: 0.55 });
        if (p.trail.length > 26) p.trail.shift();
        p.trail.forEach((q) => (q.life -= dt));
        if (k >= 1) {
          p.dead = true;
          if (p.target && !p.target.dead) this.damage(p.target, p.dmg, { src: p.src, dtype: 'luz' });
          this.addRing(p.x, p.y, 40, 0xb388ff, 0.45);
          playFx(this, 'fx_explosion2', p.x, p.y, 0.6, 27);
        }
        continue;
      }
      if (p.kind === 'frag') {
        // fragmento del Eco arcano: penetración infinita, daña una vez a cada zombi que atraviesa
        const step = p.speed * dt;
        p.x += Math.cos(p.ang) * step;
        p.y += Math.sin(p.ang) * step;
        p.left -= step;
        for (const e of this.enemies) {
          if (e.dead || p.hit.has(e) || dist2(p.x, p.y, e.x, e.y) > 22 + e.def.size * 0.3) continue;
          p.hit.add(e);
          this.damage(e, p.dmg, { src: p.src });
        }
        if (p.left <= 0) p.dead = true;
        continue;
      }
      if (p.kind === 'orb' && p.nova) {
        // Supernova: aura de luz con daño continuo mientras vuela
        for (const e of this.enemiesNear(p.x, p.y, 60)) this.damage(e, p.dmg * 4.5 * dt, { dot: true, src: p.src, dtype: 'luz' }); // x3
      }
      if (p.kind === 'arrow' && p.free) {
        // vuelo libre tras atravesar: recto, golpeando a lo que se cruce, hasta salir del mapa
        const stepF = p.speed * dt;
        p.x += Math.cos(p.ang) * stepF;
        p.y += Math.sin(p.ang) * stepF;
        p.freeLeft -= stepF;
        for (const e of this.enemies) {
          if (e.dead || p.hit.has(e) || dist2(p.x, p.y, e.x, e.y) > 20 + e.def.size * 0.3) continue;
          p.hit.add(e);
          this.arrowDamage(p, e);
          p.pierce -= 1;
          if (p.pierce <= 0) {
            p.dead = true;
            break;
          }
        }
        if (p.freeLeft <= 0 || p.x < -30 || p.x > this.WW + 30 || p.y < MAP_Y - 30 || p.y > this.worldBottom + 30) p.dead = true;
        if (p.spr) p.spr.setPosition(p.x, p.y).setRotation(p.ang);
        continue;
      }
      let tx;
      let ty;
      if (p.target && !p.target.dead) {
        tx = p.target.x;
        ty = p.target.y + (p.target.flyY || 0); // a los voladores se les apunta arriba
        p.lx = tx;
        p.ly = ty;
      } else {
        tx = p.lx;
        ty = p.ly;
      }
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (p.curve) {
        // Telequinesis: la flecha gira poco a poco hacia el siguiente enemigo (trayectoria curva)
        const want = Math.atan2(dy, dx);
        let diff = want - p.ang;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        // giro limitado: puede curvarse bastante, pero nunca dar la vuelta entera ni orbitar
        const turn = Math.min(Math.abs(diff), 10 * dt, p.turnLeft);
        p.ang += Math.sign(diff) * turn;
        p.turnLeft -= turn;
        p.curveLife -= dt;
        if (p.curveLife <= 0 || (p.turnLeft <= 0.001 && Math.abs(diff) > 0.2)) {
          p.dead = true; // no puede alcanzar al objetivo: desaparece
        } else if (d <= step + 10) {
          if (!this.arrowHit(p)) p.dead = true;
        } else {
          p.x += Math.cos(p.ang) * step;
          p.y += Math.sin(p.ang) * step;
        }
      } else {
        p.ang = Math.atan2(dy, dx);
        if (d <= step + 6) {
          if (p.kind === 'arrow') {
            if (!this.arrowHit(p)) p.dead = true;
          } else {
            p.dead = true;
            if (p.kind === 'orb') this.orbHit(p, tx, ty);
          }
        } else {
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
        }
      }
      if (p.spr) p.spr.setPosition(p.x, p.y).setRotation(p.ang);
    }
    this.projectiles = this.projectiles.filter((p) => {
      if (p.dead && p.spr) p.spr.destroy();
      return !p.dead;
    });
  }

  // Devuelve true si la flecha sigue viva (atraviesa) y false si desaparece
  arrowHit(p) {
    const e = p.target;
    if (!e || e.dead) return false;
    this.arrowDamage(p, e);
    p.hit.add(e);
    if (p.pierce > 0) {
      let next = null;
      if (p.tele) {
        // Telequinesis: el siguiente enemigo más cercano, esté donde esté (dentro de un rango razonable)
        // solo enemigos por delante (hasta ~80º de desvío), para que la flecha nunca tenga que dar la vuelta
        let bd = 260;
        for (const o of this.enemies) {
          if (o.dead || p.hit.has(o)) continue;
          const d2 = dist2(e.x, e.y, o.x, o.y);
          let da = Math.atan2(o.y - e.y, o.x - e.x) - p.ang;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > 1.4) continue;
          if (d2 < bd) {
            bd = d2;
            next = o;
          }
        }
      } else {
        // Flechas afiladas: solo si hay otro zombi alineado en la misma dirección
        let bd = 230;
        for (const o of this.enemies) {
          if (o.dead || p.hit.has(o)) continue;
          const d2 = dist2(e.x, e.y, o.x, o.y);
          if (d2 > bd) continue;
          let da = Math.atan2(o.y - e.y, o.x - e.x) - p.ang;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < 0.45) {
            bd = d2;
            next = o;
          }
        }
      }
      if (next) {
        p.pierce -= 1;
        p.target = next;
        p.lx = next.x;
        p.ly = next.y;
        p.curve = !!p.tele;
        p.turnLeft = 1.6; // giro total máximo en radianes (~90º)
        p.curveLife = 0.9;
        return true;
      }
      // sin más zombis a la vista: la flecha sigue su curso en línea recta hasta salir del mapa
      // (o hasta gastar la penetración que le queda si se cruza con alguno más)
      p.free = true;
      p.freeLeft = 900;
      p.curve = false;
      p.target = null;
      return true;
    }
    return false;
  }

  // daño de una flecha a un zombi (ejecutor, magia oscura, flechas gélidas)
  arrowDamage(p, e) {
    let dmg = p.dmg;
    if (p.execute && e.hp / e.maxHp < 0.35) dmg *= 3;
    if (p.crit && Math.random() < p.crit) {
      dmg *= 2; // crítico (Ojo de halcón)
      this.critText(e);
    }
    if (p.dark && (e.def.boss || e.def.mini)) dmg *= 2;
    if (p.slow) this.applySlow(e, 0.25, 1.5);
    this.damage(e, dmg, { dtype: p.dtype, src: p.src });
  }

  orbHit(p, x, y) {
    const opts = { burn: p.burn, explode: p.explode, slow: p.slow, src: p.src };
    this.splash(x, y, p.blast, p.dmg, opts);
    if (p.nova) {
      this.addRing(x, y, p.blast, 0xfff2a8, 0.5);
      // aura de luz que se queda un momento haciendo daño continuo
      this.zones.push({ x, y, r: p.blast * 1.3, life: 2.5, tick: 0, dps: p.dmg * 2.4, aura: true, dtype: 'luz', src: p.src }); // x3
    }
    if (p.echo) {
      // Eco arcano: el hechizo se fragmenta en abanico hacia delante (en la dirección en que iba); los fragmentos atraviesan a todos los zombis
      const base = p.src ? Math.atan2(y - p.src.y, x - p.src.x) : -Math.PI / 2;
      const FAN = [-0.6, -0.2, 0.2, 0.6];
      for (let i = 0; i < 4; i++) {
        this.projectiles.push({
          kind: 'frag',
          x,
          y,
          ang: base + FAN[i],
          speed: 360,
          left: 170,
          dmg: p.dmg * 0.5,
          hit: new Set(),
          src: p.src,
        });
      }
    }
  }

  // Cadena de rayos (Mago C4): el rayo impacta y salta casi al instante entre enemigos cercanos
  lightning(t, first, dmg) {
    const hit = new Set();
    let from = { x: t.x, y: t.y };
    let cur = first;
    let delay = 0;
    for (let hop = 0; hop < 14 && cur; hop++) {
      const target = cur;
      const a = from;
      hit.add(target);
      this.timers.push({
        t: delay,
        fn: () => {
          this.effects.push({ kind: 'bolt', x: a.x, y: a.y, x2: target.x, y2: target.y, life: 0.32, max: 0.32, color: 0x81d4fa, jag: true, seed: Math.random() * 1000 });
          this.damage(target, dmg, { src: t, dtype: 'electrico' });
        },
      });
      delay += 0.06;
      from = { x: target.x, y: target.y };
      let best = null;
      let bd = 235;
      for (const o of this.enemies) {
        if (o.dead || hit.has(o)) continue;
        const d2 = dist2(target.x, target.y, o.x, o.y);
        if (d2 < bd) {
          bd = d2;
          best = o;
        }
      }
      cur = best;
    }
  }

  splash(x, y, r, dmg, opts = {}) {
    this.addRing(x, y, r, 0xff8c42, 0.3);
    playFx(this, 'fx_explosion1', x, y, Math.max(0.6, r / 48));
    for (const e of this.enemiesNear(x, y, r)) {
      if (opts.burn) {
        e.burnUntil = this.now + 3;
        e.burnDps = Math.max(e.burnDps, 6);
        e.burnSrc = opts.src;
        if (opts.explode) e.burnExplode = { dmg: dmg * 0.6, src: opts.src };
      }
      if (opts.slow) this.applySlow(e, 0.25, 8); // Orbe gélido: 8 s, no acumulable
      const fireMul = (opts.burn || opts.fire) && e.def.noFire ? 0.4 : 1; // los ignífugos aguantan el fuego
      this.damage(e, dmg * fireMul, { src: opts.src, dtype: opts.burn || opts.fire ? 'fuego' : opts.dtype });
    }
  }

  updateZones(dt) {
    for (const z of this.zones) {
      z.life -= dt;
      z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = 0.5;
        for (const e of this.enemiesNear(z.x, z.y, z.r)) {
          if (z.corrode) e.corrodeUntil = this.now + 3;
          if (z.slow) this.applySlow(e, z.slow, 1.2);
          if (z.poison && e.poisonUntil <= this.now) {
            e.poisonUntil = this.now + 7;
            e.poisonDps = z.poisonDps;
            e.poisonSpread = !!z.epidemic;
            e.poisonSrc = z.src;
          }
          if (z.gold) e.goldUntil = this.now + 6; // zombi dorado del Alquimista: 6 s (antes 10)
          this.damage(e, z.dps * 0.5, { src: z.src, dtype: z.dtype });
        }
      }
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.age += dt;
      if (e.def.noPoison) e.poisonUntil = 0; // inmune al veneno
      if (e.def.noFire) {
        e.burnUntil = 0; // inmune al fuego
        e.burnExplode = null;
      }
      if (e.poisonUntil > this.now) {
        this.damage(e, e.poisonDps * dt, { dot: true, src: e.poisonSrc, dtype: 'veneno' });
        // Epidemia: los envenenados contagian a los cercanos (no acumulable)
        if (!e.dead && e.poisonSpread) {
          e.spreadT -= dt;
          if (e.spreadT <= 0) {
            e.spreadT = 0.5;
            for (const o of this.enemiesNear(e.x, e.y, 60)) {
              if (o.poisonUntil <= this.now) {
                o.poisonUntil = this.now + 7;
                o.poisonDps = e.poisonDps;
                o.poisonSpread = true;
                o.poisonSrc = e.poisonSrc;
              }
            }
          }
        }
      }
      if (!e.dead && e.burnUntil > this.now) this.damage(e, e.burnDps * dt, { dot: true, src: e.burnSrc, dtype: 'fuego' }); // quemadura
      if (!e.dead) this.ntEnemyTick(e, dt);
      if (e.dead) continue;
      let sp = e.def.speed * e.spMult;
      if (e.def.sprint) sp *= e.age < e.def.sprintTime ? e.def.sprint : e.def.tired;
      if (e.auraUntil > this.now) sp *= 1.25; // grito del Capitán
      if (e.frozenUntil > this.now) sp = 0;
      else if (e.slowUntil > this.now) sp *= 1 - e.slow;
      e.dist += sp * dt;
      if (e.def.aura) {
        for (const o of this.enemies) if (o !== e && !o.dead && dist2(e.x, e.y, o.x, o.y) <= e.def.aura.radius) o.auraUntil = this.now + 0.25;
      }
      if (e.def.summon) this.updateSummons(e, dt);
      if (e.dist >= this.routes[e.route].len) {
        this.leak(e);
        continue;
      }
      const p = this.posAt(e.dist, e.lane, e.route);
      if (Math.abs(p.x - e.x) > 0.01) e.txt.setFlipX(p.x < e.x);
      e.x = p.x;
      e.y = p.y;
      e.txt.setPosition(e.x, e.y + 6 + (e.flyY || 0) + (e.flyY ? Math.sin(e.age * 3) * 3 : 0)).setDepth(e.flyY ? 25 + e.y / 1000 : 10 + e.y / 1000);
      e.shadow.setPosition(e.x, e.y + 14);
      if (e.flash > 0) e.flash -= dt;
      e.txt.setAlpha(e.flash > 0 ? 0.55 : 1);
      // congelado: se detiene la animación
      const stopped = e.frozenUntil > this.now;
      if (stopped !== !!e.wasStopped) {
        e.wasStopped = stopped;
        if (stopped) e.txt.anims.pause();
        else e.txt.anims.resume();
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  // El Rey Zombi invoca refuerzos a su alrededor (más y más duros por debajo del 50% de vida)
  updateSummons(e, dt) {
    const rules = e.def.summon;
    const frac = e.hp / e.maxHp;
    rules.forEach((r, i) => {
      if (r.below && frac > r.below) return;
      e.summonT[i] = (e.summonT[i] ?? r.every * 0.6) - dt;
      if (e.summonT[i] > 0) return;
      e.summonT[i] = r.every;
      if (this.enemies.filter((o) => o.summoned && !o.dead).length > 30) return; // tope de refuerzos vivos
      this.floatText(e.x, e.y - 70, '¡Invoca refuerzos!', '#ff8080');
      playFx(this, 'fx_explosion1', e.x, e.y, 1.2, 27);
      let n = 0;
      for (const [type, count] of r.units) {
        for (let j = 0; j < count; j++) {
          const lane = [-1, 0, 1][n % 3] * LANE;
          this.spawnEnemy(type, lane, e.route, { dist: Math.max(0, e.dist - 20 - n * 14), summoned: true });
          n++;
        }
      }
    });
  }

  damage(e, amount, opts = {}) {
    if (e.dead) return;
    // los voladores solo reciben daño de los héroes antiaéreos
    if (!this.canHit(opts.src, e)) return;
    let a = amount;
    // tipo de daño: el que indica el ataque o el del héroe que lo hace
    const dt = opts.dtype || (opts.src && HERO_DTYPE[opts.src.type]) || 'normal';
    if (!opts.ignoreResist) a *= 1 - (e.res[dt] || 0) * (dt === 'normal' ? opts.resMul ?? 1 : 1);
    // luz y oscuridad: cada una hace más daño a los que resisten la otra
    if (dt === 'luz' && (e.res.oscuridad || 0) > 0) a *= 1.5;
    if (dt === 'oscuridad' && (e.res.luz || 0) > 0) a *= 1.5;
    if (e.corrodeUntil > this.now) a *= 1.2;
    if (e.markUntil > this.now) a *= e.markMult || 1; // marcado (Empalamiento, Juicio divino)
    if (e.shredUntil > this.now) a *= 1 + (e.shredAmt || 0); // resistencia reducida (maldición, Lanza del rey, oro frágil)
    if (opts.turret) e.turretHit = opts.src;
    // contador de daño por defensa (no cuenta el daño sobrante de una baja)
    if (opts.src) opts.src.dmgDealt += Math.min(a, Math.max(0, e.hp));
    e.hp -= a;
    if (!opts.dot) e.flash = 0.07;
    if (e.hp <= 0) this.kill(e, opts.src);
  }

  leak(e) {
    e.dead = true;
    this.leakedWave = true;
    this.destroyEnemyViews(e);
    this.lives -= e.def.leak;
    this.floatText(this.WW - 90, e.y - 30, `-${e.def.leak} ❤`, '#ff6b6b');
    if (this.lives <= 0) {
      this.lives = 0;
      this.finish(false);
    }
  }

  kill(e, src) {
    e.dead = true;
    this.destroyEnemyViews(e);
    playFx(this, e.def.boss ? 'fx_explosion2' : 'fx_dust', e.x, e.y + 6, e.def.boss ? 1.6 : 0.9, 27);
    this.run.kills += 1;
    // Sed de sangre del Bárbaro (A4): tras una baja suya, sus críticos hacen x5 durante 5 s
    if (src && src.type === 'barbaro' && src.ups.A >= 4 && this.towers.includes(src)) src.bloodUntil = this.now + 5;
    // Cadáveres ardientes del Mago (B3)
    if (e.burnExplode && e.burnUntil > this.now) {
      const d = e.burnExplode.dmg;
      const bsrc = e.burnExplode.src;
      this.timers.push({ t: 0.05, fn: () => this.splash(e.x, e.y, 55, d, { src: bsrc }) });
    }
    const golden = e.goldUntil > this.now;
    // recompensa base: un 25% menor y que decae con las oleadas (la economía no se dispara a mitad de partida)
    const earlyMul = this.levelId <= 3 ? 1.5 : 1; // primeros niveles: +50% de suministros por zombi abatido
    const baseReward = Math.max(1, Math.round((e.def.reward * 0.75 * earlyMul) / (1 + 0.04 * this.waveNo)));
    let sup = e.summoned ? Math.ceil(baseReward * 0.3) : baseReward; // los refuerzos invocados dan poco
    if (this.infernal) sup *= 0.8;
    if (golden) {
      // zombi dorado: +30% de suministros respecto al mismo zombi sin el efecto (no acumulable)
      const gm = e.goldMult || 1.3;
      if (e.goldBy) e.goldBy.goldEarned = (e.goldBy.goldEarned || 0) + sup * (gm - 1); // lo extra cuenta para el Rey Midas que lo doró
      sup *= gm;
    }
    this.ntOnKill(e, src);
    if (this.buffs.fever > 0) {
      if (this.buffs.feverBy) this.buffs.feverBy.goldEarned = (this.buffs.feverBy.goldEarned || 0) + sup;
      sup *= 2;
    }
    this.supplies += sup;

    // Monedas permanentes: no se ven durante la partida; al terminar se dan en proporción a los zombis abatidos (+ las gemas)
    if (!e.summoned) {
      this.run.coinKills += 1;
      const gr = gemRates(this.sv);
      const roll = Math.random();
      if (roll < gr.diamond) {
        this.run.gemCoins += 5; // un diamante cuenta como 6 zombis (1 + 5)
        this.run.diamonds += 1;
      } else if (roll < gr.diamond + gr.emerald) {
        this.run.gemCoins += 2; // esmeralda: cuenta como 3
        this.run.emeralds += 1;
      } else if (roll < gr.diamond + gr.emerald + gr.ruby) {
        this.run.gemCoins += 1; // rubí: cuenta como 2
        this.run.rubies += 1;
      }
    }
  }

  // ------------------------------------------------------------ FIN DE NIVEL
  finish(win) {
    if (this.ended) return;
    this.ended = true;
    const sv = this.sv;
    this.run.coins = Math.round((this.run.coinKills + this.run.gemCoins) * COINS_PER_KILL);
    this.run.tutorialBonus = this.levelId === 1 ? 30 : 0; // el tutorial siempre da +30 monedas (ganes o pierdas) para empezar a comprar mejoras
    this.run.coins += this.run.tutorialBonus;
    if (this.infernal) this.run.coins = 0; // el modo infernal no da oro (su premio son los cerebros)
    sv.coins += this.run.coins;
    let extra = '';
    // estrellas: 3 = ninguna vida perdida, 2 = perdiste algo (hasta 2/3 de la vida), 1 = perdiste más de 2/3
    let stars = 0;
    if (win) {
      const lost = this.maxLives - this.lives;
      stars = lost <= 0 ? 3 : lost <= (this.maxLives * 2) / 3 ? 2 : 1;
      sv.stars = sv.stars || {};
      if (!this.infernal && stars > (sv.stars[this.levelId] || 0)) {
        sv.stars[this.levelId] = stars;
        extra += `\n⭐ Nueva mejor puntuación: ${'★'.repeat(stars)}`;
      }
    }
    if (win && this.infernal) {
      sv.infernal = sv.infernal || {};
      if (!sv.infernal[this.levelId]) {
        sv.brains += 2; // primera vez en infernal: 2 cerebros de golpe
        extra += '\n🔥 ¡Modo infernal superado!\n🧠 +2 cerebros (primera vez)';
      }
      sv.infernal[this.levelId] = Math.max(sv.infernal[this.levelId] || 0, stars);
    }
    if (win && !this.infernal && !sv.cleared[this.levelId]) {
      sv.cleared[this.levelId] = true;
      sv.ingots += 1;
      extra += '\n🥇 +1 lingote de oro (primera vez)';
      sv.brains += 1; // 1 cerebro cada vez que se supera un nivel por primera vez
      extra += '\n🧠 +1 cerebro (nivel superado por primera vez)';
    }
    save();
    this.panelDirty = false;
    this.clearPanel();
    this.skillBtns.forEach((b) => b.btn.destroy());
    this.skillBtns = [];
    const g = this.run;
    const text =
      (this.infernal ? '🔥 MODO INFERNAL 🔥\n' : '') +
      (win ? `🏆 ¡VICTORIA!  ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : '💀 DERROTA') +
      (win ? `\n(vidas perdidas: ${this.maxLives - this.lives} de ${this.maxLives})` : '') +
      `\n⏱ Tiempo de partida: ${this.fmtTime(this.playTime)}` +
      `\n\nOleada ${this.waveNo}/${this.level.waveCount} · Zombis abatidos: ${g.kills}\n🪙 Monedas ganadas: ${g.coins}` +
      `\n(${g.coinKills} zombis${g.gemCoins ? ` + ${g.gemCoins} por gemas` : ''}) x ${COINS_PER_KILL}` +
      (g.tutorialBonus ? `\n🎓 Bonus del tutorial: +${g.tutorialBonus} monedas` : '') +
      (g.rubies + g.emeralds + g.diamonds ? `\n(gemas: ♦️${g.rubies} 🟢${g.emeralds} 💎${g.diamonds})` : '') +
      extra;
    this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0).setDepth(100).setInteractive();
    woodPanel(this, W / 2 - 360, 40, 720, 520, 100.5, 16); // tablón de madera del pack de interfaz
    this.add
      .text(W / 2, 250, text, { fontFamily: EMOJI_FONT, fontSize: '27px', color: '#ffffff', align: 'center', lineSpacing: 6, stroke: '#3b1f10', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(101);
    makeButton(this, W / 2 - 330, 480, 200, 70, '🔁 Reintentar', () => this.scene.restart({ level: this.levelId, infernal: this.infernal }), { depth: 102, fontSize: 24 });
    makeButton(this, W / 2 - 100, 480, 200, 70, '🌳 Árbol', () => this.scene.start('Tree'), { depth: 102, fontSize: 24, fill: 0x6c3483 });
    makeButton(this, W / 2 + 130, 480, 200, 70, 'Menú', () => this.scene.start('Menu'), { depth: 102, fontSize: 24 });
  }

  // ---------------------------------------------------------------- TUTORIAL
  // Pasos: colocar Bárbaro -> Elfo -> llamar oleada -> acelerar -> prioridad -> mejorar -> comprar la habilidad (obligatoria
  // antes de la oleada 4) -> usarla (obligatorio antes de la 5) -> vender. Los pasos ya hechos se saltan solos.
  tutIdx() {
    return this.tut ? TUT_STEPS.indexOf(this.tut.step) : 99;
  }

  tutDone(step) {
    switch (step) {
      case 'place_barb': return this.towers.some((t) => t.type === 'barbaro');
      case 'place_elf': return this.towers.some((t) => t.type === 'elfo');
      case 'call_wave': return this.waveNo >= 1;
      case 'speed': return !!this._tutSpeed;
      case 'priority': return !!this._tutPrio;
      case 'upgrade': return this.towers.some((t) => t.type === 'barbaro' && this.total(t) >= 1);
      case 'skill_buy': return this.towers.some((t) => t.type === 'barbaro' && t.ups.B >= 4);
      case 'skill_use': return !!this._tutSkill;
      case 'sell': return !!this._tutSold;
      default: return false;
    }
  }

  updateTutorial() {
    const t = this.tut;
    if (!t) return;
    let guard = 0;
    while (t.step !== 'done' && this.tutDone(t.step) && guard++ < 12) {
      t.step = TUT_STEPS[TUT_STEPS.indexOf(t.step) + 1];
      if (t.step === 'done') t.doneAt = this.now;
      if ((t.step === 'call_wave' || t.step === 'speed') && this.selection) {
        this.selection = null; // los botones de control solo se ven en el panel de comprar defensas
        this.panelDirty = true;
      }
    }
  }

  // Motivo por el que el tutorial no deja llamar a la siguiente oleada (o null)
  tutorialBlock() {
    if (!this.tut) return null;
    const i = this.tutIdx();
    if (i < TUT_STEPS.indexOf('call_wave')) return 'Primero coloca el Bárbaro y el Elfo';
    if (this.waveNo === 3 && i < TUT_STEPS.indexOf('skill_use')) return 'Antes de la oleada 4 completa los pasos: compra la habilidad del Bárbaro';
    if (this.waveNo === 4 && i < TUT_STEPS.indexOf('sell')) return 'Antes de seguir, usa la habilidad del Bárbaro';
    return null;
  }

  tutorialText() {
    const t = this.tut;
    if (!t) return '';
    const sel = this.selection && this.selection.kind === 'tower';
    switch (t.step) {
      case 'place_barb':
        return '1/2 · Coloca un Bárbaro 🪓: arrástralo desde la izquierda al mapa (o pulsa 1 y haz clic)';
      case 'place_elf':
        return '2/2 · Ahora coloca el Elfo 🏹 (casilla 2): ataca de lejos. Combinar héroes es la clave';
      case 'call_wave':
        return 'Cuando estés listo, pulsa «Siguiente oleada» (o la barra espaciadora). Tú decides cuándo llega cada oleada. Si no ves el botón, toca «◀ Héroes»';
      case 'speed':
        return 'Puedes acelerar la partida con el botón «Velocidad» (o con la tecla F). Pulsa para x2 y vuelve a x1 cuando quieras. Si no ves el botón, toca «◀ Héroes»';
      case 'priority':
        return sel ? '🎯 En «Prioridad» eliges a quién ataca primero: Primero, Último, Más vida o Armados. Pulsa una' : 'Toca a uno de tus héroes: verás su ficha, sus mejoras y su prioridad de ataque';
      case 'upgrade':
        return 'Mejora al Bárbaro: selecciónalo, toca una mejora y después CONFIRMAR. En el tutorial tiene todas, a mitad de precio';
      case 'skill_buy':
        return 'Antes de la oleada 4 necesitas su habilidad: sube el camino B (Vikingo) hasta el nivel 4. ¡El Cuerno Vikingo es gratis!';
      case 'skill_use':
        return '🎺 ¡Usa la habilidad! Pulsa el botón morado de la derecha. Cada habilidad tiene un tiempo de recarga' + (this.waveRunning ? '' : ' (llama a la siguiente oleada para tener zombis)');
      case 'sell':
        return 'Vender: selecciona un héroe y pulsa «Vender» para recuperar parte de su coste. Prueba con uno que te sobre (pon otro y véndelo)';
      default:
        return this.now - (t.doneAt || 0) < 9 ? '¡Tutorial completado! En los siguientes niveles tienes el botón «Oleadas automáticas» para encadenar las oleadas' : '';
    }
  }

  // Zona de la pantalla que el tutorial señala con un marco amarillo parpadeante
  tutTarget() {
    const t = this.tut;
    if (!t) return null;
    const y0 = PANEL_Y + 14;
    const sel = this.selection && this.selection.kind === 'tower' ? this.selection.tower : null;
    const towerBox = (type) => {
      const tw = this.towers.find((q) => (type ? q.type === type : true));
      return tw ? { x: tw.x - 32, y: tw.y - 36, w: 64, h: 72 } : null;
    };
    switch (t.step) {
      case 'place_barb':
      case 'place_elf': {
        const i = this.team.indexOf(t.step === 'place_barb' ? 'barbaro' : 'elfo');
        return i >= 0 ? { x: 10 + i * (SLOT_W + 4), y: y0, w: SLOT_W, h: 138 } : null;
      }
      case 'call_wave': return sel ? { x: 942, y: y0 + 96, w: 88, h: 44 } : this.ctrlRects.wave;
      case 'speed': return sel ? { x: 942, y: y0 + 96, w: 88, h: 44 } : this.ctrlRects.speed;
      case 'priority': return sel ? { x: 204, y: y0, w: 122, h: 124 } : towerBox('barbaro');
      case 'upgrade': return sel && sel.type === 'barbaro' ? { x: 330, y: y0, w: 616, h: 138 } : towerBox('barbaro');
      case 'skill_buy': return sel && sel.type === 'barbaro' ? { x: 534, y: y0, w: 204, h: 138 } : towerBox('barbaro');
      case 'skill_use': return { x: 1132, y: y0, w: 70, h: 70 };
      case 'sell': return sel ? { x: 942, y: y0, w: 88, h: 96 } : towerBox();
      default: return null;
    }
  }

  drawTutorialHighlight() {
    const g = this.tutHi;
    if (!g) return;
    g.clear();
    const r = this.tut && !this.ended ? this.tutTarget() : null;
    if (!r) return;
    const k = 0.5 + 0.5 * Math.sin(this.time.now / 180);
    g.lineStyle(5, 0xffe34d, 0.55 + 0.45 * k);
    g.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  }

  // -------------------------------------------------------------------- UI
  // «CRIT» en rojo encima del enemigo al hacer un golpe crítico (sube y desaparece rápido)
  critText(e) {
    const tx = this.add
      .text(e.x, e.y - e.def.size * 0.9 - 12, 'CRIT', { fontFamily: FONT, fontSize: '19px', color: '#ff1744', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(36);
    this.tweens.add({ targets: tx, y: tx.y - 22, alpha: 0, duration: 450, ease: 'Quad.easeOut', onComplete: () => tx.destroy() });
  }

  floatText(x, y, str, color = '#ffd23f') {
    const tx = this.add
      .text(x, y, str, { fontFamily: EMOJI_FONT, fontSize: '20px', color, stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(35);
    this.tweens.add({ targets: tx, y: y - 40, alpha: 0, duration: 1000, onComplete: () => tx.destroy() });
  }

  addRing(x, y, r, color, life) {
    this.effects.push({ kind: 'ring', x, y, r, color, life, max: life });
  }

  clearPanel() {
    hideTip();
    this.panelObjs.forEach((o) => o.destroy());
    this.panelObjs = [];
    this.dmgTxt = null;
    this.dmgTower = null;
  }

  // 12 345 -> "12,3k"; 1 234 567 -> "1,23M"
  fmtDmg(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace('.', ',') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.', ',') + 'k';
    return Math.floor(n).toLocaleString('es-ES');
  }

  rebuildPanel() {
    this.clearPanel();
    const y0 = PANEL_Y + 14;
    const BH = 138; // alto de los botones del panel
    const add = (o) => {
      this.panelObjs.push(o);
      return o;
    };
    const sel = this.selection;
    const hint = { fontFamily: FONT, fontSize: '20px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 4, lineSpacing: 6 };

    if (!sel) return; // aquí van las casillas de defensa y los botones de control (se crean aparte)

    // defensa seleccionada: info + 3 caminos + vender
    const t = sel.tower;
    const def = TOWERS[t.type];
    add(this.add.image(34, y0 + 28, t.art.avatar).setScale(0.2).setDepth(41));
    add(
      this.add
        .text(62, y0 + 2, this.describe(t), {
          fontFamily: EMOJI_FONT,
          fontSize: '13px',
          color: COL.cream,
          lineSpacing: 2,
          stroke: '#2e1c0f',
          strokeThickness: 3,
          wordWrap: { width: 136 },
        })
        .setDepth(41)
    );
    // DPS teórico (un objetivo) + DPS real de los últimos 5 s + daño total (los dos últimos se actualizan cada fotograma)
    const lineSt = { fontFamily: EMOJI_FONT, fontSize: '13px', color: '#ffd23f', stroke: '#2e1c0f', strokeThickness: 3 };
    add(this.add.text(14, y0 + 68, `DPS máx.: ${this.fmtDmg(this.dpsTheory(t))}`, { ...lineSt, color: '#9be4ff' }).setDepth(41));
    this.dmgTower = t;
    this.dmgTxt = add(this.add.text(14, y0 + 84, '', { ...lineSt, lineSpacing: 2 }).setDepth(41));

    // prioridad de ataque
    add(this.add.text(206, y0 - 1, 'Prioridad', { fontFamily: FONT, fontSize: '14px', color: '#ffd23f', stroke: '#2e1c0f', strokeThickness: 3 }).setDepth(41));
    PRIORITIES.forEach(([key, label], i) => {
      const on = (t.prio || 'first') === key;
      add(
        makeButton(this, 206, y0 + 20 + i * 30, 118, 27, (on ? '✔ ' : '') + label, () => {
          t.prio = key;
          if (this.tut) this._tutPrio = true;
          this.panelDirty = true;
        }, { fontSize: 13, fill: on ? 0x2f6f4a : 0x4a3b2e, depth: 42 })
      );
    });

    // tarjetas de mejora: solo título, icono y precio. Al tocarla se convierte en CONFIRMAR y aparece encima un recuadro con toda la información
    if (this.pendingUpg && this.pendingUpg.tower !== t) this.pendingUpg = null;
    if (this.sellArm && this.sellArm !== t) this.sellArm = null;
    PATH_KEYS.forEach((P, i) => {
      const x = 332 + i * 204;
      const CW = 200;
      const st = this.upgradeState(t, P);
      const owned = t.ups[P];
      const price = st.upg ? this.upgCost(t, st.upg, st.tier) : 0;
      const pending = !!this.pendingUpg && this.pendingUpg.P === P && st.state !== 'maxed';
      const canBuy = st.state === 'ok' && this.supplies >= price;
      const fill = pending && st.state === 'ok' ? (canBuy ? 0x2e7d32 : 0x7b241c) : st.state === 'ok' ? 0x2f6f5a : 0x4a3b2e;
      const b = makeButton(this, x, y0, CW, BH, '', () => this.onUpgradeCard(t, P), { fill, depth: 42 });
      if (st.state === 'maxed') b.setEnabled(false);
      add(b);
      if (pending) add(this.add.rectangle(x - 2, y0 - 2, CW + 4, BH + 4).setOrigin(0, 0).setStrokeStyle(4, 0xffd23f, 1).setDepth(44));
      // franja de niveles (verde = comprado)
      for (let n = 0; n < 4; n++) {
        const got = n < owned;
        const next = n === owned && st.state === 'ok';
        add(this.add.rectangle(x + 10 + n * 46, y0 + 9, 43, 11, got ? 0x43a047 : 0x1f1712).setOrigin(0, 0).setStrokeStyle(2, got ? 0xa5d6a7 : next ? 0xffd23f : 0x6d5a45, 1).setDepth(43));
      }
      const tx = { fontFamily: EMOJI_FONT, stroke: '#2e1c0f', strokeThickness: 3, align: 'center', wordWrap: { width: CW - 16 } };
      if (st.state === 'maxed') {
        add(this.add.text(x + CW / 2, y0 + 70, 'Camino completo', { ...tx, fontSize: '18px', color: '#a5d6a7' }).setOrigin(0.5).setDepth(43));
        return;
      }
      const a = st.state === 'ok' ? 1 : 0.6;
      add(this.add.image(x + CW / 2, y0 + 44, iconKeyFor(st.upg.name, st.upg.desc)).setScale(1.25).setDepth(43).setAlpha(a)); // icono
      add(this.add.text(x + CW / 2, y0 + 78, st.upg.name, { ...tx, fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(43).setAlpha(a)); // título
      if (pending && st.state === 'ok') {
        add(this.add.text(x + CW / 2, y0 + BH - 22, 'CONFIRMAR', { ...tx, fontSize: '20px', color: canBuy ? '#ffe082' : '#ffab91', fontStyle: 'bold' }).setOrigin(0.5).setDepth(43));
      } else if (st.state === 'ok') {
        const pt = add(this.add.text(x + CW / 2 + 12, y0 + BH - 22, `${price}${price === 0 ? ' ¡GRATIS!' : ''}`, { ...tx, fontSize: '19px', color: canBuy ? '#ffd23f' : '#ff8a80' }).setOrigin(0.5).setDepth(43));
        add(this.add.image(pt.x - pt.width / 2 - 14, y0 + BH - 22, 'icon_01').setDisplaySize(22, 22).setDepth(43)); // precio con martillo
      } else {
        add(this.add.text(x + CW / 2, y0 + BH - 22, '🔒', { ...tx, fontSize: '18px' }).setOrigin(0.5).setDepth(43).setAlpha(0.8));
      }
      if (pending) this.drawUpgradeInfo(t, P, st, price, x + CW / 2, add);
    });

    const refund = Math.floor(t.invested * (has(this.sv, 'rich_3') ? 0.85 : 0.6));
    // vender pide confirmación: primer toque la ilumina, el segundo vende
    const armedSell = this.sellArm === t;
    add(
      makeButton(this, 944, y0, 84, BH - 44, armedSell ? `¿Vender?\n+${refund} 🛠\nToca otra vez` : `Vender\n+${refund} 🛠`, () => {
        if (this.sellArm === t) {
          this.sellArm = null;
          this.sellTower(t);
          return;
        }
        this.sellArm = t;
        this.pendingUpg = null;
        this.panelDirty = true;
      }, { fontSize: armedSell ? 12 : 14, fill: armedSell ? 0xe65100 : 0x8a2c22, depth: 42 })
    );
    if (armedSell) add(this.add.rectangle(942, y0 - 2, 88, BH - 40).setOrigin(0, 0).setStrokeStyle(4, 0xffd23f, 1).setDepth(44));
    if (t.type === 'midas' && t.ups.B >= 2) {
      const v = Math.floor(t.vault || 0);
      const b = makeButton(this, 1032, y0 + 64, 96, 58, `Recaudar\n+${v} 🛠`, () => {
        this.ntCollect(t);
        this.panelDirty = true;
      }, { fontSize: 14, fill: 0x8a6d1a, depth: 42 });
      b.setEnabled(v > 0);
      add(b);
    }
    // Taller móvil (Ingeniero C1): botón para mover una defensa (una vez por oleada)
    if (t.type === 'ingeniero' && t.ups.C >= 1) {
      const mb = makeButton(this, 1032, y0, 96, 60, (t.moveCharges || 0) > 0 ? 'Mover\nhéroe' : 'Mover\n(próx. oleada)', () => this.enterMoveMode(t), { fontSize: 14, fill: 0x2f5f8a, depth: 42 });
      mb.setEnabled((t.moveCharges || 0) > 0);
      add(mb);
    }
    // volver a ver las defensas disponibles (con más de 4 defensas, el panel de selección necesita todo el espacio)
    add(
      makeButton(this, 944, y0 + BH - 40, 84, 40, '◀ Héroes', () => {
        this.selection = null;
        this.panelDirty = true;
      }, { fontSize: 13, fill: 0x5b4636, depth: 42 })
    );
  }

  rebuildSkills() {
    this.skillBtns.forEach((b) => b.btn.destroy());
    this.skillBtns = [];
    // un botón por tipo de defensa con habilidad especial (camino B nivel 4)
    const types = [...new Set(this.towers.filter((t) => this.hasSkill(t)).map((t) => t.type))];
    types.forEach((type, i) => {
      const sk = TOWERS[type].skill;
      const btn = makeButton(
        this,
        1134 + (i % 2) * 70,
        PANEL_Y + 14 + Math.floor(i / 2) * 72,
        66,
        66,
        '',
        () => {
          const ready = this.towers.find((t) => t.type === type && this.skillReady(t));
          if (ready) this.useSkill(ready);
        },
        { fontSize: 12, fill: 0x5b2c83, depth: 42 }
      );
      this.skillBtns.push({ type, sk, btn });
    });
  }

  refreshUi() {
    this.updateTutorial();
    this.drawTutorialHighlight();
    if (this.panelDirty && !this.ended) {
      this.panelDirty = false;
      this.rebuildPanel();
    }
    if (this.skillsDirty && !this.ended) {
      this.skillsDirty = false;
      this.rebuildSkills();
    }
    for (const { type, sk, btn } of this.skillBtns) {
      const mine = this.towers.filter((t) => t.type === type && this.hasSkill(t));
      const ready = mine.some((t) => this.skillReady(t));
      const cd = mine.length ? Math.min(...mine.map((t) => Math.max(0, t.skillCd))) : 0;
      btn.setText(ready ? `${sk.icon}\n¡LISTO!` : `${sk.icon}\n${Math.ceil(cd)} s`);
      btn.setEnabled(ready);
    }
    this.updateSlots();
    // si cambian los suministros, se reconstruye el panel (botones habilitados/deshabilitados)
    const selT = this.selection && this.selection.tower;
    const key = `${Math.floor(this.supplies)}|${this.towers.length}|${selT && selT.type === 'midas' ? Math.floor(selT.vault || 0) : ''}`;
    if (key !== this._lastKey) {
      this._lastKey = key;
      this.panelDirty = true;
    }

    if (this.dmgTxt && this.dmgTxt.active && this.dmgTower) {
      const dt0 = this.dmgTower;
      this.dmgTxt.setText(
        `DPS real: ${this.fmtDmg(this.dpsReal(dt0))}\n⚔ Daño total: ${this.fmtDmg(dt0.dmgDealt)}` + (dt0.type === 'midas' ? `\n💰 Recaudado: ${this.fmtDmg(dt0.goldEarned || 0)}` + (dt0.ups.B >= 2 ? `\n🏦 Inventario: ${Math.floor(dt0.vault || 0)}` : '') : '')
      );
    }

    this.txtLives.setText(`${this.lives}`);
    this.txtLives.setColor(this.lives / this.maxLives < 0.34 ? '#ffb74d' : COL.cream); // pocas vidas: en naranja
    this.txtSupplies.setText(`${Math.floor(this.supplies)}`);
    const hw = Math.max(100, 54 + Math.max(this.txtLives.width, this.txtSupplies.width) + 14);
    if (this.hudBox.width !== hw) this.hudBox.setSize(hw, 82);
    this.txtWave.setText(`${this.infernal ? '🔥 ' : ''}Oleada ${this.waveNo}/${this.level.waveCount}`);
    this.txtTime.setText(this.fmtTime(this.playTime));
    const buffs = [];
    if (this.buffs.horn > 0) buffs.push(`🎺 ${Math.ceil(this.buffs.horn)}s`);
    if (this.buffs.rain > 0) buffs.push(`🏹 x2 ${Math.ceil(this.buffs.rain)}s`);
    if (this.buffs.fever > 0) buffs.push(`💰 x2 ${Math.ceil(this.buffs.fever)}s`);
    this.txtBuffs.setText(buffs.join('  '));

    const cool = this.waveCooldown();
    const canCall = !this.queue.length && this.waveNo < this.level.waveCount && !this.tutorialBlock() && cool <= 0;
    this.btnWave.setEnabled(canCall);
    const bonus = this.waveNo < this.level.waveCount ? this.waveBonus() : 0;
    this.btnWave.setText(
      this.waveNo >= this.level.waveCount
        ? 'Última oleada'
        : cool > 0 && !this.queue.length
          ? `Espera ${Math.ceil(cool)} s`
          : `Siguiente oleada${bonus ? ` +${bonus}` : ''}${this.countdown < 9000 ? ` (${Math.ceil(this.countdown)})` : ''}`
    );

    const bt = this.tutorialText();
    this.banner.setText(bt).setVisible(!!bt && !this.ended);
  }

  // --------------------------------------------------------------- DIBUJADO
  draw() {
    const b = this.fxBelow;
    const a = this.fxAbove;
    b.clear();
    a.clear();

    // selección
    const sel = this.selection;
    // defensa que se está colocando: alcance y color según si el sitio es válido
    if (this.placing) {
      const sp = this.input.activePointer;
      const ptr = this.wp(sp);
      const ok = sp.y >= MAP_Y && sp.y < PANEL_Y && this.canPlaceAt(ptr.x, ptr.y);
      const base = this.stats({ type: this.placing.type, ups: { A: 0, B: 0, C: 0 }, blood: 0 });
      const col = ok ? 0x7cfc00 : 0xff5252;
      this.placing.ghost.setTint(ok ? 0xffffff : 0xff8080);
      b.fillStyle(col, 0.12);
      b.fillCircle(ptr.x, ptr.y, base.range);
      b.lineStyle(2, col, 0.8);
      b.strokeCircle(ptr.x, ptr.y, base.range);
      b.lineStyle(3, col, 0.9);
      b.strokeCircle(ptr.x, ptr.y + 10, TOWER_GAP / 2);
    }
    if (sel && sel.kind === 'tower') {
      const t = sel.tower;
      const s = this.stats(t);
      const range = s.range || 90;
      b.fillStyle(0xffffff, 0.08);
      b.fillCircle(t.x, t.y, range);
      b.lineStyle(2, 0xffffff, 0.6);
      b.strokeCircle(t.x, t.y, range);
    }

    if (this.moveMode && this.moveMode.tower) {
      const mt = this.moveMode.tower;
      b.lineStyle(4, 0xffd23f, 0.6 + 0.4 * Math.sin(this.time.now / 150));
      b.strokeCircle(mt.x, mt.y + 6, 34);
    }
    // defensas potenciadas: aros de color bajo la defensa y chispas que suben (cada bufo con su color)
    //   naranja = Cuerno Vikingo · azul = más cadencia (aura del Monje, Aullido...) · rojo = más daño (aura, Inversión...) · ámbar = Sobrecarga
    for (const t of this.towers) {
      const cols = [];
      if (this.buffs.horn > 0) cols.push(0xffb300);
      if (t.ascUntil > this.now) cols.push(0xffd700, 0xfffde7, 0xffd700); // Ascensión: oro y luz
      const ascScale = (t.art.scale || 1) * (t.ascUntil > this.now ? 1.1 : 1);
      if (Math.abs(t.txt.scaleX - ascScale) > 0.001) t.txt.setScale(ascScale);
      if (t.bloodUntil > this.now) cols.push(0xd50000); // Sed de sangre: partículas rojas
      if (this.buffs.rain > 0 && t.type === 'elfo') cols.push(0x66bb6a); // Lluvia de flechas
      if (t.auraSpeed > 1.001) cols.push(0x4fc3f7);
      if (t.auraDmg > 1.001) cols.push(0xef5350);
      if (this.buffs.overload > 0 && t.type === 'ingeniero') cols.push(0xff7043);
      cols.forEach((c, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(this.now * 6 + i * 1.7);
        b.lineStyle(3, c, 0.55 + 0.4 * pulse);
        b.strokeCircle(t.x, t.y + 10, 30 + i * 5);
        b.fillStyle(c, 0.1 + 0.08 * pulse);
        b.fillCircle(t.x, t.y + 10, 30 + i * 5);
        for (let k = 0; k < 3; k++) {
          const ph = (this.now * 0.9 + k / 3 + i * 0.17 + t.x * 0.013) % 1; // chispa que sube y se desvanece
          a.fillStyle(c, 1 - ph);
          a.fillCircle(t.x + (k - 1) * 14 + (i - (cols.length - 1) / 2) * 6, t.y + 6 - ph * 38, 3 - ph);
        }
      });
    }

    // aro bajo las defensas: dorado con habilidad especial, plateado con muchas mejoras
    for (const t of this.towers) {
      const special = t.ups.B >= 4;
      const tot = this.total(t);
      if (special || tot >= 6) {
        b.lineStyle(3, special ? 0xffd700 : 0xc0c0c0, 0.9);
        b.strokeCircle(t.x, t.y + 10, 26);
      }
    }

    // flecha que indica por dónde entrarán los zombis (solo antes de la primera oleada)
    const showArrow = this.waveNo === 0 && !this.waveRunning && !this.ended;
    this.startTxt.setVisible(showArrow);
    if (showArrow) {
      // un poco después de la entrada, sobre el camino; si queda bajo el recuadro de vidas (arriba a la izquierda), se adelanta
      let d0 = 165;
      while (d0 < 700) {
        const q = this.posAt(d0, 0, 0);
        if (!(q.x < 250 && q.y < 120)) break;
        d0 += 30;
      }
      const p0 = this.posAt(d0, 0, 0);
      const p1 = this.posAt(d0 + 80, 0, 0);
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const bob = Math.sin(this.now * 5) * 9;
      const cx = p0.x + ca * bob;
      const cy = p0.y + sa * bob;
      a.fillStyle(0xff9800, 1);
      a.lineStyle(4, 0x4e2a00, 1);
      a.beginPath();
      a.moveTo(cx + ca * 40, cy + sa * 40); // punta
      a.lineTo(cx + ca * 8 - sa * 24, cy + sa * 8 + ca * 24);
      a.lineTo(cx + ca * 8 - sa * 10, cy + sa * 8 + ca * 10);
      a.lineTo(cx - ca * 34 - sa * 10, cy - sa * 34 + ca * 10);
      a.lineTo(cx - ca * 34 + sa * 10, cy - sa * 34 - ca * 10);
      a.lineTo(cx + ca * 8 + sa * 10, cy + sa * 8 - ca * 10);
      a.lineTo(cx + ca * 8 + sa * 24, cy + sa * 8 - ca * 24);
      a.closePath();
      a.fillPath();
      a.strokePath();
      this.startTxt.setPosition(Math.max(110, Math.min(this.WW - 110, cx)), cy < 80 ? cy + 50 : cy - 52);
    }

    // zonas
    for (const z of this.zones) {
      const col = z.pike ? 0xbcaaa4 : z.gold ? 0xffd700 : z.aura ? 0xfff2a8 : z.poison ? 0x76ff03 : 0x7bd36b;
      b.fillStyle(col, Math.min(0.35, z.life * 0.2));
      b.fillCircle(z.x, z.y, z.r);
      b.lineStyle(2, col, 0.8);
      b.strokeCircle(z.x, z.y, z.r);
    }

    // enemigos: estados (aros) y barra de vida
    for (const e of this.enemies) {
      if (e.dead) continue;
      const r = e.def.size * 0.55;
      if (e.goldUntil > this.now) {
        b.lineStyle(4, 0xffd700, 1);
        b.strokeCircle(e.x, e.y + 2, r + 2);
      }
      if (e.poisonUntil > this.now) {
        b.lineStyle(3, 0x76ff03, 1);
        b.strokeCircle(e.x, e.y + 2, r + 5);
      }
      if (e.frozenUntil > this.now) {
        b.lineStyle(4, 0xe0f7ff, 1);
        b.strokeCircle(e.x, e.y + 2, r + 3);
      } else if (e.slowUntil > this.now) {
        b.lineStyle(3, 0x4fc3f7, 1);
        b.strokeCircle(e.x, e.y + 2, r + 3);
      }
      if (e.burnUntil > this.now) {
        b.lineStyle(3, 0xff6d00, 1);
        b.strokeCircle(e.x, e.y + 2, r + 7);
      }
      const w = Math.max(30, r * 1.8);
      const yb = e.y - e.def.size * 0.85;
      a.fillStyle(0x000000, 0.7);
      a.fillRect(e.x - w / 2 - 1, yb - 1, w + 2, 7);
      a.fillStyle(e.def.boss ? 0xb71c1c : e.def.mini ? 0xff8f00 : 0xe53935, 1);
      a.fillRect(e.x - w / 2, yb, w * Math.max(0, e.hp / e.maxHp), 5);
    }

    // proyectiles
    for (const p of this.projectiles) {
      if (p.kind === 'arrow') {
        continue; // la flecha se dibuja con su sprite
      } else if (p.kind === 'orb') {
        if (p.nova) {
          a.fillStyle(0xfff2a8, 0.25);
          a.fillCircle(p.x, p.y, 60);
        }
        a.fillStyle(p.volc ? 0xff6d00 : p.nova ? 0xffe082 : 0x82b1ff, 1);
        a.fillCircle(p.x, p.y, p.nova || p.volc ? 13 : 8);
        a.fillStyle(0xffffff, 0.8);
        a.fillCircle(p.x, p.y, p.nova || p.volc ? 7 : 4);
      } else if (p.kind === 'frag') {
        // fragmento del Eco arcano: estela, halo y núcleo brillante
        const fc = Math.cos(p.ang), fs = Math.sin(p.ang);
        a.lineStyle(7, 0x7c4dff, 0.35);
        a.lineBetween(p.x - fc * 26, p.y - fs * 26, p.x, p.y);
        a.lineStyle(3, 0xe1bee7, 0.9);
        a.lineBetween(p.x - fc * 18, p.y - fs * 18, p.x, p.y);
        a.fillStyle(0x7c4dff, 0.35);
        a.fillCircle(p.x, p.y, 12);
        a.fillStyle(0xb388ff, 1);
        a.fillCircle(p.x, p.y, 7);
        a.fillStyle(0xffffff, 1);
        a.fillCircle(p.x, p.y, 3.5);
      } else if (p.kind === 'arcCharge') {
        // bola de magia que crece sobre la cabeza del Mago
        const k = Math.min(1, p.t / p.dur);
        const pulse = 0.5 + 0.5 * Math.sin(this.now * 10);
        const r = 6 + 16 * k;
        a.fillStyle(0x7c4dff, 0.25 + 0.15 * pulse);
        a.fillCircle(p.x, p.y, r * 1.9);
        a.fillStyle(0xab47bc, 0.95);
        a.fillCircle(p.x, p.y, r);
        a.fillStyle(0xe1bee7, 1);
        a.fillCircle(p.x - r * 0.25, p.y - r * 0.25, r * 0.5);
        a.fillStyle(0xffffff, 1);
        a.fillCircle(p.x - r * 0.3, p.y - r * 0.3, r * 0.2);
        for (let i = 0; i < 6; i++) {
          const an = this.now * 4 + (i * Math.PI) / 3;
          const rr = r * 1.5 + 4 * Math.sin(this.now * 7 + i);
          a.fillStyle(0xffffff, 0.85);
          a.fillCircle(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr * 0.7, 2);
        }
      } else if (p.kind === 'arcFrag') {
        for (const q of p.trail) {
          if (q.life <= 0) continue;
          a.fillStyle(0xffffff, Math.min(1, q.life * 1.8));
          a.fillCircle(q.x, q.y, 1 + 3 * q.life);
        }
        a.fillStyle(0x7c4dff, 0.35);
        a.fillCircle(p.x, p.y, 16);
        a.fillStyle(0xab47bc, 1);
        a.fillCircle(p.x, p.y, 9);
        a.fillStyle(0xf3e5f5, 1);
        a.fillCircle(p.x - 2, p.y - 2, 4);
      } else if (p.kind === 'potion') {
        a.fillStyle(p.gold ? 0xffd700 : 0x8e24aa, 1);
        a.fillCircle(p.x, p.y, p.big ? 14 : 8);
      }
    }

    this.ntDraw(a, b); // defensas nuevas: trampas, torretas, proyectiles y efectos propios

    // efectos
    for (const f of this.effects) {
      const k = Math.max(0, f.life / f.max);
      if (f.kind === 'cone') {
        a.fillStyle(f.multi ? 0xffd23f : 0xffffff, 0.45 * k);
        if (f.full) {
          a.fillCircle(f.x, f.y, f.range);
        } else {
          a.beginPath();
          a.moveTo(f.x, f.y);
          const n = 10;
          for (let i = 0; i <= n; i++) {
            const an = f.ang - Math.PI * 0.2 + (i / n) * (Math.PI * 0.4); // cono de 72º
            a.lineTo(f.x + Math.cos(an) * f.range, f.y + Math.sin(an) * f.range);
          }
          a.closePath();
          a.fillPath();
        }
      } else if (f.kind === 'ring') {
        a.lineStyle(4, f.color, k);
        a.strokeCircle(f.x, f.y, f.r * (1 - 0.3 * k));
      } else if (f.kind === 'bolt' && f.jag) {
        // rayo eléctrico: zigzag que cambia cada fotograma, con halo
        const n = 7;
        const dx = f.x2 - f.x, dy = f.y2 - f.y;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len, py = dx / len;
        const pts = [[f.x, f.y]];
        for (let i = 1; i < n; i++) {
          const off = (Math.random() - 0.5) * Math.min(26, len * 0.25);
          pts.push([f.x + (dx * i) / n + px * off, f.y + (dy * i) / n + py * off]);
        }
        pts.push([f.x2, f.y2]);
        for (const [w, col, al] of [[9, f.color || 0x81d4fa, 0.25 * k], [4, f.color || 0x81d4fa, k], [1.5, 0xffffff, k]]) {
          a.lineStyle(w, col, al);
          a.beginPath();
          a.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) a.lineTo(pts[i][0], pts[i][1]);
          a.strokePath();
        }
      } else if (f.kind === 'bolt') {
        a.lineStyle(4, f.color || 0xfff176, k);
        a.lineBetween(f.x, f.y, f.x2, f.y2);
      } else if (f.kind === 'arrowrain') {
        // flechas que caen del cielo en diagonal, se clavan y se desvanecen
        const el = f.max - f.life;
        for (const ar of f.arrows || [{ dx: 0, dy: 0, delay: 0 }]) {
          const u = Math.max(0, Math.min(1, (el - ar.delay) / 0.4)); // caída: 0,4 s
          if (el < ar.delay) continue;
          const tx = f.x + ar.dx, ty = f.y + ar.dy;
          const hx = tx - 70 * (1 - u), hy = ty - 220 * (1 - u); // punta de la flecha
          const len = 30;
          const nx = 70 / Math.hypot(70, 220), ny = 220 / Math.hypot(70, 220);
          const alpha = u < 1 ? 1 : Math.max(0, Math.min(1, f.life / 0.5));
          a.lineStyle(3, 0x6d4c41, alpha); // asta
          a.lineBetween(hx - nx * len, hy - ny * len, hx, hy);
          a.fillStyle(0xcfd8dc, alpha); // punta
          a.fillTriangle(hx + nx * 6, hy + ny * 6, hx - nx * 3 - ny * 4, hy - ny * 3 + nx * 4, hx - nx * 3 + ny * 4, hy - ny * 3 - nx * 4);
          a.lineStyle(2, 0xffffff, alpha); // plumas
          const fx0 = hx - nx * len, fy0 = hy - ny * len;
          a.lineBetween(fx0, fy0, fx0 - ny * 5 - nx * 5, fy0 + nx * 5 - ny * 5);
          a.lineBetween(fx0, fy0, fx0 + ny * 5 - nx * 5, fy0 - nx * 5 - ny * 5);
          if (u >= 1 && f.life > 0.6) {
            a.fillStyle(0x8d6e63, 0.5 * alpha); // polvo al clavarse
            a.fillCircle(tx, ty + 2, 5);
          }
        }
      } else if (f.kind === 'meteor') {
        a.fillStyle(0xff5722, 0.9);
        a.fillCircle(f.x, f.y - 160 * k, 16);
        a.lineStyle(2, 0xff5722, 0.4);
        a.strokeCircle(f.x, f.y, f.r);
      }
    }
  }
}

// Defensas nuevas: Lancero, Monje, Ingeniero, Maestro de asedio, Rey Midas y Nigromante
Object.assign(GameScene.prototype, NewTowers);











