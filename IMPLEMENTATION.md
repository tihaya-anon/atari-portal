# Atari Portal

Atari Portal is a neon-styled arcade anthology built with Phaser 3. Classic game patterns are stitched together through a shared portal loop, with run-wide mutations, mod drafting, glitch events, score multipliers, persistent upgrades, and audio-reactive presentation layered on top.

This repository contains 9 playable scenes, runtime-generated textures, bundled BGM, CRT/audio-reactive overlays, a mod selection flow between stages, and persistent progression stored in `localStorage`.

## Stack

- Phaser 3
- Vite
- Three.js
- Web Audio API for SFX synthesis and audio analysis
- Canvas-generated runtime textures plus bundled MP3 BGM in `public/assets/audio/BGM`

## Current Game List

| Scene | Display Name | Core Goal | Portal Condition |
|------|------|------|------|
| `PacmanScene` | PAC-MAN / CYBER-SNACKER | Eat dots, dodge ghosts, use power pellets | After 60% dot clear, a portal pellet spawns; eating that pellet opens the portal at its tile |
| `BreakoutScene` | BREAKOUT / DATA WALL BREAKER | Break bricks with paddle and ball | After 40% brick clear, one live brick becomes a portal brick; breaking it opens the portal at that brick |
| `SpaceInvadersScene` | SPACE INVADERS / CYBER SWARM | Clear invading formations and survive bomb waves | When invaders drop to 30% remaining, a portal mothership is queued; shooting it opens the portal |
| `FroggerScene` | FROGGER / FIREWALL RUNNER | Cross traffic and data streams to fill home pads | After 3 normal home pads are filled, one remaining pad becomes a portal pad; hopping onto it opens the portal |
| `AsteroidsScene` | ASTEROIDS / DATA FRAGMENT PURGE | Fly, split asteroids, and clear waves | After 12 asteroid kills, a portal asteroid spawns; destroying it opens the portal |
| `TetrisScene` | TETRIS / CORE RECONSTRUCTION | Stack pieces, clear lines, survive faster drop pace | Portal opens on a 4-line clear after 8+ total lines, or automatically at 15 total lines cleared |
| `SnakeGame` | SNAKE / VIRAL TRACE | Grow the snake while handling sonic-wave hazards | Portal opens immediately at screen center once snake length reaches 10 |
| `PinballScene` | PINBALL / WORMHOLE TABLE | Keep balls alive, hit targets, beat the moving boss | Defeat the boss core |
| `FallDownScene` | CYBER-SHAFT / FALLDOWN | Descend through moving platforms and survive hazard types | Portal opens at center once downward stream speed reaches `-450` |

`src/config.js` defines the active portal order:

1. `PacmanScene`
2. `BreakoutScene`
3. `SpaceInvadersScene`
4. `FroggerScene`
5. `AsteroidsScene`
6. `TetrisScene`
7. `SnakeGame`
8. `PinballScene`
9. `FallDownScene`

## Run Structure

The game is built around a shared run state managed by `GameManager`:

- Story mode: follows the fixed game order above
- Arcade mode: jumps to a random next game instead of the scripted order
- Level Select: accessible from the menu for direct scene entry and testing

Across a run, the following systems persist:

- Total score
- Lives
- Coins
- Difficulty multiplier
- Speed boost state
- Hack meter
- Active mutation
- Active drafted mods
- Completed games

## Core Meta Systems

### Portals

- Every scene owns a `PortalSystem`
- Portals animate in, expire if ignored, and can respawn through a fallback timer
- If a scene-specific trigger is not met in time, a forced portal spawn can occur automatically
- Actual scene triggers are intentionally uneven: some scenes open a portal directly, while others first spawn an intermediate portal object that must be collected, destroyed, or touched before the portal appears

### Mutations

A new mutation is rolled when advancing to the next game. Current mutation pool:

- `OVERCLOCK`: faster game speed, higher score multiplier
- `LOW_POWER`: darker screen, higher coin gain
- `MIRROR_MODE`: mirrored canvas
- `PERMADEATH`: disables normal life cushion, boosts score
- `SWARM`: more enemies, coin-dropping enemies
- `PIXEL_FOG`: limited visibility around the player

Implementation: `src/core/MutationSystem.js`

### Mods

After each portal transition, the player is routed into `ModSelectScene` and chooses 1 of 3 random mods. Current mod set includes:

- Offensive mods such as `DOUBLE SHOT`, `POWER PADDLE`, `GHOST FEAR`, `FAST CLEAR`
- Defensive mods such as `SHIELD`, `SLOW FALL`, `EXTRA LIFE`
- Utility mods such as `COIN MAGNET`, `SCORE BOOST`, `PORTAL RADAR`
- Chaos mods such as `CHAOS ENGINE`, `LUCKY DROPS`

Implementation: `src/core/ModSystem.js`, `src/ui/ModSelectScene.js`

### Glitch / Anomaly System

Every gameplay scene can trigger temporary anomalies:

- Control inversion
- Dimensional bleed
- Time dilation
- Visual corruption
- Power surge
- Data leak

Implementation: `src/core/GlitchSystem.js`

### Speed Boost

- Triggered by score streaks
- Temporarily increases game speed and score multiplier

### Hack Meter

- Charge is gained from scoring
- Press `H` when full to activate a short boosted state
- Hack state increases score output and can suppress enemy pressure depending on the scene

### Coins and Persistent Upgrades

