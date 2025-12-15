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
  Skull,
  Crosshair,
  Shield
} from 'lucide-react';
import { CELL_SIZE, GRID_HEIGHT, GRID_WIDTH, TOWER_STATS, ENEMY_STATS, FPS } from '../constants';
import { Enemy, EnemyType, GameLevel, GameState, Projectile, Tower, TowerType, WaveConfig } from '../types';

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
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [hoverCell, setHoverCell] = useState<{x: number, y: number} | null>(null);

  // Loop Control
  const requestRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
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
      // No more waves logic handled in loop
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
        // Prepare next wave
        // Small delay or auto? Let's auto for now with a delay
        // Simulating delay by just waiting
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
      
      // Handle Freeze
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
          // Reached end
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
      // Simple logic: Closest or First? Carrot Fantasy usually First (furthest along path).
      let target: Enemy | null = null;
      let maxDist = TOWER_STATS[tower.type].range;
      
      // Filter enemies in range
      const inRange = state.enemies.filter(e => dist(tower.x, tower.y, e.x, e.y) <= maxDist);
      
      if (inRange.length > 0) {
        // Target enemy with highest pathIndex (furthest)
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
          speed: 0.3, // Projectile speed (grid cells per frame)
          type: tower.type,
          splashRadius: tower.type === TowerType.FAN ? 1.5 : 0,
          slowFactor: tower.type === TowerType.POOP ? 0.5 : 1,
          slowDuration: tower.type === TowerType.POOP ? 120 : 0
        });
        tower.cooldown = stats.speed;
        
        // Face target
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x) * (180 / Math.PI);
      }
    });

    // 4. Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      const target = state.enemies.find(e => e.id === p.targetId);
      
      if (!target) {
        // Target dead/gone, remove projectile
        state.projectiles.splice(i, 1);
        continue;
      }

      const d = dist(p.x, p.y, target.x, target.y);
      if (d < p.speed) {
        // Hit
        // Apply Damage
        if (p.splashRadius && p.splashRadius > 0) {
           // Splash
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
        // Move towards
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
    
    // Check if valid placement
    const isPath = gameState.current.level.path.some(p => p.x === x && p.y === y);
    const hasTower = gameState.current.towers.some(t => t.x === x && t.y === y);

    if (!isPath && !hasTower && selectedTower) {
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
        // FORCE RENDER to update UI immediately
        setRenderTrigger(prev => prev + 1);
        // Do NOT deselect tower to allow multi-placement
        // setSelectedTower(null); 
      }
    }
  };

  const togglePause = () => {
    gameState.current.isPlaying = !gameState.current.isPlaying;
    // Force render to update play/pause icon
    setRenderTrigger(prev => prev + 1);
  };

  // Rendering Helpers
  const getCellClass = (x: number, y: number) => {
    const isPath = gameState.current.level.path.some(p => p.x === x && p.y === y);
    const isStart = x === gameState.current.level.path[0].x && y === gameState.current.level.path[0].y;
    const isEnd = x === gameState.current.level.path[gameState.current.level.path.length-1].x && y === gameState.current.level.path[gameState.current.level.path.length-1].y;

    if (isStart) return "bg-green-700/50 border-green-500";
    if (isEnd) return "bg-orange-700/50 border-orange-500";
    if (isPath) return "bg-amber-900/30 border-amber-800/20";
    return "bg-transparent hover:bg-white/10 cursor-pointer pointer-events-auto";
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto p-4 select-none">
      
      {/* Header / HUD */}
      <div className="flex justify-between items-center mb-4 bg-slate-800/80 p-4 rounded-xl shadow-lg border border-slate-700 backdrop-blur-sm">
        <div className="flex items-center space-x-6">
           <div className="flex items-center text-yellow-400 font-bold text-xl">
             <Coins className="w-6 h-6 mr-2" />
             {Math.floor(gameState.current.money)}
           </div>
           <div className="flex items-center text-red-400 font-bold text-xl">
             <Heart className="w-6 h-6 mr-2" />
             {gameState.current.lives}
           </div>
           <div className="flex items-center text-blue-300 font-bold text-xl">
             <Skull className="w-6 h-6 mr-2" />
             Wave {gameState.current.waveIndex + 1}/{gameState.current.level.waves.length}
           </div>
        </div>

        <div className="flex items-center space-x-2">
           <button onClick={togglePause} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition">
             {gameState.current.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
           </button>
           <button onClick={onRestart} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition">
             <RotateCcw className="w-6 h-6" />
           </button>
           <button onClick={onExit} className="px-4 py-2 bg-red-600/80 rounded-lg hover:bg-red-500 font-bold text-sm">
             EXIT
           </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl"
           style={{ width: GRID_WIDTH * CELL_SIZE, height: GRID_HEIGHT * CELL_SIZE, margin: '0 auto' }}>
        
        {/* Background Grid Pattern - z-0 */}
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle, #444 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

         {/* Path Highlight (Visual connector) - z-0 */}
         <svg className="absolute inset-0 pointer-events-none opacity-20 z-0" width="100%" height="100%">
            <polyline 
              points={gameState.current.level.path.map(p => `${p.x * CELL_SIZE + CELL_SIZE/2},${p.y * CELL_SIZE + CELL_SIZE/2}`).join(' ')}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={CELL_SIZE * 0.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
         </svg>

         {/* Start and End Markers - z-0 */}
         <div className="absolute flex items-center justify-center font-bold text-xs text-white bg-green-600 rounded-full z-0 shadow-lg"
              style={{ width: CELL_SIZE*0.8, height: CELL_SIZE*0.8, left: gameState.current.level.path[0].x * CELL_SIZE + CELL_SIZE*0.1, top: gameState.current.level.path[0].y * CELL_SIZE + CELL_SIZE*0.1 }}>
            START
         </div>
         <div className="absolute flex items-center justify-center z-0 animate-wiggle"
              style={{ width: CELL_SIZE, height: CELL_SIZE, left: gameState.current.level.path[gameState.current.level.path.length-1].x * CELL_SIZE, top: gameState.current.level.path[gameState.current.level.path.length-1].y * CELL_SIZE }}>
            {/* The Carrot */}
            <div className="w-10 h-12 bg-orange-500 rounded-b-full rounded-t-lg relative shadow-xl border-2 border-orange-600">
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-green-500 rounded-full" />
               <div className="absolute top-2 left-2 w-2 h-2 bg-white/50 rounded-full" />
               {/* Eyes */}
               <div className="absolute top-4 left-2 w-2 h-3 bg-black rounded-full" />
               <div className="absolute top-4 right-2 w-2 h-3 bg-black rounded-full" />
               <div className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-2 bg-red-800 rounded-full opacity-50" />
            </div>
         </div>

        {/* The Grid Layer - Interactable (z-10) */}
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
              {/* Placement Ghost - Pointer Events None to let click fall through to the cell div */}
              {selectedTower && hoverCell?.x === x && hoverCell?.y === y && 
               !gameState.current.level.path.some(p => p.x === x && p.y === y) && 
               !gameState.current.towers.some(t => t.x === x && t.y === y) && (
                <div className={`w-full h-full opacity-50 rounded-full scale-75 ${TOWER_STATS[selectedTower].color} pointer-events-none`} />
              )}
            </div>
          ))
        ))}

        {/* Towers - z-20 */}
        {gameState.current.towers.map(tower => (
          <div
            key={tower.id}
            className={`absolute flex items-center justify-center z-20 pointer-events-none`}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              left: tower.x * CELL_SIZE,
              top: tower.y * CELL_SIZE,
            }}
          >
            <div className={`relative w-10 h-10 rounded-lg shadow-lg border-b-4 border-black/20 ${TOWER_STATS[tower.type].color} flex items-center justify-center`}>
               {/* Turret Head rotates */}
               <div className="w-full h-full absolute inset-0 flex items-center justify-center transition-transform duration-75"
                    style={{ transform: `rotate(${tower.angle}deg)` }}>
                   {tower.type === TowerType.BOTTLE && <div className="w-4 h-8 bg-green-700 rounded-full border-2 border-green-300" />}
                   {tower.type === TowerType.POOP && <div className="w-8 h-8 bg-yellow-900 rounded-full border-2 border-yellow-600" />}
                   {tower.type === TowerType.FAN && <div className="w-10 h-2 bg-blue-200 absolute" />}
                   {tower.type === TowerType.STAR && <Star className="w-8 h-8 text-pink-200 fill-current" />}
               </div>
               {/* Base */}
               <div className="absolute -bottom-1 w-8 h-1 bg-black/30 rounded-full blur-sm" />
            </div>
          </div>
        ))}

        {/* Enemies - z-30 */}
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
            <div className={`w-full h-full rounded-full shadow-md border-2 border-black/20 ${ENEMY_STATS[enemy.type].color} relative`}>
               {/* Health Bar */}
               <div className="absolute -top-3 left-0 w-full h-1 bg-slate-700 rounded overflow-hidden">
                 <div className="h-full bg-green-400" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}></div>
               </div>
               {/* Face */}
               <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full"><div className="w-1 h-1 bg-black rounded-full absolute right-0 top-1/2 -translate-y-1/2"/></div>
               <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white rounded-full"><div className="w-1 h-1 bg-black rounded-full absolute left-0 top-1/2 -translate-y-1/2"/></div>
               {enemy.frozen > 0 && <Snowflake className="absolute -right-2 -bottom-2 w-5 h-5 text-blue-200 animate-spin" />}
            </div>
          </div>
        ))}

        {/* Projectiles - z-40 */}
        {gameState.current.projectiles.map(p => (
           <div
             key={p.id}
             className="absolute w-4 h-4 z-40 flex items-center justify-center pointer-events-none"
             style={{
               left: p.x * CELL_SIZE + CELL_SIZE/2 - 8,
               top: p.y * CELL_SIZE + CELL_SIZE/2 - 8,
             }}
           >
              {p.type === TowerType.BOTTLE && <div className="w-3 h-3 bg-green-300 rounded-full shadow-lg shadow-green-500/50" />}
              {p.type === TowerType.POOP && <div className="w-4 h-4 bg-yellow-600 rounded-full shadow-sm" />}
              {p.type === TowerType.FAN && <Wind className="w-5 h-5 text-white animate-spin" />}
              {p.type === TowerType.STAR && <Zap className="w-5 h-5 text-yellow-300 fill-current" />}
           </div>
        ))}

        {/* Overlay: Game Over / Victory - z-50 */}
        {(gameState.current.isGameOver || gameState.current.isVictory) && (
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-pop">
              <h2 className={`text-6xl font-black mb-6 ${gameState.current.isVictory ? 'text-yellow-400' : 'text-red-500'}`}>
                {gameState.current.isVictory ? 'VICTORY!' : 'GAME OVER'}
              </h2>
              <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center">
                 <p className="text-xl text-slate-300 mb-8">
                   {gameState.current.isVictory 
                     ? "The Carrot is safe! The monsters have been defeated." 
                     : "The monsters ate your carrot. Better luck next time!"}
                 </p>
                 <button onClick={onRestart} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xl shadow-lg transition transform hover:scale-105">
                   Try Again
                 </button>
              </div>
           </div>
        )}
      </div>

      {/* Tower Selection Footer */}
      <div className="mt-6 flex justify-center space-x-4">
        {Object.keys(TOWER_STATS).map((key) => {
          const type = key as TowerType;
          const stats = TOWER_STATS[type];
          const canAfford = gameState.current.money >= stats.cost;
          const isSelected = selectedTower === type;

          return (
            <button
              key={type}
              onClick={() => setSelectedTower(type)}
              disabled={!canAfford}
              className={`
                relative group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                ${isSelected ? 'border-yellow-400 bg-slate-700 -translate-y-2' : 'border-slate-700 bg-slate-800 hover:bg-slate-750'}
                ${!canAfford ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-slate-500'}
              `}
            >
               <div className={`w-12 h-12 rounded-lg mb-2 shadow-lg ${stats.color} flex items-center justify-center`}>
                  {type === TowerType.BOTTLE && <div className="w-4 h-8 bg-green-800 rounded-full border border-green-400" />}
                  {type === TowerType.POOP && <div className="w-8 h-8 bg-yellow-900 rounded-full border border-yellow-600" />}
                  {type === TowerType.FAN && <Wind className="text-white" />}
                  {type === TowerType.STAR && <Star className="text-pink-100 fill-current" />}
               </div>
               <span className="font-bold text-sm text-slate-200">{stats.name}</span>
               <div className="flex items-center text-yellow-400 text-xs font-bold mt-1">
                 <Coins className="w-3 h-3 mr-1" />
                 {stats.cost}
               </div>

               {/* Tooltip */}
               <div className="absolute bottom-full mb-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 bg-black/90 p-3 rounded-lg text-xs z-50 border border-slate-700">
                  <p className="font-bold text-base mb-1 text-white">{stats.name}</p>
                  <p className="text-slate-400 mb-2">{stats.description}</p>
                  <div className="grid grid-cols-2 gap-1 text-slate-300">
                    <span>Dmg: {stats.damage}</span>
                    <span>Rng: {stats.range}</span>
                    <span>Spd: {stats.speed}</span>
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