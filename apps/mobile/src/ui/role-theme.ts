import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Role } from "@vampir-koylu/shared";
import { colors } from "../theme/colors";

type RoleTheme = {
  accent: string;
  glow: string;
  /** Card dışına taşan, yumuşak halo/bloom rengi. */
  glowOuter: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  mission: string;
};

const fallbackTheme: RoleTheme = {
  accent: colors.text,
  glow: "rgba(170,137,132,0.25)",
  glowOuter: "rgba(170,137,132,0.18)",
  icon: "people-outline",
  mission: "Gündüz tartış, geceyi doğru yorumla ve takımını hayatta tut."
};

const themeMap: Partial<Record<Role, RoleTheme>> = {
  Vampire: {
    accent: colors.primaryBright,
    glow: "rgba(181,38,25,0.45)",
    glowOuter: "rgba(181,38,25,0.32)",
    icon: "moon-outline",
    mission: "Gece hedef seç, kimliğini sakla ve köyü sessizce azalt."
  },
  Detective: {
    accent: "#d5a932",
    glow: "rgba(213,169,50,0.42)",
    glowOuter: "rgba(213,169,50,0.28)",
    icon: "search-outline",
    mission: "Her gece sorgu yap, bulduğun bilgiyi gündüz stratejiye çevir."
  },
  Doctor: {
    accent: "#7ecab5",
    glow: "rgba(126,202,181,0.36)",
    glowOuter: "rgba(126,202,181,0.24)",
    icon: "medkit-outline",
    mission: "Korumanı doğru zamanla, köyün denge noktasını canlı tut."
  },
  Guard: {
    accent: "#d7b16b",
    glow: "rgba(215,177,107,0.36)",
    glowOuter: "rgba(215,177,107,0.24)",
    icon: "shield-checkmark-outline",
    mission: "Gündüz bir kişiyi oylamadan koruyarak kaderi değiştir."
  },
  Hunter: {
    accent: "#e88f4d",
    glow: "rgba(232,143,77,0.4)",
    glowOuter: "rgba(232,143,77,0.26)",
    icon: "flash-outline",
    mission: "Elenirsen son nefeste hedef seçerek dengeyi bozabilirsin."
  },
  Villager: {
    accent: colors.secondary,
    glow: "rgba(233,195,73,0.34)",
    glowOuter: "rgba(233,195,73,0.26)",
    icon: "people-outline",
    mission: "Gündüz tartışmayı yönlendir ve oylamada doğru tarafı seç."
  }
};

export function getRoleTheme(role: Role | null): RoleTheme {
  if (!role) return fallbackTheme;
  return themeMap[role] ?? fallbackTheme;
}
