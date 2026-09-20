import { useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useMotionEnabled } from "./MotionPreferences";
import { motionTokens } from "./motion-tokens";

interface UseSpecularSweepOptions {
  enabled?: boolean;
  durationMs?: number;
  loop?: boolean;
  intensity?: number;
}

export function useSpecularSweep({
  enabled = true,
  durationMs = motionTokens.duration.sweepMax,
  loop = true,
  intensity = 0.18
}: UseSpecularSweepOptions = {}) {
  const motionEnabled = useMotionEnabled();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!enabled || !motionEnabled) {
      sweep.value = 0;
      return;
    }
    const animation = withTiming(1, { duration: durationMs, easing: motionTokens.easing.standard });
    sweep.value = loop ? withRepeat(animation, -1, false) : animation;
    return () => cancelAnimation(sweep);
  }, [durationMs, enabled, motionEnabled, loop, sweep]);

  return useAnimatedStyle(() => ({
    opacity: enabled && motionEnabled ? intensity * (0.35 + sweep.value * 0.65) : 0,
    transform: [{ translateX: -120 + sweep.value * 420 }, { rotate: "13deg" }]
  }));
}
