# Atari Portal

Atari Portal 是一个基于 Phaser 3 的霓虹复古小游戏合集。它不是简单地把多个小游戏并排放在一起，而是用统一的传送门流程、全局难度、变异、Mod 抽取、故障事件、分数倍率、永久升级和音频响应特效，把整套内容串成了一次完整 run。

当前仓库包含 9 个可玩场景、运行时生成纹理、内置 BGM、CRT 与音频响应叠层、关卡间 Mod 选择，以及基于 `localStorage` 的持久化进度。

## 技术栈

- Phaser 3
- Vite
- Three.js
- Web Audio API
- Canvas 运行时生成纹理
- `public/assets/audio/BGM` 中的内置 MP3 背景音乐

## 当前已实现的游戏

| 场景 | 展示名称 | 核心玩法 | 传送门触发方式 |
|------|------|------|------|
| `PacmanScene` | PAC-MAN / CYBER-SNACKER | 吃豆、躲鬼、吃能量豆 | 清掉 60% 豆子后会生成传送豆，吃到该传送豆后才真正打开传送门 |
| `BreakoutScene` | BREAKOUT / DATA WALL BREAKER | 打砖块 | 破坏 40% 砖块后，场上随机一块现存砖会变成传送砖；打掉它后才打开传送门 |
| `SpaceInvadersScene` | SPACE INVADERS / CYBER SWARM | 清理敌阵、躲炸弹 | 敌人数降到初始数量的 30% 时，会安排一艘传送母舰；击毁它后才打开传送门 |
| `FroggerScene` | FROGGER / FIREWALL RUNNER | 过车流、踩浮木、占点 | 先填满 3 个普通荷叶点，随后剩余荷叶中会有一个变成传送荷叶；跳上去后才打开传送门 |
| `AsteroidsScene` | ASTEROIDS / DATA FRAGMENT PURGE | 飞船射击、碎裂小行星 | 击毁 12 个小行星目标后会生成传送陨石；击毁该陨石后才打开传送门 |
| `TetrisScene` | TETRIS / CORE RECONSTRUCTION | 堆叠消行 | 总消行达到 8 且本次是一次 4 连消，或总消行累计达到 15 时，直接打开裂隙传送门 |
| `SnakeGame` | SNAKE / VIRAL TRACE | 贪吃蛇成长并处理音波危险 | 蛇长度达到 10 时，屏幕中央直接生成传送门 |
| `PinballScene` | PINBALL / WORMHOLE TABLE | 弹珠台、多球、Boss | 击败 Boss 核心 |
| `FallDownScene` | CYBER-SHAFT / FALLDOWN | 下坠生存、平台机制 | 下坠流速提升到 `-450` 后，屏幕中央直接生成传送门 |

`src/config.js` 中当前配置的固定顺序为：

1. `PacmanScene`
2. `BreakoutScene`
3. `SpaceInvadersScene`
4. `FroggerScene`
5. `AsteroidsScene`
6. `TetrisScene`
7. `SnakeGame`
8. `PinballScene`
9. `FallDownScene`

## 运行模式

当前项目的核心 run 状态由 `GameManager` 统一管理：

- Story Mode：按固定顺序游玩所有场景
- Arcade Mode：每次随机跳转到下一个游戏
- Level Select：从菜单直接选关，便于测试和练习

一个 run 中会持续保留的状态包括：

- 总分
- 生命
- 金币
- 难度倍率
- Speed Boost 状态
- Hack 充能状态
- 当前变异
- 已选择的 Mod
- 已完成的关卡列表

## 核心系统

### 1. Portal System

- 每个游戏场景都挂载同一个 `PortalSystem`
- 传送门有出现、警告、过期、重生等完整生命周期
- 如果长时间没有达成该场景的专属条件，系统会触发保底传送门
- 各场景的具体触发逻辑并不完全对称：有些是达标后直接开门，有些则是先生成“传送目标物”，还需要玩家再去吃到、打掉或碰到它，才会真正生成传送门

实现位置：`src/core/PortalSystem.js`

### 2. Mutation System

每次穿过传送门进入下一关时，系统会随机赋予一个变异。当前代码中的变异包括：

- `OVERCLOCK`：整体更快，分数更高
- `LOW_POWER`：画面更暗，但金币收益更高
- `MIRROR_MODE`：整个画面水平镜像
- `PERMADEATH`：更危险，但分数倍率更高
- `SWARM`：敌人更多，并可掉金币
- `PIXEL_FOG`：玩家周围之外视野受限

实现位置：`src/core/MutationSystem.js`

### 3. Mod Draft

每次通过传送门后，会进入 `ModSelectScene`，从 3 个随机 Mod 中选 1 个。当前 Mod 池包括：

- Offensive：`DOUBLE SHOT`、`POWER PADDLE`、`GHOST FEAR`、`FAST CLEAR`
- Defensive：`SHIELD`、`SLOW FALL`、`EXTRA LIFE`
- Utility：`COIN MAGNET`、`SCORE BOOST`、`PORTAL RADAR`
- Chaos：`CHAOS ENGINE`、`LUCKY DROPS`

实现位置：`src/core/ModSystem.js`、`src/ui/ModSelectScene.js`

### 4. Glitch / Anomaly System

所有主游戏场景都可能随机触发故障事件，当前包括：

- 控制反转
- 维度渗漏
- 时间扭曲
- 视觉损坏
- 能量激增
- 数据泄漏

实现位置：`src/core/GlitchSystem.js`

