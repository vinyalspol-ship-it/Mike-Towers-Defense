import Phaser from 'phaser';
import { W, H, FONT, COL } from '../config.js';
import { makeButton } from '../ui.js';
import { musicOn, toggleMusic, bindMusicKey } from '../music.js';
import { addFullscreenButton } from '../fullscreen.js';

// Pantalla de inicio: fondo, logo y botón PLAY (imágenes aportadas por el usuario). PLAY lleva al selector de niveles.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    // fondo: llena la pantalla (cover) y se acerca muy despacio
    const bg = this.add.image(W / 2, H / 2, 'title_bg').setDepth(0);
    const base = Math.max(W / bg.width, H / bg.height);
    bg.setScale(base);
    this.tweens.add({ targets: bg, scale: base * 1.06, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // oscurece un poco los bordes para que el logo destaque
    this.add.rectangle(0, H - 70, W, 70, 0x000000, 0.38).setOrigin(0, 0).setDepth(1);

    // brasas / luciérnagas que suben despacio
    for (let i = 0; i < 26; i++) {
      const x = Phaser.Math.Between(0, W);
      const y0 = Phaser.Math.Between(H * 0.45, H);
      const dot = this.add.circle(x, y0, Phaser.Math.FloatBetween(1.5, 3.2), i % 3 ? 0xffc34d : 0xb9f56a, 0).setDepth(2);
      const rise = () => {
        dot.setPosition(Phaser.Math.Between(0, W), Phaser.Math.Between(H * 0.5, H));
        this.tweens.add({
          targets: dot,
          y: dot.y - Phaser.Math.Between(140, 320),
          x: dot.x + Phaser.Math.Between(-50, 50),
          alpha: { from: 0, to: 0.85 },
          yoyo: true,
          duration: Phaser.Math.Between(2500, 5000),
          delay: Phaser.Math.Between(0, 3000),
          onComplete: rise,
        });
      };
      rise();
    }

    // logo (flota suavemente)
    const logo = this.add.image(W / 2, 244, 'title_logo').setDepth(5);
    logo.setScale(580 / logo.width);
    this.tweens.add({ targets: logo, y: logo.y - 8, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // botón PLAY (late; al pasar el ratón se ilumina)
    const play = this.add.image(W / 2, 566, 'title_play').setDepth(6);
    const ps = 310 / play.width;
    play.setScale(ps);
    const pulse = this.tweens.add({ targets: play, scale: ps * 1.06, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    play.setInteractive({ useHandCursor: true });
    play.on('pointerover', () => play.setTint(0xfff2b0));
    play.on('pointerout', () => play.clearTint());
    const go = () => {
      if (this.leaving) return;
      this.leaving = true;
      pulse.stop();
      this.tweens.add({ targets: play, scale: ps * 0.92, duration: 90, yoyo: true });
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    };
    play.on('pointerdown', go);
    this.input.keyboard.on('keydown-ENTER', go);
    this.input.keyboard.on('keydown-SPACE', go);
    this.cameras.main.fadeIn(350, 0, 0, 0);

    // música y pantalla completa (esquina superior derecha, como en el selector de niveles)
    const mus = makeButton(this, W - 62, 8, 52, 38, '', () => paintMusic(toggleMusic(this)), { fill: 0x5b4636, depth: 20 });
    const musIcon = this.add.image(W - 36, 27, 'ui_icons', 5).setScale(2.4).setDepth(22);
    const paintMusic = (on) => musIcon.setFrame(on ? 5 : 8).setAlpha(on ? 1 : 0.7);
    paintMusic(musicOn());
    bindMusicKey(this, paintMusic);
    addFullscreenButton(this, W - 62 - 58, 8, 52, 38, 20);

    this.add
      .text(W / 2, H - 22, 'Toca PLAY para empezar', { fontFamily: FONT, fontSize: '16px', color: COL.cream, stroke: '#1b1209', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(6);
  }
}
