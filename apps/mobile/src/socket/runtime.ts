import {
  ROLE_DEFINITIONS,
  SOCKET_EVENTS,
  buildRoleDeck,
  resolveRuleSettings,
  type ActionType,
  type BotIntelligence,
  type BotSpeechEvent,
  type GamePrivateResultPayload,
  type GameResultEvent,
  type RolePresetId,
  type RuleSettings
} from "@vampir-koylu/shared";
import { navigationRef } from "../app/navigation/navigation-ref";
import { getSocket } from "./client";
import { useGameStore } from "../store/game-store";
import { clearRoomSession, saveLastRoomCode, saveSessionToken } from "../storage/session-storage";
import { socketErrorAllowedForRoute } from "../ui/error-text";
import { showToast } from "../ui/toast-store";
import { logGameEvent, logPersonalEvent } from "../logging/game-logger";
import { useLogFeedStore } from "../logging/log-feed-store";

let initialized = false;
let lastPhase: string | null = null;
let lastKnownAlive = new Map<string, boolean>();
let lastNoDeathRoundLogged: number | null = null;
let lastVoteStartRoundLogged: number | null = null;
let lastMayorVoteStartRoundLogged: number | null = null;
let lastVoteTieRoundLogged: number | null = null;
let lastExecutionRoundLogged: number | null = null;
let lastEliminationKeyLogged: string | null = null;
let lastVampireVotePreviewLogKey: string | null = null;
let pendingReadyResync = false;
/** After a real disconnect, reconnect should re-emit join; first cold `connect` must not duplicate bootstrap join. */
let joinAfterNextSocketConnect = false;
/** Last emit path for ROOM_NOT_FOUND handling (manual join vs silent restore). */
export type JoinEmitIntent = "manual" | "bootstrap" | "resync";
let lastJoinEmitIntent: JoinEmitIntent = "manual";
let roomConfigEmitTimer: ReturnType<typeof setTimeout> | null = null;

const SOCKET_ERROR_DEDUP_MS = 2800;
let lastSocketErrorDedup: { code: string; at: number } | null = null;

function shouldDebounceDuplicateSocketError(code: string): boolean {
  const now = Date.now();
  if (lastSocketErrorDedup && lastSocketErrorDedup.code === code && now - lastSocketErrorDedup.at < SOCKET_ERROR_DEDUP_MS) {
    return true;
  }
  lastSocketErrorDedup = { code, at: now };
  return false;
}

function resetSocketErrorDedup(): void {
  lastSocketErrorDedup = null;
}

function markJoinEmitIntent(intent: JoinEmitIntent): void {
  lastJoinEmitIntent = intent;
}

function ensureConnected() {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
}

function resyncRoomAfterReconnect(): void {
  const state = useGameStore.getState();
  if (!state.deviceId || !state.roomCode || !state.playerSessionToken) return;
  const me = state.roomState?.players.find((player) => player.playerId === state.playerId);
  pendingReadyResync = Boolean(state.roomState?.status === "Lobby" && me?.isReady);
  markJoinEmitIntent("resync");
  getSocket().emit(SOCKET_EVENTS.ROOM_JOIN, {
    identity: identityPayload(),
    roomCode: state.roomCode,
    nickname: state.nickname || me?.nickname || "Oyuncu"
  });
  logGameEvent("emit.room_rejoin_silent", {
    roomCode: state.roomCode,
    restoreReady: pendingReadyResync
  });
}

