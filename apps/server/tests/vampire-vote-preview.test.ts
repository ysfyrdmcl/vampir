import { describe, expect, it } from "vitest";
import { buildVampireVotePreview, vampirePreviewRecipientSocketIds } from "../src/game/vampire-vote-preview.js";
import type { GameState, PlayerState, RoomState } from "../src/game/game-types.js";

const baseRules = {
  firstNightNoKill: false,
  revealEliminatedRole: false,
  allowDoctorSelfProtect: true,
  allowDoctorConsecutiveProtectSameTarget: false,
  tiePolicy: "RevoteThenNoExecution" as const,
  noLynchEnabled: false,
  mayorEnabled: false,
  loversEnabled: false
};

function player(p: Partial<PlayerState> & Pick<PlayerState, "playerId" | "nickname">): PlayerState {
  return {
    deviceId: p.deviceId ?? `d-${p.playerId}`,
    sessionToken: p.sessionToken ?? `s-${p.playerId}`,
    socketId: p.socketId ?? "",
    isConnected: p.isConnected ?? true,
    isReady: p.isReady ?? false,
    isAlive: p.isAlive ?? true,
    role: p.role ?? "Villager",
    lastProtectedRound: p.lastProtectedRound ?? null,
    lastProtectedTargetPlayerId: p.lastProtectedTargetPlayerId ?? null,
    guardUsedInGame: p.guardUsedInGame ?? false,
    isBot: p.isBot ?? false,
    ...p
  };
}

function baseGame(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "VampireVote",
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
    rules: baseRules,
    loverLinks: {},
    detectiveInspectedTargets: {},
    phaseDurations: {
      roleReveal: 8,
      nightStart: 4,
      vampireVote: 20,
      detectiveInspect: 20,
      doctorProtect: 20,
      dayStart: 8,
      dayDiscussion: 60,
      dayVote: 30
    },
    ...overrides
  };
}

function roomWith(players: PlayerState[], game: GameState): RoomState {
  return {
    roomCode: "TEST",
    status: "InGame",
    hostPlayerId: players[0]?.playerId ?? "h1",
    players,
    game,
    createdAt: 0,
    lastActivityAt: 0,
    cleanupAt: null
  };
}

describe("vampirePreviewRecipientSocketIds", () => {
  it("includes only living human vampires with a socket", () => {
    const players = [
      player({ playerId: "v1", nickname: "V1", role: "Vampire", socketId: "sock-v1" }),
      player({ playerId: "v2", nickname: "V2", role: "Vampire", isBot: true, socketId: "" }),
      player({ playerId: "c1", nickname: "Köylü", role: "Villager", socketId: "sock-c1" })
    ];
    const r = roomWith(players, baseGame());
    expect(vampirePreviewRecipientSocketIds(r).sort()).toEqual(["sock-v1"]);
  });

  it("excludes dead vampires even with socket", () => {
    const players = [
      player({ playerId: "v1", nickname: "V1", role: "Vampire", socketId: "sock-v1", isAlive: false }),
      player({ playerId: "v2", nickname: "V2", role: "Vampire", socketId: "sock-v2" })
    ];
    const r = roomWith(players, baseGame());
    expect(vampirePreviewRecipientSocketIds(r).sort()).toEqual(["sock-v2"]);
  });
});

describe("buildVampireVotePreview", () => {
  it("lists all living vampires with pending when no votes", () => {
    const players = [
      player({ playerId: "v1", nickname: "Kont Drakula", role: "Vampire", socketId: "sock-v1" }),
      player({ playerId: "v2", nickname: "Karanlık Yolcu", role: "Vampire", isBot: true }),
      player({ playerId: "c1", nickname: "Yusuf", role: "Villager" })
    ];
    const r = roomWith(players, baseGame({ actions: [] }));
    const p = buildVampireVotePreview(r);
    expect(p.round).toBe(1);
    expect(p.votes).toHaveLength(2);
    expect(p.votes.map((x) => x.voterName)).toEqual(["Kont Drakula", "Karanlık Yolcu"]);
    expect(p.votes[0].targetPlayerId).toBeUndefined();
    expect(p.votes[1].isBot).toBe(true);
    expect(p.pendingVoterPlayerIds.sort()).toEqual(["v1", "v2"].sort());
    expect(p.targetCounts).toEqual([]);
  });

  it("includes human and bot vampire targets and aggregates targetCounts", () => {
    const players = [
      player({ playerId: "v1", nickname: "Kont Drakula", role: "Vampire", socketId: "sock-v1" }),
      player({ playerId: "v2", nickname: "Bot V", role: "Vampire", isBot: true }),
      player({ playerId: "c1", nickname: "Yusuf", role: "Villager" })
    ];
    const actions = [
      { actorPlayerId: "v1", actionType: "vampire-target" as const, targetPlayerId: "c1", round: 1 },
      { actorPlayerId: "v2", actionType: "vampire-target" as const, targetPlayerId: "c1", round: 1 }
    ];
    const r = roomWith(players, baseGame({ actions }));
    const p = buildVampireVotePreview(r);
    expect(p.pendingVoterPlayerIds).toEqual([]);
    const v1 = p.votes.find((x) => x.voterPlayerId === "v1");
    const v2 = p.votes.find((x) => x.voterPlayerId === "v2");
    expect(v1?.targetPlayerId).toBe("c1");
    expect(v1?.targetName).toBe("Yusuf");
    expect(v2?.targetPlayerId).toBe("c1");
    expect(v2?.isBot).toBe(true);
    expect(p.targetCounts).toEqual([{ targetPlayerId: "c1", targetName: "Yusuf", count: 2 }]);
  });

  it("uses latest vampire-target when human changes target", () => {
    const players = [
      player({ playerId: "v1", nickname: "Vamp", role: "Vampire", socketId: "sock-v1" }),
      player({ playerId: "c1", nickname: "A", role: "Villager" }),
      player({ playerId: "c2", nickname: "B", role: "Villager" })
    ];
    const actions = [
      { actorPlayerId: "v1", actionType: "vampire-target" as const, targetPlayerId: "c1", round: 1 },
      { actorPlayerId: "v1", actionType: "vampire-target" as const, targetPlayerId: "c2", round: 1 }
    ];
    const r = roomWith(players, baseGame({ actions }));
    const p = buildVampireVotePreview(r);
    expect(p.votes[0].targetPlayerId).toBe("c2");
    expect(p.votes[0].targetName).toBe("B");
    expect(p.targetCounts).toEqual([{ targetPlayerId: "c2", targetName: "B", count: 1 }]);
  });

  it("ignores vampire-target actions from wrong round", () => {
    const players = [
      player({ playerId: "v1", nickname: "Vamp", role: "Vampire", socketId: "sock-v1" }),
      player({ playerId: "c1", nickname: "A", role: "Villager" })
    ];
    const actions = [{ actorPlayerId: "v1", actionType: "vampire-target" as const, targetPlayerId: "c1", round: 2 }];
    const r = roomWith(players, baseGame({ actions, round: 1 }));
    const p = buildVampireVotePreview(r);
    expect(p.pendingVoterPlayerIds).toEqual(["v1"]);
  });
});
