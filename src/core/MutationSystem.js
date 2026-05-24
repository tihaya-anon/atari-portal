import { MUTATION_CONFIG } from '../config.js';

const MUTATIONS = [
  {
    id: 'OVERCLOCK',
    name: 'OVERCLOCK',
    description: 'Everything 30% faster, 50% more score',
    apply: (state) => {
      state.mutSpeedMult = MUTATION_CONFIG.OVERCLOCK.speedMult;
      state.mutScoreMult = MUTATION_CONFIG.OVERCLOCK.scoreMult;
    },
  },
  {
    id: 'LOW_POWER',
    name: 'LOW POWER',
    description: 'Dim screen, but coins worth 3x',
    apply: (state) => {
      state.mutBrightness = MUTATION_CONFIG.LOW_POWER.brightness;
      state.mutCoinMult = MUTATION_CONFIG.LOW_POWER.coinMult;
    },
  },
  {
    id: 'MIRROR_MODE',
    name: 'MIRROR',
    description: 'Horizontally mirrored gameplay',
    apply: (state) => {
      state.mutMirror = true;
    },
  },
  {
    id: 'PERMADEATH',
    name: 'PERMADEATH',
    description: 'No extra lives, but score 3x',
    apply: (state) => {
      state.mutNoExtraLives = true;
      state.mutScoreMult = MUTATION_CONFIG.PERMADEATH.scoreMult;
    },
  },
  {
    id: 'SWARM',
    name: 'SWARM',
    description: '2x enemies, but they drop coins',
    apply: (state) => {
      state.mutEnemyMult = MUTATION_CONFIG.SWARM.enemyMult;
      state.mutEnemyDropCoins = true;
    },
  },
  {
    id: 'PIXEL_FOG',
    name: 'PIXEL FOG',
    description: 'Limited visibility around player',
    apply: (state) => {
      state.mutVisibilityRadius = MUTATION_CONFIG.PIXEL_FOG.visibilityRadius;
    },
  },
];

export class MutationSystem {
  constructor() {
    this.activeMutation = null;
    this.mutationState = {};
  }

  rollMutation() {
    const mutation = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    return this.setMutationById(mutation.id);
  }

  clearMutation() {
    this.activeMutation = null;
    this.mutationState = {};
  }

  setMutationById(id) {
    const mutation = MUTATIONS.find(m => m.id === id);
    if (!mutation) return null;
    this.activeMutation = mutation;
    this.mutationState = {};
    mutation.apply(this.mutationState);
    return mutation;
  }

  get speedMultiplier() {
    return this.mutationState.mutSpeedMult || 1;
  }

  get scoreMultiplier() {
    return this.mutationState.mutScoreMult || 1;
  }

  get coinMultiplier() {
    return this.mutationState.mutCoinMult || 1;
  }

  get isMirrored() {
    return !!this.mutationState.mutMirror;
  }

  get noExtraLives() {
    return !!this.mutationState.mutNoExtraLives;
  }

  get enemyMultiplier() {
    return this.mutationState.mutEnemyMult || 1;
  }

  get enemyDropCoins() {
    return !!this.mutationState.mutEnemyDropCoins;
  }

  get visibilityRadius() {
    return this.mutationState.mutVisibilityRadius || 0;
  }

  get brightness() {
    return this.mutationState.mutBrightness || 1;
  }

  applyToScene(scene) {
    if (this.isMirrored) {
      scene._mutMirror = true;
      try { scene._updateCanvasPerspective?.(scene._foregroundFocus?.x ?? 0, scene._foregroundFocus?.y ?? 0); } catch (_) {}
    }
    if (this.brightness < 1) {
      const dimAlpha = Math.min(1 - this.brightness, 0.3);
      const dim = scene.add.rectangle(
        scene.cameras.main.width / 2,
        scene.cameras.main.height / 2,
        scene.cameras.main.width,
        scene.cameras.main.height,
        0x000000,
        dimAlpha
      ).setDepth(8500).setScrollFactor(0);
      scene._mutDimOverlay = dim;
    }
    if (this.visibilityRadius > 0) {
      const w = scene.cameras.main.width;
      const h = scene.cameras.main.height;

      scene._fogMaskGfx = scene.make.graphics({ add: false });
      scene._fogMaskGfx.fillStyle(0xffffff, 1);
      scene._fogMaskGfx.fillCircle(w / 2, h / 2, this.visibilityRadius);

      scene._fogOverlay = scene.add.rectangle(
        w / 2, h / 2, w + 10, h + 10,
        0x000000, 0.6
      ).setDepth(8498).setScrollFactor(0);

      const mask = scene._fogMaskGfx.createGeometryMask();
      mask.invertAlpha = true;
      scene._fogOverlay.setMask(mask);
      scene._fogGeometryMask = mask;
    }
  }

  updateFog(scene, playerX, playerY) {
    if (!scene._fogMaskGfx || this.visibilityRadius <= 0) return;
    const g = scene._fogMaskGfx;
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(playerX, playerY, this.visibilityRadius);
  }

  cleanupScene(scene) {
    scene._mutMirror = false;
    try { scene._updateCanvasPerspective?.(0, 0); } catch (_) {}
    if (scene._mutDimOverlay) {
      scene._mutDimOverlay.destroy();
      scene._mutDimOverlay = null;
    }
    if (scene._fogOverlay) {
      if (scene._fogGeometryMask) {
        scene._fogOverlay.clearMask(true);
        scene._fogGeometryMask = null;
      }
      scene._fogOverlay.destroy();
      scene._fogOverlay = null;
    }
    if (scene._fogMaskGfx) {
      scene._fogMaskGfx.destroy();
      scene._fogMaskGfx = null;
    }
  }

  static getMutationList() {
    return MUTATIONS.map(m => ({ id: m.id, name: m.name, description: m.description }));
  }
}
