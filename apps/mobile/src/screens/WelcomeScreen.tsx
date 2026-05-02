import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { HeroBrandArea } from "../components/HeroBrandArea";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toConnectionText, toFriendlyErrorText } from "../ui/error-text";
import { uiStandard } from "../ui/ui-standard";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const errorCode = useGameStore((s) => s.errorCode);
  const connectionText = toConnectionText(connectionStatus);
  const errorText = toFriendlyErrorText(errorCode);
  const utilityItems = [
    {
      key: "role-guide",
      label: "Roller ve Kurallar",
      icon: "library-outline" as const,
      onPress: () => navigation.navigate("RoleGuide", { source: "menu" })
    },
    {
      key: "test-mode",
      label: "Test Oyun Kur",
      icon: "flask-outline" as const,
      onPress: () => navigation.navigate("TestModeSetup")
    },
    {
      key: "sim-lab",
      label: "Simülasyon",
      icon: "analytics-outline" as const,
      onPress: () => navigation.navigate("SimulationLab")
    }
  ];

  return (
    <ScreenShell scene="home" headerTitle="ANA MENÜ">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <HeroBrandArea title="Vampir Köylü" subtitle="Aynı masada oynanan sosyal çıkarım oyunu" />
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, connectionStatus === "connected" ? styles.statusConnected : styles.statusDisconnected]} />
            <Text style={styles.statusText}>{connectionText}</Text>
          </View>
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        </View>

        <View style={styles.menuCard}>
          <Text style={styles.sectionLabel}>ANA AKSİYONLAR</Text>
          <View style={styles.actions}>
            <PrimaryButton label="Oda Kur" iconName="git-network-outline" onPress={() => navigation.navigate("CreateRoom")} />
            <PrimaryButton label="Odaya Katıl" iconName="people-outline" onPress={() => navigation.navigate("JoinRoom")} variant="charcoal" />
          </View>

          <Text style={styles.sectionLabel}>YARDIMCI</Text>
          <View style={styles.utilityGrid}>
            {utilityItems.map((item) => (
              <Pressable key={item.key} style={styles.utilityCard} onPress={item.onPress}>
                <Ionicons name={item.icon} size={20} color={colors.secondary} />
                <Text style={styles.utilityLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.footerMeta}>
            <Text style={styles.metaText}>Lokal parti oyunu. Sunucuya bağlı modda gerçek zamanlı oynanır.</Text>
            <Text style={styles.metaText}>Bağlantı: {connectionText} • Sürüm: v0.1.0</Text>
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
    gap: uiStandard.screen.pageGap,
    paddingBottom: spacing.xxl
  },
  heroCard: {
    borderRadius: uiStandard.screen.cardRadius,
    borderWidth: 1,
    borderColor: uiStandard.surfaces.hero.borderColor,
    backgroundColor: uiStandard.surfaces.hero.backgroundColor,
    paddingHorizontal: uiStandard.screen.cardPaddingX,
    paddingVertical: uiStandard.screen.cardPaddingY,
    gap: uiStandard.screen.sectionGap,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  statusRow: {
    marginTop: 6,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8
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
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 14
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
    paddingHorizontal: uiStandard.screen.cardPaddingX,
    paddingVertical: uiStandard.screen.cardPaddingY,
    gap: uiStandard.screen.sectionGap,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  sectionLabel: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: typography.label,
    letterSpacing: uiStandard.text.labelSpacing
  },
  actions: {
    gap: 12
  },
  utilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  utilityCard: {
    width: "48%",
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.26)",
    backgroundColor: "rgba(16,16,18,0.76)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 6
  },
  utilityLabel: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    textAlign: "center"
  },
  footerMeta: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.2)",
    paddingTop: 10,
    gap: 6
  },
  metaText: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 18
  }
});
