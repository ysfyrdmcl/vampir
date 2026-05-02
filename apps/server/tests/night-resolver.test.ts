import { describe, expect, it } from "vitest";
import { resolveNight } from "../src/game/night-resolver.js";
import type { GameActionEntry, PlayerState } from "../src/game/game-types.js";

const p = (id: string, role: PlayerState["role"], alive = true): PlayerState => ({
  playerId: id,
  nickname: id,
  deviceId: id,
  sessionToken: id,
  socketId: id,
  isConnected: true,
  isAlive: alive,
  role,
  lastProtectedRound: null
});

describe("night resolver", () => {
  it("kills vampire target when not protected", () => {
    const players = [p("v1", "Vampire"), p("k1", "Villager"), p("d1", "Doctor"), p("x", "Detective")];
    const actions: GameActionEntry[] = [{ actorPlayerId: "v1", targetPlayerId: "k1", actionType: "vampire-target", round: 1 }];
    const result = resolveNight(players, actions, 1);
    expect(result.killedPlayerId).toBe("k1");
  });

  it("blocks kill when doctor protects target", () => {
    const players = [p("v1", "Vampire"), p("k1", "Villager"), p("d1", "Doctor"), p("x", "Detective")];
    const actions: GameActionEntry[] = [
      { actorPlayerId: "v1", targetPlayerId: "k1", actionType: "vampire-target", round: 1 },
      { actorPlayerId: "d1", targetPlayerId: "k1", actionType: "doctor-protect", round: 1 }
    ];
    const result = resolveNight(players, actions, 1);
    expect(result.killedPlayerId).toBeNull();
  });
});

