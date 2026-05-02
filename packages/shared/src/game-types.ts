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
  dayStart: number;
  dayDiscussion: number;
  dayVote: number;
}

export interface RuleSettings {
  firstNightNoKill: boolean;
  revealEliminatedRole: boolean;
  allowDoctorSelfProtect: boolean;
  allowDoctorConsecutiveProtectSameTarget: boolean;
  allowDetectiveRepeatInspectSameTarget: boolean;
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
    allowDetectiveRepeatInspectSameTarget: rules?.allowDetectiveRepeatInspectSameTarget ?? false,
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

export interface RoomPlayerView {
  playerId: string;
  nickname: string;
  isAlive: boolean;
  isConnected: boolean;
  isReady?: boolean;
  role?: Role | null;
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
}

export interface GameStateSnapshotPublic {
  phase: GamePhase;
  round: number;
  phaseEndsAt: number | null;
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
  isActionAllowed?: boolean;
  reason?: string;
}

export interface VampireVotePreviewEntry {
  vampirePlayerId: string;
  targetPlayerId: string;
}

export interface DayVoteSummaryEntry {
  playerId: string;
  votes: number;
}

export interface DayVoteSummary {
  entries: DayVoteSummaryEntry[];
  executedPlayerId: string | null;
  tiedTopCandidates: string[];
  noLynchWon?: boolean;
}

export interface EliminationSummary {
  source: "Night" | "Day";
  playerId: string;
  revealedRole?: Role | null;
}

export interface GamePrivateResultPayload {
  accepted?: boolean;
  detectiveResult?: "Vampire" | "NotVampire";
  detectiveTargetPlayerId?: string;
  vampireVotePreview?: VampireVotePreviewEntry[];
}

export interface ActionSubmission {
  roomCode: string;
  actionType: ActionType;
  targetPlayerId?: string;
  phase: GamePhase;
  round: number;
}