export function initSocketRuntime(): void {
  if (initialized) return;
  initialized = true;

  const socket = getSocket();
  const store = useGameStore;

  socket.on("connect", () => {
    store.getState().setConnectionStatus("connected");
    store.getState().setErrorCode(null);
    if (joinAfterNextSocketConnect) {
      joinAfterNextSocketConnect = false;
      resyncRoomAfterReconnect();
    }
    logGameEvent("socket.connected", { socketId: socket.id });
  });

  socket.on("disconnect", () => {
    joinAfterNextSocketConnect = true;
    store.getState().setConnectionStatus("connecting");
    logGameEvent("socket.disconnected");
  });

  socket.on("connect_error", (error: unknown) => {
    const err = error as { message?: string; description?: unknown; context?: unknown; type?: string } | null;
    store.getState().setConnectionStatus("error");
    store.getState().setErrorCode("SOCKET_CONNECT_ERROR");
    logGameEvent("socket.connect_error", {
      message: err?.message ?? null,
      description: err?.description ?? null,
      context: err?.context ?? null,
      type: err?.type ?? null
    });
  });

  socket.on(SOCKET_EVENTS.SERVER_CONNECTED, () => {
    store.getState().setConnectionStatus("connected");
  });

  socket.on(SOCKET_EVENTS.ROOM_JOIN, async (payload: { roomCode: string; playerId: string; playerSessionToken: string }) => {
    lastEmittedRoomConfigKey = null;
    store.getState().setSession({
      playerId: payload.playerId,
      playerSessionToken: payload.playerSessionToken,
      roomCode: payload.roomCode
    });
    await saveSessionToken(payload.playerSessionToken);
    await saveLastRoomCode(payload.roomCode);
    logGameEvent("room.joined", {
      roomCode: payload.roomCode,
      playerId: payload.playerId
    });
    if (pendingReadyResync) {
      pendingReadyResync = false;
      emitReadyToggle(true);
    }
  });

  socket.on(SOCKET_EVENTS.ROOM_STATE, (payload) => {
    const prevAliveMap = lastKnownAlive;
    const newlyDead: string[] = [];
    for (const player of payload.players) {
      const prevAlive = prevAliveMap.get(player.playerId);
      if (prevAlive === true && player.isAlive === false) {
        newlyDead.push(player.nickname);
      }
    }

    store.getState().setRoomState(payload);
    if (payload.status === "Lobby") {
      lastEmittedRoomConfigKey = computeRoomConfigEmitKey();
    }
    logGameEvent("room.state", {
      roomCode: payload.roomCode,
      status: payload.status,
      playerCount: payload.players.length,
      aliveCount: payload.players.filter((p: { isAlive: boolean }) => p.isAlive).length
    });

    if (newlyDead.length) {
      logGameEvent("summary.players_eliminated", {
        count: newlyDead.length,
        players: newlyDead
      });
      if (newlyDead.length > 1) {
        logGameEvent("summary.chain_elimination", {
          count: newlyDead.length,
          players: newlyDead
        });
      }
    } else {
      const phase = store.getState().gameState?.phase;
      const round = store.getState().gameState?.round ?? null;
      if (phase === "DayStart" && round && lastNoDeathRoundLogged !== round) {
        lastNoDeathRoundLogged = round;
        logGameEvent("summary.night_no_elimination", { round });
      }
    }

    const nextAlive = new Map<string, boolean>();
    for (const player of payload.players) {
      nextAlive.set(player.playerId, player.isAlive);
    }
    lastKnownAlive = nextAlive;
  });

  socket.on(SOCKET_EVENTS.GAME_PHASE, (payload) => {
    if (payload.phase === "RoleReveal" && payload.round === 1) {
      lastVoteStartRoundLogged = null;
      lastMayorVoteStartRoundLogged = null;
      lastVoteTieRoundLogged = null;
      lastExecutionRoundLogged = null;
      lastEliminationKeyLogged = null;
      lastVampireVotePreviewLogKey = null;
      store.getState().clearBotSpeechHistory();
    }
    const prevPhaseForLog = lastPhase;
    store.getState().clearBotSpeech();
    store.getState().setErrorCode(null);
    store.getState().setGameState(payload);
    store.getState().setSelectedTargetPlayerId(null);
    if (payload.phase !== "VampireVote") {
      store.getState().setVampireVotePreview(null);
    }
    const secondsLeft = payload.phaseEndsAt ? Math.max(0, Math.ceil((payload.phaseEndsAt - Date.now()) / 1000)) : null;
    logGameEvent("game.phase", {
      prevPhase: lastPhase,
      phase: payload.phase,
      round: payload.round,
      tieCountInRound: payload.tieCountInRound,
      secondsLeft
    });
    if (payload.phase === "NightStart") {
      logGameEvent("phase.night_started", { round: payload.round });
    }
    if (payload.phase === "DayStart") {
      logGameEvent("phase.day_started", { round: payload.round });
    }
    if (payload.phase === "DayVote" && lastVoteStartRoundLogged !== payload.round) {
      lastVoteStartRoundLogged = payload.round;
      logGameEvent("vote.started", { round: payload.round });
    }
    if (payload.phase === "MayorElection" && lastMayorVoteStartRoundLogged !== payload.round) {
      lastMayorVoteStartRoundLogged = payload.round;
      logGameEvent("vote.mayor_started", { round: payload.round });
    }
    if (payload.phase === "DayDiscussion" && payload.tieCountInRound > 0 && lastVoteTieRoundLogged !== payload.round) {
      lastVoteTieRoundLogged = payload.round;
      const tiedTopCandidates = payload.lastDayVoteSummary?.tiedTopCandidates ?? [];
      logGameEvent("vote.tie", {
        round: payload.round,
        tiedTopCandidates
      });
      logGameEvent("vote.revote_started", {
        round: payload.round,
        tiedTopCandidates
      });
    }
    if (payload.phase === "ExecutionResolve" && payload.lastDayVoteSummary?.executedPlayerId && lastExecutionRoundLogged !== payload.round) {
      lastExecutionRoundLogged = payload.round;
      logGameEvent("vote.execution", {
        round: payload.round,
        executedPlayerId: payload.lastDayVoteSummary.executedPlayerId
      });
    }
    if (payload.phase === "ExecutionResolve" || payload.phase === "DayStart" || payload.phase === "WinCheck") {
      const elimination = payload.lastEliminationSummary;
      if (elimination) {
        const key = `${payload.round}:${elimination.source}:${elimination.playerId}`;
        if (lastEliminationKeyLogged !== key) {
          lastEliminationKeyLogged = key;
          logGameEvent("summary.elimination", {
            round: payload.round,
            source: elimination.source,
            playerId: elimination.playerId,
            revealedRole: elimination.revealedRole ?? null,
            cause:
              prevPhaseForLog === "HunterLastBreath"
                ? "hunter"
                : payload.phase === "ExecutionResolve"
                  ? "day_vote"
                  : elimination.source === "Night"
                    ? "night"
                    : "day"
          });
        }
      }
    }
    if (
      payload.phase === "DoctorProtect" ||
      payload.phase === "DetectiveInspect" ||
      payload.phase === "VampireVote" ||
      payload.phase === "GuardProtect" ||
      payload.phase === "DayVote" ||
      payload.phase === "MayorElection"
    ) {
      logPersonalEvent("game.phase.personal_turn_info", {
        phase: payload.phase,
        round: payload.round
      });
    }
    if (payload.phase === "HunterLastBreath") {
      logGameEvent("role.hunter.triggered", {
        round: payload.round
      });
    }
    if (prevPhaseForLog === "MayorElection" && (payload.phase === "GuardProtect" || payload.phase === "DayDiscussion") && payload.mayorPlayerId) {
      logGameEvent("role.mayor.selected", {
        round: payload.round,
        mayorPlayerId: payload.mayorPlayerId
      });
    }
    if (prevPhaseForLog === "GuardProtect" && payload.phase === "DayDiscussion" && payload.guardProtectedPlayerId) {
      logGameEvent("role.guard.protect", {
        round: payload.round,
        protectedPlayerId: payload.guardProtectedPlayerId
      });
    }
    if (prevPhaseForLog === "HunterLastBreath" && payload.phase === "WinCheck") {
      const latest = payload.lastEliminationSummary;
      if (latest?.source === "Day") {
        logGameEvent("role.hunter.shot", {
          round: payload.round,
          targetPlayerId: latest.playerId
        });
      }
    }
    lastPhase = payload.phase;
  });

  socket.on(SOCKET_EVENTS.GAME_BOT_SPEECH, (payload: BotSpeechEvent) => {
    store.getState().pushBotSpeech(payload);
    logGameEvent("game.bot.speech", {
      speakerPlayerId: payload.speakerPlayerId,
      speakerName: payload.speakerName,
      intent: payload.intent,
      phaseId: payload.phaseId
    });
  });

  socket.on(SOCKET_EVENTS.GAME_RESULT, (payload: GameResultEvent) => {
    store.getState().pushResultEvent(payload);
    logGameEvent("game.result", {
      id: payload.id,
      kind: payload.kind,
      phase: payload.phase,
      round: payload.round
    });
  });

  socket.on(
    SOCKET_EVENTS.GAME_PRIVATE_ROLE,
    (payload: {
      role?: "Vampire" | "Detective" | "Doctor" | "Villager" | "Hunter" | "Guard";
      loverPartnerPlayerId?: string;
      detectiveInspectedPlayerIds?: string[];
      vampirePlayerIds?: string[];
    }) => {
    if (payload.role) {
      store.getState().setPrivateRole(payload.role);
      logPersonalEvent("game.role.assigned", { role: payload.role });
    }
    if (payload.detectiveInspectedPlayerIds) {
      store.getState().setDetectiveInspectedPlayerIds(payload.detectiveInspectedPlayerIds);
    }
    if (payload.vampirePlayerIds) {
      store.getState().setKnownVampirePlayerIds(payload.vampirePlayerIds);
    }
    if (payload.loverPartnerPlayerId) {
      store.getState().setLoverPartnerPlayerId(payload.loverPartnerPlayerId);
      const roomState = store.getState().roomState;
      const partnerName =
        roomState?.players.find((p) => p.playerId === payload.loverPartnerPlayerId)?.nickname ?? payload.loverPartnerPlayerId;
      const text = `Aşık bağı: ${partnerName}. Bu oyuncu ölürse sen de ölürsün.`;
      store.getState().setPrivateResultText(text, "lover");
      logPersonalEvent("game.private_result.lover_link", {
        loverPartnerPlayerId: payload.loverPartnerPlayerId,
        text
      });
    }
  });

  socket.on(SOCKET_EVENTS.GAME_PRIVATE_RESULT, (payload: GamePrivateResultPayload) => {
    if (payload.vampireVotePreview) {
      store.getState().setVampireVotePreview(payload.vampireVotePreview);
      const v = payload.vampireVotePreview;
      const previewLogKey = JSON.stringify({
        round: v.round,
        votes: v.votes.map((vote) => [vote.voterPlayerId, vote.targetPlayerId ?? null]),
        pending: v.pendingVoterPlayerIds
      });
      if (previewLogKey !== lastVampireVotePreviewLogKey) {
        lastVampireVotePreviewLogKey = previewLogKey;
        const pendingNames = v.votes
          .filter((vote) => !vote.targetPlayerId)
          .map((vote) => vote.voterName);
        const voteLines = v.votes.map((vote) => `${vote.voterName}${vote.isBot ? " (bot)" : ""} → ${vote.targetName ?? "bekliyor"}`);
        const leadingText = v.targetCounts.length
          ? v.targetCounts.map((target) => `${target.targetName}: ${target.count}`).join(", ")
          : "henüz hedef yok";
        const text = `Vampir oyları: ${voteLines.join("; ")}. Önde: ${leadingText}.${pendingNames.length ? ` Bekleyen: ${pendingNames.join(", ")}.` : ""}`;
        logPersonalEvent("personal.vampire.vote_preview", {
          round: v.round,
          text
        });
      }
    }
    if (payload.detectiveResult) {
      const roomState = store.getState().roomState;
      const tid = payload.detectiveTargetPlayerId;
      if (tid) {
        const prev = store.getState().detectiveInspectedPlayerIds;
        if (!prev.includes(tid)) {
          store.getState().setDetectiveInspectedPlayerIds([...prev, tid]);
        }
      }
      const targetName =
        tid
          ? roomState?.players.find((p) => p.playerId === tid)?.nickname ?? tid
          : "Hedef";
      const text =
        payload.detectiveResult === "Vampire"
          ? `${targetName}: Vampir`
          : `${targetName}: Vampir değil`;
      store.getState().setPrivateResultText(text, "detective");
      logPersonalEvent("personal.detective.inspect_result", {
        detectiveResult: payload.detectiveResult,
        detectiveTargetPlayerId: payload.detectiveTargetPlayerId ?? null,
        targetName,
        text
      });
      return;
    }
    if (payload.accepted) {
      logPersonalEvent("game.private_result.accepted", { accepted: true });
    }
  });

  socket.on(SOCKET_EVENTS.GAME_OVER, (payload: { winner: "Vampires" | "Villagers" }) => {
    store.getState().setGameWinner(payload.winner);
    store.getState().setErrorCode(null);
    store.getState().clearBotSpeech();
    logGameEvent("game.over", { winner: payload.winner });
  });

  socket.on(SOCKET_EVENTS.ERROR_EVENT, (payload: { code: string }) => {
    if (payload.code === "ROOM_NOT_FOUND") {
      const intent = lastJoinEmitIntent;
      lastJoinEmitIntent = "manual";
      void clearRoomSession();
      store.getState().restoreSession({ playerSessionToken: null, roomCode: null });
      if (intent === "manual") {
        const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
        if (!route || !socketErrorAllowedForRoute("ROOM_NOT_FOUND", route)) {
          logGameEvent("socket.error_event.suppressed", { code: payload.code, route, joinIntent: intent });
          return;
        }
        if (shouldDebounceDuplicateSocketError("ROOM_NOT_FOUND")) {
          logGameEvent("socket.error_event.debounced", { code: payload.code, joinIntent: intent });
          return;
        }
        logGameEvent("socket.error_event", { code: payload.code, joinIntent: intent });
        store.getState().setErrorCode("ROOM_NOT_FOUND");
        return;
      }
      /** bootstrap | resync: kalıcı oda zaten temizlendi; toast / genel log spam yok. */
      resetSocketErrorDedup();
      store.getState().setErrorCode(null);
      store.getState().clearBotSpeechHistory();
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: "Welcome" }] });
      }
      return;
    }
    const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
    if (!route) {
      logGameEvent("socket.error_event.suppressed", { code: payload.code, reason: "no_route", joinIntent: lastJoinEmitIntent });
      lastJoinEmitIntent = "manual";
      return;
    }
    if (!socketErrorAllowedForRoute(payload.code, route)) {
      logGameEvent("socket.error_event.suppressed", { code: payload.code, route, joinIntent: lastJoinEmitIntent });
      lastJoinEmitIntent = "manual";
      return;
    }
    if (shouldDebounceDuplicateSocketError(payload.code)) {
      logGameEvent("socket.error_event.debounced", { code: payload.code, route, joinIntent: lastJoinEmitIntent });
      lastJoinEmitIntent = "manual";
      return;
    }
    logGameEvent("socket.error_event", { code: payload.code, joinIntent: lastJoinEmitIntent });
    lastJoinEmitIntent = "manual";
    store.getState().setErrorCode(payload.code);
  });
}

