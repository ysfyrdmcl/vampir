import { useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useMotionEnabled } from "./MotionPreferences";
import { motionTokens } from "./motion-tokens";

export function useSelectedPulse(selected: boolean) {
  const motionEnabled = useMotionEnabled();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!motionEnabled) {
      pulse.value = 0;
      return;
    }
    if (!selected) {
      pulse.value = withTiming(0, { duration: motionTokens.duration.fast });
      return () => cancelAnimation(pulse);
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: motionTokens.duration.slow, easing: motionTokens.easing.entrance }),
        withTiming(0, { duration: motionTokens.duration.slow, easing: motionTokens.easing.exit })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [motionEnabled, pulse, selected]);

  return useAnimatedStyle(() => ({
    opacity: selected ? 0.26 + pulse.value * 0.2 : 0
  }));
}
