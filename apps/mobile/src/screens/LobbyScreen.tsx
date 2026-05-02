import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ROLE_DEFINITIONS, ROLE_PRESETS, buildRoleDeck, type GameMode, type RoleDefinitionId, type RolePresetId, type RuleSettings } from "@vampir-koylu/shared";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { ConfirmActionSheet } from "../components/ConfirmActionSheet";
import { PlayerRosterCard } from "../components/PlayerRosterCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { RoomCodeCard } from "../components/RoomCodeCard";
import { ScreenShell } from "../components/ScreenShell";
import { StatusBadge } from "../components/StatusBadge";
import { emitLeaveRoom, emitReadyToggle, emitRoomConfigUpdate, emitStartRoom } from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toFriendlyErrorText } from "../ui/error-text";

type Props = NativeStackScreenProps<RootStackParamList, "Lobby">;

function toRolePresetLabel(preset: string): string {
  if (preset === "beginner") return "Başlangıç";
  if (preset === "classicPlus") return "Klasik+";
  return "Sosyal Kaos";
}

function toGameModeLabel(mode: string): string {
  if (mode === "Classic") return "Klasik";
  if (mode === "SafeFirstNight") return "İlk Gece Güvenli";
  if (mode === "FastParty") return "Hızlı Parti";
  if (mode === "MysteryVillage") return "Gizemli Köy";
  return mode;
}

function rolePhaseLabel(roleId: RoleDefinitionId): string {
  const phase = ROLE_DEFINITIONS[roleId].phase;
  if (phase === "night") return "Gece";
  if (phase === "day") return "Gündüz";
  if (phase === "onDeath") return "Ölünce";
  return "Pasif";
}

function roleTeamLabel(roleId: RoleDefinitionId): string {
  const team = ROLE_DEFINITIONS[roleId].team;
  if (team === "Vampire") return "Vampir";
  if (team === "Village") return "Köy";
  if (team === "Civic") return "Makam";
  return "Bağ";
}

