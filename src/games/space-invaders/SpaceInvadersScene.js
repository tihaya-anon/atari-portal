import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import { GameManager } from '../../core/GameManager.js';
import { BaseGameScene } from '../BaseGameScene.js';
import SFX from '../../core/SFXManager.js';
import GlitchEffect from '../../vfx/GlitchEffect.js';
import ArcadeFX from '../../vfx/ArcadeFX.js';
import DebrisSystem from '../../vfx/DebrisSystem.js';
import RippleEffect from '../../vfx/RippleEffect.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';

const COLS = 11;
const ROWS = 5;
const INVADER_SPACING_X = 48;
const INVADER_SPACING_Y = 36;
const GRID_TOP = 70;
const PLAYER_Y = GAME_HEIGHT - 40;
const BULLET_SPEED = -420;
const BOMB_SPEED = 220;
const PLAYER_SPEED = 260;
const BASE_MOVE_INTERVAL = 900;
const MIN_MOVE_INTERVAL = 160;
const STEP_DOWN = 16;
const BOMB_INTERVAL_MIN = 600;
const BOMB_INTERVAL_MAX = 1800;
const MOTHERSHIP_SPEED = 120;
const INVINCIBILITY_MS = 1500;
const SPREAD_VX = 120;
const DOUBLE_SHOT_OFFSET = 10;

export class SpaceInvadersScene extends BaseGameScene {
  constructor() {
    super('SpaceInvadersScene', 'spaceInvaders');
  }

  create() {
    super.create();

    this.invaders = this.add.group();
    this.bullets = this.add.group();
    this.bombs = this.add.group();

    this.direction = 1;
    this.moveTimer = 0;
    this.bombTimer = 0;
    this.portalTriggered = false;
    this.mothershipActive = false;
    this.portalMothershipSpawned = false;
    this.invincible = false;
    this.shieldCharges = 0;
    this._criticalWaveCueShown = false;

    this.drawCyberArena();
    this.createPlayer();
    this.createInvaderGrid();
    this.totalInvaders = this.invaders.getChildren().length;
    this.aliveCount = this.totalInvaders;

    this._onPowerUpCollected = (def) => {
      if (def.id === 'bomb') {
        this.applyBombPowerUp();
      } else if (def.id === 'shield') {
        this.shieldCharges++;
      }
    };
    this.events.on('powerup-collected', this._onPowerUpCollected);

    this.setupInput();
    this.scheduleMothership();
    this._createShields();
  }

