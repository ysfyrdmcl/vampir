import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RoomPlayerView } from "@vampir-koylu/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../app/navigation/routes";
import { ScreenShell } from "../components/ScreenShell";
import { buildGameAnalysis } from "../logging/game-analysis";
import { shouldShowLogEntry, toReadableLogText } from "../logging/log-policy";
import type { LogFeedEntry } from "../logging/log-feed-store";
import { useLogFeedStore } from "../logging/log-feed-store";
import {
  getPlayerNote,
  loadPlayerNotes,
  savePlayerNote,
  type PlayerNoteTag,
  type PlayerNotesById
} from "../storage/player-notes-storage";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "GameLog">;
type Tab = "general" | "personal";
type GeneralFilter = "all" | "night" | "vote" | "result";

const EMPTY_PLAYERS: RoomPlayerView[] = [];

export function GameLogScreen(_: Props) {
  const entries = useLogFeedStore((s) => s.entries);
  const role = useGameStore((s) => s.privateRole);
  const roomPlayers = useGameStore((s) => s.roomState?.players ?? EMPTY_PLAYERS);
  const playerId = useGameStore((s) => s.playerId);
  const roomCode = useGameStore((s) => s.roomState?.roomCode ?? s.roomCode);
  const winner = useGameStore((s) => s.gameWinner);
  const playerNameById = useMemo(
    () => new Map(roomPlayers.map((player) => [player.playerId, player.nickname] as const)),
    [roomPlayers]
  );
  const [tab, setTab] = useState<Tab>("general");
  const [generalFilter, setGeneralFilter] = useState<GeneralFilter>("all");
  const [playerNotes, setPlayerNotes] = useState<PlayerNotesById>({});
  const [entryToast, setEntryToast] = useState<string | null>(null);
  const toastY = useRef(new Animated.Value(-20)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const previousTopEntryRef = useRef<string | null>(null);
  const filtered = useMemo(
    () => entries.filter((e) => shouldShowLogEntry(e, tab)).filter((e) => matchesGeneralFilter(e, tab, generalFilter)),
    [entries, generalFilter, tab]
  );
  const personalSummary = useMemo(() => buildPersonalSummary(entries), [entries]);
  const gameAnalysis = useMemo(() => buildGameAnalysis(entries, winner, roomPlayers), [entries, winner, roomPlayers]);

  useEffect(() => {
    let mounted = true;
    if (!roomCode) {
      setPlayerNotes({});
      return;
    }
    void loadPlayerNotes(roomCode).then((notes) => {
      if (mounted) setPlayerNotes(notes);
    });
    return () => {
      mounted = false;
    };
  }, [roomCode]);

  useEffect(() => {
    const top = filtered[filtered.length - 1];
    const currentKey = top ? `${top.ts}:${top.event}` : null;
    if (!currentKey) return;
    if (!previousTopEntryRef.current) {
      previousTopEntryRef.current = currentKey;
      return;
    }
    if (previousTopEntryRef.current === currentKey) return;
    previousTopEntryRef.current = currentKey;
    setEntryToast(`Yeni günlük kaydı: ${eventHeadline(top.event)}`);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(toastY, { toValue: 0, duration: 180, useNativeDriver: true })
      ]),
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(toastY, { toValue: -20, duration: 220, useNativeDriver: true })
      ])
    ]).start(() => setEntryToast(null));
  }, [filtered, toastOpacity, toastY]);

  const updatePlayerNote = (playerId: string, patch: { tag?: PlayerNoteTag; note?: string }) => {
    if (!roomCode) return;
    const current = getPlayerNote(playerNotes, playerId);
    const nextNote = {
      tag: patch.tag ?? current.tag,
      note: patch.note ?? current.note
    };
    setPlayerNotes((currentNotes) => ({
      ...currentNotes,
      [playerId]: nextNote
    }));
    void savePlayerNote(roomCode, playerId, nextNote).then(setPlayerNotes);
  };

  return (
    <ScreenShell scene="day" headerTitle="GÜNLÜK">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {entryToast ? (
          <Animated.View style={[styles.entryToast, { opacity: toastOpacity, transform: [{ translateY: toastY }] }]}>
            <Ionicons name="document-text-outline" size={15} color={colors.secondary} />
            <Text style={styles.entryToastText}>{entryToast}</Text>
          </Animated.View>
        ) : null}
        <Text style={styles.title}>Günlük</Text>
        {tab === "personal" ? (
          <View style={styles.roleCard}>
            <Text style={styles.roleCardTitle}>Kişisel Günlük</Text>
            <Text style={styles.roleCardText}>Rolün: {role ?? "Henüz atanmadı"}</Text>
            <Text style={styles.roleCardText}>Buradaki kayıtlar yalnızca sana özeldir.</Text>
            <Text style={styles.roleCardText}>Aksiyon kaydı: {personalSummary.actionCount}</Text>
            <Text style={styles.roleCardText}>Özel sonuç kaydı: {personalSummary.privateResultCount}</Text>
          </View>
        ) : null}
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === "general" ? styles.tabActive : null]} onPress={() => setTab("general")}>
            <Text style={[styles.tabText, tab === "general" ? styles.tabTextActive : null]}>Genel</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === "personal" ? styles.tabActive : null]} onPress={() => setTab("personal")}>
            <Text style={[styles.tabText, tab === "personal" ? styles.tabTextActive : null]}>Kişisel</Text>
          </Pressable>
        </View>
        {tab === "general" ? (
          <View style={styles.filterRow}>
            {GENERAL_FILTERS.map((filter) => (
              <Pressable
                key={filter.value}
                style={[styles.filterChip, generalFilter === filter.value ? styles.filterChipActive : null]}
                onPress={() => setGeneralFilter(filter.value)}
              >
                <Ionicons
                  name={filter.icon}
                  size={14}
                  color={generalFilter === filter.value ? colors.parchmentText : colors.textMuted}
                />
                <Text style={[styles.filterText, generalFilter === filter.value ? styles.filterTextActive : null]}>{filter.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {tab === "general" && gameAnalysis ? (
          <View style={styles.analysisPanel}>
            <Text style={styles.analysisTitle}>Oyun Sonu Analizi</Text>
            <Text style={styles.analysisLine}>Kazanan: {gameAnalysis.winnerText}</Text>
            <Text style={styles.analysisLine}>Raunt: {gameAnalysis.roundsPlayed || "-"}</Text>
            <Text style={styles.analysisLine}>Eleme: {gameAnalysis.eliminationCount}</Text>
            <Text style={styles.analysisLine}>Beraberlik: {gameAnalysis.tieCount}</Text>
            <Text style={styles.analysisLine}>Hayatta kalanlar: {gameAnalysis.aliveText}</Text>
            {gameAnalysis.highlights.map((line) => (
              <Text key={line} style={styles.analysisHighlight}>{line}</Text>
            ))}
          </View>
        ) : null}
        {filtered.length === 0 ? <Text style={styles.empty}>Bu sekmede henüz kayıt yok.</Text> : null}
        {filtered
          .slice()
          .reverse()
          .map((entry, idx) => (
            <View style={[styles.row, eventToneStyle(entry.event)]} key={`${entry.ts}-${entry.event}-${idx}`}>
              <View style={styles.rowTop}>
                <View style={styles.eventMeta}>
                  <Ionicons name={eventIcon(entry.event)} size={16} color={eventIconColor(entry.event)} />
                  <Text style={styles.headline}>{eventHeadline(entry.event)}</Text>
                </View>
                <Text style={[styles.tag, eventTagStyle(entry.event)]}>{eventTag(entry.event)}</Text>
              </View>
              <View style={styles.rowTop}>
                <Text style={styles.time}>{entry.ts.slice(11, 19)}</Text>
              </View>
              <Text style={styles.event}>
                {toReadableLogText(entry.event, localizePayloadNames(entry.payload, playerNameById))}
              </Text>
            </View>
          ))}
        {tab === "personal" ? (
          <View style={styles.notesPanel}>
            <Text style={styles.notesTitle}>Oyuncu Etiketleri ve Notlar</Text>
            {roomPlayers.filter((player) => player.playerId !== playerId).map((player) => {
              const note = getPlayerNote(playerNotes, player.playerId);
              return (
                <View key={player.playerId} style={styles.noteRow}>
                  <Text style={styles.notePlayer}>{player.nickname}</Text>
                  <View style={styles.tagRow}>
                    {NOTE_TAGS.map((tag) => (
                      <Pressable
                        key={tag.value}
                        style={[styles.noteTag, note.tag === tag.value ? styles.noteTagActive : null]}
                        onPress={() => updatePlayerNote(player.playerId, { tag: tag.value })}
                      >
                        <Text style={[styles.noteTagText, note.tag === tag.value ? styles.noteTagTextActive : null]}>{tag.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Kişisel not..."
                    placeholderTextColor={colors.textDim}
                    value={note.note}
                    onChangeText={(value) => updatePlayerNote(player.playerId, { note: value })}
                    multiline
                  />
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const NOTE_TAGS: Array<{ value: PlayerNoteTag; label: string }> = [
  { value: "trusted", label: "Güvenilir" },
  { value: "suspect", label: "Şüpheli" },
  { value: "enemy", label: "Düşman" }
];

const GENERAL_FILTERS: Array<{ value: GeneralFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "all", label: "Tümü", icon: "list-outline" },
  { value: "night", label: "Gece", icon: "moon-outline" },
  { value: "vote", label: "Oylama", icon: "checkbox-outline" },
  { value: "result", label: "Sonuç", icon: "flag-outline" }
];

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 8, paddingBottom: spacing.xl },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 30,
    textAlign: "center"
  },
  roleCard: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.28)",
    borderRadius: 10,
    backgroundColor: "rgba(12,12,14,0.86)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4
  },
  roleCardTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  roleCardText: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  tabs: {
    flexDirection: "row",
    gap: 8
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    backgroundColor: "rgba(12,12,14,0.8)"
  },
  tabActive: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright
  },
  tabText: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  tabTextActive: {
    color: colors.parchmentText
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.25)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: "rgba(12,12,14,0.76)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  filterChipActive: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright
  },
  filterText: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  filterTextActive: {
    color: colors.parchmentText
  },
  entryToast: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.35)",
    borderRadius: 999,
    backgroundColor: "rgba(33,29,16,0.82)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  entryToastText: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  empty: {
    color: colors.textDim,
    textAlign: "center",
    fontFamily: typography.sansMedium
  },
  row: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    backgroundColor: "rgba(12,12,14,0.8)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3
  },
  rowNight: {
    borderColor: "rgba(88,193,182,0.32)",
    backgroundColor: "rgba(8,22,24,0.78)"
  },
  rowVote: {
    borderColor: "rgba(233,195,73,0.32)",
    backgroundColor: "rgba(33,29,16,0.72)"
  },
  rowResult: {
    borderColor: "rgba(196,35,35,0.36)",
    backgroundColor: "rgba(35,12,13,0.76)"
  },
  rowPersonal: {
    borderColor: "rgba(169,123,255,0.32)",
    backgroundColor: "rgba(22,16,34,0.76)"
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  headline: {
    color: colors.text,
    fontFamily: typography.sansBold,
    fontSize: 12
  },
  time: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 12
  },
  tag: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  tagNight: {
    color: "#58c1b6"
  },
  tagVote: {
    color: colors.secondary
  },
  tagResult: {
    color: colors.primaryBright
  },
  tagPersonal: {
    color: "#a97bff"
  },
  event: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  payload: {
    color: colors.textDim,
    fontFamily: typography.sans,
    fontSize: 11
  },
  analysisPanel: {
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.35)",
    borderRadius: 10,
    backgroundColor: "rgba(33,29,16,0.72)",
    padding: 10,
    gap: 5
  },
  analysisTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  analysisLine: {
    color: colors.text,
    fontFamily: typography.sansMedium,
    fontSize: 13
  },
  analysisHighlight: {
    color: colors.textMuted,
    fontFamily: typography.serifRegular,
    fontSize: 14,
    lineHeight: 20
  },
  notesPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.24)",
    borderRadius: 10,
    backgroundColor: "rgba(12,12,14,0.82)",
    padding: 10,
    gap: 10
  },
  notesTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  noteRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.14)",
    paddingTop: 10,
    gap: 8
  },
  notePlayer: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 18
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  noteTag: {
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.26)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "rgba(6,6,8,0.65)"
  },
  noteTagActive: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright
  },
  noteTagText: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 12
  },
  noteTagTextActive: {
    color: colors.parchmentText
  },
  noteInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: "rgba(6,6,8,0.72)",
    fontFamily: typography.sans,
    fontSize: 13
  }
});

