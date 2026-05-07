import type { ActionSubmission, BotSpeechIntent } from "@vampir-koylu/shared";
import { NO_LYNCH_TARGET } from "./bot-types.js";

/**
 * Server-only per-bot recall for targeting (BOT-D MVP). Never sent to clients.
 * `speechCountThisDay` / `speechDayTrackedRound` support per-bot daily speech caps (BOT-E).
 */
export type BotMemory = {
  inspectedPlayerIds: string[];
  knownNonVampires: string[];
  knownVampires: string[];
  lastProtectedPlayerId?: string;
  lastVotedPlayerId?: string;
  suspicionByPlayerId: Record<string, number>;
  trustByPlayerId: Record<string, number>;
  lastSpeechPhaseId?: string;
  lastSpeechIntent?: BotSpeechIntent;
  lastSpeechTargetId?: string;
  recentSpeechTemplateIds: string[];
  recentSpeechFingerprints: string[];
  speechCountThisPhase: number;
  /** Resets when `speechDayTrackedRound` !== current game round (day cycle). */
  speechCountThisDay: number;
  speechDayTrackedRound: number;
};

export function createEmptyBotMemory(): BotMemory {
  return {
    inspectedPlayerIds: [],
    knownNonVampires: [],
    knownVampires: [],
    suspicionByPlayerId: {},
    trustByPlayerId: {},
    recentSpeechTemplateIds: [],
    recentSpeechFingerprints: [],
    speechCountThisPhase: 0,
    speechCountThisDay: 0,
    speechDayTrackedRound: -1
  };
}

const KEY_SEP = "\u001e";

function storeKey(roomCode: string, botPlayerId: string): string {
  return `${roomCode}${KEY_SEP}${botPlayerId}`;
}

export class BotMemoryStore {
  private readonly map = new Map<string, BotMemory>();

  get(roomCode: string, botPlayerId: string): BotMemory {
    const k = storeKey(roomCode, botPlayerId);
    let m = this.map.get(k);
    if (!m) {
      m = createEmptyBotMemory();
      this.map.set(k, m);
    }
    return m;
  }

  clearRoom(roomCode: string): void {
    const prefix = `${roomCode}${KEY_SEP}`;
    for (const k of [...this.map.keys()]) {
      if (k.startsWith(prefix)) this.map.delete(k);
    }
  }

  removeBot(roomCode: string, botPlayerId: string): void {
    this.map.delete(storeKey(roomCode, botPlayerId));
  }

  /** New match: drop all recall for bots in this room. */
  resetForNewGame(roomCode: string): void {
    this.clearRoom(roomCode);
  }

  onPhaseAdvanced(room: { roomCode: string; players: { playerId: string; isBot: boolean }[]; game: { phase: string; round: number } }): void {
    const phaseTag = `${room.game.phase}:${room.game.round}`;
    for (const p of room.players) {
      if (!p.isBot) continue;
      const m = this.map.get(storeKey(room.roomCode, p.playerId));
      if (!m) continue;
      if (m.speechDayTrackedRound !== room.game.round) {
        m.speechDayTrackedRound = room.game.round;
        m.speechCountThisDay = 0;
      }
      if (m.lastSpeechPhaseId !== phaseTag) {
        m.lastSpeechPhaseId = phaseTag;
        m.speechCountThisPhase = 0;
      }
    }
  }

  onBotSpeech(
    roomCode: string,
    botPlayerId: string,
    intent: BotSpeechIntent,
    targetPlayerId?: string,
    templateId?: string,
    fingerprint?: string
  ): void {
    const m = this.get(roomCode, botPlayerId);
    m.speechCountThisPhase += 1;
    m.speechCountThisDay += 1;
    m.lastSpeechIntent = intent;
    m.lastSpeechTargetId = targetPlayerId;
    if (templateId) {
      m.recentSpeechTemplateIds = [templateId, ...m.recentSpeechTemplateIds.filter((id) => id !== templateId)].slice(0, 10);
    }
    if (fingerprint) {
      m.recentSpeechFingerprints = [fingerprint, ...m.recentSpeechFingerprints.filter((fp) => fp !== fingerprint)].slice(0, 10);
    }
    // BOT-D: speech accuse → suspicion; speech support → trust (vote_hint does not bump scores here).
    if (intent === "accuse_soft" && targetPlayerId) {
      m.suspicionByPlayerId[targetPlayerId] = (m.suspicionByPlayerId[targetPlayerId] ?? 0) + 1;
    }
    if (intent === "support_soft" && targetPlayerId) {
      m.trustByPlayerId[targetPlayerId] = (m.trustByPlayerId[targetPlayerId] ?? 0) + 1;
    }
  }

  onBotActionSubmitted(roomCode: string, botPlayerId: string, submission: ActionSubmission, targetPlayerId: string): void {
    const m = this.get(roomCode, botPlayerId);
    switch (submission.actionType) {
      case "detective-inspect": {
        if (!m.inspectedPlayerIds.includes(targetPlayerId)) {
          m.inspectedPlayerIds.push(targetPlayerId);
        }
        break;
      }
      case "doctor-protect": {
        m.lastProtectedPlayerId = targetPlayerId;
        m.trustByPlayerId[targetPlayerId] = (m.trustByPlayerId[targetPlayerId] ?? 0) + 2;
        break;
      }
      case "day-vote": {
        if (targetPlayerId !== NO_LYNCH_TARGET) {
          m.lastVotedPlayerId = targetPlayerId;
          m.suspicionByPlayerId[targetPlayerId] = (m.suspicionByPlayerId[targetPlayerId] ?? 0) + 2;
        }
        break;
      }
      default:
        break;
    }
  }

  applyDetectivePrivateResult(
    roomCode: string,
    detectivePlayerId: string,
    targetPlayerId: string,
    result: "Vampire" | "NotVampire"
  ): void {
    const m = this.get(roomCode, detectivePlayerId);
    if (!m.inspectedPlayerIds.includes(targetPlayerId)) {
      m.inspectedPlayerIds.push(targetPlayerId);
    }
    if (result === "Vampire") {
      if (!m.knownVampires.includes(targetPlayerId)) m.knownVampires.push(targetPlayerId);
      m.knownNonVampires = m.knownNonVampires.filter((id) => id !== targetPlayerId);
    } else {
      if (!m.knownNonVampires.includes(targetPlayerId)) m.knownNonVampires.push(targetPlayerId);
      m.knownVampires = m.knownVampires.filter((id) => id !== targetPlayerId);
    }
  }
}
