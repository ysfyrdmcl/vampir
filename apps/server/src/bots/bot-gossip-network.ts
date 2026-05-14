import type { BotLLMClient } from "./bot-llm-client.js";

export type BotGossip = {
  id: string;
  roomCode: string;
  aboutPlayerId?: string;
  originalFact: string;
  currentRumor: string;
  spreadByBotIds: string[];
  distortion: number;
  tags: string[];
  createdAt: number;
};

export type BotGossipNetworkOptions = {
  maxGossipsPerRoom?: number;
  idFactory?: () => string;
  now?: () => number;
};

const DEFAULT_MAX_GOSSIPS_PER_ROOM = 50;

export class BotGossipNetwork {
  private readonly gossips: BotGossip[] = [];
  private readonly maxGossipsPerRoom: number;
  private readonly idFactory: () => string;
  private readonly now: () => number;

  constructor(
    private readonly deps: { llm?: BotLLMClient } = {},
    options: BotGossipNetworkOptions = {}
  ) {
    this.maxGossipsPerRoom = options.maxGossipsPerRoom ?? DEFAULT_MAX_GOSSIPS_PER_ROOM;
    this.idFactory = options.idFactory ?? (() => `gossip_${Math.random().toString(36).slice(2, 10)}`);
    this.now = options.now ?? Date.now;
  }

  create(roomCode: string, fact: string, options: { aboutPlayerId?: string; tags?: string[]; spreadByBotId?: string } = {}): BotGossip {
    const normalizedFact = normalizeLine(fact);
    const gossip: BotGossip = {
      id: this.idFactory(),
      roomCode,
      aboutPlayerId: options.aboutPlayerId,
      originalFact: normalizedFact,
      currentRumor: normalizedFact,
      spreadByBotIds: options.spreadByBotId ? [options.spreadByBotId] : [],
      distortion: 0,
      tags: normalizeTags(options.tags ?? []),
      createdAt: this.now()
    };
    this.gossips.push(gossip);
    this.pruneRoom(roomCode);
    return gossip;
  }

  list(roomCode: string): BotGossip[] {
    return this.gossips.filter((gossip) => gossip.roomCode === roomCode).map((gossip) => ({ ...gossip, spreadByBotIds: [...gossip.spreadByBotIds], tags: [...gossip.tags] }));
  }

  pickForBot(roomCode: string, botPlayerId: string): BotGossip | null {
    return this.gossips.find((gossip) => gossip.roomCode === roomCode && !gossip.spreadByBotIds.includes(botPlayerId)) ?? null;
  }

  async spread(roomCode: string, gossipId: string, toBotPlayerId: string): Promise<BotGossip | null> {
    const gossip = this.gossips.find((item) => item.roomCode === roomCode && item.id === gossipId);
    if (!gossip) return null;
    if (!gossip.spreadByBotIds.includes(toBotPlayerId)) {
      gossip.spreadByBotIds.push(toBotPlayerId);
    }
    gossip.distortion = Math.min(1, Number((gossip.distortion + 0.1 + Math.random() * 0.2).toFixed(3)));
    if (gossip.distortion > 0.3) {
      gossip.currentRumor = await this.distort(gossip.originalFact, gossip.distortion);
    }
    return { ...gossip, spreadByBotIds: [...gossip.spreadByBotIds], tags: [...gossip.tags] };
  }

  clearRoom(roomCode: string): void {
    for (let i = this.gossips.length - 1; i >= 0; i -= 1) {
      if (this.gossips[i]?.roomCode === roomCode) this.gossips.splice(i, 1);
    }
  }

  private async distort(fact: string, distortion: number): Promise<string> {
    if (!this.deps.llm) return fact;
    const result = await this.deps.llm.chat({
      maxOutputTokens: 200,
      temperature: 0.8,
      messages: [
        {
          role: "developer",
          content: "Vampir Koylu oyununda guvenli bir dedikodu cumlesi uret. Oyun disi referans verme. Tek cumle yaz."
        },
        {
          role: "user",
          content: `Orijinal bilgi: ${fact}\nCarpitma seviyesi: ${Math.round(distortion * 100)}%\nBunu kisa bir koy dedikodusuna cevir.`
        }
      ]
    });
    if (!result.ok) return fact;
    return normalizeLine(result.text).slice(0, 180) || fact;
  }

  private pruneRoom(roomCode: string): void {
    const roomGossips = this.gossips.filter((gossip) => gossip.roomCode === roomCode);
    if (roomGossips.length <= this.maxGossipsPerRoom) return;
    const removeIds = new Set(roomGossips.sort((a, b) => a.createdAt - b.createdAt).slice(0, roomGossips.length - this.maxGossipsPerRoom).map((g) => g.id));
    for (let i = this.gossips.length - 1; i >= 0; i -= 1) {
      const id = this.gossips[i]?.id;
      if (id && removeIds.has(id)) this.gossips.splice(i, 1);
    }
  }
}

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 12);
}
