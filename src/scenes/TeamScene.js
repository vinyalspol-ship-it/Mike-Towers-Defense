import Phaser from 'phaser';
import { W, H, FONT, EMOJI_FONT, COL } from '../config.js';
import { TOWERS, TOWER_ORDER } from '../data/towers.js';
import { towerUnlocked, maxSlots } from '../data/tree.js';
import { TOWER_ART } from '../towerArt.js';
import { infoIcon, hideTip } from '../ui.js';
import { glossaryFor } from '../data/glossary.js';
import { load, save } from '../storage.js';
import { makeButton, title, woodPanel } from '../ui.js';

// Equipo: se eligen las defensas (distintas) que se llevan a la próxima batalla. Se guarda como "últimas usadas".
export default class TeamScene extends Phaser.Scene {
  constructor() {
    super('Team');
  }

  create() {
    const sv = load();
    this.sv = sv;
    this.max = maxSlots(sv);
    // equipo guardado (solo defensas desbloqueadas); si no hay, las primeras desbloqueadas
    let team = (sv.team || []).filter((id) => towerUnlocked(sv, id)).slice(0, this.max);
    if (!team.length) team = TOWER_ORDER.filter((id) => towerUnlocked(sv, id)).slice(0, this.max);
    this.team = team;
    this.persist();

    for (let c = 0; c < 20; c++) for (let r = 0; r < 12; r++) this.add.image(c * 64, r * 64, 'grass', 10).setOrigin(0, 0).setDepth(0);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0, 0).setDepth(1);
    title(this, W / 2, 46, '⚔ Equipo de batalla', 40).setDepth(12);
    makeButton(this, 14, 14, 130, 42, '← Menú', () => this.scene.start('Menu'), { fontSize: 18, depth: 12 });
    makeButton(this, W - 214, 14, 200, 42, 'Códice', () => this.scene.start('Codex'), { fontSize: 18, fill: 0x6c3483, depth: 12, leftIcon: 'ic_book' });

