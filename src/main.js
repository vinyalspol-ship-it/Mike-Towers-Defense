import Phaser from 'phaser';
import { W, H } from './config.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import TreeScene from './scenes/TreeScene.js';
import GameScene from './scenes/GameScene.js';
import TeamScene from './scenes/TeamScene.js';
import CodexScene from './scenes/CodexScene.js';
import TitleScene from './scenes/TitleScene.js';

// Textos más nítidos: se generan a más resolución (según la pantalla, entre x2 y x3) y con suavizado,
// aunque el resto del juego use el modo pixel art (sin suavizado). Afecta a todos los this.add.text().
const TEXT_RES = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  const t = addText.call(this, x, y, text, { ...(style || {}), resolution: TEXT_RES });
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return t;
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#2e1c0f',
  pixelArt: true, // sin suavizado: el pixel art se ve nítido
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [PreloadScene, TitleScene, MenuScene, TreeScene, GameScene, TeamScene, CodexScene],
});

// Útil para depurar desde la consola del navegador
window.__game = game;

