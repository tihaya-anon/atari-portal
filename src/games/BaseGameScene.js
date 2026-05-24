import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, HACK_CONFIG, AUDIO_REACTIVE as AR, CYBER_GRID } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import { PortalSystem } from '../core/PortalSystem.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { GlitchSystem } from '../core/GlitchSystem.js';
import { PowerUpSystem } from '../core/PowerUpSystem.js';
import SFX from '../core/SFXManager.js';
import BGM from '../core/AudioManager.js';
import AudioReactive from '../core/AudioReactiveSystem.js';
import NeonGlow from '../vfx/NeonGlow.js';
import GlitchEffect from '../vfx/GlitchEffect.js';
import AudioBackground from '../vfx/AudioBackground.js';

export class BaseGameScene extends Phaser.Scene {
  constructor(key, scoreKey) {
    super(key);
    this.sceneKey = key;
    this.scoreKey = scoreKey;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    AudioBackground.setScene(this.sceneKey, GameManager.state.mode);
    console.log('[AudioReactive] BaseGameScene create', this.sceneKey);

    this.portal = new PortalSystem(this);
    this.score = new ScoreManager(this, this.scoreKey);
    this.glitch = new GlitchSystem(this);
    this.powerUps = new PowerUpSystem(this, this.sceneKey);
    this.gameArea = { x: 0, y: 32, width: GAME_WIDTH, height: GAME_HEIGHT - 32 };
    this.cameras.main.fadeIn(400);

    this._ensureOverlayRunning('HUDScene');
    this._ensureOverlayRunning('CRTOverlay');

    const hud = this.scene.get('HUDScene');
    if (hud) {
      hud.listenToScene(this.sceneKey);
      hud.scene.bringToTop();
    }
    const crt = this.scene.get('CRTOverlay');
    if (crt) crt.scene.bringToTop();

    this.portal.startFallbackTimer();

    this.events.on('portal-force-spawn', () => {
      if (!this.portal.portalActive) {
        this.onPortalForceSpawn();
      }
    });

    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pauseKeyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.hackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.skipKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.cheatKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACK_SLASH);

    this._prevBoostState = false;
    this._prevHackState = false;
    this._ending = false;
    this._foregroundFocus = { x: 0, y: 0 };

    // Apply active mutation effects
    const ms = GameManager.mutationSystem;
    if (ms.activeMutation) {
      ms.applyToScene(this);
    }

    this.drawGameGrid();
    this._initDataStream();
    this._setCRTIntensity();

    BGM.playForScene(this, this.sceneKey);

    this.events.on('combo-hit', this._showCombo, this);
    this.events.on('score-popup', this._showScorePopup, this);

