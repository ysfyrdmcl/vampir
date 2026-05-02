import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PhaseCountdown } from "../components/PhaseCountdown";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "RoleReveal">;

const roleDescriptions: Record<string, string> = {
  Vampire: "Gece uyanır ve bir oyuncuyu sessizce hedef seçersin.",
  Detective: "Her gece bir oyuncuyu sorgular, masum mu vampir mi anlarsın.",
  Doctor: "Her gece bir kişiyi korursun. Aynı kişiyi sürekli koruyamazsın.",
  Villager: "Gündüz tartışma ve oylama ile köyü hayatta tutmaya çalışırsın.",
  Hunter: "Gündüz köy tarafından elenirsen son nefesinde bir kişiyi yanında götürürsün.",
  Guard: "Oyun boyunca bir kez gündüz bir kişiyi oylamadan korursun."
};

function roleColor(role: string | null): string {
  if (role === "Vampire") return colors.primaryBright;
  if (role === "Doctor") return colors.secondary;
  if (role === "Detective") return "#a97bff";
  if (role === "Hunter") return "#e88f4d";
  if (role === "Guard") return "#58c1b6";
  return colors.text;
}

export function RoleRevealScreen(_: Props) {
  const role = useGameStore((s) => s.privateRole);
  const gameState = useGameStore((s) => s.gameState);

  return (
    <ScreenShell scene="role" headerTitle="GÜNDÜZ FAZI">
      <View style={styles.root}>
        <Text style={styles.eyebrow}>GİZLİ KİMLİK</Text>
        <Text style={styles.title}>Rolün</Text>

        <View style={styles.roleCard}>
          <View style={styles.roleIconWrap}>
            <Ionicons
              name={
                role === "Vampire"
                  ? "moon-outline"
                  : role === "Doctor"
                    ? "medkit-outline"
                    : role === "Detective"
                      ? "search-outline"
                      : role === "Hunter"
                        ? "flash-outline"
                        : role === "Guard"
                          ? "shield-checkmark-outline"
                        : "people-outline"
              }
              size={72}
              color={roleColor(role)}
            />
          </View>
          <Text style={[styles.role, { color: roleColor(role) }]}>{role ?? "ROL BEKLENİYOR"}</Text>
          <Text style={styles.desc}>{role ? roleDescriptions[role] : "Sunucudan rol bilgisi bekleniyor..."}</Text>
        </View>

        <PrimaryButton label="Rolümü Anladım" iconName="checkmark-circle-outline" onPress={() => undefined} />
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
  roleCard: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 16,
    backgroundColor: "rgba(9,10,11,0.84)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: 12
  },
  roleIconWrap: {
    width: 148,
    height: 148,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    backgroundColor: "rgba(18,18,20,0.82)"
  },
  role: {
    fontFamily: typography.serif,
    fontSize: 66 / 1.5,
    textAlign: "center",
    letterSpacing: 1.1
  },
  desc: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: 19,
    lineHeight: 29
  }
});
