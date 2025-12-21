/**
 * 网络客户端类型定义
 * 前端使用的类型定义，与后端保持一致
 */

/**
 * 玩家角色类型
 */
export enum PlayerRole {
  ATTACKER = 'ATTACKER',  // 进攻方
  DEFENDER = 'DEFENDER',  // 防守方
}

/**
 * 车辆类型
 */
export enum VehicleType {
  MOTORCYCLE_WITH_PERMIT = 'MOTORCYCLE_WITH_PERMIT',
  MOTORCYCLE_WITHOUT_PERMIT = 'MOTORCYCLE_WITHOUT_PERMIT',
  ELECTRIC_MOTORCYCLE = 'ELECTRIC_MOTORCYCLE',
  ELECTRIC_BIKE = 'ELECTRIC_BIKE',
}

/**
 * 车道类型
 */
export enum LaneType {
  MAIN_ROAD = 'MAIN_ROAD',
  AUXILIARY_ROAD = 'AUXILIARY_ROAD',
  NON_MOTORIZED = 'NON_MOTORIZED',
}

/**
 * 防卫单位类型
 */
export enum DefenseUnitType {
  AUXILIARY = 'AUXILIARY',
  TRAFFIC = 'TRAFFIC',
  PATROL = 'PATROL',
  SWAT = 'SWAT',
}

/**
 * 游戏状态
 */
export enum GameStatus {
  WAITING = 'WAITING',
  PREPARING = 'PREPARING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
}

/**
 * 消息类型
 */
export enum MessageType {
  CONNECT = 'CONNECT',
  DISCONNECT = 'DISCONNECT',
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  ROOM_LIST = 'ROOM_LIST',
  PLAYER_READY = 'PLAYER_READY',
  GAME_START = 'GAME_START',
  SPAWN_VEHICLE = 'SPAWN_VEHICLE',
  PLACE_DEFENSE = 'PLACE_DEFENSE',
  UPGRADE_DEFENSE = 'UPGRADE_DEFENSE',
  SELL_DEFENSE = 'SELL_DEFENSE',
  GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR',
}

/**
 * 位置
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 车辆信息
 */
export interface NetworkVehicle {
  id: string;
  playerId: string;
  type: VehicleType;
  lane: LaneType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  slowEffect: number;
}

/**
 * 防卫单位信息
 */
export interface NetworkDefenseUnit {
  id: string;
  playerId: string;
  type: DefenseUnitType;
  x: number;
  y: number;
  level: number;
  cooldown: number;
  targetId: string | null;
  angle: number;
}

/**
 * 投射物信息
 */
export interface NetworkProjectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  type: DefenseUnitType;
}

/**
 * 游戏状态
 */
export interface NetworkGameState {
  status: GameStatus;
  vehicles: NetworkVehicle[];
  defenseUnits: NetworkDefenseUnit[];
  projectiles: NetworkProjectile[];
  attackerBudget: number;
  defenderBudget: number;
  attackerScore: number;
  defenderScore: number;
  vehiclesReachedGoal: number;
}

/**
 * 房间信息
 */
export interface RoomInfo {
  id: string;
  status: GameStatus;
  playerCount: number;
  hasAttacker: boolean;
  hasDefender: boolean;
}
