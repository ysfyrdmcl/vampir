import { resolveRuleSettings, type Role } from "@vampir-koylu/shared";
import { describe, expect, it } from "vitest";
import { BotInteractionScheduler } from "../src/bots/bot-interaction-scheduler.js";
import type { PlayerState, RoomState } from "../src/game/game-types.js";

function player(id: string, role: Role = "Villager"): PlayerState {
  return {
    playerId: id,
    nickname: id,
    deviceId: `bot:${id}`,
    sessionToken: "s",
    socketId: "",
    isConnected: true,
    isReady: true,
    isAlive: true,
    role,
    lastProtectedRound: null,
    lastProtectedTargetPlayerId: null,
    guardUsedInGame: false,
    isBot: true
  };
}

function room(players: PlayerState[]): RoomState {
  return {
    roomCode: "R1",
    status: "InGame",
    hostPlayerId: "b1",
    players,
    game: {
      phase: "DayDiscussion",
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

describe("BotInteractionScheduler", () => {
  it("plans one reaction to an accusation without reusing speaker or target", () => {
    const scheduler = new BotInteractionScheduler({ maxChainLength: 2 });
    const plan = scheduler.planReaction(room([player("b1"), player("b2"), player("p1")]), {
      roomCode: "R1",
      phaseId: "DayDiscussion:1",
      speakerPlayerId: "b1",
      speakerName: "b1",
      message: "p1 supheli",
      tone: "sharp",
      intent: "accuse_soft",
      targetPlayerId: "p1",
      durationMs: 1,
      createdAt: 1
    });

    expect(plan).toEqual([{ speakerPlayerId: "b2", intent: "support_soft", tone: "calm", targetPlayerId: "p1", reason: "accusation_response" }]);
  });

  it("respects chain length and unsupported intents", () => {
    const scheduler = new BotInteractionScheduler({ maxChainLength: 1 });
    const base = {
      roomCode: "R1",
      phaseId: "DayDiscussion:1",
      speakerPlayerId: "b1",
      speakerName: "b1",
      message: "selam",
      tone: "calm" as const,
      durationMs: 1,
      createdAt: 1
    };

    expect(scheduler.planReaction(room([player("b1"), player("b2")]), { ...base, intent: "accuse_soft" })).toEqual([]);
    expect(new BotInteractionScheduler({ maxChainLength: 2 }).planReaction(room([player("b1"), player("b2")]), { ...base, intent: "small_talk" })).toEqual([]);
  });
});
