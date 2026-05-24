import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import SFX from '../../core/SFXManager.js';
import GlitchEffect from '../../vfx/GlitchEffect.js';
import ArcadeFX from '../../vfx/ArcadeFX.js';
import DebrisSystem from '../../vfx/DebrisSystem.js';
import RippleEffect from '../../vfx/RippleEffect.js';
import TrailSystem from '../../vfx/TrailSystem.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';

const TOP_Y = 28;
const LANE_H = 44;
const HOP_X = 40;
const HOP_COOLDOWN = 150;
const LILY_POSITIONS = [80, 240, 400, 560, 720];
const PORTAL_THRESHOLD = 3;

function laneCenter(row) {
  return TOP_Y + row * LANE_H + LANE_H / 2;
}

export class FroggerScene extends BaseGameScene {
  constructor() {
    super('FroggerScene', 'frogger');
  }

  create() {
    super.create();

    this.lastHopTime = 0;
    this.frogRow = 12;
    this.highestRow = 12;
    this.filledCount = 0;
    this.dead = false;
    this.laneFx = this.add.graphics().setDepth(0.5);

    this.drawCyberArena();
    this.drawLanes();
    this.drawLaneLabels();
    this.createLilyPads();
    this.createCars();
    this.createLogs();
    this.createFrog();
    this.setupInput();
  }

