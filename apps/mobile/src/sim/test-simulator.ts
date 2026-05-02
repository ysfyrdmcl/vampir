import { buildRoleDeck, type ActionType, type GamePhase, type GameStateSnapshotPublic, type Role, type RolePresetId, type RoomStateSnapshot } from "@vampir-koylu/shared";
import { logGameEvent, logPersonalEvent } from "../logging/game-logger";
import { useGameStore } from "../store/game-store";

type Winner = "Vampires" | "Villagers";

interface SimPlayer {
  playerId: string;
  nickname: string;
  isAlive: boolean;
  isConnected: boolean;
  isReady: boolean;
  isBot: boolean;
  role: Role;
}

interface ActionsState {
  vampireTarget?: string;
  detectiveTarget?: string;
  doctorTarget?: string;
  dayVotes: Record<string, string>;
}

const BOT_NAMES = ["Kont Drakula", "Leydi Ezmarelda", "GölgeAvcı", "Valerius", "Mara", "Otto"];
const SIM_MAX_ROUNDS = 40;

export interface BatchSimulationConfig {
  totalPlayers: 4 | 6 | 8 | 10;
  gameCount: number;
}

export interface BatchSimulationSummary {
  totalPlayers: number;
  totalGames: number;
  villagerWins: number;
  vampireWins: number;
  unresolvedGames: number;
  averageRounds: number;
  tieRounds: number;
  suspiciousFlags: string[];
}

class TestSimulator {
  private players: SimPlayer[] = [];
  private preferredPlayerRole: Role | "random" = "random";
  private roomCode = "TEST42";
  private round = 1;
  private tieCount = 0;
  private currentPhase: GamePhase = "Lobby";
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private actionTimers: ReturnType<typeof setTimeout>[] = [];
  private actions: ActionsState = { dayVotes: {} };
  private doctorLastSelfProtect = false;
  private lastNightEliminated: string | null = null;
  private mayorPlayerId: string | null = null;

  isEnabled(): boolean {
    return useGameStore.getState().testMode;
  }

  startLobby(totalPlayers = 4, preferredPlayerRole: Role | "random" = "random"): void {
    this.clearTimers();
    const store = useGameStore.getState();
    const myId = "test-me";
    const nickname = store.nickname.trim() || "Sen";

    const botCount = Math.max(0, totalPlayers - 1);
    const selectedBots = Array.from({ length: botCount }, (_, i) => ({
      playerId: `bot-${i + 1}`,
      nickname: this.uniqueBotNickname(i),
      isAlive: true,
      isConnected: true,
      isReady: true,
      isBot: true,
      role: "Villager" as Role
    }));

    this.players = [
      {
        playerId: myId,
        nickname,
        isAlive: true,
        isConnected: true,
        isReady: true,
        isBot: false,
        role: "Villager"
      },
      ...selectedBots
    ];
    this.roomCode = `TS${Math.floor(1000 + Math.random() * 8999)}`;
    this.round = 1;
    this.tieCount = 0;
    this.currentPhase = "Lobby";
    this.actions = { dayVotes: {} };
    this.lastNightEliminated = null;
    this.doctorLastSelfProtect = false;
    this.mayorPlayerId = null;
    this.preferredPlayerRole = preferredPlayerRole;

    store.setTestMode(true);
    store.setErrorCode(null);
    store.setSession({
      playerId: myId,
      playerSessionToken: `test-${Date.now()}`,
      roomCode: this.roomCode
    });
    store.setRoomState(this.toRoomSnapshot("Lobby"));
    store.setGameState({
      phase: "Lobby",
      round: this.round,
      phaseEndsAt: null,
      tieCountInRound: 0
    });
    store.setPrivateResultText(`Test modu aktif. ${botCount} dummy oyuncu eklendi.`);
    store.setLastDayVoteSummary(null);
    store.setGameWinner(null);
    store.setPrivateRole(null);
    logGameEvent("test.lobby.created", {
      roomCode: this.roomCode,
      preferredPlayerRole,
      players: this.players.map((p) => ({ nickname: p.nickname, isBot: p.isBot }))
    });
  }

  leave(): void {
    this.clearTimers();
    this.players = [];
    this.actions = { dayVotes: {} };
    this.lastNightEliminated = null;
    this.currentPhase = "Lobby";
    this.mayorPlayerId = null;
    useGameStore.getState().setTestMode(false);
    logGameEvent("test.simulation.leave");
  }

  startGame(): void {
    if (!this.isEnabled() || this.players.length < 4) return;
    this.players = this.players.map((player) => ({ ...player, isAlive: true, isConnected: true }));
    this.round = 1;
    this.tieCount = 0;
    this.actions = { dayVotes: {} };
    this.lastNightEliminated = null;
    this.doctorLastSelfProtect = false;
    this.mayorPlayerId = null;
    this.assignRoles();
    useGameStore.getState().setPrivateRole(this.me().role);
    useGameStore.getState().setLastDayVoteSummary(null);
    useGameStore.getState().setRoomState(this.toRoomSnapshot("InGame"));
    logGameEvent("test.game.started", {
      roles: this.players.map((p) => ({ nickname: p.nickname, role: p.role, isBot: p.isBot }))
    });
    logPersonalEvent("game.role.assigned", { role: this.me().role });
    this.setPhase("RoleReveal", this.phaseDuration("roleReveal"));
  }

