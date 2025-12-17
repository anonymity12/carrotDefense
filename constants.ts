
import { EnemyType, TowerType, WaveConfig } from './types';

// 动态计算格子大小
export const calculateCellSize = (gridWidth: number = GRID_WIDTH, gridHeight: number = GRID_HEIGHT) => {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isMobile = screenWidth < 768;
  
  // 考虑padding和UI元素占用的空间
  // Mobile: Top HUD (~80px) + Bottom Menu (~120px) + Padding (~20px) + Safety (~30px) = ~250px
  // Desktop: HUD + Controls = ~300px
  const reservedHeight = isMobile ? 250 : 300;
  const paddingX = isMobile ? 16 : 32;

  const availableWidth = screenWidth - paddingX; 
  const availableHeight = screenHeight - reservedHeight; 
  
  const cellSizeByWidth = Math.floor(availableWidth / gridWidth);
  const cellSizeByHeight = Math.floor(availableHeight / gridHeight);
  
  // 取较小值确保完全显示
  // Mobile min size reduced to 32px to fit smaller screens (iPhone SE etc)
  const minSize = isMobile ? 30 : 35;
  const maxSize = 60;

  return Math.max(Math.min(Math.min(cellSizeByWidth, cellSizeByHeight), maxSize), minSize);
};

export const CELL_SIZE = 60; // 默认桌面端尺寸
export const GRID_WIDTH = 12;
export const GRID_HEIGHT = 8;
export const MOBILE_GRID_WIDTH = 7;
export const MOBILE_GRID_HEIGHT = 11;
export const FPS = 60;
export const MAX_TOWER_LEVEL = 3;

export const TOWER_STATS: Record<TowerType, { name: string; cost: number; range: number; damage: number; speed: number; description: string; color: string }> = {
  [TowerType.AUXILIARY]: {
    name: 'Auxiliary',
    cost: 100,
    range: 2.5, // Grid cells
    damage: 20,
    speed: 30, // Frames per shot (lower is faster)
    description: 'Rookie unit. Blowing whistles fast.',
    color: 'bg-blue-500'
  },
  [TowerType.TRAFFIC]: {
    name: 'Traffic Cop',
    cost: 180,
    range: 2,
    damage: 5,
    speed: 45,
    description: 'Checks licenses. Slows bikes down.',
    color: 'bg-yellow-500'
  },
  [TowerType.PATROL]: {
    name: 'Iron Patrol',
    cost: 250,
    range: 3,
    damage: 15,
    speed: 40,
    description: 'Motorcycle unit. Area control.',
    color: 'bg-cyan-600'
  },
  [TowerType.SWAT]: {
    name: 'SWAT Team',
    cost: 350,
    range: 4,
    damage: 80,
    speed: 90,
    description: 'Heavy enforcement. High impact.',
    color: 'bg-slate-800'
  },
};

export const ENEMY_STATS: Record<EnemyType, { hp: number; speed: number; reward: number; color: string; label: string }> = {
  [EnemyType.SCOOTER]: { hp: 50, speed: 0.02, reward: 15, color: 'bg-orange-400', label: 'No Helmet' },
  [EnemyType.DELIVERY]: { hp: 150, speed: 0.01, reward: 25, color: 'bg-red-500', label: 'No License' },
  [EnemyType.RACER]: { hp: 30, speed: 0.035, reward: 20, color: 'bg-purple-400', label: 'Speeding' },
  [EnemyType.MODIFIED]: { hp: 1000, speed: 0.008, reward: 500, color: 'bg-black', label: 'Modded' },
};

export const DEFAULT_LEVEL_PATH = [
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 },
  { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 2 },
  { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 },
  { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 6, y: 4 },
  { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 },
  { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 }, { x: 10, y: 6 },
  { x: 10, y: 5 }, { x: 10, y: 4 }, { x: 11, y: 4 }
];

export const DEFAULT_MOBILE_LEVEL_PATH = [
  { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, 
  { x: 4, y: 2 }, { x: 5, y: 2 },
  { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 },
  { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 5 },
  { x: 1, y: 6 }, { x: 1, y: 7 }, { x: 1, y: 8 },
  { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 },
  { x: 5, y: 9 }, { x: 5, y: 10 }
];

export const DEFAULT_WAVES: WaveConfig[] = [
  { enemies: [{ type: EnemyType.SCOOTER, count: 5, interval: 60 }], delayBetween: 200 },
  { enemies: [{ type: EnemyType.SCOOTER, count: 5, interval: 40 }, { type: EnemyType.DELIVERY, count: 2, interval: 80 }], delayBetween: 300 },
  { enemies: [{ type: EnemyType.RACER, count: 10, interval: 30 }], delayBetween: 300 },
  { enemies: [{ type: EnemyType.DELIVERY, count: 5, interval: 60 }, { type: EnemyType.MODIFIED, count: 1, interval: 100 }], delayBetween: 0 },
];
