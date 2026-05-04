import {
  SOCKET_EVENTS,
  type ActionSubmission,
  type BotSpeechEvent,
  type GamePrivateResultPayload,
  type GameStatePrivateDelta,
  type RoomStateSnapshot
} from "@vampir-koylu/shared";
import type { Server, Socket } from "socket.io";
import { env } from "../config/env.js";
import { GameEngine } from "../game/game-engine.js";
import { RoomManager } from "../rooms/room-manager.js";
import type { RoomState } from "../game/game-types.js";
import { buildVampireVotePreview, vampirePreviewRecipientSocketIds } from "../game/vampire-vote-preview.js";
import { BotActionEngine } from "../bots/bot-action-engine.js";
import { BotMemoryStore } from "../bots/bot-memory.js";
import { BotSpeechEngine } from "../bots/bot-speech-engine.js";

interface RuntimeLogger {
  info(payload: object, message?: string): void;
  warn(payload: object, message?: string): void;
  error(payload: object, message?: string): void;
}

const noopLogger: RuntimeLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};
import {
  actionSubmitSchema,
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  roomConfigSchema,
  readyToggleSchema,
  startRoomSchema,
  gamePauseSchema,
  gameResumeSchema,
  roomBotAddSchema,
  roomBotRemoveSchema,
  roomBotSetIntelligenceSchema,
  roomBotFillMinimumSchema,
  roomResetToLobbySchema
} from "./socket-schema.js";

export class SocketRuntime {
  private readonly roomManager = new RoomManager();
  private readonly gameEngine = new GameEngine();
  private readonly botMemoryStore = new BotMemoryStore();
  private readonly botActionEngine: BotActionEngine;
  private readonly botSpeechEngine: BotSpeechEngine;
  private readonly log: RuntimeLogger;

  constructor(private readonly io: Server, logger: RuntimeLogger = noopLogger) {
    this.log = logger;
    this.botActionEngine = new BotActionEngine({
      getRoom: (roomCode) => this.roomManager.getRoom(roomCode),
      submitGameAction: (room, actorPlayerId, submission) => {
        this.submitGameAction(room, actorPlayerId, submission);
      },
      getBotMemory: (roomCode, botPlayerId) => this.botMemoryStore.get(roomCode, botPlayerId),
      log: logger
    });
    this.botSpeechEngine = new BotSpeechEngine({
      getRoom: (roomCode) => this.roomManager.getRoom(roomCode),
      getBotMemory: (roomCode, botPlayerId) => this.botMemoryStore.get(roomCode, botPlayerId),
      emit: (roomCode, event: BotSpeechEvent) => {
        this.io.to(roomCode).emit(SOCKET_EVENTS.GAME_BOT_SPEECH, event);
      },
      onSpeechCommitted: (roomCode, botPlayerId, intent, targetPlayerId) => {
        this.botMemoryStore.onBotSpeech(roomCode, botPlayerId, intent, targetPlayerId);
      },
      log: logger
    });
  }

