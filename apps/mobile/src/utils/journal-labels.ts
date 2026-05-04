import type { GamePhase } from "@vampir-koylu/shared";

/** Günlük satırlarında: `1. Tur`, `2. Tur` */
export function formatJournalRoundTur(round: unknown): string {
  if (typeof round === "number" && Number.isFinite(round) && round >= 1) {
    return `${round}. Tur`;
  }
  return "—";
}

/** Geçerli tur varsa `"1. Tur — "`; yoksa boş. */
export function formatJournalRoundPrefix(round: unknown): string {
  if (typeof round === "number" && Number.isFinite(round) && round >= 1) {
    return `${round}. Tur — `;
  }
  return "";
}

/**
 * Kişisel sıra / faz özeti: kullanıcı dostu kısa etiket.
 * Night / Day / Vote / Execution / Result eşlemesine uygun.
 */
export function journalPersonalPhaseLabel(phase: unknown): string {
  if (typeof phase !== "string" || !phase) return "—";
  const p = phase as GamePhase;
  switch (p) {
    case "NightStart":
    case "VampireVote":
    case "DetectiveInspect":
    case "DoctorProtect":
    case "NightResolve":
      return "Gece";
    case "DayStart":
    case "DayDiscussion":
    case "GuardProtect":
      return "Gündüz";
    case "DayVote":
    case "MayorElection":
      return "Oylama";
    case "ExecutionResolve":
      return "İnfaz";
    case "WinCheck":
    case "GameOver":
      return "Sonuç";
    case "RoleReveal":
      return "Rol açılımı";
    case "HunterLastBreath":
      return "Avcı son nefesi";
    case "Lobby":
      return "Lobi";
    default:
      return phase;
  }
}

const NIGHT_TURN_PERIODS = new Set<GamePhase>([
  "NightStart",
  "VampireVote",
  "DetectiveInspect",
  "DoctorProtect",
  "NightResolve"
]);

const DAY_TURN_PERIODS = new Set<GamePhase>([
  "DayStart",
  "DayDiscussion",
  "GuardProtect",
  "DayVote",
  "MayorElection",
  "ExecutionResolve"
]);

/** Kişisel sıra satırı: `Gece` / `Gündüz` (adım etiketi ayrı). */
export function journalPersonalTurnPeriod(phase: unknown): string {
  if (typeof phase !== "string" || !phase) return "—";
  const p = phase as GamePhase;
  if (NIGHT_TURN_PERIODS.has(p)) return "Gece";
  if (DAY_TURN_PERIODS.has(p)) return "Gündüz";
  if (p === "WinCheck" || p === "GameOver") return "Sonuç";
  if (p === "RoleReveal") return "Rol açılımı";
  if (p === "HunterLastBreath") return "Gece";
  return journalPersonalPhaseLabel(phase);
}

/**
 * Hangi rol / hangi oylama adımında olduğumuz (payload’da rol yoksa fazdan türetilir).
 * Örn. `Vampir sırası`, `Gündüz oylaması`.
 */
export function journalPersonalTurnStepLabel(phase: unknown): string {
  if (typeof phase !== "string" || !phase) return "—";
  const p = phase as GamePhase;
  switch (p) {
    case "VampireVote":
      return "Vampir sırası";
    case "DetectiveInspect":
      return "Dedektif sırası";
    case "DoctorProtect":
      return "Doktor sırası";
    case "GuardProtect":
      return "Gardiyan sırası";
    case "DayVote":
      return "Gündüz oylaması";
    case "MayorElection":
      return "Belediye başkanı seçimi";
    case "HunterLastBreath":
      return "Avcı son nefesi";
    default:
      return journalPersonalPhaseLabel(phase);
  }
}

/** Günlük tek satır: `1. Tur · Gece · Vampir sırası` */
export function formatPersonalTurnLogLine(payload: Record<string, unknown> | undefined): string {
  const p = payload ?? {};
  const rt = formatJournalRoundTur(p.round);
  const period = journalPersonalTurnPeriod(p.phase);
  const step = journalPersonalTurnStepLabel(p.phase);
  return `${rt} · ${period} · ${step}`;
}
