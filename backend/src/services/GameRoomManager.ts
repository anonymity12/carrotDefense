/**
 * 游戏房间管理器
 * 负责管理所有游戏房间的创建、加入、离开等操作
 */

import { v4 as uuidv4 } from 'uuid';
import {
  GameRoom,
  Player,
  PlayerRole,
  GameStatus,
  Position,
  LaneType,
} from '../types/game.types.js';
import { DEFAULT_GAME_CONFIG, DEFAULT_PATHS } from '../config/game.config.js';

/**
 * 游戏房间管理器类
 */
export class GameRoomManager {
  private rooms: Map<string, GameRoom>;

  constructor() {
    this.rooms = new Map();
  }

  /**
   * 创建新游戏房间
   * @param playerName 玩家名称
   * @param role 玩家角色
   * @returns 新创建的房间ID和玩家信息
   */
  createRoom(playerName: string, role: PlayerRole): { roomId: string; playerId: string } {
    const roomId = uuidv4();
    const playerId = uuidv4();

    const player: Player = {
      id: playerId,
      role: role,
      name: playerName,
      budget: role === PlayerRole.ATTACKER 
        ? DEFAULT_GAME_CONFIG.attackerStartingBudget 
        : DEFAULT_GAME_CONFIG.defenderStartingBudget,
      score: 0,
      isReady: false,
    };

    const room: GameRoom = {
      id: roomId,
      status: GameStatus.WAITING,
      players: new Map([[playerId, player]]),
      attacker: role === PlayerRole.ATTACKER ? player : null,
      defender: role === PlayerRole.DEFENDER ? player : null,
      vehicles: [],
      defenseUnits: [],
      projectiles: [],
      gridWidth: DEFAULT_GAME_CONFIG.gridWidth,
      gridHeight: DEFAULT_GAME_CONFIG.gridHeight,
      paths: new Map(Object.entries(DEFAULT_PATHS) as [LaneType, Position[]][]),
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
    };

    this.rooms.set(roomId, room);
    console.log(`[GameRoomManager] 房间 ${roomId} 已创建，玩家 ${playerName} (${role}) 加入`);
    
    return { roomId, playerId };
  }

  /**
   * 加入游戏房间
   * @param roomId 房间ID
   * @param playerName 玩家名称
   * @param role 玩家角色
   * @returns 玩家ID或null（如果加入失败）
   */
  joinRoom(roomId: string, playerName: string, role: PlayerRole): string | null {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      console.log(`[GameRoomManager] 房间 ${roomId} 不存在`);
      return null;
    }

    if (room.status !== GameStatus.WAITING) {
      console.log(`[GameRoomManager] 房间 ${roomId} 已开始游戏，无法加入`);
      return null;
    }

    // 检查角色是否已被占用
    if (role === PlayerRole.ATTACKER && room.attacker) {
      console.log(`[GameRoomManager] 房间 ${roomId} 进攻方已满`);
      return null;
    }

    if (role === PlayerRole.DEFENDER && room.defender) {
      console.log(`[GameRoomManager] 房间 ${roomId} 防守方已满`);
      return null;
    }

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      role: role,
      name: playerName,
      budget: role === PlayerRole.ATTACKER 
        ? DEFAULT_GAME_CONFIG.attackerStartingBudget 
        : DEFAULT_GAME_CONFIG.defenderStartingBudget,
      score: 0,
      isReady: false,
    };

    room.players.set(playerId, player);
    
    if (role === PlayerRole.ATTACKER) {
      room.attacker = player;
    } else {
      room.defender = player;
    }

    console.log(`[GameRoomManager] 玩家 ${playerName} (${role}) 加入房间 ${roomId}`);
    
    return playerId;
  }

  /**
   * 离开游戏房间
   * @param roomId 房间ID
   * @param playerId 玩家ID
   */
  leaveRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return;
    }

    room.players.delete(playerId);
    
    if (player.role === PlayerRole.ATTACKER) {
      room.attacker = null;
    } else {
      room.defender = null;
    }

    console.log(`[GameRoomManager] 玩家 ${player.name} 离开房间 ${roomId}`);

    // 如果房间为空，删除房间
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      console.log(`[GameRoomManager] 房间 ${roomId} 已删除（无玩家）`);
    }
  }

  /**
   * 获取房间
   * @param roomId 房间ID
   * @returns 房间对象或undefined
   */
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * 获取所有房间列表
   * @returns 房间列表（简化信息）
   */
  getRoomList(): Array<{
    id: string;
    status: GameStatus;
    playerCount: number;
    hasAttacker: boolean;
    hasDefender: boolean;
  }> {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      status: room.status,
      playerCount: room.players.size,
      hasAttacker: room.attacker !== null,
      hasDefender: room.defender !== null,
    }));
  }

  /**
   * 设置玩家准备状态
   * @param roomId 房间ID
   * @param playerId 玩家ID
   * @param ready 是否准备
   * @returns 是否成功
   */
  setPlayerReady(roomId: string, playerId: string, ready: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return false;
    }

    player.isReady = ready;
    console.log(`[GameRoomManager] 玩家 ${player.name} 设置准备状态: ${ready}`);

    // 检查是否所有玩家都准备好
    if (this.areAllPlayersReady(roomId)) {
      this.startGame(roomId);
    }

    return true;
  }

  /**
   * 检查是否所有玩家都准备好
   * @param roomId 房间ID
   * @returns 是否所有玩家都准备好
   */
  private areAllPlayersReady(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.size < 2) {
      return false;
    }

    for (const player of room.players.values()) {
      if (!player.isReady) {
        return false;
      }
    }

    return true;
  }

  /**
   * 开始游戏
   * @param roomId 房间ID
   */
  private startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.status = GameStatus.PREPARING;
    room.startedAt = new Date();
    console.log(`[GameRoomManager] 房间 ${roomId} 游戏开始（准备阶段）`);
  }

  /**
   * 更新房间状态
   * @param roomId 房间ID
   * @param status 新状态
   */
  updateRoomStatus(roomId: string, status: GameStatus): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.status = status;
    console.log(`[GameRoomManager] 房间 ${roomId} 状态更新: ${status}`);
  }
}
