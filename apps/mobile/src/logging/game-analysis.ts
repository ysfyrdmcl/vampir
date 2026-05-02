import type { RoomPlayerView } from "@vampir-koylu/shared";
import type { LogFeedEntry } from "./log-feed-store";

export interface GameAnalysisSummary {
  winnerText: string;
  roundsPlayed: number;
  eliminationCount: number;
  tieCount: number;
  nightNoDeathCount: number;
  aliveText: string;
  highlights: string[];
}

export function buildGameAnalysis(
  entries: LogFeedEntry[],
  winner: "Vampires" | "Villagers" | null,
  players: RoomPlayerView[]
): GameAnalysisSummary | null {
  if (!winner && !entries.some((entry) => entry.event === "game.over")) {
    return null;
  }

  const nameById = new Map(players.map((player) => [player.playerId, player.nickname] as const));
  const publicEntries = entries.filter((entry) => entry.scope === "general");
  const roundsPlayed = Math.max(
    0,
    ...publicEntries
      .map((entry) => Number(entry.payload?.round ?? 0))
      .filter((round) => Number.isFinite(round))
  );
  const eliminationEntries = publicEntries.filter((entry) => entry.event === "summary.elimination");
  const tieCount = publicEntries.filter((entry) => entry.event === "vote.tie").length;
  const nightNoDeathCount = publicEntries.filter((entry) => entry.event === "summary.night_no_elimination").length;
  const alive = players.filter((player) => player.isAlive).map((player) => player.nickname);

  const highlights = eliminationEntries.slice(-3).map((entry) => {
    const source = entry.payload?.source === "Night" ? "Gece" : "Gündüz";
    const playerId = String(entry.payload?.playerId ?? "");
    const name = nameById.get(playerId) ?? (playerId || "Bir oyuncu");
    const role = entry.payload?.revealedRole ? ` (${String(entry.payload.revealedRole)})` : "";
    return `${source}: ${name}${role} elendi.`;
  });

  if (tieCount > 0) {
    highlights.push(`${tieCount} oylamada beraberlik yaşandı.`);
  }
  if (nightNoDeathCount > 0) {
    highlights.push(`${nightNoDeathCount} gece kimse elenmedi.`);
  }

  return {
    winnerText: winner === "Vampires" ? "Vampirler kazandı" : "Köylüler kazandı",
    roundsPlayed,
    eliminationCount: eliminationEntries.length,
    tieCount,
    nightNoDeathCount,
    aliveText: alive.length ? alive.join(", ") : "Hayatta kalan yok",
    highlights: highlights.length ? highlights : ["Kayıtlarda kritik dönüm noktası bulunamadı."]
  };
}
