/**
 * 游戏类型定义
 * 网络对战游戏的核心类型定义
 */

/**
 * 玩家角色类型
 */
export enum PlayerRole {
  ATTACKER = 'ATTACKER',  // 1P - 进攻方（派出车辆）
  DEFENDER = 'DEFENDER',  // 2P - 防守方（部署防卫单位）
}

/**
 * 车辆类型（进攻方可选）
 */
export enum VehicleType {
  MOTORCYCLE_WITH_PERMIT = 'MOTORCYCLE_WITH_PERMIT',       // 有入城证的摩托车
  MOTORCYCLE_WITHOUT_PERMIT = 'MOTORCYCLE_WITHOUT_PERMIT', // 没入城证的燃油摩托车
  ELECTRIC_MOTORCYCLE = 'ELECTRIC_MOTORCYCLE',             // 电摩
  ELECTRIC_BIKE = 'ELECTRIC_BIKE',                         // 电动自行车
}

/**
 * 车道类型
 */
export enum LaneType {
  MAIN_ROAD = 'MAIN_ROAD',           // 主道 - 速度快，容易被打中
  AUXILIARY_ROAD = 'AUXILIARY_ROAD', // 辅道 - 速度中等，被打中概率中等
  NON_MOTORIZED = 'NON_MOTORIZED',   // 非机动车道 - 速度慢，不容易被打中
}

/**
 * 防卫单位类型（防守方可选）
 */
export enum DefenseUnitType {
  AUXILIARY = 'AUXILIARY',  // 辅警 - 基础单位，射速快
  TRAFFIC = 'TRAFFIC',      // 交警 - 减速单位
  PATROL = 'PATROL',        // 铁骑 - 范围攻击
  SWAT = 'SWAT',            // 特警 - 高伤害，射速慢
}

/**
 * 游戏状态
 */
export enum GameStatus {
  WAITING = 'WAITING',       // 等待玩家加入
  PREPARING = 'PREPARING',   // 准备阶段（玩家布置初始单位）
  PLAYING = 'PLAYING',       // 游戏进行中
  PAUSED = 'PAUSED',         // 暂停
  FINISHED = 'FINISHED',     // 游戏结束
}

/**
 * 位置坐标
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 车辆属性配置
 */
export interface VehicleConfig {
  type: VehicleType;
  name: string;              // 名称
  cost: number;              // 价格
  baseSpeed: number;         // 基础速度
  hp: number;                // 生命值
  hitProbabilityModifier: number; // 被击中概率修正（0-1）
  description: string;       // 描述
}

/**
 * 车道属性配置
 */
export interface LaneConfig {
  type: LaneType;
  name: string;              // 名称
  speedMultiplier: number;   // 速度倍率
  hitProbabilityMultiplier: number; // 被击中概率倍率
  description: string;       // 描述
}

/**
 * 防卫单位属性配置
 */
export interface DefenseUnitConfig {
  type: DefenseUnitType;
  name: string;              // 名称
  cost: number;              // 价格
  range: number;             // 射程（格子数）
  damage: number;            // 伤害
  attackSpeed: number;       // 攻击速度（帧数/次）
  specialEffect?: 'slow' | 'splash'; // 特殊效果
  description: string;       // 描述
}

/**
 * 游戏中的车辆实例
 */
export interface Vehicle {
  id: string;
  playerId: string;          // 所属玩家ID
  type: VehicleType;
  lane: LaneType;
  pathIndex: number;         // 当前路径索引
  progress: number;          // 路径进度 (0-1)
  x: number;                 // 当前X坐标
  y: number;                 // 当前Y坐标
  hp: number;                // 当前生命值
  maxHp: number;             // 最大生命值
  speed: number;             // 当前速度
  slowEffect: number;        // 减速效果剩余时间
}

/**
 * 游戏中的防卫单位实例
 */
export interface DefenseUnit {
  id: string;
  playerId: string;          // 所属玩家ID
  type: DefenseUnitType;
  x: number;                 // 网格X坐标
  y: number;                 // 网格Y坐标
  level: number;             // 等级
  cooldown: number;          // 冷却时间
  targetId: string | null;   // 当前目标ID
  angle: number;             // 朝向角度
}

/**
 * 游戏中的投射物
 */
export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  type: DefenseUnitType;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

/**
 * 玩家信息
 */
export interface Player {
  id: string;
  role: PlayerRole;
  name: string;
  budget: number;            // 当前预算
  score: number;             // 得分
  isReady: boolean;          // 是否准备就绪
}

/**
 * 游戏房间
 */
export interface GameRoom {
  id: string;
  status: GameStatus;
  players: Map<string, Player>;
  attacker: Player | null;   // 进攻方
  defender: Player | null;   // 防守方
  vehicles: Vehicle[];
  defenseUnits: DefenseUnit[];
  projectiles: Projectile[];
  gridWidth: number;
  gridHeight: number;
  paths: Map<LaneType, Position[]>; // 每个车道的路径
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

/**
 * 游戏配置
 */
export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  attackerStartingBudget: number;  // 进攻方初始预算
  defenderStartingBudget: number;  // 防守方初始预算
  vehicleConfigs: Record<VehicleType, VehicleConfig>;
  laneConfigs: Record<LaneType, LaneConfig>;
  defenseUnitConfigs: Record<DefenseUnitType, DefenseUnitConfig>;
  maxVehiclesReachingGoal: number; // 允许到达目的地的最大车辆数
  preparationTime: number;         // 准备时间（秒）
}
