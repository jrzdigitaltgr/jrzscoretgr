import React, { useEffect } from "react";
import {
  Play,
  Square,
  RotateCcw,
  Unlock,
  Lock,
  Volume2,
  Clock,
  ArrowLeft,
  Maximize,
  Minimize,
  CheckCircle2,
  AlertTriangle,
  Users,
  Share2
} from "lucide-react";
import { playSoundByKey } from "../utils/audio";
import { ShareClientModal } from "./ShareClientModal";

interface TimerOperatorViewProps {
  timeRemaining: number;
  timeActual: number;
  isTimer1Running: boolean;
  isTimer2Running: boolean;
  isTimerRunning: boolean;
  timer1StartedAt: number;
  timer2StartedAt: number;
  timer1BaseRemaining: number;
  timer2BaseActual: number;
  durasiTampil: string;
  selectedCategory: string;
  selectedAge: string;
  gender: "PUTRA" | "PUTRI";
  activeCorner: "biru" | "merah" | "";
  namaAtlitBiru: string;
  kontingenBiru: string;
  namaAtlitMerah: string;
  kontingenMerah: string;
  partaiTanding: string;
  tahapPertandingan: string;
  namaEvent: string;
  tempatPelaksanaan?: string;
  waktuPelaksanaan?: string;
  isMatchUnlocked: boolean;
  judgesCount?: number;
  logs: Array<{ time: string; msg: string; type: "system" | "deduction" | "score" }>;
  formatTime: (seconds: number) => string;
  getDurasiSeconds: (dur: string) => number;
  saveSharedState: (updates: any) => void;
  onBack: () => void;
  isFs: boolean;
  toggleFullScreen: () => void;
}

