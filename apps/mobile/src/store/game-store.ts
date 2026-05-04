import type {
  BotIntelligence,
  BotSpeechEvent,
  DayVoteSummary,
  GameMode,
  GamePhase,
  GameStateSnapshotPublic,
  Role,
  RolePresetId,
  RoomStateSnapshot,
  RuleSettings,
  VampireVotePreview
} from "@vampir-koylu/shared";
import { create } from "zustand";

const MAX_BOT_SPEECH_QUEUE = 8;
const MAX_BOT_SPEECH_HISTORY = 20;

function botSpeechFingerprint(e: BotSpeechEvent): string {
  return `${e.phaseId}:${e.speakerPlayerId}:${e.message}:${e.createdAt}`;
}

function appendBotSpeechHistory(prev: BotSpeechEvent[], event: BotSpeechEvent): BotSpeechEvent[] {
  const fp = botSpeechFingerprint(event);
  if (prev.some((h) => botSpeechFingerprint(h) === fp)) return prev;
  return [event, ...prev].slice(0, MAX_BOT_SPEECH_HISTORY);
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

/** Kişisel / gece bilgisi kartı için sınıflandırma (accepted gibi gürültü ayrı). */
export type PrivateResultKind = "detective" | "lover" | "info";

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
  privateResultKind: PrivateResultKind | null;
  vampireVotePreview: VampireVotePreview | null;
  lastDayVoteSummary: DayVoteSummary | null;
  gameWinner: "Vampires" | "Villagers" | null;
  phaseDurations: PhaseDurationSettings;
  gameMode: GameMode;
  rolePreset: RolePresetId;
  roomRules: RuleSettings;
  /** Dedektif: bu oyunda sorgulanmış hedefler (sunucu `game:private-role` ile senkron). */
  detectiveInspectedPlayerIds: string[];
  selectedTargetPlayerId: string | null;
  botIntelligence: BotIntelligence;
  /** Tek aktif popup + bekleyen söylentiler (BOT-F; server üretir). */
  activeBotSpeech: BotSpeechEvent | null;
  botSpeechQueue: BotSpeechEvent[];
  /** Son bot konuşmaları (tekrar okuma; kalıcı chat değil). */
  botSpeechHistory: BotSpeechEvent[];
  /** Geçmiş paneli açılmadan eklenen yeni söylenti sayısı (collector rozeti). */
  botSpeechUnreadCount: number;
  setBotIntelligence: (intelligence: BotIntelligence) => void;
  pushBotSpeech: (event: BotSpeechEvent) => void;
  dismissActiveBotSpeech: () => void;
  clearBotSpeech: () => void;
  clearBotSpeechHistory: () => void;
  markBotSpeechInboxRead: () => void;
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
  setDetectiveInspectedPlayerIds: (ids: string[]) => void;
  setLoverPartnerPlayerId: (playerId: string | null) => void;
  setPrivateResultText: (value: string | null, kind?: PrivateResultKind | null) => void;
  setVampireVotePreview: (preview: VampireVotePreview | null) => void;
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
  privateResultKind: null,
  vampireVotePreview: null,
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
    tiePolicy: "RevoteThenNoExecution",
    noLynchEnabled: false,
    mayorEnabled: false,
    loversEnabled: false
  },
  detectiveInspectedPlayerIds: [],
  selectedTargetPlayerId: null,
  botIntelligence: "balanced",
  activeBotSpeech: null,
  botSpeechQueue: [],
  botSpeechHistory: [],
  botSpeechUnreadCount: 0,
  setBotIntelligence: (botIntelligence) => set({ botIntelligence }),
  markBotSpeechInboxRead: () => set({ botSpeechUnreadCount: 0 }),
  pushBotSpeech: (event) =>
    set((state) => {
      if (state.roomCode && event.roomCode !== state.roomCode) return {};
      if (state.roomState?.status !== "InGame") return {};
      const gs = state.gameState;
      if (!gs) return {};
      const currentPhaseId = `${gs.phase}:${gs.round}`;
      if (event.phaseId !== currentPhaseId) return {};

      const fp = botSpeechFingerprint(event);
      if (state.activeBotSpeech && botSpeechFingerprint(state.activeBotSpeech) === fp) return {};
      if (state.botSpeechQueue.some((q) => botSpeechFingerprint(q) === fp)) return {};

      const nextHistory = appendBotSpeechHistory(state.botSpeechHistory, event);
      const historyGrew = nextHistory.length > state.botSpeechHistory.length;
      const unreadDelta = historyGrew ? 1 : 0;

      if (!state.activeBotSpeech) {
        return {
          activeBotSpeech: event,
          botSpeechHistory: nextHistory,
          botSpeechUnreadCount: state.botSpeechUnreadCount + unreadDelta
        };
      }
      let nextQueue = [...state.botSpeechQueue, event];
      while (nextQueue.length > MAX_BOT_SPEECH_QUEUE) {
        nextQueue.shift();
      }
      return {
        botSpeechQueue: nextQueue,
        botSpeechHistory: nextHistory,
        botSpeechUnreadCount: state.botSpeechUnreadCount + unreadDelta
      };
    }),
  dismissActiveBotSpeech: () =>
    set((state) => {
      const [head, ...rest] = state.botSpeechQueue;
      return {
        activeBotSpeech: head ?? null,
        botSpeechQueue: rest
      };
    }),
  clearBotSpeech: () => set({ activeBotSpeech: null, botSpeechQueue: [] }),
  clearBotSpeechHistory: () => set({ botSpeechHistory: [], botSpeechUnreadCount: 0 }),
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
    set((state) => {
      const prevStatus = state.roomState?.status;
      const entersLobby = roomState.status === "Lobby";
      const clearSpeechHistory =
        entersLobby && (prevStatus === "InGame" || prevStatus === "GameOver");
      const clearLobbyResetPrivate =
        entersLobby && (prevStatus === "InGame" || prevStatus === "GameOver");
      const base = {
        roomState,
        roomCode: roomState.roomCode,
        gameMode: roomState.gameMode ?? state.gameMode,
        rolePreset: roomState.rolePreset ?? state.rolePreset,
        roomRules: roomState.rules ?? state.roomRules,
        ...(clearSpeechHistory
          ? { botSpeechHistory: [] as BotSpeechEvent[], botSpeechUnreadCount: 0 }
          : {}),
        ...(clearLobbyResetPrivate
          ? {
              privateRole: null,
              loverPartnerPlayerId: null,
              privateResultText: null,
              privateResultKind: null,
              gameWinner: null,
              vampireVotePreview: null,
              detectiveInspectedPlayerIds: [],
              selectedTargetPlayerId: null,
              errorCode: null
            }
          : {})
      };
      if (roomState.status !== "InGame") {
        return { ...base, activeBotSpeech: null, botSpeechQueue: [], botSpeechUnreadCount: 0 };
      }
      return base;
    }),
  setGameState: (gameState) =>
    set((state) => {
      const prev = state.gameState;
      const newRound = prev != null && gameState.round > prev.round;
      const clearDetectiveBanner = newRound && state.privateResultKind === "detective";
      return {
        gameState,
        lastDayVoteSummary: gameState.lastDayVoteSummary ?? null,
        ...(clearDetectiveBanner ? { privateResultText: null, privateResultKind: null } : {})
      };
    }),
  setPrivateRole: (role) => set({ privateRole: role }),
  setDetectiveInspectedPlayerIds: (detectiveInspectedPlayerIds) => set({ detectiveInspectedPlayerIds }),
  setLoverPartnerPlayerId: (loverPartnerPlayerId) => set({ loverPartnerPlayerId }),
  setPrivateResultText: (privateResultText, kind) =>
    set({
      privateResultText,
      privateResultKind: privateResultText ? (kind ?? null) : null
    }),
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
      errorCode: null,
      playerSessionToken: null,
      playerId: null,
      roomCode: null,
      roomState: null,
      gameState: null,
      privateRole: null,
      loverPartnerPlayerId: null,
      privateResultText: null,
      privateResultKind: null,
      vampireVotePreview: null,
      detectiveInspectedPlayerIds: [],
      lastDayVoteSummary: null,
      gameWinner: null,
      selectedTargetPlayerId: null,
      activeBotSpeech: null,
      botSpeechQueue: [],
      botSpeechHistory: [],
      botSpeechUnreadCount: 0
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
