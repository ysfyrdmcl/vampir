import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { LiquidGlassSurface } from "../glass";
import { ROLE_THUMB_ART, activationLabel, findRoleGuide, teamLabel, type RoleGuideId } from "../data/role-guide";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "RoleCard">;
type IconName = keyof typeof Ionicons.glyphMap;

export function RoleCardScreen({ navigation, route }: Props) {
  const role = findRoleGuide(route.params.roleId);
  const isFromLobby = route.params.source === "lobby";
  const accent = roleAccent(role.id);

  return (
    <ScreenShell scene="role" headerTitle="ROL DETAYI" showBottomNav={false}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LiquidGlassSurface depth="raised" intensity="medium" radius={14} style={[styles.hero, { borderColor: `${accent}66` }]} contentStyle={styles.heroContent} tone={role.id === "Vampire" ? "crimson" : "obsidian"} glow>
          <View style={[styles.artFrame, { borderColor: `${accent}55` }]}>
            <Image source={ROLE_THUMB_ART[role.id]} style={styles.art} resizeMode="cover" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>{teamLabel(role.team)}</Text>
            <Text style={styles.title}>{role.name}</Text>
            <Text style={styles.shortDesc}>{role.shortDescription}</Text>
          </View>
          <View style={styles.chipRow}>
            <InfoChip icon={roleIcon(role.id)} label={activationLabel(role.activation)} accent={accent} />
            <InfoChip icon="people-outline" label={`Min ${role.minPlayers}`} accent={accent} />
            {!role.inCurrentBuild ? <InfoChip icon="construct-outline" label="Yakında" accent={colors.textDim} /> : null}
          </View>
        </LiquidGlassSurface>

        <InfoBlock icon="book-outline" title="Rol Açıklaması" body={role.description} accent={accent} />
        <InfoBlock icon="flag-outline" title="Kazanma Şartı" body={role.winCondition} accent={accent} />

        <LiquidGlassSurface depth="flat" intensity="subtle" radius={12} style={styles.block} contentStyle={styles.blockContent} tone="obsidian">
          <View style={styles.blockHeader}>
            <View style={[styles.blockIcon, { borderColor: `${accent}44`, backgroundColor: `${accent}18` }]}>
              <Ionicons name="list-outline" size={17} color={accent} />
            </View>
            <Text style={styles.blockTitle}>Özel Kurallar</Text>
          </View>
          <View style={styles.ruleList}>
            {role.specialRules.map((rule) => (
              <View key={rule} style={styles.ruleRow}>
                <Ionicons name="ellipse" size={6} color={accent} style={styles.ruleDot} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </LiquidGlassSurface>

        <InfoBlock icon="bulb-outline" title="Strateji İpucu" body={role.strategyTip} accent={accent} />

        {!role.inCurrentBuild ? (
          <LiquidGlassSurface depth="flat" intensity="subtle" radius={12} style={styles.soonBox} contentStyle={styles.soonContent} tone="obsidian">
            <Ionicons name="construct-outline" size={18} color={colors.textDim} />
            <Text style={styles.soonText}>Bu rol kartı hazır, ancak mevcut sürümde oyun motoruna henüz açılmadı.</Text>
          </LiquidGlassSurface>
        ) : null}

        <PrimaryButton
          label="Rollere Dön"
          iconName="arrow-back-outline"
          variant="ghost"
          compact
          onPress={() => navigation.navigate("RoleGuide", { source: isFromLobby ? "lobby" : "menu", focusActiveOnly: isFromLobby })}
          style={styles.backAction}
        />
      </ScrollView>
    </ScreenShell>
  );
}

function InfoChip({ icon, label, accent }: { icon: IconName; label: string; accent: string }) {
  return (
    <View style={[styles.chip, { borderColor: `${accent}44`, backgroundColor: `${accent}14` }]}>
      <Ionicons name={icon} size={13} color={accent} />
      <Text style={[styles.chipText, { color: accent }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function InfoBlock({ icon, title, body, accent }: { icon: IconName; title: string; body: string; accent: string }) {
  return (
    <LiquidGlassSurface depth="flat" intensity="subtle" radius={12} style={styles.block} contentStyle={styles.blockContent} tone="obsidian">
      <View style={styles.blockHeader}>
        <View style={[styles.blockIcon, { borderColor: `${accent}44`, backgroundColor: `${accent}18` }]}>
          <Ionicons name={icon} size={17} color={accent} />
        </View>
        <Text style={styles.blockTitle}>{title}</Text>
      </View>
      <Text style={styles.blockText}>{body}</Text>
    </LiquidGlassSurface>
  );
}

function roleIcon(roleId: RoleGuideId): IconName {
  if (roleId === "Vampire") return "moon-outline";
  if (roleId === "Detective") return "search-outline";
  if (roleId === "Doctor") return "medkit-outline";
  if (roleId === "Hunter") return "flash-outline";
  if (roleId === "Mayor") return "ribbon-outline";
  if (roleId === "Guard") return "shield-checkmark-outline";
  if (roleId === "Lover") return "heart-outline";
  return "people-outline";
}

function roleAccent(roleId: RoleGuideId): string {
  if (roleId === "Vampire") return colors.primaryBright;
  if (roleId === "Detective") return "#d5a932";
  if (roleId === "Doctor") return "#7ecab5";
  if (roleId === "Hunter") return "#e88f4d";
  if (roleId === "Guard") return "#d7b16b";
  if (roleId === "Lover") return "#e7829d";
  if (roleId === "Mayor") return colors.secondary;
  return colors.text;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  content: {
    paddingBottom: spacing.xl,
    gap: 12
  },
  hero: {
    minHeight: 178
  },
  heroContent: {
    padding: spacing.md,
    gap: 12
  },
  artFrame: {
    width: 132,
    height: 98,
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "center",
    borderWidth: 1,
    backgroundColor: "#090909"
  },
  art: {
    width: "100%",
    height: "100%"
  },
  heroCopy: {
    alignItems: "center",
    gap: 4
  },
  kicker: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 31,
    lineHeight: 36,
    textAlign: "center"
  },
  shortDesc: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 7
  },
  chip: {
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  chipText: {
    fontFamily: typography.sansBold,
    fontSize: 11
  },
  block: {
    minHeight: 86
  },
  blockContent: {
    padding: 12,
    gap: 9
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  blockIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  blockTitle: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  blockText: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 14,
    lineHeight: 21
  },
  ruleList: {
    gap: 7
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  ruleDot: {
    marginTop: 7
  },
  ruleText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 20
  },
  soonBox: {
    minHeight: 54
  },
  soonContent: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  soonText: {
    flex: 1,
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 19
  },
  backAction: {
    alignSelf: "center",
    minWidth: 156,
    maxWidth: 220,
    width: "52%"
  }
});
