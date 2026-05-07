import type {
  BotIntelligence,
  BotPersonality,
  BotSpeechEvent,
  BotSpeechIntent,
  BotSpeechTone,
  GamePhase,
  Role
} from "@vampir-koylu/shared";
import type { PlayerState, RoomState } from "../game/game-types.js";
import type { BotMemory } from "./bot-memory.js";
import { pickBotTargetOrder } from "./bot-targeting.js";
import { NO_LYNCH_TARGET } from "./bot-types.js";
import {
  BOT_SPEECH_POPUP_MS,
  MAX_SPEECH_PER_BOT_PER_DAY,
  MAX_SPEECH_PER_BOT_PER_PHASE,
  maxTotalBotSpeechPerPhase,
  pickRandomLine,
  randomJokeTails,
  randomSofteners,
  renderSpeechTemplate,
  type SpeechTemplate,
  speechStaggerDelayMs,
  speechTemplates
} from "./bot-speech-templates.js";

interface Logger {
  info(payload: object, message?: string): void;
}

const noopLog: Logger = { info: () => undefined };

const SPEECH_PHASES = new Set<GamePhase>([
  "DayStart",
  "DayDiscussion",
  "MayorElection",
  "DayVote",
  "ExecutionResolve",
  "HunterLastBreath"
]);

export type BotSpeechContext = {
  roomCode: string;
  phase: GamePhase;
  round: number;
  speaker: PlayerState;
  speakerRole?: Role;
  speakerPersonality: BotPersonality;
  speakerIntelligence: BotIntelligence;
  alivePlayers: PlayerState[];
  deadPlayers: PlayerState[];
  intendedVoteTargetId?: string;
  intendedActionTargetId?: string;
  recentTargetId?: string;
  suspicionByPlayerId: Record<string, number>;
  trustByPlayerId: Record<string, number>;
  knownVampires: string[];
  knownNonVampires: string[];
  lastVotedPlayerId?: string;
  lastProtectedPlayerId?: string;
  phaseSpeechCount: number;
  daySpeechCount: number;
  recentSpeechTemplateIds: string[];
  recentSpeechFingerprints: string[];
  lastSpeechIntent?: BotSpeechIntent;
  lastSpeechTargetId?: string;
};

type BuiltSpeech = BotSpeechEvent & {
  templateId: string;
  fingerprint: string;
};

type IntentWeight = { intent: BotSpeechIntent; weight: number };

const PHASE_NAMES: Partial<Record<GamePhase, string>> = {
  DayStart: "gündüz",
  DayDiscussion: "tartışma",
  MayorElection: "başkan seçimi",
  DayVote: "oylama",
  ExecutionResolve: "infaz",
  HunterLastBreath: "avcının son nefesi"
};

const PERSONALITY_INTENTS: Record<BotPersonality, IntentWeight[]> = {
  quiet: [
    { intent: "small_talk", weight: 5 },
    { intent: "accuse_soft", weight: 1 },
    { intent: "support_soft", weight: 1 }
  ],
  defensive: [
    { intent: "self_defense", weight: 5 },
    { intent: "support_soft", weight: 2 },
    { intent: "small_talk", weight: 1 }
  ],
  accuser: [
    { intent: "accuse_soft", weight: 5 },
    { intent: "vote_hint", weight: 3 },
    { intent: "small_talk", weight: 1 }
  ],
  analyst: [
    { intent: "analysis", weight: 5 },
    { intent: "vote_hint", weight: 2 },
    { intent: "support_soft", weight: 1 }
  ],
  chaotic: [
    { intent: "chaos", weight: 5 },
    { intent: "small_talk", weight: 3 },
    { intent: "accuse_soft", weight: 1 }
  ],
  leader: [
    { intent: "vote_hint", weight: 4 },
    { intent: "mayor_hint", weight: 3 },
    { intent: "analysis", weight: 2 },
    { intent: "support_soft", weight: 1 }
  ]
};

const PHASE_INTENTS: Partial<Record<GamePhase, BotSpeechIntent[]>> = {
  DayStart: ["small_talk", "chaos", "generic_observation"],
  DayDiscussion: ["small_talk", "accuse_soft", "support_soft", "analysis", "chaos", "self_defense"],
  MayorElection: ["mayor_hint", "support_soft", "analysis", "small_talk"],
  DayVote: ["vote_hint", "accuse_soft", "analysis", "self_defense"],
  ExecutionResolve: ["tie_reaction", "execution_reaction", "small_talk"],
  HunterLastBreath: ["hunter_reaction", "generic_observation"]
};

function aliveBots(room: RoomState): PlayerState[] {
  return room.players.filter((p) => p.isBot && p.isAlive);
}