    this.events.once('shutdown', this.shutdown, this);
  }

  drawGameGrid() {
    this._gridGfx = this.add.graphics().setDepth(0);
    this._gridAlpha = 0.12;
    this._drawGridLines(0.12);
  }

  _drawGridLines(alpha) {
    const g = this._gridGfx;
    g.clear();
    const dashLen = 4;
    const gapLen = 6;
    g.lineStyle(1, COLORS.GRID_LINE, alpha);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      for (let y = 32; y < GAME_HEIGHT; y += dashLen + gapLen) {
        const endY = Math.min(y + dashLen, GAME_HEIGHT);
        g.strokeLineShape(new Phaser.Geom.Line(x, y, x, endY));
      }
    }
    for (let y = 32; y < GAME_HEIGHT; y += 40) {
      for (let x = 0; x < GAME_WIDTH; x += dashLen + gapLen) {
        const endX = Math.min(x + dashLen, GAME_WIDTH);
        g.strokeLineShape(new Phaser.Geom.Line(x, y, endX, y));
      }
    }
  }

  _initDataStream() {
    const cfg = CYBER_GRID[this.sceneKey];
    if (!cfg) return;
    const density = cfg.streamDensity || 0.3;
    const color = '#' + (cfg.streamColor || COLORS.NEON_CYAN).toString(16).padStart(6, '0');
    const colCount = Math.floor(density * 15);
    const chars = '01';

    this._dataStreamItems = [];
    for (let i = 0; i < colCount; i++) {
      const cx = Math.random() * GAME_WIDTH;
      const speed = 30 + Math.random() * 50;
      const len = 3 + Math.floor(Math.random() * 5);
      for (let j = 0; j < len; j++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const a = (0.06 + (1 - j / len) * 0.08) * density;
        const txt = this.add.text(cx, -20 - j * 14, ch, {
          fontSize: '10px', fontFamily: 'monospace', color,
        }).setAlpha(a).setDepth(1);
        this._dataStreamItems.push({ obj: txt, speed, startX: cx });
        this.tweens.add({
          targets: txt,
          y: GAME_HEIGHT + 20,
          duration: ((GAME_HEIGHT + 40) / speed) * 1000,
          delay: Math.random() * 4000 + j * 100,
          repeat: -1,
          onRepeat: () => { txt.y = -20; txt.x = cx + (Math.random() - 0.5) * 10; },
        });
      }
    }
  }

  _setCRTIntensity() {
    const crt = this.scene.get('CRTOverlay');
    if (crt && crt.setIntensity) {
      const diff = GameManager.state.difficulty || 1;
      const intensity = Math.min(1, (diff - 1) * 0.2 + 0.3);
      crt.setIntensity(intensity);
    }
  }

  get gameSpeed() {
    let speed = GameManager.speedMultiplier;
    if (this.glitch && this.glitch.timeDilationFactor !== 1) {
      speed *= this.glitch.timeDilationFactor;
    }
    return speed;
  }

  get controlInverted() {
    return this.glitch ? this.glitch.controlInverted : false;
  }

  get horizontalControlInverted() {
    const glitchInvert = this.glitch ? this.glitch.controlInverted : false;
    const mirrorInvert = !!GameManager.mutationSystem?.isMirrored;
    return glitchInvert !== mirrorInvert;
  }

  get verticalControlInverted() {
    return this.glitch ? this.glitch.controlInverted : false;
  }

  get enemiesFrozen() {
    return (this.glitch && this.glitch.enemiesFrozen) || GameManager.state.hackActive;
  }

  update(time, delta) {
    if (this._ending) return;

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey) || Phaser.Input.Keyboard.JustDown(this.pauseKeyP)) {
      SFX.pause();
      this.scene.pause();
      this.scene.launch('PauseScene', { parentScene: this.sceneKey });
    }

    if (Phaser.Input.Keyboard.JustDown(this.hackKey)) {
      this.tryActivateHack();
    }

    if (Phaser.Input.Keyboard.JustDown(this.skipKey)) {
      this.skipToNextGame();
    }

    if (Phaser.Input.Keyboard.JustDown(this.cheatKey) && this.cheatKey.shiftKey) {
      this._handleCheatHotkey();
    }

    if (this.portal) this.portal.update(time, delta);
    if (this.glitch) this.glitch.update(delta);
    if (this.powerUps) this.powerUps.update(delta);
    this._updateAudioReactive(delta);

    // Speed boost tracking
    const boostExpired = GameManager.updateSpeedBoost(delta);
    if (boostExpired) {
      this.events.emit('speed-boost-changed', false);
      this.onSpeedBoostEnd();
    }
    if (GameManager.state.speedBoostActive && !this._prevBoostState) {
      this.onSpeedBoostStart();
      this.showBoostFlash();
    }
    this._prevBoostState = GameManager.state.speedBoostActive;

    // Hack tracking
    const hackExpired = GameManager.updateHack(delta);
    if (hackExpired) {
      this.onHackEnd();
    }
    if (GameManager.state.hackActive && !this._prevHackState) {
      this.onHackStart();
    }
    this._prevHackState = GameManager.state.hackActive;

    // Mutation fog update
    const ms = GameManager.mutationSystem;
    if (ms.visibilityRadius > 0 && this._playerPos) {
      ms.updateFog(this, this._playerPos.x, this._playerPos.y);
    }
  }

  _handleCheatHotkey() {
    if (this.scene.isActive('CheatMenuScene')) return;
    this.scene.pause();
    this.scene.launch('CheatMenuScene', { parentScene: this.sceneKey });
  }

  setPlayerPosition(x, y) {
    this._playerPos = { x, y };
    AudioBackground.setFocus(this.sceneKey, x, y);
    this._updateForegroundParallax(x, y);
  }

  _updateForegroundParallax(x, y) {
    if (!this.cameras?.main) return;
    const nx = Phaser.Math.Clamp(((x / GAME_WIDTH) - 0.5) * 2, -1, 1);
    const ny = Phaser.Math.Clamp(((y / GAME_HEIGHT) - 0.5) * 2, -1, 1);
    this._foregroundFocus.x = Phaser.Math.Linear(this._foregroundFocus.x, nx, 0.08);
    this._foregroundFocus.y = Phaser.Math.Linear(this._foregroundFocus.y, ny, 0.08);

    const fx = this._foregroundFocus.x;
    const fy = this._foregroundFocus.y;
    const cam = this.cameras.main;
    cam.setRotation(fx * 0.025);
    cam.setZoom(1.015 + (Math.abs(fx) + Math.abs(fy)) * 0.012);
    cam.centerOn(
      GAME_WIDTH / 2 + fx * 18,
      GAME_HEIGHT / 2 + fy * 12,
    );

    this._updateCanvasPerspective(fx, fy);
  }

  _updateCanvasPerspective(fx, fy) {
    const canvas = this.game?.canvas;
    if (!canvas) return;
    const depth = (Math.abs(fx) + Math.abs(fy)) * 18;
    const mirrorScale = this._mutMirror ? -1 : 1;
    canvas.style.transformOrigin = '50% 50%';
    canvas.style.transformStyle = 'preserve-3d';
    canvas.style.willChange = 'transform';
    canvas.style.transform = [
      'perspective(900px)',
      `scaleX(${mirrorScale})`,
      `rotateX(${(-fy * 8).toFixed(3)}deg)`,
      `rotateY(${(fx * 10).toFixed(3)}deg)`,
      `translateZ(${depth.toFixed(2)}px)`,
      `translate(${(-fx * 8).toFixed(2)}px, ${(fy * 6).toFixed(2)}px)`,
    ].join(' ');
  }

  shakeCamera(intensity = 0.005, duration = 150) {
    try {
      this.cameras.main.shake(duration, intensity);
    } catch (_) { /* safe */ }
  }

  onSpeedBoostStart() {
    SFX.boost();
    this.shakeCamera(0.006, 200);
  }
  onSpeedBoostEnd() {}

  showBoostFlash() {
    const flash = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'SPEED BOOST!', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ff6e00',
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    NeonGlow.applyTextGlow(this, flash, COLORS.NEON_ORANGE);

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 }, y: flash.y - 30, scale: { from: 0.5, to: 1.2 },
      duration: 400, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: flash,
          alpha: 0, y: flash.y - 20,
          duration: 600, delay: 400,
          onComplete: () => flash.destroy(),
        });
      }
    });
  }

  tryActivateHack() {
    if (GameManager.activateHack()) {
      this.onHackStart();
    } else {
      this.showHackDenied();
    }
  }

  showHackDenied() {
    const charge = GameManager.state.hackCharge || 0;
    const pct = Math.floor((charge / HACK_CONFIG.MAX_CHARGE) * 100);
    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, `HACK CHARGE: ${pct}%`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 },
      y: txt.y - 15,
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          alpha: 0,
          duration: 500,
          delay: 600,
          onComplete: () => txt.destroy(),
        });
      }
    });
  }

  onHackStart() {
    SFX.boost();
    GlitchEffect.chromaticAberration(this, 600);

    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.NEON_CYAN, 0.08
    ).setDepth(250).setBlendMode(Phaser.BlendModes.ADD);
    this._hackOverlay = overlay;

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'ACCESS GRANTED', {
      fontSize: '28px', fontFamily: 'monospace', color: '#39ff14',
    }).setOrigin(0.5).setDepth(300).setAlpha(0);
    NeonGlow.applyTextGlow(this, txt, COLORS.NEON_GREEN);

    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 }, scale: { from: 0.5, to: 1 },
      duration: 400,
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, y: txt.y - 20,
          duration: 500, delay: 600,
          onComplete: () => txt.destroy(),
        });
      }
    });

    this.events.emit('hack-changed');
  }

  onHackEnd() {
    if (this._hackOverlay) {
      this._hackOverlay.destroy();
      this._hackOverlay = null;
    }
    this.events.emit('hack-changed');
  }

  onPortalForceSpawn() {
    this.portal.spawnPortal(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  triggerPortal(x, y) {
    this.portal.spawnPortal(x, y);
    this.shakeCamera(0.005, 300);
    this.showPortalHint();
  }

  showPortalHint() {
    this._showHintText('▸ REACH THE PORTAL ▸');
  }

  _showHintText(msg) {
    if (this._portalHint) { try { this._portalHint.destroy(); } catch (_) {} }
    this._portalHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, msg, {
      fontSize: '13px', fontFamily: 'monospace', color: '#b845ff',
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: this._portalHint,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  tryEnterPortal(playerX, playerY) {
    if (this.portal.checkOverlap(playerX, playerY)) {
      this.enterPortal();
      return true;
    }
    return false;
  }

  enterPortal() {
    this._ending = true;
    this.portal.enterPortal(() => {
      GameManager.save();
      GameManager.addPermanentCoins(Math.floor(GameManager.state.coins * 0.1));
      const nextScene = GameManager.advanceToNextGame();

      try { GameManager.mutationSystem.cleanupScene(this); } catch (_) {}
      try { this.scene.sleep('HUDScene'); } catch (_) {}
      try { this.scene.sleep('CRTOverlay'); } catch (_) {}

      if (GameManager.storyComplete) {
        this.scene.start('VictoryScene');
      } else {
        this.scene.start('ModSelectScene', { from: this.sceneKey, to: nextScene });
      }
    });
  }

  skipToNextGame() {
    if (this._ending) return;
    this._ending = true;

    SFX.portalEnter();
    this.cameras.main.fadeOut(500, 10, 10, 26);
    this.time.delayedCall(550, () => {
      GameManager.save();
      const nextScene = GameManager.advanceToNextGame();

      this._cleanupBeforeTransition();

      if (GameManager.storyComplete) {
        this.scene.start('VictoryScene');
      } else {
        this.scene.start('ModSelectScene', { from: this.sceneKey, to: nextScene });
      }
    });
  }

  onPlayerDeath() {
    SFX.death();
    this.shakeCamera(0.012, 250);
    const alive = GameManager.loseLife();
    this.events.emit('lives-changed', GameManager.state.lives);
    if (!alive) {
      this._ending = true;
      this.cameras.main.fadeOut(600, 10, 10, 26);
      this.time.delayedCall(700, () => {
        this._cleanupBeforeTransition();
        this.scene.start('GameOverScene');
      });
      return false;
    }
    return true;
  }

  _ensureOverlayRunning(key) {
    try {
      if (this.scene.isSleeping(key)) {
        this.scene.wake(key);
      } else if (!this.scene.isActive(key)) {
        this.scene.launch(key);
      }
    } catch (_) { /* safe */ }
  }

  _cleanupBeforeTransition() {
    try {
      GameManager.mutationSystem.cleanupScene(this);
    } catch (_) { /* safe */ }
    try { this.scene.sleep('HUDScene'); } catch (_) {}
    try { this.scene.sleep('CRTOverlay'); } catch (_) {}
  }

  _showCombo(count, worldX, worldY) {
    const x = worldX != null ? worldX : GAME_WIDTH / 2;
    const y = worldY != null ? worldY - 20 : GAME_HEIGHT / 2 - 30;

    const size = count >= 5 ? '22px' : count >= 3 ? '18px' : '14px';
    const color = count >= 5 ? '#ff00e6' : count >= 3 ? '#ff6e00' : '#00f0ff';
    const suffix = count >= 5 ? '!!' : count >= 3 ? '!' : '';
    const label = count >= 5 ? 'MAX COMBO' : 'COMBO';

    const txt = this.add.text(x, y, `x${count} ${label}${suffix}`, {
      fontSize: size, fontFamily: 'monospace', color,
    }).setOrigin(0.5).setDepth(400).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 },
      y: y - 25,
      scale: { from: 0.6, to: 1.1 },
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          alpha: 0, y: txt.y - 15,
          duration: 400, delay: 300,
          onComplete: () => txt.destroy(),
        });
      }
    });

    if (count >= 3) this.shakeCamera(0.003, 100);
  }

  _showScorePopup(points, worldX, worldY) {
    if (!worldX && !worldY) return;
    const x = worldX || GAME_WIDTH / 2;
    const y = worldY || GAME_HEIGHT / 2;

    const txt = this.add.text(x, y, `+${points}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5).setDepth(350).setAlpha(0.9);

    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: y - 30,
      duration: 600,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  _updateAudioReactive(delta) {
    AudioReactive.update(delta);
    const ar = AudioReactive;

    if (!this._audioReactiveDebugLogged && ar._connected) {
      this._audioReactiveDebugLogged = true;
      console.log('[AudioReactive] scene update active', {
        scene: this.sceneKey,
        connected: ar._connected,
      });
    }

    if (ar.isBeat) {
      const intensity = AR.BEAT_CAMERA_SHAKE * ar.beatIntensity;
      this.cameras.main.shake(100, intensity);
    }

    if (this._gridGfx) {
      const target = Phaser.Math.Linear(AR.BASS_GRID_ALPHA_MIN, AR.BASS_GRID_ALPHA_MAX, ar.bassSmooth);
      if (Math.abs(target - this._gridAlpha) > 0.01) {
        this._gridAlpha = target;
        this._drawGridLines(target);
      }
    }
  }

  shutdown() {
    try {
      const canvas = this.game?.canvas;
      if (canvas) {
        canvas.style.transform = '';
        canvas.style.transformOrigin = '';
        canvas.style.transformStyle = '';
        canvas.style.willChange = '';
      }
    } catch (_) { /* safe */ }
    try {
      if (this.portal) { this.portal.destroy(); this.portal = null; }
    } catch (_) { this.portal = null; }
    try {
      if (this.glitch) { this.glitch.destroy(); this.glitch = null; }
    } catch (_) { this.glitch = null; }
    try {
      if (this.powerUps) { this.powerUps.destroy(); this.powerUps = null; }
    } catch (_) { this.powerUps = null; }
    try {
      if (this._portalHint) { this._portalHint.destroy(); this._portalHint = null; }
    } catch (_) { this._portalHint = null; }
    try {
      if (this._dataStreamItems) {
        this._dataStreamItems.forEach(d => { try { d.obj.destroy(); } catch (_) {} });
        this._dataStreamItems = null;
      }
    } catch (_) {}
    try {
      GameManager.mutationSystem.cleanupScene(this);
    } catch (_) { /* safe */ }
  }
}
