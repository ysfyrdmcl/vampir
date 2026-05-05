import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { HeroBrandArea } from "../components/HeroBrandArea";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
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
  return (
    <ScreenShell scene="home" headerTitle="ANA MENÜ">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <HeroBrandArea title="Vampir Köylü" subtitle="Aynı masada oynanan sosyal çıkarım oyunu" />
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        </View>

        <View style={styles.menuCard}>
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
              <Text style={styles.metaText}>v0.1.0</Text>
            </View>
          </View>
        </View>
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
    borderRadius: uiStandard.screen.cardRadius,
    borderWidth: 1,
    borderColor: uiStandard.surfaces.hero.borderColor,
    backgroundColor: uiStandard.surfaces.hero.backgroundColor,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
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
    borderRadius: uiStandard.screen.cardRadius,
    borderWidth: 1,
    borderColor: uiStandard.surfaces.panel.borderColor,
    backgroundColor: uiStandard.surfaces.panel.backgroundColor,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
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