  submitAction(actionType: ActionType, targetPlayerId?: string): void {
    if (!this.isEnabled()) return;
    const me = this.me();
    if (!me.isAlive || !targetPlayerId) return;
    const target = this.players.find((player) => player.playerId === targetPlayerId);
    if (!target?.isAlive) return;

    if (actionType === "vampire-target" && me.role === "Vampire" && this.currentPhase === "VampireVote") {
      if (target.role === "Vampire") return;
      this.actions.vampireTarget = targetPlayerId;
      useGameStore.getState().setPrivateResultText("Hedef seçildi.");
      useGameStore.getState().setVampireVotePreview([{ vampirePlayerId: me.playerId, targetPlayerId }]);
      logGameEvent("test.action.player", { actionType, actor: me.nickname, targetPlayerId });
      logPersonalEvent("personal.vampire.target_selected", { targetPlayerId, round: this.round });
      return;
    }
    if (actionType === "detective-inspect" && me.role === "Detective" && this.currentPhase === "DetectiveInspect") {
      this.actions.detectiveTarget = targetPlayerId;
      useGameStore.getState().setPrivateResultText("Sorgu hedefi seçildi.");
      logGameEvent("test.action.player", { actionType, actor: me.nickname, targetPlayerId });
      return;
    }
    if (actionType === "doctor-protect" && me.role === "Doctor" && this.currentPhase === "DoctorProtect") {
      this.actions.doctorTarget = targetPlayerId;
      useGameStore.getState().setPrivateResultText("Koruma hedefi seçildi.");
      logGameEvent("test.action.player", { actionType, actor: me.nickname, targetPlayerId });
      logPersonalEvent("personal.doctor.protect_selected", { targetPlayerId, round: this.round });
      return;
    }
    if (actionType === "day-vote" && this.currentPhase === "DayVote") {
      this.actions.dayVotes[me.playerId] = targetPlayerId;
      useGameStore.getState().setPrivateResultText("Oyun kaydedildi.");
      logGameEvent("test.action.player", { actionType, actor: me.nickname, targetPlayerId });
      return;
    }
    if (actionType === "mayor-vote" && this.currentPhase === "MayorElection") {
      this.actions.dayVotes[me.playerId] = targetPlayerId;
      useGameStore.getState().setPrivateResultText("Başkan tercihin kaydedildi.");
      logGameEvent("test.action.player", { actionType, actor: me.nickname, targetPlayerId });
    }
  }

  private me(): SimPlayer {
    const me = this.players.find((p) => !p.isBot);
    if (!me) {
      throw new Error("TEST_SIM_NO_ME");
    }
    return me;
  }

  private assignRoles(): void {
    const rolePreset = useGameStore.getState().rolePreset;
    const deck = this.shuffledDeck(this.players.length, rolePreset);
    const me = this.me();
    const preferredRole = this.preferredPlayerRole;
    if (preferredRole !== "random") {
      const preferredIndex = deck.indexOf(preferredRole);
      if (preferredIndex >= 0) {
        deck.splice(preferredIndex, 1);
        me.role = preferredRole;
        const botPlayers = this.players.filter((p) => p.isBot);
        for (let i = 0; i < botPlayers.length; i += 1) {
          botPlayers[i].role = deck[i] ?? "Villager";
        }
        return;
      }
    }
    this.players = this.players.map((p, idx) => ({
      ...p,
      role: deck[idx] ?? "Villager"
    }));
  }

