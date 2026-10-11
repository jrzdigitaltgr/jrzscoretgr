import React, { useState } from "react";
import { MatchState } from "../types";
import { User, ShieldAlert, Wifi, Play, Pause, ArrowLeft, Maximize2 } from "lucide-react";

interface JuriInputViewProps {
  state: MatchState;
  juriNumber: number;
  onJuriClick: (juriIndex: number, corner: "blue" | "red", attackType: "pukulan" | "tendangan") => void;
  onBack: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onVoteVerification: (juriIndex: number, vote: "BIRU" | "MERAH" | "TIDAK SAH") => void;
}

export default function JuriInputView({ 
  state, 
  juriNumber,
  onJuriClick,
  onBack,
  onToggleFullscreen,
  isFullscreen,
  onVoteVerification
}: JuriInputViewProps) {

  // Quick feedback animations on click (brief state)
  const [clickedButton, setClickedButton] = useState<string | null>(null);

  const handlePress = (corner: "blue" | "red", type: "pukulan" | "tendangan") => {
    if (!juriNumber) return;
    if (state.isPanelsLocked) return; // ignore clicks if panels are locked
    if (!state.isTimerRunning) return; // ignore clicks if paused

    const key = `${corner}-${type}`;
    setClickedButton(key);
    setTimeout(() => setClickedButton(null), 180);

    onJuriClick(juriNumber, corner, type);
  };

  // If verification session is active, show the voting screen
  if (state.verification?.isActive) {
    const myVote = state.verification.juriVotes[`j${juriNumber}` as "j1" | "j2" | "j3"];
    
    // Count how many voted
    const { j1, j2, j3 } = state.verification.juriVotes;
    const votedCount = [j1, j2, j3].filter(v => v !== null).length;

    const handleVote = (vote: "BIRU" | "MERAH" | "TIDAK SAH") => {
      onVoteVerification(juriNumber, vote);
    };

    return (
      <div id="juri-verification-voting-screen" className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between font-sans select-none p-4">
        
        {/* Top Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 p-4 rounded-3xl flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="h-3.5 w-3.5 rounded-full bg-red-500 animate-ping absolute" />
            <div className="h-3.5 w-3.5 rounded-full bg-red-600 relative" />
            <span className="text-sm font-black tracking-widest text-red-500 uppercase font-mono">
              SESI VERIFIKASI DEWAN AKTIF
            </span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 rounded-2xl text-xs font-mono text-zinc-400">
            JURI {juriNumber} • ONLINE
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center my-6 max-w-4xl mx-auto w-full px-2">
          
          <div className="text-center mb-8">
            <span className="text-zinc-500 text-xs font-mono tracking-widest uppercase">Kategori Perkara</span>
            <h2 className="text-4xl md:text-5xl font-black text-amber-400 uppercase tracking-wider mt-1 filter drop-shadow-[0_2px_8px_rgba(234,179,8,0.2)]">
              {state.verification.category}
            </h2>
            <div className="h-1.5 w-24 bg-amber-400 mx-auto rounded-full mt-4" />
          </div>

          {!myVote ? (
            <div className="w-full flex flex-col gap-6">
              <div className="text-center mb-2">
                <p className="text-zinc-300 font-semibold text-lg">Silakan berikan keputusan penilaian Anda:</p>
                <p className="text-zinc-500 text-xs font-mono mt-1">Tap salah satu opsi di bawah untuk mengirim suara secara real-time</p>
              </div>

              {/* 3 Main Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                {/* SUDUT BIRU */}
                <button
                  onClick={() => handleVote("BIRU")}
                  className="bg-blue-950/45 hover:bg-blue-900/65 border-2 border-blue-600 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(37,99,235,0.15)] group h-48 cursor-pointer"
                >
                  <span className="text-5xl group-hover:scale-110 transition-transform">🔵</span>
                  <div className="text-center">
                    <span className="text-blue-400 text-xs font-mono font-bold tracking-widest block">SUDUT</span>
                    <span className="text-2xl font-black text-white uppercase tracking-tight">BIRU</span>
                  </div>
                </button>

                {/* SUDUT MERAH */}
                <button
                  onClick={() => handleVote("MERAH")}
                  className="bg-red-950/45 hover:bg-red-900/65 border-2 border-red-600 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(239,68,68,0.15)] group h-48 cursor-pointer"
                >
                  <span className="text-5xl group-hover:scale-110 transition-transform">🔴</span>
                  <div className="text-center">
                    <span className="text-red-400 text-xs font-mono font-bold tracking-widest block">SUDUT</span>
                    <span className="text-2xl font-black text-white uppercase tracking-tight">MERAH</span>
                  </div>
                </button>

                {/* TIDAK SAH */}
                <button
                  onClick={() => handleVote("TIDAK SAH")}
                  className="bg-zinc-900/60 hover:bg-zinc-800/80 border-2 border-zinc-700 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.3)] group h-48 cursor-pointer"
                >
                  <span className="text-5xl group-hover:scale-110 transition-transform">❌</span>
                  <div className="text-center">
                    <span className="text-zinc-400 text-xs font-mono font-bold tracking-widest block">KEPUTUSAN</span>
                    <span className="text-2xl font-black text-white uppercase tracking-tight">TIDAK SAH</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl flex flex-col items-center justify-center gap-6">
              <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl animate-bounce">
                ✓
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-400 uppercase tracking-wide">Suara Terkirim!</h3>
                <p className="text-zinc-400 text-sm mt-1">Anda telah memberikan pilihan keputusan:</p>
              </div>

              {/* Display choice badge */}
              <div className={`px-8 py-4 rounded-2xl border text-xl font-black uppercase tracking-widest ${
                myVote === "BIRU" 
                  ? "bg-blue-950/50 border-blue-600/80 text-blue-400" 
                  : myVote === "MERAH" 
                    ? "bg-red-950/50 border-red-600/80 text-red-400" 
                    : "bg-zinc-950/80 border-zinc-700 text-zinc-400"
              }`}>
                {myVote === "BIRU" ? "🔵 SUDUT BIRU" : myVote === "MERAH" ? "🔴 SUDUT MERAH" : "❌ TIDAK SAH"}
              </div>

              <div className="w-full bg-zinc-950 rounded-2xl p-4 border border-zinc-850 flex flex-col gap-2 mt-2">
                <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase block">Status Partisipasi Juri</span>
                <div className="flex items-center justify-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <span className="text-[11px] font-mono text-zinc-400">PROGRESS:</span>
                    <span className="font-black text-amber-400">{votedCount} / 3 Juri</span>
                  </div>
                  <div className="h-3 w-[1px] bg-zinc-800" />
                  <span className="text-[10px] text-zinc-400 font-medium animate-pulse">Menunggu konsensus juri lengkap...</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-zinc-900 border-t border-zinc-805 px-4 py-3 rounded-2xl text-center text-[10px] text-zinc-500 font-mono tracking-wide">
          JRZ SCORE TGR • SISTEM SKORING RESMI IPSI 2026 &amp; PERSILAT
        </div>
      </div>
    );
  }

  const { athleteBlue, athleteRed, isTimerRunning, timeRemaining, round } = state;

  return (
    <div id="juri-input-screen" className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between font-sans select-none">
      
      {/* Top Action Bar: Kembali (Kiri) & Full Screen (Kanan) */}
      <div className="flex justify-between items-center p-4 pb-1 bg-zinc-950 border-b border-zinc-900">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all hover:scale-105 active:scale-95"
          title="Kembali ke Menu Utama"
        >
          <ArrowLeft size={14} /> Kembali
        </button>
        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all hover:scale-105 active:scale-95"
          title="Toggle Layar Penuh"
        >
          <Maximize2 size={14} /> {isFullscreen ? "Layar Normal" : "Layar Penuh"}
        </button>
      </div>

      {/* HEADER BAR */}
      <div className="bg-zinc-900 border-b border-zinc-805 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black tracking-widest text-amber-400 uppercase font-mono">
            JURI {juriNumber} AKTIF
          </span>
        </div>

        {/* Mini status indicator */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-950 border border-zinc-850 px-3 py-1 rounded-xl text-[10px] font-mono flex items-center gap-1.5 text-zinc-400">
            <Wifi size={12} className="text-emerald-400" />
            CONNECTED
          </div>
          <button 
            onClick={onBack}
            className="text-[10px] bg-red-950/40 border border-red-900/30 text-red-400 font-bold px-3 py-1 rounded-xl hover:bg-red-900 hover:text-white transition-all"
          >
            Ubah Juri
          </button>
        </div>
      </div>

      {/* ATHLETES & TIME METRICS REFERENCE */}
      <div className="bg-zinc-900/40 border-b border-zinc-900/80 px-4 py-3 flex justify-between items-center text-center gap-4">
        {/* Blue athlete */}
        <div className="w-1/3 text-left">
          <span className="text-[9px] text-blue-400 font-bold block uppercase">Sudut Biru</span>
          <span className="text-xs font-black uppercase text-zinc-200 line-clamp-1">{athleteBlue.name || "BIRU"}</span>
        </div>

        {/* Timer reference */}
        <div className="flex items-center gap-3 bg-zinc-950/80 px-4 py-1.5 rounded-2xl border border-zinc-850/80">
          <div className="text-left">
            <span className="text-[8px] text-zinc-500 font-mono block">BABAK</span>
            <span className="text-sm font-black font-mono text-zinc-300 leading-none">{round}</span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div>
            <span className="text-[8px] text-zinc-500 font-mono block">SISA WAKTU</span>
            <span className={`text-base font-black font-mono leading-none ${
              isTimerRunning ? "text-teal-400 animate-pulse" : "text-zinc-500"
            }`}>
              {Math.floor(timeRemaining / 60).toString().padStart(2, "0")}:{
              (timeRemaining % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Red athlete */}
        <div className="w-1/3 text-right">
          <span className="text-[9px] text-red-400 font-bold block uppercase">Sudut Merah</span>
          <span className="text-xs font-black uppercase text-zinc-200 line-clamp-1">{athleteRed.name || "MERAH"}</span>
        </div>
      </div>

      {/* TIMER PAUSED REJECTION ALERT OVERLAY */}
      {state.isPanelsLocked ? (
        <div className="bg-red-500/10 border-b border-red-500/20 py-2.5 px-4 text-center text-red-400 flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
          <ShieldAlert size={14} className="shrink-0 animate-bounce" />
          Panel Juri TERKUNCI oleh Sekretaris. Silakan menunggu dibuka kunci!
        </div>
      ) : !isTimerRunning ? (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center text-amber-400 flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
          <ShieldAlert size={14} className="shrink-0 animate-bounce" />
          Waktu di-PAUSE oleh Dewan. Input juri ditolak sementara sampai waktu berjalan kembali!
        </div>
      ) : null}

      {/* MEGA BUTTONS MATRIX (BIRU BARAT VS MERAH TIMUR) */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 items-stretch select-none">
        
        {/* SUDUT BIRU PAD (LEFT) */}
        <div className={`flex flex-col gap-4 p-3 rounded-3xl border transition-all ${
          isTimerRunning && !state.isPanelsLocked
            ? "bg-blue-950/20 border-blue-600/30 text-white" 
            : "bg-zinc-900/10 border-zinc-900 text-zinc-500 opacity-30 pointer-events-none"
        }`}>
          <span className="text-xs font-black uppercase tracking-wider text-center text-blue-400">INPUT BIRU</span>
          
          {/* Punch blue */}
          <button
            id="juri-click-blue-pukulan"
            disabled={!isTimerRunning || state.isPanelsLocked}
            onClick={() => handlePress("blue", "pukulan")}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center gap-1 font-black uppercase transition-all select-none border-b-8 ${
              clickedButton === "blue-pukulan"
                ? "bg-blue-600 border-blue-900 scale-95"
                : "bg-blue-700/80 hover:bg-blue-700 active:scale-98 border-blue-900 text-white"
            }`}
          >
            <span className="text-2xl md:text-3xl">👊</span>
            <span className="text-sm md:text-base tracking-widest mt-1">PUKULAN</span>
            <span className="text-[11px] font-mono text-blue-200 tracking-wider">NILAI +1 POIN</span>
          </button>

          {/* Kick blue */}
          <button
            id="juri-click-blue-tendangan"
            disabled={!isTimerRunning || state.isPanelsLocked}
            onClick={() => handlePress("blue", "tendangan")}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center gap-1 font-black uppercase transition-all select-none border-b-8 ${
              clickedButton === "blue-tendangan"
                ? "bg-blue-600 border-blue-900 scale-95"
                : "bg-blue-800/85 hover:bg-blue-800 active:scale-98 border-blue-950 text-white"
            }`}
          >
            <span className="text-2xl md:text-3xl">🦵</span>
            <span className="text-sm md:text-base tracking-widest mt-1">TENDANGAN</span>
            <span className="text-[11px] font-mono text-blue-200 tracking-wider">NILAI +2 POIN</span>
          </button>
        </div>

        {/* SUDUT MERAH PAD (RIGHT) */}
        <div className={`flex flex-col gap-4 p-3 rounded-3xl border transition-all ${
          isTimerRunning && !state.isPanelsLocked
            ? "bg-red-950/20 border-red-600/30 text-white" 
            : "bg-zinc-900/10 border-zinc-900 text-zinc-500 opacity-30 pointer-events-none"
        }`}>
          <span className="text-xs font-black uppercase tracking-wider text-center text-red-400">INPUT MERAH</span>

          {/* Punch red */}
          <button
            id="juri-click-red-pukulan"
            disabled={!isTimerRunning || state.isPanelsLocked}
            onClick={() => handlePress("red", "pukulan")}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center gap-1 font-black uppercase transition-all select-none border-b-8 ${
              clickedButton === "red-pukulan"
                ? "bg-red-600 border-red-900 scale-95"
                : "bg-red-700/80 hover:bg-red-700 active:scale-98 border-red-900 text-white"
            }`}
          >
            <span className="text-2xl md:text-3xl">👊</span>
            <span className="text-sm md:text-base tracking-widest mt-1">PUKULAN</span>
            <span className="text-[11px] font-mono text-red-200 tracking-wider">NILAI +1 POIN</span>
          </button>

          {/* Kick red */}
          <button
            id="juri-click-red-tendangan"
            disabled={!isTimerRunning || state.isPanelsLocked}
            onClick={() => handlePress("red", "tendangan")}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center gap-1 font-black uppercase transition-all select-none border-b-8 ${
              clickedButton === "red-tendangan"
                ? "bg-red-600 border-red-900 scale-95"
                : "bg-red-800/85 hover:bg-red-800 active:scale-98 border-red-950 text-white"
            }`}
          >
            <span className="text-2xl md:text-3xl">🦵</span>
            <span className="text-sm md:text-base tracking-widest mt-1">TENDANGAN</span>
            <span className="text-[11px] font-mono text-red-200 tracking-wider">NILAI +2 POIN</span>
          </button>
        </div>

      </div>

      {/* BRIEF HELP BAR */}
      <div className="bg-zinc-900 border-t border-zinc-805 px-4 py-2 text-center text-[10px] text-zinc-500 font-mono tracking-wide">
        JRZ SCORE TGR • SISTEM SKORING RESMI IPSI 2026 &amp; PERSILAT
      </div>

    </div>
  );
}