export default function TimerOperatorView({
  timeRemaining,
  timeActual,
  isTimer1Running,
  isTimer2Running,
  isTimerRunning,
  timer1StartedAt,
  timer2StartedAt,
  timer1BaseRemaining,
  timer2BaseActual,
  durasiTampil,
  selectedCategory,
  selectedAge,
  gender,
  activeCorner,
  namaAtlitBiru,
  kontingenBiru,
  namaAtlitMerah,
  kontingenMerah,
  partaiTanding,
  tahapPertandingan,
  namaEvent,
  isMatchUnlocked,
  judgesCount = 10,
  logs,
  formatTime,
  getDurasiSeconds,
  saveSharedState,
  onBack,
  isFs,
  toggleFullScreen
}: TimerOperatorViewProps) {
  const [showShareModal, setShowShareModal] = React.useState(false);
  const targetLimitSecs = getDurasiSeconds(durasiTampil);
  const minToleranceSecs = Math.max(0, targetLimitSecs - 5);
  const maxToleranceSecs = targetLimitSecs + 5;

  // Clean partai string so "PARTAI" is written exactly once without repetition
  const cleanedPartai = (partaiTanding || "1").toUpperCase().replace(/^PARTAI\s*/i, "").trim();

  // Determine current timing status relative to tolerance IPSI 2026
  let timingZone: "before" | "safe" | "over" = "before";
  let secondsDeviation = 0;
  if (timeActual >= minToleranceSecs && timeActual <= maxToleranceSecs) {
    timingZone = "safe";
    secondsDeviation = 0;
  } else if (timeActual > maxToleranceSecs) {
    timingZone = "over";
    secondsDeviation = timeActual - maxToleranceSecs;
  } else if (timeActual > 0) {
    timingZone = "before";
    secondsDeviation = minToleranceSecs - timeActual;
  }

  // Active athlete display
  const currentCorner = activeCorner === "merah" ? "merah" : "biru";
  const athleteName = currentCorner === "merah" ? (namaAtlitMerah || "SUDUT MERAH") : (namaAtlitBiru || "SUDUT BIRU");
  const athleteContingent = currentCorner === "merah" ? (kontingenMerah || "KONTINGEN MERAH") : (kontingenBiru || "KONTINGEN BIRU");

  // Format category display according to official IPSI 2026 & PERSILAT
  const categoryDisplay =
    selectedCategory === "tunggal" ? "JURUS TUNGGAL BAKU" :
    selectedCategory === "ganda" ? "JURUS GANDA" :
    selectedCategory === "regu" ? "JURUS REGU BAKU" :
    selectedCategory === "solo_kreatif" ? "SENI SOLO KREATIF" : "JURUS TUNGGAL BAKU";

  // --- ACTIONS (Gong automatically sounds on play and stop!) ---

  const handleToggleTimer = () => {
    const corner = activeCorner || "biru";
    const cornerName = corner === "biru" ? "Sudut Biru" : "Sudut Merah";

    // Play traditional Pencak Silat gong strike automatically on every play/stop
    playSoundByKey("gong");

    if (isTimer2Running) {
      // STOP TIMER
      const now = Date.now();
      const elapsedSec2 = Math.floor(Math.max(0, now - timer2StartedAt) / 1000);
      const finalActual = timer2BaseActual + elapsedSec2;
      const updatedLogs = [
        { time: formatTime(timeRemaining), msg: `Operator Timer: STOP Timer Penampil ${cornerName} (GONG BERBUNYI)`, type: "system" as const },
        ...logs
      ];
      saveSharedState({
        isTimer1Running: true,
        isTimer2Running: false,
        isTimerRunning: false,
        timer2StartedAt: 0,
        timer2BaseActual: finalActual,
        timeActual: finalActual,
        logs: updatedLogs
      });
    } else {
      // MULAI / PLAY TIMER
      const now = Date.now();
      const t1Started = isTimer1Running ? timer1StartedAt : now;
      const t1Base = isTimer1Running ? timer1BaseRemaining : timeRemaining;
      const updatedLogs = [
        { time: formatTime(timeRemaining), msg: `Operator Timer: MULAI (PLAY) Pertandingan ${cornerName} (GONG BERBUNYI)`, type: "system" as const },
        ...logs
      ];
      saveSharedState({
        activeCorner: corner,
        isTimer1Running: true,
        isTimer2Running: true,
        isTimerRunning: true,
        timer1StartedAt: t1Started,
        timer1BaseRemaining: t1Base,
        timer2StartedAt: now,
        timer2BaseActual: timeActual,
        timeRemaining: timeRemaining,
        timeActual: timeActual,
        logs: updatedLogs
      });
    }
  };

  const handleResetWaktu = () => {
    playSoundByKey("warning_beep");
    const updatedLogs = [
      { time: "00:00", msg: "Operator Timer: Reset seluruh waktu penampil (Timer 1 & Timer 2) ke 00:00", type: "system" as const },
      ...logs
    ];
    saveSharedState({
      isTimer1Running: false,
      isTimer2Running: false,
      isTimerRunning: false,
      timeRemaining: 0,
      timeActual: 0,
      timer1StartedAt: 0,
      timer1BaseRemaining: 0,
      timer2StartedAt: 0,
      timer2BaseActual: 0,
      logs: updatedLogs
    });
  };

  const handleToggleUnlock = () => {
    const nextState = !isMatchUnlocked;
    playSoundByKey(nextState ? "success_chime" : "warning_beep");
    const updatedLogs = [
      { time: formatTime(timeRemaining), msg: `Operator Timer: ${nextState ? "Buka Kunci Juri & Dewan" : "Reset & Kunci Juri & Dewan"}`, type: "system" as const },
      ...logs
    ];
    saveSharedState({
      isMatchUnlocked: nextState,
      logs: updatedLogs
    });
  };

  const handleSwitchCorner = (corner: "biru" | "merah") => {
    playSoundByKey("short_beep");
    saveSharedState({ activeCorner: corner });
  };

  const handleSetDurasi = (dur: string) => {
    playSoundByKey("short_beep");
    saveSharedState({ durasiTampil: dur });
  };

  const handleManualTimeAdjust = (deltaSec: number) => {
    playSoundByKey("short_beep");
    const newActual = Math.max(0, timeActual + deltaSec);
    const newRemaining = Math.max(0, timeRemaining + deltaSec);
    saveSharedState({
      timeActual: newActual,
      timeRemaining: newRemaining,
      timer2BaseActual: newActual,
      timer1BaseRemaining: newRemaining
    });
  };

  // Keyboard shortcut listener (Kept 100% active in background without needing visible UI button)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        handleToggleTimer();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleResetWaktu();
      } else if (e.key === "k" || e.key === "K" || e.key === "u" || e.key === "U") {
        e.preventDefault();
        handleToggleUnlock();
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        playSoundByKey("buzzer");
      } else if (e.key === "1") {
        e.preventDefault();
        handleSwitchCorner("biru");
      } else if (e.key === "2") {
        e.preventDefault();
        handleSwitchCorner("merah");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isTimer2Running,
    isTimer1Running,
    timer1StartedAt,
    timer2StartedAt,
    timer1BaseRemaining,
    timer2BaseActual,
    timeRemaining,
    timeActual,
    activeCorner,
    isMatchUnlocked,
    logs
  ]);

  return (
    <div 
      id="timer-operator-panel" 
      className="h-screen max-h-screen w-screen bg-[#02050e] text-white flex flex-col font-sans select-none relative overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* HOVER-TRIGGERED TOP-RIGHT CONTROLS (Hanya muncul saat mouse diarahkan ke sudut kanan atas) */}
      <div className="fixed top-0 right-0 z-50 p-2 sm:p-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto">
        <div className="bg-[#070e1c]/95 border-2 border-[#1c3258] backdrop-blur-md rounded-2xl p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex items-center gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="bg-[#0b172a] hover:bg-[#162a4a] text-emerald-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-emerald-500/40 hover:border-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Bagikan Tautan & QR Code ke Klien / Juri"
          >
            <Share2 size={14} />
            <span>Bagikan</span>
          </button>
          <button
            id="btn-timer-back"
            onClick={() => { playSoundByKey("short_beep"); onBack(); }}
            className="bg-[#0b172a] hover:bg-[#162a4a] text-cyan-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Kembali ke Menu Utama"
          >
            <ArrowLeft size={14} />
            <span>Kembali</span>
          </button>
          <button
            id="btn-timer-fullscreen"
            onClick={toggleFullScreen}
            className="bg-[#0b172a] hover:bg-[#162a4a] text-amber-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-amber-500/40 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Toggle Full Screen"
          >
            {isFs ? <Minimize size={14} /> : <Maximize size={14} />}
            <span>{isFs ? "Normal" : "Full Screen"}</span>
          </button>
        </div>
      </div>

      {/* 1. TOP HEADER (CLEAN & COMPACT) */}
      <header className="bg-[#050c18] border-b border-[#162540] px-3 sm:px-5 py-2 flex items-center justify-between gap-3 z-20 shadow-md shrink-0">
        
        {/* Left: Clean Event Title */}
        <div className="flex items-center min-w-0">
          <h1 className="text-xs sm:text-sm md:text-base font-black text-white uppercase tracking-wider font-mono truncate max-w-sm sm:max-w-md lg:max-w-2xl">
            {namaEvent || "KEJUARAAN NASIONAL PENCAK SILAT IPSI"}
          </h1>
        </div>

        {/* Center/Right: Match Context Chips (Single 'PARTAI' display) */}
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <span className="bg-[#091528] border border-cyan-500/40 text-cyan-300 px-2.5 py-0.5 rounded-full font-bold uppercase">
            PARTAI {cleanedPartai || "1"} / {tahapPertandingan || "FINAL"}
          </span>
          <span className="bg-[#121b2d] border border-zinc-700 text-zinc-300 px-2.5 py-0.5 rounded-full font-bold uppercase hidden sm:inline">
            {categoryDisplay}
          </span>
          <span className="bg-[#1c1306] border border-amber-500/40 text-amber-300 px-2.5 py-0.5 rounded-full font-bold uppercase hidden md:inline">
            {gender} • {selectedAge}
          </span>
        </div>
      </header>

      {/* 2. SUB-HEADER: SUDUT AKTIF & STATUS BAR (COMPACT) */}
      <div className="bg-[#040914] border-b border-[#162540] px-3 sm:px-5 py-1.5 flex items-center justify-between gap-2 z-10 shrink-0">
        
        {/* Sudut Switcher Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mr-0.5">
            SUDUT:
          </span>
          <button
            onClick={() => handleSwitchCorner("biru")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-black tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeCorner === "biru" || activeCorner === ""
                ? "bg-[#1e61ff] border-blue-400 text-white shadow-[0_0_10px_rgba(30,97,255,0.4)]"
                : "bg-[#071328] hover:bg-[#0c1f40] border-[#162540] text-zinc-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-300" />
            <span>BIRU</span>
          </button>

          <button
            onClick={() => handleSwitchCorner("merah")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-black tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeCorner === "merah"
                ? "bg-[#e11d48] border-rose-400 text-white shadow-[0_0_10px_rgba(225,29,72,0.4)]"
                : "bg-[#1c080d] hover:bg-[#2c0e16] border-[#162540] text-zinc-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-300" />
            <span>MERAH</span>
          </button>
        </div>

        {/* Current Active Athlete Banner */}
        <div className="flex items-center gap-2 truncate">
          <div className="text-right truncate">
            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider block ${
              currentCorner === "merah" ? "text-rose-400" : "text-cyan-400"
            }`}>
              {athleteContingent}
            </span>
            <h2 className="text-xs sm:text-sm font-mono font-black text-white uppercase tracking-wide leading-none truncate max-w-xs sm:max-w-md">
              {athleteName}
            </h2>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            currentCorner === "merah" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" : "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          }`} />
        </div>

      </div>

      {/* 3. MAIN ARENA TIMER CONSOLE (FITS PERFECTLY IN VIEWPORT) */}
      <main className="flex-1 px-3 sm:px-6 py-2 sm:py-3 flex flex-col justify-between max-w-7xl mx-auto w-full gap-2 sm:gap-3 min-h-0 overflow-hidden z-10">
        
        {/* TOP STATUS STRIP */}
        <div className="flex items-center justify-between bg-[#070e1c] border border-[#162540] px-3 py-1.5 rounded-xl text-xs font-mono shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              isTimer2Running ? "bg-emerald-400 animate-ping" : timeActual >= targetLimitSecs ? "bg-rose-500" : "bg-amber-400"
            }`} />
            <span className="font-black uppercase tracking-wider text-[11px] sm:text-xs">
              STATUS: {
                isTimer2Running 
                  ? "SEDANG BERJALAN (PLAY) • GONG AKTIF" 
                  : timeActual >= targetLimitSecs 
                    ? "WAKTU HABIS (SELESAI)" 
                    : timeActual > 0 
                      ? "DIHENTIKAN SEMENTARA (PAUSED)" 
                      : "STANDBY SIAP TAMPIL"
              }
            </span>
          </div>

          {/* Kunci Status Badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[10px] hidden sm:inline">KUNCI JURI &amp; DEWAN:</span>
            <span className={`px-2 py-0.5 rounded font-black text-[9px] tracking-wider uppercase border flex items-center gap-1 ${
              isMatchUnlocked 
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 animate-pulse" 
                : "bg-rose-950/80 border-rose-500 text-rose-300"
            }`}>
              {isMatchUnlocked ? <Unlock size={10} /> : <Lock size={10} />}
              {isMatchUnlocked ? "TERBUKA" : "TERKUNCI"}
            </span>
          </div>
        </div>

        {/* DUAL TIMERS DISPLAY (MAXIMIZED VISUAL CLOCKS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3.5 flex-1 min-h-0 items-stretch">
          
          {/* CARD 1: TIMER 1 (KETEPATAN / TARGET WAKTU ARENA) */}
          <div className="bg-gradient-to-b from-[#08152c] to-[#040a16] border-2 border-[#162540] rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-cyan-500/50 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
            
            {/* Top Info */}
            <div className="flex justify-between items-center border-b border-[#162540] pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  TIMER 1
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase">
                  WAKTU TAMPIL ARENA (T1)
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-400">
                BATAS: {durasiTampil} ({targetLimitSecs}s)
              </span>
            </div>

            {/* Giant Clock Numbers */}
            <div className="my-auto py-2 text-center flex flex-col items-center justify-center">
              <div className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-mono font-black text-cyan-300 tracking-tight leading-none drop-shadow-[0_0_25px_rgba(6,182,212,0.4)] select-none">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-[10px] font-mono font-bold text-cyan-500/80 mt-1 uppercase tracking-widest">
                {timeRemaining} DETIK BERJALAN
              </div>
            </div>

            {/* Progress Bar towards Target Time */}
            <div className="space-y-1 pt-1.5 border-t border-[#162540]">
              <div className="flex justify-between text-[9px] font-mono font-bold text-zinc-400">
                <span>00:00</span>
                <span>TARGET RESMI ({durasiTampil})</span>
              </div>
              <div className="w-full bg-[#030712] h-2 rounded-full overflow-hidden border border-[#162540]">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  style={{ width: `${Math.min(100, (timeRemaining / targetLimitSecs) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* CARD 2: TIMER 2 (WAKTU NYATA PENAMPIL / SEBENARNYA) */}
          <div className="bg-gradient-to-b from-[#1c1404] to-[#0a0702] border-2 border-amber-500/60 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            
            {/* Top Info */}
            <div className="flex justify-between items-center border-b border-[#2d2208] pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="bg-amber-400 text-black text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  TIMER 2
                </span>
                <span className="text-[11px] font-mono font-black text-amber-300 uppercase tracking-wider">
                  WAKTU NYATA PENAMPIL (T2)
                </span>
              </div>
              <div className="flex items-center gap-1">
                {isTimer2Running && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                  {isTimer2Running ? "RUNNING" : "STOPPED"}
                </span>
              </div>
            </div>

            {/* Giant Clock Numbers */}
            <div className="my-auto py-2 text-center flex flex-col items-center justify-center">
              <div className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-mono font-black text-[#ffea00] tracking-tight leading-none drop-shadow-[0_0_30px_rgba(255,234,0,0.5)] select-none">
                {formatTime(timeActual)}
              </div>
              <div className="text-[10px] font-mono font-bold text-amber-400/80 mt-1 uppercase tracking-widest">
                {timeActual} DETIK TOTAL WAKTU AKTUAL
              </div>
            </div>

            {/* Tolerance Status Strip */}
            <div className="pt-1.5 border-t border-[#2d2208]">
              {timingZone === "safe" ? (
                <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 py-1 px-2 rounded-lg text-center font-mono font-bold text-[10px] flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span className="truncate">BEBAS DENDA (IPSI 2026: {formatTime(minToleranceSecs)} - {formatTime(maxToleranceSecs)})</span>
                </div>
              ) : timingZone === "over" ? (
                <div className="bg-rose-950/80 border border-rose-500 text-rose-300 py-1 px-2 rounded-lg text-center font-mono font-bold text-[10px] flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                  <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                  <span className="truncate">LEBIH {secondsDeviation}s DARI TOLERANSI (-{(secondsDeviation * 0.01).toFixed(2)})</span>
                </div>
              ) : timeActual > 0 ? (
                <div className="bg-[#1a1407] border border-amber-600/60 text-amber-300 py-1 px-2 rounded-lg text-center font-mono font-bold text-[10px] flex items-center justify-center gap-1.5">
                  <Clock size={13} className="text-amber-400 shrink-0" />
                  <span className="truncate">DI BAWAH TOLERANSI MINIMAL ({formatTime(minToleranceSecs)})</span>
                </div>
              ) : (
                <div className="bg-[#121212] border border-[#2d2208] text-zinc-400 py-1 px-2 rounded-lg text-center font-mono font-bold text-[10px]">
                  STANDBY SIAP PENAMPILAN
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 4. THREE HERO TACTICAL BUTTONS (CLEAN, TALL & WITHOUT SUBTITLES) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 shrink-0">
          
          {/* BUTTON 1: MULAI (PLAY) / STOP TIMER */}
          <button
            id="btn-timekeeper-toggle"
            onClick={handleToggleTimer}
            className={`h-16 sm:h-20 lg:h-24 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-mono font-black uppercase tracking-wider transition-all duration-200 border-2 shadow-2xl active:scale-[0.98] cursor-pointer ${
              isTimer2Running
                ? "bg-rose-600 hover:bg-rose-500 border-rose-400 text-white shadow-[0_0_25px_rgba(225,29,72,0.6)] animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)]"
            }`}
          >
            {isTimer2Running ? (
              <>
                <Square size={24} className="fill-white" />
                <span className="text-base sm:text-lg lg:text-xl">STOP TIMER</span>
              </>
            ) : (
              <>
                <Play size={24} className="fill-white" />
                <span className="text-base sm:text-lg lg:text-xl">MULAI (PLAY)</span>
              </>
            )}
          </button>

          {/* BUTTON 2: RESET WAKTU (00:00) */}
          <button
            id="btn-timekeeper-reset"
            onClick={handleResetWaktu}
            className="h-16 sm:h-20 lg:h-24 px-4 bg-[#0b172a] hover:bg-[#122442] border-2 border-amber-500/70 hover:border-amber-400 text-amber-300 hover:text-white rounded-2xl flex items-center justify-center gap-2.5 font-mono font-black uppercase tracking-wider transition-all shadow-xl active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw size={22} className="text-amber-400" />
            <span className="text-base sm:text-lg lg:text-xl">RESET WAKTU</span>
          </button>

          {/* BUTTON 3: BUKA KUNCI / KUNCI JURI & DEWAN */}
          <button
            id="btn-timekeeper-lock"
            onClick={handleToggleUnlock}
            className={`h-16 sm:h-20 lg:h-24 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-mono font-black uppercase tracking-wider transition-all border-2 shadow-xl active:scale-[0.98] cursor-pointer ${
              isMatchUnlocked
                ? "bg-[#18080c] hover:bg-[#280c14] border-rose-500 text-rose-300 shadow-rose-950/50"
                : "bg-[#06241a] hover:bg-[#0a3828] border-emerald-400 text-emerald-300 shadow-emerald-950/50"
            }`}
          >
            {isMatchUnlocked ? (
              <>
                <Lock size={22} className="text-rose-400" />
                <span className="text-base sm:text-lg lg:text-xl">KUNCI JURI &amp; DEWAN</span>
              </>
            ) : (
              <>
                <Unlock size={22} className="text-emerald-400" />
                <span className="text-base sm:text-lg lg:text-xl">BUKA KUNCI JURI</span>
              </>
            )}
          </button>

        </div>

        {/* 5. SECONDARY UTILITIES: PRESET DURASI, JUMLAH JURI, AUDIO ARENA & KALIBRASI */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-[#070e1c] border border-[#162540] p-2 rounded-xl shadow-md shrink-0">
          
          {/* Sub-col 1: Preset Durasi Tampil (3 Cols) */}
          <div className="md:col-span-4 lg:col-span-3 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Clock size={12} className="text-cyan-400" />
              DURASI:
            </span>
            <div className="flex items-center gap-1 w-full">
              {[
                { label: "03:00", val: "03:00" },
                { label: "02:00", val: "02:00" },
                { label: "01:30", val: "01:30" },
              ].map((p) => (
                <button
                  key={p.val}
                  onClick={() => handleSetDurasi(p.val)}
                  className={`flex-1 py-1 px-1 rounded-lg text-center font-mono font-bold text-[10px] border transition-all cursor-pointer ${
                    durasiTampil === p.val
                      ? "bg-cyan-500 text-black border-cyan-400 font-black shadow-sm"
                      : "bg-[#0b172a] hover:bg-[#122442] text-zinc-300 border-[#162540]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-col 2: JUMLAH JURI YANG AKAN DIGUNAKAN (4 Cols) */}
          <div className="md:col-span-5 lg:col-span-4 flex items-center gap-1.5 border-t md:border-t-0 md:border-l md:border-r border-[#162540] pt-1.5 md:pt-0 md:px-2">
            <span className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Users size={12} className="text-cyan-400" />
              JURI:
            </span>
            <div className="grid grid-cols-4 gap-1 w-full">
              {[4, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    playSoundByKey("short_beep");
                    saveSharedState({ judgesCount: num });
                  }}
                  className={`py-1 rounded-lg text-[10px] font-mono font-extrabold transition-all duration-200 cursor-pointer text-center border ${
                    judgesCount === num
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      : "bg-[#050b16] hover:bg-[#0c182c] text-zinc-400 border-[#162540]"
                  }`}
                >
                  {num} Juri
                </button>
              ))}
            </div>
          </div>

          {/* Sub-col 3: Audio Arena Horn (3 Cols) */}
          <div className="md:col-span-3 lg:col-span-3 flex items-center gap-1 border-t md:border-t-0 md:border-r border-[#162540] pt-1.5 md:pt-0 md:pr-2">
            <button
              onClick={() => {
                playSoundByKey("buzzer");
                const updatedLogs = [
                  { time: formatTime(timeRemaining), msg: "Operator Timer: MEMBUNYIKAN BUZZER ARENA", type: "system" as const },
                  ...logs
                ];
                saveSharedState({ logs: updatedLogs });
              }}
              className="w-full bg-[#24080e] hover:bg-[#3d0e19] border border-rose-500/70 text-rose-300 py-1 px-1.5 rounded-lg font-mono font-black text-[10px] uppercase flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <AlertTriangle size={11} className="text-rose-400" />
              <span>BUZZER</span>
            </button>
            <button
              onClick={() => {
                playSoundByKey("warning_beep");
                const updatedLogs = [
                  { time: formatTime(timeRemaining), msg: "Operator Timer: MEMBUNYIKAN PELUIT PERINGATAN", type: "system" as const },
                  ...logs
                ];
                saveSharedState({ logs: updatedLogs });
              }}
              className="w-full bg-[#1c1808] hover:bg-[#2e260c] border border-yellow-500/70 text-yellow-300 py-1 px-1.5 rounded-lg font-mono font-black text-[10px] uppercase flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Volume2 size={11} className="text-yellow-400" />
              <span>PELUIT</span>
            </button>
          </div>

          {/* Sub-col 4: Kalibrasi Manual Waktu (2 Cols) */}
          <div className="md:col-span-12 lg:col-span-2 flex items-center gap-1">
            <div className="grid grid-cols-4 gap-0.5 w-full">
              <button
                onClick={() => handleManualTimeAdjust(-5)}
                className="bg-[#0b172a] hover:bg-[#122442] border border-[#162540] text-rose-400 py-1 rounded font-mono font-bold text-[9px] transition-all cursor-pointer active:scale-95 text-center"
              >
                -5s
              </button>
              <button
                onClick={() => handleManualTimeAdjust(-1)}
                className="bg-[#0b172a] hover:bg-[#122442] border border-[#162540] text-rose-400 py-1 rounded font-mono font-bold text-[9px] transition-all cursor-pointer active:scale-95 text-center"
              >
                -1s
              </button>
              <button
                onClick={() => handleManualTimeAdjust(+1)}
                className="bg-[#0b172a] hover:bg-[#122442] border border-[#162540] text-emerald-400 py-1 rounded font-mono font-bold text-[9px] transition-all cursor-pointer active:scale-95 text-center"
              >
                +1s
              </button>
              <button
                onClick={() => handleManualTimeAdjust(+5)}
                className="bg-[#0b172a] hover:bg-[#122442] border border-[#162540] text-emerald-400 py-1 rounded font-mono font-bold text-[9px] transition-all cursor-pointer active:scale-95 text-center"
              >
                +5s
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER (COMPACT & SLIM) */}
      <footer className="bg-[#040813] border-t border-[#162540] px-4 py-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-500 z-10 shrink-0">
        <div>
          STANDAR ATURAN JURUS RESMI IPSI 2026 &amp; PERSILAT • TOLERANSI WAKTU 5 DETIK
        </div>
        <div className="flex items-center gap-3">
          <span className="text-cyan-400">GELANGGANG 1</span>
          <span>JRZ SCORE TGR • STANDAR RESMI IPSI 2026 &amp; PERSILAT</span>
        </div>
      </footer>

      {/* MODAL BAGIKAN KE KLIEN */}
      <ShareClientModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tournamentName={namaEvent}
      />
    </div>
  );
}
