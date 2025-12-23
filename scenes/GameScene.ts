import Phaser from 'phaser';
import { Enemy, EnemyType, GameLevel, GameState, Tower, TowerType, Projectile } from '../types';
import { TOWER_STATS, ENEMY_STATS, MAX_TOWER_LEVEL, calculateCellSize } from '../constants';
import { soundManager } from '../services/SoundManager';
import { pandaTowerIconSpecs, pandaEnemyIconSpecs } from '../assets/iconManifest';

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

export default class GameScene extends Phaser.Scene {
  private level!: GameLevel;
  private gameState!: GameState;
  private cellSize!: number;
  private isMobile: boolean = false;
  
  // Phaser groups and containers
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private towerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private projectileSprites: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private rangeCircle?: Phaser.GameObjects.Graphics;
  
  // UI Elements
  private moneyText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Container;
  private exitButton!: Phaser.GameObjects.Container;
  private restartButton!: Phaser.GameObjects.Container;
  private muteButton!: Phaser.GameObjects.Container;
  private towerButtons: Phaser.GameObjects.Container[] = [];
  
  // Game state
  private selectedTowerType: TowerType | null = null;
  private selectedTowerId: string | null = null;
  private selectedForPreview: { x: number; y: number } | null = null;
  private waveFrameCounter: number = 0;
  private enemiesToSpawn: { type: EnemyType; time: number }[] = [];
  private upgradeMenu?: Phaser.GameObjects.Container;
  private isMuted: boolean = false;
  
