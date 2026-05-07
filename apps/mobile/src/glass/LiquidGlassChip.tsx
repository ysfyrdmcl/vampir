import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { typography } from "../theme/typography";
import { glassTokens, type GlassVariant } from "./glass-tokens";
import { LiquidGlassPressable } from "./LiquidGlassPressable";

interface LiquidGlassChipProps {
  disabled?: boolean;
  iconName?: ComponentProps<typeof Ionicons>["name"];
  label?: string;
  onPress?: () => void;
  radius?: number;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: GlassVariant;
  children?: ReactNode;
  count?: number | string;
  size?: "compact" | "regular";
}

export function LiquidGlassChip({
  children,
  disabled = false,
  iconName,
  label,
  onPress,
  radius = glassTokens.radius.sm,
  selected = false,
  count,
  size = "regular",
  style,
  textStyle,
  variant = "chip"
}: LiquidGlassChipProps) {
  const token = glassTokens.variants[variant];
  const color = selected ? token.textActive : token.text;

  return (
    <LiquidGlassPressable
      disabled={disabled}
      glow={selected}
      animatedSheen={selected}
      onPress={onPress ?? (() => undefined)}
      radius={radius}
      selected={selected}
      style={style}
      surfaceStyle={[styles.surface, size === "compact" ? styles.surfaceCompact : null]}
      contentStyle={[styles.content, size === "compact" ? styles.contentCompact : null]}
      intensity={selected ? "strong" : "subtle"}
      tone={selected ? "gold" : "obsidian"}
      variant={variant}
    >
      {iconName ? <Ionicons name={iconName} size={14} color={color} /> : null}
      {children ?? <Text style={[styles.label, { color }, textStyle]}>{label}</Text>}
      {count !== undefined ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </LiquidGlassPressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    minHeight: 34
  },
  surfaceCompact: {
    minHeight: 30
  },
  content: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  contentCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5
  },
  label: {
    fontFamily: typography.sansBold,
    fontSize: 12,
    lineHeight: 15
  },
  countBadge: {
    minWidth: 17,
    height: 17,
    borderRadius: 999,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233,195,73,0.18)",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)"
  },
  countText: {
    color: "#f2d58c",
    fontFamily: typography.sansBold,
    fontSize: 9,
    lineHeight: 11
  }
});
