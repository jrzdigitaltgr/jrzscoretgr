import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs md:text-sm'
        }`}
        title="Pasang Aplikasi (Bisa Dibuka Tanpa Internet)"
      >
        <Download size={14} className="stroke-[2.5]" />
        <span>Install App (100% Offline)</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs'
          }`}
          title="Pasang di iOS / iPad"
        >
          <Smartphone size={14} />
          <span>Install di iPad / iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#0b172a] to-[#040914] border border-cyan-500/40 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#162540]">
                <h3 className="text-base font-black uppercase text-cyan-300 font-mono flex items-center gap-2">
                  <Smartphone size={18} className="text-cyan-400" />
                  Pasang di iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-zinc-300 leading-relaxed font-sans">
                <div className="flex items-start gap-2.5 bg-[#050e1f] p-3 rounded-xl border border-cyan-900/50">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0">1</span>
                  <p>Tekan tombol <strong>Share / Bagikan</strong> (kotak panah ke atas) pada bilah bawah browser Safari.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-[#050e1f] p-3 rounded-xl border border-cyan-900/50">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0">2</span>
                  <p>Gulir menu dan pilih <strong>"Add to Home Screen" (Tambah ke Layar Utama)</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-[#050e1f] p-3 rounded-xl border border-cyan-900/50">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0">3</span>
                  <p>Buka ikon <strong>JRZ Score TGR</strong> langsung dari layar depan perangkat tanpa perlu internet.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-black uppercase text-slate-950 tracking-wider hover:brightness-110"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
