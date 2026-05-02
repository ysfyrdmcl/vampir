import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { ROLE_ART, activationLabel, findRoleGuide, teamLabel } from "../data/role-guide";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "RoleCard">;

export function RoleCardScreen({ navigation, route }: Props) {
  const role = findRoleGuide(route.params.roleId);
  const isFromLobby = route.params.source === "lobby";
  return (
    <ScreenShell scene="role" headerTitle="ROL DETAYI" showBottomNav={false}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Image source={ROLE_ART[role.id]} style={styles.art} />
          <View style={styles.body}>
            <Text style={styles.title}>{role.name.toUpperCase()}</Text>
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Ionicons name="shield-outline" size={14} color={colors.secondary} />
                <Text style={styles.chipText}>Takım: {teamLabel(role.team)}</Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="moon-outline" size={14} color={colors.secondary} />
                <Text style={styles.chipText}>{activationLabel(role.activation)}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Rol Açıklaması</Text>
              <Text style={styles.blockText}>{role.description}</Text>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Kazanma Şartı</Text>
              <Text style={styles.blockText}>{role.winCondition}</Text>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Özel Kurallar</Text>
              {role.specialRules.map((rule) => (
                <View key={rule} style={styles.ruleRow}>
                  <Text style={styles.ruleDot}>•</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Strateji İpucu</Text>
              <Text style={styles.blockText}>{role.strategyTip}</Text>
            </View>

            {!role.inCurrentBuild ? (
              <View style={styles.soonBox}>
                <Text style={styles.soonTitle}>Yakında Aktif</Text>
                <Text style={styles.soonText}>
                  Bu rol kartı hazır, ancak mevcut sürümde oyun motoruna henüz açılmadı.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <PrimaryButton
          label="Rollere Dön"
          iconName="arrow-back-outline"
          variant="charcoal"
          onPress={() => navigation.navigate("RoleGuide", { source: isFromLobby ? "lobby" : "menu", focusActiveOnly: isFromLobby })}
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  content: {
    paddingBottom: spacing.xl,
    gap: 14
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(15,15,17,0.88)"
  },
  art: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#0a0a0a"
  },
  body: {
    padding: spacing.lg,
    gap: 12
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 50 / 1.5,
    textAlign: "center",
    letterSpacing: 1
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center"
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.4)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(40,33,20,0.5)"
  },
  chipText: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  block: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.2)",
    borderRadius: 12,
    backgroundColor: "rgba(9,9,11,0.75)",
    padding: 12,
    gap: 8
  },
  blockTitle: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 12,
    letterSpacing: 1.3
  },
  blockText: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 16,
    lineHeight: 24
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6
  },
  ruleDot: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    marginTop: 1
  },
  ruleText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 15,
    lineHeight: 22
  },
  soonBox: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 12,
    backgroundColor: "rgba(38,35,35,0.7)",
    padding: 12,
    gap: 6
  },
  soonTitle: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 12,
    letterSpacing: 1.2
  },
  soonText: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 20
  }
});
