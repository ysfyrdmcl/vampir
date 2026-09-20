import type { BotIntelligence, GamePhase } from "@vampir-koylu/shared";
import { pickRandom } from "../utils/random.js";
import type { RoomState } from "../game/game-types.js";
import type { BotMemory } from "./bot-memory.js";
import { NO_LYNCH_TARGET } from "./bot-types.js";

export function legalTargetsForBot(
  room: RoomState,
  phase: GamePhase,
  actorPlayerId: string,
  memory?: BotMemory | null
): string[] {
  const actor = room.players.find((p) => p.playerId === actorPlayerId);
  if (!actor) return [];

  const aliveOthers = (self: string) =>
    room.players.filter((p) => p.isAlive && p.playerId !== self).map((p) => p.playerId);
  const aliveAll = () => room.players.filter((p) => p.isAlive).map((p) => p.playerId);

  switch (phase) {
    case "VampireVote": {
      if (actor.role !== "Vampire" || !actor.isAlive) return [];
      return room.players.filter((p) => p.isAlive && p.role !== "Vampire").map((p) => p.playerId);
    }
    case "DetectiveInspect": {
      if (actor.role !== "Detective" || !actor.isAlive) return [];
      const inspected = new Set([
        ...(room.game.detectiveInspectedTargets[actorPlayerId] ?? []),
        ...(memory?.inspectedPlayerIds ?? [])
      ]);
      return aliveAll().filter((id) => id !== actorPlayerId && !inspected.has(id));
    }
    case "DoctorProtect": {
      if (actor.role !== "Doctor" || !actor.isAlive) return [];
      const { allowDoctorSelfProtect, allowDoctorConsecutiveProtectSameTarget } = room.game.rules;
      const round = room.game.round;
      return aliveAll().filter((id) => {
        if (!allowDoctorSelfProtect && id === actorPlayerId) return false;
        if (
          !allowDoctorConsecutiveProtectSameTarget &&
          actor.lastProtectedRound === round - 1 &&
          actor.lastProtectedTargetPlayerId === id
        ) {
          return false;
        }
        return true;
      });
    }
    case "GuardProtect": {
      if (actor.role !== "Guard" || !actor.isAlive || actor.guardUsedInGame) return [];
      return aliveOthers(actorPlayerId);
    }
    case "MayorElection": {
      if (!actor.isAlive) return [];
      return aliveOthers(actorPlayerId);
    }
    case "DayVote": {
      if (!actor.isAlive) return [];
      const blocked = room.game.guardProtectedPlayerId;
      const revoteCandidateIds = room.game.tieCountInRound > 0 ? room.game.revoteCandidateIds ?? room.game.lastDayVoteSummary?.tiedTopCandidates ?? [] : [];
      const revoteCandidateSet = new Set(revoteCandidateIds);
      const pool = aliveOthers(actorPlayerId)
        .filter((id) => !blocked || id !== blocked)
        .filter((id) => revoteCandidateSet.size === 0 || revoteCandidateSet.has(id));
      if (room.game.rules.noLynchEnabled && (revoteCandidateSet.size === 0 || revoteCandidateSet.has(NO_LYNCH_TARGET))) {
        return [...pool, NO_LYNCH_TARGET];
      }
      return pool;
    }
    case "HunterLastBreath": {
      if (actor.role !== "Hunter") return [];
      if (room.game.lastEliminationSummary?.playerId !== actorPlayerId) return [];
      if (room.game.lastEliminationSummary.source !== "Day") return [];
      return aliveOthers(actorPlayerId);
    }
    default:
      return [];
  }
}

export function pickRandomTarget(targets: string[], exclude?: string): string | null {
  const pool = exclude ? targets.filter((t) => t !== exclude) : [...targets];
  return pickRandom(pool);
}

function rngFloat(rng: () => number): number {
  return rng();
}

function isVampire(room: RoomState, playerId: string): boolean {
  return room.players.some((p) => p.playerId === playerId && p.isAlive && p.role === "Vampire");
}

function suspicionScore(memory: BotMemory, playerId: string): number {
  return memory.suspicionByPlayerId[playerId] ?? 0;
}

function trustScore(memory: BotMemory, playerId: string): number {
  return memory.trustByPlayerId[playerId] ?? 0;
}