function randomToneForIntent(intent: BotSpeechIntent, personality: BotPersonality): BotSpeechTone {
  if (intent === "chaos" || personality === "chaotic") return "playful";
  if (intent === "accuse_soft" || intent === "vote_hint") return "sharp";
  if (intent === "analysis" || personality === "analyst") return "calm";
  if (intent === "self_defense" || personality === "defensive") return "neutral";
  return pickRandomLine(["calm", "neutral", "playful"] as const) as BotSpeechTone;
}

function pickRandom<T>(list: readonly T[]): T | null {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)]!;
}

function weightedPick(items: IntentWeight[]): BotSpeechIntent | null {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.intent;
  }
  return items[items.length - 1]?.intent ?? null;
}

function topScoredPlayerId(scores: Record<string, number>, candidates: PlayerState[], excludeId?: string): string | undefined {
  const ranked = candidates
    .filter((p) => p.playerId !== excludeId)
    .map((p) => ({ id: p.playerId, score: scores[p.playerId] ?? 0 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.id;
}

function playerById(ctx: BotSpeechContext, playerId?: string): PlayerState | undefined {
  if (!playerId || playerId === NO_LYNCH_TARGET) return undefined;
  return ctx.alivePlayers.find((p) => p.playerId === playerId);
}

function safeTargetPool(ctx: BotSpeechContext): PlayerState[] {
  const pool = ctx.alivePlayers.filter((p) => p.playerId !== ctx.speaker.playerId);
  if (ctx.speakerRole === "Vampire") return pool.filter((p) => p.role !== "Vampire");
  if (ctx.speakerRole === "Doctor" && ctx.lastProtectedPlayerId) {
    return pool.filter((p) => p.playerId !== ctx.lastProtectedPlayerId);
  }
  return pool;
}

function firstActionTarget(room: RoomState, speaker: PlayerState, memory: BotMemory): string | undefined {
  if (room.game.phase !== "DayVote" && room.game.phase !== "MayorElection") return undefined;
  const order = pickBotTargetOrder(room, room.game.phase, speaker.playerId, speaker.botIntelligence, memory);
  return order.find((id) => id !== NO_LYNCH_TARGET && id !== speaker.playerId);
}

export function buildBotSpeechContext(room: RoomState, speaker: PlayerState, memory: BotMemory): BotSpeechContext | null {
  if (room.status !== "InGame" || room.game.isPaused || room.game.phase === "GameOver") return null;
  if (!SPEECH_PHASES.has(room.game.phase)) return null;
  if (!speaker.isBot || !speaker.isAlive || !speaker.role) return null;

  const intendedTargetId = firstActionTarget(room, speaker, memory);
  const intendedVoteTargetId =
    room.game.phase === "DayVote" || room.game.phase === "MayorElection" ? intendedTargetId : undefined;

  return {
    roomCode: room.roomCode,
    phase: room.game.phase,
    round: room.game.round,
    speaker,
    speakerRole: speaker.role,
    speakerPersonality: speaker.botPersonality ?? "quiet",
    speakerIntelligence: speaker.botIntelligence ?? "balanced",
    alivePlayers: room.players.filter((p) => p.isAlive),
    deadPlayers: room.players.filter((p) => !p.isAlive),
    intendedVoteTargetId,
    intendedActionTargetId: intendedTargetId,
    recentTargetId: memory.lastVotedPlayerId,
    suspicionByPlayerId: memory.suspicionByPlayerId,
    trustByPlayerId: memory.trustByPlayerId,
    knownVampires: memory.knownVampires,
    knownNonVampires: memory.knownNonVampires,
    lastVotedPlayerId: memory.lastVotedPlayerId,
    lastProtectedPlayerId: memory.lastProtectedPlayerId,
    phaseSpeechCount: memory.speechCountThisPhase,
    daySpeechCount: memory.speechCountThisDay,
    recentSpeechTemplateIds: memory.recentSpeechTemplateIds,
    recentSpeechFingerprints: memory.recentSpeechFingerprints,
    lastSpeechIntent: memory.lastSpeechIntent,
    lastSpeechTargetId: memory.lastSpeechTargetId
  };
}

export function chooseBotSpeechIntent(ctx: BotSpeechContext): BotSpeechIntent | null {
  const phaseAllowed = PHASE_INTENTS[ctx.phase] ?? ["generic_observation"];
  if (ctx.phase === "ExecutionResolve" && ctx.round > 0) {
    return ctx.speakerIntelligence === "random" ? "tie_reaction" : "execution_reaction";
  }
  if (ctx.phase === "HunterLastBreath") return "hunter_reaction";

  const base = PERSONALITY_INTENTS[ctx.speakerPersonality].filter((x) => phaseAllowed.includes(x.intent));
  const weighted = base.length ? [...base] : phaseAllowed.map((intent) => ({ intent, weight: 1 }));

  if (ctx.intendedVoteTargetId) weighted.push({ intent: ctx.phase === "MayorElection" ? "mayor_hint" : "vote_hint", weight: 4 });
  if (topScoredPlayerId(ctx.suspicionByPlayerId, safeTargetPool(ctx))) weighted.push({ intent: "accuse_soft", weight: 2 });
  if (topScoredPlayerId(ctx.trustByPlayerId, safeTargetPool(ctx), ctx.lastProtectedPlayerId)) {
    weighted.push({ intent: "support_soft", weight: 1 });
  }
  if (ctx.speakerIntelligence === "random") weighted.push({ intent: "small_talk", weight: 3 });
  if (ctx.speakerIntelligence === "deceptive" && ctx.speakerRole === "Vampire") weighted.push({ intent: "accuse_soft", weight: 3 });
  if (ctx.lastSpeechIntent) {
    for (const item of weighted) {
      if (item.intent === ctx.lastSpeechIntent) item.weight = Math.max(0, item.weight - 3);
    }
  }

  return weightedPick(weighted.filter((x) => phaseAllowed.includes(x.intent) && x.weight > 0));
}

export function selectSpeechTargetForIntent(ctx: BotSpeechContext, intent: BotSpeechIntent): PlayerState | undefined {
  const pool = safeTargetPool(ctx);
  if (!pool.length) return undefined;

  if (intent === "vote_hint" || intent === "mayor_hint") {
    return playerById(ctx, ctx.intendedVoteTargetId) ?? pickRandom(pool) ?? undefined;
  }
  if (intent === "accuse_soft" || intent === "analysis") {
    const detectiveKnown = ctx.speakerRole === "Detective" ? ctx.knownVampires.find((id) => pool.some((p) => p.playerId === id)) : undefined;
    return playerById(ctx, detectiveKnown) ?? playerById(ctx, topScoredPlayerId(ctx.suspicionByPlayerId, pool)) ?? pickRandom(pool) ?? undefined;
  }
  if (intent === "support_soft") {
    return playerById(ctx, topScoredPlayerId(ctx.trustByPlayerId, pool, ctx.lastProtectedPlayerId)) ?? pickRandom(pool) ?? undefined;
  }
  return undefined;
}

function templateMatches(ctx: BotSpeechContext, template: SpeechTemplate, target: PlayerState | undefined): boolean {
  if (template.phases && !template.phases.includes(ctx.phase)) return false;
  if (template.personalities && !template.personalities.includes(ctx.speakerPersonality)) return false;
  if (template.intelligences && !template.intelligences.includes(ctx.speakerIntelligence)) return false;
  if (template.requiresTarget && !target) return false;
  if (ctx.recentSpeechTemplateIds.includes(template.id)) return false;
  if (ctx.lastSpeechIntent === template.intent && ctx.lastSpeechTargetId && target?.playerId === ctx.lastSpeechTargetId) return false;
  if (template.tags?.includes("doctor_safe") && ctx.speakerRole !== "Doctor") return false;
  if (template.tags?.includes("detective_safe") && ctx.speakerRole !== "Detective") return false;
  if (template.tags?.includes("vampire_safe") && ctx.speakerRole !== "Vampire") return false;
  return true;
}

export function composeBotSpeech(ctx: BotSpeechContext): BuiltSpeech | null {
  if (ctx.daySpeechCount >= MAX_SPEECH_PER_BOT_PER_DAY) return null;
  if (ctx.phaseSpeechCount >= MAX_SPEECH_PER_BOT_PER_PHASE) return null;

  const firstIntent = chooseBotSpeechIntent(ctx);
  const fallbackIntents = PHASE_INTENTS[ctx.phase] ?? ["generic_observation"];
  const intents = [firstIntent, ...fallbackIntents].filter((x, i, arr): x is BotSpeechIntent => Boolean(x) && arr.indexOf(x) === i);

  for (const intent of intents) {
    const target = selectSpeechTargetForIntent(ctx, intent);
    const candidates = speechTemplates.filter((template) => template.intent === intent && templateMatches(ctx, template, target));
    const template = pickRandom(candidates);
    if (!template) continue;

    const message = renderSpeechTemplate(template, {
      speakerName: ctx.speaker.nickname,
      targetName: target?.nickname,
      phaseName: PHASE_NAMES[ctx.phase] ?? ctx.phase,
      randomSoftener: pickRandomLine(randomSofteners),
      randomJokeTail: pickRandomLine(randomJokeTails)
    });
    const fingerprint = `${ctx.phase}:${ctx.round}:${ctx.speaker.playerId}:${template.id}:${target?.playerId ?? ""}`;
    if (ctx.recentSpeechFingerprints.includes(fingerprint)) continue;

    return {
      roomCode: ctx.roomCode,
      phaseId: `${ctx.phase}:${ctx.round}`,
      speakerPlayerId: ctx.speaker.playerId,
      speakerName: ctx.speaker.nickname,
      message,
      tone: randomToneForIntent(intent, ctx.speakerPersonality),
      intent,
      targetPlayerId: target?.playerId,
      durationMs: BOT_SPEECH_POPUP_MS,
      createdAt: Date.now(),
      templateId: template.id,
      fingerprint
    };
  }

  return null;
}

export class BotSpeechEngine {
  private readonly scheduleGen = new Map<string, number>();
  private readonly emittedThisPhase = new Map<string, { phase: GamePhase; round: number; count: number }>();

  constructor(
    private readonly deps: {
      getRoom: (roomCode: string) => RoomState | null;
      getBotMemory: (roomCode: string, botPlayerId: string) => BotMemory;
      emit: (roomCode: string, event: BotSpeechEvent) => void;
      onSpeechCommitted: (
        roomCode: string,
        botPlayerId: string,
        intent: BotSpeechIntent,
        targetPlayerId?: string,
        templateId?: string,
        fingerprint?: string
      ) => void;
      log?: Logger;
    }
  ) {}

  private getLog(): Logger {
    return this.deps.log ?? noopLog;
  }

  disposeRoom(roomCode: string): void {
    this.bumpGeneration(roomCode);
    this.scheduleGen.delete(roomCode);
    this.emittedThisPhase.delete(roomCode);
  }

  onGamePaused(roomCode: string): void {
    this.bumpGeneration(roomCode);
  }

  onPhaseAdvanced(room: RoomState): void {
    const gen = this.bumpGeneration(room.roomCode);
    this.emittedThisPhase.set(room.roomCode, {
      phase: room.game.phase,
      round: room.game.round,
      count: 0
    });
    this.scheduleSpeechWave(room, gen);
  }

  private bumpGeneration(roomCode: string): number {
    const n = (this.scheduleGen.get(roomCode) ?? 0) + 1;
    this.scheduleGen.set(roomCode, n);
    return n;
  }

  private scheduleSpeechWave(room: RoomState, gen: number): void {
    if (room.status !== "InGame" || room.game.isPaused || room.game.phase === "GameOver") return;
    if (!SPEECH_PHASES.has(room.game.phase)) return;

    const bots = aliveBots(room);
    if (!bots.length) return;

    const maxTotal = maxTotalBotSpeechPerPhase(bots.length);
    let cumulative = 0;
    for (let i = 0; i < maxTotal; i++) {
      cumulative += speechStaggerDelayMs();
      setTimeout(() => this.tryEmitSpeechSlot(room.roomCode, gen), cumulative);
    }
  }

  private tryEmitSpeechSlot(roomCode: string, gen: number): void {
    if ((this.scheduleGen.get(roomCode) ?? 0) !== gen) return;
    const room = this.deps.getRoom(roomCode);
    if (!room || room.status !== "InGame" || room.game.isPaused || room.game.phase === "GameOver") return;
    if (!SPEECH_PHASES.has(room.game.phase)) return;

    let st = this.emittedThisPhase.get(roomCode);
    if (!st || st.phase !== room.game.phase || st.round !== room.game.round) {
      st = { phase: room.game.phase, round: room.game.round, count: 0 };
      this.emittedThisPhase.set(roomCode, st);
    }

    const bots = aliveBots(room);
    const maxTotal = maxTotalBotSpeechPerPhase(bots.length);
    if (st.count >= maxTotal) return;

    const shuffled = [...bots].sort(() => Math.random() - 0.5);
    for (const speaker of shuffled) {
      const memory = this.deps.getBotMemory(roomCode, speaker.playerId);
      const ctx = buildBotSpeechContext(room, speaker, memory);
      if (!ctx) continue;

      const built = composeBotSpeech(ctx);
      if (!built) continue;

      const { templateId, fingerprint, ...event } = built;
      st.count += 1;
      this.deps.emit(roomCode, event);
      this.deps.onSpeechCommitted(roomCode, speaker.playerId, event.intent, event.targetPlayerId, templateId, fingerprint);
      this.getLog().info(
        { roomCode, speakerPlayerId: speaker.playerId, intent: event.intent, phase: room.game.phase, templateId },
        "bot.speech.emit"
      );
      return;
    }

    this.getLog().info({ roomCode, phase: room.game.phase }, "bot.speech.skipped");
  }
}
