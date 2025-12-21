/**
 * 游戏配置常量
 * 定义所有游戏相关的配置参数
 */

import {
  VehicleType,
  LaneType,
  DefenseUnitType,
  VehicleConfig,
  LaneConfig,
  DefenseUnitConfig,
  GameConfig,
  Position,
} from '../types/game.types.js';

/**
 * 车辆配置
 * 定义每种车辆的属性
 */
export const VEHICLE_CONFIGS: Record<VehicleType, VehicleConfig> = {
  [VehicleType.MOTORCYCLE_WITH_PERMIT]: {
    type: VehicleType.MOTORCYCLE_WITH_PERMIT,
    name: '有证摩托车',
    cost: 50,                  // 价格最高
    baseSpeed: 0.03,           // 速度快
    hp: 80,                    // 生命值中等
    hitProbabilityModifier: 0.9, // 容易被击中
    description: '合法摩托车，速度快但容易被识别拦截',
  },
  [VehicleType.MOTORCYCLE_WITHOUT_PERMIT]: {
    type: VehicleType.MOTORCYCLE_WITHOUT_PERMIT,
    name: '无证摩托车',
    cost: 40,                  // 价格中高
    baseSpeed: 0.025,          // 速度较快
    hp: 100,                   // 生命值较高
    hitProbabilityModifier: 0.85, // 较容易被击中
    description: '燃油摩托车，没有入城证，需要躲避检查',
  },
  [VehicleType.ELECTRIC_MOTORCYCLE]: {
    type: VehicleType.ELECTRIC_MOTORCYCLE,
    name: '电动摩托车',
    cost: 30,                  // 价格中等
    baseSpeed: 0.02,           // 速度中等
    hp: 70,                    // 生命值中等
    hitProbabilityModifier: 0.75, // 不太容易被击中
    description: '电摩，速度适中，相对难以被发现',
  },
  [VehicleType.ELECTRIC_BIKE]: {
    type: VehicleType.ELECTRIC_BIKE,
    name: '电动自行车',
    cost: 20,                  // 价格最低
    baseSpeed: 0.015,          // 速度慢
    hp: 50,                    // 生命值低
    hitProbabilityModifier: 0.6, // 最难被击中
    description: '电动自行车，速度慢但隐蔽性好',
  },
};

/**
 * 车道配置
 * 定义每种车道的属性
 */
export const LANE_CONFIGS: Record<LaneType, LaneConfig> = {
  [LaneType.MAIN_ROAD]: {
    type: LaneType.MAIN_ROAD,
    name: '主道',
    speedMultiplier: 1.3,      // 速度快30%
    hitProbabilityMultiplier: 1.2, // 被击中概率增加20%
    description: '主干道，车速快但容易被拦截',
  },
  [LaneType.AUXILIARY_ROAD]: {
    type: LaneType.AUXILIARY_ROAD,
    name: '辅道',
    speedMultiplier: 1.0,      // 标准速度
    hitProbabilityMultiplier: 1.0, // 标准被击中概率
    description: '辅助道路，速度和被发现概率适中',
  },
  [LaneType.NON_MOTORIZED]: {
    type: LaneType.NON_MOTORIZED,
    name: '非机动车道',
    speedMultiplier: 0.7,      // 速度慢30%
    hitProbabilityMultiplier: 0.7, // 被击中概率减少30%
    description: '非机动车道，速度慢但不容易被发现',
  },
};

/**
 * 防卫单位配置
 * 定义每种防卫单位的属性
 */
export const DEFENSE_UNIT_CONFIGS: Record<DefenseUnitType, DefenseUnitConfig> = {
  [DefenseUnitType.AUXILIARY]: {
    type: DefenseUnitType.AUXILIARY,
    name: '辅警',
    cost: 100,
    range: 2.5,               // 射程2.5格
    damage: 20,               // 伤害20
    attackSpeed: 30,          // 30帧/次（快速）
    description: '基础单位，射速快，适合拦截普通车辆',
  },
  [DefenseUnitType.TRAFFIC]: {
    type: DefenseUnitType.TRAFFIC,
    name: '交警',
    cost: 180,
    range: 2.0,
    damage: 5,
    attackSpeed: 45,
    specialEffect: 'slow',    // 减速效果
    description: '检查驾照，可以减缓车辆速度',
  },
  [DefenseUnitType.PATROL]: {
    type: DefenseUnitType.PATROL,
    name: '铁骑',
    cost: 250,
    range: 3.0,
    damage: 15,
    attackSpeed: 40,
    specialEffect: 'splash',  // 范围伤害
    description: '摩托车单位，范围攻击，适合群体控制',
  },
  [DefenseUnitType.SWAT]: {
    type: DefenseUnitType.SWAT,
    name: '特警',
    cost: 350,
    range: 4.0,
    damage: 80,               // 高伤害
    attackSpeed: 90,          // 攻击慢
    description: '强力执法单位，高伤害但攻击速度慢',
  },
};

/**
 * 地图网格尺寸
 */
export const GRID_WIDTH = 12;
export const GRID_HEIGHT = 8;

/**
 * 帧率设置
 */
export const FPS = 60;

/**
 * 最大防卫单位等级
 */
export const MAX_DEFENSE_LEVEL = 3;

/**
 * 升级费用倍率
 * 升级到下一级的费用 = 基础费用 * UPGRADE_COST_MULTIPLIER * 当前等级
 */
export const UPGRADE_COST_MULTIPLIER = 0.5;

/**
 * 出售返还比例
 * 出售单位返还的金额 = 总投入 * SELL_REFUND_RATIO
 */
export const SELL_REFUND_RATIO = 0.7;

/**
 * 默认路径配置（三条车道）
 * 主道、辅道、非机动车道分别有不同的路径
 */
export const DEFAULT_PATHS: Record<LaneType, Position[]> = {
  [LaneType.MAIN_ROAD]: [
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
    { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
    { x: 8, y: 2 }, { x: 9, y: 2 }, { x: 10, y: 2 }, { x: 11, y: 2 },
  ],
  [LaneType.AUXILIARY_ROAD]: [
    { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 3 },
    { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 4 },
    { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 8, y: 4 }, { x: 9, y: 4 },
    { x: 10, y: 4 }, { x: 11, y: 4 },
  ],
  [LaneType.NON_MOTORIZED]: [
    { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 },
    { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
    { x: 7, y: 5 }, { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 },
    { x: 10, y: 6 }, { x: 11, y: 6 },
  ],
};

/**
 * 游戏默认配置
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  gridWidth: GRID_WIDTH,
  gridHeight: GRID_HEIGHT,
  attackerStartingBudget: 500,    // 进攻方初始预算500
  defenderStartingBudget: 600,    // 防守方初始预算600
  vehicleConfigs: VEHICLE_CONFIGS,
  laneConfigs: LANE_CONFIGS,
  defenseUnitConfigs: DEFENSE_UNIT_CONFIGS,
  maxVehiclesReachingGoal: 10,    // 最多允许10辆车到达目的地
  preparationTime: 30,             // 准备时间30秒
};

/**
 * 投射物速度
 */
export const PROJECTILE_SPEED = 5.0;

/**
 * 减速效果持续时间（帧数）
 */
export const SLOW_EFFECT_DURATION = 120; // 2秒（60fps）

/**
 * 减速效果强度（速度倍率）
 */
export const SLOW_EFFECT_FACTOR = 0.5; // 减速到50%

/**
 * 溅射伤害半径（格子数）
 */
export const SPLASH_RADIUS = 1.5;
