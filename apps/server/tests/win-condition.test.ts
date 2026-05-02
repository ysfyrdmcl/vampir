import { describe, expect, it } from "vitest";
import { calculateWinner } from "../src/game/win-condition.js";
import type { PlayerState } from "../src/game/game-types.js";

function alive(role: PlayerState["role"]): PlayerState {
  return {
    playerId: Math.random().toString(36),
    nickname: "x",
    deviceId: "d",
    sessionToken: "s",
    socketId: "k",
    isConnected: true,
    isAlive: true,
    role,
    lastProtectedRound: null
  };
}

describe("win conditions", () => {
  it("villagers win when all vampires eliminated", () => {
    expect(calculateWinner([alive("Villager"), alive("Doctor"), alive("Detective")])).toBe("Villagers");
  });

  it("vampires win when vampire count >= villager side", () => {
    expect(calculateWinner([alive("Vampire"), alive("Vampire"), alive("Villager"), alive("Doctor")])).toBe("Vampires");
  });

  it("no winner in ongoing state", () => {
    expect(calculateWinner([alive("Vampire"), alive("Villager"), alive("Doctor"), alive("Detective")])).toBeNull();
  });
});

