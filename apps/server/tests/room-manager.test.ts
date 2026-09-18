import { describe, expect, it } from "vitest";
import { env } from "../src/config/env.js";
import { GameEngine } from "../src/game/game-engine.js";
import { RoomManager } from "../src/rooms/room-manager.js";

describe("RoomManager reconnect & cleanup", () => {
  it("returns the same player when same deviceId rejoins", () => {
    const manager = new RoomManager();
    const { room, player } = manager.createRoom("Ali", "device-1", "socket-1");
    const token = player.sessionToken;
    const rejoin = manager.joinRoom(room.roomCode, "Ali", "device-1", "socket-2", token);
    expect(rejoin.player.sessionToken).toBe(token);
    expect(rejoin.player.playerId).toBe(player.playerId);
    expect(rejoin.replacedSocketId).toBe("socket-1");
    expect(rejoin.player.socketId).toBe("socket-2");
    expect(rejoin.player.isConnected).toBe(true);
  });

  it("rejects rejoin with mismatched session token", () => {
    const manager = new RoomManager();
    const { room } = manager.createRoom("Ali", "device-1", "socket-1");
    expect(() => manager.joinRoom(room.roomCode, "Ali", "device-1", "socket-2")).toThrow("SESSION_TOKEN_MISMATCH");
    expect(() => manager.joinRoom(room.roomCode, "Ali", "device-1", "socket-2", "ps_wrong")).toThrow(
      "SESSION_TOKEN_MISMATCH"
    );
  });

  it("blocks new players after game has started", () => {
    const manager = new RoomManager();
    const { room } = manager.createRoom("Ali", "device-1", "socket-1");
    room.status = "InGame";
    expect(() => manager.joinRoom(room.roomCode, "Veli", "device-2", "socket-2")).toThrow(
      "GAME_ALREADY_STARTED"
    );
  });

  it("allows reconnect of an existing player even after game started", () => {
    const manager = new RoomManager();
    const { room, player } = manager.createRoom("Ali", "device-1", "socket-1");
    room.status = "InGame";
    const rejoin = manager.joinRoom(room.roomCode, undefined, "device-1", "socket-2", player.sessionToken);
    expect(rejoin.player.playerId).toBe(player.playerId);
  });

  it("marks player disconnected on socket loss without removing them", () => {
    const manager = new RoomManager();
    const { room, player } = manager.createRoom("Ali", "device-1", "socket-1");
    const updated = manager.removeBySocket("socket-1");
    expect(updated?.roomCode).toBe(room.roomCode);
    expect(updated?.players.find((p) => p.playerId === player.playerId)?.isConnected).toBe(false);
  });

  it("keeps disconnected rooms until TTL and cancels cleanup on rejoin", () => {
    const manager = new RoomManager();
    const { room, player } = manager.createRoom("Ali", "device-1", "socket-1");
    manager.addBot(room.roomCode, "device-1", "random", 3);
    manager.removeBySocket("socket-1");
    expect(manager.cleanupRooms(Date.now() + 30_000)).toEqual([]);
    manager.joinRoom(room.roomCode, "Ali", "device-1", "socket-2", player.sessionToken);
    expect(room.cleanupAt).toBeNull();
    manager.removeBySocket("socket-2");
    expect(manager.cleanupRooms(Date.now() + env.ROOM_IDLE_TTL_SECONDS * 1000 + 1)).toContain(room.roomCode);
    expect(manager.getRoom(room.roomCode)).toBeNull();
  });

  it("does not clean up while at least one human is connected", () => {
    const manager = new RoomManager();
    const { room } = manager.createRoom("Ali", "device-1", "socket-1");
    manager.joinRoom(room.roomCode, "Veli", "device-2", "socket-2");
    manager.removeBySocket("socket-1");
    const removed = manager.cleanupRooms();
    expect(removed).not.toContain(room.roomCode);
    expect(manager.getRoom(room.roomCode)).not.toBeNull();
  });

  it("resetToLobbyAfterGameOver keeps players, clears game, human not ready, bot ready", () => {
    const manager = new RoomManager();
    const { room, player } = manager.createRoom("Host", "device-host", "socket-host");
    manager.addBot(room.roomCode, "device-host", "balanced", 1);
    const r = manager.requireRoom(room.roomCode);
    r.status = "GameOver";
    r.game.phase = "GameOver";
    r.game.round = 2;
    r.game.winner = "Vampires";
    r.game.actions.push({ actorPlayerId: player.playerId, actionType: "day-vote", round: 1 });
    for (const p of r.players) {
      p.role = "Villager";
      p.isAlive = false;
      p.isReady = true;
    }

    const reset = manager.resetToLobbyAfterGameOver(r.roomCode, "device-host");
    expect(reset.status).toBe("Lobby");
    expect(reset.players).toHaveLength(2);
    expect(reset.game.phase).toBe("Lobby");
    expect(reset.game.round).toBe(0);
    expect(reset.game.winner).toBeNull();
    expect(reset.game.actions).toEqual([]);
    const host = reset.players.find((p) => p.deviceId === "device-host");
    const bot = reset.players.find((p) => p.isBot);
    expect(host?.isReady).toBe(false);
    expect(bot?.isReady).toBe(true);
    expect(host?.role).toBeNull();
    expect(host?.isAlive).toBe(true);
    expect(bot?.isAlive).toBe(true);
    expect(reset.cleanupAt).toBeNull();
  });

  it("resetToLobbyAfterGameOver rejects non-host", () => {
    const manager = new RoomManager();
    const { room } = manager.createRoom("Host", "device-host", "socket-host");
    manager.joinRoom(room.roomCode, "Veli", "device-guest", "socket-guest");
    const r = manager.requireRoom(room.roomCode);
    r.status = "GameOver";
    expect(() => manager.resetToLobbyAfterGameOver(r.roomCode, "device-guest")).toThrow("ONLY_HOST_CAN_CHANGE_ROOM");
  });

  it("resetToLobbyAfterGameOver rejects when not GameOver", () => {
    const manager = new RoomManager();
    const { room } = manager.createRoom("Host", "device-host", "socket-host");
    expect(() => manager.resetToLobbyAfterGameOver(room.roomCode, "device-host")).toThrow("ROOM_NOT_IN_GAME_OVER");
  });
  it("removes explicit lobby departures, transfers host, and excludes disconnected seats from start", () => {
    const manager = new RoomManager();
    const { room, player: host } = manager.createRoom("Host", "device-host", "socket-host");
    const { player: guest } = manager.joinRoom(room.roomCode, "Guest", "device-guest", "socket-guest");
    manager.addBot(room.roomCode, "device-host", "random", 2);
    manager.leaveRoom(room.roomCode, "device-host");
    expect(room.hostPlayerId).toBe(guest.playerId);
    expect(room.players).not.toContain(host);
    expect(() => new GameEngine().startGame(room)).toThrow("NOT_ENOUGH_PLAYERS");
    manager.joinRoom(room.roomCode, "Offline", "device-offline", "socket-offline");
    manager.removeBySocket("socket-offline");
    expect(() => new GameEngine().startGame(room)).toThrow("NOT_ENOUGH_PLAYERS");
    manager.fillBotsToMinimum(room.roomCode, "device-guest", "random");
    new GameEngine().startGame(room);
    expect(room.players).toHaveLength(4);
    expect(room.players.every((p) => p.isConnected && p.role !== null)).toBe(true);
  });

  it("transfers disconnected host without giving host back on reconnect", () => {
    const manager = new RoomManager();
    const { room, player: host } = manager.createRoom("Host", "device-host", "socket-host");
    const { player: guest } = manager.joinRoom(room.roomCode, "Guest", "device-guest", "socket-guest");
    manager.removeBySocket("socket-host");
    expect(room.hostPlayerId).toBe(guest.playerId);
    manager.joinRoom(room.roomCode, "Host", "device-host", "socket-new", host.sessionToken);
    expect(room.hostPlayerId).toBe(guest.playerId);
  });

  it("rejects multiple room memberships and a second identity on the same socket", () => {
    const manager = new RoomManager();
    const { room } = manager.createRoom("Host", "device-host", "socket-host");
    const other = manager.createRoom("Other", "device-other", "socket-other").room;
    expect(() => manager.createRoom("Host", "device-host", "socket-host")).toThrow("ALREADY_IN_ROOM");
    expect(() => manager.joinRoom(other.roomCode, "Host", "device-host", "socket-host")).toThrow("ALREADY_IN_ROOM");
    expect(() => manager.joinRoom(room.roomCode, "Fake", "device-fake", "socket-host")).toThrow("ALREADY_IN_ROOM");
    manager.leaveRoom(room.roomCode, "device-host");
    expect(() => manager.joinRoom(other.roomCode, "Host", "device-host", "socket-host")).not.toThrow();
  });

});
