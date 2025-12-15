import React, { useState } from 'react';
import Game from './components/Game';
import { GameLevel } from './types';
import { generateLevel } from './services/levelGenerator';
import { DEFAULT_LEVEL_PATH, DEFAULT_WAVES, GRID_HEIGHT, GRID_WIDTH } from './constants';
import { Sparkles, Bot, ArrowRight, Gamepad2, AlertCircle } from 'lucide-react';

// Default starter level
const defaultLevel: GameLevel = {
  id: 'lvl-1',
  name: 'Carrot Fields',
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
      setError("Failed to generate level. Please try again or check API key.");
    } finally {
      setLoading(false);
    }
  };

  if (level) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 bg-[url('https://picsum.photos/1920/1080?blur=5')] bg-cover bg-center">
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"></div>
        <div className="relative z-10 w-full">
            <h1 className="text-center text-3xl font-black text-white/50 mb-2 uppercase tracking-widest">{level.name}</h1>
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
       {/* Background decoration */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
       </div>

       <div className="z-10 w-full max-w-2xl px-6">
         <div className="text-center mb-12">
            <div className="inline-block p-4 bg-orange-500 rounded-2xl shadow-xl mb-6 rotate-3 hover:rotate-6 transition-transform">
               <Gamepad2 className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-orange-400 to-yellow-300 text-transparent bg-clip-text">
              GEMINI DEFENSE
            </h1>
            <p className="text-slate-400 text-xl font-light">
              Protect the Core. Powered by Google Gemini.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Classic Mode Card */}
            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl hover:bg-slate-800 transition cursor-pointer group" onClick={handleStartDefault}>
               <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-600 rounded-lg">
                    <Gamepad2 className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white transition" />
               </div>
               <h3 className="text-2xl font-bold mb-2">Classic Adventure</h3>
               <p className="text-slate-400">Play the original handcrafted level. Balanced and fun for beginners.</p>
            </div>

            {/* AI Generator Card */}
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 p-8 rounded-2xl">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <Bot className="w-5 h-5 text-indigo-300" />
               </div>
               <h3 className="text-2xl font-bold mb-2">AI Level Generator</h3>
               <p className="text-indigo-200/70 text-sm mb-4">Describe a level and let Gemini build it for you.</p>
               
               <div className="space-y-3">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g., A long winding path with 5 waves of fast enemies..."
                    className="w-full bg-slate-900/80 border border-indigo-500/30 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-400 transition resize-none h-24"
                  />
                  <button 
                    onClick={handleGenerateLevel}
                    disabled={loading || !prompt.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold shadow-lg transition flex items-center justify-center"
                  >
                    {loading ? (
                      <span className="animate-pulse">Generating...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate & Play
                      </>
                    )}
                  </button>
                  {error && (
                    <div className="flex items-center text-red-400 text-xs mt-2">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {error}
                    </div>
                  )}
               </div>
            </div>
         </div>

         <div className="mt-12 text-center text-slate-600 text-sm">
           Built with React, Tailwind & Gemini 2.5 Flash
         </div>
       </div>
    </div>
  );
};

export default App;
