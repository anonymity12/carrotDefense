import React, { useEffect, useRef } from 'react';
import { createPhaserGame } from './PhaserGame';

const App: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = createPhaserGame('phaser-game-container');
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      id="phaser-game-container" 
      ref={containerRef}
      style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }}
    />
  );
};

export default App;
