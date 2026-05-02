import AsyncStorage from "@react-native-async-storage/async-storage";

export type PlayerNoteTag = "none" | "suspect" | "trusted" | "enemy";

export interface PlayerNote {
  tag: PlayerNoteTag;
  note: string;
}

export type PlayerNotesById = Record<string, PlayerNote>;

const defaultNote: PlayerNote = {
  tag: "none",
  note: ""
};

function keyForRoom(roomCode: string): string {
  return `@vk/player-notes/${roomCode}`;
}

export async function loadPlayerNotes(roomCode: string): Promise<PlayerNotesById> {
  const raw = await AsyncStorage.getItem(keyForRoom(roomCode));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as PlayerNotesById;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

export async function savePlayerNote(roomCode: string, playerId: string, note: PlayerNote): Promise<PlayerNotesById> {
  const existing = await loadPlayerNotes(roomCode);
  const next = {
    ...existing,
    [playerId]: {
      tag: note.tag,
      note: note.note
    }
  };
  await AsyncStorage.setItem(keyForRoom(roomCode), JSON.stringify(next));
  return next;
}

export function getPlayerNote(notes: PlayerNotesById, playerId: string): PlayerNote {
  return notes[playerId] ?? defaultNote;
}
