import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveRuleSettings } from "@vampir-koylu/shared";
import { BotMemoryStore, createEmptyBotMemory } from "../src/bots/bot-memory.js";
import {
  BotSpeechEngine,
  buildBotSpeechContext,
  chooseBotSpeechIntent,
  composeBotSpeech,
  selectSpeechTargetForIntent
} from "../src/bots/bot-speech-engine.js";
import type { BotBrainController } from "../src/bots/bot-brain-controller.js";
import { speechTemplates } from "../src/bots/bot-speech-templates.js";
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

  it("can select templates whose intent is present in template metadata for the phase", () => {
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true, botPersonality: "accuser" });
    const mem = createEmptyBotMemory();
    mem.recentSpeechTemplateIds = speechTemplates
      .map((template) => template.id)
      .filter((id) => id !== "accuse-invisible-1");
    const ctx = buildBotSpeechContext(room([bot, player({ playerId: "p1", nickname: "P1", role: "Villager" })]), bot, mem);

    const speech = composeBotSpeech(ctx!);

    expect(speech?.templateId).toBe("accuse-invisible-1");
  });

  it("filters role-specific templates when the active role is missing", () => {
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true, botPersonality: "chaotic" });
    const mem = createEmptyBotMemory();
    mem.recentSpeechTemplateIds = speechTemplates
      .map((template) => template.id)
      .filter((id) => id !== "chaos-detective-sherlock-1" && id !== "chaos-doctor-distance-learning-1");
    const ctx = buildBotSpeechContext(room([
      bot,
      player({ playerId: "v1", nickname: "Vampir", role: "Vampire" }),
      player({ playerId: "p1", nickname: "Koylu1", role: "Villager" }),
      player({ playerId: "p2", nickname: "Koylu2", role: "Villager" })
    ], { phase: "DayStart" }), bot, mem);

    expect(composeBotSpeech(ctx!)).toBeNull();
  });
});

