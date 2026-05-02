import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface PhaseCountdownProps {
  phaseEndsAt: number | null;
}

export function PhaseCountdown({ phaseEndsAt }: PhaseCountdownProps) {
  const [now, setNow] = useState(Date.now());
  const [maxSeconds, setMaxSeconds] = useState<number | null>(null);

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

  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { borderColor: accent }]}>
        <Text style={styles.value}>{seconds}</Text>
        <Text style={styles.unit}>SANİYE</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(percentage * 100)}%`, backgroundColor: accent }]} />
      </View>
      <Text style={styles.text}>
        {tone === "red" ? "Karar anı. Son saniyeler." : tone === "orange" ? "Süre azalıyor, hızlı karar ver." : "Süre dolmadan seçimini tamamla."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 8
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    backgroundColor: "rgba(10,10,10,0.5)"
  },
  value: {
    color: colors.text,
    fontFamily: typography.serif,
    fontSize: 50,
    lineHeight: 52
  },
  unit: {
    color: colors.textMuted,
    fontFamily: typography.sansMedium,
    fontSize: 13,
    letterSpacing: 1.2
  },
  barTrack: {
    width: 196,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(170,137,132,0.25)"
  },
  barFill: {
    height: "100%"
  },
  text: {
    color: colors.textDim,
    fontFamily: typography.sans,
    fontSize: 13
  }
});
