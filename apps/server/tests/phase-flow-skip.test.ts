import { describe, expect, it } from "vitest";
import { resolveRuleSettings, type GameMode, type Role, type RolePresetId } from "@vampir-koylu/shared";
import { GameEngine } from "../src/game/game-engine.js";
import type { PlayerState, RoomState } from "../src/game/game-types.js";

function makePlayer(id: string, role: Role, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    playerId: id,
    nickname: id,
    deviceId: `d-${id}`,
    sessionToken: `ps-${id}`,
    socketId: `sk-${id}`,
    isConnected: true,
    isReady: false,
    isAlive: true,
    role,
    lastProtectedRound: null,
    lastProtectedTargetPlayerId: null,
    guardUsedInGame: false,
    isBot: false,
    ...overrides
  };
}

function makeRoom(opts: {
  players: PlayerState[];
  phase: RoomState["game"]["phase"];
  rolePreset: RolePresetId;
  gameMode?: GameMode;
  rules?: Partial<import("@vampir-koylu/shared").RuleSettings>;
}): RoomState {
  const gameMode = opts.gameMode ?? "SafeFirstNight";
  return {
    roomCode: "T",
    status: "InGame",
    hostPlayerId: opts.players[0].playerId,
    players: opts.players,
    game: {
      phase: opts.phase,
      round: 1,
      phaseEndsAt: Date.now() - 1000,
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
      gameMode,
      rolePreset: opts.rolePreset,
      rules: resolveRuleSettings(gameMode, opts.rules),
      loverLinks: {},
      detectiveInspectedTargets: {},
      phaseDurations: {
        roleReveal: 1,
        nightStart: 1,
        vampireVote: 1,
        detectiveInspect: 1,
        doctorProtect: 1,
        nightResolve: 1,
        dayStart: 1,
        mayorElection: 1,
        guardProtect: 1,
        dayDiscussion: 1,
        dayVote: 1,
        executionResolve: 1,
        hunterLastBreath: 1,
        winCheck: 1
      }
    },
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    cleanupAt: null
  };
}

