import Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../config.js';
import SFX from '../../core/SFXManager.js';
import AudioReactive from '../../core/AudioReactiveSystem.js';
import CyberSceneFX from '../../vfx/CyberSceneFX.js';

// --- 配置常量 ---
const CELL = 24;
const COLS = 31;
const ROWS = 22;
const OFFSET_X = Math.floor((GAME_WIDTH - COLS * CELL) / 2);
const OFFSET_Y = 32 + Math.floor((GAME_HEIGHT - 32 - ROWS * CELL) / 2);

const BASE_MOVE_INTERVAL = 150; 
const WIN_LENGTH = 10;           // 获胜条件：长度达到10
const RESIDUE_LIFESPAN = 5000;   // 残留物存在时间 (5秒)

const DIRS = {
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
};

function cellToWorld(col, row) {
  return {
    x: OFFSET_X + col * CELL + CELL / 2,
    y: OFFSET_Y + row * CELL + CELL / 2,
  };
}

export class SnakeGame extends BaseGameScene {
  constructor() {
    super('SnakeGame', 'pacman');
  }

  create() {
    super.create();

    // 基础状态
    this.snake = [];
    this.direction = DIRS.RIGHT;
    this.nextDirection = DIRS.RIGHT;
    this.moveAccumulator = 0;
    this.food = null;
    this.residues = [];      // 地面上的身体残留物
    this.sonicWaves = [];    // 节奏光波
    this.speedMult = 1;      // 病毒带来的临时加速
    this.virusTimer = 0;

    this.drawCyberArena();

    // 初始生成蛇身 (长度 4)
    for (let i = 0; i < 4; i++) {
      this.snake.push({ col: 10 - i, row: 11 });
    }

    // 视觉组
    this.snakeGroup = this.add.group();
    this.waveGraphics = this.add.graphics().setDepth(5);
    this.headGlow = this.add.circle(0, 0, 18, COLORS.NEON_GREEN, 0.16)
      .setDepth(4)
      .setBlendMode(Phaser.BlendModes.ADD);
    
    this.setupInput();
    this.spawnFood();
  }

