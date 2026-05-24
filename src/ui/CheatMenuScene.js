import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ORDER, GAME_NAMES, HACK_CONFIG } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import { MutationSystem } from '../core/MutationSystem.js';
import { ModSystem } from '../core/ModSystem.js';
import NeonGlow from '../vfx/NeonGlow.js';

const cyan = '#00f0ff';
const magenta = '#ff00e6';
const green = '#39ff14';
const orange = '#ff6e00';
const muted = '#67708f';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class CheatMenuScene extends Phaser.Scene {
  constructor() {
    super('CheatMenuScene');
  }

  create(data) {
    this.parentScene = data.parentScene || null;
    this.scene.bringToTop();

    this.state = this._buildMenuState();
    this.selectedIndex = 0;
    this.editingKey = null;
    this.editBuffer = '';

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78);

    const frame = this.add.graphics();
    frame.fillStyle(COLORS.HUD_BG, 0.95);
    frame.fillRect(90, 60, 620, 480);
    NeonGlow.strokeRect(frame, 90, 60, 620, 480, COLORS.NEON_CYAN, 1, 0.45);
    NeonGlow.cornerAccents(frame, 90, 60, 620, 480, 18, COLORS.NEON_CYAN, 2);

    const title = this.add.text(GAME_WIDTH / 2, 92, 'CHEAT CONSOLE', {
      fontSize: '28px', fontFamily: 'monospace', color: cyan,
    }).setOrigin(0.5);
    NeonGlow.applyTextGlow(this, title, COLORS.NEON_CYAN);

    this.add.text(GAME_WIDTH / 2, 124, 'UP/DOWN select  option rows use LEFT/RIGHT  number rows type directly  ENTER apply  ESC close', {
      fontSize: '10px', fontFamily: 'monospace', color: muted,
    }).setOrigin(0.5);

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 510, '', {
      fontSize: '12px', fontFamily: 'monospace', color: green,
    }).setOrigin(0.5);

    this.rows = [];
    this._createRows();
    this._bindKeys();
    this.render();
  }

  _buildMenuState() {
    const mutationIds = ['NONE', ...MutationSystem.getMutationList().map(m => m.id)];
    const modIds = ['NONE', ...ModSystem.getAllMods().map(m => m.id)];
    const sceneIds = [...GAME_ORDER];
    const defaultScene = sceneIds[clamp(GameManager.state.currentGameIndex + 1, 0, sceneIds.length - 1)];

    return {
      nextSceneIndex: Math.max(0, sceneIds.indexOf(GameManager.cheats.nextSceneKey || defaultScene)),
      nextMutationIndex: Math.max(0, mutationIds.indexOf(GameManager.cheats.nextMutationId || 'NONE')),
      nextModIndex: Math.max(0, modIds.indexOf(GameManager.cheats.nextModId || 'NONE')),
      coins: GameManager.state.coins,
      lives: GameManager.state.lives,
      score: GameManager.state.totalScore,
      difficulty: Number((GameManager.state.difficulty || 1).toFixed(2)),
      hackCharge: GameManager.state.hackCharge || 0,
      portalTokens: GameManager.state.portalTokens || 0,
      options: { sceneIds, mutationIds, modIds },
    };
  }

  _createRows() {
    const leftX = 130;
    const valueX = 430;
    const startY = 170;
    const gap = 38;
    const defs = [
      { key: 'nextSceneIndex', label: 'NEXT SCENE', step: 1, min: 0, max: this.state.options.sceneIds.length - 1, kind: 'option' },
      { key: 'nextMutationIndex', label: 'NEXT MUTATION', step: 1, min: 0, max: this.state.options.mutationIds.length - 1, kind: 'option' },
      { key: 'nextModIndex', label: 'NEXT MOD OFFER', step: 1, min: 0, max: this.state.options.modIds.length - 1, kind: 'option' },
      { key: 'coins', label: 'COINS', step: 5, min: 0, max: 9999, kind: 'number' },
      { key: 'lives', label: 'LIVES', step: 1, min: 0, max: 99, kind: 'number' },
      { key: 'score', label: 'SCORE', step: 100, min: 0, max: 9999999, kind: 'number' },
      { key: 'difficulty', label: 'DIFFICULTY', step: 0.25, min: 0.25, max: 10, kind: 'float' },
      { key: 'hackCharge', label: 'HACK CHARGE', step: 10, min: 0, max: HACK_CONFIG.MAX_CHARGE, kind: 'number' },
      { key: 'portalTokens', label: 'PORTAL TOKENS', step: 1, min: 0, max: 99, kind: 'number' },
    ];

    defs.forEach((def, index) => {
      const y = startY + index * gap;
      const label = this.add.text(leftX, y, def.label, {
        fontSize: '15px', fontFamily: 'monospace', color: muted,
      });
      const value = this.add.text(valueX, y, '', {
        fontSize: '15px', fontFamily: 'monospace', color: '#ffffff',
      });
      const marker = this.add.text(leftX - 22, y, '>', {
        fontSize: '15px', fontFamily: 'monospace', color: orange,
      }).setVisible(false);
      this.rows.push({ ...def, label, value, marker });
    });
  }

  _bindKeys() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    });
    this.input.keyboard.on('keydown', this._handleTextInput, this);
  }

  _optionText(row) {
    if (row.key === 'nextSceneIndex') {
      const sceneKey = this.state.options.sceneIds[this.state[row.key]];
      return `${GAME_NAMES[sceneKey] || sceneKey} [${sceneKey}]`;
    }
    if (row.key === 'nextMutationIndex') {
      const mutationId = this.state.options.mutationIds[this.state[row.key]];
      return mutationId === 'NONE' ? 'RANDOM' : mutationId;
    }
    if (row.key === 'nextModIndex') {
      const modId = this.state.options.modIds[this.state[row.key]];
      if (modId === 'NONE') return 'RANDOM';
      const mod = GameManager.modSystem.getModById(modId);
      return mod ? `${mod.name} [${mod.id}]` : modId;
    }
    return '';
  }

  _changeValue(direction) {
    const row = this.rows[this.selectedIndex];
    if (row.kind !== 'option') return;
    const current = this.state[row.key];
    const step = row.step * direction;

    if (row.kind === 'option') {
      this.state[row.key] = clamp(current + step, row.min, row.max);
    }
    this.render();
  }

  _startEditing(row) {
    if (row.kind === 'option') return;
    if (this.editingKey !== row.key) {
      this.editingKey = row.key;
      this.editBuffer = String(this.state[row.key]);
    }
  }

  _finishEditing() {
    if (!this.editingKey) return;
    const row = this.rows.find(item => item.key === this.editingKey);
    if (!row) {
      this.editingKey = null;
      this.editBuffer = '';
      return;
    }

    const raw = this.editBuffer.trim();
    if (raw !== '' && raw !== '.' && raw !== '-') {
      const parsed = row.kind === 'float' ? Number(raw) : parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        this.state[row.key] = row.kind === 'float'
          ? clamp(Number(parsed.toFixed(2)), row.min, row.max)
          : clamp(parsed, row.min, row.max);
      }
    }

    this.editingKey = null;
    this.editBuffer = '';
    this.render();
  }

  _handleTextInput(event) {
    const row = this.rows[this.selectedIndex];
    if (!row || row.kind === 'option') return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (event.key === 'Backspace') {
      this._startEditing(row);
      this.editBuffer = this.editBuffer.slice(0, -1);
      this.render();
      return;
    }

    if (event.key === '-' && row.min < 0) {
      this._startEditing(row);
      if (!this.editBuffer.includes('-')) {
        this.editBuffer = this.editBuffer ? `-${this.editBuffer.replace('-', '')}` : '-';
        this.render();
      }
      return;
    }

    if (event.key === '.' && row.kind === 'float') {
      this._startEditing(row);
      if (!this.editBuffer.includes('.')) {
        this.editBuffer = this.editBuffer === '' ? '0.' : `${this.editBuffer}.`;
        this.render();
      }
      return;
    }

    if (/^\d$/.test(event.key)) {
      this._startEditing(row);
      if (this.editBuffer === '0') {
        this.editBuffer = event.key;
      } else {
        this.editBuffer += event.key;
      }
      this.render();
    }
  }

  _clearStageCheats() {
    const defaultSceneIdx = clamp(GameManager.state.currentGameIndex + 1, 0, this.state.options.sceneIds.length - 1);
    this.state.nextSceneIndex = defaultSceneIdx;
    this.state.nextMutationIndex = 0;
    this.state.nextModIndex = 0;
    this.render('Next-stage cheats cleared');
  }

  _applyChanges() {
    const nextSceneKey = this.state.options.sceneIds[this.state.nextSceneIndex];
    const nextMutationId = this.state.options.mutationIds[this.state.nextMutationIndex];
    const nextModId = this.state.options.modIds[this.state.nextModIndex];

    GameManager.setCheatState({
      coins: this.state.coins,
      lives: this.state.lives,
      totalScore: this.state.score,
      difficulty: this.state.difficulty,
      hackCharge: this.state.hackCharge,
      hackActive: false,
      hackTimer: 0,
      portalTokens: this.state.portalTokens,
    });
    GameManager.setNextSceneCheat(nextSceneKey);
    GameManager.setNextMutationCheat(nextMutationId === 'NONE' ? null : nextMutationId);
    GameManager.setNextModCheat(nextModId === 'NONE' ? null : nextModId);
    GameManager.save();

    const hud = this.scene.get('HUDScene');
    if (hud) hud.refresh();

    if (this.parentScene) {
      const parent = this.scene.get(this.parentScene);
      parent?.events?.emit('score-changed', GameManager.state.totalScore);
      parent?.events?.emit('lives-changed', GameManager.state.lives);
      parent?.events?.emit('coins-changed', GameManager.state.coins);
      parent?.events?.emit('hack-changed');
    }

    this.render('Cheats applied');
  }

  render(message = '') {
    this.rows.forEach((row, index) => {
      const selected = index === this.selectedIndex;
      row.marker.setVisible(selected);
      row.label.setColor(selected ? cyan : muted);
      row.value.setColor(selected ? magenta : '#ffffff');
      const displayValue = row.kind === 'option'
        ? this._optionText(row)
        : this.editingKey === row.key
          ? `${this.editBuffer || ''}_`
          : String(this.state[row.key]);
      row.value.setText(displayValue);
    });

    if (message) {
      this.feedbackText.setText(message);
      this.time.delayedCall(1200, () => {
        if (this.feedbackText) this.feedbackText.setText('');
      });
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this._finishEditing();
      this.selectedIndex = (this.selectedIndex + this.rows.length - 1) % this.rows.length;
      this.render();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this._finishEditing();
      this.selectedIndex = (this.selectedIndex + 1) % this.rows.length;
      this.render();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) this._changeValue(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.right)) this._changeValue(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      this._finishEditing();
      this._applyChanges();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) this._clearStageCheats();
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this._finishEditing();
      this.closeMenu();
    }
  }

  closeMenu() {
    try {
      this.input?.keyboard?.off('keydown', this._handleTextInput, this);
    } catch (_) { /* safe */ }
    if (this.parentScene) this.scene.resume(this.parentScene);
    this.scene.stop();
  }
}
