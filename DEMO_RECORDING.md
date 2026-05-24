# Demo Recording

这个项目现在支持自动演出模式，适合直接录 trailer/demo。

## 启动方式

开发环境：

```bash
npm run dev
```

浏览器打开：

```text
http://localhost:3000/?demo=1
```

更直接的方式：

```bash
npm run demo
```

可选参数：

- `demoSceneMs=9000`：每个关卡停留时长，单位毫秒
- `demoMenuMs=1600`：主菜单停留时长
- `demoModMs=1200`：Mod 选择页停留时长
- `demoVictoryMs=4000`：通关页停留时长
- `demoRoute=PacmanScene,BreakoutScene,SpaceInvadersScene,FroggerScene,AsteroidsScene,TetrisScene,SnakeGame,PinballScene,FallDownScene`：自定义轮播顺序

示例：

```text
http://localhost:3000/?demo=1&demoSceneMs=7000&demoRoute=PacmanScene,SpaceInvadersScene,AsteroidsScene,PinballScene
```

## 行为

开启 `demo=1` 后会自动：

- 从菜单进入演出
- 自动轮播关卡
- 自动选择 Mod
- 角色死亡时保命
- 通关后自动回到菜单并继续循环

## 录制建议

最省事的方案：

1. 打开 `?demo=1` 页面
2. 用 OBS 录 2 到 5 分钟
3. 从素材里剪 30 到 60 秒 trailer

如果你装了 `ffmpeg`，Linux 下可以录桌面：

```bash
ffmpeg -video_size 1920x1080 -framerate 60 -f x11grab -i :0.0 output-demo.mp4
```

如果你用的是 macOS：

```bash
ffmpeg -f avfoundation -framerate 60 -i "1:none" output-demo.mp4
```

## 建议镜头

- 先录 1 段主菜单
- 再录 4 到 6 个不同玩法关卡
- 优先保留爆炸、闪屏、传送、Boss、满屏弹幕这类高信息量画面
