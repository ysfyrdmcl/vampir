import type { BotLLMClient } from "./bot-llm-client.js";
import { BotEmbeddingStore, type BotEmbeddingMemoryEntry, type BotEmbeddingRecallResult } from "./bot-embedding-store.js";

export interface BotLongTermMemoryLogger {
  info(payload: object, message?: string): void;
  warn(payload: object, message?: string): void;
}

const noopLog: BotLongTermMemoryLogger = {
  info: () => undefined,
  warn: () => undefined
};

export type BotLongTermMemoryStoreRequest = {
  roomCode: string;
  botPlayerId: string;
  content: string;
  importance: number;
  tags?: string[];
  createdAt?: number;
  expiresAt?: number;
};

export type BotLongTermMemoryStoreResult =
  | { ok: true; entry: BotEmbeddingMemoryEntry }
  | { ok: false; reason: "empty_content" | "embedding_failed"; error?: string };

export type BotLongTermMemoryRecallResult =
  | { ok: true; memories: BotEmbeddingRecallResult[] }
  | { ok: false; reason: "empty_query" | "embedding_failed"; error?: string };

export class BotLongTermMemory {
  constructor(
    private readonly deps: {
      llm: BotLLMClient;
      store?: BotEmbeddingStore;
      idFactory?: () => string;
      log?: BotLongTermMemoryLogger;
    }
  ) {}

  private get store(): BotEmbeddingStore {
    if (!this.deps.store) {
      this.deps.store = new BotEmbeddingStore();
    }
    return this.deps.store;
  }

  async storeMemory(request: BotLongTermMemoryStoreRequest): Promise<BotLongTermMemoryStoreResult> {
    const content = normalizeContent(request.content);
    if (!content) {
      this.getLog().warn({ roomCode: request.roomCode, botPlayerId: request.botPlayerId }, "bot.memory.long.store.empty_content");
      return { ok: false, reason: "empty_content" };
    }

    const embedding = await this.deps.llm.embed(content);
    if (!embedding.ok) {
      this.getLog().warn(
        { roomCode: request.roomCode, botPlayerId: request.botPlayerId, reason: embedding.reason },
        "bot.memory.long.store.embedding_failed"
      );
      return { ok: false, reason: "embedding_failed", error: embedding.error ?? embedding.reason };
    }

    const entry: BotEmbeddingMemoryEntry = {
      id: this.deps.idFactory?.() ?? randomMemoryId(),
      roomCode: request.roomCode,
      botPlayerId: request.botPlayerId,
      content,
      embedding: embedding.embedding,
      importance: clampImportance(request.importance),
      tags: normalizeTags(request.tags ?? []),
      createdAt: request.createdAt ?? Date.now(),
      expiresAt: request.expiresAt
    };
    this.store.add(entry);
    this.getLog().info(
      {
        roomCode: entry.roomCode,
        botPlayerId: entry.botPlayerId,
        memoryId: entry.id,
        importance: entry.importance,
        tagCount: entry.tags.length,
        contentLength: entry.content.length,
        embeddingDimensions: entry.embedding.length
      },
      "bot.memory.long.store"
    );
    return { ok: true, entry };
  }

  async recall(options: {
    roomCode: string;
    botPlayerId: string;
    query: string;
    topK?: number;
    includeGlobal?: boolean;
    now?: number;
  }): Promise<BotLongTermMemoryRecallResult> {
    const query = normalizeContent(options.query);
    if (!query) {
      this.getLog().warn({ roomCode: options.roomCode, botPlayerId: options.botPlayerId }, "bot.memory.long.recall.empty_query");
      return { ok: false, reason: "empty_query" };
    }

    const embedding = await this.deps.llm.embed(query);
    if (!embedding.ok) {
      this.getLog().warn(
        { roomCode: options.roomCode, botPlayerId: options.botPlayerId, reason: embedding.reason },
        "bot.memory.long.recall.embedding_failed"
      );
      return { ok: false, reason: "embedding_failed", error: embedding.error ?? embedding.reason };
    }

    const memories = this.store.recall({
      roomCode: options.roomCode,
      botPlayerId: options.botPlayerId,
      queryEmbedding: embedding.embedding,
      topK: options.topK,
      includeGlobal: options.includeGlobal,
      now: options.now
    });
    this.getLog().info(
      {
        roomCode: options.roomCode,
        botPlayerId: options.botPlayerId,
        topK: options.topK ?? 3,
        includeGlobal: Boolean(options.includeGlobal),
        queryLength: query.length,
        resultCount: memories.length,
        topScore: memories[0]?.score
      },
      "bot.memory.long.recall"
    );

    return { ok: true, memories };
  }

  renderRecallContext(memories: readonly BotEmbeddingRecallResult[]): string {
    return memories.map((memory) => `[Ani:${memory.importance}/10] ${memory.content}`).join("\n");
  }

  clearRoom(roomCode: string): void {
    this.store.clearRoom(roomCode);
  }

  removeBot(roomCode: string, botPlayerId: string): void {
    this.store.removeBot(roomCode, botPlayerId);
  }

  private getLog(): BotLongTermMemoryLogger {
    return this.deps.log ?? noopLog;
  }
}

function normalizeContent(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 240);
}

function clampImportance(importance: number): number {
  return Math.max(1, Math.min(10, Math.round(importance)));
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 12);
}

function randomMemoryId(): string {
  return `mem_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}
