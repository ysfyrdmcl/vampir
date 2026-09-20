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

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;
type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

function connectionDotStyle(status: ConnectionStatus) {
  if (status === "connected") return styles.statusConnected;
  if (status === "connecting") return styles.statusConnecting;
  return styles.statusDisconnected;
}

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
        <View style={styles.heroCardContent}>
          <HeroBrandArea title="Vampir Köylü" subtitle="Kim dost, kim vampir?" />
          <Text style={styles.playerCount}>4+ oyuncu · Aynı masa, gizli roller</Text>
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        </View>

        <View style={styles.menuCardContent}>
          <View style={styles.actions}>
            <PrimaryButton label="Oda Kur" iconName="git-network-outline" onPress={() => navigation.navigate("CreateRoom")} />
            <PrimaryButton label="Odaya Katıl" iconName="people-outline" onPress={() => navigation.navigate("JoinRoom")} variant="charcoal" />
          </View>

          <View style={styles.quickGuide}>
            <Text style={styles.guideTitle}>Bir gece. Bin şüphe.</Text>
            <View style={styles.guideSteps}>
              <View style={styles.guideStep}>
                <Ionicons name="eye-off-outline" size={20} color={colors.secondary} />
                <Text style={styles.guideLabel}>Rolünü gizle</Text>
              </View>
              <View style={styles.guideStep}>
                <Ionicons name="moon-outline" size={20} color={colors.secondary} />
                <Text style={styles.guideLabel}>Gece karar ver</Text>
              </View>
              <View style={styles.guideStep}>
                <Ionicons name="chatbubbles-outline" size={20} color={colors.secondary} />
                <Text style={styles.guideLabel}>Gündüz ikna et</Text>
              </View>
            </View>
            <Text style={styles.guideHint}>Eksik oyuncu varsa lobide bot ekleyebilirsin.</Text>
          </View>

          <View style={styles.utilityBar}>
            <View style={styles.utilityRail}>
              {playerUtilityItems.map((item) => (
                <Pressable key={item.key} accessibilityRole="button" style={({ pressed }) => [styles.utilityButton, pressed && { opacity: 0.65 }]} onPress={item.onPress}>
                  <Ionicons name={item.icon} size={19} color={colors.textDim} />
                  <Text style={styles.utilityLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.metaRow}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, connectionDotStyle(connectionStatus)]} />
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
    justifyContent: "center",
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  heroCardContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  playerCount: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12,
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
    backgroundColor: "#58c16f",
    shadowColor: "#58c16f",
    shadowOpacity: 0.38,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 }
  },
  statusConnecting: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.34,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 }
  },
  statusDisconnected: {
    backgroundColor: colors.primaryBright,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.34,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 }
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
  menuCardContent: {
    gap: spacing.lg
  },
  actions: {
    gap: 12
  },
  quickGuide: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.16)",
    backgroundColor: "rgba(233,195,73,0.035)",
    padding: spacing.md,
    gap: spacing.md
  },
  guideTitle: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 19,
    textAlign: "center"
  },
  guideSteps: {
    flexDirection: "row",
    gap: spacing.sm
  },
  guideStep: {
    flex: 1,
    alignItems: "center",
    gap: 7
  },
  guideLabel: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    textAlign: "center"
  },
  guideHint: {
    color: colors.textDim,
    fontFamily: typography.sans,
    fontSize: 11,
    textAlign: "center"
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
