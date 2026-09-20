import { useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useMotionEnabled } from "./MotionPreferences";
import { motionTokens } from "./motion-tokens";

interface UseGlassPressStateOptions {
  disabled?: boolean;
}

export function useGlassPressState({ disabled = false }: UseGlassPressStateOptions = {}) {
  const motionEnabled = useMotionEnabled();
  const pressed = useSharedValue(0);

  useEffect(() => {
    pressed.value = 0;
    return () => cancelAnimation(pressed);
  }, [disabled, motionEnabled, pressed]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.62 : 1,
    transform: [
      { translateY: pressed.value * 1.5 },
      { scale: 1 - pressed.value * (1 - motionTokens.scale.glassPress) }
    ]
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + pressed.value * 0.16,
    transform: [{ translateX: -18 + pressed.value * 36 }, { translateY: pressed.value }]
  }));

  const pressIn = () => {
    if (disabled || !motionEnabled) return;
    pressed.value = withSpring(1, motionTokens.spring.glass);
  };

  const pressOut = () => {
    pressed.value = disabled || !motionEnabled ? 0 : withSpring(0, motionTokens.spring.glass);
  };

  return {
    animatedStyle,
    highlightStyle,
    pressHandlers: {
      onPressIn: pressIn,
      onPressOut: pressOut
    }
  };
}
