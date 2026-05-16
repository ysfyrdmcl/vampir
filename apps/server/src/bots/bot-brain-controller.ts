import type { BotSpeechEvent, BotSpeechIntent, BotSpeechTone } from "@vampir-koylu/shared";
import type { RoomState, PlayerState } from "../game/game-types.js";
import type { BotMemory } from "./bot-memory.js";
import type { BotLLMClient } from "./bot-llm-client.js";
import { BOT_SPEECH_POPUP_MS } from "./bot-speech-templates.js";
import { getBotPersonalityCard, renderBotPersonalityPrompt } from "./bot-personality-cards.js";
import { buildBotWorldAwareness, renderBotWorldAwarenessPrompt } from "./bot-world-awareness.js";
import type { BotShortTermMemoryStore } from "./bot-short-term-memory.js";
import type { BotLongTermMemory } from "./bot-long-term-memory.js";
import { activeSpeechRoleIds, messageReferencesInactiveRole } from "./bot-role-awareness.js";

export type BotBrainSpeechRequest = {
  room: RoomState;
  speaker: PlayerState;
  memory: BotMemory;
  intent: BotSpeechIntent;
  tone: BotSpeechTone;
  targetPlayerId?: string;
};

export type BotBrainSpeechResult =
  | { ok: true; event: BotSpeechEvent; fingerprint: string }
  | { ok: false; reason: "no_world" | "llm_failed" | "invalid_response"; error?: string };

type BotLLMSpeechJson = {
  message?: unknown;
  tone?: unknown;
  intent?: unknown;
  targetPlayerId?: unknown;
  memoryWrite?: unknown;
};

const VALID_TONES = new Set<BotSpeechTone>(["calm", "sharp", "neutral", "playful"]);
const VALID_INTENTS = new Set<BotSpeechIntent>([
  "self_defense",
  "accuse_soft",
  "analysis",
  "chaos",
  "execution_reaction",
  "hunter_reaction",
  "mayor_hint",
  "small_talk",
  "support_soft",
  "tie_reaction",
  "vote_hint",
  "generic_observation"
]);

export class BotBrainController {
  constructor(
    private readonly deps: {
      llm: BotLLMClient;
      shortTermMemory?: BotShortTermMemoryStore;
      longTermMemory?: BotLongTermMemory;
    }
  ) {}

  async generateSpeech(request: BotBrainSpeechRequest): Promise<BotBrainSpeechResult> {
    const world = buildBotWorldAwareness(request.room, request.speaker.playerId, request.memory);
    if (!world) return { ok: false, reason: "no_world" };

    const personality = getBotPersonalityCard(request.speaker.botPersonality ?? "quiet");
    const shortTermContext = this.deps.shortTermMemory?.renderContext(request.room.roomCode, request.speaker.playerId) ?? "";
    const recall = this.deps.longTermMemory
      ? await this.deps.longTermMemory.recall({
          roomCode: request.room.roomCode,
          botPlayerId: request.speaker.playerId,
          query: `${request.intent} ${request.targetPlayerId ?? ""} ${world.publicEvents.join(" ")}`,
          topK: 3,
          includeGlobal: true
        })
      : null;
    const recallContext = recall?.ok ? this.deps.longTermMemory?.renderRecallContext(recall.memories) ?? "" : "";

    const llm = await this.deps.llm.chat({
      responseFormat: "json_object",
      temperature: 0.7,
      maxOutputTokens: 260,
      messages: [
        {
          role: "developer",
          content: [
            "Sen Vampir Koylu oyununda bir bot karaktersin.",
            "Turkce, kisa ve oyun evreninde kal.",
            "En fazla iki cumle yaz.",
            "Gizli rol bilgisini dogrudan ifsa etme.",
            "Aktif roller disindaki rollere, Sherlock/dedektif/sorgu gibi role-specific imalara veya aktif olmayan koruma/baskan/avci/asik referanslarina deginme.",
            "Sadece JSON dondur: {\"message\":\"...\",\"tone\":\"calm|sharp|neutral|playful\",\"intent\":\"...\",\"targetPlayerId\":\"...\"}."
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
            "[KISA HAFIZA]",
            shortTermContext || "Yok",
            "",
            "[UZUN HAFIZA]",
            recallContext || "Yok",
            "",
            "[GOREV]",
            `Intent: ${request.intent}`,
            `Tone: ${request.tone}`,
            `Target player id: ${request.targetPlayerId ?? "yok"}`
          ].join("\n")
        }
      ]
    });

    if (!llm.ok) {
      return { ok: false, reason: "llm_failed", error: llm.error ?? llm.reason };
    }

    const parsed = parseSpeechJson(llm.text);
    if (!parsed) return { ok: false, reason: "invalid_response", error: "Invalid JSON response" };

    const activeRoles = activeSpeechRoleIds(request.room);
    const guarded = guardSpeechMessage(parsed.message, activeRoles);
    if (!guarded) return { ok: false, reason: "invalid_response", error: "Unsafe or empty message" };

    const tone = typeof parsed.tone === "string" && VALID_TONES.has(parsed.tone as BotSpeechTone) ? parsed.tone as BotSpeechTone : request.tone;
    const intent =
      typeof parsed.intent === "string" && VALID_INTENTS.has(parsed.intent as BotSpeechIntent) ? parsed.intent as BotSpeechIntent : request.intent;
    const targetPlayerId =
      typeof parsed.targetPlayerId === "string" && parsed.targetPlayerId.trim() ? parsed.targetPlayerId.trim() : request.targetPlayerId;

    return {
      ok: true,
      event: {
        roomCode: request.room.roomCode,
        phaseId: `${request.room.game.phase}:${request.room.game.round}`,
        speakerPlayerId: request.speaker.playerId,
        speakerName: request.speaker.nickname,
        message: guarded,
        tone,
        intent,
        targetPlayerId,
        durationMs: BOT_SPEECH_POPUP_MS,
        createdAt: Date.now()
      },
      fingerprint: speechFingerprint(guarded)
    };
  }
}

function parseSpeechJson(text: string): BotLLMSpeechJson | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null ? parsed as BotLLMSpeechJson : null;
  } catch {
    return null;
  }
}

function guardSpeechMessage(value: unknown, activeRoles: ReturnType<typeof activeSpeechRoleIds>): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  const lowered = compact.toLocaleLowerCase("tr-TR");
  const blocked = ["openai", "api", "model", "llm", "yapay zeka", "ben bir botum", "dedektifim", "ben vampirim"];
  if (blocked.some((word) => lowered.includes(word))) return null;
  if (messageReferencesInactiveRole(compact, activeRoles)) return null;
  return compact.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 180).trim();
}

function speechFingerprint(message: string): string {
  return message.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}
