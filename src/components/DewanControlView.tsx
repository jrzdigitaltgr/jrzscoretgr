import React, { useState, useEffect } from "react";
import { MatchState, Athlete } from "../types";
import VisualSummaryModal from "./VisualSummaryModal";
import { ShareClientModal } from "./ShareClientModal";
const logoDisco = "/jrzscoreutama.png";
import { 
  Play, Pause, RotateCcw, Plus, Minus, Settings, 
  Trash2, Trophy, HelpCircle, CornerDownLeft, AlertCircle,
  ArrowLeft, Maximize2, Undo2, CheckSquare, Sparkles, LogOut, 
  RefreshCw, Volume2, ShieldAlert, Monitor, Check, X, Share2
} from "lucide-react";

interface DewanControlViewProps {
  state: MatchState;
  onUpdateConfig: (config: any) => void;
  onTimerAction: (action: string, value?: number) => void;
  onChangeRound: (round: number) => void;
  onDirectScore: (corner: "blue" | "red", type: "pukulan" | "tendangan" | "jatuhan", value: number) => void;
  onPenaltyAction: (corner: "blue" | "red", penaltyType: string, action: "add" | "remove") => void;
  onResetMatch: (keepConfig: boolean) => void;
  onUndo: () => void;
  onDeclareWinner: (winner: "blue" | "red" | null, decision: string) => void;
  onBack: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onStartVerification: (category: string) => void;
  onResetVerification: () => void;
  onCancelVerification: () => void;
}

