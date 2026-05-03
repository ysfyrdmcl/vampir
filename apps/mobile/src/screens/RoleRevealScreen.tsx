import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PhaseCountdown } from "../components/PhaseCountdown";
import { RoleRevealCard } from "../components/RoleRevealCard";
import { ScreenShell } from "../components/ScreenShell";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "RoleReveal">;

export function RoleRevealScreen(_: Props) {
  const role = useGameStore((s) => s.privateRole);
  const gameState = useGameStore((s) => s.gameState);
  const roomState = useGameStore((s) => s.roomState);
  const loverPartnerPlayerId = useGameStore((s) => s.loverPartnerPlayerId);
  const loverPartnerName =
    loverPartnerPlayerId
      ? roomState?.players.find((player) => player.playerId === loverPartnerPlayerId)?.nickname ?? loverPartnerPlayerId
      : null;

  return (
    <ScreenShell scene="role" headerTitle="">
      <View style={styles.root}>
        <View style={styles.privacyPill}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.secondary} />
          <Text style={styles.privacyText}>Ekranı sadece sen gör</Text>
        </View>
        <Text style={styles.title}>Rolün</Text>

        <RoleRevealCard role={role} loverPartnerName={loverPartnerName} />

        <PhaseCountdown phaseEndsAt={gameState?.phaseEndsAt ?? null} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md
  },
  privacyPill: {
    alignSelf: "center",
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
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 54 / 1.5,
    textAlign: "center"
  },
  
});
