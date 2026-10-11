import React from "react";
import { Clock, ArrowLeft, Maximize, Minimize, Share2 } from "lucide-react";
import { ShareClientModal } from "./ShareClientModal";

export interface JuriScoreData {
  id: number;
  kebenaran: number;
  kemantapan: number;
  keserasian?: number;
  penjiwaan?: number;
  submitted: boolean;
  wrongMoves?: number;
  flowScore?: number;
}

export const cleanPartaiNumber = (val: string | undefined | null): string => {
  if (!val) return "1";
  const trimmed = val.trim();
  const stripped = trimmed.replace(/^partai\s+/i, "").replace(/^partai\s+/i, "").trim();
  return stripped || "1";
};

export interface SpectatorMonitorProps {
  selectedCategory: string;
  selectedAge: string;
  gender: "PUTRA" | "PUTRI";
  performerName: string;
  contingent: string;
  timeRemaining: number;
  timeActual: number;
  isTimerRunning: boolean;
  isTimer1Running?: boolean;
  isTimer2Running?: boolean;
  durasiTampil: string;
  partaiTanding: string;
  tahapPertandingan: string;
  namaEvent: string;
  tempatPelaksanaan?: string;
  waktuPelaksanaan?: string;
  namaAtlitBiru: string;
  kontingenBiru: string;
  namaAtlitMerah: string;
  kontingenMerah: string;
  activeCorner: "biru" | "merah" | null | "";
  juriScores: JuriScoreData[];
  juriScoresBiru: JuriScoreData[];
  juriScoresMerah: JuriScoreData[];
  deductions: {
    timeOverUnder: number;
    weaponDrop: number;
    costumeMistake: boolean;
    outOfBounds: number;
    otherPenalty: number;
  };
  deductionsBiru: {
    timeOverUnder: number;
    weaponDrop: number;
    costumeMistake: boolean;
    outOfBounds: number;
    otherPenalty: number;
  };
  deductionsMerah: {
    timeOverUnder: number;
    weaponDrop: number;
    costumeMistake: boolean;
    outOfBounds: number;
    otherPenalty: number;
  };
  judgesCount: number;
  disqualifiedBiru: boolean;
  undurDiriBiru: boolean;
  disqualifiedMerah: boolean;
  undurDiriMerah: boolean;
  logoKiri?: string;
  logoKanan?: string;
  isMatchUnlocked?: boolean;
  onBack: () => void;
  isFs: boolean;
  toggleFullScreen: () => void;
  getCalculatedScoreForCorner: (corner: "biru" | "merah") => number;
  getFormattedScore: (corner: "biru" | "merah") => string;
  getJudgeTotal: (js: JuriScoreData) => number;
  formatTime: (secs: number) => string;
  onSwitchCorner?: (corner: "biru" | "merah") => void;
}

