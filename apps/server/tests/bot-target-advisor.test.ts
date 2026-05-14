import { resolveRuleSettings } from "@vampir-koylu/shared";
import { describe, expect, it } from "vitest";
import { createEmptyBotMemory } from "../src/bots/bot-memory.js";
import type { BotEmbeddingResult, BotLLMChatRequest, BotLLMChatResult, BotLLMClient } from "../src/bots/bot-llm-client.js";
import { BotTargetAdvisor } from "../src/bots/bot-target-advisor.js";
import type { PlayerState, RoomState } from "../src/game/game-types.js";

function player(id: string, isBot = false): PlayerState {
  return {
    playerId: id,
    nickname: id.toUpperCase(),
    deviceId: isBot ? `bot:${id}` : `d-${id}`,
    sessionToken: "s",
    socketId: isBot ? "" : `sk-${id}`,
    isConnected: true,
    isReady: true,
    isAlive: true,
    role: "Villager",
    lastProtectedRound: null,
    lastProtectedTargetPlayerId: null,
    guardUsedInGame: false,
    isBot,
    botPersonality: isBot ? "analyst" : undefined,
    botIntelligence: isBot ? "balanced" : undefined
  };
}

function room(players: PlayerState[]): RoomState {
  return {
    roomCode: "R1",
    status: "InGame",
    hostPlayerId: players[0]?.playerId ?? "b1",
    players,
    game: {
      phase: "DayVote",
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

describe("BotTargetAdvisor", () => {
  it("accepts legal LLM ordering and appends omitted fallback targets", async () => {
    const r = room([player("b1", true), player("p1"), player("p2"), player("p3")]);
    const advisor = new BotTargetAdvisor({ llm: fakeLLM({ orderedTargetIds: ["p2", "p1"] }) });

    const result = await advisor.rankTargets({
      room: r,
      actor: r.players[0],
      memory: createEmptyBotMemory(),
      phase: "DayVote",
      actionType: "day-vote",
      legalTargets: ["p1", "p2", "p3"],
      fallbackOrder: ["p1", "p2", "p3"]
    });

    expect(result).toEqual({ ok: true, order: ["p2", "p1", "p3"] });
  });

  it("filters illegal and duplicate target ids", async () => {
    const r = room([player("b1", true), player("p1"), player("p2")]);
    const advisor = new BotTargetAdvisor({ llm: fakeLLM({ orderedTargetIds: ["illegal", "p2", "p2"] }) });

    const result = await advisor.rankTargets({
      room: r,
      actor: r.players[0],
      memory: createEmptyBotMemory(),
      phase: "DayVote",
      actionType: "day-vote",
      legalTargets: ["p1", "p2"],
      fallbackOrder: ["p1", "p2"]
    });

    expect(result).toEqual({ ok: true, order: ["p2", "p1"] });
  });

  it("returns controlled failure when no legal ids are advised", async () => {
    const r = room([player("b1", true), player("p1"), player("p2")]);
    const advisor = new BotTargetAdvisor({ llm: fakeLLM({ orderedTargetIds: ["bad"] }) });

    const result = await advisor.rankTargets({
      room: r,
      actor: r.players[0],
      memory: createEmptyBotMemory(),
      phase: "DayVote",
      actionType: "day-vote",
      legalTargets: ["p1", "p2"],
      fallbackOrder: ["p1", "p2"]
    });

    expect(result).toMatchObject({ ok: false, reason: "invalid_response" });
  });

  it("maps invalid JSON and provider failures", async () => {
    const r = room([player("b1", true), player("p1"), player("p2")]);
    const invalid = new BotTargetAdvisor({ llm: fakeLLMText("not json") });
    const failed = new BotTargetAdvisor({ llm: fakeLLMResult({ ok: false, reason: "disabled" }) });
    const request = {
      room: r,
      actor: r.players[0],
      memory: createEmptyBotMemory(),
      phase: "DayVote" as const,
      actionType: "day-vote" as const,
      legalTargets: ["p1", "p2"],
      fallbackOrder: ["p1", "p2"]
    };

    await expect(invalid.rankTargets(request)).resolves.toMatchObject({ ok: false, reason: "invalid_response" });
    await expect(failed.rankTargets(request)).resolves.toEqual({ ok: false, reason: "llm_failed", error: "disabled" });
  });
});

function fakeLLM(payload: unknown): BotLLMClient {
  return fakeLLMText(JSON.stringify(payload));
}

function fakeLLMText(text: string): BotLLMClient {
  return fakeLLMResult({ ok: true, text, model: "fake" });
}

function fakeLLMResult(result: BotLLMChatResult): BotLLMClient {
  return {
    async chat(_request: BotLLMChatRequest): Promise<BotLLMChatResult> {
      return result;
    },
    async embed(_input: string): Promise<BotEmbeddingResult> {
      return { ok: false, reason: "disabled" };
    }
  };
}
