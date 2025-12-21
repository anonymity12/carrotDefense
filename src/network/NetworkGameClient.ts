/**
 * 网络游戏客户端
 * 负责与后端服务器的 WebSocket 通信
 */

import {
  MessageType,
  PlayerRole,
  VehicleType,
  LaneType,
  DefenseUnitType,
  Position,
  NetworkGameState,
  RoomInfo,
} from './types';

/**
 * 事件回调类型
 */
type EventCallback = (data: any) => void;

/**
 * 网络游戏客户端类
 */
export class NetworkGameClient {
  private ws: WebSocket | null = null;
  private url: string;
  private eventListeners: Map<MessageType, EventCallback[]> = new Map();
  
  // 客户端状态
  public playerId: string | null = null;
  public roomId: string | null = null;
  public role: PlayerRole | null = null;
  public isConnected: boolean = false;

  /**
   * 构造函数
   * @param url WebSocket 服务器地址，例如 'ws://localhost:8080'
   */
  constructor(url: string) {
    this.url = url;
  }

  /**
   * 连接到服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[NetworkClient] 已连接到服务器');
          this.isConnected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[NetworkClient] 消息解析错误:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('[NetworkClient] 与服务器断开连接');
          this.isConnected = false;
          this.emit(MessageType.DISCONNECT, {});
        };

        this.ws.onerror = (error) => {
          console.error('[NetworkClient] WebSocket 错误:', error);
          reject(new Error('WebSocket 连接失败，请检查服务器是否正在运行'));
        };
      } catch (error) {
        reject(new Error(`创建 WebSocket 连接失败: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * 发送消息到服务器
   */
  private send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[NetworkClient] WebSocket 未连接');
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(message: any): void {
    const type = message.type as MessageType;
    
    // 更新客户端状态
    if (type === MessageType.CREATE_ROOM || type === MessageType.JOIN_ROOM) {
      if (message.playerId) this.playerId = message.playerId;
      if (message.roomId) this.roomId = message.roomId;
    }

    // 触发事件监听器
    this.emit(type, message);
  }

  /**
   * 注册事件监听器
   */
  on(eventType: MessageType, callback: EventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(eventType: MessageType, callback: EventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private emit(eventType: MessageType, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (!listeners) return;

    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[NetworkClient] 事件处理错误 (${eventType}):`, error);
      }
    });
  }

  /**
   * 创建游戏房间
   */
  createRoom(playerName: string, role: PlayerRole): void {
    this.role = role;
    this.send({
      type: MessageType.CREATE_ROOM,
      timestamp: Date.now(),
      playerName,
      role,
    });
  }

  /**
   * 加入游戏房间
   */
  joinRoom(roomId: string, playerName: string, role: PlayerRole): void {
    this.role = role;
    this.send({
      type: MessageType.JOIN_ROOM,
      timestamp: Date.now(),
      roomId,
      playerName,
      role,
    });
  }

  /**
   * 离开游戏房间
   */
  leaveRoom(): void {
    if (!this.roomId) return;

    this.send({
      type: MessageType.LEAVE_ROOM,
      timestamp: Date.now(),
      roomId: this.roomId,
    });

    this.roomId = null;
    this.playerId = null;
    this.role = null;
  }

  /**
   * 请求房间列表
   */
  requestRoomList(): void {
    this.send({
      type: MessageType.ROOM_LIST,
      timestamp: Date.now(),
    });
  }

  /**
   * 设置准备状态
   */
  setReady(ready: boolean): void {
    this.send({
      type: MessageType.PLAYER_READY,
      timestamp: Date.now(),
      ready,
    });
  }

  /**
   * 派出车辆（进攻方）
   */
  spawnVehicle(vehicleType: VehicleType, lane: LaneType): void {
    if (this.role !== PlayerRole.ATTACKER) {
      console.warn('[NetworkClient] 只有进攻方可以派出车辆');
      return;
    }

    this.send({
      type: MessageType.SPAWN_VEHICLE,
      timestamp: Date.now(),
      vehicleType,
      lane,
    });
  }

  /**
   * 放置防卫单位（防守方）
   */
  placeDefense(unitType: DefenseUnitType, position: Position): void {
    if (this.role !== PlayerRole.DEFENDER) {
      console.warn('[NetworkClient] 只有防守方可以放置防卫单位');
      return;
    }

    this.send({
      type: MessageType.PLACE_DEFENSE,
      timestamp: Date.now(),
      unitType,
      position,
    });
  }

  /**
   * 升级防卫单位（防守方）
   */
  upgradeDefense(unitId: string): void {
    if (this.role !== PlayerRole.DEFENDER) {
      console.warn('[NetworkClient] 只有防守方可以升级防卫单位');
      return;
    }

    this.send({
      type: MessageType.UPGRADE_DEFENSE,
      timestamp: Date.now(),
      unitId,
    });
  }

  /**
   * 出售防卫单位（防守方）
   */
  sellDefense(unitId: string): void {
    if (this.role !== PlayerRole.DEFENDER) {
      console.warn('[NetworkClient] 只有防守方可以出售防卫单位');
      return;
    }

    this.send({
      type: MessageType.SELL_DEFENSE,
      timestamp: Date.now(),
      unitId,
    });
  }
}