export default function DewanControlView({
  state,
  onUpdateConfig,
  onTimerAction,
  onChangeRound,
  onDirectScore,
  onPenaltyAction,
  onResetMatch,
  onUndo,
  onDeclareWinner,
  onBack,
  onToggleFullscreen,
  isFullscreen,
  onStartVerification,
  onResetVerification,
  onCancelVerification
}: DewanControlViewProps) {
  // Config Modal State (for hidden editable settings so user has full control)
  const [showConfig, setShowConfig] = useState(false);
  const [tournamentName, setTournamentName] = useState(state.tournamentName);
  const [arena, setArena] = useState(state.arena);
  const [matchNumber, setMatchNumber] = useState(state.matchNumber);
  const [classCategory, setClassCategory] = useState(state.classCategory);
  const [blueName, setBlueName] = useState(state.athleteBlue.name);
  const [blueContingent, setBlueContingent] = useState(state.athleteBlue.contingent);
  const [redName, setRedName] = useState(state.athleteRed.name);
  const [redContingent, setRedContingent] = useState(state.athleteRed.contingent);
  const [durSeconds, setDurSeconds] = useState(state.roundDuration);

  // Verification modal overlays
  const [showJatuhanVerification, setShowJatuhanVerification] = useState(false);
  const [showPelanggaranVerification, setShowPelanggaranVerification] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Selected winner variables for custom award
  const [winnerCorner, setWinnerCorner] = useState<"blue" | "red" | "">("");
  const [winnerDecision, setWinnerDecision] = useState("Menang Angka");

  // Visual summary modal state
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Auto-trigger visual summary modal when match concludes
  useEffect(() => {
    if (state.winner) {
      setIsSummaryOpen(true);
    } else {
      setIsSummaryOpen(false);
    }
  }, [state.winner]);

  // Local state for VAR announcement
  const [varAnnouncement, setVarAnnouncement] = useState<{ active: boolean; corner: "blue" | "red" | null; msg: string }>({
    active: false,
    corner: null,
    msg: ""
  });

  const saveConfig = () => {
    onUpdateConfig({
      tournamentName,
      arena,
      matchNumber,
      classCategory,
      athleteBlue: { name: blueName, contingent: blueContingent },
      athleteRed: { name: redName, contingent: redContingent },
      roundDuration: Number(durSeconds),
    });
    setShowConfig(false);
  };

  const handleCekVar = (corner: "blue" | "red") => {
    const athlete = corner === "blue" ? state.athleteBlue.name : state.athleteRed.name;
    const cornerText = corner === "blue" ? "SUDUT BIRU" : "SUDUT MERAH";
    setVarAnnouncement({
      active: true,
      corner,
      msg: `PENINJAUAN VIDEO REPLAY (VAR) DIALOKASIKAN UNTUK ${cornerText} (${athlete})`
    });

    // Automatically dismiss after 4 seconds
    setTimeout(() => {
      setVarAnnouncement({ active: false, corner: null, msg: "" });
    }, 4500);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, "0");
    const sec = (seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  // Safe handler to execute penalty toggles
  const togglePenalty = (corner: "blue" | "red", penaltyType: string, isActive: boolean) => {
    onPenaltyAction(corner, penaltyType, isActive ? "remove" : "add");
  };

  // Safe handler for Binaan increments
  const toggleBinaan = (corner: "blue" | "red", level: 1 | 2) => {
    const currentBinaan = state.penalties[corner].binaan;
    if (level === 1) {
      if (currentBinaan === 1) {
        // remove binaan
        onPenaltyAction(corner, "binaan", "remove");
      } else {
        // set or adjust to 1
        if (currentBinaan === 2) {
          onPenaltyAction(corner, "binaan", "remove");
        } else {
          onPenaltyAction(corner, "binaan", "add");
        }
      }
    } else {
      // level 2
      if (currentBinaan === 2) {
        onPenaltyAction(corner, "binaan", "remove");
      } else {
        if (currentBinaan === 0) {
          onPenaltyAction(corner, "binaan", "add");
          setTimeout(() => onPenaltyAction(corner, "binaan", "add"), 200);
        } else if (currentBinaan === 1) {
          onPenaltyAction(corner, "binaan", "add");
        }
      }
    }
  };

  if (state.verification?.isActive) {
    const { category, juriVotes, consensusResult } = state.verification;
    const votedCount = [juriVotes.j1, juriVotes.j2, juriVotes.j3].filter(v => v !== null).length;
    const isCompleted = juriVotes.j1 && juriVotes.j2 && juriVotes.j3;

    return (
      <div id="dewan-verification-active-overlay" className="min-h-screen bg-[#070116] text-white p-6 font-sans flex flex-col justify-between select-none relative overflow-hidden">
        {/* Neon Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.15)_0%,transparent_60%)] pointer-events-none" />
        
        {/* Top Header */}
        <div className="bg-[#130737] border-b border-[#2b1754] p-5 rounded-3xl flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-red-500 animate-ping absolute" />
            <div className="h-4 w-4 rounded-full bg-red-600 relative" />
            <h1 className="text-lg font-black tracking-widest text-red-500 uppercase font-mono">
              SESI VERIFIKASI DEWAN AKTIF
            </h1>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 px-4 py-2 rounded-2xl text-xs font-mono text-zinc-400">
            PANEL DEWAN • SINKRONISASI REAL-TIME
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center my-8 max-w-5xl mx-auto w-full px-4">
          
          {/* Category Display */}
          <div className="text-center mb-8">
            <span className="text-zinc-500 text-xs font-mono tracking-widest uppercase font-semibold">Perkara yang Diverifikasi</span>
            <h2 className="text-5xl md:text-6xl font-black text-amber-400 uppercase tracking-widest mt-1 filter drop-shadow-[0_2px_12px_rgba(234,179,8,0.3)] animate-pulse">
              {category}
            </h2>
            <div className="h-1.5 w-32 bg-amber-400 mx-auto rounded-full mt-5" />
          </div>

          {/* Judges Votes Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
            {[1, 2, 3].map(num => {
              const vote = juriVotes[`j${num}` as "j1" | "j2" | "j3"];
              const isVoted = vote !== null;

              return (
                <div 
                  key={num}
                  className={`border rounded-3xl p-6 flex flex-col items-center justify-between min-h-[220px] transition-all duration-300 shadow-xl ${
                    isVoted 
                      ? "bg-zinc-900/60 border-emerald-500/50 shadow-[0_4px_25px_rgba(16,185,129,0.05)]" 
                      : "bg-zinc-950/40 border-zinc-900 animate-pulse"
                  }`}
                >
                  <div className="text-center w-full">
                    <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase block">PEMILIH</span>
                    <h3 className="text-xl font-black text-white mt-1 uppercase tracking-tight">JURI {num}</h3>
                  </div>

                  {isVoted ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <div className={`px-5 py-2.5 rounded-2xl border text-sm font-black uppercase tracking-wider text-center w-full ${
                        vote === "BIRU" 
                          ? "bg-blue-950/40 border-blue-600/60 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]" 
                          : vote === "MERAH" 
                            ? "bg-red-950/40 border-red-600/60 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                            : "bg-zinc-950/80 border-zinc-700 text-zinc-400"
                      }`}>
                        {vote === "BIRU" ? "🔵 SUDUT BIRU" : vote === "MERAH" ? "🔴 SUDUT MERAH" : "❌ TIDAK SAH"}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-bold">
                        ✓ SUARA MASUK
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="h-10 w-10 border-2 border-dashed border-zinc-800 rounded-full animate-spin border-t-amber-400" />
                      <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
                        MENUNGGU SUARA JURI...
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real-time Progress Text */}
          {!isCompleted ? (
            <div className="text-center mb-6">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest block mb-2">PROGRES SUARA</span>
              <p className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                TOTAL: {votedCount} / 3 JURI VOTED
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center animate-fade-in mb-6">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest block mb-3 font-semibold">HASIL KONSENSUS OTOMATIS</span>
              
              {/* Grand Consensus Result Banner */}
              <div className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-center py-5 rounded-3xl text-2xl md:text-3xl tracking-widest uppercase shadow-[0_0_40px_rgba(245,158,11,0.4)] border border-yellow-300 relative overflow-hidden flex items-center justify-center gap-3">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />
                🏆 {consensusResult} 🏆
              </div>
            </div>
          )}

        </div>

        {/* Bottom Control Actions (Reset/Batal) */}
        <div className="bg-[#130737] border-t border-[#2b1754] p-5 rounded-3xl flex flex-col sm:flex-row justify-center items-center gap-4 shadow-2xl">
          {isCompleted ? (
            <button
              onClick={onResetVerification}
              className="w-full sm:w-80 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase py-4 rounded-2xl tracking-widest border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 cursor-pointer"
            >
              KEMBALI KE PERTANDINGAN (RESET)
            </button>
          ) : (
            <button
              onClick={onCancelVerification}
              className="w-full sm:w-80 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase py-3.5 rounded-2xl tracking-widest border border-zinc-800 transition-all active:scale-95 cursor-pointer"
            >
              BATALKAN SESI VERIFIKASI
            </button>
          )}
        </div>

      </div>
    );
  }

  return (
    <div id="dewan-panel-root" className={`bg-[#070116] text-white ${isFullscreen ? 'h-screen overflow-hidden p-2 gap-1.5' : 'min-h-screen overflow-x-hidden p-3 md:p-5 justify-between'} font-sans select-none relative flex flex-col`}>
      
      {/* BACKGROUND NEON GLOWS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.12)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(59,130,246,0.06)_0%,transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_50%,rgba(239,68,68,0.06)_0%,transparent_45%)] pointer-events-none" />

      {/* 1. TOP HEADER CONTROLS & MATCH GENERAL TITLE HEADER COMBINED (Spans edge-to-edge, only hides management actions in fullscreen) */}
      <div className={`w-auto bg-gradient-to-b from-[#130737] to-[#0c0423] border-b border-[#2b1754]/80 shadow-[0_4px_25px_rgba(0,0,0,0.6)] relative overflow-hidden -mx-3 md:-mx-5 flex items-center justify-between ${isFullscreen ? 'py-1 px-4 mb-1 min-h-[44px]' : 'py-3.5 px-4 md:px-6 mb-4 min-h-[70px]'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.15)_0%,transparent_50%)] pointer-events-none" />
        
        {/* Left corner: "Kembali" button aligned to absolute left */}
        <div className="z-10 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-[#0f072c] hover:bg-[#1a0e44] text-zinc-300 hover:text-white text-xs font-bold transition-all active:scale-95 shadow-md shrink-0"
          >
            <ArrowLeft size={13} /> Kembali
          </button>
        </div>

        {/* Center: Match general title & category */}
        <div className="text-center flex-1 px-4 md:px-8 z-10">
          <div className="text-[9px] text-cyan-400 font-mono font-bold tracking-widest uppercase">
            JRZ SCORE TGR • KETUA DEWAN
          </div>
          <h2 className="text-xs sm:text-sm md:text-lg font-black tracking-[0.15em] md:tracking-[0.2em] uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans line-clamp-1">
            {state.tournamentName || "JRZ SCORE TGR CHAMPIONSHIP"}
          </h2>
          <p className="text-[9px] md:text-xs text-amber-400 font-extrabold uppercase tracking-widest mt-0.5 line-clamp-1">
            {state.matchNumber || "1"} • TANDING {state.classCategory || "KELAS A PUTRA (55KG - 60KG)"}
          </p>
        </div>

        {/* Right corner: Match management buttons and "Layar Penuh" on the absolute right */}
        <div className="z-10 flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Settings trigger */}
          {!isFullscreen && (
            <>
              <button
                onClick={() => setShowShareModal(true)}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl border border-cyan-800/60 bg-[#071328] hover:bg-[#0c1f40] text-cyan-300 hover:text-white text-xs font-bold transition-all active:scale-95 shadow-md"
                title="Bagikan Tautan & QR Code ke Klien / Juri"
              >
                <Share2 size={13} className="text-cyan-400" /> Bagikan
              </button>
              <button
                onClick={() => {
                  setTournamentName(state.tournamentName);
                  setArena(state.arena);
                  setMatchNumber(state.matchNumber);
                  setClassCategory(state.classCategory);
                  setBlueName(state.athleteBlue.name);
                  setBlueContingent(state.athleteBlue.contingent);
                  setRedName(state.athleteRed.name);
                  setRedContingent(state.athleteRed.contingent);
                  setDurSeconds(state.roundDuration);
                  setShowConfig(true);
                }}
                disabled={state.isPanelsLocked}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-800 bg-[#0f072c] hover:bg-[#1a0e44] text-zinc-300 hover:text-white text-xs font-bold transition-all active:scale-95 shadow-md disabled:opacity-30 disabled:pointer-events-none"
              >
                <Settings size={13} className="text-purple-400" /> Atur Laga
              </button>
            </>
          )}

          {/* Undo button */}
          {!isFullscreen && (
            <button
              onClick={onUndo}
              disabled={state.actionLogs.length === 0 || state.isPanelsLocked}
              className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-900/60 bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-md"
            >
              <Undo2 size={13} /> Undo
            </button>
          )}

          {/* Clean Reset */}
          {!isFullscreen && (
            <button
              onClick={() => {
                if (confirm("Reset total semua nilai & setel ulang tanding?")) {
                  onResetMatch(true);
                }
              }}
              disabled={state.isPanelsLocked}
              className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-900/40 bg-red-950/15 hover:bg-red-950/35 text-red-400 text-xs font-bold transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              <RotateCcw size={13} /> Reset Poin
            </button>
          )}

          {/* Laporan Hasil button (Manually reopening the report) */}
          {state.winner && (
            <button
              onClick={() => setIsSummaryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-black transition-all active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.15)] uppercase tracking-wider cursor-pointer"
              title="Buka Laporan Hasil Pertandingan"
            >
              <Trophy size={13} className="text-amber-400 animate-pulse" /> Laporan
            </button>
          )}

          {/* Full Screen toggle */}
          <button
            onClick={onToggleFullscreen}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-zinc-800 bg-[#0f072c] hover:bg-[#1a0e44] text-zinc-300 hover:text-white transition-all active:scale-95 shadow-md"
            title="Layar Penuh"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* DYNAMIC VAR NOTIFICATION OVERLAY */}
      {varAnnouncement.active && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-2xl w-full bg-gradient-to-br from-[#0c0423] to-[#170535] border-2 border-amber-500 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.35)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />
            <Monitor className="text-amber-400 mx-auto mb-4 animate-bounce" size={48} />
            <h3 className="text-xl font-black text-amber-400 tracking-wider mb-2 font-mono uppercase">
              CEK VIDEO ASSISTANT REFEREE (VAR)
            </h3>
            <p className="text-sm text-zinc-100 font-semibold tracking-wide leading-relaxed uppercase bg-black/40 py-4 px-6 rounded-2xl border border-zinc-800">
              {varAnnouncement.msg}
            </p>
            <div className="mt-6 text-[10px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
              Menghentikan timer & Menunggu keputusan Dewan Juri...
            </div>
          </div>
        </div>
      )}

      {state.isPanelsLocked && (
        <div className="bg-red-500/15 border border-red-500/30 p-4 rounded-2xl text-center text-red-400 flex flex-col items-center justify-center gap-2 text-sm font-bold animate-pulse max-w-7xl mx-auto w-full mb-4 z-40">
          <ShieldAlert size={28} className="shrink-0 text-red-500 animate-bounce" />
          <span className="uppercase tracking-widest font-black text-white">PANEL DEWAN JURI TERKUNCI</span>
          <p className="text-xs font-normal text-zinc-300 max-w-xl">
            Panel Dewan Juri dikunci oleh Sekretaris. Semua input nilai, hukuman, dan aksi lainnya dinonaktifkan sementara.
          </p>
        </div>
      )}

      {/* THREE-COLUMN LAYOUT MAIN PANELS */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 items-stretch w-full max-w-7xl mx-auto ${isFullscreen ? 'gap-2 mb-1 flex-1 min-h-0' : 'gap-3.5 mb-4 flex-1'} ${state.isPanelsLocked ? 'pointer-events-none opacity-30 select-none' : ''}`}>
        
        {/* =========================================================================
            1. SUDUT BIRU (LEFT COLUMN)
            ========================================================================= */}
        <div className={`lg:col-span-5 bg-gradient-to-b from-blue-950/90 to-blue-900/40 border-2 border-blue-600/80 shadow-[0_0_25px_rgba(59,130,246,0.35)] flex flex-col relative overflow-hidden ${isFullscreen ? 'rounded-2xl p-2.5 gap-1.5 justify-between h-full' : 'rounded-3xl p-4 md:p-5 gap-3.5 justify-between'}`}>
          
          {/* Subdued Watermark background */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-[8rem] font-black text-blue-600/[0.03] tracking-widest font-mono uppercase">
            BIRU
          </div>

          {/* Athlete Bio Row */}
          <div className={`flex justify-between items-start border-b border-blue-950/50 z-10 relative ${isFullscreen ? 'pb-1.5 mb-1.5' : 'pb-3 mb-3'}`}>
            <div>
              <h3 className="text-base md:text-lg font-black text-white tracking-wide uppercase line-clamp-1">
                {state.athleteBlue.name || "BUDI PRASETYO"}
              </h3>
              <p className="text-[10px] md:text-xs text-blue-400 font-bold uppercase tracking-wider">
                {state.athleteBlue.contingent || "DKI JAKARTA"}
              </p>
            </div>
            <span className="bg-blue-600 text-white font-black text-[9px] md:text-[10px] px-3 py-1 rounded-full border border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)] tracking-widest uppercase shrink-0">
              SUDUT BIRU
            </span>
          </div>

          {/* Scores Counter display (Typography only, no container frame/box grid) */}
          <div className={`text-center z-10 select-none ${isFullscreen ? 'mb-1.5' : 'mb-4'}`}>
            <div className={`font-black font-sans tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)] leading-none ${isFullscreen ? 'text-4xl md:text-5xl' : 'text-6xl md:text-7xl'}`}>
              {state.scores.blue.total}
            </div>
          </div>

          {/* Container grouping Penalty Controls & Log Nilai to keep them flush/pas */}
          <div className={`z-10 flex flex-col w-full ${isFullscreen ? 'gap-1.5' : 'gap-3.5'}`}>
            {/* Scoring Penalty & VAR Controls */}
            <div className="flex flex-col w-full gap-1.5">
              {/* Scoring Penalty 3x3 Button Grid */}
              <div className={`grid grid-cols-3 ${isFullscreen ? 'gap-1 md:gap-1.5' : 'gap-2'}`}>
                
                {/* Row 1 Button 1: Binaan 1 */}
                <button
                  onClick={() => toggleBinaan("blue", 1)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.blue.binaan >= 1
                      ? "bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>☝️</span>
                  BINAAN 1
                </button>

                {/* Row 1 Button 2: Binaan 2 */}
                <button
                  onClick={() => toggleBinaan("blue", 2)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.blue.binaan >= 2
                      ? "bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>☝️</span>
                  BINAAN 2
                </button>

                {/* Row 1 Button 3: Jatuhan +3 */}
                <button
                  onClick={() => onDirectScore("blue", "jatuhan", 1)}
                  className={`flex flex-col items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase border border-emerald-500/40 transition-all duration-200 hover:scale-102 active:scale-98 shadow-[0_4px_12px_rgba(16,185,129,0.15)] tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'}`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>🤼</span>
                  JATUHAN +3
                </button>

                {/* Row 2 Button 1: Teguran 1 */}
                <button
                  onClick={() => togglePenalty("blue", "teguran1", state.penalties.blue.teguran1)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.blue.teguran1
                      ? "bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>☝️</span>
                  TEGURAN 1
                </button>

                {/* Row 2 Button 2: Teguran 2 */}
                <button
                  onClick={() => togglePenalty("blue", "teguran2", state.penalties.blue.teguran2)}
                  disabled={!state.penalties.blue.teguran1}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-45 disabled:pointer-events-none tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.blue.teguran2
                      ? "bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>✌️</span>
                  TEGURAN 2
                </button>

                {/* Row 2 Button 3: Jat. Batal */}
                <button
                  onClick={() => {
                    if (state.scores.blue.jatuhan > 0) {
                      onDirectScore("blue", "jatuhan", -1);
                    }
                  }}
                  disabled={state.scores.blue.jatuhan === 0}
                  className={`flex flex-col items-center justify-center bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none text-stone-200 font-black uppercase border border-stone-700 transition-all duration-200 hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'}`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>🔄</span>
                  JAT. BATAL
                </button>

                {/* Row 3 Button 1: Peringatan 1 */}
                <button
                  onClick={() => togglePenalty("blue", "peringatan1", state.penalties.blue.peringatan1)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.blue.peringatan1
                      ? "bg-red-600 text-white border-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>⚠️</span>
                  PERINGATAN 1
                </button>

                {/* Row 3 Button 2: Peringatan 2 */}
                <button
                  onClick={() => togglePenalty("blue", "peringatan2", state.penalties.blue.peringatan2)}
                  disabled={!state.penalties.blue.peringatan1}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-45 disabled:pointer-events-none tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.blue.peringatan2
                      ? "bg-red-600 text-white border-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>⚠️</span>
                  PERINGATAN 2
                </button>

                {/* Row 3 Button 3: Diskualifikasi */}
                <button
                  onClick={() => togglePenalty("blue", "peringatan3", state.penalties.blue.peringatan3)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-1 text-[9px] rounded-xl'} ${
                    state.penalties.blue.peringatan3
                      ? "bg-pink-700 text-white border-white shadow-[0_0_15px_rgba(190,24,74,0.6)] animate-pulse"
                      : "bg-pink-700/85 text-white border-pink-800/30"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>🚫</span>
                  DISKUALIFIKASI
                </button>

              </div>

              {/* CEK VAR Button */}
              <button
                onClick={() => handleCekVar("blue")}
                className={`w-full bg-[#1e293b]/70 hover:bg-[#334155] border-2 border-blue-500/40 text-blue-400 hover:text-white font-black uppercase tracking-widest transition-all duration-200 active:scale-97 flex items-center justify-center gap-2 ${isFullscreen ? 'py-1.5 text-[9px] md:text-[10px] rounded-lg' : 'py-2 text-[9px] md:text-[10px] rounded-xl'}`}
              >
                <Monitor size={isFullscreen ? 12 : 14} /> CEK VAR
              </button>
            </div>

            {/* INTEGRATED LOG NILAI MASUK (BIRU) */}
            <div className={`w-full bg-[#050212]/50 border border-blue-950/40 rounded-xl ${isFullscreen ? 'p-2' : 'p-3.5'} font-mono`}>
              <h4 className={`font-black text-blue-400 tracking-wider uppercase border-b border-blue-950/40 flex justify-between ${isFullscreen ? 'mb-1.5 pb-1 text-[10px]' : 'mb-2.5 pb-1.5 text-xs'}`}>
                <span>LOG NILAI MASUK (BIRU)</span>
                <span className="text-zinc-500 text-[8px] lowercase font-sans">real-time sync</span>
              </h4>
              <table className="w-full table-fixed text-center">
                <thead>
                  <tr className="text-zinc-500 border-b border-blue-950/25">
                    <th className={`pb-1 border-r border-blue-950/30 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>Rd</th>
                    <th className={`pb-1 border-r border-blue-950/30 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>J1</th>
                    <th className={`pb-1 border-r border-blue-950/30 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>J2</th>
                    <th className={`pb-1 border-r border-blue-950/30 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>J3</th>
                    <th className={`pb-1 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>DWN</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((rd) => {
                    const isCurrent = state.round === rd;
                    const rdScores = state.roundScores[rd]?.blue || { pukulan: 0, tendangan: 0, jatuhan: 0, hukuman: 0, total: 0 };
                    const showJ1 = rdScores.pukulan + rdScores.tendangan > 0 ? `+${rdScores.pukulan * 1 + rdScores.tendangan * 2}` : "-";
                    const showJ2 = rdScores.pukulan + rdScores.tendangan > 0 ? `+${rdScores.pukulan * 1 + rdScores.tendangan * 2}` : "-";
                    const showJ3 = rdScores.pukulan + rdScores.tendangan > 0 ? `+${rdScores.pukulan * 1 + rdScores.tendangan * 2}` : "-";

                    return (
                      <tr key={rd} className={`border-b border-blue-950/15 ${isCurrent ? "text-white font-bold bg-blue-950/15" : "text-zinc-400"}`}>
                        <td className={`border-r border-blue-950/20 font-bold text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>Rd {rd}</td>
                        <td className={`border-r border-blue-950/20 text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>{showJ1}</td>
                        <td className={`border-r border-blue-950/20 text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>{showJ2}</td>
                        <td className={`border-r border-blue-950/20 text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>{showJ3}</td>
                        <td className={`text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>
                          <div className="flex gap-1 justify-center items-center flex-wrap min-h-[16px]">
                            {isCurrent && (
                              <>
                                {state.penalties.blue.peringatan2 && <span className="bg-red-900 border border-red-500 text-white font-black text-[7px] px-0.5 rounded leading-none">-10</span>}
                                {state.penalties.blue.peringatan1 && <span className="bg-orange-850 border border-orange-500 text-white font-black text-[7px] px-0.5 rounded leading-none">-5</span>}
                                {state.penalties.blue.teguran2 && <span className="bg-yellow-900 border border-yellow-500 text-white font-black text-[7px] px-0.5 rounded leading-none">-2</span>}
                                {state.penalties.blue.teguran1 && <span className="bg-yellow-950 border border-yellow-600/60 text-white font-black text-[7px] px-0.5 rounded leading-none">-1</span>}
                                {state.penalties.blue.keluarGelanggang > 0 && <span className="bg-zinc-800 text-zinc-300 font-black text-[7px] px-0.5 rounded leading-none">-{state.penalties.blue.keluarGelanggang}</span>}
                                {rdScores.jatuhan > 0 && <span className="bg-emerald-950 border border-emerald-500 text-emerald-400 font-black text-[7px] px-0.5 rounded leading-none">+{rdScores.jatuhan * 3}</span>}
                              </>
                            )}
                            {!isCurrent && rdScores.jatuhan > 0 && (
                              <span className="bg-emerald-950/50 border border-emerald-800/40 text-emerald-500/80 text-[7px] px-0.5 rounded leading-none">+{rdScores.jatuhan * 3}</span>
                            )}
                            {!isCurrent && rdScores.hukuman < 0 && (
                              <span className="bg-red-950/50 border border-red-900/30 text-red-400/80 text-[7px] px-0.5 rounded leading-none">{rdScores.hukuman}</span>
                            )}
                            {!state.penalties.blue.teguran1 && !state.penalties.blue.teguran2 && !state.penalties.blue.peringatan1 && !state.penalties.blue.peringatan2 && rdScores.jatuhan === 0 && (
                              <span className="text-zinc-600">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* =========================================================================
            2. TIMER & CENTER MATCH CONTROLS (MIDDLE COLUMN)
            ========================================================================= */}
        <div className={`lg:col-span-2 flex flex-col ${isFullscreen ? 'justify-start h-full space-y-1.5' : 'justify-between space-y-4'}`}>
          
          {/* Top Panel: Timer Clock */}
          <div className={`bg-[#050212] border-2 border-purple-950/80 rounded-2xl ${isFullscreen ? 'p-2' : 'p-4'} text-center shadow-[0_4px_20px_rgba(139,92,246,0.15)] flex flex-col items-center justify-center relative`}>
            <span className={`font-black text-amber-500 uppercase tracking-widest block font-mono ${isFullscreen ? 'mb-0.5 text-[9px]' : 'mb-1.5 text-[10px]'}`}>
              BABAK {state.round}
            </span>
            
            {/* Glowing clock display */}
            <div 
              className={`${isFullscreen ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl'} font-black font-mono tracking-wider text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] select-none leading-none`}
            >
              {formatTime(state.timeRemaining)}
            </div>
            
            {/* Play/Pause state label */}
            <span className={`text-[8px] font-black uppercase tracking-widest mt-2 px-2 py-0.5 rounded border ${
              state.isTimerRunning 
                ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/10 animate-pulse" 
                : "text-amber-400 border-amber-500/20 bg-amber-950/10"
            }`}>
              {state.isTimerRunning ? "LIVE TIMER" : "PAUSED"}
            </span>

            {/* Gap Rule Tracker Active Banner */}
            {state.gapRuleTracker && state.gapRuleTracker.active && (
              <div className="mt-2.5 w-full bg-red-950/80 border border-red-500/30 rounded-xl p-2 animate-pulse flex flex-col items-center justify-center gap-0.5">
                <span className="text-red-400 text-[8px] font-black uppercase tracking-wider font-mono flex items-center gap-1 justify-center">
                  <AlertCircle size={10} className="animate-bounce" /> SELISIH POINT &gt;= 30
                </span>
                <span className="text-[9px] text-zinc-300 font-sans leading-tight">
                  Sudut <span className={state.gapRuleTracker.losingCorner === "blue" ? "text-blue-400 font-bold" : "text-red-400 font-bold"}>{state.gapRuleTracker.losingCorner === "blue" ? "BIRU" : "MERAH"}</span> harus menambah nilai!
                </span>
                <span className="text-xs font-black font-mono text-white mt-0.5 bg-black/40 px-2 py-0.5 rounded border border-red-500/15">
                  MENANG MUTLAK: <span className="text-red-400 font-black">{60 - state.gapRuleTracker.secondsElapsed}s</span>
                </span>
              </div>
            )}
          </div>

          {/* Middle Panel: Monitor Juri */}
          <div className={`bg-[#0c0423]/90 border border-purple-950/50 rounded-2xl ${isFullscreen ? 'p-2 flex-none' : 'p-3 flex-1'} flex flex-col ${isFullscreen ? 'justify-start gap-1.5' : 'justify-between'} shadow-lg`}>
            
            <div className={`text-center border-b border-purple-950/40 ${isFullscreen ? 'pb-1 mb-1' : 'pb-1.5 mb-2'}`}>
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest font-mono">
                MONITOR JURI
              </span>
            </div>

            {/* Judge values rows in 1 single grid */}
            <div className={`bg-[#040112] border border-purple-950/45 rounded-xl ${isFullscreen ? 'p-1 gap-0.5 justify-start flex-none' : 'p-3 gap-3 justify-around flex-1'} flex flex-col font-mono`}>
              {[1, 2, 3].map((jNum, index) => {
                // Read indicators or dynamic scores safely
                const blueIndicator = state.juriActiveIndicators.blue[`j${jNum}` as "j1" | "j2" | "j3"];
                const redIndicator = state.juriActiveIndicators.red[`j${jNum}` as "j1" | "j2" | "j3"];

                // Simulated direct points based on state for immersive layout
                // In IPSI 2022 we display Juri punch (P) and kick (K) scores
                const mockBlueP = state.scores.blue.pukulan;
                const mockRedP = state.scores.red.pukulan;
                const mockBlueK = state.scores.blue.tendangan;
                const mockRedK = state.scores.red.tendangan;

                return (
                  <div key={jNum} className={`flex flex-col w-full relative ${index > 0 ? (isFullscreen ? 'border-t border-purple-950/20 pt-0.5 mt-0' : 'border-t border-purple-950/20 pt-1.5') : ''}`}>
                    {/* Header Juri */}
                    <div className={`text-center text-[8px] font-bold text-zinc-500 uppercase tracking-wider ${isFullscreen ? 'mb-0' : 'mb-1'}`}>
                      JURI {jNum}
                    </div>
                    {/* Scores values matching exact design */}
                    <div className="flex justify-between items-center text-zinc-200">
                      <div className="flex justify-between w-full px-1">
                        <span className={`font-bold ${blueIndicator === "pukulan" ? "text-blue-400 font-black animate-pulse" : ""}`}>
                          P: {mockBlueP}
                        </span>
                        <span className="text-zinc-600">|</span>
                        <span className={`font-bold ${redIndicator === "pukulan" ? "text-red-400 font-black animate-pulse" : ""}`}>
                          {mockRedP} : P
                        </span>
                      </div>
                    </div>
                    <div className={`flex justify-between items-center text-zinc-200 ${isFullscreen ? 'mt-0' : 'mt-0.5'}`}>
                      <div className="flex justify-between w-full px-1">
                        <span className={`font-bold ${blueIndicator === "tendangan" ? "text-blue-400 font-black animate-pulse" : ""}`}>
                          K: {mockBlueK}
                        </span>
                        <span className="text-zinc-600">|</span>
                        <span className={`font-bold ${redIndicator === "tendangan" ? "text-red-400 font-black animate-pulse" : ""}`}>
                          {mockRedK} : K
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Separate Dedicated Grid for TEKNIK-MUTLAK-WMP-UD */}
          <div className={`bg-[#0c0423]/90 border border-purple-950/50 rounded-2xl ${isFullscreen ? 'p-2 flex-none' : 'p-3'} shadow-lg`}>
            {/* TEKNIK-MUTLAK-WMP-UD Button (Cyan Wide Button) */}
            <button
              onClick={() => {
                // Initialize default declaration inputs
                setWinnerCorner("");
                setWinnerDecision("Menang Teknik");
                setShowWinnerModal(true);
              }}
              className={`w-full bg-[#0ea5e9] hover:bg-[#38bdf8] text-black font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-200 active:scale-95 border border-sky-300/20 text-center shadow-[0_0_12px_rgba(14,165,233,0.3)] cursor-pointer ${isFullscreen ? 'py-1.5 rounded-lg' : 'py-2 rounded-xl'}`}
            >
              TEKNIK-MUTLAK-WMP-UD
            </button>
          </div>

          {/* Central Shield/Logo representation */}
          <div className={`flex flex-col items-center justify-center ${isFullscreen ? 'py-1 flex-none my-auto' : 'py-2'}`}>
            <img 
              src={logoDisco} 
              alt="Logo IPSI" 
              className={`object-contain transition-all duration-200 ${isFullscreen ? 'h-24 md:h-28 max-w-[280px]' : 'h-14 md:h-16 max-w-[160px]'}`}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Verifikasi Dewan section (Title & Action Buttons) */}
          <div className={`bg-[#0c0423]/90 border border-purple-950/40 rounded-2xl shadow-lg flex flex-col ${isFullscreen ? 'p-2 gap-1.5 flex-none' : 'p-3 gap-2'}`}>
            
            <div className={`text-center border-b border-purple-950/40 ${isFullscreen ? 'pb-1' : 'pb-1.5'}`}>
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest font-mono">
                VERIFIKASI DEWAN
              </span>
            </div>

            {/* Button 1: Verifikasi Jatuhan */}
            <button
              onClick={() => setShowJatuhanVerification(true)}
              className={`w-full bg-gradient-to-b from-[#312e81] to-[#1e1b4b] hover:from-[#3730a3] hover:to-[#312e81] text-indigo-200 hover:text-white font-extrabold text-[9px] md:text-[10px] uppercase tracking-wider border border-indigo-900/60 transition-all duration-200 active:scale-95 text-center shadow-sm cursor-pointer ${isFullscreen ? 'py-1.5 rounded-lg' : 'py-2.5 rounded-xl'}`}
            >
              VERIFIKASI JATUHAN
            </button>

            {/* Button 2: Verifikasi Pelanggaran */}
            <button
              onClick={() => setShowPelanggaranVerification(true)}
              className={`w-full bg-gradient-to-b from-[#312e81] to-[#1e1b4b] hover:from-[#3730a3] hover:to-[#312e81] text-indigo-200 hover:text-white font-extrabold text-[9px] md:text-[10px] uppercase tracking-wider border border-indigo-900/60 transition-all duration-200 active:scale-95 text-center shadow-sm cursor-pointer ${isFullscreen ? 'py-1.5 rounded-lg' : 'py-2.5 rounded-xl'}`}
            >
              VERIFIKASI PELANGGARAN
            </button>

          </div>

        </div>

        {/* =========================================================================
            3. SUDUT MERAH (RIGHT COLUMN)
            ========================================================================= */}
        <div className={`lg:col-span-5 bg-gradient-to-b from-red-950/90 to-red-900/40 border-2 border-red-600/80 shadow-[0_0_25px_rgba(239,68,68,0.35)] flex flex-col relative overflow-hidden ${isFullscreen ? 'rounded-2xl p-2.5 gap-1.5 justify-between h-full' : 'rounded-3xl p-4 md:p-5 gap-3.5 justify-between'}`}>
          
          {/* Subdued Watermark background */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-[8rem] font-black text-red-600/[0.03] tracking-widest font-mono uppercase">
            MERAH
          </div>

          {/* Athlete Bio Row */}
          <div className={`flex justify-between items-start border-b border-red-950/50 z-10 relative ${isFullscreen ? 'pb-1.5 mb-1.5' : 'pb-3 mb-3'}`}>
            <div>
              <h3 className="text-base md:text-lg font-black text-white tracking-wide uppercase line-clamp-1">
                {state.athleteRed.name || "ANDI SANTOSO"}
              </h3>
              <p className="text-[10px] md:text-xs text-red-400 font-bold uppercase tracking-wider">
                {state.athleteRed.contingent || "JAWA TENGAH"}
              </p>
            </div>
            <span className="bg-red-600 text-white font-black text-[9px] md:text-[10px] px-3 py-1 rounded-full border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)] tracking-widest uppercase shrink-0">
              SUDUT MERAH
            </span>
          </div>

          {/* Scores Counter display (Typography only, no container frame/box grid) */}
          <div className={`text-center z-10 select-none ${isFullscreen ? 'mb-1.5' : 'mb-4'}`}>
            <div className={`font-black font-sans tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)] leading-none ${isFullscreen ? 'text-4xl md:text-5xl' : 'text-6xl md:text-7xl'}`}>
              {state.scores.red.total}
            </div>
          </div>

          {/* Container grouping Penalty Controls & Log Nilai to keep them flush/pas */}
          <div className={`z-10 flex flex-col w-full ${isFullscreen ? 'gap-1.5' : 'gap-3.5'}`}>
            {/* Scoring Penalty & VAR Controls */}
            <div className="flex flex-col w-full gap-1.5">
              {/* Scoring Penalty 3x3 Button Grid */}
              <div className={`grid grid-cols-3 ${isFullscreen ? 'gap-1 md:gap-1.5' : 'gap-2'}`}>
                
                {/* Row 1 Button 1: Binaan 1 */}
                <button
                  onClick={() => toggleBinaan("red", 1)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.red.binaan >= 1
                      ? "bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>☝️</span>
                  BINAAN 1
                </button>

                {/* Row 1 Button 2: Binaan 2 */}
                <button
                  onClick={() => toggleBinaan("red", 2)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.red.binaan >= 2
                      ? "bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>☝️</span>
                  BINAAN 2
                </button>

                {/* Row 1 Button 3: Jatuhan +3 */}
                <button
                  onClick={() => onDirectScore("red", "jatuhan", 1)}
                  className={`flex flex-col items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase border border-emerald-500/40 transition-all duration-200 hover:scale-102 active:scale-98 shadow-[0_4px_12px_rgba(16,185,129,0.15)] tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'}`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>🤼</span>
                  JATUHAN +3
                </button>

                {/* Row 2 Button 1: Teguran 1 */}
                <button
                  onClick={() => togglePenalty("red", "teguran1", state.penalties.red.teguran1)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.red.teguran1
                      ? "bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>☝️</span>
                  TEGURAN 1
                </button>

                {/* Row 2 Button 2: Teguran 2 */}
                <button
                  onClick={() => togglePenalty("red", "teguran2", state.penalties.red.teguran2)}
                  disabled={!state.penalties.red.teguran1}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-45 disabled:pointer-events-none tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.red.teguran2
                      ? "bg-amber-500 text-black border-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>✌️</span>
                  TEGURAN 2
                </button>

                {/* Row 2 Button 3: Jat. Batal */}
                <button
                  onClick={() => {
                    if (state.scores.red.jatuhan > 0) {
                      onDirectScore("red", "jatuhan", -1);
                    }
                  }}
                  disabled={state.scores.red.jatuhan === 0}
                  className={`flex flex-col items-center justify-center bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none text-stone-200 font-black uppercase border border-stone-700 transition-all duration-200 hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'}`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>🔄</span>
                  JAT. BATAL
                </button>

                {/* Row 3 Button 1: Peringatan 1 */}
                <button
                  onClick={() => togglePenalty("red", "peringatan1", state.penalties.red.peringatan1)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.red.peringatan1
                      ? "bg-red-600 text-white border-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>⚠️</span>
                  PERINGATAN 1
                </button>

                {/* Row 3 Button 2: Peringatan 2 */}
                <button
                  onClick={() => togglePenalty("red", "peringatan2", state.penalties.red.peringatan2)}
                  disabled={!state.penalties.red.peringatan1}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-45 disabled:pointer-events-none tracking-wider ${isFullscreen ? 'py-1 px-1.5 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-2 text-[10px] rounded-xl'} ${
                    state.penalties.red.peringatan2
                      ? "bg-red-600 text-white border-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900/30 hover:text-zinc-300"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>⚠️</span>
                  PERINGATAN 2
                </button>

                {/* Row 3 Button 3: Diskualifikasi */}
                <button
                  onClick={() => togglePenalty("red", "peringatan3", state.penalties.red.peringatan3)}
                  className={`flex flex-col items-center justify-center font-black uppercase transition-all duration-200 border cursor-pointer hover:scale-102 active:scale-98 tracking-wider ${isFullscreen ? 'py-1 px-1 text-[8px] md:text-[9px] rounded-lg' : 'py-1.5 px-1 text-[9px] rounded-xl'} ${
                    state.penalties.red.peringatan3
                      ? "bg-pink-700 text-white border-white shadow-[0_0_15px_rgba(190,24,74,0.6)] animate-pulse"
                      : "bg-pink-700/85 text-white border-pink-800/30"
                  }`}
                >
                  <span className={`${isFullscreen ? 'mb-0 text-sm' : 'mb-0.5 text-lg'}`}>🚫</span>
                  DISKUALIFIKASI
                </button>

              </div>

              {/* CEK VAR Button */}
              <button
                onClick={() => handleCekVar("red")}
                className={`w-full bg-[#1e293b]/70 hover:bg-[#334155] border-2 border-red-500/40 text-red-400 hover:text-white font-black uppercase tracking-widest transition-all duration-200 active:scale-97 flex items-center justify-center gap-2 ${isFullscreen ? 'py-1.5 text-[9px] md:text-[10px] rounded-lg' : 'py-2 text-[9px] md:text-[10px] rounded-xl'}`}
              >
                <Monitor size={isFullscreen ? 12 : 14} /> CEK VAR
              </button>
            </div>

            {/* INTEGRATED LOG NILAI MASUK (MERAH) */}
            <div className={`w-full bg-[#050212]/50 border border-red-950/40 rounded-xl ${isFullscreen ? 'p-2' : 'p-3.5'} font-mono`}>
              <h4 className={`font-black text-red-400 tracking-wider uppercase border-b border-red-950/40 flex justify-between ${isFullscreen ? 'mb-1.5 pb-1 text-[10px]' : 'mb-2.5 pb-1.5 text-xs'}`}>
                <span>LOG NILAI MASUK (MERAH)</span>
                <span className="text-zinc-500 text-[8px] lowercase font-sans">real-time sync</span>
              </h4>
              <table className="w-full table-fixed text-center">
                <thead>
                  <tr className="text-zinc-500 border-b border-red-950/25">
                    <th className={`pb-1 border-r border-red-950/30 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>Rd</th>
                    <th className={`pb-1 border-r border-red-950/30 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>J1</th>
                    <th className={`pb-1 border-r border-red-950/30 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>J2</th>
                    <th className={`pb-1 border-r border-red-950/30 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>J3</th>
                    <th className={`pb-1 uppercase text-center w-1/5 font-bold ${isFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>DWN</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((rd) => {
                    const isCurrent = state.round === rd;
                    const rdScores = state.roundScores[rd]?.red || { pukulan: 0, tendangan: 0, jatuhan: 0, hukuman: 0, total: 0 };
                    const showJ1 = rdScores.pukulan + rdScores.tendangan > 0 ? `+${rdScores.pukulan * 1 + rdScores.tendangan * 2}` : "-";
                    const showJ2 = rdScores.pukulan + rdScores.tendangan > 0 ? `+${rdScores.pukulan * 1 + rdScores.tendangan * 2}` : "-";
                    const showJ3 = rdScores.pukulan + rdScores.tendangan > 0 ? `+${rdScores.pukulan * 1 + rdScores.tendangan * 2}` : "-";

                    return (
                      <tr key={rd} className={`border-b border-red-950/15 ${isCurrent ? "text-white font-bold bg-red-950/15" : "text-zinc-400"}`}>
                        <td className={`border-r border-red-950/20 font-bold text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>Rd {rd}</td>
                        <td className={`border-r border-red-950/20 text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>{showJ1}</td>
                        <td className={`border-r border-red-950/20 text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>{showJ2}</td>
                        <td className={`border-r border-red-950/20 text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>{showJ3}</td>
                        <td className={`text-center ${isFullscreen ? 'py-1.5 text-[10px] md:text-xs' : 'py-2.5 text-xs md:text-sm'}`}>
                          <div className="flex gap-1 justify-center items-center flex-wrap min-h-[16px]">
                            {isCurrent && (
                              <>
                                {state.penalties.red.peringatan2 && <span className="bg-red-900 border border-red-500 text-white font-black text-[7px] px-0.5 rounded leading-none">-10</span>}
                                {state.penalties.red.peringatan1 && <span className="bg-orange-850 border border-orange-500 text-white font-black text-[7px] px-0.5 rounded leading-none">-5</span>}
                                {state.penalties.red.teguran2 && <span className="bg-yellow-900 border border-yellow-500 text-white font-black text-[7px] px-0.5 rounded leading-none">-2</span>}
                                {state.penalties.red.teguran1 && <span className="bg-yellow-950 border border-yellow-600/60 text-white font-black text-[7px] px-0.5 rounded leading-none">-1</span>}
                                {state.penalties.red.keluarGelanggang > 0 && <span className="bg-zinc-800 text-zinc-300 font-black text-[7px] px-0.5 rounded leading-none">-{state.penalties.red.keluarGelanggang}</span>}
                                {rdScores.jatuhan > 0 && <span className="bg-emerald-950 border border-emerald-500 text-emerald-400 font-black text-[7px] px-0.5 rounded leading-none">+{rdScores.jatuhan * 3}</span>}
                              </>
                            )}
                            {!isCurrent && rdScores.jatuhan > 0 && (
                              <span className="bg-emerald-950/50 border border-emerald-800/40 text-emerald-500/80 text-[7px] px-0.5 rounded leading-none">+{rdScores.jatuhan * 3}</span>
                            )}
                            {!isCurrent && rdScores.hukuman < 0 && (
                              <span className="bg-red-950/50 border border-red-900/30 text-red-400/80 text-[7px] px-0.5 rounded leading-none">{rdScores.hukuman}</span>
                            )}
                            {!state.penalties.red.teguran1 && !state.penalties.red.teguran2 && !state.penalties.red.peringatan1 && !state.penalties.red.peringatan2 && rdScores.jatuhan === 0 && (
                              <span className="text-zinc-600">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>



      {/* SECTION REMOVED AS REQUESTED: PENGATURAN TIMER AND LOG DETAIL PERTANDINGAN TERKINI */}

      {/* =========================================================================
          MODAL 1: EDIT CONFIGURATION / ATUR LAGA (Gears overlay icon trigger)
          ========================================================================= */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0c0423] border border-purple-900 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            
            <div className="flex justify-between items-start border-b border-purple-950 pb-4">
              <div>
                <h3 className="text-base md:text-lg font-black text-white uppercase flex items-center gap-2">
                  <Settings className="text-purple-400" size={18} /> Atur Konfigurasi Laga (Dewan)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ubah parameter kejuaraan, nama atlet, kelas pertandingan, atau durasi waktu babak.
                </p>
              </div>
              <button 
                onClick={() => setShowConfig(false)}
                className="bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white font-bold p-2 rounded-xl text-xs border border-purple-800 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-mono">Nama Kejuaraan</label>
                <input 
                  type="text" 
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full bg-[#050212] border border-purple-950 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 uppercase" 
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-mono">Partai & Gelanggang</label>
                <input 
                  type="text" 
                  value={matchNumber}
                  onChange={(e) => setMatchNumber(e.target.value)}
                  className="w-full bg-[#050212] border border-purple-950 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" 
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-mono">Kelas Pertandingan (Gender / Usia / Berat)</label>
                <input 
                  type="text" 
                  value={classCategory}
                  onChange={(e) => setClassCategory(e.target.value)}
                  className="w-full bg-[#050212] border border-purple-950 rounded-xl px-3 py-2 text-xs text-white focus:outline-none uppercase" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-purple-950/60 pt-4">
              <div className="space-y-2 bg-blue-950/10 p-3 rounded-2xl border border-blue-900/30">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Atlet Sudut Biru</span>
                <div>
                  <label className="text-[9px] text-zinc-400 block mb-0.5">Nama Lengkap</label>
                  <input type="text" value={blueName} onChange={(e) => setBlueName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white uppercase" />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 block mb-0.5">Kontingen</label>
                  <input type="text" value={blueContingent} onChange={(e) => setBlueContingent(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white uppercase" />
                </div>
              </div>

              <div className="space-y-2 bg-red-950/10 p-3 rounded-2xl border border-red-900/30">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">Atlet Sudut Merah</span>
                <div>
                  <label className="text-[9px] text-zinc-400 block mb-0.5">Nama Lengkap</label>
                  <input type="text" value={redName} onChange={(e) => setRedName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white uppercase" />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 block mb-0.5">Kontingen</label>
                  <input type="text" value={redContingent} onChange={(e) => setRedContingent(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white uppercase" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-mono">Preset Durasi Waktu Babak (Detik)</label>
              <select
                value={durSeconds}
                onChange={(e) => setDurSeconds(Number(e.target.value))}
                className="w-full bg-[#050212] border border-purple-950 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={60}>60 Detik (1 Menit)</option>
                <option value={90}>90 Detik (1.5 Menit)</option>
                <option value={120}>120 Detik (2 Menit)</option>
                <option value={150}>150 Detik (2.5 Menit)</option>
                <option value={180}>180 Detik (3 Menit)</option>
              </select>
            </div>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-purple-950">
              <button 
                onClick={() => setShowConfig(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs px-4 py-2 rounded-xl transition-all border border-zinc-800 cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={saveConfig}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-6 py-2 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Simpan & Update
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: VERIFIKASI JATUHAN OVERLAY
          ========================================================================= */}
      {showJatuhanVerification && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0c0423] border border-indigo-900 rounded-3xl p-6 max-w-md w-full space-y-4">
            
            <div className="flex justify-between items-center border-b border-purple-950 pb-3">
              <h3 className="text-sm font-black text-indigo-300 uppercase flex items-center gap-2">
                🤼 VERIFIKASI JATUHAN DEWAN
              </h3>
              <button 
                onClick={() => setShowJatuhanVerification(false)}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Pilih tindakan jatuhan/bantingan resmi di bawah ini untuk disahkan oleh dewan ke monitor utama:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onStartVerification("JATUHAN");
                  setShowJatuhanVerification(false);
                }}
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 font-black p-4 rounded-xl text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse cursor-pointer"
              >
                <span>⚡ MULAI SESI VOTING JURI JATUHAN</span>
              </button>

              <div className="h-[1px] bg-zinc-800/80 my-2" />

              <button
                onClick={() => {
                  onDirectScore("blue", "jatuhan", 1);
                  setShowJatuhanVerification(false);
                }}
                className="w-full text-left bg-blue-950/20 hover:bg-blue-900/40 text-blue-300 hover:text-white border border-blue-900/40 p-3.5 rounded-xl font-bold text-xs transition-colors flex justify-between items-center cursor-pointer"
              >
                <span>Sahkan Jatuhan Sudut Biru (+3)</span>
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-mono">+3 POIN</span>
              </button>

              <button
                onClick={() => {
                  onDirectScore("red", "jatuhan", 1);
                  setShowJatuhanVerification(false);
                }}
                className="w-full text-left bg-red-950/20 hover:bg-red-900/40 text-red-300 hover:text-white border border-red-900/40 p-3.5 rounded-xl font-bold text-xs transition-colors flex justify-between items-center cursor-pointer"
              >
                <span>Sahkan Jatuhan Sudut Merah (+3)</span>
                <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-mono">+3 POIN</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-950/60 mt-2">
                <button
                  onClick={() => {
                    if (state.scores.blue.jatuhan > 0) onDirectScore("blue", "jatuhan", -1);
                    setShowJatuhanVerification(false);
                  }}
                  disabled={state.scores.blue.jatuhan === 0}
                  className="bg-[#1e1b4b] hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 p-2 text-center rounded-xl font-medium text-[10px] uppercase cursor-pointer"
                >
                  Batal Jatuhan Biru (-3)
                </button>
                <button
                  onClick={() => {
                    if (state.scores.red.jatuhan > 0) onDirectScore("red", "jatuhan", -1);
                    setShowJatuhanVerification(false);
                  }}
                  disabled={state.scores.red.jatuhan === 0}
                  className="bg-[#1e1b4b] hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 p-2 text-center rounded-xl font-medium text-[10px] uppercase cursor-pointer"
                >
                  Batal Jatuhan Merah (-3)
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowJatuhanVerification(false)}
              className="w-full bg-zinc-900 text-zinc-400 hover:text-white font-bold py-2 rounded-xl text-xs uppercase cursor-pointer mt-4"
            >
              Tutup Panel Verifikasi
            </button>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: VERIFIKASI PELANGGARAN OVERLAY
          ========================================================================= */}
      {showPelanggaranVerification && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0c0423] border border-indigo-900 rounded-3xl p-6 max-w-md w-full space-y-4">
            
            <div className="flex justify-between items-center border-b border-purple-950 pb-3">
              <h3 className="text-sm font-black text-indigo-300 uppercase flex items-center gap-2">
                ⚠️ VERIFIKASI PELANGGARAN DEWAN
              </h3>
              <button 
                onClick={() => setShowPelanggaranVerification(false)}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Pilih tindakan pelanggaran atau hukuman kelolaan dewan di bawah ini:
            </p>

            <div className="space-y-3.5">
              
              {/* SESI VOTING REAL-TIME JURI */}
              <button
                onClick={() => {
                  onStartVerification("PELANGGARAN");
                  setShowPelanggaranVerification(false);
                }}
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 font-black p-4 rounded-xl text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse cursor-pointer"
              >
                <span>⚡ MULAI SESI VOTING JURI PELANGGARAN</span>
              </button>

              <div className="h-[1px] bg-zinc-800/80 my-1" />

              {/* Keluar Gelanggang (KG) Counter */}
              <div className="bg-[#050212] border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase">Keluar Gelanggang Biru</span>
                  <span className="text-[11px] text-zinc-500">Masing-masing penalti -1 Poin</span>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => onPenaltyAction("blue", "keluar", "remove")} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-6 w-6 rounded flex items-center justify-center">-</button>
                  <span className="text-xs font-black text-red-400">{state.penalties.blue.keluarGelanggang}x</span>
                  <button onClick={() => onPenaltyAction("blue", "keluar", "add")} className="bg-red-950 text-red-400 hover:bg-red-900 font-bold h-6 w-6 rounded flex items-center justify-center">+</button>
                </div>
              </div>

              <div className="bg-[#050212] border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase">Keluar Gelanggang Merah</span>
                  <span className="text-[11px] text-zinc-500">Masing-masing penalti -1 Poin</span>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => onPenaltyAction("red", "keluar", "remove")} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-6 w-6 rounded flex items-center justify-center">-</button>
                  <span className="text-xs font-black text-red-400">{state.penalties.red.keluarGelanggang}x</span>
                  <button onClick={() => onPenaltyAction("red", "keluar", "add")} className="bg-red-950 text-red-400 hover:bg-red-900 font-bold h-6 w-6 rounded flex items-center justify-center">+</button>
                </div>
              </div>

              {/* Direct Penalty Adjustments */}
              <div className="pt-2 border-t border-purple-950/60 flex gap-2">
                <button
                  onClick={() => {
                    if (confirm("Reset total seluruh pelanggaran (Teguran & Peringatan) Sudut Biru?")) {
                      onPenaltyAction("blue", "binaan", "remove");
                      if (state.penalties.blue.teguran1) onPenaltyAction("blue", "teguran1", "remove");
                      if (state.penalties.blue.teguran2) onPenaltyAction("blue", "teguran2", "remove");
                      if (state.penalties.blue.peringatan1) onPenaltyAction("blue", "peringatan1", "remove");
                      if (state.penalties.blue.peringatan2) onPenaltyAction("blue", "peringatan2", "remove");
                      if (state.penalties.blue.peringatan3) onPenaltyAction("blue", "peringatan3", "remove");
                    }
                    setShowPelanggaranVerification(false);
                  }}
                  className="flex-1 bg-[#1e1b4b] hover:bg-red-950 text-[9px] font-bold text-red-400 p-2.5 rounded-xl text-center uppercase cursor-pointer"
                >
                  Reset Penalti Biru
                </button>
                <button
                  onClick={() => {
                    if (confirm("Reset total seluruh pelanggaran (Teguran & Peringatan) Sudut Merah?")) {
                      onPenaltyAction("red", "binaan", "remove");
                      if (state.penalties.red.teguran1) onPenaltyAction("red", "teguran1", "remove");
                      if (state.penalties.red.teguran2) onPenaltyAction("red", "teguran2", "remove");
                      if (state.penalties.red.peringatan1) onPenaltyAction("red", "peringatan1", "remove");
                      if (state.penalties.red.peringatan2) onPenaltyAction("red", "peringatan2", "remove");
                      if (state.penalties.red.peringatan3) onPenaltyAction("red", "peringatan3", "remove");
                    }
                    setShowPelanggaranVerification(false);
                  }}
                  className="flex-1 bg-[#1e1b4b] hover:bg-red-950 text-[9px] font-bold text-red-400 p-2.5 rounded-xl text-center uppercase cursor-pointer"
                >
                  Reset Penalti Merah
                </button>
              </div>

            </div>

            <button
              onClick={() => setShowPelanggaranVerification(false)}
              className="w-full bg-zinc-900 text-zinc-400 hover:text-white font-bold py-2 rounded-xl text-xs uppercase cursor-pointer mt-4"
            >
              Tutup Panel Pelanggaran
            </button>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: SAHKAN PEMENANG / THEME OVERLAY (Teknik-Mutlak-WMP-UD)
          ========================================================================= */}
      {showWinnerModal && (
        <div className="fixed inset-0 bg-black/92 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0c0423] border border-amber-600 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
            
            <div className="flex justify-between items-center border-b border-purple-950 pb-3">
              <h3 className="text-sm font-black text-amber-500 uppercase flex items-center gap-2">
                🏆 SAHKAN PEMENANG PERTANDINGAN
              </h3>
              <button 
                onClick={() => setShowWinnerModal(false)}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Tentukan sudut pemenang dan alasan keputusan kemenangan untuk di-lock oleh Dewan Juri:
            </p>

            <div className="space-y-4">
              
              {/* Corner Selection */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1.5 uppercase font-mono">Pilih Sudut Pemenang</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setWinnerCorner("blue")}
                    className={`py-3 px-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all border cursor-pointer ${
                      winnerCorner === "blue" 
                        ? "bg-blue-600 border-white text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
                        : "bg-[#050212] border-blue-950/60 text-zinc-400 hover:text-white"
                    }`}
                  >
                    SUDUT BIRU
                  </button>
                  <button
                    onClick={() => setWinnerCorner("red")}
                    className={`py-3 px-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all border cursor-pointer ${
                      winnerCorner === "red" 
                        ? "bg-red-600 border-white text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]" 
                        : "bg-[#050212] border-red-950/60 text-zinc-400 hover:text-white"
                    }`}
                  >
                    SUDUT MERAH
                  </button>
                </div>
              </div>

              {/* Decision Selection */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1.5 uppercase font-mono">Alasan Keputusan</label>
                <select
                  value={winnerDecision}
                  onChange={(e) => setWinnerDecision(e.target.value)}
                  className="w-full bg-[#050212] border border-purple-950 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="Menang Angka">MENANG ANGKA (POINT WIN)</option>
                  <option value="Menang Teknik">MENANG TEKNIK (TECHNICAL WIN)</option>
                  <option value="Menang Mutlak">MENANG MUTLAK (ABSOLUTE KO)</option>
                  <option value="Menang WMP">MENANG WASIT MASALAH PESILAT (WMP)</option>
                  <option value="Menang UD">MENANG UNDUR DIRI (UD / WALK OUT)</option>
                  <option value="Diskualifikasi">DISKUALIFIKASI LAWAN (DQ)</option>
                </select>
              </div>

              {/* Declare trigger */}
              <button
                onClick={() => {
                  if (!winnerCorner) return alert("Silakan pilih sudut pemenang terlebih dahulu!");
                  onDeclareWinner(winnerCorner, winnerDecision);
                  setShowWinnerModal(false);
                }}
                disabled={!winnerCorner}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs py-3 rounded-xl uppercase tracking-widest transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-center font-sans mt-2"
              >
                SAHKAN & SELESAIKAN PERTANDINGAN
              </button>

            </div>

            <button
              onClick={() => setShowWinnerModal(false)}
              className="w-full bg-zinc-900 text-zinc-400 hover:text-white font-bold py-2 rounded-xl text-xs uppercase cursor-pointer"
            >
              Batal
            </button>

          </div>
        </div>
      )}

      <VisualSummaryModal
        state={state}
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />

      <ShareClientModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tournamentName={state.tournamentName}
      />

    </div>
  );
}
