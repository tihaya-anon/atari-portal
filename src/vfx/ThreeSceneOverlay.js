import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FRAME_W = 800;
const FRAME_H = 600;
const FOCUS_DEADZONE = 0.04;
const PERFORMANCE_FPS_KEY = 'performance_fps';
const ANIMATION_EFFECTS_LEVEL_KEY = 'animation_effects_level';
const ARM_FPS_SAMPLE_SECONDS = 3;
const ARM_MIN_FPS = 30;

const THEMES = {
  default: {
    primary: 0x6ef2ff,
    secondary: 0xb845ff,
    accent: 0xffffff,
    showCenter: false,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: false,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    overlayOpacity: 0.78,
    focusStrength: 1.0,
    armLift: 0,
  },
  MenuScene: {
    primary: 0x72f6ff,
    secondary: 0xff4de1,
    accent: 0xffffff,
    showCenter: true,
    showPanels: true,
    showMonitors: true,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    overlayOpacity: 0.5,
    focusStrength: 1.15,
    armLift: 24,
  },
  PacmanScene: {
    primary: 0x4f8dff,
    secondary: 0x72f6ff,
    accent: 0xffeb76,
    showCenter: true,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: true,
    showRiftField: false,
    showArms: true,
    focusStrength: 1.85,
    armLift: -18,
  },
  BreakoutScene: {
    primary: 0x72f6ff,
    secondary: 0xff58d8,
    accent: 0xfff3a3,
    showCenter: true,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    armLift: 6,
  },
  SpaceInvadersScene: {
    primary: 0xff5a62,
    secondary: 0xffaa33,
    accent: 0xffffff,
    showCenter: true,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    armLift: 0,
  },
  FroggerScene: {
    primary: 0x72f6ff,
    secondary: 0x62ff8e,
    accent: 0xffffff,
    showCenter: true,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    armLift: 22,
  },
  AsteroidsScene: {
    primary: 0xb845ff,
    secondary: 0xff78ff,
    accent: 0xffffff,
    showCenter: true,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: false,
    showRiftField: true,
    showArms: true,
    armLift: 8,
  },
  TetrisScene: {
    primary: 0x72f6ff,
    secondary: 0x62ff8e,
    accent: 0xffffff,
    showCenter: true,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    armLift: 16,
  },
  SnakeGame: {
    primary: 0x39ff14,
    secondary: 0x00f0ff,
    accent: 0xff00e6,
    showCenter: true,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: true,
    showRiftField: false,
    showArms: true,
    armLift: -4,
  },
  PinballScene: {
    primary: 0xff00e6,
    secondary: 0xb845ff,
    accent: 0xffffff,
    showCenter: true,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: false,
    showRiftField: true,
    showArms: true,
    armLift: 14,
  },
  FallDownScene: {
    primary: 0x00f0ff,
    secondary: 0xff00e6,
    accent: 0x39ff14,
    showCenter: false,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: true,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    armLift: 20,
  },
  GameOverScene: {
    primary: 0xff5a62,
    secondary: 0xb845ff,
    accent: 0xffffff,
    showCenter: true,
    showPanels: false,
    showMonitors: false,
    showBeams: false,
    showDepthGrid: false,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    armLift: -10,
  },
  VictoryScene: {
    primary: 0x72f6ff,
    secondary: 0x62ff8e,
    accent: 0xffffff,
    showCenter: true,
    showPanels: false,
    showMonitors: false,
    showBeams: true,
    showDepthGrid: false,
    showMazeHologram: false,
    showRiftField: false,
    showArms: true,
    armLift: 10,
  },
};

