import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BotLLMClient, BotLLMChatRequest, BotLLMChatResult, BotEmbeddingResult } from "../src/bots/bot-llm-client.js";
import { BotEmbeddingStore, cosineSimilarity } from "../src/bots/bot-embedding-store.js";
import { BotLongTermMemory } from "../src/bots/bot-long-term-memory.js";

describe("BotEmbeddingStore", () => {
  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("recalls topK memories by vector similarity", () => {
    const store = new BotEmbeddingStore();
    store.add(memory("m1", [1, 0], "vampir supheli"));
    store.add(memory("m2", [0, 1], "doktor guvenilir"));
    store.add(memory("m3", [0.8, 0.2], "oy dagildi"));

    const results = store.recall({ roomCode: "R1", botPlayerId: "b1", queryEmbedding: [1, 0], topK: 2 });
    expect(results.map((result) => result.id)).toEqual(["m1", "m3"]);
  });

  it("prunes least important memories per bot", () => {
    const store = new BotEmbeddingStore(2);
    store.add(memory("low", [1], "dusuk", 1));
    store.add(memory("high", [1], "yuksek", 9));
    store.add(memory("mid", [1], "orta", 5));

    expect(store.list("R1", "b1").map((entry) => entry.id).sort()).toEqual(["high", "mid"]);
  });

  it("persists embedding memories to JSON and reloads them", () => {
    const dir = mkdtempSync(join(tmpdir(), "bot-memory-"));
    const filePath = join(dir, "embeddings.json");
    try {
      const store = new BotEmbeddingStore(200, undefined, { filePath });
      store.add(memory("m1", [1, 0], "kalici ani", 8));

      expect(JSON.parse(readFileSync(filePath, "utf8"))).toHaveLength(1);

      const reloaded = new BotEmbeddingStore(200, undefined, { filePath });
      expect(reloaded.list("R1", "b1")[0]?.content).toBe("kalici ani");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("BotLongTermMemory", () => {
  it("stores memory with an embedding and recalls relevant entries", async () => {
    const llm = fakeLLM({
      "p2 fazla sessiz": [1, 0],
      "p3 guven verdi": [0, 1],
      "sessiz oyuncu": [1, 0]
    });
    const memory = new BotLongTermMemory({ llm, idFactory: sequenceIds(["a", "b"]) });

    await expect(
      memory.storeMemory({ roomCode: "R1", botPlayerId: "b1", content: "p2 fazla sessiz", importance: 8, tags: ["Suspicion"] })
    ).resolves.toMatchObject({ ok: true, entry: { id: "a", content: "p2 fazla sessiz", importance: 8, tags: ["suspicion"] } });
    await memory.storeMemory({ roomCode: "R1", botPlayerId: "b1", content: "p3 guven verdi", importance: 4 });

    const recalled = await memory.recall({ roomCode: "R1", botPlayerId: "b1", query: "sessiz oyuncu", topK: 1 });
    expect(recalled.ok).toBe(true);
    if (recalled.ok) {
      expect(recalled.memories[0]?.content).toBe("p2 fazla sessiz");
      expect(memory.renderRecallContext(recalled.memories)).toBe("[Ani:8/10] p2 fazla sessiz");
    }
  });

  it("keeps bot-specific recall isolated unless global memories are requested", async () => {
    const llm = fakeLLM({ shared: [1], query: [1] });
    const memory = new BotLongTermMemory({ llm, idFactory: sequenceIds(["a", "b"]) });
    await memory.storeMemory({ roomCode: "R1", botPlayerId: "b1", content: "shared", importance: 5 });
    await memory.storeMemory({ roomCode: "R1", botPlayerId: "b2", content: "shared", importance: 5, tags: ["global"] });

    const ownOnly = await memory.recall({ roomCode: "R1", botPlayerId: "b1", query: "query", includeGlobal: false });
    const withGlobal = await memory.recall({ roomCode: "R1", botPlayerId: "b1", query: "query", includeGlobal: true });

    expect(ownOnly.ok && ownOnly.memories.map((m) => m.id)).toEqual(["a"]);
    expect(withGlobal.ok && withGlobal.memories.map((m) => m.id).sort()).toEqual(["a", "b"]);
  });

  it("returns a controlled failure when embedding fails", async () => {
    const llm = fakeLLM({}, { ok: false, reason: "provider_error", error: "network" });
    const memory = new BotLongTermMemory({ llm });

    await expect(memory.storeMemory({ roomCode: "R1", botPlayerId: "b1", content: "x", importance: 5 })).resolves.toEqual({
      ok: false,
      reason: "embedding_failed",
      error: "network"
    });
  });

  it("logs long-term store and recall metadata", async () => {
    const logs: { level: "info" | "warn"; payload: object; message?: string }[] = [];
    const llm = fakeLLM({ "gizli icerik": [1, 0], query: [1, 0] });
    const memory = new BotLongTermMemory({
      llm,
      idFactory: sequenceIds(["m1"]),
      log: {
        info: (payload, message) => logs.push({ level: "info", payload, message }),
        warn: (payload, message) => logs.push({ level: "warn", payload, message })
      }
    });

    await memory.storeMemory({ roomCode: "R1", botPlayerId: "b1", content: "gizli icerik", importance: 7, tags: ["vote"] });
    await memory.recall({ roomCode: "R1", botPlayerId: "b1", query: "query" });

    expect(logs.map((log) => log.message)).toContain("bot.memory.long.store");
    expect(logs.map((log) => log.message)).toContain("bot.memory.long.recall");
    expect(logs.some((log) => JSON.stringify(log.payload).includes("gizli icerik"))).toBe(false);
  });
});

function memory(id: string, embedding: number[], content: string, importance = 5) {
  return {
    id,
    roomCode: "R1",
    botPlayerId: "b1",
    content,
    embedding,
    importance,
    tags: [],
    createdAt: 1
  };
}

function fakeLLM(vectors: Record<string, number[]>, fallback?: BotEmbeddingResult): BotLLMClient {
  return {
    async chat(_request: BotLLMChatRequest): Promise<BotLLMChatResult> {
      return { ok: false, reason: "disabled" };
    },
    async embed(input: string): Promise<BotEmbeddingResult> {
      return vectors[input] ? { ok: true, embedding: vectors[input], model: "fake" } : fallback ?? { ok: true, embedding: [0], model: "fake" };
    }
  };
}

function sequenceIds(ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] ?? `id-${index}`;
}
