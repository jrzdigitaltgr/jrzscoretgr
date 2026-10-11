import React, { useState } from "react";
import { MatchState } from "../types";
import { Trophy, Copy, Check, X, Award, Shield, FileText, Calendar } from "lucide-react";
import { motion } from "motion/react";

interface VisualSummaryModalProps {
  state: MatchState;
  isOpen: boolean;
  onClose: () => void;
}

export default function VisualSummaryModal({ state, isOpen, onClose }: VisualSummaryModalProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen || !state || !state.winner) return null;

  const {
    tournamentName,
    arena,
    matchNumber,
    classCategory,
    athleteBlue,
    athleteRed,
    scores,
    winner,
    winnerDecision,
  } = state;

  const isBlueWinner = winner === "blue";
  const winnerName = isBlueWinner ? athleteBlue.name : athleteRed.name;
  const winnerContingent = isBlueWinner ? athleteBlue.contingent : athleteRed.contingent;
  const loserName = isBlueWinner ? athleteRed.name : athleteBlue.name;
  const loserContingent = isBlueWinner ? athleteRed.contingent : athleteBlue.contingent;

  // Generate a neat, professional match report string for quick reporting
  const generateReportText = () => {
    return `🏆 *LAPORAN RESMI HASIL PERTANDINGAN* 🏆
---------------------------------------------
Event      : ${tournamentName || "Kejuaraan Pencak Silat IPSI"}
Gelanggang : Gelanggang ${arena || "A"}
Partai     : Partai #${matchNumber || "0"}
Kelas      : ${classCategory || "Tanding"}
---------------------------------------------
🔵 SUDUT BIRU:
Nama       : ${athleteBlue.name || "Pesilat Biru"}
Kontingen  : ${athleteBlue.contingent || "-"}
Total Skor : ${scores.blue.total}

🔴 SUDUT MERAH:
Nama       : ${athleteRed.name || "Pesilat Merah"}
Kontingen  : ${athleteRed.contingent || "-"}
Total Skor : ${scores.red.total}
---------------------------------------------
🏅 *PEMENANG*: SUDUT ${winner === "blue" ? "BIRU" : "MERAH"}
Atlet      : ${winnerName} (${winnerContingent})
Keputusan  : ${winnerDecision || "Menang Angka"}
---------------------------------------------
Dihasilkan secara otomatis oleh IPSI Official Terminal Control.`;
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateReportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy report text: ", err);
    }
  };

  return (
    <motion.div 
      id="visual-summary-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-[#020612]/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 font-sans"
    >
      <motion.div 
        id="visual-summary-modal-card"
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 140 }}
        className="bg-gradient-to-b from-[#0a162d] via-[#060e1d] to-[#030712] border-2 border-yellow-500/70 rounded-3xl max-w-xl w-full shadow-[0_0_60px_rgba(234,179,8,0.25)] overflow-hidden flex flex-col max-h-[95vh] relative text-white"
      >
        {/* Glow accent bar on top */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-yellow-400" />

        {/* Top Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-[#060e1d]/80 hover:bg-[#0f2244] p-2 rounded-full border border-yellow-500/30 transition-colors cursor-pointer z-10 shadow"
          title="Tutup"
        >
          <X size={16} />
        </button>

        {/* Scrollable Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 custom-scrollbar text-white flex flex-col justify-between">
          
          {!showDetails ? (
            // =========================================================================
            // CINEMATIC VICTORY VISUAL SCREEN (Visual Pemenang)
            // =========================================================================
            <div className="space-y-6 text-center py-4">
              {/* Giant Golden Trophy Emblem with Wreath Glow */}
              <motion.div 
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", damping: 12, stiffness: 100 }}
                className="relative flex justify-center items-center"
              >
                <div className="absolute w-28 h-28 bg-yellow-500/20 rounded-full blur-2xl animate-pulse" />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 border-2 border-yellow-200 flex items-center justify-center text-slate-950 shadow-[0_0_40px_rgba(234,179,8,0.6)]">
                  <Trophy size={40} className="animate-bounce text-slate-950" />
                </div>
              </motion.div>

              {/* Victory Badge */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-1"
              >
                <span className="text-[10px] font-black tracking-[0.4em] text-yellow-400 block font-mono uppercase">
                  PEMENANG PERTANDINGAN
                </span>
                <span className="text-[9px] text-cyan-300/80 font-mono tracking-widest uppercase block mt-1">
                  GELANGGANG {arena || "A"} • PARTAI #{matchNumber}
                </span>
              </motion.div>

              {/* Winner Corner Large Card */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, type: "spring", damping: 15, stiffness: 80 }}
                className={`p-6 rounded-2xl border-2 shadow-xl transition-all duration-300 ${
                  isBlueWinner 
                    ? "bg-gradient-to-b from-[#081a3d] to-[#040e24] border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.35)]" 
                    : "bg-gradient-to-b from-[#3d0808] to-[#240404] border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.35)]"
                }`}
              >
                <span className={`text-[10px] font-black tracking-widest uppercase px-3.5 py-1 rounded-full border shadow ${
                  isBlueWinner
                    ? "bg-blue-600/40 border-blue-400 text-blue-200"
                    : "bg-red-600/40 border-red-400 text-red-200"
                }`}>
                  SUDUT {isBlueWinner ? "BIRU" : "MERAH"}
                </span>

                <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-wide mt-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  {winnerName}
                </h1>

                <p className="text-xs text-zinc-300 uppercase font-bold tracking-widest font-mono mt-1.5">
                  KONTINGEN: <span className="text-cyan-300 font-black">{winnerContingent || "-"}</span>
                </p>
              </motion.div>

              {/* Match Score & Decision Summary */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-[#050b16] border border-[#162540] rounded-2xl p-4 flex justify-between items-center max-w-sm mx-auto shadow-inner"
              >
                <div className="text-left">
                  <span className="text-[8px] font-black text-zinc-400 block font-mono">JENIS KEPUTUSAN</span>
                  <span className="text-xs font-black text-yellow-400 uppercase tracking-wide">{winnerDecision || "MENANG ANGKA"}</span>
                </div>
                <div className="h-6 w-[1px] bg-[#162540]" />
                <div className="text-right">
                  <span className="text-[8px] font-black text-zinc-400 block font-mono">SKOR AKHIR</span>
                  <span className="text-sm font-black font-mono">
                    <span className="text-blue-400">{scores.blue.total}</span>
                    <span className="text-zinc-500 px-1.5">-</span>
                    <span className="text-red-400">{scores.red.total}</span>
                  </span>
                </div>
              </motion.div>

              {/* Action Buttons inside Victory screen */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                className="pt-2 flex flex-col gap-2 max-w-xs mx-auto"
              >
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="w-full bg-[#08152c] hover:bg-[#0f244a] text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 font-extrabold text-[10px] uppercase py-3 rounded-xl tracking-wider transition-all cursor-pointer text-center shadow active:scale-95"
                >
                  📄 DETAIL SKOR & SALIN LAPORAN
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-[10px] uppercase py-3 rounded-xl tracking-wider transition-all cursor-pointer text-center shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-95"
                >
                  TUTUP & KEMBALI
                </button>
              </motion.div>
            </div>
          ) : (
            // =========================================================================
            // DETAILED SCORE matrix & REPORT COPY AREA (Detailed View)
            // =========================================================================
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-[#162540] pb-2">
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                  RINCIAN LAPORAN PERTANDINGAN
                </span>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  ◀ KEMBALI KE VISUAL
                </button>
              </div>

              {/* Tournament Context Header */}
              <div className="text-center bg-[#050b16] p-2.5 rounded-xl border border-[#162540]">
                <span className="text-[8px] font-bold text-amber-400 font-mono tracking-widest block uppercase">
                  {tournamentName || "KEJUARAAN PENCAK SILAT"}
                </span>
                <span className="text-[10px] font-black tracking-wide block uppercase mt-0.5">
                  KELAS {classCategory || "TANDING"}
                </span>
              </div>

              {/* Scores side-by-side comparison matrix */}
              <div className="grid grid-cols-2 gap-3">
                {/* Blue Score Column */}
                <div className={`rounded-xl p-3 border flex flex-col justify-between ${
                  isBlueWinner 
                    ? "bg-[#06152e] border-blue-500/70 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                    : "bg-[#050b16] border-[#162540]"
                }`}>
                  <div className="border-b border-[#162540] pb-1 flex justify-between items-center">
                    <span className="text-[9px] font-black text-blue-400 tracking-wider">SUDUT BIRU</span>
                    {isBlueWinner && <span className="text-[8px] text-amber-400 font-bold">👑 WIN</span>}
                  </div>

                  <div className="my-2.5 text-center">
                    <span className="text-2xl font-mono font-black tracking-wider text-blue-400 block">
                      {scores.blue.total}
                    </span>
                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      TOTAL SCORE
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[9px] font-mono text-zinc-400 border-t border-[#162540] pt-1.5">
                    <div className="flex justify-between">
                      <span>Pukulan (+1)</span>
                      <span className="text-white">{scores.blue.pukulan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tendangan (+2)</span>
                      <span className="text-white">{scores.blue.tendangan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jatuhan (+3)</span>
                      <span className="text-white">{scores.blue.jatuhan}</span>
                    </div>
                    <div className="flex justify-between text-red-400 font-bold border-t border-[#162540] pt-0.5 mt-0.5">
                      <span>Hukuman</span>
                      <span>-{scores.blue.hukuman}</span>
                    </div>
                  </div>
                </div>

                {/* Red Score Column */}
                <div className={`rounded-xl p-3 border flex flex-col justify-between ${
                  !isBlueWinner 
                    ? "bg-[#290707] border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                    : "bg-[#050b16] border-[#162540]"
                }`}>
                  <div className="border-b border-[#162540] pb-1 flex justify-between items-center">
                    <span className="text-[9px] font-black text-red-400 tracking-wider">SUDUT MERAH</span>
                    {!isBlueWinner && <span className="text-[8px] text-amber-400 font-bold">👑 WIN</span>}
                  </div>

                  <div className="my-2.5 text-center">
                    <span className="text-2xl font-mono font-black tracking-wider text-red-400 block">
                      {scores.red.total}
                    </span>
                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      TOTAL SCORE
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[9px] font-mono text-zinc-400 border-t border-[#162540] pt-1.5">
                    <div className="flex justify-between">
                      <span>Pukulan (+1)</span>
                      <span className="text-white">{scores.red.pukulan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tendangan (+2)</span>
                      <span className="text-white">{scores.red.tendangan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jatuhan (+3)</span>
                      <span className="text-white">{scores.red.jatuhan}</span>
                    </div>
                    <div className="flex justify-between text-red-400 font-bold border-t border-[#162540] pt-0.5 mt-0.5">
                      <span>Hukuman</span>
                      <span>-{scores.red.hukuman}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Reporting Textbox area (Copy to Telegram/WA) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black tracking-widest text-zinc-400 font-mono uppercase flex items-center gap-1.5">
                    <FileText size={10} className="text-amber-400" /> RINGKASAN HASIL UNTUK WA / TELEGRAM
                  </label>
                  <button
                    onClick={handleCopyToClipboard}
                    className="text-[8px] font-bold bg-[#08152c] hover:bg-[#0f244a] text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer shadow"
                  >
                    {copied ? <Check size={8} className="text-emerald-400" /> : <Copy size={8} />}
                    {copied ? "Tersalin!" : "Salin Laporan"}
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={3}
                  value={generateReportText()}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full bg-[#030712] border border-[#162540] focus:border-cyan-400 rounded-xl p-2.5 text-[9px] text-cyan-200 font-mono resize-none select-all"
                  placeholder="Memuat ringkasan..."
                />
              </div>

              {/* Copy Full Laporan Button & Close */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-[10px] uppercase py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-900/30"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "BERHASIL DISALIN!" : "SALIN LAPORAN"}
                </button>
                
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 bg-[#08152c] hover:bg-[#0f244a] text-zinc-300 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer border border-[#1a2c4a]"
                >
                  Kembali
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}
