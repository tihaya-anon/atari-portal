import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import { DemoDirector } from '../core/DemoDirector.js';
import SFX from '../core/SFXManager.js';
import BGM from '../core/AudioManager.js';
import NeonGlow from '../vfx/NeonGlow.js';
import AudioBackground from '../vfx/AudioBackground.js';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create() {
    try { this.scene.stop('HUDScene'); } catch (_) {}
    try { this.scene.stop('CRTOverlay'); } catch (_) {}
    this.scene.bringToTop();
    GameManager.saveHighScore();
    SFX.victory();
    BGM.playForScene(this, 'VictoryScene');
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    AudioBackground.setScene('VictoryScene');

    const title = this.add.text(GAME_WIDTH / 2, 130, 'SYSTEM RESTORED', {
      fontSize: '40px', fontFamily: 'monospace', color: '#39ff14',
    }).setOrigin(0.5);
    NeonGlow.applyTextGlow(this, title, COLORS.NEON_GREEN);

    this.add.text(GAME_WIDTH / 2, 195, 'The rift has been sealed. All sectors stable.', {
      fontSize: '14px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 270, `FINAL SCORE: ${String(GameManager.state.totalScore).padStart(7, '0')}`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 315, `PORTALS: ${GameManager.state.gamesCompleted.length}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5);

    for (let i = 0; i < 60; i++) {
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_GREEN, COLORS.NEON_PURPLE][i % 4];
      const p = this.add.circle(
        GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40,
        Math.random() * 2.5 + 0.5,
        color, 0.8
      );
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 250;
      this.tweens.add({
        targets: p,
        x: GAME_WIDTH / 2 + Math.cos(angle) * dist,
        y: GAME_HEIGHT / 2 - 40 + Math.sin(angle) * dist,
        alpha: 0,
        duration: 2000 + Math.random() * 1500,
        delay: Math.random() * 500,
        repeat: -1,
      });
    }

    const menuBtn = this.add.text(GAME_WIDTH / 2, 430, '> RETURN TO MENU', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => menuBtn.setColor('#00f0ff'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerdown', () => {
      this.scene.stop('HUDScene');
      this.scene.stop('CRTOverlay');
      this.scene.start('MenuScene');
    });

    if (DemoDirector.autoRestart) {
      this.time.delayedCall(DemoDirector.victoryDelayMs, () => {
        if (!this.scene.isActive('VictoryScene')) return;
        this.scene.stop('HUDScene');
        this.scene.stop('CRTOverlay');
        this.scene.start('MenuScene');
      });
    }
  }
}
