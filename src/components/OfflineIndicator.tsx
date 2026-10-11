import React from 'react';
import { useOnlineStatus } from '../utils/useOnlineStatus';
import { WifiOff, ShieldCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className="fixed bottom-3 right-3 z-40 flex items-center gap-2 pointer-events-none">
      {!isOnline ? (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md border border-amber-300 text-slate-950 font-black px-3 py-1.5 text-xs shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse">
          <WifiOff size={14} className="stroke-[2.5]" />
          <span>MODE 100% OFFLINE • DATA TERSIMPAN LOKAL</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 rounded-xl bg-[#061226]/80 backdrop-blur-md border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold px-2.5 py-1 shadow-md opacity-75 hover:opacity-100 transition-opacity">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>JRZ SCORE TGR • SIAP OFFLINE</span>
        </div>
      )}
    </div>
  );
};
