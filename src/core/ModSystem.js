const ALL_MODS = [
  // Offensive
  { id: 'double_shot', name: 'DOUBLE SHOT', category: 'offensive', description: 'Fire two projectiles', icon: 'powerup-spread', games: ['SpaceInvadersScene', 'AsteroidsScene'] },
  { id: 'power_paddle', name: 'POWER PADDLE', category: 'offensive', description: 'Paddle 50% wider', icon: 'powerup-speed', games: ['BreakoutScene'] },
  { id: 'ghost_fear', name: 'GHOST FEAR', category: 'offensive', description: 'Ghosts flee more often', icon: 'powerup-phase', games: ['PacmanScene'] },
  { id: 'fast_clear', name: 'FAST CLEAR', category: 'offensive', description: '+2 lines cleared per Tetris', icon: 'powerup-bomb', games: ['TetrisScene'] },

  // Defensive
  { id: 'shield', name: 'SHIELD', category: 'defensive', description: 'Absorb 1 hit per game', icon: 'powerup-shield', games: ['*'] },
  { id: 'slow_fall', name: 'SLOW FALL', category: 'defensive', description: 'Tetris pieces fall slower', icon: 'powerup-freeze', games: ['TetrisScene'] },
  { id: 'extra_life', name: 'EXTRA LIFE', category: 'defensive', description: '+1 life', icon: 'powerup-shield', games: ['*'] },

  // Utility
  { id: 'coin_magnet', name: 'COIN MAGNET', category: 'utility', description: 'Auto-collect nearby coins', icon: 'powerup-magnet', games: ['*'] },
  { id: 'score_boost', name: 'SCORE BOOST', category: 'utility', description: '+25% score', icon: 'powerup-speed', games: ['*'] },
  { id: 'portal_radar', name: 'PORTAL RADAR', category: 'utility', description: 'Show portal progress bar', icon: 'powerup-phase', games: ['*'] },

  // Chaos
  { id: 'chaos_engine', name: 'CHAOS ENGINE', category: 'chaos', description: 'Anomalies every 15s, +50% score', icon: 'powerup-bomb', games: ['*'] },
  { id: 'lucky_drops', name: 'LUCKY DROPS', category: 'chaos', description: '2x power-up drop rate', icon: 'powerup-multiball', games: ['*'] },
];

export class ModSystem {
  constructor() {
    this.activeMods = [];
  }

  getRandomChoices(count = 3) {
    const shuffled = [...ALL_MODS].sort(() => Math.random() - 0.5);
    const existing = new Set(this.activeMods.map(m => m.id));
    const choices = [];

    for (const mod of shuffled) {
      if (!existing.has(mod.id) && choices.length < count) {
        choices.push(mod);
      }
    }

    while (choices.length < count && shuffled.length > 0) {
      const mod = shuffled.pop();
      if (!choices.find(c => c.id === mod.id)) choices.push(mod);
    }

    return choices;
  }

  addMod(mod) {
    if (mod.id === 'extra_life') {
      return { immediate: 'extra_life' };
    }
    if (!this.activeMods.find(m => m.id === mod.id)) {
      this.activeMods.push(mod);
    }
    return null;
  }

  getModById(id) {
    return ALL_MODS.find(mod => mod.id === id) || null;
  }

  hasMod(id) {
    return this.activeMods.some(m => m.id === id);
  }

  getModsForGame(sceneKey) {
    return this.activeMods.filter(
      m => m.games.includes('*') || m.games.includes(sceneKey)
    );
  }

  get scoreMultiplier() {
    let mult = 1;
    if (this.hasMod('score_boost')) mult *= 1.25;
    if (this.hasMod('chaos_engine')) mult *= 1.5;
    return mult;
  }

  get hasShield() {
    return this.hasMod('shield');
  }

  consumeShield() {
    const idx = this.activeMods.findIndex(m => m.id === 'shield');
    if (idx >= 0) {
      this.activeMods.splice(idx, 1);
      return true;
    }
    return false;
  }

  reset() {
    this.activeMods = [];
  }

  static getAllMods() {
    return ALL_MODS;
  }
}
