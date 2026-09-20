import {
  ROLE_DEFINITIONS,
  ROLE_PRESETS,
  type ActionSubmission,
  type GamePhase,
  type GameStatePrivateDelta,
  type GameStateSnapshotPublic,
  type Role
} from "@vampir-koylu/shared";
import { env } from "../config/env.js";
import { resolveNight } from "./night-resolver.js";
import { assignRoles } from "./role-assignment.js";
import type { GameActionEntry, RoomState } from "./game-types.js";
import { resolveDayVotes } from "./vote-resolver.js";
import { calculateWinner } from "./win-condition.js";
import { pickRandom } from "../utils/random.js";

const MIN_NIGHT_START_PRESENTATION_SECONDS = 10;
const NO_LYNCH_TARGET = "__NO_LYNCH__";

export class GameEngine {
  startGame(room: RoomState): GameStatePrivateDelta[] {
    if (room.status !== "Lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }
    const activePlayers = room.players.filter((p) => p.isBot || p.isConnected);
    if (activePlayers.length < env.ROOM_MIN_PLAYERS) {
      throw new Error("NOT_ENOUGH_PLAYERS");
    }

    room.players = activePlayers;

    room.status = "InGame";
    room.game.phase = "RoleReveal";
    room.game.round = 1;
    room.game.tieCountInRound = 0;
    room.game.mayorPlayerId = null;
    room.game.guardProtectedPlayerId = null;
    room.game.winner = null;
    room.game.actions = [];
    room.game.privateResults = [];
    room.game.isPaused = false;
    room.game.pausedRemainingMs = null;
    room.game.lastDayVoteSummary = null;
    room.game.lastEliminationSummary = null;
    room.game.revoteCandidateIds = [];
    room.game.loverLinks = {};
    room.game.detectiveInspectedTargets = {};
    room.game.detectiveResultHistory = [];
    room.game.phaseEndsAt = this.phaseEndsAt(room, "RoleReveal");

    const assignments = assignRoles(room.players.map((p) => p.playerId), room.game.rolePreset);
    for (const player of room.players) {
      player.role = assignments[player.playerId] ?? "Villager";
      player.isAlive = true;
      player.isReady = false;
      player.lastProtectedRound = null;
      player.lastProtectedTargetPlayerId = null;
      player.guardUsedInGame = false;
    }

    this.setupLovers(room);

    const vampirePlayerIds = room.players.filter((p) => p.role === "Vampire").map((p) => p.playerId);
    return room.players.map((p) => {
      const role = p.role ?? "Villager";
      const delta: GameStatePrivateDelta = {
        role,
        loverPartnerPlayerId: room.game.loverLinks[p.playerId] ?? undefined,
        isActionAllowed: true
      };
      if (role === "Detective") {
        delta.detectiveInspectedPlayerIds = [];
      }
      if (role === "Vampire") {
        delta.vampirePlayerIds = vampirePlayerIds;
      }
      return delta;
    });
  }

  submitAction(room: RoomState, actorPlayerId: string, submission: ActionSubmission): void {
    this.validateAction(room, actorPlayerId, submission);
    const action: GameActionEntry = {
      actorPlayerId,
      actionType: submission.actionType,
      targetPlayerId: submission.targetPlayerId,
      round: submission.round
    };
    room.game.actions = room.game.actions.filter(
      (existing) => !(existing.actorPlayerId === actorPlayerId && existing.actionType === submission.actionType && existing.round === submission.round)
    );
    room.game.actions.push(action);
  }

  tick(room: RoomState): { phaseChanged: boolean; privateResults: RoomState["game"]["privateResults"] } {
    if (room.game.isPaused) {
      return { phaseChanged: false, privateResults: [] };
    }
    if (!room.game.phaseEndsAt || Date.now() < room.game.phaseEndsAt) {
      return { phaseChanged: false, privateResults: [] };
    }
    return this.advancePhaseInternal(room);
  }

  advancePhase(room: RoomState): { phaseChanged: boolean; privateResults: RoomState["game"]["privateResults"] } {
    if (room.game.phase === "Lobby" || room.game.phase === "GameOver") {
      return { phaseChanged: false, privateResults: [] };
    }
    return this.advancePhaseInternal(room);
  }

  assertManualAdvanceAllowed(room: RoomState): void {
    if (!this.areRequiredActionsSubmitted(room)) {
      throw new Error("PHASE_ACTIONS_PENDING");
    }
  }

  private advancePhaseInternal(room: RoomState): { phaseChanged: boolean; privateResults: RoomState["game"]["privateResults"] } {
    const next = this.nextPhase(room);
    room.game.phase = next;
    room.game.phaseEndsAt = next === "GameOver" || room.game.isPaused ? null : this.phaseEndsAt(room, next);
    room.lastActivityAt = Date.now();
    const privateResults = [...room.game.privateResults];
    room.game.privateResults = [];
    return { phaseChanged: true, privateResults };
  }

  getPublicSnapshot(room: RoomState): GameStateSnapshotPublic {
    return {
      phase: room.game.phase,
      round: room.game.round,
      phaseEndsAt: room.game.phaseEndsAt,
      isPaused: room.game.isPaused,
      tieCountInRound: room.game.tieCountInRound,
      mayorPlayerId: room.game.mayorPlayerId,
      guardProtectedPlayerId: room.game.guardProtectedPlayerId,
      lastDayVoteSummary: room.game.lastDayVoteSummary,
      lastEliminationSummary: room.game.lastEliminationSummary
    };
  }

  private nextPhase(room: RoomState): GamePhase {
    switch (room.game.phase) {
      case "RoleReveal":
        room.game.actions = [];
        room.game.privateResults = [];
        room.game.lastDayVoteSummary = null;
        return "NightStart";
      case "NightStart":
        room.game.actions = [];
        room.game.privateResults = [];
        return "VampireVote";
      case "VampireVote":
        room.game.actions = room.game.actions.filter((a) => a.actionType !== "detective-inspect");
        if (this.hasAlivePlayerWithRole(room, "Detective") && this.hasDetectiveLegalInspectTargets(room)) return "DetectiveInspect";
        if (this.hasAlivePlayerWithRole(room, "Doctor")) return "DoctorProtect";
        return "NightResolve";
      case "DetectiveInspect":
        return this.hasAlivePlayerWithRole(room, "Doctor") ? "DoctorProtect" : "NightResolve";
      case "DoctorProtect":
        return "NightResolve";
      case "NightResolve": {
        const result = resolveNight(room.players, room.game.actions, room.game.round, room.game.rules);
        if (room.game.rules.firstNightNoKill && room.game.round === 1) {
          result.killedPlayerId = null;
        }
        if (result.killedPlayerId) {
          this.eliminateWithLoverChain(room, result.killedPlayerId, "Night");
        } else {
          room.game.lastEliminationSummary = null;
        }
        if (result.protectedPlayerId) {
          const protectedPlayer = room.players.find((p) => p.playerId === result.protectedPlayerId);
          void protectedPlayer;
        }
        const doctorActor = room.players.find((p) => p.isAlive && p.role === "Doctor");
        if (doctorActor) {
          const doctorAction = room.game.actions.find((a) => a.actionType === "doctor-protect" && a.actorPlayerId === doctorActor.playerId);
          if (doctorAction?.targetPlayerId) {
            doctorActor.lastProtectedRound = room.game.round;
            doctorActor.lastProtectedTargetPlayerId = doctorAction.targetPlayerId;
          }
        }
        if (result.detectiveResult) {
          const { detectivePlayerId, targetPlayerId } = result.detectiveResult;
          room.game.detectiveInspectedTargets[detectivePlayerId] = [
            ...(room.game.detectiveInspectedTargets[detectivePlayerId] ?? []), targetPlayerId
          ];
          room.game.privateResults.push({
            playerId: result.detectiveResult.detectivePlayerId,
            detectiveResult: result.detectiveResult.result,
            detectiveTargetPlayerId: result.detectiveResult.targetPlayerId
          });
        }
        if (this.finishGameIfWinner(room)) {
          return "GameOver";
        }
        return "DayStart";
      }
      case "DayStart":
        room.game.actions = [];
        if (this.shouldScheduleMayorElection(room)) {
          return "MayorElection";
        }
        if (this.hasGuardAvailable(room)) {
          return "GuardProtect";
        }
        return "DayDiscussion";
      case "MayorElection": {
        const mayorVote = resolveDayVotes(room.players, room.game.actions, {
          noLynchEnabled: false,
          voteActionType: "mayor-vote"
        });
        const tied = mayorVote.tiedTopCandidates.length > 0 ? mayorVote.tiedTopCandidates : [];
        const selectedMayorId =
          mayorVote.executedPlayerId ??
          (tied.length > 0 ? pickRandom(tied) ?? null : null);
        room.game.mayorPlayerId = selectedMayorId;
        room.game.actions = [];
        if (this.hasGuardAvailable(room)) {
          return "GuardProtect";
        }
        return "DayDiscussion";
      }
      case "GuardProtect": {
        const guard = room.players.find((p) => p.isAlive && p.role === "Guard" && !p.guardUsedInGame);
        const guardAction = guard
          ? room.game.actions.find((a) => a.actionType === "guard-protect" && a.actorPlayerId === guard.playerId)
          : null;
        if (guard && guardAction?.targetPlayerId) {
          guard.guardUsedInGame = true;
          room.game.guardProtectedPlayerId = guardAction.targetPlayerId;
        } else {
          room.game.guardProtectedPlayerId = null;
        }
        room.game.actions = [];
        return "DayDiscussion";
      }
      case "DayDiscussion":
        room.game.actions = [];
        return "DayVote";
      case "DayVote": {
        const revoteCandidateIds = room.game.tieCountInRound > 0 ? room.game.revoteCandidateIds ?? [] : [];
        const voteResult = resolveDayVotes(room.players, room.game.actions, {
          noLynchEnabled: room.game.rules.noLynchEnabled,
          mayorPlayerId: room.game.mayorPlayerId,
          blockedTargetPlayerId: room.game.guardProtectedPlayerId,
          allowedTargetIds: revoteCandidateIds.length > 0 ? revoteCandidateIds : undefined
        });
        room.game.lastDayVoteSummary = {
          entries: voteResult.voteBreakdown,
          executedPlayerId: voteResult.executedPlayerId,
          tiedTopCandidates: voteResult.tiedTopCandidates,
          revoteCandidateIds: revoteCandidateIds.length > 0 ? revoteCandidateIds : undefined,
          noLynchWon: voteResult.noLynchWon
        };
        if (voteResult.executedPlayerId) {
          const executed = room.players.find((p) => p.playerId === voteResult.executedPlayerId);
          if (executed) {
            if (room.game.mayorPlayerId === executed.playerId) {
              room.game.mayorPlayerId = null;
            }
            this.eliminateWithLoverChain(room, executed.playerId, "Day");
          }
          room.game.tieCountInRound = 0;
          room.game.revoteCandidateIds = [];
          return "ExecutionResolve";
        }
        if (voteResult.noLynchWon) {
          room.game.lastEliminationSummary = null;
          room.game.tieCountInRound = 0;
          room.game.revoteCandidateIds = [];
          room.game.actions = [];
          return "WinCheck";
        }
        if (voteResult.tiedTopCandidates.length > 1 && room.game.tieCountInRound === 0) {
          room.game.tieCountInRound = 1;
          room.game.revoteCandidateIds = voteResult.tiedTopCandidates;
          room.game.lastDayVoteSummary.revoteCandidateIds = voteResult.tiedTopCandidates;
          room.game.actions = [];
          return "DayDiscussion";
        }
        if (voteResult.tiedTopCandidates.length > 1 && room.game.tieCountInRound === 1) {
          if (room.game.rules.tiePolicy === "RevoteThenRandomExecution") {
            const randomTargetId = pickRandom(voteResult.tiedTopCandidates);
            if (randomTargetId === NO_LYNCH_TARGET) {
              room.game.lastDayVoteSummary.noLynchWon = true;
              room.game.lastEliminationSummary = null;
              room.game.tieCountInRound = 0;
              room.game.revoteCandidateIds = [];
              room.game.actions = [];
              return "WinCheck";
            }
            if (randomTargetId) {
              const randomExecuted = room.players.find((p) => p.playerId === randomTargetId);
              if (randomExecuted) {
                this.eliminateWithLoverChain(room, randomExecuted.playerId, "Day");
              }
              if (room.game.mayorPlayerId === randomTargetId) {
                room.game.mayorPlayerId = null;
              }
              room.game.lastDayVoteSummary = {
                entries: room.game.lastDayVoteSummary?.entries ?? [],
                executedPlayerId: randomTargetId,
                tiedTopCandidates: room.game.lastDayVoteSummary?.tiedTopCandidates ?? [],
                revoteCandidateIds: revoteCandidateIds.length > 0 ? revoteCandidateIds : undefined
              };
              room.game.tieCountInRound = 0;
              room.game.revoteCandidateIds = [];
              return "ExecutionResolve";
            }
          }
        }
        room.game.tieCountInRound = 0;
        room.game.revoteCandidateIds = [];
        room.game.actions = [];
        room.game.privateResults = [];
        return "WinCheck";
      }
      case "ExecutionResolve":
        if (
          room.game.lastEliminationSummary?.source === "Day" &&
          room.game.lastEliminationSummary.playerId
        ) {
          const eliminated = room.players.find((p) => p.playerId === room.game.lastEliminationSummary?.playerId);
          if (eliminated?.role === "Hunter") {
            room.game.actions = room.game.actions.filter((a) => a.actionType !== "hunter-shot");
            return "HunterLastBreath";
          }
        }
        if (this.finishGameIfWinner(room)) {
          return "GameOver";
        }
        return "WinCheck";
      case "HunterLastBreath": {
        const hunterEliminatedId = room.game.lastEliminationSummary?.playerId ?? null;
        if (!hunterEliminatedId) {
          return this.finishGameIfWinner(room) ? "GameOver" : "WinCheck";
        }
        const hunterShotAction = room.game.actions.find(
          (a) => a.actionType === "hunter-shot" && a.actorPlayerId === hunterEliminatedId
        );
        if (!hunterShotAction?.targetPlayerId) {
          return this.finishGameIfWinner(room) ? "GameOver" : "WinCheck";
        }
        const target = room.players.find((p) => p.playerId === hunterShotAction.targetPlayerId);
        if (target && target.isAlive) {
          if (room.game.mayorPlayerId === target.playerId) {
            room.game.mayorPlayerId = null;
          }
          this.eliminateWithLoverChain(room, target.playerId, "Day");
        }
        room.game.actions = [];
        if (this.finishGameIfWinner(room)) {
          return "GameOver";
        }
        return "WinCheck";
      }
      case "WinCheck": {
        if (this.finishGameIfWinner(room)) {
          return "GameOver";
        }
        room.game.round += 1;
        room.game.actions = [];
        room.game.privateResults = [];
        room.game.guardProtectedPlayerId = null;
        room.game.revoteCandidateIds = [];
        return "NightStart";
      }
      case "GameOver":
        return "GameOver";
      case "Lobby":
      default:
        return "Lobby";
    }
  }

  private validateAction(room: RoomState, actorPlayerId: string, submission: ActionSubmission): void {
    const actor = room.players.find((p) => p.playerId === actorPlayerId);
    if (!actor) throw new Error("PLAYER_NOT_FOUND");
    if (room.game.isPaused) throw new Error("GAME_PAUSED");
    if (!actor.isAlive && !(submission.actionType === "hunter-shot" && room.game.phase === "HunterLastBreath")) {
      throw new Error("PLAYER_DEAD");
    }
    if (room.game.phase !== submission.phase || room.game.round !== submission.round) {
      throw new Error("STALE_ACTION");
    }

    if (submission.actionType === "vampire-target" && room.game.phase !== "VampireVote") throw new Error("INVALID_PHASE");
    if (submission.actionType === "detective-inspect" && room.game.phase !== "DetectiveInspect") throw new Error("INVALID_PHASE");
    if (submission.actionType === "doctor-protect" && room.game.phase !== "DoctorProtect") throw new Error("INVALID_PHASE");
    if (submission.actionType === "day-vote" && room.game.phase !== "DayVote") throw new Error("INVALID_PHASE");
    if (submission.actionType === "hunter-shot" && room.game.phase !== "HunterLastBreath") throw new Error("INVALID_PHASE");
    if (submission.actionType === "mayor-vote" && room.game.phase !== "MayorElection") throw new Error("INVALID_PHASE");
    if (submission.actionType === "guard-protect" && room.game.phase !== "GuardProtect") throw new Error("INVALID_PHASE");

    if (submission.actionType === "vampire-target" && actor.role !== "Vampire") throw new Error("ROLE_NOT_ALLOWED");
    if (submission.actionType === "detective-inspect" && actor.role !== "Detective") throw new Error("ROLE_NOT_ALLOWED");
    if (submission.actionType === "doctor-protect" && actor.role !== "Doctor") throw new Error("ROLE_NOT_ALLOWED");
    if (submission.actionType === "hunter-shot" && actor.role !== "Hunter") throw new Error("ROLE_NOT_ALLOWED");
    if (submission.actionType === "guard-protect" && actor.role !== "Guard") throw new Error("ROLE_NOT_ALLOWED");
    if (submission.actionType === "hunter-shot") {
      if (room.game.lastEliminationSummary?.source !== "Day") throw new Error("HUNTER_NOT_TRIGGERED");
      if (room.game.lastEliminationSummary.playerId !== actor.playerId) throw new Error("HUNTER_NOT_TRIGGERED");
    }

    if (submission.targetPlayerId) {
      if (submission.actionType === "day-vote" && room.game.tieCountInRound > 0) {
        const revoteCandidateIds = room.game.revoteCandidateIds ?? room.game.lastDayVoteSummary?.tiedTopCandidates ?? [];
        if (!revoteCandidateIds.includes(submission.targetPlayerId)) {
          throw new Error("TARGET_NOT_IN_REVOTE");
        }
      }
      if (submission.actionType === "day-vote" && submission.targetPlayerId === NO_LYNCH_TARGET) {
        if (!room.game.rules.noLynchEnabled) throw new Error("NO_LYNCH_DISABLED");
        return;
      }
      if (
        (submission.actionType === "day-vote" || submission.actionType === "mayor-vote") &&
        submission.targetPlayerId === actor.playerId
      ) {
        throw new Error("INVALID_TARGET");
      }
      if (submission.actionType === "day-vote" && room.game.guardProtectedPlayerId && submission.targetPlayerId === room.game.guardProtectedPlayerId) {
        throw new Error("TARGET_PROTECTED_BY_GUARD");
      }
      const target = room.players.find((p) => p.playerId === submission.targetPlayerId);
      if (!target || !target.isAlive) throw new Error("INVALID_TARGET");
      if (submission.actionType === "vampire-target" && target.role === "Vampire") throw new Error("INVALID_TARGET");
      if (submission.actionType === "hunter-shot" && target.playerId === actor.playerId) throw new Error("INVALID_TARGET");
      if (submission.actionType === "guard-protect" && target.playerId === actor.playerId) throw new Error("INVALID_TARGET");
      if (submission.actionType === "doctor-protect") {
        if (!room.game.rules.allowDoctorSelfProtect && actor.playerId === target.playerId) {
          throw new Error("SELF_PROTECT_BLOCKED");
        }
        if (
          !room.game.rules.allowDoctorConsecutiveProtectSameTarget &&
          actor.lastProtectedTargetPlayerId &&
          actor.lastProtectedRound === room.game.round - 1 &&
          actor.lastProtectedTargetPlayerId === target.playerId
        ) {
          throw new Error("CONSECUTIVE_PROTECT_BLOCKED");
        }
      }
      if (submission.actionType === "detective-inspect") {
        if (target.playerId === actor.playerId) throw new Error("INVALID_TARGET");
        const inspected = room.game.detectiveInspectedTargets[actor.playerId] ?? [];
        if (inspected.includes(target.playerId)) {
          throw new Error("DETECTIVE_REPEAT_BLOCKED");
        }
      }
    } else {
      throw new Error("TARGET_REQUIRED");
    }
  }

  private areRequiredActionsSubmitted(room: RoomState): boolean {
    const actionType = this.requiredActionTypeForPhase(room.game.phase);
    if (!actionType) return true;
    const requiredActors = room.players.filter((p) => this.hasRequiredActionInPhase(room, p.playerId));
    if (!requiredActors.length) return true;
    return requiredActors.every((p) =>
      room.game.actions.some(
        (a) => a.actorPlayerId === p.playerId && a.actionType === actionType && a.round === room.game.round
      )
    );
  }

  private requiredActionTypeForPhase(phase: GamePhase): ActionSubmission["actionType"] | null {
    if (phase === "VampireVote") return "vampire-target";
    if (phase === "DetectiveInspect") return "detective-inspect";
    if (phase === "DoctorProtect") return "doctor-protect";
    if (phase === "GuardProtect") return "guard-protect";
    if (phase === "MayorElection") return "mayor-vote";
    if (phase === "DayVote") return "day-vote";
    if (phase === "HunterLastBreath") return "hunter-shot";
    return null;
  }

  private hasRequiredActionInPhase(room: RoomState, actorPlayerId: string): boolean {
    const actor = room.players.find((p) => p.playerId === actorPlayerId);
    if (!actor) return false;
    const aliveOthers = room.players.filter((p) => p.isAlive && p.playerId !== actorPlayerId);
    const aliveAll = room.players.filter((p) => p.isAlive);
    switch (room.game.phase) {
      case "VampireVote":
        return actor.isAlive && actor.role === "Vampire" && room.players.some((p) => p.isAlive && p.role !== "Vampire");
      case "DetectiveInspect": {
        if (!actor.isAlive || actor.role !== "Detective") return false;
        const inspected = new Set(room.game.detectiveInspectedTargets[actorPlayerId] ?? []);
        return aliveAll.some((p) => p.playerId !== actorPlayerId && !inspected.has(p.playerId));
      }
      case "DoctorProtect": {
        if (!actor.isAlive || actor.role !== "Doctor") return false;
        return aliveAll.some((p) => {
          if (!room.game.rules.allowDoctorSelfProtect && p.playerId === actorPlayerId) return false;
          if (
            !room.game.rules.allowDoctorConsecutiveProtectSameTarget &&
            actor.lastProtectedRound === room.game.round - 1 &&
            actor.lastProtectedTargetPlayerId === p.playerId
          ) {
            return false;
          }
          return true;
        });
      }
      case "GuardProtect":
        return actor.isAlive && actor.role === "Guard" && !actor.guardUsedInGame && aliveOthers.length > 0;
      case "MayorElection":
        return actor.isAlive && aliveOthers.length > 0;
      case "DayVote": {
        if (!actor.isAlive) return false;
        const revoteCandidateIds = room.game.tieCountInRound > 0
          ? room.game.revoteCandidateIds ?? room.game.lastDayVoteSummary?.tiedTopCandidates ?? []
          : null;
        const legalTargets = aliveOthers.filter((p) =>
          p.playerId !== room.game.guardProtectedPlayerId &&
          (!revoteCandidateIds || revoteCandidateIds.includes(p.playerId))
        );
        const noLynchAllowed = room.game.rules.noLynchEnabled &&
          (!revoteCandidateIds || revoteCandidateIds.includes(NO_LYNCH_TARGET));
        return legalTargets.length > 0 || noLynchAllowed;
      }
      case "HunterLastBreath":
        return actor.role === "Hunter" &&
          room.game.lastEliminationSummary?.source === "Day" &&
          room.game.lastEliminationSummary.playerId === actorPlayerId &&
          aliveOthers.length > 0;
      default:
        return false;
    }
  }

  private phaseEndsAt(room: RoomState, phase: GamePhase): number | null {
    const seconds = this.phaseSeconds(room, phase);
    if (seconds <= 0) return null;
    return Date.now() + seconds * 1000;
  }

  private phaseSeconds(room: RoomState, phase: GamePhase): number {
    if (phase === "RoleReveal") return room.game.phaseDurations.roleReveal;
    if (phase === "NightStart") {
      const seconds = room.game.phaseDurations.nightStart;
      return seconds <= 0 ? seconds : Math.max(seconds, MIN_NIGHT_START_PRESENTATION_SECONDS);
    }
    if (phase === "VampireVote") return room.game.phaseDurations.vampireVote;
    if (phase === "DetectiveInspect") return room.game.phaseDurations.detectiveInspect;
    if (phase === "DoctorProtect") return room.game.phaseDurations.doctorProtect;
    if (phase === "NightResolve") return room.game.phaseDurations.nightResolve;
    if (phase === "DayStart") return room.game.phaseDurations.dayStart;
    if (phase === "MayorElection") return room.game.phaseDurations.mayorElection;
    if (phase === "GuardProtect") return room.game.phaseDurations.guardProtect;
    if (phase === "DayDiscussion") return room.game.phaseDurations.dayDiscussion;
    if (phase === "DayVote") return room.game.phaseDurations.dayVote;
    if (phase === "ExecutionResolve") return room.game.phaseDurations.executionResolve;
    if (phase === "HunterLastBreath") return room.game.phaseDurations.hunterLastBreath;
    if (phase === "WinCheck") return room.game.phaseDurations.winCheck;
    return 0;
  }

  private hasAliveMayor(room: RoomState): boolean {
    if (!room.game.mayorPlayerId) return false;
    const mayor = room.players.find((p) => p.playerId === room.game.mayorPlayerId);
    return Boolean(mayor?.isAlive);
  }

  private finishGameIfWinner(room: RoomState): boolean {
    const winner = calculateWinner(room.players);
    if (!winner) return false;
    room.game.winner = winner;
    room.status = "GameOver";
    room.game.actions = [];
    room.game.privateResults = [];
    return true;
  }

  /** Başkanlık bu oda kurulumunda (preset + oyuncu sayısı) tanımlıysa ve seçili başkan yoksa seçim fazı açılır. */
  private shouldScheduleMayorElection(room: RoomState): boolean {
    if (!room.game.rules.mayorEnabled || this.hasAliveMayor(room)) return false;
    const preset = ROLE_PRESETS[room.game.rolePreset];
    if (!preset.roleIds.includes("Mayor")) return false;
    return room.players.length >= ROLE_DEFINITIONS.Mayor.minPlayers;
  }

  private hasAlivePlayerWithRole(room: RoomState, role: Role): boolean {
    return room.players.some((p) => p.isAlive && p.role === role);
  }

  /** Hayatta dedektif var ve sorgulanmamış hayatta başka oyuncu kaldıysa true. */
  private hasDetectiveLegalInspectTargets(room: RoomState): boolean {
    const detective = room.players.find((p) => p.isAlive && p.role === "Detective");
    if (!detective) return false;
    const inspected = new Set(room.game.detectiveInspectedTargets[detective.playerId] ?? []);
    return room.players.some(
      (p) => p.isAlive && p.playerId !== detective.playerId && !inspected.has(p.playerId)
    );
  }

  private hasGuardAvailable(room: RoomState): boolean {
    return room.players.some((p) => p.isAlive && p.role === "Guard" && !p.guardUsedInGame);
  }

  private eliminateWithLoverChain(room: RoomState, initialPlayerId: string, source: "Night" | "Day"): void {
    const queue = [initialPlayerId];
    const visited = new Set<string>();
    let firstEliminated: string | null = null;

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);

      const current = room.players.find((p) => p.playerId === currentId);
      if (!current || !current.isAlive) continue;

      current.isAlive = false;
      if (!firstEliminated) {
        firstEliminated = current.playerId;
      }
      if (room.game.mayorPlayerId === current.playerId) {
        room.game.mayorPlayerId = null;
      }

      const partnerId = room.game.loverLinks[current.playerId];
      if (partnerId) {
        const partner = room.players.find((p) => p.playerId === partnerId);
        if (partner?.isAlive) {
          queue.push(partnerId);
        }
      }
    }

    if (firstEliminated) {
      const primary = room.players.find((p) => p.playerId === firstEliminated);
      room.game.lastEliminationSummary = {
        source,
        playerId: firstEliminated,
        revealedRole: room.game.rules.revealEliminatedRole ? primary?.role ?? null : null
      };
    }
  }

  private setupLovers(room: RoomState): void {
    room.game.loverLinks = {};
    if (!room.game.rules.loversEnabled) return;
    if (room.players.length < 9) return;
    const first = pickRandom(room.players.map((p) => p.playerId));
    if (!first) return;
    const secondPool = room.players.map((p) => p.playerId).filter((id) => id !== first);
    const second = pickRandom(secondPool);
    if (!second) return;
    room.game.loverLinks[first] = second;
    room.game.loverLinks[second] = first;
  }
}
