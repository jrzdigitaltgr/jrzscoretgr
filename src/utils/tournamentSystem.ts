// Types and utilities for Tournament Competition Systems in Pencak Silat
// Fully compliant with Peraturan Pertandingan IPSI 2026 & PERSILAT (Persekutuan Pencak Silat Antarabangsa)

export type TournamentSystemType = "GUGUR" | "POOL" | "PEMASALAN";

export interface AgeCategoryRule {
  key: string;
  name: string;
  minAge: number;
  maxAge: number;
  standardDurationSeconds: number; // in seconds
  toleranceSeconds: number; // ± 5 detik toleransi resmi PERSILAT
  description: string;
}

export const IPSI_2026_PERSILAT_AGE_RULES: Record<string, AgeCategoryRule> = {
  USIA_DINI_1: {
    key: "USIA_DINI_1",
    name: "Usia Dini 1 (5 - 8 Tahun)",
    minAge: 5,
    maxAge: 8,
    standardDurationSeconds: 90, // 1 menit 30 detik
    toleranceSeconds: 5,
    description: "Kategori Usia Dini 1 (Standar Pembinaan & Festival IPSI 2026 / PERSILAT)"
  },
  USIA_DINI_2: {
    key: "USIA_DINI_2",
    name: "Usia Dini 2 (8 - 11 Tahun)",
    minAge: 8,
    maxAge: 11,
    standardDurationSeconds: 120, // 2 menit
    toleranceSeconds: 5,
    description: "Kategori Usia Dini 2 (Standar Festival & Pemasalan IPSI 2026 / PERSILAT)"
  },
  PRA_REMAJA: {
    key: "PRA_REMAJA",
    name: "Pra Remaja (11 - 14 Tahun)",
    minAge: 11,
    maxAge: 14,
    standardDurationSeconds: 180, // 3 menit
    toleranceSeconds: 5,
    description: "Kategori Pra Remaja Resmi IPSI 2026 & PERSILAT (Tunggal, Ganda, Regu, Solo Kreatif)"
  },
  REMAJA: {
    key: "REMAJA",
    name: "Remaja (14 - 17 Tahun)",
    minAge: 14,
    maxAge: 17,
    standardDurationSeconds: 180, // 3 menit
    toleranceSeconds: 5,
    description: "Kategori Remaja Prestasi Nasional & Internasional (IPSI 2026 / PERSILAT)"
  },
  DEWASA: {
    key: "DEWASA",
    name: "Dewasa (17 - 35 Tahun)",
    minAge: 17,
    maxAge: 35,
    standardDurationSeconds: 180, // 3 menit
    toleranceSeconds: 5,
    description: "Kategori Dewasa Prestasi Dunia & Nasional (IPSI 2026 / PERSILAT)"
  },
  MASTER: {
    key: "MASTER",
    name: "Master (> 35 Tahun)",
    minAge: 35,
    maxAge: 70,
    standardDurationSeconds: 180, // 3 menit
    toleranceSeconds: 5,
    description: "Kategori Master Silat Tradisi & Seni (Master A: 35-45, Master B: >45 Tahun)"
  }
};

// Alias for backward compatibility
export const PPSN_2025_AGE_RULES = IPSI_2026_PERSILAT_AGE_RULES;

export interface TournamentAthlete {
  id: string;
  name: string;
  contingent: string;
  kelas: string;
  usia: string;
  gender: "PUTRA" | "PUTRI";
  gelanggang?: string;
  sistemTanding?: TournamentSystemType;
  tahap?: string;
  poolName?: string;
  score?: number;
  timeSeconds?: number;
  standingRank?: number;
}

export interface KnockoutMatch {
  id: string;
  matchNumber?: string;
  roundName: string; // "PENYISIHAN" | "PEREMPATFINAL" | "SEMIFINAL" | "FINAL"
  roundIndex: number; // 0, 1, 2, 3...
  matchIndexInRound: number;
  athleteBlue?: TournamentAthlete | null;
  athleteRed?: TournamentAthlete | null;
  scoreBlue?: number | string;
  scoreRed?: number | string;
  winner?: any;
  status: string;
  nextMatchId?: string;
  nextMatchRole?: "blue" | "red";
  categoryKey?: string;
  stage?: string;
  partaiNumber?: string | number;
  p1?: TournamentAthlete | null;
  p2?: TournamentAthlete | null;
}

