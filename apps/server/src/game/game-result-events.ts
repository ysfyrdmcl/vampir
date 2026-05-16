import type { GameResultEvent, Role } from "@vampir-koylu/shared";
import type { GamePhase } from "@vampir-koylu/shared";
import type { PlayerState, RoomState } from "./game-types.js";

export interface ResultEventBaseline {
  phase: GamePhase;
  round: number;
  aliveByPlayerId: Map<string, boolean>;
  mayorPlayerId: string | null;
  guardProtectedPlayerId: string | null;
  winner: "Vampires" | "Villagers" | null;
}

export function captureResultEventBaseline(room: RoomState): ResultEventBaseline {
  return {
    phase: room.game.phase,
    round: room.game.round,
    aliveByPlayerId: new Map(room.players.map((p) => [p.playerId, p.isAlive])),
    mayorPlayerId: room.game.mayorPlayerId,
    guardProtectedPlayerId: room.game.guardProtectedPlayerId,
    winner: room.game.winner
  };
}

export function buildGameResultEvents(before: ResultEventBaseline, room: RoomState): GameResultEvent[] {
  const events: GameResultEvent[] = [];
  const newlyDead = room.players.filter((p) => before.aliveByPlayerId.get(p.playerId) === true && !p.isAlive);
  const names = (ids: string[]) => ids.map((id) => playerName(room.players, id));
  const phase = room.game.phase;
  const round = room.game.round;

  if (before.phase === "NightResolve" && (phase === "DayStart" || phase === "WinCheck" || phase === "GameOver")) {
    if (newlyDead.length) {
      const primary = room.game.lastEliminationSummary?.playerId ?? newlyDead[0].playerId;
      const chain = newlyDead.filter((p) => p.playerId !== primary);
      const primaryName = playerName(room.players, primary);
      const message = chain.length
        ? `${primaryName} gece öldü. Aşık bağı nedeniyle ${names(chain.map((p) => p.playerId)).join(", ")} de öldü.`
        : `${primaryName} gece öldü.`;
      events.push(resultEvent(room, "night", "Gece Sonucu", message, newlyDead, room.game.lastEliminationSummary?.revealedRole));
    } else {
      events.push(resultEvent(room, "night", "Gece Sonucu", "Bu gece kimse ölmedi.", []));
    }
  }

  if (before.phase === "MayorElection" && (phase === "GuardProtect" || phase === "DayDiscussion") && room.game.mayorPlayerId) {
    events.push(resultEvent(room, "mayor", "Belediye Başkanı", `${playerName(room.players, room.game.mayorPlayerId)} belediye başkanı seçildi.`, [room.game.mayorPlayerId]));
  }

  if (before.phase === "GuardProtect" && phase === "DayDiscussion" && room.game.guardProtectedPlayerId) {
    events.push(resultEvent(room, "guard", "Gardiyan Koruması", `${playerName(room.players, room.game.guardProtectedPlayerId)} bugün oylamayla elenemez.`, [room.game.guardProtectedPlayerId]));
  }

  if (before.phase === "DayVote" && phase === "DayDiscussion" && room.game.tieCountInRound > 0) {
    const tied = room.game.revoteCandidateIds ?? room.game.lastDayVoteSummary?.tiedTopCandidates ?? [];
    events.push(resultEvent(room, "tie", "Oylar Eşitlendi", `Oylar eşitlendi: ${names(tied).join(", ")}. Yeni oylama sadece bu adaylar arasında yapılacak.`, tied));
  }

  if (before.phase === "DayVote" && phase === "WinCheck" && room.game.lastDayVoteSummary?.noLynchWon) {
    events.push(resultEvent(room, "day", "Oylama Sonucu", "Köy kimseyi göndermemeye karar verdi.", []));
  }

  if (before.phase === "DayVote" && phase === "ExecutionResolve" && newlyDead.length) {
    const executed = room.game.lastDayVoteSummary?.executedPlayerId ?? newlyDead[0].playerId;
    const chain = newlyDead.filter((p) => p.playerId !== executed);
    const message = chain.length
      ? `${playerName(room.players, executed)} köyden gönderildi. Aşık bağı nedeniyle ${names(chain.map((p) => p.playerId)).join(", ")} de öldü.`
      : `${playerName(room.players, executed)} köyden gönderildi.`;
    events.push(resultEvent(room, "day", "İnfaz Sonucu", message, newlyDead, room.game.lastEliminationSummary?.revealedRole));
  }

  if (before.phase === "HunterLastBreath" && (phase === "WinCheck" || phase === "GameOver")) {
    if (newlyDead.length) {
      events.push(resultEvent(room, "hunter", "Avcı Son Nefes", `${names(newlyDead.map((p) => p.playerId)).join(", ")} avcının son nefesiyle öldü.`, newlyDead));
    } else {
      events.push(resultEvent(room, "hunter", "Avcı Son Nefes", "Avcı kimseyi vurmadı.", []));
    }
  }

  return events;
}

function resultEvent(
  room: RoomState,
  kind: GameResultEvent["kind"],
  title: string,
  message: string,
  players: PlayerState[] | string[],
  role?: Role | null
): GameResultEvent {
  const playerIds = players.map((p) => (typeof p === "string" ? p : p.playerId));
  return {
    id: `result:${room.roomCode}:${room.game.round}:${kind}:${playerIds.join("-") || "none"}:${room.game.phase}`,
    kind,
    title,
    message,
    phase: room.game.phase,
    round: room.game.round,
    playerIds,
    role
  };
}

function playerName(players: PlayerState[], playerId: string): string {
  return players.find((p) => p.playerId === playerId)?.nickname ?? playerId;
}
