import { GAME_ORDER, DIFFICULTY, COIN_CONFIG, SPEED_BOOST, HACK_CONFIG, COMBO_CONFIG } from '../config.js';
import { MutationSystem } from './MutationSystem.js';
import { ModSystem } from './ModSystem.js';
import { AchievementSystem } from './AchievementSystem.js';

class GameManagerSingleton {
  constructor() {
    this.mutationSystem = new MutationSystem();
    this.modSystem = new ModSystem();
    this.achievementSystem = new AchievementSystem();
    this.reset();
  }

  reset() {
    this.state = {
      mode: 'story',
      totalScore: 0,
      lives: 3,
      currentGameIndex: 0,
      gamesCompleted: [],
      portalTokens: 0,
      difficulty: DIFFICULTY.BASE,
      coins: 0,
      speedBoostActive: false,
      speedBoostTimer: 0,
      streakCount: 0,
      streakTimer: 0,
      hackCharge: 0,
      hackActive: false,
      hackTimer: 0,
      achievements: [],
      comboCount: 0,
      comboTimer: 0,
      permanentUpgrades: this.loadPermanentUpgrades(),
    };
    this.cheats = {
      nextSceneKey: null,
      nextMutationId: null,
      nextModId: null,
    };
    this.mutationSystem.clearMutation();
    this.modSystem.reset();
  }

  get currentSceneKey() {
    return GAME_ORDER[this.state.currentGameIndex] || GAME_ORDER[0];
  }

  get isLastGame() {
    return this.state.currentGameIndex >= GAME_ORDER.length - 1;
  }

  get storyComplete() {
    return this.state.mode === 'story'
      && this.state.gamesCompleted.length >= GAME_ORDER.length;
  }

  get speedMultiplier() {
    let mult = this.state.speedBoostActive ? SPEED_BOOST.SPEED_MULT : 1.0;
    mult *= this.mutationSystem.speedMultiplier;
    return mult;
  }

  get scoreMultiplier() {
    let mult = this.state.speedBoostActive ? SPEED_BOOST.SCORE_MULT : 1.0;
    mult *= this.mutationSystem.scoreMultiplier;
    mult *= this.modSystem.scoreMultiplier;
    if (this.state.hackActive) mult *= HACK_CONFIG.SCORE_MULT;
    return mult;
  }

  get comboMultiplier() {
    return Math.min(this.state.comboCount, COMBO_CONFIG.MAX_MULT);
  }

  registerCombo() {
    const now = Date.now();
    if (now - this.state.comboTimer < COMBO_CONFIG.WINDOW) {
      this.state.comboCount++;
    } else {
      this.state.comboCount = 1;
    }
    this.state.comboTimer = now;
  }

  addScore(points) {
    if (points >= COMBO_CONFIG.MIN_BASE) {
      this.registerCombo();
    }
    const comboMult = this.comboMultiplier > 1 ? 1 + (this.comboMultiplier - 1) * 0.25 : 1;
    const finalPoints = Math.round(points * this.state.difficulty * this.scoreMultiplier * comboMult);
    this.state.totalScore += finalPoints;
    this.registerStreak();
    this.chargeHack(points);
    return finalPoints;
  }

  registerStreak() {
    const now = Date.now();
    if (now - this.state.streakTimer < SPEED_BOOST.STREAK_WINDOW) {
      this.state.streakCount++;
    } else {
      this.state.streakCount = 1;
    }
    this.state.streakTimer = now;

    if (this.state.streakCount >= SPEED_BOOST.STREAK_THRESHOLD && !this.state.speedBoostActive) {
      this.activateSpeedBoost();
    }
  }

  activateSpeedBoost() {
    this.state.speedBoostActive = true;
    this.state.speedBoostTimer = SPEED_BOOST.DURATION;
    this.state.streakCount = 0;
  }

  updateSpeedBoost(delta) {
    if (!this.state.speedBoostActive) return false;
    this.state.speedBoostTimer -= delta;
    if (this.state.speedBoostTimer <= 0) {
      this.state.speedBoostActive = false;
      this.state.speedBoostTimer = 0;
      this.state.streakCount = 0;
      return true;
    }
    return false;
  }

  // -- Hack meter --

  chargeHack(basePoints) {
    if (this.state.hackActive) return;
    const hackBoostLevel = this.state.permanentUpgrades?.hackBoost || 0;
    const chargeMultiplier = 1 + (hackBoostLevel * 0.2);
    const chargePerScore = HACK_CONFIG.CHARGE_PER_SCORE * chargeMultiplier;
    this.state.hackCharge = Math.min(
      HACK_CONFIG.MAX_CHARGE,
      this.state.hackCharge + chargePerScore
    );
  }

  activateHack() {
    if (this.state.hackCharge < HACK_CONFIG.MAX_CHARGE || this.state.hackActive) return false;
    this.state.hackActive = true;
    this.state.hackTimer = HACK_CONFIG.DURATION;
    this.state.hackCharge = 0;
    return true;
  }

  updateHack(delta) {
    if (!this.state.hackActive) return false;
    this.state.hackTimer -= delta;
    if (this.state.hackTimer <= 0) {
      this.state.hackActive = false;
      this.state.hackTimer = 0;
      return true;
    }
    return false;
  }

  // -- Coins --

  addCoins(amount) {
    const mult = this.mutationSystem.coinMultiplier;
    this.state.coins += Math.round(amount * mult);
  }