function hexToCss(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function readStoredFps() {
  try {
    const raw = localStorage.getItem(PERFORMANCE_FPS_KEY);
    if (raw === null || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch (_) {
    return null;
  }
}

function writeStoredFps(value) {
  try {
    localStorage.setItem(PERFORMANCE_FPS_KEY, String(Math.round(value)));
  } catch (_) { /* silent */ }
}

function normalizeEffectsLevel(value) {
  return value === 'low' ? 'low' : 'high';
}

function readEffectsLevel() {
  try {
    const raw = localStorage.getItem(ANIMATION_EFFECTS_LEVEL_KEY);
    return raw === null ? 'high' : normalizeEffectsLevel(raw);
  } catch (_) {
    return 'high';
  }
}

function hasEffectsPreference() {
  try {
    return localStorage.getItem(ANIMATION_EFFECTS_LEVEL_KEY) !== null;
  } catch (_) {
    return true;
  }
}

function writeEffectsLevel(level) {
  try {
    localStorage.setItem(ANIMATION_EFFECTS_LEVEL_KEY, normalizeEffectsLevel(level));
  } catch (_) { /* silent */ }
}

function makePanelTexture(primary, secondary, kind = 'panel') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const p = hexToCss(primary);
  const s = hexToCss(secondary);

  ctx.fillStyle = 'rgba(5, 10, 18, 0.78)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = `${p}cc`;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.strokeStyle = `${s}66`;
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  for (let y = 22; y < canvas.height - 18; y += 18) {
    ctx.strokeStyle = `${p}22`;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(canvas.width - 20, y);
    ctx.stroke();
  }

  for (let x = 24; x < canvas.width - 20; x += 24) {
    ctx.strokeStyle = `${s}18`;
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, canvas.height - 18);
    ctx.stroke();
  }

  ctx.font = kind === 'monitor' ? '10px monospace' : '12px monospace';
  if (kind === 'monitor') {
    for (let i = 0; i < 10; i++) {
      const row = `${Math.random() > 0.5 ? '1' : '0'}${String(Math.floor(Math.random() * 999999999)).padStart(9, '0')}`;
      ctx.fillStyle = i % 2 === 0 ? `${p}aa` : `${s}88`;
      ctx.fillText(row, 20, 28 + i * 12);
    }
  } else {
    const labels = ['ENCRYPTED', 'DATA-LINK', 'ACCESS', 'SIGNAL', 'REROUTE', 'BITSTREAM'];
    ctx.fillStyle = `${p}cc`;
    ctx.fillText(labels[Math.floor(Math.random() * labels.length)], 26, 36);
    for (let i = 0; i < 5; i++) {
      const y = 54 + i * 18;
      ctx.strokeStyle = `${s}88`;
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(90 + i * 12, y);
      ctx.lineTo(120 + i * 12, y - 8);
      ctx.lineTo(210, y - 8);
      ctx.stroke();
      ctx.fillStyle = `${p}66`;
      ctx.fillRect(160, y - 12, 40 - i * 4, 6);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeBeamTexture(colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const color = hexToCss(colorHex);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `${color}00`);
  gradient.addColorStop(0.15, `${color}88`);
  gradient.addColorStop(0.5, `${color}22`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const center = ctx.createRadialGradient(canvas.width / 2, 120, 10, canvas.width / 2, 160, 120);
  center.addColorStop(0, `${color}aa`);
  center.addColorStop(0.6, `${color}22`);
  center.addColorStop(1, `${color}00`);
  ctx.fillStyle = center;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createScreen(width, height, x, y, rotY, kind, primary, secondary) {
  const group = new THREE.Group();
  group.position.set(x, y, 4);
  group.rotation.y = rotY;
  group.rotation.z = rotY * -0.14;

  const texture = makePanelTexture(primary, secondary, kind);
  const panelMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: kind === 'monitor' ? 0.7 : 0.82,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), panelMat);
  group.add(panel);

  const frameGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, height));
  const frameMat = new THREE.LineBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.35,
  });
  const frame = new THREE.LineSegments(frameGeo, frameMat);
  frame.position.z = 1;
  group.add(frame);

  group.userData = { panelMat, frameMat, kind, baseY: y, baseRotZ: group.rotation.z };
  return group;
}

function createBeam(x, y, rotation, color) {
  const texture = makeBeamTexture(color);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(220, 460), material);
  mesh.position.set(x, y, 2);
  mesh.rotation.z = rotation;
  mesh.userData = { material };
  return mesh;
}

