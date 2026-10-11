import React, { useState, useEffect } from "react";
import { MatchState, ActionLog } from "../types";
import { 
  Settings, Clock, Users, Save, Printer, Clipboard, 
  GitFork, RefreshCw, CheckCircle2, FileText, Check, Plus, Trash2, ArrowRight,
  ArrowLeft, Maximize2, Zap, RotateCcw, Volume2, Download, List, FileSpreadsheet, Upload,
  Sliders, Calendar, Search, X, Trophy, ChevronDown, ChevronUp, Info, AlertTriangle,
  BarChart3, TrendingUp, Layers, Activity, Shield, Share2
} from "lucide-react";
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { jsPDF } from "jspdf";
import RegistrasiDataView from "./RegistrasiDataView";
import { ShareClientModal } from "./ShareClientModal";

interface SekretarisViewProps {
  state: MatchState;
  onUpdateConfig: (config: any) => void;
  onResetMatch: (keepConfig: boolean) => void;
  onBack: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onTimerAction?: (action: string, value?: number) => void;
  onChangeRound?: (round: number) => void;
  onSoundAction?: (sound: string) => void;
  onDeclareWinner?: (winner: "blue" | "red" | null, decision: string) => void;
  onRestoreBackup?: (state: MatchState) => void;
}

interface BracketMatch {
  id: string;
  stage: string;
  p1: string;
  p1Contingent: string;
  p1Score?: string;
  p2: string;
  p2Contingent: string;
  p2Score?: string;
  winner?: 1 | 2;
  status: "pending" | "live" | "complete";
}

interface MatchLog {
  id: string;
  round: number;
  fighter: "RED" | "BLUE";
  type: "PUNCH" | "KICK" | "DROP" | "LOCK" | "PENALTY";
  points: number;
  uncounted?: boolean;
}

const parseActionLogsToMatchLogs = (actionLogs: ActionLog[]): MatchLog[] => {
  const logs: MatchLog[] = [];
  for (const log of actionLogs) {
    const msg = log.message || "";
    const type = log.type || "";
    const isBlue = msg.includes("Sudut BIRU") || msg.includes("Sudut Biru") || msg.includes("BIRU") || type.includes("blue");
    const isRed = msg.includes("Sudut MERAH") || msg.includes("Sudut Merah") || msg.includes("MERAH") || type.includes("red");
    if (!isBlue && !isRed) continue;
    const fighter = isBlue ? "BLUE" : "RED";
    
    let logType: "PUNCH" | "KICK" | "DROP" | "LOCK" | "PENALTY" | null = null;
    let points = 0;
    
    if (msg.includes("Pukulan") || msg.includes("pukulan")) {
      logType = "PUNCH";
      points = 1;
      const match = msg.match(/\(([-+]\d+) Poin\)/);
      if (match) points = parseInt(match[1], 10);
    } else if (msg.includes("Tendangan") || msg.includes("tendangan")) {
      logType = "KICK";
      points = 2;
      const match = msg.match(/\(([-+]\d+) Poin\)/);
      if (match) points = parseInt(match[1], 10);
    } else if (msg.includes("Bantingan") || msg.includes("Jatuhan") || msg.includes("jatuhan") || msg.includes("Bantingan / Jatuhan")) {
      logType = "DROP";
      points = 3;
      const match = msg.match(/\(([-+]\d+) Poin\)/);
      if (match) points = parseInt(match[1], 10);
    } else if (msg.includes("Kuncian") || msg.includes("kuncian")) {
      logType = "LOCK";
      points = 3;
      const match = msg.match(/\(([-+]\d+) Poin\)/);
      if (match) points = parseInt(match[1], 10);
    } else if (
      msg.includes("Teguran 1") ||
      msg.includes("Teguran 2") ||
      msg.includes("Peringatan 1") ||
      msg.includes("Peringatan 2") ||
      msg.includes("Keluar Gelanggang") ||
      msg.includes("Hukuman") ||
      msg.includes("Pelanggaran")
    ) {
      logType = "PENALTY";
      if (msg.includes("Teguran 1")) points = -1;
      else if (msg.includes("Teguran 2")) points = -2;
      else if (msg.includes("Peringatan 1")) points = -5;
      else if (msg.includes("Peringatan 2")) points = -10;
      else if (msg.includes("Keluar Gelanggang")) points = -1;
      else {
        const match = msg.match(/\(([-+]\d+) poin\)/i);
        points = match ? parseInt(match[1], 10) : -1;
      }
    }
    
    if (logType) {
      logs.push({
        id: log.id || Math.random().toString(),
        round: log.round || 1,
        fighter,
        type: logType,
        points
      });
    }
  }
  return logs;
};

