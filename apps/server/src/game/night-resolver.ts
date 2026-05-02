import { pickRandom } from "../utils/random.js";
import type { GameActionEntry, PlayerState } from "./game-types.js";
import type { RuleSettings } from "@vampir-koylu/shared";

export interface NightResolveResult {
  killedPlayerId: string | null;
  protectedPlayerId: string | null;
  detectiveResult?: {
    targetPlayerId: string;
    result: "Vampire" | "NotVampire";
    detectivePlayerId: string;
  };
}

function chooseVampireTarget(players: PlayerState[], actions: GameActionEntry[]): string | null {
  const aliveMap = new Map(players.filter((p) => p.isAlive).map((p) => [p.playerId, p]));
  const vampireIds = new Set(players.filter((p) => p.isAlive && p.role === "Vampire").map((p) => p.playerId));
  const counts = new Map<string, number>();

  for (const action of actions.filter((a) => a.actionType === "vampire-target")) {
    if (!vampireIds.has(action.actorPlayerId)) continue;
    if (!action.targetPlayerId) continue;
    const target = aliveMap.get(action.targetPlayerId);
    if (!target || target.role === "Vampire") continue;
    counts.set(action.targetPlayerId, (counts.get(action.targetPlayerId) ?? 0) + 1);
  }

  if (counts.size === 0) {
    const villagerSide = players.filter((p) => p.isAlive && p.role !== "Vampire");
    return pickRandom(villagerSide)?.playerId ?? null;
  }

  let top = 0;
  for (const value of counts.values()) {
    if (value > top) top = value;
  }
  const topTargets = Array.from(counts.entries())
    .filter(([, value]) => value === top)
    .map(([playerId]) => playerId);

  return pickRandom(topTargets);
}

export function resolveNight(players: PlayerState[], actions: GameActionEntry[], round: number, rules: RuleSettings): NightResolveResult {
  const aliveMap = new Map(players.filter((p) => p.isAlive).map((p) => [p.playerId, p]));
  const vampireTargetId = chooseVampireTarget(players, actions);

  const doctorAction = actions.find((a) => a.actionType === "doctor-protect");
  let protectedPlayerId: string | null = null;
  if (doctorAction?.targetPlayerId) {
    const doctor = aliveMap.get(doctorAction.actorPlayerId);
    if (doctor?.role === "Doctor") {
      const target = aliveMap.get(doctorAction.targetPlayerId);
      if (target) {
        const sameSelf = target.playerId === doctor.playerId;
        const sameConsecutiveTarget =
          doctor.lastProtectedRound === round - 1 && doctor.lastProtectedTargetPlayerId === target.playerId;
        const selfBlocked = sameSelf && !rules.allowDoctorSelfProtect;
        const consecutiveBlocked = sameConsecutiveTarget && !rules.allowDoctorConsecutiveProtectSameTarget;
        if (!selfBlocked && !consecutiveBlocked) {
          protectedPlayerId = target.playerId;
        }
      }
    }
  }

  let killedPlayerId: string | null = null;
  if (vampireTargetId && vampireTargetId !== protectedPlayerId) {
    killedPlayerId = vampireTargetId;
  }

  const detectiveAction = actions.find((a) => a.actionType === "detective-inspect");
  let detectiveResult: NightResolveResult["detectiveResult"];
  if (detectiveAction?.targetPlayerId) {
    const detective = aliveMap.get(detectiveAction.actorPlayerId);
    const target = aliveMap.get(detectiveAction.targetPlayerId);
    if (detective?.role === "Detective" && target) {
      detectiveResult = {
        detectivePlayerId: detective.playerId,
        targetPlayerId: target.playerId,
        result: target.role === "Vampire" ? "Vampire" : "NotVampire"
      };
    }
  }

  return {
    killedPlayerId,
    protectedPlayerId,
    detectiveResult
  };
}
