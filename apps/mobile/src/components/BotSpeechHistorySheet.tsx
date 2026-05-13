import type { BotSpeechEvent } from "@vampir-koylu/shared";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  formatBotSpeechMetaLine,
  formatBotSpeechPhaseContext,
  formatBotSpeechRelativeTime
} from "../utils/bot-speech-labels";

export interface BotSpeechHistorySheetProps {
  visible: boolean;
  onClose: () => void;
  entries: BotSpeechEvent[];
}

/** Üst blok (başlık + alt başlık + kapat) tahmini — ScrollView için kalan yükseklik. */
const HEADER_BLOCK_MIN = 96;

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
  const scrollAreaHeight = Math.max(140, maxSheetHeight - HEADER_BLOCK_MIN);

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
          style={[styles.sheet, { height: maxSheetHeight, maxHeight: maxSheetHeight }]}
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
          <ScrollView
            style={[styles.scroll, { height: scrollAreaHeight, maxHeight: scrollAreaHeight }]}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
            bounces
          >
            {entries.length === 0 ? (
              <Text style={styles.empty}>Henüz söylenti yok</Text>
            ) : (
              entries.map((e) => (
                <View key={`${e.phaseId}:${e.speakerPlayerId}:${e.createdAt}`} style={styles.row}>
                  <Text style={styles.rowMeta} numberOfLines={2}>
                    {formatBotSpeechMetaLine(e.speakerName, e.intent, e.tone)}
                  </Text>
                  <Text style={styles.rowPhase} numberOfLines={2}>
                    {formatBotSpeechPhaseContext(e.phaseId)} · {formatBotSpeechRelativeTime(e.createdAt)}
                  </Text>
                  <Text style={styles.rowMessage}>{e.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
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
    overflow: "hidden"
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
    fontSize: 20
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
    marginTop: spacing.sm
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
  rowMeta: {
    color: colors.textDim,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 0.3
  },
  rowPhase: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 10,
    marginTop: 4
  },
  rowMessage: {
    color: colors.text,
    fontFamily: typography.serifRegular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    flexShrink: 1
  }
});
