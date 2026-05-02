import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { RoomPlayerView } from "@vampir-koylu/shared";
import { useState } from "react";
import type { RootStackParamList } from "../app/navigation/routes";
import { ConfirmActionSheet } from "../components/ConfirmActionSheet";
import { DeadSealOverlay } from "../components/DeadSealOverlay";
import { PrimaryButton } from "../components/PrimaryButton";
import { RoleBadge } from "../components/RoleBadge";
import { ScreenShell } from "../components/ScreenShell";
import { StatusBadge } from "../components/StatusBadge";
import { TeamBadge } from "../components/TeamBadge";
import { buildGameAnalysis } from "../logging/game-analysis";
import { shouldShowLogEntry, toReadableLogText } from "../logging/log-policy";
import type { LogFeedEntry } from "../logging/log-feed-store";
import { useLogFeedStore } from "../logging/log-feed-store";
import { emitLeaveRoom, emitStartRoom } from "../socket/runtime";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { toRoleLabel } from "../utils/role-label";

type Props = NativeStackScreenProps<RootStackParamList, "GameOver">;

export function GameOverScreen({ navigation }: Props) {
  const winner = useGameStore((s) => s.gameWinner);
  const roomState = useGameStore((s) => s.roomState);
  const players = roomState?.players ?? [];
  const logs = useLogFeedStore((s) => s.entries);
  const minPlayers = roomState?.minPlayers ?? 4;
  const timeline = buildTimeline(logs, players);
  const analysis = buildGameAnalysis(logs, winner, players);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isVampireWin = winner === "Vampires";
  const winnerIcon = isVampireWin ? "moon-outline" : "sunny-outline";
  const winnerTitle = isVampireWin ? "VAMPİRLER KAZANDI" : "KÖYLÜLER KAZANDI";
  const winnerDescription = isVampireWin
    ? "Karanlık çöktü ve avcılar artık avlanan oldu."
    : "Köy dayanışma ile geceyi atlattı.";

  const exitToHome = () => {
    emitLeaveRoom();
    navigation.navigate("Welcome");
  };

  return (
    <ScreenShell scene="gameover" headerTitle="GÜNDÜZ FAZI">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Oyun Bitti</Text>

        <View style={[styles.winnerCard, isVampireWin ? styles.winnerCardVampire : styles.winnerCardVillager]}>
          <View style={[styles.winnerIconWrap, isVampireWin ? styles.winnerIconVampire : styles.winnerIconVillager]}>
            <Ionicons name={winnerIcon} size={34} color={isVampireWin ? colors.primaryBright : colors.secondary} />
          </View>
          <Text style={[styles.winner, isVampireWin ? styles.vampire : styles.villager]}>{winnerTitle}</Text>
          <Text style={styles.winnerDesc}>{winnerDescription}</Text>
          <Text style={styles.winnerMeta}>
            {isVampireWin ? "Gece tarafı üstünlüğü ele geçirdi" : "Gündüz ittifakı köyü savundu"}
          </Text>
        </View>

        {analysis ? (
          <>
            <Text style={styles.summaryTitle}>OYUN SONU ANALİZİ</Text>
            <View style={styles.analysisList}>
              <Text style={styles.timelineText}>Kazanan: {analysis.winnerText}</Text>
              <Text style={styles.timelineText}>Raunt: {analysis.roundsPlayed || "-"}</Text>
              <Text style={styles.timelineText}>Eleme: {analysis.eliminationCount}</Text>
              <Text style={styles.timelineText}>Beraberlik: {analysis.tieCount}</Text>
              <Text style={styles.timelineText}>Hayatta kalanlar: {analysis.aliveText}</Text>
              {analysis.highlights.map((line) => (
                <Text key={line} style={styles.timelineText}>{line}</Text>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.summaryTitle}>FİNAL ROL AÇILIMI</Text>
        <View style={styles.roleGrid}>
          {players.map((player) => {
            const isVampireTeam = player.role === "Vampire";
            return (
              <View key={`role-${player.playerId}`} style={[styles.roleCard, isVampireTeam ? styles.roleCardVampire : styles.roleCardVillage]}>
                <View style={styles.roleCardTop}>
                  <Text style={styles.roleCardName} numberOfLines={1}>{player.nickname}</Text>
                  <StatusBadge label={player.isAlive ? "Hayatta" : "Elendi"} tone={player.isAlive ? "alive" : "dead"} compact />
                </View>
                <RoleBadge role={player.role} />
                <TeamBadge role={player.role} />
                <DeadSealOverlay visible={!player.isAlive} />
              </View>
            );
          })}
        </View>

        <Text style={styles.summaryTitle}>OYUN ÖZETİ</Text>
        <View style={styles.summaryList}>
          {players.map((player) => (
            <View key={player.playerId} style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Ionicons name="person-outline" size={18} color={player.isAlive ? colors.text : colors.textDim} />
                <View>
                  <Text style={[styles.summaryName, !player.isAlive ? styles.summaryDead : null]}>{player.nickname}</Text>
                  <Text style={styles.roleLabel}>Rol: {toRoleLabel(player.role)}</Text>
                </View>
              </View>
              <View style={styles.summaryRight}>
                <TeamBadge role={player.role} compact />
                <StatusBadge label={player.isAlive ? "Hayatta" : "Elendi"} tone={player.isAlive ? "alive" : "dead"} compact />
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.summaryTitle}>OYUN ZAMAN ÇİZELGESİ</Text>
        <View style={styles.timelineList}>
          {timeline.length ? (
            timeline.map((item, idx) => (
              <View key={`${item.time}-${idx}`} style={styles.timelineRow}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <Text style={styles.timelineText}>{item.text}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.timelineEmpty}>Bu oyun için detaylı zaman çizelgesi kaydı bulunamadı.</Text>
          )}
        </View>

        <PrimaryButton
          label="Yeni Oyun"
          iconName="refresh-outline"
          onPress={emitStartRoom}
          disabled={players.length < minPlayers}
        />
        <PrimaryButton label="Ana Menü" iconName="home-outline" variant="ghost" onPress={() => setConfirmOpen(true)} />
      </ScrollView>
      <ConfirmActionSheet
        visible={confirmOpen}
        title="Ana Menüye Dön?"
        description="Bu maç kapanır. İstersen yeniden oyun başlatıp lobiye de dönebilirsin."
        confirmLabel="Ana Menüye Dön"
        variant="blood"
        onConfirm={() => {
          setConfirmOpen(false);
          exitToHome();
        }}
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
    paddingBottom: spacing.xl,
    gap: 14
  },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 58 / 1.45,
    textAlign: "center"
  },
  winnerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
    gap: 10
  },
  winnerCardVampire: {
    borderColor: "rgba(196,55,55,0.36)",
    backgroundColor: "rgba(34,14,14,0.88)"
  },
  winnerCardVillager: {
    borderColor: "rgba(233,195,73,0.34)",
    backgroundColor: "rgba(34,28,15,0.84)"
  },
  winnerIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  winnerIconVampire: {
    borderColor: "rgba(196,55,55,0.5)",
    backgroundColor: "rgba(80,20,20,0.28)"
  },
  winnerIconVillager: {
    borderColor: "rgba(233,195,73,0.52)",
    backgroundColor: "rgba(110,82,16,0.25)"
  },
  winner: {
    fontFamily: typography.serif,
    fontSize: 52 / 1.45,
    textAlign: "center"
  },
  vampire: {
    color: colors.primaryBright
  },
  villager: {
    color: colors.secondary
  },
  winnerDesc: {
    color: colors.textDim,
    fontFamily: typography.serifRegular,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 27
  },
  winnerMeta: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  summaryTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: typography.label,
    letterSpacing: 2.2
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  roleCard: {
    position: "relative",
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: 6
  },
  roleCardVampire: {
    borderColor: "rgba(196,55,55,0.35)",
    backgroundColor: "rgba(36,13,13,0.82)"
  },
  roleCardVillage: {
    borderColor: "rgba(170,137,132,0.28)",
    backgroundColor: "rgba(14,14,15,0.78)"
  },
  roleCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  roleCardName: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 17,
    flex: 1
  },
  summaryList: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 14,
    backgroundColor: "rgba(12,12,13,0.75)",
    overflow: "hidden"
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(170,137,132,0.16)"
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  summaryName: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 20
  },
  summaryDead: {
    color: colors.textDim
  },
  roleLabel: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  summaryRight: {
    alignItems: "flex-end",
    gap: 2
  },
  stateAlive: {
    color: colors.success
  },
  stateDead: {
    color: colors.danger
  },
  timelineList: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 14,
    backgroundColor: "rgba(12,12,13,0.75)",
    paddingVertical: 8
  },
  analysisList: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.3)",
    borderRadius: 14,
    backgroundColor: "rgba(33,29,16,0.72)",
    padding: spacing.md,
    gap: 6
  },
  timelineRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(170,137,132,0.12)",
    gap: 4
  },
  timelineTime: {
    color: colors.secondary,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  timelineText: {
    color: colors.text,
    fontFamily: typography.serifRegular,
    fontSize: 15,
    lineHeight: 21
  },
  timelineEmpty: {
    color: colors.textDim,
    fontFamily: typography.serifRegular,
    fontSize: 15,
    padding: spacing.md
  }
});

