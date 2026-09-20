import { useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useMotionEnabled } from "./MotionPreferences";
import { motionTokens } from "./motion-tokens";

export function useSoftReveal(enabled = true, delayMs = 0, durationMs = motionTokens.duration.screenEntranceMax) {
  const motionEnabled = useMotionEnabled();
  const progress = useSharedValue(enabled && motionEnabled ? 0 : 1);

  useEffect(() => {
    if (!enabled || !motionEnabled) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: durationMs, easing: motionTokens.easing.entrance })
    );
    return () => cancelAnimation(progress);
  }, [delayMs, durationMs, enabled, motionEnabled, progress]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: 12 * (1 - progress.value) },
      { scale: 0.985 + progress.value * 0.015 }
    ]
  }));
}
