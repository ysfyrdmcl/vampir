import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toConnectionText, toFriendlyErrorText } from "../ui/error-text";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const errorCode = useGameStore((s) => s.errorCode);
  const connectionText = toConnectionText(connectionStatus);
  const errorText = toFriendlyErrorText(errorCode);

  return (
    <ScreenShell scene="home" headerTitle="GÜNDÜZ FAZI">
      <View style={styles.root}>
        <View style={styles.heroCard}>
          <View style={styles.brandBadge}>
            <Ionicons name="shield-outline" size={42} color={colors.secondary} />
          </View>
          <Text style={styles.title}>Vampir Köylü</Text>
          <Text style={styles.subtitle}>Aynı masada oynanan sosyal çıkarım oyunu</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, connectionStatus === "connected" ? styles.statusConnected : styles.statusDisconnected]} />
            <Text style={styles.statusText}>{connectionText}</Text>
          </View>
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton label="Oda Kur" iconName="git-network-outline" onPress={() => navigation.navigate("CreateRoom")} />
            <PrimaryButton label="Odaya Katıl" iconName="people-outline" onPress={() => navigation.navigate("JoinRoom")} variant="charcoal" />
            <PrimaryButton
              label="Roller ve Kurallar"
              iconName="library-outline"
              variant="charcoal"
              onPress={() => navigation.navigate("RoleGuide", { source: "menu" })}
            />
            <PrimaryButton
              label="Test Oyun Kur (4/6/8/10)"
              iconName="flask-outline"
              variant="outline"
              onPress={() => navigation.navigate("TestModeSetup")}
            />
            <PrimaryButton
              label="Oyunları Simüle Et"
              iconName="analytics-outline"
              variant="outline"
              onPress={() => navigation.navigate("SimulationLab")}
            />
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.lg
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.36)",
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: spacing.lg,
    paddingVertical: 30,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  brandBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.35)",
    backgroundColor: "rgba(14,14,14,0.6)"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 60 / 1.45,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 18,
    textAlign: "center"
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
  actions: {
    marginTop: 10,
    gap: 12
  }
});