function rolePreview(preset: RolePresetId, playerCount: number, rules: RuleSettings) {
  const deck = buildRoleDeck(playerCount, preset);
  const countByRole = new Map<RoleDefinitionId, number>();
  for (const role of deck) {
    countByRole.set(role, (countByRole.get(role) ?? 0) + 1);
  }
  const ids: RoleDefinitionId[] = Array.from(new Set(deck)) as RoleDefinitionId[];
  if (preset === "socialChaos" && playerCount >= ROLE_DEFINITIONS.Mayor.minPlayers && rules.mayorEnabled) ids.push("Mayor");
  if (preset === "socialChaos" && playerCount >= ROLE_DEFINITIONS.Lover.minPlayers && rules.loversEnabled) ids.push("Lover");
  return ids.map((id) => ({
    id,
    count: countByRole.get(id) ?? 0,
    definition: ROLE_DEFINITIONS[id]
  }));
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
  const setRoomState = useGameStore((s) => s.setRoomState);
  const [advancedRulesOpen, setAdvancedRulesOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [roleInfoOpen, setRoleInfoOpen] = useState(false);
  const [previewPreset, setPreviewPreset] = useState<RolePresetId>(rolePreset);

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
  const readyCount = connectedPlayers.filter((p) => p.isReady).length;
  const isHost = roomState?.hostPlayerId ? roomState.hostPlayerId === me : players[0]?.playerId === me;
  const activeRolePreview = rolePreview(rolePreset, setupPlayerCount, roomRules);
  const modalRolePreview = rolePreview(previewPreset, setupPlayerCount, roomRules);

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
    emitRoomConfigUpdate();
  };
  const updateRolePreset = (nextPreset: RolePresetId) => {
    setRolePreset(nextPreset);
    setPreviewPreset(nextPreset);
    setRoleInfoOpen(true);
    emitRoomConfigUpdate();
  };
  const updateGameMode = (nextMode: GameMode) => {
    setGameMode(nextMode);
    emitRoomConfigUpdate();
  };
  const updateRules = (updater: Partial<RuleSettings>) => {
    setRoomRules(updater);
    emitRoomConfigUpdate();
  };
  const updateDurationMode = (useSystemDefaults: boolean) => {
    setPhaseDurations({ useSystemDefaults });
    emitRoomConfigUpdate();
  };
  const toggleReady = () => {
    const nextReady = !meReady;
    if (roomState && me) {
      setRoomState({
        ...roomState,
        players: roomState.players.map((player) =>
          player.playerId === me ? { ...player, isReady: nextReady } : player
        )
      });
    }
    emitReadyToggle(nextReady);
  };
  const startDisabledReason =
    connectedPlayers.length < minPlayers
      ? `Oyunu başlatmak için en az ${minPlayers} bağlı oyuncu gerekli.`
      : allConnectedReady
        ? null
        : "Tüm bağlı oyuncular onay vermelidir.";

  return (
    <ScreenShell scene="lobby" headerTitle="LOBİ">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <RoomCodeCard roomCode={roomCode} onCopy={copyRoomCode} onShare={shareRoomCode} />

        <View style={styles.lobbyHeader}>
          <View style={styles.lobbyHeaderIcon}>
            <Ionicons name="people-outline" size={24} color={colors.secondary} />
          </View>
          <View style={styles.lobbyHeaderText}>
            <Text style={styles.title}>Lobi</Text>
            <Text style={styles.subtitle}>{connectedPlayers.length}/{minPlayers} bağlı oyuncu hazır bekliyor</Text>
          </View>
          <StatusBadge label={`${readyCount}/${connectedPlayers.length} Onay`} tone={allConnectedReady ? "ready" : "pending"} compact />
        </View>

        <PlayerRosterCard players={players} mePlayerId={me} />

        <View style={styles.readyPanel}>
          <View style={styles.readyCopy}>
            <Text style={styles.readyTitle}>{meReady ? "Onayın verildi" : "Oyuna hazır mısın?"}</Text>
            <Text style={styles.readyHint}>Başlatmak için minimum {minPlayers} bağlı oyuncu ve herkesin onayı gerekir.</Text>
          </View>
          <Pressable
            style={[styles.readyToggle, meReady ? styles.readyToggleActive : null]}
            onPress={toggleReady}
          >
            <Ionicons
              name={meReady ? "close-circle-outline" : "checkmark-circle-outline"}
              size={18}
              color={meReady ? colors.parchmentText : colors.text}
            />
            <Text style={[styles.readyToggleText, meReady ? styles.readyToggleTextActive : null]}>
              {meReady ? "Geri Al" : "Onay Ver"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="list-outline" size={22} color={colors.textMuted} />
          <View style={styles.summaryWrap}>
            <Text style={styles.summaryTitle}>Kural Özeti</Text>
            <Text style={styles.summaryLine}>Rol Paketi: {toRolePresetLabel(rolePreset)}</Text>
            <Text style={styles.summaryLine}>Mod: {toGameModeLabel(gameMode)}</Text>
            <Text style={styles.summaryLine}>İlk Gece Ölüm: {roomRules.firstNightNoKill ? "Yok" : "Var"}</Text>
            <Text style={styles.summaryLine}>Elenen Rolü: {roomRules.revealEliminatedRole ? "Açık" : "Gizli"}</Text>
            <Text style={styles.summaryLine}>Beraberlik: {roomRules.tiePolicy === "RevoteThenNoExecution" ? "Tekrar oy, sonra kimse elenmez" : "Tekrar oy, sonra rastgele elenir"}</Text>
            {hasMayorMechanic ? <Text style={styles.summaryLine}>Başkanlık: {roomRules.mayorEnabled ? "Açık" : "Kapalı"}</Text> : null}
            {hasLoversMechanic ? <Text style={styles.summaryLine}>Aşıklar: {roomRules.loversEnabled ? "Açık" : "Kapalı"}</Text> : null}
          </View>
        </View>

        <View style={styles.rolePreviewBox}>
          <View style={styles.sectionHeader}>
            <Text style={styles.summaryTitle}>Aktif Roller</Text>
            <StatusBadge label={`${setupPlayerCount} kişilik`} tone="neutral" compact />
          </View>
          <View style={styles.rolePreviewGrid}>
            {activeRolePreview.map((item) => (
              <View key={item.id} style={styles.roleMiniCard}>
                <View style={styles.roleMiniTop}>
                  <Text style={styles.roleMiniName}>{item.definition.name}</Text>
                  <Text style={styles.roleMiniCount}>{item.count ? `${item.count}x` : "Mekanik"}</Text>
                </View>
                <Text style={styles.roleMiniMeta}>{roleTeamLabel(item.id)} · {rolePhaseLabel(item.id)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.roleGuideLink} onPress={() => navigation.navigate("RoleGuide", { focusActiveOnly: true, source: "lobby" })}>
          <Ionicons name="book-outline" size={16} color={colors.secondary} />
          <Text style={styles.roleGuideText}>Bu oyundaki roller</Text>
        </Pressable>

        {isHost ? (
        <View style={styles.timingBox}>
          <View style={styles.sectionHeader}>
            <Text style={styles.timingTitle}>Oda Ayarları</Text>
            <StatusBadge label="Yönetici" tone="ready" compact />
          </View>
          <Text style={styles.timingTitle}>Rol Paketi</Text>
          <Text style={styles.settingHint}>{ROLE_PRESETS[rolePreset].description}</Text>
          <View style={styles.modeRow}>
            {[
              { key: "beginner", label: "Başlangıç" },
              { key: "classicPlus", label: "Klasik+" },
              { key: "socialChaos", label: "Sosyal Kaos" }
            ].map((preset) => (
              <Pressable
                key={preset.key}
                style={[styles.modeChip, rolePreset === preset.key ? styles.modeChipActive : null]}
                onPress={() => updateRolePreset(preset.key as RolePresetId)}
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
                onPress={() => updateGameMode(mode.key as GameMode)}
              >
                <Text style={[styles.modeText, gameMode === mode.key ? styles.modeTextActive : null]}>{mode.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.timingTitle}>Oyun Süre Ayarları</Text>
          <View style={styles.timingModeRow}>
            <Pressable
              style={[styles.segmentButton, phaseDurations.useSystemDefaults ? styles.segmentButtonActive : null]}
              onPress={() => updateDurationMode(true)}
            >
              <Ionicons name="sparkles-outline" size={15} color={phaseDurations.useSystemDefaults ? colors.parchmentText : colors.textDim} />
              <Text style={[styles.segmentText, phaseDurations.useSystemDefaults ? styles.segmentTextActive : null]}>Sistem</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, !phaseDurations.useSystemDefaults ? styles.segmentButtonActive : null]}
              onPress={() => updateDurationMode(false)}
            >
              <Ionicons name="options-outline" size={15} color={!phaseDurations.useSystemDefaults ? colors.parchmentText : colors.textDim} />
              <Text style={[styles.segmentText, !phaseDurations.useSystemDefaults ? styles.segmentTextActive : null]}>Özel</Text>
            </Pressable>
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
              <Pressable style={styles.ruleRow} onPress={() => updateRules({ firstNightNoKill: !roomRules.firstNightNoKill })}>
                <Text style={styles.ruleLabel}>İlk gece ölüm yok</Text>
                <Text style={styles.ruleValue}>{roomRules.firstNightNoKill ? "Açık" : "Kapalı"}</Text>
              </Pressable>
              <Pressable style={styles.ruleRow} onPress={() => updateRules({ revealEliminatedRole: !roomRules.revealEliminatedRole })}>
                <Text style={styles.ruleLabel}>Elenen oyuncunun rolü açıklansın</Text>
                <Text style={styles.ruleValue}>{roomRules.revealEliminatedRole ? "Açık" : "Kapalı"}</Text>
              </Pressable>
              {hasDoctor ? (
                <>
                  <Pressable style={styles.ruleRow} onPress={() => updateRules({ allowDoctorSelfProtect: !roomRules.allowDoctorSelfProtect })}>
                    <Text style={styles.ruleLabel}>Doktor kendini koruyabilir</Text>
                    <Text style={styles.ruleValue}>{roomRules.allowDoctorSelfProtect ? "Açık" : "Kapalı"}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.ruleRow}
                    onPress={() =>
                      updateRules({
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
                    updateRules({
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
                  updateRules({
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
              <Pressable style={styles.ruleRow} onPress={() => updateRules({ noLynchEnabled: !roomRules.noLynchEnabled })}>
                <Text style={styles.ruleLabel}>Kimseyi gönderme (boş oy)</Text>
                <Text style={styles.ruleValue}>{roomRules.noLynchEnabled ? "Açık" : "Kapalı"}</Text>
              </Pressable>
              {hasMayorMechanic ? (
                <Pressable style={styles.ruleRow} onPress={() => updateRules({ mayorEnabled: !roomRules.mayorEnabled })}>
                  <Text style={styles.ruleLabel}>Belediye başkanı seçimi aktif</Text>
                  <Text style={styles.ruleValue}>{roomRules.mayorEnabled ? "Açık" : "Kapalı"}</Text>
                </Pressable>
              ) : null}
              {hasLoversMechanic ? (
                <Pressable style={styles.ruleRow} onPress={() => updateRules({ loversEnabled: !roomRules.loversEnabled })}>
                  <Text style={styles.ruleLabel}>Aşıklar bağı aktif</Text>
                  <Text style={styles.ruleValue}>{roomRules.loversEnabled ? "Açık" : "Kapalı"}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        ) : null}

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        {isHost ? (
          <>
            <PrimaryButton
              label={allConnectedReady ? "Oyunu Başlat" : "Tüm Oyuncuların Onayı Bekleniyor"}
              iconName="checkmark-circle-outline"
              onPress={emitStartRoom}
              disabled={!allConnectedReady}
            />
            {startDisabledReason ? <Text style={styles.startHint}>{startDisabledReason}</Text> : null}
          </>
        ) : null}
        <PrimaryButton label="Lobiden Ayrıl" iconName="exit-outline" variant="danger" onPress={() => setLeaveConfirmOpen(true)} />
      </ScrollView>
      <ConfirmActionSheet
        visible={leaveConfirmOpen}
        title="Lobiden Ayrılsın mı?"
        description="Odayı terk edersen hazırlık onayın sıfırlanır ve ana menüye dönersin."
        confirmLabel="Ayrıl"
        variant="danger"
        onConfirm={() => {
          setLeaveConfirmOpen(false);
          leaveRoom();
        }}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
      <Modal visible={roleInfoOpen} transparent animationType="fade" onRequestClose={() => setRoleInfoOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.roleModal}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.modalKicker}>Rol Paketi</Text>
                <Text style={styles.modalTitle}>{ROLE_PRESETS[previewPreset].name}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setRoleInfoOpen(false)}>
                <Ionicons name="close-outline" size={20} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.modalText}>{ROLE_PRESETS[previewPreset].description}</Text>
            <View style={styles.rolePreviewGrid}>
              {modalRolePreview.map((item) => (
                <View key={`modal-${item.id}`} style={styles.roleMiniCard}>
                  <View style={styles.roleMiniTop}>
                    <Text style={styles.roleMiniName}>{item.definition.name}</Text>
                    <Text style={styles.roleMiniCount}>{item.count ? `${item.count}x` : "Mekanik"}</Text>
                  </View>
                  <Text style={styles.roleMiniMeta}>{roleTeamLabel(item.id)} · {rolePhaseLabel(item.id)}</Text>
                  <Text style={styles.roleMiniDesc} numberOfLines={2}>{item.definition.description}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton label="Anladım" iconName="checkmark-circle-outline" variant="gold" onPress={() => setRoleInfoOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  content: {
    paddingBottom: spacing.xl,
    gap: 12
  },
  lobbyHeader: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(24,23,20,0.84)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  lobbyHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.4)",
    backgroundColor: "rgba(50,40,17,0.45)",
    alignItems: "center",
    justifyContent: "center"
  },
  lobbyHeaderText: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 28
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  readyPanel: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(18,19,21,0.86)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  readyCopy: {
    flex: 1,
    gap: 3
  },
  readyTitle: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 18
  },
  readyHint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 17
  },
  readyToggle: {
    minWidth: 106,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.35)",
    borderRadius: 10,
    backgroundColor: "rgba(12,12,14,0.82)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10
  },
  readyToggleActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.parchment
  },
  readyToggleText: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 12
  },
  readyToggleTextActive: {
    color: colors.parchmentText
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
  rolePreviewBox: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.22)",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(22,20,16,0.82)",
    gap: 10
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  rolePreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  roleMiniCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 10,
    backgroundColor: "rgba(12,12,14,0.78)",
    padding: 9,
    gap: 4
  },
  roleMiniTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6
  },
  roleMiniName: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 15
  },
  roleMiniCount: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11
  },
  roleMiniMeta: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  roleMiniDesc: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 12,
    lineHeight: 16
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
  settingHint: {
    color: colors.textDim,
    fontFamily: typography.serifRegular,
    fontSize: 13,
    lineHeight: 18
  },
  timingModeRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "flex-start"
  },
  segmentButton: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(12,12,14,0.82)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  segmentButtonActive: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.parchment
  },
  segmentText: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 12
  },
  segmentTextActive: {
    color: colors.parchmentText
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
  startHint: {
    color: colors.textDim,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: spacing.lg
  },
  roleModal: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.32)",
    borderRadius: 16,
    backgroundColor: "rgba(18,18,20,0.98)",
    padding: spacing.lg,
    gap: 12
  },
  modalKicker: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  modalTitle: {
    color: colors.secondary,
    fontFamily: typography.serif,
    fontSize: 28
  },
  modalText: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 15,
    lineHeight: 21
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,12,14,0.86)"
  }
});