function createCenterRig(primary, secondary) {
  const group = new THREE.Group();
  group.position.set(0, 0, 8);

  const torusMat = new THREE.MeshBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.6,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(76, 3, 12, 64), torusMat);
  torus.position.y = 18;
  group.add(torus);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(54, 2, 10, 48), new THREE.MeshBasicMaterial({
    color: secondary,
    transparent: true,
    opacity: 0.42,
  }));
  innerRing.position.y = 18;
  innerRing.rotation.x = 0.8;
  group.add(innerRing);

  const triPoints = [
    new THREE.Vector3(-22, -16, 0),
    new THREE.Vector3(0, 42, 0),
    new THREE.Vector3(22, -16, 0),
    new THREE.Vector3(-22, -16, 0),
  ];
  const triGeo = new THREE.BufferGeometry().setFromPoints(triPoints);
  const tri = new THREE.Line(triGeo, new THREE.LineBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.9,
  }));
  tri.position.y = 18;
  group.add(tri);

  const barGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-12, 2, 0),
    new THREE.Vector3(12, 2, 0),
  ]);
  const bar = new THREE.Line(barGeo, new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  }));
  bar.position.y = 18;
  group.add(bar);

  group.userData = { torusMat, torus, innerRing };
  return group;
}

function createDepthGrid(primary, secondary) {
  const group = new THREE.Group();
  group.position.set(0, -72, -18);
  group.rotation.x = -0.78;

  const gridMat = new THREE.LineBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
  });
  const crossMat = new THREE.LineBasicMaterial({
    color: secondary,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
  });

  const gridPoints = [];
  for (let x = -420; x <= 420; x += 42) {
    gridPoints.push(new THREE.Vector3(x, -260, 0), new THREE.Vector3(x, 260, 0));
  }
  for (let y = -260; y <= 260; y += 42) {
    gridPoints.push(new THREE.Vector3(-420, y, 0), new THREE.Vector3(420, y, 0));
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPoints), gridMat));

  const circuitPoints = [];
  for (let i = 0; i < 26; i++) {
    const y = -230 + i * 18;
    const x = i % 2 === 0 ? -360 : 360;
    const mid = x * 0.35;
    circuitPoints.push(
      new THREE.Vector3(x, y, 1),
      new THREE.Vector3(mid, y, 1),
      new THREE.Vector3(mid, y, 1),
      new THREE.Vector3(mid + (i % 2 === 0 ? 34 : -34), y + 20, 1),
    );
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(circuitPoints), crossMat));

  group.userData = { gridMat, crossMat };
  return group;
}

function createMazeHologram(primary, secondary, accent) {
  const group = new THREE.Group();
  group.position.set(0, 10, 26);
  group.rotation.x = -0.12;

  const mat = new THREE.LineBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
  });
  const accentMat = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
  });

  const w = 310;
  const h = 210;
  const points = [];
  const rows = 7;
  for (let r = 0; r <= rows; r++) {
    const y = -h / 2 + (h / rows) * r;
    const inset = r % 2 === 0 ? 0 : 42;
    points.push(new THREE.Vector3(-w / 2 + inset, y, 0), new THREE.Vector3(w / 2 - inset, y, 0));
  }
  for (let c = 0; c <= 8; c++) {
    const x = -w / 2 + (w / 8) * c;
    const inset = c % 2 === 0 ? 20 : 58;
    points.push(new THREE.Vector3(x, -h / 2 + inset, 0), new THREE.Vector3(x, h / 2 - inset, 0));
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), mat));

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(54, 1.6, 8, 72),
    new THREE.MeshBasicMaterial({
      color: secondary,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
    })
  );
  ring.position.z = 8;
  group.add(ring);

  const wedge = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, 0, 10),
      new THREE.Vector3(28, 22, 10),
      new THREE.Vector3(28, -22, 10),
      new THREE.Vector3(-8, 0, 10),
    ]),
    accentMat,
  );
  group.add(wedge);

  group.userData = { mat, accentMat, ring };
  return group;
}