export function connectSocket(): void {
  const store = useGameStore.getState();
  store.setConnectionStatus("connecting");
  ensureConnected();
}

function identityPayload() {
  const state = useGameStore.getState();
  if (!state.deviceId) {
    throw new Error("DEVICE_ID_MISSING");
  }
  return {
    deviceId: state.deviceId,
    playerSessionToken: state.playerSessionToken ?? undefined
  };
}

function buildPhaseDurationsPayload() {
  const settings = useGameStore.getState().phaseDurations;
  if (settings.useSystemDefaults) {
    return undefined;
  }
  return {
    roleReveal: settings.roleReveal,
    nightStart: settings.nightStart,
    vampireVote: settings.vampireVote,
    detectiveInspect: settings.detectiveInspect,
    doctorProtect: settings.doctorProtect,
    nightResolve: settings.nightResolve,
    dayStart: settings.dayStart,
    mayorElection: settings.mayorElection,
    guardProtect: settings.guardProtect,
    dayDiscussion: settings.dayDiscussion,
    dayVote: settings.dayVote,
    executionResolve: settings.executionResolve,
    hunterLastBreath: settings.hunterLastBreath,
    winCheck: settings.winCheck
  };
}

function buildGameConfigPayload() {
  const state = useGameStore.getState();
  const playerCount = Math.max(state.roomState?.players.length ?? 4, state.roomState?.minPlayers ?? 4);
  const sanitizedRules = sanitizeRulesForSetup(state.roomRules, playerCount, state.rolePreset);
  return {
    gameMode: state.gameMode,
    rolePreset: state.rolePreset,
    rules: resolveRuleSettings(state.gameMode, sanitizedRules)
  };
}

