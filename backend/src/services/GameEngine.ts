/**
 * 游戏引擎
 * 负责游戏的核心逻辑运算，包括车辆移动、单位攻击、碰撞检测等
 */

import { v4 as uuidv4 } from 'uuid';
import {
  GameRoom,
  Vehicle,
  DefenseUnit,
  Projectile,
  VehicleType,
  LaneType,
  DefenseUnitType,
  Position,
  PlayerRole,
  GameStatus,
} from '../types/game.types.js';
import {
  VEHICLE_CONFIGS,
  LANE_CONFIGS,
  DEFENSE_UNIT_CONFIGS,
  MAX_DEFENSE_LEVEL,
  UPGRADE_COST_MULTIPLIER,
  SELL_REFUND_RATIO,
  PROJECTILE_SPEED,
  SLOW_EFFECT_DURATION,
  SLOW_EFFECT_FACTOR,
  SPLASH_RADIUS,
  DEFAULT_GAME_CONFIG,
} from '../config/game.config.js';

/**
 * 计算两点之间的距离
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * 游戏引擎类
 */
export class GameEngine {
  /**
   * 派出车辆
   * @param room 游戏房间
   * @param playerId 玩家ID
   * @param vehicleType 车辆类型
   * @param lane 车道类型
   * @returns 是否成功
   */
  spawnVehicle(
    room: GameRoom,
    playerId: string,
    vehicleType: VehicleType,
    lane: LaneType
  ): boolean {
    // 检查玩家是否为进攻方
    if (!room.attacker || room.attacker.id !== playerId) {
      console.log(`[GameEngine] 玩家 ${playerId} 不是进攻方，无法派出车辆`);
      return false;
    }

    // 检查游戏状态
    if (room.status !== GameStatus.PLAYING && room.status !== GameStatus.PREPARING) {
      console.log(`[GameEngine] 游戏状态不正确，无法派出车辆`);
      return false;
    }

    // 获取车辆配置
    const vehicleConfig = VEHICLE_CONFIGS[vehicleType];
    const laneConfig = LANE_CONFIGS[lane];

    // 检查预算
    if (room.attacker.budget < vehicleConfig.cost) {
      console.log(`[GameEngine] 预算不足，无法派出车辆`);
      return false;
    }

    // 获取路径
    const path = room.paths.get(lane);
    if (!path || path.length === 0) {
      console.log(`[GameEngine] 车道 ${lane} 没有有效路径`);
      return false;
    }

    // 计算实际速度
    const actualSpeed = vehicleConfig.baseSpeed * laneConfig.speedMultiplier;

    // 创建车辆
    const vehicle: Vehicle = {
      id: uuidv4(),
      playerId: playerId,
      type: vehicleType,
      lane: lane,
      pathIndex: 0,
      progress: 0,
      x: path[0].x,
      y: path[0].y,
      hp: vehicleConfig.hp,
      maxHp: vehicleConfig.hp,
      speed: actualSpeed,
      slowEffect: 0,
    };

    room.vehicles.push(vehicle);
    room.attacker.budget -= vehicleConfig.cost;

    console.log(`[GameEngine] 派出车辆: ${vehicleConfig.name} 在 ${laneConfig.name}`);
    return true;
  }

