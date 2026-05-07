import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ActionType, GamePhase } from "@vampir-koylu/shared";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PhaseBanner } from "../components/PhaseBanner";
import { PrivateInfoCard } from "../components/PrivateInfoCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { TargetSelectionList, type TargetSelectionItem } from "../components/TargetSelectionList";
import { emitGameAction } from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { getResponsiveMetrics, scaledSize } from "../theme/layout";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { socketErrorVisibleOnRoute, toFriendlyErrorText } from "../ui/error-text";
import { showToast } from "../ui/toast-store";
import { uiStandard } from "../ui/ui-standard";

type Props = NativeStackScreenProps<RootStackParamList, "Night">;

interface ActionConfig {
  actionType: ActionType;
  buttonLabel: string;
  role: "Vampire" | "Detective" | "Doctor" | "Hunter" | "Guard";
}

function getActionConfig(phase: GamePhase): ActionConfig | null {
  if (phase === "VampireVote") return { actionType: "vampire-target", buttonLabel: "Seçimi Onayla", role: "Vampire" };
  if (phase === "DetectiveInspect") return { actionType: "detective-inspect", buttonLabel: "Sorguyu Tamamla", role: "Detective" };
  if (phase === "DoctorProtect") return { actionType: "doctor-protect", buttonLabel: "Korumayı Onayla", role: "Doctor" };
  if (phase === "HunterLastBreath") return { actionType: "hunter-shot", buttonLabel: "Son Nefes Hedefini Onayla", role: "Hunter" };
  if (phase === "GuardProtect") return { actionType: "guard-protect", buttonLabel: "Koruma Hedefini Onayla", role: "Guard" };
  return null;
}

function sceneForPhase(phase: GamePhase, role: string | null, tieCount: number): "night" | "vampire" | "detective" | "doctor" | "day" | "tie" | "result" {
  if (phase === "VampireVote") return "vampire";
  if (phase === "DetectiveInspect") return "detective";
  if (phase === "DoctorProtect") return "doctor";
  if (phase === "DayStart") return "day";
  if (phase === "DayDiscussion") return tieCount > 0 ? "tie" : "day";
  if (phase === "ExecutionResolve" || phase === "WinCheck") return "result";
  if (phase === "HunterLastBreath") return "result";
  if (phase === "GuardProtect") return "day";
  if (phase === "NightStart" || phase === "NightResolve") return "night";
  if (role === "Vampire") return "vampire";
  if (role === "Detective") return "detective";
  if (role === "Doctor") return "doctor";
  return "night";
}

function phaseTitle(phase: GamePhase): string {
  switch (phase) {
    case "NightStart":
      return "Aşama: Gece";
    case "VampireVote":
      return "Vampirler Uyandı";
    case "DetectiveInspect":
      return "Dedektif Sorgusu";
    case "DoctorProtect":
      return "Doktor Uyandı";
    case "NightResolve":
      return "Gece Sonuçlanıyor";
    case "DayStart":
      return "Köy Uyandı";
    case "DayDiscussion":
      return "Tartışma Süresi";
    case "ExecutionResolve":
      return "İnfaz Sonucu";
    case "WinCheck":
      return "Kader Kontrolü";
    case "HunterLastBreath":
      return "Avcı Son Nefes";
    case "GuardProtect":
      return "Gardiyan Koruması";
    default:
      return "Faz Bekleniyor";
  }
}

function phaseDescription(phase: GamePhase, tieCount: number): string {
  switch (phase) {
    case "NightStart":
      return "Herkes gözlerini kapatsın. Köy derin bir sessizliğe bürünüyor.";
    case "VampireVote":
      return "Bu gece kimin hedef alınacağına sessizce karar verin.";
    case "DetectiveInspect":
      return "Şüphelendiğin kişiyi seç ve gerçeği öğren.";
    case "DoctorProtect":
      return "Bu gece kimi koruyacaksın? Seçimini dikkatli yap.";
    case "NightResolve":
      return "Aksiyonlar sunucuda çözümleniyor, sonuç açıklanacak.";
    case "DayStart":
      return "Köy uyandı. Gece olanları değerlendirme zamanı.";
    case "DayDiscussion":
      return tieCount > 0 ? "Oylar eşitlendi. Son kez konuşup tekrar karar verin." : "Kimi köyden göndereceğinizi tartışın.";
    case "ExecutionResolve":
      return "Oylama sonucu açıklanıyor.";
    case "WinCheck":
      return "Kazanma koşulları kontrol ediliyor.";
    case "HunterLastBreath":
      return "Avcı son nefesinde bir hedef seçiyor.";
    case "GuardProtect":
      return "Bugün koruyacağın oyuncu oylamayla elenemez.";
    default:
      return "Sunucudan faz bilgisi bekleniyor.";
  }
}