  drawCyberArena() {
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_GREEN,
      secondary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_YELLOW,
      top: TOP_Y,
      bottom: GAME_HEIGHT - 34,
      density: 1,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_GREEN, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'FROGGER: FIREWALL RUNNER',
      subtitle: 'BITSTREAM RIVER // DATA HIGHWAY',
      primary: COLORS.NEON_GREEN,
      accent: COLORS.NEON_CYAN,
    });
  }

  drawLanes() {
    const g = this.add.graphics().setDepth(-1);

    g.fillStyle(0x0a1a3a);
    g.fillRect(0, TOP_Y, GAME_WIDTH, LANE_H * 6);

    g.fillStyle(0x0a2a1e);
    g.fillRect(0, TOP_Y + 6 * LANE_H, GAME_WIDTH, LANE_H);

    g.fillStyle(0x1a1a2a);
    g.fillRect(0, TOP_Y + 7 * LANE_H, GAME_WIDTH, LANE_H * 5);

    g.fillStyle(0x333355);
    for (let r = 7; r < 11; r++) {
      const lineY = TOP_Y + (r + 1) * LANE_H;
      for (let x = 0; x < GAME_WIDTH; x += 40) {
        g.fillRect(x, lineY - 1, 20, 2);
      }
    }

    g.fillStyle(0x0a2a1e);
    g.fillRect(0, TOP_Y + 12 * LANE_H, GAME_WIDTH, LANE_H);
  }

  drawLaneLabels() {
    const labels = [
      { row: 1, text: 'BIT-STREAM RIVER  > 1GB/s', color: '#69f3ff' },
      { row: 2, text: 'HIGHWAY OF FAST DATA  > 10GB/s', color: '#9fffb3' },
      { row: 4, text: 'HOLOGRAPHIC PLATFORMS', color: '#8de7ff' },
      { row: 8, text: 'HIGHWAY OF FAST DATA  > 10GB/s', color: '#ffd36d' },
      { row: 10, text: 'DATA SPEED  // VEHICLES', color: '#ffb36d' },
      { row: 12, text: 'STARTING FROG', color: '#7cff7e' },
    ];

    labels.forEach(({ row, text, color }) => {
      this.add.text(92, laneCenter(row) - 12, text, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color,
      }).setDepth(1.8).setAlpha(0.55);
    });
  }

  createLilyPads() {
    this.pads = LILY_POSITIONS.map(x => {
      const pad = this.add.image(x, laneCenter(0), 'lilypad').setDepth(1);
      pad.setBlendMode(Phaser.BlendModes.ADD);
      pad.filled = false;
      pad.isPortal = false;
      return pad;
    });
  }

  createCars() {
    this.cars = [];
    const lanes = [
      { row: 7,  speed: 96,  dir: 1,  count: 3, tex: 'car-red' },
      { row: 8,  speed: 120, dir: -1, count: 3, tex: 'car-blue' },
      { row: 9,  speed: 72,  dir: 1,  count: 4, tex: 'car-yellow' },
      { row: 10, speed: 144, dir: -1, count: 2, tex: 'car-red' },
      { row: 11, speed: 108, dir: 1,  count: 3, tex: 'car-blue' },
    ];
    for (const lane of lanes) {
      const gap = GAME_WIDTH / lane.count;
      for (let i = 0; i < lane.count; i++) {
        const car = this.add.image(gap * i + gap / 2, laneCenter(lane.row), lane.tex).setDepth(2);
        car.setBlendMode(Phaser.BlendModes.ADD);
        car.speed = lane.speed * lane.dir;
        car.setFlipX(lane.dir < 0);
        this.cars.push(car);
      }
    }
  }

  createLogs() {
    this.logs = [];
    const lanes = [
      { row: 1, speed: 50,  dir: 1,  count: 3, wide: false },
      { row: 2, speed: 70,  dir: -1, count: 2, wide: true },
      { row: 3, speed: 40,  dir: 1,  count: 3, wide: false },
      { row: 4, speed: 60,  dir: -1, count: 2, wide: true },
      { row: 5, speed: 55,  dir: 1,  count: 3, wide: false },
    ];
    for (const lane of lanes) {
      const gap = GAME_WIDTH / lane.count;
      for (let i = 0; i < lane.count; i++) {
        const log = this.add.image(gap * i + gap / 2, laneCenter(lane.row), 'log').setDepth(1);
        log.setBlendMode(Phaser.BlendModes.ADD);
        if (lane.wide) log.setScale(2, 1);
        log.speed = lane.speed * lane.dir;
        log.row = lane.row;
        log.halfW = lane.wide ? 64 : 32;
        this.logs.push(log);
      }
    }
  }

  createFrog() {
    this.frogGlow = this.add.circle(GAME_WIDTH / 2, laneCenter(12), 20, COLORS.NEON_GREEN, 0.16)
      .setDepth(4)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.frog = this.add.image(GAME_WIDTH / 2, laneCenter(12), 'frog').setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    this._frogTrailId = TrailSystem.createTrail(this, this.frog, {
      color: COLORS.NEON_GREEN,
      length: 6,
      interval: 48,
      size: 5,
    });
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey('W');
    this.keyA = this.input.keyboard.addKey('A');
    this.keyS = this.input.keyboard.addKey('S');
    this.keyD = this.input.keyboard.addKey('D');
  }

  update(time, delta) {
    super.update(time, delta);
    this.updateLaneFx(time);
    if (this.dead) return;

    const dt = delta / 1000;
    this.moveCars(dt);
    this.moveLogs(dt);
    this.applyLogRiding(dt);
    this.handleInput(time);
    this.checkDangers();
    this.setPlayerPosition(this.frog.x, this.frog.y);
    this.powerUps.checkCollection(this.frog.x, this.frog.y);
    this.glitch.checkDataLeakCollection(this.frog.x, this.frog.y);
    this.tryEnterPortal(this.frog.x, this.frog.y);
    this.syncNeonActors(time);
  }

  syncNeonActors(time) {
    if (this.frogGlow && this.frog) {
      this.frogGlow.setPosition(this.frog.x, this.frog.y);
      this.frogGlow.setScale(1 + Math.sin(time * 0.012) * 0.1);
    }
    this.cars.forEach((car, i) => car.setAlpha(0.82 + Math.sin(time * 0.006 + i) * 0.12));
    this.logs.forEach((log, i) => log.setAlpha(0.72 + Math.sin(time * 0.005 + i) * 0.1));
  }

  moveCars(dt) {
    if (this.enemiesFrozen || this.powerUps.hasEffect('freeze')) return;
    for (const car of this.cars) {
      car.x += car.speed * dt * this.gameSpeed;
      car.angle = Math.sin((this.time.now + car.y * 10) * 0.01) * 1.5;
      if (car.speed > 0 && car.x > GAME_WIDTH + 40) car.x = -40;
      else if (car.speed < 0 && car.x < -40) car.x = GAME_WIDTH + 40;
    }
  }

  moveLogs(dt) {
    for (const log of this.logs) {
      log.x += log.speed * dt * this.gameSpeed;
      log.angle = Math.sin((this.time.now + log.y * 8) * 0.008) * 2.5;
      const edge = log.halfW + 20;
      if (log.speed > 0 && log.x > GAME_WIDTH + edge) log.x = -edge;
      else if (log.speed < 0 && log.x < -edge) log.x = GAME_WIDTH + edge;
    }
  }

  applyLogRiding(dt) {
    if (this.frogRow < 1 || this.frogRow > 5) return;
    const log = this.findLog();
    if (log) this.frog.x += log.speed * dt * this.gameSpeed;
  }

  findLog() {
    for (const log of this.logs) {
      if (log.row === this.frogRow && Math.abs(this.frog.x - log.x) < log.halfW) {
        return log;
      }
    }
    return null;
  }

  handleInput(time) {
    if (time - this.lastHopTime < HOP_COOLDOWN) return;

    let dx = 0;
    let dy = 0;
    const { JustDown } = Phaser.Input.Keyboard;

    const invX = this.horizontalControlInverted;
    const invY = this.verticalControlInverted;
    if (JustDown(this.cursors.up) || JustDown(this.keyW)) dy = invY ? 1 : -1;
    else if (JustDown(this.cursors.down) || JustDown(this.keyS)) dy = invY ? -1 : 1;
    else if (JustDown(this.cursors.left) || JustDown(this.keyA)) dx = invX ? 1 : -1;
    else if (JustDown(this.cursors.right) || JustDown(this.keyD)) dx = invX ? -1 : 1;

    if (dx === 0 && dy === 0) return;

    const newX = Phaser.Math.Clamp(this.frog.x + dx * HOP_X, HOP_X / 2, GAME_WIDTH - HOP_X / 2);
    const newRow = Phaser.Math.Clamp(this.frogRow + dy, 0, 12);

    if (newRow === this.frogRow && Math.abs(newX - this.frog.x) < 1) return;

    const oldX = this.frog.x;
    const oldY = this.frog.y;
    this.frog.x = newX;
    this.lastHopTime = time;

    SFX.hop();

    if (newRow !== this.frogRow) {
      const movedForward = newRow < this.frogRow;
      this.frogRow = newRow;
      this.frog.y = laneCenter(newRow);

      if (movedForward) {
        this.score.award('hop');
        if (newRow < this.highestRow) {
          this.score.award('lane');
          this.highestRow = newRow;
        }
      }
    }

    this.spawnHopFx(oldX, oldY, this.frog.x, this.frog.y, dx, dy);
    this.shakeCamera(dy !== 0 ? 0.0014 : 0.001, 60);

    if (this.frogRow === 0) this.checkLilyPad();
  }

  checkLilyPad() {
    for (const pad of this.pads) {
      if (pad.filled) continue;
      if (Math.abs(this.frog.x - pad.x) < 30) {
        if (pad.isPortal) {
          this.frog.setPosition(pad.x, pad.y);
          ArcadeFX.callout(this, 'ENTER RIFT', pad.x, pad.y - 28, {
            color: COLORS.NEON_MAGENTA,
            fontSize: '16px',
          });
          ArcadeFX.burst(this, pad.x, pad.y, {
            count: 14,
            distance: 44,
            duration: 360,
            colors: [COLORS.NEON_MAGENTA, COLORS.NEON_CYAN, COLORS.WHITE],
            size: 5,
          });
          this.triggerPortal(pad.x, pad.y);
          return;
        }

        pad.filled = true;
        this.filledCount++;
        this.score.award('home', 1, pad.x, pad.y);
        SFX.frogHome();
        this.add.image(pad.x, pad.y, 'frog').setDepth(3);
        ArcadeFX.callout(this, 'HOME', pad.x, pad.y - 24, {
          color: COLORS.NEON_GREEN,
          fontSize: '16px',
        });
        ArcadeFX.burst(this, pad.x, pad.y, {
          count: 10,
          distance: 34,
          duration: 280,
          colors: [COLORS.NEON_GREEN, COLORS.NEON_CYAN, COLORS.WHITE],
          size: 4,
        });

        if (this.filledCount >= PORTAL_THRESHOLD) this.spawnPortalPad();
        this.respawnFrog();
        return;
      }
    }
    this.die();
  }

  spawnPortalPad() {
    const pad = this.pads.find(p => !p.filled && !p.isPortal);
    if (pad) {
      pad.isPortal = true;
      pad.setTexture('lilypad-portal');
      ArcadeFX.callout(this, 'PORTAL PAD', pad.x, pad.y - 24, {
        color: COLORS.NEON_MAGENTA,
        fontSize: '16px',
      });
      GlitchEffect.digitalNoise(this, 160);
      this.tweens.add({
        targets: pad,
        alpha: { from: 1, to: 0.45 },
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 260,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  checkDangers() {
    if (this.frogRow >= 1 && this.frogRow <= 5) {
      if (!this.findLog() || this.frog.x < -20 || this.frog.x > GAME_WIDTH + 20) {
        SFX.splash();
        this.die();
        return;
      }
    }

    if (this.frogRow >= 7 && this.frogRow <= 11) {
      for (const car of this.cars) {
        if (Math.abs(this.frog.y - car.y) < LANE_H * 0.5 && Math.abs(this.frog.x - car.x) < 28) {
          SFX.splat();
          this.die();
          return;
        }
      }
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    const waterDeath = this.frogRow >= 1 && this.frogRow <= 5;

    if (waterDeath) {
      // Neon water splash + ripple
      RippleEffect.spawn(this, this.frog.x, this.frog.y, {
        color: COLORS.NEON_CYAN,
        rings: 3,
        maxRadius: 40,
        duration: 400,
      });
      DebrisSystem.deathBurst(this, this.frog.x, this.frog.y - 5, 'medium', {
        colors: [COLORS.NEON_CYAN, COLORS.WHITE, COLORS.NEON_BLUE],
        gravity: -30,
      });
      // Shrink into water
      this.tweens.add({
        targets: this.frog,
        scaleX: 0.2, scaleY: 0.2, alpha: 0,
        duration: 200,
      });
    } else {
      // Road splat staging: flatten + debris
      this.tweens.add({
        targets: this.frog,
        scaleY: 0.2, alpha: 0,
        duration: 150,
      });
      DebrisSystem.deathBurst(this, this.frog.x, this.frog.y, 'medium', {
        colors: [COLORS.NEON_RED, COLORS.NEON_ORANGE, COLORS.WHITE],
      });
      ArcadeFX.callout(this, 'COLLISION', this.frog.x, this.frog.y - 20, {
        color: COLORS.NEON_RED,
        fontSize: '14px',
        duration: 600,
      });
    }

    ArcadeFX.screenTint(this, {
      color: waterDeath ? COLORS.NEON_CYAN : COLORS.NEON_RED,
      alpha: 0.1,
      duration: 180,
    });
    this.time.delayedCall(250, () => { this.frog.setVisible(false); });
    const alive = this.onPlayerDeath();
    if (alive) {
      this.time.delayedCall(500, () => {
        this.respawnFrog();
        this.dead = false;
      });
    }
  }

  showPortalHint() {
    this._showHintText('▸ HOP ONTO THE GLOWING LILY PAD ▸');
  }

  respawnFrog() {
    this.frogRow = 12;
    this.highestRow = 12;
    this.frog.setPosition(GAME_WIDTH / 2, laneCenter(12));
    this.frog.setVisible(true);
    this.frog.setAlpha(0.2);
    this.frog.setScale(0.7);
    this.tweens.add({
      targets: this.frog,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
    ArcadeFX.flash(this, this.frog.x, this.frog.y, {
      color: COLORS.NEON_GREEN,
      radius: 14,
      alpha: 0.24,
      duration: 180,
    });
  }

  updateLaneFx(time) {
    if (!this.laneFx) return;
    const g = this.laneFx;
    g.clear();

    g.fillStyle(COLORS.NEON_CYAN, 0.06);
    for (let r = 1; r <= 5; r++) {
      const y = laneCenter(r);
      for (let i = 0; i < 5; i++) {
        const waveX = ((time * 0.08) + i * 170 + r * 30) % (GAME_WIDTH + 80) - 40;
        g.fillRect(waveX, y - 8, 36, 2);
      }
    }

    g.fillStyle(COLORS.NEON_ORANGE, 0.05);
    for (let r = 7; r <= 11; r++) {
      const y = laneCenter(r);
      for (let i = 0; i < 4; i++) {
        const roadX = ((time * 0.14) + i * 220 + r * 40) % (GAME_WIDTH + 120) - 60;
        g.fillRect(roadX, y, 28, 1.5);
      }
    }
  }

  spawnHopFx(oldX, oldY, newX, newY, dx, dy) {
    const color = dy < 0 ? COLORS.NEON_GREEN : COLORS.NEON_CYAN;

    // Smear trail
    const smear = this.add.rectangle((oldX + newX) / 2, (oldY + newY) / 2, dx !== 0 ? 24 : 10, dy !== 0 ? 26 : 10, color, 0.14)
      .setDepth(4);
    this.tweens.add({
      targets: smear,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 120,
      onComplete: () => smear.destroy(),
    });

    // Squash on takeoff → stretch in air → squash on landing
    this.frog.setScale(
      dx !== 0 ? 0.7 : 1.3,
      dy !== 0 ? 1.3 : 0.7
    );
    this.tweens.add({
      targets: this.frog,
      scaleX: dx !== 0 ? 1.3 : 0.7,
      scaleY: dy !== 0 ? 0.7 : 1.3,
      duration: 60,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.frog,
          scaleX: 1, scaleY: 1,
          duration: 80,
          ease: 'Back.easeOut',
        });
      },
    });

    // Landing ripple
    RippleEffect.spawn(this, newX, newY, {
      color: COLORS.NEON_GREEN,
      rings: 2,
      maxRadius: 18,
      duration: 250,
      lineWidth: 1,
    });

    ArcadeFX.flash(this, newX, newY, {
      color,
      radius: 10,
      alpha: 0.18,
      duration: 120,
    });
  }
}
