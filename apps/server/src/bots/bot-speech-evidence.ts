import type { BotSpeechEvent } from "@vampir-koylu/shared";
import type { RoomState } from "../game/game-types.js";

export type BotSpeechEvidenceClaim =
  | "target_spoke_often"
  | "target_was_quiet"
  | "target_changed_vote"
  | "target_voted_in_tie"
  | "target_accused_someone"
  | "target_has_no_visible_speech";

export type BotSpeechEvidence = {
  targetPlayerId?: string;
  targetSpeechCount: number;
  targetRecentPublicMessages: string[];
  hasEnoughSpeechEvidence: boolean;
  hasEnoughVoteEvidence: boolean;
  safeClaims: BotSpeechEvidenceClaim[];
};

export function buildBotSpeechEvidence(
  room: RoomState,
  targetPlayerId: string | undefined,
  publicSpeechHistory: readonly BotSpeechEvent[] = []
): BotSpeechEvidence {
  const targetMessages = targetPlayerId
    ? publicSpeechHistory
        .filter((event) => event.speakerPlayerId === targetPlayerId)
        .slice(-3)
        .map((event) => event.message)
    : [];
  const safeClaims: BotSpeechEvidenceClaim[] = [];
  const targetSpeechCount = targetPlayerId
    ? publicSpeechHistory.filter((event) => event.speakerPlayerId === targetPlayerId).length
    : 0;

  if (targetPlayerId && targetSpeechCount === 0) safeClaims.push("target_was_quiet", "target_has_no_visible_speech");
  if (targetSpeechCount >= 2) safeClaims.push("target_spoke_often");
  if (targetMessages.some((message) => /suç|suc|şüphe|suphe|vampir/i.test(message))) {
    safeClaims.push("target_accused_someone");
  }
  if (targetPlayerId && room.game.tieCountInRound > 0 && (room.game.revoteCandidateIds ?? []).includes(targetPlayerId)) {
    safeClaims.push("target_voted_in_tie");
  }

  return {
    targetPlayerId,
    targetSpeechCount,
    targetRecentPublicMessages: targetMessages,
    hasEnoughSpeechEvidence: targetSpeechCount > 0,
    hasEnoughVoteEvidence: safeClaims.includes("target_voted_in_tie") || safeClaims.includes("target_changed_vote"),
    safeClaims
  };
}

export function messageViolatesSpeechEvidence(message: string, evidence: BotSpeechEvidence | null | undefined): string | null {
  const lowered = message.toLocaleLowerCase("tr-TR");
  const claims = new Set(evidence?.safeClaims ?? []);
  if (/(çok konuş|cok konuş|cok konus|sürekli konuş|surekli konus|dedikleri tutarlı değil|dedikleri tutarli degil|çelişkili konuş|celiskili konus)/i.test(lowered) && !claims.has("target_spoke_often")) {
    return "missing_speech_evidence";
  }
  if (/(oy değişt|oy degist|yön değiştir|yon degist|oyları boz|oylari boz|oyların gölgesinde|oylarin golgesinde|dünkü oy|dunku oy)/i.test(lowered) && !evidence?.hasEnoughVoteEvidence) {
    return "missing_vote_evidence";
  }
  if (/(cevap veriyor|hiçbir şeyi gerçekten açıklamıyor|hicbir seyi gercekten aciklamiyor)/i.test(lowered) && !evidence?.hasEnoughSpeechEvidence) {
    return "missing_speech_evidence";
  }
  return null;
}
