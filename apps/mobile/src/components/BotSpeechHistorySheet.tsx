import type { BotSpeechEvent } from "@vampir-koylu/shared";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { botSpeechIntentLabel, formatBotSpeechPhaseContext, formatBotSpeechRelativeTime } from "../utils/bot-speech-labels";
import { HighlightedBotSpeechMessage } from "./BotSpeechBubble";

export interface BotSpeechHistorySheetProps {
  visible: boolean;
  onClose: () => void;
  entries: BotSpeechEvent[];
}

export function BotSpeechHistorySheet({ visible, onClose, entries }: BotSpeechHistorySheetProps) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [, setTimeTick] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setTimeTick((n) => n + 1), 20000);
    return () => clearInterval(id);
  }, [visible]);

  const horizontalPad = spacing.md + Math.max(insets.left, insets.right);
  const bottomPad = Math.max(insets.bottom, spacing.sm) + spacing.xs;
  const topPad = Math.max(insets.top, spacing.sm);
  const maxSheetHeight = Math.min(winH * 0.88, winH - topPad - bottomPad - 16);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad, paddingHorizontal: horizontalPad }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Söylentileri kapat"
        />
        <View
          style={[styles.sheet, { maxHeight: maxSheetHeight }]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              Köy Söylentileri
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              style={styles.closeBtn}
            >
              <Text style={styles.closeLabel}>Kapat</Text>
              <Ionicons name="close-circle" size={26} color={colors.secondary} />
            </Pressable>
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>
            En yeni üstte
          </Text>
          <FlatList
            data={entries}
            keyExtractor={(e) => `${e.phaseId}:${e.speakerPlayerId}:${e.createdAt}`}
            style={styles.scroll}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
            bounces
            ListEmptyComponent={<Text style={styles.empty}>Henüz söylenti yok</Text>}
            renderItem={({ item: e }) => (
              <View style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.speakerName} numberOfLines={1}>{e.speakerName}</Text>
                  {e.targetName ? <Text style={styles.targetChip} numberOfLines={1}>Hedef: {e.targetName}</Text> : null}
                </View>
                <Text style={styles.rowMeta} numberOfLines={2}>
                  {botSpeechIntentLabel(e.intent)}
                </Text>
                <Text style={styles.rowPhase} numberOfLines={2}>
                  {formatBotSpeechPhaseContext(e.phaseId)} · {formatBotSpeechRelativeTime(e.createdAt)}
                </Text>
                <HighlightedBotSpeechMessage
                  message={e.message}
                  targetName={e.targetName}
                  style={styles.rowMessage}
                  highlightStyle={styles.messageTarget}
                />
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(5,5,6,0.78)"
  },
  sheet: {
    width: "100%",
    alignSelf: "center",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.32)",
    backgroundColor: "rgba(14,14,16,0.98)",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    overflow: "hidden",
    zIndex: 2,
    elevation: 24
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  title: {
    flex: 1,
    flexShrink: 1,
    color: colors.secondary,
    fontFamily: typography.serifSemi,
    fontSize: 20,
    lineHeight: 25
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "flex-end"
  },
  closeLabel: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 14
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textDim,
    fontFamily: typography.sansMedium,
    fontSize: 12,
    lineHeight: 17
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    marginTop: spacing.sm,
    minHeight: 140
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
    gap: spacing.sm
  },
  empty: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.lg
  },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(170,137,132,0.2)",
    backgroundColor: "rgba(8,8,10,0.92)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0
  },
  speakerName: {
    maxWidth: "62%",
    color: colors.backgroundDeep,
    backgroundColor: colors.secondary,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: typography.sansBold,
    fontSize: 11,
    lineHeight: 14
  },
  targetChip: {
    flexShrink: 1,
    maxWidth: "38%",
    color: colors.secondary,
    backgroundColor: "rgba(233,195,73,0.13)",
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.26)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: typography.sansBold,
    fontSize: 10,
    lineHeight: 13
  },
  rowMeta: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.3,
    flexShrink: 1
  },
  rowPhase: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4
  },
  rowMessage: {
    color: colors.text,
    fontFamily: typography.serifRegular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    flexShrink: 1
  },
  messageTarget: {
    color: colors.secondary,
    fontFamily: typography.serifSemi
  }
});