function sanitizeRulesForSetup(rules: RuleSettings, playerCount: number, rolePreset: RolePresetId): RuleSettings {
  const activeRoles = new Set(buildRoleDeck(playerCount, rolePreset));
  const hasDoctor = activeRoles.has("Doctor");
  const hasMayorMechanic = rolePreset === "socialChaos" && playerCount >= ROLE_DEFINITIONS.Mayor.minPlayers;
  const hasLoversMechanic = rolePreset === "socialChaos" && playerCount >= ROLE_DEFINITIONS.Lover.minPlayers;

  return {
    ...rules,
    allowDoctorSelfProtect: hasDoctor ? rules.allowDoctorSelfProtect : true,
    allowDoctorConsecutiveProtectSameTarget: hasDoctor ? rules.allowDoctorConsecutiveProtectSameTarget : false,
    mayorEnabled: hasMayorMechanic ? rules.mayorEnabled : false,
    loversEnabled: hasLoversMechanic ? rules.loversEnabled : false
  };
}

/** Aynı oda ayarı tekrar tekrar sunucuya gitmesin (ROOM_STATE ile baseline senkron). */
let lastEmittedRoomConfigKey: string | null = null;

function computeRoomConfigEmitKey(): string | null {
  const s = useGameStore.getState();
  if (!s.roomCode) return null;
  const phaseDurations = buildPhaseDurationsPayload();
  const config = buildGameConfigPayload();
  return JSON.stringify({
    rolePreset: config.rolePreset,
    gameMode: config.gameMode,
    customDurations: Boolean(phaseDurations),
    phaseDurations: phaseDurations ?? null,
    rules: config.rules
  });
}

