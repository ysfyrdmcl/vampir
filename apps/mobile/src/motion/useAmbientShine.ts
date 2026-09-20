import { useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useMotionEnabled } from "./MotionPreferences";
import { motionTokens } from "./motion-tokens";

export function useAmbientShine(enabled = true) {
  const motionEnabled = useMotionEnabled();
  const shine = useSharedValue(0);

  useEffect(() => {
    if (!enabled || !motionEnabled) {
      shine.value = 0;
      return;
    }
    shine.value = withRepeat(
      withTiming(1, { duration: motionTokens.duration.ambient * 2, easing: motionTokens.easing.standard }),
      -1,
      true
    );
    return () => cancelAnimation(shine);
  }, [enabled, motionEnabled, shine]);

  return useAnimatedStyle(() => ({
    opacity: enabled ? 0.1 + shine.value * 0.16 : 0,
    transform: [{ translateX: -20 + shine.value * 40 }]
  }));
}
