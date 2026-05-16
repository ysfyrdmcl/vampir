import { describe, expect, it } from "vitest";
import { resolveDayVotes } from "../src/game/vote-resolver.js";
import type { GameActionEntry, PlayerState } from "../src/game/game-types.js";

const players: PlayerState[] = ["a", "b", "c", "d"].map((id) => ({
  playerId: id,
  nickname: id,
  deviceId: id,
  sessionToken: id,
  socketId: id,
  isConnected: true,
  isReady: true,
  isAlive: true,
  role: "Villager",
  lastProtectedRound: null,
  lastProtectedTargetPlayerId: null,
  guardUsedInGame: false,
  isBot: false
}));

function vote(actor: string, target: string): GameActionEntry {
  return { actorPlayerId: actor, targetPlayerId: target, actionType: "day-vote", round: 1 };
}

describe("day vote resolver", () => {
  it("resolves single winner", () => {
    const result = resolveDayVotes(players, [vote("a", "b"), vote("c", "b"), vote("d", "a")]);
    expect(result.executedPlayerId).toBe("b");
    expect(result.tiedTopCandidates).toEqual([]);
  });

  it("returns tie candidates on equal votes", () => {
    const result = resolveDayVotes(players, [vote("a", "b"), vote("c", "d"), vote("d", "b"), vote("b", "d")]);
    expect(result.executedPlayerId).toBeNull();
    expect(result.tiedTopCandidates.sort()).toEqual(["b", "d"]);
  });

  it("ignores votes outside canonical revote candidates", () => {
    const result = resolveDayVotes(
      players,
      [vote("a", "c"), vote("b", "c"), vote("c", "b"), vote("d", "b")],
      { allowedTargetIds: ["b", "d"] }
    );
    expect(result.executedPlayerId).toBe("b");
    expect(result.voteBreakdown.map((entry) => entry.playerId)).toEqual(["b"]);
  });
});
