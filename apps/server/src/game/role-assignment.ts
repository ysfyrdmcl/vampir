import { buildRoleDeck, type Role, type RolePresetId } from "@vampir-koylu/shared";
import { pickRandom } from "../utils/random.js";
export function assignRoles(playerIds: string[], preset: RolePresetId = "beginner"): Record<string, Role> {
  const remainingIds = [...playerIds];
  const deck = buildRoleDeck(playerIds.length, preset);
  const assignments: Record<string, Role> = {};

  for (const role of deck) {
    const picked = pickRandom(remainingIds);
    if (!picked) {
      break;
    }
    assignments[picked] = role;
    remainingIds.splice(remainingIds.indexOf(picked), 1);
  }

  return assignments;
}
