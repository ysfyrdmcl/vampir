import { describe, expect, it } from "vitest";
import { resolveRuleSettings, type Role } from "@vampir-koylu/shared";
import { buildGameResultEvents, captureResultEventBaseline } from "../src/game/game-result-events.js";
import type { PlayerState, RoomState } from "../src/game/game-types.js";

function player(id: string, role: Role, alive = true): PlayerState {
  return {
    playerId: id,
    nickname: id,
    deviceId: `d-${id}`,
    sessionToken: `s-${id}`,
    socketId: `sk-${id}`,
    isConnected: true,
    isReady: false,
    isAlive: alive,
    role,
    lastProtectedRound: null,
    lastProtectedTargetPlayerId: null,
    guardUsedInGame: false,
    isBot: false
  };
}

function room(players: PlayerState[], phase: RoomState["game"]["phase"]): RoomState {
  return {
    roomCode: "R",
    status: "InGame",
    hostPlayerId: players[0].playerId,
    players,
    game: {
      phase,
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
      rules: resolveRuleSettings("Classic"),
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
    createdAt: 0,
    lastActivityAt: 0,
    cleanupAt: null
  };
}

describe("buildGameResultEvents", () => {
  it("announces night lover chain deaths", () => {
    const r = room([player("v", "Vampire"), player("a", "Villager"), player("b", "Villager")], "NightResolve");
    const before = captureResultEventBaseline(r);
    r.players[1].isAlive = false;
    r.players[2].isAlive = false;
    r.game.phase = "DayStart";
    r.game.lastEliminationSummary = { source: "Night", playerId: "a" };
    const events = buildGameResultEvents(before, r);
    expect(events[0].kind).toBe("night");
    expect(events[0].message).toContain("Aşık bağı");
    expect(events[0].playerIds).toEqual(["a", "b"]);
  });

  it("announces night deaths even when they end the game", () => {
    const r = room([player("v", "Vampire"), player("a", "Villager")], "NightResolve");
    const before = captureResultEventBaseline(r);
    r.players[1].isAlive = false;
    r.game.phase = "GameOver";
    r.game.winner = "Vampires";
    r.game.lastEliminationSummary = { source: "Night", playerId: "a" };
    const events = buildGameResultEvents(before, r);
    expect(events[0]).toMatchObject({ kind: "night", playerIds: ["a"] });
  });

  it("uses a stable result id for the same night death outcome", () => {
    const r = room([player("v", "Vampire"), player("a", "Villager")], "NightResolve");
    const before = captureResultEventBaseline(r);
    r.players[1].isAlive = false;
    r.game.phase = "DayStart";
    r.game.lastEliminationSummary = { source: "Night", playerId: "a" };
    const first = buildGameResultEvents(before, r)[0];
    const second = buildGameResultEvents(before, r)[0];
    expect(first.id).toBe("result:R:1:night:a:DayStart");
    expect(second.id).toBe(first.id);
  });

  it("announces mayor selection", () => {
    const r = room([player("a", "Villager"), player("b", "Villager")], "MayorElection");
    const before = captureResultEventBaseline(r);
    r.game.phase = "DayDiscussion";
    r.game.mayorPlayerId = "b";
    const events = buildGameResultEvents(before, r);
    expect(events[0]).toMatchObject({ kind: "mayor", playerIds: ["b"] });
  });

  it("announces canonical revote candidates on tie", () => {
    const r = room([player("a", "Villager"), player("b", "Villager"), player("c", "Villager")], "DayVote");
    const before = captureResultEventBaseline(r);
    r.game.phase = "DayDiscussion";
    r.game.tieCountInRound = 1;
    r.game.revoteCandidateIds = ["b", "c"];
    r.game.lastDayVoteSummary = {
      entries: [{ playerId: "b", votes: 2 }, { playerId: "c", votes: 2 }],
      executedPlayerId: null,
      tiedTopCandidates: ["b", "c"],
      revoteCandidateIds: ["b", "c"]
    };
    const events = buildGameResultEvents(before, r);
    expect(events[0]).toMatchObject({ kind: "tie", playerIds: ["b", "c"] });
    expect(events[0].message).toContain("Yeni oylama sadece bu adaylar arasında");
  });

  it("announces mayor selection before guard protection when guard phase follows", () => {
    const r = room([player("a", "Villager"), player("b", "Villager")], "MayorElection");
    const before = captureResultEventBaseline(r);
    r.game.phase = "GuardProtect";
    r.game.mayorPlayerId = "b";
    const events = buildGameResultEvents(before, r);
    expect(events[0]).toMatchObject({ kind: "mayor", playerIds: ["b"] });
  });

  it("does not announce game over because GameOverScreen handles it", () => {
    const r = room([player("v", "Vampire"), player("a", "Villager")], "WinCheck");
    const before = captureResultEventBaseline(r);
    r.game.phase = "GameOver";
    r.game.winner = "Vampires";
    const events = buildGameResultEvents(before, r);
    expect(events).toEqual([]);
  });
});
