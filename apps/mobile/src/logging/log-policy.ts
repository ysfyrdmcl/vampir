import type { LogFeedEntry } from "./log-feed-store";
import {
  formatJournalRoundPrefix,
  formatPersonalTurnLogLine,
  journalPersonalPhaseLabel
} from "../utils/journal-labels";
import { toRoleLabel, toWinnerLabel } from "../utils/role-label";

export type LogScope = "general" | "personal";
type LogTab = "general" | "personal";

const HIDDEN_PREFIXES = ["test.", "sim.", "emit.", "socket."];
const PERSONAL_PREFIXES = ["personal.", "game.private_result.", "game.role.", "game.phase.personal_turn_info"];

const GENERAL_EVENTS = new Set<string>([
  "room.joined",
  "phase.night_started",
  "phase.day_started",
  "vote.started",
  "vote.mayor_started",
  "vote.tie",
  "vote.revote_started",
  "summary.elimination",
  "summary.chain_elimination",
  "summary.night_no_elimination",
  "role.hunter.triggered",
  "role.mayor.selected",
  "role.guard.protect",
  "game.over"
]);

const PERSONAL_EVENTS = new Set<string>([
  "game.phase.personal_turn_info",
  "game.role.assigned",
  "game.private_result.lover_link",
  "personal.detective.inspect_result",
  "personal.doctor.protect_selected",
  "personal.doctor.protect_result",
  "personal.vampire.target_selected",
  "personal.vampire.night_result",
  "personal.vampire.vote_preview",
  "personal.hunter.shot_selected",
  "personal.guard.protect_selected"
]);

export function shouldShowLogEntry(entry: LogFeedEntry, tab: LogTab): boolean {
  if (entry.scope !== tab) return false;
  if (isDebugOnlyEvent(entry.event)) return false;
  if (tab === "general") return GENERAL_EVENTS.has(entry.event);
  return PERSONAL_EVENTS.has(entry.event);
}

export function shouldStoreLogEntryInFeed(scope: LogScope, event: string): boolean {
  if (isDebugOnlyEvent(event)) return false;
  if (scope === "general") {
    if (isPersonalOnlyEvent(event)) return false;
    return GENERAL_EVENTS.has(event);
  }
  return PERSONAL_EVENTS.has(event);
}

export function isLogScopeMismatch(scope: LogScope, event: string): boolean {
  return scope === "general" && isPersonalOnlyEvent(event);
}

function isDebugOnlyEvent(event: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => event.startsWith(prefix));
}

function isPersonalOnlyEvent(event: string): boolean {
  return PERSONAL_PREFIXES.some((prefix) => event.startsWith(prefix));
}

export function toReadableLogText(event: string, payload?: Record<string, unknown>): string {
  const p = payload ?? {};
  const rp = formatJournalRoundPrefix(p.round);
  if (event === "room.joined") return `Odaya katıldın (${String(p.roomCode ?? "-")}).`;
  if (event === "phase.night_started") return `${rp}Gece başladı.`;
  if (event === "phase.day_started") return `${rp}Gündüz başladı.`;
  if (event === "vote.started") return `${rp}Gündüz oylaması başladı.`;
  if (event === "vote.mayor_started") return `${rp}Başkan seçimi başladı.`;
  if (event === "vote.tie") {
    return `${rp}Oylar eşitlendi; tekrar oylama yapılacak. Adaylar: ${formatCandidates(p.tiedTopCandidates)}.`;
  }
  if (event === "vote.revote_started") return `${rp}Tekrar oylama başladı.`;
  if (event === "vote.execution") {
    const who = String(p.executedPlayerId ?? "bir oyuncu");
    return `${rp}Köy kararı: ${who} gönderildi.`;
  }
  if (event === "summary.elimination") {
    const player = String(p.playerId ?? "bir oyuncu");
    const roleText = p.revealedRole ? ` Rol: ${toRoleLabel(p.revealedRole)}.` : "";
    if (p.cause === "hunter") return `${rp}Avcı atışı: ${player} elendi.${roleText}`;
    if (p.cause === "day_vote" || p.source === "Day") return `${rp}Köy kararı: ${player} gönderildi.${roleText}`;
    return `${rp}Gece sona erdi: ${player} elendi.${roleText}`;
  }
  if (event === "summary.players_eliminated") return `Elenen oyuncular: ${String((p.players as string[] | undefined)?.join(", ") ?? "-")}.`;
  if (event === "summary.chain_elimination") return `Aşık bağı tetiklendi. Birbirine bağlı oyuncular elendi: ${String((p.players as string[] | undefined)?.join(", ") ?? "-")}.`;
  if (event === "summary.night_no_elimination") return `${rp}Gece sona erdi: Kimse elenmedi.`;
  if (event === "game.phase.personal_turn_info") {
    return `${formatPersonalTurnLogLine(p)}.`;
  }
  if (event === "game.role.assigned") return `Rolün atandı: ${toRoleLabel(p.role as string | null | undefined)}.`;
  if (event === "game.private_result.lover_link") return `Aşık bağı bildirimi: ${String(p.text ?? "-")}.`;
  if (event === "personal.detective.inspect_result") return `Sorgu sonucu: ${String(p.text ?? "-")}.`;
  if (event === "personal.doctor.protect_selected") return `Bu gece ${String(p.targetName ?? p.targetPlayerId ?? "hedef")} korunacak.`;
  if (event === "personal.doctor.protect_result") return `Koruma sonucu: ${String(p.text ?? "-")}.`;
  if (event === "personal.vampire.target_selected") return `Gece hedefin: ${String(p.targetName ?? p.targetPlayerId ?? "hedef")}.`;
  if (event === "personal.vampire.night_result") return `Gece sonucu: ${String(p.text ?? "-")}.`;
  if (event === "personal.vampire.vote_preview") {
    return String(p.text ?? "Vampir oy durumu güncellendi.");
  }
  if (event === "personal.hunter.shot_selected") return `Son nefes hedefin: ${String(p.targetName ?? p.targetPlayerId ?? "hedef")}.`;
  if (event === "personal.guard.protect_selected") return `${String(p.targetName ?? p.targetPlayerId ?? "Hedef")} bugün oylamayla elenemez.`;
  if (event === "role.hunter.triggered") return `${rp}Avcı son nefes hakkını kullanıyor.`;
  if (event === "role.hunter.shot") return `${rp}Avcı atışı: ${String(p.targetPlayerId ?? "hedef")} elendi.`;
  if (event === "role.mayor.selected") return `${rp}Köy başkanı seçildi (${String(p.mayorPlayerId ?? "-")}).`;
  if (event === "role.guard.protect") return `${rp}Gardiyan koruma açtı (${String(p.protectedPlayerId ?? "-")}).`;
  if (event === "game.over") return `Oyun bitti: ${toWinnerLabel(p.winner as string | null | undefined)} kazandı.`;
  return event;
}

function formatCandidates(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "Bilinmiyor";
  return value.map((item) => String(item)).join(", ");
}
