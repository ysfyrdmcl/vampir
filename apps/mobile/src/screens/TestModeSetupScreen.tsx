import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { buildRoleDeck, type Role } from "@vampir-koylu/shared";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { startTestSimulation } from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "TestModeSetup">;
type PlayerCount = 4 | 6 | 8 | 10;
type RoleChoice = "random" | Role;

const OPTIONS: PlayerCount[] = [4, 6, 8, 10];
const ROLE_OPTIONS: Array<{ value: RoleChoice; label: string }> = [
  { value: "random", label: "Rastgele" },
  { value: "Villager", label: "Köylü" },
  { value: "Vampire", label: "Vampir" },
  { value: "Detective", label: "Dedektif" },
  { value: "Doctor", label: "Doktor" },
  { value: "Hunter", label: "Avcı" },
  { value: "Guard", label: "Gardiyan" }
];

export function TestModeSetupScreen({ navigation }: Props) {
  const nickname = useGameStore((s) => s.nickname);
  const rolePreset = useGameStore((s) => s.rolePreset);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [roleChoice, setRoleChoice] = useState<RoleChoice>("random");
  const deck = buildRoleDeck(playerCount, rolePreset);

  const start = () => {
    startTestSimulation(nickname, playerCount, roleChoice);
    navigation.navigate("Lobby");
  };

  const selectPlayerCount = (value: PlayerCount) => {
    setPlayerCount(value);
    if (roleChoice !== "random" && !buildRoleDeck(value, rolePreset).includes(roleChoice)) {
      setRoleChoice("random");
    }
  };

  return (
    <ScreenShell scene="create" headerTitle="TEST MODU">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Test Oyun Kurulumu</Text>
        <Text style={styles.subtitle}>Kendi oyuncun + dummy botlarla oynarsın.</Text>
        <Text style={styles.devHint}>Geliştirici ekranı. Normal oyuncu akışının parçası değildir.</Text>

        <Text style={styles.section}>Oyuncu Sayısı</Text>
        <View style={styles.row}>
          {OPTIONS.map((value) => (
            <Pressable
              key={value}
              onPress={() => selectPlayerCount(value)}
              style={[styles.chip, playerCount === value ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, playerCount === value ? styles.chipTextActive : null]}>{value}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Kendi Rolün</Text>
        <View style={styles.row}>
          {ROLE_OPTIONS.map((role) => {
            const disabled = role.value !== "random" && !deck.includes(role.value);
            const active = roleChoice === role.value;
            return (
              <Pressable
                key={role.value}
                disabled={disabled}
                onPress={() => setRoleChoice(role.value)}
                style={[styles.chip, active ? styles.chipActive : null, disabled ? styles.chipDisabled : null]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null, disabled ? styles.chipTextDisabled : null]}>
                  {role.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.subtitle}>Seçtiğin rol mümkün değilse rol paketi veya oyuncu sayısına göre kapalı görünür.</Text>

        <PrimaryButton label="Test Lobby Başlat" iconName="play-outline" onPress={start} />
        <PrimaryButton label="Menüye Dön" iconName="arrow-back-outline" variant="ghost" compact onPress={() => navigation.navigate("Welcome")} />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 12, paddingBottom: spacing.xl },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 34,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    textAlign: "center"
  },
  devHint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    textAlign: "center",
    fontSize: 12
  },
  section: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    letterSpacing: 1,
    marginTop: 6
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    minWidth: 64,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.35)",
    backgroundColor: "rgba(12,12,14,0.78)"
  },
  chipActive: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.parchment
  },
  chipDisabled: {
    opacity: 0.42
  },
  chipText: {
    color: colors.text,
    fontFamily: typography.sansBold
  },
  chipTextActive: {
    color: colors.parchmentText
  },
  chipTextDisabled: {
    color: colors.textDim
  }
});