/** Deterministic-friendly scoring for tests; higher = more likely pick (except intelligence=random). */
export function scoreBotTarget(
  room: RoomState,
  phase: GamePhase,
  actorPlayerId: string,
  targetPlayerId: string,
  intelligence: BotIntelligence,
  memory: BotMemory,
  rng: () => number
): number {
  const actor = room.players.find((p) => p.playerId === actorPlayerId);
  if (!actor) return 0;

  let score = 0;
  const noiseSmall = () => (rngFloat(rng) - 0.5) * 20;
  const noiseMed = () => (rngFloat(rng) - 0.5) * 40;

  switch (intelligence) {
    case "random":
      score += rngFloat(rng) * 100;
      score += noiseMed();
      break;
    case "balanced":
      score += rngFloat(rng) * 25;
      score += noiseSmall();
      break;
    case "deceptive":
      score += rngFloat(rng) * 22;
      score += noiseMed();
      break;
  }

  switch (phase) {
    case "VampireVote": {
      if (intelligence !== "random") {
        score += suspicionScore(memory, targetPlayerId) * (intelligence === "deceptive" ? 1.2 : 2.5);
      }
      break;
    }
    case "DetectiveInspect": {
      if (intelligence === "random") {
        score += noiseSmall();
      } else {
        score += (intelligence === "deceptive" ? 12 : 22) + noiseSmall();
      }
      break;
    }
    case "DoctorProtect": {
      if (intelligence === "random") break;
      const avoidId = memory.lastProtectedPlayerId ?? actor.lastProtectedTargetPlayerId ?? undefined;
      if (avoidId && targetPlayerId === avoidId) score -= intelligence === "deceptive" ? 25 : 45;
      if (targetPlayerId === actorPlayerId) score -= intelligence === "deceptive" ? 8 : 15;
      score += trustScore(memory, targetPlayerId) * (intelligence === "deceptive" ? 1.5 : 2.2);
      break;
    }
    case "MayorElection": {
      const susM = suspicionScore(memory, targetPlayerId);
      if (intelligence !== "random") score += susM * 2;
      const vampM = isVampire(room, actorPlayerId);
      if (vampM && isVampire(room, targetPlayerId)) {
        score -= intelligence === "deceptive" ? 40 : intelligence === "balanced" ? 25 : 10;
      }
      break;
    }
    case "DayVote": {
      if (targetPlayerId === NO_LYNCH_TARGET) {
        if (intelligence === "balanced") score -= 25;
        if (intelligence === "deceptive") score += noiseSmall() - 10;
        break;
      }
      const sus = suspicionScore(memory, targetPlayerId);
      if (intelligence !== "random") {
        score += sus * (intelligence === "deceptive" ? 2.2 : 3);
      }
      const vamp = isVampire(room, actorPlayerId);
      const targetIsVamp = isVampire(room, targetPlayerId);
      if (vamp && targetIsVamp) {
        score -= intelligence === "deceptive" ? 120 : intelligence === "balanced" ? 70 : 20;
      }
      if (!vamp && memory.knownVampires.includes(targetPlayerId)) {
        score += intelligence === "deceptive" ? 45 : 60;
      }
      if (!vamp && memory.knownNonVampires.includes(targetPlayerId)) {
        score -= intelligence === "balanced" ? 15 : 8;
      }
      if (memory.lastVotedPlayerId === targetPlayerId && intelligence === "balanced") {
        score -= 12;
      }
      break;
    }
    case "HunterLastBreath":
    case "GuardProtect": {
      if (intelligence !== "random") {
        score += suspicionScore(memory, targetPlayerId) * 2;
      }
      break;
    }
    default:
      break;
  }

  return score;
}

export function pickRankedBotTargets(
  room: RoomState,
  phase: GamePhase,
  actorPlayerId: string,
  intelligence: BotIntelligence,
  memory: BotMemory,
  legal: string[],
  rng: () => number = Math.random
): string[] {
  if (legal.length === 0) return [];
  if (legal.length === 1) return [legal[0]];

  if (intelligence === "random") {
    const shuffled = [...legal];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  const scored = legal.map((id) => ({
    id,
    s: scoreBotTarget(room, phase, actorPlayerId, id, intelligence, memory, rng)
  }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.id);
}

export function pickBotTargetOrder(
  room: RoomState,
  phase: GamePhase,
  actorPlayerId: string,
  intelligence: BotIntelligence | undefined,
  memory: BotMemory,
  rng: () => number = Math.random
): string[] {
  let legal = legalTargetsForBot(room, phase, actorPlayerId, memory);
  if (phase === "DayVote" || phase === "MayorElection") {
    legal = legal.filter((id) => id === NO_LYNCH_TARGET || id !== actorPlayerId);
  }
  const intel = intelligence ?? "balanced";
  return pickRankedBotTargets(room, phase, actorPlayerId, intel, memory, legal, rng);
}
