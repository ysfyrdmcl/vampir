import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { motionTokens } from "./motion-tokens";

export function useSelectedPulse(selected: boolean) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!selected) {
      pulse.value = withTiming(0, { duration: motionTokens.duration.fast });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: motionTokens.duration.slow, easing: motionTokens.easing.entrance }),
        withTiming(0, { duration: motionTokens.duration.slow, easing: motionTokens.easing.exit })
      ),
      -1,
      false
    );
  }, [pulse, selected]);

  return useAnimatedStyle(() => ({
    opacity: selected ? 0.26 + pulse.value * 0.2 : 0
  }));
}
