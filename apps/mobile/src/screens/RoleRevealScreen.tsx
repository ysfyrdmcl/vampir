import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import type { RootStackParamList } from "../app/navigation/routes";
import { PhaseCountdown } from "../components/PhaseCountdown";
import { RoleRevealCard } from "../components/RoleRevealCard";
import { ScreenShell } from "../components/ScreenShell";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "RoleReveal">;

const CARD_COLUMN_MAX = 400;

export function RoleRevealScreen(_: Props) {
  const role = useGameStore((s) => s.privateRole);
  const gameState = useGameStore((s) => s.gameState);
  const roomState = useGameStore((s) => s.roomState);
  const loverPartnerPlayerId = useGameStore((s) => s.loverPartnerPlayerId);
  const loverPartnerName =
    loverPartnerPlayerId
      ? roomState?.players.find((player) => player.playerId === loverPartnerPlayerId)?.nickname ?? loverPartnerPlayerId
      : null;

  const insets = useSafeAreaInsets();
  const footerPadBottom = Math.max(insets.bottom, spacing.md) + spacing.sm;

  const headerEntry = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    headerEntry.setValue(0);
    Animated.timing(headerEntry, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [headerEntry]);

  const headerEntryStyle = {
    opacity: headerEntry,
    transform: [
      {
        translateY: headerEntry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
      }
    ]
  };

  return (
    <ScreenShell scene="role" bottomNavActiveIndex={0} headerTitle="">
      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.column}>
            <Animated.View style={headerEntryStyle}>
              <View style={styles.privacyPill}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.secondary} />
                <Text style={styles.privacyText}>Ekranı sadece sen gör</Text>
              </View>
            </Animated.View>
            <Animated.View style={headerEntryStyle}>
              <Text style={styles.title}>Rolün</Text>
              <Text style={styles.subtitle}>Karta dokun — kimliğin açılsın</Text>
            </Animated.View>

            <View style={styles.cardZone} pointerEvents="none">
              <LinearGradient
                colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.52)", "rgba(0,0,0,0.0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.vignetteSoft}
              />
              <LinearGradient
                colors={["rgba(233,195,73,0.0)", "rgba(233,195,73,0.16)", "rgba(233,195,73,0.0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.vignetteGold}
              />
            </View>

            <RoleRevealCard role={role} loverPartnerName={loverPartnerName} maxColumnWidth={CARD_COLUMN_MAX} />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: footerPadBottom }]}>
          <View style={styles.footerDivider} />
          <PhaseCountdown phaseEndsAt={gameState?.phaseEndsAt ?? null} presentation="roleRevealFooter" />
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  scroll: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md
  },
  column: {
    width: "100%",
    maxWidth: CARD_COLUMN_MAX,
    alignSelf: "center",
    alignItems: "center",
    gap: spacing.sm
  },
  cardZone: {
    position: "absolute",
    left: -40,
    right: -40,
    top: 86,
    height: 470,
    zIndex: 0
  },
  vignetteSoft: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.55
  },
  vignetteGold: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.9
  },
  footer: {
    width: "100%",
    maxWidth: CARD_COLUMN_MAX,
    alignSelf: "center",
    paddingTop: spacing.md,
    paddingHorizontal: 2
  },
  footerDivider: {
    height: 1,
    width: "100%",
    marginBottom: spacing.md,
    backgroundColor: "rgba(233,195,73,0.14)",
    shadowColor: colors.secondary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(20,18,14,0.74)"
  },
  privacyText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  title: {
    marginTop: spacing.xs,
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center",
    letterSpacing: 0.5
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm
  }
});
