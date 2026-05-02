import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ActionType, GamePhase } from "@vampir-koylu/shared";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { PhaseCountdown } from "../components/PhaseCountdown";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { emitGameAction } from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toFriendlyErrorText } from "../ui/error-text";

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

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function NightScreen(_: Props) {
  const roomState = useGameStore((s) => s.roomState);
  const gameState = useGameStore((s) => s.gameState);
  const role = useGameStore((s) => s.privateRole);
  const playerId = useGameStore((s) => s.playerId);
  const selectedTargetPlayerId = useGameStore((s) => s.selectedTargetPlayerId);
  const setSelectedTargetPlayerId = useGameStore((s) => s.setSelectedTargetPlayerId);
  const privateResultText = useGameStore((s) => s.privateResultText);
  const vampireVotePreview = useGameStore((s) => s.vampireVotePreview);
  const lastDayVoteSummary = useGameStore((s) => s.lastDayVoteSummary);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(errorCode);

  const phase = gameState?.phase;
  const tieCount = gameState?.tieCountInRound ?? 0;
  const actionConfig = phase ? getActionConfig(phase) : null;

  const players = roomState?.players ?? [];
  const mePlayer = players.find((p) => p.playerId === playerId);
  const meAlive = mePlayer?.isAlive ?? true;
  const canAct = !!actionConfig && role === actionConfig.role && (meAlive || actionConfig.actionType === "hunter-shot");
  const alivePlayers = players.filter((p) => p.isAlive);
  const selectablePlayers =
    actionConfig?.actionType === "doctor-protect"
      ? alivePlayers
      : alivePlayers.filter((player) => player.playerId !== playerId);
  const playerNameById = new Map(players.map((p) => [p.playerId, p.nickname] as const));

  const submitAction = () => {
    if (!actionConfig || !selectedTargetPlayerId) {
      return;
    }
    emitGameAction(actionConfig.actionType, selectedTargetPlayerId);
  };

  if (!phase) {
    return (
      <ScreenShell scene="night" headerTitle="GECE FAZI">
        <View style={styles.loading}>
          <Text style={styles.phaseTitle}>Faz Bilgisi Bekleniyor</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scene={sceneForPhase(phase, role, tieCount)} headerTitle={phase.startsWith("Day") || phase === "HunterLastBreath" || phase === "GuardProtect" ? "GÜNDÜZ FAZI" : "GECE FAZI"}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.phaseTitle}>{phaseTitle(phase)}</Text>
          <Text style={styles.phaseText}>{phaseDescription(phase, tieCount)}</Text>
        </View>
        <PhaseCountdown phaseEndsAt={gameState?.phaseEndsAt ?? null} />

        <View style={styles.playerGrid}>
          {players.map((player) => {
            const isSelectable = selectablePlayers.some((item) => item.playerId === player.playerId);
            const isSelected = selectedTargetPlayerId === player.playerId;
            return (
              <View
                key={player.playerId}
                style={[
                  styles.playerCard,
                  player.isAlive ? styles.playerAlive : styles.playerDead,
                  isSelectable && isSelected ? styles.playerSelected : null
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsFromName(player.nickname)}</Text>
                </View>
                <Text style={styles.playerName}>{player.nickname}</Text>
                <Text style={[styles.playerState, player.isAlive ? styles.stateAlive : styles.stateDead]}>
                  {player.isAlive ? "● HAYATTA" : "✕ ELENDİ"}
                </Text>
                {canAct && isSelectable ? (
                  <PrimaryButton
                    label={isSelected ? "Hedef Seçildi" : "Seç"}
                    variant={isSelected ? "blood" : "charcoal"}
                    onPress={() => setSelectedTargetPlayerId(player.playerId)}
                    style={styles.selectButton}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        {canAct ? (
          <PrimaryButton
            label={actionConfig.buttonLabel}
            iconName="checkmark-circle-outline"
            onPress={submitAction}
            disabled={!selectedTargetPlayerId}
          />
        ) : (
          <View style={styles.waitingBox}>
            <Ionicons name={meAlive ? "eye-off-outline" : "skull-outline"} size={20} color={colors.textMuted} />
            <Text style={styles.waitingText}>
              {meAlive ? "Sıra sende değil. Faz devam ediyor, bekle." : "Elendin. Artık aksiyon kullanamazsın, oyunu izleyebilirsin."}
            </Text>
          </View>
        )}

        {role === "Doctor" && phase === "DoctorProtect" ? (
          <Text style={styles.tip}>Kural: Kendini art arda iki gece koruyamazsın.</Text>
        ) : null}

        {role === "Vampire" && phase === "VampireVote" ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Vampir Oyları (Canlı)</Text>
            {vampireVotePreview.length === 0 ? <Text style={styles.resultText}>Henüz oy girilmedi.</Text> : null}
            {vampireVotePreview.map((entry) => (
              <Text key={`${entry.vampirePlayerId}-${entry.targetPlayerId}`} style={styles.resultText}>
                {playerNameById.get(entry.vampirePlayerId) ?? entry.vampirePlayerId} → {playerNameById.get(entry.targetPlayerId) ?? entry.targetPlayerId}
              </Text>
            ))}
          </View>
        ) : null}

        {(phase === "ExecutionResolve" || phase === "WinCheck") && lastDayVoteSummary?.entries?.length ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Oylama Dökümü</Text>
            {lastDayVoteSummary.entries
              .slice()
              .sort((a: { votes: number }, b: { votes: number }) => b.votes - a.votes)
              .map((entry: { playerId: string; votes: number }) => (
                <Text key={entry.playerId} style={styles.resultText}>
                  {(entry.playerId === "__NO_LYNCH__" ? "Kimseyi Gönderme" : playerNameById.get(entry.playerId) ?? entry.playerId)}: {entry.votes} oy
                </Text>
              ))}
            {lastDayVoteSummary.noLynchWon ? <Text style={styles.resultText}>Sonuç: Kimse elenmedi.</Text> : null}
          </View>
        ) : null}

        {(phase === "DayStart" || phase === "ExecutionResolve" || phase === "WinCheck") && gameState?.lastEliminationSummary ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{gameState.lastEliminationSummary.source === "Night" ? "Gece Sonucu" : "Gündüz Sonucu"}</Text>
            <Text style={styles.resultText}>
              {(playerNameById.get(gameState.lastEliminationSummary.playerId) ?? gameState.lastEliminationSummary.playerId)} elendi.
            </Text>
            {roomState?.rules?.revealEliminatedRole ? (
              <Text style={styles.resultText}>Rol: {gameState.lastEliminationSummary.revealedRole ?? "Bilinmiyor"}</Text>
            ) : (
              <Text style={styles.resultText}>Rol gizli kaldı.</Text>
            )}
          </View>
        ) : null}

        {privateResultText ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Özel Sonuç</Text>
            <Text style={styles.resultText}>{privateResultText}</Text>
          </View>
        ) : null}
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingBottom: spacing.xl,
    gap: 14
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
  stateAlive: {
    color: colors.success
  },
  stateDead: {
    color: colors.textDim
  },
  selectButton: {
    marginTop: 2
  },
  waitingBox: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "rgba(18,19,21,0.85)",
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  waitingText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 15,
    lineHeight: 22
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
  error: {
    color: colors.danger,
    fontFamily: typography.sansMedium,
    textAlign: "center"
  }
});
