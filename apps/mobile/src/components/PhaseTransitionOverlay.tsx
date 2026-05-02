import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import type { GamePhase } from "@vampir-koylu/shared";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";

interface PhaseTransitionOverlayProps {
  phase: GamePhase | null;
}

function phaseTransitionText(phase: GamePhase): string {
  if (phase === "NightStart" || phase === "VampireVote" || phase === "NightResolve") return "Gece Çöküyor";
  if (phase === "DayStart" || phase === "DayDiscussion") return "Gün Doğuyor";
  if (phase === "DayVote" || phase === "MayorElection") return "Köy Oylamaya Gidiyor";
  if (phase === "ExecutionResolve" || phase === "WinCheck" || phase === "GameOver") return "Sonuç Açıklanıyor";
  if (phase === "RoleReveal") return "Gizli Kimlikler Açılıyor";
  return "Faz Değişiyor";
}

export function PhaseTransitionOverlay({ phase }: PhaseTransitionOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const previousPhase = useRef<GamePhase | null>(null);
  const message = useRef<string>("");

  useEffect(() => {
    if (!phase) return;
    if (!previousPhase.current) {
      previousPhase.current = phase;
      return;
    }
    if (previousPhase.current === phase) return;
    previousPhase.current = phase;
    message.current = phaseTransitionText(phase);

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: Math.round(uiStandard.motion.phaseTransitionMs * 0.45),
        useNativeDriver: true
      }),
      Animated.delay(Math.round(uiStandard.motion.phaseTransitionMs * 0.25)),
      Animated.timing(opacity, {
        toValue: 0,
        duration: Math.round(uiStandard.motion.phaseTransitionMs * 0.3),
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, phase]);

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <Text style={styles.text}>{message.current}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,4,6,0.72)"
  },
  text: {
    color: colors.secondary,
    fontFamily: typography.serifSemi,
    fontSize: 38 / 1.5,
    letterSpacing: 0.8,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 4 }
  }
});