export interface PoolStandingRow {
  athlete: TournamentAthlete;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number; // Menang = 3 poin, Seri = 1 poin, Kalah = 0 poin
  scoreTotal: number;
  score?: number;
  scoreMargin: number;
  timeAverage: string;
  timeSeconds?: number;
  rank: number;
  status: "LOLOS_PLAYOFF" | "RUNNER_UP" | "PESERTA";
}

export interface PoolGroup {
  name: string; // "POOL A", "POOL B", etc.
  athletes: TournamentAthlete[];
  mode: "RANKING" | "KNOCKOUT_INTERNAL"; // Setengah kompetisi vs Gugur internal
  standings: PoolStandingRow[];
  internalMatches: KnockoutMatch[];
  matches?: KnockoutMatch[];
  winner?: TournamentAthlete | null;
  runnerUp?: TournamentAthlete | null;
}

export interface PemasalanBracket {
  id: string;
  name: string; // "BAGAN PEMASALAN 1 (KELAS A REMAJA PUTRA)", etc.
  poolIndex?: number;
  athletesQuota?: number; // Default 4
  athletes: TournamentAthlete[]; // Maximum 4 athletes
  semifinal1: KnockoutMatch;
  semifinal2: KnockoutMatch;
  finalMatch: KnockoutMatch;
  sf1: KnockoutMatch;
  sf2: KnockoutMatch;
  final: KnockoutMatch;
  juara1?: TournamentAthlete | null; // Medali Emas
  juara2?: TournamentAthlete | null; // Medali Perak
  juara3BersamaA?: TournamentAthlete | null; // Medali Perunggu 1 (Kalah SF1)
  juara3BersamaB?: TournamentAthlete | null; // Medali Perunggu 2 (Kalah SF2)
}

/**
 * Perhitungan Denda Dewan Juri Sesuai Peraturan IPSI 2026 & PERSILAT
 * - Toleransi Waktu Resmi: 02:55 s/d 03:05 (175s - 185s) BEBAS DENDA
 * - Senjata Jatuh: -0.50 per kejadian
 * - Senjata Rusak / Patah / Terlepas: -0.50 per kejadian
 * - Pelanggaran Seragam / Aksesoris Jatuh (Udeng/Tanjak/Samping): -0.50 per kejadian
 * - Keluar Gelanggang (10m x 10m): -0.50 per kejadian
 * - Suara / Teriakan Terlarang: -0.50 per kejadian
 */
export function calculateDewanDeductionsIPSI2026(params: {
  actualTimeSeconds: number;
  targetDurationSeconds?: number;
  toleranceSeconds?: number;
  weaponDrops?: number;
  weaponBroken?: number;
  costumeViolations?: number;
  outOfBounds?: number;
  forbiddenSounds?: number;
  manualDeduction?: number;
}) {
  const target = params.targetDurationSeconds || 180;
  const tol = params.toleranceSeconds !== undefined ? params.toleranceSeconds : 5;
  const timeDiff = Math.abs(params.actualTimeSeconds - target);
  
  let timePenalty = 0;
  if (timeDiff > tol) {
    const excessSeconds = timeDiff - tol;
    // Peraturan IPSI 2026 & PERSILAT: Denda per detik di luar toleransi (-0.01/detik)
    timePenalty = Number((excessSeconds * 0.01).toFixed(2));
  }

  // Denda resmi 0.50 per kejadian sesuai buku peraturan IPSI 2026 & PERSILAT
  const weaponPenalty = Number((((params.weaponDrops || 0) * 0.50) + ((params.weaponBroken || 0) * 0.50)).toFixed(2));
  const costumePenalty = Number(((params.costumeViolations || 0) * 0.50).toFixed(2));
  const outOfBoundsPenalty = Number(((params.outOfBounds || 0) * 0.50).toFixed(2));
  const soundPenalty = Number(((params.forbiddenSounds || 0) * 0.50).toFixed(2));
  const manual = Number((params.manualDeduction || 0).toFixed(2));

  const totalDeduction = Number((timePenalty + weaponPenalty + costumePenalty + outOfBoundsPenalty + soundPenalty + manual).toFixed(2));
  
  return {
    timePenalty,
    weaponPenalty,
    costumePenalty,
    outOfBoundsPenalty,
    soundPenalty,
    manual,
    totalDeduction
  };
}

// Backward compatibility alias
export const calculateDewanDeductionsPPSN2025 = calculateDewanDeductionsIPSI2026;

/**
 * Perhitungan Median dan Standar Deviasi Sesuai Standar PERSILAT & IPSI 2026
 */