  drawCyberArena() {
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_RED,
      secondary: COLORS.NEON_ORANGE,
      accent: COLORS.NEON_CYAN,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 0.95,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_RED, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'SPACE INVADERS: CYBER SWARM',
      subtitle: 'MALWARE DEFENSE // AUTONOMOUS WAVE',
      primary: COLORS.NEON_RED,
      accent: COLORS.NEON_ORANGE,
    });
    CyberSceneFX.drawHoloPanel(this, 100, 150, 130, 96, {
      primary: COLORS.NEON_RED,
      accent: COLORS.NEON_ORANGE,
      depth: -5,
      tilt: -0.12,
    });
    CyberSceneFX.drawHoloPanel(this, GAME_WIDTH - 100, 150, 130, 96, {
      primary: COLORS.NEON_RED,
      accent: COLORS.NEON_ORANGE,
      depth: -5,
      tilt: 0.12,
    });
  }

  _createShields() {
    this.shields = [];
    const shieldCount = 4;
    const spacing = GAME_WIDTH / (shieldCount + 1);
    for (let i = 0; i < shieldCount; i++) {
      const sx = spacing * (i + 1);
      const sy = PLAYER_Y - 50;
      const shield = this.add.image(sx, sy, 'shield')
        .setDisplaySize(40, 30)
        .setAlpha(0.8)
        .setDepth(8);
      shield.setData('hp', 4);
      shield.setData('maxHp', 4);
      shield.setBlendMode(Phaser.BlendModes.ADD);
      this.shields.push(shield);
    }
  }

  _damageShield(shield, hitX, hitY) {
    const hp = shield.getData('hp') - 1;
    shield.setData('hp', hp);
    RippleEffect.spawn(this, hitX || shield.x, hitY || shield.y, {
      color: 0xffd700,
      rings: 2,
      maxRadius: 25,
      duration: 300,
    });
    shield.setAlpha(hp / shield.getData('maxHp') * 0.6 + 0.2);
    this.tweens.add({
      targets: shield,
      alpha: shield.alpha - 0.15,
      duration: 60,
      yoyo: true,
    });
    if (hp <= 0) {
      DebrisSystem.shatter(this, shield.x, shield.y, {
        count: 8,
        colors: [0xffd700, COLORS.NEON_YELLOW, COLORS.WHITE],
        size: 4,
        spread: 30,
      });
      shield.destroy();
      const idx = this.shields.indexOf(shield);
      if (idx !== -1) this.shields.splice(idx, 1);
    }
  }

  createPlayer() {
    this.player = this.add.rectangle(
      GAME_WIDTH / 2, PLAYER_Y, 28, 16, COLORS.GREEN
    );
    this.player.setData('texture', 'player-ship');
    this.playerAlive = true;

    const tex = this.textures.exists('player-ship');
    if (tex) {
      this.player.destroy();
      this.player = this.add.sprite(GAME_WIDTH / 2, PLAYER_Y, 'player-ship');
    }
    this.player.setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.playerGlow = this.add.circle(this.player.x, this.player.y, 22, COLORS.NEON_ORANGE, 0.14)
      .setDepth(10)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  createInvaderGrid() {
    const mult = GameManager.mutationSystem.enemyMultiplier;
    const extraRows = mult > 1 ? Math.floor((mult - 1) * ROWS) : 0;
    const totalRows = ROWS + extraRows;

    const gridWidth = (COLS - 1) * INVADER_SPACING_X;
    const startX = (GAME_WIDTH - gridWidth) / 2;

    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = startX + col * INVADER_SPACING_X;
        const y = GRID_TOP + row * INVADER_SPACING_Y;

        let invader;
        if (this.textures.exists('invader')) {
          invader = this.add.sprite(x, y, 'invader');
        } else {
          invader = this.add.rectangle(x, y, 22, 16, row < 2 ? COLORS.RED : COLORS.WHITE);
        }

        invader.setData('alive', true);
        invader.setData('row', row);
        invader.setData('col', col);
        invader.setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
        this.invaders.add(invader);
      }
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update(time, delta) {
    super.update(time, delta);

    if (!this.playerAlive) return;

    this.updatePlayer(delta);
    this.updateBullets();
    this.updateBombs();
    this.updateInvaders(delta);
    this.updateMothership(delta);
    this.checkBombTimer(time);

    this.setPlayerPosition(this.player.x, this.player.y);
    this.powerUps.checkCollection(this.player.x, this.player.y);
    this.glitch.checkDataLeakCollection(this.player.x, this.player.y);

    if (this.portal.portalActive) {
      this.tryEnterPortal(this.player.x, this.player.y);
    }
    this.syncNeonActors(time);
  }

  syncNeonActors(time) {
    if (this.playerGlow && this.player) {
      this.playerGlow.setPosition(this.player.x, this.player.y);
      this.playerGlow.setScale(1 + Math.sin(time * 0.012) * 0.12);
      this.playerGlow.setVisible(this.player.visible);
    }
    this.invaders.getChildren().forEach((invader) => {
      if (!invader.active) return;
      invader.setAlpha(0.82 + Math.sin(time * 0.006 + invader.getData('col')) * 0.18);
    });
  }

  updatePlayer(delta) {
    const dt = delta / 1000;
    let vx = 0;
    let vy = 0;
    const minY = GAME_HEIGHT * 0.5;
    const maxY = GAME_HEIGHT - 16;

    const invX = this.horizontalControlInverted;
    const invY = this.verticalControlInverted;
    if ((invX ? (this.cursors.right.isDown || this.keyD.isDown) : (this.cursors.left.isDown || this.keyA.isDown))) vx = -PLAYER_SPEED;
    else if ((invX ? (this.cursors.left.isDown || this.keyA.isDown) : (this.cursors.right.isDown || this.keyD.isDown))) vx = PLAYER_SPEED;

    if ((invY ? (this.cursors.down.isDown || this.keyS.isDown) : (this.cursors.up.isDown || this.keyW.isDown))) vy = -PLAYER_SPEED;
    else if ((invY ? (this.cursors.up.isDown || this.keyW.isDown) : (this.cursors.down.isDown || this.keyS.isDown))) vy = PLAYER_SPEED;

    this.player.x = Phaser.Math.Clamp(this.player.x + vx * dt, 16, GAME_WIDTH - 16);
    this.player.y = Phaser.Math.Clamp(this.player.y + vy * dt, minY, maxY);

    if (Phaser.Input.Keyboard.JustDown(this.fireKey) && this.bullets.getLength() === 0) {
      this.fireBullet();
    }
  }

  fireBullet() {
    const py = this.player.y - 14;
    const spread = this.powerUps.hasEffect('spread');
    const doubleShot = GameManager.modSystem.hasMod('double_shot');

    if (spread) {
      this.spawnPlayerBullet(this.player.x, py, 0);
      this.spawnPlayerBullet(this.player.x, py, -SPREAD_VX);
      this.spawnPlayerBullet(this.player.x, py, SPREAD_VX);
    } else if (doubleShot) {
      this.spawnPlayerBullet(this.player.x - DOUBLE_SHOT_OFFSET, py, 0);
      this.spawnPlayerBullet(this.player.x + DOUBLE_SHOT_OFFSET, py, 0);
    } else {
      this.spawnPlayerBullet(this.player.x, py, 0);
    }
    ArcadeFX.burst(this, this.player.x, py, {
      count: 8,
      distance: 24,
      duration: 160,
      colors: [COLORS.NEON_CYAN, COLORS.WHITE],
      size: 4,
    });
    SFX.siShoot();
  }

  spawnPlayerBullet(x, y, vx) {
    let bullet;
    if (this.textures.exists('bullet')) {
      bullet = this.add.sprite(x, y, 'bullet');
    } else {
      bullet = this.add.rectangle(x, y, 4, 12, COLORS.CYAN);
    }
    if (vx) bullet.setData('vx', vx);
    this.bullets.add(bullet);
  }

  updateBullets() {
    const dt = this.game.loop.delta / 1000;

    this.bullets.getChildren().forEach(bullet => {
      bullet.y += BULLET_SPEED * dt;
      const bvx = bullet.getData('vx');
      if (bvx) bullet.x += bvx * dt;

      if (bullet.y < this.gameArea.y) {
        bullet.destroy();
        return;
      }

      if (this.mothershipSprite && this.mothershipSprite.active) {
        if (this.hitTest(bullet, this.mothershipSprite, 30, 12)) {
          this.onMothershipHit(bullet);
          return;
        }
      }

      for (const invader of this.invaders.getChildren()) {
        if (!invader.getData('alive')) continue;
        if (this.hitTest(bullet, invader, 16, 12)) {
          this.onInvaderHit(bullet, invader);
          return;
        }
      }
    });
  }

  hitTest(a, b, hw, hh) {
    return Math.abs(a.x - b.x) < hw && Math.abs(a.y - b.y) < hh;
  }

  onInvaderHit(bullet, invader) {
    bullet.destroy();
    this.killInvader(invader);
  }

  killInvader(invader) {
    const ix = invader.x;
    const iy = invader.y;

    this.aliveCount--;
    this.score.award('invader', 1, ix, iy);
    SFX.invaderHit();

    if (GameManager.mutationSystem.enemyDropCoins) {
      GameManager.addCoins(1);
      this.events.emit('coins-changed', GameManager.state.coins);
    }

    // Scale-pop: scale up → shrink → destroy
    this.tweens.add({
      targets: invader,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 50,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: invader,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 100,
          ease: 'Quad.easeIn',
          onComplete: () => {
            invader.setData('alive', false);
            invader.setVisible(false);
            invader.setActive(false);
          },
        });
      },
    });

    this.flashEffect(ix, iy, COLORS.WHITE);
    DebrisSystem.deathBurst(this, ix, iy, 'medium', {
      colors: [COLORS.NEON_RED, COLORS.NEON_MAGENTA, COLORS.WHITE],
    });

    if (this.shouldTriggerPortalMothership()) {
      this.spawnPortalMothership();
    }
  }

  applyBombPowerUp() {
    const alive = this.invaders.getChildren().filter(i => i.getData('alive'));
    let n = Math.min(5, alive.length);
    while (n > 0 && alive.length > 0) {
      const idx = Phaser.Math.Between(0, alive.length - 1);
      const inv = alive.splice(idx, 1)[0];
      this.time.delayedCall((5 - n) * 70, () => {
        if (inv.active && inv.getData('alive')) this.killInvader(inv);
      });
      n--;
    }
  }

  onMothershipHit(bullet) {
    bullet.destroy();
    const mx = this.mothershipSprite.x;
    const my = this.mothershipSprite.y;
    const isPortalShip = this.mothershipSprite.getData('portalShip');

    this.score.award('mothership');
    this.flashEffect(mx, my, isPortalShip ? COLORS.NEON_MAGENTA : COLORS.RED);
    this.explosionEffect(mx, my, isPortalShip ? 16 : 12, [COLORS.RED, COLORS.NEON_MAGENTA, COLORS.WHITE], isPortalShip ? 84 : 64, isPortalShip ? 600 : 420);

    this.mothershipSprite.destroy();
    this.mothershipSprite = null;
    this.mothershipActive = false;

    if (isPortalShip && !this.portalTriggered) {
      this.portalTriggered = true;
      ArcadeFX.callout(this, 'RIFT OPEN', mx, my - 24, {
        color: COLORS.NEON_MAGENTA,
        fontSize: '20px',
      });
      GlitchEffect.screenTear(this, 260);
      ArcadeFX.screenTint(this, { color: COLORS.NEON_MAGENTA, alpha: 0.12, duration: 260 });
      this.time.delayedCall(400, () => this.triggerPortal(mx, my));
    }
  }

  shouldTriggerPortalMothership() {
    if (this.portalTriggered || this.portalMothershipSpawned) return false;
    return this.aliveCount <= Math.floor(this.totalInvaders * 0.3);
  }

  spawnPortalMothership() {
    this.portalMothershipSpawned = true;
    this.time.delayedCall(1200, () => {
      this.spawnMothership(true);
    });
  }

  scheduleMothership() {
    const delay = Phaser.Math.Between(10000, 20000);
    this.time.delayedCall(delay, () => {
      if (!this.mothershipActive && this.playerAlive) {
        this.spawnMothership(false);
      }
      if (this.playerAlive) this.scheduleMothership();
    });
  }

  spawnMothership(isPortalShip) {
    if (this.mothershipActive) return;
    this.mothershipActive = true;

    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -30 : GAME_WIDTH + 30;
    const dir = fromLeft ? 1 : -1;

    if (this.textures.exists('mothership')) {
      this.mothershipSprite = this.add.sprite(startX, this.gameArea.y + 20, 'mothership');
    } else {
      this.mothershipSprite = this.add.rectangle(startX, this.gameArea.y + 20, 32, 14, COLORS.RED);
    }

    this.mothershipSprite.setData('dir', dir);
    this.mothershipSprite.setData('portalShip', isPortalShip);
    ArcadeFX.flash(this, startX, this.gameArea.y + 20, {
      color: isPortalShip ? COLORS.NEON_MAGENTA : COLORS.RED,
      radius: 20,
      alpha: 0.35,
      duration: 220,
      shape: 'rect',
    });
    if (isPortalShip) {
      ArcadeFX.callout(this, 'PORTAL SHIP', GAME_WIDTH / 2, this.gameArea.y + 32, {
        color: COLORS.NEON_MAGENTA,
        fontSize: '18px',
      });
    }

    if (isPortalShip) {
      this.tweens.add({
        targets: this.mothershipSprite,
        alpha: { from: 1, to: 0.4 },
        duration: 300,
        yoyo: true,
        repeat: -1,
      });
      this.tweens.add({
        targets: this.mothershipSprite,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 320,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  updateMothership(delta) {
    if (!this.mothershipSprite || !this.mothershipSprite.active) return;

    const dt = delta / 1000;
    const dir = this.mothershipSprite.getData('dir');
    this.mothershipSprite.x += MOTHERSHIP_SPEED * dir * dt;

    if (this.mothershipSprite.x < -50 || this.mothershipSprite.x > GAME_WIDTH + 50) {
      this.mothershipSprite.destroy();
      this.mothershipSprite = null;
      this.mothershipActive = false;
    }
  }

  checkBombTimer(time) {
    if (this.enemiesFrozen) return;
    if (time < this.bombTimer) return;

    const alive = this.invaders.getChildren().filter(i => i.getData('alive'));
    if (alive.length === 0) return;

    const shooter = Phaser.Utils.Array.GetRandom(alive);
    this.dropBomb(shooter.x, shooter.y);

    this.bombTimer = time + Phaser.Math.Between(BOMB_INTERVAL_MIN, BOMB_INTERVAL_MAX);
  }

  dropBomb(x, y) {
    let bomb;
    if (this.textures.exists('enemy-bullet')) {
      bomb = this.add.sprite(x, y + 10, 'enemy-bullet');
    } else {
      bomb = this.add.rectangle(x, y + 10, 4, 10, COLORS.YELLOW);
    }
    this.bombs.add(bomb);
    ArcadeFX.flash(this, x, y + 10, {
      color: COLORS.NEON_ORANGE,
      radius: 10,
      alpha: 0.28,
      duration: 140,
      shape: 'rect',
    });
    const telegraph = this.add.rectangle(x, y + 28, 3, 28, COLORS.NEON_ORANGE, 0.18).setDepth(8);
    this.tweens.add({
      targets: telegraph,
      alpha: 0,
      scaleY: 0.4,
      duration: 120,
      onComplete: () => telegraph.destroy(),
    });
    SFX.bombDrop();
  }

  updateBombs() {
    const dt = this.game.loop.delta / 1000;

    this.bombs.getChildren().forEach(bomb => {
      bomb.y += BOMB_SPEED * dt;

      if (bomb.y > GAME_HEIGHT) {
        bomb.destroy();
        return;
      }

      // Check shield collision
      let shieldHit = false;
      if (this.shields) {
        for (const sh of this.shields) {
          if (!sh || !sh.active) continue;
          const dx = Math.abs(bomb.x - sh.x);
          const dy = Math.abs(bomb.y - sh.y);
          if (dx < 22 && dy < 17) {
            bomb.destroy();
            this._damageShield(sh, bomb.x, bomb.y);
            shieldHit = true;
            break;
          }
        }
      }
      if (shieldHit) return;

      if (!this.invincible && this.hitTest(bomb, this.player, 14, 12)) {
        bomb.destroy();
        this.onHit();
      }
    });
  }

  updateInvaders(delta) {
    if (this.enemiesFrozen) return;
    this.moveTimer -= delta;
    if (this.moveTimer > 0) return;

    const ratio = this.aliveCount / this.totalInvaders;
    this.moveTimer = Phaser.Math.Linear(MIN_MOVE_INTERVAL, BASE_MOVE_INTERVAL, ratio) / GameManager.speedMultiplier;
    if (ratio <= 0.28 && !this._criticalWaveCueShown) {
      this._criticalWaveCueShown = true;
      ArcadeFX.callout(this, 'FINAL SWARM', GAME_WIDTH / 2, GRID_TOP - 20, {
        color: COLORS.NEON_ORANGE,
        fontSize: '20px',
      });
      ArcadeFX.screenTint(this, { color: COLORS.NEON_ORANGE, alpha: 0.08, duration: 220 });
    }

    let edgeHit = false;
    const alive = this.invaders.getChildren().filter(i => i.getData('alive'));

    for (const inv of alive) {
      const nx = inv.x + this.direction * 12;
      if (nx < 20 || nx > GAME_WIDTH - 20) {
        edgeHit = true;
        break;
      }
    }

    if (edgeHit) {
      this.direction *= -1;
      this.shakeCamera(0.0015 + (1 - ratio) * 0.0025, 90);
      for (const inv of alive) {
        inv.y += STEP_DOWN;
        if (inv.y >= PLAYER_Y - 20) {
          this.onInvadersReachedBottom();
          return;
        }
      }
    } else {
      for (const inv of alive) {
        inv.x += this.direction * 12;
      }
    }
  }

  onInvadersReachedBottom() {
    this.onHit();
  }

  onHit() {
    if (this.invincible) return;

    if (this.shieldCharges > 0) {
      this.shieldCharges--;
      this.flashEffect(this.player.x, this.player.y, COLORS.NEON_CYAN);
      this.explosionEffect(this.player.x, this.player.y, 10, [COLORS.NEON_CYAN, COLORS.WHITE], 34, 220);
      ArcadeFX.screenTint(this, { color: COLORS.NEON_CYAN, alpha: 0.08, duration: 140 });
      return;
    }

    this.flashEffect(this.player.x, this.player.y, COLORS.RED);
    this.explosionEffect(this.player.x, this.player.y, 14, [COLORS.NEON_RED, COLORS.NEON_ORANGE, COLORS.WHITE], 52, 320);
    GlitchEffect.chromaticAberration(this, 180);
    ArcadeFX.screenTint(this, { color: COLORS.NEON_RED, alpha: 0.12, duration: 180 });
    const alive = this.onPlayerDeath();

    if (alive) {
      this.invincible = true;
      this.tweens.add({
        targets: this.player,
        alpha: { from: 0.2, to: 1 },
        duration: 120,
        yoyo: true,
        repeat: Math.floor(INVINCIBILITY_MS / 240),
        onComplete: () => {
          this.invincible = false;
          this.player.setAlpha(1);
        },
      });
    } else {
      this.playerAlive = false;
    }
  }

  showPortalHint() {
    this._showHintText('▸ FLY YOUR SHIP INTO THE PORTAL (↑↓←→) ▸');
  }

  onPortalForceSpawn() {
    if (!this.portalTriggered) {
      this.portalTriggered = true;
      this.triggerPortal(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
  }

  flashEffect(x, y, color) {
    ArcadeFX.flash(this, x, y, {
      color,
      radius: 16,
      alpha: 0.45,
      duration: 220,
      scale: 2.1,
      shape: 'rect',
    });
  }

  explosionEffect(x, y, count = 8, colors = [COLORS.RED, COLORS.YELLOW, COLORS.WHITE], distance = 60, duration = 500) {
    ArcadeFX.burst(this, x, y, {
      count,
      colors,
      distance,
      duration,
      size: 6,
      shape: 'rect',
    });
  }

  shutdown() {
    try { this.events.off('powerup-collected', this._onPowerUpCollected); } catch (_) {}
    super.shutdown();
  }
}
