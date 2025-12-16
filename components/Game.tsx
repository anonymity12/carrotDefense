
import React, { useEffect, useRef, useState } from 'react';
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
  FileWarning
} from 'lucide-react';
import { CELL_SIZE, GRID_HEIGHT, GRID_WIDTH, TOWER_STATS, ENEMY_STATS, MAX_TOWER_LEVEL } from '../constants';
import { Enemy, EnemyType, GameLevel, GameState, TowerType } from '../types';

// Utility for distance
const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

interface GameProps {
  level: GameLevel;
  onExit: () => void;
  onRestart: () => void;
}

const Game: React.FC<GameProps> = ({ level, onExit, onRestart }) => {
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
      x: start.x,
      y: start.y,
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

      // Move
      const actualSpeed = enemy.speed * enemy.frozenFactor;
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

      const currentCell = state.level.path[enemy.pathIndex];
      const nextCell = state.level.path[enemy.pathIndex + 1];
      
      enemy.x = currentCell.x + (nextCell.x - currentCell.x) * enemy.progress;
      enemy.y = currentCell.y + (nextCell.y - currentCell.y) * enemy.progress;
    }

    // 3. Towers
    state.towers.forEach(tower => {
      if (tower.cooldown > 0) tower.cooldown--;

      // Find Target
      let target: Enemy | null = null;
      let maxDist = tower.range;
      
      const inRange = state.enemies.filter(e => dist(tower.x, tower.y, e.x, e.y) <= maxDist);
      
      if (inRange.length > 0) {
        inRange.sort((a, b) => (b.pathIndex + b.progress) - (a.pathIndex + a.progress));
        target = inRange[0];
      }

      tower.targetId = target ? target.id : null;

      if (target && tower.cooldown <= 0) {
        // Fire
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

    // 4. Projectiles
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

  // Handlers
  const handleGridClick = (x: number, y: number) => {
    if (gameState.current.isGameOver) return;
    
    const isPath = gameState.current.level.path.some(p => p.x === x && p.y === y);
    const existingTower = gameState.current.towers.find(t => t.x === x && t.y === y);

    if (!isPath) {
      if (selectedTower && !existingTower) {
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
          setRenderTrigger(prev => prev + 1);
        }
      } else if (existingTower) {
        if (selectedTower) setSelectedTower(null);
        setSelectedTowerId(existingTower.id);
        setRenderTrigger(prev => prev + 1);
        return;
      } else {
         setSelectedTowerId(null);
         setRenderTrigger(prev => prev + 1);
      }
    }
  };

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
    <div className="relative w-full max-w-5xl mx-auto p-4 select-none">
      
      {/* Header / HUD */}
      <div className="flex justify-between items-center mb-4 bg-slate-900/90 p-4 rounded-xl shadow-lg border border-slate-700 backdrop-blur-sm">
        <div className="flex items-center space-x-6">
           <div className="flex items-center text-yellow-400 font-bold text-xl font-mono">
             <Coins className="w-6 h-6 mr-2" />
             BUDGET: {Math.floor(gameState.current.money)}
           </div>
           <div className="flex items-center text-blue-400 font-bold text-xl font-mono">
             <Heart className="w-6 h-6 mr-2" />
             SAFETY: {gameState.current.lives}
           </div>
           <div className="flex items-center text-slate-300 font-bold text-xl font-mono">
             <Siren className="w-6 h-6 mr-2 text-red-500 animate-pulse" />
             WAVE {gameState.current.waveIndex + 1}/{gameState.current.level.waves.length}
           </div>
        </div>

        <div className="flex items-center space-x-2">
           <button onClick={togglePause} className="p-2 bg-slate-800 border border-slate-700 rounded-full hover:bg-slate-700 transition">
             {gameState.current.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
           </button>
           <button onClick={onRestart} className="p-2 bg-slate-800 border border-slate-700 rounded-full hover:bg-slate-700 transition">
             <RotateCcw className="w-6 h-6" />
           </button>
           <button onClick={onExit} className="px-4 py-2 bg-red-900/80 border border-red-800 rounded-lg hover:bg-red-800 font-bold text-sm">
             ABORT
           </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative bg-slate-950 rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl"
           style={{ width: GRID_WIDTH * CELL_SIZE, height: GRID_HEIGHT * CELL_SIZE, margin: '0 auto' }}>
        
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>

         {/* Road Visuals - Draw lines connecting path nodes */}
         <svg className="absolute inset-0 pointer-events-none z-0" width="100%" height="100%">
            {/* Road Base */}
            <polyline 
              points={gameState.current.level.path.map(p => `${p.x * CELL_SIZE + CELL_SIZE/2},${p.y * CELL_SIZE + CELL_SIZE/2}`).join(' ')}
              fill="none"
              stroke="#1e293b" // slate-800
              strokeWidth={CELL_SIZE * 0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Lane Markings */}
            <polyline 
              points={gameState.current.level.path.map(p => `${p.x * CELL_SIZE + CELL_SIZE/2},${p.y * CELL_SIZE + CELL_SIZE/2}`).join(' ')}
              fill="none"
              stroke="#fbbf24" // yellow-400
              strokeWidth={2}
              strokeDasharray="10, 10"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50"
            />
         </svg>

         {/* Range Indicator */}
         {activeTower && (
            <div 
              className="absolute rounded-full border-2 border-blue-400/30 bg-blue-500/10 pointer-events-none z-0 transition-all duration-200"
              style={{
                width: activeTower.range * 2 * CELL_SIZE,
                height: activeTower.range * 2 * CELL_SIZE,
                left: (activeTower.x + 0.5) * CELL_SIZE - (activeTower.range * CELL_SIZE),
                top: (activeTower.y + 0.5) * CELL_SIZE - (activeTower.range * CELL_SIZE),
              }}
            />
         )}

         {/* Start Marker */}
         <div className="absolute flex flex-col items-center justify-center z-10"
              style={{ width: CELL_SIZE, height: CELL_SIZE, left: gameState.current.level.path[0].x * CELL_SIZE, top: gameState.current.level.path[0].y * CELL_SIZE }}>
            <div className="bg-green-600 text-[10px] px-1 rounded font-bold mb-1">ENTRY</div>
            <ArrowUpCircle className="w-8 h-8 text-green-500" />
         </div>

         {/* End Marker: Zang Overpass */}
         <div className="absolute flex items-center justify-center z-0"
              style={{ width: CELL_SIZE, height: CELL_SIZE, left: gameState.current.level.path[gameState.current.level.path.length-1].x * CELL_SIZE, top: gameState.current.level.path[gameState.current.level.path.length-1].y * CELL_SIZE }}>
            <div className="relative w-14 h-14 flex flex-col items-center justify-center">
               <div className="absolute bottom-0 w-full h-2 bg-slate-600 rounded-full" />
               <div className="bg-blue-600 border-2 border-white text-white text-[8px] font-bold px-1 rounded shadow-lg z-10 -mt-4 whitespace-nowrap">
                 ZANG OVERPASS
               </div>
               <div className="w-12 h-8 bg-slate-700 rounded-t-lg border-x-4 border-slate-500 mt-1 relative overflow-hidden flex justify-center">
                  <div className="w-2 h-full bg-yellow-500/20" />
                  <div className="w-2 h-full bg-yellow-500/20 mx-1" />
               </div>
            </div>
         </div>

        {/* The Grid Layer */}
        {Array.from({ length: GRID_HEIGHT }).map((_, y) => (
          Array.from({ length: GRID_WIDTH }).map((_, x) => (
            <div
              key={`${x}-${y}`}
              onClick={() => handleGridClick(x, y)}
              onMouseEnter={() => setHoverCell({x, y})}
              onMouseLeave={() => setHoverCell(null)}
              className={`absolute border border-white/5 transition-colors duration-150 z-10 ${getCellClass(x, y)}`}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                left: x * CELL_SIZE,
                top: y * CELL_SIZE,
              }}
            >
              {selectedTower && hoverCell?.x === x && hoverCell?.y === y && 
               !gameState.current.level.path.some(p => p.x === x && p.y === y) && 
               !gameState.current.towers.some(t => t.x === x && t.y === y) && (
                <div className={`w-full h-full opacity-50 rounded-full scale-75 ${TOWER_STATS[selectedTower].color} pointer-events-none flex items-center justify-center`}>
                    <User className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          ))
        ))}

        {/* Towers (Police Units) */}
        {gameState.current.towers.map(tower => {
           const isSelected = selectedTowerId === tower.id;
           return (
            <div
              key={tower.id}
              className={`absolute flex items-center justify-center z-20 pointer-events-none transition-transform duration-200 ${isSelected ? 'scale-110 z-50' : ''}`}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                left: tower.x * CELL_SIZE,
                top: tower.y * CELL_SIZE,
              }}
            >
              <div className={`relative w-12 h-12 rounded-full shadow-lg border-2 border-slate-900 ${TOWER_STATS[tower.type].color} flex items-center justify-center`}>
                {/* Level Stars */}
                <div className="absolute -top-2 flex space-x-0.5">
                   {tower.level >= 1 && <div className="w-2 h-2 bg-yellow-300 rounded-full border border-black" />}
                   {tower.level >= 2 && <div className="w-2 h-2 bg-yellow-300 rounded-full border border-black" />}
                   {tower.level >= 3 && <div className="w-2 h-2 bg-yellow-300 rounded-full border border-black" />}
                </div>

                {/* Unit Icon - Rotates */}
                <div className="w-full h-full absolute inset-0 flex items-center justify-center transition-transform duration-100"
                      style={{ transform: `rotate(${tower.angle}deg)` }}>
                    {tower.type === TowerType.AUXILIARY && <User className="w-6 h-6 text-white" />}
                    {tower.type === TowerType.TRAFFIC && <Octagon className="w-6 h-6 text-white fill-white/20" />}
                    {tower.type === TowerType.PATROL && <Siren className="w-7 h-7 text-white animate-pulse" />}
                    {tower.type === TowerType.SWAT && <Shield className="w-6 h-6 text-white fill-slate-300" />}
                </div>
              </div>

              {/* Upgrade Menu */}
              {isSelected && (
                 <div className="absolute bottom-full mb-2 pointer-events-auto flex flex-col items-center z-50 animate-pop gap-2 bg-slate-900/90 p-2 rounded-lg border border-slate-600">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSell(tower.id); }}
                      className="w-full flex items-center justify-center space-x-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1 px-2 rounded shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{Math.floor(TOWER_STATS[tower.type].cost * tower.level * 0.5)}</span>
                    </button>

                    {tower.level < MAX_TOWER_LEVEL ? (
                      <button 
                         onClick={(e) => { e.stopPropagation(); handleUpgrade(tower.id); }}
                         className={`w-full flex items-center justify-between space-x-2 text-xs font-bold py-1 px-2 rounded shadow-lg border transition-all ${
                           gameState.current.money >= Math.floor(TOWER_STATS[tower.type].cost * 0.75 * tower.level)
                             ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
                             : 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed'
                         }`}
                      >
                         <ArrowUpCircle className="w-3 h-3" />
                         <span>{Math.floor(TOWER_STATS[tower.type].cost * 0.75 * tower.level)}</span>
                      </button>
                    ) : (
                      <div className="text-yellow-400 text-[10px] font-bold">MAX RANK</div>
                    )}
                 </div>
              )}
            </div>
          );
        })}

        {/* Enemies (Motorcycles) */}
        {gameState.current.enemies.map(enemy => (
          <div
            key={enemy.id}
            className={`absolute flex items-center justify-center transition-transform z-30 pointer-events-none ${enemy.frozen > 0 ? 'brightness-150 saturate-50' : ''}`}
            style={{
              width: CELL_SIZE * 0.8,
              height: CELL_SIZE * 0.8,
              transform: `translate(${enemy.x * CELL_SIZE + CELL_SIZE * 0.1}px, ${enemy.y * CELL_SIZE + CELL_SIZE * 0.1}px)`,
            }}
          >
            <div className={`w-full h-full rounded-full shadow-md border-2 border-white/20 ${ENEMY_STATS[enemy.type].color} relative flex items-center justify-center`}>
               {/* Health Bar */}
               <div className="absolute -top-3 left-0 w-full h-1 bg-slate-700 rounded overflow-hidden">
                 <div className="h-full bg-green-500" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}></div>
               </div>
               
               {/* Icon */}
               <Bike className="w-5 h-5 text-white/90" />
               {enemy.type === EnemyType.SCOOTER && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />} 
               
               {enemy.frozen > 0 && <Octagon className="absolute -right-2 -bottom-2 w-4 h-4 text-red-500 fill-red-500 animate-bounce" />}
            </div>
          </div>
        ))}

        {/* Projectiles */}
        {gameState.current.projectiles.map(p => (
           <div
             key={p.id}
             className="absolute w-4 h-4 z-40 flex items-center justify-center pointer-events-none"
             style={{
               left: p.x * CELL_SIZE + CELL_SIZE/2 - 8,
               top: p.y * CELL_SIZE + CELL_SIZE/2 - 8,
             }}
           >
              {p.type === TowerType.AUXILIARY && <div className="w-2 h-4 bg-white rotate-45" />} 
              {p.type === TowerType.TRAFFIC && <div className="w-4 h-4 bg-red-600 rounded-full border border-white" />}
              {p.type === TowerType.PATROL && <div className="w-8 h-8 rounded-full border-2 border-blue-400 opacity-50 animate-ping" />}
              {p.type === TowerType.SWAT && <Zap className="w-4 h-4 text-yellow-300 fill-current" />}
           </div>
        ))}

        {/* Overlay: Game Over / Victory */}
        {(gameState.current.isGameOver || gameState.current.isVictory) && (
           <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-pop">
              <h2 className={`text-5xl font-black mb-6 tracking-tighter ${gameState.current.isVictory ? 'text-blue-400' : 'text-red-500'}`}>
                {gameState.current.isVictory ? 'OPERATION SUCCESS' : 'TRAFFIC FAILURE'}
              </h2>
              <div className="bg-slate-800 p-8 rounded-xl border border-slate-600 shadow-2xl text-center max-w-md">
                 <p className="text-xl text-slate-300 mb-8 font-light">
                   {gameState.current.isVictory 
                     ? "Zang Overpass is secure. All violators have been processed." 
                     : "Too many illegal vehicles crossed the overpass. The city is in chaos!"}
                 </p>
                 <button onClick={onRestart} className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xl shadow-lg transition transform hover:scale-105">
                   RESTART MISSION
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* Unit Selection Footer */}
      <div className="mt-6 flex justify-center space-x-4">
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
                relative group flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer min-w-[100px]
                ${isSelected ? 'border-blue-400 bg-slate-800 -translate-y-2 shadow-blue-500/20 shadow-lg' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}
                ${!canAfford ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:border-slate-500'}
              `}
            >
               <div className={`w-10 h-10 rounded-full mb-2 shadow-inner ${stats.color} flex items-center justify-center`}>
                  {type === TowerType.AUXILIARY && <User className="w-5 h-5 text-white" />}
                  {type === TowerType.TRAFFIC && <Octagon className="w-5 h-5 text-white" />}
                  {type === TowerType.PATROL && <Siren className="w-5 h-5 text-white" />}
                  {type === TowerType.SWAT && <Shield className="w-5 h-5 text-white" />}
               </div>
               <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">{stats.name}</span>
               <div className="flex items-center text-yellow-400 text-xs font-bold mt-1 bg-black/30 px-2 py-0.5 rounded-full">
                 <Coins className="w-3 h-3 mr-1" />
                 {stats.cost}
               </div>

               {/* Tooltip */}
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
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Game;
