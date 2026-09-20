import type { ImageSourcePropType } from "react-native";
import { getActiveRoleIdsForSetup, type RoleDefinitionId, type RolePresetId } from "@vampir-koylu/shared";

export type RoleGuideId = RoleDefinitionId;

export type RoleGuideTeam = "Village" | "Vampire" | "Neutral" | "Civic";
export type RoleGuideActivation = "Night" | "Day" | "Passive" | "OnDeath";

export interface RoleGuideDefinition {
  id: RoleGuideId;
  name: string;
  team: RoleGuideTeam;
  activation: RoleGuideActivation;
  minPlayers: number;
  shortDescription: string;
  description: string;
  winCondition: string;
  specialRules: string[];
  strategyTip: string;
  inCurrentBuild: boolean;
}

export const ROLE_ART: Record<RoleGuideId, ImageSourcePropType> = {
  Villager: require("../assets/roles/villager.png"),
  Vampire: require("../assets/roles/vampire.png"),
  Detective: require("../assets/roles/detective.png"),
  Doctor: require("../assets/roles/doctor.png"),
  Hunter: require("../assets/roles/hunter.png"),
  Mayor: require("../assets/roles/mayor.png"),
  Guard: require("../assets/roles/guard.png"),
  Lover: require("../assets/roles/lover.png")
};

export const ROLE_THUMB_ART: Record<RoleGuideId, ImageSourcePropType> = {
  Villager: require("../assets/roles/thumbs/villager.png"),
  Vampire: require("../assets/roles/thumbs/vampire.png"),
  Detective: require("../assets/roles/thumbs/detective.png"),
  Doctor: require("../assets/roles/thumbs/doctor.png"),
  Hunter: require("../assets/roles/thumbs/hunter.png"),
  Mayor: require("../assets/roles/thumbs/mayor.png"),
  Guard: require("../assets/roles/thumbs/guard.png"),
  Lover: require("../assets/roles/thumbs/lover.png")
};