  buyLife() {
    if (this.state.coins >= COIN_CONFIG.LIFE_COST) {
      this.state.coins -= COIN_CONFIG.LIFE_COST;
      this.state.lives++;
      return true;
    }
    return false;
  }

  loseLife() {
    if (this.modSystem.consumeShield()) {
      return true;
    }
    if (this.mutationSystem.noExtraLives) {
      this.state.lives = 0;
      return false;
    }
    this.state.lives = Math.max(0, this.state.lives - 1);
    return this.state.lives > 0;
  }

  advanceToNextGame() {
    this.state.gamesCompleted.push(GAME_ORDER[this.state.currentGameIndex]);
    this.addCoins(COIN_CONFIG.PER_PORTAL);

    let nextSceneKey = null;
    if (this.state.mode === 'story') {
      nextSceneKey = GAME_ORDER[this.state.currentGameIndex + 1] || GAME_ORDER[GAME_ORDER.length - 1];
      this.state.difficulty += DIFFICULTY.INCREMENT;
    } else {
      const available = GAME_ORDER.filter(
        (_, i) => i !== this.state.currentGameIndex
      );
      nextSceneKey = available[Math.floor(Math.random() * available.length)];
      this.state.difficulty += DIFFICULTY.INCREMENT * 0.5;
    }

    if (this.cheats.nextSceneKey && GAME_ORDER.includes(this.cheats.nextSceneKey)) {
      nextSceneKey = this.cheats.nextSceneKey;
      this.cheats.nextSceneKey = null;
    }

    this.state.currentGameIndex = GAME_ORDER.indexOf(nextSceneKey);

    this.state.portalTokens++;

    if (this.cheats.nextMutationId) {
      const forcedMutation = this.mutationSystem.setMutationById(this.cheats.nextMutationId);
      this.cheats.nextMutationId = null;
      if (!forcedMutation) this.mutationSystem.rollMutation();
    } else {
      this.mutationSystem.rollMutation();
    }

    this.achievementSystem.checkAutoAchievements(this.state);

    return this.currentSceneKey;
  }

  setCheatState(patch) {
    this.state = {
      ...this.state,
      ...patch,
    };
  }

  setNextSceneCheat(sceneKey) {
    this.cheats.nextSceneKey = sceneKey || null;
  }

  setNextMutationCheat(mutationId) {
    this.cheats.nextMutationId = mutationId || null;
  }

  setNextModCheat(modId) {
    this.cheats.nextModId = modId || null;
  }

  consumeNextModCheat() {
    const modId = this.cheats.nextModId;
    this.cheats.nextModId = null;
    return modId;
  }

  // -- Achievements --

  unlockAchievement(id) {
    if (!this.state.achievements.includes(id)) {
      this.state.achievements.push(id);
      this.savePermanentData();
    }
  }

  // -- Persistence --

  save() {
    try {
      localStorage.setItem('atari-portal-save', JSON.stringify(this.state));
    } catch (_) { /* silent */ }
  }

  load() {
    try {
      const data = localStorage.getItem('atari-portal-save');
      if (data) {
        this.state = { ...this.state, ...JSON.parse(data) };
        return true;
      }
    } catch (_) { /* silent */ }
    return false;
  }

  clearSave() {
    try { localStorage.removeItem('atari-portal-save'); } catch (_) { /* silent */ }
  }

  getHighScore() {
    try {
      return parseInt(localStorage.getItem('atari-portal-highscore') || '0', 10);
    } catch (_) { return 0; }
  }

  saveHighScore() {
    try {
      const current = this.getHighScore();
      if (this.state.totalScore > current) {
        localStorage.setItem('atari-portal-highscore', String(this.state.totalScore));
      }
    } catch (_) { /* silent */ }
  }

  // -- Permanent upgrades (persist across runs) --

  loadPermanentUpgrades() {
    try {
      const data = localStorage.getItem('atari-portal-upgrades');
      return data ? JSON.parse(data) : { startLives: 0, hackBoost: 0, modQuality: 0, glitchResist: 0, totalCoinsEarned: 0 };
    } catch (_) {
      return { startLives: 0, hackBoost: 0, modQuality: 0, glitchResist: 0, totalCoinsEarned: 0 };
    }
  }

  savePermanentData() {
    try {
      localStorage.setItem('atari-portal-upgrades', JSON.stringify(this.state.permanentUpgrades));
    } catch (_) { /* silent */ }
  }

  buyPermanentUpgrade(type, cost) {
    const ups = this.state.permanentUpgrades;
    const totalCoins = this.getPermanentCoins();
    if (totalCoins < cost) return false;

    this.spendPermanentCoins(cost);
    ups[type] = (ups[type] || 0) + 1;
    this.savePermanentData();
    return true;
  }

  getPermanentCoins() {
    try {
      return parseInt(localStorage.getItem('atari-portal-permcoins') || '0', 10);
    } catch (_) { return 0; }
  }

  addPermanentCoins(amount) {
    try {
      const current = this.getPermanentCoins();
      localStorage.setItem('atari-portal-permcoins', String(current + amount));
    } catch (_) { /* silent */ }
  }

  spendPermanentCoins(amount) {
    try {
      const current = this.getPermanentCoins();
      localStorage.setItem('atari-portal-permcoins', String(Math.max(0, current - amount)));
    } catch (_) { /* silent */ }
  }
}

export const GameManager = new GameManagerSingleton();
