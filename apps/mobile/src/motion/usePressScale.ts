import { useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useMotionEnabled } from "./MotionPreferences";
import { motionTokens } from "./motion-tokens";

interface UsePressScaleOptions {
  disabled?: boolean;
  pressedScale?: number;
  restingScale?: number;
}

export function usePressScale({
  disabled = false,
  pressedScale = motionTokens.scale.press,
  restingScale = 1
}: UsePressScaleOptions = {}) {
  const motionEnabled = useMotionEnabled();
  const scale = useSharedValue(restingScale);

  useEffect(() => {
    scale.value = restingScale;
    return () => cancelAnimation(scale);
  }, [disabled, motionEnabled, restingScale, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const pressIn = () => {
    if (disabled || !motionEnabled) return;
    scale.value = withSpring(pressedScale, motionTokens.spring.press);
  };

  const pressOut = () => {
    scale.value = disabled || !motionEnabled ? restingScale : withSpring(restingScale, motionTokens.spring.settle);
  };

  return {
    animatedStyle,
    pressHandlers: {
      onPressIn: pressIn,
      onPressOut: pressOut
    }
  };
}