export function emitCreateRoom(nickname: string): void {
  ensureConnected();
  useGameStore.getState().setNickname(nickname);
  const phaseDurations = buildPhaseDurationsPayload();
  const config = buildGameConfigPayload();
  getSocket().emit(SOCKET_EVENTS.ROOM_CREATE, {
    identity: identityPayload(),
    nickname,
    phaseDurations,
    gameMode: config.gameMode,
    rolePreset: config.rolePreset,
    rules: config.rules
  });
  logGameEvent("emit.room_create", {
    nickname,
    rolePreset: config.rolePreset,
    customDurations: Boolean(phaseDurations),
    phaseDurations: phaseDurations ?? null
  });
}

export function emitJoinRoom(roomCode: string, nickname: string, intent: JoinEmitIntent = "manual"): void {
  ensureConnected();
  useGameStore.getState().setNickname(nickname);
  markJoinEmitIntent(intent);
  getSocket().emit(SOCKET_EVENTS.ROOM_JOIN, {
    identity: identityPayload(),
    roomCode,
    nickname
  });
  logGameEvent("emit.room_join", { roomCode, nickname, intent });
}

export function emitLeaveRoom(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  resetSocketErrorDedup();
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.ROOM_LEAVE, {
    identity: identityPayload(),
    roomCode: state.roomCode
  });
  void clearRoomSession();
  state.resetRoom();
  logGameEvent("emit.room_leave", { roomCode: state.roomCode });
}

