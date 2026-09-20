import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { LiquidGlassSurface } from "../glass";
import {
  ROLE_GUIDE,
  ROLE_THUMB_ART,
  activationLabel,
  getActiveRoleIdsForRoom,
  type RoleGuideId,
  teamLabel,
  type RoleGuideDefinition
} from "../data/role-guide";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "RoleGuide">;
type IconName = keyof typeof Ionicons.glyphMap;

export function RoleGuideScreen({ navigation, route }: Props) {
  const roomState = useGameStore((s) => s.roomState);
  const playerCount = roomState?.players.length ?? 0;
  const rolePreset = useGameStore((s) => s.roomState?.rolePreset ?? s.rolePreset);
  const baseActiveRoleIds = getActiveRoleIdsForRoom(playerCount || 4, rolePreset);
  const withMayor: RoleGuideId[] =
    rolePreset === "socialChaos" && roomState?.rules?.mayorEnabled && playerCount >= 9
      ? [...new Set<RoleGuideId>([...baseActiveRoleIds, "Mayor"])]
      : baseActiveRoleIds;
  const activeRoleIds: RoleGuideId[] =
    roomState?.rules?.loversEnabled && playerCount >= 9
      ? [...new Set<RoleGuideId>([...withMayor, "Lover"])]
      : withMayor;
  const focusActiveOnly = route.params?.focusActiveOnly ?? false;
  const isFromLobby = route.params?.source === "lobby";
  const roles = focusActiveOnly ? ROLE_GUIDE.filter((role) => activeRoleIds.includes(role.id)) : ROLE_GUIDE;

  return (
    <ScreenShell scene={roomState ? "lobby" : "home"} headerTitle="ROLLER" showBottomNav={false}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LiquidGlassSurface depth="raised" intensity="medium" radius={14} style={styles.hero} contentStyle={styles.heroContent} tone="obsidian">
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="library-outline" size={24} color={colors.secondary} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>Kılavuz</Text>
              <Text style={styles.title}>Roller ve Kurallar</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <InfoPill icon="people-outline" label={`${playerCount || 4} oyuncu`} />
            <InfoPill icon="albums-outline" label={`${roles.length} kart`} />
            {isFromLobby ? <InfoPill icon="checkmark-circle-outline" label={`${activeRoleIds.length} aktif`} /> : null}
          </View>
        </LiquidGlassSurface>

        <View style={styles.ruleGrid}>
          <RuleTile icon="moon-outline" label="Gece" value="Rol aksiyonları sırayla çözülür." />
          <RuleTile icon="checkbox-outline" label="Gündüz" value="Tartışma ve oylama köy kararını belirler." />
          <RuleTile
            icon="ribbon-outline"
            label="Başkanlık"
            value={activeRoleIds.includes("Mayor") ? "Aktif, başkanın gündüz oyu 2 sayılır." : "Bu oda kurulumunda devre dışı."}
          />
          <RuleTile
            icon="heart-outline"
            label="Aşıklar"
            value={activeRoleIds.includes("Lover") ? "Aktif, bağlı oyuncular birlikte elenir." : "Bu oda kurulumunda devre dışı."}
          />
        </View>

        {isFromLobby ? (
          <LiquidGlassSurface depth="flat" intensity="subtle" radius={12} style={styles.activeBox} contentStyle={styles.activeBoxContent} tone="gold">
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bu Odada Aktif</Text>
              <Text style={styles.sectionMeta}>{playerCount} oyuncu</Text>
            </View>
            <View style={styles.activeWrap}>
              {activeRoleIds.map((roleId) => {
                const role = ROLE_GUIDE.find((item) => item.id === roleId);
                if (!role) return null;
                return (
                  <View key={roleId} style={styles.activeChip}>
                    <Ionicons name={roleIcon(role.id)} size={13} color={roleAccent(role.id)} />
                    <Text style={styles.activeChipText}>{role.name}</Text>
                  </View>
                );
              })}
            </View>
          </LiquidGlassSurface>
        ) : null}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{focusActiveOnly ? "Aktif Rol Kartları" : "Tüm Rol Kartları"}</Text>
          <Text style={styles.sectionMeta}>{roles.length} rol</Text>
        </View>
        <View style={styles.list}>
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              isActive={isFromLobby && activeRoleIds.includes(role.id)}
              showActiveState={isFromLobby}
              onPress={() => navigation.navigate("RoleCard", { roleId: role.id, source: isFromLobby ? "lobby" : "menu" })}
            />
          ))}
        </View>
        <PrimaryButton
          label={isFromLobby ? "Lobiye Dön" : "Menüye Dön"}
          iconName="arrow-back-outline"
          variant="ghost"
          compact
          onPress={() => navigation.navigate(isFromLobby ? "Lobby" : "Welcome")}
          style={styles.backAction}
        />
      </ScrollView>
    </ScreenShell>
  );
}

