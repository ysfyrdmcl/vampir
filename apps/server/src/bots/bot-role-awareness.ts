import type { Role } from "@vampir-koylu/shared";
import { ROLE_DEFINITIONS, ROLE_PRESETS } from "@vampir-koylu/shared";
import type { RoomState } from "../game/game-types.js";

export type SpeechReferencedRole = Role | "Mayor" | "Lover";

const ROLE_TERMS: Record<SpeechReferencedRole, RegExp[]> = {
  Detective: [/\bdedektif\b/i, /\bsherlock\b/i, /\bsorgu\b/i, /\biz sürme\b/i, /\biz surme\b/i],
  Doctor: [/\bdoktor\b/i, /\bkoruma\b/i, /\bkorudu\b/i, /\bkorudugun\b/i, /\bkoruduğun\b/i],
  Guard: [/\bgardiyan\b/i],
  Hunter: [/\bavcı\b/i, /\bavci\b/i, /\bson nefes\b/i],
  Mayor: [/\bbelediye başkanı\b/i, /\bbelediye baskanı\b/i, /\bbelediye baskani\b/i, /\bbaşkanlık\b/i, /\bbaskanlık\b/i, /\bbaskanlik\b/i],
  Lover: [/\başık\b/i, /\basik\b/i, /\başık bağı\b/i, /\basik bagi\b/i],
  Vampire: [/\bvampir\b/i],
  Villager: [/\bköylü\b/i, /\bkoylu\b/i]
};

export function activeSpeechRoleIds(room: RoomState): SpeechReferencedRole[] {
  const active = new Set<SpeechReferencedRole>();
  for (const player of room.players) {
    if (player.role) active.add(player.role);
  }

  const preset = ROLE_PRESETS[room.game.rolePreset];
  if (room.game.rules.mayorEnabled && preset.roleIds.includes("Mayor") && room.players.length >= ROLE_DEFINITIONS.Mayor.minPlayers) {
    active.add("Mayor");
  }
  if (room.game.rules.loversEnabled && preset.roleIds.includes("Lover") && room.players.length >= ROLE_DEFINITIONS.Lover.minPlayers) {
    active.add("Lover");
  }

  return Array.from(active);
}

export function messageReferencesInactiveRole(message: string, activeRoles: readonly SpeechReferencedRole[]): SpeechReferencedRole | null {
  const active = new Set(activeRoles);
  for (const [role, patterns] of Object.entries(ROLE_TERMS) as Array<[SpeechReferencedRole, RegExp[]]>) {
    if (active.has(role)) continue;
    if (patterns.some((pattern) => pattern.test(message))) return role;
  }
  return null;
}
