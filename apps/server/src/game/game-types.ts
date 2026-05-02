import type { ActionType, EliminationSummary, GameMode, GamePhase, Role, RolePresetId, RuleSettings } from "@vampir-koylu/shared";

export interface PlayerState {
  playerId: string;
  nickname: string;
  deviceId: string;
  sessionToken: string;
  socketId: string;
  isConnected: boolean;
  isReady: boolean;
  isAlive: boolean;
  role: Role | null;
  lastProtectedRound: number | null;
  lastProtectedTargetPlayerId: string | null;
  guardUsedInGame: boolean;
}

export interface GameActionEntry {
  actorPlayerId: string;
  targetPlayerId?: string;
  actionType: ActionType;
  round: number;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  phaseEndsAt: number | null;
  tieCountInRound: number;
  mayorPlayerId: string | null;
  guardProtectedPlayerId: string | null;
  winner: "Vampires" | "Villagers" | null;
  actions: GameActionEntry[];
  privateResults: Array<
    | {
        playerId: string;
        detectiveResult: "Vampire" | "NotVampire";
        detectiveTargetPlayerId: string;
      }
    | {
        playerId: string;
        vampireVotePreview: { vampirePlayerId: string; targetPlayerId: string }[];
      }
  >;
  lastDayVoteSummary: {
    entries: { playerId: string; votes: number }[];
    executedPlayerId: string | null;
    tiedTopCandidates: string[];
    noLynchWon?: boolean;
  } | null;
  lastEliminationSummary: EliminationSummary | null;
  gameMode: GameMode;
  rolePreset: RolePresetId;
  rules: RuleSettings;
  loverLinks: Record<string, string>;
  detectiveInspectedTargets: Record<string, string[]>;
  phaseDurations: {
    roleReveal: number;
    nightStart: number;
    vampireVote: number;
    detectiveInspect: number;
    doctorProtect: number;
    dayStart: number;
    dayDiscussion: number;
    dayVote: number;
  };
}

export interface RoomState {
  roomCode: string;
  status: "Lobby" | "InGame" | "GameOver";
  players: PlayerState[];
  game: GameState;
  createdAt: number;
  lastActivityAt: number;
  cleanupAt: number | null;
}
