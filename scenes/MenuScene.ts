import Phaser from 'phaser';
import { GameLevel } from '../types';
import { DEFAULT_LEVEL_PATH, DEFAULT_MOBILE_LEVEL_PATH, DEFAULT_WAVES, GRID_HEIGHT, GRID_WIDTH, MOBILE_GRID_HEIGHT, MOBILE_GRID_WIDTH, NANHU_LEVEL_PATH, NANHU_MOBILE_LEVEL_PATH } from '../constants';

export default class MenuScene extends Phaser.Scene {
  private isMobile: boolean = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.isMobile = this.scale.width < 768;
    
    // Background
    this.cameras.main.setBackgroundColor('#0f172a');
    
    // Title
    const titleY = this.isMobile ? 150 : 200;
    const title = this.add.text(
      this.scale.width / 2, 
      titleY,
      '摩法交通 卫士',
      {
        fontSize: this.isMobile ? '36px' : '72px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    const subtitle = this.add.text(
      this.scale.width / 2,
      titleY + (this.isMobile ? 50 : 100),
      '部署千军万马。阻止飙车,炸街,无证人员穿越川藏立交。',
      {
        fontSize: this.isMobile ? '14px' : '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        color: '#94a3b8',
        align: 'center',
        wordWrap: { width: this.scale.width - 40 }
      }
    ).setOrigin(0.5);

    // Level buttons
    const buttonY = this.scale.height / 2 + 50;
    const buttonSpacing = this.isMobile ? 120 : 150;
    
    // Chuanzang Level Button
    this.createLevelButton(
      this.scale.width / 2 - (this.isMobile ? 0 : buttonSpacing / 2),
      buttonY,
      '川藏立交',
      '在成都西部主要立交桥完成队伍部署!',
      '#3b82f6',
      () => this.startLevel('chuanzang')
    );

    // Nanhu Level Button
    this.createLevelButton(
      this.scale.width / 2 + (this.isMobile ? 0 : buttonSpacing / 2),
      buttonY + (this.isMobile ? 140 : 0),
      '南湖立交',
      '城南重要交通枢纽。夜间飙车族活动频繁。',
      '#a855f7',
      () => this.startLevel('nanhu')
    );

    // Footer
    const footer = this.add.text(
      this.scale.width / 2,
      this.scale.height - 30,
      '城市交通控制系统 v2.5',
      {
        fontSize: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        color: '#334155'
      }
    ).setOrigin(0.5);
  }

  private createLevelButton(
    x: number, 
    y: number, 
    title: string, 
    description: string,
    color: string,
    onClick: () => void
  ) {
    const buttonWidth = this.isMobile ? 280 : 300;
    const buttonHeight = this.isMobile ? 100 : 120;
    
    // Button background
    const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x1e293b)
      .setStrokeStyle(2, parseInt(color.replace('#', ''), 16))
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setFillStyle(parseInt(color.replace('#', ''), 16), 0.1);
      })
      .on('pointerout', () => {
        bg.setFillStyle(0x1e293b);
      })
      .on('pointerdown', onClick);

    // Button title
    const titleText = this.add.text(
      x, 
      y - 20,
      title,
      {
        fontSize: this.isMobile ? '20px' : '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Button description
    const descText = this.add.text(
      x,
      y + 15,
      description,
      {
        fontSize: this.isMobile ? '11px' : '13px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        color: '#94a3b8',
        align: 'center',
        wordWrap: { width: buttonWidth - 20 }
      }
    ).setOrigin(0.5);
  }

  private startLevel(levelType: 'chuanzang' | 'nanhu') {
    const isMobile = this.scale.width < 768;
    
    let level: GameLevel;
    
    if (levelType === 'chuanzang') {
      level = {
        id: 'lvl-1',
        name: '保卫川藏立交',
        gridWidth: isMobile ? MOBILE_GRID_WIDTH : GRID_WIDTH,
        gridHeight: isMobile ? MOBILE_GRID_HEIGHT : GRID_HEIGHT,
        path: isMobile ? DEFAULT_MOBILE_LEVEL_PATH : DEFAULT_LEVEL_PATH,
        waves: DEFAULT_WAVES,
        startingMoney: 450
      };
    } else {
      level = {
        id: 'lvl-2',
        name: '守护南湖立交',
        gridWidth: isMobile ? MOBILE_GRID_WIDTH : GRID_WIDTH,
        gridHeight: isMobile ? MOBILE_GRID_HEIGHT : GRID_HEIGHT,
        path: isMobile ? NANHU_MOBILE_LEVEL_PATH : NANHU_LEVEL_PATH,
        waves: DEFAULT_WAVES,
        startingMoney: 500
      };
    }

    this.scene.start('GameScene', { level });
  }
}
