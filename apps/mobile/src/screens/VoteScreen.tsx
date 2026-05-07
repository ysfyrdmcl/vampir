import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
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
import { showToast } from "../ui/toast-store";
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
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(socketErrorVisibleOnRoute(errorCode, "Vote"));
  const noLynchEnabled = roomState?.rules?.noLynchEnabled ?? false;
  const isMayorElection = gameState?.phase === "MayorElection";
  const mayorPlayerId = gameState?.mayorPlayerId ?? null;
  const guardProtectedPlayerId = gameState?.guardProtectedPlayerId ?? null;
  const players = roomState?.players ?? [];
  const mePlayer = players.find((p) => p.playerId === playerId);
  const meAlive = mePlayer?.isAlive ?? true;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selectedName =
    selectedTargetPlayerId === "__NO_LYNCH__"
      ? "Kimseyi Gönderme"
      : players.find((player) => player.playerId === selectedTargetPlayerId)?.nickname ?? null;
  const voteInfoText = !meAlive
    ? "Elendin; oylamayı izliyorsun."
    : selectedName
      ? `${selectedName} seçildi.`
      : "Bir hedef seç ve alttan onayla.";
  const voteInfoDetail = !meAlive
    ? "Oy kullanamazsın, sonucu izleyebilirsin."
    : isMayorElection
      ? "Başkan tercihini süre bitmeden kilitle."
      : "Oyunu süre bitmeden kilitle.";
  const tiedTopCandidates = gameState?.lastDayVoteSummary?.tiedTopCandidates ?? [];
  const hasTieRevote = !isMayorElection && gameState?.tieCountInRound ? tiedTopCandidates.length > 1 : false;
  const tieCandidateSet = useMemo(() => new Set(tiedTopCandidates), [tiedTopCandidates]);

  const candidates = players.filter((p) => {
    if (!p.isAlive) return false;
    if (p.playerId === playerId) return false;
    if (!isMayorElection && p.playerId === guardProtectedPlayerId) return false;
    if (hasTieRevote && !tieCandidateSet.has(p.playerId)) return false;
    return true;
  });
  const targetItems: TargetSelectionItem[] = [
    ...(!isMayorElection && noLynchEnabled && !hasTieRevote
      ? [
          {
            id: "__NO_LYNCH__",
            label: "Kimseyi Gonderme",
            initials: "Ø",
            isAlive: true,
            isSelectable: meAlive,
            isSelected: selectedTargetPlayerId === "__NO_LYNCH__",
            statusText: "Bos oy",
            disabledReason: meAlive ? null : "Elendin"
          }
        ]
      : []),
    ...candidates.map((player) => ({
      id: player.playerId,
      label: player.nickname,
      initials: initialsFromName(player.nickname),
      isAlive: player.isAlive,
      isSelectable: meAlive,
      isSelected: selectedTargetPlayerId === player.playerId,
      statusText: player.playerId === mayorPlayerId ? "Baskan adayi" : "Aday",
      disabledReason: meAlive ? null : "Elendin",
      badgeText: player.playerId === mayorPlayerId ? "BASKAN" : null
    }))
  ];
  const selectedVoteTarget = targetItems.find((item) => item.id === selectedTargetPlayerId);
  const voteDisabledReason = !meAlive
    ? "Elendin, artık aksiyon alamazsın"
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
    if (!meAlive) return;
    if (!selectedTargetPlayerId) return;
    emitGameAction(isMayorElection ? "mayor-vote" : "day-vote", selectedTargetPlayerId);
    setConfirmOpen(false);
    showToast("Kararın kilitlendi", "gold", 1500);
  };

  return (
    <ScreenShell scene="vote" bottomNavActiveIndex={0} headerTitle="GÜNDÜZ FAZI" contentDensity="game">
      <View style={styles.screenRoot}>
        <PhaseBanner
          title={isMayorElection ? "Baskan Secimi" : "Oylama"}
          description={isMayorElection ? "Koy baskanini sec. Baskanin oyu gunduz 2 sayilir." : "Kimi koyden gondermek istiyorsun?"}
          notice={gameState?.tieCountInRound ? "Koy ikiye bolundu. Son karar icin tekrar oy veriliyor." : undefined}
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
            <Text style={styles.tieText}>Yalnizca beraberlikte kalan adaylar icin tekrar oy kullaniliyor.</Text>
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

          {privateResultText && privateResultKind === "lover" ? (
            <PrivateInfoCard kind="lover" body={privateResultText} />
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
          label={isMayorElection ? "Başkanı Onayla" : "Oylamayı Tamamla"}
          iconName="checkmark-done-outline"
          onPress={() => setConfirmOpen(true)}
          disabled={Boolean(voteDisabledReason)}
          compact
          style={[styles.actionButton, { width: actionButtonWidth }]}
        />
      </View>
      <ConfirmActionSheet
        visible={confirmOpen}
        title={isMayorElection ? "Baskan Oyu Kilitlensin mi?" : "Oyunu Kilitlemek Istiyor musun?"}
        description={
          selectedName
            ? `${selectedName} icin verdigin oy onaylanacak. Faz bitene kadar degistiremeyebilirsin.`
            : "Secim onaylanacak."
        }
        confirmLabel={isMayorElection ? "Baskan Oyu Kilitle" : "Oyumu Kilitle"}
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