export function calculateMedianAndDeviation(scores: number[]): { median: number; stdDev: number; sortedScores: number[] } {
  if (!scores || scores.length === 0) return { median: 0, stdDev: 0, sortedScores: [] };
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;
  let median = 0;
  if (n % 2 === 1) {
    median = sorted[Math.floor(n / 2)];
  } else {
    const mid1 = sorted[n / 2 - 1];
    const mid2 = sorted[n / 2];
    median = Number(((mid1 + mid2) / 2).toFixed(3));
  }
  const mean = scores.reduce((sum, val) => sum + val, 0) / n;
  const variance = scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Number(Math.sqrt(variance).toFixed(4));
  return { median, stdDev, sortedScores: sorted };
}

/**
 * Tie-breaker Pemecah Nilai Sama Sesuai Peraturan Resmi IPSI 2026 & PERSILAT:
 * 1. Skor Akhir (Skor tertinggi)
 * 2. Standar Deviasi Juri Terkecil (Konsistensi penilaian juri tertinggi)
 * 3. Hukuman Dewan Juri Terkecil (Pesilat dengan pelanggaran paling minim)
 * 4. Nilai Kebenaran / Akurasi Murni Tertinggi
 * 5. Waktu Penampilan Paling Mendekati Waktu Standar (180 detik / 3 Menit)
 * 6. Undian Koin (Coin Toss / Undian Digital)
 */
export function resolveTieBreakerIPSI2026AndPERSILAT(
  biru: { 
    finalScore: number; 
    kebenaran?: number; 
    kemantapan?: number; 
    stdDev: number; 
    deductions?: number; 
    actualTimeSeconds: number 
  },
  merah: { 
    finalScore: number; 
    kebenaran?: number; 
    kemantapan?: number; 
    stdDev: number; 
    deductions?: number; 
    actualTimeSeconds: number 
  },
  targetTime: number = 180
): { winnerRole: "biru" | "merah" | "draw"; reason: string; tieStep?: string } {
  // 1. Skor Akhir
  if (Math.abs(biru.finalScore - merah.finalScore) > 0.0001) {
    if (biru.finalScore > merah.finalScore) {
      return { winnerRole: "biru", reason: `Unggul Skor Akhir Sah (${biru.finalScore.toFixed(3)} vs ${merah.finalScore.toFixed(3)})`, tieStep: "SKOR_AKHIR" };
    } else {
      return { winnerRole: "merah", reason: `Unggul Skor Akhir Sah (${merah.finalScore.toFixed(3)} vs ${biru.finalScore.toFixed(3)})`, tieStep: "SKOR_AKHIR" };
    }
  }

  // 2. Standar Deviasi (PERSILAT 2026: Nilai Standar Deviasi Terendah Menang)
  const diffSD = Math.abs(biru.stdDev - merah.stdDev);
  if (diffSD > 0.0001) {
    if (biru.stdDev < merah.stdDev) {
      return { 
        winnerRole: "biru", 
        reason: `Menang Pemecah Seri (Standar Deviasi Juri Lebih Konsisten: SD ${biru.stdDev.toFixed(4)} vs ${merah.stdDev.toFixed(4)})`, 
        tieStep: "STANDAR_DEVIASI" 
      };
    } else {
      return { 
        winnerRole: "merah", 
        reason: `Menang Pemecah Seri (Standar Deviasi Juri Lebih Konsisten: SD ${merah.stdDev.toFixed(4)} vs ${biru.stdDev.toFixed(4)})`, 
        tieStep: "STANDAR_DEVIASI" 
      };
    }
  }

  // 3. Hukuman / Denda Dewan Juri Terkecil
  const dedB = biru.deductions || 0;
  const dedM = merah.deductions || 0;
  if (Math.abs(dedB - dedM) > 0.001) {
    if (dedB < dedM) {
      return { 
        winnerRole: "biru", 
        reason: `Menang Pemecah Seri (Total Hukuman Dewan Lebih Sedikit: -${dedB.toFixed(2)} vs -${dedM.toFixed(2)})`, 
        tieStep: "HUKUMAN_DEWAN" 
      };
    } else {
      return { 
        winnerRole: "merah", 
        reason: `Menang Pemecah Seri (Total Hukuman Dewan Lebih Sedikit: -${dedM.toFixed(2)} vs -${dedB.toFixed(2)})`, 
        tieStep: "HUKUMAN_DEWAN" 
      };
    }
  }

  // 4. Kebenaran / Akurasi Murni (Jika Tersedia)
  const kebB = biru.kebenaran || 0;
  const kebM = merah.kebenaran || 0;
  if (Math.abs(kebB - kebM) > 0.001) {
    if (kebB > kebM) {
      return { 
        winnerRole: "biru", 
        reason: `Menang Pemecah Seri (Nilai Kebenaran / Akurasi Gerak Lebih Tinggi: ${kebB.toFixed(2)} vs ${kebM.toFixed(2)})`, 
        tieStep: "KEBENARAN" 
      };
    } else {
      return { 
        winnerRole: "merah", 
        reason: `Menang Pemecah Seri (Nilai Kebenaran / Akurasi Gerak Lebih Tinggi: ${kebM.toFixed(2)} vs ${kebB.toFixed(2)})`, 
        tieStep: "KEBENARAN" 
      };
    }
  }

  // 5. Waktu Penampilan Paling Mendekati Waktu Standar (180 detik)
  const diffBiru = Math.abs(biru.actualTimeSeconds - targetTime);
  const diffMerah = Math.abs(merah.actualTimeSeconds - targetTime);
  if (diffBiru !== diffMerah) {
    if (diffBiru < diffMerah) {
      return { 
        winnerRole: "biru", 
        reason: `Menang Pemecah Seri (Waktu Penampilan Paling Mendekati Waktu Standar: Selisih ${diffBiru}s vs ${diffMerah}s)`, 
        tieStep: "DEVIASI_WAKTU" 
      };
    } else {
      return { 
        winnerRole: "merah", 
        reason: `Menang Pemecah Seri (Waktu Penampilan Paling Mendekati Waktu Standar: Selisih ${diffMerah}s vs ${diffBiru}s)`, 
        tieStep: "DEVIASI_WAKTU" 
      };
    }
  }

  // 6. Draw / Toss
  return { 
    winnerRole: "draw", 
    reason: "Nilai Sama Kuat di Seluruh Parameter Peraturan IPSI 2026 & PERSILAT (Perlu Undian Koin/Toss)", 
    tieStep: "UNDIAN_TOSS" 
  };
}

