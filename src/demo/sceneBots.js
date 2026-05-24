import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export function runPacmanDemo(scene) {
  const pac = scene.pacman;
  if (!pac || pac.moving) return;

  const options = scene.getAvailableDirections(pac.gridCol, pac.gridRow, pac.direction);
  if (options.length === 0) return;

  let target = null;
  if (scene.portalPellet) {
    target = { col: scene.portalPellet.gridCol, row: scene.portalPellet.gridRow };
  } else {
    target = findPacmanTarget(scene, pac.gridCol, pac.gridRow);
  }

  let bestDir = options[0];
  let bestScore = Infinity;
  for (const dir of options) {
    const nextCol = pac.gridCol + dir.x;
    const nextRow = pac.gridRow + dir.y;
    let score = target ? Math.abs(target.col - nextCol) + Math.abs(target.row - nextRow) : 0;

    for (const ghost of scene.ghosts || []) {
      if (!ghost || ghost.eaten) continue;
      const dist = Math.abs(ghost.gridCol - nextCol) + Math.abs(ghost.gridRow - nextRow);
      if (ghost.vulnerable) score -= dist <= 2 ? 6 : 0;
      else if (dist <= 1) score += 100;
      else if (dist <= 2) score += 14;
    }

    if (score < bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }

  pac.nextDirection = bestDir;
}

function findPacmanTarget(scene, fromCol, fromRow) {
  let best = null;
  let bestDist = Infinity;

  scene.dots?.getChildren?.().forEach((dot) => {
    if (!dot?.active) return;
    const dist = Math.abs(dot.gridCol - fromCol) + Math.abs(dot.gridRow - fromRow);
    if (dist < bestDist) {
      bestDist = dist;
      best = { col: dot.gridCol, row: dot.gridRow };
    }
  });

  scene.powerPellets?.getChildren?.().forEach((pp) => {
    if (!pp?.active) return;
    const dist = Math.abs(pp.gridCol - fromCol) + Math.abs(pp.gridRow - fromRow) - 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = { col: pp.gridCol, row: pp.gridRow };
    }
  });

  return best;
}

export function getBreakoutDemoMove(scene, time) {
  if (scene.ballOnPaddle) {
    if (time - (scene._demoLaunchAt || 0) > 700) {
      scene._demoLaunchAt = time;
      scene.launchBall();
    }
    const offset = Math.sin(time * 0.006) * 160;
    return Phaser.Math.Clamp(((GAME_WIDTH / 2 + offset) - scene.paddle.x) / 28, -1, 1);
  }

  const lead = Phaser.Math.Clamp(scene.ball.body?.velocity?.x || 0, -320, 320) * 0.16;
  const targetX = Phaser.Math.Clamp(scene.ball.x + lead, 36, GAME_WIDTH - 36);
  return Phaser.Math.Clamp((targetX - scene.paddle.x) / 22, -1, 1);
}

export function getSpaceInvadersDemo(scene) {
  const minY = GAME_HEIGHT * 0.5;
  const maxY = GAME_HEIGHT - 16;
  let targetX = scene.player.x;
  let targetY = GAME_HEIGHT - 48;

  const liveInvaders = scene.invaders.getChildren().filter(inv => inv.active && inv.getData('alive'));
  if (liveInvaders.length > 0) {
    const front = liveInvaders.reduce((best, inv) => (!best || inv.y > best.y ? inv : best), null);
    if (front) targetX = front.x;
  }

  let danger = null;
  scene.bombs.getChildren().forEach((bomb) => {
    if (!bomb?.active) return;
    if (bomb.y < scene.player.y && Math.abs(bomb.x - scene.player.x) < 85) {
      if (!danger || bomb.y > danger.y) danger = bomb;
    }
  });

  if (danger) {
    targetX += danger.x < scene.player.x ? 170 : -170;
    targetY = Phaser.Math.Clamp(scene.player.y + 60, minY, maxY);
  } else {
    targetY = liveInvaders.length < 10 ? minY + 26 : GAME_HEIGHT - 70;
  }

  const dx = Phaser.Math.Clamp(targetX - scene.player.x, -1, 1);
  const dy = Phaser.Math.Clamp(targetY - scene.player.y, -1, 1);
  const aligned = liveInvaders.some(inv => Math.abs(inv.x - scene.player.x) < 34 && inv.y < scene.player.y);
  const shouldFire = aligned && timeSince(scene, '_demoLastFire') > 170;
  if (shouldFire) scene._demoLastFire = scene.time.now;

  return { vx: dx * 260, vy: dy * 210, shouldFire };
}

