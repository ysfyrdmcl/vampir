import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { motionTokens } from "./motion-tokens";

export function useSegmentedThumbMotion(activeIndex: number, segmentWidth: number) {
  const x = useSharedValue(activeIndex * segmentWidth);

  useEffect(() => {
    x.value = withSpring(activeIndex * segmentWidth, motionTokens.spring.settle);
  }, [activeIndex, segmentWidth, x]);

  return useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));
}
