import { useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useMotionEnabled } from "./MotionPreferences";
import { motionTokens } from "./motion-tokens";

export function useSegmentedThumbMotion(activeIndex: number, segmentWidth: number) {
  const motionEnabled = useMotionEnabled();
  const x = useSharedValue(activeIndex * segmentWidth);

  useEffect(() => {
    const target = activeIndex * segmentWidth;
    x.value = motionEnabled ? withSpring(target, motionTokens.spring.settle) : target;
    return () => cancelAnimation(x);
  }, [activeIndex, motionEnabled, segmentWidth, x]);

  return useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));
}
