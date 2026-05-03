import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { uiStandard } from "../ui/ui-standard";

type GothicCardVariant = "panel" | "hero" | "low";

interface GothicCardProps extends PropsWithChildren {
  variant?: GothicCardVariant;
  style?: StyleProp<ViewStyle>;
}

export function GothicCard({ children, variant = "panel", style }: GothicCardProps) {
  return <View style={[styles.base, variant === "hero" ? styles.hero : null, variant === "low" ? styles.low : null, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderWidth: uiStandard.card.borderWidth,
    borderColor: uiStandard.card.borderColor,
    borderRadius: uiStandard.card.radius,
    backgroundColor: uiStandard.card.backgroundColor
  },
  hero: {
    borderColor: uiStandard.surfaces.hero.borderColor,
    backgroundColor: uiStandard.surfaces.hero.backgroundColor
  },
  low: {
    borderColor: "rgba(170,137,132,0.18)",
    backgroundColor: "rgba(12,12,14,0.68)"
  }
});
