import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import {
  ROLE_ART,
  ROLE_GUIDE,
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

export function RoleGuideScreen({ navigation, route }: Props) {
  const roomState = useGameStore((s) => s.roomState);
  const playerCount = roomState?.players.length ?? 0;
  const rolePreset = useGameStore((s) => s.rolePreset);
  const baseActiveRoleIds = getActiveRoleIdsForRoom(playerCount || 4, rolePreset);
  const withMayor: RoleGuideId[] =
    roomState?.rules?.mayorEnabled && (playerCount || 0) >= 9
      ? [...new Set<RoleGuideId>([...baseActiveRoleIds, "Mayor"])]
      : baseActiveRoleIds;
  const activeRoleIds: RoleGuideId[] =
    roomState?.rules?.loversEnabled && (playerCount || 0) >= 9
      ? [...new Set<RoleGuideId>([...withMayor, "Lover"])]
      : withMayor;
  const focusActiveOnly = route.params?.focusActiveOnly ?? false;
  const isFromLobby = route.params?.source === "lobby";
  const roles = focusActiveOnly ? ROLE_GUIDE.filter((role) => activeRoleIds.includes(role.id)) : ROLE_GUIDE;

  return (
    <ScreenShell scene={roomState ? "lobby" : "home"} headerTitle="ROLLER VE KURALLAR" showBottomNav={false}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.title}>Roller ve Kurallar</Text>
        </View>

        {isFromLobby ? (
          <View style={styles.activeBox}>
            <Text style={styles.activeTitle}>Bu Odada Aktif Roller</Text>
            <View style={styles.activeWrap}>
              {activeRoleIds.map((roleId) => {
                const role = ROLE_GUIDE.find((item) => item.id === roleId);
                if (!role) return null;
                return (
                  <View key={roleId} style={styles.activeChip}>
                    <Text style={styles.activeChipText}>{role.name}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.activeHint}>{`Oyuncu sayısı: ${playerCount}.`}</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              isActive={activeRoleIds.includes(role.id)}
              showActiveState={isFromLobby}
              onPress={() => navigation.navigate("RoleCard", { roleId: role.id, source: isFromLobby ? "lobby" : "menu" })}
            />
          ))}
        </View>
        <PrimaryButton
          label={isFromLobby ? "Lobiye Dön" : "Menüye Dön"}
          iconName="arrow-back-outline"
          variant="charcoal"
          onPress={() => navigation.navigate(isFromLobby ? "Lobby" : "Welcome")}
        />
      </ScrollView>
    </ScreenShell>
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
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.thumbFrame}>
        <Image source={ROLE_ART[role.id]} style={styles.thumb} resizeMode="cover" />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{role.name}</Text>
          {!role.inCurrentBuild ? <Text style={styles.badgeSoon}>YAKINDA</Text> : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{teamLabel(role.team)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.meta}>{activationLabel(role.activation)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.meta}>Min {role.minPlayers}</Text>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {role.shortDescription}
        </Text>
        <View style={styles.statusRow}>
          {showActiveState ? (
            <Text style={[styles.statusPill, isActive ? styles.statusOn : styles.statusOff]}>
              {isActive ? "Bu odada aktif" : "Bu odada aktif değil"}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward-outline" size={16} color={colors.textDim} />
        </View>
      </View>
    </Pressable>
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
  hero: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    borderRadius: 14,
    backgroundColor: "rgba(20,20,22,0.86)",
    padding: spacing.lg,
    gap: 10
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 48 / 1.5,
    textAlign: "center"
  },
  desc: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: 16,
    lineHeight: 24
  },
  activeBox: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 14,
    backgroundColor: "rgba(12,12,14,0.8)",
    padding: spacing.md,
    gap: 8
  },
  activeTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    letterSpacing: 1.4,
    fontSize: 12
  },
  activeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  activeChip: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.5)",
    backgroundColor: "rgba(48,43,22,0.64)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  activeChipText: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  activeHint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  list: {
    gap: 10
  },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(17,16,18,0.9)",
    minHeight: 130
  },
  thumbFrame: {
    width: 106,
    height: 130,
    overflow: "hidden",
    backgroundColor: "#090909"
  },
  thumb: {
    width: "100%",
    height: "100%"
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 26 / 1.6
  },
  badgeSoon: {
    color: colors.backgroundDeep,
    backgroundColor: colors.textDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 10,
    fontFamily: typography.sansBold
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  meta: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  metaDot: {
    color: colors.textDim,
    fontSize: 10
  },
  cardDesc: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 40
  },
  statusRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  }
});