  // Grid overlay
  private gridCells: Phaser.GameObjects.Rectangle[][] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { level: GameLevel }) {
    this.level = data.level;
    this.isMobile = this.scale.width < 768;
    this.cellSize = calculateCellSize(this.level.gridWidth, this.level.gridHeight);
  }

  preload() {
    // Load panda icons if needed
    // For now, we'll use simple graphics
  }

  create() {
    // Initialize game state
    this.gameState = {
      money: this.level.startingMoney,
      lives: 10,
      waveIndex: 0,
      isPlaying: false,
      isGameOver: false,
      isVictory: false,
      enemies: [],
      towers: [],
      projectiles: [],
      level: this.level,
      gameSpeed: 1,
    };

    // Setup scene
    this.cameras.main.setBackgroundColor('#020617');
    
    // Create game board
    this.createGameBoard();
    
    // Create UI
    this.createUI();
    
    // Prepare first wave
    this.prepareWave(0);
    
    // Start background music
    soundManager.startBGM();
  }

  private createGameBoard() {
    const boardWidth = this.level.gridWidth * this.cellSize;
    const boardHeight = this.level.gridHeight * this.cellSize;
    
    // Center the board
    const offsetX = (this.scale.width - boardWidth) / 2;
    const offsetY = this.isMobile ? 90 : 120;
    
    // Background
    const bg = this.add.rectangle(
      offsetX + boardWidth / 2,
      offsetY + boardHeight / 2,
      boardWidth,
      boardHeight,
      0x020617
    ).setStrokeStyle(4, 0x1e293b);

    // Grid
    this.createGrid(offsetX, offsetY);
    
    // Path
    this.pathGraphics = this.add.graphics();
    this.drawPath(offsetX, offsetY);
    
    // Start and end markers
    this.createMarkers(offsetX, offsetY);
  }

  private createGrid(offsetX: number, offsetY: number) {
    for (let y = 0; y < this.level.gridHeight; y++) {
      this.gridCells[y] = [];
      for (let x = 0; x < this.level.gridWidth; x++) {
        const isPath = this.level.path.some(p => p.x === x && p.y === y);
        const cellX = offsetX + x * this.cellSize;
        const cellY = offsetY + y * this.cellSize;
        
        const cell = this.add.rectangle(
          cellX + this.cellSize / 2,
          cellY + this.cellSize / 2,
          this.cellSize,
          this.cellSize,
          isPath ? 0x1e293b : 0x020617,
          isPath ? 1 : 0
        )
        .setStrokeStyle(1, 0x334155, 0.2)
        .setInteractive()
        .on('pointerdown', () => this.handleCellClick(x, y));
        
        if (!isPath) {
          cell.on('pointerover', () => {
            if (!this.isMobile && this.selectedTowerType) {
              cell.setFillStyle(0xffffff, 0.1);
            }
          })
          .on('pointerout', () => {
            if (!isPath) {
              cell.setFillStyle(0x020617, 0);
            }
          });
        }
        
        this.gridCells[y][x] = cell;
      }
    }
  }

  private drawPath(offsetX: number, offsetY: number) {
    this.pathGraphics.clear();
    
    // Draw road base
    this.pathGraphics.lineStyle(this.cellSize * 0.8, 0x1e293b, 1);
    this.pathGraphics.beginPath();
    
    for (let i = 0; i < this.level.path.length; i++) {
      const p = this.level.path[i];
      const px = offsetX + p.x * this.cellSize + this.cellSize / 2;
      const py = offsetY + p.y * this.cellSize + this.cellSize / 2;
      
      if (i === 0) {
        this.pathGraphics.moveTo(px, py);
      } else {
        this.pathGraphics.lineTo(px, py);
      }
    }
    
    this.pathGraphics.strokePath();
    
    // Draw lane markings
    this.pathGraphics.lineStyle(Math.max(2, this.cellSize * 0.05), 0xfbbf24, 0.5);
    this.pathGraphics.setLineStyle(Math.max(2, this.cellSize * 0.05), 0xfbbf24, 0.5, 1, [this.cellSize * 0.15, this.cellSize * 0.15]);
    this.pathGraphics.beginPath();
    
    for (let i = 0; i < this.level.path.length; i++) {
      const p = this.level.path[i];
      const px = offsetX + p.x * this.cellSize + this.cellSize / 2;
      const py = offsetY + p.y * this.cellSize + this.cellSize / 2;
      
      if (i === 0) {
        this.pathGraphics.moveTo(px, py);
      } else {
        this.pathGraphics.lineTo(px, py);
      }
    }
    
    this.pathGraphics.strokePath();
  }

  private createMarkers(offsetX: number, offsetY: number) {
    // Start marker
    const startP = this.level.path[0];
    const startX = offsetX + startP.x * this.cellSize + this.cellSize / 2;
    const startY = offsetY + startP.y * this.cellSize + this.cellSize / 2;
    
    this.add.text(startX, startY, '入口', {
      fontSize: this.isMobile ? '10px' : '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#16a34a',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    // End marker
    const endP = this.level.path[this.level.path.length - 1];
    const endX = offsetX + endP.x * this.cellSize + this.cellSize / 2;
    const endY = offsetY + endP.y * this.cellSize + this.cellSize / 2;
    
    this.add.text(endX, endY, this.isMobile ? '川藏' : '川藏立交', {
      fontSize: this.isMobile ? '8px' : '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2563eb',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
  }

  private createUI() {
    const hudY = this.isMobile ? 10 : 20;
    const hudX = 20;
    
    // Money
    this.moneyText = this.add.text(hudX, hudY, `预算: ${this.gameState.money}`, {
      fontSize: this.isMobile ? '14px' : '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#fbbf24',
      fontStyle: 'bold'
    });

    // Lives
    this.livesText = this.add.text(hudX, hudY + (this.isMobile ? 25 : 35), `安全度: ${this.gameState.lives}`, {
      fontSize: this.isMobile ? '14px' : '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#60a5fa',
      fontStyle: 'bold'
    });

    // Wave
    this.waveText = this.add.text(hudX, hudY + (this.isMobile ? 50 : 70), `波次: ${this.gameState.waveIndex + 1}/${this.level.waves.length}`, {
      fontSize: this.isMobile ? '14px' : '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#e2e8f0',
      fontStyle: 'bold'
    });

    // Control buttons
    this.createControlButtons();
    
    // Tower selection buttons
    this.createTowerButtons();
  }

  private createControlButtons() {
    const buttonY = this.isMobile ? 10 : 20;
    const buttonSize = this.isMobile ? 30 : 40;
    let buttonX = this.scale.width - buttonSize - 20;
    
    // Exit button
    this.exitButton = this.createButton(buttonX, buttonY, buttonSize, '退出', 0xef4444, () => {
      soundManager.stopBGM();
      this.scene.start('MenuScene');
    });
    
    buttonX -= buttonSize + 10;
    
    // Restart button
    this.restartButton = this.createButton(buttonX, buttonY, buttonSize, '↻', 0x3b82f6, () => {
      this.scene.restart({ level: this.level });
    });
    
    buttonX -= buttonSize + 10;
    
    // Pause button
    this.pauseButton = this.createButton(buttonX, buttonY, buttonSize, '▶', 0x3b82f6, () => {
      soundManager.init();
      this.gameState.isPlaying = !this.gameState.isPlaying;
      const text = this.pauseButton.getAt(1) as Phaser.GameObjects.Text;
      text.setText(this.gameState.isPlaying ? '❚❚' : '▶');
    });
    
    buttonX -= buttonSize + 10;
    
    // Mute button
    this.muteButton = this.createButton(buttonX, buttonY, buttonSize, '🔊', 0x3b82f6, () => {
      this.isMuted = soundManager.toggleMute();
      const text = this.muteButton.getAt(1) as Phaser.GameObjects.Text;
      text.setText(this.isMuted ? '🔇' : '🔊');
    });
  }

  private createButton(
    x: number, 
    y: number, 
    size: number, 
    label: string, 
    color: number, 
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, size, size, color, 0.9)
      .setStrokeStyle(2, 0x1e293b)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => bg.setFillStyle(color, 1))
      .on('pointerout', () => bg.setFillStyle(color, 0.9));
    
    const text = this.add.text(0, 0, label, {
      fontSize: this.isMobile ? '10px' : '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    container.add([bg, text]);
    
    return container;
  }

  private createTowerButtons() {
    const buttonWidth = this.isMobile ? 70 : 90;
    const buttonHeight = this.isMobile ? 60 : 80;
    const buttonSpacing = this.isMobile ? 5 : 10;
    const bottomPadding = this.isMobile ? 10 : 20;
    
    const totalWidth = Object.keys(TOWER_STATS).length * buttonWidth + (Object.keys(TOWER_STATS).length - 1) * buttonSpacing;
    let startX = (this.scale.width - totalWidth) / 2;
    const buttonY = this.scale.height - buttonHeight / 2 - bottomPadding;
    
    Object.entries(TOWER_STATS).forEach(([key, stats]) => {
      const type = key as TowerType;
      const container = this.add.container(startX + buttonWidth / 2, buttonY);
      
      const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x1e293b)
        .setStrokeStyle(2, 0x334155)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectTowerType(type, bg))
        .on('pointerover', () => {
          if (this.gameState.money >= stats.cost) {
            bg.setStrokeStyle(2, 0x3b82f6);
          }
        })
        .on('pointerout', () => {
          bg.setStrokeStyle(2, this.selectedTowerType === type ? 0x3b82f6 : 0x334155);
        });
      
      const icon = this.add.circle(0, -10, this.isMobile ? 12 : 16, parseInt(stats.color.replace('bg-', '').replace('-500', '').replace('-600', '').replace('-800', ''), 16));
      
      const nameText = this.add.text(0, 10, stats.name, {
        fontSize: this.isMobile ? '10px' : '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      const costText = this.add.text(0, 25, `${stats.cost}`, {
        fontSize: this.isMobile ? '9px' : '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#fbbf24',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      container.add([bg, icon, nameText, costText]);
      this.towerButtons.push(container);
      
      startX += buttonWidth + buttonSpacing;
    });
  }

  private selectTowerType(type: TowerType, bg: Phaser.GameObjects.Rectangle) {
    if (this.gameState.money >= TOWER_STATS[type].cost) {
      this.selectedTowerType = type;
      this.selectedTowerId = null;
      this.selectedForPreview = null;
      
      // Update all button borders
      this.towerButtons.forEach((container, index) => {
        const buttonBg = container.getAt(0) as Phaser.GameObjects.Rectangle;
        const currentType = Object.keys(TOWER_STATS)[index] as TowerType;
        buttonBg.setStrokeStyle(2, currentType === type ? 0x3b82f6 : 0x334155);
      });
    }
  }

  private handleCellClick(gridX: number, gridY: number) {
    if (this.gameState.isGameOver || this.gameState.isVictory) return;
    
    const isPath = this.level.path.some(p => p.x === gridX && p.y === gridY);
    const existingTower = this.gameState.towers.find(t => t.x === gridX && t.y === gridY);
    
    if (!isPath && this.selectedTowerType && !existingTower) {
      if (this.isMobile) {
        if (this.selectedForPreview?.x === gridX && this.selectedForPreview?.y === gridY) {
          this.placeTower(gridX, gridY);
          this.selectedForPreview = null;
        } else {
          this.selectedForPreview = { x: gridX, y: gridY };
        }
      } else {
        this.placeTower(gridX, gridY);
      }
    } else if (existingTower) {
      this.selectedTowerType = null;
      this.selectedForPreview = null;
      this.selectTowerForUpgrade(existingTower);
    } else {
      this.selectedTowerId = null;
      this.selectedForPreview = null;
      if (this.upgradeMenu) {
        this.upgradeMenu.destroy();
        this.upgradeMenu = undefined;
      }
      if (this.rangeCircle) {
        this.rangeCircle.destroy();
        this.rangeCircle = undefined;
      }
    }
  }

  private placeTower(gridX: number, gridY: number) {
    if (!this.selectedTowerType) return;
    
    const cost = TOWER_STATS[this.selectedTowerType].cost;
    if (this.gameState.money < cost) return;
    
    this.gameState.money -= cost;
    
    const tower: Tower = {
      id: Math.random().toString(36).substr(2, 9),
      type: this.selectedTowerType,
      x: gridX,
      y: gridY,
      level: 1,
      cooldown: 0,
      range: TOWER_STATS[this.selectedTowerType].range,
      damage: TOWER_STATS[this.selectedTowerType].damage,
      targetId: null,
      angle: 0
    };
    
    this.gameState.towers.push(tower);
    this.createTowerSprite(tower);
    this.selectedTowerType = null;
    
    // Reset button borders
    this.towerButtons.forEach(container => {
      const buttonBg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      buttonBg.setStrokeStyle(2, 0x334155);
    });
  }

  private createTowerSprite(tower: Tower) {
    const offsetX = (this.scale.width - this.level.gridWidth * this.cellSize) / 2;
    const offsetY = this.isMobile ? 90 : 120;
    
    const towerX = offsetX + tower.x * this.cellSize + this.cellSize / 2;
    const towerY = offsetY + tower.y * this.cellSize + this.cellSize / 2;
    
    const container = this.add.container(towerX, towerY);
    
    const towerSize = Math.max(this.cellSize * 0.8, 32);
    const colorHex = this.getTowerColor(tower.type);
    
    const circle = this.add.circle(0, 0, towerSize / 2, colorHex)
      .setStrokeStyle(2, 0x1e293b);
    
    const icon = this.add.text(0, 0, this.getTowerIcon(tower.type), {
      fontSize: this.isMobile ? '16px' : '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    container.add([circle, icon]);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, towerSize / 2), Phaser.Geom.Circle.Contains);
    container.on('pointerdown', () => {
      this.selectedTowerType = null;
      this.selectTowerForUpgrade(tower);
    });
    
    this.towerSprites.set(tower.id, container);
  }

  private getTowerColor(type: TowerType): number {
    const colorMap: Record<TowerType, number> = {
      [TowerType.AUXILIARY]: 0x3b82f6,
      [TowerType.TRAFFIC]: 0xeab308,
      [TowerType.PATROL]: 0x0891b2,
      [TowerType.SWAT]: 0x1e293b,
    };
    return colorMap[type];
  }

  private getTowerIcon(type: TowerType): string {
    const iconMap: Record<TowerType, string> = {
      [TowerType.AUXILIARY]: '👮',
      [TowerType.TRAFFIC]: '🚦',
      [TowerType.PATROL]: '🚓',
      [TowerType.SWAT]: '🛡️',
    };
    return iconMap[type];
  }

  private selectTowerForUpgrade(tower: Tower) {
    this.selectedTowerId = tower.id;
    
    // Show range circle
    if (this.rangeCircle) {
      this.rangeCircle.destroy();
    }
    
    const offsetX = (this.scale.width - this.level.gridWidth * this.cellSize) / 2;
    const offsetY = this.isMobile ? 90 : 120;
    
    const towerX = offsetX + tower.x * this.cellSize + this.cellSize / 2;
    const towerY = offsetY + tower.y * this.cellSize + this.cellSize / 2;
    
    this.rangeCircle = this.add.graphics();
    this.rangeCircle.lineStyle(2, 0x3b82f6, 0.3);
    this.rangeCircle.strokeCircle(towerX, towerY, tower.range * this.cellSize);
    this.rangeCircle.fillStyle(0x3b82f6, 0.1);
    this.rangeCircle.fillCircle(towerX, towerY, tower.range * this.cellSize);
    
    // Create upgrade menu
    if (this.upgradeMenu) {
      this.upgradeMenu.destroy();
    }
    
    this.upgradeMenu = this.createUpgradeMenu(tower, towerX, towerY);
  }

  private createUpgradeMenu(tower: Tower, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y - this.cellSize - 40);
    
    const menuWidth = this.isMobile ? 120 : 150;
    const menuHeight = this.isMobile ? 80 : 100;
    
    const bg = this.add.rectangle(0, 0, menuWidth, menuHeight, 0x1e293b, 0.95)
      .setStrokeStyle(2, 0x334155);
    
    container.add(bg);
    
    let yOffset = -menuHeight / 2 + 20;
    
    // Sell button
    const sellCost = Math.floor(TOWER_STATS[tower.type].cost * tower.level * 0.5);
    const sellButton = this.createMenuButton(0, yOffset, this.isMobile ? 100 : 120, this.isMobile ? 25 : 30, `卖出 ${sellCost}`, 0xef4444, () => {
      this.sellTower(tower.id);
    });
    container.add(sellButton);
    
    yOffset += this.isMobile ? 35 : 40;
    
    // Upgrade button
    if (tower.level < MAX_TOWER_LEVEL) {
      const upgradeCost = Math.floor(TOWER_STATS[tower.type].cost * 0.75 * tower.level);
      const canAfford = this.gameState.money >= upgradeCost;
      const upgradeButton = this.createMenuButton(
        0, 
        yOffset, 
        this.isMobile ? 100 : 120, 
        this.isMobile ? 25 : 30, 
        `升级 ${upgradeCost}`, 
        canAfford ? 0x3b82f6 : 0x64748b, 
        () => {
          if (canAfford) {
            this.upgradeTower(tower.id);
          }
        }
      );
      container.add(upgradeButton);
    } else {
      const maxText = this.add.text(0, yOffset, '最高等级', {
        fontSize: this.isMobile ? '10px' : '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#fbbf24'
      }).setOrigin(0.5);
      container.add(maxText);
    }
    
    return container;
  }

  private createMenuButton(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    label: string, 
    color: number, 
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, width, height, color)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => bg.setFillStyle(color, 1))
      .on('pointerout', () => bg.setFillStyle(color, 0.9));
    
    const text = this.add.text(0, 0, label, {
      fontSize: this.isMobile ? '11px' : '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    container.add([bg, text]);
    
    return container;
  }

  private sellTower(towerId: string) {
    const towerIndex = this.gameState.towers.findIndex(t => t.id === towerId);
    if (towerIndex === -1) return;
    
    const tower = this.gameState.towers[towerIndex];
    const refund = Math.floor(TOWER_STATS[tower.type].cost * tower.level * 0.5);
    
    this.gameState.money += refund;
    this.gameState.towers.splice(towerIndex, 1);
    
    const sprite = this.towerSprites.get(towerId);
    if (sprite) {
      sprite.destroy();
      this.towerSprites.delete(towerId);
    }
    
    this.selectedTowerId = null;
    
    if (this.upgradeMenu) {
      this.upgradeMenu.destroy();
      this.upgradeMenu = undefined;
    }
    
    if (this.rangeCircle) {
      this.rangeCircle.destroy();
      this.rangeCircle = undefined;
    }
  }

  private upgradeTower(towerId: string) {
    const tower = this.gameState.towers.find(t => t.id === towerId);
    if (!tower || tower.level >= MAX_TOWER_LEVEL) return;
    
    const upgradeCost = Math.floor(TOWER_STATS[tower.type].cost * 0.75 * tower.level);
    if (this.gameState.money < upgradeCost) return;
    
    this.gameState.money -= upgradeCost;
    tower.level += 1;
    
    const baseStats = TOWER_STATS[tower.type];
    const dmgMult = Math.pow(1.5, tower.level - 1);
    const rangeAdd = 0.5 * (tower.level - 1);
    
    tower.damage = Math.floor(baseStats.damage * dmgMult);
    tower.range = baseStats.range + rangeAdd;
    
    // Update UI
    if (this.upgradeMenu) {
      this.upgradeMenu.destroy();
      this.upgradeMenu = undefined;
    }
    
    if (this.rangeCircle) {
      this.rangeCircle.destroy();
      this.rangeCircle = undefined;
    }
    
    this.selectTowerForUpgrade(tower);
  }

  private prepareWave(index: number) {
    if (index >= this.level.waves.length) return;
    
    const wave = this.level.waves[index];
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
    
    this.enemiesToSpawn = spawnList;
    this.waveFrameCounter = 0;
  }

  private spawnEnemy(type: EnemyType) {
    const stats = ENEMY_STATS[type];
    const start = this.level.path[0];
    
    const enemy: Enemy = {
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
    
    this.gameState.enemies.push(enemy);
    this.createEnemySprite(enemy);
  }

  private createEnemySprite(enemy: Enemy) {
    const offsetX = (this.scale.width - this.level.gridWidth * this.cellSize) / 2;
    const offsetY = this.isMobile ? 90 : 120;
    
    const enemyX = offsetX + enemy.x * this.cellSize + this.cellSize / 2;
    const enemyY = offsetY + enemy.y * this.cellSize + this.cellSize / 2;
    
    const container = this.add.container(enemyX, enemyY);
    
    const enemySize = this.cellSize * 0.8;
    const colorHex = this.getEnemyColor(enemy.type);
    
    const circle = this.add.circle(0, 0, enemySize / 2, colorHex)
      .setStrokeStyle(2, 0xffffff, 0.2);
    
    const icon = this.add.text(0, 0, this.getEnemyIcon(enemy.type), {
      fontSize: this.isMobile ? '14px' : '18px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Health bar
    const healthBarWidth = enemySize;
    const healthBarHeight = this.isMobile ? 4 : 6;
    const healthBarY = -enemySize / 2 - 8;
    
    const healthBg = this.add.rectangle(-healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight, 0x1e293b)
      .setOrigin(0, 0.5);
    
    const healthFill = this.add.rectangle(-healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight, 0x22c55e)
      .setOrigin(0, 0.5);
    
    container.add([circle, icon, healthBg, healthFill]);
    container.setData('healthFill', healthFill);
    container.setData('healthBarWidth', healthBarWidth);
    
    this.enemySprites.set(enemy.id, container);
  }

  private getEnemyColor(type: EnemyType): number {
    const colorMap: Record<EnemyType, number> = {
      [EnemyType.SCOOTER]: 0xfb923c,
      [EnemyType.DELIVERY]: 0xef4444,
      [EnemyType.RACER]: 0xc084fc,
      [EnemyType.MODIFIED]: 0x000000,
    };
    return colorMap[type];
  }

  private getEnemyIcon(type: EnemyType): string {
    const iconMap: Record<EnemyType, string> = {
      [EnemyType.SCOOTER]: '🛵',
      [EnemyType.DELIVERY]: '📦',
      [EnemyType.RACER]: '🏍️',
      [EnemyType.MODIFIED]: '⚡',
    };
    return iconMap[type];
  }

  update(time: number, delta: number) {
    if (!this.gameState.isPlaying || this.gameState.isGameOver || this.gameState.isVictory) {
      return;
    }
    
    // Update UI
    this.moneyText.setText(`预算: ${Math.floor(this.gameState.money)}`);
    this.livesText.setText(`安全度: ${this.gameState.lives}`);
    this.waveText.setText(`波次: ${this.gameState.waveIndex + 1}/${this.level.waves.length}`);
    
    // Spawn enemies
    if (this.enemiesToSpawn.length > 0) {
      const nextSpawn = this.enemiesToSpawn[0];
      if (this.waveFrameCounter >= nextSpawn.time) {
        this.spawnEnemy(nextSpawn.type);
        this.enemiesToSpawn.shift();
      }
    } else if (this.gameState.enemies.length === 0 && this.gameState.projectiles.length === 0) {
      // Wave complete
      if (this.gameState.waveIndex < this.level.waves.length - 1) {
        const currentWave = this.level.waves[this.gameState.waveIndex];
        if (this.waveFrameCounter > (currentWave.delayBetween || 200)) {
          this.gameState.waveIndex++;
          this.prepareWave(this.gameState.waveIndex);
        }
      } else {
        // Victory
        this.gameState.isVictory = true;
        this.gameState.isPlaying = false;
        this.showGameOver(true);
      }
    }
    
    this.waveFrameCounter++;
    
    // Update enemies
    this.updateEnemies();
    
    // Update towers
    this.updateTowers();
    
    // Update projectiles
    this.updateProjectiles();
  }

  private updateEnemies() {
    const offsetX = (this.scale.width - this.level.gridWidth * this.cellSize) / 2;
    const offsetY = this.isMobile ? 90 : 120;
    
    for (let i = this.gameState.enemies.length - 1; i >= 0; i--) {
      const enemy = this.gameState.enemies[i];
      
      // Handle freeze
      if (enemy.frozen > 0) {
        enemy.frozen--;
        if (enemy.frozen <= 0) enemy.frozenFactor = 1;
      }
      
      // Move
      const speedMultiplier = this.cellSize / 60;
      const actualSpeed = enemy.speed * enemy.frozenFactor * speedMultiplier;
      enemy.progress += actualSpeed;
      
      if (enemy.progress >= 1) {
        enemy.progress = 0;
        enemy.pathIndex++;
        if (enemy.pathIndex >= this.level.path.length - 1) {
          // Reached end
          this.gameState.lives--;
          this.gameState.enemies.splice(i, 1);
          
          const sprite = this.enemySprites.get(enemy.id);
          if (sprite) {
            sprite.destroy();
            this.enemySprites.delete(enemy.id);
          }
          
          if (this.gameState.lives <= 0) {
            this.gameState.isGameOver = true;
            this.gameState.isPlaying = false;
            this.showGameOver(false);
          }
          continue;
        }
      }
      
      // Calculate position
      const currentCell = this.level.path[enemy.pathIndex];
      const nextCell = this.level.path[Math.min(enemy.pathIndex + 1, this.level.path.length - 1)];
      
      if (nextCell) {
        enemy.x = currentCell.x + (nextCell.x - currentCell.x) * enemy.progress;
        enemy.y = currentCell.y + (nextCell.y - currentCell.y) * enemy.progress;
      } else {
        enemy.x = currentCell.x;
        enemy.y = currentCell.y;
      }
      
      // Update sprite
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        const enemyX = offsetX + enemy.x * this.cellSize + this.cellSize / 2;
        const enemyY = offsetY + enemy.y * this.cellSize + this.cellSize / 2;
        sprite.setPosition(enemyX, enemyY);
        
        // Update health bar
        const healthFill = sprite.getData('healthFill') as Phaser.GameObjects.Rectangle;
        const healthBarWidth = sprite.getData('healthBarWidth') as number;
        const healthPercent = enemy.hp / enemy.maxHp;
        healthFill.setSize(healthBarWidth * healthPercent, healthFill.height);
      }
    }
  }

  private updateTowers() {
    this.gameState.towers.forEach(tower => {
      if (tower.cooldown > 0) tower.cooldown--;
      
      // Find target
      let target: Enemy | null = null;
      const inRange = this.gameState.enemies.filter(e => dist(tower.x, tower.y, e.x, e.y) <= tower.range);
      
      if (inRange.length > 0) {
        inRange.sort((a, b) => (b.pathIndex + b.progress) - (a.pathIndex + a.progress));
        target = inRange[0];
      }
      
      tower.targetId = target ? target.id : null;
      
      if (target && tower.cooldown <= 0) {
        // Fire
        const stats = TOWER_STATS[tower.type];
        const projectile: Projectile = {
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
        };
        
        this.gameState.projectiles.push(projectile);
        this.createProjectileSprite(projectile);
        
        soundManager.playShoot(tower.type);
        
        const baseSpeed = stats.speed;
        const fireRateMod = Math.pow(0.9, tower.level - 1);
        const maxCooldown = baseSpeed * fireRateMod;
        
        tower.cooldown = maxCooldown;
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x) * (180 / Math.PI);
        
        // Rotate tower sprite
        const sprite = this.towerSprites.get(tower.id);
        if (sprite) {
          sprite.setAngle(tower.angle);
        }
      }
    });
  }

  private createProjectileSprite(projectile: Projectile) {
    const offsetX = (this.scale.width - this.level.gridWidth * this.cellSize) / 2;
    const offsetY = this.isMobile ? 90 : 120;
    
    const projX = offsetX + projectile.x * this.cellSize + this.cellSize / 2;
    const projY = offsetY + projectile.y * this.cellSize + this.cellSize / 2;
    
    const graphics = this.add.graphics();
    graphics.setPosition(projX, projY);
    
    const projectileSize = Math.max(this.cellSize * 0.15, 4);
    
    switch (projectile.type) {
      case TowerType.AUXILIARY:
        graphics.fillStyle(0xffffff);
        graphics.fillRect(-projectileSize / 2, -projectileSize, projectileSize / 2, projectileSize * 2);
        break;
      case TowerType.TRAFFIC:
        graphics.fillStyle(0xef4444);
        graphics.fillCircle(0, 0, projectileSize);
        graphics.lineStyle(1, 0xffffff);
        graphics.strokeCircle(0, 0, projectileSize);
        break;
      case TowerType.PATROL:
        graphics.lineStyle(2, 0x3b82f6, 0.5);
        graphics.strokeCircle(0, 0, projectileSize * 2);
        break;
      case TowerType.SWAT:
        graphics.fillStyle(0xfde047);
        graphics.fillCircle(0, 0, projectileSize);
        break;
    }
    
    this.projectileSprites.set(projectile.id, graphics);
  }

  private updateProjectiles() {
    const offsetX = (this.scale.width - this.level.gridWidth * this.cellSize) / 2;
    const offsetY = this.isMobile ? 90 : 120;
    
    for (let i = this.gameState.projectiles.length - 1; i >= 0; i--) {
      const p = this.gameState.projectiles[i];
      const target = this.gameState.enemies.find(e => e.id === p.targetId);
      
      if (!target) {
        this.gameState.projectiles.splice(i, 1);
        const sprite = this.projectileSprites.get(p.id);
        if (sprite) {
          sprite.destroy();
          this.projectileSprites.delete(p.id);
        }
        continue;
      }
      
      const d = dist(p.x, p.y, target.x, target.y);
      if (d < p.speed) {
        // Hit
        soundManager.playHit();
        
        if (p.splashRadius && p.splashRadius > 0) {
          this.gameState.enemies.forEach(e => {
            if (dist(e.x, e.y, target.x, target.y) <= (p.splashRadius || 0)) {
              this.hitEnemy(e, p.damage, p.slowFactor, p.slowDuration);
            }
          });
        } else {
          this.hitEnemy(target, p.damage, p.slowFactor, p.slowDuration);
        }
        
        this.gameState.projectiles.splice(i, 1);
        const sprite = this.projectileSprites.get(p.id);
        if (sprite) {
          sprite.destroy();
          this.projectileSprites.delete(p.id);
        }
      } else {
        // Move
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        p.x += Math.cos(angle) * p.speed;
        p.y += Math.sin(angle) * p.speed;
        
        // Update sprite
        const sprite = this.projectileSprites.get(p.id);
        if (sprite) {
          const projX = offsetX + p.x * this.cellSize + this.cellSize / 2;
          const projY = offsetY + p.y * this.cellSize + this.cellSize / 2;
          sprite.setPosition(projX, projY);
        }
      }
    }
  }

  private hitEnemy(enemy: Enemy, damage: number, slowFactor?: number, slowDuration?: number) {
    enemy.hp -= damage;
    if (slowFactor && slowFactor < 1) {
      enemy.frozen = slowDuration || 60;
      enemy.frozenFactor = slowFactor;
    }
    
    if (enemy.hp <= 0) {
      const idx = this.gameState.enemies.indexOf(enemy);
      if (idx !== -1) {
        this.gameState.enemies.splice(idx, 1);
        this.gameState.money += ENEMY_STATS[enemy.type].reward;
        
        const sprite = this.enemySprites.get(enemy.id);
        if (sprite) {
          sprite.destroy();
          this.enemySprites.delete(enemy.id);
        }
      }
    }
  }

  private showGameOver(victory: boolean) {
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x020617,
      0.9
    );
    
    const title = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 100,
      victory ? '行动成功' : '交通瘫痪',
      {
        fontSize: this.isMobile ? '36px' : '48px',
        fontFamily: 'Arial, sans-serif',
        color: victory ? '#3b82f6' : '#ef4444',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    const message = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 20,
      victory 
        ? "川藏立交安全。所有违规者已被处理。" 
        : "太多非法车辆穿过立交桥。城市陷入混乱！",
      {
        fontSize: this.isMobile ? '16px' : '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#e2e8f0',
        align: 'center',
        wordWrap: { width: this.scale.width - 40 }
      }
    ).setOrigin(0.5);
    
    const restartButton = this.createButton(
      this.scale.width / 2,
      this.scale.height / 2 + 60,
      this.isMobile ? 200 : 250,
      '重新开始任务',
      0x3b82f6,
      () => {
        this.scene.restart({ level: this.level });
      }
    );
    
    const menuButton = this.createButton(
      this.scale.width / 2,
      this.scale.height / 2 + 120,
      this.isMobile ? 200 : 250,
      '返回菜单',
      0x64748b,
      () => {
        soundManager.stopBGM();
        this.scene.start('MenuScene');
      }
    );
  }
}
