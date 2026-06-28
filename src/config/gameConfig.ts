import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';
import { TitleScene } from '../scenes/TitleScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#020307',
  scene: [TitleScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