describe("phase skip when role absent or dead", () => {
  const engine = new GameEngine();

  it("VampireVote -> NightResolve when no alive Detective or Doctor (4p beginner)", () => {
    const room = makeRoom({
      players: [
        makePlayer("v1", "Vampire"),
        makePlayer("a", "Villager"),
        makePlayer("b", "Villager"),
        makePlayer("c", "Villager")
      ],
      phase: "VampireVote",
      rolePreset: "beginner"
    });
    const { phaseChanged } = engine.tick(room);
    expect(phaseChanged).toBe(true);
    expect(room.game.phase).toBe("NightResolve");
  });

  it("does not auto-advance endless phases", () => {
    const room = makeRoom({
      players: [
        makePlayer("v1", "Vampire"),
        makePlayer("a", "Villager"),
        makePlayer("b", "Villager"),
        makePlayer("c", "Villager")
      ],
      phase: "DayDiscussion",
      rolePreset: "beginner"
    });
    room.game.phaseEndsAt = null;
    room.game.phaseDurations.dayDiscussion = 0;
    const { phaseChanged } = engine.tick(room);
    expect(phaseChanged).toBe(false);
    expect(room.game.phase).toBe("DayDiscussion");
  });

  it("manual advance uses the same phase flow for endless phases", () => {
    const room = makeRoom({
      players: [
        makePlayer("v1", "Vampire"),
        makePlayer("a", "Villager"),
        makePlayer("b", "Villager"),
        makePlayer("c", "Villager")
      ],
      phase: "DayDiscussion",
      rolePreset: "beginner"
    });
    room.game.phaseEndsAt = null;
    room.game.phaseDurations.dayDiscussion = 0;
    const { phaseChanged } = engine.advancePhase(room);
    expect(phaseChanged).toBe(true);
    expect(room.game.phase).toBe("DayVote");
  });

  it("manual advance rejects VampireVote before living vampires choose", () => {
    const room = makeRoom({
      players: [
        makePlayer("v1", "Vampire"),
        makePlayer("a", "Villager"),
        makePlayer("b", "Villager"),
        makePlayer("c", "Villager")
      ],
      phase: "VampireVote",
      rolePreset: "beginner"
    });
    expect(() => engine.assertManualAdvanceAllowed(room)).toThrow("PHASE_ACTIONS_PENDING");
    engine.submitAction(room, "v1", {
      roomCode: room.roomCode,
      actionType: "vampire-target",
      targetPlayerId: "a",
      phase: "VampireVote",
      round: 1
    });
    expect(() => engine.assertManualAdvanceAllowed(room)).not.toThrow();
  });

  it("VampireVote -> DoctorProtect when Doctor alive but Detective absent", () => {
    const room = makeRoom({
      players: [
        makePlayer("v1", "Vampire"),
        makePlayer("d1", "Doctor"),
        makePlayer("b", "Villager"),
        makePlayer("c", "Villager")
      ],
      phase: "VampireVote",
      rolePreset: "beginner"
    });
    engine.tick(room);
    expect(room.game.phase).toBe("DoctorProtect");
  });

  it("VampireVote -> DetectiveInspect -> NightResolve when Detective alive but Doctor absent", () => {
    const room = makeRoom({
      players: [
        makePlayer("v1", "Vampire"),
        makePlayer("x", "Detective"),
        makePlayer("b", "Villager"),
        makePlayer("c", "Villager"),
        makePlayer("d", "Villager")
      ],
      phase: "VampireVote",
      rolePreset: "beginner"
    });
    engine.tick(room);
    expect(room.game.phase).toBe("DetectiveInspect");
    room.game.phaseEndsAt = Date.now() - 1000;
    engine.tick(room);
    expect(room.game.phase).toBe("NightResolve");
  });

  it("skips DetectiveInspect when every other alive player was already inspected", () => {
    const room = makeRoom({
      players: [
        makePlayer("v1", "Vampire"),
        makePlayer("x", "Detective"),
        makePlayer("doc", "Doctor", { isAlive: false }),
        makePlayer("a", "Villager", { isAlive: false }),
        makePlayer("b", "Villager", { isAlive: false })
      ],
      phase: "VampireVote",
      rolePreset: "beginner"
    });
    room.game.detectiveInspectedTargets = { x: ["v1"] };
    engine.tick(room);
    expect(room.game.phase).toBe("NightResolve");
  });

  it("skips DetectiveInspect when Detective is dead", () => {
    const room = makeRoom({
      players: [
        makePlayer("v1", "Vampire"),
        makePlayer("x", "Detective", { isAlive: false }),
        makePlayer("doc", "Doctor"),
        makePlayer("b", "Villager"),
        makePlayer("c", "Villager")
      ],
      phase: "VampireVote",
      rolePreset: "beginner"
    });
    engine.tick(room);
    expect(room.game.phase).toBe("DoctorProtect");
  });

  it("DayStart skips MayorElection for beginner even if mayorEnabled", () => {
    const room = makeRoom({
      players: Array.from({ length: 9 }, (_, i) => makePlayer(`p${i}`, "Villager")),
      phase: "DayStart",
      rolePreset: "beginner",
      rules: { mayorEnabled: true }
    });
    engine.tick(room);
    expect(room.game.phase).toBe("DayDiscussion");
  });

  it("DayStart runs MayorElection for socialChaos with enough players and mayorEnabled", () => {
    const room = makeRoom({
      players: Array.from({ length: 9 }, (_, i) => makePlayer(`p${i}`, "Villager")),
      phase: "DayStart",
      rolePreset: "socialChaos",
      rules: { mayorEnabled: true }
    });
    engine.tick(room);
    expect(room.game.phase).toBe("MayorElection");
  });

  it("DayStart skips MayorElection for socialChaos when below Mayor.minPlayers (8p)", () => {
    const room = makeRoom({
      players: Array.from({ length: 8 }, (_, i) => makePlayer(`p${i}`, "Villager")),
      phase: "DayStart",
      rolePreset: "socialChaos",
      rules: { mayorEnabled: true }
    });
    engine.tick(room);
    expect(room.game.phase).toBe("DayDiscussion");
  });
});
