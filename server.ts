import express from "express";
import http from "http";
import path from "path";
import { MatchState, JuriPendingInput, ActionLog, ScoreDetail, PenaltiesState, VerificationState } from "./src/types";

const PORT = 3000;

// Initialize blank score objects
const createEmptyScore = (): ScoreDetail => ({
  pukulan: 0,
  tendangan: 0,
  jatuhan: 0,
  hukuman: 0,
  total: 0,
});

// Calculate current total score dynamically
function calculateCornerScore(score: ScoreDetail, penalties: PenaltiesState): ScoreDetail {
  // Penalty calculations based on IPSI 2022 rules:
  // - Keluar Gelanggang: -1 each
  // - Teguran 1: -1
  // - Teguran 2: -2
  // - Peringatan 1: -5
  // - Peringatan 2: -10
  // - Peringatan 3: Disqualification
  let penaltyDeduction = 0;
  penaltyDeduction += penalties.keluarGelanggang * -1;
  if (penalties.teguran1) penaltyDeduction += -1;
  if (penalties.teguran2) penaltyDeduction += -2;
  if (penalties.peringatan1) penaltyDeduction += -5;
  if (penalties.peringatan2) penaltyDeduction += -10;

  const hitsScore = (score.pukulan * 1) + (score.tendangan * 2) + (score.jatuhan * 3);
  const total = hitsScore + penaltyDeduction;

  return {
    ...score,
    hukuman: penaltyDeduction,
    total: total, // Permintaan user: nilai minus tetap dibuat minus, jangan mentok di nol
  };
}

let initialMatchState: MatchState = {
  tournamentName: "PIALA PRESTASI IPSI 2026",
  arena: "GELANGGANG A",
  matchNumber: "Partai 12",
  classCategory: "Kelas F Dewasa - Putra",
  athleteBlue: { name: "REVALDO SAPUTRA", contingent: "JAWA BARAT" },
  athleteRed: { name: "DANU SETIAWAN", contingent: "DKI JAKARTA" },
  round: 1,
  maxRound: 3,
  roundDuration: 120, // 2 minutes
  timeRemaining: 120,
  isTimerRunning: false,
  isPanelsLocked: true,
  scores: {
    blue: createEmptyScore(),
    red: createEmptyScore(),
  },
  roundScores: {
    1: { blue: createEmptyScore(), red: createEmptyScore() },
    2: { blue: createEmptyScore(), red: createEmptyScore() },
    3: { blue: createEmptyScore(), red: createEmptyScore() },
  },
  penalties: {
    blue: { binaan: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 },
    red: { binaan: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 },
  },
  winner: null,
  winnerDecision: "TBD",
  juriLogs: [],
  juriActiveIndicators: {
    blue: { j1: null, j2: null, j3: null },
    red: { j1: null, j2: null, j3: null },
  },
  actionLogs: [
    { id: "1", timestamp: Date.now(), clockTime: "02:00", message: "Pertandingan dimulai. Selamat bertanding!", type: "system", round: 1 }
  ],
  soundTrigger: "none",
  soundTriggerTime: 0,
  secretarySignalNextRound: false,
  verification: {
    isActive: false,
    category: "",
    juriVotes: { j1: null, j2: null, j3: null },
    consensusResult: null
  },
};

// Global state in backend memory
let matchState: MatchState = JSON.parse(JSON.stringify(initialMatchState));

// Store temporary unvalidated Juri presses
interface ActivePress {
  juriIndex: number;
  corner: "blue" | "red";
  attackType: "pukulan" | "tendangan";
  timestamp: number;
}
let activePresses: ActivePress[] = [];

// Juri synchronization lock duration (in ms) - within what time window should other judges press to count?
const SYNC_WINDOW_MS = 1500;

