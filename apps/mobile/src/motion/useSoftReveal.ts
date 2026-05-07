import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { motionTokens } from "./motion-tokens";

export function useSoftReveal(enabled = true, delayMs = 0, durationMs = motionTokens.duration.screenEntranceMax) {
  const progress = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: durationMs, easing: motionTokens.easing.entrance })
    );
  }, [delayMs, durationMs, enabled, progress]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: 12 * (1 - progress.value) },
      { scale: 0.985 + progress.value * 0.015 }
    ]
  }));
}
