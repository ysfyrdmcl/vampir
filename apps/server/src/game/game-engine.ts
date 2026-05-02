import type { ActionSubmission, GamePhase, GameStatePrivateDelta, GameStateSnapshotPublic } from "@vampir-koylu/shared";
import { env } from "../config/env.js";
import { resolveNight } from "./night-resolver.js";
import { assignRoles } from "./role-assignment.js";
import type { GameActionEntry, RoomState } from "./game-types.js";
import { resolveDayVotes } from "./vote-resolver.js";
import { calculateWinner } from "./win-condition.js";
import { pickRandom } from "../utils/random.js";

export class GameEngine {
  startGame(room: RoomState): GameStatePrivateDelta[] {
    if (room.status !== "Lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }
    if (room.players.length < env.ROOM_MIN_PLAYERS) {
      throw new Error("NOT_ENOUGH_PLAYERS");
    }

    room.status = "InGame";
    room.game.phase = "RoleReveal";
    room.game.round = 1;
    room.game.tieCountInRound = 0;
    room.game.mayorPlayerId = null;
    room.game.guardProtectedPlayerId = null;
    room.game.winner = null;
    room.game.actions = [];
    room.game.privateResults = [];
    room.game.lastDayVoteSummary = null;
    room.game.lastEliminationSummary = null;
    room.game.loverLinks = {};
    room.game.detectiveInspectedTargets = {};
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

    return room.players.map((p) => ({
      role: p.role ?? "Villager",
      loverPartnerPlayerId: room.game.loverLinks[p.playerId] ?? undefined,
      isActionAllowed: true
    }));
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
    if (!room.game.phaseEndsAt || Date.now() < room.game.phaseEndsAt) {
      return { phaseChanged: false, privateResults: [] };
    }

    const next = this.nextPhase(room);
    room.game.phase = next;
    room.game.phaseEndsAt = next === "GameOver" ? null : this.phaseEndsAt(room, next);
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
        return room.players.some((p) => p.isAlive && p.role === "Detective") ? "DetectiveInspect" : "DoctorProtect";
      case "DetectiveInspect":
        return room.players.some((p) => p.isAlive && p.role === "Doctor") ? "DoctorProtect" : "NightResolve";
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
          room.game.privateResults.push({
            playerId: result.detectiveResult.detectivePlayerId,
            detectiveResult: result.detectiveResult.result,
            detectiveTargetPlayerId: result.detectiveResult.targetPlayerId
          });
        }
        if (calculateWinner(room.players)) {
          return "WinCheck";
        }
        return "DayStart";
      }
      case "DayStart":
        room.game.actions = [];
        if (room.game.rules.mayorEnabled && !this.hasAliveMayor(room)) {
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
        const voteResult = resolveDayVotes(room.players, room.game.actions, {
          noLynchEnabled: room.game.rules.noLynchEnabled,
          mayorPlayerId: room.game.mayorPlayerId,
          blockedTargetPlayerId: room.game.guardProtectedPlayerId
        });
        room.game.lastDayVoteSummary = {
          entries: voteResult.voteBreakdown,
          executedPlayerId: voteResult.executedPlayerId,
          tiedTopCandidates: voteResult.tiedTopCandidates,
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
          return "ExecutionResolve";
        }
        if (voteResult.noLynchWon) {
          room.game.lastEliminationSummary = null;
          room.game.tieCountInRound = 0;
          room.game.actions = [];
          return "WinCheck";
        }
        if (voteResult.tiedTopCandidates.length > 1 && room.game.tieCountInRound === 0) {
          room.game.tieCountInRound = 1;
          room.game.actions = [];
          return "DayDiscussion";
        }
        if (voteResult.tiedTopCandidates.length > 1 && room.game.tieCountInRound === 1) {
          if (room.game.rules.tiePolicy === "RevoteThenRandomExecution") {
            const randomTargetId = pickRandom(voteResult.tiedTopCandidates);
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
                tiedTopCandidates: room.game.lastDayVoteSummary?.tiedTopCandidates ?? []
              };
              room.game.tieCountInRound = 0;
              return "ExecutionResolve";
            }
          }
        }
        room.game.tieCountInRound = 0;
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
        return "WinCheck";
      case "HunterLastBreath": {
        const hunterEliminatedId = room.game.lastEliminationSummary?.playerId ?? null;
        if (!hunterEliminatedId) return "WinCheck";
        const hunterShotAction = room.game.actions.find(
          (a) => a.actionType === "hunter-shot" && a.actorPlayerId === hunterEliminatedId
        );
        if (!hunterShotAction?.targetPlayerId) return "WinCheck";
        const target = room.players.find((p) => p.playerId === hunterShotAction.targetPlayerId);
        if (target && target.isAlive) {
          if (room.game.mayorPlayerId === target.playerId) {
            room.game.mayorPlayerId = null;
          }
          this.eliminateWithLoverChain(room, target.playerId, "Day");
        }
        room.game.actions = [];
        return "WinCheck";
      }
      case "WinCheck": {
        const winner = calculateWinner(room.players);
        if (winner) {
          room.game.winner = winner;
          room.status = "GameOver";
          return "GameOver";
        }
        room.game.round += 1;
        room.game.actions = [];
        room.game.privateResults = [];
        room.game.guardProtectedPlayerId = null;
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
      if (submission.actionType === "day-vote" && submission.targetPlayerId === "__NO_LYNCH__") {
        if (!room.game.rules.noLynchEnabled) throw new Error("NO_LYNCH_DISABLED");
        return;
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
        const inspected = room.game.detectiveInspectedTargets[actor.playerId] ?? [];
        if (!room.game.rules.allowDetectiveRepeatInspectSameTarget && inspected.includes(target.playerId)) {
          throw new Error("DETECTIVE_REPEAT_BLOCKED");
        }
      }
    } else {
      throw new Error("TARGET_REQUIRED");
    }

    if (submission.actionType === "detective-inspect" && submission.targetPlayerId) {
      room.game.detectiveInspectedTargets[actor.playerId] = [
        ...(room.game.detectiveInspectedTargets[actor.playerId] ?? []),
        submission.targetPlayerId
      ];
    }
  }

  private phaseEndsAt(room: RoomState, phase: GamePhase): number | null {
    const seconds = this.phaseSeconds(room, phase);
    if (seconds <= 0) return null;
    return Date.now() + seconds * 1000;
  }

  private phaseSeconds(room: RoomState, phase: GamePhase): number {
    if (phase === "RoleReveal") return room.game.phaseDurations.roleReveal;
    if (phase === "NightStart") return room.game.phaseDurations.nightStart;
    if (phase === "VampireVote") return room.game.phaseDurations.vampireVote;
    if (phase === "DetectiveInspect") return room.game.phaseDurations.detectiveInspect;
    if (phase === "DoctorProtect") return room.game.phaseDurations.doctorProtect;
    if (phase === "DayStart") return room.game.phaseDurations.dayStart;
    if (phase === "MayorElection") return room.game.phaseDurations.dayVote;
    if (phase === "GuardProtect") return room.game.phaseDurations.dayVote;
    if (phase === "DayDiscussion") return room.game.phaseDurations.dayDiscussion;
    if (phase === "DayVote") return room.game.phaseDurations.dayVote;
    if (phase === "NightResolve" || phase === "ExecutionResolve" || phase === "HunterLastBreath") return env.RESULT_SCREEN_SECONDS;
    if (phase === "WinCheck") return 1;
    return 0;
  }

  private hasAliveMayor(room: RoomState): boolean {
    if (!room.game.mayorPlayerId) return false;
    const mayor = room.players.find((p) => p.playerId === room.game.mayorPlayerId);
    return Boolean(mayor?.isAlive);
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
