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
import type { BotBrainController } from "./bot-brain-controller.js";
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
  speechInitialDelayMs,
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

type BotSpeechPhaseExclusions = {
  usedTemplateIds: ReadonlySet<string>;
  usedFingerprints: ReadonlySet<string>;
  usedIntentTargetPairs: ReadonlySet<string>;
};

type BotSpeechPhaseState = {
  roomCode: string;
  phaseId: string;
  usedTemplateIds: Set<string>;
  usedFingerprints: Set<string>;
  usedSpeakerPlayerIds: Set<string>;
  usedIntentTargetPairs: Set<string>;
  totalScheduled: number;
  totalEmitted: number;
};

type BotSpeechRoomRecent = {
  templateIds: string[];
  fingerprints: string[];
};

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

function shuffled<T>(list: readonly T[]): T[] {
  return [...list].sort(() => Math.random() - 0.5);
}

function weightedPickCandidate<T extends { weight: number }>(items: T[]): T | null {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
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

function intentTargetPair(intent: BotSpeechIntent, target: PlayerState | undefined): string {
  return `${intent}:${target?.playerId ?? ""}`;
}

function speechFingerprint(message: string): string {
  return message.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function templateCanAppearInPhase(template: SpeechTemplate, phase: GamePhase): boolean {
  return !template.phases || template.phases.includes(phase);
}

function templateIntentsForPhase(phase: GamePhase): BotSpeechIntent[] {
  return Array.from(new Set(speechTemplates.filter((template) => templateCanAppearInPhase(template, phase)).map((template) => template.intent)));
}

function templateMatches(
  ctx: BotSpeechContext,
  template: SpeechTemplate,
  target: PlayerState | undefined,
  exclusions?: BotSpeechPhaseExclusions
): boolean {
  if (template.phases && !template.phases.includes(ctx.phase)) return false;
  if (template.personalities && !template.personalities.includes(ctx.speakerPersonality)) return false;
  if (template.intelligences && !template.intelligences.includes(ctx.speakerIntelligence)) return false;
  if (template.requiresTarget && !target) return false;
  if (ctx.recentSpeechTemplateIds.includes(template.id)) return false;
  if (exclusions?.usedTemplateIds.has(template.id)) return false;
  if (ctx.lastSpeechIntent === template.intent && ctx.lastSpeechTargetId && target?.playerId === ctx.lastSpeechTargetId) return false;
  if (template.tags?.includes("doctor_safe") && ctx.speakerRole !== "Doctor") return false;
  if (template.tags?.includes("detective_safe") && ctx.speakerRole !== "Detective") return false;
  if (template.tags?.includes("vampire_safe") && ctx.speakerRole !== "Vampire") return false;
  return true;
}

export function composeBotSpeech(ctx: BotSpeechContext, exclusions?: BotSpeechPhaseExclusions): BuiltSpeech | null {
  if (ctx.daySpeechCount >= MAX_SPEECH_PER_BOT_PER_DAY) return null;
  if (ctx.phaseSpeechCount >= MAX_SPEECH_PER_BOT_PER_PHASE) return null;

  const firstIntent = chooseBotSpeechIntent(ctx);
  const fallbackIntents = templateIntentsForPhase(ctx.phase);
  const intents = [firstIntent, ...fallbackIntents].filter((x, i, arr): x is BotSpeechIntent => Boolean(x) && arr.indexOf(x) === i);
  const candidates: { intent: BotSpeechIntent; target: PlayerState | undefined; template: SpeechTemplate; weight: number }[] = [];

  for (const intent of intents) {
    const target = selectSpeechTargetForIntent(ctx, intent);
    if (exclusions?.usedIntentTargetPairs.has(intentTargetPair(intent, target))) continue;
    for (const template of shuffled(speechTemplates.filter((item) => item.intent === intent && templateMatches(ctx, item, target, exclusions)))) {
      candidates.push({ intent, target, template, weight: intent === firstIntent ? 4 : 1 });
    }
  }

  const firstCandidate = weightedPickCandidate(candidates);
  const orderedCandidates = firstCandidate
    ? [firstCandidate, ...shuffled(candidates.filter((candidate) => candidate !== firstCandidate))]
    : shuffled(candidates);

  for (const { intent, target, template } of orderedCandidates) {

    const message = renderSpeechTemplate(template, {
      speakerName: ctx.speaker.nickname,
      targetName: target?.nickname,
      phaseName: PHASE_NAMES[ctx.phase] ?? ctx.phase,
      randomSoftener: pickRandomLine(randomSofteners),
      randomJokeTail: pickRandomLine(randomJokeTails)
    });
    const fingerprint = speechFingerprint(message);
    if (ctx.recentSpeechFingerprints.includes(fingerprint)) continue;
    if (exclusions?.usedFingerprints.has(fingerprint)) continue;

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
  private readonly phaseStates = new Map<string, BotSpeechPhaseState>();
  private readonly timersByRoom = new Map<string, Set<ReturnType<typeof setTimeout>>>();
  private readonly recentByRoom = new Map<string, BotSpeechRoomRecent>();

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
      brain?: BotBrainController;
      log?: Logger;
    }
  ) {}

  private getLog(): Logger {
    return this.deps.log ?? noopLog;
  }

  disposeRoom(roomCode: string): void {
    this.bumpGeneration(roomCode);
    this.scheduleGen.delete(roomCode);
    this.phaseStates.delete(roomCode);
    this.recentByRoom.delete(roomCode);
  }

  onGamePaused(roomCode: string): void {
    this.bumpGeneration(roomCode);
  }

  onPhaseAdvanced(room: RoomState): void {
    const gen = this.bumpGeneration(room.roomCode);
    this.phaseStates.set(room.roomCode, this.createPhaseState(room, 0));
    this.scheduleSpeechWave(room, gen);
  }

  private bumpGeneration(roomCode: string): number {
    this.clearTimers(roomCode);
    const n = (this.scheduleGen.get(roomCode) ?? 0) + 1;
    this.scheduleGen.set(roomCode, n);
    return n;
  }

  private clearTimers(roomCode: string): void {
    const timers = this.timersByRoom.get(roomCode);
    if (!timers) return;
    for (const timer of timers) clearTimeout(timer);
    this.timersByRoom.delete(roomCode);
  }

  private createPhaseState(room: RoomState, totalScheduled: number): BotSpeechPhaseState {
    const recent = this.recentByRoom.get(room.roomCode);
    return {
      roomCode: room.roomCode,
      phaseId: `${room.game.phase}:${room.game.round}`,
      usedTemplateIds: new Set(recent?.templateIds ?? []),
      usedFingerprints: new Set(recent?.fingerprints ?? []),
      usedSpeakerPlayerIds: new Set(),
      usedIntentTargetPairs: new Set(),
      totalScheduled,
      totalEmitted: 0
    };
  }

  private scheduleSpeechWave(room: RoomState, gen: number): void {
    if (room.status !== "InGame" || room.game.isPaused || room.game.phase === "GameOver") return;
    if (!SPEECH_PHASES.has(room.game.phase)) return;

    const bots = aliveBots(room);
    if (!bots.length) return;

    const maxTotal = maxTotalBotSpeechPerPhase(bots.length);
    this.phaseStates.set(room.roomCode, this.createPhaseState(room, maxTotal));
    let cumulative = speechInitialDelayMs();
    for (let i = 0; i < maxTotal; i++) {
      const timer = setTimeout(() => {
        this.timersByRoom.get(room.roomCode)?.delete(timer);
        this.tryEmitSpeechSlot(room.roomCode, gen);
      }, cumulative);
      const timers = this.timersByRoom.get(room.roomCode) ?? new Set<ReturnType<typeof setTimeout>>();
      timers.add(timer);
      this.timersByRoom.set(room.roomCode, timers);
      cumulative += speechStaggerDelayMs();
    }
  }

  private tryEmitSpeechSlot(roomCode: string, gen: number): void {
    if ((this.scheduleGen.get(roomCode) ?? 0) !== gen) return;
    const room = this.deps.getRoom(roomCode);
    if (!room || room.status !== "InGame" || room.game.isPaused || room.game.phase === "GameOver") return;
    if (!SPEECH_PHASES.has(room.game.phase)) return;

    let st = this.phaseStates.get(roomCode);
    const phaseId = `${room.game.phase}:${room.game.round}`;
    if (!st || st.phaseId !== phaseId) {
      st = this.createPhaseState(room, maxTotalBotSpeechPerPhase(aliveBots(room).length));
      this.phaseStates.set(roomCode, st);
    }

    const bots = aliveBots(room);
    const maxTotal = maxTotalBotSpeechPerPhase(bots.length);
    if (st.totalEmitted >= maxTotal) return;

    for (const speaker of shuffled(bots)) {
      if (st.usedSpeakerPlayerIds.has(speaker.playerId)) continue;
      const memory = this.deps.getBotMemory(roomCode, speaker.playerId);
      const ctx = buildBotSpeechContext(room, speaker, memory);
      if (!ctx) continue;

      const built = composeBotSpeech(ctx, st);
      if (!built) continue;

      st.usedSpeakerPlayerIds.add(speaker.playerId);
      st.totalEmitted += 1;
      if (this.deps.brain) {
        void this.emitBrainOrFallback(room, speaker, memory, built, st);
      } else {
        this.emitBuiltSpeech(room, speaker, built, st);
      }
      return;
    }

    this.getLog().info(
      {
        roomCode,
        phaseId,
        eligibleCount: Math.max(0, maxTotal - st.totalEmitted),
        requestedSpeakerCount: st.totalScheduled
      },
      "bot.speech.low_template_pool"
    );
  }

  private rememberRoomSpeech(roomCode: string, templateId: string, fingerprint: string): void {
    const recent = this.recentByRoom.get(roomCode) ?? { templateIds: [], fingerprints: [] };
    recent.templateIds = [templateId, ...recent.templateIds.filter((id) => id !== templateId)].slice(0, 12);
    recent.fingerprints = [fingerprint, ...recent.fingerprints.filter((fp) => fp !== fingerprint)].slice(0, 12);
    this.recentByRoom.set(roomCode, recent);
  }

  private async emitBrainOrFallback(
    room: RoomState,
    speaker: PlayerState,
    memory: BotMemory,
    built: BuiltSpeech,
    st: BotSpeechPhaseState
  ): Promise<void> {
    const brain = this.deps.brain;
    if (!brain) {
      this.emitBuiltSpeech(room, speaker, built, st);
      return;
    }

    const generated = await brain.generateSpeech({
      room,
      speaker,
      memory,
      intent: built.intent,
      tone: built.tone,
      targetPlayerId: built.targetPlayerId
    });

    if (generated.ok && !st.usedFingerprints.has(generated.fingerprint) && !memory.recentSpeechFingerprints.includes(generated.fingerprint)) {
      const templateId = `llm:${generated.event.intent}`;
      st.usedTemplateIds.add(templateId);
      st.usedFingerprints.add(generated.fingerprint);
      st.usedIntentTargetPairs.add(intentTargetPair(generated.event.intent, room.players.find((p) => p.playerId === generated.event.targetPlayerId)));
      this.rememberRoomSpeech(room.roomCode, templateId, generated.fingerprint);
      this.deps.emit(room.roomCode, generated.event);
      this.deps.onSpeechCommitted(
        room.roomCode,
        speaker.playerId,
        generated.event.intent,
        generated.event.targetPlayerId,
        templateId,
        generated.fingerprint
      );
      this.getLog().info(
        { roomCode: room.roomCode, speakerPlayerId: speaker.playerId, intent: generated.event.intent, phase: room.game.phase, templateId },
        "bot.speech.llm.emit"
      );
      return;
    }

    this.getLog().info(
      {
        roomCode: room.roomCode,
        speakerPlayerId: speaker.playerId,
        phase: room.game.phase,
        fallbackTemplateId: built.templateId,
        reason: generated.ok ? "duplicate_or_recent_fingerprint" : generated.reason,
        error: generated.ok ? undefined : generated.error
      },
      "bot.speech.llm.fallback"
    );
    this.emitBuiltSpeech(room, speaker, built, st);
  }

  private emitBuiltSpeech(room: RoomState, speaker: PlayerState, built: BuiltSpeech, st: BotSpeechPhaseState): void {
    const { templateId, fingerprint, ...event } = built;
    st.usedTemplateIds.add(templateId);
    st.usedFingerprints.add(fingerprint);
    st.usedIntentTargetPairs.add(intentTargetPair(event.intent, room.players.find((p) => p.playerId === event.targetPlayerId)));
    this.rememberRoomSpeech(room.roomCode, templateId, fingerprint);
    this.deps.emit(room.roomCode, event);
    this.deps.onSpeechCommitted(room.roomCode, speaker.playerId, event.intent, event.targetPlayerId, templateId, fingerprint);
    this.getLog().info(
      { roomCode: room.roomCode, speakerPlayerId: speaker.playerId, intent: event.intent, phase: room.game.phase, templateId },
      "bot.speech.emit"
    );
  }
}
