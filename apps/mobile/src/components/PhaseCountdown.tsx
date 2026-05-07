import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";
import { useGameStore } from "../store/game-store";

interface PhaseCountdownProps {
  phaseEndsAt: number | null;
  mode?: "dramatic" | "compact";
  /** Rol açılımı alt bandı: kart genişliğiyle hizalı, metin ortada. */
  presentation?: "default" | "roleRevealFooter" | "phaseSummary";
}

export function PhaseCountdown({ phaseEndsAt, mode = "dramatic", presentation = "default" }: PhaseCountdownProps) {
  const isPaused = useGameStore((s) => Boolean(s.gameState?.isPaused));
  const [now, setNow] = useState(Date.now());
  const [maxSeconds, setMaxSeconds] = useState<number | null>(null);
  const pulse = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!phaseEndsAt) return;
    const initial = Math.max(1, Math.ceil((phaseEndsAt - Date.now()) / 1000));
    setMaxSeconds(initial);
  }, [phaseEndsAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = useMemo(() => {
    if (!phaseEndsAt) return null;
    return Math.max(0, Math.ceil((phaseEndsAt - now) / 1000));
  }, [now, phaseEndsAt]);

  const percentage = useMemo(() => {
    if (seconds === null || !maxSeconds) return 0;
    return Math.max(0, Math.min(1, seconds / maxSeconds));
  }, [maxSeconds, seconds]);

  useEffect(() => {
    if (seconds === null || seconds > 10 || seconds === 0) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 420, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, seconds]);

  const isEndless = seconds === null;
  const tone = isEndless || seconds >= 45 ? "green" : seconds >= 20 ? "yellow" : seconds > 10 ? "orange" : "red";
  const accent =
    tone === "green"
      ? "#21c06d"
      : tone === "yellow"
        ? "#e9c349"
        : tone === "orange"
          ? "#ff6b35"
          : "#e53935";
  const warningGlow = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, uiStandard.fx.glowStrong]
  });

  const isRoleFooter = presentation === "roleRevealFooter";
  const isPhaseSummary = presentation === "phaseSummary";
  const effectiveMode = isRoleFooter || isPhaseSummary ? "compact" : mode;
  const countdownText = isRoleFooter
    ? "Oyun başlıyor..."
    : isPaused
      ? "Duraklatıldı"
      : isEndless
        ? "Manuel geçiş"
        : seconds === 0
          ? "Kilitlendi"
          : isPhaseSummary
            ? tone === "red"
              ? "Son saniyeler"
              : tone === "orange"
                ? "Süre azalıyor"
                : "Süre aktif"
            : tone === "red"
              ? "Karar anı. Son saniyeler."
              : tone === "orange"
                ? "Süre azalıyor, hızlı karar ver."
                : "Süre dolmadan seçimini tamamla.";

  return (
    <View
      style={[
        styles.wrap,
        effectiveMode === "compact" ? styles.wrapCompact : null,
        isRoleFooter ? styles.wrapRoleFooter : null,
        isPhaseSummary ? styles.wrapPhaseSummary : null
      ]}
    >
      <Animated.View
        style={[
          styles.ring,
          effectiveMode === "compact" ? styles.ringCompact : null,
          isRoleFooter ? styles.ringRoleFooter : null,
          isPhaseSummary ? styles.ringPhaseSummary : null,
          { borderColor: accent, shadowColor: accent, shadowOpacity: warningGlow }
        ]}
      >
        <Text
          style={[
            styles.value,
            effectiveMode === "compact" ? styles.valueCompact : null,
            isRoleFooter ? styles.valueRoleFooter : null,
            isPhaseSummary ? styles.valuePhaseSummary : null
          ]}
        >
          {isEndless ? "∞" : seconds}
        </Text>
        <Text
          style={[
            styles.unit,
            effectiveMode === "compact" ? styles.unitCompact : null,
            isRoleFooter ? styles.unitRoleFooter : null,
            isPhaseSummary ? styles.unitPhaseSummary : null
          ]}
        >
          {isPaused ? "DURDU" : isEndless ? "SÜRESİZ" : seconds === 0 ? "KİLİTLİ" : "SANİYE"}
        </Text>
      </Animated.View>
      <View style={[effectiveMode === "compact" ? styles.compactCopy : null, isRoleFooter ? styles.compactCopyRoleFooter : null, isPhaseSummary ? styles.compactCopyPhaseSummary : null]}>
        <View style={[styles.barTrack, effectiveMode === "compact" ? styles.barTrackCompact : null, isRoleFooter ? styles.barTrackRoleFooter : null, isPhaseSummary ? styles.barTrackPhaseSummary : null]}>
          <View style={[styles.barFill, { width: `${Math.round(percentage * 100)}%`, backgroundColor: accent }]} />
        </View>
        <Text
          style={[styles.text, effectiveMode === "compact" ? styles.textCompact : null, isRoleFooter ? styles.textRoleFooter : null, isPhaseSummary ? styles.textPhaseSummary : null]}
          numberOfLines={isRoleFooter ? 2 : undefined}
        >
          {countdownText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 8
  },
  wrapRoleFooter: {
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4
  },
  wrapCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  wrapPhaseSummary: {
    flexShrink: 0,
    gap: 7
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    backgroundColor: "rgba(10,10,10,0.5)",
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }
  },
  ringCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    shadowRadius: 8
  },
  ringPhaseSummary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    shadowRadius: 6
  },
  ringRoleFooter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    flexShrink: 0
  },
  value: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 50,
    lineHeight: 52
  },
  valueCompact: {
    fontSize: 25,
    lineHeight: 27
  },
  valuePhaseSummary: {
    fontSize: 18,
    lineHeight: 19
  },
  valueRoleFooter: {
    fontSize: 22,
    lineHeight: 23
  },
  compactCopy: {
    flex: 1,
    gap: 5
  },
  compactCopyRoleFooter: {
    minWidth: 0,
    gap: 5
  },
  compactCopyPhaseSummary: {
    width: 82,
    flex: 0,
    gap: 4
  },
  unit: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    letterSpacing: 1.2
  },
  unitCompact: {
    fontSize: 8,
    letterSpacing: 0.6
  },
  unitPhaseSummary: {
    fontSize: 6,
    letterSpacing: 0.4
  },
  unitRoleFooter: {
    fontSize: 7,
    letterSpacing: 0.5
  },
  barTrack: {
    width: 196,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(170,137,132,0.25)"
  },
  barTrackCompact: {
    width: "100%",
    height: 5
  },
  barTrackRoleFooter: {
    width: "100%",
    maxWidth: "100%",
    height: 4
  },
  barTrackPhaseSummary: {
    height: 4
  },
  barFill: {
    height: "100%"
  },
  text: {
    color: colors.textDim,
    fontFamily: typography.sans,
    fontSize: 13
  },
  textCompact: {
    fontSize: 12
  },
  textPhaseSummary: {
    fontSize: 10,
    lineHeight: 13
  },
  textRoleFooter: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    color: colors.textMuted
  }
});
