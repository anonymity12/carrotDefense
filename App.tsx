
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background cityscape */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black"></div>
        <div className="relative z-10 w-full">
            <h1 className="text-center text-xl font-bold text-blue-500/50 mb-2 uppercase tracking-[0.5em] flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              OPERATION: {level.name}
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
       {/* Background decoration */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-1/3 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"></div>
          <div className="absolute top-2/3 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-600 rounded-full blur-[100px] animate-pulse"></div>
       </div>

       <div className="z-10 w-full max-w-3xl px-6">
         <div className="text-center mb-16 relative">
            <div className="inline-flex items-center justify-center p-5 bg-blue-600 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.4)] mb-8 border border-blue-400">
               <Siren className="w-16 h-16 text-white animate-pulse" />
            </div>
            <h1 className="text-6xl font-black mb-4 tracking-tighter text-white drop-shadow-lg">
              TRAFFIC <span className="text-blue-500">GUARD</span>
            </h1>
            <p className="text-slate-400 text-xl max-w-xl mx-auto">
              Command the checkpoint. Stop illegal motorcycles from crossing <span className="text-yellow-400 font-bold">Zang Overpass</span>.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaign Card */}
            <div className="group relative bg-slate-900 border border-slate-700 hover:border-blue-500 p-8 rounded-xl transition-all cursor-pointer overflow-hidden" onClick={handleStartDefault}>
               <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition"></div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-slate-800 rounded-lg border border-slate-600 group-hover:border-blue-500/50 transition">
                      <MapPin className="w-6 h-6 text-blue-400" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white transition" />
                 </div>
                 <h3 className="text-2xl font-bold mb-2 text-white">Zang Overpass</h3>
                 <p className="text-slate-400 text-sm">Deploy units to the main overpass. High traffic volume expected. Check helmets and licenses.</p>
               </div>
            </div>

            {/* AI Generator Card */}
            <div className="relative bg-slate-900 border border-slate-700 p-8 rounded-xl overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20"></div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-indigo-900/50 rounded-lg border border-indigo-500/30">
                      <Bot className="w-6 h-6 text-indigo-300" />
                    </div>
                 </div>
                 <h3 className="text-2xl font-bold mb-2">Simulate Operation</h3>
                 <p className="text-indigo-200/60 text-xs mb-4 uppercase tracking-wider">Powered by Gemini AI</p>
                 
                 <div className="space-y-3">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the traffic situation (e.g., 'Rainy night, massive wave of speeding racers')"
                      className="w-full bg-black/30 border border-slate-600 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-400 transition resize-none h-24 text-white"
                    />
                    <button 
                      onClick={handleGenerateLevel}
                      disabled={loading || !prompt.trim()}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold shadow-lg transition flex items-center justify-center text-white"
                    >
                      {loading ? (
                        <span className="animate-pulse">Analyzing Traffic...</span>
                      ) : (
                        <>
                          <Siren className="w-4 h-4 mr-2" />
                          Start Simulation
                        </>
                      )}
                    </button>
                    {error && (
                      <div className="flex items-center text-red-400 text-xs mt-2 bg-red-900/20 p-2 rounded">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {error}
                      </div>
                    )}
                 </div>
               </div>
            </div>
         </div>

         <div className="mt-16 text-center text-slate-700 text-xs uppercase tracking-widest">
           City Traffic Control System v2.5 • Authorized Personnel Only
         </div>
       </div>
    </div>
  );
};

export default App;
