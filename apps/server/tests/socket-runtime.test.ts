import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server, Socket } from "socket.io";
import { SOCKET_EVENTS as E, type RoomStateSnapshot } from "@vampir-koylu/shared";
import { SocketRuntime } from "../src/socket/socket-runtime.js";
import { env } from "../src/config/env.js";

// Exercise the registered event handlers, including auth, broadcasts and disconnects.
function harness() {
  const broadcasts: Array<{ target: string; event: string; payload: any }> = [];
  const sockets = new Map();
  const io = {
    sockets: { sockets },
    to: (target: string) => ({ emit: (event: string, payload: unknown) => broadcasts.push({ target, event, payload }) })
  } as unknown as Server;
  const runtime = new SocketRuntime(io);
  function client(id: string, address = id) {
    const handlers = new Map<string, (payload?: unknown) => void>();
    const messages: Array<{ event: string; payload: any }> = [];
    const socket = {
      id, handshake: { address },
      on: (event: string, handler: (payload?: unknown) => void) => handlers.set(event, handler),
      emit: (event: string, payload: unknown) => messages.push({ event, payload }),
      join: vi.fn(), leave: vi.fn(),
      disconnect: () => handlers.get("disconnect")?.()
    } as unknown as Socket;
    sockets.set(id, socket);
    runtime.registerConnection(socket);
    return {
      send: (event: string, payload?: unknown) => handlers.get(event)?.(payload),
      last: (event: string) => messages.filter((m) => m.event === event).at(-1)?.payload,
      messages
    };
  }
  return { runtime, client, broadcasts };
}

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("SocketRuntime session and room flow", () => {
  it("rejects impersonation and permits only the rejoined socket to mutate the room", () => {
    const h = harness();
    const host = h.client("host-socket");
    host.send(E.ROOM_CREATE, { identity: { deviceId: "device-host" }, nickname: "Host" });
    const session = host.last(E.ROOM_JOIN);
    const identity = { deviceId: "device-host", playerSessionToken: session.playerSessionToken };
    const other = h.client("other-socket");
    other.send(E.ROOM_CONFIG_UPDATE, { roomCode: session.roomCode, identity: { deviceId: "device-host" }, gameMode: "FastParty" });
    expect(other.last(E.ERROR_EVENT).code).toBe("SESSION_TOKEN_MISMATCH");
    other.send(E.ROOM_BOT_FILL_MINIMUM, { roomCode: session.roomCode, identity, intelligence: "random" });
    expect(other.last(E.ERROR_EVENT).code).toBe("SOCKET_MISMATCH");
    other.send(E.ROOM_JOIN, { roomCode: session.roomCode, identity });
    expect(other.last(E.ROOM_JOIN).playerSessionToken).toBe(session.playerSessionToken);
    host.send(E.ROOM_READY_TOGGLE, { roomCode: session.roomCode, identity, isReady: true });
    expect(host.last(E.ERROR_EVENT).code).toBe("SOCKET_MISMATCH");
    other.send(E.ROOM_READY_TOGGLE, { roomCode: session.roomCode, identity, isReady: true });
    const state = h.broadcasts.at(-1)?.payload as RoomStateSnapshot;
    expect(state.players[0].isReady).toBe(true);
    expect(state.players[0]).not.toHaveProperty("sessionToken");
    expect(state.players[0]).not.toHaveProperty("deviceId");
  });

  it("completes a timed multiplayer match, reconnects, and resets to a playable lobby", () => {
    vi.useFakeTimers();
    const h = harness();
    const clients = Array.from({ length: 5 }, (_, i) => h.client(`socket-${i}`));
    clients[0].send(E.ROOM_CREATE, { identity: { deviceId: "device-0" }, nickname: "Host" });
    const roomCode = clients[0].last(E.ROOM_JOIN).roomCode;
    for (let i = 1; i < clients.length; i++) {
      clients[i].send(E.ROOM_JOIN, { roomCode, identity: { deviceId: `device-${i}` }, nickname: `Player ${i}` });
    }
    const identities = clients.map((c, i) => ({ deviceId: `device-${i}`, playerSessionToken: c.last(E.ROOM_JOIN).playerSessionToken }));
    clients.forEach((c, i) => c.send(E.ROOM_READY_TOGGLE, { roomCode, identity: identities[i], isReady: true }));
    clients[0].send(E.ROOM_START, { roomCode, identity: identities[0] });
    const phase = () => h.broadcasts.filter((b) => b.event === E.GAME_PHASE).at(-1)!.payload;
    const state = () => h.broadcasts.filter((b) => b.event === E.ROOM_STATE).at(-1)!.payload as RoomStateSnapshot;
    expect(phase().phase).toBe("RoleReveal");
    const vampireIndex = clients.findIndex((_, i) => h.broadcasts.some((b) => b.target === `socket-${i}` && b.event === E.GAME_PRIVATE_ROLE && b.payload.role === "Vampire"));
    expect(vampireIndex).toBeGreaterThanOrEqual(0);
    const vampireId = clients[vampireIndex].last(E.ROOM_JOIN).playerId;
    const detectiveIndex = clients.findIndex((_, i) => h.broadcasts.some((b) => b.target === `socket-${i}` && b.event === E.GAME_PRIVATE_ROLE && b.payload.role === "Detective"));
    const detectiveId = clients[detectiveIndex].last(E.ROOM_JOIN).playerId;
    let restoredDetective = false;
    clients[0].send("disconnect");
    expect(state().hostPlayerId).not.toBe(clients[0].last(E.ROOM_JOIN).playerId);
    clients[0] = h.client("socket-reconnected");
    clients[0].send(E.ROOM_JOIN, { roomCode, identity: identities[0] });
    expect(clients[0].last(E.GAME_PRIVATE_ROLE).role).toBeTruthy();
    for (let step = 0; step < 80 && state().status !== "GameOver"; step++) {
      const current = phase();
      if (current.phase === "VampireVote") {
        const target = state().players.find((p) => p.isAlive && p.playerId !== vampireId && p.playerId !== detectiveId)!;
        clients[vampireIndex].send(E.GAME_ACTION_SUBMIT, {
          roomCode, identity: identities[vampireIndex], actionType: "vampire-target",
          targetPlayerId: target.playerId, phase: current.phase, round: current.round
        });
      }
      if (current.phase === "DetectiveInspect" && current.round === 1) {
        const submit = (targetPlayerId: string) => clients[detectiveIndex].send(E.GAME_ACTION_SUBMIT, {
          roomCode, identity: identities[detectiveIndex], actionType: "detective-inspect",
          targetPlayerId, phase: current.phase, round: current.round
        });
        submit(state().players.find((p) => p.playerId !== detectiveId && p.playerId !== vampireId)!.playerId);
        submit(vampireId);
        expect(h.broadcasts.filter((b) => b.event === E.GAME_PRIVATE_ROLE && b.payload.detectiveInspectedPlayerIds).at(-1)?.payload.detectiveInspectedPlayerIds).toEqual([]);
      }
      if (current.phase === "DayStart" && !restoredDetective) {
        clients[detectiveIndex].send("disconnect");
        clients[detectiveIndex] = h.client("detective-reconnected");
        clients[detectiveIndex].send(E.ROOM_JOIN, { roomCode, identity: identities[detectiveIndex] });
        expect(clients[detectiveIndex].last(E.GAME_PRIVATE_ROLE).detectiveInspectedPlayerIds).toEqual([vampireId]);
        expect(clients[detectiveIndex].last(E.GAME_PRIVATE_RESULT)).toMatchObject({ detectiveTargetPlayerId: vampireId, detectiveResult: "Vampire" });
        restoredDetective = true;
      }
      expect(current.phaseEndsAt).not.toBeNull();
      vi.setSystemTime(current.phaseEndsAt + 1);
      h.runtime.tick();
    }
    expect(restoredDetective).toBe(true);
    expect(state().status).toBe("GameOver");
    expect(h.broadcasts.some((b) => b.event === E.GAME_OVER)).toBe(true);
    const hostIndex = clients.findIndex((c) => c.last(E.ROOM_JOIN).playerId === state().hostPlayerId);
    clients[hostIndex].send(E.ROOM_RESET_TO_LOBBY, { roomCode, identity: identities[hostIndex] });
    expect(state().status).toBe("Lobby");
    expect(state().players.every((p) => p.role === null && !p.isReady)).toBe(true);
    clients.forEach((c, i) => c.send(E.ROOM_READY_TOGGLE, { roomCode, identity: identities[i], isReady: true }));
    clients[hostIndex].send(E.ROOM_START, { roomCode, identity: identities[hostIndex] });
    expect(phase().phase).toBe("RoleReveal");
    expect(clients.flatMap((c) => c.messages).filter((m) => m.event === E.ERROR_EVENT)).toEqual([]);
  });

  it("retains IP rate limits across new connections and expires idle buckets", () => {
    vi.useFakeTimers();
    const h = harness();
    for (let i = 0; i < env.SOCKET_IP_MAX_EVENTS; i++) {
      h.client(`socket-${i}`, "shared-ip").send(E.ROOM_JOIN, {});
    }
    const next = h.client("next", "shared-ip");
    next.send(E.ROOM_JOIN, {});
    expect(next.last(E.ERROR_EVENT).code).toBe("RATE_LIMITED");
    vi.setSystemTime(Date.now() + env.SOCKET_RATE_LIMIT_WINDOW_MS + 1);
    h.runtime.tick();
    next.send(E.ROOM_JOIN, {});
    expect(next.last(E.ERROR_EVENT).code).toBe("INVALID_REQUEST");
  });
});
