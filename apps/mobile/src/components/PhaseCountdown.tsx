import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { uiStandard } from "../ui/ui-standard";

interface PhaseCountdownProps {
  phaseEndsAt: number | null;
  mode?: "dramatic" | "compact";
}

export function PhaseCountdown({ phaseEndsAt, mode = "dramatic" }: PhaseCountdownProps) {
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

  if (seconds === null) {
    return null;
  }

  const tone = seconds >= 45 ? "green" : seconds >= 20 ? "yellow" : seconds > 10 ? "orange" : "red";
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

  return (
    <View style={[styles.wrap, mode === "compact" ? styles.wrapCompact : null]}>
      <Animated.View style={[styles.ring, mode === "compact" ? styles.ringCompact : null, { borderColor: accent, shadowColor: accent, shadowOpacity: warningGlow }]}>
        <Text style={[styles.value, mode === "compact" ? styles.valueCompact : null]}>{seconds}</Text>
        <Text style={[styles.unit, mode === "compact" ? styles.unitCompact : null]}>{seconds === 0 ? "KİLİTLİ" : "SANİYE"}</Text>
      </Animated.View>
      <View style={mode === "compact" ? styles.compactCopy : null}>
        <View style={[styles.barTrack, mode === "compact" ? styles.barTrackCompact : null]}>
          <View style={[styles.barFill, { width: `${Math.round(percentage * 100)}%`, backgroundColor: accent }]} />
        </View>
        <Text style={[styles.text, mode === "compact" ? styles.textCompact : null]}>
          {seconds === 0
            ? "Karar kilitlendi."
            : tone === "red"
              ? "Karar anı. Son saniyeler."
              : tone === "orange"
                ? "Süre azalıyor, hızlı karar ver."
                : "Süre dolmadan seçimini tamamla."}
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
  wrapCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
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
  compactCopy: {
    flex: 1,
    gap: 5
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
  }
});
