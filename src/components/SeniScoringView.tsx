import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Award, Users, Shield, 
  Tv, UserCheck, Trash2, Clock, Check, Info, CheckSquare, Square, 
  Lightbulb, AlertTriangle, Plus, Minus, Maximize, Minimize, Lock, Unlock,
  Settings, User, Pencil, Shuffle, Trophy, Flame, Layers, Medal, ListOrdered,
  ChevronRight, RefreshCw, Printer, Download, Eye, Search, FileSpreadsheet,
  Upload, X, MapPin, Sparkles, UserPlus, Swords, Crown, Zap, CheckCircle2, Timer,
  Share2, Wifi
} from "lucide-react";
import { playSoundByKey } from "../utils/audio";
import {
  TournamentSystemType,
  TournamentAthlete,
  KnockoutMatch,
  PoolGroup,
  PemasalanBracket,
  generateSingleEliminationBrackets,
  generatePoolGroups,
  generatePemasalanBrackets,
  updatePemasalanOutcome,
  resolveTieBreakerIPSI2026AndPERSILAT,
  calculateDewanDeductionsIPSI2026,
  calculateMedianAndDeviation
} from "../utils/tournamentSystem";
import SpectatorMonitorView from "./SpectatorMonitorView";
import TimerOperatorView from "./TimerOperatorView";
import RegistrasiDataView from "./RegistrasiDataView";
import { PWAInstallButton } from "./PWAInstallButton";
import { ShareClientModal } from "./ShareClientModal";
import { ErrorBoundary } from "./ErrorBoundary";

interface Athlete {
  id: string;
  name: string;
  contingent: string;
  kelas: string;
  usia: string;
  gender: "PUTRA" | "PUTRI";
  gelanggang?: string;
  sistemTanding?: TournamentSystemType | "BATTLE";
  tahap?: string;
}

