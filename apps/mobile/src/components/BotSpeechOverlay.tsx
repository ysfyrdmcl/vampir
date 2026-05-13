import { useCallback, useEffect, useRef } from "react";
import { Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGameStore } from "../store/game-store";
import { uiStandard } from "../ui/ui-standard";
import type { BotSpeechEvent } from "@vampir-koylu/shared";
import { BotSpeechBubble } from "./BotSpeechBubble";

const ENTER_MS = 240;
const EXIT_MS = 380;

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
  const dismissActiveBotSpeech = useGameStore((s) => s.dismissActiveBotSpeech);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-14)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);

  const horizontalPad = uiStandard.screen.pagePadding + Math.max(insets.left, insets.right);
  const availableWidth = Math.max(220, width - horizontalPad * 2);
  const contentMaxWidth = width >= 768 ? Math.min(680, availableWidth) : availableWidth;

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

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[CINEMATIC_OVERLAY] compact_show", {
        kind: "bot-speech",
        phaseId: active.phaseId,
        speakerPlayerId: active.speakerPlayerId
      });
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
  const showBubble = Boolean(active) && inGame;

  if (!inGame && !gameOver) {
    return null;
  }

  return (
    <>
      {showBubble && active ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
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
            <View style={[styles.bubbleInner, { width: availableWidth, maxWidth: contentMaxWidth }]}>
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
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
