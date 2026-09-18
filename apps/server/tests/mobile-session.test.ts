import { beforeEach, describe, expect, it, vi } from "vitest";
import { SOCKET_EVENTS as E } from "@vampir-koylu/shared";

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (payload?: any) => any>(),
  socket: { connected: true, id: "socket", sendBuffer: [] as unknown[], on: vi.fn(), emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
  reset: vi.fn(),
  loadRoomToken: vi.fn(),
  saveRoomSession: vi.fn(),
  clearRoomSession: vi.fn()
}));
vi.mock("../../mobile/src/socket/client", () => ({ getSocket: () => mocks.socket }));
vi.mock("../../mobile/src/app/navigation/navigation-ref", () => ({
  navigationRef: { isReady: () => true, getCurrentRoute: () => ({ name: "Night" }), reset: mocks.reset }
}));
vi.mock("../../mobile/src/storage/session-storage", () => ({
  loadRoomToken: mocks.loadRoomToken, saveRoomSession: mocks.saveRoomSession, clearRoomSession: mocks.clearRoomSession
}));
vi.mock("../../mobile/src/logging/game-logger", () => ({ logGameEvent: vi.fn(), logPersonalEvent: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.handlers.clear();
  mocks.socket.connected = true;
  mocks.socket.sendBuffer = [];
  mocks.socket.on.mockImplementation((event, handler) => mocks.handlers.set(event, handler));
  mocks.saveRoomSession.mockResolvedValue(undefined);
  mocks.clearRoomSession.mockResolvedValue(undefined);
  mocks.loadRoomToken.mockResolvedValue("cached-token");
});

async function setup() {
  const runtime = await import("../../mobile/src/socket/runtime");
  const { useGameStore } = await import("../../mobile/src/store/game-store");
  useGameStore.getState().setDeviceId("device-host");
  useGameStore.getState().setSession({ roomCode: "ABCDEF", playerId: "host", playerSessionToken: "token" });
  runtime.initSocketRuntime();
  return { runtime, store: useGameStore };
}

describe("mobile session recovery", () => {
  it("waits for authenticated rejoin before sending room mutations", async () => {
    const { runtime } = await setup();
    mocks.socket.connected = false;
    mocks.socket.sendBuffer = ["stale action"];
    mocks.handlers.get("disconnect")!();
    runtime.emitReadyToggle(true);
    expect(mocks.socket.sendBuffer).toEqual([]);
    expect(mocks.socket.emit).not.toHaveBeenCalled();
    mocks.socket.connected = true;
    mocks.handlers.get("connect")!();
    expect(mocks.socket.emit).toHaveBeenCalledWith(E.ROOM_JOIN, expect.objectContaining({ roomCode: "ABCDEF" }));
    mocks.socket.emit.mockClear();
    runtime.emitReadyToggle(true);
    expect(mocks.socket.emit).not.toHaveBeenCalled();
    await mocks.handlers.get(E.ROOM_JOIN)!({ roomCode: "ABCDEF", playerId: "host", playerSessionToken: "token" });
    runtime.emitReadyToggle(true);
    expect(mocks.socket.emit).toHaveBeenCalledWith(E.ROOM_READY_TOGGLE, expect.objectContaining({ isReady: true }));
  });

  it("clears stale game state when a restored room no longer exists", async () => {
    const { runtime, store } = await setup();
    store.getState().setPrivateRole("Vampire");
    runtime.resumeSocket();
    mocks.handlers.get(E.ERROR_EVENT)!({ code: "ROOM_NOT_FOUND" });
    expect(store.getState().roomCode).toBeNull();
    expect(store.getState().privateRole).toBeNull();
    expect(mocks.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: "Welcome" }] });
  });

  it("uses the room credential when manually returning after leaving", async () => {
    const { runtime, store } = await setup();
    runtime.emitLeaveRoom();
    expect(store.getState().roomCode).toBeNull();
    mocks.socket.emit.mockClear();
    await runtime.emitJoinRoom("ABCDEF", "Host");
    expect(mocks.socket.emit).toHaveBeenCalledWith(E.ROOM_JOIN, {
      roomCode: "ABCDEF", nickname: "Host", identity: { deviceId: "device-host", playerSessionToken: "cached-token" }
    });
  });
});
