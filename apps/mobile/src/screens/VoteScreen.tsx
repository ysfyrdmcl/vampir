import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../app/navigation/routes";
import { ConfirmActionSheet } from "../components/ConfirmActionSheet";
import { PhaseBanner } from "../components/PhaseBanner";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenShell } from "../components/ScreenShell";
import { TargetSelectionList, type TargetSelectionItem } from "../components/TargetSelectionList";
import { emitGameAction } from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toFriendlyErrorText } from "../ui/error-text";

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
  const insets = useSafeAreaInsets();
  const roomState = useGameStore((s) => s.roomState);
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const selectedTargetPlayerId = useGameStore((s) => s.selectedTargetPlayerId);
  const setSelectedTargetPlayerId = useGameStore((s) => s.setSelectedTargetPlayerId);
  const privateResultText = useGameStore((s) => s.privateResultText);
  const errorCode = useGameStore((s) => s.errorCode);
  const errorText = toFriendlyErrorText(errorCode);
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
  const tiedTopCandidates = gameState?.lastDayVoteSummary?.tiedTopCandidates ?? [];
  const hasTieRevote = !isMayorElection && gameState?.tieCountInRound ? tiedTopCandidates.length > 1 : false;
  const tieCandidateSet = useMemo(() => new Set(tiedTopCandidates), [tiedTopCandidates]);

  const candidates = players.filter((p) => {
    if (!p.isAlive) return false;
    if (!isMayorElection && p.playerId === playerId) return false;
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

  const submitVote = () => {
    if (!meAlive) return;
    if (!selectedTargetPlayerId) return;
    emitGameAction(isMayorElection ? "mayor-vote" : "day-vote", selectedTargetPlayerId);
    setConfirmOpen(false);
  };

  return (
    <ScreenShell scene="vote" headerTitle="GÜNDÜZ FAZI">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PhaseBanner
          title={isMayorElection ? "Baskan Secimi" : "Oylama"}
          description={isMayorElection ? "Koy baskanini sec. Baskanin oyu gunduz 2 sayilir." : "Kimi koyden gondermek istiyorsun?"}
          notice={gameState?.tieCountInRound ? "Koy ikiye bolundu. Son karar icin tekrar oy veriliyor." : undefined}
          phaseEndsAt={gameState?.phaseEndsAt ?? null}
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
        <View style={styles.voteMissionCard}>
          <View style={styles.voteMissionIcon}>
            <Ionicons name={meAlive ? "people-outline" : "skull-outline"} size={18} color={colors.secondary} />
          </View>
          <View style={styles.voteMissionCopy}>
            <Text style={styles.selectedLabel}>{isMayorElection ? "Sıradaki karar" : "Oylama kararı"}</Text>
            <Text style={styles.selectedValue}>
              {!meAlive ? "Elendin; oylamayı izliyorsun." : selectedName ? `${selectedName} seçildi.` : "Bir hedef seç ve alttan onayla."}
            </Text>
          </View>
        </View>
        <TargetSelectionList
          items={targetItems}
          onSelect={setSelectedTargetPlayerId}
          disabledSummary="Elendin; oy kullanamazsın, sonuç akışını izleyebilirsin."
        />

        <Text style={styles.help}>
          {!meAlive
            ? "Elendin. Bu oylamaya katılamazsın, sonucu izleyebilirsin."
            : isMayorElection
              ? "Süre bitmeden başkan tercihini değiştirebilirsin."
              : "Süre bitmeden önce seçimini değiştirebilirsin."}
        </Text>
        {privateResultText ? <Text style={styles.result}>{privateResultText}</Text> : null}
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      </ScrollView>
      <View style={[styles.stickyAction, { bottom: 84 + insets.bottom }]}>
        <View style={styles.actionSummary}>
          <Text style={styles.actionSummaryLabel}>Hedef</Text>
          <Text style={styles.actionSummaryValue} numberOfLines={1}>{selectedName ?? "Seçilmedi"}</Text>
        </View>
        <PrimaryButton
          label={isMayorElection ? "Başkanı Onayla" : "Oylamayı Tamamla"}
          iconName="checkmark-done-outline"
          onPress={() => setConfirmOpen(true)}
          disabled={!meAlive || !selectedTargetPlayerId}
          compact
          style={styles.actionButton}
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
  scroll: {
    flex: 1
  },
  content: {
    paddingBottom: 132,
    gap: 14
  },
  stickyAction: {
    position: "absolute",
    left: spacing.safe,
    right: spacing.safe,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  actionButton: {
    width: 150
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
  voteMissionCard: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.24)",
    borderRadius: 14,
    backgroundColor: "rgba(36,31,20,0.72)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  voteMissionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.36)",
    backgroundColor: "rgba(50,40,17,0.42)",
    alignItems: "center",
    justifyContent: "center"
  },
  voteMissionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  selectedLabel: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 1.1
  },
  selectedValue: {
    color: colors.secondary,
    fontFamily: typography.serifSemi,
    fontSize: 20
  },
  help: {
    color: colors.textDim,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: 17
  },
  result: {
    color: colors.secondary,
    textAlign: "center",
    fontFamily: typography.sansMedium
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    fontFamily: typography.sansMedium
  }
});