const initialDefaultAthletes: Athlete[] = [
  { id: "1", name: "ADI WIJAYA", contingent: "JAWA TENGAH", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "GUGUR", tahap: "SEMIFINAL" },
  { id: "2", name: "HERI KUSUMA", contingent: "BALI", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "GUGUR", tahap: "SEMIFINAL" },
  { id: "3", name: "FARHAN RAZAK", contingent: "JAWA BARAT", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "GUGUR", tahap: "SEMIFINAL" },
  { id: "4", name: "RIZKY PUTRA", contingent: "JAWA TIMUR", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "GUGUR", tahap: "SEMIFINAL" },
  { id: "5", name: "NURUL INDAH", contingent: "SULAWESI SELATAN", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRI", gelanggang: "GELANGGANG 1", sistemTanding: "PEMASALAN", tahap: "SEMIFINAL 1" },
  { id: "6", name: "SITI AMINAH", contingent: "BANTEN", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRI", gelanggang: "GELANGGANG 1", sistemTanding: "PEMASALAN", tahap: "SEMIFINAL 1" },
  { id: "7", name: "AKBAR MAULANA", contingent: "DI YOGYAKARTA", kelas: "GANDA", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "POOL", tahap: "PENYISIHAN" },
  { id: "8", name: "DEWANTO SURYA", contingent: "DKI JAKARTA", kelas: "GANDA", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "POOL", tahap: "PENYISIHAN" },
];

interface JuriScore {
  id: number;
  kebenaran: number; // 9.90 standard, -0.01 per mistake for Tunggal/Regu or 5.00-6.00 range / 0.00-0.30 component
  kemantapan: number; // 5.00 to 6.00 or flow score 0.01 to 0.10 / 0.00-0.30 component
  keserasian?: number; // for Ganda (5.00 to 6.00)
  penjiwaan?: number; // for Solo Kreatif / Ganda (5.00 to 6.00 or 0.00-0.30 component)
  submitted: boolean;
  wrongMoves?: number;
  flowScore?: number;
}

export default function SeniScoringView({ onBack, isFullscreen }: { onBack?: () => void; isFullscreen?: boolean }) {
  // Available categories sesuai Peraturan Resmi Pertandingan IPSI 2026 & PERSILAT
  const categories = [
    { id: "tunggal", name: "TUNGGAL", description: "Peragaan jurus tunggal baku IPSI & PERSILAT (3 Menit, 100 gerakan)" },
    { id: "ganda", name: "GANDA", description: "Peragaan teknik serang bela pasang ganda kreatif IPSI & PERSILAT (3 Menit)" },
    { id: "regu", name: "REGU", description: "Peragaan jurus regu baku kompak 3 pesilat IPSI & PERSILAT (3 Menit)" },
    { id: "solo_kreatif", name: "SOLO KREATIF", description: "Koreografi jurus tunggal kreatif bebas bersenjata khas & iringan musik (3 Menit)" }
  ];

  const ageGroups = ["USIA DINI 1", "USIA DINI 2", "PRA REMAJA", "REMAJA", "DEWASA", "MASTER", "PRA USIA DINI", "USIA DINI"];

  // 1. Role State specifically for Multi-Screen layout
  // Auto-detect from URL parameters (?role=sekretaris|dewan|juri|timer|monitor)
  const [role, setRole] = useState<"sekretaris" | "dewan" | "juri" | "monitor" | "timer" | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlRole = params.get("role");
        if (urlRole && ["sekretaris", "dewan", "juri", "monitor", "timer"].includes(urlRole)) {
          return urlRole as "sekretaris" | "dewan" | "juri" | "monitor" | "timer";
        }
      }
    } catch {}
    return null;
  });

  // Which Juri ID is controlled on this specific tab if role is "juri"
  const [localJuriId, setLocalJuriId] = useState<number>(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("id");
        if (urlId && Number(urlId) >= 1 && Number(urlId) <= 10) {
          return Number(urlId);
        }
      }
      const saved = localStorage.getItem("jrz_assigned_juri_id") || localStorage.getItem("discors_assigned_juri_id");
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [showJuriSelectorModal, setShowJuriSelectorModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Zoom & UI scale for Dewan Panel to fit screen height
  const [dewanScale, setDewanScale] = useState<number>(() => {
    try {
      const s = localStorage.getItem("jrz_dewan_scale") || localStorage.getItem("discors_dewan_scale");
      return s ? parseFloat(s) : 1.0;
    } catch {
      return 1.0;
    }
  });

  // List of athletes loaded from Pendaftaran
  const [poolAthletes, setPoolAthletes] = useState<Athlete[]>([]);
  const [showAthleteLoader, setShowAthleteLoader] = useState(false);

  // 2. Core Match States (Synchronized via localStorage)
  const [selectedCategory, setSelectedCategory] = useState("tunggal");
  const [selectedAge, setSelectedAge] = useState("PRA USIA DINI");
  const [gender, setGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [performerName, setPerformerName] = useState("BENNY G. SUMARSONO");
  const [contingent, setContingent] = useState("BALI");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeActual, setTimeActual] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isMatchUnlocked, setIsMatchUnlocked] = useState(false);
  const [isTimer1Running, setIsTimer1Running] = useState(false);
  const [isTimer2Running, setIsTimer2Running] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<number>(0);
  const [timer1StartedAt, setTimer1StartedAt] = useState<number>(0);
  const [timer1BaseRemaining, setTimer1BaseRemaining] = useState<number>(0);
  const [timer2StartedAt, setTimer2StartedAt] = useState<number>(0);
  const [timer2BaseActual, setTimer2BaseActual] = useState<number>(0);
  const [timerBaseRemaining, setTimerBaseRemaining] = useState<number>(0);
  const [timerBaseActual, setTimerBaseActual] = useState<number>(0);
  const [deductions, setDeductions] = useState({
    timeOverUnder: 0, 
    weaponDrop: 0, 
    costumeMistake: false, 
    outOfBounds: 0, 
    otherPenalty: 0 
  });
  const [judgesCount, setJudgesCount] = useState<number>(10);
  const [juriScores, setJuriScores] = useState<JuriScore[]>([
    { id: 1, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 2, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 3, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 4, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 5, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 6, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 7, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 8, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 9, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 10, kebenaran: 9.90, kemantapan: 0.00, submitted: false }
  ]);
  const [logs, setLogs] = useState<{ time: string; msg: string; type: "system" | "deduction" | "score" }[]>([
    { time: "00:00", msg: "Sistem skoring seni diaktifkan.", type: "system" }
  ]);

  // 3. New Tournament & Secretary States (Synchronized via localStorage)
  const [namaEvent, setNamaEvent] = useState("KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA");
  const [tempatPelaksanaan, setTempatPelaksanaan] = useState("Padepokan Pencak Silat TMII, Jakarta East");
  const [waktuPelaksanaan, setWaktuPelaksanaan] = useState("20-25 Juni 2026");
  const [partaiTanding, setPartaiTanding] = useState("2");

  const cleanPartaiNumber = (val: string | undefined | null): string => {
    if (!val) return "1";
    const trimmed = String(val).trim();
    return trimmed.replace(/^partai\s+/i, "").replace(/^partai\s+/i, "").trim() || "1";
  };
  const [tahapPertandingan, setTahapPertandingan] = useState("FINAL");
  const [durasiTampil, setDurasiTampil] = useState("03:00");
  const [namaAtlitBiru, setNamaAtlitBiru] = useState("BENNY G. SUMARSONO");
  const [kontingenBiru, setKontingenBiru] = useState("BALI");
  const [namaAtlitMerah, setNamaAtlitMerah] = useState("SUHARTONO");
  const [kontingenMerah, setKontingenMerah] = useState("JAWA BARAT");
  const [activeCorner, setActiveCorner] = useState<"biru" | "merah" | null | "">("");
  const [logoKiri, setLogoKiri] = useState<string>(() => localStorage.getItem("logo_kiri") || "");
  const [logoKanan, setLogoKanan] = useState<string>(() => localStorage.getItem("logo_kanan") || "");

  const [disqualifiedBiru, setDisqualifiedBiru] = useState(false);
  const [undurDiriBiru, setUndurDiriBiru] = useState(false);
  const [disqualifiedMerah, setDisqualifiedMerah] = useState(false);
  const [undurDiriMerah, setUndurDiriMerah] = useState(false);
  const [showDiskUDModal, setShowDiskUDModal] = useState(false);

  const [isFs, setIsFs] = useState(false);
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFs(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFs(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFs(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, []);

  const [juriScoresBiru, setJuriScoresBiru] = useState<JuriScore[]>([
    { id: 1, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 2, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 3, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 4, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 5, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 6, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 7, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 8, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 9, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 10, kebenaran: 9.90, kemantapan: 0.00, submitted: false }
  ]);
  const [juriScoresMerah, setJuriScoresMerah] = useState<JuriScore[]>([
    { id: 1, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 2, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 3, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 4, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 5, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 6, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 7, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 8, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 9, kebenaran: 9.90, kemantapan: 0.00, submitted: false },
    { id: 10, kebenaran: 9.90, kemantapan: 0.00, submitted: false }
  ]);
  const [deductionsBiru, setDeductionsBiru] = useState({
    timeOverUnder: 0, weaponDrop: 0, costumeMistake: false, outOfBounds: 0, otherPenalty: 0
  });
  const [deductionsMerah, setDeductionsMerah] = useState({
    timeOverUnder: 0, weaponDrop: 0, costumeMistake: false, outOfBounds: 0, otherPenalty: 0
  });
  const [timeRemainingBiru, setTimeRemainingBiru] = useState(0);
  const [timeRemainingMerah, setTimeRemainingMerah] = useState(0);
  const [timeActualBiru, setTimeActualBiru] = useState(0);
  const [timeActualMerah, setTimeActualMerah] = useState(0);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);

  // Pre-configured match list for easy simulation (Kontrol Partai Roster)
  const [kontrolViewMode, setKontrolViewMode] = useState<"BATTLE" | "POOL">("BATTLE");
  const [partaiList, setPartaiList] = useState<any[]>([
    {
      id: "1",
      checked: true,
      partai: "DRAFT",
      kategoriMain: "TUNGGAL",
      kategoriSub: "REMAJA • PUTRA",
      kategori: "tunggal",
      usia: "REMAJA",
      gender: "PUTRA",
      tahap: "SEMIFINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "ADI WIJAYA", contingent: "JAWA TENGAH" },
      merah: { name: "HERI KUSUMA", contingent: "BALI" }
    },
    {
      id: "2",
      checked: true,
      partai: "DRAFT",
      kategoriMain: "TUNGGAL",
      kategoriSub: "REMAJA • PUTRA",
      kategori: "tunggal",
      usia: "REMAJA",
      gender: "PUTRA",
      tahap: "SEMIFINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "RIZKY PUTRA", contingent: "JAWA TIMUR" },
      merah: { name: "FARHAN RAZAK", contingent: "JAWA BARAT" }
    },
    {
      id: "3",
      checked: false,
      partai: "DRAFT",
      kategoriMain: "TUNGGAL",
      kategoriSub: "REMAJA • PUTRA",
      kategori: "tunggal",
      usia: "REMAJA",
      gender: "PUTRA",
      tahap: "FINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "MENUNGGU PEMENANG PARTAI 1", contingent: "PEMENANG" },
      merah: { name: "MENUNGGU PEMENANG PARTAI 2", contingent: "PEMENANG" }
    },
    {
      id: "4",
      checked: true,
      partai: "DRAFT",
      kategoriMain: "TUNGGAL",
      kategoriSub: "REMAJA • PUTRI",
      kategori: "tunggal",
      usia: "REMAJA",
      gender: "PUTRI",
      tahap: "FINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "NURUL INDAH", contingent: "SULAWESI SELATAN" },
      merah: { name: "SITI AMINAH", contingent: "BANTEN" }
    },
    {
      id: "5",
      checked: true,
      partai: "DRAFT",
      kategoriMain: "GANDA",
      kategoriSub: "DEWASA • PUTRA",
      kategori: "ganda",
      usia: "DEWASA",
      gender: "PUTRA",
      tahap: "FINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "DEWANTO SURYA", contingent: "DKI JAKARTA" },
      merah: { name: "AKBAR MAULANA", contingent: "DI YOGYAKARTA" }
    }
  ]);

  // UI state variables for overlays and printable screens
  const [showRegistrasiOverlay, setShowRegistrasiOverlay] = useState(false);
  const [registrasiActiveTab, setRegistrasiActiveTab] = useState<"input" | "bagan" | "partai">("input");
  const [showPrintScoresheet, setShowPrintScoresheet] = useState(false);
  const [showDeductionsModal, setShowDeductionsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Form & Roster states for Input Data Atlit
  const [formName, setFormName] = useState("");
  const [formContingent, setFormContingent] = useState("");
  const [formGelanggang, setFormGelanggang] = useState("GELANGGANG 1");
  const [formSistemTanding, setFormSistemTanding] = useState<TournamentSystemType>("GUGUR");
  const [formCategory, setFormCategory] = useState("TUNGGAL");
  const [formAge, setFormAge] = useState("REMAJA");
  const [formGender, setFormGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [formTahap, setFormTahap] = useState("PENYISIHAN");
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);

  // Tournament System & Bagan states
  const [selectedTournamentSystem, setSelectedTournamentSystem] = useState<TournamentSystemType>("GUGUR");
  const [selectedBaganCategoryKey, setSelectedBaganCategoryKey] = useState("tunggal_remaja_putra");
  const [poolCountSetting, setPoolCountSetting] = useState<number>(2);
  const [poolModeSetting, setPoolModeSetting] = useState<"RANKING" | "KNOCKOUT_INTERNAL">("RANKING");
  const [activePoolSubTab, setActivePoolSubTab] = useState<string>("ALL");
  const [activePemasalanIndex, setActivePemasalanIndex] = useState<number>(0);
  const [pemasalanMaxQuota, setPemasalanMaxQuota] = useState<number>(4);
  const [showPpsnRulesModal, setShowPpsnRulesModal] = useState<boolean>(false);

  // Dynamic tournament bracket data structures
  const [singleEliminationMatches, setSingleEliminationMatches] = useState<KnockoutMatch[]>([]);
  const [poolGroupsData, setPoolGroupsData] = useState<PoolGroup[]>([]);
  const [poolPlayoffMatches, setPoolPlayoffMatches] = useState<KnockoutMatch[]>([]);
  const [pemasalanBracketsData, setPemasalanBracketsData] = useState<PemasalanBracket[]>([]);

  const [rosterSearch, setRosterSearch] = useState("");
  const [showAllRoster, setShowAllRoster] = useState(true);
  const [rosterCategoryFilter, setRosterCategoryFilter] = useState<string>("ALL");
  const [rosterGenderFilter, setRosterGenderFilter] = useState<string>("ALL");
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Load athletes from local storage on mount
  useEffect(() => {
    const savedAthletes = localStorage.getItem("registered_athletes");
    if (savedAthletes) {
      try {
        const parsed = JSON.parse(savedAthletes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPoolAthletes(parsed);
        } else {
          setPoolAthletes(initialDefaultAthletes);
          localStorage.setItem("registered_athletes", JSON.stringify(initialDefaultAthletes));
        }
      } catch (e) {
        setPoolAthletes(initialDefaultAthletes);
      }
    } else {
      setPoolAthletes(initialDefaultAthletes);
      localStorage.setItem("registered_athletes", JSON.stringify(initialDefaultAthletes));
    }
    const savedHistory = localStorage.getItem("silat_seni_match_history");
    if (savedHistory) {
      try {
        setMatchHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  // Handlers for Registration & Excel / PDF
  const handleSaveAthlete = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formContingent.trim()) {
      alert("Mohon isi Nama Lengkap Atlit dan Asal Kontingen!");
      return;
    }

    if (editingAthleteId) {
      const updated = poolAthletes.map(a => a.id === editingAthleteId ? {
        ...a,
        name: formName.toUpperCase().trim(),
        contingent: formContingent.toUpperCase().trim(),
        gelanggang: formGelanggang,
        sistemTanding: formSistemTanding,
        kelas: formCategory.toUpperCase(),
        usia: formAge,
        gender: formGender,
        tahap: formTahap
      } : a);
      setPoolAthletes(updated);
      localStorage.setItem("registered_athletes", JSON.stringify(updated));
      setEditingAthleteId(null);
      playSoundByKey("success_chime");
      alert(`Data atlit ${formName.toUpperCase()} berhasil diperbarui!`);
    } else {
      const newAth: Athlete = {
        id: Date.now().toString(),
        name: formName.toUpperCase().trim(),
        contingent: formContingent.toUpperCase().trim(),
        gelanggang: formGelanggang,
        sistemTanding: formSistemTanding,
        kelas: formCategory.toUpperCase(),
        usia: formAge,
        gender: formGender,
        tahap: formTahap
      };
      const updated = [newAth, ...poolAthletes];
      setPoolAthletes(updated);
      localStorage.setItem("registered_athletes", JSON.stringify(updated));
      playSoundByKey("success_chime");
      alert(`Berhasil mendaftarkan atlit ${newAth.name}!`);
    }

    setFormName("");
    setFormContingent("");
  };

  const handleClearForm = () => {
    playSoundByKey("short_beep");
    setFormName("");
    setFormContingent("");
    setEditingAthleteId(null);
  };

  const handleResetAllData = () => {
    playSoundByKey("short_beep");
    if (confirm("Apakah Anda yakin ingin menghapus SELURUH data registrasi atlit?")) {
      setPoolAthletes([]);
      localStorage.removeItem("registered_athletes");
      alert("Seluruh data atlit telah dihapus.");
    }
  };

  const handleEditAthlete = (ath: Athlete) => {
    playSoundByKey("short_beep");
    setEditingAthleteId(ath.id);
    setFormName(ath.name);
    setFormContingent(ath.contingent);
    if (ath.gelanggang) setFormGelanggang(ath.gelanggang);
    if (ath.sistemTanding) setFormSistemTanding(ath.sistemTanding);
    if (ath.kelas) setFormCategory(ath.kelas.toUpperCase());
    if (ath.usia) setFormAge(ath.usia);
    if (ath.gender) setFormGender(ath.gender);
    if (ath.tahap) setFormTahap(ath.tahap);
  };

  const handleDeleteAthlete = (id: string) => {
    playSoundByKey("short_beep");
    const target = poolAthletes.find(a => a.id === id);
    if (confirm(`Hapus atlit ${target?.name || "ini"} dari daftar?`)) {
      const filtered = poolAthletes.filter(a => a.id !== id);
      setPoolAthletes(filtered);
      localStorage.setItem("registered_athletes", JSON.stringify(filtered));
    }
  };

  const downloadExcelTemplate = () => {
    playSoundByKey("short_beep");
    const csvHeader = "Nama Atlit,Kontingen,Gelanggang,Sistem Tanding,Kategori Jurus,Kategori Usia,Gender,Tahap\n";
    const sampleRows = "KADEK WAHYU DEWANTARA,BALI - INDONESIA,GELANGGANG 1,BATTLE,TUNGGAL,REMAJA,PUTRA,PENYISIHAN\nADI WIJAYA,JAWA TENGAH,GELANGGANG 1,BATTLE,TUNGGAL,REMAJA,PUTRA,PENYISIHAN\n";
    const blob = new Blob([csvHeader + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Template_Import_Atlit_Seni.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcelData = () => {
    playSoundByKey("short_beep");
    let csvContent = "Nama Atlit,Kontingen,Gelanggang,Sistem Tanding,Kategori Jurus,Kategori Usia,Gender,Tahap\n";
    poolAthletes.forEach(a => {
      csvContent += `"${a.name}","${a.contingent}","${a.gelanggang || "GELANGGANG 1"}","${a.sistemTanding || "BATTLE"}","${a.kelas}","${a.usia}","${a.gender}","${a.tahap || "PENYISIHAN"}"\n`;
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Export_Data_Atlit_Seni_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importExcelData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;
      const newAthletes: Athlete[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
        if (cols.length >= 2 && cols[0]) {
          newAthletes.push({
            id: `${Date.now()}_${i}`,
            name: cols[0].toUpperCase(),
            contingent: (cols[1] || "KONTINGEN").toUpperCase(),
            gelanggang: cols[2] || "GELANGGANG 1",
            sistemTanding: (cols[3] as "BATTLE" | "POOL") || "BATTLE",
            kelas: (cols[4] || "TUNGGAL").toUpperCase(),
            usia: cols[5] || "REMAJA",
            gender: (cols[6] as "PUTRA" | "PUTRI") || "PUTRA",
            tahap: cols[7] || "PENYISIHAN"
          });
        }
      }
      if (newAthletes.length > 0) {
        const merged = [...newAthletes, ...poolAthletes];
        setPoolAthletes(merged);
        localStorage.setItem("registered_athletes", JSON.stringify(merged));
        playSoundByKey("success_chime");
        alert(`Berhasil mengimpor ${newAthletes.length} data atlit!`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadPDF = () => {
    playSoundByKey("short_beep");
    window.print();
  };

  const filteredAthletes = poolAthletes.filter(ath => {
    const matchesSearch = rosterSearch.trim() === "" || 
      ath.name.toLowerCase().includes(rosterSearch.toLowerCase()) || 
      ath.contingent.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (ath.gelanggang || "").toLowerCase().includes(rosterSearch.toLowerCase());

    const matchesCategoryFilter = rosterCategoryFilter === "ALL" || (ath.kelas || "").toUpperCase() === rosterCategoryFilter.toUpperCase();
    const matchesGenderFilter = rosterGenderFilter === "ALL" || (ath.gender || "PUTRA").toUpperCase() === rosterGenderFilter.toUpperCase();

    if (!showAllRoster) {
      const matchesCategory = (ath.kelas || "").toUpperCase() === formCategory.toUpperCase();
      return matchesSearch && matchesCategory && matchesCategoryFilter && matchesGenderFilter;
    }
    return matchesSearch && matchesCategoryFilter && matchesGenderFilter;
  });

  const countTunggal = poolAthletes.filter(a => (a.kelas || "").toUpperCase() === "TUNGGAL").length;
  const countGanda = poolAthletes.filter(a => (a.kelas || "").toUpperCase() === "GANDA").length;
  const countRegu = poolAthletes.filter(a => (a.kelas || "").toUpperCase() === "REGU").length;
  const countSolo = poolAthletes.filter(a => (a.kelas || "").toUpperCase() === "SOLO KREATIF").length;
  const countPutra = poolAthletes.filter(a => (a.gender || "PUTRA").toUpperCase() === "PUTRA").length;
  const countPutri = poolAthletes.filter(a => (a.gender || "").toUpperCase() === "PUTRI").length;

  // Bagan Categories List
  const baganCategoriesList = [
    { id: "tunggal_remaja_putra", name: "TUNGGAL (Putra)", kelas: "TUNGGAL", age: "REMAJA", gender: "PUTRA" as const },
    { id: "tunggal_remaja_putri", name: "TUNGGAL (Putri)", kelas: "TUNGGAL", age: "REMAJA", gender: "PUTRI" as const },
    { id: "tunggal_dewasa_putra", name: "TUNGGAL (Putra)", kelas: "TUNGGAL", age: "DEWASA", gender: "PUTRA" as const },
    { id: "tunggal_dewasa_putri", name: "TUNGGAL (Putri)", kelas: "TUNGGAL", age: "DEWASA", gender: "PUTRI" as const },
    { id: "ganda_remaja_putra", name: "GANDA (Putra)", kelas: "GANDA", age: "REMAJA", gender: "PUTRA" as const },
    { id: "ganda_dewasa_putra", name: "GANDA (Putra)", kelas: "GANDA", age: "DEWASA", gender: "PUTRA" as const },
    { id: "regu_remaja_putra", name: "REGU (Putra)", kelas: "REGU", age: "REMAJA", gender: "PUTRA" as const },
    { id: "solo_dewasa_putra", name: "SOLO KREATIF (Putra)", kelas: "SOLO KREATIF", age: "DEWASA", gender: "PUTRA" as const },
  ];

  // Helper to extract athletes for the active category
  const getAthletesForCurrentBagan = (): TournamentAthlete[] => {
    const currentCat = baganCategoriesList.find(c => c.id === selectedBaganCategoryKey) || baganCategoriesList[0];
    const matched = poolAthletes.filter(a => 
      (a.kelas || "").toUpperCase() === currentCat.kelas && 
      (a.usia || "").toUpperCase() === currentCat.age &&
      (a.gender || "PUTRA").toUpperCase() === currentCat.gender
    );

    if (matched.length >= 2) {
      return matched.map(a => ({
        id: a.id,
        name: a.name,
        contingent: a.contingent,
        gender: a.gender,
        usia: a.usia,
        kelas: a.kelas
      }));
    }

    // Default sample athletes if not yet populated
    return [
      { id: "demo-1", name: "ADI WIJAYA", contingent: "JAWA TENGAH", gender: currentCat.gender, usia: currentCat.age, kelas: currentCat.kelas },
      { id: "demo-2", name: "HERI KUSUMA", contingent: "BALI", gender: currentCat.gender, usia: currentCat.age, kelas: currentCat.kelas },
      { id: "demo-3", name: "FARHAN RAZAK", contingent: "JAWA BARAT", gender: currentCat.gender, usia: currentCat.age, kelas: currentCat.kelas },
      { id: "demo-4", name: "RIZKY PUTRA", contingent: "JAWA TIMUR", gender: currentCat.gender, usia: currentCat.age, kelas: currentCat.kelas },
    ];
  };

  // Refresh and initialize bracket data
  const refreshTournamentData = (shuffle: boolean = false) => {
    let athletes = getAthletesForCurrentBagan();
    if (shuffle) {
      athletes = [...athletes].sort(() => Math.random() - 0.5);
    }
    const currentCat = baganCategoriesList.find(c => c.id === selectedBaganCategoryKey) || baganCategoriesList[0];
    const catTitle = `${currentCat.kelas} ${currentCat.age} ${currentCat.gender}`;

    // 1. Single Elimination
    const gugur = generateSingleEliminationBrackets(athletes, catTitle);
    setSingleEliminationMatches(gugur);

    // 2. Pool Groups
    const poolRes = generatePoolGroups(athletes, catTitle, poolCountSetting, poolModeSetting);
    setPoolGroupsData(poolRes.pools);
    setPoolPlayoffMatches(poolRes.playoffMatches);

    // 3. Pemasalan
    const pemasalan = generatePemasalanBrackets(athletes, catTitle, pemasalanMaxQuota);
    setPemasalanBracketsData(pemasalan);
  };

  useEffect(() => {
    refreshTournamentData();
  }, [selectedBaganCategoryKey, poolCountSetting, poolModeSetting, poolAthletes.length, pemasalanMaxQuota]);

  // Load a match from the bracket directly into live scoring
  const handleLoadMatchToScoring = (
    matchTitle: string,
    biruName: string,
    biruContingent: string,
    merahName: string,
    merahContingent: string,
    tahapName: string,
    categoryName: string = "tunggal",
    ageName: string = "REMAJA",
    genderName: "PUTRA" | "PUTRI" = "PUTRA"
  ) => {
    playSoundByKey("success_chime");
    setPartaiTanding(matchTitle);
    setNamaAtlitBiru(biruName || "SUDUT BIRU");
    setKontingenBiru(biruContingent || "KONTINGEN BIRU");
    setNamaAtlitMerah(merahName || "SUDUT MERAH");
    setKontingenMerah(merahContingent || "KONTINGEN MERAH");
    setSelectedCategory(categoryName.toLowerCase());
    setSelectedAge(ageName);
    setGender(genderName);
    setTahapPertandingan(tahapName);

    saveSharedState({
      partaiTanding: matchTitle,
      selectedCategory: categoryName.toLowerCase(),
      selectedAge: ageName,
      gender: genderName,
      tahapPertandingan: tahapName,
      namaAtlitBiru: biruName || "SUDUT BIRU",
      kontingenBiru: biruContingent || "KONTINGEN BIRU",
      namaAtlitMerah: merahName || "SUDUT MERAH",
      kontingenMerah: merahContingent || "KONTINGEN MERAH",
      performerName: activeCorner === "biru" ? (biruName || "SUDUT BIRU") : (merahName || "SUDUT MERAH"),
      contingent: activeCorner === "biru" ? (biruContingent || "KONTINGEN BIRU") : (merahContingent || "KONTINGEN MERAH"),
    });

    setShowRegistrasiOverlay(false);
  };

  // Advance winner in Single Elimination
  const handlePromoteGugurWinner = (matchId: string, winnerCorner: "biru" | "merah") => {
    playSoundByKey("success_chime");
    setSingleEliminationMatches(prev => {
      const updated = [...prev];
      const matchIdx = updated.findIndex(m => m.id === matchId);
      if (matchIdx === -1) return prev;

      const currentMatch = updated[matchIdx];
      const winner = winnerCorner === "biru" ? currentMatch.p1 : currentMatch.p2;
      if (!winner) return prev;

      updated[matchIdx] = {
        ...currentMatch,
        winner,
        status: "COMPLETED"
      };

      // If next match exists, promote winner
      if (currentMatch.nextMatchId) {
        const nextIdx = updated.findIndex(m => m.id === currentMatch.nextMatchId);
        if (nextIdx !== -1) {
          const nextMatch = updated[nextIdx];
          if (!nextMatch.p1 || nextMatch.p1.name.includes("Pemenang")) {
            updated[nextIdx] = { ...nextMatch, p1: winner };
          } else if (!nextMatch.p2 || nextMatch.p2.name.includes("Pemenang")) {
            updated[nextIdx] = { ...nextMatch, p2: winner };
          }
        }
      }

      return updated;
    });
  };

  // Advance winner in Pool Playoff
  const handlePromotePlayoffWinner = (matchId: string, winnerCorner: "biru" | "merah") => {
    playSoundByKey("success_chime");
    setPoolPlayoffMatches(prev => {
      const updated = [...prev];
      const matchIdx = updated.findIndex(m => m.id === matchId);
      if (matchIdx === -1) return prev;

      const currentMatch = updated[matchIdx];
      const winner = winnerCorner === "biru" ? currentMatch.p1 : currentMatch.p2;
      if (!winner) return prev;

      updated[matchIdx] = {
        ...currentMatch,
        winner,
        status: "COMPLETED"
      };

      // Grand Final is index 2 (PLAYOFF_GRAND_FINAL)
      const finalIdx = updated.findIndex(m => m.id === "PLAYOFF_GRAND_FINAL");
      if (finalIdx !== -1) {
        const finalMatch = updated[finalIdx];
        if (matchId === "PLAYOFF_SEMIFINAL_1") {
          updated[finalIdx] = {
            ...finalMatch,
            p1: winner,
            athleteBlue: winner
          };
        } else if (matchId === "PLAYOFF_SEMIFINAL_2") {
          updated[finalIdx] = {
            ...finalMatch,
            p2: winner,
            athleteRed: winner
          };
        }
      }

      return updated;
    });
  };

  // Export Pemasalan Medal Recap to CSV
  const exportPemasalanMedalsCSV = () => {
    playSoundByKey("short_beep");
    let csv = "Bagan,Kategori,Juara 1 (Emas),Kontingen Emas,Juara 2 (Perak),Kontingen Perak,Juara 3 Bersama A (Perunggu),Kontingen Perunggu A,Juara 3 Bersama B (Perunggu),Kontingen Perunggu B\n";
    pemasalanBracketsData.forEach((b, idx) => {
      csv += `"BAGAN ${b.poolIndex || idx + 1}","${selectedBaganCategoryKey}","${b.juara1?.name || "-"}","${b.juara1?.contingent || "-"}","${b.juara2?.name || "-"}","${b.juara2?.contingent || "-"}","${b.juara3BersamaA?.name || "-"}","${b.juara3BersamaA?.contingent || "-"}","${b.juara3BersamaB?.name || "-"}","${b.juara3BersamaB?.contingent || "-"}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Rekapitulasi_Medali_Pemasalan_${selectedBaganCategoryKey}_IPSI2026_PERSILAT.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update Pemasalan Match Outcome
  const handlePemasalanOutcome = (
    bracketIndex: number,
    matchKey: "sf1" | "sf2" | "final",
    winnerCorner: "p1" | "p2"
  ) => {
    playSoundByKey("success_chime");
    setPemasalanBracketsData(prev => {
      if (!prev[bracketIndex]) return prev;
      const updatedBracket = updatePemasalanOutcome(prev[bracketIndex], matchKey, winnerCorner);
      const copy = [...prev];
      copy[bracketIndex] = updatedBracket;
      return copy;
    });
  };

  // Generate complete schedule into Partai List based on chosen tournament system
  const handleGenerateScheduleFromSystem = (system: TournamentSystemType) => {
    playSoundByKey("success_chime");
    const currentCat = baganCategoriesList.find(c => c.id === selectedBaganCategoryKey) || baganCategoriesList[0];
    const catName = currentCat.name;
    const newPartais: typeof partaiList = [];

    if (system === "GUGUR") {
      (singleEliminationMatches || []).forEach((m, idx) => {
        if (!m) return;
        const pNum = m.partaiNumber ?? m.matchNumber ?? (idx + 1);
        newPartais.push({
          id: `gugur_${m.id || idx}_${idx + 1}`,
          nomorPartai: (pNum ?? (idx + 1)).toString(),
          checked: true,
          kategori: `${catName} (${m.stage || m.roundName || "BABAK"})`,
          biru: {
            name: m.p1?.name || m.athleteBlue?.name || "TBD (SUDUT BIRU)",
            contingent: m.p1?.contingent || m.athleteBlue?.contingent || "-"
          },
          merah: {
            name: m.p2?.name || m.athleteRed?.name || "TBD (SUDUT MERAH)",
            contingent: m.p2?.contingent || m.athleteRed?.contingent || "-"
          }
        });
      });
    } else if (system === "POOL") {
      (poolGroupsData || []).forEach(pool => {
        if (!pool) return;
        const matchesList = pool.matches || pool.internalMatches || [];
        matchesList.forEach((m, idx) => {
          if (!m) return;
          newPartais.push({
            id: `pool_${pool.name}_${idx + 1}`,
            nomorPartai: (newPartais.length + 1).toString(),
            checked: true,
            kategori: `${catName} (${pool.name} - ${m.stage || m.roundName || "PENYISIHAN"})`,
            biru: {
              name: m.p1?.name || m.athleteBlue?.name || "TBD (SUDUT BIRU)",
              contingent: m.p1?.contingent || m.athleteBlue?.contingent || "-"
            },
            merah: {
              name: m.p2?.name || m.athleteRed?.name || "TBD (SUDUT MERAH)",
              contingent: m.p2?.contingent || m.athleteRed?.contingent || "-"
            }
          });
        });
      });
      (poolPlayoffMatches || []).forEach(m => {
        if (!m) return;
        newPartais.push({
          id: `playoff_${m.id}`,
          nomorPartai: (newPartais.length + 1).toString(),
          checked: true,
          kategori: `${catName} (PLAYOFF - ${m.stage || m.roundName || "BABAK UTAMA"})`,
          biru: {
            name: m.p1?.name || m.athleteBlue?.name || "JUARA POOL A",
            contingent: m.p1?.contingent || m.athleteBlue?.contingent || "-"
          },
          merah: {
            name: m.p2?.name || m.athleteRed?.name || "JUARA POOL B",
            contingent: m.p2?.contingent || m.athleteRed?.contingent || "-"
          }
        });
      });
    } else if (system === "PEMASALAN") {
      (pemasalanBracketsData || []).forEach((b, bIdx) => {
        if (!b) return;
        const sf1 = b.sf1 || b.semifinal1;
        const sf2 = b.sf2 || b.semifinal2;
        const finalMatch = b.final || b.finalMatch;

        if (sf1) {
          newPartais.push({
            id: `pemasalan_sf1_${bIdx}`,
            nomorPartai: (newPartais.length + 1).toString(),
            checked: true,
            kategori: `${catName} (BAGAN ${b.poolIndex || (bIdx + 1)} - SEMIFINAL 1)`,
            biru: {
              name: sf1.p1?.name || sf1.athleteBlue?.name || "ATLET 1",
              contingent: sf1.p1?.contingent || sf1.athleteBlue?.contingent || "-"
            },
            merah: {
              name: sf1.p2?.name || sf1.athleteRed?.name || "ATLET 2",
              contingent: sf1.p2?.contingent || sf1.athleteRed?.contingent || "-"
            }
          });
        }
        if (sf2) {
          newPartais.push({
            id: `pemasalan_sf2_${bIdx}`,
            nomorPartai: (newPartais.length + 1).toString(),
            checked: true,
            kategori: `${catName} (BAGAN ${b.poolIndex || (bIdx + 1)} - SEMIFINAL 2)`,
            biru: {
              name: sf2.p1?.name || sf2.athleteBlue?.name || "ATLET 3",
              contingent: sf2.p1?.contingent || sf2.athleteBlue?.contingent || "-"
            },
            merah: {
              name: sf2.p2?.name || sf2.athleteRed?.name || "ATLET 4",
              contingent: sf2.p2?.contingent || sf2.athleteRed?.contingent || "-"
            }
          });
        }
        if (finalMatch) {
          newPartais.push({
            id: `pemasalan_final_${bIdx}`,
            nomorPartai: (newPartais.length + 1).toString(),
            checked: true,
            kategori: `${catName} (BAGAN ${b.poolIndex || (bIdx + 1)} - FINAL EMAS/PERAK)`,
            biru: {
              name: finalMatch.p1?.name || finalMatch.athleteBlue?.name || "PEMENANG SF 1",
              contingent: finalMatch.p1?.contingent || finalMatch.athleteBlue?.contingent || "-"
            },
            merah: {
              name: finalMatch.p2?.name || finalMatch.athleteRed?.name || "PEMENANG SF 2",
              contingent: finalMatch.p2?.contingent || finalMatch.athleteRed?.contingent || "-"
            }
          });
        }
      });
    }

    if (newPartais.length > 0) {
      setPartaiList(newPartais);
      alert(`Berhasil membuat ${newPartais.length} jadwal partai untuk ${system === "GUGUR" ? "Sistem Gugur Tunggal" : system === "POOL" ? "Sistem Pool" : "Sistem Pemasalan"}! Silakan cek di tab '3. KONTROL PARTAI'.`);
    }
  };

  // Pack and save all states into a single JSON object in localStorage
  const saveSharedState = (updates: Partial<{
    selectedCategory: string;
    selectedAge: string;
    gender: "PUTRA" | "PUTRI";
    performerName: string;
    contingent: string;
    timeRemaining: number;
    timeActual: number;
    isTimerRunning: boolean;
    isMatchUnlocked: boolean;
    isTimer1Running: boolean;
    isTimer2Running: boolean;
    timerStartedAt: number;
    timer1StartedAt: number;
    timer1BaseRemaining: number;
    timer2StartedAt: number;
    timer2BaseActual: number;
    timerBaseRemaining: number;
    timerBaseActual: number;
    deductions: typeof deductions;
    judgesCount: number;
    juriScores: JuriScore[];
    logs: typeof logs;
    namaEvent: string;
    tempatPelaksanaan: string;
    waktuPelaksanaan: string;
    partaiTanding: string;
    tahapPertandingan: string;
    durasiTampil: string;
    namaAtlitBiru: string;
    kontingenBiru: string;
    namaAtlitMerah: string;
    kontingenMerah: string;
    activeCorner: "biru" | "merah" | null | "";
    logoKiri: string;
    logoKanan: string;
    juriScoresBiru: JuriScore[];
    juriScoresMerah: JuriScore[];
    deductionsBiru: typeof deductions;
    deductionsMerah: typeof deductions;
    timeRemainingBiru: number;
    timeRemainingMerah: number;
    timeActualBiru: number;
    timeActualMerah: number;
    matchHistory: any[];
    disqualifiedBiru: boolean;
    undurDiriBiru: boolean;
    disqualifiedMerah: boolean;
    undurDiriMerah: boolean;
  }>) => {
    // Merge existing local states with requested updates
    const nextIsMatchUnlocked = updates.isMatchUnlocked !== undefined ? updates.isMatchUnlocked : isMatchUnlocked;
    const nextIsTimer1Running = updates.isTimer1Running !== undefined ? updates.isTimer1Running : isTimer1Running;
    const nextIsTimer2Running = updates.isTimer2Running !== undefined ? updates.isTimer2Running : isTimer2Running;
    const nextIsTimerRunning = updates.isTimerRunning !== undefined ? updates.isTimerRunning : (nextIsTimer1Running || nextIsTimer2Running);

    let nextTimer1StartedAt = timer1StartedAt;
    if (updates.timer1StartedAt !== undefined) {
      nextTimer1StartedAt = updates.timer1StartedAt;
    } else if (nextIsTimer1Running && !isTimer1Running) {
      nextTimer1StartedAt = Date.now();
    }

    let nextTimer2StartedAt = timer2StartedAt;
    if (updates.timer2StartedAt !== undefined) {
      nextTimer2StartedAt = updates.timer2StartedAt;
    } else if (nextIsTimer2Running && !isTimer2Running) {
      nextTimer2StartedAt = Date.now();
    }

    let nextTimer1BaseRemaining = timer1BaseRemaining;
    if (updates.timer1BaseRemaining !== undefined) {
      nextTimer1BaseRemaining = updates.timer1BaseRemaining;
    } else if (updates.timerBaseRemaining !== undefined) {
      nextTimer1BaseRemaining = updates.timerBaseRemaining;
    } else if (!nextIsTimer1Running && updates.timeRemaining !== undefined) {
      nextTimer1BaseRemaining = updates.timeRemaining;
    } else if (nextIsTimer1Running && !isTimer1Running) {
      nextTimer1BaseRemaining = timeRemaining;
    }

    let nextTimer2BaseActual = timer2BaseActual;
    if (updates.timer2BaseActual !== undefined) {
      nextTimer2BaseActual = updates.timer2BaseActual;
    } else if (updates.timerBaseActual !== undefined) {
      nextTimer2BaseActual = updates.timerBaseActual;
    } else if (!nextIsTimer2Running && updates.timeActual !== undefined) {
      nextTimer2BaseActual = updates.timeActual;
    } else if (nextIsTimer2Running && !isTimer2Running) {
      nextTimer2BaseActual = timeActual;
    }

    const nextTimeRemaining = updates.timeRemaining !== undefined ? updates.timeRemaining : timeRemaining;
    const nextTimeActual = updates.timeActual !== undefined ? updates.timeActual : timeActual;

    const stateToSave = {
      selectedCategory: updates.selectedCategory !== undefined ? updates.selectedCategory : selectedCategory,
      selectedAge: updates.selectedAge !== undefined ? updates.selectedAge : selectedAge,
      gender: updates.gender !== undefined ? updates.gender : gender,
      performerName: updates.performerName !== undefined ? updates.performerName : performerName,
      contingent: updates.contingent !== undefined ? updates.contingent : contingent,
      timeRemaining: nextTimeRemaining,
      timeActual: nextTimeActual,
      isTimerRunning: nextIsTimerRunning,
      isMatchUnlocked: nextIsMatchUnlocked,
      isTimer1Running: nextIsTimer1Running,
      isTimer2Running: nextIsTimer2Running,
      timerStartedAt: nextTimer2StartedAt || nextTimer1StartedAt,
      timer1StartedAt: nextTimer1StartedAt,
      timer2StartedAt: nextTimer2StartedAt,
      timerBaseRemaining: nextTimer1BaseRemaining,
      timer1BaseRemaining: nextTimer1BaseRemaining,
      timerBaseActual: nextTimer2BaseActual,
      timer2BaseActual: nextTimer2BaseActual,
      deductions: updates.deductions !== undefined ? updates.deductions : deductions,
      judgesCount: updates.judgesCount !== undefined ? updates.judgesCount : judgesCount,
      juriScores: updates.juriScores !== undefined ? updates.juriScores : juriScores,
      logs: updates.logs !== undefined ? updates.logs : logs,
      
      namaEvent: updates.namaEvent !== undefined ? updates.namaEvent : namaEvent,
      tempatPelaksanaan: updates.tempatPelaksanaan !== undefined ? updates.tempatPelaksanaan : tempatPelaksanaan,
      waktuPelaksanaan: updates.waktuPelaksanaan !== undefined ? updates.waktuPelaksanaan : waktuPelaksanaan,
      partaiTanding: updates.partaiTanding !== undefined ? updates.partaiTanding : partaiTanding,
      tahapPertandingan: updates.tahapPertandingan !== undefined ? updates.tahapPertandingan : tahapPertandingan,
      durasiTampil: updates.durasiTampil !== undefined ? updates.durasiTampil : durasiTampil,
      namaAtlitBiru: updates.namaAtlitBiru !== undefined ? updates.namaAtlitBiru : namaAtlitBiru,
      kontingenBiru: updates.kontingenBiru !== undefined ? updates.kontingenBiru : kontingenBiru,
      namaAtlitMerah: updates.namaAtlitMerah !== undefined ? updates.namaAtlitMerah : namaAtlitMerah,
      kontingenMerah: updates.kontingenMerah !== undefined ? updates.kontingenMerah : kontingenMerah,
      activeCorner: updates.activeCorner !== undefined ? updates.activeCorner : activeCorner,
      logoKiri: updates.logoKiri !== undefined ? updates.logoKiri : logoKiri,
      logoKanan: updates.logoKanan !== undefined ? updates.logoKanan : logoKanan,
      
      juriScoresBiru: updates.juriScoresBiru !== undefined 
        ? updates.juriScoresBiru 
        : (updates.juriScores !== undefined && (activeCorner === "biru" || !activeCorner) ? updates.juriScores : juriScoresBiru),
      juriScoresMerah: updates.juriScoresMerah !== undefined 
        ? updates.juriScoresMerah 
        : (updates.juriScores !== undefined && activeCorner === "merah" ? updates.juriScores : juriScoresMerah),
      deductionsBiru: updates.deductionsBiru !== undefined 
        ? updates.deductionsBiru 
        : (updates.deductions !== undefined && (activeCorner === "biru" || !activeCorner) ? updates.deductions : deductionsBiru),
      deductionsMerah: updates.deductionsMerah !== undefined 
        ? updates.deductionsMerah 
        : (updates.deductions !== undefined && activeCorner === "merah" ? updates.deductions : deductionsMerah),
      timeRemainingBiru: updates.timeRemainingBiru !== undefined 
        ? updates.timeRemainingBiru 
        : (updates.timeRemaining !== undefined && (activeCorner === "biru" || !activeCorner) ? nextTimeRemaining : timeRemainingBiru),
      timeRemainingMerah: updates.timeRemainingMerah !== undefined 
        ? updates.timeRemainingMerah 
        : (updates.timeRemaining !== undefined && activeCorner === "merah" ? nextTimeRemaining : timeRemainingMerah),
      timeActualBiru: updates.timeActualBiru !== undefined 
        ? updates.timeActualBiru 
        : (updates.timeActual !== undefined && (activeCorner === "biru" || !activeCorner) ? nextTimeActual : timeActualBiru),
      timeActualMerah: updates.timeActualMerah !== undefined 
        ? updates.timeActualMerah 
        : (updates.timeActual !== undefined && activeCorner === "merah" ? nextTimeActual : timeActualMerah),
      matchHistory: updates.matchHistory !== undefined ? updates.matchHistory : matchHistory,
      disqualifiedBiru: updates.disqualifiedBiru !== undefined ? updates.disqualifiedBiru : disqualifiedBiru,
      undurDiriBiru: updates.undurDiriBiru !== undefined ? updates.undurDiriBiru : undurDiriBiru,
      disqualifiedMerah: updates.disqualifiedMerah !== undefined ? updates.disqualifiedMerah : disqualifiedMerah,
      undurDiriMerah: updates.undurDiriMerah !== undefined ? updates.undurDiriMerah : undurDiriMerah,
      timestamp: Date.now()
    };

    // Apply locally first for immediate responsiveness
    if (updates.selectedCategory !== undefined) setSelectedCategory(updates.selectedCategory);
    if (updates.selectedAge !== undefined) setSelectedAge(updates.selectedAge);
    if (updates.gender !== undefined) setGender(updates.gender);
    if (updates.performerName !== undefined) setPerformerName(updates.performerName);
    if (updates.contingent !== undefined) setContingent(updates.contingent);
    if (updates.timeRemaining !== undefined) setTimeRemaining(updates.timeRemaining);
    if (updates.timeActual !== undefined) setTimeActual(updates.timeActual);
    if (updates.isMatchUnlocked !== undefined) setIsMatchUnlocked(updates.isMatchUnlocked);
    if (updates.isTimer1Running !== undefined) setIsTimer1Running(updates.isTimer1Running);
    if (updates.isTimer2Running !== undefined) setIsTimer2Running(updates.isTimer2Running);
    if (updates.isTimerRunning !== undefined) setIsTimerRunning(updates.isTimerRunning);
    else setIsTimerRunning(nextIsTimerRunning);

    if (updates.timer1StartedAt !== undefined) setTimer1StartedAt(updates.timer1StartedAt);
    if (updates.timer2StartedAt !== undefined) setTimer2StartedAt(updates.timer2StartedAt);
    if (updates.timer1BaseRemaining !== undefined) setTimer1BaseRemaining(updates.timer1BaseRemaining);
    if (updates.timer2BaseActual !== undefined) setTimer2BaseActual(updates.timer2BaseActual);
    if (updates.timerBaseRemaining !== undefined) setTimerBaseRemaining(updates.timerBaseRemaining);
    if (updates.timerBaseActual !== undefined) setTimerBaseActual(updates.timerBaseActual);

    if (updates.deductions !== undefined) setDeductions(updates.deductions);
    if (updates.judgesCount !== undefined) setJudgesCount(updates.judgesCount);
    if (updates.juriScores !== undefined) setJuriScores(updates.juriScores);
    if (updates.logs !== undefined) setLogs(updates.logs);

    if (updates.namaEvent !== undefined) setNamaEvent(updates.namaEvent);
    if (updates.tempatPelaksanaan !== undefined) setTempatPelaksanaan(updates.tempatPelaksanaan);
    if (updates.waktuPelaksanaan !== undefined) setWaktuPelaksanaan(updates.waktuPelaksanaan);
    if (updates.partaiTanding !== undefined) setPartaiTanding(updates.partaiTanding);
    if (updates.tahapPertandingan !== undefined) setTahapPertandingan(updates.tahapPertandingan);
    if (updates.durasiTampil !== undefined) setDurasiTampil(updates.durasiTampil);
    if (updates.namaAtlitBiru !== undefined) setNamaAtlitBiru(updates.namaAtlitBiru);
    if (updates.kontingenBiru !== undefined) setKontingenBiru(updates.kontingenBiru);
    if (updates.namaAtlitMerah !== undefined) setNamaAtlitMerah(updates.namaAtlitMerah);
    if (updates.kontingenMerah !== undefined) setKontingenMerah(updates.kontingenMerah);
    if (updates.activeCorner !== undefined) setActiveCorner(updates.activeCorner);
    if (updates.logoKiri !== undefined) setLogoKiri(updates.logoKiri);
    if (updates.logoKanan !== undefined) setLogoKanan(updates.logoKanan);

    if (updates.juriScoresBiru !== undefined) {
      setJuriScoresBiru(updates.juriScoresBiru);
    } else if (updates.juriScores !== undefined && (activeCorner === "biru" || !activeCorner)) {
      setJuriScoresBiru(updates.juriScores);
    }

    if (updates.juriScoresMerah !== undefined) {
      setJuriScoresMerah(updates.juriScoresMerah);
    } else if (updates.juriScores !== undefined && activeCorner === "merah") {
      setJuriScoresMerah(updates.juriScores);
    }

    if (updates.deductionsBiru !== undefined) {
      setDeductionsBiru(updates.deductionsBiru);
    } else if (updates.deductions !== undefined && (activeCorner === "biru" || !activeCorner)) {
      setDeductionsBiru(updates.deductions);
    }

    if (updates.deductionsMerah !== undefined) {
      setDeductionsMerah(updates.deductionsMerah);
    } else if (updates.deductions !== undefined && activeCorner === "merah") {
      setDeductionsMerah(updates.deductions);
    }

    if (updates.timeRemainingBiru !== undefined) {
      setTimeRemainingBiru(updates.timeRemainingBiru);
    } else if (updates.timeRemaining !== undefined && (activeCorner === "biru" || !activeCorner)) {
      setTimeRemainingBiru(nextTimeRemaining);
    }

    if (updates.timeRemainingMerah !== undefined) {
      setTimeRemainingMerah(updates.timeRemainingMerah);
    } else if (updates.timeRemaining !== undefined && activeCorner === "merah") {
      setTimeRemainingMerah(nextTimeRemaining);
    }

    if (updates.timeActualBiru !== undefined) {
      setTimeActualBiru(updates.timeActualBiru);
    } else if (updates.timeActual !== undefined && (activeCorner === "biru" || !activeCorner)) {
      setTimeActualBiru(nextTimeActual);
    }

    if (updates.timeActualMerah !== undefined) {
      setTimeActualMerah(updates.timeActualMerah);
    } else if (updates.timeActual !== undefined && activeCorner === "merah") {
      setTimeActualMerah(nextTimeActual);
    }

    if (updates.disqualifiedBiru !== undefined) setDisqualifiedBiru(updates.disqualifiedBiru);
    if (updates.undurDiriBiru !== undefined) setUndurDiriBiru(updates.undurDiriBiru);
    if (updates.disqualifiedMerah !== undefined) setDisqualifiedMerah(updates.disqualifiedMerah);
    if (updates.undurDiriMerah !== undefined) setUndurDiriMerah(updates.undurDiriMerah);
    if (updates.matchHistory !== undefined) {
      setMatchHistory(updates.matchHistory);
      localStorage.setItem("silat_seni_match_history", JSON.stringify(updates.matchHistory));
    }

    localStorage.setItem("silat_seni_match_state", JSON.stringify(stateToSave));
  };

  // Sync state from localStorage on mount and when other tabs change it
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem("silat_seni_match_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSelectedCategory(parsed.selectedCategory);
          setSelectedAge(parsed.selectedAge);
          setGender(parsed.gender);
          setPerformerName(parsed.performerName);
          setContingent(parsed.contingent);

          if (parsed.isMatchUnlocked !== undefined) setIsMatchUnlocked(!!parsed.isMatchUnlocked);

          const t1Run = parsed.isTimer1Running !== undefined ? !!parsed.isTimer1Running : !!parsed.isTimerRunning;
          const t2Run = parsed.isTimer2Running !== undefined ? !!parsed.isTimer2Running : !!parsed.isTimerRunning;
          setIsTimer1Running(t1Run);
          setIsTimer2Running(t2Run);
          setIsTimerRunning(t1Run || t2Run);

          const t1Start = parsed.timer1StartedAt || parsed.timerStartedAt || 0;
          const t2Start = parsed.timer2StartedAt || parsed.timerStartedAt || 0;
          const t1BaseRem = parsed.timer1BaseRemaining !== undefined ? parsed.timer1BaseRemaining : (parsed.timerBaseRemaining !== undefined ? parsed.timerBaseRemaining : (parsed.timeRemaining || 0));
          const t2BaseAct = parsed.timer2BaseActual !== undefined ? parsed.timer2BaseActual : (parsed.timerBaseActual !== undefined ? parsed.timerBaseActual : (parsed.timeActual || 0));

          setTimer1StartedAt(t1Start);
          setTimer2StartedAt(t2Start);
          setTimer1BaseRemaining(t1BaseRem);
          setTimer2BaseActual(t2BaseAct);
          setTimerBaseRemaining(t1BaseRem);
          setTimerBaseActual(t2BaseAct);

          const now = Date.now();
          const limit = getDurasiSeconds(parsed.durasiTampil || "03:00");

          let computedRem = parsed.timeRemaining !== undefined ? parsed.timeRemaining : 0;
          if (t1Run && t1Start > 0) {
            const elapsedSec1 = Math.floor(Math.max(0, now - t1Start) / 1000);
            computedRem = Math.min(limit, t1BaseRem + elapsedSec1);
          }

          let computedAct = parsed.timeActual !== undefined ? parsed.timeActual : 0;
          if (t2Run && t2Start > 0) {
            const elapsedSec2 = Math.floor(Math.max(0, now - t2Start) / 1000);
            computedAct = t2BaseAct + elapsedSec2;
          }

          setTimeRemaining(computedRem);
          setTimeActual(computedAct);

          // Sanitize old mock submitted scores from previous sessions if match hasn't actually started
          const isOldMockSubmitted = (scores?: JuriScore[]) => {
            return scores && scores.length === 10 && scores.every(j => j.submitted === true && (!parsed.timeActual || parsed.timeActual === 0));
          };
          if (isOldMockSubmitted(parsed.juriScores)) {
            parsed.juriScores = parsed.juriScores.map((j: JuriScore) => ({ ...j, submitted: false }));
          }
          if (isOldMockSubmitted(parsed.juriScoresBiru)) {
            parsed.juriScoresBiru = parsed.juriScoresBiru.map((j: JuriScore) => ({ ...j, submitted: false }));
          }
          if (isOldMockSubmitted(parsed.juriScoresMerah)) {
            parsed.juriScoresMerah = parsed.juriScoresMerah.map((j: JuriScore) => ({ ...j, submitted: false }));
          }

          setDeductions(parsed.deductions);
          setJudgesCount(parsed.judgesCount);
          setJuriScores(parsed.juriScores);
          setLogs(parsed.logs || []);

          if (parsed.namaEvent !== undefined) setNamaEvent(parsed.namaEvent);
          if (parsed.tempatPelaksanaan !== undefined) setTempatPelaksanaan(parsed.tempatPelaksanaan);
          if (parsed.waktuPelaksanaan !== undefined) setWaktuPelaksanaan(parsed.waktuPelaksanaan);
          if (parsed.partaiTanding !== undefined) setPartaiTanding(parsed.partaiTanding);
          if (parsed.tahapPertandingan !== undefined) setTahapPertandingan(parsed.tahapPertandingan);
          if (parsed.durasiTampil !== undefined) setDurasiTampil(parsed.durasiTampil);
          if (parsed.namaAtlitBiru !== undefined) setNamaAtlitBiru(parsed.namaAtlitBiru);
          if (parsed.kontingenBiru !== undefined) setKontingenBiru(parsed.kontingenBiru);
          if (parsed.namaAtlitMerah !== undefined) setNamaAtlitMerah(parsed.namaAtlitMerah);
          if (parsed.kontingenMerah !== undefined) setKontingenMerah(parsed.kontingenMerah);
          if (parsed.activeCorner !== undefined) setActiveCorner(parsed.activeCorner);
          if (parsed.logoKiri !== undefined) setLogoKiri(parsed.logoKiri);
          if (parsed.logoKanan !== undefined) setLogoKanan(parsed.logoKanan);

          if (parsed.juriScoresBiru !== undefined) setJuriScoresBiru(parsed.juriScoresBiru);
          if (parsed.juriScoresMerah !== undefined) setJuriScoresMerah(parsed.juriScoresMerah);
          if (parsed.deductionsBiru !== undefined) setDeductionsBiru(parsed.deductionsBiru);
          if (parsed.deductionsMerah !== undefined) setDeductionsMerah(parsed.deductionsMerah);
          if (parsed.timeRemainingBiru !== undefined) setTimeRemainingBiru(parsed.timeRemainingBiru);
          if (parsed.timeRemainingMerah !== undefined) setTimeRemainingMerah(parsed.timeRemainingMerah);
          if (parsed.timeActualBiru !== undefined) setTimeActualBiru(parsed.timeActualBiru);
          if (parsed.timeActualMerah !== undefined) setTimeActualMerah(parsed.timeActualMerah);
          if (parsed.matchHistory !== undefined) setMatchHistory(parsed.matchHistory);
          if (parsed.disqualifiedBiru !== undefined) setDisqualifiedBiru(parsed.disqualifiedBiru);
          if (parsed.undurDiriBiru !== undefined) setUndurDiriBiru(parsed.undurDiriBiru);
          if (parsed.disqualifiedMerah !== undefined) setDisqualifiedMerah(parsed.disqualifiedMerah);
          if (parsed.undurDiriMerah !== undefined) setUndurDiriMerah(parsed.undurDiriMerah);
        } catch (e) {
          console.error("Error reading shared state:", e);
        }
      }
    };

    // Load initial state
    handleSync();

    // Listen to storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "silat_seni_match_state") {
        handleSync();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Listen for Shift key to trigger Bell/Horn when role is sekretaris
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (role !== "sekretaris") return;
      
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      
      if (e.key === "Shift") {
        e.preventDefault();
        playSoundByKey("buzzer");
        const updatedLogs = [
          { time: formatTime(timeRemaining), msg: "BELL / HORN dibunyikan oleh Sekretaris (Shortcut Shift)", type: "system" as const },
          ...logs
        ];
        saveSharedState({ logs: updatedLogs });
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [role, timeRemaining, logs]);

  const getDurasiSeconds = (dur: string) => {
    if (dur === "02:00") return 120;
    if (dur === "01:30") return 90;
    if (dur === "01:00") return 60;
    return 180; // default 03:00
  };

  // High-precision timer tick loop synchronized across all panels (Dewan, Monitor, Juri, Sekretaris)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isTimer1Running || isTimer2Running || isTimerRunning) {
      timer = setInterval(() => {
        const limit = getDurasiSeconds(durasiTampil);
        const now = Date.now();
        
        let nextRemaining = timeRemaining;
        let nextActual = timeActual;
        let buzzerTriggered = false;

        // Timer 1: Arena Match Timer (ticks up to limit 03:00)
        if (isTimer1Running && timer1StartedAt > 0) {
          const elapsedSec1 = Math.floor(Math.max(0, now - timer1StartedAt) / 1000);
          nextRemaining = timer1BaseRemaining + elapsedSec1;
          if (nextRemaining >= limit) {
            nextRemaining = limit;
            buzzerTriggered = true;
          }
        }

        // Timer 2: Actual Performer Timer (freezes when isTimer2Running is false)
        if (isTimer2Running && timer2StartedAt > 0) {
          const elapsedSec2 = Math.floor(Math.max(0, now - timer2StartedAt) / 1000);
          nextActual = timer2BaseActual + elapsedSec2;
        }

        if (buzzerTriggered) {
          playSoundByKey("buzzer");
          const updatedLogs = [
            { time: formatTime(limit), msg: "Waktu tampil mencapai batas (Buzzer)!", type: "system" as const },
            ...logs
          ];

          saveSharedState({
            isTimer1Running: false,
            isTimer2Running: false,
            isTimerRunning: false,
            timeRemaining: limit,
            timeActual: nextActual,
            timer1BaseRemaining: limit,
            timer2BaseActual: nextActual,
            timer1StartedAt: 0,
            timer2StartedAt: 0,
            logs: updatedLogs
          });
        } else {
          // Local real-time update for all open views (Sekretaris, Dewan, Monitor, Juri)
          setTimeRemaining(nextRemaining);
          setTimeActual(nextActual);
        }
      }, 100);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [
    isTimer1Running,
    isTimer2Running,
    isTimerRunning,
    timer1StartedAt,
    timer1BaseRemaining,
    timer2StartedAt,
    timer2BaseActual,
    durasiTampil,
    logs
  ]);

  const toggleTimer = () => {
    playSoundByKey("short_beep");
    const newTimerState = !isTimerRunning;
    const timeStr = formatTime(timeRemaining);
    const updatedLogs = [{ time: timeStr, msg: newTimerState ? "Timer Dijalankan" : "Timer Dihentikan Sementara", type: "system" as const }, ...logs];
    
    if (newTimerState) {
      const now = Date.now();
      saveSharedState({
        isTimerRunning: true,
        timerStartedAt: now,
        timerBaseRemaining: timeRemaining,
        timerBaseActual: timeActual,
        timeRemaining: timeRemaining,
        timeActual: timeActual,
        logs: updatedLogs
      });
    } else {
      const elapsedMs = Math.max(0, Date.now() - timerStartedAt);
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const limit = getDurasiSeconds(durasiTampil);
      const finalRemaining = Math.min(limit, timerBaseRemaining + elapsedSec);
      const finalActual = timerBaseActual + elapsedSec;
      
      saveSharedState({
        isTimerRunning: false,
        timeRemaining: finalRemaining,
        timeActual: finalActual,
        timerBaseRemaining: finalRemaining,
        timerBaseActual: finalActual,
        timerStartedAt: 0,
        logs: updatedLogs
      });
    }
  };

  const resetTimer = () => {
    playSoundByKey("warning_beep");
    const updatedLogs = [{ time: "00:00", msg: "Timer Diatur Ulang ke 0", type: "system" as const }, ...logs];
    saveSharedState({
      isTimerRunning: false,
      timeRemaining: 0,
      timeActual: 0,
      timerStartedAt: 0,
      timerBaseRemaining: 0,
      timerBaseActual: 0,
      logs: updatedLogs
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Calculate Dewan Deduction total
  const getInitialDefaultScore = (cat: string = selectedCategory) => {
    if (cat === "ganda" || cat === "solo_kreatif" || cat === "tunggal_bebas") {
      return 9.10;
    }
    return 9.00;
  };

  const calculateMedian = (values: number[]) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mid = Math.floor(n / 2);
    if (n % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  };

  const calculateStandardDeviation = (scoresList: JuriScore[]): number => {
    const onDuty = scoresList.filter(js => js.id <= judgesCount);
    if (onDuty.length <= 1) return 0;
    const totals = onDuty.map(js => getJudgeTotal(js));
    const mean = totals.reduce((sum, val) => sum + val, 0) / totals.length;
    const variance = totals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / totals.length;
    return Number(Math.sqrt(variance).toFixed(4));
  };

  const getDewanDeductionValue = () => {
    let total = 0;
    total += deductions.timeOverUnder * 0.01;
    total += deductions.weaponDrop * 0.50;
    if (deductions.costumeMistake) total += 0.50;
    total += deductions.outOfBounds * 0.50;
    total += deductions.otherPenalty;
    return Number(total.toFixed(2));
  };

  const getDewanDeductionValueForCorner = (corner: "biru" | "merah") => {
    const isCurrentActive = (corner === "biru" && (activeCorner === "biru" || !activeCorner)) ||
                            (corner === "merah" && activeCorner === "merah");
    const dews = isCurrentActive ? deductions : (corner === "biru" ? deductionsBiru : deductionsMerah);
    let total = 0;
    total += (dews.timeOverUnder || 0) * 0.01;
    total += (dews.weaponDrop || 0) * 0.50;
    if (dews.costumeMistake) total += 0.50;
    total += (dews.outOfBounds || 0) * 0.50;
    total += (dews.otherPenalty || 0);
    return Number(total.toFixed(2));
  };

  const handleResetScoring = () => {
    if (confirm("Apakah Anda yakin ingin mengatur ulang seluruh data dan nilai saat ini?")) {
      const isGandaOrBebas = selectedCategory === "ganda" || selectedCategory === "solo_kreatif";
      const initialScoreText = isGandaOrBebas ? "9.10" : "9.00";
      const resetScores = juriScores.map(js => ({
        ...js,
        kebenaran: isGandaOrBebas ? 0 : 9.90,
        kemantapan: 0.00,
        keserasian: 0.00,
        penjiwaan: 0.00,
        wrongMoves: 0,
        flowScore: 0.00,
        submitted: false
      }));

      playSoundByKey("warning_beep");
      saveSharedState({
        juriScores: resetScores,
        juriScoresBiru: resetScores,
        juriScoresMerah: resetScores,
        deductions: {
          timeOverUnder: 0,
          weaponDrop: 0,
          costumeMistake: false,
          outOfBounds: 0,
          otherPenalty: 0
        },
        timeRemaining: 0,
        timeActual: 0,
        isTimerRunning: false,
        logs: [{ time: "00:00", msg: `Seluruh skor, denda, dan timer diatur ulang (Tampilan awal: ${initialScoreText}).`, type: "system" as const }]
      });
    }
  };

  // Calculate individual judge score sesuai Peraturan IPSI 2026 & PERSILAT
  const getJudgeTotal = (js: JuriScore) => {
    if (selectedCategory === "tunggal" || selectedCategory === "regu") {
      if (!js.submitted) {
        return 9.00;
      }
      const wrong = js.wrongMoves !== undefined ? js.wrongMoves : Math.max(0, Math.round((9.90 - js.kebenaran) * 100));
      const acc = Math.max(0, 9.90 - wrong * 0.01);
      const flow = js.flowScore !== undefined ? js.flowScore : (js.kemantapan <= 0.10 ? js.kemantapan : (js.kemantapan > 5 ? 0.00 : js.kemantapan));
      return Number((acc + flow).toFixed(2));
    } else if (selectedCategory === "ganda") {
      if (!js.submitted) {
        return 9.10;
      }
      const serangBela = js.kebenaran ?? 0;
      const kemantapanHarmoni = js.kemantapan ?? 0;
      const penjiwaan = js.penjiwaan ?? js.keserasian ?? 0;
      const sumComponents = serangBela + kemantapanHarmoni + penjiwaan;
      if (sumComponents >= 8.0) {
        return Number(sumComponents.toFixed(2));
      }
      return Number((9.10 + sumComponents).toFixed(2));
    } else {
      // Solo Kreatif
      if (!js.submitted) {
        return 9.10;
      }
      const serangBela = js.kebenaran ?? 0;
      const kemantapan = js.kemantapan ?? 0;
      const penjiwaan = js.penjiwaan !== undefined ? js.penjiwaan : (js.keserasian ?? 0);
      const sumComponents = serangBela + kemantapan + penjiwaan;
      if (sumComponents >= 8.0) {
        return Number(sumComponents.toFixed(2));
      }
      return Number((9.10 + sumComponents).toFixed(2)); 
    }
  };

  // IPSI 2026 & PERSILAT score processing (Median score calculation for all judges on duty)
  const getSeniCalculationResult = (customScores: JuriScore[] = juriScores, customDeductions = deductions) => {
    const onDutyScores = customScores.filter(js => js.id <= judgesCount);
    const submittedScores = onDutyScores.filter(js => js.submitted);
    const defaultInitial = getInitialDefaultScore();
    
    let dewanDeductions = 0;
    dewanDeductions += (customDeductions.timeOverUnder || 0) * 0.01;
    dewanDeductions += (customDeductions.weaponDrop || 0) * 0.50;
    if (customDeductions.costumeMistake) dewanDeductions += 0.50;
    dewanDeductions += (customDeductions.outOfBounds || 0) * 0.50;
    dewanDeductions += (customDeductions.otherPenalty || 0);

    if (submittedScores.length === 0) {
      const initialWithDeductions = Math.max(0, defaultInitial - dewanDeductions);
      return { 
        finalScore: initialWithDeductions, 
        minIdx: -1, 
        maxIdx: -1, 
        rawAverage: defaultInitial, 
        stdDev: 0,
        calculationsLog: `Tampilan Awal (${defaultInitial.toFixed(2)}). Menunggu nilai dari ${judgesCount} Juri...` 
      };
    }

    const activeValues = onDutyScores.map(js => getJudgeTotal(js));
    const median = calculateMedian(activeValues);
    const mean = activeValues.reduce((sum, v) => sum + v, 0) / (activeValues.length || 1);
    const variance = activeValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (activeValues.length || 1);
    const stdDev = Number(Math.sqrt(variance).toFixed(4));
    const finalVal = Math.max(0, median - dewanDeductions);

    const logMsg = `Sistem Median IPSI 2026 / PERSILAT (${judgesCount} Juri Bertugas): Nilai Median = ${median.toFixed(3)}, SD = ${stdDev.toFixed(4)}. Hukuman Dewan = -${dewanDeductions.toFixed(2)}. Skor Akhir = ${finalVal.toFixed(3)}`;

    return {
      finalScore: finalVal,
      minIdx: -1,
      maxIdx: -1,
      rawAverage: median,
      stdDev,
      calculationsLog: logMsg
    };
  };

  const getCalculatedScoreForCorner = (corner: "biru" | "merah") => {
    const isCurrentActive = (corner === "biru" && (activeCorner === "biru" || !activeCorner)) ||
                            (corner === "merah" && activeCorner === "merah");
    const scores = isCurrentActive ? juriScores : (corner === "biru" ? juriScoresBiru : juriScoresMerah);
    const dews = isCurrentActive ? deductions : (corner === "biru" ? deductionsBiru : deductionsMerah);

    return getSeniCalculationResult(scores, dews).finalScore;
  };

  const getFormattedScore = (corner: "biru" | "merah") => {
    if (corner === "biru") {
      if (disqualifiedBiru) return "DISQ";
      if (undurDiriBiru) return "WD";
    } else {
      if (disqualifiedMerah) return "DISQ";
      if (undurDiriMerah) return "WD";
    }
    return getCalculatedScoreForCorner(corner).toFixed(3);
  };

  // Evaluasi pemenang partai menggunakan hierarki resmi IPSI 2026 & PERSILAT
  const getLiveMatchOutcome = () => {
    const scoreB = getCalculatedScoreForCorner("biru");
    const scoreM = getCalculatedScoreForCorner("merah");
    const isBDq = disqualifiedBiru;
    const isBUd = undurDiriBiru;
    const isMDq = disqualifiedMerah;
    const isMUd = undurDiriMerah;

    if ((isBDq || isBUd) && !(isMDq || isMUd)) {
      return { 
        winnerCorner: "merah" as const, 
        winnerTitle: "SUDUT MERAH", 
        reason: isBDq ? "Diskualifikasi Sudut Biru (DISQ)" : "Sudut Biru Mengundurkan Diri (WD)" 
      };
    }
    if (!(isBDq || isBUd) && (isMDq || isMUd)) {
      return { 
        winnerCorner: "biru" as const, 
        winnerTitle: "SUDUT BIRU", 
        reason: isMDq ? "Diskualifikasi Sudut Merah (DISQ)" : "Sudut Merah Mengundurkan Diri (WD)" 
      };
    }
    if ((isBDq || isBUd) && (isMDq || isMUd)) {
      return { 
        winnerCorner: null, 
        winnerTitle: "BATAL", 
        reason: "Kedua Sudut Diskualifikasi / Mengundurkan Diri" 
      };
    }

    const sdB = calculateStandardDeviation(juriScoresBiru);
    const sdM = calculateStandardDeviation(juriScoresMerah);
    const dedB = getDewanDeductionValueForCorner("biru");
    const dedM = getDewanDeductionValueForCorner("merah");
    const timeB = timeActualBiru || timeRemainingBiru || 0;
    const timeM = timeActualMerah || timeRemainingMerah || 0;
    const targetDur = getDurasiSeconds(durasiTampil);

    const tieResult = resolveTieBreakerIPSI2026AndPERSILAT(
      { finalScore: scoreB, stdDev: sdB, deductions: dedB, actualTimeSeconds: timeB },
      { finalScore: scoreM, stdDev: sdM, deductions: dedM, actualTimeSeconds: timeM },
      targetDur
    );

    return {
      winnerCorner: tieResult.winnerRole === "draw" ? null : tieResult.winnerRole,
      winnerTitle: tieResult.winnerRole === "biru" ? "SUDUT BIRU" : tieResult.winnerRole === "merah" ? "SUDUT MERAH" : "SERI",
      reason: tieResult.reason,
      tieStep: tieResult.tieStep
    };
  };

  const handleArchiveMatch = () => {
    const outcome = getLiveMatchOutcome();
    const scoreB = getCalculatedScoreForCorner("biru");
    const scoreM = getCalculatedScoreForCorner("merah");
    const winner = outcome.winnerTitle;
    
    const newRecord = {
      id: Date.now(),
      partai: partaiTanding,
      kategori: selectedCategory,
      usia: selectedAge,
      gender,
      tahap: tahapPertandingan,
      biru: { name: namaAtlitBiru, contingent: kontingenBiru, score: scoreB, status: disqualifiedBiru ? "DISQ" : undurDiriBiru ? "WD" : "NORMAL" },
      merah: { name: namaAtlitMerah, contingent: kontingenMerah, score: scoreM, status: disqualifiedMerah ? "DISQ" : undurDiriMerah ? "WD" : "NORMAL" },
      winner,
      winReason: outcome.reason,
      timestamp: new Date().toLocaleString("id-ID")
    };
    
    const updatedHistory = [newRecord, ...matchHistory];
    setMatchHistory(updatedHistory);
    localStorage.setItem("silat_seni_match_history", JSON.stringify(updatedHistory));
    
    // Play sound and show alert
    playSoundByKey("success_chime");
    
    const displayScoreB = disqualifiedBiru ? "DISQ" : undurDiriBiru ? "WD" : scoreB.toFixed(3);
    const displayScoreM = disqualifiedMerah ? "DISQ" : undurDiriMerah ? "WD" : scoreM.toFixed(3);
    alert(`Partai ${partaiTanding} berhasil diarsipkan sesuai Regulasi IPSI 2026 & PERSILAT!\nPemenang: ${winner}\nKeputusan: ${outcome.reason}\nSkor - Biru: ${displayScoreB} | Merah: ${displayScoreM}`);
  };

  const exportHistoryToExcel = () => {
    if (matchHistory.length === 0) {
      alert("Belum ada data sejarah pertandingan untuk diekspor!");
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,PARTAI,KATEGORI,GOLONGAN USIA,GENDER,TAHAP,ATLET BIRU,KONTINGEN BIRU,SKOR BIRU,ATLET MERAH,KONTINGEN MERAH,SKOR MERAH,PEMENANG,WAKTU SINKRONISASI\n";
    
    matchHistory.forEach(r => {
      const row = [
        r.id,
        r.partai,
        r.kategori,
        r.usia,
        r.gender,
        r.tahap,
        `"${r.biru?.name || r.biruName || ''}"`,
        `"${r.biru?.contingent || r.kontingenBiru || ''}"`,
        r.biru?.score !== undefined ? r.biru.score : (r.biruScore ?? ''),
        `"${r.merah?.name || r.merahName || ''}"`,
        `"${r.merah?.contingent || r.kontingenMerah || ''}"`,
        r.merah?.score !== undefined ? r.merah.score : (r.merahScore ?? ''),
        `"${r.winner || ''}"`,
        `"${r.timestamp || ''}"`
      ].join(",");
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HISTORY_SKOR_SENI_PARTAI_${partaiTanding}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    playSoundByKey("success_chime");
  };

  const calcResult = getSeniCalculationResult();

  const handleLoadAthlete = (ath: Athlete) => {
    playSoundByKey("success_chime");
    const updatedLogs = [{ time: formatTime(timeRemaining), msg: `Pesilat ${ath.name} (${ath.contingent}) dimuat ke arena.`, type: "system" as const }, ...logs];
    
    saveSharedState({
      performerName: ath.name.toUpperCase(),
      contingent: ath.contingent.toUpperCase(),
      selectedAge: ath.usia.toUpperCase(),
      gender: ath.gender,
      logs: updatedLogs,
      // Reset current scores for the new performer
      juriScores: juriScores.map(js => ({
        ...js,
        kebenaran: selectedCategory === "tunggal" || selectedCategory === "regu" ? 9.90 : 0.00,
        kemantapan: 0.00,
        keserasian: 0.00,
        penjiwaan: 0.00,
        wrongMoves: 0,
        flowScore: 0.00,
        submitted: false
      })),
      deductions: {
        timeOverUnder: 0,
        weaponDrop: 0,
        costumeMistake: false,
        outOfBounds: 0,
        otherPenalty: 0
      },
      timeRemaining: 0,
      timeActual: 0,
      timerStartedAt: 0,
      timerBaseRemaining: 0,
      timerBaseActual: 0
    });

    setShowAthleteLoader(false);
  };

  // Helper to activate a corner (SUDUT BIRU or SUDUT MERAH) and swap relevant score sheets
  const activateCornerAndSync = (corner: "biru" | "merah") => {
    playSoundByKey("short_beep");

    // 1. Save current active values into the buffer of the OLD corner
    if (activeCorner === "biru") {
      setJuriScoresBiru(juriScores);
      setDeductionsBiru(deductions);
      setTimeRemainingBiru(timeRemaining);
      setTimeActualBiru(timeActual);
    } else if (activeCorner === "merah") {
      setJuriScoresMerah(juriScores);
      setDeductionsMerah(deductions);
      setTimeRemainingMerah(timeRemaining);
      setTimeActualMerah(timeActual);
    }

    // 2. Determine target values from the NEW corner's buffer
    const nextScores = corner === "biru" ? juriScoresBiru : juriScoresMerah;
    const nextDeductions = corner === "biru" ? deductionsBiru : deductionsMerah;
    const nextTime = corner === "biru" ? timeRemainingBiru : timeRemainingMerah;
    const nextActual = corner === "biru" ? timeActualBiru : timeActualMerah;
    const nextName = corner === "biru" ? namaAtlitBiru : namaAtlitMerah;
    const nextContingent = corner === "biru" ? kontingenBiru : kontingenMerah;

    // 3. Save to localStorage and update state
    saveSharedState({
      activeCorner: corner,
      juriScores: nextScores,
      deductions: nextDeductions,
      timeRemaining: nextTime,
      timeActual: nextActual,
      isTimerRunning: false,
      timerStartedAt: 0,
      timerBaseRemaining: nextTime,
      timerBaseActual: nextActual,
      performerName: nextName,
      contingent: nextContingent,
      juriScoresBiru: corner === "biru" ? juriScoresBiru : (activeCorner === "biru" ? juriScores : juriScoresBiru),
      juriScoresMerah: corner === "merah" ? juriScoresMerah : (activeCorner === "merah" ? juriScores : juriScoresMerah),
      deductionsBiru: corner === "biru" ? deductionsBiru : (activeCorner === "biru" ? deductions : deductionsBiru),
      deductionsMerah: corner === "merah" ? deductionsMerah : (activeCorner === "merah" ? deductions : deductionsMerah),
      timeRemainingBiru: corner === "biru" ? timeRemainingBiru : (activeCorner === "biru" ? timeRemaining : timeRemainingBiru),
      timeRemainingMerah: corner === "merah" ? timeRemainingMerah : (activeCorner === "merah" ? timeRemaining : timeRemainingMerah),
      timeActualBiru: corner === "biru" ? timeActualBiru : (activeCorner === "biru" ? timeActual : timeActualBiru),
      timeActualMerah: corner === "merah" ? timeActualMerah : (activeCorner === "merah" ? timeActual : timeActualMerah)
    });
  };

  // 1. LANDING PAGE MODE (Matches Landingpage.JPG perfectly with Arena LED Modern theme)
  if (role === null) {
    return (
      <div 
        id="seni-portal-root" 
        className="min-h-screen bg-[#040813] text-white flex flex-col justify-between items-center p-6 md:p-10 font-sans select-none relative overflow-hidden"
      >
        {/* Deep immersive arena lighting & stadium glow gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(6,182,212,0.15)_0%,transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_75%,rgba(29,78,216,0.12)_0%,transparent_45%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_80%,rgba(220,38,38,0.08)_0%,transparent_45%)] pointer-events-none" />

        {/* TOP ACTION BAR */}
        <div className="w-full flex justify-between items-center z-10 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              id="seni-share-client-btn"
              onClick={() => { playSoundByKey("short_beep"); setShowShareModal(true); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-cyan-500/40 bg-[#08152c]/90 hover:bg-[#0f244a] text-cyan-300 hover:text-white text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.2)] cursor-pointer"
              title="Bagikan Tautan & QR Code ke Klien / Juri"
            >
              <Share2 size={15} className="text-cyan-400" />
              <span>BAGIKAN KE KLIEN</span>
            </button>
            <PWAInstallButton compact={true} />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="seni-main-fullscreen"
              onClick={toggleFullScreen}
              className="w-10 h-10 rounded-full border border-[#1a2c4a] hover:border-cyan-400 bg-[#08152c]/90 hover:bg-[#0f244a] text-cyan-300 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.2)] cursor-pointer"
              title="Toggle Layar Penuh"
            >
              {isFs ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>

        {/* LOGO & TITLE SECTION */}
        <div className="text-center mt-4 max-w-4xl z-10 flex flex-col items-center">
          {/* Main Logo from public folder */}
          <div className="w-48 h-28 flex items-center justify-center relative mb-2">
            <img 
              src="/jrzscoreutama.png" 
              alt="JRZ Score TGR" 
              className="max-h-full object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.45)]"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-[0.16em] text-white uppercase select-none font-sans leading-none drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            JRZ SCORE TGR
          </h1>

          <div className="text-xs md:text-sm font-extrabold tracking-wider text-cyan-400 mt-4 uppercase font-sans flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span>SISTEM DIGITAL SKORING PENCAK SILAT TGR (TUNGGAL • GANDA • REGU)</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          
          <div className="text-[10px] md:text-xs text-zinc-400 font-mono tracking-widest mt-2 uppercase">
            STANDAR ATURAN RESMI IPSI 2026 &amp; PERSILAT • 100% OFFLINE &amp; SINKRONISASI MULTI-LAYAR
          </div>
        </div>

        {/* FIVE MASSIVE MENU CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 w-full max-w-7xl mt-8 mb-4 px-4 z-10">
          
          {/* CARD 1: SEKRETARIS */}
          <button
            id="seni-card-sekretaris"
            onClick={() => { setRole("sekretaris"); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#08152c]/90 via-[#060e1d]/90 to-[#030712] hover:from-[#0d2247] hover:to-[#050e1e] backdrop-blur-md border border-[#162540] hover:border-cyan-400 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(6,182,212,0.35)] cursor-pointer focus:outline-none min-h-[240px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.04] to-transparent pointer-events-none rounded-2xl" />
            <img 
              src="/Iconsekretaris.png" 
              alt="SEKRETARIS" 
              className="w-36 h-36 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-mono font-black tracking-widest text-cyan-300 uppercase mt-3">
              SEKRETARIS
            </span>
          </button>

          {/* CARD 2: DEWAN */}
          <button
            id="seni-card-dewan"
            onClick={() => { setRole("dewan"); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#08152c]/90 via-[#060e1d]/90 to-[#030712] hover:from-[#0d2247] hover:to-[#050e1e] backdrop-blur-md border border-[#162540] hover:border-yellow-400 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(234,179,8,0.35)] cursor-pointer focus:outline-none min-h-[240px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.04] to-transparent pointer-events-none rounded-2xl" />
            <img 
              src="/ketuadewan.png" 
              alt="DEWAN" 
              className="w-36 h-36 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-mono font-black tracking-widest text-amber-300 uppercase mt-3">
              KETUA DEWAN
            </span>
          </button>

          {/* CARD 3: JURI */}
          <button
            id="seni-card-juri"
            onClick={() => { setShowJuriSelectorModal(true); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#08152c]/90 via-[#060e1d]/90 to-[#030712] hover:from-[#0d2247] hover:to-[#050e1e] backdrop-blur-md border border-[#162540] hover:border-blue-400 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(59,130,246,0.35)] cursor-pointer focus:outline-none min-h-[240px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.04] to-transparent pointer-events-none rounded-2xl" />
            <img 
              src="/juri.png" 
              alt="JURI" 
              className="w-36 h-36 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-mono font-black tracking-widest text-blue-300 uppercase mt-3">
              JURI TANDING
            </span>
          </button>

          {/* CARD 4: OPERATOR TIMER (PANEL KHUSUS TIMER ARENA) */}
          <button
            id="seni-card-timer"
            onClick={() => { setRole("timer"); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1304]/90 via-[#0f0a02]/90 to-[#050301] hover:from-[#2a1d06] hover:to-[#120c02] backdrop-blur-md border border-amber-500/50 hover:border-amber-400 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_45px_rgba(245,158,11,0.4)] cursor-pointer focus:outline-none min-h-[240px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.08] to-transparent pointer-events-none rounded-2xl" />
            
            {/* Stopwatch LED Arena Crest */}
            <div className="relative w-36 h-36 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              {/* Outer pulsing ring */}
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-400/40 group-hover:border-amber-400 group-hover:rotate-45 transition-all duration-700 pointer-events-none" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex flex-col items-center justify-center shadow-lg border-2 border-yellow-200">
                <Timer size={44} className="text-black drop-shadow animate-pulse" />
                <span className="text-[9px] font-mono font-black text-black leading-none mt-1 uppercase tracking-tighter">
                  03:00
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-black tracking-widest text-amber-300 uppercase mt-3">
              OPERATOR TIMER
            </span>
            <span className="text-[9px] font-mono text-amber-400/80 uppercase tracking-tight mt-0.5">
              TIMEKEEPER ARENA
            </span>
          </button>

          {/* CARD 5: MONITOR */}
          <button
            id="seni-card-monitor"
            onClick={() => { setRole("monitor"); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#08152c]/90 via-[#060e1d]/90 to-[#030712] hover:from-[#0d2247] hover:to-[#050e1e] backdrop-blur-md border border-[#162540] hover:border-emerald-400 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(16,185,129,0.35)] cursor-pointer focus:outline-none min-h-[240px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.04] to-transparent pointer-events-none rounded-2xl" />
            <img 
              src="/iconmonitor.png" 
              alt="MONITOR" 
              className="w-36 h-36 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-mono font-black tracking-widest text-emerald-300 uppercase mt-3">
              MONITOR ARENA
            </span>
          </button>

        </div>

        {/* QUICK ACCESS BUTTON TO REGISTRASI DATA & BAGAN TURNAMEN (IMAGE.PNG) */}
        <div className="w-full max-w-4xl z-10 px-4 mt-2">
          <button
            onClick={() => {
              setRole("sekretaris");
              setRegistrasiActiveTab("bagan");
              setShowRegistrasiOverlay(true);
              playSoundByKey("short_beep");
            }}
            className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-110 text-black font-black text-xs md:text-sm py-3 px-6 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer transition-all active:scale-98"
          >
            <Trophy size={18} className="fill-black text-black" />
            <span>BUKA MENU BAGAN PERTANDINGAN &amp; INPUT DATA ATLET (IPSI 2026 &amp; PERSILAT) ›</span>
          </button>
        </div>

        {/* FOOTER */}
        <div className="text-[10px] text-zinc-500 font-mono tracking-widest mt-6 z-10 flex items-center gap-2">
          <span className="text-cyan-400 font-bold">JRZ SCORE TGR</span>
          <span>•</span>
          <span>Developed by : <strong className="text-zinc-400">Jaka Oktorian</strong></span>
        </div>

        {/* MODAL BAGIKAN KE KLIEN & AKSES OFFLINE */}
        <ShareClientModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          tournamentName={namaEvent}
        />

        {/* MODAL PEMILIHAN IDENTITAS JURI (2 KOLOM: 1-5 & 6-10 SESUAI JUMLAH JURI PANEL TIMER) */}
        {showJuriSelectorModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-b from-[#0a182d] via-[#071120] to-[#030812] border-2 border-cyan-500/50 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-[0_0_50px_rgba(6,182,212,0.35)] relative overflow-hidden flex flex-col gap-4">
              
              {/* Decorative background glow */}
              <div className="absolute top-0 right-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#162540] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
                    <Users size={22} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">
                      PILIH IDENTITAS JURI
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Tekan salah satu nomor juri sesuai penugasan Anda
                    </p>
                  </div>
                </div>
                <span className="bg-[#0b172a] text-amber-400 border border-amber-500/40 font-mono text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                  {judgesCount} JURI AKTIF
                </span>
              </div>

              {/* Sub-info banner */}
              <div className="bg-[#040c1a] border border-cyan-500/30 rounded-xl p-2.5 text-center text-[11px] text-cyan-300 font-mono flex items-center justify-center gap-1.5">
                <Lock size={13} className="text-cyan-400 shrink-0" />
                <span>Setelah memilih, panel akan <strong>terkunci</strong> khusus untuk nomor juri tersebut.</span>
              </div>

              {/* 2-Column Vertical Selection Grid (Col 1: 1-5, Col 2: 6-10 based on judgesCount) */}
              <div className="grid grid-cols-2 gap-3 py-1">
                
                {/* Column 1: Juri 1 - 5 (Vertically down) */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono font-bold text-cyan-400/80 uppercase tracking-widest text-center">
                    KOLOM 1 (1 - {Math.ceil(judgesCount / 2)})
                  </span>
                  {Array.from({ length: Math.ceil(judgesCount / 2) }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        playSoundByKey("short_beep");
                        try {
                          localStorage.setItem("jrz_assigned_juri_id", String(num));
                        } catch {}
                        setLocalJuriId(num);
                        setRole("juri");
                        setShowJuriSelectorModal(false);
                      }}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#071326] to-[#0b1c38] hover:from-cyan-900/40 hover:to-blue-900/40 border border-[#162540] hover:border-cyan-400 text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-mono font-black text-sm group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                          {num}
                        </div>
                        <div className="text-left">
                          <span className="text-xs sm:text-sm font-black font-mono tracking-wider block text-white group-hover:text-cyan-200">
                            JURI {num}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 block uppercase">
                            Klik untuk Masuk
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-cyan-500/50 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>

                {/* Column 2: Juri 6 - 10 (Vertically down) */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono font-bold text-cyan-400/80 uppercase tracking-widest text-center">
                    KOLOM 2 ({Math.ceil(judgesCount / 2) + 1} - {judgesCount})
                  </span>
                  {Array.from(
                    { length: Math.max(0, judgesCount - Math.ceil(judgesCount / 2)) }, 
                    (_, i) => Math.ceil(judgesCount / 2) + i + 1
                  ).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        playSoundByKey("short_beep");
                        try {
                          localStorage.setItem("jrz_assigned_juri_id", String(num));
                        } catch {}
                        setLocalJuriId(num);
                        setRole("juri");
                        setShowJuriSelectorModal(false);
                      }}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#071326] to-[#0b1c38] hover:from-cyan-900/40 hover:to-blue-900/40 border border-[#162540] hover:border-cyan-400 text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-mono font-black text-sm group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                          {num}
                        </div>
                        <div className="text-left">
                          <span className="text-xs sm:text-sm font-black font-mono tracking-wider block text-white group-hover:text-cyan-200">
                            JURI {num}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 block uppercase">
                            Klik untuk Masuk
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-cyan-500/50 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>

              </div>

              {/* Footer with Close Button */}
              <div className="pt-2 border-t border-[#162540] flex justify-end">
                <button
                  onClick={() => setShowJuriSelectorModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0b172a] hover:bg-[#122442] border border-[#162540] text-zinc-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    );
  }

  // Common Back Action inside subviews
  const backToSeniMenuBtn = (
    <button
      onClick={() => { setRole(null); playSoundByKey("short_beep"); }}
      className="flex items-center gap-2 border border-[#1a2c4a] hover:border-cyan-400 bg-[#08152c] hover:bg-[#0f244a] text-cyan-300 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all hover:scale-103 active:scale-97 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
    >
      <ArrowLeft size={14} /> Kembali ke Menu Seni
    </button>
  );

  // ATHLETE LOADER DIALOG (Arena LED Modern Modal)
  const renderAthleteLoader = showAthleteLoader && (
    <div className="fixed inset-0 bg-[#020612]/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-gradient-to-b from-[#09152b] via-[#050b16] to-[#02050e] border-2 border-cyan-500/50 p-6 rounded-3xl max-w-lg w-full text-left shadow-[0_0_60px_rgba(6,182,212,0.3)] relative animate-fade-in">
        <h3 className="text-lg font-black tracking-widest text-white uppercase mb-1 flex items-center gap-2">
          <UserPlus size={18} className="text-cyan-400" />
          <span>Cari Atlit Terdaftar</span>
        </h3>
        <p className="text-xs text-zinc-400 mb-4">Pilih atlit dari basis data pendaftaran turnamen saat ini.</p>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
          {poolAthletes.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs font-mono">
              Belum ada atlit yang terdaftar dalam Pendaftaran. Silakan tambahkan di menu Pendaftaran terlebih dahulu.
            </div>
          ) : (
            poolAthletes.map(ath => (
              <button
                key={ath.id}
                onClick={() => handleLoadAthlete(ath)}
                className="w-full text-left bg-[#070e1c] hover:bg-[#0c1930] p-3.5 rounded-2xl border border-[#162540] hover:border-cyan-400 transition-all flex justify-between items-center group shadow-md"
              >
                <div>
                  <div className="font-extrabold text-sm text-zinc-100 group-hover:text-cyan-300 transition-colors">{ath.name.toUpperCase()}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{ath.contingent.toUpperCase()} • {ath.kelas}</div>
                </div>
                <span className="text-[10px] bg-[#0c1e3a] text-cyan-300 font-bold px-3 py-1 rounded-full uppercase border border-cyan-800/60">{ath.usia}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowAthleteLoader(false)}
            className="px-5 py-2.5 bg-[#09152b] hover:bg-[#0f244a] border border-[#1c3052] hover:border-cyan-400 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );

  // 2. ROLE: SEKRETARIS VIEW (Controls performers, timers, starts scoring rounds)
  if (role === "sekretaris") {
    // Determine calculated scores for display
    const finalScoreBiru = getCalculatedScoreForCorner("biru");
    const finalScoreMerah = getCalculatedScoreForCorner("merah");

    return (
      <ErrorBoundary fallbackTitle="PANEL SEKRETARIS - TERJADI KENDALA TAMPILAN" onReset={() => setRole(null)}>
        <div className="min-h-screen bg-[#040813] text-white flex flex-col font-sans select-none relative pb-6">
        
        {/* HOVER-TRIGGERED TOP-RIGHT CONTROLS (Hanya muncul saat mouse diarahkan ke sudut kanan atas) */}
        <div className="fixed top-0 right-0 z-50 p-2 sm:p-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto">
          <div className="bg-[#070e1c]/95 border-2 border-[#1c3258] backdrop-blur-md rounded-2xl p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex items-center gap-2">
            <button
              id="btn-sekretaris-back"
              onClick={() => { setRole(null); playSoundByKey("short_beep"); }}
              className="bg-[#0b172a] hover:bg-[#162a4a] text-cyan-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Kembali ke Menu Utama"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>
            <button
              id="btn-sekretaris-fullscreen"
              onClick={toggleFullScreen}
              className="bg-[#0b172a] hover:bg-[#162a4a] text-amber-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-amber-500/40 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Toggle Full Screen"
            >
              {isFs ? <Minimize size={14} /> : <Maximize size={14} />}
              <span>{isFs ? "Normal" : "Full Screen"}</span>
            </button>
          </div>
        </div>

        {/* EVENT BANNER HEADER */}
        <header className="border-b border-[#142033] bg-[#070e1c] px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 z-10 shadow-lg">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div>
              <h1 className="font-black text-xs md:text-sm tracking-widest text-white uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span>PANEL SEKRETARIS & ENGINE KONTROL</span>
              </h1>
              <p className="text-[10px] text-cyan-300/80 font-mono mt-0.5">
                {namaEvent} • {tempatPelaksanaan}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Quick Tabs */}
            <div className="flex items-center bg-[#050b16] border border-[#162540] rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowRegistrasiOverlay(false);
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Settings size={12} className="text-amber-400" />
                <span>PARAMETER</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegistrasiActiveTab("bagan");
                  setShowRegistrasiOverlay(true);
                  playSoundByKey("short_beep");
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Trophy size={12} />
                <span>BAGAN BRAKET</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegistrasiActiveTab("input");
                  setShowRegistrasiOverlay(true);
                  playSoundByKey("short_beep");
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-cyan-300 hover:text-white hover:bg-white/5 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Users size={12} />
                <span>INPUT DATA</span>
              </button>
            </div>

            <div className="text-right hidden xl:block">
              <span className="text-[9px] font-mono font-bold text-emerald-400 block tracking-widest">MASTER PANEL ACTIVE</span>
              <span className="text-[10px] text-zinc-400 font-mono">ROLE: SEKRETARIS PERTANDINGAN</span>
            </div>
            <div className="flex items-center gap-2 bg-[#041d14] border border-emerald-500/50 px-3 py-1.5 rounded-lg text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">ONLINE</span>
            </div>
          </div>
        </header>

        {/* MAIN CONTAINER */}
        <main className="max-w-[1400px] mx-auto w-full px-3 mt-2 grid grid-cols-1 lg:grid-cols-12 gap-2.5 z-10 flex-1">
          
          {/* LEFT SIDE: MATCH SPECIFICS & ATHLETES (col-span-7) */}
          <div className="lg:col-span-7 space-y-2">
            
            {/* PARAMETER PERTANDINGAN CARD */}
            <div className="bg-[#070e1c] border border-[#162540] p-3 rounded-xl space-y-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              
              {/* CARD HEADER */}
              <div className="flex items-center gap-2 border-b border-[#142033] pb-1.5">
                <Settings size={14} className="text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Parameter Pertandingan
                </span>
              </div>

              {/* ROW 1: NAMA EVENT KEJUARAAN */}
              <div className="space-y-0.5">
                <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                  NAMA EVENT KEJUARAAN
                </label>
                <input
                  type="text"
                  value={namaEvent}
                  onChange={(e) => saveSharedState({ namaEvent: e.target.value.toUpperCase() })}
                  className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-cyan-400 uppercase tracking-wide"
                  placeholder="NAMA EVENT KEJUARAAN"
                />
              </div>

              {/* ROW 2: TEMPAT PELAKSANAAN & WAKTU PELAKSANAAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    TEMPAT PELAKSANAAN
                  </label>
                  <input
                    type="text"
                    value={tempatPelaksanaan}
                    onChange={(e) => saveSharedState({ tempatPelaksanaan: e.target.value })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Tempat Pelaksanaan"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    WAKTU PELAKSANAAN
                  </label>
                  <input
                    type="text"
                    value={waktuPelaksanaan}
                    onChange={(e) => saveSharedState({ waktuPelaksanaan: e.target.value })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Waktu / Tanggal Pelaksanaan"
                  />
                </div>
              </div>

              {/* ROW 3: LOGO SISI KIRI & LOGO SISI KANAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* LOGO SISI KIRI */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    LOGO SISI KIRI (MONITOR)
                  </label>
                  <div className="bg-[#050b16] border border-[#1a2d4c] rounded-lg p-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-[#030712] border border-[#142033] flex items-center justify-center shrink-0 overflow-hidden">
                        {logoKiri ? (
                          <img src={logoKiri} alt="Logo Kiri" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-zinc-600 text-[10px] font-mono">🔒</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 truncate">
                        {logoKiri ? "Logo Terpasang" : "Default IPSI"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="bg-[#0c1e3a] hover:bg-[#122b52] border border-cyan-700/60 text-cyan-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 shrink-0 transition-all">
                        <span>↑ Upload Logo Kiri</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const res = evt.target?.result as string;
                                setLogoKiri(res);
                                localStorage.setItem("logo_kiri", res);
                                saveSharedState({ logoKiri: res });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {logoKiri && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoKiri("");
                            localStorage.removeItem("logo_kiri");
                            saveSharedState({ logoKiri: "" });
                          }}
                          className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-[9px] px-1.5 py-0.5 rounded font-mono"
                          title="Hapus Logo Kiri"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* LOGO SISI KANAN */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    LOGO SISI KANAN (MONITOR)
                  </label>
                  <div className="bg-[#050b16] border border-[#1a2d4c] rounded-lg p-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-[#030712] border border-[#142033] flex items-center justify-center shrink-0 overflow-hidden">
                        {logoKanan ? (
                          <img src={logoKanan} alt="Logo Kanan" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-zinc-600 text-[10px] font-mono">🔒</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 truncate">
                        {logoKanan ? "Logo Terpasang" : "Default IPSI"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="bg-[#0c1e3a] hover:bg-[#122b52] border border-cyan-700/60 text-cyan-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 shrink-0 transition-all">
                        <span>↑ Upload Logo Kanan</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const res = evt.target?.result as string;
                                setLogoKanan(res);
                                localStorage.setItem("logo_kanan", res);
                                saveSharedState({ logoKanan: res });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {logoKanan && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoKanan("");
                            localStorage.removeItem("logo_kanan");
                            saveSharedState({ logoKanan: "" });
                          }}
                          className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-[9px] px-1.5 py-0.5 rounded font-mono"
                          title="Hapus Logo Kanan"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 4: PARTAI TANDING (#), TAHAP PERTANDINGAN, KATEGORI JURUS, KATEGORI USIA */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* PARTAI TANDING (#) */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    PARTAI TANDING (#)
                  </label>
                  <input
                    type="text"
                    value={partaiTanding}
                    onChange={(e) => saveSharedState({ partaiTanding: e.target.value })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                {/* TAHAP PERTANDINGAN */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    TAHAP PERTANDINGAN
                  </label>
                  <select
                    value={tahapPertandingan}
                    onChange={(e) => saveSharedState({ tahapPertandingan: e.target.value.toUpperCase() })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="PENYISIHAN">PENYISIHAN</option>
                    <option value="PEREMPAT FINAL">PEREMPAT FINAL</option>
                    <option value="SEMI FINAL">SEMI FINAL</option>
                    <option value="FINAL">FINAL</option>
                  </select>
                </div>

                {/* KATEGORI JURUS */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    KATEGORI JURUS
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const isGanda = cat === "ganda";
                      const isSoloBebas = cat === "solo_kreatif";
                      const initialKebenaran = (isGanda || isSoloBebas) ? 0 : 9.90;
                      const initialKemantapan = 0.00;
                      const initialKeserasian = 0.00;
                      const initialPenjiwaan = 0.00;
                      const resetScores = juriScores.map(js => ({
                        ...js,
                        kebenaran: initialKebenaran,
                        kemantapan: initialKemantapan,
                        keserasian: initialKeserasian,
                        penjiwaan: initialPenjiwaan,
                        wrongMoves: 0,
                        flowScore: 0.00,
                        submitted: false
                      }));
                      setSelectedCategory(cat);
                      setJuriScores(resetScores);
                      setJuriScoresBiru(resetScores);
                      setJuriScoresMerah(resetScores);
                      saveSharedState({
                        selectedCategory: cat,
                        juriScores: resetScores,
                        juriScoresBiru: resetScores,
                        juriScoresMerah: resetScores
                      });
                    }}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* KATEGORI USIA */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    KATEGORI USIA
                  </label>
                  <select
                    value={selectedAge}
                    onChange={(e) => saveSharedState({ selectedAge: e.target.value })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {ageGroups.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ROW 5: GENDER (KATEGORI) & DURASI TAMPIL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* GENDER */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    GENDER (KATEGORI)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => saveSharedState({ gender: "PUTRA" })}
                      className={`py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                        gender === "PUTRA"
                          ? "bg-[#0284c7] border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                          : "bg-[#050b16] border-[#142033] text-zinc-400 hover:text-white"
                      }`}
                    >
                      PUTRA
                    </button>
                    <button
                      onClick={() => saveSharedState({ gender: "PUTRI" })}
                      className={`py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                        gender === "PUTRI"
                          ? "bg-[#0284c7] border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                          : "bg-[#050b16] border-[#142033] text-zinc-400 hover:text-white"
                      }`}
                    >
                      PUTRI
                    </button>
                  </div>
                </div>

                {/* DURASI TAMPIL */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    DURASI TAMPIL
                  </label>
                  <select
                    value={durasiTampil}
                    onChange={(e) => {
                      const dur = e.target.value;
                      saveSharedState({ 
                        durasiTampil: dur,
                        timeRemaining: 0
                      });
                    }}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="03:00">03.00 Menit</option>
                    <option value="02:00">02.00 Menit</option>
                    <option value="01:30">01.30 Menit</option>
                    <option value="01:00">01.00 Menit</option>
                  </select>
                </div>
              </div>

              {/* DUAL PERFORMERS BOXES (SUDUT BIRU & SUDUT MERAH) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {/* SUDUT BIRU BOX */}
                <div className="bg-[#051329] border border-blue-600/50 p-2.5 rounded-lg space-y-1.5 relative shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] font-mono font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      SUDUT BIRU
                    </div>
                    <button
                      type="button"
                      onClick={() => activateCornerAndSync("biru")}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase transition-all cursor-pointer border ${
                        activeCorner === "biru"
                          ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/40"
                          : "bg-[#0b172a] hover:bg-[#162a4a] border-blue-900/60 text-blue-300"
                      }`}
                    >
                      {activeCorner === "biru" ? "✓ AKTIF" : "AKTIFKAN"}
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold">NAMA ATLIT</label>
                    <input
                      type="text"
                      value={namaAtlitBiru}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNamaAtlitBiru(val);
                        if (activeCorner === "biru") {
                          saveSharedState({ namaAtlitBiru: val, performerName: val });
                        } else {
                          saveSharedState({ namaAtlitBiru: val });
                        }
                      }}
                      className="w-full bg-[#030917] border border-blue-900/60 rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-blue-400 uppercase tracking-wide"
                      placeholder="NAMA ATLIT BIRU"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold">KONTINGEN</label>
                    <input
                      type="text"
                      value={kontingenBiru}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setKontingenBiru(val);
                        if (activeCorner === "biru") {
                          saveSharedState({ kontingenBiru: val, contingent: val });
                        } else {
                          saveSharedState({ kontingenBiru: val });
                        }
                      }}
                      className="w-full bg-[#030917] border border-blue-900/60 rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-blue-400 uppercase tracking-wide"
                      placeholder="KONTINGEN BIRU"
                    />
                  </div>
                </div>

                {/* SUDUT MERAH BOX */}
                <div className="bg-[#24080e] border border-red-600/50 p-2.5 rounded-lg space-y-1.5 relative shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] font-mono font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      SUDUT MERAH
                    </div>
                    <button
                      type="button"
                      onClick={() => activateCornerAndSync("merah")}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase transition-all cursor-pointer border ${
                        activeCorner === "merah"
                          ? "bg-red-600 border-red-400 text-white shadow-md shadow-red-500/40"
                          : "bg-[#1c080d] hover:bg-[#2c0e16] border-red-900/60 text-red-300"
                      }`}
                    >
                      {activeCorner === "merah" ? "✓ AKTIF" : "AKTIFKAN"}
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold">NAMA ATLIT</label>
                    <input
                      type="text"
                      value={namaAtlitMerah}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNamaAtlitMerah(val);
                        if (activeCorner === "merah") {
                          saveSharedState({ namaAtlitMerah: val, performerName: val });
                        } else {
                          saveSharedState({ namaAtlitMerah: val });
                        }
                      }}
                      className="w-full bg-[#140407] border border-red-900/60 rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-red-400 uppercase tracking-wide"
                      placeholder="NAMA ATLIT MERAH"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold">KONTINGEN</label>
                    <input
                      type="text"
                      value={kontingenMerah}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setKontingenMerah(val);
                        if (activeCorner === "merah") {
                          saveSharedState({ kontingenMerah: val, contingent: val });
                        } else {
                          saveSharedState({ kontingenMerah: val });
                        }
                      }}
                      className="w-full bg-[#140407] border border-red-900/60 rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-red-400 uppercase tracking-wide"
                      placeholder="KONTINGEN MERAH"
                    />
                  </div>
                </div>
              </div>

              {/* BUTTON 1: CEK PARTAI SELANJUTNYA */}
              <div className="pt-1 space-y-1.5">
                <button
                  onClick={() => {
                    playSoundByKey("short_beep");
                    const activeIdx = partaiList.findIndex(p => p.partai === partaiTanding);
                    if (activeIdx !== -1 && activeIdx < partaiList.length - 1) {
                      const nextM = partaiList[activeIdx + 1];
                      alert(`Partai selanjutnya (${nextM.partai}): ${nextM.biru.name} vs ${nextM.merah.name}`);
                    } else {
                      alert("Belum ada partai selanjutnya yang dijadwalkan.");
                    }
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-[11px] uppercase py-2 rounded-lg tracking-wider shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📄</span>
                  <span>CEK PARTAI SELANJUTNYA</span>
                </button>

                {/* BUTTONS 2 & 3: PREV MATCH & NEXT MATCH */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      playSoundByKey("short_beep");
                      const currentIdx = partaiList.findIndex(p => p.partai === partaiTanding);
                      if (currentIdx > 0) {
                        const prevM = partaiList[currentIdx - 1];
                        const isGandaOrBebas = prevM.kategori === "ganda" || prevM.kategori === "solo_kreatif" || prevM.kategori === "tunggal_bebas";
                        const initKebenaran = isGandaOrBebas ? 0 : 9.90;
                        const freshScores = juriScores.map(js => ({
                          ...js,
                          kebenaran: initKebenaran,
                          kemantapan: 0.00,
                          keserasian: 0.00,
                          penjiwaan: 0.00,
                          wrongMoves: 0,
                          flowScore: 0.00,
                          submitted: false
                        }));
                        saveSharedState({
                          partaiTanding: prevM.partai,
                          selectedCategory: prevM.kategori,
                          selectedAge: prevM.usia,
                          gender: prevM.gender,
                          tahapPertandingan: prevM.tahap,
                          namaAtlitBiru: prevM.biru.name,
                          kontingenBiru: prevM.biru.contingent,
                          namaAtlitMerah: prevM.merah.name,
                          kontingenMerah: prevM.merah.contingent,
                          performerName: activeCorner === "biru" ? prevM.biru.name : prevM.merah.name,
                          contingent: activeCorner === "biru" ? prevM.biru.contingent : prevM.merah.contingent,
                          juriScores: freshScores,
                          juriScoresBiru: freshScores,
                          juriScoresMerah: freshScores,
                          timeRemaining: 0,
                          timeActual: 0,
                          isTimerRunning: false
                        });
                        setNamaAtlitBiru(prevM.biru.name);
                        setKontingenBiru(prevM.biru.contingent);
                        setNamaAtlitMerah(prevM.merah.name);
                        setKontingenMerah(prevM.merah.contingent);
                      }
                    }}
                    className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-[11px] uppercase py-2 rounded-lg tracking-wider transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-orange-950/40"
                  >
                    <span>‹ PREV MATCH</span>
                  </button>

                  <button
                    onClick={() => {
                      playSoundByKey("short_beep");
                      const currentIdx = partaiList.findIndex(p => p.partai === partaiTanding);
                      if (currentIdx !== -1 && currentIdx < partaiList.length - 1) {
                        const nextM = partaiList[currentIdx + 1];
                        const isGandaOrBebas = nextM.kategori === "ganda" || nextM.kategori === "solo_kreatif" || nextM.kategori === "tunggal_bebas";
                        const initKebenaran = isGandaOrBebas ? 0 : 9.90;
                        const freshScores = juriScores.map(js => ({
                          ...js,
                          kebenaran: initKebenaran,
                          kemantapan: 0.00,
                          keserasian: 0.00,
                          penjiwaan: 0.00,
                          wrongMoves: 0,
                          flowScore: 0.00,
                          submitted: false
                        }));
                        saveSharedState({
                          partaiTanding: nextM.partai,
                          selectedCategory: nextM.kategori,
                          selectedAge: nextM.usia,
                          gender: nextM.gender,
                          tahapPertandingan: nextM.tahap,
                          namaAtlitBiru: nextM.biru.name,
                          kontingenBiru: nextM.biru.contingent,
                          namaAtlitMerah: nextM.merah.name,
                          kontingenMerah: nextM.merah.contingent,
                          performerName: activeCorner === "biru" ? nextM.biru.name : nextM.merah.name,
                          contingent: activeCorner === "biru" ? nextM.biru.contingent : nextM.merah.contingent,
                          juriScores: freshScores,
                          juriScoresBiru: freshScores,
                          juriScoresMerah: freshScores,
                          timeRemaining: 0,
                          timeActual: 0,
                          isTimerRunning: false
                        });
                        setNamaAtlitBiru(nextM.biru.name);
                        setKontingenBiru(nextM.biru.contingent);
                        setNamaAtlitMerah(nextM.merah.name);
                        setKontingenMerah(nextM.merah.contingent);
                      }
                    }}
                    className="bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-[11px] uppercase py-2 rounded-lg tracking-wider transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40"
                  >
                    <span>NEXT MATCH ›</span>
                  </button>
                </div>
              </div>

            </div>

            {/* REGISTRASI & PENJADWALAN DATA BOX */}
            <div className="bg-gradient-to-br from-[#09152b] via-[#060e1d] to-[#030712] border border-cyan-800/60 hover:border-cyan-500/80 p-3 rounded-2xl space-y-2.5 shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0c1e3a] border border-cyan-600/60 flex items-center justify-center text-cyan-300 shadow-inner group-hover:scale-105 transition-transform">
                    <UserPlus size={16} className="text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>REGISTRASI DATA TURNAMEN</span>
                      <Sparkles size={11} className="text-cyan-400" />
                    </h4>
                    <p className="text-[9px] text-cyan-300/70 font-mono tracking-tight mt-0.5">
                      ROSTER • BAGAN PERTANDINGAN • KONTROL JADWAL
                    </p>
                  </div>
                </div>
                <span className="bg-[#0c1e3a] text-cyan-200 border border-cyan-600/60 font-mono text-[9px] font-bold px-2 py-0.5 rounded-md">
                  {poolAthletes.length} Atlet
                </span>
              </div>

              {/* Mini Features Pills */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    playSoundByKey("short_beep");
                    setRegistrasiActiveTab("input");
                    setShowRegistrasiOverlay(true);
                  }}
                  className="bg-[#050b16] hover:bg-[#0b1830] border border-[#162540] hover:border-cyan-500/60 px-1.5 py-1 rounded-lg cursor-pointer transition-all text-left"
                >
                  <span className="text-[8px] font-mono text-zinc-400 block uppercase">1. Database</span>
                  <span className="text-[10px] font-black text-cyan-300">{poolAthletes.length} Terdaftar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSoundByKey("short_beep");
                    setRegistrasiActiveTab("bagan");
                    setShowRegistrasiOverlay(true);
                  }}
                  className="bg-[#050b16] hover:bg-[#0b1830] border border-[#162540] hover:border-amber-500/60 px-1.5 py-1 rounded-lg cursor-pointer transition-all text-left"
                >
                  <span className="text-[8px] font-mono text-zinc-400 block uppercase">2. Bagan</span>
                  <span className="text-[10px] font-black text-amber-300">3 Format</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSoundByKey("short_beep");
                    setRegistrasiActiveTab("partai");
                    setShowRegistrasiOverlay(true);
                  }}
                  className="bg-[#050b16] hover:bg-[#0b1830] border border-[#162540] hover:border-emerald-500/60 px-1.5 py-1 rounded-lg cursor-pointer transition-all text-left"
                >
                  <span className="text-[8px] font-mono text-zinc-400 block uppercase">3. Partai</span>
                  <span className="text-[10px] font-black text-emerald-300">{partaiList.filter(p => p.checked).length} Aktif</span>
                </button>
              </div>

              <button
                onClick={() => {
                  playSoundByKey("short_beep");
                  setRegistrasiActiveTab("bagan");
                  setShowRegistrasiOverlay(true);
                }}
                className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-700 hover:from-cyan-500 hover:via-blue-500 hover:to-cyan-600 text-white font-black text-[11px] uppercase py-2.5 rounded-xl tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/60 active:scale-98 border border-cyan-400/30 hover:border-cyan-300/60"
              >
                <UserPlus size={14} className="text-cyan-200" />
                <span>BUKA MENU REGISTRASI DATA & BAGAN</span>
                <ChevronRight size={13} className="text-cyan-300" />
              </button>
            </div>

          </div>

          {/* RIGHT SIDE: SCORE SHEET & HISTORI ARSIP (col-span-5) */}
          <div className="lg:col-span-5 space-y-2.5">
            {/* ACTION BUTTONS: PREVIEW SCORE SHEET & ARSIP PARTAI */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  playSoundByKey("success_chime");
                  setShowPrintScoresheet(true);
                }}
                className="bg-[#050b16] hover:bg-[#0c182c] text-cyan-300 hover:text-white border border-[#162540] hover:border-cyan-500 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <span>📄</span>
                <span>Unduh Score Sheet (PDF)</span>
              </button>

              <button
                onClick={handleArchiveMatch}
                className="bg-[#0c1e3a] hover:bg-[#122b52] text-cyan-200 hover:text-white border border-cyan-700/60 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                <span>📥</span>
                <span>Arsipkan Partai</span>
              </button>
            </div>

            {/* HISTORI HASIL TANDING & COMPLETED MATCHES ARCHIVE */}
            <div className="bg-[#070e1c] border border-[#162540] p-2.5 rounded-xl space-y-2 shadow-lg">
              <div className="flex justify-between items-center border-b border-[#142033] pb-1">
                <h4 className="text-[11px] font-mono font-black text-zinc-400 uppercase tracking-widest">HISTORI HASIL TANDING</h4>
                
                <div className="flex gap-1.5">
                  <button
                    onClick={() => alert("ZIP archive generated for completed matches in this session.")}
                    className="bg-[#050b16] hover:bg-[#0c182c] text-zinc-400 hover:text-white px-2 py-0.5 rounded text-[8px] font-mono border border-[#162540]"
                  >
                    ZIP ARSIP
                  </button>
                  <button
                    onClick={exportHistoryToExcel}
                    className="bg-[#041d14] text-emerald-400 hover:bg-[#072f21] px-2 py-1 rounded text-[9px] font-mono border border-emerald-600/60"
                  >
                    EXCEL EXPORT
                  </button>
                </div>
              </div>

              {/* Scrolling history list */}
              <div className="max-h-[480px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-950 scrollbar-track-transparent">
                {matchHistory.length === 0 ? (
                  <div className="text-center py-6 text-[10px] font-mono text-zinc-600">
                    Belum ada partai tanding diarsipkan sesi ini.
                  </div>
                ) : (
                  matchHistory.map((item, idx) => {
                    const bName = item.biruName || item.biru?.name || "SUDUT BIRU";
                    const mName = item.merahName || item.merah?.name || "SUDUT MERAH";
                    const rawBScore = item.biruScore !== undefined ? item.biruScore : (item.biru?.score !== undefined ? item.biru.score : 0);
                    const rawMScore = item.merahScore !== undefined ? item.merahScore : (item.merah?.score !== undefined ? item.merah.score : 0);
                    const bScoreDisplay = typeof rawBScore === "number" ? rawBScore.toFixed(2) : String(rawBScore || "-");
                    const mScoreDisplay = typeof rawMScore === "number" ? rawMScore.toFixed(2) : String(rawMScore || "-");

                    return (
                      <div key={item.id || idx} className="bg-[#050b16] p-2.5 rounded-lg border border-[#162540] flex flex-col gap-1 text-[10px] font-mono">
                        <div className="flex justify-between text-[9px] text-zinc-500">
                          <span>PARTAI {cleanPartaiNumber(item.partai)} • {item.kategori} • {item.tahap}</span>
                          <span className="text-cyan-400 font-bold">{item.usia}</span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-1">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className={`font-bold ${item.winner === bName ? "text-white" : "text-zinc-400"}`}>
                              {bName} ({bScoreDisplay})
                            </span>
                          </div>
                          <span className="text-zinc-600 font-bold">vs</span>
                          <div className="flex items-center gap-1">
                            <span className={`font-bold ${item.winner === mName ? "text-white" : "text-zinc-400"}`}>
                              {mName} ({mScoreDisplay})
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          </div>
                        </div>

                      <div className="text-[9px] text-zinc-500 mt-1 flex justify-between border-t border-[#142033] pt-1">
                        <span>Pemenang: <strong className="text-emerald-400">{item.winner}</strong></span>
                        <button
                          onClick={() => {
                            if (confirm("Hapus rekam data histori ini?")) {
                              const updated = matchHistory.filter(mh => mh.id !== item.id);
                              saveSharedState({ matchHistory: updated });
                            }
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              </div>

              {/* Bottom buttons */}
              <div className="grid grid-cols-2 gap-3 border-t border-[#142033] pt-3">
                <button
                  onClick={() => alert("Statistik Pertandingan Sesi Seni TGR Aktif:\nTotal Atlet: 12\nPartai Selesai: " + matchHistory.length)}
                  className="bg-[#050b16] hover:bg-[#0c182c] text-cyan-400 text-[10px] font-mono font-bold py-2 rounded-lg border border-[#162540]"
                >
                  STATISTIK PERTANDINGAN
                </button>
                <button
                  onClick={() => alert("STATUS LISENSI:\nJRZ Score TGR Platform - PROFESSIONAL LICENSE\nLicensed to: IPSI INDONESIA REKOR")}
                  className="bg-[#050b16] hover:bg-[#0c182c] text-cyan-400 text-[10px] font-mono font-bold py-2 rounded-lg border border-[#162540]"
                >
                  STATUS LISENSI
                </button>
              </div>

            </div>

          </div>

        </main>

        {/* ========================================================================= */}
        {/* INTERACTIVE OVERLAY MODAL: REGISTRASI DATA, BAGAN PERTANDINGAN, KONTROL PARTAI */}
        {/* ========================================================================= */}
        {showRegistrasiOverlay && (
          <div className="fixed inset-0 bg-[#050a18] z-50 overflow-hidden text-white font-sans flex flex-col">
            <RegistrasiDataView
              onBack={() => {
                playSoundByKey("short_beep");
                setShowRegistrasiOverlay(false);
              }}
              isFullscreen={isFullscreen}
              tournamentName={namaEvent || "PIALA PRESTASI IPSI 2026"}
              initialTab={registrasiActiveTab === "input" ? "input_data" : registrasiActiveTab === "partai" ? "kontrol_partai" : "bagan_braket"}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* PRINTABLE SCORE SHEET PREVIEW MODAL */}
        {/* ========================================================================= */}
        {showPrintScoresheet && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white text-black p-8 rounded-xl max-w-4xl w-full relative my-8 print:p-0 print:m-0 print:rounded-none">
              
              {/* Modal close / Action header bar */}
              <div className="absolute top-4 right-4 flex gap-3 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg"
                >
                  🖨️ Cetak / Print
                </button>
                <button
                  onClick={() => setShowPrintScoresheet(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg"
                >
                  Tutup
                </button>
              </div>

              {/* PRINTABLE DOCUMENT BODY */}
              <div id="printable-area" className="space-y-6 font-sans text-xs">
                
                {/* Header Table */}
                <div className="border-b-2 border-black pb-4 text-center space-y-1">
                  <h2 className="text-lg font-black tracking-wide leading-none">{namaEvent}</h2>
                  <p className="font-bold text-[10px]">Tempat: {tempatPelaksanaan} • Tanggal: {waktuPelaksanaan}</p>
                  <p className="text-xs uppercase font-extrabold tracking-wider bg-black text-white py-1 rounded inline-block px-4">
                    LEMBAR PENILAIAN PERTANDINGAN SENI JURUS
                  </p>
                </div>

                {/* Match Info Strip */}
                <div className="grid grid-cols-2 gap-4 border border-black p-3 bg-zinc-50 rounded">
                  <div className="space-y-1">
                    <div><strong>Partai Nomor:</strong> {cleanPartaiNumber(partaiTanding)} ({tahapPertandingan})</div>
                    <div><strong>Kategori Seni:</strong> {categories.find(c => c.id === selectedCategory)?.name}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div><strong>Golongan Usia:</strong> {selectedAge}</div>
                    <div><strong>Gender:</strong> {gender}</div>
                  </div>
                </div>

                {/* Scoring Table */}
                <table className="w-full border-collapse border border-black text-left text-[11px]">
                  <thead>
                    <tr className="bg-zinc-100">
                      <th className="border border-black p-2">SUDUT PERTANDINGAN</th>
                      <th className="border border-black p-2">NAMA ATLET / TIM</th>
                      <th className="border border-black p-2">KONTINGEN</th>
                      <th className="border border-black p-2 text-center">SKOR AKHIR JURI</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 font-bold text-blue-600">SUDUT BIRU</td>
                      <td className="border border-black p-2 font-bold uppercase">{namaAtlitBiru}</td>
                      <td className="border border-black p-2 uppercase">{kontingenBiru}</td>
                      <td className="border border-black p-2 text-center text-lg font-black text-blue-600 font-mono">{getFormattedScore("biru")}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold text-red-600">SUDUT MERAH</td>
                      <td className="border border-black p-2 font-bold uppercase">{namaAtlitMerah}</td>
                      <td className="border border-black p-2 uppercase">{kontingenMerah}</td>
                      <td className="border border-black p-2 text-center text-lg font-black text-red-600 font-mono">{getFormattedScore("merah")}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Judges detailed table */}
                <div className="space-y-2">
                  <h4 className="font-bold border-b border-black pb-1 uppercase">REKAPITULASI WASIT-JURI SAH</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {juriScores.map((js, idx) => {
                      const totalBiru = getJudgeTotal(juriScoresBiru.find(s => s.id === js.id) || js);
                      const totalMerah = getJudgeTotal(juriScoresMerah.find(s => s.id === js.id) || js);
                      return (
                        <div key={js.id} className="border border-black p-2 rounded text-center bg-zinc-50 font-mono">
                          <div className="font-bold border-b border-zinc-300 pb-1 text-[10px]">JURI {js.id}</div>
                          <div className="mt-1 flex justify-between text-[10px]">
                            <span className="text-blue-600 font-bold">B: {totalBiru.toFixed(2)}</span>
                            <span className="text-red-600 font-bold">M: {totalMerah.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-10 pt-10 text-center font-bold">
                  <div className="space-y-12">
                    <div>KETUA DEWAN JURI</div>
                    <div className="border-t border-black pt-1 w-48 mx-auto">Tanda Tangan & Nama Terang</div>
                  </div>
                  <div className="space-y-12">
                    <div>SEKRETARIS PERTANDINGAN</div>
                    <div className="border-t border-black pt-1 w-48 mx-auto">Tanda Tangan & Nama Terang</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        </div>
      </ErrorBoundary>
    );
  }

  // 3. ROLE: DEWAN VIEW (Chair of the board panel, inputs deductions, displays calculation logs, matches dewantunggal.JPG perfectly)
  if (role === "dewan") {
    const calcResult = getSeniCalculationResult();
    const calculateSD = (scoresList: JuriScore[]) => {
      const totals = scoresList.map(js => getJudgeTotal(js));
      const n = totals.length;
      if (n === 0) return 0;
      const mean = totals.reduce((sum, val) => sum + val, 0) / n;
      const variance = totals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
      return Math.sqrt(variance);
    };

    const handleEditJudgeScore = (judgeId: number, type: 'kebenaran' | 'kemantapan' | 'serangBela' | 'penjiwaan') => {
      const activeScores = activeCorner === "biru" ? juriScoresBiru : juriScoresMerah;
      const currentJs = activeScores.find(js => js.id === judgeId);
      const isGanda = selectedCategory === "ganda";
      
      let label = "Kebenaran";
      let currentVal = 0;
      if (isGanda) {
        if (type === 'serangBela' || type === 'kebenaran') {
          label = "Serang Bela";
          currentVal = currentJs?.kebenaran ?? 0;
        } else if (type === 'kemantapan') {
          label = "Kemantapan dan Harmoni";
          currentVal = currentJs?.kemantapan ?? 0;
        } else if (type === 'penjiwaan') {
          label = "Penjiwaan dan Penghayatan";
          currentVal = currentJs?.penjiwaan ?? currentJs?.keserasian ?? 0;
        }
      } else {
        label = type === 'kebenaran' ? 'Nilai Kebenaran' : 'Kemantapan & Stamina';
        currentVal = currentJs?.[type === 'kebenaran' ? 'kebenaran' : 'kemantapan'] ?? 0;
      }
      
      const promptVal = prompt(`Ubah nilai ${label} Juri ${judgeId}:`, currentVal.toFixed(2));
      if (promptVal !== null) {
        const num = parseFloat(promptVal);
        if (!isNaN(num)) {
          const updatedScores = activeScores.map(js => {
            if (js.id === judgeId) {
              if (isGanda) {
                if (type === 'serangBela' || type === 'kebenaran') {
                  return { ...js, kebenaran: num, wrongMoves: num, submitted: true };
                } else if (type === 'kemantapan') {
                  return { ...js, kemantapan: num, submitted: true };
                } else if (type === 'penjiwaan') {
                  return { ...js, penjiwaan: num, keserasian: num, submitted: true };
                }
              }
              return { ...js, [type === 'serangBela' ? 'kebenaran' : type]: num, submitted: true };
            }
            return js;
          });
          
          if (activeCorner === "biru") {
            setJuriScoresBiru(updatedScores);
            setJuriScores(updatedScores);
            saveSharedState({
              juriScoresBiru: updatedScores,
              juriScores: updatedScores
            });
          } else {
            setJuriScoresMerah(updatedScores);
            setJuriScores(updatedScores);
            saveSharedState({
              juriScoresMerah: updatedScores,
              juriScores: updatedScores
            });
          }
          playSoundByKey("success_chime");
        }
      }
    };

    const handleDewanScaleChange = (newScale: number) => {
      const clamped = Math.min(1.4, Math.max(0.70, Math.round(newScale * 100) / 100));
      setDewanScale(clamped);
      try {
        localStorage.setItem("jrz_dewan_scale", String(clamped));
      } catch {}
      playSoundByKey("short_beep");
    };

    const handleDewanSimpanDanSelesai = () => {
      // 1. Calculate live match outcome and scores
      const outcome = getLiveMatchOutcome();
      const scoreB = getCalculatedScoreForCorner("biru");
      const scoreM = getCalculatedScoreForCorner("merah");
      const sdB = calculateStandardDeviation(juriScoresBiru);
      const sdM = calculateStandardDeviation(juriScoresMerah);
      const dedB = getDewanDeductionValueForCorner("biru");
      const dedM = getDewanDeductionValueForCorner("merah");
      const winner = outcome.winnerTitle;
      
      // 2. Archive match data into silat_seni_match_history
      const newRecord = {
        id: Date.now(),
        partai: partaiTanding,
        kategori: selectedCategory,
        usia: selectedAge,
        gender,
        tahap: tahapPertandingan,
        biru: { 
          name: namaAtlitBiru, 
          contingent: kontingenBiru, 
          score: scoreB, 
          sd: sdB,
          deductions: dedB,
          status: disqualifiedBiru ? "DISQ" : undurDiriBiru ? "WD" : "NORMAL",
          scores: juriScoresBiru
        },
        merah: { 
          name: namaAtlitMerah, 
          contingent: kontingenMerah, 
          score: scoreM, 
          sd: sdM,
          deductions: dedM,
          status: disqualifiedMerah ? "DISQ" : undurDiriMerah ? "WD" : "NORMAL",
          scores: juriScoresMerah
        },
        winner,
        winReason: outcome.reason,
        timestamp: new Date().toLocaleString("id-ID")
      };

      const updatedHistory = [newRecord, ...matchHistory];
      setMatchHistory(updatedHistory);
      try {
        localStorage.setItem("silat_seni_match_history", JSON.stringify(updatedHistory));
      } catch {}

      // 3. Unlock match results to spectator monitor & sync shared state
      setIsMatchUnlocked(true);
      saveSharedState({
        isMatchUnlocked: true,
        matchHistory: updatedHistory,
        logs: [
          { 
            time: formatTime(timeRemaining), 
            msg: `DEWAN JURI: SIMPAN & SELESAI - HASIL DITERBITKAN KE MONITOR PENONTON & DIARSIPKAN KE HISTORI (PEMENANG: ${winner})`, 
            type: "system" 
          },
          ...logs
        ]
      });

      // 4. Sound and visual feedback
      playSoundByKey("success_chime");
      const displayScoreB = disqualifiedBiru ? "DISQ" : undurDiriBiru ? "WD" : scoreB.toFixed(3);
      const displayScoreM = disqualifiedMerah ? "DISQ" : undurDiriMerah ? "WD" : scoreM.toFixed(3);
      alert(`✅ PERTANDINGAN PARTAI ${partaiTanding} BERHASIL DISIMPAN & DISELESAIKAN!\n\n1. Nilai akhir resmi telah diterbitkan ke Layar Monitor Penonton.\n2. Data pertandingan tersimpan otomatis di Histori Hasil Tanding Sekretaris (siap diunduh/evaluasi).\n\nPemenang: ${winner}\nKeputusan: ${outcome.reason}\nSkor - Biru: ${displayScoreB} | Merah: ${displayScoreM}`);
    };

    return (
      <div 
        id="dewan-view-root"
        className="h-screen w-full max-h-screen bg-[#040813] text-white flex flex-col justify-between font-sans select-none relative overflow-y-auto lg:overflow-hidden pb-1"
        style={{ zoom: dewanScale }}
      >
        {/* Top Header Event Info with Scale & Screen Controls */}
        <div className="bg-[#070e1c] border-b border-[#162540] py-1.5 px-4 flex flex-row items-center justify-between gap-3 z-10 shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider leading-tight">
                {namaEvent || "KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA"}
              </h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-cyan-400/80 tracking-wider mt-0.5 uppercase font-mono leading-none">
                PARTAI {cleanPartaiNumber(partaiTanding)} | GELANGGANG 1 | {selectedCategory === "solo_kreatif" ? "SOLO KREATIF" : selectedCategory.toUpperCase()} ({gender.toUpperCase()}) | {selectedAge.toUpperCase()} | {tahapPertandingan.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs sm:text-sm font-black text-cyan-300 tracking-wider uppercase font-mono hidden md:inline">
              {selectedCategory === "solo_kreatif" ? "SOLO KREATIF" : selectedCategory.toUpperCase()} • {gender.toUpperCase()}
            </span>

            {/* Interactive Size/Zoom Adjuster */}
            <div 
              className="flex items-center bg-[#050b16] border border-cyan-500/40 rounded-xl px-1.5 py-0.5 gap-1 shadow-sm"
              title="Sesuaikan ukuran tampilan agar pas dengan layar perangkat"
            >
              <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase hidden sm:inline">SKALA:</span>
              <button
                onClick={() => handleDewanScaleChange(dewanScale - 0.05)}
                className="w-6 h-6 rounded-lg bg-[#0b172a] hover:bg-[#162a4a] text-cyan-300 flex items-center justify-center text-xs font-mono font-black border border-cyan-800/60 active:scale-95 cursor-pointer"
                title="Perkecil Ukuran Tampilan (Zoom Out)"
              >
                -
              </button>
              <button
                onClick={() => handleDewanScaleChange(1.0)}
                className="px-1.5 py-0.5 text-[10px] font-mono font-black text-amber-300 hover:text-white rounded hover:bg-white/5 cursor-pointer"
                title="Klik untuk Reset ke Ukuran 100%"
              >
                {Math.round(dewanScale * 100)}%
              </button>
              <button
                onClick={() => handleDewanScaleChange(dewanScale + 0.05)}
                className="w-6 h-6 rounded-lg bg-[#0b172a] hover:bg-[#162a4a] text-cyan-300 flex items-center justify-center text-xs font-mono font-black border border-cyan-800/60 active:scale-95 cursor-pointer"
                title="Perbesar Ukuran Tampilan (Zoom In)"
              >
                +
              </button>
            </div>

            {/* Quick Fullscreen Button */}
            <button
              onClick={toggleFullScreen}
              className="bg-[#0b172a] hover:bg-[#162a4a] text-amber-300 hover:text-white px-2.5 py-1 rounded-xl border border-amber-500/40 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Toggle Layar Penuh"
            >
              {isFs ? <Minimize size={13} /> : <Maximize size={13} />}
              <span className="hidden sm:inline">{isFs ? "Normal" : "Full"}</span>
            </button>

            {/* Back Button */}
            <button
              onClick={() => { setRole(null); playSoundByKey("short_beep"); }}
              className="bg-[#0b172a] hover:bg-[#162a4a] text-zinc-300 hover:text-white px-2.5 py-1 rounded-xl border border-zinc-700 hover:border-zinc-500 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Kembali ke Menu Utama"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>

        {/* Athlete Section & Action controls */}
        <div className="px-4 py-1 flex flex-wrap justify-between items-center gap-2 z-10 w-full shrink-0">
          {/* Competitor Identity */}
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-sans font-bold text-cyan-400 uppercase tracking-wider block font-mono leading-none">
              {activeCorner === "biru" ? (kontingenBiru || "BALI") : (kontingenMerah || "JAWA BARAT")}
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide mt-0.5 uppercase font-mono leading-tight">
              {activeCorner === "biru" ? (namaAtlitBiru || "BENNY G. SUMARSONO") : (namaAtlitMerah || "SUHARTONO")}
            </h2>
          </div>

          {/* Action Center Row */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            
            {/* Display Sudut Aktif (Read-only, dikendalikan terpusat dari Panel Timer / Sekretaris) */}
            <div className="bg-[#070e1c] border border-[#162540] rounded-xl p-1 flex items-center gap-1 shadow-sm" title="Sudut aktif dikendalikan dari Panel Timer / Sekretaris">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-widest flex items-center gap-1.5 transition-all select-none ${
                activeCorner === "biru"
                  ? "bg-[#1e61ff] text-white shadow-[0_0_15px_rgba(30,97,255,0.4)] border border-blue-400/50"
                  : "text-zinc-600 bg-transparent opacity-30"
              }`}>
                <span className={activeCorner === "biru" ? "text-blue-200 animate-pulse" : "text-zinc-600"}>●</span> SUDUT BIRU
              </div>

              <div className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-widest flex items-center gap-1.5 transition-all select-none ${
                activeCorner === "merah"
                  ? "bg-[#e11d48] text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] border border-rose-400/50"
                  : "text-zinc-600 bg-transparent opacity-30"
              }`}>
                <span className={activeCorner === "merah" ? "text-rose-200 animate-pulse" : "text-zinc-600"}>●</span> SUDUT MERAH
              </div>
            </div>

            {/* Hukuman / DISK - UD Button */}
            <button
              id="dewan-btn-disk-ud"
              onClick={() => setShowDiskUDModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black tracking-widest border border-rose-500/80 text-rose-400 bg-[#070e1c] hover:bg-rose-500/10 transition-all uppercase cursor-pointer"
            >
              DISK - UD
            </button>

            {/* Tombol Simpan & Selesai Dewan Juri (Menggantikan Grid Modal Hukuman) */}
            <button
              id="dewan-btn-simpan-selesai"
              onClick={handleDewanSimpanDanSelesai}
              className="px-4 py-1.5 rounded-xl text-xs font-black tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/80 transition-all uppercase cursor-pointer flex items-center gap-1.5 active:scale-95 animate-pulse"
              title="Selesai bertugas: Terbitkan skor ke Monitor Penonton & Arsipkan ke Histori Sekretaris"
            >
              <CheckCircle2 size={15} className="text-white" />
              <span>SIMPAN &amp; SELESAI</span>
            </button>

            {/* LED Digital Timer block */}
            <div className="bg-[#070e1c] border border-[#162540] px-3 py-1 rounded-xl flex items-center shadow-lg">
              <div className="flex flex-col items-center">
                <span className="text-[7px] text-amber-400/80 font-mono font-bold uppercase leading-none tracking-widest">WAKTU TAMPIL</span>
                <span className="text-lg font-black font-mono tracking-widest text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)] mt-0.5">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Main 10-Juri Grid Table - Centered alignment (Rata Tengah untuk 4-6-8 Juri) */}
        <div className="w-full max-w-[100vw] overflow-x-auto px-4 py-1.5 flex-1 flex flex-col justify-center items-center min-h-0">
          <table className={`border-collapse border border-[#162540] text-center bg-[#070e1c] rounded-xl overflow-hidden shadow-2xl text-xs my-auto mx-auto ${
            judgesCount === 4 ? "w-full max-w-4xl" :
            judgesCount === 6 ? "w-full max-w-5xl" :
            judgesCount === 8 ? "w-full max-w-6xl" :
            judgesCount === 3 ? "w-full max-w-3xl" :
            judgesCount === 5 ? "w-full max-w-4xl" :
            "w-full"
          }`}>
            <thead>
              <tr className="border-b border-[#162540]">
                <th className="border border-[#162540] text-cyan-300 bg-[#0b172a] text-xs font-mono py-3 sm:py-3.5 px-3 text-left font-black uppercase">
                  JURI
                </th>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => (
                  <th key={jNum} className="border border-[#162540] text-white bg-[#0b172a] text-xs sm:text-sm font-black py-3 sm:py-3.5 px-1.5 font-mono">
                    JURI {jNum}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Kesalahan Gerak / Serang Bela display */}
              <tr className="border-b border-[#162540]">
                <td className="border border-[#162540] text-white text-xs font-bold py-3 sm:py-3.5 px-3 text-left bg-[#0b172a] uppercase">
                  {selectedCategory === "ganda" ? "SERANG BELA" : "KESALAHAN GERAK"}
                </td>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => {
                  const js = juriScores.find(j => j.id === jNum);
                  if (selectedCategory === "ganda") {
                    const isSubmitted = js && js.submitted;
                    const serangBelaVal = isSubmitted ? (js.kebenaran ?? 0) : 0;
                    return (
                      <td 
                        key={jNum} 
                        onClick={() => handleEditJudgeScore(jNum, 'serangBela')}
                        className="border border-[#162540] py-3 sm:py-3.5 px-1 bg-[#081020] hover:bg-amber-900/20 cursor-pointer transition-all"
                      >
                        <span className="font-mono font-black text-sm sm:text-base text-amber-400">
                          {serangBelaVal === 0 ? "0" : serangBelaVal.toFixed(2)}
                        </span>
                      </td>
                    );
                  }
                  const rawMistakes = js ? Math.max(0, Math.round((9.90 - js.kebenaran) / 0.01)) : 0;
                  return (
                    <td key={jNum} className="border border-[#162540] py-3 sm:py-3.5 px-1 bg-[#081020]">
                      <span className="font-mono font-black text-sm sm:text-base text-amber-400">
                        {rawMistakes}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Nilai Kebenaran / Kemantapan dan Harmoni editable */}
              <tr className="border-b border-[#162540]">
                <td 
                  className="border border-[#162540] text-white text-xs font-bold py-3.5 sm:py-4.5 px-3 text-left bg-[#0b172a] cursor-pointer hover:bg-cyan-950/40 transition-all uppercase"
                  onClick={() => alert("Tips: Klik nilai pada sel kolom Juri untuk mengubah nilai.")}
                >
                  {selectedCategory === "ganda" ? (
                    "KEMANTAPAN DAN HARMONI"
                  ) : (
                    <>
                      NILAI KEBENARAN <span className="text-[10px] text-zinc-400 block font-normal lowercase">(base 9.90, -0.01/kesalahan)</span>
                    </>
                  )}
                </td>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => {
                  const js = juriScores.find(j => j.id === jNum);
                  if (selectedCategory === "ganda") {
                    const isSubmitted = js && js.submitted;
                    const kemantapanVal = isSubmitted ? (js.kemantapan ?? 0) : 0;
                    return (
                      <td 
                        key={jNum} 
                        onClick={() => handleEditJudgeScore(jNum, 'kemantapan')}
                        className="border border-[#162540] py-3.5 sm:py-4.5 px-1 font-mono font-bold text-sm sm:text-base text-cyan-400 bg-[#081020] hover:bg-cyan-900/30 cursor-pointer transition-all"
                      >
                        {kemantapanVal === 0 ? "0" : kemantapanVal.toFixed(2)}
                      </td>
                    );
                  }
                  const kebenaranVal = js ? js.kebenaran : 9.90;
                  return (
                    <td 
                      key={jNum} 
                      onClick={() => handleEditJudgeScore(jNum, 'kebenaran')}
                      className="border border-[#162540] py-3.5 sm:py-4.5 px-1 font-mono font-bold text-sm sm:text-base text-cyan-400 bg-[#081020] hover:bg-cyan-900/30 cursor-pointer transition-all"
                    >
                      {kebenaranVal.toFixed(2)}
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Kemantapan & Stamina / Penjiwaan dan Penghayatan editable */}
              <tr className="border-b border-[#162540]">
                <td 
                  className="border border-[#162540] text-white text-xs font-bold py-3.5 sm:py-4.5 px-3 text-left bg-[#0b172a] cursor-pointer hover:bg-cyan-950/40 transition-all uppercase"
                  onClick={() => alert("Tips: Klik nilai pada sel kolom Juri untuk mengubah nilai.")}
                >
                  {selectedCategory === "ganda" ? (
                    "PENJIWAAN DAN PENGHAYATAN"
                  ) : (
                    <>
                      KEMANTAPAN & STAMINA <span className="text-[10px] text-zinc-400 block font-normal lowercase">(range 5.00 - 6.00)</span>
                    </>
                  )}
                </td>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => {
                  const js = juriScores.find(j => j.id === jNum);
                  if (selectedCategory === "ganda") {
                    const isSubmitted = js && js.submitted;
                    const penjiwaanVal = isSubmitted ? ((js.penjiwaan ?? js.keserasian) ?? 0) : 0;
                    return (
                      <td 
                        key={jNum} 
                        onClick={() => handleEditJudgeScore(jNum, 'penjiwaan')}
                        className="border border-[#162540] py-3.5 sm:py-4.5 px-1 font-mono font-bold text-sm sm:text-base text-emerald-400 bg-[#081020] hover:bg-emerald-900/30 cursor-pointer transition-all"
                      >
                        {penjiwaanVal === 0 ? "0" : penjiwaanVal.toFixed(2)}
                      </td>
                    );
                  }
                  const kemantapanVal = js ? js.kemantapan : 5.50;
                  return (
                    <td 
                      key={jNum} 
                      onClick={() => handleEditJudgeScore(jNum, 'kemantapan')}
                      className="border border-[#162540] py-3.5 sm:py-4.5 px-1 font-mono font-bold text-sm sm:text-base text-emerald-400 bg-[#081020] hover:bg-emerald-900/30 cursor-pointer transition-all"
                    >
                      {kemantapanVal.toFixed(2)}
                    </td>
                  );
                })}
              </tr>

              {/* Row 4: Total Skor */}
              <tr>
                <td className="border border-[#162540] text-cyan-300 text-xs sm:text-sm font-black py-4 sm:py-5 px-3 text-left bg-[#0b172a] uppercase font-mono">
                  TOTAL SKOR JURI
                </td>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => {
                  const js = juriScores.find(j => j.id === jNum);
                  const total = js ? getJudgeTotal(js) : getInitialDefaultScore();
                  return (
                    <td key={jNum} className="border border-[#162540] py-4 sm:py-5 px-1 font-mono font-black text-base sm:text-lg text-amber-400 bg-[#081020]">
                      {total.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* MENU INPUT NILAI HUKUMAN (BERURUTAN SECARA HORIZONTAL: DIBAWAH TOTAL SKOR JURI & DIATAS NILAI JURI BERTUGAS) */}
        <div className="px-4 py-0.5 z-10 w-full shrink-0">
          <div className="bg-[#070e1c] border border-rose-900/60 hover:border-rose-700/60 p-2 rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.12)] space-y-1.5">
            {/* Header bar */}
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#162540] pb-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-400" />
                <span className="text-[11px] font-mono font-black text-rose-300 uppercase tracking-wider">
                  INPUT NILAI HUKUMAN DEWAN JURI
                </span>
                <span className="text-[8px] bg-rose-950/70 border border-rose-500/40 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                  PENGURANGAN NILAI
                </span>
              </div>

              {/* Total Hukuman Badge & Reset */}
              <div className="flex items-center gap-1.5">
                <div className="bg-[#180408] border border-rose-500/60 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                  <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">TOTAL:</span>
                  <span className="text-xs font-mono font-black text-rose-400 tracking-wider">
                    -{((deductions.timeOverUnder * 0.01) + (deductions.weaponDrop * 0.50) + (deductions.outOfBounds * 0.50) + (deductions.costumeMistake ? 0.50 : 0) + (deductions.otherPenalty || 0)).toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const resetD = { timeOverUnder: 0, weaponDrop: 0, outOfBounds: 0, costumeMistake: false, otherPenalty: 0 };
                    saveSharedState({ deductions: resetD });
                    playSoundByKey("warning_beep");
                  }}
                  className="bg-[#0b172a] hover:bg-[#162a4a] text-zinc-400 hover:text-white border border-[#162540] px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer"
                  title="Reset seluruh hukuman ke 0"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Horizontal Sequential Cards Grid - Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5">
              
              {/* Item 1: Waktu Tampil / Deviasi Waktu */}
              <div className="bg-[#050b16] border border-[#162540] hover:border-amber-500/40 p-1.5 rounded-lg flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-300 uppercase font-sans truncate">
                    1. DEVIASI WAKTU
                  </span>
                  <span className="text-[10px] font-mono font-black text-rose-400">
                    -{(deductions.timeOverUnder * 0.01).toFixed(2)}
                  </span>
                </div>
                <div className="text-[8px] text-zinc-500 font-mono truncate leading-none">
                  ±5s aman • -0.01/dtk
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const newD = { ...deductions, timeOverUnder: Math.max(0, deductions.timeOverUnder - 1) };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("short_beep");
                    }}
                    className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-6 h-6 rounded flex items-center justify-center border border-cyan-800/60 cursor-pointer active:scale-95 text-xs font-mono"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-[#040813] py-0.5 border border-[#162540] rounded text-center font-mono font-black text-xs text-white">
                    {deductions.timeOverUnder}s
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newD = { ...deductions, timeOverUnder: deductions.timeOverUnder + 1 };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("short_beep");
                    }}
                    className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-6 h-6 rounded flex items-center justify-center border border-cyan-800/60 cursor-pointer active:scale-95 text-xs font-mono"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const target = getDurasiSeconds(durasiTampil);
                    const minSafe = target - 5;
                    const maxSafe = target + 5;
                    let diff = 0;
                    if (timeActual < minSafe) {
                      diff = minSafe - timeActual;
                    } else if (timeActual > maxSafe) {
                      diff = timeActual - maxSafe;
                    }
                    const newD = { ...deductions, timeOverUnder: diff };
                    saveSharedState({ deductions: newD });
                    playSoundByKey("success_chime");
                  }}
                  className="w-full bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white py-0.5 rounded text-[8px] font-mono font-bold uppercase transition-all cursor-pointer text-center leading-tight"
                >
                  ⚡ Hitung Toleransi 5s
                </button>
              </div>

              {/* Item 2: Senjata Jatuh */}
              <div className="bg-[#050b16] border border-[#162540] hover:border-amber-500/40 p-1.5 rounded-lg flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-300 uppercase font-sans truncate">
                    2. SENJATA JATUH
                  </span>
                  <span className="text-[10px] font-mono font-black text-rose-400">
                    -{(deductions.weaponDrop * 0.50).toFixed(2)}
                  </span>
                </div>
                <div className="text-[8px] text-zinc-500 font-mono truncate leading-none">
                  -0.50 per lepas
                </div>
                <div className="flex items-center gap-1 my-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const newD = { ...deductions, weaponDrop: Math.max(0, deductions.weaponDrop - 1) };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("short_beep");
                    }}
                    className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-6 h-6 rounded flex items-center justify-center border border-cyan-800/60 cursor-pointer active:scale-95 text-xs font-mono"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-[#040813] py-0.5 border border-[#162540] rounded text-center font-mono font-black text-xs text-white">
                    {deductions.weaponDrop}x
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newD = { ...deductions, weaponDrop: deductions.weaponDrop + 1 };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("warning_beep");
                    }}
                    className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-6 h-6 rounded flex items-center justify-center border border-cyan-800/60 cursor-pointer active:scale-95 text-xs font-mono"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Item 3: Keluar Gelanggang */}
              <div className="bg-[#050b16] border border-[#162540] hover:border-amber-500/40 p-1.5 rounded-lg flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-300 uppercase font-sans truncate">
                    3. KELUAR GELANGGANG
                  </span>
                  <span className="text-[10px] font-mono font-black text-rose-400">
                    -{(deductions.outOfBounds * 0.50).toFixed(2)}
                  </span>
                </div>
                <div className="text-[8px] text-zinc-500 font-mono truncate leading-none">
                  -0.50 per keluar garis
                </div>
                <div className="flex items-center gap-1 my-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const newD = { ...deductions, outOfBounds: Math.max(0, deductions.outOfBounds - 1) };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("short_beep");
                    }}
                    className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-6 h-6 rounded flex items-center justify-center border border-cyan-800/60 cursor-pointer active:scale-95 text-xs font-mono"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-[#040813] py-0.5 border border-[#162540] rounded text-center font-mono font-black text-xs text-white">
                    {deductions.outOfBounds}x
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newD = { ...deductions, outOfBounds: deductions.outOfBounds + 1 };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("warning_beep");
                    }}
                    className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-6 h-6 rounded flex items-center justify-center border border-cyan-800/60 cursor-pointer active:scale-95 text-xs font-mono"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Item 4: Pelanggaran Pakaian */}
              <div className="bg-[#050b16] border border-[#162540] hover:border-amber-500/40 p-1.5 rounded-lg flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-300 uppercase font-sans truncate">
                    4. PAKAIAN / AKSESORIS
                  </span>
                  <span className="text-[10px] font-mono font-black text-rose-400">
                    -{deductions.costumeMistake ? "0.50" : "0.00"}
                  </span>
                </div>
                <div className="text-[8px] text-zinc-500 font-mono truncate leading-none">
                  -0.50 aksesoris jatuh
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newD = { ...deductions, costumeMistake: !deductions.costumeMistake };
                    saveSharedState({ deductions: newD });
                    playSoundByKey(deductions.costumeMistake ? "short_beep" : "warning_beep");
                  }}
                  className={`w-full py-1.5 rounded text-[9px] font-mono font-black border transition-all flex justify-center items-center gap-1 cursor-pointer my-auto ${
                    deductions.costumeMistake
                      ? "bg-rose-950/70 border-rose-500 text-rose-300 animate-pulse shadow-sm shadow-rose-950"
                      : "bg-[#0b172a] border-[#162540] text-zinc-400 hover:text-white"
                  }`}
                >
                  {deductions.costumeMistake ? <CheckSquare size={11} /> : <Square size={11} />}
                  <span>{deductions.costumeMistake ? "TERKENA DENDA" : "AMAN (0)"}</span>
                </button>
              </div>

              {/* Item 5: Hukuman Lainnya */}
              <div className="bg-[#050b16] border border-[#162540] hover:border-amber-500/40 p-1.5 rounded-lg flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-300 uppercase font-sans truncate">
                    5. HUKUMAN LAINNYA
                  </span>
                  <span className="text-[10px] font-mono font-black text-rose-400">
                    -{(deductions.otherPenalty || 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-[8px] text-zinc-500 font-mono truncate leading-none">
                  Denda kustom dewan
                </div>
                <div className="flex items-center gap-1 my-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const current = Number(deductions.otherPenalty || 0);
                      const next = Math.max(0, Number((current - 0.10).toFixed(2)));
                      const newD = { ...deductions, otherPenalty: next };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("short_beep");
                    }}
                    className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-6 h-6 rounded flex items-center justify-center border border-cyan-800/60 cursor-pointer active:scale-95 text-xs font-mono"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={deductions.otherPenalty || 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      const newD = { ...deductions, otherPenalty: val };
                      saveSharedState({ deductions: newD });
                    }}
                    className="flex-1 w-full bg-[#040813] py-0.5 px-1 border border-[#162540] rounded text-center font-mono font-black text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const current = Number(deductions.otherPenalty || 0);
                      const next = Number((current + 0.10).toFixed(2));
                      const newD = { ...deductions, otherPenalty: next };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("warning_beep");
                    }}
                    className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-6 h-6 rounded flex items-center justify-center border border-cyan-800/60 cursor-pointer active:scale-95 text-xs font-mono"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Nilai Juri Bertugas Row with green highlighted median/trimmed elements - Compact */}
        <div className="px-4 py-0.5 grid grid-cols-1 xl:grid-cols-12 gap-2 z-10 shrink-0">
          
          {/* Card list of J1 to J10 sorted ascending */}
          <div className="xl:col-span-9 bg-[#070e1c] border border-[#162540] p-2.5 rounded-xl space-y-1 shadow-lg">
            <span className="text-[9px] text-zinc-400 font-mono font-black tracking-widest block uppercase">
              NILAI JURI BERTUGAS (URUTAN TERKECIL KE TERBESAR)
            </span>
            
            <div className={`grid gap-1.5 justify-center mx-auto ${
              judgesCount === 4 ? "grid-cols-4 max-w-md" :
              judgesCount === 6 ? "grid-cols-6 max-w-xl" :
              judgesCount === 8 ? "grid-cols-8 max-w-3xl" :
              judgesCount === 3 ? "grid-cols-3 max-w-sm" :
              judgesCount === 5 ? "grid-cols-5 max-w-lg" :
              "grid-cols-5 md:grid-cols-10"
            }`}>
              {(() => {
                const onDutyScores = juriScores.filter(js => js.id <= judgesCount);
                const judgeScoresWithId = onDutyScores.map(js => ({ id: js.id, val: getJudgeTotal(js) }));
                const sortedPairs = [...judgeScoresWithId].sort((a, b) => a.val - b.val);
                
                return sortedPairs.map((pair, index) => {
                  let isMedian = false;
                  if (judgesCount === 10) {
                    isMedian = index === 4 || index === 5;
                  } else if (judgesCount === 8) {
                    isMedian = index === 3 || index === 4;
                  } else if (judgesCount === 6) {
                    isMedian = index === 2 || index === 3;
                  } else if (judgesCount === 5) {
                    isMedian = index === 1 || index === 2 || index === 3;
                  } else if (judgesCount === 4) {
                    isMedian = index === 1 || index === 2;
                  } else if (judgesCount === 3) {
                    isMedian = true;
                  }
                  
                  return (
                    <div 
                      key={pair.id} 
                      className={`text-center py-1 px-0.5 rounded-lg border transition-all ${
                        isMedian
                          ? "bg-emerald-950/60 border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          : "bg-rose-950/30 border-rose-900/40 opacity-60 line-through"
                      }`}
                    >
                      <span className="text-[9px] text-zinc-400 font-mono block">J{pair.id}</span>
                      <span className={`text-xs font-black font-mono block mt-0.5 ${
                        isMedian ? "text-emerald-400 font-black" : "text-rose-400"
                      }`}>
                        {pair.val.toFixed(2)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Median Display Card */}
          <div className="xl:col-span-3 bg-[#070e1c] border-2 border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.15)] p-2.5 rounded-xl flex flex-col justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-amber-400/[0.04] to-transparent pointer-events-none" />
            <span className="text-[9px] text-amber-400 font-mono font-black tracking-widest uppercase">
              NILAI MEDIAN ({judgesCount} JURI)
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 mt-0.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
              {(() => {
                const activeScores = juriScores.filter(js => js.id <= judgesCount);
                const vals = activeScores.map(js => getJudgeTotal(js));
                if (vals.length === 0) return "0.000";
                const median = calculateMedian(vals);
                return median.toFixed(3);
              })()}
            </div>
          </div>
        </div>

        {/* IPSI 2026 & PERSILAT MATCH OUTCOME CARD - Compact */}
        {(() => {
          const outcome = getLiveMatchOutcome();
          const scoreB = getCalculatedScoreForCorner("biru");
          const scoreM = getCalculatedScoreForCorner("merah");
          const sdB = calculateStandardDeviation(juriScoresBiru);
          const sdM = calculateStandardDeviation(juriScoresMerah);
          const dedB = getDewanDeductionValueForCorner("biru");
          const dedM = getDewanDeductionValueForCorner("merah");

          return (
            <div className="px-4 pb-1.5 pt-0.5 z-10 w-full shrink-0 mt-auto">
              <div className="bg-[#070e1c] border-2 border-cyan-500/40 rounded-xl p-2.5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-2">
                
                {/* Biru Mini Summary */}
                <div className={`flex-1 w-full p-2 rounded-lg border transition-all ${
                  outcome.winnerCorner === "biru" 
                    ? "bg-blue-950/40 border-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                    : "bg-[#0b172a]/60 border-[#162540]"
                }`}>
                  <div className="flex justify-between items-center text-xs font-mono font-bold">
                    <span className="text-blue-400 font-black truncate">● SUDUT BIRU ({kontingenBiru || "BIRU"})</span>
                    <span className="text-amber-400 text-xs sm:text-sm font-black">{scoreB.toFixed(3)}</span>
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono mt-0.5 flex justify-between">
                    <span>SD: {sdB.toFixed(6)}</span>
                    <span className="text-rose-400">Denda: -{dedB.toFixed(2)}</span>
                  </div>
                </div>

                {/* Status Decision Center Badge */}
                <div className="flex flex-col items-center justify-center text-center px-2 shrink-0">
                  <span className="text-[8px] font-mono font-black text-cyan-300 uppercase tracking-widest bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.2 rounded-full">
                    KEPUTUSAN ATURAN IPSI 2026 &amp; PERSILAT
                  </span>
                  <div className="text-xs sm:text-sm font-black font-mono mt-0.5 uppercase tracking-wide">
                    {outcome.winnerCorner === "biru" && (
                      <span className="text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]">
                        🏆 PEMENANG: SUDUT BIRU
                      </span>
                    )}
                    {outcome.winnerCorner === "merah" && (
                      <span className="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]">
                        🏆 PEMENANG: SUDUT MERAH
                      </span>
                    )}
                    {!outcome.winnerCorner && (
                      <span className="text-amber-300">
                        ⚡ STANDBY HASIL PENAMPILAN
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-400 font-mono max-w-xs mt-0.5 leading-tight truncate">
                    {outcome.reason}
                  </p>
                </div>

                {/* Merah Mini Summary */}
                <div className={`flex-1 w-full p-2 rounded-lg border transition-all ${
                  outcome.winnerCorner === "merah" 
                    ? "bg-rose-950/40 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.2)]" 
                    : "bg-[#0b172a]/60 border-[#162540]"
                }`}>
                  <div className="flex justify-between items-center text-xs font-mono font-bold">
                    <span className="text-rose-400 font-black truncate">● SUDUT MERAH ({kontingenMerah || "MERAH"})</span>
                    <span className="text-amber-400 text-xs sm:text-sm font-black">{scoreM.toFixed(3)}</span>
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono mt-0.5 flex justify-between">
                    <span>SD: {sdM.toFixed(6)}</span>
                    <span className="text-rose-400">Denda: -{dedM.toFixed(2)}</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Deduction Inputs Modal Overlay */}
        {showDeductionsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#070e1c] border border-[#162540] rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <button 
                onClick={() => setShowDeductionsModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all font-bold text-lg"
              >
                ✕
              </button>
              
              <h3 className="text-lg font-black text-white uppercase tracking-wider border-b border-[#162540] pb-4 mb-6 flex items-center gap-2 font-mono">
                <AlertTriangle className="text-rose-400" size={18} /> INPUT HUKUMAN DEWAN JURI
              </h3>

              <div className="space-y-4">
                {/* 1. Timing Over/Under IPSI 2026 & PERSILAT */}
                <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-300 uppercase font-sans">Deviasi Batas Waktu Tampil</span>
                      <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                        Toleransi ±5 Detik Bebas Denda
                      </span>
                    </div>
                    <span className="text-xs font-mono text-rose-400 font-bold">-${(deductions.timeOverUnder * 0.01).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Sesuai Peraturan IPSI 2026 &amp; PERSILAT: Rentang aman <strong>{formatTime(Math.max(0, getDurasiSeconds(durasiTampil) - 5))} s/d {formatTime(getDurasiSeconds(durasiTampil) + 5)}</strong> ({getDurasiSeconds(durasiTampil) - 5}s - {getDurasiSeconds(durasiTampil) + 5}s) BEBAS DENDA. Deviasi di luar rentang dikenakan denda <strong>-0.01/detik</strong>.
                  </p>
                  
                  {/* T1 vs T2 Info Strip */}
                  <div className="grid grid-cols-2 gap-2 bg-[#081020] p-2.5 rounded-lg border border-[#162540] text-[10px] font-mono">
                    <div>
                      <span className="text-zinc-500 uppercase block text-[8px]">T1: TARGET RESMI</span>
                      <span className="text-amber-400 font-bold">{formatTime(getDurasiSeconds(durasiTampil))} ({getDurasiSeconds(durasiTampil)}s)</span>
                    </div>
                    <div className="border-l border-[#162540] pl-2.5">
                      <span className="text-zinc-500 uppercase block text-[8px]">T2: WAKTU NYATA (ACTUAL)</span>
                      <span className="text-cyan-400 font-bold">{formatTime(timeActual)} ({timeActual}s)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => {
                        const newD = { ...deductions, timeOverUnder: Math.max(0, deductions.timeOverUnder - 1) };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      -1s
                    </button>
                    <div className="flex-1 bg-[#040813] py-2 border border-[#162540] rounded-lg text-center font-mono font-bold text-xs text-white">
                      {deductions.timeOverUnder} DETIK DEVIASI KENA DENDA (-{(deductions.timeOverUnder * 0.01).toFixed(2)})
                    </div>
                    <button
                      onClick={() => {
                        const newD = { ...deductions, timeOverUnder: deductions.timeOverUnder + 1 };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      +1s
                    </button>
                  </div>

                  {/* Auto-calculate button with IPSI 2026 5s tolerance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => {
                        const target = getDurasiSeconds(durasiTampil);
                        const minSafe = target - 5;
                        const maxSafe = target + 5;
                        let diff = 0;
                        if (timeActual < minSafe) {
                          diff = minSafe - timeActual;
                        } else if (timeActual > maxSafe) {
                          diff = timeActual - maxSafe;
                        }
                        const newD = { ...deductions, timeOverUnder: diff };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("success_chime");
                      }}
                      className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 hover:text-white py-2 px-2 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer text-center"
                    >
                      ⚡ Hitung Otomatis IPSI 2026 (Toleransi 5s)
                    </button>
                    <button
                      onClick={() => {
                        const target = getDurasiSeconds(durasiTampil);
                        const diff = Math.abs(timeActual - target);
                        const newD = { ...deductions, timeOverUnder: diff };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] border border-zinc-700 text-zinc-300 hover:text-white py-2 px-2 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer text-center"
                    >
                      Hitung Deviasi Mutlak ({Math.abs(timeActual - getDurasiSeconds(durasiTampil))}s)
                    </button>
                  </div>
                </div>

                {/* 2. Weapon Drops */}
                <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300 uppercase">Senjata Jatuh / Lepas</span>
                    <span className="text-xs font-mono text-rose-400 font-bold">-${(deductions.weaponDrop * 0.50).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Hukuman -0.50 setiap kali senjata terlepas dari tangan.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => {
                        const newD = { ...deductions, weaponDrop: Math.max(0, deductions.weaponDrop - 1) };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-[#040813] py-2 border border-[#162540] rounded-lg text-center font-mono font-bold text-xs text-white">
                      {deductions.weaponDrop} KALI JATUH
                    </div>
                    <button
                      onClick={() => {
                        const newD = { ...deductions, weaponDrop: deductions.weaponDrop + 1 };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("warning_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Out of Bounds */}
                <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300 uppercase">Keluar Gelanggang</span>
                    <span className="text-xs font-mono text-rose-400 font-bold">-${(deductions.outOfBounds * 0.50).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Denda -0.50 jika atlet melangkah keluar garis arena.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => {
                        const newD = { ...deductions, outOfBounds: Math.max(0, deductions.outOfBounds - 1) };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-[#040813] py-2 border border-[#162540] rounded-lg text-center font-mono font-bold text-xs text-white">
                      {deductions.outOfBounds} KALI KELUAR
                    </div>
                    <button
                      onClick={() => {
                        const newD = { ...deductions, outOfBounds: deductions.outOfBounds + 1 };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. Costume Violation */}
                <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300 uppercase">Pelanggaran Pakaian</span>
                    <span className="text-xs font-mono text-rose-400 font-bold">-${(deductions.costumeMistake ? 0.50 : 0).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Denda flat -0.50 jika aksesoris jatuh atau tidak lengkap.</p>
                  <button
                    onClick={() => {
                      const newD = { ...deductions, costumeMistake: !deductions.costumeMistake };
                      saveSharedState({ deductions: newD });
                      playSoundByKey(deductions.costumeMistake ? "short_beep" : "warning_beep");
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-bold border transition-all flex justify-center items-center gap-2 cursor-pointer ${
                      deductions.costumeMistake 
                        ? "bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse" 
                        : "bg-[#0b172a] border-[#162540] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {deductions.costumeMistake ? <CheckSquare size={14} /> : <Square size={14} />}
                    {deductions.costumeMistake ? "TERKENA DENDA (-0.50)" : "TIDAK ADA PELANGGARAN"}
                  </button>
                </div>

                {/* 5. Other Penalty */}
                <div className="space-y-2">
                  <label className="text-[11px] text-zinc-400 font-mono font-bold uppercase">Hukuman Lainnya Dewan Juri</label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      step="0.10"
                      value={deductions.otherPenalty || ""}
                      onChange={(e) => {
                        const newD = { ...deductions, otherPenalty: Number(e.target.value) };
                        saveSharedState({ deductions: newD });
                      }}
                      className="bg-[#050b16] border border-[#162540] rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 w-32"
                      placeholder="Ex: -0.10"
                    />
                    <p className="text-[10px] text-zinc-500 leading-normal flex-1">
                      Gunakan input ini jika terdapat hukuman kustom dewan lainnya yang tidak tercantum di atas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#162540] flex justify-end">
                <button
                  onClick={() => setShowDeductionsModal(false)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-6 py-2.5 rounded-full transition-all cursor-pointer font-mono"
                >
                  Selesai &amp; Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISK - UD Special Status Modal Overlay */}
        {showDiskUDModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#070e1c] border border-rose-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl relative animate-scale-up">
              <button 
                onClick={() => setShowDiskUDModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all font-bold text-lg"
              >
                ✕
              </button>
              
              <div className="text-center space-y-4">
                <span className="bg-rose-950 text-rose-400 border border-rose-900 text-[10px] font-mono px-3.5 py-1 rounded-full uppercase tracking-wider font-bold">
                  DEWAN JURI OVERLAY
                </span>
                
                <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono">
                  STATUS KHUSUS ATLET
                </h3>

                <div className={`p-4 rounded-xl border text-center ${
                  activeCorner === "biru" 
                    ? "bg-blue-950/30 border-blue-500/40 text-blue-200" 
                    : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                }`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest block font-bold">
                    SUDUT YANG SEDANG AKTIF
                  </span>
                  <p className="text-lg font-black mt-1 uppercase font-mono">
                    {activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"}
                  </p>
                  <p className="text-base font-extrabold text-white mt-2 font-mono">
                    {activeCorner === "biru" ? namaAtlitBiru : namaAtlitMerah}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 font-mono uppercase">
                    KONTINGEN: {activeCorner === "biru" ? kontingenBiru : kontingenMerah}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <button
                    onClick={() => {
                      playSoundByKey("buzzer");
                      if (activeCorner === "biru") {
                        saveSharedState({ disqualifiedBiru: true, undurDiriBiru: false });
                      } else {
                        saveSharedState({ disqualifiedMerah: true, undurDiriMerah: false });
                      }
                      const updatedLogs = [
                        { time: formatTime(timeRemaining), msg: `DEWAN JURI MENGDISKUALIFIKASI ${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"} (${activeCorner === "biru" ? namaAtlitBiru : namaAtlitMerah})`, type: "deduction" as const },
                        ...logs
                      ];
                      saveSharedState({ logs: updatedLogs });
                      setShowDiskUDModal(false);
                      alert(`${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"} TELAH DIDISKUALIFIKASI.`);
                    }}
                    className={`py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer font-mono ${
                      (activeCorner === "biru" ? disqualifiedBiru : disqualifiedMerah)
                        ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-rose-500"
                        : "bg-rose-950/40 text-rose-400 border border-rose-900/60 hover:bg-rose-900/60"
                    }`}
                  >
                    ⚡ DISKUALIFIKASI
                  </button>

                  <button
                    onClick={() => {
                      playSoundByKey("warning_beep");
                      if (activeCorner === "biru") {
                        saveSharedState({ undurDiriBiru: true, disqualifiedBiru: false });
                      } else {
                        saveSharedState({ undurDiriMerah: true, disqualifiedMerah: false });
                      }
                      const updatedLogs = [
                        { time: formatTime(timeRemaining), msg: `DEWAN JURI MENYATAKAN ${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"} UNDUR DIRI (WALKOVER)`, type: "system" as const },
                        ...logs
                      ];
                      saveSharedState({ logs: updatedLogs });
                      setShowDiskUDModal(false);
                      alert(`${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"} MENYATAKAN UNDUR DIRI.`);
                    }}
                    className={`py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer font-mono ${
                      (activeCorner === "biru" ? undurDiriBiru : undurDiriMerah)
                        ? "bg-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-amber-500"
                        : "bg-amber-950/40 text-amber-400 border border-amber-900/60 hover:bg-amber-900/60"
                    }`}
                  >
                    🏳 UNDUR DIRI (WD)
                  </button>

                  <button
                    onClick={() => {
                      playSoundByKey("success_chime");
                      if (activeCorner === "biru") {
                        saveSharedState({ disqualifiedBiru: false, undurDiriBiru: false });
                      } else {
                        saveSharedState({ disqualifiedMerah: false, undurDiriMerah: false });
                      }
                      const updatedLogs = [
                        { time: formatTime(timeRemaining), msg: `DEWAN JURI MENGEMBALIKAN STATUS NORMAL UNTUK ${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"}`, type: "system" as const },
                        ...logs
                      ];
                      saveSharedState({ logs: updatedLogs });
                      setShowDiskUDModal(false);
                    }}
                    className="py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest bg-[#0b172a] border border-[#162540] text-zinc-300 hover:text-white transition-all cursor-pointer font-mono"
                  >
                    ✓ KEMBALI NORMAL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Logs Overlay Modal */}
        {showLogsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#070e1c] border border-[#162540] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
              <button 
                onClick={() => setShowLogsModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all font-bold text-lg"
              >
                ✕
              </button>
              
              <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-[#162540] pb-3 mb-4 font-mono">
                LOG AKTIVITAS PERTANDINGAN
              </h3>

              <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] h-[300px] overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-[#162540]">
                {logs.map((log, idx) => (
                  <div key={idx} className="text-[11px] font-mono flex items-start gap-2.5 leading-normal">
                    <span className="text-cyan-400 font-bold">[{log.time}]</span>
                    <span className={log.type === "deduction" ? "text-rose-400" : log.type === "score" ? "text-emerald-400" : "text-zinc-300"}>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-[#162540] flex justify-end">
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-6 py-2.5 rounded-full transition-all cursor-pointer font-mono"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // 4. ROLE: JURI VIEW (Input Scoring Plate for Judges - JRZ SCORE TGR)
  if (role === "juri") {
    const isBiru = activeCorner === "biru" || activeCorner === "" || !activeCorner;
    const currentContingent = isBiru ? (kontingenBiru || "SINGAPORE") : (kontingenMerah || "INDONESIA");
    const currentAthleteName = isBiru ? (namaAtlitBiru || "ATLIT BIRU") : (namaAtlitMerah || "ATLIT MERAH");

    const currentScoreList = isBiru ? juriScoresBiru : juriScoresMerah;
    const js = currentScoreList.find(j => j.id === localJuriId) || { 
      id: localJuriId, 
      kebenaran: 9.90, 
      kemantapan: 0.00, 
      wrongMoves: 0, 
      flowScore: 0.00, 
      submitted: false 
    };

    const isCreativeOrGanda = selectedCategory === "ganda" || selectedCategory === "solo_kreatif";

    // Component scores for Ganda & Solo Kreatif (each 0.00 to 0.30, base 9.10, max 10.00)
    const comp1 = js.kebenaran !== undefined ? (js.kebenaran <= 1.0 ? js.kebenaran : 0.00) : 0.00;
    const comp2 = js.kemantapan !== undefined ? (js.kemantapan <= 1.0 ? js.kemantapan : 0.00) : 0.00;
    const comp3 = (js.penjiwaan !== undefined ? js.penjiwaan : (js.keserasian ?? 0)) <= 1.0 
      ? (js.penjiwaan !== undefined ? js.penjiwaan : (js.keserasian ?? 0)) 
      : 0.00;
    const creativeSum = Number((comp1 + comp2 + comp3).toFixed(2));

    // Accuracy & Flow for Tunggal & Regu (Base 9.90, -0.01/mistake, Flow 0.01-0.10, max 10.00)
    const wrongMoves = js.wrongMoves !== undefined ? js.wrongMoves : Math.max(0, Math.round((9.90 - js.kebenaran) * 100));
    const accuracyScore = Math.max(0, Number((9.90 - wrongMoves * 0.01).toFixed(2)));
    const flowScore = js.flowScore !== undefined ? js.flowScore : (js.kemantapan <= 0.10 ? js.kemantapan : 0.00);
    const totalScore = js.submitted ? getJudgeTotal(js) : getInitialDefaultScore();

    const updateScoreListForCurrentJudge = (updater: (prev: JuriScore) => JuriScore) => {
      const updatedList = (isBiru ? juriScoresBiru : juriScoresMerah).map(score => {
        if (score.id === localJuriId) {
          return updater(score);
        }
        return score;
      });

      if (isBiru) {
        setJuriScoresBiru(updatedList);
        setJuriScores(updatedList);
        saveSharedState({ juriScoresBiru: updatedList, juriScores: updatedList });
      } else {
        setJuriScoresMerah(updatedList);
        setJuriScores(updatedList);
        saveSharedState({ juriScoresMerah: updatedList, juriScores: updatedList });
      }
    };

    const handleComponentSet = (compIndex: 1 | 2 | 3, val: number) => {
      playSoundByKey("short_beep");
      const clamped = Math.min(0.30, Math.max(0, Number(val.toFixed(2))));
      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        kebenaran: compIndex === 1 ? clamped : (prev.kebenaran <= 1.0 ? prev.kebenaran : 0),
        kemantapan: compIndex === 2 ? clamped : (prev.kemantapan <= 1.0 ? prev.kemantapan : 0),
        penjiwaan: compIndex === 3 ? clamped : (prev.penjiwaan !== undefined ? prev.penjiwaan : (prev.keserasian ?? 0)),
        keserasian: compIndex === 3 ? clamped : (prev.keserasian ?? 0),
      }));
    };

    const handleComponentDelta = (compIndex: 1 | 2 | 3, delta: number) => {
      playSoundByKey("short_beep");
      updateScoreListForCurrentJudge(prev => {
        const cur1 = prev.kebenaran <= 1.0 ? (prev.kebenaran ?? 0) : 0;
        const cur2 = prev.kemantapan <= 1.0 ? (prev.kemantapan ?? 0) : 0;
        const cur3 = (prev.penjiwaan !== undefined ? prev.penjiwaan : (prev.keserasian ?? 0)) <= 1.0 
          ? (prev.penjiwaan !== undefined ? prev.penjiwaan : (prev.keserasian ?? 0)) 
          : 0;

        return {
          ...prev,
          kebenaran: compIndex === 1 ? Math.min(0.30, Math.max(0, Number((cur1 + delta).toFixed(2)))) : cur1,
          kemantapan: compIndex === 2 ? Math.min(0.30, Math.max(0, Number((cur2 + delta).toFixed(2)))) : cur2,
          penjiwaan: compIndex === 3 ? Math.min(0.30, Math.max(0, Number((cur3 + delta).toFixed(2)))) : cur3,
          keserasian: compIndex === 3 ? Math.min(0.30, Math.max(0, Number((cur3 + delta).toFixed(2)))) : cur3,
        };
      });
    };

    const handleWrongMove = () => {
      const nextWrong = wrongMoves + 1;
      const nextAcc = Math.max(0, Number((9.90 - nextWrong * 0.01).toFixed(2)));
      playSoundByKey("short_beep");

      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        wrongMoves: nextWrong,
        kebenaran: nextAcc,
        flowScore: flowScore,
        kemantapan: flowScore
      }));
    };

    const handleBackspace = () => {
      if (wrongMoves <= 0) return;
      const nextWrong = wrongMoves - 1;
      const nextAcc = Math.max(0, Number((9.90 - nextWrong * 0.01).toFixed(2)));
      playSoundByKey("short_beep");

      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        wrongMoves: nextWrong,
        kebenaran: nextAcc,
        flowScore: flowScore,
        kemantapan: flowScore
      }));
    };

    const handleFlowSelect = (val: number) => {
      const nextFlow = flowScore === val ? 0.00 : val;
      playSoundByKey("short_beep");

      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        flowScore: nextFlow,
        kemantapan: nextFlow,
        kebenaran: accuracyScore,
        wrongMoves: wrongMoves
      }));
    };

    const handleReadySubmit = () => {
      playSoundByKey("success_chime");
      const nextSubmitted = !js.submitted;

      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        submitted: nextSubmitted
      }));

      const cornerLabel = isBiru ? "SUDUT BIRU" : "SUDUT MERAH";
      const logType: "score" | "system" = nextSubmitted ? "score" : "system";
      const updatedLogs = [
        { 
          time: formatTime(timeRemaining), 
          msg: `JURI ${localJuriId} (${cornerLabel}): Skor ${totalScore.toFixed(2)} ${nextSubmitted ? 'TERKIRIM (READY)' : 'DITARIK / DIEDIT'}`, 
          type: logType
        },
        ...logs
      ];
      saveSharedState({ logs: updatedLogs });
    };

    const resetToReadyDefault = () => {
      playSoundByKey("success_chime");
      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        wrongMoves: 0,
        kebenaran: isCreativeOrGanda ? 0.00 : 9.90,
        flowScore: 0.00,
        kemantapan: 0.00,
        penjiwaan: 0.00,
        keserasian: 0.00,
        submitted: false
      }));
    };

    const categoryDisplayName = 
      selectedCategory === "tunggal" ? "TUNGGAL BAKU (IPSI/PERSILAT)" :
      selectedCategory === "ganda" ? "GANDA KREATIF (IPSI/PERSILAT)" :
      selectedCategory === "regu" ? "REGU BAKU (IPSI/PERSILAT)" : "SOLO KREATIF SENJATA (IPSI/PERSILAT)";

    const subheaderTitle = 
      selectedCategory === "tunggal" ? "JURUS TUNGGAL FULL (100 GERAKAN - 3 MENIT)" :
      selectedCategory === "regu" ? "JURUS REGU BAKU SINKRON (12 JURUS - 3 MENIT)" :
      selectedCategory === "ganda" ? "PENILAIAN GANDA: SERANG BELA, HARMONI, PENJIWAAN (3 MENIT)" : 
      "PENILAIAN SOLO KREATIF: TEKNIK SENJATA, STAMINA, KOREOGRAFI (3 MENIT)";

    // Component labels for Ganda vs Solo Kreatif
    const compLabels = selectedCategory === "ganda" ? {
      c1: "1. TEKNIK SERANG BELA",
      c1Desc: "Kualitas teknik serang tangkis, kuncian & beladiri (0.01 - 0.30)",
      c2: "2. KEMANTAPAN & HARMONI",
      c2Desc: "Kekompakan, kestabilan & keserasian pasangan (0.01 - 0.30)",
      c3: "3. PENJIWAAN & EKSPRESI",
      c3Desc: "Penghayatan karakter, dinamika & kreativitas (0.01 - 0.30)"
    } : {
      c1: "1. KUALITAS SILAT & SENJATA KHAS",
      c1Desc: "Kemahiran penguasaan senjata tradisional & kaedah silat (0.01 - 0.30)",
      c2: "2. KEMANTAPAN & STAMINA GERAK",
      c2Desc: "Kestabilan kuda-kuda, tenaga & kelincahan ritme gerak (0.01 - 0.30)",
      c3: "3. KOREOGRAFI & KESELARASAN MUSIK",
      c3Desc: "Harmonisasi iringan musik, artistik & penjiwaan (0.01 - 0.30)"
    };

    return (
      <div className="min-h-screen bg-[#040813] text-white flex flex-col justify-between select-none font-sans overflow-x-hidden">
        
        {/* TOP HEADER BAR */}
        <header className="bg-[#070e1c] border-b border-[#162540] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 z-20 shadow-lg">
          
          {/* Athlete and Contingent (Left) */}
          <div className="flex flex-col">
            <span className="text-[11px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider leading-tight font-mono">
              {currentContingent}
            </span>
            <span className="text-sm sm:text-lg font-black text-white uppercase tracking-wide leading-tight mt-0.5 font-mono">
              {currentAthleteName}
            </span>
          </div>

          {/* Active Performer Corner Indicator (Read-Only: Terhubung Otomatis ke Sekretaris & Timer) */}
          <div 
            className="flex items-center bg-[#050b16] p-1 rounded-xl border border-[#162540] shadow-inner select-none cursor-default"
            title="Sudut aktif penampil dikendalikan secara otomatis oleh Sekretaris & Operator Timer"
          >
            <div
              className={`px-3.5 sm:px-6 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all ${
                isBiru 
                  ? "bg-[#1e61ff] text-white shadow-md shadow-blue-900/60 ring-1 ring-blue-400" 
                  : "text-zinc-600 opacity-30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isBiru ? "bg-white shadow-sm animate-pulse" : "bg-zinc-700"}`} />
              <span>SUDUT BIRU</span>
            </div>
            <div
              className={`px-3.5 sm:px-6 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all ${
                !isBiru 
                  ? "bg-[#e11d48] text-white shadow-md shadow-rose-900/60 ring-1 ring-rose-400" 
                  : "text-zinc-600 opacity-30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!isBiru ? "bg-white shadow-sm animate-pulse" : "bg-zinc-700"}`} />
              <span>SUDUT MERAH</span>
            </div>
          </div>

          {/* Arena, Match & Category (Right) */}
          <div className="flex flex-col text-right">
            <span className="text-[10px] sm:text-xs font-mono font-medium text-zinc-400 uppercase tracking-tight">
              GELANGGANG 1, PARTAI {cleanPartaiNumber(partaiTanding)}
            </span>
            <span className="text-xs sm:text-base font-black text-amber-400 uppercase tracking-wider leading-tight mt-0.5 font-mono">
              {categoryDisplayName}
            </span>
          </div>
        </header>

        {/* SUB-HEADER BANNER & MATCH STATUS STRIP */}
        <div className="bg-[#050b16] border-b border-[#162540] px-4 sm:px-8 py-2 flex items-center justify-between">
          <div className="min-w-[60px] flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase hidden sm:inline font-bold">SALAH:</span>
            <span className="text-xl sm:text-2xl font-mono font-black text-amber-400 leading-none">
              {wrongMoves}
            </span>
          </div>

          <div className="text-center flex-1">
            <span className="text-xs sm:text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">
              {subheaderTitle}
            </span>
          </div>

          <div className="min-w-[60px] text-right flex items-center justify-end gap-2">
            <span className={`text-xs sm:text-sm font-mono font-black tracking-widest uppercase ${
              isMatchUnlocked ? "text-emerald-400" : "text-rose-400"
            }`}>
              {isMatchUnlocked ? "UNLOCKED" : "LOCKED"}
            </span>

            {/* Permanent Locked Judge Identity Badge */}
            <div 
              className="bg-[#071326] border border-cyan-500/50 text-cyan-300 font-mono font-black text-[11px] sm:text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm select-none"
              title={`Identitas Juri ${localJuriId} terkunci pada perangkat ini`}
            >
              <Lock size={12} className="text-cyan-400" />
              <span>JURI {localJuriId}</span>
            </div>
          </div>
        </div>

        {/* STANDBY / READY MODE BANNER */}
        {js.submitted && (
          <div className="bg-emerald-950/40 border-b border-emerald-500/40 px-4 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-wider">
                NILAI TERKIRIM KE SERVER ({totalScore.toFixed(2)}) — STANDBY SIAP PENILAIAN BERIKUTNYA
              </span>
            </div>
            <button
              onClick={resetToReadyDefault}
              className="bg-emerald-800/80 hover:bg-emerald-700 text-white text-[10px] font-mono font-bold px-3 py-0.5 rounded border border-emerald-400 cursor-pointer uppercase transition-all"
            >
              MODE SIAP PENILAIAN
            </button>
          </div>
        )}

        {/* MAIN TOUCH SCREEN */}
        {isCreativeOrGanda ? (
          <main className="flex-1 px-3 sm:px-6 py-3 sm:py-4 flex flex-col justify-between max-w-7xl mx-auto w-full gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              
              {/* COMPONENT 1 CARD */}
              <div className="bg-[#070e1c] border-2 border-cyan-500/50 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between border-b border-[#162540] pb-2">
                    <span className="text-xs sm:text-sm font-black font-mono text-cyan-300 uppercase tracking-wider">{compLabels.c1}</span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-cyan-400">+{comp1.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans mt-1.5 leading-snug">{compLabels.c1Desc}</p>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="grid grid-cols-6 gap-1">
                    {[0.05, 0.10, 0.15, 0.20, 0.25, 0.30].map(v => (
                      <button
                        key={v}
                        onClick={() => handleComponentSet(1, v)}
                        className={`py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                          Math.abs(comp1 - v) < 0.001 
                            ? "bg-cyan-500 text-black shadow-md scale-105" 
                            : "bg-[#0b172a] hover:bg-[#122442] text-zinc-300 border border-[#162540]"
                        }`}
                      >
                        {v.toFixed(2)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleComponentDelta(1, -0.01)}
                      className="flex-1 bg-[#0b172a] hover:bg-[#122442] text-rose-400 font-mono font-black py-2 rounded-lg border border-rose-900/60 active:scale-95 cursor-pointer text-xs"
                    >
                      - 0.01
                    </button>
                    <button
                      onClick={() => handleComponentDelta(1, +0.01)}
                      className="flex-1 bg-[#0b172a] hover:bg-[#122442] text-emerald-400 font-mono font-black py-2 rounded-lg border border-emerald-900/60 active:scale-95 cursor-pointer text-xs"
                    >
                      + 0.01
                    </button>
                  </div>
                </div>
              </div>

              {/* COMPONENT 2 CARD */}
              <div className="bg-[#070e1c] border-2 border-amber-500/50 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between border-b border-[#162540] pb-2">
                    <span className="text-xs sm:text-sm font-black font-mono text-amber-300 uppercase tracking-wider">{compLabels.c2}</span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-amber-400">+{comp2.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans mt-1.5 leading-snug">{compLabels.c2Desc}</p>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="grid grid-cols-6 gap-1">
                    {[0.05, 0.10, 0.15, 0.20, 0.25, 0.30].map(v => (
                      <button
                        key={v}
                        onClick={() => handleComponentSet(2, v)}
                        className={`py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                          Math.abs(comp2 - v) < 0.001 
                            ? "bg-amber-500 text-black shadow-md scale-105" 
                            : "bg-[#0b172a] hover:bg-[#122442] text-zinc-300 border border-[#162540]"
                        }`}
                      >
                        {v.toFixed(2)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleComponentDelta(2, -0.01)}
                      className="flex-1 bg-[#0b172a] hover:bg-[#122442] text-rose-400 font-mono font-black py-2 rounded-lg border border-rose-900/60 active:scale-95 cursor-pointer text-xs"
                    >
                      - 0.01
                    </button>
                    <button
                      onClick={() => handleComponentDelta(2, +0.01)}
                      className="flex-1 bg-[#0b172a] hover:bg-[#122442] text-emerald-400 font-mono font-black py-2 rounded-lg border border-emerald-900/60 active:scale-95 cursor-pointer text-xs"
                    >
                      + 0.01
                    </button>
                  </div>
                </div>
              </div>

              {/* COMPONENT 3 CARD */}
              <div className="bg-[#070e1c] border-2 border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between border-b border-[#162540] pb-2">
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-300 uppercase tracking-wider">{compLabels.c3}</span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400">+{comp3.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans mt-1.5 leading-snug">{compLabels.c3Desc}</p>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="grid grid-cols-6 gap-1">
                    {[0.05, 0.10, 0.15, 0.20, 0.25, 0.30].map(v => (
                      <button
                        key={v}
                        onClick={() => handleComponentSet(3, v)}
                        className={`py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                          Math.abs(comp3 - v) < 0.001 
                            ? "bg-emerald-500 text-black shadow-md scale-105" 
                            : "bg-[#0b172a] hover:bg-[#122442] text-zinc-300 border border-[#162540]"
                        }`}
                      >
                        {v.toFixed(2)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleComponentDelta(3, -0.01)}
                      className="flex-1 bg-[#0b172a] hover:bg-[#122442] text-rose-400 font-mono font-black py-2 rounded-lg border border-rose-900/60 active:scale-95 cursor-pointer text-xs"
                    >
                      - 0.01
                    </button>
                    <button
                      onClick={() => handleComponentDelta(3, +0.01)}
                      className="flex-1 bg-[#0b172a] hover:bg-[#122442] text-emerald-400 font-mono font-black py-2 rounded-lg border border-emerald-900/60 active:scale-95 cursor-pointer text-xs"
                    >
                      + 0.01
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* BIG READY BUTTON FOR GANDA / SOLO KREATIF */}
            <div 
              onClick={handleReadySubmit}
              className={`w-full py-4 rounded-2xl flex items-center justify-center cursor-pointer transition-all border-2 shadow-2xl active:scale-[0.99] select-none ${
                js.submitted
                  ? "bg-emerald-950/70 border-emerald-400 text-emerald-200"
                  : "bg-cyan-950/70 hover:bg-cyan-900/80 border-cyan-400 text-white"
              }`}
            >
              <span className="text-lg sm:text-xl font-black font-mono tracking-widest uppercase">
                {js.submitted ? `✓ NILAI JURI ${localJuriId} TERKIRIM (${totalScore.toFixed(2)})` : `⚡ KIRIM NILAI JURI ${localJuriId} KE DEWAN (READY)`}
              </span>
            </div>
          </main>
        ) : (
          /* MAIN 3-COLUMN TOUCH SCREEN FOR TUNGGAL / REGU */
          <main className="flex-1 px-3 sm:px-6 py-3 sm:py-4 grid grid-cols-12 gap-3 sm:gap-5 items-stretch min-h-[300px] sm:min-h-[380px] max-w-7xl mx-auto w-full">
            
            {/* LEFT TOUCH AREA: WRONG MOVE */}
            <div 
              onClick={handleWrongMove}
              className="col-span-5 bg-[#070e1c] hover:bg-[#0b172a] active:scale-[0.985] border-2 border-[#162540] hover:border-cyan-500/60 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xl p-4 select-none group"
              title="Tekan untuk Menambahkan Kesalahan Gerak (-0.01)"
            >
              <span className="text-base sm:text-xl md:text-2xl font-black text-slate-300 group-hover:text-cyan-300 uppercase tracking-widest text-center transition-colors font-mono">
                WRONG MOVE
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-2 block sm:hidden">
                Tap (-0.01)
              </span>
            </div>

            {/* CENTER AREA: JRZ SCORE TGR EMBLEM LOGO */}
            <div className="col-span-2 flex flex-col items-center justify-center relative select-none py-2">
              
              {/* JRZ SCORE TGR Vector Shield Crest */}
              <div className="relative flex flex-col items-center justify-center filter drop-shadow-[0_0_18px_rgba(0,229,255,0.3)]">
                <svg 
                  viewBox="0 0 200 200" 
                  className="w-24 sm:w-32 md:w-40 h-24 sm:h-32 md:h-40 transition-transform duration-300"
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer Wing Accents Red & Cyan */}
                  <polygon points="100,10 175,45 190,110 160,165 100,195 40,165 10,110 25,45" fill="#070e1c" stroke="#00e5ff" strokeWidth="2.5" />
                  <polygon points="100,18 168,50 180,108 152,158 100,186 48,158 20,108 32,50" fill="#040813" />
                  
                  {/* Right Red Wing Gradient */}
                  <path d="M100 20 L165 50 L140 100 L100 70 Z" fill="url(#redWingGrad)" />
                  {/* Left Cyan Wing Gradient */}
                  <path d="M100 20 L35 50 L60 100 L100 70 Z" fill="url(#cyanWingGrad)" />
                  
                  {/* Inner Silhouette / Mask Headgear */}
                  <path d="M100 35 L125 70 L115 110 L100 120 L85 110 L75 70 Z" fill="#0b172a" stroke="#38bdf8" strokeWidth="2" />
                  <polygon points="100,45 118,72 100,85 82,72" fill="#070e1c" stroke="#ef4444" strokeWidth="1.5" />
                  
                  {/* Eye Slits Glow */}
                  <line x1="88" y1="75" x2="96" y2="78" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" />
                  <line x1="112" y1="75" x2="104" y2="78" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" />

                  {/* Martial Arms Graphic */}
                  <path d="M50 115 L80 105 L100 120 L120 105 L150 115 L135 140 L100 130 L65 140 Z" fill="#070e1c" stroke="#00e5ff" strokeWidth="1.5" />

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="redWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#881337" />
                    </linearGradient>
                    <linearGradient id="cyanWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00e5ff" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* JRZ SCORE TGR Metallic Typography Banner */}
                <div className="mt-[-28px] sm:mt-[-35px] flex flex-col items-center z-10">
                  <div className="bg-gradient-to-b from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent text-sm sm:text-base md:text-lg font-black tracking-wider uppercase font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    JRZ SCORE TGR
                  </div>
                  <div className="bg-[#070e1c] border border-cyan-500/50 px-2.5 py-0.5 rounded-full mt-0.5 shadow-md">
                    <span className="text-[7px] sm:text-[8px] font-mono font-black text-cyan-300 uppercase tracking-tight whitespace-nowrap block">
                      IPSI 2026 &amp; PERSILAT
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Judge Badge */}
              <div className="mt-3 bg-[#070e1c] border border-[#162540] px-3 py-1 rounded-md flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                  JURI {localJuriId}
                </span>
              </div>
            </div>

            {/* RIGHT TOUCH AREA: READY */}
            <div 
              onClick={handleReadySubmit}
              className={`col-span-5 active:scale-[0.985] border-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xl p-4 select-none ${
                js.submitted 
                  ? "bg-emerald-950/60 border-emerald-400/80 text-white shadow-emerald-900/60" 
                  : "bg-cyan-950/60 hover:bg-cyan-900/70 border-cyan-500/60 text-white shadow-cyan-950/80"
              }`}
              title="Tekan untuk Menandai Status Ready / Kirim Nilai"
            >
              <span className="text-base sm:text-xl md:text-2xl font-black text-white uppercase tracking-widest text-center drop-shadow-md font-mono">
                {js.submitted ? "SUBMITTED" : "READY"}
              </span>
              {js.submitted && (
                <span className="text-[10px] font-mono text-emerald-300 mt-1 font-bold">
                  ✓ Nilai Terkirim ({totalScore.toFixed(2)})
                </span>
              )}
            </div>

          </main>
        )}

        {/* BOTTOM CONTROLS & SCORING BAR */}
        <footer className="bg-[#040813] border-t-2 border-[#162540] px-3 sm:px-6 py-2.5 space-y-2 z-20 shadow-2xl">
          
          {isCreativeOrGanda ? (
            /* ROW 1 FOR GANDA / SOLO KREATIF: BREAKDOWN */
            <div className="flex items-center justify-between gap-3 border-b border-[#162540] pb-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 uppercase">KOMPONEN:</span>
                <span className="text-cyan-400 font-bold">+{creativeSum.toFixed(2)}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-400 uppercase">NILAI DASAR:</span>
                <span className="text-amber-400 font-bold">9.10</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-400 uppercase mr-2">MAKSIMAL:</span>
                <span className="text-emerald-400 font-bold">10.00</span>
              </div>
            </div>
          ) : (
            /* ROW 1 & 2 FOR TUNGGAL / REGU */
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[#162540] pb-2">
                {/* Backspace Button */}
                <button
                  onClick={handleBackspace}
                  disabled={wrongMoves <= 0}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
                    wrongMoves > 0 
                      ? "bg-[#070e1c] hover:bg-[#0b172a] text-amber-400 hover:text-amber-300 border-[#162540] cursor-pointer active:scale-95 shadow" 
                      : "bg-[#050b16] text-zinc-600 border-[#162540] cursor-not-allowed opacity-60"
                  }`}
                  title="Hapus Kesalahan Terakhir (+0.01)"
                >
                  <span className="text-sm">⌫</span>
                  <span>BACKSPACE</span>
                </button>

                {/* Accuracy Total Score Label */}
                <div className="text-center flex-1">
                  <span className="text-xs sm:text-sm font-mono font-bold text-zinc-300 uppercase tracking-widest">
                    ACCURACY TOTAL SCORE
                  </span>
                </div>

                {/* Accuracy Total Score Value */}
                <div className="min-w-[80px] text-right">
                  <span className="text-xl sm:text-2xl font-mono font-black text-cyan-400 leading-none">
                    {accuracyScore.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* FLOW OF MOVEMENT / STAMINA (0.01 - 0.10) */}
              <div className="space-y-1 border-b border-[#162540] pb-2">
                <div className="text-center">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
                    FLOW OF MOVEMENT / STAMINA (range score : 0.01 - 0.10)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-10 gap-1 sm:gap-1.5 flex-1">
                    {[0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10].map(val => {
                      const isSelected = Math.abs(flowScore - val) < 0.001;
                      return (
                        <button
                          key={val}
                          onClick={() => handleFlowSelect(val)}
                          className={`py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer border ${
                            isSelected 
                              ? "bg-cyan-600 border-cyan-400 text-white font-black shadow-md shadow-cyan-900/60 scale-105" 
                              : "bg-[#070e1c] hover:bg-[#0b172a] text-zinc-300 hover:text-white border-[#162540]"
                          }`}
                        >
                          {val.toFixed(2)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Flow Value */}
                  <div className="min-w-[80px] text-right pl-2">
                    <span className="text-lg sm:text-xl font-mono font-black text-cyan-400 leading-none">
                      {flowScore.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TOTAL SCORE ROW */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="w-[120px] flex items-center gap-2">
              <button
                onClick={resetToReadyDefault}
                className="text-[10px] font-mono text-zinc-400 hover:text-cyan-300 uppercase underline cursor-pointer"
                title="Reset lembar ke tampilan default IPSI 2026 & PERSILAT"
              >
                Reset Default
              </button>
            </div>

            <div className="text-center flex-1">
              <span className="text-xs sm:text-sm font-mono font-black text-amber-400 uppercase tracking-widest">
                TOTAL SCORE JURI {localJuriId}
              </span>
            </div>

            <div className="min-w-[80px] text-right">
              <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400 leading-none">
                {totalScore.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ROW 4: FOOTER BOTTOM INFO */}
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-[#162540]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setRole(null); playSoundByKey("short_beep"); }}
                className="hover:text-cyan-300 transition-colors cursor-pointer"
              >
                ← KEMBALI KE MENU PERAN
              </button>
              <span>•</span>
              <button
                onClick={toggleFullScreen}
                className="hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {isFs ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            </div>

            <div className="uppercase tracking-wider font-semibold text-cyan-400/70">
              JRZ SCORE TGR - Versi 3.0 (IPSI 2026 &amp; PERSILAT)
            </div>
          </div>

        </footer>

      </div>
    );
  }

  // 5. ROLE: TIMER OPERATOR VIEW (Dedicated Timekeeper & Arena Stopwatch Console)
  if (role === "timer") {
    return (
      <TimerOperatorView
        timeRemaining={timeRemaining}
        timeActual={timeActual}
        isTimer1Running={isTimer1Running}
        isTimer2Running={isTimer2Running}
        isTimerRunning={isTimerRunning}
        timer1StartedAt={timer1StartedAt}
        timer2StartedAt={timer2StartedAt}
        timer1BaseRemaining={timer1BaseRemaining}
        timer2BaseActual={timer2BaseActual}
        durasiTampil={durasiTampil}
        selectedCategory={selectedCategory}
        selectedAge={selectedAge}
        gender={gender}
        activeCorner={activeCorner}
        namaAtlitBiru={namaAtlitBiru}
        kontingenBiru={kontingenBiru}
        namaAtlitMerah={namaAtlitMerah}
        kontingenMerah={kontingenMerah}
        partaiTanding={partaiTanding}
        tahapPertandingan={tahapPertandingan}
        namaEvent={namaEvent}
        tempatPelaksanaan={tempatPelaksanaan}
        waktuPelaksanaan={waktuPelaksanaan}
        isMatchUnlocked={isMatchUnlocked}
        judgesCount={judgesCount}
        logs={logs}
        formatTime={formatTime}
        getDurasiSeconds={getDurasiSeconds}
        saveSharedState={saveSharedState}
        onBack={() => setRole(null)}
        isFs={isFs}
        toggleFullScreen={toggleFullScreen}
      />
    );
  }

  // 6. ROLE: MONITOR / SCOREBOARD VIEW (Ultra HD Dark Futuristic Stadium Arena Display)
  if (role === "monitor") {
    return (
      <SpectatorMonitorView
        selectedCategory={selectedCategory}
        selectedAge={selectedAge}
        gender={gender}
        performerName={performerName}
        contingent={contingent}
        timeRemaining={timeRemaining}
        timeActual={timeActual}
        isTimerRunning={isTimerRunning}
        isTimer1Running={isTimer1Running}
        isTimer2Running={isTimer2Running}
        durasiTampil={durasiTampil}
        partaiTanding={partaiTanding}
        tahapPertandingan={tahapPertandingan}
        namaEvent={namaEvent}
        tempatPelaksanaan={tempatPelaksanaan}
        waktuPelaksanaan={waktuPelaksanaan}
        namaAtlitBiru={namaAtlitBiru}
        kontingenBiru={kontingenBiru}
        namaAtlitMerah={namaAtlitMerah}
        kontingenMerah={kontingenMerah}
        activeCorner={activeCorner}
        juriScores={juriScores}
        juriScoresBiru={juriScoresBiru}
        juriScoresMerah={juriScoresMerah}
        deductions={deductions}
        deductionsBiru={deductionsBiru}
        deductionsMerah={deductionsMerah}
        judgesCount={judgesCount}
        disqualifiedBiru={disqualifiedBiru}
        undurDiriBiru={undurDiriBiru}
        disqualifiedMerah={disqualifiedMerah}
        undurDiriMerah={undurDiriMerah}
        logoKiri={logoKiri}
        logoKanan={logoKanan}
        isMatchUnlocked={isMatchUnlocked}
        onBack={() => setRole(null)}
        isFs={isFs}
        toggleFullScreen={toggleFullScreen}
        getCalculatedScoreForCorner={getCalculatedScoreForCorner}
        getFormattedScore={getFormattedScore}
        getJudgeTotal={getJudgeTotal}
        formatTime={formatTime}
        onSwitchCorner={(corner) => {
          saveSharedState({ activeCorner: corner });
        }}
      />
    );
  }

  // Fallback safe state
  return null;
}
