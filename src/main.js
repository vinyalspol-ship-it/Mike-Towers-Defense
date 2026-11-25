import Phaser from 'phaser';
import { W, H } from './config.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import TreeScene from './scenes/TreeScene.js';
import GameScene from './scenes/GameScene.js';
import TeamScene from './scenes/TeamScene.js';
import CodexScene from './scenes/CodexScene.js';
import TitleScene from './scenes/TitleScene.js';

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