function InfoPill({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={13} color={colors.secondary} />
      <Text style={styles.infoPillText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function RuleTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <LiquidGlassSurface depth="flat" intensity="subtle" radius={10} style={styles.ruleTile} contentStyle={styles.ruleTileContent} tone="obsidian">
      <View style={styles.ruleIcon}>
        <Ionicons name={icon} size={18} color={colors.secondary} />
      </View>
      <View style={styles.ruleCopy}>
        <Text style={styles.ruleLabel}>{label}</Text>
        <Text style={styles.ruleValue}>{value}</Text>
      </View>
    </LiquidGlassSurface>
  );
}

function RoleRow({
  role,
  isActive,
  showActiveState,
  onPress
}: {
  role: RoleGuideDefinition;
  isActive: boolean;
  showActiveState: boolean;
  onPress: () => void;
}) {
  const accent = roleAccent(role.id);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cardPressable, pressed ? styles.cardPressed : null]}>
      <LiquidGlassSurface
        depth={isActive ? "raised" : "flat"}
        intensity={isActive ? "medium" : "subtle"}
        radius={12}
        style={[styles.card, isActive ? { borderColor: `${accent}66` } : null]}
        contentStyle={styles.cardContent}
        tone={role.id === "Vampire" ? "crimson" : isActive ? "gold" : "obsidian"}
        glow={isActive}
      >
        <View style={[styles.thumbFrame, { borderColor: `${accent}55` }]}>
          <Image source={ROLE_THUMB_ART[role.id]} style={styles.thumb} resizeMode="cover" />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.roleNameRow}>
              <View style={[styles.roleIcon, { backgroundColor: `${accent}22`, borderColor: `${accent}55` }]}>
                <Ionicons name={roleIcon(role.id)} size={15} color={accent} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>{role.name}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={colors.secondary} />
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {role.shortDescription}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{teamLabel(role.team)}</Text>
            <Text style={styles.meta}>{activationLabel(role.activation)}</Text>
            <Text style={styles.meta}>Min {role.minPlayers}</Text>
            {!role.inCurrentBuild ? <Text style={styles.metaMuted}>Yakında</Text> : null}
          </View>
          {showActiveState ? (
            <Text style={[styles.statusPill, isActive ? styles.statusOn : styles.statusOff]} numberOfLines={1}>
              {isActive ? "Bu odada aktif" : "Bu odada yok"}
            </Text>
          ) : null}
        </View>
      </LiquidGlassSurface>
    </Pressable>
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
    minHeight: 116
  },
  heroContent: {
    padding: spacing.md,
    gap: 12
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.36)",
    backgroundColor: "rgba(48,43,22,0.42)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: {
    flex: 1,
    minWidth: 0
  },
  kicker: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 28,
    lineHeight: 34
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  infoPill: {
    minHeight: 28,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)",
    borderRadius: 999,
    backgroundColor: "rgba(33,29,16,0.44)",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  infoPillText: {
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    fontSize: 11
  },
  ruleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  ruleTile: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 82
  },
  ruleTileContent: {
    padding: 10,
    flexDirection: "row",
    gap: 8
  },
  ruleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    backgroundColor: "rgba(48,43,22,0.34)",
    alignItems: "center",
    justifyContent: "center"
  },
  ruleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  ruleLabel: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11
  },
  ruleValue: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    lineHeight: 15
  },
  activeBox: {
    minHeight: 76
  },
  activeBoxContent: {
    padding: 10,
    gap: 8
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 2,
    marginTop: 2
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  sectionMeta: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  activeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  activeChip: {
    minHeight: 28,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    backgroundColor: "rgba(48,43,22,0.54)",
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  activeChipText: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  list: {
    gap: 8
  },
  cardPressable: {
    width: "100%"
  },
  cardPressed: {
    opacity: 0.9
  },
  card: {
    minHeight: 104
  },
  cardContent: {
    padding: 8,
    flexDirection: "row",
    gap: 10
  },
  thumbFrame: {
    width: 74,
    height: 74,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#090909",
    borderWidth: 1
  },
  thumb: {
    width: "100%",
    height: "100%"
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 5
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  roleNameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  roleIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 17,
    lineHeight: 21
  },
  cardDesc: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 17
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5
  },
  meta: {
    color: colors.secondary,
    backgroundColor: "rgba(233,195,73,0.10)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontFamily: typography.sansBold,
    fontSize: 9.5
  },
  metaMuted: {
    color: colors.textDim,
    backgroundColor: "rgba(170,137,132,0.12)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontFamily: typography.sansBold,
    fontSize: 9.5
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontFamily: typography.sansMedium,
    fontSize: 10
  },
  statusOn: {
    backgroundColor: "rgba(39,190,104,0.18)",
    color: colors.success
  },
  statusOff: {
    backgroundColor: "rgba(170,137,132,0.16)",
    color: colors.textDim
  },
  backAction: {
    alignSelf: "center",
    minWidth: 156,
    maxWidth: 220,
    width: "52%"
  }
});