  /**
   * 放置防卫单位
   * @param room 游戏房间
   * @param playerId 玩家ID
   * @param unitType 单位类型
   * @param position 位置
   * @returns 是否成功
   */
  placeDefenseUnit(
    room: GameRoom,
    playerId: string,
    unitType: DefenseUnitType,
    position: Position
  ): boolean {
    // 检查玩家是否为防守方
    if (!room.defender || room.defender.id !== playerId) {
      console.log(`[GameEngine] 玩家 ${playerId} 不是防守方，无法放置单位`);
      return false;
    }

    // 检查游戏状态
    if (room.status !== GameStatus.PLAYING && room.status !== GameStatus.PREPARING) {
      console.log(`[GameEngine] 游戏状态不正确，无法放置单位`);
      return false;
    }

    // 获取单位配置
    const unitConfig = DEFENSE_UNIT_CONFIGS[unitType];

    // 检查预算
    if (room.defender.budget < unitConfig.cost) {
      console.log(`[GameEngine] 预算不足，无法放置单位`);
      return false;
    }

    // 检查位置是否在网格内
    if (position.x < 0 || position.x >= room.gridWidth || 
        position.y < 0 || position.y >= room.gridHeight) {
      console.log(`[GameEngine] 位置超出网格范围`);
      return false;
    }

    // 检查位置是否已被占用
    const occupied = room.defenseUnits.some(
      unit => unit.x === position.x && unit.y === position.y
    );
    if (occupied) {
      console.log(`[GameEngine] 位置已被占用`);
      return false;
    }

    // 检查位置是否在路径上
    for (const path of room.paths.values()) {
      const onPath = path.some(p => p.x === position.x && p.y === position.y);
      if (onPath) {
        console.log(`[GameEngine] 不能在路径上放置单位`);
        return false;
      }
    }

    // 创建防卫单位
    const unit: DefenseUnit = {
      id: uuidv4(),
      playerId: playerId,
      type: unitType,
      x: position.x,
      y: position.y,
      level: 1,
      cooldown: 0,
      targetId: null,
      angle: 0,
    };

    room.defenseUnits.push(unit);
    room.defender.budget -= unitConfig.cost;

    console.log(`[GameEngine] 放置单位: ${unitConfig.name} 在 (${position.x}, ${position.y})`);
    return true;
  }

  /**
   * 升级防卫单位
   * @param room 游戏房间
   * @param playerId 玩家ID
   * @param unitId 单位ID
   * @returns 是否成功
   */
  upgradeDefenseUnit(room: GameRoom, playerId: string, unitId: string): boolean {
    // 检查玩家是否为防守方
    if (!room.defender || room.defender.id !== playerId) {
      return false;
    }

    // 查找单位
    const unit = room.defenseUnits.find(u => u.id === unitId);
    if (!unit) {
      console.log(`[GameEngine] 单位 ${unitId} 不存在`);
      return false;
    }

    // 检查等级上限
    if (unit.level >= MAX_DEFENSE_LEVEL) {
      console.log(`[GameEngine] 单位已达最高等级`);
      return false;
    }

    // 计算升级费用
    const unitConfig = DEFENSE_UNIT_CONFIGS[unit.type];
    const upgradeCost = Math.floor(unitConfig.cost * UPGRADE_COST_MULTIPLIER * unit.level);

    // 检查预算
    if (room.defender.budget < upgradeCost) {
      console.log(`[GameEngine] 预算不足，无法升级`);
      return false;
    }

    unit.level++;
    room.defender.budget -= upgradeCost;

    console.log(`[GameEngine] 升级单位 ${unitId} 到等级 ${unit.level}`);
    return true;
  }

  /**
   * 出售防卫单位
   * @param room 游戏房间
   * @param playerId 玩家ID
   * @param unitId 单位ID
   * @returns 是否成功
   */
  sellDefenseUnit(room: GameRoom, playerId: string, unitId: string): boolean {
    // 检查玩家是否为防守方
    if (!room.defender || room.defender.id !== playerId) {
      return false;
    }

    // 查找单位索引
    const unitIndex = room.defenseUnits.findIndex(u => u.id === unitId);
    if (unitIndex === -1) {
      console.log(`[GameEngine] 单位 ${unitId} 不存在`);
      return false;
    }

    const unit = room.defenseUnits[unitIndex];
    const unitConfig = DEFENSE_UNIT_CONFIGS[unit.type];

    // 计算总投入（初始费用 + 升级费用）
    let totalInvestment = unitConfig.cost;
    for (let i = 1; i < unit.level; i++) {
      totalInvestment += Math.floor(unitConfig.cost * UPGRADE_COST_MULTIPLIER * i);
    }

    // 计算返还金额
    const refund = Math.floor(totalInvestment * SELL_REFUND_RATIO);

    // 移除单位并返还金额
    room.defenseUnits.splice(unitIndex, 1);
    room.defender.budget += refund;

    console.log(`[GameEngine] 出售单位 ${unitId}，返还 ${refund} 金币`);
    return true;
  }

