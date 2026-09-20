import { describe, expect, it } from "vitest";
import { resolveRuleSettings } from "@vampir-koylu/shared";
import { createEmptyBotMemory } from "../src/bots/bot-memory.js";
import { legalTargetsForBot, pickBotTargetOrder } from "../src/bots/bot-targeting.js";
import { GameEngine } from "../src/game/game-engine.js";
import type { RoomState } from "../src/game/game-types.js";

function baseRoom(options: { players: RoomState["players"]; game?: Partial<RoomState["game"]> }): RoomState {
  const rules = resolveRuleSettings("Classic", {});
  const gameDefaults: RoomState["game"] = {
    phase: "VampireVote",
    round: 1,
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
    gameMode: "Classic",
    rolePreset: "beginner",
    rules,
    loverLinks: {},
    detectiveInspectedTargets: {},
    phaseDurations: {
      roleReveal: 10,
      nightStart: 5,
      vampireVote: 30,
      detectiveInspect: 20,
      doctorProtect: 20,
      nightResolve: 10,
      dayStart: 10,
      mayorElection: 45,
      guardProtect: 45,
      dayDiscussion: 120,
      dayVote: 45,
      executionResolve: 10,
      hunterLastBreath: 10,
      winCheck: 1
    }
  };
  const gameOverrides = options.game ?? {};
  return {
    roomCode: "TEST",
    status: "InGame",
    hostPlayerId: "h1",
    players: options.players,
    game: {
      ...gameDefaults,
      ...gameOverrides,
      rules: gameOverrides.rules ?? rules
    },
    createdAt: 0,
    lastActivityAt: 0,
    cleanupAt: null
  };
}

describe("legalTargetsForBot", () => {
  it("VampireVote lists only living non-vampires for a vampire bot", () => {
    const room = baseRoom({
      players: [
        {
          playerId: "v1",
          nickname: "V",
          deviceId: "bot:v1",
          sessionToken: "t",
          socketId: "",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Vampire",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: true
        },
        {
          playerId: "c1",
          nickname: "C",
          deviceId: "d",
          sessionToken: "t",
          socketId: "s",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        }
      ]
    });
    expect(legalTargetsForBot(room, "VampireVote", "v1").sort()).toEqual(["c1"]);
  });

  it("DayVote excludes guard-protected target and can include no-lynch when enabled", () => {
    const room = baseRoom({
      players: [
        {
          playerId: "b1",
          nickname: "B",
          deviceId: "bot:b1",
          sessionToken: "t",
          socketId: "",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: true
        },
        {
          playerId: "g1",
          nickname: "G",
          deviceId: "d2",
          sessionToken: "t",
          socketId: "s2",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        }
      ],
      game: {
        phase: "DayVote",
        guardProtectedPlayerId: "g1",
        rules: resolveRuleSettings("Classic", { noLynchEnabled: true })
      }
    });
    const targets = legalTargetsForBot(room, "DayVote", "b1");
    expect(targets).not.toContain("g1");
    expect(targets).not.toContain("b1");
    expect(targets).toContain("__NO_LYNCH__");
  });

  it("DayVote revote lists only canonical tie candidates", () => {
    const room = baseRoom({
      players: [
        {
          playerId: "b1",
          nickname: "B",
          deviceId: "bot:b1",
          sessionToken: "t",
          socketId: "",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: true
        },
        {
          playerId: "h1",
          nickname: "H",
          deviceId: "d",
          sessionToken: "t",
          socketId: "s",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        },
        {
          playerId: "h2",
          nickname: "J",
          deviceId: "d2",
          sessionToken: "t",
          socketId: "s2",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        }
      ],
      game: {
        phase: "DayVote",
        tieCountInRound: 1,
        revoteCandidateIds: ["h1"],
        rules: resolveRuleSettings("Classic", { noLynchEnabled: true })
      }
    });
    expect(legalTargetsForBot(room, "DayVote", "b1")).toEqual(["h1"]);
    room.game.revoteCandidateIds = ["h1", "__NO_LYNCH__"];
    expect(legalTargetsForBot(room, "DayVote", "b1")).toEqual(["h1", "__NO_LYNCH__"]);
    expect(legalTargetsForBot(room, "DayVote", "h1")).toEqual(["__NO_LYNCH__"]);
  });

  it("MayorElection legal targets exclude the voting actor", () => {
    const room = baseRoom({
      players: [
        {
          playerId: "b1",
          nickname: "B",
          deviceId: "bot:b1",
          sessionToken: "t",
          socketId: "",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: true
        },
        {
          playerId: "h1",
          nickname: "H",
          deviceId: "d",
          sessionToken: "t",
          socketId: "s",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        }
      ],
      game: { phase: "MayorElection" }
    });
    expect(legalTargetsForBot(room, "MayorElection", "b1").sort()).toEqual(["h1"]);
  });

  it("DetectiveInspect excludes self and already inspected targets", () => {
    const room = baseRoom({
      players: [
        {
          playerId: "d1",
          nickname: "D",
          deviceId: "bot:d1",
          sessionToken: "t",
          socketId: "",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Detective",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: true
        },
        {
          playerId: "x1",
          nickname: "X",
          deviceId: "d",
          sessionToken: "t",
          socketId: "s",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        },
        {
          playerId: "x2",
          nickname: "Y",
          deviceId: "d3",
          sessionToken: "t",
          socketId: "s3",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        }
      ],
      game: {
        phase: "DetectiveInspect",
        detectiveInspectedTargets: { d1: ["x1"] },
        rules: resolveRuleSettings("Classic", {})
      }
    });
    expect(legalTargetsForBot(room, "DetectiveInspect", "d1").sort()).toEqual(["x2"]);
  });
});

