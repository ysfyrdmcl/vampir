import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export type StatusBadgeTone = "alive" | "dead" | "ready" | "pending" | "connected" | "disconnected" | "neutral";

interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  compact?: boolean;
}

const toneMap: Record<StatusBadgeTone, { border: string; background: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  alive: {
    border: "rgba(39,190,104,0.45)",
    background: "rgba(16,48,31,0.5)",
    text: colors.success,
    icon: "heart-outline"
  },
  dead: {
    border: "rgba(255,143,130,0.5)",
    background: "rgba(76,24,24,0.46)",
    text: colors.danger,
    icon: "skull-outline"
  },
  ready: {
    border: "rgba(233,195,73,0.45)",
    background: "rgba(52,42,17,0.52)",
    text: colors.secondary,
    icon: "checkmark-done-outline"
  },
  pending: {
    border: "rgba(170,137,132,0.4)",
    background: "rgba(26,24,24,0.55)",
    text: colors.textDim,
    icon: "time-outline"
  },
  connected: {
    border: "rgba(39,190,104,0.45)",
    background: "rgba(13,42,29,0.45)",
    text: colors.success,
    icon: "radio-outline"
  },
  disconnected: {
    border: "rgba(255,143,130,0.45)",
    background: "rgba(57,20,20,0.45)",
    text: colors.danger,
    icon: "cloud-offline-outline"
  },
  neutral: {
    border: "rgba(170,137,132,0.36)",
    background: "rgba(22,22,24,0.55)",
    text: colors.textDim,
    icon: "ellipse-outline"
  }
};

export function StatusBadge({ label, tone = "neutral", compact = false }: StatusBadgeProps) {
  const palette = toneMap[tone];
  return (
    <View
      style={[
        styles.badge,
        compact ? styles.badgeCompact : null,
        {
          borderColor: palette.border,
          backgroundColor: palette.background
        }
      ]}
    >
      <Ionicons name={palette.icon} size={compact ? 11 : 12} color={palette.text} />
      <Text style={[styles.text, compact ? styles.textCompact : null, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3
  },
  text: {
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  textCompact: {
    fontSize: 9
  }
});
