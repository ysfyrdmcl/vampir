import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGameStore } from "../store/game-store";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";
import type { BotSpeechEvent } from "@vampir-koylu/shared";
import { BotSpeechBubble } from "./BotSpeechBubble";
import { BotSpeechHistorySheet } from "./BotSpeechHistorySheet";

const ENTER_MS = 240;
const EXIT_MS = 380;
const COLLECTOR_CHIP_H = 34;

function resolveDisplayMs(event: BotSpeechEvent): number {
  const n = event.durationMs;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return Math.max(n, 4500);
  return 5500;
}

interface BotSpeechOverlayProps {
  /** İçerik alanının üst sınırı (faz çubuğu altı — balon için). */
  layoutTopOffset: number;
}

export function BotSpeechOverlay({ layoutTopOffset }: BotSpeechOverlayProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const roomState = useGameStore((s) => s.roomState);
  const active = useGameStore((s) => s.activeBotSpeech);
  const botSpeechHistory = useGameStore((s) => s.botSpeechHistory);
  const unread = useGameStore((s) => s.botSpeechUnreadCount);
  const dismissActiveBotSpeech = useGameStore((s) => s.dismissActiveBotSpeech);
  const markBotSpeechInboxRead = useGameStore((s) => s.markBotSpeechInboxRead);
  const [historyOpen, setHistoryOpen] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-14)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);

  const horizontalPad = uiStandard.screen.pagePadding + Math.max(insets.left, insets.right);
  const contentMaxWidth = width >= 768 ? 680 : undefined;

  const hasTopBar = layoutTopOffset > 80;
  const collectorTop = hasTopBar ? insets.top + Math.round((64 - COLLECTOR_CHIP_H) / 2) : insets.top + 6;
  const collectorRight = Math.max(insets.right, 10) + 8;

  const resetBubbleMotion = useCallback(() => {
    opacity.setValue(0);
    translateY.setValue(-14);
    translateX.setValue(0);
    scale.setValue(1);
  }, [opacity, scale, translateX, translateY]);

  const finishDismiss = useCallback(() => {
    exitingRef.current = false;
    dismissActiveBotSpeech();
  }, [dismissActiveBotSpeech]);

  const runExit = useCallback(
    (onComplete: () => void) => {
      if (exitingRef.current) return;
      exitingRef.current = true;
      opacity.stopAnimation();
      translateY.stopAnimation();
      translateX.stopAnimation();
      scale.stopAnimation();
      const targetX = Math.min(width * 0.38, 200);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: EXIT_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -36, duration: EXIT_MS, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: targetX, duration: EXIT_MS, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.86, duration: EXIT_MS, useNativeDriver: true })
      ]).start(({ finished }) => {
        exitingRef.current = false;
        resetBubbleMotion();
        if (finished) onComplete();
      });
    },
    [opacity, resetBubbleMotion, scale, translateX, translateY, width]
  );

  const dismissFromUser = useCallback(() => {
    if (!active) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    runExit(finishDismiss);
  }, [active, finishDismiss, runExit]);

  useEffect(() => {
    let cancelled = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    opacity.stopAnimation();
    translateY.stopAnimation();
    translateX.stopAnimation();
    scale.stopAnimation();

    if (!active) {
      resetBubbleMotion();
      return;
    }

    resetBubbleMotion();
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: ENTER_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: ENTER_MS, useNativeDriver: true })
    ]).start(() => {
      if (cancelled) return;
      const ms = resolveDisplayMs(active);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        runExit(finishDismiss);
      }, ms);
    });

    return () => {
      cancelled = true;
      opacity.stopAnimation();
      translateY.stopAnimation();
      translateX.stopAnimation();
      scale.stopAnimation();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, finishDismiss, opacity, resetBubbleMotion, runExit, scale, translateX, translateY]);

  const inGame = roomState?.status === "InGame";
  const gameOver = roomState?.status === "GameOver";
  const showRumorChrome = (inGame || gameOver) && (botSpeechHistory.length > 0 || Boolean(active));
  const showBubble = Boolean(active) && inGame;

  const openHistory = () => {
    markBotSpeechInboxRead();
    setHistoryOpen(true);
  };

  const sheet = (
    <BotSpeechHistorySheet visible={historyOpen} onClose={() => setHistoryOpen(false)} entries={botSpeechHistory} />
  );

  if (!inGame && !gameOver) {
    return historyOpen ? sheet : null;
  }

  return (
    <>
      {sheet}
      {showRumorChrome ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Pressable
            onPress={openHistory}
            style={({ pressed }) => [
              styles.collector,
              {
                top: collectorTop,
                right: collectorRight,
                opacity: pressed ? 0.88 : 1
              }
            ]}
            accessibilityRole="button"
            accessibilityLabel="Söylentiler geçmişi"
          >
            <Text style={styles.collectorText} numberOfLines={1}>
              {unread > 0 ? `Söylentiler · ${unread}` : "Söylentiler"}
            </Text>
          </Pressable>

          {showBubble && active ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.bubbleBand,
                {
                  top: layoutTopOffset + 8,
                  paddingHorizontal: horizontalPad
                }
              ]}
            >
              <View style={[styles.bubbleInner, { maxWidth: contentMaxWidth ?? width - horizontalPad * 2 }]}>
                <Animated.View
                  style={{
                    opacity,
                    transform: [{ translateY }, { translateX }, { scale }]
                  }}
                >
                  <BotSpeechBubble event={active} onPress={dismissFromUser} />
                </Animated.View>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  collector: {
    position: "absolute",
    zIndex: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    minHeight: COLLECTOR_CHIP_H,
    maxWidth: 220,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,195,73,0.38)",
    backgroundColor: "rgba(14,12,10,0.92)"
  },
  collectorText: {
    color: colors.secondary,
    fontFamily: typography.sansBold,
    fontSize: 11,
    letterSpacing: 0.35,
    flexShrink: 1
  },
  bubbleBand: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 45,
    alignItems: "center"
  },
  bubbleInner: {
    width: "100%",
    alignItems: "center"
  }
});
