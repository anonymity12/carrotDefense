export enum TowerType {
  BOTTLE = 'BOTTLE', // Basic, fast
  FAN = 'FAN', // Splash/Multi-target
  POOP = 'POOP', // Slows enemies
  STAR = 'STAR', // High damage, slow fire
}

export enum EnemyType {
  SLIME = 'SLIME', // Weak, fast
  GOBBLE = 'GOBBLE', // Tanky, slow
  FLY = 'FLY', // Very fast, low HP
  BOSS = 'BOSS', // Very Tanky
}

export interface Position {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  pathIndex: number; // Current index in the path array
  progress: number; // 0.0 to 1.0 progress between current and next path node
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  frozen: number; // Slow duration remaining
  frozenFactor: number; // 0.5 means half speed
}

export interface Tower {
  id: string;
  type: TowerType;
  x: number; // Grid coordinate X
  y: number; // Grid coordinate Y
  level: number;
  cooldown: number; // Frames until next shot
  range: number;
  damage: number;
  targetId: string | null;
  angle: number; // For visual rotation
}

export interface Projectile {
  id: string;
  x: number; // Pixel/Board coordinate
  y: number;
  targetId: string; // Homing
  damage: number;
  speed: number;
  type: TowerType; // Determines visual
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

export interface GameLevel {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  path: Position[]; // Ordered list of grid coordinates [start, ..., end]
  waves: WaveConfig[];
  startingMoney: number;
}

export interface WaveConfig {
  enemies: { type: EnemyType; count: number; interval: number }[];
  delayBetween: number; // frames or ms
}

export interface GameState {
  money: number;
  lives: number;
  waveIndex: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  level: GameLevel;
  gameSpeed: number; // 1x, 2x
}
