import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
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
  const scale = useSharedValue(restingScale);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const pressIn = () => {
    if (disabled) return;
    scale.value = withSpring(pressedScale, motionTokens.spring.press);
  };

  const pressOut = () => {
    if (disabled) return;
    scale.value = withSpring(restingScale, motionTokens.spring.settle);
  };

  return {
    animatedStyle,
    pressHandlers: {
      onPressIn: pressIn,
      onPressOut: pressOut
    }
  };
}
