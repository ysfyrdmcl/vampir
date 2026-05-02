import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Role } from "@vampir-koylu/shared";
import { colors } from "../theme/colors";

type RoleTheme = {
  accent: string;
  glow: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  mission: string;
};

const fallbackTheme: RoleTheme = {
  accent: colors.text,
  glow: "rgba(170,137,132,0.25)",
  icon: "people-outline",
  mission: "Gündüz tartış, geceyi doğru yorumla ve takımını hayatta tut."
};

const themeMap: Partial<Record<Role, RoleTheme>> = {
  Vampire: {
    accent: colors.primaryBright,
    glow: "rgba(181,38,25,0.45)",
    icon: "moon-outline",
    mission: "Gece hedef seç, kimliğini sakla ve köyü sessizce azalt."
  },
  Detective: {
    accent: "#d5a932",
    glow: "rgba(213,169,50,0.42)",
    icon: "search-outline",
    mission: "Her gece sorgu yap, bulduğun bilgiyi gündüz stratejiye çevir."
  },
  Doctor: {
    accent: "#7ecab5",
    glow: "rgba(126,202,181,0.36)",
    icon: "medkit-outline",
    mission: "Korumanı doğru zamanla, köyün denge noktasını canlı tut."
  },
  Guard: {
    accent: "#d7b16b",
    glow: "rgba(215,177,107,0.36)",
    icon: "shield-checkmark-outline",
    mission: "Gündüz bir kişiyi oylamadan koruyarak kaderi değiştir."
  },
  Hunter: {
    accent: "#e88f4d",
    glow: "rgba(232,143,77,0.4)",
    icon: "flash-outline",
    mission: "Elenirsen son nefeste hedef seçerek dengeyi bozabilirsin."
  },
  Villager: {
    accent: colors.secondary,
    glow: "rgba(233,195,73,0.34)",
    icon: "people-outline",
    mission: "Gündüz tartışmayı yönlendir ve oylamada doğru tarafı seç."
  }
};

export function getRoleTheme(role: Role | null): RoleTheme {
  if (!role) return fallbackTheme;
  return themeMap[role] ?? fallbackTheme;
}