export function emitResetRoomToLobby(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  if (state.roomState?.status !== "GameOver") {
    logGameEvent("emit.room_reset_to_lobby.skipped", {
      roomCode: state.roomCode,
      status: state.roomState?.status ?? null
    });
    return;
  }
  ensureConnected();
  state.setErrorCode(null);
  getSocket().emit(SOCKET_EVENTS.ROOM_RESET_TO_LOBBY, {
    identity: identityPayload(),
    roomCode: state.roomCode
  });
  logGameEvent("emit.room_reset_to_lobby", { roomCode: state.roomCode });
}

export function emitStartRoom(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  if (state.roomState?.status !== "Lobby") {
    logGameEvent("emit.room_start.skipped", {
      roomCode: state.roomCode,
      status: state.roomState?.status ?? null
    });
    return;
  }
  useLogFeedStore.getState().clear();
  ensureConnected();
  const phaseDurations = buildPhaseDurationsPayload();
  const config = buildGameConfigPayload();
  getSocket().emit(SOCKET_EVENTS.ROOM_START, {
    identity: identityPayload(),
    roomCode: state.roomCode,
    phaseDurations,
    gameMode: config.gameMode,
    rolePreset: config.rolePreset,
    rules: config.rules
  });
  logGameEvent("emit.room_start", {
    roomCode: state.roomCode,
    rolePreset: config.rolePreset,
    customDurations: Boolean(phaseDurations),
    phaseDurations: phaseDurations ?? null
  });
}

export function emitRoomConfigUpdate(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  if (roomConfigEmitTimer) {
    clearTimeout(roomConfigEmitTimer);
  }
  roomConfigEmitTimer = setTimeout(() => {
    roomConfigEmitTimer = null;
    const s = useGameStore.getState();
    if (!s.roomCode) return;
    const phaseDurations = buildPhaseDurationsPayload();
    const config = buildGameConfigPayload();
    const dedupeKey = computeRoomConfigEmitKey();
    if (dedupeKey !== null && dedupeKey === lastEmittedRoomConfigKey) {
      return;
    }
    getSocket().emit(SOCKET_EVENTS.ROOM_CONFIG_UPDATE, {
      identity: identityPayload(),
      roomCode: s.roomCode,
      phaseDurations,
      gameMode: config.gameMode,
      rolePreset: config.rolePreset,
      rules: config.rules
    });
    lastEmittedRoomConfigKey = dedupeKey;
    logGameEvent("emit.room_config_update", {
      roomCode: s.roomCode,
      rolePreset: config.rolePreset,
      gameMode: config.gameMode,
      customDurations: Boolean(phaseDurations)
    });
  }, 450);
}

