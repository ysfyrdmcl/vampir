import type { PropsWithChildren } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { LiquidGlassSurface } from "../glass";
import { uiStandard } from "../ui/ui-standard";

type GothicCardVariant = "panel" | "hero" | "low";

interface GothicCardProps extends PropsWithChildren {
  variant?: GothicCardVariant;
  style?: StyleProp<ViewStyle>;
}

export function GothicCard({ children, variant = "panel", style }: GothicCardProps) {
  return (
    <LiquidGlassSurface
      variant={variant}
      glow={variant === "hero"}
      radius={uiStandard.card.radius}
      style={[styles.base, style]}
      contentStyle={styles.content}
    >
      {children}
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 1
  },
  content: {
    flex: 0
  }
});