function actionSummaryText(phase: GamePhase, canAct: boolean, meAlive: boolean): { label: string; value: string; icon: keyof typeof Ionicons.glyphMap } {
  if (!meAlive) {
    return { label: "Durum", value: "Elendin; fazı izliyorsun.", icon: "skull-outline" };
  }
  if (!canAct) {
    return { label: "Sıradaki karar", value: "Bu fazda aksiyon sende değil.", icon: "time-outline" };
  }
  if (phase === "VampireVote") return { label: "Sıradaki karar", value: "Vampir hedefini seç ve kilitle.", icon: "moon-outline" };
  if (phase === "DetectiveInspect") return { label: "Sıradaki karar", value: "Bir oyuncuyu sorgula.", icon: "search-outline" };
  if (phase === "DoctorProtect") return { label: "Sıradaki karar", value: "Bu gece korunacak kişiyi seç.", icon: "medkit-outline" };
  if (phase === "HunterLastBreath") return { label: "Sıradaki karar", value: "Son nefes hedefini seç.", icon: "locate-outline" };
  if (phase === "GuardProtect") return { label: "Sıradaki karar", value: "Gündüz koruması verilecek oyuncuyu seç.", icon: "shield-outline" };
  return { label: "Faz durumu", value: phaseDescription(phase, 0), icon: "hourglass-outline" };
}

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function NightScreen(_: Props) {
  const { width, height } = useWindowDimensions();
  const submittedActionKeyRef = useRef<string | null>(null);
  const roomState = useGameStore((s) => s.roomState);
  const gameState = useGameStore((s) => s.gameState);
  const role = useGameStore((s) => s.privateRole);
  const playerId = useGameStore((s) => s.playerId);
  const selectedTargetPlayerId = useGameStore((s) => s.selectedTargetPlayerId);
  const setSelectedTargetPlayerId = useGameStore((s) => s.setSelectedTargetPlayerId);
  const privateResultText = useGameStore((s) => s.privateResultText);
  const privateResultKind = useGameStore((s) => s.privateResultKind);
  const vampireVotePreview = useGameStore((s) => s.vampireVotePreview);
  const detectiveInspectedPlayerIds = useGameStore((s) => s.detectiveInspectedPlayerIds);
  const knownVampirePlayerIds = useGameStore((s) => s.knownVampirePlayerIds);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(socketErrorVisibleOnRoute(errorCode, "Night"));

  const phase = gameState?.phase;
  const round = gameState?.round ?? 0;
  const tieCount = gameState?.tieCountInRound ?? 0;
  const actionConfig = phase ? getActionConfig(phase) : null;
  const actionKey = actionConfig ? `${phase}:${round}:${actionConfig.actionType}` : null;
  const alreadySubmittedThisPhase = actionKey !== null && submittedActionKeyRef.current === actionKey;

  useEffect(() => {
    if (!actionKey || submittedActionKeyRef.current !== actionKey) {
      submittedActionKeyRef.current = null;
    }
  }, [actionKey]);

  const players = roomState?.players ?? [];
  const mePlayer = players.find((p) => p.playerId === playerId);
  const meAlive = mePlayer?.isAlive ?? true;
  const canAct = !!actionConfig && role === actionConfig.role && (meAlive || actionConfig.actionType === "hunter-shot");
  const currentActionSummary = actionSummaryText(phase ?? "NightStart", canAct, meAlive);
  const actionDetailText = canAct
    ? "Hedefini seçip alttan kilitle."
    : meAlive
      ? "Hedef kartları yalnızca bilgi için gösteriliyor."
      : "Oyunu izleyebilirsin.";
  const playerNameById = new Map(players.map((p) => [p.playerId, p.nickname] as const));
  const selectedTargetName = selectedTargetPlayerId ? playerNameById.get(selectedTargetPlayerId) ?? "hedef" : null;
  const inspectedSet = new Set(detectiveInspectedPlayerIds);
  const vampireSet = new Set(knownVampirePlayerIds);
  const targetItems: TargetSelectionItem[] = players.map((player) => {
    const alreadyInspectedByDetective =
      actionConfig?.actionType === "detective-inspect" &&
      role === "Detective" &&
      inspectedSet.has(player.playerId);
    const isSelectable =
      !!actionConfig &&
      canAct &&
      player.isAlive &&
      !alreadyInspectedByDetective &&
      (actionConfig.actionType === "doctor-protect" ? true : player.playerId !== playerId) &&
      !(actionConfig.actionType === "vampire-target" && role === "Vampire" && vampireSet.has(player.playerId));
    const disabledReason = !player.isAlive
      ? "Elendi"
      : !canAct
        ? meAlive ? "Bu fazda aksiyon hakkın yok" : "Elendin"
        : alreadyInspectedByDetective
          ? "Daha önce sorgulandı"
          : player.playerId === playerId && actionConfig?.actionType !== "doctor-protect"
            ? "Kendini secemezsin"
            : actionConfig?.actionType === "vampire-target" && role === "Vampire" && vampireSet.has(player.playerId)
              ? "Vampir baska vampiri hedefleyemez"
              : null;
    return {
      id: player.playerId,
      label: player.nickname,
      initials: initialsFromName(player.nickname),
      isAlive: player.isAlive,
      isSelectable,
      isSelected: selectedTargetPlayerId === player.playerId,
      statusText: player.isAlive ? "Hayatta" : "Elendi",
      disabledReason,
      badgeText: player.playerId === playerId ? "SEN" : role === "Vampire" && vampireSet.has(player.playerId) ? "VAMPİR" : null
    };
  });
  const selectedActionTarget = targetItems.find((item) => item.id === selectedTargetPlayerId);
  const actionDisabledReason = alreadySubmittedThisPhase
    ? "Bu fazdaki seçimin kilitlendi"
    : !selectedTargetPlayerId
      ? "Bir hedef seç"
      : !selectedActionTarget?.isSelectable
      ? "Bu hedef seçilemez"
      : null;
  const layout = getResponsiveMetrics(width, height);
  const actionDockBottom = uiStandard.actionDock.bottomGap;
  const actionScrollPadding = uiStandard.actionDock.minHeight + actionDockBottom + uiStandard.actionDock.scrollGap;
  const actionButtonWidth = scaledSize(146, layout.controlScale, 130, 146);

  const submitAction = () => {
    if (!actionConfig || !selectedTargetPlayerId || !actionKey || alreadySubmittedThisPhase) {
      return;
    }
    emitGameAction(actionConfig.actionType, selectedTargetPlayerId);
    submittedActionKeyRef.current = actionKey;
    showToast("Kararın kilitlendi", "gold", 1500);
  };

  if (!phase) {
    return (
      <ScreenShell scene="night" bottomNavActiveIndex={0} headerTitle="GECE FAZI">
        <View style={styles.loading}>
          <Text style={styles.phaseTitle}>Faz Bilgisi Bekleniyor</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      scene={sceneForPhase(phase, role, tieCount)}
      bottomNavActiveIndex={0}
      headerTitle={phase.startsWith("Day") || phase === "HunterLastBreath" || phase === "GuardProtect" ? "GÜNDÜZ FAZI" : "GECE FAZI"}
      contentDensity="game"
    >
      <View style={styles.screenRoot}>
        <PhaseBanner
          title={phaseTitle(phase)}
          description={phaseDescription(phase, tieCount)}
          phaseEndsAt={gameState?.phaseEndsAt ?? null}
          infoLabel={currentActionSummary.label}
          infoText={currentActionSummary.value}
          infoDetail={actionDetailText}
          infoIcon={currentActionSummary.icon}
          infoActive={canAct}
          compact
        />
        <ScrollView
          style={styles.targetScroll}
          contentContainerStyle={[styles.targetContent, { paddingBottom: canAct ? actionScrollPadding : spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <TargetSelectionList
            items={targetItems}
            onSelect={setSelectedTargetPlayerId}
            disabledSummary={null}
          />

          {role === "Doctor" && phase === "DoctorProtect" ? (
            <Text style={styles.tip}>Kural: Kendini art arda iki gece koruyamazsın.</Text>
          ) : null}

          {role === "Vampire" && phase === "VampireVote" && vampireVotePreview ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Vampir Oyları</Text>
              {vampireVotePreview.votes.map((row) => (
                <Text key={row.voterPlayerId} style={styles.resultText}>
                  {row.voterName}{row.isBot ? " (bot)" : ""} → {row.targetName ?? "Henüz seçmedi"}
                </Text>
              ))}
            </View>
          ) : null}

          {privateResultText && privateResultKind && privateResultKind !== "info" ? (
            <PrivateInfoCard kind={privateResultKind} body={privateResultText} />
          ) : null}
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        </ScrollView>
      </View>
      {canAct ? (
        <View style={[styles.stickyAction, { bottom: actionDockBottom }]}>
          <View style={styles.actionSummary}>
            <Text style={styles.actionSummaryLabel}>Hedef</Text>
            <Text style={styles.actionSummaryValue} numberOfLines={1}>{selectedTargetName ?? "Seçilmedi"}</Text>
            {actionDisabledReason ? <Text style={styles.actionDisabledHint} numberOfLines={1}>{actionDisabledReason}</Text> : null}
          </View>
          <PrimaryButton
            label="Seçimi Kilitle"
            iconName="lock-closed-outline"
            variant={actionConfig.actionType === "doctor-protect" || actionConfig.actionType === "detective-inspect" ? "gold" : "blood"}
            onPress={submitAction}
            disabled={Boolean(actionDisabledReason)}
            compact
            style={[styles.actionButton, { width: actionButtonWidth }]}
          />
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  screenRoot: {
    flex: 1,
    gap: 7
  },
  targetScroll: {
    flex: 1
  },
  targetContent: {
    gap: 8
  },
  stickyAction: {
    position: "absolute",
    left: spacing.safe,
    right: spacing.safe,
    minHeight: uiStandard.actionDock.minHeight,
    paddingHorizontal: uiStandard.actionDock.paddingX,
    paddingVertical: uiStandard.actionDock.paddingY,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)",
    borderRadius: 16,
    backgroundColor: "rgba(12,12,14,0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8
  },
  actionSummary: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  actionSummaryLabel: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  actionSummaryValue: {
    color: colors.secondary,
    fontFamily: typography.serifSemi,
    fontSize: 16
  },
  actionDisabledHint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  actionButton: {
    flexShrink: 0
  },
  hero: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    borderRadius: 14,
    backgroundColor: "rgba(12,12,14,0.84)",
    padding: spacing.lg,
    gap: 8
  },
  phaseTitle: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 58 / 1.55,
    textAlign: "center"
  },
  phaseText: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: 18,
    lineHeight: 27
  },
  playerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10
  },
  playerCard: {
    width: "48.4%",
    borderRadius: 14,
    padding: 10,
    gap: 8,
    borderWidth: 1
  },
  playerAlive: {
    backgroundColor: "rgba(30,30,33,0.84)",
    borderColor: "rgba(170,137,132,0.28)"
  },
  playerDead: {
    backgroundColor: "rgba(12,12,14,0.65)",
    borderColor: "rgba(120,90,90,0.2)"
  },
  playerSelected: {
    borderColor: colors.primaryBright,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 6 }
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "rgba(8,8,10,0.9)",
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.45)",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 19
  },
  playerName: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 30 / 1.75
  },
  playerState: {
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  disabledHint: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  stateAlive: {
    color: colors.success
  },
  stateDead: {
    color: colors.textDim
  },
  selectButton: {
    marginTop: 2
  },
  tip: {
    color: colors.secondary,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 14
  },
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.35)",
    backgroundColor: colors.parchment,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 8
  },
  resultTitle: {
    color: colors.parchmentText,
    fontFamily: typography.sansBold,
    letterSpacing: 2,
    fontSize: typography.label
  },
  resultText: {
    color: "#201910",
    fontFamily: typography.serifSemi,
    fontSize: 34 / 1.75
  },
  vampireTallyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(32,25,16,0.2)"
  },
  vampireTallyChip: {
    color: "#3a2a18",
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 16
  },
  error: {
    color: colors.danger,
    fontFamily: typography.sansMedium,
    textAlign: "center"
  }
});
