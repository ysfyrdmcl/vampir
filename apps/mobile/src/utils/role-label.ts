const ROLE_LABELS: Record<string, string> = {
  Vampire: "Vampir",
  Detective: "Dedektif",
  Doctor: "Doktor",
  Villager: "Köylü",
  Hunter: "Avcı",
  Guard: "Gardiyan",
  Mayor: "Başkan",
  Lover: "Aşık"
};

const WINNER_LABELS: Record<string, string> = {
  Vampires: "Vampirler",
  Villagers: "Köylüler"
};

export function toRoleLabel(role: unknown): string {
  if (typeof role !== "string" || !role) return "Gizli";
  return ROLE_LABELS[role] ?? "Gizli";
}

export function toWinnerLabel(winner: unknown): string {
  if (typeof winner !== "string" || !winner) return "Bilinmiyor";
  return WINNER_LABELS[winner] ?? "Bilinmiyor";
}
