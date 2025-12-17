
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Zap, 
  Wind, 
  Snowflake, 
  Star, 
  Play, 
  Pause, 
  RotateCcw, 
  Heart, 
  Coins, 
  Shield, 
  Siren,
  Bike,
  Octagon,
  User,
  Trash2,
  ArrowUpCircle,
  Megaphone,
  Radio,
  FileWarning,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';
import { CELL_SIZE, calculateCellSize, GRID_HEIGHT, GRID_WIDTH, TOWER_STATS, ENEMY_STATS, MAX_TOWER_LEVEL } from '../constants';
import { Enemy, EnemyType, GameLevel, GameState, TowerType } from '../types';
import { pandaTowerIconSpecs, pandaEnemyIconSpecs } from '../assets/iconManifest';

// Utility for distance
const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

const towerIconSources: Record<TowerType, string> = {
  [TowerType.AUXILIARY]: pandaTowerIconSpecs[TowerType.AUXILIARY].publicPath,
  [TowerType.TRAFFIC]: pandaTowerIconSpecs[TowerType.TRAFFIC].publicPath,
  [TowerType.PATROL]: pandaTowerIconSpecs[TowerType.PATROL].publicPath,
  [TowerType.SWAT]: pandaTowerIconSpecs[TowerType.SWAT].publicPath,
};

const enemyIconSources: Record<EnemyType, string> = {
  [EnemyType.SCOOTER]: pandaEnemyIconSpecs[EnemyType.SCOOTER].publicPath,
  [EnemyType.DELIVERY]: pandaEnemyIconSpecs[EnemyType.DELIVERY].publicPath,
  [EnemyType.RACER]: pandaEnemyIconSpecs[EnemyType.RACER].publicPath,
  [EnemyType.MODIFIED]: pandaEnemyIconSpecs[EnemyType.MODIFIED].publicPath,
};

const getTowerFallbackIcon = (type: TowerType, className: string) => {
  switch (type) {
    case TowerType.AUXILIARY:
      return <User className={className} />;
    case TowerType.TRAFFIC:
      return <Octagon className={className} />;
    case TowerType.PATROL:
      return <Siren className={`${className} animate-pulse`} />;
    case TowerType.SWAT:
    default:
      return <Shield className={className} />;
  }
};

const getEnemyFallbackIcon = (type: EnemyType, className: string) => <Bike className={className} />;

interface IconImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

const IconImage: React.FC<IconImageProps> = ({ src, alt, className, fallback }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
};

interface GameProps {
  level: GameLevel;
  onExit: () => void;
  onRestart: () => void;
}

// 响应式hook
const useResponsiveGame = (gridWidth: number, gridHeight: number) => {
  const [cellSize, setCellSize] = useState(CELL_SIZE);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setCellSize(calculateCellSize(gridWidth, gridHeight));
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridWidth, gridHeight]);
  
  return { cellSize, isMobile };
};

