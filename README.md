# 方块之间 · Blockflow

一个打开就能玩的俄罗斯方块小游戏，支持电脑键盘与手机触控。

**[在线游玩](https://error-yh.github.io/blockflow-tetris/)** · **[下载离线版](https://github.com/error-yh/blockflow-tetris/releases/download/v1.0.0/blockflow.html)** · **[版本发布页](https://github.com/error-yh/blockflow-tetris/releases/latest)**

在线版点击链接即可开始。离线版下载 `blockflow.html` 后，双击并用浏览器打开，无需安装、无需联网；它是单文件网页游戏。

## 操作

| 按键 | 操作 |
| --- | --- |
| ← / → | 左右移动 |
| ↑ / X | 顺时针旋转 |
| Z | 逆时针旋转 |
| ↓ | 加速下落 |
| 空格 | 直接落下 |
| P / Esc | 暂停与继续 |

手机可使用棋盘下方的触控按钮。切换页面时自动暂停。

## 玩法

10 × 20 棋盘，七种方块、7-bag 发牌、SRS 踢墙、落点预览、下三个方块提示、500 毫秒锁定延迟、计分和等级加速。每消除 10 行升级；一次消除 1 / 2 / 3 / 4 行获得 100 / 300 / 500 / 800 × 消行前等级的分数。软降每格 1 分，硬降每格 2 分。不包含 T-spin 或连击额外奖励。

最高分只保存在当前浏览器，不同设备之间不共享。游戏不收集个人信息、不调用外部接口、不包含账号登录或广告。GitHub Pages 的平台访问行为适用 GitHub 自身的隐私政策。

## 本地运行与检查

直接用浏览器打开 `index.html`，或打开 `downloads/blockflow.html` 离线版。无需安装任何依赖。

修改代码后，可用 Node.js 重新生成离线版并检查核心规则：

```sh
npm run build:offline
npm test
```

GitHub Pages 从 `main` 分支根目录发布，根目录包含 `.nojekyll`，无需框架或构建服务。发布新版时，将重新生成的 `downloads/blockflow.html` 添加到 GitHub Release 即可。
