import React, { useState, useEffect } from "react";
import { MatchState, ActionLog } from "../types";
import { Shield, Award, AlertTriangle, Timer as TimerIcon, ArrowLeft, Maximize2, Trophy, TrendingUp } from "lucide-react";
import VisualSummaryModal from "./VisualSummaryModal";
const defaultLogo = "/jrzscoreutama.png";
const logoIpsiDefault = "/LogoIPSI.png";
const logoMonitor1Default = "/logomonitor1.png";
const logoMonitor2Default = "/logomonitor2.png";

const parseClassCategory = (str: string) => {
  const result = {
    kelas: "A",
    gender: "PUTRA",
    usia: "REMAJA",
    tahap: "PENYISIHAN"
  };
  if (!str) return result;
  
  const upper = str.toUpperCase();
  
  // Extract Tahap
  if (upper.includes("FINAL")) {
    if (upper.includes("PEREMPAT")) {
      result.tahap = "PEREMPAT FINAL";
    } else if (upper.includes("SEMI")) {
      result.tahap = "SEMIFINAL";
    } else {
      result.tahap = "FINAL";
    }
  } else {
    result.tahap = "PENYISIHAN";
  }

  // Extract Usia
  if (upper.includes("REMAJA")) {
    result.usia = "REMAJA";
  } else if (upper.includes("PRA-REMAJA") || upper.includes("PRA REMAJA")) {
    result.usia = "PRA-REMAJA";
  } else if (upper.includes("USIA DINI")) {
    result.usia = "USIA DINI";
  } else {
    result.usia = "DEWASA";
  }

  // Extract Gender
  if (upper.includes("PUTRI")) {
    result.gender = "PUTRI";
  } else {
    result.gender = "PUTRA";
  }

  // Extract Kelas (e.g. "Kelas A" or "Kelas A PUTRA (55KG - 60KG)")
  // Usually the format is: "Kelas <kelas> <gender> <usia> (<tahap>)"
  let cleanKelas = str;
  // Remove "Kelas " or "kelas " prefix case-insensitively
  cleanKelas = cleanKelas.replace(/^kelas\s+/i, "");
  
  // Remove (tahap) from the end
  cleanKelas = cleanKelas.replace(/\s*\([^)]*\)\s*$/g, "");
  
  // Remove gender
  cleanKelas = cleanKelas.replace(new RegExp(`\\s*${result.gender}\\s*`, "i"), " ");
  
  // Remove usia
  cleanKelas = cleanKelas.replace(new RegExp(`\\s*${result.usia}\\s*`, "i"), " ");
  
  // Clean multiple spaces and trim
  cleanKelas = cleanKelas.replace(/\s+/g, " ").trim();
  
  if (cleanKelas) {
    result.kelas = cleanKelas;
  }

  return result;
};
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ScoreboardViewProps {
  state: MatchState;
  onBack: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isBlueLeading = data.gap > 0;
    const isRedLeading = data.gap < 0;
    const absGap = Math.abs(data.gap);

    return (
      <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-xl shadow-2xl text-xs font-mono max-w-[280px]">
        <div className="text-zinc-400 font-bold border-b border-zinc-800/80 pb-1.5 mb-1.5 flex justify-between items-center gap-4">
          <span>{data.timeLabel}</span>
          <span className="text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-500 font-bold uppercase">Babak {data.round}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-blue-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Sudut Biru:
            </span>
            <span className="text-blue-400 font-black text-sm">{data.blue}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Sudut Merah:
            </span>
            <span className="text-red-400 font-black text-sm">{data.red}</span>
          </div>
          <div className="border-t border-zinc-800/50 my-1.5 pt-1.5 flex justify-between items-center">
            <span className="text-zinc-400 font-semibold">Selisih Poin:</span>
            <span className={`font-black text-sm ${isBlueLeading ? "text-blue-400" : isRedLeading ? "text-red-400" : "text-amber-400"}`}>
              {isBlueLeading ? `🔵 BIRU +${absGap}` : isRedLeading ? `🔴 MERAH +${absGap}` : "⚖️ SERI (0)"}
            </span>
          </div>
        </div>
        {data.message && (
          <div className="mt-2 border-t border-zinc-800/50 pt-1.5 text-[9px] text-zinc-500 uppercase leading-relaxed font-sans">
            {data.message}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function ScoreboardView({ 
  state, 
  onBack, 
  onToggleFullscreen, 
  isFullscreen 
}: ScoreboardViewProps) {
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [logoKiri, setLogoKiri] = useState<string>(() => {
    return localStorage.getItem("logo_kiri") || "";
  });
  const [logoKanan, setLogoKanan] = useState<string>(() => {
    return localStorage.getItem("logo_kanan") || "";
  });

  // Keep logos in sync if updated in another view/tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "logo_kiri") {
        setLogoKiri(e.newValue || "");
      } else if (e.key === "logo_kanan") {
        setLogoKanan(e.newValue || "");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    
    // Also poll/check periodically for instant local update in same page frames
    const interval = setInterval(() => {
      const currentKiri = localStorage.getItem("logo_kiri") || "";
      if (currentKiri !== logoKiri) {
        setLogoKiri(currentKiri);
      }
      const currentKanan = localStorage.getItem("logo_kanan") || "";
      if (currentKanan !== logoKanan) {
        setLogoKanan(currentKanan);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [logoKiri, logoKanan]);

  // Helper to parse logs and reconstruct the score timeline for the recharts line chart
  const getScoreHistoryData = (actionLogs: ActionLog[]) => {
    let blueHits = { pukulan: 0, tendangan: 0, jatuhan: 0 };
    let redHits = { pukulan: 0, tendangan: 0, jatuhan: 0 };
    let bluePenalties = { keluarGelanggang: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false };
    let redPenalties = { keluarGelanggang: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false };

    // Reverse to process chronologically (oldest first)
    const sortedLogs = [...actionLogs].reverse();

    const dataPoints: Array<{
      timeLabel: string;
      blue: number;
      red: number;
      gap: number;
      message: string;
      clockTime: string;
      round: number;
    }> = [];

    // Always start with 0-0 base point
    dataPoints.push({
      timeLabel: "Mulai",
      blue: 0,
      red: 0,
      gap: 0,
      message: "Pertandingan dimulai",
      clockTime: "02:00",
      round: 1
    });

    for (const log of sortedLogs) {
      const msg = log.message || "";
      const type = log.type || "";

      // Reset score tracking if there is a complete reset logged
      if (msg.includes("diatur ulang") || msg.includes("Direset") || msg.includes("diatur ulang sepenuhnya")) {
        blueHits = { pukulan: 0, tendangan: 0, jatuhan: 0 };
        redHits = { pukulan: 0, tendangan: 0, jatuhan: 0 };
        bluePenalties = { keluarGelanggang: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false };
        redPenalties = { keluarGelanggang: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false };
      }

      // Check corner from message / type
      const isBlue = msg.includes("Sudut BIRU") || msg.includes("Sudut Biru") || msg.includes("BIRU") || type.includes("blue");
      const isRed = msg.includes("Sudut MERAH") || msg.includes("Sudut Merah") || msg.includes("MERAH") || type.includes("red");
      const corner = isBlue ? "blue" : (isRed ? "red" : null);

      if (corner) {
        const hits = corner === "blue" ? blueHits : redHits;
        const pen = corner === "blue" ? bluePenalties : redPenalties;

        // 1. [SAH] Juri consensus inputs
        if (msg.includes("[SAH]")) {
          if (msg.includes("Pukulan")) {
            hits.pukulan += 1;
          } else if (msg.includes("Tendangan")) {
            hits.tendangan += 1;
          }
        }
        // 2. Dewan direct score changes
        else if (msg.includes("Dewan merubah skor Pukulan")) {
          const match = msg.match(/\(([-+]\d+) Poin\)/);
          if (match) {
            const val = parseInt(match[1], 10);
            hits.pukulan = Math.max(0, hits.pukulan + val);
          }
        } else if (msg.includes("Dewan merubah skor Tendangan")) {
          const match = msg.match(/\(([-+]\d+) Poin\)/);
          if (match) {
            const val = parseInt(match[1], 10) / 2; // Each kick count is 2 pts
            hits.tendangan = Math.max(0, hits.tendangan + val);
          }
        } else if (msg.includes("Bantingan / Jatuhan")) {
          const match = msg.match(/\(([-+]\d+) Poin\)/);
          if (match) {
            const val = parseInt(match[1], 10) / 3; // Each fall count is 3 pts
            hits.jatuhan = Math.max(0, hits.jatuhan + val);
          }
        }
        // 3. Penalties
        else if (msg.includes("Teguran 1")) {
          pen.teguran1 = true;
        } else if (msg.includes("Teguran 2")) {
          pen.teguran2 = true;
        } else if (msg.includes("Peringatan 1")) {
          pen.peringatan1 = true;
        } else if (msg.includes("Peringatan 2")) {
          pen.peringatan2 = true;
        } else if (msg.includes("Peringatan 3 (Diskualifikasi)")) {
          pen.peringatan3 = true;
        } else if (msg.includes("Batal Diskualifikasi")) {
          pen.peringatan3 = false;
        } else if (msg.includes("Keluar Gelanggang")) {
          pen.keluarGelanggang += 1;
        }
      }

      // Calculate totals at this log step
      const bluePoints = (blueHits.pukulan * 1) + (blueHits.tendangan * 2) + (blueHits.jatuhan * 3);
      let bluePenDeduction = 0;
      bluePenDeduction += bluePenalties.keluarGelanggang * -1;
      if (bluePenalties.teguran1) bluePenDeduction += -1;
      if (bluePenalties.teguran2) bluePenDeduction += -2;
      if (bluePenalties.peringatan1) bluePenDeduction += -5;
      if (bluePenalties.peringatan2) bluePenDeduction += -10;
      const blueTotal = bluePoints + bluePenDeduction;

      const redPoints = (redHits.pukulan * 1) + (redHits.tendangan * 2) + (redHits.jatuhan * 3);
      let redPenDeduction = 0;
      redPenDeduction += redPenalties.keluarGelanggang * -1;
      if (redPenalties.teguran1) redPenDeduction += -1;
      if (redPenalties.teguran2) redPenDeduction += -2;
      if (redPenalties.peringatan1) redPenDeduction += -5;
      if (redPenalties.peringatan2) redPenDeduction += -10;
      const redTotal = redPoints + redPenDeduction;

      const gap = blueTotal - redTotal;

      // Only push score/penalty/round updates or major events to keep chart readable
      if (
        type.startsWith("score_") || 
        type.startsWith("penalty_") || 
        type === "round" || 
        msg.includes("dimulai") ||
        msg.includes("selesai")
      ) {
        dataPoints.push({
          timeLabel: `B${log.round} - ${log.clockTime}`,
          blue: blueTotal,
          red: redTotal,
          gap: gap,
          message: msg,
          clockTime: log.clockTime,
          round: log.round
        });
      }
    }

    return dataPoints;
  };

  const chartData = getScoreHistoryData(state.actionLogs);

  const {
    tournamentName,
    arena,
    matchNumber,
    classCategory,
    athleteBlue,
    athleteRed,
    round,
    timeRemaining,
    scores,
    penalties,
    winner,
    winnerDecision,
    juriActiveIndicators,
  } = state;

  // Auto-trigger visual summary modal when match concludes (winner changes to a truthy value)
  useEffect(() => {
    if (winner) {
      setIsSummaryOpen(true);
    } else {
      setIsSummaryOpen(false);
    }
  }, [winner]);

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Helper to render active lights of penalties
  const renderBinaanDots = (count: number) => {
    return (
      <div className="flex gap-1 justify-center mt-1">
        <span className={`w-3 h-3 rounded-full border border-gray-600 transition-all ${count >= 1 ? "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "bg-zinc-800"}`} />
        <span className={`w-3 h-3 rounded-full border border-gray-600 transition-all ${count >= 2 ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" : "bg-zinc-800"}`} />
      </div>
    );
  };

  const parsedClass = parseClassCategory(classCategory);
  const formattedPartai = matchNumber ? matchNumber.toString().padStart(2, "0") : "01";
  const formattedKelas = `${parsedClass.kelas} ${parsedClass.gender}`;
  const formattedUsia = parsedClass.usia;
  const formattedTahap = parsedClass.tahap;

  return (
    <div id="scoreboard-view-container" className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between p-4 font-sans select-none overflow-hidden">
      
      {/* Top Action Bar: Kembali (Kiri) & Full Screen (Kanan) */}
      {isFullscreen ? (
        <div className="fixed top-0 right-0 z-50 w-80 h-24 flex items-start justify-end p-4 group pointer-events-none">
          <div className="flex gap-2 bg-zinc-950/95 border border-zinc-800 rounded-2xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-300 transform origin-top-right">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              title="Kembali ke Menu Utama"
            >
              <ArrowLeft size={14} /> Kembali
            </button>

            {winner && (
              <button
                onClick={() => setIsSummaryOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-xs font-black transition-all cursor-pointer"
                title="Buka Laporan Hasil Pertandingan"
              >
                <Trophy size={13} className="text-amber-400 animate-pulse" /> Hasil
              </button>
            )}

            <button
              onClick={onToggleFullscreen}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              title="Layar Normal"
            >
              <Maximize2 size={14} /> Layar Normal
            </button>
          </div>
          {/* Transparent pointer activator so user has a 24x24 px hot area right in the top right corner */}
          <div className="absolute top-0 right-0 w-24 h-24 pointer-events-auto bg-transparent z-10" />
        </div>
      ) : (
        <div className="flex justify-between items-center mb-3 px-1">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="Kembali ke Menu Utama"
          >
            <ArrowLeft size={14} /> Kembali
          </button>

          {winner && (
            <button
              onClick={() => setIsSummaryOpen(true)}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl border border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)] uppercase tracking-wider cursor-pointer"
              title="Buka Laporan Hasil Pertandingan"
            >
              <Trophy size={13} className="text-amber-400 animate-pulse" /> Laporan Hasil
            </button>
          )}

          <button
            onClick={onToggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="Toggle Layar Penuh"
          >
            <Maximize2 size={14} /> Layar Penuh
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-[#050212]/95 rounded-3xl py-5 md:py-6 px-0 flex items-center justify-between shadow-[0_15px_35px_rgba(0,0,0,0.5)] gap-4 min-h-[140px] relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-yellow-500/5 pointer-events-none" />

        {/* Left Logo - Pushed completely to the left edge */}
        <div className="flex items-center justify-start pl-0 min-w-[120px] max-w-[180px]">
          <img 
            src={logoKiri || logoMonitor1Default} 
            referrerPolicy="no-referrer"
            alt="Logo Kiri" 
            className="max-h-[125px] w-auto object-contain transition-transform duration-350 hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = logoMonitor1Default;
            }}
          />
        </div>

        {/* Center Information */}
        <div className="flex-1 flex flex-col items-center text-center px-4">
          {/* Top Sub-title */}
          <span className="text-[10px] md:text-xs font-black tracking-[0.22em] text-[#f97316] uppercase mb-1 md:mb-1.5 font-sans">
            IKATAN PENCAK SILAT INDONESIA
          </span>

          {/* Main Title with the exact grand gradient */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-black tracking-tight uppercase leading-none mb-2 md:mb-3 bg-gradient-to-r from-[#b19ffa] via-[#ec4899] via-[#f97316] to-[#eab308] text-transparent bg-clip-text drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            {tournamentName || "TURNAMEN PENCAK SILAT INDONESIA"}
          </h1>

          {/* Bottom metadata row */}
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[10px] md:text-xs font-semibold tracking-wider uppercase font-sans text-zinc-400">
            <span>Partai:</span>
            <span className="text-white font-black">{formattedPartai}</span>
            <span className="text-zinc-700 px-1 font-normal">|</span>
            <span>Kelas:</span>
            <span className="text-white font-black">{formattedKelas}</span>
            <span className="text-zinc-700 px-1 font-normal">|</span>
            <span>Usia:</span>
            <span className="text-white font-black">{formattedUsia}</span>
            <span className="text-zinc-700 px-1 font-normal">|</span>
            <span>Tahap:</span>
            <span className="text-white font-black">{formattedTahap}</span>
          </div>
        </div>

        {/* Right Logo - Pushed completely to the right edge */}
        <div className="flex items-center justify-end pr-0 min-w-[120px] max-w-[180px]">
          <img 
            src={logoKanan || logoMonitor2Default} 
            referrerPolicy="no-referrer"
            alt="Logo Kanan" 
            className="max-h-[125px] w-auto object-contain transition-transform duration-350 hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = logoMonitor2Default;
            }}
          />
        </div>
      </div>

      {/* 2. Winner Overlay Banner (If Match Ended) */}
      {winner && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-center py-3.5 my-2.5 rounded-xl text-lg md:text-2xl tracking-widest uppercase shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-bounce flex items-center justify-center gap-3">
          🏆 PEMENANG: SUDUT {winner === "blue" ? "BIRU" : "MERAH"} ({winner === "blue" ? athleteBlue.name : athleteRed.name}) - {winnerDecision} 🏆
        </div>
      )}

      {/* 3. Central Arena Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 my-3 items-stretch flex-1">
        
        {/* SUDUT BIRU (BLUE CORNER) - LEFT */}
        <div className="lg:col-span-5 bg-gradient-to-b from-blue-950/90 to-blue-900/40 border-2 border-blue-600/80 rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_40px_rgba(37,99,235,0.15)] relative overflow-hidden group">
          {/* Decorative Corner Watermark */}
          <div className="absolute -top-10 -left-10 text-blue-500/5 text-9xl font-black italic select-none pointer-events-none group-hover:scale-110 transition-transform duration-700">
            BLUE
          </div>

          <div>
            <div className="flex justify-between items-start border-b border-blue-500/20 pb-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight line-clamp-1 drop-shadow-md">
                  {athleteBlue.name || "ATLET BIRU"}
                </h2>
                <p className="text-sm text-blue-300 font-medium tracking-wide mt-1 uppercase">
                  {athleteBlue.contingent || "KONTINGEN"}
                </p>
              </div>
            </div>

            {/* Main Score Display centered */}
            <div className="flex items-center justify-center mt-6">
              {/* GIANT LED DIGITS */}
              <div className="relative text-center">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl" />
                <span className="text-[9rem] md:text-[11rem] font-mono font-black text-white tracking-tighter leading-none led-glow-blue">
                  {scores.blue.total}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Juri Consensus Lights & Status */}
          <div className="mt-6 border-t border-blue-500/10 pt-4">
            <span className="text-[10px] font-mono text-zinc-400 uppercase block tracking-wider mb-2.5">Indikator Input Real-Time Juri (2-dari-3)</span>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((jNum) => {
                const jKey = `j${jNum}` as "j1" | "j2" | "j3";
                const val = juriActiveIndicators.blue[jKey];
                const isPressed = val !== null;
                
                return (
                  <div 
                    key={jNum} 
                    className={`rounded-xl py-2 px-1 text-center font-mono text-xs border border-zinc-800 transition-all duration-300 ${
                      isPressed 
                        ? "bg-blue-600 border-blue-400 text-white font-black scale-105 shadow-[0_0_15px_rgba(37,99,235,0.6)]" 
                        : "bg-zinc-900/60 text-zinc-500"
                    }`}
                  >
                    <span className="text-[9px] text-zinc-400 block tracking-widest font-bold">JURI {jNum}</span>
                    <span className="text-[11px] block mt-0.5 uppercase tracking-tight">
                      {isPressed ? (val === "pukulan" ? "👊 PUKULAN" : "🦵 TENDANGAN") : "SILENT"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active Penalties Grid */}
            <div className="mt-5 bg-zinc-950/60 border border-blue-500/10 p-3 rounded-2xl grid grid-cols-4 gap-2 text-center text-xs font-semibold">
              <div>
                <span className="text-[9px] text-zinc-400 block mb-0.5">BINAAN</span>
                {renderBinaanDots(penalties.blue.binaan)}
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 block mb-0.5">TEGURAN</span>
                <div className="flex gap-1 justify-center">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border ${penalties.blue.teguran1 ? "bg-amber-500 text-zinc-950 border-amber-300" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>T1</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border ${penalties.blue.teguran2 ? "bg-amber-600 text-zinc-950 border-amber-300" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>T2</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 block mb-0.5">PERINGATAN</span>
                <div className="flex gap-1 justify-center">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border ${penalties.blue.peringatan1 ? "bg-red-500 text-white border-red-300 shadow-[0_0_5px_rgba(239,68,68,0.5)]" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>P1</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border ${penalties.blue.peringatan2 ? "bg-red-600 text-white border-red-400 shadow-[0_0_5px_rgba(220,38,38,0.6)]" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>P2</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 block mb-0.5">KELUAR (KG)</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${penalties.blue.keluarGelanggang > 0 ? "bg-red-500 text-white animate-pulse" : "bg-zinc-800 text-zinc-500"}`}>
                  {penalties.blue.keluarGelanggang}x
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TIMER AND ROUNDS - MIDDLE */}
        <div className="lg:col-span-2 flex flex-col justify-between w-full h-full min-h-[500px] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl items-center relative text-center">
          
          {/* Left Custom Dynamic Logo Container */}
          <div className="w-full flex items-center justify-center min-h-[110px] relative overflow-hidden group">
            <div className="relative flex flex-col items-center justify-center gap-2 max-w-full">
              <img 
                src={logoKiri || logoIpsiDefault} 
                referrerPolicy="no-referrer"
                alt="Logo IPSI" 
                className="max-h-[100px] w-auto max-w-[160px] object-contain transition-all duration-500 transform hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = logoIpsiDefault;
                }}
              />
            </div>
          </div>

          {/* Gap Rule Tracker Active Banner */}
          {state.gapRuleTracker && state.gapRuleTracker.active && (
            <div className="w-full mt-2 bg-red-950/90 border-2 border-red-500 rounded-2xl p-3 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse flex flex-col items-center justify-center gap-1 z-20">
              <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-black uppercase tracking-wider font-mono">
                <AlertTriangle size={14} className="animate-bounce" /> SELISIH POINT UNGGUL (&gt;= 30 POIN)
              </div>
              <p className="text-[10px] text-zinc-300 font-sans leading-tight">
                Sudut <span className={state.gapRuleTracker.losingCorner === "blue" ? "text-blue-400 font-bold" : "text-red-400 font-bold"}>{state.gapRuleTracker.losingCorner === "blue" ? "BIRU" : "MERAH"}</span> tertinggal 30+ poin & harus menambah nilai!
              </p>
              <div className="text-xs font-black font-mono text-white flex items-center gap-1.5 mt-1 bg-black/40 px-3 py-1 rounded-full border border-red-500/20">
                <span>DISKUALIFIKASI DALAM:</span>
                <span className="text-red-400 font-extrabold text-sm">{60 - state.gapRuleTracker.secondsElapsed}s</span>
              </div>
            </div>
          )}

          {/* Clock Timer Unit - Perfectly Centered Vertically */}
          <div className="my-auto py-4 flex flex-col items-center justify-center relative w-full">
            
            {/* Elegant Circular Ring Timer */}
            <div className="relative w-44 h-44 flex flex-col items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Background Track */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  className="stroke-zinc-800/50"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Foreground Active Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  className={`transition-all duration-1000 ease-out ${
                    timeRemaining <= 10 
                      ? "stroke-red-500" 
                      : "stroke-teal-400"
                  }`}
                  strokeWidth="6"
                  strokeDasharray="439.8"
                  strokeDashoffset={439.8 * (1 - Math.min(1, Math.max(0, timeRemaining / (state.roundDuration || 120))))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Central Information Stack */}
              <div className="relative flex flex-col items-center justify-center z-10">
                {/* Active Round label */}
                <span className={`text-xs font-black tracking-widest font-mono mb-1 uppercase transition-all duration-500 ${
                  Number(round) === 3 
                    ? "text-amber-400 animate-pulse" 
                    : "text-zinc-400"
                }`}>
                  BABAK {round}
                </span>

                {/* Countdown Text */}
                <span className={`text-4xl font-mono font-black tracking-tighter transition-all duration-300 ${
                  timeRemaining <= 10 
                    ? "text-red-500 animate-pulse led-glow-red" 
                    : "text-teal-400 led-glow-teal"
                }`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Custom Dynamic Logo Container */}
          <div className="w-full flex items-center justify-center min-h-[110px] relative overflow-hidden group">
            <div className="relative flex flex-col items-center justify-center gap-2 max-w-full">
              <img 
                src={logoKanan || defaultLogo} 
                referrerPolicy="no-referrer"
                alt="Logo Penyelenggara" 
                className="max-h-[100px] w-auto max-w-[160px] object-contain transition-all duration-500 transform hover:scale-105"
                onError={(e) => {
                  // Fallback to default in case of base64 error or invalid URL
                  e.currentTarget.src = defaultLogo;
                }}
              />
            </div>
          </div>
        </div>

        {/* SUDUT MERAH (RED CORNER) - RIGHT */}
        <div className="lg:col-span-5 bg-gradient-to-b from-red-950/90 to-red-900/40 border-2 border-red-600/80 rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_40px_rgba(220,38,38,0.15)] relative overflow-hidden group">
          {/* Decorative Corner Watermark */}
          <div className="absolute -top-10 -right-10 text-red-500/5 text-9xl font-black italic select-none pointer-events-none group-hover:scale-110 transition-transform duration-700">
            RED
          </div>

          <div>
            <div className="flex justify-end items-start border-b border-red-500/20 pb-4">
              <div className="text-right">
                <h2 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight line-clamp-1 drop-shadow-md">
                  {athleteRed.name || "ATLET MERAH"}
                </h2>
                <p className="text-sm text-red-300 font-medium tracking-wide mt-1 uppercase">
                  {athleteRed.contingent || "KONTINGEN"}
                </p>
              </div>
            </div>

            {/* Main Score Display centered */}
            <div className="flex items-center justify-center mt-6">
              {/* GIANT LED DIGITS */}
              <div className="relative text-center">
                <div className="absolute inset-0 bg-red-500/10 rounded-full blur-3xl" />
                <span className="text-[9rem] md:text-[11rem] font-mono font-black text-white tracking-tighter leading-none led-glow-red">
                  {scores.red.total}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Juri Consensus Lights & Status */}
          <div className="mt-6 border-t border-red-500/10 pt-4">
            <span className="text-[10px] font-mono text-zinc-400 uppercase block tracking-wider mb-2.5 text-right">Indikator Input Real-Time Juri (2-dari-3)</span>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((jNum) => {
                const jKey = `j${jNum}` as "j1" | "j2" | "j3";
                const val = juriActiveIndicators.red[jKey];
                const isPressed = val !== null;
                
                return (
                  <div 
                    key={jNum} 
                    className={`rounded-xl py-2 px-1 text-center font-mono text-xs border border-zinc-800 transition-all duration-300 ${
                      isPressed 
                        ? "bg-red-600 border-red-400 text-white font-black scale-105 shadow-[0_0_15px_rgba(239,68,68,0.6)]" 
                        : "bg-zinc-900/60 text-zinc-500"
                    }`}
                  >
                    <span className="text-[9px] text-zinc-400 block tracking-widest font-bold">JURI {jNum}</span>
                    <span className="text-[11px] block mt-0.5 uppercase tracking-tight">
                      {isPressed ? (val === "pukulan" ? "👊 PUKULAN" : "🦵 TENDANGAN") : "SILENT"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active Penalties Grid */}
            <div className="mt-5 bg-zinc-950/60 border border-red-500/10 p-3 rounded-2xl grid grid-cols-4 gap-2 text-center text-xs font-semibold">
              <div>
                <span className="text-[9px] text-zinc-400 block mb-0.5">BINAAN</span>
                {renderBinaanDots(penalties.red.binaan)}
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 block mb-0.5">TEGURAN</span>
                <div className="flex gap-1 justify-center">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border ${penalties.red.teguran1 ? "bg-amber-500 text-zinc-950 border-amber-300" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>T1</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border ${penalties.red.teguran2 ? "bg-amber-600 text-zinc-950 border-amber-300" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>T2</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 block mb-0.5">PERINGATAN</span>
                <div className="flex gap-1 justify-center">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border ${penalties.red.peringatan1 ? "bg-red-500 text-white border-red-300 shadow-[0_0_5px_rgba(239,68,68,0.5)]" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>P1</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border ${penalties.red.peringatan2 ? "bg-red-600 text-white border-red-400 shadow-[0_0_5px_rgba(220,38,38,0.6)]" : "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>P2</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 block mb-0.5">KELUAR (KG)</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${penalties.red.keluarGelanggang > 0 ? "bg-red-500 text-white animate-pulse" : "bg-zinc-800 text-zinc-500"}`}>
                  {penalties.red.keluarGelanggang}x
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* VERIFIKASI DEWAN ACTIVE OVERLAY */}
      {state.verification?.isActive && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col justify-between p-8 font-sans animate-fade-in">
          {/* Top Logo and Header */}
          <div className="flex justify-between items-center border-b border-zinc-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-red-600 animate-pulse" />
              <span className="text-sm font-black tracking-[0.2em] text-red-500 uppercase font-mono">
                SESI VERIFIKASI DEWAN AKTIF
              </span>
            </div>
            <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-bold">
              LAYAR UTAMA MONITOR SCOREBOARD
            </span>
          </div>

          {/* Central Voting Display */}
          <div className="flex-1 flex flex-col items-center justify-center my-6 max-w-4xl mx-auto w-full">
            <span className="text-zinc-500 text-xs font-mono tracking-widest uppercase mb-1">Perkara Peninjauan Juri</span>
            <h2 className="text-6xl md:text-7xl font-black text-amber-400 uppercase tracking-widest text-center filter drop-shadow-[0_4px_20px_rgba(234,179,8,0.3)]">
              KATEGORI: {state.verification.category}
            </h2>
            <div className="h-1.5 w-40 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full mt-6 mb-12" />

            {/* Judges Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-8">
              {[1, 2, 3].map((num) => {
                const vote = state.verification.juriVotes[`j${num}` as "j1" | "j2" | "j3"];
                const isVoted = vote !== null;
                const isCompleted = state.verification.juriVotes.j1 && state.verification.juriVotes.j2 && state.verification.juriVotes.j3;

                return (
                  <div 
                    key={num}
                    className={`border rounded-3xl p-6 flex flex-col items-center justify-center min-h-[180px] transition-all duration-300 ${
                      isVoted 
                        ? "bg-[#0c0423]/60 border-emerald-500/50 shadow-[0_4px_30px_rgba(16,185,129,0.1)]" 
                        : "bg-zinc-950/40 border-zinc-900 animate-pulse"
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">PANEL PENILAI</span>
                    <h3 className="text-xl font-black text-white mt-1 uppercase tracking-wider mb-4">JURI {num}</h3>

                    {isVoted ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        {isCompleted ? (
                          /* Show actual vote choice once consensus is completed */
                          <div className={`px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider text-center w-full ${
                            vote === "BIRU" 
                              ? "bg-blue-950/40 border-blue-600/50 text-blue-400" 
                              : vote === "MERAH" 
                                ? "bg-red-950/40 border-red-600/50 text-red-400" 
                                : "bg-zinc-950/80 border-zinc-700 text-zinc-400"
                          }`}>
                            {vote === "BIRU" ? "🔵 SUDUT BIRU" : vote === "MERAH" ? "🔴 SUDUT MERAH" : "❌ TIDAK SAH"}
                          </div>
                        ) : (
                          /* Mask individual choices before completion to keep suspense */
                          <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wide flex items-center gap-1.5 animate-pulse">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" /> SUARA DIKUNCI
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 border-2 border-dashed border-zinc-800 rounded-full animate-spin border-t-amber-500" />
                        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">MENUNGGU...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Consensus Output Banner */}
            {state.verification.juriVotes.j1 && state.verification.juriVotes.j2 && state.verification.juriVotes.j3 ? (
              <div className="w-full flex flex-col items-center animate-fade-in mt-4">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 font-semibold">HASIL KEPUTUSAN RESMI DEWAN</span>
                
                <div className="w-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-zinc-950 font-black text-center py-6 px-10 rounded-3xl text-3xl tracking-widest uppercase shadow-[0_0_50px_rgba(245,158,11,0.5)] border border-yellow-300 relative overflow-hidden flex items-center justify-center gap-3">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.25)_0%,transparent_70%)] pointer-events-none" />
                  🏆 {state.verification.consensusResult} 🏆
                </div>
              </div>
            ) : (
              <div className="text-center animate-pulse mt-4">
                <p className="text-sm font-mono text-zinc-400 tracking-wider uppercase">
                  PEMUNGUTAN SUARA DEWAN SEDANG BERLANGSUNG • MOHON MENUNGGU KEPUTUSAN JURI...
                </p>
              </div>
            )}
          </div>

          {/* Bottom Footer Details */}
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono uppercase border-t border-zinc-900 pt-5">
            <span>PERTANDINGAN: PARTAI {matchNumber} • KELAS {classCategory}</span>
            <span>JRZ SCORE TGR • SISTEM RESMI IPSI 2026 &amp; PERSILAT</span>
          </div>
        </div>
      )}

      <VisualSummaryModal 
        state={state} 
        isOpen={isSummaryOpen} 
        onClose={() => setIsSummaryOpen(false)} 
      />

    </div>
  );
}
