import React, { useEffect, useRef, useState } from 'react';
import { createPhaserGame } from './PhaserGame';
import { GameLevel } from './types';
import { DEFAULT_LEVEL_PATH, DEFAULT_MOBILE_LEVEL_PATH, NANHU_LEVEL_PATH, NANHU_MOBILE_LEVEL_PATH, DEFAULT_WAVES, GRID_HEIGHT, GRID_WIDTH, MOBILE_GRID_HEIGHT, MOBILE_GRID_WIDTH } from './constants';

const App: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getChuanzangLevel = (isMobile: boolean): GameLevel => ({
    id: 'lvl-1',
    name: '保卫川藏立交',
    gridWidth: isMobile ? MOBILE_GRID_WIDTH : GRID_WIDTH,
    gridHeight: isMobile ? MOBILE_GRID_HEIGHT : GRID_HEIGHT,
    path: isMobile ? DEFAULT_MOBILE_LEVEL_PATH : DEFAULT_LEVEL_PATH,
    waves: DEFAULT_WAVES,
    startingMoney: 450
  });

  const getNanhuLevel = (isMobile: boolean): GameLevel => ({
    id: 'lvl-2',
    name: '守护南湖立交',
    gridWidth: isMobile ? MOBILE_GRID_WIDTH : GRID_WIDTH,
    gridHeight: isMobile ? MOBILE_GRID_HEIGHT : GRID_HEIGHT,
    path: isMobile ? NANHU_MOBILE_LEVEL_PATH : NANHU_LEVEL_PATH,
    waves: DEFAULT_WAVES,
    startingMoney: 500
  });

  const startGame = (levelType: 'chuanzang' | 'nanhu') => {
    setShowMenu(false);
    
    setTimeout(() => {
      if (containerRef.current && !gameRef.current) {
        const level = levelType === 'chuanzang' ? getChuanzangLevel(isMobile) : getNanhuLevel(isMobile);
        gameRef.current = createPhaserGame('phaser-game-container', level, () => {
          // On exit
          if (gameRef.current) {
            gameRef.current.destroy(true);
            gameRef.current = null;
          }
          setShowMenu(true);
        });
      }
    }, 100);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {showMenu && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          zIndex: 1000
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: isMobile ? '40px' : '80px'
          }}>
            <h1 style={{
              fontSize: isMobile ? '36px' : '72px',
              fontWeight: 900,
              marginBottom: isMobile ? '20px' : '40px',
              letterSpacing: '-0.02em'
            }}>
              摩法交通 <span style={{ color: '#3b82f6' }}>卫士</span>
            </h1>
            <p style={{
              fontSize: isMobile ? '14px' : '20px',
              color: '#94a3b8',
              maxWidth: isMobile ? '300px' : '600px',
              margin: '0 auto',
              padding: '0 20px'
            }}>
              部署千军万马。阻止飙车,炸街,无证人员穿越川藏立交。
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '20px',
            marginBottom: '40px'
          }}>
            {/* Chuanzang Button */}
            <button
              onClick={() => startGame('chuanzang')}
              style={{
                width: isMobile ? '280px' : '300px',
                padding: isMobile ? '20px' : '30px',
                background: '#1e293b',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1e293b';
              }}
            >
              <div style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                川藏立交
              </div>
              <div style={{
                fontSize: isMobile ? '11px' : '13px',
                color: '#94a3b8'
              }}>
                在成都西部主要立交桥完成队伍部署!
              </div>
            </button>

            {/* Nanhu Button */}
            <button
              onClick={() => startGame('nanhu')}
              style={{
                width: isMobile ? '280px' : '300px',
                padding: isMobile ? '20px' : '30px',
                background: '#1e293b',
                border: '2px solid #a855f7',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1e293b';
              }}
            >
              <div style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                南湖立交
              </div>
              <div style={{
                fontSize: isMobile ? '11px' : '13px',
                color: '#94a3b8'
              }}>
                城南重要交通枢纽。夜间飙车族活动频繁。
              </div>
            </button>
          </div>

          <div style={{
            fontSize: '12px',
            color: '#334155',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            城市交通控制系统 v2.5
          </div>
        </div>
      )}
      
      <div 
        id="phaser-game-container" 
        ref={containerRef}
        style={{ 
          width: '100vw', 
          height: '100vh', 
          overflow: 'hidden',
          margin: 0,
          padding: 0,
          display: showMenu ? 'none' : 'block'
        }}
      />
    </div>
  );
};

export default App;