export function getAsteroidsDemo(scene) {
  const target = getAsteroidsTarget(scene);
  if (!target) {
    return { left: false, right: false, thrust: true, brake: false, shouldFire: false };
  }

  const desiredAngle = Phaser.Math.Angle.Between(scene.ship.x, scene.ship.y, target.x, target.y);
  const diff = Phaser.Math.Angle.Wrap(desiredAngle - scene.ship.rotation);
  const speed = Math.hypot(scene.shipVx, scene.shipVy);
  const shouldFire = Math.abs(diff) < 0.18 && timeSince(scene, '_demoLastFire') > 130;
  if (shouldFire) scene._demoLastFire = scene.time.now;

  return {
    left: diff < -0.12,
    right: diff > 0.12,
    thrust: Math.abs(diff) < 0.65 && speed < 260,
    brake: scene.powerUps.hasEffect('brake') && speed > 280 && Math.abs(diff) > 2.2,
    shouldFire,
  };
}

function getAsteroidsTarget(scene) {
  const liveAsteroids = scene.asteroids?.filter?.(asteroid => asteroid?.active) || [];
  const liveUfo = scene.ufoSprite?.active ? scene.ufoSprite : null;
  let target = null;
  let bestDist = Infinity;

  for (const obj of [...liveAsteroids, liveUfo].filter(Boolean)) {
    const dist = Phaser.Math.Distance.Between(scene.ship.x, scene.ship.y, obj.x, obj.y);
    if (dist < bestDist) {
      bestDist = dist;
      target = obj;
    }
  }
  return target;
}

export function getFroggerDemoHop(scene) {
  if (scene.portal?.portalActive) {
    const portalX = scene.portal.sprite?.x ?? GAME_WIDTH / 2;
    if (Math.abs(portalX - scene.frog.x) > 12) {
      return { dx: portalX > scene.frog.x ? 1 : -1, dy: 0 };
    }
    return { dx: 0, dy: scene.frogRow > 0 ? -1 : 0 };
  }

  if (scene.frogRow >= 7 && scene.frogRow <= 11) {
    const threat = scene.cars.some(car => Math.abs(car.y - scene.frog.y) < 24 && Math.abs(car.x - scene.frog.x) < 88);
    if (threat) return { dx: Math.sin(scene.time.now * 0.016) > 0 ? 1 : -1, dy: 0 };
    if (Math.sin(scene.time.now * 0.01) > 0.92) return { dx: scene.frog.x < GAME_WIDTH / 2 ? 1 : -1, dy: 0 };
    return { dx: 0, dy: -1 };
  }

  if (scene.frogRow >= 1 && scene.frogRow <= 5) {
    const log = scene.findLog();
    if (!log) return { dx: scene.frog.x < GAME_WIDTH / 2 ? -1 : 1, dy: 0 };
    if (Math.abs(log.x - scene.frog.x) > 12) return { dx: log.x > scene.frog.x ? 1 : -1, dy: 0 };
    if (Math.sin(scene.time.now * 0.012) > 0.82) return { dx: log.speed > 0 ? 1 : -1, dy: 0 };
    return { dx: 0, dy: -1 };
  }

  if (Math.sin(scene.time.now * 0.012) > 0.78) {
    return { dx: scene.frog.x < GAME_WIDTH / 2 ? 1 : -1, dy: 0 };
  }
  return { dx: 0, dy: -1 };
}

export function buildTetrisDemoPlan(scene) {
  let best = { targetX: scene.currentPieceX, rotation: scene.currentRotation, rotateSteps: 0, score: Infinity };

  for (let rot = 0; rot < 4; rot++) {
    const testShape = scene.getShape(scene.currentType, rot);
    const width = testShape[0].length;
    for (let x = -2; x <= 10 - width + 2; x++) {
      if (!scene.isValid(x, scene.currentPieceY, testShape)) continue;
      let y = scene.currentPieceY;
      while (scene.isValid(x, y + 1, testShape)) y++;
      let score = y * 2;
      for (let r = 0; r < testShape.length; r++) {
        for (let c = 0; c < testShape[r].length; c++) {
          if (!testShape[r][c]) continue;
          const boardX = x + c;
          const boardY = y + r;
          if (boardX < 0 || boardX >= 10 || boardY < 0 || boardY >= 20) {
            score += 1000;
            continue;
          }
          if (boardY >= 16) score -= 4;
          if (boardX >= 3 && boardX <= 6) score -= 1.5;
        }
      }
      if (score < best.score) {
        best = {
          targetX: x,
          rotation: rot,
          rotateSteps: (rot - scene.currentRotation + 4) % 4,
          type: scene.currentType,
          score,
        };
      }
    }
  }

  return best;
}