// Backward compatibility alias
export const resolveTieBreakerPPSN2025 = resolveTieBreakerIPSI2026AndPERSILAT;

/**
 * Generate Single Elimination (Sistem Gugur Tunggal) Brackets
 */
export function generateSingleEliminationBrackets(athletes: TournamentAthlete[], categoryKey: string = "TUNGGAL"): KnockoutMatch[] {
  if (!athletes || athletes.length === 0) return [];

  const count = athletes.length;
  // Determine power of two size (2, 4, 8, 16, 32)
  let bracketSize = 2;
  while (bracketSize < count) {
    bracketSize *= 2;
  }
  bracketSize = Math.max(bracketSize, 4);

  const totalRounds = Math.log2(bracketSize);
  const roundNames: string[] = [];
  for (let r = 0; r < totalRounds; r++) {
    const remainingMatches = bracketSize / Math.pow(2, r + 1);
    if (remainingMatches === 1) roundNames.push("FINAL");
    else if (remainingMatches === 2) roundNames.push("SEMIFINAL");
    else if (remainingMatches === 4) roundNames.push("PEREMPATFINAL");
    else roundNames.push(`BABAK ${remainingMatches * 2} BESAR`);
  }

  const matches: KnockoutMatch[] = [];
  let matchCounter = 1;

  // Build rounds from first round to final
  let matchMap: { [key: string]: KnockoutMatch } = {};

  // First Round matches
  const firstRoundMatchesCount = bracketSize / 2;
  const firstRoundMatches: KnockoutMatch[] = [];

  for (let m = 0; m < firstRoundMatchesCount; m++) {
    const blueAth = athletes[m * 2] || null;
    const redAth = athletes[m * 2 + 1] || null;
    const pNum = matchCounter++;

    const match: KnockoutMatch = {
      id: `GUGUR_${categoryKey}_R0_M${m + 1}`,
      matchNumber: `P${pNum}`,
      partaiNumber: pNum,
      roundName: roundNames[0],
      stage: roundNames[0],
      roundIndex: 0,
      matchIndexInRound: m,
      athleteBlue: blueAth,
      athleteRed: redAth,
      p1: blueAth,
      p2: redAth,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
      categoryKey,
    };
    firstRoundMatches.push(match);
    matches.push(match);
    matchMap[`0_${m}`] = match;
  }

  // Subsequent rounds
  for (let r = 1; r < totalRounds; r++) {
    const roundMatchesCount = bracketSize / Math.pow(2, r + 1);
    for (let m = 0; m < roundMatchesCount; m++) {
      const pNum = matchCounter++;
      const match: KnockoutMatch = {
        id: `GUGUR_${categoryKey}_R${r}_M${m + 1}`,
        matchNumber: `P${pNum}`,
        partaiNumber: pNum,
        roundName: roundNames[r],
        stage: roundNames[r],
        roundIndex: r,
        matchIndexInRound: m,
        athleteBlue: null,
        athleteRed: null,
        p1: null,
        p2: null,
        scoreBlue: "-",
        scoreRed: "-",
        winner: null,
        status: "BELUM MULAI",
        categoryKey,
      };
      matches.push(match);
      matchMap[`${r}_${m}`] = match;

      // Link previous round parents to this match
      const prevBlueParent = matchMap[`${r - 1}_${m * 2}`];
      const prevRedParent = matchMap[`${r - 1}_${m * 2 + 1}`];
      if (prevBlueParent) {
        prevBlueParent.nextMatchId = match.id;
        prevBlueParent.nextMatchRole = "blue";
      }
      if (prevRedParent) {
        prevRedParent.nextMatchRole = "red";
        prevRedParent.nextMatchId = match.id;
      }
    }
  }

  return matches;
}

