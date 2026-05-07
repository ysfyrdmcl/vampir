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
import { uiStandard } from "../ui/ui-standard";
import {
  formatJournalRoundTur,
  formatPersonalTurnLogLine,
  journalPersonalTurnPeriod,
  journalPersonalTurnStepLabel
} from "../utils/journal-labels";
import { toRoleLabel } from "../utils/role-label";

type Props = NativeStackScreenProps<RootStackParamList, "GameLog">;
type Tab = "general" | "personal";
type PersonalView = "logs" | "notebook";
type GeneralFilter = "all" | "night" | "vote" | "result";
type TimelineGroup = { key: string; title: string; meta: string; entries: LogFeedEntry[] };

const EMPTY_PLAYERS: RoomPlayerView[] = [];

export function GameLogScreen(_: Props) {
  const entries = useLogFeedStore((s) => s.entries);
  const markAllRead = useLogFeedStore((s) => s.markAllRead);
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
  const [personalView, setPersonalView] = useState<PersonalView>("logs");
  const [generalFilter, setGeneralFilter] = useState<GeneralFilter>("all");
  const [playerNotes, setPlayerNotes] = useState<PlayerNotesById>({});
  const [expandedNotePlayerId, setExpandedNotePlayerId] = useState<string | null>(null);
  const [entryToast, setEntryToast] = useState<string | null>(null);
  const toastY = useRef(new Animated.Value(-20)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const previousTopEntryRef = useRef<string | null>(null);
  const filtered = useMemo(
    () => entries.filter((e) => shouldShowLogEntry(e, tab)).filter((e) => matchesGeneralFilter(e, tab, generalFilter)),
    [entries, generalFilter, tab]
  );
  const personalSummary = useMemo(() => buildPersonalSummary(entries), [entries]);
  const timelineGroups = useMemo(() => buildTimelineGroups(filtered.slice().reverse()), [filtered]);
  const gameAnalysis = useMemo(() => buildGameAnalysis(entries, winner, roomPlayers), [entries, winner, roomPlayers]);
  const notePlayers = useMemo(
    () => roomPlayers.filter((player) => player.playerId !== playerId),
    [playerId, roomPlayers]
  );
  const hasAnyPlayerNote = useMemo(
    () => notePlayers.some((player) => {
      const note = getPlayerNote(playerNotes, player.playerId);
      return note.tag !== "none" || note.note.trim().length > 0;
    }),
    [notePlayers, playerNotes]
  );

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
    markAllRead();
  }, [entries.length, markAllRead]);

  useEffect(() => {
    const top = entries[entries.length - 1];
    const currentKey = top ? `${top.ts}:${top.event}` : null;
    if (!currentKey) return;
    if (!previousTopEntryRef.current) {
      previousTopEntryRef.current = currentKey;
      return;
    }
    if (previousTopEntryRef.current === currentKey) return;
    previousTopEntryRef.current = currentKey;
    setEntryToast(`Yeni günlük kaydı: ${eventHeadline(top.event, top.payload)}`);
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
  }, [entries, toastOpacity, toastY]);

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
    <ScreenShell scene="day" bottomNavActiveIndex={1} headerTitle="GÜNLÜK" showPauseOverlay={false}>
      <View style={styles.root}>
        {entryToast ? (
          <Animated.View pointerEvents="none" style={[styles.entryToast, { opacity: toastOpacity, transform: [{ translateY: toastY }] }]}>
            <Ionicons name="document-text-outline" size={15} color={colors.secondary} />
            <Text style={styles.entryToastText}>{entryToast}</Text>
          </Animated.View>
        ) : null}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Günlük</Text>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === "general" ? styles.tabActive : null]} onPress={() => setTab("general")}>
            <Text style={[styles.tabText, tab === "general" ? styles.tabTextActive : null]}>Genel</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === "personal" ? styles.tabActive : null]} onPress={() => setTab("personal")}>
            <Text style={[styles.tabText, tab === "personal" ? styles.tabTextActive : null]}>Kişisel</Text>
          </Pressable>
        </View>
        {tab === "general" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
          </ScrollView>
        ) : (
          <View style={styles.personalHeader}>
            <View style={styles.personalSummaryRow}>
              <Text style={styles.personalSummaryText}>Rolün: {role ? toRoleLabel(role) : "Henüz atanmadı"}</Text>
              <Text style={styles.personalSummaryMeta}>
                {personalSummary.actionCount} aksiyon · {personalSummary.privateIntelCount} kişisel kayıt
              </Text>
            </View>
            <View style={styles.personalModeRow}>
              <Pressable
                style={[styles.personalMode, personalView === "logs" ? styles.personalModeActive : null]}
                onPress={() => setPersonalView("logs")}
              >
                <Ionicons name="reader-outline" size={14} color={personalView === "logs" ? colors.parchmentText : colors.textMuted} />
                <Text style={[styles.personalModeText, personalView === "logs" ? styles.personalModeTextActive : null]}>Loglar</Text>
              </Pressable>
              <Pressable
                style={[styles.personalMode, personalView === "notebook" ? styles.personalModeActive : null]}
                onPress={() => setPersonalView("notebook")}
              >
                <Ionicons name="create-outline" size={14} color={personalView === "notebook" ? colors.parchmentText : colors.textMuted} />
                <Text style={[styles.personalModeText, personalView === "notebook" ? styles.personalModeTextActive : null]}>Not Defteri</Text>
              </Pressable>
            </View>
          </View>
        )}
        {tab === "general" && gameAnalysis ? (
          <View style={styles.analysisPanel}>
            <Text style={styles.analysisTitle}>Oyun Sonu Analizi</Text>
            <Text style={styles.analysisLine}>Kazanan: {gameAnalysis.winnerText}</Text>
            <Text style={styles.analysisLine}>En yüksek tur: {gameAnalysis.roundsPlayed || "—"}</Text>
            <Text style={styles.analysisLine}>Eleme: {gameAnalysis.eliminationCount}</Text>
            <Text style={styles.analysisLine}>Beraberlik: {gameAnalysis.tieCount}</Text>
            <Text style={styles.analysisLine}>Hayatta kalanlar: {gameAnalysis.aliveText}</Text>
            {gameAnalysis.highlights.map((line) => (
              <Text key={line} style={styles.analysisHighlight}>{line}</Text>
            ))}
          </View>
        ) : null}
        {tab === "personal" && personalView === "logs" ? (
          <View style={styles.personalLogPanel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>Kişisel Loglar</Text>
                <Text style={styles.panelSubtitle}>Sunucudan gelen özel olay geçmişi.</Text>
              </View>
              <Text style={styles.panelCount}>{filtered.length} kayıt</Text>
            </View>
            {filtered.length === 0 ? <Text style={styles.empty}>Henüz kişisel log yok.</Text> : null}
            {timelineGroups.map((group) => (
              <View key={group.key} style={styles.timelineGroup}>
                <View style={styles.timelineHeader}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineHeaderCopy}>
                    <Text style={styles.timelineTitle}>{group.title}</Text>
                    <Text style={styles.timelineMeta}>{group.meta}</Text>
                  </View>
                </View>
                <View style={styles.timelineRail}>
                  {group.entries.map((entry, idx) => (
                    <View style={[styles.row, eventToneStyle(entry.event)]} key={`${entry.ts}-${entry.event}-${idx}`}>
                      <View style={styles.rowTop}>
                        <View style={styles.eventMeta}>
                          <Ionicons name={eventIcon(entry.event)} size={16} color={eventIconColor(entry.event)} />
                          <Text style={styles.headline}>{eventHeadline(entry.event, entry.payload)}</Text>
                        </View>
                        <Text style={[styles.tag, eventTagStyle(entry.event)]}>{eventTag(entry.event, entry.payload)}</Text>
                      </View>
                      <View style={styles.rowTop}>
                        <Text style={styles.time}>{entry.ts.slice(11, 19)}</Text>
                      </View>
                      <Text style={styles.event}>
                        {toReadableLogText(entry.event, localizePayloadNames(entry.payload, playerNameById))}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {tab === "personal" && personalView === "notebook" ? (
          <View style={styles.notesPanel}>
            <View style={styles.notesHeader}>
              <View>
                <Text style={styles.notesTitle}>Not Defteri</Text>
                <Text style={styles.notesSubtitle}>
                  {hasAnyPlayerNote ? "Oyuncu bazlı yerel notların." : "Henüz not eklenmedi."}
                </Text>
              </View>
              <Text style={styles.notesCount}>{notePlayers.length} kişi</Text>
            </View>
            {notePlayers.length === 0 ? <Text style={styles.empty}>Henüz not eklenmedi.</Text> : null}
            {notePlayers.map((player) => {
              const note = getPlayerNote(playerNotes, player.playerId);
              const isExpanded = expandedNotePlayerId === player.playerId;
              return (
                <View key={player.playerId} style={styles.noteRow}>
                  <Pressable style={styles.noteHeader} onPress={() => setExpandedNotePlayerId(isExpanded ? null : player.playerId)}>
                    <View>
                      <Text style={styles.notePlayer}>{player.nickname}</Text>
                      <Text style={styles.noteMeta}>{note.note ? "Not var" : "Not yok"} · {noteTagLabel(note.tag)}</Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up-outline" : "create-outline"} size={18} color={colors.secondary} />
                  </Pressable>
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
                  {isExpanded ? (
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Kişisel not..."
                      placeholderTextColor={colors.textDim}
                      value={note.note}
                      onChangeText={(value) => updatePlayerNote(player.playerId, { note: value })}
                      multiline
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
        {tab === "general" && filtered.length === 0 ? <Text style={styles.empty}>Bu sekmede henüz kayıt yok.</Text> : null}
        {tab === "general" ? timelineGroups.map((group) => (
          <View key={group.key} style={styles.timelineGroup}>
            <View style={styles.timelineHeader}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineHeaderCopy}>
                <Text style={styles.timelineTitle}>{group.title}</Text>
                <Text style={styles.timelineMeta}>{group.meta}</Text>
              </View>
            </View>
            <View style={styles.timelineRail}>
              {group.entries.map((entry, idx) => (
                <View style={[styles.row, eventToneStyle(entry.event)]} key={`${entry.ts}-${entry.event}-${idx}`}>
                  <View style={styles.rowTop}>
                    <View style={styles.eventMeta}>
                      <Ionicons name={eventIcon(entry.event)} size={16} color={eventIconColor(entry.event)} />
                      <Text style={styles.headline}>{eventHeadline(entry.event, entry.payload)}</Text>
                    </View>
                    <Text style={[styles.tag, eventTagStyle(entry.event)]}>{eventTag(entry.event, entry.payload)}</Text>
                  </View>
                  <View style={styles.rowTop}>
                    <Text style={styles.time}>{entry.ts.slice(11, 19)}</Text>
                  </View>
                  <Text style={styles.event}>
                    {toReadableLogText(entry.event, localizePayloadNames(entry.payload, playerNameById))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )) : null}
      </ScrollView>
      </View>
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
  root: {
    flex: 1
  },
  scroll: { flex: 1 },
  content: { gap: 8, paddingBottom: spacing.xl },
  title: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 30,
    textAlign: "center"
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
    gap: 6,
    paddingRight: spacing.safe
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
  personalSummaryRow: {
    minHeight: 32,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(12,12,14,0.76)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  personalHeader: {
    gap: 8
  },
  personalSummaryText: {
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    fontSize: 12
  },
  personalSummaryMeta: {
    color: "rgba(150,145,138,0.72)",
    fontFamily: typography.sansMedium,
    fontSize: 11,
    letterSpacing: 0.2
  },
  personalModeRow: {
    flexDirection: "row",
    gap: 8
  },
  personalMode: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.22)",
    borderRadius: 8,
    backgroundColor: "rgba(12,12,14,0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  personalModeActive: {
    backgroundColor: colors.parchment,
    borderColor: colors.primaryBright
  },
  personalModeText: {
    color: colors.textMuted,
    fontFamily: typography.sansBold,
    fontSize: 12
  },
  personalModeTextActive: {
    color: colors.parchmentText
  },
  personalLogPanel: {
    borderWidth: 1,
    borderColor: uiStandard.logTones.private.border,
    borderRadius: 10,
    backgroundColor: "rgba(22,16,34,0.58)",
    padding: 10,
    gap: 10
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  panelTitle: {
    color: uiStandard.logTones.private.text,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  panelSubtitle: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    marginTop: 2
  },
  panelCount: {
    color: colors.backgroundDeep,
    backgroundColor: uiStandard.logTones.private.text,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: typography.sansBold,
    fontSize: 10
  },
  entryToast: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.35)",
    borderRadius: 999,
    backgroundColor: "rgba(33,29,16,0.82)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  timelineGroup: {
    gap: 6
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.secondary
  },
  timelineHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  timelineTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 12,
    letterSpacing: 1
  },
  timelineMeta: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11
  },
  timelineRail: {
    marginLeft: 4,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(233,195,73,0.18)",
    gap: 8
  },
  rowNight: {
    borderColor: uiStandard.logTones.phase.border,
    backgroundColor: uiStandard.logTones.phase.background
  },
  rowVote: {
    borderColor: uiStandard.logTones.vote.border,
    backgroundColor: uiStandard.logTones.vote.background
  },
  rowResult: {
    borderColor: uiStandard.logTones.result.border,
    backgroundColor: uiStandard.logTones.result.background
  },
  rowPersonal: {
    borderColor: uiStandard.logTones.private.border,
    backgroundColor: uiStandard.logTones.private.background
  },
  rowWarning: {
    borderColor: uiStandard.logTones.warning.border,
    backgroundColor: uiStandard.logTones.warning.background
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
    color: uiStandard.logTones.phase.text
  },
  tagVote: {
    color: uiStandard.logTones.vote.text
  },
  tagResult: {
    color: uiStandard.logTones.result.text
  },
  tagPersonal: {
    color: uiStandard.logTones.private.text
  },
  tagWarning: {
    color: uiStandard.logTones.warning.text
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
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.28)",
    borderRadius: 10,
    backgroundColor: "rgba(33,29,16,0.64)",
    padding: 10,
    gap: 10
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  notesTitle: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 13
  },
  notesSubtitle: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    marginTop: 2
  },
  notesCount: {
    color: colors.backgroundDeep,
    backgroundColor: colors.secondary,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: typography.sansBold,
    fontSize: 10
  },
  noteRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(170,137,132,0.14)",
    paddingTop: 10,
    gap: 8
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  notePlayer: {
    color: colors.text,
    fontFamily: typography.serifSemi,
    fontSize: 18
  },
  noteMeta: {
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 11,
    marginTop: 1
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

function eventTag(event: string, payload?: Record<string, unknown>): string {
  if (event.startsWith("warning.") || event.includes("warning")) return "Uyarı";
  if (event === "game.phase.personal_turn_info") return journalPersonalTurnPeriod(payload?.phase);
  if (event.startsWith("phase.")) return "Faz";
  if (event.startsWith("vote.")) return "Oylama";
  if (event.startsWith("summary.")) return "Sonuç";
  if (event.startsWith("role.")) return "Rol";
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return "Kişisel";
  if (event === "game.over") return "Bitiş";
  return "Oyun";
}

function eventHeadline(event: string, payload?: Record<string, unknown>): string {
  if (event.startsWith("warning.") || event.includes("warning")) return "Uyarı";
  if (event === "game.phase.personal_turn_info") return journalPersonalTurnStepLabel(payload?.phase);
  if (event === "phase.night_started") return "Gece başladı";
  if (event === "phase.day_started") return "Gündüz başladı";
  if (event === "summary.night_no_elimination") return "Kimse elenmedi";
  if (event.startsWith("vote.tie")) return "Beraberlik";
  if (event.startsWith("vote.")) return "Oylama";
  if (event.startsWith("summary.")) return "Sonuç";
  if (event === "game.over") return "Oyun bitti";
  if (event.startsWith("personal.")) return "Kişisel bilgi";
  if (event.startsWith("role.")) return "Rol bilgisi";
  return "Oyun olayı";
}

function matchesGeneralFilter(entry: LogFeedEntry, tab: Tab, filter: GeneralFilter): boolean {
  if (tab !== "general" || filter === "all") return true;
  if (filter === "night") return entry.event === "phase.night_started" || entry.event === "summary.night_no_elimination" || entry.payload?.source === "Night";
  if (filter === "vote") return entry.event.startsWith("vote.");
  if (filter === "result") return entry.event.startsWith("summary.") || entry.event === "game.over" || entry.event.startsWith("role.");
  return true;
}

function buildTimelineGroups(entries: LogFeedEntry[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  for (const entry of entries) {
    const title = timelineTitleForEntry(entry);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.title === title) {
      lastGroup.entries.push(entry);
      lastGroup.meta = `${lastGroup.entries.length} kayıt`;
      continue;
    }
    groups.push({
      key: `${title}:${entry.ts.slice(0, 10)}:${groups.length}`,
      title,
      meta: "1 kayıt",
      entries: [entry]
    });
  }
  return groups;
}

function timelineTitleForEntry(entry: LogFeedEntry): string {
  if (entry.event === "game.phase.personal_turn_info") {
    return formatPersonalTurnLogLine(entry.payload);
  }
  const r = entry.payload?.round;
  const roundPart = typeof r === "number" && r >= 1 ? formatJournalRoundTur(r) : "Oyun akışı";
  if (entry.event === "phase.night_started" || entry.event === "summary.night_no_elimination" || entry.payload?.source === "Night") {
    return `${roundPart} · Gece`;
  }
  if (entry.event.startsWith("vote.")) return `${roundPart} · Oylama`;
  if (entry.event.startsWith("summary.") || entry.event === "game.over" || entry.event.startsWith("role.")) return `${roundPart} · Sonuç`;
  if (entry.event.startsWith("personal.") || entry.event.startsWith("game.private_result") || entry.event.startsWith("game.role")) {
    return `${roundPart} · Kişisel`;
  }
  if (entry.event === "phase.day_started") return `${roundPart} · Gündüz`;
  return roundPart;
}

function noteTagLabel(tag: PlayerNoteTag): string {
  if (tag === "trusted") return "Güvenilir";
  if (tag === "suspect") return "Şüpheli";
  if (tag === "enemy") return "Düşman";
  return "Etiket yok";
}

function eventIcon(event: string): keyof typeof Ionicons.glyphMap {
  if (event === "game.phase.personal_turn_info") return "person-circle-outline";
  if (event === "phase.night_started" || event === "summary.night_no_elimination") return "moon-outline";
  if (event === "phase.day_started") return "sunny-outline";
  if (event.startsWith("vote.")) return "checkbox-outline";
  if (event.startsWith("summary.") || event === "game.over") return "flag-outline";
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return "person-circle-outline";
  if (event.startsWith("role.")) return "shield-outline";
  return "ellipse-outline";
}

function eventIconColor(event: string): string {
  if (event.startsWith("warning.") || event.includes("warning")) return uiStandard.logTones.warning.text;
  if (event === "game.phase.personal_turn_info") return uiStandard.logTones.private.text;
  if (event === "phase.night_started" || event === "summary.night_no_elimination") return uiStandard.logTones.phase.text;
  if (event.startsWith("vote.")) return uiStandard.logTones.vote.text;
  if (event.startsWith("summary.") || event === "game.over") return uiStandard.logTones.result.text;
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return uiStandard.logTones.private.text;
  return colors.textMuted;
}

function eventToneStyle(event: string) {
  if (event.startsWith("warning.") || event.includes("warning")) return styles.rowWarning;
  if (event === "game.phase.personal_turn_info") return styles.rowPersonal;
  if (event === "phase.night_started" || event === "summary.night_no_elimination") return styles.rowNight;
  if (event.startsWith("vote.")) return styles.rowVote;
  if (event.startsWith("summary.") || event === "game.over" || event.startsWith("role.")) return styles.rowResult;
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return styles.rowPersonal;
  return null;
}

function eventTagStyle(event: string) {
  if (event.startsWith("warning.") || event.includes("warning")) return styles.tagWarning;
  if (event === "game.phase.personal_turn_info") return styles.tagPersonal;
  if (event === "phase.night_started" || event === "summary.night_no_elimination") return styles.tagNight;
  if (event.startsWith("vote.")) return styles.tagVote;
  if (event.startsWith("summary.") || event === "game.over" || event.startsWith("role.")) return styles.tagResult;
  if (event.startsWith("personal.") || event.startsWith("game.private_result") || event.startsWith("game.role")) return styles.tagPersonal;
  return null;
}

function isPersonalIntelLogEvent(event: string): boolean {
  if (event.startsWith("game.private_result.")) {
    return event !== "game.private_result.accepted";
  }
  return event === "personal.detective.inspect_result";
}

function buildPersonalSummary(entries: LogFeedEntry[]) {
  const personal = entries.filter((e) => e.scope === "personal" && shouldShowLogEntry(e, "personal"));
  const actionCount = personal.filter((e) => e.event.includes("selected") || e.event.includes("accepted")).length;
  const privateIntelCount = personal.filter((e) => isPersonalIntelLogEvent(e.event)).length;
  return { actionCount, privateIntelCount };
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
