import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Download, Upload, FileSpreadsheet, Printer, 
  Trash2, Plus, Edit3, Check, RefreshCw, Users, Shield, 
  Grid, Trophy, CheckSquare, Square, Info, Search, Calendar, X, Clipboard,
  Settings, Zap, AlertTriangle, Layers, Power, Sliders, ZoomIn, ZoomOut, RotateCcw,
  Medal, Eye, ChevronRight, Sparkles, ShieldCheck, Shuffle, UserCheck,
  Award, Swords, Hourglass
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

export interface Athlete {
  id: string;
  name: string;
  contingent: string;
  kelas: string;
  usia: string;
  gender: "PUTRA" | "PUTRI";
  category?: "TANDING" | "JURUS" | string;
  berat?: string;
  undian?: string | number;
}

export type AgeCategory = "USIA DINI" | "PRA REMAJA" | "REMAJA" | "DEWASA" | "MASTER";

export interface CategoryBaganConfig {
  mode: "PEMASALAN" | "PRESTASI"; // Green Switch = PEMASALAN (ON), Red Switch = PRESTASI (OFF)
  skemaPemasalan: "FINAL" | "SEMIFINAL"; // FINAL = 2 Bagan/Pool, SEMIFINAL = 4 Bagan/Pool
  skemaPrestasi: "SINGLE_NO_POOL" | "POOL_AB"; // SINGLE POOL vs POOL A & B
}

interface RegistrasiDataViewProps {
  onBack: () => void;
  isFullscreen: boolean;
  tournamentName: string;
  initialTab?: "input_data" | "bagan_braket" | "kontrol_partai";
}

