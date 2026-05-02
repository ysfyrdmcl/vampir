import {
  ROLE_DEFINITIONS,
  SOCKET_EVENTS,
  buildRoleDeck,
  type ActionType,
  type GamePrivateResultPayload,
  type RolePresetId,
  type RuleSettings
} from "@vampir-koylu/shared";
import { getSocket } from "./client";
import { useGameStore } from "../store/game-store";
import { clearRoomSession, saveLastRoomCode, saveSessionToken } from "../storage/session-storage";
import { testSimulator } from "../sim/test-simulator";
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

function ensureConnected() {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
}

export function initSocketRuntime(): void {
  if (initialized) return;
  initialized = true;

  const socket = getSocket();
  const store = useGameStore;

  socket.on("connect", () => {
    store.getState().setConnectionStatus("connected");
    store.getState().setErrorCode(null);
    logGameEvent("socket.connected", { socketId: socket.id });
  });

  socket.on("disconnect", () => {
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
    }
    const prevPhaseForLog = lastPhase;
    store.getState().setGameState(payload);
    store.getState().setSelectedTargetPlayerId(null);
    if (payload.phase !== "VampireVote") {
      store.getState().setVampireVotePreview([]);
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
            revealedRole: elimination.revealedRole ?? null
          });
        }
      }
    }
    if (payload.phase === "DoctorProtect" || payload.phase === "DetectiveInspect" || payload.phase === "VampireVote" || payload.phase === "GuardProtect") {
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
    if (prevPhaseForLog === "MayorElection" && payload.phase === "DayDiscussion" && payload.mayorPlayerId) {
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

  socket.on(SOCKET_EVENTS.GAME_PRIVATE_ROLE, (payload: { role?: "Vampire" | "Detective" | "Doctor" | "Villager" | "Hunter" | "Guard"; loverPartnerPlayerId?: string }) => {
    if (payload.role) {
      store.getState().setPrivateRole(payload.role);
      logPersonalEvent("game.role.assigned", { role: payload.role });
    }
    if (payload.loverPartnerPlayerId) {
      const roomState = store.getState().roomState;
      const partnerName =
        roomState?.players.find((p) => p.playerId === payload.loverPartnerPlayerId)?.nickname ?? payload.loverPartnerPlayerId;
      const text = `Aşık bağı: ${partnerName}. Bu oyuncu ölürse sen de ölürsün.`;
      store.getState().setPrivateResultText(text);
      logPersonalEvent("game.private_result.lover_link", {
        loverPartnerPlayerId: payload.loverPartnerPlayerId,
        text
      });
    }
  });

  socket.on(SOCKET_EVENTS.GAME_PRIVATE_RESULT, (payload: GamePrivateResultPayload) => {
    if (payload.vampireVotePreview) {
      store.getState().setVampireVotePreview(payload.vampireVotePreview);
      logPersonalEvent("game.private_result.vampire_preview", { count: payload.vampireVotePreview.length });
      logPersonalEvent("personal.vampire.vote_preview", {
        count: payload.vampireVotePreview.length
      });
    }
    if (payload.detectiveResult) {
      const roomState = store.getState().roomState;
      const targetName =
        payload.detectiveTargetPlayerId
          ? roomState?.players.find((p) => p.playerId === payload.detectiveTargetPlayerId)?.nickname ?? payload.detectiveTargetPlayerId
          : "Hedef";
      const text =
        payload.detectiveResult === "Vampire"
          ? `${targetName}: Vampir`
          : `${targetName}: Vampir değil`;
      store.getState().setPrivateResultText(text);
      logPersonalEvent("game.private_result.detective", {
        detectiveResult: payload.detectiveResult,
        detectiveTargetPlayerId: payload.detectiveTargetPlayerId ?? null,
        text
      });
      logPersonalEvent("personal.detective.inspect_result", {
        detectiveResult: payload.detectiveResult,
        detectiveTargetPlayerId: payload.detectiveTargetPlayerId ?? null,
        text
      });
      return;
    }
    if (payload.accepted) {
      store.getState().setPrivateResultText("Aksiyon gonderildi");
      logPersonalEvent("game.private_result.accepted");
    }
  });

  socket.on(SOCKET_EVENTS.GAME_OVER, (payload: { winner: "Vampires" | "Villagers" }) => {
    store.getState().setGameWinner(payload.winner);
    logGameEvent("game.over", { winner: payload.winner });
  });

  socket.on(SOCKET_EVENTS.ERROR_EVENT, (payload: { code: string }) => {
    store.getState().setErrorCode(payload.code);
    logGameEvent("socket.error_event", { code: payload.code });
    if (payload.code === "ROOM_NOT_FOUND") {
      void clearRoomSession();
      store.getState().restoreSession({ playerSessionToken: null, roomCode: null });
    }
  });
}

export function connectSocket(): void {
  const store = useGameStore.getState();
  if (store.testMode) {
    store.setConnectionStatus("connected");
    logGameEvent("test.connection.virtual_connected");
    return;
  }
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
    dayStart: settings.dayStart,
    dayDiscussion: settings.dayDiscussion,
    dayVote: settings.dayVote
  };
}

