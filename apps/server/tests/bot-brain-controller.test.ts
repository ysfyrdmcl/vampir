import { resolveRuleSettings } from "@vampir-koylu/shared";
import { describe, expect, it } from "vitest";
import { BotBrainController } from "../src/bots/bot-brain-controller.js";
import { createEmptyBotMemory } from "../src/bots/bot-memory.js";
import type { BotEmbeddingResult, BotLLMChatRequest, BotLLMChatResult, BotLLMClient } from "../src/bots/bot-llm-client.js";
import type { PlayerState, RoomState } from "../src/game/game-types.js";

function player(id: string): PlayerState {
  return {
    playerId: id,
    nickname: id.toUpperCase(),
    deviceId: `bot:${id}`,
    sessionToken: "s",
    socketId: "",
    isConnected: true,
    isReady: true,
    isAlive: true,
    role: "Villager",
    lastProtectedRound: null,
    lastProtectedTargetPlayerId: null,
    guardUsedInGame: false,
    isBot: true,
    botPersonality: "analyst",
    botIntelligence: "balanced"
  };
}

function room(players: PlayerState[]): RoomState {
  return {
    roomCode: "R1",
    status: "InGame",
    hostPlayerId: players[0]?.playerId ?? "b1",
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

describe("BotBrainController", () => {
  it("generates a guarded speech event from JSON LLM output", async () => {
    const llm = fakeLLM({ ok: true, text: JSON.stringify({ message: "B1 fazla sessiz kaldı.", tone: "sharp" }), model: "fake" });
    const speaker = player("b1");
    const brain = new BotBrainController({ llm });

    const result = await brain.generateSpeech({
      room: room([speaker, player("p1")]),
      speaker,
      memory: createEmptyBotMemory(),
      intent: "analysis",
      tone: "calm",
      targetPlayerId: "p1"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.message).toBe("B1 fazla sessiz kaldı.");
      expect(result.event.tone).toBe("sharp");
      expect(result.event.intent).toBe("analysis");
      expect(result.event.targetPlayerId).toBe("p1");
    }
  });

  it("falls back when LLM output is invalid or unsafe", async () => {
    const speaker = player("b1");
    const brain = new BotBrainController({
      llm: fakeLLM({ ok: true, text: JSON.stringify({ message: "Ben bir botum ve OpenAI modeliyim." }), model: "fake" })
    });

    const result = await brain.generateSpeech({
      room: room([speaker]),
      speaker,
      memory: createEmptyBotMemory(),
      intent: "small_talk",
      tone: "neutral"
    });

    expect(result).toMatchObject({ ok: false, reason: "invalid_response" });
  });

  it("maps LLM failures without throwing", async () => {
    const speaker = player("b1");
    const brain = new BotBrainController({ llm: fakeLLM({ ok: false, reason: "disabled" }) });

    const result = await brain.generateSpeech({
      room: room([speaker]),
      speaker,
      memory: createEmptyBotMemory(),
      intent: "small_talk",
      tone: "neutral"
    });

    expect(result).toEqual({ ok: false, reason: "llm_failed", error: "disabled" });
  });
});

function fakeLLM(chatResult: BotLLMChatResult): BotLLMClient {
  return {
    async chat(_request: BotLLMChatRequest): Promise<BotLLMChatResult> {
      return chatResult;
    },
    async embed(_input: string): Promise<BotEmbeddingResult> {
      return { ok: false, reason: "disabled" };
    }
  };
}