  /**
   * 更新游戏状态（每帧调用）
   * @param room 游戏房间
   */
  update(room: GameRoom): void {
    if (room.status !== GameStatus.PLAYING) {
      return;
    }

    // 更新车辆位置
    this.updateVehicles(room);

    // 更新防卫单位（寻找目标、攻击）
    this.updateDefenseUnits(room);

    // 更新投射物
    this.updateProjectiles(room);

    // 检查游戏结束条件
    this.checkGameOver(room);
  }

  /**
   * 更新车辆位置
   */
  private updateVehicles(room: GameRoom): void {
    const vehiclesToRemove: number[] = [];

    for (let i = 0; i < room.vehicles.length; i++) {
      const vehicle = room.vehicles[i];
      const path = room.paths.get(vehicle.lane);
      
      if (!path || path.length === 0) {
        continue;
      }

      // 计算当前速度（考虑减速效果）
      let currentSpeed = vehicle.speed;
      if (vehicle.slowEffect > 0) {
        currentSpeed *= SLOW_EFFECT_FACTOR;
        vehicle.slowEffect--;
      }

      // 更新进度
      vehicle.progress += currentSpeed;

      // 检查是否到达下一个路径点
      while (vehicle.progress >= 1.0 && vehicle.pathIndex < path.length - 1) {
        vehicle.progress -= 1.0;
        vehicle.pathIndex++;
      }

      // 更新位置
      if (vehicle.pathIndex < path.length - 1) {
        const current = path[vehicle.pathIndex];
        const next = path[vehicle.pathIndex + 1];
        vehicle.x = current.x + (next.x - current.x) * vehicle.progress;
        vehicle.y = current.y + (next.y - current.y) * vehicle.progress;
      } else if (vehicle.progress >= 1.0) {
        // 车辆到达终点
        vehicle.x = path[path.length - 1].x;
        vehicle.y = path[path.length - 1].y;
        
        if (room.attacker) {
          room.attacker.score++;
        }
        
        vehiclesToRemove.push(i);
        console.log(`[GameEngine] 车辆 ${vehicle.id} 到达终点`);
      } else {
        vehicle.x = path[vehicle.pathIndex].x;
        vehicle.y = path[vehicle.pathIndex].y;
      }
    }

    // 移除到达终点的车辆
    for (let i = vehiclesToRemove.length - 1; i >= 0; i--) {
      room.vehicles.splice(vehiclesToRemove[i], 1);
    }
  }

  /**
   * 更新防卫单位
   */
  private updateDefenseUnits(room: GameRoom): void {
    for (const unit of room.defenseUnits) {
      const unitConfig = DEFENSE_UNIT_CONFIGS[unit.type];
      
      // 更新冷却时间
      if (unit.cooldown > 0) {
        unit.cooldown--;
      }

      // 寻找目标
      if (!unit.targetId || !this.isValidTarget(room, unit.targetId)) {
        unit.targetId = this.findTarget(room, unit);
      }

      // 攻击目标
      if (unit.targetId && unit.cooldown === 0) {
        this.attack(room, unit);
        unit.cooldown = unitConfig.attackSpeed;
      }

      // 更新朝向
      if (unit.targetId) {
        const target = room.vehicles.find(v => v.id === unit.targetId);
        if (target) {
          unit.angle = Math.atan2(target.y - unit.y, target.x - unit.x);
        }
      }
    }
  }

  /**
   * 检查目标是否有效
   */
  private isValidTarget(room: GameRoom, targetId: string): boolean {
    return room.vehicles.some(v => v.id === targetId);
  }

  /**
   * 寻找攻击目标
   */
  private findTarget(room: GameRoom, unit: DefenseUnit): string | null {
    const unitConfig = DEFENSE_UNIT_CONFIGS[unit.type];
    let closestVehicle: Vehicle | null = null;
    let minDistance = Infinity;

    for (const vehicle of room.vehicles) {
      const dist = distance(unit.x, unit.y, vehicle.x, vehicle.y);
      
      if (dist <= unitConfig.range && dist < minDistance) {
        minDistance = dist;
        closestVehicle = vehicle;
      }
    }

    return closestVehicle ? closestVehicle.id : null;
  }

