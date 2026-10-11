import React, { useState } from "react";
import { X, Trophy, RefreshCw, Trash2, Printer, Download, Settings, Zap } from "lucide-react";
import { Athlete } from "../types";

interface BracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  athleteGroups: any[];
  getBracketDataForGroup: (groupKey: string) => any[];
  scheduleItems: any[];
  handleAutoShuffleDrawing: (groupKey: string) => void;
  handleClearClass: (groupKey: string) => void;
  handleDownloadBracketPDF: () => void;
  handleDownloadAllBracketsPDF: () => void;
  resolvePlayerUI: (p: any, matchId: string, role: 'p1' | 'p2', groupKey: string) => { name: string; contingent: string };
}

export default function BracketModal({
  isOpen,
  onClose,
  selectedGroup,
  setSelectedGroup,
  athleteGroups,
  getBracketDataForGroup,
  scheduleItems,
  handleAutoShuffleDrawing,
  handleClearClass,
  handleDownloadBracketPDF,
  handleDownloadAllBracketsPDF,
  resolvePlayerUI
}: BracketModalProps) {
  const [bracketSideMode, setBracketSideMode] = useState<"dua" | "satu">("dua");
  const [isDrawingSettingsOpen, setIsDrawingSettingsOpen] = useState(false);

  if (!isOpen) return null;

  const currentGroup = athleteGroups.find(g => g.key === selectedGroup) || athleteGroups[0];
  const groupKey = currentGroup?.key || "";
  const matches = groupKey ? getBracketDataForGroup(groupKey) : [];
  const groupAthletes = currentGroup?.athletes || [];

  return (
    <div className="fixed inset-0 bg-[#020612]/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in text-white font-sans">
      <div className="bg-gradient-to-b from-[#081224] via-[#050b16] to-[#030712] border border-cyan-500/40 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-[0_0_60px_rgba(6,182,212,0.2)] overflow-hidden relative">
        
        {/* Header */}
        <div className="p-5 border-b border-[#142033] flex justify-between items-center bg-[#070e1c]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
              <Trophy className="text-white animate-pulse" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-yellow-400">
                BAGAN & DRAWING KATEGORI TANDING
              </h2>
              <p className="text-[9px] text-cyan-400/80 font-mono uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                IPSI NATIONAL ARENA LED BRACKET CONTROL
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-[#0b1424] hover:bg-red-950/60 border border-[#1e2e48] hover:border-red-500/50 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all cursor-pointer shadow"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Sidebar - Class selector and actions */}
          <div className="w-full lg:w-80 bg-[#050b16] border-r border-[#142033] p-4 flex flex-col justify-between overflow-y-auto shrink-0 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-cyan-400 tracking-wider uppercase block mb-1.5 font-mono">
                  Pilih Kelas Tanding
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-[#081020] border border-[#1a2c4a] focus:border-cyan-400 text-white text-xs rounded-xl p-3 outline-none transition-all cursor-pointer uppercase font-black tracking-wide shadow-inner"
                >
                  <option value="" disabled>-- PILIH KELAS --</option>
                  {athleteGroups.map(g => (
                    <option key={g.key} value={g.key} className="bg-[#081020] text-white">
                      Kelas {g.kelas} ({g.gender}) - {g.usia} [{g.athletes.length} Atlet]
                    </option>
                  ))}
                </select>
              </div>

              {groupKey && (
                <div className="space-y-3 pt-2">
                  <div className="bg-[#081020] border border-[#162540] rounded-xl p-3.5 space-y-2 shadow-inner">
                    <span className="text-[10px] font-black text-[#facc15] uppercase tracking-widest block font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                      INFORMASI KATEGORI
                    </span>
                    <div className="text-[11px] space-y-1 text-zinc-300">
                      <p> Kelas: <strong className="text-white font-black">{currentGroup.kelas}</strong></p>
                      <p> Usia: <strong className="text-white font-black">{currentGroup.usia}</strong></p>
                      <p> Gender: <strong className="text-white font-black">{currentGroup.gender}</strong></p>
                      <p> Jumlah Atlet: <strong className="text-cyan-300 font-black">{groupAthletes.length} Peserta</strong></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAutoShuffleDrawing(groupKey)}
                      className="bg-[#09152b] hover:bg-[#0f2244] border border-cyan-500/40 text-cyan-300 font-bold text-[9px] py-3 rounded-xl transition-all uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow hover:border-cyan-400 active:scale-95"
                    >
                      <RefreshCw size={11} /> Undian Acak
                    </button>
                    <button
                      onClick={() => handleClearClass(groupKey)}
                      className="bg-red-950/20 hover:bg-red-950/50 border border-red-500/40 text-red-400 font-bold text-[9px] py-3 rounded-xl transition-all uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow hover:border-red-400 active:scale-95"
                    >
                      <Trash2 size={11} /> Kosongkan
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-[#142033]">
              <button
                onClick={handleDownloadBracketPDF}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-[10px] uppercase py-3 rounded-xl tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Printer size={12} /> Unduh Cetak PDF
              </button>
              <button
                onClick={handleDownloadAllBracketsPDF}
                className="w-full bg-[#09152b] hover:bg-[#0f2244] border border-[#1a2e4e] text-zinc-300 hover:text-white font-bold text-[10px] uppercase py-3 rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={12} /> Unduh Semua Bagan PDF
              </button>
            </div>
          </div>

          {/* Right Area - Visual Bracket Canvas */}
          <div className="flex-1 bg-[#030712] p-6 flex flex-col justify-center items-center overflow-auto arena-grid-pattern">
            {groupKey && matches.length > 0 ? (
              <div className="w-full max-w-4xl bg-[#070e1c] border border-[#162540] p-6 rounded-2xl shadow-2xl relative text-center">
                
                {/* Visual Bracket Headers */}
                <div className="flex justify-between items-center border-b border-[#142033] pb-3 mb-6">
                  <div>
                    <h3 className="text-xs font-black uppercase text-white tracking-wider">
                      VISUAL BRACKET {currentGroup.kelas} ({currentGroup.gender})
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {currentGroup.usia} • {groupAthletes.length} ATLET TERDAFTAR
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#040813] p-1 rounded-lg border border-[#162540]">
                    <button
                      onClick={() => setBracketSideMode("dua")}
                      className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${bracketSideMode === "dua" ? "bg-[#1d4ed8] text-white shadow-md" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      Dua Sisi
                    </button>
                    <button
                      onClick={() => setBracketSideMode("satu")}
                      className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${bracketSideMode === "satu" ? "bg-[#1d4ed8] text-white shadow-md" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      Satu Sisi
                    </button>
                  </div>
                </div>

                {/* Bracket Tree Layout */}
                <div className="grid grid-cols-3 gap-6 py-4 items-center">
                  
                  {/* Round 1: Semifinals */}
                  <div className="space-y-8">
                    <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest block text-center border-b border-[#142033] pb-1">
                      Babak Semifinal
                    </span>
                    
                    {/* SF 1 Card */}
                    <div className="bg-[#050b16] border border-[#1a2c4a] rounded-xl p-3 text-left space-y-2 relative shadow-lg">
                      <div className="absolute -top-2.5 left-3 bg-[#1d4ed8] text-white text-[8px] font-mono font-bold px-2 py-0.5 rounded shadow">
                        PARTAI 1
                      </div>
                      <div className="text-[11px] space-y-1">
                        <div className="flex justify-between border-b border-[#142033] pb-1">
                          <span className="font-bold text-[#60a5fa] truncate max-w-[120px]">
                            {matches.find(m => m.id.includes("SF1"))?.p1?.name || "TBD"}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">
                            {matches.find(m => m.id.includes("SF1"))?.p1?.contingent || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="font-bold text-[#f87171] truncate max-w-[120px]">
                            {matches.find(m => m.id.includes("SF1"))?.p2?.name || "TBD"}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">
                            {matches.find(m => m.id.includes("SF1"))?.p2?.contingent || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SF 2 Card */}
                    <div className="bg-[#050b16] border border-[#1a2c4a] rounded-xl p-3 text-left space-y-2 relative shadow-lg">
                      <div className="absolute -top-2.5 left-3 bg-[#1d4ed8] text-white text-[8px] font-mono font-bold px-2 py-0.5 rounded shadow">
                        PARTAI 2
                      </div>
                      <div className="text-[11px] space-y-1">
                        <div className="flex justify-between border-b border-[#142033] pb-1">
                          <span className="font-bold text-[#60a5fa] truncate max-w-[120px]">
                            {matches.find(m => m.id.includes("SF2"))?.p1?.name || "TBD"}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">
                            {matches.find(m => m.id.includes("SF2"))?.p1?.contingent || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="font-bold text-[#f87171] truncate max-w-[120px]">
                            {matches.find(m => m.id.includes("SF2"))?.p2?.name || "TBD"}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">
                            {matches.find(m => m.id.includes("SF2"))?.p2?.contingent || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connecting lines */}
                  <div className="flex flex-col justify-around h-full py-12 relative min-h-[180px]">
                    <svg className="absolute inset-0 w-full h-full stroke-cyan-500/40 stroke-[2] fill-none">
                      <path d="M 0,45 L 80,45 L 80,95 L 140,95" />
                      <path d="M 0,135 L 80,135 L 80,95 L 140,95" />
                    </svg>
                  </div>

                  {/* Round 2: Final */}
                  <div className="space-y-8 flex flex-col justify-center h-full">
                    <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest block text-center border-b border-amber-500/20 pb-1">
                      Babak Final Utama
                    </span>
                    
                    {/* Final Card */}
                    <div className="bg-[#050b16] border border-amber-500/40 rounded-xl p-4 text-left space-y-2.5 relative shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                      <div className="absolute -top-3 left-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[8px] font-mono font-black px-2.5 py-0.5 rounded shadow-md">
                        REBUTAN JUARA 1
                      </div>
                      <div className="text-[11px] space-y-1.5">
                        <div className="flex justify-between border-b border-[#142033] pb-1.5">
                          <span className="font-black text-[#60a5fa] truncate max-w-[140px]">
                            {matches.find(m => m.id === "M_FINAL")?.p1?.name || "PEMENANG PARTAI 1"}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">
                            {matches.find(m => m.id === "M_FINAL")?.p1?.contingent || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="font-black text-[#f87171] truncate max-w-[140px]">
                            {matches.find(m => m.id === "M_FINAL")?.p2?.name || "PEMENANG PARTAI 2"}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">
                            {matches.find(m => m.id === "M_FINAL")?.p2?.contingent || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="text-center text-[9px] text-zinc-500 font-mono mt-4">
                  ✓ Verifikasi Bagan: Struktur bagan dinamis IPSI Digital Arena LED V3.0
                </div>

              </div>
            ) : (
              <div className="text-center text-zinc-500 py-20 max-w-sm">
                <Trophy size={48} className="text-zinc-600 mx-auto mb-3" />
                <h4 className="text-xs uppercase font-black tracking-wider text-zinc-400">BAGAN KELAS KOSONG</h4>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Harap isi minimal 2 atlet pada kategori ini untuk mulai mengundi atau melihat bagan pertandingan.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
