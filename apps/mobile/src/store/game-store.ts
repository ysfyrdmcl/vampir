import type { DayVoteSummary, GameMode, GamePhase, GameStateSnapshotPublic, Role, RolePresetId, RoomStateSnapshot, RuleSettings, VampireVotePreviewEntry } from "@vampir-koylu/shared";
import { create } from "zustand";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface PhaseDurationSettings {
  useSystemDefaults: boolean;
  roleReveal: number;
  nightStart: number;
  vampireVote: number;
  detectiveInspect: number;
  doctorProtect: number;
  dayStart: number;
  dayDiscussion: number;
  dayVote: number;
}

interface GameStoreState {
  testMode: boolean;
  connectionStatus: ConnectionStatus;
  errorCode: string | null;
  deviceId: string | null;
  playerSessionToken: string | null;
  playerId: string | null;
  nickname: string;
  roomCode: string | null;
  roomState: RoomStateSnapshot | null;
  gameState: GameStateSnapshotPublic | null;
  privateRole: Role | null;
  loverPartnerPlayerId: string | null;
  privateResultText: string | null;
  vampireVotePreview: VampireVotePreviewEntry[];
  lastDayVoteSummary: DayVoteSummary | null;
  gameWinner: "Vampires" | "Villagers" | null;
  phaseDurations: PhaseDurationSettings;
  gameMode: GameMode;
  rolePreset: RolePresetId;
  roomRules: RuleSettings;
  selectedTargetPlayerId: string | null;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setTestMode: (value: boolean) => void;
  setErrorCode: (code: string | null) => void;
  setDeviceId: (deviceId: string) => void;
  setSession: (values: { playerSessionToken: string; playerId: string; roomCode: string }) => void;
  restoreSession: (values: { playerSessionToken: string | null; roomCode: string | null }) => void;
  setNickname: (nickname: string) => void;
  setRoomState: (roomState: RoomStateSnapshot) => void;
  setGameState: (gameState: GameStateSnapshotPublic) => void;
  setPrivateRole: (role: Role | null) => void;
  setLoverPartnerPlayerId: (playerId: string | null) => void;
  setPrivateResultText: (value: string | null) => void;
  setVampireVotePreview: (entries: VampireVotePreviewEntry[]) => void;
  setLastDayVoteSummary: (summary: DayVoteSummary | null) => void;
  setGameWinner: (winner: "Vampires" | "Villagers" | null) => void;
  setSelectedTargetPlayerId: (playerId: string | null) => void;
  setPhaseDurations: (updater: Partial<PhaseDurationSettings>) => void;
  setGameMode: (mode: GameMode) => void;
  setRolePreset: (preset: RolePresetId) => void;
  setRoomRules: (updater: Partial<RuleSettings>) => void;
  resetRoom: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  connectionStatus: "idle",
  testMode: false,
  errorCode: null,
  deviceId: null,
  playerSessionToken: null,
  playerId: null,
  nickname: "",
  roomCode: null,
  roomState: null,
  gameState: null,
  privateRole: null,
  loverPartnerPlayerId: null,
  privateResultText: null,
  vampireVotePreview: [],
  lastDayVoteSummary: null,
  gameWinner: null,
  phaseDurations: {
    useSystemDefaults: true,
    roleReveal: 8,
    nightStart: 4,
    vampireVote: 20,
    detectiveInspect: 20,
    doctorProtect: 20,
    dayStart: 8,
    dayDiscussion: 60,
    dayVote: 30
  },
  gameMode: "Classic",
  rolePreset: "beginner",
  roomRules: {
    firstNightNoKill: false,
    revealEliminatedRole: false,
    allowDoctorSelfProtect: true,
    allowDoctorConsecutiveProtectSameTarget: false,
    allowDetectiveRepeatInspectSameTarget: false,
    tiePolicy: "RevoteThenNoExecution",
    noLynchEnabled: false,
    mayorEnabled: false,
    loversEnabled: false
  },
  selectedTargetPlayerId: null,
  setTestMode: (value) => set({ testMode: value }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setErrorCode: (code) => set({ errorCode: code }),
  setDeviceId: (deviceId) => set({ deviceId }),
  setSession: ({ playerSessionToken, playerId, roomCode }) =>
    set({
      playerSessionToken,
      playerId,
      roomCode
    }),
  restoreSession: ({ playerSessionToken, roomCode }) =>
    set({
      playerSessionToken,
      roomCode
    }),
  setNickname: (nickname) => set({ nickname }),
  setRoomState: (roomState) =>
    set((state) => ({
      roomState,
      roomCode: roomState.roomCode,
      gameMode: roomState.gameMode ?? state.gameMode,
      rolePreset: roomState.rolePreset ?? state.rolePreset,
      roomRules: roomState.rules ?? state.roomRules
    })),
  setGameState: (gameState) =>
    set({
      gameState,
      lastDayVoteSummary: gameState.lastDayVoteSummary ?? null
    }),
  setPrivateRole: (role) => set({ privateRole: role }),
  setLoverPartnerPlayerId: (loverPartnerPlayerId) => set({ loverPartnerPlayerId }),
  setPrivateResultText: (privateResultText) => set({ privateResultText }),
  setVampireVotePreview: (vampireVotePreview) => set({ vampireVotePreview }),
  setLastDayVoteSummary: (lastDayVoteSummary) => set({ lastDayVoteSummary }),
  setGameWinner: (gameWinner) => set({ gameWinner }),
  setSelectedTargetPlayerId: (selectedTargetPlayerId) => set({ selectedTargetPlayerId }),
  setPhaseDurations: (updater) =>
    set((state) => ({
      phaseDurations: {
        ...state.phaseDurations,
        ...updater
      }
    })),
  setGameMode: (gameMode) => set({ gameMode }),
  setRolePreset: (rolePreset) => set({ rolePreset }),
  setRoomRules: (updater) =>
    set((state) => ({
      roomRules: {
        ...state.roomRules,
        ...updater
      }
    })),
  resetRoom: () =>
    set({
      playerSessionToken: null,
      playerId: null,
      roomCode: null,
      roomState: null,
      gameState: null,
      privateRole: null,
      loverPartnerPlayerId: null,
      privateResultText: null,
      vampireVotePreview: [],
      lastDayVoteSummary: null,
      gameWinner: null,
      selectedTargetPlayerId: null
    })
}));

export function getRouteForCurrentPhase(phase: GamePhase | null): "RoleReveal" | "Night" | "Vote" | "GameOver" | "Lobby" {
  if (!phase) return "Night";
  if (phase === "RoleReveal") return "RoleReveal";
  if (phase === "MayorElection") return "Vote";
  if (phase === "DayVote") return "Vote";
  if (phase === "GameOver") return "GameOver";
  return "Night";
}