  registerConnection(socket: Socket): void {
    socket.emit(SOCKET_EVENTS.SERVER_CONNECTED, { socketId: socket.id });

    socket.on(SOCKET_EVENTS.ROOM_CREATE, (payload) => this.safe(socket, () => this.onCreate(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (payload) => this.safe(socket, () => this.onJoin(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_LEAVE, (payload) => this.safe(socket, () => this.onLeave(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_READY_TOGGLE, (payload) => this.safe(socket, () => this.onReadyToggle(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_CONFIG_UPDATE, (payload) => this.safe(socket, () => this.onConfigUpdate(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_START, (payload) => this.safe(socket, () => this.onStart(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_RESET_TO_LOBBY, (payload) => this.safe(socket, () => this.onResetToLobby(payload)));
    socket.on(SOCKET_EVENTS.GAME_PAUSE, (payload) => this.safe(socket, () => this.onPause(socket, payload)));
    socket.on(SOCKET_EVENTS.GAME_RESUME, (payload) => this.safe(socket, () => this.onResume(socket, payload)));
    socket.on(SOCKET_EVENTS.GAME_ACTION_SUBMIT, (payload) => this.safe(socket, () => this.onAction(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_BOT_ADD, (payload) => this.safe(socket, () => this.onBotAdd(payload)));
    socket.on(SOCKET_EVENTS.ROOM_BOT_REMOVE, (payload) => this.safe(socket, () => this.onBotRemove(payload)));
    socket.on(SOCKET_EVENTS.ROOM_BOT_SET_INTELLIGENCE, (payload) => this.safe(socket, () => this.onBotSetIntelligence(payload)));
    socket.on(SOCKET_EVENTS.ROOM_BOT_FILL_MINIMUM, (payload) => this.safe(socket, () => this.onBotFillMinimum(payload)));

    socket.on("disconnect", () => {
      const room = this.roomManager.removeBySocket(socket.id);
      if (room) {
        this.log.info({ socketId: socket.id, roomCode: room.roomCode }, "socket disconnected");
        this.broadcastRoomState(room);
      } else {
        this.log.info({ socketId: socket.id }, "socket disconnected (no room)");
      }
    });
  }

  tick(): void {
    for (const roomCode of this.roomManager.listRoomCodes()) {
      try {
        this.tickRoom(roomCode);
      } catch (error) {
        this.log.error({ err: error, roomCode }, "tickRoom failed");
      }
    }
    try {
      const removed = this.roomManager.cleanupRooms();
      if (removed.length) {
        for (const code of removed) {
          this.botActionEngine.disposeRoom(code);
          this.botSpeechEngine.disposeRoom(code);
          this.botMemoryStore.clearRoom(code);
        }
        this.log.info({ rooms: removed }, "rooms cleaned up");
      }
    } catch (error) {
      this.log.error({ err: error }, "cleanupRooms failed");
    }
  }

  private tickRoom(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room || room.status !== "InGame") return;
    const tick = this.gameEngine.tick(room);
    if (tick.phaseChanged) {
      for (const pr of tick.privateResults) {
        if (!("detectiveResult" in pr) || !pr.detectiveTargetPlayerId) continue;
        const detective = room.players.find((p) => p.playerId === pr.playerId);
        if (!detective?.isBot) continue;
        this.botMemoryStore.applyDetectivePrivateResult(
          room.roomCode,
          pr.playerId,
          pr.detectiveTargetPlayerId,
          pr.detectiveResult
        );
      }
      this.botMemoryStore.onPhaseAdvanced(room);
      this.botActionEngine.onPhaseAdvanced(room);
      this.botSpeechEngine.onPhaseAdvanced(room);
    }
    if (!tick.phaseChanged) return;
    for (const privateResult of tick.privateResults) {
      const player = room.players.find((p) => p.playerId === privateResult.playerId);
      if (player?.socketId) {
        this.io.to(player.socketId).emit(SOCKET_EVENTS.GAME_PRIVATE_RESULT, privateResult);
      }
    }
    this.broadcastGamePhase(room);
    this.broadcastRoomState(room);
    if (room.game.phase === "GameOver") {
      this.log.info({ roomCode: room.roomCode, winner: room.game.winner, round: room.game.round }, "game over");
      this.io.to(room.roomCode).emit(SOCKET_EVENTS.GAME_OVER, {
        winner: room.game.winner,
        round: room.game.round
      });
    }
  }

  private onCreate(socket: Socket, raw: unknown): void {
    const payload = createRoomSchema.parse(raw);
    const { room, player } = this.roomManager.createRoom(
      payload.nickname,
      payload.identity.deviceId,
      socket.id,
      payload.phaseDurations,
      payload.gameMode,
      payload.rolePreset,
      payload.rules
    );
    socket.join(room.roomCode);
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      roomCode: room.roomCode,
      playerId: player.playerId,
      playerSessionToken: player.sessionToken
    });
    this.log.info({ roomCode: room.roomCode, playerId: player.playerId }, "room created");
    this.broadcastRoomState(room);
  }

  private onJoin(socket: Socket, raw: unknown): void {
    const payload = joinRoomSchema.parse(raw);
    const { room, player, replacedSocketId } = this.roomManager.joinRoom(
      payload.roomCode,
      payload.nickname,
      payload.identity.deviceId,
      socket.id,
      payload.identity.playerSessionToken
    );
    if (replacedSocketId && replacedSocketId !== socket.id) {
      this.log.warn({ roomCode: room.roomCode, playerId: player.playerId, replacedSocketId }, "duplicate device socket replaced");
      this.io.sockets.sockets.get(replacedSocketId)?.disconnect(true);
    } else {
      this.log.info({ roomCode: room.roomCode, playerId: player.playerId, reconnect: Boolean(player.role) }, "room joined");
    }
    socket.join(room.roomCode);
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      roomCode: room.roomCode,
      playerId: player.playerId,
      playerSessionToken: player.sessionToken
    });
    if (player.role) {
      const rolePayload: GameStatePrivateDelta = {
        role: player.role,
        loverPartnerPlayerId: room.game.loverLinks[player.playerId] ?? undefined
      };
      if (player.role === "Detective") {
        rolePayload.detectiveInspectedPlayerIds = room.game.detectiveInspectedTargets[player.playerId] ?? [];
      }
      socket.emit(SOCKET_EVENTS.GAME_PRIVATE_ROLE, rolePayload);
    }
    this.broadcastRoomState(room);
    if (room.status !== "Lobby") {
      this.broadcastGamePhase(room);
    }
  }

  private onLeave(socket: Socket, raw: unknown): void {
    const payload = leaveRoomSchema.parse(raw);
    const room = this.roomManager.leaveRoom(payload.roomCode, payload.identity.deviceId);
    socket.leave(payload.roomCode);
    this.log.info({ roomCode: payload.roomCode, deviceId: payload.identity.deviceId }, "room left");
    this.broadcastRoomState(room);
  }

  private onReadyToggle(_socket: Socket, raw: unknown): void {
    const payload = readyToggleSchema.parse(raw);
    const room = this.roomManager.setPlayerReady(payload.roomCode, payload.identity.deviceId, payload.isReady);
    this.broadcastRoomState(room);
  }

  private onConfigUpdate(_socket: Socket, raw: unknown): void {
    const payload = roomConfigSchema.parse(raw);
    const room = this.roomManager.requireRoom(payload.roomCode);
    this.roomManager.assertHost(room, payload.identity.deviceId);
    const updated = this.roomManager.updateGameConfig(payload.roomCode, {
      phaseDurations: payload.phaseDurations,
      gameMode: payload.gameMode,
      rolePreset: payload.rolePreset,
      rules: payload.rules
    });
    this.broadcastRoomState(updated);
  }

  private onStart(_socket: Socket, raw: unknown): void {
    const payload = startRoomSchema.parse(raw);
    const existingRoom = this.roomManager.requireRoom(payload.roomCode);
    if (existingRoom.status !== "Lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }
    this.roomManager.assertHost(existingRoom, payload.identity.deviceId);
    const room = this.roomManager.updateGameConfig(payload.roomCode, {
      phaseDurations: payload.phaseDurations,
      gameMode: payload.gameMode,
      rolePreset: payload.rolePreset,
      rules: payload.rules,
      resetReadiness: false
    });
    if (!this.roomManager.areAllConnectedPlayersReady(payload.roomCode)) {
      throw new Error("PLAYERS_NOT_READY");
    }
    const privateDeltas = this.gameEngine.startGame(room);
    this.botMemoryStore.resetForNewGame(room.roomCode);
    room.players.forEach((player, index) => {
      if (!player.socketId) return;
      const delta: GameStatePrivateDelta = privateDeltas[index] ?? {};
      this.io.to(player.socketId).emit(SOCKET_EVENTS.GAME_PRIVATE_ROLE, delta);
    });
    this.log.info({ roomCode: room.roomCode, playerCount: room.players.length, gameMode: room.game.gameMode }, "game started");
    this.broadcastRoomState(room);
    this.broadcastGamePhase(room);
  }

  private onResetToLobby(raw: unknown): void {
    const payload = roomResetToLobbySchema.parse(raw);
    const room = this.roomManager.resetToLobbyAfterGameOver(payload.roomCode, payload.identity.deviceId);
    this.botMemoryStore.resetForNewGame(room.roomCode);
    this.botActionEngine.disposeRoom(room.roomCode);
    this.botSpeechEngine.disposeRoom(room.roomCode);
    this.log.info({ roomCode: room.roomCode }, "room reset to lobby after game over");
    this.broadcastRoomState(room);
    this.broadcastGamePhase(room);
  }

  private onAction(socket: Socket, raw: unknown): void {
    const payload = actionSubmitSchema.parse(raw);
    const room = this.roomManager.requireRoom(payload.roomCode);
    const actor = room.players.find((p) => p.deviceId === payload.identity.deviceId);
    if (!actor) {
      throw new Error("PLAYER_NOT_FOUND");
    }
    if (actor.socketId !== socket.id) {
      throw new Error("SOCKET_MISMATCH");
    }
    this.submitGameAction(room, actor.playerId, {
      roomCode: payload.roomCode,
      actionType: payload.actionType,
      targetPlayerId: payload.targetPlayerId,
      phase: payload.phase,
      round: payload.round
    });
    if (payload.actionType === "detective-inspect" && actor.role === "Detective" && actor.socketId) {
      const ids = room.game.detectiveInspectedTargets[actor.playerId] ?? [];
      this.io.to(actor.socketId).emit(SOCKET_EVENTS.GAME_PRIVATE_ROLE, {
        detectiveInspectedPlayerIds: ids
      } satisfies GameStatePrivateDelta);
    }
    socket.emit(SOCKET_EVENTS.GAME_PRIVATE_RESULT, { accepted: true } satisfies GamePrivateResultPayload);
  }

  /** Human and bot submissions both go through here (validator + state updates). */
  private submitGameAction(room: RoomState, actorPlayerId: string, submission: ActionSubmission): void {
    this.gameEngine.submitAction(room, actorPlayerId, submission);
    this.maybeEmitVampireVotePreview(room, submission.actionType);
    const actor = room.players.find((p) => p.playerId === actorPlayerId);
    if (actor?.isBot && submission.targetPlayerId) {
      this.botMemoryStore.onBotActionSubmitted(room.roomCode, actorPlayerId, submission, submission.targetPlayerId);
    }
  }

  private maybeEmitVampireVotePreview(room: RoomState, actionType: ActionSubmission["actionType"]): void {
    if (actionType !== "vampire-target" || room.game.phase !== "VampireVote") return;
    this.emitVampireVotePreviewToVampires(room);
  }

  private emitVampireVotePreviewToVampires(room: RoomState): void {
    const vampireVotePreview = buildVampireVotePreview(room);
    for (const socketId of vampirePreviewRecipientSocketIds(room)) {
      this.io.to(socketId).emit(
        SOCKET_EVENTS.GAME_PRIVATE_RESULT,
        { vampireVotePreview } satisfies GamePrivateResultPayload
      );
    }
  }

  private onPause(_socket: Socket, raw: unknown): void {
    const payload = gamePauseSchema.parse(raw);
    const room = this.roomManager.requireRoom(payload.roomCode);
    this.roomManager.assertHost(room, payload.identity.deviceId);
    if (room.status !== "InGame" || room.game.phase === "GameOver") {
      throw new Error("INVALID_PHASE");
    }
    if (room.game.isPaused) return;
    room.game.pausedRemainingMs = room.game.phaseEndsAt ? Math.max(0, room.game.phaseEndsAt - Date.now()) : null;
    room.game.phaseEndsAt = null;
    room.game.isPaused = true;
    room.lastActivityAt = Date.now();
    this.botActionEngine.onGamePaused(room.roomCode);
    this.botSpeechEngine.onGamePaused(room.roomCode);
    this.broadcastGamePhase(room);
  }

  private onResume(_socket: Socket, raw: unknown): void {
    const payload = gameResumeSchema.parse(raw);
    const room = this.roomManager.requireRoom(payload.roomCode);
    this.roomManager.assertHost(room, payload.identity.deviceId);
    if (room.status !== "InGame" || !room.game.isPaused) {
      throw new Error("INVALID_PHASE");
    }
    room.game.phaseEndsAt = room.game.pausedRemainingMs === null ? null : Date.now() + room.game.pausedRemainingMs;
    room.game.pausedRemainingMs = null;
    room.game.isPaused = false;
    room.lastActivityAt = Date.now();
    this.broadcastGamePhase(room);
    this.botActionEngine.onGameResumed(room);
  }

  private onBotAdd(raw: unknown): void {
    const payload = roomBotAddSchema.parse(raw);
    const { room } = this.roomManager.addBot(
      payload.roomCode,
      payload.identity.deviceId,
      payload.intelligence,
      payload.count ?? 1
    );
    this.broadcastRoomState(room);
  }

  private onBotRemove(raw: unknown): void {
    const payload = roomBotRemoveSchema.parse(raw);
    const room = this.roomManager.removeBot(payload.roomCode, payload.identity.deviceId, payload.botPlayerId);
    this.botMemoryStore.removeBot(payload.roomCode, payload.botPlayerId);
    this.broadcastRoomState(room);
  }

  private onBotSetIntelligence(raw: unknown): void {
    const payload = roomBotSetIntelligenceSchema.parse(raw);
    const room = this.roomManager.setBotIntelligence(
      payload.roomCode,
      payload.identity.deviceId,
      payload.botPlayerId,
      payload.intelligence
    );
    this.broadcastRoomState(room);
  }

  private onBotFillMinimum(raw: unknown): void {
    const payload = roomBotFillMinimumSchema.parse(raw);
    const { room } = this.roomManager.fillBotsToMinimum(
      payload.roomCode,
      payload.identity.deviceId,
      payload.intelligence
    );
    this.broadcastRoomState(room);
  }

  private toRoomSnapshot(room: RoomState): RoomStateSnapshot {
    return {
      roomCode: room.roomCode,
      status: room.status,
      hostPlayerId: room.hostPlayerId,
      players: room.players.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        isAlive: p.isAlive,
        isConnected: p.isConnected,
        isReady: p.isReady,
        role: room.status === "GameOver" ? p.role : null,
        isBot: p.isBot,
        botIntelligence: p.botIntelligence,
        botPersonality: p.botPersonality
      })),
      minPlayers: env.ROOM_MIN_PLAYERS,
      maxPlayers: env.ROOM_MAX_PLAYERS,
      gameMode: room.game.gameMode,
      rolePreset: room.game.rolePreset,
      rules: room.game.rules
    };
  }

  private broadcastRoomState(room: RoomState): void {
    this.io.to(room.roomCode).emit(SOCKET_EVENTS.ROOM_STATE, this.toRoomSnapshot(room));
  }

  private broadcastGamePhase(room: RoomState): void {
    this.io.to(room.roomCode).emit(SOCKET_EVENTS.GAME_PHASE, this.gameEngine.getPublicSnapshot(room));
    if (room.status === "InGame" && room.game.phase === "VampireVote") {
      this.emitVampireVotePreviewToVampires(room);
    }
  }

  private safe(socket: Socket, run: () => void): void {
    try {
      run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      const isExpected = error instanceof Error && /^[A-Z_]+$/.test(error.message);
      if (isExpected) {
        this.log.warn({ socketId: socket.id, code: message }, "socket handler rejected");
      } else {
        this.log.error({ socketId: socket.id, err: error }, "socket handler crashed");
      }
      socket.emit(SOCKET_EVENTS.ERROR_EVENT, { code: message });
    }
  }
}