function createRiftField(primary, secondary, accent) {
  const group = new THREE.Group();
  group.position.set(0, 24, 24);

  const ringMat = new THREE.MeshBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    wireframe: true,
  });
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(58 + i * 26, 2, 10, 96), ringMat.clone());
    ring.rotation.x = 0.7 + i * 0.18;
    ring.rotation.y = i * 0.45;
    ring.userData = { speed: 0.12 + i * 0.05, baseOpacity: 0.14 + i * 0.04 };
    group.add(ring);
  }

  const shardGeo = new THREE.IcosahedronGeometry(10, 0);
  const shardMat = new THREE.MeshBasicMaterial({
    color: secondary,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    wireframe: true,
  });
  for (let i = 0; i < 22; i++) {
    const shard = new THREE.Mesh(shardGeo, shardMat.clone());
    const angle = (Math.PI * 2 * i) / 22;
    const radius = 70 + Math.random() * 170;
    shard.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.3) * 92, (Math.random() - 0.5) * 110);
    shard.scale.setScalar(0.45 + Math.random() * 1.3);
    shard.userData = { angle, radius, speed: 0.12 + Math.random() * 0.25, bob: Math.random() * Math.PI * 2 };
    group.add(shard);
  }

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(18, 24, 16),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      wireframe: true,
    })
  );
  core.userData = { isCore: true };
  group.add(core);
  group.userData = { ringMat, shardMat, core };
  return group;
}

const ARM_SCALE = 380;

function applyNeonOverlay(model, primary, secondary) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    const orig = child.material;
    child.material = new THREE.MeshStandardMaterial({
      map: orig.map || null,
      normalMap: orig.normalMap || null,
      metalnessMap: orig.metalnessMap || null,
      roughnessMap: orig.roughnessMap || null,
      metalness: 0.85,
      roughness: 0.25,
      emissive: new THREE.Color(primary),
      emissiveIntensity: 0.45,
      envMapIntensity: 0.6,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
    });
    child.material.needsUpdate = true;
  });
}

function recolorArm(model, primary, secondary) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    if (child.material.emissive) {
      child.material.emissive.setHex(primary);
      child.material.emissiveIntensity = 0.45;
    }
  });
}

