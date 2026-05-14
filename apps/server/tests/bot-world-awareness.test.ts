import { resolveRuleSettings, type Role } from "@vampir-koylu/shared";
import { describe, expect, it } from "vitest";
import { createEmptyBotMemory } from "../src/bots/bot-memory.js";
import { buildBotWorldAwareness, renderBotWorldAwarenessPrompt } from "../src/bots/bot-world-awareness.js";
import type { PlayerState, RoomState } from "../src/game/game-types.js";

function player(id: string, role: Role, isBot = true): PlayerState {
  return {
    playerId: id,
    nickname: id.toUpperCase(),
    deviceId: `d-${id}`,
    sessionToken: `s-${id}`,
    socketId: isBot ? "" : `sk-${id}`,
    isConnected: true,
    isReady: true,
    isAlive: true,
    role,
    lastProtectedRound: null,
    lastProtectedTargetPlayerId: null,
    guardUsedInGame: false,
    isBot
  };
}

function room(players: PlayerState[], overrides: Partial<RoomState["game"]> = {}): RoomState {
  const rules = resolveRuleSettings("Classic");
  const { rules: overrideRules, ...restOverrides } = overrides;
  return {
    roomCode: "R1",
    status: "InGame",
    hostPlayerId: players[0]?.playerId ?? "p1",
    players,
    game: {
      phase: "DayVote",
      round: 2,
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
      rules: overrideRules ?? rules,
      loverLinks: {},
      detectiveInspectedTargets: {},
      phaseDurations: {
        roleReveal: 1,
        nightStart: 1,
        vampireVote: 1,
        detectiveInspect: 1,
        doctorProtect: 1,
        nightResolve: 1,
        dayStart: 1,
        mayorElection: 1,
        guardProtect: 1,
        dayDiscussion: 1,
        dayVote: 1,
        executionResolve: 1,
        hunterLastBreath: 1,
        winCheck: 1
      },
      ...restOverrides
    },
    createdAt: 0,
    lastActivityAt: 0,
    cleanupAt: null
  };
}

describe("buildBotWorldAwareness", () => {
  it("returns null for non-bot speakers", () => {
    const r = room([player("h", "Villager", false)]);
    expect(buildBotWorldAwareness(r, "h")).toBeNull();
  });

  it("does not leak vampire teammates to non-vampire bots", () => {
    const r = room([player("v1", "Vampire"), player("v2", "Vampire"), player("d1", "Detective")]);
    const world = buildBotWorldAwareness(r, "d1", createEmptyBotMemory());

    expect(world?.privateFacts.join(" ")).toContain("Rolun: Detective");
    expect(world?.privateFacts.join(" ")).not.toContain("Bildigin vampirler");
    expect(world?.privateFacts.join(" ")).not.toContain("V1");
    expect(world?.publicPlayers.find((p) => p.playerId === "v1")).toMatchObject({ nickname: "V1", isAlive: true });
  });

  it("includes vampire teammates only for vampire speakers", () => {
    const r = room([player("v1", "Vampire"), player("v2", "Vampire"), player("h1", "Villager")]);
    const world = buildBotWorldAwareness(r, "v1");

    expect(world?.privateFacts.join(" ")).toContain("Bildigin vampirler: V1 (sen), V2");
  });

  it("includes detective private memory only for the detective bot", () => {
    const memory = createEmptyBotMemory();
    memory.knownVampires.push("v1");
    memory.knownNonVampires.push("h1");
    const r = room([player("d1", "Detective"), player("v1", "Vampire"), player("h1", "Villager")], {
      phase: "DayDiscussion"
    });

    const detectiveWorld = buildBotWorldAwareness(r, "d1", memory);
    const vampireWorld = buildBotWorldAwareness(r, "v1", memory);

    expect(detectiveWorld?.privateFacts.join(" ")).toContain("Dedektif bilgin - vampir: V1");
    expect(detectiveWorld?.privateFacts.join(" ")).toContain("Dedektif bilgin - vampir degil: H1");
    expect(vampireWorld?.privateFacts.join(" ")).not.toContain("Dedektif bilgin");
  });

  it("builds public events and legal action hints", () => {
    const r = room([player("b1", "Villager"), player("h1", "Villager"), player("x1", "Villager")], {
      phase: "DayVote",
      lastEliminationSummary: { source: "Night", playerId: "x1" },
      lastDayVoteSummary: { entries: [{ playerId: "h1", votes: 2 }], executedPlayerId: "h1", tiedTopCandidates: ["h1"] },
      mayorPlayerId: "b1"
    });
    r.players[2].isAlive = false;

    const world = buildBotWorldAwareness(r, "b1");

    expect(world?.publicEvents).toEqual(
      expect.arrayContaining(["Gece elenen oyuncu: X1.", "Son gunduz oylamasinda H1 idam edildi.", "Koy baskani: B1."])
    );
    expect(world?.legalActionHints[0]).toContain("day-vote");
    expect(world?.legalActionHints[0]).toContain("H1");
  });

  it("renders a compact prompt block", () => {
    const r = room([player("b1", "Doctor"), player("h1", "Villager")]);
    const memory = createEmptyBotMemory();
    memory.lastProtectedPlayerId = "h1";
    const world = buildBotWorldAwareness(r, "b1", memory);

    expect(world).not.toBeNull();
    const prompt = renderBotWorldAwarenessPrompt(world!);
    expect(prompt).toContain("Faz: DayVote");
    expect(prompt).toContain("Sana ozel bilgiler:");
    expect(prompt).toContain("Son korudugun oyuncu: H1");
  });
});
