import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { GameLevel } from './types';

export const createPhaserGame = (parent: string, level: GameLevel, onExit: () => void): Phaser.Game => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#0f172a',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    }
  };

  const game = new Phaser.Game(config);
  
  // Start the game scene directly with level data
  game.scene.start('GameScene', { level, onExit });

  return game;
};
