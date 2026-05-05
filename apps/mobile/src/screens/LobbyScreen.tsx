import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ROLE_DEFINITIONS, ROLE_PRESETS, buildRoleDeck, type GameMode, type RoleDefinitionId, type RolePresetId, type RuleSettings } from "@vampir-koylu/shared";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../app/navigation/routes";
import { BotControlCard } from "../components/BotControlCard";
import { ConfirmActionSheet } from "../components/ConfirmActionSheet";
import { PlayerRosterCard } from "../components/PlayerRosterCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { RoomCodeCard } from "../components/RoomCodeCard";
import { ScreenShell } from "../components/ScreenShell";
import { StatusBadge } from "../components/StatusBadge";
import {
  emitAddBot,
  emitFillBotsToMinimum,
  emitLeaveRoom,
  emitReadyToggle,
  emitRemoveBot,
  emitRoomConfigUpdate,
  emitStartRoom
} from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { socketErrorVisibleOnRoute, toFriendlyErrorText } from "../ui/error-text";
import { showToast } from "../ui/toast-store";

const LOBBY_STICKY_ACTION_RESERVE = 148;

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

const GAME_MODE_DETAILS: Record<GameMode, { label: string; description: string; ruleNote: string }> = {
  Classic: {
    label: "Klasik",
    description: "Standart oyun akışı. Dengeli ve sürprizsiz bir başlangıç profili.",
    ruleNote: "İlk gece ölüm yok kapalı kalır."
  },
  SafeFirstNight: {
    label: "İlk Gece Güvenli",
    description: "İlk turda daha yumuşak giriş yapar ve yeni oyuncular için güvenli bir başlangıç sağlar.",
    ruleNote: "İlk gece ölüm yok otomatik olarak açık olur."
  },
  FastParty: {
    label: "Hızlı Parti",
    description: "Daha hızlı tempolu bir oda kurulumunu öne çıkarır.",
    ruleNote: "Seçili kurallar oda ayarlarıyla birlikte senkron kalır."
  },
  MysteryVillage: {
    label: "Gizemli Köy",
    description: "Daha belirsiz ve sürpriz odaklı bir profil hissi verir.",
    ruleNote: "Seçili kurallar oda ayarlarıyla birlikte senkron kalır."
  }
};

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
  const insets = useSafeAreaInsets();
  const roomState = useGameStore((s) => s.roomState);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(socketErrorVisibleOnRoute(errorCode, "Lobby"));
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
  const botIntelligence = useGameStore((s) => s.botIntelligence);
  const setBotIntelligence = useGameStore((s) => s.setBotIntelligence);
  const [advancedRulesOpen, setAdvancedRulesOpen] = useState(false);
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [roleInfoOpen, setRoleInfoOpen] = useState(false);
  const [modeInfoOpen, setModeInfoOpen] = useState(false);
  const [previewPreset, setPreviewPreset] = useState<RolePresetId>(rolePreset);
  const [previewMode, setPreviewMode] = useState<GameMode>(gameMode);

  const players = roomState?.players ?? [];
  const roomCode = roomState?.roomCode ?? "------";
  const minPlayers = roomState?.minPlayers ?? 4;
  const connectedPlayers = players.filter((p) => p.isConnected);
  const setupPlayerCount = Math.max(players.length, minPlayers);
  const startRoleDeck = buildRoleDeck(Math.max(connectedPlayers.length, minPlayers), rolePreset);
  const roleDistributionValid = startRoleDeck.length === Math.max(connectedPlayers.length, minPlayers);
  const activeRoleDeck = buildRoleDeck(setupPlayerCount, rolePreset);
  const activeRoleSet = new Set(activeRoleDeck);
  const hasDoctor = activeRoleSet.has("Doctor");
  const hasDetective = activeRoleSet.has("Detective");
  const hasMayorMechanic = rolePreset === "socialChaos" && setupPlayerCount >= ROLE_DEFINITIONS.Mayor.minPlayers;
  const hasLoversMechanic = rolePreset === "socialChaos" && setupPlayerCount >= ROLE_DEFINITIONS.Lover.minPlayers;
  const allConnectedReady = connectedPlayers.length >= minPlayers && connectedPlayers.every((p) => p.isReady);
  const playersNeeded = Math.max(minPlayers - connectedPlayers.length, 0);
  const lobbyStatusTarget = Math.max(connectedPlayers.length, minPlayers);
  const mePlayer = players.find((p) => p.playerId === me);
  const meReady = Boolean(mePlayer?.isReady);
  const readyCount = connectedPlayers.filter((p) => p.isReady).length;
  const isHost = roomState?.hostPlayerId ? roomState.hostPlayerId === me : players[0]?.playerId === me;
  const activeRolePreview = rolePreview(rolePreset, setupPlayerCount, roomRules);
  const modalRolePreview = rolePreview(previewPreset, setupPlayerCount, roomRules);
  const activeModeInfo = GAME_MODE_DETAILS[gameMode];
  const previewModeInfo = GAME_MODE_DETAILS[previewMode];
  const firstNightForcedByMode = gameMode === "SafeFirstNight";
  const timingSummary = phaseDurations.useSystemDefaults ? "Sistem süreleri" : "Özel süreler";
  const summaryItems = [
    { label: "Rol Paketi", value: toRolePresetLabel(rolePreset) },
    { label: "Mod", value: toGameModeLabel(gameMode) },
    { label: "İlk Gece", value: roomRules.firstNightNoKill ? "Ölüm yok" : "Ölüm var" },
    { label: "Elenen Rol", value: roomRules.revealEliminatedRole ? "Açık" : "Gizli" },
    { label: "Beraberlik", value: roomRules.tiePolicy === "RevoteThenNoExecution" ? "Tekrar oy" : "Rastgele eleme" },
    ...(hasMayorMechanic ? [{ label: "Başkanlık", value: roomRules.mayorEnabled ? "Açık" : "Kapalı" }] : []),
    ...(hasLoversMechanic ? [{ label: "Aşıklar", value: roomRules.loversEnabled ? "Açık" : "Kapalı" }] : [])
  ];

  const leaveRoom = () => {
    emitLeaveRoom();
    navigation.navigate("Welcome");
  };

  const copyRoomCode = async () => {
    await Clipboard.setStringAsync(roomCode);
    showToast("Oda kodu kopyalandı", "gold", 1500);
  };

  const updateDuration = (key: keyof typeof phaseDurations, delta: number) => {
    if (key === "useSystemDefaults") return;
    const current = phaseDurations[key] as number;
    const next = Math.max(3, Math.min(180, current + delta));
    setPhaseDurations({ [key]: next });
    emitRoomConfigUpdate();
    showToast("Ayarlar güncellendi", "gold", 1500);
  };
  const updateRolePreset = (nextPreset: RolePresetId) => {
    setRolePreset(nextPreset);
    setPreviewPreset(nextPreset);
    setRoleInfoOpen(true);
    emitRoomConfigUpdate();
    showToast("Ayarlar güncellendi", "gold", 1500);
  };
  const updateGameMode = (nextMode: GameMode) => {
    setGameMode(nextMode);
    setRoomRules({ firstNightNoKill: nextMode === "SafeFirstNight" });
    setPreviewMode(nextMode);
    setModeInfoOpen(true);
    emitRoomConfigUpdate();
    showToast("Ayarlar güncellendi", "gold", 1500);
  };
  const updateRules = (updater: Partial<RuleSettings>) => {
    setRoomRules(updater);
    emitRoomConfigUpdate();
    showToast("Ayarlar güncellendi", "gold", 1500);
  };
  const updateDurationMode = (useSystemDefaults: boolean) => {
    setPhaseDurations({ useSystemDefaults });
    emitRoomConfigUpdate();
    showToast("Ayarlar güncellendi", "gold", 1500);
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
    showToast("Hazır durumun güncellendi", "gold", 1500);
  };
  const startDisabledReason =
    playersNeeded > 0
      ? `En az ${minPlayers} bağlı oyuncu gerekli`
      : !roleDistributionValid
        ? "Rol dağılımı bu oyuncu sayısı için uygun değil"
        : allConnectedReady
          ? null
          : "Tüm oyuncular onay vermeli";
  const canStartRoom = !startDisabledReason;
  const pendingReadyCount = Math.max(0, connectedPlayers.length - readyCount);
  const stickyStatusTitle = isHost ? "Host Kontrolü" : meReady ? "Onayın Alındı" : "Onay Bekleniyor";
  const stickyStatusMeta = `${readyCount}/${lobbyStatusTarget} hazır · ${pendingReadyCount} bekliyor`;
  const stickyHelperText = isHost
    ? startDisabledReason ?? "Oda hazır. Oyunu başlatınca rol dağıtımına geçilir."
    : meReady
      ? "Host oyunu başlatınca masaya geçilir."
      : `Başlamak için en az ${minPlayers} oyuncu ve herkesin onayı gerekir.`;

  return (
    <ScreenShell scene="lobby" headerTitle="LOBİ" showTopBar={false}>
      <View style={styles.lobbyRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xl + LOBBY_STICKY_ACTION_RESERVE + Math.max(insets.bottom, 8) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <RoomCodeCard roomCode={roomCode} onCopy={copyRoomCode} />

        <View style={styles.lobbyHeader}>
          <View style={styles.lobbyHeaderIcon}>
            <Ionicons name="people-outline" size={24} color={colors.secondary} />
          </View>
          <View style={styles.lobbyHeaderText}>
            <Text style={styles.title}>Lobi</Text>
            <View style={styles.lobbyStatusLines}>
              <Text style={styles.subtitle}>{connectedPlayers.length}/{lobbyStatusTarget} oyuncu bağlı</Text>
              <Text style={styles.subtitle}>{readyCount}/{lobbyStatusTarget} oyuncu hazır</Text>
              <Text style={styles.minimumHint}>
                {playersNeeded > 0 ? `Oyunu başlatmak için ${playersNeeded} oyuncu daha gerekli` : "Minimum oyuncu tamamlandı"}
              </Text>
            </View>
          </View>
        </View>

        <PlayerRosterCard players={players} mePlayerId={me} hostPlayerId={roomState?.hostPlayerId ?? players[0]?.playerId ?? null} compact />

        {isHost ? (
          <BotControlCard
            bots={players.filter((p) => p.isBot)}
            intelligence={botIntelligence}
            onSelectIntelligence={(value) => {
              setBotIntelligence(value);
              showToast("Bot zekâsı güncellendi", "gold", 1500);
            }}
            onAddBot={() => {
              emitAddBot(botIntelligence, 1);
              showToast("Bot eklendi", "gold", 1500);
            }}
            onFillMinimum={() => {
              emitFillBotsToMinimum(botIntelligence);
              showToast("Eksik oyuncular botlarla tamamlandı", "gold", 1500);
            }}
            onRemoveBot={(botPlayerId) => {
              emitRemoveBot(botPlayerId);
              showToast("Bot çıkarıldı", "gold", 1500);
            }}
            playersNeeded={playersNeeded}
          />
        ) : null}

        <View style={styles.infoBox}>
          <Ionicons name="list-outline" size={22} color={colors.textMuted} />
          <View style={styles.summaryWrap}>
            <Text style={styles.summaryTitle}>Kural Özeti</Text>
            <View style={styles.summaryGrid}>
              {summaryItems.map((item) => (
                <View key={item.label} style={styles.summaryChip}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue} numberOfLines={2}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.rolePreviewBox}>
          <View style={styles.sectionHeader}>
            <Text style={styles.summaryTitle}>Aktif Roller</Text>
            <StatusBadge label={`${setupPlayerCount} kişilik deste`} tone="neutral" compact />
          </View>
          <View style={styles.rolePreviewGrid}>
            {activeRolePreview.map((item) => (
              <View key={item.id} style={styles.roleMiniCard}>
                <Text style={styles.roleMiniName} numberOfLines={1}>{item.definition.name}</Text>
                <View style={styles.roleMiniMetaRow}>
                  <Text style={styles.roleMiniMeta} numberOfLines={1}>{roleTeamLabel(item.id)} · {rolePhaseLabel(item.id)}</Text>
                  <Text style={styles.roleMiniCount}>{item.count ? `${item.count}x` : "1x"}</Text>
                </View>
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
          <Pressable style={styles.timingHeader} onPress={() => setRoomSettingsOpen((prev) => !prev)}>
            <View style={styles.timingHeaderCopy}>
              <View style={styles.timingTitleRow}>
                <Text style={styles.timingTitle}>Oda Ayarları</Text>
                <StatusBadge label="Yönetici" tone="ready" compact />
              </View>
              <Text style={styles.timingSummary}>{toRolePresetLabel(rolePreset)} · {toGameModeLabel(gameMode)} · {timingSummary}</Text>
            </View>
            <View style={styles.timingEditChip}>
              <Text style={styles.timingEditText}>{roomSettingsOpen ? "Kapat" : "Düzenle"}</Text>
              <Ionicons
                name={roomSettingsOpen ? "chevron-up-outline" : "chevron-down-outline"}
                size={16}
                color={colors.secondary}
              />
            </View>
          </Pressable>

          {roomSettingsOpen ? (
            <View style={styles.timingDetails}>
              <Text style={styles.timingSubTitle}>Rol Paketi</Text>
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

              <Text style={styles.timingSubTitle}>Oyun Modu</Text>
              <View style={styles.modeRow}>
                {[
                  { key: "Classic", label: GAME_MODE_DETAILS.Classic.label },
                  { key: "SafeFirstNight", label: GAME_MODE_DETAILS.SafeFirstNight.label },
                  { key: "FastParty", label: GAME_MODE_DETAILS.FastParty.label },
                  { key: "MysteryVillage", label: GAME_MODE_DETAILS.MysteryVillage.label }
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
              <Text style={styles.settingHint}>{activeModeInfo.description}</Text>

              <Text style={styles.timingSubTitle}>Süre Ayarları</Text>
              <View style={styles.timingModeRow}>
                <Pressable
                  style={[styles.segmentButton, phaseDurations.useSystemDefaults ? styles.segmentButtonActive : null]}
                  onPress={() => updateDurationMode(true)}
                >
                  <Ionicons name="sparkles-outline" size={14} color={phaseDurations.useSystemDefaults ? colors.parchmentText : colors.textDim} />
                  <Text style={[styles.segmentText, phaseDurations.useSystemDefaults ? styles.segmentTextActive : null]}>Sistem</Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentButton, !phaseDurations.useSystemDefaults ? styles.segmentButtonActive : null]}
                  onPress={() => updateDurationMode(false)}
                >
                  <Ionicons name="options-outline" size={14} color={!phaseDurations.useSystemDefaults ? colors.parchmentText : colors.textDim} />
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
                <Text style={styles.timingSubTitle}>Gelişmiş Kurallar</Text>
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
              <Pressable
                style={[styles.ruleRow, firstNightForcedByMode ? styles.ruleRowDisabled : null]}
                onPress={() => {
                  if (firstNightForcedByMode) return;
                  updateRules({ firstNightNoKill: !roomRules.firstNightNoKill });
                }}
              >
                <Text style={styles.ruleLabel}>İlk gece ölüm yok</Text>
                <View style={styles.ruleValueWrap}>
                  <Text style={styles.ruleValue}>{roomRules.firstNightNoKill ? "Açık" : "Kapalı"}</Text>
                  {firstNightForcedByMode ? <Text style={styles.ruleMeta}>mod tarafından</Text> : null}
                </View>
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
        </View>
        ) : null}

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
     
        <PrimaryButton label="Lobiden Ayrıl" iconName="exit-outline" variant="danger-outline" compact onPress={() => setLeaveConfirmOpen(true)} />
      </ScrollView>

      <View
        style={[
          styles.lobbyStickyBar,
          {
            paddingBottom: Math.max(insets.bottom, 10)
          }
        ]}
      >
        <View style={styles.stickyMainRow}>
          <View style={styles.stickyStatusRow}>
            <View style={[styles.stickyStatusIcon, isHost ? styles.stickyStatusIconHost : null]}>
              <Ionicons
                name={isHost ? "shield-checkmark-outline" : meReady ? "checkmark-circle-outline" : "time-outline"}
                size={18}
                color={isHost || meReady ? colors.secondary : colors.textMuted}
              />
            </View>
            <View style={styles.stickyStatusCopy}>
              <Text style={styles.stickyStatusTitle} numberOfLines={1}>{stickyStatusTitle}</Text>
              <Text style={styles.stickyStatusMeta} numberOfLines={1}>{stickyStatusMeta}</Text>
            </View>
          </View>
          <View style={styles.stickyActionSlot}>
            {isHost ? (
              <Pressable
                style={[styles.stickyHostReadyPill, meReady ? styles.stickyHostReadyPillActive : null]}
                onPress={toggleReady}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.secondary} />
                <Text style={styles.stickyHostReadyText} numberOfLines={1}>
                  {meReady ? "Onay Verildi" : "Onay Ver"}
                </Text>
              </Pressable>
            ) : (
              <PrimaryButton
                label={meReady ? "Geri Al" : "Onay Ver"}
                iconName={meReady ? "close-circle-outline" : "checkmark-circle-outline"}
                onPress={toggleReady}
                variant={meReady ? "outline" : "gold"}
                compact
              />
            )}
          </View>
        </View>
        {isHost ? (
          <View style={styles.stickyCol}>
            <PrimaryButton
              label="Oyunu Başlat"
              iconName="checkmark-circle-outline"
              onPress={emitStartRoom}
              disabled={!canStartRoom}
              variant="blood"
              compact
            />
            <View style={styles.stickyHelperLine}>
              <Ionicons
                name={canStartRoom ? "sparkles-outline" : "alert-circle-outline"}
                size={13}
                color={canStartRoom ? colors.success : colors.secondary}
              />
              <Text style={[styles.stickyHelperText, canStartRoom ? styles.stickyHelperTextReady : null]} numberOfLines={1}>
                {stickyHelperText}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.stickyCol}>
            <View style={styles.stickyHelperLine}>
              <Ionicons
                name={meReady ? "checkmark-done-outline" : "information-circle-outline"}
                size={13}
                color={meReady ? colors.success : colors.secondary}
              />
              <Text style={[styles.stickyHelperText, meReady ? styles.stickyHelperTextReady : null]} numberOfLines={1}>
                {stickyHelperText}
              </Text>
            </View>
          </View>
        )}
      </View>
      </View>
      <ConfirmActionSheet
        visible={leaveConfirmOpen}
        title="Lobiden ayrıl?"
        description="Ayrılırsan tekrar katılmak için oda kodunu kullanman gerekir."
        confirmLabel="Lobiden Ayrıl"
        cancelLabel="Vazgeç"
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
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalKicker}>Rol Paketi</Text>
                <Text style={styles.modalTitle}>{ROLE_PRESETS[previewPreset].name}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setRoleInfoOpen(false)}>
                <Ionicons name="close-outline" size={20} color={colors.secondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>{ROLE_PRESETS[previewPreset].description}</Text>
              <View style={styles.modalRoleGrid}>
                {modalRolePreview.map((item) => (
                  <View key={`modal-${item.id}`} style={[styles.roleMiniCard, styles.modalRoleCard]}>
                    <Text style={styles.roleMiniName} numberOfLines={1}>{item.definition.name}</Text>
                    <View style={styles.roleMiniMetaRow}>
                      <Text style={styles.roleMiniMeta} numberOfLines={1}>{roleTeamLabel(item.id)} · {rolePhaseLabel(item.id)}</Text>
                      <Text style={styles.roleMiniCount}>{item.count ? `${item.count}x` : "1x"}</Text>
                    </View>
                    <Text style={styles.roleMiniDesc} numberOfLines={2}>{item.definition.description}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <PrimaryButton label="Anladım" iconName="checkmark-circle-outline" variant="gold" compact style={styles.modalAction} onPress={() => setRoleInfoOpen(false)} />
          </View>
        </View>
      </Modal>
      <Modal visible={modeInfoOpen} transparent animationType="fade" onRequestClose={() => setModeInfoOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.roleModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalKicker}>Oyun Modu</Text>
                <Text style={styles.modalTitle}>{previewModeInfo.label}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setModeInfoOpen(false)}>
                <Ionicons name="close-outline" size={20} color={colors.secondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>{previewModeInfo.description}</Text>
              <View style={styles.modeEffectBox}>
                <Text style={styles.modeEffectTitle}>Bu modda</Text>
                <View style={styles.modeEffectRow}>
                  <Ionicons name="sparkles-outline" size={15} color={colors.secondary} />
                  <Text style={styles.modeEffectText}>{previewModeInfo.ruleNote}</Text>
                </View>
                <View style={styles.modeEffectRow}>
                  <Ionicons name="sync-outline" size={15} color={colors.secondary} />
                  <Text style={styles.modeEffectText}>Diğer oda kuralları gönderilen ayarlarla senkron kalır.</Text>
                </View>
              </View>
            </ScrollView>
            <PrimaryButton label="Anladım" iconName="checkmark-circle-outline" variant="gold" compact style={styles.modalAction} onPress={() => setModeInfoOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  lobbyRoot: {
    flex: 1
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingBottom: spacing.xl,
    gap: 12
  },
  lobbyStickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(233,195,73,0.3)",
    backgroundColor: "rgba(10,10,12,0.98)",
    paddingTop: 9,
    paddingHorizontal: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.46,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18
  },
  stickyMainRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8
  },
  stickyStatusRow: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.2)",
    borderRadius: 12,
    backgroundColor: "rgba(22,21,22,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  stickyStatusIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    backgroundColor: "rgba(12,12,14,0.72)",
    alignItems: "center",
    justifyContent: "center"
  },
  stickyStatusIconHost: {
    borderColor: "rgba(233,195,73,0.36)",
    backgroundColor: "rgba(44,35,14,0.48)"
  },
  stickyStatusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  stickyStatusTitle: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 13,
    letterSpacing: 0.3
  },
  stickyStatusMeta: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    lineHeight: 14
  },
  stickyRoleChip: {
    minHeight: 25,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,12,14,0.62)"
  },
  stickyRoleChipHost: {
    borderColor: "rgba(233,195,73,0.38)",
    backgroundColor: "rgba(233,195,73,0.12)"
  },
  stickyRoleChipText: {
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.8
  },
  stickyRoleChipTextHost: {
    color: colors.secondary
  },
  stickyActionSlot: {
    flex: 1,
    minWidth: 0
  },
  stickyCol: {
    gap: 6
  },
  stickyHostReadyPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.32)",
    borderRadius: 12,
    paddingHorizontal: 9,
    minHeight: 44,
    backgroundColor: "rgba(33,29,16,0.54)"
  },
  stickyHostReadyPillActive: {
    borderColor: "rgba(39,190,104,0.38)",
    backgroundColor: "rgba(18,48,31,0.52)"
  },
  stickyHostReadyText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 12,
    lineHeight: 15
  },
  stickyHelperLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
    paddingBottom: 2
  },
  stickyHelperText: {
    flex: 1,
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    lineHeight: 14
  },
  stickyHelperTextReady: {
    color: colors.success,
    fontFamily: typography.sansBold
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
    gap: 5
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 28
  },
  lobbyStatusLines: {
    gap: 2
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  minimumHint: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  infoBox: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "rgba(18,19,21,0.86)"
  },
  rolePreviewBox: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.22)",
    borderRadius: 14,
    padding: 11,
    backgroundColor: "rgba(22,20,16,0.82)",
    gap: 9
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
    gap: 7
  },
  roleMiniCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 10,
    backgroundColor: "rgba(12,12,14,0.78)",
    paddingHorizontal: 9,
    paddingVertical: 8,
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
  roleMiniMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6
  },
  roleMiniCount: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: "hidden"
  },
  roleMiniMeta: {
    flex: 1,
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
    padding: 10,
    backgroundColor: "rgba(18,19,21,0.86)",
    gap: 8
  },
  timingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  timingHeaderCopy: {
    flex: 1,
    gap: 4
  },
  timingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  timingTitle: {
    color: colors.secondary,
    fontFamily: typography.serifSemi,
    fontSize: 18
  },
  timingSubTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 12,
    letterSpacing: 0.6
  },
  timingSummary: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  timingEditChip: {
    minHeight: 32,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.34)",
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(12,12,14,0.44)"
  },
  timingEditText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11
  },
  timingDetails: {
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.18)",
    paddingTop: 9,
    gap: 8
  },
  settingHint: {
    color: colors.textDim,
    fontFamily: typography.serifRegular,
    fontSize: 12,
    lineHeight: 17
  },
  timingModeRow: {
    flexDirection: "row",
    gap: 7,
    alignSelf: "flex-start"
  },
  segmentButton: {
    minHeight: 32,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    borderRadius: 9,
    paddingHorizontal: 10,
    backgroundColor: "rgba(12,12,14,0.82)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  segmentButtonActive: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.parchment
  },
  segmentText: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 11
  },
  segmentTextActive: {
    color: colors.parchmentText
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  modeChip: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.3)",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "rgba(12,12,14,0.82)"
  },
  modeChipActive: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright
  },
  modeText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 11
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
    paddingHorizontal: 9,
    paddingVertical: 8,
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
  ruleRowDisabled: {
    opacity: 0.85
  },
  ruleLabel: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    flex: 1,
    paddingRight: 8
  },
  ruleValueWrap: {
    alignItems: "flex-end",
    gap: 2
  },
  ruleValue: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11,
    maxWidth: 160,
    textAlign: "right"
  },
  ruleMeta: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    textTransform: "lowercase"
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
    gap: 8
  },
  summaryTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  summaryChip: {
    width: "48%",
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 10,
    backgroundColor: "rgba(12,12,14,0.54)",
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 2
  },
  summaryLabel: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 0.4
  },
  summaryValue: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  roleGuideLink: {
    marginTop: -2,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.42)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(12,12,14,0.32)"
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: spacing.md
  },
  roleModal: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    borderRadius: 16,
    backgroundColor: "rgba(18,19,21,0.98)",
    padding: 12,
    gap: 10,
    maxHeight: "86%"
  },
  modalHeader: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.2)",
    borderRadius: 12,
    backgroundColor: "rgba(22,20,16,0.86)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  modalHeaderText: {
    flex: 1,
    gap: 2
  },
  modalScroll: {
    flexGrow: 0
  },
  modalScrollContent: {
    gap: 10,
    paddingBottom: 2
  },
  modalRoleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  modalRoleCard: {
    minHeight: 78,
    backgroundColor: "rgba(12,12,14,0.68)"
  },
  modalAction: {
    alignSelf: "stretch"
  },
  modeEffectBox: {
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(33,29,16,0.48)",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.2)"
  },
  modeEffectTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 12
  },
  modeEffectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  modeEffectText: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    lineHeight: 18
  },
  modalKicker: {
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  modalTitle: {
    color: colors.secondary,
    fontFamily: typography.serif,
    fontSize: 24,
    lineHeight: 29
  },
  modalText: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 14,
    lineHeight: 20
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,12,14,0.72)"
  }
});