### 5. Speed Boost

- 连续得分会累计 streak
- 达到阈值后触发短时间加速与分数倍率提升

### 6. Hack Meter

- 得分会积累 Hack 能量
- 按 `H` 可以在充满后主动触发
- Hack 激活期间会提高收益，并在部分场景中压制敌方压力

### 7. 金币与永久升级

- run 内通过过门、高价值得分、连击等方式获得金币
- 一部分金币会转化为永久货币
- 菜单里的升级商店当前支持：
  - 初始生命增加
  - Hack 充能增强
  - 更好的 Mod 质量
  - 故障抗性

### 8. Achievement System

项目里已经有成就系统，并通过 `localStorage` 持久化。定义位于 `src/core/AchievementSystem.js`。

### 9. Debug / Cheat Menu

当前项目还实现了一个用于测试和调试的运行时菜单 `CheatMenuScene`：

- 只能在主游戏场景中通过 `Shift + \` 打开，也就是输入 `|`
- 打开后会暂停当前场景，并显示一个覆盖式调试面板
- 可强制指定下一关、下一次变异、下一次 Mod 选项
- 可直接修改当前 run 的金币、生命、分数、难度、Hack 充能、Portal Token 等数值
- 修改通过 `GameManager` 回写，同时刷新 HUD，并将当前 run 状态持久化保存

实现位置：`src/ui/CheatMenuScene.js`、`src/core/GameManager.js`、`src/games/BaseGameScene.js`

## 各小游戏的附加机制

- `PacmanScene`：鬼魂脆弱状态、赛博迷宫 UI、60% 进度后生成且必须吃掉的传送豆
- `BreakoutScene`：瞄准发球、砖场边框特效、40% 进度后刷出的传送砖
- `SpaceInvadersScene`：护盾、母舰逻辑、炸弹波次、扩散/双发兼容、按剩余敌人数触发的传送母舰
- `FroggerScene`：浮木搭载、荷叶占点、数据流与车流双区域、填满 3 个点后解锁的传送荷叶
- `AsteroidsScene`：波次刷新、UFO 事件、小行星裂变、击毁数达标后刷出的传送陨石
- `TetrisScene`：DAS、预览框、消行能力、由高门槛消行条件触发的裂隙传送门
- `SnakeGame`：残骸回收、病毒/补丁食物、音频驱动声波攻击、长度达标后直接出现的中心传送门
- `PinballScene`：4 个拨杆、多球目标、虫洞、移动 Boss
- `FallDownScene`：多种平台属性、生命球、本地 HP 与全局命数叠加，以及速度阈值触发的直接传送门

## 操作

全局操作：

- `方向键` / `WASD`：移动
- `Space`：主要动作、发射、发球或硬降，视场景而定
- `H`：Hack 满能量后激活
- `Shift + \`：在游戏中打开 Debug / Cheat Menu
- `ESC` 或 `P`：暂停
- `N`：跳过到下一个游戏
- 鼠标：菜单交互，部分场景用于移动/发球

特殊说明：

- Breakout 支持鼠标控制挡板
- Pinball 用 `A` / `D` 控制拨杆，`Space` 蓄力发球
- Tetris 用 `Up` 或 `W` 旋转，`Space` 硬降

## 资源与视效说明

当前项目并不是“完全无资源文件”的版本：

- 纹理大部分由 `BootScene` 在运行时生成
- 背景音乐来自 `public/assets/audio/BGM`
- 菜单和主场景存在音频响应效果
- CRT、故障、拖尾、波纹、碎片、霓虹描边、赛博背景都在实际使用
- 依赖里包含 Three.js，并由 VFX 层使用

## 本地持久化

当前使用 `localStorage` 保存：

- 存档
- 最高分
- 永久升级
- 永久货币
- 成就

主要逻辑位于：

- `src/core/GameManager.js`
- `src/core/AchievementSystem.js`

## 开发方式

```bash
npm install
npm run dev
npm run build
npm run preview
```

补充说明：

- Vite 开发端口为 `3000`
- 构建输出目录为 `dist/`
- `vite.config.js` 使用 `base: './'`，更适合静态相对路径部署

## 目录结构

```text
src/
  main.js                 Phaser 启动入口与场景注册
  config.js               全局常量、场景顺序、平衡参数
  core/
    GameManager.js        全局 run 状态、存档、升级、进度推进
    MutationSystem.js     变异系统
    ModSystem.js          Mod 抽取与激活
    PortalSystem.js       传送门生命周期与过场
    GlitchSystem.js       故障事件系统
    PowerUpSystem.js      各场景掉落物和效果
    ScoreManager.js       分数、连击、金币钩子
    AchievementSystem.js  成就系统
    AudioManager.js       BGM 切换与淡入淡出
    AudioReactiveSystem.js 音频分析
    SFXManager.js         运行时音效合成
  ui/
    BootScene.js          纹理生成与启动跳转
    MenuScene.js          主菜单、选关、永久升级商店
    HUDScene.js           通用 HUD
    PauseScene.js         暂停菜单
    CheatMenuScene.js     运行时调试控制台，可强制下一阶段结果并修改 run 状态
    ModSelectScene.js     关卡间 Mod 选择
    TransitionScene.js    过场场景
    GameOverScene.js      失败结算
    VictoryScene.js       通关结算
  games/
    BaseGameScene.js      所有游戏共用框架
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

## 文档语言

- 英文版：`README.md`
- 中文版：`README_cn.md`

## License

MIT
