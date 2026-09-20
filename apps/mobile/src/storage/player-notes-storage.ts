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
const pendingWrites = new Map<string, Promise<PlayerNotesById>>();

function keyForRoom(roomCode: string): string {
  return `@vk/player-notes/${roomCode}`;
}

export async function loadPlayerNotes(roomCode: string): Promise<PlayerNotesById> {
  await pendingWrites.get(roomCode)?.catch(() => undefined);
  return readStoredPlayerNotes(roomCode);
}

async function readStoredPlayerNotes(roomCode: string): Promise<PlayerNotesById> {
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
  const previous = pendingWrites.get(roomCode);
  const existing = previous
    ? previous.catch(() => readStoredPlayerNotes(roomCode))
    : readStoredPlayerNotes(roomCode);
  const noteSnapshot = { tag: note.tag, note: note.note };
  const write = existing.then(async (notes) => {
    const next = { ...notes, [playerId]: noteSnapshot };
    await AsyncStorage.setItem(keyForRoom(roomCode), JSON.stringify(next));
    return next;
  });
  pendingWrites.set(roomCode, write);
  const clearPending = () => {
    if (pendingWrites.get(roomCode) === write) pendingWrites.delete(roomCode);
  };
  void write.then(clearPending, clearPending);
  return write;
}

export function getPlayerNote(notes: PlayerNotesById, playerId: string): PlayerNote {
  return notes[playerId] ?? defaultNote;
}