  /**
   * 攻击目标
   */
  private attack(room: GameRoom, unit: DefenseUnit): void {
    const unitConfig = DEFENSE_UNIT_CONFIGS[unit.type];
    const target = room.vehicles.find(v => v.id === unit.targetId);
    
    if (!target) {
      return;
    }

    // 创建投射物
    const projectile: Projectile = {
      id: uuidv4(),
      x: unit.x,
      y: unit.y,
      targetId: target.id,
      damage: unitConfig.damage * unit.level, // 伤害随等级增加
      speed: PROJECTILE_SPEED,
      type: unit.type,
    };

    // 添加特殊效果
    if (unitConfig.specialEffect === 'slow') {
      projectile.slowFactor = SLOW_EFFECT_FACTOR;
      projectile.slowDuration = SLOW_EFFECT_DURATION;
    } else if (unitConfig.specialEffect === 'splash') {
      projectile.splashRadius = SPLASH_RADIUS;
    }

    room.projectiles.push(projectile);
    console.log(`[GameEngine] 单位 ${unit.id} 攻击车辆 ${target.id}`);
  }

  /**
   * 更新投射物
   */
  private updateProjectiles(room: GameRoom): void {
    const projectilesToRemove: number[] = [];

    for (let i = 0; i < room.projectiles.length; i++) {
      const projectile = room.projectiles[i];
      const target = room.vehicles.find(v => v.id === projectile.targetId);

      if (!target) {
        // 目标已消失，移除投射物
        projectilesToRemove.push(i);
        continue;
      }

      // 移动投射物朝向目标
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= projectile.speed) {
        // 击中目标
        this.hitTarget(room, projectile, target);
        projectilesToRemove.push(i);
      } else {
        // 继续移动
        projectile.x += (dx / dist) * projectile.speed;
        projectile.y += (dy / dist) * projectile.speed;
      }
    }

    // 移除已击中的投射物
    for (let i = projectilesToRemove.length - 1; i >= 0; i--) {
      room.projectiles.splice(projectilesToRemove[i], 1);
    }
  }

  /**
   * 击中目标
   */
  private hitTarget(room: GameRoom, projectile: Projectile, target: Vehicle): void {
    // 应用伤害
    target.hp -= projectile.damage;

    // 应用减速效果
    if (projectile.slowDuration) {
      target.slowEffect = Math.max(target.slowEffect, projectile.slowDuration);
    }

    // 溅射伤害
    if (projectile.splashRadius) {
      for (const vehicle of room.vehicles) {
        if (vehicle.id === target.id) {
          continue;
        }

        const dist = distance(target.x, target.y, vehicle.x, vehicle.y);
        if (dist <= projectile.splashRadius) {
          vehicle.hp -= projectile.damage * 0.5; // 溅射伤害减半
        }
      }
    }

    // 移除死亡的车辆
    const vehiclesToRemove: number[] = [];
    for (let i = 0; i < room.vehicles.length; i++) {
      if (room.vehicles[i].hp <= 0) {
        const vehicleConfig = VEHICLE_CONFIGS[room.vehicles[i].type];
        
        // 给防守方奖励
        if (room.defender) {
          room.defender.score++;
        }
        
        vehiclesToRemove.push(i);
        console.log(`[GameEngine] 车辆 ${room.vehicles[i].id} 被摧毁`);
      }
    }

    for (let i = vehiclesToRemove.length - 1; i >= 0; i--) {
      room.vehicles.splice(vehiclesToRemove[i], 1);
    }
  }

  /**
   * 检查游戏结束条件
   */
  private checkGameOver(room: GameRoom): void {
    if (!room.attacker || !room.defender) {
      return;
    }

    // 防守方胜利：进攻方预算用完且场上没有车辆
    if (room.attacker.budget <= 0 && room.vehicles.length === 0) {
      room.status = GameStatus.FINISHED;
      room.finishedAt = new Date();
      console.log(`[GameEngine] 游戏结束：防守方胜利`);
      return;
    }

    // 进攻方胜利：到达目的地的车辆数超过上限
    if (room.attacker.score >= DEFAULT_GAME_CONFIG.maxVehiclesReachingGoal) {
      room.status = GameStatus.FINISHED;
      room.finishedAt = new Date();
      console.log(`[GameEngine] 游戏结束：进攻方胜利`);
      return;
    }
  }
}
