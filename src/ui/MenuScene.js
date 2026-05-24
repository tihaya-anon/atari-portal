import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_ORDER, GAME_NAMES, AUDIO_REACTIVE as AR } from '../config.js';
import { GameManager } from '../core/GameManager.js';
import SFX from '../core/SFXManager.js';
import BGM from '../core/AudioManager.js';
import AudioReactive from '../core/AudioReactiveSystem.js';
import NeonGlow from '../vfx/NeonGlow.js';
import AudioBackground from '../vfx/AudioBackground.js';

const cyan = '#00f0ff';
const magenta = '#ff00e6';
const purple = '#b845ff';
const green = '#39ff14';

const SPECTRUM_BARS = 64;
const SPECTRUM_CX = GAME_WIDTH / 2;
const SPECTRUM_CY = 210;
const SPECTRUM_BASE_RADIUS = 45;
const SPECTRUM_MAX_BAR = 55;
const SPECTRUM_BAR_WIDTH = 3;
const MENU_BUTTONS = [
  { x: 255, y: 210, label: 'START\nMISSION', theme: 'portal', action: 'story' },
  { x: 545, y: 210, label: 'DATA PURGE\nSTATUS', theme: 'shards', action: 'arcade' },
  { x: 255, y: 390, label: 'FIREWALL\nSETTINGS', theme: 'vortex', action: 'levels' },
  { x: 545, y: 390, label: 'REBOOT', theme: 'burst', action: 'upgrades' },
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    BGM.playForScene(this, 'MenuScene');
    AudioBackground.setScene('MenuScene');
    this.levelSelectOpen = false;
    this.levelSelectItems = [];
    this.shopOpen = false;
    this.shopItems = [];

    try {
      if (this.scene.isSleeping('CRTOverlay')) {
        this.scene.wake('CRTOverlay');
      } else if (!this.scene.isActive('CRTOverlay')) {
        this.scene.launch('CRTOverlay');
      }
    } catch (_) { /* safe */ }

    const cx = GAME_WIDTH / 2;

    this.drawGridBackground();
    this._initSpectrumRing();
    this.drawDataStreams();
    this.drawBinaryPanels();
    this.drawAccessFrame();
    this.drawMenuStage3D();
    this.drawCentralSigil();
    this.drawReadabilityPanels();
    this._menuButtons = [];

    this.titleText = this.add.text(cx, 32, 'SYSTEM ACCESS: CYBER ARCADE', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#eafdff',
      stroke: '#00111a',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(42);
    NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_MAGENTA);
    this._beatTitleActive = false;

    this.tweens.add({
      targets: this.titleText,
      alpha: { from: 0.7, to: 1 },
      duration: 1500, yoyo: true, repeat: -1,
    });

    const subtitle = this.add.text(cx, 58, '[NEON WANDERER] // AETHELGARD FIREWALL ACCESS TERMINAL // [ACTIVE]', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#d8fbff',
      stroke: '#00111a',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(41);

    this.typewriterEffect(subtitle, '[NEON WANDERER] // AETHELGARD FIREWALL ACCESS TERMINAL // [ACTIVE]', 18);

    this.add.text(cx, 78, 'v2.0 // NEON RETRO OVERHAUL', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#d9c2ff',
      stroke: '#080014',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0.85).setDepth(41);

    MENU_BUTTONS.forEach((btn) => {
      const action = () => {
        if (btn.action === 'story') this.startGame('story');
        else if (btn.action === 'arcade') this.startGame('arcade');
        else if (btn.action === 'levels') this.toggleLevelSelect();
        else if (btn.action === 'upgrades') this.openUpgradeShop();
      };
      this._menuButtons.push(this.createButton(btn.x, btn.y, btn.label, action, { theme: btn.theme }));
    });

    const hs = GameManager.getHighScore();
    if (hs > 0) {
      this.add.text(cx, 548, `BEST: ${String(hs).padStart(7, '0')}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#8b93d1',
      }).setOrigin(0.5).setDepth(10);
    }

    this.add.text(cx, GAME_HEIGHT - 20, 'ARROWS/WASD MOVE | SPACE ACTION | H HACK | N SKIP | ESC PAUSE', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#c9d7ff',
      stroke: '#030712',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(41);

    const borderG = this.add.graphics().setDepth(10);
    NeonGlow.cornerAccents(borderG, 10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20, 20, COLORS.NEON_CYAN, 1);

    this._spectrumColors = [];
    const cC = Phaser.Display.Color.ValueToColor(COLORS.NEON_CYAN);
    const cM = Phaser.Display.Color.ValueToColor(COLORS.NEON_MAGENTA);
    for (let i = 0; i < SPECTRUM_BARS; i++) {
      const t = i / (SPECTRUM_BARS - 1);
      this._spectrumColors.push(Phaser.Display.Color.GetColor(
        Phaser.Math.Linear(cC.red, cM.red, t),
        Phaser.Math.Linear(cC.green, cM.green, t),
        Phaser.Math.Linear(cC.blue, cM.blue, t),
      ));
    }

    this._gridAlpha = 0.25;
    this._sigilPulse = 0;
    this._menuFocus = { x: 0, y: 0 };
    this.events.once('shutdown', this.resetMenuPerspective, this);
  }

  drawMenuStage3D() {
    const g = this.add.graphics().setDepth(4);
    const cx = GAME_WIDTH / 2;

    g.fillStyle(0x030613, 0.58);
    g.fillTriangle(cx - 330, 500, cx + 330, 500, cx + 245, 98);
    g.fillTriangle(cx - 330, 500, cx - 245, 98, cx + 245, 98);

    g.lineStyle(9, COLORS.NEON_CYAN, 0.035);
    g.strokeTriangle(cx - 330, 500, cx + 330, 500, cx + 245, 98);
    g.strokeTriangle(cx - 330, 500, cx - 245, 98, cx + 245, 98);

    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const y = Phaser.Math.Linear(112, 492, t);
      const half = Phaser.Math.Linear(245, 330, t);
      g.lineStyle(1, COLORS.NEON_CYAN, 0.08 + t * 0.04);
      g.lineBetween(cx - half, y, cx + half, y);
    }

    for (let i = -5; i <= 5; i++) {
      const topX = cx + i * 48;
      const bottomX = cx + i * 66;
      g.lineStyle(1, i === 0 ? COLORS.NEON_MAGENTA : COLORS.NEON_CYAN, i === 0 ? 0.12 : 0.06);
      g.lineBetween(topX, 108, bottomX, 496);
    }

    const leftFin = this.add.graphics().setDepth(5);
    leftFin.fillStyle(0x06101f, 0.72);
    leftFin.fillTriangle(82, 170, 190, 130, 142, 470);
    leftFin.lineStyle(2, COLORS.NEON_PURPLE, 0.32);
    leftFin.strokeTriangle(82, 170, 190, 130, 142, 470);

    const rightFin = this.add.graphics().setDepth(5);
    rightFin.fillStyle(0x06101f, 0.72);
    rightFin.fillTriangle(GAME_WIDTH - 82, 170, GAME_WIDTH - 190, 130, GAME_WIDTH - 142, 470);
    rightFin.lineStyle(2, COLORS.NEON_PURPLE, 0.32);
    rightFin.strokeTriangle(GAME_WIDTH - 82, 170, GAME_WIDTH - 190, 130, GAME_WIDTH - 142, 470);
  }

  drawReadabilityPanels() {
    const g = this.add.graphics().setDepth(39);
    g.fillStyle(0x020612, 0.78);
    g.fillRoundedRect(122, 18, 556, 72, 10);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.28);
    g.strokeRoundedRect(122, 18, 556, 72, 10);

    g.fillStyle(0x020612, 0.7);
    g.fillRoundedRect(110, GAME_HEIGHT - 36, 580, 26, 8);
    g.lineStyle(1, COLORS.NEON_PURPLE, 0.24);
    g.strokeRoundedRect(110, GAME_HEIGHT - 36, 580, 26, 8);
  }

  // ─── Audio-reactive update loop ───────────────────────────────

  update(_time, delta) {
    AudioReactive.update(delta);
    const ar = AudioReactive;
    this.updateMenuFocus();
    this._sigilPulse += delta * 0.006;
    this._drawCentralSigilFrame(ar._connected ? ar.energy * 0.35 : 0.12);
    if (!ar._connected) return;

    this._updateSpectrumRing(ar);
    this._updateGrid(ar);
    this._updateTitle(ar);

    if (ar.isBeat) {
      this._spawnBeatBurst(ar.beatIntensity);
      this.cameras.main.shake(100, AR.BEAT_CAMERA_SHAKE * ar.beatIntensity);
    }
  }

  updateMenuFocus() {
    const pointer = this.input.activePointer;
    const tx = pointer ? pointer.x : GAME_WIDTH / 2;
    const ty = pointer ? pointer.y : GAME_HEIGHT / 2;
    this._menuFocus.x = Phaser.Math.Linear(this._menuFocus.x, tx, 0.08);
    this._menuFocus.y = Phaser.Math.Linear(this._menuFocus.y, ty, 0.08);
    AudioBackground.setFocus('MenuScene', this._menuFocus.x, this._menuFocus.y);
    this.updateMenuPerspective();
  }

  updateMenuPerspective() {
    const canvas = this.game?.canvas;
    if (!canvas) return;
    const fx = Phaser.Math.Clamp(((this._menuFocus.x / GAME_WIDTH) - 0.5) * 2, -1, 1);
    const fy = Phaser.Math.Clamp(((this._menuFocus.y / GAME_HEIGHT) - 0.5) * 2, -1, 1);
    const depth = (Math.abs(fx) + Math.abs(fy)) * 12;
    canvas.style.transformOrigin = '50% 50%';
    canvas.style.transformStyle = 'preserve-3d';
    canvas.style.willChange = 'transform';
    canvas.style.transform = [
      'perspective(1000px)',
      `rotateX(${(-fy * 5.5).toFixed(3)}deg)`,
      `rotateY(${(fx * 7).toFixed(3)}deg)`,
      `translateZ(${depth.toFixed(2)}px)`,
      `translate(${(-fx * 5).toFixed(2)}px, ${(fy * 4).toFixed(2)}px)`,
    ].join(' ');
  }

  resetMenuPerspective() {
    const canvas = this.game?.canvas;
    if (!canvas) return;
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
    canvas.style.transformStyle = '';
    canvas.style.willChange = '';
  }

  // ─── Spectrum ring ────────────────────────────────────────────

  _initSpectrumRing() {
    this._spectrumGfx = this.add.graphics().setDepth(2);
    this._ringGlowGfx = this.add.graphics().setDepth(1);
    this._drawRingGlow(SPECTRUM_BASE_RADIUS, 0.15);

    this._spectrumParticles = [];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const r = SPECTRUM_BASE_RADIUS + 8;
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE][i % 3];
      const p = this.add.circle(
        SPECTRUM_CX + Math.cos(angle) * r,
        SPECTRUM_CY + Math.sin(angle) * r,
        1 + Math.random() * 1.5, color, 0.5
      ).setDepth(3);
      this._spectrumParticles.push(p);
      this.tweens.add({
        targets: p,
        angle: 360,
        x: { value: `+=${Math.cos(angle + 0.3) * 4}`, duration: 8000, yoyo: true, repeat: -1 },
        y: { value: `+=${Math.sin(angle + 0.3) * 4}`, duration: 8000, yoyo: true, repeat: -1 },
        alpha: { from: 0.3, to: 0.7, duration: 2000 + Math.random() * 2000, yoyo: true, repeat: -1 },
      });
    }
  }

  _drawRingGlow(radius, alpha) {
    const g = this._ringGlowGfx;
    g.clear();
    g.lineStyle(8, COLORS.NEON_PURPLE, alpha * 0.2);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY, radius + 6);
    g.lineStyle(4, COLORS.NEON_CYAN, alpha * 0.4);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY, radius);
    g.lineStyle(1, COLORS.NEON_MAGENTA, alpha * 0.8);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY, radius - 3);
  }

  _updateSpectrumRing(ar) {
    const g = this._spectrumGfx;
    g.clear();

    if (!ar._freqData) return;

    const freqData = ar._freqData;
    const binCount = freqData.length;
    const binsPerBar = Math.max(1, Math.floor(binCount / SPECTRUM_BARS));
    const radius = SPECTRUM_BASE_RADIUS + ar.bassSmooth * 14;

    this._drawRingGlow(radius, 0.15 + ar.energy * 0.5);

    for (let i = 0; i < SPECTRUM_BARS; i++) {
      let val = 0;
      for (let b = 0; b < binsPerBar; b++) {
        val += freqData[i * binsPerBar + b];
      }
      val = val / binsPerBar / 255;

      const angle = (Math.PI * 2 * i) / SPECTRUM_BARS - Math.PI / 2;
      const barLen = val * SPECTRUM_MAX_BAR;
      if (barLen < 1) continue;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x1 = SPECTRUM_CX + cos * radius;
      const y1 = SPECTRUM_CY + sin * radius;
      const x2 = SPECTRUM_CX + cos * (radius + barLen);
      const y2 = SPECTRUM_CY + sin * (radius + barLen);
      const color = this._spectrumColors[i];
      const alpha = 0.35 + val * 0.65;

      g.lineStyle(SPECTRUM_BAR_WIDTH + 4, color, alpha * 0.15);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();

      g.lineStyle(SPECTRUM_BAR_WIDTH, color, alpha);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    }

    for (let i = 0; i < this._spectrumParticles.length; i++) {
      this._spectrumParticles[i].setAlpha(0.25 + ar.energy * 0.75);
    }
  }

  // ─── Beat burst ───────────────────────────────────────────────

  _spawnBeatBurst(intensity) {
    const count = 6 + Math.floor(intensity * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 90;
      const color = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_PURPLE][Math.floor(Math.random() * 3)];
      const size = 1 + Math.random() * 2.5;
      const p = this.add.circle(SPECTRUM_CX, SPECTRUM_CY, size, color, 0.7 + intensity * 0.3).setDepth(4);
      this.tweens.add({
        targets: p,
        x: SPECTRUM_CX + Math.cos(angle) * dist,
        y: SPECTRUM_CY + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 350 + Math.random() * 350,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ─── Bass-pulsing grid ────────────────────────────────────────

  drawGridBackground() {
    this._gridGfx = this.add.graphics();
    this._drawGrid(0.25);
  }

  _drawGrid(alpha) {
    const g = this._gridGfx;
    g.clear();
    g.lineStyle(1, COLORS.GRID_LINE, alpha);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(x, 0, x, GAME_HEIGHT));
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      g.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
    }
  }

  _updateGrid(ar) {
    const target = Phaser.Math.Linear(0.08, 0.35, ar.bassSmooth);
    if (Math.abs(target - this._gridAlpha) > 0.008) {
      this._gridAlpha = target;
      this._drawGrid(target);
    }
  }

  // ─── Beat-reactive title ──────────────────────────────────────

  _updateTitle(ar) {
    if (!ar.isBeat || this._beatTitleActive) return;

    this._beatTitleActive = true;
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.07, scaleY: 1.07,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.titleText.setScale(1);
        this._beatTitleActive = false;
      }
    });

    if (ar.bass > ar.mid && ar.bass > ar.treble) {
      this.titleText.setColor(magenta);
      NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_MAGENTA);
    } else if (ar.mid > ar.treble) {
      this.titleText.setColor(purple);
      NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_PURPLE);
    } else {
      this.titleText.setColor(cyan);
      NeonGlow.applyTextGlow(this, this.titleText, COLORS.NEON_CYAN);
    }
  }

  // ─── Enhanced data streams ────────────────────────────────────

  drawDataStreams() {
    const chars = '0100110101101';
    for (let col = 0; col < 8; col++) {
      const x = 16 + col * ((GAME_WIDTH - 32) / 7) + Math.random() * 18;
      for (let i = 0; i < 14; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const txt = this.add.text(x, -10 - i * 16, ch, {
          fontSize: '11px', fontFamily: 'monospace', color: green,
        }).setAlpha(0.14).setDepth(0);
        this.tweens.add({
          targets: txt,
          y: GAME_HEIGHT + 10,
          alpha: { from: 0.15, to: 0 },
          duration: 4000 + Math.random() * 3500,
          delay: Math.random() * 3500 + i * 120,
          repeat: -1,
        });
      }
    }
  }

  drawBinaryPanels() {
    const panels = [
      { x: 78, y: 72 }, { x: 722, y: 72 },
      { x: 78, y: 508 }, { x: 722, y: 508 },
    ];
    panels.forEach(({ x, y }) => {
      const frame = this.add.graphics().setDepth(6);
      frame.fillStyle(0x090d16, 0.88);
      frame.fillRoundedRect(x - 58, y - 52, 116, 104, 4);
      frame.lineStyle(1.2, 0x9ca3b8, 0.35);
      frame.strokeRoundedRect(x - 58, y - 52, 116, 104, 4);
      frame.lineStyle(3, 0xffffff, 0.04);
      frame.strokeRoundedRect(x - 60, y - 54, 120, 108, 4);
      for (let row = 0; row < 11; row++) {
        const text = this.add.text(x - 48, y - 42 + row * 8, `${Math.random() > 0.5 ? '1' : '0'}${String(Math.floor(Math.random() * 999999999)).padStart(9, '0')}`, {
          fontSize: '7px', fontFamily: 'monospace', color: '#a2acb9',
        }).setAlpha(0.6).setDepth(7);
        this.tweens.add({
          targets: text,
          alpha: { from: 0.35, to: 0.7 },
          duration: 800 + Math.random() * 900,
          yoyo: true,
          repeat: -1,
          delay: row * 70,
        });
      }
    });
  }

  drawAccessFrame() {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(2, COLORS.NEON_CYAN, 0.35);
    g.lineBetween(160, 46, 640, 46);
    g.lineStyle(4, COLORS.NEON_CYAN, 0.06);
    g.lineBetween(160, 46, 640, 46);
    g.lineStyle(1, COLORS.NEON_CYAN, 0.25);
    g.lineBetween(175, 97, 625, 97);
    g.lineBetween(175, 528, 625, 528);
  }

  drawCentralSigil() {
    this._sigilGfx = this.add.graphics().setDepth(8);
    this._drawCentralSigilFrame(0.4);
  }

  _drawCentralSigilFrame(alphaBoost = 0) {
    const g = this._sigilGfx;
    if (!g) return;
    g.clear();
    const pulse = 1 + Math.sin(this._sigilPulse) * 0.04;
    g.lineStyle(8, COLORS.NEON_CYAN, 0.06 + alphaBoost * 0.1);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY + 86, 58 * pulse);
    g.lineStyle(2, COLORS.NEON_CYAN, 0.75 + alphaBoost * 0.15);
    g.strokeCircle(SPECTRUM_CX, SPECTRUM_CY + 86, 52 * pulse);
    g.lineStyle(1.5, COLORS.NEON_CYAN, 0.95);
    g.beginPath();
    g.moveTo(SPECTRUM_CX - 18, SPECTRUM_CY + 112);
    g.lineTo(SPECTRUM_CX, SPECTRUM_CY + 58);
    g.lineTo(SPECTRUM_CX + 18, SPECTRUM_CY + 112);
    g.strokePath();
    g.lineBetween(SPECTRUM_CX - 11, SPECTRUM_CY + 95, SPECTRUM_CX + 11, SPECTRUM_CY + 95);
    g.lineStyle(1, COLORS.WHITE, 0.4);
    g.lineBetween(SPECTRUM_CX - 7, SPECTRUM_CY + 102, SPECTRUM_CX + 7, SPECTRUM_CY + 102);
  }

  // ─── UI helpers (unchanged) ───────────────────────────────────

  typewriterEffect(textObj, fullText, charDelay) {
    let i = 0;
    textObj.setText('');
    textObj.setAlpha(1);
    this.time.addEvent({
      delay: charDelay,
      repeat: fullText.length - 1,
      callback: () => {
        i++;
        textObj.setText(fullText.substring(0, i));
      }
    });
  }

  createButton(x, y, label, callback, opts = {}) {
    const theme = opts.theme || 'portal';
    const width = 182;
    const height = label.includes('\n') ? 116 : 104;
    const ringColorMap = {
      portal: COLORS.NEON_MAGENTA,
      shards: COLORS.NEON_PURPLE,
      vortex: COLORS.NEON_CYAN,
      burst: COLORS.WHITE,
    };

    const shadow = this.add.graphics().setDepth(19);
    const effect = this.add.graphics().setDepth(20);
    const panel = this.add.graphics().setDepth(21);
    const zone = this.add.zone(x, y, width, height).setOrigin(0.5).setDepth(34).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: label.includes('\n') ? '26px' : '28px',
      fontFamily: 'monospace',
      align: 'center',
      color: '#ffffff',
      stroke: '#030712',
      strokeThickness: 5,
      lineSpacing: -6,
    }).setOrigin(0.5).setDepth(33);

    const drawPanel = (hover = false) => {
      shadow.clear();
      shadow.fillStyle(0x000000, hover ? 0.5 : 0.38);
      shadow.fillRoundedRect(x - width / 2 + 24, y - height / 2 + 30, width - 30, height - 28, 16);
      shadow.fillStyle(ringColorMap[theme], hover ? 0.12 : 0.07);
      shadow.fillRoundedRect(x - width / 2 + 12, y - height / 2 + 20, width - 26, height - 22, 16);

      panel.clear();
      panel.fillStyle(0x020612, hover ? 0.9 : 0.78);
      panel.fillRoundedRect(x - width / 2 + 16, y - height / 2 + 16, width - 32, height - 32, 14);
      panel.fillStyle(0xffffff, hover ? 0.09 : 0.05);
      panel.fillRoundedRect(x - width / 2 + 24, y - height / 2 + 23, width - 48, 13, 7);
      panel.fillStyle(0x000000, hover ? 0.25 : 0.18);
      panel.fillRoundedRect(x - width / 2 + 24, y + height / 2 - 39, width - 48, 14, 7);
      panel.lineStyle(5, ringColorMap[theme], hover ? 0.14 : 0.08);
      panel.strokeRoundedRect(x - width / 2 + 14, y - height / 2 + 14, width - 28, height - 28, 16);
      panel.lineStyle(1.5, ringColorMap[theme], hover ? 0.82 : 0.45);
      panel.strokeRoundedRect(x - width / 2 + 22, y - height / 2 + 22, width - 44, height - 44, 10);
      panel.lineStyle(1, COLORS.WHITE, hover ? 0.2 : 0.1);
      panel.strokeRoundedRect(x - width / 2 + 30, y - height / 2 + 30, width - 60, height - 60, 8);
    };

    this.drawButtonEffect(effect, x, y, theme, false);
    drawPanel(false);

    zone.on('pointerover', () => {
      txt.setColor(cyan);
      txt.setScale(1.06);
      NeonGlow.applyTextGlow(this, txt, ringColorMap[theme]);
      this.drawButtonEffect(effect, x, y, theme, true);
      drawPanel(true);
      SFX.menuSelect();
    });
    zone.on('pointerout', () => {
      txt.setColor('#ffffff');
      txt.setScale(1);
      txt.setStyle({ ...txt.style, shadow: {}, stroke: '#030712', strokeThickness: 5 });
      this.drawButtonEffect(effect, x, y, theme, false);
      drawPanel(false);
    });
    zone.on('pointerdown', callback);

    return { shadow, effect, panel, zone, txt };
  }

  drawButtonEffect(g, x, y, theme, hover) {
    g.clear();
    const intensity = hover ? 1 : 0.65;
    if (theme === 'portal') {
      g.lineStyle(10, COLORS.NEON_ORANGE, 0.05 * intensity);
      g.strokeCircle(x, y, 58);
      g.lineStyle(5, COLORS.NEON_MAGENTA, 0.25 * intensity);
      g.strokeCircle(x, y, 52);
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 * i) / 18;
        const r1 = 36 + (i % 3) * 4;
        const r2 = 58 + (i % 2) * 6;
        g.lineStyle(1.5, i % 2 ? COLORS.NEON_ORANGE : COLORS.NEON_MAGENTA, 0.35 * intensity);
        g.lineBetween(x + Math.cos(angle) * r1, y + Math.sin(angle) * r1, x + Math.cos(angle + 0.16) * r2, y + Math.sin(angle + 0.16) * r2);
      }
    } else if (theme === 'shards') {
      g.fillStyle(COLORS.NEON_PURPLE, 0.08 * intensity);
      g.fillCircle(x, y, 54);
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const sx = x + Math.cos(angle) * (26 + i * 2);
        const sy = y + Math.sin(angle) * (26 + i * 2);
        g.lineStyle(2, i % 2 ? COLORS.NEON_MAGENTA : COLORS.WHITE, 0.42 * intensity);
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(angle + 0.5) * 18, sy + Math.sin(angle + 0.5) * 11);
        g.lineTo(sx + Math.cos(angle - 0.4) * 12, sy + Math.sin(angle - 0.4) * 19);
        g.closePath();
        g.strokePath();
      }
    } else if (theme === 'vortex') {
      for (let i = 0; i < 5; i++) {
        const radius = 24 + i * 8;
        g.lineStyle(3 - i * 0.35, COLORS.NEON_CYAN, (0.34 - i * 0.05) * intensity);
        g.beginPath();
        g.arc(x, y, radius, Phaser.Math.DegToRad(30 + i * 14), Phaser.Math.DegToRad(320 + i * 12), false);
        g.strokePath();
      }
      g.lineStyle(2, COLORS.WHITE, 0.22 * intensity);
      g.strokeCircle(x, y, 10);
    } else {
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const inner = 10 + (i % 2) * 4;
        const outer = 54 + (i % 3) * 6;
        g.lineStyle(2, i % 3 === 0 ? COLORS.WHITE : COLORS.NEON_PURPLE, 0.38 * intensity);
        g.lineBetween(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner, x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      }
      g.fillStyle(COLORS.WHITE, 0.2 * intensity);
      g.fillCircle(x, y, 14);
    }
  }

  toggleLevelSelect() {
    if (this.levelSelectOpen) {
      this.levelSelectItems.forEach(item => item.destroy());
      this.levelSelectItems = [];
      this.levelSelectOpen = false;
      return;
    }

    this.levelSelectOpen = true;
    const cx = GAME_WIDTH / 2;
    const panelH = GAME_ORDER.length * 30 + 60;
    const panelY = GAME_HEIGHT / 2;
    const topY = panelY - panelH / 2;

    const shadow = this.add.rectangle(cx + 14, panelY + 16, 350, panelH + 10, 0x000000, 0.42).setDepth(99);
    const glow = this.add.rectangle(cx, panelY, 350, panelH + 10, COLORS.NEON_CYAN, 0.08).setDepth(99).setBlendMode(Phaser.BlendModes.ADD);
    const bg = this.add.rectangle(cx, panelY, 340, panelH, COLORS.HUD_BG, 0.96).setDepth(100);
    const borderG = this.add.graphics().setDepth(100);
    NeonGlow.strokeRect(borderG, cx - 170, topY, 340, panelH, COLORS.NEON_CYAN, 1, 0.4);
    this.levelSelectItems.push(shadow, glow, bg, borderG);

    const header = this.add.text(cx, topY + 14, '// LEVEL SELECT', {
      fontSize: '13px', fontFamily: 'monospace', color: cyan,
    }).setOrigin(0.5).setDepth(101);
    this.levelSelectItems.push(header);

    GAME_ORDER.forEach((sceneKey, i) => {
      const name = GAME_NAMES[sceneKey];
      const y = topY + 40 + i * 30;
      const txt = this.add.text(cx, y, `${i + 1}. ${name}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#7777aa',
      }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

      txt.on('pointerover', () => { txt.setColor(cyan); SFX.menuSelect(); });
      txt.on('pointerout', () => txt.setColor('#7777aa'));
      txt.on('pointerdown', () => this.startDebugGame(sceneKey, i));
      this.levelSelectItems.push(txt);
    });

    const closeBtn = this.add.text(cx, topY + panelH - 16, '> CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.levelSelectItems.forEach(item => item.destroy());
      this.levelSelectItems = [];
      this.levelSelectOpen = false;
    });
    this.levelSelectItems.push(closeBtn);
  }

  openUpgradeShop() {
    if (this.shopOpen) {
      this.shopItems.forEach(item => item.destroy());
      this.shopItems = [];
      this.shopOpen = false;
      return;
    }
    this.shopOpen = true;
    this.shopItems = [];

    const cx = GAME_WIDTH / 2;
    const shadow = this.add.rectangle(cx + 16, 366, 512, 352, 0x000000, 0.45).setDepth(99);
    const glow = this.add.rectangle(cx, 350, 512, 340, COLORS.NEON_PURPLE, 0.09).setDepth(99).setBlendMode(Phaser.BlendModes.ADD);
    const bg = this.add.rectangle(cx, 350, 500, 330, COLORS.HUD_BG, 0.96).setDepth(100);
    const borderG = this.add.graphics().setDepth(100);
    NeonGlow.strokeRect(borderG, cx - 250, 185, 500, 330, COLORS.NEON_PURPLE, 1, 0.5);
    this.shopItems.push(shadow, glow, bg, borderG);

    const title = this.add.text(cx, 200, '// REBOOT CONTROL', {
      fontSize: '14px', fontFamily: 'monospace', color: '#b845ff',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(title);

    const permCoins = GameManager.getPermanentCoins();
    const coinLabel = this.add.text(cx, 224, `CREDITS: ${permCoins}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(coinLabel);

    const ups = GameManager.state.permanentUpgrades;
    const upgrades = [
      { key: 'startLives', name: '+1 START LIFE', cost: 50, max: 3, current: ups.startLives || 0 },
      { key: 'hackBoost', name: 'HACK CHARGE +20%', cost: 40, max: 5, current: ups.hackBoost || 0 },
      { key: 'modQuality', name: 'BETTER MODS', cost: 60, max: 3, current: ups.modQuality || 0 },
      { key: 'glitchResist', name: 'GLITCH RESIST', cost: 45, max: 3, current: ups.glitchResist || 0 },
    ];

    upgrades.forEach((up, i) => {
      const y = 256 + i * 35;
      const maxed = up.current >= up.max;
      const canAfford = permCoins >= up.cost;
      const color = maxed ? '#333355' : (canAfford ? '#39ff14' : '#555577');

      const label = this.add.text(cx - 180, y, `${up.name} [${up.current}/${up.max}]`, {
        fontSize: '12px', fontFamily: 'monospace', color: color,
      }).setDepth(101);
      this.shopItems.push(label);

      if (!maxed) {
        const btn = this.add.text(cx + 140, y, `[${up.cost} CR]`, {
          fontSize: '12px', fontFamily: 'monospace', color: canAfford ? '#39ff14' : '#444',
        }).setOrigin(0.5, 0).setDepth(101).setInteractive({ useHandCursor: canAfford });

        if (canAfford) {
          btn.on('pointerover', () => btn.setColor('#00f0ff'));
          btn.on('pointerout', () => btn.setColor('#39ff14'));
          btn.on('pointerdown', () => {
            if (GameManager.buyPermanentUpgrade(up.key, up.cost)) {
              SFX.shopBuy();
              this.shopItems.forEach(item => item.destroy());
              this.shopItems = [];
              this.shopOpen = false;
              this.openUpgradeShop();
            }
          });
        }
        this.shopItems.push(btn);
      }
    });

    const achTitle = this.add.text(cx, 398, '// CODEX', {
      fontSize: '11px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(achTitle);

    const achSys = GameManager.achievementSystem;
    if (achSys) {
      const achText = this.add.text(cx, 416, `${achSys.totalUnlocked}/${achSys.totalAchievements} UNLOCKED`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#555577',
      }).setOrigin(0.5).setDepth(101);
      this.shopItems.push(achText);
    }

    const perfFps = AudioBackground.getPerformanceFps();
    const effectsLevel = AudioBackground.getAnimationEffectsLevel();
    const highEffects = effectsLevel === 'high';
    const effectsLabel = this.add.text(cx - 180, 438, `ANIMATION EFFECTS: ${effectsLevel.toUpperCase()}`, {
      fontSize: '11px', fontFamily: 'monospace', color: highEffects ? '#39ff14' : '#7777aa',
    }).setDepth(101);
    this.shopItems.push(effectsLabel);

    const effectsBtn = this.add.text(cx + 148, 438, `[SET ${highEffects ? 'LOW' : 'HIGH'}]`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#00f0ff',
    }).setOrigin(0.5, 0).setDepth(101).setInteractive({ useHandCursor: true });
    effectsBtn.on('pointerover', () => effectsBtn.setColor('#ffffff'));
    effectsBtn.on('pointerout', () => effectsBtn.setColor('#00f0ff'));
    effectsBtn.on('pointerdown', () => {
      SFX.menuSelect();
      AudioBackground.setAnimationEffectsLevel(highEffects ? 'low' : 'high');
      this.shopItems.forEach(item => item.destroy());
      this.shopItems = [];
      this.shopOpen = false;
      this.openUpgradeShop();
    });
    this.shopItems.push(effectsBtn);

    const fpsText = perfFps === null ? 'PERF FPS: PENDING' : `PERF FPS: ${Math.round(perfFps)}`;
    const fpsLabel = this.add.text(cx, 462, fpsText, {
      fontSize: '9px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5).setDepth(101);
    this.shopItems.push(fpsLabel);

    const closeBtn = this.add.text(cx, 492, '> CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff1744',
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.shopItems.forEach(item => item.destroy());
      this.shopItems = [];
      this.shopOpen = false;
    });
    this.shopItems.push(closeBtn);
  }

  startDebugGame(sceneKey, index) {
    SFX.menuStart();
    GameManager.reset();
    GameManager.state.mode = 'story';
    GameManager.state.currentGameIndex = index;
    GameManager.state.coins = 10;
    this.cameras.main.fadeOut(400, 10, 10, 26);
    this.time.delayedCall(400, () => {
      this.scene.launch('HUDScene');
      this.scene.launch('CRTOverlay');
      this.scene.start(sceneKey);
    });
  }

  startGame(mode) {
    SFX.menuStart();
    GameManager.reset();
    GameManager.state.mode = mode;
    if (mode === 'arcade') {
      GameManager.state.currentGameIndex = Phaser.Math.Between(0, GAME_ORDER.length - 1);
    } else {
      GameManager.state.currentGameIndex = 0;
    }
    this.cameras.main.fadeOut(400, 10, 10, 26);
    this.time.delayedCall(400, () => {
      this.scene.launch('HUDScene');
      this.scene.launch('CRTOverlay');
      this.scene.start(GameManager.currentSceneKey);
    });
  }
}
