import type { VampireVotePreview, VampireVotePreviewVote } from "@vampir-koylu/shared";
import type { RoomState } from "./game-types.js";

/** Önizleme yalnızca bu soketlere gider (canlı, insan vampirler; botların soketi yok). */
export function vampirePreviewRecipientSocketIds(room: RoomState): string[] {
  return room.players.filter((p) => p.isAlive && p.role === "Vampire" && p.socketId).map((p) => p.socketId);
}

/** VampireVote fazı için canlı vampirlerin oylarının özeti (yalnızca vampir soketlerine gönderilir). */
export function buildVampireVotePreview(room: RoomState): VampireVotePreview {
  const round = room.game.round;
  const alivePlayerIds = new Set(room.players.filter((p) => p.isAlive).map((p) => p.playerId));
  const vampires = room.players.filter((p) => p.isAlive && p.role === "Vampire");

  const latestByVoter = new Map<string, string>();
  for (const action of room.game.actions) {
    if (action.actionType !== "vampire-target" || action.round !== round) continue;
    if (!action.targetPlayerId || !alivePlayerIds.has(action.targetPlayerId)) continue;
    if (!vampires.some((v) => v.playerId === action.actorPlayerId)) continue;
    latestByVoter.set(action.actorPlayerId, action.targetPlayerId);
  }

  const votes = vampires.map((v) => {
    const tid = latestByVoter.get(v.playerId);
    const target = tid ? room.players.find((p) => p.playerId === tid) : undefined;
    const row: VampireVotePreviewVote = {
      voterPlayerId: v.playerId,
      voterName: v.nickname
    };
    if (tid) {
      row.targetPlayerId = tid;
      row.targetName = target?.nickname ?? tid;
    }
    if (v.isBot) {
      row.isBot = true;
    }
    return row;
  });

  const pendingVoterPlayerIds = votes.filter((row) => !latestByVoter.has(row.voterPlayerId)).map((row) => row.voterPlayerId);

  const countByTarget = new Map<string, number>();
  for (const tid of latestByVoter.values()) {
    countByTarget.set(tid, (countByTarget.get(tid) ?? 0) + 1);
  }
  const targetCounts = Array.from(countByTarget.entries()).map(([targetPlayerId, count]) => {
    const p = room.players.find((pl) => pl.playerId === targetPlayerId);
    return { targetPlayerId, targetName: p?.nickname ?? targetPlayerId, count };
  });
  targetCounts.sort((a, b) => b.count - a.count || a.targetName.localeCompare(b.targetName));

  return { round, votes, targetCounts, pendingVoterPlayerIds };
}
