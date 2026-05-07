import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { PhaseCountdown } from "./PhaseCountdown";

interface InGameTopBarProps {
  phaseLabel: string;
  phaseType: "day" | "night" | "other";
  phaseEndsAt: number | null;
  rumorCount: number;
  hasRumorAttention: boolean;
  onPressRumors: () => void;
}

export function InGameTopBar({
  phaseLabel,
  phaseType,
  phaseEndsAt,
  rumorCount,
  hasRumorAttention,
  onPressRumors
}: InGameTopBarProps) {
  const { width } = useWindowDimensions();
  const displayLabel = phaseLabel.replace(" FAZI", "");
  const showCount = rumorCount > 0;
  const compact = width < 380;

  return (
    <View style={styles.root}>
      <View style={styles.divider} />
      <View style={[styles.wings, compact ? styles.wingsCompact : null]}>
        <View style={[styles.phaseWing, compact ? styles.phaseWingCompact : null]}>
          <View style={[styles.phaseAccent, phaseType === "day" ? styles.phaseAccentDay : styles.phaseAccentNight]} />
          <Text style={[styles.phaseText, compact ? styles.phaseTextCompact : null, phaseType === "night" ? styles.phaseTextNight : null]} numberOfLines={1}>
            {displayLabel}
          </Text>
        </View>

        <Pressable
          onPress={onPressRumors}
          style={({ pressed }) => [styles.rumorButton, compact ? styles.rumorButtonCompact : null, pressed ? styles.rumorButtonPressed : null]}
          accessibilityRole="button"
          accessibilityLabel="Söylentiler"
        >
          <Ionicons name="chatbubbles-outline" size={16} color={colors.backgroundDeep} />
          {compact ? null : (
            <Text style={styles.rumorText} numberOfLines={1}>
              Söylenti
            </Text>
          )}
          {showCount ? (
            <>
              <View style={styles.rumorDivider} />
              <Text style={styles.rumorCount} numberOfLines={1}>
                {rumorCount}
              </Text>
            </>
          ) : null}
          {hasRumorAttention && !showCount ? <View style={styles.rumorDot} /> : null}
        </Pressable>
      </View>

      <View pointerEvents="none" style={styles.centerAnchor}>
        <View style={[styles.centerOrnament, compact ? styles.centerOrnamentCompact : null]} />
        <PhaseCountdown phaseEndsAt={phaseEndsAt} presentation="topBar" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    position: "relative",
    justifyContent: "center"
  },
  wings: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 118,
    paddingBottom: 6
  },
  wingsCompact: {
    gap: 86
  },
  phaseWing: {
    minWidth: 0,
    maxWidth: "32%",
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  phaseWingCompact: {
    maxWidth: "28%",
    gap: 7
  },
  phaseAccent: {
    width: 8,
    height: 25,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  phaseAccentDay: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary
  },
  phaseAccentNight: {
    backgroundColor: "#7d88d9",
    shadowColor: "#7d88d9"
  },
  phaseText: {
    flexShrink: 1,
    color: colors.primaryBright,
    fontFamily: typography.serifSemi,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 2
  },
  phaseTextNight: {
    color: "#d9d8ff"
  },
  phaseTextCompact: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 1.2
  },
  rumorButton: {
    width: 128,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,232,138,0.62)",
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: colors.secondary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4
  },
  rumorButtonCompact: {
    width: 62,
    paddingHorizontal: 8,
    gap: 5
  },
  rumorButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }]
  },
  rumorText: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.backgroundDeep,
    fontFamily: typography.sansBold,
    fontSize: 12,
    lineHeight: 15
  },
  rumorDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(47,34,6,0.48)",
    marginHorizontal: 2
  },
  rumorCount: {
    minWidth: 10,
    color: colors.backgroundDeep,
    fontFamily: typography.sansBold,
    fontSize: 12,
    lineHeight: 15,
    textAlign: "center"
  },
  rumorDot: {
    position: "absolute",
    top: 5,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primaryBright
  },
  centerAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -12,
    zIndex: 5,
    alignItems: "center"
  },
  centerOrnament: {
    position: "absolute",
    bottom: 14,
    width: 220,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(233,195,73,0.16)",
    shadowColor: colors.secondary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }
  },
  centerOrnamentCompact: {
    width: 176
  },
  divider: {
    position: "absolute",
    left: -1000,
    right: -1000,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(233,195,73,0.34)"
  }
});