export default function SpectatorMonitorView(props: SpectatorMonitorProps) {
  const {
    selectedCategory,
    selectedAge,
    gender,
    timeRemaining,
    isTimerRunning,
    durasiTampil,
    partaiTanding,
    tahapPertandingan,
    namaEvent,
    namaAtlitBiru,
    kontingenBiru,
    namaAtlitMerah,
    kontingenMerah,
    activeCorner,
    juriScoresBiru,
    juriScoresMerah,
    judgesCount = 10,
    disqualifiedBiru,
    undurDiriBiru,
    disqualifiedMerah,
    undurDiriMerah,
    logoKiri: propLogoKiri,
    logoKanan: propLogoKanan,
    onBack,
    isFs,
    toggleFullScreen,
    getCalculatedScoreForCorner,
    getFormattedScore,
    getJudgeTotal,
    formatTime,
  } = props;

  // Local state for live synced logos (reads from props, localStorage fallback)
  const [syncedLogoKiri, setSyncedLogoKiri] = React.useState<string>(() => {
    return propLogoKiri || localStorage.getItem("logo_kiri") || "";
  });
  const [syncedLogoKanan, setSyncedLogoKanan] = React.useState<string>(() => {
    return propLogoKanan || localStorage.getItem("logo_kanan") || "";
  });
  const [showShareModal, setShowShareModal] = React.useState(false);

  React.useEffect(() => {
    if (propLogoKiri !== undefined) setSyncedLogoKiri(propLogoKiri);
  }, [propLogoKiri]);

  React.useEffect(() => {
    if (propLogoKanan !== undefined) setSyncedLogoKanan(propLogoKanan);
  }, [propLogoKanan]);

  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "logo_kiri" && e.newValue !== null) {
        setSyncedLogoKiri(e.newValue);
      } else if (e.key === "logo_kanan" && e.newValue !== null) {
        setSyncedLogoKanan(e.newValue);
      } else if (e.key === "silat_seni_match_state" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.logoKiri !== undefined) setSyncedLogoKiri(parsed.logoKiri);
          if (parsed.logoKanan !== undefined) setSyncedLogoKanan(parsed.logoKanan);
        } catch (_) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const displayLogoKiri = syncedLogoKiri || "/LogoIPSI.png";
  const displayLogoKanan = syncedLogoKanan || "/LogoIPSI.png";

  // Category Title Display conforming to IPSI 2026 & PERSILAT
  const categoryDisplay = 
    selectedCategory === "tunggal" ? "JURUS TUNGGAL BAKU" : 
    selectedCategory === "ganda" ? "JURUS GANDA" : 
    selectedCategory === "regu" ? "JURUS REGU BAKU" : 
    selectedCategory === "solo_kreatif" ? "SENI SOLO KREATIF" : "JURUS TUNGGAL BAKU";

  // Score calculations
  const rawScoreBiru = getCalculatedScoreForCorner("biru");
  const rawScoreMerah = getCalculatedScoreForCorner("merah");
  const formattedScoreBiru = getFormattedScore("biru");
  const formattedScoreMerah = getFormattedScore("merah");

  // Determine active performing corner
  const isCurrentBiru = activeCorner === "biru" || activeCorner === "" || !activeCorner;
  const activeScores = (isCurrentBiru ? juriScoresBiru : juriScoresMerah).filter(js => js.id <= judgesCount);
  const activeDisqualified = isCurrentBiru ? disqualifiedBiru : disqualifiedMerah;
  const activeUndurDiri = isCurrentBiru ? undurDiriBiru : undurDiriMerah;

  const currentAthleteName = isCurrentBiru ? (namaAtlitBiru || "SUDUT BIRU") : (namaAtlitMerah || "SUDUT MERAH");
  const currentContingent = isCurrentBiru ? (kontingenBiru || "KONTINGEN BIRU") : (kontingenMerah || "KONTINGEN MERAH");
  const currentFormattedScore = isCurrentBiru ? formattedScoreBiru : formattedScoreMerah;

  // Maximum match limit seconds
  const maxLimitSecs = durasiTampil === "02:00" ? 120 : durasiTampil === "01:30" ? 90 : 180;

  // Determine median indices for total judges calculation
  const getMedianIndices = (scoresList: JuriScoreData[]) => {
    const onDuty = scoresList.filter(s => s.id <= judgesCount);
    if (onDuty.length === 0) return new Set<number>();
    const hasSubmitted = onDuty.some(s => s.submitted);
    if (!hasSubmitted) return new Set<number>();

    const indexed = onDuty.map((s, idx) => ({ val: getJudgeTotal(s), idx }));
    indexed.sort((a, b) => a.val - b.val);
    const n = indexed.length;
    const mid = Math.floor(n / 2);
    if (n % 2 === 0) {
      return new Set<number>([indexed[mid - 1]?.idx, indexed[mid]?.idx]);
    }
    return new Set<number>([indexed[mid]?.idx]);
  };

  const medianSet = getMedianIndices(activeScores);

  return (
    <div 
      id="spectator-monitor-arena"
      className="min-h-screen bg-[#020409] text-white flex flex-col font-sans select-none relative overflow-hidden bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,140,255,0.12),rgba(2,4,9,1))]"
    >
      {/* GIANT RESPONSIVE WATERMARK LOGO SHADOW */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none">
        <img 
          id="monitor-watermark-bg"
          src="/jrzscorewatermak.png" 
          alt="JRZ Score TGR Watermark" 
          className="w-[85vw] max-w-[1100px] max-h-[85vh] h-auto object-contain opacity-[0.09] pointer-events-none select-none drop-shadow-[0_0_80px_rgba(0,180,255,0.2)] transition-all duration-700"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* HOVER-TRIGGERED TOP-RIGHT CONTROLS (Hanya muncul saat mouse diarahkan ke sudut kanan atas) */}
      <div className="absolute top-0 right-0 z-50 p-2 sm:p-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto">
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
            id="btn-monitor-back"
            onClick={onBack}
            className="bg-[#0b172a] hover:bg-[#162a4a] text-cyan-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Kembali ke Menu Utama"
          >
            <ArrowLeft size={14} />
            <span>Kembali</span>
          </button>
          <button
            id="btn-monitor-fullscreen"
            onClick={toggleFullScreen}
            className="bg-[#0b172a] hover:bg-[#162a4a] text-amber-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-amber-500/40 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Toggle Full Screen"
          >
            {isFs ? <Minimize size={14} /> : <Maximize size={14} />}
            <span>{isFs ? "Normal" : "Full Screen"}</span>
          </button>
        </div>
      </div>

      {/* 1. TOP HEADER */}
      <header className="relative z-10 bg-[#040813]/95 border-b-2 border-[#162540] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2 sm:gap-4 shadow-2xl backdrop-blur-md">
        
        {/* Left: Event Branding & Gelanggang */}
        <div className="flex items-center gap-3 shrink-0 max-w-[26%]">
          <div className="relative shrink-0 flex items-center justify-center">
            <img 
              id="monitor-header-logo-kiri"
              src={displayLogoKiri} 
              alt="Logo Sisi Kiri" 
              className="h-12 w-auto max-w-[64px] object-contain drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "/LogoIPSI.png";
              }}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-black px-2 py-0.5 rounded tracking-wider uppercase whitespace-nowrap w-fit">
              GELANGGANG 1
            </span>
            <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono truncate mt-0.5 drop-shadow-md" title={namaEvent || "KEJUARAAN NASIONAL PENCAK SILAT IPSI"}>
              {namaEvent || "KEJUARAAN NASIONAL PENCAK SILAT IPSI"}
            </h1>
          </div>
        </div>

        {/* Center: Tactical HUD Capsule Grid */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-1">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 lg:gap-3 flex-wrap">
            
            {/* Kapsul 1: Kategori Tanding */}
            <div className="bg-[#071328] border-2 border-cyan-500/50 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-[0_0_15px_rgba(0,229,255,0.2)] flex items-center gap-2 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
              <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-cyan-300 uppercase">
                {categoryDisplay}
              </span>
            </div>

            {/* Kapsul 2: Golongan & Usia */}
            <div className="bg-[#1c1306] border-2 border-amber-500/50 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-2 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-amber-300 uppercase">
                {gender} • {selectedAge}
              </span>
            </div>

            {/* Kapsul 3: Partai & Babak */}
            <div className="bg-[#051910] border-2 border-emerald-500/50 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-2 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-emerald-300 uppercase">
                PARTAI {cleanPartaiNumber(partaiTanding)} <span className="text-zinc-500 font-bold mx-0.5">/</span> {tahapPertandingan || "FINAL"}
              </span>
            </div>

          </div>
        </div>

        {/* Right: Sisi Kanan Logo */}
        <div className="flex items-center justify-end shrink-0 max-w-[26%]">
          <img 
            id="monitor-header-logo-kanan"
            src={displayLogoKanan} 
            alt="Logo Sisi Kanan" 
            className="h-12 w-auto max-w-[64px] object-contain drop-shadow-[0_0_12px_rgba(250,204,21,0.3)] shrink-0" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "/LogoIPSI.png";
            }}
          />
        </div>
      </header>

      {/* 2. MAIN SINGLE FOCUS STAGE */}
      <main className="flex-1 px-6 sm:px-10 py-4 sm:py-6 flex flex-col justify-center relative z-10 max-w-7xl mx-auto w-full">
        
        <div className="grid grid-cols-12 gap-6 items-stretch w-full my-auto">
          
          {/* Left: Performer Hero HUD Card (5 Columns) */}
          <div className={`col-span-5 rounded-3xl p-8 flex flex-col justify-between border-2 relative overflow-hidden transition-all duration-500 ${
            isCurrentBiru
              ? "bg-gradient-to-br from-[#0c244c] via-[#071730] to-[#040813] border-cyan-400 shadow-[0_0_50px_rgba(0,229,255,0.25)]"
              : "bg-gradient-to-br from-[#4c0519] via-[#2a040e] to-[#040813] border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.25)]"
          }`}>
            
            {/* Background Watermark Decal */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-8 -right-6 text-[8rem] font-black italic tracking-tighter text-white/5 select-none font-mono pointer-events-none">
              {isCurrentBiru ? "BIRU" : "MERAH"}
            </div>

            {/* Corner Badge */}
            <div className="flex items-center justify-between z-10">
              <div className={`px-4 py-1.5 rounded-xl text-white font-mono font-black text-sm uppercase tracking-widest shadow-lg ${
                isCurrentBiru ? "bg-[#1e61ff] shadow-blue-900/60" : "bg-[#e11d48] shadow-rose-900/60"
              }`}>
                {isCurrentBiru ? "SUDUT BIRU" : "SUDUT MERAH"}
              </div>
            </div>

            {/* Athlete Details */}
            <div className="my-auto py-6 space-y-2 z-10">
              <h2 
                className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight font-mono leading-tight drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)] truncate"
                title={currentAthleteName}
              >
                {currentAthleteName}
              </h2>
              <div className="flex items-center gap-2.5 pt-1">
                <span className={`w-3 h-3 rounded-full ${isCurrentBiru ? "bg-cyan-400" : "bg-rose-400"}`} />
                <p className={`text-xl font-extrabold uppercase tracking-widest font-mono drop-shadow truncate ${
                  isCurrentBiru ? "text-cyan-300" : "text-rose-400"
                }`}>
                  {currentContingent}
                </p>
              </div>
            </div>

            {/* Final Valid Score Box */}
            <div className="pt-4 border-t border-white/10 flex flex-col items-center justify-center z-10">
              <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-400/90 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> SKOR AKHIR SAH
              </span>
              <div className="text-center">
                <div className="text-6xl sm:text-7xl lg:text-8xl font-mono font-black text-amber-400 tracking-tight leading-none drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                  {currentFormattedScore}
                </div>
              </div>
            </div>

            {/* Disqualification / Resign alert */}
            {activeDisqualified && (
              <div className="mt-3 bg-rose-950/90 border border-rose-500 text-rose-300 text-xs font-mono font-black text-center py-1.5 rounded-xl uppercase tracking-wider">
                DISKUALIFIKASI (DISQ)
              </div>
            )}
            {activeUndurDiri && (
              <div className="mt-3 bg-amber-950/90 border border-amber-500 text-amber-300 text-xs font-mono font-black text-center py-1.5 rounded-xl uppercase tracking-wider">
                MENGUNDURKAN DIRI (WD)
              </div>
            )}

          </div>

          {/* Right: Giant Arena Combat Clock (7 Columns) */}
          <div className="col-span-7 bg-[#070e1c] border-2 border-[#162540] rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            
            {/* Top Timer Header Bar */}
            <div className="flex items-center justify-between border-b border-[#162540] pb-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-black text-sm uppercase tracking-widest">
                <Clock size={20} /> WAKTU TAMPIL
              </div>
            </div>

            {/* Massive Center Clock Display */}
            <div className="my-auto py-8 text-center bg-[#040813] border-2 border-[#162540] rounded-2xl shadow-inner relative overflow-hidden flex flex-col items-center justify-center">
              <div className="text-8xl sm:text-9xl lg:text-[10.5rem] font-mono font-black text-amber-400 leading-none tracking-wider drop-shadow-[0_0_40px_rgba(245,158,11,0.4)] select-none">
                {formatTime(timeRemaining)}
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full ${
                  isTimerRunning 
                    ? "bg-emerald-400 animate-pulse" 
                    : timeRemaining >= maxLimitSecs 
                      ? "bg-rose-500" 
                      : "bg-zinc-500"
                }`} />
                <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-widest text-zinc-200">
                  STATUS: {
                    isTimerRunning 
                      ? "SEDANG TAMPIL" 
                      : timeRemaining >= maxLimitSecs 
                        ? "WAKTU HABIS" 
                        : "BERHENTI"
                  }
                </span>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* 3. LOWER SECTION: JURI SCORE MATRIX (URUTAN TERKECIL KE TERBESAR & RATA TENGAH UNTUK 4-6-8 JURI) */}
      <section className="bg-[#050b16] px-6 sm:px-10 py-3 sm:py-4 w-full shrink-0 border-t-2 border-[#162540] overflow-hidden shadow-2xl relative z-20">
        {(() => {
          // 1. Ambil juri yang bertugas
          const onDuty = (isCurrentBiru ? juriScoresBiru : juriScoresMerah).filter(js => js.id <= judgesCount);
          const mapped = onDuty.map(js => ({
            id: js.id,
            val: getJudgeTotal(js),
            submitted: js.submitted
          }));

          // 2. Urutkan terkecil ke terbesar
          const sorted = [...mapped].sort((a, b) => a.val - b.val);

          // 3. Kalkulasi Median Akurat sesuai Regulasi IPSI 2026 & PERSILAT
          const checkMedian = (index: number, total: number) => {
            if (total === 10) return index === 4 || index === 5;
            if (total === 8) return index === 3 || index === 4;
            if (total === 6) return index === 2 || index === 3;
            if (total === 5) return index === 1 || index === 2 || index === 3; // Trimmed
            if (total === 4) return index === 1 || index === 2;
            if (total === 3) return true; // Rata-rata 3 juri
            return false;
          };

          const vals = sorted.map(j => j.val);
          let medianValue = 0;
          if (vals.length > 0) {
            if (judgesCount === 5) {
              medianValue = (vals[1] + vals[2] + vals[3]) / 3;
            } else if (judgesCount % 2 === 0) {
              const mid = judgesCount / 2;
              medianValue = (vals[mid - 1] + vals[mid]) / 2;
            } else {
              medianValue = vals[Math.floor(judgesCount / 2)];
            }
          }

          // 4. Pengaturan kolom rata tengah otomatis untuk 4, 6, 8, 3, 5, 10 Juri
          const gridColsClass = 
            judgesCount === 4 ? "grid-cols-4 max-w-xl mx-auto" :
            judgesCount === 6 ? "grid-cols-6 max-w-3xl mx-auto" :
            judgesCount === 8 ? "grid-cols-8 max-w-5xl mx-auto" :
            judgesCount === 3 ? "grid-cols-3 max-w-md mx-auto" :
            judgesCount === 5 ? "grid-cols-5 max-w-2xl mx-auto" :
            "grid-cols-5 sm:grid-cols-10 max-w-7xl mx-auto";

          return (
            <div className="w-full flex flex-col justify-center">
              {/* Header Info Bar */}
              <div className="flex items-center justify-between pb-2 px-1 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="text-[10px] sm:text-xs font-mono font-black text-zinc-300 uppercase tracking-widest">
                    NILAI JURI BERTUGAS (URUTAN TERKECIL KE TERBESAR)
                  </span>
                </div>
                <div className="bg-[#071328] border border-amber-400/60 px-3 py-0.5 rounded-lg flex items-center gap-2 shadow-sm">
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400/90 uppercase">
                    NILAI MEDIAN ({judgesCount} JURI):
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-amber-300">
                    {medianValue.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Dynamic Centered Column Matrix Cards */}
              <div className={`grid gap-2 sm:gap-3 w-full h-20 sm:h-22 ${gridColsClass}`}>
                {sorted.map((item, idx) => {
                  const isMedian = checkMedian(idx, judgesCount);
                  const scoreVal = item.val.toFixed(2);
                  const isSubmitted = item.submitted;

                  return (
                    <div 
                      key={item.id}
                      className={`flex flex-col items-stretch rounded-xl border-2 overflow-hidden transition-all duration-300 shadow-md relative ${
                        isSubmitted 
                          ? isMedian 
                            ? "bg-amber-950/70 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/60" 
                            : "bg-[#0b1b36] border-[#1e488f] text-white"
                          : "bg-[#060c18] border-[#162540] opacity-50"
                      }`}
                    >
                      {/* Top: Judge ID Header */}
                      <div className={`py-0.5 text-center text-[10px] sm:text-xs font-black font-mono tracking-wider uppercase border-b ${
                        isSubmitted && isMedian 
                          ? "bg-amber-500/25 text-amber-300 border-amber-500/50" 
                          : "bg-[#112a55] text-cyan-300 border-[#1e488f]"
                      }`}>
                        J{item.id}
                        {isSubmitted && isMedian && <span className="text-[8px] ml-1 text-amber-400 font-black hidden lg:inline">★ MEDIAN</span>}
                      </div>

                      {/* Bottom: Score Value */}
                      <div className="flex-1 flex flex-col items-center justify-center p-1 bg-black/25 text-center">
                        <span className={`text-base sm:text-xl lg:text-2xl font-black font-mono tracking-tight leading-none ${
                          isSubmitted 
                            ? isMedian 
                              ? "text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" 
                              : "text-white"
                            : "text-zinc-500"
                        }`}>
                          {isSubmitted ? scoreVal : "-"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </section>

      {/* MODAL BAGIKAN KE KLIEN */}
      <ShareClientModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tournamentName={namaEvent}
      />
    </div>
  );
}
