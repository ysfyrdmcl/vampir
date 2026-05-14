import type { ActionType, GamePhase } from "@vampir-koylu/shared";
import type { RoomState, PlayerState } from "../game/game-types.js";
import type { BotMemory } from "./bot-memory.js";
import type { BotLLMClient } from "./bot-llm-client.js";
import { getBotPersonalityCard, renderBotPersonalityPrompt } from "./bot-personality-cards.js";
import { buildBotWorldAwareness, renderBotWorldAwarenessPrompt } from "./bot-world-awareness.js";

export type BotTargetAdviceRequest = {
  room: RoomState;
  actor: PlayerState;
  memory: BotMemory;
  phase: GamePhase;
  actionType: ActionType;
  legalTargets: string[];
  fallbackOrder: string[];
};

export type BotTargetAdviceResult =
  | { ok: true; order: string[] }
  | { ok: false; reason: "no_world" | "llm_failed" | "invalid_response"; error?: string };

export class BotTargetAdvisor {
  constructor(private readonly deps: { llm: BotLLMClient }) {}

  async rankTargets(request: BotTargetAdviceRequest): Promise<BotTargetAdviceResult> {
    if (request.legalTargets.length <= 1) return { ok: true, order: [...request.legalTargets] };

    const world = buildBotWorldAwareness(request.room, request.actor.playerId, request.memory);
    if (!world) return { ok: false, reason: "no_world" };

    const legal = new Set(request.legalTargets);
    const personality = getBotPersonalityCard(request.actor.botPersonality ?? "quiet");
    const targetLines = request.legalTargets.map((id) => `${id}: ${playerName(request.room, id)}`).join("\n");

    const llm = await this.deps.llm.chat({
      responseFormat: "json_object",
      temperature: 0.2,
      maxOutputTokens: 240,
      messages: [
        {
          role: "developer",
          content: [
            "Vampir Koylu botu icin hedef siralamasi yap.",
            "Sadece verilen legal target id'lerini kullan.",
            "Yeni id uydurma.",
            "JSON dondur: {\"orderedTargetIds\":[\"id1\",\"id2\"]}."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            "[KISILIK]",
            renderBotPersonalityPrompt(personality),
            "",
            "[OYUN BILINCI]",
            renderBotWorldAwarenessPrompt(world),
            "",
            "[AKSIYON]",
            `${request.phase} / ${request.actionType}`,
            "",
            "[LEGAL TARGETS]",
            targetLines,
            "",
            "[FALLBACK ORDER]",
            request.fallbackOrder.join(", ")
          ].join("\n")
        }
      ]
    });

    if (!llm.ok) return { ok: false, reason: "llm_failed", error: llm.error ?? llm.reason };

    const parsed = parseOrderedTargetIds(llm.text);
    if (!parsed) return { ok: false, reason: "invalid_response", error: "Invalid target ranking JSON" };

    const advised = parsed.filter((id, index, arr) => legal.has(id) && arr.indexOf(id) === index);
    if (!advised.length) return { ok: false, reason: "invalid_response", error: "No legal target ids in advice" };

    return {
      ok: true,
      order: [...advised, ...request.fallbackOrder.filter((id) => legal.has(id) && !advised.includes(id))]
    };
  }
}

function parseOrderedTargetIds(text: string): string[] | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.orderedTargetIds)) return null;
    return parsed.orderedTargetIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim());
  } catch {
    return null;
  }
}

function playerName(room: RoomState, playerId: string): string {
  return room.players.find((p) => p.playerId === playerId)?.nickname ?? playerId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