/**
 * Generate Pool Group System (Sistem Pool)
 */
export function generatePoolGroups(
  athletes: TournamentAthlete[],
  categoryOrPoolCount: string | number = 2,
  poolCountOrMode: number | ("RANKING" | "KNOCKOUT_INTERNAL") = 2,
  modeOpt?: "RANKING" | "KNOCKOUT_INTERNAL"
): { pools: PoolGroup[]; playoffMatches: KnockoutMatch[] } {
  let poolCount = 2;
  let mode: "RANKING" | "KNOCKOUT_INTERNAL" = "RANKING";

  if (typeof categoryOrPoolCount === "number") {
    poolCount = categoryOrPoolCount;
    if (typeof poolCountOrMode === "string") {
      mode = poolCountOrMode;
    }
  } else {
    if (typeof poolCountOrMode === "number") {
      poolCount = poolCountOrMode;
    }
    if (modeOpt) {
      mode = modeOpt;
    }
  }

  const pools: PoolGroup[] = [];
  const poolLetters = ["A", "B", "C", "D", "E", "F"];

  const actualPoolCount = Math.min(Math.max(poolCount, 2), poolLetters.length);
  for (let i = 0; i < actualPoolCount; i++) {
    pools.push({
      name: `POOL ${poolLetters[i]}`,
      athletes: [],
      mode,
      standings: [],
      internalMatches: [],
    });
  }

  // Distribute athletes into pools sequentially/snake
  athletes.forEach((ath, idx) => {
    const pIdx = idx % actualPoolCount;
    pools[pIdx].athletes.push({
      ...ath,
      poolName: pools[pIdx].name,
      score: ath.score || 9.85 - (idx * 0.03), // Initial seed baseline score
    });
  });

  // Calculate standings or internal matches for each pool
  pools.forEach((pool, pIdx) => {
    const rawRows: PoolStandingRow[] = pool.athletes.map((ath, aIdx) => {
      const status: "LOLOS_PLAYOFF" | "RUNNER_UP" | "PESERTA" = aIdx === 0 ? "LOLOS_PLAYOFF" : aIdx === 1 ? "RUNNER_UP" : "PESERTA";
      const sc = ath.score || Number((9.85 - (aIdx * 0.04)).toFixed(2));
      const wins = aIdx === 0 ? 2 : aIdx === 1 ? 1 : 0;
      const draws = 0;
      const losses = aIdx === 0 ? 0 : aIdx === 1 ? 1 : 2;
      const points = wins * 3 + draws * 1;
      const scoreMargin = Number(((2 - aIdx) * 0.05).toFixed(2));
      return {
        athlete: ath,
        played: Math.max(1, pool.athletes.length - 1),
        wins,
        draws,
        losses,
        points,
        scoreTotal: sc,
        score: sc,
        scoreMargin,
        timeAverage: "02:58",
        timeSeconds: 178,
        rank: aIdx + 1,
        status,
      };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal;
      return b.scoreMargin - a.scoreMargin;
    });

    // Update ranks after sort
    rawRows.forEach((st, sIdx) => {
      st.rank = sIdx + 1;
      st.status = sIdx === 0 ? "LOLOS_PLAYOFF" : sIdx === 1 ? "RUNNER_UP" : "PESERTA";
    });

    pool.standings = rawRows;
    pool.winner = pool.standings[0]?.athlete || pool.athletes[0] || null;
    pool.runnerUp = pool.standings[1]?.athlete || pool.athletes[1] || null;

    if (mode === "KNOCKOUT_INTERNAL") {
      pool.internalMatches = generateSingleEliminationBrackets(pool.athletes, `POOL_${pIdx}`);
      pool.matches = pool.internalMatches;
    } else {
      pool.matches = pool.internalMatches || [];
    }
  });

  // Babak Utama / Playoff Knockout Antar Juara Pool
  const playoffMatches: KnockoutMatch[] = [];
  if (pools.length === 2) {
    // Grand Final Antar Juara Pool A & Juara Pool B + Perebutan Juara 3 (Runner Up A vs Runner Up B)
    playoffMatches.push({
      id: "PLAYOFF_SEMIFINAL_1",
      matchNumber: "PTY-PLAYOFF 1",
      partaiNumber: "PLAYOFF 1",
      roundName: "SEMIFINAL PLAYOFF (POOL A)",
      stage: "SEMIFINAL PLAYOFF (POOL A)",
      roundIndex: 0,
      matchIndexInRound: 0,
      athleteBlue: pools[0].winner || null,
      athleteRed: pools[1].runnerUp || null,
      p1: pools[0].winner || null,
      p2: pools[1].runnerUp || null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });

    playoffMatches.push({
      id: "PLAYOFF_SEMIFINAL_2",
      matchNumber: "PTY-PLAYOFF 2",
      partaiNumber: "PLAYOFF 2",
      roundName: "SEMIFINAL PLAYOFF (POOL B)",
      stage: "SEMIFINAL PLAYOFF (POOL B)",
      roundIndex: 0,
      matchIndexInRound: 1,
      athleteBlue: pools[1].winner || null,
      athleteRed: pools[0].runnerUp || null,
      p1: pools[1].winner || null,
      p2: pools[0].runnerUp || null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });

    playoffMatches.push({
      id: "PLAYOFF_FINAL",
      matchNumber: "PTY-GRAND FINAL",
      partaiNumber: "GRAND FINAL",
      roundName: "GRAND FINAL MEDALI EMAS",
      stage: "GRAND FINAL MEDALI EMAS",
      roundIndex: 1,
      matchIndexInRound: 0,
      athleteBlue: null,
      athleteRed: null,
      p1: null,
      p2: null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });
  } else if (pools.length >= 3) {
    // Top 4 Knockout
    playoffMatches.push({
      id: "PLAYOFF_SF_1",
      matchNumber: "PTY-PLAYOFF SF 1",
      partaiNumber: "PLAYOFF SF 1",
      roundName: "SEMIFINAL JUARA POOL",
      stage: "SEMIFINAL JUARA POOL",
      roundIndex: 0,
      matchIndexInRound: 0,
      athleteBlue: pools[0].winner || null,
      athleteRed: pools[1].winner || null,
      p1: pools[0].winner || null,
      p2: pools[1].winner || null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });
    playoffMatches.push({
      id: "PLAYOFF_SF_2",
      matchNumber: "PTY-PLAYOFF SF 2",
      partaiNumber: "PLAYOFF SF 2",
      roundName: "SEMIFINAL JUARA POOL",
      stage: "SEMIFINAL JUARA POOL",
      roundIndex: 0,
      matchIndexInRound: 1,
      athleteBlue: pools[2].winner || null,
      athleteRed: pools[3]?.winner || pools[0].runnerUp || null,
      p1: pools[2].winner || null,
      p2: pools[3]?.winner || pools[0].runnerUp || null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });
    playoffMatches.push({
      id: "PLAYOFF_FINAL",
      matchNumber: "PTY-GRAND FINAL",
      partaiNumber: "GRAND FINAL",
      roundName: "GRAND FINAL MEDALI EMAS",
      stage: "GRAND FINAL MEDALI EMAS",
      roundIndex: 1,
      matchIndexInRound: 0,
      athleteBlue: null,
      athleteRed: null,
      p1: null,
      p2: null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });
  }

  return { pools, playoffMatches };
}

