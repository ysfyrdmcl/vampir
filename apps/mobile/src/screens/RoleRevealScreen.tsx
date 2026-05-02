import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PhaseCountdown } from "../components/PhaseCountdown";
import { PrimaryButton } from "../components/PrimaryButton";
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

  return (
    <ScreenShell scene="role" headerTitle="GÜNDÜZ FAZI">
      <View style={styles.root}>
        <Text style={styles.eyebrow}>GİZLİ KİMLİK</Text>
        <Text style={styles.title}>Rolün</Text>

        <RoleRevealCard role={role} />

        <PrimaryButton label="Rolümü Gördüm" iconName="checkmark-circle-outline" variant="gold" onPress={() => undefined} />
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
  eyebrow: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    textAlign: "center",
    letterSpacing: 3
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 54 / 1.5,
    textAlign: "center"
  },
  
});
