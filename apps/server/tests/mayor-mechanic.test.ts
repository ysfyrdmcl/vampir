import { describe, expect, it } from "vitest";
import { resolveRuleSettings, type Role, type RolePresetId } from "@vampir-koylu/shared";
import { legalTargetsForBot } from "../src/bots/bot-targeting.js";
import { GameEngine } from "../src/game/game-engine.js";
import type { PlayerState, RoomState } from "../src/game/game-types.js";
import { resolveDayVotes } from "../src/game/vote-resolver.js";

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
    isBot: true,
    ...overrides
  };
}

function makeRoom(opts: {
  players: PlayerState[];
  phase: RoomState["game"]["phase"];
  rolePreset: RolePresetId;
  rules?: Partial<import("@vampir-koylu/shared").RuleSettings>;
}): RoomState {
  return {
    roomCode: "M",
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
      gameMode: "SafeFirstNight",
      rolePreset: opts.rolePreset,
      rules: resolveRuleSettings("SafeFirstNight", opts.rules),
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

describe("mayor mechanic", () => {
  const engine = new GameEngine();

  it("legalTargetsForBot in MayorElection excludes self", () => {
    const players = Array.from({ length: 9 }, (_, i) => makePlayer(`p${i}`, "Villager"));
    const room = makeRoom({ players, phase: "MayorElection", rolePreset: "socialChaos", rules: { mayorEnabled: true } });
    const legal = legalTargetsForBot(room, "MayorElection", "p3");
    expect(legal).not.toContain("p3");
    expect(legal.length).toBe(8);
    expect(legal).toContain("p0");
  });

  it("submitAction rejects mayor-vote targeting self", () => {
    const players = Array.from({ length: 9 }, (_, i) => makePlayer(`p${i}`, "Villager"));
    const room = makeRoom({ players, phase: "MayorElection", rolePreset: "socialChaos", rules: { mayorEnabled: true } });
    expect(() =>
      engine.submitAction(room, "p0", {
        actionType: "mayor-vote",
        phase: "MayorElection",
        round: 1,
        targetPlayerId: "p0"
      })
    ).toThrow("INVALID_TARGET");
  });

  it("MayorElection tick writes mayorPlayerId from plurality mayor-votes", () => {
    const players = Array.from({ length: 9 }, (_, i) => makePlayer(`p${i}`, "Villager"));
    const room = makeRoom({ players, phase: "MayorElection", rolePreset: "socialChaos", rules: { mayorEnabled: true } });
    for (let i = 1; i < 9; i += 1) {
      room.game.actions.push({
        actorPlayerId: `p${i}`,
        targetPlayerId: "p0",
        actionType: "mayor-vote",
        round: 1
      });
    }
    room.game.actions.push({
      actorPlayerId: "p0",
      targetPlayerId: "p1",
      actionType: "mayor-vote",
      round: 1
    });
    engine.tick(room);
    expect(room.game.mayorPlayerId).toBe("p0");
    expect(room.game.phase).toBe("DayDiscussion");
    expect(room.game.actions).toEqual([]);
  });

  it("resolveDayVotes: mayor doubles weight only for day-vote, not mayor-vote", () => {
    const players: PlayerState[] = ["a", "b", "c"].map((id) => makePlayer(id, "Villager", { isBot: false }));
    const day = resolveDayVotes(
      players,
      [{ actorPlayerId: "a", targetPlayerId: "b", actionType: "day-vote", round: 1 }],
      { mayorPlayerId: "a" }
    );
    expect(day.voteBreakdown.find((e) => e.playerId === "b")?.votes).toBe(2);

    const mayorBallot = resolveDayVotes(
      players,
      [{ actorPlayerId: "a", targetPlayerId: "b", actionType: "mayor-vote", round: 1 }],
      { mayorPlayerId: "a", voteActionType: "mayor-vote" }
    );
    expect(mayorBallot.voteBreakdown.find((e) => e.playerId === "b")?.votes).toBe(1);
  });
});
