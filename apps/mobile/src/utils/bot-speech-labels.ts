import type { BotSpeechIntent, BotSpeechTone, GamePhase } from "@vampir-koylu/shared";

const PHASE_TR: Record<GamePhase, string> = {
  Lobby: "Lobi",
  RoleReveal: "Rol açılımı",
  NightStart: "Gece başlangıcı",
  VampireVote: "Vampir oyu",
  DetectiveInspect: "Dedektif sorgusu",
  DoctorProtect: "Doktor koruması",
  NightResolve: "Gece özeti",
  DayStart: "Gündüz başlangıcı",
  MayorElection: "Başkan seçimi",
  GuardProtect: "Gardiyan koruması",
  DayDiscussion: "Köy tartışması",
  DayVote: "Oylama",
  ExecutionResolve: "İnfaz",
  HunterLastBreath: "Avcı son nefesi",
  WinCheck: "Sonuç kontrolü",
  GameOver: "Oyun sonu"
};

const INTENT_TR: Record<BotSpeechIntent, string> = {
  self_defense: "Savunma",
  accuse_soft: "İtham",
  support_soft: "Destek",
  vote_hint: "Oy ipucu",
  generic_observation: "Gözlem"
};

const TONE_TR: Record<BotSpeechTone, string> = {
  calm: "Sakin",
  sharp: "Keskin",
  neutral: "Nötr",
  playful: "Oyuncu"
};

export function botSpeechIntentLabel(intent: BotSpeechIntent): string {
  return INTENT_TR[intent] ?? intent;
}

export function botSpeechToneLabel(tone: BotSpeechTone): string {
  return TONE_TR[tone] ?? tone;
}

/** `DayDiscussion:2` → faz + tur; aksi halde kısa yedek metin. */
export function formatBotSpeechPhaseContext(phaseId: string): string {
  const last = phaseId.lastIndexOf(":");
  if (last <= 0) return phaseId || "—";
  const phaseKey = phaseId.slice(0, last) as GamePhase;
  const round = Number(phaseId.slice(last + 1));
  if (!Number.isFinite(round) || round < 1) return phaseId;
  const phaseName = PHASE_TR[phaseKey] ?? phaseKey;
  return `${phaseName} · Tur ${round}`;
}

/** Liste satırı: konuşmacı · niyet · ton (Türkçe). */
export function formatBotSpeechMetaLine(speakerName: string, intent: BotSpeechIntent, tone: BotSpeechTone): string {
  return `${speakerName} · ${botSpeechIntentLabel(intent)} · ${botSpeechToneLabel(tone)}`;
}

/**
 * Göreli süre (liste tazelenince güncellenir).
 * "Az önce" ≈ 60 sn içi.
 */
export function formatBotSpeechRelativeTime(createdAtMs: number, nowMs = Date.now()): string {
  const sec = Math.floor((nowMs - createdAtMs) / 1000);
  if (sec < 60) return "Az önce";
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    return `${m} dk önce`;
  }
  if (sec < 86400) {
    const h = Math.floor(sec / 3600);
    return `${h} sa önce`;
  }
  return new Date(createdAtMs).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
