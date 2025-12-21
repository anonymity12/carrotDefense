/**
 * 网络消息协议定义
 * 定义客户端和服务器之间的通信消息格式
 */

import { PlayerRole, VehicleType, LaneType, DefenseUnitType, Position } from './game.types.js';

/**
 * 消息类型枚举
 */
export enum MessageType {
  // 连接相关
  CONNECT = 'CONNECT',
  DISCONNECT = 'DISCONNECT',
  
  // 房间相关
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  ROOM_LIST = 'ROOM_LIST',
  
  // 游戏准备
  PLAYER_READY = 'PLAYER_READY',
  GAME_START = 'GAME_START',
  
  // 游戏操作
  SPAWN_VEHICLE = 'SPAWN_VEHICLE',      // 进攻方：派出车辆
  PLACE_DEFENSE = 'PLACE_DEFENSE',      // 防守方：放置防卫单位
  UPGRADE_DEFENSE = 'UPGRADE_DEFENSE',  // 防守方：升级防卫单位
  SELL_DEFENSE = 'SELL_DEFENSE',        // 防守方：出售防卫单位
  
  // 游戏状态同步
  GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
  
  // 游戏结束
  GAME_OVER = 'GAME_OVER',
  
  // 错误消息
  ERROR = 'ERROR',
}

/**
 * 基础消息接口
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

/**
 * 连接消息
 */
export interface ConnectMessage extends BaseMessage {
  type: MessageType.CONNECT;
  playerName: string;
}

/**
 * 创建房间消息
 */
export interface CreateRoomMessage extends BaseMessage {
  type: MessageType.CREATE_ROOM;
  playerName: string;
  role: PlayerRole;
}

/**
 * 加入房间消息
 */
export interface JoinRoomMessage extends BaseMessage {
  type: MessageType.JOIN_ROOM;
  roomId: string;
  playerName: string;
  role: PlayerRole;
}

/**
 * 离开房间消息
 */
export interface LeaveRoomMessage extends BaseMessage {
  type: MessageType.LEAVE_ROOM;
  roomId: string;
}

/**
 * 房间列表请求
 */
export interface RoomListMessage extends BaseMessage {
  type: MessageType.ROOM_LIST;
}

/**
 * 玩家准备消息
 */
export interface PlayerReadyMessage extends BaseMessage {
  type: MessageType.PLAYER_READY;
  ready: boolean;
}

/**
 * 派出车辆消息
 */
export interface SpawnVehicleMessage extends BaseMessage {
  type: MessageType.SPAWN_VEHICLE;
  vehicleType: VehicleType;
  lane: LaneType;
}

/**
 * 放置防卫单位消息
 */
export interface PlaceDefenseMessage extends BaseMessage {
  type: MessageType.PLACE_DEFENSE;
  unitType: DefenseUnitType;
  position: Position;
}

/**
 * 升级防卫单位消息
 */
export interface UpgradeDefenseMessage extends BaseMessage {
  type: MessageType.UPGRADE_DEFENSE;
  unitId: string;
}

/**
 * 出售防卫单位消息
 */
export interface SellDefenseMessage extends BaseMessage {
  type: MessageType.SELL_DEFENSE;
  unitId: string;
}

/**
 * 游戏状态更新消息
 */
export interface GameStateUpdateMessage extends BaseMessage {
  type: MessageType.GAME_STATE_UPDATE;
  state: {
    status: string;
    vehicles: any[];
    defenseUnits: any[];
    projectiles: any[];
    attackerBudget: number;
    defenderBudget: number;
    vehiclesReachedGoal: number;
  };
}

/**
 * 游戏开始消息
 */
export interface GameStartMessage extends BaseMessage {
  type: MessageType.GAME_START;
  config: any;
}

/**
 * 游戏结束消息
 */
export interface GameOverMessage extends BaseMessage {
  type: MessageType.GAME_OVER;
  winner: PlayerRole;
  reason: string;
}

/**
 * 错误消息
 */
export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  code: string;
  message: string;
}

/**
 * 联合消息类型
 */
export type GameMessage =
  | ConnectMessage
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | RoomListMessage
  | PlayerReadyMessage
  | SpawnVehicleMessage
  | PlaceDefenseMessage
  | UpgradeDefenseMessage
  | SellDefenseMessage
  | GameStateUpdateMessage
  | GameStartMessage
  | GameOverMessage
  | ErrorMessage;
