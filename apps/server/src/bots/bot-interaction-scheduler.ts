import type { BotSpeechEvent, BotSpeechIntent, BotSpeechTone } from "@vampir-koylu/shared";
import type { RoomState, PlayerState } from "../game/game-types.js";

export type BotInteractionTurn = {
  speakerPlayerId: string;
  intent: BotSpeechIntent;
  tone: BotSpeechTone;
  targetPlayerId?: string;
  reason: "accusation_response" | "vote_response" | "gossip_response";
};

export class BotInteractionScheduler {
  constructor(private readonly options: { maxChainLength?: number } = {}) {}

  planReaction(room: RoomState, trigger: BotSpeechEvent, usedSpeakerPlayerIds: ReadonlySet<string> = new Set()): BotInteractionTurn[] {
    const maxChainLength = this.options.maxChainLength ?? 2;
    if (maxChainLength <= 1) return [];
    if (!["accuse_soft", "vote_hint", "analysis"].includes(trigger.intent)) return [];

    const responder = this.pickResponder(room, trigger, usedSpeakerPlayerIds);
    if (!responder) return [];

    const sameTarget = trigger.targetPlayerId && room.players.some((p) => p.playerId === trigger.targetPlayerId && p.isAlive)
      ? trigger.targetPlayerId
      : undefined;
    const intent: BotSpeechIntent = trigger.intent === "vote_hint" ? "analysis" : "support_soft";
    const tone: BotSpeechTone = intent === "support_soft" ? "calm" : "neutral";

    const turn: BotInteractionTurn = {
      speakerPlayerId: responder.playerId,
      intent,
      tone,
      targetPlayerId: sameTarget,
      reason: trigger.intent === "vote_hint" ? "vote_response" : "accusation_response"
    };
    return [turn].slice(0, maxChainLength - 1);
  }

  private pickResponder(room: RoomState, trigger: BotSpeechEvent, usedSpeakerPlayerIds: ReadonlySet<string>): PlayerState | null {
    return (
      room.players.find(
        (p) =>
          p.isBot &&
          p.isAlive &&
          p.role &&
          p.playerId !== trigger.speakerPlayerId &&
          p.playerId !== trigger.targetPlayerId &&
          !usedSpeakerPlayerIds.has(p.playerId)
      ) ?? null
    );
  }
}
