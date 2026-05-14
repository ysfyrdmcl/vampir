import type { GamePhase, Role } from "@vampir-koylu/shared";
import type { PlayerState, RoomState } from "../game/game-types.js";
import { actionTypeForBotPhase } from "./bot-types.js";
import { legalTargetsForBot } from "./bot-targeting.js";
import type { BotMemory } from "./bot-memory.js";

export type BotWorldAwareness = {
  roomCode: string;
  phase: GamePhase;
  round: number;
  speaker: {
    playerId: string;
    nickname: string;
    role?: Role;
    isAlive: boolean;
  };
  publicPlayers: {
    playerId: string;
    nickname: string;
    isAlive: boolean;
    isBot: boolean;
    isConnected: boolean;
  }[];
  publicEvents: string[];
  privateFacts: string[];
  legalActionHints: string[];
};

export function buildBotWorldAwareness(room: RoomState, speakerPlayerId: string, memory?: BotMemory | null): BotWorldAwareness | null {
  const speaker = room.players.find((p) => p.playerId === speakerPlayerId);
  if (!speaker?.isBot || !speaker.role) return null;

  return {
    roomCode: room.roomCode,
    phase: room.game.phase,
    round: room.game.round,
    speaker: {
      playerId: speaker.playerId,
      nickname: speaker.nickname,
      role: speaker.role,
      isAlive: speaker.isAlive
    },
    publicPlayers: room.players.map((p) => ({
      playerId: p.playerId,
      nickname: p.nickname,
      isAlive: p.isAlive,
      isBot: p.isBot,
      isConnected: p.isConnected
    })),
    publicEvents: buildPublicEvents(room),
    privateFacts: buildPrivateFacts(room, speaker, memory),
    legalActionHints: buildLegalActionHints(room, speaker, memory)
  };
}

export function renderBotWorldAwarenessPrompt(world: BotWorldAwareness): string {
  const players = world.publicPlayers
    .map((p) => `${p.nickname}(${p.playerId}): ${p.isAlive ? "hayatta" : "olu"}${p.isBot ? ", bot" : ""}`)
    .join("; ");
  return [
    `Oda: ${world.roomCode}`,
    `Faz: ${world.phase}, round: ${world.round}`,
    `Sen: ${world.speaker.nickname} (${world.speaker.role ?? "rol yok"}, ${world.speaker.isAlive ? "hayatta" : "olu"})`,
    `Oyuncular: ${players}`,
    `Public olaylar: ${world.publicEvents.length ? world.publicEvents.join(" | ") : "Yok"}`,
    `Sana ozel bilgiler: ${world.privateFacts.length ? world.privateFacts.join(" | ") : "Yok"}`,
    `Legal aksiyon ipuclari: ${world.legalActionHints.length ? world.legalActionHints.join(" | ") : "Yok"}`
  ].join("\n");
}

function buildPublicEvents(room: RoomState): string[] {
  const events: string[] = [];
  const elimination = room.game.lastEliminationSummary;
  if (elimination) {
    const player = playerName(room, elimination.playerId);
    events.push(`${elimination.source === "Night" ? "Gece" : "Gunduz"} elenen oyuncu: ${player}.`);
  }

  const dayVote = room.game.lastDayVoteSummary;
  if (dayVote) {
    if (dayVote.noLynchWon) {
      events.push("Son gunduz oylamasinda no-lynch kazandi.");
    } else if (dayVote.executedPlayerId) {
      events.push(`Son gunduz oylamasinda ${playerName(room, dayVote.executedPlayerId)} idam edildi.`);
    }
    if (dayVote.tiedTopCandidates.length > 0) {
      events.push(`Oylar su adaylarda dugumlendi: ${dayVote.tiedTopCandidates.map((id) => playerName(room, id)).join(", ")}.`);
    }
  }

  if (room.game.mayorPlayerId) {
    events.push(`Koy baskani: ${playerName(room, room.game.mayorPlayerId)}.`);
  }

  if (room.game.tieCountInRound > 0) {
    events.push(`Bu round beraberlik sayisi: ${room.game.tieCountInRound}.`);
  }

  if (room.game.winner) {
    events.push(`Oyun sonucu: ${room.game.winner}.`);
  }

  return events;
}

function buildPrivateFacts(room: RoomState, speaker: PlayerState, memory?: BotMemory | null): string[] {
  const facts: string[] = [`Rolun: ${speaker.role}.`];

  if (speaker.role === "Vampire") {
    const vampireNames = room.players
      .filter((p) => p.role === "Vampire")
      .map((p) => p.playerId === speaker.playerId ? `${p.nickname} (sen)` : p.nickname);
    facts.push(`Bildigin vampirler: ${vampireNames.join(", ")}.`);
  }

  if (speaker.role === "Detective") {
    const knownVampires = memory?.knownVampires ?? [];
    const knownNonVampires = memory?.knownNonVampires ?? [];
    if (knownVampires.length) facts.push(`Dedektif bilgin - vampir: ${knownVampires.map((id) => playerName(room, id)).join(", ")}.`);
    if (knownNonVampires.length) facts.push(`Dedektif bilgin - vampir degil: ${knownNonVampires.map((id) => playerName(room, id)).join(", ")}.`);
  }

  if (speaker.role === "Doctor" && memory?.lastProtectedPlayerId) {
    facts.push(`Son korudugun oyuncu: ${playerName(room, memory.lastProtectedPlayerId)}.`);
  }

  if (speaker.role === "Guard") {
    facts.push(speaker.guardUsedInGame ? "Gardiyan hakkini bu oyunda kullandin." : "Gardiyan hakkin henuz kullanilmadi.");
  }

  return facts;
}

function buildLegalActionHints(room: RoomState, speaker: PlayerState, memory?: BotMemory | null): string[] {
  const actionType = actionTypeForBotPhase(room.game.phase);
  if (!actionType) return [];
  const targets = legalTargetsForBot(room, room.game.phase, speaker.playerId, memory);
  if (!targets.length) return [`${actionType}: legal hedef yok.`];
  return [`${actionType}: legal hedefler ${targets.map((id) => playerName(room, id)).join(", ")}.`];
}

function playerName(room: RoomState, playerId: string): string {
  return room.players.find((p) => p.playerId === playerId)?.nickname ?? playerId;
}
