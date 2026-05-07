import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { LiquidGlassPressable, type GlassVariant } from "../glass";
import type { GlassTone } from "../glass/glass-tokens";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";

export type KineticButtonVariant = "primary" | "secondary" | "gold" | "danger-outline" | "ghost" | "locked" | "danger";

interface KineticGlassButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  iconName?: ComponentProps<typeof Ionicons>["name"];
  variant?: KineticButtonVariant;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  rightSlot?: ReactNode;
}

export function KineticGlassButton({
  compact = false,
  disabled = false,
  iconName,
  label,
  labelStyle,
  onPress,
  rightSlot,
  style,
  variant = "primary"
}: KineticGlassButtonProps) {
  const locked = disabled || variant === "locked";
  const visualVariant = locked ? "locked" : variant;
  const config = buttonVisual(visualVariant);

  return (
    <LiquidGlassPressable
      animatedSheen={!locked && (visualVariant === "primary" || visualVariant === "gold" || visualVariant === "danger")}
      danger={visualVariant === "danger" || visualVariant === "danger-outline"}
      depth={locked ? "flat" : visualVariant === "ghost" ? "raised" : "floating"}
      disabled={locked}
      feedback={visualVariant === "primary" || visualVariant === "danger" ? "strong" : "soft"}
      glow={!locked && visualVariant !== "ghost"}
      intensity={visualVariant === "ghost" ? "subtle" : visualVariant === "secondary" ? "medium" : "strong"}
      onPress={onPress}
      radius={uiStandard.button.radius}
      style={style}
      surfaceStyle={[styles.base, compact ? styles.baseCompact : null]}
      contentStyle={styles.content}
      tone={config.tone}
      variant={config.glassVariant}
    >
      {iconName ? (
        <Ionicons
          name={iconName}
          size={compact ? uiStandard.button.compactIconSize : uiStandard.button.iconSize}
          color={config.text}
        />
      ) : null}
      <Text style={[styles.label, compact ? styles.labelCompact : null, { color: config.text }, labelStyle]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
        {label}
      </Text>
      {rightSlot}
    </LiquidGlassPressable>
  );
}

function buttonVisual(variant: KineticButtonVariant): { glassVariant: GlassVariant; tone: GlassTone; text: string } {
  if (variant === "locked") return { glassVariant: "low", tone: "obsidian", text: "#8f8d92" };
  if (variant === "gold") return { glassVariant: "gold", tone: "gold", text: colors.secondary };
  if (variant === "danger" || variant === "danger-outline") return { glassVariant: "danger", tone: "crimson", text: variant === "danger-outline" ? "#f0b5ad" : "#ffe4dc" };
  if (variant === "ghost") return { glassVariant: "ghost", tone: "obsidian", text: "#cbc2bc" };
  if (variant === "secondary") return { glassVariant: "panel", tone: "obsidian", text: colors.textMuted };
  return { glassVariant: "button", tone: "crimson", text: colors.text };
}

const styles = StyleSheet.create({
  base: {
    height: uiStandard.button.height,
    width: "100%"
  },
  baseCompact: {
    height: uiStandard.button.compactHeight
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14
  },
  label: {
    flexShrink: 1,
    color: colors.text,
    fontSize: uiStandard.button.labelSize,
    fontFamily: typography.serif,
    letterSpacing: 0.2
  },
  labelCompact: {
    fontSize: uiStandard.button.compactLabelSize,
    fontFamily: typography.sansBold,
    letterSpacing: 0.2
  }
});