  drawCyberArena() {
    CyberSceneFX.drawCircuitBackdrop(this, {
      primary: COLORS.NEON_GREEN,
      secondary: COLORS.NEON_CYAN,
      accent: COLORS.NEON_MAGENTA,
      top: 32,
      bottom: GAME_HEIGHT - 34,
      density: 1.1,
    });
    CyberSceneFX.drawBinarySideData(this, { color: COLORS.NEON_GREEN, alpha: 0.1, columns: 2 });
    CyberSceneFX.drawHudFrame(this, {
      title: 'SNAKE: VIRAL TRACE',
      subtitle: 'SONIC WAVES // PATCH NODES',
      primary: COLORS.NEON_GREEN,
      accent: COLORS.NEON_MAGENTA,
    });
    CyberSceneFX.drawHoloPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, COLS * CELL + 24, ROWS * CELL + 24, {
      primary: COLORS.NEON_GREEN,
      accent: COLORS.NEON_CYAN,
      depth: -4,
      tilt: 0,
    });
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.gameOver || this._ending) return;

    this.handleInput();
    this.updateSonicWaves(time);    // 方案B：光波逻辑
    this.checkResidueCollection();  // 拾取残留物
    
    // 病毒加速计时
    if (this.virusTimer > 0) {
      this.virusTimer -= delta;
      if (this.virusTimer <= 0) this.speedMult = 1;
    }

    // 移动计时器
    const interval = (BASE_MOVE_INTERVAL / this.gameSpeed) / this.speedMult;
    this.moveAccumulator += delta;
    if (this.moveAccumulator >= interval) {
      this.moveAccumulator -= interval;
      this.moveSnake();
    }

    // 胜利检测：长度足够且传送门没开
    if (this.snake.length >= WIN_LENGTH && !this.portalSpawned) {
      this.portalSpawned = true;
      this.triggerPortal(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }

    // 报告玩家位置
    const headPos = cellToWorld(this.snake[0].col, this.snake[0].row);
    this.setPlayerPosition(headPos.x, headPos.y);
    this.syncNeonActors(time, headPos);
    this.tryEnterPortal(headPos.x, headPos.y);

    this.render();
  }

  syncNeonActors(time, headPos) {
    if (!this.headGlow) return;
    this.headGlow.setPosition(headPos.x, headPos.y);
    this.headGlow.setScale(1 + Math.sin(time * 0.012) * 0.12);
  }

  handleInput() {
    const invX = this.horizontalControlInverted;
    const invY = this.verticalControlInverted;
    let newDir = null;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.wasd.left)) {
      newDir = invX ? DIRS.RIGHT : DIRS.LEFT;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.wasd.right)) {
      newDir = invX ? DIRS.LEFT : DIRS.RIGHT;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up)) {
      newDir = invY ? DIRS.DOWN : DIRS.UP;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.down)) {
      newDir = invY ? DIRS.UP : DIRS.DOWN;
    }

    if (newDir && (newDir.x !== -this.direction.x || newDir.y !== -this.direction.y)) {
      this.nextDirection = newDir;
    }
  }

  moveSnake() {
    this.direction = this.nextDirection;
    const head = this.snake[0];
    
    // 穿墙逻辑
    let nextCol = (head.col + this.direction.x + COLS) % COLS;
    let nextRow = (head.row + this.direction.y + ROWS) % ROWS;
    const newHead = { col: nextCol, row: nextRow };

    // 1. 自撞检测 (断尾)
    for (let i = 1; i < this.snake.length; i++) {
      if (this.snake[i].col === newHead.col && this.snake[i].row === newHead.row) {
        this.sliceSnake(i);
        return;
      }
    }

    // 2. 吃食物检测
    if (this.food && newHead.col === this.food.col && newHead.row === this.food.row) {
      this.handleEatFood(this.food.type);
      this.snake.unshift(newHead);
      this.spawnFood();
    } else {
      this.snake.unshift(newHead);
      this.snake.pop();
    }
  }

  handleEatFood(type) {
    this.score.award('dot');
    SFX.eatDot && SFX.eatDot();
    this.showFoodExplosion(this.food.col, this.food.row, type);

    if (type === 'virus') {
      this.speedMult = 1.8;
      this.virusTimer = 5000; // 加速5秒
      this._showScorePopup("SPEED UP!!", cellToWorld(this.food.col, this.food.row).x, cellToWorld(this.food.col, this.food.row).y);
    } else if (type === 'patch') {
      // 变短逻辑
      const toRemove = Math.min(this.snake.length - 3, 3);
      for(let i=0; i<toRemove; i++) this.snake.pop();
      this._showScorePopup("SHORTENED", cellToWorld(this.food.col, this.food.row).x, cellToWorld(this.food.col, this.food.row).y);
    }
  }

  // 👉 新增：用于死亡后重新生成蛇的函数
  resetSnake() {
    this.snake = [];
    this.direction = DIRS.RIGHT;
    this.nextDirection = DIRS.RIGHT;
    // 恢复初始长度 4
    for (let i = 0; i < 4; i++) {
      this.snake.push({ col: 10 - i, row: 11 });
    }
    this.speedMult = 1;
    this.virusTimer = 0;
  }

  // 👉 修复：彻底修复爆头崩溃的逻辑
  sliceSnake(atIndex) {
    // 核心修复：如果切断的是头部 (索引0)，则直接判定致命伤死亡！
    if (atIndex === 0) {
      this.onPlayerDeath(); 
      if (!this.gameOver) {
        this.resetSnake(); // 如果还有命，原地复活
      }
      return; // 结束函数，防止后续报错
    }

    // 切断身体的逻辑 (不变)
    const sliced = this.snake.splice(atIndex);
    sliced.forEach(seg => {
      const pos = cellToWorld(seg.col, seg.row);
      const sprite = this.add.image(pos.x, pos.y, 'snake-residue').setBlendMode(Phaser.BlendModes.ADD);
      
      const resObj = { sprite, col: seg.col, row: seg.row, expire: this.time.now + RESIDUE_LIFESPAN };
      this.residues.push(resObj);

      this.time.delayedCall(RESIDUE_LIFESPAN, () => {
        sprite.destroy();
        this.residues = this.residues.filter(r => r !== resObj);
      });
    });

    this.shakeCamera(0.008, 200);
    this.cameras.main.flash(150, 255, 0, 0, 0.2);
  }

  updateSonicWaves(time) {
    this.waveGraphics.clear();

    // 1. 逻辑：判定是否生成新光波
    const musicTrigger = AudioReactive.isBeat && Math.random() > 0.8;
    const randomTrigger = Math.random() > 0.995; 

    if (musicTrigger || randomTrigger) {
      if (this.sonicWaves.length < 3) {
        this.sonicWaves.push({ 
          row: Phaser.Math.Between(0, ROWS-1), 
          warnUntil: time + 600, 
          alpha: 1 
        });
      }
    }

    // 2. 渲染与碰撞逻辑
    this.sonicWaves = this.sonicWaves.filter(wave => {
      const y = cellToWorld(0, wave.row).y;
      if (time < wave.warnUntil) {
        // 预警阶段：细红线
        this.waveGraphics.lineStyle(2, 0xff0000, 0.6);
        this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
        return true;
      } else {
        // 爆发阶段：霓虹光波
        this.waveGraphics.lineStyle(CELL, 0xff00e6, wave.alpha);
        this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(0, y, GAME_WIDTH, y));
        
        // 👉 修复后的碰撞断尾逻辑
        const hitIdx = this.snake.findIndex(seg => seg.row === wave.row);
        if (hitIdx !== -1) {
          this.sliceSnake(hitIdx);
        }

        wave.alpha -= 0.05;
        return wave.alpha > 0;
      }
    });
  }

  checkResidueCollection() {
    const head = this.snake[0];
    this.residues.forEach((res, i) => {
      if (res.col === head.col && res.row === head.row) {
        const tail = this.snake[this.snake.length-1];
        this.snake.push({ col: tail.col, row: tail.row });
        res.sprite.destroy();
        this.residues.splice(i, 1);
        SFX.powerPellet && SFX.powerPellet();
      }
    });
  }

  spawnFood() {
    let col, row, conflict;
    do {
      col = Phaser.Math.Between(0, COLS - 1);
      row = Phaser.Math.Between(0, ROWS - 1);
      conflict = this.snake.some(s => s.col === col && s.row === row);
    } while (conflict);

    const r = Math.random();
    let type = 'standard';
    let key = 'snake-food';
    if (r < 0.15) { type = 'virus'; key = 'food-virus'; }
    else if (r < 0.25) { type = 'patch'; key = 'food-patch'; }

    this.food = { col, row, type, key };
    if (this.foodSprite) this.foodSprite.destroy();
    const pos = cellToWorld(col, row);
    this.foodSprite = this.add.image(pos.x, pos.y, key).setBlendMode(Phaser.BlendModes.ADD);
    this.foodSprite.setDepth(7);
    this.tweens.add({ targets: this.foodSprite, scale: 1.2, duration: 300, yoyo: true, repeat: -1 });
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey('W'),
      down: this.input.keyboard.addKey('S'),
      left: this.input.keyboard.addKey('A'),
      right: this.input.keyboard.addKey('D'),
    };
  }

  render() {
    this.snakeGroup.clear(true, true);
    this.snake.forEach((seg, i) => {
      const pos = cellToWorld(seg.col, seg.row);
      const key = i === 0 ? 'snake-head' : 'snake-body';
      const sprite = this.add.image(pos.x, pos.y, key).setBlendMode(Phaser.BlendModes.ADD);
      sprite.setDepth(i === 0 ? 8 : 6);
      if (i > 0) {
        const scale = 1 - (i / this.snake.length) * 0.4;
        sprite.setScale(scale).setAlpha(scale);
      }
      this.snakeGroup.add(sprite);
    });
  }

  showFoodExplosion(col, row, type) {
    const pos = cellToWorld(col, row);
    const color = type === 'virus' ? 0xff1744 : (type === 'patch' ? 0x39ff14 : 0xff00e6);
    const emitter = this.add.particles(pos.x, pos.y, 'pixel', {
      speed: { min: 50, max: 150 },
      scale: { start: 2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 600,
      blendMode: 'ADD'
    });
    emitter.explode(20);
    this.time.delayedCall(700, () => emitter.destroy());
  }
}
