import { describe, expect, it } from "vitest";
import { BotMemoryStore } from "../src/bots/bot-memory.js";
import { NO_LYNCH_TARGET } from "../src/bots/bot-types.js";

describe("BotMemoryStore", () => {
  it("tracks doctor protect and day vote in memory", () => {
    const store = new BotMemoryStore();
    store.onBotActionSubmitted(
      "R1",
      "b1",
      { roomCode: "R1", actionType: "doctor-protect", targetPlayerId: "p2", phase: "DoctorProtect", round: 1 },
      "p2"
    );
    expect(store.get("R1", "b1").lastProtectedPlayerId).toBe("p2");
    expect(store.get("R1", "b1").trustByPlayerId.p2).toBe(2);

    store.onBotActionSubmitted(
      "R1",
      "b1",
      { roomCode: "R1", actionType: "day-vote", targetPlayerId: "p3", phase: "DayVote", round: 1 },
      "p3"
    );
    expect(store.get("R1", "b1").lastVotedPlayerId).toBe("p3");
    expect(store.get("R1", "b1").suspicionByPlayerId.p3).toBe(2);
  });

  it("does not set lastVotedPlayerId for no-lynch", () => {
    const store = new BotMemoryStore();
    store.onBotActionSubmitted(
      "R1",
      "b1",
      { roomCode: "R1", actionType: "day-vote", targetPlayerId: NO_LYNCH_TARGET, phase: "DayVote", round: 1 },
      NO_LYNCH_TARGET
    );
    expect(store.get("R1", "b1").lastVotedPlayerId).toBeUndefined();
  });

  it("applyDetectivePrivateResult updates known lists and inspected ids", () => {
    const store = new BotMemoryStore();
    store.applyDetectivePrivateResult("R1", "det", "t1", "Vampire");
    const m = store.get("R1", "det");
    expect(m.knownVampires).toContain("t1");
    expect(m.inspectedPlayerIds).toContain("t1");
    store.applyDetectivePrivateResult("R1", "det", "t2", "NotVampire");
    expect(m.knownNonVampires).toContain("t2");
    expect(m.inspectedPlayerIds).toEqual(expect.arrayContaining(["t1", "t2"]));
  });

  it("clearRoom removes all bot keys for that room", () => {
    const store = new BotMemoryStore();
    store.get("RC", "a").suspicionByPlayerId.z = 9;
    store.get("RD", "a").suspicionByPlayerId.keep = 1;
    store.clearRoom("RC");
    expect(store.get("RC", "a").suspicionByPlayerId.z).toBeUndefined();
    expect(store.get("RD", "a").suspicionByPlayerId.keep).toBe(1);
  });

  it("onBotSpeech increments counts and suspicion/trust", () => {
    const store = new BotMemoryStore();
    store.onBotSpeech("R1", "b1", "accuse_soft", "p9");
    expect(store.get("R1", "b1").speechCountThisDay).toBe(1);
    expect(store.get("R1", "b1").speechCountThisPhase).toBe(1);
    expect(store.get("R1", "b1").suspicionByPlayerId.p9).toBe(1);
    store.onBotSpeech("R1", "b1", "support_soft", "p9");
    expect(store.get("R1", "b1").trustByPlayerId.p9).toBe(1);
  });

  it("onBotSpeech vote_hint does not bump suspicion", () => {
    const store = new BotMemoryStore();
    store.onBotSpeech("R1", "b1", "vote_hint", "p9");
    expect(store.get("R1", "b1").suspicionByPlayerId.p9).toBeUndefined();
  });

  it("onPhaseAdvanced resets speechCountThisPhase when phase tag changes", () => {
    const store = new BotMemoryStore();
    store.onBotSpeech("R1", "b1", "accuse_soft", "p1");
    expect(store.get("R1", "b1").speechCountThisPhase).toBe(1);
    store.onPhaseAdvanced({
      roomCode: "R1",
      players: [{ playerId: "b1", isBot: true }],
      game: { phase: "DayDiscussion", round: 1 }
    });
    expect(store.get("R1", "b1").speechCountThisPhase).toBe(0);
    expect(store.get("R1", "b1").lastSpeechPhaseId).toBe("DayDiscussion:1");
  });

  it("detective-inspect submit records inspected target", () => {
    const store = new BotMemoryStore();
    store.onBotActionSubmitted(
      "R1",
      "det",
      { roomCode: "R1", actionType: "detective-inspect", targetPlayerId: "x", phase: "DetectiveInspect", round: 1 },
      "x"
    );
    expect(store.get("R1", "det").inspectedPlayerIds).toContain("x");
  });
});