async function startServer() {
  const app = express();
  app.use(express.json());

  // SSE streaming subscriptions for instant push updates (Realtime)
  let checkAndUpdateGapRule: (isTick?: boolean) => void;
  let clients: any[] = [];
  const sendStateToClients = () => {
    // Recalculate totals periodically or on update
    matchState.scores.blue = calculateCornerScore(matchState.scores.blue, matchState.penalties.blue);
    matchState.scores.red = calculateCornerScore(matchState.scores.red, matchState.penalties.red);

    // Update individual round scores totals too
    for (let r = 1; r <= matchState.maxRound; r++) {
      if (matchState.roundScores[r]) {
        matchState.roundScores[r].blue = calculateCornerScore(matchState.roundScores[r].blue, matchState.penalties.blue);
        matchState.roundScores[r].red = calculateCornerScore(matchState.roundScores[r].red, matchState.penalties.red);
      }
    }

    if (checkAndUpdateGapRule) {
      checkAndUpdateGapRule(false);
    }

    const json = JSON.stringify(matchState);
    clients.forEach(c => c.res.write(`data: ${json}\n\n`));
  };

  // Keep-alive for SSE
  setInterval(() => {
    clients.forEach(c => c.res.write(`: keepalive\n\n`));
  }, 15000);

  // Authoritative server-side ticking loop (1-second intervals)
  setInterval(() => {
    if (matchState.isTimerRunning && matchState.timeRemaining > 0) {
      matchState.timeRemaining -= 1;

      if (checkAndUpdateGapRule) {
        checkAndUpdateGapRule(true);
      }

      if (matchState.timeRemaining === 0) {
        matchState.isTimerRunning = false;
        
        // Trigger secretary signal popup on round end if no winner declared yet
        if (!matchState.winner) {
          matchState.secretarySignalNextRound = true;
        }

        // Add round over action log
        const min = "00";
        const sec = "00";
        matchState.actionLogs.unshift({
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          clockTime: `${min}:${sec}`,
          message: `Waktu Babak ${matchState.round} Habis!`,
          type: "system",
          round: matchState.round,
        });

        matchState.soundTrigger = "buzzer";
        matchState.soundTriggerTime = Date.now();
      }
      sendStateToClients();
    }
  }, 1000);

  // 1. SSE Stream
  app.get("/api/match/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const client = { id: Date.now(), res };
    clients.push(client);
    
    // Send initial state immediately
    res.write(`data: ${JSON.stringify(matchState)}\n\n`);

    req.on("close", () => {
      clients = clients.filter(c => c.id !== client.id);
    });
  });

  // 2. Fetch current match state
  app.get("/api/match/state", (req, res) => {
    // Ensure scores are calculated
    matchState.scores.blue = calculateCornerScore(matchState.scores.blue, matchState.penalties.blue);
    matchState.scores.red = calculateCornerScore(matchState.scores.red, matchState.penalties.red);
    res.json(matchState);
  });

  // Helper to add activity log
  const logAction = (message: string, type: ActionLog["type"]) => {
    const min = Math.floor(matchState.timeRemaining / 60).toString().padStart(2, "0");
    const sec = (matchState.timeRemaining % 60).toString().padStart(2, "0");
    const log: ActionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      clockTime: `${min}:${sec}`,
      message,
      type,
      round: matchState.round,
    };
    matchState.actionLogs.unshift(log);
    // limit to 100 entries
    if (matchState.actionLogs.length > 100) matchState.actionLogs.pop();
  };

  // Implement the 30-point gap and 1-minute inactivity check rule for teenagers/adults categories
  checkAndUpdateGapRule = (isTick: boolean = false) => {
    const categoryUpper = (matchState.classCategory || "").toUpperCase();
    // Strictly exclude PRA-REMAJA and PRA REMAJA
    const isRemajaDewasa = (categoryUpper.includes("REMAJA") && !categoryUpper.includes("PRA-REMAJA") && !categoryUpper.includes("PRA REMAJA")) || categoryUpper.includes("DEWASA");
    const isRoundTwoOrThree = matchState.round === 2 || matchState.round === 3;

    if (!isRemajaDewasa || !isRoundTwoOrThree || matchState.winner) {
      if (matchState.gapRuleTracker && matchState.gapRuleTracker.active) {
        matchState.gapRuleTracker = undefined;
      }
      return;
    }

    // Reset tracker if the round has changed
    if (matchState.gapRuleTracker && matchState.gapRuleTracker.active) {
      if (matchState.gapRuleTracker.round !== matchState.round) {
        matchState.gapRuleTracker = undefined;
      }
    }

    const blueTotal = matchState.scores.blue.total;
    const redTotal = matchState.scores.red.total;
    const scoreGap = Math.abs(blueTotal - redTotal);
    const isGapOver30 = scoreGap >= 30;

    if (!isGapOver30) {
      if (matchState.gapRuleTracker && matchState.gapRuleTracker.active) {
        matchState.gapRuleTracker = undefined;
        logAction("Pemberitahuan: Selisih poin kembali di bawah 30. Hitung mundur dihentikan.", "system");
      }
      return;
    }

    const winningCorner = blueTotal > redTotal ? "blue" : "red";
    const losingCorner = blueTotal > redTotal ? "red" : "blue";
    const currentLosingScore = losingCorner === "blue" ? blueTotal : redTotal;

    // Initialize or reset if losing corner changed
    if (!matchState.gapRuleTracker || !matchState.gapRuleTracker.active || matchState.gapRuleTracker.losingCorner !== losingCorner) {
      matchState.gapRuleTracker = {
        active: true,
        losingCorner,
        lastLosingScore: currentLosingScore,
        secondsElapsed: 0,
        maxSeconds: 60,
        round: matchState.round
      };
      logAction(`Peringatan Selisih >= 30 Poin: Sudut ${losingCorner === "blue" ? "BIRU" : "MERAH"} harus mendapat nilai dalam 60 detik atau Sudut ${winningCorner === "blue" ? "BIRU" : "MERAH"} menang mutlak.`, "system");
    } else {
      // Check if the losing corner score increased
      if (currentLosingScore > matchState.gapRuleTracker.lastLosingScore) {
        matchState.gapRuleTracker.lastLosingScore = currentLosingScore;
        matchState.gapRuleTracker.secondsElapsed = 0;
        logAction(`Sudut ${losingCorner === "blue" ? "BIRU" : "MERAH"} mendapatkan nilai! Hitung mundur selisih 30 poin direset ke 60 detik.`, "system");
      } else if (currentLosingScore < matchState.gapRuleTracker.lastLosingScore) {
        // Score decreased (due to penalty etc.), update tracked score but do NOT reset countdown
        matchState.gapRuleTracker.lastLosingScore = currentLosingScore;
      } else {
        if (isTick) {
          matchState.gapRuleTracker.secondsElapsed += 1;
          if (matchState.gapRuleTracker.secondsElapsed >= 60) {
            matchState.winner = winningCorner;
            matchState.winnerDecision = "Mutlak (Selisih Poin)";
            matchState.isTimerRunning = false;
            matchState.gapRuleTracker = undefined;
            
            const winnerLabel = winningCorner === "blue" ? "BIRU" : "MERAH";
            logAction(`Pertandingan Selesai! Sudut ${winnerLabel} dinyatakan MENANG MUTLAK karena selisih >= 30 poin tanpa penambahan nilai dari lawan selama 1 menit.`, "system");
            
            matchState.soundTrigger = "buzzer";
            matchState.soundTriggerTime = Date.now();
          }
        }
      }
    }
  };

  // Log a sound trigger helper
  const triggerSound = (sound: MatchState["soundTrigger"]) => {
    matchState.soundTrigger = sound;
    matchState.soundTriggerTime = Date.now();
  };

  // 3. Update Match Config
  app.post("/api/match/config", (req, res) => {
    const { tournamentName, arena, matchNumber, classCategory, athleteBlue, athleteRed, roundDuration, maxRound } = req.body;
    
    if (tournamentName !== undefined) matchState.tournamentName = tournamentName;
    if (arena !== undefined) matchState.arena = arena;
    if (matchNumber !== undefined) matchState.matchNumber = matchNumber;
    if (classCategory !== undefined) matchState.classCategory = classCategory;
    if (athleteBlue !== undefined) matchState.athleteBlue = { ...matchState.athleteBlue, ...athleteBlue };
    if (athleteRed !== undefined) matchState.athleteRed = { ...matchState.athleteRed, ...athleteRed };
    if (roundDuration !== undefined) {
      matchState.roundDuration = roundDuration;
      if (!matchState.isTimerRunning) {
        matchState.timeRemaining = roundDuration;
      }
    }
    if (maxRound !== undefined) {
      matchState.maxRound = maxRound;
      for (let r = 1; r <= maxRound; r++) {
        if (!matchState.roundScores[r]) {
          matchState.roundScores[r] = { blue: createEmptyScore(), red: createEmptyScore() };
        }
      }
    }

    matchState.secretarySignalNextRound = false;
    logAction("Konfigurasi pertandingan diperbarui oleh Dewan.", "system");
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 4. Timer Controls
  app.post("/api/match/sound", (req, res) => {
    const { sound } = req.body;
    if (sound) {
      triggerSound(sound);
      logAction(`Sinyal suara manual dibunyikan: ${sound === "buzzer" ? "BELL / HORN" : sound}.`, "system");
      sendStateToClients();
      return res.json({ success: true, state: matchState });
    }
    return res.status(400).json({ error: "Sound parameter is required" });
  });

  app.post("/api/match/timer", (req, res) => {
    const { action, value } = req.body;

    if (action === "start") {
      if (matchState.isPanelsLocked) {
        return res.status(400).json({ error: "Panel Juri dan Dewan terkunci. Tidak dapat memulai pertandingan!" });
      }
      matchState.isTimerRunning = true;
      logAction(`Waktu Babak ${matchState.round} Dimulai (Mulai).`, "system");
      triggerSound("short_beep");
    } else if (action === "pause") {
      matchState.isTimerRunning = false;
      logAction(`Waktu Babak ${matchState.round} Dihentikan (Pause).`, "system");
      triggerSound("short_beep");
    } else if (action === "reset") {
      matchState.isTimerRunning = false;
      matchState.timeRemaining = matchState.roundDuration;
      logAction(`Waktu Babak ${matchState.round} Direset ke semula.`, "system");
      triggerSound("short_beep");
    } else if (action === "unlock-panels") {
      matchState.isPanelsLocked = false;
      logAction("Panel Juri dan Dewan dibuka kuncinya.", "system");
      triggerSound("short_beep");
    } else if (action === "lock-panels") {
      matchState.isPanelsLocked = true;
      logAction("Panel Juri dan Dewan dikunci.", "system");
      triggerSound("short_beep");
    } else if (action === "tick") {
      if (matchState.isTimerRunning && matchState.timeRemaining > 0) {
        matchState.timeRemaining -= 1;
        if (matchState.timeRemaining === 0) {
          matchState.isTimerRunning = false;
          logAction(`Waktu Babak ${matchState.round} Habis!`, "system");
          triggerSound("buzzer");
        }
      }
    } else if (action === "update") {
      if (value !== undefined) {
        matchState.timeRemaining = Math.max(0, value);
      }
    }

    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 5. Change Round
  app.post("/api/match/round", (req, res) => {
    const { round } = req.body;
    if (round >= 1 && round <= matchState.maxRound) {
      // Ensure round scores are initialized
      if (!matchState.roundScores[round]) {
        matchState.roundScores[round] = { blue: createEmptyScore(), red: createEmptyScore() };
      }

      // KETIKA BABAK 1 DAN 2 SELESAI (memasuki Babak 2 atau 3),
      // Binaan dan Teguran direset ke awal, hanya Peringatan yang menetap
      if (round === 2 || round === 3 || round === 4) {
        matchState.penalties.blue.binaan = 0;
        matchState.penalties.blue.teguran1 = false;
        matchState.penalties.blue.teguran2 = false;
        matchState.penalties.red.binaan = 0;
        matchState.penalties.red.teguran1 = false;
        matchState.penalties.red.teguran2 = false;
        logAction(`Sistem: Babak ${round} dimulai. Binaan & Teguran direset ke awal. Peringatan tetap berlaku.`, "system");
      }

      // Save current points to roundScores for reference before changing round (if we want, though standard scores is live-summed, let's keep totals separate per round)
      matchState.round = round;
      matchState.timeRemaining = matchState.roundDuration;
      matchState.isTimerRunning = false;
      matchState.secretarySignalNextRound = false;
      logAction(`Ubah ke Babak ${round}. Waktu diatur ulang.`, "round");
      triggerSound("short_beep");
      // Clear pending presses
      activePresses = [];
      matchState.juriActiveIndicators = {
        blue: { j1: null, j2: null, j3: null },
        red: { j1: null, j2: null, j3: null },
      };
    }
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 6. Manual Direct Score Add/Subtract (Dewan overrides or Jatuhan)
  app.post("/api/match/direct-score", (req, res) => {
    if (matchState.isPanelsLocked) {
      return res.status(400).json({ error: "Panel Dewan Juri terkunci. Input ditolak." });
    }
    const { corner, type, value } = req.body; // corner: "blue"|"red", type: "pukulan"|"tendangan"|"jatuhan", value: e.g. +1, -1
    
    if (corner !== "blue" && corner !== "red") return res.status(400).json({ error: "Invalid corner" });
    if (type !== "pukulan" && type !== "tendangan" && type !== "jatuhan") return res.status(400).json({ error: "Invalid type" });

    // Update main scores
    const currentRound = matchState.round;
    const scoresRef = matchState.scores[corner];
    const roundRef = matchState.roundScores[currentRound] ? matchState.roundScores[currentRound][corner] : null;

    if (type === "pukulan") {
      scoresRef.pukulan = Math.max(0, scoresRef.pukulan + value);
      if (roundRef) roundRef.pukulan = Math.max(0, roundRef.pukulan + value);
      logAction(`Dewan merubah skor Pukulan Sudut ${corner === "blue" ? "BIRU" : "MERAH"} (${value > 0 ? "+" : ""}${value} Poin)`, `score_${corner}` as any);
    } else if (type === "tendangan") {
      scoresRef.tendangan = Math.max(0, scoresRef.tendangan + value);
      if (roundRef) roundRef.tendangan = Math.max(0, roundRef.tendangan + value);
      logAction(`Dewan merubah skor Tendangan Sudut ${corner === "blue" ? "BIRU" : "MERAH"} (${value > 0 ? "+" : ""}${value * 2} Poin)`, `score_${corner}` as any);
    } else if (type === "jatuhan") {
      scoresRef.jatuhan = Math.max(0, scoresRef.jatuhan + value);
      if (roundRef) roundRef.jatuhan = Math.max(0, roundRef.jatuhan + value);
      logAction(`Bantingan / Jatuhan Sudut ${corner === "blue" ? "BIRU" : "MERAH"} Terpilih (${value > 0 ? "+" : ""}${value * 3} Poin)`, `score_${corner}` as any);
    }

    triggerSound("success_chime");
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 7. Penalties (Binaan, Teguran, Peringatan, Keluar Gelanggang)
  app.post("/api/match/penalty", (req, res) => {
    if (matchState.isPanelsLocked) {
      return res.status(400).json({ error: "Panel Dewan Juri terkunci. Input ditolak." });
    }
    const { corner, penaltyType, action } = req.body; // action: "add" | "remove"
    
    if (corner !== "blue" && corner !== "red") return res.status(400).json({ error: "Invalid corner" });

    const pen = matchState.penalties[corner];
    const oppositeCorner = corner === "blue" ? "red" : "blue";
    const cornerLabel = corner === "blue" ? "BIRU" : "MERAH";

    if (penaltyType === "binaan") {
      if (action === "add") {
        pen.binaan = Math.min(2, pen.binaan + 1);
        logAction(`Hukuman: Binaan ${pen.binaan} diberikan kepada Sudut ${cornerLabel}.`, `penalty_${corner}` as any);
      } else {
        pen.binaan = Math.max(0, pen.binaan - 1);
        logAction(`Hukuman: Binaan Sudut ${cornerLabel} dikurangi.`, `penalty_${corner}` as any);
      }
    } else if (penaltyType === "teguran1") {
      pen.teguran1 = (action === "add");
      logAction(`Hukuman: Teguran 1 untuk Sudut ${cornerLabel} (-1 poin).`, `penalty_${corner}` as any);
    } else if (penaltyType === "teguran2") {
      pen.teguran2 = (action === "add");
      logAction(`Hukuman: Teguran 2 untuk Sudut ${cornerLabel} (-2 poin).`, `penalty_${corner}` as any);
    } else if (penaltyType === "peringatan1") {
      pen.peringatan1 = (action === "add");
      logAction(`Hukuman: Peringatan 1 untuk Sudut ${cornerLabel} (-5 poin).`, `penalty_${corner}` as any);
    } else if (penaltyType === "peringatan2") {
      pen.peringatan2 = (action === "add");
      logAction(`Hukuman: Peringatan 2 untuk Sudut ${cornerLabel} (-10 poin).`, `penalty_${corner}` as any);
    } else if (penaltyType === "peringatan3") {
      pen.peringatan3 = (action === "add");
      if (action === "add") {
        matchState.winner = oppositeCorner;
        matchState.winnerDecision = "Diskualifikasi";
        logAction(`Hukuman: Peringatan 3 (Diskualifikasi) untuk Sudut ${cornerLabel}! Pertandingan selesai.`, `penalty_${corner}` as any);
      } else {
        matchState.winner = null;
        matchState.winnerDecision = "TBD";
        logAction(`Hukuman: Batal Diskualifikasi untuk Sudut ${cornerLabel}.`, `penalty_${corner}` as any);
      }
    } else if (penaltyType === "keluar") {
      if (action === "add") {
        pen.keluarGelanggang += 1;
        logAction(`Pelanggaran: Sudut ${cornerLabel} Keluar Gelanggang (-1 poin).`, `penalty_${corner}` as any);
      } else {
        pen.keluarGelanggang = Math.max(0, pen.keluarGelanggang - 1);
      }
    }

    triggerSound("warning_beep");
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 8. Juri Input and Consensus (2-out-of-3 sync)
  app.post("/api/juri/click", (req, res) => {
    const { juriIndex, corner, attackType } = req.body; // juriIndex: 1|2|3, corner: "blue"|"red", attackType: "pukulan"|"tendangan"

    if (matchState.isPanelsLocked) {
      return res.json({ success: false, reason: "Panel Juri terkunci. Input ditolak." });
    }

    if (!matchState.isTimerRunning) {
      // Officially, Juri cannot score when the timer is paused
      return res.json({ success: false, reason: "Timer is paused. Inpust rejected." });
    }

    const now = Date.now();
    const cornerLabel = corner === "blue" ? "BIRU" : "MERAH";

    // Set high-level visual indicator for this Juri on this corner
    const juriKey = `j${juriIndex}` as "j1" | "j2" | "j3";
    matchState.juriActiveIndicators[corner][juriKey] = attackType;

    // Log the click temporarily
    const pendingInput: JuriPendingInput = {
      juriIndex,
      corner,
      attackType,
      timestamp: now,
    };
    matchState.juriLogs.push(pendingInput);

    // Keep only last 10 logs around for debug display
    if (matchState.juriLogs.length > 50) {
      matchState.juriLogs.shift();
    }

    // Filter active presses within the SYNC_WINDOW_MS
    activePresses = activePresses.filter(p => now - p.timestamp <= SYNC_WINDOW_MS);

    // Check if there is already a press for this same corner and attackType from a different Juri within SYNC_WINDOW_MS
    const matchIndex = activePresses.findIndex(p => 
      p.corner === corner && 
      p.attackType === attackType && 
      p.juriIndex !== juriIndex
    );

    if (matchIndex !== -1) {
      // Consensus reached! More than or equal to 2 Juri agreed!
      const matchedPress = activePresses[matchIndex];
      
      // Calculate score points (1 for punch, 2 for kick)
      const points = attackType === "pukulan" ? 1 : 2;
      
      // Add points
      matchState.scores[corner][attackType] += 1;
      const currentRound = matchState.round;
      if (matchState.roundScores[currentRound]) {
        matchState.roundScores[currentRound][corner][attackType] += 1;
      }

      logAction(`[SAH] Juri ${matchedPress.juriIndex} & Juri ${juriIndex} menyetujui ${attackType === "pukulan" ? "Pukulan" : "Tendangan"} Sudut ${cornerLabel} (+${points} Poin)`, `score_${corner}` as any);
      
      // Trigger a beautiful sync chime on client
      triggerSound("success_chime");

      // Flash active indicators together for 800ms (we keep indicators on for a tiny bit, client cleans them up)
      // Clear active presses for this corner/attackType so we don't double match
      activePresses = activePresses.filter(p => !(p.corner === corner && p.attackType === attackType));
    } else {
      // Put this press into the active pool
      activePresses.push({
        juriIndex,
        corner,
        attackType,
        timestamp: now,
      });

      // Simple click sound
      triggerSound("short_beep");
    }

    // Schedule clearing active indicators on server side
    setTimeout(() => {
      // If there wasn't a consensus since then, we fade it out
      const currentIndicator = matchState.juriActiveIndicators[corner][juriKey];
      if (currentIndicator === attackType) {
        matchState.juriActiveIndicators[corner][juriKey] = null;
        sendStateToClients();
      }
    }, SYNC_WINDOW_MS);

    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 9. Reset and Initialize new match
  app.post("/api/match/reset", (req, res) => {
    const { keepConfig } = req.body;

    if (keepConfig) {
      matchState = {
        ...JSON.parse(JSON.stringify(initialMatchState)),
        tournamentName: matchState.tournamentName,
        arena: matchState.arena,
        matchNumber: matchState.matchNumber,
        classCategory: matchState.classCategory,
        athleteBlue: matchState.athleteBlue,
        athleteRed: matchState.athleteRed,
        roundDuration: matchState.roundDuration,
        timeRemaining: matchState.roundDuration,
      };
      logAction("Skor dan waktu diatur ulang (Konfigurasi disimpan).", "system");
    } else {
      matchState = JSON.parse(JSON.stringify(initialMatchState));
      logAction("Pertandingan diatur ulang sepenuhnya ke konfigurasi awal.", "system");
    }

    activePresses = [];
    triggerSound("short_beep");
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 10. Undo Last Action
  app.post("/api/match/undo", (req, res) => {
    // We can do a rudimentary undo by looking at the logs and reversing the last action
    if (matchState.actionLogs.length > 0) {
      // Find the first log that was a score or penalty
      const undoableIndex = matchState.actionLogs.findIndex(l => 
        l.type.startsWith("score_") || l.type.startsWith("penalty_")
      );

      if (undoableIndex !== -1) {
        const log = matchState.actionLogs[undoableIndex];
        const msg = log.message;
        const corner = log.type.endsWith("_blue") || log.type.endsWith("blue") ? "blue" : "red";
        
        if (msg.includes("Pukulan") && msg.includes("[SAH]")) {
          matchState.scores[corner].pukulan = Math.max(0, matchState.scores[corner].pukulan - 1);
          if (matchState.roundScores[log.round]) {
            matchState.roundScores[log.round][corner].pukulan = Math.max(0, matchState.roundScores[log.round][corner].pukulan - 1);
          }
        } else if (msg.includes("Tendangan") && msg.includes("[SAH]")) {
          matchState.scores[corner].tendangan = Math.max(0, matchState.scores[corner].tendangan - 1);
          if (matchState.roundScores[log.round]) {
            matchState.roundScores[log.round][corner].tendangan = Math.max(0, matchState.roundScores[log.round][corner].tendangan - 1);
          }
        } else if (msg.includes("Jatuhan")) {
          matchState.scores[corner].jatuhan = Math.max(0, matchState.scores[corner].jatuhan - 1);
          if (matchState.roundScores[log.round]) {
            matchState.roundScores[log.round][corner].jatuhan = Math.max(0, matchState.roundScores[log.round][corner].jatuhan - 1);
          }
        } else if (msg.includes("Teguran 1")) {
          matchState.penalties[corner].teguran1 = false;
        } else if (msg.includes("Teguran 2")) {
          matchState.penalties[corner].teguran2 = false;
        } else if (msg.includes("Peringatan 1")) {
          matchState.penalties[corner].peringatan1 = false;
        } else if (msg.includes("Peringatan 2")) {
          matchState.penalties[corner].peringatan2 = false;
        } else if (msg.includes("Peringatan 3")) {
          matchState.penalties[corner].peringatan3 = false;
          matchState.winner = null;
          matchState.winnerDecision = "TBD";
        } else if (msg.includes("Keluar Gelanggang")) {
          matchState.penalties[corner].keluarGelanggang = Math.max(0, matchState.penalties[corner].keluarGelanggang - 1);
        } else if (msg.includes("Binaan")) {
          matchState.penalties[corner].binaan = Math.max(0, matchState.penalties[corner].binaan - 1);
        }

        // Remove the log and add an undo log
        matchState.actionLogs.splice(undoableIndex, 1);
        logAction(`[UNDO] Dewan membatalkan tindakan: "${msg}"`, "undo");
        triggerSound("short_beep");
      }
    }

    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 11. Declare Victory manually
  app.post("/api/match/declare-winner", (req, res) => {
    const { winner, decision } = req.body; // winner: "blue" | "red" | null, decision: string
    matchState.winner = winner;
    matchState.winnerDecision = decision || "Menang Angka";
    
    if (winner) {
      const winnerLabel = winner === "blue" ? "BIRU (REVALDO SAPUTRA)" : "MERAH (DANU SETIAWAN)";
      logAction(`Pertandingan Selesai! Pemenang: Sudut ${winnerLabel} dengan keputusan ${matchState.winnerDecision}.`, "system");
    } else {
      matchState.winner = null;
      matchState.winnerDecision = "TBD";
      logAction("Keputusan pemenang dibatalkan oleh Dewan.", "system");
    }

    triggerSound("success_chime");
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 12. Verification endpoints (Sesi Verifikasi Dewan)
  app.post("/api/match/verification/start", (req, res) => {
    const { category } = req.body; // "JATUHAN" | "PELANGGARAN"
    
    // Auto pause timer when verification starts
    matchState.isTimerRunning = false;
    
    matchState.verification = {
      isActive: true,
      category: category || "JATUHAN",
      juriVotes: { j1: null, j2: null, j3: null },
      consensusResult: null
    };
    
    logAction(`Sesi Verifikasi Dewan dimulai: Kategori ${category || "JATUHAN"}`, "system");
    triggerSound("warning_beep");
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  app.post("/api/match/verification/vote", (req, res) => {
    const { juriIndex, vote } = req.body; // juriIndex: 1|2|3, vote: "BIRU" | "MERAH" | "TIDAK SAH"
    
    if (!matchState.verification || !matchState.verification.isActive) {
      return res.status(400).json({ error: "Sesi verifikasi dewan tidak aktif." });
    }
    
    const key = `j${juriIndex}` as "j1" | "j2" | "j3";
    matchState.verification.juriVotes[key] = vote;
    
    // Log the vote individually
    logAction(`Juri ${juriIndex} mengirimkan suara: ${vote}`, "system");
    
    // Check if all judges have voted
    const { j1, j2, j3 } = matchState.verification.juriVotes;
    if (j1 && j2 && j3) {
      // Calculate consensus based on majority
      const votes = [j1, j2, j3];
      const counts = { BIRU: 0, MERAH: 0, "TIDAK SAH": 0 };
      votes.forEach(v => {
        if (v) counts[v] = (counts[v] || 0) + 1;
      });
      
      let consensus: string;
      if (counts.BIRU >= 2) {
        consensus = matchState.verification.category === "JATUHAN" ? "JATUHAN SAH (SUDUT BIRU)" : "PELANGGARAN (SUDUT BIRU)";
      } else if (counts.MERAH >= 2) {
        consensus = matchState.verification.category === "JATUHAN" ? "JATUHAN SAH (SUDUT MERAH)" : "PELANGGARAN (SUDUT MERAH)";
      } else {
        consensus = "BATAL / TIDAK SAH";
      }
      
      matchState.verification.consensusResult = consensus;
      logAction(`Hasil Konsensus Otomatis Terbentuk: ${consensus}`, "system");
      triggerSound("success_chime");
    } else {
      triggerSound("short_beep");
    }
    
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  app.post("/api/match/verification/reset", (req, res) => {
    matchState.verification = {
      isActive: false,
      category: "",
      juriVotes: { j1: null, j2: null, j3: null },
      consensusResult: null
    };
    
    logAction("Sesi verifikasi selesai, kembali ke jalannya ronde tanding.", "system");
    triggerSound("short_beep");
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  app.post("/api/match/verification/cancel", (req, res) => {
    matchState.verification = {
      isActive: false,
      category: "",
      juriVotes: { j1: null, j2: null, j3: null },
      consensusResult: null
    };
    
    logAction("Sesi verifikasi dibatalkan oleh Dewan.", "system");
    triggerSound("short_beep");
    sendStateToClients();
    res.json({ success: true, state: matchState });
  });

  // 13. Restore entire Match State (Autosave Redundancy Backup)
  app.post("/api/match/restore", (req, res) => {
    const { state } = req.body;
    if (state) {
      matchState = {
        ...matchState,
        ...state,
        // Force timer running to be false for safety upon restoration
        isTimerRunning: false,
      };
      logAction("Sistem: Data pertandingan dipulihkan dari Backup Redundansi Lokal (Autosave).", "system");
      sendStateToClients();
      return res.json({ success: true, state: matchState });
    }
    return res.status(400).json({ error: "State parameter is required" });
  });

  // Serve static files and handle Vite routing
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, find the compiled web files (dist) robustly
    const fs = await import("fs");
    let distPath = __dirname;
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = path.join(process.cwd(), "dist");
    }
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = path.join(__dirname, "dist");
    }
    console.log(`[Production Server] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`JRZ Score TGR Server running on port ${PORT}`);
  });
}

startServer();
