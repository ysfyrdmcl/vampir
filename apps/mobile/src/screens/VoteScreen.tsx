import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { ConfirmActionSheet } from "../components/ConfirmActionSheet";
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
import { uiStandard } from "../ui/ui-standard";

type Props = NativeStackScreenProps<RootStackParamList, "Vote">;

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function VoteScreen(_: Props) {
  const { width, height } = useWindowDimensions();
  const roomState = useGameStore((s) => s.roomState);
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const selectedTargetPlayerId = useGameStore((s) => s.selectedTargetPlayerId);
  const setSelectedTargetPlayerId = useGameStore((s) => s.setSelectedTargetPlayerId);
  const privateResultText = useGameStore((s) => s.privateResultText);
  const privateResultKind = useGameStore((s) => s.privateResultKind);
  const activeResultEvent = useGameStore((s) => s.activeResultEvent);
  const gameActionPending = useGameStore((s) => s.gameActionPending);
  const acceptedGameAction = useGameStore((s) => s.acceptedGameAction);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(socketErrorVisibleOnRoute(errorCode, "Vote"));
  const noLynchEnabled = roomState?.rules?.noLynchEnabled ?? false;
  const isMayorElection = gameState?.phase === "MayorElection";
  const mayorPlayerId = gameState?.mayorPlayerId ?? null;
  const guardProtectedPlayerId = gameState?.guardProtectedPlayerId ?? null;
  const players = roomState?.players ?? [];
  const mePlayer = players.find((p) => p.playerId === playerId);
  const meAlive = mePlayer?.isAlive ?? true;
  const ownEliminationResultActive = Boolean(playerId && activeResultEvent?.playerIds?.includes(playerId));
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    setConfirmOpen(false);
  }, [gameState?.phase, gameState?.round, gameState?.tieCountInRound, gameState?.isPaused]);
  const selectedName = useMemo(
    () =>
      selectedTargetPlayerId === "__NO_LYNCH__"
        ? "Kimseyi Gönderme"
        : players.find((player) => player.playerId === selectedTargetPlayerId)?.nickname ?? null,
    [players, selectedTargetPlayerId]
  );
  const voteInfoText = ownEliminationResultActive
    ? "Oylama sonucu açıklanıyor."
    : !meAlive
    ? "Elendin, oylamayı izliyorsun."
    : selectedName
      ? `${selectedName} seçildi.`
      : "Bir hedef seç ve alttan onayla.";
  const voteInfoDetail = ownEliminationResultActive
    ? "Sonuç açıklandıktan sonra izleyici durumuna geçeceksin."
    : !meAlive
    ? "Oy kullanamazsın, sonucu izleyebilirsin."
    : isMayorElection
      ? "Başkan tercihini gönder; faz bitene kadar değiştirebilirsin."
      : "Oyunu gönder; faz bitene kadar değiştirebilirsin.";
  const tiedTopCandidates = gameState?.lastDayVoteSummary?.revoteCandidateIds ?? gameState?.lastDayVoteSummary?.tiedTopCandidates ?? [];
  const hasTieRevote = !isMayorElection && gameState?.tieCountInRound ? tiedTopCandidates.length > 1 : false;
  const tieCandidateSet = useMemo(() => new Set(tiedTopCandidates), [tiedTopCandidates]);

  const candidates = useMemo(
    () =>
      players.filter((p) => {
        if (!p.isAlive) return false;
        if (p.playerId === playerId) return false;
        if (!isMayorElection && p.playerId === guardProtectedPlayerId) return false;
        if (hasTieRevote && !tieCandidateSet.has(p.playerId)) return false;
        return true;
      }),
    [guardProtectedPlayerId, hasTieRevote, isMayorElection, playerId, players, tieCandidateSet]
  );
  const targetItems: TargetSelectionItem[] = useMemo(
    () => [
      ...(!isMayorElection && noLynchEnabled && (!hasTieRevote || tieCandidateSet.has("__NO_LYNCH__"))
        ? [
            {
              id: "__NO_LYNCH__",
              label: "Kimseyi Gönderme",
              initials: "Ø",
              isAlive: true,
              isSelectable: meAlive && !gameActionPending,
              isSelected: selectedTargetPlayerId === "__NO_LYNCH__",
              statusText: "Boş oy",
              disabledReason: meAlive ? null : "Elendin"
            }
          ]
        : []),
      ...candidates.map((player) => ({
        id: player.playerId,
        label: player.nickname,
        initials: initialsFromName(player.nickname),
        isAlive: player.isAlive,
        isSelectable: meAlive && !gameActionPending,
        isSelected: selectedTargetPlayerId === player.playerId,
        statusText: player.playerId === mayorPlayerId ? "Başkan adayı" : "Aday",
        disabledReason: meAlive ? null : "Elendin",
        badgeText: player.playerId === mayorPlayerId ? "BASKAN" : null
      }))
    ],
    [candidates, gameActionPending, hasTieRevote, isMayorElection, mayorPlayerId, meAlive, noLynchEnabled, selectedTargetPlayerId, tieCandidateSet]
  );
  const selectedVoteTarget = targetItems.find((item) => item.id === selectedTargetPlayerId);
  const voteDisabledReason = !meAlive
    ? "Elendin, artık aksiyon alamazsın"
    : gameActionPending
      ? "Sunucudan onay bekleniyor"
    : gameState?.isPaused
      ? "Oyun duraklatıldı"
    : connectionStatus !== "connected"
      ? "Bağlantı bekleniyor"
    : !targetItems.length
      ? "Bu tur uygun aday yok; sonucu bekle"
    : acceptedGameAction?.targetPlayerId === selectedTargetPlayerId && selectedTargetPlayerId
      ? "Oy tercihin gönderildi; hedefini değiştirebilirsin"
    : !selectedTargetPlayerId
      ? "Bir hedef seç"
      : !selectedVoteTarget?.isSelectable
      ? "Bu hedef seçilemez"
      : null;
  const layout = getResponsiveMetrics(width, height);
  const actionDockBottom = uiStandard.actionDock.bottomGap;
  const actionScrollPadding = uiStandard.actionDock.minHeight + actionDockBottom + uiStandard.actionDock.scrollGap;
  const actionButtonWidth = scaledSize(150, layout.controlScale, 132, 150);

  const submitVote = () => {
    if (voteDisabledReason || !selectedTargetPlayerId) return;
    void emitGameAction(isMayorElection ? "mayor-vote" : "day-vote", selectedTargetPlayerId);
    setConfirmOpen(false);
  };

  return (
    <ScreenShell
      scene="vote"
      bottomNavActiveIndex={0}
      headerTitle="GÜNDÜZ FAZI"
      contentDensity="game"
      suppressTransientBotSpeech
    >
      <View style={styles.screenRoot}>
        <PhaseBanner
          title={isMayorElection ? "Başkan Seçimi" : "Oylama"}
          description={isMayorElection ? "Köy başkanını seç. Başkanın oyu gündüz 2 sayılır." : "Kimi köyden göndermek istiyorsun?"}
          notice={gameState?.tieCountInRound ? "Köy ikiye bölündü. Son karar için tekrar oy veriliyor." : undefined}
          phaseEndsAt={gameState?.phaseEndsAt ?? null}
          infoLabel={isMayorElection ? "Sıradaki karar" : "Oylama kararı"}
          infoText={voteInfoText}
          infoDetail={voteInfoDetail}
          infoIcon={meAlive ? "people-outline" : "skull-outline"}
          infoActive={meAlive}
          compact
          showCountdown={false}
        />
        {hasTieRevote ? (
          <View style={styles.tieCard}>
            <Text style={styles.tieTitle}>Beraberlikte Son Tur</Text>
            <Text style={styles.tieText}>Yalnızca berabere kalan adaylar için tekrar oy kullanılıyor.</Text>
          </View>
        ) : null}
        {mayorPlayerId && !isMayorElection ? (
          <Text style={styles.mayorInfo}>
            Aktif Başkan: {players.find((p) => p.playerId === mayorPlayerId)?.nickname ?? mayorPlayerId}
          </Text>
        ) : null}
        {guardProtectedPlayerId && !isMayorElection ? (
          <Text style={styles.guardInfo}>
            Gardiyan Koruması: {players.find((p) => p.playerId === guardProtectedPlayerId)?.nickname ?? guardProtectedPlayerId} bugün oylanamaz.
          </Text>
        ) : null}
        <ScrollView
          style={styles.targetScroll}
          contentContainerStyle={[styles.targetContent, { paddingBottom: actionScrollPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <TargetSelectionList
            items={targetItems}
            onSelect={setSelectedTargetPlayerId}
            disabledSummary={null}
          />

          {privateResultText && privateResultKind && privateResultKind !== "lover" ? (
            <PrivateInfoCard kind={privateResultKind} body={privateResultText} />
          ) : null}
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        </ScrollView>
      </View>
      <View style={[styles.stickyAction, { bottom: actionDockBottom }]}>
        <View style={styles.actionSummary}>
          <Text style={styles.actionSummaryLabel}>Hedef</Text>
          <Text style={styles.actionSummaryValue} numberOfLines={1}>{selectedName ?? "Seçilmedi"}</Text>
          {voteDisabledReason ? <Text style={styles.actionDisabledHint} numberOfLines={1}>{voteDisabledReason}</Text> : null}
        </View>
        <PrimaryButton
          label={gameActionPending ? "Gönderiliyor…" : acceptedGameAction ? "Oyumu Güncelle" : "Oyumu Gönder"}
          iconName={gameActionPending ? "hourglass-outline" : "checkmark-done-outline"}
          onPress={() => setConfirmOpen(true)}
          disabled={Boolean(voteDisabledReason)}
          compact
          style={[styles.actionButton, { width: actionButtonWidth }]}
        />
      </View>
      <ConfirmActionSheet
        visible={confirmOpen}
        title={isMayorElection ? "Başkan tercihin gönderilsin mi?" : "Oy tercihin gönderilsin mi?"}
        description={
          selectedName
            ? `${selectedName} için oy vereceksin. Faz bitene kadar tercihini değiştirebilirsin.`
            : "Seçimin onaylanacak."
        }
        confirmLabel={acceptedGameAction ? "Oyumu Güncelle" : "Oyumu Gönder"}
        variant={hasTieRevote ? "danger" : "blood"}
        onConfirm={submitVote}
        onCancel={() => setConfirmOpen(false)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
    borderColor: "rgba(234,194,86,0.34)",
    borderRadius: 16,
    backgroundColor: "rgba(8,8,12,0.66)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
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
  mayorInfo: {
    color: colors.secondary,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  tieCard: {
    borderWidth: 1,
    borderColor: "rgba(181,38,25,0.4)",
    borderRadius: 12,
    backgroundColor: "rgba(52,16,16,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3
  },
  tieTitle: {
    color: "#ffb8ac",
    fontFamily: typography.sansBold,
    fontSize: 12,
    letterSpacing: 1.1
  },
  tieText: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  guardInfo: {
    color: "#58c1b6",
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    fontFamily: typography.sansMedium
  }
});
