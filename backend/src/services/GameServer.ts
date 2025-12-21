/**
 * WebSocket 服务器
 * 处理客户端连接和消息
 */

import { WebSocketServer, WebSocket } from 'ws';
import { GameRoomManager } from './GameRoomManager.js';
import { GameEngine } from './GameEngine.js';
import {
  MessageType,
  GameMessage,
  CreateRoomMessage,
  JoinRoomMessage,
  PlayerReadyMessage,
  SpawnVehicleMessage,
  PlaceDefenseMessage,
  UpgradeDefenseMessage,
  SellDefenseMessage,
  GameStateUpdateMessage,
  ErrorMessage,
} from '../types/message.types.js';
import { GameStatus, PlayerRole } from '../types/game.types.js';
import { FPS } from '../config/game.config.js';

/**
 * 客户端连接信息
 */
interface ClientConnection {
  ws: WebSocket;
  playerId: string | null;
  roomId: string | null;
}

/**
 * 游戏服务器类
 */
export class GameServer {
  private wss: WebSocketServer;
  private roomManager: GameRoomManager;
  private gameEngine: GameEngine;
  private clients: Map<WebSocket, ClientConnection>;
  private gameLoops: Map<string, NodeJS.Timeout>;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.roomManager = new GameRoomManager();
    this.gameEngine = new GameEngine();
    this.clients = new Map();
    this.gameLoops = new Map();