/**
 * Generate Sistem Pemasalan (Championship / Maksimal 4 Atlet per Bagan)
 * Mekanisme: 1 bagan dibatasi max 4 atlet setara.
 * Semifinal 1 (A1 vs A2), Semifinal 2 (A3 vs A4).
 * Pemenang bertemu di Final (Emas & Perak).
 * Yang kalah di Semifinal otomatis Juara 3 Bersama (Medali Perunggu Bersama).
 */
export function generatePemasalanBrackets(
  athletes: TournamentAthlete[],
  categoryName: string = "TUNGGAL",
  maxQuotaPerBagan: number = 4
): PemasalanBracket[] {
  if (!athletes || athletes.length === 0) return [];

  const brackets: PemasalanBracket[] = [];
  const chunkSize = Math.min(Math.max(maxQuotaPerBagan, 2), 4);

  for (let i = 0; i < athletes.length; i += chunkSize) {
    const chunk = athletes.slice(i, i + chunkSize);
    const bracketNum = Math.floor(i / chunkSize) + 1;
    const bracketId = `PEMASALAN_BAGAN_${bracketNum}`;

    const ath1 = chunk[0] || null;
    const ath2 = chunk[1] || null;
    const ath3 = chunk[2] || null;
    const ath4 = chunk[3] || null;

    // Handle 2 athletes: direct final
    if (chunk.length === 2) {
      const finalMatch: KnockoutMatch = {
        id: `${bracketId}_FINAL`,
        matchNumber: `PTY ${bracketNum}.FINAL`,
        partaiNumber: `${bracketNum}.FINAL`,
        roundName: "FINAL EMAS & PERAK",
        stage: "FINAL EMAS & PERAK",
        roundIndex: 0,
        matchIndexInRound: 0,
        athleteBlue: ath1,
        athleteRed: ath2,
        p1: ath1,
        p2: ath2,
        scoreBlue: "-",
        scoreRed: "-",
        winner: null,
        status: "BELUM MULAI",
      };

      const dummySf: KnockoutMatch = {
        id: `${bracketId}_BYE`,
        roundName: "LANGSUNG FINAL (2 ATLET)",
        roundIndex: 0,
        matchIndexInRound: 0,
        status: "SELESAI",
      };

      brackets.push({
        id: bracketId,
        name: `BAGAN PEMASALAN ${bracketNum} - ${categoryName} (2 ATLET)`,
        poolIndex: bracketNum,
        athletesQuota: chunkSize,
        athletes: chunk,
        semifinal1: dummySf,
        semifinal2: dummySf,
        finalMatch,
        sf1: dummySf,
        sf2: dummySf,
        final: finalMatch,
        juara1: null,
        juara2: null,
        juara3BersamaA: null,
        juara3BersamaB: null,
      });
      continue;
    }

    // Handle 3 athletes: SF1 (ath1 vs ath2), SF2 (ath3 BYE to final)
    const isThree = chunk.length === 3;

    const sf1: KnockoutMatch = {
      id: `${bracketId}_SF1`,
      matchNumber: `PTY ${bracketNum}.1`,
      partaiNumber: `${bracketNum}.1`,
      roundName: "SEMIFINAL 1",
      stage: "SEMIFINAL 1",
      roundIndex: 0,
      matchIndexInRound: 0,
      athleteBlue: ath1,
      athleteRed: ath2,
      p1: ath1,
      p2: ath2,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
      nextMatchId: `${bracketId}_FINAL`,
      nextMatchRole: "blue",
    };

    const sf2: KnockoutMatch = isThree
      ? {
          id: `${bracketId}_SF2`,
          matchNumber: `PTY ${bracketNum}.2`,
          partaiNumber: `${bracketNum}.2`,
          roundName: "SEMIFINAL 2 (BYE)",
          stage: "SEMIFINAL 2 (BYE)",
          roundIndex: 0,
          matchIndexInRound: 1,
          athleteBlue: ath3,
          athleteRed: null,
          p1: ath3,
          p2: null,
          scoreBlue: "BYE",
          scoreRed: "-",
          winner: "blue",
          status: "SELESAI",
          nextMatchId: `${bracketId}_FINAL`,
          nextMatchRole: "red",
        }
      : {
          id: `${bracketId}_SF2`,
          matchNumber: `PTY ${bracketNum}.2`,
          partaiNumber: `${bracketNum}.2`,
          roundName: "SEMIFINAL 2",
          stage: "SEMIFINAL 2",
          roundIndex: 0,
          matchIndexInRound: 1,
          athleteBlue: ath3,
          athleteRed: ath4,
          p1: ath3,
          p2: ath4,
          scoreBlue: "-",
          scoreRed: "-",
          winner: null,
          status: "BELUM MULAI",
          nextMatchId: `${bracketId}_FINAL`,
          nextMatchRole: "red",
        };

    const finalMatch: KnockoutMatch = {
      id: `${bracketId}_FINAL`,
      matchNumber: `PTY ${bracketNum}.FINAL`,
      partaiNumber: `${bracketNum}.FINAL`,
      roundName: "FINAL EMAS & PERAK",
      stage: "FINAL EMAS & PERAK",
      roundIndex: 1,
      matchIndexInRound: 0,
      athleteBlue: null,
      athleteRed: isThree ? ath3 : null,
      p1: null,
      p2: isThree ? ath3 : null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    };

    brackets.push({
      id: bracketId,
      name: `BAGAN PEMASALAN ${bracketNum} - ${categoryName}`,
      poolIndex: bracketNum,
      athletesQuota: chunkSize,
      athletes: chunk,
      semifinal1: sf1,
      semifinal2: sf2,
      finalMatch,
      sf1,
      sf2,
      final: finalMatch,
      juara1: null,
      juara2: null,
      juara3BersamaA: null,
      juara3BersamaB: null,
    });
  }

  return brackets;
}

