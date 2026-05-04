import { env } from "../config/env.js";
import { randomRoomCode, randomToken } from "../utils/random.js";
import type { PlayerState, RoomState } from "../game/game-types.js";
import { resolveRuleSettings, type BotIntelligence, type GameMode, type PhaseDurationSettings, type RolePresetId, type RuleSettings } from "@vampir-koylu/shared";
import { pickBotPersonality, pickUnusedBotName } from "../bots/bot-names.js";

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();

  createRoom(
    nickname: string,
    deviceId: string,
    socketId: string,
    phaseDurations?: PhaseDurationSettings,
    gameMode?: GameMode,
    rolePreset?: RolePresetId,
    rules?: Partial<RuleSettings>
  ): { room: RoomState; player: PlayerState } {
    const roomCode = this.generateRoomCode();
    const player = this.createPlayer(nickname, deviceId, socketId);
    const now = Date.now();
    const room: RoomState = {
      roomCode,
      status: "Lobby",
      hostPlayerId: player.playerId,
      players: [player],
      game: {
        phase: "Lobby",
        round: 0,
        phaseEndsAt: null,
        isPaused: false,
        pausedRemainingMs: null,
        tieCountInRound: 0,
        mayorPlayerId: null,
        guardProtectedPlayerId: null,
        winner: null,
        actions: [],
        privateResults: [],
        lastDayVoteSummary: null,
        lastEliminationSummary: null,
        gameMode: gameMode ?? "Classic",
        rolePreset: rolePreset ?? "beginner",
        rules: this.resolveRules(gameMode ?? "Classic", rules),
        loverLinks: {},
        detectiveInspectedTargets: {},
        phaseDurations: this.resolveDurations(phaseDurations)
      },
      createdAt: now,
      lastActivityAt: now,
      cleanupAt: null
    };
    this.rooms.set(roomCode, room);
    return { room, player };
  }

  joinRoom(
    roomCode: string,
    nickname: string | undefined,
    deviceId: string,
    socketId: string,
    playerSessionToken?: string
  ): { room: RoomState; player: PlayerState; replacedSocketId: string | null } {
    const room = this.requireRoom(roomCode);
    room.lastActivityAt = Date.now();
    room.cleanupAt = null;

    const existing = room.players.find((p) => p.deviceId === deviceId);
    if (existing) {
      if (playerSessionToken && existing.sessionToken !== playerSessionToken) {
        throw new Error("SESSION_TOKEN_MISMATCH");
      }
      const replacedSocketId = existing.socketId || null;
      existing.socketId = socketId;
      existing.isConnected = true;
      existing.isReady = false;
      if (nickname && room.status === "Lobby") {
        existing.nickname = nickname;
      }
      existing.sessionToken = randomToken("ps");
      return { room, player: existing, replacedSocketId };
    }

    if (room.status !== "Lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }
    if (room.players.length >= env.ROOM_MAX_PLAYERS) {
      throw new Error("ROOM_FULL");
    }

    const player = this.createPlayer(nickname ?? "Oyuncu", deviceId, socketId);
    room.players.push(player);
    return { room, player, replacedSocketId: null };
  }

  leaveRoom(roomCode: string, deviceId: string): RoomState {
    const room = this.requireRoom(roomCode);
    const player = room.players.find((p) => p.deviceId === deviceId);
    if (player) {
      player.isConnected = false;
      player.socketId = "";
    }
    room.lastActivityAt = Date.now();
    this.scheduleCleanup(room);
    return room;
  }

  removeBySocket(socketId: string): RoomState | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (!player) continue;
      player.isConnected = false;
      player.socketId = "";
      room.lastActivityAt = Date.now();
      this.scheduleCleanup(room);
      return room;
    }
    return null;
  }

  getRoom(roomCode: string): RoomState | null {
    return this.rooms.get(roomCode) ?? null;
  }

  listRoomCodes(): string[] {
    return Array.from(this.rooms.keys());
  }

  requireRoom(roomCode: string): RoomState {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error("ROOM_NOT_FOUND");
    }
    return room;
  }

  updatePhaseDurations(roomCode: string, phaseDurations?: PhaseDurationSettings): RoomState {
    const room = this.requireRoom(roomCode);
    if (!phaseDurations) return room;
    room.game.phaseDurations = this.resolveDurations(phaseDurations);
    room.lastActivityAt = Date.now();
    return room;
  }

  updateGameConfig(
    roomCode: string,
    options: {
      phaseDurations?: PhaseDurationSettings;
      gameMode?: GameMode;
      rolePreset?: RolePresetId;
      rules?: Partial<RuleSettings>;
      resetReadiness?: boolean;
    }
  ): RoomState {
    const room = this.requireRoom(roomCode);
    let changed = false;
    const shouldResetReadiness = options.resetReadiness ?? true;
    const nextGameMode = options.gameMode ?? room.game.gameMode;
    if (options.phaseDurations) {
      room.game.phaseDurations = this.resolveDurations(options.phaseDurations);
      changed = true;
    }
    if (options.gameMode) {
      room.game.gameMode = options.gameMode;
      changed = true;
    }
    if (options.rolePreset) {
      room.game.rolePreset = options.rolePreset;
      changed = true;
    }
    if (options.rules || options.gameMode) {
      room.game.rules = this.resolveRules(nextGameMode, options.rules ?? room.game.rules);
      changed = true;
    }
    if (changed && shouldResetReadiness && room.status === "Lobby") {
      for (const player of room.players) {
        if (player.isBot) continue;
        if (player.isConnected) {
          player.isReady = false;
        }
      }
    }
    room.lastActivityAt = Date.now();
    return room;
  }

  /**
   * GameOver → Lobby: same room code, same players/bots, fresh lobby game state.
   * Host-only; humans not ready, bots ready (matches fresh bot join behavior).
   */
  resetToLobbyAfterGameOver(roomCode: string, deviceId: string): RoomState {
    const room = this.requireRoom(roomCode);
    this.assertHost(room, deviceId);
    if (room.status !== "GameOver") {
      throw new Error("ROOM_NOT_IN_GAME_OVER");
    }

    room.status = "Lobby";
    room.game.phase = "Lobby";
    room.game.round = 0;
    room.game.phaseEndsAt = null;
    room.game.isPaused = false;
    room.game.pausedRemainingMs = null;
    room.game.tieCountInRound = 0;
    room.game.mayorPlayerId = null;
    room.game.guardProtectedPlayerId = null;
    room.game.winner = null;
    room.game.actions = [];
    room.game.privateResults = [];
    room.game.lastDayVoteSummary = null;
    room.game.lastEliminationSummary = null;
    room.game.loverLinks = {};
    room.game.detectiveInspectedTargets = {};

    for (const player of room.players) {
      player.role = null;
      player.isAlive = true;
      player.lastProtectedRound = null;
      player.lastProtectedTargetPlayerId = null;
      player.guardUsedInGame = false;
      if (player.isBot) {
        player.isReady = true;
      } else {
        player.isReady = false;
      }
    }

    room.lastActivityAt = Date.now();
    room.cleanupAt = null;
    return room;
  }

  assertHost(room: RoomState, deviceId: string): PlayerState {
    const actor = room.players.find((p) => p.deviceId === deviceId);
    if (!actor || !actor.isConnected) {
      throw new Error("PLAYER_NOT_FOUND");
    }
    if (actor.playerId !== room.hostPlayerId) {
      throw new Error("ONLY_HOST_CAN_CHANGE_ROOM");
    }
    return actor;
  }

  setPlayerReady(roomCode: string, deviceId: string, isReady: boolean): RoomState {
    const room = this.requireRoom(roomCode);
    if (room.status !== "Lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }
    const player = room.players.find((p) => p.deviceId === deviceId);
    if (!player || !player.isConnected) {
      throw new Error("PLAYER_NOT_FOUND");
    }
    player.isReady = isReady;
    room.lastActivityAt = Date.now();
    return room;
  }

  areAllConnectedPlayersReady(roomCode: string): boolean {
    const room = this.requireRoom(roomCode);
    const connected = room.players.filter((p) => p.isConnected);
    if (!connected.length) return false;
    return connected.every((p) => p.isReady);
  }

  cleanupRooms(now = Date.now()): string[] {
    const removed: string[] = [];
    for (const room of this.rooms.values()) {
      if (room.players.every((p) => p.isBot || !p.isConnected)) {
        if (!room.cleanupAt) {
          this.scheduleCleanup(room);
        }
        if (room.cleanupAt && room.cleanupAt <= now) {
          this.rooms.delete(room.roomCode);
          removed.push(room.roomCode);
        }
      }
    }
    return removed;
  }

  private scheduleCleanup(room: RoomState): void {
    if (room.players.every((p) => p.isBot || !p.isConnected)) {
      room.cleanupAt = Date.now();
      return;
    }
    const ttl = room.status === "GameOver" ? env.ROOM_AFTER_GAME_TTL_SECONDS : env.ROOM_IDLE_TTL_SECONDS;
    room.cleanupAt = Date.now() + ttl * 1000;
  }

  private generateRoomCode(): string {
    let code = randomRoomCode(env.ROOM_CODE_LENGTH);
    while (this.rooms.has(code)) {
      code = randomRoomCode(env.ROOM_CODE_LENGTH);
    }
    return code;
  }

  private createPlayer(nickname: string, deviceId: string, socketId: string): PlayerState {
    return {
      playerId: randomToken("p"),
      nickname,
      deviceId,
      sessionToken: randomToken("ps"),
      socketId,
      isConnected: true,
      isReady: false,
      isAlive: true,
      role: null,
      lastProtectedRound: null,
      lastProtectedTargetPlayerId: null,
      guardUsedInGame: false,
      isBot: false
    };
  }

  addBot(roomCode: string, deviceId: string, intelligence: BotIntelligence, count = 1): { room: RoomState; addedBotPlayerIds: string[] } {
    const room = this.requireRoom(roomCode);
    if (room.status !== "Lobby") {
      throw new Error("CANNOT_ADD_BOT_AFTER_START");
    }
    this.assertHostForBot(room, deviceId, "ONLY_HOST_CAN_ADD_BOT");
    if (!Number.isFinite(count) || count < 1) {
      throw new Error("INVALID_BOT_COUNT");
    }
    const capacity = env.ROOM_MAX_PLAYERS - room.players.length;
    if (capacity <= 0) {
      throw new Error("ROOM_FULL");
    }
    const toAdd = Math.min(count, capacity);
    const addedBotPlayerIds: string[] = [];
    for (let i = 0; i < toAdd; i += 1) {
      const usedNames = new Set(room.players.map((p) => p.nickname));
      const nickname = pickUnusedBotName(usedNames);
      const bot = this.createBotPlayer(nickname, intelligence);
      room.players.push(bot);
      addedBotPlayerIds.push(bot.playerId);
    }
    room.lastActivityAt = Date.now();
    return { room, addedBotPlayerIds };
  }

  removeBot(roomCode: string, deviceId: string, botPlayerId: string): RoomState {
    const room = this.requireRoom(roomCode);
    if (room.status !== "Lobby") {
      throw new Error("CANNOT_REMOVE_BOT_AFTER_START");
    }
    this.assertHostForBot(room, deviceId, "ONLY_HOST_CAN_REMOVE_BOT");
    const target = room.players.find((p) => p.playerId === botPlayerId);
    if (!target) {
      throw new Error("BOT_NOT_FOUND");
    }
    if (!target.isBot) {
      throw new Error("TARGET_IS_NOT_BOT");
    }
    room.players = room.players.filter((p) => p.playerId !== botPlayerId);
    room.lastActivityAt = Date.now();
    return room;
  }

  setBotIntelligence(roomCode: string, deviceId: string, botPlayerId: string, intelligence: BotIntelligence): RoomState {
    const room = this.requireRoom(roomCode);
    if (room.status !== "Lobby") {
      throw new Error("CANNOT_CHANGE_BOT_AFTER_START");
    }
    this.assertHostForBot(room, deviceId, "ONLY_HOST_CAN_CHANGE_BOT");
    const target = room.players.find((p) => p.playerId === botPlayerId);
    if (!target) {
      throw new Error("BOT_NOT_FOUND");
    }
    if (!target.isBot) {
      throw new Error("TARGET_IS_NOT_BOT");
    }
    target.botIntelligence = intelligence;
    target.botPersonality = pickBotPersonality(intelligence);
    room.lastActivityAt = Date.now();
    return room;
  }

  fillBotsToMinimum(roomCode: string, deviceId: string, intelligence: BotIntelligence): { room: RoomState; addedBotPlayerIds: string[] } {
    const room = this.requireRoom(roomCode);
    if (room.status !== "Lobby") {
      throw new Error("CANNOT_ADD_BOT_AFTER_START");
    }
    this.assertHostForBot(room, deviceId, "ONLY_HOST_CAN_ADD_BOT");
    const activeCount = room.players.filter((p) => p.isBot || p.isConnected).length;
    const needed = Math.max(0, env.ROOM_MIN_PLAYERS - activeCount);
    if (needed === 0) {
      return { room, addedBotPlayerIds: [] };
    }
    return this.addBot(roomCode, deviceId, intelligence, needed);
  }

  private assertHostForBot(room: RoomState, deviceId: string, errorCode: string): PlayerState {
    const actor = room.players.find((p) => p.deviceId === deviceId);
    if (!actor || !actor.isConnected) {
      throw new Error("PLAYER_NOT_FOUND");
    }
    if (actor.playerId !== room.hostPlayerId) {
      throw new Error(errorCode);
    }
    return actor;
  }

  private createBotPlayer(nickname: string, intelligence: BotIntelligence): PlayerState {
    const playerId = randomToken("bot");
    return {
      playerId,
      nickname,
      deviceId: `bot:${playerId}`,
      sessionToken: randomToken("ps"),
      socketId: "",
      isConnected: true,
      isReady: true,
      isAlive: true,
      role: null,
      lastProtectedRound: null,
      lastProtectedTargetPlayerId: null,
      guardUsedInGame: false,
      isBot: true,
      botIntelligence: intelligence,
      botPersonality: pickBotPersonality(intelligence)
    };
  }

  private resolveDurations(phaseDurations?: PhaseDurationSettings): RoomState["game"]["phaseDurations"] {
    return {
      roleReveal: phaseDurations?.roleReveal ?? env.ROLE_REVEAL_SECONDS,
      nightStart: phaseDurations?.nightStart ?? env.NIGHT_INTRO_SECONDS,
      vampireVote: phaseDurations?.vampireVote ?? env.VAMPIRE_ACTION_SECONDS,
      detectiveInspect: phaseDurations?.detectiveInspect ?? env.DETECTIVE_ACTION_SECONDS,
      doctorProtect: phaseDurations?.doctorProtect ?? env.DOCTOR_ACTION_SECONDS,
      dayStart: phaseDurations?.dayStart ?? env.RESULT_SCREEN_SECONDS,
      dayDiscussion: phaseDurations?.dayDiscussion ?? env.DAY_DISCUSSION_SECONDS,
      dayVote: phaseDurations?.dayVote ?? env.DAY_VOTE_SECONDS
    };
  }

  private resolveRules(gameMode: GameMode, rules?: Partial<RuleSettings>): RuleSettings {
    return resolveRuleSettings(gameMode, rules);
  }
}
