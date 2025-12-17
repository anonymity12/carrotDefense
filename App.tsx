
import React, { useState } from 'react';
import Game from './components/Game';
import { GameLevel } from './types';
import { DEFAULT_LEVEL_PATH, DEFAULT_MOBILE_LEVEL_PATH, NANHU_LEVEL_PATH, NANHU_MOBILE_LEVEL_PATH, DEFAULT_WAVES, GRID_HEIGHT, GRID_WIDTH, MOBILE_GRID_HEIGHT, MOBILE_GRID_WIDTH } from './constants';
import { Siren, ArrowRight, MapPin, Building2 } from 'lucide-react';

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
  waves: DEFAULT_WAVES, // 可以复用波次配置，或者定义新的
  startingMoney: 500
});

const App: React.FC = () => {
  const [level, setLevel] = useState<GameLevel | null>(null);
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

  const handleStartChuanzang = () => {
    setLevel(getChuanzangLevel(isMobile));
  };

  const handleStartNanhu = () => {
    setLevel(getNanhuLevel(isMobile));
  };


  if (level) {
    return (
      <div className={`min-h-screen bg-slate-900 flex ${isMobile ? 'items-start' : 'items-center'} justify-center relative overflow-hidden ${
        isMobile ? 'p-0' : 'p-4'
      }`}>
        {/* Background cityscape */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black"></div>
        <div className="relative z-10 w-full">
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
      isMobile ? 'px-2 py-2' : 'px-6'
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
              摩法交通 <span className="text-blue-500">卫士</span>
            </h1>
            <p className={`text-slate-400 max-w-xl mx-auto ${
              isMobile ? 'text-sm px-2' : 'text-xl'
            }`}>
              部署千军万马。阻止飙车,炸街,无证人员穿越 <span className="text-yellow-400 font-bold">川藏立交</span>。
            </p>
         </div>

         <div className={`grid gap-6 ${
           isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
         }`}>
            {/* Campaign Card: Chuanzang */}
            <div className={`group relative bg-slate-900 border border-slate-700 hover:border-blue-500 rounded-xl transition-all cursor-pointer overflow-hidden active:scale-95 ${
              isMobile ? 'p-4' : 'p-8'
            }`} onClick={handleStartChuanzang}>
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
                 }`}>川藏立交</h3>
                 <p className={`text-slate-400 ${
                   isMobile ? 'text-xs' : 'text-sm'
                 }`}>
                   在成都西部主要立交桥完成队伍部署!预计交通流量大,请着重检查头盔和驾照。
                 </p>
               </div>
            </div>

            {/* Campaign Card: Nanhu */}
            <div className={`group relative bg-slate-900 border border-slate-700 hover:border-purple-500 rounded-xl transition-all cursor-pointer overflow-hidden active:scale-95 ${
              isMobile ? 'p-4' : 'p-8'
            }`} onClick={handleStartNanhu}>
               <div className="absolute inset-0 bg-purple-600/5 group-hover:bg-purple-600/10 transition"></div>
               <div className="relative z-10">
                 <div className={`flex justify-between items-start ${
                   isMobile ? 'mb-3' : 'mb-6'
                 }`}>
                    <div className={`bg-slate-800 rounded-lg border border-slate-600 group-hover:border-purple-500/50 transition ${
                      isMobile ? 'p-2' : 'p-3'
                    }`}>
                      <Building2 className={`text-purple-400 ${
                        isMobile ? 'w-5 h-5' : 'w-6 h-6'
                      }`} />
                    </div>
                    <ArrowRight className={`text-slate-500 group-hover:text-white transition ${
                      isMobile ? 'w-4 h-4' : 'w-5 h-5'
                    }`} />
                 </div>
                 <h3 className={`font-bold text-white ${
                   isMobile ? 'text-lg mb-1' : 'text-2xl mb-2'
                 }`}>南湖立交</h3>
                 <p className={`text-slate-400 ${
                   isMobile ? 'text-xs' : 'text-sm'
                 }`}>
                   城南重要交通枢纽。夜间飙车族活动频繁。需要加强巡逻和拦截。
                 </p>
               </div>
            </div>
         </div>

         <div className={`text-center text-slate-700 uppercase tracking-widest ${
           isMobile 
             ? 'mt-8 text-[10px] px-2' 
             : 'mt-16 text-xs'
         }`}>
           城市交通控制系统 v2.5{!isMobile && ' • 仅限授权人员'}
         </div>
       </div>
    </div>
  );
};

export default App;