describe("pickBotTargetOrder self exclusion", () => {
  const mem = createEmptyBotMemory();
  const rng = () => 0.42;

  it("DayVote order never includes the actor", () => {
    const room = baseRoom({
      players: [
        {
          playerId: "b1",
          nickname: "B",
          deviceId: "bot:b1",
          sessionToken: "t",
          socketId: "",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: true
        },
        {
          playerId: "h1",
          nickname: "H",
          deviceId: "d",
          sessionToken: "t",
          socketId: "s",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        },
        {
          playerId: "h2",
          nickname: "J",
          deviceId: "d2",
          sessionToken: "t",
          socketId: "s2",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        }
      ],
      game: { phase: "DayVote" }
    });
    const order = pickBotTargetOrder(room, "DayVote", "b1", "balanced", mem, rng);
    expect(order.every((id) => id !== "b1")).toBe(true);
    expect(order.length).toBeGreaterThan(0);
  });

  it("MayorElection order never includes the actor", () => {
    const room = baseRoom({
      players: [
        {
          playerId: "b1",
          nickname: "B",
          deviceId: "bot:b1",
          sessionToken: "t",
          socketId: "",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: true
        },
        {
          playerId: "h1",
          nickname: "H",
          deviceId: "d",
          sessionToken: "t",
          socketId: "s",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        }
      ],
      game: { phase: "MayorElection" }
    });
    const order = pickBotTargetOrder(room, "MayorElection", "b1", "deceptive", mem, rng);
    expect(order).toEqual(["h1"]);
  });
});

describe("GameEngine vote validation", () => {
  it("rejects day-vote and mayor-vote when target is self", () => {
    const engine = new GameEngine();
    const room = baseRoom({
      players: [
        {
          playerId: "a",
          nickname: "A",
          deviceId: "d",
          sessionToken: "t",
          socketId: "s",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        },
        {
          playerId: "b",
          nickname: "B",
          deviceId: "d2",
          sessionToken: "t",
          socketId: "s2",
          isConnected: true,
          isReady: true,
          isAlive: true,
          role: "Villager",
          lastProtectedRound: null,
          lastProtectedTargetPlayerId: null,
          guardUsedInGame: false,
          isBot: false
        }
      ],
      game: { phase: "DayVote", round: 1 }
    });
    expect(() =>
      engine.submitAction(room, "a", {
        roomCode: "TEST",
        actionType: "day-vote",
        targetPlayerId: "a",
        phase: "DayVote",
        round: 1
      })
    ).toThrow("INVALID_TARGET");

    const mayorRoom = baseRoom({
      players: room.players,
      game: { phase: "MayorElection", round: 1 }
    });
    expect(() =>
      engine.submitAction(mayorRoom, "a", {
        roomCode: "TEST",
        actionType: "mayor-vote",
        targetPlayerId: "a",
        phase: "MayorElection",
        round: 1
      })
    ).toThrow("INVALID_TARGET");
  });
});
