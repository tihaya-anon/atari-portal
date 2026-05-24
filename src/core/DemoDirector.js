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
  sceneDurationMs: Math.max(3000, toNumber(params.get('demoSceneMs'), 9000)),
  menuDelayMs: Math.max(500, toNumber(params.get('demoMenuMs'), 1600)),
  modSelectDelayMs: Math.max(300, toNumber(params.get('demoModMs'), 1200)),
  victoryDelayMs: Math.max(1500, toNumber(params.get('demoVictoryMs'), 4000)),
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
