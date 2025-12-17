
import React, { useState } from 'react';
import Game from './components/Game';
import { GameLevel } from './types';
import { generateLevel } from './services/levelGenerator';
import { DEFAULT_LEVEL_PATH, DEFAULT_WAVES, GRID_HEIGHT, GRID_WIDTH } from './constants';
import { Siren, Bot, ArrowRight, ShieldCheck, AlertCircle, MapPin } from 'lucide-react';

// Default starter level
const defaultLevel: GameLevel = {
  id: 'lvl-1',
  name: 'Zang Overpass Checkpoint',
  gridWidth: GRID_WIDTH,
  gridHeight: GRID_HEIGHT,
  path: DEFAULT_LEVEL_PATH,
  waves: DEFAULT_WAVES,
  startingMoney: 450
};

const App: React.FC = () => {
  const [level, setLevel] = useState<GameLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // 移动端检测
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStartDefault = () => {
    setLevel(defaultLevel);
  };

  const handleGenerateLevel = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const newLevel = await generateLevel(prompt);
      setLevel(newLevel);
    } catch (e) {
      setError("Failed to generate operation map. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  if (level) {
    return (
      <div className={`min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden ${
        isMobile ? 'p-0' : 'p-4'
      }`}>
        {/* Background cityscape */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black"></div>
        <div className="relative z-10 w-full">
            <h1 className={`text-center font-bold text-blue-500/50 uppercase flex items-center justify-center gap-2 ${
              isMobile 
                ? 'text-sm mb-2 tracking-wider px-4 py-2' 
                : 'text-xl mb-2 tracking-[0.5em]'
            }`}>
              <ShieldCheck className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              {isMobile ? level.name : `堵住摩友: ${level.name}`}
            </h1>
            <Game 
              level={level} 
              onExit={() => setLevel(null)} 
              onRestart={() => setLevel({ ...level, id: Math.random().toString() })} 
            />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans ${
      isMobile ? 'px-4 py-8' : 'px-6'
    }`}>
       {/* Background decoration */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-1/3 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"></div>
          <div className="absolute top-2/3 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"></div>
          <div className={`absolute bg-blue-600 rounded-full blur-[100px] animate-pulse ${
            isMobile 
              ? 'bottom-5 right-5 w-32 h-32' 
              : 'bottom-10 right-10 w-64 h-64'
          }`}></div>
       </div>

       <div className={`z-10 w-full ${
         isMobile ? 'max-w-sm' : 'max-w-3xl'
       }`}>
         <div className={`text-center relative ${
           isMobile ? 'mb-8' : 'mb-16'
         }`}>
            <div className={`inline-flex items-center justify-center bg-blue-600 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-blue-400 ${
              isMobile ? 'p-3 mb-4' : 'p-5 mb-8'
            }`}>
               <Siren className={`text-white animate-pulse ${
                 isMobile ? 'w-10 h-10' : 'w-16 h-16'
               }`} />
            </div>
            <h1 className={`font-black tracking-tighter text-white drop-shadow-lg ${
              isMobile 
                ? 'text-3xl mb-2' 
                : 'text-6xl mb-4'
            }`}>
              TRAFFIC <span className="text-blue-500">GUARD</span>
            </h1>
            <p className={`text-slate-400 max-w-xl mx-auto ${
              isMobile ? 'text-sm px-2' : 'text-xl'
            }`}>
              Command the checkpoint. Stop illegal motorcycles from crossing <span className="text-yellow-400 font-bold">Zang Overpass</span>.
            </p>
         </div>

         <div className={`grid gap-6 ${
           isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
         }`}>
            {/* Campaign Card */}
            <div className={`group relative bg-slate-900 border border-slate-700 hover:border-blue-500 rounded-xl transition-all cursor-pointer overflow-hidden active:scale-95 ${
              isMobile ? 'p-4' : 'p-8'
            }`} onClick={handleStartDefault}>
               <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition"></div>
               <div className="relative z-10">
                 <div className={`flex justify-between items-start ${
                   isMobile ? 'mb-3' : 'mb-6'
                 }`}>
                    <div className={`bg-slate-800 rounded-lg border border-slate-600 group-hover:border-blue-500/50 transition ${
                      isMobile ? 'p-2' : 'p-3'
                    }`}>
                      <MapPin className={`text-blue-400 ${
                        isMobile ? 'w-5 h-5' : 'w-6 h-6'
                      }`} />
                    </div>
                    <ArrowRight className={`text-slate-500 group-hover:text-white transition ${
                      isMobile ? 'w-4 h-4' : 'w-5 h-5'
                    }`} />
                 </div>
                 <h3 className={`font-bold text-white ${
                   isMobile ? 'text-lg mb-1' : 'text-2xl mb-2'
                 }`}>Zang Overpass</h3>
                 <p className={`text-slate-400 ${
                   isMobile ? 'text-xs' : 'text-sm'
                 }`}>
                   Deploy units to the main overpass. High traffic volume expected. Check helmets and licenses.
                 </p>
               </div>
            </div>

            {/* AI Generator Card */}
            <div className={`relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden ${
              isMobile ? 'p-4' : 'p-8'
            }`}>
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20"></div>
               <div className="relative z-10">
                 <div className={`flex justify-between items-start ${
                   isMobile ? 'mb-3' : 'mb-6'
                 }`}>
                    <div className={`bg-indigo-900/50 rounded-lg border border-indigo-500/30 ${
                      isMobile ? 'p-2' : 'p-3'
                    }`}>
                      <Bot className={`text-indigo-300 ${
                        isMobile ? 'w-5 h-5' : 'w-6 h-6'
                      }`} />
                    </div>
                 </div>
                 <h3 className={`font-bold ${
                   isMobile ? 'text-lg mb-1' : 'text-2xl mb-2'
                 }`}>Simulate Operation</h3>
                 <p className={`text-indigo-200/60 uppercase tracking-wider ${
                   isMobile ? 'text-[10px] mb-2' : 'text-xs mb-4'
                 }`}>Powered by Gemini AI</p>
                 
                 <div className="space-y-3">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={isMobile 
                        ? "Describe traffic situation..."
                        : "Describe the traffic situation (e.g., 'Rainy night, massive wave of speeding racers')"
                      }
                      className={`w-full bg-black/30 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-400 transition resize-none ${
                        isMobile ? 'p-2 text-xs h-16' : 'p-3 text-sm h-24'
                      }`}
                    />
                    <button 
                      onClick={handleGenerateLevel}
                      disabled={loading || !prompt.trim()}
                      className={`w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold shadow-lg transition flex items-center justify-center text-white ${
                        isMobile ? 'py-2 text-sm' : 'py-3'
                      }`}
                    >
                      {loading ? (
                        <span className="animate-pulse">
                          {isMobile ? 'Analyzing...' : 'Analyzing Traffic...'}
                        </span>
                      ) : (
                        <>
                          <Siren className={`mr-2 ${
                            isMobile ? 'w-3 h-3' : 'w-4 h-4'
                          }`} />
                          {isMobile ? 'Simulate' : 'Start Simulation'}
                        </>
                      )}
                    </button>
                    {error && (
                      <div className={`flex items-center text-red-400 bg-red-900/20 rounded ${
                        isMobile ? 'text-xs mt-2 p-2' : 'text-xs mt-2 p-2'
                      }`}>
                        <AlertCircle className={`mr-1 ${
                          isMobile ? 'w-3 h-3' : 'w-3 h-3'
                        }`} />
                        {error}
                      </div>
                    )}
                 </div>
               </div>
            </div>
         </div>

         <div className={`text-center text-slate-700 uppercase tracking-widest ${
           isMobile 
             ? 'mt-8 text-[10px] px-2' 
             : 'mt-16 text-xs'
         }`}>
           City Traffic Control System v2.5{!isMobile && ' • Authorized Personnel Only'}
         </div>
       </div>
    </div>
  );
};

export default App;