function eventTag(event: string): string {
  if (event.startsWith("phase.")) return "Faz";
  if (event.startsWith("vote.")) return "Oylama";
  if (event.startsWith("summary.")) return "Sonuç";
  if (event.startsWith("role.")) return "Rol";
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return "Kişisel";
  if (event === "game.over") return "Bitiş";
  return "Oyun";
}

function eventHeadline(event: string): string {
  if (event === "phase.night_started") return "Gece Basladi";
  if (event === "phase.day_started") return "Gunduz Basladi";
  if (event === "summary.night_no_elimination") return "Kimse Elenmedi";
  if (event.startsWith("vote.tie")) return "Beraberlik";
  if (event.startsWith("vote.")) return "Oylama";
  if (event.startsWith("summary.")) return "Gun Sonucu";
  if (event === "game.over") return "Oyun Bitti";
  if (event.startsWith("personal.")) return "Kisisel Bilgi";
  if (event.startsWith("role.")) return "Rol Bilgisi";
  return "Oyun Olayi";
}

function matchesGeneralFilter(entry: LogFeedEntry, tab: Tab, filter: GeneralFilter): boolean {
  if (tab !== "general" || filter === "all") return true;
  if (filter === "night") return entry.event === "phase.night_started" || entry.event === "summary.night_no_elimination" || entry.payload?.source === "Night";
  if (filter === "vote") return entry.event.startsWith("vote.");
  if (filter === "result") return entry.event.startsWith("summary.") || entry.event === "game.over" || entry.event.startsWith("role.");
  return true;
}

