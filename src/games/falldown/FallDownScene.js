import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import SFX from '../../core/SFXManager.js';
import AudioReactive from '../../core/AudioReactiveSystem.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';

export class FallDownScene extends BaseGameScene {
  constructor() {
    super('FallDownScene', 'survival'); 
  }

  create() {
    super.create();
    
    // ==========================================
    // ⚙️ 系统初始状态
    // ==========================================
    this.physics.world.gravity.y = 800; 
    this.baseSpeed = -150; 
    this.survivalTime = 0;
    this.isInvincible = false;

    // 👉 新增：生命值与动态分数系统
    this.hp = 3; 
    this.runScore = 0; 

    this.drawCyberArena();

    // ==========================================
    // 🕹️ 物理群组构建
    // ==========================================
    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.orbs = this.physics.add.group({ allowGravity: false, immovable: true });

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, 200, 'pinball-bound').setTint(0x00f0ff);
    this.player.setCollideWorldBounds(false); 
    this.player.setBounce(0.1).setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    this.player.setMaxVelocity(1000, 800);
    this.playerGlow = this.add.circle(this.player.x, this.player.y, 22, COLORS.NEON_CYAN, 0.16)
      .setDepth(58)
      .setBlendMode(Phaser.BlendModes.ADD);

    // ==========================================
    // ⚡ 碰撞注册
    // ==========================================
    this.physics.add.collider(this.player, this.platforms, this.onHitPlatform, null, this);
    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);

    this.setupControls();
    
    // 👉 UI 焕新：分数、生命、速度
    this.uiScore = this.add.text(10, 20, 'SCORE: 0', { fontSize: '16px', color: '#00f0ff', fontStyle: 'bold' }).setDepth(100);
    this.uiHealth = this.add.text(10, 45, 'LIVES: 3', { fontSize: '14px', color: '#ff1744', fontStyle: 'bold' }).setDepth(100);
    this.uiSpeed = this.add.text(10, 65, 'SPEED: 150', { fontSize: '14px', color: '#ff00e6' }).setDepth(100);

    // 初始保底平台
    const startPlat = this.platforms.create(GAME_WIDTH / 2, 250, 'plat-normal');
    startPlat.setData('type', 'normal');
    startPlat.setVelocityY(this.baseSpeed);
    startPlat.setBlendMode(Phaser.BlendModes.ADD);
    startPlat.body.checkCollision.down = true; 

    for(let i=0; i<6; i++) {
      this.spawnPlatform(400 + i * 150, true);
    }
  }

  drawCyberArena() {
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_CYAN,
      secondary: COLORS.NEON_MAGENTA,
      accent: COLORS.NEON_GREEN,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 1,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_CYAN, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'CYBER-SHAFT: FALLDOWN',
      subtitle: 'PLATFORM STREAM // GRAVITY ORBS',
      primary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_MAGENTA,
    });
  }

  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey('A');
    this.keyD = this.input.keyboard.addKey('D');
  }

  safeExplosion(x, y, color) {
    for(let i=0; i<8; i++) {
      const p = this.add.rectangle(x, y, 12, 12, color).setBlendMode(Phaser.BlendModes.ADD);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 80 + 30; 
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scale: 0.2,
        duration: 400 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  spawnPlatform(yPos, forceNormal = false) {
    const xPos = Phaser.Math.Between(50, GAME_WIDTH - 50);
    let type = 'normal';
    let texture = 'plat-normal';

    if (!forceNormal) {
      const rand = Math.random();
      if (rand < 0.15) { type = 'fragile'; texture = 'plat-fragile'; }
      else if (rand < 0.30) { type = 'damage'; texture = 'plat-damage'; }
      else if (rand < 0.45) { type = 'audio'; texture = 'plat-audio'; }
      else if (rand < 0.60) { type = 'glitch'; texture = 'plat-glitch'; }
    }

    const plat = this.platforms.create(xPos, yPos, texture);
    plat.setData('type', type);
    plat.setVelocityY(this.baseSpeed);
    plat.setBlendMode(Phaser.BlendModes.ADD); 
    plat.body.checkCollision.down = true; 

    // 👉 将原有的充能球改为红色的“生命球”
    if (type === 'normal' && Math.random() < 0.03) {
      const orb = this.orbs.create(xPos, yPos - 30, 'grav-orb');
      orb.setTintFill(0xff1744); // 染成亮红色
      orb.setVelocityY(this.baseSpeed);
      this.tweens.add({ targets: orb, y: orb.y - 10, yoyo: true, repeat: -1, duration: 800 });
    }
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.gameOver || this._ending) return;

    // 👉 每秒存活增加 50 分！
    this.survivalTime += delta;
    this.runScore += delta * 0.05; 

    // UI 刷新
    this.uiScore.setText(`SCORE: ${Math.floor(this.runScore)}`);
    this.uiHealth.setText(`LIVES: ${this.hp}`);
    this.uiSpeed.setText(`SPEED: ${Math.abs(Math.floor(this.baseSpeed))}`);

    if (this.player.x < 0) this.player.x = GAME_WIDTH;
    if (this.player.x > GAME_WIDTH) this.player.x = 0;

    this.baseSpeed = Math.max(this.baseSpeed - (delta * 0.003), -500); 
    
    this.platforms.getChildren().forEach(p => p.setVelocityY(this.baseSpeed));
    this.orbs.getChildren().forEach(o => o.setVelocityY(this.baseSpeed));

    if (this.baseSpeed <= -450 && !this.portalSpawned) {
      this.portalSpawned = true;
      this.triggerPortal(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      this.cameras.main.flash(1000, 255, 255, 255);
    }

    const invX = this.horizontalControlInverted;
    const isLeft = this.keyA.isDown || this.cursors.left.isDown;
    const isRight = this.keyD.isDown || this.cursors.right.isDown;

    if ((!invX && isLeft) || (invX && isRight)) this.player.setVelocityX(-400);
    else if ((!invX && isRight) || (invX && isLeft)) this.player.setVelocityX(400);
    else this.player.setVelocityX(0);

    let lowestPlatY = 0;
    this.platforms.getChildren().forEach(plat => {
      if (plat.y > lowestPlatY) lowestPlatY = plat.y;
      
      if (plat.getData('type') === 'audio' && AudioReactive.analysis) {
        const scaleX = 1 + (AudioReactive.analysis.bass * 0.005);
        plat.setScale(scaleX, 1).refreshBody();
      }

      if (plat.y < -50) plat.destroy(); 
    });

    if (lowestPlatY < GAME_HEIGHT + 150) {
      this.spawnPlatform(lowestPlatY + 150);
    }

    if (this.player.y < -50) this.takeDamage(true);
    if (this.player.y > GAME_HEIGHT + 50) this.takeDamage(true);
    
    this.setPlayerPosition(this.player.x, this.player.y);
    this.tryEnterPortal(this.player.x, this.player.y);
    this.syncNeonActors(time);
  }

  syncNeonActors(time) {
    if (this.playerGlow && this.player) {
      this.playerGlow.setPosition(this.player.x, this.player.y);
      this.playerGlow.setScale(1 + Math.sin(time * 0.012) * 0.12);
      this.playerGlow.setVisible(this.player.visible);
    }
    this.platforms.getChildren().forEach((plat, i) => {
      if (plat.active) plat.setAlpha(0.78 + Math.sin(time * 0.006 + i) * 0.16);
    });
    this.orbs.getChildren().forEach((orb, i) => {
      if (orb.active) orb.setAlpha(0.85 + Math.sin(time * 0.01 + i) * 0.14);
    });
  }

  onHitPlatform(player, plat) {
    if (!player.body.touching.down && !player.body.touching.up) return;
    if (plat.getData('stepped')) return; 

    const type = plat.getData('type');

    if (type === 'normal') {
      plat.setData('stepped', true);
      this.tweens.add({ targets: plat, scaleY: 0.5, yoyo: true, duration: 80 });
      this.time.delayedCall(200, () => { if(plat && plat.active) plat.setData('stepped', false) });
    }
    else if (type === 'fragile') {
      plat.setData('type', 'broken'); 
      plat.setTintFill(0xff0000); 
      this.tweens.add({
        targets: plat, x: plat.x + 10, duration: 40, yoyo: true, repeat: 6,
        onComplete: () => {
          this.safeExplosion(plat.x, plat.y, 0xffaa00);
          plat.destroy();
        }
      });
    } 
    else if (type === 'damage') {
      plat.setData('stepped', true);
      this.takeDamage();
      this.time.delayedCall(500, () => { if(plat && plat.active) plat.setData('stepped', false) });
    }
    else if (type === 'audio') {
      plat.setData('stepped', true);
      this.tweens.add({ targets: plat, scaleY: 2.0, yoyo: true, duration: 100 });
      player.setVelocityY(-500); // 弹飞！
      SFX.powerPellet && SFX.powerPellet();
      this.time.delayedCall(200, () => { if(plat && plat.active) plat.setData('stepped', false) });
    }
    else if (type === 'glitch') {
      plat.setData('type', 'resolved'); 
      if (Math.random() > 0.5) {
        plat.setTexture('plat-normal');
        plat.setTintFill(0xffffff); 
        this.tweens.add({
          targets: plat, scale: 1.2, duration: 150, yoyo: true,
          onComplete: () => { if(plat && plat.active) plat.clearTint(); }
        });
        
        // 薛定谔平台如果稳定，奖励 200 分！
        this.runScore += 200; 
        SFX.eatDot && SFX.eatDot();
        this._showScorePopup("+200", plat.x, plat.y);
      } else {
        this.cameras.main.shake(100, 0.015);
        this.safeExplosion(plat.x, plat.y, 0xb845ff);
        plat.destroy();
        SFX.hit && SFX.hit();
        this._showScorePopup("COLLAPSE!", plat.x, plat.y);
      }
    }
  }

  // 👉 收集生命球
  collectOrb(player, orb) {
    orb.destroy();
    this.hp++;
    this.runScore += 500; // 奖励高分
    SFX.eatDot && SFX.eatDot();
    this.score.award('food');
    this._showScorePopup("+1 LIFE", player.x, player.y);
  }

  // 👉 扣血与无敌帧逻辑重构
  takeDamage(fatal = false) {
    if (this.isInvincible) return; 

    this.hp--; // 扣除本地生命值
    this.cameras.main.shake(150, 0.03); 
    this.cameras.main.flash(200, 255, 0, 0); 
    SFX.hit && SFX.hit();

    if (this.hp <= 0) {
      // 彻底死透了，交由主框架结算
      this.onPlayerDeath(); 
      if (!this.gameOver) {
        // 如果系统发了慈悲（比如看广告复活），重置血量
        this.hp = 3;
        this.respawnPlayer();
      }
    } else {
      // 还有命，执行抢救
      if (fatal) {
        this.respawnPlayer(); // 掉下深渊，执行高空抢救
      } else {
        // 踩中尖刺，原地给无敌帧
        this.isInvincible = true;
        this.player.setAlpha(0.5); 
        this.time.delayedCall(2000, () => {
          if (this.player && this.player.active) {
            this.isInvincible = false;
            this.player.setAlpha(1);
          }
        });
      }
    }
  }

  respawnPlayer() {
    this.player.setTint(0x00f0ff);
    this.baseSpeed = -150; // 速度重置，喘息一下
    
    const safeX = GAME_WIDTH / 2;
    const safeY = 250; 
    
    this.player.setPosition(safeX, safeY - 30);
    this.player.setVelocity(0, 0);

    const safePlat = this.platforms.create(safeX, safeY, 'plat-normal');
    safePlat.setData('type', 'normal');
    safePlat.setVelocityY(this.baseSpeed);
    safePlat.setBlendMode(Phaser.BlendModes.ADD);
    safePlat.body.checkCollision.down = true;

    this.time.delayedCall(3000, () => {
      if (safePlat && safePlat.active) {
        this.tweens.add({
          targets: safePlat, alpha: 0, duration: 200, yoyo: true, repeat: 3,
          onComplete: () => { if (safePlat && safePlat.active) safePlat.destroy(); }
        });
      }
    });

    this.isInvincible = true;
    this.player.setAlpha(0.5);
    this.time.delayedCall(2000, () => {
      if (this.player && this.player.active) {
        this.isInvincible = false;
        this.player.setAlpha(1);
      }
    });
  }
}
