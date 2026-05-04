import type { Role } from "./game-types.js";

export type RoleDefinitionId =
  | "Villager"
  | "Vampire"
  | "Detective"
  | "Doctor"
  | "Hunter"
  | "Mayor"
  | "Guard"
  | "Lover";

export type RoleTeam = "Village" | "Vampire" | "Neutral" | "Civic";
export type RolePhase = "night" | "day" | "passive" | "onDeath";
export type RolePresetId = "beginner" | "classicPlus" | "socialChaos";

export interface RoleDefinition {
  id: RoleDefinitionId;
  name: string;
  team: RoleTeam;
  minPlayers: number;
  phase: RolePhase;
  isBeginnerFriendly: boolean;
  implemented: boolean;
  description: string;
  rules: string[];
}

export interface RolePresetDefinition {
  id: RolePresetId;
  name: string;
  description: string;
  roleIds: RoleDefinitionId[];
}

export const ROLE_DEFINITIONS: Record<RoleDefinitionId, RoleDefinition> = {
  Villager: {
    id: "Villager",
    name: "Köylü",
    team: "Village",
    minPlayers: 4,
    phase: "day",
    isBeginnerFriendly: true,
    implemented: true,
    description: "Özel gücü yoktur, oyunun sosyal tarafını taşır.",
    rules: ["Gündüz oy verir.", "Gece özel aksiyon almaz."]
  },
  Vampire: {
    id: "Vampire",
    name: "Vampir",
    team: "Vampire",
    minPlayers: 4,
    phase: "night",
    isBeginnerFriendly: true,
    implemented: true,
    description: "Gece hedef seçer, gündüz kimliğini saklar.",
    rules: ["Aynı takım oyuncusunu hedefleyemez.", "Vampirler birlikte kazanır."]
  },
  Detective: {
    id: "Detective",
    name: "Dedektif",
    team: "Village",
    minPlayers: 5,
    phase: "night",
    isBeginnerFriendly: true,
    implemented: true,
    description: "Gece sorgu sonucu alır, bilgiyi nasıl kullanacağına kendisi karar verir.",
    rules: ["Sorgu sonucu özeldir."]
  },
  Doctor: {
    id: "Doctor",
    name: "Doktor",
    team: "Village",
    minPlayers: 6,
    phase: "night",
    isBeginnerFriendly: true,
    implemented: true,
    description: "Gece bir oyuncuyu korur.",
    rules: ["Kendi koruma ve art arda koruma kuralları oda ayarına bağlıdır."]
  },
  Hunter: {
    id: "Hunter",
    name: "Avcı",
    team: "Village",
    minPlayers: 7,
    phase: "onDeath",
    isBeginnerFriendly: false,
    implemented: true,
    description: "Ölüm anında ek aksiyon doğurur.",
    rules: ["Gündüz elenirse son nefes hedefi seçer."]
  },
  Mayor: {
    id: "Mayor",
    name: "Belediye Başkanı",
    team: "Civic",
    minPlayers: 9,
    phase: "day",
    isBeginnerFriendly: false,
    implemented: true,
    description: "Gündüz oylamasında etki gücü olan seçilmiş makam.",
    rules: ["Mekaniktir, ayrı gece rolü değildir.", "Gündüz oyu 2 sayılır."]
  },
  Guard: {
    id: "Guard",
    name: "Gardiyan",
    team: "Village",
    minPlayers: 8,
    phase: "day",
    isBeginnerFriendly: false,
    implemented: true,
    description: "Gündüz oylama koruması sağlar.",
    rules: ["Oyun boyunca bir kez koruma kullanır.", "Korunan oyuncu o gün oylanamaz."]
  },
  Lover: {
    id: "Lover",
    name: "Aşık",
    team: "Neutral",
    minPlayers: 9,
    phase: "passive",
    isBeginnerFriendly: false,
    implemented: true,
    description: "Oyuncular arasında gizli bağ mekanizmasıdır.",
    rules: ["İki oyuncu gizli bağlanır.", "Birisi ölürse diğeri de ölür."]
  }
};

export const ROLE_PRESETS: Record<RolePresetId, RolePresetDefinition> = {
  beginner: {
    id: "beginner",
    name: "Başlangıç",
    description: "Temel ve hızlı öğrenilen rol seti.",
    roleIds: ["Villager", "Vampire", "Detective", "Doctor"]
  },
  classicPlus: {
    id: "classicPlus",
    name: "Klasik+",
    description: "Temel roller + Avcı.",
    roleIds: ["Villager", "Vampire", "Detective", "Doctor", "Hunter"]
  },
  socialChaos: {
    id: "socialChaos",
    name: "Sosyal Kaos",
    description: "İleri seviye sosyal roller ve kaotik yapı.",
    roleIds: ["Villager", "Vampire", "Detective", "Doctor", "Hunter", "Mayor", "Guard", "Lover"]
  }
};

function baseRoleCounts(playerCount: number): { vampires: number; detective: number; doctor: number } {
  if (playerCount <= 4) {
    return { vampires: 1, detective: 0, doctor: 0 };
  }
  if (playerCount <= 5) {
    return { vampires: 1, detective: 1, doctor: 1 };
  }
  if (playerCount <= 10) {
    return { vampires: 2, detective: 1, doctor: 1 };
  }
  if (playerCount <= 15) {
    return { vampires: 3, detective: 1, doctor: 1 };
  }
  return { vampires: 4, detective: 1, doctor: 1 };
}

function enabledRuntimeRolesForPreset(preset: RolePresetId): Set<Role> {
  const ids = ROLE_PRESETS[preset].roleIds;
  const runtime: Role[] = [];
  for (const id of ids) {
    if (!ROLE_DEFINITIONS[id].implemented) continue;
    if (id === "Villager" || id === "Vampire" || id === "Detective" || id === "Doctor" || id === "Hunter" || id === "Guard") {
      runtime.push(id);
    }
  }
  return new Set(runtime);
}

export function buildRoleDeck(playerCount: number, preset: RolePresetId = "beginner"): Role[] {
  const total = Math.max(4, playerCount);
  const counts = baseRoleCounts(total);
  const enabled = enabledRuntimeRolesForPreset(preset);
  const deck: Role[] = [];

  if (enabled.has("Vampire")) {
    for (let i = 0; i < counts.vampires; i += 1) deck.push("Vampire");
  }
  if (enabled.has("Detective")) {
    for (let i = 0; i < counts.detective; i += 1) deck.push("Detective");
  }
  if (enabled.has("Doctor")) {
    for (let i = 0; i < counts.doctor; i += 1) deck.push("Doctor");
  }
  if (enabled.has("Hunter") && total >= ROLE_DEFINITIONS.Hunter.minPlayers) {
    deck.push("Hunter");
  }
  if (enabled.has("Guard") && total >= ROLE_DEFINITIONS.Guard.minPlayers) {
    deck.push("Guard");
  }

  while (deck.length < total) {
    deck.push("Villager");
  }
  return deck.slice(0, total);
}

export function getActiveRoleIdsForSetup(playerCount: number, preset: RolePresetId = "beginner"): RoleDefinitionId[] {
  const deck = buildRoleDeck(playerCount, preset);
  const unique = new Set<RoleDefinitionId>(deck);
  return Array.from(unique);
}