describe("bot speech phase coordinator", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function makeEngine(r: RoomState, brain?: BotBrainController) {
    const memory = new BotMemoryStore();
    const emitted: unknown[] = [];
    const committed: { botPlayerId: string; templateId?: string; fingerprint?: string }[] = [];
    const logs: { payload: object; message?: string }[] = [];
    const engine = new BotSpeechEngine({
      getRoom: () => r,
      getBotMemory: (roomCode, botPlayerId) => memory.get(roomCode, botPlayerId),
      emit: (_roomCode, event) => emitted.push(event),
      onSpeechCommitted: (roomCode, botPlayerId, intent, targetPlayerId, templateId, fingerprint) => {
        committed.push({ botPlayerId, templateId, fingerprint });
        memory.onBotSpeech(roomCode, botPlayerId, intent, targetPlayerId, templateId, fingerprint);
      },
      brain,
      log: { info: (payload, message) => logs.push({ payload, message }) }
    });
    return { engine, memory, emitted, committed, logs };
  }

  it("limits six DayDiscussion bots to three staggered speeches without duplicate templates or text", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const players = Array.from({ length: 6 }, (_, i) =>
      player({
        playerId: `b${i}`,
        nickname: `Bot${i}`,
        role: "Villager",
        isBot: true,
        botPersonality: "accuser",
        botIntelligence: "balanced"
      })
    );
    const r = room(players, { phase: "DayDiscussion" });
    const { engine, emitted, committed } = makeEngine(r);

    engine.onPhaseAdvanced(r);
    vi.advanceTimersByTime(1329);
    expect(emitted).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(emitted).toHaveLength(1);
    vi.advanceTimersByTime(1939);
    expect(emitted).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(emitted).toHaveLength(2);
    vi.runAllTimers();

    expect(emitted).toHaveLength(3);
    expect(new Set(committed.map((x) => x.botPlayerId)).size).toBe(3);
    expect(new Set(committed.map((x) => x.templateId)).size).toBe(3);
    expect(new Set(committed.map((x) => x.fingerprint)).size).toBe(3);
  });

  it("does not emit twice for the same bot in the same phase", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true });
    const r = room([bot, player({ playerId: "p1", nickname: "P1", role: "Villager" })]);
    const { engine, emitted } = makeEngine(r);

    engine.onPhaseAdvanced(r);
    vi.runAllTimers();

    expect(emitted).toHaveLength(1);
  });

  it("keeps recently emitted room templates out of the next phase", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true });
    const other = player({ playerId: "p1", nickname: "P1", role: "Vampire" });
    const r = room([bot, other], { phase: "DayStart" });
    const { engine, memory, committed } = makeEngine(r);
    memory.get(r.roomCode, bot.playerId).recentSpeechTemplateIds = speechTemplates
      .map((template) => template.id)
      .filter((id) => id !== "small-village-innocent");

    engine.onPhaseAdvanced(r);
    vi.runAllTimers();
    expect(committed[0]?.templateId).toBe("small-village-innocent");

    r.game.phase = "DayDiscussion";
    memory.get(r.roomCode, bot.playerId).recentSpeechTemplateIds = speechTemplates
      .map((template) => template.id)
      .filter((id) => id !== "small-village-innocent");
    engine.onPhaseAdvanced(r);
    vi.runAllTimers();

    expect(committed).toHaveLength(1);
  });

  it("skips instead of repeating when the template pool is exhausted", () => {
    vi.useFakeTimers();
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true });
    const r = room([bot, player({ playerId: "p1", nickname: "P1", role: "Villager" })]);
    const { engine, memory, emitted, logs } = makeEngine(r);
    memory.get(r.roomCode, bot.playerId).recentSpeechTemplateIds = speechTemplates.map((template) => template.id);

    engine.onPhaseAdvanced(r);
    vi.runAllTimers();

    expect(emitted).toHaveLength(0);
    expect(logs.some((log) => log.message === "bot.speech.low_template_pool")).toBe(true);
  });

  it("clears old phase timers when the phase changes", () => {
    vi.useFakeTimers();
    const players = Array.from({ length: 6 }, (_, i) =>
      player({ playerId: `b${i}`, nickname: `Bot${i}`, role: "Villager", isBot: true })
    );
    const r = room(players, { phase: "DayDiscussion" });
    const { engine, emitted } = makeEngine(r);

    engine.onPhaseAdvanced(r);
    expect(vi.getTimerCount()).toBe(3);
    r.game.phase = "DayVote";
    engine.onPhaseAdvanced(r);
    expect(vi.getTimerCount()).toBe(3);
    vi.runAllTimers();

    expect(emitted).toHaveLength(3);
  });

  it("does not schedule speech for GameOver or night phases", () => {
    vi.useFakeTimers();
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true });
    const r = room([bot], { phase: "VampireVote" });
    const { engine, emitted } = makeEngine(r);

    engine.onPhaseAdvanced(r);
    r.game.phase = "GameOver";
    engine.onPhaseAdvanced(r);
    vi.runAllTimers();

    expect(emitted).toHaveLength(0);
  });

  it("uses brain-generated speech when available", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true });
    const r = room([bot, player({ playerId: "p1", nickname: "P1", role: "Villager" })]);
    const brain = {
      generateSpeech: vi.fn().mockResolvedValue({
        ok: true,
        event: {
          roomCode: r.roomCode,
          phaseId: "DayDiscussion:1",
          speakerPlayerId: "b1",
          speakerName: "Bot",
          message: "LLM mesajı kısa kaldı.",
          tone: "calm",
          intent: "analysis",
          durationMs: 5200,
          createdAt: 1
        },
        fingerprint: "llm mesajı kısa kaldı."
      })
    } as unknown as BotBrainController;
    const { engine, emitted, committed } = makeEngine(r, brain);

    engine.onPhaseAdvanced(r);
    await vi.runAllTimersAsync();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ message: "LLM mesajı kısa kaldı.", intent: "analysis" });
    expect(committed[0]?.templateId).toBe("llm:analysis");
  });

  it("falls back to template speech when brain generation fails", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const bot = player({ playerId: "b1", nickname: "Bot", role: "Villager", isBot: true });
    const r = room([bot, player({ playerId: "p1", nickname: "P1", role: "Villager" })]);
    const brain = {
      generateSpeech: vi.fn().mockResolvedValue({ ok: false, reason: "llm_failed", error: "disabled" })
    } as unknown as BotBrainController;
    const { engine, emitted, committed } = makeEngine(r, brain);

    engine.onPhaseAdvanced(r);
    await vi.runAllTimersAsync();

    expect(emitted).toHaveLength(1);
    expect((emitted[0] as { message?: string }).message).not.toBe("LLM mesajı kısa kaldı.");
    expect(committed[0]?.templateId).not.toMatch(/^llm:/);
  });
});
