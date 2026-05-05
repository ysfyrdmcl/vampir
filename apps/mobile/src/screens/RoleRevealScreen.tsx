import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const footerPadBottom = Math.max(insets.bottom, spacing.sm);
  const maxCardHeight = Math.max(compact ? 430 : 560, height - (compact ? 270 : 286));

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

  const titleSize = compact ? 28 : 32;
  const titleLineHeight = compact ? 33 : 38;

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
            <Animated.View style={[styles.header, headerEntryStyle]}>
              <View style={styles.headerOrnament}>
                <View style={styles.headerLine} />
                <Ionicons name="diamond-outline" size={11} color={colors.secondary} />
                <View style={styles.headerLine} />
              </View>
              <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleLineHeight }]}>
                Rolün
              </Text>
              <View style={styles.privacyPill}>
                <Ionicons name="lock-closed-outline" size={12} color={colors.secondary} />
                <Text style={styles.privacyText}>Ekranı sadece sen gör</Text>
              </View>
              <Text style={styles.subtitle}>Karta dokun — kimliğin açılsın</Text>
            </Animated.View>

            <View style={styles.cardStage}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  "rgba(233,195,73,0.0)",
                  "rgba(233,195,73,0.08)",
                  "rgba(181,38,25,0.04)",
                  "rgba(0,0,0,0.0)"
                ]}
                locations={[0, 0.4, 0.7, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.cardVignette}
              />
              <RoleRevealCard
                role={role}
                loverPartnerName={loverPartnerName}
                maxColumnWidth={CARD_COLUMN_MAX}
                maxCardHeight={maxCardHeight}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: footerPadBottom }]}>
          <View style={styles.footerDivider} />
          <PhaseCountdown
            phaseEndsAt={gameState?.phaseEndsAt ?? null}
            presentation="roleRevealFooter"
          />
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
    paddingTop: 0,
    paddingBottom: spacing.xs
  },
  column: {
    width: "100%",
    maxWidth: CARD_COLUMN_MAX,
    alignSelf: "center",
    alignItems: "center"
  },
  header: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: 0,
    paddingBottom: 2,
    gap: 3
  },
  headerOrnament: {
    width: 104,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 0
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(233,195,73,0.24)"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    textAlign: "center",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.3)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(9,9,10,0.78)",
    alignSelf: "center",
    marginTop: 0
  },
  privacyText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  subtitle: {
    color: "rgba(229,226,225,0.66)",
    fontFamily: typography.serifRegular,
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 1,
    paddingHorizontal: spacing.sm
  },
  cardStage: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingTop: 0,
    paddingBottom: 0
  },
  cardVignette: {
    position: "absolute",
    left: -28,
    right: -28,
    top: -8,
    bottom: -16,
    borderRadius: 999,
    opacity: 0.85
  },
  footer: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    paddingTop: 4,
    paddingHorizontal: 4
  },
  footerDivider: {
    height: 1,
    width: "100%",
    marginBottom: 7,
    backgroundColor: "rgba(233,195,73,0.16)",
    shadowColor: colors.secondary,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  }
});