const ThreeSceneOverlay = {
  _ready: false,
  _sceneName: 'MenuScene',
  _armsLoaded: false,
  _armsLoading: false,
  _animationEffectsLevel: 'high',
  _armsPerfCheckDone: false,
  _armsPerfSamples: 0,
  _armsPerfElapsed: 0,

  init(vw, vh, pr) {
    if (this._ready) return;
    this._ready = true;
    this._pr = pr;
    const storedFps = readStoredFps();
    if (!hasEffectsPreference() && storedFps !== null) {
      writeEffectsLevel(storedFps >= ARM_MIN_FPS ? 'high' : 'low');
    }
    this._animationEffectsLevel = readEffectsLevel();
    this._armsPerfCheckDone = storedFps !== null;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(vw, vh);
    this.renderer.setPixelRatio(pr);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.domElement.id = 'three-overlay';
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const fov = 45;
    const aspect = vw / vh;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 1, 4000);
    this.camera.position.set(0, 0, 900);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0x93a8ff, 0.6));
    this.keyLight = new THREE.DirectionalLight(0x72f6ff, 1.8);
    this.keyLight.position.set(200, 300, 400);
    this.scene.add(this.keyLight);
    this.fillLight = new THREE.PointLight(0xff4de1, 1.0, 1200);
    this.fillLight.position.set(-200, -150, 300);
    this.scene.add(this.fillLight);
    this.rimLight = new THREE.PointLight(0xb845ff, 0.6, 800);
    this.rimLight.position.set(0, 200, -200);
    this.scene.add(this.rimLight);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this._baseCameraZ = 900;
    this._focusTarget = { x: 0, y: 0 };
    this._focus = { x: 0, y: 0 };

    this.armLeft = new THREE.Group();
    this.armRight = new THREE.Group();
    this.armLeft.visible = false;
    this.armRight.visible = false;
    this.root.add(this.armLeft, this.armRight);

    this.cornerMonitors = new THREE.Group();
    this.cornerMonitors.add(
      createScreen(112, 100, -FRAME_W / 2 - 84, 220, -0.16, 'monitor', THEMES.MenuScene.primary, THEMES.MenuScene.secondary),
      createScreen(112, 100, FRAME_W / 2 + 84, 220, 0.16, 'monitor', THEMES.MenuScene.primary, THEMES.MenuScene.secondary),
      createScreen(112, 100, -FRAME_W / 2 - 84, -218, -0.12, 'monitor', THEMES.MenuScene.primary, THEMES.MenuScene.secondary),
      createScreen(112, 100, FRAME_W / 2 + 84, -218, 0.12, 'monitor', THEMES.MenuScene.primary, THEMES.MenuScene.secondary),
    );
    this.root.add(this.cornerMonitors);

    this.sidePanels = new THREE.Group();
    this.sidePanels.add(
      createScreen(120, 148, -FRAME_W / 2 + 38, -158, -0.28, 'panel', THEMES.default.primary, THEMES.default.secondary),
      createScreen(120, 148, FRAME_W / 2 - 38, -158, 0.28, 'panel', THEMES.default.primary, THEMES.default.secondary),
    );
    this.root.add(this.sidePanels);

    this.leftBeam = createBeam(-250, 160, 0.58, THEMES.FroggerScene.primary);
    this.rightBeam = createBeam(250, 160, -0.58, THEMES.FroggerScene.primary);
    this.root.add(this.leftBeam, this.rightBeam);

    this.centerRig = createCenterRig(THEMES.MenuScene.primary, THEMES.MenuScene.secondary);
    this.root.add(this.centerRig);

    this.depthGrid = createDepthGrid(THEMES.default.primary, THEMES.default.secondary);
    this.mazeHologram = createMazeHologram(THEMES.PacmanScene.primary, THEMES.PacmanScene.secondary, THEMES.PacmanScene.accent);
    this.riftField = createRiftField(THEMES.AsteroidsScene.primary, THEMES.AsteroidsScene.secondary, THEMES.AsteroidsScene.accent);
    this.root.add(this.depthGrid, this.mazeHologram, this.riftField);

    this._applyTheme(this._sceneName);
    this._maybeLoadArms();
  },

  _shouldShowArms() {
    const theme = this._theme || THEMES[this._sceneName] || THEMES.default;
    return this._animationEffectsLevel === 'high' && !!theme.showArms;
  },

  _maybeLoadArms() {
    if (!this._ready || this._animationEffectsLevel !== 'high' || this._armsLoaded || this._armsLoading) return;
    if (!this._armsPerfCheckDone) return;
    this._loadArms();
  },

  _loadArms() {
    this._armsLoading = true;
    const loader = new GLTFLoader();
    loader.load('assets/robotic_arm_lite.glb', (gltf) => {
      const armModel = gltf.scene;
      armModel.scale.setScalar(ARM_SCALE);

      const box = new THREE.Box3().setFromObject(armModel);
      const center = box.getCenter(new THREE.Vector3());

      const leftClone = armModel.clone(true);
      leftClone.position.set(
        -(FRAME_W / 2 + 130) - center.x,
        60 - center.y,
        40
      );
      leftClone.userData.baseX = leftClone.position.x;
      leftClone.rotation.set(0, 0, 0.65);
      applyNeonOverlay(leftClone, THEMES.MenuScene.primary, THEMES.MenuScene.secondary);
      this.armLeft.add(leftClone);

      const rightClone = armModel.clone(true);
      rightClone.scale.x *= -1;
      rightClone.position.set(
        (FRAME_W / 2 + 130) + center.x,
        60 - center.y,
        40
      );
      rightClone.userData.baseX = rightClone.position.x;
      rightClone.rotation.set(0, 0, -0.65);
      applyNeonOverlay(rightClone, THEMES.MenuScene.primary, THEMES.MenuScene.secondary);
      this.armRight.add(rightClone);

      this.armLeft.visible = this._shouldShowArms();
      this.armRight.visible = this._shouldShowArms();
      this._armsLoaded = true;
      this._armsLoading = false;

      this._applyTheme(this._sceneName);
    }, undefined, () => {
      this._armsLoading = false;
    });
  },

  _sampleStartupFps(deltaSeconds) {
    if (this._armsPerfCheckDone) return;
    this._armsPerfElapsed += deltaSeconds;
    this._armsPerfSamples += 1;
    if (this._armsPerfElapsed < ARM_FPS_SAMPLE_SECONDS) return;

    const fps = this._armsPerfSamples / this._armsPerfElapsed;
    writeStoredFps(fps);
    this._armsPerfCheckDone = true;

    if (!hasEffectsPreference()) {
      this._animationEffectsLevel = fps >= ARM_MIN_FPS ? 'high' : 'low';
      writeEffectsLevel(this._animationEffectsLevel);
      this._emitEffectsLevelChanged();
    } else {
      this._animationEffectsLevel = readEffectsLevel();
    }

    this._applyTheme(this._sceneName);
    this._maybeLoadArms();
  },

  getAnimationEffectsLevel() {
    return this._animationEffectsLevel;
  },

  setAnimationEffectsLevel(level) {
    this._animationEffectsLevel = normalizeEffectsLevel(level);
    writeEffectsLevel(this._animationEffectsLevel);
    this._emitEffectsLevelChanged();
    this._applyTheme(this._sceneName);
    this._maybeLoadArms();
  },

  _emitEffectsLevelChanged() {
    try {
      window.dispatchEvent(new CustomEvent('animation-effects-level-changed', {
        detail: { level: this._animationEffectsLevel },
      }));
    } catch (_) { /* silent */ }
  },

  getPerformanceFps() {
    return readStoredFps();
  },

  setScene(sceneName) {
    if (!this._ready) return;
    this._sceneName = sceneName || 'MenuScene';
    this._focusTarget.x = 0;
    this._focusTarget.y = 0;
    this._applyTheme(this._sceneName);
  },

  setFocus(sceneName, x, y) {
    if (!this._ready || sceneName !== this._sceneName) return;
    const nx = ((x / FRAME_W) - 0.5) * 2;
    const ny = ((y / FRAME_H) - 0.5) * 2;
    this._focusTarget.x = Math.abs(nx) < FOCUS_DEADZONE ? 0 : THREE.MathUtils.clamp(nx, -1, 1);
    this._focusTarget.y = Math.abs(ny) < FOCUS_DEADZONE ? 0 : THREE.MathUtils.clamp(ny, -1, 1);
  },

  _applyTheme(sceneName) {
    const theme = THEMES[sceneName] || THEMES.default;
    this._theme = theme;

    if (this._armsLoaded) {
      recolorArm(this.armLeft, theme.primary, theme.secondary);
      recolorArm(this.armRight, theme.primary, theme.secondary);
      const visible = this._shouldShowArms();
      this.armLeft.visible = visible;
      this.armRight.visible = visible;
    }

    this.keyLight.color.setHex(theme.primary);
    this.fillLight.color.setHex(theme.secondary);
    this.rimLight.color.setHex(theme.secondary);

    const screens = [...this.cornerMonitors.children, ...this.sidePanels.children];
    screens.forEach((screen) => {
      const { panelMat, frameMat, kind } = screen.userData;
      if (panelMat.map) panelMat.map.dispose();
      panelMat.map = makePanelTexture(theme.primary, theme.secondary, kind);
      frameMat.color.setHex(theme.primary);
      panelMat.needsUpdate = true;
    });

    [this.leftBeam, this.rightBeam].forEach((beam) => {
      const { material } = beam.userData;
      if (material.map) material.map.dispose();
      material.map = makeBeamTexture(theme.primary);
      material.needsUpdate = true;
    });

    const { torusMat } = this.centerRig.userData;
    torusMat.color.setHex(theme.primary);
    this.centerRig.children[1].material.color.setHex(theme.secondary);
    this.centerRig.children[2].material.color.setHex(theme.primary);

    this.centerRig.visible = theme.showCenter;
    this.sidePanels.visible = theme.showPanels;
    this.cornerMonitors.visible = theme.showMonitors;
    this.leftBeam.visible = theme.showBeams;
    this.rightBeam.visible = theme.showBeams;

    this.depthGrid.visible = theme.showDepthGrid;
    this.mazeHologram.visible = theme.showMazeHologram;
    this.riftField.visible = theme.showRiftField;
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.opacity = String(theme.overlayOpacity ?? THEMES.default.overlayOpacity);
    }

    this.depthGrid.children.forEach((child, idx) => {
      child.material.color.setHex(idx === 0 ? theme.primary : theme.secondary);
    });
    this.mazeHologram.children[0].material.color.setHex(theme.primary);
    this.mazeHologram.children[1].material.color.setHex(theme.secondary);
    this.mazeHologram.children[2].material.color.setHex(theme.accent);
    this.riftField.children.forEach((child) => {
      if (child.userData?.isCore) child.material.color.setHex(theme.accent);
      else if (child.geometry?.type === 'TorusGeometry') child.material.color.setHex(theme.primary);
      else child.material.color.setHex(theme.secondary);
    });
  },

  update(time, audioReactive) {
    if (!this._ready) return;
    const deltaSeconds = Math.min(0.1, Math.max(0, time - (this._lastUpdateTime ?? time)));
    this._lastUpdateTime = time;
    this._sampleStartupFps(deltaSeconds);

    const ar = audioReactive;
    const energy = ar && ar._connected ? ar.energy : 0.12;
    const beat = ar && ar._connected ? ar.beatIntensity : 0;
    const theme = this._theme || THEMES.default;
    const focusStrength = theme.focusStrength ?? THEMES.default.focusStrength;

    this._focus.x = THREE.MathUtils.lerp(this._focus.x, this._focusTarget.x, 0.08);
    this._focus.y = THREE.MathUtils.lerp(this._focus.y, this._focusTarget.y, 0.08);

    const fx = this._focus.x * focusStrength;
    const fy = this._focus.y * focusStrength;
    this.root.rotation.y = fx * 0.26;
    this.root.rotation.x = -fy * 0.18;
    this.root.rotation.z = -fx * 0.035;
    this.root.position.x = -fx * 92;
    this.root.position.y = fy * 58;
    this.camera.position.x = fx * 135;
    this.camera.position.y = -fy * 96;
    this.camera.position.z = this._baseCameraZ - Math.abs(fx) * 78 - Math.abs(fy) * 48;
    this.camera.lookAt(fx * 62, -fy * 42, 0);

    if (this._armsLoaded) {
      const phase = time * 0.6;

      const leftModel = this.armLeft.children[0];
      const rightModel = this.armRight.children[0];

      if (leftModel) {
        leftModel.rotation.z = 0.65 + Math.sin(phase) * 0.12 + beat * 0.08 + fx * 0.22 - fy * 0.08;
        leftModel.position.y = (60 + theme.armLift) + Math.sin(phase * 0.7) * 12 + fy * 34;
        leftModel.position.x = (leftModel.userData.baseX ?? leftModel.position.x) + fx * 72;
      }
      if (rightModel) {
        rightModel.rotation.z = -0.65 - Math.sin(phase + 1.2) * 0.12 - beat * 0.08 + fx * 0.22 + fy * 0.08;
        rightModel.position.y = (60 + theme.armLift) + Math.sin(phase * 0.7 + 1.5) * 12 + fy * 34;
        rightModel.position.x = (rightModel.userData.baseX ?? rightModel.position.x) + fx * 72;
      }
    }

    this.cornerMonitors.children.forEach((screen, idx) => {
      screen.position.x += ((idx % 2 === 0 ? -1 : 1) * fx * 18 - screen.position.x + (idx % 2 === 0 ? -FRAME_W / 2 - 84 : FRAME_W / 2 + 84)) * 0.08;
      screen.position.y = screen.userData.baseY + Math.sin(time * 0.9 + idx) * 8 + fy * 18;
      screen.rotation.z = screen.userData.baseRotZ + Math.sin(time * 0.5 + idx) * 0.02 - fx * 0.08;
      screen.children[0].material.opacity = 0.54 + energy * 0.24;
    });

    this.sidePanels.children.forEach((screen, idx) => {
      const side = idx === 0 ? -1 : 1;
      screen.position.x = side * (FRAME_W / 2 - 38) + fx * 44 * side;
      screen.position.y = -158 + Math.sin(time * 0.8 + idx * 2.0) * 8 + fy * 28;
      screen.rotation.y = side * 0.28 + fx * 0.18;
      screen.children[0].material.opacity = 0.64 + energy * 0.3;
    });

    [this.leftBeam, this.rightBeam].forEach((beam, idx) => {
      beam.material.opacity = 0.14 + energy * 0.24 + Math.sin(time * 1.4 + idx) * 0.04;
      beam.scale.y = 1 + energy * 0.2;
      beam.rotation.z += (idx === 0 ? fx : -fx) * 0.002;
    });

    this.centerRig.rotation.z = time * 0.18;
    this.centerRig.userData.innerRing.rotation.z = -time * 0.32;
    this.centerRig.scale.setScalar(1 + beat * 0.1);

    if (this.depthGrid.visible) {
      this.depthGrid.rotation.z = Math.sin(time * 0.22) * 0.015;
      this.depthGrid.position.y = -72 + Math.sin(time * 0.35) * 10;
      this.depthGrid.children[0].material.opacity = 0.12 + energy * 0.12;
      this.depthGrid.children[1].material.opacity = 0.06 + energy * 0.1;
    }

    if (this.mazeHologram.visible) {
      this.mazeHologram.rotation.y = Math.sin(time * 0.35) * 0.08;
      this.mazeHologram.position.z = 20 + Math.sin(time * 0.6) * 6;
      this.mazeHologram.children[0].material.opacity = 0.12 + energy * 0.12;
      this.mazeHologram.children[1].rotation.z = time * 0.25;
      this.mazeHologram.children[1].material.opacity = 0.16 + beat * 0.12;
      this.mazeHologram.children[2].material.opacity = 0.22 + beat * 0.2;
    }

    if (this.riftField.visible) {
      this.riftField.rotation.z = time * 0.04;
      this.riftField.children.forEach((child, idx) => {
        if (child.userData?.isCore) {
          child.rotation.x = time * 0.7;
          child.rotation.y = time * 0.45;
          child.scale.setScalar(1 + beat * 0.25 + Math.sin(time * 2.0) * 0.08);
          child.material.opacity = 0.18 + energy * 0.22;
          return;
        }
        if (child.geometry?.type === 'TorusGeometry') {
          child.rotation.z += child.userData.speed * 0.02;
          child.rotation.x += child.userData.speed * 0.01;
          child.material.opacity = child.userData.baseOpacity + energy * 0.12;
          return;
        }
        child.userData.angle += child.userData.speed * 0.01;
        child.position.x = Math.cos(child.userData.angle) * child.userData.radius;
        child.position.y = Math.sin(child.userData.angle * 1.3) * 92 + Math.sin(time + child.userData.bob) * 12;
        child.rotation.x += 0.012 + idx * 0.0002;
        child.rotation.y += 0.018;
        child.material.opacity = 0.24 + energy * 0.22;
      });
    }

    this.renderer.render(this.scene, this.camera);
  },

  resize(vw, vh, pr) {
    if (!this._ready) return;
    this._pr = pr;
    this.renderer.setSize(vw, vh);
    this.camera.aspect = vw / vh;
    this.camera.updateProjectionMatrix();
  },
};

export default ThreeSceneOverlay;