- Coins are earned during a run from portal traversal, streaks, and certain high-value actions
- A share of run coins is converted into permanent currency between stages
- Menu upgrade shop currently exposes persistent upgrades for:
  - starting lives
  - hack charge boost
  - mod quality
  - glitch resistance

### Achievements

An achievement registry exists and persists unlocks through `localStorage`. Definitions live in `src/core/AchievementSystem.js`.

### Debug / Cheat Menu

A dedicated runtime debug menu exists as `CheatMenuScene` for gameplay-side testing and state injection:

- Available from gameplay scenes through `Shift + \` (typing `|`)
- Pauses the current gameplay scene and opens an overlay console
- Can force the next scene, next mutation, and next mod offer
- Can directly edit current run values such as coins, lives, score, difficulty, hack charge, and portal tokens
- Writes changes back through `GameManager`, refreshes the HUD, and persists the updated run state

Implementation: `src/ui/CheatMenuScene.js`, `src/core/GameManager.js`, `src/games/BaseGameScene.js`

## Per-Scene Extra Systems

- `PacmanScene`: ghosts, vulnerable windows, procedural maze UI, 60%-progress portal pellet that must be eaten to open the portal
- `BreakoutScene`: paddle aim control, brick field border VFX, 40%-progress portal brick that must be broken by the ball
- `SpaceInvadersScene`: shields, mothership logic, bomb waves, spread/double-shot interactions, portal mothership gated by remaining-invader count
- `FroggerScene`: log riding, lily pad completion, traffic/data-lane theming, portal lily pad unlocked after filling 3 normal pads
- `AsteroidsScene`: wave spawning, UFO events, asteroid splitting, portal asteroid unlocked after 12 asteroid kills
- `TetrisScene`: DAS handling, preview box, line-clear powers, portal rift logic keyed to either a late Tetris or 15 total lines
- `SnakeGame`: residue recovery, virus/patch food types, audio-triggered sonic waves, immediate center portal at length 10
- `PinballScene`: 4 flippers, multiball targets, wormholes, moving boss
- `FallDownScene`: multiple platform behaviors, orb pickups, local HP loop layered on top of run lives, direct portal spawn at the `-450` speed threshold

## Controls

Global controls:

- `Arrow Keys` / `WASD`: move
- `Space`: main action, launch, fire, or hard drop depending on scene
- `H`: activate hack when charged
- `Shift + \`: open the debug / cheat menu during gameplay
- `ESC` or `P`: pause
- `N`: skip to the next game
- Mouse: menu navigation, some aiming/launch interactions

Scene-specific notes:

- Breakout supports mouse paddle movement
- Pinball uses `A` and `D` for flippers, `Space` to plunge
- Tetris uses `Up` or `W` to rotate and `Space` for hard drop

## Audio / Visual Pipeline

The current project is not asset-free:

- Runtime-generated textures are created in `BootScene`
- BGM files are loaded from `public/assets/audio/BGM`
- Audio-reactive systems drive menu and gameplay feedback
- CRT overlay, glitch effects, neon glow, debris, ripple, trail, and scene-specific cyber FX are all active parts of the presentation
- Three.js is included in the dependency set and used by the VFX layer

## Local Persistence

The game uses `localStorage` for:

- save state
- high score
- permanent upgrades
- permanent currency
- achievements

Relevant keys are managed in `src/core/GameManager.js` and `src/core/AchievementSystem.js`.

## Development

```bash
npm install
npm run dev
npm run build
npm run preview
```

Notes:

- Vite dev server runs on port `3000`
- Build output goes to `dist/`
- `vite.config.js` uses `base: './'`, which is suitable for static deployment under a relative path

## Project Structure

```text
src/
  main.js                 Phaser bootstrap and scene registration
  config.js               Shared constants, game order, balance config
  core/
    GameManager.js        Global run state, save/load, upgrades, progression
    MutationSystem.js     Run mutation selection and scene-side mutation effects
    ModSystem.js          Draftable run modifiers
    PortalSystem.js       Shared portal lifecycle and transition effect
    GlitchSystem.js       Timed anomaly system
    PowerUpSystem.js      Scene-specific pickup spawning/effects
    ScoreManager.js       Score routing, combo/streak/coin hooks
    AchievementSystem.js  Achievement definitions and persistence
    AudioManager.js       BGM switching and crossfade
    AudioReactiveSystem.js Audio analysis bridge
    SFXManager.js         Runtime SFX synthesis
  ui/
    BootScene.js          Texture generation and startup handoff
    MenuScene.js          Main menu, level select, permanent upgrade shop
    HUDScene.js           Shared overlay HUD
    PauseScene.js         Pause menu
    CheatMenuScene.js     Runtime debug console for forcing next-stage outcomes and run-state values
    ModSelectScene.js     Inter-stage mod draft
    TransitionScene.js    Transition presentation
    GameOverScene.js      Run fail state
    VictoryScene.js       Run completion state
  games/
    BaseGameScene.js      Shared gameplay scaffolding
    pacman/
    breakout/
    space-invaders/
    frogger/
    asteroids/
    tetris/
    snake/
    pinball/
    falldown/
  vfx/
    CRTOverlay.js
    CyberSceneFX.js
    GlitchEffect.js
    NeonGlow.js
    TrailSystem.js
    RippleEffect.js
    DebrisSystem.js
    AudioBackground.js
    ThreeSceneOverlay.js
```

## README Language

- English: `README.md`
- Chinese: `README_cn.md`

## License

MIT