    this.setupWebSocketServer();
    console.log(`[GameServer] WebSocket 服务器启动在端口 ${port}`);
  }

  /**
   * 设置 WebSocket 服务器
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[GameServer] 新客户端连接');

      // 初始化客户端连接
      const client: ClientConnection = {
        ws: ws,
        playerId: null,
        roomId: null,
      };
      this.clients.set(ws, client);

      // 处理消息
      ws.on('message', (data: Buffer) => {
        try {
          const message: GameMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('[GameServer] 消息解析错误:', error);
          this.sendError(ws, 'PARSE_ERROR', '消息格式错误');
        }
      });

      // 处理断开连接
      ws.on('close', () => {
        console.log('[GameServer] 客户端断开连接');
        this.handleDisconnect(ws);
      });

      // 处理错误
      ws.on('error', (error) => {
        console.error('[GameServer] WebSocket 错误:', error);
      });
    });
  }

  /**
   * 处理消息
   */
  private handleMessage(ws: WebSocket, message: GameMessage): void {
    console.log(`[GameServer] 收到消息: ${message.type}`);

    switch (message.type) {
      case MessageType.CREATE_ROOM:
        this.handleCreateRoom(ws, message as CreateRoomMessage);
        break;

      case MessageType.JOIN_ROOM:
        this.handleJoinRoom(ws, message as JoinRoomMessage);
        break;

      case MessageType.LEAVE_ROOM:
        this.handleLeaveRoom(ws);
        break;

      case MessageType.ROOM_LIST:
        this.handleRoomList(ws);
        break;

      case MessageType.PLAYER_READY:
        this.handlePlayerReady(ws, message as PlayerReadyMessage);
        break;

      case MessageType.SPAWN_VEHICLE:
        this.handleSpawnVehicle(ws, message as SpawnVehicleMessage);
        break;

      case MessageType.PLACE_DEFENSE:
        this.handlePlaceDefense(ws, message as PlaceDefenseMessage);
        break;

      case MessageType.UPGRADE_DEFENSE:
        this.handleUpgradeDefense(ws, message as UpgradeDefenseMessage);
        break;

      case MessageType.SELL_DEFENSE:
        this.handleSellDefense(ws, message as SellDefenseMessage);
        break;

      default:
        this.sendError(ws, 'UNKNOWN_MESSAGE', '未知消息类型');
    }
  }

  /**
   * 处理创建房间
   */
  private handleCreateRoom(ws: WebSocket, message: CreateRoomMessage): void {
    const { roomId, playerId } = this.roomManager.createRoom(
      message.playerName,
      message.role
    );

    const client = this.clients.get(ws);
    if (client) {
      client.playerId = playerId;
      client.roomId = roomId;
    }

    // 发送房间信息
    this.send(ws, {
      type: MessageType.CREATE_ROOM,
      timestamp: Date.now(),
      roomId,
      playerId,
    });

    console.log(`[GameServer] 房间 ${roomId} 已创建`);
  }

  /**
   * 处理加入房间
   */
  private handleJoinRoom(ws: WebSocket, message: JoinRoomMessage): void {
    const playerId = this.roomManager.joinRoom(
      message.roomId,
      message.playerName,
      message.role
    );

    if (!playerId) {
      this.sendError(ws, 'JOIN_FAILED', '加入房间失败');
      return;
    }

    const client = this.clients.get(ws);
    if (client) {
      client.playerId = playerId;
      client.roomId = message.roomId;
    }

    // 发送确认消息
    this.send(ws, {
      type: MessageType.JOIN_ROOM,
      timestamp: Date.now(),
      roomId: message.roomId,
      playerId,
    });

    // 通知房间内所有玩家
    this.broadcastToRoom(message.roomId, {
      type: MessageType.GAME_STATE_UPDATE,
      timestamp: Date.now(),
      state: this.getRoomState(message.roomId),
    });

    console.log(`[GameServer] 玩家 ${playerId} 加入房间 ${message.roomId}`);
  }

  /**
   * 处理离开房间
   */
  private handleLeaveRoom(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client || !client.playerId || !client.roomId) {
      return;
    }

    this.roomManager.leaveRoom(client.roomId, client.playerId);

    // 停止游戏循环
    this.stopGameLoop(client.roomId);

    client.playerId = null;
    client.roomId = null;

    console.log(`[GameServer] 玩家离开房间`);
  }

  /**
   * 处理房间列表请求
   */
  private handleRoomList(ws: WebSocket): void {
    const rooms = this.roomManager.getRoomList();
    
    this.send(ws, {
      type: MessageType.ROOM_LIST,
      timestamp: Date.now(),
      rooms,
    });
  }

  /**
   * 处理玩家准备
   */
  private handlePlayerReady(ws: WebSocket, message: PlayerReadyMessage): void {
    const client = this.clients.get(ws);
    if (!client || !client.playerId || !client.roomId) {
      this.sendError(ws, 'NOT_IN_ROOM', '未加入房间');
      return;
    }

    const success = this.roomManager.setPlayerReady(
      client.roomId,
      client.playerId,
      message.ready
    );

    if (!success) {
      this.sendError(ws, 'READY_FAILED', '设置准备状态失败');
      return;
    }

    const room = this.roomManager.getRoom(client.roomId);
    
    // 广播游戏状态
    this.broadcastToRoom(client.roomId, {
      type: MessageType.GAME_STATE_UPDATE,
      timestamp: Date.now(),
      state: this.getRoomState(client.roomId),
    });

    // 如果游戏开始准备阶段，发送游戏开始消息
    if (room && room.status === GameStatus.PREPARING) {
      this.broadcastToRoom(client.roomId, {
        type: MessageType.GAME_START,
        timestamp: Date.now(),
        config: {
          gridWidth: room.gridWidth,
          gridHeight: room.gridHeight,
          paths: Array.from(room.paths.entries()),
        },
      });

      // 启动游戏循环
      this.startGameLoop(client.roomId);
    }
  }

  /**
   * 处理派出车辆
   */
  private handleSpawnVehicle(ws: WebSocket, message: SpawnVehicleMessage): void {
    const client = this.clients.get(ws);
    if (!client || !client.playerId || !client.roomId) {
      this.sendError(ws, 'NOT_IN_ROOM', '未加入房间');
      return;
    }

    const room = this.roomManager.getRoom(client.roomId);
    if (!room) {
      this.sendError(ws, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }

    const success = this.gameEngine.spawnVehicle(
      room,
      client.playerId,
      message.vehicleType,
      message.lane
    );

    if (!success) {
      this.sendError(ws, 'SPAWN_FAILED', '派出车辆失败');
      return;
    }

    // 广播游戏状态
    this.broadcastToRoom(client.roomId, {
      type: MessageType.GAME_STATE_UPDATE,
      timestamp: Date.now(),
      state: this.getRoomState(client.roomId),
    });
  }

  /**
   * 处理放置防卫单位
   */
  private handlePlaceDefense(ws: WebSocket, message: PlaceDefenseMessage): void {
    const client = this.clients.get(ws);
    if (!client || !client.playerId || !client.roomId) {
      this.sendError(ws, 'NOT_IN_ROOM', '未加入房间');
      return;
    }

    const room = this.roomManager.getRoom(client.roomId);
    if (!room) {
      this.sendError(ws, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }

    const success = this.gameEngine.placeDefenseUnit(
      room,
      client.playerId,
      message.unitType,
      message.position
    );

    if (!success) {
      this.sendError(ws, 'PLACE_FAILED', '放置单位失败');
      return;
    }

    // 广播游戏状态
    this.broadcastToRoom(client.roomId, {
      type: MessageType.GAME_STATE_UPDATE,
      timestamp: Date.now(),
      state: this.getRoomState(client.roomId),
    });
  }

  /**
   * 处理升级防卫单位
   */
  private handleUpgradeDefense(ws: WebSocket, message: UpgradeDefenseMessage): void {
    const client = this.clients.get(ws);
    if (!client || !client.playerId || !client.roomId) {
      this.sendError(ws, 'NOT_IN_ROOM', '未加入房间');
      return;
    }

    const room = this.roomManager.getRoom(client.roomId);
    if (!room) {
      this.sendError(ws, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }

    const success = this.gameEngine.upgradeDefenseUnit(
      room,
      client.playerId,
      message.unitId
    );

    if (!success) {
      this.sendError(ws, 'UPGRADE_FAILED', '升级单位失败');
      return;
    }

    // 广播游戏状态
    this.broadcastToRoom(client.roomId, {
      type: MessageType.GAME_STATE_UPDATE,
      timestamp: Date.now(),
      state: this.getRoomState(client.roomId),
    });
  }

  /**
   * 处理出售防卫单位
   */
  private handleSellDefense(ws: WebSocket, message: SellDefenseMessage): void {
    const client = this.clients.get(ws);
    if (!client || !client.playerId || !client.roomId) {
      this.sendError(ws, 'NOT_IN_ROOM', '未加入房间');
      return;
    }

    const room = this.roomManager.getRoom(client.roomId);
    if (!room) {
      this.sendError(ws, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }

    const success = this.gameEngine.sellDefenseUnit(
      room,
      client.playerId,
      message.unitId
    );

    if (!success) {
      this.sendError(ws, 'SELL_FAILED', '出售单位失败');
      return;
    }

    // 广播游戏状态
    this.broadcastToRoom(client.roomId, {
      type: MessageType.GAME_STATE_UPDATE,
      timestamp: Date.now(),
      state: this.getRoomState(client.roomId),
    });
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(ws: WebSocket): void {
    this.handleLeaveRoom(ws);
    this.clients.delete(ws);
  }

  /**
   * 启动游戏循环
   */
  private startGameLoop(roomId: string): void {
    // 如果已有游戏循环，先停止
    this.stopGameLoop(roomId);

    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      return;
    }

    // 将状态改为游戏中
    this.roomManager.updateRoomStatus(roomId, GameStatus.PLAYING);

    // 启动游戏循环（60 FPS）
    const interval = setInterval(() => {
      const currentRoom = this.roomManager.getRoom(roomId);
      if (!currentRoom) {
        this.stopGameLoop(roomId);
        return;
      }

      // 更新游戏状态
      this.gameEngine.update(currentRoom);

      // 广播游戏状态
      this.broadcastToRoom(roomId, {
        type: MessageType.GAME_STATE_UPDATE,
        timestamp: Date.now(),
        state: this.getRoomState(roomId),
      });

      // 检查游戏是否结束
      if (currentRoom.status === GameStatus.FINISHED) {
        this.stopGameLoop(roomId);
        
        // 发送游戏结束消息
        const winner = currentRoom.attacker && currentRoom.attacker.score >= 10
          ? PlayerRole.ATTACKER
          : PlayerRole.DEFENDER;
        
        this.broadcastToRoom(roomId, {
          type: MessageType.GAME_OVER,
          timestamp: Date.now(),
          winner,
          reason: winner === PlayerRole.ATTACKER 
            ? '进攻方成功突破防线' 
            : '防守方成功拦截所有车辆',
        });
      }
    }, 1000 / FPS);

    this.gameLoops.set(roomId, interval);
    console.log(`[GameServer] 房间 ${roomId} 游戏循环已启动`);
  }

  /**
   * 停止游戏循环
   */
  private stopGameLoop(roomId: string): void {
    const interval = this.gameLoops.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.gameLoops.delete(roomId);
      console.log(`[GameServer] 房间 ${roomId} 游戏循环已停止`);
    }
  }

  /**
   * 获取房间状态
   */
  private getRoomState(roomId: string): any {
    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      return null;
    }

    return {
      status: room.status,
      vehicles: room.vehicles,
      defenseUnits: room.defenseUnits,
      projectiles: room.projectiles,
      attackerBudget: room.attacker?.budget || 0,
      defenderBudget: room.defender?.budget || 0,
      attackerScore: room.attacker?.score || 0,
      defenderScore: room.defender?.score || 0,
      vehiclesReachedGoal: room.attacker?.score || 0,
    };
  }

  /**
   * 发送消息给客户端
   */
  private send(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 广播消息到房间内所有客户端
   */
  private broadcastToRoom(roomId: string, message: any): void {
    for (const [ws, client] of this.clients.entries()) {
      if (client.roomId === roomId) {
        this.send(ws, message);
      }
    }
  }

  /**
   * 发送错误消息
   */
  private sendError(ws: WebSocket, code: string, message: string): void {
    const errorMessage: ErrorMessage = {
      type: MessageType.ERROR,
      timestamp: Date.now(),
      code,
      message,
    };
    this.send(ws, errorMessage);
  }
}
