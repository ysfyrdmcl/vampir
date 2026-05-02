import type { PlayerState } from "./game-types.js";

export function calculateWinner(players: PlayerState[]): "Vampires" | "Villagers" | null {
  const alive = players.filter((p) => p.isAlive);
  const vampires = alive.filter((p) => p.role === "Vampire").length;
  const villagers = alive.length - vampires;

  if (vampires === 0) {
    return "Villagers";
  }
  if (vampires >= villagers) {
    return "Vampires";
  }
  return null;
}

