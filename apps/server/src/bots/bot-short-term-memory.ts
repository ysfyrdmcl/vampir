export type BotShortTermMemoryEntryType = "dialogue" | "event" | "observation" | "action";

export type BotShortTermMemoryEmotion = "neutral" | "suspicious" | "afraid" | "amused" | "confident";

export type BotShortTermMemoryEntry = {
  timestamp: number;
  type: BotShortTermMemoryEntryType;
  actorPlayerId?: string;
  targetPlayerId?: string;
  content: string;
  emotion?: BotShortTermMemoryEmotion;
  importance: number;
};

export type BotShortTermMemoryOptions = {
  maxEntries?: number;
  longTermImportanceThreshold?: number;
  log?: BotMemoryLogger;
};

const DEFAULT_MAX_ENTRIES = 20;
const DEFAULT_LONG_TERM_IMPORTANCE_THRESHOLD = 7;
const KEY_SEP = "\u001e";
const noopLog: BotMemoryLogger = { info: () => undefined };

export interface BotMemoryLogger {
  info(payload: object, message?: string): void;
}

function storeKey(roomCode: string, botPlayerId: string): string {
  return `${roomCode}${KEY_SEP}${botPlayerId}`;
}

export class BotShortTermMemoryStore {
  private readonly maxEntries: number;
  private readonly longTermImportanceThreshold: number;
  private readonly log: BotMemoryLogger;
  private readonly map = new Map<string, BotShortTermMemoryEntry[]>();
  private readonly longTermCandidates = new Map<string, BotShortTermMemoryEntry[]>();

  constructor(options: BotShortTermMemoryOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.longTermImportanceThreshold = options.longTermImportanceThreshold ?? DEFAULT_LONG_TERM_IMPORTANCE_THRESHOLD;
    this.log = options.log ?? noopLog;
    if (!Number.isInteger(this.maxEntries) || this.maxEntries < 1) {
      throw new Error("INVALID_SHORT_TERM_MEMORY_MAX_ENTRIES");
    }
    if (!Number.isFinite(this.longTermImportanceThreshold)) {
      throw new Error("INVALID_SHORT_TERM_MEMORY_THRESHOLD");
    }
  }

  add(roomCode: string, botPlayerId: string, entry: BotShortTermMemoryEntry): void {
    const normalized = this.normalizeEntry(entry);
    const key = storeKey(roomCode, botPlayerId);
    const entries = this.map.get(key) ?? [];
    entries.push(normalized);

    while (entries.length > this.maxEntries) {
      const evicted = entries.shift();
      if (evicted && this.shouldPromote(evicted)) {
        this.pushLongTermCandidate(key, evicted);
      }
    }

    this.map.set(key, entries);
    this.log.info(
      {
        roomCode,
        botPlayerId,
        type: normalized.type,
        importance: normalized.importance,
        contentLength: normalized.content.length,
        entryCount: entries.length
      },
      "bot.memory.short.add"
    );
  }

  get(roomCode: string, botPlayerId: string): BotShortTermMemoryEntry[] {
    return [...(this.map.get(storeKey(roomCode, botPlayerId)) ?? [])];
  }

  drainLongTermCandidates(roomCode: string, botPlayerId: string): BotShortTermMemoryEntry[] {
    const key = storeKey(roomCode, botPlayerId);
    const candidates = this.longTermCandidates.get(key) ?? [];
    this.longTermCandidates.delete(key);
    this.log.info({ roomCode, botPlayerId, candidateCount: candidates.length }, "bot.memory.short.drain_long_term_candidates");
    return [...candidates];
  }

  renderContext(roomCode: string, botPlayerId: string, maxEntries = 8): string {
    return this.get(roomCode, botPlayerId)
      .slice(-maxEntries)
      .map((entry) => {
        const target = entry.targetPlayerId ? ` -> ${entry.targetPlayerId}` : "";
        return `[${entry.type}${target}] ${entry.content}`;
      })
      .join("\n");
  }

  clearRoom(roomCode: string): void {
    const prefix = `${roomCode}${KEY_SEP}`;
    let removedEntries = 0;
    let removedCandidates = 0;
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) {
        removedEntries += this.map.get(key)?.length ?? 0;
        this.map.delete(key);
      }
    }
    for (const key of [...this.longTermCandidates.keys()]) {
      if (key.startsWith(prefix)) {
        removedCandidates += this.longTermCandidates.get(key)?.length ?? 0;
        this.longTermCandidates.delete(key);
      }
    }
    this.log.info({ roomCode, removedEntries, removedCandidates }, "bot.memory.short.clear_room");
  }

  removeBot(roomCode: string, botPlayerId: string): void {
    const key = storeKey(roomCode, botPlayerId);
    const removedEntries = this.map.get(key)?.length ?? 0;
    const removedCandidates = this.longTermCandidates.get(key)?.length ?? 0;
    this.map.delete(key);
    this.longTermCandidates.delete(key);
    this.log.info({ roomCode, botPlayerId, removedEntries, removedCandidates }, "bot.memory.short.remove_bot");
  }

  private normalizeEntry(entry: BotShortTermMemoryEntry): BotShortTermMemoryEntry {
    return {
      ...entry,
      content: entry.content.replace(/\s+/g, " ").trim().slice(0, 240),
      importance: Math.max(1, Math.min(10, Math.round(entry.importance)))
    };
  }

  private shouldPromote(entry: BotShortTermMemoryEntry): boolean {
    return entry.importance >= this.longTermImportanceThreshold;
  }

  private pushLongTermCandidate(key: string, entry: BotShortTermMemoryEntry): void {
    const candidates = this.longTermCandidates.get(key) ?? [];
    candidates.push(entry);
    this.longTermCandidates.set(key, candidates);
    const [roomCode, botPlayerId] = key.split(KEY_SEP);
    this.log.info(
      {
        roomCode,
        botPlayerId,
        type: entry.type,
        importance: entry.importance,
        contentLength: entry.content.length,
        candidateCount: candidates.length
      },
      "bot.memory.short.promote_candidate"
    );
  }
}
