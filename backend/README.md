# 摩法交通卫士 - 后端服务器

## 项目简介

这是一个基于 TypeScript 和 WebSocket 的网络对战游戏后端服务器。游戏模式为1v1对战：
- **1P（进攻方）**：选择不同价格的交通工具（有证摩托车、无证摩托车、电摩、电动自行车等）和车道（主道、辅道、非机动车道），目标是让车辆到达城市中心
- **2P（防守方）**：部署防卫单位（辅警、交警、铁骑、特警）在不同位置进行拦截

## 技术栈

- **运行时**: Node.js
- **语言**: TypeScript
- **通信协议**: WebSocket (ws)
- **包管理**: npm

## 目录结构

```
backend/
├── src/
│   ├── config/          # 游戏配置
│   │   └── game.config.ts
│   ├── services/        # 核心服务
│   │   ├── GameServer.ts       # WebSocket 服务器
│   │   ├── GameEngine.ts       # 游戏引擎（逻辑运算）
│   │   └── GameRoomManager.ts  # 房间管理
│   ├── types/           # 类型定义
│   │   ├── game.types.ts       # 游戏数据类型
│   │   └── message.types.ts    # 消息协议类型
│   └── index.ts         # 入口文件
├── package.json
├── tsconfig.json
└── README.md
```

## 安装依赖

```bash
cd backend
npm install
```

## 运行服务器

### 开发模式（自动重启）
```bash
npm run dev
```

### 构建并运行
```bash
npm run build
npm start
```

## 配置

服务器默认运行在端口 `8080`。可以通过环境变量修改：

```bash
PORT=3000 npm run dev
```

## 游戏机制

### 玩家角色

#### 进攻方（Attacker）
- **初始预算**: 500金币
- **目标**: 让至少10辆车到达目的地
- **可选车辆**:
  - 有证摩托车 - 50金币，速度快，容易被击中
  - 无证摩托车 - 40金币，速度较快，较容易被击中
  - 电动摩托车 - 30金币，速度中等，不太容易被击中
  - 电动自行车 - 20金币，速度慢，难以被击中
- **可选车道**:
  - 主道 - 速度+30%，被击中概率+20%
  - 辅道 - 标准速度和被击中概率
  - 非机动车道 - 速度-30%，被击中概率-30%

#### 防守方（Defender）
- **初始预算**: 600金币
- **目标**: 拦截车辆，不让超过10辆到达目的地
- **可用单位**:
  - 辅警 - 100金币，基础单位，射速快
  - 交警 - 180金币，减速效果，检查驾照
  - 铁骑 - 250金币，范围伤害
  - 特警 - 350金币，高伤害，射速慢

### 游戏流程

1. **创建/加入房间**: 玩家创建或加入游戏房间，选择角色
2. **准备阶段**: 双方玩家点击"准备"，准备时间30秒
3. **游戏阶段**: 
   - 进攻方派出车辆
   - 防守方部署/升级/出售防卫单位
   - 实时对战
4. **游戏结束**:
   - 进攻方胜利：10辆车到达目的地
   - 防守方胜利：进攻方预算耗尽且场上无车辆

## WebSocket 消息协议

### 客户端 → 服务器

#### 创建房间
```json
{
  "type": "CREATE_ROOM",
  "timestamp": 1234567890,
  "playerName": "玩家1",
  "role": "ATTACKER" // 或 "DEFENDER"
}
```

#### 加入房间
```json
{
  "type": "JOIN_ROOM",
  "timestamp": 1234567890,
  "roomId": "房间ID",
  "playerName": "玩家2",
  "role": "DEFENDER"
}
```

#### 玩家准备
```json
{
  "type": "PLAYER_READY",
  "timestamp": 1234567890,
  "ready": true
}
```

#### 派出车辆（进攻方）
```json
{
  "type": "SPAWN_VEHICLE",
  "timestamp": 1234567890,
  "vehicleType": "MOTORCYCLE_WITH_PERMIT",
  "lane": "MAIN_ROAD"
}
```

#### 放置防卫单位（防守方）
```json
{
  "type": "PLACE_DEFENSE",
  "timestamp": 1234567890,
  "unitType": "AUXILIARY",
  "position": { "x": 5, "y": 3 }
}
```

#### 升级防卫单位（防守方）
```json
{
  "type": "UPGRADE_DEFENSE",
  "timestamp": 1234567890,
  "unitId": "单位ID"
}
```

#### 出售防卫单位（防守方）
```json
{
  "type": "SELL_DEFENSE",
  "timestamp": 1234567890,
  "unitId": "单位ID"
}
```

### 服务器 → 客户端

#### 游戏状态更新（每帧广播）
```json
{
  "type": "GAME_STATE_UPDATE",
  "timestamp": 1234567890,
  "state": {
    "status": "PLAYING",
    "vehicles": [...],
    "defenseUnits": [...],
    "projectiles": [...],
    "attackerBudget": 450,
    "defenderBudget": 500,
    "attackerScore": 3,
    "defenderScore": 15,
    "vehiclesReachedGoal": 3
  }
}
```

#### 游戏开始
```json
{
  "type": "GAME_START",
  "timestamp": 1234567890,
  "config": {
    "gridWidth": 12,
    "gridHeight": 8,
    "paths": [...]
  }
}
```

#### 游戏结束
```json
{
  "type": "GAME_OVER",
  "timestamp": 1234567890,
  "winner": "ATTACKER", // 或 "DEFENDER"
  "reason": "进攻方成功突破防线"
}
```

#### 错误消息
```json
{
  "type": "ERROR",
  "timestamp": 1234567890,
  "code": "NOT_IN_ROOM",
  "message": "未加入房间"
}
```

## 游戏引擎

### 主要功能

- **车辆系统**: 管理车辆生成、移动、生命值
- **防卫系统**: 管理单位放置、升级、出售、攻击
- **投射物系统**: 管理子弹移动、碰撞检测
- **碰撞检测**: 检测投射物与车辆的碰撞
- **特殊效果**: 减速效果、范围伤害
- **胜负判定**: 实时检测游戏结束条件

### 游戏循环

服务器以 60 FPS 的频率更新游戏状态：

1. 更新所有车辆位置
2. 更新所有防卫单位（寻找目标、攻击）
3. 更新所有投射物
4. 检测碰撞和应用伤害
5. 清理死亡对象
6. 检查游戏结束条件
7. 广播游戏状态给所有客户端

## API 文档

详细的 API 文档请参考 `src/types/` 目录下的类型定义文件：

- `game.types.ts` - 游戏数据结构
- `message.types.ts` - 消息协议定义

## 开发说明

### 添加新的车辆类型

1. 在 `src/types/game.types.ts` 中添加枚举值
2. 在 `src/config/game.config.ts` 中添加配置
3. 在游戏引擎中处理新类型的特殊逻辑

### 添加新的防卫单位

1. 在 `src/types/game.types.ts` 中添加枚举值
2. 在 `src/config/game.config.ts` 中添加配置
3. 在 `src/services/GameEngine.ts` 中实现特殊效果

### 修改游戏参数

所有游戏参数都在 `src/config/game.config.ts` 中集中管理，包括：
- 车辆属性（速度、生命值、价格等）
- 车道属性（速度倍率、被击中概率等）
- 防卫单位属性（射程、伤害、攻击速度等）
- 游戏规则（初始预算、胜利条件等）

## 许可证

MIT
