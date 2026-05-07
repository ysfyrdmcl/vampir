import { describe, expect, it } from "vitest";
import { resolveRuleSettings } from "@vampir-koylu/shared";
import { createEmptyBotMemory } from "../src/bots/bot-memory.js";
import { pickRankedBotTargets, scoreBotTarget } from "../src/bots/bot-targeting.js";
import type { RoomState } from "../src/game/game-types.js";

const rules = resolveRuleSettings("Classic", {});

function baseRoom(overrides: { players: RoomState["players"]; game?: Partial<RoomState["game"]> }): RoomState {
  const gameDefaults: RoomState["game"] = {
    phase: "DayVote",
    round: 2,
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
  const gameOverrides = overrides.game ?? {};
  return {
    roomCode: "T",
    status: "InGame",
    hostPlayerId: "h1",
    players: overrides.players,
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

function player(
  id: string,
  role: RoomState["players"][0]["role"],
  isBot: boolean,
  intel?: "random" | "balanced" | "deceptive"
): RoomState["players"][0] {
  return {
    playerId: id,
    nickname: id,
    deviceId: isBot ? `bot:${id}` : `d:${id}`,
    sessionToken: "t",
    socketId: "",
    isConnected: true,
    isReady: true,
    isAlive: true,
    role,
    lastProtectedRound: null,
    lastProtectedTargetPlayerId: null,
    guardUsedInGame: false,
    isBot,
    botIntelligence: intel
  };
}

describe("scoreBotTarget + pickRankedBotTargets", () => {
  const flatRng = () => 0.5;

  it("balanced detective ranks among legal inspect targets", () => {
    const room = baseRoom({
      players: [player("d1", "Detective", true, "balanced"), player("a", "Villager", false), player("b", "Villager", false)],
      game: {
        phase: "DetectiveInspect",
        detectiveInspectedTargets: { d1: ["a"] }
      }
    });
    const mem = createEmptyBotMemory();
    const ranked = pickRankedBotTargets(room, "DetectiveInspect", "d1", "balanced", mem, ["b"], flatRng);
    expect(ranked).toEqual(["b"]);
  });

  it("deceptive vampire day-vote ranks villagers above vampire teammates", () => {
    const room = baseRoom({
      players: [
        player("v1", "Vampire", true, "deceptive"),
        player("v2", "Vampire", false),
        player("c1", "Villager", false)
      ],
      game: { phase: "DayVote", round: 1 }
    });
    const mem = createEmptyBotMemory();
    const ranked = pickRankedBotTargets(room, "DayVote", "v1", "deceptive", mem, ["v2", "c1"], flatRng);
    expect(ranked[0]).toBe("c1");
    expect(scoreBotTarget(room, "DayVote", "v1", "v2", "deceptive", mem, flatRng)).toBeLessThan(
      scoreBotTarget(room, "DayVote", "v1", "c1", "deceptive", mem, flatRng)
    );
  });

  it("villager with known vampire memory boosts that target for day vote (balanced)", () => {
    const room = baseRoom({
      players: [player("x", "Villager", true, "balanced"), player("vamp", "Vampire", false), player("inn", "Villager", false)],
      game: { phase: "DayVote", round: 2 }
    });
    const mem = createEmptyBotMemory();
    mem.knownVampires.push("vamp");
    const sVamp = scoreBotTarget(room, "DayVote", "x", "vamp", "balanced", mem, flatRng);
    const sInn = scoreBotTarget(room, "DayVote", "x", "inn", "balanced", mem, flatRng);
    expect(sVamp).toBeGreaterThan(sInn);
  });
});
