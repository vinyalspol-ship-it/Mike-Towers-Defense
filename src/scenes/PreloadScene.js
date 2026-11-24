import Phaser from 'phaser';
import { W, H, FONT, COL } from '../config.js';
import { loadArt, registerAnims } from '../art.js';
import { loadMusic, startMusic } from '../music.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.add.rectangle(0, 0, W, H, 0x2e1c0f).setOrigin(0, 0);
    this.add
      .text(W / 2, H / 2 - 50, 'Cargando…', { fontFamily: FONT, fontSize: '32px', color: COL.cream })
      .setOrigin(0.5);
    const frame = this.add.rectangle(W / 2, H / 2 + 10, 440, 28, 0x000000, 0.4).setStrokeStyle(3, COL.woodLight);
    const bar = this.add.rectangle(W / 2 - 216, H / 2 + 10, 4, 18, 0xffd23f).setOrigin(0, 0.5);
    this.load.on('progress', (p) => (bar.width = Math.max(4, 432 * p)));
    loadArt(this);
    loadMusic(this);
  }

  create() {
    registerAnims(this);
    startMusic(this);
    this.scene.start('Menu');
  }
}