// Helper to parse the unified classCategory string from App
// Format example: "Kelas A PUTRA DEWASA (PENYISIHAN)"
const parseClassCategory = (str: string) => {
  const result = {
    kelas: "A",
    gender: "PUTRA",
    usia: "DEWASA",
    tahap: "PENYISIHAN"
  };
  if (!str) return result;
  
  const upper = str.toUpperCase();
  
  // Extract Kelas (e.g., "Kelas A" -> "A")
  const kelasMatch = upper.match(/KELAS\s+([A-S\d]+)/i);
  if (kelasMatch) {
    result.kelas = kelasMatch[1];
  } else {
    // Fallback search
    const words = upper.split(" ");
    const kelasIdx = words.findIndex(w => w === "KELAS");
    if (kelasIdx !== -1 && words[kelasIdx + 1]) {
      result.kelas = words[kelasIdx + 1];
    }
  }
  
  // Extract Gender
  if (upper.includes("PUTRI")) {
    result.gender = "PUTRI";
  } else {
    result.gender = "PUTRA";
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
  
  return result;
};

export default function SekretarisView({ 
  state, 
  onUpdateConfig, 
  onResetMatch,
  onBack,
  onToggleFullscreen,
  isFullscreen,
  onTimerAction,
  onChangeRound,
  onSoundAction,
  onDeclareWinner,
  onRestoreBackup
}: SekretarisViewProps) {
  // Parsing existing classCategory state
  const parsedClass = parseClassCategory(state.classCategory);

  // Parameter states
  const [tournamentName, setTournamentName] = useState(state.tournamentName || "PIALA KEMENPORA 2026");
  const [arena, setArena] = useState(state.arena || "GELANGGANG A");
  const [waktuPelaksanaan, setWaktuPelaksanaan] = useState(() => localStorage.getItem("waktu_pelaksanaan") || "24 JUNI 2026");
  
  const [logoKiri, setLogoKiri] = useState<string>(localStorage.getItem("logo_kiri") || "");
  const [logoKanan, setLogoKanan] = useState<string>(localStorage.getItem("logo_kanan") || "");

  const [partaiTanding, setPartaiTanding] = useState(state.matchNumber || "1");
  const [tahapPertandingan, setTahapPertandingan] = useState(parsedClass.tahap);
  const [kelasNomor, setKelasNomor] = useState(parsedClass.kelas);
  const [kategoriUsia, setKategoriUsia] = useState(parsedClass.usia);
  const [gender, setGender] = useState<"PUTRA" | "PUTRI">(parsedClass.gender as "PUTRA" | "PUTRI");
  const [roundDuration, setRoundDuration] = useState(state.roundDuration || 120);

  // Athlete states
  const [blueName, setBlueName] = useState(state.athleteBlue.name || "REVALDO SAPUTRA");
  const [blueContingent, setBlueContingent] = useState(state.athleteBlue.contingent || "BANTEN");
  const [redName, setRedName] = useState(state.athleteRed.name || "DANU SETIAWAN");
  const [redContingent, setRedContingent] = useState(state.athleteRed.contingent || "JAWA BARAT");

  // Signatures for PDF printout
  const [reportSigneeHead, setReportSigneeHead] = useState("Drs. Bambang Wijaya, M.Pd");
  const [reportSigneeSec, setReportSigneeSec] = useState("Siti Rahmawati, S.Sos");
  const [showShareModal, setShowShareModal] = useState(false);

  // Local success animations indicators
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRegistrationPageActive, setIsRegistrationPageActive] = useState(false);
  const [registrationInitialTab, setRegistrationInitialTab] = useState<"input_data" | "bagan_braket" | "kontrol_partai">("bagan_braket");
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCekPartaiDropdownOpen, setIsCekPartaiDropdownOpen] = useState(false);
  const [cekPartaiSearch, setCekPartaiSearch] = useState("");
  const [isCekPartaiOverlayOpen, setIsCekPartaiOverlayOpen] = useState(false);
  const [cekPartaiAthleteSearch, setCekPartaiAthleteSearch] = useState("");
  const [isRoundTransitionOverlayOpen, setIsRoundTransitionOverlayOpen] = useState(false);
  const [lastSeenRoundForEnd, setLastSeenRoundForEnd] = useState<number | null>(null);
  const [isNextRoundSignalDismissed, setIsNextRoundSignalDismissed] = useState(false);

  // Derived state to determine if transition popup should be visible
  const isTransitionActive = isRoundTransitionOverlayOpen || (!!state?.secretarySignalNextRound && !isNextRoundSignalDismissed && !state?.winner);

  // Sync isNextRoundSignalDismissed with round and match changes
  useEffect(() => {
    setIsNextRoundSignalDismissed(false);
  }, [state?.round, state?.matchNumber]);

  // Inter-Round Break Timer States
  const [interRoundBreakTime, setInterRoundBreakTime] = useState(60);
  const [isInterRoundBreakRunning, setIsInterRoundBreakRunning] = useState(false);
  const [showIntipRingkasan, setShowIntipRingkasan] = useState(false);

  // States for declaring winner on round 3 completed
  const [selectedWinner, setSelectedWinner] = useState<"blue" | "red" | "">("");
  const [selectedDecision, setSelectedDecision] = useState<string>("Menang Angka");

  // PDF download overlay states
  const [isPdfDownloadOverlayOpen, setIsPdfDownloadOverlayOpen] = useState(false);
  const [selectedPartaiToDownload, setSelectedPartaiToDownload] = useState("");

  // States for resetting match history and dropdown accordion in complete match history
  const [showResetHistoryConfirm, setShowResetHistoryConfirm] = useState(false);
  const [expandedArchivedPartai, setExpandedArchivedPartai] = useState<Record<string, boolean>>({});

  // States for match archive searching & filtering
  const [archiveSearchName, setArchiveSearchName] = useState("");
  const [archiveFilterDate, setArchiveFilterDate] = useState("");

  // Active tab state for visualisasi analisis skor laga (IPSI)
  const [activeChartTab, setActiveChartTab] = useState<"per_ronde" | "akumulatif" | "tipe_aksi" | "detail_ronde">("per_ronde");
  const [showCekPartaiResetConfirm, setShowCekPartaiResetConfirm] = useState(false);
  const [showResetMatchConfirm, setShowResetMatchConfirm] = useState(false);

  // Redundansi Backup States & Methods
  const [hasBackup, setHasBackup] = useState(false);
  const [backupTime, setBackupTime] = useState("");
  const [backupMatchInfo, setBackupMatchInfo] = useState("");
  const [backupStateData, setBackupStateData] = useState<MatchState | null>(null);
  const [showRestoreToast, setShowRestoreToast] = useState(false);

  // Autosave current match state as backup in localStorage
  useEffect(() => {
    if (state && state.matchNumber) {
      // Don't overwrite backup if current state is just empty or initial
      const isInitialState = state.scores?.blue?.total === 0 && state.scores?.red?.total === 0 && state.round === 1 && state.actionLogs?.length <= 1;
      
      // If the state is not just a freshly reset empty state, or if we have action logs
      if (!isInitialState || (state.actionLogs && state.actionLogs.length > 1)) {
        const backupPayload = {
          timestamp: Date.now(),
          matchNumber: state.matchNumber,
          state: state
        };
        localStorage.setItem("match_autosave_backup", JSON.stringify(backupPayload));
        
        // Also refresh backup info so it stays in sync
        const date = new Date();
        setBackupTime(date.toLocaleTimeString("id-ID") + " " + date.toLocaleDateString("id-ID"));
        setBackupMatchInfo(`${state.matchNumber} | ${state.athleteBlue?.name || "Biru"} vs ${state.athleteRed?.name || "Merah"}`);
        setBackupStateData(state);
        setHasBackup(true);
      }
    }
  }, [state]);

  // Initial load check for backup
  useEffect(() => {
    const saved = localStorage.getItem("match_autosave_backup");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.state) {
          const isBackupDifferent = 
            parsed.state.scores?.blue?.total !== state?.scores?.blue?.total ||
            parsed.state.scores?.red?.total !== state?.scores?.red?.total ||
            parsed.state.matchNumber !== state?.matchNumber ||
            parsed.state.round !== state?.round;

          if (isBackupDifferent) {
            setHasBackup(true);
            const date = new Date(parsed.timestamp);
            setBackupTime(date.toLocaleTimeString("id-ID") + " " + date.toLocaleDateString("id-ID"));
            setBackupMatchInfo(`${parsed.matchNumber || parsed.state.matchNumber || "Unknown"} | ${parsed.state.athleteBlue?.name || "Biru"} vs ${parsed.state.athleteRed?.name || "Merah"}`);
            setBackupStateData(parsed.state);
            setShowRestoreToast(true);
          }
        }
      } catch (e) {
        console.error("Error reading initial backup", e);
      }
    }
  }, []);

  const handleApplyRestore = () => {
    if (backupStateData && onRestoreBackup) {
      onRestoreBackup(backupStateData);
      alert("Berhasil memulihkan data pertandingan dari backup otomatis!");
      setShowRestoreToast(false);
      setHasBackup(false);
    }
  };

  const handleDismissRestore = () => {
    setShowRestoreToast(false);
  };

  // Auto-initialize selected winner based on leading points
  useEffect(() => {
    if (isTransitionActive && state.round === state.maxRound) {
      if (state.scores.blue.total > state.scores.red.total) {
        setSelectedWinner("blue");
      } else if (state.scores.red.total > state.scores.blue.total) {
        setSelectedWinner("red");
      } else {
        setSelectedWinner("");
      }
      setSelectedDecision("Menang Angka");
    }
  }, [isTransitionActive, state.round, state.maxRound, state.scores.blue.total, state.scores.red.total]);

  // Auto-trigger round transition overlay when timer hits 0
  useEffect(() => {
    if (
      state.timeRemaining === 0 &&
      !state.isTimerRunning &&
      state.round <= state.maxRound &&
      !state.winner &&
      lastSeenRoundForEnd !== state.round
    ) {
      setIsRoundTransitionOverlayOpen(true);
      setLastSeenRoundForEnd(state.round);
    }
  }, [state.timeRemaining, state.isTimerRunning, state.round, state.maxRound, state.winner, lastSeenRoundForEnd]);

  useEffect(() => {
    if (state.timeRemaining > 0) {
      setLastSeenRoundForEnd(null);
    }
  }, [state.round, state.timeRemaining]);

  // Handle break timer countdown
  useEffect(() => {
    if (isTransitionActive) {
      setInterRoundBreakTime(60);
      setIsInterRoundBreakRunning(true);
    } else {
      setIsInterRoundBreakRunning(false);
    }
  }, [isTransitionActive]);

  useEffect(() => {
    let interval: any = null;
    if (isInterRoundBreakRunning && interRoundBreakTime > 0) {
      interval = setInterval(() => {
        setInterRoundBreakTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onSoundAction?.("buzzer");
            setIsInterRoundBreakRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInterRoundBreakRunning, interRoundBreakTime]);

  const [registeredAthletes, setRegisteredAthletes] = useState<any[]>(() => {
    const saved = localStorage.getItem("registered_athletes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Match Schedule Generator States & Methods
  const [selectedGelanggang, setSelectedGelanggang] = useState<string>("GELANGGANG I");
  const [scheduleItems, setScheduleItems] = useState<any[]>(() => {
    const saved = localStorage.getItem("match_schedules");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        partai: "1",
        kelas: "A",
        gender: "PUTRA",
        usia: "REMAJA",
        tahapan: "PENYISIHAN",
        blueName: "BUDI PRASETYO",
        blueContingent: "DKI JAKARTA",
        redName: "ANDI SANTOSO",
        redContingent: "JAWA TENGAH"
      },
      {
        partai: "2",
        kelas: "A",
        gender: "PUTRA",
        usia: "DEWASA",
        tahapan: "FINAL",
        blueName: "HERI SUSANTO",
        blueContingent: "SUMATERA UTARA",
        redName: "GUNTUR PERMANA",
        redContingent: "BANTEN"
      },
      {
        partai: "3",
        kelas: "B",
        gender: "PUTRI",
        usia: "REMAJA",
        tahapan: "PENYISIHAN",
        blueName: "DIAN UTAMI",
        blueContingent: "JAWA TIMUR",
        redName: "SITI NUR HALIZA",
        redContingent: "JAWA BARAT"
      },
      {
        partai: "4",
        kelas: "C",
        gender: "PUTRA",
        usia: "DEWASA",
        tahapan: "SEMIFINAL",
        blueName: "FAJAR NUGRAHA",
        blueContingent: "DI YOGYAKARTA",
        redName: "EKO WAHYUDI",
        redContingent: "BALI"
      }
    ];
  });

  const handleAutoGenerateScheduler = () => {
    const savedAthletesStr = localStorage.getItem("registered_athletes");
    if (!savedAthletesStr) {
      alert("Tidak ada atlet terdaftar untuk dijadwalkan.");
      return;
    }
    let list: any[] = [];
    try {
      const parsed = JSON.parse(savedAthletesStr);
      list = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(e);
      list = [];
    }
    if (list.length === 0) {
      alert("Tidak ada atlet terdaftar untuk dijadwalkan.");
      return;
    }

    // Group athletes
    const groupsMap: { [key: string]: any[] } = {};
    list.forEach((a: any) => {
      if (!a) return;
      const key = `${a.kelas || "A"}_${a.gender || "PUTRA"}_${a.usia || "REMAJA"}`.toUpperCase();
      if (!groupsMap[key]) groupsMap[key] = [];
      groupsMap[key].push(a);
    });

    const newSchedules: any[] = [];
    let partaiCounter = 1;

    // We want to sort group keys to make the schedule look neat
    const sortedGroupKeys = Object.keys(groupsMap).sort();

    sortedGroupKeys.forEach(groupKey => {
      const groupAthletes = [...groupsMap[groupKey]].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.name.localeCompare(b.name);
      });

      const count = groupAthletes.length;
      if (count < 2) return; // Cannot schedule a bracket for less than 2 players

      const [kelas, gender, usia] = groupKey.split("_");

      // Generate the bracket matches for this group
      const matches: any[] = [];
      if (count === 2) {
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: groupAthletes[0], p2: groupAthletes[1] });
      } else if (count === 3) {
        matches.push({ id: `M_SF1`, stage: "SEMIFINAL 1", p1: groupAthletes[0], p2: groupAthletes[1] });
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" }, p2: groupAthletes[2] });
      } else if (count === 4) {
        matches.push({ id: `M_SF1`, stage: "SEMIFINAL 1", p1: groupAthletes[0], p2: groupAthletes[1] });
        matches.push({ id: `M_SF2`, stage: "SEMIFINAL 2", p1: groupAthletes[2], p2: groupAthletes[3] });
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG SEMIFINAL 2", contingent: "TBD" } });
      } else if (count === 5) {
        matches.push({ id: `M_QF1`, stage: "PENYISIHAN 1", p1: groupAthletes[0], p2: groupAthletes[1] });
        matches.push({ id: `M_QF2`, stage: "PENYISIHAN 2", p1: groupAthletes[2], p2: groupAthletes[3] });
        matches.push({ id: `M_SF1`, stage: "SEMIFINAL 1", p1: { name: "PEMENANG PENYISIHAN 2", contingent: "TBD" }, p2: groupAthletes[4] });
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: { name: "PEMENANG PENYISIHAN 1", contingent: "TBD" }, p2: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" } });
      } else if (count === 6) {
        matches.push({ id: `M_QF1`, stage: "PEREMPAT FINAL 1", p1: groupAthletes[0], p2: groupAthletes[1] });
        matches.push({ id: `M_QF2`, stage: "PEREMPAT FINAL 2", p1: groupAthletes[2], p2: groupAthletes[3] });
        matches.push({ id: `M_QF3`, stage: "PEREMPAT FINAL 3", p1: groupAthletes[4], p2: groupAthletes[5] });
        matches.push({ id: `M_SF1`, stage: "SEMIFINAL 1", p1: { name: "PEMENANG PEREMPAT FINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 2", contingent: "TBD" } });
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 3", contingent: "TBD" } });
      } else if (count === 7) {
        matches.push({ id: `M_QF1`, stage: "PEREMPAT FINAL 1", p1: groupAthletes[0], p2: groupAthletes[1] });
        matches.push({ id: `M_QF2`, stage: "PEREMPAT FINAL 2", p1: groupAthletes[2], p2: groupAthletes[3] });
        matches.push({ id: `M_QF3`, stage: "PEREMPAT FINAL 3", p1: groupAthletes[4], p2: groupAthletes[5] });
        matches.push({ id: `M_SF1`, stage: "SEMIFINAL 1", p1: { name: "PEMENANG PEREMPAT FINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 2", contingent: "TBD" } });
        matches.push({ id: `M_SF2`, stage: "SEMIFINAL 2", p1: { name: "PEMENANG PEREMPAT FINAL 3", contingent: "TBD" }, p2: groupAthletes[6] });
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG SEMIFINAL 2", contingent: "TBD" } });
      } else if (count === 8) {
        matches.push({ id: `M_QF1`, stage: "PEREMPAT FINAL 1", p1: groupAthletes[0], p2: groupAthletes[1] });
        matches.push({ id: `M_QF2`, stage: "PEREMPAT FINAL 2", p1: groupAthletes[2], p2: groupAthletes[3] });
        matches.push({ id: `M_QF3`, stage: "PEREMPAT FINAL 3", p1: groupAthletes[4], p2: groupAthletes[5] });
        matches.push({ id: `M_QF4`, stage: "PEREMPAT FINAL 4", p1: groupAthletes[6], p2: groupAthletes[7] });
        matches.push({ id: `M_SF1`, stage: "SEMIFINAL 1", p1: { name: "PEMENANG PEREMPAT FINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 2", contingent: "TBD" } });
        matches.push({ id: `M_SF2`, stage: "SEMIFINAL 2", p1: { name: "PEMENANG PEREMPAT FINAL 3", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 4", contingent: "TBD" } });
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG SEMIFINAL 2", contingent: "TBD" } });
      } else if (count === 9) {
        matches.push({ id: `M_P1`, stage: "PENYISIHAN", p1: groupAthletes[7], p2: groupAthletes[8] });
        matches.push({ id: `M_QF1`, stage: "PEREMPAT FINAL 1", p1: groupAthletes[0], p2: groupAthletes[1] });
        matches.push({ id: `M_QF2`, stage: "PEREMPAT FINAL 2", p1: groupAthletes[2], p2: groupAthletes[3] });
        matches.push({ id: `M_QF3`, stage: "PEREMPAT FINAL 3", p1: groupAthletes[4], p2: groupAthletes[5] });
        matches.push({ id: `M_QF4`, stage: "PEREMPAT FINAL 4", p1: groupAthletes[6], p2: { name: "PEMENANG PENYISIHAN", contingent: "TBD" } });
        matches.push({ id: `M_SF1`, stage: "SEMIFINAL 1", p1: { name: "PEMENANG PEREMPAT FINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 2", contingent: "TBD" } });
        matches.push({ id: `M_SF2`, stage: "SEMIFINAL 2", p1: { name: "PEMENANG PEREMPAT FINAL 3", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 4", contingent: "TBD" } });
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG SEMIFINAL 2", contingent: "TBD" } });
      } else {
        // >= 10, handle 4 quarter final brackets
        for (let i = 0; i < 4; i++) {
          const p1 = groupAthletes[i * 2] || null;
          const p2 = groupAthletes[i * 2 + 1] || null;
          if (p1 && p2) {
            matches.push({ id: `M_QF${i+1}`, stage: `PEREMPAT FINAL ${i+1}`, p1, p2 });
          }
        }
        matches.push({ id: `M_SF1`, stage: "SEMIFINAL 1", p1: { name: "PEMENANG PEREMPAT FINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 2", contingent: "TBD" } });
        matches.push({ id: `M_SF2`, stage: "SEMIFINAL 2", p1: { name: "PEMENANG PEREMPAT FINAL 3", contingent: "TBD" }, p2: { name: "PEMENANG PEREMPAT FINAL 4", contingent: "TBD" } });
        matches.push({ id: `M_FINAL`, stage: "FINAL", p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" }, p2: { name: "PEMENANG SEMIFINAL 2", contingent: "TBD" } });
      }

      // Convert bracket matches into schedule list items
      matches.forEach(m => {
        newSchedules.push({
          partai: partaiCounter.toString(),
          uniqueId: `${groupKey}_${m.id}`,
          kelas: kelas,
          gender: gender,
          usia: usia,
          tahapan: m.stage,
          blueName: m.p1?.name || "PEMENANG",
          blueContingent: m.p1?.contingent || "TBD",
          redName: m.p2?.name || "PEMENANG",
          redContingent: m.p2?.contingent || "TBD",
          status: "open",
          winner: null,
          blueScore: 0,
          redScore: 0,
          gelanggang: selectedGelanggang
        });
        partaiCounter++;
      });
    });

    if (newSchedules.length === 0) {
      alert("Tidak ada pertandingan yang dapat dibuat. Pastikan atlit sudah dikelompokkan.");
      return;
    }

    setScheduleItems(newSchedules);
    localStorage.setItem("match_schedules", JSON.stringify(newSchedules));
    setSchedulePage(1);
    alert(`Berhasil membuat ${newSchedules.length} jadwal pertandingan otomatis berdasarkan bagan gulat/pencak silat.`);
  };

  // Local state for searching & paginating the schedule list to support unlimited rows
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [schedulePage, setSchedulePage] = useState(1);
  const itemsPerPage = 10;

  const handleDownloadTemplate = () => {
    // Generate an Excel-compatible template. We include comments with '#' which our parser will ignore safely.
    const headers = "Partai,Kelas,Gender,Kategori Usia,Tahap,Nama Biru,Kontingen Biru,Nama Merah,Kontingen Merah\n";
    const sampleRows = [
      "1,A,PUTRA,REMAJA,PENYISIHAN,BUDI PRASETYO,DKI JAKARTA,ANDI SANTOSO,JAWA TENGAH",
      "2,A,PUTRA,DEWASA,FINAL,HERI SUSANTO,SUMATERA UTARA,GUNTUR PERMANA,BANTEN",
      "3,B,PUTRI,REMAJA,PENYISIHAN,DIAN UTAMI,JAWA TIMUR,SITI NUR HALIZA,JAWA BARAT",
      "4,C,PUTRA,DEWASA,SEMIFINAL,FAJAR NUGRAHA,DI YOGYAKARTA,EKO WAHYUDI,BALI"
    ].join("\n");
    
    // Add UTF-8 BOM so Excel opens it with correct encoding instantly
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + headers + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Jadwal_Pertandingan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrentSchedule = () => {
    if (scheduleItems.length === 0) {
      alert("Jadwal kosong. Silakan tambah data terlebih dahulu!");
      return;
    }
    const headers = "Partai,Kelas,Gender,Kategori Usia,Tahap,Nama Biru,Kontingen Biru,Nama Merah,Kontingen Merah\n";
    const rows = scheduleItems.map(item => {
      const p = (item.partai || "").replace(/"/g, '""');
      const k = (item.kelas || "").replace(/"/g, '""');
      const g = (item.gender || "PUTRA").toUpperCase();
      const u = (item.usia || "").replace(/"/g, '""');
      const t = (item.tahapan || "").replace(/"/g, '""');
      const bn = (item.blueName || "").replace(/"/g, '""');
      const bc = (item.blueContingent || "").replace(/"/g, '""');
      const rn = (item.redName || "").replace(/"/g, '""');
      const rc = (item.redContingent || "").replace(/"/g, '""');
      return `"${p}","${k}","${g}","${u}","${t}","${bn}","${bc}","${rn}","${rc}"`;
    }).join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Jadwal_Pertandingan_Terbaru_${selectedGelanggang.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-initialize selectedPartaiToDownload when overlay opens with the first completed match
  useEffect(() => {
    if (isPdfDownloadOverlayOpen) {
      const completed = scheduleItems.filter(item => item.status === "complete");
      if (completed.length > 0) {
        setSelectedPartaiToDownload(completed[0].partai.toString());
      }
    }
  }, [isPdfDownloadOverlayOpen, scheduleItems]);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        alert("Berkas tidak mengandung data atau baris tidak cukup!");
        return;
      }

      // Detect delimiter based on first line
      const firstLine = lines[0];
      const delimiter = firstLine.includes(";") ? ";" : ",";

      // Robust CSV line parser supporting quote enclosures
      const parseLine = (l: string): string[] => {
        const result: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < l.length; i++) {
          const char = l[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            result.push(cur.trim());
            cur = "";
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result.map(v => v.replace(/^["']|["']$/g, "").trim());
      };

      // Extract headers case-insensitively
      const headersArr = parseLine(firstLine).map(h => h.toLowerCase());

      const idxPartai = headersArr.findIndex(h => h.includes("partai") || h.includes("no") || h.includes("match"));
      const idxKelas = headersArr.findIndex(h => h.includes("kelas") || h.includes("class"));
      const idxGender = headersArr.findIndex(h => h.includes("gender") || h.includes("jenis kelamin") || h.includes("putra/putri"));
      const idxUsia = headersArr.findIndex(h => h.includes("usia") || h.includes("kategori") || h.includes("umur"));
      const idxTahapan = headersArr.findIndex(h => h.includes("tahap") || h.includes("babak") || h.includes("round"));
      const idxBlueName = headersArr.findIndex(h => h.includes("nama biru") || h.includes("atlet biru") || h.includes("atlit biru") || h.includes("blue name"));
      const idxBlueContingent = headersArr.findIndex(h => h.includes("kontingen biru") || h.includes("regu biru") || h.includes("blue contingent"));
      const idxRedName = headersArr.findIndex(h => h.includes("nama merah") || h.includes("atlet merah") || h.includes("atlit merah") || h.includes("red name"));
      const idxRedContingent = headersArr.findIndex(h => h.includes("kontingen merah") || h.includes("regu merah") || h.includes("red contingent"));

      // Standard positions as fallback
      const pIdx = idxPartai >= 0 ? idxPartai : 0;
      const kIdx = idxKelas >= 0 ? idxKelas : 1;
      const gIdx = idxGender >= 0 ? idxGender : 2;
      const uIdx = idxUsia >= 0 ? idxUsia : 3;
      const tIdx = idxTahapan >= 0 ? idxTahapan : 4;
      const bnIdx = idxBlueName >= 0 ? idxBlueName : 5;
      const bcIdx = idxBlueContingent >= 0 ? idxBlueContingent : 6;
      const rnIdx = idxRedName >= 0 ? idxRedName : 7;
      const rcIdx = idxRedContingent >= 0 ? idxRedContingent : 8;

      const parsedItems: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;

        const cols = parseLine(line);
        // Ensure we have enough columns or default them
        if (cols.length >= 2) {
          const rawGender = cols[gIdx] || "PUTRA";
          parsedItems.push({
            partai: cols[pIdx] || i.toString(),
            kelas: cols[kIdx] || "A",
            gender: rawGender.toUpperCase().includes("PUTRI") ? "PUTRI" : "PUTRA",
            usia: cols[uIdx] || "REMAJA",
            tahapan: cols[tIdx] || "PENYISIHAN",
            blueName: cols[bnIdx] || "PESILAT BIRU",
            blueContingent: cols[bcIdx] || "KONTINGEN",
            redName: cols[rnIdx] || "PESILAT MERAH",
            redContingent: cols[rcIdx] || "KONTINGEN"
          });
        }
      }

      if (parsedItems.length > 0) {
        setScheduleItems(parsedItems);
        setSchedulePage(1); // Reset to page 1
        localStorage.setItem("match_schedules", JSON.stringify(parsedItems));
        alert(`Berhasil mengimpor ${parsedItems.length} partai jadwal pertandingan secara fleksibel!`);
      } else {
        alert("Format berkas tidak dikenali. Pastikan file CSV memiliki setidaknya kolom Partai & Nama!");
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be re-imported if edited
    e.target.value = "";
  };

  const handleUseSchedule = (item: any) => {
    setPartaiTanding(item.partai);
    setKelasNomor(item.kelas);
    setGender(item.gender);
    setKategoriUsia(item.usia);
    setTahapPertandingan(item.tahapan);
    setBlueName(item.blueName);
    setBlueContingent(item.blueContingent);
    setRedName(item.redName);
    setRedContingent(item.redContingent);

    const unifiedClass = `Kelas ${item.kelas} ${item.gender} ${item.usia} (${item.tahapan})`;
    const configPayload = {
      tournamentName,
      arena,
      matchNumber: item.partai,
      classCategory: unifiedClass,
      athleteBlue: {
        name: item.blueName,
        contingent: item.blueContingent,
      },
      athleteRed: {
        name: item.redName,
        contingent: item.redContingent,
      },
      roundDuration,
      maxRound: 3
    };
    onUpdateConfig(configPayload);
    setIsGeneratorOpen(false);
    alert(`Partai #${item.partai} (${item.blueName} VS ${item.redName}) berhasil diaktifkan ke Arena!`);
  };

  const handleStartMatchManually = (item: any) => {
    // 1. Activate the schedule (updates names, class, partai, and sends config to server)
    handleUseSchedule(item);
    
    // 2. Reset scores and timer on the server (keeping the newly sent config)
    setTimeout(() => {
      onResetMatch?.(true); // reset state but keep config
    }, 100);
    
    // 3. Close the overlay
    setIsCekPartaiOverlayOpen(false);
  };

  const handleArchiveAndGoToNext = () => {
    // 1. Archive the current match results in scheduleItems
    const currentIdx = scheduleItems.findIndex(
      item => String(item.partai) === String(state.matchNumber)
    );

    let updatedSchedules = [...scheduleItems];
    if (currentIdx !== -1) {
      updatedSchedules[currentIdx] = {
        ...updatedSchedules[currentIdx],
        status: "complete",
        winner: state.winner === "blue" ? 1 : state.winner === "red" ? 2 : undefined,
        winnerDecision: state.winnerDecision || "Menang Angka",
        blueScore: state.scores.blue.total,
        redScore: state.scores.red.total,
        bluePukulan: state.scores.blue.pukulan,
        blueTendangan: state.scores.blue.tendangan,
        blueJatuhan: state.scores.blue.jatuhan,
        blueHukuman: state.scores.blue.hukuman,
        redPukulan: state.scores.red.pukulan,
        redTendangan: state.scores.red.tendangan,
        redJatuhan: state.scores.red.jatuhan,
        redHukuman: state.scores.red.hukuman,
        roundScores: state.roundScores,
        completedAt: new Date().toISOString().split('T')[0]
      };
      setScheduleItems(updatedSchedules);
      localStorage.setItem("match_schedules", JSON.stringify(updatedSchedules));
    }

    // 2. Load the next match if it exists
    const nextIdx = currentIdx !== -1 ? currentIdx + 1 : -1;
    if (nextIdx !== -1 && nextIdx < updatedSchedules.length) {
      const nextMatch = updatedSchedules[nextIdx];
      // Load next match config
      handleUseSchedule(nextMatch);
      // Reset server scores and timer
      setTimeout(() => {
        onResetMatch?.(true);
      }, 150);
      alert(`Pertandingan Partai #${state.matchNumber} berhasil diarsipkan. Sistem beralih ke Partai #${nextMatch.partai} (${nextMatch.blueName} VS ${nextMatch.redName})!`);
    } else {
      // No more scheduled matches
      onResetMatch?.(true);
      alert(`Pertandingan Partai #${state.matchNumber} berhasil diarsipkan. Semua partai pertandingan dalam daftar jadwal telah selesai!`);
    }

    // Close the overlay
    setIsRoundTransitionOverlayOpen(false);
  };

  // Find current match in schedule list for navigation
  const currentMatchIndex = scheduleItems.findIndex(
    item => String(item.partai) === String(partaiTanding)
  );
  
  const hasPrevMatch = currentMatchIndex > 0;
  const hasNextMatch = currentMatchIndex !== -1 && currentMatchIndex < scheduleItems.length - 1;
  
  const handlePrevMatch = () => {
    if (hasPrevMatch) {
      handleUseSchedule(scheduleItems[currentMatchIndex - 1]);
    }
  };
  
  const handleNextMatch = () => {
    if (hasNextMatch) {
      handleUseSchedule(scheduleItems[currentMatchIndex + 1]);
    }
  };

  // Process schedules with their original index so editing or deleting works flawlessly
  const processedSchedules = scheduleItems.map((item, originalIndex) => ({
    ...item,
    originalIndex
  }));

  const filteredScheduleItems = processedSchedules.filter(item => {
    if (!scheduleSearch) return true;
    const query = scheduleSearch.toLowerCase();
    return (
      (item.partai || "").toLowerCase().includes(query) ||
      (item.kelas || "").toLowerCase().includes(query) ||
      (item.usia || "").toLowerCase().includes(query) ||
      (item.tahapan || "").toLowerCase().includes(query) ||
      (item.blueName || "").toLowerCase().includes(query) ||
      (item.blueContingent || "").toLowerCase().includes(query) ||
      (item.redName || "").toLowerCase().includes(query) ||
      (item.redContingent || "").toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredScheduleItems.length / itemsPerPage) || 1;
  const currentPage = Math.min(schedulePage, totalPages);
  
  const paginatedScheduleItems = filteredScheduleItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleTerapkanSemua = () => {
    localStorage.setItem("match_schedules", JSON.stringify(scheduleItems));
    alert("Semua jadwal pertandingan berhasil disimpan dan diterapkan!");
    setIsGeneratorOpen(false);
  };

  const handleUnduhPdfJadwal = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup terblokir! Izinkan popup untuk mencetak jadwal.");
      return;
    }
    
    const tableRows = scheduleItems.map((item) => `
      <tr style="border-bottom: 1px solid #ddd; text-align: left;">
        <td style="padding: 10px; font-weight: bold; font-family: monospace;">${item.partai}</td>
        <td style="padding: 10px;">Kelas ${item.kelas}</td>
        <td style="padding: 10px;">${item.gender}</td>
        <td style="padding: 10px;">${item.usia}</td>
        <td style="padding: 10px;">${item.tahapan}</td>
        <td style="padding: 10px; color: #1e3a8a; font-weight: bold;">
          ${item.blueName}<br/>
          <span style="font-size: 10px; font-weight: normal; color: #555;">${item.blueContingent}</span>
        </td>
        <td style="padding: 10px; color: #7f1d1d; font-weight: bold;">
          ${item.redName}<br/>
          <span style="font-size: 10px; font-weight: normal; color: #555;">${item.redContingent}</span>
        </td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>DAFTAR JADWAL PERTANDINGAN - ${selectedGelanggang}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; }
            h1 { text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; font-size: 20px; text-align: center; }
            h2 { font-size: 14px; color: #666; margin-top: 0; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; padding: 12px 10px; border-bottom: 2px solid #ccc; font-size: 11px; text-transform: uppercase; color: #444; }
            td { font-size: 12px; }
            .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>DAFTAR JADWAL PERTANDINGAN</h1>
          <h2>${tournamentName} - ${selectedGelanggang}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 8%">Partai</th>
                <th style="width: 10%">Kelas</th>
                <th style="width: 10%">Gender</th>
                <th style="width: 12%">Usia</th>
                <th style="width: 12%">Tahapan</th>
                <th style="width: 24%">Sudut Biru (Blue)</th>
                <th style="width: 24%">Sudut Merah (Red)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            Dicetak otomatis dari JRZ Score TGR (Standar IPSI 2026 &amp; PERSILAT) - ${new Date().toLocaleString("id-ID")}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Sync inputs locally when server state refreshes
  useEffect(() => {
    if (state.tournamentName) setTournamentName(state.tournamentName);
    if (state.arena) setArena(state.arena);
    if (state.matchNumber) setPartaiTanding(state.matchNumber);
    if (state.athleteBlue.name) setBlueName(state.athleteBlue.name);
    if (state.athleteBlue.contingent) setBlueContingent(state.athleteBlue.contingent);
    if (state.athleteRed.name) setRedName(state.athleteRed.name);
    if (state.athleteRed.contingent) setRedContingent(state.athleteRed.contingent);
    if (state.roundDuration) setRoundDuration(state.roundDuration);
    
    const parsed = parseClassCategory(state.classCategory);
    setTahapPertandingan(parsed.tahap);
    setKelasNomor(parsed.kelas);
    setKategoriUsia(parsed.usia);
    setGender(parsed.gender as "PUTRA" | "PUTRI");
  }, [state]);

  // Sync schedules back from localStorage when returning from RegistrasiDataView
  useEffect(() => {
    if (!isRegistrationPageActive) {
      const saved = localStorage.getItem("match_schedules");
      if (saved) {
        try {
          const items = JSON.parse(saved);
          setScheduleItems(items);
          
          // Auto-sync active match with updated schedule data if any athlete details changed
          if (partaiTanding) {
            const currentMatch = items.find((item: any) => String(item.partai) === String(partaiTanding));
            if (currentMatch) {
              const unifiedClass = `Kelas ${currentMatch.kelas} ${currentMatch.gender} ${currentMatch.usia} (${currentMatch.tahapan})`;
              const hasChanged = 
                currentMatch.blueName !== state.athleteBlue.name ||
                currentMatch.blueContingent !== state.athleteBlue.contingent ||
                currentMatch.redName !== state.athleteRed.name ||
                currentMatch.redContingent !== state.athleteRed.contingent ||
                unifiedClass !== state.classCategory ||
                String(currentMatch.partai) !== String(state.matchNumber);
                
              if (hasChanged) {
                handleUseSchedule(currentMatch);
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      const savedAthletes = localStorage.getItem("registered_athletes");
      if (savedAthletes) {
        try {
          setRegisteredAthletes(JSON.parse(savedAthletes));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [isRegistrationPageActive, partaiTanding, state]);

  // Handle direct config updates to server
  const syncConfigWithServer = (updates: any) => {
    // Construct class category unified string
    const targetTahap = updates.tahapPertandingan !== undefined ? updates.tahapPertandingan : tahapPertandingan;
    const targetKelas = updates.kelasNomor !== undefined ? updates.kelasNomor : kelasNomor;
    const targetUsia = updates.kategoriUsia !== undefined ? updates.kategoriUsia : kategoriUsia;
    const targetGender = updates.gender !== undefined ? updates.gender : gender;

    const unifiedClass = `Kelas ${targetKelas} ${targetGender} ${targetUsia} (${targetTahap})`;

    const configPayload = {
      tournamentName: updates.tournamentName !== undefined ? updates.tournamentName : tournamentName,
      arena: updates.arena !== undefined ? updates.arena : arena,
      matchNumber: updates.partaiTanding !== undefined ? updates.partaiTanding : partaiTanding,
      classCategory: unifiedClass,
      athleteBlue: {
        name: updates.blueName !== undefined ? updates.blueName : blueName,
        contingent: updates.blueContingent !== undefined ? updates.blueContingent : blueContingent,
      },
      athleteRed: {
        name: updates.redName !== undefined ? updates.redName : redName,
        contingent: updates.redContingent !== undefined ? updates.redContingent : redContingent,
      },
      roundDuration: Number(updates.roundDuration !== undefined ? updates.roundDuration : roundDuration),
      maxRound: 3
    };

    onUpdateConfig(configPayload);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  // Drag-and-drop and manual logo upload handlers
  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>, side: "kiri" | "kanan") => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (side === "kiri") {
          setLogoKiri(base64);
          localStorage.setItem("logo_kiri", base64);
        } else {
          setLogoKanan(base64);
          localStorage.setItem("logo_kanan", base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoClick = (side: "kiri" | "kanan") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (side === "kiri") {
            setLogoKiri(base64);
            localStorage.setItem("logo_kiri", base64);
          } else {
            setLogoKanan(base64);
            localStorage.setItem("logo_kanan", base64);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const clearLogo = (side: "kiri" | "kanan") => {
    if (side === "kiri") {
      setLogoKiri("");
      localStorage.removeItem("logo_kiri");
    } else {
      setLogoKanan("");
      localStorage.removeItem("logo_kanan");
    }
  };

  // Format time remaining MM:SS
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, "0");
    const sec = (seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  // Convert logs to Excel-compatible CSV download
  const handleExportExcel = () => {
    if (state.actionLogs.length === 0) {
      alert("Belum ada histori tanding untuk diexport!");
      return;
    }
    const headers = "ID,Waktu Clock,Babak,Tipe Log,Keterangan\n";
    const rows = state.actionLogs.map(log => 
      `"${log.id}","${log.clockTime}",Round ${log.round},"${log.type}","${log.message.replace(/"/g, '""')}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Histori_Tanding_Partai_${partaiTanding}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async (mode: "all" | "single") => {
    const completed = scheduleItems.filter(item => item.status === "complete");
    if (completed.length === 0) {
      alert("Belum ada riwayat partai pertandingan yang selesai untuk diunduh!");
      return;
    }

    const doc = new jsPDF();
    doc.setFont("Helvetica");

    // Helper to load image to base64
    const getBase64Image = (imgUrl: string): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else {
            resolve("");
          }
        };
        img.onerror = () => {
          resolve("");
        };
        img.src = imgUrl;
      });
    };

    let ipsiLogoBase64 = "";
    let rightLogoBase64 = "";
    try {
      ipsiLogoBase64 = await getBase64Image("/LogoIPSI.png");
    } catch (e) {
      console.warn("Could not load IPSI logo:", e);
    }
    if (logoKanan) {
      try {
        rightLogoBase64 = await getBase64Image(logoKanan);
      } catch (e) {
        console.warn("Could not load right logo:", e);
      }
    }

    const drawMatchCertificatePage = (item: any, isFirstPage: boolean) => {
      if (!isFirstPage) {
        doc.addPage();
      }

      // 1. Header Logo
      if (ipsiLogoBase64) {
        doc.addImage(ipsiLogoBase64, "PNG", 14, 8, 20, 20);
      }
      if (rightLogoBase64) {
        doc.addImage(rightLogoBase64, "PNG", 176, 8, 20, 20);
      }

      // 2. Header Titles (all text centered)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("HASIL PERTANDINGAN RESMI", 105, 14, { align: "center" });

      doc.setFontSize(14);
      doc.text(tournamentName.toUpperCase(), 105, 20, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      
      const subTitle = `GELANGGANG: ${selectedGelanggang.toUpperCase()} | WAKTU: ${new Date().toLocaleDateString("id-ID")}`;
      doc.text(subTitle, 105, 25, { align: "center" });

      // 3. Double Line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.line(14, 29, 196, 29);
      doc.setLineWidth(0.3);
      doc.line(14, 31, 196, 31);

      // 4. Metadata Bar
      doc.line(14, 35, 196, 35);

      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(0, 0, 0);

      doc.text(`PARTAI: ${item.partai}`, 16, 40);

      const tahapText = `TAHAP: ${(item.tahapan || item.stage || "PENYISIHAN").toUpperCase()}`;
      doc.text(tahapText, 105, 40, { align: "center" });

      const kelasText = `KELAS: ${(item.kelas || "").toUpperCase()} - ${(item.usia || "REMAJA").toUpperCase()} ${(item.gender || "PUTRA").toUpperCase()}`;
      doc.text(kelasText, 194, 40, { align: "right" });

      doc.line(14, 44, 196, 44);

      // 5. Competitor Cards (Left: SUDUT BIRU, Right: SUDUT MERAH)
      const cardY = 50;
      const cardHeight = 84;
      const cardWidth = 88;

      // Left Card: SUDUT BIRU (Blue)
      doc.setFillColor(245, 249, 255);
      doc.rect(14, cardY, cardWidth, cardHeight, "F");
      doc.setDrawColor(30, 144, 255);
      doc.setLineWidth(1.5);
      doc.rect(14, cardY, cardWidth, cardHeight);

      // Text SUDUT BIRU
      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 144, 255);
      doc.text("SUDUT BIRU", 14 + cardWidth / 2, cardY + 7, { align: "center" });

      // Athlete Name
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text((item.blueName || "-").toUpperCase(), 14 + cardWidth / 2, cardY + 15, { align: "center" });

      // Contingent
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text((item.blueContingent || "-").toUpperCase(), 14 + cardWidth / 2, cardY + 21, { align: "center" });

      // Giant Total Score
      doc.setFontSize(38);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 144, 255);
      doc.text(String(item.blueScore ?? 0), 14 + cardWidth / 2, cardY + 41, { align: "center" });

      // Score Table inside Blue Card
      const tableX_blue = 20;
      const tableY_blue = cardY + 49;
      const tableW = 76;

      // Table background header
      doc.setFillColor(240, 245, 255);
      doc.rect(tableX_blue, tableY_blue, tableW, 6, "F");
      // Table outer border
      doc.setDrawColor(30, 144, 255);
      doc.setLineWidth(0.6);
      doc.rect(tableX_blue, tableY_blue, tableW, 13);
      // Horizontal split line
      doc.line(tableX_blue, tableY_blue + 6, tableX_blue + tableW, tableY_blue + 6);
      // Vertical split lines
      doc.line(tableX_blue + 19, tableY_blue, tableX_blue + 19, tableY_blue + 13);
      doc.line(tableX_blue + 38, tableY_blue, tableX_blue + 38, tableY_blue + 13);
      doc.line(tableX_blue + 57, tableY_blue, tableX_blue + 57, tableY_blue + 13);

      // Table headers
      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Pukulan", tableX_blue + 9.5, tableY_blue + 4.2, { align: "center" });
      doc.text("Tendangan", tableX_blue + 28.5, tableY_blue + 4.2, { align: "center" });
      doc.text("Jatuhan", tableX_blue + 47.5, tableY_blue + 4.2, { align: "center" });
      doc.text("Hukuman", tableX_blue + 66.5, tableY_blue + 4.2, { align: "center" });

      // Table values
      const bPukulan = item.bluePukulan !== undefined ? item.bluePukulan : 0;
      const bTendangan = item.blueTendangan !== undefined ? item.blueTendangan : 0;
      const bJatuhan = item.blueJatuhan !== undefined ? item.blueJatuhan : 0;
      const bHukuman = item.blueHukuman !== undefined ? item.blueHukuman : 0;

      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text(String(bPukulan), tableX_blue + 9.5, tableY_blue + 10.5, { align: "center" });
      doc.text(String(bTendangan), tableX_blue + 28.5, tableY_blue + 10.5, { align: "center" });
      doc.text(String(bJatuhan), tableX_blue + 47.5, tableY_blue + 10.5, { align: "center" });
      doc.text(String(bHukuman), tableX_blue + 66.5, tableY_blue + 10.5, { align: "center" });


      // Right Card: SUDUT MERAH (Red)
      const rightX = 108;
      doc.setFillColor(255, 245, 245);
      doc.rect(rightX, cardY, cardWidth, cardHeight, "F");
      doc.setDrawColor(220, 53, 69);
      doc.setLineWidth(1.5);
      doc.rect(rightX, cardY, cardWidth, cardHeight);

      // Text SUDUT MERAH
      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("SUDUT MERAH", rightX + cardWidth / 2, cardY + 7, { align: "center" });

      // Athlete Name
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text((item.redName || "-").toUpperCase(), rightX + cardWidth / 2, cardY + 15, { align: "center" });

      // Contingent
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text((item.redContingent || "-").toUpperCase(), rightX + cardWidth / 2, cardY + 21, { align: "center" });

      // Giant Total Score
      doc.setFontSize(38);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text(String(item.redScore ?? 0), rightX + cardWidth / 2, cardY + 41, { align: "center" });

      // Score Table inside Red Card
      const tableX_red = rightX + 6;
      const tableY_red = cardY + 49;

      // Table background header
      doc.setFillColor(255, 240, 240);
      doc.rect(tableX_red, tableY_red, tableW, 6, "F");
      // Table outer border
      doc.setDrawColor(220, 53, 69);
      doc.setLineWidth(0.6);
      doc.rect(tableX_red, tableY_red, tableW, 13);
      // Horizontal split line
      doc.line(tableX_red, tableY_red + 6, tableX_red + tableW, tableY_red + 6);
      // Vertical split lines
      doc.line(tableX_red + 19, tableY_red, tableX_red + 19, tableY_red + 13);
      doc.line(tableX_red + 38, tableY_red, tableX_red + 38, tableY_red + 13);
      doc.line(tableX_red + 57, tableY_red, tableX_red + 57, tableY_red + 13);

      // Table headers
      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Pukulan", tableX_red + 9.5, tableY_red + 4.2, { align: "center" });
      doc.text("Tendangan", tableX_red + 28.5, tableY_red + 4.2, { align: "center" });
      doc.text("Jatuhan", tableX_red + 47.5, tableY_red + 4.2, { align: "center" });
      doc.text("Hukuman", tableX_red + 66.5, tableY_red + 4.2, { align: "center" });

      // Table values
      const rPukulan = item.redPukulan !== undefined ? item.redPukulan : 0;
      const rTendangan = item.redTendangan !== undefined ? item.redTendangan : 0;
      const rJatuhan = item.redJatuhan !== undefined ? item.redJatuhan : 0;
      const rHukuman = item.redHukuman !== undefined ? item.redHukuman : 0;

      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text(String(rPukulan), tableX_red + 9.5, tableY_red + 10.5, { align: "center" });
      doc.text(String(rTendangan), tableX_red + 28.5, tableY_red + 10.5, { align: "center" });
      doc.text(String(rJatuhan), tableX_red + 47.5, tableY_red + 10.5, { align: "center" });
      doc.text(String(rHukuman), tableX_red + 66.5, tableY_red + 10.5, { align: "center" });


      // 6. Decision Box (Hasil Akhir)
      const bannerY = cardY + cardHeight + 8;
      const bannerH = 12;

      const winnerSide = item.winner === 1 ? "SUDUT BIRU" : item.winner === 2 ? "SUDUT MERAH" : "DRAW";
      const winnerName = item.winner === 1 ? item.blueName : item.winner === 2 ? item.redName : "SAMA KUAT";

      let hasilAkhirText = "";
      if (item.winner === 1 || item.winner === 2) {
        const decision = (item.winnerDecision || "Menang Angka").toUpperCase();
        hasilAkhirText = `HASIL AKHIR: PEMENANG ${winnerSide} - ${winnerName.toUpperCase()} (${decision})`;
      } else {
        hasilAkhirText = "HASIL AKHIR: SERI (DRAW)";
      }

      doc.setFillColor(235, 247, 235);
      doc.rect(14, bannerY, 182, bannerH, "F");
      doc.setDrawColor(40, 167, 69);
      doc.setLineWidth(1);
      doc.rect(14, bannerY, 182, bannerH);

      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(25, 105, 45);
      doc.text(hasilAkhirText, 105, bannerY + 7.5, { align: "center" });


      // 7. Signatures
      const sigY = bannerY + bannerH + 12;
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("Sekretaris Pertandingan,", 55, sigY, { align: "center" });
      doc.text("Ketua Dewan Juri,", 155, sigY, { align: "center" });

      const sigNameY = sigY + 25;
      doc.setFont("Helvetica", "bold");
      doc.text((reportSigneeSec || "SITI RAHMAWATI, S.Sos").toUpperCase(), 55, sigNameY, { align: "center" });
      doc.text((reportSigneeHead || "DRS. BAMBANG WIJAYA, M.Pd").toUpperCase(), 155, sigNameY, { align: "center" });

      // Green Underlines for names
      doc.setDrawColor(40, 167, 69);
      doc.setLineWidth(1.2);
      doc.line(25, sigNameY + 1.5, 85, sigNameY + 1.5);
      doc.line(125, sigNameY + 1.5, 185, sigNameY + 1.5);

      // --- PAGE 2: RINGKASAN & ANALISIS STATISTIK VISUAL ---
      doc.addPage();

      // Top Header Band
      doc.setFillColor(245, 243, 255); // soft violet background
      doc.rect(14, 10, 182, 28, "F");
      
      doc.setDrawColor(124, 58, 237); // solid violet border
      doc.setLineWidth(1.2);
      doc.rect(14, 10, 182, 28);

      // Title on Page 2
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(76, 29, 149); // deep purple
      doc.text("LAPORAN RINGKASAN & ANALISIS STATISTIK VISUAL", 105, 17, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139); // slate text
      const subTitlePage2 = `PARTAI: ${item.partai} | KELAS: ${(item.kelas || "").toUpperCase()} - ${(item.usia || "REMAJA").toUpperCase()} ${(item.gender || "PUTRA").toUpperCase()}`;
      doc.text(subTitlePage2, 105, 22, { align: "center" });

      // Match Scoreboard Header
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      // Blue Athlete
      doc.setTextColor(30, 144, 255);
      const blueHeader = `${(item.blueName || "SUDUT BIRU").toUpperCase()} (${item.blueContingent || ""})`;
      doc.text(blueHeader, 20, 31);
      
      // VS
      doc.setTextColor(120, 120, 120);
      doc.text("VS", 105, 31, { align: "center" });

      // Red Athlete
      doc.setTextColor(220, 53, 69);
      const redHeader = `${(item.redName || "SUDUT MERAH").toUpperCase()} (${item.redContingent || ""})`;
      doc.text(redHeader, 190, 31, { align: "right" });

      // Divider lines
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 42, 196, 42);

      // SECTION 1: CUMULATIVE PROGRESSION LINE CHART
      const chart1Y = 48;
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("1. PERKEMBANGAN SKOR KUMULATIF PER RONDE", 16, chart1Y);

      // Bounding box for Cumulative Line Chart
      const lineX = 25;
      const lineY = chart1Y + 6;
      const lineW = 160;
      const lineH = 65;

      // Draw Chart Bounding Grid Box
      doc.setFillColor(250, 250, 252);
      doc.rect(lineX, lineY, lineW, lineH, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(lineX, lineY, lineW, lineH);

      // Get Cumulative values
      let rScores = item.roundScores;
      if (!rScores) {
        const bTotal = item.blueScore ?? 0;
        const rTotal = item.redScore ?? 0;
        rScores = {
          1: {
            blue: { total: Math.round(bTotal * 0.3) },
            red: { total: Math.round(rTotal * 0.25) }
          },
          2: {
            blue: { total: Math.round(bTotal * 0.35) },
            red: { total: Math.round(rTotal * 0.4) }
          },
          3: {
            blue: { total: bTotal - Math.round(bTotal * 0.3) - Math.round(bTotal * 0.35) },
            red: { total: rTotal - Math.round(rTotal * 0.25) - Math.round(rTotal * 0.4) }
          }
        };
      }

      // Calculate cumulative round totals
      const cumBlue0 = 0;
      const cumBlue1 = rScores[1]?.blue?.total ?? rScores[1]?.blue?.points ?? 0;
      const cumBlue2 = cumBlue1 + (rScores[2]?.blue?.total ?? rScores[2]?.blue?.points ?? 0);
      const cumBlue3 = cumBlue2 + (rScores[3]?.blue?.total ?? rScores[3]?.blue?.points ?? 0);

      const cumRed0 = 0;
      const cumRed1 = rScores[1]?.red?.total ?? rScores[1]?.red?.points ?? 0;
      const cumRed2 = cumRed1 + (rScores[2]?.red?.total ?? rScores[2]?.red?.points ?? 0);
      const cumRed3 = cumRed2 + (rScores[3]?.red?.total ?? rScores[3]?.red?.points ?? 0);

      const maxVal = Math.max(cumBlue3, cumRed3, 10);
      const yMin = 0;
      const yMax = Math.ceil(maxVal * 1.15); // Add padding to chart top

      // Reusable helper to map value to chart Y coordinate
      const getChartY = (val: number) => {
        const ratio = (val - yMin) / (yMax - yMin);
        return lineY + lineH - (ratio * lineH);
      };

      // Draw horizontal dashed grid lines & labels
      doc.setFontSize(8);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.setLineWidth(0.3);
      
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const gridVal = Math.round(yMin + (yMax - yMin) * (i / gridSteps));
        const currY = getChartY(gridVal);
        // Draw grid label
        doc.text(String(gridVal), lineX - 4, currY + 2.5, { align: "right" });
        if (i > 0 && i < gridSteps) {
          doc.setDrawColor(241, 245, 249);
          doc.line(lineX, currY, lineX + lineW, currY);
        }
      }

      // X-axis divisions
      const xPoints = [
        { label: "Mulai", x: lineX },
        { label: "Ronde 1", x: lineX + (lineW * 0.33) },
        { label: "Ronde 2", x: lineX + (lineW * 0.66) },
        { label: "Ronde 3", x: lineX + lineW }
      ];

      // Draw X-axis labels
      xPoints.forEach(pt => {
        doc.setDrawColor(226, 232, 240);
        doc.line(pt.x, lineY + lineH, pt.x, lineY + lineH + 2);
        doc.setTextColor(100, 116, 139);
        doc.text(pt.label, pt.x, lineY + lineH + 6, { align: "center" });
      });

      // Plot cumulative points & draw lines
      const bluePoints = [
        { x: xPoints[0].x, y: getChartY(cumBlue0), val: cumBlue0 },
        { x: xPoints[1].x, y: getChartY(cumBlue1), val: cumBlue1 },
        { x: xPoints[2].x, y: getChartY(cumBlue2), val: cumBlue2 },
        { x: xPoints[3].x, y: getChartY(cumBlue3), val: cumBlue3 }
      ];

      const redPoints = [
        { x: xPoints[0].x, y: getChartY(cumRed0), val: cumRed0 },
        { x: xPoints[1].x, y: getChartY(cumRed1), val: cumRed1 },
        { x: xPoints[2].x, y: getChartY(cumRed2), val: cumRed2 },
        { x: xPoints[3].x, y: getChartY(cumRed3), val: cumRed3 }
      ];

      // Draw lines
      doc.setLineWidth(1.8);
      // Blue Line
      doc.setDrawColor(30, 144, 255);
      for (let i = 0; i < bluePoints.length - 1; i++) {
        doc.line(bluePoints[i].x, bluePoints[i].y, bluePoints[i + 1].x, bluePoints[i + 1].y);
      }
      // Red Line
      doc.setDrawColor(220, 53, 69);
      for (let i = 0; i < redPoints.length - 1; i++) {
        doc.line(redPoints[i].x, redPoints[i].y, redPoints[i + 1].x, redPoints[i + 1].y);
      }

      // Draw points (circles) & score text
      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "bold");
      bluePoints.forEach((pt, index) => {
        doc.setFillColor(30, 144, 255);
        doc.circle(pt.x, pt.y, 2.5, "F");
        doc.setFillColor(255, 255, 255);
        doc.circle(pt.x, pt.y, 1.2, "F");
        if (index > 0) {
          doc.setTextColor(30, 144, 255);
          doc.text(String(pt.val), pt.x, pt.y - 4, { align: "center" });
        }
      });

      redPoints.forEach((pt, index) => {
        doc.setFillColor(220, 53, 69);
        doc.circle(pt.x, pt.y, 2.5, "F");
        doc.setFillColor(255, 255, 255);
        doc.circle(pt.x, pt.y, 1.2, "F");
        if (index > 0) {
          doc.setTextColor(220, 53, 69);
          doc.text(String(pt.val), pt.x, pt.y + 7, { align: "center" });
        }
      });

      // SECTION 2: BAR CHART OF TECHNICAL ACTION DISTRIBUTION
      const chart2Y = chart1Y + lineH + 22;
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("2. DISTRIBUSI AKSI TEKNIS & POIN RESMI IPSI", 16, chart2Y);

      // Bounding box for action distribution bar chart
      const barX = 25;
      const barY = chart2Y + 6;
      const barW = 160;
      const barH = 65;

      doc.setFillColor(250, 250, 252);
      doc.rect(barX, barY, barW, barH, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(barX, barY, barW, barH);

      // Prepare Action Data: Pukulan (+1), Tendangan (+2), Jatuhan (+3), Hukuman (Poin Negatif)
      const actions = [
        { label: "Pukulan (+1)", blue: bPukulan * 1, red: rPukulan * 1 },
        { label: "Tendangan (+2)", blue: bTendangan * 2, red: rTendangan * 2 },
        { label: "Jatuhan (+3)", blue: bJatuhan * 3, red: rJatuhan * 3 },
        { label: "Hukuman (-)", blue: -Math.abs(bHukuman), red: -Math.abs(rHukuman) }
      ];

      // Calculate Y axis limits for bar chart
      const maxActVal = Math.max(actions[0].blue, actions[0].red, actions[1].blue, actions[1].red, actions[2].blue, actions[2].red, 5);
      const minActVal = Math.min(actions[3].blue, actions[3].red, -5);
      
      const barYMin = minActVal;
      const barYMax = maxActVal * 1.15;

      const getBarChartY = (val: number) => {
        const ratio = (val - barYMin) / (barYMax - barYMin);
        return barY + barH - (ratio * barH);
      };

      const zeroY = getBarChartY(0);

      // Draw Grid steps for bar chart
      doc.setLineWidth(0.3);
      doc.setFontSize(8);
      const barGridSteps = 5;
      for (let i = 0; i <= barGridSteps; i++) {
        const val = Math.round(barYMin + (barYMax - barYMin) * (i / barGridSteps));
        const currY = getBarChartY(val);
        doc.setTextColor(148, 163, 184);
        doc.text(String(val), barX - 4, currY + 2.5, { align: "right" });
        if (val !== 0) {
          doc.setDrawColor(241, 245, 249);
          doc.line(barX, currY, barX + barW, currY);
        }
      }

      // Draw Solid zero baseline
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.6);
      doc.line(barX, zeroY, barX + barW, zeroY);

      // Draw Bars
      const numCategories = actions.length;
      const groupWidth = barW / numCategories;
      const innerBarW = groupWidth * 0.28;

      actions.forEach((act, idx) => {
        const groupCenterX = barX + (idx * groupWidth) + (groupWidth / 2);
        
        // Blue Bar
        const blueVal = act.blue;
        const bY = getBarChartY(blueVal);
        const bH = zeroY - bY;
        
        doc.setFillColor(30, 144, 255);
        if (blueVal >= 0) {
          doc.rect(groupCenterX - innerBarW - 1, bY, innerBarW, Math.abs(bH), "F");
          doc.setTextColor(30, 144, 255);
          doc.setFont("Helvetica", "bold");
          doc.text(String(blueVal), groupCenterX - innerBarW / 2 - 1, bY - 2.5, { align: "center" });
        } else {
          doc.rect(groupCenterX - innerBarW - 1, zeroY, innerBarW, Math.abs(bH), "F");
          doc.setTextColor(30, 144, 255);
          doc.setFont("Helvetica", "bold");
          doc.text(String(blueVal), groupCenterX - innerBarW / 2 - 1, bY + 7.5, { align: "center" });
        }

        // Red Bar
        const redVal = act.red;
        const rY = getBarChartY(redVal);
        const rH = zeroY - rY;
        
        doc.setFillColor(220, 53, 69);
        if (redVal >= 0) {
          doc.rect(groupCenterX + 1, rY, innerBarW, Math.abs(rH), "F");
          doc.setTextColor(220, 53, 69);
          doc.setFont("Helvetica", "bold");
          doc.text(String(redVal), groupCenterX + innerBarW / 2 + 1, rY - 2.5, { align: "center" });
        } else {
          doc.rect(groupCenterX + 1, zeroY, innerBarW, Math.abs(rH), "F");
          doc.setTextColor(220, 53, 69);
          doc.setFont("Helvetica", "bold");
          doc.text(String(redVal), groupCenterX + innerBarW / 2 + 1, rY + 7.5, { align: "center" });
        }

        // Draw Category Label
        doc.setTextColor(15, 23, 42);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(act.label, groupCenterX, barY + barH + 6, { align: "center" });
      });

      // --- PAGE 3: DETIL PER RONDE & DIAGRAM INTEGRASI RECHARTS ---
      doc.addPage();

      // Top Header Band Page 3
      doc.setFillColor(245, 243, 255); // soft violet background
      doc.rect(14, 10, 182, 28, "F");
      
      doc.setDrawColor(124, 58, 237); // solid violet border
      doc.setLineWidth(1.2);
      doc.rect(14, 10, 182, 28);

      // Title on Page 3
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(76, 29, 149); // deep purple
      doc.text("LAPORAN DETIL PER RONDE & DIAGRAM INTEGRASI RECHARTS", 105, 17, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139); // slate text
      const subTitlePage3 = `PARTAI: ${item.partai} | KELAS: ${(item.kelas || "").toUpperCase()} - ${(item.usia || "REMAJA").toUpperCase()} ${(item.gender || "PUTRA").toUpperCase()}`;
      doc.text(subTitlePage3, 105, 22, { align: "center" });

      // Match Scoreboard Header
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      // Blue Athlete
      doc.setTextColor(30, 144, 255);
      const blueHeader3 = `${(item.blueName || "SUDUT BIRU").toUpperCase()} (${item.blueContingent || ""})`;
      doc.text(blueHeader3, 20, 31);
      
      // VS
      doc.setTextColor(120, 120, 120);
      doc.text("VS", 105, 31, { align: "center" });

      // Red Athlete
      doc.setTextColor(220, 53, 69);
      const redHeader3 = `${(item.redName || "SUDUT MERAH").toUpperCase()} (${item.redContingent || ""})`;
      doc.text(redHeader3, 190, 31, { align: "right" });

      // Divider lines
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 42, 196, 42);

      // SECTION 3: ROUND BY ROUND SCORE CHART
      const chart3Y = 48;
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("3. PEROLEHAN NILAI DETIL PER RONDE (RECHARTS HISTOGRAM)", 16, chart3Y);

      // Bounding box for Round Bar Chart
      const roundBarX = 25;
      const roundBarY = chart3Y + 6;
      const roundBarW = 160;
      const roundBarH = 65;

      doc.setFillColor(250, 250, 252);
      doc.rect(roundBarX, roundBarY, roundBarW, roundBarH, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(roundBarX, roundBarY, roundBarW, roundBarH);

      // Extract Round Scores safely with fallbacks from already-initialized rScores
      const r1Blue = rScores[1]?.blue?.total ?? rScores[1]?.blue?.points ?? 0;
      const r1Red = rScores[1]?.red?.total ?? rScores[1]?.red?.points ?? 0;
      const r2Blue = rScores[2]?.blue?.total ?? rScores[2]?.blue?.points ?? 0;
      const r2Red = rScores[2]?.red?.total ?? rScores[2]?.red?.points ?? 0;
      const r3Blue = rScores[3]?.blue?.total ?? rScores[3]?.blue?.points ?? 0;
      const r3Red = rScores[3]?.red?.total ?? rScores[3]?.red?.points ?? 0;

      const roundData = [
        { label: "Ronde 1", blue: r1Blue, red: r1Red },
        { label: "Ronde 2", blue: r2Blue, red: r2Red },
        { label: "Ronde 3", blue: r3Blue, red: r3Red }
      ];

      const maxRoundVal = Math.max(r1Blue, r1Red, r2Blue, r2Red, r3Blue, r3Red, 5);
      const minRoundVal = Math.min(r1Blue, r1Red, r2Blue, r2Red, r3Blue, r3Red, 0);

      const roundYMin = minRoundVal < 0 ? minRoundVal : 0;
      const roundYMax = maxRoundVal * 1.15;

      const getRoundChartY = (val: number) => {
        const ratio = (val - roundYMin) / (roundYMax - roundYMin);
        return roundBarY + roundBarH - (ratio * roundBarH);
      };

      const roundZeroY = getRoundChartY(0);

      // Draw Grid steps for round chart
      doc.setLineWidth(0.3);
      doc.setFontSize(8);
      const roundGridSteps = 5;
      for (let i = 0; i <= roundGridSteps; i++) {
        const val = Math.round(roundYMin + (roundYMax - roundYMin) * (i / roundGridSteps));
        const currY = getRoundChartY(val);
        doc.setTextColor(148, 163, 184);
        doc.text(String(val), roundBarX - 4, currY + 2.5, { align: "right" });
        if (val !== 0) {
          doc.setDrawColor(241, 245, 249);
          doc.line(roundBarX, currY, roundBarX + roundBarW, currY);
        }
      }

      // Draw Solid zero baseline
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.6);
      doc.line(roundBarX, roundZeroY, roundBarX + roundBarW, roundZeroY);

      // Draw Bars
      const numRounds = roundData.length;
      const rGroupWidth = roundBarW / numRounds;
      const rInnerBarW = rGroupWidth * 0.25;

      roundData.forEach((act, idx) => {
        const groupCenterX = roundBarX + (idx * rGroupWidth) + (rGroupWidth / 2);
        
        // Blue Bar
        const blueVal = act.blue;
        const bY = getRoundChartY(blueVal);
        const bH = roundZeroY - bY;
        
        doc.setFillColor(30, 144, 255);
        if (blueVal >= 0) {
          doc.rect(groupCenterX - rInnerBarW - 2, bY, rInnerBarW, Math.abs(bH), "F");
          doc.setTextColor(30, 144, 255);
          doc.setFont("Helvetica", "bold");
          doc.text(String(blueVal), groupCenterX - rInnerBarW / 2 - 2, bY - 2.5, { align: "center" });
        } else {
          doc.rect(groupCenterX - rInnerBarW - 2, roundZeroY, rInnerBarW, Math.abs(bH), "F");
          doc.setTextColor(30, 144, 255);
          doc.setFont("Helvetica", "bold");
          doc.text(String(blueVal), groupCenterX - rInnerBarW / 2 - 2, bY + 7.5, { align: "center" });
        }

        // Red Bar
        const redVal = act.red;
        const rY = getRoundChartY(redVal);
        const rH = roundZeroY - rY;
        
        doc.setFillColor(220, 53, 69);
        if (redVal >= 0) {
          doc.rect(groupCenterX + 2, rY, rInnerBarW, Math.abs(rH), "F");
          doc.setTextColor(220, 53, 69);
          doc.setFont("Helvetica", "bold");
          doc.text(String(redVal), groupCenterX + rInnerBarW / 2 + 2, rY - 2.5, { align: "center" });
        } else {
          doc.rect(groupCenterX + 2, roundZeroY, rInnerBarW, Math.abs(rH), "F");
          doc.setTextColor(220, 53, 69);
          doc.setFont("Helvetica", "bold");
          doc.text(String(redVal), groupCenterX + rInnerBarW / 2 + 2, rY + 7.5, { align: "center" });
        }

        // Draw Category Label
        doc.setTextColor(15, 23, 42);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(act.label, groupCenterX, roundBarY + roundBarH + 6, { align: "center" });
      });

      // SECTION 4: AUTOMATED ANALYTICAL INSIGHTS (BENTO CARD STYLE)
      const insightsY = roundBarY + roundBarH + 16;
      doc.setFillColor(248, 250, 252);
      doc.rect(14, insightsY, 182, 22, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.rect(14, insightsY, 182, 22);

      // Simple, highly polished dynamic text summary
      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("ANALISIS DINAMIS DIGITAL RECHARTS:", 18, insightsY + 6.5);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      
      // Determine dominant actions
      const bActionsList = [
        { type: "Pukulan", count: bPukulan },
        { type: "Tendangan", count: bTendangan },
        { type: "Jatuhan", count: bJatuhan }
      ].sort((a, b) => b.count - a.count);

      const rActionsList = [
        { type: "Pukulan", count: rPukulan },
        { type: "Tendangan", count: rTendangan },
        { type: "Jatuhan", count: rJatuhan }
      ].sort((a, b) => b.count - a.count);

      const blueDominant = bActionsList[0].count > 0 ? bActionsList[0].type : "Pukulan/Tendangan";
      const redDominant = rActionsList[0].count > 0 ? rActionsList[0].type : "Pukulan/Tendangan";

      let analysisLine1 = `Strategi Serangan: Sudut Biru dominan melancarkan teknik ${blueDominant}, `;
      analysisLine1 += `sedangkan Sudut Merah lebih aktif menggunakan serangan berbasis ${redDominant}.`;

      let winnerSummary = "";
      if (item.winner === 1) {
        winnerSummary = `Kemenangan diraih oleh ${(item.blueName || "SUDUT BIRU").toUpperCase()} (BIRU) dengan akumulasi poin teknik tertinggi.`;
      } else if (item.winner === 2) {
        winnerSummary = `Kemenangan diraih oleh ${(item.redName || "SUDUT MERAH").toUpperCase()} (MERAH) berkat performa teknik serangan yang konsisten.`;
      } else {
        winnerSummary = "Pertandingan berakhir imbang (DRAW) dengan pencapaian poin yang sama kuat pada akhir Ronde 3.";
      }

      doc.text(analysisLine1, 18, insightsY + 12);
      doc.text(winnerSummary, 18, insightsY + 17);
    };

    if (mode === "all") {
      completed.forEach((item, index) => {
        drawMatchCertificatePage(item, index === 0);
      });
      doc.save(`Laporan_Histori_Semua_Partai.pdf`);
    } else {
      const item = completed.find(c => String(c.partai) === String(selectedPartaiToDownload));
      if (!item) {
        alert("Partai yang dipilih tidak ditemukan!");
        return;
      }
      drawMatchCertificatePage(item, true);
      doc.save(`Laporan_Hasil_Partai_${item.partai}.pdf`);
    }

    setIsPdfDownloadOverlayOpen(false);
  };

  // --- TAB 3: BAGAN SYSTEM states (Interactive flowchart bracket) ---
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([
    {
      id: "M1",
      stage: "Semifinal 1",
      p1: "Sutrisno Adi",
      p1Contingent: "Banten",
      p1Score: "18",
      p2: "Wawan Hermawan",
      p2Contingent: "DKI Jakarta",
      p2Score: "11",
      winner: 1,
      status: "complete",
    },
    {
      id: "M2",
      stage: "Semifinal 2",
      p1: "Ahmad Zaki",
      p1Contingent: "Jawa Barat",
      p1Score: "14",
      p2: "Gilang Ramadhan",
      p2Contingent: "Jawa Tengah",
      p2Score: "15",
      winner: 2,
      status: "complete",
    },
    {
      id: "M3",
      stage: "FINAL",
      p1: "REVALDO SAPUTRA",
      p1Contingent: "BANTEN",
      p1Score: "0",
      p2: "DANU SETIAWAN",
      p2Contingent: "JAWA BARAT",
      status: "pending",
    },
  ]);

  const syncActiveMatchToFinal = () => {
    const updated = [...bracketMatches];
    updated[2].p1 = blueName || "REVALDO SAPUTRA";
    updated[2].p1Contingent = blueContingent || "BANTEN";
    updated[2].p2 = redName || "DANU SETIAWAN";
    updated[2].p2Contingent = redContingent || "JAWA BARAT";

    updated[2].p1Score = (state.scores?.blue?.total ?? 0).toString();
    updated[2].p2Score = (state.scores?.red?.total ?? 0).toString();
    
    if (state.winner) {
      updated[2].winner = state.winner === "blue" ? 1 : 2;
      updated[2].status = "complete";
    } else {
      updated[2].status = "live";
    }
    setBracketMatches(updated);
    alert("Berhasil menyinkronkan data partai aktif ke bagan final!");
  };

  const resetBracket = () => {
    setBracketMatches([
      {
        id: "M1",
        stage: "Semifinal 1",
        p1: "Sutrisno Adi",
        p1Contingent: "Banten",
        p1Score: "18",
        p2: "Wawan Hermawan",
        p2Contingent: "DKI Jakarta",
        p2Score: "11",
        winner: 1,
        status: "complete",
      },
      {
        id: "M2",
        stage: "Semifinal 2",
        p1: "Ahmad Zaki",
        p1Contingent: "Jawa Barat",
        p1Score: "14",
        p2: "Gilang Ramadhan",
        p2Contingent: "Jawa Tengah",
        p2Score: "15",
        winner: 2,
        status: "complete",
      },
      {
        id: "M3",
        stage: "FINAL",
        p1: blueName || "REVALDO SAPUTRA",
        p1Contingent: blueContingent || "BANTEN",
        p1Score: (state.scores?.blue?.total ?? 0).toString(),
        p2: redName || "DANU SETIAWAN",
        p2Score: (state.scores?.red?.total ?? 0).toString(),
        status: state.winner ? "complete" : "pending",
        winner: state.winner === "blue" ? 1 : state.winner === "red" ? 2 : undefined
      },
    ]);
  };

  if (isRegistrationPageActive) {
    return (
      <RegistrasiDataView 
        onBack={() => setIsRegistrationPageActive(false)}
        isFullscreen={isFullscreen}
        tournamentName={tournamentName}
        initialTab={registrationInitialTab}
      />
    );
  }

  return (
    <div id="sekretaris-view-root" className={`min-h-screen bg-[#070116] text-white font-sans select-none overflow-x-hidden relative transition-all ${isFullscreen ? 'p-2 md:p-3' : 'p-4 md:p-6'}`}>
      
      {/* 1. Header Bar action buttons */}
      <div className={`print:hidden max-w-7xl mx-auto flex justify-between items-center transition-all ${isFullscreen ? 'mb-2' : 'mb-6'}`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#0f072c] hover:bg-[#1a0e44] text-zinc-300 hover:text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg ${isFullscreen ? 'px-2.5 py-1 text-[10px]' : 'px-4 py-2 text-xs'}`}
          title="Kembali ke Menu Utama"
        >
          <ArrowLeft size={12} /> Kembali
        </button>
        
        {saveSuccess && (
          <div className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl font-bold animate-fade-in flex items-center gap-1">
            <Check size={12} /> Auto-Sync Berhasil
          </div>
        )}

        <button
          onClick={onToggleFullscreen}
          className={`flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#0f072c] hover:bg-[#1a0e44] text-zinc-300 hover:text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg ${isFullscreen ? 'px-2.5 py-1 text-[10px]' : 'px-4 py-2 text-xs'}`}
          title="Toggle Layar Penuh"
        >
          <Maximize2 size={12} /> {isFullscreen ? "Layar Normal" : "Layar Penuh"}
        </button>
      </div>

      {showRestoreToast && hasBackup && (
        <div className="print:hidden max-w-7xl mx-auto mb-6 bg-gradient-to-r from-purple-900/40 via-[#0c0423] to-emerald-950/40 border border-purple-500/40 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_25px_rgba(168,85,247,0.15)] animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/10 text-purple-400 p-2.5 rounded-xl border border-purple-500/20 shadow-md">
              <AlertTriangle className="animate-bounce" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-200 to-emerald-300">
                REDUNDANSI BACKUP AKTIF: Ditemukan Data Laga Lokal!
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Sistem mendeteksi backup otomatis Partai <span className="text-purple-400 font-extrabold">{backupMatchInfo}</span> (Tersimpan: {backupTime}). Gunakan ini jika server sempat terputus atau muat ulang mendadak.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleApplyRestore}
              className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-emerald-600 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer"
            >
              Pulihkan Data Tanding
            </button>
            <button
              onClick={handleDismissRestore}
              className="flex-1 md:flex-none px-4 py-2 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-xl border border-zinc-800 transition-all active:scale-95 cursor-pointer"
            >
              Abaikan
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN HEADER & NAVBAR (Side-by-side Layout) */}
      <div className="print:hidden max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        {/* Left Side: Title & Branding */}
        <div className="flex items-center gap-2">
          <div className={`bg-[#a855f7]/10 text-[#c084fc] rounded-xl border border-[#a855f7]/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] flex items-center justify-center ${isFullscreen ? 'p-1.5' : 'p-2.5'}`}>
            <Sliders size={isFullscreen ? 14 : 20} className="animate-pulse text-purple-400" />
          </div>
          <div>
            <h1 className={`font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-[#ccff00] tracking-wider transition-all ${isFullscreen ? 'text-xs md:text-sm' : 'text-sm md:text-lg'}`}>
              JRZ SCORE TGR • PANEL SEKRETARIS
            </h1>
            <p className="text-[7px] md:text-[8px] text-zinc-500 font-mono tracking-widest font-semibold uppercase">
              STANDAR RESMI IPSI 2026 &amp; PERSILAT • 100% OFFLINE SISTEM
            </p>
          </div>
        </div>

        {/* Right Side: Navigation Bar */}
        <div className="bg-[#0c0423]/90 border border-purple-500/20 p-1 rounded-xl flex items-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(204,255,0,0.15)] transition-all duration-300 relative overflow-hidden min-w-[320px] md:min-w-[480px]">
          {/* Subtle neon gradient accent light */}
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#ccff00]/5 via-purple-500/5 to-transparent pointer-events-none" />
          
          <button
            onClick={() => setIsRegistrationPageActive(false)}
            className="flex-1 py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border cursor-pointer bg-gradient-to-r from-purple-600 via-fuchsia-600 to-[#ccff00] text-slate-950 font-black border-transparent shadow-[0_0_10px_rgba(204,255,0,0.3)] hover:brightness-110 scale-[1.01]"
          >
            <Settings size={12} className="text-slate-950 stroke-[3]" />
            PARAMETER
          </button>

          <button
            onClick={() => {
              setRegistrationInitialTab("bagan_braket");
              setIsRegistrationPageActive(true);
            }}
            className="flex-1 py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border cursor-pointer bg-[#050212]/50 text-cyan-300 border-cyan-950/40 hover:text-cyan-200 hover:border-cyan-500/50 hover:bg-[#071329]"
          >
            <Trophy size={12} className="text-cyan-400" />
            BAGAN BRAKET
          </button>

          <button
            onClick={() => {
              setRegistrationInitialTab("input_data");
              setIsRegistrationPageActive(true);
            }}
            className="flex-1 py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border cursor-pointer bg-[#050212]/50 text-purple-300 border-purple-950/40 hover:text-[#ccff00] hover:border-[#ccff00]/40 hover:bg-[#0c0423]/80"
          >
            <Users size={12} className="text-purple-400" />
            INPUT DATA
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex-1 py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border cursor-pointer bg-[#050212]/50 text-cyan-300 border-cyan-950/40 hover:text-cyan-200 hover:border-cyan-500/50 hover:bg-[#071329]"
            title="Bagikan Tautan & QR Code ke Klien / Juri"
          >
            <Share2 size={12} className="text-cyan-400" />
            BAGIKAN
          </button>
        </div>
      </div>

      {/* 3. TWO COLUMN MAIN INTERFACE */}
      <div className={`print:hidden max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch pb-12 transition-all ${isFullscreen ? 'gap-3' : 'gap-6'}`}>
        
        {/* LEFT COLUMN: PARAMETERS & JADWAL GENERATOR (7 cols out of 12 width) */}
        <div className={`w-full lg:w-[58%] flex flex-col transition-all ${isFullscreen ? 'space-y-2.5' : 'space-y-3.5'}`}>
          
          {/* A. PARAMETER PERTANDINGAN */}
          <div className={`bg-purple-950/50 border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)] relative transition-all ${isFullscreen ? 'rounded-2xl p-4 space-y-3' : 'rounded-3xl p-6 md:p-8 space-y-5'}`}>
            
            <div className={`flex items-center gap-2 border-b border-purple-950/50 transition-all ${isFullscreen ? 'pb-2' : 'pb-3'}`}>
              <Settings className="text-purple-400" size={isFullscreen ? 15 : 18} />
              <h2 className={`font-black uppercase tracking-wider text-white transition-all ${isFullscreen ? 'text-[11px]' : 'text-xs md:text-sm'}`}>
                PARAMETER PERTANDINGAN
              </h2>
            </div>

            {/* Field 1: Nama Event */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                NAMA EVENT KEJUARAAN
              </label>
              <input 
                type="text" 
                value={tournamentName}
                onChange={(e) => {
                  setTournamentName(e.target.value);
                  syncConfigWithServer({ tournamentName: e.target.value });
                }}
                className={`w-full bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-sans tracking-wide transition-all uppercase ${isFullscreen ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-3 text-xs'}`}
                placeholder="GANTI NAMA KEJUARAAN PENCAK SILAT..."
              />
            </div>

            {/* Field 2 & 3: Tempat & Waktu (2 columns) */}
            <div className={`grid grid-cols-1 md:grid-cols-2 transition-all ${isFullscreen ? 'gap-2.5' : 'gap-4'}`}>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                  TEMPAT PELAKSANAAN
                </label>
                <input 
                  type="text" 
                  value={arena}
                  onChange={(e) => {
                    setArena(e.target.value);
                    syncConfigWithServer({ arena: e.target.value });
                  }}
                  className={`w-full bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-sans transition-all uppercase ${isFullscreen ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-3 text-xs'}`}
                  placeholder="Contoh: GELANGGANG A"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                  WAKTU PELAKSANAAN
                </label>
                <input 
                  type="text" 
                  value={waktuPelaksanaan}
                  onChange={(e) => {
                    setWaktuPelaksanaan(e.target.value);
                    localStorage.setItem("waktu_pelaksanaan", e.target.value);
                  }}
                  className={`w-full bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-sans transition-all uppercase ${isFullscreen ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-3 text-xs'}`}
                />
              </div>
            </div>

            {/* Field 4 & 5: Logo Sisi Kiri / Kanan with Drag-and-Drop */}
            <div className={`grid grid-cols-1 md:grid-cols-2 transition-all ${isFullscreen ? 'gap-2.5' : 'gap-4'}`}>
              
              {/* Logo Kiri */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                  LOGO SISI KIRI (MONITOR)
                </label>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleLogoDrop(e, "kiri")}
                  className={`bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl flex items-center transition-all ${isFullscreen ? 'p-2 gap-2' : 'p-3 gap-3'}`}
                >
                  {/* Thumbnail box */}
                  <div 
                    onClick={() => handleLogoClick("kiri")}
                    className={`rounded-lg bg-[#0a041c] border border-purple-950/60 flex items-center justify-center text-[9px] font-bold text-zinc-500 cursor-pointer overflow-hidden uppercase relative hover:border-purple-500 group transition-all ${isFullscreen ? 'h-10 w-10' : 'h-14 w-14'}`}
                  >
                    {logoKiri ? (
                      <img src={logoKiri} referrerPolicy="no-referrer" alt="Logo Kiri" className="h-full w-full object-contain" />
                    ) : (
                      <span className="group-hover:text-purple-400 transition-colors">KOSONG</span>
                    )}
                  </div>
                  
                  {/* Input path & Upload */}
                  <div className="flex-1 space-y-1.5">
                    <input 
                      type="text"
                      placeholder="Input path logo / Base64 / URL..."
                      value={logoKiri}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLogoKiri(val);
                        if (val) {
                          localStorage.setItem("logo_kiri", val);
                        } else {
                          localStorage.removeItem("logo_kiri");
                        }
                      }}
                      className="w-full bg-[#03010b] border border-purple-950/40 hover:border-purple-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200 focus:outline-none focus:border-purple-500 font-sans"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleLogoClick("kiri")}
                        className="flex-1 bg-[#150b3a] hover:bg-[#201254] text-[#c084fc] font-bold text-[9px] uppercase tracking-wider py-1 px-1.5 rounded-lg border border-purple-950 transition-colors flex items-center justify-center gap-1"
                      >
                        <Upload size={9} /> Upload
                      </button>
                      {logoKiri && (
                        <button
                          onClick={() => clearLogo("kiri")}
                          className="bg-red-950 hover:bg-red-900 text-red-400 text-[9px] px-1.5 rounded-lg"
                          title="Hapus Logo"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Kanan */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                  LOGO SISI KANAN (MONITOR)
                </label>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleLogoDrop(e, "kanan")}
                  className={`bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl flex items-center transition-all ${isFullscreen ? 'p-2 gap-2' : 'p-3 gap-3'}`}
                >
                  {/* Thumbnail box */}
                  <div 
                    onClick={() => handleLogoClick("kanan")}
                    className={`rounded-lg bg-[#0a041c] border border-purple-950/60 flex items-center justify-center text-[9px] font-bold text-zinc-500 cursor-pointer overflow-hidden uppercase relative hover:border-purple-500 group transition-all ${isFullscreen ? 'h-10 w-10' : 'h-14 w-14'}`}
                  >
                    {logoKanan ? (
                      <img src={logoKanan} referrerPolicy="no-referrer" alt="Logo Kanan" className="h-full w-full object-contain" />
                    ) : (
                      <span className="group-hover:text-purple-400 transition-colors">KOSONG</span>
                    )}
                  </div>
                  
                  {/* Input path & Upload */}
                  <div className="flex-1 space-y-1.5">
                    <input 
                      type="text"
                      placeholder="Input path logo / Base64 / URL..."
                      value={logoKanan}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLogoKanan(val);
                        if (val) {
                          localStorage.setItem("logo_kanan", val);
                        } else {
                          localStorage.removeItem("logo_kanan");
                        }
                      }}
                      className="w-full bg-[#03010b] border border-purple-950/40 hover:border-purple-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200 focus:outline-none focus:border-purple-500 font-sans"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleLogoClick("kanan")}
                        className="flex-1 bg-[#150b3a] hover:bg-[#201254] text-[#c084fc] font-bold text-[9px] uppercase tracking-wider py-1 px-1.5 rounded-lg border border-purple-950 transition-colors flex items-center justify-center gap-1"
                      >
                        <Upload size={9} /> Upload
                      </button>
                      {logoKanan && (
                        <button
                          onClick={() => clearLogo("kanan")}
                          className="bg-red-950 hover:bg-red-900 text-red-400 text-[9px] px-1.5 rounded-lg"
                          title="Hapus Logo"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Field 6 to 9: Partai Tanding (#), Tahap, Kelas, Kategori Usia (4 columns) */}
            <div className={`grid grid-cols-2 md:grid-cols-4 transition-all ${isFullscreen ? 'gap-2' : 'gap-3'}`}>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block font-mono truncate">
                  PARTAI TANDING (#)
                </label>
                <input 
                  type="text" 
                  value={partaiTanding}
                  onChange={(e) => {
                    setPartaiTanding(e.target.value);
                    syncConfigWithServer({ partaiTanding: e.target.value });
                  }}
                  className={`w-full bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl text-white text-center font-bold focus:outline-none focus:border-purple-500 uppercase transition-all ${isFullscreen ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-3 text-xs'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block font-mono truncate">
                  TAHAP PERTANDINGAN
                </label>
                <select
                  value={tahapPertandingan}
                  onChange={(e) => {
                    setTahapPertandingan(e.target.value);
                    syncConfigWithServer({ tahapPertandingan: e.target.value });
                  }}
                  className={`w-full bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-bold uppercase transition-all ${isFullscreen ? 'px-1.5 py-1.5 text-[10px]' : 'px-2 py-3 text-xs'}`}
                >
                  <option value="PENYISIHAN">PENYISIHAN</option>
                  <option value="PEREMPAT FINAL">PEREMPAT FINAL</option>
                  <option value="SEMIFINAL">SEMIFINAL</option>
                  <option value="FINAL">FINAL</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block font-mono truncate">
                  KELAS / NOMOR
                </label>
                <input 
                  type="text" 
                  value={kelasNomor}
                  onChange={(e) => {
                    setKelasNomor(e.target.value);
                    syncConfigWithServer({ kelasNomor: e.target.value });
                  }}
                  className={`w-full bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl text-white text-center font-bold focus:outline-none focus:border-purple-500 uppercase transition-all ${isFullscreen ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-3 text-xs'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block font-mono truncate">
                  KATEGORI USIA
                </label>
                <select
                  value={kategoriUsia}
                  onChange={(e) => {
                    setKategoriUsia(e.target.value);
                    syncConfigWithServer({ kategoriUsia: e.target.value });
                  }}
                  className={`w-full bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-bold uppercase transition-all ${isFullscreen ? 'px-1.5 py-1.5 text-[10px]' : 'px-2 py-3 text-xs'}`}
                >
                  <option value="DEWASA">DEWASA</option>
                  <option value="REMAJA">REMAJA</option>
                  <option value="PRA-REMAJA">PRA-REMAJA</option>
                  <option value="USIA DINI">USIA DINI</option>
                </select>
              </div>
            </div>

            {/* Field 10 & 11: Gender (Buttons) & Durasi Babak (Select) */}
            <div className={`grid grid-cols-1 md:grid-cols-2 transition-all ${isFullscreen ? 'gap-2.5' : 'gap-4'}`}>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                  GENDER (KATEGORI)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setGender("PUTRA");
                      syncConfigWithServer({ gender: "PUTRA" });
                    }}
                    className={`rounded-xl font-black tracking-widest uppercase transition-all ${isFullscreen ? 'py-1.5 px-2 text-[10px]' : 'py-3.5 px-4 text-xs'} ${
                      gender === "PUTRA" 
                        ? "bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-[#a78bfa]" 
                        : "bg-[#050212] border border-purple-950/60 text-zinc-400 hover:text-white"
                    }`}
                  >
                    PUTRA
                  </button>
                  <button
                    onClick={() => {
                      setGender("PUTRI");
                      syncConfigWithServer({ gender: "PUTRI" });
                    }}
                    className={`rounded-xl font-black tracking-widest uppercase transition-all ${isFullscreen ? 'py-1.5 px-2 text-[10px]' : 'py-3.5 px-4 text-xs'} ${
                      gender === "PUTRI" 
                        ? "bg-[#8b5cf6] text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-[#a78bfa]" 
                        : "bg-[#050212] border border-purple-950/60 text-zinc-400 hover:text-white"
                    }`}
                  >
                    PUTRI
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                  DURASI BABAK (TIMER)
                </label>
                <select
                  value={roundDuration}
                  onChange={(e) => {
                    const dur = Number(e.target.value);
                    setRoundDuration(dur);
                    syncConfigWithServer({ roundDuration: dur });
                  }}
                  className={`w-full bg-[#050212] border border-purple-950 hover:border-purple-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-bold uppercase font-mono transition-all ${isFullscreen ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-3.5 text-xs'}`}
                >
                  <option value={60}>01:00 MENIT</option>
                  <option value={90}>01:30 MENIT</option>
                  <option value={120}>02:00 MENIT</option>
                  <option value={150}>02:30 MENIT</option>
                  <option value={180}>03:00 MENIT</option>
                </select>
              </div>
            </div>

            {/* Redundansi Backup Status & Action */}
            <div className="border-t border-purple-950/40 pt-4 mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Shield className="text-emerald-400" size={12} />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
                    REDUNDANSI BACKUP LOKAL (AUTOSAVE)
                  </span>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              
              <div className="bg-[#050212] border border-purple-950/60 p-2.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="text-[10px] space-y-0.5">
                  <div className="text-zinc-400">
                    Status: <span className="text-emerald-400 font-extrabold font-mono">AKTIF & TERLINDUNGI</span>
                  </div>
                  {hasBackup ? (
                    <div className="text-zinc-300 text-[9px] truncate max-w-[280px]">
                      Partai: <span className="text-purple-300 font-semibold">{backupMatchInfo}</span> ({backupTime})
                    </div>
                  ) : (
                    <div className="text-zinc-500 text-[9px]">
                      Menunggu perubahan data pertandingan...
                    </div>
                  )}
                </div>
                
                {hasBackup && (
                  <button
                    type="button"
                    onClick={handleApplyRestore}
                    className="w-full sm:w-auto px-3 py-1.5 bg-purple-950/80 hover:bg-[#1a0e44] border border-purple-500/30 hover:border-purple-500/60 text-[#c084fc] font-black text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95"
                  >
                    Restore Manual
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* C. INDENTITAS ATLET (SUDUT BIRU & SUDUT MERAH) */}
          <div className={`bg-[#0c0423]/90 border border-purple-950/40 shadow-2xl relative transition-all ${isFullscreen ? 'rounded-2xl p-4 space-y-3' : 'rounded-3xl p-6 space-y-4'}`}>
            <div className={`flex items-center gap-2 border-b border-purple-950/50 transition-all ${isFullscreen ? 'pb-2' : 'pb-3'}`}>
              <Users className="text-purple-400" size={isFullscreen ? 15 : 18} />
              <h2 className={`font-black uppercase tracking-wider text-white transition-all ${isFullscreen ? 'text-[11px]' : 'text-xs md:text-sm'}`}>
                IDENTITAS ATLET BERTANDING
              </h2>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 transition-all ${isFullscreen ? 'gap-3' : 'gap-5'}`}>
              
              {/* SUDUT BIRU */}
              <div className={`bg-blue-950/10 border border-blue-900/30 rounded-2xl shadow-inner transition-all ${isFullscreen ? 'p-3 space-y-2' : 'p-4 space-y-3.5'}`}>
                <div className="flex justify-between items-center border-b border-blue-900/30 pb-1.5">
                  <span className="text-[10px] font-black tracking-wider text-blue-400 uppercase">
                    PESILAT SUDUT BIRU
                  </span>
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                </div>
                
                <div className="space-y-0.5">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase block font-mono">NAMA LENGKAP</label>
                  <input 
                    type="text" 
                    value={blueName} 
                    onChange={(e) => {
                      setBlueName(e.target.value);
                      syncConfigWithServer({ blueName: e.target.value });
                    }}
                    className={`w-full bg-[#050212] border border-blue-950 hover:border-blue-900 rounded-lg text-white font-semibold focus:outline-none uppercase transition-all ${isFullscreen ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2.5 text-xs'}`}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase block font-mono">KONTINGEN / PROVINSI</label>
                  <input 
                    type="text" 
                    value={blueContingent} 
                    onChange={(e) => {
                      setBlueContingent(e.target.value);
                      syncConfigWithServer({ blueContingent: e.target.value });
                    }}
                    className={`w-full bg-[#050212] border border-blue-950 hover:border-blue-900 rounded-lg text-white focus:outline-none uppercase transition-all ${isFullscreen ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2.5 text-xs'}`}
                  />
                </div>
              </div>

              {/* SUDUT MERAH */}
              <div className={`bg-red-950/10 border border-red-900/30 rounded-2xl shadow-inner transition-all ${isFullscreen ? 'p-3 space-y-2' : 'p-4 space-y-3.5'}`}>
                <div className="flex justify-between items-center border-b border-red-900/30 pb-1.5">
                  <span className="text-[10px] font-black tracking-wider text-red-400 uppercase">
                    PESILAT SUDUT MERAH
                  </span>
                  <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                </div>
                
                <div className="space-y-0.5">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase block font-mono">NAMA LENGKAP</label>
                  <input 
                    type="text" 
                    value={redName} 
                    onChange={(e) => {
                      setRedName(e.target.value);
                      syncConfigWithServer({ redName: e.target.value });
                    }}
                    className={`w-full bg-[#050212] border border-red-950 hover:border-red-900 rounded-lg text-white font-semibold focus:outline-none uppercase transition-all ${isFullscreen ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2.5 text-xs'}`}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase block font-mono">KONTINGEN / PROVINSI</label>
                  <input 
                    type="text" 
                    value={redContingent} 
                    onChange={(e) => {
                      setRedContingent(e.target.value);
                      syncConfigWithServer({ redContingent: e.target.value });
                    }}
                    className={`w-full bg-[#050212] border border-red-950 hover:border-red-900 rounded-lg text-white focus:outline-none uppercase transition-all ${isFullscreen ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2.5 text-xs'}`}
                  />
                </div>
              </div>

            </div>

            {/* MATCH CONTROL NAVIGATION BAR */}
            <div className="border-t border-purple-950/40 pt-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* PREV MATCH */}
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  disabled={!hasPrevMatch}
                  className={`flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl font-extrabold uppercase transition-all text-[10px] tracking-wider cursor-pointer select-none ${
                    hasPrevMatch
                      ? "border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-500/15 text-emerald-400 active:scale-98 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:border-emerald-500"
                      : "border-zinc-800/20 bg-zinc-950/10 text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  <ArrowLeft size={14} className={hasPrevMatch ? "text-emerald-400 animate-pulse" : ""} />
                  <span>PREV MATCH</span>
                </button>

                {/* CEK PARTAI INTERAKTIF (OVERLAY OPENER) */}
                <button
                  type="button"
                  onClick={() => {
                    const saved = localStorage.getItem("match_schedules");
                    if (saved) {
                      try {
                        setScheduleItems(JSON.parse(saved));
                      } catch (e) {
                        console.error(e);
                      }
                    }
                    setIsCekPartaiOverlayOpen(true);
                    setCekPartaiAthleteSearch("");
                    setShowCekPartaiResetConfirm(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-purple-500/30 px-4 py-2.5 rounded-xl font-extrabold uppercase transition-all text-[10px] tracking-wider cursor-pointer select-none bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-yellow-900/10 text-purple-200 hover:border-purple-500 hover:text-white hover:from-purple-900/40 hover:via-blue-900/40 hover:to-yellow-900/30 active:scale-98 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                >
                  <Search size={14} className="text-purple-400" />
                  <span>CEK PARTAI INTERAKTIF</span>
                </button>

                {/* NEXT MATCH */}
                <button
                  type="button"
                  onClick={handleNextMatch}
                  disabled={!hasNextMatch}
                  className={`flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl font-extrabold uppercase transition-all text-[10px] tracking-wider cursor-pointer select-none ${
                    hasNextMatch
                      ? "border-amber-500/40 bg-amber-950/20 hover:bg-amber-500/15 text-amber-400 active:scale-98 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:border-amber-500"
                      : "border-zinc-800/20 bg-zinc-950/10 text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  <span>NEXT MATCH</span>
                  <ArrowRight size={14} className={hasNextMatch ? "text-amber-400 animate-pulse" : ""} />
                </button>

              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: TIMER CONTROL & HISTORY (5 cols out of 12 width) */}
        <div className={`w-full lg:w-[42%] flex flex-col transition-all ${isFullscreen ? 'space-y-2.5' : 'space-y-3.5'}`}>
          
          {/* A. KONTROL UTAMA JALANNYA TANDING */}
          <div className={`bg-emerald-950/50 border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)] relative transition-all ${isFullscreen ? 'rounded-2xl p-4 space-y-3' : 'rounded-3xl p-6 md:p-8 space-y-5'}`}>
            
            <div className={`flex items-center gap-2 border-b border-emerald-500/30 transition-all ${isFullscreen ? 'pb-2' : 'pb-3'}`}>
              <Clock className="text-emerald-400" size={isFullscreen ? 15 : 18} />
              <h2 className={`font-black uppercase tracking-wider text-emerald-100 transition-all ${isFullscreen ? 'text-[11px]' : 'text-xs md:text-sm'}`}>
                KONTROL UTAMA JALANNYA TANDING
              </h2>
            </div>

            {/* Status Laga Bar */}
            <div className="bg-[#050212] border border-emerald-950/60 p-2 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase font-mono">STATUS LAGA:</span>
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                  <span className={`h-2 w-2 rounded-full ${state.isTimerRunning ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className={state.isTimerRunning ? "text-green-400" : "text-amber-400"}>
                    {state.isTimerRunning ? "LAGA JALAN / AKTIF" : "JEDA / BERHENTI"}
                  </span>
                </span>
              </div>
              <div className={`px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-widest shadow-md ${
                state.isPanelsLocked
                  ? "bg-red-950/60 border border-red-800 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                  : "bg-green-950/60 border border-green-800 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]"
              }`}>
                {state.isPanelsLocked ? "LOCKED" : "UNLOCKED"}
              </div>
            </div>

            {/* Play/Pause Main Actions (Mulai vs Reset) */}
            <div className={`grid grid-cols-2 transition-all ${isFullscreen ? 'gap-2' : 'gap-3'}`}>
              <button
                onClick={() => onTimerAction?.("unlock-panels")}
                className={`rounded-xl font-black uppercase tracking-widest flex items-center justify-center transition-all active:scale-95 border ${isFullscreen ? 'py-1.5 px-2 text-[9px] gap-1' : 'py-3 px-4 text-[10px] gap-1.5'} ${
                  !state.isPanelsLocked
                    ? "bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    : "bg-purple-950/40 hover:bg-[#1a0e44] text-purple-400 hover:text-purple-300 border-[#3b0764]/80 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                }`}
              >
                <Zap size={isFullscreen ? 11 : 12} />
                MULAI (BUKA KUNCI)
              </button>
              <button
                onClick={() => onTimerAction?.("lock-panels")}
                className={`rounded-xl font-black uppercase tracking-widest flex items-center justify-center transition-all active:scale-95 border ${isFullscreen ? 'py-1.5 px-2 text-[9px] gap-1' : 'py-3 px-4 text-[10px] gap-1.5'} ${
                  state.isPanelsLocked
                    ? "bg-red-950/60 border border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    : "bg-[#1f0e1d] border border-pink-950 hover:bg-[#2e152b] text-pink-400 hover:text-pink-300 shadow-[0_0_15px_rgba(219,39,119,0.1)]"
                }`}
              >
                <RotateCcw size={isFullscreen ? 11 : 12} /> RESET (RESET & KUNCI)
              </button>
            </div>

            {/* Glowing Massive Timer Count Box */}
            <div className={`bg-[#040110] border-2 border-purple-950/80 rounded-2xl text-center shadow-inner relative flex flex-col items-center justify-center transition-all ${isFullscreen ? 'py-3 px-3' : 'py-6 px-4'}`}>
              <div className={`font-black font-mono tracking-wider text-[#f59e0b] drop-shadow-[0_0_15px_rgba(245,158,11,0.65)] select-all leading-none animate-pulse transition-all ${isFullscreen ? 'text-2xl md:text-3xl' : 'text-4xl md:text-5xl lg:text-6xl'}`}>
                {formatTime(state.timeRemaining)}
              </div>
            </div>

            {/* Timer Sub-Controls (Play/Resume vs Reset Waktu) */}
            <div className={`grid grid-cols-2 transition-all ${isFullscreen ? 'gap-2' : 'gap-3'}`}>
              <button
                onClick={() => {
                  if (state.isPanelsLocked) return;
                  onTimerAction?.(state.isTimerRunning ? "pause" : "start");
                }}
                disabled={state.isPanelsLocked}
                className={`font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                  state.isPanelsLocked
                    ? "bg-zinc-850 border border-zinc-850 text-zinc-600"
                    : state.isTimerRunning
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black"
                    : "bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white"
                } ${isFullscreen ? 'py-1.5 text-[9px] gap-1' : 'py-3.5 text-[10px] gap-1.5'}`}
              >
                {state.isTimerRunning ? "⏸ JEDA / PAUSE" : "▶ PLAY / RESUME"}
              </button>
              <button
                onClick={() => onTimerAction?.("reset")}
                className={`bg-[#170e3c] border border-purple-900 hover:bg-[#25185d] text-purple-300 font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center ${isFullscreen ? 'py-1.5 text-[9px] gap-1' : 'py-3.5 text-[10px] gap-1.5'}`}
              >
                <RotateCcw size={isFullscreen ? 11 : 12} /> RESET WAKTU
              </button>
            </div>

            {/* Full Width Horn Signal (BELL / HORN) */}
            <button
              onClick={() => onSoundAction?.("buzzer")}
              className={`w-full bg-[#4f46e5] hover:bg-[#6366f1] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.35)] flex items-center justify-center relative active:scale-95 border border-indigo-400/20 ${isFullscreen ? 'py-1.5 text-[10px] gap-1' : 'py-3.5 text-xs gap-2'}`}
            >
              <Volume2 size={isFullscreen ? 13 : 15} /> BELL / HORN
              {!isFullscreen && (
                <span className="absolute right-4 text-[8px] font-mono font-extrabold bg-[#312e81] text-indigo-200 px-2 py-0.5 rounded border border-indigo-500/30 uppercase tracking-widest">
                  SHIFT
                </span>
              )}
            </button>

            {/* RESET PERTANDINGAN (RESET LAGA) button */}
            <button
              onClick={() => setShowResetMatchConfirm(true)}
              className={`w-full bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.05)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] flex items-center justify-center active:scale-95 border border-red-500/30 ${isFullscreen ? 'py-1.5 text-[9px] gap-1' : 'py-3.5 text-xs gap-2'}`}
            >
              <RotateCcw size={isFullscreen ? 11 : 12} /> RESET SKOR LAGA
            </button>

            {/* Round / Babak Selectors (B1, B2, B3) */}
            <div className={`grid grid-cols-3 transition-all ${isFullscreen ? 'gap-1.5' : 'gap-2'}`}>
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => onChangeRound?.(num)}
                  className={`rounded-xl font-black tracking-widest transition-all ${isFullscreen ? 'py-1.5 text-[10px]' : 'py-3 text-xs'} ${
                    state.round === num
                      ? "bg-[#8b5cf6] text-white shadow-[0_0_12px_rgba(139,92,246,0.5)] border border-purple-400"
                      : "bg-[#050212] border border-purple-950 text-zinc-500 hover:text-white"
                  }`}
                >
                  B{num}
                </button>
              ))}
            </div>

            {/* Round Transition Trigger Button */}
            {state.round < state.maxRound && (
              <button
                type="button"
                onClick={() => setIsRoundTransitionOverlayOpen(true)}
                className={`w-full bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-purple-500/20 ${isFullscreen ? 'py-1.5 text-[9px]' : 'py-3 text-[10px]'}`}
              >
                <Clock size={isFullscreen ? 11 : 13} /> CEK PERALIHAN BABAK B{state.round} → B{state.round + 1}
              </button>
            )}

          </div>

          {/* B. HISTORI HASIL TANDING */}
          <div className={`bg-[#0c0423]/90 border border-purple-950/40 shadow-2xl relative transition-all flex-grow flex-1 flex flex-col ${isFullscreen ? 'rounded-2xl p-4 space-y-2.5' : 'rounded-3xl p-6 space-y-4'}`}>
            
            <div className={`flex justify-between items-center border-b border-purple-950/50 transition-all shrink-0 ${isFullscreen ? 'pb-1.5' : 'pb-3'}`}>
              <div className="flex items-center gap-2">
                <List className="text-purple-400" size={isFullscreen ? 14 : 18} />
                <h2 className={`font-black uppercase tracking-wider text-white transition-all ${isFullscreen ? 'text-[11px]' : 'text-xs md:text-sm'}`}>
                  RIWAYAT ARSIP PARTAI
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Reset Completed Match History Button */}
                <button
                  onClick={() => setShowResetHistoryConfirm(true)}
                  className="flex items-center gap-1 text-[9px] font-mono font-extrabold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded border border-red-500/30 cursor-pointer"
                  title="Hapus Semua Riwayat Arsip"
                >
                  <Trash2 size={10} /> Reset
                </button>

                <button
                  onClick={() => setIsPdfDownloadOverlayOpen(true)}
                  className="flex items-center gap-1 text-[9px] font-mono font-extrabold text-yellow-400 hover:text-yellow-300 transition-colors uppercase tracking-wider bg-yellow-500/10 hover:bg-yellow-500/20 px-2.5 py-1 rounded border border-yellow-500/30 cursor-pointer"
                >
                  Unduh <span className="text-yellow-500">📄 PDF Histori</span>
                </button>
              </div>
            </div>

            {/* Reset History Confirmation Overlay */}
            {showResetHistoryConfirm && (
              <div className="bg-[#0b061e] border-2 border-red-500/50 p-4 rounded-2xl flex flex-col items-center gap-3.5 text-center animate-fade-in my-1 shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">Yakin ingin mereset?</span>
                <p className="text-[10px] text-zinc-300">Semua riwayat arsip partai akan dihapus permanen dari sistem.</p>
                <div className="flex gap-2 w-full max-w-xs mt-1">
                  <button
                    onClick={() => {
                      const updated = scheduleItems.filter(item => item.status !== "complete");
                      setScheduleItems(updated);
                      localStorage.setItem("match_schedules", JSON.stringify(updated));
                      setShowResetHistoryConfirm(false);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-extrabold text-[10px] py-2 rounded-lg transition-all border border-red-400/20 uppercase cursor-pointer"
                  >
                    Iya
                  </button>
                  <button
                    onClick={() => setShowResetHistoryConfirm(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-100 font-extrabold text-[10px] py-2 rounded-lg transition-all border border-zinc-600/20 uppercase cursor-pointer"
                  >
                    Batalkan
                  </button>
                </div>
              </div>
            )}

            {/* Completed match records search & filters */}
            {scheduleItems.filter(item => item.status === "complete").length > 0 && (
              <div className="flex flex-col gap-2 bg-[#0b041d]/70 p-2.5 rounded-2xl border border-purple-950/40 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400" size={12} />
                    <input
                      type="text"
                      placeholder="Cari nama pesilat..."
                      value={archiveSearchName}
                      onChange={(e) => setArchiveSearchName(e.target.value)}
                      className="w-full bg-[#050212] border border-purple-950/40 text-[10px] text-white pl-7 pr-6 py-1.5 rounded-lg focus:outline-none focus:border-purple-600 transition-all placeholder-zinc-500 font-sans"
                    />
                    {archiveSearchName && (
                      <button
                        onClick={() => setArchiveSearchName("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-[9px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400" size={12} />
                    <input
                      type="date"
                      value={archiveFilterDate}
                      onChange={(e) => setArchiveFilterDate(e.target.value)}
                      className="w-full bg-[#050212] border border-purple-950/40 text-[10px] text-white pl-7 pr-6 py-1.5 rounded-lg focus:outline-none focus:border-purple-600 transition-all placeholder-zinc-500 font-sans"
                      style={{ colorScheme: "dark" }}
                    />
                    {archiveFilterDate && (
                      <button
                        onClick={() => setArchiveFilterDate("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-[9px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                    Saringan: {
                      scheduleItems.filter(item => {
                        if (item.status !== "complete") return false;
                        const matchesName = archiveSearchName
                          ? (item.blueName || "").toLowerCase().includes(archiveSearchName.toLowerCase()) ||
                            (item.redName || "").toLowerCase().includes(archiveSearchName.toLowerCase())
                          : true;
                        const itemDate = item.completedAt || new Date().toISOString().split('T')[0];
                        const matchesDate = archiveFilterDate
                          ? itemDate === archiveFilterDate
                          : true;
                        return matchesName && matchesDate;
                      }).length
                    } dari {scheduleItems.filter(item => item.status === "complete").length} Partai Selesai
                  </span>
                  {(archiveSearchName || archiveFilterDate) && (
                    <button
                      onClick={() => {
                        setArchiveSearchName("");
                        setArchiveFilterDate("");
                      }}
                      className="text-[8px] font-mono font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Bersihkan Saringan
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Completed match records visual viewport */}
            <div className="bg-[#050212] border border-purple-950/60 p-2.5 rounded-2xl overflow-y-auto font-sans scrollbar-thin scrollbar-thumb-purple-950 transition-all flex-grow flex-1 min-h-[140px]">
              {scheduleItems.filter(item => item.status === "complete").length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[10px] text-zinc-600 uppercase tracking-widest text-center gap-1 py-4">
                  <span>BELUM ADA RIWAYAT PARTAI SELESAI</span>
                  <span className="text-[8px] text-zinc-700 font-normal">Selesaikan partai lalu umumkan pemenang untuk mengarsipkan.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
                  {(() => {
                    const filtered = scheduleItems.filter(item => {
                      if (item.status !== "complete") return false;
                      const matchesName = archiveSearchName
                        ? (item.blueName || "").toLowerCase().includes(archiveSearchName.toLowerCase()) ||
                          (item.redName || "").toLowerCase().includes(archiveSearchName.toLowerCase())
                        : true;
                      const itemDate = item.completedAt || new Date().toISOString().split('T')[0];
                      const matchesDate = archiveFilterDate
                        ? itemDate === archiveFilterDate
                        : true;
                      return matchesName && matchesDate;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="col-span-full h-full flex flex-col items-center justify-center text-[10px] text-zinc-500 uppercase tracking-widest text-center gap-1 py-8">
                          <span>TIDAK ADA DATA COCOK</span>
                          <span className="text-[8px] text-zinc-600 font-normal">Ubah filter pencarian nama atau tanggal arsip Anda.</span>
                        </div>
                      );
                    }

                    return filtered.map((item) => {
                      const isBlueWinner = item.winner === 1;
                      const isRedWinner = item.winner === 2;
                      const winnerName = isBlueWinner ? item.blueName : isRedWinner ? item.redName : "DRAW";
                      const winnerColorClass = isBlueWinner ? "text-blue-400" : isRedWinner ? "text-red-400" : "text-zinc-500";
                      const isExpanded = !!expandedArchivedPartai[item.partai];
                      
                      return (
                        <div key={item.partai} className="border border-purple-950/40 rounded-xl overflow-hidden bg-[#0a041c]/40 hover:bg-[#0a041c]/60 transition-all">
                          {/* Accordion Trigger Header */}
                          <button
                            onClick={() => setExpandedArchivedPartai(prev => ({ ...prev, [item.partai]: !prev[item.partai] }))}
                            className="w-full text-left text-[10px] hover:bg-purple-950/20 p-2.5 flex justify-between items-center transition-all cursor-pointer font-sans"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-yellow-400 font-black font-mono shrink-0">PARTAI {item.partai}</span>
                              <span className="text-zinc-500 font-mono shrink-0">•</span>
                              <span className="font-bold truncate text-zinc-200">
                                <span className="text-blue-400 font-bold">{item.blueName}</span> vs <span className="text-red-400 font-bold">{item.redName}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.completedAt && (
                                <span className="font-mono text-[7px] text-zinc-400 bg-purple-950/25 border border-purple-950/30 px-1 py-0.5 rounded">
                                  {new Date(item.completedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              <span className="text-[9px] font-bold font-mono text-purple-300 bg-purple-950/50 px-1.5 py-0.5 rounded">
                                {item.blueScore ?? 0} : {item.redScore ?? 0}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="text-purple-400 shrink-0" size={12} />
                              ) : (
                                <ChevronDown className="text-zinc-500 shrink-0" size={12} />
                              )}
                            </div>
                          </button>

                          {/* Dropdown Details Panel (Expanded View) */}
                          {isExpanded && (
                            <div className="p-2.5 bg-[#050212]/90 border-t border-purple-950/20 space-y-2 text-[9px] animate-fade-in">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] bg-purple-950/60 text-purple-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                  {item.kelas} • {item.gender} • {item.usia}
                                </span>
                                <span className="text-zinc-500 font-mono text-[8px] bg-black/40 px-1 py-0.5 rounded border border-purple-950/25 font-bold">
                                  {item.winnerDecision || "Menang Angka"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-zinc-300">
                                <div className="bg-blue-950/10 border border-blue-900/15 p-2 rounded-lg text-left">
                                  <span className="text-[8px] text-blue-400 font-bold block uppercase tracking-wider mb-0.5">Sudut Biru</span>
                                  <span className="font-bold text-zinc-100 block truncate text-[9.5px]">{item.blueName}</span>
                                  <span className="text-[7.5px] text-zinc-500 block truncate font-mono">{item.blueContingent}</span>
                                  <span className="text-[10px] font-black font-mono text-blue-400 mt-1 block">Skor: {item.blueScore ?? 0}</span>
                                </div>
                                <div className="bg-red-950/10 border border-red-900/15 p-2 rounded-lg text-right">
                                  <span className="text-[8px] text-red-400 font-bold block uppercase tracking-wider mb-0.5">Sudut Merah</span>
                                  <span className="font-bold text-zinc-100 block truncate text-[9.5px]">{item.redName}</span>
                                  <span className="text-[7.5px] text-zinc-500 block truncate font-mono">{item.redContingent}</span>
                                  <span className="text-[10px] font-black font-mono text-red-400 mt-1 block">Skor: {item.redScore ?? 0}</span>
                                </div>
                              </div>

                              <div className="text-[8.5px] flex justify-between items-center px-1 pt-1 border-t border-purple-950/10 text-zinc-400">
                                <span>
                                  Pemenang: <strong className={`${winnerColorClass} uppercase font-extrabold`}>{winnerName}</strong>
                                </span>
                                {item.completedAt && (
                                  <span className="font-mono text-[7.5px] text-zinc-500 font-bold uppercase">
                                    Tgl Selesai: {new Date(item.completedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

          </div>

          {/* C. VISUALISASI ANALISIS SKOR LAGA (REMOVED BY USER REQUEST) */}
          {false && (
          <div className="bg-[#110724]/90 backdrop-blur-sm border border-purple-900/40 shadow-2xl relative transition-all rounded-3xl p-6 space-y-4">
            {/* Top Linear Gradient Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-red-500/20 via-purple-500 to-blue-500/20 rounded-t-3xl" />

            {/* Header: Title and Interactive Tabs */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-purple-900/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-950/40 p-2 border border-purple-800/30 rounded-xl">
                  <BarChart3 className="text-purple-400" size={18} />
                </div>
                <div>
                  <h2 className="font-sans font-black text-xs md:text-sm uppercase tracking-wider text-white">
                    VISUALISASI ANALISIS SKOR LAGA
                  </h2>
                  <span className="text-zinc-500 block text-[8px] font-normal font-mono uppercase tracking-normal">
                    Statistik Perolehan Nilai Kedua Pesilat Per Ronde Resmi IPSI
                  </span>
                </div>
              </div>

              {/* Multi-View Selector Tabs */}
              <div className="flex flex-wrap bg-[#050212] border border-purple-950/40 rounded-[20px] sm:rounded-full p-1 self-stretch lg:self-auto justify-center sm:justify-start gap-1 sm:gap-0">
                <button
                  onClick={() => setActiveChartTab("per_ronde")}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === "per_ronde"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <BarChart3 size={11} /> PER RONDE
                </button>
                <button
                  onClick={() => setActiveChartTab("akumulatif")}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === "akumulatif"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <TrendingUp size={11} /> AKUMULATIF
                </button>
                <button
                  onClick={() => setActiveChartTab("tipe_aksi")}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === "tipe_aksi"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Layers size={11} /> TIPE AKSI
                </button>
                <button
                  onClick={() => setActiveChartTab("detail_ronde")}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === "detail_ronde"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Activity size={11} /> RINGKASAN AKSI
                </button>
              </div>
            </div>

            {/* Parse Logs dynamically */}
            {(() => {
              const matchLogs = parseActionLogsToMatchLogs(state.actionLogs);
              const isEmptyState = matchLogs.length <= 1;

              // Render empty state if match logs are empty
              if (isEmptyState) {
                return (
                  <div className="h-[280px] w-full flex flex-col items-center justify-center text-center p-6 border border-purple-900/20 bg-purple-950/10 rounded-2xl">
                    <Info className="text-purple-400/60 animate-pulse mb-3" size={36} />
                    <p className="text-[11px] text-zinc-400 max-w-md italic font-sans">
                      Belum ada aksi poin dalam laga... Data grafik otomatis diperbarui setelah wasit/juri memvalidasi nilai tanding.
                    </p>
                  </div>
                );
              }

              // Custom Tooltip component for Recharts
              const CustomTooltip = ({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#120729]/95 border border-purple-800/60 p-2.5 rounded-xl text-[10px] shadow-2xl backdrop-blur-sm">
                      <p className="font-bold text-purple-300 mb-1.5 font-mono">{label}</p>
                      <div className="space-y-1">
                        {payload.map((entry: any, index: number) => {
                          const isBlue = entry.dataKey === "blue" || entry.name?.toLowerCase().includes("biru") || entry.color === "#3b82f6";
                          const val = entry.value;
                          const formattedVal = val > 0 ? `+${val}` : `${val}`;
                          const nameLabel = isBlue ? (state.athleteBlue.name || "SUDUT BIRU") : (state.athleteRed.name || "SUDUT MERAH");
                          return (
                            <div key={index} className="flex justify-between items-center gap-4 font-mono">
                              <span className={isBlue ? "text-blue-400 font-bold" : "text-red-400 font-bold"}>
                                {nameLabel}:
                              </span>
                              <span className={isBlue ? "text-blue-300 font-black" : "text-red-300 font-black"}>
                                {formattedVal}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              };

              // Chart Renderer based on activeChartTab
              return (
                <div className="space-y-6">
                  {/* Custom Centered Legend Header */}
                  <div className="flex justify-center items-center gap-6 text-[10px] font-black tracking-widest uppercase font-sans pt-1">
                    <span className="flex items-center gap-2 text-blue-400">
                      <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" /> {state.athleteBlue.name || "EKO WAHYUDI"}
                    </span>
                    <span className="flex items-center gap-2 text-red-400">
                      <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" /> {state.athleteRed.name || "FAJAR NUGRAHA"}
                    </span>
                  </div>

                  {activeChartTab === "detail_ronde" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-h-[280px]">
                      {/* Pukulan Chart */}
                      <div className="bg-[#0b031d]/70 border border-purple-950/40 rounded-2xl p-4 flex flex-col h-[280px] hover:border-purple-800/40 transition-all duration-300">
                        <div className="flex justify-between items-center mb-2 border-b border-purple-950/30 pb-2">
                          <span className="text-[10px] font-black tracking-wider uppercase text-purple-300">Poin Pukulan (+1)</span>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">Real-Time</span>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: "Ronde 1", blue: (state.roundScores?.[1]?.blue.pukulan ?? 0) * 1, red: (state.roundScores?.[1]?.red.pukulan ?? 0) * 1 },
                              { name: "Ronde 2", blue: (state.roundScores?.[2]?.blue.pukulan ?? 0) * 1, red: (state.roundScores?.[2]?.red.pukulan ?? 0) * 1 },
                              { name: "Ronde 3", blue: (state.roundScores?.[3]?.blue.pukulan ?? 0) * 1, red: (state.roundScores?.[3]?.red.pukulan ?? 0) * 1 }
                            ]} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#22113a" />
                              <XAxis dataKey="name" stroke="#6d28d9" fontSize={8} tickLine={false} />
                              <YAxis stroke="#6d28d9" fontSize={8} tickLine={false} allowDecimals={false} />
                              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                              <Bar dataKey="blue" fill="#3b82f6" radius={[3, 3, 0, 0]} name={state.athleteBlue.name || "SUDUT BIRU"} />
                              <Bar dataKey="red" fill="#ef4444" radius={[3, 3, 0, 0]} name={state.athleteRed.name || "SUDUT MERAH"} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Tendangan Chart */}
                      <div className="bg-[#0b031d]/70 border border-purple-950/40 rounded-2xl p-4 flex flex-col h-[280px] hover:border-purple-800/40 transition-all duration-300">
                        <div className="flex justify-between items-center mb-2 border-b border-purple-950/30 pb-2">
                          <span className="text-[10px] font-black tracking-wider uppercase text-purple-300">Poin Tendangan (+2)</span>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">Real-Time</span>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: "Ronde 1", blue: (state.roundScores?.[1]?.blue.tendangan ?? 0) * 2, red: (state.roundScores?.[1]?.red.tendangan ?? 0) * 2 },
                              { name: "Ronde 2", blue: (state.roundScores?.[2]?.blue.tendangan ?? 0) * 2, red: (state.roundScores?.[2]?.red.tendangan ?? 0) * 2 },
                              { name: "Ronde 3", blue: (state.roundScores?.[3]?.blue.tendangan ?? 0) * 2, red: (state.roundScores?.[3]?.red.tendangan ?? 0) * 2 }
                            ]} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#22113a" />
                              <XAxis dataKey="name" stroke="#6d28d9" fontSize={8} tickLine={false} />
                              <YAxis stroke="#6d28d9" fontSize={8} tickLine={false} allowDecimals={false} />
                              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                              <Bar dataKey="blue" fill="#3b82f6" radius={[3, 3, 0, 0]} name={state.athleteBlue.name || "SUDUT BIRU"} />
                              <Bar dataKey="red" fill="#ef4444" radius={[3, 3, 0, 0]} name={state.athleteRed.name || "SUDUT MERAH"} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Jatuhan Chart */}
                      <div className="bg-[#0b031d]/70 border border-purple-950/40 rounded-2xl p-4 flex flex-col h-[280px] hover:border-purple-800/40 transition-all duration-300">
                        <div className="flex justify-between items-center mb-2 border-b border-purple-950/30 pb-2">
                          <span className="text-[10px] font-black tracking-wider uppercase text-purple-300">Poin Jatuhan (+3)</span>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">Real-Time</span>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: "Ronde 1", blue: (state.roundScores?.[1]?.blue.jatuhan ?? 0) * 3, red: (state.roundScores?.[1]?.red.jatuhan ?? 0) * 3 },
                              { name: "Ronde 2", blue: (state.roundScores?.[2]?.blue.jatuhan ?? 0) * 3, red: (state.roundScores?.[2]?.red.jatuhan ?? 0) * 3 },
                              { name: "Ronde 3", blue: (state.roundScores?.[3]?.blue.jatuhan ?? 0) * 3, red: (state.roundScores?.[3]?.red.jatuhan ?? 0) * 3 }
                            ]} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#22113a" />
                              <XAxis dataKey="name" stroke="#6d28d9" fontSize={8} tickLine={false} />
                              <YAxis stroke="#6d28d9" fontSize={8} tickLine={false} allowDecimals={false} />
                              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                              <Bar dataKey="blue" fill="#3b82f6" radius={[3, 3, 0, 0]} name={state.athleteBlue.name || "SUDUT BIRU"} />
                              <Bar dataKey="red" fill="#ef4444" radius={[3, 3, 0, 0]} name={state.athleteRed.name || "SUDUT MERAH"} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {(() => {
                          if (activeChartTab === "per_ronde") {
                            const perRondeData = [
                              {
                                name: "Ronde 1",
                                blue: state.roundScores?.[1]?.blue.total ?? 0,
                                red: state.roundScores?.[1]?.red.total ?? 0,
                              },
                              {
                                name: "Ronde 2",
                                blue: state.roundScores?.[2]?.blue.total ?? 0,
                                red: state.roundScores?.[2]?.red.total ?? 0,
                              },
                              {
                                name: "Ronde 3",
                                blue: state.roundScores?.[3]?.blue.total ?? 0,
                                red: state.roundScores?.[3]?.red.total ?? 0,
                              }
                            ];

                            return (
                              <BarChart data={perRondeData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#22113a" />
                                <XAxis dataKey="name" stroke="#6d28d9" fontSize={9} tickLine={false} fontStyle="italic" />
                                <YAxis stroke="#6d28d9" fontSize={10} tickLine={false} />
                                <ReferenceLine y={0} stroke="#4c1d95" />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                <Bar dataKey="blue" fill="#3b82f6" radius={[4, 4, 0, 0]} name={state.athleteBlue.name || "SUDUT BIRU"} />
                                <Bar dataKey="red" fill="#ef4444" radius={[4, 4, 0, 0]} name={state.athleteRed.name || "SUDUT MERAH"} />
                              </BarChart>
                            );
                          } else if (activeChartTab === "akumulatif") {
                            const r1Blue = state.roundScores?.[1]?.blue.total ?? 0;
                            const r1Red = state.roundScores?.[1]?.red.total ?? 0;
                            const r2Blue = state.roundScores?.[2]?.blue.total ?? 0;
                            const r2Red = state.roundScores?.[2]?.red.total ?? 0;
                            const r3Blue = state.roundScores?.[3]?.blue.total ?? 0;
                            const r3Red = state.roundScores?.[3]?.red.total ?? 0;

                            const akumulatifData = [
                              { name: "Mulai", blue: 0, red: 0 },
                              { name: "Ronde 1", blue: r1Blue, red: r1Red },
                              { name: "Ronde 2", blue: r1Blue + r2Blue, red: r1Red + r2Red },
                              { name: "Ronde 3", blue: r1Blue + r2Blue + r3Blue, red: r1Red + r2Red + r3Red }
                            ];

                            return (
                              <AreaChart data={akumulatifData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                                <defs>
                                  <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#22113a" />
                                <XAxis dataKey="name" stroke="#6d28d9" fontSize={9} tickLine={false} />
                                <YAxis stroke="#6d28d9" fontSize={10} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="blue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBlue)" name={state.athleteBlue.name || "SUDUT BIRU"} strokeWidth={2} />
                                <Area type="monotone" dataKey="red" stroke="#ef4444" fillOpacity={1} fill="url(#colorRed)" name={state.athleteRed.name || "SUDUT MERAH"} strokeWidth={2} />
                              </AreaChart>
                            );
                          } else {
                            // Tipe Aksi breakdown
                            const bPunch = matchLogs.filter(l => l.fighter === "BLUE" && l.type === "PUNCH").reduce((sum, l) => sum + l.points, 0);
                            const rPunch = matchLogs.filter(l => l.fighter === "RED" && l.type === "PUNCH").reduce((sum, l) => sum + l.points, 0);

                            const bKick = matchLogs.filter(l => l.fighter === "BLUE" && l.type === "KICK").reduce((sum, l) => sum + l.points, 0);
                            const rKick = matchLogs.filter(l => l.fighter === "RED" && l.type === "KICK").reduce((sum, l) => sum + l.points, 0);

                            const bDrop = matchLogs.filter(l => l.fighter === "BLUE" && l.type === "DROP").reduce((sum, l) => sum + l.points, 0);
                            const rDrop = matchLogs.filter(l => l.fighter === "RED" && l.type === "DROP").reduce((sum, l) => sum + l.points, 0);

                            const bLock = matchLogs.filter(l => l.fighter === "BLUE" && l.type === "LOCK").reduce((sum, l) => sum + l.points, 0);
                            const rLock = matchLogs.filter(l => l.fighter === "RED" && l.type === "LOCK").reduce((sum, l) => sum + l.points, 0);

                            const bPenalty = matchLogs.filter(l => l.fighter === "BLUE" && l.type === "PENALTY").reduce((sum, l) => sum + l.points, 0);
                            const rPenalty = matchLogs.filter(l => l.fighter === "RED" && l.type === "PENALTY").reduce((sum, l) => sum + l.points, 0);

                            const tipeAksiData = [
                              { name: "Pukulan (+1)", blue: bPunch, red: rPunch },
                              { name: "Tendangan (+2)", blue: bKick, red: rKick },
                              { name: "Jatuhan (+3)", blue: bDrop, red: rDrop },
                              { name: "Kuncian (+3)", blue: bLock, red: rLock },
                              { name: "Pelanggaran (-)", blue: bPenalty, red: rPenalty }
                            ];

                            return (
                              <BarChart data={tipeAksiData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#22113a" />
                                <XAxis dataKey="name" stroke="#6d28d9" fontSize={9} tickLine={false} />
                                <YAxis stroke="#6d28d9" fontSize={10} tickLine={false} />
                                <ReferenceLine y={0} stroke="#4c1d95" />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                                <Bar dataKey="blue" fill="#3b82f6" radius={[4, 4, 0, 0]} name={state.athleteBlue.name || "SUDUT BIRU"} />
                                <Bar dataKey="red" fill="#ef4444" radius={[4, 4, 0, 0]} name={state.athleteRed.name || "SUDUT MERAH"} />
                              </BarChart>
                            );
                          }
                        })()}
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Bento Grid Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: Penguasaan Ronde */}
                    {(() => {
                      let redWins = 0;
                      let blueWins = 0;
                      let draws = 0;

                      for (let r = 1; r <= 3; r++) {
                        const b = state.roundScores?.[r]?.blue.total ?? 0;
                        const redVal = state.roundScores?.[r]?.red.total ?? 0;
                        if (b > redVal) blueWins++;
                        else if (redVal > b) redWins++;
                        else draws++;
                      }

                      let dominanceTitle = "RONDE SEIMBANG";
                      let dominanceSub = `SAPU RONDE: MERAH ${redWins} - BIRU ${blueWins}`;

                      if (blueWins > redWins) {
                        dominanceTitle = `BIRU DOMINAN (${blueWins}/3 Ronde)`;
                      } else if (redWins > blueWins) {
                        dominanceTitle = `MERAH DOMINAN (${redWins}/3 Ronde)`;
                      } else if (draws > 0) {
                        dominanceTitle = `RONDE SEIMBANG (${draws} SERI)`;
                      }

                      return (
                        <div className="bg-[#0c0423]/60 border border-purple-900/20 rounded-2xl p-4 flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-purple-800/40 transition-all duration-300">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Trophy className="text-yellow-500" size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">PENGUASAAN RONDE</span>
                          </div>
                          <div>
                            <p className="text-white text-sm md:text-base font-black uppercase tracking-tight font-mono">
                              {dominanceTitle}
                            </p>
                            <p className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5 font-mono">
                              {dominanceSub}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Card 2: Ronde Teraktif */}
                    {(() => {
                      const r1P = matchLogs.filter(l => l.round === 1).reduce((sum, l) => sum + Math.abs(l.points), 0);
                      const r2P = matchLogs.filter(l => l.round === 2).reduce((sum, l) => sum + Math.abs(l.points), 0);
                      const r3P = matchLogs.filter(l => l.round === 3).reduce((sum, l) => sum + Math.abs(l.points), 0);

                      let activeRoundNum = 1;
                      let maxPoints = r1P;

                      if (r2P > maxPoints) {
                        activeRoundNum = 2;
                        maxPoints = r2P;
                      }
                      if (r3P > maxPoints) {
                        activeRoundNum = 3;
                        maxPoints = r3P;
                      }

                      return (
                        <div className="bg-[#0c0423]/60 border border-purple-900/20 rounded-2xl p-4 flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-purple-800/40 transition-all duration-300">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Zap className="text-orange-400" size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">RONDE TERAKTIF</span>
                          </div>
                          <div>
                            <p className="text-white text-sm md:text-base font-black uppercase tracking-tight font-mono">
                              RONDE {activeRoundNum} ({maxPoints} POIN)
                            </p>
                            <p className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5 font-mono">
                              OLEH DENGAN POIN TERBESAR RONDE INI
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Card 3: Dampak Pelanggaran */}
                    {(() => {
                      const bPen = state.penalties?.blue || { binaan: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 };
                      const rPen = state.penalties?.red || { binaan: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 };

                      const getCount = (p: typeof bPen) => {
                        let cnt = 0;
                        if (p.binaan > 0) cnt += p.binaan;
                        if (p.teguran1) cnt += 1;
                        if (p.teguran2) cnt += 1;
                        if (p.peringatan1) cnt += 1;
                        if (p.peringatan2) cnt += 1;
                        if (p.peringatan3) cnt += 1;
                        cnt += p.keluarGelanggang;
                        return cnt;
                      };

                      const bCount = getCount(bPen);
                      const rCount = getCount(rPen);

                      return (
                        <div className="bg-[#0c0423]/60 border border-purple-900/20 rounded-2xl p-4 flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-purple-800/40 transition-all duration-300">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <AlertTriangle className="text-rose-500" size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">DAMPAK PELANGGARAN</span>
                          </div>
                          <div>
                            <p className="text-white text-sm md:text-base font-black uppercase tracking-tight font-mono">
                              M:{rCount}X • B:{bCount}X
                            </p>
                            <p className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5 font-mono">
                              TOTAL DEDUKSI POIN PELANGGARAN TEREKAM DI DATABASE RESMI
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}

            {/* Validation Footnote */}
            <div className="bg-[#050212]/40 border border-purple-950/40 rounded-xl p-3 flex items-center gap-2.5 text-[8.5px] font-mono text-zinc-400">
              <AlertTriangle className="text-amber-500 shrink-0" size={14} />
              <span className="leading-relaxed">
                POIN DIHITUNG REAL-TIME BERDASARKAN LOG KONSENSUS WASIT JURI 1, 2, 3 DAN PENALTI KETUA PERTANDINGAN SESUAI KETETAPAN IPSI 2022.
              </span>
            </div>
          </div>
          )}

        </div>

      </div>

      {/* =========================================================================
          MODAL OVERLAY 1: GENERATOR DAN PARAMETER JADWAL PERTANDINGAN
          ========================================================================= */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0423] border border-purple-900 rounded-3xl p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-[0_0_50px_rgba(139,92,246,0.15)]">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-purple-950/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#a855f7]/15 p-3 rounded-2xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <Calendar className="text-purple-400" size={24} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 uppercase tracking-wider">
                    GENERATOR DAN PARAMETER JADWAL PERTANDINGAN
                  </h3>
                  <p className="text-[10px] md:text-xs text-zinc-400 mt-0.5">
                    Unggah berkas jadwal pertandingan (.xlsx / .csv), edit data secara presisi, lalu gunakan rincian partai langsung di lapangan.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsGeneratorOpen(false)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg h-7 w-7 flex items-center justify-center font-bold text-sm shadow-md transition-all duration-150"
                title="Tutup"
              >
                ✕
              </button>
            </div>

            {/* UNGGAH SPREADSHEET JADWAL PARTAI */}
            <div className="bg-[#050212]/60 border border-purple-950/80 rounded-2xl p-3 md:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  UNGGAH SPREADSHEET JADWAL PARTAI
                </h4>
                <p className="text-[10px] md:text-xs text-zinc-400 leading-relaxed max-w-xl">
                  Pastikan kolom spreadsheet mengandung: Partai, Kelas, Gender, Kategori Usia, Tahap, Nama Biru, Kontingen Biru, Nama Merah, Kontingen Merah
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5">
                {/* GELANGGANG select */}
                <div className="relative">
                  <select
                    value={selectedGelanggang}
                    onChange={(e) => setSelectedGelanggang(e.target.value)}
                    className="bg-[#150a3a] border border-purple-900 text-[#d8b4fe] font-black text-[9px] md:text-[10px] uppercase px-2.5 py-1.5 rounded-lg focus:outline-none appearance-none pr-8 cursor-pointer"
                  >
                    <option value="GELANGGANG I">GELANGGANG: GELANGGANG I</option>
                    <option value="GELANGGANG II">GELANGGANG: GELANGGANG II</option>
                    <option value="GELANGGANG III">GELANGGANG: GELANGGANG III</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#d8b4fe] text-[8px]">
                    ▼
                  </div>
                </div>

                {/* UNDUH TEMPLATE button */}
                <button
                  onClick={handleDownloadTemplate}
                  className="border border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 font-bold text-[9px] md:text-[10px] uppercase px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Download size={11} /> UNDUH TEMPLATE
                </button>

                {/* KOSONGKAN JADWAL button */}
                <button
                  onClick={() => {
                    if (confirm("Kosongkan seluruh daftar jadwal pertandingan?")) {
                      setScheduleItems([]);
                      localStorage.removeItem("match_schedules");
                    }
                  }}
                  className="border border-red-500/50 hover:bg-red-500/10 text-red-400 font-bold text-[9px] md:text-[10px] uppercase px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={11} /> KOSONGKAN JADWAL
                </button>

                {/* IMPOR FILE JADWAL button */}
                <label className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-[9px] md:text-[10px] uppercase px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  <Upload size={11} /> IMPOR FILE JADWAL
                  <input 
                    type="file" 
                    accept=".csv,.txt" 
                    className="hidden" 
                    onChange={handleImportCSV} 
                  />
                </label>

                {/* EKSPOR DATA TERBARU button */}
                <button
                  onClick={handleExportCurrentSchedule}
                  className="border border-purple-500/50 hover:bg-purple-500/10 text-purple-300 font-bold text-[9px] md:text-[10px] uppercase px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  title="Ekspor seluruh jadwal tanding terbaru ke file Excel/CSV"
                >
                  <FileSpreadsheet size={11} /> EKSPOR JADWAL (.CSV)
                </button>
              </div>
            </div>

            {/* DAFTAR JADWAL PERTANDINGAN YANG TERBUKA */}
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0a0521] p-3 rounded-2xl border border-purple-950/60">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <List size={14} className="text-purple-400" /> DAFTAR JADWAL PERTANDINGAN YANG TERBUKA
                  </h4>
                  <p className="text-[9px] text-zinc-400 uppercase font-mono tracking-wider">
                    Total: {scheduleItems.length} Partai | Terfilter: {filteredScheduleItems.length} Partai
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAutoGenerateScheduler}
                    className="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-md border border-purple-500/30"
                  >
                    <Zap size={11} /> AUTO-GENERATE JADWAL
                  </button>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={scheduleSearch}
                      onChange={(e) => {
                        setScheduleSearch(e.target.value);
                        setSchedulePage(1); // reset to page 1 on search
                      }}
                      placeholder="Cari atlet, kontingen, kelas..."
                      className="bg-[#050212] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-1.5 pl-8 text-[10px] text-white placeholder-zinc-500 focus:outline-none w-52 transition-all font-medium"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
                    {scheduleSearch && (
                      <button
                        onClick={() => {
                          setScheduleSearch("");
                          setSchedulePage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white font-black text-[9px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const newItem = {
                        partai: (scheduleItems.length + 1).toString(),
                        kelas: "A",
                        gender: "PUTRA",
                        usia: "REMAJA",
                        tahapan: "PENYISIHAN",
                        blueName: "PESILAT BARU",
                        blueContingent: "KONTINGEN",
                        redName: "PESILAT BARU",
                        redContingent: "KONTINGEN"
                      };
                      const updated = [...scheduleItems, newItem];
                      setScheduleItems(updated);
                      // Go to the last page where the new item is added
                      const lastPage = Math.ceil(updated.length / itemsPerPage);
                      setSchedulePage(lastPage);
                    }}
                    className="bg-[#0284c7] hover:bg-sky-600 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    + TAMBAH BARIS PARTAI
                  </button>
                </div>
              </div>

              {/* TABLE */}
              <div className="border border-purple-950/80 rounded-2xl overflow-hidden bg-[#050212]/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10px] md:text-xs">
                    <thead>
                      <tr className="bg-[#0e0730] text-zinc-400 font-black border-b border-purple-950/80 uppercase">
                        <th className="p-1.5 text-center w-[7%]">PARTAI</th>
                        <th className="p-1.5 text-center w-[8%]">KELAS</th>
                        <th className="p-1.5 text-center w-[12%]">GENDER</th>
                        <th className="p-1.5 text-center w-[12%]">USIA</th>
                        <th className="p-1.5 text-center w-[12%]">TAHAPAN</th>
                        <th className="p-1.5 w-[22%]">SUDUT BIRU (ATLET & REGU)</th>
                        <th className="p-1.5 w-[22%]">SUDUT MERAH (ATLET & REGU)</th>
                        <th className="p-1.5 text-center w-[15%]">FITUR KONTROL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/40">
                      {paginatedScheduleItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-zinc-500 italic uppercase">
                            {scheduleSearch ? "Tidak ada partai yang sesuai dengan pencarian." : "Belum ada jadwal pertandingan terbuka. Silakan impor atau tambah baris secara manual."}
                          </td>
                        </tr>
                      ) : (
                        paginatedScheduleItems.map((item) => (
                          <tr key={item.originalIndex} className={`transition-colors ${item.status === 'complete' ? 'bg-[#0f172a]/20 opacity-70 border-l-4 border-l-emerald-500' : 'hover:bg-purple-950/10'}`}>
                            {/* PARTAI */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={item.partai}
                                disabled={item.status === "complete"}
                                onChange={(e) => {
                                  const updated = [...scheduleItems];
                                  updated[item.originalIndex].partai = e.target.value;
                                  setScheduleItems(updated);
                                }}
                                className="w-full bg-[#050212] border border-purple-950 rounded-md py-0.5 px-1.5 text-center text-white font-bold text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* KELAS */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={item.kelas}
                                disabled={item.status === "complete"}
                                onChange={(e) => {
                                  const updated = [...scheduleItems];
                                  updated[item.originalIndex].kelas = e.target.value;
                                  setScheduleItems(updated);
                                }}
                                className="w-full bg-[#050212] border border-purple-950 rounded-md py-0.5 px-1.5 text-center text-white font-bold uppercase text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* GENDER */}
                            <td className="p-1">
                              <select
                                value={item.gender}
                                disabled={item.status === "complete"}
                                onChange={(e) => {
                                  const updated = [...scheduleItems];
                                  updated[item.originalIndex].gender = e.target.value as "PUTRA" | "PUTRI";
                                  setScheduleItems(updated);
                                }}
                                className="w-full bg-[#050212] border border-purple-950 rounded-md py-0.5 px-1 text-center text-white font-bold uppercase cursor-pointer text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="PUTRA">PUTRA</option>
                                <option value="PUTRI">PUTRI</option>
                              </select>
                            </td>

                            {/* USIA */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={item.usia}
                                disabled={item.status === "complete"}
                                onChange={(e) => {
                                  const updated = [...scheduleItems];
                                  updated[item.originalIndex].usia = e.target.value;
                                  setScheduleItems(updated);
                                }}
                                className="w-full bg-[#050212] border border-purple-950 rounded-md py-0.5 px-1.5 text-center text-white font-bold uppercase text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* TAHAPAN */}
                            <td className="p-1">
                              <input
                                type="text"
                                value={item.tahapan}
                                disabled={item.status === "complete"}
                                onChange={(e) => {
                                  const updated = [...scheduleItems];
                                  updated[item.originalIndex].tahapan = e.target.value;
                                  setScheduleItems(updated);
                                }}
                                className="w-full bg-[#050212] border border-purple-950 rounded-md py-0.5 px-1.5 text-center text-white font-bold uppercase text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* BLUE ATHLETE (Card box) */}
                            <td className="p-1">
                              <div className={`border rounded-lg p-1 space-y-0.5 shadow-inner ${item.status === 'complete' ? 'bg-[#04081c] border-zinc-800' : 'bg-[#080c2e] border-blue-900/40'}`}>
                                <input
                                  type="text"
                                  value={item.blueName}
                                  disabled={item.status === "complete"}
                                  onChange={(e) => {
                                    const updated = [...scheduleItems];
                                    updated[item.originalIndex].blueName = e.target.value;
                                    setScheduleItems(updated);
                                  }}
                                  className="w-full bg-[#050212] border border-blue-950/50 rounded px-1.5 py-0.5 text-[10px] text-white font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="Nama Biru"
                                />
                                <input
                                  type="text"
                                  value={item.blueContingent}
                                  disabled={item.status === "complete"}
                                  onChange={(e) => {
                                    const updated = [...scheduleItems];
                                    updated[item.originalIndex].blueContingent = e.target.value;
                                    setScheduleItems(updated);
                                  }}
                                  className="w-full bg-[#050212] border border-blue-950/30 rounded px-1.5 py-0.5 text-[9px] text-zinc-400 uppercase font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="Kontingen Biru"
                                />
                              </div>
                            </td>

                            {/* RED ATHLETE (Card box) */}
                            <td className="p-1">
                              <div className={`border rounded-lg p-1 space-y-0.5 shadow-inner ${item.status === 'complete' ? 'bg-[#1a050d] border-zinc-800' : 'bg-[#2b0816] border-red-900/40'}`}>
                                <input
                                  type="text"
                                  value={item.redName}
                                  disabled={item.status === "complete"}
                                  onChange={(e) => {
                                    const updated = [...scheduleItems];
                                    updated[item.originalIndex].redName = e.target.value;
                                    setScheduleItems(updated);
                                  }}
                                  className="w-full bg-[#050212] border border-red-950/50 rounded px-1.5 py-0.5 text-[10px] text-white font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="Nama Merah"
                                />
                                <input
                                  type="text"
                                  value={item.redContingent}
                                  disabled={item.status === "complete"}
                                  onChange={(e) => {
                                    const updated = [...scheduleItems];
                                    updated[item.originalIndex].redContingent = e.target.value;
                                    setScheduleItems(updated);
                                  }}
                                  className="w-full bg-[#050212] border border-red-950/30 rounded px-1.5 py-0.5 text-[9px] text-zinc-400 uppercase font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="Kontingen Merah"
                                />
                              </div>
                            </td>

                            {/* FITUR KONTROL */}
                            <td className="p-1 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {item.status === "complete" ? (
                                  <div className="flex-1 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-extrabold text-[9px] uppercase py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 cursor-default select-none shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                    <span>SELESAI</span>
                                    <span className="text-[10px]">✅</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleUseSchedule(item)}
                                    className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black text-[9px] uppercase py-1.5 px-2 rounded-lg transition-all active:scale-95 cursor-pointer shadow-md"
                                  >
                                    GUNAKAN
                                  </button>
                                )}
                                <button
                                  disabled={item.status === "complete"}
                                  onClick={() => {
                                    if (item.status === "complete") return;
                                    const updated = scheduleItems.filter((_, i) => i !== item.originalIndex);
                                    setScheduleItems(updated);
                                  }}
                                  className="bg-red-950/40 hover:bg-red-900 border border-red-900/40 p-1.5 rounded-lg text-red-400 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-red-950/40 disabled:text-red-400/50"
                                  title={item.status === "complete" ? "Partai selesai tidak bisa dihapus" : "Hapus baris ini"}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between bg-[#0a0521] border-t border-purple-950/60 p-3 gap-2.5">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider text-center sm:text-left">
                      Menampilkan {paginatedScheduleItems.length} dari {filteredScheduleItems.length} partai (Halaman {currentPage} dari {totalPages})
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSchedulePage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 bg-[#140a33] hover:bg-[#1f104d] disabled:opacity-40 disabled:hover:bg-[#140a33] text-white font-black text-[9px] uppercase border border-purple-900 rounded-lg transition-all cursor-pointer"
                      >
                        ◄
                      </button>

                      {/* Numeric Page Buttons */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, index, array) => {
                          const showDots = index > 0 && p - array[index - 1] > 1;
                          return (
                            <React.Fragment key={p}>
                              {showDots && <span className="text-zinc-600 px-1 text-[9px] font-bold">...</span>}
                              <button
                                onClick={() => setSchedulePage(p)}
                                className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all cursor-pointer ${
                                  currentPage === p
                                    ? "bg-[#4f46e5] text-white border border-purple-500"
                                    : "bg-[#0c0423] hover:bg-[#1f104d] text-zinc-400 hover:text-white border border-purple-950"
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        onClick={() => setSchedulePage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 bg-[#140a33] hover:bg-[#1f104d] disabled:opacity-40 disabled:hover:bg-[#140a33] text-white font-black text-[9px] uppercase border border-purple-900 rounded-lg transition-all cursor-pointer"
                      >
                        ►
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center border-t border-purple-950/80 pt-4 gap-4">
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                DAFTAR JADWAL: {scheduleItems.length} PARTAI PERTANDINGAN
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsGeneratorOpen(false)}
                  className="text-zinc-400 hover:text-white text-xs font-black uppercase px-5 py-3 transition-colors cursor-pointer"
                >
                  TUTUP
                </button>
                
                <button
                  onClick={handleUnduhPdfJadwal}
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black text-xs uppercase px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer size={14} /> UNDUH PDF JADWAL
                </button>
                
                <button
                  onClick={handleTerapkanSemua}
                  className="bg-[#10b981] hover:bg-[#059669] text-black font-black text-xs uppercase px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
                >
                  <CheckCircle2 size={14} /> TERAPKAN SEMUA JADWAL
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL OVERLAY 2: CETAK PDF / LAPORAN HASIL PERTANDINGAN
          ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0423] border border-purple-900 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            
            <div className="flex justify-between items-start border-b border-purple-950/80 pb-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                  <Printer className="text-purple-400" size={20} /> Cetak Laporan Lembar Nilai IPSI
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Verifikasi lembar nilai resmi partai, isikan nama penandatangan, lalu cetak PDF dokumen fisik tanding.
                </p>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white text-xs font-black p-2 rounded-xl border border-purple-800"
              >
                ✕ TUTUP
              </button>
            </div>

            {/* Document Preview Area (Styled like physical paper) */}
            <div className="bg-white text-zinc-900 p-6 md:p-8 rounded-2xl border border-zinc-300 max-w-2xl mx-auto shadow-2xl">
              <div className="text-center pb-4 border-b-2 border-zinc-900 flex justify-between items-center">
                <div className="text-left">
                  <h2 className="text-sm font-extrabold uppercase tracking-tight">LEMBAR PERTANDINGAN RESMI IPSI</h2>
                  <p className="text-[8px] text-zinc-500 font-mono uppercase">IKATAN PENCAK SILAT INDONESIA</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold block leading-none font-mono text-zinc-400">PARTAI</span>
                  <span className="text-base font-black font-mono leading-none text-zinc-950">{partaiTanding}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-b border-zinc-200 text-[10px] leading-relaxed">
                <div>
                  <div><span className="text-zinc-500 font-bold">Kejuaraan:</span> <span className="font-semibold">{tournamentName}</span></div>
                  <div><span className="text-zinc-500 font-bold">Arena/Gelanggang:</span> <span className="font-semibold">{arena}</span></div>
                </div>
                <div>
                  <div><span className="text-zinc-500 font-bold">Kategori Kelas:</span> <span className="font-semibold">{`Kelas ${kelasNomor} ${gender} ${kategoriUsia} (${tahapPertandingan})`}</span></div>
                  <div><span className="text-zinc-500 font-bold">Waktu Cetak:</span> <span className="font-semibold font-mono">{new Date().toLocaleDateString("id-ID")}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 my-4 text-[10px]">
                {/* Blue preview */}
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="border-b border-blue-200 pb-1 mb-2 flex justify-between items-center">
                    <span className="font-bold text-blue-900 truncate max-w-[120px]">{blueName}</span>
                    <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">{blueContingent}</span>
                  </div>
                  <div className="space-y-0.5 text-zinc-600">
                    <div className="flex justify-between"><span>Pukulan:</span> <span className="font-bold">{state.scores.blue.pukulan}</span></div>
                    <div className="flex justify-between"><span>Tendangan:</span> <span className="font-bold">{state.scores.blue.tendangan}</span></div>
                    <div className="flex justify-between"><span>Jatuhan:</span> <span className="font-bold">{state.scores.blue.jatuhan}</span></div>
                    <div className="flex justify-between text-red-600"><span>Hukuman:</span> <span className="font-bold">-{state.scores.blue.hukuman || 0}</span></div>
                    <div className="flex justify-between border-t border-zinc-200 pt-1 font-bold text-zinc-900 text-[11px] mt-1">
                      <span>Nilai Akhir:</span> 
                      <span>{state.scores.blue.total} Poin</span>
                    </div>
                  </div>
                </div>

                {/* Red preview */}
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <div className="border-b border-red-200 pb-1 mb-2 flex justify-between items-center">
                    <span className="font-bold text-red-900 truncate max-w-[120px]">{redName}</span>
                    <span className="text-[8px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">{redContingent}</span>
                  </div>
                  <div className="space-y-0.5 text-zinc-600">
                    <div className="flex justify-between"><span>Pukulan:</span> <span className="font-bold">{state.scores.red.pukulan}</span></div>
                    <div className="flex justify-between"><span>Tendangan:</span> <span className="font-bold">{state.scores.red.tendangan}</span></div>
                    <div className="flex justify-between"><span>Jatuhan:</span> <span className="font-bold">{state.scores.red.jatuhan}</span></div>
                    <div className="flex justify-between text-red-600"><span>Hukuman:</span> <span className="font-bold">-{state.scores.red.hukuman || 0}</span></div>
                    <div className="flex justify-between border-t border-zinc-200 pt-1 font-bold text-zinc-900 text-[11px] mt-1">
                      <span>Nilai Akhir:</span> 
                      <span>{state.scores.red.total} Poin</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Winner decision */}
              <div className="bg-zinc-50 border border-zinc-350 p-2.5 rounded-xl text-center text-[10px] leading-relaxed mb-6">
                {state.winner ? (
                  <div>
                    Pemenang Pertandingan: <span className="font-black text-xs text-zinc-900 block uppercase mt-0.5">
                      🏅 SUDUT {state.winner === "blue" ? "BIRU" : "MERAH"} - {state.winner === "blue" ? blueName : redName}
                    </span>
                    Keputusan: <span className="font-bold text-zinc-800">{state.winnerDecision || "Menang Angka"}</span>
                  </div>
                ) : (
                  <div className="text-zinc-500 italic font-medium">Status Pertandingan: Pemenang Belum Dideklarasikan Oleh Dewan Hakim</div>
                )}
              </div>

              {/* Signatures block */}
              <div className="grid grid-cols-2 text-center text-[9px] mt-8 pt-4 border-t border-zinc-200">
                <div className="space-y-10">
                  <span>Ketua Pertandingan (Dewan)</span>
                  <div className="font-bold underline">{reportSigneeHead}</div>
                </div>
                <div className="space-y-10">
                  <span>Sekretaris Pertandingan</span>
                  <div className="font-bold underline">{reportSigneeSec}</div>
                </div>
              </div>
            </div>

            {/* Input helpers for signatory names */}
            <div className="p-4 bg-[#050212] border border-purple-950/80 rounded-2xl max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Ketua Pertandingan (Signee 1)</label>
                <input 
                  type="text" 
                  value={reportSigneeHead} 
                  onChange={(e) => setReportSigneeHead(e.target.value)}
                  className="w-full bg-[#0c0423] border border-purple-950 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Sekretaris Pertandingan (Signee 2)</label>
                <input 
                  type="text" 
                  value={reportSigneeSec} 
                  onChange={(e) => setReportSigneeSec(e.target.value)}
                  className="w-full bg-[#0c0423] border border-purple-950 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="flex gap-2 justify-end max-w-2xl mx-auto pt-2">
              <button 
                onClick={() => window.print()}
                className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg"
              >
                <Printer size={14} /> Cetak Dokumen Sekarang
              </button>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 font-extrabold text-xs px-4 py-3 rounded-xl transition-all"
              >
                Batal
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL OVERLAY 2.5: PERALIHAN BABAK (TRANSISI BABAK)
          ========================================================================= */}
      {isTransitionActive && (() => {
        const isFinalRound = state.round === state.maxRound;

        const currentMatchIdx = scheduleItems.findIndex(
          item => String(item.partai) === String(state.matchNumber)
        );
        const nextMatch = currentMatchIdx !== -1 && currentMatchIdx + 1 < scheduleItems.length
          ? scheduleItems[currentMatchIdx + 1]
          : null;

        const nextMatchPartai = nextMatch ? nextMatch.partai : "13";
        const nextMatchBlueName = nextMatch ? nextMatch.blueName : "HERI SUSANTO";
        const nextMatchBlueContingent = nextMatch ? nextMatch.blueContingent : "SUMATERA UTARA";
        const nextMatchRedName = nextMatch ? nextMatch.redName : "GUNTUR PERMANA";
        const nextMatchRedContingent = nextMatch ? nextMatch.redContingent : "BANTEN";
        const nextMatchKelas = nextMatch ? nextMatch.kelas : "F";
        const nextMatchGender = nextMatch ? nextMatch.gender : "PUTRA";
        const nextMatchTahapan = nextMatch ? (nextMatch.tahapan || nextMatch.stage || "FINAL") : "FINAL";

        const isBlueWinning = state.scores.blue.total > state.scores.red.total;
        const isRedWinning = state.scores.red.total > state.scores.blue.total;
        const isDraw = state.scores.blue.total === state.scores.red.total;

        let rekomendasiText = "Skor kedua sudut saat ini SAMA KUAT (DRAW). Hubungi Dewan Juri jika diperlukan penambahan Babak Tambahan (Overtime).";
        if (isBlueWinning) {
          rekomendasiText = `Sudut BIRU UNGGUL (${state.scores.blue.total} vs ${state.scores.red.total}). Pastikan Dewan Juri memverifikasi lembar nilai sebelum beralih ke babak selanjutnya.`;
        } else if (isRedWinning) {
          rekomendasiText = `Sudut MERAH UNGGUL (${state.scores.red.total} vs ${state.scores.blue.total}). Pastikan Dewan Juri memverifikasi lembar nilai sebelum beralih ke babak selanjutnya.`;
        }

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans select-none animate-fade-in text-white">
            
            {/* Main Container - Compact size, no scrollbars, purple, blue, yellow gradient background */}
            <div className="bg-gradient-to-br from-[#1c0430] via-[#05113d] to-[#332a02] border-2 border-yellow-500/30 rounded-3xl p-5 max-w-4xl w-full shadow-[0_0_50px_rgba(168,85,247,0.3)] relative flex flex-col gap-4 overflow-hidden max-h-[96vh]">
              
              {/* Header Row - Compact */}
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 animate-pulse">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-extrabold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-purple-200 to-amber-300 uppercase leading-none">
                      {isFinalRound ? `BABAK ${state.round} SELESAI (FINAL)` : `BABAK ${state.round} SELESAI`}
                    </h2>
                    <span className="text-[9px] font-mono tracking-widest text-yellow-400 font-bold uppercase mt-1 block">
                      WAKTU MATCH HABIS
                    </span>
                  </div>
                </div>
                
                {/* Top Close Button */}
                <button 
                  onClick={() => {
                    setIsRoundTransitionOverlayOpen(false);
                    setIsNextRoundSignalDismissed(true);
                  }}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer bg-black/40 hover:bg-black/60 p-2 rounded-full border border-purple-800/30"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* LEFT PANEL: Break Timer or Final Result Accumulation + Recommendations */}
                <div className="space-y-4 flex flex-col justify-between">
                  {!isFinalRound ? (
                    <div className="bg-black/40 border border-purple-900/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                          <svg className="w-14 h-14 transform -rotate-90">
                            <circle
                              cx="28"
                              cy="28"
                              r="20"
                              className="stroke-purple-950/80 fill-transparent"
                              strokeWidth="4"
                            />
                            <circle
                              cx="28"
                              cy="28"
                              r="20"
                              className="stroke-purple-500 fill-transparent transition-all duration-1000"
                              strokeWidth="4"
                              strokeDasharray="125.6"
                              strokeDashoffset={125.6 - (interRoundBreakTime / 60) * 125.6}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-xs font-black font-mono text-white">
                            {interRoundBreakTime}s
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold tracking-widest font-mono text-purple-400 uppercase block mb-0.5">
                            ⏱ TIMER JEDA (1 MENIT)
                          </span>
                          <p className="text-[10px] text-zinc-300 font-medium">
                            {isInterRoundBreakRunning ? "Mundur otomatis berjalan" : "Mundur di-pause"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsInterRoundBreakRunning(!isInterRoundBreakRunning)}
                          className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase cursor-pointer transition-all ${
                            isInterRoundBreakRunning
                              ? "bg-amber-600 hover:bg-amber-500 text-black"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white"
                          }`}
                        >
                          {isInterRoundBreakRunning ? "PAUSE" : "RESUME"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInterRoundBreakTime(60);
                            setIsInterRoundBreakRunning(true);
                          }}
                          className="bg-[#240c42] hover:bg-[#34115f] text-purple-300 border border-purple-800/40 px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase cursor-pointer transition-all"
                        >
                          RESET
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#1c082d]/50 border border-yellow-500/20 rounded-2xl p-4 text-center">
                      <span className="text-[8px] font-black font-mono text-yellow-400 uppercase tracking-wider block mb-2">
                        🏆 KEPUTUSAN AKHIR PERTANDINGAN
                      </span>
                      <div className="grid grid-cols-2 gap-3 w-full mb-2">
                        <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl py-1.5">
                          <span className="text-[8px] text-blue-400 font-bold block uppercase">AKUMULASI BIRU</span>
                          <span className="text-xl font-black font-mono text-white">{state.scores.blue.total}</span>
                        </div>
                        <div className="bg-red-950/20 border border-red-900/30 rounded-xl py-1.5">
                          <span className="text-[8px] text-red-400 font-bold block uppercase">AKUMULASI MERAH</span>
                          <span className="text-xl font-black font-mono text-white">{state.scores.red.total}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-300 italic">
                        {state.winner ? (
                          <span>Pemenang: <strong className="text-yellow-400 uppercase font-bold">Sudut {state.winner === "blue" ? "Biru" : "Merah"}</strong> ({state.winnerDecision})</span>
                        ) : (
                          <span>Tentukan pemenang & klik Umumkan Pemenang!</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendations Box */}
                  <div className="bg-[#1b0a2b]/60 border border-purple-900/40 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest block font-mono">
                      📋 PANDUAN & REKOMENDASI TRANSISI
                    </span>
                    <p className="text-[11px] font-semibold text-zinc-200 leading-normal">
                      {rekomendasiText}
                    </p>
                  </div>
                </div>

                {/* RIGHT PANEL: Score Summary, Lock Button, Controls */}
                <div className="space-y-4">
                  
                  {/* Current Scores Summary */}
                  <div className="bg-black/30 border border-purple-950/60 rounded-2xl p-3 flex flex-col justify-center">
                    <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest block font-mono text-center mb-2">
                      📊 PERKEMBANGAN AKUMULASI SKOR AKTIF
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-950/20 border border-blue-900/20 py-2 rounded-xl flex flex-col items-center">
                        <span className="text-[8px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">Sudut Biru</span>
                        <span className="text-xl font-black font-mono text-blue-400">{state.scores.blue.total}</span>
                      </div>
                      <div className="bg-red-950/20 border border-red-900/20 py-2 rounded-xl flex flex-col items-center">
                        <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider mb-0.5">Sudut Merah</span>
                        <span className="text-xl font-black font-mono text-red-400">{state.scores.red.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Juri Lock & Action Controls */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => onTimerAction?.(state.isPanelsLocked ? "unlock-panels" : "lock-panels")}
                      className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md ${
                        state.isPanelsLocked
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          : "bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                      }`}
                    >
                      {state.isPanelsLocked ? "🔓 BUKA KUNCI PANEL JURI" : "🔒 KUNCI PANEL JURI"}
                    </button>

                    {!isFinalRound ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRoundTransitionOverlayOpen(false);
                              setIsNextRoundSignalDismissed(true);
                            }}
                            className="w-full bg-[#160b2d] hover:bg-[#251347] text-zinc-300 hover:text-white border border-purple-800/40 font-bold text-[10px] uppercase py-2.5 rounded-xl transition-all cursor-pointer text-center"
                          >
                            Tinjau Skor
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onChangeRound?.(state.round + 1);
                              onSoundAction?.("short_beep");
                              setIsRoundTransitionOverlayOpen(false);
                              setIsNextRoundSignalDismissed(true);
                            }}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[10px] uppercase py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] text-center"
                          >
                            Babak Berikutnya
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onUpdateConfig({ maxRound: 4 });
                            onChangeRound?.(4);
                            onSoundAction?.("short_beep");
                            setIsRoundTransitionOverlayOpen(false);
                            setIsNextRoundSignalDismissed(true);
                            alert("Babak Tambahan (Overtime/Babak 4) Berhasil Ditambahkan!");
                          }}
                          className={`w-full py-2 rounded-xl text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isDraw
                              ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse"
                              : "bg-[#251542] hover:bg-[#341d5d] text-purple-300 border border-purple-900/50"
                          }`}
                        >
                          <Zap size={11} /> BABAK TAMBAHAN (OVERTIME) {isDraw && "★ REKOMENDASI"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Winner Controls */}
                        <div className="bg-[#110526]/50 border border-yellow-500/20 rounded-xl p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedWinner("blue")}
                              className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer border ${
                                selectedWinner === "blue"
                                  ? "bg-blue-600 border-white text-white shadow-md"
                                  : "bg-black/40 border-blue-950 text-zinc-400 hover:text-white"
                              }`}
                            >
                              SUDUT BIRU
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedWinner("red")}
                              className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer border ${
                                selectedWinner === "red"
                                  ? "bg-red-600 border-white text-white shadow-md"
                                  : "bg-black/40 border-red-950 text-zinc-400 hover:text-white"
                              }`}
                            >
                              SUDUT MERAH
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[8px] text-zinc-400 uppercase font-mono shrink-0">Keputusan:</span>
                            <select
                              value={selectedDecision}
                              onChange={(e) => setSelectedDecision(e.target.value)}
                              className="flex-1 bg-black/60 border border-purple-950 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                            >
                              <option value="Menang Angka">MENANG ANGKA (POINT WIN)</option>
                              <option value="Menang Teknik">MENANG TEKNIK (TECHNICAL WIN)</option>
                              <option value="Menang Mutlak">MENANG MUTLAK (ABSOLUTE KO)</option>
                              <option value="Menang WMP">MENANG WASIT MASALAH PESILAT (WMP)</option>
                              <option value="Menang UD">MENANG UNDUR DIRI (UD)</option>
                              <option value="Diskualifikasi">DISKUALIFIKASI (DQ)</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedWinner) {
                                alert("Silakan pilih sudut pemenang terlebih dahulu!");
                                return;
                              }
                              onDeclareWinner?.(selectedWinner, selectedDecision);
                              alert(`Pemenang berhasil diumumkan: Sudut ${selectedWinner === "blue" ? "BIRU" : "MERAH"} (${selectedDecision})!`);
                            }}
                            className="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 font-black text-[9px] py-1.5 rounded-lg transition-all cursor-pointer shadow-md flex items-center justify-center gap-1"
                          >
                            <Trophy size={11} className="animate-bounce" /> UMUMKAN PEMENANG
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!state.winner) {
                              const confirmNext = window.confirm("Pemenang belum diumumkan secara resmi ke monitor & dewan. Apakah Anda yakin ingin langsung mengakhiri dan lanjut ke partai berikutnya?");
                              if (!confirmNext) return;
                            }
                            handleArchiveAndGoToNext();
                            setIsRoundTransitionOverlayOpen(false);
                            setIsNextRoundSignalDismissed(true);
                          }}
                          className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-[10px] py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                        >
                          <span>AKHIRI & LANJUT PARTAI SELANJUTNYA</span> <ArrowRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom Section - Upcoming Match (Very compact) */}
              <div className="border-t border-purple-950/60 pt-3 mt-1">
                <div className="bg-[#0b041a]/60 border border-purple-950/80 rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest font-mono">
                      ⏭ PARTAI SELANJUTNYA
                    </span>
                    <span className="text-[10px] font-black font-mono text-yellow-400 bg-yellow-950/40 border border-yellow-600/30 px-2 py-0.5 rounded">
                      PARTAI {nextMatchPartai}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">
                      Kelas {nextMatchKelas} • {nextMatchGender} • {nextMatchTahapan}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-blue-400 font-bold truncate max-w-[120px] uppercase">{nextMatchBlueName}</span>
                    <span className="text-zinc-600 font-bold">VS</span>
                    <span className="text-red-400 font-bold truncate max-w-[120px] uppercase">{nextMatchRedName}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        );
      })()}

      {/* =========================================================================
          MODAL OVERLAY 3: CEK PARTAI INTERAKTIF (GRADIENT UNGU, BIRU, KUNING)
          ========================================================================= */}
      {isCekPartaiOverlayOpen && (
        <div className="fixed inset-0 bg-[#02000a]/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in text-white">
          <div className="bg-gradient-to-br from-[#120038] via-[#011440] to-[#2b2100] border border-purple-500/40 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-[0_0_50px_rgba(168,85,247,0.35)] space-y-6 relative flex flex-col max-h-[90vh]">
            
            {/* Top Close Button */}
            <button 
              onClick={() => {
                setIsCekPartaiOverlayOpen(false);
                setShowCekPartaiResetConfirm(false);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-black/40 hover:bg-black/60 p-2 rounded-full"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="border-b border-purple-500/20 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 via-blue-500 to-yellow-500 flex items-center justify-center text-white font-black shadow-md">
                  🔍
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black uppercase tracking-wider text-white">
                    CEK PARTAI INTERAKTIF
                  </h3>
                  <p className="text-[10px] md:text-xs text-zinc-300 font-medium">
                    Semua daftar atlet bertanding hasil registrasi data yang ter-sinkronisasi secara otomatis.
                  </p>
                </div>
              </div>

              {/* Protected Reset Button */}
              <div className="flex items-center gap-2 self-end md:self-center pr-8">
                {!showCekPartaiResetConfirm ? (
                  <button
                    onClick={() => setShowCekPartaiResetConfirm(true)}
                    className="bg-red-600/90 hover:bg-red-500 text-white border border-red-500/40 rounded-xl px-4 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  >
                    <Trash2 size={12} /> RESET JADWAL
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-[#0b061e] border-2 border-red-500/50 p-2 px-3 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
                    <span className="text-[10px] md:text-xs text-red-400 font-extrabold uppercase tracking-wider">
                      Yakin ingin mereset?
                    </span>
                    <button
                      onClick={() => {
                        setScheduleItems([]);
                        localStorage.removeItem("match_schedules");
                        setShowCekPartaiResetConfirm(false);
                      }}
                      className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black px-3.5 py-1.5 rounded-lg text-[10px] uppercase border border-red-400/30 cursor-pointer shadow-md transition-colors"
                    >
                      Iya
                    </button>
                    <button
                      onClick={() => setShowCekPartaiResetConfirm(false)}
                      className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-100 font-extrabold px-3.5 py-1.5 rounded-lg text-[10px] uppercase border border-zinc-600/30 cursor-pointer shadow-md transition-colors"
                    >
                      Batalkan
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter / Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="CARI NAMA ATLET, KONTINGEN, KELAS, USIA, ATAU GENDER..."
                value={cekPartaiAthleteSearch}
                onChange={(e) => setCekPartaiAthleteSearch(e.target.value)}
                className="w-full bg-[#050212]/90 border border-purple-950 hover:border-purple-800 rounded-2xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder-zinc-500 uppercase font-mono tracking-wide"
              />
              <Search size={16} className="absolute right-5 top-4 text-zinc-400" />
            </div>

            {/* Athlete List Grid */}
            <div className="overflow-y-auto flex-grow flex-1 pr-1 space-y-3 min-h-0 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
              {scheduleItems.filter(item => {
                if (!cekPartaiAthleteSearch) return true;
                const query = cekPartaiAthleteSearch.toLowerCase();
                return (
                  (item.partai || "").toLowerCase().includes(query) ||
                  (item.blueName || "").toLowerCase().includes(query) ||
                  (item.blueContingent || "").toLowerCase().includes(query) ||
                  (item.redName || "").toLowerCase().includes(query) ||
                  (item.redContingent || "").toLowerCase().includes(query) ||
                  (item.kelas || "").toLowerCase().includes(query) ||
                  (item.usia || "").toLowerCase().includes(query) ||
                  (item.gender || "").toLowerCase().includes(query) ||
                  (item.tahapan || "").toLowerCase().includes(query)
                );
              }).length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="text-3xl text-zinc-600">📭</div>
                  <p className="text-xs text-zinc-400 font-mono uppercase tracking-widest">
                    {cekPartaiAthleteSearch ? "Tidak ada partai tanding yang cocok dengan pencarian" : "Belum ada jadwal partai tanding aktif"}
                  </p>
                  <button
                    onClick={() => {
                      setIsCekPartaiOverlayOpen(false);
                      setIsRegistrationPageActive(true);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-5 py-3 rounded-xl text-[10px] font-black uppercase text-white cursor-pointer"
                  >
                    Buka Registrasi & Jadwal Data
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scheduleItems
                    .filter(item => {
                      if (!cekPartaiAthleteSearch) return true;
                      const query = cekPartaiAthleteSearch.toLowerCase();
                      return (
                        (item.partai || "").toLowerCase().includes(query) ||
                        (item.blueName || "").toLowerCase().includes(query) ||
                        (item.blueContingent || "").toLowerCase().includes(query) ||
                        (item.redName || "").toLowerCase().includes(query) ||
                        (item.redContingent || "").toLowerCase().includes(query) ||
                        (item.kelas || "").toLowerCase().includes(query) ||
                        (item.usia || "").toLowerCase().includes(query) ||
                        (item.gender || "").toLowerCase().includes(query) ||
                        (item.tahapan || "").toLowerCase().includes(query)
                      );
                    })
                    .map((item, idx) => {
                      const isActive = String(partaiTanding) === String(item.partai);
                      
                      return (
                        <div 
                          key={item.uniqueId || idx}
                          className={`bg-[#050212]/80 border p-4 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:scale-[1.01] hover:bg-[#0d0724] ${
                            item.status === "complete"
                              ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-[#02140a]/80"
                              : isActive 
                                ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] bg-[#12091c]/80" 
                                : "border-purple-950/60 hover:border-purple-800"
                          }`}
                        >
                          {/* Card Content */}
                          <div className="space-y-3">
                            {/* Card Header */}
                            <div className="flex justify-between items-center border-b border-purple-950/50 pb-2">
                              <div className="inline-flex flex-col border border-amber-500/40 bg-amber-500/5 px-2.5 py-0.5 rounded-md">
                                <span className="text-[6px] font-black text-amber-500/90 leading-none tracking-wider font-sans">PARTAI</span>
                                <span className="text-[11px] font-black text-amber-400 leading-none mt-0.5 font-mono">
                                  {item.partai}
                                </span>
                              </div>
                              
                              {item.status === "complete" ? (
                                <span className="text-[7.5px] font-black font-mono px-2 py-0.5 rounded bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                  SELESAI BERTANDING
                                </span>
                              ) : isActive ? (
                                <span className="text-[7px] font-black font-mono px-1.5 py-0.5 rounded bg-amber-500 text-black animate-pulse">
                                  SEDANG BERTANDING
                                </span>
                              ) : (
                                <span className="text-[8px] font-black font-mono text-zinc-400 uppercase tracking-wider">
                                  {item.tahapan}
                                </span>
                              )}
                            </div>

                            {/* Class and category specifications */}
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/20 uppercase">
                                KELAS {item.kelas}
                              </span>
                              <span className="text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/20 uppercase">
                                {item.usia}
                              </span>
                              <span className="text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-yellow-950/40 text-amber-300 border border-amber-500/20 uppercase">
                                {item.gender}
                              </span>
                            </div>

                            {/* Corners block */}
                            <div className="space-y-2 pt-1">
                              {/* Blue Corner */}
                              {(() => {
                                const isBlueWinner = item.status === "complete" && (item.winner === 1 || item.winner === "blue");
                                const isRedWinner = item.status === "complete" && (item.winner === 2 || item.winner === "red");
                                return (
                                  <>
                                    <div className={`flex items-center justify-between border p-2 rounded-xl transition-all ${
                                      isBlueWinner
                                        ? "bg-blue-950/40 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                                        : item.status === "complete"
                                          ? "bg-zinc-950/20 border-zinc-900/40 opacity-40"
                                          : "bg-blue-950/15 border-blue-900/20"
                                    }`}>
                                      <div className="truncate flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest font-mono">SUDUT BIRU</span>
                                          {isBlueWinner && <span className="text-[9px] text-yellow-400 font-bold">🏆 PEMENANG</span>}
                                        </div>
                                        <span className="text-xs font-extrabold text-white uppercase block truncate">{item.blueName}</span>
                                        <span className="text-[8px] text-zinc-400 font-medium uppercase block truncate">{item.blueContingent}</span>
                                      </div>
                                      <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                        {item.status === "complete" && (
                                          <span className="font-mono text-[10px] font-black text-amber-400 bg-black/40 px-1 py-0.5 rounded border border-purple-950/30">
                                            {item.blueScore || 0} PTS
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* VS badge */}
                                    <div className="text-center font-black text-[9px] text-purple-400 tracking-widest italic my-1">
                                      — VS —
                                    </div>

                                    {/* Red Corner */}
                                    <div className={`flex items-center justify-between border p-2 rounded-xl transition-all ${
                                      isRedWinner
                                        ? "bg-red-950/40 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                                        : item.status === "complete"
                                          ? "bg-zinc-950/20 border-zinc-900/40 opacity-40"
                                          : "bg-red-950/15 border-red-900/20"
                                    }`}>
                                      <div className="truncate flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[7px] font-black text-red-400 uppercase tracking-widest font-mono">SUDUT MERAH</span>
                                          {isRedWinner && <span className="text-[9px] text-yellow-400 font-bold">🏆 PEMENANG</span>}
                                        </div>
                                        <span className="text-xs font-extrabold text-white uppercase block truncate">{item.redName}</span>
                                        <span className="text-[8px] text-zinc-400 font-medium uppercase block truncate">{item.redContingent}</span>
                                      </div>
                                      <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                        {item.status === "complete" && (
                                          <span className="font-mono text-[10px] font-black text-amber-400 bg-black/40 px-1 py-0.5 rounded border border-purple-950/30">
                                            {item.redScore || 0} PTS
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Trigger Start Match Action */}
                          <div className="pt-2 border-t border-purple-950/30">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.status === "complete") {
                                  const confirmReset = window.confirm(`Partai ${item.partai} sudah selesai bertanding. Apakah Anda yakin ingin memulai ulang pertandingan ini? Data skor pemenang sebelumnya akan di-reset.`);
                                  if (!confirmReset) return;
                                  
                                  const updatedSchedules = scheduleItems.map(s => 
                                    s.uniqueId === item.uniqueId 
                                      ? { 
                                          ...s, 
                                          status: "pending", 
                                          winner: undefined, 
                                          winnerDecision: undefined, 
                                          blueScore: undefined, 
                                          redScore: undefined,
                                          bluePukulan: undefined,
                                          blueTendangan: undefined,
                                          blueJatuhan: undefined,
                                          blueHukuman: undefined,
                                          redPukulan: undefined,
                                          redTendangan: undefined,
                                          redJatuhan: undefined,
                                          redHukuman: undefined
                                        } 
                                      : s
                                  );
                                  setScheduleItems(updatedSchedules);
                                  localStorage.setItem("match_schedules", JSON.stringify(updatedSchedules));
                                }
                                handleStartMatchManually(item);
                              }}
                              className={`w-full py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                                item.status === "complete"
                                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-500 shadow-sm"
                                  : isActive
                                    ? "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-400"
                                    : "bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md border border-purple-500/20"
                              }`}
                            >
                              <span>
                                {item.status === "complete"
                                  ? `🔄 RESET & RE-TANDING PERTANDINGAN PARTAI ${item.partai}`
                                  : `▶ MULAI PERTANDINGAN PARTAI ${item.partai}`}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-purple-500/10">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                Total terdaftar: <span className="text-white font-extrabold">{registeredAthletes.length} Atlet</span>
              </span>
              <button
                onClick={() => setIsCekPartaiOverlayOpen(false)}
                className="bg-[#050212] hover:bg-[#140a33] text-zinc-400 hover:text-white border border-purple-950/80 hover:border-purple-500 font-extrabold text-[10px] uppercase px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Tutup Overlay
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          4. STANDALONE DUPLICATE PHYSICAL PRINT CONTAINER (STRICTLY HIDDEN EXCEPT IN PRINT MODE)
          ========================================================================= */}
      <div className="hidden print:block bg-white text-zinc-900 p-12 font-sans w-full min-h-screen text-[11px] leading-relaxed">
        <div className="text-center pb-4 border-b-2 border-zinc-900 flex justify-between items-center">
          <div className="text-left">
            <h2 className="text-base font-extrabold uppercase tracking-tight">LEMBAR PERTANDINGAN RESMI IPSI</h2>
            <p className="text-[9px] text-zinc-500 font-mono uppercase">IKATAN PENCAK SILAT INDONESIA</p>
          </div>
          <div className="text-right font-mono">
            <span className="text-[9px] font-bold block leading-none text-zinc-400">PARTAI</span>
            <span className="text-lg font-black leading-none text-zinc-950">{partaiTanding}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-b border-zinc-200">
          <div>
            <div><span className="text-zinc-500 font-bold">Kejuaraan:</span> <span className="font-semibold">{tournamentName}</span></div>
            <div><span className="text-zinc-500 font-bold">Arena/Gelanggang:</span> <span className="font-semibold">{arena}</span></div>
          </div>
          <div>
            <div><span className="text-zinc-500 font-bold">Kategori Kelas:</span> <span className="font-semibold">{`Kelas ${kelasNomor} ${gender} ${kategoriUsia} (${tahapPertandingan})`}</span></div>
            <div><span className="text-zinc-500 font-bold">Waktu Cetak:</span> <span className="font-semibold font-mono">{new Date().toLocaleDateString("id-ID")}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 my-6">
          {/* Blue */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-300">
            <div className="border-b border-zinc-300 pb-1 mb-2 flex justify-between items-center">
              <span className="font-bold text-sm text-zinc-900">{blueName}</span>
              <span className="text-[9px] bg-zinc-100 text-zinc-800 font-bold px-2 py-0.5 rounded">{blueContingent}</span>
            </div>
            <div className="space-y-1 text-zinc-600">
              <div className="flex justify-between"><span>Skor Pukulan:</span> <span className="font-bold">{state.scores.blue.pukulan}</span></div>
              <div className="flex justify-between"><span>Skor Tendangan:</span> <span className="font-bold">{state.scores.blue.tendangan}</span></div>
              <div className="flex justify-between"><span>Skor Jatuhan:</span> <span className="font-bold">{state.scores.blue.jatuhan}</span></div>
              <div className="flex justify-between text-red-600 font-semibold"><span>Hukuman:</span> <span>-{state.scores.blue.hukuman || 0}</span></div>
              <div className="flex justify-between border-t border-zinc-200 pt-1 font-bold text-zinc-900 text-xs mt-1">
                <span>Nilai Akhir:</span> 
                <span>{state.scores.blue.total} Poin</span>
              </div>
            </div>
          </div>

          {/* Red */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-300">
            <div className="border-b border-zinc-300 pb-1 mb-2 flex justify-between items-center">
              <span className="font-bold text-sm text-zinc-900">{redName}</span>
              <span className="text-[9px] bg-zinc-100 text-zinc-800 font-bold px-2 py-0.5 rounded">{redContingent}</span>
            </div>
            <div className="space-y-1 text-zinc-600">
              <div className="flex justify-between"><span>Skor Pukulan:</span> <span className="font-bold">{state.scores.red.pukulan}</span></div>
              <div className="flex justify-between"><span>Skor Tendangan:</span> <span className="font-bold">{state.scores.red.tendangan}</span></div>
              <div className="flex justify-between"><span>Skor Jatuhan:</span> <span className="font-bold">{state.scores.red.jatuhan}</span></div>
              <div className="flex justify-between text-red-600 font-semibold"><span>Hukuman:</span> <span>-{state.scores.red.hukuman || 0}</span></div>
              <div className="flex justify-between border-t border-zinc-200 pt-1 font-bold text-zinc-900 text-xs mt-1">
                <span>Nilai Akhir:</span> 
                <span>{state.scores.red.total} Poin</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-50 border border-zinc-300 p-3 rounded-xl text-center text-xs mb-8">
          {state.winner ? (
            <div>
              Keputusan Pemenang: <span className="font-bold uppercase text-zinc-900">
                SUDUT {state.winner === "blue" ? "BIRU" : "MERAH"} - {state.winner === "blue" ? blueName : redName}
              </span>
              <br />
              Jenis Kemenangan: <span className="font-bold text-zinc-800">{state.winnerDecision || "Menang Angka"}</span>
            </div>
          ) : (
            <div className="text-zinc-500 italic">Pemenang: Belum ditentukan oleh Dewan Hakim di lapangan</div>
          )}
        </div>

        <div className="grid grid-cols-2 text-center text-[10px] mt-16 pt-8 border-t border-zinc-200">
          <div className="space-y-12">
            <span>Ketua Pertandingan (Dewan)</span>
            <div className="font-bold underline">{reportSigneeHead}</div>
          </div>
          <div className="space-y-12">
            <span>Sekretaris Pertandingan</span>
            <div className="font-bold underline">{reportSigneeSec}</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL OVERLAY 4: UNDUH LAPORAN PDF DENGAN GRADASI WARNA UNGU, BIRU, KUNING
          ========================================================================= */}
      {isPdfDownloadOverlayOpen && (
        <div className="fixed inset-0 bg-[#02000a]/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in text-white font-sans">
          <div className="bg-gradient-to-br from-[#1a0536] via-[#031545] to-[#302a03] border-4 border-yellow-500/80 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_0_60px_rgba(168,85,247,0.45)] space-y-6 relative">
            
            {/* Top Close Button */}
            <button 
              onClick={() => setIsPdfDownloadOverlayOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-black/40 hover:bg-black/60 p-2 rounded-full border border-yellow-500/20"
            >
              <X size={18} />
            </button>

            {/* Header with Icon */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-tr from-purple-500 via-blue-500 to-yellow-500 flex items-center justify-center text-white text-2xl shadow-lg border border-yellow-500/30">
                📄
              </div>
              <h3 className="text-base md:text-lg font-black uppercase tracking-wider text-white">
                UNDUH LAPORAN PDF RESMI
              </h3>
              <p className="text-[10px] md:text-xs text-purple-300 font-mono tracking-widest uppercase">
                {tournamentName}
              </p>
            </div>

            {/* Choices Container */}
            <div className="space-y-4 pt-2">
              
              {/* Option 1: Download All */}
              <button
                onClick={() => handleDownloadPDF("all")}
                className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-yellow-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider py-4 px-5 rounded-2xl flex items-center justify-between transition-all shadow-md cursor-pointer border border-yellow-500/20"
              >
                <span>📂 1. UNDUH SEMUA PARTAI SELESAI</span>
                <span className="text-[9px] bg-black/40 px-2 py-0.5 rounded font-mono font-bold">
                  {scheduleItems.filter(item => item.status === "complete").length} PARTAI
                </span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-purple-950/40"></div>
                <span className="flex-shrink mx-4 text-[9px] text-zinc-500 font-bold uppercase font-mono tracking-widest">ATAU</span>
                <div className="flex-grow border-t border-purple-950/40"></div>
              </div>

              {/* Option 2: Download Specific Match */}
              <div className="bg-black/40 border border-purple-950 p-4 rounded-2xl space-y-3.5">
                <label className="text-[9px] font-black tracking-widest text-zinc-400 font-mono uppercase block">
                  2. UNDUH SESUAI PARTAI YANG DIPILIH
                </label>

                {/* Dropdown Menu */}
                <div className="relative">
                  <select
                    value={selectedPartaiToDownload}
                    onChange={(e) => setSelectedPartaiToDownload(e.target.value)}
                    className="w-full bg-[#08021a] border border-purple-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-yellow-500 font-bold font-mono tracking-wider appearance-none cursor-pointer"
                  >
                    {scheduleItems.filter(item => item.status === "complete").length === 0 ? (
                      <option value="">(Belum ada partai selesai)</option>
                    ) : (
                      scheduleItems.filter(item => item.status === "complete").map((item) => (
                        <option key={item.partai} value={item.partai}>
                          Partai {item.partai} - {item.blueName} VS {item.redName}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-zinc-400">
                    ▼
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadPDF("single")}
                  disabled={!selectedPartaiToDownload}
                  className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  UNDUH PARTAI TERPILIH ⬇
                </button>
              </div>

            </div>

            {/* Footer Close */}
            <div className="pt-2 text-center">
              <button
                onClick={() => setIsPdfDownloadOverlayOpen(false)}
                className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold tracking-widest transition-colors cursor-pointer"
              >
                Kembali ke Panel Utama
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Reset Match Confirmation Modal Overlay - Cosmic Dark Slate Theme */}
      {showResetMatchConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-sans animate-fade-in text-white select-none">
          <div className="bg-[#0b061e] border-2 border-red-500/50 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.35)] relative flex flex-col gap-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-950/50 border-2 border-red-500/60 flex items-center justify-center text-red-400 animate-pulse">
              <RotateCcw size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black text-red-500 tracking-wider uppercase">
                Yakin ingin mereset?
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Tindakan ini akan mengosongkan semua skor tanding, riwayat juri, catatan pelanggaran, dan mengatur ulang babak ke semula.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  onResetMatch(true);
                  setShowResetMatchConfirm(false);
                }}
                className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black py-3 px-5 rounded-2xl tracking-widest uppercase transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-400/50 cursor-pointer text-xs md:text-sm"
              >
                Iya
              </button>
              <button
                onClick={() => setShowResetMatchConfirm(false)}
                className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-100 hover:text-white font-black py-3 px-5 rounded-2xl tracking-widest uppercase transition-all duration-300 border border-zinc-600/50 cursor-pointer text-xs md:text-sm"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BAGIKAN KE KLIEN */}
      <ShareClientModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tournamentName={tournamentName}
      />

    </div>
  );
}
