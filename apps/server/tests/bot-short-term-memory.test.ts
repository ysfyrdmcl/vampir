import { describe, expect, it } from "vitest";
import { BotShortTermMemoryStore } from "../src/bots/bot-short-term-memory.js";

describe("BotShortTermMemoryStore", () => {
  it("keeps a sliding window per bot", () => {
    const store = new BotShortTermMemoryStore({ maxEntries: 2 });
    store.add("R1", "b1", { timestamp: 1, type: "event", content: "ilk", importance: 3 });
    store.add("R1", "b1", { timestamp: 2, type: "event", content: "ikinci", importance: 3 });
    store.add("R1", "b1", { timestamp: 3, type: "event", content: "ucuncu", importance: 3 });

    expect(store.get("R1", "b1").map((entry) => entry.content)).toEqual(["ikinci", "ucuncu"]);
  });

  it("keeps bot memories isolated by room and bot", () => {
    const store = new BotShortTermMemoryStore({ maxEntries: 3 });
    store.add("R1", "b1", { timestamp: 1, type: "event", content: "b1", importance: 3 });
    store.add("R1", "b2", { timestamp: 1, type: "event", content: "b2", importance: 3 });
    store.add("R2", "b1", { timestamp: 1, type: "event", content: "r2", importance: 3 });

    expect(store.get("R1", "b1")[0]?.content).toBe("b1");
    expect(store.get("R1", "b2")[0]?.content).toBe("b2");
    expect(store.get("R2", "b1")[0]?.content).toBe("r2");
  });

  it("promotes important evicted entries as long-term candidates", () => {
    const store = new BotShortTermMemoryStore({ maxEntries: 1, longTermImportanceThreshold: 7 });
    store.add("R1", "b1", { timestamp: 1, type: "event", content: "dedektif hedef buldu", importance: 9 });
    store.add("R1", "b1", { timestamp: 2, type: "event", content: "sonraki", importance: 2 });

    const candidates = store.drainLongTermCandidates("R1", "b1");
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.content).toBe("dedektif hedef buldu");
    expect(store.drainLongTermCandidates("R1", "b1")).toEqual([]);
  });

  it("normalizes content and clamps importance", () => {
    const store = new BotShortTermMemoryStore();
    store.add("R1", "b1", {
      timestamp: 1,
      type: "dialogue",
      content: `  ${"x".repeat(300)}  `,
      importance: 99
    });

    const entry = store.get("R1", "b1")[0];
    expect(entry?.content.length).toBe(240);
    expect(entry?.importance).toBe(10);
  });

  it("renders compact context from recent entries", () => {
    const store = new BotShortTermMemoryStore();
    store.add("R1", "b1", { timestamp: 1, type: "observation", content: "Koy sessiz", importance: 3 });
    store.add("R1", "b1", { timestamp: 2, type: "action", targetPlayerId: "p2", content: "p2 oylandi", importance: 5 });

    expect(store.renderContext("R1", "b1")).toBe("[observation] Koy sessiz\n[action -> p2] p2 oylandi");
  });

  it("clears room and bot data", () => {
    const store = new BotShortTermMemoryStore({ maxEntries: 1 });
    store.add("R1", "b1", { timestamp: 1, type: "event", content: "a", importance: 9 });
    store.add("R1", "b1", { timestamp: 2, type: "event", content: "b", importance: 1 });
    store.add("R1", "b2", { timestamp: 1, type: "event", content: "c", importance: 1 });
    store.removeBot("R1", "b1");
    expect(store.get("R1", "b1")).toEqual([]);
    expect(store.drainLongTermCandidates("R1", "b1")).toEqual([]);

    store.clearRoom("R1");
    expect(store.get("R1", "b2")).toEqual([]);
  });

  it("logs add, promote, drain, and cleanup events when logger is provided", () => {
    const logs: { payload: object; message?: string }[] = [];
    const store = new BotShortTermMemoryStore({
      maxEntries: 1,
      log: { info: (payload, message) => logs.push({ payload, message }) }
    });

    store.add("R1", "b1", { timestamp: 1, type: "event", content: "onemli olay", importance: 9 });
    store.add("R1", "b1", { timestamp: 2, type: "event", content: "yeni olay", importance: 2 });
    store.drainLongTermCandidates("R1", "b1");
    store.removeBot("R1", "b1");

    expect(logs.map((log) => log.message)).toEqual([
      "bot.memory.short.add",
      "bot.memory.short.promote_candidate",
      "bot.memory.short.add",
      "bot.memory.short.drain_long_term_candidates",
      "bot.memory.short.remove_bot"
    ]);
  });
});