function eventIcon(event: string): keyof typeof Ionicons.glyphMap {
  if (event === "phase.night_started" || event === "summary.night_no_elimination") return "moon-outline";
  if (event === "phase.day_started") return "sunny-outline";
  if (event.startsWith("vote.")) return "checkbox-outline";
  if (event.startsWith("summary.") || event === "game.over") return "flag-outline";
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return "person-circle-outline";
  if (event.startsWith("role.")) return "shield-outline";
  return "ellipse-outline";
}

function eventIconColor(event: string): string {
  if (event === "phase.night_started" || event === "summary.night_no_elimination") return "#58c1b6";
  if (event.startsWith("vote.")) return colors.secondary;
  if (event.startsWith("summary.") || event === "game.over") return colors.primaryBright;
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return "#a97bff";
  return colors.textMuted;
}

function eventToneStyle(event: string) {
  if (event === "phase.night_started" || event === "summary.night_no_elimination") return styles.rowNight;
  if (event.startsWith("vote.")) return styles.rowVote;
  if (event.startsWith("summary.") || event === "game.over" || event.startsWith("role.")) return styles.rowResult;
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return styles.rowPersonal;
  return null;
}

function eventTagStyle(event: string) {
  if (event === "phase.night_started" || event === "summary.night_no_elimination") return styles.tagNight;
  if (event.startsWith("vote.")) return styles.tagVote;
  if (event.startsWith("summary.") || event === "game.over" || event.startsWith("role.")) return styles.tagResult;
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return styles.tagPersonal;
  return null;
}

function buildPersonalSummary(entries: LogFeedEntry[]) {
  const personal = entries.filter((e) => e.scope === "personal" && shouldShowLogEntry(e, "personal"));
  const actionCount = personal.filter((e) => e.event.includes("selected") || e.event.includes("accepted")).length;
  const privateResultCount = personal.filter((e) => e.event.includes("private_result") || e.event.includes("_result")).length;
  return { actionCount, privateResultCount };
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
