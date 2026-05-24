import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import NeonGlow from '../vfx/NeonGlow.js';
import AudioBackground from '../vfx/AudioBackground.js';

const cyan = '#00f0ff';
const magenta = '#ff00e6';
const green = '#39ff14';

export class ModSelectScene extends Phaser.Scene {
  constructor() {
    super('ModSelectScene');
  }

  create(data) {
    this.toScene = data.to;
    this.fromScene = data.from;
    this._sleepOverlay('HUDScene');
    this._sleepOverlay('CRTOverlay');
    this.scene.bringToTop();
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    this.cameras.main.fadeIn(400);
    AudioBackground.setScene('ModSelectScene');

    this.drawGridBackground();

    const title = this.add.text(GAME_WIDTH / 2, 60, 'MOD SELECT', {
      fontSize: '28px', fontFamily: 'monospace', color: cyan,
    }).setOrigin(0.5);
    NeonGlow.applyTextGlow(this, title, COLORS.NEON_CYAN);

    this.add.text(GAME_WIDTH / 2, 95, 'Choose an upgrade for your run', {
      fontSize: '12px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5);

    const modSystem = GameManager.modSystem;
    const choices = modSystem.getRandomChoices(3);
    const forcedModId = GameManager.consumeNextModCheat();
    if (forcedModId) {
      const forcedMod = modSystem.getModById(forcedModId);
      const alreadyOwned = forcedMod && modSystem.hasMod(forcedMod.id);
      if (forcedMod && !alreadyOwned) {
        const existingIdx = choices.findIndex(choice => choice.id === forcedMod.id);
        if (existingIdx > 0) {
          choices.splice(existingIdx, 1);
          choices.unshift(forcedMod);
        } else if (existingIdx < 0) {
          choices.pop();
          choices.unshift(forcedMod);
        }
      }
    }

    const cardWidth = 200;
    const cardHeight = 220;
    const spacing = 30;
    const totalWidth = choices.length * cardWidth + (choices.length - 1) * spacing;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    choices.forEach((mod, i) => {
      const cx = startX + i * (cardWidth + spacing) + cardWidth / 2;
      const cy = 280;

      this.createModCard(cx, cy, cardWidth, cardHeight, mod);
    });

    const skipBtn = this.add.text(GAME_WIDTH / 2, 480, '> SKIP', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipBtn.on('pointerover', () => skipBtn.setColor(cyan));
    skipBtn.on('pointerout', () => skipBtn.setColor('#555577'));
    skipBtn.on('pointerdown', () => this.proceed());

    this.drawActiveMods();
  }

  createModCard(cx, cy, w, h, mod) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.HUD_BG, 0.9);
    g.fillRect(cx - w / 2, cy - h / 2, w, h);
    NeonGlow.strokeRect(g, cx - w / 2, cy - h / 2, w, h, COLORS.NEON_CYAN, 1, 0.4);

    const categoryColors = {
      offensive: COLORS.NEON_RED,
      defensive: COLORS.NEON_BLUE,
      utility: COLORS.NEON_GREEN,
      chaos: COLORS.NEON_MAGENTA,
    };
    const catColor = categoryColors[mod.category] || COLORS.NEON_CYAN;
    const catHex = '#' + catColor.toString(16).padStart(6, '0');

    this.add.text(cx, cy - h / 2 + 20, mod.category.toUpperCase(), {
      fontSize: '9px', fontFamily: 'monospace', color: catHex,
    }).setOrigin(0.5);

    try {
      const icon = this.add.image(cx, cy - 20, mod.icon).setDisplaySize(32, 32).setTint(catColor);
    } catch (_) {}

    const nameText = this.add.text(cx, cy + 20, mod.name, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);
    NeonGlow.applyTextGlow(this, nameText, catColor);

    this.add.text(cx, cy + 50, mod.description, {
      fontSize: '10px', fontFamily: 'monospace', color: '#888899',
      wordWrap: { width: w - 20 },
      align: 'center',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(cx, cy, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      g.clear();
      g.fillStyle(COLORS.HUD_BG, 0.9);
      g.fillRect(cx - w / 2, cy - h / 2, w, h);
      NeonGlow.strokeRect(g, cx - w / 2, cy - h / 2, w, h, catColor, 2, 0.8);
    });

    hitArea.on('pointerout', () => {
      g.clear();
      g.fillStyle(COLORS.HUD_BG, 0.9);
      g.fillRect(cx - w / 2, cy - h / 2, w, h);
      NeonGlow.strokeRect(g, cx - w / 2, cy - h / 2, w, h, COLORS.NEON_CYAN, 1, 0.4);
    });

    hitArea.on('pointerdown', () => {
      SFX.shopBuy();
      this.selectMod(mod);
    });
  }

  selectMod(mod) {
    const result = GameManager.modSystem.addMod(mod);
    if (result && result.immediate === 'extra_life') {
      GameManager.state.lives++;
    }
    this.proceed();
  }

  proceed() {
    this.cameras.main.fadeOut(300, 10, 10, 26);
    this.time.delayedCall(350, () => {
      this.scene.start('TransitionScene', { from: this.fromScene, to: this.toScene });
    });
  }

  drawActiveMods() {
    const mods = GameManager.modSystem.activeMods;
    if (mods.length === 0) return;

    this.add.text(GAME_WIDTH / 2, 520, 'ACTIVE MODS:', {
      fontSize: '10px', fontFamily: 'monospace', color: '#444466',
    }).setOrigin(0.5);

    const names = mods.map(m => m.name).join(' | ');
    this.add.text(GAME_WIDTH / 2, 540, names, {
      fontSize: '10px', fontFamily: 'monospace', color: '#666688',
    }).setOrigin(0.5);
  }

  _sleepOverlay(key) {
    try {
      if (this.scene.isActive(key)) {
        this.scene.sleep(key);
      }
    } catch (_) { /* safe */ }
  }

  drawGridBackground() {
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.GRID_LINE, 0.2);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, GAME_HEIGHT));
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
    }
  }
}
