import type { GameActionEntry, PlayerState } from "./game-types.js";

export interface VoteResolveResult {
  executedPlayerId: string | null;
  tiedTopCandidates: string[];
  voteBreakdown: { playerId: string; votes: number }[];
  noLynchWon: boolean;
}

export function resolveDayVotes(
  players: PlayerState[],
  actions: GameActionEntry[],
  options?: {
    noLynchEnabled?: boolean;
    mayorPlayerId?: string | null;
    voteActionType?: "day-vote" | "mayor-vote";
    blockedTargetPlayerId?: string | null;
  }
): VoteResolveResult {
  const aliveIds = new Set(players.filter((p) => p.isAlive).map((p) => p.playerId));
  const votes = new Map<string, number>();
  const noLynchEnabled = options?.noLynchEnabled ?? false;
  const NO_LYNCH_TARGET = "__NO_LYNCH__";

  const voteActionType = options?.voteActionType ?? "day-vote";
  const mayorPlayerId = options?.mayorPlayerId ?? null;
  const blockedTargetPlayerId = options?.blockedTargetPlayerId ?? null;

  for (const action of actions.filter((a) => a.actionType === voteActionType)) {
    if (!aliveIds.has(action.actorPlayerId)) continue;
    if (!action.targetPlayerId) continue;
    const voteWeight = voteActionType === "day-vote" && mayorPlayerId && action.actorPlayerId === mayorPlayerId ? 2 : 1;
    if (action.targetPlayerId === NO_LYNCH_TARGET && noLynchEnabled) {
      votes.set(action.targetPlayerId, (votes.get(action.targetPlayerId) ?? 0) + voteWeight);
      continue;
    }
    if (blockedTargetPlayerId && action.targetPlayerId === blockedTargetPlayerId) continue;
    if (!aliveIds.has(action.targetPlayerId)) continue;
    votes.set(action.targetPlayerId, (votes.get(action.targetPlayerId) ?? 0) + voteWeight);
  }

  let maxVotes = 0;
  for (const value of votes.values()) {
    if (value > maxVotes) maxVotes = value;
  }

  if (maxVotes === 0) {
    return { executedPlayerId: null, tiedTopCandidates: [], voteBreakdown: [], noLynchWon: false };
  }

  const tiedTopCandidates = Array.from(votes.entries())
    .filter(([, value]) => value === maxVotes)
    .map(([playerId]) => playerId);

  const noLynchWon = tiedTopCandidates.length === 1 && tiedTopCandidates[0] === NO_LYNCH_TARGET;

  if (tiedTopCandidates.length > 1) {
    return {
      executedPlayerId: null,
      tiedTopCandidates,
      voteBreakdown: Array.from(votes.entries()).map(([playerId, voteCount]) => ({
        playerId,
        votes: voteCount
      })),
      noLynchWon: false
    };
  }

  return {
    executedPlayerId: noLynchWon ? null : tiedTopCandidates[0],
    tiedTopCandidates: [],
    voteBreakdown: Array.from(votes.entries()).map(([playerId, voteCount]) => ({
      playerId,
      votes: voteCount
    })),
    noLynchWon
  };
}
