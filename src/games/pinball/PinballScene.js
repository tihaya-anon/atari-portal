import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import SFX from '../../core/SFXManager.js';
import AudioReactive from '../../core/AudioReactiveSystem.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';

export class PinballScene extends BaseGameScene {
  constructor() {
    super('PinballScene', 'breakout'); 
    this.plungeForce = 0;
    this.hitCount = 0; 
  }

  create() {
    super.create();
    
    // 👉 多球狂热只触发一次的全局锁
    this.multiballTriggered = false;

    this.physics.world.gravity.y = 1200; 
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.drawCyberArena();
    this.tableBounds = this.physics.add.staticGroup();
    this.pearls = this.physics.add.staticGroup(); 

    const buildWall = (x, y, w, h, angle = 0, color = 0xffffff) => {
      const wall = this.tableBounds.create(x, y, 'pinball-bound');
      wall.setScale(w / 20, h / 20).setAngle(angle).setTint(color).refreshBody();
      return wall;
    };
    
    const buildSlantedWall = (x, y, w, angle, color) => {
      this.add.image(x, y, 'pinball-bound').setScale(w / 20, 1).setAngle(angle).setTint(color).setBlendMode(Phaser.BlendModes.ADD);
      const rad = angle * Math.PI / 180;
      const startX = x - Math.cos(rad) * (w / 2), startY = y - Math.sin(rad) * (w / 2);
      const endX = x + Math.cos(rad) * (w / 2), endY = y + Math.sin(rad) * (w / 2);
      
      const steps = Math.ceil(w / 12);
      for (let i = 0; i <= steps; i++) {
        const node = this.pearls.create(startX + (endX - startX) * (i / steps), startY + (endY - startY) * (i / steps), 'pinball-bound'); 
        node.setScale(1.5).setVisible(false).refreshBody();
      }
    };

    buildWall(10, 300, 20, 600); buildWall(790, 300, 20, 600); buildWall(400, 10, 800, 20);           
    buildWall(735, 380, 20, 440); buildWall(765, 570, 40, 20, 0, 0x00f0ff); 
    buildSlantedWall(735, 50, 160, 45, 0xffffff);
    buildSlantedWall(80, 50, 200, -45, 0xffffff);      
    buildSlantedWall(130, 450, 245, 20, 0xb845ff); 
    buildSlantedWall(610, 450, 245, -20, 0xb845ff);

    this.balls = this.physics.add.group();

    this.targets = this.physics.add.staticGroup();
    this.spawnMultiballTargets();

    this.bumpers = this.physics.add.staticGroup();
    [{ x: 370, y: 220 }, { x: 300, y: 320 }, { x: 450, y: 320 },  { x: 120, y: 400 }, { x: 660, y: 400 }].forEach(pos => {
      this.bumpers.create(pos.x, pos.y, 'bumper-ring').setCircle(26).setBlendMode(Phaser.BlendModes.ADD);
    });

    this.wormholeL = this.physics.add.sprite(120, 60, 'wormhole').setBlendMode(Phaser.BlendModes.ADD);
    this.wormholeL.body.setAllowGravity(false).setImmovable(true).setCircle(30, 10, 10);
    this.wormholeR = this.physics.add.sprite(600, 60, 'wormhole').setBlendMode(Phaser.BlendModes.ADD);
    this.wormholeR.body.setAllowGravity(false).setImmovable(true).setCircle(30, 10, 10);

    this.bossHealth = 5;
    this.boss = this.physics.add.image(GAME_WIDTH / 2, 80, 'boss').setBlendMode(Phaser.BlendModes.ADD);
    this.boss.body.setImmovable(true).setAllowGravity(false).setCircle(30);
    this.tweens.add({ targets: this.boss, x: {from: 250, to: 550}, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ==========================================
    // 🕹️ 四把拨杆构建区
    // ==========================================
    // 1. 底部左拨杆
    this.leftFlipper = this.add.container(250, 530);
    this.leftFlipper.add(this.add.image(50, 0, 'flipper').setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD));
    this.physics.add.existing(this.leftFlipper);
    this.leftFlipper.body.setImmovable(true).setAllowGravity(false).setSize(100, 24).setOffset(0, -12); 

    // 2. 底部右拨杆
    this.rightFlipper = this.add.container(490, 530);
    this.rightFlipper.add(this.add.image(-50, 0, 'flipper').setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD));
    this.physics.add.existing(this.rightFlipper);
    this.rightFlipper.body.setImmovable(true).setAllowGravity(false).setSize(100, 24).setOffset(-100, -12); 

    // 🌟 3. 新增：顶部左拨杆
    this.upperLeftFlipper = this.add.container(10, 250);
    this.upperLeftFlipper.add(this.add.image(50, 0, 'flipper').setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD));
    this.physics.add.existing(this.upperLeftFlipper);
    this.upperLeftFlipper.body.setImmovable(true).setAllowGravity(false).setSize(100, 24).setOffset(0, -12); 

