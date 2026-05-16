import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef } from "../app/navigation/navigation-ref";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export function PrivateInfoNudge() {
  const insets = useSafeAreaInsets();
  const nudge = useGameStore((s) => s.privateInfoNudge);
  const dismiss = useGameStore((s) => s.dismissPrivateInfoNudge);

  if (!nudge) return null;

  const openPersonalLogs = () => {
    dismiss();
    if (navigationRef.isReady()) {
      navigationRef.navigate("GameLog", { tab: "personal", personalView: "logs" });
    }
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: Math.max(insets.top, spacing.sm) + spacing.sm }]}>
      <Pressable
        onPress={openPersonalLogs}
        accessibilityRole="button"
        accessibilityLabel="Kişisel logları aç"
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.icon}>
          <Ionicons name="lock-closed-outline" size={17} color={colors.secondary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{nudge.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{nudge.body}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 90000,
    elevation: 90000,
    alignItems: "center"
  },
  card: {
    width: "100%",
    maxWidth: 420,
    minHeight: 58,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.36)",
    borderRadius: 12,
    backgroundColor: "rgba(13,10,14,0.96)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.32)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(42,30,16,0.72)"
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 12,
    lineHeight: 16
  },
  body: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  }
});
