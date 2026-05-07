import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";
import { PrimaryButton } from "./PrimaryButton";

function iconForKind(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === "night") return "moon-outline";
  if (kind === "day") return "people-outline";
  if (kind === "mayor") return "ribbon-outline";
  if (kind === "guard") return "shield-checkmark-outline";
  if (kind === "tie") return "git-compare-outline";
  if (kind === "hunter") return "locate-outline";
  if (kind === "gameOver") return "trophy-outline";
  return "alert-circle-outline";
}

export function ResultPopup() {
  const event = useGameStore((s) => s.activeResultEvent);
  const dismiss = useGameStore((s) => s.dismissActiveResultEvent);

  return (
    <Modal visible={Boolean(event)} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        {event ? (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={iconForKind(event.kind)} size={28} color={colors.secondary} />
            </View>
            <Text style={styles.kicker}>Tur {event.round}</Text>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.message}>{event.message}</Text>
            <PrimaryButton label="Tamam" iconName="checkmark-circle-outline" variant="gold" onPress={dismiss} compact style={styles.action} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: `rgba(0,0,0,${uiStandard.fx.overlayDark})`
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    borderRadius: 16,
    backgroundColor: "rgba(16,16,18,0.98)",
    padding: spacing.lg,
    alignItems: "center",
    gap: 10
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    backgroundColor: "rgba(42,34,14,0.48)",
    alignItems: "center",
    justifyContent: "center"
  },
  kicker: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 26,
    textAlign: "center"
  },
  message: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center"
  },
  action: {
    width: "72%",
    maxWidth: 220,
    marginTop: spacing.sm
  }
});
