import { useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useMotionEnabled } from "./MotionPreferences";

interface UsePulseProgressOptions {
  active?: boolean;
  warning?: boolean;
  paused?: boolean;
}

export function usePulseProgress({ active = true, warning = false, paused = false }: UsePulseProgressOptions = {}) {
  const motionEnabled = useMotionEnabled();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active || paused || !motionEnabled) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: warning ? 620 : 1500 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [active, motionEnabled, paused, pulse, warning]);

  return useAnimatedStyle(() => ({
    opacity: paused ? 0.16 : 0.22 + pulse.value * (warning ? 0.42 : 0.22),
    transform: [{ scale: 0.96 + pulse.value * (warning ? 0.1 : 0.05) }]
  }));
}
