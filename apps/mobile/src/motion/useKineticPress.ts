import { useCallback, useEffect } from "react";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { motionTokens } from "./motion-tokens";
import { useMotionActive } from "./MotionPreferences";

interface UseKineticPressOptions {
  disabled?: boolean;
  depth?: "soft" | "strong";
}

export function useKineticPress({ disabled = false, depth = "soft" }: UseKineticPressOptions = {}) {
  const pressed = useSharedValue(0);
  const selected = useSharedValue(0);
  const strong = depth === "strong";
  const active = useMotionActive();

  useEffect(() => {
    if (disabled || !active) pressed.value = 0;
  }, [active, disabled, pressed]);

  useEffect(() => () => {
    cancelAnimation(pressed);
    cancelAnimation(selected);
  }, [pressed, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: pressed.value * (strong ? 2 : 1.25) },
      { scale: 1 - pressed.value * (strong ? 0.025 : 0.016) + selected.value * 0.01 }
    ]
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.04 : 0.1 + pressed.value * 0.24 + selected.value * 0.08,
    transform: [
      { translateX: -24 + pressed.value * 46 + selected.value * 10 },
      { translateY: pressed.value * 1.5 }
    ]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0 : 0.16 + pressed.value * 0.22 + selected.value * 0.24,
    transform: [{ scale: 0.98 + pressed.value * 0.035 + selected.value * 0.025 }]
  }));

  const setSelected = useCallback((value: boolean) => {
    selected.value = withSpring(value ? 1 : 0, motionTokens.spring.settle);
  }, [selected]);

  return {
    animatedStyle,
    glowStyle,
    highlightStyle,
    pressHandlers: {
      onPressIn: () => {
        if (!disabled) pressed.value = withSpring(1, motionTokens.spring.press);
      },
      onPressOut: () => {
        pressed.value = disabled ? 0 : withSpring(0, motionTokens.spring.glass);
      }
    },
    setSelected
  };
}
