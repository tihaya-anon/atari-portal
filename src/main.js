import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { BootScene } from './ui/BootScene.js';
import { MenuScene } from './ui/MenuScene.js';
import { HUDScene } from './ui/HUDScene.js';
import { PauseScene } from './ui/PauseScene.js';
import { GameOverScene } from './ui/GameOverScene.js';
import { TransitionScene } from './ui/TransitionScene.js';
import { VictoryScene } from './ui/VictoryScene.js';
import { CRTOverlay } from './vfx/CRTOverlay.js';
import { ModSelectScene } from './ui/ModSelectScene.js';
import { CheatMenuScene } from './ui/CheatMenuScene.js';
import { PacmanScene } from './games/pacman/PacmanScene.js';
import { BreakoutScene } from './games/breakout/BreakoutScene.js';
import { SpaceInvadersScene } from './games/space-invaders/SpaceInvadersScene.js';
import { FroggerScene } from './games/frogger/FroggerScene.js';
import { AsteroidsScene } from './games/asteroids/AsteroidsScene.js';
import { TetrisScene } from './games/tetris/TetrisScene.js';
import AudioBackground from './vfx/AudioBackground.js';
import { SnakeGame } from './games/snake/SnakeGame.js';
import { PinballScene } from './games/pinball/PinballScene.js';
import { FallDownScene } from './games/falldown/FallDownScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: document.body,
  backgroundColor: '#0a0a1a',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    MenuScene,
    HUDScene,
    PauseScene,
    GameOverScene,
    TransitionScene,
    VictoryScene,
    CRTOverlay,
    ModSelectScene,
    CheatMenuScene,
    PacmanScene,
    BreakoutScene,
    SpaceInvadersScene,
    FroggerScene,
    AsteroidsScene,
    TetrisScene,
    SnakeGame,
    PinballScene,
    FallDownScene,
  ]
};

new Phaser.Game(config);
AudioBackground.init();