const Game: React.FC<GameProps> = ({ level, onExit, onRestart }) => {
  const { cellSize, isMobile } = useResponsiveGame(level.gridWidth, level.gridHeight);
  
  // Game State Ref (Mutable for loop performance)
  const gameState = useRef<GameState>({
    money: level.startingMoney,
    lives: 10,
    waveIndex: 0,
    isPlaying: false,
    isGameOver: false,
    isVictory: false,
    enemies: [],
    towers: [],
    projectiles: [],
    level: level,
    gameSpeed: 1,
  });

  // React State for rendering
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null); // For placement
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null); // For upgrades
  const [hoverCell, setHoverCell] = useState<{x: number, y: number} | null>(null);
  const [selectedForPreview, setSelectedForPreview] = useState<{x: number, y: number} | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Loop Control
  const requestRef = useRef<number>(0);
  const waveFrameRef = useRef<number>(0); // Frames since wave started
  const enemiesToSpawnRef = useRef<{ type: EnemyType; time: number }[]>([]);

  // Setup Level
  useEffect(() => {
    gameState.current = {
      money: level.startingMoney,
      lives: 10,
      waveIndex: 0,
      isPlaying: false,
      isGameOver: false,
      isVictory: false,
      enemies: [],
      towers: [],
      projectiles: [],
      level: level,
      gameSpeed: 1,
    };
    prepareWave(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const prepareWave = (index: number) => {
    if (index >= gameState.current.level.waves.length) {
      return;
    }
    const wave = gameState.current.level.waves[index];
    let timeOffset = 0;
    const spawnList: { type: EnemyType; time: number }[] = [];
    
    wave.enemies.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        spawnList.push({
          type: group.type,
          time: timeOffset
        });
        timeOffset += group.interval;
      }
    });
    enemiesToSpawnRef.current = spawnList;
    waveFrameRef.current = 0;
  };

  const spawnEnemy = (type: EnemyType) => {
    const stats = ENEMY_STATS[type];
    const path = gameState.current.level.path;
    const start = path[0];
    
    const newEnemy: Enemy = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      pathIndex: 0,
      progress: 0,
      x: start.x, // 网格坐标
      y: start.y, // 网格坐标
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      frozen: 0,
      frozenFactor: 1
    };
    gameState.current.enemies.push(newEnemy);
  };

  const update = () => {
    const state = gameState.current;
    if (!state.isPlaying || state.isGameOver || state.isVictory) return;

    // 1. Spawning
    if (enemiesToSpawnRef.current.length > 0) {
      const nextSpawn = enemiesToSpawnRef.current[0];
      if (waveFrameRef.current >= nextSpawn.time) {
        spawnEnemy(nextSpawn.type);
        enemiesToSpawnRef.current.shift();
      }
    } else if (state.enemies.length === 0 && state.projectiles.length === 0) {
      // Wave complete
      if (state.waveIndex < state.level.waves.length - 1) {
        if (waveFrameRef.current > (state.level.waves[state.waveIndex].delayBetween || 200)) {
           state.waveIndex++;
           prepareWave(state.waveIndex);
        }
      } else {
        // All waves done
        state.isVictory = true;
        state.isPlaying = false;
      }
    }

    waveFrameRef.current++;

    // 2. Enemies Movement
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      
      // Handle Freeze (Stop/Check)
      if (enemy.frozen > 0) {
        enemy.frozen--;
        if (enemy.frozen <= 0) enemy.frozenFactor = 1;
      }

      // Move - 使用相对于网格的速度，根据cellSize调整
      const speedMultiplier = cellSize / 60; // 基准速度基于60px的网格
      const actualSpeed = enemy.speed * enemy.frozenFactor * speedMultiplier;
      enemy.progress += actualSpeed;

      if (enemy.progress >= 1) {
        enemy.progress = 0;
        enemy.pathIndex++;
        if (enemy.pathIndex >= state.level.path.length - 1) {
          // Reached end (Ran away)
          state.lives--;
          state.enemies.splice(i, 1);
          if (state.lives <= 0) {
            state.isGameOver = true;
            state.isPlaying = false;
          }
          continue;
        }
      }

      // 使用网格坐标系统进行位置计算
      const currentCell = state.level.path[enemy.pathIndex];
      const nextCell = state.level.path[Math.min(enemy.pathIndex + 1, state.level.path.length - 1)];
      
      // 计算在网格坐标系中的位置
      if (nextCell) {
        enemy.x = currentCell.x + (nextCell.x - currentCell.x) * enemy.progress;
        enemy.y = currentCell.y + (nextCell.y - currentCell.y) * enemy.progress;
      } else {
        enemy.x = currentCell.x;
        enemy.y = currentCell.y;
      }
    }

    // 3. Towers
    state.towers.forEach(tower => {
      if (tower.cooldown > 0) tower.cooldown--;

      // Find Target - 在网格坐标系中计算距离
      let target: Enemy | null = null;
      let maxDist = tower.range;
      
      const inRange = state.enemies.filter(e => dist(tower.x, tower.y, e.x, e.y) <= maxDist);
      
      if (inRange.length > 0) {
        inRange.sort((a, b) => (b.pathIndex + b.progress) - (a.pathIndex + a.progress));
        target = inRange[0];
      }

      tower.targetId = target ? target.id : null;

      if (target && tower.cooldown <= 0) {
        // Fire - 在网格坐标系中发射
        const stats = TOWER_STATS[tower.type];
        state.projectiles.push({
          id: Math.random().toString(),
          x: tower.x,
          y: tower.y,
          targetId: target.id,
          damage: tower.damage,
          speed: 0.3, 
          type: tower.type,
          splashRadius: tower.type === TowerType.PATROL ? 1.5 : 0,
          slowFactor: tower.type === TowerType.TRAFFIC ? 0.4 : 1,
          slowDuration: tower.type === TowerType.TRAFFIC ? 90 : 0
        });
        
        const baseSpeed = stats.speed;
        const fireRateMod = Math.pow(0.9, tower.level - 1); 
        const maxCooldown = baseSpeed * fireRateMod;
        
        tower.cooldown = maxCooldown;
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x) * (180 / Math.PI);
      }
    });

    // 4. Projectiles - 在网格坐标系中移动
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      const target = state.enemies.find(e => e.id === p.targetId);
      
      if (!target) {
        state.projectiles.splice(i, 1);
        continue;
      }

      const d = dist(p.x, p.y, target.x, target.y);
      if (d < p.speed) {
        // Hit
        if (p.splashRadius && p.splashRadius > 0) {
           state.enemies.forEach(e => {
             if (dist(e.x, e.y, target.x, target.y) <= (p.splashRadius || 0)) {
               hitEnemy(e, p.damage, p.slowFactor, p.slowDuration);
             }
           });
        } else {
           hitEnemy(target, p.damage, p.slowFactor, p.slowDuration);
        }

        state.projectiles.splice(i, 1);
      } else {
        // 在网格坐标系中移动
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        p.x += Math.cos(angle) * p.speed;
        p.y += Math.sin(angle) * p.speed;
      }
    }

    setRenderTrigger(prev => prev + 1);
  };

  const hitEnemy = (enemy: Enemy, damage: number, slowFactor?: number, slowDuration?: number) => {
     enemy.hp -= damage;
     if (slowFactor && slowFactor < 1) {
       enemy.frozen = slowDuration || 60;
       enemy.frozenFactor = slowFactor;
     }
     if (enemy.hp <= 0) {
       const idx = gameState.current.enemies.indexOf(enemy);
       if (idx !== -1) {
         gameState.current.enemies.splice(idx, 1);
         gameState.current.money += ENEMY_STATS[enemy.type].reward;
       }
     }
  };

  // Game Loop Hook
  const loop = (time: number) => {
    update();
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // 触控优化的网格点击处理
  const handleGridClick = useCallback((x: number, y: number) => {
    if (gameState.current.isGameOver) return;
    
    const isPath = gameState.current.level.path.some(p => p.x === x && p.y === y);
    const existingTower = gameState.current.towers.find(t => t.x === x && t.y === y);

    if (!isPath) {
      if (selectedTower && !existingTower) {
        // 移动端两步式操作：预览 -> 确认放置
        if (isMobile) {
          if (selectedForPreview?.x === x && selectedForPreview?.y === y) {
            // 确认放置
            const cost = TOWER_STATS[selectedTower].cost;
            if (gameState.current.money >= cost) {
              gameState.current.money -= cost;
              gameState.current.towers.push({
                id: Math.random().toString(),
                type: selectedTower,
                x,
                y,
                level: 1,
                cooldown: 0,
                range: TOWER_STATS[selectedTower].range,
                damage: TOWER_STATS[selectedTower].damage,
                targetId: null,
                angle: 0
              });
              setSelectedTower(null);
              setSelectedForPreview(null);
            }
          } else {
            // 设置预览位置
            setSelectedForPreview({x, y});
          }
        } else {
          // 桌面端直接放置
          const cost = TOWER_STATS[selectedTower].cost;
          if (gameState.current.money >= cost) {
            gameState.current.money -= cost;
            gameState.current.towers.push({
              id: Math.random().toString(),
              type: selectedTower,
              x,
              y,
              level: 1,
              cooldown: 0,
              range: TOWER_STATS[selectedTower].range,
              damage: TOWER_STATS[selectedTower].damage,
              targetId: null,
              angle: 0
            });
            setSelectedTower(null);
          }
        }
        setRenderTrigger(prev => prev + 1);
      } else if (existingTower) {
        if (selectedTower) setSelectedTower(null);
        if (selectedForPreview) setSelectedForPreview(null);
        setSelectedTowerId(existingTower.id);
        setRenderTrigger(prev => prev + 1);
        return;
      } else {
         setSelectedTowerId(null);
         setSelectedForPreview(null);
         setRenderTrigger(prev => prev + 1);
      }
    }
  }, [selectedTower, selectedForPreview, isMobile]);

  const handleUpgrade = (towerId: string) => {
    const tower = gameState.current.towers.find(t => t.id === towerId);
    if (!tower) return;
    if (tower.level >= MAX_TOWER_LEVEL) return;

    const baseCost = TOWER_STATS[tower.type].cost;
    const upgradeCost = Math.floor(baseCost * 0.75 * tower.level);

    if (gameState.current.money >= upgradeCost) {
      gameState.current.money -= upgradeCost;
      tower.level += 1;
      
      const baseStats = TOWER_STATS[tower.type];
      const dmgMult = Math.pow(1.5, tower.level - 1);
      const rangeAdd = 0.5 * (tower.level - 1);

      tower.damage = Math.floor(baseStats.damage * dmgMult);
      tower.range = baseStats.range + rangeAdd;
      
      setRenderTrigger(prev => prev + 1);
    }
  };

  const handleSell = (towerId: string) => {
    const towerIndex = gameState.current.towers.findIndex(t => t.id === towerId);
    if (towerIndex === -1) return;
    
    const tower = gameState.current.towers[towerIndex];
    const baseCost = TOWER_STATS[tower.type].cost;
    const refund = Math.floor((baseCost * tower.level) * 0.5);
    
    gameState.current.money += refund;
    gameState.current.towers.splice(towerIndex, 1);
    setSelectedTowerId(null);
    setRenderTrigger(prev => prev + 1);
  };

  const togglePause = () => {
    gameState.current.isPlaying = !gameState.current.isPlaying;
    setRenderTrigger(prev => prev + 1);
  };

  const handleTowerSelectionFromMenu = (type: TowerType) => {
    setSelectedTower(type);
    setSelectedTowerId(null);
  }

  const getCellClass = (x: number, y: number) => {
    const isPath = gameState.current.level.path.some(p => p.x === x && p.y === y);
    if (isPath) return "bg-gray-800 border-gray-700 shadow-inner"; // Road
    return "bg-transparent hover:bg-white/10 cursor-pointer pointer-events-auto border-dashed border-slate-700/30";
  };

  const activeTower = selectedTowerId ? gameState.current.towers.find(t => t.id === selectedTowerId) : null;

  return (
    <div className={`relative w-full mx-auto select-none ${isMobile ? 'p-1' : 'p-4 max-w-5xl'}`}>
      
      {/* Header / HUD */}
      <div className={`flex flex-col mb-1 bg-slate-900/90 rounded-xl shadow-lg border border-slate-700 backdrop-blur-sm ${
        isMobile ? 'p-1.5 space-y-1' : 'p-4 mb-4'
      }`}>
        {/* Top Row: Title + Controls */}
        <div className="flex justify-between items-center w-full">
           {/* Title with Marquee if needed */}
           <div className={`flex items-center font-bold text-blue-500/50 uppercase overflow-hidden whitespace-nowrap ${
             isMobile ? 'text-sm tracking-wider flex-1 mr-2' : 'text-xl tracking-[0.5em] mr-4'
           }`}>
              <ShieldCheck className={`flex-shrink-0 mr-2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              <div className="overflow-x-auto scrollbar-hide">
                <span className={isMobile ? "animate-marquee inline-block" : ""}>
                  {isMobile ? level.name : `堵住摩友: ${level.name}`}
                </span>
              </div>
           </div>

           {/* Controls */}
           <div className="flex items-center space-x-2 flex-shrink-0">
             {isMobile && (
               <button onClick={() => setShowMobileMenu(!showMobileMenu)} className={`bg-slate-800 border border-slate-700 rounded-full hover:bg-slate-700 transition ${
                 isMobile ? 'p-1.5' : 'p-2'
               }`}>
                 {showMobileMenu ? <X className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} /> : <Menu className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />}
               </button>
             )}
             <button onClick={togglePause} className={`bg-slate-800 border border-slate-700 rounded-full hover:bg-slate-700 transition ${
               isMobile ? 'p-1.5' : 'p-2'
             }`}>
               {gameState.current.isPlaying ? <Pause className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} /> : <Play className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />}
             </button>
             <button onClick={onRestart} className={`bg-slate-800 border border-slate-700 rounded-full hover:bg-slate-700 transition ${
               isMobile ? 'p-1.5' : 'p-2'
             }`}>
               <RotateCcw className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
             </button>
             <button onClick={onExit} className={`bg-red-900/80 border border-red-800 rounded-lg hover:bg-red-800 font-bold transition ${
               isMobile ? 'px-2 py-1 text-[10px]' : 'px-4 py-2 text-sm'
             }`}>
               {isMobile ? '退出' : '退出'}
             </button>
           </div>
        </div>

        {/* Bottom Row: Stats */}
        <div className={`flex items-center ${
          isMobile ? 'w-full justify-between text-sm border-t border-slate-800 pt-2' : 'space-x-6 mt-2'
        }`}>
           <div className={`flex items-center text-yellow-400 font-bold font-mono ${
             isMobile ? 'text-xs' : 'text-xl'
           }`}>
             <Coins className={`mr-1 ${isMobile ? 'w-3 h-3' : 'w-6 h-6'}`} />
             {isMobile ? Math.floor(gameState.current.money) : `预算: ${Math.floor(gameState.current.money)}`}
           </div>
           <div className={`flex items-center text-blue-400 font-bold font-mono ${
             isMobile ? 'text-xs' : 'text-xl'
           }`}>
             <Heart className={`mr-1 ${isMobile ? 'w-3 h-3' : 'w-6 h-6'}`} />
             {isMobile ? gameState.current.lives : `安全度: ${gameState.current.lives}`}
           </div>
           <div className={`flex items-center text-slate-300 font-bold font-mono ${
             isMobile ? 'text-xs' : 'text-xl'
           }`}>
             <Siren className={`mr-1 text-red-500 animate-pulse ${isMobile ? 'w-3 h-3' : 'w-6 h-6'}`} />
             {gameState.current.waveIndex + 1}/{gameState.current.level.waves.length}
           </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className={`relative bg-slate-950 overflow-hidden shadow-2xl mx-auto ${
        isMobile ? 'rounded-lg border-2 border-slate-800' : 'rounded-2xl border-4 border-slate-800'
      }`}
           style={{ 
             width: level.gridWidth * cellSize, 
             height: level.gridHeight * cellSize,
             touchAction: 'manipulation' // 优化触控响应
           }}>
        
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: `${cellSize}px ${cellSize}px` 
             }}></div>

         {/* Road Visuals - Draw lines connecting path nodes */}
         <svg className="absolute inset-0 pointer-events-none z-0" width="100%" height="100%">
            {/* Road Base */}
            <polyline 
              points={gameState.current.level.path.map(p => `${p.x * cellSize + cellSize/2},${p.y * cellSize + cellSize/2}`).join(' ')}
              fill="none"
              stroke="#1e293b" // slate-800
              strokeWidth={cellSize * 0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Lane Markings */}
            <polyline 
              points={gameState.current.level.path.map(p => `${p.x * cellSize + cellSize/2},${p.y * cellSize + cellSize/2}`).join(' ')}
              fill="none"
              stroke="#fbbf24" // yellow-400
              strokeWidth={Math.max(2, cellSize * 0.05)}
              strokeDasharray={`${cellSize * 0.15}, ${cellSize * 0.15}`}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50"
            />
            
            {/* Debug: Path Points - 仅在移动端显示帮助调试 */}
            {isMobile && gameState.current.level.path.map((point, index) => (
              <circle 
                key={index}
                cx={point.x * cellSize + cellSize/2}
                cy={point.y * cellSize + cellSize/2}
                r={3}
                fill="#22c55e"
                opacity={0.7}
              />
            ))}
         </svg>

         {/* Range Indicator */}
         {activeTower && (
            <div 
              className="absolute rounded-full border-2 border-blue-400/30 bg-blue-500/10 pointer-events-none z-0 transition-all duration-200"
              style={{
                width: activeTower.range * 2 * cellSize,
                height: activeTower.range * 2 * cellSize,
                left: (activeTower.x + 0.5) * cellSize - (activeTower.range * cellSize),
                top: (activeTower.y + 0.5) * cellSize - (activeTower.range * cellSize),
              }}
            />
         )}

         {/* Start Marker */}
         <div className="absolute flex flex-col items-center justify-center z-20"
              style={{ 
                width: cellSize, 
                height: cellSize, 
                left: gameState.current.level.path[0].x * cellSize, 
                top: gameState.current.level.path[0].y * cellSize 
              }}>
            <div className={`bg-green-600 text-white px-1 rounded font-bold mb-1 ${
              isMobile ? 'text-[8px]' : 'text-[10px]'
            }`}>入口</div>
            <ArrowUpCircle className={`text-green-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
         </div>

         {/* End Marker: Zang Overpass */}
         <div className="absolute flex items-center justify-center z-20"
              style={{ 
                width: cellSize, 
                height: cellSize, 
                left: gameState.current.level.path[gameState.current.level.path.length-1].x * cellSize, 
                top: gameState.current.level.path[gameState.current.level.path.length-1].y * cellSize 
              }}>
            <div className={`relative flex flex-col items-center justify-center ${
              isMobile ? 'w-10 h-10' : 'w-14 h-14'
            }`}>
               <div className={`absolute bottom-0 w-full bg-slate-600 rounded-full ${
                 isMobile ? 'h-1' : 'h-2'
               }`} />
               <div className={`bg-blue-600 border-2 border-white text-white font-bold px-1 rounded shadow-lg z-10 -mt-4 whitespace-nowrap ${
                 isMobile ? 'text-[6px]' : 'text-[8px]'
               }`}>
                 {isMobile ? '川藏' : '川藏立交'}
               </div>
               <div className={`bg-slate-700 rounded-t-lg border-x-4 border-slate-500 mt-1 relative overflow-hidden flex justify-center ${
                 isMobile ? 'w-8 h-6 border-x-2' : 'w-12 h-8'
               }`}>
                  <div className={`bg-yellow-500/20 ${
                    isMobile ? 'w-1' : 'w-2'
                  } h-full`} />
                  <div className={`bg-yellow-500/20 h-full mx-1 ${
                    isMobile ? 'w-1' : 'w-2'
                  }`} />
               </div>
            </div>
         </div>

        {/* The Grid Layer */}
        {Array.from({ length: level.gridHeight }).map((_, y) => (
          Array.from({ length: level.gridWidth }).map((_, x) => (
            <div
              key={`${x}-${y}`}
              onClick={() => handleGridClick(x, y)}
              onMouseEnter={() => !isMobile && setHoverCell({x, y})}
              onMouseLeave={() => !isMobile && setHoverCell(null)}
              className={`absolute border border-white/5 transition-all duration-150 z-10 ${
                isMobile ? 'active:bg-white/20' : ''
              } ${getCellClass(x, y)}`}
              style={{
                width: cellSize,
                height: cellSize,
                left: x * cellSize,
                top: y * cellSize,
                minHeight: isMobile ? '44px' : 'auto' // 确保触控目标足够大
              }}
            >
              {/* 桌面端悬停预览 */}
              {!isMobile && selectedTower && hoverCell?.x === x && hoverCell?.y === y && 
               !gameState.current.level.path.some(p => p.x === x && p.y === y) && 
               !gameState.current.towers.some(t => t.x === x && t.y === y) && (
                <div className={`w-full h-full opacity-50 rounded-full scale-75 ${TOWER_STATS[selectedTower].color} pointer-events-none flex items-center justify-center`}>
                    <User className={`text-white ${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
                </div>
              )}
              
              {/* 移动端预览 */}
              {isMobile && selectedTower && selectedForPreview?.x === x && selectedForPreview?.y === y && 
               !gameState.current.level.path.some(p => p.x === x && p.y === y) && 
               !gameState.current.towers.some(t => t.x === x && t.y === y) && (
                <div className={`w-full h-full opacity-75 rounded-full scale-90 ${TOWER_STATS[selectedTower].color} pointer-events-none flex items-center justify-center border-2 border-white animate-pulse`}>
                    <User className="text-white w-5 h-5" />
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      再次点击确认
                    </div>
                </div>
              )}
            </div>
          ))
        ))}

        {/* Towers (Police Units) */}
        {gameState.current.towers.map(tower => {
           const isSelected = selectedTowerId === tower.id;
           const towerSize = Math.max(cellSize * 0.8, 32); // 确保最小可见尺寸
           return (
            <div
              key={tower.id}
              className={`absolute flex items-center justify-center z-20 pointer-events-none transition-transform duration-200 ${isSelected ? 'scale-110 z-50' : ''}`}
              style={{
                width: cellSize,
                height: cellSize,
                left: tower.x * cellSize,
                top: tower.y * cellSize,
              }}
            >
              <div 
                className={`relative rounded-full shadow-lg border-2 border-slate-900 ${TOWER_STATS[tower.type].color} flex items-center justify-center`}
                style={{ width: towerSize, height: towerSize }}
              >
                {/* Level Stars */}
                <div className={`absolute flex space-x-0.5 ${
                  isMobile ? '-top-1' : '-top-2'
                }`}>
                   {tower.level >= 1 && <div className={`bg-yellow-300 rounded-full border border-black ${
                     isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'
                   }`} />}
                   {tower.level >= 2 && <div className={`bg-yellow-300 rounded-full border border-black ${
                     isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'
                   }`} />}
                   {tower.level >= 3 && <div className={`bg-yellow-300 rounded-full border border-black ${
                     isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'
                   }`} />}
                </div>

                {/* Unit Icon - Rotates */}
                <div className="w-full h-full absolute inset-0 flex items-center justify-center transition-transform duration-100"
                      style={{ transform: `rotate(${tower.angle}deg)` }}>
                  <IconImage
                    src={towerIconSources[tower.type]}
                    alt={`${tower.type} panda tower`}
                    className={`w-3/4 h-3/4 object-contain drop-shadow-lg ${tower.type === TowerType.PATROL ? 'animate-pulse' : ''}`}
                    fallback={getTowerFallbackIcon(tower.type, `${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-white`)}
                  />
                </div>
              </div>

              {/* Upgrade Menu */}
              {isSelected && (
                 <div className={`absolute pointer-events-auto flex items-center z-50 animate-pop gap-2 bg-slate-900/95 p-3 rounded-lg border border-slate-600 shadow-xl backdrop-blur-sm ${
                   isMobile 
                     ? 'bottom-full mb-4 flex-col min-w-[120px]' 
                     : 'bottom-full mb-2 flex-col'
                 }`}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSell(tower.id); }}
                      className={`flex items-center justify-center space-x-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded shadow-lg transition-all ${
                        isMobile ? 'w-full py-2 px-3 text-sm' : 'w-full py-1 px-2 text-xs'
                      }`}
                    >
                      <Trash2 className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                      <span>{Math.floor(TOWER_STATS[tower.type].cost * tower.level * 0.5)}</span>
                    </button>

                    {tower.level < MAX_TOWER_LEVEL ? (
                      <button 
                         onClick={(e) => { e.stopPropagation(); handleUpgrade(tower.id); }}
                         className={`flex items-center justify-between space-x-2 font-bold rounded shadow-lg border transition-all ${
                           isMobile ? 'w-full py-2 px-3 text-sm' : 'w-full py-1 px-2 text-xs'
                         } ${
                           gameState.current.money >= Math.floor(TOWER_STATS[tower.type].cost * 0.75 * tower.level)
                             ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border-blue-400'
                             : 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed'
                         }`}
                      >
                         <ArrowUpCircle className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                         <span>{Math.floor(TOWER_STATS[tower.type].cost * 0.75 * tower.level)}</span>
                      </button>
                    ) : (
                      <div className={`text-yellow-400 font-bold ${
                        isMobile ? 'text-sm' : 'text-[10px]'
                      }`}>
                        最高等级
                      </div>
                    )}
                 </div>
              )}
            </div>
          );
        })}

        {/* Enemies (Motorcycles) */}
        {gameState.current.enemies.map(enemy => {
          const enemySize = cellSize * 0.8;
          // 将网格坐标转换为像素坐标，居中显示在网格中
          const pixelX = enemy.x * cellSize + (cellSize - enemySize) / 2;
          const pixelY = enemy.y * cellSize + (cellSize - enemySize) / 2;
          
          return (
          <div
            key={enemy.id}
            className={`absolute flex items-center justify-center transition-transform z-30 pointer-events-none ${enemy.frozen > 0 ? 'brightness-150 saturate-50' : ''}`}
            style={{
              width: enemySize,
              height: enemySize,
              left: pixelX,
              top: pixelY,
            }}
          >
            <div className={`w-full h-full rounded-full shadow-md border-2 border-white/20 ${ENEMY_STATS[enemy.type].color} relative flex items-center justify-center`}>
               {/* Health Bar */}
               <div className={`absolute left-0 w-full bg-slate-700 rounded overflow-hidden ${
                 isMobile ? '-top-2 h-1' : '-top-3 h-1'
               }`}>
                 <div className="h-full bg-green-500" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}></div>
               </div>
               
               {/* Debug Info - 仅在移动端显示帮助调试 */}
               {isMobile && (
                 <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-[8px] px-1 rounded whitespace-nowrap">
                   {enemy.pathIndex}/{gameState.current.level.path.length - 1}
                 </div>
               )}
               
               {/* Icon */}
               <IconImage
                 src={enemyIconSources[enemy.type]}
                 alt={`${enemy.type} panda enemy`}
                 className={`object-contain ${isMobile ? 'w-3/4 h-3/4' : 'w-4/5 h-4/5'}`}
                 fallback={getEnemyFallbackIcon(enemy.type, `${isMobile ? 'w-3 h-3' : 'w-5 h-5'} text-white/90`)}
               />
               {enemy.type === EnemyType.SCOOTER && <div className={`absolute top-0 right-0 bg-red-500 rounded-full animate-ping ${
                 isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'
               }`} />} 
               
               {enemy.frozen > 0 && <Octagon className={`absolute -right-2 -bottom-2 text-red-500 fill-red-500 animate-bounce ${
                 isMobile ? 'w-3 h-3' : 'w-4 h-4'
               }`} />}
            </div>
          </div>
        )})}

        {/* Projectiles */}
        {gameState.current.projectiles.map(p => {
          const projectileSize = Math.max(cellSize * 0.15, 4);
          // 将网格坐标转换为像素坐标，居中显示
          const pixelX = p.x * cellSize + cellSize/2 - projectileSize;
          const pixelY = p.y * cellSize + cellSize/2 - projectileSize;
          
          return (
           <div
             key={p.id}
             className="absolute z-40 flex items-center justify-center pointer-events-none"
             style={{
               width: projectileSize * 2,
               height: projectileSize * 2,
               left: pixelX,
               top: pixelY,
             }}
           >
              {p.type === TowerType.AUXILIARY && <div className={`bg-white rotate-45 ${
                isMobile ? 'w-1 h-2' : 'w-2 h-4'
              }`} />} 
              {p.type === TowerType.TRAFFIC && <div className={`bg-red-600 rounded-full border border-white ${
                isMobile ? 'w-2 h-2' : 'w-4 h-4'
              }`} />}
              {p.type === TowerType.PATROL && <div className={`rounded-full border-2 border-blue-400 opacity-50 animate-ping ${
                isMobile ? 'w-4 h-4' : 'w-8 h-8'
              }`} />}
              {p.type === TowerType.SWAT && <Zap className={`text-yellow-300 fill-current ${
                isMobile ? 'w-2 h-2' : 'w-4 h-4'
              }`} />}
           </div>
        )})}

        {/* Overlay: Game Over / Victory */}
        {(gameState.current.isGameOver || gameState.current.isVictory) && (
           <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-pop">
              <h2 className={`text-5xl font-black mb-6 tracking-tighter ${gameState.current.isVictory ? 'text-blue-400' : 'text-red-500'}`}>
                {gameState.current.isVictory ? '行动成功' : '交通瘫痪'}
              </h2>
              <div className="bg-slate-800 p-8 rounded-xl border border-slate-600 shadow-2xl text-center max-w-md">
                 <p className="text-xl text-slate-300 mb-8 font-light">
                   {gameState.current.isVictory 
                     ? "川藏立交安全。所有违规者已被处理。" 
                     : "太多非法车辆穿过立交桥。城市陷入混乱！"}
                 </p>
                 <button onClick={onRestart} className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xl shadow-lg transition transform hover:scale-105">
                   重新开始任务
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* Unit Selection Panel */}
      <div className={`flex justify-center ${
        isMobile 
          ? 'fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-3 z-50' 
          : 'mt-6 space-x-4'
      }`}>
        
        <div className={`flex ${
          isMobile 
            ? `gap-2 overflow-x-auto scrollbar-hide pb-safe ${showMobileMenu ? 'w-full' : 'w-full'}` 
            : 'space-x-4 justify-center'
        }`}>
          {Object.keys(TOWER_STATS).map((key) => {
            const type = key as TowerType;
            const stats = TOWER_STATS[type];
            const canAfford = gameState.current.money >= stats.cost;
            const isSelected = selectedTower === type;

            return (
              <button
                key={type}
                onClick={() => handleTowerSelectionFromMenu(type)}
                disabled={!canAfford}
                className={`
                  relative group flex flex-col items-center rounded-xl border-2 transition-all duration-200 cursor-pointer
                  ${isMobile ? 'p-2 min-w-[80px] flex-shrink-0' : 'p-3 min-w-[100px]'}
                  ${isSelected ? 'border-blue-400 bg-slate-800 shadow-blue-500/20 shadow-lg' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}
                  ${isSelected && !isMobile ? '-translate-y-2' : ''}
                  ${!canAfford ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:border-slate-500'}
                  ${isMobile ? 'active:scale-95' : ''}
                `}
              >
                <div className={`rounded-full mb-2 shadow-inner ${stats.color} flex items-center justify-center overflow-hidden ${
                   isMobile ? 'w-8 h-8' : 'w-10 h-10'
                 }`}>
                  <IconImage
                    src={towerIconSources[type]}
                    alt={`${stats.name} panda badge`}
                    className="w-full h-full object-contain"
                    fallback={getTowerFallbackIcon(type, `${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-white`)}
                  />
                 </div>
                 <span className={`font-bold text-slate-200 uppercase tracking-wider ${
                   isMobile ? 'text-[10px]' : 'text-xs'
                 }`}>
                   {isMobile ? stats.name.split(' ')[0] : stats.name}
                 </span>
                 <div className={`flex items-center text-yellow-400 font-bold bg-black/30 rounded-full ${
                   isMobile ? 'text-[10px] mt-0.5 px-1 py-0.5' : 'text-xs mt-1 px-2 py-0.5'
                 }`}>
                   <Coins className={`mr-1 ${
                     isMobile ? 'w-2 h-2' : 'w-3 h-3'
                   }`} />
                   {stats.cost}
                 </div>

                 {/* Tooltip - 只在桌面端显示 */}
                 {!isMobile && (
                   <div className="absolute bottom-full mb-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-56 bg-slate-800 p-4 rounded-lg text-xs z-50 border border-slate-600 shadow-xl">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-600">
                        <p className="font-bold text-sm text-blue-300">{stats.name}</p>
                        {type === TowerType.SWAT && <Star className="w-3 h-3 text-yellow-400" />}
                      </div>
                      <p className="text-slate-400 mb-3 italic">{stats.description}</p>
                      <div className="grid grid-cols-3 gap-2 text-slate-300 text-center">
                        <div className="bg-slate-700 rounded p-1">
                           <div className="text-[10px] text-slate-500">DMG</div>
                           <div className="font-bold">{stats.damage}</div>
                        </div>
                        <div className="bg-slate-700 rounded p-1">
                           <div className="text-[10px] text-slate-500">RNG</div>
                           <div className="font-bold">{stats.range}</div>
                        </div>
                        <div className="bg-slate-700 rounded p-1">
                           <div className="text-[10px] text-slate-500">SPD</div>
                           <div className="font-bold">{stats.speed}</div>
                        </div>
                      </div>
                   </div>
                 )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Game;
