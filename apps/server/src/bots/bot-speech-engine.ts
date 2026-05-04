import type { BotSpeechEvent, BotSpeechIntent, BotSpeechTone, GamePhase } from "@vampir-koylu/shared";
import type { PlayerState, RoomState } from "../game/game-types.js";
import type { BotMemory } from "./bot-memory.js";
import {
  BOT_SPEECH_POPUP_MS,
  accuseSoftLines,
  detectiveSoftLines,
  doctorVagueLines,
  genericObservationLines,
  maxTotalBotSpeechPerPhase,
  MAX_SPEECH_PER_BOT_PER_DAY,
  pickRandomLine,
  renderTemplate,
  selfDefenseLines,
  speechStaggerDelayMs,
  supportSoftLines,
  vampireMisdirectLines,
  voteHintLines
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

function aliveBots(room: RoomState): PlayerState[] {
  return room.players.filter((p) => p.isBot && p.isAlive);
}

function randomTone(): BotSpeechTone {
  const tones: BotSpeechTone[] = ["calm", "sharp", "neutral", "playful"];
  return tones[Math.floor(Math.random() * tones.length)]!;
}

function pickRandom<T extends PlayerState>(list: T[]): T | null {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)]!;
}

function nonVampireTargets(room: RoomState, selfId: string): PlayerState[] {
  return room.players.filter((p) => p.isAlive && p.playerId !== selfId && p.role !== "Vampire");
}

function doctorAccusePool(room: RoomState, selfId: string, memory: BotMemory): PlayerState[] {
  const avoid = memory.lastProtectedPlayerId;
  return room.players.filter(
    (p) => p.isAlive && p.playerId !== selfId && (!avoid || p.playerId !== avoid)
  );
}

function genericPool(room: RoomState, selfId: string): PlayerState[] {
  return room.players.filter((p) => p.isAlive && p.playerId !== selfId);
}

export class BotSpeechEngine {
  private readonly scheduleGen = new Map<string, number>();
  private readonly emittedThisPhase = new Map<string, { phase: GamePhase; round: number; count: number }>();

  constructor(
    private readonly deps: {
      getRoom: (roomCode: string) => RoomState | null;
      getBotMemory: (roomCode: string, botPlayerId: string) => BotMemory;
      emit: (roomCode: string, event: BotSpeechEvent) => void;
      onSpeechCommitted: (roomCode: string, botPlayerId: string, intent: BotSpeechIntent, targetPlayerId?: string) => void;
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
      if (memory.speechCountThisDay >= MAX_SPEECH_PER_BOT_PER_DAY) continue;

      const built = this.composeSpeech(room, speaker, memory);
      if (!built) continue;

      st.count += 1;
      this.deps.emit(roomCode, built);
      this.deps.onSpeechCommitted(roomCode, speaker.playerId, built.intent, built.targetPlayerId);
      this.getLog().info(
        { roomCode, speakerPlayerId: speaker.playerId, intent: built.intent, phase: room.game.phase },
        "bot.speech.emit"
      );
      return;
    }

    this.getLog().info({ roomCode, phase: room.game.phase }, "bot.speech.skipped");
  }

  private composeSpeech(room: RoomState, speaker: PlayerState, memory: BotMemory): BotSpeechEvent | null {
    const role = speaker.role;
    if (!role) return null;

    const roll = Math.random();
    const tone = randomTone();

    if (role === "Doctor") {
      if (roll < 0.28) {
        return this.event(room, speaker, "generic_observation", pickRandomLine(doctorVagueLines), tone);
      }
    }

    if (role === "Detective" && roll < 0.22) {
      const t = pickRandom(genericPool(room, speaker.playerId));
      if (t) {
        const line = pickRandomLine(detectiveSoftLines);
        return this.event(
          room,
          speaker,
          "accuse_soft",
          renderTemplate(line, t.nickname),
          tone,
          t.playerId
        );
      }
    }

    if (role === "Vampire" && roll < 0.2) {
      const t = pickRandom(nonVampireTargets(room, speaker.playerId));
      if (t) {
        const line = pickRandomLine(vampireMisdirectLines);
        if (line.includes("{targetName}")) {
          return this.event(
            room,
            speaker,
            "accuse_soft",
            renderTemplate(line, t.nickname),
            tone,
            t.playerId
          );
        }
        return this.event(room, speaker, "generic_observation", line, tone);
      }
    }

    if (roll < 0.22) {
      return this.event(room, speaker, "self_defense", pickRandomLine(selfDefenseLines), tone);
    }
    if (roll < 0.4) {
      return this.event(room, speaker, "generic_observation", pickRandomLine(genericObservationLines), tone);
    }

    if (roll < 0.62) {
      const pool =
        role === "Doctor"
          ? doctorAccusePool(room, speaker.playerId, memory)
          : role === "Vampire"
            ? nonVampireTargets(room, speaker.playerId)
            : genericPool(room, speaker.playerId);
      const t = pickRandom(pool);
      if (t) {
        return this.event(
          room,
          speaker,
          "accuse_soft",
          renderTemplate(pickRandomLine(accuseSoftLines), t.nickname),
          tone,
          t.playerId
        );
      }
    }

    if (roll < 0.78) {
      const pool = role === "Vampire" ? nonVampireTargets(room, speaker.playerId) : genericPool(room, speaker.playerId);
      const t = pickRandom(pool);
      if (t) {
        return this.event(
          room,
          speaker,
          "support_soft",
          renderTemplate(pickRandomLine(supportSoftLines), t.nickname),
          tone,
          t.playerId
        );
      }
    }

    const votePool = role === "Vampire" ? nonVampireTargets(room, speaker.playerId) : genericPool(room, speaker.playerId);
    const vt = pickRandom(votePool);
    if (vt) {
      return this.event(
        room,
        speaker,
        "vote_hint",
        renderTemplate(pickRandomLine(voteHintLines), vt.nickname),
        tone,
        vt.playerId
      );
    }

    return this.event(room, speaker, "generic_observation", pickRandomLine(genericObservationLines), tone);
  }

  private event(
    room: RoomState,
    speaker: PlayerState,
    intent: BotSpeechIntent,
    message: string,
    tone: BotSpeechTone,
    targetPlayerId?: string
  ): BotSpeechEvent {
    return {
      roomCode: room.roomCode,
      phaseId: `${room.game.phase}:${room.game.round}`,
      speakerPlayerId: speaker.playerId,
      speakerName: speaker.nickname,
      message,
      tone,
      intent,
      targetPlayerId,
      durationMs: BOT_SPEECH_POPUP_MS,
      createdAt: Date.now()
    };
  }
}
