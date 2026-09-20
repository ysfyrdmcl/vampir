import type { RolePresetId } from "./roles.js";

export type GamePhase =
  | "Lobby"
  | "RoleReveal"
  | "NightStart"
  | "VampireVote"
  | "DetectiveInspect"
  | "DoctorProtect"
  | "NightResolve"
  | "DayStart"
  | "MayorElection"
  | "GuardProtect"
  | "DayDiscussion"
  | "DayVote"
  | "ExecutionResolve"
  | "HunterLastBreath"
  | "WinCheck"
  | "GameOver";

export type Role = "Vampire" | "Detective" | "Doctor" | "Villager" | "Hunter" | "Guard";

export type ActionType = "vampire-target" | "detective-inspect" | "doctor-protect" | "day-vote" | "hunter-shot" | "mayor-vote" | "guard-protect";
export type GameMode = "Classic" | "SafeFirstNight" | "FastParty" | "MysteryVillage";
export type TiePolicy = "RevoteThenNoExecution" | "RevoteThenRandomExecution";

export interface PhaseDurationSettings {
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
}

export interface RuleSettings {
  firstNightNoKill: boolean;
  revealEliminatedRole: boolean;
  allowDoctorSelfProtect: boolean;
  allowDoctorConsecutiveProtectSameTarget: boolean;
  tiePolicy: TiePolicy;
  noLynchEnabled: boolean;
  mayorEnabled?: boolean;
  loversEnabled?: boolean;
}

export function resolveRuleSettings(gameMode: GameMode, rules?: Partial<RuleSettings>): RuleSettings {
  return {
    firstNightNoKill: gameMode === "SafeFirstNight",
    revealEliminatedRole: rules?.revealEliminatedRole ?? false,
    allowDoctorSelfProtect: rules?.allowDoctorSelfProtect ?? true,
    allowDoctorConsecutiveProtectSameTarget: rules?.allowDoctorConsecutiveProtectSameTarget ?? false,
    tiePolicy: rules?.tiePolicy ?? "RevoteThenNoExecution",
    noLynchEnabled: rules?.noLynchEnabled ?? false,
    mayorEnabled: rules?.mayorEnabled ?? false,
    loversEnabled: rules?.loversEnabled ?? false
  };
}

export interface ClientIdentity {
  deviceId: string;
  playerSessionToken?: string;
}

export type BotIntelligence = "random" | "balanced" | "deceptive";

export type BotPersonality =
  | "quiet"
  | "defensive"
  | "accuser"
  | "analyst"
  | "chaotic"
  | "leader";

export interface RoomPlayerView {
  playerId: string;
  nickname: string;
  isAlive: boolean;
  isConnected: boolean;
  isReady?: boolean;
  role?: Role | null;
  isBot?: boolean;
  botIntelligence?: BotIntelligence;
  botPersonality?: BotPersonality;
}

export interface RoomStateSnapshot {
  roomCode: string;
  status: "Lobby" | "InGame" | "GameOver";
  hostPlayerId?: string;
  players: RoomPlayerView[];
  minPlayers: number;
  maxPlayers: number;
  gameMode?: GameMode;
  rolePreset?: RolePresetId;
  rules?: RuleSettings;
  phaseDurations?: PhaseDurationSettings;
}

export interface GameStateSnapshotPublic {
  phase: GamePhase;
  round: number;
  phaseEndsAt: number | null;
  isPaused?: boolean;
  tieCountInRound: number;
  mayorPlayerId?: string | null;
  guardProtectedPlayerId?: string | null;
  lastDayVoteSummary?: DayVoteSummary | null;
  lastEliminationSummary?: EliminationSummary | null;
}

export interface GameStatePrivateDelta {
  role?: Role;
  loverPartnerPlayerId?: string;
  detectiveResult?: "Vampire" | "NotVampire";
  /** Dedektifin bu oyunda daha önce sorguladığı oyuncu kimlikleri (yeniden sorgu yok). */
  detectiveInspectedPlayerIds?: string[];
  doctorLastProtection?: { targetPlayerId: string; round: number } | null;
  vampirePlayerIds?: string[];
  isActionAllowed?: boolean;
  reason?: string;
}

/** Vampir oyunculara özel; VampireVote fazında koordinasyon için (sunucu üretir). */
export interface VampireVotePreviewVote {
  voterPlayerId: string;
  voterName: string;
  targetPlayerId?: string;
  targetName?: string;
  isBot?: boolean;
}

export interface VampireVotePreviewTargetCount {
  targetPlayerId: string;
  targetName: string;
  count: number;
}

export interface VampireVotePreview {
  round: number;
  votes: VampireVotePreviewVote[];
  targetCounts: VampireVotePreviewTargetCount[];
  pendingVoterPlayerIds: string[];
}

export interface DayVoteSummaryEntry {
  playerId: string;
  votes: number;
}

export interface DayVoteSummary {
  entries: DayVoteSummaryEntry[];
  executedPlayerId: string | null;
  tiedTopCandidates: string[];
  revoteCandidateIds?: string[];
  noLynchWon?: boolean;
}

export interface EliminationSummary {
  source: "Night" | "Day";
  playerId: string;
  revealedRole?: Role | null;
}

export type GameResultKind =
  | "night"
  | "day"
  | "mayor"
  | "guard"
  | "tie"
  | "hunter"
  | "gameOver";

export interface GameResultEvent {
  id: string;
  kind: GameResultKind;
  title: string;
  message: string;
  phase: GamePhase;
  round: number;
  playerIds?: string[];
  role?: Role | null;
  winner?: "Vampires" | "Villagers";
  voteBreakdown?: DayVoteSummaryEntry[];
}

export interface GamePrivateResultPayload {
  accepted?: boolean;
  detectiveResult?: "Vampire" | "NotVampire";
  detectiveTargetPlayerId?: string;
  vampireVotePreview?: VampireVotePreview;
}

export interface ActionSubmission {
  roomCode: string;
  actionType: ActionType;
  targetPlayerId?: string;
  phase: GamePhase;
  round: number;
}

export type GameActionAcknowledgement = { accepted: true } | { accepted: false; code: string };

export type BotSpeechTone = "calm" | "sharp" | "neutral" | "playful";

export type BotSpeechIntent =
  | "self_defense"
  | "accuse_soft"
  | "analysis"
  | "chaos"
  | "execution_reaction"
  | "hunter_reaction"
  | "mayor_hint"
  | "small_talk"
  | "support_soft"
  | "tie_reaction"
  | "vote_hint"
  | "generic_observation";

/** Server → all clients in room. Template-only; no LLM. */
export interface BotSpeechEvent {
  roomCode: string;
  /** Stable tag for this phase instance, e.g. `DayDiscussion:2`. */
  phaseId: string;
  speakerPlayerId: string;
  speakerName: string;
  message: string;
  tone: BotSpeechTone;
  intent: BotSpeechIntent;
  targetPlayerId?: string;
  targetName?: string;
  durationMs: number;
  createdAt: number;
}
