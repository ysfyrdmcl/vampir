import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { motionTokens } from "./motion-tokens";

export function useAmbientShine(enabled = true) {
  const shine = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      shine.value = 0;
      return;
    }
    shine.value = withRepeat(
      withTiming(1, { duration: motionTokens.duration.ambient * 2, easing: motionTokens.easing.standard }),
      -1,
      true
    );
  }, [enabled, shine]);

  return useAnimatedStyle(() => ({
    opacity: enabled ? 0.1 + shine.value * 0.16 : 0,
    transform: [{ translateX: -20 + shine.value * 40 }]
  }));
}
