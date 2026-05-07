import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveRuleSettings } from "@vampir-koylu/shared";
import { createEmptyBotMemory } from "../src/bots/bot-memory.js";
import {
  buildBotSpeechContext,
  chooseBotSpeechIntent,
  composeBotSpeech,
  selectSpeechTargetForIntent
} from "../src/bots/bot-speech-engine.js";
import type { PlayerState, RoomState } from "../src/game/game-types.js";

function player(options: Partial<PlayerState> & Pick<PlayerState, "playerId" | "nickname" | "role">): PlayerState {
  return {
    playerId: options.playerId,
    nickname: options.nickname,
    deviceId: options.isBot ? `bot:${options.playerId}` : `device:${options.playerId}`,
    sessionToken: "t",
    socketId: options.isBot ? "" : `s:${options.playerId}`,
    isConnected: true,
    isReady: true,
    isAlive: options.isAlive ?? true,
    role: options.role,
    lastProtectedRound: null,
    lastProtectedTargetPlayerId: null,
    guardUsedInGame: false,
    isBot: options.isBot ?? false,
    botIntelligence: options.botIntelligence,
    botPersonality: options.botPersonality
  };
}

function room(players: PlayerState[], game: Partial<RoomState["game"]> = {}): RoomState {
  const rules = resolveRuleSettings("Classic", {});
  return {
    roomCode: "ROOM",
    status: "InGame",
    hostPlayerId: players[0]?.playerId,
    players,
    game: {
      phase: "DayDiscussion",
      round: 1,
      phaseEndsAt: null,
      isPaused: false,
      pausedRemainingMs: null,
      tieCountInRound: 0,
      mayorPlayerId: null,
      guardProtectedPlayerId: null,
      winner: null,
      actions: [],
      privateResults: [],
      lastDayVoteSummary: null,
      lastEliminationSummary: null,
      gameMode: "Classic",
      rolePreset: "beginner",
      loverLinks: {},
      detectiveInspectedTargets: {},
      phaseDurations: {
        roleReveal: 10,
        nightStart: 5,
        vampireVote: 30,
        detectiveInspect: 20,
        doctorProtect: 20,
        nightResolve: 10,
        dayStart: 10,
        mayorElection: 45,
        guardProtect: 45,
        dayDiscussion: 120,
        dayVote: 45,
        executionResolve: 10,
        hunterLastBreath: 10,
        winCheck: 1
      },
      ...game,
      rules: game.rules ?? rules
    },
    createdAt: 0,
    lastActivityAt: 0,
    cleanupAt: null
  };
}

describe("bot speech context and selector", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not build context for dead bots, night phases, or GameOver", () => {
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true, isAlive: false });
    const mem = createEmptyBotMemory();
    expect(buildBotSpeechContext(room([bot]), bot, mem)).toBeNull();

    const alive = { ...bot, isAlive: true };
    expect(buildBotSpeechContext(room([alive], { phase: "VampireVote" }), alive, mem)).toBeNull();
    expect(buildBotSpeechContext({ ...room([alive]), status: "GameOver" }, alive, mem)).toBeNull();
  });

  it("uses personality when choosing the first weighted intent", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const bot = player({
      playerId: "b1",
      nickname: "Bot",
      role: "Villager",
      isBot: true,
      botPersonality: "accuser",
      botIntelligence: "balanced"
    });
    const ctx = buildBotSpeechContext(room([bot, player({ playerId: "p1", nickname: "P1", role: "Villager" })]), bot, createEmptyBotMemory());
    expect(ctx).not.toBeNull();
    expect(chooseBotSpeechIntent(ctx!)).toBe("accuse_soft");
  });

  it("links day vote speech to intended vote target without submitting an action", () => {
    const bot = player({
      playerId: "b1",
      nickname: "Bot",
      role: "Villager",
      isBot: true,
      botPersonality: "leader",
      botIntelligence: "balanced"
    });
    const suspect = player({ playerId: "p1", nickname: "Sessiz", role: "Villager" });
    const other = player({ playerId: "p2", nickname: "Diger", role: "Villager" });
    const mem = createEmptyBotMemory();
    mem.suspicionByPlayerId.p1 = 10;
    const r = room([bot, suspect, other], { phase: "DayVote" });
    const ctx = buildBotSpeechContext(r, bot, mem);
    expect(ctx?.intendedVoteTargetId).toBe("p1");
    expect(selectSpeechTargetForIntent(ctx!, "vote_hint")?.playerId).toBe("p1");
    expect(r.game.actions).toEqual([]);
  });

  it("keeps doctor protected target out of target-bearing speech", () => {
    const doctor = player({ playerId: "doc", nickname: "Doktor", role: "Doctor", isBot: true });
    const protectedPlayer = player({ playerId: "p1", nickname: "Korunan", role: "Villager" });
    const other = player({ playerId: "p2", nickname: "Diger", role: "Villager" });
    const mem = createEmptyBotMemory();
    mem.lastProtectedPlayerId = "p1";
    mem.trustByPlayerId.p1 = 99;
    const ctx = buildBotSpeechContext(room([doctor, protectedPlayer, other]), doctor, mem);
    expect(selectSpeechTargetForIntent(ctx!, "support_soft")?.playerId).toBe("p2");
    expect(selectSpeechTargetForIntent(ctx!, "accuse_soft")?.playerId).toBe("p2");
  });

  it("lets detective known vampire become only a soft target, not a hard claim", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const detective = player({
      playerId: "det",
      nickname: "Dedektif",
      role: "Detective",
      isBot: true,
      botPersonality: "accuser"
    });
    const vampire = player({ playerId: "v1", nickname: "VampirAdayi", role: "Vampire" });
    const mem = createEmptyBotMemory();
    mem.knownVampires.push("v1");
    const ctx = buildBotSpeechContext(room([detective, vampire]), detective, mem);
    expect(selectSpeechTargetForIntent(ctx!, "accuse_soft")?.playerId).toBe("v1");
    const speech = composeBotSpeech(ctx!);
    expect(speech?.targetPlayerId).toBe("v1");
    expect(speech?.message.toLocaleLowerCase("tr-TR")).not.toContain("dedektifim");
    expect(speech?.message.toLocaleLowerCase("tr-TR")).not.toContain("vampir bu");
  });

  it("does not target vampire teammates in vampire speech", () => {
    const vampire = player({ playerId: "v1", nickname: "V1", role: "Vampire", isBot: true });
    const teammate = player({ playerId: "v2", nickname: "V2", role: "Vampire", isBot: true });
    const villager = player({ playerId: "p1", nickname: "Koylu", role: "Villager" });
    const ctx = buildBotSpeechContext(room([vampire, teammate, villager]), vampire, createEmptyBotMemory());
    expect(selectSpeechTargetForIntent(ctx!, "accuse_soft")?.playerId).toBe("p1");
  });

  it("skips repeated template ids and phase spam", () => {
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true });
    const mem = createEmptyBotMemory();
    mem.speechCountThisPhase = 1;
    const ctx = buildBotSpeechContext(room([bot, player({ playerId: "p1", nickname: "P1", role: "Villager" })]), bot, mem);
    expect(composeBotSpeech(ctx!)).toBeNull();
  });
});
