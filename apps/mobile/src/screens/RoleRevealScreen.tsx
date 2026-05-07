import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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

  const { height, width } = useWindowDimensions();
  const compact = height < 720;
  const narrow = width < 380;
  const maxCardHeight = Math.max(compact ? 374 : 520, height - (compact ? 278 : 310));

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

  const titleSize = compact ? 38 : 46;
  const titleLineHeight = compact ? 43 : 52;

  return (
    <ScreenShell scene="role" bottomNavActiveIndex={0} headerTitle="" showTopBar={false}>
      <View style={styles.root}>
        <Animated.View style={[styles.header, compact ? styles.headerCompact : null, headerEntryStyle]}>
          <View style={styles.topRule}>
            <View style={styles.headerLine} />
            <Ionicons name="diamond-outline" size={12} color={colors.secondary} />
            <View style={styles.headerLine} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerSideLeft}>
              <PhaseCountdown
                phaseEndsAt={gameState?.phaseEndsAt ?? null}
                presentation="roleRevealBadge"
              />
            </View>

            <View style={styles.headerCenter}>
              <View style={styles.titleRow}>
                <View style={styles.titleLine} />
                <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleLineHeight }]} numberOfLines={1}>
                  ROLÜN
                </Text>
                <View style={styles.titleLine} />
              </View>
              <View style={[styles.privacyPill, narrow ? styles.privacyPillNarrow : null]}>
                <Ionicons name="lock-closed-outline" size={12} color={colors.secondary} />
                <Text style={styles.privacyText} numberOfLines={1}>
                  SADECE SEN GÖR
                </Text>
              </View>
            </View>

            <View style={styles.headerSideRight}>
              <View style={styles.moonBadge}>
                <Ionicons name="moon" size={compact ? 18 : 21} color={colors.secondary} />
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.cardStage}>
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(233,195,73,0.0)",
              "rgba(233,195,73,0.13)",
              "rgba(181,38,25,0.05)",
              "rgba(0,0,0,0.0)"
            ]}
            locations={[0, 0.42, 0.74, 1]}
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
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start"
  },
  header: {
    width: "100%",
    maxWidth: 430,
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 8,
    gap: 8
  },
  headerCompact: {
    paddingBottom: 5,
    gap: 6
  },
  topRule: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    opacity: 0.76
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(233,195,73,0.20)"
  },
  headerRow: {
    width: "100%",
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  headerSideLeft: {
    width: 96,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  headerSideRight: {
    width: 96,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 5
  },
  titleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  titleLine: {
    flex: 1,
    maxWidth: 52,
    height: 1,
    backgroundColor: "rgba(233,195,73,0.24)"
  },
  title: {
    color: "#f4dfad",
    fontFamily: typography.serif,
    textAlign: "center",
    letterSpacing: 3,
    textShadowColor: "rgba(233,195,73,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10
  },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.42)",
    borderRadius: 999,
    paddingHorizontal: 17,
    paddingVertical: 6,
    backgroundColor: "rgba(5,6,8,0.72)",
    alignSelf: "center",
    marginTop: 0
  },
  privacyPillNarrow: {
    paddingHorizontal: 11
  },
  privacyText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  moonBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    backgroundColor: "rgba(8,9,11,0.74)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.secondary,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 }
  },
  cardStage: {
    flex: 1,
    width: "100%",
    maxWidth: CARD_COLUMN_MAX,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs
  },
  cardVignette: {
    position: "absolute",
    left: -42,
    right: -42,
    top: -22,
    bottom: -22,
    borderRadius: 999,
    opacity: 0.85
  }
});