    this.info = this.add.text(W / 2, 100, '', { fontFamily: EMOJI_FONT, fontSize: '20px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(12);
    this.cards = [];
    this.drawCards();
    this.drawTeamStrip();
    this.add
      .text(W / 2, H - 18, 'En cada nivel solo estarán los héroes que ese nivel permita. Los espacios extra se desbloquean con cerebros en el árbol de mejoras.', {
        fontFamily: FONT, fontSize: '14px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(12);
  }

  persist() {
    this.sv.team = [...this.team];
    save();
  }

  toggle(id) {
    if (!towerUnlocked(this.sv, id)) {
      this.say('🔒 Desbloquea a ese héroe en el árbol de mejoras');
      return;
    }
    const i = this.team.indexOf(id);
    if (i >= 0) this.team.splice(i, 1);
    else if (this.team.length >= this.max) {
      this.say(`Equipo lleno (${this.max}). Quita a un héroe o desbloquea más espacios en el árbol.`);
      return;
    } else this.team.push(id);
    this.persist();
    this.drawCards();
    this.drawTeamStrip();
  }

  say(msg) {
    this.msg = msg;
    this.refreshInfo();
    this.time.delayedCall(2200, () => {
      this.msg = '';
      this.refreshInfo();
    });
  }

  refreshInfo() {
    this.info.setText(this.msg || `Héroes elegidos: ${this.team.length}/${this.max}   (toca a un héroe para llevarlo o quitarlo)`);
  }

  drawCards() {
    hideTip();
    this.cards.forEach((o) => o.destroy());
    this.cards = [];
    this.refreshInfo();
    TOWER_ORDER.forEach((id, i) => {
      const def = TOWERS[id];
      const art = TOWER_ART[id];
      const open = towerUnlocked(this.sv, id);
      const pos = this.team.indexOf(id);
      const x = 40 + (i % 6) * 206;
      const y = 134 + Math.floor(i / 6) * 178;
      const bg = this.add.rectangle(x, y, 196, 168, pos >= 0 ? 0x2f6f4a : open ? 0x6b4a2b : 0x3a342e).setOrigin(0, 0).setStrokeStyle(pos >= 0 ? 4 : 3, pos >= 0 ? 0xffd23f : COL.woodDark).setDepth(10);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.toggle(id));
      const icon = this.add.image(x + 46, y + 52, art.avatar).setDepth(11).setTint(art.tint ?? 0xffffff);
      icon.setScale(64 / icon.width).setAlpha(open ? 1 : 0.45);
      const st = { fontFamily: FONT, color: COL.cream, stroke: '#2e1c0f', strokeThickness: 3 };
      const name = this.add.text(x + 86, y + 14, def.name, { ...st, fontSize: '17px', wordWrap: { width: 104 } }).setDepth(11).setAlpha(open ? 1 : 0.6);
      const costIcon = this.add.image(x + 96, y + 68, 'icon_01').setDisplaySize(20, 20).setDepth(11).setAlpha(open ? 1 : 0.6);
      const cost = this.add.text(x + 112, y + 58, `${def.cost}`, { ...st, fontFamily: EMOJI_FONT, fontSize: '16px', color: '#ffd23f' }).setDepth(11).setAlpha(open ? 1 : 0.6);
      const desc = this.add.text(x + 12, y + 94, open ? def.desc : '🔒 Desbloquéala en el árbol de mejoras', { ...st, fontFamily: EMOJI_FONT, fontSize: '13px', wordWrap: { width: 176 } }).setDepth(11).setAlpha(open ? 1 : 0.7);
      const objs = [bg, icon, name, cost, costIcon, desc];
      const gl = open ? glossaryFor(def.desc) : [];
      if (gl.length) objs.push(...infoIcon(this, x + 180, y + 66, gl, 13)); // "i": aclara términos de la descripción
      if (pos >= 0) objs.push(this.add.text(x + 188, y + 136, `✔${pos + 1}`, { ...st, fontSize: '20px', color: '#ffd23f' }).setOrigin(1, 0).setDepth(12));
      this.cards.push(...objs);
    });
  }

  drawTeamStrip() {
    (this.strip || []).forEach((o) => o.destroy());
    this.strip = [];
    const y = 502;
    const label = this.add.text(40, y - 6, 'Tu equipo:', { fontFamily: FONT, fontSize: '20px', color: '#ffd23f', stroke: '#2e1c0f', strokeThickness: 4 }).setDepth(12);
    this.strip.push(label);
    for (let i = 0; i < 6; i++) {
      const id = this.team[i];
      const unlockedSlot = i < this.max;
      const x = 160 + i * 150;
      const bg = this.add.rectangle(x, y - 14, 140, 58, id ? 0x2f6f4a : unlockedSlot ? 0x4a3b2e : 0x2a2420).setOrigin(0, 0).setStrokeStyle(3, id ? 0xffd23f : COL.woodDark).setDepth(10);
      this.strip.push(bg);
      if (id) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.toggle(id));
        const ic = this.add.image(x + 26, y + 15, TOWER_ART[id].avatar).setDepth(11).setTint(TOWER_ART[id].tint ?? 0xffffff);
        ic.setScale(40 / ic.width);
        const tx = this.add.text(x + 52, y + 4, TOWERS[id].name, { fontFamily: FONT, fontSize: '14px', color: COL.cream, stroke: '#2e1c0f', strokeThickness: 3, wordWrap: { width: 84 } }).setDepth(11);
        this.strip.push(ic, tx);
      } else {
        const tx = this.add.text(x + 70, y + 15, unlockedSlot ? 'libre' : '🔒 árbol', { fontFamily: EMOJI_FONT, fontSize: '14px', color: '#b8a98c' }).setOrigin(0.5).setDepth(11);
        this.strip.push(tx);
      }
    }
  }
}
