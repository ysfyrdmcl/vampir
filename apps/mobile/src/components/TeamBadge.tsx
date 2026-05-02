import type { Role } from "@vampir-koylu/shared";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface TeamBadgeProps {
  role: Role | null | undefined;
  compact?: boolean;
}

function isVampireTeam(role: Role | null | undefined): boolean {
  return role === "Vampire";
}

export function TeamBadge({ role, compact = false }: TeamBadgeProps) {
  const vampire = isVampireTeam(role);
  return (
    <View style={[styles.badge, compact ? styles.badgeCompact : null, vampire ? styles.vampire : styles.village]}>
      <Text style={[styles.text, compact ? styles.textCompact : null, vampire ? styles.vampireText : styles.villageText]}>
        {vampire ? "Vampir Tarafı" : "Köy Tarafı"}
      </Text>
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
  vampire: {
    borderColor: "rgba(181,38,25,0.48)",
    backgroundColor: "rgba(58,15,15,0.52)"
  },
  village: {
    borderColor: "rgba(233,195,73,0.44)",
    backgroundColor: "rgba(54,42,15,0.5)"
  },
  text: {
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  textCompact: {
    fontSize: 9
  },
  vampireText: {
    color: colors.primaryBright
  },
  villageText: {
    color: colors.secondary
  }
});
