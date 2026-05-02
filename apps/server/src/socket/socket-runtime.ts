import { SOCKET_EVENTS, type GamePrivateResultPayload, type GameStatePrivateDelta, type RoomStateSnapshot } from "@vampir-koylu/shared";
import type { Server, Socket } from "socket.io";
import { env } from "../config/env.js";
import { GameEngine } from "../game/game-engine.js";
import { RoomManager } from "../rooms/room-manager.js";
import type { RoomState } from "../game/game-types.js";
import {
  actionSubmitSchema,
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  readyToggleSchema,
  startRoomSchema
} from "./socket-schema.js";

export class SocketRuntime {
  private readonly roomManager = new RoomManager();
  private readonly gameEngine = new GameEngine();

  constructor(private readonly io: Server) {}

  registerConnection(socket: Socket): void {
    socket.emit(SOCKET_EVENTS.SERVER_CONNECTED, { socketId: socket.id });

    socket.on(SOCKET_EVENTS.ROOM_CREATE, (payload) => this.safe(socket, () => this.onCreate(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (payload) => this.safe(socket, () => this.onJoin(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_LEAVE, (payload) => this.safe(socket, () => this.onLeave(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_READY_TOGGLE, (payload) => this.safe(socket, () => this.onReadyToggle(socket, payload)));
    socket.on(SOCKET_EVENTS.ROOM_START, (payload) => this.safe(socket, () => this.onStart(socket, payload)));
    socket.on(SOCKET_EVENTS.GAME_ACTION_SUBMIT, (payload) => this.safe(socket, () => this.onAction(socket, payload)));

    socket.on("disconnect", () => {
      const room = this.roomManager.removeBySocket(socket.id);
      if (room) {
        this.broadcastRoomState(room);
      }
    });
  }

  tick(): void {
    for (const roomCode of this.roomManager.listRoomCodes()) {
      const room = this.roomManager.getRoom(roomCode);
      if (!room || room.status !== "InGame") continue;
      const tick = this.gameEngine.tick(room);
      if (tick.phaseChanged) {
        for (const privateResult of tick.privateResults) {
          const player = room.players.find((p) => p.playerId === privateResult.playerId);
          if (player?.socketId) {
            this.io.to(player.socketId).emit(SOCKET_EVENTS.GAME_PRIVATE_RESULT, privateResult);
          }
        }
        this.broadcastGamePhase(room);
        this.broadcastRoomState(room);
        if (room.game.phase === "GameOver") {
          this.io.to(room.roomCode).emit(SOCKET_EVENTS.GAME_OVER, {
            winner: room.game.winner,
            round: room.game.round
          });
        }
      }
    }
    this.roomManager.cleanupRooms();
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
      this.io.sockets.sockets.get(replacedSocketId)?.disconnect(true);
    }
    socket.join(room.roomCode);
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      roomCode: room.roomCode,
      playerId: player.playerId,
      playerSessionToken: player.sessionToken
    });
    if (player.role) {
      socket.emit(SOCKET_EVENTS.GAME_PRIVATE_ROLE, {
        role: player.role,
        loverPartnerPlayerId: room.game.loverLinks[player.playerId] ?? undefined
      });
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
    this.broadcastRoomState(room);
  }

  private onReadyToggle(_socket: Socket, raw: unknown): void {
    const payload = readyToggleSchema.parse(raw);
    const room = this.roomManager.setPlayerReady(payload.roomCode, payload.identity.deviceId, payload.isReady);
    this.broadcastRoomState(room);
  }

  private onStart(_socket: Socket, raw: unknown): void {
    const payload = startRoomSchema.parse(raw);
    const room = this.roomManager.updateGameConfig(payload.roomCode, {
      phaseDurations: payload.phaseDurations,
      gameMode: payload.gameMode,
      rolePreset: payload.rolePreset,
      rules: payload.rules
    });
    const actor = room.players.find((p) => p.deviceId === payload.identity.deviceId);
    if (!actor || !actor.isConnected) {
      throw new Error("PLAYER_NOT_FOUND");
    }
    if (!this.roomManager.areAllConnectedPlayersReady(payload.roomCode)) {
      throw new Error("PLAYERS_NOT_READY");
    }
    const privateDeltas = this.gameEngine.startGame(room);
    room.players.forEach((player, index) => {
      if (!player.socketId) return;
      const delta: GameStatePrivateDelta = privateDeltas[index] ?? {};
      this.io.to(player.socketId).emit(SOCKET_EVENTS.GAME_PRIVATE_ROLE, delta);
    });
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
    this.gameEngine.submitAction(room, actor.playerId, {
      roomCode: payload.roomCode,
      actionType: payload.actionType,
      targetPlayerId: payload.targetPlayerId,
      phase: payload.phase,
      round: payload.round
    });
    socket.emit(SOCKET_EVENTS.GAME_PRIVATE_RESULT, { accepted: true } satisfies GamePrivateResultPayload);

    if (payload.actionType === "vampire-target" && room.game.phase === "VampireVote") {
      const vampireVotePreview = this.buildVampireVotePreview(room);
      const aliveVampires = room.players.filter((p) => p.isAlive && p.role === "Vampire" && Boolean(p.socketId));
      for (const vampire of aliveVampires) {
        if (!vampire.socketId) continue;
        this.io.to(vampire.socketId).emit(
          SOCKET_EVENTS.GAME_PRIVATE_RESULT,
          { vampireVotePreview } satisfies GamePrivateResultPayload
        );
      }
    }
  }

  private buildVampireVotePreview(room: RoomState): { vampirePlayerId: string; targetPlayerId: string }[] {
    const alivePlayers = new Set(room.players.filter((p) => p.isAlive).map((p) => p.playerId));
    const aliveVampires = new Set(room.players.filter((p) => p.isAlive && p.role === "Vampire").map((p) => p.playerId));
    return room.game.actions
      .filter((action) => action.actionType === "vampire-target" && action.targetPlayerId)
      .filter((action) => aliveVampires.has(action.actorPlayerId))
      .filter((action) => action.targetPlayerId && alivePlayers.has(action.targetPlayerId))
      .map((action) => ({
        vampirePlayerId: action.actorPlayerId,
        targetPlayerId: action.targetPlayerId as string
      }));
  }

  private toRoomSnapshot(room: RoomState): RoomStateSnapshot {
    return {
      roomCode: room.roomCode,
      status: room.status,
      players: room.players.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        isAlive: p.isAlive,
        isConnected: p.isConnected,
        isReady: p.isReady,
        role: room.status === "GameOver" ? p.role : null
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
  }

  private safe(socket: Socket, run: () => void): void {
    try {
      run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      socket.emit(SOCKET_EVENTS.ERROR_EVENT, { code: message });
    }
  }
}