  private toRoomSnapshot(status: "Lobby" | "InGame" | "GameOver"): RoomStateSnapshot {
    return {
      roomCode: this.roomCode,
      status,
      minPlayers: 4,
      maxPlayers: 20,
      players: this.players.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        isAlive: p.isAlive,
        isConnected: p.isConnected,
        isReady: p.isReady,
        role: status === "GameOver" ? p.role : null
      }))
    };
  }

  private setPhase(phase: GamePhase, seconds: number | null): void {
    this.currentPhase = phase;
    this.clearActionTimers();
    const phaseEndsAt = seconds ? Date.now() + seconds * 1000 : null;

    const snapshot: GameStateSnapshotPublic = {
      phase,
      round: this.round,
      phaseEndsAt,
      tieCountInRound: this.tieCount,
      mayorPlayerId: this.mayorPlayerId,
      lastDayVoteSummary: useGameStore.getState().lastDayVoteSummary
    };
    useGameStore.getState().setGameState(snapshot);
    useGameStore.getState().setSelectedTargetPlayerId(null);
    logGameEvent("test.phase.set", {
      phase,
      round: this.round,
      seconds,
      tieCount: this.tieCount,
      alive: this.players.filter((p) => p.isAlive).map((p) => p.nickname)
    });
    this.logVisiblePhaseEvent(phase);

    if (phase === "NightResolve") {
      this.resolveNight();
      const winner = this.computeWinner();
      if (winner) {
        this.setPhase("WinCheck", 1);
        return;
      }
    } else if (phase === "ExecutionResolve") {
      this.resolveDayVote();
      const winner = this.computeWinner();
      if (winner) {
        this.setPhase("WinCheck", 1);
        return;
      }
    } else if (phase === "DayStart") {
      if (this.lastNightEliminated) {
        const eliminated = this.players.find((p) => p.playerId === this.lastNightEliminated);
        useGameStore.getState().setPrivateResultText(
          eliminated ? `Gece sonucu: ${eliminated.nickname} elendi.` : "Gece sonucu açıklandı."
        );
      }
    } else if (phase === "WinCheck") {
      const winner = this.computeWinner();
      if (winner) {
        this.finishGame(winner);
        return;
      }
    }

    this.scheduleBotBehavior(phase);
    if (seconds && seconds > 0) {
      this.phaseTimer = setTimeout(() => this.advancePhase(), seconds * 1000);
    }
  }

  private phaseDuration(
    key:
      | "roleReveal"
      | "nightStart"
      | "vampireVote"
      | "detectiveInspect"
      | "doctorProtect"
      | "dayStart"
      | "dayDiscussion"
      | "dayVote"
  ): number {
    const settings = useGameStore.getState().phaseDurations;
    if (settings.useSystemDefaults) {
      const defaults: Record<typeof key, number> = {
        roleReveal: 8,
        nightStart: 4,
        vampireVote: 20,
        detectiveInspect: 20,
        doctorProtect: 20,
        dayStart: 8,
        dayDiscussion: 60,
        dayVote: 30
      };
      return defaults[key];
    }
    return settings[key];
  }

  private logVisiblePhaseEvent(phase: GamePhase): void {
    if (phase === "NightStart") {
      logGameEvent("phase.night_started", { round: this.round });
      return;
    }
    if (phase === "DayStart") {
      logGameEvent("phase.day_started", { round: this.round });
      return;
    }
    if (phase === "DayVote") {
      logGameEvent("vote.started", { round: this.round });
      return;
    }
    if (phase === "MayorElection") {
      logGameEvent("vote.mayor_started", { round: this.round });
    }
  }

  private advancePhase(): void {
    if (!this.isEnabled()) return;
    const order: Record<GamePhase, { next: GamePhase; seconds: number | null }> = {
      Lobby: { next: "RoleReveal", seconds: this.phaseDuration("roleReveal") },
      RoleReveal: { next: "NightStart", seconds: this.phaseDuration("nightStart") },
      NightStart: { next: "VampireVote", seconds: this.phaseDuration("vampireVote") },
      VampireVote: { next: "DetectiveInspect", seconds: this.phaseDuration("detectiveInspect") },
      DetectiveInspect: { next: "DoctorProtect", seconds: this.phaseDuration("doctorProtect") },
      DoctorProtect: { next: "NightResolve", seconds: 3 },
      NightResolve: { next: "DayStart", seconds: this.phaseDuration("dayStart") },
      DayStart: {
        next: this.shouldRunMayorElection() ? "MayorElection" : "DayDiscussion",
        seconds: this.shouldRunMayorElection() ? this.phaseDuration("dayVote") : this.phaseDuration("dayDiscussion")
      },
      MayorElection: { next: "DayDiscussion", seconds: this.phaseDuration("dayVote") },
      GuardProtect: { next: "DayDiscussion", seconds: this.phaseDuration("dayVote") },
      DayDiscussion: { next: "DayVote", seconds: this.phaseDuration("dayVote") },
      DayVote: { next: "ExecutionResolve", seconds: 4 },
      ExecutionResolve: { next: "WinCheck", seconds: 3 },
      HunterLastBreath: { next: "WinCheck", seconds: 3 },
      WinCheck: { next: "NightStart", seconds: 4 },
      GameOver: { next: "GameOver", seconds: null }
    };

    const step = order[this.currentPhase];
    if (!step || step.next === "GameOver") return;
    if (this.currentPhase === "WinCheck") {
      this.round += 1;
      this.tieCount = 0;
    }
    if (this.currentPhase === "MayorElection") {
      this.resolveMayorElection();
    }
    this.setPhase(step.next, step.seconds);
  }

  private scheduleBotBehavior(phase: GamePhase): void {
    const aliveBots = this.players.filter((p) => p.isBot && p.isAlive);
    const randomDelay = () => 1000 + Math.floor(Math.random() * 5000);

    if (phase === "VampireVote") {
      useGameStore.getState().setVampireVotePreview([]);
      const vamp = aliveBots.find((p) => p.role === "Vampire");
      if (!vamp) return;
      this.actionTimers.push(
        setTimeout(() => {
          const candidates = this.players.filter((p) => p.isAlive && p.role !== "Vampire");
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          if (target) {
            this.actions.vampireTarget = target.playerId;
            useGameStore.getState().setVampireVotePreview([{ vampirePlayerId: vamp.playerId, targetPlayerId: target.playerId }]);
            logGameEvent("test.action.bot", { actionType: "vampire-target", actor: vamp.nickname, target: target.nickname });
          }
        }, randomDelay())
      );
    }

    if (phase === "DetectiveInspect") {
      const detective = aliveBots.find((p) => p.role === "Detective");
      if (!detective) return;
      this.actionTimers.push(
        setTimeout(() => {
          const candidates = this.players.filter((p) => p.isAlive && p.playerId !== detective.playerId);
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          if (target) {
            this.actions.detectiveTarget = target.playerId;
            logGameEvent("test.action.bot", { actionType: "detective-inspect", actor: detective.nickname, target: target.nickname });
          }
        }, randomDelay())
      );
    }

    if (phase === "DoctorProtect") {
      const doctor = aliveBots.find((p) => p.role === "Doctor");
      if (!doctor) return;
      this.actionTimers.push(
        setTimeout(() => {
          const candidates = this.players.filter((p) => p.isAlive);
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          if (target) {
            this.actions.doctorTarget = target.playerId;
            logGameEvent("test.action.bot", { actionType: "doctor-protect", actor: doctor.nickname, target: target.nickname });
          }
        }, randomDelay())
      );
    }

    if (phase === "DayVote") {
      for (const bot of aliveBots) {
        this.actionTimers.push(
          setTimeout(() => {
            const candidates = this.players.filter((p) => p.isAlive && p.playerId !== bot.playerId);
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            if (target) {
              this.actions.dayVotes[bot.playerId] = target.playerId;
              logGameEvent("test.action.bot", { actionType: "day-vote", actor: bot.nickname, target: target.nickname });
            }
          }, randomDelay())
        );
      }
    }

    if (phase === "MayorElection") {
      for (const bot of aliveBots) {
        this.actionTimers.push(
          setTimeout(() => {
            const candidates = this.players.filter((p) => p.isAlive);
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            if (target) {
              this.actions.dayVotes[bot.playerId] = target.playerId;
              logGameEvent("test.action.bot", { actionType: "mayor-vote", actor: bot.nickname, target: target.nickname });
            }
          }, randomDelay())
        );
      }
    }
  }

  private resolveNight(): void {
    this.lastNightEliminated = null;
    const alive = this.players.filter((p) => p.isAlive);
    const aliveVampire = alive.find((p) => p.role === "Vampire");
    if (!aliveVampire) return;

    if (!this.actions.vampireTarget) {
      const candidates = alive.filter((p) => p.playerId !== aliveVampire.playerId);
      const random = candidates[Math.floor(Math.random() * candidates.length)];
      this.actions.vampireTarget = random?.playerId;
    }

    if (!this.actions.doctorTarget) {
      const doctor = alive.find((p) => p.role === "Doctor");
      if (doctor) {
        const selfAllowed = !this.doctorLastSelfProtect;
        const candidates = selfAllowed ? alive : alive.filter((p) => p.playerId !== doctor.playerId);
        const random = candidates[Math.floor(Math.random() * candidates.length)];
        this.actions.doctorTarget = random?.playerId;
      }
    }

    const me = this.me();
    if (me.role === "Detective" && me.isAlive && this.actions.detectiveTarget) {
      const inspected = this.players.find((p) => p.playerId === this.actions.detectiveTarget);
      if (inspected) {
        const text = inspected.role === "Vampire" ? `${inspected.nickname}: Vampir` : `${inspected.nickname}: Vampir değil`;
        useGameStore.getState().setPrivateResultText(
          inspected.role === "Vampire" ? "Sorgu Sonucu: Vampir" : "Sorgu Sonucu: Vampir değil"
        );
        logPersonalEvent("personal.detective.inspect_result", {
          detectiveTargetPlayerId: inspected.playerId,
          detectiveResult: inspected.role === "Vampire" ? "Vampire" : "NotVampire",
          round: this.round,
          text
        });
      }
    }

    let nightOutcome: "killed" | "protected" | "none" = "none";
    if (this.actions.vampireTarget && this.actions.vampireTarget !== this.actions.doctorTarget) {
      const target = this.players.find((p) => p.playerId === this.actions.vampireTarget);
      if (target) {
        target.isAlive = false;
        if (this.mayorPlayerId === target.playerId) {
          this.mayorPlayerId = null;
        }
        this.lastNightEliminated = target.playerId;
        nightOutcome = "killed";
        logGameEvent("test.night.resolve.kill", { target: target.nickname });
        logGameEvent("summary.elimination", {
          round: this.round,
          source: "Night",
          playerId: target.playerId,
          revealedRole: this.revealedRoleFor(target)
        });
      }
    } else if (this.actions.vampireTarget && this.actions.vampireTarget === this.actions.doctorTarget) {
      nightOutcome = "protected";
      logGameEvent("summary.night_no_elimination", { round: this.round, reason: "doctor_protected" });
    } else {
      logGameEvent("summary.night_no_elimination", { round: this.round, reason: "no_vampire_target" });
    }

    const doctor = this.players.find((p) => p.role === "Doctor");
    if (doctor) {
      this.doctorLastSelfProtect = this.actions.doctorTarget === doctor.playerId;
    }

    if (me.role === "Doctor" && me.isAlive && this.actions.doctorTarget) {
      logPersonalEvent("personal.doctor.protect_result", {
        targetPlayerId: this.actions.doctorTarget,
        round: this.round,
        outcome: nightOutcome === "protected" ? "blocked" : "no_attack",
        text: nightOutcome === "protected" ? "Koruman saldırıyı engelledi." : "Koruduğun hedefe saldırı gelmedi."
      });
    }
    if (me.role === "Vampire" && me.isAlive && this.actions.vampireTarget) {
      const target = this.players.find((p) => p.playerId === this.actions.vampireTarget);
      const targetName = target?.nickname ?? "hedef";
      logPersonalEvent("personal.vampire.night_result", {
        targetPlayerId: this.actions.vampireTarget,
        round: this.round,
        outcome: nightOutcome,
        text:
          nightOutcome === "protected"
            ? `${targetName} doktor tarafından korundu.`
            : nightOutcome === "killed"
              ? `${targetName} gece elendi.`
              : `${targetName} için gece sonucu netleşmedi.`
      });
    }

    logGameEvent("test.night.resolve.done", {
      vampireTarget: this.actions.vampireTarget ?? null,
      doctorTarget: this.actions.doctorTarget ?? null
    });
    this.actions = { dayVotes: {} };
    useGameStore.getState().setRoomState(this.toRoomSnapshot("InGame"));
  }

  private resolveDayVote(): void {
    const alive = this.players.filter((p) => p.isAlive);
    for (const player of alive) {
      if (!this.actions.dayVotes[player.playerId]) {
        const candidates = alive.filter((c) => c.playerId !== player.playerId);
        const random = candidates[Math.floor(Math.random() * candidates.length)];
        if (random) {
          this.actions.dayVotes[player.playerId] = random.playerId;
        }
      }
    }

    const counts = new Map<string, number>();
    for (const target of Object.values(this.actions.dayVotes)) {
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }
    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    const second = ranked[1];
    if (!top) {
      this.actions = { dayVotes: {} };
      return;
    }
    if (second && second[1] === top[1]) {
      this.tieCount += 1;
      useGameStore.getState().setLastDayVoteSummary({
        entries: ranked.map(([playerId, votes]) => ({ playerId, votes })),
        executedPlayerId: null,
        tiedTopCandidates: ranked.filter(([, votes]) => votes === top[1]).map(([playerId]) => playerId)
      });
      useGameStore.getState().setPrivateResultText("Beraberlik çıktı. Köy tekrar oylayacak.");
      this.actions = { dayVotes: {} };
      logGameEvent("test.dayvote.tie", { tieCount: this.tieCount });
      logGameEvent("vote.tie", {
        round: this.round,
        tieCount: this.tieCount,
        tiedTopCandidates: ranked.filter(([, votes]) => votes === top[1]).map(([playerId]) => playerId)
      });
      return;
    }

    const eliminated = this.players.find((p) => p.playerId === top[0]);
    if (eliminated) {
      eliminated.isAlive = false;
      if (this.mayorPlayerId === eliminated.playerId) {
        this.mayorPlayerId = null;
      }
      useGameStore.getState().setLastDayVoteSummary({
        entries: ranked.map(([playerId, votes]) => ({ playerId, votes })),
        executedPlayerId: eliminated.playerId,
        tiedTopCandidates: []
      });
      useGameStore.getState().setPrivateResultText(`Gündüz sonucu: ${eliminated.nickname} köyden gönderildi.`);
      logGameEvent("test.dayvote.executed", { target: eliminated.nickname, voteCount: top[1] });
      logGameEvent("vote.execution", { round: this.round, executedPlayerId: eliminated.playerId, voteCount: top[1] });
      logGameEvent("summary.elimination", {
        round: this.round,
        source: "Day",
        playerId: eliminated.playerId,
        revealedRole: this.revealedRoleFor(eliminated)
      });
    }
    this.actions = { dayVotes: {} };
    useGameStore.getState().setRoomState(this.toRoomSnapshot("InGame"));
  }

  private resolveMayorElection(): void {
    const alive = this.players.filter((p) => p.isAlive);
    for (const player of alive) {
      if (!this.actions.dayVotes[player.playerId]) {
        const random = alive[Math.floor(Math.random() * alive.length)];
        if (random) {
          this.actions.dayVotes[player.playerId] = random.playerId;
        }
      }
    }

    const counts = new Map<string, number>();
    for (const target of Object.values(this.actions.dayVotes)) {
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }
    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    if (!top) {
      this.actions = { dayVotes: {} };
      return;
    }
    const tiedTopCandidates = ranked.filter(([, votes]) => votes === top[1]).map(([playerId]) => playerId);
    const selectedMayorId = tiedTopCandidates[Math.floor(Math.random() * tiedTopCandidates.length)] ?? top[0];
    this.mayorPlayerId = selectedMayorId;
    this.actions = { dayVotes: {} };
    useGameStore.getState().setPrivateResultText(
      `Başkan seçildi: ${this.players.find((p) => p.playerId === selectedMayorId)?.nickname ?? "Bilinmiyor"}`
    );
    logGameEvent("role.mayor.selected", { round: this.round, mayorPlayerId: selectedMayorId });
  }

  private computeWinner(): Winner | null {
    const alive = this.players.filter((p) => p.isAlive);
    const vampires = alive.filter((p) => p.role === "Vampire").length;
    const villagers = alive.length - vampires;
    if (vampires === 0) return "Villagers";
    if (vampires >= villagers) return "Vampires";
    return null;
  }

  private finishGame(winner: Winner): void {
    this.clearTimers();
    useGameStore.getState().setGameWinner(winner);
    useGameStore.getState().setRoomState(this.toRoomSnapshot("GameOver"));
    useGameStore.getState().setGameState({
      phase: "GameOver",
      round: this.round,
      phaseEndsAt: null,
      tieCountInRound: this.tieCount
    });
    logGameEvent("test.game.over", {
      winner,
      alivePlayers: this.players.filter((p) => p.isAlive).map((p) => p.nickname)
    });
    logGameEvent("game.over", { winner, round: this.round });
  }

  private revealedRoleFor(player: SimPlayer): Role | null {
    return useGameStore.getState().roomRules.revealEliminatedRole ? player.role : null;
  }

  private shouldRunMayorElection(): boolean {
    const rules = useGameStore.getState().roomRules;
    if (!rules.mayorEnabled) return false;
    const mayor = this.mayorPlayerId ? this.players.find((p) => p.playerId === this.mayorPlayerId) : null;
    return !mayor?.isAlive;
  }

  private clearTimers(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.clearActionTimers();
  }

  private clearActionTimers(): void {
    for (const timer of this.actionTimers) {
      clearTimeout(timer);
    }
    this.actionTimers = [];
  }

  runBatchSimulation(config: BatchSimulationConfig): BatchSimulationSummary {
    const totalGames = Math.max(1, config.gameCount);
    let villagerWins = 0;
    let vampireWins = 0;
    let unresolvedGames = 0;
    let totalRounds = 0;
    let tieRounds = 0;

    logGameEvent("sim.batch.start", {
      totalPlayers: config.totalPlayers,
      totalGames
    });

    for (let i = 0; i < totalGames; i += 1) {
      const result = this.runSingleSimulation(config.totalPlayers, i + 1);
      totalRounds += result.roundsPlayed;
      tieRounds += result.tieRounds;
      if (result.winner === "Villagers") villagerWins += 1;
      else if (result.winner === "Vampires") vampireWins += 1;
      else unresolvedGames += 1;
    }

    const summaryBase: Omit<BatchSimulationSummary, "suspiciousFlags"> = {
      totalPlayers: config.totalPlayers,
      totalGames,
      villagerWins,
      vampireWins,
      unresolvedGames,
      averageRounds: Number((totalRounds / totalGames).toFixed(2)),
      tieRounds
    };
    const suspiciousFlags = this.buildSuspiciousFlags(summaryBase);
    const summary: BatchSimulationSummary = { ...summaryBase, suspiciousFlags };

    logGameEvent("sim.batch.summary", summary as unknown as Record<string, unknown>);
    if (suspiciousFlags.length) {
      logGameEvent("sim.batch.suspicious", {
        totalPlayers: config.totalPlayers,
        totalGames,
        suspiciousFlags
      });
    }
    return summary;
  }

  private runSingleSimulation(totalPlayers: number, gameNo: number): { winner: Winner | null; roundsPlayed: number; tieRounds: number } {
    const players: SimPlayer[] = this.buildSimPlayers(totalPlayers);
    this.assignRolesForPlayers(players);

    let roundsPlayed = 0;
    let tieCountInRound = 0;
    let tieRounds = 0;
    let doctorLastSelfProtect: string | null = null;
    let winner: Winner | null = null;
    const detectiveKnownVampires = new Set<string>();
    const nightThreatScores = new Map<string, number>();

    logGameEvent("sim.game.start", {
      gameNo,
      totalPlayers,
      roles: players.map((p) => ({ playerId: p.playerId, role: p.role }))
    });

    while (!winner && roundsPlayed < SIM_MAX_ROUNDS) {
      roundsPlayed += 1;
      const alive = players.filter((p) => p.isAlive);
      const vampires = alive.filter((p) => p.role === "Vampire");
      const detective = alive.find((p) => p.role === "Detective") ?? null;
      const doctor = alive.find((p) => p.role === "Doctor") ?? null;

      const vampireVotes: Array<{ actor: string; target: string }> = [];
      for (const vamp of vampires) {
        const candidates = alive.filter((p) => p.role !== "Vampire");
        const target = this.pickWeightedTarget(candidates, (p) => 1 + (nightThreatScores.get(p.playerId) ?? 0));
        if (target) {
          vampireVotes.push({ actor: vamp.playerId, target: target.playerId });
        }
      }
      logGameEvent("sim.round.night.vampire_votes", {
        gameNo,
        round: roundsPlayed,
        votes: vampireVotes
      });

      const detectiveTarget = detective ? this.pickRandomFrom(alive.filter((p) => p.playerId !== detective.playerId)) : null;
      let doctorTarget: SimPlayer | null = null;
      const selfProtectWasBlocked = doctor ? doctorLastSelfProtect === doctor.playerId : false;
      if (doctor) {
        const candidates: SimPlayer[] =
          doctorLastSelfProtect === doctor.playerId
            ? alive.filter((p) => p.playerId !== doctor.playerId)
            : alive;
        doctorTarget = this.pickWeightedTarget(candidates, (p) => {
          const threat = nightThreatScores.get(p.playerId) ?? 0;
          const selfPenalty = p.playerId === doctor.playerId ? 0.65 : 1;
          return (1 + threat * 2) * selfPenalty;
        });
      }

      const nightTargetPlayerId = this.resolveVampireTargetFromVotes(vampireVotes);
      const protectedPlayerId = doctorTarget?.playerId ?? null;
      let killedPlayerId: string | null = null;
      if (nightTargetPlayerId && nightTargetPlayerId !== protectedPlayerId) {
        const killed = players.find((p) => p.playerId === nightTargetPlayerId);
        if (killed) {
          const firstNightNoKill = totalPlayers === 4 && roundsPlayed === 1;
          if (!firstNightNoKill) {
            killed.isAlive = false;
            killedPlayerId = killed.playerId;
          }
        }
      }

      if (doctor) {
        doctorLastSelfProtect = doctorTarget?.playerId === doctor.playerId ? doctor.playerId : null;
      }

      const detectiveResult =
        detective && detectiveTarget
          ? (detectiveTarget.role === "Vampire" ? "Vampire" : "NotVampire")
          : null;
      if (detective && detectiveTarget) {
        if (detectiveResult === "Vampire") {
          detectiveKnownVampires.add(detectiveTarget.playerId);
        }
        logGameEvent("sim.round.night.detective", {
          gameNo,
          round: roundsPlayed,
          detectivePlayerId: detective.playerId,
          targetPlayerId: detectiveTarget.playerId,
          result: detectiveResult
        });
      }

      if (doctor) {
        logGameEvent("sim.round.night.doctor", {
          gameNo,
          round: roundsPlayed,
          doctorPlayerId: doctor.playerId,
          protectedPlayerId: protectedPlayerId,
          selfProtectBlockedByRule: selfProtectWasBlocked
        });
      }

      if (nightTargetPlayerId) {
        nightThreatScores.set(nightTargetPlayerId, (nightThreatScores.get(nightTargetPlayerId) ?? 0) + 1);
        const killedOrBlocked = nightTargetPlayerId === protectedPlayerId ? "blocked_by_doctor" : "killed";
        logGameEvent("sim.round.night.resolve", {
          gameNo,
          round: roundsPlayed,
          vampireFinalTarget: nightTargetPlayerId,
          protectedPlayerId,
          outcome: killedOrBlocked
        });
      }

      logGameEvent("sim.round.night", {
        gameNo,
        round: roundsPlayed,
        vampireVotes,
        resolvedTarget: nightTargetPlayerId,
        protectedPlayerId,
        killedPlayerId,
        detectiveTarget: detectiveTarget?.playerId ?? null,
        detectiveResult
      });

      winner = this.computeWinnerFor(players);
      if (winner) break;

      const firstVote = this.buildRandomDayVotes(players, detectiveKnownVampires);
      const firstResult = this.resolveDayVotesFor(players, firstVote);
      logGameEvent("sim.round.day.vote1", {
        gameNo,
        round: roundsPlayed,
        votes: firstVote,
        result: firstResult
      });

      let finalResult = firstResult;
      if (!firstResult.executedPlayerId && firstResult.tiedTopCandidates.length > 1 && tieCountInRound === 0) {
        tieCountInRound = 1;
        tieRounds += 1;
        logGameEvent("sim.round.day.tie", {
          gameNo,
          round: roundsPlayed,
          tiedTopCandidates: firstResult.tiedTopCandidates
        });
        const secondVote = this.buildRandomDayVotes(players, detectiveKnownVampires, firstResult.tiedTopCandidates);
        finalResult = this.resolveDayVotesFor(players, secondVote);
        logGameEvent("sim.round.day.vote2", {
          gameNo,
          round: roundsPlayed,
          votes: secondVote,
          result: finalResult
        });
      } else {
        tieCountInRound = 0;
      }

      if (finalResult.executedPlayerId) {
        const executed = players.find((p) => p.playerId === finalResult.executedPlayerId);
        if (executed) executed.isAlive = false;
        logGameEvent("sim.round.day.execution", {
          gameNo,
          round: roundsPlayed,
          executedPlayerId: finalResult.executedPlayerId
        });
      }

      logGameEvent("sim.round.day.resolve", {
        gameNo,
        round: roundsPlayed,
        executedPlayerId: finalResult.executedPlayerId,
        tiedTopCandidates: finalResult.tiedTopCandidates,
        breakdown: finalResult.breakdown
      });

      winner = this.computeWinnerFor(players);
    }

    logGameEvent("sim.game.end", {
      gameNo,
      winner,
      roundsPlayed,
      unresolved: !winner,
      alive: players.filter((p) => p.isAlive).map((p) => ({ playerId: p.playerId, role: p.role }))
    });

    return { winner, roundsPlayed, tieRounds };
  }

  private buildSuspiciousFlags(summary: Omit<BatchSimulationSummary, "suspiciousFlags">): string[] {
    const flags: string[] = [];
    const resolvedGames = Math.max(1, summary.totalGames - summary.unresolvedGames);
    const unresolvedRate = summary.unresolvedGames / summary.totalGames;
    const vampireWinRate = summary.vampireWins / resolvedGames;
    const villagerWinRate = summary.villagerWins / resolvedGames;
    const avgTiePerGame = summary.tieRounds / summary.totalGames;

    if (unresolvedRate > 0.1) flags.push("HIGH_UNRESOLVED_RATE");
    if (summary.averageRounds > 12) flags.push("LONG_GAMES_AVERAGE");
    if (avgTiePerGame > 0.75) flags.push("TOO_MANY_TIES");
    if (vampireWinRate > 0.8) flags.push("VAMPIRE_WIN_RATE_TOO_HIGH");
    if (villagerWinRate > 0.8) flags.push("VILLAGER_WIN_RATE_TOO_HIGH");

    return flags;
  }

  private buildSimPlayers(totalPlayers: number): SimPlayer[] {
    const me = useGameStore.getState().nickname.trim() || "Sen";
    const players: SimPlayer[] = [
      { playerId: "sim-me", nickname: me, isAlive: true, isConnected: true, isReady: true, isBot: false, role: "Villager" }
    ];
    for (let i = 1; i < totalPlayers; i += 1) {
      players.push({
        playerId: `sim-bot-${i}`,
        nickname: this.uniqueBotNickname(i - 1),
        isAlive: true,
        isConnected: true,
        isReady: true,
        isBot: true,
        role: "Villager"
      });
    }
    return players;
  }

  private assignRolesForPlayers(players: SimPlayer[]): void {
    const rolePreset = useGameStore.getState().rolePreset;
    const deck = this.shuffledDeck(players.length, rolePreset);
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffledPlayers.length; i += 1) {
      shuffledPlayers[i].role = deck[i] ?? "Villager";
    }
  }

  private shuffledDeck(playerCount: number, preset: RolePresetId): Role[] {
    const deck = buildRoleDeck(playerCount, preset);
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  private uniqueBotNickname(index: number): string {
    const base = BOT_NAMES[index % BOT_NAMES.length];
    const repeatNo = Math.floor(index / BOT_NAMES.length) + 1;
    return repeatNo > 1 ? `${base} #${repeatNo}` : base;
  }

  private resolveVampireTargetFromVotes(votes: Array<{ actor: string; target: string }>): string | null {
    if (!votes.length) return null;
    const counts = new Map<string, number>();
    for (const vote of votes) {
      counts.set(vote.target, (counts.get(vote.target) ?? 0) + 1);
    }
    let maxVotes = 0;
    for (const value of counts.values()) {
      if (value > maxVotes) maxVotes = value;
    }
    const top = Array.from(counts.entries())
      .filter(([, count]) => count === maxVotes)
      .map(([playerId]) => playerId);
    if (!top.length) return null;
    return top[Math.floor(Math.random() * top.length)] ?? null;
  }

  private buildRandomDayVotes(
    players: SimPlayer[],
    detectiveKnownVampires: Set<string>,
    restrictedTargets?: string[]
  ): Array<{ actor: string; target: string }> {
    const alive = players.filter((p) => p.isAlive);
    const aliveSet = new Set(alive.map((p) => p.playerId));
    const allowedTargets = restrictedTargets?.filter((id) => aliveSet.has(id));
    const votes: Array<{ actor: string; target: string }> = [];
    for (const actor of alive) {
      const candidates = alive.filter(
        (p) => p.playerId !== actor.playerId && (!allowedTargets?.length || allowedTargets.includes(p.playerId))
      );
      const target = this.pickWeightedTarget(candidates, (candidate) => {
        if (actor.role === "Vampire" && candidate.role === "Vampire") return 0.01;
        if (actor.role === "Detective" && detectiveKnownVampires.has(candidate.playerId)) return 12;
        if (detectiveKnownVampires.has(candidate.playerId)) return 6;
        return 1;
      });
      if (target) votes.push({ actor: actor.playerId, target: target.playerId });
    }
    return votes;
  }

  private resolveDayVotesFor(
    players: SimPlayer[],
    votes: Array<{ actor: string; target: string }>
  ): { executedPlayerId: string | null; tiedTopCandidates: string[]; breakdown: Array<{ playerId: string; votes: number }> } {
    const aliveSet = new Set(players.filter((p) => p.isAlive).map((p) => p.playerId));
    const counts = new Map<string, number>();
    for (const vote of votes) {
      if (!aliveSet.has(vote.actor) || !aliveSet.has(vote.target)) continue;
      counts.set(vote.target, (counts.get(vote.target) ?? 0) + 1);
    }
    let maxVotes = 0;
    for (const value of counts.values()) {
      if (value > maxVotes) maxVotes = value;
    }
    if (maxVotes === 0) return { executedPlayerId: null, tiedTopCandidates: [], breakdown: [] };
    const top = Array.from(counts.entries()).filter(([, n]) => n === maxVotes).map(([id]) => id);
    const breakdown = Array.from(counts.entries()).map(([playerId, n]) => ({ playerId, votes: n }));
    if (top.length > 1) return { executedPlayerId: null, tiedTopCandidates: top, breakdown };
    return { executedPlayerId: top[0] ?? null, tiedTopCandidates: [], breakdown };
  }

  private computeWinnerFor(players: SimPlayer[]): Winner | null {
    const alive = players.filter((p) => p.isAlive);
    const vampires = alive.filter((p) => p.role === "Vampire").length;
    const villagers = alive.length - vampires;
    if (vampires === 0) return "Villagers";
    if (vampires >= villagers) return "Vampires";
    return null;
  }

  private pickRandomFrom<T>(items: T[]): T | null {
    if (!items.length) return null;
    return items[Math.floor(Math.random() * items.length)] ?? null;
  }

  private pickWeightedTarget<T>(items: T[], score: (item: T) => number): T | null {
    if (!items.length) return null;
    const weighted = items.map((item) => ({ item, value: Math.max(0, score(item)) }));
    const total = weighted.reduce((sum, curr) => sum + curr.value, 0);
    if (total <= 0) return this.pickRandomFrom(items);
    let ticket = Math.random() * total;
    for (const row of weighted) {
      ticket -= row.value;
      if (ticket <= 0) return row.item;
    }
    return weighted[weighted.length - 1]?.item ?? null;
  }
}

export const testSimulator = new TestSimulator();