export function emitGamePause(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.GAME_PAUSE, {
    identity: identityPayload(),
    roomCode: state.roomCode
  });
  logGameEvent("emit.game_pause", { roomCode: state.roomCode });
}

export function emitGameResume(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.GAME_RESUME, {
    identity: identityPayload(),
    roomCode: state.roomCode
  });
  logGameEvent("emit.game_resume", { roomCode: state.roomCode });
}

export function emitGamePhaseAdvance(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.GAME_PHASE_ADVANCE, {
    identity: identityPayload(),
    roomCode: state.roomCode
  });
  logGameEvent("emit.game_phase_advance", {
    roomCode: state.roomCode,
    phase: state.gameState?.phase ?? null,
    round: state.gameState?.round ?? null
  });
}

export function emitReadyToggle(isReady: boolean): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.ROOM_READY_TOGGLE, {
    identity: identityPayload(),
    roomCode: state.roomCode,
    isReady
  });
  logGameEvent("emit.room_ready_toggle", { roomCode: state.roomCode, isReady });
}

export function emitGameAction(actionType: ActionType, targetPlayerId?: string): void {
  const state = useGameStore.getState();
  if (!state.roomCode || !state.gameState) return;
  if (state.gameState.isPaused) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.GAME_ACTION_SUBMIT, {
    identity: identityPayload(),
    roomCode: state.roomCode,
    actionType,
    targetPlayerId,
    phase: state.gameState.phase,
    round: state.gameState.round
  });
  logGameEvent("emit.game_action", {
    actionType,
    targetPlayerId: targetPlayerId ?? null,
    phase: state.gameState.phase,
    round: state.gameState.round
  });
  const targetName =
    targetPlayerId === "__NO_LYNCH__"
      ? "Kimseyi gönderme"
      : targetPlayerId
        ? state.roomState?.players.find((player) => player.playerId === targetPlayerId)?.nickname ?? targetPlayerId
        : null;
  if (actionType === "doctor-protect") {
    logPersonalEvent("personal.doctor.protect_selected", {
      targetPlayerId: targetPlayerId ?? null,
      targetName,
      round: state.gameState.round
    });
  }
  if (actionType === "vampire-target") {
    logPersonalEvent("personal.vampire.target_selected", {
      targetPlayerId: targetPlayerId ?? null,
      targetName,
      round: state.gameState.round
    });
  }
  if (actionType === "hunter-shot") {
    logPersonalEvent("personal.hunter.shot_selected", {
      targetPlayerId: targetPlayerId ?? null,
      targetName,
      round: state.gameState.round
    });
  }
  if (actionType === "guard-protect") {
    logPersonalEvent("personal.guard.protect_selected", {
      targetPlayerId: targetPlayerId ?? null,
      targetName,
      round: state.gameState.round
    });
  }
}

export function emitAddBot(intelligence: BotIntelligence, count = 1): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.ROOM_BOT_ADD, {
    identity: identityPayload(),
    roomCode: state.roomCode,
    intelligence,
    count
  });
  logGameEvent("emit.room_bot_add", { roomCode: state.roomCode, intelligence, count });
}

export function emitRemoveBot(botPlayerId: string): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.ROOM_BOT_REMOVE, {
    identity: identityPayload(),
    roomCode: state.roomCode,
    botPlayerId
  });
  logGameEvent("emit.room_bot_remove", { roomCode: state.roomCode, botPlayerId });
}

export function emitSetBotIntelligence(botPlayerId: string, intelligence: BotIntelligence): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.ROOM_BOT_SET_INTELLIGENCE, {
    identity: identityPayload(),
    roomCode: state.roomCode,
    botPlayerId,
    intelligence
  });
  logGameEvent("emit.room_bot_set_intelligence", { roomCode: state.roomCode, botPlayerId, intelligence });
}

export function emitFillBotsToMinimum(intelligence: BotIntelligence): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.ROOM_BOT_FILL_MINIMUM, {
    identity: identityPayload(),
    roomCode: state.roomCode,
    intelligence
  });
  logGameEvent("emit.room_bot_fill_minimum", { roomCode: state.roomCode, intelligence });
}
