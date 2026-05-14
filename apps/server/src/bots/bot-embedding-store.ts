import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type BotEmbeddingMemoryEntry = {
  id: string;
  roomCode: string;
  botPlayerId: string;
  content: string;
  embedding: number[];
  importance: number;
  tags: string[];
  createdAt: number;
  expiresAt?: number;
};

export type BotEmbeddingRecallResult = BotEmbeddingMemoryEntry & {
  score: number;
};

export interface BotEmbeddingStoreLogger {
  info(payload: object, message?: string): void;
  warn?(payload: object, message?: string): void;
}

const noopLog: BotEmbeddingStoreLogger = { info: () => undefined };

export type BotEmbeddingStorePersistence = {
  filePath: string;
};

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class BotEmbeddingStore {
  private readonly entries: BotEmbeddingMemoryEntry[] = [];

  constructor(
    private readonly maxEntriesPerBot = 200,
    private readonly log: BotEmbeddingStoreLogger = noopLog,
    private readonly persistence?: BotEmbeddingStorePersistence
  ) {
    if (!Number.isInteger(maxEntriesPerBot) || maxEntriesPerBot < 1) {
      throw new Error("INVALID_EMBEDDING_STORE_LIMIT");
    }
    this.loadFromDisk();
  }

  add(entry: BotEmbeddingMemoryEntry): void {
    this.entries.push(entry);
    this.pruneBot(entry.roomCode, entry.botPlayerId);
    this.persist();
    this.log.info(
      {
        roomCode: entry.roomCode,
        botPlayerId: entry.botPlayerId,
        memoryId: entry.id,
        importance: entry.importance,
        tagCount: entry.tags.length,
        embeddingDimensions: entry.embedding.length,
        totalForBot: this.list(entry.roomCode, entry.botPlayerId).length
      },
      "bot.memory.embedding.add"
    );
  }

  recall(options: {
    roomCode: string;
    botPlayerId: string;
    queryEmbedding: number[];
    topK?: number;
    includeGlobal?: boolean;
    now?: number;
  }): BotEmbeddingRecallResult[] {
    const topK = options.topK ?? 3;
    const now = options.now ?? Date.now();
    const results = this.entries
      .filter((entry) => entry.roomCode === options.roomCode)
      .filter((entry) => entry.botPlayerId === options.botPlayerId || (options.includeGlobal && entry.tags.includes("global")))
      .filter((entry) => !entry.expiresAt || entry.expiresAt > now)
      .map((entry) => ({ ...entry, score: cosineSimilarity(options.queryEmbedding, entry.embedding) }))
      .sort((a, b) => b.score - a.score || b.importance - a.importance || b.createdAt - a.createdAt)
      .slice(0, Math.max(0, topK));
    this.log.info(
      {
        roomCode: options.roomCode,
        botPlayerId: options.botPlayerId,
        topK,
        includeGlobal: Boolean(options.includeGlobal),
        resultCount: results.length,
        topScore: results[0]?.score
      },
      "bot.memory.embedding.recall"
    );
    return results;
  }

  list(roomCode: string, botPlayerId: string): BotEmbeddingMemoryEntry[] {
    return this.entries.filter((entry) => entry.roomCode === roomCode && entry.botPlayerId === botPlayerId);
  }

  clearRoom(roomCode: string): void {
    let removed = 0;
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      if (this.entries[i]?.roomCode === roomCode) {
        this.entries.splice(i, 1);
        removed += 1;
      }
    }
    this.log.info({ roomCode, removed }, "bot.memory.embedding.clear_room");
    if (removed > 0) this.persist();
  }

  removeBot(roomCode: string, botPlayerId: string): void {
    let removed = 0;
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const entry = this.entries[i];
      if (entry?.roomCode === roomCode && entry.botPlayerId === botPlayerId) {
        this.entries.splice(i, 1);
        removed += 1;
      }
    }
    this.log.info({ roomCode, botPlayerId, removed }, "bot.memory.embedding.remove_bot");
    if (removed > 0) this.persist();
  }

  private pruneBot(roomCode: string, botPlayerId: string): void {
    const botEntries = this.list(roomCode, botPlayerId);
    if (botEntries.length <= this.maxEntriesPerBot) return;
    const toRemove = botEntries
      .sort((a, b) => a.importance - b.importance || a.createdAt - b.createdAt)
      .slice(0, botEntries.length - this.maxEntriesPerBot);
    const removeIds = new Set(toRemove.map((entry) => entry.id));
    let removed = 0;
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const id = this.entries[i]?.id;
      if (id && removeIds.has(id)) {
        this.entries.splice(i, 1);
        removed += 1;
      }
    }
    this.log.info({ roomCode, botPlayerId, removed, maxEntriesPerBot: this.maxEntriesPerBot }, "bot.memory.embedding.prune_bot");
    if (removed > 0) this.persist();
  }

  private loadFromDisk(): void {
    if (!this.persistence) return;
    const filePath = this.persistence.filePath;
    if (!existsSync(filePath)) {
      this.log.info({ filePath }, "bot.memory.embedding.persist.no_file");
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      const entries = parsed.filter(isPersistedEntry);
      this.entries.splice(0, this.entries.length, ...entries);
      this.log.info({ filePath, entryCount: entries.length }, "bot.memory.embedding.persist.loaded");
    } catch (error) {
      this.log.warn?.({ filePath, err: error }, "bot.memory.embedding.persist.load_failed");
    }
  }

  private persist(): void {
    if (!this.persistence) return;
    const filePath = this.persistence.filePath;
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      const tmpPath = `${filePath}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(this.entries, null, 2));
      renameSync(tmpPath, filePath);
      this.log.info({ filePath, entryCount: this.entries.length }, "bot.memory.embedding.persist.saved");
    } catch (error) {
      this.log.warn?.({ filePath, err: error }, "bot.memory.embedding.persist.save_failed");
    }
  }
}

function isPersistedEntry(value: unknown): value is BotEmbeddingMemoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.roomCode === "string" &&
    typeof record.botPlayerId === "string" &&
    typeof record.content === "string" &&
    Array.isArray(record.embedding) &&
    record.embedding.every((x) => typeof x === "number") &&
    typeof record.importance === "number" &&
    Array.isArray(record.tags) &&
    record.tags.every((x) => typeof x === "string") &&
    typeof record.createdAt === "number" &&
    (record.expiresAt === undefined || typeof record.expiresAt === "number")
  );
}
