import type { LogFeedEntry } from "./log-feed-store";
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
  "vote.execution",
  "summary.elimination",
  "summary.chain_elimination",
  "summary.night_no_elimination",
  "role.hunter.triggered",
  "role.hunter.shot",
  "role.mayor.selected",
  "role.guard.protect",
  "game.over"
]);

const PERSONAL_EVENTS = new Set<string>([
  "game.phase.personal_turn_info",
  "game.role.assigned",
  "game.private_result.detective",
  "game.private_result.vampire_preview",
  "game.private_result.lover_link",
  "game.private_result.accepted",
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
  if (event === "room.joined") return `Odaya katıldın (${String(p.roomCode ?? "-")}).`;
  if (event === "phase.night_started") return `${String(p.round ?? "-")}. Gece başladı.`;
  if (event === "phase.day_started") return `${String(p.round ?? "-")}. Gündüz başladı.`;
  if (event === "vote.started") return `${String(p.round ?? "-")}. gündüz oylaması başladı.`;
  if (event === "vote.mayor_started") return `${String(p.round ?? "-")}. başkan seçimi başladı.`;
  if (event === "vote.tie") return `Oylama berabere bitti. En çok oy alanlar: ${formatCandidates(p.tiedTopCandidates)}.`;
  if (event === "vote.revote_started") return "İkinci oylama başladı.";
  if (event === "vote.execution") return `Oylama sonucu ${String(p.executedPlayerId ?? "bir oyuncu")} köyden gönderildi.`;
  if (event === "summary.elimination") {
    const source = String(p.source ?? "Day") === "Night" ? "Gece sonucu" : "Gündüz sonucu";
    const player = String(p.playerId ?? "bir oyuncu");
    const roleText = p.revealedRole ? ` Rol: ${toRoleLabel(p.revealedRole)}.` : "";
    return `${source}: ${player} elendi.${roleText}`;
  }
  if (event === "summary.players_eliminated") return `Elenen oyuncular: ${String((p.players as string[] | undefined)?.join(", ") ?? "-")}.`;
  if (event === "summary.chain_elimination") return `Zincir eleme gerçekleşti: ${String((p.players as string[] | undefined)?.join(", ") ?? "-")}.`;
  if (event === "summary.night_no_elimination") return "Gece kimse elenmedi.";
  if (event === "game.phase.personal_turn_info") return `Sıra bilgisi: ${String(p.phase ?? "-")}.`;
  if (event === "game.role.assigned") return `Rolün atandı: ${toRoleLabel(p.role as string | null | undefined)}.`;
  if (event === "game.private_result.detective") return `Dedektif sonucu: ${String(p.text ?? "-")}.`;
  if (event === "game.private_result.vampire_preview") return "Vampir oy önizlemesi güncellendi.";
  if (event === "game.private_result.lover_link") return `Aşık bağı bildirimi: ${String(p.text ?? "-")}.`;
  if (event === "game.private_result.accepted") return "Aksiyonun kaydedildi.";
  if (event === "personal.detective.inspect_result") return `Sorgu sonucu: ${String(p.text ?? "-")}.`;
  if (event === "personal.doctor.protect_selected") return `Koruma hedefin seçildi (${String(p.targetPlayerId ?? "-")}).`;
  if (event === "personal.doctor.protect_result") return `Koruma sonucu: ${String(p.text ?? "-")}.`;
  if (event === "personal.vampire.target_selected") return `Gece hedefin seçildi (${String(p.targetPlayerId ?? "-")}).`;
  if (event === "personal.vampire.night_result") return `Gece sonucu: ${String(p.text ?? "-")}.`;
  if (event === "personal.vampire.vote_preview") return `Vampir ekip oyları güncellendi (${String(p.count ?? 0)} oy).`;
  if (event === "personal.hunter.shot_selected") return `Son nefes hedefin seçildi (${String(p.targetPlayerId ?? "-")}).`;
  if (event === "personal.guard.protect_selected") return `Gündüz koruma hedefin seçildi (${String(p.targetPlayerId ?? "-")}).`;
  if (event === "role.hunter.triggered") return "Avcı son nefes hakkını kullanacak.";
  if (event === "role.hunter.shot") return `Avcı bir hedef seçti (${String(p.targetPlayerId ?? "-")}).`;
  if (event === "role.mayor.selected") return `Köy başkanı seçildi (${String(p.mayorPlayerId ?? "-")}).`;
  if (event === "role.guard.protect") return `Gardiyan koruma açtı (${String(p.protectedPlayerId ?? "-")}).`;
  if (event === "game.over") return `Oyun bitti. Kazanan: ${toWinnerLabel(p.winner as string | null | undefined)}.`;
  return event;
}

function formatCandidates(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "Bilinmiyor";
  return value.map((item) => String(item)).join(", ");
}
