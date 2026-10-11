export interface Athlete {
  name: string;
  contingent: string;
}

export interface ScoreDetail {
  pukulan: number;      // 1 point
  tendangan: number;    // 2 points
  jatuhan: number;      // 3 points
  hukuman: number;      // Negative total points from penalties
  total: number;        // Final calculated score for the round/match
}

export interface PenaltiesState {
  binaan: number;          // 0 = none, 1 = Binaan 1, 2 = Binaan 2
  teguran1: boolean;       // -1 point
  teguran2: boolean;       // -2 points
  peringatan1: boolean;    // -5 points
  peringatan2: boolean;    // -10 points
  peringatan3: boolean;    // Disqualification
  keluarGelanggang: number;// -1 point each occurrence
}

export interface JuriInputState {
  juri1: { active: boolean; type: "pukulan" | "tendangan" | null; timestamp: number };
  juri2: { active: boolean; type: "pukulan" | "tendangan" | null; timestamp: number };
  juri3: { active: boolean; type: "pukulan" | "tendangan" | null; timestamp: number };
}

export interface JuriPendingInput {
  juriIndex: number; // 1, 2, 3
  corner: "blue" | "red";
  attackType: "pukulan" | "tendangan";
  timestamp: number;
}

export interface ActionLog {
  id: string;
  timestamp: number; // relative/epoch
  clockTime: string; // e.g. "01:23"
  message: string;
  type: "system" | "score_blue" | "score_red" | "penalty_blue" | "penalty_red" | "round" | "undo";
  round: number;
}

export interface MatchState {
  tournamentName: string;
  arena: string;
  matchNumber: string;
  classCategory: string;
  athleteBlue: Athlete;
  athleteRed: Athlete;
  round: number; // 1, 2, or 3
  maxRound: number; // default 3
  roundDuration: number; // default 120 (seconds)
  timeRemaining: number; // in seconds
  isTimerRunning: boolean;
  isPanelsLocked: boolean;
  scores: {
    blue: ScoreDetail;
    red: ScoreDetail;
  };
  roundScores: {
    [roundNum: number]: {
      blue: ScoreDetail;
      red: ScoreDetail;
    };
  };
  penalties: {
    blue: PenaltiesState;
    red: PenaltiesState;
  };
  winner: "blue" | "red" | null;
  winnerDecision: string; // e.g., "Menang Angka", "Diskualifikasi", "Mutlak"
  juriLogs: JuriPendingInput[];
  juriActiveIndicators: {
    blue: { j1: "pukulan" | "tendangan" | null; j2: "pukulan" | "tendangan" | null; j3: "pukulan" | "tendangan" | null };
    red: { j1: "pukulan" | "tendangan" | null; j2: "pukulan" | "tendangan" | null; j3: "pukulan" | "tendangan" | null };
  };
  actionLogs: ActionLog[];
  soundTrigger: "none" | "short_beep" | "success_chime" | "buzzer" | "warning_beep";
  soundTriggerTime: number; // system time of trigger to allow state updates
  secretarySignalNextRound?: boolean;
  gapRuleTracker?: {
    active: boolean;
    losingCorner: "blue" | "red" | null;
    lastLosingScore: number;
    secondsElapsed: number;
    maxSeconds: number;
    round?: number;
  };
  verification?: VerificationState;
}

export interface VerificationState {
  isActive: boolean;
  category: "JATUHAN" | "PELANGGARAN" | string;
  juriVotes: {
    j1: "BIRU" | "MERAH" | "TIDAK SAH" | null;
    j2: "BIRU" | "MERAH" | "TIDAK SAH" | null;
    j3: "BIRU" | "MERAH" | "TIDAK SAH" | null;
  };
  consensusResult: string | null;
}

export type UserRole = "scoreboard" | "dewan" | "juri1" | "juri2" | "juri3" | "sekretaris";