export const ROLE_GUIDE: RoleGuideDefinition[] = [
  {
    id: "Villager",
    name: "Köylü",
    team: "Village",
    activation: "Day",
    minPlayers: 4,
    shortDescription: "Özel gücün yok, ama en güçlü silahın tartışma ve oy verme.",
    description:
      "Gündüz tartışmalara katılır, çelişkileri yakalar ve vampirleri bulmaya çalışırsın. Köyün ana omurgası sensin.",
    winCondition: "Tüm vampirler elenirse köy kazanır.",
    specialRules: ["Gece özel aksiyon almaz.", "Gündüz oy hakkı vardır."],
    strategyTip: "Sessiz kalmak çoğu zaman şüphe yaratır. Gözlem yap ve tutarlı konuş.",
    inCurrentBuild: true
  },
  {
    id: "Vampire",
    name: "Vampir",
    team: "Vampire",
    activation: "Night",
    minPlayers: 4,
    shortDescription: "Geceleri hedef seçer, gündüz köylü gibi görünmeye çalışırsın.",
    description:
      "Diğer vampirlerle birlikte gece bir oyuncuyu hedeflersin. Gündüz ise köy içinde dikkat çekmeden kalman gerekir.",
    winCondition: "Vampir sayısı köylülerle eşitlenirse veya üstün olursa vampirler kazanır.",
    specialRules: ["Vampirler canlı oy önizlemesi görebilir.", "Vampirler birbirini gece hedefleyemez."],
    strategyTip: "Erken agresif davranış yerine güven inşa etmek çoğu zaman daha güçlüdür.",
    inCurrentBuild: true
  },
  {
    id: "Detective",
    name: "Dedektif",
    team: "Village",
    activation: "Night",
    minPlayers: 5,
    shortDescription: "Her gece bir kişiyi sorgular, vampir olup olmadığını öğrenirsin.",
    description:
      "Sorgu sonucu sadece sana görünür. Bu bilgiyi gündüz açıklamak, saklamak veya blöflemek tamamen senin kararındır.",
    winCondition: "Köy takımı kazanırsa sen de kazanırsın.",
    specialRules: ["Sorgu sonucu yalnız sana görünür.", "Kendini ve daha önce sorguladığın oyuncuları seçemezsin."],
    strategyTip: "Bilgiyi tek seferde açmak yerine doğru zamanda paylaşmak oyunu çevirebilir.",
    inCurrentBuild: true
  },
  {
    id: "Doctor",
    name: "Doktor",
    team: "Village",
    activation: "Night",
    minPlayers: 5,
    shortDescription: "Her gece bir oyuncuyu korursun; doğru hedef köyü hayatta tutar.",
    description:
      "Koruduğun oyuncu o gece vampir saldırısı alırsa ölmez. Kendi koruma ve art arda koruma kuralları oda ayarına göre değişebilir.",
    winCondition: "Köy takımı kazanırsa sen de kazanırsın.",
    specialRules: [
      "Koruma gizlidir, köye hedef adı açıklanmaz.",
      "Kendini koruma ve art arda koruma ayarlarla kontrol edilir."
    ],
    strategyTip: "Sadece en çok konuşanı değil, gece hedef olma ihtimali yüksek oyuncuyu da düşün.",
    inCurrentBuild: true
  },
  {
    id: "Hunter",
    name: "Avcı",
    team: "Village",
    activation: "OnDeath",
    minPlayers: 7,
    shortDescription: "Gündüz köy tarafından elenirsen son nefeste birini yanında götürürsün.",
    description:
      "Dramatik bir roldür. Doğru hedef vampiri düşürür; yanlış hedef köyün dengesini bozabilir.",
    winCondition: "Köy takımı kazanırsa sen de kazanırsın.",
    specialRules: ["Yalnız gündüz infazında son nefes hakkı doğar.", "Son nefesinde hayattaki başka bir oyuncuyu seçersin."],
    strategyTip: "Rolünü erken açmak seni koruyabilir ama vampirler tarafından da işaretlenebilirsin.",
    inCurrentBuild: true
  },
  {
    id: "Mayor",
    name: "Belediye Başkanı",
    team: "Civic",
    activation: "Day",
    minPlayers: 9,
    shortDescription: "Bu bir rol değil, gündüz oyu 2 sayılan seçilmiş makam.",
    description:
      "Köyün seçtiği başkanın oyu daha etkilidir. Başkan köylü de olabilir vampir de olabilir; güvenmek oyuncuların kararıdır.",
    winCondition: "Başkanın ayrı bir kazanma koşulu yoktur, asıl takımına göre kazanır.",
    specialRules: ["Başkan ölürse sonraki gündüz yeniden seçim yapılır.", "Başkan seçiminde ve gündüz oylamasında kendine oy veremezsin."],
    strategyTip: "Yanlış başkan seçimi bütün oy akışını yanlış yöne çekebilir.",
    inCurrentBuild: true
  },
  {
    id: "Guard",
    name: "Gardiyan",
    team: "Village",
    activation: "Day",
    minPlayers: 8,
    shortDescription: "Oyun boyunca bir kez gündüz bir oyuncuyu oylamadan korursun.",
    description:
      "Korunan oyuncu o gün hedef alınamaz veya elenemez. Bu rol doğru kullanıldığında dedektif gibi kritik rolleri hayatta tutar.",
    winCondition: "Köy takımı kazanırsa sen de kazanırsın.",
    specialRules: ["Kendini koruyamazsın.", "Koruma hakkın oyun boyunca bir kez kullanılabilir."],
    strategyTip: "En yüksek sesli oyuncuyu değil, oyunu taşıyan bilgiyi korumayı hedefle.",
    inCurrentBuild: true
  },
  {
    id: "Lover",
    name: "Aşık",
    team: "Neutral",
    activation: "Passive",
    minPlayers: 9,
    shortDescription: "Bağlı olduğun oyuncu ölürse sen de ölürsün.",
    description:
      "Gizli bağ, asıl rolünü değiştirmez. Bağlı oyuncu elenirse sen de elenirsin; ayrı bir aşıklar galibiyeti yoktur.",
    winCondition: "Varsayılan kurulumda kendi asıl takımına göre kazanırsın.",
    specialRules: ["Aşık bağı gizlidir.", "Bağlı oyuncu ölünce zincir ölüm tetiklenir."],
    strategyTip: "Bağını çok görünür savunursan ikiniz birden şüphe çekebilirsiniz.",
    inCurrentBuild: true
  }
];

export function activationLabel(activation: RoleGuideActivation): string {
  if (activation === "Night") return "Gece Aksiyonu";
  if (activation === "Day") return "Gündüz Aksiyonu";
  if (activation === "OnDeath") return "Ölüm Anı";
  return "Pasif";
}

export function teamLabel(team: RoleGuideTeam): string {
  if (team === "Village") return "Köy";
  if (team === "Vampire") return "Vampirler";
  if (team === "Civic") return "Makam";
  return "Nötr";
}

export function getActiveRoleIdsForRoom(playerCount: number, rolePreset: RolePresetId = "beginner"): RoleGuideId[] {
  return getActiveRoleIdsForSetup(Math.max(4, playerCount), rolePreset);
}

export function findRoleGuide(roleId: RoleGuideId): RoleGuideDefinition {
  const found = ROLE_GUIDE.find((role) => role.id === roleId);
  if (!found) {
    throw new Error(`ROLE_NOT_FOUND:${roleId}`);
  }
  return found;
}