export default function RegistrasiDataView({ 
  onBack, 
  isFullscreen, 
  tournamentName,
  initialTab = "bagan_braket" 
}: RegistrasiDataViewProps) {
  // Top Navigation Tabs: "input_data" | "bagan_braket" | "kontrol_partai"
  // Default to "bagan_braket" matching image.png exactly!
  const [activeNavTab, setActiveNavTab] = useState<"input_data" | "bagan_braket" | "kontrol_partai">(initialTab);

  // Initial Athletes Seed - includes JAKA (PAKU BANTEN) and RENZ (TS) matching image.png exactly!
  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const saved = localStorage.getItem("registered_athletes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((a: any) => ({
            ...a,
            category: a.category || "TANDING",
            berat: a.berat || "40 Kg",
            undian: a.undian !== undefined ? a.undian : (a.name === "RENZ" ? "#2" : a.name === "JAKA" ? "#1" : "#1")
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: "ath_1", name: "JAKA", contingent: "PAKU BANTEN", kelas: "A", usia: "REMAJA", gender: "PUTRA", category: "TANDING", berat: "40 Kg", undian: "#1" },
      { id: "ath_2", name: "RENZ", contingent: "TS", kelas: "A", usia: "REMAJA", gender: "PUTRA", category: "TANDING", berat: "40 Kg", undian: "#2" },
      { id: "ath_3", name: "BUDI PRASETYO", contingent: "DKI JAKARTA", kelas: "B", usia: "REMAJA", gender: "PUTRA", category: "TANDING", berat: "45 Kg", undian: "#3" },
      { id: "ath_4", name: "ANDI SANTOSO", contingent: "JAWA TENGAH", kelas: "B", usia: "REMAJA", gender: "PUTRA", category: "TANDING", berat: "45 Kg", undian: "#4" },
      { id: "ath_5", name: "FAJAR NUGRAHA", contingent: "DI YOGYAKARTA", kelas: "B", usia: "REMAJA", gender: "PUTRA", category: "TANDING", berat: "45 Kg", undian: "#5" },
      { id: "ath_6", name: "GUNTUR PERMANA", contingent: "BANTEN", kelas: "B", usia: "REMAJA", gender: "PUTRA", category: "TANDING", berat: "45 Kg", undian: "#6" },
      { id: "ath_7", name: "DIAN UTAMI", contingent: "JAWA TIMUR", kelas: "A", usia: "REMAJA", gender: "PUTRI", category: "TANDING", berat: "40 Kg", undian: "#7" },
      { id: "ath_8", name: "SITI NUR HALIZA", contingent: "JAWA BARAT", kelas: "A", usia: "REMAJA", gender: "PUTRI", category: "TANDING", berat: "40 Kg", undian: "#8" },
      { id: "ath_9", name: "HERI SUSANTO", contingent: "SUMATERA UTARA", kelas: "A", usia: "DEWASA", gender: "PUTRA", category: "TANDING", berat: "50 Kg", undian: "#9" },
      { id: "ath_10", name: "EKO WAHYUDI", contingent: "BALI", kelas: "A", usia: "DEWASA", gender: "PUTRA", category: "TANDING", berat: "50 Kg", undian: "#10" }
    ];
  });

  // Persist athletes
  useEffect(() => {
    localStorage.setItem("registered_athletes", JSON.stringify(athletes));
  }, [athletes]);

  // Match Schedules (Kontrol Partai)
  const [scheduleItems, setScheduleItems] = useState<any[]>(() => {
    const saved = localStorage.getItem("match_schedules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("match_schedules", JSON.stringify(scheduleItems));
  }, [scheduleItems]);

  // ---------------------------------------------------------------------------------
  // 1. CONFIGURATION PER AGE CATEGORY (KOLOM 1)
  // Default values matching image.png:
  // USIA DINI: RED (Prestasi), PRA REMAJA: RED (Prestasi), REMAJA: GREEN (Pemasalan), DEWASA: GREEN (Pemasalan)
  // ---------------------------------------------------------------------------------
  const [categoryConfigs, setCategoryConfigs] = useState<Record<AgeCategory, CategoryBaganConfig>>(() => {
    const saved = localStorage.getItem("jrz_bagan_configs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      "USIA DINI": { mode: "PRESTASI", skemaPemasalan: "SEMIFINAL", skemaPrestasi: "SINGLE_NO_POOL" },
      "PRA REMAJA": { mode: "PRESTASI", skemaPemasalan: "SEMIFINAL", skemaPrestasi: "SINGLE_NO_POOL" },
      "REMAJA": { mode: "PEMASALAN", skemaPemasalan: "FINAL", skemaPrestasi: "SINGLE_NO_POOL" },
      "DEWASA": { mode: "PEMASALAN", skemaPemasalan: "SEMIFINAL", skemaPrestasi: "SINGLE_NO_POOL" },
      "MASTER": { mode: "PEMASALAN", skemaPemasalan: "FINAL", skemaPrestasi: "SINGLE_NO_POOL" }
    };
  });

  useEffect(() => {
    localStorage.setItem("jrz_bagan_configs", JSON.stringify(categoryConfigs));
  }, [categoryConfigs]);

  // Active Selected filters for Preview (Kolom 2)
  const [selectedUsia, setSelectedUsia] = useState<AgeCategory>("REMAJA");
  const [selectedKelas, setSelectedKelas] = useState<string>("A");
  const [selectedGender, setSelectedGender] = useState<"PUTRA" | "PUTRI">("PUTRA");

  // Dynamic filter pool jika lebih dari 1 pool
  const [selectedPoolFilter, setSelectedPoolFilter] = useState<string>("ALL");

  // Zoom control for Prestasi mode
  const [prestasiZoom, setPrestasiZoom] = useState<number>(100);

  // Bagan view mode: "tree" (Diagram Pohon - Desain Resmi Bagan Pemasalan) vs "cards" (Kartu Operator)
  const [baganViewMode, setBaganViewMode] = useState<"tree" | "cards">("tree");

  // Modal Kosongkan State
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  // Loting & Shuffle State
  const [showLotingModal, setShowLotingModal] = useState<boolean>(false);
  const [lotingUsia, setLotingUsia] = useState<AgeCategory>("REMAJA");
  const [lotingKelas, setLotingKelas] = useState<string>("A");
  const [lotingGender, setLotingGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [isShufflingAnimation, setIsShufflingAnimation] = useState<boolean>(false);
  const [lotingStatusNote, setLotingStatusNote] = useState<string>("");

  // In-App Alert State
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: ""
  });

  const showAlert = (title: string, message: string) => {
    setAlertState({ isOpen: true, title, message });
  };

  // Helper count per age category for watermarks
  const athleteCountsByUsia = useMemo(() => {
    const counts: Record<AgeCategory, number> = {
      "USIA DINI": 0,
      "PRA REMAJA": 0,
      "REMAJA": 0,
      "DEWASA": 0,
      "MASTER": 0
    };
    athletes.forEach(a => {
      const u = a.usia?.toUpperCase();
      if (u === "USIA DINI" || u === "USIADINI" || u === "DINI") counts["USIA DINI"]++;
      else if (u === "PRA REMAJA" || u === "PRAREMAJA") counts["PRA REMAJA"]++;
      else if (u === "REMAJA") counts["REMAJA"]++;
      else if (u === "DEWASA") counts["DEWASA"]++;
      else if (u === "MASTER") counts["MASTER"]++;
    });
    return counts;
  }, [athletes]);

  // Athletes matching currently selected class in Kolom 2
  const currentClassAthletes = useMemo(() => {
    return athletes.filter(a => {
      const matchUsia = a.usia?.toUpperCase() === selectedUsia;
      const matchKelas = a.kelas?.toUpperCase() === selectedKelas.toUpperCase();
      const matchGender = a.gender === selectedGender;
      const isTanding = !a.category || a.category === "TANDING";
      return matchUsia && matchKelas && matchGender && isTanding;
    });
  }, [athletes, selectedUsia, selectedKelas, selectedGender]);

  // Bracket state for each pool of current class
  // Key format: `${usia}_${kelas}_${gender}`
  const currentGroupKey = `${selectedUsia}_${selectedKelas}_${selectedGender}`;
  const currentConfig = categoryConfigs[selectedUsia] || {
    mode: "PEMASALAN",
    skemaPemasalan: "FINAL",
    skemaPrestasi: "SINGLE_NO_POOL"
  };

  // Stores manual overrides or pool structures (like BYE status, deleted matches, custom scores)
  const [bracketOverrides, setBracketOverrides] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem("jrz_bracket_overrides");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem("jrz_bracket_overrides", JSON.stringify(bracketOverrides));
  }, [bracketOverrides]);

  // Helper to construct matches based on IPSI 2026 / PERSILAT rules
  const buildMatchesForCategoryAndClass = (
    u: AgeCategory,
    k: string,
    g: "PUTRA" | "PUTRI",
    athleteList: Athlete[],
    cfg: CategoryBaganConfig
  ) => {
    const groupKey = `${u}_${k}_${g}`;
    const generatedPartai: any[] = [];
    const isPemasalan = cfg.mode === "PEMASALAN";

    if (isPemasalan) {
      const isSemi = cfg.skemaPemasalan === "SEMIFINAL";
      const capacityPerPool = isSemi ? 4 : 2;
      const poolCount = Math.max(1, Math.ceil(athleteList.length / capacityPerPool));
      const poolLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

      for (let i = 0; i < poolCount; i++) {
        const poolLetter = poolLetters[i] || `P${i + 1}`;
        const poolAthletes = athleteList.slice(i * capacityPerPool, (i + 1) * capacityPerPool);

        if (!isSemi) {
          // MODE PEMASALAN: FINAL LANGSUNG (2 Atlet -> Juara 1 & 2)
          const p1 = poolAthletes[0] || { id: "bye_1", name: "BYE", contingent: "-" };
          const p2 = poolAthletes[1] || { id: "bye_2", name: "BYE", contingent: "-" };
          const matchId = `${groupKey}_POOL_${poolLetter}_FINAL`;

          generatedPartai.push({
            uniqueId: matchId,
            poolLetter,
            wing: "CENTER",
            tahapan: `FINAL POOL ${poolLetter}`,
            stageLabel: `PARTAI FINAL POOL ${poolLetter}`,
            blue: p1,
            red: p2,
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g
          });
        } else {
          // MODE PEMASALAN: SEMIFINAL (4 Atlet -> Juara 3 Bersama, Juara 2 & Juara 1)
          const p1 = poolAthletes[0] || { id: "bye_1", name: "BYE", contingent: "-" };
          const p2 = poolAthletes[1] || { id: "bye_2", name: "BYE", contingent: "-" };
          const p3 = poolAthletes[2] || { id: "bye_3", name: "BYE", contingent: "-" };
          const p4 = poolAthletes[3] || { id: "bye_4", name: "BYE", contingent: "-" };

          const sf1Id = `${groupKey}_POOL_${poolLetter}_SF1`;
          const sf2Id = `${groupKey}_POOL_${poolLetter}_SF2`;
          const finalId = `${groupKey}_POOL_${poolLetter}_FINAL`;

          generatedPartai.push({
            uniqueId: sf1Id,
            poolLetter,
            wing: "CENTER",
            tahapan: `SEMIFINAL 1 POOL ${poolLetter}`,
            stageLabel: `PARTAI SEMIFINAL 1 POOL ${poolLetter}`,
            blue: p1,
            red: p2,
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: finalId,
            nextMatchRole: "blue",
            loserDesignation: "JUARA 3 BERSAMA"
          });

          generatedPartai.push({
            uniqueId: sf2Id,
            poolLetter,
            wing: "CENTER",
            tahapan: `SEMIFINAL 2 POOL ${poolLetter}`,
            stageLabel: `PARTAI SEMIFINAL 2 POOL ${poolLetter}`,
            blue: p3,
            red: p4,
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: finalId,
            nextMatchRole: "red",
            loserDesignation: "JUARA 3 BERSAMA"
          });

          generatedPartai.push({
            uniqueId: finalId,
            poolLetter,
            wing: "CENTER",
            tahapan: `FINAL POOL ${poolLetter}`,
            stageLabel: `PARTAI FINAL POOL ${poolLetter}`,
            blue: { id: "sf1_win", name: `PEMENANG SF 1`, contingent: `POOL ${poolLetter}` },
            red: { id: "sf2_win", name: `PEMENANG SF 2`, contingent: `POOL ${poolLetter}` },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g
          });
        }
      }
    } else {
      // PRESTASI (SISTEM GUGUR)
      const isPoolAB = cfg.skemaPrestasi === "POOL_AB";

      if (!isPoolAB) {
        // PRESTASI: SINGLE POOL (Sistem Gugur Normal sampai Final)
        const count = athleteList.length;
        if (count <= 2) {
          generatedPartai.push({
            uniqueId: `${groupKey}_PRESTASI_FINAL`,
            roundIndex: 0,
            stageIndex: 0,
            wing: "CENTER",
            tahapan: "FINAL",
            stageLabel: "PARTAI FINAL UTAMA",
            blue: athleteList[0] || { id: "bye_1", name: "BYE", contingent: "-" },
            red: athleteList[1] || { id: "bye_2", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g
          });
        } else if (count <= 4) {
          const finalId = `${groupKey}_PRESTASI_FINAL`;
          generatedPartai.push({
            uniqueId: `${groupKey}_PRESTASI_SF1`,
            roundIndex: 0,
            stageIndex: 0,
            wing: "CENTER",
            tahapan: "SEMIFINAL 1",
            stageLabel: "PARTAI SEMIFINAL 1",
            blue: athleteList[0] || { id: "bye_1", name: "BYE", contingent: "-" },
            red: athleteList[1] || { id: "bye_2", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: finalId,
            nextMatchRole: "blue"
          });
          generatedPartai.push({
            uniqueId: `${groupKey}_PRESTASI_SF2`,
            roundIndex: 0,
            stageIndex: 1,
            wing: "CENTER",
            tahapan: "SEMIFINAL 2",
            stageLabel: "PARTAI SEMIFINAL 2",
            blue: athleteList[2] || { id: "bye_3", name: "BYE", contingent: "-" },
            red: athleteList[3] || { id: "bye_4", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: finalId,
            nextMatchRole: "red"
          });
          generatedPartai.push({
            uniqueId: finalId,
            roundIndex: 1,
            stageIndex: 0,
            wing: "CENTER",
            tahapan: "FINAL",
            stageLabel: "PARTAI FINAL UTAMA",
            blue: { id: "sf1_win", name: "PEMENANG SF 1", contingent: "-" },
            red: { id: "sf2_win", name: "PEMENANG SF 2", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g
          });
        } else {
          // 5-8 atlet: Perempatfinal -> Semifinal -> Final
          const sf1Id = `${groupKey}_PRESTASI_SF1`;
          const sf2Id = `${groupKey}_PRESTASI_SF2`;
          const finalId = `${groupKey}_PRESTASI_FINAL`;

          for (let q = 0; q < 4; q++) {
            const bAth = athleteList[q * 2] || { id: `bye_${q * 2 + 1}`, name: "BYE", contingent: "-" };
            const rAth = athleteList[q * 2 + 1] || { id: `bye_${q * 2 + 2}`, name: "BYE", contingent: "-" };
            generatedPartai.push({
              uniqueId: `${groupKey}_PRESTASI_QF${q + 1}`,
              roundIndex: 0,
              stageIndex: q,
              wing: "CENTER",
              tahapan: `PEREMPATFINAL ${q + 1}`,
              stageLabel: `PEREMPATFINAL ${q + 1}`,
              blue: bAth,
              red: rAth,
              blueScore: 0,
              redScore: 0,
              status: "BELUM",
              kelas: k,
              usia: u,
              gender: g,
              nextMatchId: q < 2 ? sf1Id : sf2Id,
              nextMatchRole: q % 2 === 0 ? "blue" : "red"
            });
          }

          generatedPartai.push({
            uniqueId: sf1Id,
            roundIndex: 1,
            stageIndex: 0,
            wing: "CENTER",
            tahapan: "SEMIFINAL 1",
            stageLabel: "PARTAI SEMIFINAL 1",
            blue: { id: "qf1_win", name: "PEMENANG QF 1", contingent: "-" },
            red: { id: "qf2_win", name: "PEMENANG QF 2", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: finalId,
            nextMatchRole: "blue"
          });

          generatedPartai.push({
            uniqueId: sf2Id,
            roundIndex: 1,
            stageIndex: 1,
            wing: "CENTER",
            tahapan: "SEMIFINAL 2",
            stageLabel: "PARTAI SEMIFINAL 2",
            blue: { id: "qf3_win", name: "PEMENANG QF 3", contingent: "-" },
            red: { id: "qf4_win", name: "PEMENANG QF 4", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: finalId,
            nextMatchRole: "red"
          });

          generatedPartai.push({
            uniqueId: finalId,
            roundIndex: 2,
            stageIndex: 0,
            wing: "CENTER",
            tahapan: "FINAL",
            stageLabel: "PARTAI FINAL UTAMA",
            blue: { id: "sf1_win", name: "PEMENANG SF 1", contingent: "-" },
            red: { id: "sf2_win", name: "PEMENANG SF 2", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g
          });
        }
      } else {
        // PRESTASI: POOL A & B (BAGAN SAYAP POOL A & B BERTEMU DI SEMIFINAL)
        const half = Math.max(1, Math.ceil(athleteList.length / 2));
        const poolAAthletes = athleteList.slice(0, half);
        const poolBAthletes = athleteList.slice(half);

        const sf1Id = `${groupKey}_SAYAP_SF1`;
        const sf2Id = `${groupKey}_SAYAP_SF2`;
        const finalId = `${groupKey}_SAYAP_FINAL`;

        // --- SAYAP KIRI (POOL A) ---
        if (poolAAthletes.length <= 2) {
          generatedPartai.push({
            uniqueId: `${groupKey}_SAYAP_A_FINAL`,
            wing: "A",
            poolLetter: "A",
            tahapan: "FINAL SAYAP POOL A",
            stageLabel: "FINAL SAYAP POOL A",
            blue: poolAAthletes[0] || { id: "bye_a1", name: "BYE", contingent: "-" },
            red: poolAAthletes[1] || { id: "bye_a2", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: sf1Id,
            nextMatchRole: "blue"
          });
        } else {
          const aFinalId = `${groupKey}_SAYAP_A_FINAL`;
          generatedPartai.push({
            uniqueId: `${groupKey}_SAYAP_A_SF1`,
            wing: "A",
            poolLetter: "A",
            tahapan: "SEMIFINAL 1 SAYAP POOL A",
            stageLabel: "SEMIFINAL 1 SAYAP POOL A",
            blue: poolAAthletes[0] || { id: "bye_a1", name: "BYE", contingent: "-" },
            red: poolAAthletes[1] || { id: "bye_a2", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: aFinalId,
            nextMatchRole: "blue"
          });
          generatedPartai.push({
            uniqueId: `${groupKey}_SAYAP_A_SF2`,
            wing: "A",
            poolLetter: "A",
            tahapan: "SEMIFINAL 2 SAYAP POOL A",
            stageLabel: "SEMIFINAL 2 SAYAP POOL A",
            blue: poolAAthletes[2] || { id: "bye_a3", name: "BYE", contingent: "-" },
            red: poolAAthletes[3] || { id: "bye_a4", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: aFinalId,
            nextMatchRole: "red"
          });
          generatedPartai.push({
            uniqueId: aFinalId,
            wing: "A",
            poolLetter: "A",
            tahapan: "FINAL SAYAP POOL A",
            stageLabel: "FINAL SAYAP POOL A",
            blue: { id: "a_sf1_win", name: "PEMENANG SF 1 SAYAP A", contingent: "POOL A" },
            red: { id: "a_sf2_win", name: "PEMENANG SF 2 SAYAP A", contingent: "POOL A" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: sf1Id,
            nextMatchRole: "blue"
          });
        }

        // --- SAYAP KANAN (POOL B) ---
        if (poolBAthletes.length <= 2) {
          generatedPartai.push({
            uniqueId: `${groupKey}_SAYAP_B_FINAL`,
            wing: "B",
            poolLetter: "B",
            tahapan: "FINAL SAYAP POOL B",
            stageLabel: "FINAL SAYAP POOL B",
            blue: poolBAthletes[0] || { id: "bye_b1", name: "BYE", contingent: "-" },
            red: poolBAthletes[1] || { id: "bye_b2", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: sf2Id,
            nextMatchRole: "blue"
          });
        } else {
          const bFinalId = `${groupKey}_SAYAP_B_FINAL`;
          generatedPartai.push({
            uniqueId: `${groupKey}_SAYAP_B_SF1`,
            wing: "B",
            poolLetter: "B",
            tahapan: "SEMIFINAL 1 SAYAP POOL B",
            stageLabel: "SEMIFINAL 1 SAYAP POOL B",
            blue: poolBAthletes[0] || { id: "bye_b1", name: "BYE", contingent: "-" },
            red: poolBAthletes[1] || { id: "bye_b2", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: bFinalId,
            nextMatchRole: "blue"
          });
          generatedPartai.push({
            uniqueId: `${groupKey}_SAYAP_B_SF2`,
            wing: "B",
            poolLetter: "B",
            tahapan: "SEMIFINAL 2 SAYAP POOL B",
            stageLabel: "SEMIFINAL 2 SAYAP POOL B",
            blue: poolBAthletes[2] || { id: "bye_b3", name: "BYE", contingent: "-" },
            red: poolBAthletes[3] || { id: "bye_b4", name: "BYE", contingent: "-" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: bFinalId,
            nextMatchRole: "red"
          });
          generatedPartai.push({
            uniqueId: bFinalId,
            wing: "B",
            poolLetter: "B",
            tahapan: "FINAL SAYAP POOL B",
            stageLabel: "FINAL SAYAP POOL B",
            blue: { id: "b_sf1_win", name: "PEMENANG SF 1 SAYAP B", contingent: "POOL B" },
            red: { id: "b_sf2_win", name: "PEMENANG SF 2 SAYAP B", contingent: "POOL B" },
            blueScore: 0,
            redScore: 0,
            status: "BELUM",
            kelas: k,
            usia: u,
            gender: g,
            nextMatchId: sf2Id,
            nextMatchRole: "blue"
          });
        }

        // --- PANGGUNG PUNCAK (PERTEMUAN KEDUA SAYAP DI SEMIFINAL & FINAL) ---
        generatedPartai.push({
          uniqueId: sf1Id,
          wing: "CENTER",
          tahapan: "SEMIFINAL 1 (SAYAP A VS SAYAP B)",
          stageLabel: "SEMIFINAL 1 (SAYAP A VS SAYAP B)",
          blue: { id: "juara_a", name: "JUARA SAYAP POOL A", contingent: "POOL A" },
          red: { id: "runner_b", name: poolBAthletes.length > 2 ? "RUNNER-UP SAYAP B" : poolBAthletes[1]?.name || "ATLET SAYAP B", contingent: "POOL B" },
          blueScore: 0,
          redScore: 0,
          status: "BELUM",
          kelas: k,
          usia: u,
          gender: g,
          nextMatchId: finalId,
          nextMatchRole: "blue"
        });

        generatedPartai.push({
          uniqueId: sf2Id,
          wing: "CENTER",
          tahapan: "SEMIFINAL 2 (SAYAP B VS SAYAP A)",
          stageLabel: "SEMIFINAL 2 (SAYAP B VS SAYAP A)",
          blue: { id: "juara_b", name: "JUARA SAYAP POOL B", contingent: "POOL B" },
          red: { id: "runner_a", name: poolAAthletes.length > 2 ? "RUNNER-UP SAYAP A" : poolAAthletes[1]?.name || "ATLET SAYAP A", contingent: "POOL A" },
          blueScore: 0,
          redScore: 0,
          status: "BELUM",
          kelas: k,
          usia: u,
          gender: g,
          nextMatchId: finalId,
          nextMatchRole: "red"
        });

        generatedPartai.push({
          uniqueId: finalId,
          wing: "CENTER",
          tahapan: "GRAND FINAL (PARTAI PUNCAK)",
          stageLabel: "GRAND FINAL (PARTAI PUNCAK)",
          blue: { id: "sf1_grand_win", name: "PEMENANG SEMIFINAL 1", contingent: "-" },
          red: { id: "sf2_grand_win", name: "PEMENANG SEMIFINAL 2", contingent: "-" },
          blueScore: 0,
          redScore: 0,
          status: "BELUM",
          kelas: k,
          usia: u,
          gender: g
        });
      }
    }

    return generatedPartai;
  };

  // Generate bracket with specific configuration
  const generateBracketWithConfig = (
    cat: AgeCategory,
    k: string,
    g: "PUTRA" | "PUTRI",
    cfg: CategoryBaganConfig,
    showToast = false
  ) => {
    const athletesInClass = athletes.filter(a => {
      const matchUsia = a.usia?.toUpperCase() === cat;
      const matchKelas = a.kelas?.toUpperCase() === k.toUpperCase();
      const matchGender = a.gender === g;
      const isTanding = !a.category || a.category === "TANDING";
      return matchUsia && matchKelas && matchGender && isTanding;
    });

    if (athletesInClass.length < 2) {
      if (showToast) {
        showAlert("Peserta Kurang", `Minimal diperlukan 2 atlet di ${cat} Kelas ${k} ${g} untuk membuat bagan.`);
      }
      return;
    }

    const newMatches = buildMatchesForCategoryAndClass(cat, k, g, athletesInClass, cfg);
    const grpKey = `${cat}_${k}_${g}`;

    setBracketOverrides(prev => ({
      ...prev,
      [grpKey]: newMatches
    }));

    // Sync into schedule items (match_schedules)
    const existingOtherSchedules = scheduleItems.filter(s => !s.uniqueId?.startsWith(grpKey));
    const newScheduledMatches = newMatches.map((p, idx) => ({
      uniqueId: p.uniqueId,
      partai: (existingOtherSchedules.length + idx + 1).toString(),
      gelanggang: "GELANGGANG A",
      kelas: p.kelas,
      usia: p.usia,
      gender: p.gender,
      tahapan: p.tahapan,
      blueName: p.blue?.name || "TBD",
      blueContingent: p.blue?.contingent || "-",
      redName: p.red?.name || "TBD",
      redContingent: p.red?.contingent || "-",
      status: p.status || "BELUM"
    }));

    const updatedSchedules = [...existingOtherSchedules, ...newScheduledMatches];
    setScheduleItems(updatedSchedules);
    localStorage.setItem("match_schedules", JSON.stringify(updatedSchedules));
    window.dispatchEvent(new CustomEvent("jrz_schedules_updated"));

    if (showToast) {
      const modeDesc = cfg.mode === "PEMASALAN"
        ? `Sistem Pemasalan (${cfg.skemaPemasalan === "SEMIFINAL" ? "Mode Semifinal 4 Atlet (Juara 3 Bersama, 2, 1)" : "Mode Final 2 Atlet (Juara 1 & 2)"})`
        : `Sistem Prestasi (${cfg.skemaPrestasi === "POOL_AB" ? "Bagan Sayap Pool A & B (Pertemuan Semifinal)" : "Single Pool Gugur Normal Sampai Final"})`;
      showAlert("Bagan Berhasil Digenerate", `${modeDesc} untuk ${cat} Kelas ${k} ${g} berhasil disusun dan disinkronkan ke jadwal.`);
    }
  };

  // Toggle mode switch (Pemasalan <-> Prestasi)
  const handleToggleMode = (cat: AgeCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = categoryConfigs[cat];
    const nextMode = current.mode === "PEMASALAN" ? "PRESTASI" : "PEMASALAN";
    const updatedCfg: CategoryBaganConfig = {
      ...current,
      mode: nextMode
    };
    setCategoryConfigs(prev => ({
      ...prev,
      [cat]: updatedCfg
    }));
    setSelectedUsia(cat);
    // Auto-generate bracket with the new mode
    generateBracketWithConfig(cat, selectedKelas, selectedGender, updatedCfg, false);
  };

  // Change skema pemasalan
  const handleChangeSkemaPemasalan = (cat: AgeCategory, val: "FINAL" | "SEMIFINAL") => {
    const updatedCfg: CategoryBaganConfig = {
      ...categoryConfigs[cat],
      skemaPemasalan: val
    };
    setCategoryConfigs(prev => ({
      ...prev,
      [cat]: updatedCfg
    }));
    setSelectedUsia(cat);
    // Auto-generate bracket with the new pemasalan scheme
    generateBracketWithConfig(cat, selectedKelas, selectedGender, updatedCfg, false);
  };

  // Change skema prestasi
  const handleChangeSkemaPrestasi = (cat: AgeCategory, val: "SINGLE_NO_POOL" | "POOL_AB") => {
    const updatedCfg: CategoryBaganConfig = {
      ...categoryConfigs[cat],
      skemaPrestasi: val
    };
    setCategoryConfigs(prev => ({
      ...prev,
      [cat]: updatedCfg
    }));
    setSelectedUsia(cat);
    // Auto-generate bracket with the new prestasi scheme
    generateBracketWithConfig(cat, selectedKelas, selectedGender, updatedCfg, false);
  };

  // GENERATE BRACKET & MATCHES LOGIC (Explicit button click)
  const generateBracketForClass = () => {
    generateBracketWithConfig(selectedUsia, selectedKelas, selectedGender, currentConfig, true);
  };

  // Get active matches for current class
  const activeClassMatches = useMemo(() => {
    const saved = bracketOverrides[currentGroupKey];
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;

    // Dynamically generate default matches according to the current class and active mode/scheme
    if (currentClassAthletes.length >= 2) {
      return buildMatchesForCategoryAndClass(selectedUsia, selectedKelas, selectedGender, currentClassAthletes, currentConfig);
    }
    return [];
  }, [bracketOverrides, currentGroupKey, selectedUsia, selectedKelas, selectedGender, currentClassAthletes, currentConfig]);

  // Derived pools list for Pemasalan
  const poolsList = useMemo(() => {
    const poolsMap: { [key: string]: any[] } = {};
    activeClassMatches.forEach(m => {
      const pl = m.poolLetter || "A";
      if (!poolsMap[pl]) poolsMap[pl] = [];
      poolsMap[pl].push(m);
    });
    return Object.keys(poolsMap).map(k => ({
      letter: k,
      matches: poolsMap[k]
    }));
  }, [activeClassMatches]);

  // Set Winner & Advance to Next Match
  const handleSetMatchWinner = (matchId: string, winner: 1 | 2) => {
    const updated = activeClassMatches.map(m => {
      if (m.uniqueId === matchId) {
        return {
          ...m,
          winner,
          status: "SELESAI" as const
        };
      }
      return m;
    });

    const targetMatch = updated.find(m => m.uniqueId === matchId);
    if (targetMatch) {
      const winningAthlete = winner === 1 ? targetMatch.blue : targetMatch.red;

      // If next match is specified, advance winner
      if (targetMatch.nextMatchId && targetMatch.nextMatchRole) {
        for (let i = 0; i < updated.length; i++) {
          if (updated[i].uniqueId === targetMatch.nextMatchId) {
            updated[i] = {
              ...updated[i],
              [targetMatch.nextMatchRole]: winningAthlete
            };
            break;
          }
        }
      }
    }

    setBracketOverrides(prev => ({
      ...prev,
      [currentGroupKey]: updated
    }));

    // Sync status to schedules
    setScheduleItems(prev => prev.map(s => {
      if (s.uniqueId === matchId) {
        return {
          ...s,
          status: "SELESAI"
        };
      }
      return s;
    }));
  };

  // Adjust or update scores
  const handleUpdateMatchScore = (matchId: string, corner: "blue" | "red", delta: number) => {
    const updated = activeClassMatches.map(m => {
      if (m.uniqueId === matchId) {
        const curScore = (corner === "blue" ? m.blueScore : m.redScore) || 0;
        const newScore = Math.max(0, curScore + delta);
        return {
          ...m,
          [corner === "blue" ? "blueScore" : "redScore"]: newScore
        };
      }
      return m;
    });
    setBracketOverrides(prev => ({
      ...prev,
      [currentGroupKey]: updated
    }));
  };

  // Delete individual match
  const handleDeleteMatch = (matchId: string) => {
    const updated = activeClassMatches.filter(m => m.uniqueId !== matchId);
    setBracketOverrides(prev => ({
      ...prev,
      [currentGroupKey]: updated
    }));
    setScheduleItems(prev => prev.filter(s => s.uniqueId !== matchId));
  };

  // Set participant to BYE / remove athlete
  const handleRemoveCornerAthlete = (matchId: string, corner: "blue" | "red") => {
    const updated = activeClassMatches.map(m => {
      if (m.uniqueId === matchId) {
        return {
          ...m,
          [corner]: { id: `bye_${corner}`, name: "BYE", contingent: "-" }
        };
      }
      return m;
    });
    setBracketOverrides(prev => ({
      ...prev,
      [currentGroupKey]: updated
    }));
  };

  // PDF Exporter for Active Bracket (Tampilan sama persis dengan preview bagan braket)
  const handleDownloadPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.setFont("Helvetica");

    const truncate = (str: string | undefined | null, maxChars: number) => {
      if (!str) return "-";
      return str.length > maxChars ? str.substring(0, maxChars) + "..." : str;
    };

    if (currentConfig.mode === "PEMASALAN") {
      const activePools = poolsList.filter(p => selectedPoolFilter === "ALL" || p.letter === selectedPoolFilter);
      const isSemiScheme = currentConfig.skemaPemasalan === "SEMIFINAL";

      if (activePools.length === 0 || activeClassMatches.length === 0) {
        // Empty state page
        doc.setFillColor(3, 12, 28);
        doc.rect(0, 0, 297, 210, "F");
        doc.setTextColor(34, 211, 238);
        doc.setFontSize(16);
        doc.setFont("Helvetica", "bold");
        doc.text(`BAGAN PERTANDINGAN PENCAK SILAT - SISTEM PEMASALAN`, 14, 25);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text(`Kategori: ${selectedUsia} | Kelas: ${selectedKelas} | Gender: ${selectedGender}`, 14, 34);
        doc.setTextColor(156, 163, 175);
        doc.text("Belum ada bagan pertandingan yang digenerate untuk kelas ini.", 14, 50);
        doc.save(`Bagan_Pemasalan_${selectedUsia}_${selectedKelas}_${selectedGender}.pdf`);
        return;
      }

      activePools.forEach((pool, poolIdx) => {
        if (poolIdx > 0) {
          doc.addPage();
        }

        // Full Page Dark Arena Background
        doc.setFillColor(3, 12, 28);
        doc.rect(0, 0, 297, 210, "F");

        const finalMatch = pool.matches.find(m => m.tahapan?.includes("FINAL")) || pool.matches[0];
        const semiMatches = pool.matches.filter(m => m.tahapan?.includes("SEMIFINAL"));
        const sf1 = semiMatches.find(m => m.tahapan?.includes("SEMIFINAL 1")) || semiMatches[0];
        const sf2 = semiMatches.find(m => m.tahapan?.includes("SEMIFINAL 2")) || semiMatches[1];

        const sf1Loser = sf1?.winner === 1 ? sf1.red : sf1?.winner === 2 ? sf1.blue : null;
        const sf2Loser = sf2?.winner === 1 ? sf2.red : sf2?.winner === 2 ? sf2.blue : null;
        const finalWinner = finalMatch?.winner === 1 ? finalMatch.blue : finalMatch?.winner === 2 ? finalMatch.red : null;
        const finalRunnerUp = finalMatch?.winner === 1 ? finalMatch.red : finalMatch?.winner === 2 ? finalMatch.blue : null;

        // ==============================================================
        // 1. KOP RESMI BAGAN PEMASALAN (SAMA PERSIS DOKUMEN PREVIEW)
        // ==============================================================
        doc.setFillColor(6, 44, 30);
        doc.setDrawColor(22, 90, 63);
        doc.setLineWidth(0.8);
        doc.roundedRect(12, 10, 273, 26, 2, 2, "FD");

        // Kop Texts
        doc.setTextColor(52, 211, 153); // Emerald
        doc.setFontSize(8.5);
        doc.setFont("Helvetica", "bold");
        doc.text("IKATAN PENCAK SILAT INDONESIA (IPSI)", 18, 17);

        doc.setTextColor(255, 255, 255); // White
        doc.setFontSize(13.5);
        doc.text("BAGAN PERTANDINGAN PENCAK SILAT • SISTEM PEMASALAN", 18, 24);

        doc.setFontSize(9);
        doc.setTextColor(203, 213, 225); // Light zinc
        const schemeLabel = isSemiScheme ? "4 ATLET (SEMIFINAL)" : "2 ATLET (FINAL LANGSUNG)";
        doc.text(`POOL ${pool.letter}   •   TANDING   •   ${selectedUsia}   •   KELAS ${selectedKelas}   •   ${selectedGender}   •   ${schemeLabel}`, 18, 31);

        // Right Badge
        doc.setFillColor(5, 41, 27);
        doc.setDrawColor(52, 211, 153);
        doc.setLineWidth(0.6);
        doc.roundedRect(210, 14, 70, 9, 1.5, 1.5, "FD");
        doc.setTextColor(52, 211, 153);
        doc.setFontSize(8);
        doc.text(isSemiScheme ? "JUARA 1, 2 & 3 BERSAMA" : "JUARA 1 & 2 LANGSUNG", 245, 20, { align: "center" });

        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7.5);
        doc.text(`BAGAN ${poolIdx + 1} DARI ${poolsList.length} POOL`, 245, 29, { align: "center" });

        // ==============================================================
        // 2. DIAGRAM POHON BAGAN PEMASALAN
        // ==============================================================
        if (isSemiScheme) {
          // ------------------------------------------------------------
          // A. SKEMA SEMIFINAL (4 ATLET)
          // ------------------------------------------------------------
          
          // Kolom 1 Title: BABAK SEMIFINAL
          doc.setTextColor(34, 211, 238); // Cyan
          doc.setFontSize(9.5);
          doc.setFont("Helvetica", "bold");
          doc.text("BABAK SEMIFINAL (2 PARTAI)", 14, 44);

          // ----------------- PARTAI 1 (SEMIFINAL 1) -----------------
          const p1Y = 48;
          // Outer Box
          doc.setFillColor(7, 22, 45);
          doc.setDrawColor(22, 58, 86);
          doc.setLineWidth(0.6);
          doc.roundedRect(12, p1Y, 86, 50, 1.5, 1.5, "FD");

          // Header Partai 1
          doc.setFillColor(11, 36, 68);
          doc.rect(12, p1Y, 86, 7.5, "F");
          doc.setTextColor(34, 211, 238);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "bold");
          doc.text("PARTAI 1 • SEMIFINAL 1", 16, p1Y + 5.2);
          doc.setTextColor(sf1?.status === "SELESAI" ? 52 : 251, sf1?.status === "SELESAI" ? 211 : 191, sf1?.status === "SELESAI" ? 153 : 36);
          doc.text(`[${sf1?.status || "BELUM"}]`, 94, p1Y + 5.2, { align: "right" });

          // Sudut Biru Slot
          const p1bY = p1Y + 7.5;
          if (sf1?.winner === 1) {
            doc.setFillColor(12, 49, 94);
            doc.rect(12, p1bY, 86, 16.5, "F");
          }
          // Seed Box Biru #1
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(15, p1bY + 2.5, 5.5, 5.5, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.text("1", 17.75, p1bY + 6.5, { align: "center" });

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(sf1?.blue?.name || "TBD", 18), 23, p1bY + 6.5);
          doc.setTextColor(103, 232, 249);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(sf1?.blue?.contingent || "-", 22), 23, p1bY + 12);
          if (sf1?.winner === 1) {
            doc.setFillColor(6, 182, 212);
            doc.roundedRect(73, p1bY + 3.5, 22, 5, 1, 1, "F");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(6.5);
            doc.setFont("Helvetica", "bold");
            doc.text("MENANG", 84, p1bY + 7.2, { align: "center" });
          }

          // Line divider between corners
          doc.setDrawColor(15, 42, 72);
          doc.setLineWidth(0.4);
          doc.line(12, p1bY + 16.5, 98, p1bY + 16.5);

          // Sudut Merah Slot
          const p1rY = p1bY + 16.5;
          if (sf1?.winner === 2) {
            doc.setFillColor(61, 15, 25);
            doc.rect(12, p1rY, 86, 16.5, "F");
          }
          // Seed Box Merah #2
          doc.setFillColor(220, 38, 38);
          doc.roundedRect(15, p1rY + 2.5, 5.5, 5.5, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "bold");
          doc.text("2", 17.75, p1rY + 6.5, { align: "center" });

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.text(truncate(sf1?.red?.name || "TBD", 18), 23, p1rY + 6.5);
          doc.setTextColor(252, 165, 165);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(sf1?.red?.contingent || "-", 22), 23, p1rY + 12);
          if (sf1?.winner === 2) {
            doc.setFillColor(239, 68, 68);
            doc.roundedRect(73, p1rY + 3.5, 22, 5, 1, 1, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.5);
            doc.setFont("Helvetica", "bold");
            doc.text("MENANG", 84, p1rY + 7.2, { align: "center" });
          }

          // Footer Partai 1: Kalah Juara 3 Bersama
          const p1fY = p1rY + 16.5;
          doc.setFillColor(5, 17, 33);
          doc.rect(12, p1fY, 86, 9.5, "F");
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(6.8);
          doc.setFont("Helvetica", "normal");
          doc.text("Kalah SF 1: Juara 3 Bersama", 15, p1fY + 6.2);
          doc.setTextColor(251, 191, 36);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(sf1Loser ? `🥉 ${sf1Loser.name}` : "Menunggu SF 1", 16), 94, p1fY + 6.2, { align: "right" });


          // ----------------- PARTAI 2 (SEMIFINAL 2) -----------------
          const p2Y = 110;
          doc.setFillColor(7, 22, 45);
          doc.setDrawColor(22, 58, 86);
          doc.setLineWidth(0.6);
          doc.roundedRect(12, p2Y, 86, 50, 1.5, 1.5, "FD");

          // Header Partai 2
          doc.setFillColor(11, 36, 68);
          doc.rect(12, p2Y, 86, 7.5, "F");
          doc.setTextColor(34, 211, 238);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "bold");
          doc.text("PARTAI 2 • SEMIFINAL 2", 16, p2Y + 5.2);
          doc.setTextColor(sf2?.status === "SELESAI" ? 52 : 251, sf2?.status === "SELESAI" ? 211 : 191, sf2?.status === "SELESAI" ? 153 : 36);
          doc.text(`[${sf2?.status || "BELUM"}]`, 94, p2Y + 5.2, { align: "right" });

          // Sudut Biru Slot
          const p2bY = p2Y + 7.5;
          if (sf2?.winner === 1) {
            doc.setFillColor(12, 49, 94);
            doc.rect(12, p2bY, 86, 16.5, "F");
          }
          // Seed Box Biru #3
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(15, p2bY + 2.5, 5.5, 5.5, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.text("3", 17.75, p2bY + 6.5, { align: "center" });

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(sf2?.blue?.name || "TBD", 18), 23, p2bY + 6.5);
          doc.setTextColor(103, 232, 249);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(sf2?.blue?.contingent || "-", 22), 23, p2bY + 12);
          if (sf2?.winner === 1) {
            doc.setFillColor(6, 182, 212);
            doc.roundedRect(73, p2bY + 3.5, 22, 5, 1, 1, "F");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(6.5);
            doc.setFont("Helvetica", "bold");
            doc.text("MENANG", 84, p2bY + 7.2, { align: "center" });
          }

          // Line divider
          doc.setDrawColor(15, 42, 72);
          doc.setLineWidth(0.4);
          doc.line(12, p2bY + 16.5, 98, p2bY + 16.5);

          // Sudut Merah Slot
          const p2rY = p2bY + 16.5;
          if (sf2?.winner === 2) {
            doc.setFillColor(61, 15, 25);
            doc.rect(12, p2rY, 86, 16.5, "F");
          }
          // Seed Box Merah #4
          doc.setFillColor(220, 38, 38);
          doc.roundedRect(15, p2rY + 2.5, 5.5, 5.5, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "bold");
          doc.text("4", 17.75, p2rY + 6.5, { align: "center" });

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.text(truncate(sf2?.red?.name || "TBD", 18), 23, p2rY + 6.5);
          doc.setTextColor(252, 165, 165);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(sf2?.red?.contingent || "-", 22), 23, p2rY + 12);
          if (sf2?.winner === 2) {
            doc.setFillColor(239, 68, 68);
            doc.roundedRect(73, p2rY + 3.5, 22, 5, 1, 1, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.5);
            doc.setFont("Helvetica", "bold");
            doc.text("MENANG", 84, p2rY + 7.2, { align: "center" });
          }

          // Footer Partai 2
          const p2fY = p2rY + 16.5;
          doc.setFillColor(5, 17, 33);
          doc.rect(12, p2fY, 86, 9.5, "F");
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(6.8);
          doc.setFont("Helvetica", "normal");
          doc.text("Kalah SF 2: Juara 3 Bersama", 15, p2fY + 6.2);
          doc.setTextColor(251, 191, 36);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(sf2Loser ? `🥉 ${sf2Loser.name}` : "Menunggu SF 2", 16), 94, p2fY + 6.2, { align: "right" });


          // ----------------- BRAKET CONNECTOR: SF1 & SF2 -> FINAL -----------------
          doc.setDrawColor(16, 185, 129); // Emerald
          doc.setLineWidth(0.8);
          // SF1 right connector
          doc.line(98, 73, 110, 73);
          // Vertical connector line
          doc.line(110, 73, 110, 135);
          // SF2 right connector
          doc.line(98, 135, 110, 135);
          // Spur into Final (center y = 104)
          doc.line(110, 104, 122, 104);


          // ----------------- KOLOM 2: BABAK FINAL (PARTAI 3) -----------------
          const fY = 74;
          doc.setFillColor(9, 24, 48);
          doc.setDrawColor(245, 158, 11); // Amber
          doc.setLineWidth(0.8);
          doc.roundedRect(122, fY, 84, 60, 2, 2, "FD");

          // Header Final
          doc.setFillColor(59, 35, 8);
          doc.rect(122, fY, 84, 11, "F");
          doc.setTextColor(251, 191, 36);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "bold");
          doc.text("PARTAI 3 • BABAK FINAL", 164, fY + 5.5, { align: "center" });
          doc.setTextColor(203, 213, 225);
          doc.setFontSize(6.8);
          doc.setFont("Helvetica", "normal");
          doc.text("MEMPEREBUTKAN JUARA 1 & JUARA 2", 164, fY + 9.5, { align: "center" });

          // Sudut Biru Final
          const fbY = fY + 11;
          if (finalMatch?.winner === 1) {
            doc.setFillColor(11, 56, 107);
            doc.rect(122, fbY, 84, 20, "F");
          }
          // Seed Box Biru Final
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(125, fbY + 4, 6, 6, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "bold");
          doc.text("B", 128, fbY + 8.2, { align: "center" });

          doc.setTextColor(103, 232, 249);
          doc.setFontSize(6.8);
          doc.text(sf1?.winner ? "PEMENANG PARTAI 1" : "MENUNGGU SF 1", 134, fbY + 5.5);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9.5);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(finalMatch?.blue?.name || "TBD (Pemenang SF 1)", 16), 134, fbY + 11);
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(finalMatch?.blue?.contingent || "-", 20), 134, fbY + 16.5);
          if (finalMatch?.winner === 1) {
            doc.setFillColor(245, 158, 11);
            doc.roundedRect(178, fbY + 4.5, 25, 6, 1, 1, "F");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(7);
            doc.setFont("Helvetica", "bold");
            doc.text("JUARA 1", 190.5, fbY + 8.8, { align: "center" });
          }

          // Divider
          doc.setDrawColor(20, 50, 84);
          doc.setLineWidth(0.4);
          doc.line(122, fbY + 20, 206, fbY + 20);

          // Sudut Merah Final
          const frY = fbY + 20;
          if (finalMatch?.winner === 2) {
            doc.setFillColor(69, 18, 31);
            doc.rect(122, frY, 84, 20, "F");
          }
          // Seed Box Merah Final
          doc.setFillColor(220, 38, 38);
          doc.roundedRect(125, frY + 4, 6, 6, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "bold");
          doc.text("M", 128, frY + 8.2, { align: "center" });

          doc.setTextColor(252, 165, 165);
          doc.setFontSize(6.8);
          doc.text(sf2?.winner ? "PEMENANG PARTAI 2" : "MENUNGGU SF 2", 134, frY + 5.5);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9.5);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(finalMatch?.red?.name || "TBD (Pemenang SF 2)", 16), 134, frY + 11);
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(finalMatch?.red?.contingent || "-", 20), 134, frY + 16.5);
          if (finalMatch?.winner === 2) {
            doc.setFillColor(245, 158, 11);
            doc.roundedRect(178, frY + 4.5, 25, 6, 1, 1, "F");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(7);
            doc.setFont("Helvetica", "bold");
            doc.text("JUARA 1", 190.5, frY + 8.8, { align: "center" });
          }

          // Footer Final
          const ffY = frY + 20;
          doc.setFillColor(5, 15, 33);
          doc.rect(122, ffY, 84, 9, "F");
          doc.setTextColor(251, 191, 36);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "bold");
          doc.text(finalWinner ? `Pemenang: ${finalWinner.name}` : "Menunggu Hasil Final", 164, ffY + 6, { align: "center" });


          // ----------------- BRAKET CONNECTOR: FINAL -> PODIUM -----------------
          doc.setDrawColor(245, 158, 11); // Gold
          doc.setLineWidth(0.8);
          doc.line(206, 104, 222, 104);


          // ----------------- KOLOM 3: PODIUM JUARA (MEDALI) -----------------
          doc.setTextColor(251, 191, 36);
          doc.setFontSize(9.5);
          doc.setFont("Helvetica", "bold");
          doc.text(`HASIL JUARA POOL ${pool.letter}`, 253, 44, { align: "center" });

          // Card 1: JUARA 1 (EMAS)
          const j1Y = 48;
          doc.setFillColor(36, 23, 5);
          doc.setDrawColor(245, 158, 11);
          doc.setLineWidth(0.8);
          doc.roundedRect(222, j1Y, 63, 30, 2, 2, "FD");

          doc.setTextColor(251, 191, 36);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "bold");
          doc.text("🥇 JUARA 1 (EMAS)", 226, j1Y + 7);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.text(truncate(finalWinner?.name || "Menunggu Final", 18), 226, j1Y + 16);
          doc.setTextColor(203, 213, 225);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(finalWinner?.contingent || "-", 22), 226, j1Y + 23);

          // Card 2: JUARA 2 (PERAK)
          const j2Y = 82;
          doc.setFillColor(13, 23, 41);
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.6);
          doc.roundedRect(222, j2Y, 63, 30, 2, 2, "FD");

          doc.setTextColor(226, 232, 240);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "bold");
          doc.text("🥈 JUARA 2 (PERAK)", 226, j2Y + 7);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.text(truncate(finalRunnerUp?.name || "Menunggu Final", 18), 226, j2Y + 16);
          doc.setTextColor(203, 213, 225);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(finalRunnerUp?.contingent || "-", 22), 226, j2Y + 23);

          // Card 3: JUARA 3 BERSAMA (PERUNGGU)
          const j3Y = 116;
          doc.setFillColor(31, 16, 8);
          doc.setDrawColor(194, 65, 12);
          doc.setLineWidth(0.6);
          doc.roundedRect(222, j3Y, 63, 44, 2, 2, "FD");

          doc.setTextColor(251, 146, 60);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "bold");
          doc.text("🥉 JUARA 3 BERSAMA (PERUNGGU)", 226, j3Y + 7);
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(6.8);
          doc.setFont("Helvetica", "normal");
          doc.text("Semifinalis SF 1 & SF 2", 226, j3Y + 12.5);

          // Divider
          doc.setDrawColor(124, 45, 18);
          doc.setLineWidth(0.4);
          doc.line(222, j3Y + 15, 285, j3Y + 15);

          // Semifinalis 1
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(`1. ${sf1Loser?.name || "Kalah SF 1"}`, 22), 226, j3Y + 22);
          doc.setTextColor(203, 213, 225);
          doc.setFontSize(7.2);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(`   ${sf1Loser?.contingent || "-"}`, 22), 226, j3Y + 27.5);

          // Semifinalis 2
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(`2. ${sf2Loser?.name || "Kalah SF 2"}`, 22), 226, j3Y + 34);
          doc.setTextColor(203, 213, 225);
          doc.setFontSize(7.2);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(`   ${sf2Loser?.contingent || "-"}`, 22), 226, j3Y + 39.5);

        } else {
          // ------------------------------------------------------------
          // B. SKEMA FINAL LANGSUNG (2 ATLET)
          // ------------------------------------------------------------
          
          // Kolom 1: BABAK FINAL LANGSUNG (x = 30, w = 110, y = 56 to 146)
          const flY = 56;
          doc.setFillColor(9, 24, 48);
          doc.setDrawColor(245, 158, 11);
          doc.setLineWidth(0.8);
          doc.roundedRect(30, flY, 110, 85, 2, 2, "FD");

          // Header Final Langsung
          doc.setFillColor(59, 35, 8);
          doc.rect(30, flY, 110, 14, "F");
          doc.setTextColor(251, 191, 36);
          doc.setFontSize(10.5);
          doc.setFont("Helvetica", "bold");
          doc.text("PARTAI 1 • BABAK FINAL LANGSUNG", 85, flY + 6.5, { align: "center" });
          doc.setTextColor(203, 213, 225);
          doc.setFontSize(7.5);
          doc.setFont("Helvetica", "normal");
          doc.text("2 ATLET BERJUMPA MEMPEREBUTKAN JUARA 1 & JUARA 2", 85, flY + 11.5, { align: "center" });

          // Sudut Biru Slot
          const flbY = flY + 14;
          if (finalMatch?.winner === 1) {
            doc.setFillColor(11, 56, 107);
            doc.rect(30, flbY, 110, 28, "F");
          }
          // Seed Box #1
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(35, flbY + 6, 8, 8, 1.5, 1.5, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "bold");
          doc.text("1", 39, flbY + 11.5, { align: "center" });

          doc.setTextColor(103, 232, 249);
          doc.setFontSize(7.5);
          doc.text("SUDUT BIRU", 48, flbY + 7);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(finalMatch?.blue?.name || "TBD", 22), 48, flbY + 15);
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(8.5);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(finalMatch?.blue?.contingent || "-", 26), 48, flbY + 22);
          if (finalMatch?.winner === 1) {
            doc.setFillColor(245, 158, 11);
            doc.roundedRect(108, flbY + 7, 26, 7, 1.5, 1.5, "F");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(7.5);
            doc.setFont("Helvetica", "bold");
            doc.text("JUARA 1", 121, flbY + 11.8, { align: "center" });
          }

          // Divider
          doc.setDrawColor(20, 50, 84);
          doc.setLineWidth(0.4);
          doc.line(30, flbY + 28, 140, flbY + 28);

          // Sudut Merah Slot
          const flrY = flbY + 28;
          if (finalMatch?.winner === 2) {
            doc.setFillColor(69, 18, 31);
            doc.rect(30, flrY, 110, 28, "F");
          }
          // Seed Box #2
          doc.setFillColor(220, 38, 38);
          doc.roundedRect(35, flrY + 6, 8, 8, 1.5, 1.5, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "bold");
          doc.text("2", 39, flrY + 11.5, { align: "center" });

          doc.setTextColor(252, 165, 165);
          doc.setFontSize(7.5);
          doc.text("SUDUT MERAH", 48, flrY + 7);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.setFont("Helvetica", "bold");
          doc.text(truncate(finalMatch?.red?.name || "TBD", 22), 48, flrY + 15);
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(8.5);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(finalMatch?.red?.contingent || "-", 26), 48, flrY + 22);
          if (finalMatch?.winner === 2) {
            doc.setFillColor(245, 158, 11);
            doc.roundedRect(108, flrY + 7, 26, 7, 1.5, 1.5, "F");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(7.5);
            doc.setFont("Helvetica", "bold");
            doc.text("JUARA 1", 121, flrY + 11.8, { align: "center" });
          }

          // Footer
          const flfY = flrY + 28;
          doc.setFillColor(5, 15, 33);
          doc.rect(30, flfY, 110, 15, "F");
          doc.setTextColor(251, 191, 36);
          doc.setFontSize(8.5);
          doc.setFont("Helvetica", "bold");
          doc.text(finalWinner ? `Juara 1: ${finalWinner.name}` : "Menunggu Pertandingan Selesai", 85, flfY + 9.5, { align: "center" });

          // Connector Line to Podium
          doc.setDrawColor(245, 158, 11);
          doc.setLineWidth(0.8);
          doc.line(140, 98.5, 165, 98.5);

          // Kolom 2: PODIUM JUARA FINAL LANGSUNG (x = 165, w = 100, y = 56 to 146)
          const fpY = 56;
          doc.setTextColor(251, 191, 36);
          doc.setFontSize(10.5);
          doc.setFont("Helvetica", "bold");
          doc.text(`PODIUM JUARA POOL ${pool.letter}`, 215, fpY - 5, { align: "center" });

          // Card 1: JUARA 1 (EMAS)
          doc.setFillColor(36, 23, 5);
          doc.setDrawColor(245, 158, 11);
          doc.setLineWidth(0.8);
          doc.roundedRect(165, fpY, 100, 38, 2, 2, "FD");

          doc.setTextColor(251, 191, 36);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "bold");
          doc.text("🥇 JUARA 1 (EMAS)", 172, fpY + 9);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.text(truncate(finalWinner?.name || "Menunggu Pemenang", 22), 172, fpY + 20);
          doc.setTextColor(203, 213, 225);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(finalWinner?.contingent || "-", 26), 172, fpY + 29);

          // Card 2: JUARA 2 (PERAK)
          const fp2Y = fpY + 45;
          doc.setFillColor(13, 23, 41);
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.6);
          doc.roundedRect(165, fp2Y, 100, 38, 2, 2, "FD");

          doc.setTextColor(226, 232, 240);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "bold");
          doc.text("🥈 JUARA 2 (PERAK)", 172, fp2Y + 9);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.text(truncate(finalRunnerUp?.name || "Menunggu Pertandingan", 22), 172, fp2Y + 20);
          doc.setTextColor(203, 213, 225);
          doc.setFontSize(9);
          doc.setFont("Helvetica", "normal");
          doc.text(truncate(finalRunnerUp?.contingent || "-", 26), 172, fp2Y + 29);
        }

        // Footer at bottom of every page
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "normal");
        doc.text(`Dicetak resmi dari Sistem Skoring Digital Silat • ${new Date().toLocaleString("id-ID")}`, 14, 203);
      });

      doc.save(`Bagan_Pemasalan_${selectedUsia}_${selectedKelas}_${selectedGender}.pdf`);

    } else {
      // PRESTASI MODE PDF (SINGLE POOL / POOL A & B)
      doc.setFillColor(3, 12, 28);
      doc.rect(0, 0, 297, 210, "F");

      doc.setFillColor(8, 28, 56);
      doc.setDrawColor(29, 78, 216);
      doc.setLineWidth(0.8);
      doc.roundedRect(12, 10, 273, 26, 2, 2, "FD");

      doc.setTextColor(96, 165, 250);
      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "bold");
      doc.text("IKATAN PENCAK SILAT INDONESIA (IPSI)", 18, 17);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13.5);
      doc.text(`BAGAN PERTANDINGAN PRESTASI • ${currentConfig.skemaPrestasi === "POOL_AB" ? "BAGAN SAYAP POOL A & B" : "SISTEM GUGUR TUNGGAL"}`, 18, 24);

      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`TANDING   •   ${selectedUsia}   •   KELAS ${selectedKelas}   •   ${selectedGender}   •   ${currentClassAthletes.length} ATLET TERDAFTAR`, 18, 31);

      let y = 44;
      activeClassMatches.forEach((m, idx) => {
        if (y > 175) {
          doc.addPage();
          doc.setFillColor(3, 12, 28);
          doc.rect(0, 0, 297, 210, "F");
          y = 15;
        }

        doc.setFillColor(7, 22, 45);
        doc.setDrawColor(20, 50, 84);
        doc.setLineWidth(0.5);
        doc.roundedRect(12, y, 273, 22, 1.5, 1.5, "FD");

        doc.setTextColor(251, 191, 36);
        doc.setFontSize(9);
        doc.setFont("Helvetica", "bold");
        const wingTag = m.wing === "A" ? "[SAYAP A] " : m.wing === "B" ? "[SAYAP B] " : "";
        doc.text(`${wingTag}${m.stageLabel || m.tahapan} [Status: ${m.status || "BELUM"}]`, 16, y + 6);

        // Sudut Biru
        doc.setTextColor(96, 165, 250);
        doc.setFontSize(9);
        doc.text(`SUDUT BIRU: ${m.blue?.name || "TBD"} (${m.blue?.contingent || "-"}) ${m.winner === 1 ? "[MENANG]" : ""}`, 16, y + 15);

        // Sudut Merah
        doc.setTextColor(248, 113, 113);
        doc.text(`SUDUT MERAH: ${m.red?.name || "TBD"} (${m.red?.contingent || "-"}) ${m.winner === 2 ? "[MENANG]" : ""}`, 150, y + 15);

        y += 26;
      });

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text(`Dicetak resmi dari Sistem Skoring Digital Silat • ${new Date().toLocaleString("id-ID")}`, 14, 203);

      doc.save(`Bagan_Prestasi_${selectedUsia}_${selectedKelas}_${selectedGender}.pdf`);
    }
  };

  // Kosongkan Handler
  const handleExecuteClear = (resetTotal: boolean) => {
    setShowClearModal(false);
    if (resetTotal) {
      // Clear everything
      setAthletes([]);
      setScheduleItems([]);
      setBracketOverrides({});
      localStorage.removeItem("registered_athletes");
      localStorage.removeItem("match_schedules");
      localStorage.removeItem("jrz_bracket_overrides");
      showAlert("Reset Total Selesai", "Semua data atlet, bagan pertandingan, dan jadwal partai telah dikosongkan.");
    } else {
      // Clear current class matches & schedules only
      const updatedOverrides = { ...bracketOverrides };
      delete updatedOverrides[currentGroupKey];
      setBracketOverrides(updatedOverrides);

      setScheduleItems(prev => prev.filter(s => !s.uniqueId?.startsWith(currentGroupKey)));
      showAlert("Bagan Dikosongkan", `Bagan dan jadwal partai untuk ${selectedUsia} Kelas ${selectedKelas} ${selectedGender} berhasil dikosongkan. Data atlet tetap aman.`);
    }
  };

  // ---------------------------------------------------------------------------------
  // 2. ATHLETE REGISTRATION FORM STATES (FOR TAB: input_data)
  // ---------------------------------------------------------------------------------
  const [formName, setFormName] = useState("");
  const [formContingent, setFormContingent] = useState("");
  const [formKelas, setFormKelas] = useState("A");
  const [formUsia, setFormUsia] = useState<AgeCategory>("REMAJA");
  const [formGender, setFormGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [formCategory, setFormCategory] = useState<string>("TANDING");
  const [formBerat, setFormBerat] = useState("");
  const [formUndian, setFormUndian] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Table Search and Filters (Matching image.png: Semua Usia, Semua Gender, Semua Kelas)
  const [athleteSearchQuery, setAthleteSearchQuery] = useState("");
  const [filterTableUsia, setFilterTableUsia] = useState("SEMUA");
  const [filterTableGender, setFilterTableGender] = useState("SEMUA");
  const [filterTableKelas, setFilterTableKelas] = useState("SEMUA");
  const [sortBySeedAsc, setSortBySeedAsc] = useState<boolean>(false);

  const filteredAthletes = useMemo(() => {
    const list = athletes.filter(a => {
      const q = athleteSearchQuery.toUpperCase().trim();
      const matchQuery = !q || a.name.toUpperCase().includes(q) || a.contingent.toUpperCase().includes(q);
      const matchUsia = filterTableUsia === "SEMUA" || a.usia.toUpperCase().includes(filterTableUsia.toUpperCase());
      const matchGender = filterTableGender === "SEMUA" || a.gender === filterTableGender;
      const matchKelas = filterTableKelas === "SEMUA" || a.kelas.toUpperCase() === filterTableKelas.toUpperCase();
      return matchQuery && matchUsia && matchGender && matchKelas;
    });

    if (sortBySeedAsc) {
      return [...list].sort((a, b) => {
        const numA = parseInt(String(a.undian || "").replace("#", ""), 10) || 999;
        const numB = parseInt(String(b.undian || "").replace("#", ""), 10) || 999;
        return numA - numB;
      });
    }

    return list;
  }, [athletes, athleteSearchQuery, filterTableUsia, filterTableGender, filterTableKelas, sortBySeedAsc]);

  // Loting Shuffle logic for specific category/class
  const handleExecuteLotingShuffle = (usiaTarget: string, kelasTarget: string, genderTarget: "PUTRA" | "PUTRI") => {
    const matched = athletes.filter(a => {
      const matchUsia = a.usia?.toUpperCase() === usiaTarget.toUpperCase();
      const matchGender = a.gender === genderTarget;
      const matchKelas = a.kelas?.toUpperCase() === kelasTarget.toUpperCase();
      return matchUsia && matchGender && matchKelas;
    });

    if (matched.length < 2) {
      showAlert("Loting Perlu Minimal 2 Atlet", `Silakan pastikan minimal 2 atlet terdaftar di ${usiaTarget} Kelas ${kelasTarget} ${genderTarget} untuk melakukan kocok loting!`);
      return;
    }

    setIsShufflingAnimation(true);

    setTimeout(() => {
      // Fisher-Yates shuffle
      const shuffled = [...matched];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Seeding separation: if 4+ athletes and identical contingent, separate to opposite sides
      if (shuffled.length >= 4) {
        const half = Math.ceil(shuffled.length / 2);
        for (let i = 0; i < half; i++) {
          for (let j = half; j < shuffled.length; j++) {
            if (i + 1 < half && shuffled[i].contingent === shuffled[i + 1].contingent && shuffled[i].contingent !== shuffled[j].contingent) {
              [shuffled[i + 1], shuffled[j]] = [shuffled[j], shuffled[i + 1]];
            }
          }
        }
      }

      // Assign new seed numbers #1, #2, #3...
      const seedMap = new Map<string, string>();
      shuffled.forEach((ath, idx) => {
        seedMap.set(ath.id, `#${idx + 1}`);
      });

      const updatedAthletes = athletes.map(a => {
        if (seedMap.has(a.id)) {
          return {
            ...a,
            undian: seedMap.get(a.id)
          };
        }
        return a;
      });

      setAthletes(updatedAthletes);
      localStorage.setItem("registered_athletes", JSON.stringify(updatedAthletes));
      setSortBySeedAsc(true);
      setIsShufflingAnimation(false);
      setLotingStatusNote(`Loting berhasil! ${shuffled.length} atlet telah diacak nomor undiannya (#1 s/d #${shuffled.length}).`);

      showAlert(
        "Kocok Loting Berhasil", 
        `Berhasil mengocok loting untuk ${matched.length} atlet di ${usiaTarget} Kelas ${kelasTarget} ${genderTarget}! Nomor undian baru (#1 s/d #${matched.length}) telah ditetapkan secara acak dan adil.`
      );
    }, 350);
  };

  // Loting Shuffle logic for current table filters
  const handleShuffleLoting = () => {
    const matched = athletes.filter(a => {
      const q = athleteSearchQuery.toUpperCase().trim();
      const matchQuery = !q || a.name.toUpperCase().includes(q) || a.contingent.toUpperCase().includes(q);
      const matchUsia = filterTableUsia === "SEMUA" || a.usia.toUpperCase().includes(filterTableUsia.toUpperCase());
      const matchGender = filterTableGender === "SEMUA" || a.gender === filterTableGender;
      const matchKelas = filterTableKelas === "SEMUA" || a.kelas.toUpperCase() === filterTableKelas.toUpperCase();
      return matchQuery && matchUsia && matchGender && matchKelas;
    });

    if (matched.length < 2) {
      showAlert("Loting Perlu Minimal 2 Atlet", "Silakan pilih kategori/kelas yang memiliki minimal 2 atlet untuk melakukan kocok loting!");
      return;
    }

    // Fisher-Yates shuffle
    const shuffled = [...matched];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Assign new seed numbers #1, #2, #3...
    const seedMap = new Map<string, string>();
    shuffled.forEach((ath, idx) => {
      seedMap.set(ath.id, `#${idx + 1}`);
    });

    const updatedAthletes = athletes.map(a => {
      if (seedMap.has(a.id)) {
        return {
          ...a,
          undian: seedMap.get(a.id)
        };
      }
      return a;
    });

    setAthletes(updatedAthletes);
    localStorage.setItem("registered_athletes", JSON.stringify(updatedAthletes));
    setSortBySeedAsc(true);

    showAlert(
      "Kocok Loting Berhasil", 
      `Berhasil mengocok loting untuk ${matched.length} atlet! Nomor undian baru (#1 s/d #${matched.length}) telah ditetapkan secara acak dan adil.`
    );
  };

  // Sync loting to bracket
  const handleSyncLotingToBracket = (customUsia?: AgeCategory, customKelas?: string, customGender?: "PUTRA" | "PUTRI") => {
    const u = (customUsia || (filterTableUsia !== "SEMUA" ? filterTableUsia : selectedUsia)) as AgeCategory;
    const k = customKelas || (filterTableKelas !== "SEMUA" ? filterTableKelas : selectedKelas);
    const g = (customGender || (filterTableGender !== "SEMUA" ? filterTableGender : selectedGender)) as "PUTRA" | "PUTRI";

    // Set preview filters to match this
    setSelectedUsia(u);
    setSelectedKelas(k);
    setSelectedGender(g);

    // Get athletes in this class sorted by undian number
    const classAthletes = athletes
      .filter(a => a.usia === u && a.kelas === k && a.gender === g)
      .sort((a, b) => {
        const numA = parseInt(String(a.undian || "").replace("#", ""), 10) || 999;
        const numB = parseInt(String(b.undian || "").replace("#", ""), 10) || 999;
        return numA - numB;
      });

    if (classAthletes.length < 2) {
      showAlert("Peserta Kurang", `Minimal diperlukan 2 atlet di ${u} Kelas ${k} ${g} untuk disinkronkan ke bagan braket.`);
      return;
    }

    // Generate bracket using this exact seeded loting order
    const groupKey = `${u}_${k}_${g}`;
    const cfg = categoryConfigs[u] || { mode: "PEMASALAN", skemaPemasalan: "FINAL", skemaPrestasi: "SINGLE_NO_POOL" };
    const capacityPerPool = cfg.skemaPemasalan === "SEMIFINAL" ? 4 : 2;
    const athleteList = [...classAthletes];
    const generatedPartai = buildMatchesForCategoryAndClass(u, k, g, classAthletes, cfg);

    setBracketOverrides(prev => ({
      ...prev,
      [groupKey]: generatedPartai
    }));

    const otherSchedules = scheduleItems.filter(s => !s.uniqueId?.startsWith(groupKey));
    const newMatches = generatedPartai.map((p, idx) => ({
      uniqueId: p.uniqueId,
      partai: (otherSchedules.length + idx + 1).toString(),
      gelanggang: "GELANGGANG A",
      kelas: p.kelas,
      usia: p.usia,
      gender: p.gender,
      tahapan: p.tahapan,
      blueName: p.blue?.name || "TBD",
      blueContingent: p.blue?.contingent || "-",
      redName: p.red?.name || "TBD",
      redContingent: p.red?.contingent || "-",
      status: p.status || "BELUM"
    }));

    const updatedSched = [...otherSchedules, ...newMatches];
    setScheduleItems(updatedSched);
    localStorage.setItem("match_schedules", JSON.stringify(updatedSched));
    window.dispatchEvent(new CustomEvent("jrz_schedules_updated"));

    showAlert(
      "Sinkronisasi Bagan Selesai",
      `Hasil loting untuk ${u} Kelas ${k} ${g} (${classAthletes.length} atlet) berhasil disinkronkan ke Bagan Braket! Anda dapat membuka tab 'bagan braket' untuk melihat pohon bagan yang terupdate.`
    );
  };

  const handleSaveAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContingent.trim()) {
      showAlert("Data Belum Lengkap", "Silakan masukkan nama atlet dan kontingen!");
      return;
    }

    if (editingId) {
      setAthletes(prev => prev.map(a => a.id === editingId ? {
        ...a,
        name: formName.toUpperCase().trim(),
        contingent: formContingent.toUpperCase().trim(),
        kelas: formKelas.toUpperCase().trim(),
        usia: formUsia,
        gender: formGender,
        category: formCategory,
        berat: formBerat ? (formBerat.includes("Kg") ? formBerat : `${formBerat} Kg`) : (a.berat || "40 Kg"),
        undian: formUndian ? (String(formUndian).startsWith("#") ? formUndian : `#${formUndian}`) : a.undian
      } : a));
      setEditingId(null);
      showAlert("Data Diperbarui", "Data atlet berhasil diperbarui!");
    } else {
      const newAthlete: Athlete = {
        id: `ath_${Date.now()}`,
        name: formName.toUpperCase().trim(),
        contingent: formContingent.toUpperCase().trim(),
        kelas: formKelas.toUpperCase().trim(),
        usia: formUsia,
        gender: formGender,
        category: formCategory,
        berat: formBerat ? (formBerat.includes("Kg") ? formBerat : `${formBerat} Kg`) : "40 Kg",
        undian: formUndian ? (String(formUndian).startsWith("#") ? formUndian : `#${formUndian}`) : `#${athletes.length + 1}`
      };
      setAthletes(prev => [...prev, newAthlete]);
      showAlert("Atlet Ditambahkan", "Data atlet berhasil ditambahkan!");
    }

    setFormName("");
    setFormContingent("");
    setFormBerat("");
    setFormUndian("");
  };

  const handleEditAthlete = (a: Athlete) => {
    setFormName(a.name);
    setFormContingent(a.contingent);
    setFormKelas(a.kelas);
    setFormUsia(a.usia as AgeCategory);
    setFormGender(a.gender);
    setFormCategory(a.category || "TANDING");
    setFormBerat(a.berat ? a.berat.replace(" Kg", "").trim() : "");
    setFormUndian(a.undian ? String(a.undian).replace("#", "").trim() : "");
    setEditingId(a.id);
  };

  const handleDeleteAthlete = (id: string) => {
    setAthletes(prev => prev.filter(a => a.id !== id));
  };

  const downloadExcelTemplate = () => {
    const worksheetData = [
      ["NAMA ATLIT", "KONTINGEN", "KATEGORI", "KELAS TANDING", "KATEGORI USIA", "GENDER", "BERAT", "NOMOR UNDIAN"],
      ["RENZ", "TS", "TANDING", "A", "REMAJA", "PUTRA", "40 Kg", "2"],
      ["JAKA", "PAKU BANTEN", "TANDING", "A", "REMAJA", "PUTRA", "40 Kg", "1"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Atlit");
    XLSX.writeFile(wb, "Template_Registrasi_Atlit_IPSI2026.xlsx");
  };

  // Excel handlers
  const handleExportExcelAthletes = () => {
    const dataToExport = athletes.map((a, i) => ({
      "No": i + 1,
      "NAMA ATLIT": a.name,
      "KONTINGEN": a.contingent,
      "KATEGORI": a.category || "TANDING",
      "KELAS TANDING": a.kelas,
      "KATEGORI USIA": a.usia,
      "GENDER": a.gender
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_Atlit");
    XLSX.writeFile(wb, `Data_Atlet_${tournamentName}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showAlert("Berkas Kosong", "Berkas Excel tidak memiliki data atlet!");
          return;
        }

        const imported: Athlete[] = [];
        data.forEach((row, idx) => {
          const name = String(row["NAMA ATLIT"] || row["Nama"] || row["nama"] || "").trim().toUpperCase();
          const contingent = String(row["KONTINGEN"] || row["Kontingen"] || row["Daerah"] || "").trim().toUpperCase();
          const kelas = String(row["KELAS TANDING"] || row["Kelas"] || "A").trim().toUpperCase();
          const usia = String(row["KATEGORI USIA"] || row["Usia"] || "REMAJA").trim().toUpperCase();
          const genderRaw = String(row["GENDER"] || row["Gender"] || "PUTRA").toUpperCase();
          const gender = genderRaw.includes("PUTRI") || genderRaw.includes("P") ? "PUTRI" : "PUTRA";

          if (name) {
            imported.push({
              id: `imp_${Date.now()}_${idx}`,
              name,
              contingent,
              kelas,
              usia,
              gender,
              category: "TANDING"
            });
          }
        });

        if (imported.length > 0) {
          setAthletes(prev => [...prev, ...imported]);
          showAlert("Impor Berhasil", `Berhasil mengimpor ${imported.length} atlet baru!`);
        }
      } catch (err) {
        console.error(err);
        showAlert("Gagal Impor", "Terjadi kesalahan saat membaca file Excel.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ---------------------------------------------------------------------------------
  // RENDER MAIN VIEW
  // ---------------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#050a18] text-white font-sans select-none flex flex-col overflow-x-hidden">
      
      {/* ------------------------------------------------------------------------- */}
      {/* TOP NAVIGATION BAR (EXACT REPLICA OF image.png) */}
      {/* ------------------------------------------------------------------------- */}
      <div className="w-full bg-[#030816] border-b border-[#0d1a33] px-4 py-2.5 flex items-center justify-between shrink-0 z-30">
        
        {/* Left: Emblem Icon + JRZ SCORE TGR: */}
        <div className="flex items-center gap-2.5">
          <div className="text-cyan-400 flex items-center justify-center p-1 bg-cyan-950/40 border border-cyan-500/40 rounded-lg shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            <Layers className="text-cyan-400" size={18} />
          </div>
          <span className="text-cyan-400 font-black tracking-wider text-xs sm:text-sm uppercase font-sans">
            JRZ SCORE TGR • REGISTRASI ATLET &amp; BAGAN:
          </span>
        </div>

        {/* Center: Tabs Capsule (Input data | bagan braket | kontrol partai) */}
        <div className="flex items-center bg-[#071329] border border-[#142340] rounded-full p-1 gap-1 shadow-inner">
          <button
            onClick={() => setActiveNavTab("input_data")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeNavTab === "input_data"
                ? "bg-cyan-600 text-white shadow-[0_0_14px_rgba(6,182,212,0.6)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users size={13} />
            Input data
          </button>

          <button
            onClick={() => setActiveNavTab("bagan_braket")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeNavTab === "bagan_braket"
                ? "bg-cyan-600 text-white shadow-[0_0_14px_rgba(6,182,212,0.6)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy size={13} />
            bagan braket
          </button>

          <button
            onClick={() => setActiveNavTab("kontrol_partai")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeNavTab === "kontrol_partai"
                ? "bg-cyan-600 text-white shadow-[0_0_14px_rgba(6,182,212,0.6)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar size={13} />
            kontrol partai
          </button>
        </div>

        {/* Right: Button Ke Parameter Pertandingan */}
        <div>
          <button
            onClick={onBack}
            className="bg-[#140e04] hover:bg-[#221808] border border-amber-600/80 text-amber-400 hover:text-amber-300 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <Sliders size={13} className="text-amber-400" />
            Ke Parameter Pertandingan
          </button>
        </div>

      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* TAB 1: BAGAN BRAKET (2-COLUMN DARK ARENA LED LAYOUT) */}
      {/* ------------------------------------------------------------------------- */}
      {activeNavTab === "bagan_braket" && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#050a18]">
          
          {/* ===================================================================== */}
          {/* KOLOM 1: MENU PILIHAN BAGAN (KIRI - LEBAR 360px - 380px) */}
          {/* ===================================================================== */}
          <div className="w-full lg:w-[370px] bg-[#050a18] border-r border-[#12213d] p-3 flex flex-col shrink-0 overflow-y-auto space-y-3">
            
            {/* Header Kolom 1 */}
            <div className="flex items-center justify-between border-b border-[#12213d] pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="text-indigo-400" size={15} />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  KOLOM 1: MENU PILIHAN BAGAN
                </span>
              </div>
            </div>

            {/* Outer Box Enclosing the 2x2 Grid of Age Categories */}
            <div className="border border-[#142340] bg-[#04091a]/80 p-2.5 rounded-none">
              <div className="grid grid-cols-2 gap-2">
                {(["USIA DINI", "PRA REMAJA", "REMAJA", "DEWASA"] as AgeCategory[]).map((cat) => {
                  const cfg = categoryConfigs[cat];
                  const isPemasalan = cfg.mode === "PEMASALAN";
                  const isSelected = selectedUsia === cat;
                  const count = athleteCountsByUsia[cat];

                  return (
                    <div
                      key={cat}
                      onClick={() => setSelectedUsia(cat)}
                      className={`relative p-2 rounded transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? "border-2 border-indigo-400 bg-[#07152f] shadow-[0_0_16px_rgba(99,102,241,0.35)]"
                          : "border border-[#142646] bg-[#071329] hover:border-zinc-700"
                      }`}
                    >
                      {/* Big Watermark Count in Background Right */}
                      <span className="absolute right-2 bottom-0 text-5xl font-black font-mono text-zinc-600/35 select-none pointer-events-none">
                        {count}
                      </span>

                      {/* Top Row: 3D Round Switch + Category Name + Selected Indicator */}
                      <div className="flex items-center gap-2 mb-2 z-10 relative">
                        {/* 3D Round Power Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleMode(cat, e)}
                          title={`Klik untuk ubah: ${isPemasalan ? 'Metode Pemasalan (HIJAU)' : 'Metode Prestasi (MERAH)'}`}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg shrink-0 ${
                            isPemasalan
                              ? "bg-[#05291b] border-2 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(52,211,153,0.8)] hover:brightness-125"
                              : "bg-[#2b080e] border-2 border-red-500 text-red-100 shadow-[0_0_14px_rgba(239,68,68,0.7)] hover:brightness-125"
                          }`}
                        >
                          <Power size={14} className="stroke-[2.5]" />
                        </button>

                        {/* Title & Active Indicator */}
                        <div className="flex items-center gap-1 truncate">
                          <span className="text-[11px] font-black uppercase tracking-wider text-white truncate">
                            {cat}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)] inline-block shrink-0 ml-1"></span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: 2 Dropdowns side-by-side */}
                      <div className="grid grid-cols-2 gap-1.5 z-10 relative">
                        {/* Dropdown 1: Skema Pemasalan (Aktif jika Hijau, disabled jika Merah) */}
                        <select
                          disabled={!isPemasalan}
                          value={cfg.skemaPemasalan}
                          onChange={(e) => handleChangeSkemaPemasalan(cat, e.target.value as any)}
                          onClick={(e) => e.stopPropagation()}
                          title={isPemasalan ? `Skema Pemasalan: ${cfg.skemaPemasalan}` : "Aktifkan Saklar Hijau untuk memilih Pemasalan"}
                          className={`text-[10px] font-black rounded px-1.5 py-1 outline-none transition-all truncate w-full ${
                            isPemasalan
                              ? "bg-[#062417] border border-emerald-500 text-emerald-400 cursor-pointer shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                              : "bg-[#0a1220] border border-[#15233c] text-zinc-600 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <option value="SEMIFINAL">SEMIFINAL (4)</option>
                          <option value="FINAL">FINAL (2)</option>
                        </select>

                        {/* Dropdown 2: Skema Prestasi (Aktif jika Merah, disabled jika Hijau) */}
                        <select
                          disabled={isPemasalan}
                          value={cfg.skemaPrestasi}
                          onChange={(e) => handleChangeSkemaPrestasi(cat, e.target.value as any)}
                          onClick={(e) => e.stopPropagation()}
                          title={!isPemasalan ? `Skema Prestasi: ${cfg.skemaPrestasi}` : "Aktifkan Saklar Merah untuk memilih Prestasi"}
                          className={`text-[10px] font-black rounded px-1.5 py-1 outline-none transition-all truncate w-full ${
                            !isPemasalan
                              ? "bg-[#0d2146] border border-blue-500 text-blue-200 cursor-pointer shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                              : "bg-[#0a1220] border border-[#15233c] text-zinc-600 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <option value="SINGLE_NO_POOL">SINGLE POOL</option>
                          <option value="POOL_AB">POOL A & B</option>
                        </select>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions for Kolom 1 (Exact Replica of Capture2.jpg) */}
            <div className="space-y-2 pt-1">
              {/* Full Width Yellow/Amber Button */}
              <button
                type="button"
                onClick={generateBracketForClass}
                className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs py-3 rounded-none uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98"
              >
                <Sparkles size={15} className="fill-black text-black" />
                BUAT & GENERATE BAGAN INI
              </button>

              {/* Grid 2 Buttons: Unduh PDF & Kosongkan */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="w-full bg-[#0a162c] hover:bg-[#122244] border border-[#1a315e] text-blue-300 font-black text-xs py-2.5 rounded-none uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Printer size={13} className="text-blue-300" />
                  Unduh PDF
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearModal(true)}
                  className="w-full bg-[#180a15] hover:bg-[#281329] border border-[#4c1d2e] text-red-400 font-black text-xs py-2.5 rounded-none uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Trash2 size={13} className="text-red-400" />
                  Kosongkan
                </button>
              </div>
            </div>

          </div>

          {/* ===================================================================== */}
          {/* KOLOM 2: PREVIEW BAGAN PERTANDINGAN (KANAN - FLEX-1) */}
          {/* ===================================================================== */}
          <div className="flex-1 bg-[#040814] flex flex-col overflow-y-auto p-4 arena-grid-pattern">
            
            {/* Top Bar Kolom 2 */}
            <div className="flex items-center justify-between border-b border-[#12213d] pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-3">
                {/* Cyan Box with Eye Icon */}
                <div className="w-9 h-9 rounded bg-[#0a1d3a] border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                  <Eye size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-black uppercase text-white tracking-wide">
                      KOLOM 2: PREVIEW BAGAN PERTANDINGAN
                    </h2>
                    {/* Badge Mode */}
                    {currentConfig.mode === "PEMASALAN" ? (
                      <span className="bg-emerald-950 border border-emerald-600 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        PEMASALAN (HIJAU)
                      </span>
                    ) : (
                      <span className="bg-red-950 border border-red-600 text-red-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        PRESTASI (MERAH)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Hasil dari menu Kolom 1:{" "}
                    <span className="text-cyan-400 font-bold">
                      Tanding {selectedUsia} Kelas {selectedKelas} {selectedGender}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Kelas & Statistics Bar (Exact replica of image.png) */}
            <div className="flex items-center gap-2.5 flex-wrap mb-4 shrink-0">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                KELAS:
              </span>

              {/* Dropdown Kelas */}
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="bg-[#071328] border border-cyan-500/60 text-cyan-300 font-black text-xs px-2.5 py-1 rounded outline-none cursor-pointer"
              >
                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "BEBAS"].map(k => (
                  <option key={k} value={k} className="bg-[#071328] text-white">Kelas {k}</option>
                ))}
              </select>

              {/* Dropdown Gender */}
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as any)}
                className="bg-[#071328] border border-cyan-500/60 text-cyan-300 font-black text-xs px-2.5 py-1 rounded outline-none cursor-pointer"
              >
                <option value="PUTRA" className="bg-[#071328] text-white">PUTRA</option>
                <option value="PUTRI" className="bg-[#071328] text-white">PUTRI</option>
              </select>

              {/* Stats Badges */}
              <span className="bg-[#081224] border border-[#162544] text-zinc-300 text-xs px-3 py-1 rounded font-mono font-bold">
                {currentClassAthletes.length} Atlet Terloting
              </span>

              <span className="bg-[#062215] border border-emerald-600/80 text-emerald-400 text-xs px-3 py-1 rounded font-bold">
                {poolsList.length || 1} Pool ({currentConfig.skemaPemasalan === "SEMIFINAL" ? "4 Bagan" : "2 Bagan"})
              </span>

              <span className="bg-[#181134] border border-purple-700/80 text-purple-300 text-xs px-3 py-1 rounded font-bold">
                {activeClassMatches.length} Partai Terbentuk
              </span>

            </div>

            {/* Preview Canvas Area */}
            <div className="flex-1 overflow-y-auto">
              
              {/* If no matches exist and no athletes */}
              {activeClassMatches.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-[#162544] rounded-xl p-8 bg-[#050e1f]/40">
                  <Trophy size={40} className="text-zinc-600 mb-3" />
                  <h3 className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                    BELUM ADA BAGAN TERBENTUK UNTUK KELAS INI
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-md">
                    {currentClassAthletes.length >= 2 
                      ? "Atlet sudah terdaftar! Klik tombol kuning 'BUAT & GENERATE BAGAN INI' di Kolom 1 untuk menyusun bagan pertandingan."
                      : `Terdapat ${currentClassAthletes.length} atlet di kelas ini. Daftarkan minimal 2 atlet di menu 'Input data' untuk mulai membuat bagan.`}
                  </p>
                  {currentClassAthletes.length >= 2 && (
                    <button
                      onClick={generateBracketForClass}
                      className="mt-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs px-4 py-2 rounded uppercase tracking-wide cursor-pointer shadow hover:brightness-110"
                    >
                      BUAT & GENERATE BAGAN SEKARANG
                    </button>
                  )}
                </div>
              )}

              {/* MODE 1: BAGAN PEMASALAN (SEMIFINAL & FINAL - PERSIS DESAIN BAGAN PEMASALAN.JPG TANPA PENGATUR SKOR) */}
              {currentConfig.mode === "PEMASALAN" && activeClassMatches.length > 0 && (
                <div className="space-y-6">
                  {/* Pool Filter Pills if multiple pools exist */}
                  {poolsList.length > 1 && (
                    <div className="flex items-center gap-2 bg-[#061124] border border-[#122442] p-2 rounded">
                      <span className="text-[11px] font-black uppercase text-cyan-400 mr-1">Tampilkan Pool:</span>
                      <button
                        onClick={() => setSelectedPoolFilter("ALL")}
                        className={`text-xs font-bold px-3 py-1 rounded transition-all cursor-pointer ${
                          selectedPoolFilter === "ALL"
                            ? "bg-cyan-500 text-black font-black shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                            : "bg-[#0b1b36] text-zinc-300 hover:text-white border border-[#16294d]"
                        }`}
                      >
                        SEMUA POOL ({poolsList.length})
                      </button>
                      {poolsList.map(p => (
                        <button
                          key={p.letter}
                          onClick={() => setSelectedPoolFilter(p.letter)}
                          className={`text-xs font-bold px-3 py-1 rounded transition-all cursor-pointer ${
                            selectedPoolFilter === p.letter
                              ? "bg-emerald-500 text-black font-black shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                              : "bg-[#0b1b36] text-zinc-300 hover:text-white border border-[#16294d]"
                          }`}
                        >
                          POOL {p.letter}
                        </button>
                      ))}
                    </div>
                  )}

                  {poolsList
                    .filter(p => selectedPoolFilter === "ALL" || p.letter === selectedPoolFilter)
                    .map((pool, poolIdx) => {
                      const finalMatch = pool.matches.find(m => m.tahapan?.includes("FINAL")) || pool.matches[0];
                      const semiMatches = pool.matches.filter(m => m.tahapan?.includes("SEMIFINAL"));
                      const isSemiScheme = currentConfig.skemaPemasalan === "SEMIFINAL";
                      const sf1 = semiMatches.find(m => m.tahapan?.includes("SEMIFINAL 1")) || semiMatches[0];
                      const sf2 = semiMatches.find(m => m.tahapan?.includes("SEMIFINAL 2")) || semiMatches[1];

                      // Losers of SF (Juara 3 Bersama)
                      const sf1Loser = sf1?.winner === 1 ? sf1.red : sf1?.winner === 2 ? sf1.blue : null;
                      const sf2Loser = sf2?.winner === 1 ? sf2.red : sf2?.winner === 2 ? sf2.blue : null;

                      // Winner & Runner up of Final
                      const finalWinner = finalMatch?.winner === 1 ? finalMatch.blue : finalMatch?.winner === 2 ? finalMatch.red : null;
                      const finalRunnerUp = finalMatch?.winner === 1 ? finalMatch.red : finalMatch?.winner === 2 ? finalMatch.blue : null;

                      return (
                        <div
                          key={pool.letter}
                          className="border-2 border-[#164e39] bg-[#030c1c] rounded-xl overflow-hidden shadow-2xl space-y-0"
                        >
                          {/* ============================================================== */}
                          {/* KOP BAGAN RESMI (SAMA PERSIS DOKUMEN BAGAN PEMASALAN)          */}
                          {/* ============================================================== */}
                          <div className="bg-gradient-to-r from-[#062c1e] via-[#081e36] to-[#062c1e] border-b-2 border-[#165a3f] p-4 text-white">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
                              <div className="flex items-center gap-3.5">
                                <img
                                  src="/LogoIPSI.png"
                                  alt="IPSI"
                                  className="w-12 h-12 object-contain shrink-0 filter drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                  onError={(e) => {
                                    // Fallback if logo not found
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                                <div>
                                  <div className="text-[11px] font-black text-emerald-400 tracking-widest uppercase">
                                    IKATAN PENCAK SILAT INDONESIA (IPSI)
                                  </div>
                                  <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
                                    BAGAN PERTANDINGAN PENCAK SILAT • SISTEM PEMASALAN
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-300 font-bold mt-0.5 justify-center md:justify-start">
                                    <span className="bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 px-2 py-0.5 rounded text-[10px]">
                                      POOL {pool.letter}
                                    </span>
                                    <span>TANDING</span>
                                    <span>•</span>
                                    <span className="text-cyan-300">{selectedUsia}</span>
                                    <span>•</span>
                                    <span>KELAS {selectedKelas}</span>
                                    <span>•</span>
                                    <span className="text-amber-300">{selectedGender}</span>
                                    <span>•</span>
                                    <span className="text-emerald-400">
                                      {isSemiScheme ? "4 ATLET (SEMIFINAL)" : "2 ATLET (FINAL LANGSUNG)"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-center md:items-end gap-1 shrink-0">
                                <span className="bg-[#05291b] border-2 border-emerald-400 text-emerald-300 text-xs font-black px-3.5 py-1 rounded shadow-[0_0_12px_rgba(16,185,129,0.4)] uppercase">
                                  {isSemiScheme ? "JUARA 1, 2 & 3 BERSAMA" : "JUARA 1 & 2 LANGSUNG"}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  BAGAN {poolIdx + 1} DARI {poolsList.length} POOL
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ============================================================== */}
                          {/* POHON DIAGRAM BAGAN PEMASALAN (PERSIS DESAIN GAMBAR BAGAN)     */}
                          {/* ============================================================== */}
                          <div className="p-4 sm:p-6 overflow-x-auto arena-grid-pattern">
                            
                            {isSemiScheme ? (
                              /* ---------------------------------------------------------- */
                              /* SKEMA SEMIFINAL (4 ATLET -> JUARA 3 BERSAMA, FINAL 1 & 2)   */
                              /* ---------------------------------------------------------- */
                              <div className="min-w-[850px] flex items-center justify-between gap-2 py-2">
                                
                                {/* KOLOM 1: BABAK SEMIFINAL (2 PARTAI) */}
                                <div className="w-[320px] flex flex-col justify-between space-y-8 shrink-0">
                                  
                                  {/* PARTAI 1 • SEMIFINAL 1 */}
                                  <div className="border border-[#163a56] bg-[#07162d] rounded-lg shadow-lg overflow-hidden">
                                    <div className="bg-[#0b2444] border-b border-[#143d68] px-3 py-1.5 flex items-center justify-between text-[11px] font-black text-cyan-300">
                                      <span>PARTAI 1 • SEMIFINAL 1</span>
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                        sf1?.status === "SELESAI" ? "bg-emerald-950 text-emerald-300 border border-emerald-600" : "bg-zinc-800 text-zinc-400"
                                      }`}>
                                        {sf1?.status || "BELUM"}
                                      </span>
                                    </div>

                                    {/* Sudut Biru Slot */}
                                    <div
                                      onClick={() => sf1 && handleSetMatchWinner(sf1.uniqueId, 1)}
                                      className={`p-2.5 flex items-center justify-between transition-all cursor-pointer border-b border-[#0f2a48] ${
                                        sf1?.winner === 1
                                          ? "bg-[#0c315e] border-l-4 border-l-cyan-400 shadow-[inset_0_0_12px_rgba(6,182,212,0.3)]"
                                          : "hover:bg-white/5 border-l-4 border-l-transparent"
                                      }`}
                                      title="Klik untuk tentukan pemenang sudut biru"
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <span className="w-6 h-6 rounded bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                          1
                                        </span>
                                        <div className="truncate">
                                          <div className="font-black text-white text-xs uppercase truncate">
                                            {sf1?.blue?.name || "TBD"}
                                          </div>
                                          <div className="text-[10px] text-cyan-300 uppercase truncate">
                                            {sf1?.blue?.contingent || "-"}
                                          </div>
                                        </div>
                                      </div>
                                      {sf1?.winner === 1 && (
                                        <span className="bg-cyan-500 text-black font-black text-[9px] px-2 py-0.5 rounded shrink-0 uppercase shadow">
                                          👑 MENANG
                                        </span>
                                      )}
                                    </div>

                                    {/* Sudut Merah Slot */}
                                    <div
                                      onClick={() => sf1 && handleSetMatchWinner(sf1.uniqueId, 2)}
                                      className={`p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                                        sf1?.winner === 2
                                          ? "bg-[#3d0f19] border-l-4 border-l-red-500 shadow-[inset_0_0_12px_rgba(239,68,68,0.3)]"
                                          : "hover:bg-white/5 border-l-4 border-l-transparent"
                                      }`}
                                      title="Klik untuk tentukan pemenang sudut merah"
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <span className="w-6 h-6 rounded bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                          2
                                        </span>
                                        <div className="truncate">
                                          <div className="font-black text-white text-xs uppercase truncate">
                                            {sf1?.red?.name || "TBD"}
                                          </div>
                                          <div className="text-[10px] text-red-300 uppercase truncate">
                                            {sf1?.red?.contingent || "-"}
                                          </div>
                                        </div>
                                      </div>
                                      {sf1?.winner === 2 && (
                                        <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded shrink-0 uppercase shadow">
                                          👑 MENANG
                                        </span>
                                      )}
                                    </div>

                                    {/* Sub-note Juara 3 Bersama */}
                                    <div className="bg-[#051121] px-3 py-1 border-t border-[#0e2744] text-[10px] text-zinc-400 flex items-center justify-between">
                                      <span>Kalah: Juara 3 Bersama</span>
                                      <span className="text-amber-400 font-bold">
                                        {sf1Loser ? `🥉 ${sf1Loser.name}` : "Menunggu SF 1"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* PARTAI 2 • SEMIFINAL 2 */}
                                  <div className="border border-[#163a56] bg-[#07162d] rounded-lg shadow-lg overflow-hidden">
                                    <div className="bg-[#0b2444] border-b border-[#143d68] px-3 py-1.5 flex items-center justify-between text-[11px] font-black text-cyan-300">
                                      <span>PARTAI 2 • SEMIFINAL 2</span>
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                        sf2?.status === "SELESAI" ? "bg-emerald-950 text-emerald-300 border border-emerald-600" : "bg-zinc-800 text-zinc-400"
                                      }`}>
                                        {sf2?.status || "BELUM"}
                                      </span>
                                    </div>

                                    {/* Sudut Biru Slot */}
                                    <div
                                      onClick={() => sf2 && handleSetMatchWinner(sf2.uniqueId, 1)}
                                      className={`p-2.5 flex items-center justify-between transition-all cursor-pointer border-b border-[#0f2a48] ${
                                        sf2?.winner === 1
                                          ? "bg-[#0c315e] border-l-4 border-l-cyan-400 shadow-[inset_0_0_12px_rgba(6,182,212,0.3)]"
                                          : "hover:bg-white/5 border-l-4 border-l-transparent"
                                      }`}
                                      title="Klik untuk tentukan pemenang sudut biru"
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <span className="w-6 h-6 rounded bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                          3
                                        </span>
                                        <div className="truncate">
                                          <div className="font-black text-white text-xs uppercase truncate">
                                            {sf2?.blue?.name || "TBD"}
                                          </div>
                                          <div className="text-[10px] text-cyan-300 uppercase truncate">
                                            {sf2?.blue?.contingent || "-"}
                                          </div>
                                        </div>
                                      </div>
                                      {sf2?.winner === 1 && (
                                        <span className="bg-cyan-500 text-black font-black text-[9px] px-2 py-0.5 rounded shrink-0 uppercase shadow">
                                          👑 MENANG
                                        </span>
                                      )}
                                    </div>

                                    {/* Sudut Merah Slot */}
                                    <div
                                      onClick={() => sf2 && handleSetMatchWinner(sf2.uniqueId, 2)}
                                      className={`p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                                        sf2?.winner === 2
                                          ? "bg-[#3d0f19] border-l-4 border-l-red-500 shadow-[inset_0_0_12px_rgba(239,68,68,0.3)]"
                                          : "hover:bg-white/5 border-l-4 border-l-transparent"
                                      }`}
                                      title="Klik untuk tentukan pemenang sudut merah"
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <span className="w-6 h-6 rounded bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                          4
                                        </span>
                                        <div className="truncate">
                                          <div className="font-black text-white text-xs uppercase truncate">
                                            {sf2?.red?.name || "TBD"}
                                          </div>
                                          <div className="text-[10px] text-red-300 uppercase truncate">
                                            {sf2?.red?.contingent || "-"}
                                          </div>
                                        </div>
                                      </div>
                                      {sf2?.winner === 2 && (
                                        <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded shrink-0 uppercase shadow">
                                          👑 MENANG
                                        </span>
                                      )}
                                    </div>

                                    {/* Sub-note Juara 3 Bersama */}
                                    <div className="bg-[#051121] px-3 py-1 border-t border-[#0e2744] text-[10px] text-zinc-400 flex items-center justify-between">
                                      <span>Kalah: Juara 3 Bersama</span>
                                      <span className="text-amber-400 font-bold">
                                        {sf2Loser ? `🥉 ${sf2Loser.name}` : "Menunggu SF 2"}
                                      </span>
                                    </div>
                                  </div>

                                </div>

                                {/* CONNECTOR SVG DARI SEMIFINAL KE FINAL */}
                                <div className="w-[60px] h-[340px] flex items-center justify-center shrink-0">
                                  <svg className="w-full h-full text-emerald-400" viewBox="0 0 60 340" fill="none">
                                    {/* Line from SF1 (y=85) */}
                                    <path d="M 0 85 H 35 V 170" stroke="currentColor" strokeWidth="2.5" />
                                    {/* Line from SF2 (y=255) */}
                                    <path d="M 0 255 H 35 V 170" stroke="currentColor" strokeWidth="2.5" />
                                    {/* Center spur towards Final */}
                                    <path d="M 35 170 H 60" stroke="currentColor" strokeWidth="2.5" />
                                    {/* Arrow head */}
                                    <polygon points="56,166 60,170 56,174" fill="currentColor" />
                                  </svg>
                                </div>

                                {/* KOLOM 2: BABAK FINAL (PARTAI KE-3) */}
                                <div className="w-[320px] shrink-0 my-auto">
                                  <div className="border-2 border-amber-500/80 bg-[#091830] rounded-xl shadow-[0_0_24px_rgba(245,158,11,0.2)] overflow-hidden">
                                    <div className="bg-gradient-to-r from-[#3b2308] via-[#1a2d48] to-[#3b2308] border-b border-amber-500/50 px-3 py-2 text-center">
                                      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                        <Trophy size={13} className="text-amber-400" />
                                        PARTAI 3 • BABAK FINAL
                                      </div>
                                      <div className="text-[9px] text-zinc-300 font-bold">
                                        MEMPEREBUTKAN JUARA 1 & JUARA 2
                                      </div>
                                    </div>

                                    {/* Sudut Biru Final (Pemenang Partai 1) */}
                                    <div
                                      onClick={() => finalMatch && handleSetMatchWinner(finalMatch.uniqueId, 1)}
                                      className={`p-3 flex items-center justify-between transition-all cursor-pointer border-b border-[#143254] ${
                                        finalMatch?.winner === 1
                                          ? "bg-[#0b386b] border-l-4 border-l-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.3)]"
                                          : "hover:bg-white/5 border-l-4 border-l-transparent"
                                      }`}
                                      title="Klik untuk tentukan Juara 1 (Sudut Biru)"
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <span className="w-7 h-7 rounded bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                                          B
                                        </span>
                                        <div className="truncate">
                                          <div className="text-[9px] text-cyan-400 font-bold uppercase">
                                            {sf1?.winner ? "PEMENANG PARTAI 1" : "MENUNGGU SF 1"}
                                          </div>
                                          <div className="font-black text-white text-xs uppercase truncate">
                                            {finalMatch?.blue?.name || "TBD (Pemenang SF 1)"}
                                          </div>
                                          <div className="text-[10px] text-zinc-400 uppercase truncate">
                                            {finalMatch?.blue?.contingent || "-"}
                                          </div>
                                        </div>
                                      </div>
                                      {finalMatch?.winner === 1 && (
                                        <span className="bg-amber-400 text-black font-black text-[10px] px-2 py-1 rounded shrink-0 shadow flex items-center gap-1 uppercase">
                                          🥇 JUARA 1
                                        </span>
                                      )}
                                    </div>

                                    {/* Sudut Merah Final (Pemenang Partai 2) */}
                                    <div
                                      onClick={() => finalMatch && handleSetMatchWinner(finalMatch.uniqueId, 2)}
                                      className={`p-3 flex items-center justify-between transition-all cursor-pointer ${
                                        finalMatch?.winner === 2
                                          ? "bg-[#45121f] border-l-4 border-l-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.3)]"
                                          : "hover:bg-white/5 border-l-4 border-l-transparent"
                                      }`}
                                      title="Klik untuk tentukan Juara 1 (Sudut Merah)"
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <span className="w-7 h-7 rounded bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                                          M
                                        </span>
                                        <div className="truncate">
                                          <div className="text-[9px] text-red-400 font-bold uppercase">
                                            {sf2?.winner ? "PEMENANG PARTAI 2" : "MENUNGGU SF 2"}
                                          </div>
                                          <div className="font-black text-white text-xs uppercase truncate">
                                            {finalMatch?.red?.name || "TBD (Pemenang SF 2)"}
                                          </div>
                                          <div className="text-[10px] text-zinc-400 uppercase truncate">
                                            {finalMatch?.red?.contingent || "-"}
                                          </div>
                                        </div>
                                      </div>
                                      {finalMatch?.winner === 2 && (
                                        <span className="bg-amber-400 text-black font-black text-[10px] px-2 py-1 rounded shrink-0 shadow flex items-center gap-1 uppercase">
                                          🥇 JUARA 1
                                        </span>
                                      )}
                                    </div>

                                    <div className="bg-[#050f21] px-3 py-1.5 border-t border-[#143254] text-[10px] text-center text-amber-300 font-bold">
                                      {finalWinner ? `Pemenang: ${finalWinner.name}` : "Klik slot atlet untuk memilih Juara 1"}
                                    </div>
                                  </div>
                                </div>

                                {/* CONNECTOR SVG DARI FINAL KE PODIUM */}
                                <div className="w-[50px] h-[340px] flex items-center justify-center shrink-0">
                                  <svg className="w-full h-full text-amber-400" viewBox="0 0 50 340" fill="none">
                                    <path d="M 0 170 H 50" stroke="currentColor" strokeWidth="2.5" />
                                    <polygon points="46,166 50,170 46,174" fill="currentColor" />
                                  </svg>
                                </div>

                                {/* KOLOM 3: PODIUM JUARA (MEDALI RESMI) */}
                                <div className="w-[280px] space-y-3 shrink-0 my-auto">
                                  <div className="text-center font-black text-xs text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                                    <Award size={14} className="text-amber-400" />
                                    HASIL JUARA POOL {pool.letter}
                                  </div>

                                  {/* Juara 1 (Emas) */}
                                  <div className="border-2 border-amber-400 bg-gradient-to-r from-[#241705] to-[#120c02] p-3 rounded-xl shadow-[0_0_16px_rgba(245,158,11,0.3)]">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-2xl">🥇</span>
                                      <div className="truncate">
                                        <div className="text-[10px] font-black uppercase text-amber-400">
                                          JUARA 1 (EMAS)
                                        </div>
                                        <div className="font-black text-white text-xs uppercase truncate">
                                          {finalWinner?.name || "Menunggu Final"}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 truncate">
                                          {finalWinner?.contingent || "-"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Juara 2 (Perak) */}
                                  <div className="border border-slate-400 bg-gradient-to-r from-[#0d1729] to-[#080e1a] p-2.5 rounded-xl">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-2xl">🥈</span>
                                      <div className="truncate">
                                        <div className="text-[10px] font-black uppercase text-slate-300">
                                          JUARA 2 (PERAK)
                                        </div>
                                        <div className="font-black text-white text-xs uppercase truncate">
                                          {finalRunnerUp?.name || "Menunggu Final"}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 truncate">
                                          {finalRunnerUp?.contingent || "-"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Juara 3 Bersama (Perunggu) */}
                                  <div className="border border-orange-700/80 bg-gradient-to-r from-[#1f1008] to-[#120904] p-2.5 rounded-xl space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">🥉</span>
                                      <div>
                                        <div className="text-[10px] font-black uppercase text-orange-400">
                                          JUARA 3 BERSAMA (PERUNGGU)
                                        </div>
                                        <div className="text-[9px] text-zinc-400">Semifinalis SF 1 & SF 2</div>
                                      </div>
                                    </div>
                                    <div className="space-y-1 pt-1 border-t border-orange-900/50">
                                      <div className="text-[11px] font-bold text-white uppercase truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                                        <span className="truncate">{sf1Loser?.name || "Kalah SF 1"}</span>
                                        <span className="text-[10px] text-zinc-400">({sf1Loser?.contingent || "-"})</span>
                                      </div>
                                      <div className="text-[11px] font-bold text-white uppercase truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                                        <span className="truncate">{sf2Loser?.name || "Kalah SF 2"}</span>
                                        <span className="text-[10px] text-zinc-400">({sf2Loser?.contingent || "-"})</span>
                                      </div>
                                    </div>
                                  </div>

                                </div>

                              </div>
                            ) : (
                              /* ---------------------------------------------------------- */
                              /* SKEMA FINAL LANGSUNG (2 ATLET -> JUARA 1 & JUARA 2)         */
                              /* ---------------------------------------------------------- */
                              <div className="min-w-[650px] flex items-center justify-around gap-6 py-4">
                                
                                {/* KOLOM 1: BABAK FINAL LANGSUNG */}
                                <div className="w-[360px] border-2 border-amber-500/80 bg-[#091830] rounded-xl shadow-[0_0_24px_rgba(245,158,11,0.2)] overflow-hidden shrink-0">
                                  <div className="bg-gradient-to-r from-[#3b2308] via-[#1a2d48] to-[#3b2308] border-b border-amber-500/50 px-3 py-2 text-center">
                                    <div className="text-[11px] font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                      <Trophy size={14} className="text-amber-400" />
                                      PARTAI 1 • BABAK FINAL LANGSUNG
                                    </div>
                                    <div className="text-[10px] text-zinc-300 font-bold">
                                      2 ATLET BERJUMPA MEMPEREBUTKAN JUARA 1 & JUARA 2
                                    </div>
                                  </div>

                                  {/* Sudut Biru Slot */}
                                  <div
                                    onClick={() => finalMatch && handleSetMatchWinner(finalMatch.uniqueId, 1)}
                                    className={`p-3 flex items-center justify-between transition-all cursor-pointer border-b border-[#143254] ${
                                      finalMatch?.winner === 1
                                        ? "bg-[#0b386b] border-l-4 border-l-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.3)]"
                                        : "hover:bg-white/5 border-l-4 border-l-transparent"
                                    }`}
                                    title="Klik untuk tentukan Juara 1 (Sudut Biru)"
                                  >
                                    <div className="flex items-center gap-3 truncate">
                                      <span className="w-7 h-7 rounded bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                                        1
                                      </span>
                                      <div className="truncate">
                                        <div className="text-[9px] text-cyan-400 font-bold uppercase">SUDUT BIRU</div>
                                        <div className="font-black text-white text-xs uppercase truncate">
                                          {finalMatch?.blue?.name || "TBD"}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 uppercase truncate">
                                          {finalMatch?.blue?.contingent || "-"}
                                        </div>
                                      </div>
                                    </div>
                                    {finalMatch?.winner === 1 && (
                                      <span className="bg-amber-400 text-black font-black text-[10px] px-2.5 py-1 rounded shrink-0 shadow uppercase">
                                        🥇 JUARA 1
                                      </span>
                                    )}
                                  </div>

                                  {/* Sudut Merah Slot */}
                                  <div
                                    onClick={() => finalMatch && handleSetMatchWinner(finalMatch.uniqueId, 2)}
                                    className={`p-3 flex items-center justify-between transition-all cursor-pointer ${
                                      finalMatch?.winner === 2
                                        ? "bg-[#45121f] border-l-4 border-l-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.3)]"
                                        : "hover:bg-white/5 border-l-4 border-l-transparent"
                                    }`}
                                    title="Klik untuk tentukan Juara 1 (Sudut Merah)"
                                  >
                                    <div className="flex items-center gap-3 truncate">
                                      <span className="w-7 h-7 rounded bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                                        2
                                      </span>
                                      <div className="truncate">
                                        <div className="text-[9px] text-red-400 font-bold uppercase">SUDUT MERAH</div>
                                        <div className="font-black text-white text-xs uppercase truncate">
                                          {finalMatch?.red?.name || "TBD"}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 uppercase truncate">
                                          {finalMatch?.red?.contingent || "-"}
                                        </div>
                                      </div>
                                    </div>
                                    {finalMatch?.winner === 2 && (
                                      <span className="bg-amber-400 text-black font-black text-[10px] px-2.5 py-1 rounded shrink-0 shadow uppercase">
                                        🥇 JUARA 1
                                      </span>
                                    )}
                                  </div>

                                  <div className="bg-[#050f21] px-3 py-1.5 border-t border-[#143254] text-[10px] text-center text-amber-300 font-bold">
                                    {finalWinner ? `Juara 1: ${finalWinner.name}` : "Klik sudut atlet untuk menentukan Juara 1"}
                                  </div>
                                </div>

                                {/* CONNECTOR SVG KE PODIUM */}
                                <div className="w-[60px] h-[160px] flex items-center justify-center shrink-0">
                                  <svg className="w-full h-full text-amber-400" viewBox="0 0 60 160" fill="none">
                                    <path d="M 0 80 H 60" stroke="currentColor" strokeWidth="2.5" />
                                    <polygon points="56,76 60,80 56,84" fill="currentColor" />
                                  </svg>
                                </div>

                                {/* KOLOM 2: PODIUM JUARA FINAL LANGSUNG */}
                                <div className="w-[280px] space-y-3 shrink-0">
                                  <div className="text-center font-black text-xs text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                                    <Award size={14} className="text-amber-400" />
                                    PODIUM JUARA POOL {pool.letter}
                                  </div>

                                  {/* Juara 1 (Emas) */}
                                  <div className="border-2 border-amber-400 bg-gradient-to-r from-[#241705] to-[#120c02] p-3 rounded-xl shadow-[0_0_16px_rgba(245,158,11,0.3)]">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-2xl">🥇</span>
                                      <div className="truncate">
                                        <div className="text-[10px] font-black uppercase text-amber-400">
                                          JUARA 1 (EMAS)
                                        </div>
                                        <div className="font-black text-white text-xs uppercase truncate">
                                          {finalWinner?.name || "Menunggu Pemenang"}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 truncate">
                                          {finalWinner?.contingent || "-"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Juara 2 (Perak) */}
                                  <div className="border border-slate-400 bg-gradient-to-r from-[#0d1729] to-[#080e1a] p-2.5 rounded-xl">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-2xl">🥈</span>
                                      <div className="truncate">
                                        <div className="text-[10px] font-black uppercase text-slate-300">
                                          JUARA 2 (PERAK)
                                        </div>
                                        <div className="font-black text-white text-xs uppercase truncate">
                                          {finalRunnerUp?.name || "Menunggu Pertandingan"}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 truncate">
                                          {finalRunnerUp?.contingent || "-"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* MODE 2: PRESTASI (SINGLE POOL & BAGAN SAYAP POOL A & B) */}
              {currentConfig.mode === "PRESTASI" && activeClassMatches.length > 0 && (
                <div 
                  className="bg-[#050f21] border border-blue-900/60 rounded-xl p-5 shadow-2xl transition-all space-y-6"
                  style={{ transform: `scale(${prestasiZoom / 100})`, transformOrigin: "top left" }}
                >
                  {/* Header Prestasi */}
                  <div className="flex items-center justify-between border-b border-[#142340] pb-3">
                    <div>
                      <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                        <Trophy size={18} className="text-amber-400" />
                        {currentConfig.skemaPrestasi === "POOL_AB" 
                          ? `POHON BAGAN PRESTASI SAYAP (POOL A & POOL B - PERTEMUAN DI SEMIFINAL)`
                          : `POHON BAGAN PRESTASI (SISTEM GUGUR NORMAL SAMPAI FINAL)`}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {currentConfig.skemaPrestasi === "POOL_AB"
                          ? `Sistem Sayap: Pool A (Sayap Kiri) & Pool B (Sayap Kanan) Pemenangnya Bertemu di Semifinal • ${currentClassAthletes.length} Atlet Terdaftar`
                          : `Sistem Gugur Normal: Single Elimination Tournament Tree • ${currentClassAthletes.length} Atlet Terdaftar`}
                      </p>
                    </div>
                    <span className="bg-[#0e2246] border border-cyan-500/70 text-cyan-300 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                      {currentConfig.skemaPrestasi === "POOL_AB" ? "BAGAN SAYAP POOL A & B" : "SINGLE POOL GUGUR"}
                    </span>
                  </div>

                  {/* SUB-VIEW 1: PRESTASI SINGLE POOL (SISTEM GUGUR NORMAL) */}
                  {currentConfig.skemaPrestasi === "SINGLE_NO_POOL" && (
                    <div className="space-y-6">
                      {/* Flowchart Bracket Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeClassMatches.map((m) => {
                          const isFinal = m.tahapan?.includes("FINAL") && !m.tahapan?.includes("SEMIFINAL");
                          const isSemi = m.tahapan?.includes("SEMIFINAL");

                          return (
                            <div 
                              key={m.uniqueId} 
                              className={`rounded-xl p-3.5 space-y-3 shadow-xl transition-all ${
                                isFinal 
                                  ? "border-2 border-amber-500/80 bg-[#09152b] shadow-[0_0_20px_rgba(245,158,11,0.2)]" 
                                  : isSemi
                                  ? "border border-cyan-500/60 bg-[#071329] shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                                  : "border border-blue-900/70 bg-[#050f21]"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] font-black border-b border-[#142340] pb-1.5">
                                <span className="text-amber-400 uppercase font-mono flex items-center gap-1.5">
                                  {isFinal && <Trophy size={13} className="text-yellow-400" />}
                                  {m.stageLabel || m.tahapan}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  m.status === "SELESAI" 
                                    ? "bg-emerald-950 border border-emerald-600 text-emerald-300"
                                    : "bg-amber-950/60 border border-amber-600/60 text-amber-400"
                                }`}>
                                  {m.status || "BELUM"}
                                </span>
                              </div>

                              <div className="space-y-2 text-xs">
                                {/* Sudut Biru */}
                                <div className={`p-2 rounded border transition-all ${
                                  m.winner === 1 
                                    ? "bg-[#092244] border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]" 
                                    : "bg-[#081836] border-blue-950"
                                }`}>
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="text-[9px] font-bold text-cyan-400 block uppercase">SUDUT BIRU</span>
                                      <div className="font-black text-white text-xs">{m.blue?.name || "TBD"}</div>
                                      <div className="text-[10px] text-zinc-400">{m.blue?.contingent || "-"}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-cyan-400 text-base">{m.blueScore || 0}</span>
                                      <button
                                        onClick={() => handleSetMatchWinner(m.uniqueId, 1)}
                                        className={`px-2 py-1 rounded text-[10px] font-black uppercase cursor-pointer transition-all ${
                                          m.winner === 1 
                                            ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.8)]" 
                                            : "bg-[#0c1f3d] hover:bg-cyan-900 text-cyan-300 border border-cyan-600/50"
                                        }`}
                                      >
                                        {m.winner === 1 ? "👑 MENANG" : "MENANG"}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Sudut Merah */}
                                <div className={`p-2 rounded border transition-all ${
                                  m.winner === 2 
                                    ? "bg-[#2d0f19] border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]" 
                                    : "bg-[#200d17] border-red-950"
                                }`}>
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="text-[9px] font-bold text-red-400 block uppercase">SUDUT MERAH</span>
                                      <div className="font-black text-white text-xs">{m.red?.name || "TBD"}</div>
                                      <div className="text-[10px] text-zinc-400">{m.red?.contingent || "-"}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-red-400 text-base">{m.redScore || 0}</span>
                                      <button
                                        onClick={() => handleSetMatchWinner(m.uniqueId, 2)}
                                        className={`px-2 py-1 rounded text-[10px] font-black uppercase cursor-pointer transition-all ${
                                          m.winner === 2 
                                            ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.8)]" 
                                            : "bg-[#2d0f19] hover:bg-red-900 text-red-300 border border-red-600/50"
                                        }`}
                                      >
                                        {m.winner === 2 ? "👑 MENANG" : "MENANG"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Podium Single Pool */}
                      {(() => {
                        const finalM = activeClassMatches.find(m => m.tahapan?.includes("FINAL"));
                        const juara1 = finalM?.winner === 1 ? finalM.blue : finalM?.winner === 2 ? finalM.red : null;
                        const juara2 = finalM?.winner === 1 ? finalM.red : finalM?.winner === 2 ? finalM.blue : null;

                        return (
                          <div className="border-t border-[#142340] pt-4 space-y-2">
                            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
                              <Trophy size={16} />
                              <span>PODIUM JUARA SISTEM GUGUR TUNGGAL:</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              <div className="border border-amber-500/70 bg-[#141208] p-3 rounded-lg flex items-center gap-3">
                                <span className="text-3xl">🥇</span>
                                <div>
                                  <div className="text-xs font-black text-white">{juara1?.name || "Menunggu Final"}</div>
                                  <div className="text-[10px] text-zinc-400">{juara1?.contingent || "-"}</div>
                                  <div className="text-[11px] font-black text-amber-400 uppercase">Juara 1 (Emas)</div>
                                </div>
                              </div>
                              <div className="border border-slate-400/60 bg-[#081326] p-3 rounded-lg flex items-center gap-3">
                                <span className="text-3xl">🥈</span>
                                <div>
                                  <div className="text-xs font-black text-white">{juara2?.name || "Menunggu Final"}</div>
                                  <div className="text-[10px] text-zinc-400">{juara2?.contingent || "-"}</div>
                                  <div className="text-[11px] font-black text-zinc-300 uppercase">Juara 2 (Perak)</div>
                                </div>
                              </div>
                              <div className="border border-orange-500/60 bg-[#160d07] p-3 rounded-lg flex items-center gap-3">
                                <span className="text-3xl">🥉</span>
                                <div>
                                  <div className="text-xs font-black text-white">Semifinalis</div>
                                  <div className="text-[10px] text-zinc-400">Prestasi Gugur</div>
                                  <div className="text-[11px] font-black text-orange-400 uppercase">Juara 3 Bersama</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* SUB-VIEW 2: PRESTASI BAGAN SAYAP (POOL A & POOL B BERTEMU DI SEMIFINAL) */}
                  {currentConfig.skemaPrestasi === "POOL_AB" && (
                    <div className="space-y-6">
                      {/* 3-Column Dual Wing Arena Layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        {/* KOLOM KIRI: SAYAP KIRI (POOL A) */}
                        <div className="border-2 border-cyan-500/70 rounded-xl bg-[#061226]/80 p-4 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded bg-cyan-950 border border-cyan-400 text-cyan-300 font-black flex items-center justify-center text-xs">
                                A
                              </span>
                              <div>
                                <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider">
                                  SAYAP KIRI (POOL A)
                                </h4>
                                <span className="text-[9px] text-zinc-400">Eliminasi Internal Pool A</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold bg-cyan-950 border border-cyan-600 px-2 py-0.5 rounded text-cyan-300">
                              SAYAP A
                            </span>
                          </div>

                          <div className="space-y-3">
                            {activeClassMatches.filter(m => m.wing === "A").map(m => (
                              <div key={m.uniqueId} className="border border-cyan-900/60 rounded-lg bg-[#07162e] p-2.5 space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black border-b border-cyan-950 pb-1">
                                  <span className="text-cyan-400">{m.stageLabel}</span>
                                  <span className="text-zinc-400">{m.status}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between items-center bg-[#092244] p-1.5 rounded">
                                    <span className="font-black text-white truncate max-w-[140px]">{m.blue?.name}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-cyan-400 font-bold">{m.blueScore || 0}</span>
                                      <button 
                                        onClick={() => handleSetMatchWinner(m.uniqueId, 1)}
                                        className={`px-1.5 py-0.5 text-[9px] font-black rounded ${m.winner === 1 ? "bg-cyan-500 text-black" : "bg-cyan-950 text-cyan-300"}`}
                                      >
                                        {m.winner === 1 ? "👑" : "M"}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center bg-[#1e0a12] p-1.5 rounded">
                                    <span className="font-black text-white truncate max-w-[140px]">{m.red?.name}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-red-400 font-bold">{m.redScore || 0}</span>
                                      <button 
                                        onClick={() => handleSetMatchWinner(m.uniqueId, 2)}
                                        className={`px-1.5 py-0.5 text-[9px] font-black rounded ${m.winner === 2 ? "bg-red-500 text-white" : "bg-red-950 text-red-300"}`}
                                      >
                                        {m.winner === 2 ? "👑" : "M"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-[#092440] border border-cyan-500/50 p-2 rounded text-center">
                            <span className="text-[10px] font-black text-cyan-300 block uppercase">
                              ⚡ JUARA SAYAP A
                            </span>
                            <span className="text-xs font-mono font-bold text-white block mt-0.5">
                              Melaju Menuju Semifinal 1 (Panggung Puncak)
                            </span>
                          </div>
                        </div>

                        {/* KOLOM TENGAH: PANGGUNG PUNCAK (SEMIFINAL & GRAND FINAL) */}
                        <div className="border-2 border-amber-500/80 rounded-xl bg-[#09152b] p-4 space-y-4 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                          <div className="flex items-center justify-between border-b border-amber-900/60 pb-2">
                            <div className="flex items-center gap-2">
                              <Trophy size={18} className="text-yellow-400" />
                              <div>
                                <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">
                                  PANGGUNG PUNCAK (PERTEMUAN SAYAP)
                                </h4>
                                <span className="text-[9px] text-zinc-400">Pemenang Kedua Sayap Bertemu di Semifinal</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold bg-amber-950 border border-amber-600 px-2 py-0.5 rounded text-amber-300">
                              SEMIFINAL &amp; FINAL
                            </span>
                          </div>

                          <div className="space-y-3">
                            {activeClassMatches.filter(m => m.wing === "CENTER").map(m => {
                              const isGrandFinal = m.tahapan?.includes("GRAND FINAL");

                              return (
                                <div 
                                  key={m.uniqueId} 
                                  className={`rounded-lg p-3 space-y-2 shadow-lg ${
                                    isGrandFinal 
                                      ? "border-2 border-yellow-400 bg-[#161f0a] shadow-[0_0_15px_rgba(234,179,8,0.3)]" 
                                      : "border border-amber-500/60 bg-[#0d1d38]"
                                  }`}
                                >
                                  <div className="flex justify-between items-center text-[10px] font-black border-b border-[#142340] pb-1">
                                    <span className="text-amber-400 font-mono flex items-center gap-1">
                                      {isGrandFinal && <span>👑</span>}
                                      {m.stageLabel}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded ${m.status === "SELESAI" ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-400"}`}>
                                      {m.status}
                                    </span>
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    {/* Sudut Biru */}
                                    <div className="flex justify-between items-center bg-[#07162e] p-2 rounded border-l-2 border-cyan-400">
                                      <div>
                                        <div className="font-black text-white truncate max-w-[140px]">{m.blue?.name}</div>
                                        <div className="text-[9px] text-zinc-400">{m.blue?.contingent}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-cyan-400 font-bold">{m.blueScore || 0}</span>
                                        <button 
                                          onClick={() => handleSetMatchWinner(m.uniqueId, 1)}
                                          className={`px-2 py-0.5 text-[10px] font-black rounded ${m.winner === 1 ? "bg-cyan-500 text-black shadow" : "bg-blue-950 text-cyan-300"}`}
                                        >
                                          {m.winner === 1 ? "👑 MENANG" : "MENANG"}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Sudut Merah */}
                                    <div className="flex justify-between items-center bg-[#1e0a12] p-2 rounded border-l-2 border-red-500">
                                      <div>
                                        <div className="font-black text-white truncate max-w-[140px]">{m.red?.name}</div>
                                        <div className="text-[9px] text-zinc-400">{m.red?.contingent}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-red-400 font-bold">{m.redScore || 0}</span>
                                        <button 
                                          onClick={() => handleSetMatchWinner(m.uniqueId, 2)}
                                          className={`px-2 py-0.5 text-[10px] font-black rounded ${m.winner === 2 ? "bg-red-500 text-white shadow" : "bg-red-950 text-red-300"}`}
                                        >
                                          {m.winner === 2 ? "👑 MENANG" : "MENANG"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Grand Podium */}
                          {(() => {
                            const gf = activeClassMatches.find(m => m.tahapan?.includes("GRAND FINAL"));
                            const j1 = gf?.winner === 1 ? gf.blue : gf?.winner === 2 ? gf.red : null;
                            const j2 = gf?.winner === 1 ? gf.red : gf?.winner === 2 ? gf.blue : null;

                            return (
                              <div className="border-t border-amber-900/60 pt-3 space-y-2">
                                <span className="text-[10px] font-black text-amber-400 uppercase block tracking-wider">
                                  🏆 JUARA & PODIUM BAGAN SAYAP:
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                                  <div className="border border-amber-500/70 bg-[#161205] p-2 rounded">
                                    <span className="text-xl">🥇</span>
                                    <div className="text-[11px] font-black text-white truncate">{j1?.name || "Menunggu Final"}</div>
                                    <span className="text-[9px] text-amber-400 font-bold block">JUARA 1 (EMAS)</span>
                                  </div>
                                  <div className="border border-slate-400/60 bg-[#071329] p-2 rounded">
                                    <span className="text-xl">🥈</span>
                                    <div className="text-[11px] font-black text-white truncate">{j2?.name || "Menunggu Final"}</div>
                                    <span className="text-[9px] text-zinc-300 font-bold block">JUARA 2 (PERAK)</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* KOLOM KANAN: SAYAP KANAN (POOL B) */}
                        <div className="border-2 border-purple-500/70 rounded-xl bg-[#140826]/80 p-4 space-y-4 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                          <div className="flex items-center justify-between border-b border-purple-900/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded bg-purple-950 border border-purple-400 text-purple-300 font-black flex items-center justify-center text-xs">
                                B
                              </span>
                              <div>
                                <h4 className="text-xs font-black uppercase text-purple-300 tracking-wider">
                                  SAYAP KANAN (POOL B)
                                </h4>
                                <span className="text-[9px] text-zinc-400">Eliminasi Internal Pool B</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold bg-purple-950 border border-purple-600 px-2 py-0.5 rounded text-purple-300">
                              SAYAP B
                            </span>
                          </div>

                          <div className="space-y-3">
                            {activeClassMatches.filter(m => m.wing === "B").map(m => (
                              <div key={m.uniqueId} className="border border-purple-900/60 rounded-lg bg-[#180a2b] p-2.5 space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black border-b border-purple-950 pb-1">
                                  <span className="text-purple-400">{m.stageLabel}</span>
                                  <span className="text-zinc-400">{m.status}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between items-center bg-[#092244] p-1.5 rounded">
                                    <span className="font-black text-white truncate max-w-[140px]">{m.blue?.name}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-cyan-400 font-bold">{m.blueScore || 0}</span>
                                      <button 
                                        onClick={() => handleSetMatchWinner(m.uniqueId, 1)}
                                        className={`px-1.5 py-0.5 text-[9px] font-black rounded ${m.winner === 1 ? "bg-cyan-500 text-black" : "bg-cyan-950 text-cyan-300"}`}
                                      >
                                        {m.winner === 1 ? "👑" : "M"}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center bg-[#1e0a12] p-1.5 rounded">
                                    <span className="font-black text-white truncate max-w-[140px]">{m.red?.name}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-red-400 font-bold">{m.redScore || 0}</span>
                                      <button 
                                        onClick={() => handleSetMatchWinner(m.uniqueId, 2)}
                                        className={`px-1.5 py-0.5 text-[9px] font-black rounded ${m.winner === 2 ? "bg-red-500 text-white" : "bg-red-950 text-red-300"}`}
                                      >
                                        {m.winner === 2 ? "👑" : "M"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-[#240b3b] border border-purple-500/50 p-2 rounded text-center">
                            <span className="text-[10px] font-black text-purple-300 block uppercase">
                              ⚡ JUARA SAYAP B
                            </span>
                            <span className="text-xs font-mono font-bold text-white block mt-0.5">
                              Melaju Menuju Semifinal 2 (Panggung Puncak)
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* TAB 2: INPUT DATA (PENDAFTARAN & MANAJEMEN ATLET - 2 KOLOM DARK ARENA LED) */}
      {/* ------------------------------------------------------------------------- */}
      {activeNavTab === "input_data" && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#050a18]">
          
          {/* ===================================================================== */}
          {/* KOLOM 1: FORMULIR INPUT ATLET (KIRI - LEBAR 370px) */}
          {/* ===================================================================== */}
          <div className="w-full lg:w-[370px] bg-[#050a18] border-r border-[#12213d] p-3 flex flex-col shrink-0 overflow-y-auto space-y-3">
            
            {/* Header Kolom 1 */}
            <div className="flex items-center justify-between border-b border-[#12213d] pb-2">
              <div className="flex items-center gap-2">
                <Users className="text-cyan-400" size={15} />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  KOLOM 1: FORM INPUT ATLET
                </span>
              </div>
              <span className="bg-[#0b2438] border border-cyan-500/70 text-cyan-300 text-[10px] font-black px-2.5 py-0.5 rounded uppercase font-mono">
                IPSI 2026
              </span>
            </div>

            {/* Status & Ringkasan Atlet Terdaftar per Kategori */}
            <div className="border border-[#142340] bg-[#04091a] p-2.5 rounded-none space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <ShieldCheck size={12} /> DATABASE ATLET:
                </span>
                <span className="font-mono text-amber-400">{athletes.length} Total Atlet</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center font-mono">
                <div className="bg-[#071329] border border-[#142646] p-1">
                  <div className="text-[8px] text-zinc-400 truncate">DINI</div>
                  <div className="text-xs font-black text-cyan-400">{athleteCountsByUsia["USIA DINI"]}</div>
                </div>
                <div className="bg-[#071329] border border-[#142646] p-1">
                  <div className="text-[8px] text-zinc-400 truncate">PRA RMJ</div>
                  <div className="text-xs font-black text-cyan-400">{athleteCountsByUsia["PRA REMAJA"]}</div>
                </div>
                <div className="bg-[#071329] border border-[#142646] p-1">
                  <div className="text-[8px] text-zinc-400 truncate">REMAJA</div>
                  <div className="text-xs font-black text-cyan-400">{athleteCountsByUsia["REMAJA"]}</div>
                </div>
                <div className="bg-[#071329] border border-[#142646] p-1">
                  <div className="text-[8px] text-zinc-400 truncate">DEWASA</div>
                  <div className="text-xs font-black text-cyan-400">{athleteCountsByUsia["DEWASA"]}</div>
                </div>
              </div>
            </div>

            {/* Form Input Fields Box */}
            <div className="border border-[#142340] bg-[#071126] p-3 rounded-none space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#142340] pb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
                  <Plus size={13} />
                  {editingId ? "KOREKSI DATA ATLET" : "TAMBAH DATA ATLET"}
                </span>
                {editingId && (
                  <button 
                    onClick={() => { setEditingId(null); setFormName(""); setFormContingent(""); }}
                    className="text-[9px] font-bold text-red-400 hover:underline cursor-pointer"
                  >
                    Batal Koreksi
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveAthlete} className="space-y-2">
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase block mb-0.5">
                    Nama Lengkap Atlet *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="CONTOH: JAKA"
                    className="w-full bg-[#050b18] border border-[#142340] focus:border-cyan-400 rounded-none px-2.5 py-1.5 text-xs text-white uppercase font-black outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase block mb-0.5">
                    Kontingen / Perguruan / Daerah *
                  </label>
                  <input
                    type="text"
                    required
                    value={formContingent}
                    onChange={(e) => setFormContingent(e.target.value)}
                    placeholder="CONTOH: PAKU BANTEN"
                    className="w-full bg-[#050b18] border border-[#142340] focus:border-cyan-400 rounded-none px-2.5 py-1.5 text-xs text-white uppercase font-black outline-none"
                  />
                </div>

                {/* Pemilihan Kategori Usia dengan Sistem Dropdown (IPSI 2026 & PERSILAT) */}
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase block mb-0.5">
                    Kategori Usia *
                  </label>
                  <select
                    value={formUsia}
                    onChange={(e) => {
                      const val = e.target.value as AgeCategory;
                      setFormUsia(val);
                      setSelectedUsia(val);
                      if (filterTableUsia !== "SEMUA") setFilterTableUsia(val);
                    }}
                    className="w-full bg-[#050b18] border border-[#142340] focus:border-cyan-400 rounded-none px-2.5 py-1.5 text-[11px] text-white font-black outline-none uppercase cursor-pointer"
                  >
                    <option value="USIA DINI">USIA DINI (5 - 11 Tahun)</option>
                    <option value="PRA REMAJA">PRA REMAJA (11 - 14 Tahun)</option>
                    <option value="REMAJA">REMAJA (14 - 17 Tahun)</option>
                    <option value="DEWASA">DEWASA (17 - 35 Tahun)</option>
                    <option value="MASTER">MASTER (&gt; 35 Tahun)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-0.5">
                      Gender
                    </label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as any)}
                      className="w-full bg-[#050b18] border border-[#142340] focus:border-cyan-400 rounded-none px-2 py-1.5 text-[11px] text-white font-bold outline-none uppercase"
                    >
                      <option value="PUTRA">PUTRA</option>
                      <option value="PUTRI">PUTRI</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-0.5">
                      Kelas Tanding
                    </label>
                    <select
                      value={formKelas}
                      onChange={(e) => setFormKelas(e.target.value)}
                      className="w-full bg-[#050b18] border border-[#142340] focus:border-cyan-400 rounded-none px-2 py-1.5 text-[11px] text-white font-bold outline-none uppercase"
                    >
                      {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "BEBAS"].map(k => (
                        <option key={k} value={k}>Kelas {k}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-0.5">
                      Berat Badan
                    </label>
                    <input
                      type="text"
                      value={formBerat}
                      onChange={(e) => setFormBerat(e.target.value)}
                      placeholder="CONTOH: 40 Kg"
                      className="w-full bg-[#050b18] border border-[#142340] focus:border-cyan-400 rounded-none px-2 py-1.5 text-[11px] text-white font-bold outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-0.5">
                      No. Undian / Seed
                    </label>
                    <input
                      type="text"
                      value={formUndian}
                      onChange={(e) => setFormUndian(e.target.value)}
                      placeholder="#1 / #2"
                      className="w-full bg-[#050b18] border border-[#142340] focus:border-cyan-400 rounded-none px-2 py-1.5 text-[11px] text-white font-bold outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs py-2.5 rounded-none uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98 mt-2"
                >
                  <Sparkles size={14} className="fill-black text-black" />
                  {editingId ? "SIMPAN PERUBAHAN DATA" : "+ SIMPAN ATLET KE DATABASE"}
                </button>
              </form>
            </div>

            {/* Excel Import / Export Tools */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-mono">
                BERKAS & IMPORT MASAL
              </span>
              <div className="grid grid-cols-2 gap-2">
                <label className="bg-[#0a162c] hover:bg-[#122244] border border-[#1a315e] text-cyan-300 font-black text-xs py-2 rounded-none text-center cursor-pointer flex items-center justify-center gap-1.5 transition-all">
                  <Upload size={12} /> Impor Excel
                  <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleExportExcelAthletes}
                  className="bg-[#0a162c] hover:bg-[#122244] border border-[#1a315e] text-emerald-300 font-black text-xs py-2 rounded-none text-center cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download size={12} /> Ekspor Excel
                </button>
              </div>

              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="w-full bg-[#071329] hover:bg-[#0c1e3a] border border-[#162a50] text-zinc-300 hover:text-white font-bold text-[10px] py-1.5 rounded-none uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <FileSpreadsheet size={12} className="text-amber-400" />
                <span>Unduh Template Excel IPSI 2026</span>
              </button>
            </div>

          </div>

          {/* ===================================================================== */}
          {/* KOLOM 2: DATABASE ATLET TERDAFTAR & PREVIEW LOTING (KANAN - FLEX-1) */}
          {/* ===================================================================== */}
          <div className="flex-1 bg-[#040814] flex flex-col overflow-y-auto p-4 arena-grid-pattern space-y-3">
            
            {/* Top Bar Kolom 2 */}
            <div className="flex items-center justify-between border-b border-[#12213d] pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-[#0a1d3a] border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                  <Users size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-black uppercase text-white tracking-wide">
                      KOLOM 2: DATABASE ATLET & LOTING
                    </h2>
                    <span className="bg-emerald-950 border border-emerald-600 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono">
                      IPSI 2026 &amp; PERSILAT
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Data atlet ini tersinkronisasi otomatis ke Pohon Bagan &amp; Jadwal Pertandingan
                  </p>
                </div>
              </div>

              {/* Menu Loting Atlet (Shuffle) */}
              <button
                type="button"
                onClick={() => {
                  const u = (filterTableUsia !== "SEMUA" ? filterTableUsia : formUsia) as AgeCategory;
                  const k = filterTableKelas !== "SEMUA" ? filterTableKelas : formKelas;
                  const g = (filterTableGender !== "SEMUA" ? filterTableGender : formGender) as "PUTRA" | "PUTRI";
                  setLotingUsia(u);
                  setLotingKelas(k);
                  setLotingGender(g);
                  setShowLotingModal(true);
                }}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs px-3.5 py-1.5 rounded-none uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:brightness-110 cursor-pointer transition-all active:scale-95"
              >
                <Shuffle size={13} />
                <span>LOTING ATLET (SHUFFLE)</span>
              </button>
            </div>

            {/* Filter & Live Statistic Cards Bar */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {/* Filter Usia */}
              <select
                value={filterTableUsia}
                onChange={(e) => setFilterTableUsia(e.target.value)}
                className="bg-[#071328] border border-cyan-500/60 text-cyan-300 font-black text-xs px-2.5 py-1 rounded-none outline-none cursor-pointer"
              >
                <option value="SEMUA">SEMUA USIA</option>
                <option value="USIA DINI">USIA DINI</option>
                <option value="PRA REMAJA">PRA REMAJA</option>
                <option value="REMAJA">REMAJA</option>
                <option value="DEWASA">DEWASA</option>
                <option value="MASTER">MASTER</option>
              </select>

              {/* Filter Kelas */}
              <select
                value={filterTableKelas}
                onChange={(e) => setFilterTableKelas(e.target.value)}
                className="bg-[#071328] border border-cyan-500/60 text-cyan-300 font-black text-xs px-2.5 py-1 rounded-none outline-none cursor-pointer"
              >
                <option value="SEMUA">SEMUA KELAS</option>
                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "BEBAS"].map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>

              {/* Filter Gender */}
              <select
                value={filterTableGender}
                onChange={(e) => setFilterTableGender(e.target.value)}
                className="bg-[#071328] border border-cyan-500/60 text-cyan-300 font-black text-xs px-2.5 py-1 rounded-none outline-none cursor-pointer"
              >
                <option value="SEMUA">SEMUA GENDER</option>
                <option value="PUTRA">PUTRA</option>
                <option value="PUTRI">PUTRI</option>
              </select>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={athleteSearchQuery}
                  onChange={(e) => setAthleteSearchQuery(e.target.value)}
                  placeholder="CARI ATLET / KONTINGEN..."
                  className="w-full bg-[#050b18] border border-[#142340] focus:border-cyan-400 rounded-none pl-8 pr-3 py-1 text-xs text-white placeholder-zinc-600 outline-none uppercase font-bold"
                />
              </div>

              {/* Quick Loting & Sync Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleShuffleLoting}
                  title="Kocok nomor undian loting atlet untuk filter ini"
                  className="bg-[#0b1f3b] hover:bg-[#102b54] border border-cyan-500/60 text-cyan-300 font-bold text-xs px-2.5 py-1 rounded-none flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <Shuffle size={12} />
                  <span>Kocok Loting</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncLotingToBracket()}
                  title="Sinkronkan nomor loting atlet ke Bagan Braket"
                  className="bg-[#07261a] hover:bg-[#0c3826] border border-emerald-500/60 text-emerald-300 font-bold text-xs px-2.5 py-1 rounded-none flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <CheckSquare size={12} />
                  <span>Sinkron Bagan</span>
                </button>
              </div>

              {/* Stats Badge */}
              <span className="bg-[#081224] border border-[#162544] text-cyan-300 text-xs px-3 py-1 rounded-none font-mono font-bold">
                {filteredAthletes.length} Atlet
              </span>
            </div>

            {/* Table Area in Dark Arena LED Style */}
            <div className="flex-1 overflow-y-auto border border-[#142340] bg-[#050e1f]/60 rounded-none">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#142340] bg-[#071329] text-zinc-400 text-[10px] font-black uppercase tracking-wider sticky top-0 z-10">
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">Undian</th>
                    <th className="p-2.5">Nama Atlet</th>
                    <th className="p-2.5">Kontingen</th>
                    <th className="p-2.5">Usia</th>
                    <th className="p-2.5">Kelas</th>
                    <th className="p-2.5">Gender</th>
                    <th className="p-2.5">Berat</th>
                    <th className="p-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101c33]">
                  {filteredAthletes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-zinc-500">
                        Tidak ada data atlet yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAthletes.map((a, i) => (
                      <tr key={a.id} className="hover:bg-[#0a1832] transition-colors">
                        <td className="p-2.5 font-mono text-zinc-500">{i + 1}</td>
                        <td className="p-2.5 font-mono font-black text-amber-400">{a.undian || `#${i + 1}`}</td>
                        <td className="p-2.5 font-black text-white">{a.name}</td>
                        <td className="p-2.5 font-bold text-zinc-300">{a.contingent}</td>
                        <td className="p-2.5 font-mono text-cyan-300">{a.usia}</td>
                        <td className="p-2.5 font-black text-amber-300">Kelas {a.kelas}</td>
                        <td className="p-2.5 font-bold text-zinc-300">{a.gender}</td>
                        <td className="p-2.5 font-mono text-zinc-400">{a.berat || "-"}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditAthlete(a)}
                              title="Edit atlet ini"
                              className="p-1 rounded bg-blue-950/80 hover:bg-blue-800 text-blue-300 border border-blue-700/60 cursor-pointer"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAthlete(a.id)}
                              title="Hapus atlet"
                              className="p-1 rounded bg-red-950/80 hover:bg-red-800 text-red-400 border border-red-700/60 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Action Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#12213d] pt-3 shrink-0">
              <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-cyan-400" />
                <span>Aturan IPSI 2026 &amp; PERSILAT: Pengundian loting &amp; sinkronisasi ke bagan braket dikelola melalui tombol menu di bagian atas.</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {filteredAthletes.length} Atlet Tampil dari {athletes.length} Total
              </span>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* TAB 3: KONTROL PARTAI (MATCH SCHEDULER & ARENA CONTROL) */}
      {/* ------------------------------------------------------------------------- */}
      {activeNavTab === "kontrol_partai" && (
        <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-5">
          <div className="bg-[#071126] border border-[#142340] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#142340] pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-cyan-400" />
                  JADWAL PARTAI PERTANDINGAN ({scheduleItems.length} PARTAI TERJADWAL)
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Daftar partai hasil dari bagan yang siap dipanggil ke Gelanggang
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (scheduleItems.length === 0) {
                      showAlert("Jadwal Kosong", "Belum ada partai pertandingan yang terbentuk.");
                      return;
                    }
                    const ws = XLSX.utils.json_to_sheet(scheduleItems);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Jadwal_Partai");
                    XLSX.writeFile(wb, `Jadwal_Partai_${tournamentName}.xlsx`);
                  }}
                  className="bg-[#0a1832] hover:bg-[#0f2244] border border-[#162a50] text-emerald-300 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} /> Unduh Excel Jadwal
                </button>
              </div>
            </div>

            {scheduleItems.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                <Calendar size={36} className="mx-auto mb-2 text-zinc-600" />
                <p className="text-xs font-black uppercase">BELUM ADA PARTAI PERTANDINGAN</p>
                <p className="text-[10px] mt-1">Buka tab 'bagan braket' dan klik 'BUAT & GENERATE BAGAN INI' untuk membuat partai otomatis.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#142340] bg-[#050b18] text-zinc-400 text-[10px] font-black uppercase">
                      <th className="p-2.5">Partai</th>
                      <th className="p-2.5">Gelanggang</th>
                      <th className="p-2.5">Kelas / Usia</th>
                      <th className="p-2.5">Babak</th>
                      <th className="p-2.5 text-cyan-400">Sudut Biru</th>
                      <th className="p-2.5 text-red-400">Sudut Merah</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#101c33]">
                    {scheduleItems.map((s, idx) => (
                      <tr key={s.uniqueId || idx} className="hover:bg-[#0a1832]/60 transition-colors">
                        <td className="p-2.5 font-mono font-black text-amber-400">{s.partai || idx + 1}</td>
                        <td className="p-2.5 font-bold text-zinc-300">{s.gelanggang || "GELANGGANG A"}</td>
                        <td className="p-2.5 font-black text-white">
                          Kelas {s.kelas} - {s.usia} ({s.gender})
                        </td>
                        <td className="p-2.5 font-bold text-amber-300 uppercase">{s.tahapan}</td>
                        <td className="p-2.5 font-black text-cyan-300">
                          {s.blueName} <span className="text-[10px] font-normal text-zinc-400">({s.blueContingent})</span>
                        </td>
                        <td className="p-2.5 font-black text-red-300">
                          {s.redName} <span className="text-[10px] font-normal text-zinc-400">({s.redContingent})</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="bg-amber-950/60 border border-amber-600/60 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                            {s.status || "BELUM"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL KONFIRMASI KOSONGKAN (IN-APP MODAL, NO WINDOW.CONFIRM) */}
      {/* ------------------------------------------------------------------------- */}
      {showClearModal && (
        <div className="fixed inset-0 bg-[#02050f]/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#071126] border-2 border-red-500/50 rounded-xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center mx-auto text-red-400 shadow-lg">
              <Trash2 size={24} />
            </div>

            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                PILIHAN PENGOSONGAN DATA
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Silakan pilih jenis pengosongan yang ingin Anda lakukan untuk kategori{" "}
                <strong className="text-cyan-300">{selectedUsia} Kelas {selectedKelas} {selectedGender}</strong>:
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleExecuteClear(false)}
                className="w-full bg-[#0a1832] hover:bg-[#0f244a] border border-blue-500/50 text-blue-300 font-black text-xs py-2.5 rounded-lg uppercase tracking-wide transition-all cursor-pointer text-left px-4 flex items-center justify-between"
              >
                <span>1. Kosongkan Bagan Kelas Ini Saja</span>
                <ChevronRight size={14} />
              </button>
              <p className="text-[10px] text-zinc-500 text-left px-1">
                * Menghapus partai bagan kelas ini, namun data nama atlet hasil loting tetap tersimpan.
              </p>

              <button
                onClick={() => handleExecuteClear(true)}
                className="w-full bg-red-950/40 hover:bg-red-950/80 border border-red-500/60 text-red-400 font-black text-xs py-2.5 rounded-lg uppercase tracking-wide transition-all cursor-pointer text-left px-4 flex items-center justify-between mt-3"
              >
                <span>2. Reset Total (Bagan, Jadwal & Atlet)</span>
                <ChevronRight size={14} />
              </button>
              <p className="text-[10px] text-zinc-500 text-left px-1">
                * Menghapus seluruh atlet terdaftar, seluruh bagan, dan jadwal pertandingan.
              </p>
            </div>

            <button
              onClick={() => setShowClearModal(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-2 rounded-lg uppercase tracking-wide mt-3 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* MODAL LOTING & UNDIAN ATLET (SHUFFLE & SYNC KE BAGAN BRAKET) */}
      {/* ------------------------------------------------------------------------- */}
      {showLotingModal && (
        <div className="fixed inset-0 bg-[#02050f]/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
          <div className="bg-[#050e1f] border-2 border-cyan-500/70 rounded-xl max-w-3xl w-full shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header Modal */}
            <div className="bg-[#07162e] border-b border-[#142646] p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded bg-[#0b244d] border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                  <Shuffle size={18} className={isShufflingAnimation ? "animate-spin text-amber-400" : ""} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    LOTING &amp; PENGUNDIAN ATLET (SHUFFLE)
                    <span className="bg-emerald-950 border border-emerald-500 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded">
                      IPSI 2026 &amp; PERSILAT
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Kocok nomor undian atlet secara adil, transparan, dan sinkronkan langsung ke pohon bagan pertandingan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLotingModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              
              {/* Category Filter Controls */}
              <div className="bg-[#071329] border border-[#142646] p-3 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">
                    Kategori Usia
                  </label>
                  <select
                    value={lotingUsia}
                    onChange={(e) => setLotingUsia(e.target.value as AgeCategory)}
                    className="w-full bg-[#050c1b] border border-cyan-500/50 text-cyan-300 font-black text-xs px-2.5 py-1.5 rounded outline-none uppercase cursor-pointer"
                  >
                    <option value="USIA DINI">USIA DINI (5-11 Thn)</option>
                    <option value="PRA REMAJA">PRA REMAJA (11-14 Thn)</option>
                    <option value="REMAJA">REMAJA (14-17 Thn)</option>
                    <option value="DEWASA">DEWASA (17-35 Thn)</option>
                    <option value="MASTER">MASTER (&gt; 35 Thn)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">
                    Kelas Tanding
                  </label>
                  <select
                    value={lotingKelas}
                    onChange={(e) => setLotingKelas(e.target.value)}
                    className="w-full bg-[#050c1b] border border-cyan-500/50 text-cyan-300 font-black text-xs px-2.5 py-1.5 rounded outline-none uppercase cursor-pointer"
                  >
                    {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "BEBAS"].map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={lotingGender}
                    onChange={(e) => setLotingGender(e.target.value as any)}
                    className="w-full bg-[#050c1b] border border-cyan-500/50 text-cyan-300 font-black text-xs px-2.5 py-1.5 rounded outline-none uppercase cursor-pointer"
                  >
                    <option value="PUTRA">PUTRA</option>
                    <option value="PUTRI">PUTRI</option>
                  </select>
                </div>
              </div>

              {/* Status Bar & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a1b38] border border-cyan-600/40 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-black text-white uppercase">
                    {lotingUsia} • KELAS {lotingKelas} • {lotingGender}:
                  </span>
                  <span className="bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-mono font-bold px-2 py-0.5 rounded">
                    {athletes.filter(a => a.usia?.toUpperCase() === lotingUsia.toUpperCase() && a.kelas?.toUpperCase() === lotingKelas.toUpperCase() && a.gender === lotingGender).length} Atlet Terdaftar
                  </span>
                </div>

                {/* Primary Shuffle Button */}
                <button
                  type="button"
                  disabled={isShufflingAnimation}
                  onClick={() => handleExecuteLotingShuffle(lotingUsia, lotingKelas, lotingGender)}
                  className={`bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-110 text-black font-black text-xs px-4 py-2 rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.5)] cursor-pointer transition-all active:scale-95 ${isShufflingAnimation ? "opacity-75 cursor-wait" : ""}`}
                >
                  <Shuffle size={14} className={isShufflingAnimation ? "animate-spin" : ""} />
                  <span>{isShufflingAnimation ? "Mengocok Loting..." : "🎲 KOCOK LOTING (SHUFFLE OTOMATIS)"}</span>
                </button>
              </div>

              {/* Athletes Table in Loting Modal */}
              <div className="border border-[#142646] rounded-lg overflow-hidden bg-[#061124]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#142646] bg-[#071732] text-zinc-400 text-[10px] font-black uppercase">
                      <th className="p-2.5 text-center w-12">No</th>
                      <th className="p-2.5 text-amber-400 font-mono w-28">No. Undian</th>
                      <th className="p-2.5">Nama Atlet</th>
                      <th className="p-2.5">Kontingen / Perguruan</th>
                      <th className="p-2.5">Berat</th>
                      <th className="p-2.5 text-center">Posisi Bagan / Sudut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#10203a]">
                    {(() => {
                      const list = athletes.filter(a => 
                        a.usia?.toUpperCase() === lotingUsia.toUpperCase() &&
                        a.kelas?.toUpperCase() === lotingKelas.toUpperCase() &&
                        a.gender === lotingGender
                      ).sort((a, b) => {
                        const numA = parseInt(String(a.undian || "").replace("#", ""), 10) || 999;
                        const numB = parseInt(String(b.undian || "").replace("#", ""), 10) || 999;
                        return numA - numB;
                      });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-zinc-500 font-bold">
                              Belum ada atlet terdaftar di {lotingUsia} Kelas {lotingKelas} {lotingGender}.
                              <br />
                              <span className="text-[10px] text-zinc-600 mt-1 block">
                                Tambahkan atlet di formulir Kolom 1 untuk mulai mengundi nomor loting.
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      return list.map((a, idx) => {
                        // Compute assigned pool and corner based on seed
                        const isEven = idx % 2 === 1;
                        const poolLetter = String.fromCharCode(65 + Math.floor(idx / 2));
                        const corner = !isEven ? "SUDUT BIRU" : "SUDUT MERAH";
                        const cornerColor = !isEven ? "text-cyan-400 border-cyan-800 bg-cyan-950/60" : "text-red-400 border-red-800 bg-red-950/60";

                        return (
                          <tr key={a.id} className="hover:bg-[#0a1f3d]/60 transition-colors">
                            <td className="p-2.5 text-center font-mono text-zinc-500">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-black text-amber-400 text-sm">
                              <span className="bg-amber-950/70 border border-amber-600/70 px-2 py-0.5 rounded">
                                {a.undian || `#${idx + 1}`}
                              </span>
                            </td>
                            <td className="p-2.5 font-black text-white uppercase">{a.name}</td>
                            <td className="p-2.5 font-bold text-zinc-300 uppercase">{a.contingent}</td>
                            <td className="p-2.5 font-mono text-zinc-400">{a.berat || "-"}</td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${cornerColor}`}>
                                POOL {poolLetter} - {corner}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Rules & Sync Notification */}
              <div className="bg-[#040c1a] border border-[#142646] p-3 rounded-lg space-y-1 text-[11px] text-zinc-400">
                <div className="text-amber-400 font-black uppercase text-[10px] flex items-center gap-1.5">
                  <ShieldCheck size={13} /> ATURAN SINKRONISASI BAGAN IPSI 2026:
                </div>
                <p>
                  1. Nomor undian loting ganjil (#1, #3, ...) menempati <strong className="text-cyan-300">SUDUT BIRU</strong>.
                </p>
                <p>
                  2. Nomor undian loting genap (#2, #4, ...) menempati <strong className="text-red-300">SUDUT MERAH</strong>.
                </p>
                <p>
                  3. Mengklik tombol "SINKRONKAN KE BAGAN BRAKET" akan otomatis memperbarui pohon bagan dan jadwal partai pertandingan.
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-[#07162e] border-t border-[#142646] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowLotingModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs px-4 py-2 rounded-lg uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSyncLotingToBracket(lotingUsia, lotingKelas, lotingGender);
                  setShowLotingModal(false);
                }}
                className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:brightness-110 text-white font-black text-xs px-5 py-2.5 rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer transition-all active:scale-95"
              >
                <CheckSquare size={15} />
                <span>⚡ SINKRONKAN KE BAGAN BRAKET SEKARANG</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* GLOBAL IN-APP ALERT MODAL */}
      {/* ------------------------------------------------------------------------- */}
      {alertState.isOpen && (
        <div className="fixed inset-0 bg-[#02050f]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#071126] border border-cyan-500/40 rounded-xl p-5 max-w-sm w-full shadow-2xl text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-400 flex items-center justify-center mx-auto text-cyan-400">
              <Info size={20} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase text-white tracking-wider">{alertState.title}</h4>
              <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">{alertState.message}</p>
            </div>
            <button
              onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-2 rounded-lg uppercase tracking-wide cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