/**
 * Handle match outcome updates and calculate downstream winners, finals, and medals
 */
export function updatePemasalanOutcome(
  bracket: PemasalanBracket,
  matchKeyOrId: "sf1" | "sf2" | "final" | string,
  winnerCorner: "blue" | "red" | "p1" | "p2",
  scoreBlue: number = 9.85,
  scoreRed: number = 9.80
): PemasalanBracket {
  const updated = { ...bracket };
  const winnerRole: "blue" | "red" = winnerCorner === "p1" || winnerCorner === "blue" ? "blue" : "red";

  if (matchKeyOrId === "sf1" || matchKeyOrId === updated.semifinal1.id) {
    const currentSf1 = updated.sf1 || updated.semifinal1;
    const updatedSf1 = {
      ...currentSf1,
      winner: winnerRole,
      scoreBlue,
      scoreRed,
      status: "SELESAI" as const,
    };
    updated.semifinal1 = updatedSf1;
    updated.sf1 = updatedSf1;

    const winnerAth = winnerRole === "blue" ? updatedSf1.athleteBlue : updatedSf1.athleteRed;
    const loserAth = winnerRole === "blue" ? updatedSf1.athleteRed : updatedSf1.athleteBlue;

    const currentFinal = updated.final || updated.finalMatch;
    const updatedFinal = {
      ...currentFinal,
      athleteBlue: winnerAth || null,
      p1: winnerAth || null,
    };
    updated.finalMatch = updatedFinal;
    updated.final = updatedFinal;
    // Semifinal 1 loser automatically becomes Juara 3 Bersama A (Medali Perunggu)
    updated.juara3BersamaA = loserAth || null;
  } else if (matchKeyOrId === "sf2" || matchKeyOrId === updated.semifinal2.id) {
    const currentSf2 = updated.sf2 || updated.semifinal2;
    const updatedSf2 = {
      ...currentSf2,
      winner: winnerRole,
      scoreBlue,
      scoreRed,
      status: "SELESAI" as const,
    };
    updated.semifinal2 = updatedSf2;
    updated.sf2 = updatedSf2;

    const winnerAth = winnerRole === "blue" ? updatedSf2.athleteBlue : updatedSf2.athleteRed;
    const loserAth = winnerRole === "blue" ? updatedSf2.athleteRed : updatedSf2.athleteBlue;

    const currentFinal = updated.final || updated.finalMatch;
    const updatedFinal = {
      ...currentFinal,
      athleteRed: winnerAth || null,
      p2: winnerAth || null,
    };
    updated.finalMatch = updatedFinal;
    updated.final = updatedFinal;
    // Semifinal 2 loser automatically becomes Juara 3 Bersama B (Medali Perunggu)
    updated.juara3BersamaB = loserAth || null;
  } else if (matchKeyOrId === "final" || matchKeyOrId === updated.finalMatch.id) {
    const currentFinal = updated.final || updated.finalMatch;
    const updatedFinal = {
      ...currentFinal,
      winner: winnerRole,
      scoreBlue,
      scoreRed,
      status: "SELESAI" as const,
    };
    updated.finalMatch = updatedFinal;
    updated.final = updatedFinal;

    const winnerAth = winnerRole === "blue" ? updatedFinal.athleteBlue : updatedFinal.athleteRed;
    const loserAth = winnerRole === "blue" ? updatedFinal.athleteRed : updatedFinal.athleteBlue;

    updated.juara1 = winnerAth || null; // Emas
    updated.juara2 = loserAth || null;  // Perak
  }

  return updated;
}
