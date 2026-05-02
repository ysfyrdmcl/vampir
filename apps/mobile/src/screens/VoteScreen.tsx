import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

  const candidates = players.filter(
    (p) =>
      p.isAlive &&
      (isMayorElection ? true : p.playerId !== playerId) &&
      (isMayorElection ? true : p.playerId !== guardProtectedPlayerId)
  );

  const submitVote = () => {
    if (!meAlive) return;
    if (!selectedTargetPlayerId) return;
    emitGameAction(isMayorElection ? "mayor-vote" : "day-vote", selectedTargetPlayerId);
  };

  return (
    <ScreenShell scene="vote" headerTitle="GÜNDÜZ FAZI">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{isMayorElection ? "Başkan Seçimi" : "Oylama"}</Text>
        <Text style={styles.subtitle}>
          {isMayorElection ? "Köy başkanını seç. Başkanın oyu gündüz 2 sayılır." : "Kimi köyden göndermek istiyorsun?"}
        </Text>
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
        <PhaseCountdown phaseEndsAt={gameState?.phaseEndsAt ?? null} />

        <View style={styles.grid}>
          {!isMayorElection && noLynchEnabled ? (
            <Pressable
              key="__NO_LYNCH__"
              style={[styles.card, selectedTargetPlayerId === "__NO_LYNCH__" ? styles.cardSelected : null]}
              disabled={!meAlive}
              onPress={() => setSelectedTargetPlayerId("__NO_LYNCH__")}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>Ø</Text>
              </View>
              <Text style={[styles.name, selectedTargetPlayerId === "__NO_LYNCH__" ? styles.nameSelected : null]}>Kimseyi Gönderme</Text>
              <Text style={styles.voteHint}>{selectedTargetPlayerId === "__NO_LYNCH__" ? "● SEÇİLDİ" : "● OY VER"}</Text>
            </Pressable>
          ) : null}
          {candidates.map((player) => {
            const isSelected = selectedTargetPlayerId === player.playerId;
            return (
              <Pressable
                key={player.playerId}
                style={[styles.card, isSelected ? styles.cardSelected : null]}
                disabled={!meAlive}
                onPress={() => setSelectedTargetPlayerId(player.playerId)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsFromName(player.nickname)}</Text>
                </View>
                <Text style={[styles.name, isSelected ? styles.nameSelected : null]}>
                  {player.nickname}
                  {player.playerId === mayorPlayerId ? " (Başkan)" : ""}
                </Text>
                <Text style={styles.voteHint}>{isSelected ? "● HEDEF SEÇİLDİ" : "● OY VER"}</Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label={isMayorElection ? "Başkanı Onayla" : "Oylamayı Tamamla"}
          iconName="checkmark-done-outline"
          onPress={submitVote}
          disabled={!meAlive || !selectedTargetPlayerId}
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
  title: {
    color: "#f4c4bc",
    fontFamily: typography.serif,
    fontSize: 56 / 1.45,
    textAlign: "center"
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: typography.serifRegular,
    fontSize: 20
  },
  mayorInfo: {
    color: colors.secondary,
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  guardInfo: {
    color: "#58c1b6",
    textAlign: "center",
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10
  },
  card: {
    width: "48.4%",
    minHeight: 176,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    backgroundColor: colors.surfaceGlass,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 14,
    gap: 8
  },
  cardSelected: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.42)",
    backgroundColor: "rgba(8,8,10,0.9)",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 22
  },
  name: {
    color: "#dec1bd",
    fontFamily: typography.serifSemi,
    fontSize: 36 / 1.72,
    textAlign: "center"
  },
  nameSelected: {
    color: colors.parchmentText
  },
  voteHint: {
    color: colors.primaryBright,
    fontFamily: typography.sansBold,
    fontSize: 13,
    letterSpacing: 1
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