function buildTimeline(entries: LogFeedEntry[], players: RoomPlayerView[]): Array<{ time: string; text: string }> {
  const picked = entries.filter((entry) => shouldShowLogEntry(entry, "general"));
  const playerNameById = new Map(players.map((player) => [player.playerId, player.nickname] as const));

  return picked.map((entry) => ({
    time: formatTime(entry.ts),
    text: toReadableLogText(entry.event, localizePayloadNames(entry.payload, playerNameById))
  }));
}

function localizePayloadNames(payload: Record<string, unknown> | undefined, playerNameById: Map<string, string>) {
  if (!payload) return payload;
  const copy: Record<string, unknown> = { ...payload };
  for (const key of ["targetPlayerId", "detectiveTargetPlayerId", "executedPlayerId", "playerId", "mayorPlayerId", "protectedPlayerId"]) {
    const value = copy[key];
    if (typeof value === "string" && playerNameById.has(value)) {
      copy[key] = playerNameById.get(value) ?? value;
    }
  }
  if (Array.isArray(copy.tiedTopCandidates)) {
    copy.tiedTopCandidates = copy.tiedTopCandidates.map((id) =>
      typeof id === "string" ? (playerNameById.get(id) ?? id) : id
    );
  }
  return copy;
}

function formatTime(ts: string): string {
  const date = new Date(ts);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
