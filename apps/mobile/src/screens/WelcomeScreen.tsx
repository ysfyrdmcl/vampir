import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { HeroBrandArea } from "../components/HeroBrandArea";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { LiquidGlassSurface } from "../glass";
import { MotionHealthBadge } from "../motion";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  socketErrorAllowedForRoute,
  socketErrorVisibleForOuterMenu,
  toConnectionText,
  toFriendlyErrorText
} from "../ui/error-text";
import { uiStandard } from "../ui/ui-standard";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;
type IconName = ComponentProps<typeof Ionicons>["name"];

export function WelcomeScreen({ navigation }: Props) {
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const errorCode = useGameStore((s) => s.errorCode);
  const connectionText = toConnectionText(connectionStatus);
  const errorText = toFriendlyErrorText(socketErrorVisibleForOuterMenu(errorCode));

  useFocusEffect(
    useCallback(() => {
      const code = useGameStore.getState().errorCode;
      if (code && !socketErrorAllowedForRoute(code, "Welcome")) {
        useGameStore.getState().setErrorCode(null);
      }
    }, [])
  );
  const playerUtilityItems = [
    {
      key: "role-guide",
      label: "Roller",
      icon: "library-outline" as const,
      onPress: () => navigation.navigate("RoleGuide", { source: "menu" })
    }
  ];
  const tableStats: { label: string; value: string; icon: IconName }[] = [
    { label: "Oyuncu", value: "4+", icon: "people-outline" },
    { label: "Kurulum", value: "Oda", icon: "keypad-outline" },
    { label: "Akış", value: "Canlı", icon: "pulse-outline" }
  ];

  return (
    <ScreenShell scene="home" headerTitle="ANA MENÜ">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LiquidGlassSurface variant="hero" glow radius={uiStandard.screen.cardRadius} style={styles.heroCard} contentStyle={styles.heroCardContent}>
          <View style={styles.heroTopline}>
            <View style={styles.heroPill}>
              <Ionicons name="moon-outline" size={14} color={colors.secondary} />
              <Text style={styles.heroPillText}>GECE MECLİSİ</Text>
            </View>
            <View style={styles.heroPillMuted}>
              <Ionicons name="wifi-outline" size={14} color={colors.textDim} />
              <Text style={styles.heroPillMutedText}>{connectionText}</Text>
            </View>
          </View>
          <HeroBrandArea title="Vampir Köylü" subtitle="Aynı masada oynanan sosyal çıkarım oyunu" />
          <View style={styles.heroStats}>
            {tableStats.map((item) => (
              <View key={item.label} style={styles.statTile}>
                <Ionicons name={item.icon} size={17} color={colors.secondary} />
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        </LiquidGlassSurface>

        <LiquidGlassSurface variant="panel" radius={uiStandard.screen.cardRadius} style={styles.menuCard} contentStyle={styles.menuCardContent}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuKicker}>MASA HAZIRLIĞI</Text>
            <Text style={styles.menuTitle}>Oyunu kur ya da davet koduyla masaya otur.</Text>
          </View>
          <View style={styles.actions}>
            <PrimaryButton label="Oda Kur" iconName="git-network-outline" onPress={() => navigation.navigate("CreateRoom")} />
            <PrimaryButton label="Odaya Katıl" iconName="people-outline" onPress={() => navigation.navigate("JoinRoom")} variant="charcoal" />
          </View>

          <View style={styles.utilityBar}>
            <View style={styles.utilityRail}>
              {playerUtilityItems.map((item) => (
                <Pressable key={item.key} style={styles.utilityButton} onPress={item.onPress}>
                  <Ionicons name={item.icon} size={19} color={colors.textDim} />
                  <Text style={styles.utilityLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.metaRow}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, connectionStatus === "connected" ? styles.statusConnected : styles.statusDisconnected]} />
                <Text style={styles.statusText}>{connectionText}</Text>
              </View>
              <MotionHealthBadge />
              <Text style={styles.metaText}>v0.1.0</Text>
            </View>
          </View>
        </LiquidGlassSurface>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: spacing.xxl
  },
  heroCard: {
  },
  heroCardContent: {
    flex: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md
  },
  heroTopline: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  heroPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)",
    backgroundColor: "rgba(40,28,18,0.44)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  heroPillText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.2
  },
  heroPillMuted: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.16)",
    backgroundColor: "rgba(12,12,14,0.38)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1
  },
  heroPillMutedText: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10
  },
  heroStats: {
    flexDirection: "row",
    gap: 8
  },
  statTile: {
    flex: 1,
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.18)",
    backgroundColor: "rgba(10,10,12,0.42)",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 6
  },
  statValue: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 20
  },
  statLabel: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    textAlign: "center"
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.18)",
    backgroundColor: "rgba(12,12,14,0.38)",
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusConnected: {
    backgroundColor: colors.secondary
  },
  statusDisconnected: {
    backgroundColor: colors.textDim
  },
  statusText: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  error: {
    color: colors.danger,
    fontFamily: typography.sans,
    textAlign: "center"
  },
  menuCard: {
  },
  menuCardContent: {
    flex: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md
  },
  menuHeader: {
    gap: 4
  },
  menuKicker: {
    color: colors.primaryBright,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.6
  },
  menuTitle: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 20,
    lineHeight: 25
  },
  actions: {
    gap: 12
  },
  utilityBar: {
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.16)",
    paddingTop: 12,
    gap: 12
  },
  utilityRail: {
    flexDirection: "row",
    gap: 8
  },
  utilityButton: {
    minWidth: 104,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.2)",
    backgroundColor: "rgba(12,12,14,0.58)",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12
  },
  utilityLabel: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    textAlign: "center"
  },
  metaRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.1)",
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  metaText: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    textAlign: "center"
  }
});
