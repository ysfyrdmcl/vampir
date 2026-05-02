import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ROLE_DEFINITIONS, buildRoleDeck } from "@vampir-koylu/shared";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { emitLeaveRoom, emitReadyToggle, emitStartRoom } from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toFriendlyErrorText } from "../ui/error-text";

type Props = NativeStackScreenProps<RootStackParamList, "Lobby">;

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toRoleLabel(role: string): string {
  if (role === "Vampire") return "Vampir";
  if (role === "Detective") return "Dedektif";
  if (role === "Doctor") return "Doktor";
  if (role === "Villager") return "Köylü";
  if (role === "Hunter") return "Avcı";
  if (role === "Guard") return "Gardiyan";
  return role;
}

export function LobbyScreen({ navigation }: Props) {
  const roomState = useGameStore((s) => s.roomState);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(errorCode);
  const me = useGameStore((s) => s.playerId);
  const phaseDurations = useGameStore((s) => s.phaseDurations);
  const setPhaseDurations = useGameStore((s) => s.setPhaseDurations);
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const rolePreset = useGameStore((s) => s.rolePreset);
  const setRolePreset = useGameStore((s) => s.setRolePreset);
  const roomRules = useGameStore((s) => s.roomRules);
  const setRoomRules = useGameStore((s) => s.setRoomRules);
  const [advancedRulesOpen, setAdvancedRulesOpen] = useState(false);

  const players = roomState?.players ?? [];
  const roomCode = roomState?.roomCode ?? "------";
  const minPlayers = roomState?.minPlayers ?? 4;
  const connectedPlayers = players.filter((p) => p.isConnected);
  const setupPlayerCount = Math.max(players.length, minPlayers);
  const activeRoleDeck = buildRoleDeck(setupPlayerCount, rolePreset);
  const activeRoleSet = new Set(activeRoleDeck);
  const hasDoctor = activeRoleSet.has("Doctor");
  const hasDetective = activeRoleSet.has("Detective");
  const hasMayorMechanic = rolePreset === "socialChaos" && setupPlayerCount >= ROLE_DEFINITIONS.Mayor.minPlayers;
  const hasLoversMechanic = rolePreset === "socialChaos" && setupPlayerCount >= ROLE_DEFINITIONS.Lover.minPlayers;
  const allConnectedReady = connectedPlayers.length >= minPlayers && connectedPlayers.every((p) => p.isReady);
  const mePlayer = players.find((p) => p.playerId === me);
  const meReady = Boolean(mePlayer?.isReady);

  const leaveRoom = () => {
    emitLeaveRoom();
    navigation.navigate("Welcome");
  };

  const copyRoomCode = async () => {
    await Clipboard.setStringAsync(roomCode);
    useGameStore.getState().setPrivateResultText("Oda kodu kopyalandı.");
  };

  const shareRoomCode = async () => {
    await Share.share({
      message: `Vampir Köylü odama katıl: ${roomCode}`
    });
  };

  const updateDuration = (key: keyof typeof phaseDurations, delta: number) => {
    if (key === "useSystemDefaults") return;
    const current = phaseDurations[key] as number;
    const next = Math.max(3, Math.min(180, current + delta));
    setPhaseDurations({ [key]: next });
  };

  return (
    <ScreenShell scene="lobby" headerTitle="GÜNDÜZ FAZI">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.codeBox} onPress={copyRoomCode}>
          <Text style={styles.codeLabel}>ODA KODU</Text>
          <Text style={styles.codeValue}>{roomCode}</Text>
          <Text style={styles.codeAction}>Dokun: Kopyala</Text>
        </Pressable>
        <Pressable style={styles.shareBtn} onPress={shareRoomCode}>
          <Ionicons name="share-social-outline" size={16} color={colors.text} />
          <Text style={styles.shareText}>Paylaş</Text>
        </Pressable>
        <Text style={styles.title}>Lobi</Text>
        <Text style={styles.subtitle}>
          <Ionicons name="people-outline" /> {players.length} Oyuncu
        </Text>

        <View style={styles.grid}>
          {players.length === 0 ? <Text style={styles.empty}>Oyuncular bağlanıyor...</Text> : null}
          {players.map((player) => {
            const isMe = player.playerId === me;
            return (
              <View key={player.playerId} style={[styles.playerCard, isMe ? styles.playerCardMe : null]}>
                {isMe ? <Text style={styles.meTag}>SEN</Text> : null}
                <View style={styles.avatar}>
                  <Text style={styles.avatarLabel}>{initialsFromName(player.nickname)}</Text>
                </View>
                <Text style={styles.name}>{player.nickname}</Text>
                <Text style={[styles.status, player.isConnected ? styles.statusConnected : styles.statusDisconnected]}>
                  ● {player.isConnected ? (player.isReady ? "Onayladı" : "Onay bekleniyor") : "Bağlantı koptu"}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
          <Text style={styles.infoText}>Oyun minimum {minPlayers} oyuncu ile başlar. Başlatmak için tüm bağlı oyuncuların onayı gerekir.</Text>
        </View>
        <View style={styles.infoBox}>
          <Ionicons name="list-outline" size={22} color={colors.textMuted} />
          <View style={styles.summaryWrap}>
            <Text style={styles.summaryTitle}>Kural Özeti</Text>
            <Text style={styles.summaryLine}>Rol Paketi: {rolePreset === "beginner" ? "Başlangıç" : rolePreset === "classicPlus" ? "Klasik+" : "Sosyal Kaos"}</Text>
            <Text style={styles.summaryLine}>Mod: {gameMode}</Text>
            <Text style={styles.summaryLine}>İlk Gece Ölüm: {roomRules.firstNightNoKill ? "Yok" : "Var"}</Text>
            <Text style={styles.summaryLine}>Elenen Rolü: {roomRules.revealEliminatedRole ? "Açık" : "Gizli"}</Text>
            <Text style={styles.summaryLine}>Beraberlik: {roomRules.tiePolicy === "RevoteThenNoExecution" ? "Tekrar oy, sonra kimse elenmez" : "Tekrar oy, sonra rastgele elenir"}</Text>
            <Text style={styles.summaryLine}>
              Aktif Roller: {activeRoleDeck.filter((role, index) => activeRoleDeck.indexOf(role) === index).map(toRoleLabel).join(", ")}
            </Text>
            {hasMayorMechanic ? <Text style={styles.summaryLine}>Başkanlık: {roomRules.mayorEnabled ? "Açık" : "Kapalı"}</Text> : null}
            {hasLoversMechanic ? <Text style={styles.summaryLine}>Aşıklar: {roomRules.loversEnabled ? "Açık" : "Kapalı"}</Text> : null}
          </View>
        </View>
        <View style={styles.readyRow}>
          <Text style={styles.readyText}>Onay: {connectedPlayers.filter((p) => p.isReady).length}/{connectedPlayers.length}</Text>
          <PrimaryButton
            label={meReady ? "Onayı Geri Al" : "Onay Ver"}
            iconName={meReady ? "close-circle-outline" : "checkmark-circle-outline"}
            variant={meReady ? "charcoal" : "blood"}
            onPress={() => emitReadyToggle(!meReady)}
            style={styles.readyBtn}
          />
        </View>
        <Pressable style={styles.roleGuideLink} onPress={() => navigation.navigate("RoleGuide", { focusActiveOnly: true, source: "lobby" })}>
          <Ionicons name="book-outline" size={16} color={colors.secondary} />
          <Text style={styles.roleGuideText}>Bu oyundaki roller</Text>
        </Pressable>

        <View style={styles.timingBox}>
          <Text style={styles.timingTitle}>Rol Paketi</Text>
          <View style={styles.modeRow}>
            {[
              { key: "beginner", label: "Başlangıç" },
              { key: "classicPlus", label: "Klasik+" },
              { key: "socialChaos", label: "Sosyal Kaos" }
            ].map((preset) => (
              <Pressable
                key={preset.key}
                style={[styles.modeChip, rolePreset === preset.key ? styles.modeChipActive : null]}
                onPress={() => setRolePreset(preset.key as typeof rolePreset)}
              >
                <Text style={[styles.modeText, rolePreset === preset.key ? styles.modeTextActive : null]}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.timingTitle}>Oyun Modu</Text>
          <View style={styles.modeRow}>
            {[
              { key: "Classic", label: "Klasik" },
              { key: "SafeFirstNight", label: "İlk Gece Güvenli" },
              { key: "FastParty", label: "Hızlı Parti" },
              { key: "MysteryVillage", label: "Gizemli Köy" }
            ].map((mode) => (
              <Pressable
                key={mode.key}
                style={[styles.modeChip, gameMode === mode.key ? styles.modeChipActive : null]}
                onPress={() => setGameMode(mode.key as typeof gameMode)}
              >
                <Text style={[styles.modeText, gameMode === mode.key ? styles.modeTextActive : null]}>{mode.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.timingTitle}>Oyun Süre Ayarları</Text>
          <View style={styles.timingModeRow}>
            <PrimaryButton
              label="Sistem Varsayılanı"
              variant={phaseDurations.useSystemDefaults ? "blood" : "outline"}
              onPress={() => setPhaseDurations({ useSystemDefaults: true })}
              style={styles.timingModeBtn}
            />
            <PrimaryButton
              label="Özel Süre"
              variant={!phaseDurations.useSystemDefaults ? "blood" : "outline"}
              onPress={() => setPhaseDurations({ useSystemDefaults: false })}
              style={styles.timingModeBtn}
            />
          </View>
          {!phaseDurations.useSystemDefaults ? (
            <View style={styles.timingList}>
              {[
                { key: "dayDiscussion", label: "Tartışma", value: phaseDurations.dayDiscussion },
                { key: "dayVote", label: "Oylama", value: phaseDurations.dayVote },
                { key: "vampireVote", label: "Vampir", value: phaseDurations.vampireVote },
                hasDetective ? { key: "detectiveInspect", label: "Dedektif", value: phaseDurations.detectiveInspect } : null,
                hasDoctor ? { key: "doctorProtect", label: "Doktor", value: phaseDurations.doctorProtect } : null
              ].filter((item): item is { key: keyof typeof phaseDurations; label: string; value: number } => Boolean(item)).map((item) => (
                <View key={item.key} style={styles.timingRow}>
                  <Text style={styles.timingLabel}>{item.label}</Text>
                  <View style={styles.timingAdjust}>
                    <Pressable style={styles.adjustBtn} onPress={() => updateDuration(item.key as keyof typeof phaseDurations, -5)}>
                      <Text style={styles.adjustText}>-</Text>
                    </Pressable>
                    <Text style={styles.timingValue}>{item.value}s</Text>
                    <Pressable style={styles.adjustBtn} onPress={() => updateDuration(item.key as keyof typeof phaseDurations, 5)}>
                      <Text style={styles.adjustText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable style={styles.advancedHeader} onPress={() => setAdvancedRulesOpen((prev) => !prev)}>
            <Text style={styles.timingTitle}>Gelişmiş Kurallar</Text>
            <Ionicons
              name={advancedRulesOpen ? "chevron-up-outline" : "chevron-down-outline"}
              size={18}
              color={colors.secondary}
            />
          </Pressable>
          {advancedRulesOpen ? (
            <View style={styles.ruleList}>
              <Text style={styles.ruleHint}>
                Bu bölüm yalnızca mevcut oyuncu sayısı ve rol paketinde etkisi olan kuralları gösterir.
              </Text>
              <Pressable style={styles.ruleRow} onPress={() => setRoomRules({ firstNightNoKill: !roomRules.firstNightNoKill })}>
                <Text style={styles.ruleLabel}>İlk gece ölüm yok</Text>
                <Text style={styles.ruleValue}>{roomRules.firstNightNoKill ? "Açık" : "Kapalı"}</Text>
              </Pressable>
              <Pressable style={styles.ruleRow} onPress={() => setRoomRules({ revealEliminatedRole: !roomRules.revealEliminatedRole })}>
                <Text style={styles.ruleLabel}>Elenen oyuncunun rolü açıklansın</Text>
                <Text style={styles.ruleValue}>{roomRules.revealEliminatedRole ? "Açık" : "Kapalı"}</Text>
              </Pressable>
              {hasDoctor ? (
                <>
                  <Pressable style={styles.ruleRow} onPress={() => setRoomRules({ allowDoctorSelfProtect: !roomRules.allowDoctorSelfProtect })}>
                    <Text style={styles.ruleLabel}>Doktor kendini koruyabilir</Text>
                    <Text style={styles.ruleValue}>{roomRules.allowDoctorSelfProtect ? "Açık" : "Kapalı"}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.ruleRow}
                    onPress={() =>
                      setRoomRules({
                        allowDoctorConsecutiveProtectSameTarget: !roomRules.allowDoctorConsecutiveProtectSameTarget
                      })
                    }
                  >
                    <Text style={styles.ruleLabel}>Doktor aynı hedefi üst üste koruyabilir</Text>
                    <Text style={styles.ruleValue}>{roomRules.allowDoctorConsecutiveProtectSameTarget ? "Açık" : "Kapalı"}</Text>
                  </Pressable>
                </>
              ) : null}
              {hasDetective ? (
                <Pressable
                  style={styles.ruleRow}
                  onPress={() =>
                    setRoomRules({
                      allowDetectiveRepeatInspectSameTarget: !roomRules.allowDetectiveRepeatInspectSameTarget
                    })
                  }
                >
                  <Text style={styles.ruleLabel}>Dedektif aynı kişiyi tekrar sorgulayabilir</Text>
                  <Text style={styles.ruleValue}>{roomRules.allowDetectiveRepeatInspectSameTarget ? "Açık" : "Kapalı"}</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.ruleRow}
                onPress={() =>
                  setRoomRules({
                    tiePolicy:
                      roomRules.tiePolicy === "RevoteThenNoExecution" ? "RevoteThenRandomExecution" : "RevoteThenNoExecution"
                  })
                }
              >
                <Text style={styles.ruleLabel}>Beraberlik kuralı</Text>
                <Text style={styles.ruleValue}>
                  {roomRules.tiePolicy === "RevoteThenNoExecution" ? "Yine eşitse kimse elenmez" : "Yine eşitse rastgele elenir"}
                </Text>
              </Pressable>
              <Pressable style={styles.ruleRow} onPress={() => setRoomRules({ noLynchEnabled: !roomRules.noLynchEnabled })}>
                <Text style={styles.ruleLabel}>Kimseyi gönderme (boş oy)</Text>
                <Text style={styles.ruleValue}>{roomRules.noLynchEnabled ? "Açık" : "Kapalı"}</Text>
              </Pressable>
              {hasMayorMechanic ? (
                <Pressable style={styles.ruleRow} onPress={() => setRoomRules({ mayorEnabled: !roomRules.mayorEnabled })}>
                  <Text style={styles.ruleLabel}>Belediye başkanı seçimi aktif</Text>
                  <Text style={styles.ruleValue}>{roomRules.mayorEnabled ? "Açık" : "Kapalı"}</Text>
                </Pressable>
              ) : null}
              {hasLoversMechanic ? (
                <Pressable style={styles.ruleRow} onPress={() => setRoomRules({ loversEnabled: !roomRules.loversEnabled })}>
                  <Text style={styles.ruleLabel}>Aşıklar bağı aktif</Text>
                  <Text style={styles.ruleValue}>{roomRules.loversEnabled ? "Açık" : "Kapalı"}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        <PrimaryButton
          label={allConnectedReady ? "Oyunu Başlat" : "Tüm Oyuncuların Onayı Bekleniyor"}
          iconName="checkmark-circle-outline"
          onPress={emitStartRoom}
          disabled={!allConnectedReady}
        />
        <Pressable onPress={leaveRoom}>
          <Text style={styles.leave}>Lobiden ayrıl</Text>
        </Pressable>
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
  codeBox: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    backgroundColor: "rgba(25,25,25,0.82)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: "center"
  },
  codeLabel: {
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    letterSpacing: 2,
    fontSize: 12
  },
  codeValue: {
    color: colors.secondary,
    fontFamily: typography.serif,
    fontSize: 48 / 1.4,
    letterSpacing: 2.6
  },
  codeAction: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  shareBtn: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(20,20,20,0.8)"
  },
  shareText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 62 / 1.5,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    textAlign: "center",
    fontSize: 32 / 1.8
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10
  },
  playerCard: {
    width: "48.5%",
    minHeight: 172,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    padding: 12,
    gap: 8,
    backgroundColor: colors.surfaceGlow
  },
  playerCardMe: {
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  meTag: {
    alignSelf: "flex-end",
    color: colors.backgroundDeep,
    backgroundColor: colors.secondary,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    fontFamily: typography.sansBold
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.55)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,8,8,0.92)"
  },
  avatarLabel: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 22
  },
  name: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 34 / 1.8
  },
  status: {
    fontFamily: typography.sansMedium,
    fontSize: 15
  },
  statusConnected: {
    color: colors.secondary
  },
  statusDisconnected: {
    color: colors.danger
  },
  empty: {
    color: colors.textDim,
    fontFamily: typography.sansMedium
  },
  infoBox: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(18,19,21,0.86)"
  },
  timingBox: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(18,19,21,0.86)",
    gap: 10
  },
  timingTitle: {
    color: colors.secondary,
    fontFamily: typography.serifSemi,
    fontSize: 21
  },
  timingModeRow: {
    flexDirection: "row",
    gap: 8
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  modeChip: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(12,12,14,0.82)"
  },
  modeChipActive: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright
  },
  modeText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  modeTextActive: {
    color: colors.parchmentText
  },
  timingModeBtn: {
    flex: 1
  },
  timingList: {
    gap: 8
  },
  timingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  ruleList: {
    gap: 7
  },
  ruleHint: {
    color: colors.textDim,
    fontFamily: typography.serifRegular,
    fontSize: 13,
    lineHeight: 19
  },
  advancedHeader: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(12,12,14,0.8)"
  },
  ruleRow: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(12,12,14,0.8)"
  },
  ruleLabel: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    flex: 1,
    paddingRight: 8
  },
  ruleValue: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11,
    maxWidth: 160,
    textAlign: "right"
  },
  timingLabel: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 15
  },
  timingAdjust: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  adjustBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.5)",
    alignItems: "center",
    justifyContent: "center"
  },
  adjustText: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 18
  },
  timingValue: {
    width: 56,
    textAlign: "center",
    color: colors.secondary,
    fontFamily: typography.sansBold
  },
  infoText: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.sans,
    fontSize: 16,
    lineHeight: 24
  },
  summaryWrap: {
    flex: 1,
    gap: 2
  },
  summaryTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  summaryLine: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  readyRow: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(18,19,21,0.86)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  readyText: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 14
  },
  readyBtn: {
    minWidth: 140
  },
  roleGuideLink: {
    marginTop: -2,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.3)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(33,29,16,0.72)"
  },
  roleGuideText: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  error: {
    color: colors.danger,
    fontFamily: typography.sansMedium
  },
  leave: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    textDecorationLine: "underline"
  }
});
