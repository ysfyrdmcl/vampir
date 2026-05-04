import type { ActionSubmission, GamePhase } from "@vampir-koylu/shared";
import { env } from "../config/env.js";
import type { RoomState } from "../game/game-types.js";
import type { BotMemory } from "./bot-memory.js";
import { actionTypeForBotPhase } from "./bot-types.js";
import { legalTargetsForBot, pickBotTargetOrder } from "./bot-targeting.js";

export interface BotActionEngineLogger {
  info(payload: object, message?: string): void;
  warn(payload: object, message?: string): void;
}

const noopLog: BotActionEngineLogger = {
  info: () => undefined,
  warn: () => undefined
};

function botActionDelayMs(): number {
  const isProd = env.NODE_ENV === "production";
  const min = isProd ? 1000 : 300;
  const max = isProd ? 3000 : 800;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export class BotActionEngine {
  private readonly scheduleGen = new Map<string, number>();

  constructor(
    private readonly deps: {
      getRoom: (roomCode: string) => RoomState | null;
      submitGameAction: (room: RoomState, actorPlayerId: string, submission: ActionSubmission) => void;
      getBotMemory: (roomCode: string, botPlayerId: string) => BotMemory;
      log?: BotActionEngineLogger;
    }
  ) {}

  private getLogger(): BotActionEngineLogger {
    return this.deps.log ?? noopLog;
  }

  disposeRoom(roomCode: string): void {
    this.bumpGeneration(roomCode);
    this.scheduleGen.delete(roomCode);
  }

  onGamePaused(roomCode: string): void {
    this.bumpGeneration(roomCode);
  }

  /** Call after phase transition (tick) so old timers are dropped and new phase bots are scheduled. */
  onPhaseAdvanced(room: RoomState): void {
    const gen = this.bumpGeneration(room.roomCode);
    this.scheduleForRoom(room, gen);
  }

  /** Call after resume; timers were cleared on pause. */
  onGameResumed(room: RoomState): void {
    const gen = this.bumpGeneration(room.roomCode);
    this.scheduleForRoom(room, gen);
  }

  private bumpGeneration(roomCode: string): number {
    const n = (this.scheduleGen.get(roomCode) ?? 0) + 1;
    this.scheduleGen.set(roomCode, n);
    return n;
  }

  private scheduleForRoom(room: RoomState, gen: number): void {
    if (room.status !== "InGame" || room.game.isPaused || room.game.phase === "GameOver") {
      return;
    }
    const phase = room.game.phase;
    const actionType = actionTypeForBotPhase(phase);
    if (!actionType) return;

    const round = room.game.round;
    const roomCode = room.roomCode;

    const botsToSchedule = this.collectBotActors(room, phase);
    for (const actorPlayerId of botsToSchedule) {
      if (this.botAlreadySubmitted(room, actorPlayerId, actionType, round)) continue;
      const delayMs = botActionDelayMs();
      setTimeout(() => this.runScheduledAction(roomCode, gen, phase, round, actorPlayerId, actionType), delayMs);
    }
  }

  private collectBotActors(room: RoomState, phase: GamePhase): string[] {
    switch (phase) {
      case "VampireVote":
        return room.players.filter((p) => p.isBot && p.isAlive && p.role === "Vampire").map((p) => p.playerId);
      case "DetectiveInspect":
        return room.players.filter((p) => p.isBot && p.isAlive && p.role === "Detective").map((p) => p.playerId);
      case "DoctorProtect":
        return room.players.filter((p) => p.isBot && p.isAlive && p.role === "Doctor").map((p) => p.playerId);
      case "GuardProtect":
        return room.players
          .filter((p) => p.isBot && p.isAlive && p.role === "Guard" && !p.guardUsedInGame)
          .map((p) => p.playerId);
      case "MayorElection":
        return room.players.filter((p) => p.isBot && p.isAlive).map((p) => p.playerId);
      case "DayVote":
        return room.players.filter((p) => p.isBot && p.isAlive).map((p) => p.playerId);
      case "HunterLastBreath": {
        const hid = room.game.lastEliminationSummary?.playerId;
        if (!hid || room.game.lastEliminationSummary?.source !== "Day") return [];
        const hunter = room.players.find((p) => p.playerId === hid);
        if (!hunter?.isBot || hunter.role !== "Hunter") return [];
        return [hunter.playerId];
      }
      default:
        return [];
    }
  }

  private botAlreadySubmitted(
    room: RoomState,
    actorPlayerId: string,
    actionType: ActionSubmission["actionType"],
    round: number
  ): boolean {
    return room.game.actions.some(
      (a) => a.actorPlayerId === actorPlayerId && a.actionType === actionType && a.round === round && Boolean(a.targetPlayerId)
    );
  }

  private runScheduledAction(
    roomCode: string,
    gen: number,
    expectedPhase: GamePhase,
    expectedRound: number,
    actorPlayerId: string,
    actionType: ActionSubmission["actionType"]
  ): void {
    if ((this.scheduleGen.get(roomCode) ?? 0) !== gen) return;
    const room = this.deps.getRoom(roomCode);
    if (!room || room.status !== "InGame" || room.game.isPaused) return;
    if (room.game.phase !== expectedPhase || room.game.round !== expectedRound) return;
    if (room.game.phase === "GameOver") return;

    const actor = room.players.find((p) => p.playerId === actorPlayerId);
    if (!actor?.isBot) return;
    if (this.botAlreadySubmitted(room, actorPlayerId, actionType, expectedRound)) return;

    const memory = this.deps.getBotMemory(roomCode, actorPlayerId);
    const targets = legalTargetsForBot(room, expectedPhase, actorPlayerId, memory);
    if (targets.length === 0) {
      this.getLogger().info({ roomCode, actorPlayerId, actionType, phase: expectedPhase }, "bot.action.skipped");
      return;
    }

    const order = pickBotTargetOrder(room, expectedPhase, actorPlayerId, actor.botIntelligence, memory);
    const first = order[0] ?? targets[0];
    const tried = this.trySubmit(room, actorPlayerId, actionType, first);
    if (tried) {
      this.getLogger().info({ roomCode, actorPlayerId, actionType, targetPlayerId: first }, "bot.action.submit");
      return;
    }
    this.getLogger().warn({ roomCode, actorPlayerId, actionType, targetPlayerId: first }, "bot.action.invalid_target");

    const second = order.find((id) => id !== first && id !== actorPlayerId) ?? null;
    if (!second) {
      this.getLogger().info({ roomCode, actorPlayerId, actionType }, "bot.action.skipped");
      return;
    }
    if (this.trySubmit(room, actorPlayerId, actionType, second)) {
      this.getLogger().info({ roomCode, actorPlayerId, actionType, targetPlayerId: second }, "bot.action.submit");
      return;
    }
    this.getLogger().warn({ roomCode, actorPlayerId, actionType, targetPlayerId: second }, "bot.action.invalid_target");
    this.getLogger().info({ roomCode, actorPlayerId, actionType }, "bot.action.skipped");
  }

  private trySubmit(
    room: RoomState,
    actorPlayerId: string,
    actionType: ActionSubmission["actionType"],
    targetPlayerId: string
  ): boolean {
    try {
      this.deps.submitGameAction(room, actorPlayerId, {
        roomCode: room.roomCode,
        actionType,
        targetPlayerId,
        phase: room.game.phase,
        round: room.game.round
      });
      return true;
    } catch {
      return false;
    }
  }
}
