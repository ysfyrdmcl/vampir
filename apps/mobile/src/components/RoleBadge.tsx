import type { Role } from "@vampir-koylu/shared";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { toRoleLabel } from "../utils/role-label";

interface RoleBadgeProps {
  role: Role | null | undefined;
  compact?: boolean;
}

function rolePalette(role: Role | null | undefined) {
  if (role === "Vampire") return { border: "rgba(181,38,25,0.45)", bg: "rgba(63,16,16,0.56)", text: colors.danger };
  if (role === "Detective") return { border: "rgba(233,195,73,0.5)", bg: "rgba(59,48,18,0.56)", text: colors.secondary };
  if (role === "Doctor") return { border: "rgba(67,184,148,0.5)", bg: "rgba(21,56,48,0.56)", text: "#73d8bc" };
  if (role === "Guard") return { border: "rgba(120,168,255,0.5)", bg: "rgba(20,39,68,0.56)", text: "#8cb7ff" };
  if (role === "Hunter") return { border: "rgba(233,195,73,0.4)", bg: "rgba(45,37,18,0.56)", text: "#f0d58a" };
  return { border: "rgba(170,137,132,0.36)", bg: "rgba(22,22,24,0.55)", text: colors.textDim };
}

export function RoleBadge({ role, compact = false }: RoleBadgeProps) {
  const palette = rolePalette(role);
  return (
    <View style={[styles.badge, compact ? styles.badgeCompact : null, { borderColor: palette.border, backgroundColor: palette.bg }]}>
      <Text style={[styles.text, compact ? styles.textCompact : null, { color: palette.text }]}>{toRoleLabel(role)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3
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
