const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomRoomCode(length: number): string {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return value;
}

export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

export function randomToken(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
}

