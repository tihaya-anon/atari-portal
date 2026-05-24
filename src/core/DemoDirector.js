import { GAME_ORDER } from '../config.js';

function getSearchParams() {
  try {
    return new URLSearchParams(window.location.search || '');
  } catch (_) {
    return new URLSearchParams();
  }
}

function toBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const params = getSearchParams();
const enabled = toBool(params.get('demo'));
const route = (params.get('demoRoute') || 'PacmanScene,BreakoutScene,SpaceInvadersScene,FroggerScene,AsteroidsScene,TetrisScene,SnakeGame,PinballScene,FallDownScene')
  .split(',')
  .map(item => item.trim())
  .filter(item => GAME_ORDER.includes(item));

export const DemoDirector = {
  enabled,
  autoplayMenu: enabled,
  infiniteLives: enabled,
  autoSelectMod: enabled,
  autoRestart: enabled,
  route: route.length ? route : GAME_ORDER,
  sceneDurationMs: Math.max(5000, toNumber(params.get('demoSceneMs'), 12500)),
  menuDelayMs: Math.max(800, toNumber(params.get('demoMenuMs'), 2200)),
  modSelectDelayMs: Math.max(500, toNumber(params.get('demoModMs'), 1700)),
  victoryDelayMs: Math.max(2200, toNumber(params.get('demoVictoryMs'), 5200)),
  currentIndex: 0,

  reset() {
    this.currentIndex = 0;
  },

  getCurrentSceneKey() {
    return this.route[this.currentIndex] || this.route[0] || GAME_ORDER[0];
  },

  getNextSceneKey() {
    const nextIndex = (this.currentIndex + 1) % this.route.length;
    return this.route[nextIndex] || this.route[0] || GAME_ORDER[0];
  },

  advance() {
    this.currentIndex = (this.currentIndex + 1) % this.route.length;
    return this.getCurrentSceneKey();
  },

  syncIndex(sceneKey) {
    const idx = this.route.indexOf(sceneKey);
    if (idx >= 0) this.currentIndex = idx;
  },
};