export function runTetrisDemo(scene, time) {
  if (!scene.currentType) return;
  if (!scene._demoPlan || scene._demoPlan.type !== scene.currentType || scene._demoPlan.rotation !== scene.currentRotation) {
    scene._demoPlan = buildTetrisDemoPlan(scene);
  }
  if (!scene._demoPlan) return;

  while (scene.currentRotation !== scene._demoPlan.rotation && scene._demoPlan.rotateSteps > 0) {
    scene.rotatePiece();
    scene._demoPlan.rotateSteps--;
  }

  if (scene.currentPieceX < scene._demoPlan.targetX) {
    scene.movePiece(1);
  } else if (scene.currentPieceX > scene._demoPlan.targetX) {
    scene.movePiece(-1);
  } else if (timeSince(scene, '_demoHardDropAt') > 180) {
    scene._demoHardDropAt = scene.time.now;
    scene.hardDrop();
    scene._demoPlan = null;
  }
}

export function getSnakeDemoDirection(scene, dirs, cols, rows) {
  const head = scene.snake[0];
  const target = scene.food || { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
  const order = [dirs.UP, dirs.RIGHT, dirs.DOWN, dirs.LEFT];
  let best = scene.direction;
  let bestScore = Infinity;

  for (const dir of order) {
    if (dir.x === -scene.direction.x && dir.y === -scene.direction.y) continue;
    const nextCol = (head.col + dir.x + cols) % cols;
    const nextRow = (head.row + dir.y + rows) % rows;
    const hitSelf = scene.snake.slice(0, -1).some(seg => seg.col === nextCol && seg.row === nextRow);
    if (hitSelf) continue;

    let score = Math.abs(target.col - nextCol) + Math.abs(target.row - nextRow);
    if (scene.sonicWaves.some(wave => wave.row === nextRow && scene.time.now >= wave.warnUntil)) score += 60;
    if (score < bestScore) {
      bestScore = score;
      best = dir;
    }
  }

  return best;
}

export function getFallDownDemoDirection(scene) {
  const nearbyOrbs = scene.orbs.getChildren().filter(orb => orb.active && Math.abs(orb.y - scene.player.y) < 220);
  if (nearbyOrbs.length > 0) {
    const orb = nearbyOrbs.reduce((best, item) => Math.abs(item.y - scene.player.y) < Math.abs(best.y - scene.player.y) ? item : best, nearbyOrbs[0]);
    return Math.sign(orb.x - scene.player.x) || (Math.sin(scene.time.now * 0.02) > 0 ? 1 : -1);
  }

  const platforms = scene.platforms.getChildren().filter(plat => plat.active && plat.y > scene.player.y && plat.y - scene.player.y < 190);
  if (platforms.length > 0) {
    const candidates = platforms.sort((a, b) => a.y - b.y).slice(0, 3);
    const target = candidates.reduce((best, item) => {
      const score = Math.abs(item.x - scene.player.x) + (item.getData('type') === 'damage' ? 220 : 0);
      const bestScore = Math.abs(best.x - scene.player.x) + (best.getData('type') === 'damage' ? 220 : 0);
      return score < bestScore ? item : best;
    }, candidates[0]);
    const drift = Math.sin(scene.time.now * 0.01) * 110;
    return Math.sign((target.x + drift) - scene.player.x);
  }

  return Math.sign((GAME_WIDTH / 2 + Math.sin(scene.time.now * 0.008) * 180) - scene.player.x);
}

export function getPinballDemoState(scene, time) {
  const activeBalls = scene.balls.getChildren().filter(ball => ball.active);
  const launchReady = activeBalls.some(ball => ball.x > 730 && ball.y > 400);
  if (launchReady) {
    const elapsed = time - (scene._demoLaunchStart || 0);
    if (!scene._demoLaunchStart) scene._demoLaunchStart = time;
    return { left: false, right: false, plunge: elapsed < 700 };
  }

  scene._demoLaunchStart = 0;
  const ball = activeBalls[0];
  if (!ball) return { left: false, right: false, plunge: false };

  const slam = ball.y > 430 && ball.body.velocity.y > 0;
  return {
    left: ball.x < GAME_WIDTH * 0.58 || slam,
    right: ball.x > GAME_WIDTH * 0.42 || slam,
    plunge: false,
  };
}

function timeSince(scene, key) {
  return scene.time.now - (scene[key] || 0);
}