function buildGameConfigPayload() {
  const state = useGameStore.getState();
  const playerCount = Math.max(state.roomState?.players.length ?? 4, state.roomState?.minPlayers ?? 4);
  return {
    gameMode: state.gameMode,
    rolePreset: state.rolePreset,
    rules: sanitizeRulesForSetup(state.roomRules, playerCount, state.rolePreset)
  };
}

function sanitizeRulesForSetup(rules: RuleSettings, playerCount: number, rolePreset: RolePresetId): RuleSettings {
  const activeRoles = new Set(buildRoleDeck(playerCount, rolePreset));
  const hasDoctor = activeRoles.has("Doctor");
  const hasDetective = activeRoles.has("Detective");
  const hasMayorMechanic = rolePreset === "socialChaos" && playerCount >= ROLE_DEFINITIONS.Mayor.minPlayers;
  const hasLoversMechanic = rolePreset === "socialChaos" && playerCount >= ROLE_DEFINITIONS.Lover.minPlayers;

  return {
    ...rules,
    allowDoctorSelfProtect: hasDoctor ? rules.allowDoctorSelfProtect : true,
    allowDoctorConsecutiveProtectSameTarget: hasDoctor ? rules.allowDoctorConsecutiveProtectSameTarget : false,
    allowDetectiveRepeatInspectSameTarget: hasDetective ? rules.allowDetectiveRepeatInspectSameTarget : false,
    mayorEnabled: hasMayorMechanic ? rules.mayorEnabled : false,
    loversEnabled: hasLoversMechanic ? rules.loversEnabled : false
  };
}

export function emitCreateRoom(nickname: string): void {
  if (useGameStore.getState().testMode) {
    return;
  }
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

export function emitJoinRoom(roomCode: string, nickname: string): void {
  if (useGameStore.getState().testMode) {
    return;
  }
  ensureConnected();
  useGameStore.getState().setNickname(nickname);
  getSocket().emit(SOCKET_EVENTS.ROOM_JOIN, {
    identity: identityPayload(),
    roomCode,
    nickname
  });
  logGameEvent("emit.room_join", { roomCode, nickname });
}

export function emitLeaveRoom(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  if (state.testMode) {
    testSimulator.leave();
    state.resetRoom();
    logGameEvent("emit.room_leave.test_mode");
    return;
  }
  ensureConnected();
  getSocket().emit(SOCKET_EVENTS.ROOM_LEAVE, {
    identity: identityPayload(),
    roomCode: state.roomCode
  });
  void clearRoomSession();
  state.resetRoom();
  logGameEvent("emit.room_leave", { roomCode: state.roomCode });
}

export function emitStartRoom(): void {
  const state = useGameStore.getState();
  if (!state.roomCode) return;
  useLogFeedStore.getState().clear();
  if (state.testMode) {
    testSimulator.startGame();
    logGameEvent("emit.room_start.test_mode");
    return;
  }
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

export function emitReadyToggle(isReady: boolean): void {
  const state = useGameStore.getState();
  if (!state.roomCode || state.testMode) return;
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
  if (state.testMode) {
    testSimulator.submitAction(actionType, targetPlayerId);
    logGameEvent("emit.game_action.test_mode", { actionType, targetPlayerId });
    return;
  }
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
  logPersonalEvent("emit.game_action.personal", {
    actionType,
    targetPlayerId: targetPlayerId ?? null,
    phase: state.gameState.phase,
    round: state.gameState.round
  });
  if (actionType === "doctor-protect") {
    logPersonalEvent("personal.doctor.protect_selected", {
      targetPlayerId: targetPlayerId ?? null,
      round: state.gameState.round
    });
  }
  if (actionType === "vampire-target") {
    logPersonalEvent("personal.vampire.target_selected", {
      targetPlayerId: targetPlayerId ?? null,
      round: state.gameState.round
    });
  }
  if (actionType === "hunter-shot") {
    logPersonalEvent("personal.hunter.shot_selected", {
      targetPlayerId: targetPlayerId ?? null,
      round: state.gameState.round
    });
  }
  if (actionType === "guard-protect") {
    logPersonalEvent("personal.guard.protect_selected", {
      targetPlayerId: targetPlayerId ?? null,
      round: state.gameState.round
    });
  }
}

export function startTestSimulation(nickname: string, totalPlayers: 4 | 6 | 8 | 10 = 4, preferredRole: "random" | "Vampire" | "Detective" | "Doctor" | "Villager" | "Hunter" | "Guard" = "random"): void {
  const safeNickname = nickname.trim();
  useGameStore.getState().setNickname(safeNickname || "Sen");
  testSimulator.startLobby(totalPlayers, preferredRole);
  logGameEvent("test.simulation.start_lobby", { nickname: safeNickname || "Sen", totalPlayers, preferredRole });
}

export function startBatchSimulation(totalPlayers: 4 | 6 | 8 | 10, gameCount: number) {
  const summary = testSimulator.runBatchSimulation({
    totalPlayers,
    gameCount
  });
  logGameEvent("test.simulation.batch.finished", summary as unknown as Record<string, unknown>);
  return summary;
}
