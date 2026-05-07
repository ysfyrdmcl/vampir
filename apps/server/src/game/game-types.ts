import type {
  ActionType,
  BotIntelligence,
  BotPersonality,
  EliminationSummary,
  GameMode,
  GamePhase,
  Role,
  RolePresetId,
  RuleSettings,
  VampireVotePreview
} from "@vampir-koylu/shared";

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
  isBot: boolean;
  botIntelligence?: BotIntelligence;
  botPersonality?: BotPersonality;
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
  isPaused: boolean;
  pausedRemainingMs: number | null;
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
        vampireVotePreview: VampireVotePreview;
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
    nightResolve: number;
    dayStart: number;
    mayorElection: number;
    guardProtect: number;
    dayDiscussion: number;
    dayVote: number;
    executionResolve: number;
    hunterLastBreath: number;
    winCheck: number;
  };
}

export interface RoomState {
  roomCode: string;
  status: "Lobby" | "InGame" | "GameOver";
  hostPlayerId: string;
  players: PlayerState[];
  game: GameState;
  createdAt: number;
  lastActivityAt: number;
  cleanupAt: number | null;
}