    // 🌟 4. 新增：顶部右拨杆
    this.upperRightFlipper = this.add.container(720, 250);
    this.upperRightFlipper.add(this.add.image(-50, 0, 'flipper').setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD));
    this.physics.add.existing(this.upperRightFlipper);
    this.upperRightFlipper.body.setImmovable(true).setAllowGravity(false).setSize(100, 24).setOffset(-100, -12); 

    // ==========================================
    // ⚡ 物理碰撞注册区
    // ==========================================
    this.physics.add.collider(this.balls, this.tableBounds);
    this.physics.add.collider(this.balls, this.bumpers, this.onHitBumper, null, this);
    this.physics.add.collider(this.balls, this.targets, this.onHitTarget, null, this);
    this.physics.add.collider(this.balls, this.boss, this.onHitBoss, null, this);
    
    // 注册所有 4 把拨杆的碰撞
    this.physics.add.collider(this.balls, this.leftFlipper, this.onHitFlipper, null, this);
    this.physics.add.collider(this.balls, this.rightFlipper, this.onHitFlipper, null, this);
    this.physics.add.collider(this.balls, this.upperLeftFlipper, this.onHitFlipper, null, this);
    this.physics.add.collider(this.balls, this.upperRightFlipper, this.onHitFlipper, null, this);

    this.physics.add.collider(this.balls, this.pearls, (obj1, obj2) => {
      const { ball } = this.getCollisionPair(obj1, obj2);
      if (ball) ball.body.velocity.x += (ball.x < GAME_WIDTH / 2) ? 40 : -40; 
    });

    this.physics.add.overlap(this.balls, [this.wormholeL, this.wormholeR], this.onEnterWormhole, null, this);

    this.setupControls();
    this.plungeText = this.add.text(765, 540, 'SPACE', { fontSize: '10px', color: '#00f0ff' }).setOrigin(0.5);
    this.comboText = this.add.text(GAME_WIDTH / 2, 20, '', { fontSize: '18px', color: '#ff00e6', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
    
    this.spawnBall(765, 450);
  }

  drawCyberArena() {
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_MAGENTA,
      secondary: COLORS.NEON_PURPLE,
      accent: COLORS.WHITE,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 0.9,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_MAGENTA, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'PINBALL: WORMHOLE TABLE',
      subtitle: 'MULTIBALL // BOSS CORE',
      primary: COLORS.NEON_MAGENTA,
      accent: COLORS.NEON_PURPLE,
    });
  }

  getCollisionPair(obj1, obj2) {
    const isObj1Ball = obj1.texture && obj1.texture.key === 'pin-ball';
    return isObj1Ball ? { ball: obj1, other: obj2 } : { ball: obj2, other: obj1 };
  }

  spawnBall(x, y) {
    const ball = this.balls.create(x, y, 'pin-ball');
    ball.setDepth(20).setBlendMode(Phaser.BlendModes.ADD);
    ball.setCollideWorldBounds(true);
    ball.setBounce(0.95);
    ball.body.setCircle(10, 6, 6);
    ball.setMaxVelocity(2500, 2500);
    ball.setData('inWormhole', false); 
    return ball;
  }

  spawnMultiballTargets() {
    this.activeTargets = 3;
    [{ x: 220, y: 250 }, { x: 370, y: 150 }, { x: 520, y: 250 }].forEach(pos => {
      this.targets.create(pos.x, pos.y, 'target-drop').setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);
    });
  }

  setupControls() {
    this.keyA = this.input.keyboard.addKey('A');
    this.keyD = this.input.keyboard.addKey('D');
    this.keySpace = this.input.keyboard.addKey('SPACE'); 
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  handleCombo() {
    this.hitCount++;
    const mult = Math.min(1 + (this.hitCount * 0.05), 2.5);
    if (this.hitCount > 1) {
      this.comboText.setText(`COMBO x${this.hitCount} | SPD ${(mult).toFixed(1)}x`);
      this.comboText.setScale(1.5);
      this.tweens.add({ targets: this.comboText, scale: 1, duration: 200 }); 
    }
    return mult;
  }
  
  resetCombo() { 
    this.hitCount = 0; 
    this.comboText.setText(''); 
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.gameOver || this._ending) return;

    this.wormholeL.rotation -= 0.05;
    this.wormholeR.rotation += 0.05;

    const invX = this.horizontalControlInverted;
    const isLeftDown = this.keyA.isDown || this.cursors.left.isDown;
    const isRightDown = this.keyD.isDown || this.cursors.right.isDown;

    // 🌟 控制 4 把拨杆的角度：左侧一起动，右侧一起动
    this.leftFlipper.setAngle((!invX && isLeftDown) || (invX && isRightDown) ? -30 : 20);
    this.upperLeftFlipper.setAngle((!invX && isLeftDown) || (invX && isRightDown) ? -30 : 20);

    this.rightFlipper.setAngle((!invX && isRightDown) || (invX && isLeftDown) ? 30 : -20);
    this.upperRightFlipper.setAngle((!invX && isRightDown) || (invX && isLeftDown) ? 30 : -20);

    if (this.keySpace.isDown) {
      this.plungeForce = Phaser.Math.Clamp(this.plungeForce + delta * 4, 0, 2200); 
      this.plungeText.setAlpha(Math.sin(time / 30)); this.plungeText.setColor('#ff00e6'); 
    } else if (Phaser.Input.Keyboard.JustUp(this.keySpace)) {
      let plunged = false;
      this.balls.getChildren().forEach(ball => {
        if (ball.x > 730 && ball.y > 400) {
          ball.setVelocityY(-Math.max(this.plungeForce, 1200));
          plunged = true;
        }
      });
      if (plunged) { SFX.powerPellet && SFX.powerPellet(); this.resetCombo(); }
      this.plungeForce = 0;
      this.plungeText.setAlpha(1); this.plungeText.setColor('#00f0ff'); 
    }

    this.balls.getChildren().forEach(ball => {
      if (ball.y > GAME_HEIGHT + 20) {
        ball.destroy(); 
      }
    });

    if (this.balls.countActive() === 0 && !this.gameOver) {
      this.onPlayerDeath();
      this.resetCombo(); 
      this.spawnBall(765, 450); 
    }
    
    if (this.balls.countActive() > 0) {
      const activeBall = this.balls.getChildren()[0];
      this.setPlayerPosition(activeBall.x, activeBall.y);
      this.balls.getChildren().forEach(b => this.tryEnterPortal(b.x, b.y));
    }
    this.syncNeonActors(time);
  }

  syncNeonActors(time) {
    this.balls.getChildren().forEach((ball, i) => {
      if (!ball.active) return;
      ball.setAlpha(0.88 + Math.sin(time * 0.01 + i) * 0.12);
    });
    [this.wormholeL, this.wormholeR, this.boss].forEach((obj, i) => {
      if (obj && obj.active) obj.setScale(1 + Math.sin(time * 0.006 + i) * 0.04);
    });
  }

  onHitBumper(obj1, obj2) {
    const { ball, other: bumper } = this.getCollisionPair(obj1, obj2);
    if (!ball) return;

    const mult = this.handleCombo(); 
    this.score.award('brick'); SFX.hit && SFX.hit();
    this.shakeCamera(0.01 * mult, 100); 
    this._showScorePopup(10 * Math.floor(mult), bumper.x, bumper.y); 
    this.tweens.add({ targets: bumper, alpha: {from: 1, to: 0.5}, scale: {from: 1.2, to: 1}, duration: 100 });

    const angle = Phaser.Math.Angle.Between(bumper.x, bumper.y, ball.x, ball.y);
    ball.setVelocity(Math.cos(angle) * 800 * mult, Math.sin(angle) * 800 * mult);
  }

  // ==========================================
  // 🌟 终极拨杆物理学：杠杆原理重构 (支持四把拨杆)
  // ==========================================
  onHitFlipper(obj1, obj2) {
    const { ball, other: flipper } = this.getCollisionPair(obj1, obj2);
    if (!ball) return;

    SFX.hit && SFX.hit();
    const isHitting = Math.abs(flipper.angle) > 25; 
    
    // 🌟 核心修改：判断打中的是左侧的两把之一，还是右侧的
    const isLeft = (flipper === this.leftFlipper || flipper === this.upperLeftFlipper); 
    
    if (isHitting) {
      const mult = this.handleCombo();
      
      const dist = Phaser.Math.Clamp(Math.abs(ball.x - flipper.x), 0, 100);
      const powerMultiplier = 0.6 + (dist / 100) * 0.7;
      const force = 1200 * mult * powerMultiplier; 

      const angleDeg = isLeft ? (-90 + (dist / 100) * 50) : (-90 - (dist / 100) * 50);
      const angleRad = Phaser.Math.DegToRad(angleDeg);

      ball.y -= 15;
      ball.setVelocity(Math.cos(angleRad) * force, Math.sin(angleRad) * force);

    } else {
      this.resetCombo();
      ball.body.velocity.y *= 0.5; 
      ball.body.velocity.x *= 0.8;
    }
  }

  onHitTarget(obj1, obj2) {
    const { ball, other: target } = this.getCollisionPair(obj1, obj2);
    if (!ball) return;

    target.body.enable = false; 
    this.score.award('food'); SFX.eatDot && SFX.eatDot();
    this._showScorePopup(20, target.x, target.y);
    ball.body.velocity.y = -500; 
    
    this.tweens.add({ targets: target, y: target.y - 20, alpha: 0, duration: 200, onComplete: () => target.destroy() });

    this.activeTargets--;
    
    if (this.activeTargets <= 0 && !this.multiballTriggered) {
      this.multiballTriggered = true; 
      
      this.cameras.main.flash(800, 0, 255, 0); 
      SFX.powerPellet && SFX.powerPellet();
      this._showScorePopup("MULTIBALL MADNESS!", GAME_WIDTH/2, 300);
      
      this.spawnBall(350, 100).setVelocity(-300, -200);
      this.spawnBall(390, 100).setVelocity(300, -200);
    }
  }

  onHitBoss(obj1, obj2) {
    const { ball, other: boss } = this.getCollisionPair(obj1, obj2);
    if (!ball || !boss || !boss.active) return;

    this.bossHealth--;
    
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, ball.x, ball.y);
    ball.setVelocity(Math.cos(angle) * 1000, Math.sin(angle) * 1000);

    SFX.hit && SFX.hit();
    this.shakeCamera(0.02, 200);

    if (this.bossHealth <= 0 && !this.portalSpawned) {
      boss.destroy();
      this.portalSpawned = true;
      SFX.portalOpen && SFX.portalOpen();
      this.triggerPortal(GAME_WIDTH / 2, 80); 
      this._showScorePopup("BOSS DEFEATED!", GAME_WIDTH/2, 100);
    } else {
      boss.setTint(0xffffff);
      this.tweens.add({
        targets: boss,
        scale: 1.2,
        yoyo: true,
        duration: 50,
        onComplete: () => {
          if (boss && boss.active) boss.clearTint();
        }
      });
    }
  }

  onEnterWormhole(obj1, obj2) {
    const { ball, other: hole } = this.getCollisionPair(obj1, obj2);
    if (!ball || ball.getData('inWormhole')) return; 
    
    ball.setData('inWormhole', true);
    ball.body.enable = false; 
    ball.setVisible(false); 
    SFX.eatDot && SFX.eatDot();

    const isLeft = (hole === this.wormholeL);
    const targetHole = isLeft ? this.wormholeR : this.wormholeL;

    this.time.delayedCall(500, () => {
      if (!ball || !ball.active) return; 
      
      ball.setPosition(targetHole.x, targetHole.y + 15);
      ball.body.enable = true;
      ball.setVisible(true);
      
      const spitSpeedX = isLeft ? -600 : 600; 
      ball.setVelocity(spitSpeedX, 800);
      SFX.powerPellet && SFX.powerPellet();

      this.time.delayedCall(200, () => {
        if (ball && ball.active) {
          ball.setData('inWormhole', false);
        }
      });
    });
  }
}
